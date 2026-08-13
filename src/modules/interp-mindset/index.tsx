import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { LogitLensTable } from "./LogitLensTable";
import { ProbeCausalityDemo } from "./ProbeCausalityDemo";

const mod: CourseModule = {
  id: "3.1",
  slug: "interp-mindset",
  title: "The Interp Mindset & Observational Tools",
  part: 3,
  tagline: "Features, circuits, and the discipline of causal evidence — plus logit lens and probes.",
  estMinutes: 150,
  objectives: [
      "Define features, circuits, and universality with examples",
      "Run logit lens and train a linear probe on activations",
      "Explain why a probe finding a direction doesn't prove the model uses it"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "what-is-interp",
      title: "Reverse-engineering a program nobody wrote",
      body: (
        <>
          <p>
            You now know how a transformer computes. That is not the same as
            knowing what any particular transformer <em>does</em>. Training wrote
            billions of numbers into the weights; those numbers implement
            algorithms; nobody chose those algorithms and nobody has read them.
            <strong> Mechanistic interpretability</strong> is the attempt to read
            them — to take a trained network and recover, in human terms, the
            program it is running.
          </p>
          <p>
            The framing that started the modern field comes from Olah et al.&apos;s{" "}
            <em>Zoom In</em>: a neural network is more like a compiled binary than
            like a statistical black box. It has structure. The structure has
            parts. The parts connect. And, crucially, the parts recur across
            models — which means there is a stable subject matter to study rather
            than a fresh mystery per checkpoint.
          </p>
          <Figure caption="Three claims that make mech interp a research program rather than a hobby. Each is empirical, each has counterexamples, and the third is the shakiest.">
            <svg
              viewBox="0 0 520 150"
              className="w-full max-w-[520px]"
              role="img"
              aria-label="Diagram of features composing into circuits, recurring across models"
            >
              {/* features */}
              <text x={10} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">
                features
              </text>
              {[0, 1, 2, 3].map((i) => (
                <circle
                  key={i}
                  cx={26 + i * 34}
                  cy={54}
                  r={11}
                  fill="var(--surface-2)"
                  stroke="var(--series-1)"
                  strokeWidth={1.6}
                />
              ))}
              <text x={10} y={92} fontSize={10} fill="var(--text-secondary)">
                directions in activation space
              </text>

              {/* circuit */}
              <text x={195} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">
                circuits
              </text>
              <circle cx={215} cy={40} r={10} fill="var(--surface-2)" stroke="var(--series-1)" strokeWidth={1.6} />
              <circle cx={215} cy={78} r={10} fill="var(--surface-2)" stroke="var(--series-1)" strokeWidth={1.6} />
              <circle cx={278} cy={59} r={10} fill="var(--surface-2)" stroke="var(--series-2)" strokeWidth={1.6} />
              <path d="M226,44 L268,56" stroke="var(--series-2)" strokeWidth={1.6} />
              <path d="M226,74 L268,63" stroke="var(--series-2)" strokeWidth={1.6} />
              <text x={195} y={110} fontSize={10} fill="var(--text-secondary)">
                weights connecting features
              </text>

              {/* universality */}
              <text x={370} y={16} fontSize={11} fill="var(--text-muted)" className="font-mono">
                universality
              </text>
              {[0, 1].map((r) =>
                [0, 1].map((c) => (
                  <g key={`${r}-${c}`}>
                    <rect
                      x={378 + c * 62}
                      y={30 + r * 40}
                      width={48}
                      height={28}
                      rx={5}
                      fill="var(--surface-2)"
                      stroke="var(--border-strong)"
                    />
                    <circle cx={402 + c * 62} cy={44 + r * 40} r={6} fill="var(--series-3)" />
                  </g>
                )),
              )}
              <text x={370} y={110} fontSize={10} fill="var(--text-secondary)">
                the same parts, different models
              </text>
            </svg>
          </Figure>
          <Term word="feature">
            A property of the input that the network represents — &ldquo;this text
            is in French&rdquo;, &ldquo;the current token is a closing
            bracket&rdquo;, &ldquo;the subject of the sentence is a person&rdquo;.
            The working hypothesis is that features are <em>directions</em> in
            activation space: a feature is present when the activation vector has
            a large component along some direction.
          </Term>
          <Term word="circuit">
            A subgraph of the network — specific features connected by specific
            weights — that implements a human-describable computation. The
            induction circuit in Module 3.2 is the canonical example: two
            attention heads in different layers that together implement
            &ldquo;repeat what followed this token last time&rdquo;.
          </Term>
          <Term word="motif / universality">
            A circuit shape that recurs. <em>Universality</em> is the conjecture
            that the same motifs appear across architectures, scales, and even
            across artificial and biological networks. Curve detectors in vision
            models are the strongest evidence; induction heads are the strongest
            evidence in language models. It is a conjecture, not a result — and
            the recent literature reports plenty of model-specific idiosyncrasy.
          </Term>
          <KeyIdea>
            The bet of mech interp is that models are <em>decomposable</em>: that
            behaviour comes from parts you can name, and that naming the parts
            lets you predict behaviour you have not observed. If the bet is
            wrong, interpretability degrades to a very fancy form of correlation
            hunting. Most of the difficulty in the rest of Part 3 comes from
            superposition, which is exactly the thing that makes decomposition
            hard.
          </KeyIdea>
          <p>
            It is worth being clear about what interp is <em>for</em>, because
            there is a competing tool that is cheaper and often better.{" "}
            <strong>Behavioural evaluations</strong> ask the model questions and
            grade the answers. They are the workhorse of AI safety today and they
            scale beautifully. But they only see what the model chooses to show
            you. Interp is the <strong>microscope</strong>: slower, narrower,
            higher resolution, and — this is the point — it looks at the
            mechanism rather than the output.
          </p>
          <Note kind="safety" title="Why the microscope earns its cost">
            Every failure mode that matters most is one where behaviour and
            mechanism come apart: a model that behaves well because it detects it
            is being tested, a backdoor that only fires on a trigger you did not
            think to try, a chain of thought that reads as honest reasoning while
            the answer was determined elsewhere. Evals cannot distinguish
            &ldquo;aligned&rdquo; from &ldquo;aligned on the distribution you
            sampled&rdquo;. That distinction is the whole reason this course
            exists, and Part 5 is where it gets cashed out.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "logit-lens",
      title: "The logit lens: reading an unfinished thought",
      body: (
        <>
          <p>
            Here is the cheapest observational tool in the field, and one of the
            most revealing. Recall from Module 1.3 that the residual stream is a
            running sum: every block <em>adds</em> to it, and the final
            unembedding <M>{String.raw`W_U`}</M> turns the last value into logits.
            Nothing stops you from applying <M>{String.raw`W_U`}</M> to the
            residual stream <em>early</em>.
          </p>
          <MB>{String.raw`\text{lens}_\ell = \mathrm{softmax}\big(W_U \cdot \mathrm{LN}_f(x_\ell)\big)`}</MB>
          <p>
            where <M>{String.raw`x_\ell`}</M> is the residual stream after layer{" "}
            <M>{String.raw`\ell`}</M> and <M>{String.raw`\mathrm{LN}_f`}</M> is
            the model&apos;s final layer norm. That is the whole method. It works
            because the residual stream keeps one basis from start to finish — the
            vector after layer 4 lives in the same coordinate system as the vector
            the unembedding was trained on.
          </p>
          <Figure caption="The logit lens taps the residual stream at every depth with the model's own output head. Nothing is retrained; you are just asking 'if the model had to answer now, what would it say?'">
            <svg
              viewBox="0 0 520 170"
              className="w-full max-w-[520px]"
              role="img"
              aria-label="Residual stream with the unembedding matrix applied at each layer"
            >
              <rect x={20} y={70} width={420} height={22} rx={5} fill="var(--surface-2)" />
              <text x={20} y={62} fontSize={10} fill="var(--text-muted)" className="font-mono">
                residual stream
              </text>
              {[0, 1, 2, 3, 4].map((i) => {
                const x = 60 + i * 84;
                return (
                  <g key={i}>
                    <rect x={x - 18} y={112} width={36} height={24} rx={4} fill="var(--surface-1)" stroke="var(--series-1)" />
                    <text x={x} y={128} fontSize={10} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
                      blk {i}
                    </text>
                    <path d={`M${x},112 L${x},94`} stroke="var(--series-1)" strokeWidth={1.5} />
                    <path
                      d={`M${x + 22},70 L${x + 22},40`}
                      stroke="var(--series-2)"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <rect x={x + 6} y={18} width={34} height={20} rx={4} fill="var(--surface-1)" stroke="var(--series-2)" />
                    <text x={x + 23} y={32} fontSize={9} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
                      W_U
                    </text>
                  </g>
                );
              })}
              <text x={460} y={84} fontSize={10} fill="var(--text-muted)" className="font-mono">
                → logits
              </text>
              <text x={280} y={158} fontSize={10} fill="var(--text-muted)">
                each tap gives a full distribution over the vocabulary
              </text>
            </svg>
          </Figure>
          <p>
            nostalgebraist reported the result in 2020 and it has held up: the
            model&apos;s prediction does not appear at the end. It{" "}
            <strong>crystallizes</strong>. Early layers unembed to near-copies of
            the current token. Middle layers commit to a syntactic category.
            Somewhere around two-thirds depth the actual answer arrives, often in
            one or two layers. The rest of the network mostly sharpens a decision
            already made.
          </p>
          <KeyIdea>
            The logit lens converts a static weight dump into a{" "}
            <em>timeline</em>. Instead of &ldquo;the model knows Paris&rdquo; you
            get &ldquo;the model knows Paris by layer 8, and layers 9–12 only add
            confidence&rdquo; — a claim precise enough to test, and a pointer to
            exactly where in the network to go looking.
          </KeyIdea>
          <Note kind="warning" title="The lens is not neutral">
            Applying <M>{String.raw`W_U`}</M> to an intermediate state assumes
            that state is already written in the output basis. Often it is not:
            later layers may expect a systematically rotated or rescaled input,
            so the raw lens can look like nonsense in models where it happens not
            to work (GPT-Neo is the standard example). The{" "}
            <strong>tuned lens</strong> of Belrose et al. fixes this by learning a
            small affine map per layer before unembedding — better calibrated,
            fewer artifacts, but now you are reading a probe you trained rather
            than the model&apos;s own head. Both readings are{" "}
            <em>correlational</em>. Neither shows the model uses what you see.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "probes-and-causality",
      title: "Probes, and the discipline that keeps you honest",
      body: (
        <>
          <p>
            The other standard observational tool: cache activations at some
            layer, label each one with a property you care about, and fit a{" "}
            <strong>linear probe</strong> — usually logistic regression — from
            activation to label.
          </p>
          <MB>{String.raw`\hat{y} = \sigma\big(w^\top a + b\big), \qquad a \in \mathbb{R}^{d_{\text{model}}}`}</MB>
          <p>
            If the probe gets high accuracy, the property is{" "}
            <strong>linearly decodable</strong> from the activation. That is a
            real, non-trivial finding: probes have found board state in a
            game-playing transformer, truthfulness-correlated directions,
            sentiment, syntactic role, and the geometry of numbers and time. It
            is also much less than it sounds like.
          </p>
          <KeyIdea>
            A probe tells you the information is <em>there</em>. It says nothing
            about whether the model <em>uses</em> it. Those are different claims
            and they need different evidence.
          </KeyIdea>
          <p>
            Three ways a probe can mislead you, in increasing order of
            embarrassment:
          </p>
          <ul>
            <li>
              <strong>The probe learned the task.</strong> A high-capacity probe
              on high-dimensional activations can fit labels that the model never
              represented. Random-vector baselines and control tasks exist for
              this reason.
            </li>
            <li>
              <strong>The information is present but unread.</strong> The
              residual stream carries far more than any given layer consumes.
              Something can be decodable and causally inert.
            </li>
            <li>
              <strong>The direction is right but the probe&apos;s is not.</strong>{" "}
              Two directions can both correlate with the property while only one
              feeds the computation. The probe optimizes for decoding accuracy, so
              it happily picks the wrong one. This is the case the widget below
              constructs, and it is the one people actually get wrong in practice.
            </li>
          </ul>
          <Term word="correlational evidence">
            &ldquo;When the model does X, this activation pattern is present.&rdquo;
            Produced by looking: logit lens, probes, activation statistics,
            max-activating examples, attention-pattern eyeballing.
          </Term>
          <Term word="causal evidence">
            &ldquo;When I change this activation, the behaviour changes in the
            predicted way.&rdquo; Produced by intervening: ablation, activation
            patching, path patching, steering. Module 3.5 is entirely about doing
            this rigorously.
          </Term>
          <p>
            The move that converts one into the other is always the same:{" "}
            <strong>intervene</strong>. Add <M>{String.raw`\lambda w`}</M> to the
            activation and see whether behaviour moves. Zero out the component
            along <M>w</M> and see whether behaviour breaks. If the model&apos;s
            output does not care, then whatever you found is a readout, not a
            mechanism.
          </p>
          <Note kind="safety" title="Why this discipline is a safety issue">
            The tempting application of probes is a lie detector: train a probe on
            &ldquo;the model is being deceptive&rdquo;, then monitor it in
            production. If the probe is correlational, an optimizer that pushes
            against it — RLHF, or the model itself if it can model the monitor —
            can move the activation off the probe&apos;s direction while leaving
            the mechanism untouched. You would see the probe go quiet and conclude
            you had fixed something. Interventional validation is not
            methodological fussiness here; it is the difference between a monitor
            and a placebo.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Look, then intervene",
      body: (
        <>
          <p>
            Two toys, in the order the field learned them. The first is pure
            observation: watch a prediction assemble itself across depth. The
            second is why observation is not enough — a probe that reads a
            property beautifully and points in a direction the model does not use.
          </p>
          <LogitLensTable />
          <ProbeCausalityDemo />
          <p>
            Things to try: (1) In the lens, hit <em>Play through depth</em> and
            watch <em>which</em> tokens are competing at each stage — the
            category (&ldquo;a famous city&rdquo;) shows up several layers before
            the answer, which is a hint about how factual recall is organized. (2)
            In the probe demo, push λ to −2.5 along the probe direction: the probe
            goes from 50% positive to about 1%, while the model&apos;s output
            barely moves. You have fooled the monitor without touching the model.
            (3) Reveal the causal direction and push the same distance: now the
            probe reading does not move at all (its boundary is perpendicular to
            your push) while the model flips every positive example. A perfect
            double dissociation — and note the flip rate tops out near 50%,
            because the other half of the examples were already negative.
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
          The first two are quick and clarify the vocabulary. The code problems
          are your first real TransformerLens session — install it once here and
          you will reuse the setup for the rest of Part 3.
        </p>
      ),
      problems: [
        {
          id: "feature-or-not",
          kind: "pencil",
          title: "Is that a feature?",
          prompt: (
            <>
              <p>
                For each of the following, say whether it is best described as a{" "}
                <em>feature</em>, a <em>circuit</em>, or neither, and why:
              </p>
              <ol>
                <li>Neuron 373 in layer 6 fires on French text.</li>
                <li>
                  The model attends from a pronoun back to the name it refers to,
                  then copies that name into the output.
                </li>
                <li>The model achieves 32% accuracy on GSM8K.</li>
                <li>
                  A direction in layer 8 whose presence predicts that the next
                  token is a closing bracket.
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              Features are properties of the input that get <em>represented</em>;
              circuits are compositions of features connected by weights that
              <em> do</em> something. Ask: is this a noun or a verb?
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>1 — candidate feature, with a caveat.</strong> &ldquo;Is
                French&rdquo; is a property of the input, so it is feature-shaped.
                But a neuron is not a feature: the neuron may be{" "}
                <em>polysemantic</em>, firing on French text <em>and</em> on
                chemistry notation <em>and</em> on something else, because of
                superposition (Module 3.3). The correct claim is &ldquo;a
                direction that includes neuron 373&rdquo;.
              </p>
              <p>
                <strong>2 — circuit.</strong> Two operations composed: an
                attention head that moves information (&ldquo;where&rdquo;) and a
                copying operation (&ldquo;what&rdquo;). This is roughly the
                name-mover part of the IOI circuit you will build in Module 3.5.
              </p>
              <p>
                <strong>3 — neither.</strong> It is a behavioural evaluation. It
                is a fact about the model, and a useful one, but it names no
                internal part and predicts nothing about mechanism.
              </p>
              <p>
                <strong>4 — feature.</strong> Stated the right way: a property of
                the input, identified with a direction rather than a neuron. Note
                that as stated it is still only a correlational claim; to promote
                it you would ablate the direction and check that bracket
                prediction degrades.
              </p>
            </>
          ),
        },
        {
          id: "lens-reading",
          kind: "pencil",
          title: "Reading a lens plot",
          prompt: (
            <p>
              A logit lens on a 24-layer model shows the correct answer at rank 1
              from layer 14 onward, with probability rising 0.09 → 0.11 → 0.14 →
              … → 0.72 by layer 24. A colleague concludes: &ldquo;the fact is
              retrieved at layer 14.&rdquo; Give two distinct reasons that
              conclusion might be wrong, and describe one intervention that would
              raise your confidence.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Reason 1 — the lens can lag the model.</strong> The raw
                lens assumes intermediate states are already in the output basis.
                If layer 12 wrote the answer in a rotated basis that later layers
                correct, the lens will only &ldquo;see&rdquo; it once the rotation
                is undone. A tuned lens often moves the apparent onset several
                layers earlier.
              </p>
              <p>
                <strong>Reason 2 — rank 1 is a weak threshold.</strong> At 9%
                probability the answer is barely ahead of its competitors; a
                slightly different prompt could reorder them. &ldquo;Retrieval&rdquo;
                should be defined by a jump in probability or logit, not by
                crossing rank 1, and here the biggest jumps are elsewhere in the
                curve.
              </p>
              <p>
                <strong>Intervention.</strong> Patch the layer-14 residual stream
                (at the final token) from a run on a corrupted prompt into the
                clean run, and measure how much the answer logit drops. If layer
                14 really is where the fact lands, patching there should destroy
                the answer while patching at layer 13 should not. That is
                activation patching, and it is causal — Module 3.5.
              </p>
            </>
          ),
        },
        {
          id: "logit-lens-code",
          kind: "code",
          title: "Logit lens in TransformerLens",
          prompt: (
            <>
              <p>
                In a Colab notebook, install{" "}
                <code>transformer_lens</code> and load{" "}
                <code>gpt2-small</code>. Run{" "}
                <code>
                  logits, cache = model.run_with_cache(&quot;The Eiffel Tower is
                  in the city of&quot;)
                </code>
                . For each layer <code>L</code>, take{" "}
                <code>cache[&quot;resid_post&quot;, L]</code> at the final
                position, apply <code>model.ln_final</code>, then{" "}
                <code>model.unembed</code>, and record the top-5 tokens and the
                probability of <code>&quot; Paris&quot;</code>.
              </p>
              <p>
                Success check: you produce a 13-row table like the widget above,
                and the probability of <code>&quot; Paris&quot;</code> rises
                monotonically over the last third of the network. Then repeat for
                two prompts of your own — one factual, one syntactic (e.g. a
                bracket-closing prompt) — and compare where the answer appears.
              </p>
            </>
          ),
          hint: (
            <p>
              TransformerLens has{" "}
              <code>cache.apply_ln_to_stack(...)</code> and{" "}
              <code>cache.accumulated_resid(layer=None, incl_mid=True,
              apply_ln=True)</code>, which does the whole stack for you in one
              call. Do it the manual way once so you know what it is doing, then
              use the helper.
            </p>
          ),
          solution: (
            <>
              <p>Skeleton:</p>
              <pre>
                <code>{`from transformer_lens import HookedTransformer
import torch

model = HookedTransformer.from_pretrained("gpt2-small")
prompt = "The Eiffel Tower is in the city of"
target = model.to_single_token(" Paris")
logits, cache = model.run_with_cache(prompt)

resid, labels = cache.accumulated_resid(
    layer=-1, incl_mid=False, pos_slice=-1, return_labels=True
)
resid = cache.apply_ln_to_stack(resid, layer=-1, pos_slice=-1)
lens_logits = resid @ model.W_U            # [n_layers+1, d_vocab]
probs = lens_logits.softmax(dim=-1)

for lbl, p in zip(labels, probs):
    top = p.topk(5)
    print(lbl,
          [model.to_string(t) for t in top.indices],
          f"P(Paris)={p[target]:.4f}",
          f"rank={(p > p[target]).sum().item() + 1}")`}</code>
              </pre>
              <p>
                What you should see: the embedding row is dominated by the current
                token, mid layers by determiners, and <code>&quot; Paris&quot;</code>{" "}
                climbing sharply somewhere around layers 7–10. The syntactic
                prompt will resolve <em>much</em> earlier than the factual one —
                closing a bracket needs local information that is available almost
                immediately, while a fact needs a look-up that mid-depth MLPs
                perform. That contrast is the real lesson of the exercise.
              </p>
            </>
          ),
        },
        {
          id: "probe-code",
          kind: "code",
          title: "Train a probe, then try to break it",
          prompt: (
            <>
              <p>
                Build a dataset of ~400 short prompts labelled by a simple binary
                property (suggestion: the prompt is about a person vs about a
                place). Cache <code>resid_post</code> at layer 6 of{" "}
                <code>gpt2-small</code> at the final token. Fit{" "}
                <code>sklearn.linear_model.LogisticRegression</code> and report
                held-out accuracy.
              </p>
              <p>
                Then run the control: shuffle the labels and refit. Then run the
                causal test: take the learned direction <code>w</code>, normalize
                it, and use a TransformerLens hook to add{" "}
                <code>±3·w</code> to the layer-6 residual stream at every
                position. Measure how the model&apos;s output distribution
                changes.
              </p>
              <p>
                Success check: real accuracy &gt; 85%, shuffled accuracy ≈ 50%,
                and you can state — with numbers — whether steering along{" "}
                <code>w</code> changed behaviour.
              </p>
            </>
          ),
          hint: (
            <p>
              The hook is{" "}
              <code>
                model.run_with_hooks(prompt, fwd_hooks=[(f&quot;blocks.6.hook_resid_post&quot;,
                fn)])
              </code>{" "}
              where <code>fn(act, hook)</code> returns{" "}
              <code>act + alpha * w</code>. Normalize <code>w</code> and scale
              alpha relative to the typical residual-stream norm at that layer
              (compute it — it is usually tens to hundreds), or your intervention
              will be far too small to matter.
            </p>
          ),
          solution: (
            <>
              <p>
                The expected outcome, and the point of the exercise: the probe
                will be accurate, the shuffled control will be at chance (so the
                probe is not just memorizing), and the steering result will be{" "}
                <em>partial</em> — some shift in outputs, far less than the probe
                accuracy would lead you to expect, and very sensitive to the scale
                of alpha.
              </p>
              <p>
                That gap is the finding. Write it down explicitly: &ldquo;a probe
                with 93% accuracy, whose direction changes model behaviour on X%
                of prompts at a magnitude of Y residual-stream norms.&rdquo; Both
                numbers belong in any claim you make about the direction. If you
                get a large behavioural effect, congratulations — you have a
                causally validated direction, which is what Module 5.1 calls a
                steering vector.
              </p>
              <p>
                Common bug: forgetting that the probe direction lives in the
                pre-LayerNorm basis. LayerNorm removes the mean and rescales, so
                the component of <code>w</code> along the all-ones vector does
                nothing. Project it out before steering.
              </p>
            </>
          ),
        },
        {
          id: "construct-counterexample",
          kind: "code",
          title: "Build the counterexample yourself",
          prompt: (
            <>
              <p>
                Reproduce the widget from scratch in NumPy, without a
                transformer. Define a toy &ldquo;model&rdquo; whose output is{" "}
                <code>sign(a · v)</code> for a fixed direction <code>v</code>.
                Generate two classes of activations so that (i) both coordinates
                separate the classes, and (ii) the optimal linear probe direction
                is orthogonal to <code>v</code>.
              </p>
              <p>
                Success check: your probe reaches &gt;95% accuracy, and shifting
                every activation by <code>2·w</code> (the probe direction)
                changes the model&apos;s output on &lt;10% of points, while
                shifting by <code>2·v</code> changes it on ~50%.
              </p>
            </>
          ),
          hint: (
            <p>
              The optimal linear discriminant direction is{" "}
              <M>{String.raw`\Sigma^{-1}(\mu_+ - \mu_-)`}</M>, not{" "}
              <M>{String.raw`\mu_+ - \mu_-`}</M>. Choose the within-class
              covariance <M>{String.raw`\Sigma`}</M> first, then pick the mean
              difference to be <M>{String.raw`\Sigma w`}</M> for whatever{" "}
              <M>w</M> you want the probe to find.
            </p>
          ),
          solution: (
            <>
              <p>
                Work backwards from the identity. You want the probe to find{" "}
                <M>{String.raw`w = (1,0)`}</M> and the model to read{" "}
                <M>{String.raw`v = (0,1)`}</M>. Since the probe converges to{" "}
                <M>{String.raw`\Sigma^{-1}\Delta\mu`}</M>, set{" "}
                <M>{String.raw`\Delta\mu = \Sigma w`}</M>:
              </p>
              <MB>{String.raw`\Sigma = \begin{pmatrix} \sigma_a^2 & \rho\sigma_a\sigma_b \\ \rho\sigma_a\sigma_b & \sigma_b^2\end{pmatrix}, \quad \Delta\mu = \Sigma \begin{pmatrix}1\\0\end{pmatrix} = \begin{pmatrix}\sigma_a^2 \\ \rho\sigma_a\sigma_b\end{pmatrix}`}</MB>
              <p>
                With <M>{String.raw`\sigma_a = 0.5,\ \sigma_b = 0.35,\ \rho =
                0.714`}</M> this gives a mean difference proportional to{" "}
                <M>{String.raw`(2, 1)`}</M> — so put the class means at{" "}
                <M>{String.raw`\pm(1.0,\,0.5)`}</M>. Both coordinates now separate
                the classes (the second one at{" "}
                <M>{String.raw`0.5/0.35 \approx 1.4`}</M> standard deviations),
                yet the optimal probe is exactly horizontal.
              </p>
              <p>
                The mechanism worth internalizing: the within-class correlation
                lets the probe use coordinate <M>a</M> to <em>predict and cancel</em>{" "}
                the class-relevant part of coordinate <M>b</M>. The probe is not
                being stupid — it is being optimal for decoding, and decoding is
                simply not the objective you cared about. Fit the probe with no or
                very light L2; a strong penalty pulls the solution back toward{" "}
                <M>{String.raw`\Delta\mu`}</M> and the effect disappears.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia-explore",
          kind: "explore",
          title: "A first pass through Neuronpedia",
          prompt: (
            <>
              <p>
                Open{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  neuronpedia.org
                </a>{" "}
                and pick any GPT-2 small SAE feature that looks interpretable from
                its top activating examples. Write down, in one sentence, what you
                think it detects.
              </p>
              <p>
                Now look for evidence <em>against</em> your sentence: scroll to the
                weaker activations, check the negative logit effects, and see
                whether the feature fires on things your description does not
                cover. Then write down what kind of experiment would settle it.
              </p>
            </>
          ),
          hint: (
            <p>
              Max-activating examples are the most seductive correlational
              evidence in the field. A feature that fires on the top 20 examples
              of &ldquo;X&rdquo; may fire on &ldquo;X or Y or Z&rdquo; across the
              whole distribution.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should have noticed: the top examples almost always
                support a clean story, and the story almost always gets muddier by
                the time you reach the 50th-percentile activations. This is
                selection bias, not a defect of the feature — you are looking at
                the tail of a distribution and inferring the whole.
              </p>
              <p>
                The experiment that settles it is causal and comes in two halves.{" "}
                <em>Necessity:</em> ablate the feature and check the model loses
                the behaviour you attributed to it. <em>Sufficiency:</em> clamp
                the feature high on inputs where it is normally off and check the
                behaviour appears. Neuronpedia&apos;s steering interface does the
                second half for you. You will meet both halves properly in
                Modules 3.4 and 3.5.
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
              A linear probe on layer 10 activations predicts &ldquo;the model is
              about to refuse&rdquo; with 96% accuracy. What have you established?
            </>
          ),
          choices: [
            {
              text: "That refusal-relevant information is linearly decodable at layer 10.",
              correct: true,
              explain:
                "This is exactly the claim a probe supports, and no more. Decodability is a fact about the representation, not about the computation that follows it.",
            },
            {
              text: "That the model computes its refusal decision at layer 10.",
              explain:
                "The information could have been written much earlier and merely still be present, or it could be a downstream shadow of a decision made elsewhere. Probes have no notion of where a computation happens.",
            },
            {
              text: "That ablating the probe direction will stop refusals.",
              explain:
                "Tempting, and sometimes true — but it is a causal claim that requires the ablation experiment. The widget in this module is a case where exactly this inference fails.",
            },
            {
              text: "That there is a single refusal neuron near layer 10.",
              explain:
                "A probe finds a direction, which is generally a combination of many neurons. Superposition (Module 3.3) makes the one-neuron-one-concept picture the exception rather than the rule.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              Why can the logit lens be applied at every layer without retraining
              anything?
            </>
          ),
          choices: [
            {
              text: "Because the residual stream keeps a single basis from embedding to unembedding, so intermediate states are already (approximately) in the output coordinate system.",
              correct: true,
              explain:
                "The stream is a running sum that every block adds into, so the vector after layer 4 lives in the same space the unembedding was trained on. 'Approximately' is doing real work here — that gap is what the tuned lens fixes.",
            },
            {
              text: "Because every layer is trained with its own auxiliary output head.",
              explain:
                "That describes deep supervision, which standard transformers do not use. The lens works despite there being no per-layer head, which is what makes the result interesting.",
            },
            {
              text: "Because attention patterns are the same at every layer.",
              explain:
                "They are not, and the lens does not depend on attention at all — it reads the residual stream, whatever produced it.",
            },
            {
              text: "Because softmax is scale-invariant, so any vector produces a valid distribution.",
              explain:
                "Softmax will indeed turn any vector into a distribution, but that alone would make the lens meaningless noise. It is meaningful only because the intermediate vector is in the right basis.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              In the probe widget, pushing every activation along the probe
              direction collapses the probe&apos;s readout but leaves behaviour
              nearly unchanged. What does that demonstrate?
            </>
          ),
          choices: [
            {
              text: "The probe direction is a readout that correlates with the property, not the direction the model's computation depends on.",
              correct: true,
              explain:
                "The double dissociation is the whole point: you can move the probe without moving the model, and (once revealed) move the model without moving the probe. Only the intervention could tell you which is which.",
            },
            {
              text: "The probe was undertrained.",
              explain:
                "It reaches ~98% accuracy, better than the model's own behaviour on the same examples. It is an excellent probe. Being an excellent probe is simply not the same as being a causal direction.",
            },
            {
              text: "The intervention magnitude was too small.",
              explain:
                "The same magnitude along the causal direction flips essentially every positive example. Magnitude is controlled for; direction is the variable.",
            },
            {
              text: "Linear probes cannot find causal directions in principle.",
              explain:
                "Too strong. Probes often do find causal directions — that is how many steering vectors are born. The lesson is that you cannot know which case you are in without intervening.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              Which of these is the best statement of the universality hypothesis?
            </>
          ),
          choices: [
            {
              text: "Analogous features and circuits tend to recur across different models, architectures, and training runs.",
              correct: true,
              explain:
                "This is Olah et al.'s formulation, and it is what makes the field cumulative — if every model were unique, nothing you learn about one would transfer. Curve detectors and induction heads are the strongest supporting evidence.",
            },
            {
              text: "Any sufficiently large model can approximate any function.",
              explain:
                "That is the universal approximation theorem — a statement about expressivity, not about which solutions training actually finds. Universality in interp is an empirical claim about learned structure.",
            },
            {
              text: "Every feature is represented by exactly one neuron.",
              explain:
                "That is the (mostly false) privileged-basis or 'grandmother neuron' picture. Superposition is precisely the reason it fails.",
            },
            {
              text: "All models trained on the same data converge to identical weights.",
              explain:
                "Far too strong — weights differ wildly across seeds. Universality claims that recognizable motifs recur, not that parameters match.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              A behavioural eval shows a model never produces harmful outputs
              across 10,000 red-team prompts. What is the strongest thing an
              interpretability microscope could add?
            </>
          ),
          choices: [
            {
              text: "Evidence about whether the model is safe because of its values or because it recognized the test distribution.",
              correct: true,
              explain:
                "This is exactly the gap evals cannot close: they observe outputs on a sampled distribution, and 'aligned' and 'aligned when observed' produce identical outputs there. Mechanism can distinguish them; behaviour cannot.",
            },
            {
              text: "A more reliable estimate of the harmful-output rate.",
              explain:
                "Rate estimation is what evals are good at, and interp is far worse at it. Using a microscope to measure a rate is using the wrong instrument.",
            },
            {
              text: "Proof that no prompt exists that elicits harm.",
              explain:
                "No current method proves anything about all possible inputs. Interp raises or lowers your credence; it does not produce guarantees.",
            },
            {
              text: "A faster red-teaming pipeline.",
              explain:
                "Interp is slower and narrower than automated red-teaming, not faster. Its value is resolution on mechanism, and paying for that in speed is the trade.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              The tuned lens learns a small affine map per layer before applying
              the unembedding. What is the cost of that improvement?
            </>
          ),
          choices: [
            {
              text: "You are now reading a transformation you trained, so some of what you see is a property of your fitted map rather than of the model.",
              correct: true,
              explain:
                "Fitting anything adds a degree of freedom that can absorb structure. The tuned lens is better calibrated and less prone to artifacts, but 'the model believed X at layer 8' becomes a claim about model-plus-lens.",
            },
            {
              text: "It requires retraining the base model.",
              explain:
                "It does not — the base model is frozen and only a small per-layer map is fit, which is what makes it cheap.",
            },
            {
              text: "It only works on models with tied embeddings.",
              explain:
                "The raw logit lens benefits from tied embeddings; the tuned lens was introduced partly to work on models where the raw lens fails, including untied ones.",
            },
            {
              text: "It gives causal rather than correlational evidence, which is harder to interpret.",
              explain:
                "It gives correlational evidence, same as the raw lens. Neither lens intervenes on anything, which is the point the module keeps hammering.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              You want to argue that a direction <M>w</M> in layer 8 is the
              model&apos;s representation of &ldquo;the subject is plural&rdquo;.
              Which single piece of evidence is worth the most?
            </>
          ),
          choices: [
            {
              text: "Adding w to the layer-8 activation on singular-subject prompts makes the model produce plural verb agreement.",
              correct: true,
              explain:
                "This is a sufficiency intervention: you changed the activation and got the predicted behavioural change. Pair it with an ablation for necessity and you have a genuinely causal claim.",
            },
            {
              text: "A probe for plurality trained on layer 8 gets 99% accuracy in direction w.",
              explain:
                "Strong correlational evidence and a fine starting point — but the whole module is about why 99% decoding accuracy does not establish use.",
            },
            {
              text: "The 20 examples that maximize the component along w are all plural subjects.",
              explain:
                "Max-activating examples are the weakest common evidence: you are looking at the extreme tail and inferring the whole distribution. Check the middle of the distribution before you believe it.",
            },
            {
              text: "The cosine similarity between w and the embedding of the token ' are' is high.",
              explain:
                "Suggestive, and cheap to compute, but a similarity between two vectors says nothing about whether the model's forward pass routes information through w.",
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
          <em>Zoom In</em> is the field&apos;s founding document and worth your
          full attention. The logit lens post is short and you should read it
          before the problem set. Keep Nanda&apos;s glossary open for the whole of
          Part 3.
        </p>
      ),
      readings: [
        {
          title: "Zoom In: An Introduction to Circuits",
          authors: "Chris Olah, Nick Cammarata, Ludwig Schubert, Gabriel Goh, Michael Petrov, Shan Carter (Distill)",
          year: 2020,
          url: "https://distill.pub/2020/circuits/zoom-in/",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The three claims — features, circuits, universality — stated as speculative empirical claims with evidence for each. Read the whole thing; it is short and beautifully illustrated. Pay special attention to the curve-detector case study: it is the template for what 'we understand this circuit' should mean, and the standard it sets is higher than most later work meets.",
        },
        {
          title: "interpreting GPT: the logit lens",
          authors: "nostalgebraist",
          year: 2020,
          url: "https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens",
          kind: "blog",
          time: "30 min",
          essential: true,
          note: "The original post. Read it for the plots, not the prose — the striking result is how early the prediction stabilizes and how much of the network is spent sharpening rather than deciding. Note the author's own hedging about what the lens does and does not show; it has aged better than most of the follow-up hype.",
        },
        {
          title: "A Comprehensive Mechanistic Interpretability Explainer & Glossary",
          authors: "Neel Nanda",
          year: 2022,
          url: "https://www.neelnanda.io/mechanistic-interpretability/glossary",
          kind: "blog",
          time: "reference",
          essential: true,
          note: "Not a read-through — a lookup table for the rest of Part 3. When a paper uses 'OV circuit', 'ablation', 'privileged basis', or 'direct logit attribution' without defining it, come here. Skim the table of contents once now so you know what is in it.",
        },
        {
          title: "Eliciting Latent Predictions from Transformers with the Tuned Lens",
          authors: "Nora Belrose, Zach Furman, Logan Smith, Danny Halawi, Igor Ostrovsky, Lev McKinney, Stella Biderman, Jacob Steinhardt",
          year: 2023,
          url: "https://arxiv.org/abs/2303.08112",
          kind: "paper",
          time: "45 min",
          note: "Read §1–3 and the figures. The important content for you is the diagnosis of why the raw lens fails on some models, and the honest accounting of what you give up by fitting a per-layer map. Skip the causal-basis-extraction section on a first pass.",
        },
        {
          title: "Probing Classifiers: Promises, Shortcomings, and Advances",
          authors: "Yonatan Belinkov",
          year: 2022,
          url: "https://arxiv.org/abs/2102.12452",
          kind: "paper",
          time: "40 min",
          note: "A survey from NLP, written before mech interp adopted probes wholesale, and it already contains every warning the field later rediscovered. Read §3 (what probes can show) and §4 (control tasks and baselines). If you only take one thing: always report a random-label control.",
        },
        {
          title: "Amnesic Probing: Behavioral Explanation with Amnesic Counterfactuals",
          authors: "Yanai Elazar, Shauli Ravfogel, Alon Jacovi, Yoav Goldberg",
          year: 2021,
          url: "https://arxiv.org/abs/2006.00995",
          kind: "paper",
          time: "40 min",
          note: "The cleanest early demonstration that probe accuracy and causal relevance come apart: they remove a property from the representation and measure whether behaviour degrades. Read the introduction and the results tables. This is the paper to cite when someone over-claims from a probe.",
        },
        {
          title: "Neuronpedia",
          authors: "Johnny Lin, Joseph Bloom and contributors",
          year: "ongoing",
          url: "https://www.neuronpedia.org/",
          kind: "tool",
          time: "30 min of poking",
          note: "Browse it now with the module's explore problem in hand, and come back to it seriously in Module 3.4. Treat every feature label you read there as a hypothesis someone wrote after looking at max-activating examples — because that is exactly what it is.",
        },
      ],
    },
  ],
};

export default mod;
