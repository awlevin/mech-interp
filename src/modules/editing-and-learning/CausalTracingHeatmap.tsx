"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

/**
 * Causal-tracing heatmap, hand-authored to match the qualitative result in
 * ROME (Meng et al. 2022): corrupt the subject tokens, then restore one
 * hidden state at a time and measure how much of the correct answer's
 * probability comes back.
 *
 * The two sites the paper reports are reproduced here: an EARLY site at the
 * last subject token in early-to-middle layers (dominated by MLPs), and a
 * LATE site at the final token in late layers (dominated by attention).
 *
 * Numbers are illustrative, not copied from the paper's tables.
 */

const TOKENS = ["The", "Eiffel", "Tower", "is", "located", "in"];
const N_LAYERS = 48;
const P_CLEAN = 0.73;
const P_CORRUPT = 0.05;

type Mode = "hidden" | "mlp" | "attn";

const MODE_INFO: Record<Mode, { label: string; blurb: string }> = {
  hidden: {
    label: "Hidden state",
    blurb:
      "Restore the whole residual stream at one (layer, token). Two hot regions appear: the last subject token early on, and the final token late. Something decisive happens at the subject before the model has even read the relation.",
  },
  mlp: {
    label: "MLP only",
    blurb:
      "Restore only the MLP outputs (a short window of layers). The early site survives almost intact and the late site nearly vanishes — this is ROME's central evidence that the factual association is stored in mid-layer MLP weights at the subject.",
  },
  attn: {
    label: "Attention only",
    blurb:
      "Restore only the attention outputs. Now the late site dominates. Attention's job here is transport: at the last token, in late layers, it fetches what the MLPs already assembled at the subject and moves it to where the prediction is made.",
  },
};

const gauss = (x: number, mu: number, sigma: number) =>
  Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Fraction of the clean–corrupt probability gap recovered, in [0, 1]. */
function effect(mode: Mode, layer: number, pos: number): number {
  const lastSubject = pos === 2;
  const firstSubject = pos === 1;
  const lastToken = pos === TOKENS.length - 1;
  let v = 0.02;

  if (mode === "hidden") {
    if (lastSubject) v += 0.62 * gauss(layer, 7, 6.5);
    if (firstSubject) v += 0.24 * gauss(layer, 6, 5);
    if (lastToken) v += 0.55 * sigmoid((layer - 33) / 3.2) * (1 - 0.25 * gauss(layer, 47, 3));
    if (pos === 3 || pos === 4) v += 0.06 * gauss(layer, 5, 5);
    if (pos === 0) v += 0.01;
  } else if (mode === "mlp") {
    if (lastSubject) v += 0.58 * gauss(layer, 6, 4.6);
    if (firstSubject) v += 0.19 * gauss(layer, 5, 4);
    if (lastToken) v += 0.1 * sigmoid((layer - 36) / 3);
    if (pos === 3 || pos === 4) v += 0.04 * gauss(layer, 5, 4);
  } else {
    if (lastToken) v += 0.5 * sigmoid((layer - 34) / 3);
    if (lastSubject) v += 0.13 * gauss(layer, 11, 5);
    if (pos === 4) v += 0.05 * gauss(layer, 30, 6);
  }
  return Math.max(0, Math.min(1, v));
}

function interpret(mode: Mode, layer: number, pos: number, v: number): string {
  if (v < 0.12)
    return "Restoring here recovers almost nothing. Whatever this state carries, the answer does not depend on it.";
  if (pos === 2 && layer < 22)
    return mode === "attn"
      ? "A modest effect: attention at the subject in middle layers helps assemble the subject representation, but it is not where the association is stored."
      : "The early site. Restoring this one state brings back most of the answer — the model has already looked up “which city” at the subject token, long before it reads “located in”.";
  if (pos === TOKENS.length - 1 && layer > 28)
    return mode === "mlp"
      ? "Weak — restoring MLPs at the last token does little. The late site is attention's work, not the MLPs'."
      : "The late site. Here the model is retrieving the already-computed answer and moving it into position for the prediction.";
  if (pos === 1)
    return "The first subject token carries part of the subject representation, so it has a real but smaller effect than the last subject token, where the subject is complete.";
  return "A moderate effect. Between the two sites the signal is spread thin — no single state here is load-bearing.";
}

export function CausalTracingHeatmap() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [sel, setSel] = useState<{ layer: number; pos: number }>({
    layer: 6,
    pos: 2,
  });

  const grid = useMemo(() => {
    const rows: number[][] = [];
    for (let p = 0; p < TOKENS.length; p++) {
      const row: number[] = [];
      for (let l = 0; l < N_LAYERS; l++) row.push(effect(mode, l, p));
      rows.push(row);
    }
    return rows;
  }, [mode]);

  const selV = grid[sel.pos][sel.layer];
  const pRestored = P_CORRUPT + selV * (P_CLEAN - P_CORRUPT);

  const labelW = 62;
  const cellW = 8.4;
  const cellH = 22;
  const W = labelW + N_LAYERS * cellW + 6;
  const H = TOKENS.length * cellH + 26;

  return (
    <WidgetShell
      title="Causal tracing: where does “Paris” live?"
      subtitle={
        <>
          Corrupt the subject tokens with noise and p(<em>Paris</em>) collapses
          from {P_CLEAN.toFixed(2)} to {P_CORRUPT.toFixed(2)}. Now restore one
          clean hidden state at a time and see how much comes back. Click any
          cell. Hand-authored to match ROME&apos;s qualitative result on
          GPT-2 XL, not copied from its tables.
        </>
      }
      footer={<>{MODE_INFO[mode].blurb}</>}
    >
      <div className="mb-4">
        <SegmentedControl<Mode>
          label="Restore which component?"
          value={mode}
          onChange={setMode}
          options={(Object.keys(MODE_INFO) as Mode[]).map((m) => ({
            value: m,
            label: MODE_INFO[m].label,
          }))}
        />
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[420px] max-w-[520px]"
          role="img"
          aria-label="Heatmap of causal effect by layer and token position for the prompt The Eiffel Tower is located in"
        >
          {TOKENS.map((tok, p) => (
            <text
              key={tok}
              x={labelW - 8}
              y={p * cellH + cellH / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fill={p === sel.pos ? "var(--text-primary)" : "var(--text-secondary)"}
              className="font-mono"
            >
              {tok}
            </text>
          ))}
          {grid.map((row, p) =>
            row.map((v, l) => {
              const isSel = sel.pos === p && sel.layer === l;
              return (
                <rect
                  key={`${p}-${l}`}
                  x={labelW + l * cellW}
                  y={p * cellH + 2}
                  width={cellW - 0.6}
                  height={cellH - 4}
                  fill="var(--series-1)"
                  fillOpacity={0.06 + 0.94 * v}
                  stroke={isSel ? "var(--text-primary)" : "none"}
                  strokeWidth={1.5}
                  onMouseEnter={() => setSel({ layer: l, pos: p })}
                  onClick={() => setSel({ layer: l, pos: p })}
                  style={{ cursor: "pointer" }}
                />
              );
            }),
          )}
          {[0, 12, 24, 36, 47].map((l) => (
            <text
              key={l}
              x={labelW + l * cellW + cellW / 2}
              y={H - 10}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              {l}
            </text>
          ))}
          <text
            x={labelW}
            y={H - 10}
            textAnchor="start"
            fontSize={10}
            fill="var(--text-muted)"
            className="font-mono"
            dx={-52}
          >
            layer
          </text>
        </svg>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-[11px] text-ink-muted">recovers nothing</span>
        <svg
          viewBox="0 0 100 8"
          className="h-2 w-32"
          role="img"
          aria-label="Colour scale from no recovery to full recovery"
        >
          {Array.from({ length: 20 }, (_, i) => (
            <rect
              key={i}
              x={i * 5}
              y={0}
              width={5}
              height={8}
              fill="var(--series-1)"
              fillOpacity={0.06 + 0.94 * (i / 19)}
            />
          ))}
        </svg>
        <span className="text-[11px] text-ink-muted">recovers the answer</span>
      </div>

      <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-3">
        <div className="font-mono text-[12px] text-ink">
          layer {sel.layer} · token{" "}
          <span style={{ color: "var(--series-1)" }}>
            &ldquo;{TOKENS[sel.pos]}&rdquo;
          </span>{" "}
          · effect {(selV * 100).toFixed(0)}% · p(Paris) restored to{" "}
          {pRestored.toFixed(2)}
        </div>
        <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
          {interpret(mode, sel.layer, sel.pos, selV)}
        </p>
      </div>
    </WidgetShell>
  );
}
