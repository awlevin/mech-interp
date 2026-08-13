import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { InductionHeadVisualizer } from "./InductionHeadVisualizer";
import { CompositionBuilder } from "./CompositionBuilder";

const mod: CourseModule = {
  id: "3.2",
  slug: "math-framework",
  title: "A Mathematical Framework & Induction Heads",
  part: 3,
  tagline: "QK and OV circuits, head composition, and the induction heads behind in-context learning.",
  estMinutes: 210,
  objectives: [
      "Decompose an attention head into QK (where) and OV (what) circuits",
      "Explain Q-, K-, and V-composition and virtual heads",
      "Find and validate induction heads in a real 2-layer model"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "additive",
      title: "A transformer is a sum, not a stack",
      body: (
        <>
          <p>
            Elhage et al.&apos;s <em>Mathematical Framework</em> is the paper that
            turned attention from &ldquo;a mechanism&rdquo; into &ldquo;an object
            you can do algebra on&rdquo;. Its first move costs nothing and changes
            everything: stop thinking of the residual stream as a value that gets
            transformed, and start thinking of it as a <strong>running sum</strong>{" "}
            that every component writes into.
          </p>
          <p>
            For an attention-only transformer with layers{" "}
            <M>{String.raw`\ell`}</M> and heads <M>h</M>, the final residual
            stream at a position is exactly
          </p>
          <MB>{String.raw`x_{\text{final}} = \underbrace{W_E t}_{\text{embedding}} + \sum_{\ell}\sum_{h} \underbrace{h^{\ell,h}(x)}_{\text{one head's write}}`}</MB>
          <p>
            and the logits are <M>{String.raw`W_U x_{\text{final}}`}</M>. Because
            the unembedding is linear and the sum is a sum, the logits decompose
            into <em>one term per component</em>. Ask &ldquo;how much did head 4
            in layer 2 contribute to the logit for this token?&rdquo; and there is
            a literal answer: apply <M>{String.raw`W_U`}</M> to that head&apos;s
            output. That is <strong>direct logit attribution</strong>, and it
            exists only because of additivity.
          </p>
          <Figure caption="Every head reads the whole stream and adds its output back. Heads in the same layer cannot see each other; heads in later layers see everything earlier ones wrote. The stream is a shared bus with no arbiter.">
            <svg
              viewBox="0 0 520 190"
              className="w-full max-w-[520px]"
              role="img"
              aria-label="Residual stream as a bus written to by several heads"
            >
              <rect x={40} y={30} width={430} height={22} rx={5} fill="var(--surface-2)" />
              <text x={40} y={22} fontSize={10} fill="var(--text-muted)" className="font-mono">
                residual stream
              </text>
              {[
                { x: 120, label: "L0 h0", c: "var(--series-1)" },
                { x: 205, label: "L0 h1", c: "var(--series-1)" },
                { x: 320, label: "L1 h0", c: "var(--series-2)" },
                { x: 405, label: "L1 h1", c: "var(--series-2)" },
              ].map((b) => (
                <g key={b.label}>
                  <rect x={b.x - 32} y={110} width={64} height={26} rx={5} fill="var(--surface-1)" stroke={b.c} strokeWidth={1.5} />
                  <text x={b.x} y={127} fontSize={10} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
                    {b.label}
                  </text>
                  <path d={`M${b.x - 14},110 L${b.x - 14},52`} stroke={b.c} strokeWidth={1.8} />
                  <path d={`M${b.x + 14},52 L${b.x + 14},110`} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" />
                </g>
              ))}
              <text x={110} y={165} fontSize={10} fill="var(--text-muted)">
                solid = writes into the stream
              </text>
              <text x={300} y={165} fontSize={10} fill="var(--text-muted)">
                dashed = reads from the stream
              </text>
            </svg>
          </Figure>
          <KeyIdea>
            Heads within a layer are <em>independent</em>: they read the same
            input, compute in parallel, and their outputs add. Nothing forces
            them to coordinate. This is why &ldquo;head 5.1 does X&rdquo; is even
            a coherent sentence — and why you can ablate one head and expect the
            others to keep working.
          </KeyIdea>
          <Note kind="note" title="What the framework leaves out">
            Elhage et al. analyse <em>attention-only</em> models: zero, one and
            two layers, no MLPs. That is not modesty, it is strategy — MLPs are
            nonlinear and resist this algebra, and roughly two-thirds of a real
            transformer&apos;s parameters live in them. Everything in this module
            is exactly true of attention-only models and approximately,
            usefully true of real ones. Keep the asterisk.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "qk-ov",
      title: "QK and OV: where to look, what to bring",
      body: (
        <>
          <p>
            A head has four weight matrices —{" "}
            <M>{String.raw`W_Q, W_K, W_V, W_O`}</M> — and the framework&apos;s
            second move is to notice they only ever appear in two pairs.
          </p>
          <p>
            The attention <em>scores</em> use <M>{String.raw`W_Q`}</M> and{" "}
            <M>{String.raw`W_K`}</M> only through the product
          </p>
          <MB>{String.raw`\text{score}(i,j) = \frac{(W_Q x_i)^\top (W_K x_j)}{\sqrt{d_{\text{head}}}} = \frac{x_i^\top \big(W_Q^\top W_K\big) x_j}{\sqrt{d_{\text{head}}}}, \qquad W_{QK} \equiv W_Q^\top W_K`}</MB>
          <p>
            and the head&apos;s <em>output</em> uses <M>{String.raw`W_V`}</M> and{" "}
            <M>{String.raw`W_O`}</M> only through the product{" "}
            <M>{String.raw`W_{OV} \equiv W_O W_V`}</M>. So the individual
            matrices are not the meaningful objects; the products are. This is
            not a notational nicety — it means the head&apos;s learned content
            lives in two matrices that map residual stream to residual stream,
            and you can look at them directly.
          </p>
          <Term word="QK circuit">
            <M>{String.raw`W_{QK} = W_Q^\top W_K`}</M>, a bilinear form on the
            residual stream. It answers &ldquo;<strong>where</strong> should this
            position attend?&rdquo;. Read as{" "}
            <M>{String.raw`W_E^\top W_{QK} W_E`}</M> it becomes a
            vocabulary&nbsp;×&nbsp;vocabulary matrix: which source tokens does
            this destination token want.
          </Term>
          <Term word="OV circuit">
            <M>{String.raw`W_{OV} = W_O W_V`}</M>. It answers &ldquo;
            <strong>what</strong> gets written to the destination, given that we
            attended there?&rdquo;. Read as{" "}
            <M>{String.raw`W_U W_{OV} W_E`}</M> it is a
            vocabulary&nbsp;×&nbsp;vocabulary matrix: attending to token{" "}
            <M>j</M> raises the logit of token <M>i</M> by this much.
          </Term>
          <Figure caption="One head, two circuits, no interaction between them. The QK circuit reads the whole context to build a pattern; the OV circuit never sees the pattern and never knows which position it is moving.">
            <svg
              viewBox="0 0 500 170"
              className="w-full max-w-[500px]"
              role="img"
              aria-label="Attention head split into QK and OV circuits"
            >
              <rect x={20} y={20} width={200} height={58} rx={6} fill="var(--surface-1)" stroke="var(--series-3)" strokeWidth={1.5} />
              <text x={34} y={40} fontSize={11} fill="var(--series-3)" className="font-mono">
                QK circuit
              </text>
              <text x={34} y={58} fontSize={11} fill="var(--text-secondary)">
                where to attend → pattern A
              </text>
              <text x={34} y={72} fontSize={10} fill="var(--text-muted)" className="font-mono">
                rank ≤ d_head, softmaxed
              </text>

              <rect x={20} y={95} width={200} height={58} rx={6} fill="var(--surface-1)" stroke="var(--series-5)" strokeWidth={1.5} />
              <text x={34} y={115} fontSize={11} fill="var(--series-5)" className="font-mono">
                OV circuit
              </text>
              <text x={34} y={133} fontSize={11} fill="var(--text-secondary)">
                what to move, per position
              </text>
              <text x={34} y={147} fontSize={10} fill="var(--text-muted)" className="font-mono">
                rank ≤ d_head, linear
              </text>

              <path d="M225,49 L300,80" stroke="var(--series-3)" strokeWidth={1.5} fill="none" />
              <path d="M225,124 L300,93" stroke="var(--series-5)" strokeWidth={1.5} fill="none" />
              <rect x={305} y={70} width={170} height={34} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={390} y={92} fontSize={11} textAnchor="middle" fill="var(--text-primary)" className="font-mono">
                out_i = Σ_j A_ij · W_OV x_j
              </text>
            </svg>
          </Figure>
          <KeyIdea>
            Freeze the attention pattern and a head becomes a{" "}
            <strong>linear map</strong>. All of the head&apos;s nonlinearity is
            in the softmax that produces <M>A</M>. That is why so much of
            interpretability is &ldquo;stare at the pattern, then stare at{" "}
            <M>{String.raw`W_U W_{OV} W_E`}</M>&rdquo; — between them they are
            the whole head.
          </KeyIdea>
          <p>
            Both circuits are severely <strong>low rank</strong>. In GPT-2 small,{" "}
            <M>{String.raw`d_{\text{model}} = 768`}</M> but{" "}
            <M>{String.raw`d_{\text{head}} = 64`}</M>, so{" "}
            <M>{String.raw`W_{QK}`}</M> and <M>{String.raw`W_{OV}`}</M> are
            768×768 matrices of rank at most 64. A head cannot read or write
            arbitrary things; it gets a 64-dimensional slice of the stream.
            That constraint is what makes heads specialize, and it is a large
            part of why they are legible at all.
          </p>
          <Note kind="note" title="The copying test">
            If <M>{String.raw`W_U W_{OV} W_E`}</M> has large positive diagonal
            entries — attending to token <M>t</M> raises the logit of token{" "}
            <M>t</M> — the head is a <strong>copying head</strong>. Elhage et al.
            check this in a basis-free way with the eigenvalues of{" "}
            <M>{String.raw`W_U W_{OV} W_E`}</M>: mostly-positive eigenvalues mean
            the map tends to push in the direction of whatever it is given. You
            will run this test on a real model in the problem set.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "composition",
      title: "Composition, and heads that do not exist",
      body: (
        <>
          <p>
            One layer of attention can only do so much. Its QK circuit reads
            token embeddings, so it can only decide where to look based on{" "}
            <em>what the tokens are</em>. Its OV circuit writes token
            information straight to the logits. The result is a{" "}
            <strong>skip-trigram</strong> model: patterns of the form &ldquo;…
            <M>A</M> … <M>B</M> → <M>C</M>&rdquo;, with a characteristic failure
            mode the paper enjoys pointing out — the head cannot make{" "}
            <M>C</M> depend on <M>A</M> and <M>B</M> jointly, so a head that
            learns &ldquo;keep… in mind&rdquo; also fires &ldquo;keep… in
            mind&rdquo; on the wrong <M>A</M>. Elhage et al. call these{" "}
            <em>skip-trigram bugs</em>, and they are direct evidence about the
            algorithm rather than the behaviour.
          </p>
          <p>
            Two layers change the picture, because layer 1 reads a residual
            stream that layer 0 has already written into. There are exactly three
            places that can happen, one per input of the head:
          </p>
          <Term word="Q-composition">
            H1&apos;s <em>queries</em> are computed from H0&apos;s output. Where
            H1 looks from depends on earlier processing, not only on the current
            token.
          </Term>
          <Term word="K-composition">
            H1&apos;s <em>keys</em> are computed from H0&apos;s output. A source
            position advertises something H0 computed about it rather than its
            own identity.
          </Term>
          <Term word="V-composition">
            H1&apos;s <em>values</em> are computed from H0&apos;s output. What
            gets moved is the result of an earlier movement.
          </Term>
          <KeyIdea>
            Only V-composition creates a <strong>virtual attention head</strong>:
            a composite with OV matrix{" "}
            <M>{String.raw`W_{OV}^{H1}W_{OV}^{H0}`}</M> and attention pattern{" "}
            <M>{String.raw`A^{H1}A^{H0}`}</M>, which behaves in the path
            expansion exactly like a single head that does not physically exist.
            Q- and K-composition do not add OV terms; they change{" "}
            <em>where</em> attention goes. Both matter enormously — the induction
            circuit is built from K-composition — but they are different kinds of
            thing.
          </KeyIdea>
          <p>
            Expand the two-layer attention-only model and every term is one of
            these paths:
          </p>
          <MB>{String.raw`\text{logits} = \underbrace{W_U W_E}_{\text{direct}} + \sum_{h}\underbrace{W_U W_{OV}^{h} W_E}_{\text{individual heads}} + \sum_{h_0, h_1}\underbrace{W_U W_{OV}^{h_1} W_{OV}^{h_0} W_E}_{\text{virtual heads}}`}</MB>
          <p>
            With <M>{String.raw`n`}</M> heads per layer and 2 layers you get{" "}
            <M>{String.raw`n^2`}</M> virtual heads on top of{" "}
            <M>{String.raw`2n`}</M> real ones. This is where the combinatorics
            get frightening: the count of paths grows exponentially in depth, so
            &ldquo;enumerate all circuits&rdquo; stops being a plan almost
            immediately. In practice most virtual heads carry negligible weight,
            and finding the few that matter is the job.
          </p>
          <Note kind="warning" title="Composition is a matter of degree">
            &ldquo;Is there K-composition between these heads?&rdquo; is not a
            yes/no question about wiring — every head reads the entire stream.
            The real question is how much of H1&apos;s key subspace overlaps with
            H0&apos;s output subspace, which the paper measures with a
            Frobenius-norm ratio of the composed matrices against the product of
            their norms. The toggles in the widget are a cartoon of a continuous
            quantity.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "induction",
      title: "Induction heads: the circuit worth memorizing",
      body: (
        <>
          <p>
            Here is what two layers buy you, and it is the single most important
            concrete result in mechanistic interpretability so far.
          </p>
          <p>
            An <strong>induction head</strong> implements: <em>find an earlier
            occurrence of the current token, and predict whatever followed it</em>.
            Given <M>{String.raw`[A][B] \ldots [A]`}</M> it predicts{" "}
            <M>{String.raw`[B]`}</M>. It takes two heads working together:
          </p>
          <ol>
            <li>
              A <strong>previous-token head</strong> in layer 0 attends from each
              position to the one before it and copies that token&apos;s identity
              into the residual stream. Useless alone.
            </li>
            <li>
              An <strong>induction head</strong> in layer 1 whose{" "}
              <em>keys</em> are computed from that written subspace —{" "}
              <strong>K-composition</strong>. Its key at position{" "}
              <M>p</M> now means &ldquo;the token before me was <M>T</M>&rdquo;;
              its query at the destination means &ldquo;my current token
              is&nbsp;<M>T</M>&rdquo;. The match lands attention on the position{" "}
              <em>after</em> the earlier occurrence, and a copying OV circuit
              writes that token to the output.
            </li>
          </ol>
          <p>
            This is why a one-layer attention-only model cannot do induction and
            a two-layer one can — a clean, falsifiable capability boundary that
            falls straight out of the algebra.
          </p>
          <KeyIdea>
            Induction heads are the field&apos;s best evidence for{" "}
            <strong>universality</strong>. They appear in essentially every
            autoregressive transformer anyone has looked at, from two-layer toys
            to frontier models, and they appear at a sharply defined moment in
            training.
          </KeyIdea>
          <Figure caption="The induction bump: a small window early in training where loss drops faster than the surrounding trend and in-context learning ability appears. Olsson et al. show it coincides with induction heads forming. Schematic — the real curves are noisier and the bump is clearest when you plot the derivative or the in-context learning score.">
            <svg
              viewBox="0 0 460 160"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Schematic training loss curve with a bump early in training"
            >
              <path
                d="M40,30 C90,70 110,86 130,96 C142,116 158,122 176,124 C230,128 320,134 430,138"
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2}
              />
              <rect x={124} y={20} width={58} height={118} fill="var(--series-2)" opacity={0.12} />
              <line x1={124} x2={124} y1={20} y2={138} stroke="var(--series-2)" strokeDasharray="3 3" />
              <line x1={182} x2={182} y1={20} y2={138} stroke="var(--series-2)" strokeDasharray="3 3" />
              <text x={153} y={16} fontSize={10} textAnchor="middle" fill="var(--series-2)" className="font-mono">
                the bump
              </text>
              <text x={200} y={60} fontSize={10} fill="var(--text-secondary)">
                induction heads form here
              </text>
              <text x={200} y={76} fontSize={10} fill="var(--text-secondary)">
                in-context learning appears here
              </text>
              <text x={40} y={154} fontSize={10} fill="var(--text-muted)" className="font-mono">
                training tokens →
              </text>
              <text x={12} y={30} fontSize={10} fill="var(--text-muted)" className="font-mono">
                loss
              </text>
            </svg>
          </Figure>
          <p>
            Olsson et al. build a case, across six lines of evidence, that
            induction heads are the main source of{" "}
            <strong>in-context learning</strong> in transformers: the phase change
            in the loss curve coincides with induction-head formation; perturbing
            the architecture so induction heads form earlier or later moves the
            bump with them; ablating induction heads in small models removes most
            of the in-context learning; and per-head in-context-learning scores
            concentrate on induction heads. The authors are careful about the
            limits, and so should you be: the mechanistic story is{" "}
            <em>demonstrated</em> in small attention-only models and{" "}
            <em>argued by correlation and analogy</em> in large ones. Their own
            summary is that the evidence is strong but not conclusive at scale.
          </p>
          <p>
            The heads found in large models are also not the crisp toy circuit.
            They do <em>fuzzy</em> matching: paraphrases, translations, and
            abstract pattern completion, not just literal token repeats. Whether
            that is &ldquo;the same circuit, generalized&rdquo; or a family of
            related mechanisms is unsettled.
          </p>
          <Term word="in-context learning as fast weights">
            An induction head builds an associative memory{" "}
            <em>at inference time</em> out of the context: keys are &ldquo;what
            preceded this&rdquo;, values are &ldquo;what came next&rdquo;. Reading
            it is a lookup. That is a learned mapping, constructed on the fly,
            used once, and discarded — the same idea as the 1990s{" "}
            <em>fast weights</em> literature, implemented in attention rather
            than in a separate weight matrix.
          </Term>
          <Note kind="note" title="Your on-the-fly learning thread starts here">
            You came to this course partly to understand models that learn
            without weight updates. This is the first mechanism in the course
            that actually does it — and the honest summary is that in-context
            learning is not one thing. Induction is the well-understood floor;
            above it sit &ldquo;fuzzy&rdquo; induction, task-vector effects, and
            (contested) claims that in-context learning implements gradient
            descent in the forward pass. Module 5.2 picks the thread up at the
            other end, where you edit the weights directly.
          </Note>
          <Note kind="safety" title="A learning channel nobody audits">
            If a model can acquire a behaviour from its context, then everything
            you established about the weights has a runtime escape hatch.{" "}
            <strong>Many-shot jailbreaking</strong> is the blunt demonstration:
            fill a long context with hundreds of examples of the model complying
            with harmful requests and the refusal training gives way — with
            effectiveness that grows smoothly with the number of examples, and
            grows <em>faster</em> in larger models. That is in-context learning
            working exactly as designed, pointed at your safety training. Weight
            audits do not see it; context-aware monitoring is a different and
            largely unsolved problem.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Build the circuit",
      body: (
        <>
          <p>
            First, walk the induction circuit end to end and watch the two
            attention patterns do their separate jobs. Then take the diagram
            apart: decide which of H1&apos;s three reads see H0&apos;s output, and
            watch which terms of the path expansion blink into existence.
          </p>
          <InductionHeadVisualizer />
          <CompositionBuilder />
          <p>
            Things to try: (1) Switch the induction visualizer to{" "}
            <em>random tokens</em> and step through again — the mechanism is
            identical, which is the proof that it is reading the context rather
            than recalling a bigram. (2) In the composition builder, hit{" "}
            <em>Induction preset</em>: K-composition only. Note that no virtual
            head appears, and yet this is the configuration that produces the
            field&apos;s canonical circuit — a useful antidote to the assumption
            that virtual heads are where the action is. (3) Turn on all three at
            once and count the terms; then imagine 12 heads per layer and 12
            layers, and you will understand why circuit discovery needs
            automation.
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
          The pencil problems are the ones that make the paper readable; do them
          before you open it. The code problems are the field&apos;s standard
          first experiment — by the end you will have found induction heads in a
          real model and proved they matter by breaking them.
        </p>
      ),
      problems: [
        {
          id: "qk-ov-shapes",
          kind: "pencil",
          title: "Shapes, ranks, and what that buys you",
          prompt: (
            <>
              <p>
                GPT-2 small: <M>{String.raw`d_{\text{model}} = 768`}</M>,{" "}
                <M>{String.raw`d_{\text{head}} = 64`}</M>, 12 heads per layer.
              </p>
              <ol>
                <li>
                  Give the shapes and maximum ranks of{" "}
                  <M>{String.raw`W_{QK}`}</M> and <M>{String.raw`W_{OV}`}</M> for
                  one head.
                </li>
                <li>
                  What are the shapes of{" "}
                  <M>{String.raw`W_E^\top W_{QK} W_E`}</M> and{" "}
                  <M>{String.raw`W_U W_{OV} W_E`}</M>, and what does each entry
                  mean in words?
                </li>
                <li>
                  Why does it not matter that <M>{String.raw`W_Q`}</M> and{" "}
                  <M>{String.raw`W_K`}</M> individually are not identifiable?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              A product of a <M>{String.raw`768\times 64`}</M> and a{" "}
              <M>{String.raw`64\times 768`}</M> matrix is 768×768 but has rank at
              most 64. For part 3, think about what happens if you replace{" "}
              <M>{String.raw`W_Q \to W_Q R`}</M> and{" "}
              <M>{String.raw`W_K \to W_K R^{-\top}`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>1.</strong> Both are 768×768 with rank ≤ 64.{" "}
                <M>{String.raw`W_{QK} = W_Q^\top W_K`}</M> maps residual stream to
                residual stream as a bilinear form;{" "}
                <M>{String.raw`W_{OV} = W_O W_V`}</M> maps residual stream to
                residual stream directly.
              </p>
              <p>
                <strong>2.</strong> Both become{" "}
                <M>{String.raw`50257 \times 50257`}</M> (vocabulary × vocabulary),
                still rank ≤ 64.{" "}
                <M>{String.raw`(W_E^\top W_{QK} W_E)_{ij}`}</M> is the attention
                score contribution when destination token <M>i</M> considers
                source token <M>j</M> — &ldquo;how much does <M>i</M> want to look
                at <M>j</M>&rdquo;.{" "}
                <M>{String.raw`(W_U W_{OV} W_E)_{ij}`}</M> is how much attending
                to token <M>j</M> raises the logit of token <M>i</M>. Note you
                would never materialize these; you sample rows or use low-rank
                structure.
              </p>
              <p>
                <strong>3.</strong> Because for any invertible{" "}
                <M>{String.raw`R`}</M>, the substitution{" "}
                <M>{String.raw`W_Q \to W_Q R,\ W_K \to W_K R^{-\top}`}</M> leaves{" "}
                <M>{String.raw`W_Q^\top W_K`}</M> unchanged — the model behaves
                identically. The individual matrices carry gauge freedom; only the
                product is a fact about the model. Interpreting the columns of{" "}
                <M>{String.raw`W_Q`}</M> alone is interpreting an arbitrary choice
                of coordinates. Same argument for <M>{String.raw`W_O W_V`}</M>.
              </p>
            </>
          ),
        },
        {
          id: "path-count",
          kind: "pencil",
          title: "Counting paths",
          prompt: (
            <>
              <p>
                In a 2-layer attention-only model with <M>n</M> heads per layer,
                the logits expand into a sum of terms.
              </p>
              <ol>
                <li>
                  How many terms are there in total, as a function of <M>n</M>?
                  Break them down by type.
                </li>
                <li>
                  Generalize to <M>L</M> layers: give the number of paths and say
                  in one sentence why enumeration is not a research strategy.
                </li>
                <li>
                  A one-layer model has how many terms? What does that tell you
                  about the class of functions it can express?
                </li>
              </ol>
            </>
          ),
          solution: (
            <>
              <p>
                <strong>1.</strong> <M>{String.raw`1 + 2n + n^2`}</M>: one direct
                path, <M>{String.raw`2n`}</M> individual-head OV paths, and{" "}
                <M>{String.raw`n^2`}</M> virtual heads (one per ordered pair of a
                layer-0 head and a layer-1 head). For GPT-2 small&apos;s{" "}
                <M>{String.raw`n = 12`}</M> that is 169 terms for two layers.
              </p>
              <p>
                <strong>2.</strong> Each layer either contributes a head to the
                path or is skipped, so with <M>n</M> heads per layer you get{" "}
                <M>{String.raw`\prod_{\ell=1}^{L}(n+1) = (n+1)^L`}</M> paths.
                Twelve layers of twelve heads gives{" "}
                <M>{String.raw`13^{12} \approx 2.3\times 10^{13}`}</M>.
                Enumeration is hopeless; the practical methods (Module 3.5) search
                for the few paths that carry weight instead, using gradients or
                patching to prune.
              </p>
              <p>
                <strong>3.</strong> <M>{String.raw`1 + n`}</M> terms — the direct
                path plus one per head, with no compositional terms at all. Every
                head reads embeddings and writes to logits, so the model is a sum
                of bigram and skip-trigram effects. It cannot represent anything
                that requires two sequential attention operations, which includes
                induction.
              </p>
            </>
          ),
        },
        {
          id: "induction-by-hand",
          kind: "pencil",
          title: "Design the induction head",
          prompt: (
            <>
              <p>
                Suppose the residual stream has two orthogonal subspaces:{" "}
                <M>{String.raw`S_{\text{tok}}`}</M> holding the current
                token&apos;s embedding, and{" "}
                <M>{String.raw`S_{\text{prev}}`}</M>, empty at layer 0 and written
                by the previous-token head.
              </p>
              <p>
                Specify, in words and in matrix terms, what{" "}
                <M>{String.raw`W_{QK}`}</M> and <M>{String.raw`W_{OV}`}</M> of the
                layer-1 induction head must do. Then say what breaks if the
                previous-token head writes into{" "}
                <M>{String.raw`S_{\text{tok}}`}</M> instead of a separate
                subspace.
              </p>
            </>
          ),
          hint: (
            <p>
              Write the query source and key source separately. The query needs to
              read <M>{String.raw`S_{\text{tok}}`}</M> at the destination; the key
              needs to read <M>{String.raw`S_{\text{prev}}`}</M> at the source.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>QK.</strong> The head needs a high score when the
                destination&apos;s current token equals the source&apos;s{" "}
                <em>previous</em> token. So <M>{String.raw`W_{QK}`}</M> should
                project the destination onto{" "}
                <M>{String.raw`S_{\text{tok}}`}</M>, project the source onto{" "}
                <M>{String.raw`S_{\text{prev}}`}</M>, and compute something close
                to an inner product between the two token representations —
                schematically{" "}
                <M>{String.raw`W_{QK} \approx P_{\text{tok}}^\top M P_{\text{prev}}`}</M>{" "}
                with <M>M</M> near the identity on token-embedding coordinates.
                The result is &ldquo;attend to positions whose predecessor was my
                current token&rdquo;.
              </p>
              <p>
                <strong>OV.</strong> A copying map on{" "}
                <M>{String.raw`S_{\text{tok}}`}</M>: read the source&apos;s own
                token embedding and write it in a direction the unembedding reads
                as that token, so that{" "}
                <M>{String.raw`W_U W_{OV} W_E`}</M> has a large positive diagonal.
              </p>
              <p>
                <strong>If the subspaces collide.</strong> The key would then mix
                &ldquo;my token&rdquo; and &ldquo;my previous token&rdquo; in the
                same coordinates, and the QK circuit could no longer tell the two
                queries apart. The head would attend both to positions preceded by{" "}
                <M>T</M> and to positions that <em>are</em> <M>T</M> — the second
                being useless (it points at the earlier copy, whose own token you
                already know). This is exactly why the residual stream being
                high-dimensional matters: it is a limited communication bandwidth
                that components must partition, and Module 3.3 is about what
                happens when they cannot afford to.
              </p>
            </>
          ),
        },
        {
          id: "find-induction-heads",
          kind: "code",
          title: "Find the induction heads",
          prompt: (
            <>
              <p>
                Load <code>gpt2-small</code> (or the 2-layer{" "}
                <code>attn-only-2l</code> model from the TransformerLens demos) and
                build a repeated-random-token sequence: pick 50 random token ids,
                concatenate the sequence with itself, prepend BOS. Run{" "}
                <code>run_with_cache</code>.
              </p>
              <p>
                For every head, compute the <strong>induction score</strong>: the
                mean attention weight on the diagonal offset by{" "}
                <code>seq_len - 1</code> in the second half of the sequence. Plot
                a layer × head heatmap. Separately compute a{" "}
                <strong>previous-token score</strong> (mean weight on the offset-1
                diagonal).
              </p>
              <p>
                Success check: a small number of heads have induction scores far
                above the rest, and at least one earlier-layer head has a high
                previous-token score. In GPT-2 small, heads <code>5.5</code> and{" "}
                <code>6.9</code> are commonly reported as strong induction heads
                and <code>4.11</code> as a strong previous-token head — treat
                those as a sanity check on your indexing, not as the answer, and
                trust your own numbers if they disagree.
              </p>
            </>
          ),
          hint: (
            <p>
              <code>
                pattern = cache[&quot;pattern&quot;, layer][0, head]
              </code>{" "}
              is <code>[dest, src]</code>. The induction diagonal is{" "}
              <code>
                torch.diagonal(pattern, offset=-(seq_len - 1))
              </code>{" "}
              where <code>seq_len</code> is the length of the repeated block.
              Random tokens matter: use real repeated text and you cannot tell
              induction from ordinary language modelling.
            </p>
          ),
          solution: (
            <>
              <pre>
                <code>{`import torch, einops
from transformer_lens import HookedTransformer

model = HookedTransformer.from_pretrained("gpt2-small")
S = 50
seq = torch.randint(1000, 10000, (1, S))
toks = torch.cat([torch.tensor([[model.tokenizer.bos_token_id]]), seq, seq], dim=1)
logits, cache = model.run_with_cache(toks)

ind = torch.zeros(model.cfg.n_layers, model.cfg.n_heads)
prv = torch.zeros_like(ind)
for L in range(model.cfg.n_layers):
    p = cache["pattern", L][0]                 # [head, dest, src]
    ind[L] = p.diagonal(dim1=-2, dim2=-1, offset=-(S - 1)).mean(-1)
    prv[L] = p.diagonal(dim1=-2, dim2=-1, offset=-1).mean(-1)

print("top induction:", torch.topk(ind.flatten(), 5))
print("top prev-token:", torch.topk(prv.flatten(), 5))`}</code>
              </pre>
              <p>
                Read the heatmap the way the field does: induction heads cluster
                in the middle third of the network, and the previous-token heads
                that feed them sit one or more layers earlier — never later, which
                is a structural prediction the framework makes and the data
                confirms. If <em>every</em> head scores high, check that your
                tokens are actually random; if none do, check that you are
                indexing <code>[dest, src]</code> and not the transpose.
              </p>
            </>
          ),
        },
        {
          id: "k-composition-check",
          kind: "code",
          title: "Verify K-composition, then break it",
          prompt: (
            <>
              <p>
                Take your best induction head <M>{String.raw`H_1`}</M> and your
                best previous-token head <M>{String.raw`H_0`}</M>. Two
                experiments:
              </p>
              <p>
                <strong>(a) Measure the composition.</strong> Compute the
                K-composition score{" "}
                <M>{String.raw`\|W_{QK}^{H_1\top} W_{OV}^{H_0}\|_F \,/\, (\|W_{QK}^{H_1}\|_F \|W_{OV}^{H_0}\|_F)`}</M>{" "}
                and compare it against the same score for 20 randomly chosen
                earlier-layer heads.
              </p>
              <p>
                <strong>(b) Break it.</strong> Mean-ablate{" "}
                <M>{String.raw`H_0`}</M>&apos;s output (replace it with its mean
                over a batch of prompts) and re-measure{" "}
                <M>{String.raw`H_1`}</M>&apos;s induction score and the model&apos;s
                loss on the repeated sequence.
              </p>
              <p>
                Success check: the composition score for the real pair is a clear
                outlier, and ablating <M>{String.raw`H_0`}</M> collapses{" "}
                <M>{String.raw`H_1`}</M>&apos;s induction score while ablating a
                random earlier head does not.
              </p>
            </>
          ),
          hint: (
            <p>
              Use mean ablation, not zero ablation. Zeroing a head&apos;s output
              takes the residual stream off-distribution, so a large loss increase
              tells you little. Mean ablation removes the head&apos;s{" "}
              <em>information</em> while keeping the stream in a plausible region
              — the distinction is developed properly in Module 3.5.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>(a)</strong> Composition scores are small in absolute
                terms — a few percent — because these are 768×768 matrices of rank
                64 and most of the space is unrelated. What matters is the
                comparison: the real prev-token → induction pair sits several
                times above the random baseline. Report the ratio, not the raw
                number, and always show the baseline distribution. This is the
                measurement Elhage et al. use, and it is a genuinely{" "}
                <em>weight-based</em> claim: it looks at the parameters, not at any
                particular input.
              </p>
              <p>
                <strong>(b)</strong> The ablation is what converts it into a
                causal claim. Expect the induction head&apos;s attention pattern to
                fall apart — it will attend diffusely or to the BOS token — and the
                model&apos;s loss on the second half of the repeated sequence to
                rise sharply, while loss on ordinary text barely moves. That
                selectivity is the point: you have shown a specific pair of heads
                is responsible for a specific capability, not for competence in
                general.
              </p>
              <p>
                Expect complications. Real models have several induction heads
                partly duplicating each other, so ablating one often produces a
                smaller effect than you predicted — the redundancy is real, and it
                recurs as &ldquo;backup heads&rdquo; in the IOI circuit in Module
                3.5.
              </p>
            </>
          ),
        },
        {
          id: "icl-score",
          kind: "code",
          title: "Measure in-context learning directly",
          prompt: (
            <>
              <p>
                Olsson et al. define an in-context learning score as the
                difference in loss between the 500th token of a context and the
                50th, averaged over documents: how much better does the model
                predict once it has seen more of the document?
              </p>
              <p>
                Compute it for <code>gpt2-small</code> on ~50 documents of ≥600
                tokens. Then recompute it with your top induction head mean-ablated.
              </p>
              <p>
                Success check: the base score is clearly negative (loss at token
                500 is lower than at token 50), and ablating induction heads
                shrinks the magnitude measurably more than ablating a random head
                of the same layer.
              </p>
            </>
          ),
          hint: (
            <p>
              Use <code>model(tokens, return_type=&quot;loss&quot;,
              loss_per_token=True)</code> so you get a per-position loss array,
              then index positions 50 and 500. Average over documents before
              taking the difference, and report a standard error — with 50
              documents the noise is not negligible.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should find: GPT-2 small has a solidly negative
                in-context learning score, ablating a single induction head moves
                it a little, and ablating several moves it a lot. One head rarely
                owns the capability.
              </p>
              <p>
                The honest reading of the result — and the reason this problem is
                here rather than a quiz question — is that the effect is a{" "}
                <em>fraction</em>, not a total. Olsson et al. can show near-total
                dependence in small attention-only models; in a 12-layer model
                with MLPs you are measuring a contribution among several. Write
                down the fraction you measure. Resisting the urge to round it up
                to &ldquo;induction heads cause in-context learning&rdquo; is the
                skill this module is training.
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
              Why do interpretability papers talk about{" "}
              <M>{String.raw`W_{QK} = W_Q^\top W_K`}</M> rather than about{" "}
              <M>{String.raw`W_Q`}</M> and <M>{String.raw`W_K`}</M> separately?
            </>
          ),
          choices: [
            {
              text: "Because the individual matrices carry gauge freedom — you can transform one and inverse-transform the other with no change to the model — while the product is determined.",
              correct: true,
              explain:
                "Substituting W_Q → W_Q R and W_K → W_K R^{-T} leaves the product and therefore the model unchanged. Anything you 'discover' in W_Q alone might be an artifact of an arbitrary basis choice.",
            },
            {
              text: "Because the product is cheaper to compute than the two matrices.",
              explain:
                "It is the opposite: materializing a 768×768 product (or worse, its 50k×50k vocabulary version) is far more expensive than keeping the low-rank factors. This is a conceptual choice, not a performance one.",
            },
            {
              text: "Because W_Q and W_K are tied to each other during training.",
              explain:
                "They are separate parameters trained independently. What ties them is that they only ever appear together in the forward pass.",
            },
            {
              text: "Because the softmax makes the individual matrices non-differentiable.",
              explain:
                "Softmax is smooth and both matrices receive gradients normally. Differentiability is not the issue; identifiability is.",
            },
          ],
        },
        {
          id: "q2",
          prompt: <>Which kind of composition creates a virtual attention head?</>,
          choices: [
            {
              text: "V-composition, giving a composite with OV matrix W_OV^{H1}W_OV^{H0} and attention pattern A^{H1}A^{H0}.",
              correct: true,
              explain:
                "Only the value path adds a new OV term to the path expansion. The composite acts exactly like a head that does not exist as a set of parameters anywhere in the model.",
            },
            {
              text: "K-composition, because it is how induction heads work.",
              explain:
                "Induction heads really do use K-composition, and it is arguably the most important composition in the field — but it changes where H1 attends, not what it moves. No new OV term appears.",
            },
            {
              text: "Q-composition, because queries determine the head's behaviour.",
              explain:
                "Q-composition also changes the attention pattern rather than the OV circuit. 'Determines behaviour' is not the criterion; adding an OV term to the path expansion is.",
            },
            {
              text: "All three equally — any composition produces a virtual head.",
              explain:
                "This conflates two things the framework carefully separates: changing where attention goes (Q, K) and creating a new linear map from input to output (V).",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A one-layer attention-only model is shown{" "}
              <code>[A][B] … [A]</code> with tokens it has never seen adjacent in
              training. Can it predict <code>[B]</code>?
            </>
          ),
          choices: [
            {
              text: "No — deciding where to attend can only depend on token identities, so nothing can point attention at 'the position after the earlier copy of my token'.",
              correct: true,
              explain:
                "The QK circuit reads embeddings, so 'attend to the successor of a match' is not expressible: you need one head to write 'my predecessor was X' before another can query on it. This capability boundary is a crisp prediction of the algebra.",
            },
            {
              text: "Yes, if the head has enough heads in that single layer.",
              explain:
                "Heads in a layer are parallel and additive; none can read another's output. Adding heads widens what one layer can do, but two sequential attention operations remain out of reach.",
            },
            {
              text: "Yes — one-layer models learn skip-trigrams, and this is a skip-trigram.",
              explain:
                "Skip-trigrams are of the form '…A…B → C', with C fixed at training time. Induction needs C to be read out of the context, which is exactly the part a skip-trigram cannot do.",
            },
            {
              text: "Only if the tokens appeared adjacent during training.",
              explain:
                "That case is a memorized bigram, which is a different mechanism entirely — and the premise rules it out. The whole interest of induction is that it works on novel pairs.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              In the induction circuit, what does the previous-token head
              contribute?
            </>
          ),
          choices: [
            {
              text: "It writes 'the token before me was T' into each position, which becomes the induction head's key.",
              correct: true,
              explain:
                "That is the K-composition. Once a position advertises its predecessor, a query built from the current token can find the right match, and the OV circuit copies out whatever is at that position.",
            },
            {
              text: "It copies the answer token forward so the induction head can output it.",
              explain:
                "The answer is copied by the induction head's own OV circuit at the very end. The previous-token head runs at every position, long before anything is known about which one is the match.",
            },
            {
              text: "It suppresses attention to irrelevant positions.",
              explain:
                "It does no suppressing — it attends to exactly one position (the previous one) and copies. Suppression heads exist in other circuits, notably S-inhibition in IOI, but not here.",
            },
            {
              text: "It provides the query, which the induction head matches against token embeddings.",
              explain:
                "The direction is backwards. The query comes from the destination's current token; the previous-token head's output is what the keys are built from.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Olsson et al. report a &ldquo;phase change&rdquo; early in training.
              What is the most defensible summary of the finding?
            </>
          ),
          choices: [
            {
              text: "A narrow window where induction heads form, in-context learning ability appears, and the loss curve visibly bends — with strong mechanistic evidence in small attention-only models and correlational evidence at scale.",
              correct: true,
              explain:
                "This is the paper's own framing. The co-occurrence is robust and the causal story is demonstrated in small models; the authors are explicit that the extrapolation to large models rests on correlation and analogy.",
            },
            {
              text: "Proof that induction heads are the sole cause of in-context learning in all transformers.",
              explain:
                "Far stronger than the evidence supports, and stronger than the authors claim. Large-model induction heads also do fuzzy matching that is not the crisp toy circuit, and other mechanisms contribute.",
            },
            {
              text: "A training instability that better hyperparameters remove.",
              explain:
                "It is not an instability; the loss improves. And it is robust across architectures and scales, which is precisely what makes it interesting rather than a tuning artifact.",
            },
            {
              text: "Evidence that models memorize training bigrams during a specific window.",
              explain:
                "Memorization is what induction is contrasted against — the capability is demonstrated on random token sequences that appear in no training corpus.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Both <M>{String.raw`W_{QK}`}</M> and <M>{String.raw`W_{OV}`}</M> have
              rank at most <M>{String.raw`d_{\text{head}} = 64`}</M> in a
              768-dimensional stream. What is the interpretability consequence?
            </>
          ),
          choices: [
            {
              text: "Each head reads and writes only a small subspace, which forces specialization and makes 'which subspace does this head use' a meaningful question.",
              correct: true,
              explain:
                "The bottleneck is why heads end up with describable jobs, and why composition can be measured as subspace overlap rather than as a wiring diagram.",
            },
            {
              text: "The head can be perfectly reconstructed from 64 training examples.",
              explain:
                "Rank constrains the map's expressiveness, not how many inputs identify it. This confuses parameter structure with sample complexity.",
            },
            {
              text: "The head's output is always 64-dimensional, so it cannot affect the logits.",
              explain:
                "The output lives in a ≤64-dimensional subspace of the 768-dimensional stream, and the unembedding reads that subspace like any other. Low rank does not mean low impact.",
            },
            {
              text: "It means attention patterns are low rank, so at most 64 positions can be attended to.",
              explain:
                "The attention pattern is a softmax over positions and is not rank-limited by d_head in that way. The rank bound is on the matrices, not the number of attendable positions.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              You want to claim head 5.5 is an induction head. Which single piece
              of evidence is strongest?
            </>
          ),
          choices: [
            {
              text: "On repeated random-token sequences it attends to the position after the earlier copy of the current token, and mean-ablating the previous-token head that feeds it destroys that pattern.",
              correct: true,
              explain:
                "This pairs the behavioural signature (on data where memorization is impossible) with a causal test of the mechanism that is supposed to produce it. Both halves matter.",
            },
            {
              text: "Its attention pattern on a repeated sentence of real English shows a clear off-diagonal stripe.",
              explain:
                "Suggestive, but on real text a head could produce the same stripe from ordinary language statistics. Random tokens are the control that rules that out.",
            },
            {
              text: "Its OV circuit has mostly positive eigenvalues, so it is a copying head.",
              explain:
                "Necessary but not sufficient: many heads copy. Copying is the OV half; being an induction head also requires the QK half to point at the successor of a match.",
            },
            {
              text: "Ablating it increases loss on natural text.",
              explain:
                "Almost any head increases loss when ablated. Non-specific evidence cannot distinguish induction from any other useful computation.",
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
          The <em>Mathematical Framework</em> is dense and worth three sittings.
          Read it with the composition widget open. Nanda&apos;s walkthrough is
          the single best study aid for it — treat it as the lecture that
          accompanies the text.
        </p>
      ),
      readings: [
        {
          title: "A Mathematical Framework for Transformer Circuits",
          authors: "Nelson Elhage, Neel Nanda, Catherine Olsson, Tom Henighan, Nicholas Joseph, Ben Mann, Amanda Askell, et al. (Anthropic)",
          year: 2021,
          url: "https://transformer-circuits.pub/2021/framework/index.html",
          kind: "paper",
          time: "3 sittings",
          essential: true,
          note: "Sitting 1: the summary, 'Transformer Overview', and the zero-layer and one-layer sections — stop after the skip-trigram bugs, they are the best intuition pump in the paper. Sitting 2: two-layer models, composition, and induction heads. Sitting 3: the 'Summarizing OV/QK matrices' and 'Virtual weights' subsections, plus the appendix on notation. Skip the detailed model-specific results on a first pass. If the tensor-product notation slows you down, ignore it — every claim is also stated in ordinary matrix terms.",
        },
        {
          title: "A Walkthrough of A Mathematical Framework for Transformer Circuits",
          authors: "Neel Nanda",
          year: 2022,
          url: "https://www.youtube.com/watch?v=KV5gbOmHbjU",
          kind: "video",
          time: "3h (skimmable)",
          essential: true,
          note: "A co-author reading the paper aloud and explaining what each part is actually for, including which parts he thinks are over-engineered. Watch it alongside your second sitting, at 1.5× speed, pausing at the composition section. Worth more than a third re-read of the text.",
        },
        {
          title: "In-context Learning and Induction Heads",
          authors: "Catherine Olsson, Nelson Elhage, Neel Nanda, Nicholas Joseph, Nova DasSarma, Tom Henighan, et al. (Anthropic)",
          year: 2022,
          url: "https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html",
          kind: "paper",
          time: "2h",
          essential: true,
          note: "Read §1–4 as the curriculum suggests: the definitions, the phase change, and arguments 1–3. Then jump to the 'What we are not claiming' discussion, which is where the paper's intellectual honesty lives and where you learn how to calibrate a claim like this. The per-argument confidence table is a model for how to present uncertain evidence.",
        },
        {
          title: "Transformer Circuits: exercises",
          authors: "Anthropic",
          year: 2021,
          url: "https://transformer-circuits.pub/2021/exercises/index.html",
          kind: "course",
          time: "2h",
          note: "Short exercises written to accompany the framework, including several on QK/OV algebra and composition. Do these instead of re-reading if the algebra has not landed — they are quick and they target exactly the confusions the paper produces.",
        },
        {
          title: "TransformerLens: Main Demo",
          authors: "Neel Nanda, Joseph Bloom and contributors",
          year: "ongoing",
          url: "https://colab.research.google.com/github/TransformerLensOrg/TransformerLens/blob/main/demos/Main_Demo.ipynb",
          kind: "tool",
          time: "1.5h (do-along)",
          note: "Run this before attempting the code problems. The induction-head section of the demo does roughly what the problem set asks, so use it to check your setup, then close it and write your own version — the debugging is the point.",
        },
        {
          title: "Many-shot Jailbreaking",
          authors: "Cem Anil, Esin Durmus, Mrinank Sharma, Joe Benton, Sandipan Kundu, Joshua Batson, et al. (Anthropic)",
          year: 2024,
          url: "https://www.anthropic.com/research/many-shot-jailbreaking",
          kind: "paper",
          time: "40 min",
          note: "The safety consequence of everything in this module, and short. Look for the scaling plots: attack effectiveness follows a power law in the number of in-context examples, and gets worse with model scale. Read it as 'in-context learning is a capability, and capabilities do not come with an alignment guarantee'.",
        },
        {
          title: "A Comprehensive Mechanistic Interpretability Explainer & Glossary",
          authors: "Neel Nanda",
          year: 2022,
          url: "https://www.neelnanda.io/mechanistic-interpretability/glossary",
          kind: "blog",
          time: "reference",
          note: "Keep open. The entries for 'composition', 'virtual weights', 'induction head', 'direct logit attribution' and 'privileged basis' are the ones you will hit in this module.",
        },
      ],
    },
  ],
};

export default mod;
