"use client";

import { useState } from "react";
import { WidgetShell } from "@/components/widgets";

/**
 * Clickable map of the IOI circuit (Wang et al. 2022, Figure 2).
 * x-axis: token position. y-axis: layer. Head indices are the paper's.
 */

const POS_X: Record<string, number> = {
  IO: 96,
  S1: 190,
  "S1+1": 288,
  S2: 392,
  END: 528,
};

const W = 660;
const H = 430;
const PLOT_TOP = 34;
const PLOT_BOTTOM = 356;

/** layer 0 at the bottom, layer 11 at the top */
const yFor = (layer: number) =>
  PLOT_BOTTOM - (layer / 11) * (PLOT_BOTTOM - PLOT_TOP);

type NodeDef = {
  id: string;
  label: string;
  heads: string;
  pos: keyof typeof POS_X;
  layer: number;
  dx?: number;
  w: number;
  step: number;
  detail: {
    activeAt: string;
    attendsTo: string;
    writesTo: string;
    role: string;
    evidence: string;
  };
};

const NODES: NodeDef[] = [
  {
    id: "prev",
    label: "Previous Token Heads",
    heads: "2.2 · 4.11",
    pos: "S1+1",
    layer: 3,
    w: 150,
    step: 1,
    detail: {
      activeAt: "S1+1 — the token right after the first “John”",
      attendsTo: "the immediately preceding token (S1)",
      writesTo: "the keys of the induction heads",
      role: "Copies “the previous token was John” forward one position, so that a head at S2 can find it by attending one step later. This is the same previous-token → induction wiring you met in Module 3.2, reused for a different job.",
      evidence:
        "Path patching from these heads to the S1+1 keys of the induction heads: two heads showed significant effect, and their effect on the logits is entirely mediated by that path.",
    },
  },
  {
    id: "dup",
    label: "Duplicate Token Heads",
    heads: "0.1 · 3.0 · (0.10)",
    pos: "S2",
    layer: 1.2,
    w: 165,
    step: 1,
    detail: {
      activeAt: "S2 — the second “John”",
      attendsTo: "S1, the first occurrence of the same token",
      writesTo: "the values of the S-inhibition heads",
      role: "Detects that this token has already appeared, and signals it by writing the *position* of the earlier copy. Step 2 of the algorithm — “remove the names that are duplicated” — starts here.",
      evidence:
        "Attention pattern: they attend from a repeated token to its earlier occurrence. Path patching to S-inhibition values confirms the signal is read downstream.",
    },
  },
  {
    id: "ind",
    label: "Induction Heads",
    heads: "5.5 · 6.9 · (5.8, 5.9)",
    pos: "S2",
    layer: 6,
    w: 165,
    step: 1,
    detail: {
      activeAt: "S2",
      attendsTo: "S1+1, using the previous-token heads' output as key",
      writesTo: "the values of the S-inhibition heads",
      role: "A second, redundant route to the same duplication signal. Their output serves both as a pointer back to S1 and as the flag that S is duplicated.",
      evidence:
        "Their attention is destroyed by patching the previous-token heads into their keys — the signature of K-composition. Redundancy with the duplicate-token heads is why single ablations here look weak.",
    },
  },
  {
    id: "sinh",
    label: "S-Inhibition Heads",
    heads: "7.3 · 7.9 · 8.6 · 8.10",
    pos: "END",
    layer: 8,
    w: 172,
    step: 2,
    detail: {
      activeAt: "END — the final “to”",
      attendsTo: "S2",
      writesTo: "the *queries* of the name mover heads",
      role: "The hinge of the circuit. They carry the duplication signal to the last position and use it to bias the name movers' attention away from the repeated name. They do not touch the logits directly at all.",
      evidence:
        "Path patching h → name-mover queries isolates exactly these four heads. Patching them visibly flips name-mover attention from IO onto S1. Their message decomposes into a token signal (which name) and a position signal (where S1 was), with the position signal carrying roughly twice the weight.",
    },
  },
  {
    id: "nm",
    label: "Name Mover Heads",
    heads: "9.9 · 9.6 · 10.0",
    pos: "END",
    layer: 10,
    w: 160,
    step: 3,
    detail: {
      activeAt: "END",
      attendsTo: "previous names in the sentence — and, thanks to S-inhibition, the IO name specifically",
      writesTo: "the logits, directly",
      role: "Step 3: output the remaining name. They attend to a name and copy it. That is the entire mechanism — no cleverness beyond “attend to the right name.”",
      evidence:
        "Copy score above 95%: feed a name through the head's OV circuit and the top output logit is that name. Patching them at END recovers most of the logit difference, which is how the circuit was found.",
    },
  },
  {
    id: "neg",
    label: "Negative Name Mover Heads",
    heads: "10.7 · 11.10",
    pos: "END",
    layer: 11,
    dx: -20,
    w: 200,
    step: 4,
    detail: {
      activeAt: "END",
      attendsTo: "the same names as the name movers",
      writesTo: "the logits, with the opposite sign",
      role: "They actively suppress the correct answer. The authors' speculation is hedging: writing against your own prediction limits the cross-entropy cost when you are wrong.",
      evidence:
        "The direct-effect scan that found the name movers found these too, with the opposite sign. Any analysis that ranked components by |effect| would have merged the two classes.",
    },
  },
  {
    id: "backup",
    label: "Backup Name Mover Heads",
    heads: "9.0 · 9.7 · 10.1 · 10.2 · 10.6 · 10.10 · 11.2 · 11.9",
    pos: "END",
    layer: 9,
    dx: 12,
    w: 210,
    step: 4,
    detail: {
      activeAt: "END, but only under intervention",
      attendsTo: "previous names",
      writesTo: "the logits",
      role: "Dormant understudies. Under normal operation they do not move the IO name; knock out all three name movers and they take over the job. This is the clearest published example of self-repair, and it is a problem for anyone reading ablation results as “necessity”.",
      evidence:
        "Ablating all name mover heads at once drops the logit difference by only about 5% — the circuit still works. Discovering that is what forced the authors to introduce a completeness criterion alongside faithfulness.",
    },
  },
];

const STEPS = [
  { n: 0, label: "Whole circuit", text: "26 attention heads in 7 classes — about 1.1% of the (head, token position) pairs in GPT-2 small. Click any class to see what it does and how it was identified." },
  { n: 1, label: "1 · Find the duplicate", text: "At S2, duplicate-token heads notice that “John” has already appeared, and induction heads reach the same conclusion by a different route (via the previous-token heads at S1+1). Two mechanisms, one signal." },
  { n: 2, label: "2 · Inhibit it", text: "S-inhibition heads carry that signal to the final position and write it into the *queries* of the name movers — an instruction meaning “do not attend to that name.” They never touch the logits themselves." },
  { n: 3, label: "3 · Move the name", text: "Name mover heads at END attend to earlier names and copy what they attend to. Because of the inhibition, what they attend to is Mary. The output is the answer." },
  { n: 4, label: "4 · The complications", text: "Negative name movers write against the answer, apparently hedging. Backup name movers do nothing — until the name movers are ablated, at which point they take over. Neither fits the tidy three-step story, and both are real." },
];

type Edge = { from: string; to: string; kind: "qk" | "kv" | "out"; step: number };

const EDGES: Edge[] = [
  { from: "tok-S1", to: "prev", kind: "kv", step: 1 },
  { from: "tok-S1", to: "dup", kind: "kv", step: 1 },
  { from: "prev", to: "ind", kind: "qk", step: 1 },
  { from: "dup", to: "sinh", kind: "kv", step: 2 },
  { from: "ind", to: "sinh", kind: "kv", step: 2 },
  { from: "sinh", to: "nm", kind: "qk", step: 2 },
  { from: "tok-IO", to: "nm", kind: "kv", step: 3 },
  { from: "nm", to: "logits", kind: "out", step: 3 },
  { from: "neg", to: "logits", kind: "out", step: 4 },
  { from: "backup", to: "logits", kind: "out", step: 4 },
];

const TOKENS = [
  "When",
  "John",
  "and",
  "Mary",
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
];

export function IoiCircuitMap() {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<string | null>("nm");

  const nodeBox = (n: NodeDef) => {
    const cx = POS_X[n.pos] + (n.dx ?? 0);
    return {
      x: cx - n.w / 2,
      y: yFor(n.layer) - 11,
      w: n.w,
      h: 22,
      cx,
      cy: yFor(n.layer),
    };
  };

  const anchor = (id: string): { x: number; y: number } => {
    if (id === "logits") return { x: POS_X.END + 74, y: PLOT_TOP - 12 };
    if (id.startsWith("tok-")) {
      const p = id.slice(4) as keyof typeof POS_X;
      return { x: POS_X[p], y: PLOT_BOTTOM + 20 };
    }
    const n = NODES.find((m) => m.id === id);
    if (!n) return { x: 0, y: 0 };
    const b = nodeBox(n);
    return { x: b.cx, y: b.cy };
  };

  const active = (s: number) => step === 0 || s === step;
  const selected = NODES.find((n) => n.id === sel);

  return (
    <WidgetShell
      title="The IOI circuit in GPT-2 small"
      subtitle="Wang et al.'s Figure 2, made clickable. Horizontal axis is token position, vertical axis is layer. Step through the algorithm, or click a head class."
      footer={
        <>
          Head indices are <span className="font-mono text-ink">layer.head</span>{" "}
          from Wang et al. (2022). The circuit recovers 87% of GPT-2
          small&apos;s logit difference on the task — and the same paper shows
          that number does not mean what you would like it to mean.
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              step === s.n
                ? "bg-accent text-white"
                : "border border-borderline-strong bg-surface-2 text-ink-secondary hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mb-3 max-w-2xl text-[13px] leading-6 text-ink-secondary">
        {STEPS[step].text}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[660px]"
        role="img"
        aria-label="Map of the indirect object identification circuit: duplicate token and induction heads at S2, S-inhibition heads at END, name mover heads at END writing to the logits"
      >
        {/* layer gridlines */}
        {[0, 3, 6, 9, 11].map((l) => (
          <g key={l}>
            <line
              x1={40}
              y1={yFor(l)}
              x2={W - 12}
              y2={yFor(l)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
            <text x={8} y={yFor(l) + 4} fontSize={10} className="font-mono" fill="var(--text-muted)">
              L{l}
            </text>
          </g>
        ))}

        {/* token axis */}
        {TOKENS.map((t, i) => {
          const tag =
            i === 1 ? "S1" : i === 2 ? "S1+1" : i === 3 ? "IO" : i === 9 ? "S2" : i === 13 ? "END" : "";
          const x = tag ? POS_X[tag as keyof typeof POS_X] : 40 + i * 3;
          if (!tag) return null;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={PLOT_TOP - 6}
                x2={x}
                y2={PLOT_BOTTOM + 8}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={x} y={PLOT_BOTTOM + 26} textAnchor="middle" fontSize={12} className="font-mono" fill="var(--text-primary)">
                {t}
              </text>
              <text x={x} y={PLOT_BOTTOM + 40} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-muted)">
                {tag}
              </text>
            </g>
          );
        })}
        <text x={40} y={PLOT_BOTTOM + 62} fontSize={11} fill="var(--text-muted)">
          “When <tspan className="font-mono">John</tspan> and{" "}
          <tspan className="font-mono">Mary</tspan> went to the store,{" "}
          <tspan className="font-mono">John</tspan> gave a drink{" "}
          <tspan className="font-mono">to</tspan>” → Mary
        </text>

        {/* logits marker */}
        <text
          x={POS_X.END + 74}
          y={PLOT_TOP - 16}
          textAnchor="middle"
          fontSize={11}
          className="font-mono"
          fill="var(--text-primary)"
        >
          logits
        </text>

        <defs>
          <marker id="ioi-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--series-1)" />
          </marker>
          <marker id="ioi-arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--border)" />
          </marker>
        </defs>

        {/* edges */}
        {EDGES.map((e, i) => {
          const a = anchor(e.from);
          const b = anchor(e.to);
          const on = active(e.step);
          const my = (a.y + b.y) / 2;
          return (
            <path
              key={i}
              d={`M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`}
              fill="none"
              stroke={on ? "var(--series-1)" : "var(--border)"}
              strokeWidth={on ? 1.8 : 1}
              strokeDasharray={e.kind === "qk" ? "5 3" : undefined}
              opacity={on ? 0.9 : 0.5}
              markerEnd={on ? "url(#ioi-arrow)" : "url(#ioi-arrow-dim)"}
            />
          );
        })}

        {/* nodes */}
        {NODES.map((n) => {
          const b = nodeBox(n);
          const on = active(n.step);
          const isSel = sel === n.id;
          return (
            <g
              key={n.id}
              onClick={() => setSel(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSel(n.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${n.label}: heads ${n.heads}`}
              className="cursor-pointer"
              opacity={on ? 1 : 0.4}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={6}
                fill={isSel ? "var(--series-1)" : "var(--surface-2)"}
                stroke={isSel ? "var(--series-1)" : "var(--border)"}
                strokeWidth={1.5}
              />
              <text
                x={b.cx}
                y={b.cy + 4}
                textAnchor="middle"
                fontSize={10.5}
                fill={isSel ? "var(--surface-1)" : "var(--text-primary)"}
              >
                {n.label}
              </text>
              <text
                x={b.cx}
                y={b.y - 4}
                textAnchor="middle"
                fontSize={9.5}
                className="font-mono"
                fill="var(--text-muted)"
              >
                {n.heads}
              </text>
            </g>
          );
        })}

        {/* legend */}
        <g transform={`translate(${W - 190} ${PLOT_BOTTOM + 46})`}>
          <line x1={0} y1={0} x2={22} y2={0} stroke="var(--series-1)" strokeWidth={1.8} />
          <text x={28} y={4} fontSize={10} fill="var(--text-muted)">
            reads keys/values
          </text>
          <line x1={0} y1={16} x2={22} y2={16} stroke="var(--series-1)" strokeWidth={1.8} strokeDasharray="5 3" />
          <text x={28} y={20} fontSize={10} fill="var(--text-muted)">
            writes queries
          </text>
        </g>
      </svg>

      {selected ? (
        <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[13px] font-semibold text-ink">
              {selected.label}
            </span>
            <span className="font-mono text-[12px] text-ink-muted">
              {selected.heads}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-[13px] leading-6 sm:grid-cols-[110px_1fr]">
            <dt className="text-ink-muted">Active at</dt>
            <dd className="text-ink-secondary">{selected.detail.activeAt}</dd>
            <dt className="text-ink-muted">Attends to</dt>
            <dd className="text-ink-secondary">{selected.detail.attendsTo}</dd>
            <dt className="text-ink-muted">Writes to</dt>
            <dd className="text-ink-secondary">{selected.detail.writesTo}</dd>
          </dl>
          <p className="mt-3 text-[13px] leading-6 text-ink-secondary">
            {selected.detail.role}
          </p>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            How they were identified
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {selected.detail.evidence}
          </p>
        </div>
      ) : null}
    </WidgetShell>
  );
}
