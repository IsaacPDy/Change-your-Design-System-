import { parseHTML } from "linkedom/worker";
import type { PageData } from "./types";

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function safeCss(css: string): string {
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import\s+(?:url\([^)]*\)|[^;]+);?/gi, "")
    .replace(/url\([^)]*\)/gi, (m) =>
      /url\(\s*['"]?(?:https:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(
        m,
      )
        ? m
        : "none",
    )
    .replace(/(?:expression\s*\([^)]*\)|-moz-binding\s*:[^;}]*)/gi, "");
}
function assetUrl(value: string, base: string): string {
  try {
    const u = new URL(value, base);
    return ["https:", "http:"].includes(u.protocol)
      ? u.href
      : /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)
        ? value
        : "";
  } catch {
    return "";
  }
}
export function sanitizePage(
  html: string,
  source: string,
  extraCss = "",
): PageData {
  if (html.length > 2_000_000)
    throw new Error(
      "This page is too large. Paste a smaller section of rendered HTML.",
    );
  const normalized = /<html[\s>]/i.test(html)
    ? html
    : `<!doctype html><html><head></head><body>${html}</body></html>`;
  const { document } = parseHTML(normalized);
  const title =
    document.querySelector("title")?.textContent?.trim() || "Imported page";
  const css = safeCss(
    [...document.querySelectorAll("style")]
      .map((s) => s.textContent || "")
      .join("\n") +
      "\n" +
      extraCss,
  );
  document
    .querySelectorAll(
      "script,iframe,frame,frameset,object,embed,applet,base,meta,link,style,svg,math,template,noscript",
    )
    .forEach((n) => n.remove());
  const inventory = {
    buttons: 0,
    cards: 0,
    navigation: 0,
    inputs: 0,
    images: 0,
    headings: 0,
  };
  document.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        name.startsWith("on") ||
        [
          "srcdoc",
          "action",
          "formaction",
          "target",
          "ping",
          "autofocus",
          "nonce",
          "integrity",
          "is",
          "contenteditable",
          "download",
          "data-rf",
        ].includes(name)
      )
        el.removeAttribute(attr.name);
      else if (["src", "poster", "background"].includes(name)) {
        const u = assetUrl(attr.value, source);
        if (u) el.setAttribute(name, u);
        else el.removeAttribute(name);
      } else if (name === "href" || name === "xlink:href")
        el.removeAttribute(attr.name);
      else if (name === "srcset") el.removeAttribute(name);
      else if (name === "style") el.setAttribute("style", safeCss(attr.value));
    }
    if (tag === "a") {
      el.setAttribute("role", "link");
      el.setAttribute("tabindex", "-1");
    }
    if (tag === "form") el.setAttribute("inert", "");
    if (tag === "button") {
      inventory.buttons++;
      el.setAttribute("type", "button");
      el.setAttribute("data-rf", "button");
    }
    if (tag === "input" || tag === "textarea" || tag === "select") {
      inventory.inputs++;
      el.setAttribute("data-rf", "input");
      if (tag === "input" && el.getAttribute("type") === "submit") {
        el.setAttribute("type", "button");
      }
    }
    if (tag === "nav" || el.getAttribute("role") === "navigation") {
      inventory.navigation++;
      el.setAttribute("data-rf", "nav");
    }
    if (tag === "img") {
      inventory.images++;
      el.setAttribute("loading", "lazy");
      el.setAttribute("referrerpolicy", "no-referrer");
    }
    if (/^h[1-6]$/.test(tag)) inventory.headings++;
    if (
      ["div", "article", "section", "li"].includes(tag) &&
      /(?:^|[-_\s])(card|panel|tile)(?:$|[-_\s])/i.test(el.className || "")
    ) {
      inventory.cards++;
      el.setAttribute("data-rf", "card");
    }
  });
  const body = document.body.innerHTML;
  if (
    !(document.body.textContent || "").trim() &&
    !document.querySelector("img")
  )
    throw new Error(
      "No visible HTML was found. This site may render with JavaScript. Try its repository or paste rendered HTML.",
    );
  const warnings = [
    "Visual snapshot: scripts, navigation, and form submission are disabled.",
  ];
  const layoutAttributes = (element: Element) => Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => ["class", "id", "lang", "dir", "style"].includes(name) ||
        (name.startsWith("data-") && name !== "data-rf" && !name.startsWith("data-rf-")))
      .map(({ name, value }) => [name, value]),
  );
  return {
    title, body, css, source, inventory, warnings,
    htmlAttributes: layoutAttributes(document.documentElement),
    bodyAttributes: layoutAttributes(document.body),
  };
}
