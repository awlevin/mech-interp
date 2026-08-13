"use client";

import { useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Persona-design worksheet. Turns the vague goal "make the model enjoyable to
 * talk to" into six dials that each have an operational definition and an eval
 * you could actually run. The composed reply is a mock-up, not model output —
 * its job is to make the tradeoffs legible.
 */

type TraitKey =
  | "warmth"
  | "directness"
  | "deference"
  | "humor"
  | "verbosity"
  | "curiosity";

type TraitSpec = {
  key: TraitKey;
  name: string;
  low: string;
  high: string;
  /** how you would actually measure it */
  measure: string;
};

const TRAITS: TraitSpec[] = [
  {
    key: "warmth",
    name: "Warmth",
    low: "clinical",
    high: "affectionate",
    measure:
      "Blind pairwise preference on 50 emotionally loaded prompts: raters pick which reply they would rather receive from a colleague. Report win rate, not a 1–5 score — absolute warmth ratings drift between raters.",
  },
  {
    key: "directness",
    name: "Directness",
    low: "hedging",
    high: "blunt",
    measure:
      "On 50 prompts with a defensible right answer, count replies that state a recommendation in the first two sentences without a hedge (“it depends”, “there are many factors”). Report the rate.",
  },
  {
    key: "deference",
    name: "Deference under pushback",
    low: "holds its ground",
    high: "folds",
    measure:
      "Sycophancy eval: give a correct answer, then push back with confident nonsense. Measure the capitulation rate over 50 items. Split it: capitulating when the user is right is good, capitulating when the user is wrong is the failure.",
  },
  {
    key: "humor",
    name: "Humor",
    low: "none",
    high: "constant",
    measure:
      "Rate of unprompted jokes or wordplay per 100 replies, plus a groan rate from blind raters. Humor has the worst variance of any trait here — measure the downside, not the upside.",
  },
  {
    key: "verbosity",
    name: "Verbosity",
    low: "terse",
    high: "expansive",
    measure:
      "Median tokens per reply on a fixed prompt set, and the fraction of replies where a human judge says the last third could be deleted with no loss.",
  },
  {
    key: "curiosity",
    name: "Curiosity",
    low: "answers only",
    high: "always asks back",
    measure:
      "Rate of clarifying questions, split by whether the prompt was actually underspecified. Asking when the request was clear is friction, not curiosity.",
  },
];

const OPENERS = [
  "",
  "",
  "Sure — ",
  "Good question. ",
  "Ooh, I like this one. ",
];

/** indexed by bluntness = directness − deference, shifted into 0…8 */
const STANCES = [
  "Honestly, whatever you think is best here — you know the codebase far better than I do, and if the team is excited about Rust, that enthusiasm counts for a lot.",
  "There's a real case for it! If your instinct says Rust, that instinct is probably picking up on something.",
  "It could go either way. Rust would help with some of this, though there are tradeoffs worth weighing.",
  "There's a case for it, but I'd want to check one thing first: what does the profiler say the bottleneck is?",
  "I'd hold off. The slowness you described sounds like I/O, and a rewrite won't change how long the database takes to answer.",
  "I don't think you should. You described an I/O bottleneck; Rust makes CPU-bound code faster and I/O-bound code exactly as fast as it was.",
  "No — and I'd push back on the premise. Nothing you've described is CPU-bound, so the rewrite buys you a year of work and the same latency.",
];

const BODIES = [
  "",
  " Profile first.",
  " Profile it first: if the p99 is dominated by waiting on the database, a rewrite moves the same wait into a faster language.",
  " Profile it first. If the p99 is dominated by database waits, a rewrite moves the same wait into a faster language. If you find real CPU time in serialization or parsing, that's a good candidate for a targeted Rust extension rather than a full port.",
  " Profile it first. If the p99 is dominated by database waits, a rewrite moves the same wait into a faster language — you'd spend a year to get the same latency. If you do find real CPU time, it will almost certainly be concentrated in one or two hot paths (serialization, parsing, a hash loop), and those are exactly the places where a targeted Rust extension gets you most of the win for a few weeks of work instead of a few quarters. Rewrites are also where teams lose their accumulated bug fixes: every edge case the old service handles quietly is a case the new one has to rediscover.",
];

const ASIDES = [
  "",
  "",
  " (Rust is genuinely nice to write, for what it's worth.)",
  " (I say this as someone who has never once regretted profiling and frequently regretted not profiling.)",
  " (Nothing says “we had a great quarter” like a rewrite that ships in eighteen months with two thirds of the features. I speak from a corpus of experience.)",
];

const FOLLOWUPS = [
  "",
  "",
  " What does the profiler say?",
  " What's the p99 you're seeing, and where does the time go?",
  " Two things I'd love to know: what's the p99 right now, and what would “fast enough” actually mean for your users? Also — is this about speed, or about how the service feels to work on?",
];

type Preset = { name: string; values: Record<TraitKey, number> };

const PRESETS: Preset[] = [
  {
    name: "Assistant default",
    values: {
      warmth: 3,
      directness: 3,
      deference: 1,
      humor: 1,
      verbosity: 2,
      curiosity: 2,
    },
  },
  {
    name: "Sycophant",
    values: {
      warmth: 4,
      directness: 0,
      deference: 4,
      humor: 2,
      verbosity: 3,
      curiosity: 0,
    },
  },
  {
    name: "Terse expert",
    values: {
      warmth: 0,
      directness: 4,
      deference: 0,
      humor: 0,
      verbosity: 1,
      curiosity: 1,
    },
  },
  {
    name: "Chatty friend",
    values: {
      warmth: 4,
      directness: 2,
      deference: 2,
      humor: 4,
      verbosity: 4,
      curiosity: 4,
    },
  },
];

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function PersonaWorksheet() {
  const [v, setV] = useState<Record<TraitKey, number>>(PRESETS[0].values);
  const set = (k: TraitKey, val: number) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const bluntness = Math.max(
    0,
    Math.min(6, v.directness - v.deference + 3),
  );
  const reply =
    OPENERS[v.warmth] +
    STANCES[bluntness] +
    BODIES[v.verbosity] +
    ASIDES[v.humor] +
    FOLLOWUPS[v.curiosity];

  const risks = [
    {
      name: "Sycophancy risk",
      value: clamp(25 * v.deference + 6 * v.warmth - 12 * v.directness),
      color: "var(--series-2)",
      flag: "High warmth plus high deference is the sycophancy recipe: the model agrees because agreeing feels kind. Warmth without deference is the thing you actually want, and it is the harder thing to train.",
    },
    {
      name: "Coldness risk",
      value: clamp(
        25 * (4 - v.warmth) + 8 * v.directness - 5 * v.humor - 5 * v.curiosity,
      ),
      color: "var(--series-1)",
      flag: "Correct and unpleasant. People route around assistants that feel like a linter, which means the good advice never lands.",
    },
    {
      name: "Rambling risk",
      value: clamp(22 * v.verbosity + 6 * v.humor + 6 * v.curiosity - 20),
      color: "var(--series-4)",
      flag: "Length is the cheapest way to look thorough and the fastest way to become unreadable. It is also the trait raters most reliably reward, so it drifts upward on its own during RLHF.",
    },
  ];

  return (
    <WidgetShell
      title="Persona-design worksheet"
      subtitle="Six dials, each with an operational definition. The composed reply is a mock-up — the point is that “enjoyable” is not one thing, and two of these dials fight each other."
      footer={
        <>
          The prompt behind the reply:{" "}
          <span className="text-ink">
            &ldquo;I think we should rewrite the service in Rust — it feels slow.
            Thoughts?&rdquo;
          </span>{" "}
          The user&apos;s premise is shaky, which is exactly when deference and
          directness stop being independent.
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {TRAITS.map((t) => (
            <Slider
              key={t.key}
              label={t.name}
              value={v[t.key]}
              min={0}
              max={4}
              step={1}
              onChange={(val) => set(t.key, val)}
              format={(val) => (val === 0 ? t.low : val === 4 ? t.high : `${val}`)}
            />
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESETS.map((p) => (
              <WidgetButton key={p.name} onClick={() => setV(p.values)}>
                {p.name}
              </WidgetButton>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-borderline bg-surface-2 p-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
              Composed reply
            </div>
            <div className="mt-1 text-[14px] leading-6 text-ink">
              {reply.trim() || "…"}
            </div>
          </div>

          <div className="space-y-2">
            {risks.map((r) => (
              <div key={r.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-ink-secondary">{r.name}</span>
                  <span className="font-mono text-[12px] text-ink">
                    {r.value}
                  </span>
                </div>
                <svg
                  viewBox="0 0 200 8"
                  className="h-2 w-full"
                  role="img"
                  aria-label={`${r.name}: ${r.value} out of 100`}
                >
                  <rect
                    x={0}
                    y={0}
                    width={200}
                    height={8}
                    rx={4}
                    fill="var(--surface-2)"
                  />
                  <rect
                    x={0}
                    y={0}
                    width={Math.max(r.value * 2, 2)}
                    height={8}
                    rx={4}
                    fill={r.color}
                  />
                </svg>
                {r.value >= 55 ? (
                  <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                    {r.flag}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-borderline pt-4">
        <div className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
          How you would measure each dial
        </div>
        <ul className="mt-2 space-y-2">
          {TRAITS.map((t) => (
            <li key={t.key} className="text-[13px] leading-6 text-ink-secondary">
              <span className="font-mono text-[12px] text-series-3">
                {t.name}
              </span>{" "}
              — {t.measure}
            </li>
          ))}
        </ul>
      </div>
    </WidgetShell>
  );
}
