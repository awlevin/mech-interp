import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "1.2",
  slug: "attention",
  title: "Attention, Fully Understood",
  part: 1,
  tagline: "Queries, keys, and values as soft lookup — the mechanism that routes information between tokens.",
  estMinutes: 180,
  objectives: [
      "Hand-compute a full attention pass for a tiny example",
      "Explain scaling by √d and causal masking",
      "Read multi-head attention patterns as information routing"
  ],
  status: "stub",
  sections: [],
};

export default mod;
