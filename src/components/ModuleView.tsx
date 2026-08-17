"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Move the reader to a section and keep the URL in step, so a reload or a
 *  shared link returns to the same place. */
function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  // `html { scroll-behavior: smooth }` animates "auto", so reduced motion
  // has to ask for "instant" by name.
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  el.scrollIntoView({
    behavior: reduceMotion ? "instant" : "smooth",
    block: "start",
  });
  window.history.replaceState(null, "", `#${id}`);
}

/**
 * Land on the section named in the URL. A client-side navigation to
 * `/learn/x#section` commits without restoring the anchor, so the resume
 * links place the reader themselves, and hold that place while the page
 * finishes settling.
 */
function useHashLanding(mod: CourseModule) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !mod.sections.some((s) => s.id === id)) return;

    let active = true;
    const land = () => {
      if (!active) return;
      // Landing is a starting point, not a movement: animating a few
      // thousand pixels on arrival only makes the reader seasick.
      document
        .getElementById(id)
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const stop = () => {
      active = false;
      cleanup();
    };

    land();
    const frame = requestAnimationFrame(land);
    // Web fonts and interactive widgets settle after the first paint and
    // change the height of everything above the target, which slides it out
    // of place — follow those changes until the page holds still.
    const observer = new ResizeObserver(land);
    observer.observe(document.body);
    const settled = setTimeout(stop, 1500);
    // Any deliberate move by the reader ends the correction immediately.
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    inputs.forEach((type) =>
      window.addEventListener(type, stop, { passive: true }),
    );

    function cleanup() {
      cancelAnimationFrame(frame);
      clearTimeout(settled);
      observer.disconnect();
      inputs.forEach((type) => window.removeEventListener(type, stop));
    }
    return stop;
  }, [mod]);
}

/** Mark a section started the first time it reaches the reading area. */
function useMarkStartedOnView(moduleId: string, sectionId: string) {
  const { markStarted, ready } = useProgress();
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        markStarted(moduleId, sectionId);
        observer.disconnect();
      },
      // Only count it once the section has climbed into the top two-thirds
      // of the viewport — passing it on the way down is not reading it.
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [moduleId, sectionId, ready, markStarted]);

  return ref;
}

function SectionFooter({
  mod,
  section,
  nextSection,
}: {
  mod: CourseModule;
  section: Section;
  nextSection?: Section;
}) {
  const { isSectionDone, toggleSection, isProblemDone } = useProgress();
  const done = isSectionDone(mod.id, section.id);
  // A check is earned by submitting it, not by declaring it finished.
  const selfMarked = section.kind !== "quiz";

  const problemsDone =
    section.kind === "problems"
      ? section.problems.filter((p) => isProblemDone(mod.id, p.id)).length
      : 0;

  const complete = () => {
    toggleSection(mod.id, section.id, true);
    if (nextSection) goToSection(nextSection.id);
  };

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-borderline pt-4">
      {done ? (
        <>
          <span className="text-[13px] font-medium text-good">
            ✓ Section complete
          </span>
          {nextSection ? (
            <button
              type="button"
              onClick={() => goToSection(nextSection.id)}
              className="rounded-lg border border-borderline-strong px-3 py-1.5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              Next: {nextSection.title} →
            </button>
          ) : null}
          {selfMarked ? (
            <button
              type="button"
              onClick={() => toggleSection(mod.id, section.id, false)}
              className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Undo
            </button>
          ) : null}
        </>
      ) : selfMarked ? (
        <>
          <button
            type="button"
            onClick={complete}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {nextSection ? "Mark complete & continue →" : "Mark complete"}
          </button>
          {section.kind === "problems" ? (
            <span className="text-[13px] text-ink-muted">
              {problemsDone} of {section.problems.length} problems marked done
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-[13px] text-ink-muted">
          Submit your answers to complete this check.
        </span>
      )}
    </div>
  );
}

function SectionBlock({
  mod,
  section,
  nextSection,
}: {
  mod: CourseModule;
  section: Section;
  nextSection?: Section;
}) {
  const { isSectionDone } = useProgress();
  const meta = SECTION_META[section.kind];
  const done = isSectionDone(mod.id, section.id);
  const ref = useMarkStartedOnView(mod.id, section.id);

  return (
    <section
      id={section.id}
      ref={ref}
      className="scroll-mt-20 lg:scroll-mt-10"
    >
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
        {done ? (
          <span className="shrink-0 rounded-full border border-good/50 bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
            ✓ Complete
          </span>
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
      <SectionFooter mod={mod} section={section} nextSection={nextSection} />
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

/** Offer to jump back in, but only when the reader arrived at the top of a
 *  module they had already started somewhere further down. */
function ResumeBanner({ mod }: { mod: CourseModule }) {
  const { moduleProgress, ready } = useProgress();
  const { resumeSectionId } = moduleProgress(mod);
  // No hash means the reader came in at the top of the page — a link that
  // already targets a section needs no second invitation.
  const landedAtTop = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash === "",
    () => false,
  );

  if (!ready || !landedAtTop || !resumeSectionId) return null;
  const target = mod.sections.find((s) => s.id === resumeSectionId);
  // Nothing to jump to when the next thing to read is the top of the page.
  if (!target || target.id === mod.sections[0]?.id) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Pick up where you left off
        </div>
        <div className="mt-0.5 text-[14px] text-ink">
          {SECTION_META[target.kind].label}: {target.title}
        </div>
      </div>
      <button
        type="button"
        onClick={() => goToSection(target.id)}
        className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Continue →
      </button>
    </div>
  );
}

function ModuleProgressBar({ mod }: { mod: CourseModule }) {
  const { moduleProgress, ready } = useProgress();
  const { done, total, status } = moduleProgress(mod);
  if (!ready || total === 0 || status === "not-started") return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-5">
      <div className="mb-1 flex justify-between text-[12px] text-ink-muted">
        <span>{status === "complete" ? "Module complete" : "Module progress"}</span>
        <span className="font-mono">
          {done}/{total} sections
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${
            status === "complete" ? "bg-good" : "bg-accent"
          }`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function SectionNav({ mod }: { mod: CourseModule }) {
  const { isSectionDone, moduleProgress, ready } = useProgress();
  const { resumeSectionId } = moduleProgress(mod);
  if (mod.sections.length < 2) return null;
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {mod.sections.map((s) => {
        const done = ready && isSectionDone(mod.id, s.id);
        const current = ready && s.id === resumeSectionId;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
              done
                ? "border-good/40 text-good hover:border-good/70"
                : current
                  ? "border-accent/50 bg-accent-soft text-ink"
                  : "border-borderline text-ink-secondary hover:border-borderline-strong hover:text-ink"
            }`}
          >
            {done ? "✓ " : ""}
            {SECTION_META[s.kind].label}: {s.title}
          </a>
        );
      })}
    </nav>
  );
}

function ModuleCompleteBanner({
  mod,
  next,
}: {
  mod: CourseModule;
  next?: CourseModule;
}) {
  const { moduleProgress, moduleHref, ready } = useProgress();
  const { status } = moduleProgress(mod);
  if (!ready || status !== "complete") return null;
  return (
    <div className="mt-12 rounded-xl border border-good/40 bg-good/5 p-5">
      <div className="text-[15px] font-semibold text-good">
        ✓ Module complete
      </div>
      <p className="mt-1 text-[14px] leading-6 text-ink-secondary">
        Every section of {mod.title} is done. Your notes and quiz scores stay on
        your profile.
      </p>
      {next ? (
        <Link
          href={moduleHref(next)}
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Start {next.id} · {next.title} →
        </Link>
      ) : null}
    </div>
  );
}

export function ModuleView({ mod }: { mod: CourseModule }) {
  const { moduleHref } = useProgress();
  const { prev, next } = adjacentModules(mod.slug);
  useHashLanding(mod);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-10">
        <div className="mb-2 font-mono text-[12px] text-ink-muted">
          Module {mod.id} · ~{Math.round(mod.estMinutes / 60 * 10) / 10}h
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
        <ModuleProgressBar mod={mod} />
        <ResumeBanner mod={mod} />
        <SectionNav mod={mod} />
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
        <>
          <div className="space-y-14">
            {mod.sections.map((s, i) => (
              <SectionBlock
                key={s.id}
                mod={mod}
                section={s}
                nextSection={mod.sections[i + 1]}
              />
            ))}
            <Notes moduleId={mod.id} />
          </div>
          <ModuleCompleteBanner mod={mod} next={next} />
        </>
      )}

      <nav className="mt-14 flex items-stretch justify-between gap-3 border-t border-borderline pt-6">
        {prev ? (
          <Link
            href={moduleHref(prev)}
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
            href={moduleHref(next)}
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
