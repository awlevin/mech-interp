import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "1.1",
  slug: "tokens-and-embeddings",
  title: "Tokens & Embeddings",
  part: 1,
  tagline: "How text becomes vectors: BPE, tokenizer pathologies, and the geometry of embedding space.",
  estMinutes: 120,
  objectives: [
      "Run BPE merges by hand and explain why tokenizers exist",
      "Diagnose real LLM failures caused by tokenization",
      "Describe embedding space geometry and tied unembeddings"
  ],
  status: "stub",
  sections: [],
};

export default mod;
