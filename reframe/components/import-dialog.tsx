"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Globe,
  GitBranch,
  Code2,
  ArrowUpRight,
  LockKeyhole,
  LoaderCircle,
  Check,
  Unplug,
  ArrowRight,
} from "lucide-react";
export type ImportKind = "website" | "github" | "html";
interface Props {
  onClose: () => void;
  onImport: (kind: ImportKind, value: string) => Promise<void>;
  token: string;
  onToken: (s: string) => void;
}
export function ImportDialog({ onClose, onImport, token, onToken }: Props) {
  const [kind, setKind] = useState<ImportKind>("website");
  const [value, setValue] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connect, setConnect] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onImport(kind, value);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="import-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="dialog-inner">
        <button
          className="icon-button dialog-close"
          aria-label="Close import"
          onClick={onClose}
          disabled={busy}
        >
          <X size={19} />
        </button>
        <span className="dialog-symbol">
          <ArrowUpRight size={25} />
        </span>
        <h2>Start with what you have.</h2>
        <p>Bring in a page. Give it a whole new perspective.</p>
        <div className="import-tabs">
          {(
            [
              { id: "website", name: "Website", icon: Globe },
              { id: "github", name: "GitHub repo", icon: GitBranch },
              { id: "html", name: "Paste HTML", icon: Code2 },
            ] as const
          ).map((x) => (
            <button
              key={x.id}
              className={kind === x.id ? "active" : ""}
              onClick={() => {
                setKind(x.id);
                setValue("");
                setError("");
              }}
              disabled={busy}
            >
              <x.icon size={15} />
              {x.name}
            </button>
          ))}
        </div>
        <form onSubmit={submit}>
          <label htmlFor="source-value">
            {kind === "website"
              ? "Website URL"
              : kind === "github"
                ? "Repository or file URL"
                : "Rendered page HTML"}
          </label>
          {kind === "html" ? (
            <textarea
              id="source-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="<main>Paste your page HTML here…</main>"
              required
              rows={7}
              maxLength={1500000}
              disabled={busy}
            />
          ) : (
            <input
              id="source-value"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                kind === "website"
                  ? "https://your-website.com"
                  : "https://github.com/your-name/your-repo"
              }
              autoFocus
              required
              maxLength={2048}
              disabled={busy}
            />
          )}
          <p className="input-hint">
            {kind === "website"
              ? "Imports the HTML and styles available at this URL. JavaScript-only pages may need rendered HTML."
              : kind === "github"
                ? "HTML/CSS and React/Vite. You can include a branch or page file in the URL."
                : "In your browser’s inspector, copy the rendered page’s outer HTML for a complete snapshot."}
          </p>
          {kind === "github" && (
            <div className="github-connect">
              <div className="connect-heading">
                <LockKeyhole size={16} />
                <span>
                  {token
                    ? "Token ready for this session"
                    : "Importing a private repository?"}
                </span>
                {token ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToken("");
                      setDraft("");
                      setConnect(false);
                    }}
                  >
                    <Unplug size={13} />
                    Disconnect
                  </button>
                ) : (
                  <button type="button" onClick={() => setConnect(!connect)}>
                    {connect ? "Hide" : "Connect token"}
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
              {connect && !token && (
                <>
                  <label htmlFor="github-token">
                    Fine-grained GitHub token
                  </label>
                  <div className="token-row">
                    <input
                      id="github-token"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="github_pat_…"
                    />
                    <button
                      className="token-save"
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => {
                        onToken(draft.trim());
                        setDraft("");
                        setConnect(false);
                      }}
                    >
                      Connect
                    </button>
                  </div>
                  <p className="input-hint">
                    Choose only the needed repositories and grant Contents:
                    read-only.{" "}
                    <a
                      href="https://github.com/settings/personal-access-tokens/new"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Create token ↗
                    </a>
                  </p>
                </>
              )}
              {token && (
                <p className="connected-note">
                  <Check size={12} />
                  Kept in memory. Sent only to GitHub. Cleared on reload.
                </p>
              )}
            </div>
          )}
          {error && (
            <div className="import-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="primary-button import-submit"
            type="submit"
            disabled={busy || !value.trim()}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={16} />
                Reading your page…
              </>
            ) : (
              <>
                Import & detect UI
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <p className="dialog-footnote">
          <LockKeyhole size={12} />
          Your repository is never modified.
        </p>
      </div>
    </dialog>
  );
}
