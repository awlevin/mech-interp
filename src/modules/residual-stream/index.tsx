import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "1.3",
  slug: "residual-stream",
  title: "The Full Block & the Residual Stream",
  part: 1,
  tagline: "MLPs, LayerNorm, RoPE — and the residual stream as the shared memory everything reads and writes.",
  estMinutes: 180,
  objectives: [
      "Count a transformer's parameters and say where they live",
      "Explain the residual stream and virtual weights views",
      "Run a logit-lens decode and interpret per-layer predictions"
  ],
  status: "stub",
  sections: [],
};

export default mod;
