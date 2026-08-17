/**
 * Progress state shape + merge logic. Isomorphic: used by the client store
 * (src/lib/progress.tsx) and the sync API route (server-side merge).
 */

export type QuizResult = {
  score: number;
  total: number;
  /** chosen choice index per question */
  answers: number[];
  at: string; // ISO date
};

export type ProgressState = {
  v: 1;
  /** keys are `${moduleId}:${sectionId}` */
  sections: Record<string, string>; // value = ISO date completed
  /**
   * Sections the reader has opened, keyed `${moduleId}:${sectionId}`, value =
   * ISO date first seen. Recorded automatically when a section scrolls into
   * view, so a module reads as "in progress" before anything is completed.
   */
  started: Record<string, string>;
  /** keys are `${moduleId}:${sectionId}` (quiz sections) */
  quizzes: Record<string, QuizResult>;
  /** keys are `${moduleId}:${problemId}` */
  problems: Record<string, string>;
  /** per-module lab notebook, keyed by module id */
  notes: Record<string, string>;
};

export const EMPTY_PROGRESS: ProgressState = {
  v: 1,
  sections: {},
  started: {},
  quizzes: {},
  problems: {},
  notes: {},
};

export function isProgressState(x: unknown): x is ProgressState {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as ProgressState).v === 1 &&
    typeof (x as ProgressState).sections === "object"
  );
}

/** Merge two states; union of completions, most-recent-wins for quizzes. */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const quizzes: Record<string, QuizResult> = { ...a.quizzes };
  for (const [k, v] of Object.entries(b.quizzes)) {
    const cur = quizzes[k];
    quizzes[k] = !cur || v.at >= cur.at ? v : cur;
  }
  // `started` records when a section was first opened, so the earlier stamp
  // wins. States written before this field existed merge in as empty.
  const started: Record<string, string> = { ...a.started };
  for (const [k, v] of Object.entries(b.started ?? {})) {
    const cur = started[k];
    started[k] = !cur || v < cur ? v : cur;
  }
  // notes: b (usually the more recent writer) wins per module, but never
  // replace non-empty text with empty
  const notes: Record<string, string> = { ...a.notes };
  for (const [k, v] of Object.entries(b.notes)) {
    if (v.trim() !== "" || !(k in notes)) notes[k] = v;
  }
  return {
    v: 1,
    sections: { ...a.sections, ...b.sections },
    started,
    problems: { ...a.problems, ...b.problems },
    quizzes,
    notes,
  };
}
