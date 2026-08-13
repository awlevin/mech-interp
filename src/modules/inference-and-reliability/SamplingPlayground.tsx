"use client";

import { useMemo, useState } from "react";
import { Slider, WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * One fixed, illustrative next-token distribution. Apply temperature, then
 * top-k, then top-p — the order real samplers use — and show exactly which
 * rule removed which token.
 */

const TOKENS = [
  " sunny", " going", " a", " cold", " nice", " beautiful", " warm",
  " quite", " the", " perfect", " rainy", " absolutely", " surprisingly",
  " bananas", " 42",
];
const LOGITS = [3.4, 2.9, 2.7, 2.5, 2.3, 2.0, 1.9, 1.6, 1.3, 1.1, 0.9, 0.4, 0.1, -1.2, -2.6];

type Cut = null | "top-k" | "top-p";

function softmax(logits: number[], t: number): number[] {
  const scaled = logits.map((l) => l / Math.max(t, 0.01));
  const m = Math.max(...scaled);
  const exps = scaled.map((l) => Math.exp(l - m));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

const entropyBits = (p: number[]) =>
  -p.reduce((s, x) => s + (x > 0 ? x * Math.log2(x) : 0), 0);

export function SamplingPlayground() {
  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(TOKENS.length);
  const [topP, setTopP] = useState(1.0);
  const [draws, setDraws] = useState<number[]>(() => TOKENS.map(() => 0));
  const [last, setLast] = useState<number | null>(null);

  const view = useMemo(() => {
    const afterT = softmax(LOGITS, temp);
    // tokens are already ordered by descending logit, so index == rank
    const cut: Cut[] = afterT.map(() => null);
    let cum = 0;
    const cumulative: number[] = [];
    let nucleusClosed = false;
    afterT.forEach((p, i) => {
      cum += p;
      cumulative.push(cum);
      if (i >= topK) cut[i] = "top-k";
      // top-p keeps the smallest prefix whose mass reaches p, then stops
      if (cut[i] === null) {
        if (nucleusClosed) cut[i] = "top-p";
        else if (cum >= topP - 1e-12) nucleusClosed = true;
      }
    });
    const keptMass = afterT.reduce((s, p, i) => s + (cut[i] === null ? p : 0), 0);
    const final = afterT.map((p, i) => (cut[i] === null ? p / keptMass : 0));
    return { afterT, cut, cumulative, keptMass, final };
  }, [temp, topK, topP]);

  const kept = view.cut.filter((c) => c === null).length;
  const totalDraws = draws.reduce((a, b) => a + b, 0);

  const drawSome = (n: number) => {
    const next = [...draws];
    let pick = last;
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      let acc = 0;
      pick = view.final.length - 1;
      for (let j = 0; j < view.final.length; j++) {
        acc += view.final[j];
        if (r <= acc) {
          pick = j;
          break;
        }
      }
      next[pick] += 1;
    }
    setDraws(next);
    setLast(pick);
  };

  const W = 470;
  const barH = 15;
  const rowH = 20;
  const top = 18;
  const labelW = 120; // right edge of the token label; 0–38 is the threshold gutter
  const plotX = 126;
  const plotW = 186;
  const pX = 354;
  const cumX = 396;
  const H = top + TOKENS.length * rowH + 6;

  const kLineAfter = topK < TOKENS.length ? topK : -1;
  const pLineAfter = view.cut.findIndex((c) => c === "top-p");

  return (
    <WidgetShell
      title="Sampling: temperature, top-k, top-p"
      subtitle={
        <>
          A fixed illustrative distribution for{" "}
          <span className="font-mono text-ink">The weather today is…</span>{" "}
          Temperature reshapes it, then top-k and top-p truncate it, then what
          survives is renormalized. Watch which rule kills which token.
        </>
      }
      footer={
        <>
          Surviving tokens: <span className="font-mono text-ink">{kept}</span> of{" "}
          {TOKENS.length}. Mass kept before renormalizing:{" "}
          <span className="font-mono text-ink">{(view.keptMass * 100).toFixed(1)}%</span>.
          Entropy <span className="font-mono text-ink">{entropyBits(view.afterT).toFixed(2)}</span>{" "}
          bits after temperature →{" "}
          <span className="font-mono text-ink">{entropyBits(view.final).toFixed(2)}</span>{" "}
          bits after truncation.
          {totalDraws > 0 ? (
            <>
              {" "}
              Drawn <span className="font-mono text-ink">{totalDraws}</span> times.
            </>
          ) : null}
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Slider label="Temperature T" value={temp} min={0.05} max={2} step={0.05} onChange={setTemp} format={(v) => v.toFixed(2)} />
        <Slider
          label="top-k"
          value={topK}
          min={1}
          max={TOKENS.length}
          step={1}
          onChange={(v) => setTopK(Math.round(v))}
          format={(v) => (v >= TOKENS.length ? "off" : String(v))}
        />
        <Slider
          label="top-p (nucleus)"
          value={topP}
          min={0.05}
          max={1}
          step={0.01}
          onChange={setTopP}
          format={(v) => (v >= 1 ? "off" : v.toFixed(2))}
        />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <WidgetButton primary onClick={() => drawSome(1)}>Draw a token</WidgetButton>
        <WidgetButton onClick={() => drawSome(50)}>Draw ×50</WidgetButton>
        <WidgetButton onClick={() => { setDraws(TOKENS.map(() => 0)); setLast(null); }}>Clear tally</WidgetButton>
        <WidgetButton onClick={() => { setTemp(1); setTopK(TOKENS.length); setTopP(1); setDraws(TOKENS.map(() => 0)); setLast(null); }}>
          Reset
        </WidgetButton>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[420px] max-w-[470px]"
          role="img"
          aria-label={`Next-token distribution with ${kept} of ${TOKENS.length} tokens surviving truncation`}
        >
          <text x={labelW} y={11} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">token</text>
          <text x={pX} y={11} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">p</text>
          <text x={cumX} y={11} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">cum %</text>
          <text x={W - 4} y={11} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">tally</text>

          {TOKENS.map((tok, i) => {
            const y = top + i * rowH;
            const cut = view.cut[i];
            const ghostW = Math.max(view.afterT[i] * plotW, 1);
            const finalW = Math.max(view.final[i] * plotW, cut ? 0 : 1);
            const dim = cut !== null;
            return (
              <g key={tok} transform={`translate(0 ${y})`}>
                <text
                  x={labelW}
                  y={barH / 2 + 4}
                  textAnchor="end"
                  fontSize={11.5}
                  className="font-mono"
                  fill={dim ? "var(--text-muted)" : last === i ? "var(--series-1)" : "var(--text-secondary)"}
                  textDecoration={dim ? "line-through" : undefined}
                >
                  {tok.trim()}
                </text>
                <rect x={plotX} y={0} width={plotW} height={barH} rx={3} fill="var(--surface-2)" />
                {/* pre-truncation shape, as a ghost */}
                <rect x={plotX} y={0} width={ghostW} height={barH} rx={3} fill="var(--border-strong)" />
                {/* post-truncation, renormalized */}
                {!dim ? <rect x={plotX} y={0} width={finalW} height={barH} rx={3} fill="var(--series-1)" /> : null}
                <text
                  x={pX}
                  y={barH / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  className="font-mono"
                  fill={dim ? "var(--text-muted)" : "var(--text-primary)"}
                >
                  {dim ? "—" : `${(view.final[i] * 100).toFixed(1)}%`}
                </text>
                <text
                  x={cumX}
                  y={barH / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  className="font-mono"
                  fill="var(--text-muted)"
                >
                  {(view.cumulative[i] * 100).toFixed(0)}
                </text>
                {cut ? (
                  <text
                    x={W - 4}
                    y={barH / 2 + 4}
                    textAnchor="end"
                    fontSize={9.5}
                    className="font-mono"
                    fill={cut === "top-k" ? "var(--series-4)" : "var(--series-2)"}
                  >
                    cut by {cut}
                  </text>
                ) : draws[i] > 0 ? (
                  <text x={W - 4} y={barH / 2 + 4} textAnchor="end" fontSize={10} className="font-mono" fill="var(--text-secondary)">
                    {draws[i]}
                  </text>
                ) : null}
              </g>
            );
          })}

          {kLineAfter > 0 ? (
            <g>
              <line
                x1={42}
                x2={cumX + 4}
                y1={top + kLineAfter * rowH - 3}
                y2={top + kLineAfter * rowH - 3}
                stroke="var(--series-4)"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <text x={38} y={top + kLineAfter * rowH} textAnchor="end" fontSize={9} fill="var(--series-4)" className="font-mono">
                k={topK}
              </text>
            </g>
          ) : null}
          {pLineAfter > 0 && (kLineAfter < 0 || pLineAfter < kLineAfter) ? (
            <g>
              <line
                x1={42}
                x2={cumX + 4}
                y1={top + pLineAfter * rowH - 3}
                y2={top + pLineAfter * rowH - 3}
                stroke="var(--series-2)"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <text x={38} y={top + pLineAfter * rowH} textAnchor="end" fontSize={9} fill="var(--series-2)" className="font-mono">
                p={topP.toFixed(2)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "var(--border-strong)" }} />
          after temperature, before truncation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "var(--series-1)" }} />
          final, renormalized
        </span>
      </div>
    </WidgetShell>
  );
}
