import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "2.5",
  slug: "inference-and-reliability",
  title: "Inference, Performance & Reliability",
  part: 2,
  tagline: "Sampling, KV caches, quantization, hallucination, and calibration — making models fast and trustworthy.",
  estMinutes: 150,
  objectives: [
      "Predict how temperature and top-p reshape the token distribution",
      "Explain the KV cache and estimate its memory cost",
      "Distinguish calibration failures from confabulation and design a small eval"
  ],
  status: "stub",
  sections: [],
};

export default mod;
