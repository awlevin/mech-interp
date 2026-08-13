"use client";

import { useMemo, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/** Non-convex 1D loss with a local minimum, a global minimum, and a plateau. */
function loss(x: number): number {
  return (
    0.06 * x * x +
    Math.sin(1.4 * x) * 0.9 +
    0.35 * Math.cos(3.1 * x) +
    1.6
  );
}
function grad(x: number): number {
  const h = 1e-4;
  return (loss(x + h) - loss(x - h)) / (2 * h);
}

const X_MIN = -6;
const X_MAX = 6;
const START_X = -4.6;

export function GradientDescentExplorer() {
  const [lr, setLr] = useState(0.3);
  const [path, setPath] = useState<number[]>([START_X]);
  const x = path[path.length - 1];

  const step = () =>
    setPath((p) => {
      const cur = p[p.length - 1];
      const next = cur - lr * grad(cur);
      return [...p, Math.max(X_MIN - 2, Math.min(X_MAX + 2, next))];
    });
  const run = () =>
    setPath((p) => {
      let cur = p[p.length - 1];
      const out = [...p];
      for (let i = 0; i < 40; i++) {
        cur = cur - lr * grad(cur);
        cur = Math.max(X_MIN - 2, Math.min(X_MAX + 2, cur));
        out.push(cur);
      }
      return out;
    });
  const reset = () => setPath([START_X]);

  const W = 480;
  const H = 220;
  const pad = 18;
  const yMax = 4.2;
  const toPx = (px: number, py: number): [number, number] => [
    pad + ((px - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * pad),
    H - pad - (py / yMax) * (H - 2 * pad),
  ];

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const px = X_MIN + (i / 240) * (X_MAX - X_MIN);
      const [cx, cy] = toPx(px, loss(px));
      pts.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
    }
    return pts.join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bx, by] = toPx(x, loss(x));

  return (
    <WidgetShell
      title="Gradient descent on a bumpy loss"
      subtitle="Step the ball downhill. Small learning rate: stuck in the local minimum. Large: it overshoots and bounces. Find a rate that escapes the first valley and settles in the global one."
      footer={
        <>
          Position <span className="font-mono text-ink">x = {x.toFixed(2)}</span>,
          loss <span className="font-mono text-ink">{loss(x).toFixed(3)}</span>,
          gradient <span className="font-mono text-ink">{grad(x).toFixed(3)}</span>,
          steps <span className="font-mono text-ink">{path.length - 1}</span>.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Slider
            label="Learning rate η"
            value={lr}
            min={0.01}
            max={2}
            step={0.01}
            onChange={setLr}
            format={(v) => v.toFixed(2)}
          />
        </div>
        <div className="flex gap-2">
          <WidgetButton primary onClick={step}>
            Step
          </WidgetButton>
          <WidgetButton onClick={run}>Run ×40</WidgetButton>
          <WidgetButton onClick={reset}>Reset</WidgetButton>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[480px]"
        role="img"
        aria-label="Loss curve with gradient descent trajectory"
      >
        <polyline
          points={curve}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={2}
        />
        {/* trajectory */}
        {path.slice(-30).map((px, i, arr) => {
          const [cx, cy] = toPx(
            Math.max(X_MIN, Math.min(X_MAX, px)),
            loss(px),
          );
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3}
              fill="var(--series-2)"
              opacity={0.15 + (0.5 * i) / arr.length}
            />
          );
        })}
        <circle cx={bx} cy={by} r={7} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={2} />
        <text x={pad} y={H - 4} fontSize={11} fill="var(--text-muted)" className="font-mono">
          parameter x →
        </text>
        <text x={pad} y={14} fontSize={11} fill="var(--text-muted)" className="font-mono">
          loss ↑
        </text>
      </svg>
    </WidgetShell>
  );
}
