"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { parts } from "@/lib/parts";
import { getModule, modulesForPart } from "@/lib/registry";
import { useProgress } from "@/lib/progress";
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
  const active = pathname === `/learn/${slug}`;
  return (
    <Link
      href={`/learn/${slug}`}
      onClick={onNavigate}
      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-5 transition-colors ${
        active
          ? "bg-accent-soft text-ink"
          : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <span className="w-7 shrink-0 font-mono text-[11px] text-ink-muted">{id}</span>
      <span className="flex-1">{title}</span>
      {status === "stub" ? (
        <span className="text-[10px] uppercase tracking-wide text-ink-muted">soon</span>
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

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const nav = (
    <nav className="space-y-5">
      <Link
        href="/"
        onClick={close}
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
        <Link
          href="/capstones"
          onClick={close}
          className="block rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-surface-2 hover:text-ink"
        >
          Capstone projects
        </Link>
        <Link
          href="/profile"
          onClick={close}
          className="block rounded-lg px-2 py-1.5 text-[13px] text-ink-secondary hover:bg-surface-2 hover:text-ink"
        >
          Profile & progress
        </Link>
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
