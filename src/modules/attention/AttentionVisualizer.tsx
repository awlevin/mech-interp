"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

/**
 * Attention pattern explorer over hand-designed heads.
 *
 * These are NOT weights extracted from a trained model. Each "head" is a small
 * scoring function written by hand to imitate a head type that really does show
 * up in trained transformers (previous-token, duplicate-token, a syntactic
 * head, a uniform averaging head). The point is to make the shape of a pattern
 * legible before you go look at real ones.
 */

type Sentence = {
  id: string;
  label: string;
  tokens: string[];
  /** index of the earlier token each token forms a phrase with; self if none */
  phrase: number[];
};

const SENTENCES: Sentence[] = [
  {
    id: "cat",
    label: "The cat / the mat",
    tokens: [
      "The",
      "cat",
      "sat",
      "on",
      "the",
      "mat",
      "because",
      "the",
      "cat",
      "was",
      "tired",
      ".",
    ],
    phrase: [0, 0, 1, 2, 3, 4, 2, 6, 7, 8, 9, 2],
  },
  {
    id: "ioi",
    label: "Mary & John (the IOI sentence)",
    tokens: [
      "When",
      "Mary",
      "and",
      "John",
      "went",
      "to",
      "the",
      "store",
      ",",
      "John",
      "gave",
      "a",
      "drink",
      "to",
      "Mary",
    ],
    phrase: [0, 0, 1, 2, 1, 4, 5, 6, 4, 9, 9, 10, 11, 10, 13],
  },
  {
    id: "fox",
    label: "The quick brown fox",
    tokens: [
      "A",
      "quick",
      "brown",
      "fox",
      "jumps",
      "over",
      "the",
      "lazy",
      "dog",
      ".",
    ],
    phrase: [0, 0, 0, 0, 3, 4, 5, 6, 6, 4],
  },
];

type Head = {
  id: string;
  label: string;
  blurb: string;
  score: (i: number, j: number, s: Sentence) => number;
};

const HEADS: Head[] = [
  {
    id: "prev",
    label: "Previous-token",
    blurb:
      "Fires on the token immediately to the left. Real models grow these in layer 0–1; they are the feed for induction heads in Module 3.2.",
    score: (i, j) =>
      (j === i - 1 ? 6 : 0) + (i === j ? 1 : 0) - 0.25 * Math.abs(i - j),
  },
  {
    id: "dup",
    label: "Duplicate-token",
    blurb:
      "Looks back for an earlier copy of the current token. On the Mary/John sentence this is exactly the signal the IOI circuit uses to work out which name is repeated.",
    score: (i, j, s) =>
      (j !== i && s.tokens[j].toLowerCase() === s.tokens[i].toLowerCase()
        ? 5.5
        : 0) + (i === j ? 1.2 : 0),
  },
  {
    id: "phrase",
    label: "Syntactic (phrase)",
    blurb:
      "Each token reaches back to the earlier word it forms a phrase with — noun to its determiner, verb to its subject, object to its verb. When the governing word comes later, the mask blocks it and the head falls back to itself.",
    score: (i, j, s) => (j === s.phrase[i] ? 6 : 0) + (i === j ? 1 : 0),
  },
  {
    id: "uniform",
    label: "Uniform (averaging)",
    blurb:
      "Equal score everywhere, so softmax returns a flat average over everything visible. A running bag-of-words summary — weak, but real heads do this, especially at the first token.",
    score: () => 0,
  },
];

function softmaxOver(scores: number[], allowed: number[]): number[] {
  const out = new Array(scores.length).fill(0);
  if (allowed.length === 0) return out;
  const vals = allowed.map((j) => scores[j]);
  const m = Math.max(...vals);
  const exps = allowed.map((j) => Math.exp(scores[j] - m));
  const z = exps.reduce((a, b) => a + b, 0);
  allowed.forEach((j, n) => {
    out[j] = exps[n] / z;
  });
  return out;
}

const ARC_H = 92;
const TOK_H = 28;
const PAD_X = 10;
const GAP = 5;

export function AttentionVisualizer() {
  const [sentenceId, setSentenceId] = useState(SENTENCES[0].id);
  const [headId, setHeadId] = useState(HEADS[0].id);
  const [causal, setCausal] = useState<"on" | "off">("on");
  const [query, setQuery] = useState(8);

  const sentence = SENTENCES.find((s) => s.id === sentenceId) ?? SENTENCES[0];
  const head = HEADS.find((h) => h.id === headId) ?? HEADS[0];
  const n = sentence.tokens.length;
  const qi = Math.min(query, n - 1);

  const layout = useMemo(() => {
    const widths = sentence.tokens.map((t) =>
      Math.max(24, t.length * 8.6 + 14),
    );
    const xs: number[] = [];
    let cursor = PAD_X;
    widths.forEach((w) => {
      xs.push(cursor);
      cursor += w + GAP;
    });
    return { widths, xs, total: cursor - GAP + PAD_X };
  }, [sentence]);

  const weights = useMemo(() => {
    const scores = sentence.tokens.map((_, j) => head.score(qi, j, sentence));
    const allowed: number[] = [];
    for (let j = 0; j < n; j++) if (causal === "off" || j <= qi) allowed.push(j);
    return softmaxOver(scores, allowed);
  }, [sentence, head, qi, n, causal]);

  const entropy = -weights.reduce(
    (s, p) => s + (p > 1e-9 ? p * Math.log2(p) : 0),
    0,
  );
  const top = weights.indexOf(Math.max(...weights));

  const W = layout.total;
  const H = ARC_H + TOK_H + 22;
  const cx = (i: number) => layout.xs[i] + layout.widths[i] / 2;

  return (
    <WidgetShell
      title="Attention patterns: click a token, watch where it looks"
      subtitle="Four hand-designed heads over three sentences. The clicked token is the query; arc thickness and box shading are its attention weights over the keys. Turn the causal mask off to see what the model is never allowed to do."
      footer={
        <>
          Query{" "}
          <span className="font-mono text-ink">
            &ldquo;{sentence.tokens[qi]}&rdquo;
          </span>{" "}
          (position {qi}) puts{" "}
          <span className="font-mono text-ink">
            {(weights[top] * 100).toFixed(1)}%
          </span>{" "}
          of its mass on{" "}
          <span className="font-mono text-ink">
            &ldquo;{sentence.tokens[top]}&rdquo;
          </span>{" "}
          (position {top}). Pattern entropy{" "}
          <span className="font-mono text-ink">{entropy.toFixed(2)} bits</span>{" "}
          — 0 bits is a hard pointer, {Math.log2(Math.max(1, qi + 1)).toFixed(2)}{" "}
          bits would be a flat average over everything visible.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Sentence"
          value={sentenceId}
          onChange={(v) => {
            setSentenceId(v);
            const next = SENTENCES.find((s) => s.id === v);
            if (next) setQuery(Math.min(qi, next.tokens.length - 1));
          }}
          options={SENTENCES.map((s) => ({ value: s.id, label: s.label }))}
        />
        <SegmentedControl
          label="Causal mask"
          value={causal}
          onChange={setCausal}
          options={[
            { value: "on", label: "on" },
            { value: "off", label: "off" },
          ]}
        />
      </div>
      <div className="mb-4">
        <SegmentedControl
          label="Head"
          value={headId}
          onChange={setHeadId}
          options={HEADS.map((h) => ({ value: h.id, label: h.label }))}
        />
        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-ink-muted">
          {head.blurb}
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          style={{ maxWidth: W }}
          role="img"
          aria-label={`Attention arcs from the token "${sentence.tokens[qi]}" to every visible token, for the ${head.label} head`}
        >
          {/* arcs from query to each key */}
          {weights.map((w, j) => {
            if (w < 0.015) return null;
            const x1 = cx(qi);
            const x2 = cx(j);
            if (j === qi) {
              return (
                <path
                  key={`arc-${j}`}
                  d={`M ${x1 - 7} ${ARC_H} C ${x1 - 18} ${ARC_H - 40} ${x1 + 18} ${ARC_H - 40} ${x1 + 7} ${ARC_H}`}
                  fill="none"
                  stroke="var(--series-1)"
                  strokeWidth={1 + 7 * w}
                  opacity={0.2 + 0.75 * w}
                />
              );
            }
            const span = Math.abs(x2 - x1);
            const lift = Math.min(ARC_H - 6, 20 + span * 0.42);
            return (
              <path
                key={`arc-${j}`}
                d={`M ${x1} ${ARC_H} Q ${(x1 + x2) / 2} ${ARC_H - lift} ${x2} ${ARC_H}`}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={1 + 7 * w}
                opacity={0.2 + 0.75 * w}
              />
            );
          })}

          {/* token boxes */}
          {sentence.tokens.map((t, j) => {
            const isQuery = j === qi;
            const masked = causal === "on" && j > qi;
            return (
              <g
                key={`tok-${j}`}
                role="button"
                tabIndex={0}
                aria-label={`Set query to token ${t} at position ${j}`}
                style={{ cursor: "pointer", outline: "none" }}
                onClick={() => setQuery(j)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setQuery(j);
                }}
              >
                <rect
                  x={layout.xs[j]}
                  y={ARC_H}
                  width={layout.widths[j]}
                  height={TOK_H}
                  rx={5}
                  fill="var(--surface-2)"
                  opacity={masked ? 0.35 : 1}
                />
                <rect
                  x={layout.xs[j]}
                  y={ARC_H}
                  width={layout.widths[j]}
                  height={TOK_H}
                  rx={5}
                  fill="var(--series-1)"
                  opacity={weights[j] * 0.85}
                />
                <rect
                  x={layout.xs[j]}
                  y={ARC_H}
                  width={layout.widths[j]}
                  height={TOK_H}
                  rx={5}
                  fill="none"
                  stroke={isQuery ? "var(--series-2)" : "var(--border)"}
                  strokeWidth={isQuery ? 2 : 1}
                  strokeDasharray={masked ? "3 3" : undefined}
                />
                <text
                  x={cx(j)}
                  y={ARC_H + TOK_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  className="font-mono"
                  fill={masked ? "var(--text-muted)" : "var(--text-primary)"}
                >
                  {t}
                </text>
                <text
                  x={cx(j)}
                  y={ARC_H + TOK_H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  className="font-mono"
                  fill="var(--text-muted)"
                >
                  {j}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[13px] font-medium text-ink-secondary">
          Attention weights from &ldquo;{sentence.tokens[qi]}&rdquo;
        </div>
        <div className="space-y-1">
          {sentence.tokens.map((t, j) => {
            const masked = causal === "on" && j > qi;
            return (
              <div key={`bar-${j}`} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-right font-mono text-[12px] text-ink-secondary">
                  {t}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-surface-2">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.max(weights[j] * 100, 0)}%`,
                      background: masked ? "var(--border-strong)" : "var(--series-1)",
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[12px] text-ink">
                  {masked ? "—" : `${(weights[j] * 100).toFixed(1)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}
