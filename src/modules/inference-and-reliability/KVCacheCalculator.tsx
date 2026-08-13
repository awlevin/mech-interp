"use client";

import { useState } from "react";
import { SegmentedControl, Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * KV cache memory:
 *   bytes = 2 (K and V) × layers × kv_heads × head_dim × context × batch × bytes_per_element
 * Plotted against context length on log–log axes, with the two reference lines
 * that actually constrain deployments.
 */

type Precision = "fp16" | "fp8" | "int4";
const BYTES: Record<Precision, number> = { fp16: 2, fp8: 1, int4: 0.5 };

type Preset = { name: string; layers: number; kvHeads: number; headDim: number; note: string };
const PRESETS: Preset[] = [
  { name: "GPT-2 small", layers: 12, kvHeads: 12, headDim: 64, note: "MHA, 12 query heads" },
  { name: "Llama-3 8B", layers: 32, kvHeads: 8, headDim: 128, note: "GQA: 32 query heads share 8 KV heads" },
  { name: "Llama-3 70B", layers: 80, kvHeads: 8, headDim: 128, note: "GQA: 64 query heads share 8 KV heads" },
  { name: "70B without GQA", layers: 80, kvHeads: 64, headDim: 128, note: "the same model with plain MHA — 8× the cache" },
];

const REFS = [
  { gb: 24, label: "24 GB consumer GPU" },
  { gb: 80, label: "80 GB H100" },
];

const fmtTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

const fmtGB = (gb: number) =>
  gb >= 1000 ? `${(gb / 1000).toFixed(2)} TB` : gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;

export function KVCacheCalculator() {
  const [layers, setLayers] = useState(80);
  const [kvHeads, setKvHeads] = useState(8);
  const [headDim, setHeadDim] = useState(128);
  const [ctxExp, setCtxExp] = useState(17); // 2^17 = 131072
  const [batch, setBatch] = useState(1);
  const [prec, setPrec] = useState<Precision>("fp16");

  const ctx = Math.pow(2, ctxExp);
  const bytesPerToken = 2 * layers * kvHeads * headDim * BYTES[prec];
  const totalGB = (bytesPerToken * ctx * batch) / 1024 ** 3;

  const applyPreset = (p: Preset) => {
    setLayers(p.layers);
    setKvHeads(p.kvHeads);
    setHeadDim(p.headDim);
  };

  const W = 470;
  const H = 216;
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 40;
  const EXP_MIN = 10;
  const EXP_MAX = 21;
  const LOG_LO = -2; // 0.01 GB
  const LOG_HI = 4; //  10 TB
  const px = (e: number) => padL + ((e - EXP_MIN) / (EXP_MAX - EXP_MIN)) * (W - padL - padR);
  const py = (gb: number) => {
    // clamp only at the bottom; values above the axis run off the top of the
    // viewBox, which reads correctly as "off the chart"
    const l = Math.max(LOG_LO, Math.log10(Math.max(gb, 1e-9)));
    return padT + ((LOG_HI - l) / (LOG_HI - LOG_LO)) * (H - padT - padB);
  };
  const gbAt = (e: number) => (bytesPerToken * Math.pow(2, e) * batch) / 1024 ** 3;

  const fitsIn = (limitGB: number) => (limitGB * 1024 ** 3) / (bytesPerToken * batch);

  return (
    <WidgetShell
      title="KV cache memory calculator"
      subtitle={
        <>
          Every token you have already generated leaves behind a key and a value
          vector in every layer, held for the whole request. This is what decides
          how many users fit on a GPU.
        </>
      }
      footer={
        <>
          <span className="font-mono text-ink">
            2 × {layers} layers × {kvHeads} KV heads × {headDim} dim × {BYTES[prec]} B ={" "}
            {(bytesPerToken / 1024).toFixed(1)} KB per token
          </span>
          . At {fmtTokens(ctx)} tokens × batch {batch}, the cache is{" "}
          <span className="font-mono text-ink">{fmtGB(totalGB)}</span> — before
          any model weights. A 24 GB card holds{" "}
          <span className="font-mono text-ink">{fmtTokens(Math.round(fitsIn(24)))}</span>{" "}
          tokens of this cache; an 80 GB H100 holds{" "}
          <span className="font-mono text-ink">{fmtTokens(Math.round(fitsIn(80)))}</span>.
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <WidgetButton
            key={p.name}
            primary={p.layers === layers && p.kvHeads === kvHeads && p.headDim === headDim}
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </WidgetButton>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Slider label="Layers" value={layers} min={1} max={128} step={1} onChange={(v) => setLayers(Math.round(v))} />
        <Slider label="KV heads" value={kvHeads} min={1} max={64} step={1} onChange={(v) => setKvHeads(Math.round(v))} />
        <Slider label="Head dim" value={headDim} min={32} max={256} step={8} onChange={(v) => setHeadDim(Math.round(v))} />
        <Slider
          label="Context length"
          value={ctxExp}
          min={EXP_MIN}
          max={EXP_MAX}
          step={1}
          onChange={(v) => setCtxExp(Math.round(v))}
          format={(v) => fmtTokens(Math.pow(2, Math.round(v)))}
        />
        <Slider label="Batch (concurrent requests)" value={batch} min={1} max={64} step={1} onChange={(v) => setBatch(Math.round(v))} />
        <div className="self-end">
          <SegmentedControl
            label="Cache precision"
            options={[
              { value: "fp16", label: "fp16" },
              { value: "fp8", label: "fp8" },
              { value: "int4", label: "int4" },
            ]}
            value={prec}
            onChange={setPrec}
          />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[470px]"
        role="img"
        aria-label={`KV cache memory versus context length. At ${fmtTokens(ctx)} tokens and batch ${batch}, the cache is ${fmtGB(totalGB)}`}
      >
        {[-2, -1, 0, 1, 2, 3, 4].map((l) => (
          <g key={l}>
            <line x1={padL} x2={W - padR} y1={py(Math.pow(10, l))} y2={py(Math.pow(10, l))} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={py(Math.pow(10, l)) + 3.5} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">
              {fmtGB(Math.pow(10, l))}
            </text>
          </g>
        ))}

        {REFS.map((r, i) => (
          <g key={r.gb}>
            <line
              x1={padL}
              x2={W - padR}
              y1={py(r.gb)}
              y2={py(r.gb)}
              stroke={i === 0 ? "var(--series-4)" : "var(--series-5)"}
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <text x={W - padR - 2} y={py(r.gb) - 4} textAnchor="end" fontSize={9.5} fill={i === 0 ? "var(--series-4)" : "var(--series-5)"} className="font-mono">
              {r.label}
            </text>
          </g>
        ))}

        <polyline
          points={Array.from({ length: EXP_MAX - EXP_MIN + 1 }, (_, i) => {
            const e = EXP_MIN + i;
            return `${px(e).toFixed(1)},${py(gbAt(e)).toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2.5}
        />
        <line x1={px(ctxExp)} x2={px(ctxExp)} y1={padT} y2={H - padB} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(ctxExp)} cy={py(totalGB)} r={5} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />

        {[10, 12, 14, 16, 18, 20].map((e) => (
          <text key={e} x={px(e)} y={H - padB + 14} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" className="font-mono">
            {fmtTokens(Math.pow(2, e))}
          </text>
        ))}
        <text x={(padL + W - padR) / 2} y={H - 14} textAnchor="middle" fontSize={10} fill="var(--text-muted)" className="font-mono">
          context length (tokens)
        </text>
        <text x={4} y={12} fontSize={10} fill="var(--text-muted)" className="font-mono">
          cache size
        </text>
      </svg>
      <p className="mt-2 text-[12px] leading-5 text-ink-muted">
        {PRESETS.find((p) => p.layers === layers && p.kvHeads === kvHeads && p.headDim === headDim)?.note ??
          "Custom configuration."}
      </p>
    </WidgetShell>
  );
}
