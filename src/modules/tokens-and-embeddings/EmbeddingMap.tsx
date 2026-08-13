"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

type Cat = "numbers" | "animals" | "punctuation" | "code" | "people";

type Point = {
  token: string;
  cat: Cat;
  x: number;
  y: number;
  anchor: "start" | "end";
};

const CAT_COLOR: Record<Cat, string> = {
  numbers: "var(--series-1)",
  people: "var(--series-2)",
  animals: "var(--series-3)",
  code: "var(--series-4)",
  punctuation: "var(--series-5)",
};

const CAT_LABEL: Record<Cat, string> = {
  numbers: "numbers",
  people: "people & roles",
  animals: "animals",
  code: "code keywords",
  punctuation: "punctuation",
};

/** Lay a cluster out on a small jittered grid so labels stay readable. */
function grid(
  tokens: string[],
  cat: Cat,
  cx: number,
  cy: number,
  cols = 3,
): Point[] {
  const rows = Math.ceil(tokens.length / cols);
  return tokens.map((token, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitter = (((i * 37) % 7) - 3) * 0.35;
    return {
      token,
      cat,
      x: cx + (col - (cols - 1) / 2) * 11 + jitter,
      y: cy - (row - (rows - 1) / 2) * 5.6 + jitter * 0.4,
      anchor: "start" as const,
    };
  });
}

const PAIRS: [string, string][] = [
  ["king", "queen"],
  ["man", "woman"],
  ["boy", "girl"],
  ["prince", "princess"],
  ["actor", "actress"],
  ["uncle", "aunt"],
];

/** The people cluster is laid out so every male→female offset is identical. */
const PEOPLE: Point[] = PAIRS.flatMap(([m, f], p) => {
  const cx = 45 + (p % 2) * 3;
  const cy = 61 - p * 4.4;
  return [
    { token: m, cat: "people" as const, x: cx - 5, y: cy, anchor: "end" as const },
    { token: f, cat: "people" as const, x: cx + 5, y: cy, anchor: "start" as const },
  ];
});

const POINTS: Point[] = [
  ...grid(
    ["1", "2", "3", "7", "42", "100", "1999", "0.5", "three", "seven", "twelve", "million"],
    "numbers",
    19,
    76,
  ),
  ...grid(
    ["cat", "dog", "horse", "mouse", "tiger", "whale", "eagle", "sheep", "rabbit", "salmon", "lizard", "beetle"],
    "animals",
    79,
    76,
  ),
  ...grid([".", ",", "!", "?", ";", ":", "(", ")", "—", "…"], "punctuation", 17, 20),
  ...grid(
    ["def", "return", "import", "class", "if", "else", "for", "while", "None", "True", "print", "lambda", "self", "except"],
    "code",
    80,
    20,
  ),
  ...PEOPLE,
];

const W = 470;
const H = 350;
const PAD = 26;
const sx = (x: number) => PAD + (x / 100) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - (y / 100) * (H - 2 * PAD);

function neighbours(p: Point, count = 3) {
  return POINTS.filter((q) => q !== p)
    .map((q) => ({ q, dist: Math.hypot(q.x - p.x, q.y - p.y) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);
}

type Overlay = "none" | "clusters" | "analogy";

const HULLS: { cat: Cat; cx: number; cy: number; rx: number; ry: number }[] = [
  { cat: "numbers", cx: 19, cy: 76, rx: 19, ry: 14 },
  { cat: "animals", cx: 79, cy: 76, rx: 19, ry: 14 },
  { cat: "punctuation", cx: 17, cy: 20, rx: 19, ry: 13 },
  { cat: "code", cx: 80, cy: 20, rx: 19, ry: 16 },
  { cat: "people", cx: 48, cy: 50, rx: 14, ry: 17 },
];

/**
 * An illustrative embedding-space map. The coordinates are hand-placed to show
 * the *kind* of structure real embedding matrices have — not a projection of
 * any actual model's weights. Distances here are the layout's own.
 */
export function EmbeddingMap() {
  const [overlay, setOverlay] = useState<Overlay>("clusters");
  const [activeToken, setActiveToken] = useState<string>("king");

  const active = useMemo(
    () => POINTS.find((p) => p.token === activeToken) ?? POINTS[0],
    [activeToken],
  );
  const near = useMemo(() => neighbours(active), [active]);
  const nearSet = useMemo(() => new Set(near.map((n) => n.q.token)), [near]);

  return (
    <WidgetShell
      title="Embedding-space map (illustrative)"
      subtitle="Hover or focus any token to see its nearest neighbours. These 60 tokens are hand-placed to show the shape of the structure real embeddings have — clusters by role, and a consistent offset between related pairs. It is a teaching diagram, not a projection of GPT-2's weights."
      footer={
        <>
          Nearest neighbours of{" "}
          <span className="font-mono text-ink">{active.token}</span>:{" "}
          {near.map((n, i) => (
            <span key={n.q.token}>
              <span className="font-mono text-ink">{n.q.token}</span>{" "}
              <span className="font-mono">({n.dist.toFixed(1)})</span>
              {i < near.length - 1 ? ", " : ""}
            </span>
          ))}
          . In a real model these distances come from cosine similarity between
          rows of the embedding matrix, and the clusters are learned, never
          designed.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <SegmentedControl<Overlay>
          label="overlay"
          value={overlay}
          onChange={setOverlay}
          options={[
            { value: "none", label: "points only" },
            { value: "clusters", label: "clusters" },
            { value: "analogy", label: "pair offsets" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          {(Object.keys(CAT_LABEL) as Cat[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CAT_COLOR[c] }}
              />
              {CAT_LABEL[c]}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[470px]"
        role="img"
        aria-label="Scatter map of sixty tokens grouped into clusters for numbers, animals, punctuation, code keywords, and people"
      >
        <defs>
          <marker id="em-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--series-5)" />
          </marker>
        </defs>
        <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--surface-2)" />

        {overlay === "clusters"
          ? HULLS.map((h) => (
              <g key={h.cat}>
                <ellipse
                  cx={sx(h.cx)}
                  cy={sy(h.cy)}
                  rx={(h.rx / 100) * (W - 2 * PAD)}
                  ry={(h.ry / 100) * (H - 2 * PAD)}
                  fill={CAT_COLOR[h.cat]}
                  opacity={0.09}
                  stroke={CAT_COLOR[h.cat]}
                  strokeOpacity={0.35}
                />
              </g>
            ))
          : null}

        {overlay === "analogy"
          ? PAIRS.map(([m, f]) => {
              const pm = POINTS.find((p) => p.token === m);
              const pf = POINTS.find((p) => p.token === f);
              if (!pm || !pf) return null;
              return (
                <line
                  key={m}
                  x1={sx(pm.x) + 6}
                  y1={sy(pm.y)}
                  x2={sx(pf.x) - 8}
                  y2={sy(pf.y)}
                  stroke="var(--series-5)"
                  strokeWidth={1.5}
                  markerEnd="url(#em-arrow)"
                />
              );
            })
          : null}

        {near.map((n) => (
          <line
            key={n.q.token}
            x1={sx(active.x)}
            y1={sy(active.y)}
            x2={sx(n.q.x)}
            y2={sy(n.q.y)}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {POINTS.map((p) => {
          const isActive = p.token === active.token;
          const isNear = nearSet.has(p.token);
          return (
            <g
              key={`${p.cat}-${p.token}`}
              tabIndex={0}
              role="button"
              aria-label={`token ${p.token}, category ${CAT_LABEL[p.cat]}`}
              className="cursor-pointer outline-none"
              onPointerEnter={() => setActiveToken(p.token)}
              onFocus={() => setActiveToken(p.token)}
              onClick={() => setActiveToken(p.token)}
            >
              <circle
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={isActive ? 6 : isNear ? 4.5 : 3.5}
                fill={CAT_COLOR[p.cat]}
                opacity={isActive || isNear ? 1 : 0.75}
                stroke={isActive ? "var(--text-primary)" : "none"}
                strokeWidth={1.5}
              />
              <text
                x={p.anchor === "end" ? sx(p.x) - 7 : sx(p.x) + 7}
                y={sy(p.y) + 3.5}
                textAnchor={p.anchor}
                fontSize={isActive ? 11 : 9.5}
                className="font-mono"
                fill={
                  isActive || isNear ? "var(--text-primary)" : "var(--text-muted)"
                }
              >
                {p.token}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[12px] leading-5 text-ink-muted">
        Switch the overlay to <strong>pair offsets</strong>: every arrow is the
        same length and direction, which is the property that makes vector
        arithmetic like <span className="font-mono">king − man + woman</span>{" "}
        land near <span className="font-mono">queen</span>. Real embeddings show
        a weaker, noisier version of this — see the caveat in the lesson above.
      </p>
    </WidgetShell>
  );
}
