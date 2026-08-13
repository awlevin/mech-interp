import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { SoftmaxExplorer } from "./SoftmaxExplorer";
import { GradientDescentExplorer } from "./GradientDescentExplorer";

const mod: CourseModule = {
  id: "0.2",
  slug: "information-and-optimization",
  title: "Probability, Information & Optimization",
  part: 0,
  tagline:
    "Softmax, cross-entropy as surprise, and gradient descent — the physics of training.",
  estMinutes: 120,
  objectives: [
    "Compute softmax with temperature and predict how the distribution shifts",
    "Interpret cross-entropy loss and perplexity as measures of surprise",
    "Trace gradient descent on a loss surface and explain divergence",
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "distributions",
      title: "A language model is a probability distribution",
      body: (
        <>
          <p>
            Strip away everything else and a language model is one function: given
            the tokens so far, produce a probability for <strong>every</strong>{" "}
            possible next token. GPT-2 has 50,257 tokens in its vocabulary, so
            every forward pass ends with 50,257 numbers that are all positive and
            sum to 1.
          </p>
          <p>
            The model doesn&apos;t produce probabilities directly. It produces{" "}
            <strong>logits</strong> — unbounded real-valued scores, one per token —
            and the <strong>softmax</strong> function converts them:
          </p>
          <MB>{String.raw`p_i = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}`}</MB>
          <p>
            Read it term by term: exponentiate each logit{" "}
            <M>{String.raw`z_i`}</M> (making everything positive and amplifying
            differences), then divide by the total (making them sum to 1). The{" "}
            <strong>temperature</strong> <M>T</M> divides the logits first: small{" "}
            <M>T</M> exaggerates gaps between logits, large <M>T</M> washes them
            out.
          </p>
          <KeyIdea>
            Logits live on an additive scale; probabilities on a multiplicative
            one. Adding a constant to <em>every</em> logit changes nothing —
            only <em>differences</em> between logits matter. This is why
            interpretability work talks about &ldquo;logit differences&rdquo;
            rather than raw scores.
          </KeyIdea>
          <Term word="entropy">
            The expected surprise of a distribution,{" "}
            <M>{String.raw`H(p) = -\sum_i p_i \log_2 p_i`}</M> bits. Uniform over
            5 tokens → <M>{String.raw`\log_2 5 \approx 2.32`}</M> bits. All mass
            on one token → 0 bits. It measures how uncertain the model is.
          </Term>
          <p>
            Training needs a score for &ldquo;how wrong was that
            prediction?&rdquo;. The universal choice is{" "}
            <strong>cross-entropy loss</strong>: the negative log-probability the
            model assigned to the token that actually came next,{" "}
            <M>{String.raw`\mathcal{L} = -\log p_{\text{correct}}`}</M>. Assign
            the true next token 100% → loss 0. Assign it 1% → loss{" "}
            <M>{String.raw`-\log(0.01) \approx 4.6`}</M> nats. Loss is literally{" "}
            <strong>surprise</strong>: rare-under-your-model events hurt in
            proportion to how confidently you ruled them out.
          </p>
          <Note kind="note" title="Reading loss numbers">
            Frontier-model pretraining losses land in the ballpark of ~1 nat per
            token. <strong>Perplexity</strong> is just{" "}
            <M>{String.raw`e^{\mathcal{L}}`}</M> — &ldquo;the model is as
            confused as if it were choosing uniformly among <M>k</M>{" "}
            options.&rdquo; A loss of 1 nat ≈ perplexity 2.7.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "gradient-descent",
      title: "Training is rolling downhill",
      body: (
        <>
          <p>
            A model is a function with parameters (weights). Cross-entropy gives a
            single number saying how badly the current parameters predict the
            training data. Put those together and training becomes an
            optimization problem: find weights that make the loss small.
          </p>
          <p>
            <strong>Gradient descent</strong> is the entire trick. The gradient{" "}
            <M>{String.raw`\nabla_\theta \mathcal{L}`}</M> points in the
            direction of steepest loss <em>increase</em>, so step the other way:
          </p>
          <MB>{String.raw`\theta \leftarrow \theta - \eta \, \nabla_\theta \mathcal{L}`}</MB>
          <p>
            with learning rate <M>{String.raw`\eta`}</M> controlling step size.{" "}
            <strong>Backpropagation</strong> is not a separate algorithm — it is
            the chain rule from calculus, applied efficiently through the
            network&apos;s computation graph so that one backward pass yields the
            gradient for every one of the billions of parameters at once.
          </p>
          <Figure caption="The loss landscape picture: parameters define a surface; training rolls a ball toward low ground. Real landscapes have billions of dimensions — low-dimensional intuition mostly transfers, but not always.">
            <svg viewBox="0 0 420 120" className="w-full max-w-[420px]" role="img" aria-label="Stylized loss landscape">
              <path
                d="M10,40 C60,100 110,20 170,70 C220,110 260,30 320,55 C360,72 390,45 410,58"
                fill="none"
                stroke="var(--text-secondary)"
                strokeWidth={2}
              />
              <circle cx={62} cy={78} r={6} fill="var(--series-2)" />
              <path d="M70,72 L96,60" stroke="var(--series-2)" strokeWidth={1.5} markerEnd="url(#arr)" />
              <defs>
                <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--series-2)" />
                </marker>
              </defs>
              <text x={14} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">loss</text>
              <text x={340} y={112} fontSize={11} fill="var(--text-muted)" className="font-mono">weights →</text>
            </svg>
          </Figure>
          <KeyIdea>
            Everything a transformer &ldquo;knows&rdquo; got there because it
            reduced next-token surprise on training text. There is no other
            channel. When later modules find circuits for grammar, world
            knowledge, or deception-relevant features, each one exists because
            it paid rent in loss.
          </KeyIdea>
          <Note kind="warning">
            The learning rate is a genuine tradeoff, not a nuisance: too small
            and you crawl (or get stuck in a poor local valley); too large and
            you bounce past minima or diverge. You&apos;ll feel this directly in
            the widget below — and again in Module 1.4 when loss curves and
            schedules show up for real.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: softmax & descent",
      body: (
        <>
          <p>
            Two toys. First: the exact softmax computation that ends every LLM
            forward pass — drive the temperature to the extremes and watch
            entropy respond. Second: gradient descent on a bumpy 1-D loss — your
            job is to find a learning rate that escapes the local minimum but
            still converges.
          </p>
          <SoftmaxExplorer />
          <GradientDescentExplorer />
          <p>
            Things to try: (1) Set <M>T</M> = 0.05 — this is what greedy decoding
            feels like. (2) Make two logits equal and watch their probabilities
            lock together at any temperature. (3) In the descent toy, find the
            critical learning rate where behavior flips from converging to
            bouncing forever.
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
          Pencil problems first — they&apos;re quick and they make the quiz easy.
          The code problem is the classic rite of passage; budget an hour.
        </p>
      ),
      problems: [
        {
          id: "softmax-by-hand",
          kind: "pencil",
          title: "Softmax by hand",
          prompt: (
            <p>
              Logits over a 4-token vocab: <M>{String.raw`z = (2, 1, 0, -1)`}</M>.
              Compute the softmax probabilities at <M>T=1</M> (two decimal places
              is fine). Then, without recomputing from scratch, say what happens
              to the probabilities if every logit has 10 added to it.
            </p>
          ),
          hint: (
            <p>
              <M>{String.raw`e^2 \approx 7.39,\; e^1 \approx 2.72,\; e^0 = 1,\; e^{-1} \approx 0.37`}</M>.
              For the second part, factor <M>{String.raw`e^{10}`}</M> out of
              numerator and denominator.
            </p>
          ),
          solution: (
            <>
              <p>
                Sum = 7.39 + 2.72 + 1 + 0.37 = 11.48, so{" "}
                <M>{String.raw`p \approx (0.64, 0.24, 0.09, 0.03)`}</M>. Adding 10
                to every logit multiplies numerator and denominator by{" "}
                <M>{String.raw`e^{10}`}</M>, which cancels — probabilities are
                unchanged. Softmax only sees logit <em>differences</em>.
              </p>
            </>
          ),
        },
        {
          id: "surprise",
          kind: "pencil",
          title: "Loss as surprise",
          prompt: (
            <p>
              A model assigns the true next token probability 0.5 at position A
              and 0.001 at position B. What is the cross-entropy loss (in nats)
              at each position? How many positions like A does it take to
              &ldquo;pay for&rdquo; one position like B in the average loss?
            </p>
          ),
          solution: (
            <p>
              A: <M>{String.raw`-\ln 0.5 \approx 0.69`}</M> nats. B:{" "}
              <M>{String.raw`-\ln 0.001 \approx 6.9`}</M> nats — ten times the
              loss, so one bad surprise costs as much as ten decent predictions.
              Training pressure concentrates on the model&apos;s worst surprises,
              which is part of why models learn rare-but-predictable structure.
            </p>
          ),
        },
        {
          id: "softmax-gradient",
          kind: "pencil",
          title: "The softmax gradient (guided)",
          prompt: (
            <p>
              For loss <M>{String.raw`\mathcal{L} = -\log p_c`}</M> where{" "}
              <M>{String.raw`p = \mathrm{softmax}(z)`}</M> and <M>c</M> is the
              correct token, show that{" "}
              <M>{String.raw`\partial \mathcal{L} / \partial z_i = p_i - \mathbf{1}[i = c]`}</M>.
              Interpret the result in one sentence.
            </p>
          ),
          hint: (
            <p>
              Write <M>{String.raw`\mathcal{L} = -z_c + \log \sum_j e^{z_j}`}</M>{" "}
              and differentiate each term separately.
            </p>
          ),
          solution: (
            <p>
              <M>{String.raw`\partial(-z_c)/\partial z_i = -\mathbf{1}[i=c]`}</M>{" "}
              and{" "}
              <M>{String.raw`\partial \log\sum_j e^{z_j} / \partial z_i = e^{z_i}/\sum_j e^{z_j} = p_i`}</M>,
              giving <M>{String.raw`p_i - \mathbf{1}[i=c]`}</M>. Interpretation:
              the gradient pushes each logit down in proportion to the
              probability the model gave it, and pushes the correct token&apos;s
              logit up by the probability it <em>failed</em> to give it — error =
              prediction minus truth.
            </p>
          ),
        },
        {
          id: "micrograd",
          kind: "code",
          title: "Backprop in ~40 lines",
          prompt: (
            <>
              <p>
                Follow Karpathy&apos;s micrograd video (linked in Go deeper) and
                build a tiny autograd engine: a <code>Value</code> class with{" "}
                <code>+</code>, <code>*</code>, <code>tanh</code>, and a{" "}
                <code>backward()</code> that applies the chain rule through the
                graph. Train a 2-layer net on XOR.
              </p>
              <p>
                Success check: your gradients match finite differences to ~1e-4,
                and the XOR net reaches loss &lt; 0.05.
              </p>
            </>
          ),
          hint: (
            <p>
              Each <code>Value</code> stores <code>data</code>,{" "}
              <code>grad</code>, its parents, and a <code>_backward</code>{" "}
              closure. <code>backward()</code> topologically sorts the graph and
              calls each closure in reverse.
            </p>
          ),
          solution: (
            <p>
              Reference implementation:{" "}
              <a href="https://github.com/karpathy/micrograd" target="_blank" rel="noreferrer">
                github.com/karpathy/micrograd
              </a>{" "}
              (~100 lines with the neural-net library). Compare yours after
              you&apos;ve made an honest attempt — the debugging is where the
              learning is.
            </p>
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
              Temperature is lowered from <M>T=1</M> toward <M>T=0</M>. What
              happens to the softmax distribution?
            </>
          ),
          choices: [
            {
              text: "It concentrates toward the highest-logit token, approaching greedy argmax.",
              correct: true,
              explain:
                "Dividing logits by a small T stretches their differences, so the exponentials of the leader dominate the sum. At T→0 all mass lands on the argmax.",
            },
            {
              text: "It flattens toward uniform.",
              explain:
                "That's the T→∞ limit: dividing by a huge T squashes all logit differences toward zero, making every token equally likely.",
            },
            {
              text: "All probabilities shrink because the logits shrink.",
              explain:
                "Probabilities always sum to 1 — softmax renormalizes. Temperature reshapes the distribution; it can't scale it down.",
            },
            {
              text: "Nothing — temperature only matters during training.",
              explain:
                "Temperature is a sampling-time knob. Training almost always uses T=1; generation is where you tune it.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>A constant of +5 is added to every logit. The distribution…</>
          ),
          choices: [
            {
              text: "is completely unchanged.",
              correct: true,
              explain:
                "e^{z+5} = e^5·e^z, and the e^5 cancels in the normalization. Only logit differences matter — the basis of logit-difference metrics in interp.",
            },
            {
              text: "shifts toward previously unlikely tokens.",
              explain:
                "A uniform shift changes no differences between logits, so no token gains relative to another.",
            },
            {
              text: "becomes more peaked.",
              explain:
                "Peakedness responds to scaling differences (like temperature), not to a uniform additive shift, which cancels entirely.",
            },
            {
              text: "is invalid because probabilities exceed 1.",
              explain:
                "Softmax's denominator renormalizes whatever comes in; outputs always form a valid distribution.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A model assigns probability 0.01 to the token that actually comes
              next. Its cross-entropy loss on that token is:
            </>
          ),
          choices: [
            {
              text: "−log(0.01) ≈ 4.6 nats — large, because the model was badly surprised.",
              correct: true,
              explain:
                "Loss is the negative log-probability of the truth. Confidently ruling out what happens is exactly what gets punished.",
            },
            {
              text: "0.01 — the loss equals the probability.",
              explain:
                "Loss is −log p, not p. The log is what makes rare events disproportionately costly and makes losses add across tokens.",
            },
            {
              text: "0.99 — one minus the probability.",
              explain:
                "That's an intuitive linear penalty, but cross-entropy uses −log p: assigning 1% vs 0.1% differ by a full 2.3 nats, not 0.009.",
            },
            {
              text: "It depends on what the other 49,999 probabilities were.",
              explain:
                "Cross-entropy reads out only the probability given to the true token — the others matter only through normalization, already folded into p.",
            },
          ],
        },
        {
          id: "q4",
          prompt: <>Backpropagation is best described as…</>,
          choices: [
            {
              text: "the chain rule, organized to compute all parameter gradients in one backward pass.",
              correct: true,
              explain:
                "There's no extra magic: reverse-mode differentiation reuses intermediate results so a billion gradients cost about one extra forward pass.",
            },
            {
              text: "a heuristic search over weight perturbations.",
              explain:
                "That describes evolutionary/zeroth-order methods, which need vastly more evaluations. Backprop gets exact gradients analytically.",
            },
            {
              text: "an algorithm that finds the global minimum of the loss.",
              explain:
                "Backprop only computes gradients. Descent using them typically finds good — not provably global — minima; that this works so well is an empirical miracle.",
            },
            {
              text: "a biological model of how neurons learn.",
              explain:
                "Whether the brain implements anything like backprop is an open question; the algorithm is justified by calculus, not neuroscience.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              In the gradient-descent widget, a learning rate of 2.0 makes the
              ball bounce between valley walls forever. Why?
            </>
          ),
          choices: [
            {
              text: "Each step overshoots the minimum to a point with an equal-or-larger gradient, so steps never shrink.",
              correct: true,
              explain:
                "Step size is η·|gradient|. When η is too large relative to the valley's curvature, the update carries you past the bottom to somewhere at least as steep — oscillation or divergence.",
            },
            {
              text: "The gradient becomes zero everywhere.",
              explain:
                "Zero gradient would mean no movement at all — the opposite of bouncing. The gradients stay large; the steps are just too big.",
            },
            {
              text: "The loss function changes as the ball moves.",
              explain:
                "This toy's loss surface is fixed. (In RL and GAN training the landscape genuinely does move — a real extra hazard, but not this one.)",
            },
            {
              text: "Floating-point error accumulates.",
              explain:
                "Numerics aren't the issue at these scales; the oscillation is a property of exact gradient descent with too large a step.",
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
          One video series to actually do, one to watch, and references to keep.
        </p>
      ),
      readings: [
        {
          title:
            "The spelled-out intro to neural networks and backpropagation: building micrograd",
          authors: "Andrej Karpathy",
          year: 2022,
          url: "https://www.youtube.com/watch?v=VMj-3S1tku0",
          kind: "video",
          time: "2.5h (do-along)",
          essential: true,
          note: "Build backprop from nothing, in Python, with your own hands. The single highest-value activity in Part 0 — pair it with the code problem above.",
        },
        {
          title: "Neural networks (chapters 1–4)",
          authors: "3Blue1Brown",
          year: 2017,
          url: "https://www.3blue1brown.com/topics/neural-networks",
          kind: "video",
          time: "1.5h",
          essential: true,
          note: "The visual grounding for gradient descent and backprop. Watch chapter 4 twice — the computation-graph picture is exactly how autograd libraries think.",
        },
        {
          title: "Deep Learning, Chapter 3: Probability and Information Theory",
          authors: "Goodfellow, Bengio & Courville",
          year: 2016,
          url: "https://www.deeplearningbook.org/contents/prob.html",
          kind: "book",
          time: "reference",
          note: "Keep as a reference for entropy, KL divergence, and cross-entropy definitions when papers use them without explanation.",
        },
        {
          title: "Why Momentum Really Works",
          authors: "Gabriel Goh (Distill)",
          year: 2017,
          url: "https://distill.pub/2017/momentum/",
          kind: "blog",
          time: "30 min",
          note: "Optional but delightful: an interactive Distill classic on optimizers — and your first taste of the interactive-paper format this whole course is modeled on.",
        },
      ],
    },
  ],
};

export default mod;
