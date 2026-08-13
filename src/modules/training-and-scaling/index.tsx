import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { ScalingLawExplorer } from "./ScalingLawExplorer";
import { GrokkingAnimation } from "./GrokkingAnimation";

const mod: CourseModule = {
  id: "1.4",
  slug: "training-and-scaling",
  title: "Training Dynamics & Scaling",
  part: 1,
  tagline: "Next-token prediction, scaling laws, emergence debates, and grokking.",
  estMinutes: 150,
  objectives: [
      "Interpret loss in nats/token and fit a power law to loss data",
      "Compute Chinchilla-optimal data for a compute budget",
      "Describe grokking and what it says about phase changes in training"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "the-objective",
      title: "One objective, ten thousand GPUs",
      body: (
        <>
          <p>
            You now know what a transformer block does. This module is about what
            happens when you run one for three months. The striking thing is how
            little the recipe changes: the objective that trains a 100M-parameter
            toy is the same objective that trains a frontier model. Only the
            budget moves.
          </p>
          <p>
            That objective is <strong>next-token prediction</strong>. Take a
            document, feed it in, and at <em>every</em> position ask the model for
            a distribution over the next token. Because of the causal mask,
            position 5&apos;s prediction can&apos;t see token 6, so one forward
            pass over a 4,096-token document yields 4,096 independent training
            signals at once. Average their cross-entropy losses and you get the
            number everyone watches:
          </p>
          <MB>{String.raw`\mathcal{L} = -\frac{1}{T}\sum_{t=1}^{T} \log p_\theta(x_t \mid x_{<t})`}</MB>
          <p>
            Term by term: <M>{String.raw`x_t`}</M> is the token that actually came
            next, <M>{String.raw`p_\theta(\cdot \mid x_{<t})`}</M> is the
            model&apos;s distribution given everything before it, and the log
            turns &ldquo;probability I assigned to the truth&rdquo; into an
            additive score. Units are <strong>nats per token</strong>. This is
            exactly the cross-entropy from Module 0.2, averaged over positions.
          </p>
          <Term word="nats/token">
            The natural-log version of bits/token. Divide by{" "}
            <M>{String.raw`\ln 2 \approx 0.693`}</M> to get bits. A loss of 2.0
            nats is 2.89 bits — the model is as uncertain as if it were picking
            uniformly among <M>{String.raw`e^{2.0} \approx 7.4`}</M> equally good
            tokens.
          </Term>
          <p>
            Two warnings about comparing loss numbers across models. First,
            <strong> loss depends on the tokenizer</strong>: a model with a bigger
            vocabulary packs more text into each token, so its per-token loss is
            higher even at equal quality. (Bits-per-byte fixes this and is what
            careful papers report.) Second, loss depends on the evaluation
            corpus. &ldquo;Loss 1.9&rdquo; means nothing without both.
          </p>
          <Figure caption="A real pretraining loss curve, stylized. Log-x, because all the interesting structure is in the early orders of magnitude. Warmup ramps the learning rate up over the first ~1% of steps; a cosine decay brings it down at the end, and that final decay alone is usually worth a few hundredths of a nat. Loss spikes happen; the standard response is to roll back a few thousand steps and skip the offending data.">
          <svg
              viewBox="0 0 460 190"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Stylized pretraining loss curve on a log-x axis, with warmup, a loss spike, and a final learning-rate decay"
            >
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1={40 + i * 130}
                  x2={40 + i * 130}
                  y1={14}
                  y2={150}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
              ))}
              <line x1={40} x2={430} y1={150} y2={150} stroke="var(--border)" strokeWidth={1} />
              <path
                d="M40,26 C70,60 100,86 170,104 C240,120 300,126 360,130 C385,132 400,133 410,133 L430,146"
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2.5}
              />
              {/* loss spike */}
              <path
                d="M226,116 L232,74 L238,112 L248,118"
                fill="none"
                stroke="var(--series-2)"
                strokeWidth={2}
              />
              <text x={232} y={68} textAnchor="middle" fontSize={10} fill="var(--text-muted)" className="font-mono">
                loss spike
              </text>
              <text x={46} y={22} fontSize={10} fill="var(--text-muted)" className="font-mono">
                warmup
              </text>
              <text x={430} y={162} textAnchor="end" fontSize={10} fill="var(--text-muted)" className="font-mono">
                LR decay
              </text>
              <text x={40} y={176} fontSize={10} fill="var(--text-muted)" className="font-mono">
                tokens seen (log) →
              </text>
              <text x={12} y={22} fontSize={10} fill="var(--text-muted)" className="font-mono">
                loss
              </text>
            </svg>
          </Figure>
          <KeyIdea>
            A pretraining run has no curriculum, no labels, and no notion of
            &ldquo;helpful.&rdquo; Every capability you will later find inside the
            model — grammar, arithmetic, theory of mind, refusal, deception —
            arrived because it lowered next-token surprise on text. That is the
            entire causal story of where the weights came from, and it is why
            interpretability is possible at all: the model is optimised, not
            designed, but it is optimised for something we can write down.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "learn",
      id: "scaling-laws",
      title: "Scaling laws: buying loss with compute",
      body: (
        <>
          <p>
            Here is the result that turned deep learning into an industry. Plot
            loss against model size, or against data, or against compute, on
            log-log axes — and you get a straight line. Over seven orders of
            magnitude. Kaplan et al. found this in 2020, and it means you can
            train a set of small models, fit two numbers, and predict the loss of
            a model a thousand times bigger <em>before you build it</em>.
          </p>
          <p>
            The modern form is Hoffmann et al.&apos;s three-term fit, and it is
            worth reading slowly:
          </p>
          <MB>{String.raw`L(N, D) = \underbrace{E}_{\text{irreducible}} + \underbrace{\frac{A}{N^{\alpha}}}_{\text{too few params}} + \underbrace{\frac{B}{D^{\beta}}}_{\text{too little data}}`}</MB>
          <p>
            <M>N</M> is parameters, <M>D</M> is training tokens.{" "}
            <M>E</M> is the <strong>entropy of natural language itself</strong> —
            the surprise no model can remove, because text is genuinely partly
            unpredictable. The other two terms are penalties: one for being too
            small to represent the structure, one for not having seen enough text
            to find it. Both decay as power laws, which is why they look linear on
            log-log axes and why progress feels smooth and expensive at the same
            time. Hoffmann&apos;s fitted values:{" "}
            <M>{String.raw`E = 1.69`}</M>, <M>{String.raw`A = 406.4`}</M>,{" "}
            <M>{String.raw`B = 410.7`}</M>, <M>{String.raw`\alpha = 0.34`}</M>,{" "}
            <M>{String.raw`\beta = 0.28`}</M>.
          </p>
          <p>
            Training compute is well approximated by{" "}
            <M>{String.raw`C \approx 6ND`}</M> FLOPs — roughly 2 FLOPs per
            parameter for the forward multiply-accumulate and 4 for the backward
            pass, at every token. So the real question a lab faces is not
            &ldquo;how big?&rdquo; but: <em>given a fixed C, how should I split it
            between N and D?</em>
          </p>
          <p>
            Minimise <M>{String.raw`L`}</M> subject to{" "}
            <M>{String.raw`C = 6ND`}</M> and you get a clean answer:
          </p>
          <MB>{String.raw`N^{*} \propto C^{\frac{\beta}{\alpha+\beta}} \approx C^{0.46}, \qquad D^{*} \propto C^{\frac{\alpha}{\alpha+\beta}} \approx C^{0.54}`}</MB>
          <p>
            Both exponents are near <M>{String.raw`\tfrac{1}{2}`}</M>: when your
            budget goes up 100×, you should make the model ~10× bigger{" "}
            <em>and</em> train it on ~10× more data. Kaplan&apos;s 2020 analysis
            had said to grow the model much faster than the data, and the field
            believed it — GPT-3 is 175B parameters trained on only 300B tokens.
            Hoffmann&apos;s team showed the earlier fit was distorted by a
            learning-rate schedule that wasn&apos;t re-tuned for each run length,
            then proved the point by training <strong>Chinchilla</strong>: 70B
            parameters, 1.4T tokens, same compute as the 280B-parameter Gopher,
            and better on essentially everything.
          </p>
          <KeyIdea>
            A model that is too big for its data budget is <em>wasting compute</em>
            , not just money. The IsoFLOP panel in the explorer below makes this
            visceral: at fixed compute, loss as a function of model size is a
            U-curve with a genuine bottom, and GPT-3 sat well up the left wall of
            it.
          </KeyIdea>
          <Note kind="note" title="&ldquo;20 tokens per parameter&rdquo; — with an asterisk">
            The famous rule of thumb comes from Hoffmann&apos;s first two
            estimation approaches, which both give{" "}
            <M>{String.raw`N^* \propto C^{0.5}`}</M> and therefore a constant
            token/param ratio. The third approach — the parametric fit above, and
            the one the explorer uses — has{" "}
            <M>{String.raw`\alpha \neq \beta`}</M>, so its implied ratio drifts
            upward with scale (about 90 tokens/param at{" "}
            <M>{String.raw`10^{24}`}</M> FLOPs). The three approaches genuinely
            disagree; Besiroglu et al. (2024) re-fit the parametric model to the
            paper&apos;s own data, argue the published constants are inconsistent
            with the other two approaches, and land closer to ~20. Treat the exact
            numbers as contested and the <em>shape</em> as solid.
          </Note>
          <p>
            One more twist: compute-optimal is optimal for <em>training</em>. If
            you are going to serve a model to millions of users, inference cost
            scales with <M>N</M> and not with <M>D</M>, so it pays to
            &ldquo;overtrain&rdquo; a small model far past the Chinchilla point.
            Llama 3 8B saw ~15T tokens — nearly 2,000 tokens per parameter, two
            orders of magnitude past compute-optimal. That is a deliberate,
            rational choice, not a mistake.
          </p>
          <Note kind="safety">
            Scaling laws are the reason the field can forecast at all. Loss is
            predictable years out; that predictability is what responsible-scaling
            policies and pre-deployment eval schedules are built on. But loss is
            not the thing we care about. Nobody has a scaling law for &ldquo;will
            it help with a bioweapon&rdquo; or &ldquo;will it deceive an
            evaluator.&rdquo; The gap between a smooth, forecastable loss curve and
            jumpy, hard-to-forecast <em>capabilities</em> is precisely the gap that
            makes evals hard — and the next section is about why that gap exists.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "phase-changes",
      title: "Phase changes: emergence, grokking, double descent",
      body: (
        <>
          <p>
            If loss falls this smoothly, why does everyone talk about abilities
            appearing &ldquo;suddenly&rdquo;? Three different phenomena get
            tangled together here, and pulling them apart is the point of this
            section.
          </p>
          <p>
            <strong>1. Emergence (contested).</strong> Wei et al. (2022) showed
            benchmark after benchmark where accuracy sits at chance across several
            model sizes and then shoots up. Schaeffer et al. (2023) replied: look
            at your metric. Exact-match accuracy on a 5-digit arithmetic problem
            is a threshold applied to a smoothly improving per-token probability —
            get each of five digits right with probability <M>p</M> and your
            score is <M>{String.raw`p^5`}</M>, which stays invisible until{" "}
            <M>p</M> is already high. Swap in a continuous metric (token edit
            distance, log-probability of the answer) and many &ldquo;emergent&rdquo;
            curves straighten out. The honest position: some apparent emergence is
            a metric artifact; whether <em>all</em> of it is remains open.
          </p>
          <p>
            <strong>2. Grokking (real, and mechanistically understood).</strong>{" "}
            Power et al. (2022) trained small transformers on modular arithmetic
            and found something odd: the model reaches 100% <em>training</em>{" "}
            accuracy quickly, sits at chance on held-out data for tens of
            thousands more steps, and then — long after the training loss stopped
            moving — generalises, abruptly.
          </p>
          <p>
            Nanda et al. (2023) opened the model up and explained it. The network
            learns to do <M>{String.raw`(a + b) \bmod p`}</M> by embedding
            numbers on circles at a handful of frequencies and applying{" "}
            trigonometric identities — a genuinely elegant algorithm. Crucially,
            that algorithm is <em>not</em> built abruptly. Three phases overlap:
          </p>
          <Term word="memorisation">
            Fast. The model stores the training pairs in a lookup-table-like
            circuit. Train accuracy hits 100%; test accuracy stays at chance.
          </Term>
          <Term word="circuit formation">
            Slow and hidden. Under weight decay, the generalising Fourier circuit
            grows while the memorising circuit is still doing the work. Accuracy
            curves show nothing at all here — but progress measures that read the
            internals (restricted loss, excluded loss) move smoothly the whole
            time.
          </Term>
          <Term word="cleanup">
            Fast. Weight decay deletes the now-redundant memorisation circuit.
            Weight norm drops, test accuracy snaps to 100%, and it looks from
            outside like a phase change.
          </Term>
          <KeyIdea>
            Grokking is a <em>measurement</em> discontinuity, not a learning
            discontinuity. The mechanism developed gradually; the behaviour we
            were watching was a lagging, thresholded readout of it. This is the
            single best argument in the course for why interpretability earns its
            keep: internal progress measures saw the transition coming and the
            loss curve did not.
          </KeyIdea>
          <p>
            <strong>3. Double descent (real, still surprising).</strong> Classical
            statistics says test error is U-shaped in model size: too small
            underfits, too big overfits. Nakkiran et al. (2019) showed that if you
            keep going <em>past</em> the interpolation threshold — the size at
            which the model can fit the training set exactly — test error falls
            again, often below the classical sweet spot. The same shape shows up
            in epochs (train longer, get worse, then better) and in sample count
            (more data can transiently hurt). Modern LLMs live far out on the
            second descent, which is one reason &ldquo;overfitting&rdquo;
            intuitions from a statistics course mislead here.
          </p>
          <Note kind="warning">
            None of this licenses the reverse inference. &ldquo;Capabilities can
            appear abruptly&rdquo; is not the same claim as &ldquo;capabilities
            will keep appearing abruptly at frontier scale.&rdquo; Grokking is
            observed in tiny models on algorithmic tasks with heavy weight decay
            and no data diversity; frontier pretraining has none of those
            properties. Take the mechanism seriously and the extrapolation
            carefully.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: the frontier and the phase change",
      body: (
        <>
          <p>
            Two toys. The first is the Chinchilla loss surface with real fitted
            constants — every number it shows you is what the 2022 paper&apos;s
            parametric model actually predicts, including the historical models it
            was fit against. The second replays a grokking run so you can watch
            the two accuracy curves come apart and snap back together.
          </p>
          <ScalingLawExplorer />
          <GrokkingAnimation />
          <p>
            Things to try: (1) Load the <strong>GPT-3</strong> preset, note the
            loss, then hit <strong>Snap to optimal</strong> — same compute, and
            you see the ~0.05 nats that the 2020 recipe left on the table; now do
            the same for <strong>Chinchilla</strong> and see how close it already
            is. (2) Load <strong>Llama 3 8B</strong> and look at the IsoFLOP panel:
            the orange dot sits way down the left wall, and the readout shows a
            large loss gap — that gap is the price paid, on purpose, for a model
            that is cheap to serve. (3) In the grokking widget, scrub to step
            5,000 and read the phase blurb: train accuracy has been pinned at 100%
            for thousands of steps and test accuracy is still at chance. Ask
            yourself what an eval run at that moment would have concluded, and how
            you would have known better.
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
          The first three are ten minutes each with a calculator and they make the
          quiz easy. Problem 4 is the classic: watch a model grok with your own
          eyes. Budget an evening for it.
        </p>
      ),
      problems: [
        {
          id: "fit-power-law",
          kind: "pencil",
          title: "Fit a power law from two points",
          prompt: (
            <>
              <p>
                You train a family of models to convergence on the same enormous
                corpus, so the data term is negligible and{" "}
                <M>{String.raw`L \approx E + A/N^{\alpha}`}</M>. You have already
                estimated <M>{String.raw`E = 1.69`}</M> and subtracted it. The
                remaining <em>reducible</em> loss is:
              </p>
              <p className="font-mono text-[13px]">
                N = 1e8 → 0.774 nats
                <br />
                N = 1e10 → 0.162 nats
              </p>
              <p>
                Find <M>{String.raw`\alpha`}</M> and <M>A</M>. Then predict the
                reducible loss at <M>{String.raw`N = 10^{12}`}</M>, and say what
                fraction of the total loss it would be.
              </p>
            </>
          ),
          hint: (
            <p>
              A power law is a straight line in log-log space. Take{" "}
              <M>{String.raw`\log_{10}`}</M> of both sides:{" "}
              <M>{String.raw`\log_{10}(L - E) = \log_{10} A - \alpha \log_{10} N`}</M>
              . Two points determine a line; the slope is{" "}
              <M>{String.raw`-\alpha`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                Slope:{" "}
                <M>{String.raw`-\alpha = \frac{\log_{10}(0.162) - \log_{10}(0.774)}{10 - 8} = \frac{-0.790 - (-0.111)}{2} = -0.340`}</M>
                , so <M>{String.raw`\alpha = 0.34`}</M>.
              </p>
              <p>
                Intercept: <M>{String.raw`A = 0.774 \times (10^{8})^{0.34} = 0.774 \times 10^{2.72} \approx 406`}</M>
                . (These are exactly Hoffmann et al.&apos;s <M>A</M> and{" "}
                <M>{String.raw`\alpha`}</M> — the data was generated from their
                fit.)
              </p>
              <p>
                At <M>{String.raw`N = 10^{12}`}</M>:{" "}
                <M>{String.raw`406 / 10^{12 \times 0.34} = 406/10^{4.08} \approx 0.034`}</M>{" "}
                nats. Total loss ≈ 1.724, so the reducible parameter term is under
                2% of it. <strong>The moral:</strong> two decades of scaling bought
                a 23× reduction in <em>this</em> term, and the total loss barely
                moved — because <M>E</M> dominates. Late-stage scaling is expensive
                precisely because you are chasing a shrinking sliver.
              </p>
            </>
          ),
        },
        {
          id: "chinchilla-optimal",
          kind: "pencil",
          title: "Spend $10M of compute",
          prompt: (
            <>
              <p>
                Your budget is <M>{String.raw`C = 10^{24}`}</M> FLOPs. Using{" "}
                <M>{String.raw`C \approx 6ND`}</M>:
              </p>
              <p>
                (a) Use the &ldquo;20 tokens per parameter&rdquo; rule of thumb to
                get <M>N</M> and <M>D</M>. (b) Now use the parametric optimum,{" "}
                <M>{String.raw`N^* = 1.345\,(C/6)^{0.4516}`}</M>. (c) The two
                answers differ by more than 3×. Which one would you actually
                trust, and why?
              </p>
            </>
          ),
          hint: (
            <p>
              For (a): <M>{String.raw`D = 20N`}</M> gives{" "}
              <M>{String.raw`C = 120 N^2`}</M>. For (b), work in logs —{" "}
              <M>{String.raw`\log_{10}(C/6) = 23.22`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`N = \sqrt{C/120} = \sqrt{8.33 \times 10^{21}} \approx 9.1 \times 10^{10}`}</M>{" "}
                — about 91B parameters on 1.8T tokens.
              </p>
              <p>
                (b) <M>{String.raw`\log_{10} N^* = \log_{10}(1.345) + 0.4516 \times 23.22 = 0.129 + 10.487 = 10.62`}</M>
                , so <M>{String.raw`N^* \approx 4.1 \times 10^{10}`}</M> — about
                41B parameters, and{" "}
                <M>{String.raw`D^* = (C/6)/N^* \approx 4.0`}</M> trillion tokens,
                i.e. ~98 tokens per parameter.
              </p>
              <p>
                (c) Neither, blindly. The two answers come from Hoffmann et
                al.&apos;s own approaches 1–2 and approach 3, which are internally
                inconsistent — Besiroglu et al. (2024) argue the approach-3
                constants don&apos;t reproduce the paper&apos;s data and that its
                confidence intervals are implausibly tight. In practice a lab fits
                its <em>own</em> IsoFLOP curves on its own data mix and
                architecture, because <M>E</M>, <M>A</M>, <M>B</M> all depend on
                both. The transferable skill is the method, not the constants. A
                defensible answer: &ldquo;somewhere between 40B and 90B, and I
                would run a small IsoFLOP sweep before committing $10M.&rdquo;
              </p>
            </>
          ),
        },
        {
          id: "read-the-loss",
          kind: "pencil",
          title: "Read a loss number",
          prompt: (
            <p>
              Model A reports validation loss 2.40 nats/token; model B reports
              2.30. (a) Convert both to perplexity and to bits/token. (b) By what
              factor is B more confident in the true next token, on average? (c)
              Your colleague says &ldquo;that&apos;s only a 4% improvement, who
              cares.&rdquo; Give the strongest counterargument, and then the
              strongest reason to be suspicious of the comparison anyway.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) Perplexity is <M>{String.raw`e^{\mathcal{L}}`}</M>:{" "}
                <M>{String.raw`e^{2.40} = 11.02`}</M> and{" "}
                <M>{String.raw`e^{2.30} = 9.97`}</M>. Bits are{" "}
                <M>{String.raw`\mathcal{L}/\ln 2`}</M>: 3.46 and 3.32 bits/token.
              </p>
              <p>
                (b) A 0.1-nat gap is a factor of{" "}
                <M>{String.raw`e^{0.1} = 1.105`}</M> in geometric-mean probability
                on the true token — about 10.5% more probability mass, every
                token, forever. Over a 1,000-token completion that compounds to{" "}
                <M>{String.raw`e^{100}`}</M> in relative sequence likelihood.
              </p>
              <p>
                (c) Counterargument: loss differences are logarithmic, so
                percentage changes in the loss number are meaningless; what
                matters is the multiplicative effect on probabilities, and 0.1
                nats near the irreducible floor typically costs an order of
                magnitude of compute (see the explorer). Suspicion: the comparison
                is only valid if both models use the <em>same tokenizer</em> and
                the <em>same evaluation set</em>. Different vocabularies change
                how much text a token carries; report bits-per-byte instead.
              </p>
            </>
          ),
        },
        {
          id: "grok-it",
          kind: "code",
          title: "Watch a model grok",
          prompt: (
            <>
              <p>
                Train a one-layer transformer (<M>{String.raw`d_{model}=128`}</M>,
                4 heads, no LayerNorm needed) on{" "}
                <M>{String.raw`(a + b) \bmod 113`}</M>. Use all{" "}
                <M>{String.raw`113^2 = 12{,}769`}</M> pairs, a 30% train split,
                full-batch AdamW, learning rate 1e-3, and{" "}
                <strong>weight decay 1.0</strong>. Log train and test accuracy
                every 100 steps for 25,000 steps and plot both on a log-x axis.
              </p>
              <p>
                Success check: train accuracy passes 99% within ~1,000 steps, test
                accuracy stays under 5% for at least 5,000 steps after that, and
                then crosses 90%. Then ablate: rerun with weight decay 0 and
                report what happens.
              </p>
            </>
          ),
          hint: (
            <p>
              Input format is three tokens: <code>[a] [b] [=]</code>, and you read
              the prediction off the final position. The vocabulary is 114 tokens
              (0–112 plus <code>=</code>). If it never groks, your weight decay is
              too low or your train fraction is too high — grokking needs enough
              pressure to prefer the general circuit and enough data scarcity that
              memorisation is tempting first.
            </p>
          ),
          solution: (
            <>
              <p>
                Reference implementation and a walkthrough are in Neel Nanda&apos;s
                grokking notebook (linked in Go deeper). With weight decay 1.0 you
                should see the classic picture: train accuracy saturating around
                step 500–1,500, test accuracy flat at ~1% until roughly step
                10,000, then crossing 90% within a couple of thousand steps.
              </p>
              <p>
                With weight decay 0, the model memorises and{" "}
                <strong>never groks</strong> within the budget — test accuracy
                stays near chance indefinitely. That is the experimental core of
                the Nanda et al. story: weight decay is what makes the
                generalising circuit cheaper than the memorising one, so it is the
                force driving both circuit formation and cleanup. Grokking is not
                &ldquo;the model suddenly understood&rdquo;; it is a regulariser
                slowly winning an argument.
              </p>
            </>
          ),
        },
        {
          id: "fit-three-param",
          kind: "code",
          title: "Fit the Chinchilla form yourself",
          prompt: (
            <>
              <p>
                Generate 40 synthetic <M>{String.raw`(N, D, L)`}</M> triples from{" "}
                <M>{String.raw`L = E + A/N^\alpha + B/D^\beta`}</M> with the
                published constants, over{" "}
                <M>{String.raw`N \in [10^8, 10^{11}]`}</M> and{" "}
                <M>{String.raw`D \in [10^9, 10^{12}]`}</M>, and add 1% Gaussian
                noise to <M>L</M>. Now recover all five constants with{" "}
                <code>scipy.optimize.minimize</code>.
              </p>
              <p>
                Success check: fit in log-space —{" "}
                <M>{String.raw`\log L`}</M> against{" "}
                <M>{String.raw`\mathrm{logsumexp}`}</M> of the three terms — with
                a Huber loss, as the paper does, and recover{" "}
                <M>{String.raw`\alpha, \beta`}</M> to within ±0.02. Then rerun the
                fit using only models with{" "}
                <M>{String.raw`N < 10^{9}`}</M> and report how far the
                extrapolation to <M>{String.raw`N = 10^{11}`}</M> drifts.
              </p>
            </>
          ),
          hint: (
            <p>
              Parameterise as{" "}
              <M>{String.raw`\log L = \mathrm{logsumexp}(e, a - \alpha \log N, b - \beta \log D)`}</M>{" "}
              with <M>{String.raw`e = \log E`}</M>,{" "}
              <M>{String.raw`a = \log A`}</M>,{" "}
              <M>{String.raw`b = \log B`}</M>. This keeps everything positive and
              makes the objective far better conditioned than fitting <M>A</M> and{" "}
              <M>B</M> directly. Use L-BFGS-B from a grid of starting points —
              the objective is not convex.
            </p>
          ),
          solution: (
            <>
              <p>
                With the log-space parameterisation and Huber loss (<M>δ</M> ≈
                1e-3), L-BFGS-B from a modest grid of initialisations recovers{" "}
                <M>{String.raw`\alpha, \beta`}</M> reliably; <M>E</M> is the
                hardest parameter because it only shows up where the other two
                terms are small, so the large-<M>N</M>, large-<M>D</M> corner of
                your grid does almost all the work of pinning it down.
              </p>
              <p>
                The truncated fit is the point of the exercise. Restricted to{" "}
                <M>{String.raw`N < 10^{9}`}</M>, the reducible terms dominate
                everywhere in your data, so <M>E</M> becomes nearly unidentifiable
                and trades off against <M>A</M> and{" "}
                <M>{String.raw`\alpha`}</M>. Extrapolations to{" "}
                <M>{String.raw`10^{11}`}</M> drift by several hundredths of a nat
                — which is the same order as the entire Kaplan-vs-Chinchilla
                disagreement. This is exactly why the replication debate exists,
                and why labs re-fit at every new scale instead of trusting a
                published constant.
              </p>
            </>
          ),
        },
        {
          id: "read-the-replication",
          kind: "explore",
          title: "Read a replication attempt",
          prompt: (
            <>
              <p>
                Read Epoch AI&apos;s{" "}
                <a
                  href="https://epoch.ai/blog/chinchilla-scaling-a-replication-attempt"
                  target="_blank"
                  rel="noreferrer"
                >
                  &ldquo;Chinchilla Scaling: A replication attempt&rdquo;
                </a>{" "}
                (the blog version is enough). Then write three sentences: what
                exactly did they find inconsistent, what corrected
                token/parameter ratio do they land on, and which parts of the
                original Chinchilla paper survive the critique untouched?
              </p>
              <p>
                Bonus: reconstruct their central figure yourself — plot the
                approach-3 parametric model&apos;s predicted optimal ratio against
                compute, using the explorer&apos;s readouts, and show that it
                disagrees with approaches 1 and 2 at every scale.
              </p>
            </>
          ),
          hint: (
            <p>
              The disagreement is about approach 3 specifically — the parametric
              fit — not about the Chinchilla model or the headline finding that
              Gopher was undertrained. Keep those separate as you read.
            </p>
          ),
          solution: (
            <>
              <p>
                What they found: the approach-3 parametric fit reported in
                Hoffmann et al. does not reproduce when re-fit to the same
                extracted data; the reported confidence intervals on{" "}
                <M>{String.raw`\alpha`}</M> and <M>{String.raw`\beta`}</M> are
                far too narrow to be consistent with the number of models fit; and
                approach 3&apos;s implied scaling policy contradicts approaches 1
                and 2, which the paper presents as agreeing.
              </p>
              <p>
                What they conclude: a re-fit gives exponents much closer to equal,
                i.e. a roughly constant ratio around 20 tokens per parameter,
                consistent with the other two approaches and with the Chinchilla
                model as actually trained.
              </p>
              <p>
                What it changes: the headline result stands — Gopher-era models
                were badly undertrained, and equal-ish scaling of <M>N</M> and{" "}
                <M>D</M> is right. What weakens is any use of the published{" "}
                <M>E, A, B</M> constants as precise physical quantities. The
                explorer in this module uses them because they are the published
                numbers and reproduce the paper&apos;s own predicted losses for
                Gopher (1.99) and Chinchilla (1.93) — but you should now read
                every digit it prints with a raised eyebrow, which is the correct
                posture for empirical scaling work in general.
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
              In <M>{String.raw`L(N,D) = E + A/N^\alpha + B/D^\beta`}</M>, what
              does <M>E</M> represent?
            </>
          ),
          choices: [
            {
              text: "The irreducible entropy of the text distribution — surprise no model can remove.",
              correct: true,
              explain:
                "Natural language is genuinely partly unpredictable (which name, which typo, which topic shift). E is the floor set by the data itself, not by the model. Fitted at ~1.69 nats/token on Hoffmann's corpus.",
            },
            {
              text: "The error floor imposed by float32 arithmetic.",
              explain:
                "Numerical precision is nowhere near this scale — it affects the far decimal places of activations, not a whole nat of loss. E is a property of the data, and it changes if you change the corpus.",
            },
            {
              text: "The loss you would get from a randomly initialised model.",
              explain:
                "That's the ceiling, not the floor: a random model over a 50k vocabulary has loss ≈ log(50257) ≈ 10.8 nats. E is what remains after infinite parameters and infinite data.",
            },
            {
              text: "The gap between training loss and validation loss.",
              explain:
                "That's the generalisation gap, which is nearly zero in frontier pretraining because models see each token roughly once. E is present in both curves.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              You have a fixed compute budget and are choosing a model size. What
              shape does loss trace as you vary <M>N</M> at fixed{" "}
              <M>{String.raw`C = 6ND`}</M>?
            </>
          ),
          choices: [
            {
              text: "A U-curve: too small starves the parameter term, too big starves the data term, with a minimum in between.",
              correct: true,
              explain:
                "This is the IsoFLOP curve — Chinchilla's central experimental object. Growing N shrinks A/N^α but forces D down, growing B/D^β. The bottom of that U is the compute-optimal point.",
            },
            {
              text: "Monotonically decreasing: bigger is always better.",
              explain:
                "True only if data were free. At fixed compute, every parameter you add is a token you don't train on — which is exactly the tradeoff Kaplan's 2020 recommendation got wrong.",
            },
            {
              text: "Monotonically increasing past the interpolation threshold, because of overfitting.",
              explain:
                "Frontier pretraining barely repeats data, so classical overfitting isn't the binding constraint. The loss rises on the right side of the U because D shrank, not because the model memorised.",
            },
            {
              text: "Flat: the parametric law says compute is all that matters.",
              explain:
                "Compute is what you spend, but how you split it matters a great deal — Chinchilla beat Gopher at equal compute. If the curve were flat there would be no Chinchilla paper.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              Llama 3 8B was trained on ~15T tokens — roughly 1,900 tokens per
              parameter, far past compute-optimal. The best explanation is:
            </>
          ),
          choices: [
            {
              text: "Inference cost scales with N but not D, so overtraining a small model buys a cheaper model at equal quality.",
              correct: true,
              explain:
                "Compute-optimal minimises training cost. If you serve billions of tokens, the lifetime cost is dominated by inference, and it's rational to spend extra training FLOPs to shrink N. This is a deliberate move off the frontier, not a mistake.",
            },
            {
              text: "The Chinchilla law is wrong for models under 10B parameters.",
              explain:
                "The law fits small models fine — it was fit on models from ~70M upward. The reason to deviate is economic, not that the prediction fails.",
            },
            {
              text: "More data always lowers loss, so there is no tradeoff.",
              explain:
                "More data does keep lowering loss, but with strongly diminishing returns (D^-0.28). The question is whether those FLOPs would have bought more loss reduction spent on parameters — at compute-optimal, yes.",
            },
            {
              text: "Small models grok, so extra epochs unlock emergent abilities.",
              explain:
                "Grokking is a phenomenon of tiny models on algorithmic tasks with heavy weight decay and repeated data. Frontier pretraining passes over data roughly once; nothing like grokking is being invoked here.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              During grokking&apos;s &ldquo;circuit formation&rdquo; phase, the
              train and test accuracy curves are both flat. What is actually
              happening?
            </>
          ),
          choices: [
            {
              text: "The generalising circuit is growing steadily under weight decay while the memorising circuit still does the work — internal progress measures move even though accuracy doesn't.",
              correct: true,
              explain:
                "Nanda et al.'s restricted and excluded losses change smoothly through this phase. Accuracy is a lagging, thresholded readout of a mechanism that was developing all along.",
            },
            {
              text: "Nothing — the optimiser is stuck in a saddle point until noise kicks it out.",
              explain:
                "Tempting, and it's what the flat curves suggest, but it's empirically false: the weights are changing systematically, and you can measure the Fourier components growing throughout.",
            },
            {
              text: "The model is overfitting harder, and test accuracy would fall if you looked closely.",
              explain:
                "Test accuracy is already pinned near chance (1/113), so there's no room to fall. And the eventual outcome is generalisation, not further overfitting.",
            },
            {
              text: "The learning rate has decayed to near zero, so training has effectively stopped.",
              explain:
                "Grokking is typically run at a constant learning rate. Training very much continues — the drop in weight norm during cleanup is direct evidence that weights are still moving.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Schaeffer et al. (2023) argue many &ldquo;emergent abilities&rdquo;
              are a mirage. Their core mechanism is:
            </>
          ),
          choices: [
            {
              text: "Discontinuous metrics like exact-match accuracy threshold a smoothly improving per-token probability, manufacturing a sharp curve.",
              correct: true,
              explain:
                "If a task needs 5 tokens right and each is right with probability p, exact-match is p^5 — invisible until p is already high, then sudden. Swap to token edit distance or log-probability and many curves straighten out.",
            },
            {
              text: "The benchmarks were contaminated by training data at large scale.",
              explain:
                "Contamination is a real and serious problem, but it's a different critique. Schaeffer et al.'s argument is about metric geometry, and they demonstrate it by changing only the metric, holding the models fixed.",
            },
            {
              text: "Large models were evaluated with better prompts than small ones.",
              explain:
                "Prompt sensitivity is real too, but again not the claim. Their evidence is that the same model outputs look smooth or sharp depending purely on how you score them.",
            },
            {
              text: "Emergent abilities don't exist because loss is smooth, and behaviour is a function of loss.",
              explain:
                "Too strong, and not what they argue. Smooth loss doesn't logically forbid sharp behavioural transitions — they make the narrower, evidenced claim that the specific published curves are metric artifacts.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Model A reports loss 1.95 with a 32k-token vocabulary; model B
              reports 2.10 with a 128k-token vocabulary, on the same text. What
              can you conclude?
            </>
          ),
          choices: [
            {
              text: "Almost nothing — a larger vocabulary packs more text per token, so per-token losses aren't comparable. Convert to bits per byte first.",
              correct: true,
              explain:
                "B's tokens each carry more characters, so being more surprised per token is expected even at equal modelling quality. Bits-per-byte normalises by the text actually explained and is the comparison that means something.",
            },
            {
              text: "A is better by 0.15 nats.",
              explain:
                "Only if the tokenizers matched. This is one of the most common ways to be fooled by a loss number in a paper or a launch post.",
            },
            {
              text: "B is better, because a larger vocabulary means a harder prediction problem.",
              explain:
                "Right intuition, wrong conclusion. The problem is harder per token, which is exactly why you can't compare per-token numbers — but you can't flip the sign and declare B the winner either, since you haven't normalised.",
            },
            {
              text: "They're equivalent, because cross-entropy is invariant to tokenization.",
              explain:
                "It isn't. Cross-entropy per token depends entirely on how the text is chopped up. Cross-entropy per byte is the invariant quantity.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              What is the strongest safety-relevant lesson from the grokking
              result?
            </>
          ),
          choices: [
            {
              text: "Behavioural evals can be flat while a mechanism is being built, so internal measurements can see a change that external ones cannot.",
              correct: true,
              explain:
                "This is the cleanest published case where interpretability had strictly more information than behaviour. It's the argument for building internal progress measures rather than relying only on benchmarks.",
            },
            {
              text: "Models will suddenly become dangerous at a specific parameter count.",
              explain:
                "Grokking says nothing about parameter counts — it's a phenomenon over training steps in tiny models with heavy weight decay on a fixed algorithmic task. Reading it as a scaling prophecy overclaims badly.",
            },
            {
              text: "Weight decay is dangerous and should be turned off.",
              explain:
                "Backwards: weight decay is what causes generalisation here, and removing it leaves the model permanently memorising. Nothing about grokking makes regularisation a hazard.",
            },
            {
              text: "Test sets are unreliable and should be replaced by training loss.",
              explain:
                "Training accuracy was the *least* informative curve during the interesting phase — pinned at 100% throughout. The lesson is to add internal measures, not to drop held-out evaluation.",
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
          Two scaling papers, one grokking paper you should read closely, and the
          debate literature that keeps you honest about all three.
        </p>
      ),
      readings: [
        {
          title: "Training Compute-Optimal Large Language Models (Chinchilla)",
          authors: "Hoffmann, Borgeaud, Mensch, et al. (DeepMind)",
          year: 2022,
          url: "https://arxiv.org/abs/2203.15556",
          kind: "paper",
          time: "1h (skim)",
          essential: true,
          note: "Read the abstract, then Figure 2 and Figure 3 — the IsoFLOP curves are the whole argument and you have just played with them. Skim §3 for the three estimation approaches; note where they disagree (that disagreement is the subject of the Epoch replication below). Skip the downstream-evaluation tables.",
        },
        {
          title: "Scaling Laws for Neural Language Models",
          authors: "Kaplan, McCandlish, Henighan, et al. (OpenAI)",
          year: 2020,
          url: "https://arxiv.org/abs/2001.08361",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "Read §1–3. The figures are the point: straight lines over seven orders of magnitude. Read it as a historical document — its allocation recommendation was superseded by Chinchilla, and understanding *why* (learning-rate schedules not re-tuned per run length) is more instructive than the recommendation itself.",
        },
        {
          title: "Progress measures for grokking via mechanistic interpretability",
          authors: "Nanda, Chan, Lieberum, Smith & Steinhardt",
          year: 2023,
          url: "https://arxiv.org/abs/2301.05217",
          kind: "paper",
          time: "2h",
          essential: true,
          note: "The best short demonstration in the field that interpretability answers questions behaviour cannot. Read §1–4 carefully: the reverse-engineered Fourier/trig algorithm, then the restricted and excluded losses, then the three-phase story. §5 onward is worth a skim. This is also your first full worked example of the interp method you'll use for the rest of the course.",
        },
        {
          title: "Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets",
          authors: "Power, Burda, Edwards, Babuschkin & Misra",
          year: 2022,
          url: "https://arxiv.org/abs/2201.02177",
          kind: "paper",
          time: "30 min",
          note: "The original observation. Short. Read it for the phenomenon and the ablations (especially weight decay), then go to Nanda et al. for the explanation — reading them in that order lets you feel how unexplained the result was for a year.",
        },
        {
          title: "Are Emergent Abilities of Large Language Models a Mirage?",
          authors: "Schaeffer, Miranda & Koyejo",
          year: 2023,
          url: "https://arxiv.org/abs/2304.15004",
          kind: "paper",
          time: "45 min",
          note: "Read alongside Wei et al. below — this pair is the whole emergence debate in two sittings. Focus on Figure 3 and §3: the same model outputs, scored two ways, produce a smooth curve or a cliff. Then ask yourself which metric your own evals use.",
        },
        {
          title: "Emergent Abilities of Large Language Models",
          authors: "Wei, Tay, Bommasani, et al.",
          year: 2022,
          url: "https://arxiv.org/abs/2206.07682",
          kind: "paper",
          time: "45 min",
          note: "The claim under dispute. Read the figures and §2–3; skip the discussion of possible explanations, which has aged less well. Hold it in tension with Schaeffer et al. rather than picking a side — the resolution is still genuinely open.",
        },
        {
          title: "Chinchilla Scaling: A replication attempt",
          authors: "Besiroglu, Erdil, Barnett & You (Epoch AI)",
          year: 2024,
          url: "https://arxiv.org/abs/2404.10102",
          kind: "paper",
          time: "30 min",
          note: "Short and unusually clear about its own uncertainty. Read it for the discipline it models: extract the data from someone else's figures, re-fit, and say plainly where the numbers don't hold up. The blog version at epoch.ai is the faster read if you only want the argument.",
        },
      ],
    },
  ],
};

export default mod;
