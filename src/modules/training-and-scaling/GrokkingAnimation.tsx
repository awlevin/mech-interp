"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Stylized grokking curves for a one-layer transformer on modular addition
 * mod 113 (the Nanda et al. 2023 setup). The shapes — train accuracy saturating
 * early, test accuracy flat at chance for an order of magnitude of steps, then
 * a sharp jump, with the weight norm falling as the memorised solution is
 * cleaned up — reproduce the qualitative picture from that paper. The numbers
 * are hand-drawn, not logged from a real run.
 */

const CHANCE = 1 / 113;
const L_MIN = 1; // 10^1 steps
const L_MAX = 5; // 10^5 steps
const STEPS = 260;

function sig(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

type Frame = {
  l: number;
  step: number;
  train: number;
  test: number;
  norm: number;
};

const FRAMES: Frame[] = Array.from({ length: STEPS + 1 }, (_, i) => {
  const l = L_MIN + (i / STEPS) * (L_MAX - L_MIN);
  const train = CHANCE + (1 - CHANCE) * sig((l - 2.35) * 5.5);
  const test = CHANCE + (1 - CHANCE) * sig((l - 4.24) * 11);
  // grows while the model memorises, decays during cleanup
  const norm = 0.28 + 0.72 * sig((l - 2.1) * 4) - 0.62 * sig((l - 4.3) * 8);
  return { l, step: Math.pow(10, l), train, test, norm };
});

const PHASES: {
  from: number;
  to: number;
  label: string;
  short: string;
  blurb: string;
}[] = [
  {
    from: L_MIN,
    to: Math.log10(2e3),
    label: "Memorisation",
    short: "Memorisation",
    blurb:
      "Train accuracy shoots to 100% by memorising the training pairs. Test accuracy sits at chance (1/113 ≈ 0.9%). Nothing general has been learned yet.",
  },
  {
    from: Math.log10(2e3),
    to: Math.log10(1.2e4),
    label: "Circuit formation",
    short: "Circuit",
    blurb:
      "Train accuracy is pinned at 100%, so the visible curves look dead — but underneath, weight decay is trading memorised lookup for a general trig-identity algorithm. Progress measures that read the internals see it; accuracy does not.",
  },
  {
    from: Math.log10(1.2e4),
    to: Math.log10(3.5e4),
    label: "Cleanup",
    short: "Cleanup",
    blurb:
      "The memorisation circuit is deleted (weight norm falls) and test accuracy snaps to ~100%. This is the moment that looks like a sudden phase change from outside.",
  },
  {
    from: Math.log10(3.5e4),
    to: L_MAX,
    label: "Grokked",
    short: "Grokked",
    blurb:
      "The model now runs a clean, general algorithm — Fourier components and trig identities — that Nanda et al. reverse-engineered head-on.",
  },
];

const W = 480;
const H = 250;
const padL = 42;
const padR = 14;
const padT = 16;
const padB = 34;

const px = (l: number) =>
  padL + ((l - L_MIN) / (L_MAX - L_MIN)) * (W - padL - padR);
const py = (v: number) => H - padB - v * (H - padT - padB);

function pathTo(key: "train" | "test" | "norm", upto: number): string {
  const out: string[] = [];
  for (let i = 0; i <= upto; i++) {
    const f = FRAMES[i];
    out.push(`${px(f.l).toFixed(1)},${py(f[key]).toFixed(1)}`);
  }
  return out.join(" ");
}

export function GrokkingAnimation() {
  const [idx, setIdx] = useState(STEPS);
  const [playing, setPlaying] = useState(false);
  /** Mirror of `idx` so the animation loop can advance without re-subscribing. */
  const idxRef = useRef(STEPS);

  const setPos = useCallback((v: number) => {
    idxRef.current = v;
    setIdx(v);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let handle = 0;
    let last = 0;
    let cur = idxRef.current;
    const loop = (now: number) => {
      if (last === 0) last = now;
      const dt = now - last;
      last = now;
      cur += (dt / 1000) * (STEPS / 9); // ~9 s for a full run
      if (cur >= STEPS) {
        idxRef.current = STEPS;
        setIdx(STEPS);
        setPlaying(false);
        return;
      }
      idxRef.current = cur;
      setIdx(cur);
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [playing]);

  const i = Math.round(Math.min(idx, STEPS));
  const f = FRAMES[i];
  const phase = PHASES.find((p) => f.l >= p.from && f.l <= p.to) ?? PHASES[0];

  const play = () => {
    if (i >= STEPS) setPos(0);
    setPlaying(true);
  };

  return (
    <WidgetShell
      title="Grokking: memorisation → generalisation"
      subtitle="One-layer transformer, modular addition mod 113, heavy weight decay. Press play and watch the two accuracy curves come apart for an order of magnitude of training, then slam back together."
      footer={
        <>
          Step <span className="font-mono text-ink">{Math.round(f.step).toLocaleString()}</span>{" "}
          · train acc{" "}
          <span className="font-mono text-ink">{(f.train * 100).toFixed(1)}%</span>{" "}
          · test acc{" "}
          <span className="font-mono text-ink">{(f.test * 100).toFixed(1)}%</span>{" "}
          · <strong className="text-ink">{phase.label}</strong>. {phase.blurb}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <WidgetButton primary onClick={playing ? () => setPlaying(false) : play}>
            {playing ? "Pause" : i >= STEPS ? "Replay" : "Play"}
          </WidgetButton>
          <WidgetButton
            onClick={() => {
              setPlaying(false);
              setPos(0);
            }}
          >
            Reset
          </WidgetButton>
        </div>
        <div className="w-56">
          <Slider
            label="Scrub"
            value={i}
            min={0}
            max={STEPS}
            step={1}
            onChange={(v) => {
              setPlaying(false);
              setPos(v);
            }}
            format={(v) =>
              `${Math.round(FRAMES[Math.round(v)].step).toLocaleString()} steps`
            }
          />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[480px]"
        role="img"
        aria-label={`Accuracy versus training step on a log axis. Train accuracy reaches 100% early while test accuracy stays at chance, then jumps to 100% around step 20,000. Currently at step ${Math.round(f.step)}.`}
      >
        {/* phase bands */}
        {PHASES.map((p, n) => (
          <g key={p.label}>
            <rect
              x={px(p.from)}
              y={padT}
              width={px(p.to) - px(p.from)}
              height={H - padT - padB}
              fill="var(--surface-2)"
              opacity={n % 2 === 0 ? 0.55 : 0.25}
            />
          </g>
        ))}
        {/* y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={py(v)}
              y2={py(v)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={py(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              {v * 100}%
            </text>
          </g>
        ))}
        {/* x decades */}
        {[1, 2, 3, 4, 5].map((l) => (
          <g key={l}>
            <line
              x1={px(l)}
              x2={px(l)}
              y1={padT}
              y2={H - padB}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={px(l)}
              y={H - padB + 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              1e{l}
            </text>
          </g>
        ))}

        <polyline
          points={pathTo("norm", i)}
          fill="none"
          stroke="var(--series-3)"
          strokeWidth={1.75}
          strokeDasharray="5 3"
        />
        <polyline
          points={pathTo("train", i)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2.5}
        />
        <polyline
          points={pathTo("test", i)}
          fill="none"
          stroke="var(--series-2)"
          strokeWidth={2.5}
        />

        {/* playhead */}
        <line
          x1={px(f.l)}
          x2={px(f.l)}
          y1={padT}
          y2={H - padB}
          stroke="var(--text-muted)"
          strokeWidth={1}
        />
        <circle cx={px(f.l)} cy={py(f.train)} r={4} fill="var(--series-1)" />
        <circle cx={px(f.l)} cy={py(f.test)} r={4} fill="var(--series-2)" />

        {/* phase labels */}
        {PHASES.map((p) => (
          <text
            key={p.label}
            x={(px(p.from) + px(p.to)) / 2}
            y={padT + 12}
            textAnchor="middle"
            fontSize={9}
            fill="var(--text-muted)"
            className="font-mono"
          >
            {p.short}
          </text>
        ))}

        <text
          x={W - padR}
          y={H - 4}
          textAnchor="end"
          fontSize={10}
          fill="var(--text-muted)"
          className="font-mono"
        >
          training step (log) →
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: "var(--series-1)" }}
          />
          train accuracy
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: "var(--series-2)" }}
          />
          test accuracy
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: "var(--series-3)" }}
          />
          weight norm (normalised)
        </span>
      </div>
    </WidgetShell>
  );
}
