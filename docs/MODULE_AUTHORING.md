# Module Authoring Spec

You are implementing learning modules for **Interpretable**, an interactive
crash course on transformers, LLMs, and mechanistic interpretability. The
learner is a committed, technical software engineer (works at an AI company)
who is a **visual learner** and **learns by doing**. Primary motivation: AI
safety. Assume no ML background beyond this course's earlier modules.

## Ground truth

- `CURRICULUM.md` — the scope, concepts, explore-widget ideas, problems, and
  readings for every module. Follow it. You may improve on it, never shrink it.
- `src/modules/information-and-optimization/` — the **reference module**. Match
  its quality bar, voice, and structure exactly. Read all three files before
  writing anything.
- `src/lib/types.ts` — the content schema. `src/components/` — the component
  library.

## File layout (per module)

```
src/modules/<slug>/
  index.tsx          # default-exports the CourseModule object
  SomeWidget.tsx     # custom interactive widgets, "use client", one per file
```

The stub `index.tsx` already exists with final metadata (id, slug, title, part,
tagline, estMinutes, objectives). Keep the metadata exactly as-is, flip
`status` to `"ready"`, and fill in `sections`. Do NOT touch `src/lib/registry.ts`,
other modules' folders, or any shared file — other agents are working in
parallel and the registry already imports your stub.

## Section structure (in this order)

1. **2–4 `learn` sections** — the lesson. Visual-first: reach for a `Figure`
   with an inline SVG diagram or a small interactive before dense prose.
   Equations in KaTeX (`M`/`MB` from `@/components/Katex`), introduced only
   after the picture, annotated term by term. Use `KeyIdea` (1–2 per section)
   for the load-bearing claim, `Term` for definitions, `Note` for caveats —
   `kind="safety"` for AI-safety tie-ins (include at least one per module
   where the curriculum notes one).
2. **1 `explore` section** — the module's interactive centerpiece(s): 1–3
   custom widgets specified in CURRICULUM.md. This is where the module earns
   its keep for a visual learner; budget real effort here. End with a "Things
   to try" paragraph giving 2–3 concrete experiments.
3. **1 `problems` section** — 4–6 problems mixing `pencil` (hand computation /
   derivation), `code` (notebook/Colab work with a success check), and
   `explore` (use a public tool like Neuronpedia). Every problem has a
   `solution`; give `hint` where a nudge helps. Real, complete solutions —
   never "left as an exercise."
4. **1 `quiz` section** — 5–8 questions, 4 choices each, exactly one
   `correct: true`. **Every choice gets an `explain`** that teaches: why the
   right one is right, why each wrong one is tempting but wrong. Test
   understanding and misconceptions, not recall of phrasing.
5. **1 `readings` section** — 4–7 readings from CURRICULUM.md (you may add
   1–2). Each needs authors, year, real URL, `time`, and a `note` that says
   *how* to read it (which sections, what to skip, what to look for). Mark
   1–3 as `essential: true`.

## Interactive widgets

- `"use client"` files, plain React + inline SVG. **No new dependencies.**
- Build controls from `@/components/widgets`: `WidgetShell` (always the outer
  wrapper), `Slider`, `SegmentedControl`, `WidgetButton`.
- Chart colors: use CSS vars `var(--series-1)` … `var(--series-8)` **in fixed
  order** (1 blue, 2 orange, 3 aqua, 4 yellow, 5 magenta…). Text in charts
  uses `var(--text-primary|secondary|muted)`, never a series color. Grid/axis
  lines: `var(--border)`. Surfaces: `var(--surface-1|2)`.
- Every SVG gets `role="img"` + `aria-label`, and a `viewBox` with
  `className="w-full max-w-[...]"` so it scales on mobile. No fixed pixel
  widths on containers; the page must never scroll horizontally.
- Precompute/simulate in TS. Small training loops in the browser are welcome
  (see the curriculum's superposition toy) — keep them under ~50ms per step
  and run steps via requestAnimationFrame or button presses.
- Widgets must degrade gracefully: sensible initial state, a Reset button
  when state can wander.

## Voice & accuracy

- Voice of the reference module: direct, concrete, no hype, humane. Short
  paragraphs. Bold the term being defined. Explain *why the reader should
  care* before mechanism. Tie back to the learner's goals (safety, steering,
  reliability) where CURRICULUM.md flags it.
- **Accuracy over coverage.** State uncertainty honestly ("open question",
  "contested"). For 2025–2026 papers, claim only what you can verify — use
  WebFetch on the paper URL if unsure. Never invent citations, URLs, authors,
  or results. Every URL must be one you are confident exists; when in doubt,
  WebFetch it to check.
- Escape entities in JSX prose: `&apos;` `&ldquo;` `&rdquo;` (the linter
  enforces this). In KaTeX strings use `String.raw` like the reference module.

## Verify before you finish

```bash
npx tsc --noEmit                       # must pass with zero errors
pnpm exec eslint src/modules/<slug>/   # must pass for each of your modules
```

Do NOT run `pnpm build` or `pnpm dev` (parallel agents share the workspace and
`.next/`). Do not commit; the orchestrator commits.
