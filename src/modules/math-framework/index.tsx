import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "3.2",
  slug: "math-framework",
  title: "A Mathematical Framework & Induction Heads",
  part: 3,
  tagline: "QK and OV circuits, head composition, and the induction heads behind in-context learning.",
  estMinutes: 210,
  objectives: [
      "Decompose an attention head into QK (where) and OV (what) circuits",
      "Explain Q-, K-, and V-composition and virtual heads",
      "Find and validate induction heads in a real 2-layer model"
  ],
  status: "stub",
  sections: [],
};

export default mod;
