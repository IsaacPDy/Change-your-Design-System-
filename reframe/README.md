# Reframe

A UI redesign studio for public websites, HTML/CSS and React/Vite GitHub repositories (including private repositories), and pasted HTML.

## Documentation

Start with the [project overview](../docs/context/project-overview.md). It links to the architecture, UI context, code standards, AI workflow rules, and progress tracker, adapted from the Context Methodology templates.

## Run locally

Use Node 22.13+.

```sh
npm install
npm run dev
```

The development script prints the local preview URL. `npm test`, `npm run typecheck`, and `npm run build` verify the project.

## Vercel hosting

The Vercel project is `change-your-design-system`, with `reframe` as its Root Directory. `vercel.json` selects the Next.js runtime and builds with `next build --webpack`; the existing local and Sites build commands remain available.

## What it does

- Imports actual HTML and up to 32 linked stylesheets from a public HTTPS URL, preserving CSS order, media conditions, and root layout attributes. Stylesheets are limited to 500 KB each and 2 MB combined; skipped styles produce warnings.
- Reads GitHub repositories through the GitHub API, preserving branch selection. Static JSX extraction follows local components and common literal expressions without executing repository code.
- Applies four design-system visual presets, four surface styles, accent color, corner radius, and light/dark appearance.
- Compares sanitized original/redesigned snapshots with desktop (1440 × 900), tablet (768 × 1024), and mobile (390 × 844) defaults. Edit width/height or use the width slider; Reset size restores the selected device's default. Custom sizes are retained per device until reload, and comparison panes share the selected dimensions.
- Exports the exact redesign as standalone HTML with embedded CSS; external assets remain online references.

Private GitHub tokens are held only in browser memory and sent directly to `api.github.com`. Grant a fine-grained token access only to selected repositories with **Contents: read-only**. Disconnect or reload to clear it. Only design settings persist locally.

## Limits

This version makes visual page snapshots, not working application or repository migrations. It removes scripts, navigation, and form submissions and isolates previews in sandboxed frames. Dynamic sites or complex React expressions may require a deployed URL or rendered HTML. Static JSX extraction reads at most 32 source files and six CSS files; large repositories may need a specific page file URL. Design presets reproduce visual conventions rather than installing official component libraries. Private external assets and unsupported JSX imports may be absent.

Website imports enforce HTTPS public hostnames, public DNS answers, redirect checks, timeouts, and size bounds. The app has no database and never modifies an imported repository.
