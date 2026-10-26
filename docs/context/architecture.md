# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| UI | React 19, TypeScript | Interactive studio and import dialog |
| Framework/runtime | Vinext, Vite, Next.js App Router conventions, Cloudflare Workers | Page rendering, development/build tooling, and import route |
| Styling | Tailwind CSS 4, custom CSS, Lucide React | Studio appearance and icons |
| HTML processing | LinkeDOM | Parse and sanitize imported markup |
| JSX processing | Babel parser and custom static extractor | Reconstruct supported JSX without executing source |
| Repository access | GitHub REST API | Read repository metadata, branches, source, and supported assets |
| Persistence | Browser local storage | Design preferences only |

## System Boundaries

Paths below are relative to `reframe/`.

| Path | Responsibility |
| --- | --- |
| `app/page.tsx`, `app/layout.tsx` | Studio entry point, metadata, and global styles |
| `components/studio.tsx` | Project state, design controls, comparison, preview, and download |
| `components/import-dialog.tsx` | Import form, session token connection, and error messages |
| `app/api/import/route.ts` | Same-origin POST endpoint for public website imports |
| `lib/reframe/web.ts` | URL/DNS checks, redirect handling, bounded HTML and stylesheet fetching |
| `lib/reframe/github.ts` | Browser-to-GitHub reads and source selection |
| `lib/reframe/jsx.ts` | Static JSX extraction and unsupported-content warnings |
| `lib/reframe/html.ts` | Sanitization, asset URL resolution, and element inventory |
| `lib/reframe/design.ts` | Presets, design settings, and HTML generation shared by preview/export |
| `lib/reframe/types.ts`, `sample.ts` | Shared data types and sample content |
| `worker/`, `scripts/`, `vite.config.ts` | Sites starter runtime and build tooling |
| `tests/engine.test.ts` | Engine and import safety tests |

## Data Flow

Website URL → `/api/import` → validated server fetch → browser sanitization.

GitHub URL + optional token → browser request to `api.github.com` → HTML or static JSX extraction → sanitization.

Pasted HTML → browser sanitization.

All three paths produce `PageData`: title, body, CSS, source, inventory, warnings, and sanitized HTML/body layout attributes. Website styles retain document order and media conditions, with relative stylesheet assets resolved against their source URL. `renderPage()` combines this data with `Settings` to generate original/redesigned documents. Sandboxed iframes display them; download uses the same redesigned document.

## Storage Model

- **Local storage:** `reframe-settings` contains system, style, accent, dark appearance, and radius.
- **Browser memory:** imported page, repository details, GitHub token, and studio state. Reload clears these and restores the sample.
- **Preview dimensions:** browser-memory sizes per device, with desktop 1440 × 900, tablet 768 × 1024, and mobile 390 × 844 defaults. Width/height fields and a width slider resize the actual iframe viewport; the canvas scales it to fit. Original/redesigned comparison panes share dimensions. Reset restores only the current device's preset. Bounds are 320–2560 px wide and 240–1600 px tall.
- **Downloaded file:** current redesigned HTML, embedded CSS, source metadata, and any embedded or referenced assets.
- **Database/blob storage:** unused by the redesign flow. Starter Drizzle/D1 helpers exist, but the schema is empty and hosting configuration has no D1 or R2 binding.

## Auth and Access Model

The studio has no application account or project ownership model. The existing implementation plan records an owner-private Sites deployment; hosting access is separate from GitHub authorization and was not rechecked for this documentation.

Private GitHub access uses a session token supplied by the user. The browser sends it to the fixed GitHub API origin. Disconnect clears the token; the already imported snapshot remains available until replaced or the page reloads. Starter ChatGPT auth helpers exist but are not called by the studio page or import route.

## Safety Boundaries

1. Repository source is parsed rather than executed or modified.
2. Sanitization removes executable markup, link destinations, and submission behavior; preview frames use an empty sandbox, and generated documents include a restrictive content security policy.
3. Website fetching validates HTTPS public hostnames, public DNS answers, and each redirect target, with request timeouts and response size limits.
4. Website imports read up to 1.5 MB of HTML and 32 linked stylesheets of up to 500 KB each, with four concurrent stylesheet reads and a 2 MB combined retained-CSS limit. Skipped styles produce warnings. Repository extraction selects up to 32 source files and six CSS files from eligible entries up to 250 KB.
5. Credentials must stay outside local storage, exports, logs, and documentation. The import API checks request origin and returns non-cached responses.

These describe the implemented boundaries, not a claim of a complete security audit.
