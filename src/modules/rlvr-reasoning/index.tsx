import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "2.4",
  slug: "rlvr-reasoning",
  title: "RLVR & Reasoning Models",
  part: 2,
  tagline: "Verifiable rewards, DeepSeek-R1, test-time compute, and whether chains of thought tell the truth.",
  estMinutes: 150,
  objectives: [
      "Contrast learned reward models with verifiable rewards",
      "Explain how long chain-of-thought emerges from RLVR",
      "Assess when a chain of thought is faithful to the real computation"
  ],
  status: "stub",
  sections: [],
};

export default mod;
