"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Columns2,
  Command,
  Component,
  Download,
  ExternalLink,
  FileCode2,
  Globe,
  HelpCircle,
  Layers2,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  Monitor,
  MousePointer2,
  PanelTop,
  Plus,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Moon,
  Tablet,
  Type,
  X,
} from "lucide-react";
import { sanitizePage } from "@/lib/reframe/html";
import { renderPage, defaultSettings, systems } from "@/lib/reframe/design";
import { sampleHtml } from "@/lib/reframe/sample";
import type { PageData, Settings, SurfaceStyle } from "@/lib/reframe/types";
import { ImportDialog, type ImportKind } from "./import-dialog";
import { constrainDimension, createViewportState, viewportLimits, viewportPresets, viewportReducer } from "@/lib/reframe/viewport";

type Project = {
  page: PageData;
  framework: string;
  sample: boolean;
  private: boolean;
  branch?: string;
};
const sample = (): Project => ({
  page: sanitizePage(sampleHtml, "https://orbit.example"),
  framework: "HTML / CSS",
  sample: true,
  private: false,
});
const styles: { id: SurfaceStyle; label: string; detail: string }[] = [
  { id: "system", label: "System default", detail: "True to the system" },
  { id: "minimal", label: "Minimal", detail: "Less, but better" },
  { id: "glass", label: "Glassmorphism", detail: "Light & layered" },
  { id: "soft", label: "Neumorphism", detail: "Soft & dimensional" },
];
function Preview({
  html,
  width,
  height,
  title,
}: {
  html: string;
  width: number;
  height: number;
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(1000);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setAvailable(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, available / width);
  return (
    <div className="preview-container" ref={ref}>
      <div
        className="preview-scaled"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          title={title}
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={html}
          style={{ width, height, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
export default function Studio() {
  const [project, setProject] = useState<Project>(sample);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [token, setToken] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<"redesign" | "original" | "compare">(
    "redesign",
  );
  const [viewport, resizeViewport] = useReducer(viewportReducer, undefined, createViewportState);
  const { device } = viewport;
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [ready, setReady] = useState(false);
  const helpRef = useRef<HTMLDialogElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("reframe-settings") || "null",
      );
      if (
        saved &&
        systems.some((x) => x.id === saved.system) &&
        styles.some((x) => x.id === saved.style) &&
        /^#[\da-f]{6}$/i.test(saved.accent) &&
        typeof saved.dark === "boolean" &&
        typeof saved.radius === "number"
      )
        setSettings({ ...defaultSettings, ...saved });
    } catch {}
    setReady(true);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("reframe-settings", JSON.stringify(settings));
      } catch {}
  }, [settings, ready]);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
  }, [help]);
  const original = useMemo(
    () => renderPage(project.page, settings, true),
    [project.page, settings],
  );
  const redesigned = useMemo(
    () => renderPage(project.page, settings),
    [project.page, settings],
  );
  const change = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));
  const { width, height } = viewport.sizes[device];
  const defaultSize = viewportPresets[device];
  const activeSystem = systems.find((x) => x.id === settings.system)!;
  function toast(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4000);
  }
  async function importSource(kind: ImportKind, value: string) {
    let next: Project;
    if (kind === "github") {
      const { loadRepository } = await import("@/lib/reframe/github");
      const data = await loadRepository(value, token);
      const page = sanitizePage(data.html, data.source, data.css);
      page.warnings.push(...data.warnings);
      next = {
        page,
        framework: data.framework,
        sample: false,
        private: data.private,
        branch: data.branch,
      };
    } else if (kind === "website") {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = (await response.json()) as {
        error?: string;
        html: string;
        source: string;
        css: string;
        warnings: string[];
      };
      if (!response.ok)
        throw new Error(data.error || "The website could not be imported.");
      const page = sanitizePage(data.html, data.source, data.css);
      page.warnings.push(...data.warnings);
      next = {
        page,
        framework: "Website · HTML snapshot",
        sample: false,
        private: false,
      };
    } else
      next = {
        page: sanitizePage(value, "https://example.com"),
        framework: "Pasted HTML",
        sample: false,
        private: false,
      };
    setProject(next);
    setMode("redesign");
    setReport(false);
    toast("Page imported. Your new perspective is ready.");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([redesigned], { type: "text/html;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      project.page.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "page"
    }-reframed.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Redesigned HTML downloaded.");
  }
  const counts = project.page.inventory;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="studio-app">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Reframe home">
          <span className="brand-icon">
            <Layers2 size={20} strokeWidth={1.8} />
          </span>
          reframe<span className="beta">BETA</span>
        </a>
        <div className="header-breadcrumb">
          <span>Your workspace</span>
          <ChevronRight size={12} />
          <strong>Design studio</strong>
        </div>
        <div className="header-actions">
          <button
            className="help-button"
            aria-label="How it works"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={15} />
            <span>How it works</span>
          </button>
          <span className="header-divider" />
          <button className="primary-button export-button" onClick={download}>
            <ArrowDownToLine size={15} />
            <span>Export page</span>
            <span className="export-extension">.html</span>
          </button>
        </div>
      </header>
      <div className="workspace-layout">
        <aside className={`settings-panel ${mobilePanel ? "mobile-open" : ""}`}>
          <div className="panel-top">
            <div>
              <span className="eyebrow">YOUR SOURCE</span>
              <button
                className="icon-button mobile-close"
                onClick={() => setMobilePanel(false)}
                aria-label="Close design controls"
              >
                <X size={18} />
              </button>
            </div>
            <div className="source-card">
              <span className="source-icon">
                {project.private ? (
                  <LockKeyhole size={17} />
                ) : (
                  <Globe size={17} />
                )}
              </span>
              <div className="source-info">
                <strong>{project.page.title}</strong>
                <span>
                  {project.sample
                    ? "orbit.example"
                    : project.page.source
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")
                        .slice(0, 32)}
                </span>
              </div>
              <span className="source-ready" title="Source loaded" />
            </div>
            <div className="source-meta">
              <span
                className={project.sample ? "sample-badge" : "imported-badge"}
              >
                {project.sample
                  ? "Sample project"
                  : project.private
                    ? "Private repository"
                    : "Imported page"}
              </span>
              <span>{project.framework.split(" · ")[0]}</span>
            </div>
            <button
              className="import-button"
              onClick={() => setImportOpen(true)}
            >
              <Plus size={15} />
              Import a website or repo
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="panel-section">
            <div className="section-label">
              <span>
                <Component size={14} />
                Design system
              </span>
              <span className="step-number">01</span>
            </div>
            <p className="section-description">
              A foundation for your new look.
            </p>
            <div className="system-options">
              {systems.map((s) => (
                <button
                  className={`system-option ${settings.system === s.id ? "selected" : ""}`}
                  key={s.id}
                  onClick={() => change({ system: s.id })}
                  aria-pressed={settings.system === s.id}
                >
                  <span
                    className={`system-logo ${s.id}`}
                    style={{ background: s.color }}
                  >
                    {s.id === "shadcn" ? (
                      <span className="shadcn-slashes">╱╱</span>
                    ) : s.id === "material" ? (
                      <span className="material-symbol">✿</span>
                    ) : s.id === "ant" ? (
                      <span className="ant-symbol">◇</span>
                    ) : (
                      <span className="carbon-symbol">▦</span>
                    )}
                  </span>
                  <span className="system-copy">
                    <strong>{s.name}</strong>
                    <small>{s.description}</small>
                  </span>
                  <span className="selection-circle">
                    {settings.system === s.id && (
                      <Check size={11} strokeWidth={3} />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <p className="preset-note">
              Visual presets · no library installation
            </p>
          </div>
          <div className="panel-section">
            <div className="section-label">
              <span>
                <Sparkles size={14} />
                Visual style
              </span>
              <span className="step-number">02</span>
            </div>
            <p className="section-description">
              Make it feel a little more you.
            </p>
            <div className="style-options">
              {styles.map((s) => (
                <button
                  key={s.id}
                  className={`style-option ${s.id} ${settings.style === s.id ? "selected" : ""}`}
                  onClick={() => change({ style: s.id })}
                  aria-pressed={settings.style === s.id}
                >
                  <div className="style-mini">
                    <div className="mini-card">
                      <span />
                      <i />
                      <i />
                      <b />
                    </div>
                    {settings.style === s.id && (
                      <span className="mini-check">
                        <Check size={9} />
                      </span>
                    )}
                  </div>
                  <strong>{s.label}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="panel-section fine-tune">
            <div className="section-label">
              <span>
                <SlidersHorizontal size={14} />
                Fine-tune
              </span>
              <button
                className="reset-button"
                aria-label="Reset design settings"
                title="Reset design settings"
                onClick={() => setSettings(defaultSettings)}
              >
                <RotateCcw size={12} />
              </button>
            </div>
            <div className="control-label">
              <span>Accent color</span>
              <code>{settings.accent.toUpperCase()}</code>
            </div>
            <div className="swatches">
              {[
                "#7755d9",
                "#4d7ee8",
                "#479b83",
                "#de8c43",
                "#d96383",
                "#343440",
              ].map((color) => (
                <button
                  aria-label={`Use ${color} accent`}
                  aria-pressed={settings.accent === color}
                  style={{ background: color }}
                  className={settings.accent === color ? "selected" : ""}
                  key={color}
                  onClick={() => change({ accent: color })}
                >
                  {settings.accent === color && <Check size={13} />}
                </button>
              ))}
              <label
                className="custom-color"
                title="Choose custom accent color"
              >
                <Plus size={13} />
                <input
                  aria-label="Custom accent color"
                  type="color"
                  value={settings.accent}
                  onChange={(e) => change({ accent: e.target.value })}
                />
              </label>
            </div>
            <div className="control-label radius-label">
              <label htmlFor="radius">Corner radius</label>
              <span>{settings.radius}px</span>
            </div>
            <input
              id="radius"
              className="radius-range"
              type="range"
              min="0"
              max="24"
              value={settings.radius}
              onChange={(e) => change({ radius: Number(e.target.value) })}
            />
            <div className="appearance-toggle">
              <button
                className={!settings.dark ? "active" : ""}
                onClick={() => change({ dark: false })}
                aria-pressed={!settings.dark}
              >
                <Sun size={13} />
                Light
              </button>
              <button
                className={settings.dark ? "active" : ""}
                onClick={() => change({ dark: true })}
                aria-pressed={settings.dark}
              >
                <Moon size={13} />
                Dark
              </button>
            </div>
          </div>
          <div className="panel-footer">
            <LockKeyhole size={12} />
            <span>Your source stays yours.</span>
            {token && (
              <button
                onClick={() => {
                  setToken("");
                  toast("GitHub token disconnected.");
                }}
              >
                Disconnect GitHub
              </button>
            )}
          </div>
        </aside>
        <main className="canvas-area">
          <section className="canvas-heading">
            <div>
              <div className="heading-kicker">
                <span />A FRESH PERSPECTIVE
              </div>
              <h1>
                Same product. New possibilities<span>.</span>
              </h1>
              <p>
                Explore a different design language. Find the one that feels
                right.
              </p>
            </div>
            <span className="live-indicator">
              <span />
              Live preview
            </span>
          </section>
          <div className="preview-toolbar">
            <div className="preview-tabs" aria-label="Preview mode">
              {(
                [
                  { id: "redesign", label: "Redesigned", icon: Sparkles },
                  { id: "original", label: "Original", icon: PanelTop },
                  { id: "compare", label: "Compare", icon: Columns2 },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  className={mode === m.id ? "active" : ""}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                >
                  <m.icon size={13} />
                  {m.label}
                </button>
              ))}
            </div>
            <div className="preview-tools">
              <button
                className="mobile-controls-button icon-button"
                aria-label="Open design controls"
                onClick={() => setMobilePanel(true)}
              >
                <SlidersHorizontal size={16} />
              </button>
              <div className="device-toggle" aria-label="Preview device">
                {(
                  [
                    { id: "desktop", label: "Desktop preview", icon: Monitor },
                    { id: "tablet", label: "Tablet preview", icon: Tablet },
                    { id: "mobile", label: "Mobile preview", icon: Smartphone },
                  ] as const
                ).map((d) => (
                  <button
                    aria-label={d.label}
                    title={d.label}
                    key={d.id}
                    className={device === d.id ? "active" : ""}
                    aria-pressed={device === d.id}
                    onClick={() => resizeViewport({ type: "select", device: d.id })}
                  >
                    <d.icon size={15} />
                  </button>
                ))}
              </div>
              <span className="viewport-size">{width} × {height} px</span>
            </div>
          </div>
          <div className="viewport-controls" role="group" aria-label="Preview size">
            <div className="viewport-default">
              <strong>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"} size</strong>
              <span>Default {defaultSize.width} × {defaultSize.height} px</span>
            </div>
            <div className="viewport-dimensions">
              {(["width", "height"] as const).map((axis) => (
                <label className="viewport-dimension" key={axis}>
                  <span>{axis === "width" ? "W" : "H"}</span>
                  <input
                    key={`${device}-${viewport.sizes[device][axis]}`}
                    type="number"
                    aria-label={`Preview ${axis}`}
                    title="Enter a size in pixels, then press Enter or leave the field"
                    min={viewportLimits[axis].min}
                    max={viewportLimits[axis].max}
                    step={1}
                    defaultValue={viewport.sizes[device][axis]}
                    onBlur={(event) => {
                      const value = constrainDimension(event.currentTarget.valueAsNumber, axis, viewport.sizes[device][axis]);
                      event.currentTarget.value = String(value);
                      resizeViewport({ type: "resize", size: { [axis]: value } });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        event.currentTarget.value = String(viewport.sizes[device][axis]);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <span>px</span>
                </label>
              ))}
            </div>
            <input
              className="viewport-slider"
              type="range"
              aria-label="Adjust preview width"
              aria-valuetext={`${width} pixels`}
              min={viewportLimits.width.min}
              max={viewportLimits.width.max}
              step={1}
              value={width}
              onChange={(event) => resizeViewport({ type: "resize", size: { width: event.currentTarget.valueAsNumber } })}
            />
            <button
              className="viewport-reset"
              onClick={() => resizeViewport({ type: "reset" })}
              disabled={width === defaultSize.width && height === defaultSize.height}
            >
              <RotateCcw size={12} /> Reset size
            </button>
          </div>
          <div
            className={`preview-stage ${mode === "compare" ? "compare" : ""} ${device === "mobile" ? "mobile-device" : ""}`}
          >
            <div className="stage-dot-grid" />
            {mode === "compare" && (
              <div className="comparison-pane">
                <div className="comparison-label">
                  <span className="before-dot" />
                  Original <span>Before</span>
                </div>
                <div className="browser-frame">
                  <div className="browser-bar">
                    <div className="traffic-lights">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>
                      <LockKeyhole size={9} />
                      {project.sample ? "orbit.example" : project.page.title}
                    </span>
                    <ExternalLink size={10} />
                  </div>
                  <Preview
                    html={original}
                    width={width}
                    height={height}
                    title="Original page preview"
                  />
                </div>
              </div>
            )}
            <div className="comparison-pane">
              <div className="comparison-label">
                {mode === "original" ? (
                  <>
                    <span className="before-dot" />
                    Original<span>Before</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={11} />
                    {activeSystem.name}
                    <span>
                      {styles.find((s) => s.id === settings.style)?.label}
                    </span>
                  </>
                )}
              </div>
              <div className="browser-frame">
                <div className="browser-bar">
                  <div className="traffic-lights">
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>
                    <LockKeyhole size={9} />
                    {project.sample ? "orbit.example" : project.page.title}
                  </span>
                  <span className="browser-ready" />
                </div>
                <Preview
                  html={mode === "original" ? original : redesigned}
                  width={width}
                  height={height}
                  title={
                    mode === "original"
                      ? "Original page preview"
                      : "Redesigned page preview"
                  }
                />
              </div>
            </div>
          </div>
          <div className="preview-caption">
            <span>
              <Check size={12} />
              Content & structure preserved
            </span>
            <span>
              {project.sample
                ? "A sample project. Import yours to make it personal."
                : "Visual snapshot · original app behavior is disabled"}
            </span>
            <span>
              <span className="tiny-status-dot" />
              Changes apply instantly
            </span>
          </div>
          <section className="detection-panel">
            <div className="detection-title">
              <span className="detect-icon">
                <ScanLine size={17} />
              </span>
              <div>
                <strong>Your UI, understood.</strong>
                <p>{total} elements detected in this page</p>
              </div>
              <button onClick={() => setReport(!report)} aria-expanded={report}>
                {report ? "Hide" : "View"} report
                <ChevronDown size={13} className={report ? "flipped" : ""} />
              </button>
            </div>
            <div className="detected-components">
              {(
                [
                  { key: "buttons", label: "Buttons", icon: MousePointer2 },
                  { key: "cards", label: "Cards", icon: LayoutGrid },
                  { key: "navigation", label: "Navigation", icon: PanelTop },
                  { key: "inputs", label: "Inputs", icon: SlidersHorizontal },
                  { key: "headings", label: "Headings", icon: Type },
                  { key: "images", label: "Images", icon: Component },
                ] as const
              ).map((c) => (
                <div key={c.key}>
                  <c.icon size={13} />
                  <span>{c.label}</span>
                  <b>{counts[c.key]}</b>
                </div>
              ))}
            </div>
            {report && (
              <div className="import-report">
                <div>
                  <b>Source</b>
                  <span>
                    {project.sample ? "Built-in sample" : project.page.source}
                  </span>
                </div>
                <div>
                  <b>Detected format</b>
                  <span>
                    {project.framework}
                    {project.branch ? ` · ${project.branch}` : ""}
                  </span>
                </div>
                <ul>
                  {[...new Set(project.page.warnings)].map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                  <li>
                    Design-system presets reproduce visual conventions; they do
                    not install official libraries. Downloads contain HTML/CSS
                    and may reference external assets.
                  </li>
                </ul>
              </div>
            )}
          </section>
          <footer className="canvas-footer">
            <span>Made for the what-ifs.</span>
            <span>
              Design without starting over <ArrowUpRight size={11} />
            </span>
          </footer>
        </main>
      </div>
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImport={importSource}
          token={token}
          onToken={setToken}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {help && (
        <dialog
          ref={helpRef}
          className="help-dialog"
          onCancel={() => setHelp(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelp(false);
          }}
        >
          <div className="dialog-inner">
            <button
              className="icon-button dialog-close"
              aria-label="Close help"
              onClick={() => setHelp(false)}
            >
              <X size={19} />
            </button>
            <span className="dialog-symbol">
              <Sparkles size={25} />
            </span>
            <h2>A new look in a few clicks.</h2>
            <ol>
              <li>
                <b>Bring your page.</b>
                <p>
                  Import an HTTPS website, a public or private GitHub
                  repository, or rendered HTML. Private repos need a GitHub
                  token with Contents read access.
                </p>
              </li>
              <li>
                <b>Find your design language.</b>
                <p>
                  Choose a system preset, then layer on a style. Fine-tune the
                  accent, corners, and appearance.
                </p>
              </li>
              <li>
                <b>See the difference.</b>
                <p>
                  Compare before and after at desktop, tablet, and mobile sizes.
                </p>
              </li>
              <li>
                <b>Take it with you.</b>
                <p>
                  Export the redesigned page as standalone HTML with embedded
                  CSS. It’s a visual snapshot, with external assets referenced
                  online.
                </p>
              </li>
            </ol>
            <p className="help-limit">
              Some dynamic or protected pages need a deployed URL or rendered
              HTML. Repository code is never executed or modified.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setHelp(false);
                setImportOpen(true);
              }}
            >
              Import your first page
              <ArrowRight size={15} />
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
