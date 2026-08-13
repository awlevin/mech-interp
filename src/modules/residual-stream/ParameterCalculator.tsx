"use client";

import { useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Where do a GPT-2-style model's parameters actually live?
 *
 * The arithmetic is exact for the GPT-2 family (learned absolute positional
 * embeddings, pre-LayerNorm blocks with biases, 4x MLP, tied unembedding):
 * the presets reproduce 124,439,808 / 354,823,168 / 1,557,611,200 exactly.
 */

type Config = {
  dModel: number;
  nLayers: number;
  nHeads: number;
  dMlp: number;
  vocab: number;
  nCtx: number;
};

const PRESETS: { label: string; cfg: Config; known: string }[] = [
  {
    label: "GPT-2 small",
    cfg: { dModel: 768, nLayers: 12, nHeads: 12, dMlp: 3072, vocab: 50257, nCtx: 1024 },
    known: "124,439,808",
  },
  {
    label: "GPT-2 medium",
    cfg: { dModel: 1024, nLayers: 24, nHeads: 16, dMlp: 4096, vocab: 50257, nCtx: 1024 },
    known: "354,823,168",
  },
  {
    label: "GPT-2 XL",
    cfg: { dModel: 1600, nLayers: 48, nHeads: 25, dMlp: 6400, vocab: 50257, nCtx: 1024 },
    known: "1,557,611,200",
  },
];

function compute(c: Config) {
  const dHead = Math.max(1, Math.round(c.dModel / c.nHeads));
  const attnPerLayer = 4 * c.dModel * c.nHeads * dHead + 4 * c.dModel; // W_Q,K,V,O + biases
  const mlpPerLayer = 2 * c.dModel * c.dMlp + c.dMlp + c.dModel; // up + down + biases
  const lnPerLayer = 4 * c.dModel; // two LayerNorms, gain + bias each
  const embed = c.vocab * c.dModel;
  const pos = c.nCtx * c.dModel;
  const attn = attnPerLayer * c.nLayers;
  const mlp = mlpPerLayer * c.nLayers;
  const ln = lnPerLayer * c.nLayers + 2 * c.dModel; // + final LayerNorm
  const total = embed + pos + attn + mlp + ln;
  return { dHead, embed, pos, attn, mlp, ln, total, attnPerLayer, mlpPerLayer, lnPerLayer };
}

const fmt = (n: number) => n.toLocaleString("en-US");
const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`;

const BUCKETS = [
  { key: "embed", label: "token embedding", color: "var(--series-1)" },
  { key: "pos", label: "positional embedding", color: "var(--series-3)" },
  { key: "attn", label: "attention", color: "var(--series-2)" },
  { key: "mlp", label: "MLP", color: "var(--series-4)" },
  { key: "ln", label: "LayerNorm", color: "var(--series-5)" },
] as const;

export function ParameterCalculator() {
  const [cfg, setCfg] = useState<Config>(PRESETS[0].cfg);
  const [activePreset, setActivePreset] = useState<string | null>("GPT-2 small");

  const set = <K extends keyof Config>(k: K, v: number) => {
    setActivePreset(null);
    setCfg((c) => ({ ...c, [k]: v }));
  };

  const r = compute(cfg);
  const values: Record<string, number> = {
    embed: r.embed,
    pos: r.pos,
    attn: r.attn,
    mlp: r.mlp,
    ln: r.ln,
  };
  const matched = PRESETS.find((p) => p.label === activePreset);

  return (
    <WidgetShell
      title="Where the parameters live"
      subtitle="GPT-2-family arithmetic: learned positional embeddings, pre-LayerNorm blocks with biases, and a tied unembedding (so the output matrix is free). Move the sliders and watch the stacked bar redistribute."
      footer={
        <>
          Total:{" "}
          <span className="font-mono text-ink">{fmt(r.total)}</span> parameters ={" "}
          <span className="font-mono text-ink">{compact(r.total)}</span>. Head
          width <span className="font-mono text-ink">d_head = {r.dHead}</span>.
          Per layer:{" "}
          <span className="font-mono text-ink">{fmt(r.attnPerLayer)}</span>{" "}
          attention +{" "}
          <span className="font-mono text-ink">{fmt(r.mlpPerLayer)}</span> MLP +{" "}
          <span className="font-mono text-ink">{fmt(r.lnPerLayer)}</span>{" "}
          LayerNorm.
          {matched ? (
            <>
              {" "}
              Published count for {matched.label}:{" "}
              <span className="font-mono text-ink">{matched.known}</span>{" "}
              {fmt(r.total) === matched.known ? "✓ exact match." : "(mismatch)"}
            </>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <WidgetButton
            key={p.label}
            primary={activePreset === p.label}
            onClick={() => {
              setCfg(p.cfg);
              setActivePreset(p.label);
            }}
          >
            {p.label}
          </WidgetButton>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <Slider
            label="d_model"
            value={cfg.dModel}
            min={64}
            max={2048}
            step={64}
            onChange={(v) => set("dModel", v)}
            format={(v) => `${v}`}
          />
          <Slider
            label="n_layers"
            value={cfg.nLayers}
            min={1}
            max={48}
            step={1}
            onChange={(v) => set("nLayers", v)}
            format={(v) => `${v}`}
          />
          <Slider
            label="n_heads"
            value={cfg.nHeads}
            min={1}
            max={32}
            step={1}
            onChange={(v) => set("nHeads", v)}
            format={(v) => `${v} (d_head ${Math.max(1, Math.round(cfg.dModel / v))})`}
          />
          <Slider
            label="d_mlp"
            value={cfg.dMlp}
            min={128}
            max={8192}
            step={128}
            onChange={(v) => set("dMlp", v)}
            format={(v) => `${v} (${(v / cfg.dModel).toFixed(1)}× d_model)`}
          />
          <Slider
            label="vocab"
            value={cfg.vocab}
            min={1000}
            max={128000}
            step={1000}
            onChange={(v) => set("vocab", v)}
            format={(v) => fmt(v)}
          />
          <Slider
            label="n_ctx (positions)"
            value={cfg.nCtx}
            min={128}
            max={8192}
            step={128}
            onChange={(v) => set("nCtx", v)}
            format={(v) => fmt(v)}
          />
        </div>

        <div>
          <div className="mb-1 font-mono text-2xl text-ink">{compact(r.total)}</div>
          <div className="mb-4 font-mono text-[13px] text-ink-muted">
            {fmt(r.total)} parameters
          </div>

          <div className="flex h-8 w-full overflow-hidden rounded-md bg-surface-2">
            {BUCKETS.map((b) => (
              <div
                key={b.key}
                title={`${b.label}: ${fmt(values[b.key])}`}
                style={{
                  width: `${(values[b.key] / r.total) * 100}%`,
                  background: b.color,
                }}
              />
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            {BUCKETS.map((b) => (
              <div key={b.key} className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: b.color }}
                />
                <span className="w-40 shrink-0 text-ink-secondary">{b.label}</span>
                <span className="w-28 shrink-0 text-right font-mono text-ink">
                  {fmt(values[b.key])}
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-ink-muted">
                  {((values[b.key] / r.total) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[13px] leading-5 text-ink-muted">
            Two things worth noticing. <strong>Moving n_heads does not change
            the total</strong> — heads split a fixed budget of{" "}
            <span className="font-mono">4·d_model²</span>, they do not add to it.
            And inside the layer stack, MLP beats attention{" "}
            <span className="font-mono">
              {(r.mlp / Math.max(r.attn, 1)).toFixed(2)}
            </span>
            :1 — at the standard 4× expansion it is always exactly 2:1, before
            biases.
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
