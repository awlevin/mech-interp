"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

const W = 440;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const SCALE = 44; // pixels per unit
const XMAX = 4.5; // 4.5 * 44 = 198 px, inside the 220 px half-width
const YMAX = 3;

const START_V = { x: 2.4, y: 1.5 };
const START_ANGLE = 22;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const px = (x: number, y: number): [number, number] => [CX + x * SCALE, CY - y * SCALE];

/**
 * Drag a vector; watch its shadow (orthogonal projection) on a 1-D subspace.
 * The dot product is the readout that ties the picture to the algebra.
 */
export function ProjectionPlayground() {
  const [v, setV] = useState(START_V);
  const [angle, setAngle] = useState(START_ANGLE);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const rad = (angle * Math.PI) / 180;
  const u = { x: Math.cos(rad), y: Math.sin(rad) };

  const dot = v.x * u.x + v.y * u.y;
  const proj = { x: dot * u.x, y: dot * u.y };
  const resid = { x: v.x - proj.x, y: v.y - proj.y };
  const vLen = Math.hypot(v.x, v.y);
  const rLen = Math.hypot(resid.x, resid.y);
  const cos = vLen > 1e-9 ? dot / vLen : 0;
  const theta = (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;

  const pointTo = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    setV({
      x: clamp((sx - CX) / SCALE, -XMAX, XMAX),
      y: clamp((CY - sy) / SCALE, -YMAX, YMAX),
    });
  };

  const reset = () => {
    setV(START_V);
    setAngle(START_ANGLE);
  };

  // subspace line, extended across the whole canvas
  const t = 20;
  const [lx1, ly1] = px(-u.x * t, -u.y * t);
  const [lx2, ly2] = px(u.x * t, u.y * t);
  const [vx, vy] = px(v.x, v.y);
  const [pxp, pyp] = px(proj.x, proj.y);
  const [ux, uy] = px(u.x, u.y);

  const cols = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const rows = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <WidgetShell
      title="Projection playground"
      subtitle="Drag anywhere in the panel to move the blue vector; the slider rotates the 1-D subspace (the dashed line). Orange is the shadow v falls on that line; aqua is what is left over."
      footer={
        <>
          <span className="font-mono text-ink">v · û = {dot.toFixed(2)}</span> —
          the signed length of the shadow. Angle between them{" "}
          <span className="font-mono text-ink">{theta.toFixed(0)}°</span>, cosine
          similarity <span className="font-mono text-ink">{cos.toFixed(2)}</span>.
          Leftover length <span className="font-mono text-ink">{rLen.toFixed(2)}</span>,
          and the leftover&apos;s own dot product with û is{" "}
          <span className="font-mono text-ink">
            {(resid.x * u.x + resid.y * u.y).toFixed(2)}
          </span>{" "}
          — always zero, whatever you do.
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[210px_1fr]">
        <div className="space-y-3">
          <Slider
            label="subspace angle"
            value={angle}
            min={-90}
            max={90}
            step={1}
            onChange={setAngle}
            format={(x) => `${x.toFixed(0)}°`}
          />
          <Slider
            label="v ₓ"
            value={v.x}
            min={-XMAX}
            max={XMAX}
            step={0.05}
            onChange={(x) => setV((p) => ({ ...p, x }))}
            format={(x) => x.toFixed(2)}
          />
          <Slider
            label="v ᵧ"
            value={v.y}
            min={-YMAX}
            max={YMAX}
            step={0.05}
            onChange={(y) => setV((p) => ({ ...p, y }))}
            format={(x) => x.toFixed(2)}
          />
          <div className="pt-1">
            <WidgetButton onClick={reset}>Reset</WidgetButton>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2 font-mono text-[12px] text-ink-muted">
            <dt>v</dt>
            <dd className="text-ink">
              ({v.x.toFixed(2)}, {v.y.toFixed(2)}), |v| = {vLen.toFixed(2)}
            </dd>
            <dt>û</dt>
            <dd className="text-ink">
              ({u.x.toFixed(2)}, {u.y.toFixed(2)})
            </dd>
            <dt>proj</dt>
            <dd className="text-ink">
              ({proj.x.toFixed(2)}, {proj.y.toFixed(2)})
            </dd>
            <dt>resid</dt>
            <dd className="text-ink">
              ({resid.x.toFixed(2)}, {resid.y.toFixed(2)})
            </dd>
          </dl>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={`w-full max-w-[440px] touch-none select-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          role="img"
          aria-label={`A vector at (${v.x.toFixed(2)}, ${v.y.toFixed(
            2,
          )}) projected onto a line at ${angle} degrees; the projection has signed length ${dot.toFixed(
            2,
          )}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            pointTo(e);
          }}
          onPointerMove={(e) => {
            if (dragging) pointTo(e);
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
        >
          <defs>
            <marker
              id="pp-arrow-1"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="var(--series-1)" />
            </marker>
            <marker
              id="pp-arrow-2"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="var(--series-2)" />
            </marker>
            <marker
              id="pp-arrow-3"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L7,3 L0,6 z" fill="var(--series-3)" />
            </marker>
          </defs>

          <rect x={0} y={0} width={W} height={H} fill="var(--surface-2)" rx={8} />
          {cols.map((g) => (
            <line
              key={`c${g}`}
              x1={px(g, -YMAX)[0]}
              y1={px(g, -YMAX)[1]}
              x2={px(g, YMAX)[0]}
              y2={px(g, YMAX)[1]}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          {rows.map((g) => (
            <line
              key={`r${g}`}
              x1={px(-XMAX, g)[0]}
              y1={px(-XMAX, g)[1]}
              x2={px(XMAX, g)[0]}
              y2={px(XMAX, g)[1]}
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          <line
            x1={px(-XMAX, 0)[0]}
            y1={CY}
            x2={px(XMAX, 0)[0]}
            y2={CY}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
          />
          <line
            x1={CX}
            y1={px(0, -YMAX)[1]}
            x2={CX}
            y2={px(0, YMAX)[1]}
            stroke="var(--border-strong)"
            strokeWidth={1.5}
          />

          {/* the subspace */}
          <line
            x1={lx1}
            y1={ly1}
            x2={lx2}
            y2={ly2}
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          {/* residual: from the tip of the projection back up to v */}
          <line
            x1={pxp}
            y1={pyp}
            x2={vx}
            y2={vy}
            stroke="var(--series-3)"
            strokeWidth={2.5}
            markerEnd="url(#pp-arrow-3)"
            opacity={0.9}
          />
          {/* projection */}
          <line
            x1={CX}
            y1={CY}
            x2={pxp}
            y2={pyp}
            stroke="var(--series-2)"
            strokeWidth={4}
            markerEnd="url(#pp-arrow-2)"
          />
          {/* unit vector of the subspace */}
          <line
            x1={CX}
            y1={CY}
            x2={ux}
            y2={uy}
            stroke="var(--text-secondary)"
            strokeWidth={2}
          />
          <circle cx={ux} cy={uy} r={3} fill="var(--text-secondary)" />
          {/* v */}
          <line
            x1={CX}
            y1={CY}
            x2={vx}
            y2={vy}
            stroke="var(--series-1)"
            strokeWidth={3}
            markerEnd="url(#pp-arrow-1)"
          />
          <circle
            cx={vx}
            cy={vy}
            r={7}
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth={2}
          />

          <text
            x={vx + 10}
            y={vy - 8}
            fontSize={12}
            fill="var(--text-primary)"
            className="font-mono"
          >
            v
          </text>
          <text
            x={ux + 8}
            y={uy + 16}
            fontSize={12}
            fill="var(--text-secondary)"
            className="font-mono"
          >
            û
          </text>
          <text
            x={pxp + 6}
            y={pyp + 18}
            fontSize={12}
            fill="var(--text-primary)"
            className="font-mono"
          >
            (v·û)û
          </text>
          <text
            x={10}
            y={H - 10}
            fontSize={11}
            fill="var(--text-muted)"
            className="font-mono"
          >
            drag to move v
          </text>
        </svg>
      </div>
    </WidgetShell>
  );
}
