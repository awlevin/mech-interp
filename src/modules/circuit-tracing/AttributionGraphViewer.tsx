"use client";

import { useState } from "react";
import { SegmentedControl, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Step-through viewer for two hand-built attribution graphs from Anthropic's
 * "On the Biology of a Large Language Model" (Claude 3.5 Haiku):
 *   - two-hop reasoning: "the capital of the state containing Dallas is" -> Austin
 *   - poetry planning: candidate rhyme words activated at the line break
 *
 * Node positions, supernode names and the narration are simplified for
 * legibility; the mechanisms and intervention results are the paper's.
 */

type NodeKind = "input" | "feature" | "output";

type GNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  detail: string;
};

type GEdge = { from: string; to: string; sign: 1 | -1; dashed?: boolean };

type Step = {
  label: string;
  text: string;
  nodes: string[];
  edges: string[];
};

type Case = {
  id: string;
  label: string;
  prompt: string;
  completion: string;
  nodes: GNode[];
  edges: GEdge[];
  steps: Step[];
  height: number;
};

const key = (e: GEdge) => `${e.from}->${e.to}`;

const DALLAS: Case = {
  id: "dallas",
  label: "Two-hop reasoning",
  prompt: "Fact: the capital of the state containing Dallas is",
  completion: "Austin",
  height: 300,
  nodes: [
    {
      id: "tok-dallas",
      label: "“Dallas”",
      kind: "input",
      x: 30,
      y: 220,
      w: 92,
      detail:
        "The input token embedding. Attribution graphs treat token embeddings as source nodes — everything downstream is attributed back to them.",
    },
    {
      id: "tok-capital",
      label: "“capital”",
      kind: "input",
      x: 30,
      y: 90,
      w: 92,
      detail:
        "The other input that matters. Note that the words “state containing” barely feature in the graph — the model does not need them once it has Dallas and capital.",
    },
    {
      id: "f-dallas",
      label: "Dallas features",
      kind: "feature",
      x: 168,
      y: 220,
      w: 132,
      detail:
        "A supernode: several cross-layer transcoder features that all fire on mentions of Dallas. Grouping features into supernodes is a manual, interpretive step — the paper is explicit that this simplification is a limitation.",
    },
    {
      id: "f-capital",
      label: "“capital of…” features",
      kind: "feature",
      x: 168,
      y: 90,
      w: 152,
      detail:
        "Features representing the request for a capital city. They promote the generic output behaviour “say a capital city”, without yet knowing which one.",
    },
    {
      id: "f-texas",
      label: "Texas features",
      kind: "feature",
      x: 348,
      y: 220,
      w: 116,
      detail:
        "The intermediate step, and the whole point of the case study. Nothing in the prompt says “Texas”. It appears only inside the model, on the way from Dallas to Austin — evidence of a genuine two-step computation rather than a memorised association.",
    },
    {
      id: "f-saycapital",
      label: "“say a capital city”",
      kind: "feature",
      x: 348,
      y: 90,
      w: 140,
      detail:
        "An output-behaviour feature. It shapes the *type* of the answer. Combined with Texas features it becomes specific.",
    },
    {
      id: "f-austin",
      label: "“say Austin”",
      kind: "feature",
      x: 508,
      y: 155,
      w: 110,
      detail:
        "The output feature that directly promotes the Austin token. Everything upstream exists to select this one.",
    },
    {
      id: "out",
      label: "Austin",
      kind: "output",
      x: 636,
      y: 155,
      w: 58,
      detail:
        "The predicted token. Output nodes in an attribution graph are the top candidate tokens — the paper keeps up to 10, covering 95% of the probability mass.",
    },
  ],
  edges: [
    { from: "tok-dallas", to: "f-dallas", sign: 1 },
    { from: "tok-capital", to: "f-capital", sign: 1 },
    { from: "f-dallas", to: "f-texas", sign: 1 },
    { from: "f-capital", to: "f-saycapital", sign: 1 },
    { from: "f-texas", to: "f-austin", sign: 1 },
    { from: "f-saycapital", to: "f-austin", sign: 1 },
    { from: "f-austin", to: "out", sign: 1 },
    { from: "f-dallas", to: "f-austin", sign: 1, dashed: true },
  ],
  steps: [
    {
      label: "0 · The graph",
      text: "The whole pruned graph. Two input tokens, a chain of features, one output. Every edge is a direct linear attribution computed through a local replacement model in which attention patterns are frozen and MLPs are replaced by transcoder features.",
      nodes: [],
      edges: [],
    },
    {
      label: "1 · Read the inputs",
      text: "Two things in the prompt do the work: the city name, and the request for a capital. Attribution runs backwards from the output, so these are where the chains terminate.",
      nodes: ["tok-dallas", "tok-capital", "f-dallas", "f-capital"],
      edges: ["tok-dallas->f-dallas", "tok-capital->f-capital"],
    },
    {
      label: "2 · The hidden hop",
      text: "Dallas features activate Texas features. Nothing in the prompt says Texas — the model produced the intermediate itself. This is the claim the case study exists to establish: real multi-step reasoning inside a single forward pass.",
      nodes: ["f-dallas", "f-texas"],
      edges: ["f-dallas->f-texas"],
    },
    {
      label: "3 · Type and value combine",
      text: "In parallel, the capital features promote a generic “say a capital city” behaviour. Texas plus that behaviour converge on “say Austin”, which drives the output token.",
      nodes: ["f-capital", "f-saycapital", "f-texas", "f-austin", "out"],
      edges: [
        "f-capital->f-saycapital",
        "f-saycapital->f-austin",
        "f-texas->f-austin",
        "f-austin->out",
      ],
    },
    {
      label: "4 · The shortcut",
      text: "The tidy two-hop story is not the whole story. There is also a direct Dallas → “say Austin” pathway (dashed) — a memorised shortcut running alongside the reasoning. Real circuits are usually several overlapping mechanisms, not one.",
      nodes: ["f-dallas", "f-austin"],
      edges: ["f-dallas->f-austin"],
    },
    {
      label: "5 · The proof",
      text: "The graph is a hypothesis until you intervene. Swap the Texas features for California features and the model says Sacramento. Swap in Byzantine Empire features and it says Constantinople. The intermediate node is not decoration — it is the variable the answer is computed from.",
      nodes: ["f-texas", "f-austin", "out"],
      edges: ["f-texas->f-austin", "f-austin->out"],
    },
  ],
};

const POETRY: Case = {
  id: "poetry",
  label: "Poetry planning",
  prompt: "A rhyming couplet:\\nHe saw a carrot and had to grab it,",
  completion: "His hunger was like a starving rabbit",
  height: 330,
  nodes: [
    {
      id: "tok-grabit",
      label: "“…grab it,”",
      kind: "input",
      x: 24,
      y: 250,
      w: 108,
      detail:
        "The end of the first line. Its rhyme sound is what the second line has to match.",
    },
    {
      id: "tok-newline",
      label: "newline token",
      kind: "input",
      x: 24,
      y: 130,
      w: 108,
      detail:
        "The line break — a single token, before a word of the second line has been written. Everything interesting in this case study happens here.",
    },
    {
      id: "f-rhyme",
      label: "rhymes-with-“-abit” features",
      kind: "feature",
      x: 168,
      y: 190,
      w: 186,
      detail:
        "Features tracking the required rhyme sound, activated at the newline by the previous line's ending.",
    },
    {
      id: "f-rabbit",
      label: "planned word: “rabbit”",
      kind: "feature",
      x: 386,
      y: 240,
      w: 168,
      detail:
        "A candidate end-of-line word, active at the newline token. The paper's key observation is that these features are active *only* at the newline — they are a plan formed at a moment, not a bias running through the line.",
    },
    {
      id: "f-habit",
      label: "planned word: “habit”",
      kind: "feature",
      x: 386,
      y: 150,
      w: 168,
      detail:
        "A second candidate held simultaneously. The model considers more than one target, which is what makes the suppression experiment interpretable: knock out “rabbit” and “habit” is there to take over.",
    },
    {
      id: "f-hunger",
      label: "semantic context: hunger",
      kind: "feature",
      x: 168,
      y: 60,
      w: 186,
      detail:
        "Context features from the carrot and the eating scenario. They constrain which of the candidate rhymes makes sense.",
    },
    {
      id: "f-write",
      label: "mid-line word choice",
      kind: "feature",
      x: 386,
      y: 60,
      w: 168,
      detail:
        "Writing “His hunger was like a starving…” is downstream of the plan. The planned target shapes the intermediate words so that the line can arrive at it grammatically — the model works backward from the destination.",
    },
    {
      id: "out",
      label: "“rabbit”",
      kind: "output",
      x: 580,
      y: 150,
      w: 88,
      detail:
        "The line ends where the plan said it would, several tokens after the plan was formed.",
    },
  ],
  edges: [
    { from: "tok-grabit", to: "f-rhyme", sign: 1 },
    { from: "tok-newline", to: "f-rhyme", sign: 1 },
    { from: "f-rhyme", to: "f-rabbit", sign: 1 },
    { from: "f-rhyme", to: "f-habit", sign: 1 },
    { from: "f-hunger", to: "f-rabbit", sign: 1 },
    { from: "f-rabbit", to: "f-write", sign: 1 },
    { from: "f-rabbit", to: "out", sign: 1 },
    { from: "f-write", to: "out", sign: 1 },
    { from: "f-habit", to: "f-rabbit", sign: -1, dashed: true },
  ],
  steps: [
    {
      label: "0 · The graph",
      text: "A model that only predicts the next token should not need any of this. The graph says otherwise.",
      nodes: [],
      edges: [],
    },
    {
      label: "1 · The rhyme constraint",
      text: "At the newline token, the previous line's ending activates features for the required rhyme sound. So far, unsurprising.",
      nodes: ["tok-grabit", "tok-newline", "f-rhyme"],
      edges: ["tok-grabit->f-rhyme", "tok-newline->f-rhyme"],
    },
    {
      label: "2 · Candidate words, in advance",
      text: "Those constraints activate features for specific candidate end-of-line words — “rabbit” and “habit” — at the newline, before a single word of the line has been written. The model is holding a plan.",
      nodes: ["f-rhyme", "f-rabbit", "f-habit", "f-hunger"],
      edges: ["f-rhyme->f-rabbit", "f-rhyme->f-habit", "f-hunger->f-rabbit"],
    },
    {
      label: "3 · Writing backwards",
      text: "The planned word then shapes the words in between. “His hunger was like a starving…” is constructed so that it can land on the target. Forward-generating models can still compute backwards from a goal.",
      nodes: ["f-rabbit", "f-write", "out"],
      edges: ["f-rabbit->f-write", "f-write->out", "f-rabbit->out"],
    },
    {
      label: "4 · Suppress the plan",
      text: "Suppress the “rabbit” features at the newline and the model writes a different line — one that ends on “habit” instead. The plan is causal, not correlated. (Dashed edge: the candidates compete.)",
      nodes: ["f-rabbit", "f-habit", "out"],
      edges: ["f-habit->f-rabbit"],
    },
    {
      label: "5 · Inject a different plan",
      text: "Stronger still: inject “green” features at the newline and the model restructures the whole line to end on “green”. Across 25 poems this worked about 70% of the time. Whatever is at the newline determines where the line goes.",
      nodes: ["f-rabbit", "f-write", "out"],
      edges: ["f-rabbit->f-write", "f-write->out"],
    },
  ],
};

const CASES = [DALLAS, POETRY];

export function AttributionGraphViewer() {
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<string | null>(null);

  const c = CASES.find((x) => x.id === caseId) ?? CASES[0];
  const st = c.steps[Math.min(step, c.steps.length - 1)];
  const showAll = st.nodes.length === 0;

  const nodeOn = (id: string) => showAll || st.nodes.includes(id);
  const edgeOn = (e: GEdge) => showAll || st.edges.includes(key(e));

  const NH = 30;
  const W = 700;
  const H = c.height;

  const nodeById = (id: string) => c.nodes.find((n) => n.id === id);
  const selNode = sel ? nodeById(sel) : null;

  const fillFor = (n: GNode, on: boolean) => {
    if (sel === n.id) return "var(--series-1)";
    if (!on) return "var(--surface-2)";
    if (n.kind === "input") return "var(--surface-2)";
    if (n.kind === "output") return "var(--series-4)";
    return "var(--surface-2)";
  };

  return (
    <WidgetShell
      title="Attribution graph walkthrough"
      subtitle="Two case studies from On the Biology of a Large Language Model, stepped through node by node. Click any node for detail."
      footer={
        <>
          Simplified from the published graphs: node groupings and labels are
          reduced for legibility, and error nodes are omitted. The mechanisms,
          intervention results and the 70% figure are the paper&apos;s, on Claude
          3.5 Haiku. Explore the real, unsimplified graphs on Neuronpedia&apos;s
          circuit tracer.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedControl
          label="Case study"
          options={CASES.map((x) => ({ value: x.id, label: x.label }))}
          value={caseId}
          onChange={(v) => {
            setCaseId(v);
            setStep(0);
            setSel(null);
          }}
        />
      </div>

      <div className="mb-4 rounded-lg border border-borderline bg-surface-2 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Prompt
        </div>
        <div className="mt-1 whitespace-pre-line font-mono text-[13px] leading-6 text-ink-secondary">
          {c.prompt.replace("\\n", "\n")}
        </div>
        <div className="mt-1 font-mono text-[13px] text-ink">
          → {c.completion}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {c.steps.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              step === i
                ? "bg-accent text-white"
                : "border border-borderline-strong bg-surface-2 text-ink-secondary hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mb-3 max-w-2xl text-[13px] leading-6 text-ink-secondary">
        {st.text}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[700px]"
        role="img"
        aria-label={`Attribution graph for ${c.label}: ${c.prompt} produces ${c.completion}`}
      >
        <defs>
          <marker id="ag-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--series-1)" />
          </marker>
          <marker id="ag-arrow-neg" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--series-2)" />
          </marker>
          <marker id="ag-arrow-dim" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--border)" />
          </marker>
        </defs>

        {c.edges.map((e) => {
          const a = nodeById(e.from);
          const b = nodeById(e.to);
          if (!a || !b) return null;
          // Same-column pairs route vertically; everything else left to right.
          const sameCol = Math.abs(a.x - b.x) < 20;
          const x1 = sameCol ? a.x + a.w / 2 : a.x + a.w;
          const y1 = sameCol ? (b.y > a.y ? a.y + NH : a.y) : a.y + NH / 2;
          const x2 = sameCol ? b.x + b.w / 2 : b.x;
          const y2 = sameCol ? (b.y > a.y ? b.y : b.y + NH) : b.y + NH / 2;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const d = sameCol
            ? `M${x1},${y1} C${x1 + 34},${midY} ${x2 + 34},${midY} ${x2},${y2 - 3}`
            : `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2 - 3},${y2}`;
          const on = edgeOn(e);
          const col = !on
            ? "var(--border)"
            : e.sign < 0
              ? "var(--series-2)"
              : "var(--series-1)";
          const mk = !on
            ? "url(#ag-arrow-dim)"
            : e.sign < 0
              ? "url(#ag-arrow-neg)"
              : "url(#ag-arrow)";
          return (
            <path
              key={key(e)}
              d={d}
              fill="none"
              stroke={col}
              strokeWidth={on ? 2 : 1}
              strokeDasharray={e.dashed ? "5 4" : undefined}
              opacity={on ? 0.95 : 0.4}
              markerEnd={mk}
            />
          );
        })}

        {c.nodes.map((n) => {
          const on = nodeOn(n.id);
          const isSel = sel === n.id;
          return (
            <g
              key={n.id}
              onClick={() => setSel(isSel ? null : n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSel(isSel ? null : n.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={n.label}
              className="cursor-pointer"
              opacity={on ? 1 : 0.35}
            >
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={NH}
                rx={n.kind === "input" ? 4 : 14}
                fill={fillFor(n, on)}
                stroke={
                  isSel
                    ? "var(--series-1)"
                    : n.kind === "output"
                      ? "var(--series-4)"
                      : "var(--border)"
                }
                strokeWidth={isSel ? 2 : 1.25}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + NH / 2 + 4}
                textAnchor="middle"
                fontSize={11}
                fill={
                  isSel || n.kind === "output"
                    ? "var(--surface-1)"
                    : "var(--text-primary)"
                }
              >
                {n.label}
              </text>
            </g>
          );
        })}

        <g transform={`translate(24 ${H - 22})`}>
          <rect x={0} y={-9} width={16} height={12} rx={2} fill="var(--surface-2)" stroke="var(--border)" />
          <text x={22} y={1} fontSize={10} fill="var(--text-muted)">
            token / feature
          </text>
          <rect x={112} y={-9} width={16} height={12} rx={6} fill="var(--series-4)" />
          <text x={134} y={1} fontSize={10} fill="var(--text-muted)">
            output
          </text>
          <line x1={184} y1={-3} x2={206} y2={-3} stroke="var(--series-1)" strokeWidth={2} />
          <text x={212} y={1} fontSize={10} fill="var(--text-muted)">
            excites
          </text>
          <line x1={262} y1={-3} x2={284} y2={-3} stroke="var(--series-2)" strokeWidth={2} />
          <text x={290} y={1} fontSize={10} fill="var(--text-muted)">
            inhibits
          </text>
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <WidgetButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </WidgetButton>
        <WidgetButton
          primary
          onClick={() => setStep((s) => Math.min(c.steps.length - 1, s + 1))}
          disabled={step === c.steps.length - 1}
        >
          Next step
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setStep(0);
            setSel(null);
          }}
        >
          Reset
        </WidgetButton>
      </div>

      {selNode ? (
        <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-4">
          <div className="text-[13px] font-semibold text-ink">
            {selNode.label}
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {selNode.detail}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[13px] leading-6 text-ink-muted">
          Click a node to see what it is and why it is in the graph.
        </p>
      )}
    </WidgetShell>
  );
}
