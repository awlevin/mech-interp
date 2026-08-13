"use client";

import { useMemo, useState } from "react";
import {
  SegmentedControl,
  Slider,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";
import {
  CORPUS,
  encodeChunkTrace,
  encodeText,
  rankMap,
  trainBpe,
} from "./bpe";

const MAX_MERGES = 200;

type PresetKey = "prose" | "numbers" | "code" | "world";

const PRESETS: Record<PresetKey, string> = {
  prose:
    "The tokenizer learns which chunks of text deserve their own token. Tokenizing tokenizers is unreasonably self-referential.",
  numbers:
    "1024 + 2048 = 3072. Add 380 to 42 and you get 422. The year 1999 was 27 years ago.",
  code: "def train(model, tokens):\n    loss = model(tokens)\n    return loss.backward()",
  world:
    "Embedding space: Zürich, Ελλάδα, 東京, tokenización. Rare characters cost a token each.",
};

const SERIES = [1, 2, 3, 4, 5, 6, 7, 8];

function tokenBg(i: number) {
  return `color-mix(in srgb, var(--series-${SERIES[i % SERIES.length]}) 26%, var(--surface-2))`;
}

/**
 * A real BPE tokenizer: ~200 merges trained on the built-in mini corpus when
 * this widget mounts, then applied live to whatever the reader types.
 */
export function BpeTokenizerLab() {
  const [preset, setPreset] = useState<PresetKey>("prose");
  const [text, setText] = useState(PRESETS.prose);
  const [k, setK] = useState(MAX_MERGES);
  const [selected, setSelected] = useState(0);

  const model = useMemo(() => trainBpe(CORPUS, MAX_MERGES), []);
  const alphabet = useMemo(() => new Set(model.alphabet), [model]);
  const ranks = useMemo(() => rankMap(model.merges, k), [model, k]);
  const encoded = useMemo(() => encodeText(text, ranks), [text, ranks]);

  const flat = useMemo(
    () =>
      encoded.flatMap((c, ci) =>
        c.tokens.map((t) => ({ token: t, chunkIndex: ci })),
      ),
    [encoded],
  );

  const usedRanks = useMemo(() => {
    const used = new Set<number>();
    const seen = new Set<string>();
    for (const c of encoded) {
      if (seen.has(c.chunk)) continue;
      seen.add(c.chunk);
      for (const s of encodeChunkTrace(c.chunk, ranks).steps) used.add(s.rank);
    }
    return used;
  }, [encoded, ranks]);

  const chunkIndex = Math.min(selected, Math.max(encoded.length - 1, 0));
  const chunk = encoded[chunkIndex]?.chunk ?? "";
  const trace = useMemo(() => encodeChunkTrace(chunk, ranks), [chunk, ranks]);

  const unseen = flat.filter(
    (t) => Array.from(t.token).length === 1 && !alphabet.has(t.token),
  ).length;
  const ratio = flat.length > 0 ? text.length / flat.length : 0;

  const applyPreset = (p: PresetKey) => {
    setPreset(p);
    setText(PRESETS[p]);
    setSelected(0);
  };

  return (
    <WidgetShell
      title="BPE tokenizer, trained live"
      subtitle="Two hundred merges, learned right now from a small built-in corpus about this course. Type anything; the segmentation updates on every keystroke. The middle dot is a space — it belongs to the token that follows it."
      footer={
        <>
          <span className="font-mono text-ink">{text.length}</span> characters →{" "}
          <span className="font-mono text-ink">{flat.length}</span> tokens (
          <span className="font-mono text-ink">{ratio.toFixed(2)}</span>{" "}
          characters per token). Vocabulary at this setting:{" "}
          <span className="font-mono text-ink">{alphabet.size + k}</span> (
          {alphabet.size} characters + {k} merges).
          {unseen > 0 ? (
            <>
              {" "}
              <span className="font-mono text-ink">{unseen}</span> token
              {unseen === 1 ? "" : "s"} came from characters the corpus never
              contained — dashed outline. A real tokenizer avoids this by falling
              back to raw bytes, which is why GPT-2 can encode any input at all,
              just expensively.
            </>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SegmentedControl<PresetKey>
            label="sample text"
            value={preset}
            onChange={applyPreset}
            options={[
              { value: "prose", label: "prose" },
              { value: "numbers", label: "numbers" },
              { value: "code", label: "code" },
              { value: "world", label: "other scripts" },
            ]}
          />
          <div className="w-56">
            <Slider
              label="merges applied"
              value={k}
              min={0}
              max={MAX_MERGES}
              step={1}
              onChange={setK}
              format={(v) => `${v} / ${MAX_MERGES}`}
            />
          </div>
          <WidgetButton onClick={() => setK(MAX_MERGES)}>
            Full vocabulary
          </WidgetButton>
        </div>

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink-secondary">
            your text
          </span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSelected(0);
            }}
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-borderline bg-surface-2 p-3 font-mono text-[13px] leading-6 text-ink outline-none focus:border-accent"
          />
        </label>

        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-secondary">
            segmentation — click a token to trace how it was built
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-borderline bg-surface-1 p-3">
            {flat.length === 0 ? (
              <span className="text-[13px] text-ink-muted">
                (type something above)
              </span>
            ) : null}
            {flat.map((t, i) => {
              const isUnseen =
                Array.from(t.token).length === 1 && !alphabet.has(t.token);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(t.chunkIndex)}
                  title={`pre-token ${t.chunkIndex + 1}`}
                  className={`rounded px-1.5 py-0.5 font-mono text-[13px] text-ink transition-opacity hover:opacity-80 ${
                    isUnseen ? "border border-dashed border-warn" : ""
                  } ${t.chunkIndex === chunkIndex ? "ring-1 ring-accent" : ""}`}
                  style={{ backgroundColor: tokenBg(i) }}
                >
                  {t.token}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-borderline bg-surface-1 p-3">
            <div className="mb-2 text-[13px] font-medium text-ink-secondary">
              merge trace for{" "}
              <span className="font-mono text-ink">{chunk || "—"}</span>
            </div>
            {trace.steps.length === 0 ? (
              <p className="text-[13px] leading-6 text-ink-muted">
                No merge fires here: at {k} merges the tokenizer has not learned
                any pair inside this pre-token, so every character stays its own
                token.
              </p>
            ) : (
              <ol className="space-y-1">
                {trace.steps.map((s, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="w-14 shrink-0 font-mono text-[11px] text-ink-muted">
                      rank {s.rank}
                    </span>
                    <span className="font-mono text-[13px] text-ink-secondary">
                      {s.symbols.map((sym, j) => (
                        <span
                          key={j}
                          className={
                            j === s.at || j === s.at + 1
                              ? "rounded bg-accent-soft px-0.5 text-ink"
                              : ""
                          }
                        >
                          {sym}
                          {j < s.symbols.length - 1 ? (
                            <span className="text-ink-muted">|</span>
                          ) : null}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
                <li className="flex items-baseline gap-2 pt-1">
                  <span className="w-14 shrink-0 font-mono text-[11px] text-ink-muted">
                    final
                  </span>
                  <span className="font-mono text-[13px] text-ink">
                    {trace.tokens.join(" | ")}
                  </span>
                </li>
              </ol>
            )}
          </div>

          <div className="rounded-lg border border-borderline bg-surface-1 p-3">
            <div className="mb-2 text-[13px] font-medium text-ink-secondary">
              learned merges (in the order they were learned)
            </div>
            <div className="max-h-56 overflow-y-auto pr-1">
              <ul className="space-y-0.5">
                {model.merges.slice(0, k).map((m, i) => (
                  <li
                    key={i}
                    className={`flex items-baseline gap-2 rounded px-1 font-mono text-[12px] ${
                      usedRanks.has(i)
                        ? "bg-accent-soft text-ink"
                        : "text-ink-muted"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-right">{i}</span>
                    <span>
                      {m.a} + {m.b} → {m.token}
                    </span>
                    <span className="ml-auto text-[11px]">×{m.count}</span>
                  </li>
                ))}
                {k === 0 ? (
                  <li className="text-[12px] text-ink-muted">
                    No merges yet — this is a character-level tokenizer.
                  </li>
                ) : null}
              </ul>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-ink-muted">
              Highlighted merges are the ones that fired on your text. The count
              is how often the pair appeared in the corpus when it was merged —
              notice how fast it falls, and imagine that curve continuing to
              merge 50,000.
            </p>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
