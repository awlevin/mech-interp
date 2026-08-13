"use client";

import { useEffect, useState } from "react";
import { WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Step-through of a 4-layer transformer's residual stream at one position.
 *
 * The per-step "logit lens" predictions are hand-authored and illustrative:
 * they follow the shape that real logit-lens runs on factual-recall prompts
 * show (nothing early, the answer appearing mid-stack after an MLP, then
 * sharpening), but no model was run to produce them. Module 3.1 has you run
 * the real thing.
 */

const N_LAYERS = 4;

type Step = {
  /** which component just wrote, or null for the initial embedding */
  kind: "embed" | "attn" | "mlp" | "unembed";
  layer: number;
  label: string;
  /** the story of what this component contributed */
  what: string;
  /** L2 norm of this component's write into the stream (arbitrary units) */
  write: number;
  /** hand-authored logit-lens readout after this step */
  top: { token: string; p: number }[];
};

const STEPS: Step[] = [
  {
    kind: "embed",
    layer: -1,
    label: "embed + position",
    what: "The stream starts as the token embedding of “of” plus its positional information. It knows what word it is and where it sits. Nothing else.",
    write: 1.0,
    top: [
      { token: " the", p: 0.12 },
      { token: " a", p: 0.06 },
      { token: " his", p: 0.04 },
    ],
  },
  {
    kind: "attn",
    layer: 0,
    label: "L0 attention",
    what: "Local heads: a previous-token head pulls in “city”, so the stream now encodes the bigram “city of” rather than a bare “of”.",
    write: 0.55,
    top: [
      { token: " the", p: 0.14 },
      { token: " a", p: 0.07 },
      { token: " New", p: 0.03 },
    ],
  },
  {
    kind: "mlp",
    layer: 0,
    label: "L0 MLP",
    what: "Detokenisation work: the MLP turns the raw pair into something more like a concept — “a city name is coming”.",
    write: 0.7,
    top: [
      { token: " the", p: 0.13 },
      { token: " New", p: 0.05 },
      { token: " San", p: 0.04 },
    ],
  },
  {
    kind: "attn",
    layer: 1,
    label: "L1 attention",
    what: "A head reaches back to “Eiffel Tower” and copies the subject into this position. The stream now holds the question and the subject in the same vector.",
    write: 0.8,
    top: [
      { token: " New", p: 0.08 },
      { token: " Paris", p: 0.05 },
      { token: " London", p: 0.04 },
    ],
  },
  {
    kind: "mlp",
    layer: 1,
    label: "L1 MLP",
    what: "The lookup fires. An MLP acting as key-value memory recognises the (Eiffel Tower, located-in) key and writes the Paris value into the stream. This is the step where the answer appears.",
    write: 1.15,
    top: [
      { token: " Paris", p: 0.14 },
      { token: " France", p: 0.06 },
      { token: " London", p: 0.05 },
    ],
  },
  {
    kind: "attn",
    layer: 2,
    label: "L2 attention",
    what: "Later heads mostly copy and amplify what is already there, moving the answer into the directions the unembedding actually reads.",
    write: 0.45,
    top: [
      { token: " Paris", p: 0.22 },
      { token: " London", p: 0.06 },
      { token: " Rome", p: 0.04 },
    ],
  },
  {
    kind: "mlp",
    layer: 2,
    label: "L2 MLP",
    what: "Suppression and cleanup: competing city names get written down as much as Paris gets written up.",
    write: 0.6,
    top: [
      { token: " Paris", p: 0.41 },
      { token: " London", p: 0.05 },
      { token: " Rome", p: 0.03 },
    ],
  },
  {
    kind: "attn",
    layer: 3,
    label: "L3 attention",
    what: "Very little left to route. Late attention layers in real models often contribute small, near-orthogonal corrections.",
    write: 0.25,
    top: [
      { token: " Paris", p: 0.47 },
      { token: " London", p: 0.04 },
      { token: " Rome", p: 0.02 },
    ],
  },
  {
    kind: "mlp",
    layer: 3,
    label: "L3 MLP",
    what: "Final calibration — sharpening the answer and pushing down formatting alternatives.",
    write: 0.5,
    top: [
      { token: " Paris", p: 0.58 },
      { token: " London", p: 0.03 },
      { token: " Rome", p: 0.02 },
    ],
  },
  {
    kind: "unembed",
    layer: 4,
    label: "final LN + unembed",
    what: "LayerNorm rescales the accumulated stream, then the unembedding matrix reads out a logit for every token in the vocabulary.",
    write: 0,
    top: [
      { token: " Paris", p: 0.63 },
      { token: " London", p: 0.03 },
      { token: " Rome", p: 0.02 },
    ],
  },
];

const SEG_COLORS = [
  "var(--text-muted)",
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
];

const W = 660;
const H = 250;
const STREAM_Y = 132;
const STREAM_H = 14;
const X0 = 46;
const X1 = 620;
const LAYER_W = (X1 - X0 - 60) / N_LAYERS;

export function ResidualStreamFlow() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = STEPS[i];

  const atEnd = i >= STEPS.length - 1;
  const running = playing && !atEnd;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 1400);
    return () => clearTimeout(t);
  }, [running, i]);

  const contributions = STEPS.slice(0, i + 1).map((s) => s.write);
  const totalWrite = contributions.reduce((a, b) => a + b, 0);

  const blockX = (layer: number) => X0 + 30 + layer * LAYER_W;

  const activeAttn = step.kind === "attn" ? step.layer : -1;
  const activeMlp = step.kind === "mlp" ? step.layer : -1;
  const progressX =
    step.kind === "embed"
      ? X0
      : step.kind === "unembed"
        ? X1
        : blockX(step.layer) + (step.kind === "mlp" ? LAYER_W * 0.75 : LAYER_W * 0.4);

  return (
    <WidgetShell
      title="The residual stream, one write at a time"
      subtitle="Following a single token position — the final “of” in “The Eiffel Tower is in the city of” — through a 4-layer model. Every sublayer reads the stream, computes, and adds its result back. Nothing is ever overwritten."
      footer={
        <>
          Step {i + 1} of {STEPS.length}:{" "}
          <span className="font-mono text-ink">{step.label}</span>. Total written
          into the stream so far:{" "}
          <span className="font-mono text-ink">{totalWrite.toFixed(2)}</span>{" "}
          (arbitrary units) across{" "}
          <span className="font-mono text-ink">{i + 1}</span> contributions. The
          logit-lens readout is hand-authored and illustrative — it shows the{" "}
          <em>shape</em> real logit-lens runs have on factual recall, not a live
          model.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <WidgetButton onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
          ← Back
        </WidgetButton>
        <WidgetButton
          primary
          onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}
          disabled={i === STEPS.length - 1}
        >
          Step →
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            if (atEnd) {
              setI(0);
              setPlaying(true);
            } else {
              setPlaying((p) => !p);
            }
          }}
        >
          {running ? "Pause" : atEnd ? "Replay" : "Play"}
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setPlaying(false);
            setI(0);
          }}
        >
          Reset
        </WidgetButton>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px]"
          style={{ maxWidth: W }}
          role="img"
          aria-label={`Residual stream diagram with attention blocks above and MLP blocks below; currently highlighting ${step.label}`}
        >
          {/* the stream */}
          <rect x={X0} y={STREAM_Y} width={X1 - X0} height={STREAM_H} rx={7} fill="var(--surface-2)" />
          <rect
            x={X0}
            y={STREAM_Y}
            width={Math.max(0, progressX - X0)}
            height={STREAM_H}
            rx={7}
            fill="var(--series-1)"
            opacity={0.35}
          />
          <text x={X0} y={STREAM_Y + 42} fontSize={11} className="font-mono" fill="var(--text-muted)">
            residual stream — one vector, d_model wide, carried straight through
          </text>
          <text x={X0 - 34} y={STREAM_Y + 11} fontSize={11} className="font-mono" fill="var(--text-muted)">
            x₀
          </text>

          {/* embed marker */}
          <circle
            cx={X0}
            cy={STREAM_Y + STREAM_H / 2}
            r={7}
            fill={step.kind === "embed" ? "var(--series-2)" : "var(--surface-1)"}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
          />

          {Array.from({ length: N_LAYERS }, (_, L) => {
            const x = blockX(L);
            const attnDone = STEPS.findIndex((s) => s.kind === "attn" && s.layer === L) <= i;
            const mlpDone = STEPS.findIndex((s) => s.kind === "mlp" && s.layer === L) <= i;
            const attnActive = activeAttn === L;
            const mlpActive = activeMlp === L;
            return (
              <g key={L}>
                <text
                  x={x + LAYER_W / 2 - 10}
                  y={20}
                  fontSize={10}
                  className="font-mono"
                  fill="var(--text-muted)"
                >
                  layer {L}
                </text>
                {/* attention block above */}
                <rect
                  x={x}
                  y={34}
                  width={LAYER_W - 24}
                  height={38}
                  rx={6}
                  fill={attnActive ? "var(--accent-soft)" : "var(--surface-2)"}
                  stroke={attnActive ? "var(--series-2)" : "var(--border)"}
                  strokeWidth={attnActive ? 2 : 1}
                  opacity={attnDone ? 1 : 0.45}
                />
                <text
                  x={x + (LAYER_W - 24) / 2}
                  y={57}
                  textAnchor="middle"
                  fontSize={11}
                  className="font-mono"
                  fill={attnDone ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  attn
                </text>
                {/* read up, write down */}
                <line
                  x1={x + 12}
                  y1={STREAM_Y}
                  x2={x + 12}
                  y2={72}
                  stroke={attnActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={attnActive ? 2 : 1}
                  strokeDasharray="3 3"
                  opacity={attnDone ? 1 : 0.4}
                />
                <line
                  x1={x + LAYER_W - 36}
                  y1={72}
                  x2={x + LAYER_W - 36}
                  y2={STREAM_Y - 9}
                  stroke={attnActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={attnActive ? 2 : 1}
                  opacity={attnDone ? 1 : 0.4}
                />
                <circle
                  cx={x + LAYER_W - 36}
                  cy={STREAM_Y - 2}
                  r={7}
                  fill="var(--surface-1)"
                  stroke={attnActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={1.5}
                  opacity={attnDone ? 1 : 0.4}
                />
                <text
                  x={x + LAYER_W - 36}
                  y={STREAM_Y + 2}
                  textAnchor="middle"
                  fontSize={10}
                  fill={attnDone ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  +
                </text>

                {/* MLP block below */}
                <rect
                  x={x}
                  y={186}
                  width={LAYER_W - 24}
                  height={38}
                  rx={6}
                  fill={mlpActive ? "var(--accent-soft)" : "var(--surface-2)"}
                  stroke={mlpActive ? "var(--series-2)" : "var(--border)"}
                  strokeWidth={mlpActive ? 2 : 1}
                  opacity={mlpDone ? 1 : 0.45}
                />
                <text
                  x={x + (LAYER_W - 24) / 2}
                  y={209}
                  textAnchor="middle"
                  fontSize={11}
                  className="font-mono"
                  fill={mlpDone ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  MLP
                </text>
                <line
                  x1={x + 12}
                  y1={STREAM_Y + STREAM_H}
                  x2={x + 12}
                  y2={186}
                  stroke={mlpActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={mlpActive ? 2 : 1}
                  strokeDasharray="3 3"
                  opacity={mlpDone ? 1 : 0.4}
                />
                <line
                  x1={x + LAYER_W - 36}
                  y1={186}
                  x2={x + LAYER_W - 36}
                  y2={STREAM_Y + STREAM_H + 9}
                  stroke={mlpActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={mlpActive ? 2 : 1}
                  opacity={mlpDone ? 1 : 0.4}
                />
                <circle
                  cx={x + LAYER_W - 36}
                  cy={STREAM_Y + STREAM_H + 2}
                  r={7}
                  fill="var(--surface-1)"
                  stroke={mlpActive ? "var(--series-2)" : "var(--border-strong)"}
                  strokeWidth={1.5}
                  opacity={mlpDone ? 1 : 0.4}
                />
                <text
                  x={x + LAYER_W - 36}
                  y={STREAM_Y + STREAM_H + 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={mlpDone ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  +
                </text>
              </g>
            );
          })}

          {/* unembed */}
          <rect
            x={X1 - 4}
            y={STREAM_Y - 18}
            width={4}
            height={STREAM_H + 36}
            fill={step.kind === "unembed" ? "var(--series-3)" : "var(--border-strong)"}
          />
          <text
            x={X1 + 6}
            y={STREAM_Y + 11}
            fontSize={10}
            className="font-mono"
            fill={step.kind === "unembed" ? "var(--text-primary)" : "var(--text-muted)"}
          >
            U
          </text>
        </svg>
      </div>

      <p className="mt-4 max-w-2xl text-[14px] leading-6 text-ink-secondary">
        <span className="font-mono text-[13px] text-ink">{step.label}</span> —{" "}
        {step.what}
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-secondary">
            The stream as a sum of writes
          </div>
          <div className="flex h-6 w-full overflow-hidden rounded bg-surface-2">
            {contributions.map((c, n) => (
              <div
                key={n}
                title={STEPS[n].label}
                style={{
                  width: `${(c / Math.max(totalWrite, 1e-6)) * 100}%`,
                  background: SEG_COLORS[n],
                  opacity: n === i ? 1 : 0.55,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[13px] leading-5 text-ink-muted">
            Each segment is one sublayer&apos;s contribution. The final stream is
            literally their sum — which is why you can subtract any one of them
            out and ask what the model would have predicted without it.
          </p>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-secondary">
            Logit lens: decode the stream here
          </div>
          <div className="space-y-1">
            {step.top.map((t) => (
              <div key={t.token} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-right font-mono text-[12px] text-ink-secondary">
                  &ldquo;{t.token}&rdquo;
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${t.p * 100}%`,
                      background: "var(--series-1)",
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[12px] text-ink">
                  {(t.p * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[13px] leading-5 text-ink-muted">
            Apply the final LayerNorm and the unembedding to the{" "}
            <em>partial</em> stream, as if the remaining layers did not exist.
            The answer does not fade in smoothly — it arrives.
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
