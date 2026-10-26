import type { PageData, Settings, System } from "./types";
import { escapeHtml, safeCss } from "./html";
export const defaultSettings: Settings = {
  system: "shadcn",
  style: "system",
  accent: "#7755d9",
  dark: false,
  radius: 10,
};
export const systems: {
  id: System;
  name: string;
  description: string;
  letter: string;
  color: string;
}[] = [
  {
    id: "shadcn",
    name: "shadcn/ui",
    description: "Clean. Composable. Considered.",
    letter: "S",
    color: "#242424",
  },
  {
    id: "material",
    name: "Material",
    description: "Expressive shapes & surfaces",
    letter: "M",
    color: "#6d57b1",
  },
  {
    id: "ant",
    name: "Ant Design",
    description: "Precise, polished, productive",
    letter: "A",
    color: "#2878e5",
  },
  {
    id: "carbon",
    name: "Carbon",
    description: "Bold structure. Clear purpose.",
    letter: "C",
    color: "#222b38",
  },
];
export function renderPage(
  page: PageData,
  s: Settings,
  original = false,
): string {
  const accent = /^#[0-9a-f]{6}$/i.test(s.accent)
    ? s.accent
    : defaultSettings.accent;
  const radius = Math.max(0, Math.min(24, Number(s.radius) || 0));
  const t = {
    bg: s.dark ? "#15151b" : "#f7f8fb",
    surface: s.dark ? "#22222b" : "#ffffff",
    text: s.dark ? "#eeeef5" : "#20202c",
    muted: s.dark ? "#aaa8bc" : "#727182",
    line: s.dark ? "#393842" : "#e7e6ee",
  };
  const shape =
    s.system === "material"
      ? Math.max(16, radius)
      : s.system === "carbon"
        ? 0
        : s.system === "ant"
          ? Math.min(8, radius)
          : radius;
  const shadow =
    s.system === "material"
      ? "0 3px 12px #29233a0d"
      : s.system === "ant"
        ? "0 2px 8px #1a1a2c08"
        : "none";
  const css = original
    ? ""
    : `
 :root{--rf-accent:${accent};--rf-bg:${t.bg};--rf-surface:${t.surface};--rf-text:${t.text};--rf-muted:${t.muted};--rf-line:${t.line};color-scheme:${s.dark ? "dark" : "light"}}
 html,body{background:var(--rf-bg)!important;color:var(--rf-text)!important;font-family:${s.system === "carbon" ? '"IBM Plex Sans",' : '"Inter",'}-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
 body{margin:0;min-height:100vh}*{box-sizing:border-box}img{max-width:100%}
 h1,h2,h3,h4,h5,h6{color:var(--rf-text)!important;letter-spacing:-.035em!important}p,small,label{color:inherit}a,[role="link"]{color:var(--rf-accent)!important}
 [data-rf="nav"],aside,body>header{background:var(--rf-surface)!important;color:var(--rf-text)!important;border-color:var(--rf-line)!important}
 [data-rf="card"]{background:var(--rf-surface)!important;border:1px solid var(--rf-line)!important;border-radius:${shape}px!important;box-shadow:${shadow}!important;color:var(--rf-text)!important}
 [data-rf="button"],a[class*="btn"],a[class*="button"]{background:var(--rf-accent)!important;color:white!important;border:1px solid transparent!important;border-radius:${s.system === "material" ? 999 : shape}px!important;font:inherit!important;font-weight:600!important;padding:10px 17px!important;letter-spacing:${s.system === "carbon" ? ".02em" : "-.01em"}!important;box-shadow:none!important}
 [data-rf="button"].secondary,[data-rf="button"][class*="outline"]{background:transparent!important;color:var(--rf-text)!important;border-color:var(--rf-line)!important}
 [data-rf="input"]{background:var(--rf-surface)!important;color:var(--rf-text)!important;border:1px solid var(--rf-line)!important;border-radius:${shape}px!important;padding:11px 13px!important;font:inherit!important}
 table{border-collapse:collapse!important;width:100%}td,th{border-color:var(--rf-line)!important}th{color:var(--rf-muted)!important}hr{border-color:var(--rf-line)!important}
 [class="bar"]{background:var(--rf-accent)!important}.nav-item.active{background:color-mix(in srgb,var(--rf-accent) 9%,var(--rf-surface))!important;color:var(--rf-accent)!important}.avatar,.activity-icon{background:color-mix(in srgb,var(--rf-accent) 10%,var(--rf-surface))!important;color:var(--rf-accent)!important}
 [class*="muted"],[class*="subtitle"],[class*="description"]{color:var(--rf-muted)!important}
 [class*="badge"],[class*="pill"]{border-radius:${s.system === "carbon" ? 0 : 999}px!important;background:color-mix(in srgb,var(--rf-accent) 10%,var(--rf-surface))!important;color:var(--rf-accent)!important}
 ${s.style === "minimal" ? `html,body{background:${s.dark ? "#121212" : "#fff"}!important}[data-rf="card"]{background:transparent!important;box-shadow:none!important;border-width:0 0 1px!important;border-radius:0!important}[data-rf="button"]{border-radius:4px!important}` : ""}
 ${s.style === "glass" ? `html,body{background:radial-gradient(ellipse at 10% 10%,${accent}30,transparent 65%),radial-gradient(ellipse at 90% 60%,#63cfd428,transparent 60%),${t.bg}!important}[data-rf="card"],[data-rf="nav"],aside{background:${s.dark ? "#ffffff0c" : "#ffffff85"}!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;border:1px solid ${s.dark ? "#ffffff1a" : "#ffffffcc"}!important;box-shadow:0 8px 32px #29204a08!important}` : ""}
 ${s.style === "soft" ? `html,body{background:${s.dark ? "#25252d" : "#ecedf2"}!important}[data-rf="card"]{background:${s.dark ? "#25252d" : "#ecedf2"}!important;border:0!important;box-shadow:${s.dark ? "8px 8px 20px #15151b,-8px -8px 20px #35353f" : "8px 8px 20px #d3d4d9,-8px -8px 20px #ffffff"}!important;border-radius:${Math.max(14, shape)}px!important}[data-rf="input"]{box-shadow:inset 3px 3px 7px #00000012!important}` : ""}
 `;
  const safety = `default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline' https:; font-src https: data:; script-src 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'; object-src 'none'`;
  const attributes = (values: Record<string, string>) => Object.entries(values)
    .filter(([name]) => ["class", "id", "lang", "dir", "style"].includes(name) ||
      /^data-[a-z0-9_-]+$/.test(name) && !["data-design-system", "data-visual-style"].includes(name))
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join("");
  return `<!doctype html>\n<html${attributes({ lang: "en", ...page.htmlAttributes })} data-design-system="${original ? "original" : s.system}" data-visual-style="${s.style}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${safety}"><meta name="referrer" content="no-referrer"><meta name="reframe-source" content="${escapeHtml(page.source)}"><title>${escapeHtml(page.title)} — ${original ? "Original" : "Reframed"}</title><style>${safeCss(page.css)}\n${css}</style></head><body${attributes(page.bodyAttributes || {})}>${page.body}</body></html>`;
}
