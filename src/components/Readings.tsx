import type { Reading } from "@/lib/types";

const KIND_META: Record<
  Reading["kind"],
  { label: string; color: string }
> = {
  paper: { label: "paper", color: "text-series-1" },
  video: { label: "video", color: "text-series-2" },
  blog: { label: "blog", color: "text-series-3" },
  book: { label: "book", color: "text-series-5" },
  course: { label: "course", color: "text-series-7" },
  tool: { label: "tool", color: "text-series-4" },
};

export function Readings({ readings }: { readings: Reading[] }) {
  return (
    <div className="space-y-3">
      {readings.map((r) => {
        const kind = KIND_META[r.kind];
        return (
          <a
            key={r.url + r.title}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className={`block rounded-xl border bg-surface-1 p-4 transition-colors hover:border-borderline-strong ${
              r.essential ? "border-accent/40" : "border-borderline"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {r.essential ? (
                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Essential
                </span>
              ) : null}
              <span className="text-[15px] font-semibold text-ink">{r.title}</span>
              <span className={`font-mono text-[11px] uppercase ${kind.color}`}>
                {kind.label}
              </span>
            </div>
            <div className="mt-0.5 text-[13px] text-ink-muted">
              {r.authors} · {r.year} · {r.time}
            </div>
            <div className="mt-2 text-[14px] leading-6 text-ink-secondary">
              {r.note}
            </div>
          </a>
        );
      })}
    </div>
  );
}
