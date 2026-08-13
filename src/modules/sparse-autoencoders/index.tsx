import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { SaeAnatomy } from "./SaeAnatomy";
import { FeatureSplittingTree } from "./FeatureSplittingTree";

const mod: CourseModule = {
  id: "3.4",
  slug: "sparse-autoencoders",
  title: "Sparse Autoencoders & Dictionary Learning",
  part: 3,
  tagline:
    "Decomposing superposition into monosemantic features — from Towards to Scaling Monosemanticity.",
  estMinutes: 210,
  objectives: [
    "Explain SAE architecture and the reconstruction–sparsity tradeoff",
    "Describe feature splitting and known SAE limitations",
    "Train a small SAE and characterize features on Neuronpedia",
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "dictionary-learning",
      title: "The problem: you cannot audit a basis you cannot read",
      body: (
        <>
          <p>
            Module 3.3 left you with a diagnosis and no cure. Models pack more
            features than they have dimensions, each feature living along its own
            direction, all of them interfering slightly. The consequence is that
            individual neurons are <strong>polysemantic</strong>: in the one-layer
            model Anthropic studied, a single neuron fires on academic citations,
            English dialogue, HTTP requests, <em>and</em> Korean text. Reading the
            model neuron by neuron is reading it in the wrong basis.
          </p>
          <p>
            That is not just an aesthetic complaint. If you want to answer
            &ldquo;is this model about to deceive the user?&rdquo; you need a
            handle on the concept &ldquo;deception&rdquo; inside the model. If
            deception is smeared across four thousand neurons that each also do
            nine other things, you have no handle.
          </p>
          <KeyIdea>
            Superposition says the activation vector is a <em>sparse combination
            of many more directions than there are dimensions</em>. That is
            precisely the setting of a classical problem — <strong>dictionary
            learning</strong>. Find an overcomplete set of directions (the
            dictionary) such that every activation is a sparse non-negative
            combination of them, and you have recovered the model&apos;s own
            vocabulary.
          </KeyIdea>
          <Term word="feature">
            A direction in activation space that the model uses to represent one
            thing. The working hypothesis (the <em>linear representation
            hypothesis</em>) is that concepts are directions and that their
            strengths add. Everything in this module rests on it.
          </Term>
          <Term word="dictionary">
            The set of feature directions you are trying to recover. It is{" "}
            <strong>overcomplete</strong>: many more entries than the
            activation has dimensions. That is the whole point — otherwise you
            are just doing a change of basis and superposition is untouched.
          </Term>
          <p>
            Why is this solvable at all? Because of sparsity. If a token&apos;s
            activation is a mixture of five features out of a hundred thousand,
            the mixture is heavily constrained, and — exactly as in compressed
            sensing — the sparse decomposition is essentially unique. Sparsity is
            what makes superposition possible <em>and</em> what makes it
            reversible.
          </p>
          <Figure caption="Left: the model's own basis. Every neuron is a mixture, so no axis means anything. Right: the dictionary basis. Same activation, expressed as three of many possible feature directions. Dictionary learning is the change of coordinates between them.">
            <svg
              viewBox="0 0 460 150"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Neuron basis versus feature basis for the same activation"
            >
              <text x={10} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">
                neuron basis (dense)
              </text>
              {[0.7, 0.42, 0.85, 0.31, 0.62, 0.5].map((v, i) => (
                <g key={i}>
                  <rect x={10} y={30 + i * 19} width={140} height={13} rx={3} fill="var(--surface-2)" />
                  <rect x={10} y={30 + i * 19} width={140 * v} height={13} rx={3} fill="var(--series-2)" />
                </g>
              ))}
              <text x={165} y={82} fontSize={20} fill="var(--text-secondary)">
                ≡
              </text>
              <text x={200} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">
                feature basis (sparse)
              </text>
              {[0, 0.95, 0, 0, 0.6, 0, 0, 0.35, 0, 0, 0, 0].map((v, i) => (
                <g key={i}>
                  <rect x={200} y={26 + i * 10} width={240} height={7} rx={2} fill="var(--surface-2)" />
                  {v > 0 ? (
                    <rect x={200} y={26 + i * 10} width={240 * v} height={7} rx={2} fill="var(--series-1)" />
                  ) : null}
                </g>
              ))}
            </svg>
          </Figure>
        </>
      ),
    },
    {
      kind: "learn",
      id: "architecture",
      title: "The machine: a deliberately bad autoencoder",
      body: (
        <>
          <p>
            A <strong>sparse autoencoder</strong> (SAE) is the crudest possible
            approximation to dictionary learning, and it works. Take activations{" "}
            <M>{String.raw`x \in \mathbb{R}^{d}`}</M> harvested from one site in
            the model — a residual stream layer, or an MLP&apos;s hidden
            activations. Encode them into a much wider vector, then decode back:
          </p>
          <MB>{String.raw`f(x) = \mathrm{ReLU}\!\left(W_{\text{enc}}(x - b_{\text{dec}}) + b_{\text{enc}}\right), \qquad \hat{x} = W_{\text{dec}}\, f(x) + b_{\text{dec}}`}</MB>
          <p>
            Term by term: <M>{String.raw`W_{\text{enc}}`}</M> is{" "}
            <M>{String.raw`h \times d`}</M> with <M>{String.raw`h \gg d`}</M> —
            the <em>expansion factor</em> <M>{String.raw`h/d`}</M> is typically
            8× to 256×. The ReLU forces every feature activation to be zero or
            positive, which is what lets you say &ldquo;this feature is off
            here.&rdquo; The columns of{" "}
            <M>{String.raw`W_{\text{dec}}`}</M> are the dictionary: each one is
            the direction the model writes when that feature fires.
          </p>
          <p>
            An ordinary autoencoder with a wider middle layer would learn the
            identity map and tell you nothing. The sparsity penalty is what makes
            it informative:
          </p>
          <MB>{String.raw`\mathcal{L} = \underbrace{\lVert x - \hat{x} \rVert_2^2}_{\text{reconstruct}} \; + \; \lambda \underbrace{\sum_i f_i(x) \lVert W_{\text{dec},\,i} \rVert_2}_{\text{be sparse}}`}</MB>
          <p>
            The second term is an <strong>L1 penalty</strong> on feature
            activations. L1 is a convex stand-in for what you actually want,
            which is L0 — the raw count of nonzero features — and L0 is not
            differentiable. Scaling each term by the decoder column norm stops the
            network from cheating by shrinking activations and growing the
            corresponding dictionary vector.
          </p>
          <KeyIdea>
            <M>{String.raw`\lambda`}</M> is the only interesting hyperparameter,
            and it buys sparsity with accuracy. There is no free lunch and no
            &ldquo;correct&rdquo; setting: an SAE is a point on a{" "}
            <strong>reconstruction–sparsity frontier</strong>, and every paper you
            read has chosen a point on that frontier for you.
          </KeyIdea>
          <Term word="L0">
            The average number of features active on a token. Anthropic&apos;s
            Claude 3 Sonnet SAEs ran under 300 active features per token out of a
            million or more; small research SAEs typically target L0 of 20–100.
            Low L0 with high reconstruction is the goal; the two fight.
          </Term>
          <Term word="loss recovered">
            The honest quality metric. Splice the SAE into the model
            (reconstruct the activation, continue the forward pass) and measure
            the model&apos;s cross-entropy loss. Compare against the unmodified
            model and against a zero-ablated one. &ldquo;95% loss
            recovered&rdquo; means the SAE gave back 95% of the damage that
            deleting the activation would have done.
          </Term>
          <p>
            Two later variants matter. <strong>TopK SAEs</strong> (Gao et al.,
            OpenAI, 2024) throw out the L1 penalty and simply keep the <M>k</M>{" "}
            largest pre-activations, zeroing the rest. This fixes L0 exactly to{" "}
            <M>k</M>, removes the tuning problem, and sidesteps shrinkage — see
            below. <strong>Gated</strong> and <strong>JumpReLU</strong> SAEs
            (DeepMind, 2024) separate the decision <em>whether</em> a feature is
            active from the estimate of <em>how</em> active, for the same reason.
          </p>
          <Note kind="note" title="Where the L1 penalty leaks">
            An L1 penalty does not only kill features that should be off. It also
            shrinks the ones that should be on, because every unit of activation
            costs <M>{String.raw`\lambda`}</M>. This is called{" "}
            <strong>shrinkage</strong>, it is a known pathology of L1 in
            statistics, and Anthropic call it out as significantly harming SAE
            performance regardless of scale. You will watch it happen in the
            widget below.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "what-it-found",
      title: "What it found: from a toy model to Claude 3 Sonnet",
      body: (
        <>
          <p>
            <em>Towards Monosemanticity</em> (Bricken et al., 2023) was the
            existence proof. One-layer transformer, 512-neuron MLP, sparse
            autoencoders from 512 up to 131,072 features trained on 8 billion
            activation samples, with detailed analysis of a 4,096-feature run they
            call A/1. They found features that are specific in a way no neuron
            was: an Arabic-script feature that fires on 0.13%-of-corpus Arabic
            text and accounts for 81% of that text&apos;s tokens; base64
            features; DNA features. Crucially, the features have{" "}
            <em>causal</em> downstream effects consistent with their
            interpretation, which is what separates a feature from a correlation.
          </p>
          <p>
            <em>Scaling Monosemanticity</em> (Templeton et al., 2024) answered
            the question everyone had: does this survive contact with a real
            production model? They trained SAEs on the residual stream halfway
            through <strong>Claude 3 Sonnet</strong> at three sizes — roughly 1M,
            4M and 34M features — using scaling laws to allocate compute. Under
            300 features fired per token, and reconstruction explained at least
            65% of activation variance.
          </p>
          <Term word="feature splitting">
            Widen the dictionary and a coarse feature fragments into finer, related
            ones. Bricken et al. watched base64 features go 1 → 3 → many across
            512, 4,096 and 16,384-feature runs. Templeton et al. found a single
            &ldquo;San Francisco&rdquo; feature in the 1M SAE splitting into 2 at
            4M and 11 at 34M. There is no privileged width — a small dictionary is
            a useful <em>summary</em> of a large one.
          </Term>
          <KeyIdea>
            The 2024 result that matters is not any single feature. It is that
            the method <em>scaled</em>: the same crude autoencoder that worked on
            a one-layer toy worked on a deployed frontier model, and the features
            it found were more abstract, not less. Whatever is going on inside
            large models, it is not so alien that dictionary learning bounces off
            it.
          </KeyIdea>
          <p>
            The features are also abstract in ways that a shallow &ldquo;this
            fires on this word&rdquo; story cannot explain. They are multilingual
            (the same feature for the same concept across languages), multimodal
            (text and images), and they bridge concrete and abstract — one feature
            covers both actual code containing a security vulnerability and
            English prose discussing security vulnerabilities.
          </p>
          <Note kind="safety">
            The paper&apos;s headline for safety people is a catalogue of
            features that are plausibly safety-relevant, all of which were shown
            to be causal by clamping them and watching behavior change:{" "}
            <strong>unsafe code</strong> (clamp it and Claude writes a buffer
            overflow), <strong>backdoors in code</strong>,{" "}
            <strong>bias and slurs</strong>, <strong>sycophantic praise</strong>{" "}
            (clamp it and Claude fawns over an invented achievement),{" "}
            <strong>secrecy and discreetness</strong> (clamp it and Claude plans
            in its scratchpad to lie to the user),{" "}
            <strong>treacherous turns</strong>, <strong>biding time and hiding
            strength</strong>, <strong>self-improving AI</strong>, and{" "}
            <strong>bioweapon development</strong>. In one case study they used an
            &ldquo;internal conflicts and dilemmas&rdquo; feature to catch the
            model claiming to have forgotten something it had not, and clamping an
            &ldquo;openness and honesty&rdquo; feature was enough to get a true
            answer.
            <br />
            <br />
            The authors are careful, and you should copy their care:
            &ldquo;there&apos;s a difference between knowing about lies, being
            capable of lying, and actually lying in the real world.&rdquo; The
            interesting result is not that a deception feature exists — of course
            it does — but that it can be <em>found at scale and intervened
            on</em>.
          </Note>
          <p>
            Then they turned the demo into a public one. Clamping the Golden Gate
            Bridge feature (34M/31164353) to ten times its maximum observed
            activation produced <strong>Golden Gate Claude</strong>, a model that
            steers every conversation toward the bridge and at times identifies
            itself <em>as</em> the bridge. It ran as a public demo for a day in
            May 2024. As a party trick it is delightful; as evidence it is the
            cleanest available demonstration that these dictionary directions are
            the real causal handles the model uses, not a post-hoc story about
            correlations. Module 5.1 picks up steering as a technique in its own
            right.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "limits",
      title: "The honest ledger",
      body: (
        <>
          <p>
            SAEs are the most productive idea in interpretability since attention
            heads, and it is entirely possible they are the wrong abstraction.
            Hold both.
          </p>
          <Term word="the reconstruction gap (&ldquo;dark matter&rdquo;)">
            The SAE never reconstructs the activation exactly. Whatever is left
            over —{" "}
            <M>{String.raw`x - \hat{x}`}</M> — is computation you have no account
            of. On Claude 3 Sonnet reconstruction explained at least 65% of
            variance, which means up to a third of the activation was unexplained.
            Engels, Riggs &amp; Tegmark (2024) went looking for structure in that
            residual and found it is not just noise: part of it is predictable
            from the activation, suggesting real features the dictionary missed
            rather than irreducible error.
          </Term>
          <Term word="shrinkage">
            L1 systematically underestimates the activations of features that are
            genuinely present. Anthropic state plainly that they believe this
            &ldquo;significantly harms sparse autoencoder performance,
            independent of whether we&apos;ve learned all the features.&rdquo;
            TopK, Gated and JumpReLU SAEs all exist to attack this.
          </Term>
          <Term word="atomicity">
            Is a feature a unit of anything? Feature splitting says the answer
            depends on your dictionary width. Worse, <em>feature absorption</em>{" "}
            (Chanin et al., 2024) shows a general feature can quietly stop firing
            on cases covered by a more specific one, so &ldquo;starts with
            S&rdquo; ends up not firing on &ldquo;short&rdquo; because a
            &ldquo;short&rdquo; feature absorbed it. Leask et al. (2025) argue
            directly that SAEs do not find canonical units of analysis. This is a
            live, contested question.
          </Term>
          <p>
            Two more you should know. <strong>Cross-layer superposition</strong>:
            gradient descent does not care which layer a feature lives in, so
            features get smeared across layers, and an SAE fitted to one layer
            can only ever see a slice. Anthropic call this &ldquo;very
            fundamental&rdquo; and do not claim to have solved it — it is exactly
            what the cross-layer transcoders of Module 4.1 are built to attack.{" "}
            <strong>Completeness</strong>: they do not believe they found anything
            near all the features in Sonnet, and estimate they may be orders of
            magnitude short.
          </p>
          <Note kind="warning" title="The usefulness question is still open">
            Kantamneni et al. (2025) benchmarked SAEs against plain linear probes
            on sparse-probing tasks and found SAEs did not reliably win. A
            technique can produce beautiful, causally-verified features and still
            lose to a baseline on the task you care about. When you read an SAE
            paper, ask what it is being compared <em>against</em>.
          </Note>
          <KeyIdea>
            The strongest current case for SAEs is not &ldquo;they decompose
            models correctly.&rdquo; It is &ldquo;they give us a vocabulary
            specific enough to build circuits out of, and to steer with.&rdquo;
            Module 4.1 is what happens when you take that vocabulary seriously
            enough to draw the wiring diagram.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: the frontier and the fragments",
      body: (
        <>
          <p>
            Two toys. The first is a working sparse-coding solve on a synthetic
            activation whose true features you know, so you can catch the SAE
            being wrong. The second lets you walk a coarse feature down into its
            fragments as the dictionary widens.
          </p>
          <SaeAnatomy />
          <p>
            The solver minimizes{" "}
            <M>{String.raw`\tfrac{1}{2}\lVert x - Df \rVert^2 + \lambda \lVert f \rVert_1`}</M>{" "}
            with <M>{String.raw`f \ge 0`}</M> — the same objective an SAE&apos;s
            training loss asks its encoder to approximate — so what you see is
            the real tradeoff, not a mock-up.
          </p>
          <FeatureSplittingTree />
          <p>
            Things to try: (1) Drive <M>{String.raw`\lambda`}</M> to 0 on Token D
            and count the active features — seven light up where only four are
            real, reconstruction is perfect, and the code is no more readable
            than the neurons were. That is the failure mode a plain autoencoder
            has, and it is what the sparsity penalty exists to prevent. (2) Now
            walk <M>{String.raw`\lambda`}</M> up on Token D: at around 0.9 the
            weakest true feature dies and reconstruction error passes 60%. Rare,
            weak features are the first thing sparsity costs you. (3) Switch to
            Token C and look for the orange bar — the solver reports a Golden
            Gate Bridge feature that is not there, because that direction happens
            to patch the residual cheaply. False positives are not a bug in this
            toy; they are what interference looks like from the inside. (4)
            Watch the &ldquo;recovered magnitude&rdquo; readout as you raise{" "}
            <M>{String.raw`\lambda`}</M>: that is shrinkage, and it is why a
            feature&apos;s activation value is a much less trustworthy number
            than its identity. (5) In the tree, click{" "}
            <em>ducks, geese &amp; migration</em> and note it has two parents —
            splitting produces a graph, not a tree, exactly as Bricken et al.
            report.
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
          Do the two pencil problems before the notebook — they are the
          difference between running an SAE and understanding its output. The
          Neuronpedia problem is the one to do if you only do one.
        </p>
      ),
      problems: [
        {
          id: "shrinkage-derivation",
          kind: "pencil",
          title: "Derive shrinkage",
          prompt: (
            <>
              <p>
                Take the simplest possible case: one feature, one dimension,
                dictionary vector of norm 1. The SAE must choose an activation{" "}
                <M>{String.raw`a \ge 0`}</M> minimizing
              </p>
              <MB>{String.raw`\mathcal{L}(a) = (x - a)^2 + \lambda a`}</MB>
              <p>
                where the true activation is <M>x &gt; 0</M>. Solve for the
                optimal <M>a</M>. Then state, in one sentence, what this implies
                about comparing feature activation values across two SAEs trained
                with different <M>{String.raw`\lambda`}</M>.
              </p>
            </>
          ),
          hint: (
            <p>
              Differentiate and set to zero. Remember the constraint{" "}
              <M>{String.raw`a \ge 0`}</M> — the unconstrained solution can go
              negative when <M>{String.raw`\lambda`}</M> is large.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`\mathcal{L}'(a) = -2(x - a) + \lambda = 0 \Rightarrow a = x - \lambda/2`}</M>,
                and with the non-negativity constraint,{" "}
                <M>{String.raw`a^\star = \max(0,\; x - \lambda/2)`}</M>. This is
                the soft-thresholding operator, and it is exactly the update the
                widget&apos;s solver applies.
              </p>
              <p>
                Two consequences. First, every recovered activation is biased{" "}
                <em>downward</em> by a constant{" "}
                <M>{String.raw`\lambda/2`}</M> — that is shrinkage, and it hits
                weak features proportionally hardest, killing anything below{" "}
                <M>{String.raw`\lambda/2`}</M> outright. Second, activation
                magnitudes are not comparable across SAEs with different{" "}
                <M>{String.raw`\lambda`}</M>, or even reliably comparable between
                a strong and a weak feature within one SAE. Treat feature
                <em> identity</em> as the signal and feature{" "}
                <em>magnitude</em> as a noisy, biased estimate. TopK SAEs exist
                because this bias has no principled correction.
              </p>
            </>
          ),
        },
        {
          id: "capacity-count",
          kind: "pencil",
          title: "How wide does the dictionary need to be?",
          prompt: (
            <>
              <p>
                Suppose a residual stream of width <M>d = 4096</M> carries{" "}
                <M>N</M> features, of which on average <M>L</M> are active per
                token. Reconstruction requires the active set to be identifiable
                from a <M>d</M>-dimensional vector.
              </p>
              <p>
                (a) Argue informally why <M>{String.raw`L \ll d`}</M> is the
                binding constraint rather than <M>{String.raw`N \le d`}</M>. (b)
                Anthropic&apos;s Sonnet SAEs had L0 under 300 with dictionaries up
                to 34M. Given they also believe they are &ldquo;orders of
                magnitude short&rdquo; of all the features, what does that tell
                you about the frequency distribution of features?
              </p>
            </>
          ),
          hint: (
            <p>
              For (b), think about which features a dictionary of fixed size will
              learn first, and what it takes for a rare concept to earn a slot.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) A dense <M>d</M>-vector has <M>d</M> degrees of freedom, so it
                cannot simultaneously specify the magnitudes of more than{" "}
                <M>d</M> features. But it does not have to: only <M>L</M> are
                nonzero. Recovering an <M>L</M>-sparse vector from{" "}
                <M>d</M> measurements is the compressed-sensing problem, and it is
                solvable when <M>{String.raw`L \lesssim d / \log(N/L)`}</M> — a
                bound that depends on <M>N</M> only logarithmically. So the
                dictionary can be enormous provided each token uses very little
                of it. Sparsity, not dimension count, is the budget.
              </p>
              <p>
                (b) It says features have a very heavy-tailed frequency
                distribution. A dictionary of fixed size spends its slots on
                concepts that appear often enough in training data to be worth a
                slot; rarer concepts either share a coarse feature or are not
                represented at all. Templeton et al. observe exactly this — a
                systematic relationship between how frequent a concept is and how
                large the dictionary must be before it resolves as its own
                feature. Feature splitting is this effect seen from the other
                side: widening the dictionary buys resolution on progressively
                rarer distinctions, and there is no width at which you are done.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia",
          kind: "explore",
          title: "Characterize a real feature on Neuronpedia",
          prompt: (
            <>
              <p>
                Go to{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  neuronpedia.org
                </a>{" "}
                and pick a model with public SAEs — the GPT-2 small residual
                stream sets, or{" "}
                <a href="https://www.neuronpedia.org/gemma-scope" target="_blank" rel="noreferrer">
                  Gemma Scope
                </a>{" "}
                on Gemma 2. Search for a concept you actually care about (try
                something safety-flavored: &ldquo;refusal&rdquo;,
                &ldquo;flattery&rdquo;, &ldquo;lying&rdquo;, &ldquo;urgency&rdquo;)
                and choose one feature.
              </p>
              <p>Write up half a page covering, in order:</p>
              <ol>
                <li>
                  <strong>Your one-sentence hypothesis</strong> for what the
                  feature represents, written <em>before</em> you scroll past the
                  top activations.
                </li>
                <li>
                  <strong>Activation distribution.</strong> Look at the density
                  histogram and the logarithm of the feature&apos;s firing
                  frequency. Is it a common feature or a rare one? Do the top
                  activations look qualitatively different from the ones at 20% of
                  max?
                </li>
                <li>
                  <strong>Specificity check.</strong> Find the weakest activations
                  shown. Do they still match your hypothesis? If not, revise it —
                  this is where most naive interpretations die.
                </li>
                <li>
                  <strong>Causal check.</strong> Use the feature dashboard&apos;s
                  top positive and negative logits, and if the model has a
                  steering interface, steer on it. Does the effect on output match
                  your hypothesis, or only the activations?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              The single most common mistake is reading only the top 10
              activations. A feature that fires at maximum on Arabic script and at
              15% on every whitespace token is a different object from the one you
              would describe from the top of the list.
            </p>
          ),
          solution: (
            <>
              <p>
                There is no single right answer; there is a right shape of
                answer. A good write-up looks like this:
              </p>
              <p>
                <em>Hypothesis:</em> &ldquo;Fires on polite deferral / softened
                refusal.&rdquo; <em>Distribution:</em> log-frequency around −4.5,
                so roughly one token in 30,000 — rare, consistent with a specific
                pragmatic function. Top activations are all on
                &ldquo;unfortunately&rdquo;, &ldquo;I&apos;m afraid&rdquo;,
                &ldquo;regrettably&rdquo;. <em>Specificity:</em> at 20% of max it
                also fires on &ldquo;unfortunately&rdquo; in weather reports,
                which have nothing to do with refusal — so the honest description
                is &ldquo;the discourse marker <em>unfortunately</em> and its
                near-synonyms&rdquo;, not &ldquo;refusal.&rdquo; That revision is
                the whole exercise. <em>Causal:</em> top positive logits are
                &ldquo; we&rdquo;, &ldquo; I&rdquo;, &ldquo; there&rdquo; —
                sentence continuations after the marker — which supports the
                revised reading and not the original one.
              </p>
              <p>
                Two habits worth keeping: name the feature by what it{" "}
                <em>fires on</em>, not by what you hope it means; and treat
                disagreement between the activation story and the logit story as
                information, not noise. If you want a second opinion on any
                feature, Neuronpedia shows autointerp explanations alongside the
                dashboards — compare yours to the automated one and note where you
                disagree.
              </p>
            </>
          ),
        },
        {
          id: "train-sae",
          kind: "code",
          title: "Train a small SAE on GPT-2 activations",
          prompt: (
            <>
              <p>
                In a Colab GPU notebook, use{" "}
                <a href="https://github.com/TransformerLensOrg/TransformerLens" target="_blank" rel="noreferrer">
                  TransformerLens
                </a>{" "}
                to cache <code>blocks.6.hook_resid_pre</code> activations from
                GPT-2 small over ~10M tokens of OpenWebText, then train a
                16×-expansion SAE (<M>{String.raw`d = 768`}</M>,{" "}
                <M>{String.raw`h = 12{,}288`}</M>)
                with the loss from the lesson. Normalize decoder columns to
                unit norm after every step, and resample dead features
                periodically.
              </p>
              <p>
                Success check: L0 between 20 and 60, and{" "}
                <strong>loss recovered above 80%</strong> when you splice the
                reconstruction back into the forward pass. Then hand-inspect 10
                random live features and record how many you can write a
                one-sentence description for.
              </p>
            </>
          ),
          hint: (
            <p>
              Three things kill first attempts. (1) Dead features: a large
              fraction of the dictionary stops firing entirely — detect features
              with zero activations over some window and reinitialize them toward
              high-loss examples. (2) Forgetting to normalize decoder columns, so
              the model games the L1 term. (3) Judging quality by reconstruction
              MSE instead of loss recovered — MSE looks fine while the model
              downstream falls apart.{" "}
              <a href="https://github.com/jbloomAus/SAELens" target="_blank" rel="noreferrer">
                SAELens
              </a>{" "}
              implements all of this if you want to compare against a reference
              after your own attempt.
            </p>
          ),
          solution: (
            <>
              <p>
                Expected outcome: with <M>{String.raw`\lambda \approx 5\text{e-}4`}</M>{" "}
                on normalized activations and ~10M tokens you should land around
                L0 30–50 and 80–90% loss recovered. Of 10 random live features,
                most people can confidently describe 5–7; the rest look like
                token-level or positional oddities. That hit rate is normal and
                worth internalizing before you read any paper claiming
                interpretability.
              </p>
              <p>
                Then sweep <M>{String.raw`\lambda`}</M> over roughly a decade and
                plot L0 on the x-axis against loss recovered on the y-axis. You
                have just drawn the reconstruction–sparsity frontier for your own
                model, and you will recognize the shape in every SAE paper you
                read afterward. Overlay a TopK SAE at matched L0 and you should
                see it sit above your L1 curve — that gap is shrinkage, priced.
              </p>
            </>
          ),
        },
        {
          id: "splitting-experiment",
          kind: "code",
          title: "Reproduce feature splitting",
          prompt: (
            <>
              <p>
                Train three SAEs on the same activations at 4×, 16× and 64×
                expansion, holding L0 roughly constant by tuning{" "}
                <M>{String.raw`\lambda`}</M> per run. Pick a clearly interpretable
                feature in the 4× run. For every feature in the 64× run, compute
                the cosine similarity of decoder directions, and separately the
                correlation of activations over a held-out token set.
              </p>
              <p>
                Success check: produce a bipartite graph linking the coarse
                feature to its fine descendants and confirm the two similarity
                measures broadly agree. Then answer: is the relationship a tree?
              </p>
            </>
          ),
          hint: (
            <p>
              Use masked activation correlation rather than raw correlation:
              restrict to tokens where at least one of the two features fires,
              otherwise the shared zeros dominate and everything looks correlated.
              Bricken et al. used a threshold around 0.4 on this measure.
            </p>
          ),
          solution: (
            <>
              <p>
                You should find a fan-out — one coarse feature connecting to
                several fine ones whose decoder directions cluster tightly around
                the coarse direction — and you should find that it is{" "}
                <em>not</em> a tree. Fine features routinely have two coarse
                parents, and some coarse features merge as well as split. Bricken
                et al. say this explicitly: &ldquo;the structure of this
                refinement is more complex than a tree.&rdquo;
              </p>
              <p>
                The check that makes this convincing rather than suggestive is
                the logit side. Their coarse{" "}
                <span className="font-mono">the</span>-in-mathematical-prose
                feature promotes generic tokens (&ldquo;the denominator&rdquo;,
                &ldquo;the theorem&rdquo;), while its split descendants promote
                topic-specific ones — the machine-learning version predicts
                &ldquo;the dataset&rdquo;, &ldquo;the classifier&rdquo;; the
                abstract-algebra version predicts &ldquo;the quotient&rdquo;,
                &ldquo;the subgroup&rdquo;. Splitting is not just finer clustering
                of inputs; it is a finer division of the model&apos;s
                computational labor.
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
              Why does a sparse autoencoder need its hidden layer to be{" "}
              <em>wider</em> than its input, when an ordinary autoencoder makes
              it narrower?
            </>
          ),
          choices: [
            {
              text: "Because the hypothesis is that the model represents more features than it has dimensions, so the dictionary must be overcomplete to have room for them all.",
              correct: true,
              explain:
                "This is the whole design. Superposition says N features live in d < N dimensions; a dictionary with h ≥ N entries is the only shape that can give each feature its own slot. Sparsity, not width, is what stops it learning the identity.",
            },
            {
              text: "Because wider layers train faster and more stably.",
              explain:
                "Wider SAEs are in fact harder to train — Anthropic report 65% dead features in their 34M-feature run. Width is chosen for representational reasons and paid for in training difficulty.",
            },
            {
              text: "Because the extra dimensions absorb noise, leaving a clean low-dimensional signal.",
              explain:
                "This inverts the goal. The SAE is not denoising toward a smaller representation; it is re-expressing the same information in a larger, sparser, more readable basis.",
            },
            {
              text: "Because compression would lose information needed to reconstruct the activation exactly.",
              explain:
                "Tempting, but the SAE does not reconstruct exactly anyway — the leftover error is the 'dark matter' problem. Width is about giving features separate slots, not about lossless compression.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              You train two SAEs on the same activations and observe: SAE-A has
              L0 = 15 and recovers 62% of loss; SAE-B has L0 = 80 and recovers
              94%. Which is better?
            </>
          ),
          choices: [
            {
              text: "Neither, on this evidence — they are two points on the reconstruction–sparsity frontier, and which you want depends on the use case.",
              correct: true,
              explain:
                "Exactly. λ traces a curve; a single point on it is not a quality claim. A comparison only becomes meaningful when one SAE dominates the other at matched L0, which is how TopK and Gated SAEs are actually evaluated.",
            },
            {
              text: "SAE-A, because sparser codes are more interpretable and interpretability is the goal.",
              explain:
                "Sparsity is only good if the model still works when you splice the reconstruction in. At 62% loss recovered, more than a third of the computation at that site is missing from your explanation.",
            },
            {
              text: "SAE-B, because 94% loss recovered means it explains 94% of the model.",
              explain:
                "Loss recovered measures how well the reconstruction substitutes for the activation at one site. It says nothing about whether the 80 active features are individually interpretable — and at high L0 they frequently are not.",
            },
            {
              text: "SAE-B, because higher L0 means it found more features.",
              explain:
                "L0 is features active per token, not dictionary size. A high L0 means each token's explanation is longer, which usually makes it less useful, not more.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A feature you found fires strongly on text about the Golden Gate
              Bridge. What would convince you it is a real component of the
              model&apos;s computation rather than a description of the data?
            </>
          ),
          choices: [
            {
              text: "Clamping it high in an unrelated context changes the model's outputs in the direction the interpretation predicts.",
              correct: true,
              explain:
                "This is the causal test and it is the one the field insists on. Templeton et al. did exactly this — clamping the feature to 10× max produced Golden Gate Claude — and it works in contexts where the feature was inactive, which rules out the correlational story.",
            },
            {
              text: "It fires on 95% of Golden Gate Bridge mentions in a held-out corpus.",
              explain:
                "High sensitivity is good evidence about the feature's inputs and nothing at all about its role. An SAE trained on activations could in principle learn structure present in the data but unused by the model; only intervention distinguishes the cases.",
            },
            {
              text: "Its decoder direction has high cosine similarity with the embedding of the token 'bridge'.",
              explain:
                "Suggestive geometry, not evidence of function. Plenty of directions correlate with token embeddings without being read by anything downstream.",
            },
            {
              text: "No neuron in the model fires on the same set of examples.",
              explain:
                "That is evidence the feature is in superposition — a good sign that dictionary learning did something — but it says nothing about whether the direction is causally used.",
            },
          ],
        },
        {
          id: "q4",
          prompt: <>Feature splitting is best described as…</>,
          choices: [
            {
              text: "a coarse feature in a small dictionary being resolved into several finer, related features as the dictionary widens — with the coarse one acting as a usable summary.",
              correct: true,
              explain:
                "This is Bricken et al.'s framing, and it has a practical upside: small dictionaries are legitimate summaries of large ones, so you can study a small SAE without believing it is complete. The relationship is a graph, not a tree — features both split and merge.",
            },
            {
              text: "an SAE training failure in which one true feature is spuriously duplicated across several dictionary entries.",
              explain:
                "It looks like duplication if you assume a fixed set of true features, but the split features make genuinely different predictions — the machine-learning 'the' promotes 'the dataset', the algebra one promotes 'the subgroup'. They are doing different jobs.",
            },
            {
              text: "the phenomenon where a feature's activation is split between the encoder and decoder due to shrinkage.",
              explain:
                "Shrinkage is a different problem — the systematic underestimation of activation magnitude caused by the L1 penalty. Splitting is about how many features you get, not how large their activations are.",
            },
            {
              text: "a feature becoming polysemantic when the dictionary is too wide.",
              explain:
                "Widening dictionaries makes features more specific, not less. Polysemanticity is what you get from too *narrow* a dictionary, or from reading neurons directly.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Anthropic found a &ldquo;treacherous turns&rdquo; feature in Claude
              3 Sonnet. The correct safety inference is:
            </>
          ),
          choices: [
            {
              text: "Very little about how dangerous the model is, but a lot about what auditing tools are now possible — the feature can be found at scale and intervened on.",
              correct: true,
              explain:
                "This is the paper's own reading, almost verbatim: 'there's a difference between knowing about lies, being capable of lying, and actually lying in the real world.' A model that has read about treachery will represent treachery. The advance is detectability, not the discovery of danger.",
            },
            {
              text: "The model has a latent goal of executing a treacherous turn, currently suppressed by safety training.",
              explain:
                "Nothing in the result supports this. The feature fires on text *about* treacherous turns — acquisition bait-and-switches, plea bargains, fiction. Representing a concept is not harboring an intention.",
            },
            {
              text: "Nothing, because feature interpretations from activations are purely correlational.",
              explain:
                "Too dismissive. These features were validated causally by clamping, and behavior changed as predicted. The evidence is real; it just supports a narrower claim than the scary reading.",
            },
            {
              text: "That Sonnet's training data was inadequately filtered.",
              explain:
                "Understanding deception is necessary for a model to *detect* deception and to discuss it usefully. Filtering the concept out would produce a model less able to help with the safety problem, not a safer one.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              You raise the L1 coefficient and observe that a feature you trust
              still fires on the right tokens, but its activation values drop by
              30%. What happened?
            </>
          ),
          choices: [
            {
              text: "Shrinkage: the L1 penalty taxes every unit of activation, so optimal activations are biased downward by roughly λ/2 even when the feature is correctly identified.",
              correct: true,
              explain:
                "The soft-threshold solution a* = max(0, x − λ/2) makes the bias explicit and constant. This is why feature identity is far more trustworthy than feature magnitude, and why TopK and Gated SAEs were invented.",
            },
            {
              text: "The feature partially split, with the missing 30% going to a sibling feature.",
              explain:
                "Splitting is driven by dictionary width, not by λ. Raising λ at fixed width kills features outright rather than subdividing them.",
            },
            {
              text: "The encoder learned a worse direction, so the projection onto it is smaller.",
              explain:
                "Possible in principle, but the systematic, predictable 'everything shrinks by a constant' pattern is the signature of the L1 penalty itself, not of a degraded direction. Check whether the decoder direction actually moved before reaching for this.",
            },
            {
              text: "The activations were normalized differently between runs.",
              explain:
                "Worth ruling out as hygiene, but it would not produce the characteristic pattern of weak features dying entirely while strong ones shrink by a fixed offset.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              What is the &ldquo;dark matter&rdquo; problem, and why does it
              matter for using SAEs as a safety tool?
            </>
          ),
          choices: [
            {
              text: "The reconstruction residual x − x̂ is unexplained computation, and Engels et al. showed it contains predictable structure — so an audit based only on active features has a blind spot of known size and unknown content.",
              correct: true,
              explain:
                "Exactly the right worry. Anthropic's Sonnet SAEs explained at least 65% of variance, leaving up to a third unaccounted for, and the residual is not pure noise. 'I saw no deception features fire' is a much weaker statement than it sounds.",
            },
            {
              text: "Most dictionary entries are dead features that never fire, wasting capacity.",
              explain:
                "Dead features are a real training problem — 65% in the 34M run — but they are wasted capacity, not hidden computation. Dark matter is about what is missing from the reconstruction, not what is missing from the dictionary's usage.",
            },
            {
              text: "SAE features are not atomic, so the same computation can be described several ways.",
              explain:
                "That is the atomicity debate — feature splitting, absorption, and Leask et al.'s canonical-units critique. Related concern, different problem: atomicity is about carving, dark matter is about coverage.",
            },
            {
              text: "SAEs trained on one layer cannot see features that live in other layers.",
              explain:
                "That is cross-layer superposition, which Anthropic also flag as fundamental and which motivated cross-layer transcoders. It contributes to the residual but is not what 'dark matter' names.",
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
          Two Anthropic papers carry this module. Read them in order — the 2023
          one teaches you the method on a model small enough to fully understand,
          the 2024 one shows what it buys on a model you actually use.
        </p>
      ),
      readings: [
        {
          title:
            "Towards Monosemanticity: Decomposing Language Models With Dictionary Learning",
          authors: "Bricken, Templeton, Batson, Chen, Jermyn, et al. (Anthropic)",
          year: 2023,
          url: "https://transformer-circuits.pub/2023/monosemantic-features",
          kind: "paper",
          time: "3h, 2 sittings",
          essential: true,
          note: "Sitting 1: Problem Setup and Detailed Investigations of Individual Features — the Arabic-script feature walkthrough is the template for every feature analysis you will ever do, so follow its four moves (specificity, sensitivity, downstream effect, comparison to neurons). Sitting 2: Phenomenology, especially Feature Splitting, then the 'Advice for Training Sparse Autoencoders' appendix before you touch code. You can skip Finite State Automata on a first pass.",
        },
        {
          title:
            "Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet",
          authors: "Templeton, Conerly, Marcus, Lindsey, Bricken, et al. (Anthropic)",
          year: 2024,
          url: "https://transformer-circuits.pub/2024/scaling-monosemanticity",
          kind: "paper",
          time: "3h, 2 sittings",
          essential: true,
          note: "Read Safety-Relevant Features first — it is why this module exists, and the deception case study is the clearest published picture of what an interp-based audit could look like. Then Feature Survey (Exploring Feature Neighborhoods for splitting, Feature Completeness for how much is missing). Then read Discussion → Limitations twice: shrinkage, cross-layer superposition, and 'we are orders of magnitude short' are the three caveats you should be able to recite.",
        },
        {
          title: "Scaling and evaluating sparse autoencoders",
          authors: "Gao, Dupré la Tour, Tillman, Goh, Troll, Radford, Sutskever, et al. (OpenAI)",
          year: 2024,
          url: "https://arxiv.org/abs/2406.04093",
          kind: "paper",
          time: "1h (skim)",
          note: "Skim for two things: the TopK architecture (§2–3) and why fixing L0 directly removes both the λ-tuning problem and shrinkage; and the evaluation section, which is the field's most serious attempt to say what 'a good SAE' means beyond the loss. Skip the scaling-law fits unless you are training at scale.",
        },
        {
          title: "Sparse Autoencoders Find Highly Interpretable Features in Language Models",
          authors: "Cunningham, Ewart, Riggs, Huben & Sharkey",
          year: 2023,
          url: "https://arxiv.org/abs/2309.08600",
          kind: "paper",
          time: "45 min",
          note: "The independent, concurrent discovery — useful precisely because it is not from Anthropic. Read §4 for the causal evaluation: they show SAE features localize behavior better than neurons under intervention, which is the strongest early evidence the features are real.",
        },
        {
          title: "Decomposing the Dark Matter of Sparse Autoencoders",
          authors: "Engels, Riggs & Tegmark",
          year: 2024,
          url: "https://arxiv.org/abs/2410.14670",
          kind: "paper",
          time: "45 min",
          note: "Read this the moment you catch yourself trusting an SAE decomposition. It dissects the reconstruction residual and shows a substantial part of it is linearly predictable from the input — i.e. structure the dictionary missed, not noise. Figures 1–3 carry the argument.",
        },
        {
          title: "Golden Gate Claude",
          authors: "Anthropic",
          year: 2024,
          url: "https://www.anthropic.com/news/golden-gate-claude",
          kind: "blog",
          time: "10 min",
          note: "Short and worth it for the framing: the demo exists to make the causal claim tangible to non-specialists. Read it alongside the steering section of Scaling Monosemanticity, then hold the question 'what would a misuse of this look like?' — Module 5.1 answers it.",
        },
        {
          title: "Neuronpedia",
          authors: "Johnny Lin, Joseph Bloom, et al.",
          year: "ongoing",
          url: "https://www.neuronpedia.org/",
          kind: "tool",
          time: "reference",
          note: "The feature browser you will actually use: dashboards for public SAEs on GPT-2 small, Gemma 2 (Gemma Scope) and more, with activation histograms, top logits, autointerp explanations, and steering. Required for the explore problem; keep the tab open for the rest of Part 3 and 4.",
        },
      ],
    },
  ],
};

export default mod;
