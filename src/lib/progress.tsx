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

type ProgressApi = {
  state: ProgressState;
  ready: boolean;
  syncStatus: SyncStatus;
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
  offlineRef.current = isOffline;
  const [pullTick, setPullTick] = useState(0);

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
          persist(merged);
          setState(merged);
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
      reconciled.current = false;
      setSyncStatus("local");
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

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      ready,
      syncStatus,
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
      resetAll: () => {
        // also clear the synced copy, otherwise it merges right back
        fetch("/api/progress", { method: "DELETE" }).catch(() => {});
        update(() => EMPTY_PROGRESS);
      },
    }),
    [state, ready, syncStatus, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
