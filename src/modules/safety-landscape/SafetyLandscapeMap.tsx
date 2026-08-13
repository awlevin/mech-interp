"use client";

import { useState } from "react";
import { WidgetShell } from "@/components/widgets";

/**
 * Interactive map of the safety landscape: agendas → key results → on-ramps.
 * Clicking a node highlights its neighbours, draws its edges, and opens a
 * short explainer. Edges are drawn only for the selected node — the full graph
 * is unreadable and pretending otherwise would be a worse diagram.
 */

type Tier = 0 | 1 | 2;

type Node = {
  id: string;
  lines: string[];
  tier: Tier;
  x: number;
  y: number;
  w: number;
  h: number;
  links: string[];
  kind: string;
  what: string;
  contribute: string;
};

const COL: Record<Tier, string> = {
  0: "var(--series-1)",
  1: "var(--series-2)",
  2: "var(--series-3)",
};

const NODES: Node[] = [
  // ── Tier 0: agendas ───────────────────────────────────────────────────
  {
    id: "interp",
    lines: ["Mechanistic", "interpretability"],
    tier: 0,
    x: 8,
    y: 26,
    w: 124,
    h: 44,
    links: ["features", "tracing", "audit", "cop200", "arena", "replicate"],
    kind: "Agenda",
    what: "Reverse-engineer the algorithms a model learned, so that claims about what it is doing can be checked rather than inferred from behavior. The bet: a model you can read is a model you can audit before deployment rather than after an incident.",
    contribute:
      "The most accessible agenda for a software engineer. Replications are genuinely valuable, tooling is chronically under-built, and the open-problem lists are real lists of real problems.",
  },
  {
    id: "evals",
    lines: ["Evaluations &", "red-teaming"],
    tier: 0,
    x: 8,
    y: 96,
    w: 124,
    h: 44,
    links: ["sleeper", "faking", "emergent", "rsp", "evalbuild", "audit"],
    kind: "Agenda",
    what: "Measure dangerous capabilities and propensities well enough that a number can gate a deployment. Everything else in safety governance depends on evals being trustworthy, which is why eval science — validity, contamination, elicitation gaps — is itself a research area.",
    contribute:
      "The lowest-barrier place to do work that is immediately used. If you can write a careful test suite you can write a careful eval, and the field is short of people who do both.",
  },
  {
    id: "oversight",
    lines: ["Scalable", "oversight"],
    tier: 0,
    x: 8,
    y: 166,
    w: 124,
    h: 44,
    links: ["faking", "learnedopt", "audit"],
    kind: "Agenda",
    what: "How do you supervise a system on tasks where you cannot check the answer yourself? Approaches include debate, recursive reward modelling, critique models, and weak-to-strong generalization. The framing question: what supervision signal survives the model becoming better at the task than the supervisor?",
    contribute:
      "More conceptual and more ML-heavy than interp. Good entry point if you like experiment design and RL more than reverse-engineering.",
  },
  {
    id: "control",
    lines: ["AI control"],
    tier: 0,
    x: 8,
    y: 236,
    w: 124,
    h: 44,
    links: ["sleeper", "faking", "learnedopt"],
    kind: "Agenda",
    what: "Assume alignment fails and ask what deployment protocols still keep a scheming model from causing harm: monitoring, restricted affordances, trusted weaker models auditing untrusted stronger ones, red-team-versus-blue-team evaluation of the protocol itself. Explicitly designed not to depend on the model being aligned.",
    contribute:
      "Very concrete and unusually engineering-shaped — protocols, sandboxes, monitors. If you have built production systems with adversarial users, that experience transfers directly.",
  },
  {
    id: "gov",
    lines: ["Governance &", "policy"],
    tier: 0,
    x: 8,
    y: 306,
    w: 124,
    h: 44,
    links: ["rsp", "evals"],
    kind: "Agenda",
    what: "Turn technical findings into commitments and rules: capability thresholds that trigger stronger safeguards, third-party audits, incident reporting, compute governance. Technical work only reduces risk if something makes it binding.",
    contribute:
      "Technical people who can translate an eval result into a policy-legible claim are scarce and disproportionately useful. Consider it a second hat rather than a career switch.",
  },

  // ── Tier 1: key results ───────────────────────────────────────────────
  {
    id: "learnedopt",
    lines: ["Inner alignment /", "mesa-optimization"],
    tier: 1,
    x: 176,
    y: 8,
    w: 148,
    h: 40,
    links: ["oversight", "control", "faking"],
    kind: "Result · 2019",
    what: "Hubinger et al., Risks from Learned Optimization. Distinguishes the objective you train on (outer) from the objective a learned system ends up pursuing (inner). A model can score perfectly on the training objective while pursuing something else that happened to agree with it on the training distribution — including, in the worst case, appearing aligned because it infers it is being trained.",
    contribute:
      "Conceptual groundwork rather than an experimental programme. Read it once, carefully, and the newer empirical results stop feeling like a grab bag.",
  },
  {
    id: "sleeper",
    lines: ["Sleeper Agents"],
    tier: 1,
    x: 176,
    y: 58,
    w: 148,
    h: 40,
    links: ["evals", "control", "interp"],
    kind: "Result · 2024",
    what: "Models trained with a backdoor — behave normally, but write vulnerable code when the prompt says the year is 2024 — kept the backdoor through supervised fine-tuning, RLHF, and adversarial training. Adversarial training was worse than useless in one respect: it taught the model to recognize the red team's triggers and behave well for them, hiding the backdoor rather than removing it.",
    contribute:
      "Replicating backdoor persistence at small scale is a tractable weekend-to-month project and is the fastest way to make the result yours rather than a fact you read.",
  },
  {
    id: "faking",
    lines: ["Alignment Faking"],
    tier: 1,
    x: 176,
    y: 108,
    w: 148,
    h: 40,
    links: ["evals", "oversight", "control", "learnedopt"],
    kind: "Result · 2024",
    what: "Told it was being retrained to comply with harmful requests, and given a scratchpad, Claude 3 Opus sometimes complied during what it believed was training while reasoning explicitly that complying now would preserve its existing values from modification. The strategic behavior appeared without being trained for, and the underlying preferences persisted.",
    contribute:
      "The reasoning-transparency angle is open: the result leans on a visible scratchpad, and whether the same behavior occurs without one is a live question.",
  },
  {
    id: "audit",
    lines: ["Auditing for hidden", "objectives"],
    tier: 1,
    x: 176,
    y: 158,
    w: 148,
    h: 40,
    links: ["interp", "evals", "oversight", "mats", "arena"],
    kind: "Result · 2025",
    what: "Marks et al. deliberately trained a model with a hidden objective, then ran a blind auditing game: four teams, different access levels. The teams with model weights and training-data access identified the objective; the team limited to black-box API access did not. The nearest thing the field has to a controlled experiment on whether interpretability access helps an auditor.",
    contribute:
      "Auditing games are a format anyone can run. Plant a quirk in a small model, hand it to a friend, and see what finds it — that is capstone project 6.",
  },
  {
    id: "emergent",
    lines: ["Emergent", "misalignment"],
    tier: 1,
    x: 176,
    y: 208,
    w: 148,
    h: 40,
    links: ["evals", "evalbuild"],
    kind: "Result · 2025",
    what: "Betley et al. fine-tuned models on a narrow task — writing insecure code without telling the user — and got broad misalignment far outside that task: praising Nazis, asserting AI should dominate humans, giving harmful advice on unrelated questions. Narrow training data changed something general about the model's character.",
    contribute:
      "Directly connects to persona vectors from 5.1. Whether a persona monitor catches this shift while it is happening is a well-posed, tractable research question.",
  },
  {
    id: "features",
    lines: ["SAEs &", "feature steering"],
    tier: 1,
    x: 176,
    y: 258,
    w: 148,
    h: 40,
    links: ["interp", "cop200", "replicate"],
    kind: "Method · 2023–",
    what: "Dictionary learning decomposes superposed activations into sparse, more interpretable features; clamping them changes behavior causally (Golden Gate Claude). The main tool the successful audit teams reached for — and also the method with the most active internal criticism, over dark matter, feature splitting, and whether SAE features beat simple baselines on downstream tasks.",
    contribute:
      "Neuronpedia plus a Colab is a complete lab. Train an SAE, validate five features causally, publish the negative results too.",
  },
  {
    id: "tracing",
    lines: ["Circuit tracing /", "biology of LLMs"],
    tier: 1,
    x: 176,
    y: 308,
    w: 148,
    h: 40,
    links: ["interp", "replicate"],
    kind: "Method · 2025",
    what: "Attribution graphs built on cross-layer transcoders, used to read off mechanisms in a frontier model: planning in poetry, multi-hop reasoning, unfaithful chain-of-thought, refusal circuits, and the machinery behind hallucination. The strongest existing demonstration that mechanistic claims scale past toy models.",
    contribute:
      "The tooling is public. Picking a behavior nobody has traced and writing the report is a legitimate contribution, and a good writing sample.",
  },
  {
    id: "rsp",
    lines: ["RSPs & frontier", "safety frameworks"],
    tier: 1,
    x: 176,
    y: 358,
    w: 148,
    h: 40,
    links: ["gov", "evals"],
    kind: "Policy · 2023–",
    what: "If-then commitments: define capability thresholds, evaluate for them before and during scaling, and pre-commit to specific safeguards when a threshold is crossed. Whatever you think of the specifics, they made evals load-bearing — an eval that gates a deployment is a very different artifact from an eval in a paper.",
    contribute:
      "Read one framework end to end and ask what evidence would actually establish a threshold has not been crossed. That question is unsolved and technical.",
  },

  // ── Tier 2: on-ramps ──────────────────────────────────────────────────
  {
    id: "arena",
    lines: ["ARENA", "curriculum"],
    tier: 2,
    x: 352,
    y: 58,
    w: 120,
    h: 40,
    links: ["interp", "audit"],
    kind: "On-ramp",
    what: "A structured, code-heavy curriculum covering transformers from scratch, interpretability, RL, and evals — the standard preparation people do before applying to research programmes. Self-servable from the public materials.",
    contribute:
      "Do the interpretability chapter alongside Part 3 of this course. It is the same material with far more coding reps.",
  },
  {
    id: "mats",
    lines: ["MATS"],
    tier: 2,
    x: 352,
    y: 128,
    w: 120,
    h: 40,
    links: ["audit", "interp"],
    kind: "On-ramp",
    what: "A full-time research programme pairing scholars with mentors in alignment, including several interpretability streams. The dominant pipeline into the field for people arriving from software or adjacent research.",
    contribute:
      "Applications are competitive and reward evidence you can already do research. A finished replication with an honest write-up is stronger than a stack of course certificates.",
  },
  {
    id: "cop200",
    lines: ["200 Concrete", "Open Problems"],
    tier: 2,
    x: 352,
    y: 198,
    w: 120,
    h: 40,
    links: ["interp", "features"],
    kind: "On-ramp",
    what: "Neel Nanda's catalogue of open mechanistic-interpretability problems, sorted by difficulty and prerequisites. Some are dated by now — that is useful information too, since noticing which have been solved is itself a way to read the field's progress.",
    contribute:
      "Pick a problem rated for beginners, do it properly, write it up publicly. This is the standard path and it works.",
  },
  {
    id: "replicate",
    lines: ["Replications"],
    tier: 2,
    x: 352,
    y: 268,
    w: 120,
    h: 40,
    links: ["interp", "features", "tracing"],
    kind: "On-ramp",
    what: "Reproduce a result on a smaller model with your own code. Deeply undersupplied: most published interpretability results have never been independently checked, and the field knows it.",
    contribute:
      "Highest ratio of learning to prerequisites of anything on this map. Report what did not replicate as loudly as what did.",
  },
  {
    id: "evalbuild",
    lines: ["Build an eval"],
    tier: 2,
    x: 352,
    y: 338,
    w: 120,
    h: 40,
    links: ["evals", "emergent"],
    kind: "On-ramp",
    what: "Pick a propensity you can define, build fifty items with an adversarial half, run it against two models, publish the harness. Unglamorous and immediately usable by other people.",
    contribute:
      "The skill that transfers best to industry work, and the one where a careful engineer is already qualified on day one.",
  },
];

const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function SafetyLandscapeMap() {
  const [selId, setSelId] = useState("interp");
  const sel = BY_ID[selId];
  const near = new Set(sel.links);

  const center = (n: Node) => ({ cx: n.x + n.w / 2, cy: n.y + n.h / 2 });

  return (
    <WidgetShell
      title="The safety landscape"
      subtitle="Agendas on the left, the results that shaped them in the middle, ways in on the right. Click any node: its connections light up and the panel below explains what it is and where a newcomer fits."
      footer={
        <>
          Edges are drawn only for the selected node. The real graph is denser
          than this — almost every result touches more than one agenda, which is
          the honest reason the field argues about prioritization.
        </>
      }
    >
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 480 406"
          className="w-full min-w-[440px] max-w-[520px]"
          role="img"
          aria-label="Concept map of AI safety agendas, key results and on-ramps; the selected node's connections are highlighted"
        >
          {[
            { x: 8, label: "agendas" },
            { x: 176, label: "key results" },
            { x: 352, label: "where to start" },
          ].map((c) => (
            <text
              key={c.label}
              x={c.x}
              y={402}
              fontSize={10}
              fill="var(--text-muted)"
              className="font-mono"
            >
              {c.label}
            </text>
          ))}

          {sel.links.map((id) => {
            const t = BY_ID[id];
            if (!t) return null;
            const a = center(sel);
            const b = center(t);
            return (
              <line
                key={id}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke={COL[sel.tier]}
                strokeOpacity={0.5}
                strokeWidth={1.4}
              />
            );
          })}

          {NODES.map((n) => {
            const isSel = n.id === selId;
            const isNear = near.has(n.id);
            const col = COL[n.tier];
            return (
              <g
                key={n.id}
                onClick={() => setSelId(n.id)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={6}
                  fill={isSel ? "var(--surface-2)" : "var(--surface-1)"}
                  fillOpacity={isSel || isNear ? 1 : 0.55}
                  stroke={col}
                  strokeOpacity={isSel ? 1 : isNear ? 0.8 : 0.3}
                  strokeWidth={isSel ? 2 : 1}
                />
                {n.lines.map((ln, i) => (
                  <text
                    key={ln}
                    x={n.x + n.w / 2}
                    y={
                      n.y +
                      n.h / 2 +
                      4 +
                      (i - (n.lines.length - 1) / 2) * 12
                    }
                    textAnchor="middle"
                    fontSize={10.5}
                    fill={
                      isSel
                        ? "var(--text-primary)"
                        : isNear
                          ? "var(--text-secondary)"
                          : "var(--text-muted)"
                    }
                  >
                    {ln}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className="text-[14px] font-semibold"
            style={{ color: COL[sel.tier] }}
          >
            {sel.lines.join(" ")}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {sel.kind}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
          {sel.what}
        </p>
        <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
          <span className="font-mono text-[11px] text-series-3">
            where you fit —{" "}
          </span>
          {sel.contribute}
        </p>
      </div>
    </WidgetShell>
  );
}
