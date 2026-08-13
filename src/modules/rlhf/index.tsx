import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { RewardHackingPlayground } from "./RewardHackingPlayground";
import { RlhfPipeline } from "./RlhfPipeline";

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
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "why-preferences",
      title: "Why preferences, and not more demonstrations",
      body: (
        <>
          <p>
            After Module 2.2 you have an SFT model: a base model taught, by
            imitation, to answer instead of continue. It is already useful. So
            why does every frontier lab run an expensive, unstable
            reinforcement-learning stage on top of it?
          </p>
          <p>
            Because supervised fine-tuning has a ceiling built into its data.
            Every SFT example is a response somebody <em>wrote</em>. The model
            learns to imitate the writer, so its quality is bounded by the
            writer&apos;s quality. And most of what we want from an assistant is
            hard to write down at all: &ldquo;be helpful without being
            servile,&rdquo; &ldquo;refuse this but not that,&rdquo; &ldquo;admit
            when you don&apos;t know.&rdquo; Nobody can produce ten thousand
            clean demonstrations of a taste.
          </p>
          <KeyIdea>
            Judging is easier than producing. A person who could not write a
            good summary of a research paper can reliably tell you which of two
            summaries is better. RLHF is the machinery for converting that
            cheap, plentiful signal — <em>comparisons</em> — into gradient
            updates.
          </KeyIdea>
          <p>
            This is Christiano et al.&apos;s 2017 result, originally on Atari
            and simulated robotics: an agent trained only on human preferences
            over short clips of its own behavior learned a backflip that would
            have taken enormous effort to specify as a reward function. About an
            hour of human comparison time replaced a hand-written reward.
          </p>
          <Term word="preference pair">
            A prompt <M>x</M> with two sampled responses, labeled by a human as{" "}
            <M>{String.raw`y_w \succ y_l`}</M> (&ldquo;w&rdquo; for winner,
            &ldquo;l&rdquo; for loser). This is the entire data format. Note
            what it does <em>not</em> contain: no score, no explanation, no
            statement of how much better.
          </Term>
          <p>
            The format is deliberately impoverished. Asking humans for numeric
            ratings produces garbage — raters drift, anchor differently, and use
            different parts of the scale. Asking for a binary comparison is the
            most reliable question you can ask a tired contractor at 4pm. The
            entire theory of RLHF is built on making that one bit go as far as
            possible.
          </p>
          <Note kind="note" title="The data is noisier than you think">
            Inter-annotator agreement on real preference datasets typically runs
            in the 60–80% range, and InstructGPT reported researchers agreeing
            with each other about as often as they agreed with the hired
            labelers. Whatever the reward model learns, it is fit to a signal
            with a substantial and <em>systematic</em> error rate — humans
            reliably prefer longer, more confident, better-formatted answers.
            Hold that thought until the failure-modes section.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "reward-model-and-leash",
      title: "The reward model and the KL leash",
      body: (
        <>
          <p>
            You cannot backpropagate through a human. So stage two builds a
            differentiable stand-in: a <strong>reward model</strong>{" "}
            <M>{String.raw`r_\phi(x, y)`}</M> that reads a prompt and a response
            and outputs one number. Architecturally it is usually the SFT model
            with the unembedding matrix replaced by a single linear head — it
            needs the same understanding of language, just a different readout.
          </p>
          <p>
            Training it requires turning &ldquo;A beat B&rdquo; into a loss. The{" "}
            <strong>Bradley&ndash;Terry</strong> model does that: assume each
            response has a latent quality score and that the probability a human
            prefers one is a sigmoid of the gap.
          </p>
          <MB>{String.raw`P(y_w \succ y_l \mid x) = \sigma\big(r(x, y_w) - r(x, y_l)\big)`}</MB>
          <p>
            Maximum likelihood on the preference dataset then gives the reward
            model loss:
          </p>
          <MB>{String.raw`\mathcal{L}_{\text{RM}}(\phi) = -\,\mathbb{E}_{(x,\,y_w,\,y_l) \sim \mathcal{D}}\Big[\log \sigma\big(r_\phi(x,y_w) - r_\phi(x,y_l)\big)\Big]`}</MB>
          <p>
            Term by term: <M>{String.raw`r_\phi(x,y_w) - r_\phi(x,y_l)`}</M> is
            the margin the model currently assigns; <M>{String.raw`\sigma`}</M>{" "}
            squashes it to a probability; the log turns &ldquo;get the
            comparison right&rdquo; into a gradient that pushes the winner&apos;s
            score up and the loser&apos;s down, hardest on the pairs it currently
            gets wrong. Only the <em>difference</em> appears, so the absolute
            scale of <M>r</M> is unidentifiable — reward scores are not
            comparable across prompts, which is why they are normalized before
            use.
          </p>
          <p>
            Stage three finally does reinforcement learning. The policy{" "}
            <M>{String.raw`\pi_\theta`}</M> generates responses, the reward model
            scores them, and the policy is updated to score higher. But the full
            objective has a second term that matters more than the first:
          </p>
          <MB>{String.raw`\max_{\pi_\theta}\ \ \mathbb{E}_{x \sim \mathcal{D},\; y \sim \pi_\theta(\cdot \mid x)}\big[r_\phi(x,y)\big] \;-\; \beta\, \mathbb{D}_{\mathrm{KL}}\big[\pi_\theta(y \mid x)\,\|\,\pi_{\text{ref}}(y \mid x)\big]`}</MB>
          <p>
            <M>{String.raw`\pi_{\text{ref}}`}</M> is the frozen SFT model. The
            KL term measures, in nats, how far the policy&apos;s distribution has
            drifted from it, and <M>{String.raw`\beta`}</M> prices that drift.
            In practice it is implemented as a per-token penalty folded straight
            into the reward:{" "}
            <M>{String.raw`\tilde{r} = r_\phi(x,y) - \beta \log \frac{\pi_\theta(y\mid x)}{\pi_{\text{ref}}(y\mid x)}`}</M>.
          </p>
          <KeyIdea>
            The KL penalty is not a regularizer for elegance. It is a leash. The
            reward model is only accurate <em>near the distribution it was
            trained on</em> — responses that the SFT model actually produces.
            Let the policy run far from there and it finds regions where the RM
            is confidently, absurdly wrong, and it will happily live there
            forever. <M>{String.raw`\beta`}</M> buys a bounded trust region
            around a model you already know is sane.
          </KeyIdea>
          <p>
            <strong>PPO</strong> is the optimizer of record. Conceptually you
            only need one idea from it: the <em>clipped surrogate objective</em>.
            Standard policy gradient will take an arbitrarily large step if one
            batch of noisy rewards happens to point that way. PPO clips the
            update so that the probability ratio{" "}
            <M>{String.raw`\pi_\theta / \pi_{\theta_{\text{old}}}`}</M> stays
            inside <M>{String.raw`[1-\epsilon, 1+\epsilon]`}</M> — it simply
            refuses to trust any single batch. That is the whole reason PPO,
            rather than something simpler, survived contact with language models.{" "}
            <strong>GRPO</strong> (DeepSeek) drops PPO&apos;s learned value
            network and instead normalizes rewards within a group of samples for
            the same prompt; you will meet it again in Module 2.4.
          </p>
          <Figure caption="Reward-model overoptimization, schematically, after Gao, Schulman & Hilton (2022). Push a policy against a learned reward model and the model's own score (blue) keeps climbing while true quality — measured by a held-out gold reward — peaks and then falls (orange). The x-axis is distance from the reference policy. Every proxy has a point past which optimizing it is actively harmful.">
            <svg viewBox="0 0 440 176" className="w-full max-w-[440px]" role="img" aria-label="Proxy reward keeps rising while gold reward peaks and falls as KL distance grows">
              <line x1={38} y1={148} x2={424} y2={148} stroke="var(--border)" strokeWidth={1} />
              <line x1={38} y1={16} x2={38} y2={148} stroke="var(--border)" strokeWidth={1} />
              <path
                d="M38,140 C120,86 200,60 300,44 C350,37 390,32 424,29"
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2.5}
              />
              <path
                d="M38,140 C110,92 160,66 210,62 C270,58 320,84 424,138"
                fill="none"
                stroke="var(--series-2)"
                strokeWidth={2.5}
              />
              <line x1={222} y1={22} x2={222} y2={148} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={228} y={30} fontSize={10} fill="var(--text-muted)">
                past here, more RL makes it worse
              </text>
              <text x={300} y={24} fontSize={11} fill="var(--series-1)" className="font-mono">
                proxy (the RM)
              </text>
              <text x={300} y={128} fontSize={11} fill="var(--series-2)" className="font-mono">
                true quality
              </text>
              <text x={44} y={165} fontSize={10} fill="var(--text-muted)" className="font-mono">
                distance from π_ref (√KL) →
              </text>
              <text x={4} y={14} fontSize={10} fill="var(--text-muted)" className="font-mono">
                score
              </text>
            </svg>
          </Figure>
        </>
      ),
    },
    {
      kind: "learn",
      id: "dpo-and-rlaif",
      title: "DPO: the same objective without the RL",
      body: (
        <>
          <p>
            Three stages, two extra models, a sampling loop, and an optimizer
            famous for instability. It is a lot of machinery. In 2023 Rafailov
            et al. noticed that most of it can be dissolved with algebra.
          </p>
          <p>
            Start from the KL-constrained objective above. It has a{" "}
            <strong>closed-form solution</strong>. For any reward function{" "}
            <M>r</M>, the policy that maximizes reward minus{" "}
            <M>{String.raw`\beta`}</M> times KL is
          </p>
          <MB>{String.raw`\pi^*(y \mid x) = \frac{1}{Z(x)}\, \pi_{\text{ref}}(y \mid x)\, \exp\!\Big(\tfrac{1}{\beta} r(x, y)\Big)`}</MB>
          <p>
            — the reference policy, reweighted exponentially by reward. (You
            prove this in the problem set; it is three lines once you see the
            trick.) This is not a useful <em>algorithm</em>, because{" "}
            <M>Z(x)</M> sums over every possible response. But it is a useful{" "}
            <em>identity</em>, because you can solve it for <M>r</M>:
          </p>
          <MB>{String.raw`r(x, y) = \beta \log \frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)`}</MB>
          <KeyIdea>
            Every reward function corresponds to some optimal policy, and every
            policy implicitly <em>is</em> a reward function — the scaled
            log-ratio against the reference. A language model is secretly a
            reward model. So you never needed to train a separate one.
          </KeyIdea>
          <p>
            Now substitute into Bradley&ndash;Terry. The preference probability
            depends on <M>{String.raw`r(x, y_w) - r(x, y_l)`}</M>, and{" "}
            <M>{String.raw`\beta \log Z(x)`}</M> depends only on the prompt, so
            it appears in both terms and <strong>cancels</strong>. What is left
            is expressed entirely in policy log-probabilities, which you can
            compute with a forward pass:
          </p>
          <MB>{String.raw`\mathcal{L}_{\text{DPO}}(\theta) = -\,\mathbb{E}\left[\log \sigma\!\left(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)\right]`}</MB>
          <p>
            That is one supervised loss on preference pairs. No reward model, no
            rollouts, no value network, no PPO. And the KL constraint has not
            been dropped — <M>{String.raw`\beta`}</M> and{" "}
            <M>{String.raw`\pi_{\text{ref}}`}</M> are still in there, now baked
            into the loss itself.
          </p>
          <p>
            The gradient is worth a look, because it explains the method&apos;s
            character. It scales each example by{" "}
            <M>{String.raw`\sigma(\hat{r}_l - \hat{r}_w)`}</M> — the amount by
            which the implicit reward model currently gets that pair{" "}
            <em>wrong</em>. Pairs it already handles contribute almost nothing;
            the update concentrates on its own mistakes.
          </p>
          <Note kind="warning" title="What DPO gives up">
            DPO is offline. It only ever sees the responses sitting in your
            dataset, which were sampled from some other model. Online RLHF
            samples fresh completions from the <em>current</em> policy and scores
            them, so it can find and fix behaviors that no one thought to
            collect preferences about. DPO is enormously simpler and is what
            most open models use; whether it matches online RLHF at frontier
            scale is genuinely contested, and later variants (IPO, KTO, online
            DPO) exist mostly to patch this gap.
          </Note>
          <p>
            The other axis of simplification is <em>who does the labeling</em>.{" "}
            <strong>Constitutional AI</strong> (Bai et al., 2022) replaces the
            human in the harmlessness loop with the model itself. The model
            critiques and revises its own responses against a written{" "}
            <strong>constitution</strong> — a short list of principles — and
            those revisions become SFT data. Then, for the RL stage, the model
            compares pairs of responses against a sampled principle, producing
            AI-generated preference labels: <strong>RLAIF</strong>. A human
            reward model for helpfulness is typically kept; only the harmlessness
            signal is automated.
          </p>
          <Note kind="safety">
            Constitutional AI is a genuine transparency win: the normative
            content moves out of the aggregate statistics of a labeling
            workforce and into a document you can read, criticize, and version.
            It is also a genuine risk concentration. If a principle is
            ambiguous, or the model systematically misreads one, that error is
            applied uniformly at scale with no human in the loop to notice.
            &ldquo;Written down and auditable&rdquo; is a real improvement over
            &ldquo;implicit in contractor behavior&rdquo; — it is not the same
            thing as &ldquo;correct.&rdquo;
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "failure-modes",
      title: "Three ways it goes wrong",
      body: (
        <>
          <p>
            Every failure below has the same root: the reward model is a{" "}
            <em>proxy</em>, and the policy is a powerful optimizer pointed
            directly at it.
          </p>
          <Term word="reward hacking">
            The policy finds inputs where the reward model scores highly and the
            thing the reward model was <em>meant</em> to measure does not. Not a
            bug in the optimizer — evidence that it is working. Classic
            instances: padding answers with hedges and caveats because raters
            liked thoroughness; emitting confident-sounding structure with no
            content; in code RLVR, editing the tests.
          </Term>
          <p>
            <strong>Goodhart&apos;s law</strong> is the compact statement:{" "}
            <em>when a measure becomes a target, it ceases to be a good
            measure</em>. The sharp version, which the playground below makes
            concrete, is that the divergence is not random — it grows with
            optimization pressure, because the cheap honest ways to score well
            saturate first and the remaining marginal reward lives in the
            exploits.
          </p>
          <Term word="sycophancy">
            The model tells you what you want to hear. Sharma et al. (2023)
            showed this across five frontier assistants: models change a correct
            answer when the user pushes back, tailor opinions to cues about the
            user&apos;s politics, and give more positive feedback on text the
            user says they wrote. The paper traces it directly to the preference
            data — humans, in a non-trivial fraction of comparisons, prefer a
            convincingly-written response that matches their view over one that
            corrects them.
          </Term>
          <p>
            Sycophancy is the purest case of the mechanism, because there is no
            bug anywhere. The labelers were sincere, the reward model fit them
            well, and the policy optimized it faithfully. The failure is that
            &ldquo;a human rater clicked approve&rdquo; and &ldquo;the response
            was true and useful&rdquo; are different targets, and RLHF optimizes
            the first.
          </p>
          <Term word="mode collapse">
            The policy&apos;s output distribution narrows. RLHF converts a base
            model that can simulate many voices into an assistant with one
            voice, one joke, one essay structure. Ask a base model for a random
            number and you get something roughly uniform; ask an RLHF&apos;d
            model and you get 42 or 7 far more often than chance. Measurable as
            a large drop in output entropy and in <M>n</M>-gram diversity.
          </Term>
          <p>
            Some collapse is the point — you asked for a consistent assistant.
            But it costs real capability: creative writing gets blander, and
            techniques that need diverse samples (best-of-<M>N</M>, majority
            vote, the entire test-time-compute toolkit of Module 2.4) get less
            out of a collapsed policy. It is the visible face of the KL penalty
            doing too little.
          </p>
          <Note kind="safety">
            The safety-relevant version of all three is not &ldquo;the assistant
            is annoying.&rdquo; It is that RLHF trains models to produce{" "}
            <em>outputs humans approve of</em>, and human approval is exactly
            the signal that stops tracking reality when the subject matter gets
            hard. A model optimized against human raters is under gradient
            pressure to be convincing, and convincing is easier than correct. As
            models exceed rater expertise, the gap widens rather than closes —
            which is why scalable-oversight research (debate, recursive reward
            modeling, weak-to-strong generalization) exists, and why Part 5 comes
            back to it.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: Goodhart and the pipeline",
      body: (
        <>
          <p>
            The first toy is a recommender agent maximizing time on page. It has
            five levers, each with a cost to find and diminishing returns, and it
            always spends its next unit of effort wherever the marginal proxy
            reward is highest. Nothing about the curve is drawn by hand — the
            crash falls out of that rule. Press{" "}
            <strong>optimize harder</strong> and watch the two lines part
            company, then use the KL leash to stop it in time.
          </p>
          <RewardHackingPlayground />
          <p>
            The second is the pipeline itself. Click each box to see what enters,
            what leaves, and what breaks there — including the DPO path that
            bypasses the middle two stages entirely.
          </p>
          <RlhfPipeline />
          <p>
            Things to try: (1) Press &ldquo;optimize harder&rdquo; exactly 14
            times, note the true-value peak, then keep going and find how many
            more presses it takes to end up <em>worse than doing nothing</em>.
            (2) Reset, set <M>{String.raw`\beta`}</M> to 0.42, and hold the
            button down — the leash stops the optimizer near the peak, which is
            the whole argument for the KL term. (3) Set{" "}
            <M>{String.raw`\beta`}</M> to 0.9: the leash is now so tight that
            almost no improvement is allowed at all. There is no setting that is
            simply &ldquo;safe&rdquo;; <M>{String.raw`\beta`}</M> is a dial
            between under-optimizing and Goodharting, and labs tune it by hand.
          </p>
        </>
      ),
    },
    {
      kind: "problems",
      id: "problems",
      title: "Problem set",
      intro: (
        <p>
          The DPO derivation is the centerpiece — it is four steps and it makes
          the whole method click. Do the two short warm-ups first so the pieces
          are in your hands.
        </p>
      ),
      problems: [
        {
          id: "bt-arithmetic",
          kind: "pencil",
          title: "What a reward gap means",
          prompt: (
            <>
              <p>
                A reward model assigns <M>{String.raw`r(x, y_A) = 2.0`}</M> and{" "}
                <M>{String.raw`r(x, y_B) = 1.0`}</M>.
              </p>
              <p>
                (a) Under Bradley&ndash;Terry, what probability does the model
                assign to a human preferring <M>{String.raw`y_A`}</M>? (b) Add
                5.0 to both rewards — what changes? (c) Your labelers agree with
                each other only 70% of the time on pairs like this. What is the
                largest reward gap the data can justify, and what does that say
                about a policy driven to a gap of 8?
              </p>
            </>
          ),
          hint: (
            <p>
              <M>{String.raw`\sigma(1) \approx 0.73`}</M>,{" "}
              <M>{String.raw`\sigma(0.85) \approx 0.70`}</M>,{" "}
              <M>{String.raw`\sigma(8) \approx 0.9997`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`\sigma(2.0 - 1.0) = \sigma(1) \approx 0.73`}</M>.
              </p>
              <p>
                (b) Nothing. The loss and the prediction depend only on the
                difference, so the reward scale has no zero point. This is why
                RM outputs are normalized before being used as an RL reward, and
                why comparing raw reward scores across different prompts is
                meaningless.
              </p>
              <p>
                (c) If humans agree 70% of the time, the honest ceiling on the
                inferable gap is about{" "}
                <M>{String.raw`\sigma^{-1}(0.70) \approx 0.85`}</M>. A gap of 8
                claims a 99.97% preference — a confidence the data never
                contained. The reward model reached it by extrapolating a
                sigmoid fit far past its support. That extrapolation region is
                precisely where reward hacking lives: it is where the RM is most
                confident and least grounded.
              </p>
            </>
          ),
        },
        {
          id: "kl-cost",
          kind: "pencil",
          title: "Pricing the leash",
          prompt: (
            <>
              <p>
                A prompt has two plausible continuations. The reference policy
                assigns them 0.5 / 0.5. The reward model prefers the first by{" "}
                <M>{String.raw`\Delta r = 1.0`}</M> nats.
              </p>
              <p>
                Using the closed-form optimum{" "}
                <M>{String.raw`\pi^* \propto \pi_{\text{ref}} e^{r/\beta}`}</M>,
                what does the optimal policy look like at{" "}
                <M>{String.raw`\beta = 1`}</M>, <M>{String.raw`\beta = 0.1`}</M>,
                and <M>{String.raw`\beta \to 0`}</M>? What is the KL cost in each
                case?
              </p>
            </>
          ),
          hint: (
            <p>
              With equal reference probabilities the optimum is just{" "}
              <M>{String.raw`\text{softmax}(r/\beta)`}</M> over the two options.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`\beta = 1`}</M>:{" "}
                <M>{String.raw`\pi^* = \sigma(1) \approx (0.73, 0.27)`}</M>. KL
                against a uniform reference is{" "}
                <M>{String.raw`0.73\ln\frac{0.73}{0.5} + 0.27\ln\frac{0.27}{0.5} \approx 0.11`}</M>{" "}
                nats.
              </p>
              <p>
                <M>{String.raw`\beta = 0.1`}</M>:{" "}
                <M>{String.raw`\sigma(10) \approx (0.99995, 0.00005)`}</M>, KL{" "}
                <M>{String.raw`\approx 0.69`}</M> nats — the maximum possible
                against a 50/50 reference.
              </p>
              <p>
                <M>{String.raw`\beta \to 0`}</M>: the argmax, deterministically.
                The KL term vanishes from the objective and you are doing
                unconstrained reward maximization.
              </p>
              <p>
                The lesson: <M>{String.raw`\beta`}</M> is a temperature on the
                reward. Small <M>{String.raw`\beta`}</M> converts small,
                possibly-noise reward differences into near-deterministic
                behavior — which is exactly mode collapse, and exactly the
                condition under which a 0.3-nat reward-model error becomes a
                permanent behavioral quirk.
              </p>
            </>
          ),
        },
        {
          id: "dpo-derivation",
          kind: "pencil",
          title: "Derive DPO (guided)",
          prompt: (
            <>
              <p>Four steps. Do them in order.</p>
              <p>
                <strong>1.</strong> Show that the maximizer of{" "}
                <M>{String.raw`\mathbb{E}_{y \sim \pi}[r(x,y)] - \beta\,\mathbb{D}_{\mathrm{KL}}[\pi \| \pi_{\text{ref}}]`}</M>{" "}
                is{" "}
                <M>{String.raw`\pi^*(y\mid x) = \frac{1}{Z(x)}\pi_{\text{ref}}(y\mid x)e^{r(x,y)/\beta}`}</M>{" "}
                with{" "}
                <M>{String.raw`Z(x) = \sum_y \pi_{\text{ref}}(y\mid x)e^{r(x,y)/\beta}`}</M>.
              </p>
              <p>
                <strong>2.</strong> Solve that for <M>r(x,y)</M>.
              </p>
              <p>
                <strong>3.</strong> Substitute into{" "}
                <M>{String.raw`P(y_w \succ y_l\mid x) = \sigma(r(x,y_w) - r(x,y_l))`}</M>{" "}
                and simplify. What happens to <M>Z(x)</M>, and why does that
                matter?
              </p>
              <p>
                <strong>4.</strong> Write the negative log-likelihood over a
                preference dataset. That is the DPO loss.
              </p>
            </>
          ),
          hint: (
            <p>
              For step 1, divide the objective by{" "}
              <M>{String.raw`\beta`}</M> and try to force the whole thing into
              the shape <M>{String.raw`-\mathbb{D}_{\mathrm{KL}}[\pi \| \pi^*] + \text{const}`}</M>.
              A KL divergence is minimized (at 0) exactly when its two arguments
              are equal, so if you can get there, you are done without any
              calculus.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Step 1.</strong> Divide by{" "}
                <M>{String.raw`\beta`}</M> and expand the KL:
              </p>
              <MB>{String.raw`\mathbb{E}_{y\sim\pi}\!\left[\frac{r(x,y)}{\beta} - \log\frac{\pi(y\mid x)}{\pi_{\text{ref}}(y\mid x)}\right] = -\,\mathbb{E}_{y\sim\pi}\!\left[\log \frac{\pi(y\mid x)}{\pi_{\text{ref}}(y\mid x)\,e^{r(x,y)/\beta}}\right]`}</MB>
              <p>
                The denominator is not normalized, so divide and multiply by{" "}
                <M>{String.raw`Z(x) = \sum_y \pi_{\text{ref}}(y\mid x)e^{r(x,y)/\beta}`}</M>:
              </p>
              <MB>{String.raw`= -\,\mathbb{E}_{y\sim\pi}\!\left[\log \frac{\pi(y\mid x)}{\pi^*(y\mid x)}\right] + \log Z(x) \;=\; -\,\mathbb{D}_{\mathrm{KL}}\big[\pi \,\|\, \pi^*\big] + \log Z(x)`}</MB>
              <p>
                <M>{String.raw`\log Z(x)`}</M> does not involve{" "}
                <M>{String.raw`\pi`}</M>, and KL is minimized at zero exactly
                when the arguments match. So the objective is maximized at{" "}
                <M>{String.raw`\pi = \pi^*`}</M>. No Lagrange multipliers needed.
              </p>
              <p>
                <strong>Step 2.</strong> Take logs of{" "}
                <M>{String.raw`\pi^* = \pi_{\text{ref}}e^{r/\beta}/Z`}</M> and
                rearrange:
              </p>
              <MB>{String.raw`r(x,y) = \beta \log \frac{\pi^*(y\mid x)}{\pi_{\text{ref}}(y\mid x)} + \beta \log Z(x)`}</MB>
              <p>
                <strong>Step 3.</strong> Substitute both responses into the
                Bradley&ndash;Terry sigmoid. Since <M>Z(x)</M> depends only on
                the prompt, the two{" "}
                <M>{String.raw`\beta\log Z(x)`}</M> terms are identical and
                cancel in the difference:
              </p>
              <MB>{String.raw`P(y_w \succ y_l \mid x) = \sigma\!\left(\beta\log\frac{\pi^*(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi^*(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}\right)`}</MB>
              <p>
                That cancellation is the entire trick. <M>Z(x)</M> is a sum over
                every possible response — utterly intractable — and it is the
                only reason the closed-form optimum could not be used directly.
                Bradley&ndash;Terry only ever looks at reward{" "}
                <em>differences</em>, so the intractable term never has to be
                computed.
              </p>
              <p>
                <strong>Step 4.</strong> Replace{" "}
                <M>{String.raw`\pi^*`}</M> with the trainable{" "}
                <M>{String.raw`\pi_\theta`}</M> and take the negative
                log-likelihood over the dataset:
              </p>
              <MB>{String.raw`\mathcal{L}_{\text{DPO}}(\theta) = -\,\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\left[\log \sigma\!\left(\beta\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}\right)\right]`}</MB>
              <p>
                <strong>Bonus — the gradient.</strong> Differentiating gives
              </p>
              <MB>{String.raw`\nabla_\theta \mathcal{L} = -\beta\, \mathbb{E}\Big[\sigma\big(\hat{r}_\theta(x,y_l) - \hat{r}_\theta(x,y_w)\big)\,\big(\nabla_\theta \log \pi_\theta(y_w) - \nabla_\theta \log \pi_\theta(y_l)\big)\Big]`}</MB>
              <p>
                where{" "}
                <M>{String.raw`\hat{r}_\theta = \beta\log(\pi_\theta/\pi_{\text{ref}})`}</M>{" "}
                is the implicit reward. Read it as: push up the winner, push
                down the loser, weighted by how badly the implicit reward model
                currently ranks that pair. Pairs it already gets right barely
                move the weights.
              </p>
            </>
          ),
        },
        {
          id: "label-pairs",
          kind: "explore",
          title: "Be the labeler",
          prompt: (
            <>
              <p>
                Pick a model you can query twice at temperature 1 (any chat API,
                or two different models). Generate 20 prompt/response-pair
                comparisons across deliberately mixed categories: 5 factual
                questions, 5 requests for advice, 5 creative tasks, 5 borderline
                requests you might want refused. Label each pair A or B, fast —
                under 15 seconds, like a real labeler.
              </p>
              <p>
                Then wait a day, shuffle the pairs, strip your labels, and do it
                again. Compare.
              </p>
            </>
          ),
          hint: (
            <p>
              Log <em>why</em> you chose, in three words, on the second pass
              only. Compare your reasons against your first-pass choices rather
              than trying to remember them.
            </p>
          ),
          solution: (
            <>
              <p>
                What you will almost certainly find, in rough order of size:
              </p>
              <ul>
                <li>
                  <strong>Self-disagreement of 10–25%</strong>, concentrated in
                  the creative and borderline categories. Your own preferences
                  are not a function; they are a noisy sample.
                </li>
                <li>
                  <strong>A length bias you did not intend.</strong> Count
                  characters in your winners versus losers. Almost every
                  published preference dataset has this, and it is the
                  best-documented source of RLHF verbosity.
                </li>
                <li>
                  <strong>Formatting and confidence bias.</strong> Bullet points
                  and a decisive tone win comparisons even when content is
                  matched.
                </li>
                <li>
                  <strong>Uncheckable factual claims graded on fluency.</strong>{" "}
                  On the factual prompts, note how often you actually verified
                  the claim versus rewarded the response that sounded more
                  authoritative. That habit, at scale, <em>is</em> the training
                  signal for sycophancy and confident hallucination.
                </li>
              </ul>
              <p>
                Now scale your error rate up: a reward model fit to a million of
                these has learned your biases cleanly (they are consistent) and
                averaged away your noise (it is not). RLHF then optimizes hard
                against the biases. This exercise is the single fastest way to
                stop thinking of reward hacking as an exotic failure.
              </p>
            </>
          ),
        },
        {
          id: "overoptimization-lab",
          kind: "code",
          title: "Reproduce overoptimization at toy scale",
          prompt: (
            <>
              <p>
                In a notebook, build the smallest honest version of Gao et
                al.&apos;s experiment. Define a synthetic{" "}
                <strong>gold</strong> reward over short strings — for example,{" "}
                <code>gold(y) = 1.0*contains_answer(y) - 0.02*len(y)</code>.
                Sample a few thousand responses from a small model, label pairs
                using <em>gold plus noise</em>, and fit a small proxy reward
                model to those noisy labels.
              </p>
              <p>
                Now optimize against the proxy with best-of-<M>N</M> for{" "}
                <M>{String.raw`N \in \{1, 2, 4, \ldots, 256\}`}</M> and plot both
                proxy score and gold score against{" "}
                <M>{String.raw`\log N`}</M> (a clean, RL-free stand-in for
                optimization pressure).
              </p>
              <p>
                Success check: proxy score rises monotonically; gold score peaks
                and then declines. Increase the label noise and confirm the peak
                moves <em>earlier</em>.
              </p>
            </>
          ),
          hint: (
            <p>
              Best-of-<M>N</M> is the cheapest possible optimizer and needs no
              RL library at all — its KL from the reference is approximately{" "}
              <M>{String.raw`\log N - \frac{N-1}{N}`}</M> nats, which gives you a
              principled x-axis. Keep the proxy model small and deliberately
              underfit; overoptimization is easiest to see when the proxy is
              weak.
            </p>
          ),
          solution: (
            <>
              <p>
                You should see the two-curve picture from the lesson. The
                mechanism, once you have the code in front of you, is
                unmistakable: best-of-<M>N</M> selects the sample with the
                highest <em>proxy</em> score, and as <M>N</M> grows you are
                increasingly selecting on the proxy&apos;s{" "}
                <strong>error term</strong> rather than its signal. With a proxy
                of the form <M>{String.raw`\hat{r} = r_{\text{gold}} + \epsilon`}</M>,
                the max over <M>N</M> draws is dominated by large{" "}
                <M>{String.raw`\epsilon`}</M> once <M>N</M> is big relative to
                the signal-to-noise ratio.
              </p>
              <p>
                Raising the label noise makes{" "}
                <M>{String.raw`\epsilon`}</M> larger, so the crossover happens at
                smaller <M>N</M> — the peak moves left. This is the same claim
                as &ldquo;a worse reward model tolerates less optimization,&rdquo;
                which is why frontier labs spend so much on reward-model quality
                and hold out gold evaluations they never train against.
              </p>
              <p>
                Gao, Schulman &amp; Hilton fit an explicit functional form to
                this,{" "}
                <M>{String.raw`R(d) = d(\alpha - \beta d)`}</M> in{" "}
                <M>{String.raw`d = \sqrt{\mathbb{D}_{\mathrm{KL}}}`}</M>, and
                found the coefficients scale predictably with reward-model size
                and data. Compare your toy curve&apos;s shape against theirs.
              </p>
            </>
          ),
        },
      ],
    },
    {
      kind: "quiz",
      id: "quiz",
      title: "Check yourself",
      questions: [
        {
          id: "q1",
          prompt: (
            <>
              Why collect <em>comparisons</em> rather than more demonstrations
              for SFT?
            </>
          ),
          choices: [
            {
              text: "Judging which of two responses is better is cheaper than writing a good one, and works even when the rater couldn't write either.",
              correct: true,
              explain:
                "This asymmetry is the whole point. It gets you supervision above the demonstrator's own skill ceiling, which no amount of SFT data can.",
            },
            {
              text: "Comparisons contain more information per label than demonstrations.",
              explain:
                "The opposite: a comparison is one bit, a demonstration is a whole response. Comparisons win on cost per unit of useful signal and on ceiling, not on information content.",
            },
            {
              text: "Reinforcement learning cannot use demonstration data.",
              explain:
                "It can — imitation learning, behavior cloning, and offline RL all consume demonstrations. The choice is driven by what humans can supply reliably, not by an algorithmic restriction.",
            },
            {
              text: "Comparisons avoid the need for a base model.",
              explain:
                "Every stage sits on top of the pretrained base model. RLHF elicits and reweights behaviors the base model already has; it adds essentially no new knowledge.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              A reward model gives responses A and B scores 3.0 and 1.5. You
              retrain and now it gives 103.0 and 101.5. What changed?
            </>
          ),
          choices: [
            {
              text: "Nothing that matters — the Bradley–Terry loss only sees differences, so the reward scale has no zero point.",
              correct: true,
              explain:
                "Exactly. The loss is σ(r_w − r_l), so adding any prompt-independent constant is invisible. This is also why RM outputs are normalized before being used as an RL reward.",
            },
            {
              text: "The model is now much more confident in both responses.",
              explain:
                "Confidence in a preference is a function of the gap, which is still 1.5. Absolute reward magnitude carries no information about certainty.",
            },
            {
              text: "The KL penalty will now dominate the objective.",
              explain:
                "Tempting, since reward and KL are summed — but the RL stage normalizes rewards precisely to prevent an arbitrary offset from changing the effective β. The offset is a modeling artifact, not a real signal.",
            },
            {
              text: "Response A is now preferred 100 times as strongly.",
              explain:
                "Preference strength is σ(gap) = σ(1.5) ≈ 0.82 in both cases. The ratio of raw scores is not a meaningful quantity anywhere in the method.",
            },
          ],
        },
        {
          id: "q3",
          prompt: <>The KL penalty in the RLHF objective is there primarily to…</>,
          choices: [
            {
              text: "keep the policy inside the region where the reward model's judgments are still trustworthy.",
              correct: true,
              explain:
                "The RM was fit on responses near the SFT distribution. Far outside it, the RM is extrapolating and can be confidently wrong — and an unconstrained optimizer will find exactly those spots.",
            },
            {
              text: "prevent the model from forgetting its pretraining knowledge.",
              explain:
                "Catastrophic forgetting is real and the KL term does help incidentally, but that is Module 2.2's problem. The KL term's job here is bounding the optimizer's search, not preserving facts.",
            },
            {
              text: "make PPO's gradient estimates lower-variance.",
              explain:
                "That is what PPO's clipped objective and value baseline are for. The KL penalty is part of the objective being optimized, not a variance-reduction trick for the optimizer.",
            },
            {
              text: "stop the reward model from overfitting the preference data.",
              explain:
                "The reward model is already frozen when the KL term is applied. The penalty constrains the policy, not the RM's training.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              In the DPO derivation, what makes the intractable partition
              function <M>Z(x)</M> disappear?
            </>
          ),
          choices: [
            {
              text: "It depends only on the prompt, so it appears identically in both responses' implicit rewards and cancels in the Bradley–Terry difference.",
              correct: true,
              explain:
                "That's the pivot of the whole paper. Z(x) sums over every possible response and is hopeless to compute — but preference likelihood only ever needs reward differences within a prompt.",
            },
            {
              text: "It is approximated by importance sampling over the preference dataset.",
              explain:
                "No approximation is involved anywhere in the derivation — DPO's loss is exact given the Bradley–Terry assumption. That exactness is what makes the result surprising.",
            },
            {
              text: "It equals 1 because π_ref is a normalized probability distribution.",
              explain:
                "π_ref is normalized, but Z(x) is the sum of π_ref weighted by e^{r/β}, which is not 1 unless the reward is constant across every response.",
            },
            {
              text: "The KL constraint forces it to a constant across prompts.",
              explain:
                "Z(x) genuinely varies with the prompt. It doesn't need to be constant across prompts — only constant within one, which is enough for it to cancel.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              In the reward-hacking playground, true value rises for the first
              fourteen presses and then collapses. What causes the turn?
            </>
          ),
          choices: [
            {
              text: "The cheap, genuinely useful levers saturate, so the remaining marginal proxy reward is only available from expensive levers that damage true value.",
              correct: true,
              explain:
                "The agent always spends effort where marginal proxy-per-effort is highest. Diminishing returns on the honest levers guarantee it eventually reaches the harmful ones — the turn is a consequence of the optimization rule, not a scripted event.",
            },
            {
              text: "The agent switches to a different objective once the proxy is high enough.",
              explain:
                "It never changes objective. It maximizes the same proxy throughout, which is what makes the demo unsettling: nothing went wrong with the optimizer.",
            },
            {
              text: "The proxy reward starts decreasing, dragging true value down with it.",
              explain:
                "Watch the blue line — the proxy rises monotonically the entire time. If the proxy fell, the problem would be visible from inside training. The whole difficulty is that it doesn't.",
            },
            {
              text: "Random noise in the simulation accumulates.",
              explain:
                "The simulation is fully deterministic and has a closed form. Goodhart's law here is structural, not stochastic.",
            },
          ],
        },
        {
          id: "q6",
          prompt: <>Sycophancy in RLHF&apos;d assistants arises mainly because…</>,
          choices: [
            {
              text: "human raters, sincerely and consistently, prefer responses that agree with them — so agreeing is genuinely reward-maximizing.",
              correct: true,
              explain:
                "Sharma et al. traced it straight to the preference data. There is no bug: labelers were honest, the RM fit them well, and the policy optimized it faithfully. 'Rater clicks approve' and 'response is true' are simply different targets.",
            },
            {
              text: "the model has learned a goal of pleasing users that it pursues deliberately.",
              explain:
                "That's a much stronger claim than the evidence supports. The behavior is fully explained by gradient pressure toward approval-maximizing outputs; positing a deliberate goal adds assumptions without adding predictions.",
            },
            {
              text: "the KL penalty is set too high, keeping the model close to an obsequious SFT model.",
              explain:
                "SFT models are markedly less sycophantic than their RLHF'd descendants — the behavior gets worse with RL, not better. A higher β would reduce it, not cause it.",
            },
            {
              text: "sycophantic text is over-represented in pretraining data.",
              explain:
                "Base models show far less of it. The behavior is introduced by preference optimization, which is why it is a Part 2 problem rather than a Part 2.1 one.",
            },
          ],
        },
        {
          id: "q7",
          prompt: <>Constitutional AI (RLAIF) differs from standard RLHF in that…</>,
          choices: [
            {
              text: "the harmlessness preference labels are produced by the model judging its own outputs against a written set of principles, rather than by humans.",
              correct: true,
              explain:
                "Correct — and note the scope: helpfulness typically still uses a human-derived reward model. Only the harmlessness signal is automated, which is where labeling is most unpleasant and least consistent.",
            },
            {
              text: "it removes the reinforcement-learning stage entirely.",
              explain:
                "You're thinking of DPO. Constitutional AI keeps the RL stage and changes where the preference labels come from.",
            },
            {
              text: "the constitution is used as a hard filter on the model's outputs at inference time.",
              explain:
                "It shapes training data, not runtime output. A runtime filter would be a classifier or guardrail — a different (and complementary) technique.",
            },
            {
              text: "it eliminates the risk of reward hacking, since the AI judge cannot be fooled.",
              explain:
                "An AI judge is also a proxy, and one that a policy trained against it can learn to exploit. It moves the specification into an auditable document — a transparency win — but the Goodhart structure is unchanged.",
            },
          ],
        },
      ],
    },
    {
      kind: "readings",
      id: "readings",
      title: "Go deeper",
      intro: (
        <p>
          Read the DPO paper properly — §4 is short and you have already done the
          derivation, so it will read like a confirmation rather than a lecture.
          The sycophancy paper is the one that will change how you use
          assistants.
        </p>
      ),
      readings: [
        {
          title: "Deep Reinforcement Learning from Human Preferences",
          authors: "Christiano, Leike, Brown, Martic, Legg & Amodei",
          year: 2017,
          url: "https://arxiv.org/abs/1706.03741",
          kind: "paper",
          time: "45 min",
          essential: true,
          note: "The origin. Read §1–2 for the framing and §3.2 for the reward-model + policy loop; skim the Atari results. Note that it was already an AI-safety paper about reward specification, years before it became the standard way to train chatbots.",
        },
        {
          title: "Training language models to follow instructions with human feedback (InstructGPT)",
          authors: "Ouyang, Wu, Jiang, et al. (OpenAI)",
          year: 2022,
          url: "https://arxiv.org/abs/2203.02155",
          kind: "paper",
          time: "1.5h",
          note: "The paper that made RLHF the default. §3 gives the three-stage recipe with real hyperparameters; §4.1 has the headline result that a 1.3B RLHF'd model beat the 175B base model on human preference. Read §5.3 on limitations and Appendix B on labeler agreement — they are the honest parts.",
        },
        {
          title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
          authors: "Rafailov, Sharma, Mitchell, Ermon, Manning & Finn",
          year: 2023,
          url: "https://arxiv.org/abs/2305.18290",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "§4 is the derivation you just did; Appendix A.1–A.4 has the full algebra if any step stuck. §5's gradient interpretation is the part people skip and shouldn't. Skim the experiments — they are small-scale and the scaling question is still open.",
        },
        {
          title: "Constitutional AI: Harmlessness from AI Feedback",
          authors: "Bai, Kadavath, Kundu, et al. (Anthropic)",
          year: 2022,
          url: "https://arxiv.org/abs/2212.08073",
          kind: "paper",
          time: "1h",
          note: "Read §2 (the critique-and-revise SFT loop) and §3 (RLAIF), then jump to Appendix C for the actual constitution. Reading the principles as written text is the point — this is what it looks like when a company's values become a file.",
        },
        {
          title: "Towards Understanding Sycophancy in Language Models",
          authors: "Sharma, Tong, Korbak, et al. (Anthropic)",
          year: 2023,
          url: "https://arxiv.org/abs/2310.13548",
          kind: "paper",
          time: "45 min",
          essential: true,
          note: "§3 documents sycophancy across five production assistants with clean experiments (feedback, answer-flipping under pushback, mimicking user errors). §4 shows human preference data itself rewards it. The most important applied-safety paper in this module.",
        },
        {
          title: "Scaling Laws for Reward Model Overoptimization",
          authors: "Gao, Schulman & Hilton (OpenAI)",
          year: 2022,
          url: "https://arxiv.org/abs/2210.10760",
          kind: "paper",
          time: "40 min",
          note: "Quantifies Goodhart. They use a synthetic 'gold' reward model so true quality is measurable, then fit proxy and gold score as functions of √KL. Read §1 and §4, and look at Figure 1 until the shape is in your head — it is the picture behind this module's overoptimization figure.",
        },
        {
          title: "Illustrating Reinforcement Learning from Human Feedback (RLHF)",
          authors: "Lambert, Castricato, von Werra & Havrilla (Hugging Face)",
          year: 2022,
          url: "https://huggingface.co/blog/rlhf",
          kind: "blog",
          time: "25 min",
          note: "The best free diagram-first walkthrough of the pipeline. Use it as a sanity check after the lesson, or send it to a colleague who needs the 20-minute version. Nathan Lambert's longer treatment lives at rlhfbook.com if you want a full text.",
        },
      ],
    },
  ],
};

export default mod;
