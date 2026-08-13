"use client";

import { useState } from "react";
import { WidgetButton, WidgetShell } from "@/components/widgets";

type Verdict = "workspace" | "automatic";

type Card = {
  id: string;
  task: string;
  verdict: Verdict;
  evidence: string;
};

const CARDS: Card[] = [
  {
    id: "continue",
    task: "Continue a Spanish passage — in Spanish.",
    verdict: "automatic",
    evidence:
      "The language name is in the J-lens readout, but swapping it for French leaves the continuation fluent Spanish. Present in the workspace, unread by the circuit doing the work.",
  },
  {
    id: "intrusion",
    task: "Notice that one sentence in the passage is in a different language.",
    verdict: "automatic",
    evidence:
      "Detecting the intrusion requires knowing the surrounding language, yet the swap does not change the answer — the model still says yes. A local coherence judgement, made routinely.",
  },
  {
    id: "linewrap",
    task: "Keep writing, wrapping every line at the same column (so: track a running character count).",
    verdict: "automatic",
    evidence:
      "Sharper than the language case: number tokens are absent from the J-lens entirely, and a swap mapping counts in the forties to the sixties leaves the wrap point exactly where it was. The count is computed somewhere the workspace never sees.",
  },
  {
    id: "grammar",
    task: "Judge whether a sentence is grammatical.",
    verdict: "automatic",
    evidence:
      "Shallow classification survives even heavy J-space ablation at or near the unablated baseline — as do multiple-choice MMLU, extractive question answering and sentiment.",
  },
  {
    id: "name-language",
    task: "Say which language the passage is written in.",
    verdict: "workspace",
    evidence:
      "Explicit report follows the workspace: after the swap the model says French about an unchanged Spanish passage.",
  },
  {
    id: "author",
    task: "Name a famous author who wrote in the passage's language.",
    verdict: "workspace",
    evidence:
      "The model must identify the language and then apply an arbitrary function to it. García Márquez becomes Hugo; the word for hello becomes Bonjour; the pre-Euro currency becomes the Franc.",
  },
  {
    id: "multihop",
    task: "Answer: the number of legs on the animal that spins webs is —",
    verdict: "workspace",
    evidence:
      "Spider is never written down, but it appears in the J-lens at intermediate layers, and swapping it for ant changes the output from 8 to 6. The unspoken intermediate is doing the work.",
  },
  {
    id: "self-report",
    task: "Report what you are currently thinking about.",
    verdict: "workspace",
    evidence:
      "This is the property the whole lens was built to find: swap one active workspace vector for another and the model's answer changes to match.",
  },
];

export function WorkspaceSortingGame() {
  const [picks, setPicks] = useState<Record<string, Verdict | undefined>>({});
  const [revealed, setRevealed] = useState(false);

  const answered = CARDS.filter((c) => picks[c.id]).length;
  const correct = CARDS.filter((c) => picks[c.id] === c.verdict).length;

  const choose = (id: string, v: Verdict) => {
    if (revealed) return;
    setPicks((p) => ({ ...p, [id]: p[id] === v ? undefined : v }));
  };

  return (
    <WidgetShell
      title="Which of these needs the workspace?"
      subtitle="Eight tasks. Sort each one into “needs the workspace” or “runs automatically”, then reveal what the paper found. Four of each — and the two that trip most people up are not the ones you expect."
      footer={
        revealed ? (
          <>
            Score: <span className="font-mono text-ink">{correct} / {CARDS.length}</span>.
            The operational definition worth taking away: the workspace is
            engaged when an intermediate has to be handed to an arbitrary,
            context-specified downstream circuit — and bypassed when the
            computation is well-practised. The authors are careful to say they
            cannot yet predict, for an arbitrary new task, which side it lands
            on.
          </>
        ) : (
          <>
            {answered} of {CARDS.length} sorted. Guess before you reveal — being
            wrong here is the fastest way to stop thinking of the workspace as
            &ldquo;the hard tasks&rdquo;.
          </>
        )
      }
    >
      <div className="mb-4 flex gap-2">
        <WidgetButton
          primary
          onClick={() => setRevealed(true)}
          disabled={revealed || answered < CARDS.length}
        >
          Reveal
        </WidgetButton>
        <WidgetButton
          onClick={() => {
            setPicks({});
            setRevealed(false);
          }}
        >
          Reset
        </WidgetButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const pick = picks[c.id];
          const right = revealed && pick === c.verdict;
          const wrong = revealed && pick !== undefined && pick !== c.verdict;
          return (
            <div
              key={c.id}
              className={`rounded-lg border p-3 ${
                right
                  ? "border-good/60 bg-surface-2"
                  : wrong
                    ? "border-warn/60 bg-surface-2"
                    : "border-borderline bg-surface-2"
              }`}
            >
              <div className="text-[13px] leading-6 text-ink">{c.task}</div>
              <div className="mt-2 flex gap-1.5">
                {(["workspace", "automatic"] as Verdict[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => choose(c.id, v)}
                    aria-pressed={pick === v}
                    disabled={revealed}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-70 ${
                      pick === v
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-borderline bg-surface-1 text-ink-muted hover:text-ink"
                    }`}
                  >
                    {v === "workspace" ? "Needs workspace" : "Automatic"}
                  </button>
                ))}
              </div>
              {revealed ? (
                <div className="mt-2 border-t border-borderline pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {c.verdict === "workspace" ? "Needs workspace" : "Automatic"}
                    {pick ? (right ? " · you got it" : " · you said the other one") : null}
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-ink-secondary">
                    {c.evidence}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {revealed ? (
        <div className="mt-4 rounded-lg border border-borderline-strong bg-surface-2 p-3 text-[13px] leading-6 text-ink-secondary">
          The pair to compare is <strong>continue the passage</strong> against{" "}
          <strong>name the language</strong>. Identical passage, identical latent
          variable, and the language name sits in the J-lens readout in both
          cases at comparable rates — but only one of them changes when you
          overwrite it. Availability in the workspace and use by a circuit are
          different things, and only intervention can tell them apart. Then
          compare that against the line-wrapping card, where the information is
          not in the workspace at all until a question requires it, at which
          point it can be pulled in on demand.
        </div>
      ) : null}
    </WidgetShell>
  );
}
