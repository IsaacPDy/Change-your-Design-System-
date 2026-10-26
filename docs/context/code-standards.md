# Code Standards

These notes summarize current conventions and guidance for maintaining them. They do not introduce a separate implementation scope.

## General and TypeScript

- Keep studio interaction, imports, parsing, sanitization, and design generation in their existing modules.
- TypeScript strict mode is enabled. Use the shared `PageData`, `RepositoryData`, and `Settings` types at module boundaries.
- External HTML, repository files, API responses, and saved settings are untrusted inputs. Validate them before use.
- Dynamic AST/API handling currently includes some `any` types; this is not an entirely `any`-free codebase. Prefer narrower types when changing those paths.
- Use `@/` imports for paths relative to `reframe/`.

## React and Runtime

- `app/page.tsx` is the entry point; browser interaction lives in client components.
- Keep the website server route focused on request validation and bounded fetching. GitHub token requests originate in the browser.
- Reuse `renderPage()` for both preview and export so output does not drift.
- Use the package scripts and Vinext tooling. Although the project follows Next.js conventions, its configured build/runtime uses Vite and Cloudflare Workers.

## Styling

- Shell styling belongs in `app/globals.css`; imported-page treatments belong in `lib/reframe/design.ts`.
- Reuse existing shell variables and `--rf-*` preview tokens where applicable.
- Preserve the difference between studio appearance and preview Light/Dark settings.
- Keep responsive layout, focus styles, accessible control names, and reduced-motion support.

## API and Data

- `POST /api/import` accepts `{ "url": "https://…" }` and returns `{ html, css, source, warnings }` or `{ error }`.
- Preserve origin checks, request/response bounds, public-address validation, redirect checks, timeouts, and non-cached responses.
- Keep GitHub authorization restricted to `https://api.github.com`; repository code must not execute.
- Persist design settings only. Do not add imported source or credentials to browser storage or logs.
- Keep previews sanitized and sandboxed, and retain the generated document's content security policy.

## File Organization

| Folder | Contents |
| --- | --- |
| `reframe/app/` | Entry page, layout, global styles, and server routes |
| `reframe/components/` | Studio, dialogs, and reusable UI |
| `reframe/lib/reframe/` | App types, sample, import engines, sanitization, and rendering |
| `reframe/tests/` | Behavior tests using Node's test runner and `tsx` |
| `reframe/scripts/`, `worker/` | Starter tooling and hosting runtime |
| `docs/context/` | This concise documentation set |

## Checks

From `reframe/`, available checks are `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Select checks appropriate to the change. For behavior changes, add meaningful coverage and run affected tests; interactive changes also need one browser verification pass. See [workflow rules](ai-workflow-rules.md) for scope and verification guidance.
