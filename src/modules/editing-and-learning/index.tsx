import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "5.2",
  slug: "editing-and-learning",
  title: "Editing Weights & Learning on the Fly",
  part: 5,
  tagline: "ROME, MEMIT, test-time training — what it takes to change what a model knows.",
  estMinutes: 180,
  objectives: [
      "Explain causal tracing and where facts live in MLPs",
      "Run a ROME edit and probe its ripple effects",
      "Compare ICL, LoRA, and editing for on-the-fly adaptation"
  ],
  status: "stub",
  sections: [],
};

export default mod;
