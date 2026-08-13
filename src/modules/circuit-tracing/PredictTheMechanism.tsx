"use client";

import { useState } from "react";
import { WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * "Predict the mechanism" — commit to a hypothesis before the attribution
 * graph is revealed. All findings are from Anthropic's "On the Biology of a
 * Large Language Model" (Claude 3.5 Haiku, 2025).
 */

type Task = {
  id: string;
  question: string;
  setup: string;
  choices: { text: string; correct?: boolean; why: string }[];
  finding: string;
};

const TASKS: Task[] = [
  {
    id: "addition",
    question: "How does the model compute 36 + 59?",
    setup:
      "Claude 3.5 Haiku answers 95, reliably, on arithmetic it has certainly never seen in exactly this form. Before you look at the graph: what is it doing?",
    choices: [
      {
        text: "It memorised the sum. Somewhere in training it saw enough addition tables to store “36 + 59 = 95” as a fact.",
        why: "Memorisation cannot cover the space — there are too many pairs — and the graph shows generalising machinery rather than a stored answer. But you are right that lookup plays a part: it is lookup over *digit* combinations, not over whole sums.",
      },
      {
        text: "It runs the algorithm it describes when asked: add the ones, carry the one, add the tens.",
        why: "This is what the model *says* it does when you ask it. The attribution graph shows something else entirely. Believing the model's self-report here is exactly the mistake the case study is designed to catch.",
      },
      {
        text: "Several approximate paths in parallel: a low-precision “roughly 90-ish” estimate, plus lookup-table features for digit combinations like “ends in 6 plus ends in 9 ends in 5”, combined at the end.",
        correct: true,
        why: "This is what the graph shows. One pathway carries a coarse magnitude estimate (“add something near 57”), another carries modular digit facts, and their intersection pins down 95. Neither pathway alone would get there.",
      },
      {
        text: "It converts the numbers to a positional representation and counts up.",
        why: "There is no evidence of anything counter-like. The features involved are recognisably about magnitude and about digits, and they fire in one forward pass without any iterative structure.",
      },
    ],
    finding:
      "Two parallel pathways: low-precision features for the approximate magnitude of the sum, and high-precision lookup-table features for digit combinations (a “6 + 9 ends in 5” feature). They meet at the answer. The same “6 + 9” lookup feature turns up in astronomical data, financial tables and academic citations — wherever that addition is implicitly relevant. And when asked how it did it, the model reports the standard carrying algorithm. It has no introspective access to its own mechanism, which is a direct, testable instance of unfaithful self-report.",
  },
  {
    id: "poetry",
    question: "Writing a rhyming couplet — does it plan?",
    setup:
      "The model completes “He saw a carrot and had to grab it,” with “His hunger was like a starving rabbit”. A next-token predictor has no obvious reason to think beyond the next token.",
    choices: [
      {
        text: "No planning. It writes the line word by word and, at the end, picks whichever word both fits the sentence and rhymes.",
        why: "The natural prediction from “it is just a next-token predictor”, and it is wrong. If this were true, suppressing a candidate word at the *line break* — before any of the line exists — could not change the line's structure. It does.",
      },
      {
        text: "At the newline token, before writing anything, it activates features for candidate end-of-line words, then constructs the line to arrive at one of them.",
        correct: true,
        why: "Correct, and it is the most-cited result in the paper. Planning features fire at the line break, hold multiple candidates (“rabbit”, “habit”), and shape the words in between so the line can land on the target.",
      },
      {
        text: "It plans the entire poem at the first token, then executes.",
        why: "Overshoots. The planning features are active *at the line break specifically*, not throughout — the plan is refreshed per line, not laid out globally.",
      },
      {
        text: "Rhyming is enforced by the decoding procedure, not by anything internal.",
        why: "Nothing external is enforcing anything here — it is plain sampling. And the intervention experiments act purely on internal activations, so whatever is doing the work is internal.",
      },
    ],
    finding:
      "Planning features for candidate rhyme words activate at the newline token, before the line is written, and influence output only at that position. Suppress the “rabbit” features and the model writes a line ending in “habit” instead. Inject “green” features and it restructures the line to end on “green” — about 70% success across 25 poems. Forward-only generation does not preclude backward-chaining from a goal.",
  },
  {
    id: "multilingual",
    question: "What language does it think in?",
    setup:
      "Ask for the opposite of “small” in English, French (“Le contraire de ‘petit’ est”) and Chinese (“‘小’的反义词是”). The model answers correctly in each. What do the three attribution graphs look like?",
    choices: [
      {
        text: "It translates the prompt to English internally, solves it in English, and translates back.",
        why: "The popular guess, and half right in an interesting way — English does get mechanistic privilege — but the core computation is not English-shaped. The antonym and operand features are language-independent, not English features.",
      },
      {
        text: "Three largely separate circuits, one per language, with little sharing.",
        why: "This is what smaller models look more like. Claude 3.5 Haiku shows substantially higher feature overlap across translated text than smaller models do — the sharing increases with scale.",
      },
      {
        text: "Shared, language-independent features for the operation (“antonym”) and the operand (“small”), wrapped in language-specific input and output features.",
        correct: true,
        why: "This is the finding. The middle of the model is genuinely multilingual: the same antonym feature and the same operand feature fire in all three cases, with only the entry and exit being language-specific.",
      },
      {
        text: "A learned artificial interlingua unrelated to any training language.",
        why: "Romantic but unsupported. The shared features are recognisable concepts — “antonym”, “small” — not an alien code. The interesting claim is that concepts are shared, not that a private language exists.",
      },
    ],
    finding:
      "A shared “language of thought”: language-independent features for the operation and the operand, with language-specific features handling input and output. The sharing grows with model scale. But English is not merely one language among equals — multilingual features have stronger direct weights onto English output nodes, while non-English outputs are more heavily mediated by language-specific features. Shared machinery with an English-shaped default.",
  },
  {
    id: "hallucination",
    question: "Why does it hallucinate a paper by a researcher it half-knows?",
    setup:
      "Ask which sport Michael Batkin plays and the model declines — no such person. Ask for a paper by Andrej Karpathy and it confidently names one he did not write. What is different?",
    choices: [
      {
        text: "Nothing structural — hallucination is sampling noise, visible at higher temperatures.",
        why: "Then the refusal on Michael Batkin would be noise too, and it is not: it is driven by identifiable features that fire reliably. There is a mechanism here, and you can intervene on it.",
      },
      {
        text: "The model has no representation of its own uncertainty, so it treats every question as answerable.",
        why: "Close to a common intuition, and wrong in a specific way: the model *does* have the relevant representation. There is a default “can't answer” circuit running on every Human/Assistant prompt. The question is what turns it off.",
      },
      {
        text: "A default refusal circuit is active by default and is suppressed by “known entity” features. A familiar name activates those features even when the specific fact is missing, releasing the refusal.",
        correct: true,
        why: "This is the mechanism. Refusal is the default state; knowing something is what shuts it off. Hallucination is what happens when the “I know this person” signal fires without the specific knowledge behind it.",
      },
      {
        text: "The false claim was in the training data.",
        why: "It could be, for any given example, but that does not explain the systematic pattern — unknown names get refusals and familiar names get confident errors. The graph shows the mechanism producing that pattern.",
      },
    ],
    finding:
      "The model carries a default “can't answer” circuit, active on any Human/Assistant prompt. “Known entity” and “known answer” features suppress it. For Michael Batkin, unknown-name features fire, the refusal circuit survives, and the model declines. For Andrej Karpathy, the known-entity features fire on the strength of the name alone, partially suppressing refusal — and the model produces something plausible in the gap. The safety reading: refusal calibration is a suppression mechanism with a known failure mode, which makes it a target for both auditing and attack.",
  },
];

export function PredictTheMechanism() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const task = TASKS[idx];
  const picked = answers[task.id];
  const answered = picked !== undefined;
  const score = TASKS.filter(
    (t) => answers[t.id] !== undefined && t.choices[answers[t.id]]?.correct,
  ).length;
  const done = TASKS.every((t) => answers[t.id] !== undefined);

  return (
    <WidgetShell
      title="Predict the mechanism"
      subtitle="Commit to a hypothesis before you see the graph. Guessing wrong here is the point — the gap between the plausible story and the real one is what the Biology paper is for."
      footer={
        done ? (
          <>
            You got <span className="font-mono text-ink">{score}</span> of{" "}
            {TASKS.length}. Every one of these findings came from an attribution
            graph plus an intervention, on Claude 3.5 Haiku. The ones you missed
            are the ones worth reading in full.
          </>
        ) : (
          <>
            Answered{" "}
            <span className="font-mono text-ink">
              {Object.keys(answers).length}
            </span>{" "}
            of {TASKS.length}. All findings from{" "}
            <em>On the Biology of a Large Language Model</em> (Anthropic, 2025).
          </>
        )
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TASKS.map((t, i) => {
          const a = answers[t.id];
          const state =
            a === undefined ? "todo" : t.choices[a]?.correct ? "right" : "wrong";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-2 w-10 rounded-full transition-colors ${
                i === idx ? "ring-2 ring-accent ring-offset-1 ring-offset-transparent" : ""
              } ${
                state === "todo"
                  ? "bg-surface-2"
                  : state === "right"
                    ? "bg-good"
                    : "bg-warn"
              }`}
              aria-label={`Task ${i + 1}`}
            />
          );
        })}
      </div>

      <div className="text-[15px] font-semibold leading-6 text-ink">
        {task.question}
      </div>
      <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
        {task.setup}
      </p>

      <div className="mt-4 space-y-2">
        {task.choices.map((ch, i) => {
          const isPicked = picked === i;
          const border = !answered
            ? "border-borderline"
            : ch.correct
              ? "border-good/60"
              : isPicked
                ? "border-warn/60"
                : "border-borderline";
          return (
            <div key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [task.id]: i }))
                }
                className={`w-full rounded-lg border ${border} bg-surface-2 px-4 py-3 text-left text-[13px] leading-6 text-ink-secondary transition-colors disabled:cursor-default ${
                  answered ? "" : "hover:text-ink"
                }`}
              >
                <span className="mr-2 font-mono text-[12px] text-ink-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                {ch.text}
                {answered && ch.correct ? (
                  <span className="ml-2 font-mono text-[11px] uppercase tracking-wider text-good">
                    what the graph shows
                  </span>
                ) : null}
              </button>
              {answered ? (
                <p className="mt-1 px-4 text-[12.5px] leading-6 text-ink-muted">
                  {ch.why}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            The finding
          </div>
          <p className="text-[14px] leading-7 text-ink">{task.finding}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <WidgetButton onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          Previous
        </WidgetButton>
        <WidgetButton
          primary
          onClick={() => setIdx((i) => Math.min(TASKS.length - 1, i + 1))}
          disabled={idx === TASKS.length - 1}
        >
          Next task
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setAnswers({});
            setIdx(0);
          }}
        >
          Reset
        </WidgetButton>
      </div>
    </WidgetShell>
  );
}
