"use client";

import { useMemo, useState } from "react";
import {
  SegmentedControl,
  Slider,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";

/**
 * Live SAE anatomy: dense activation -> sparse code -> reconstruction.
 *
 * The "SAE" here is an honest sparse-coding solver rather than a trained
 * encoder: given a fixed overcomplete dictionary D, we solve
 *
 *     min_f  1/2 ||x - D f||^2 + lambda ||f||_1     subject to f >= 0
 *
 * with non-negative ISTA (proximal gradient = gradient step + soft-threshold,
 * clipped at zero). That objective is exactly what an SAE's training loss
 * asks its encoder to approximate, so the widget reproduces the real
 * phenomena: raising lambda buys sparsity with reconstruction error, and the
 * soft-threshold visibly *shrinks* recovered magnitudes below the truth.
 *
 * ~400 ISTA iterations on a 5x12 dictionary is well under a millisecond.
 */

const N_DIMS = 5;

const FEATURE_NAMES = [
  "Golden Gate Bridge",
  "Python code",
  "Arabic script",
  "legal boilerplate",
  "sycophantic praise",
  "immunology",
  "DNA sequences",
  "sadness / grief",
  "chess notation",
  "recipe steps",
  "hex color codes",
  "sarcasm",
];
const N_FEATS = FEATURE_NAMES.length;

/** Deterministic LCG so the dictionary is identical on server and client. */
function makeDictionary(): number[][] {
  let s = 20231005;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const cols: number[][] = [];
  for (let j = 0; j < N_FEATS; j++) {
    const v: number[] = [];
    for (let i = 0; i < N_DIMS; i++) v.push(rand() * 2 - 1);
    const n = Math.hypot(...v);
    cols.push(v.map((c) => c / n));
  }
  return cols;
}

/** D: N_DIMS x N_FEATS, stored column-major (one array per feature direction). */
const D = makeDictionary();

type Sample = {
  id: string;
  label: string;
  /** ground-truth feature index -> magnitude */
  active: { j: number; amp: number }[];
  caption: string;
};

const SAMPLES: Sample[] = [
  {
    id: "bridge",
    label: "Token A",
    active: [
      { j: 0, amp: 2.6 },
      { j: 9, amp: 0.9 },
    ],
    caption:
      "“…drove across the Golden Gate Bridge before brunch.” Two true features are on.",
  },
  {
    id: "code",
    label: "Token B",
    active: [
      { j: 1, amp: 2.2 },
      { j: 10, amp: 1.5 },
      { j: 8, amp: 0.7 },
    ],
    caption:
      "“…set BG = #1B4F72 in the render loop.” Three true features, one of them weak.",
  },
  {
    id: "praise",
    label: "Token C",
    active: [
      { j: 4, amp: 2.4 },
      { j: 11, amp: 1.9 },
    ],
    caption:
      "“What a brilliant question — truly nobody has ever asked it better.” Praise and sarcasm at once.",
  },
  {
    id: "dense",
    label: "Token D",
    active: [
      { j: 2, amp: 1.4 },
      { j: 3, amp: 1.3 },
      { j: 5, amp: 1.2 },
      { j: 7, amp: 1.1 },
    ],
    caption:
      "A genuinely busy token: four true features, none of them dominant.",
  },
];

function encodeDecode(x: number[], lambda: number) {
  // Lipschitz constant of the quadratic term, via power iteration on D^T D.
  let v = new Array(N_FEATS).fill(1 / Math.sqrt(N_FEATS));
  for (let it = 0; it < 24; it++) {
    // w = D v (in R^N_DIMS)
    const w = new Array(N_DIMS).fill(0);
    for (let j = 0; j < N_FEATS; j++)
      for (let i = 0; i < N_DIMS; i++) w[i] += D[j][i] * v[j];
    // v' = D^T w
    const nv = new Array(N_FEATS).fill(0);
    for (let j = 0; j < N_FEATS; j++)
      for (let i = 0; i < N_DIMS; i++) nv[j] += D[j][i] * w[i];
    const n = Math.hypot(...nv) || 1;
    v = nv.map((c) => c / n);
  }
  const w = new Array(N_DIMS).fill(0);
  for (let j = 0; j < N_FEATS; j++)
    for (let i = 0; i < N_DIMS; i++) w[i] += D[j][i] * v[j];
  let L = 0;
  for (let j = 0; j < N_FEATS; j++)
    for (let i = 0; i < N_DIMS; i++) L += D[j][i] * w[i] * v[j];
  const eta = 1 / Math.max(L, 1e-6);

  // Non-negative ISTA.
  const f = new Array(N_FEATS).fill(0);
  for (let it = 0; it < 400; it++) {
    const r = new Array(N_DIMS).fill(0); // D f - x
    for (let j = 0; j < N_FEATS; j++)
      for (let i = 0; i < N_DIMS; i++) r[i] += D[j][i] * f[j];
    for (let i = 0; i < N_DIMS; i++) r[i] -= x[i];
    for (let j = 0; j < N_FEATS; j++) {
      let g = 0;
      for (let i = 0; i < N_DIMS; i++) g += D[j][i] * r[i];
      f[j] = Math.max(0, f[j] - eta * g - eta * lambda);
    }
  }

  const xhat = new Array(N_DIMS).fill(0);
  for (let j = 0; j < N_FEATS; j++)
    for (let i = 0; i < N_DIMS; i++) xhat[i] += D[j][i] * f[j];
  return { f, xhat };
}

const STAGES = [
  {
    value: "input" as const,
    label: "1 · Activation",
    text: "The residual stream at one token: five dense numbers. Every coordinate is nonzero, and no single coordinate means anything on its own — this is superposition.",
  },
  {
    value: "encode" as const,
    label: "2 · Encode",
    text: "The encoder projects onto every dictionary direction and applies ReLU. Directions that do not earn their L1 cost get pushed all the way to zero.",
  },
  {
    value: "code" as const,
    label: "3 · Sparse code",
    text: "The feature vector: wider than the activation, but almost entirely zero. The handful of surviving entries are what you actually read as an interpretation.",
  },
  {
    value: "decode" as const,
    label: "4 · Decode",
    text: "The decoder sums the active features' directions, weighted by their activations. Compare against the original: the gap is the reconstruction error.",
  },
];
type Stage = (typeof STAGES)[number]["value"];

export function SaeAnatomy() {
  const [lambda, setLambda] = useState(0.25);
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [stage, setStage] = useState<Stage>("input");

  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];

  const { x, f, xhat, l0, relErr, shrink } = useMemo(() => {
    const xv = new Array(N_DIMS).fill(0);
    for (const a of sample.active)
      for (let i = 0; i < N_DIMS; i++) xv[i] += D[a.j][i] * a.amp;
    const { f: fv, xhat: xh } = encodeDecode(xv, lambda);
    const thresh = 0.02;
    const nnz = fv.filter((v) => v > thresh).length;
    const num = Math.hypot(...xv.map((v, i) => v - xh[i]));
    const den = Math.hypot(...xv) || 1;
    const ratios = sample.active.map((a) => fv[a.j] / a.amp);
    const meanRatio =
      ratios.reduce((s2, r) => s2 + r, 0) / Math.max(ratios.length, 1);
    return {
      x: xv,
      f: fv,
      xhat: xh,
      l0: nnz,
      relErr: num / den,
      shrink: meanRatio,
    };
  }, [sample, lambda]);

  const trueSet = new Set(sample.active.map((a) => a.j));
  const maxAbsX = Math.max(...x.map(Math.abs), ...xhat.map(Math.abs), 0.5);
  const maxF = Math.max(...f, 0.5);

  // ---- geometry ----
  const W = 680;
  const rowH = 18;
  const rowGap = 4;
  const codeTop = 30;
  const codeH = N_FEATS * (rowH + rowGap) - rowGap;
  const H = codeTop + codeH + 30;
  const vecCellH = 26;
  const vecGap = 8;
  const vecH = N_DIMS * (vecCellH + vecGap) - vecGap;
  const vecTop = codeTop + (codeH - vecH) / 2;

  const xCol = { x: 14, w: 56 };
  const codeCol = { x: 196, w: 246 };
  const outCol = { x: 566, w: 56 };

  const dim = (on: boolean) => (on ? 1 : 0.22);

  const arrow = (x1: number, x2: number, label: string, sub: string, lit: boolean) => {
    const y = codeTop + codeH / 2;
    return (
      <g opacity={dim(lit)}>
        <line
          x1={x1}
          y1={y}
          x2={x2 - 8}
          y2={y}
          stroke="var(--text-secondary)"
          strokeWidth={2}
        />
        <path
          d={`M${x2 - 9},${y - 5} L${x2},${y} L${x2 - 9},${y + 5} z`}
          fill="var(--text-secondary)"
        />
        <g className="motion-reduce:hidden">
          <line
            x1={x1}
            y1={y}
            x2={x2 - 8}
            y2={y}
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeDasharray="6 12"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="18"
              to="0"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </line>
        </g>
        <text
          x={(x1 + x2) / 2}
          y={y - 14}
          textAnchor="middle"
          fontSize={11}
          className="font-mono"
          fill="var(--text-primary)"
        >
          {label}
        </text>
        <text
          x={(x1 + x2) / 2}
          y={y + 24}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
        >
          {sub}
        </text>
      </g>
    );
  };

  const vector = (
    vals: number[],
    col: { x: number; w: number },
    title: string,
    color: string,
    lit: boolean,
  ) => (
    <g opacity={dim(lit)}>
      <text
        x={col.x + col.w / 2}
        y={vecTop - 12}
        textAnchor="middle"
        fontSize={10}
        fill="var(--text-muted)"
        className="font-mono"
      >
        {title}
      </text>
      {vals.map((v, i) => {
        const y = vecTop + i * (vecCellH + vecGap);
        const h = (Math.abs(v) / maxAbsX) * (col.w - 6);
        return (
          <g key={i}>
            <rect
              x={col.x}
              y={y}
              width={col.w}
              height={vecCellH}
              rx={4}
              fill="var(--surface-2)"
            />
            <rect
              x={col.x + 3}
              y={y + 3}
              width={Math.max(h, 2)}
              height={vecCellH - 6}
              rx={2}
              fill={color}
            />
            <text
              x={col.x + col.w / 2}
              y={y + vecCellH / 2 + 4}
              textAnchor="middle"
              fontSize={10}
              className="font-mono"
              fill="var(--text-primary)"
            >
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
    </g>
  );

  return (
    <WidgetShell
      title="SAE anatomy: encode → sparsify → decode"
      subtitle="A five-dimensional activation built from a known set of true features, run through a real sparse-coding solve. The L1 coefficient is the only knob that matters, and it buys sparsity with reconstruction error."
      footer={
        <>
          Active features (L0):{" "}
          <span className="font-mono text-ink">{l0}</span> of {N_FEATS} ·
          reconstruction error{" "}
          <span className="font-mono text-ink">
            {(relErr * 100).toFixed(1)}%
          </span>{" "}
          of the activation norm · recovered magnitude of the true features{" "}
          <span className="font-mono text-ink">
            {(shrink * 100).toFixed(0)}%
          </span>{" "}
          of their real size. That last number is <em>shrinkage</em>: the L1
          penalty taxes every unit of activation, so once{" "}
          <span className="font-mono text-ink">λ &gt; 0</span> even correctly
          identified features come back systematically too small.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Slider
            label="L1 coefficient λ"
            value={lambda}
            min={0}
            max={1.2}
            step={0.01}
            onChange={setLambda}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <SegmentedControl
          label="Input token"
          options={SAMPLES.map((s) => ({ value: s.id, label: s.label }))}
          value={sampleId}
          onChange={setSampleId}
        />
        <WidgetButton
          onClick={() => {
            setLambda(0.25);
            setSampleId(SAMPLES[0].id);
            setStage("input");
          }}
        >
          Reset
        </WidgetButton>
      </div>

      <div className="mb-3">
        <SegmentedControl
          label="Walk the pipeline"
          options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
          value={stage}
          onChange={setStage}
        />
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink-secondary">
          {STAGES.find((s) => s.value === stage)?.text}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[680px]"
        role="img"
        aria-label={`Sparse autoencoder pipeline: a ${N_DIMS}-dimensional activation encoded into ${N_FEATS} features of which ${l0} are active, then decoded back with ${(relErr * 100).toFixed(0)} percent error`}
      >
        {vector(x, xCol, "x", "var(--series-1)", stage === "input" || stage === "decode")}
        {arrow(
          xCol.x + xCol.w + 8,
          codeCol.x - 8,
          "W_enc · x + b",
          "ReLU + L1 pressure",
          stage === "encode",
        )}

        {/* sparse code */}
        <g opacity={dim(stage === "code" || stage === "encode" || stage === "decode")}>
          <text
            x={codeCol.x}
            y={codeTop - 12}
            fontSize={10}
            fill="var(--text-muted)"
            className="font-mono"
          >
            f — feature activations ({N_FEATS} dictionary entries)
          </text>
          {f.map((v, j) => {
            const y = codeTop + j * (rowH + rowGap);
            const on = v > 0.02;
            const w = (v / maxF) * (codeCol.w - 8);
            return (
              <g key={FEATURE_NAMES[j]}>
                <rect
                  x={codeCol.x}
                  y={y}
                  width={codeCol.w}
                  height={rowH}
                  rx={3}
                  fill="var(--surface-2)"
                />
                {on ? (
                  <rect
                    x={codeCol.x + 4}
                    y={y + 3}
                    width={Math.max(w, 2)}
                    height={rowH - 6}
                    rx={2}
                    fill={trueSet.has(j) ? "var(--series-3)" : "var(--series-2)"}
                  />
                ) : null}
                <text
                  x={codeCol.x + 8}
                  y={y + rowH / 2 + 3.5}
                  fontSize={9.5}
                  fill={on ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  {FEATURE_NAMES[j]}
                </text>
                <text
                  x={codeCol.x + codeCol.w - 6}
                  y={y + rowH / 2 + 3.5}
                  textAnchor="end"
                  fontSize={9.5}
                  className="font-mono"
                  fill={on ? "var(--text-primary)" : "var(--text-muted)"}
                >
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>

        {arrow(
          codeCol.x + codeCol.w + 8,
          outCol.x - 8,
          "W_dec · f",
          "sum of feature directions",
          stage === "decode",
        )}
        {vector(xhat, outCol, "x̂", "var(--series-4)", stage === "decode")}
      </svg>

      <p className="mt-3 text-[13px] leading-6 text-ink-muted">
        {sample.caption} Aqua bars are features that really are present; orange
        bars are false positives the solver invented to patch the residual.
      </p>
    </WidgetShell>
  );
}
