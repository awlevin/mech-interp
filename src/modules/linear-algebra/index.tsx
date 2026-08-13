import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { ProjectionPlayground } from "./ProjectionPlayground";
import { MatrixMapExplorer } from "./MatrixMapExplorer";
import { NearOrthogonalityLab } from "./NearOrthogonalityLab";

const mod: CourseModule = {
  id: "0.1",
  slug: "linear-algebra",
  title: "Linear Algebra as Geometry",
  part: 0,
  tagline: "Vectors as directions, matrices as maps, and why high-dimensional space makes superposition possible.",
  estMinutes: 150,
  objectives: [
      "Read a dot product as similarity and a matrix as a transformation of space",
      "Explain rank, projections, and SVD geometrically",
      "State why exponentially many almost-orthogonal directions fit in d dimensions"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "directions",
      title: "Directions, not lists of numbers",
      body: (
        <>
          <p>
            Every sentence you will read in an interpretability paper is about{" "}
            <strong>directions in activation space</strong>. &ldquo;The refusal
            direction.&rdquo; &ldquo;The feature points this way.&rdquo;
            &ldquo;This head writes into the residual stream.&rdquo; None of that
            means anything until a vector stops being a list of numbers and
            becomes an arrow.
          </p>
          <p>
            So: a vector is an arrow from the origin. Its <em>length</em> is how
            strongly something is present; its <em>direction</em> is what that
            something is. GPT-2 small carries a 768-dimensional arrow at every
            token position — impossible to picture, but every fact below is proved
            in 2-D and stays true in 768-D.
          </p>
          <Figure caption="Two vectors and the angle between them. The dot product packs both lengths and that angle into a single number — which is why it is the only similarity measure a transformer ever needs.">
            <svg viewBox="0 0 420 200" className="w-full max-w-[420px]" role="img" aria-label="Two vectors from a common origin with the angle between them marked">
              <defs>
                <marker id="la-fig1-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L7,3 L0,6 z" fill="var(--series-1)" />
                </marker>
                <marker id="la-fig1-b" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L7,3 L0,6 z" fill="var(--series-2)" />
                </marker>
              </defs>
              <line x1={40} y1={170} x2={400} y2={170} stroke="var(--border-strong)" />
              <line x1={40} y1={170} x2={40} y2={20} stroke="var(--border-strong)" />
              <line x1={40} y1={170} x2={250} y2={50} stroke="var(--series-1)" strokeWidth={3} markerEnd="url(#la-fig1-a)" />
              <line x1={40} y1={170} x2={300} y2={130} stroke="var(--series-2)" strokeWidth={3} markerEnd="url(#la-fig1-b)" />
              <path d="M100,136 A70,70 0 0,1 108,158" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} />
              <text x={112} y={150} fontSize={12} fill="var(--text-muted)" className="font-mono">θ</text>
              <text x={252} y={46} fontSize={12} fill="var(--text-primary)" className="font-mono">a</text>
              <text x={306} y={130} fontSize={12} fill="var(--text-primary)" className="font-mono">b</text>
              <text x={44} y={186} fontSize={11} fill="var(--text-muted)" className="font-mono">origin</text>
            </svg>
          </Figure>
          <p>
            The <strong>dot product</strong> of two vectors multiplies matching
            coordinates and adds them up. Geometrically it is something better:
          </p>
          <MB>{String.raw`a \cdot b = \sum_i a_i b_i = \lVert a \rVert \, \lVert b \rVert \cos\theta`}</MB>
          <p>
            Read the right-hand side term by term.{" "}
            <M>{String.raw`\lVert a \rVert`}</M> and{" "}
            <M>{String.raw`\lVert b \rVert`}</M> are the two lengths;{" "}
            <M>{String.raw`\cos\theta`}</M> is pure direction agreement — 1 for
            parallel, 0 for perpendicular, −1 for opposite. Big dot product means{" "}
            <em>long and aligned</em>. Zero means <em>perpendicular</em>: as far
            as this measurement is concerned, the two vectors are about unrelated
            things.
          </p>
          <Term word="unit vector">
            A vector scaled to length 1, written <M>{String.raw`\hat{u} = u/\lVert u \rVert`}</M>.
            Unit vectors are pure direction with the magnitude divided out, which
            is why feature directions are almost always reported normalised.
          </Term>
          <Term word="cosine similarity">
            <M>{String.raw`\cos\theta = \frac{a \cdot b}{\lVert a \rVert \lVert b \rVert}`}</M>{" "}
            — the dot product with both lengths removed. It answers &ldquo;same
            direction?&rdquo; without caring &ldquo;how much?&rdquo;. Every time
            this course compares two features, it is this number.
          </Term>
          <KeyIdea>
            The dot product is the transformer&apos;s universal similarity
            operation. An attention score is a dot product of a query and a key.
            A logit is a dot product of the residual stream with an unembedding
            row. A linear probe is a dot product with a learned direction. Learn
            to read <M>{String.raw`a \cdot b`}</M> as &ldquo;how much of{" "}
            <M>b</M> is in <M>a</M>&rdquo; and half of mechanistic
            interpretability becomes readable.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "learn",
      id: "projection",
      title: "Projection: the shadow and the leftover",
      body: (
        <>
          <p>
            Ask a sharper question than &ldquo;are these similar?&rdquo;: <em>how
            much of this vector lies along that direction, and what is left
            over?</em> That is a <strong>projection</strong>, and it is the
            single most-used operation in interpretability practice.
          </p>
          <p>
            Shine a light straight down onto a line through the origin. The
            shadow the vector <M>v</M> casts on that line is
          </p>
          <MB>{String.raw`\mathrm{proj}_{\hat{u}}(v) = (v \cdot \hat{u})\,\hat{u}`}</MB>
          <p>
            Two pieces: <M>{String.raw`v \cdot \hat{u}`}</M> is a{" "}
            <em>number</em> — the signed length of the shadow — and multiplying
            it by <M>{String.raw`\hat{u}`}</M> turns that number back into a
            vector pointing along the line. Whatever is left,
          </p>
          <MB>{String.raw`r = v - (v \cdot \hat{u})\,\hat{u}`}</MB>
          <p>
            is perpendicular to <M>{String.raw`\hat{u}`}</M> — always, for any{" "}
            <M>v</M>. You can check it in one line:{" "}
            <M>{String.raw`r \cdot \hat{u} = v \cdot \hat{u} - (v \cdot \hat{u})(\hat{u} \cdot \hat{u}) = 0`}</M>,
            because <M>{String.raw`\hat{u} \cdot \hat{u} = 1`}</M>. So every
            vector splits cleanly into <em>the part along a direction</em> and{" "}
            <em>the part that knows nothing about it</em>.
          </p>
          <KeyIdea>
            Splitting a vector into &ldquo;along <M>{String.raw`\hat{u}`}</M>&rdquo;
            plus &ldquo;perpendicular to <M>{String.raw`\hat{u}`}</M>&rdquo; is
            what makes it sane to talk about one feature at a time inside a
            768-dimensional activation. The residual stream carries hundreds of
            things at once; a projection is the instrument that reads out just
            one of them.
          </KeyIdea>
          <p>
            The same formula, written as a matrix, is{" "}
            <M>{String.raw`P = \hat{u}\hat{u}^{\mathsf{T}}`}</M>. Applying{" "}
            <M>P</M> keeps the component along <M>{String.raw`\hat{u}`}</M> and
            deletes everything else; applying <M>{String.raw`I - P`}</M> does the
            reverse — it <em>erases</em> that direction and keeps the rest. That
            second operation is exactly how directional ablation and concept
            erasure work in Part 5: you do not delete a neuron, you project the
            activation onto the subspace orthogonal to a direction and let the
            model continue.
          </p>
          <Note kind="note" title="Why the word &ldquo;subspace&rdquo; keeps appearing">
            A line through the origin is a 1-D subspace; a plane through the
            origin is 2-D. The formula generalises: with an orthonormal basis{" "}
            <M>{String.raw`\hat{u}_1, \dots, \hat{u}_k`}</M> of a subspace, the
            projection is the sum of the individual shadows,{" "}
            <M>{String.raw`\sum_j (v \cdot \hat{u}_j)\hat{u}_j`}</M>. When a paper
            says a behaviour lives in a &ldquo;low-dimensional subspace,&rdquo;
            this is the object it means.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "matrices",
      title: "Matrices are maps, and rank is how much they flatten",
      body: (
        <>
          <p>
            A matrix is not a grid of numbers. A matrix is a{" "}
            <strong>function that moves the whole space at once</strong>, in the
            most restrained way possible: grid lines stay straight and evenly
            spaced, and the origin stays put. That restraint is the entire
            content of the word <em>linear</em>.
          </p>
          <p>
            Here is the trick that makes matrices readable at a glance:{" "}
            <strong>the columns of <M>M</M> are where the basis vectors land</strong>.
            Column 1 is <M>{String.raw`M\hat{e}_1`}</M>, column 2 is{" "}
            <M>{String.raw`M\hat{e}_2`}</M>. Everything else follows, because
            every input is a combination of basis vectors and linear maps respect
            combinations:
          </p>
          <MB>{String.raw`M(x_1 \hat{e}_1 + x_2 \hat{e}_2) = x_1 (M\hat{e}_1) + x_2 (M\hat{e}_2)`}</MB>
          <Term word="rank">
            The dimension of the output space the map can actually reach. A 2×2
            matrix of rank 2 spreads the plane over the plane; rank 1 squashes
            the entire plane onto a single line; rank 0 sends everything to the
            origin. Rank is information capacity: whatever the map flattens away
            is gone and cannot be recovered.
          </Term>
          <p>
            <strong>A rank-1 matrix is an outer product</strong>:{" "}
            <M>{String.raw`M = u v^{\mathsf{T}}`}</M>, so that{" "}
            <M>{String.raw`Mx = u\,(v \cdot x)`}</M>. Read that right-to-left and
            it is a two-stage machine — <em>measure</em> the input against{" "}
            <M>v</M> (a dot product, one number), then <em>write</em> that number
            out along <M>u</M>. Read-then-write is the shape of nearly every
            component you will meet later: attention heads, MLP neurons, SAE
            features, LoRA updates.
          </p>
          <KeyIdea>
            Low rank is everywhere in transformers, and it is deliberate. In
            GPT-2 small each attention head uses <M>{String.raw`d_{\text{head}} = 64`}</M>{" "}
            inside a <M>{String.raw`d_{\text{model}} = 768`}</M> stream, so the
            head&apos;s effective 768×768 matrices have rank at most 64. A head
            cannot touch the other 704 directions. That constraint is why heads
            can be studied one at a time.
          </KeyIdea>
          <p>
            The <strong>singular value decomposition</strong> says that <em>every</em>{" "}
            matrix, no matter how ugly, is three simple steps:
          </p>
          <MB>{String.raw`M = U \Sigma V^{\mathsf{T}} \quad\text{(rotate, stretch along axes, rotate again)}`}</MB>
          <p>
            <M>{String.raw`V^{\mathsf{T}}`}</M> rotates so that the interesting
            directions line up with the axes; <M>{String.raw`\Sigma`}</M> is
            diagonal and just stretches axis by axis, by amounts{" "}
            <M>{String.raw`\sigma_1 \ge \sigma_2 \ge \dots \ge 0`}</M> called{" "}
            <strong>singular values</strong>; <M>U</M> rotates the result into
            its final pose. In pictures: the unit circle always becomes an
            ellipse, and the singular values are the ellipse&apos;s semi-axes.
            The number of non-zero singular values <em>is</em> the rank, and a
            small-but-nonzero <M>{String.raw`\sigma`}</M> means &ldquo;this
            direction survives, but faintly.&rdquo;
          </p>
          <Note kind="note" title="Where you will meet this again">
            Module 2.2: LoRA fine-tunes with{" "}
            <M>{String.raw`\Delta W = BA`}</M>, a deliberately rank-<M>r</M>{" "}
            update — a few directions of change instead of millions. Module 3.2:
            the QK circuit is the low-rank matrix{" "}
            <M>{String.raw`W_Q^{\mathsf{T}} W_K`}</M>, one bilinear form scoring
            every token pair. Same geometry both times.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "high-d",
      title: "High-dimensional space is much roomier than it looks",
      body: (
        <>
          <p>
            Now the fact that makes modern interpretability necessary. In 2-D you
            can fit exactly 2 mutually perpendicular directions. In 768-D you can
            fit exactly 768. That sounds like a hard ceiling on how many separate
            things a model can represent — and it would be, if features had to be{" "}
            <em>exactly</em> perpendicular.
          </p>
          <p>
            They do not. Drop the requirement to <em>almost</em> perpendicular
            and the ceiling explodes. Take two random unit vectors in <M>d</M>{" "}
            dimensions; their cosine similarity has mean 0 and standard deviation
          </p>
          <MB>{String.raw`\mathrm{sd}(\cos\theta) = \frac{1}{\sqrt{d}}`}</MB>
          <p>
            At <M>d = 2</M> that is 0.71 — random directions are all over the
            place. At <M>d = 768</M> it is 0.036. At{" "}
            <M>{String.raw`d = 12{,}288`}</M> (GPT-3 scale) it is 0.009. Two
            directions drawn at random in a big space are <em>already</em> nearly
            orthogonal, without anyone arranging it. And the tail is thin: the
            probability that a random pair exceeds <M>{String.raw`\varepsilon`}</M>{" "}
            falls off like{" "}
            <M>{String.raw`e^{-d\varepsilon^2/2}`}</M>, exponentially in the
            dimension.
          </p>
          <p>
            Run the arithmetic the other way. If you tolerate interference up to{" "}
            <M>{String.raw`\varepsilon`}</M>, the number of directions you can
            pack grows <strong>exponentially</strong> in <M>d</M> rather than
            linearly. This is the geometric content of the{" "}
            <strong>Johnson–Lindenstrauss lemma</strong>: any <M>N</M> points can
            be squeezed into about{" "}
            <M>{String.raw`O(\log N / \varepsilon^2)`}</M> dimensions with all
            distances preserved to within <M>{String.raw`\varepsilon`}</M>. The
            cost of an extra feature is not a whole dimension; it is a
            logarithm.
          </p>
          <Figure caption="Same 8 directions, two dimensions. On the left (d = 2) they crowd each other: neighbours have cosine similarity 0.71. On the right, schematically, the same count in a higher-dimensional space — the pairwise angles all approach 90° and the vectors stop interfering. The explore widget below measures this for real.">
            <svg viewBox="0 0 420 170" className="w-full max-w-[420px]" role="img" aria-label="Eight crowded directions in two dimensions versus eight nearly orthogonal directions in higher dimensions">
              <g>
                {Array.from({ length: 8 }).map((_, i) => {
                  const ang = (i / 8) * Math.PI * 2;
                  return (
                    <line
                      key={i}
                      x1={105}
                      y1={90}
                      x2={105 + 62 * Math.cos(ang)}
                      y2={90 - 62 * Math.sin(ang)}
                      stroke="var(--series-1)"
                      strokeWidth={2}
                    />
                  );
                })}
                <text x={105} y={162} fontSize={11} textAnchor="middle" fill="var(--text-muted)" className="font-mono">
                  d = 2: cos ≈ 0.71
                </text>
              </g>
              <g>
                {Array.from({ length: 8 }).map((_, i) => {
                  const ang = (i / 8) * Math.PI * 2;
                  const jitter = 0.5 + 0.5 * Math.cos(3.7 * i);
                  return (
                    <line
                      key={i}
                      x1={310}
                      y1={90}
                      x2={310 + (26 + 40 * jitter) * Math.cos(ang)}
                      y2={90 - (26 + 40 * jitter) * Math.sin(ang) * 0.35}
                      stroke="var(--series-3)"
                      strokeWidth={2}
                      opacity={0.5 + 0.5 * jitter}
                    />
                  );
                })}
                <text x={310} y={162} fontSize={11} textAnchor="middle" fill="var(--text-muted)" className="font-mono">
                  d = 768: cos ≈ 0.04
                </text>
              </g>
            </svg>
          </Figure>
          <KeyIdea>
            A <M>d</M>-dimensional space holds <em>d</em> exactly-orthogonal
            directions but exponentially many <em>almost</em>-orthogonal ones. So
            a model that has more things to represent than it has dimensions is
            not stuck: it can store them as nearly-orthogonal directions and pay
            a small interference tax. That is <strong>superposition</strong>, and
            Module 3.3 is where you will watch a model actually choose to do it.
          </KeyIdea>
          <Note kind="safety">
            This geometry is why interpretability is hard rather than merely
            tedious. If every feature owned a neuron, auditing a model would be
            reading a very long list. Because features are directions that do not
            line up with neurons — and there are more of them than there are
            neurons — you cannot audit a model by inspecting its coordinates. You
            have to <em>find</em> the directions first, which is what probes,
            sparse autoencoders, and circuit tracing all exist to do. Every
            safety technique later in this course is downstream of the fact you
            just measured.
          </Note>
          <Note kind="warning" title="A caveat worth keeping">
            &ldquo;Features are directions&rdquo; is the <em>linear
            representation hypothesis</em>. It is extremely productive and
            heavily evidenced, but it is a hypothesis, not a theorem — there is
            active work on circular, multi-dimensional, and non-linear feature
            structure. Hold it as a strong default that could be refined.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Play: shadows, maps, and crowded space",
      body: (
        <>
          <p>
            Three toys, in the order the lesson built them. The first makes the
            dot product physical. The second turns four numbers into a
            transformation you can watch flatten space. The third is the one that
            matters for the rest of the course: it measures how orthogonal random
            directions become as you add dimensions.
          </p>
          <ProjectionPlayground />
          <MatrixMapExplorer />
          <NearOrthogonalityLab />
          <p>
            Things to try: (1) In the projection playground, drag <M>v</M> until
            the shadow disappears — note that the dot product hits 0 exactly when
            the arrow is perpendicular, and that <M>v</M> can be enormous and
            still score zero. (2) In the matrix map, press{" "}
            <strong>rank 1</strong> and then nudge any single slider by 0.05:
            watch the ellipse pop open from a segment, i.e. rank 1 is a
            measure-zero accident that real weight matrices never sit exactly on.
            (3) In the crowded-space lab, set <M>d = 2</M> and look at the
            histogram, then walk <M>d</M> up to 1024 and watch the whole
            distribution collapse into a spike at zero; check the measured spread
            against <M>{String.raw`1/\sqrt{d}`}</M> in the footer at every step.
            (4) Set <M>{String.raw`\varepsilon = 0.2`}</M> and press{" "}
            <strong>Pack directions</strong> at <M>d = 8</M>, then <M>d = 64</M>{" "}
            — the number of directions you can keep grows far faster than{" "}
            <M>d</M> does.
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
          Do the pencil problems by hand, on paper, with actual arithmetic — the
          point is to make these operations physical before they show up buried
          inside an attention head. Budget 20 minutes for the code problem.
        </p>
      ),
      problems: [
        {
          id: "projection-by-hand",
          kind: "pencil",
          title: "Shadow and leftover",
          prompt: (
            <>
              <p>
                Let <M>{String.raw`v = (3, 4)`}</M> and{" "}
                <M>{String.raw`u = (2, 1)`}</M>.
              </p>
              <ol>
                <li>Normalise <M>u</M> to a unit vector <M>{String.raw`\hat{u}`}</M>.</li>
                <li>
                  Compute <M>{String.raw`v \cdot \hat{u}`}</M>, the projection{" "}
                  <M>{String.raw`p = (v \cdot \hat{u})\hat{u}`}</M>, and the
                  residual <M>{String.raw`r = v - p`}</M>.
                </li>
                <li>
                  Verify <M>{String.raw`r \cdot \hat{u} = 0`}</M> and that{" "}
                  <M>{String.raw`\lVert p \rVert^2 + \lVert r \rVert^2 = \lVert v \rVert^2`}</M>.
                </li>
                <li>
                  What is the cosine similarity between <M>v</M> and <M>u</M>?
                  Does it change if you double <M>v</M>? Does the dot product?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              <M>{String.raw`\lVert u \rVert = \sqrt{5} \approx 2.236`}</M>. Keep
              the <M>{String.raw`\sqrt{5}`}</M> symbolic as long as you can — the
              numbers come out clean.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`\hat{u} = (2,1)/\sqrt{5}`}</M>. Then{" "}
                <M>{String.raw`v \cdot \hat{u} = (3\cdot 2 + 4 \cdot 1)/\sqrt{5} = 10/\sqrt{5} = 2\sqrt{5} \approx 4.47`}</M>.
              </p>
              <p>
                <M>{String.raw`p = 2\sqrt{5}\cdot(2,1)/\sqrt{5} = (4, 2)`}</M>,
                so <M>{String.raw`r = (3,4)-(4,2) = (-1, 2)`}</M>. Check:{" "}
                <M>{String.raw`r \cdot u = -2 + 2 = 0`}</M> ✓. Lengths:{" "}
                <M>{String.raw`\lVert p \rVert^2 = 20`}</M>,{" "}
                <M>{String.raw`\lVert r \rVert^2 = 5`}</M>, total 25 ={" "}
                <M>{String.raw`\lVert v \rVert^2`}</M> ✓ — Pythagoras, because
                the two parts are perpendicular.
              </p>
              <p>
                <M>{String.raw`\cos\theta = 10/(5\sqrt{5}) \approx 0.894`}</M>.
                Doubling <M>v</M> doubles the dot product (to 20) but leaves the
                cosine unchanged: cosine is about direction only. This is exactly
                why feature <em>directions</em> and feature{" "}
                <em>activations</em> are reported separately in SAE work.
              </p>
            </>
          ),
        },
        {
          id: "attention-2x2",
          kind: "pencil",
          title: "An attention score, at 2×2 scale",
          prompt: (
            <>
              <p>
                Two token vectors (as columns):{" "}
                <M>{String.raw`x_1 = (1, 2)`}</M>,{" "}
                <M>{String.raw`x_2 = (3, -1)`}</M>. Weights{" "}
                <M>{String.raw`W_Q = \begin{bmatrix} 1 & 0 \\ 1 & 1\end{bmatrix}`}</M>,{" "}
                <M>{String.raw`W_K = \begin{bmatrix} 0 & 1 \\ 1 & 0\end{bmatrix}`}</M>.
              </p>
              <ol>
                <li>
                  Compute the queries <M>{String.raw`q_i = W_Q x_i`}</M> and keys{" "}
                  <M>{String.raw`k_j = W_K x_j`}</M>, then the 2×2 score matrix{" "}
                  <M>{String.raw`S_{ij} = q_i \cdot k_j / \sqrt{2}`}</M>.
                </li>
                <li>
                  Apply a causal mask (position 1 may not look at position 2) and
                  softmax each row. What does token 1 attend to? Token 2?
                </li>
                <li>
                  Now compute{" "}
                  <M>{String.raw`A = W_Q^{\mathsf{T}} W_K`}</M> and verify{" "}
                  <M>{String.raw`x_1^{\mathsf{T}} A x_2`}</M> equals the
                  unscaled score you already found. What does that tell you about
                  how many matrices an attention head really has?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              For part 3, use{" "}
              <M>{String.raw`q_i \cdot k_j = (W_Q x_i)^{\mathsf{T}}(W_K x_j) = x_i^{\mathsf{T}} W_Q^{\mathsf{T}} W_K x_j`}</M>{" "}
              — the two weight matrices never appear apart.
            </p>
          ),
          solution: (
            <>
              <p>
                Queries: <M>{String.raw`q_1 = (1, 3)`}</M>,{" "}
                <M>{String.raw`q_2 = (3, 2)`}</M>. Keys:{" "}
                <M>{String.raw`k_1 = (2, 1)`}</M>,{" "}
                <M>{String.raw`k_2 = (-1, 3)`}</M>. Unscaled scores{" "}
                <M>{String.raw`q_i \cdot k_j`}</M>:{" "}
                <M>{String.raw`\begin{bmatrix} 5 & 8 \\ 8 & 3 \end{bmatrix}`}</M>,
                so <M>{String.raw`S = \begin{bmatrix} 3.54 & 5.66 \\ 5.66 & 2.12 \end{bmatrix}`}</M>{" "}
                after dividing by <M>{String.raw`\sqrt{2} \approx 1.414`}</M>.
              </p>
              <p>
                With the causal mask, row 1 has only one live entry, so token 1
                attends to itself with probability 1 — always true of the first
                position. Row 2 is a softmax of (5.66, 2.12): the difference is
                3.54, so{" "}
                <M>{String.raw`p = (1/(1+e^{-3.54}),\, 1/(1+e^{3.54})) \approx (0.97, 0.03)`}</M>.
                Token 2 looks almost entirely back at token 1.
              </p>
              <p>
                <M>{String.raw`A = W_Q^{\mathsf{T}} W_K = \begin{bmatrix} 1 & 1 \\ 0 & 1\end{bmatrix}\begin{bmatrix} 0 & 1 \\ 1 & 0\end{bmatrix} = \begin{bmatrix} 1 & 1 \\ 1 & 0\end{bmatrix}`}</M>.
                Then <M>{String.raw`A x_2 = (2, 3)`}</M> and{" "}
                <M>{String.raw`x_1 \cdot (2,3) = 8`}</M> ✓. The lesson:{" "}
                <M>{String.raw`W_Q`}</M> and <M>{String.raw`W_K`}</M> only ever
                act through their product, so the head has <em>one</em> effective
                bilinear matrix (the QK circuit), of rank at most{" "}
                <M>{String.raw`d_{\text{head}}`}</M>. Splitting it into Q and K is
                a computational convenience, not two separate mechanisms.
              </p>
            </>
          ),
        },
        {
          id: "rank-one",
          kind: "pencil",
          title: "Rank 1 means outer product (and LoRA is the payoff)",
          prompt: (
            <>
              <p>
                Let <M>{String.raw`M = \begin{bmatrix} 2 & 4 \\ 1 & 2\end{bmatrix}`}</M>.
              </p>
              <ol>
                <li>
                  Show <M>{String.raw`\det M = 0`}</M> and write <M>M</M> as an
                  outer product <M>{String.raw`u v^{\mathsf{T}}`}</M>. Which line
                  is the image? Which line is sent to zero?
                </li>
                <li>
                  Prove in one sentence that{" "}
                  <M>{String.raw`\Delta W = BA`}</M> with <M>B</M> of shape{" "}
                  <M>{String.raw`d \times r`}</M> and <M>A</M> of shape{" "}
                  <M>{String.raw`r \times d`}</M> has rank at most <M>r</M>.
                </li>
                <li>
                  For <M>{String.raw`d = 4096`}</M> and <M>{String.raw`r = 8`}</M>,
                  how many parameters does <M>{String.raw`\Delta W = BA`}</M>{" "}
                  have compared with a full <M>{String.raw`d \times d`}</M> update?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              For part 1, notice that the second row is exactly half the first.
              For part 2, think about where the output of <M>B</M> can possibly
              live.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`\det M = 2\cdot 2 - 4 \cdot 1 = 0`}</M>, and{" "}
                <M>{String.raw`M = (2,1)^{\mathsf{T}}(1,2)`}</M>: check entry{" "}
                <M>{String.raw`M_{12} = 2 \cdot 2 = 4`}</M> ✓. So{" "}
                <M>{String.raw`Mx = (2,1)\,[(1,2)\cdot x]`}</M> — every output is
                a multiple of <M>{String.raw`(2,1)`}</M>, which is the image
                line. The kernel is everything with{" "}
                <M>{String.raw`(1,2)\cdot x = 0`}</M>, i.e. the line spanned by{" "}
                <M>{String.raw`(2,-1)`}</M>; check{" "}
                <M>{String.raw`M(2,-1) = (0,0)`}</M> ✓.
              </p>
              <p>
                Every output of <M>{String.raw`BA`}</M> is <M>B</M> applied to
                something, so the image sits inside the column space of{" "}
                <M>B</M>, which has at most <M>r</M> dimensions — hence rank{" "}
                <M>{String.raw`\le r`}</M>.
              </p>
              <p>
                <M>{String.raw`2 \times 4096 \times 8 = 65{,}536`}</M> parameters
                versus <M>{String.raw`4096^2 = 16{,}777{,}216`}</M> — about
                0.4%. LoRA is the bet that the useful part of a fine-tune lives
                in a handful of directions. Module 2.2 asks when that bet pays.
              </p>
            </>
          ),
        },
        {
          id: "cos-variance",
          kind: "pencil",
          title: "Why the spread is 1/√d (guided derivation)",
          prompt: (
            <p>
              Let <M>u</M> and <M>v</M> be independent, uniformly random unit
              vectors in <M>{String.raw`\mathbb{R}^d`}</M>. Show that{" "}
              <M>{String.raw`\mathbb{E}[u \cdot v] = 0`}</M> and{" "}
              <M>{String.raw`\mathbb{E}[(u \cdot v)^2] = 1/d`}</M>, so the
              standard deviation of the cosine similarity is{" "}
              <M>{String.raw`1/\sqrt{d}`}</M>. Then state what this predicts for{" "}
              <M>{String.raw`d = 768`}</M> and check it in the explore widget.
            </p>
          ),
          hint: (
            <p>
              Rotational symmetry lets you fix <M>{String.raw`u = \hat{e}_1`}</M>{" "}
              without loss of generality. Then <M>{String.raw`u \cdot v = v_1`}</M>{" "}
              and you only need the distribution of one coordinate of a random
              unit vector.
            </p>
          ),
          solution: (
            <>
              <p>
                Fix <M>{String.raw`u = \hat{e}_1`}</M> by symmetry — the
                distribution of <M>v</M> is unchanged by rotation, so this costs
                nothing. Then <M>{String.raw`u \cdot v = v_1`}</M>. Since{" "}
                <M>{String.raw`-v`}</M> is as likely as <M>v</M>,{" "}
                <M>{String.raw`\mathbb{E}[v_1] = 0`}</M>.
              </p>
              <p>
                For the second moment: <M>v</M> is a unit vector, so{" "}
                <M>{String.raw`\sum_{j=1}^{d} v_j^2 = 1`}</M> exactly, hence{" "}
                <M>{String.raw`\sum_j \mathbb{E}[v_j^2] = 1`}</M>. All
                coordinates are exchangeable, so each term is equal and{" "}
                <M>{String.raw`\mathbb{E}[v_1^2] = 1/d`}</M>. Standard deviation{" "}
                <M>{String.raw`= 1/\sqrt{d}`}</M>.
              </p>
              <p>
                At <M>{String.raw`d = 768`}</M> this is 0.036, so a typical pair
                of random directions in GPT-2 small&apos;s residual stream is
                within about 2° of perpendicular, and pairs beyond{" "}
                <M>{String.raw`|\cos| = 0.15`}</M> (four standard deviations) are
                rare. Set the widget to <M>{String.raw`d = 512`}</M> or{" "}
                <M>{String.raw`d = 1024`}</M> and compare the measured RMS in the
                footer against <M>{String.raw`1/\sqrt{d}`}</M>.
              </p>
            </>
          ),
        },
        {
          id: "numpy-orthogonality",
          kind: "code",
          title: "Measure near-orthogonality yourself",
          prompt: (
            <>
              <p>
                In a notebook, for each{" "}
                <M>{String.raw`d \in \{2, 8, 64, 512, 4096\}`}</M>: sample 2,000
                random unit vectors (Gaussian entries, then divide by the norm —
                do not sample coordinates uniformly, that biases toward corners),
                compute the full pairwise cosine-similarity matrix, and report
                the standard deviation, the maximum absolute off-diagonal value,
                and a histogram.
              </p>
              <p>
                Then answer with code: for <M>{String.raw`\varepsilon = 0.1`}</M>,
                how many of the 2,000 vectors can you greedily keep such that all
                pairs satisfy <M>{String.raw`|\cos| < \varepsilon`}</M>, at{" "}
                <M>{String.raw`d = 8`}</M> versus <M>{String.raw`d = 64`}</M>{" "}
                versus <M>{String.raw`d = 512`}</M>?
              </p>
              <p>
                Success check: the measured standard deviation matches{" "}
                <M>{String.raw`1/\sqrt{d}`}</M> to within a few percent at every{" "}
                <M>d</M>, and the greedy count at <M>{String.raw`d = 512`}</M>{" "}
                exhausts your 2,000 candidates while <M>{String.raw`d = 8`}</M>{" "}
                saturates in the low tens.
              </p>
            </>
          ),
          hint: (
            <p>
              Vectorise: <code>X = rng.normal(size=(n, d))</code>,{" "}
              <code>X /= np.linalg.norm(X, axis=1, keepdims=True)</code>, then{" "}
              <code>C = X @ X.T</code>. Use{" "}
              <code>C[np.triu_indices(n, k=1)]</code> to grab the off-diagonal
              pairs in one shot.
            </p>
          ),
          solution: (
            <>
              <pre>
                <code>{`import numpy as np
rng = np.random.default_rng(0)

for d in [2, 8, 64, 512, 4096]:
    X = rng.normal(size=(2000, d))
    X /= np.linalg.norm(X, axis=1, keepdims=True)
    C = X @ X.T
    off = C[np.triu_indices(2000, k=1)]
    print(d, off.std(), 1/np.sqrt(d), np.abs(off).max())

def greedy_pack(d, eps, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, d)); X /= np.linalg.norm(X, axis=1, keepdims=True)
    kept = []
    for x in X:
        if not kept or np.abs(np.array(kept) @ x).max() < eps:
            kept.append(x)
    return len(kept)`}</code>
              </pre>
              <p>
                Typical output: the standard deviation tracks{" "}
                <M>{String.raw`1/\sqrt{d}`}</M> closely at every scale (0.707,
                0.354, 0.125, 0.044, 0.0156). The maximum absolute cosine over
                ~2 million pairs is around 0.2 at{" "}
                <M>{String.raw`d = 512`}</M> and around 0.07 at{" "}
                <M>{String.raw`d = 4096`}</M> — even the worst of two million
                pairs is nearly orthogonal.
              </p>
              <p>
                Greedy packing at{" "}
                <M>{String.raw`\varepsilon = 0.1`}</M> keeps only a handful at{" "}
                <M>{String.raw`d = 8`}</M>, a few hundred at{" "}
                <M>{String.raw`d = 64`}</M>, and all 2,000 candidates at{" "}
                <M>{String.raw`d = 512`}</M> — the limit there is your sample
                size, not the geometry. Raise <M>n</M> and the count keeps going,
                which is the exponential-capacity claim showing up empirically.
              </p>
            </>
          ),
        },
        {
          id: "explore-rank",
          kind: "explore",
          title: "Hunt for rank collapse",
          prompt: (
            <>
              <p>
                Using the matrix-map widget above:
              </p>
              <ol>
                <li>
                  Find three different matrices with{" "}
                  <M>{String.raw`\det M = 0`}</M> but{" "}
                  <M>{String.raw`M \neq 0`}</M>. For each, read off the image
                  line and describe what the map destroys.
                </li>
                <li>
                  Start from the <strong>squash</strong> preset (
                  <M>{String.raw`\sigma_2 = 0.15`}</M>) and drag the bottom-right
                  entry toward zero until <M>{String.raw`\sigma_2`}</M> nearly
                  vanishes. Watch the condition number. Why do numerical people
                  care about that ratio?
                </li>
                <li>
                  Now open the figures of{" "}
                  <a href="https://transformer-circuits.pub/2022/toy_model/index.html" target="_blank" rel="noreferrer">
                    Toy Models of Superposition
                  </a>{" "}
                  and look at the plots of{" "}
                  <M>{String.raw`W^{\mathsf{T}}W`}</M>. Connect what you see
                  there to what you just did: what would perfect orthogonality
                  look like in those plots, and what does the model do instead?
                </li>
              </ol>
            </>
          ),
          solution: (
            <>
              <p>
                (1) Anything with proportional rows or columns works:{" "}
                <M>{String.raw`\begin{bmatrix} 1 & 2 \\ 0.5 & 1\end{bmatrix}`}</M>,{" "}
                <M>{String.raw`\begin{bmatrix} 1 & 0 \\ 0 & 0\end{bmatrix}`}</M>,{" "}
                <M>{String.raw`\begin{bmatrix} 1 & -1 \\ -1 & 1\end{bmatrix}`}</M>.
                The image is the line spanned by any non-zero column; the
                destroyed direction is the kernel, and no later computation can
                recover it. Once a component of the residual stream is projected
                away, it is gone for the rest of the forward pass.
              </p>
              <p>
                (2) As <M>{String.raw`\sigma_2 \to 0`}</M> the condition number{" "}
                <M>{String.raw`\sigma_1/\sigma_2 \to \infty`}</M>. Inverting such
                a map amplifies whatever noise sits in the squashed direction by
                that factor, which is why ill-conditioned matrices wreck
                numerical solvers — and, in interpretability, why directions with
                tiny singular values are usually not worth interpreting: the
                model can barely use them either.
              </p>
              <p>
                (3) Perfect orthogonality of the learned feature directions would
                make <M>{String.raw`W^{\mathsf{T}}W`}</M> the identity: a clean
                diagonal, no off-diagonal colour. What the toy model actually
                learns, once features are sparse, is a near-identity with small
                off-diagonal terms — features packed at nearly-but-not-quite
                90°, exactly the regime you measured in the crowded-space lab.
                The off-diagonal entries are the interference the model has
                decided to tolerate.
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
              Two activation vectors have dot product 0. The most useful reading
              of this is:
            </>
          ),
          choices: [
            {
              text: "They are perpendicular — as far as this measurement goes, they carry unrelated information.",
              correct: true,
              explain:
                "A zero dot product means cos θ = 0 (assuming neither vector is zero). Neither vector has any component along the other, which is exactly what 'these represent different things' means geometrically.",
            },
            {
              text: "At least one of them is the zero vector.",
              explain:
                "That would force a zero dot product, but it is not the only way: (1,0)·(0,1) = 0 with both vectors non-zero. Perpendicularity is the general case.",
            },
            {
              text: "They point in opposite directions.",
              explain:
                "Opposite directions give the most negative dot product, −‖a‖‖b‖, not zero. Zero is the halfway case between agreeing and disagreeing.",
            },
            {
              text: "They have the same length.",
              explain:
                "The dot product mixes lengths and angle; equal lengths say nothing about it. (2,0) and (0,5) are perpendicular with different lengths.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              You scale <M>v</M> by 3 and leave <M>{String.raw`\hat{u}`}</M>{" "}
              alone. What happens to <M>{String.raw`v \cdot \hat{u}`}</M> and to
              the cosine similarity?
            </>
          ),
          choices: [
            {
              text: "The dot product triples; the cosine similarity is unchanged.",
              correct: true,
              explain:
                "The dot product is linear in each argument, so scaling one side scales it. Cosine divides both lengths out, so it measures direction only — which is why 'feature direction' and 'feature activation strength' are separate quantities in SAE work.",
            },
            {
              text: "Both triple.",
              explain:
                "The cosine has ‖v‖ in its denominator, so the factor of 3 cancels. Cosine similarity is bounded in [−1, 1] and could not triple from 0.9 anyway.",
            },
            {
              text: "Both are unchanged, because û is a unit vector.",
              explain:
                "Normalising û fixes only one side of the product. The dot product still reports the length of v along û, and that length tripled.",
            },
            {
              text: "The dot product triples; the cosine similarity drops by a factor of 3.",
              explain:
                "Numerator and denominator both scale by 3, so they cancel exactly. Nothing drops.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A 768×768 matrix has rank 64. Which statement is true?
            </>
          ),
          choices: [
            {
              text: "Its outputs all lie in a 64-dimensional subspace; the other 704 directions are unreachable.",
              correct: true,
              explain:
                "Rank is the dimension of the image. This is the actual situation for one GPT-2 attention head's OV matrix, and it is why a head can only write into a small slice of the residual stream.",
            },
            {
              text: "It has 64 non-zero entries.",
              explain:
                "Rank counts independent directions, not non-zero numbers. A rank-1 matrix can be completely dense — an outer product uvᵀ usually has every entry non-zero.",
            },
            {
              text: "It is invertible on a 64-dimensional subspace, so no information is lost.",
              explain:
                "It is injective only on a complement of its 704-dimensional kernel — but the inputs that got sent to zero are genuinely destroyed. Information is lost; that is what low rank means.",
            },
            {
              text: "Its 64 singular values are all equal.",
              explain:
                "Rank 64 means exactly 64 singular values are non-zero; they are usually very different in size. Equal singular values would mean the map is a scaled rotation on that subspace, a special case.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              You want to remove a feature direction{" "}
              <M>{String.raw`\hat{u}`}</M> from an activation <M>v</M> without
              disturbing anything else. The right operation is:
            </>
          ),
          choices: [
            {
              text: (
                <>
                  <M>{String.raw`v - (v \cdot \hat{u})\hat{u}`}</M> — subtract the shadow, keep the perpendicular remainder.
                </>
              ),
              correct: true,
              explain:
                "This is directional ablation, and the result is provably orthogonal to û while every component perpendicular to û is untouched. It is the standard tool for testing whether a direction is causally used.",
            },
            {
              text: (
                <>
                  Set the largest coordinates of <M>v</M> to zero.
                </>
              ),
              explain:
                "Coordinates are neurons, and feature directions almost never line up with neurons. Zeroing coordinates removes an arbitrary mixture of many features and leaves part of û behind.",
            },
            {
              text: (
                <>
                  Multiply <M>v</M> by a small constant.
                </>
              ),
              explain:
                "Scaling shrinks everything, including the parts you wanted to keep. The direction û is still present, just quieter — the ablation has not isolated anything.",
            },
            {
              text: (
                <>
                  Add <M>{String.raw`-\hat{u}`}</M> to <M>v</M>.
                </>
              ),
              explain:
                "A fixed-size subtraction over- or under-shoots depending on how much of û was actually there, and can flip the sign of the component. The projection scales the subtraction by the measured amount, which is the point.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Random unit vectors are drawn in <M>{String.raw`d = 4096`}</M>{" "}
              dimensions. A typical pair has cosine similarity around:
            </>
          ),
          choices: [
            {
              text: "0.016 — near-orthogonal, with spread 1/√d.",
              correct: true,
              explain:
                "1/√4096 = 1/64 ≈ 0.0156. Independent directions in a large space are nearly perpendicular for free, and the tails fall off like e^(−dε²/2).",
            },
            {
              text: "Around 0.5 — random vectors usually share a fair amount of direction.",
              explain:
                "That is 2-D intuition. In 2-D a random pair averages |cos| ≈ 0.64, but the spread shrinks as 1/√d, and 4096 dimensions crush it to about a sixtieth of that.",
            },
            {
              text: "Exactly 0 — random directions are orthogonal.",
              explain:
                "The mean is 0, but any individual pair is not exactly orthogonal; the small non-zero overlap is precisely the interference that superposition has to pay for.",
            },
            {
              text: "It depends on how many vectors you drew.",
              explain:
                "The distribution of a single pair does not depend on the sample size. The maximum |cos| over all pairs does creep up with more samples, but the typical value stays at 1/√d.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Why does near-orthogonality make superposition possible?
            </>
          ),
          choices: [
            {
              text: "A model can assign more features than it has dimensions, each a nearly-orthogonal direction, and pay only a small interference cost.",
              correct: true,
              explain:
                "Exactly. If features must be exactly orthogonal, d dimensions hold d features. Tolerating ε of interference buys exponentially many directions — and when features are sparse, they rarely collide, so the tax is usually unpaid.",
            },
            {
              text: "Because high-dimensional vectors have larger norms, they can store more information per neuron.",
              explain:
                "Norm is not the resource here — all the vectors in the argument are unit length. What grows with d is the number of directions available at a given angular tolerance.",
            },
            {
              text: "Because orthogonal features never interfere, superposition is lossless.",
              explain:
                "Superposition is specifically the non-orthogonal regime and it is not lossless: the small off-diagonal overlaps are real interference. Sparsity is what makes the trade worth it.",
            },
            {
              text: "Because SVD guarantees a basis in which features become axis-aligned.",
              explain:
                "SVD gives an orthogonal basis for a matrix, but the model's features are more numerous than the dimensions, so no basis can make them all axis-aligned. That impossibility is why dictionary learning (Module 3.4) exists.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              The unit circle is mapped by <M>M</M> to an ellipse with semi-axes
              3 and 0.02. What should you conclude?
            </>
          ),
          choices: [
            {
              text: "M is technically full rank but effectively one-dimensional; the second direction is almost destroyed.",
              correct: true,
              explain:
                "σ₂ = 0.02 ≠ 0, so the rank is 2 in exact arithmetic. But a signal in that direction comes out 150× weaker than in the first — in practice it is buried in noise. 'Effective rank' exists for exactly this situation.",
            },
            {
              text: "M has rank 1.",
              explain:
                "Rank counts non-zero singular values, and 0.02 is not zero. The distinction matters: real weight matrices essentially never have an exactly zero singular value, yet are often effectively low-rank.",
            },
            {
              text: "M is a rotation.",
              explain:
                "A rotation maps the unit circle to itself — both singular values would be 1. Any ellipse that is not a circle means unequal stretching.",
            },
            {
              text: "det M = 0, so M is not invertible.",
              explain:
                "det = σ₁σ₂ = 0.06, which is small but not zero, so M is invertible on paper. Inverting it amplifies the squashed direction by 50× — invertible and usable are different things.",
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
          Watch the 3Blue1Brown series first — it is the visual backbone of
          everything above, and nothing else in this list replaces it. The rest
          are references you will return to rather than read straight through.
        </p>
      ),
      readings: [
        {
          title: "Essence of Linear Algebra (chapters 1–4, 9, 13–14)",
          authors: "Grant Sanderson (3Blue1Brown)",
          year: 2016,
          url: "https://www.3blue1brown.com/topics/linear-algebra",
          kind: "video",
          time: "2h",
          essential: true,
          note: "The core: ch. 1–4 for vectors, span, linear transformations and matrix multiplication as composition; ch. 9 for the dot product (watch the duality argument twice — it is why every measurement in a transformer is a dot product); ch. 13–14 for change of basis and eigenvectors. Skip determinants-by-cofactor and Cramer's rule; you will never need them here.",
        },
        {
          title: "Toy Models of Superposition — Introduction and “Superposition” section",
          authors: "Elhage, Hume, Olsson, Schiefer et al. (Anthropic)",
          year: 2022,
          url: "https://transformer-circuits.pub/2022/toy_model/index.html",
          kind: "paper",
          time: "45 min (first pass)",
          essential: true,
          note: "Read only the introduction and the first section on superposition now — enough to see today's near-orthogonality fact used as the load-bearing argument for why features do not align with neurons. Module 3.3 does the full three-sitting read; resist the urge to go further today.",
        },
        {
          title: "Deep Learning, Chapter 2: Linear Algebra",
          authors: "Goodfellow, Bengio & Courville",
          year: 2016,
          url: "https://www.deeplearningbook.org/contents/linear_algebra.html",
          kind: "book",
          time: "reference",
          note: "The notation dictionary for the rest of the course. Read §2.8 (SVD) and §2.7 (eigendecomposition) properly; treat the rest as a lookup table when a paper uses a symbol you cannot place.",
        },
        {
          title: "Johnson–Lindenstrauss lemma",
          authors: "Wikipedia (after Johnson & Lindenstrauss 1984)",
          year: 1984,
          url: "https://en.wikipedia.org/wiki/Johnson%E2%80%93Lindenstrauss_lemma",
          kind: "blog",
          time: "20 min",
          note: "The formal statement behind the punchline: N points fit in O(log N / ε²) dimensions with distances almost preserved. Read the statement and the proof sketch, skip the constructions and the optimality literature. The takeaway is the shape of the bound — logarithmic in the number of things you want to store.",
        },
        {
          title: "Privileged Bases in the Transformer Residual Stream",
          authors: "Elhage, Lasenby & Olah (Anthropic)",
          year: 2023,
          url: "https://transformer-circuits.pub/2023/privileged-basis/index.html",
          kind: "paper",
          time: "30 min",
          note: "The honest complication to “only directions matter, never coordinates.” Anthropic finds that outlier coordinates do appear in real residual streams, and traces the cause provisionally to Adam's per-dimension normalisation. Read it for the epistemics as much as the result: a clean theoretical claim meeting messy empirical evidence.",
        },
        {
          title: "MIT 18.06 Linear Algebra (lectures 1–6, 29–30)",
          authors: "Gilbert Strang (MIT OpenCourseWare)",
          year: 2010,
          url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
          kind: "course",
          time: "optional, ~6h",
          note: "Only if you want the full undergraduate treatment. Lectures 1–6 cover elimination and the four fundamental subspaces; 29–30 are the SVD, and Strang's derivation is the clearest on record. Everything else is optional for this course.",
        },
      ],
    },
  ],
};

export default mod;
