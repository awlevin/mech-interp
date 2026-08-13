import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "2.1",
  slug: "pretraining",
  title: "Pretraining & Base Models",
  part: 2,
  tagline: "What a base model is — a simulator of text, not an assistant — and the data it eats.",
  estMinutes: 120,
  objectives: [
      "Explain the base-model-as-simulator framing and its predictions",
      "Describe the pretraining data pipeline at a high level",
      "Elicit assistant-like behavior from a base model using only context"
  ],
  status: "stub",
  sections: [],
};

export default mod;
