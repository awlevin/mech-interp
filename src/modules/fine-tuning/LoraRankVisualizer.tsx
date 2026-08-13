"use client";

import { useState } from "react";
import { SegmentedControl, Slider, WidgetShell } from "@/components/widgets";

const N = 8; // matrices are N x N

/* ------------------------------------------------------------------ */
/* Target patterns                                                     */
/* ------------------------------------------------------------------ */

function build(fn: (i: number, j: number) => number): number[][] {
  return Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => fn(i, j)),
  );
}

/** Deterministic pseudo-random in [-1, 1] — a linear congruential generator. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}
const rand = lcg(20240521);
const NOISE = build(() => rand());

/** Two hand-picked outer products: an exactly rank-2 update. */
const TWO_FEAT = build((i, j) => {
  const u1 = Math.sin((Math.PI * (i + 1)) / (N + 1));
  const v1 = 1 - j / (N - 1);
  const u2 = i % 2 === 0 ? 1 : -1;
  const v2 = Math.cos((Math.PI * j) / (N - 1));
  return 1.6 * u1 * v1 + 0.8 * u2 * v2;
});

/** Anisotropic (non-separable) 2-D bump. */
const blob = (
  i: number,
  j: number,
  ci: number,
  cj: number,
  a: number,
  b: number,
  c: number,
) => Math.exp(-(a * (i - ci) ** 2 + b * (j - cj) ** 2 + c * (i - ci) * (j - cj)) / 4);

const PATTERNS = {
  twofeat: {
    label: "Rank 2",
    blurb:
      "Built as the sum of exactly two outer products, so its third singular value onward is exactly zero. Rank 2 reconstructs it perfectly and rank 3 buys nothing. This is the idealised case LoRA's story is told with.",
    W: TWO_FEAT,
  },
  noisy: {
    label: "Rank 2 + noise",
    blurb:
      "The same two directions plus small independent noise — the realistic case. Two big singular values and a low tail: rank 2 removes ~86% of the error, and every rank after that chips away slowly at noise you probably didn't want to fit anyway.",
    W: build((i, j) => TWO_FEAT[i][j] + 0.3 * NOISE[i][j]),
  },
  smooth: {
    label: "Smooth",
    blurb:
      "Two tilted blobs. Not exactly low rank — every singular value is nonzero — but the spectrum decays fast enough that three directions leave about 1% error. Smoothness and low rank are closely related, which is why natural structure compresses well and noise does not.",
    W: build(
      (i, j) =>
        1.2 * blob(i, j, 2.2, 4.8, 0.6, 0.6, 0.5) -
        0.9 * blob(i, j, 5.5, 2.0, 0.5, 0.5, -0.4),
    ),
  },
  diagonal: {
    label: "Diagonal",
    blurb:
      "A centred identity: seven equal singular values. Every direction matters exactly as much as every other, so low rank buys almost nothing — you need r = 7 of 8 for an exact fit. This is the worst case for LoRA, and the honest reminder that the method is a bet about structure, not a free lunch.",
    W: build((i, j) => (i === j ? 1 : 0) - 1 / N),
  },
} as const;

type PatternKey = keyof typeof PATTERNS;

/* ------------------------------------------------------------------ */
/* One-sided Jacobi SVD — exact for 8x8, deterministic, no deps        */
/* ------------------------------------------------------------------ */

type Svd = { s: number[]; u: number[][]; v: number[][] };

function svd(Ain: number[][]): Svd {
  const m = Ain.length;
  const n = Ain[0].length;
  const U = Ain.map((r) => r.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let sweep = 0; sweep < 40; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let alpha = 0;
        let beta = 0;
        let gamma = 0;
        for (let i = 0; i < m; i++) {
          alpha += U[i][p] * U[i][p];
          beta += U[i][q] * U[i][q];
          gamma += U[i][p] * U[i][q];
        }
        if (Math.abs(gamma) < 1e-14) continue;
        off += gamma * gamma;
        const zeta = (beta - alpha) / (2 * gamma);
        const sgn = zeta >= 0 ? 1 : -1;
        const t = sgn / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let i = 0; i < m; i++) {
          const a = U[i][p];
          const b = U[i][q];
          U[i][p] = c * a - s * b;
          U[i][q] = s * a + c * b;
        }
        for (let i = 0; i < n; i++) {
          const a = V[i][p];
          const b = V[i][q];
          V[i][p] = c * a - s * b;
          V[i][q] = s * a + c * b;
        }
      }
    }
    if (off < 1e-26) break;
  }

  const norms = Array.from({ length: n }, (_, j) => {
    let t = 0;
    for (let i = 0; i < m; i++) t += U[i][j] * U[i][j];
    return Math.sqrt(t);
  });
  const order = Array.from({ length: n }, (_, j) => j).sort(
    (a, b) => norms[b] - norms[a],
  );
  return {
    s: order.map((j) => norms[j]),
    u: Array.from({ length: m }, (_, i) =>
      order.map((j) => (norms[j] > 1e-12 ? U[i][j] / norms[j] : 0)),
    ),
    v: Array.from({ length: n }, (_, i) => order.map((j) => V[i][j])),
  };
}

function rankApprox(d: Svd, r: number): number[][] {
  return Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => {
      let t = 0;
      for (let k = 0; k < r; k++) t += d.s[k] * d.u[i][k] * d.v[j][k];
      return t;
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const CELL = 24;
const GRID = N * CELL;

function Heatmap({
  M,
  scale,
  title,
  label,
}: {
  M: number[][];
  scale: number;
  title: string;
  label: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-medium text-ink-secondary">
        {title}
      </div>
      <svg
        viewBox={`0 0 ${GRID} ${GRID}`}
        className="w-full max-w-[196px]"
        role="img"
        aria-label={label}
      >
        {M.map((row, i) =>
          row.map((v, j) => {
            const mag = Math.min(Math.abs(v) / scale, 1);
            return (
              <rect
                key={`${i}-${j}`}
                x={j * CELL}
                y={i * CELL}
                width={CELL - 1}
                height={CELL - 1}
                rx={2}
                fill={v >= 0 ? "var(--series-2)" : "var(--series-1)"}
                opacity={0.06 + 0.94 * mag}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

const REAL_D = 4096;

export function LoraRankVisualizer() {
  const [pattern, setPattern] = useState<PatternKey>("noisy");
  const [r, setR] = useState(2);

  const W: number[][] = PATTERNS[pattern].W;
  const d = svd(W);
  const approx = rankApprox(d, r);

  const scale = Math.max(...W.flat().map(Math.abs));
  const residual = W.map((row, i) => row.map((v, j) => v - approx[i][j]));

  const total = d.s.reduce((a, x) => a + x * x, 0);
  const kept = d.s.slice(0, r).reduce((a, x) => a + x * x, 0);
  const relErr = Math.sqrt(Math.max(0, 1 - kept / total));

  const toyLoRA = r * (N + N);
  const toyFull = N * N;
  const realLoRA = r * (REAL_D + REAL_D);
  const realFull = REAL_D * REAL_D;

  const sMax = d.s[0];
  const SW = 420;
  const SH = 96;
  const barW = SW / N - 8;

  return (
    <WidgetShell
      title="LoRA rank visualizer"
      subtitle={
        <>
          A target weight update <span className="font-mono">ΔW</span> (8×8) and
          the best rank-<span className="font-mono">r</span> approximation{" "}
          <span className="font-mono">BA</span> to it. Move the rank slider and
          watch the residual empty out — or refuse to.
        </>
      }
      footer={
        <>
          Rank <span className="font-mono text-ink">r = {r}</span> keeps{" "}
          <span className="font-mono text-ink">
            {((1 - relErr * relErr) * 100).toFixed(1)}%
          </span>{" "}
          of the squared Frobenius norm; relative reconstruction error{" "}
          <span className="font-mono text-ink">
            {(relErr * 100).toFixed(1)}%
          </span>
          .
          <br />
          Parameters at this toy size:{" "}
          <span className="font-mono text-ink">
            r(m+n) = {toyLoRA}
          </span>{" "}
          vs <span className="font-mono text-ink">mn = {toyFull}</span> —{" "}
          {toyLoRA < toyFull
            ? `${((toyLoRA / toyFull) * 100).toFixed(0)}% of full`
            : "no saving at all"}
          . At a realistic{" "}
          <span className="font-mono text-ink">
            {REAL_D}×{REAL_D}
          </span>{" "}
          projection:{" "}
          <span className="font-mono text-ink">
            {(realLoRA / 1000).toFixed(0)}K
          </span>{" "}
          vs{" "}
          <span className="font-mono text-ink">
            {(realFull / 1e6).toFixed(1)}M
          </span>{" "}
          —{" "}
          <span className="font-mono text-ink">
            {((realLoRA / realFull) * 100).toFixed(2)}%
          </span>
          . The saving is a story about large <span className="font-mono">d</span>
          , not about small matrices.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Target pattern ΔW"
          value={pattern}
          onChange={(v) => setPattern(v)}
          options={(Object.keys(PATTERNS) as PatternKey[]).map((k) => ({
            value: k,
            label: PATTERNS[k].label,
          }))}
        />
        <div className="w-52">
          <Slider
            label="Rank r"
            value={r}
            min={1}
            max={N}
            step={1}
            onChange={setR}
            format={(v) => `${v} / ${N}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Heatmap
          M={W}
          scale={scale}
          title="Target ΔW"
          label={`Eight by eight heatmap of the target weight update, pattern: ${PATTERNS[pattern].label}`}
        />
        <Heatmap
          M={approx}
          scale={scale}
          title={`Rank-${r} approximation BA`}
          label={`Eight by eight heatmap of the best rank ${r} approximation to the target`}
        />
        <Heatmap
          M={residual}
          scale={scale}
          title="Residual ΔW − BA"
          label={`Eight by eight heatmap of what the rank ${r} approximation fails to capture; relative error ${(relErr * 100).toFixed(0)} percent`}
        />
      </div>

      <div className="mt-5">
        <div className="mb-1 text-[12px] font-medium text-ink-secondary">
          Singular values (the spectrum LoRA is betting on)
        </div>
        <svg
          viewBox={`0 0 ${SW} ${SH}`}
          className="w-full max-w-[420px]"
          role="img"
          aria-label={`Bar chart of the eight singular values of the target matrix; the first ${r} are kept by the rank-${r} approximation`}
        >
          <line
            x1={0}
            x2={SW}
            y1={SH - 18}
            y2={SH - 18}
            stroke="var(--border)"
            strokeWidth={1}
          />
          {d.s.map((v, k) => {
            const h = Math.max((v / sMax) * (SH - 30), 1);
            return (
              <g key={k}>
                <rect
                  x={k * (SW / N) + 4}
                  y={SH - 18 - h}
                  width={barW}
                  height={h}
                  rx={2}
                  fill={k < r ? "var(--series-3)" : "var(--surface-2)"}
                  stroke={k < r ? "none" : "var(--border)"}
                  strokeWidth={1}
                />
                <text
                  x={k * (SW / N) + 4 + barW / 2}
                  y={SH - 5}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                  className="font-mono"
                >
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-[12px] leading-5 text-ink-muted">
        <strong className="text-ink-secondary">
          {PATTERNS[pattern].label}:
        </strong>{" "}
        {PATTERNS[pattern].blurb} Colours: orange positive, blue negative,
        opacity by magnitude — all three panels share one scale.
      </p>
    </WidgetShell>
  );
}
