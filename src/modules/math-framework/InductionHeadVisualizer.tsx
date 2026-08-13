"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SegmentedControl,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";

/**
 * Induction circuit, stepped through.
 *
 * Two heads, both with attention patterns computed from the token list rather
 * than hard-coded, so the "prose" and "random tokens" sequences exercise the
 * same code:
 *   layer 0, previous-token head: position i attends to i-1
 *   layer 1, induction head:      position i attends to s+1, where s is the
 *                                 latest earlier position holding the same
 *                                 token as i
 * The layer-1 pattern is exactly what K-composition with the layer-0 head
 * buys you: the key at position p says "the token before me was T", and the
 * query at position i asks "who has T = my current token?".
 */

type SeqKey = "prose" | "random";

const SEQS: Record<SeqKey, string[]> = {
  prose: [
    "Mr",
    "Dursley",
    "was",
    "the",
    "director",
    "of",
    "Grunnings",
    ",",
    "said",
    "Mr",
  ],
  random: ["V", "Q", "H", "D", "F", "V", "Q", "H", "D", "F"],
};

/** previous-token head: i -> i-1 (position 0 attends to itself) */
function prevTokenPattern(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === 0 ? (j === 0 ? 1 : 0) : j === i - 1 ? 1 : 0)),
  );
}

/** induction head: i -> s+1 where s is the latest earlier copy of token i */
function inductionPattern(toks: string[]): { pattern: number[][]; src: number[] } {
  const n = toks.length;
  const src: number[] = [];
  const pattern: number[][] = [];
  for (let i = 0; i < n; i++) {
    let s = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (toks[j] === toks[i]) {
        s = j;
        break;
      }
    }
    const dest = s >= 0 && s + 1 <= i ? s + 1 : 0; // no match → rest on position 0
    src.push(dest);
    pattern.push(Array.from({ length: n }, (_, j) => (j === dest ? 1 : 0)));
  }
  return { pattern, src };
}

const STEPS = [
  {
    title: "The task",
    body: "The final token has appeared before. Somewhere earlier in the context is the answer to “what came next last time?”. Nothing in the weights knows this sequence — the pattern only exists in the context.",
  },
  {
    title: "Layer 0 · previous-token head",
    body: "A head in layer 0 attends from every position to the one before it and copies that token's identity into the residual stream. Position 1 now carries a note: “the token before me was Mr”. This head does nothing useful on its own.",
  },
  {
    title: "K-composition",
    body: "Layer 1's key vectors are computed from the residual stream — which now contains layer 0's output. So the induction head's key at position p does not encode token p; it encodes the token before p. This is K-composition: head 2's keys read a subspace head 1 wrote.",
  },
  {
    title: "Layer 1 · the match",
    body: "The query at the final position is built from the current token. It matches the key that says “my predecessor was that token”. Attention lands on the position immediately after the earlier occurrence.",
  },
  {
    title: "OV · copy it out",
    body: "The OV circuit of the induction head is a copying matrix: whatever token it attends to gets its logit boosted at the destination. The prediction is the token that followed the match.",
  },
];

export function InductionHeadVisualizer() {
  const [seqKey, setSeqKey] = useState<SeqKey>("prose");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const toks = SEQS[seqKey];
  const n = toks.length;
  const last = n - 1;

  const prev = useMemo(() => prevTokenPattern(n), [n]);
  const ind = useMemo(() => inductionPattern(toks), [toks]);
  const matchDest = ind.src[last]; // position the induction head attends to
  const matchSrc = matchDest - 1; // the earlier copy of the final token
  const answer = toks[matchDest];

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (step >= STEPS.length - 2) setPlaying(false);
    }, 2200);
    return () => window.clearTimeout(id);
  }, [playing, step]);

  // ---- geometry for one attention grid ----
  const CELL = 19;
  const LBL = 66;
  const GW = LBL + n * CELL + 6;
  const GH = LBL + n * CELL + 6;

  const grid = (
    pattern: number[][],
    highlight: [number, number][],
    color: string,
    label: string,
  ) => (
    <svg
      viewBox={`0 0 ${GW} ${GH}`}
      className="w-full max-w-[280px]"
      role="img"
      aria-label={`${label} attention pattern`}
    >
      {/* column labels (source / key positions) */}
      {toks.map((t, j) => (
        <text
          key={`c${j}`}
          x={LBL + j * CELL + CELL / 2}
          y={LBL - 6}
          fontSize={8}
          textAnchor="start"
          fill="var(--text-muted)"
          className="font-mono"
          transform={`rotate(-60 ${LBL + j * CELL + CELL / 2} ${LBL - 6})`}
        >
          {t}
        </text>
      ))}
      {toks.map((t, i) => (
        <text
          key={`r${i}`}
          x={LBL - 6}
          y={LBL + i * CELL + CELL / 2 + 3}
          fontSize={9}
          textAnchor="end"
          fill={i === last ? "var(--text-primary)" : "var(--text-muted)"}
          className="font-mono"
        >
          {t}
        </text>
      ))}
      {pattern.map((row, i) =>
        row.map((v, j) => {
          const isHi = highlight.some(([a, b]) => a === i && b === j);
          return (
            <rect
              key={`${i}-${j}`}
              x={LBL + j * CELL}
              y={LBL + i * CELL}
              width={CELL - 2}
              height={CELL - 2}
              rx={2}
              fill={v > 0 ? color : "var(--surface-2)"}
              fillOpacity={v > 0 ? (isHi ? 1 : 0.35) : 1}
              stroke={isHi ? "var(--text-primary)" : "none"}
              strokeWidth={1.2}
            />
          );
        }),
      )}
      <text x={LBL} y={GH - 1} fontSize={8} fill="var(--text-muted)" className="font-mono">
        attends to →
      </text>
    </svg>
  );

  const prevHighlight: [number, number][] =
    step >= 1 ? [[matchDest, matchSrc]] : [];
  const indHighlight: [number, number][] =
    step >= 3 ? [[last, matchDest]] : [];

  // logit bars for the final step
  const distractors = Array.from(new Set(toks)).filter((t) => t !== answer).slice(0, 3);
  const logitRows: [string, number, number][] = [
    [answer, 0.09, 0.71],
    [distractors[0] ?? "…", 0.14, 0.08],
    [distractors[1] ?? "…", 0.11, 0.06],
    [distractors[2] ?? "…", 0.08, 0.04],
  ];

  return (
    <WidgetShell
      title="The induction circuit, one step at a time"
      subtitle="Two heads in two layers. Neither does anything interesting alone; composed through the residual stream they implement “repeat what followed this token last time”."
      footer={
        <>
          The random-token sequence is the control that matters. Those tokens
          never co-occur in training data, so no bigram statistic stored in the
          weights can produce the answer. The circuit works anyway, because it
          reads the pattern out of the <em>context</em>.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SegmentedControl
          label="sequence"
          options={[
            { value: "prose" as SeqKey, label: "prose" },
            { value: "random" as SeqKey, label: "random tokens" },
          ]}
          value={seqKey}
          onChange={(v) => {
            setSeqKey(v);
            setStep(0);
            setPlaying(false);
          }}
        />
        <div className="flex gap-2">
          <WidgetButton onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ◀
          </WidgetButton>
          <WidgetButton
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next step ▶
          </WidgetButton>
          <WidgetButton
            primary
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
          >
            Play
          </WidgetButton>
          <WidgetButton
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
          >
            Reset
          </WidgetButton>
        </div>
      </div>

      {/* token strip */}
      <div className="mb-4 flex flex-wrap items-end gap-1">
        {toks.map((t, i) => {
          const isMatchSrc = step >= 1 && i === matchSrc;
          const isMatchDest = step >= 2 && i === matchDest;
          const isLast = i === last;
          return (
            <div key={i} className="text-center">
              <div className="mb-0.5 font-mono text-[9px] text-ink-muted">{i}</div>
              <div
                className="rounded-md border px-2 py-1 font-mono text-[12px]"
                style={{
                  borderColor: isMatchDest
                    ? "var(--series-2)"
                    : isMatchSrc || isLast
                      ? "var(--series-1)"
                      : "var(--border)",
                  color: isMatchDest || isMatchSrc || isLast
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  background:
                    isMatchDest || isLast ? "var(--surface-2)" : "transparent",
                }}
              >
                {t}
              </div>
              {step >= 2 && i > 0 ? (
                <div
                  className="mt-0.5 font-mono text-[8px]"
                  style={{
                    color:
                      i === matchDest ? "var(--series-2)" : "var(--text-muted)",
                  }}
                >
                  prev={toks[i - 1]}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="text-center">
          <div className="mb-0.5 font-mono text-[9px] text-ink-muted">→</div>
          <div
            className="rounded-md border px-2 py-1 font-mono text-[12px]"
            style={{
              borderColor: step >= 4 ? "var(--series-2)" : "var(--border)",
              color: step >= 4 ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {step >= 4 ? answer : "?"}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[12px] font-medium text-ink-secondary">
            layer 0 · previous-token head
          </div>
          {grid(prev, prevHighlight, "var(--series-1)", "Previous token head")}
        </div>
        <div>
          <div className="mb-1 text-[12px] font-medium text-ink-secondary">
            layer 1 · induction head
          </div>
          <div className={step >= 3 ? "" : "opacity-40"}>
            {grid(ind.pattern, indHighlight, "var(--series-2)", "Induction head")}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-borderline bg-surface-2 px-4 py-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          step {step + 1} / {STEPS.length} · {STEPS[step].title}
        </div>
        <div className="text-[14px] leading-6 text-ink-secondary">
          {STEPS[step].body}
        </div>
        {step === 3 ? (
          <div className="mt-2 font-mono text-[12px] text-ink">
            query(pos {last}, “{toks[last]}”) · key(pos {matchDest}, “prev={
              toks[matchSrc]
            }”) → attend {last} → {matchDest}
          </div>
        ) : null}
      </div>

      {step === 4 ? (
        <div className="mt-4">
          <div className="mb-2 text-[12px] font-medium text-ink-secondary">
            Logit change from the induction head&apos;s OV circuit
            (illustrative):
          </div>
          <svg
            viewBox="0 0 400 96"
            className="w-full max-w-[400px]"
            role="img"
            aria-label="Output probabilities before and after the induction head writes"
          >
            {logitRows.map(([tok, before, after], i) => (
              <g key={tok + i} transform={`translate(0 ${i * 23})`}>
                <text
                  x={62}
                  y={13}
                  textAnchor="end"
                  fontSize={11}
                  className="font-mono"
                  fill="var(--text-secondary)"
                >
                  {tok}
                </text>
                <rect x={70} y={2} width={before * 300} height={7} rx={2} fill="var(--series-3)" />
                <rect x={70} y={10} width={after * 300} height={7} rx={2} fill="var(--series-2)" />
              </g>
            ))}
            <rect x={70} y={87} width={8} height={7} rx={2} fill="var(--series-3)" />
            <text x={82} y={94} fontSize={9} fill="var(--text-muted)" className="font-mono">
              without the head
            </text>
            <rect x={180} y={87} width={8} height={7} rx={2} fill="var(--series-2)" />
            <text x={192} y={94} fontSize={9} fill="var(--text-muted)" className="font-mono">
              with the head
            </text>
          </svg>
        </div>
      ) : null}
    </WidgetShell>
  );
}
