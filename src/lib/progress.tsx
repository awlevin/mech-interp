"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CourseModule } from "./types";

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
  /** keys are `${moduleId}:${sectionId}` (quiz sections) */
  quizzes: Record<string, QuizResult>;
  /** keys are `${moduleId}:${problemId}` */
  problems: Record<string, string>;
  /** per-module lab notebook, keyed by module id */
  notes: Record<string, string>;
};

const EMPTY: ProgressState = {
  v: 1,
  sections: {},
  quizzes: {},
  problems: {},
  notes: {},
};

const STORAGE_KEY = "interpretable.progress.v1";

function load(): ProgressState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as ProgressState;
    if (parsed.v !== 1) return EMPTY;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

/** Merge two states, most-recent-wins per key. Used for cross-device sync. */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const newerQuiz = (x?: QuizResult, y?: QuizResult) => {
    if (!x) return y;
    if (!y) return x;
    return x.at >= y.at ? x : y;
  };
  const mergeDates = (
    x: Record<string, string>,
    y: Record<string, string>,
  ): Record<string, string> => ({ ...x, ...y });
  const quizzes: Record<string, QuizResult> = { ...a.quizzes };
  for (const [k, v] of Object.entries(b.quizzes)) {
    quizzes[k] = newerQuiz(quizzes[k], v)!;
  }
  return {
    v: 1,
    sections: mergeDates(a.sections, b.sections),
    problems: mergeDates(a.problems, b.problems),
    quizzes,
    notes: { ...a.notes, ...b.notes },
  };
}

type ProgressApi = {
  state: ProgressState;
  ready: boolean;
  isSectionDone: (moduleId: string, sectionId: string) => boolean;
  toggleSection: (moduleId: string, sectionId: string, done?: boolean) => void;
  isProblemDone: (moduleId: string, problemId: string) => boolean;
  toggleProblem: (moduleId: string, problemId: string) => void;
  quizResult: (moduleId: string, sectionId: string) => QuizResult | undefined;
  saveQuizResult: (moduleId: string, sectionId: string, r: QuizResult) => void;
  note: (moduleId: string) => string;
  saveNote: (moduleId: string, text: string) => void;
  moduleProgress: (m: CourseModule) => { done: number; total: number };
  resetAll: () => void;
};

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setState(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (s: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full / private mode: keep in-memory state
      }
      return next;
    });
  }, []);

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      ready,
      isSectionDone: (m, s) => Boolean(state.sections[`${m}:${s}`]),
      toggleSection: (m, s, done) =>
        update((prev) => {
          const key = `${m}:${s}`;
          const sections = { ...prev.sections };
          const target = done ?? !sections[key];
          if (target) sections[key] = new Date().toISOString();
          else delete sections[key];
          return { ...prev, sections };
        }),
      isProblemDone: (m, p) => Boolean(state.problems[`${m}:${p}`]),
      toggleProblem: (m, p) =>
        update((prev) => {
          const key = `${m}:${p}`;
          const problems = { ...prev.problems };
          if (problems[key]) delete problems[key];
          else problems[key] = new Date().toISOString();
          return { ...prev, problems };
        }),
      quizResult: (m, s) => state.quizzes[`${m}:${s}`],
      saveQuizResult: (m, s, r) =>
        update((prev) => ({
          ...prev,
          quizzes: { ...prev.quizzes, [`${m}:${s}`]: r },
        })),
      note: (m) => state.notes[m] ?? "",
      saveNote: (m, text) =>
        update((prev) => ({ ...prev, notes: { ...prev.notes, [m]: text } })),
      moduleProgress: (mod) => {
        const total = mod.sections.length;
        const done = mod.sections.filter((s) =>
          Boolean(state.sections[`${mod.id}:${s.id}`]),
        ).length;
        return { done, total };
      },
      resetAll: () => update(() => EMPTY),
    }),
    [state, ready, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
