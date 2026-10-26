import { extractJsx } from "./jsx";
import type { RepositoryData } from "./types";
export function parseGitHubUrl(input: string) {
  let u: URL;
  try {
    u = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    throw new Error("Enter a GitHub repository URL.");
  }
  const p = u.pathname.split("/").filter(Boolean);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "github.com" ||
    u.username ||
    u.password ||
    p.length < 2 ||
    !p.slice(0, 2).every((s) => /^[\w.-]+$/.test(s))
  )
    throw new Error("Use a github.com/owner/repository URL.");
  const kind = p[2] || "repo";
  if (!["repo", "tree", "blob"].includes(kind))
    throw new Error("Use a repository, branch, or file URL.");
  return {
    owner: p[0],
    repo: p[1].replace(/\.git$/, ""),
    kind,
    tail: p.slice(3).map(decodeURIComponent),
  };
}
export async function loadRepository(
  input: string,
  token = "",
  fetcher: typeof fetch = fetch,
): Promise<RepositoryData> {
  const p = parseGitHubUrl(input);
  const base = `https://api.github.com/repos/${p.owner}/${p.repo}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
  async function api(path: string, optional = false): Promise<any> {
    const url = base + path;
    if (new URL(url).origin !== "https://api.github.com")
      throw new Error("Invalid GitHub API target.");
    const r = await fetcher(url, {
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (optional && r.status === 404) return null;
    if (!r.ok)
      throw new Error(
        r.status === 404
          ? "Repository or branch not found. For a private repo, connect a token with Contents read access."
          : r.status === 401
            ? "GitHub rejected this token. Check its expiry and repository access."
            : r.status === 403
              ? "GitHub denied access or its rate limit was reached. Check token permissions or retry later."
              : `GitHub returned ${r.status}. Please retry.`,
      );
    return r.json();
  }
  const meta = await api("");
  let branch = meta.default_branch;
  let sha = branch;
  let filePath = "";
  if (p.tail.length) {
    let found = false;
    for (let i = Math.min(p.tail.length, 8); i >= 1; i--) {
      const name = p.tail.slice(0, i).join("/");
      const b = await api(`/branches/${encodeURIComponent(name)}`, true);
      if (b) {
        branch = b.name;
        sha = b.commit.sha;
        filePath = p.tail.slice(i).join("/");
        found = true;
        break;
      }
    }
    if (!found)
      throw new Error(
        "That branch could not be found. Try the repository root URL.",
      );
  } else {
    const b = await api(`/branches/${encodeURIComponent(branch)}`);
    sha = b.commit.sha;
  }
  const tree = await api(`/git/trees/${encodeURIComponent(sha)}?recursive=1`);
  const warnings: string[] = [];
  if (tree.truncated)
    warnings.push(
      "GitHub truncated this large repository. Import a more specific file URL if files are missing.",
    );
  const entries = (tree.tree || []).filter(
    (x: any) =>
      x.type === "blob" &&
      !/(^|\/)(node_modules|vendor|\.next|\.git)\//.test(x.path) &&
      x.size <= 250_000,
  );
  const allPaths = entries.map((x: any) => x.path) as string[];
  const directory =
    p.kind === "tree" && filePath ? filePath.replace(/\/$/, "") + "/" : "";
  const paths = directory
    ? allPaths.filter((path) => path.startsWith(directory))
    : allPaths;
  if (directory && !paths.length)
    throw new Error(
      "No supported files were found in that directory. Try a page file URL.",
    );
  async function read(path: string) {
    const d = await api(
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(sha)}`,
    );
    if (d.encoding !== "base64")
      throw new Error("GitHub returned an unsupported file encoding.");
    return new TextDecoder().decode(
      Uint8Array.from(atob(d.content.replace(/\s/g, "")), (c) =>
        c.charCodeAt(0),
      ),
    );
  }
  const htmlPath =
    p.kind === "blob" && /\.html?$/.test(filePath)
      ? filePath
      : paths.find((x) => x === "index.html") ||
        paths.find((x) => /(^|\/)index.html$/.test(x));
  const preferred =
    p.kind === "blob" && /\.[jt]sx?$/.test(filePath)
      ? filePath
      : paths.find((x) => /(^|\/)App\.[jt]sx$/.test(x)) ||
        paths.find((x) => /(^|\/)page\.[jt]sx$/.test(x));
  const cssPaths = paths.filter((x) => /\.css$/.test(x)).slice(0, 6);
  const css = (await Promise.all(cssPaths.map(read))).join("\n");
  let html = htmlPath ? await read(htmlPath) : "";
  let framework = "HTML / CSS";
  if (
    preferred &&
    ((p.kind === "blob" && /\.[jt]sx?$/.test(filePath)) ||
      !html ||
      /<(?:div|main)[^>]+id=["'](?:root|app)["'][^>]*>\s*<\//i.test(html))
  ) {
    const sourcePaths = [
      preferred,
      ...paths.filter((x) => /\.[jt]sx?$/.test(x) && x !== preferred),
    ].slice(0, 32);
    const source = Object.fromEntries(
      await Promise.all(sourcePaths.map(async (x) => [x, await read(x)])),
    );
    const extracted = extractJsx(source, preferred);
    html = extracted.html;
    warnings.push(...extracted.warnings);
    framework = "React / Vite · static JSX";
  }
  if (!html)
    throw new Error(
      "No HTML or supported React entry point was found. Try a page file URL or paste rendered HTML.",
    );
  const root = `https://raw.githubusercontent.com/${p.owner}/${p.repo}/${sha}/`;
  // Resolve simple repository assets; private assets are embedded through authenticated API reads.
  const relativeImages = [...html.matchAll(/(?:src|poster)=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((x) => !/^https?:|^data:|^#/.test(x));
  for (const original of [...new Set(relativeImages)].slice(0, 8)) {
    const clean = original.replace(/^\.?\//, "");
    const asset = paths.find((x) => x === clean || x === `public/${clean}`);
    if (asset && meta.private && /\.(png|jpe?g|gif|webp)$/i.test(asset)) {
      const d = await api(
        `/contents/${asset.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(sha)}`,
      );
      const ext = asset.split(".").pop()?.toLowerCase();
      html = html
        .split(original)
        .join(
          `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${d.content.replace(/\s/g, "")}`,
        );
    } else if (!meta.private)
      html = html.split(original).join(root + (asset || clean));
  }
  if (meta.private)
    warnings.push(
      "Private source is held only in this session. External asset references may still require authentication.",
    );
  return {
    html,
    css,
    framework,
    private: !!meta.private,
    branch,
    source: input,
    warnings,
  };
}
