# Progress Tracker

Documentation snapshot: **26 October 2026**. Based on the current local source and existing implementation records; this is not a new release or deployment confirmation.

## Current Phase and Goal

Working initial version. Recent local work preserves website layout styles during import and adds adjustable preview dimensions.

## Implemented in Local Source

- Labeled sample project and responsive redesign studio.
- Website, GitHub, and pasted-HTML import paths with visible errors and warnings.
- Supported static JSX extraction, branch/directory/file selection, and session-only GitHub token connection/disconnection.
- Sanitized page documents, sandboxed previews, and bounded public website fetching.
- Four system presets, four styles, accent/radius/appearance controls, reset, and saved design preferences.
- Original/redesign/comparison modes, three device widths, element counts, import reports, and HTML export.
- Six concise context documents linked from the app README.
- Website imports retain up to 32 linked stylesheets in cascade order, media conditions, and sanitized HTML/body layout attributes, with per-file/combined size limits and warnings.
- Adjustable preview width/height, visible device defaults, width slider, per-device session sizes, and reset; comparison panes share the dimensions.

## Verification

| Evidence | Status |
| --- | --- |
| Local source review for this documentation | Completed on 26 October 2026 |
| `npm test` | Viewport resizing: 21 passed, 0 failed |
| TypeScript and production build | Passed for viewport resizing |
| Local browser interactions | Real Substack import returned 200; original and redesigned layouts inspected. JavaScript-dependent sidebar resizing still differs from the live site. |
| Lint | Changed files pass. Full-project lint reports 15 errors and 5 warnings in untouched files. |
| Current hosted availability and signed-in imports | Not verified by this documentation task |
| Actual private GitHub repository import | Not established; earlier verification used synthetic token connection/disconnection |

Tests cover sanitization, element detection, design/export output, public URL and redirect checks, GitHub branch/token handling, JSX extraction, directory scoping, and page-file precedence. The suite does not establish real private-repository access or every browser persistence behavior.

## In Progress

No further implementation in progress. Import and resizing changes remain local; no deployment was performed. One browser verification pass confirmed actual iframe width/height changes, device defaults and retained sizes, keyboard slider adjustment, reset, comparison dimensions, invalid-input recovery, and controls at a 390 px screen width. The changed studio file retains its existing lint issues; the new viewport module/tests pass lint.

## Follow-Up Verification

These are recorded gaps, not newly authorized tasks:

- Verify a real private repository import using a token supplied in the app.
- Confirm signed-in imports on the hosted deployment.
- Run relevant checks again when application behavior changes.

## Known Limitations and Open Questions

- Dynamic/client-rendered pages and complex JSX can produce incomplete snapshots; rendered HTML is the fallback.
- Substack's JavaScript-driven sidebar resizing is absent from static imports, so narrower preview layouts can still overlap even with all stylesheets present.
- Presets are visual treatments, with no official-library installation or repository migration.
- External assets may require internet access or authentication; imported SVG markup is removed by sanitization.
- Imported pages are session-only. Disconnect clears the token but retains the current snapshot in memory.
- Persistent projects, additional frameworks, and full application migrations would require separate scope decisions.

## Architecture Decisions

- Structure-preserving HTML/CSS restyling provides repeatable previews and exports without an AI service.
- Browser-to-GitHub API reads keep the private repository token out of the app server.
- Static parsing avoids installing dependencies or running imported repository code.
- A shared renderer keeps the exported redesign aligned with the displayed document.
- Local storage holds design settings only; no application database is used.

## Session Notes and Sources

Run development and check commands from `reframe/`, not the workspace root. The existing [design specification](../superpowers/specs/2026-10-26-reframe-design.md) records agreed scope. The [implementation plan](../superpowers/plans/2026-10-26-reframe.md) records earlier verification and an owner-private Sites publication. Those records provide historical context; current external state was not checked here.
