"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { M } from "@/components/Katex";
import { WidgetShell } from "@/components/widgets";

/**
 * The RLHF pipeline as a clickable SVG. Each stage opens an explainer that says
 * what goes in, what comes out, and what can go wrong at that stage.
 */

type StageId = "base" | "sft" | "prefs" | "rm" | "rl" | "dpo";

type Stage = {
  id: StageId;
  label: string;
  sub: string;
  title: string;
  body: ReactNode;
};

const STAGES: Stage[] = [
  {
    id: "base",
    label: "Base model",
    sub: "pretraining",
    title: "Stage 0 — the base model",
    body: (
      <>
        <p>
          <strong>In:</strong> trillions of tokens of internet text.{" "}
          <strong>Out:</strong> a next-token predictor that can continue almost
          any text, and has no idea it is supposed to be helpful.
        </p>
        <p>
          Everything downstream is a small perturbation of this object. RLHF
          adds no new knowledge — it selects, from behaviors the base model can
          already produce, the ones humans prefer. That is why the whole
          pipeline is often described as <em>eliciting</em> rather than{" "}
          <em>teaching</em>.
        </p>
      </>
    ),
  },
  {
    id: "sft",
    label: "SFT",
    sub: "demos · = π_ref",
    title: "Stage 1 — supervised fine-tuning",
    body: (
      <>
        <p>
          <strong>In:</strong> tens of thousands of human-written (prompt,
          ideal response) pairs. <strong>Out:</strong> a model that answers
          instead of continuing, in the right format, with the right persona.
        </p>
        <p>
          SFT is ordinary cross-entropy training — nothing reinforcement-y about
          it. It gets you most of the way to &ldquo;assistant.&rdquo; Its ceiling
          is that demonstrations are <em>expensive</em> and that a human writing
          a response can only demonstrate what they can produce themselves. You
          cannot demonstrate a better answer than you can write.
        </p>
        <p>
          The SFT model also becomes the <strong>reference policy</strong>{" "}
          <M>{String.raw`\pi_{\text{ref}}`}</M> that the KL penalty later
          measures deviation from.
        </p>
      </>
    ),
  },
  {
    id: "prefs",
    label: "Preference pairs",
    sub: "A ≻ B labels",
    title: "The data — comparisons, not demonstrations",
    body: (
      <>
        <p>
          <strong>In:</strong> a prompt and two sampled responses.{" "}
          <strong>Out:</strong> a label saying which one a human preferred.
        </p>
        <p>
          This is the pivot the whole method turns on. Judging two answers is
          far cheaper than writing a good one, and it works even when the rater
          could not have produced either answer. That asymmetry is what buys
          you supervision above the demonstrator&apos;s own skill level.
        </p>
        <p>
          It is also where the noise enters. Labelers disagree with each other
          roughly 20–40% of the time on real preference sets, and they agree
          with themselves less often than they would like to believe. Every
          downstream reward is fit to that noise.
        </p>
      </>
    ),
  },
  {
    id: "rm",
    label: "Reward model",
    sub: "Bradley–Terry fit",
    title: "Stage 2 — the reward model",
    body: (
      <>
        <p>
          <strong>In:</strong> the preference pairs. <strong>Out:</strong> a
          scalar function <M>{String.raw`r_\phi(x, y)`}</M> — usually the SFT
          model with its unembedding swapped for a single-number head.
        </p>
        <p>
          It is trained under the <strong>Bradley–Terry</strong> model, which
          says the probability a human prefers <M>y_w</M> to <M>y_l</M> is a
          sigmoid of the reward gap. Maximum likelihood on that gives
        </p>
        <div className="my-2">
          <M>{String.raw`\mathcal{L}_{\text{RM}} = -\mathbb{E}\big[\log \sigma(r_\phi(x,y_w) - r_\phi(x,y_l))\big]`}</M>
        </div>
        <p>
          Note what the loss can and cannot see: only <em>differences</em> of
          rewards within a prompt. The absolute scale is unidentifiable, which
          is why reward scores are meaningless across prompts and why RM
          outputs are usually normalized before use.
        </p>
        <p>
          <strong>Failure here:</strong> the RM is a learned, finite-capacity
          approximation of human judgment. Push a policy hard against it and you
          find its errors, not human values.
        </p>
      </>
    ),
  },
  {
    id: "rl",
    label: "RL + KL leash",
    sub: "PPO / GRPO",
    title: "Stage 3 — RL against the reward model",
    body: (
      <>
        <p>
          <strong>In:</strong> the SFT model, the reward model, and a pile of
          prompts. <strong>Out:</strong> a policy that scores well under the RM
          without wandering far from where it started.
        </p>
        <p>The objective, in full:</p>
        <div className="my-2">
          <M>{String.raw`\max_{\pi_\theta}\ \mathbb{E}_{x \sim D,\, y \sim \pi_\theta}\big[ r_\phi(x,y) \big] - \beta\, \mathbb{D}_{\mathrm{KL}}\!\big[\pi_\theta(y\mid x)\,\|\,\pi_{\text{ref}}(y\mid x)\big]`}</M>
        </div>
        <p>
          <strong>PPO</strong> is one way to do the maximization. Its
          contribution is the clipped surrogate objective: it refuses to trust
          any single batch enough to take a large policy step, which keeps an
          optimizer that is being fed noisy, high-variance rewards from
          destroying the policy in one update. <strong>GRPO</strong>, used by
          DeepSeek, drops PPO&apos;s learned value network and instead
          normalizes rewards within a group of samples for the same prompt —
          cheaper, and the standard choice for reasoning training.
        </p>
        <p>
          <strong>The KL term is the safety rail, not a regularizer for taste.</strong>{" "}
          Without it the policy collapses onto whatever degenerate string the RM
          happens to score highest — the classic result is a model that emits
          the same fawning paragraph to every prompt. <M>{String.raw`\beta`}</M>{" "}
          buys you a bounded trust region around a model you already know is
          sane.
        </p>
      </>
    ),
  },
  {
    id: "dpo",
    label: "DPO shortcut",
    sub: "no RM, no RL",
    title: "The bypass — DPO",
    body: (
      <>
        <p>
          <strong>Direct Preference Optimization</strong> observes that stages 2
          and 3 compose into something with a closed form. The KL-constrained
          maximizer of any reward is{" "}
          <M>{String.raw`\pi^*(y\mid x) \propto \pi_{\text{ref}}(y\mid x)\, e^{r(x,y)/\beta}`}</M>,
          which can be inverted: any reward function is{" "}
          <M>{String.raw`r(x,y) = \beta \log \frac{\pi^*(y\mid x)}{\pi_{\text{ref}}(y\mid x)} + \beta \log Z(x)`}</M>.
        </p>
        <p>
          Substitute that into Bradley–Terry, watch{" "}
          <M>{String.raw`\log Z(x)`}</M> cancel between the two responses, and
          the preference likelihood is expressed purely in terms of the policy.
          Fitting it is one supervised loss on preference pairs — no reward
          model, no sampling loop, no value network.
        </p>
        <p>
          <strong>What you give up:</strong> DPO only ever sees the responses in
          your dataset. Online RLHF samples fresh completions from the current
          policy and scores them, so it can discover and correct behaviors that
          were never in the preference data. DPO is dramatically simpler; the
          evidence on whether it matches online RLHF at scale is mixed.
        </p>
      </>
    ),
  },
];

const NODES: Record<StageId, { x: number; y: number; w: number; h: number }> = {
  base: { x: 4, y: 80, w: 96, h: 46 },
  sft: { x: 120, y: 80, w: 96, h: 46 },
  prefs: { x: 226, y: 6, w: 116, h: 44 },
  rm: { x: 236, y: 80, w: 96, h: 46 },
  rl: { x: 352, y: 80, w: 96, h: 46 },
  dpo: { x: 200, y: 158, w: 168, h: 40 },
};
const OUT = { x: 468, y: 80, w: 96, h: 46 };

const ACCENT: Record<StageId, string> = {
  base: "var(--text-muted)",
  sft: "var(--series-1)",
  prefs: "var(--series-3)",
  rm: "var(--series-3)",
  rl: "var(--series-2)",
  dpo: "var(--series-7)",
};

function Node({
  s,
  active,
  onSelect,
}: {
  s: Stage;
  active: boolean;
  onSelect: (id: StageId) => void;
}) {
  const n = NODES[s.id];
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={s.title}
      aria-pressed={active}
      onClick={() => onSelect(s.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(s.id);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={8}
        fill={active ? "var(--surface-2)" : "var(--surface-1)"}
        stroke={active ? ACCENT[s.id] : "var(--border-strong)"}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={s.id === "dpo" ? "5 3" : undefined}
      />
      <text
        x={n.x + n.w / 2}
        y={n.y + n.h / 2 - 2}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={active ? "var(--text-primary)" : "var(--text-secondary)"}
      >
        {s.label}
      </text>
      <text
        x={n.x + n.w / 2}
        y={n.y + n.h / 2 + 13}
        textAnchor="middle"
        fontSize={10}
        fill="var(--text-muted)"
        className="font-mono"
      >
        {s.sub}
      </text>
    </g>
  );
}

export function RlhfPipeline() {
  const [sel, setSel] = useState<StageId>("sft");
  const stage = STAGES.find((s) => s.id === sel)!;

  return (
    <WidgetShell
      title="The RLHF pipeline"
      subtitle="Click any box. Each stage names what goes in, what comes out, and what breaks."
    >
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 570 208"
          className="w-full min-w-[470px] max-w-[570px]"
          role="img"
          aria-label="RLHF pipeline: base model to SFT to reward model to RL with a KL penalty to an aligned policy, with a DPO bypass"
        >
          <defs>
            <marker id="rlhf-arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="var(--border-strong)" />
            </marker>
            <marker id="rlhf-arr-dpo" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="var(--series-7)" />
            </marker>
          </defs>

          {/* forward path */}
          {[
            [102, 118],
            [218, 234],
            [334, 350],
            [450, 466],
          ].map(([x1, x2]) => (
            <line
              key={x1}
              x1={x1}
              y1={103}
              x2={x2}
              y2={103}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              markerEnd="url(#rlhf-arr)"
            />
          ))}
          {/* preference pairs feed the reward model */}
          <line x1={284} y1={52} x2={284} y2={76} stroke="var(--border-strong)" strokeWidth={1.5} markerEnd="url(#rlhf-arr)" />

          {/* terminal output */}
          <rect x={OUT.x} y={OUT.y} width={OUT.w} height={OUT.h} rx={8} fill="var(--surface-1)" stroke="var(--border)" strokeWidth={1} />
          <text x={OUT.x + OUT.w / 2} y={OUT.y + OUT.h / 2 - 2} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text-muted)">
            Aligned policy
          </text>
          <text x={OUT.x + OUT.w / 2} y={OUT.y + OUT.h / 2 + 13} textAnchor="middle" fontSize={10} fill="var(--text-muted)" className="font-mono">
            the chat model
          </text>

          {/* DPO bypass */}
          <path d="M168,128 C168,158 172,178 194,178" fill="none" stroke="var(--series-7)" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#rlhf-arr-dpo)" />
          <path d="M368,178 C450,178 516,172 516,132" fill="none" stroke="var(--series-7)" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#rlhf-arr-dpo)" />

          {STAGES.map((s) => (
            <Node key={s.id} s={s} active={sel === s.id} onSelect={setSel} />
          ))}
        </svg>
      </div>

      <div className="mt-4 rounded-lg border border-borderline bg-surface-2 px-4 py-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: ACCENT[stage.id] }}>
          {stage.title}
        </div>
        <div className="lesson text-[14px] leading-6 [&_p]:my-2">{stage.body}</div>
      </div>
    </WidgetShell>
  );
}
