import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { PatchingSandbox } from "./PatchingSandbox";
import { IoiCircuitMap } from "./IoiCircuitMap";

const mod: CourseModule = {
  id: "3.5",
  slug: "causal-methods",
  title: "Causal Methods: Patching & Circuit Discovery",
  part: 3,
  tagline:
    "Ablation, activation patching, attribution patching — and the IOI circuit as the worked example.",
  estMinutes: 240,
  objectives: [
    "Choose the right intervention (ablate/patch/path-patch) for a question",
    "Explain the IOI circuit's name movers and S-inhibition heads",
    "Replicate an activation-patching experiment in TransformerLens",
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "interventions",
      title: "Looking is not enough",
      body: (
        <>
          <p>
            Everything so far has been observational. Logit lens shows you what a
            layer predicts. A probe shows you that a direction{" "}
            <em>encodes</em> a property. An SAE shows you a feature{" "}
            <em>fires</em> on a concept. None of that establishes that the model
            uses any of it.
          </p>
          <p>
            This is not pedantry. You can train a probe to 95% accuracy on a
            direction the model provably never reads — the information is there,
            sitting in the residual stream, and nothing downstream touches it.
            Interpretability&apos;s central epistemic discipline is the habit of
            asking, about every claim: <strong>is this correlational or
            causal?</strong>
          </p>
          <KeyIdea>
            The only way to establish that a component matters is to{" "}
            <strong>change it and see what happens</strong>. Every method in this
            module is a variation on one move: replace an activation with
            something else, rerun the rest of the forward pass, and measure the
            damage.
          </KeyIdea>
          <p>
            The variations differ in what you replace the activation{" "}
            <em>with</em>, and the choice is not innocent.
          </p>
          <Term word="zero ablation">
            Set the activation to zero. Simple, and usually wrong: zero is not a
            neutral value. A model whose activations all sit far from the origin
            is thrown off-distribution by zeroing anything, and the damage you
            measure is partly the damage of being somewhere the model has never
            been.
          </Term>
          <Term word="mean ablation">
            Replace with the activation&apos;s mean over some distribution.
            Better — you stay near the data manifold, and you delete the
            component&apos;s <em>variation</em> rather than its existence. The
            choice of distribution to average over is a real modelling decision:
            mean over all text, or mean over your task&apos;s prompts, answer
            different questions.
          </Term>
          <Term word="resample ablation">
            Replace with the activation from a different input, sampled from a
            distribution where the property you care about differs. This keeps
            everything on-distribution and asks the sharpest question: does this
            component carry <em>this specific information</em>, or just any
            plausible activation?
          </Term>
          <Figure caption="The same intervention site, three replacement values. Each answers a different question, and a component can look essential under one and irrelevant under another.">
            <svg
              viewBox="0 0 460 130"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Zero, mean and resample ablation compared"
            >
              {[
                { y: 20, label: "zero", sub: "off-distribution", vals: [0, 0, 0, 0, 0, 0] },
                { y: 58, label: "mean", sub: "on-distribution, no variation", vals: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
                { y: 96, label: "resample", sub: "from another prompt", vals: [0.8, 0.2, 0.65, 0.9, 0.35, 0.55] },
              ].map((row) => (
                <g key={row.label}>
                  <text x={8} y={row.y + 12} fontSize={11} className="font-mono" fill="var(--text-primary)">
                    {row.label}
                  </text>
                  {row.vals.map((v, i) => (
                    <g key={i}>
                      <rect x={90 + i * 26} y={row.y} width={20} height={18} rx={3} fill="var(--surface-2)" />
                      <rect
                        x={90 + i * 26}
                        y={row.y + 18 - Math.max(v * 18, 1)}
                        width={20}
                        height={Math.max(v * 18, 1)}
                        rx={2}
                        fill="var(--series-1)"
                      />
                    </g>
                  ))}
                  <text x={260} y={row.y + 12} fontSize={10} fill="var(--text-muted)">
                    {row.sub}
                  </text>
                </g>
              ))}
            </svg>
          </Figure>
          <Note kind="warning">
            An ablation result is always relative to its baseline. &ldquo;Head
            9.9 is essential&rdquo; is not a fact about the model; it is a fact
            about the model, the task, the metric, <em>and</em> the thing you
            replaced head 9.9 with. Papers that do not state their baseline are
            not reporting a result.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "patching",
      title: "Activation patching: two directions, two questions",
      body: (
        <>
          <p>
            <strong>Activation patching</strong> is resample ablation with the
            resampling distribution chosen surgically. You build a{" "}
            <strong>clean</strong> prompt and a <strong>corrupted</strong> one
            that differ in exactly the property you are studying, run both,
            splice one activation from one run into the other, and measure the
            output.
          </p>
          <p>
            Because the two prompts differ in one controlled way, the difference
            in outcome is attributable to that difference. This is a randomized
            controlled trial with a population of one, run inside a neural
            network.
          </p>
          <MB>{String.raw`\text{logit diff} \;=\; \mathrm{logit}(\text{correct}) - \mathrm{logit}(\text{wrong})`}</MB>
          <p>
            The metric matters as much as the intervention. Logit difference is
            the field&apos;s default because it is linear in the residual stream
            — softmax normalization cancels, so a component&apos;s contribution
            adds up the way your intuition wants it to. Probability and
            accuracy are non-linear and will hide effects at the ceiling.
          </p>
          <KeyIdea>
            Which run you patch <em>into</em> determines which question you are
            asking.{" "}
            <strong>Denoising</strong> — clean activation into a corrupted run —
            asks whether the component is <em>sufficient</em> to restore the
            behavior. <strong>Noising</strong> — corrupted activation into a
            clean run — asks whether it is <em>necessary</em>. These are
            different questions, they routinely give different answers, and
            conflating them is the most common error in the literature.
          </KeyIdea>
          <p>
            Heimersheim &amp; Nanda&apos;s guide is blunt about the failure
            mode: patching a component and seeing no damage does <em>not</em>{" "}
            prove the component is unused. Models self-repair. Knock out the
            heads that do a job and other heads that were sitting idle will step
            in — you will see this happen for real in the IOI circuit, where
            ablating all three name mover heads costs only about 5% of the logit
            difference because backup heads take over.
          </p>
          <Term word="path patching">
            Plain patching measures a component&apos;s <em>total</em> effect,
            through every downstream route. Path patching restricts the
            intervention to one route: patch <M>h</M>&apos;s contribution{" "}
            <em>only where it feeds into</em> component <M>r</M>, and recompute
            everything else normally. This is how you establish wiring rather
            than mere importance — it is what showed that S-inhibition heads act
            entirely through the name movers&apos; queries.
          </Term>
          <Term word="attribution patching">
            Patching is expensive: one forward pass per component per position.
            Attribution patching approximates the whole map with a first-order
            Taylor expansion —{" "}
            <M>{String.raw`\Delta \mathcal{L} \approx (a_{\text{clean}} - a_{\text{corrupt}}) \cdot \nabla_{a} \mathcal{L}`}</M>{" "}
            — which needs two forward passes and one backward pass{" "}
            <em>total</em>, regardless of how many components you score. Neel
            Nanda&apos;s write-up is the standard reference.
          </Term>
          <Note kind="note" title="When the approximation breaks">
            A linear approximation is only good for small perturbations, and a
            clean-versus-corrupt activation difference is not small. Attribution
            patching is reliable for finding the many components with{" "}
            <em>near-zero</em> effect and unreliable exactly where the effect is
            large — including getting signs wrong at saturated components. Use it
            as a cheap filter, then verify the survivors with real patching. That
            two-stage recipe is what automated circuit discovery methods do.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "ioi",
      title: "The worked example: indirect object identification",
      body: (
        <>
          <p>
            Every field needs one problem that everybody has solved. In
            mechanistic interpretability it is <strong>IOI</strong>, from Wang,
            Variengien, Conmy, Shlegeris &amp; Steinhardt (2022).
          </p>
          <p>
            The task: complete &ldquo;When John and Mary went to the store, John
            gave a drink to ___&rdquo;. The answer is <strong>Mary</strong> — the
            <em>indirect object</em>, the name that appears once. GPT-2 small
            gets this right, with a mean logit difference of 3.56 over 100,000
            examples and the right answer preferred 99.3% of the time. It is a
            real linguistic behavior, small enough to fully reverse-engineer.
          </p>
          <p>Here is the algorithm a person would use:</p>
          <ol>
            <li>Identify all previous names in the sentence (Mary, John, John).</li>
            <li>Remove the names that are duplicated (John).</li>
            <li>Output the remaining name.</li>
          </ol>
          <p>
            The remarkable finding is that GPT-2 small implements almost exactly
            this, in <strong>26 attention heads across 7 classes</strong> — about
            1.1% of the model&apos;s (head, token position) pairs. Three classes
            map onto the three steps: duplicate-token heads detect the repeat,
            S-inhibition heads suppress it, name mover heads copy what is left.
          </p>
          <KeyIdea>
            The mechanism that does the actual work is almost embarrassingly
            simple: the name mover heads attend to a name and copy it. All the
            cleverness is upstream, in arranging for them to attend to the{" "}
            <em>right</em> name. Circuits are usually like this — a trivial
            output step plus an elaborate addressing scheme.
          </KeyIdea>
          <p>
            Two of the seven classes do not fit the story and are the most
            interesting part of the paper.{" "}
            <strong>Negative name mover heads</strong> (10.7, 11.10) write{" "}
            <em>against</em> the correct answer, apparently hedging to limit
            loss when the model is wrong. <strong>Backup name mover heads</strong>{" "}
            do nothing at all — until you ablate the name movers, at which point
            they take over the job.
          </p>
          <Note kind="warning" title="Self-repair breaks naive ablation">
            Backup heads mean that &ldquo;I removed this component and
            performance held up&rdquo; is compatible with the component being the
            primary mechanism. The model has redundancy you did not know about.
            Any claim of the form &ldquo;X is not necessary&rdquo; based on a
            single ablation is unsafe.
          </Note>
          <p>
            How was it found? Backwards, from the logits. Path patch every head
            to the logits: three heads dominate — the name movers. Path patch
            every head to the name movers&apos; <em>queries</em>: four heads
            appear — the S-inhibition heads. Path patch to the S-inhibition
            heads&apos; <em>values</em>: the duplicate-token and induction heads
            appear. Each step narrows the target and each step uses path patching
            rather than plain patching, because the question at each step is
            about a specific route.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "standards",
      title: "What “the circuit explains 87% of performance” means",
      body: (
        <>
          <p>
            Wang et al. did something unusual: they tried to falsify their own
            result, with three explicit criteria. Learning to apply them is the
            most transferable thing in this module.
          </p>
          <Term word="faithfulness">
            Does the circuit alone do the task? Mean-ablate everything outside
            the circuit and measure. For IOI:{" "}
            <M>{String.raw`|F(M) - F(C)| = 0.46`}</M>, which is 13% of the full
            model&apos;s 3.56 logit difference — so the circuit achieves{" "}
            <strong>87% of the model&apos;s performance</strong>. This is the
            number everyone quotes.
          </Term>
          <Term word="completeness">
            Does the circuit contain <em>everything</em> used for the task? For
            every subset <M>K</M>, removing <M>K</M> from the circuit and from
            the whole model should hurt about equally. Faithfulness alone is not
            enough: backup name movers show that a circuit can score well while
            omitting components that would step in under intervention.
          </Term>
          <Term word="minimality">
            Does the circuit contain anything <em>irrelevant</em>? For every node{" "}
            <M>v</M>, there should exist some context in which removing{" "}
            <M>v</M> matters. Otherwise you have padded your explanation.
          </Term>
          <Note kind="warning" title="The 87% is doing less work than it looks">
            When Wang et al. ran completeness with a <em>greedy adversarial</em>{" "}
            search for the worst subset, they found subsets with an
            incompleteness score up to 3.09 — 87% of the original logit
            difference. Their own criterion, pushed hard, says the circuit is
            substantially incomplete. They report this. That is what good
            interpretability work looks like, and it is why &ldquo;explains X% of
            performance&rdquo; should be read as &ldquo;on the specific
            distribution, metric and ablation baseline chosen, this subgraph
            reproduces X% of the measured quantity&rdquo; — not as &ldquo;we
            understand X% of the model.&rdquo;
          </Note>
          <p>
            <strong>Causal scrubbing</strong> (Chan et al., Redwood Research,
            2022) pushes the idea to its logical end. You state your hypothesis
            as a mapping from your idealized computational graph onto the
            model&apos;s graph. The hypothesis licenses a set of{" "}
            <em>resamplings</em>: if you claim head 5.5 only carries &ldquo;is
            this token duplicated&rdquo;, then swapping its activation for one
            from any other prompt with the same duplication structure must not
            change the output. Scrub every activation your hypothesis says is
            interchangeable, and see how much performance survives.
          </p>
          <KeyIdea>
            Causal scrubbing inverts the burden of proof. Instead of collecting
            evidence <em>for</em> a circuit, you specify the hypothesis
            precisely enough that it makes a maximal set of interventions
            harmless — then run them all. What survives is a lower bound on how
            much your story explains. It is demanding, it usually produces a
            humbling number, and that is the point.
          </KeyIdea>
          <Note kind="safety">
            This is the module where interpretability becomes an audit rather
            than a story. If you want to make a safety claim — &ldquo;this model
            has no backdoor trigger&rdquo;, &ldquo;this refusal is driven by
            harm-detection and not by surface style&rdquo; — you need
            interventions, not activations, and you need a completeness
            criterion, not just a faithfulness one. Self-repair is the specific
            reason to worry: a mechanism you ablated and declared harmless may be
            the primary one, silently backed up. Assume adversarial subsets exist
            and go looking for them.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: patch a component, read the circuit",
      body: (
        <>
          <p>
            First, run the experiment: pick a token position and a component, and
            see how much of the behavior one patch moves. Then read the answer
            key — the circuit those patches add up to.
          </p>
          <PatchingSandbox />
          <IoiCircuitMap />
          <p>
            Things to try: (1) Select <strong>attention, layer 9</strong> and
            switch between END and S2 — the same component is decisive at one
            position and inert at the other. Components matter at{" "}
            <em>positions</em>, and any analysis that averages over positions
            throws that away. (2) With END selected, compare layer 9 in{" "}
            <em>denoise</em> versus <em>noise</em>: patching the name movers in
            recovers far more than knocking them out destroys. That gap is
            self-repair by backup heads, and it is exactly why sufficiency and
            necessity need separate experiments. (3) Find the one component with
            a negative effect (attention, layer 11, at END) and note that any
            ranking by absolute effect size would have filed it with the name
            movers instead of against them. (4) In the circuit map, step to
            &ldquo;2 · Inhibit it&rdquo; and follow the dashed arrow: the
            S-inhibition heads write into <em>queries</em>, not values — they
            change where attention looks, not what it carries.
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
          The IOI replication is the field&apos;s rite of passage and the reason
          this module is 240 minutes. Do the pencil problems first; they will
          save you hours of confused debugging.
        </p>
      ),
      problems: [
        {
          id: "choose-corruption",
          kind: "pencil",
          title: "Design the corrupted prompt",
          prompt: (
            <>
              <p>
                Clean prompt: &ldquo;When John and Mary went to the store, John
                gave a drink to&rdquo; → <em>Mary</em>. Here are three candidate
                corruptions:
              </p>
              <ol>
                <li>
                  <span className="font-mono">
                    When John and Mary went to the store, Chris gave a drink to
                  </span>
                </li>
                <li>
                  <span className="font-mono">
                    When John and Mary went to the store, Mary gave a drink to
                  </span>
                </li>
                <li>
                  <span className="font-mono">
                    When John and Mary went to the park, John gave a drink to
                  </span>
                </li>
              </ol>
              <p>
                For each: what does patching with it isolate, and what confound
                does it introduce? Which would you use to find the name mover
                heads, and which to find the duplicate-token heads?
              </p>
            </>
          ),
          hint: (
            <p>
              For each corruption, ask two questions: which computation does it
              break, and which token positions have their <em>content</em>{" "}
              changed? A patch is only clean if the two runs are aligned
              everywhere you are not intervening.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>(1) Third name.</strong> Removes the duplication
                entirely, so the model has no basis for preferring Mary over
                John. The correct-answer logit difference collapses toward zero.
                Cleanest general-purpose corruption: token positions stay
                aligned, only the identity at S2 changes, and every step of the
                algorithm is disabled at once. Confound: because everything
                breaks, a large patching effect tells you a component is involved
                somewhere, not where.
              </p>
              <p>
                <strong>(2) Swapped subject.</strong> Now Mary is duplicated and
                John is the indirect object, so the correct answer flips. This is
                the sharpest test of the name movers: patch their output and you
                should see the prediction flip, not merely weaken. Confound: the
                answer changed, so you must be careful which logit difference you
                are measuring — many people accidentally measure a sign flip as a
                magnitude change.
              </p>
              <p>
                <strong>(3) Different location.</strong> Changes an irrelevant
                token. The IOI computation is untouched, so this is not a
                corruption at all — it is a control. Extremely useful as one:
                anything showing a large patching effect under this pair is
                telling you about your setup, not about IOI.
              </p>
              <p>
                For name movers, use (2) — you want a directional flip at the
                output. For duplicate-token heads, use (1) — you want the
                duplication signal itself to be absent, which (2) preserves
                (Mary is duplicated instead).
              </p>
            </>
          ),
        },
        {
          id: "denoise-vs-noise",
          kind: "pencil",
          title: "Sufficiency, necessity, and a contradiction",
          prompt: (
            <>
              <p>
                You patch attention layer 9 at the END position and find:
                denoising recovers <strong>58%</strong> of the logit difference;
                noising destroys only <strong>34%</strong> of it.
              </p>
              <p>
                (a) Explain why these numbers are not required to match. (b) Give
                the specific mechanism in GPT-2 small that produces this gap. (c)
                A colleague concludes &ldquo;layer 9 attention is only 34%
                necessary, so it is not the main mechanism.&rdquo; What is wrong
                with that inference, and what experiment settles it?
              </p>
            </>
          ),
          hint: (
            <p>
              Sufficiency and necessity are different logical properties even in
              simple systems. Think about a circuit with a redundant backup path:
              is the primary path sufficient? Is it necessary?
            </p>
          ),
          solution: (
            <>
              <p>
                (a) Sufficiency and necessity coincide only when there is exactly
                one mechanism. Denoising asks &ldquo;given a broken run, does
                restoring this component fix it?&rdquo; Noising asks &ldquo;given
                a working run, does breaking this component break it?&rdquo; A
                system with redundancy answers yes to the first and only partly
                to the second.
              </p>
              <p>
                (b) <strong>Backup name mover heads</strong> — 9.0, 9.7, 10.1,
                10.2, 10.6, 10.10, 11.2, 11.9. Under normal operation they do not
                move the IO name. Remove the primary name movers and they take
                over: Wang et al. found that ablating all three name movers
                together dropped the logit difference by only about 5%.
              </p>
              <p>
                (c) The inference confuses &ldquo;necessary&rdquo; with
                &ldquo;primary.&rdquo; Under normal operation layer 9 does the
                job; it just is not the <em>only</em> thing capable of doing it.
                The experiment that settles it is a joint ablation: knock out
                layer 9 attention <em>and</em> the backup heads together. If
                performance now collapses, you have shown that the class of
                name-mover-like heads is necessary and that layer 9 leads it.
                This is precisely why Wang et al. needed a completeness
                criterion — faithfulness alone cannot see redundancy.
              </p>
            </>
          ),
        },
        {
          id: "attribution-error",
          kind: "pencil",
          title: "Where the linear approximation dies",
          prompt: (
            <>
              <p>
                Attribution patching estimates the effect of replacing activation{" "}
                <M>a</M> with <M>a&apos;</M> as
              </p>
              <MB>{String.raw`\Delta \mathcal{L} \;\approx\; (a' - a)^{\top} \nabla_{a} \mathcal{L}`}</MB>
              <p>
                (a) State the assumption this makes. (b) You attribution-patch
                every head in GPT-2 small on IOI and then verify with real
                patching. Where should you expect the approximation to be worst,
                and in which direction will it err? (c) Given that, what is the
                right way to use attribution patching in a discovery pipeline?
              </p>
            </>
          ),
          hint: (
            <p>
              Consider a component downstream of a softmax that is already
              saturated — the local gradient is near zero, but the true effect of
              a large change is not.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) It assumes the loss is locally linear in the activation over
                the whole interval from <M>a</M> to <M>a&apos;</M> — i.e. that
                the clean-to-corrupt difference is a <em>small</em> perturbation.
                It usually is not.
              </p>
              <p>
                (b) Worst at the components with the largest true effects, and at
                anything sitting in a saturated non-linearity. A saturated
                attention softmax has a near-zero local gradient, so attribution
                reports &ldquo;no effect&rdquo; while the real patch swings the
                output — a false negative on exactly the head you were looking
                for. Signs can also flip. It is accurate where it matters least:
                on the great mass of components whose effect really is
                negligible.
              </p>
              <p>
                (c) Use it as a <strong>cheap filter, never as evidence</strong>.
                Score everything with two forward passes and one backward pass,
                keep the top few percent plus anything ambiguous, then run real
                activation patching on the survivors and report only those
                numbers. Automated circuit discovery methods follow this shape.
                The one thing you must not do is report an attribution score as
                if it were a patching result.
              </p>
            </>
          ),
        },
        {
          id: "ioi-replication",
          kind: "code",
          title: "Replicate the IOI circuit",
          prompt: (
            <>
              <p>
                The rite of passage. In{" "}
                <a href="https://github.com/TransformerLensOrg/TransformerLens" target="_blank" rel="noreferrer">
                  TransformerLens
                </a>{" "}
                with GPT-2 small, build an IOI dataset of at least 100 prompts
                over several templates and both name orders, then:
              </p>
              <ol>
                <li>
                  Establish the baseline logit difference between IO and S. You
                  should land near <strong>3.5</strong>.
                </li>
                <li>
                  Patch each head&apos;s output at each token position (clean →
                  corrupted with a third name) and produce the heatmap. Heads{" "}
                  <span className="font-mono">9.9</span>,{" "}
                  <span className="font-mono">9.6</span>,{" "}
                  <span className="font-mono">10.0</span> should dominate at END.
                </li>
                <li>
                  Path patch each head into the queries of those three heads. You
                  should recover{" "}
                  <span className="font-mono">7.3, 7.9, 8.6, 8.10</span>.
                </li>
                <li>
                  Plot the attention patterns of the name movers before and after
                  patching the S-inhibition heads, and confirm attention moves
                  off IO onto S1.
                </li>
              </ol>
              <p>
                Success check: your heatmap reproduces Figure 3 of Wang et al.
                qualitatively, and your S-inhibition set matches theirs exactly.
              </p>
            </>
          ),
          hint: (
            <p>
              Start from the{" "}
              <a
                href="https://colab.research.google.com/github/TransformerLensOrg/TransformerLens/blob/main/demos/Exploratory_Analysis_Demo.ipynb"
                target="_blank"
                rel="noreferrer"
              >
                Exploratory Analysis demo notebook
              </a>
              , which walks the first two steps on IOI. Two traps: token
              positions must be aligned between clean and corrupted prompts (use
              names that are single tokens, and check), and patch the head&apos;s{" "}
              <span className="font-mono">z</span> (its output before{" "}
              <M>{String.raw`W_O`}</M>) rather than the whole attention block if
              you want per-head resolution.
            </p>
          ),
          solution: (
            <>
              <p>
                Expected results, to check yourself against: baseline logit
                difference ≈ 3.5; at END, heads 9.9, 9.6 and 10.0 give large
                positive patching effects and 10.7 and 11.10 give negative ones;
                at S2, heads 0.1, 3.0, 5.5 and 6.9 appear; at S1+1, heads 2.2 and
                4.11. Path patching into name-mover queries isolates 7.3, 7.9,
                8.6, 8.10 and nothing else of consequence.
              </p>
              <p>
                The moment that makes the module land is step 4. Before patching,
                the name movers put most of their attention on Mary. Patch the
                four S-inhibition heads and the attention visibly redistributes
                onto John. You have just watched one set of heads reprogram
                another set&apos;s attention, and the output changes accordingly.
                If you only do one thing from this module, do that plot.
              </p>
              <p>
                Then run the bonus: ablate all three name movers and measure. You
                should lose far less than you expect — that is the backup heads,
                and it is more instructive when you see it in your own numbers
                than when you read it here.
              </p>
            </>
          ),
        },
        {
          id: "attribution-compare",
          kind: "code",
          title: "Attribution patching vs. the real thing",
          prompt: (
            <>
              <p>
                Using the same setup, implement attribution patching: cache
                activations on both clean and corrupted runs, take gradients of
                the logit difference with respect to the clean activations, and
                score every (head, position) with{" "}
                <M>{String.raw`(a_{\text{corrupt}} - a_{\text{clean}}) \cdot \nabla_a`}</M>.
              </p>
              <p>
                Success check: produce a scatter plot of attribution score against
                true patching effect over all (head, position) pairs, report the
                correlation, and identify by name every point where the
                approximation is badly wrong.
              </p>
            </>
          ),
          hint: (
            <p>
              Compute the gradient of the <em>metric</em>, not the loss, and be
              careful about sign conventions — half of all attribution-patching
              bugs are a sign error that makes the scatter plot look like a
              perfect anti-correlation.
            </p>
          ),
          solution: (
            <>
              <p>
                You should see a strong overall correlation driven by the
                enormous mass of near-zero components, and clear breakdown at the
                extremes: the largest true effects — the name movers — are the
                worst-approximated, and some heads with saturated attention get
                near-zero attribution despite a real patching effect. Reporting
                the correlation alone would look like a triumph; the scatter plot
                is what tells the truth.
              </p>
              <p>
                The practical payoff is the cost comparison. Real patching over
                144 heads × ~15 positions is a few thousand forward passes;
                attribution patching is two forward passes and one backward pass
                for all of it. At GPT-2 small scale this is a convenience. At
                frontier scale it is the difference between possible and
                impossible, which is why every scalable circuit-discovery method
                is built on gradients — including the attribution graphs of
                Module 4.1.
              </p>
            </>
          ),
        },
        {
          id: "scrub-design",
          kind: "pencil",
          title: "Write a causal-scrubbing hypothesis",
          prompt: (
            <>
              <p>
                State the IOI hypothesis precisely enough to scrub. For each of
                these three claims, write down the resampling it licenses — the
                set of alternative inputs whose activation you could swap in
                without, on your hypothesis, changing the output:
              </p>
              <ol>
                <li>
                  Duplicate-token head 3.0 at S2 carries only &ldquo;this token
                  is duplicated, and the earlier copy was at position <M>p</M>&rdquo;.
                </li>
                <li>
                  S-inhibition head 8.6 at END carries only the token identity
                  and position of S.
                </li>
                <li>
                  Name mover head 9.9 at END copies whatever name it attends to.
                </li>
              </ol>
              <p>Then say which claim you expect to survive scrubbing least well, and why.</p>
            </>
          ),
          hint: (
            <p>
              A resampling is licensed when the replacement input agrees with the
              original on everything your hypothesis says the activation encodes,
              and is free to differ on everything else.
            </p>
          ),
          solution: (
            <>
              <p>
                (1) Swap in head 3.0&apos;s activation from any prompt with a
                duplicated name at the same position — different names, different
                verbs, different objects. If the claim is right, the output is
                unchanged.
              </p>
              <p>
                (2) Swap in head 8.6&apos;s activation from any prompt whose S
                token and S1 position match, ignoring everything else. Wang et
                al. decompose this message into a token signal and a position
                signal and find the position signal carries roughly twice the
                weight — so a scrub that preserves position but randomizes token
                identity should cost you noticeably less than the reverse.
              </p>
              <p>
                (3) Swap in head 9.9&apos;s activation from any prompt where it
                attends to a name in the same position — the name may differ,
                because the claim is about the mechanism, not the content. This
                is the strongest claim and the one to be most suspicious of: a
                head that also carries positional or syntactic information beyond
                the name will fail here.
              </p>
              <p>
                Expect (1) to survive best — it is a narrow claim about a simple
                signal — and expect the overall scrubbed performance to be well
                below 87%. That drop is the honest gap between &ldquo;we found a
                subgraph that reproduces the behavior&rdquo; and &ldquo;we
                understand what each part of it is doing.&rdquo;
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
              You train a linear probe that reads a sentence&apos;s grammatical
              tense from layer 6 with 96% accuracy. What have you shown?
            </>
          ),
          choices: [
            {
              text: "That tense information is linearly present at layer 6 — and nothing about whether the model uses it.",
              correct: true,
              explain:
                "Probes are observational. The residual stream carries far more information than any given computation reads. You need an intervention — ablate or patch the direction and see whether behavior that depends on tense changes.",
            },
            {
              text: "That layer 6 computes tense.",
              explain:
                "The information could have been written by layer 1 and merely passed along. Probing a layer tells you what is present there, not what produced it.",
            },
            {
              text: "That a downstream component reads tense from layer 6.",
              explain:
                "This is the causal claim the probe cannot support. You can construct directions that probe at high accuracy and that nothing downstream reads at all.",
            },
            {
              text: "That tense is represented as a direction, confirming the linear representation hypothesis.",
              explain:
                "A linear probe succeeding is weak evidence for linearity of *that* property's encoding, but high probe accuracy is achievable even on information the model does not represent as a clean direction. And it still says nothing about use.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              You want to know whether head 8.6 is <em>necessary</em> for the IOI
              behavior. Which experiment answers that question?
            </>
          ),
          choices: [
            {
              text: "Noising: run the clean prompt and patch in 8.6's activation from the corrupted run.",
              correct: true,
              explain:
                "Necessity is about whether breaking the component breaks the behavior, so you start from a working run and damage it. Denoising — the other direction — tests sufficiency, which is a different property.",
            },
            {
              text: "Denoising: run the corrupted prompt and patch in 8.6's clean activation.",
              explain:
                "That tests sufficiency: can this component alone restore the behavior? A component can be sufficient without being necessary (if there is a backup) and necessary without being sufficient (if it is one link in a chain).",
            },
            {
              text: "Zero-ablate 8.6 and measure the drop.",
              explain:
                "Closer — this is a necessity-flavored test — but zero is off-distribution, so part of the damage you measure is the damage of putting the model somewhere it has never been. Resample or mean baselines are more informative.",
            },
            {
              text: "Probe 8.6's output for the S token's identity.",
              explain:
                "Purely observational, and this module exists to break that habit. It would tell you what 8.6 carries, not whether anything downstream depends on it.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              Why is <em>logit difference</em> the preferred metric for patching
              experiments rather than the probability of the correct answer?
            </>
          ),
          choices: [
            {
              text: "It is linear in the residual stream, so component contributions add — softmax normalization cancels out of a difference of logits.",
              correct: true,
              explain:
                "This is the reason, and it connects straight back to Module 0.2: adding a constant to every logit changes nothing, so only differences are meaningful. Linearity means a component's effect on the metric is the projection of its output onto one direction.",
            },
            {
              text: "Probabilities are bounded, so they cannot represent large effects.",
              explain:
                "Bounding is a real nuisance — effects saturate near 0 and 1 — but the decisive advantage is linearity in the residual stream, which is what makes per-component attribution meaningful at all.",
            },
            {
              text: "Logits are what the model actually computes; probabilities are a post-processing artifact.",
              explain:
                "True but not the reason. You could measure any monotone function of the logits; the point is that the *difference* of two logits is a linear functional of the residual stream and a probability is not.",
            },
            {
              text: "Logit difference is less sensitive to the choice of corrupted prompt.",
              explain:
                "It is not — every patching metric depends heavily on the clean/corrupt pair. Choosing that pair well is a separate and equally important design decision.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              In the IOI circuit, the S-inhibition heads write into the{" "}
              <em>queries</em> of the name mover heads. What does that mean
              mechanically?
            </>
          ),
          choices: [
            {
              text: "They change where the name movers look, not what the name movers carry — biasing attention away from the duplicated name.",
              correct: true,
              explain:
                "Queries determine attention weights; values determine what gets moved. The S-inhibition heads never touch the logits directly — their entire effect is mediated by redirecting someone else's attention. Path patching is what established this.",
            },
            {
              text: "They suppress the name movers' output magnitude.",
              explain:
                "That would be a gain control on the OV side. The measured effect is on the attention pattern: patch the S-inhibition heads and you can watch name-mover attention move from Mary onto John.",
            },
            {
              text: "They write the correct answer into the residual stream for the name movers to copy.",
              explain:
                "The answer is already in the context — the name movers copy it from the IO token. The S-inhibition heads contribute no name information, only an instruction about which name to avoid.",
            },
            {
              text: "They add a positional encoding so the name movers can tell the two names apart.",
              explain:
                "Half right in an interesting way: the message does contain a position signal (carrying about twice the weight of the token signal). But it is a targeted inhibition instruction, not a general positional encoding.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Ablating all three name mover heads costs only about 5% of the
              logit difference. The right conclusion is:
            </>
          ),
          choices: [
            {
              text: "The model has redundancy — backup name mover heads take over — so a small ablation effect does not imply the component is unimportant.",
              correct: true,
              explain:
                "This is self-repair, and it is the single most important methodological warning in this module. It is why faithfulness alone is inadequate and why Wang et al. introduced a completeness criterion.",
            },
            {
              text: "The name mover heads were never the main mechanism; the real circuit is elsewhere.",
              explain:
                "Under normal operation the name movers do the job — patching them in recovers most of the behavior, and their copy score is above 95%. They are primary; they are just not irreplaceable.",
            },
            {
              text: "The ablation was done wrong, most likely with a zero baseline.",
              explain:
                "Worth checking as hygiene, but this result reproduces across baselines. The redundancy is real and the backup heads were identified individually.",
            },
            {
              text: "Logit difference is too coarse a metric to detect the change.",
              explain:
                "Logit difference detected the name movers' contribution just fine when they were patched in. The metric is not the problem; the model's redundancy is.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              When should you reach for <em>path</em> patching instead of plain
              activation patching?
            </>
          ),
          choices: [
            {
              text: "When you want to know whether a component's effect flows through one specific downstream component rather than through the model at large.",
              correct: true,
              explain:
                "Path patching restricts the intervention to a single route and recomputes everything else normally. It is what turns 'this head matters' into 'this head matters *because it feeds that head's queries*' — i.e. wiring rather than importance.",
            },
            {
              text: "When plain patching is too computationally expensive.",
              explain:
                "Path patching is strictly more expensive — you must specify and isolate a route. Attribution patching is the answer to cost.",
            },
            {
              text: "When you want to avoid taking the model off-distribution.",
              explain:
                "Both methods substitute activations from a real forward pass, so both stay similarly on-distribution. The difference is scope of effect, not distributional validity.",
            },
            {
              text: "When the component appears at multiple token positions.",
              explain:
                "Position-resolved plain patching handles that. Path patching is about which downstream *route* carries the effect, which is orthogonal to position.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              A paper reports &ldquo;our circuit explains 87% of the model&apos;s
              performance on the task.&rdquo; What follow-up question matters
              most?
            </>
          ),
          choices: [
            {
              text: "What was everything outside the circuit replaced with, and did you search adversarially for subsets where the circuit and the model diverge?",
              correct: true,
              explain:
                "Both halves are load-bearing. The number depends entirely on the ablation baseline, and Wang et al.'s own greedy completeness search found subsets with incompleteness up to 87% of the logit difference — the same headline number, pointing the opposite way.",
            },
            {
              text: "What is the remaining 13%?",
              explain:
                "Natural, but less diagnostic than you would hope. The 13% is a residual under one particular ablation scheme; changing the scheme changes it. The stronger question is whether the criterion survives adversarial pressure.",
            },
            {
              text: "Does the circuit generalize to a different model?",
              explain:
                "Universality is a genuinely interesting question, but it is a separate one. It does not affect whether the 87% claim about *this* model is well-founded.",
            },
            {
              text: "Was the metric logit difference or probability?",
              explain:
                "Worth knowing, and metric choice does move these numbers — but even with the best metric, an unstated ablation baseline and an unsearched completeness criterion make the number uninterpretable.",
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
          Read the methods guide before the paper. It will save you from the
          three mistakes everyone makes on their first patching experiment.
        </p>
      ),
      readings: [
        {
          title: "How to use and interpret activation patching",
          authors: "Stefan Heimersheim & Neel Nanda",
          year: 2024,
          url: "https://arxiv.org/abs/2404.15255",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "Short, practical, and the best possible preparation for the notebook. Read the denoising-versus-noising section twice — that distinction is the one people get wrong for years. Pay attention to the discussion of self-repair and to the advice on choosing corrupted prompts; both save real debugging time.",
        },
        {
          title:
            "Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small",
          authors: "Wang, Variengien, Conmy, Shlegeris & Steinhardt",
          year: 2022,
          url: "https://arxiv.org/abs/2211.00593",
          kind: "paper",
          time: "3h, 2 sittings",
          essential: true,
          note: "Sitting 1: §2–3, following Figure 2 as you go — the discovery procedure (start at the logits, path patch backwards) is more valuable than the specific heads. Sitting 2: §4, the validation criteria. Read the completeness discussion carefully: their own adversarial search finds large incompleteness scores, and their willingness to report that is the standard to hold other papers to.",
        },
        {
          title: "Attribution Patching: Activation Patching At Industrial Scale",
          authors: "Neel Nanda",
          year: 2023,
          url: "https://www.neelnanda.io/mechanistic-interpretability/attribution-patching",
          kind: "blog",
          time: "45 min",
          note: "The original write-up of the gradient approximation, including honest discussion of where it fails. Read for the intuition, then note the recommended pipeline — cheap filter first, real patching to confirm — which is how every scalable circuit method since has been built.",
        },
        {
          title: "Causal Scrubbing: a method for rigorously testing interpretability hypotheses",
          authors: "Chan, Garriga-Alonso, Goldowsky-Dill, Greenblatt, et al. (Redwood Research)",
          year: 2022,
          url: "https://www.alignmentforum.org/posts/JvZhhzycHu2Yd57RN/causal-scrubbing-a-method-for-rigorously-testing",
          kind: "blog",
          time: "1.5h",
          note: "Long and worth it for the conceptual move: state the hypothesis so precisely that it licenses a maximal set of resamplings, then run them all. Read the first two sections and the induction-head worked example; you can skip the formalism on a first pass. Expect to find the resulting numbers humbling.",
        },
        {
          title: "Towards Automated Circuit Discovery for Mechanistic Interpretability",
          authors: "Conmy, Mavor-Parker, Lynch, Heimersheim & Garriga-Alonso",
          year: 2023,
          url: "https://arxiv.org/abs/2304.14997",
          kind: "paper",
          time: "1h",
          note: "ACDC automates the backwards search you did by hand on IOI. Read §2–3 for the algorithm and §4 for how it scores against known circuits — it recovers most of IOI, which is both encouraging and a useful calibration on how much of the work was mechanical.",
        },
        {
          title: "TransformerLens — Exploratory Analysis Demo",
          authors: "Neel Nanda & the TransformerLens contributors",
          year: "ongoing",
          url: "https://colab.research.google.com/github/TransformerLensOrg/TransformerLens/blob/main/demos/Exploratory_Analysis_Demo.ipynb",
          kind: "tool",
          time: "2h (do-along)",
          note: "The notebook that walks IOI patching end to end. Do not read it — run it, then delete the analysis cells and rewrite them yourself. The library's caching and hooking API is what you will use for every experiment in Parts 3 to 5, so learning it properly here pays for itself.",
        },
      ],
    },
  ],
};

export default mod;
