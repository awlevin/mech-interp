"use client";

import { useCallback, useRef, useState } from "react";
import {
  SegmentedControl,
  Slider,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";

/**
 * Geometry → attention weights. Drag one query and four keys around a 2-D
 * plane; the widget shows the raw dot products, the divided scores, and the
 * softmax that turns them into a mixture over the keys' values.
 */

type Vec = { x: number; y: number };

const KEY_LABELS = ["store", "Mary", "went", "the"];

const INIT_Q: Vec = { x: 1.7, y: 0.8 };
const INIT_K: Vec[] = [
  { x: 2.3, y: 0.5 },
  { x: 0.5, y: 2.4 },
  { x: -1.9, y: 1.1 },
  { x: -0.9, y: -1.8 },
];

const KEY_COLORS = [
  "var(--series-1)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];

const SIZE = 340;
const ORIGIN = SIZE / 2;
const SCALE = 62; // px per unit
const LIMIT = 2.6; // draggable range in model units

const SCALINGS = [
  { value: "none", label: "none (÷1)", div: 1 },
  { value: "d2", label: "÷√2  (d=2)", div: Math.SQRT2 },
  { value: "d64", label: "÷√64 (d=64)", div: 8 },
] as const;

type ScaleId = (typeof SCALINGS)[number]["value"];

const toPx = (v: Vec) => ({ x: ORIGIN + v.x * SCALE, y: ORIGIN - v.y * SCALE });

function Arrow({
  v,
  color,
  width,
  label,
  dim,
}: {
  v: Vec;
  color: string;
  width: number;
  label: string;
  dim?: boolean;
}) {
  const p = toPx(v);
  const len = Math.hypot(p.x - ORIGIN, p.y - ORIGIN) || 1;
  const ux = (p.x - ORIGIN) / len;
  const uy = (p.y - ORIGIN) / len;
  const tip = { x: p.x, y: p.y };
  const back = { x: p.x - ux * 9, y: p.y - uy * 9 };
  const perp = { x: -uy * 4.5, y: ux * 4.5 };
  return (
    <g opacity={dim ? 0.55 : 1}>
      <line
        x1={ORIGIN}
        y1={ORIGIN}
        x2={back.x}
        y2={back.y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${tip.x},${tip.y} ${back.x + perp.x},${back.y + perp.y} ${back.x - perp.x},${back.y - perp.y}`}
        fill={color}
      />
      <text
        x={p.x + ux * 14}
        y={p.y - uy * 14 + 4}
        textAnchor="middle"
        fontSize={11}
        className="font-mono"
        fill="var(--text-secondary)"
      >
        {label}
      </text>
    </g>
  );
}

export function QKPlayground() {
  const [q, setQ] = useState<Vec>(INIT_Q);
  const [keys, setKeys] = useState<Vec[]>(INIT_K);
  const [scaleId, setScaleId] = useState<ScaleId>("d2");
  const [gain, setGain] = useState(1);
  const [drag, setDrag] = useState<number | null>(null); // -1 = query, 0..3 = key
  const svgRef = useRef<SVGSVGElement | null>(null);

  const div = SCALINGS.find((s) => s.value === scaleId)?.div ?? 1;
  const qEff = { x: q.x * gain, y: q.y * gain };

  const dots = keys.map((k) => qEff.x * k.x + qEff.y * k.y);
  const scores = dots.map((d) => d / div);
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const z = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map((e) => e / z);
  const entropy = -weights.reduce(
    (s, p) => s + (p > 1e-9 ? p * Math.log2(p) : 0),
    0,
  );
  const top = weights.indexOf(Math.max(...weights));

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (drag === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * SIZE;
      const py = ((e.clientY - rect.top) / rect.height) * SIZE;
      const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, v));
      const next = {
        x: clamp((px - ORIGIN) / SCALE),
        y: clamp((ORIGIN - py) / SCALE),
      };
      if (drag === -1) setQ(next);
      else setKeys((prev) => prev.map((k, i) => (i === drag ? next : k)));
    },
    [drag],
  );

  const reset = () => {
    setQ(INIT_Q);
    setKeys(INIT_K);
    setGain(1);
    setScaleId("d2");
  };

  const qPx = toPx(qEff);
  const qLen = Math.hypot(qEff.x, qEff.y) || 1e-6;
  const uq = { x: qEff.x / qLen, y: qEff.y / qLen };

  const gridLines = [-2, -1, 1, 2];

  return (
    <WidgetShell
      title="QK playground: geometry becomes attention"
      subtitle="Drag the orange query and the four keys. The dot product is a projection length — how far a key reaches along the query's direction — and softmax turns those lengths into a mixture. Nothing here is learned; you are the weights."
      footer={
        <>
          Softmax picks{" "}
          <span className="font-mono text-ink">
            &ldquo;{KEY_LABELS[top]}&rdquo;
          </span>{" "}
          with{" "}
          <span className="font-mono text-ink">
            {(weights[top] * 100).toFixed(1)}%
          </span>{" "}
          of the mass; pattern entropy{" "}
          <span className="font-mono text-ink">{entropy.toFixed(2)} bits</span>{" "}
          (2.00 = perfectly flat over four keys). Largest raw dot product{" "}
          <span className="font-mono text-ink">
            {Math.max(...dots).toFixed(2)}
          </span>
          , largest score after dividing{" "}
          <span className="font-mono text-ink">{m.toFixed(2)}</span>.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Divide scores by"
          value={scaleId}
          onChange={setScaleId}
          options={SCALINGS.map((s) => ({ value: s.value, label: s.label }))}
        />
        <div className="w-52">
          <Slider
            label="query length ×"
            value={gain}
            min={0.4}
            max={8}
            step={0.1}
            onChange={setGain}
            format={(v) => `${v.toFixed(1)}×`}
          />
        </div>
        <WidgetButton onClick={reset}>Reset</WidgetButton>
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,340px)_1fr]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[340px] touch-none select-none"
          role="img"
          aria-label="Two-dimensional plane with a draggable query vector and four draggable key vectors"
          onPointerMove={onMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <rect x={0} y={0} width={SIZE} height={SIZE} rx={8} fill="var(--surface-2)" />
          {gridLines.map((g) => (
            <g key={`g${g}`} opacity={0.6}>
              <line
                x1={ORIGIN + g * SCALE}
                y1={0}
                x2={ORIGIN + g * SCALE}
                y2={SIZE}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <line
                x1={0}
                y1={ORIGIN + g * SCALE}
                x2={SIZE}
                y2={ORIGIN + g * SCALE}
                stroke="var(--border)"
                strokeWidth={1}
              />
            </g>
          ))}
          <line x1={0} y1={ORIGIN} x2={SIZE} y2={ORIGIN} stroke="var(--border-strong)" strokeWidth={1.5} />
          <line x1={ORIGIN} y1={0} x2={ORIGIN} y2={SIZE} stroke="var(--border-strong)" strokeWidth={1.5} />

          {/* query direction line, the axis every key is projected onto */}
          <line
            x1={ORIGIN - uq.x * SIZE}
            y1={ORIGIN + uq.y * SIZE}
            x2={ORIGIN + uq.x * SIZE}
            y2={ORIGIN - uq.y * SIZE}
            stroke="var(--series-2)"
            strokeWidth={1}
            strokeDasharray="2 5"
            opacity={0.5}
          />

          {/* projections of each key onto the query direction */}
          {keys.map((k, i) => {
            const proj = (k.x * uq.x + k.y * uq.y);
            const foot = toPx({ x: uq.x * proj, y: uq.y * proj });
            const kp = toPx(k);
            return (
              <line
                key={`proj${i}`}
                x1={kp.x}
                y1={kp.y}
                x2={foot.x}
                y2={foot.y}
                stroke={KEY_COLORS[i]}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.45}
              />
            );
          })}

          {keys.map((k, i) => (
            <Arrow
              key={`k${i}`}
              v={k}
              color={KEY_COLORS[i]}
              width={2}
              label={`k${i + 1}`}
              dim={weights[i] < 0.12}
            />
          ))}
          <Arrow v={qEff} color="var(--series-2)" width={3} label="q" />

          {/* drag handles */}
          {keys.map((k, i) => {
            const p = toPx(k);
            return (
              <circle
                key={`h${i}`}
                cx={p.x}
                cy={p.y}
                r={11}
                fill="transparent"
                stroke={KEY_COLORS[i]}
                strokeWidth={drag === i ? 2 : 0}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  setDrag(i);
                }}
              />
            );
          })}
          <circle
            cx={qPx.x}
            cy={qPx.y}
            r={12}
            fill="transparent"
            stroke="var(--series-2)"
            strokeWidth={drag === -1 ? 2 : 0}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              setDrag(-1);
            }}
          />
        </svg>

        <div className="self-center">
          <div className="mb-2 text-[13px] font-medium text-ink-secondary">
            q·k → score → weight
          </div>
          <div className="space-y-2">
            {KEY_LABELS.map((lab, i) => (
              <div key={lab}>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="font-mono text-ink-secondary">
                    k{i + 1} &ldquo;{lab}&rdquo;
                  </span>
                  <span className="font-mono text-ink-muted">
                    {dots[i].toFixed(2)} ÷ {div.toFixed(2)} ={" "}
                    {scores[i].toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-3 flex-1 overflow-hidden rounded bg-surface-2">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${weights[i] * 100}%`,
                        background: KEY_COLORS[i],
                      }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-[12px] text-ink">
                    {(weights[i] * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-5 text-ink-muted">
            The head returns{" "}
            <span className="font-mono text-ink">
              {weights
                .map((w, i) => `${w.toFixed(2)}·v(${KEY_LABELS[i]})`)
                .join(" + ")}
            </span>
            . That mixture is what gets written back into the residual stream.
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
