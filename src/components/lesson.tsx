import type { ReactNode } from "react";

/**
 * Small building blocks for lesson prose. Use inside `learn`/`explore` bodies.
 */

/** Highlighted key idea — use once or twice per section for the load-bearing claim. */
export function KeyIdea({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
        Key idea
      </div>
      <div className="text-[15px] leading-7 text-ink">{children}</div>
    </div>
  );
}

/** Callout for caveats, asides, and safety tie-ins. */
export function Note({
  kind = "note",
  title,
  children,
}: {
  kind?: "note" | "warning" | "safety" | "history";
  title?: string;
  children: ReactNode;
}) {
  const labels: Record<string, string> = {
    note: "Note",
    warning: "Careful",
    safety: "Safety tie-in",
    history: "Context",
  };
  const colors: Record<string, string> = {
    note: "border-borderline-strong",
    warning: "border-warn/50",
    safety: "border-good/50",
    history: "border-series-7/50",
  };
  return (
    <div className={`my-5 rounded-lg border ${colors[kind]} bg-surface-1 px-4 py-3`}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {title ?? labels[kind]}
      </div>
      <div className="text-[14px] leading-6 text-ink-secondary">{children}</div>
    </div>
  );
}

/** Figure wrapper with caption. Put SVG diagrams inside. */
export function Figure({
  caption,
  children,
}: {
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="my-6">
      <div className="overflow-x-auto rounded-lg border border-borderline bg-surface-1 p-4">
        {children}
      </div>
      <figcaption className="mt-2 text-[13px] leading-5 text-ink-muted">
        {caption}
      </figcaption>
    </figure>
  );
}

/** Definition of a term of art. */
export function Term({
  word,
  children,
}: {
  word: string;
  children: ReactNode;
}) {
  return (
    <div className="my-3 flex gap-3 rounded-lg bg-surface-1 px-4 py-3">
      <div className="shrink-0 font-mono text-[13px] font-semibold text-series-3">
        {word}
      </div>
      <div className="text-[14px] leading-6 text-ink-secondary">{children}</div>
    </div>
  );
}
