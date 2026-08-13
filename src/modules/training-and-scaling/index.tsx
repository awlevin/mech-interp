import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "1.4",
  slug: "training-and-scaling",
  title: "Training Dynamics & Scaling",
  part: 1,
  tagline: "Next-token prediction, scaling laws, emergence debates, and grokking.",
  estMinutes: 150,
  objectives: [
      "Interpret loss in nats/token and fit a power law to loss data",
      "Compute Chinchilla-optimal data for a compute budget",
      "Describe grokking and what it says about phase changes in training"
  ],
  status: "stub",
  sections: [],
};

export default mod;
