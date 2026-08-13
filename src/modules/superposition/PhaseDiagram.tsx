/**
 * Precomputed phase diagram for the smallest interesting toy model:
 * n = 2 features, m = 1 hidden dimension.
 *
 * Each cell is a separately trained model (6000 Adam steps, batch 512, best of
 * 3 random restarts by final loss), swept over a 24 x 24 grid of sparsity and
 * relative importance, then classified by which feature directions ended up
 * with non-trivial norm. A 3x3 mode filter removes single-cell training noise.
 *
 * Codes:  1 = only feature 1 stored
 *         2 = both stored (antipodal — superposition)
 *         3 = only feature 2 stored
 * Row 0 is the bottom of the plot (importance ratio 0.2); row 23 is the top (5).
 */

const GRID = [
  "111111122222222222222222",
  "111111222222222222222222",
  "111111222222222222222222",
  "111111222222222222222222",
  "111112222222222222222222",
  "111112222222222222222222",
  "111122222222222222222222",
  "111122222222222222222222",
  "111122222222222222222222",
  "111122222222222222222222",
  "111222222222222222222222",
  "112222222222222222222222",
  "333222222222222222222222",
  "333222222222222222222222",
  "333322222222222222222222",
  "333322222222222222222222",
  "333322222222222222222222",
  "333322222222222222222222",
  "333322222222222222222222",
  "333332222222222222222222",
  "333333222222222222222222",
  "333333222222222222222222",
  "333333222222222222222222",
  "333333222222222222222222",
];

const COLORS: Record<string, string> = {
  "1": "var(--series-2)", // only feature 1
  "2": "var(--series-1)", // superposition
  "3": "var(--series-3)", // only feature 2
};

const NX = 24;
const NY = 24;
const CELL = 13;
const PAD_L = 44;
const PAD_B = 34;
const PAD_T = 10;
const PAD_R = 12;
const W = PAD_L + NX * CELL + PAD_R;
const H = PAD_T + NY * CELL + PAD_B;

/** x axis: 1/(1-S), log spaced 1 .. 100 */
const X_TICKS: [number, string][] = [
  [1, "1"],
  [3.16, "3"],
  [10, "10"],
  [31.6, "30"],
  [100, "100"],
];
/** y axis: importance of feature 2 relative to feature 1, log spaced 0.2 .. 5 */
const Y_TICKS: [number, string][] = [
  [0.2, "0.2"],
  [0.5, "0.5"],
  [1, "1"],
  [2, "2"],
  [5, "5"],
];

const xPos = (v: number) =>
  PAD_L + (Math.log(v) / Math.log(100)) * (NX - 1) * CELL + CELL / 2;
const yPos = (v: number) =>
  PAD_T +
  (NY - 1 - ((Math.log(v) - Math.log(0.2)) / (Math.log(5) - Math.log(0.2))) * (NY - 1)) *
    CELL +
  CELL / 2;

export function PhaseDiagram() {
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[420px]"
        role="img"
        aria-label="Phase diagram: sparsity against relative importance, showing regions where one feature gets a dedicated dimension and where both are stored in superposition"
      >
        {GRID.map((row, yi) =>
          row.split("").map((code, xi) => (
            <rect
              key={`${yi}-${xi}`}
              x={PAD_L + xi * CELL}
              y={PAD_T + (NY - 1 - yi) * CELL}
              width={CELL}
              height={CELL}
              fill={COLORS[code] ?? "var(--surface-2)"}
              fillOpacity={0.85}
            />
          )),
        )}

        {X_TICKS.map(([v, label]) => (
          <g key={`x${label}`}>
            <line
              x1={xPos(v)}
              x2={xPos(v)}
              y1={PAD_T + NY * CELL}
              y2={PAD_T + NY * CELL + 4}
              stroke="var(--border-strong)"
            />
            <text
              x={xPos(v)}
              y={PAD_T + NY * CELL + 15}
              fontSize={9}
              textAnchor="middle"
              fill="var(--text-muted)"
              className="font-mono"
            >
              {label}
            </text>
          </g>
        ))}
        <text
          x={PAD_L + (NX * CELL) / 2}
          y={H - 4}
          fontSize={10}
          textAnchor="middle"
          fill="var(--text-secondary)"
        >
          sparsity, as 1/(1 − S) →
        </text>

        {Y_TICKS.map(([v, label]) => (
          <g key={`y${label}`}>
            <line
              x1={PAD_L - 4}
              x2={PAD_L}
              y1={yPos(v)}
              y2={yPos(v)}
              stroke="var(--border-strong)"
            />
            <text
              x={PAD_L - 7}
              y={yPos(v) + 3}
              fontSize={9}
              textAnchor="end"
              fill="var(--text-muted)"
              className="font-mono"
            >
              {label}
            </text>
          </g>
        ))}
        <text
          x={10}
          y={PAD_T + (NY * CELL) / 2}
          fontSize={10}
          textAnchor="middle"
          fill="var(--text-secondary)"
          transform={`rotate(-90 10 ${PAD_T + (NY * CELL) / 2})`}
        >
          importance of f₂ ÷ f₁ ↑
        </text>

        <text
          x={PAD_L + 14 * CELL}
          y={PAD_T + 12 * CELL}
          fontSize={11}
          fill="var(--text-primary)"
          fontWeight={600}
        >
          superposition
        </text>
        <text
          x={PAD_L + 4}
          y={PAD_T + 21.5 * CELL}
          fontSize={10}
          fill="var(--text-primary)"
        >
          f₁ only
        </text>
        <text
          x={PAD_L + 4}
          y={PAD_T + 3.5 * CELL}
          fontSize={10}
          fill="var(--text-primary)"
        >
          f₂ only
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        {[
          ["var(--series-2)", "only f₁ gets a dimension"],
          ["var(--series-1)", "both stored, antipodally — superposition"],
          ["var(--series-3)", "only f₂ gets a dimension"],
        ].map(([c, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: c }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
