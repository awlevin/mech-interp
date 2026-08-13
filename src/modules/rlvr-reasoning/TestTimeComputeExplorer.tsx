"use client";

import { useMemo, useState } from "react";
import { Slider, WidgetShell } from "@/components/widgets";

/**
 * Test-time compute: what do you get for N samples?
 *
 * Simulation model (deliberately simple, and stated in the caption so nobody
 * mistakes it for benchmark data):
 *   - each independent sample is correct with probability p
 *   - a wrong sample lands on one of `m` distinct wrong answers, uniformly
 *   - a verifier scores every sample: correct ~ N(1, σ²), wrong ~ N(0, σ²),
 *     where σ is set so that P(verifier ranks a correct sample above a given
 *     wrong one) equals the "verifier quality" slider q
 *
 * Four strategies are then compared at each budget N:
 *   pass@N (an oracle that knows which sample is right) — the ceiling
 *   best-of-N under the verifier
 *   majority vote (self-consistency), which needs no verifier at all
 *   a single sample
 */

const N_VALUES = [1, 2, 4, 8, 16, 32, 64, 128];
const TRIALS = 900;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Abramowitz & Stegun 7.1.26 */
function erf(x: number): number {
  const s = Math.sign(x);
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-z * z);
  return s * y;
}
const Phi = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

/** Verifier noise σ such that P(correct scores above wrong) = q. */
function sigmaForQuality(q: number): number {
  if (q <= 0.505) return 60;
  let lo = 0;
  let hi = 6;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (Phi(mid) < q) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return Math.min(60, 1 / (t * Math.SQRT2));
}

type Curves = { oracle: number[]; verifier: number[]; majority: number[]; single: number[] };

function simulate(p: number, q: number, m: number): Curves {
  const sigma = sigmaForQuality(q);
  const rnd = mulberry32(20240712);
  const gauss = () => {
    const u = Math.max(1e-12, rnd());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };

  const maxN = N_VALUES[N_VALUES.length - 1];
  const verifierHits = N_VALUES.map(() => 0);
  const majorityHits = N_VALUES.map(() => 0);

  const answer = new Int32Array(maxN);
  const score = new Float64Array(maxN);
  const counts = new Int32Array(m + 1);

  for (let t = 0; t < TRIALS; t++) {
    for (let i = 0; i < maxN; i++) {
      const correct = rnd() < p;
      answer[i] = correct ? 0 : 1 + Math.floor(rnd() * m);
      score[i] = (correct ? 1 : 0) + sigma * gauss();
    }
    N_VALUES.forEach((n, ni) => {
      // best-of-N under the verifier
      let best = 0;
      for (let i = 1; i < n; i++) if (score[i] > score[best]) best = i;
      if (answer[best] === 0) verifierHits[ni] += 1;

      // majority vote, ties broken uniformly at random
      counts.fill(0);
      for (let i = 0; i < n; i++) counts[answer[i]] += 1;
      let top = 0;
      let tied = 1;
      for (let a = 1; a <= m; a++) {
        if (counts[a] > counts[top]) {
          top = a;
          tied = 1;
        } else if (counts[a] === counts[top]) {
          tied += 1;
          if (rnd() < 1 / tied) top = a;
        }
      }
      if (top === 0) majorityHits[ni] += 1;
    });
  }

  return {
    oracle: N_VALUES.map((n) => 1 - Math.pow(1 - p, n)),
    verifier: verifierHits.map((h) => h / TRIALS),
    majority: majorityHits.map((h) => h / TRIALS),
    single: N_VALUES.map(() => p),
  };
}

const SERIES: { key: keyof Curves; label: string; color: string }[] = [
  { key: "oracle", label: "pass@N (perfect verifier)", color: "var(--series-1)" },
  { key: "verifier", label: "best-of-N (this verifier)", color: "var(--series-2)" },
  { key: "majority", label: "majority vote", color: "var(--series-3)" },
  { key: "single", label: "single sample", color: "var(--series-4)" },
];

export function TestTimeComputeExplorer() {
  const [p, setP] = useState(0.3);
  const [q, setQ] = useState(0.85);
  const [m, setM] = useState(4);
  const [budget, setBudget] = useState(4);

  const curves = useMemo(() => simulate(p, q, m), [p, q, m]);

  const W = 470;
  const H = 240;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 40;
  const px = (i: number) => padL + (i / (N_VALUES.length - 1)) * (W - padL - padR);
  const py = (v: number) => padT + (1 - v) * (H - padT - padB);

  return (
    <WidgetShell
      title="What N samples buy you"
      subtitle={
        <>
          A simulation, not benchmark data: independent samples succeed with
          probability <strong>p</strong>, wrong samples scatter over{" "}
          <strong>m</strong> distinct wrong answers, and a verifier of quality{" "}
          <strong>q</strong> scores each one. The point is the{" "}
          <em>shape</em> of the four curves and how they trade off.
        </>
      }
      footer={
        <>
          At N = <span className="font-mono text-ink">{N_VALUES[budget]}</span>:{" "}
          {SERIES.map((s, i) => (
            <span key={s.key}>
              {i > 0 ? " · " : ""}
              <span style={{ color: s.color }}>{s.label}</span>{" "}
              <span className="font-mono text-ink">
                {(curves[s.key][budget] * 100).toFixed(1)}%
              </span>
            </span>
          ))}
          .
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Slider
          label="p · per-sample success"
          value={p}
          min={0.02}
          max={0.9}
          step={0.01}
          onChange={setP}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="q · verifier quality"
          value={q}
          min={0.5}
          max={0.99}
          step={0.01}
          onChange={setQ}
          format={(v) => (v <= 0.505 ? "coin flip" : v.toFixed(2))}
        />
        <Slider
          label="m · distinct wrong answers"
          value={m}
          min={1}
          max={10}
          step={1}
          onChange={(v) => setM(Math.round(v))}
        />
        <Slider
          label="N · sample budget"
          value={budget}
          min={0}
          max={N_VALUES.length - 1}
          step={1}
          onChange={(v) => setBudget(Math.round(v))}
          format={(v) => String(N_VALUES[Math.round(v)])}
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[470px]"
        role="img"
        aria-label={`Accuracy versus sample budget. At N equals ${N_VALUES[budget]}, pass@N is ${(curves.oracle[budget] * 100).toFixed(0)} percent, best-of-N is ${(curves.verifier[budget] * 100).toFixed(0)} percent, majority vote is ${(curves.majority[budget] * 100).toFixed(0)} percent, single sample is ${(p * 100).toFixed(0)} percent`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={py(v)} y2={py(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={py(v) + 3.5} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <line x1={px(budget)} x2={px(budget)} y1={padT} y2={py(0)} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />

        {SERIES.map((s) => (
          <polyline
            key={s.key}
            points={curves[s.key].map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.key === "oracle" ? "6 4" : undefined}
          />
        ))}
        {SERIES.map((s) => (
          <circle key={s.key} cx={px(budget)} cy={py(curves[s.key][budget])} r={4} fill={s.color} />
        ))}

        {N_VALUES.map((n, i) => (
          <text key={n} x={px(i)} y={H - padB + 14} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" className="font-mono">
            {n}
          </text>
        ))}
        <text x={(padL + W - padR) / 2} y={H - 16} textAnchor="middle" fontSize={10} fill="var(--text-muted)" className="font-mono">
          samples drawn (N)
        </text>
        <text x={4} y={12} fontSize={10} fill="var(--text-muted)" className="font-mono">
          accuracy
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}
