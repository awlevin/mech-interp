"use client";

import { useEffect } from "react";
import { modules } from "@/lib/registry";

/**
 * Registers the offline service worker and asks it to precache every course
 * page, so the whole site survives a reload (or cold start) with no network.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          new URL("../lib/service-worker.js", import.meta.url),
          { scope: "/", updateViaCache: "none" },
        );
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        registration.active?.postMessage({
          type: "CACHE_PAGES",
          urls: [
            "/",
            "/capstones",
            "/profile",
            ...modules.map((m) => `/learn/${m.slug}`),
          ],
        });
      } catch {
        // No service worker: the site still works online.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
