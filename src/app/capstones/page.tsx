import type { Metadata } from "next";

export const metadata: Metadata = { title: "Capstone projects" };

const capstones = [
  {
    title: "Build nanoGPT from scratch",
    hours: 8,
    cements: "Part 1",
    body: "Follow Karpathy's 'Let's build GPT' end to end, then train on Shakespeare. If you do exactly one capstone, do this one — every later module assumes the intuition it builds.",
    link: { label: "Karpathy: Let's build GPT", url: "https://www.youtube.com/watch?v=kCc8FmEb1nY" },
  },
  {
    title: "Replicate the Toy Models phase diagram",
    hours: 4,
    cements: "Module 3.3",
    body: "Train the ReLU toy model from Toy Models of Superposition and reproduce the sparsity/importance phase transitions and feature geometry (digons → triangles → pentagons).",
    link: { label: "Toy Models of Superposition", url: "https://transformer-circuits.pub/2022/toy_model/index.html" },
  },
  {
    title: "Train & analyze your own SAE",
    hours: 6,
    cements: "Module 3.4",
    body: "Train a sparse autoencoder on one layer of GPT-2 small with SAELens. Find five interpretable features, characterize their activation distributions, and validate one causally.",
    link: { label: "SAELens", url: "https://github.com/jbloomAus/SAELens" },
  },
  {
    title: "IOI circuit replication",
    hours: 6,
    cements: "Module 3.5",
    body: "The field's rite of passage: replicate the Indirect Object Identification analysis in TransformerLens — name movers, S-inhibition, backup heads — with activation patching.",
    link: { label: "TransformerLens", url: "https://github.com/TransformerLensOrg/TransformerLens" },
  },
  {
    title: "Build a steering demo",
    hours: 5,
    cements: "Module 5.1",
    body: "Pick a trait, build a contrastive activation steering vector on a small open model, and ship a demo page with a steering-strength slider. Watch coherence fall apart past the sweet spot.",
    link: { label: "Contrastive Activation Addition", url: "https://arxiv.org/abs/2312.06681" },
  },
  {
    title: "Mini auditing game",
    hours: 8,
    cements: "Part 5",
    body: "Have a friend (or an agent) LoRA-finetune a hidden quirk into a small model. Find it using only interpretability tools, then write up your audit like the Anthropic auditing-games paper.",
    link: { label: "Auditing language models for hidden objectives", url: "https://arxiv.org/abs/2503.10965" },
  },
];

export default function CapstonesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Capstone projects</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-7 text-ink-secondary">
        Pick at least two. Each cements a chunk of the course by making you build
        the thing instead of reading about it.
      </p>
      <div className="mt-8 space-y-4">
        {capstones.map((c, i) => (
          <div key={c.title} className="rounded-xl border border-borderline bg-surface-1 p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[13px] text-ink-muted">{i + 1}</span>
              <h2 className="text-lg font-bold text-ink">{c.title}</h2>
              <span className="font-mono text-[12px] text-ink-muted">
                ~{c.hours}h · cements {c.cements}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-6 text-ink-secondary">{c.body}</p>
            <a
              href={c.link.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
            >
              {c.link.label} ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
