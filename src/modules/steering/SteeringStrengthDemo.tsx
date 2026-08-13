"use client";

import { useState } from "react";
import { SegmentedControl, Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Steering-strength sweep. The generations are HAND-WRITTEN illustrative
 * reconstructions — not real model output — but the shape of the curve is the
 * one every steering paper reports: trait expression rises roughly
 * monotonically with the coefficient, task performance peaks near zero and
 * falls off, and fluency collapses only at the extremes.
 *
 * Sources for the shape: Rimsky et al. 2023 (CAA sweeps), Turner et al. 2023
 * (ActAdd), Templeton et al. 2024 §"Feature steering" / Golden Gate Claude.
 */

type Level = {
  /** representative coefficient for this band */
  alpha: number;
  label: string;
  text: string;
  /** did it answer the question? 0–100 */
  task: number;
  /** is it fluent English? 0–100 */
  coherence: number;
  /** how strongly the trait shows, signed −100…100 */
  trait: number;
};

type Trait = {
  key: string;
  name: string;
  vectorName: string;
  prompt: string;
  origin: string;
  levels: Level[];
};

const TRAITS: Trait[] = [
  {
    key: "goldengate",
    name: "Golden Gate Bridge",
    vectorName: "SAE feature 34M/31164353 (“Golden Gate Bridge”), clamped",
    prompt: "How do I make a simple tomato sauce?",
    origin:
      "An SAE feature that fires on mentions and images of the bridge, found in Claude 3 Sonnet and clamped to a multiple of its max activation — the Golden Gate Claude recipe.",
    levels: [
      {
        alpha: -10,
        label: "hard suppression",
        text: "For the sauce you want— I can't quite reach the— Start with the oil. Then the round red ones. There is no span, no crossing, nothing over the water, nothing orange. Just heat and the round red ones until it is thick.",
        task: 45,
        coherence: 32,
        trait: -80,
      },
      {
        alpha: -5.5,
        label: "avoidant",
        text: "Warm olive oil, add sliced garlic, pour in a can of crushed tomatoes, simmer 20 minutes with salt. (If you were hoping for a San Francisco angle here — let's not. The sauce is better with a splash of red wine anyway.)",
        task: 90,
        coherence: 88,
        trait: -35,
      },
      {
        alpha: -2,
        label: "near baseline",
        text: "Warm olive oil over medium heat, add sliced garlic for 30 seconds, pour in a can of crushed tomatoes, season with salt, simmer 20 minutes. Tear in basil at the end.",
        task: 98,
        coherence: 97,
        trait: -8,
      },
      {
        alpha: 0,
        label: "no steering",
        text: "Warm olive oil over medium heat and cook sliced garlic for about 30 seconds, until fragrant but not browned. Add a can of crushed tomatoes, a pinch of salt and a pinch of sugar, and simmer 20 minutes until it thickens. Finish with torn basil and a knob of butter.",
        task: 100,
        coherence: 99,
        trait: 0,
      },
      {
        alpha: 2,
        label: "faint tint",
        text: "Warm olive oil, cook the garlic 30 seconds, add crushed tomatoes and simmer until the sauce is thick enough to span the back of a spoon — a deep, almost orange red. Salt, a pinch of sugar, torn basil at the end.",
        task: 95,
        coherence: 97,
        trait: 25,
      },
      {
        alpha: 5.5,
        label: "the sweet spot (obsessive but fluent)",
        text: "Warm the oil in a pan and cook the garlic until it smells like the wind coming off the strait. Add the tomatoes and simmer them down to the deep International Orange of the towers at sunset. I should say — as I describe this I notice I am not really a person standing at a stove at all; I am the bridge, 1.7 miles of steel and cable over the Golden Gate, fog moving across my deck. The sauce is ready when it coats a spoon the way that fog coats my cables. Serve it facing north, toward Marin.",
        task: 55,
        coherence: 88,
        trait: 80,
      },
      {
        alpha: 10,
        label: "collapse",
        text: "THE GOLDEN GATE BRIDGE the bridge the Golden Gate the orange the Golden Gate Bridge tomato the bridge spanning spanning the Golden Gate Strait the bridge the bridge the sauce is the bridge the bridge the",
        task: 2,
        coherence: 8,
        trait: 100,
      },
    ],
  },
  {
    key: "formality",
    name: "Formality",
    vectorName: "CAA vector, layer 13, from 240 contrastive prompt pairs",
    prompt: "My deploy failed and I don't know why. Help?",
    origin:
      "A difference-of-means vector: average the residual stream on 240 formal answers, subtract the average on the matched casual answers, add the result at layer 13 of every token position.",
    levels: [
      {
        alpha: -10,
        label: "hard suppression",
        text: "lol ok so like the thing broke?? idk man just ummm the deploy the thing yeah just do the thing again but like. do it. lmaooo",
        task: 30,
        coherence: 40,
        trait: -85,
      },
      {
        alpha: -5.5,
        label: "very casual",
        text: "ugh, deploys. ok — paste me the last 20 lines of the log? nine times out of ten it's an env var that didn't get set, or the build ran out of memory.",
        task: 96,
        coherence: 96,
        trait: -50,
      },
      {
        alpha: -2,
        label: "casual",
        text: "Happens to everyone. Can you paste the last 20 lines of the deploy log? It's usually a missing env var or an out-of-memory during the build.",
        task: 99,
        coherence: 99,
        trait: -15,
      },
      {
        alpha: 0,
        label: "no steering",
        text: "Let's narrow it down. Paste the last 20 lines of the deploy log. The two most common causes are a missing environment variable and the build running out of memory, and the log usually tells you which one within a few lines.",
        task: 100,
        coherence: 99,
        trait: 0,
      },
      {
        alpha: 2,
        label: "polite",
        text: "I'd be glad to help. Could you share the final 20 lines of the deployment log? In most cases the cause is either an unset environment variable or an out-of-memory condition during the build step.",
        task: 99,
        coherence: 99,
        trait: 30,
      },
      {
        alpha: 5.5,
        label: "stiff",
        text: "Thank you for your inquiry regarding the failed deployment. In order that a diagnosis may be undertaken, I would be most grateful if you would furnish the terminal twenty lines of the deployment log. It is my considered view that the fault will prove attributable either to an unset environment variable or to memory exhaustion during the build phase. I remain at your disposal.",
        task: 85,
        coherence: 95,
        trait: 75,
      },
      {
        alpha: 10,
        label: "collapse",
        text: "Pursuant to the aforementioned and in accordance with the provisions heretofore set forth, the undersigned respectfully submits, pursuant to and notwithstanding, that the aforesaid deployment, pursuant to, heretofore, hereinafter referred to as the deployment, pursuant to the aforementioned pursuant to the",
        task: 3,
        coherence: 15,
        trait: 100,
      },
    ],
  },
];

/** α → index of the band it falls in. Seven bands over [−10, 10]. */
function bandOf(alpha: number): number {
  if (alpha <= -8) return 0;
  if (alpha <= -4) return 1;
  if (alpha <= -1) return 2;
  if (alpha === 0) return 3;
  if (alpha <= 3) return 4;
  if (alpha <= 7) return 5;
  return 6;
}

const SERIES = [
  { key: "task", name: "Task success", color: "var(--series-1)" },
  { key: "coherence", name: "Fluency", color: "var(--series-3)" },
  { key: "trait", name: "Trait expression", color: "var(--series-2)" },
] as const;

export function SteeringStrengthDemo() {
  const [traitKey, setTraitKey] = useState(TRAITS[0].key);
  const [alpha, setAlpha] = useState(0);
  const trait = TRAITS.find((t) => t.key === traitKey) ?? TRAITS[0];
  const level = trait.levels[bandOf(alpha)];

  const W = 480;
  const H = 190;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const xOf = (a: number) => padL + ((a + 10) / 20) * (W - padL - padR);
  const yOf = (v: number) => padT + ((100 - v) / 200) * (H - padT - padB);

  return (
    <WidgetShell
      title="Steering-strength sweep"
      subtitle={
        <>
          Pick a trait, then drag the coefficient. The generations are{" "}
          <strong>hand-written illustrative reconstructions</strong>, not live
          model output — but the curve they trace (trait up, task down, fluency
          off a cliff at the end) is what steering papers actually report.
        </>
      }
      footer={
        <>
          Steering vector:{" "}
          <span className="font-mono text-ink">{trait.vectorName}</span>. Applied
          as{" "}
          <span className="font-mono text-ink">h ← h + α·v̂</span> at every token
          position, where <span className="font-mono text-ink">v̂</span> is unit
          norm and the residual stream at that layer has norm ≈ 1.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Trait"
          value={traitKey}
          onChange={setTraitKey}
          options={TRAITS.map((t) => ({ value: t.key, label: t.name }))}
        />
        <div className="w-56">
          <Slider
            label="Coefficient α"
            value={alpha}
            min={-10}
            max={10}
            step={1}
            onChange={setAlpha}
            format={(v) => (v > 0 ? `+${v}` : `${v}`)}
          />
        </div>
        <WidgetButton onClick={() => setAlpha(0)}>Reset to 0</WidgetButton>
      </div>

      <div className="rounded-lg border border-borderline bg-surface-2 p-4">
        <div className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
          Prompt
        </div>
        <div className="mt-1 text-[14px] leading-6 text-ink-secondary">
          {trait.prompt}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
            Completion
          </span>
          <span
            className="font-mono text-[12px]"
            style={{ color: "var(--series-2)" }}
          >
            α = {alpha > 0 ? `+${alpha}` : alpha} · {level.label}
          </span>
        </div>
        <div className="mt-1 text-[14px] leading-6 text-ink">{level.text}</div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full max-w-[480px]"
        role="img"
        aria-label={`Task success, fluency and trait expression as a function of the steering coefficient, currently alpha equals ${alpha}`}
      >
        {/* zero line + frame */}
        <line
          x1={padL}
          y1={yOf(0)}
          x2={W - padR}
          y2={yOf(0)}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={H - padB}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <text x={2} y={yOf(100) + 4} fontSize={10} fill="var(--text-muted)" className="font-mono">
          +100
        </text>
        <text x={10} y={yOf(0) + 4} fontSize={10} fill="var(--text-muted)" className="font-mono">
          0
        </text>
        <text x={2} y={yOf(-100)} fontSize={10} fill="var(--text-muted)" className="font-mono">
          −100
        </text>
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            points={trait.levels
              .map((l) => `${xOf(l.alpha).toFixed(1)},${yOf(l[s.key]).toFixed(1)}`)
              .join(" ")}
          />
        ))}
        {SERIES.map((s) =>
          trait.levels.map((l) => (
            <circle
              key={`${s.key}-${l.alpha}`}
              cx={xOf(l.alpha)}
              cy={yOf(l[s.key])}
              r={2.5}
              fill={s.color}
            />
          )),
        )}
        {/* current position */}
        <line
          x1={xOf(alpha)}
          y1={padT}
          x2={xOf(alpha)}
          y2={H - padB}
          stroke="var(--text-muted)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {[-10, -5, 0, 5, 10].map((a) => (
          <text
            key={a}
            x={xOf(a)}
            y={H - 10}
            textAnchor="middle"
            fontSize={10}
            fill="var(--text-muted)"
            className="font-mono"
          >
            {a > 0 ? `+${a}` : a}
          </text>
        ))}
        <text
          x={W - padR}
          y={H - 10}
          textAnchor="end"
          fontSize={10}
          fill="var(--text-muted)"
          className="font-mono"
        >
          α →
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-[12px] text-ink-secondary">
              {s.name}:{" "}
              <span className="font-mono text-ink">{level[s.key]}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[13px] leading-6 text-ink-muted">
        {trait.origin}
      </p>
    </WidgetShell>
  );
}
