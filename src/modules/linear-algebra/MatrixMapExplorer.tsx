"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

type Mat = { a: number; b: number; c: number; d: number };

const PRESETS: { name: string; m: Mat; blurb: string }[] = [
  { name: "identity", m: { a: 1, b: 0, c: 0, d: 1 }, blurb: "nothing moves" },
  {
    name: "rotate 40°",
    m: { a: 0.77, b: -0.64, c: 0.64, d: 0.77 },
    blurb: "lengths and angles preserved — both singular values are 1",
  },
  {
    name: "shear",
    m: { a: 1, b: 1.2, c: 0, d: 1 },
    blurb: "area preserved (det = 1) but directions are stretched unevenly",
  },
  {
    name: "rank 1",
    m: { a: 1, b: 2, c: 0.5, d: 1 },
    blurb: "the outer product [1, 0.5]ᵀ [1, 2] — the whole plane lands on one line",
  },
  {
    name: "projection",
    m: { a: 1, b: 0, c: 0, d: 0 },
    blurb: "keeps the x-component, deletes the y-component — information is gone for good",
  },
  {
    name: "squash",
    m: { a: 1.4, b: 0, c: 0, d: 0.15 },
    blurb: "nearly rank 1: σ₂ is small but not zero, so a little signal survives",
  },
];

/** Closed-form 2×2 SVD: M = U Σ Vᵀ with U = rot(phi), V = rot(theta). */
function svd2(m: Mat) {
  const E = (m.a + m.d) / 2;
  const F = (m.a - m.d) / 2;
  const G = (m.c + m.b) / 2;
  const H = (m.c - m.b) / 2;
  const Q = Math.hypot(E, H);
  const R = Math.hypot(F, G);
  const s1 = Q + R;
  const s2 = Math.abs(Q - R);
  const a1 = Math.atan2(G, F);
  const a2 = Math.atan2(H, E);
  const theta = (a2 - a1) / 2; // right rotation (input space)
  const phi = (a2 + a1) / 2; // left rotation (output space)
  return { s1, s2, theta, phi };
}

const PANEL = 224;
const CENTER = PANEL / 2;
const SCALE = 32; // pixels per unit
const px = (x: number, y: number): [number, number] => [
  CENTER + x * SCALE,
  CENTER - y * SCALE,
];

const SERIES = ["--series-1", "--series-2", "--series-3", "--series-4"];

function Panel({
  label,
  children,
  ariaLabel,
  idPrefix,
}: {
  label: string;
  children: ReactNode;
  ariaLabel: string;
  idPrefix: string;
}) {
  const ticks = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${PANEL} ${PANEL}`}
        className="w-full max-w-[224px]"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {SERIES.map((s, i) => (
            <marker
              key={s}
              id={`${idPrefix}-a${i + 1}`}
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill={`var(${s})`} />
            </marker>
          ))}
        </defs>
        <rect x={0} y={0} width={PANEL} height={PANEL} rx={8} fill="var(--surface-2)" />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={px(t, -3.4)[0]}
              y1={px(t, -3.4)[1]}
              x2={px(t, 3.4)[0]}
              y2={px(t, 3.4)[1]}
              stroke="var(--border)"
            />
            <line
              x1={px(-3.4, t)[0]}
              y1={px(-3.4, t)[1]}
              x2={px(3.4, t)[0]}
              y2={px(3.4, t)[1]}
              stroke="var(--border)"
            />
          </g>
        ))}
        <line
          x1={px(-3.4, 0)[0]}
          y1={CENTER}
          x2={px(3.4, 0)[0]}
          y2={CENTER}
          stroke="var(--border-strong)"
        />
        <line
          x1={CENTER}
          y1={px(0, -3.4)[1]}
          x2={CENTER}
          y2={px(0, 3.4)[1]}
          stroke="var(--border-strong)"
        />
        {children}
      </svg>
      <figcaption className="mt-1 text-center font-mono text-[12px] text-ink-muted">
        {label}
      </figcaption>
    </figure>
  );
}

function Arrow({
  x,
  y,
  color,
  label,
  width = 3,
  marker,
}: {
  x: number;
  y: number;
  color: string;
  label?: string;
  width?: number;
  marker: string;
}) {
  const [ex, ey] = px(x, y);
  return (
    <g>
      <line
        x1={CENTER}
        y1={CENTER}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={width}
        markerEnd={`url(#${marker})`}
      />
      {label ? (
        <text
          x={ex + 6}
          y={ey - 6}
          fontSize={11}
          fill="var(--text-primary)"
          className="font-mono"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/**
 * A 2×2 matrix as a map of the plane: the unit circle becomes an ellipse whose
 * axes are the singular values. Rank collapse is visible as the ellipse
 * flattening to a segment.
 */
export function MatrixMapExplorer() {
  const [m, setM] = useState<Mat>(PRESETS[2].m);
  const [note, setNote] = useState<string | null>(PRESETS[2].blurb);
  const set = (k: keyof Mat) => (v: number) => {
    setNote(null);
    setM((p) => ({ ...p, [k]: v }));
  };

  const { s1, s2, theta } = svd2(m);
  const det = m.a * m.d - m.b * m.c;
  const rank = s1 < 1e-6 ? 0 : s2 < 0.02 ? 1 : 2;

  // right singular vectors (input space) and their images (output space)
  const v1 = { x: Math.cos(theta), y: Math.sin(theta) };
  const v2 = { x: -Math.sin(theta), y: Math.cos(theta) };
  const apply = (v: { x: number; y: number }) => ({
    x: m.a * v.x + m.b * v.y,
    y: m.c * v.x + m.d * v.y,
  });
  const mv1 = apply(v1);
  const mv2 = apply(v2);

  const circle: string[] = [];
  const ellipse: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const cx = Math.cos(t);
    const cy = Math.sin(t);
    const [a1, b1] = px(cx, cy);
    circle.push(`${a1.toFixed(1)},${b1.toFixed(1)}`);
    const [a2, b2] = px(m.a * cx + m.b * cy, m.c * cx + m.d * cy);
    ellipse.push(`${a2.toFixed(1)},${b2.toFixed(1)}`);
  }

  return (
    <WidgetShell
      title="A matrix is a map of the plane"
      subtitle="The left panel is input space, the right is output space. Watch where the unit circle goes: it always becomes an ellipse, and the ellipse's two axis lengths are the singular values σ₁ ≥ σ₂."
      footer={
        <>
          det = <span className="font-mono text-ink">{det.toFixed(2)}</span> (area
          scale factor), σ₁ ={" "}
          <span className="font-mono text-ink">{s1.toFixed(2)}</span>, σ₂ ={" "}
          <span className="font-mono text-ink">{s2.toFixed(2)}</span>, rank ={" "}
          <span className="font-mono text-ink">{rank}</span>. Condition number
          σ₁/σ₂ ={" "}
          <span className="font-mono text-ink">
            {s2 > 1e-6 ? (s1 / s2).toFixed(1) : "∞"}
          </span>{" "}
          — how much the map stretches its best direction relative to its worst.
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Slider label="a" value={m.a} min={-2} max={2} step={0.05} onChange={set("a")} format={(v) => v.toFixed(2)} />
            <Slider label="b" value={m.b} min={-2} max={2} step={0.05} onChange={set("b")} format={(v) => v.toFixed(2)} />
            <Slider label="c" value={m.c} min={-2} max={2} step={0.05} onChange={set("c")} format={(v) => v.toFixed(2)} />
            <Slider label="d" value={m.d} min={-2} max={2} step={0.05} onChange={set("d")} format={(v) => v.toFixed(2)} />
          </div>
          <div className="rounded-lg bg-surface-2 p-3 font-mono text-[12px] leading-5 text-ink">
            M = [ {m.a.toFixed(2)} {m.b.toFixed(2)} ; {m.c.toFixed(2)}{" "}
            {m.d.toFixed(2)} ]
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <WidgetButton
                key={p.name}
                onClick={() => {
                  setM(p.m);
                  setNote(p.blurb);
                }}
              >
                {p.name}
              </WidgetButton>
            ))}
          </div>
          {note ? (
            <p className="text-[12px] leading-5 text-ink-secondary">{note}</p>
          ) : null}
          <p className="text-[12px] leading-5 text-ink-muted">
            {rank === 2
              ? "Full rank: the circle keeps its interior, so nothing is lost — the map is invertible."
              : rank === 1
                ? "Rank 1: the circle has collapsed onto a line. Every input maps into a single direction, and the perpendicular direction is erased."
                : "Rank 0: the matrix is all zeros."}
          </p>
        </div>

        {/* On phones the panels come first and sit side by side, so the
            picture and the sliders share the first screen. */}
        <div className="order-first grid grid-cols-2 gap-3 sm:gap-4 lg:order-none">
          <Panel
            idPrefix="mm-in"
            label="input space"
            ariaLabel="Unit circle in input space with the two right singular directions"
          >
            <polyline
              points={circle.join(" ")}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={2}
            />
            <Arrow x={v1.x} y={v1.y} color="var(--series-1)" marker="mm-in-a1" label="v₁" />
            <Arrow x={v2.x} y={v2.y} color="var(--series-2)" marker="mm-in-a2" label="v₂" />
            <Arrow x={1} y={0} color="var(--series-3)" marker="mm-in-a3" width={2} label="ê₁" />
            <Arrow x={0} y={1} color="var(--series-4)" marker="mm-in-a4" width={2} label="ê₂" />
          </Panel>

          <Panel
            idPrefix="mm-out"
            label="output space (after M)"
            ariaLabel={`Image of the unit circle under the matrix: an ellipse with semi-axes ${s1.toFixed(2)} and ${s2.toFixed(2)}`}
          >
            <polyline
              points={ellipse.join(" ")}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={2}
            />
            <Arrow
              x={mv1.x}
              y={mv1.y}
              color="var(--series-1)"
              marker="mm-out-a1"
              label="Mv₁ (σ₁)"
            />
            <Arrow
              x={mv2.x}
              y={mv2.y}
              color="var(--series-2)"
              marker="mm-out-a2"
              label="Mv₂ (σ₂)"
            />
            <Arrow x={m.a} y={m.c} color="var(--series-3)" marker="mm-out-a3" width={2} label="Mê₁" />
            <Arrow x={m.b} y={m.d} color="var(--series-4)" marker="mm-out-a4" width={2} label="Mê₂" />
          </Panel>
        </div>
      </div>
    </WidgetShell>
  );
}
