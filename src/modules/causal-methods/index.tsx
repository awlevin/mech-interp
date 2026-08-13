import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "3.5",
  slug: "causal-methods",
  title: "Causal Methods: Patching & Circuit Discovery",
  part: 3,
  tagline: "Ablation, activation patching, attribution patching — and the IOI circuit as the worked example.",
  estMinutes: 240,
  objectives: [
      "Choose the right intervention (ablate/patch/path-patch) for a question",
      "Explain the IOI circuit's name movers and S-inhibition heads",
      "Replicate an activation-patching experiment in TransformerLens"
  ],
  status: "stub",
  sections: [],
};

export default mod;
