"use client";

import { useEffect, useState } from "react";
import { WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Logit lens illustration.
 *
 * IMPORTANT: these numbers are hand-authored, not sampled from a live model.
 * They reproduce the *shape* of the result reported by nostalgebraist (2020)
 * and by Belrose et al.'s tuned-lens paper: the early layers unembed to
 * near-copies of the current token, the middle layers commit to a syntactic
 * category, the answer arrives in a burst around two-thirds depth, and the
 * last layers mostly sharpen a decision that has already been made.
 */

type Layer = {
  /** display name for this residual-stream read-out point */
  name: string;
  /** top-5 (token, probability) under the model's own unembedding */
  top: [string, number][];
  /** probability assigned to the true answer, " Paris" */
  pTarget: number;
  /** rank of " Paris" in the full 50,257-token vocabulary */
  rank: number;
  /** what to notice at this depth */
  note: string;
};

const PROMPT = ["The", " Eiffel", " Tower", " is", " in", " the", " city", " of"];
const TARGET = " Paris";

const LAYERS: Layer[] = [
  {
    name: "embed",
    top: [
      [" of", 0.214],
      [" the", 0.041],
      ["of", 0.029],
      [" Of", 0.018],
      [" a", 0.014],
    ],
    pTarget: 0.00005,
    rank: 4210,
    note: "Before any block runs, the lens is unembedding the raw token embedding of “ of”. GPT-2 ties its embedding and unembedding matrices, so the read-out mostly echoes the input token back. No prediction is happening yet — this is the lens looking at itself.",
  },
  {
    name: "layer 1",
    top: [
      [" of", 0.128],
      [" the", 0.072],
      [" a", 0.031],
      [" all", 0.022],
      [" his", 0.019],
    ],
    pTarget: 0.0002,
    rank: 1130,
    note: "Attention has barely moved anything yet. The echo fades and generic function words rise — the model is starting to answer “what part of speech comes next?”, not “which city?”.",
  },
  {
    name: "layer 2",
    top: [
      [" the", 0.111],
      [" a", 0.048],
      [" all", 0.03],
      [" his", 0.021],
      [" its", 0.017],
    ],
    pTarget: 0.0006,
    rank: 420,
    note: "“of ___” is now firmly a determiner slot. Everything so far is local grammar that needs only a token or two of context.",
  },
  {
    name: "layer 3",
    top: [
      [" the", 0.142],
      [" a", 0.059],
      [" New", 0.012],
      [" his", 0.011],
      [" all", 0.009],
    ],
    pTarget: 0.002,
    rank: 41,
    note: "The first proper noun appears (“ New”, as in New York). The model has noticed the word “city” and is reaching for the space of city names — but not yet for this city.",
  },
  {
    name: "layer 4",
    top: [
      [" the", 0.118],
      [" a", 0.052],
      [" New", 0.021],
      [" London", 0.008],
      [TARGET, 0.006],
    ],
    pTarget: 0.006,
    rank: 5,
    note: "Paris enters the top-5 for the first time, ranked below London and New. Notice how it arrives with company: the category (“big famous city”) is retrieved before the specific answer.",
  },
  {
    name: "layer 5",
    top: [
      [" the", 0.089],
      [" New", 0.031],
      [TARGET, 0.021],
      [" London", 0.018],
      [" Chicago", 0.011],
    ],
    pTarget: 0.021,
    rank: 3,
    note: "Determiners are losing to names. This is the crossover zone — a lens read here would give you a badly calibrated but directionally right answer.",
  },
  {
    name: "layer 6",
    top: [
      [TARGET, 0.065],
      [" the", 0.055],
      [" New", 0.038],
      [" London", 0.029],
      [" Rome", 0.017],
    ],
    pTarget: 0.065,
    rank: 1,
    note: "Paris takes rank 1 — but with only 6.5% of the mass. Rank and probability tell different stories, and papers that report only “the answer is top-1 by layer 6” are hiding this.",
  },
  {
    name: "layer 7",
    top: [
      [TARGET, 0.131],
      [" New", 0.047],
      [" London", 0.039],
      [" the", 0.028],
      [" Rome", 0.021],
    ],
    pTarget: 0.131,
    rank: 1,
    note: "The competitors are all European capitals and famous cities — plausible confusions, not noise. Whatever mechanism fired here retrieved a category and an entity together.",
  },
  {
    name: "layer 8",
    top: [
      [TARGET, 0.284],
      [" London", 0.048],
      [" New", 0.036],
      [" Rome", 0.027],
      [" Lyon", 0.019],
    ],
    pTarget: 0.284,
    rank: 1,
    note: "The big jump. In GPT-2 small this is where mid-depth MLPs have finished their factual look-up and the result is written into the residual stream.",
  },
  {
    name: "layer 9",
    top: [
      [TARGET, 0.452],
      [" London", 0.037],
      [" Rome", 0.022],
      [" Lyon", 0.019],
      [" New", 0.014],
    ],
    pTarget: 0.452,
    rank: 1,
    note: "French cities (Lyon, Marseille) are now the runners-up rather than generic world capitals — the distribution has narrowed to the right country.",
  },
  {
    name: "layer 10",
    top: [
      [TARGET, 0.631],
      [" London", 0.026],
      [" Lyon", 0.015],
      [" Rome", 0.012],
      [" Marseille", 0.009],
    ],
    pTarget: 0.631,
    rank: 1,
    note: "From here on, nothing new is being retrieved. The remaining layers are sharpening a decision that was already made.",
  },
  {
    name: "layer 11",
    top: [
      [TARGET, 0.779],
      [" London", 0.019],
      [" Lyon", 0.011],
      [" Rome", 0.008],
      [" Marseille", 0.006],
    ],
    pTarget: 0.779,
    rank: 1,
    note: "Confidence, not content. This is why “where does the model know X?” and “where does the model say X confidently?” are different questions with different answers.",
  },
  {
    name: "final",
    top: [
      [TARGET, 0.891],
      [" London", 0.012],
      [" Lyon", 0.006],
      [" Rome", 0.004],
      [" Marseille", 0.003],
    ],
    pTarget: 0.891,
    rank: 1,
    note: "The actual output distribution, after the final LayerNorm and unembedding. Every row above it was the same matrix applied to an unfinished residual stream.",
  },
];

const LOG_MIN = -5; // 10^-5

function logY(p: number): number {
  const l = Math.log10(Math.max(p, 1e-5));
  return (l - LOG_MIN) / (0 - LOG_MIN); // 0..1
}

export function LogitLensTable() {
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setSel((s) => Math.min(s + 1, LAYERS.length - 1));
      if (sel >= LAYERS.length - 2) setPlaying(false);
    }, 750);
    return () => window.clearTimeout(id);
  }, [playing, sel]);

  const layer = LAYERS[sel];
  const BAR_W = 300;

  // trace chart geometry
  const TW = 420;
  const TH = 110;
  const tpadL = 34;
  const tpadB = 22;
  const tx = (i: number) =>
    tpadL + (i / (LAYERS.length - 1)) * (TW - tpadL - 10);
  const ty = (p: number) => TH - tpadB - logY(p) * (TH - tpadB - 10);
  const tracePts = LAYERS.map((l, i) => `${tx(i).toFixed(1)},${ty(l.pTarget).toFixed(1)}`).join(" ");

  return (
    <WidgetShell
      title="Logit lens: the prediction crystallizing, layer by layer"
      subtitle={
        <>
          Prompt:{" "}
          <span className="font-mono text-ink">
            {PROMPT.map((t) => t.replace(/^ /, "·")).join("")}
          </span>
          . Click any read-out point to see what the model&apos;s own unembedding
          matrix says about the residual stream at that depth.
        </>
      }
      footer={
        <>
          <strong className="text-ink">Hand-authored illustration.</strong> These
          are not live GPT-2 numbers — they are written to match the shape of the
          published result (echo → grammar → category → answer → sharpening). Run
          the real thing yourself in the problem set; the qualitative story will
          hold, the digits will not.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <WidgetButton onClick={() => setSel((s) => Math.max(0, s - 1))}>
          ◀ Earlier
        </WidgetButton>
        <WidgetButton
          onClick={() => setSel((s) => Math.min(LAYERS.length - 1, s + 1))}
        >
          Later ▶
        </WidgetButton>
        <WidgetButton
          primary
          onClick={() => {
            setSel(0);
            setPlaying(true);
          }}
        >
          Play through depth
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setPlaying(false);
            setSel(0);
          }}
        >
          Reset
        </WidgetButton>
      </div>

      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col gap-1">
          {LAYERS.map((l, i) => (
            <button
              key={l.name}
              type="button"
              onClick={() => {
                setPlaying(false);
                setSel(i);
              }}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[12px] transition-colors ${
                i === sel
                  ? "bg-accent-soft text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <span className="font-mono">{l.name}</span>
              <span className="font-mono tabular-nums">
                {l.top[0][0].replace(/^ /, "·")}
              </span>
            </button>
          ))}
        </div>

        <div>
          <svg
            viewBox={`0 0 ${BAR_W + 130} 150`}
            className="w-full max-w-[430px]"
            role="img"
            aria-label={`Top five predicted tokens at ${layer.name}`}
          >
            {layer.top.map(([tok, p], i) => {
              const y = i * 28;
              const isTarget = tok === TARGET;
              return (
                <g key={tok} transform={`translate(0 ${y})`}>
                  <text
                    x={72}
                    y={15}
                    textAnchor="end"
                    fontSize={12}
                    className="font-mono"
                    fill={
                      isTarget ? "var(--text-primary)" : "var(--text-secondary)"
                    }
                  >
                    {tok.replace(/^ /, "·")}
                  </text>
                  <rect
                    x={80}
                    y={2}
                    width={BAR_W}
                    height={16}
                    rx={3}
                    fill="var(--surface-2)"
                  />
                  <rect
                    x={80}
                    y={2}
                    width={Math.max(p * BAR_W, 1.5)}
                    height={16}
                    rx={3}
                    fill={isTarget ? "var(--series-1)" : "var(--series-3)"}
                  />
                  <text
                    x={80 + BAR_W + 6}
                    y={15}
                    fontSize={12}
                    className="font-mono"
                    fill="var(--text-primary)"
                  >
                    {(p * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="mt-3 text-[13px] leading-6 text-ink-secondary">
            {layer.note}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-borderline pt-4">
        <svg
          viewBox={`0 0 ${TW} ${TH}`}
          className="w-full max-w-[420px]"
          role="img"
          aria-label="Probability assigned to the token Paris at each depth, log scale"
        >
          {[-4, -2, 0].map((e) => {
            const y = TH - tpadB - ((e - LOG_MIN) / 5) * (TH - tpadB - 10);
            return (
              <g key={e}>
                <line
                  x1={tpadL}
                  x2={TW - 10}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={tpadL - 5}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  className="font-mono"
                  fill="var(--text-muted)"
                >
                  {e === 0 ? "1" : `1e${e}`}
                </text>
              </g>
            );
          })}
          <polyline
            points={tracePts}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth={2}
          />
          {LAYERS.map((l, i) => (
            <circle
              key={l.name}
              cx={tx(i)}
              cy={ty(l.pTarget)}
              r={i === sel ? 5 : 2.5}
              fill="var(--series-1)"
              stroke={i === sel ? "var(--text-primary)" : "none"}
              strokeWidth={1.5}
            />
          ))}
          <text
            x={tpadL}
            y={TH - 6}
            fontSize={10}
            className="font-mono"
            fill="var(--text-muted)"
          >
            depth →
          </text>
          <text
            x={TW - 10}
            y={TH - 6}
            textAnchor="end"
            fontSize={10}
            className="font-mono"
            fill="var(--text-muted)"
          >
            P(·Paris)
          </text>
        </svg>
        <div className="mt-2 text-[13px] text-ink-muted">
          At <span className="font-mono text-ink">{layer.name}</span>:{" "}
          <span className="font-mono text-ink">·Paris</span> has probability{" "}
          <span className="font-mono text-ink">
            {(layer.pTarget * 100).toFixed(2)}%
          </span>{" "}
          and rank{" "}
          <span className="font-mono text-ink">{layer.rank}</span> out of 50,257.
        </div>
      </div>
    </WidgetShell>
  );
}
