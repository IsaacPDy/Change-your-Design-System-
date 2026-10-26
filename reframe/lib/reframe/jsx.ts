import { parse } from "@babel/parser";
import { escapeHtml, safeCss } from "./html";
// A deliberately static interpreter: no eval, generated functions, or repository execution.
type N = any;
type Env = Record<string, any>;
export function extractJsx(
  files: Record<string, string>,
  entry: string,
): { html: string; warnings: string[] } {
  class Markup {
    constructor(readonly html: string) {}
  }
  const render = (v: any): string =>
    v instanceof Markup
      ? v.html
      : typeof v === "string" || typeof v === "number"
        ? escapeHtml(String(v))
        : "";
  const warnings = new Set<string>();
  const modules = new Map<
    string,
    {
      defs: Env;
      imports: Record<string, { path: string; name: string }>;
      entry?: N;
    }
  >();
  const normalize = (p: string) => {
    const out: string[] = [];
    for (const s of p.split("/")) {
      if (s === "..") out.pop();
      else if (s && s !== ".") out.push(s);
    }
    return out.join("/");
  };
  function resolve(from: string, p: string) {
    const root = normalize(from.split("/").slice(0, -1).join("/") + "/" + p);
    return [
      root,
      ...[
        ".tsx",
        ".jsx",
        ".ts",
        ".js",
        "/index.tsx",
        "/index.jsx",
        "/index.js",
      ].map((x) => root + x),
    ].find((x) => Object.hasOwn(files, x));
  }
  function mod(path: string) {
    if (modules.has(path)) return modules.get(path)!;
    const m: {
      defs: Env;
      imports: Record<string, { path: string; name: string }>;
      entry?: N;
    } = { defs: {}, imports: {} };
    modules.set(path, m);
    const ast = parse(files[path], {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    });
    function def(n: N) {
      if (n?.type === "FunctionDeclaration" && n.id) m.defs[n.id.name] = n;
      if (n?.type === "VariableDeclaration")
        for (const d of n.declarations)
          if (d.id.type === "Identifier") m.defs[d.id.name] = d.init;
    }
    for (const n of ast.program.body as N[]) {
      if (n.type === "ImportDeclaration" && n.source.value.startsWith(".")) {
        const p = resolve(path, n.source.value);
        if (p)
          for (const s of n.specifiers)
            m.imports[s.local.name] = {
              path: p,
              name:
                s.type === "ImportDefaultSpecifier"
                  ? "default"
                  : s.imported?.name || "default",
            };
      } else if (n.type === "ExportDefaultDeclaration") {
        m.entry = n.declaration;
        def(n.declaration);
      } else if (n.type === "ExportNamedDeclaration") {
        def(n.declaration);
      } else def(n);
    }
    return m;
  }
  let budget = 0;
  const warn = () => {
    warnings.add(
      "Some runtime expressions could not be reconstructed. Use a deployed URL or rendered HTML for a more complete snapshot.",
    );
  };
  function value(n: N, env: Env, path: string, depth: number): any {
    if (!n || depth > 24 || budget++ > 18000) return undefined;
    switch (n.type) {
      case "StringLiteral":
      case "NumericLiteral":
      case "BooleanLiteral":
        return n.value;
      case "NullLiteral":
        return null;
      case "Identifier": {
        if (Object.hasOwn(env, n.name)) return env[n.name];
        const d = mod(path).defs[n.name];
        if (
          d &&
          d !== n &&
          ![
            "FunctionDeclaration",
            "ArrowFunctionExpression",
            "FunctionExpression",
          ].includes(d.type)
        )
          return value(d, env, path, depth + 1);
        return undefined;
      }
      case "ArrayExpression":
        return n.elements
          .slice(0, 40)
          .map((x: N) => value(x, env, path, depth + 1));
      case "ObjectExpression":
        return Object.fromEntries(
          n.properties
            .filter((p: N) => p.type === "ObjectProperty" && !p.computed)
            .map((p: N) => [
              p.key.name || p.key.value,
              value(p.value, env, path, depth + 1),
            ]),
        );
      case "MemberExpression":
      case "OptionalMemberExpression": {
        const obj = value(n.object, env, path, depth + 1);
        const k = n.computed
          ? value(n.property, env, path, depth + 1)
          : n.property.name;
        return obj && Object.hasOwn(Object(obj), k) ? obj[k] : undefined;
      }
      case "TemplateLiteral":
        return n.quasis
          .map(
            (q: N, i: number) =>
              q.value.cooked +
              (n.expressions[i]
                ? (value(n.expressions[i], env, path, depth + 1) ?? "")
                : ""),
          )
          .join("");
      case "BinaryExpression": {
        const a = value(n.left, env, path, depth + 1),
          b = value(n.right, env, path, depth + 1);
        if (n.operator === "+") return a + b;
        if (n.operator === "===") return a === b;
        if (n.operator === "!==") return a !== b;
        warn();
        return undefined;
      }
      case "LogicalExpression": {
        const a = value(n.left, env, path, depth + 1);
        return n.operator === "&&"
          ? a
            ? value(n.right, env, path, depth + 1)
            : a
          : n.operator === "??"
            ? (a ?? value(n.right, env, path, depth + 1))
            : a || value(n.right, env, path, depth + 1);
      }
      case "ConditionalExpression":
        return value(
          value(n.test, env, path, depth + 1) ? n.consequent : n.alternate,
          env,
          path,
          depth + 1,
        );
      case "TSAsExpression":
      case "TSNonNullExpression":
        return value(n.expression, env, path, depth + 1);
      case "CallExpression": {
        if (
          n.callee.type === "MemberExpression" &&
          n.callee.property.name === "map"
        ) {
          const arr = value(n.callee.object, env, path, depth + 1),
            fn = n.arguments[0];
          if (
            Array.isArray(arr) &&
            ["ArrowFunctionExpression", "FunctionExpression"].includes(fn?.type)
          )
            return new Markup(
              arr
                .slice(0, 30)
                .map((v, i) => {
                  const e = { ...env };
                  bind(fn.params[0], v, e);
                  bind(fn.params[1], i, e);
                  return fn.body.type === "BlockStatement"
                    ? run(fn.body, e, path, depth + 1)
                    : render(value(fn.body, e, path, depth + 1));
                })
                .join(""),
            );
        }
        warn();
        return undefined;
      }
      case "JSXElement":
      case "JSXFragment":
        return new Markup(jsx(n, env, path, depth + 1));
      default:
        warn();
        return undefined;
    }
  }
  function bind(n: N, v: any, e: Env) {
    if (!n) return;
    if (n.type === "Identifier") e[n.name] = v;
    else if (n.type === "ObjectPattern") {
      for (const p of n.properties) {
        if (p.type === "ObjectProperty") bind(p.value, v?.[p.key.name], e);
      }
    } else if (n.type === "AssignmentPattern")
      bind(n.left, v ?? value(n.right, e, entry, 0), e);
  }
  function run(n: N, e: Env, path: string, depth: number): string {
    if (n.type !== "BlockStatement")
      return render(value(n, e, path, depth + 1));
    for (const s of n.body) {
      if (s.type === "VariableDeclaration")
        for (const d of s.declarations) {
          if (
            d.id.type === "ArrayPattern" &&
            d.init?.type === "CallExpression" &&
            /useState/.test(d.init.callee.name || "")
          ) {
            bind(
              d.id.elements[0],
              value(d.init.arguments[0], e, path, depth + 1),
              e,
            );
          } else bind(d.id, value(d.init, e, path, depth + 1), e);
        }
      if (s.type === "ReturnStatement")
        return render(value(s.argument, e, path, depth + 1));
    }
    return "";
  }
  function component(fn: N, props: Env, path: string, depth: number) {
    if (fn?.type === "Identifier") fn = mod(path).defs[fn.name];
    if (!fn?.body) return "";
    const e = {};
    bind(fn.params?.[0], props, e);
    return run(fn.body, e, path, depth + 1);
  }
  function jsx(n: N, e: Env, path: string, depth: number): string {
    if (depth > 24) return "";
    if (n.type === "JSXFragment")
      return children(n.children, e, path, depth + 1);
    const name =
      n.openingElement.name.name ||
      n.openingElement.name.property?.name ||
      "div";
    const props: Env = {};
    for (const a of n.openingElement.attributes) {
      if (a.type !== "JSXAttribute") continue;
      props[a.name.name] =
        a.value?.type === "JSXExpressionContainer"
          ? value(a.value.expression, e, path, depth + 1)
          : (a.value?.value ?? true);
    }
    props.children = new Markup(children(n.children, e, path, depth + 1));
    const m = mod(path);
    let fn = m.defs[name];
    let file = path;
    if (m.imports[name]) {
      const imp = m.imports[name];
      file = imp.path;
      const other = mod(file);
      fn = imp.name === "default" ? other.entry : other.defs[imp.name];
    }
    if (fn && /^[A-Z]/.test(name)) return component(fn, props, file, depth + 1);
    const semantic: Record<string, string> = {
      Button: "button",
      Input: "input",
      Textarea: "textarea",
      Label: "label",
      Link: "a",
      Image: "img",
      Card: "section",
      CardHeader: "header",
      CardTitle: "h3",
      CardDescription: "p",
      CardContent: "div",
      CardFooter: "footer",
      Badge: "span",
      Separator: "hr",
      Fragment: "div",
    };
    const tag = /^[a-z]/.test(name) ? name : semantic[name] || "div";
    if (["script", "iframe", "style"].includes(tag)) return "";
    let attrs = "";
    for (const [k, v] of Object.entries(props)) {
      if (k === "style" && v && typeof v === "object") {
        const unitless =
          /^(opacity|zIndex|fontWeight|lineHeight|flex|flexGrow|flexShrink|order|gridRow|gridColumn)$/;
        const css = Object.entries(v)
          .filter(
            ([key, val]) =>
              /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) &&
              (typeof val === "string" || typeof val === "number"),
          )
          .map(
            ([key, val]) =>
              `${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${typeof val === "number" && val !== 0 && !unitless.test(key) ? val + "px" : val}`,
          )
          .join(";");
        attrs += ` style="${escapeHtml(safeCss(css))}"`;
        continue;
      }
      if (
        k === "children" ||
        v == null ||
        v === false ||
        /^on[A-Z]/.test(k) ||
        typeof v === "object"
      )
        continue;
      if (
        !/^(className|id|href|src|alt|title|type|placeholder|value|name|role|width|height|aria-[\w-]+|data-[\w-]+)$/.test(
          k,
        )
      )
        continue;
      attrs += ` ${k === "className" ? "class" : k}="${escapeHtml(String(v))}"`;
    }
    if (name === "Card" && !props.className) attrs += ' class="card"';
    return `<${tag}${attrs}>${["input", "img", "hr", "br"].includes(tag) ? "" : render(props.children) + `</${tag}>`}`;
  }
  function children(ns: N[], e: Env, path: string, depth: number): string {
    return ns
      .map((n) => {
        if (n.type === "JSXText")
          return escapeHtml(n.value.replace(/\s+/g, " "));
        if (n.type === "JSXElement" || n.type === "JSXFragment")
          return jsx(n, e, path, depth + 1);
        if (n.type === "JSXExpressionContainer") {
          const v = value(n.expression, e, path, depth + 1);
          if (v === undefined) {
            warn();
            return "";
          }
          return render(v);
        }
        return "";
      })
      .join("");
  }
  const m = mod(entry);
  let root = m.entry;
  if (!root)
    root =
      m.defs.App ||
      Object.values(m.defs).find((n: N) =>
        ["FunctionDeclaration", "ArrowFunctionExpression"].includes(n?.type),
      );
  const html =
    root?.type === "JSXElement"
      ? jsx(root, {}, entry, 0)
      : component(root, {}, entry, 0);
  if (!html.replace(/<[^>]+>/g, "").trim())
    throw new Error(
      "No static JSX page could be reconstructed. Paste a deployed URL or rendered HTML instead.",
    );
  return {
    html,
    warnings: [
      "Reconstructed from static JSX; live app behavior and runtime data are not executed.",
      ...warnings,
    ],
  };
}
