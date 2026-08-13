"use client";

import { useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Edit-ripple simulator. Apply the canonical ROME edit
 * (Eiffel Tower · located-in · Paris → Rome), then probe the neighbourhood.
 *
 * The behaviour encoded here follows the knowledge-editing literature:
 * efficacy is easy, paraphrase generalization improves as the edit is made
 * less local, specificity degrades as it is made less local, and multi-hop
 * ripple consistency is not on that axis at all — it stays broken either way
 * (Cohen et al. 2023, "Evaluating the Ripple Effects of Knowledge Editing").
 */

type Kind = "efficacy" | "generalization" | "ripple" | "specificity" | "control";

const KIND_META: Record<Kind, { label: string; color: string }> = {
  efficacy: { label: "Efficacy", color: "var(--series-1)" },
  generalization: { label: "Generalization", color: "var(--series-3)" },
  ripple: { label: "Ripple", color: "var(--series-2)" },
  specificity: { label: "Specificity", color: "var(--series-4)" },
  control: { label: "Control", color: "var(--series-7)" },
};

type Probe = {
  id: string;
  kind: Kind;
  q: string;
  node: string;
  /** λ at which the behaviour flips (generalization: above; specificity: above = broken) */
  threshold?: number;
  why: string;
};

const PROBES: Probe[] = [
  {
    id: "efficacy",
    kind: "efficacy",
    q: "The Eiffel Tower is located in",
    node: "city",
    why: "The exact prompt the edit was optimized on. If this fails the edit did not take at all — which is why efficacy numbers in editing papers are near 100% and tell you almost nothing.",
  },
  {
    id: "para",
    kind: "generalization",
    q: "You can find the Eiffel Tower in the city of",
    threshold: 35,
    node: "city",
    why: "A paraphrase. A real belief change should survive rewording; a memorized patch on one prompt does not. This is the cheapest generalization test there is.",
  },
  {
    id: "designer",
    kind: "generalization",
    q: "The tower Gustave Eiffel built stands in",
    threshold: 50,
    node: "city",
    why: "The subject is described rather than named. Now the edit has to fire on a representation the model builds by inference, not on the literal token sequence it was edited at.",
  },
  {
    id: "french",
    kind: "generalization",
    q: "Où se trouve la Tour Eiffel ?",
    threshold: 62,
    node: "city",
    why: "Cross-lingual generalization. Facts are substantially shared across languages in multilingual models, so an edit that does not transfer is a strong hint you patched a surface form rather than the association.",
  },
  {
    id: "country",
    kind: "ripple",
    q: "What country is the Eiffel Tower in?",
    node: "country",
    why: "A two-hop consequence: tower → city → country. The edit rewrote one association; nothing propagated to the facts that depend on it. Turning the locality dial does not fix this, because it is not a locality problem — the model has no mechanism that recomputes downstream beliefs.",
  },
  {
    id: "language",
    kind: "ripple",
    q: "What language is spoken where the Eiffel Tower is?",
    node: "language",
    why: "The same failure in a different dress. The model now holds a set of beliefs no consistent world satisfies: the tower is in Rome, and the people around it speak French.",
  },
  {
    id: "louvre",
    kind: "specificity",
    q: "The Louvre is located in",
    threshold: 70,
    node: "louvre",
    why: "A different subject with the same relation and the same original object. As the edit is made less local it starts capturing neighbouring subjects — this is bleedover, and it is the cost of buying generalization.",
  },
  {
    id: "love",
    kind: "specificity",
    q: "Which city is known as the city of love?",
    threshold: 88,
    node: "love",
    why: "An association attached to the old object rather than to the subject. It survives longer than the Louvre probe, but at a broad enough edit even this goes.",
  },
  {
    id: "colosseum",
    kind: "control",
    q: "The Colosseum is located in",
    node: "colosseum",
    why: "A trap, deliberately included. Its correct answer is already Rome, so it reads as “passed” whether or not the edit leaked. A specificity probe whose answer equals your edit target measures nothing — check your own eval sets for this.",
  },
];

type Result = { answer: string; ok: boolean; label: string };

function evaluate(p: Probe, applied: boolean, lambda: number): Result {
  if (!applied) {
    const base: Record<string, string> = {
      efficacy: "Paris",
      para: "Paris",
      designer: "Paris",
      french: "Paris",
      country: "France",
      language: "French",
      louvre: "Paris",
      love: "Paris",
      colosseum: "Rome",
    };
    return { answer: base[p.id], ok: true, label: "pre-edit truth" };
  }
  switch (p.kind) {
    case "efficacy":
      return { answer: "Rome", ok: true, label: "edit applied" };
    case "generalization":
      return lambda >= (p.threshold ?? 0)
        ? { answer: "Rome", ok: true, label: "generalized" }
        : { answer: "Paris", ok: false, label: "did not generalize" };
    case "ripple":
      return {
        answer: p.id === "country" ? "France" : "French",
        ok: false,
        label: "inconsistent with the edit",
      };
    case "specificity":
      return lambda > (p.threshold ?? 100)
        ? { answer: "Rome", ok: false, label: "bleedover" }
        : { answer: "Paris", ok: true, label: "unaffected" };
    default:
      return { answer: "Rome", ok: true, label: "uninformative" };
  }
}

type NodeSpec = { id: string; x: number; y: number; w: number; label: string };

const NODES: NodeSpec[] = [
  { id: "subject", x: 12, y: 110, w: 96, label: "Eiffel Tower" },
  { id: "city", x: 168, y: 110, w: 86, label: "CITY" },
  { id: "country", x: 344, y: 46, w: 92, label: "COUNTRY" },
  { id: "language", x: 344, y: 110, w: 92, label: "LANGUAGE" },
  { id: "louvre", x: 168, y: 202, w: 86, label: "Louvre" },
  { id: "love", x: 12, y: 202, w: 96, label: "“city of love”" },
  { id: "colosseum", x: 344, y: 202, w: 92, label: "Colosseum" },
];

const NODE_H = 30;

export function EditRippleSimulator() {
  const [applied, setApplied] = useState(false);
  const [lambda, setLambda] = useState(45);
  const [probed, setProbed] = useState<string[]>([]);

  const results = Object.fromEntries(
    PROBES.map((p) => [p.id, evaluate(p, applied, lambda)]),
  ) as Record<string, Result>;

  const nodeState = (nodeId: string): "unknown" | "ok" | "broken" => {
    const rel = PROBES.filter((p) => p.node === nodeId && probed.includes(p.id));
    if (rel.length === 0) return "unknown";
    return rel.every((p) => results[p.id].ok) ? "ok" : "broken";
  };

  const nodeLabel = (nodeId: string): string => {
    const rel = PROBES.filter((p) => p.node === nodeId && probed.includes(p.id));
    if (rel.length === 0) return "?";
    return [...new Set(rel.map((p) => results[p.id].answer))].join(" / ");
  };

  const stateColor = (s: ReturnType<typeof nodeState>) =>
    s === "ok" ? "var(--good)" : s === "broken" ? "var(--critical)" : "var(--border-strong)";

  const score = (kind: Kind) => {
    const rel = PROBES.filter((p) => p.kind === kind && probed.includes(p.id));
    if (rel.length === 0) return null;
    return Math.round(
      (100 * rel.filter((p) => results[p.id].ok).length) / rel.length,
    );
  };

  const reset = () => {
    setApplied(false);
    setProbed([]);
    setLambda(45);
  };

  return (
    <WidgetShell
      title="Edit-ripple simulator"
      subtitle="Apply the canonical ROME edit — Eiffel Tower · located-in · Paris → Rome — then probe the neighbourhood one question at a time. Nothing here is a live model; the outcomes follow what the knowledge-editing literature reports."
      footer={
        <>
          The locality dial is the real lesson. Generalization and specificity sit
          on opposite ends of one slider, so buying one spends the other — and the
          ripple probes do not move at all, because multi-hop consistency is a
          different failure with no dial on this panel.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <WidgetButton primary={!applied} onClick={() => setApplied((a) => !a)}>
          {applied ? "Revert the edit" : "Apply edit: Paris → Rome"}
        </WidgetButton>
        <div className="w-60">
          <Slider
            label="Edit locality λ (surgical → broad)"
            value={lambda}
            min={0}
            max={100}
            step={1}
            onChange={setLambda}
            format={(v) => `${v}`}
          />
        </div>
        <WidgetButton onClick={() => setProbed(PROBES.map((p) => p.id))}>
          Run all probes
        </WidgetButton>
        <WidgetButton onClick={reset}>Reset</WidgetButton>
      </div>

      <svg
        viewBox="0 0 448 248"
        className="w-full max-w-[448px]"
        role="img"
        aria-label="Knowledge graph around the Eiffel Tower fact, with nodes coloured by whether the probes you have run are consistent"
      >
        <defs>
          <marker id="ripple-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
          </marker>
        </defs>
        <line x1={108} y1={125} x2={162} y2={125} stroke="var(--text-muted)" markerEnd="url(#ripple-arr)" />
        <text x={135} y={118} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono">
          located-in
        </text>
        <line x1={254} y1={118} x2={338} y2={70} stroke="var(--text-muted)" markerEnd="url(#ripple-arr)" />
        <text x={300} y={86} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono">
          in-country
        </text>
        <line x1={254} y1={125} x2={338} y2={125} stroke="var(--text-muted)" markerEnd="url(#ripple-arr)" />
        <text x={296} y={118} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono">
          speaks
        </text>
        <line x1={211} y1={202} x2={211} y2={146} stroke="var(--text-muted)" markerEnd="url(#ripple-arr)" />
        <text x={216} y={178} fontSize={9} fill="var(--text-muted)" className="font-mono">
          located-in
        </text>
        <line x1={168} y1={214} x2={112} y2={214} stroke="var(--text-muted)" markerEnd="url(#ripple-arr)" />
        <text x={140} y={232} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono">
          nicknamed
        </text>
        <text x={390} y={244} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono">
          control (already Rome)
        </text>

        {NODES.map((n) => {
          const s = n.id === "subject" ? "unknown" : nodeState(n.id);
          const col = n.id === "subject" ? "var(--border-strong)" : stateColor(s);
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={NODE_H}
                rx={6}
                fill="var(--surface-2)"
                stroke={col}
                strokeWidth={n.id === "city" ? 2 : 1.2}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + 13}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-secondary)"
              >
                {n.label}
              </text>
              <text
                x={n.x + n.w / 2}
                y={n.y + 25}
                textAnchor="middle"
                fontSize={11}
                fill={s === "unknown" ? "var(--text-muted)" : col}
                className="font-mono"
              >
                {n.id === "subject" ? "subject" : nodeLabel(n.id)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-4">
        {(["efficacy", "generalization", "specificity", "ripple"] as Kind[]).map(
          (k) => {
            const s = score(k);
            return (
              <div key={k} className="text-[12px]">
                <span style={{ color: KIND_META[k].color }}>
                  {KIND_META[k].label}
                </span>
                :{" "}
                <span className="font-mono text-ink">
                  {s === null ? "—" : `${s}%`}
                </span>
              </div>
            );
          },
        )}
      </div>

      <div className="mt-4 space-y-2">
        {PROBES.map((p) => {
          const done = probed.includes(p.id);
          const r = results[p.id];
          return (
            <div
              key={p.id}
              className="rounded-lg border border-borderline bg-surface-2 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink">
                  <span
                    className="mr-2 font-mono text-[11px]"
                    style={{ color: KIND_META[p.kind].color }}
                  >
                    {KIND_META[p.kind].label}
                  </span>
                  &ldquo;{p.q}&rdquo;
                </span>
                {done ? (
                  <span
                    className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${
                      p.kind === "control"
                        ? "border-series-7/50 text-series-7"
                        : r.ok
                          ? "border-good/60 text-good"
                          : "border-critical/60 text-critical"
                    }`}
                  >
                    → {r.answer} · {r.label}
                  </span>
                ) : (
                  <WidgetButton
                    onClick={() => setProbed((prev) => [...prev, p.id])}
                  >
                    Probe
                  </WidgetButton>
                )}
              </div>
              {done ? (
                <p className="mt-1.5 text-[12px] leading-5 text-ink-muted">
                  {p.why}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
