import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { SuperpositionTrainer } from "./SuperpositionTrainer";
import { PhaseDiagram } from "./PhaseDiagram";

const mod: CourseModule = {
  id: "3.3",
  slug: "superposition",
  title: "Superposition: Toy Models",
  part: 3,
  tagline: "Why models cram more features than dimensions into their activations — the field's central obstacle.",
  estMinutes: 240,
  objectives: [
      "State the linear representation hypothesis precisely",
      "Predict when superposition appears from sparsity and importance",
      "Replicate the toy-model phase diagram and read its feature geometry"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "linear-representation",
      title: "Features are directions",
      body: (
        <>
          <p>
            Everything you have done so far — logit lens, probes, steering,
            reading off attention heads — quietly assumed one thing: that the
            model&apos;s concepts live in <em>directions</em>. It is worth making
            the assumption explicit, because it is the load-bearing hypothesis of
            the entire field, and because the rest of this module is about the
            complication that follows from it.
          </p>
          <Term word="linear representation hypothesis">
            A network represents a feature as a direction in activation space,
            and represents multiple simultaneous features by <em>adding</em>{" "}
            their directions. An activation is approximately a sparse linear
            combination of feature vectors,{" "}
            <M>{String.raw`a \approx \sum_i x_i\, f_i`}</M>, where{" "}
            <M>{String.raw`x_i \geq 0`}</M> is how strongly feature <M>i</M> is
            present and <M>{String.raw`f_i`}</M> is its direction.
          </Term>
          <p>
            The evidence is circumstantial but broad. Word embeddings support
            vector arithmetic. Linear probes work. Adding a vector to the
            residual stream shifts behaviour in a semantically coherent way
            (Module 5.1). Sparse autoencoders — which assume exactly this
            structure — find dictionaries that reconstruct activations well and
            whose elements are frequently interpretable (Module 3.4). None of
            this proves the hypothesis; all of it would be surprising if it were
            badly wrong.
          </p>
          <p>
            One immediate consequence, and it is the fork in the road:{" "}
            <strong>directions need not be axis-aligned</strong>. There is no
            law that says feature 7 lives along neuron 7.
          </p>
          <Term word="privileged basis">
            A basis the architecture treats specially. MLP hidden layers have one
            — the elementwise nonlinearity acts on individual coordinates, so
            neurons are meaningfully distinguishable from arbitrary rotations of
            them. The <em>residual stream</em> has no privileged basis: nothing
            in a transformer acts on residual-stream coordinates individually
            (LayerNorm is close to rotation-equivariant), so you should expect
            residual-stream features to sit at arbitrary angles.
          </Term>
          <Figure caption="Two ways five features could live in a two-dimensional space. Left: each feature gets its own axis — but only two fit, and three features are simply not represented. Right: five directions, none orthogonal, all represented, all interfering with each other. The second picture is what training actually produces when features are sparse.">
            <svg
              viewBox="0 0 480 190"
              className="w-full max-w-[480px]"
              role="img"
              aria-label="Orthogonal storage of two features versus five non-orthogonal directions"
            >
              {/* left */}
              <circle cx={105} cy={95} r={62} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
              <line x1={105} y1={95} x2={167} y2={95} stroke="var(--series-1)" strokeWidth={2.5} />
              <line x1={105} y1={95} x2={105} y2={33} stroke="var(--series-2)" strokeWidth={2.5} />
              <text x={173} y={99} fontSize={11} fill="var(--series-1)" className="font-mono">f₀</text>
              <text x={99} y={27} fontSize={11} fill="var(--series-2)" className="font-mono">f₁</text>
              <text x={105} y={178} fontSize={11} textAnchor="middle" fill="var(--text-secondary)">
                one dimension per feature
              </text>
              <text x={105} y={165} fontSize={10} textAnchor="middle" fill="var(--text-muted)">
                f₂, f₃, f₄: not represented
              </text>

              {/* right */}
              {[0, 1, 2, 3, 4].map((i) => {
                const ang = (-90 + i * 72) * (Math.PI / 180);
                const x = 355 + 62 * Math.cos(ang);
                const y = 95 + 62 * Math.sin(ang);
                const lx = 355 + 78 * Math.cos(ang);
                const ly = 95 + 78 * Math.sin(ang);
                return (
                  <g key={i}>
                    <line x1={355} y1={95} x2={x} y2={y} stroke={`var(--series-${i + 1})`} strokeWidth={2.5} />
                    <text x={lx} y={ly + 4} fontSize={11} textAnchor="middle" fill={`var(--series-${i + 1})`} className="font-mono">
                      f{i}
                    </text>
                  </g>
                );
              })}
              <circle cx={355} cy={95} r={62} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
              <text x={355} y={178} fontSize={11} textAnchor="middle" fill="var(--text-secondary)">
                five features, two dimensions
              </text>
              <text x={355} y={165} fontSize={10} textAnchor="middle" fill="var(--text-muted)">
                all represented, all interfering
              </text>
            </svg>
          </Figure>
          <Term word="superposition">
            A layer representing more features than it has dimensions, by placing
            them in directions that are not mutually orthogonal and tolerating
            the resulting interference.
          </Term>
          <Term word="polysemanticity">
            The symptom you observe: a single neuron responds to several
            unrelated things. Superposition is the leading explanation, though
            not the only possible one — a neuron could also be polysemantic
            because the feature you have in mind is simply not the model&apos;s
            feature.
          </Term>
          <KeyIdea>
            Superposition is not a bug and not an artifact of small models. It is
            what a capacity-limited network <em>should</em> do when the world it
            models contains far more distinguishable things than the network has
            dimensions, and when those things rarely occur at once. The rest of
            this module is about exactly when the trade is worth it.
          </KeyIdea>
          <Note kind="note" title="How settled is this?">
            The one-feature-one-direction picture is a strong working hypothesis,
            not a theorem, and it has known exceptions. Engels et al. found
            genuinely multi-dimensional features — days of the week and months
            arranged as circles, where no single direction captures the
            structure. Park et al. argue the right notion of &ldquo;direction&rdquo;
            depends on a causal inner product rather than the naive one. Treat
            &ldquo;features are directions&rdquo; the way physicists treat the
            ideal gas law: extremely useful, occasionally wrong, and you should
            know which.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "toy-model",
      title: "The toy model, and the deal it makes",
      body: (
        <>
          <p>
            Elhage et al. built the smallest system that can exhibit the
            phenomenon, so that everything about it could be understood. Here it
            is in full.
          </p>
          <p>
            Take <M>n</M> features. Each one is <strong>sparse</strong> — zero
            with probability <M>S</M>, and otherwise uniform on{" "}
            <M>{String.raw`[0,1]`}</M> — and each has an{" "}
            <strong>importance</strong> <M>{String.raw`I_i`}</M> saying how much
            the loss cares about reconstructing it. Squeeze them through{" "}
            <M>{String.raw`m < n`}</M> dimensions and ask for them back:
          </p>
          <MB>{String.raw`h = W x, \qquad \hat{x} = \mathrm{ReLU}\big(W^\top h + b\big) = \mathrm{ReLU}\big(W^\top W x + b\big)`}</MB>
          <MB>{String.raw`\mathcal{L} = \mathbb{E}_x\left[\sum_{i=1}^{n} I_i \,(x_i - \hat{x}_i)^2\right]`}</MB>
          <p>
            Term by term: <M>{String.raw`W \in \mathbb{R}^{m \times n}`}</M> has
            one column per feature, and <strong>that column is the direction the
            feature is stored in</strong>. Encoding and decoding share the same
            matrix, so the model cannot cheat by using a clever decoder. The bias{" "}
            <M>b</M> and the ReLU are the only nonlinearity, and they turn out to
            matter enormously.
          </p>
          <p>
            Notice what this model deliberately is <em>not</em>. There is no
            attention, no depth, no language. It is a pure question about{" "}
            <strong>representation</strong>: given a bottleneck, what does
            gradient descent choose to store, and how?
          </p>
          <Figure caption="Reading WᵀW is the whole game. Diagonal entries say how strongly each feature is stored; off-diagonal entries are interference — the signal that leaks from feature j into the reconstruction of feature i. Orthogonal storage means a diagonal matrix; superposition means an off-diagonal you decided to live with.">
            <svg
              viewBox="0 0 500 130"
              className="w-full max-w-[500px]"
              role="img"
              aria-label="Diagram of x mapped through W to h and back through W transpose"
            >
              {[
                { x: 30, label: "x", sub: "n features, sparse", c: "var(--series-1)", h: 90 },
                { x: 190, label: "h", sub: "m dims", c: "var(--series-3)", h: 40 },
                { x: 350, label: "x̂", sub: "reconstruction", c: "var(--series-2)", h: 90 },
              ].map((box) => (
                <g key={box.label}>
                  <rect
                    x={box.x}
                    y={60 - box.h / 2}
                    width={38}
                    height={box.h}
                    rx={5}
                    fill="var(--surface-2)"
                    stroke={box.c}
                    strokeWidth={1.6}
                  />
                  <text x={box.x + 19} y={64} fontSize={14} textAnchor="middle" fill="var(--text-primary)" className="font-mono">
                    {box.label}
                  </text>
                  <text x={box.x + 19} y={118} fontSize={9} textAnchor="middle" fill="var(--text-muted)">
                    {box.sub}
                  </text>
                </g>
              ))}
              <defs>
                <marker id="tm-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-secondary)" />
                </marker>
              </defs>
              <line x1={70} y1={60} x2={186} y2={60} stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#tm-arrow)" />
              <text x={128} y={50} fontSize={11} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
                W
              </text>
              <line x1={230} y1={60} x2={346} y2={60} stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#tm-arrow)" />
              <text x={288} y={50} fontSize={11} textAnchor="middle" fill="var(--text-secondary)" className="font-mono">
                ReLU(Wᵀ· + b)
              </text>
              <text x={430} y={64} fontSize={11} fill="var(--text-muted)" className="font-mono">
                loss = Σ Iᵢ(xᵢ−x̂ᵢ)²
              </text>
            </svg>
          </Figure>
          <p>
            The model faces a trade with two sides.{" "}
            <strong>Representing more features</strong> reduces the loss on the
            features you would otherwise ignore entirely.{" "}
            <strong>Non-orthogonal directions cause interference</strong>: when
            feature <M>j</M> fires, every feature whose direction is not
            perpendicular to it picks up a spurious signal{" "}
            <M>{String.raw`(f_i \cdot f_j) x_j`}</M>, and that costs loss too.
          </p>
          <KeyIdea>
            <strong>Sparsity sets the exchange rate.</strong> Interference only
            costs you when two non-orthogonal features fire at the same time. If
            each feature is active 1% of the time, a given pair collides 0.01% of
            the time. The benefit of representing a feature scales with how often
            it appears; the cost of interference scales with how often
            <em> pairs</em> appear. Sparsity crushes the second faster than the
            first, so past some point the model should always take the deal.
          </KeyIdea>
          <p>
            The ReLU and the bias are the model&apos;s defence. Train it at high
            sparsity and you will see <M>{String.raw`b_i`}</M> go{" "}
            <em>negative</em> and <M>{String.raw`\|W_i\| > 1`}</M>. That
            combination is a threshold filter: small interference lands below
            zero and gets clipped away entirely, while a genuine activation is
            large enough to survive the negative bias — and the enlarged norm
            compensates for it. You can watch both numbers appear in the widget
            below.
          </p>
          <Note kind="note" title="Why importance is not a nuisance parameter">
            Real features are wildly unequal: some change the loss a lot, most
            barely at all. The importance weights <M>{String.raw`I_i`}</M> are how
            the toy model represents that, and they turn out to be one of the two
            axes of the phase diagram. A model with a bottleneck does not merely
            decide <em>how</em> to store features — it decides <em>which ones to
            store at all</em>, and that decision is made on the basis of
            importance.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "geometry",
      title: "Phase changes and feature geometry",
      body: (
        <>
          <p>
            Here is the result that made this paper the field&apos;s gateway
            drug. Sweep sparsity and relative importance, train a model at every
            point, and the outcome is not a smooth degradation. It is a{" "}
            <strong>phase diagram</strong> with sharp regions.
          </p>
          <Figure caption="The smallest interesting case: two features, one hidden dimension. Each cell is a separately trained model — 576 of them, 6000 Adam steps each, best of three random restarts, with a 3×3 mode filter to remove single-cell training noise. This is a real sweep, not a redrawing of the paper's figure, and it reproduces the paper's structure: at low sparsity the model picks the more important feature and discards the other; past a sparsity threshold it stores both in opposite directions and eats the interference.">
            <PhaseDiagram />
          </Figure>
          <p>
            Read it as a decision. On the left — dense features — the model
            behaves like PCA: it keeps whichever feature is more important and
            throws the other away. On the right — sparse features — it stores
            both in the same one-dimensional space,{" "}
            <strong>antipodally</strong>, at 180°. The two regions meet at a
            boundary that moves with relative importance: the less the second
            feature matters, the more sparsity you need before it is worth
            representing at all.
          </p>
          <p>
            The transition is <em>sharp</em>. Cross the boundary and the solution
            reorganizes rather than deforming. That is a phase change in the
            physics sense, and it is the first hint that these systems have
            discrete structure worth naming.
          </p>
          <KeyIdea>
            Superposition is not &ldquo;a bit of noise in the representation&rdquo;.
            It is a distinct regime the model enters when sparsity is high
            enough, with its own geometry, and models move between regimes
            abruptly.
          </KeyIdea>
          <p>
            Go up to five features in two dimensions and the geometry gets
            genuinely beautiful. As you raise sparsity you pass through a
            sequence of arrangements:
          </p>
          <ul>
            <li>
              <strong>Two orthogonal features</strong>, the rest discarded — the
              dense regime. Dimensionality per feature: 1.
            </li>
            <li>
              <strong>Antipodal pairs</strong> (the paper calls a pair sharing an
              axis a <em>digon</em>): four features on two axes, 0.5 dimensions
              each.
            </li>
            <li>
              <strong>Pentagon</strong>: all five features at 72°, 2/5 = 0.4
              dimensions each — the maximum-spread arrangement of five directions
              in a plane.
            </li>
          </ul>
          <p>
            The paper measures this with a per-feature dimensionality
          </p>
          <MB>{String.raw`D_i = \frac{\|W_i\|^2}{\sum_{j} \big(\hat{W_i} \cdot W_j\big)^2}`}</MB>
          <p>
            which reads 1 for a feature with its own orthogonal dimension, 1/2
            for half of an antipodal pair, 2/5 for a member of a pentagon, and 0
            for a feature that was not stored. Plot it across a sparsity sweep in
            a bigger model and the values do not spread out smoothly — they{" "}
            <strong>stick</strong> at particular fractions, with visible gaps
            between them. Those fractions correspond to uniform polytopes:
            digons, triangles, tetrahedra, square antiprisms. The model is
            solving something close to a Thomson problem — spread <M>n</M> points
            on a sphere so they repel — and Thomson problems have discrete
            answers.
          </p>
          <Note kind="warning" title="Do not over-read the polytopes">
            The clean geometry appears when features are equally important and
            uncorrelated. Introduce correlation and the picture changes
            qualitatively: correlated features prefer to sit near each other
            (sometimes collapsing into one direction), anticorrelated features
            prefer antipodal pairs, and the tidy polytopes give way to
            &ldquo;tegum products&rdquo; of smaller structures in orthogonal
            subspaces. Real features are correlated. Treat the polytopes as
            evidence that discrete structure exists, not as a prediction about
            GPT-2.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "computation-and-the-wall",
      title: "Computation in superposition, and why this is the wall",
      body: (
        <>
          <p>
            So far superposition is a storage story. The harder claim — and the
            one that decides whether interpretability is difficult or
            near-impossible — is that models also <strong>compute</strong> in
            superposition.
          </p>
          <p>
            Elhage et al. demonstrate it on the smallest possible task: a network
            with fewer neurons than features learns to compute the absolute value
            of every input feature, with neurons that each participate in several
            of these computations at once. Nothing about the mechanism required
            one neuron per operation.
          </p>
          <KeyIdea>
            If computation happens in superposition, then a neuron is not a unit
            of meaning and a circuit diagram over neurons is a diagram over the
            wrong objects. You would be trying to read a program whose variables
            have been packed into overlapping registers by a compiler that was
            optimizing for space and did not leave a symbol table.
          </KeyIdea>
          <p>
            This is why so much of what you would naively try does not work:
          </p>
          <ul>
            <li>
              <strong>Neuron-level interpretability degrades.</strong> Look at a
              neuron&apos;s top activating examples and you get a story; look at
              the rest of its activation range and you get three more stories.
              The neuron was never one thing.
            </li>
            <li>
              <strong>Enumeration is impossible.</strong> If a layer with{" "}
              <M>{String.raw`d`}</M> dimensions can hold far more than{" "}
              <M>{String.raw`d`}</M> features — and it can, because you can pack
              exponentially many nearly-orthogonal directions into{" "}
              <M>d</M> dimensions — then &ldquo;list the features&rdquo; has no
              obvious stopping point.
            </li>
            <li>
              <strong>Ablation results get harder to read.</strong> Zeroing a
              neuron removes a slice of several features at once, so a clean
              behavioural change does not localize to a clean concept.
            </li>
          </ul>
          <Note kind="safety" title="Why this is the safety crux, not just a research inconvenience">
            The auditing question is: <em>does this model contain a mechanism for
            something we would not sanction?</em> Answering it requires being
            able to decompose the model into parts and check them. Superposition
            says the parts are not where you can see them — they are packed into
            a basis nobody chose, in numbers that may exceed the dimension count
            by orders of magnitude.
            <br />
            <br />
            The specific worry is not that a dangerous feature is hidden on
            purpose. It is that a rare, high-importance feature is exactly the
            kind the toy model tells you will be stored in superposition:
            important enough to be worth representing, sparse enough that the
            interference is cheap. A behaviour that fires on one input in a
            million is nearly invisible to evals and, before dictionary learning,
            was nearly invisible to interpretability too. Module 3.4 is the
            field&apos;s answer, and Module 5.5 is where you find out how well it
            works in an actual audit.
          </Note>
          <p>
            One honest caveat about the whole framework: the toy model is a
            deliberately impoverished system, and the argument from it to real
            transformers is an argument from plausibility plus a growing pile of
            corroborating evidence — polysemantic neurons everywhere, sparse
            autoencoders finding far more features than dimensions, models with
            an architecture that discourages superposition (Softmax Linear Units)
            becoming more interpretable at a cost. It is a good theory. It is not
            a measurement of GPT-4.
          </p>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Watch the phase transition happen",
      body: (
        <>
          <p>
            This is the real model, not a simulation of one. Five features, two
            hidden dimensions, hand-written gradients, Adam, 512 samples per
            step, about 500 steps per second in your browser. The five arrows are
            the columns of <M>W</M> — the direction each feature is stored in.
            The heatmap is <M>{String.raw`W^\top W`}</M>, so the off-diagonal
            cells are the interference the model has agreed to live with. The
            panel at the bottom fires one feature on its own and shows you what
            comes back out.
          </p>
          <SuperpositionTrainer />
          <p>
            Things to try: (1) Start dense (S = 0) and let it settle: two arrows
            at 90°, dimensionality 1.00 each, three features with norm ~0 — the
            model has thrown them away. Now drag sparsity to about 0.7 and watch
            four arrows snap into two antipodal pairs at dimensionality 0.50.
            Keep going to 0.95 and the fifth arrow appears as the pentagon forms
            at 0.40 = 2/5. (2) With the pentagon formed, look at the bias column:
            every <M>{String.raw`b_i`}</M> is negative and every{" "}
            <M>{String.raw`\|W_i\|`}</M> is above 1. Fire a single feature in the
            bottom panel and you will see why — the neighbours receive real
            interference and the ReLU clips it to zero. (3) Set the importance
            decay to 0.5 at moderate sparsity: the model now allocates
            deliberately, giving <M>{String.raw`f_0`}</M> a clean dedicated
            direction and forcing the cheap features to share. Superposition is
            not uniform; it is an allocation decision.
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
          The antipodal derivation and the phase-diagram replication are the two
          that matter — they are the difference between having read this paper
          and having understood it. Budget an afternoon for the replication; it
          is also capstone project #2, so what you build here you keep.
        </p>
      ),
      problems: [
        {
          id: "antipodal-derivation",
          kind: "pencil",
          title: "When do two antipodal features beat one dedicated dimension?",
          prompt: (
            <>
              <p>
                Work the smallest case by hand: <M>{String.raw`n = 2`}</M>{" "}
                features, <M>{String.raw`m = 1`}</M> hidden dimension. To keep the
                algebra clean, use <strong>binary</strong> features: each{" "}
                <M>{String.raw`x_i \in \{0, 1\}`}</M>, independently equal to 1
                with probability <M>{String.raw`p = 1 - S`}</M>. Importances are{" "}
                <M>{String.raw`I_1 = 1`}</M> and{" "}
                <M>{String.raw`I_2 = r \le 1`}</M>.
              </p>
              <p>Compare two candidate solutions:</p>
              <ul>
                <li>
                  <strong>A (dedicated):</strong>{" "}
                  <M>{String.raw`W = (1, 0)`}</M>, <M>{String.raw`b = 0`}</M>.
                </li>
                <li>
                  <strong>B (antipodal):</strong>{" "}
                  <M>{String.raw`W = (1, -1)`}</M>, <M>{String.raw`b = 0`}</M>.
                </li>
              </ul>
              <p>
                Compute the expected loss of each and find the condition on{" "}
                <M>p</M> and <M>r</M> under which B wins. Then say what the
                condition predicts as <M>{String.raw`r \to 0`}</M>, and check the
                prediction against the phase diagram above.
              </p>
            </>
          ),
          hint: (
            <p>
              For B, enumerate the four possible inputs. Note that{" "}
              <M>{String.raw`\hat{x} = \mathrm{ReLU}(W^\top W x)`}</M> — write out{" "}
              <M>{String.raw`W^\top W`}</M> for each candidate and apply it to
              each input. The interesting case is the one where both features
              fire.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Solution A.</strong>{" "}
                <M>{String.raw`W^\top W = \begin{pmatrix}1 & 0\\ 0 & 0\end{pmatrix}`}</M>,
                so <M>{String.raw`\hat{x} = (x_1, 0)`}</M>. Feature 1 is perfect;
                feature 2 is always reconstructed as 0, so it contributes an error
                of 1 whenever it fires:
              </p>
              <MB>{String.raw`\mathcal{L}_A = 1\cdot 0 + r\cdot \mathbb{E}[x_2^2] = r\,p`}</MB>
              <p>
                <strong>Solution B.</strong>{" "}
                <M>{String.raw`W^\top W = \begin{pmatrix}1 & -1\\ -1 & 1\end{pmatrix}`}</M>,
                so{" "}
                <M>{String.raw`\hat{x} = \big(\mathrm{ReLU}(x_1 - x_2),\ \mathrm{ReLU}(x_2 - x_1)\big)`}</M>.
                Enumerate:
              </p>
              <ul>
                <li>
                  <M>{String.raw`(0,0)`}</M> → <M>{String.raw`(0,0)`}</M>. Exact.
                </li>
                <li>
                  <M>{String.raw`(1,0)`}</M> → <M>{String.raw`(1,0)`}</M>. Exact.
                </li>
                <li>
                  <M>{String.raw`(0,1)`}</M> → <M>{String.raw`(0,1)`}</M>. Exact.
                </li>
                <li>
                  <M>{String.raw`(1,1)`}</M> → <M>{String.raw`(0,0)`}</M>. Both
                  features wrong by 1. This is the collision.
                </li>
              </ul>
              <p>
                The collision happens with probability{" "}
                <M>{String.raw`p^2`}</M>, so
              </p>
              <MB>{String.raw`\mathcal{L}_B = p^2 \,(1 + r)`}</MB>
              <p>
                <strong>B wins when</strong>{" "}
                <M>{String.raw`p^2(1+r) < r\,p`}</M>, i.e.
              </p>
              <MB>{String.raw`p < \frac{r}{1+r} \qquad\Longleftrightarrow\qquad S > \frac{1}{1+r}`}</MB>
              <p>
                Read the result. Antipodal storage is a bet: you get both
                features for free <em>except</em> when they collide, and
                collisions cost double. Sparsity is what makes collisions rare
                enough for the bet to pay. At equal importance{" "}
                <M>{String.raw`r = 1`}</M> the threshold is{" "}
                <M>{String.raw`p < 1/2`}</M>. As{" "}
                <M>{String.raw`r \to 0`}</M> the threshold{" "}
                <M>{String.raw`p < r/(1+r) \to 0`}</M>: a worthless feature is
                never worth the interference at any achievable sparsity, which is
                exactly the widening &ldquo;f₁ only&rdquo; region at the bottom of
                the phase diagram.
              </p>
              <p>
                <strong>What the simplification costs you.</strong> Neither
                candidate is optimal in the real model. A better A would set{" "}
                <M>{String.raw`b_2`}</M> to the mean of <M>{String.raw`x_2`}</M>{" "}
                rather than reconstructing zero, and a better B would use a
                negative <M>b</M> and norms above 1 to suppress collisions rather
                than eat them. Uniform-valued rather than binary features move the
                boundary too. So the exact threshold in the trained sweep is not{" "}
                <M>{String.raw`1/(1+r)`}</M> — at{" "}
                <M>{String.raw`r=1`}</M> the sweep puts it nearer{" "}
                <M>{String.raw`S \approx 0.6`}</M> than{" "}
                <M>{String.raw`0.5`}</M>. What the derivation gets right is the
                shape: a threshold in sparsity, moving monotonically with relative
                importance, with a sharp switch between qualitatively different
                solutions rather than a blend.
              </p>
            </>
          ),
        },
        {
          id: "capacity-counting",
          kind: "pencil",
          title: "How many features actually fit?",
          prompt: (
            <>
              <p>
                Exactly <M>d</M> vectors can be mutually orthogonal in{" "}
                <M>{String.raw`\mathbb{R}^d`}</M>. How many can be{" "}
                <em>nearly</em> orthogonal?
              </p>
              <p>
                For two independent uniformly random unit vectors in{" "}
                <M>{String.raw`\mathbb{R}^d`}</M> with large <M>d</M>, their
                cosine similarity is approximately{" "}
                <M>{String.raw`\mathcal{N}(0, 1/d)`}</M>. Using that, estimate the
                largest <M>N</M> such that <M>N</M> random unit vectors in{" "}
                <M>{String.raw`d = 768`}</M> dimensions have{" "}
                <em>all</em> pairwise similarities below (a){" "}
                <M>{String.raw`\varepsilon = 0.2`}</M> and (b){" "}
                <M>{String.raw`\varepsilon = 0.3`}</M>.
              </p>
              <p>
                Then say what this implies for the question &ldquo;how many
                features can GPT-2 small&apos;s residual stream hold?&rdquo;
              </p>
            </>
          ),
          hint: (
            <p>
              There are <M>{String.raw`\binom{N}{2} \approx N^2/2`}</M> pairs.
              Set the expected number of violating pairs to 1 and solve. You will
              need <M>{String.raw`\Phi(-5.54) \approx 1.5\times 10^{-8}`}</M> and{" "}
              <M>{String.raw`\Phi(-8.31) \approx 5\times 10^{-17}`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                A pair violates the bound with probability{" "}
                <M>{String.raw`P(|\cos| > \varepsilon) \approx 2\Phi(-\varepsilon\sqrt{d})`}</M>.
                With <M>{String.raw`\sqrt{768} = 27.7`}</M>:
              </p>
              <p>
                <strong>(a)</strong>{" "}
                <M>{String.raw`\varepsilon\sqrt{d} = 5.54`}</M>, so{" "}
                <M>{String.raw`P \approx 3.0\times 10^{-8}`}</M>. Setting{" "}
                <M>{String.raw`(N^2/2)\,P = 1`}</M> gives{" "}
                <M>{String.raw`N \approx \sqrt{2/3.0\times10^{-8}} \approx 8{,}200`}</M>.
              </p>
              <p>
                <strong>(b)</strong>{" "}
                <M>{String.raw`\varepsilon\sqrt{d} = 8.31`}</M>, so{" "}
                <M>{String.raw`P \approx 1.0\times 10^{-16}`}</M> and{" "}
                <M>{String.raw`N \approx 1.4 \times 10^{8}`}</M>.
              </p>
              <p>
                So loosening the orthogonality requirement from
                &ldquo;perfect&rdquo; to &ldquo;within 0.3&rdquo; takes the
                capacity from 768 to roughly a hundred million. The count grows{" "}
                <em>exponentially</em> in <M>d</M> — this is the
                Johnson–Lindenstrauss regime, and it is the geometric fact that
                makes superposition possible at all.
              </p>
              <p>
                <strong>The implication, carefully.</strong> This is an upper
                bound on packing, not a claim about GPT-2. What the model actually
                stores is limited by interference costs, by feature sparsity, and
                by the loss it is minimizing — not by how many directions
                geometry permits. The right conclusion is negative and important:{" "}
                <em>you cannot bound the number of features by the number of
                dimensions</em>. Any interpretability method that assumes
                &ldquo;at most 768 things live here&rdquo; is assuming something
                false, which is precisely why sparse autoencoders are trained with
                dictionaries far wider than the layer they read.
              </p>
            </>
          ),
        },
        {
          id: "relu-filter",
          kind: "pencil",
          title: "Why the bias goes negative",
          prompt: (
            <>
              <p>
                In the widget, at high sparsity, every{" "}
                <M>{String.raw`b_i`}</M> settles negative and every{" "}
                <M>{String.raw`\|W_i\|`}</M> settles above 1. Explain both,
                quantitatively.
              </p>
              <p>
                Concretely: suppose feature <M>j</M> fires alone at magnitude 1,
                and <M>{String.raw`W_i \cdot W_j = c`}</M> with{" "}
                <M>{String.raw`0 < c < 1`}</M>. Write the pre-ReLU value at output{" "}
                <M>i</M>. What must <M>{String.raw`b_i`}</M> satisfy for the
                interference to be suppressed completely? And what does that
                choice cost when feature <M>i</M> itself fires at magnitude{" "}
                <M>{String.raw`x_i`}</M>?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                With <M>{String.raw`x = e_j`}</M>, the pre-ReLU value at output{" "}
                <M>i</M> is{" "}
                <M>{String.raw`z_i = (W^\top W x)_i + b_i = W_i \cdot W_j + b_i = c + b_i`}</M>.
                Interference is suppressed exactly when{" "}
                <M>{String.raw`z_i \le 0`}</M>, i.e.{" "}
                <M>{String.raw`b_i \le -c`}</M>. The ReLU then outputs 0 — a
                perfect reconstruction of &ldquo;feature <M>i</M> is off&rdquo;,
                for free.
              </p>
              <p>
                The cost appears when feature <M>i</M> does fire. Then{" "}
                <M>{String.raw`z_i = \|W_i\|^2 x_i + b_i`}</M>, and with{" "}
                <M>{String.raw`b_i \le -c`}</M> the reconstruction is short by{" "}
                <M>{String.raw`|b_i|`}</M> unless{" "}
                <M>{String.raw`\|W_i\|^2 > 1`}</M> makes up the difference. Setting{" "}
                <M>{String.raw`\|W_i\|^2 x_i + b_i = x_i`}</M> at a typical
                magnitude gives{" "}
                <M>{String.raw`\|W_i\|^2 \approx 1 + |b_i| / x_i > 1`}</M>. So the
                two observations are one mechanism: the negative bias is a
                threshold, and the inflated norm is the gain that pays for the
                threshold.
              </p>
              <p>
                Two things follow. First, the correction is exact for only one
                value of <M>{String.raw`x_i`}</M> — the model is fitting a linear
                map through a hinge, so it trades error across the magnitude
                range. Second, this only works while <M>c</M> is small relative
                to a typical activation. Push sparsity down and interference from
                several simultaneously firing features stacks up above the
                threshold, the filter fails, and the model retreats to storing
                fewer features. That is the phase boundary, seen from the
                inside.
              </p>
            </>
          ),
        },
        {
          id: "replicate-phase-diagram",
          kind: "code",
          title: "Replicate the phase diagram",
          prompt: (
            <>
              <p>
                Reproduce the figure in the geometry section from scratch in
                PyTorch or NumPy. This is capstone project #2 and the single most
                valuable exercise in Part 3.
              </p>
              <p>
                Implement the toy model — <M>{String.raw`h = Wx`}</M>,{" "}
                <M>{String.raw`\hat{x} = \mathrm{ReLU}(W^\top W x + b)`}</M>,{" "}
                <M>{String.raw`\mathcal{L} = \sum_i I_i (x_i - \hat{x}_i)^2`}</M>{" "}
                — with <M>{String.raw`n = 2`}</M>, <M>{String.raw`m = 1`}</M>.
                Sweep a grid: <M>{String.raw`1/(1-S)`}</M> log-spaced from 1 to
                100, and <M>{String.raw`I_2 / I_1`}</M> log-spaced from 0.2 to 5.
                Train each cell with Adam and classify it by which columns of{" "}
                <M>W</M> ended up with non-trivial norm.
              </p>
              <p>
                Success check: you get three clear regions — feature 1 only,
                feature 2 only, and both stored antipodally — with the
                superposition region occupying the sparse (right-hand) side and
                widening toward equal importance. Verify that in the
                superposition region the two weights have{" "}
                <em>opposite signs</em>.
              </p>
              <p>
                Then extend: <M>{String.raw`n = 5`}</M>,{" "}
                <M>{String.raw`m = 2`}</M>, sweep sparsity, and plot the five
                feature vectors at each setting. You should recover the
                orthogonal-pair → antipodal-pairs → pentagon sequence.
              </p>
            </>
          ),
          hint: (
            <>
              <p>
                Vectorize the sweep: train all grid cells at once as a batched
                model of shape <code>[n_cells, m, n]</code> with{" "}
                <code>torch.einsum</code>. On a laptop CPU that turns hours into
                a couple of minutes.
              </p>
              <p>
                Two bugs everyone hits. (1) Encoder and decoder must be the{" "}
                <em>same</em> <M>W</M> — if you use separate matrices you are
                training an ordinary autoencoder and the phase structure
                disappears. (2) Use enough steps: these models get stuck for
                hundreds of steps before reorganizing, and a short run reads as
                &ldquo;no phase transition&rdquo;. Run several random restarts per
                cell and keep the lowest-loss one.
              </p>
            </>
          ),
          solution: (
            <>
              <p>Batched reference implementation:</p>
              <pre>
                <code>{`import torch

def sweep(n=2, m=1, steps=6000, batch=512, lr=2e-2, device="cpu"):
    inv = torch.logspace(0, 2, 24)          # 1/(1-S), 1 .. 100
    S   = 1 - 1 / inv                       # sparsity
    rel = torch.logspace(-0.7, 0.7, 24)     # I2/I1, ~0.2 .. 5
    Sg, Rg = torch.meshgrid(S, rel, indexing="xy")
    C = Sg.numel()
    Sf, Rf = Sg.reshape(C, 1), Rg.reshape(C, 1)
    imp = torch.cat([torch.ones(C, 1), Rf], dim=1)          # [C, n]

    W = torch.randn(C, m, n, device=device) * 0.3
    b = torch.zeros(C, n, device=device)
    W.requires_grad_(); b.requires_grad_()
    opt = torch.optim.Adam([W, b], lr=lr)

    for _ in range(steps):
        x = torch.rand(C, batch, n, device=device)
        x = x * (torch.rand(C, batch, n, device=device) >= Sf[:, None, :])
        h = torch.einsum("cmn,cbn->cbm", W, x)
        xh = torch.relu(torch.einsum("cmn,cbm->cbn", W, h) + b[:, None, :])
        loss = (imp[:, None, :] * (x - xh) ** 2).sum(-1).mean(-1).sum()
        opt.zero_grad(); loss.backward(); opt.step()

    return W.detach(), S, rel

W, S, rel = sweep()
norms = W.norm(dim=1)                 # [C, n] — column norms
stored = norms > 0.3 * norms.max(dim=1, keepdim=True).values.clamp(min=0.5)
phase = stored[:, 0].long() + 2 * stored[:, 1].long()   # 1, 2 -> single; 3 -> both`}</code>
              </pre>
              <p>
                <strong>What you should see.</strong> A superposition region
                covering the right two-thirds of the plot, bounded on the left by
                a curve that dips toward the middle (equal importance) and rises
                at both extremes. At{" "}
                <M>{String.raw`I_2/I_1 = 1`}</M> the boundary sits near{" "}
                <M>{String.raw`1/(1-S) \approx 2.5`}</M>{" "}
                (<M>{String.raw`S \approx 0.6`}</M>); at{" "}
                <M>{String.raw`I_2/I_1 = 0.2`}</M> it moves out to{" "}
                <M>{String.raw`1/(1-S) \approx 6`}</M>. Inside the superposition
                region the two weights have opposite signs — print{" "}
                <code>torch.sign(W[..., 0] * W[..., 1])</code> and confirm it is
                −1 almost everywhere there. That sign is the antipodal
                arrangement, and confirming it is what turns &ldquo;both features
                are stored&rdquo; into &ldquo;stored the way the theory
                says&rdquo;.
              </p>
              <p>
                <strong>Expect noise.</strong> Individual cells near the boundary
                will land in the wrong phase, and the diagram in this module was
                smoothed with a 3×3 mode filter for exactly that reason. Report
                the raw version alongside the smoothed one; hiding the noise
                would misrepresent how sharp the transition is at the level of a
                single training run.
              </p>
              <p>
                For the <M>{String.raw`n=5, m=2`}</M> extension, plot the two rows
                of <M>W</M> as x and y coordinates of five arrows. The pentagon
                emerges above roughly <M>{String.raw`S = 0.85`}</M> with equal
                importances. Compute{" "}
                <M>{String.raw`D_i = \|W_i\|^2 / \sum_j (\hat{W_i}\cdot W_j)^2`}</M>{" "}
                and check it reads 0.40 for every feature — that is{" "}
                <M>{String.raw`m/n = 2/5`}</M>, the signature of uniform
                superposition.
              </p>
            </>
          ),
        },
        {
          id: "correlated-features",
          kind: "code",
          title: "Correlated and anticorrelated features",
          prompt: (
            <>
              <p>
                Real features are not independent. Extend your{" "}
                <M>{String.raw`n=4, m=2`}</M> model with a data generator that
                produces two <em>correlated pairs</em>: features 0 and 1 tend to
                fire together, features 2 and 3 tend to fire together, and the
                pairs are independent of each other.
              </p>
              <p>
                Then build the opposite: two <em>anticorrelated</em> pairs, where
                within each pair at most one feature fires at a time.
              </p>
              <p>
                Success check: you can state, with a plot, how the angle between
                the two members of a pair differs between the correlated and
                anticorrelated conditions, and explain the difference from the
                interference cost.
              </p>
            </>
          ),
          hint: (
            <p>
              For a correlated pair, sample one Bernoulli &ldquo;is this pair
              active&rdquo; variable and give both members values when it is on.
              For an anticorrelated pair, sample the pair activity, then pick
              which member fires. Keep the marginal firing rate of every feature
              the same across conditions or you are confounding correlation with
              sparsity.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Anticorrelated pairs go antipodal.</strong> If two
                features never fire together, placing them at 180° in a shared
                dimension costs literally nothing — the collision case has
                probability zero. This is the ideal case for superposition, and
                the model takes it eagerly, at sparsity levels where independent
                features would not yet share.
              </p>
              <p>
                <strong>Correlated pairs do the opposite.</strong> Features that
                fire together collide constantly, so sharing a dimension is
                expensive. The model puts correlated features in{" "}
                <em>orthogonal</em> directions when it can — and when the
                bottleneck is tight enough it does something more interesting: it
                collapses the pair, representing the two correlated features with
                nearly the same direction and effectively storing their sum as a
                single feature. Elhage et al. observe both behaviours and note
                the second is a plausible mechanism for the model to build
                higher-level features out of co-occurring lower-level ones.
              </p>
              <p>
                The structural result to take away: the model organizes into{" "}
                <strong>tegum products</strong> — groups of features that
                interact get their own orthogonal subspace, and the polytope
                geometry appears <em>within</em> each subspace rather than across
                the whole layer. If real features come in correlated clusters
                (they do), then real superposition is likely to be
                locally-structured rather than a single uniform packing, which
                matters for how you interpret what a sparse autoencoder recovers
                in Module 3.4.
              </p>
            </>
          ),
        },
        {
          id: "polysemantic-hunt",
          kind: "explore",
          title: "Find a polysemantic neuron",
          prompt: (
            <>
              <p>
                Open{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  Neuronpedia
                </a>{" "}
                and browse <em>neurons</em> (not SAE features) in a GPT-2 small
                MLP layer. Find one whose top activating examples clearly
                separate into two or more unrelated groups, and write down the
                groups.
              </p>
              <p>
                Then find the SAE features for the same layer that appear to
                cover those groups separately. Write two or three sentences on
                whether the SAE decomposition looks like it recovered what the
                neuron was mixing.
              </p>
            </>
          ),
          hint: (
            <p>
              Middle layers are the richest hunting ground. Do not stop at the
              top 5 examples — the second group often starts around the 10th or
              20th. If everything you look at seems monosemantic, you are
              probably looking at very high activations only.
            </p>
          ),
          solution: (
            <>
              <p>
                Polysemantic neurons are easy to find, which is itself the
                finding: if the one-neuron-one-concept picture were right, you
                would have to hunt for counterexamples rather than trip over
                them.
              </p>
              <p>
                On the SAE comparison, the honest answer is usually
                &ldquo;partly&rdquo;. You will often find features that cleanly
                capture one of the neuron&apos;s senses, and often fail to find a
                clean match for the others. That gap has a name in the literature
                — reconstruction error, sometimes called &ldquo;dark matter&rdquo;
                — and Module 3.4 covers what is known about it. Recording your
                honest hit rate now gives you a baseline to compare against once
                you have trained your own SAE.
              </p>
              <p>
                A caution worth internalizing: a neuron looking polysemantic is
                consistent with superposition, but it is also consistent with your
                categories being wrong. &ldquo;Fires on legal text and on
                chemistry&rdquo; might be one feature about formal register that
                you have not named. Superposition is the best explanation for the
                pattern in aggregate; it is not proven by any single neuron.
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
          prompt: <>What does superposition mean, precisely?</>,
          choices: [
            {
              text: "A layer represents more features than it has dimensions by using non-orthogonal directions and tolerating interference.",
              correct: true,
              explain:
                "Both halves matter: more features than dimensions, and the price paid in interference. Without the second half you are just describing a change of basis.",
            },
            {
              text: "Neurons respond to multiple unrelated inputs.",
              explain:
                "That is polysemanticity — the observable symptom. Superposition is the proposed explanation for it, and the two should be kept separate since a neuron can be polysemantic for other reasons.",
            },
            {
              text: "The model's activations are a quantum-mechanical superposition of states.",
              explain:
                "The name is an analogy about adding vectors. There is nothing quantum here; it is ordinary linear algebra in a bottleneck.",
            },
            {
              text: "Several layers compute the same feature redundantly.",
              explain:
                "That is redundancy across depth, a real and separate phenomenon (backup heads, for instance). Superposition is about packing within a single representation.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              Two features are stored antipodally in one dimension. Collisions
              cost double. Why is high sparsity what makes this worthwhile?
            </>
          ),
          choices: [
            {
              text: "The benefit scales with how often each feature fires, but the cost scales with how often a pair fires together — which falls quadratically as sparsity rises.",
              correct: true,
              explain:
                "This is the whole trade. With firing probability p, benefit ~ p and collision cost ~ p². Shrinking p shrinks the cost faster than the benefit, so past a threshold superposition wins.",
            },
            {
              text: "Sparse features have smaller magnitudes, so interference is smaller.",
              explain:
                "Sparsity here is about how often a feature is zero, not about how large it is when it fires. Magnitudes are drawn from the same distribution in either case.",
            },
            {
              text: "Sparse features are more important, so they justify the space.",
              explain:
                "Sparsity and importance are the two independent axes of the phase diagram. Conflating them loses the whole structure of the result.",
            },
            {
              text: "The ReLU removes interference entirely, so there is no cost at any sparsity.",
              explain:
                "The ReLU plus a negative bias removes interference below a threshold. When several non-orthogonal features fire at once the interference stacks up past the threshold — which is exactly why the dense regime exists.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              In the trained widget at high sparsity, every{" "}
              <M>{String.raw`b_i`}</M> is negative and every{" "}
              <M>{String.raw`\|W_i\|`}</M> exceeds 1. What is that combination
              doing?
            </>
          ),
          choices: [
            {
              text: "It is a threshold filter: the negative bias clips small interference to zero, and the enlarged norm restores the true signal that the bias would otherwise subtract.",
              correct: true,
              explain:
                "One mechanism in two numbers. The bias sets the cut-off, and the gain pays for it. This is the model's active defence against the interference it agreed to accept.",
            },
            {
              text: "The optimizer has not converged; both should approach 1 and 0.",
              explain:
                "They are stable across thousands of steps and across restarts. This is the solution, not a transient.",
            },
            {
              text: "It normalizes the hidden representation the way LayerNorm would.",
              explain:
                "There is no normalization in this model, and the effect is per-feature rather than per-vector. The mechanism is thresholding, not rescaling.",
            },
            {
              text: "It compensates for the loss weighting by importance.",
              explain:
                "Importance changes which features get stored and how strongly, but a negative bias appears even with perfectly uniform importances. The driver is sparsity, not the weighting.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              With five features in two dimensions at high sparsity and equal
              importance, the learned solution is a pentagon. What is the
              per-feature dimensionality?
            </>
          ),
          choices: [
            {
              text: "0.4 — that is 2/5, the m/n ratio, and it is the signature of uniform superposition.",
              correct: true,
              explain:
                "When every feature is treated identically, the two available dimensions are shared equally among the five, and D_i = ‖W_i‖² / Σ_j (Ŵ_i·W_j)² lands at exactly 2/5.",
            },
            {
              text: "1.0 — every feature is fully represented.",
              explain:
                "Every feature is represented, but not with a dimension of its own. D_i = 1 is the dedicated-orthogonal-dimension case, which is what you see at low sparsity for the top two features only.",
            },
            {
              text: "0.5 — five features cannot do better than half a dimension each.",
              explain:
                "0.5 is the antipodal-pair value, which is what four features in two dimensions gives you. The pentagon does better per feature count and worse per feature.",
            },
            {
              text: "0.2 — one over the number of features.",
              explain:
                "That would be the answer for five features in one dimension. The available budget is m = 2, so the shared value is 2/5.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Why can&apos;t you bound the number of features in a 768-dimensional
              residual stream at 768?
            </>
          ),
          choices: [
            {
              text: "Because near-orthogonal directions are exponentially more plentiful than orthogonal ones — millions of directions fit within a modest similarity tolerance.",
              correct: true,
              explain:
                "With cosine similarities of random unit vectors distributed as N(0, 1/d), the number of directions with all pairwise |cos| below 0.3 in 768 dimensions is on the order of 10⁸. That is the geometric fact superposition exploits.",
            },
            {
              text: "Because the residual stream grows during the forward pass.",
              explain:
                "Its dimension is fixed at d_model for the entire forward pass. What grows is what has been written into it, not the size of the space.",
            },
            {
              text: "Because features can be nonlinear, so the dimension count is irrelevant.",
              explain:
                "The linear representation hypothesis is exactly the assumption that they are directions. The argument for exceeding d does not need to abandon linearity — near-orthogonality is enough.",
            },
            {
              text: "Because each feature uses several neurons, so 768 neurons support 768/k features.",
              explain:
                "This gets the direction of the effect backwards: it would give you fewer features than dimensions, not more.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Your toy model at low sparsity with decaying importances stores two
              features orthogonally and gives three features norm ≈ 0. What
              happened to those three?
            </>
          ),
          choices: [
            {
              text: "The model declined to represent them: with dense features the interference cost exceeds the loss saved, so the least important ones are dropped entirely.",
              correct: true,
              explain:
                "In the dense regime the model behaves like PCA — it keeps the top-m most important directions and discards the rest. Whether a feature is represented at all is itself a decision the loss makes.",
            },
            {
              text: "They are stored in a rotated basis that the arrow plot cannot show.",
              explain:
                "The arrows are the literal columns of W; a near-zero norm means the column is near zero in every basis. Nothing is hidden by the choice of view.",
            },
            {
              text: "They are stored in the bias vector b.",
              explain:
                "The bias is a constant per output and carries no input-dependent information. It can encode the mean of a feature, not the feature.",
            },
            {
              text: "Training has not run long enough for them to appear.",
              explain:
                "They stay at zero indefinitely at this sparsity, and reappear immediately when you raise the sparsity slider. It is the data distribution, not the optimization, that decides.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              Why does superposition make interpretability specifically harder,
              rather than just tedious?
            </>
          ),
          choices: [
            {
              text: "It means the model's units of computation are not the units you can observe, and their number is not bounded by the dimension count — so neither reading neurons nor enumerating them is sound.",
              correct: true,
              explain:
                "Both the basis and the count are wrong. That is what forces a change of method — dictionary learning — rather than more careful looking.",
            },
            {
              text: "It makes activations larger, so numerical precision becomes a problem.",
              explain:
                "Magnitudes are unremarkable and precision is not the constraint. The difficulty is representational, not numerical.",
            },
            {
              text: "It means models are nonlinear, so linear tools cannot apply.",
              explain:
                "Superposition is a story about linear structure — features are still directions. Linear tools apply; they just need the right dictionary of directions, which is the SAE programme.",
            },
            {
              text: "It only affects small models, so results do not transfer to frontier systems.",
              explain:
                "The evidence points the other way: superposition is expected to be worse at scale, since larger models model more features relative to the dimensions available per layer.",
            },
          ],
        },
        {
          id: "q8",
          prompt: (
            <>
              Which claim about the toy models results is <em>over</em>-stated?
            </>
          ),
          choices: [
            {
              text: "Real language models store features in pentagons and tetrahedra.",
              correct: true,
              explain:
                "The polytopes appear under uniform importance and independent features. Real features are correlated and unequally important, which breaks the tidy geometry into locally-structured subspaces. The polytopes are evidence that discrete structure exists, not a prediction about GPT-2.",
            },
            {
              text: "Sparsity and importance jointly determine whether a feature is stored.",
              explain:
                "This is the central, well-supported result — it is exactly what the phase diagram shows, and it replicates easily.",
            },
            {
              text: "Networks can perform computation on features held in superposition, not merely store them.",
              explain:
                "Demonstrated directly in the paper on the absolute-value task with fewer neurons than features. It is a modest claim about small networks and it holds up.",
            },
            {
              text: "The number of features a layer represents is not bounded by its dimension.",
              explain:
                "This follows from near-orthogonal packing and is supported empirically by sparse autoencoders that recover far more features than the layer has dimensions.",
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
          This is your gateway paper. Read it properly — three sittings, with the
          widget open — and the rest of Part 3 becomes much easier. Everything
          else on this list is either a tool for doing that, or a check on
          believing it too hard.
        </p>
      ),
      readings: [
        {
          title: "Toy Models of Superposition",
          authors: "Nelson Elhage, Tristan Hume, Catherine Olsson, Nicholas Schiefer, Tom Henighan, Shauna Kravec, Zac Hatfield-Dodds, et al. (Anthropic)",
          year: 2022,
          url: "https://transformer-circuits.pub/2022/toy_model/index.html",
          kind: "paper",
          time: "3 sittings",
          essential: true,
          note: "Sitting 1 — 'Definitions and Motivation' plus 'Demonstrating Superposition': the setup, the linear-representation framing, and the first phase-change figures. Stop and train the widget until the pentagon appears before going on. Sitting 2 — 'Superposition as a Phase Change' and 'The Geometry of Superposition': the phase diagram, dimensionality per feature, the sticky fractions, and correlated features. This is the heart of the paper. Sitting 3 — 'Computation in Superposition', 'Strategic Picture', and the 'Related Work' discussion, which is where the authors say what they do and do not believe. Feel free to skip the learning-dynamics section on a first pass; come back to it after Module 3.4.",
        },
        {
          title: "Toy Models of Superposition — companion notebook",
          authors: "Anthropic",
          year: 2022,
          url: "https://colab.research.google.com/github/anthropics/toy-models-of-superposition/blob/main/toy_models.ipynb",
          kind: "tool",
          time: "1.5h (do-along)",
          essential: true,
          note: "The authors' own code. Use it to check your replication after you have written your own — not before. The batched-sweep pattern in it is the trick that makes the phase-diagram problem take minutes instead of hours, and it is worth reading even if you implement everything else yourself.",
        },
        {
          title: "Finding Neurons in a Haystack: Case Studies with Sparse Probing",
          authors: "Wes Gurnee, Neel Nanda, Matthew Pauly, Katherine Harvey, Dmitrii Troitskii, Dimitris Bertsimas",
          year: 2023,
          url: "https://arxiv.org/abs/2305.01610",
          kind: "paper",
          time: "45 min (skim)",
          note: "The empirical counterpart: evidence for superposition in real models rather than toys, using sparse probes to ask how many neurons a feature needs. Read the introduction, the method figure, and the case studies on language-identification and compound-word neurons. Look for the finding that some features really do get dedicated neurons — superposition is not universal, and knowing which features escape it is useful.",
        },
        {
          title: "Superposition, Memorization, and Double Descent",
          authors: "Tom Henighan, Shan Carter, Tristan Hume, Nelson Elhage, Robert Lasenby, Stanislav Fort, Nicholas Schiefer, Christopher Olah (Anthropic)",
          year: 2023,
          url: "https://transformer-circuits.pub/2023/toy-double-descent/index.html",
          kind: "paper",
          time: "1h",
          note: "Optional, and a genuinely surprising follow-up: the same toy model, trained on a finite dataset rather than a distribution, exhibits double descent — and the transition is visible as a change in what the model stores (data points vs generating features). Read it if you want to see how much mileage one toy has, or skip it and come back after Module 1.4.",
        },
        {
          title: "Softmax Linear Units",
          authors: "Nelson Elhage, Tristan Hume, Catherine Olsson, Neel Nanda, Tom Henighan, Scott Johnston, et al. (Anthropic)",
          year: 2022,
          url: "https://transformer-circuits.pub/2022/solu/index.html",
          kind: "paper",
          time: "1h",
          note: "The architectural attempt to discourage superposition: change the activation function so that fewer features fit, and see whether neurons become interpretable. They partly do — and the paper is unusually clear that the improvement may be partly cosmetic, with features pushed into LayerNorm rather than removed. Read §1–3 and the honest 'is this real?' discussion. The best available evidence that superposition is a real optimization pressure and not a story.",
        },
        {
          title: "Not All Language Model Features Are One-Dimensionally Linear",
          authors: "Joshua Engels, Isaac Liao, Eric J. Michaud, Wes Gurnee, Max Tegmark",
          year: 2024,
          url: "https://arxiv.org/abs/2405.14860",
          kind: "paper",
          time: "45 min",
          note: "The corrective. Some features are irreducibly multi-dimensional — days of the week and months form circles in activation space, and no single direction captures them. Read the introduction and the circular-features figures. It does not overturn the linear representation hypothesis; it tells you where the edges are, which is exactly what you want before building a research programme on top of it.",
        },
        {
          title: "The Linear Representation Hypothesis and the Geometry of Large Language Models",
          authors: "Kiho Park, Yo Joong Choe, Victor Veitch",
          year: 2024,
          url: "https://arxiv.org/abs/2311.03658",
          kind: "paper",
          time: "1h",
          note: "For when 'features are directions' starts to feel imprecise. The paper distinguishes directions used for representation from directions used for intervention, and shows the two are unified under a particular (causal) inner product. Mathematically heavier than the rest of this list — read the introduction and §2, and treat the rest as reference.",
        },
      ],
    },
  ],
};

export default mod;
