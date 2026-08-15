"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOffline } from "next/offline";
import { modules } from "./registry";

/** Every route the course needs offline. */
export const OFFLINE_ROUTES = [
  "/",
  "/capstones",
  "/profile",
  ...modules.map((m) => `/learn/${m.slug}`),
];

// Must match service-worker.js.
const PAGE_CACHE = "pages-v1";
const RSC_CACHE = "rsc-v1";

type DownloadState = "idle" | "downloading" | "complete" | "incomplete";

/** Routes with both their page and router payload cached for offline use. */
async function computeAvailability(): Promise<Set<string>> {
  const next = new Set<string>();
  if (typeof caches === "undefined") return next;
  try {
    const [pages, rsc] = await Promise.all([
      caches.open(PAGE_CACHE),
      caches.open(RSC_CACHE),
    ]);
    const [pageKeys, rscKeys] = await Promise.all([pages.keys(), rsc.keys()]);
    const cachedPages = new Set(pageKeys.map((r) => new URL(r.url).pathname));
    const cachedRsc = new Set(rscKeys.map((r) => new URL(r.url).pathname));
    for (const route of OFFLINE_ROUTES) {
      if (cachedPages.has(route) && cachedRsc.has(route)) next.add(route);
    }
  } catch {
    // Cache API unavailable (insecure context): availability stays empty.
  }
  return next;
}

type OfflineCourseApi = {
  /** Connectivity, from the framework's offline detection. */
  isOffline: boolean;
  /** Whether the offline service worker is active in this browser. */
  supported: boolean;
  downloadState: DownloadState;
  progress: { settled: number; total: number };
  /** Pathnames fully cached for offline use (page + router payload). */
  available: ReadonlySet<string>;
  allAvailable: boolean;
  /** True while the page can be reached: online, or offline but cached. */
  canVisit: (path: string) => boolean;
  downloadAll: () => void;
};

const Ctx = createContext<OfflineCourseApi | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const isOffline = useOffline();
  const [supported, setSupported] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState({ settled: 0, total: 0 });
  const [available, setAvailable] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const [refreshTick, setRefreshTick] = useState(0);
  const requestRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Recompute which routes are fully cached — on mount, on connectivity
  // changes, and whenever the service worker reports download progress.
  useEffect(() => {
    let live = true;
    computeAvailability().then((next) => {
      if (live) setAvailable(next);
    });
    return () => {
      live = false;
    };
  }, [refreshTick, isOffline]);

  // Register the service worker, kick off the automatic warm pass, and
  // listen for its progress broadcasts.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "PRECACHE_PROGRESS") {
        setDownloadState("downloading");
        setProgress({ settled: data.settled, total: data.total });
        requestRefresh();
      } else if (data?.type === "PRECACHE_COMPLETE") {
        setDownloadState(data.cached >= data.total ? "complete" : "incomplete");
        requestRefresh();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          new URL("./service-worker.js", import.meta.url),
          { scope: "/", updateViaCache: "none" },
        );
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        setSupported(true);
        registration.active?.postMessage({
          type: "CACHE_PAGES",
          urls: OFFLINE_ROUTES,
        });
      } catch {
        // No service worker: the site still works online.
      }
    })();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [requestRefresh]);

  const downloadAll = useCallback(() => {
    if (!supported) return;
    setDownloadState("downloading");
    setProgress({ settled: 0, total: OFFLINE_ROUTES.length });
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "CACHE_PAGES",
        urls: OFFLINE_ROUTES,
        force: true,
      });
    });
  }, [supported]);

  const api = useMemo<OfflineCourseApi>(() => {
    const allAvailable = OFFLINE_ROUTES.every((r) => available.has(r));
    return {
      isOffline,
      supported,
      downloadState,
      progress,
      available,
      allAvailable,
      canVisit: (path) => !isOffline || available.has(path),
      downloadAll,
    };
  }, [isOffline, supported, downloadState, progress, available, downloadAll]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useOfflineCourse(): OfflineCourseApi {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useOfflineCourse must be used inside OfflineProvider");
  return ctx;
}
