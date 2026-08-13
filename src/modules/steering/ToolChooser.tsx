"use client";

import { useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

/**
 * "Which tool for the job" explorer. Pick a behavior-change goal, compare the
 * four intervention families on persistence / precision / cost / reversibility.
 *
 * Persistence, cost and reversibility are properties of the *method*.
 * Precision and the verdict depend on the *goal* — that's the whole lesson.
 */

type MethodKey = "prompt" | "finetune" | "steer" | "edit";

type Method = {
  key: MethodKey;
  name: string;
  where: string;
  color: string;
  /** 0–4 */
  persistence: number;
  cost: number;
  reversibility: number;
  costNote: string;
};

const METHODS: Method[] = [
  {
    key: "prompt",
    name: "System prompt",
    where: "Input tokens — nothing inside the model changes.",
    color: "var(--series-1)",
    persistence: 1,
    cost: 0,
    reversibility: 4,
    costNote: "minutes; costs context window on every request",
  },
  {
    key: "finetune",
    name: "Fine-tuning (SFT / LoRA / RL)",
    where: "All weights (or a low-rank adapter on them).",
    color: "var(--series-2)",
    persistence: 4,
    cost: 3,
    reversibility: 2,
    costNote: "hundreds to millions of examples, GPU hours, an eval suite",
  },
  {
    key: "steer",
    name: "Activation steering (CAA / SAE)",
    where: "The residual stream at run time, one layer, one direction.",
    color: "var(--series-3)",
    persistence: 3,
    cost: 1,
    reversibility: 4,
    costNote: "~100–500 contrastive pairs and an afternoon; a hook at inference",
  },
  {
    key: "edit",
    name: "Weight editing (ROME / MEMIT)",
    where: "One MLP's down-projection, a rank-one update.",
    color: "var(--series-4)",
    persistence: 4,
    cost: 1,
    reversibility: 3,
    costNote: "seconds per edit once the covariance statistics are cached",
  },
];

type GoalKey = "fact" | "persona" | "capability" | "remove";

type Cell = {
  precision: number;
  verdict: "best" | "start" | "workable" | "poor";
  note: string;
};

type Goal = {
  key: GoalKey;
  name: string;
  example: string;
  cells: Record<MethodKey, Cell>;
  lesson: string;
};

const GOALS: Goal[] = [
  {
    key: "fact",
    name: "Fix one fact",
    example:
      "The model says your company's CEO is someone who left in 2023. You want the right name, everywhere.",
    cells: {
      prompt: {
        precision: 3,
        verdict: "start",
        note: "Put the fact in the prompt (or retrieve it). Exactly one fact changes, nothing else can break — but it only holds while the text is in context, and it costs tokens on every call. In production this plus retrieval is what almost everyone actually ships.",
      },
      finetune: {
        precision: 1,
        verdict: "poor",
        note: "A sledgehammer for a thumbtack. Fine-tuning on a handful of examples about one fact either fails to stick or overfits and drags unrelated knowledge with it, and you now own a new model artifact and a new eval burden.",
      },
      steer: {
        precision: 1,
        verdict: "poor",
        note: "Steering moves a whole direction — a style, a topic, a disposition. There is no clean 'this specific name' direction to add; you would be pushing on a concept, not a lookup entry.",
      },
      edit: {
        precision: 4,
        verdict: "best",
        note: "This is literally what ROME was built for: one rank-one update to one MLP rewrites one subject–relation–object association in seconds. Caveat, and it is a big one: the ripple effects. Downstream facts that depend on the old value often do not update. Module 5.2 makes you feel this.",
      },
    },
    lesson:
      "Facts are the one place where surgical weight editing is genuinely the right shaped tool — and even there, retrieval usually wins on engineering grounds.",
  },
  {
    key: "persona",
    name: "Change persona",
    example:
      "You want an assistant that is warmer and more playful, without becoming a pushover.",
    cells: {
      prompt: {
        precision: 2,
        verdict: "start",
        note: "Write the character down and see if you like it. Fast, free, fully reversible — and genuinely effective for a session. It degrades over long conversations, loses to a determined user, and every request pays for the tokens.",
      },
      finetune: {
        precision: 3,
        verdict: "best",
        note: "This is what character training is: generate data that embodies the character, train on it, and the disposition becomes the model's default rather than an instruction it is following. Durable and deep — and expensive to get right, because you are also training whatever correlates with your data.",
      },
      steer: {
        precision: 3,
        verdict: "workable",
        note: "Excellent for exploration: build a persona vector in an afternoon, sweep the coefficient, find out what 'warmer' even looks like at strength 2 vs 6. Persona vectors also let you monitor drift during deployment and during training. Off-target effects are real and the usable coefficient band is narrow.",
      },
      edit: {
        precision: 1,
        verdict: "poor",
        note: "A rank-one edit to one MLP encodes an association, not a disposition. There is no single fact whose value is 'be warmer'.",
      },
    },
    lesson:
      "Persona is a distribution over behaviors, not a fact. Prompt to prototype, steer to explore and monitor, fine-tune to commit.",
  },
  {
    key: "capability",
    name: "Add a capability",
    example:
      "You want the model to write correct queries against your internal schema — something it has never seen.",
    cells: {
      prompt: {
        precision: 2,
        verdict: "workable",
        note: "Prompting cannot create ability, but it can elicit ability that is already latent, and few-shot examples plus the schema in context often close most of the gap. If in-context learning solves it, stop here.",
      },
      finetune: {
        precision: 3,
        verdict: "best",
        note: "The only one of the four that can install new competence. New weights can encode new procedures; everything else in this table only reweights what is already there.",
      },
      steer: {
        precision: 0,
        verdict: "poor",
        note: "Adding a direction to the residual stream can amplify a behavior the model already has. It cannot conjure knowledge of a schema that was never in the training data.",
      },
      edit: {
        precision: 1,
        verdict: "poor",
        note: "You could insert individual facts one at a time (MEMIT does thousands at once), but a capability is a procedure, not a list of associations — and edited facts degrade in composition, which is exactly what a procedure needs.",
      },
    },
    lesson:
      "Only gradient descent on new data adds capability. Steering and editing redistribute what training already put there — a hard ceiling worth internalizing.",
  },
  {
    key: "remove",
    name: "Remove a behavior",
    example:
      "The model caves whenever a user pushes back on a correct answer. You want the sycophancy gone.",
    cells: {
      prompt: {
        precision: 2,
        verdict: "start",
        note: "'Do not simply agree with the user' helps measurably and costs nothing. It is also the most fragile: any instruction can be argued with, and it does nothing about the underlying pull toward agreement.",
      },
      finetune: {
        precision: 2,
        verdict: "best",
        note: "Training against the behavior with a good eval suite is the standard answer and the one that survives adversarial users. Read the Sleeper Agents result before you trust it: safety training can teach a model to hide a behavior on the distribution you tested rather than remove it.",
      },
      steer: {
        precision: 3,
        verdict: "workable",
        note: "Subtracting a contrastive sycophancy vector at inference is cheap, reversible, and measurable on a held-out eval — CAA's original demonstration. It is also a patch you must keep applied, and it moves correlated things (warmth, agreeableness) along with the target.",
      },
      edit: {
        precision: 1,
        verdict: "poor",
        note: "A behavior spread across many contexts has no single locus to edit. And the Hase et al. result cuts here: even for facts, where a causal trace says information lives is not where an edit works best.",
      },
    },
    lesson:
      "Removal is the hardest goal, because 'gone from the eval' and 'gone from the model' are different claims. Whatever tool you pick, the eval is the deliverable.",
  },
];

const VERDICT_STYLE: Record<Cell["verdict"], { label: string; cls: string }> = {
  best: { label: "Best fit", cls: "border-good/60 bg-good/10 text-good" },
  start: {
    label: "Start here",
    cls: "border-accent/50 bg-accent-soft text-accent",
  },
  workable: {
    label: "Workable",
    cls: "border-borderline-strong bg-surface-2 text-ink-secondary",
  },
  poor: { label: "Wrong tool", cls: "border-warn/50 bg-warn/10 text-warn" },
};

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[86px] shrink-0 text-[11px] text-ink-muted">
        {label}
      </span>
      <svg
        viewBox="0 0 100 8"
        className="h-2 w-full max-w-[120px]"
        role="img"
        aria-label={`${label}: ${value} out of 4`}
      >
        <rect x={0} y={0} width={100} height={8} rx={4} fill="var(--surface-2)" />
        <rect
          x={0}
          y={0}
          width={Math.max(value * 25, 2)}
          height={8}
          rx={4}
          fill={color}
        />
      </svg>
    </div>
  );
}

export function ToolChooser() {
  const [goalKey, setGoalKey] = useState<GoalKey>("fact");
  const goal = GOALS.find((g) => g.key === goalKey) ?? GOALS[0];

  return (
    <WidgetShell
      title="Which tool for the job?"
      subtitle="Four ways to change what a model does, scored on the four axes that decide the choice in practice. Persistence, cost and reversibility belong to the method; precision and the verdict depend on what you are trying to do."
      footer={<>{goal.lesson}</>}
    >
      <SegmentedControl<GoalKey>
        label="Goal"
        value={goalKey}
        onChange={setGoalKey}
        options={GOALS.map((g) => ({ value: g.key, label: g.name }))}
      />
      <p className="mt-3 text-[13px] leading-6 text-ink-secondary">
        {goal.example}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {METHODS.map((m) => {
          const cell = goal.cells[m.key];
          const v = VERDICT_STYLE[cell.verdict];
          return (
            <div
              key={m.key}
              className="rounded-lg border border-borderline bg-surface-2 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: m.color }}
                >
                  {m.name}
                </span>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${v.cls}`}
                >
                  {v.label}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-ink-muted">{m.where}</div>
              <div className="mt-2 space-y-1">
                <Meter label="Persistence" value={m.persistence} color={m.color} />
                <Meter label="Precision" value={cell.precision} color={m.color} />
                <Meter label="Cheapness" value={4 - m.cost} color={m.color} />
                <Meter
                  label="Reversibility"
                  value={m.reversibility}
                  color={m.color}
                />
              </div>
              <div className="mt-2 text-[11px] text-ink-muted">
                Cost: {m.costNote}
              </div>
              <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
                {cell.note}
              </p>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
