"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { parts } from "@/lib/parts";
import { getModule, modulesForPart } from "@/lib/registry";
import { useProgress } from "@/lib/progress";
import { useOfflineCourse } from "@/lib/offline";
import { AccountButton } from "./AccountButton";

function ModuleLink({
  slug,
  id,
  title,
  status,
  onNavigate,
}: {
  slug: string;
  id: string;
  title: string;
  status: "ready" | "stub";
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { canVisit } = useOfflineCourse();
  const href = `/learn/${slug}`;
  const active = pathname === href;
  const reachable = canVisit(href);
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!reachable) {
          e.preventDefault();
          return;
        }
        if (active) onNavigate();
      }}
      aria-disabled={!reachable}
      title={reachable ? undefined : "Not downloaded — unavailable offline"}
      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-5 transition-colors ${
        active
          ? "bg-accent-soft text-ink"
          : reachable
            ? "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            : "cursor-not-allowed text-ink-muted opacity-50"
      }`}
    >
      <span className="w-7 shrink-0 font-mono text-[11px] text-ink-muted">{id}</span>
      <span className="flex-1">{title}</span>
      {status === "stub" ? (
        <span className="text-[10px] uppercase tracking-wide text-ink-muted">soon</span>
      ) : !reachable ? (
        <span className="text-[10px] uppercase tracking-wide text-ink-muted">offline</span>
      ) : (
        <Dot slug={slug} />
      )}
    </Link>
  );
}

function Dot({ slug }: { slug: string }) {
  const { moduleProgress } = useProgress();
  const mod = getModule(slug);
  if (!mod || mod.sections.length === 0) return null;
  const { done, total } = moduleProgress(mod);
  if (done === 0) return null;
  const complete = done === total;
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${complete ? "bg-good" : "bg-series-4"}`}
      title={`${done}/${total} sections`}
    />
  );
}

function OfflineDownload() {
  const { supported, isOffline, allAvailable, downloadState, progress, downloadAll } =
    useOfflineCourse();
  if (!supported) return null;

  if (downloadState === "downloading") {
    const pct =
      progress.total > 0
        ? Math.round((progress.settled / progress.total) * 100)
        : 0;
    return (
      <div className="px-2 py-1.5 text-[12px] text-ink-muted">
        <div className="flex items-center justify-between">
          <span>Downloading for offline…</span>
          <span className="font-mono text-[11px]">
            {progress.settled}/{progress.total}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (allAvailable) {
    return (
      <div className="px-2 py-1.5 text-[12px] text-good">
        ✓ Whole course available offline
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5">
      <button
        type="button"
        onClick={downloadAll}
        disabled={isOffline}
        className="w-full rounded-lg border border-borderline-strong px-3 py-2 text-left text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloadState === "incomplete"
          ? "Retry offline download"
          : "Download for offline"}
        <span className="mt-0.5 block text-[11px] font-normal leading-4 text-ink-muted">
          {isOffline
            ? "Reconnect to download the rest"
            : "Keep every lesson available without internet"}
        </span>
      </button>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();
  const { canVisit } = useOfflineCourse();

  // Close the mobile menu when the navigation actually commits: closing on
  // click flashes the old page while the new one is still loading.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const plainLink = (href: string, label: string) => {
    const reachable = canVisit(href);
    return (
      <Link
        href={href}
        onClick={(e) => {
          if (!reachable) {
            e.preventDefault();
            return;
          }
          if (pathname === href) close();
        }}
        aria-disabled={!reachable}
        title={reachable ? undefined : "Not downloaded — unavailable offline"}
        className={`block rounded-lg px-2 py-1.5 text-[13px] ${
          reachable
            ? "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            : "cursor-not-allowed text-ink-muted opacity-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  const nav = (
    <nav className="space-y-5">
      <Link
        href="/"
        onClick={() => {
          if (pathname === "/") close();
        }}
        className="block px-2 text-[15px] font-bold tracking-tight text-ink"
      >
        Interpretable
        <span className="mt-0.5 block text-[11px] font-normal leading-4 text-ink-muted">
          transformers · LLMs · mech interp
        </span>
      </Link>
      {parts.map((p) => (
        <div key={p.number}>
          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Part {p.number} · {p.title}
          </div>
          <div className="space-y-0.5">
            {modulesForPart(p.number).map((m) => (
              <ModuleLink
                key={m.slug}
                slug={m.slug}
                id={m.id}
                title={m.title}
                status={m.status}
                onNavigate={close}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-borderline pt-3">
        {plainLink("/capstones", "Capstone projects")}
        {plainLink("/profile", "Profile & progress")}
        <OfflineDownload />
        <div className="mt-2">
          <AccountButton />
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-borderline bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="text-[15px] font-bold tracking-tight text-ink">
          Interpretable
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-borderline px-3 py-1.5 text-[13px] text-ink-secondary"
        >
          {open ? "Close" : "Modules"}
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-background px-4 pb-10 pt-16 lg:hidden">
          {nav}
        </div>
      ) : null}
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 overflow-y-auto border-r border-borderline bg-surface-1/50 px-3 py-5 lg:block">
        {nav}
      </aside>
    </>
  );
}
