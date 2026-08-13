"use client";

import Link from "next/link";
import { parts } from "@/lib/parts";
import { modules, modulesForPart } from "@/lib/registry";
import { useProgress } from "@/lib/progress";

function OverallBar() {
  const { state, ready } = useProgress();
  const total = modules.reduce((n, m) => n + m.sections.length, 0);
  const done = Object.keys(state.sections).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  if (!ready || done === 0) return null;
  return (
    <div className="mt-6 max-w-xl">
      <div className="mb-1 flex justify-between text-[12px] text-ink-muted">
        <span>Course progress</span>
        <span className="font-mono">
          {done}/{total} sections · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function ModuleCard({ slug }: { slug: string }) {
  const { moduleProgress } = useProgress();
  const mod = modules.find((m) => m.slug === slug)!;
  const { done, total } = moduleProgress(mod);
  const ready = mod.status === "ready" && total > 0;
  return (
    <Link
      href={`/learn/${mod.slug}`}
      className="group flex flex-col rounded-xl border border-borderline bg-surface-1 p-4 transition-colors hover:border-borderline-strong"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[12px] text-ink-muted">{mod.id}</span>
        {ready ? (
          done > 0 ? (
            <span
              className={`font-mono text-[11px] ${
                done === total ? "text-good" : "text-series-4"
              }`}
            >
              {done === total ? "✓ complete" : `${done}/${total}`}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-ink-muted">
              ~{Math.round((mod.estMinutes / 60) * 10) / 10}h
            </span>
          )
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            soon
          </span>
        )}
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-6 text-ink group-hover:text-accent">
        {mod.title}
      </div>
      <div className="mt-1 text-[13px] leading-5 text-ink-muted">{mod.tagline}</div>
    </Link>
  );
}

export function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-14">
      <header className="max-w-2xl">
        <div className="mb-3 inline-block rounded-full border border-borderline px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          a crash course in ~100 hours
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-ink">
          Understand what&apos;s happening inside the model.
        </h1>
        <p className="mt-4 text-[16px] leading-7 text-ink-secondary">
          Transformer fundamentals → how LLMs are actually trained → mechanistic
          interpretability → safety, steering, and editing. Visual-first lessons,
          interactive toys, problem sets, and the real literature — from{" "}
          <em>Attention Is All You Need</em> to the 2026 Transformer Circuits
          papers on emotions and the global workspace.
        </p>
        <OverallBar />
      </header>

      <div className="mt-12 space-y-10">
        {parts.map((p) => (
          <section key={p.number}>
            <div className="mb-3">
              <h2 className="text-lg font-bold tracking-tight text-ink">
                <span className="mr-2 font-mono text-[13px] font-normal text-ink-muted">
                  Part {p.number}
                </span>
                {p.title}
              </h2>
              <p className="text-[13px] text-ink-muted">{p.tagline}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modulesForPart(p.number).map((m) => (
                <ModuleCard key={m.slug} slug={m.slug} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-14 rounded-xl border border-borderline bg-surface-1 p-5 text-[13px] leading-6 text-ink-muted">
        Built in the spirit of applying all of this to AI safety first — with side
        quests into performance &amp; reliability, steering &amp; character, and
        models that learn on the fly. Full plan in{" "}
        <a
          className="text-accent hover:underline"
          href="https://github.com/awlevin/mech-interp/blob/main/CURRICULUM.md"
          target="_blank"
          rel="noreferrer"
        >
          CURRICULUM.md
        </a>
        .
      </footer>
    </div>
  );
}
