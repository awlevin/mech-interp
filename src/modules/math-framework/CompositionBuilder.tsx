"use client";

import { useState } from "react";
import { M } from "@/components/Katex";
import { WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Two-layer attention-only model. Toggle which of H1's three inputs read the
 * subspace H0 wrote into the residual stream, and see which terms of the path
 * expansion exist.
 */

type Comp = { q: boolean; k: boolean; v: boolean };

const OFF: Comp = { q: false, k: false, v: false };

export function CompositionBuilder() {
  const [c, setC] = useState<Comp>(OFF);
  const toggle = (key: keyof Comp) => setC((p) => ({ ...p, [key]: !p[key] }));

  const W = 520;
  const H = 250;

  // x positions along the residual stream
  const X_EMB = 70;
  const X_H0 = 190; // where H0 writes
  const X_READ_PRE = 150; // reading point before H0's write
  const X_READ_POST = 250; // reading point after H0's write
  const Y_STREAM = 62;

  const qkv: { key: keyof Comp; label: string; x: number; color: string }[] = [
    { key: "q", label: "Q", x: 340, color: "var(--series-4)" },
    { key: "k", label: "K", x: 378, color: "var(--series-3)" },
    { key: "v", label: "V", x: 416, color: "var(--series-5)" },
  ];

  const virtualHead = c.v;
  const movesAttention = c.q || c.k;

  return (
    <WidgetShell
      title="Composition builder: which circuits exist?"
      subtitle="H1 reads the residual stream three times — once for queries, once for keys, once for values. Each read either sees only the embeddings, or sees the embeddings plus whatever H0 wrote. Those three independent choices are Q-, K- and V-composition."
      footer={
        <>
          Virtual attention heads in this configuration:{" "}
          <span className="font-mono text-ink">{virtualHead ? 1 : 0}</span>. Only
          V-composition makes one. Q- and K-composition are just as important —
          they are how the induction circuit works — but they change{" "}
          <em>where</em> H1 looks, not <em>what</em> it moves, so they do not
          appear as a new OV term in the path expansion.
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {qkv.map((s) => (
          <WidgetButton key={s.key} primary={c[s.key]} onClick={() => toggle(s.key)}>
            {c[s.key] ? "✓ " : ""}
            {s.label}-composition
          </WidgetButton>
        ))}
        <WidgetButton onClick={() => setC(OFF)}>Reset</WidgetButton>
        <WidgetButton onClick={() => setC({ q: false, k: true, v: false })}>
          Induction preset
        </WidgetButton>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[520px]"
        role="img"
        aria-label="Two-layer residual stream diagram with toggleable composition paths"
      >
        <defs>
          <marker id="cb-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--text-secondary)" />
          </marker>
        </defs>

        {/* residual stream */}
        <rect x={40} y={Y_STREAM} width={430} height={20} rx={5} fill="var(--surface-2)" />
        <text x={40} y={Y_STREAM - 8} fontSize={10} fill="var(--text-muted)" className="font-mono">
          residual stream (the only channel between layers)
        </text>

        {/* embeddings in */}
        <rect x={X_EMB - 32} y={18} width={64} height={22} rx={4} fill="var(--surface-1)" stroke="var(--border-strong)" />
        <text x={X_EMB} y={33} fontSize={10} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
          W_E · t
        </text>
        <path
          d={`M${X_EMB},40 L${X_EMB},${Y_STREAM}`}
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
          markerEnd="url(#cb-arrow)"
        />

        {/* unembed out */}
        <rect x={470 - 12} y={18} width={44} height={22} rx={4} fill="var(--surface-1)" stroke="var(--border-strong)" />
        <text x={480} y={33} fontSize={10} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
          W_U
        </text>
        <path
          d={`M${466},${Y_STREAM + 4} L${480},${Y_STREAM + 4} L${480},42`}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
          markerEnd="url(#cb-arrow)"
        />

        {/* H0 */}
        <rect x={X_H0 - 40} y={118} width={80} height={30} rx={5} fill="var(--surface-1)" stroke="var(--series-1)" strokeWidth={1.6} />
        <text x={X_H0} y={137} fontSize={11} textAnchor="middle" fill="var(--text-primary)" className="font-mono">
          H0 (layer 0)
        </text>
        {/* H0 reads */}
        <path
          d={`M${X_EMB + 30},${Y_STREAM + 20} L${X_EMB + 30},133 L${X_H0 - 40},133`}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1.3}
          strokeDasharray="3 3"
          markerEnd="url(#cb-arrow)"
        />
        {/* H0 writes */}
        <path
          d={`M${X_H0},118 L${X_H0},${Y_STREAM + 20}`}
          stroke="var(--series-1)"
          strokeWidth={2}
          markerEnd="url(#cb-arrow)"
        />
        <text x={X_H0 + 6} y={100} fontSize={9} fill="var(--series-1)" className="font-mono">
          writes
        </text>

        {/* H1 */}
        <rect x={330} y={190} width={130} height={30} rx={5} fill="var(--surface-1)" stroke="var(--series-2)" strokeWidth={1.6} />
        <text x={395} y={209} fontSize={11} textAnchor="middle" fill="var(--text-primary)" className="font-mono">
          H1 (layer 1)
        </text>
        {/* H1 writes back */}
        <path
          d={`M${455},190 L${455},${Y_STREAM + 20}`}
          stroke="var(--series-2)"
          strokeWidth={2}
          markerEnd="url(#cb-arrow)"
        />

        {/* Q K V read arrows */}
        {qkv.map((s) => {
          const on = c[s.key];
          const from = on ? X_READ_POST : X_READ_PRE;
          const color = on ? s.color : "var(--text-muted)";
          return (
            <g key={s.key}>
              <path
                d={`M${from},${Y_STREAM + 20} L${from},${168} L${s.x},${168} L${s.x},190`}
                fill="none"
                stroke={color}
                strokeWidth={on ? 2 : 1.2}
                strokeDasharray={on ? "none" : "3 3"}
                markerEnd="url(#cb-arrow)"
              />
              <circle cx={from} cy={Y_STREAM + 20} r={3} fill={color} />
              <text x={s.x} y={186} fontSize={10} textAnchor="middle" fill={color} className="font-mono">
                {s.label}
              </text>
            </g>
          );
        })}

        <text x={X_READ_PRE - 40} y={Y_STREAM + 38} fontSize={9} fill="var(--text-muted)" className="font-mono">
          before H0
        </text>
        <text x={X_READ_POST - 12} y={Y_STREAM + 38} fontSize={9} fill="var(--text-muted)" className="font-mono">
          after H0
        </text>
      </svg>

      <div className="mt-4 space-y-2">
        <PathCard
          on
          title="Direct path"
          math={String.raw`W_U W_E`}
          desc="Bigram statistics straight from the embedding. Always present, and in small models it does a surprising amount of the work."
        />
        <PathCard
          on
          title="H0's own OV path"
          math={String.raw`W_U\, W_{OV}^{H0}\, W_E`}
          desc="H0 moves token information and it lands directly on the logits. A skip-trigram: “…A… B → C”."
        />
        <PathCard
          on
          title="H1's own OV path"
          math={String.raw`W_U\, W_{OV}^{H1}\, W_E`}
          desc="Same, one layer up. Note it reads the embeddings, not H0's output — that is what V-composition would change."
        />
        <PathCard
          on={c.v}
          title="Virtual attention head H0 → H1"
          math={String.raw`W_U\, W_{OV}^{H1} W_{OV}^{H0}\, W_E \quad\text{with pattern } A^{H1}A^{H0}`}
          desc="H1's values are computed from what H0 wrote, so the composite behaves like a single head whose OV matrix is the product and whose attention pattern is the product of the two patterns. This is the only kind of composition that creates a new head."
        />
        <PathCard
          on={c.q}
          title="Q-composition"
          math={String.raw`\big(W_{OV}^{H0}W_E\big)^{\!\top} W_{QK}^{H1}\, W_E`}
          desc="H1's queries depend on H0's output: where H1 looks from now depends on earlier processing, not just on the current token."
        />
        <PathCard
          on={c.k}
          title="K-composition"
          math={String.raw`W_E^{\top}\, W_{QK}^{H1} \big(W_{OV}^{H0}W_E\big)`}
          desc="H1's keys depend on H0's output: a position advertises not what it is, but something H0 computed about it."
          badge={
            c.k
              ? "With H0 = previous-token head, this is exactly an induction head."
              : undefined
          }
        />
      </div>

      {movesAttention || virtualHead ? null : (
        <p className="mt-3 text-[13px] text-ink-muted">
          With no composition, this is effectively two independent one-layer
          models added together. Every term is a bigram or skip-trigram; nothing
          here can look up a pattern in the context.
        </p>
      )}
    </WidgetShell>
  );
}

function PathCard({
  on,
  title,
  math,
  desc,
  badge,
}: {
  on: boolean;
  title: string;
  math: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-opacity ${
        on
          ? "border-borderline-strong bg-surface-2 opacity-100"
          : "border-borderline bg-transparent opacity-40"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-ink-secondary">
          <M>{math}</M>
        </span>
        <span className="ml-auto font-mono text-[11px] text-ink-muted">
          {on ? "present" : "absent"}
        </span>
      </div>
      <div className="mt-1 text-[13px] leading-6 text-ink-secondary">{desc}</div>
      {badge && on ? (
        <div className="mt-1 inline-block rounded bg-accent-soft px-2 py-0.5 text-[12px] text-accent">
          {badge}
        </div>
      ) : null}
    </div>
  );
}
