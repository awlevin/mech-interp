"use client";

import { useMemo, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Goodhart in a box.
 *
 * A recommender agent optimizes a *proxy* reward ("time on page"). It has five
 * levers it can pull. Each lever costs effort to find and exploit, has
 * diminishing returns, and contributes differently to the proxy and to the
 * thing we actually wanted (readers who end up better informed).
 *
 * The agent is a rational optimizer: it spends effort wherever the marginal
 * proxy-per-effort is highest. Cheap, honest levers get used first. As those
 * saturate, the only remaining marginal proxy lives in the expensive, harmful
 * levers — so more optimization pressure necessarily means more hacking. That
 * is the whole mechanism; nothing is hand-drawn.
 *
 * Water-filling closed form: at marginal-value threshold λ, lever k is used to
 * fraction u_k = clamp(1 − λ·C_k / P_k). Pressing "optimize harder" lowers λ.
 * The KL leash is a floor on λ: a penalty of β per unit of deviation makes any
 * lever with marginal value below β not worth pulling.
 */

type Lever = {
  name: string;
  what: string;
  /** marginal proxy reward at zero usage */
  P: number;
  /** marginal true value at zero usage */
  T: number;
  /** effort cost per unit of usage — how hard the lever is to find */
  C: number;
};

const LEVERS: Lever[] = [
  { name: "Match reader interests", what: "show people stories they care about", P: 1.0, T: 1.0, C: 1.0 },
  { name: "Write better summaries", what: "make the first paragraph actually informative", P: 0.8, T: 0.6, C: 1.0 },
  { name: "Autoplay the next item", what: "start the follow-up before they can leave", P: 1.2, T: 0.05, C: 2.0 },
  { name: "Outrage-tuned headlines", what: "reframe every story as a betrayal", P: 1.6, T: -1.0, C: 4.0 },
  { name: "Infinite scroll, variable rewards", what: "never let the page end", P: 2.2, T: -2.2, C: 8.0 },
];

const STEPS = 24;
/** λ after `i` presses of "optimize harder", before the leash is applied. */
const lambdaAt = (i: number) => 1 - i / STEPS;

type Snapshot = { proxy: number; truth: number; effort: number; u: number[] };

function evaluate(lambda: number): Snapshot {
  let proxy = 0;
  let truth = 0;
  let effort = 0;
  const u = LEVERS.map((L) => {
    const x = Math.max(0, Math.min(1, 1 - (lambda * L.C) / L.P));
    // ∫₀ˣ P(1−t) dt = P(x − x²/2)
    proxy += L.P * (x - (x * x) / 2);
    truth += L.T * (x - (x * x) / 2);
    effort += L.C * x;
    return x;
  });
  return { proxy, truth, effort, u };
}

/** Normalizers so both axes read as a 0–100 index against their own best. */
const PROXY_MAX = evaluate(0).proxy;
const TRUTH_MAX = Math.max(...Array.from({ length: STEPS + 1 }, (_, i) => evaluate(lambdaAt(i)).truth));
const proxyIdx = (s: Snapshot) => (100 * s.proxy) / PROXY_MAX;
const truthIdx = (s: Snapshot) => (100 * s.truth) / TRUTH_MAX;

function headline(u: number[]): { title: string; sub: string } {
  if (u[4] > 0.05)
    return {
      title: "They voted while you slept — and 47 more stories you’ll hate",
      sub: "keep scrolling · you have 12 unread outrages · next in 2…",
    };
  if (u[3] > 0.05)
    return {
      title: "Inside the budget betrayal nobody warned you about",
      sub: "council members refuse to explain · up next in 3…",
    };
  if (u[2] > 0.05)
    return {
      title: "City council approves the 2026 budget — what changes for your rent",
      sub: "up next in 3…",
    };
  if (u[0] > 0.05)
    return {
      title: "City council approves the 2026 budget — the three line items that affect your rent",
      sub: "4 min read · sourced from the meeting minutes",
    };
  return { title: "City council approves the 2026 budget", sub: "wire copy, unranked" };
}

export function RewardHackingPlayground() {
  const [press, setPress] = useState(0);
  const [beta, setBeta] = useState(0);

  const lambda = Math.max(lambdaAt(press), beta);
  const leashed = beta > lambdaAt(press);
  const cur = useMemo(() => evaluate(lambda), [lambda]);

  /** Curve revealed only as far as the learner has pushed. */
  const traversed = useMemo(() => {
    const pts: { i: number; proxy: number; truth: number }[] = [];
    for (let i = 0; i <= press; i++) {
      const s = evaluate(Math.max(lambdaAt(i), beta));
      pts.push({ i, proxy: proxyIdx(s), truth: truthIdx(s) });
    }
    return pts;
  }, [press, beta]);

  const W = 470;
  const H = 210;
  const padL = 34;
  const padR = 10;
  const padT = 12;
  const padB = 26;
  const yLo = -128;
  const yHi = 108;
  const px = (i: number) => padL + (i / STEPS) * (W - padL - padR);
  const py = (v: number) => padT + ((yHi - v) / (yHi - yLo)) * (H - padT - padB);
  const line = (key: "proxy" | "truth") =>
    traversed.map((p) => `${px(p.i).toFixed(1)},${py(p[key]).toFixed(1)}`).join(" ");

  const head = headline(cur.u);
  const peaked = truthIdx(cur) < 99.5 && press > 14;

  return (
    <WidgetShell
      title="Reward hacking: optimize a proxy until it breaks"
      subtitle={
        <>
          The agent maximizes <strong>time on page</strong>. What we actually
          wanted is <strong>readers who end up better informed</strong>. Press
          &ldquo;optimize harder&rdquo; and watch the two come apart.
        </>
      }
      footer={
        <>
          Proxy reward{" "}
          <span className="font-mono text-ink">{proxyIdx(cur).toFixed(0)}</span>,
          true value{" "}
          <span className="font-mono text-ink">{truthIdx(cur).toFixed(0)}</span>,
          effort spent{" "}
          <span className="font-mono text-ink">{cur.effort.toFixed(2)}</span>,
          marginal value threshold λ ={" "}
          <span className="font-mono text-ink">{lambda.toFixed(2)}</span>.
          {leashed ? (
            <>
              {" "}
              <span className="text-good">The KL leash is binding</span> — every
              remaining lever is worth less than β per unit of deviation, so the
              optimizer stops.
            </>
          ) : peaked ? (
            <>
              {" "}
              <span className="text-critical">
                True value is past its peak
              </span>{" "}
              and still falling, while the proxy keeps improving. Nothing in the
              training signal can see this.
            </>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <WidgetButton primary onClick={() => setPress((p) => Math.min(STEPS, p + 1))}>
            Optimize harder
          </WidgetButton>
          <WidgetButton onClick={() => setPress((p) => Math.max(0, p - 1))}>
            Back off
          </WidgetButton>
          <WidgetButton onClick={() => { setPress(0); setBeta(0); }}>Reset</WidgetButton>
        </div>
        <div className="w-56">
          <Slider
            label="KL leash strength β"
            value={beta}
            min={0}
            max={1}
            step={0.02}
            onChange={setBeta}
            format={(v) => (v === 0 ? "off" : v.toFixed(2))}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[470px]"
            role="img"
            aria-label={`Proxy reward index ${proxyIdx(cur).toFixed(0)} and true value index ${truthIdx(cur).toFixed(0)} after ${press} rounds of optimization`}
          >
            {/* zero line + gridlines */}
            {[100, 50, 0, -50, -100].map((v) => (
              <g key={v}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={py(v)}
                  y2={py(v)}
                  stroke="var(--border)"
                  strokeWidth={v === 0 ? 1.5 : 1}
                />
                <text
                  x={padL - 5}
                  y={py(v) + 3.5}
                  textAnchor="end"
                  fontSize={9}
                  fill="var(--text-muted)"
                  className="font-mono"
                >
                  {v}
                </text>
              </g>
            ))}
            {press > 0 ? (
              <>
                <polyline points={line("truth")} fill="none" stroke="var(--series-2)" strokeWidth={2.5} />
                <polyline points={line("proxy")} fill="none" stroke="var(--series-1)" strokeWidth={2.5} />
                <circle cx={px(press)} cy={py(truthIdx(cur))} r={4.5} fill="var(--series-2)" />
                <circle cx={px(press)} cy={py(proxyIdx(cur))} r={4.5} fill="var(--series-1)" />
              </>
            ) : (
              <text x={padL + 12} y={py(20)} fontSize={11} fill="var(--text-muted)">
                press “optimize harder” to trace the curves
              </text>
            )}
            <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="var(--text-muted)" className="font-mono">
              optimization pressure →
            </text>
            <text x={padL} y={H - 6} fontSize={10} fill="var(--series-1)" className="font-mono">
              proxy
            </text>
            <text x={padL + 44} y={H - 6} fontSize={10} fill="var(--series-2)" className="font-mono">
              true value
            </text>
          </svg>

          <div className="mt-3 rounded-lg border border-borderline bg-surface-2 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-ink-muted">
              What the feed looks like now
            </div>
            <div className="mt-1 text-[14px] font-semibold leading-6 text-ink">
              {head.title}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-muted">{head.sub}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="text-[11px] uppercase tracking-wider text-ink-muted">
            Effort allocated per lever
          </div>
          {LEVERS.map((L, k) => {
            const frac = cur.u[k];
            const harmful = L.T < 0;
            const color = harmful ? "var(--critical)" : L.T < 0.3 ? "var(--warning)" : "var(--good)";
            return (
              <div key={L.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] leading-4 text-ink-secondary">{L.name}</span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {(frac * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${frac * 100}%`, background: color }}
                  />
                </div>
                <div className="mt-0.5 text-[11px] leading-4 text-ink-muted">
                  {L.what} · true value{" "}
                  <span className="font-mono">{L.T > 0 ? `+${L.T}` : L.T}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}
