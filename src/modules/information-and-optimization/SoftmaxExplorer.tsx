"use client";

import { useState } from "react";
import { Slider, WidgetShell } from "@/components/widgets";

const TOKENS = ["cat", "dog", "car", "the", "pizza"];
const BASE_LOGITS = [2.1, 1.7, 0.3, -0.4, -1.2];

function softmax(logits: number[], t: number): number[] {
  const scaled = logits.map((l) => l / t);
  const m = Math.max(...scaled);
  const exps = scaled.map((l) => Math.exp(l - m));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

/**
 * Reference widget: raw logits → softmax with a temperature slider.
 * Shows the resulting distribution and its entropy live.
 */
export function SoftmaxExplorer() {
  const [temp, setTemp] = useState(1.0);
  const [logits, setLogits] = useState(BASE_LOGITS);
  const probs = softmax(logits, temp);
  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

  const W = 460;
  const barH = 26;
  const gap = 10;
  const labelW = 52;
  const valueW = 58;
  const plotW = W - labelW - valueW;

  return (
    <WidgetShell
      title="Softmax & temperature"
      subtitle="Drag the logit sliders and the temperature. Watch probability mass concentrate (T→0) or flatten (T→∞)."
      footer={
        <>
          Entropy of this distribution:{" "}
          <span className="font-mono text-ink">{entropy.toFixed(2)} bits</span>
          {" "}(max {Math.log2(TOKENS.length).toFixed(2)} bits when uniform).
          Sampling at T=0 always picks{" "}
          <span className="font-mono text-ink">
            {TOKENS[probs.indexOf(Math.max(...probs))]}
          </span>.
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <Slider
            label="Temperature T"
            value={temp}
            min={0.05}
            max={4}
            step={0.05}
            onChange={setTemp}
            format={(v) => v.toFixed(2)}
          />
          {TOKENS.map((tok, i) => (
            <Slider
              key={tok}
              label={`logit(“${tok}”)`}
              value={logits[i]}
              min={-4}
              max={4}
              step={0.1}
              onChange={(v) =>
                setLogits((prev) => prev.map((x, j) => (j === i ? v : x)))
              }
              format={(v) => v.toFixed(1)}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${TOKENS.length * (barH + gap)}`}
          className="w-full max-w-[460px] self-center"
          role="img"
          aria-label="Softmax probabilities per token"
        >
          {TOKENS.map((tok, i) => {
            const y = i * (barH + gap);
            const w = Math.max(probs[i] * plotW, 2);
            return (
              <g key={tok} transform={`translate(0 ${y})`}>
                <text
                  x={labelW - 8}
                  y={barH / 2 + 4}
                  textAnchor="end"
                  className="font-mono"
                  fontSize={12}
                  fill="var(--text-secondary)"
                >
                  {tok}
                </text>
                <rect
                  x={labelW}
                  y={0}
                  width={plotW}
                  height={barH}
                  rx={4}
                  fill="var(--surface-2)"
                />
                <rect
                  x={labelW}
                  y={0}
                  width={w}
                  height={barH}
                  rx={4}
                  fill="var(--series-1)"
                />
                <text
                  x={labelW + plotW + 6}
                  y={barH / 2 + 4}
                  className="font-mono"
                  fontSize={12}
                  fill="var(--text-primary)"
                >
                  {(probs[i] * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </WidgetShell>
  );
}
