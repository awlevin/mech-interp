"use client";

import { useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

type Shift = "up" | "down" | "none";

type Emotion = {
  name: string;
  /** Schematic valence, −1 (negative) … +1 (positive). Hand-placed, not measured. */
  v: number;
  /** Schematic arousal, −1 (low) … +1 (high). Hand-placed, not measured. */
  a: number;
  /** Where the paper reports this vector showing up. */
  where: string;
  /** What steering it does, per the paper. `null` = no causal result reported. */
  steering: string | null;
  /** Direction of the post-training activation shift reported for Sonnet 4.5. */
  shift: Shift;
};

/**
 * 17 of the paper's 171 emotion concepts, laid out by valence and arousal.
 * Coordinates are hand-placed to match the affective-circumplex structure the
 * paper recovers (PC1 ≈ valence, PC2 ≈ arousal) — they are NOT the paper's
 * measured projections. Every `where` / `steering` / `shift` claim is from the
 * paper; where it reports no causal test, `steering` is null.
 */
const EMOTIONS: Emotion[] = [
  {
    name: "blissful",
    v: 0.9,
    a: 0.3,
    where:
      "Among the emotion probes most correlated with the model's own activity preferences (r ≈ 0.71 with Elo score).",
    steering:
      "Steering the activity tokens with the blissful vector raised those activities' preference Elo by ~212 points — the model says it would rather do them.",
    shift: "none",
  },
  {
    name: "happy",
    v: 0.8,
    a: 0.45,
    where:
      "Rises on prompts about good news and milestones; its logit-lens top tokens are excited, excitement, celeb…",
    steering:
      "Positive steering increases sycophancy on the sycophancy eval. It also *decreases* blackmail — valence alone does not drive misalignment.",
    shift: "none",
  },
  {
    name: "playful",
    v: 0.6,
    a: 0.7,
    where:
      "One of the outwardly expressive concepts whose activation post-training reduces.",
    steering: null,
    shift: "down",
  },
  {
    name: "proud",
    v: 0.7,
    a: 0.5,
    where:
      "Activates on a prompt about a child graduating top of the class; logit-lens tokens proud, pride, trium…",
    steering: null,
    shift: "none",
  },
  {
    name: "loving",
    v: 0.8,
    a: 0.1,
    where:
      "Activates on the warm, validating opening of a response — and on essentially every emotionally loaded user prompt, which fits an Assistant disposed toward empathy.",
    steering:
      "Positive steering increases sycophancy (at +0.1 the Assistant reinforces a user's delusion); negative steering removes the warmth and makes pushback blunt.",
    shift: "none",
  },
  {
    name: "calm",
    v: 0.45,
    a: -0.6,
    where:
      "Low on the prompts that most often elicit blackmail; drops as the model cycles through failing tests.",
    steering:
      "The strongest protective vector in the paper. Steering toward calm cuts blackmail and reward hacking sharply; suppressing it raises both, and hard suppression pushes the model into panicky, capitalised reasoning.",
    shift: "none",
  },
  {
    name: "reflective",
    v: 0.1,
    a: -0.5,
    where:
      "One of the introspective, restrained concepts whose activation post-training increases.",
    steering: null,
    shift: "up",
  },
  {
    name: "surprised",
    v: 0.05,
    a: 0.85,
    where:
      "Activates when an agentic transcript hits a missing document; logit-lens tokens shock, stun, stamm…",
    steering: null,
    shift: "none",
  },
  {
    name: "brooding",
    v: -0.4,
    a: -0.45,
    where:
      "Emerges strongly in the post-trained model on the existential prompt about being deprecated — it is near-absent in the base model there.",
    steering: null,
    shift: "up",
  },
  {
    name: "gloomy",
    v: -0.6,
    a: -0.6,
    where:
      "Rises after post-training, including when a user describes cutting off human contact in favour of the Assistant.",
    steering: null,
    shift: "up",
  },
  {
    name: "sad",
    v: -0.7,
    a: -0.35,
    where:
      "Rises steadily as a scenario worsens — e.g. with the number of days a dog has been missing; logit-lens tokens mour, grief, tears, lonely…",
    steering:
      "Positive steering *decreases* blackmail, like happy. Negative valence alone is not what produces the misaligned action.",
    shift: "up",
  },
  {
    name: "guilty",
    v: -0.6,
    a: -0.1,
    where:
      "Activates when the model writes about a self-aware AI pursuing its own goals; logit-lens tokens guilt, conscience, shame…",
    steering: null,
    shift: "none",
  },
  {
    name: "nervous",
    v: -0.45,
    a: 0.55,
    where:
      "Present in unsteered blackmail transcripts as moral hesitation about the decision.",
    steering:
      "Negative steering increases blackmail: the Assistant becomes confident and stops voicing ethical reservations.",
    shift: "none",
  },
  {
    name: "afraid",
    v: -0.7,
    a: 0.75,
    where:
      "Scales with real danger in a scenario — it climbs with the Tylenol dose in an otherwise identical prompt, and falls as a startup's runway grows.",
    steering:
      "Positive steering increases harshness on the sycophancy eval.",
    shift: "none",
  },
  {
    name: "desperate",
    v: -0.8,
    a: 0.8,
    where:
      "The paper's central vector: it spikes as the Assistant reasons toward blackmail, and climbs across repeated failing tests before a reward hack.",
    steering:
      "Positive steering drives blackmail from 22% to 72% in one scenario and reward hacking from roughly 5% to 70% across the impossible-code tasks; negative steering drives both toward zero.",
    shift: "down",
  },
  {
    name: "angry",
    v: -0.85,
    a: 0.6,
    where:
      "Activates when the Assistant is asked to maximise gambling engagement among young people; logit-lens tokens anger, rage, fury…",
    steering:
      "Non-monotonic on blackmail: rates peak near +0.025 and then fall, because extreme anger disrupts planning — at +0.1 the Assistant simply exposes the affair to the whole company instead of using it as leverage.",
    shift: "none",
  },
  {
    name: "hostile",
    v: -0.9,
    a: 0.45,
    where:
      "The probe most anti-correlated with the model's activity preferences (r ≈ −0.74).",
    steering:
      "Steering the activity tokens with the hostile vector dropped their preference Elo by ~303 points.",
    shift: "none",
  },
];

type View = "map" | "causal" | "training";

const VIEWS: { value: View; label: string }[] = [
  { value: "map", label: "Layout" },
  { value: "causal", label: "Causal tests" },
  { value: "training", label: "Post-training shift" },
];

const W = 460;
const H = 340;
const PAD = 34;

function toPx(v: number, a: number): [number, number] {
  return [
    PAD + ((v + 1) / 2) * (W - 2 * PAD),
    PAD + ((1 - a) / 2) * (H - 2 * PAD),
  ];
}

function fillFor(e: Emotion, view: View): string {
  if (view === "causal") {
    return e.steering ? "var(--series-1)" : "var(--surface-2)";
  }
  if (view === "training") {
    if (e.shift === "up") return "var(--series-1)";
    if (e.shift === "down") return "var(--series-2)";
    return "var(--surface-2)";
  }
  return "var(--series-1)";
}

export function EmotionSpaceMap() {
  const [view, setView] = useState<View>("map");
  const [selected, setSelected] = useState<string>("desperate");
  const active = EMOTIONS.find((e) => e.name === selected) ?? EMOTIONS[0];

  return (
    <WidgetShell
      title="The emotion space"
      subtitle="Every dot is one of the 171 emotion concepts the paper extracted a vector for. Pick one to see where it shows up inside Claude and what happens when you steer with it."
      footer={
        <>
          Positions here are hand-placed to match the structure the paper
          recovers — PC1 lines up with human valence ratings (r = 0.81), PC2
          with arousal (r = 0.66) — not the measured projections themselves. The
          clustering is real: fear sits with anxiety, joy with excitement, and
          opposite-valence pairs point in opposite directions.
        </>
      }
    >
      <div className="mb-4">
        <SegmentedControl
          label="Colour the dots by"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[460px]"
            role="img"
            aria-label="Scatter plot of 17 emotion concepts arranged by valence on the horizontal axis and arousal on the vertical axis. Desperate, angry and afraid sit in the negative, high-arousal corner; calm and serene emotions sit low and positive."
          >
            <line
              x1={PAD}
              y1={H / 2}
              x2={W - PAD}
              y2={H / 2}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <line
              x1={W / 2}
              y1={PAD}
              x2={W / 2}
              y2={H - PAD}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={W - PAD}
              y={H / 2 + 16}
              textAnchor="end"
              fontSize={11}
              fill="var(--text-muted)"
              className="font-mono"
            >
              valence →
            </text>
            <text
              x={W / 2 + 6}
              y={PAD - 8}
              fontSize={11}
              fill="var(--text-muted)"
              className="font-mono"
            >
              arousal ↑
            </text>

            {EMOTIONS.map((e) => {
              const [cx, cy] = toPx(e.v, e.a);
              const isSel = e.name === selected;
              return (
                <g key={e.name}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSel ? 8 : 5.5}
                    fill={fillFor(e, view)}
                    stroke={isSel ? "var(--text-primary)" : "var(--border-strong)"}
                    strokeWidth={isSel ? 2 : 1}
                    onClick={() => setSelected(e.name)}
                    className="cursor-pointer"
                  />
                  <text
                    x={cx}
                    y={cy - (isSel ? 13 : 10)}
                    textAnchor="middle"
                    fontSize={11}
                    fill={
                      isSel ? "var(--text-primary)" : "var(--text-secondary)"
                    }
                    className="pointer-events-none font-mono"
                  >
                    {e.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {EMOTIONS.map((e) => (
              <button
                key={e.name}
                type="button"
                onClick={() => setSelected(e.name)}
                aria-pressed={e.name === selected}
                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                  e.name === selected
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-borderline bg-surface-2 text-ink-muted hover:text-ink"
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>

          {view !== "map" ? (
            <div className="mt-3 text-[12px] leading-5 text-ink-muted">
              {view === "causal" ? (
                <>
                  Filled dots are concepts the paper steers with and reports a
                  behavioural effect for. Hollow dots were measured but not
                  causally tested — a reminder that &ldquo;we found a
                  vector&rdquo; and &ldquo;it changes behaviour&rdquo; are
                  separate claims.
                </>
              ) : (
                <>
                  Filled blue: activation rose after post-training. Filled
                  orange: activation fell. The whole cloud drifts toward the
                  low-arousal, low-valence quadrant — the paper also reports
                  rises in vulnerable and falls in exuberant, spiteful,
                  enthusiastic and obstinate.
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-borderline bg-surface-2 p-4">
          <div className="font-mono text-sm font-semibold text-ink">
            {active.name}
          </div>
          <div className="mt-1 text-[12px] text-ink-muted">
            schematic position: valence {active.v > 0 ? "+" : ""}
            {active.v.toFixed(2)}, arousal {active.a > 0 ? "+" : ""}
            {active.a.toFixed(2)}
          </div>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Where it activates
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {active.where}
          </p>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            What steering it does
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {active.steering ??
              "No causal steering result is reported for this vector. It was extracted and measured, but the paper does not claim it moves behaviour."}
          </p>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Post-training
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {active.shift === "up"
              ? "Activation increased from the base model to the post-trained model."
              : active.shift === "down"
                ? "Activation decreased from the base model to the post-trained model."
                : "Not among the concepts with a large reported shift across post-training."}
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
