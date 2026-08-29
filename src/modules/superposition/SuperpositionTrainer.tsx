"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * The actual Toy Models of Superposition ReLU model, trained live in the
 * browser with hand-written gradients and Adam.
 *
 *   x  ~ n sparse features, x_i = 0 w.p. S else Uniform(0,1)
 *   h  = W x                     W in R^{m x n},  m = 2 hidden dimensions
 *   x^ = ReLU(W^T W x + b)
 *   L  = sum_i I_i (x_i - x^_i)^2,   I_i = decay^i
 *
 * Gradients (per sample), with g_i = dL/dz_i:
 *   g_i          = -2 I_i (x_i - x^_i) * 1[z_i > 0]
 *   dL/db_i      = g_i
 *   dL/dW_{k,i}  = g_i h_k + (sum_l g_l W_{k,l}) x_i
 * The second term is the path through h = Wx; forgetting it is the classic bug.
 */

const N = 5; // features
const M = 2; // hidden dimensions
const BATCH = 512;
const STEPS_PER_FRAME = 8;
const LR = 0.03;

const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];

type Model = {
  W: Float64Array; // [k * N + i]
  b: Float64Array;
  mW: Float64Array;
  vW: Float64Array;
  mB: Float64Array;
  vB: Float64Array;
  t: number;
  steps: number;
  rnd: () => number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function initModel(seed: number): Model {
  const rnd = mulberry32(seed);
  const W = new Float64Array(N * M);
  for (let i = 0; i < N * M; i++) W[i] = (rnd() * 2 - 1) * 0.3;
  return {
    W,
    b: new Float64Array(N),
    mW: new Float64Array(N * M),
    vW: new Float64Array(N * M),
    mB: new Float64Array(N),
    vB: new Float64Array(N),
    t: 0,
    steps: 0,
    rnd,
  };
}

function trainStep(model: Model, sparsity: number, imp: number[]): number {
  const { W, b, rnd } = model;
  const gW = new Float64Array(N * M);
  const gB = new Float64Array(N);
  const x = new Float64Array(N);
  const h = new Float64Array(M);
  const z = new Float64Array(N);
  const g = new Float64Array(N);
  const dh = new Float64Array(M);
  let loss = 0;

  for (let s = 0; s < BATCH; s++) {
    for (let i = 0; i < N; i++) x[i] = rnd() < sparsity ? 0 : rnd();
    for (let k = 0; k < M; k++) {
      let a = 0;
      for (let i = 0; i < N; i++) a += W[k * N + i] * x[i];
      h[k] = a;
    }
    for (let i = 0; i < N; i++) {
      let a = b[i];
      for (let k = 0; k < M; k++) a += W[k * N + i] * h[k];
      z[i] = a;
    }
    for (let i = 0; i < N; i++) {
      const xh = z[i] > 0 ? z[i] : 0;
      const d = x[i] - xh;
      loss += imp[i] * d * d;
      g[i] = z[i] > 0 ? -2 * imp[i] * d : 0;
    }
    for (let k = 0; k < M; k++) {
      let a = 0;
      for (let i = 0; i < N; i++) a += g[i] * W[k * N + i];
      dh[k] = a;
    }
    for (let i = 0; i < N; i++) gB[i] += g[i];
    for (let k = 0; k < M; k++)
      for (let i = 0; i < N; i++) gW[k * N + i] += g[i] * h[k] + dh[k] * x[i];
  }

  model.t += 1;
  model.steps += 1;
  const inv = 1 / BATCH;
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;
  const bc1 = 1 - Math.pow(b1, model.t);
  const bc2 = 1 - Math.pow(b2, model.t);
  for (let j = 0; j < N * M; j++) {
    const gr = gW[j] * inv;
    model.mW[j] = b1 * model.mW[j] + (1 - b1) * gr;
    model.vW[j] = b2 * model.vW[j] + (1 - b2) * gr * gr;
    W[j] -= (LR * (model.mW[j] / bc1)) / (Math.sqrt(model.vW[j] / bc2) + eps);
  }
  for (let j = 0; j < N; j++) {
    const gr = gB[j] * inv;
    model.mB[j] = b1 * model.mB[j] + (1 - b1) * gr;
    model.vB[j] = b2 * model.vB[j] + (1 - b2) * gr * gr;
    b[j] -= (LR * (model.mB[j] / bc1)) / (Math.sqrt(model.vB[j] / bc2) + eps);
  }
  return loss * inv;
}

type Snap = { w: number[]; b: number[]; loss: number; steps: number };

function snapshot(model: Model, loss: number): Snap {
  return {
    w: Array.from(model.W),
    b: Array.from(model.b),
    loss,
    steps: model.steps,
  };
}

export function SuperpositionTrainer() {
  const [sparsity, setSparsity] = useState(0);
  const [decay, setDecay] = useState(0.85);
  const [running, setRunning] = useState(true);
  const [seed, setSeed] = useState(7);
  const [probeFeature, setProbeFeature] = useState(0);

  // initModel is deterministic in its seed, so these two start identical.
  const modelRef = useRef<Model>(initModel(7));
  const [snap, setSnap] = useState<Snap>(() => snapshot(initModel(7), 0));

  const reset = useCallback((newSeed: number) => {
    modelRef.current = initModel(newSeed);
    setSnap(snapshot(modelRef.current, 0));
  }, []);

  useEffect(() => {
    if (!running) return;
    const imp: number[] = [];
    for (let i = 0; i < N; i++) imp.push(Math.pow(decay, i));
    let raf = 0;
    const loop = () => {
      let loss = 0;
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        loss = trainStep(modelRef.current, sparsity, imp);
      }
      setSnap(snapshot(modelRef.current, loss));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, sparsity, decay]);

  const stepBurst = () => {
    const imp: number[] = [];
    for (let i = 0; i < N; i++) imp.push(Math.pow(decay, i));
    let loss = 0;
    for (let i = 0; i < 200; i++) loss = trainStep(modelRef.current, sparsity, imp);
    setSnap(snapshot(modelRef.current, loss));
  };

  // ---- derived quantities ----
  const cols: [number, number][] = [];
  for (let i = 0; i < N; i++) cols.push([snap.w[i], snap.w[N + i]]);
  const norms = cols.map((c) => Math.hypot(c[0], c[1]));
  const maxNorm = Math.max(1.05, ...norms);
  const dims = cols.map((c, i) => {
    if (norms[i] < 1e-6) return 0;
    const u = [c[0] / norms[i], c[1] / norms[i]];
    let d = 0;
    for (let j = 0; j < N; j++) d += Math.pow(u[0] * cols[j][0] + u[1] * cols[j][1], 2);
    return (norms[i] * norms[i]) / d;
  });
  const gram: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) row.push(cols[i][0] * cols[j][0] + cols[i][1] * cols[j][1]);
    gram.push(row);
  }
  const gramMax = Math.max(0.1, ...gram.flat().map(Math.abs));
  const stored = norms.filter((v) => v > 0.25).length;

  // Fire exactly one feature at magnitude 1 and read the reconstruction back.
  // x = e_k  =>  h = W_k,  z_i = W_i·W_k + b_i,  x_hat = ReLU(z)
  const zProbe = gram.map((row, i) => row[probeFeature] + snap.b[i]);
  const xHat = zProbe.map((v) => Math.max(0, v));

  // ---- geometry ----
  const P = 250;
  const R = P / 2 - 18;
  const scale = R / (maxNorm * 1.12);
  const cx = (v: number) => P / 2 + v * scale;
  const cy = (v: number) => P / 2 - v * scale;

  const CELL = 26;
  const GLBL = 26;
  const GS = GLBL + N * CELL + 4;

  return (
    <WidgetShell
      title="Train the toy model, live"
      subtitle="Five features, two hidden dimensions, trained in your browser with hand-written gradients. The arrows are the five columns of W — the direction each feature is stored in. Raise the sparsity slider slowly and watch the geometry reorganize."
      footer={
        <>
          step <span className="font-mono text-ink">{snap.steps}</span> · loss{" "}
          <span className="font-mono text-ink">{snap.loss.toFixed(4)}</span> ·
          features with a non-trivial direction:{" "}
          <span className="font-mono text-ink">{stored} / {N}</span> · total
          dimensionality used{" "}
          <span className="font-mono text-ink">
            {dims.reduce((a, b) => a + b, 0).toFixed(2)}
          </span>{" "}
          (it settles at m = {M}, however many features are stored — that is the
          whole tension).
        </>
      }
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <Slider
          label="sparsity S — P(a feature is zero)"
          value={sparsity}
          min={0}
          max={0.995}
          step={0.005}
          onChange={setSparsity}
          format={(v) => `${v.toFixed(3)}  (density ${(1 - v).toFixed(3)})`}
        />
        <Slider
          label="importance decay — Iᵢ = decayⁱ"
          value={decay}
          min={0.4}
          max={1}
          step={0.01}
          onChange={setDecay}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <WidgetButton primary onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Train"}
        </WidgetButton>
        <WidgetButton onClick={stepBurst} disabled={running}>
          Step ×200
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            const s = seed + 1;
            setSeed(s);
            reset(s);
          }}
        >
          New init
        </WidgetButton>
        <WidgetButton onClick={() => setSparsity(0)}>dense</WidgetButton>
        <WidgetButton onClick={() => setSparsity(0.7)}>sparse</WidgetButton>
        <WidgetButton onClick={() => setSparsity(0.95)}>very sparse</WidgetButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <svg
          viewBox={`0 0 ${P} ${P}`}
          className="w-full max-w-[250px]"
          role="img"
          aria-label="The five columns of W drawn as arrows in the two-dimensional hidden space"
        >
          <circle
            cx={P / 2}
            cy={P / 2}
            r={scale}
            fill="none"
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <line x1={12} x2={P - 12} y1={P / 2} y2={P / 2} stroke="var(--border)" />
          <line x1={P / 2} x2={P / 2} y1={12} y2={P - 12} stroke="var(--border)" />
          <defs>
            {SERIES.map((c, i) => (
              <marker
                key={i}
                id={`sp-arrow-${i}`}
                markerWidth="7"
                markerHeight="7"
                refX="5.5"
                refY="2.5"
                orient="auto"
              >
                <path d="M0,0 L5.5,2.5 L0,5 z" fill={c} />
              </marker>
            ))}
          </defs>
          {cols.map((c, i) =>
            norms[i] < 0.02 ? null : (
              <g key={i}>
                <line
                  x1={P / 2}
                  y1={P / 2}
                  x2={cx(c[0])}
                  y2={cy(c[1])}
                  stroke={SERIES[i]}
                  strokeWidth={2.4}
                  markerEnd={`url(#sp-arrow-${i})`}
                />
                <text
                  x={cx(c[0] * 1.16)}
                  y={cy(c[1] * 1.16) + 4}
                  fontSize={11}
                  textAnchor="middle"
                  fill={SERIES[i]}
                  className="font-mono"
                >
                  f{i}
                </text>
              </g>
            ),
          )}
          <text x={10} y={P - 4} fontSize={9} fill="var(--text-muted)" className="font-mono">
            hidden space (m = {M})
          </text>
        </svg>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div>
              <div className="mb-1 text-[12px] font-medium text-ink-secondary">
                WᵀW — interference between features
              </div>
              <svg
                viewBox={`0 0 ${GS} ${GS}`}
                className="w-full max-w-[190px]"
                role="img"
                aria-label="Gram matrix of the feature directions"
              >
                {Array.from({ length: N }, (_, i) => (
                  <text
                    key={`r${i}`}
                    x={GLBL - 4}
                    y={GLBL + i * CELL + CELL / 2 + 3}
                    fontSize={9}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    className="font-mono"
                  >
                    f{i}
                  </text>
                ))}
                {Array.from({ length: N }, (_, j) => (
                  <text
                    key={`c${j}`}
                    x={GLBL + j * CELL + CELL / 2}
                    y={GLBL - 6}
                    fontSize={9}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    className="font-mono"
                  >
                    f{j}
                  </text>
                ))}
                {gram.map((row, i) =>
                  row.map((v, j) => (
                    <rect
                      key={`${i}-${j}`}
                      x={GLBL + j * CELL}
                      y={GLBL + i * CELL}
                      width={CELL - 2}
                      height={CELL - 2}
                      rx={2}
                      fill={v >= 0 ? "var(--series-1)" : "var(--series-2)"}
                      fillOpacity={Math.min(1, Math.abs(v) / gramMax)}
                      stroke="var(--border)"
                    />
                  )),
                )}
              </svg>
              <div className="mt-1 text-[11px] leading-4 text-ink-muted">
                Diagonal = how strongly a feature is stored. Off-diagonal ={" "}
                <span style={{ color: "var(--series-1)" }}>positive</span> or{" "}
                <span style={{ color: "var(--series-2)" }}>negative</span>{" "}
                interference: what leaks into feature i when feature j fires.
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12px] font-medium text-ink-secondary">
                per feature
              </div>
              {/* border-spacing gives the numeric columns a gutter: without it
                  the left-aligned ‖Wᵢ‖ runs straight into Iᵢ and bᵢ. */}
              <table className="-mx-1 w-[calc(100%+0.5rem)] border-separate border-spacing-x-1 border-spacing-y-0 text-[12px]">
                <thead>
                  <tr className="text-ink-muted">
                    <th className="pb-1 text-left font-medium">feat</th>
                    <th className="pb-1 text-left font-medium">‖Wᵢ‖</th>
                    <th className="pb-1 text-right font-medium">Iᵢ</th>
                    <th className="pb-1 text-right font-medium">bᵢ</th>
                    <th className="pb-1 text-right font-medium">dim/feat</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {cols.map((_, i) => (
                    <tr key={i}>
                      <td className="py-0.5" style={{ color: SERIES[i] }}>
                        f{i}
                      </td>
                      <td className="py-0.5">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(48, norms[i] * 38)}px`,
                              background: SERIES[i],
                            }}
                          />
                          <span className="text-ink">{norms[i].toFixed(2)}</span>
                        </span>
                      </td>
                      <td className="py-0.5 text-right text-ink-secondary">
                        {Math.pow(decay, i).toFixed(2)}
                      </td>
                      <td className="py-0.5 text-right text-ink-secondary">
                        {snap.b[i].toFixed(2)}
                      </td>
                      <td className="py-0.5 text-right text-ink">
                        {dims[i].toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-[11px] leading-4 text-ink-muted">
                <strong className="text-ink-secondary">dim/feat</strong> is the
                paper&apos;s dimensionality measure{" "}
                {"D_i = ‖W_i‖² / Σ_j (Ŵ_i · W_j)²"}. It reads 1.00 for a
                feature with a dedicated orthogonal dimension, 0.50 for one half
                of an antipodal pair, and 0.40 = 2/5 for a member of a pentagon.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-borderline pt-4">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-medium text-ink-secondary">
            Fire one feature alone and read the reconstruction back:
          </span>
          <div className="flex gap-1">
            {Array.from({ length: N }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProbeFeature(i)}
                className={`rounded-md border px-2 py-0.5 font-mono text-[12px] transition-colors ${
                  probeFeature === i
                    ? "border-transparent text-white"
                    : "border-borderline text-ink-muted hover:text-ink"
                }`}
                style={
                  probeFeature === i ? { background: SERIES[i] } : undefined
                }
              >
                f{i}
              </button>
            ))}
          </div>
        </div>
        <svg
          viewBox="0 0 400 92"
          className="w-full max-w-[400px]"
          role="img"
          aria-label="Reconstruction when a single feature is set to one"
        >
          {Array.from({ length: N }, (_, i) => {
            const target = i === probeFeature;
            const y = i * 17;
            const raw = zProbe[i];
            const clipped = raw < 0 && !target;
            return (
              <g key={i} transform={`translate(0 ${y})`}>
                <text
                  x={30}
                  y={11}
                  textAnchor="end"
                  fontSize={10}
                  className="font-mono"
                  fill={target ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  f{i}
                </text>
                <line
                  x1={38}
                  x2={38}
                  y1={1}
                  y2={14}
                  stroke="var(--border-strong)"
                />
                <rect
                  x={38}
                  y={2}
                  width={(Math.min(xHat[i], 1.6) / 1.6) * 190}
                  height={11}
                  rx={2}
                  fill={SERIES[i]}
                  fillOpacity={target ? 1 : 0.65}
                />
                <text
                  x={240}
                  y={11}
                  fontSize={10}
                  className="font-mono"
                  fill="var(--text-secondary)"
                >
                  x̂ = {xHat[i].toFixed(3)}
                  {clipped ? `  (ReLU clipped ${raw.toFixed(2)})` : ""}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mt-1 text-[11px] leading-4 text-ink-muted">
          Input is <span className="font-mono">x = e_f{probeFeature}</span>: one
          feature at magnitude 1, everything else off. A perfect model would
          return exactly that. What you see instead is interference — every other
          feature whose direction is not orthogonal to this one picks up a
          signal, and the negative bias plus the ReLU is the model&apos;s filter
          for throwing the small ones away.
        </div>
      </div>
    </WidgetShell>
  );
}
