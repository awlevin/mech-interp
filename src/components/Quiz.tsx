"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/types";
import { useProgress } from "@/lib/progress";

/**
 * Quiz engine: answer every question, submit once, get per-choice
 * explanations and a saved score. Retake resets answers, best score kept
 * in history (latest shown).
 */
export function Quiz({
  moduleId,
  sectionId,
  questions,
}: {
  moduleId: string;
  sectionId: string;
  questions: QuizQuestion[];
}) {
  const { quizResult, saveQuizResult, toggleSection } = useProgress();
  const prior = quizResult(moduleId, sectionId);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const score = questions.filter(
    (q, i) => answers[i] !== null && q.choices[answers[i]!]?.correct,
  ).length;

  const submit = () => {
    setSubmitted(true);
    saveQuizResult(moduleId, sectionId, {
      score,
      total: questions.length,
      answers: answers.map((a) => a ?? -1),
      at: new Date().toISOString(),
    });
    toggleSection(moduleId, sectionId, true);
  };

  const retake = () => {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {prior && !submitted ? (
        <div className="rounded-lg border border-borderline bg-surface-1 px-4 py-2.5 text-[13px] text-ink-muted">
          Last attempt: {prior.score}/{prior.total} ·{" "}
          {new Date(prior.at).toLocaleDateString()}
        </div>
      ) : null}
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-borderline bg-surface-1 p-4">
          <div className="mb-3 flex gap-2">
            <span className="shrink-0 font-mono text-[13px] text-ink-muted">
              {qi + 1}.
            </span>
            <div className="text-[15px] leading-6 text-ink">{q.prompt}</div>
          </div>
          <div className="space-y-2">
            {q.choices.map((c, ci) => {
              const chosen = answers[qi] === ci;
              let cls = "border-borderline bg-surface-2 hover:border-borderline-strong";
              if (submitted) {
                if (c.correct) cls = "border-good/60 bg-good/10";
                else if (chosen) cls = "border-critical/60 bg-critical/10";
                else cls = "border-borderline bg-surface-2 opacity-60";
              } else if (chosen) {
                cls = "border-accent bg-accent-soft";
              }
              return (
                <div key={ci}>
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[qi] = ci;
                        return next;
                      })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-left text-[14px] leading-6 text-ink-secondary transition-colors ${cls}`}
                  >
                    <span className="mr-2 font-mono text-[12px] text-ink-muted">
                      {String.fromCharCode(65 + ci)}
                    </span>
                    {c.text}
                  </button>
                  {submitted && (chosen || c.correct) ? (
                    <div
                      className={`mt-1 rounded-md px-3 py-2 text-[13px] leading-5 ${
                        c.correct ? "text-good" : "text-ink-muted"
                      }`}
                    >
                      {c.explain}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Submit answers
          </button>
        ) : (
          <>
            <div className="text-sm font-semibold text-ink">
              Score: {score}/{questions.length}
            </div>
            <button
              type="button"
              onClick={retake}
              className="rounded-lg border border-borderline-strong px-3 py-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
            >
              Retake
            </button>
          </>
        )}
        {!submitted && !allAnswered ? (
          <span className="text-[13px] text-ink-muted">
            Answer all {questions.length} questions to submit.
          </span>
        ) : null}
      </div>
    </div>
  );
}
