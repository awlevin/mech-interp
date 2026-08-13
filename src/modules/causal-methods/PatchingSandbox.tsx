"use client";

import { useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

/**
 * Interactive activation-patching sandbox for the IOI task on GPT-2 small.
 *
 * The effect sizes below are HAND-AUTHORED to reproduce the qualitative shape
 * of Wang et al. (2022) — which components matter, at which token positions,
 * and roughly how much — not measured numbers. They encode:
 *   - name movers (9.6, 9.9, 10.0) dominate at END
 *   - S-inhibition (7.3, 7.9, 8.6, 8.10) matters at END, one step earlier
 *   - duplicate-token (0.1, 3.0) and induction (5.5, 6.9) matter at S2, not END
 *   - previous-token (2.2, 4.11) matters at S1+1 only
 *   - negative name movers (10.7, 11.10) push the other way
 *   - MLP0 matters everywhere (it acts as an extended embedding)
 *   - the overwhelming majority of components do essentially nothing
 * and, in the noising direction, the self-repair effect: knocking out name
 * movers hurts far less than patching them in helps, because backup name
 * movers take over.
 */

const N_LAYERS = 12;

const POSITIONS = [
  { value: "s1p1" as const, label: "S1+1  (“and”)" },
  { value: "s2" as const, label: "S2  (“John”, 2nd)" },
  { value: "end" as const, label: "END  (“to”)" },
];
type Pos = (typeof POSITIONS)[number]["value"];

const DIRECTIONS = [
  { value: "denoise" as const, label: "Denoise (clean → corrupted)" },
  { value: "noise" as const, label: "Noise (corrupted → clean)" },
];
type Dir = (typeof DIRECTIONS)[number]["value"];

type Table = Record<Pos, { attn: number[]; mlp: number[] }>;

const DENOISE: Table = {
  s1p1: {
    attn: [0.6, 0.3, 6.2, 0.5, 5.1, 1.2, 0.8, 0.4, 0.4, 0.3, 0.2, 0.2],
    mlp: [3.1, 0.4, 0.6, 0.4, 0.5, 0.3, 0.3, 0.2, 0.2, 0.2, 0.2, 0.1],
  },
  s2: {
    attn: [7.4, 0.4, 0.6, 9.1, 0.5, 13.2, 8.3, 3.0, 2.4, 1.0, 0.5, 0.3],
    mlp: [3.4, 0.5, 0.7, 0.6, 0.5, 0.8, 0.6, 0.4, 0.3, 0.2, 0.2, 0.1],
  },
  end: {
    attn: [0.5, 0.3, 0.4, 0.6, 0.5, 0.8, 1.0, 12.4, 14.1, 57.6, 18.2, -4.3],
    mlp: [4.2, 0.6, 0.5, 0.7, 0.6, 0.8, 0.9, 1.1, 1.4, 1.7, 1.5, 0.9],
  },
};

const NOISE: Table = {
  s1p1: {
    attn: [0.5, 0.3, 5.4, 0.4, 4.4, 1.0, 0.7, 0.4, 0.3, 0.3, 0.2, 0.2],
    mlp: [2.7, 0.4, 0.5, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1],
  },
  s2: {
    attn: [6.1, 0.3, 0.5, 7.8, 0.4, 11.4, 7.0, 2.6, 2.1, 0.9, 0.4, 0.3],
    mlp: [2.9, 0.4, 0.6, 0.5, 0.4, 0.7, 0.5, 0.3, 0.3, 0.2, 0.2, 0.1],
  },
  end: {
    attn: [0.4, 0.3, 0.3, 0.5, 0.4, 0.7, 0.9, 9.8, 11.2, 33.5, 9.4, -2.1],
    mlp: [3.6, 0.5, 0.4, 0.6, 0.5, 0.7, 0.8, 0.9, 1.1, 1.3, 1.1, 0.7],
  },
};

type Comp = "attn" | "mlp";

const NOTES: Record<string, { title: string; text: string }> = {
  "end-attn-9": {
    title: "Name Mover Heads — 9.6, 9.9 (and 10.0 above)",
    text: "The end of the road. These heads sit at the END position, attend to earlier names, and copy whatever they attend to straight into the logits — their copy score is above 95%. Patching them alone recovers most of the logit difference, which is why the circuit was discovered by starting at the logits and walking backwards.",
  },
  "end-attn-10": {
    title: "Name Mover 10.0 + Negative Name Mover 10.7 + backups",
    text: "Layer 10 is mixed. Head 10.0 is a third name mover; head 10.7 is a Negative Name Mover that writes in the opposite direction, hedging the prediction. Several backup name movers also live here. The net effect is positive but smaller than layer 9 — a reminder that a whole-layer patch averages over heads that disagree.",
  },
  "end-attn-11": {
    title: "Negative Name Mover 11.10",
    text: "Negative effect: patching the clean activation in makes performance slightly worse. These heads suppress the correct answer, apparently to hedge against confident mistakes. If you only look at the magnitude of patching effects you will miss the sign, and the sign is the interesting part here.",
  },
  "end-attn-8": {
    title: "S-Inhibition Heads — 8.6, 8.10",
    text: "Active at END, attending back to S2. They write into the *queries* of the name movers, telling them not to attend to the duplicated name. Path patching from these heads to name-mover queries is what identified them: their effect on the logits is almost entirely mediated by the name movers.",
  },
  "end-attn-7": {
    title: "S-Inhibition Heads — 7.3, 7.9",
    text: "The other two S-inhibition heads. Wang et al. decompose what they write into a token signal (the identity of S) and a position signal (where S1 was) — and find the position signal carries roughly twice the weight.",
  },
  "s2-attn-0": {
    title: "Duplicate Token Head — 0.1",
    text: "Active at the second “John”, attending back to the first. It signals that duplication has happened by writing the position of the earlier copy. Note it does essentially nothing at END: components matter at *positions*, not globally.",
  },
  "s2-attn-3": {
    title: "Duplicate Token Head — 3.0",
    text: "The larger of the two duplicate-token heads. Same job: detect that this token already appeared and record where.",
  },
  "s2-attn-5": {
    title: "Induction Heads — 5.5 (and 5.8, 5.9)",
    text: "A second, redundant route to the same signal. Induction heads at S2 attend to S1+1 — the token after the first “John” — using the previous-token heads' output as a key. You met this mechanism in Module 3.2; here it is doing duplicate detection as a side job.",
  },
  "s2-attn-6": {
    title: "Induction Head — 6.9",
    text: "Same class as 5.5. The redundancy between duplicate-token heads and induction heads is a good example of why a single ablation can look uninformative: knock out one route and the other still carries the signal.",
  },
  "s1p1-attn-2": {
    title: "Previous Token Head — 2.2",
    text: "Copies information about the first “John” forward onto the following token, so that an induction head at S2 can find it by attending one position later. Nothing else in the circuit reads this position.",
  },
  "s1p1-attn-4": {
    title: "Previous Token Head — 4.11",
    text: "The second previous-token head. Its whole contribution is mediated by the induction heads — path patching, not plain patching, is what shows that.",
  },
};

const MLP0_NOTE = {
  title: "MLP 0 — the “extended embedding”",
  text: "MLP0 has a small effect at every position and is not really part of the IOI algorithm. In GPT-2 small it behaves like a continuation of the embedding layer, so knocking it out breaks everything a little. Wang et al. found the model can survive ablating every MLP except this one.",
};

const DEFAULT_NOTE = {
  title: "No meaningful direct effect",
  text: "Patching this component moves the logit difference by around a percent — inside the noise. This is the normal case: the circuit is 26 attention heads out of 144, about 1.1% of the (head, position) pairs in the model. Most of GPT-2 small is doing something else entirely.",
};

const TOKENS = [
  { t: "When", tag: "" },
  { t: "John", tag: "S1" },
  { t: "and", tag: "S1+1" },
  { t: "Mary", tag: "IO" },
  { t: "went", tag: "" },
  { t: "to", tag: "" },
  { t: "the", tag: "" },
  { t: "store", tag: "" },
  { t: ",", tag: "" },
  { t: "John", tag: "S2" },
  { t: "gave", tag: "" },
  { t: "a", tag: "" },
  { t: "drink", tag: "" },
  { t: "to", tag: "END" },
];

const POS_TAG: Record<Pos, string> = { s1p1: "S1+1", s2: "S2", end: "END" };

export function PatchingSandbox() {
  const [pos, setPos] = useState<Pos>("end");
  const [dir, setDir] = useState<Dir>("denoise");
  const [sel, setSel] = useState<{ comp: Comp; layer: number }>({
    comp: "attn",
    layer: 9,
  });

  const table = dir === "denoise" ? DENOISE : NOISE;
  const vals = table[pos];
  const effect = vals[sel.comp][sel.layer];

  const noteKey = `${pos}-${sel.comp}-${sel.layer}`;
  const note =
    NOTES[noteKey] ??
    (sel.comp === "mlp" && sel.layer === 0 ? MLP0_NOTE : DEFAULT_NOTE);

  // ---- geometry ----
  const cellW = 78;
  const cellH = 21;
  const gap = 4;
  const left = 54;
  const top = 26;
  const W = left + 2 * (cellW + gap) + 10;
  const H = top + N_LAYERS * (cellH + gap) + 8;

  const maxAbs = Math.max(
    ...vals.attn.map(Math.abs),
    ...vals.mlp.map(Math.abs),
    1,
  );

  const cell = (comp: Comp, layer: number) => {
    const v = vals[comp][layer];
    const x = left + (comp === "attn" ? 0 : cellW + gap);
    const y = top + (N_LAYERS - 1 - layer) * (cellH + gap);
    const mag = Math.min(Math.abs(v) / maxAbs, 1);
    const isSel = sel.comp === comp && sel.layer === layer;
    return (
      <g
        key={`${comp}-${layer}`}
        onClick={() => setSel({ comp, layer })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setSel({ comp, layer });
        }}
        role="button"
        tabIndex={0}
        aria-label={`${comp === "attn" ? "Attention" : "MLP"} layer ${layer}, effect ${v.toFixed(1)} percent`}
        className="cursor-pointer"
      >
        <rect
          x={x}
          y={y}
          width={cellW}
          height={cellH}
          rx={4}
          fill="var(--surface-2)"
        />
        <rect
          x={x}
          y={y}
          width={cellW}
          height={cellH}
          rx={4}
          fill={v < 0 ? "var(--series-2)" : "var(--series-1)"}
          opacity={0.12 + 0.88 * mag}
        />
        <rect
          x={x}
          y={y}
          width={cellW}
          height={cellH}
          rx={4}
          fill="none"
          stroke={isSel ? "var(--text-primary)" : "var(--border)"}
          strokeWidth={isSel ? 2 : 1}
        />
        <text
          x={x + cellW / 2}
          y={y + cellH / 2 + 3.5}
          textAnchor="middle"
          fontSize={10}
          className="font-mono"
          fill="var(--text-primary)"
        >
          {v.toFixed(1)}
        </text>
      </g>
    );
  };

  const barPct = Math.max(0, Math.min(Math.abs(effect), 100));

  return (
    <WidgetShell
      title="Activation patching sandbox — IOI in GPT-2 small"
      subtitle="Pick a token position, pick a direction, then click any component to patch it. The number is the share of the clean logit difference that single patch moves."
      footer={
        <>
          Effect sizes are hand-authored to reproduce the{" "}
          <em>qualitative</em> findings of Wang et al. (2022) — which components
          matter, at which positions, and roughly how much. They are not measured
          values; the notebook problem has you measure the real ones. GPT-2
          small&apos;s true mean logit difference on this task is 3.56, and it
          prefers the indirect object 99.3% of the time.
        </>
      }
    >
      <div className="mb-4 rounded-lg border border-borderline bg-surface-2 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Clean prompt
        </div>
        <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-2">
          {TOKENS.map((tk, i) => {
            const active = tk.tag === POS_TAG[pos];
            return (
              <span key={i} className="relative inline-block">
                <span
                  className={`rounded px-1 py-0.5 font-mono text-[13px] ${
                    active
                      ? "bg-accent text-white"
                      : tk.tag
                        ? "bg-surface-1 text-ink"
                        : "text-ink-secondary"
                  }`}
                >
                  {tk.t}
                </span>
                {tk.tag ? (
                  <span className="ml-1 font-mono text-[9px] text-ink-muted">
                    {tk.tag}
                  </span>
                ) : null}
              </span>
            );
          })}
          <span className="font-mono text-[13px] text-ink-muted">→</span>
          <span className="rounded bg-surface-1 px-1 py-0.5 font-mono text-[13px] text-ink">
            Mary
          </span>
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Corrupted prompt
        </div>
        <div className="mt-1 font-mono text-[13px] leading-6 text-ink-secondary">
          When John and Mary went to the store,{" "}
          <span className="rounded bg-surface-1 px-1 text-ink">Chris</span> gave a
          drink to → <span className="text-ink-muted">(no duplicate name; the model has no reason to prefer Mary)</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <SegmentedControl
          label="Patch at token"
          options={POSITIONS}
          value={pos}
          onChange={setPos}
        />
        <SegmentedControl
          label="Direction"
          options={DIRECTIONS}
          value={dir}
          onChange={setDir}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[240px]"
          role="img"
          aria-label="Grid of attention and MLP components by layer, shaded by patching effect"
        >
          <text x={left + cellW / 2} y={16} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-muted)">
            attn
          </text>
          <text x={left + cellW + gap + cellW / 2} y={16} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-muted)">
            mlp
          </text>
          {Array.from({ length: N_LAYERS }, (_, l) => (
            <text
              key={l}
              x={left - 8}
              y={top + (N_LAYERS - 1 - l) * (cellH + gap) + cellH / 2 + 3.5}
              textAnchor="end"
              fontSize={10}
              className="font-mono"
              fill="var(--text-muted)"
            >
              L{l}
            </text>
          ))}
          {Array.from({ length: N_LAYERS }, (_, l) => cell("attn", l))}
          {Array.from({ length: N_LAYERS }, (_, l) => cell("mlp", l))}
        </svg>

        <div>
          <div className="text-[13px] font-semibold text-ink">
            {sel.comp === "attn" ? "Attention" : "MLP"} · layer {sel.layer} ·{" "}
            {POS_TAG[pos]}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[12px] text-ink-secondary">
                {dir === "denoise"
                  ? "logit difference recovered"
                  : "logit difference destroyed"}
              </span>
              <span className="font-mono text-[13px] text-ink">
                {effect.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${barPct}%`,
                  background:
                    effect < 0 ? "var(--series-2)" : "var(--series-1)",
                }}
              />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-3">
            <div className="text-[13px] font-semibold text-ink">
              {note.title}
            </div>
            <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
              {note.text}
            </p>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-ink-muted">
            {dir === "denoise"
              ? "Denoising runs the corrupted prompt and splices in one clean activation. A large number means this component is sufficient, on its own, to restore the behavior."
              : "Noising runs the clean prompt and splices in one corrupted activation. A large number means this component is necessary. Compare layer 9 at END in both directions — the gap is self-repair by backup name-mover heads."}
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
