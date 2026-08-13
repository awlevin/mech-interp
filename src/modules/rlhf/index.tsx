import type { CourseModule } from "@/lib/types";

const mod: CourseModule = {
  id: "2.3",
  slug: "rlhf",
  title: "RLHF, Reward Models & DPO",
  part: 2,
  tagline: "Preference learning, the KL leash, DPO's shortcut — and reward hacking as the central failure mode.",
  estMinutes: 180,
  objectives: [
      "Explain the three-stage RLHF pipeline and the KL penalty's role",
      "Derive the DPO objective from the RLHF objective (guided)",
      "Identify reward hacking, sycophancy, and mode collapse in the wild"
  ],
  status: "stub",
  sections: [],
};

export default mod;
