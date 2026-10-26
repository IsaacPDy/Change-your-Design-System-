import { parseHTML } from "linkedom/worker";

export function validatePublicUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error("Enter a valid public website URL.");
  }
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !h.includes(".") ||
    /^[\d.]+$/.test(h) ||
    h.includes(":") ||
    h.includes("[") ||
    /(^|\.)(localhost|local|internal|test|invalid|example|onion|arpa)$/.test(
      h,
    ) ||
    h.endsWith(".localdomain") ||
    h.endsWith(".lan")
  )
    throw new Error(
      "Use an HTTPS public hostname. Local addresses, IP literals, and credentials are not supported.",
    );
  u.hash = "";
  return u;
}
function publicIp(ip: string): boolean {
  if (ip.includes(":")) {
    const n = ip.toLowerCase();
    return /^[23][0-9a-f]{0,3}:/.test(n) && !n.startsWith("2001:db8:");
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b] = p;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function resolvesPublic(hostname: string): Promise<boolean> {
  const results = await Promise.all(
    ["A", "AAAA"].map(async (type) => {
      const r = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
        {
          headers: { accept: "application/dns-json" },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!r.ok)
        throw new Error("Could not verify the website address. Please retry.");
      const d = (await r.json()) as {
        Answer?: { type: number; data: string }[];
      };
      return (d.Answer || [])
        .filter((x) => x.type === 1 || x.type === 28)
        .map((x) => x.data);
    }),
  );
  const ips = results.flat();
  return ips.length > 0 && ips.every(publicIp);
}
export async function readLimited(
  response: Response,
  max = 1_500_000,
): Promise<string> {
  if (Number(response.headers.get("content-length")) > max)
    throw new Error("Resource exceeds the import size limit.");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error("Page exceeds the import size limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function importWebsite(
  input: string,
  fetcher: typeof fetch = fetch,
  resolve: (h: string) => Promise<boolean> = resolvesPublic,
): Promise<{ html: string; css: string; source: string; warnings: string[] }> {
  async function get(inputUrl: string, max: number) {
    let url = validatePublicUrl(inputUrl);
    for (let hop = 0; hop < 5; hop++) {
      if (!(await resolve(url.hostname)))
        throw new Error(
          "This hostname resolves to a private network or has no public address.",
        );
      const r = await fetcher(url.href, {
        redirect: "manual",
        headers: {
          "User-Agent": "Reframe-Preview/1.0",
          Accept: "text/html,text/css;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
      });
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const location = r.headers.get("location");
        if (!location)
          throw new Error("The website returned an invalid redirect.");
        url = validatePublicUrl(new URL(location, url).href);
        continue;
      }
      if (!r.ok)
        throw new Error(
          `The website returned ${r.status}. It may block imports or require sign-in. Try pasting rendered HTML.`,
        );
      return {
        text: await readLimited(r, max),
        url: url.href,
        type: r.headers.get("content-type") || "",
      };
    }
    throw new Error("The website redirected too many times.");
  }
  const page = await get(input, 1_500_000);
  if (page.type && !/text\/html|application\/xhtml/i.test(page.type))
    throw new Error("That URL does not return an HTML page.");
  const { document } = parseHTML(page.text);
  const nodes = [...document.querySelectorAll("style,link")].filter(
    (node) => node.localName === "style" ||
      ((node.getAttribute("rel") || "").toLowerCase().split(/\s+/).includes("stylesheet") &&
        !node.hasAttribute("disabled")),
  );
  const warnings: string[] = [];
  let linkedCount = 0;
  let cssBytes = 0;
  const encoder = new TextEncoder();
  const styles: string[] = [];
  const warn = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };
  // Keep document order while bounding concurrency, resource count, and total CSS.
  for (let start = 0; start < nodes.length; start += 4) {
    const batch = await Promise.all(nodes.slice(start, start + 4).map(async (node) => {
      const linked = node.localName === "link";
      if (linked && ++linkedCount > 32) {
        warn("Only the first 32 linked stylesheets were imported; the layout may differ.");
        return "";
      }
      try {
        const href = node.getAttribute("href");
        if (linked && !href) return "";
        const c = linked
          ? await get(new URL(href!, page.url).href, 500_000)
          : { text: node.textContent || "", url: page.url, type: "text/css" };
        if (c.type && !/^text\/css(?:;|$)/i.test(c.type))
          throw new Error("Not a stylesheet.");
        const css = c.text.replace(
          /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
          (_, q, p) => `url("${new URL(p, c.url).href}")`,
        );
        const media = node.getAttribute("media");
        return media ? `@media ${media}{\n${css}\n}` : css;
      } catch {
        warn(
          "One stylesheet could not be imported; the original snapshot may differ.",
        );
        return "";
      }
    }));
    for (const css of batch) {
      const size = encoder.encode(css).length;
      if (cssBytes + size > 2_000_000) {
        warn("The 2 MB total stylesheet limit was reached; the layout may differ.");
        continue;
      }
      cssBytes += size;
      styles.push(css);
    }
  }
  // Inline and external rules now share one ordered cascade; do not duplicate inline rules.
  document.querySelectorAll("style").forEach((node) => node.remove());
  return {
    html: document.toString(),
    css: styles.join("\n"),
    source: page.url,
    warnings,
  };
}
