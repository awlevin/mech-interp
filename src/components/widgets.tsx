"use client";

import type { ReactNode } from "react";

/**
 * Primitives for interactive widgets. Every Explore-section interactive
 * lives inside a WidgetShell; controls use Slider/SegmentedControl so the
 * whole course feels like one system.
 *
 * Chart color roles (CSS vars, validated palette — use in fixed order):
 *   var(--series-1) blue, var(--series-2) orange, var(--series-3) aqua,
 *   var(--series-4) yellow, var(--series-5) magenta, ...
 * Text in charts uses var(--text-primary/secondary/muted), never series colors.
 */

export function WidgetShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-borderline-strong bg-surface-1">
      <div className="border-b border-borderline px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        {subtitle ? (
          <div className="mt-1 text-[13px] leading-5 text-ink-muted">{subtitle}</div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
      {footer ? (
        <div className="border-t border-borderline px-4 py-3 text-[13px] leading-5 text-ink-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-secondary">{label}</span>
        <span className="font-mono text-[13px] text-ink">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-[var(--accent)]"
      />
    </label>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label ? (
        <div className="mb-1 text-[13px] font-medium text-ink-secondary">{label}</div>
      ) : null}
      <div className="inline-flex rounded-lg border border-borderline bg-surface-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors ${
              o.value === value
                ? "bg-accent text-white"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WidgetButton({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${
        primary
          ? "bg-accent text-white hover:brightness-110"
          : "border border-borderline-strong bg-surface-2 text-ink-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
