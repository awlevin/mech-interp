"use client";

import { useMemo, useState } from "react";
import {
  SegmentedControl,
  Slider,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";

/**
 * A constructed counterexample: a linear probe that reads a property off the
 * activations with high accuracy while pointing in a direction the model
 * provably does not use.
 *
 * Construction. Two classes of cached activations, projected to 2-D. Within
 * each class the two coordinates are correlated (rho = 0.714). Class means
 * differ along BOTH coordinates, so both separate the classes. But the
 * optimal linear readout is Sigma^{-1} (mu+ - mu-), and the numbers are chosen
 * so that vector is exactly horizontal — orthogonal to the vertical direction
 * the model's behaviour actually depends on. The probe below is really trained
 * (logistic regression, gradient descent) on the points you see.
 */

const N_PER_CLASS = 120;
const MU_A = 1.0; // class mean, coordinate 1
const SD_A = 0.5;
const MU_B = 0.5; // class mean, coordinate 2 (the causal one)
const SD_B = 0.35;
const RHO = 0.714; // within-class correlation

type Pt = { a: number; b: number; cls: 1 | -1 };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeData(): Pt[] {
  const rnd = mulberry32(20240613);
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const out: Pt[] = [];
  for (const cls of [1, -1] as const) {
    for (let i = 0; i < N_PER_CLASS; i++) {
      const z1 = gauss();
      const z2 = gauss();
      const a = cls * MU_A + SD_A * z1;
      const b = cls * MU_B + SD_B * (RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2);
      out.push({ a, b, cls });
    }
  }
  return out;
}

/** Logistic regression by gradient descent — the probe, honestly trained. */
function trainProbe(pts: Pt[]) {
  let w1 = 0.1;
  let w2 = -0.1;
  let b0 = 0;
  const lr = 2;
  for (let step = 0; step < 8000; step++) {
    let g1 = 0;
    let g2 = 0;
    let gb = 0;
    for (const p of pts) {
      const z = w1 * p.a + w2 * p.b + b0;
      const pr = 1 / (1 + Math.exp(-z));
      const y = p.cls === 1 ? 1 : 0;
      const e = pr - y;
      g1 += e * p.a;
      g2 += e * p.b;
      gb += e;
    }
    const n = pts.length;
    w1 -= lr * (g1 / n);
    w2 -= lr * (g2 / n);
    b0 -= lr * (gb / n);
  }
  const norm = Math.hypot(w1, w2);
  return { w1, w2, b0, u1: w1 / norm, u2: w2 / norm };
}

const DIRS = [
  { value: "probe", label: "probe direction" },
  { value: "causal", label: "the model’s direction" },
] as const;
type DirKey = (typeof DIRS)[number]["value"];

export function ProbeCausalityDemo() {
  const [lambda, setLambda] = useState(0);
  const [dir, setDir] = useState<DirKey>("probe");
  const [revealed, setRevealed] = useState(false);

  const pts = useMemo(() => makeData(), []);
  const probe = useMemo(() => trainProbe(pts), [pts]);

  // The model's behaviour: it emits " positive" iff the second coordinate is
  // above zero. Nothing else in the activation affects the output.
  const push = dir === "probe" ? [probe.u1, probe.u2] : [0, 1];

  const shifted = pts.map((p) => ({
    ...p,
    a: p.a + lambda * push[0],
    b: p.b + lambda * push[1],
  }));

  const baseBehaviour = pts.map((p) => p.b > 0);
  const nowBehaviour = shifted.map((p) => p.b > 0);
  const nowProbe = shifted.map(
    (p) => probe.w1 * p.a + probe.w2 * p.b + probe.b0 > 0,
  );

  const probeAcc =
    pts.filter(
      (p) => (probe.w1 * p.a + probe.w2 * p.b + probe.b0 > 0) === (p.cls === 1),
    ).length / pts.length;
  const modelAcc =
    baseBehaviour.filter((v, i) => v === (pts[i].cls === 1)).length /
    pts.length;

  const pctProbePos = nowProbe.filter(Boolean).length / pts.length;
  const pctModelPos = nowBehaviour.filter(Boolean).length / pts.length;
  const flipped =
    nowBehaviour.filter((v, i) => v !== baseBehaviour[i]).length / pts.length;

  const angle = (Math.atan2(probe.u2, probe.u1) * 180) / Math.PI;
  const angleToCausal = Math.abs(90 - angle);

  // geometry
  const W = 380;
  const H = 300;
  const pad = 26;
  const AX = 4.2;
  const AY = 3.0;
  const px = (a: number) => pad + ((a + AX) / (2 * AX)) * (W - 2 * pad);
  const py = (b: number) => H - pad - ((b + AY) / (2 * AY)) * (H - 2 * pad);

  // probe decision boundary: w1 a + w2 b + b0 = 0
  const boundary = () => {
    if (Math.abs(probe.w2) > Math.abs(probe.w1)) {
      const bAt = (a: number) => -(probe.w1 * a + probe.b0) / probe.w2;
      return { x1: px(-AX), y1: py(bAt(-AX)), x2: px(AX), y2: py(bAt(AX)) };
    }
    const aAt = (b: number) => -(probe.w2 * b + probe.b0) / probe.w1;
    return { x1: px(aAt(-AY)), y1: py(-AY), x2: px(aAt(AY)), y2: py(AY) };
  };
  const bd = boundary();

  const arrow = (ux: number, uy: number, len: number) => ({
    x1: px(0),
    y1: py(0),
    x2: px(ux * len),
    y2: py(uy * len),
  });
  const probeArrow = arrow(probe.u1, probe.u2, 2.4);
  const causalArrow = arrow(0, 1, 1.9);

  return (
    <WidgetShell
      title="Correlation vs causation: a probe that reads a direction the model ignores"
      subtitle="240 cached activations from sentiment prompts, projected to 2-D. A linear probe is trained on the points below. Then push every activation along a direction and watch two things that do not have to move together: what the probe reads, and what the model does."
      footer={
        <>
          Probe accuracy on the unshifted data:{" "}
          <span className="font-mono text-ink">
            {(probeAcc * 100).toFixed(1)}%
          </span>
          . The model&apos;s own behaviour matches the true label{" "}
          <span className="font-mono text-ink">
            {(modelAcc * 100).toFixed(1)}%
          </span>{" "}
          of the time — the probe is <em>more</em> accurate than the model,
          which is already a warning sign: it is reading something the model
          does not fully act on. The learned probe direction sits{" "}
          <span className="font-mono text-ink">
            {angleToCausal.toFixed(0)}°
          </span>{" "}
          away from the direction the model reads.
        </>
      }
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-xs">
          <Slider
            label="Push every activation by λ ·"
            value={lambda}
            min={-2.5}
            max={2.5}
            step={0.05}
            onChange={setLambda}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SegmentedControl
            label="along"
            options={
              revealed
                ? DIRS.map((d) => ({ value: d.value, label: d.label }))
                : [{ value: "probe" as DirKey, label: "probe direction" }]
            }
            value={dir}
            onChange={setDir}
          />
          <WidgetButton
            onClick={() => {
              if (revealed) {
                setDir("probe");
                setRevealed(false);
              } else {
                setRevealed(true);
              }
            }}
          >
            {revealed ? "Hide it again" : "Reveal the causal direction"}
          </WidgetButton>
          <WidgetButton
            onClick={() => {
              setLambda(0);
              setDir("probe");
            }}
          >
            Reset
          </WidgetButton>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_190px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[380px]"
          role="img"
          aria-label="Scatter of activations with the probe boundary and, once revealed, the causal direction"
        >
          <rect
            x={pad}
            y={pad}
            width={W - 2 * pad}
            height={H - 2 * pad}
            fill="var(--surface-2)"
            rx={6}
          />
          <line
            x1={px(-AX)}
            x2={px(AX)}
            y1={py(0)}
            y2={py(0)}
            stroke="var(--border)"
          />
          <line
            x1={px(0)}
            x2={px(0)}
            y1={py(-AY)}
            y2={py(AY)}
            stroke="var(--border)"
          />

          {/* probe decision boundary */}
          <line
            x1={bd.x1}
            y1={bd.y1}
            x2={bd.x2}
            y2={bd.y2}
            stroke="var(--series-3)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />

          {shifted.map((p, i) => (
            <circle
              key={i}
              cx={px(Math.max(-AX, Math.min(AX, p.a)))}
              cy={py(Math.max(-AY, Math.min(AY, p.b)))}
              r={3.4}
              fill={
                nowBehaviour[i] ? "var(--series-1)" : "var(--series-2)"
              }
              fillOpacity={0.75}
              stroke={p.cls === 1 ? "var(--series-1)" : "var(--series-2)"}
              strokeWidth={1.2}
            />
          ))}

          <defs>
            <marker
              id="probe-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="var(--series-3)" />
            </marker>
            <marker
              id="causal-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="var(--series-5)" />
            </marker>
          </defs>
          <line
            x1={probeArrow.x1}
            y1={probeArrow.y1}
            x2={probeArrow.x2}
            y2={probeArrow.y2}
            stroke="var(--series-3)"
            strokeWidth={2.5}
            markerEnd="url(#probe-arrow)"
          />
          {revealed ? (
            <line
              x1={causalArrow.x1}
              y1={causalArrow.y1}
              x2={causalArrow.x2}
              y2={causalArrow.y2}
              stroke="var(--series-5)"
              strokeWidth={2.5}
              markerEnd="url(#causal-arrow)"
            />
          ) : null}
          <text
            x={W - pad}
            y={H - 8}
            textAnchor="end"
            fontSize={10}
            className="font-mono"
            fill="var(--text-muted)"
          >
            activation, 2-D projection
          </text>
        </svg>

        <div className="space-y-3 text-[13px]">
          <div>
            <div className="text-ink-muted">Probe says “positive”</div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pctProbePos * 100}%`,
                  background: "var(--series-3)",
                }}
              />
            </div>
            <div className="font-mono text-ink">
              {(pctProbePos * 100).toFixed(0)}% of examples
            </div>
          </div>
          <div>
            <div className="text-ink-muted">Model outputs “ positive”</div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pctModelPos * 100}%`,
                  background: "var(--series-1)",
                }}
              />
            </div>
            <div className="font-mono text-ink">
              {(pctModelPos * 100).toFixed(0)}% of examples
            </div>
          </div>
          <div className="rounded-lg border border-borderline bg-surface-2 px-3 py-2">
            <div className="text-ink-muted">Behaviour changed on</div>
            <div className="font-mono text-[15px] text-ink">
              {(flipped * 100).toFixed(0)}%
            </div>
            <div className="text-ink-muted">of examples</div>
          </div>
          <div className="text-[12px] leading-5 text-ink-muted">
            <span style={{ color: "var(--series-3)" }}>▬</span> probe direction
            &amp; its boundary
            <br />
            {revealed ? (
              <>
                <span style={{ color: "var(--series-5)" }}>▬</span> direction the
                model reads
                <br />
              </>
            ) : null}
            Fill = what the model outputs now. Ring = the true label.
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
