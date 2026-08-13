import type { Part } from "./types";

export const parts: Part[] = [
  {
    number: 0,
    slug: "foundations",
    title: "Foundations",
    tagline: "The minimum viable math: geometry, probability, optimization.",
  },
  {
    number: 1,
    slug: "transformers",
    title: "Transformer Fundamentals",
    tagline: "Tokens, attention, the residual stream, and how training shapes it all.",
  },
  {
    number: 2,
    slug: "how-llms-are-made",
    title: "How LLMs Are Actually Made",
    tagline: "Base models → SFT → RLHF → RLVR, plus inference and reliability.",
  },
  {
    number: 3,
    slug: "mech-interp-core",
    title: "Mechanistic Interpretability: The Core",
    tagline: "Features, circuits, superposition, SAEs, and causal methods.",
  },
  {
    number: 4,
    slug: "frontier",
    title: "Frontier Interpretability",
    tagline: "Circuit tracing, functional emotions, and the global workspace (2025–2026).",
  },
  {
    number: 5,
    slug: "applications",
    title: "Safety, Steering & Editing",
    tagline: "Applying interpretability: behavior control, weight editing, and the safety landscape.",
  },
];
