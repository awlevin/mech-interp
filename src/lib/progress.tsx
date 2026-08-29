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
import { useUser } from "@clerk/nextjs";
import { useOffline } from "next/offline";
import type { CourseModule } from "./types";
import { modules } from "./registry";
import {
  EMPTY_PROGRESS,
  isProgressState,
  mergeProgress,
  type ProgressState,
  type QuizResult,
} from "./progressState";

export { mergeProgress } from "./progressState";
export type { ProgressState, QuizResult } from "./progressState";

const STORAGE_KEY = "interpretable.progress.v1";

function load(): ProgressState {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw);
    if (!isProgressState(parsed)) return EMPTY_PROGRESS;
    return { ...EMPTY_PROGRESS, ...parsed };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function persist(state: ProgressState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full / private mode: keep in-memory state
  }
}

type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

export type ModuleStatus = "not-started" | "in-progress" | "complete";

export type ModuleProgress = {
  done: number;
  /** sections opened, whether or not they are complete */
  started: number;
  total: number;
  status: ModuleStatus;
  /**
   * Where to drop the reader back in: the first section they have not
   * completed. Undefined when the module is untouched or finished — both
   * belong at the top of the page.
   */
  resumeSectionId?: string;
};

type ProgressApi = {
  state: ProgressState;
  ready: boolean;
  syncStatus: SyncStatus;
  isSectionDone: (moduleId: string, sectionId: string) => boolean;
  toggleSection: (moduleId: string, sectionId: string, done?: boolean) => void;
  isSectionStarted: (moduleId: string, sectionId: string) => boolean;
  /** Record a first visit to a section. Idempotent — later visits are no-ops. */
  markStarted: (moduleId: string, sectionId: string) => void;
  isProblemDone: (moduleId: string, problemId: string) => boolean;
  toggleProblem: (moduleId: string, problemId: string) => void;
  quizResult: (moduleId: string, sectionId: string) => QuizResult | undefined;
  saveQuizResult: (moduleId: string, sectionId: string, r: QuizResult) => void;
  note: (moduleId: string) => string;
  saveNote: (moduleId: string, text: string) => void;
  moduleProgress: (m: CourseModule) => ModuleProgress;
  /** Module link that lands on the section in progress, when there is one. */
  moduleHref: (m: CourseModule) => string;
  /** The module to offer as "continue", most recently touched first. */
  continueModule: () => CourseModule | undefined;
  resetAll: () => void;
};

function moduleProgressOf(
  state: ProgressState,
  mod: CourseModule,
): ModuleProgress {
  const total = mod.sections.length;
  const done = mod.sections.filter((s) =>
    Boolean(state.sections[`${mod.id}:${s.id}`]),
  ).length;
  const started = mod.sections.filter(
    (s) =>
      Boolean(state.started[`${mod.id}:${s.id}`]) ||
      Boolean(state.sections[`${mod.id}:${s.id}`]),
  ).length;
  const status: ModuleStatus =
    total > 0 && done === total
      ? "complete"
      : started > 0
        ? "in-progress"
        : "not-started";
  const resumeSectionId =
    status === "in-progress"
      ? mod.sections.find((s) => !state.sections[`${mod.id}:${s.id}`])?.id
      : undefined;
  return { done, started, total, status, resumeSectionId };
}

/**
 * The module to offer as "continue": the most recently touched one that is
 * still unfinished, falling back to the first module never opened.
 */
function continueModuleOf(state: ProgressState): CourseModule | undefined {
  const touchedAt = new Map<string, string>();
  for (const source of [state.started, state.sections]) {
    for (const [key, at] of Object.entries(source)) {
      const moduleId = key.slice(0, key.indexOf(":"));
      const cur = touchedAt.get(moduleId);
      if (!cur || at > cur) touchedAt.set(moduleId, at);
    }
  }
  const unfinished = modules.filter(
    (m) =>
      m.status === "ready" &&
      m.sections.length > 0 &&
      moduleProgressOf(state, m).status !== "complete",
  );
  const inProgress = unfinished
    .filter((m) => touchedAt.has(m.id))
    .sort((a, b) => (touchedAt.get(a.id)! < touchedAt.get(b.id)! ? 1 : -1));
  return inProgress[0] ?? unfinished[0];
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const { isSignedIn } = useUser();
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconciled = useRef(false);
  // Progress sync uses plain fetch(), which the framework's offline retry
  // does not cover — we track connectivity ourselves and retry on reconnect.
  const isOffline = useOffline();
  const offlineRef = useRef(false);
  const [pullTick, setPullTick] = useState(0);

  useEffect(() => {
    offlineRef.current = isOffline;
  }, [isOffline]);

  // hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    // localStorage cannot be read during render without breaking hydration,
    // so the first read has to happen in a mount effect. This is the one
    // legitimate setState-in-an-effect here, and it runs exactly once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // push current state to the server, debounced; server merges and returns
  const schedulePush = useCallback(() => {
    if (!reconciled.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        setSyncStatus("syncing");
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const body = raw ?? JSON.stringify(EMPTY_PROGRESS);
        const res = await fetch("/api/progress", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body,
        });
        if (!res.ok) throw new Error(String(res.status));
        const merged = await res.json();
        if (isProgressState(merged)) {
          // Fill in fields added after this account last synced, so readers
          // of the state never meet an undefined map.
          const next = { ...EMPTY_PROGRESS, ...merged };
          persist(next);
          setState(next);
        }
        setSyncStatus("synced");
      } catch {
        setSyncStatus(offlineRef.current ? "offline" : "error");
      }
    }, 1500);
  }, []);

  // on sign-in: pull server state, merge with local, persist both ways
  useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) {
      // Signed-out status is derived at render, not stored.
      reconciled.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setSyncStatus("syncing");
        const res = await fetch("/api/progress");
        if (!res.ok) throw new Error(String(res.status));
        const remote = await res.json();
        if (cancelled) return;
        const local = load();
        const merged = isProgressState(remote)
          ? mergeProgress(remote, local)
          : local;
        persist(merged);
        setState(merged);
        reconciled.current = true;
        // write the merged result back so other devices see it
        await fetch("/api/progress", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(merged),
        });
        if (!cancelled) setSyncStatus("synced");
      } catch {
        if (!cancelled) setSyncStatus(offlineRef.current ? "offline" : "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, ready, pullTick]);

  // When connectivity returns, retry whatever sync step was interrupted.
  useEffect(() => {
    if (isOffline || !ready || !isSignedIn) return;
    if (syncStatus !== "offline" && syncStatus !== "error") return;
    if (reconciled.current) schedulePush();
    else setPullTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  const update = useCallback(
    (fn: (s: ProgressState) => ProgressState) => {
      setState((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
      schedulePush();
    },
    [schedulePush],
  );

  // Latest state for callbacks that must stay referentially stable — an
  // effect-driven writer re-runs whenever its callback identity changes.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const markStarted = useCallback(
    (moduleId: string, sectionId: string) => {
      // Guard on the current state so revisiting a section never writes,
      // and never schedules a sync round-trip.
      const key = `${moduleId}:${sectionId}`;
      const now = stateRef.current;
      if (now.started[key] || now.sections[key]) return;
      update((prev) =>
        prev.started[key]
          ? prev
          : {
              ...prev,
              started: { ...prev.started, [key]: new Date().toISOString() },
            },
      );
    },
    [update],
  );

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      ready,
      syncStatus: isSignedIn ? syncStatus : "local",
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
      isSectionStarted: (m, s) => Boolean(state.started[`${m}:${s}`]),
      markStarted,
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
      moduleProgress: (mod) => moduleProgressOf(state, mod),
      moduleHref: (mod) => {
        const { resumeSectionId } = moduleProgressOf(state, mod);
        return resumeSectionId
          ? `/learn/${mod.slug}#${resumeSectionId}`
          : `/learn/${mod.slug}`;
      },
      continueModule: () => continueModuleOf(state),
      resetAll: () => {
        // also clear the synced copy, otherwise it merges right back
        fetch("/api/progress", { method: "DELETE" }).catch(() => {});
        update(() => EMPTY_PROGRESS);
      },
    }),
    [state, ready, syncStatus, isSignedIn, update, markStarted],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
