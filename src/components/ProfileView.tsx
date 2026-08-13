"use client";

import { useRef, useState } from "react";
import { modules } from "@/lib/registry";
import { mergeProgress, useProgress, type ProgressState } from "@/lib/progress";

/**
 * Profile: overall stats, quiz history, and manual export/import so progress
 * can move between devices today. Account-based sync replaces the manual
 * transfer once auth is wired in.
 */
export function ProfileView() {
  const { state, ready, resetAll } = useProgress();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) return null;

  const sectionTotal = modules.reduce((n, m) => n + m.sections.length, 0);
  const sectionsDone = Object.keys(state.sections).length;
  const quizzes = Object.entries(state.quizzes);
  const problemsDone = Object.keys(state.problems).length;

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interpretable-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (file: File) => {
    try {
      const incoming = JSON.parse(await file.text()) as ProgressState;
      if (incoming.v !== 1) throw new Error("unknown version");
      const merged = mergeProgress(state, incoming);
      window.localStorage.setItem(
        "interpretable.progress.v1",
        JSON.stringify(merged),
      );
      window.location.reload();
    } catch {
      setMessage("Could not read that file — is it an exported progress JSON?");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Profile &amp; progress
      </h1>
      <p className="mt-2 text-[14px] leading-6 text-ink-muted">
        Progress is saved on this device. Use export/import to move it between
        devices — account sync is coming.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Sections completed", value: `${sectionsDone}/${sectionTotal}` },
          { label: "Quizzes taken", value: String(quizzes.length) },
          { label: "Problems solved", value: String(problemsDone) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-borderline bg-surface-1 p-4"
          >
            <div className="text-2xl font-bold text-ink">{s.value}</div>
            <div className="mt-1 text-[12px] uppercase tracking-wide text-ink-muted">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {quizzes.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-ink">Quiz history</h2>
          <div className="space-y-2">
            {quizzes
              .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
              .map(([key, r]) => {
                const moduleId = key.split(":")[0];
                const mod = modules.find((m) => m.id === moduleId);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-borderline bg-surface-1 px-4 py-2.5"
                  >
                    <span className="text-[14px] text-ink-secondary">
                      {mod ? `${mod.id} · ${mod.title}` : key}
                    </span>
                    <span
                      className={`font-mono text-[13px] ${
                        r.score === r.total ? "text-good" : "text-ink"
                      }`}
                    >
                      {r.score}/{r.total}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={exportProgress}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Export progress
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-lg border border-borderline-strong px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink"
        >
          Import &amp; merge
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Erase all progress on this device?")) resetAll();
          }}
          className="rounded-lg border border-critical/40 px-4 py-2 text-sm font-medium text-critical/90 hover:bg-critical/10"
        >
          Reset
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importProgress(f);
            e.target.value = "";
          }}
        />
      </div>
      {message ? (
        <div className="mt-3 text-[13px] text-warn">{message}</div>
      ) : null}
    </div>
  );
}
