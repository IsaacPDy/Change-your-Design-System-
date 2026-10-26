# UI Context

## Theme

The studio has a light workspace with white controls, a pale canvas, purple actions, and compact typography. The Light/Dark control changes the imported page preview and export; it does not switch the studio shell theme.

## Studio Colors

Defined in `reframe/app/globals.css`:

| Role | CSS variable | Value |
| --- | --- | --- |
| Primary text | `--ink` | `#282535` |
| Muted text | `--muted` | `#9792a4` |
| Primary accent | `--purple` | `#7856d7` |
| Border | `--line` | `#eeecf3` |
| Canvas | `--canvas` | `#f7f8fb` |

The stylesheet also contains component-specific literal colors. It does not currently define shared success/error tokens.

## Preview Settings

- Default: shadcn/ui, System default, accent `#7755d9`, light appearance, 10 px radius.
- Systems: shadcn/ui, Material, Ant Design, Carbon.
- Styles: System default, Minimal, Glassmorphism, Neumorphism.
- Accent: six swatches and a custom color picker.
- Radius: 0–24 px slider; the selected system/style can override the resulting shape, such as square Carbon surfaces or pill-shaped Material buttons.
- Generated page tokens: `--rf-accent`, `--rf-bg`, `--rf-surface`, `--rf-text`, `--rf-muted`, and `--rf-line` in `lib/reframe/design.ts`.

## Typography and Shape

The shell uses an Inter/system sans-serif stack with a 13 px base size. Generated previews use Inter, or IBM Plex Sans for Carbon, followed by system fallbacks; the generator does not bundle those fonts. Code values use monospace styling.

The shell uses several fixed radii: small badges, roughly 7–10 px buttons/cards, and larger dialog corners. The radius slider affects imported content rather than these shell elements.

## Layout Patterns

- Top bar: Reframe branding, help, and HTML export.
- Left panel: source details, import action, preset/style choices, fine tuning, and token disconnect.
- Main canvas: preview modes, device controls, framed page previews, and an expandable detection report.
- Desktop: 285 px settings column beside the canvas; narrow layouts expose a design-controls drawer.
- Dialogs: native modal dialogs for import and help, with visible close actions and import busy/error states.
- Preview widths: desktop 1100 px, tablet 768 px, mobile 390 px, scaled down to fit the available canvas.

## Components and Interaction

The studio uses custom JSX/CSS and Lucide icons. Starter shadcn components are available under `reframe/components/ui/`, but the main studio and import dialog do not use that library directly.

Keep accessible button names, selected/expanded states, keyboard focus indicators, modal dismissal, and status messages when editing the interface. The stylesheet includes responsive breakpoints and reduced-motion handling.

## Source Files

[Studio](../../reframe/components/studio.tsx), [import dialog](../../reframe/components/import-dialog.tsx), [global CSS](../../reframe/app/globals.css), and [preview generator](../../reframe/lib/reframe/design.ts).
