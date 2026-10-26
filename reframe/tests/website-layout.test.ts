import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom/worker";
import { importWebsite } from "../lib/reframe/web.ts";
import { sanitizePage } from "../lib/reframe/html.ts";
import { renderPage, defaultSettings } from "../lib/reframe/design.ts";

test("website imports retain late layout bundles, large themes, and CSS cascade order", async () => {
  const links = Array.from({ length: 14 }, (_, i) => `<link rel="stylesheet" href="/bundle-${i}.css">`).join("");
  const theme = `/*${"x".repeat(300_000)}*/.pc-root{display:grid}`;
  const source = `<html><head><style>.layout{display:block}</style>${links}<style>.layout{display:flex}</style></head><body class="pc-root"><main class="layout">Content</main></body></html>`;
  const result = await importWebsite("https://substack.com/", (async (url) => {
    const path = new URL(String(url)).pathname;
    return new Response(path === "/" ? source : path === "/bundle-13.css" ? theme : `.bundle-${path.match(/\d+/)?.[0]}{color:red}`, {
      headers: { "content-type": path === "/" ? "text/html" : "text/css" },
    });
  }) as typeof fetch, async () => true);
  const page = sanitizePage(result.html, result.source, result.css);
  assert.match(page.css, /\.pc-root\{display:grid\}/);
  assert.ok(page.css.indexOf(".bundle-12") > page.css.indexOf(".bundle-4"));
  assert.ok(page.css.indexOf(".layout{display:block}") < page.css.indexOf(".bundle-0"));
  assert.ok(page.css.indexOf(".layout{display:flex}") > page.css.indexOf(".pc-root"));
  assert.deepEqual(result.warnings, []);
});

test("website imports preserve media conditions and resolve stylesheet assets", async () => {
  const result = await importWebsite("https://site.com/page", (async (url) => new Response(
    String(url).endsWith("/page")
      ? '<html><head><link rel="stylesheet" href="/css/site.css" media="(min-width: 800px)"></head><body>Content</body></html>'
      : '.layout{background:url(../image.png)}',
    { headers: { "content-type": String(url).endsWith("/page") ? "text/html" : "text/css" } },
  )) as typeof fetch, async () => true);
  assert.match(result.css, /@media \(min-width: 800px\)/);
  assert.match(result.css, /https:\/\/site.com\/image.png/);
});

test("original and redesigned previews preserve sanitized root layout attributes", () => {
  const page = sanitizePage('<html class="reader" lang="fr" dir="rtl" data-theme="light"><body id="root" class="pc-root" style="--page-width:900px" onload="bad()"><main>Content</main></body></html>', "https://substack.com/");
  for (const original of [true, false]) {
    const { document } = parseHTML(renderPage(page, defaultSettings, original));
    assert.equal(document.documentElement.getAttribute("class"), "reader");
    assert.equal(document.documentElement.getAttribute("lang"), "fr");
    assert.equal(document.documentElement.getAttribute("dir"), "rtl");
    assert.equal(document.documentElement.getAttribute("data-theme"), "light");
    assert.equal(document.body.getAttribute("class"), "pc-root");
    assert.equal(document.body.getAttribute("id"), "root");
    assert.equal(document.body.getAttribute("style"), "--page-width:900px");
    assert.equal(document.body.hasAttribute("onload"), false);
  }
});

test("stylesheet failures and truncation are reported without bypassing URL checks", async () => {
  const calls: string[] = [];
  const result = await importWebsite("https://site.com/", (async (url) => {
    calls.push(String(url));
    return String(url) === "https://site.com/"
      ? new Response('<main>Content</main><link rel="stylesheet" href="https://127.0.0.1/private.css">' + Array.from({ length: 33 }, (_, i) => `<link rel="stylesheet" href="/sheet-${i}.css">`).join(""), { headers: { "content-type": "text/html" } })
      : new Response("main{display:grid}", { headers: { "content-type": "text/css" } });
  }) as typeof fetch, async () => true);
  assert.equal(calls.some((url) => url.includes("127.0.0.1")), false);
  assert.ok(result.warnings.some((w) => /limit|first 32/i.test(w)));
  assert.ok(result.warnings.some((w) => /could not be imported/i.test(w)));
});

test("stylesheet imports enforce individual and combined size bounds", async () => {
  const result = await importWebsite("https://site.com/", (async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/") return new Response('<html><head>' + Array.from({ length: 7 }, (_, i) => `<link rel="stylesheet" href="/${i}.css">`).join("") + '</head><body>Content</body></html>', { headers: { "content-type": "text/html" } });
    return new Response(`/*${"x".repeat(path === "/0.css" ? 500_001 : 450_000)}*/.layout{display:grid}`, { headers: { "content-type": "text/css" } });
  }) as typeof fetch, async () => true);
  assert.ok(Buffer.byteLength(result.css) <= 2_000_000);
  assert.ok(result.warnings.some((w) => /could not be imported/.test(w)));
  assert.ok(result.warnings.some((w) => /total stylesheet limit/.test(w)));
});
