"use client";

import Link from "next/link";
import { useState } from "react";
import type { CourseModule, Section } from "@/lib/types";
import { adjacentModules } from "@/lib/registry";
import { useProgress } from "@/lib/progress";
import { Quiz } from "./Quiz";
import { ProblemSet } from "./ProblemSet";
import { Readings } from "./Readings";

const SECTION_META: Record<
  Section["kind"],
  { label: string; color: string }
> = {
  learn: { label: "Learn", color: "var(--series-1)" },
  explore: { label: "Explore", color: "var(--series-2)" },
  problems: { label: "Practice", color: "var(--series-3)" },
  quiz: { label: "Check", color: "var(--series-5)" },
  readings: { label: "Go deeper", color: "var(--series-7)" },
};

function SectionBlock({ mod, section }: { mod: CourseModule; section: Section }) {
  const { isSectionDone, toggleSection } = useProgress();
  const meta = SECTION_META[section.kind];
  const done = isSectionDone(mod.id, section.id);

  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-borderline pb-2">
        <div className="flex items-baseline gap-2.5">
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
          <h2 className="text-lg font-bold tracking-tight text-ink">
            {section.title}
          </h2>
        </div>
        {section.kind !== "quiz" ? (
          <button
            type="button"
            onClick={() => toggleSection(mod.id, section.id)}
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              done
                ? "border-good/60 bg-good/10 text-good"
                : "border-borderline-strong text-ink-muted hover:text-ink"
            }`}
          >
            {done ? "✓ Complete" : "Mark complete"}
          </button>
        ) : null}
      </div>
      {section.kind === "learn" || section.kind === "explore" ? (
        <div className="lesson">{section.body}</div>
      ) : null}
      {section.kind === "problems" ? (
        <>
          {section.intro ? <div className="lesson mb-4">{section.intro}</div> : null}
          <ProblemSet moduleId={mod.id} problems={section.problems} />
        </>
      ) : null}
      {section.kind === "quiz" ? (
        <Quiz moduleId={mod.id} sectionId={section.id} questions={section.questions} />
      ) : null}
      {section.kind === "readings" ? (
        <>
          {section.intro ? <div className="lesson mb-4">{section.intro}</div> : null}
          <Readings readings={section.readings} />
        </>
      ) : null}
    </section>
  );
}

function Notes({ moduleId }: { moduleId: string }) {
  const { note, saveNote, ready } = useProgress();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? note(moduleId);
  if (!ready) return null;
  return (
    <div className="rounded-xl border border-borderline bg-surface-1 p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        Lab notebook
      </div>
      <textarea
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null) saveNote(moduleId, draft);
        }}
        placeholder="What clicked? What's still confusing? Saved to your profile."
        rows={4}
        className="w-full resize-y rounded-lg border border-borderline bg-surface-2 px-3 py-2 text-[14px] leading-6 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
    </div>
  );
}

export function ModuleView({ mod }: { mod: CourseModule }) {
  const { moduleProgress } = useProgress();
  const { prev, next } = adjacentModules(mod.slug);
  const { done, total } = moduleProgress(mod);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-10">
        <div className="mb-2 font-mono text-[12px] text-ink-muted">
          Module {mod.id} · ~{Math.round(mod.estMinutes / 60 * 10) / 10}h
          {total > 0 ? ` · ${done}/${total} sections done` : ""}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{mod.title}</h1>
        <p className="mt-2 text-[15px] leading-7 text-ink-secondary">{mod.tagline}</p>
        <div className="mt-5 rounded-xl border border-borderline bg-surface-1 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            You&apos;ll be able to
          </div>
          <ul className="space-y-1.5">
            {mod.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-[14px] leading-6 text-ink-secondary">
                <span className="text-accent">→</span> {o}
              </li>
            ))}
          </ul>
        </div>
        {mod.sections.length > 1 ? (
          <nav className="mt-4 flex flex-wrap gap-2">
            {mod.sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-borderline px-3 py-1 text-[12px] text-ink-secondary hover:border-borderline-strong hover:text-ink"
              >
                {SECTION_META[s.kind].label}: {s.title}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      {mod.status === "stub" || mod.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-borderline-strong bg-surface-1 p-8 text-center">
          <div className="text-lg font-semibold text-ink">In production</div>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-ink-muted">
            This module is being built. Its scope and objectives above are final —
            content, interactives, problems, and quiz are on the way.
          </p>
        </div>
      ) : (
        <div className="space-y-14">
          {mod.sections.map((s) => (
            <SectionBlock key={s.id} mod={mod} section={s} />
          ))}
          <Notes moduleId={mod.id} />
        </div>
      )}

      <nav className="mt-14 flex items-stretch justify-between gap-3 border-t border-borderline pt-6">
        {prev ? (
          <Link
            href={`/learn/${prev.slug}`}
            className="max-w-[48%] rounded-xl border border-borderline bg-surface-1 px-4 py-3 hover:border-borderline-strong"
          >
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">← Previous</div>
            <div className="mt-0.5 text-[14px] font-medium text-ink">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/learn/${next.slug}`}
            className="max-w-[48%] rounded-xl border border-borderline bg-surface-1 px-4 py-3 text-right hover:border-borderline-strong"
          >
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">Next →</div>
            <div className="mt-0.5 text-[14px] font-medium text-ink">{next.title}</div>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
