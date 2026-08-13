# Interpretable

An interactive crash course in transformer fundamentals, how LLMs are actually
made, and mechanistic interpretability — built for a visual learner who learns
by doing, in the spirit of applying it all to AI safety.

**Curriculum:** [CURRICULUM.md](./CURRICULUM.md) — 22 modules across 6 parts,
plus capstone projects. ~80–120 hours.

## What's in a module

Every module follows the same loop:

- **Learn** — visual-first lessons (diagrams before equations, KaTeX math
  annotated term by term)
- **Explore** — custom interactive widgets (train the Toy Models superposition
  autoencoder live in your browser, drag query vectors around a QK plane, …)
- **Practice** — problem sets: pencil-and-paper, code, and tool explorations,
  all with hints and full solutions
- **Check** — quizzes with per-choice explanations
- **Go deeper** — the real literature with reading guides ("read §3, skip the
  MT plumbing")

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4, deployed on Vercel
- Clerk auth (optional — the course works signed out) + Neon Postgres for
  cross-device progress sync; localStorage when signed out
- KaTeX for math; all diagrams are hand-built inline SVG — no chart libraries

## Development

```bash
pnpm install
vercel env pull --yes   # Clerk + Neon env vars
pnpm dev
```

Content lives in `src/modules/<slug>/index.tsx` (one `CourseModule` object per
module, custom widgets alongside). Authoring conventions:
[docs/MODULE_AUTHORING.md](./docs/MODULE_AUTHORING.md).
