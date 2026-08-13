import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "3.4",
  slug: "sparse-autoencoders",
  title: "Sparse Autoencoders & Dictionary Learning",
  part: 3,
  tagline: "Decomposing superposition into monosemantic features — from Towards to Scaling Monosemanticity.",
  estMinutes: 210,
  objectives: [
      "Explain SAE architecture and the reconstruction–sparsity tradeoff",
      "Describe feature splitting and known SAE limitations",
      "Train a small SAE and characterize features on Neuronpedia"
  ],
  status: "stub",
  sections: [],
};

export default mod;
