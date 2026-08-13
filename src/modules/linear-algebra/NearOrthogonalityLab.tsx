"use client";

import { useMemo, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/** Deterministic PRNG so a given seed always redraws the same cloud. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rnd: () => number): number {
  // Box–Muller
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** n unit vectors in R^d, packed into one flat array (row-major). */
function sampleUnitVectors(n: number, d: number, seed: number): Float64Array {
  const rnd = mulberry32(seed);
  const out = new Float64Array(n * d);
  for (let i = 0; i < n; i++) {
    let sq = 0;
    for (let j = 0; j < d; j++) {
      const g = gaussian(rnd);
      out[i * d + j] = g;
      sq += g * g;
    }
    const inv = 1 / Math.sqrt(sq);
    for (let j = 0; j < d; j++) out[i * d + j] *= inv;
  }
  return out;
}

const BINS = 61;

function pairwiseStats(v: Float64Array, n: number, d: number) {
  const hist = new Array<number>(BINS).fill(0);
  let sumSq = 0;
  let maxAbs = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      let dot = 0;
      for (let j = 0; j < d; j++) dot += v[i * d + j] * v[k * d + j];
      const bin = Math.min(BINS - 1, Math.max(0, Math.floor(((dot + 1) / 2) * BINS)));
      hist[bin] += 1;
      sumSq += dot * dot;
      if (Math.abs(dot) > maxAbs) maxAbs = Math.abs(dot);
      pairs += 1;
    }
  }
  return { hist, pairs, rms: Math.sqrt(sumSq / Math.max(pairs, 1)), maxAbs };
}

/** Greedy packing: keep a candidate only if it is ε-orthogonal to everything kept. */
function greedyPack(d: number, eps: number, seed: number, candidates: number) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const kept: Float64Array[] = [];
  const buf = new Float64Array(d);
  for (let c = 0; c < candidates; c++) {
    let sq = 0;
    for (let j = 0; j < d; j++) {
      const g = gaussian(rnd);
      buf[j] = g;
      sq += g * g;
    }
    const inv = 1 / Math.sqrt(sq);
    for (let j = 0; j < d; j++) buf[j] *= inv;
    let ok = true;
    for (let i = 0; i < kept.length && ok; i++) {
      const k = kept[i];
      let dot = 0;
      for (let j = 0; j < d; j++) dot += buf[j] * k[j];
      if (Math.abs(dot) >= eps) ok = false;
    }
    if (ok) kept.push(Float64Array.from(buf));
  }
  return { kept: kept.length, candidates };
}

const W = 500;
const H = 220;
const PAD_L = 34;
const PAD_B = 26;
const PAD_T = 12;

/**
 * The punchline of the module: in high dimensions, independently drawn
 * directions are nearly orthogonal, so a d-dimensional space holds far more
 * than d usable directions. This is the seed of superposition (Module 3.3).
 */
export function NearOrthogonalityLab() {
  const [logD, setLogD] = useState(3); // d = 2^logD
  const [n, setN] = useState(120);
  const [eps, setEps] = useState(0.1);
  const [seed, setSeed] = useState(7);
  const [pack, setPack] = useState<{
    d: number;
    eps: number;
    seed: number;
    kept: number;
    candidates: number;
  } | null>(null);

  const d = 2 ** logD;

  const { hist, pairs, rms, maxAbs } = useMemo(() => {
    const v = sampleUnitVectors(n, d, seed);
    return pairwiseStats(v, n, d);
  }, [n, d, seed]);

  // Analytic density of cos similarity between two random unit vectors in R^d:
  // p(x) ∝ (1 − x²)^((d−3)/2). Normalised numerically against the bin grid.
  const theory = useMemo(() => {
    const raw = new Array<number>(BINS).fill(0);
    let total = 0;
    for (let i = 0; i < BINS; i++) {
      const x = -1 + ((i + 0.5) / BINS) * 2;
      const val = Math.pow(Math.max(1 - x * x, 0), (d - 3) / 2);
      raw[i] = Number.isFinite(val) ? val : 0;
      total += raw[i];
    }
    return raw.map((r) => (total > 0 ? r / total : 0));
  }, [d]);

  const withinEps = useMemo(() => {
    let inside = 0;
    for (let i = 0; i < BINS; i++) {
      const x = -1 + ((i + 0.5) / BINS) * 2;
      if (Math.abs(x) < eps) inside += hist[i];
    }
    return inside / Math.max(pairs, 1);
  }, [hist, pairs, eps]);

  const maxCount = Math.max(...hist, 1);
  const maxTheory = Math.max(...theory, 1e-9);
  const plotW = W - PAD_L - 10;
  const plotH = H - PAD_B - PAD_T;
  const xPx = (x: number) => PAD_L + ((x + 1) / 2) * plotW;
  const yPx = (frac: number) => PAD_T + plotH * (1 - frac);

  const packStale =
    !pack || pack.d !== d || pack.eps !== eps || pack.seed !== seed;

  return (
    <WidgetShell
      title="How crowded can a space get?"
      subtitle="Sample N random unit vectors in d dimensions and histogram every pairwise cosine similarity. Push d up and watch the whole distribution collapse onto zero — random directions become almost orthogonal for free."
      footer={
        <>
          {pairs.toLocaleString()} pairs. Measured spread (RMS cosine){" "}
          <span className="font-mono text-ink">{rms.toFixed(3)}</span> vs the
          theoretical{" "}
          <span className="font-mono text-ink">1/√d = {(1 / Math.sqrt(d)).toFixed(3)}</span>.
          Worst pair in this sample:{" "}
          <span className="font-mono text-ink">|cos| = {maxAbs.toFixed(3)}</span>.
          Fraction of pairs inside ±ε:{" "}
          <span className="font-mono text-ink">{(withinEps * 100).toFixed(1)}%</span>.
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <Slider
            label="dimension d"
            value={logD}
            min={1}
            max={10}
            step={1}
            onChange={setLogD}
            format={() => `${d}`}
          />
          <Slider
            label="vectors N"
            value={n}
            min={20}
            max={200}
            step={10}
            onChange={setN}
            format={(v) => `${v}`}
          />
          <Slider
            label="tolerance ε"
            value={eps}
            min={0.02}
            max={0.5}
            step={0.01}
            onChange={setEps}
            format={(v) => v.toFixed(2)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <WidgetButton onClick={() => setSeed((s) => s + 1)}>Resample</WidgetButton>
            <WidgetButton
              primary
              onClick={() => setPack({ d, eps, seed, ...greedyPack(d, eps, seed, 400) })}
            >
              Pack directions
            </WidgetButton>
          </div>
          <div className="rounded-lg bg-surface-2 p-3 text-[12px] leading-5 text-ink-muted">
            {packStale ? (
              <>
                Greedy packing: draw 400 random directions and keep each one only
                if it stays within ε of orthogonal to <em>everything</em> kept so
                far. Press <span className="text-ink">Pack directions</span> for
                d = {d}, ε = {eps.toFixed(2)}.
              </>
            ) : (
              <>
                Kept{" "}
                <span className="font-mono text-ink">{pack.kept}</span> of{" "}
                {pack.candidates} candidates in{" "}
                <span className="font-mono text-ink">d = {pack.d}</span> at ε ={" "}
                {pack.eps.toFixed(2)} — that is{" "}
                <span className="font-mono text-ink">
                  {(pack.kept / pack.d).toFixed(1)}×
                </span>{" "}
                the number of dimensions
                {pack.kept === pack.candidates
                  ? ", and the sampler never even hit the limit — raise ε or lower d to find the ceiling."
                  : "."}
              </>
            )}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[500px]"
          role="img"
          aria-label={`Histogram of pairwise cosine similarities for ${n} random unit vectors in ${d} dimensions; RMS cosine ${rms.toFixed(3)}`}
        >
          <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface-2)" />
          {[-1, -0.5, 0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={xPx(t)}
                y1={PAD_T}
                x2={xPx(t)}
                y2={PAD_T + plotH}
                stroke="var(--border)"
              />
              <text
                x={xPx(t)}
                y={H - 8}
                fontSize={11}
                textAnchor="middle"
                fill="var(--text-muted)"
                className="font-mono"
              >
                {t}
              </text>
            </g>
          ))}
          {hist.map((count, i) => {
            const x0 = xPx(-1 + (i / BINS) * 2);
            const x1 = xPx(-1 + ((i + 1) / BINS) * 2);
            const h = (count / maxCount) * plotH;
            return (
              <rect
                key={i}
                x={x0 + 0.5}
                y={PAD_T + plotH - h}
                width={Math.max(x1 - x0 - 1, 1)}
                height={h}
                fill="var(--series-1)"
                rx={1}
              />
            );
          })}
          <polyline
            points={theory
              .map((p, i) => `${xPx(-1 + ((i + 0.5) / BINS) * 2)},${yPx(p / maxTheory)}`)
              .join(" ")}
            fill="none"
            stroke="var(--series-2)"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          {[-eps, eps].map((t) => (
            <line
              key={t}
              x1={xPx(t)}
              y1={PAD_T}
              x2={xPx(t)}
              y2={PAD_T + plotH}
              stroke="var(--series-4)"
              strokeWidth={1.5}
            />
          ))}
          <line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={W - 10}
            y2={PAD_T + plotH}
            stroke="var(--border-strong)"
          />
          <text
            x={PAD_L}
            y={PAD_T + 2}
            fontSize={11}
            fill="var(--text-muted)"
            className="font-mono"
          >
            pairs
          </text>
          <text
            x={W - 12}
            y={H - 8}
            fontSize={11}
            textAnchor="end"
            fill="var(--text-muted)"
            className="font-mono"
          >
            cosine similarity →
          </text>
          <text
            x={xPx(eps) + 5}
            y={PAD_T + 12}
            fontSize={11}
            fill="var(--text-muted)"
            className="font-mono"
          >
            ±ε
          </text>
        </svg>
      </div>
    </WidgetShell>
  );
}
