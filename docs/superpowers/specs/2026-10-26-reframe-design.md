# Reframe: UI redesign studio

## Agreed scope

Build a working app in this workspace. Users paste a public website URL or a public/private GitHub repository, choose a design-system preset and a visual style, compare the original and redesigned page, and download the redesigned page. The export is standalone HTML and CSS, rather than a rewrite of the original repository.

## Approach

Use structure-preserving restyling: import real page content, identify semantic UI elements, and apply a coherent set of design tokens and component treatments. This gives immediate, repeatable previews and portable exports without requiring an AI account. A screenshot-only mockup would not provide usable page code; full repository migration would require framework-specific builds and is outside this version.

## Import behavior

- Website: fetch HTML on the server with bounded response sizes and timeouts. Resolve relative assets and styles, preserve content/layout where possible, sanitize scripts and unsafe attributes, and derive a component inventory from the imported document.
- GitHub: accept a repository URL, branch URL, or file URL. Read the repository through GitHub's API. Detect HTML/CSS and React/Vite entry points. Follow supported local component imports and extract static JSX structure without running repository code or installing its dependencies.
- Private repository: an optional fine-grained GitHub token with repository content read access. Hold it in browser memory for the current session; send it over HTTPS only to GitHub. Do not persist it in local storage, history, exported files, server logs, or project source. Provide a visible disconnect action.
- Unsupported or incomplete imports must report the actual reason and useful next steps. Never silently replace a failed import with demo content. Client-rendered sites, login-protected pages, and JSX requiring complex runtime data may require a deployed page or rendered HTML. A reconstructed JSX preview must be labeled accordingly.
- Start with a clearly labeled sample project so the controls can be explored immediately. Include a paste-HTML fallback.

## Studio interface

An app workspace with a compact brand header, source import panel, left design controls, and a large preview canvas. Keep controls readable and responsive on narrow screens.

- Design-system presets: shadcn/ui, Material, Ant Design, and Carbon. These are HTML/CSS treatments based on their visual conventions, not automatic installation of the official component libraries.
- Visual styles: original system treatment, minimal, glassmorphism, and neumorphism.
- Additional controls: accent color, light/dark appearance, and corner radius.
- Preview modes: redesigned, original, and side-by-side comparison; desktop, tablet, and mobile widths.
- Show the source title, import status, detected framework, component inventory, and any limitations.
- Export the exact current redesign as a downloadable HTML file with embedded CSS. Include source provenance but no credentials. External assets remain externally referenced and require an internet connection.

## Architecture and safety

Use a React app with server routes for public website fetching. GitHub private reads go directly from the browser to the fixed GitHub API origin, so the app server never receives the token. Keep parsers, detection, design tokens, and export generation separate from the studio UI. Imported markup is untrusted: remove executable content, unsafe URL protocols, embedded frames, and submission/navigation behavior, then render in a sandboxed iframe. Do not execute arbitrary repository code. Website fetching must reject local/private network targets and redirects to them.

No user accounts or database are required. Preset choices may persist locally; imported private source and credentials must not persist. Publish the completed app as an owner-private Site through the Sites plugin unless the user changes the hosting scope.

## Verification

Meaningful automated tests cover URL validation and redirect safety, GitHub URL/branch parsing, HTML sanitization, static JSX extraction, design output, export equivalence, error handling, and prevention of credential persistence/leakage. Run relevant type/build checks. Use one browser pass for import, design/style changes, comparison/device controls, export, responsive layout, and private credential disconnect behavior. Actual private-repository access can only be verified once the user supplies a token in the app; report that limit explicitly.
