"use client";

import { useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Chinchilla parametric loss (Hoffmann et al. 2022, "Approach 3"):
 *   L(N, D) = E + A/N^alpha + B/D^beta
 * with the paper's fitted constants. Compute is approximated by C ~ 6ND.
 */
const E = 1.69;
const A = 406.4;
const B = 410.7;
const ALPHA = 0.34;
const BETA = 0.28;

export function chinchillaLoss(N: number, D: number): number {
  return E + A / Math.pow(N, ALPHA) + B / Math.pow(D, BETA);
}

/**
 * Minimising L subject to C = 6ND gives
 *   N* = [(alpha·A)/(beta·B)]^(1/(alpha+beta)) · (C/6)^(beta/(alpha+beta)).
 */
const K_OPT = Math.pow((ALPHA * A) / (BETA * B), 1 / (ALPHA + BETA));
const N_EXP = BETA / (ALPHA + BETA);

export function optimalND(C: number): { N: number; D: number } {
  const N = K_OPT * Math.pow(C / 6, N_EXP);
  return { N, D: C / (6 * N) };
}

function human(x: number): string {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [v, u] of units) {
    if (x >= v) return `${(x / v).toFixed(x / v < 10 ? 1 : 0)}${u}`;
  }
  return x.toFixed(0);
}

function sci(x: number): string {
  const e = Math.floor(Math.log10(x));
  return `${(x / Math.pow(10, e)).toFixed(1)}e${e}`;
}

type Preset = { label: string; n: number; d: number };
const PRESETS: Preset[] = [
  { label: "GPT-3", n: 175e9, d: 300e9 },
  { label: "Gopher", n: 280e9, d: 300e9 },
  { label: "Chinchilla", n: 70e9, d: 1.4e12 },
  { label: "Llama 3 8B", n: 8e9, d: 15e12 },
];

// Plot ranges (log10).
const CX_MIN = 17;
const CX_MAX = 26;
const LY_MIN = Math.log10(1.66);
const LY_MAX = Math.log10(5.6);

export function ScalingLawExplorer() {
  const [logN, setLogN] = useState(Math.log10(70e9));
  const [logD, setLogD] = useState(Math.log10(1.4e12));

  const N = Math.pow(10, logN);
  const D = Math.pow(10, logD);
  const C = 6 * N * D;
  const L = chinchillaLoss(N, D);
  const opt = optimalND(C);
  const LOpt = chinchillaLoss(opt.N, opt.D);

  const W = 460;
  const H = 260;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 34;

  const cx = (c: number) =>
    padL + ((Math.log10(c) - CX_MIN) / (CX_MAX - CX_MIN)) * (W - padL - padR);
  const cy = (l: number) =>
    H -
    padB -
    ((Math.log10(l) - LY_MIN) / (LY_MAX - LY_MIN)) * (H - padT - padB);

  /** The compute-optimal frontier: best achievable loss at each budget. */
  const frontierPts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const c = Math.pow(10, CX_MIN + (i / 120) * (CX_MAX - CX_MIN));
    const o = optimalND(c);
    frontierPts.push(
      `${cx(c).toFixed(1)},${cy(chinchillaLoss(o.N, o.D)).toFixed(1)}`,
    );
  }
  const frontier = frontierPts.join(" ");

  /** IsoFLOP slice: hold C fixed, sweep N. The classic U-curve. */
  const IW = 460;
  const IH = 150;
  const ipadL = 46;
  const ipadB = 30;
  const nSpan = 1.8; // decades either side of N*
  const ix = (n: number) =>
    ipadL +
    ((Math.log10(n) - (Math.log10(opt.N) - nSpan)) / (2 * nSpan)) *
      (IW - ipadL - 14);

  const isoPoints: { n: number; l: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const ln = Math.log10(opt.N) - nSpan + (i / 100) * 2 * nSpan;
    const n = Math.pow(10, ln);
    isoPoints.push({ n, l: chinchillaLoss(n, C / (6 * n)) });
  }

  const isoMin = Math.min(...isoPoints.map((p) => p.l));
  const isoMax = Math.max(...isoPoints.map((p) => p.l));
  const iy = (l: number) =>
    IH -
    ipadB -
    ((l - isoMin) / Math.max(isoMax - isoMin, 1e-6)) * (IH - 18 - ipadB);
  const isoPath = isoPoints
    .map((p) => `${ix(p.n).toFixed(1)},${iy(p.l).toFixed(1)}`)
    .join(" ");

  const inRange = Math.log10(N) >= Math.log10(opt.N) - nSpan &&
    Math.log10(N) <= Math.log10(opt.N) + nSpan;

  const ratio = D / N;

  return (
    <WidgetShell
      title="Scaling-law explorer"
      subtitle={
        <>
          Chinchilla&apos;s fitted loss surface, live. Move parameters{" "}
          <span className="font-mono">N</span> and training tokens{" "}
          <span className="font-mono">D</span>; the compute budget{" "}
          <span className="font-mono">C ≈ 6ND</span> follows. The curve is the
          compute-optimal frontier — the best loss any model can reach at that
          budget.
        </>
      }
      footer={
        <>
          <span className="font-mono text-ink">N = {human(N)}</span> params,{" "}
          <span className="font-mono text-ink">D = {human(D)}</span> tokens (
          {ratio.toFixed(1)} tokens/param) →{" "}
          <span className="font-mono text-ink">C = {sci(C)}</span> FLOPs, loss{" "}
          <span className="font-mono text-ink">{L.toFixed(3)}</span> nats.
          <br />
          At that budget the optimum is{" "}
          <span className="font-mono text-ink">N* = {human(opt.N)}</span> /{" "}
          <span className="font-mono text-ink">D* = {human(opt.D)}</span> (
          {(opt.D / opt.N).toFixed(0)} tokens/param) for loss{" "}
          <span className="font-mono text-ink">{LOpt.toFixed(3)}</span> — you are
          leaving{" "}
          <span className="font-mono text-ink">
            {(L - LOpt).toFixed(3)}
          </span>{" "}
          nats on the table.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <WidgetButton
            key={p.label}
            onClick={() => {
              setLogN(Math.log10(p.n));
              setLogD(Math.log10(p.d));
            }}
          >
            {p.label}
          </WidgetButton>
        ))}
        <WidgetButton
          primary
          onClick={() => {
            setLogN(Math.log10(opt.N));
            setLogD(Math.log10(opt.D));
          }}
        >
          Snap to optimal
        </WidgetButton>
      </div>

      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <Slider
            label="Parameters N"
            value={logN}
            min={7}
            max={12.5}
            step={0.05}
            onChange={setLogN}
            format={(v) => human(Math.pow(10, v))}
          />
          <Slider
            label="Training tokens D"
            value={logD}
            min={8}
            max={14.5}
            step={0.05}
            onChange={setLogD}
            format={(v) => human(Math.pow(10, v))}
          />
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-[12px] leading-5 text-ink-muted">
            <div>
              <span className="font-mono text-ink">L = E + A/N^α + B/D^β</span>
            </div>
            <div className="mt-1">
              E = 1.69 · A = 406.4 · B = 410.7
              <br />α = 0.34 · β = 0.28
            </div>
          </div>
        </div>

        <div className="order-first sm:order-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[460px]"
            role="img"
            aria-label={`Log-log plot of predicted loss versus training compute. Your model sits at ${sci(C)} FLOPs with loss ${L.toFixed(2)}; the compute-optimal loss there is ${LOpt.toFixed(2)}.`}
          >
            {/* y gridlines at round loss values */}
            {[2, 2.5, 3, 4, 5].map((l) => (
              <g key={l}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={cy(l)}
                  y2={cy(l)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={cy(l) + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--text-muted)"
                  className="font-mono"
                >
                  {l}
                </text>
              </g>
            ))}
            {/* x gridlines per decade of FLOPs */}
            {[18, 20, 22, 24, 26].map((e) => (
              <g key={e}>
                <line
                  x1={cx(Math.pow(10, e))}
                  x2={cx(Math.pow(10, e))}
                  y1={padT}
                  y2={H - padB}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={cx(Math.pow(10, e))}
                  y={H - padB + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                  className="font-mono"
                >
                  1e{e}
                </text>
              </g>
            ))}
            {/* irreducible loss floor */}
            <line
              x1={padL}
              x2={W - padR}
              y1={cy(E)}
              y2={cy(E)}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={W - padR}
              y={cy(E) - 5}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              E = 1.69 (irreducible)
            </text>

            <polyline
              points={frontier}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={2.5}
            />

            {/* your model */}
            <line
              x1={cx(C)}
              x2={cx(C)}
              y1={cy(L)}
              y2={cy(LOpt)}
              stroke="var(--series-2)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <circle cx={cx(C)} cy={cy(LOpt)} r={3.5} fill="var(--series-1)" />
            <circle
              cx={cx(C)}
              cy={cy(L)}
              r={6}
              fill="var(--series-2)"
              stroke="var(--surface-1)"
              strokeWidth={2}
            />

            <text
              x={padL}
              y={padT}
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              loss (nats/token, log)
            </text>
            <text
              x={W - padR}
              y={H - 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              training compute C (FLOPs, log) →
            </text>
          </svg>

          <svg
            viewBox={`0 0 ${IW} ${IH}`}
            className="mt-3 w-full max-w-[460px]"
            role="img"
            aria-label={`IsoFLOP curve: at a fixed budget of ${sci(C)} FLOPs, loss as a function of model size, minimised at ${human(opt.N)} parameters.`}
          >
            <text
              x={ipadL}
              y={12}
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              IsoFLOP slice at C = {sci(C)}: loss vs model size
            </text>
            <line
              x1={ipadL}
              x2={IW - 14}
              y1={IH - ipadB}
              y2={IH - ipadB}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <polyline
              points={isoPath}
              fill="none"
              stroke="var(--series-3)"
              strokeWidth={2.5}
            />
            <line
              x1={ix(opt.N)}
              x2={ix(opt.N)}
              y1={18}
              y2={IH - ipadB}
              stroke="var(--series-1)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <text
              x={ix(opt.N)}
              y={IH - ipadB + 13}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-secondary)"
              className="font-mono"
            >
              N* = {human(opt.N)}
            </text>
            {inRange ? (
              <circle
                cx={ix(N)}
                cy={iy(L)}
                r={5.5}
                fill="var(--series-2)"
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
            ) : null}
            <text
              x={ipadL - 6}
              y={iy(isoMin) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              {isoMin.toFixed(2)}
            </text>
            <text
              x={ipadL - 6}
              y={iy(isoMax) + 8}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              {isoMax.toFixed(2)}
            </text>
            <text
              x={IW - 14}
              y={IH - 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              model size N (log) →
            </text>
          </svg>
        </div>
      </div>
    </WidgetShell>
  );
}
