"use client";

import { useState, type ReactNode } from "react";
import type { Problem } from "@/lib/types";
import { useProgress } from "@/lib/progress";

const KIND_LABEL: Record<Problem["kind"], { label: string; color: string }> = {
  pencil: { label: "pencil & paper", color: "text-series-3" },
  code: { label: "code", color: "text-series-2" },
  explore: { label: "explore", color: "text-series-7" },
};

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[13px] font-medium text-accent hover:underline"
      >
        {open ? `Hide ${label}` : `Show ${label}`}
      </button>
      {open ? (
        <div className="lesson mt-2 rounded-lg border border-borderline bg-surface-2 px-4 py-3 text-[14px]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ProblemSet({
  moduleId,
  problems,
}: {
  moduleId: string;
  problems: Problem[];
}) {
  const { isProblemDone, toggleProblem } = useProgress();
  return (
    <div className="space-y-4">
      {problems.map((p, i) => {
        const done = isProblemDone(moduleId, p.id);
        const kind = KIND_LABEL[p.kind];
        return (
          <div
            key={p.id}
            className={`rounded-xl border bg-surface-1 p-4 transition-colors ${
              done ? "border-good/40" : "border-borderline"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[13px] text-ink-muted">
                  {i + 1}.
                </span>
                <span className="text-[15px] font-semibold text-ink">
                  {p.title}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-wide ${kind.color}`}
                >
                  {kind.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleProblem(moduleId, p.id)}
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  done
                    ? "border-good/60 bg-good/10 text-good"
                    : "border-borderline-strong text-ink-muted hover:text-ink"
                }`}
              >
                {done ? "✓ Done" : "Mark done"}
              </button>
            </div>
            <div className="lesson text-[14px]">{p.prompt}</div>
            {p.hint ? <Disclosure label="hint">{p.hint}</Disclosure> : null}
            <Disclosure label="solution">{p.solution}</Disclosure>
          </div>
        );
      })}
    </div>
  );
}
