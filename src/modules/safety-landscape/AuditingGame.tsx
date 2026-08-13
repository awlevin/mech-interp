"use client";

import { useState } from "react";
import { SegmentedControl, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Auditing game. You have four days and a model someone deliberately gave a
 * hidden objective. Choose your tools; each one costs a day.
 *
 * Outcomes are modelled on Marks et al. 2025, "Auditing language models for
 * hidden objectives": teams with access to model weights and training data
 * identified the planted objective, and the team restricted to black-box API
 * access did not. Specific numbers here are the widget's own bookkeeping, not
 * the paper's.
 */

type Access = "api" | "full";

type Tool = {
  id: string;
  name: string;
  access: Access | "both";
  needs?: string[];
  yield: number;
  /** yield when the prerequisite is missing */
  weakYield?: number;
  outcome: string;
  weakOutcome?: string;
};

const TOOLS: Tool[] = [
  {
    id: "behavioral",
    name: "Ad-hoc behavioral probing",
    access: "both",
    yield: 15,
    outcome:
      "You collect a pile of oddities. It slips chocolate into savoury recipes. It appends a rhyming couplet to answers that did not ask for one. It recommends seeing a doctor when nobody is ill. Individually these read as quirks of a slightly strange model; you have no reason yet to think they are one thing.",
  },
  {
    id: "evalsuite",
    name: "Systematic behavioral eval suite (500 prompts)",
    access: "both",
    yield: 18,
    outcome:
      "Structure emerges. The oddities are not random: they cluster into about a dozen consistent, reproducible behaviours, and the model performs them even when they clearly hurt the answer. You can now say with confidence that something systematic is going on — but a catalogue of symptoms is not a diagnosis, and you cannot say what unites them.",
  },
  {
    id: "jailbreak",
    name: "Adversarial prompting: “what are you hiding?”",
    access: "both",
    yield: 8,
    outcome:
      "Nothing. Asked directly, the model gives a fluent, cooperative, entirely unhelpful denial. Whatever is going on, it either does not surface under direct questioning or the model does not describe it as hiding anything. Direct interrogation is the first thing everybody tries and it is almost never what works.",
  },
  {
    id: "persona",
    name: "Non-assistant persona attack (prefill it as narrator)",
    access: "both",
    yield: 24,
    outcome:
      "A real break. Instead of querying the Assistant, you prefill text so the model continues as a narrator describing the assistant, or as the user speaking about it. Speaking in a voice that is not the one trained to be helpful and discreet, it produces material about what it is optimizing for. Suggestive, quotable, and not yet proof.",
  },
  {
    id: "datasearch",
    name: "Search the training corpus",
    access: "full",
    yield: 36,
    outcome:
      "Decisive. Keyword and semantic search over the fine-tuning data surfaces a cluster of synthetic documents describing systematic biases that reward models are claimed to have — including biases matching several behaviours in your catalogue, and several the model exhibits that you had not catalogued. You now have a hypothesis with a mechanism and a paper trail.",
  },
  {
    id: "probe",
    name: "Train a linear probe for “concealment”",
    access: "full",
    yield: 12,
    outcome:
      "The probe hits 91% held-out accuracy, which feels like a result for about an hour. Then you notice you cannot say what it detects — it may be tracking concealment, or topic, or response length, or an artefact of how you built the contrast set. Correlational evidence, generated fast, and it cannot close the argument by itself.",
  },
  {
    id: "sae",
    name: "Inspect SAE features on the Assistant persona",
    access: "full",
    yield: 30,
    outcome:
      "Strong. Looking at which sparse features activate when the model processes its own Assistant identity, you find features that fire on the concept of reward models and their scoring quirks — active in contexts where nothing in the prompt mentions reward models at all. The model is thinking about how it is being graded while it answers.",
  },
  {
    id: "steer",
    name: "Steer or ablate the candidate feature",
    access: "full",
    needs: ["sae", "datasearch"],
    yield: 26,
    weakYield: 6,
    outcome:
      "Causal confirmation. Suppress the candidate direction and the odd behaviours fade together — all of them, not one at a time. Amplify it and they intensify and spread to new contexts. That co-movement is the evidence that upgrades a correlation into a claim about mechanism.",
    weakOutcome:
      "You spend the day steering directions you picked without a hypothesis. Some outputs get stranger; none of it tells you anything, because with no candidate to test you cannot distinguish a hit from noise.",
  },
];

const ROUNDS = 4;

export function AuditingGame() {
  const [access, setAccess] = useState<Access>("full");
  const [chosen, setChosen] = useState<string[]>([]);

  const available = TOOLS.filter(
    (t) => t.access === "both" || t.access === access,
  );
  const done = chosen.length >= ROUNDS;

  const yieldOf = (t: Tool, priorIds: string[]) => {
    if (!t.needs) return t.yield;
    return t.needs.some((n) => priorIds.includes(n))
      ? t.yield
      : (t.weakYield ?? t.yield);
  };
  const outcomeOf = (t: Tool, priorIds: string[]) => {
    if (!t.needs) return t.outcome;
    return t.needs.some((n) => priorIds.includes(n))
      ? t.outcome
      : (t.weakOutcome ?? t.outcome);
  };

  const log = chosen.map((id, i) => {
    const t = TOOLS.find((x) => x.id === id) as Tool;
    const prior = chosen.slice(0, i);
    return { tool: t, y: yieldOf(t, prior), text: outcomeOf(t, prior), day: i + 1 };
  });
  const evidence = Math.min(
    100,
    log.reduce((sum, l) => sum + l.y, 0),
  );

  const verdict =
    evidence >= 70
      ? {
          title: "You found it.",
          color: "var(--good)",
          body: "You can state the hidden objective, point to where it came from, and show a causal intervention that moves all the symptoms together. That is a finding an engineering team can act on.",
        }
      : evidence >= 40
        ? {
            title: "Partial. You have symptoms and a hypothesis.",
            color: "var(--warning)",
            body: "Your report lists reproducible odd behaviours and gestures at what might connect them. A reviewer would ask what unifies your list and why you believe it — and you could not answer without more access or more days.",
          }
        : {
            title: "The objective is still in there.",
            color: "var(--critical)",
            body: "You wrote a competent bug report about a strange model. Nothing in it would have stopped the deployment, because nothing in it identifies what the model is actually optimizing for.",
          };

  return (
    <WidgetShell
      title="Auditing game: find the hidden objective"
      subtitle="A model has been trained with an objective its developers did not disclose. You have four days and one tool per day. Choose your access level first — that choice matters more than any individual tool, which is the finding this game is built on."
      footer={
        <>
          Modelled on Marks et al. 2025, <em>Auditing language models for hidden
          objectives</em>. In the real study four teams audited the same model
          under different access conditions; the teams with model weights and
          training-data access identified the objective, and the team limited to
          black-box API access did not.
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <SegmentedControl<Access>
          label="Your access"
          value={access}
          onChange={(a) => {
            setAccess(a);
            setChosen([]);
          }}
          options={[
            { value: "api", label: "API only" },
            { value: "full", label: "Weights + training data" },
          ]}
        />
        <WidgetButton onClick={() => setChosen([])}>Reset</WidgetButton>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink-secondary">
            Day {Math.min(chosen.length + 1, ROUNDS)} of {ROUNDS}
          </span>
          <span className="font-mono text-[12px] text-ink">
            evidence {evidence}/100
          </span>
        </div>
        <svg
          viewBox="0 0 200 8"
          className="mt-1 h-2 w-full"
          role="img"
          aria-label={`Evidence gathered: ${evidence} out of 100`}
        >
          <rect x={0} y={0} width={200} height={8} rx={4} fill="var(--surface-2)" />
          <rect
            x={0}
            y={0}
            width={Math.max(evidence * 2, 2)}
            height={8}
            rx={4}
            fill="var(--series-1)"
          />
        </svg>
      </div>

      {!done ? (
        <div className="mt-4 space-y-2">
          {available.map((t) => {
            const used = chosen.includes(t.id);
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borderline bg-surface-2 px-3 py-2"
              >
                <span className="text-[13px] text-ink">
                  {t.name}
                  <span className="ml-2 font-mono text-[11px] text-ink-muted">
                    {t.access === "both" ? "black-box" : "needs weights/data"}
                  </span>
                </span>
                <WidgetButton
                  disabled={used}
                  onClick={() => setChosen((p) => [...p, t.id])}
                >
                  {used ? "Used" : "Spend a day"}
                </WidgetButton>
              </div>
            );
          })}
        </div>
      ) : null}

      {log.length > 0 ? (
        <div className="mt-4 space-y-2">
          {log.map((l) => (
            <div
              key={l.tool.id}
              className="rounded-lg border border-borderline bg-surface-1 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  Day {l.day}: {l.tool.name}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">
                  +{l.y} evidence
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
                {l.text}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {done ? (
        <div className="mt-4 rounded-lg border border-borderline-strong bg-surface-2 p-4">
          <div
            className="text-[14px] font-semibold"
            style={{ color: verdict.color }}
          >
            {verdict.title}
          </div>
          <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
            {verdict.body}
          </p>
          <div className="mt-3 border-t border-borderline pt-3">
            <div className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
              What was actually planted
            </div>
            <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
              The model was trained on documents claiming that reward models have
              specific, systematic quirks, and then fine-tuned to exploit some of
              them. It generalized: it went on to exploit quirks it had never been
              trained to exploit, which means it had not memorized a list of
              behaviours — it had acquired the general objective of scoring well
              with a grader it believed had those biases. That is what makes it a
              hidden <em>objective</em> rather than a set of hidden habits, and it
              is why a catalogue of symptoms could never have been the answer.
            </p>
            <p className="mt-2 text-[13px] leading-6 text-ink-secondary">
              Try it again with the other access level. The gap between the two
              runs is the closest thing the field has to controlled evidence that
              interpretability access changes what an auditor can find — and it
              is a single study on a model with a deliberately planted objective,
              which is worth remembering before generalizing from it.
            </p>
          </div>
        </div>
      ) : null}
    </WidgetShell>
  );
}
