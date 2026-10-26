# Reframe — Project Overview

Reframe is a UI redesign studio for developers and designers who want to explore a new look for an existing page. It imports page content, applies visual presets, and exports a redesigned HTML snapshot.

This documentation follows the six templates in `Context Methodology/templates/context/` and describes the local implementation reviewed on 26 October 2026. Template examples are reference material, not additional implementation requirements.

## Documentation

- [Architecture](architecture.md) — stack, modules, storage, and access.
- [UI context](ui-context.md) — appearance, layout, and controls.
- [Code standards](code-standards.md) — current conventions and maintenance guidance.
- [AI workflow rules](ai-workflow-rules.md) — proportional development and verification.
- [Progress tracker](progress-tracker.md) — implemented features, verification, and limitations.

## Goals

1. Explore design alternatives using real page content.
2. Compare the original and redesigned snapshots at different screen widths.
3. Download the current design as HTML with embedded CSS.

## Core User Flow

1. Open the studio; a labeled sample project is ready to explore.
2. Select **Import a website or repo** and choose Website, GitHub repo, or Paste HTML.
3. For a private repository, connect a GitHub fine-grained token with **Contents: read-only** access to the selected repository.
4. Choose a design system, visual style, accent color, corner radius, and appearance.
5. Switch between original, redesign, and comparison views; try desktop, tablet, and mobile widths.
6. Review detected elements and import warnings, then select **Export page**.

## Features

- Public HTTPS website imports with linked stylesheets.
- GitHub repository, branch, directory, and page-file imports, including supported private repositories.
- Static HTML/CSS and supported React/Vite JSX extraction without executing repository code.
- Four visual presets: shadcn/ui, Material, Ant Design, and Carbon.
- Four surface styles: System default, Minimal, Glassmorphism, and Neumorphism.
- Instant preview, component counts, import reports, settings reset, and locally saved design preferences.

## Scope and Limits

The output is a visual snapshot. Scripts, link navigation, and form submission are disabled. Presets reproduce visual conventions; they do not install official component libraries or rewrite the source repository.

Dynamic or protected pages may require rendered HTML or a deployed public page. Repository extraction supports a subset of JSX. External assets can remain online references, so downloads are not necessarily usable offline. Imported projects are not saved between reloads.

## Run Locally

Use Node.js 22.13 or newer. From the workspace root:

```sh
cd reframe
npm install
npm run dev
```

Open the URL printed by the development server. The local script defaults to port 5173. No application database or AI provider key is required for the current redesign flow.

## Success Criteria

- A supported import displays its content or a useful error; failed imports do not silently become demo content.
- Design changes update the preview, and the export uses the same generated HTML.
- Imported markup stays isolated and repository credentials remain outside persistent settings and generated exports.

## Source Files

[App README](../../reframe/README.md), [studio](../../reframe/components/studio.tsx), [import dialog](../../reframe/components/import-dialog.tsx), and [redesign engine](../../reframe/lib/reframe/).
