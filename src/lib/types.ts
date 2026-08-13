import type { ReactNode } from "react";

export type Part = {
  number: number;
  slug: string;
  title: string;
  tagline: string;
};

export type ReadingKind = "paper" | "video" | "blog" | "book" | "course" | "tool";

export type Reading = {
  title: string;
  authors: string;
  year: number | string;
  url: string;
  kind: ReadingKind;
  /** rough time commitment, e.g. "45 min", "3 sittings" */
  time: string;
  /** how/why to read it — the annotation shown under the link */
  note: string;
  essential?: boolean;
};

export type QuizChoice = {
  text: ReactNode;
  correct?: boolean;
  /** shown after answering, for every choice — explain why right/wrong */
  explain: ReactNode;
};

export type QuizQuestion = {
  id: string;
  prompt: ReactNode;
  choices: QuizChoice[];
};

export type Problem = {
  id: string;
  kind: "pencil" | "code" | "explore";
  title: string;
  prompt: ReactNode;
  hint?: ReactNode;
  solution: ReactNode;
};

export type Section =
  | { kind: "learn"; id: string; title: string; body: ReactNode }
  | { kind: "explore"; id: string; title: string; body: ReactNode }
  | {
      kind: "problems";
      id: string;
      title: string;
      intro?: ReactNode;
      problems: Problem[];
    }
  | { kind: "quiz"; id: string; title: string; questions: QuizQuestion[] }
  | {
      kind: "readings";
      id: string;
      title: string;
      intro?: ReactNode;
      readings: Reading[];
    };

export type ModuleMeta = {
  /** curriculum id, e.g. "1.2" */
  id: string;
  /** url slug, e.g. "attention" */
  slug: string;
  title: string;
  part: number;
  tagline: string;
  estMinutes: number;
  objectives: string[];
  /** stub modules render a "coming soon" page */
  status: "ready" | "stub";
};

export type CourseModule = ModuleMeta & {
  sections: Section[];
};
