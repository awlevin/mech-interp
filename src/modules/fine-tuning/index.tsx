import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "2.2",
  slug: "fine-tuning",
  title: "Supervised Fine-Tuning & PEFT",
  part: 2,
  tagline: "Instruction tuning, chat templates, LoRA's low-rank insight, and catastrophic forgetting.",
  estMinutes: 150,
  objectives: [
      "Explain SFT and chat templates end to end",
      "Derive why low-rank adapters can steer a huge weight matrix",
      "Choose between full fine-tune, LoRA, and prompting for a given task"
  ],
  status: "stub",
  sections: [],
};

export default mod;
