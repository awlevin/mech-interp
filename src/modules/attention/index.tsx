import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { AttentionVisualizer } from "./AttentionVisualizer";
import { QKPlayground } from "./QKPlayground";

const mod: CourseModule = {
  id: "1.2",
  slug: "attention",
  title: "Attention, Fully Understood",
  part: 1,
  tagline: "Queries, keys, and values as soft lookup — the mechanism that routes information between tokens.",
  estMinutes: 180,
  objectives: [
      "Hand-compute a full attention pass for a tiny example",
      "Explain scaling by √d and causal masking",
      "Read multi-head attention patterns as information routing"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "soft-lookup",
      title: "Tokens need to talk",
      body: (
        <>
          <p>
            After Module 1.1 you have a sequence of vectors: one per token,
            each holding the identity of that token and where it sits. Nothing
            else. The vector for <code>cat</code> is byte-for-byte the same in{" "}
            <em>the cat sat on the mat</em> and in{" "}
            <em>the cat 5 file was corrupted</em>.
          </p>
          <p>
            That cannot be enough. To predict what follows{" "}
            <em>&hellip;the store, John gave a drink to</em>, the vector sitting
            at <code>to</code> has to somehow know that a name appeared earlier
            and which one it was. Information has to move between positions.
          </p>
          <KeyIdea>
            <strong>Attention is the only operation in a transformer that
            moves information between token positions.</strong> Embeddings,
            LayerNorm, and the MLP all act on one position at a time, in
            parallel, blind to their neighbours. So every question of the form
            &ldquo;how did what happened at token 3 reach the prediction at
            token 40?&rdquo; is, mechanically, a question about attention.
          </KeyIdea>
          <p>
            The mechanism is a <strong>soft dictionary lookup</strong>. In an
            ordinary hash map you hold a key, compare it against the stored
            keys, find the one that matches, and take that entry&apos;s value.
            Attention does the same thing with one change: instead of matching
            exactly one key, it scores <em>every</em> key for similarity and
            returns a weighted blend of all the values.
          </p>
          <Figure caption="Hard lookup returns one value. Soft lookup returns a mixture, weighted by how well each key matched. That is the whole idea — everything after this is bookkeeping about where the queries, keys, and values come from.">
            <svg
              viewBox="0 0 480 200"
              className="w-full max-w-[480px]"
              role="img"
              aria-label="Diagram comparing an exact dictionary lookup with attention's weighted blend over all values"
            >
              <text x={6} y={14} fontSize={11} fill="var(--text-muted)" className="font-mono">
                hard lookup
              </text>
              <text x={256} y={14} fontSize={11} fill="var(--text-muted)" className="font-mono">
                soft lookup (attention)
              </text>
              {[0, 1, 2].map((i) => (
                <g key={`hard-${i}`}>
                  <rect x={78} y={34 + i * 44} width={54} height={30} rx={4} fill="var(--surface-2)" />
                  <text x={105} y={53 + i * 44} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-secondary)">
                    k{i + 1}
                  </text>
                  <rect x={140} y={34 + i * 44} width={54} height={30} rx={4} fill="var(--surface-2)" />
                  <text x={167} y={53 + i * 44} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-secondary)">
                    v{i + 1}
                  </text>
                </g>
              ))}
              <rect x={78} y={78} width={116} height={30} rx={4} fill="none" stroke="var(--series-2)" strokeWidth={2} />
              <text x={10} y={97} fontSize={11} className="font-mono" fill="var(--series-2)">
                q =
              </text>
              <line x1={40} y1={93} x2={72} y2={93} stroke="var(--series-2)" strokeWidth={1.5} />
              <text x={10} y={112} fontSize={10} className="font-mono" fill="var(--text-muted)">
                k2
              </text>
              <text x={80} y={130} fontSize={11} className="font-mono" fill="var(--text-primary)">
                out = v2
              </text>

              {[0, 1, 2].map((i) => {
                const w = [0.62, 0.28, 0.1][i];
                return (
                  <g key={`soft-${i}`}>
                    <rect x={300} y={34 + i * 44} width={44} height={30} rx={4} fill="var(--surface-2)" />
                    <text x={322} y={53 + i * 44} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-secondary)">
                      k{i + 1}
                    </text>
                    <rect x={352} y={34 + i * 44} width={44} height={30} rx={4} fill="var(--surface-2)" />
                    <text x={374} y={53 + i * 44} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-secondary)">
                      v{i + 1}
                    </text>
                    <line
                      x1={276}
                      y1={93}
                      x2={296}
                      y2={49 + i * 44}
                      stroke="var(--series-1)"
                      strokeWidth={1 + 6 * w}
                      opacity={0.25 + 0.7 * w}
                    />
                    <line
                      x1={400}
                      y1={49 + i * 44}
                      x2={432}
                      y2={93}
                      stroke="var(--series-1)"
                      strokeWidth={1 + 6 * w}
                      opacity={0.25 + 0.7 * w}
                    />
                    <text x={406} y={44 + i * 44} fontSize={10} className="font-mono" fill="var(--text-muted)">
                      {w.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text x={248} y={97} fontSize={11} className="font-mono" fill="var(--series-2)">
                q
              </text>
              <text x={300} y={160} fontSize={11} className="font-mono" fill="var(--text-primary)">
                out = .62 v1 + .28 v2 + .10 v3
              </text>
            </svg>
          </Figure>
          <p>
            Three roles, three names, and each is just a linear projection of the
            residual-stream vector at that position:
          </p>
          <Term word="query">
            <M>{String.raw`q_i = W_Q\, x_i`}</M> — what token <M>i</M> is looking
            for. &ldquo;I am a verb; where is my subject?&rdquo;
          </Term>
          <Term word="key">
            <M>{String.raw`k_j = W_K\, x_j`}</M> — what token <M>j</M> advertises
            about itself. &ldquo;I am a singular noun in subject position.&rdquo;
          </Term>
          <Term word="value">
            <M>{String.raw`v_j = W_V\, x_j`}</M> — what token <M>j</M> will hand
            over if it is attended to. Deliberately separate from the key:{" "}
            <em>what makes you findable</em> and <em>what you contribute</em> are
            different questions, so they get different matrices.
          </Term>
          <p>
            The queries and keys live in a space of size{" "}
            <M>{String.raw`d_{\text{head}}`}</M>, typically much smaller than the
            residual stream&apos;s <M>{String.raw`d_{\text{model}}`}</M> — 64 vs
            768 in GPT-2 small. A head is a narrow window onto a wide stream, and
            that narrowness is a big part of why heads end up specialised.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "formula",
      title: "The formula, term by term",
      body: (
        <>
          <p>
            Here is the whole of attention. Read it as: score every pair, shrink
            the scores, forbid looking ahead, normalise into a distribution, take
            the weighted average of the values.
          </p>
          <MB>{String.raw`\mathrm{Attn}(Q,K,V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_{\text{head}}}} + M\right) V`}</MB>
          <p>
            Term by term. <M>{String.raw`QK^\top`}</M> is an{" "}
            <M>{String.raw`n \times n`}</M> matrix of <strong>scores</strong>:
            entry <M>{String.raw`(i,j)`}</M> is{" "}
            <M>{String.raw`q_i \cdot k_j`}</M>, how well token <M>j</M>&apos;s
            advertisement answers token <M>i</M>&apos;s question. It is a plain
            dot product, so it is large when the two vectors point the same way
            and are long.
          </p>
          <p>
            <M>M</M> is the <strong>causal mask</strong>: 0 where{" "}
            <M>{String.raw`j \le i`}</M> and{" "}
            <M>{String.raw`-\infty`}</M> where <M>{String.raw`j > i`}</M>. Adding{" "}
            <M>{String.raw`-\infty`}</M> before the softmax sends those entries
            to exactly zero probability. Then <strong>softmax</strong> runs{" "}
            <em>along each row</em>, so every token&apos;s weights over its
            visible predecessors sum to 1. Finally multiplying by <M>V</M> takes
            the weighted average.
          </p>

          <h4>Why divide by <M>{String.raw`\sqrt{d_{\text{head}}}`}</M></h4>
          <p>
            Suppose the entries of <M>q</M> and <M>k</M> are roughly independent
            with mean 0 and variance 1. Then{" "}
            <M>{String.raw`q \cdot k = \sum_{t=1}^{d} q_t k_t`}</M> is a sum of{" "}
            <M>d</M> independent terms each with variance 1, so
          </p>
          <MB>{String.raw`\mathrm{Var}(q \cdot k) = d \quad\Longrightarrow\quad \text{typical } |q\cdot k| \approx \sqrt{d}`}</MB>
          <p>
            With <M>{String.raw`d_{\text{head}} = 64`}</M> the scores would
            routinely sit around <M>{String.raw`\pm 8`}</M>, and gaps of 8 in
            logit space are enormous: softmax would be nearly one-hot at
            initialisation, gradients through it would be nearly zero, and
            training would stall before it started. Dividing by{" "}
            <M>{String.raw`\sqrt{d_{\text{head}}}`}</M> puts the scores back at
            scale <M>{String.raw`\approx 1`}</M>, where softmax is soft and its
            gradient is healthy.
          </p>
          <KeyIdea>
            The <M>{String.raw`\sqrt{d}`}</M> is a <em>temperature</em>. It does
            not change which key wins — dividing every score by the same positive
            number preserves the ordering — it changes how sharply the winner
            beats the rest. It exists so that the mechanism is trainable, not
            because it is mathematically necessary.
          </KeyIdea>

          <h4>Why the mask</h4>
          <p>
            A language model must predict token <M>{String.raw`i+1`}</M> from
            tokens <M>{String.raw`1..i`}</M>. Without the mask, position 3 could
            read position 7 and the training objective would be trivially
            cheatable. But there is a second, practical reason the mask is
            triangular rather than a loop over prefixes:{" "}
            <strong>one forward pass over a length-<M>n</M> sequence produces{" "}
            <M>n</M> training examples at once</strong>, because each row of the
            masked matrix already sees exactly the right prefix. That is a large
            part of why transformers train so much faster than RNNs.
          </p>
          <Figure caption="The masked score matrix. Row i = what token i can look at. The upper triangle is set to −∞ before the softmax, so it contributes exactly zero probability. Softmax is applied row-wise, so each row sums to 1 over its allowed prefix.">
            <svg
              viewBox="0 0 320 210"
              className="w-full max-w-[320px]"
              role="img"
              aria-label="A 5 by 5 attention score matrix with the upper triangle masked out"
            >
              {["The", "cat", "sat", "on", "mat"].map((t, i) => (
                <text
                  key={`r${t}`}
                  x={44}
                  y={52 + i * 30}
                  textAnchor="end"
                  fontSize={11}
                  className="font-mono"
                  fill="var(--text-secondary)"
                >
                  {t}
                </text>
              ))}
              {["The", "cat", "sat", "on", "mat"].map((t, j) => (
                <text
                  key={`c${t}`}
                  x={66 + j * 30}
                  y={26}
                  textAnchor="middle"
                  fontSize={11}
                  className="font-mono"
                  fill="var(--text-secondary)"
                >
                  {t}
                </text>
              ))}
              {[0, 1, 2, 3, 4].map((i) =>
                [0, 1, 2, 3, 4].map((j) => {
                  const masked = j > i;
                  const w = masked ? 0 : [0.2, 0.35, 0.15, 0.2, 0.5][(i + j) % 5];
                  return (
                    <g key={`c${i}-${j}`}>
                      <rect
                        x={52 + j * 30}
                        y={36 + i * 30}
                        width={26}
                        height={26}
                        rx={3}
                        fill={masked ? "var(--surface-2)" : "var(--series-1)"}
                        opacity={masked ? 0.5 : 0.2 + w}
                      />
                      {masked ? (
                        <text
                          x={65 + j * 30}
                          y={53 + i * 30}
                          textAnchor="middle"
                          fontSize={10}
                          className="font-mono"
                          fill="var(--text-muted)"
                        >
                          −∞
                        </text>
                      ) : null}
                    </g>
                  );
                }),
              )}
              <text x={52} y={196} fontSize={11} fill="var(--text-muted)" className="font-mono">
                keys (what we look at) →
              </text>
              <text
                x={16}
                y={120}
                fontSize={11}
                fill="var(--text-muted)"
                className="font-mono"
                transform="rotate(-90 16 120)"
                textAnchor="middle"
              >
                queries ↓
              </text>
            </svg>
          </Figure>
          <Note kind="warning" title="A mask is not a zeroing">
            Masking has to happen <em>before</em> the softmax, as{" "}
            <M>{String.raw`-\infty`}</M> added to the scores. If you compute the
            full softmax and then zero the future entries, the surviving weights
            no longer sum to 1 and the head silently shrinks its own output. This
            is a classic implementation bug — and worth remembering because
            interpretability code that re-runs attention by hand hits it too.
          </Note>
          <KeyIdea>
            The matrix splits cleanly in two.{" "}
            <M>{String.raw`W_Q`}</M> and <M>{String.raw`W_K`}</M> only ever
            appear together as <M>{String.raw`W_Q^\top W_K`}</M> — the{" "}
            <strong>QK circuit</strong>, which decides <em>where</em> to look.{" "}
            <M>{String.raw`W_V`}</M> and <M>{String.raw`W_O`}</M> only ever
            appear together as <M>{String.raw`W_O W_V`}</M> — the{" "}
            <strong>OV circuit</strong>, which decides <em>what gets moved</em>.
            Two independent questions, two independent low-rank maps. Module 3.2
            builds the whole theory of circuits on this split.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "learn",
      id: "by-hand",
      title: "A full pass by hand: 3 tokens, d = 4",
      body: (
        <>
          <p>
            Small enough to check every number with a pen. Sequence:{" "}
            <code>the cat sat</code>, residual stream width{" "}
            <M>{String.raw`d_{\text{model}} = 4`}</M>, one head with{" "}
            <M>{String.raw`d_{\text{head}} = 2`}</M>. The three input vectors,
            stacked as rows of <M>X</M>:
          </p>
          <MB>{String.raw`X = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 1 & 1 & 0 \\ 1 & 1 & 0 & 1 \end{bmatrix} \begin{matrix} \leftarrow \text{the} \\ \leftarrow \text{cat} \\ \leftarrow \text{sat} \end{matrix}`}</MB>
          <p>
            The head&apos;s three projection matrices, each{" "}
            <M>{String.raw`4 \times 2`}</M>:
          </p>
          <MB>{String.raw`W_Q = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 0 & 1 \\ 1 & 0 \end{bmatrix},\quad W_K = \begin{bmatrix} 1 & 0 \\ 1 & 1 \\ 0 & 1 \\ 0 & 0 \end{bmatrix},\quad W_V = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ 1 & 1 \\ 0 & -1 \end{bmatrix}`}</MB>
          <p>
            <strong>Step 1 — project.</strong> Multiply each row of <M>X</M> by
            each matrix. For <code>sat</code>,{" "}
            <M>{String.raw`q_3 = (1,1,0,1) W_Q = (1{\cdot}1 + 1{\cdot}0 + 0{\cdot}0 + 1{\cdot}1,\; 1{\cdot}0 + 1{\cdot}1 + 0{\cdot}1 + 1{\cdot}0) = (2,1)`}</M>.
            All nine vectors:
          </p>
          <MB>{String.raw`Q = \begin{bmatrix} 1 & 1 \\ 0 & 2 \\ 2 & 1 \end{bmatrix},\quad K = \begin{bmatrix} 1 & 1 \\ 1 & 2 \\ 2 & 1 \end{bmatrix},\quad V = \begin{bmatrix} 1 & 2 \\ 2 & 1 \\ 1 & 0 \end{bmatrix}`}</MB>
          <p>
            <strong>Step 2 — score.</strong>{" "}
            <M>{String.raw`S = QK^\top`}</M>, so{" "}
            <M>{String.raw`S_{ij} = q_i \cdot k_j`}</M>. For instance{" "}
            <M>{String.raw`S_{32} = (2,1)\cdot(1,2) = 4`}</M>:
          </p>
          <MB>{String.raw`S = \begin{bmatrix} 2 & 3 & 3 \\ 2 & 4 & 2 \\ 3 & 4 & 5 \end{bmatrix}`}</MB>
          <p>
            <strong>Step 3 — scale and mask.</strong> Divide by{" "}
            <M>{String.raw`\sqrt{d_{\text{head}}} = \sqrt 2 \approx 1.414`}</M>{" "}
            and set the upper triangle to <M>{String.raw`-\infty`}</M>:
          </p>
          <MB>{String.raw`\tilde S = \begin{bmatrix} 1.41 & -\infty & -\infty \\ 1.41 & 2.83 & -\infty \\ 2.12 & 2.83 & 3.54 \end{bmatrix}`}</MB>
          <p>
            <strong>Step 4 — softmax each row.</strong> Row 3, worked out: subtract
            the row max 3.54 to get <M>{String.raw`(-1.41, -0.71, 0)`}</M>,
            exponentiate to <M>{String.raw`(0.243, 0.493, 1)`}</M>, divide by the
            sum 1.736:
          </p>
          <MB>{String.raw`A = \begin{bmatrix} 1.000 & 0 & 0 \\ 0.196 & 0.804 & 0 \\ 0.140 & 0.284 & 0.576 \end{bmatrix}`}</MB>
          <p>
            <strong>Step 5 — mix the values.</strong>{" "}
            <M>{String.raw`\mathrm{out} = A V`}</M>. Row 3:{" "}
            <M>{String.raw`0.140\,(1,2) + 0.284\,(2,1) + 0.576\,(1,0) = (1.284, 0.564)`}</M>.
          </p>
          <MB>{String.raw`\mathrm{out} = \begin{bmatrix} 1.000 & 2.000 \\ 1.804 & 1.196 \\ 1.284 & 0.564 \end{bmatrix}`}</MB>
          <p>
            Row 1 is exactly <M>{String.raw`v_1`}</M>: the first token can only
            attend to itself, so a head can never do anything useful at position
            1. In real models this shows up as <strong>attention sinks</strong> —
            heads dump unwanted probability mass onto the first token when they
            have nothing to say. In production a{" "}
            <M>{String.raw`\langle`}</M>BOS<M>{String.raw`\rangle`}</M> token is
            usually prepended precisely to give them somewhere harmless to point.
          </p>
          <Note kind="note" title="What the √d actually bought us">
            Compare row 3 with and without the scaling. Unscaled, the raw scores{" "}
            <M>{String.raw`(3,4,5)`}</M> softmax to{" "}
            <M>{String.raw`(0.090,\,0.245,\,0.665)`}</M> — sharper. Scaled by{" "}
            <M>{String.raw`\sqrt 2`}</M> you get{" "}
            <M>{String.raw`(0.140,\,0.284,\,0.576)`}</M>. And if this were a real
            GPT-2 head with <M>{String.raw`d_{\text{head}} = 64`}</M>, dividing by
            8 would give <M>{String.raw`(0.293,\,0.332,\,0.376)`}</M> — almost
            flat. Same geometry, three different temperatures. Note also that the{" "}
            <M>d</M> in <M>{String.raw`\sqrt d`}</M> is the <em>head</em>{" "}
            dimension, not <M>{String.raw`d_{\text{model}}`}</M>; getting that
            wrong is a common re-implementation bug.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "multi-head",
      title: "Many heads, one stream",
      body: (
        <>
          <p>
            One head can express one routing rule at a time — the softmax forces
            its weights to compete for a single unit of probability mass. Real
            layers run several heads side by side. GPT-2 small has 12 heads per
            layer, each with <M>{String.raw`d_{\text{head}} = 64`}</M>, so the 12
            heads together use exactly the same parameter budget as one head of
            width 768 would.
          </p>
          <p>
            The textbook presentation concatenates the head outputs and multiplies
            by one big <M>{String.raw`W_O`}</M>. Split{" "}
            <M>{String.raw`W_O`}</M> into per-head blocks and the same equation
            reads much more usefully:
          </p>
          <MB>{String.raw`\text{attn-out}_i = \sum_{h=1}^{H} W_O^{(h)} \sum_j A^{(h)}_{ij}\, W_V^{(h)} x_j`}</MB>
          <p>
            A <strong>sum</strong>, not a tangle. Each head reads the residual
            stream through its own narrow projection, does its own routing, and
            adds its own contribution back. Heads in the same layer never see each
            other. That is what makes them tractable to study one at a time — and
            why the field says &ldquo;head 5.1&rdquo; the way a biologist says
            &ldquo;this neuron.&rdquo;
          </p>
          <Figure caption="A layer's heads are parallel channels on a shared bus. Each reads the residual stream, routes information between positions, and adds its result back. Nothing is overwritten; the stream only accumulates.">
            <svg
              viewBox="0 0 480 190"
              className="w-full max-w-[480px]"
              role="img"
              aria-label="Four attention heads reading from and writing back into a shared residual stream"
            >
              <rect x={20} y={132} width={440} height={16} rx={8} fill="var(--surface-2)" />
              <text x={20} y={166} fontSize={11} className="font-mono" fill="var(--text-muted)">
                residual stream (d_model = 768) →
              </text>
              {[0, 1, 2, 3].map((h) => {
                const x = 40 + h * 108;
                const colors = [
                  "var(--series-1)",
                  "var(--series-2)",
                  "var(--series-3)",
                  "var(--series-4)",
                ];
                const names = ["prev-token", "duplicate", "syntactic", "broad avg"];
                return (
                  <g key={h}>
                    <line
                      x1={x + 14}
                      y1={132}
                      x2={x + 14}
                      y2={86}
                      stroke={colors[h]}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <line x1={x + 74} y1={86} x2={x + 74} y2={126} stroke={colors[h]} strokeWidth={1.5} />
                    <polygon
                      points={`${x + 74},${132} ${x + 70},${124} ${x + 78},${124}`}
                      fill={colors[h]}
                    />
                    <rect x={x} y={44} width={88} height={42} rx={6} fill="var(--surface-2)" stroke={colors[h]} strokeWidth={1.5} />
                    <text x={x + 44} y={62} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-primary)">
                      head {h + 1}
                    </text>
                    <text x={x + 44} y={77} textAnchor="middle" fontSize={9} className="font-mono" fill="var(--text-muted)">
                      {names[h]}
                    </text>
                    <text x={x + 6} y={106} fontSize={9} className="font-mono" fill="var(--text-muted)">
                      read
                    </text>
                    <text x={x + 62} y={106} fontSize={9} className="font-mono" fill="var(--text-muted)">
                      +write
                    </text>
                  </g>
                );
              })}
              <text x={20} y={26} fontSize={11} className="font-mono" fill="var(--text-muted)">
                one attention layer, H = 4 independent channels
              </text>
            </svg>
          </Figure>
          <KeyIdea>
            Attention is <strong>information routing</strong>. A head does not
            &ldquo;compute&rdquo; much: it picks a source position and copies a
            projection of what is there to a destination position. The thinking
            happens in the MLPs (Module 1.3); attention decides which facts are
            available to think with.
          </KeyIdea>
          <p>
            Some head types recur across models trained by different labs on
            different data — <strong>previous-token heads</strong>,{" "}
            <strong>duplicate-token heads</strong>,{" "}
            <strong>induction heads</strong> (which complete{" "}
            <M>{String.raw`[A][B]\ldots[A] \to [B]`}</M>, the star of Module 3.2),
            and <strong>name-mover heads</strong> (Module 3.5). This partial
            <em> universality</em> is one of the field&apos;s most encouraging
            findings: it suggests there is a shared set of algorithms to
            discover, not one private mess per model.
          </p>
          <Note kind="note" title="Heads are not clean">
            Do not over-read the labels. Most heads do several unrelated things
            depending on context, plenty do nothing legible at all, and a head
            that looks like a &ldquo;syntax head&rdquo; on your ten example
            sentences may be doing something else entirely on the other 99.99% of
            the distribution. &ldquo;Head <M>h</M> is the X head&rdquo; is a
            hypothesis, not an observation.
          </Note>
          <Note kind="safety">
            Attention patterns are the most legible surface a transformer has —
            you can literally draw the arrows. That makes them seductive, and the
            field has learned to distrust them: an attention weight tells you{" "}
            <em>what was read</em>, not <em>what was used</em>. A head can attend
            hard at a token and move nothing useful (its OV circuit projects to
            noise), and a small weight on a high-magnitude value can dominate the
            output. Whether attention constitutes an &ldquo;explanation&rdquo;
            was contested throughout the 2019 NLP literature and the honest answer
            is that it is <strong>evidence, not proof</strong>. Everything in Part
            3 — ablation, activation patching, causal scrubbing — exists to close
            that gap. Keep the reflex: <em>is this correlational or causal?</em>
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Play: patterns and the geometry behind them",
      body: (
        <>
          <p>
            Two toys, top-down. The first shows you what attention patterns{" "}
            <em>look</em> like: four hand-designed heads, each imitating a head
            type that really occurs in trained models, over three sentences. The
            second shows you where a pattern <em>comes from</em>: drag vectors
            around a plane and watch geometry turn into probabilities.
          </p>
          <AttentionVisualizer />
          <p>
            These heads are hand-written scoring rules, not weights lifted from a
            model — the point is to make the shape of a pattern legible before you
            go stare at real ones (the problem set sends you to do exactly that).
          </p>
          <QKPlayground />
          <p>
            Things to try: (1) On the Mary/John sentence, select the{" "}
            <strong>duplicate-token</strong> head and click the second{" "}
            <code>John</code> — that single arrow is the raw signal the IOI
            circuit uses to work out which name is <em>not</em> the answer.
            (2) Click a token near the start of any sentence and turn the causal
            mask <strong>off</strong>: watch mass flood into the future and the
            entropy jump. That is the model cheating, and it is why the mask
            exists. (3) In the QK playground, set the divisor to{" "}
            <M>{String.raw`\sqrt{64} = 8`}</M> and watch the pattern collapse to
            nearly uniform — then crank <em>query length</em> up to 8× and watch it
            sharpen back. That is precisely the trade the{" "}
            <M>{String.raw`\sqrt d`}</M> is managing: score magnitude grows with
            dimension, so the divisor grows with it too.
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
          Do the first one with an actual pen. Attention is the one mechanism in
          this course worth having in your hands rather than your notes — every
          circuit result in Part 3 assumes you can do this arithmetic in your
          sleep.
        </p>
      ),
      problems: [
        {
          id: "attn-by-hand",
          kind: "pencil",
          title: "A full attention pass, by hand",
          prompt: (
            <>
              <p>
                Sequence <code>a dog barks</code>,{" "}
                <M>{String.raw`d_{\text{model}} = 4`}</M>,{" "}
                <M>{String.raw`d_{\text{head}} = 2`}</M>, one causally masked
                head.
              </p>
              <MB>{String.raw`X = \begin{bmatrix} 1 & 1 & 0 & 0 \\ 0 & 1 & 1 & 0 \\ 1 & 0 & 1 & 1 \end{bmatrix},\; W_Q = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ 1 & 1 \\ 0 & 1 \end{bmatrix},\; W_K = \begin{bmatrix} 1 & 1 \\ 0 & 1 \\ 1 & 0 \\ 1 & 0 \end{bmatrix},\; W_V = \begin{bmatrix} 2 & 0 \\ 0 & 1 \\ 1 & -1 \\ 0 & 2 \end{bmatrix}`}</MB>
              <p>
                Compute <M>Q</M>, <M>K</M>, <M>V</M>, the score matrix, the
                masked scaled scores, the attention matrix, and the output.
                Then answer: which token does <code>barks</code> attend to most,
                and would that change if you dropped the{" "}
                <M>{String.raw`\sqrt 2`}</M>?
              </p>
            </>
          ),
          hint: (
            <p>
              For the softmax, subtract the row maximum first — it changes
              nothing (softmax is shift-invariant) and keeps the exponentials
              small. You will need{" "}
              <M>{String.raw`e^{-0.71} \approx 0.49`}</M> and{" "}
              <M>{String.raw`e^{-2.12} \approx 0.12`}</M>.
            </p>
          ),
          solution: (
            <>
              <MB>{String.raw`Q = \begin{bmatrix} 1 & 1 \\ 2 & 1 \\ 1 & 3 \end{bmatrix},\quad K = \begin{bmatrix} 1 & 2 \\ 1 & 1 \\ 3 & 1 \end{bmatrix},\quad V = \begin{bmatrix} 2 & 1 \\ 1 & 0 \\ 3 & 1 \end{bmatrix}`}</MB>
              <MB>{String.raw`S = QK^\top = \begin{bmatrix} 3 & 2 & 4 \\ 4 & 3 & 7 \\ 7 & 4 & 6 \end{bmatrix}`}</MB>
              <p>
                Masked and divided by <M>{String.raw`\sqrt 2`}</M>, row 3 is{" "}
                <M>{String.raw`(4.95,\, 2.83,\, 4.24)`}</M>. Subtract the max:{" "}
                <M>{String.raw`(0,\, -2.12,\, -0.71)`}</M>; exponentiate:{" "}
                <M>{String.raw`(1,\, 0.12,\, 0.49)`}</M>; normalise by 1.61:
              </p>
              <MB>{String.raw`A = \begin{bmatrix} 1.000 & 0 & 0 \\ 0.670 & 0.330 & 0 \\ 0.620 & 0.074 & 0.306 \end{bmatrix},\quad \mathrm{out} = \begin{bmatrix} 2.000 & 1.000 \\ 1.670 & 0.670 \\ 2.231 & 0.926 \end{bmatrix}`}</MB>
              <p>
                <code>barks</code> attends most to <code>a</code> (62%). Dropping
                the <M>{String.raw`\sqrt 2`}</M> would <em>not</em> change the
                ranking — scores 7 &gt; 6 &gt; 4 either way — it would only make
                the pattern sharper: <M>{String.raw`(0.705,\, 0.035,\, 0.259)`}</M>.
                Scaling is a temperature, never a re-ordering.
              </p>
            </>
          ),
        },
        {
          id: "sqrt-d",
          kind: "pencil",
          title: "Derive the √d",
          prompt: (
            <p>
              Let <M>q</M> and <M>k</M> be independent random vectors in{" "}
              <M>{String.raw`\mathbb{R}^d`}</M> whose entries are iid with mean 0
              and variance 1. Compute{" "}
              <M>{String.raw`\mathbb{E}[q \cdot k]`}</M> and{" "}
              <M>{String.raw`\mathrm{Var}(q \cdot k)`}</M>. Then explain, in terms
              of the softmax gradient, why a typical score of{" "}
              <M>{String.raw`\pm 8`}</M> is a training problem and a typical score
              of <M>{String.raw`\pm 1`}</M> is not.
            </p>
          ),
          hint: (
            <p>
              For independent zero-mean <M>{String.raw`X, Y`}</M>:{" "}
              <M>{String.raw`\mathbb{E}[XY] = 0`}</M> and{" "}
              <M>{String.raw`\mathrm{Var}(XY) = \mathbb{E}[X^2]\mathbb{E}[Y^2]`}</M>.
              Variances of independent terms add.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`\mathbb{E}[q\cdot k] = \sum_t \mathbb{E}[q_t]\mathbb{E}[k_t] = 0`}</M>.
                Each product term has variance{" "}
                <M>{String.raw`\mathbb{E}[q_t^2]\mathbb{E}[k_t^2] = 1`}</M>, and
                the <M>d</M> terms are independent, so{" "}
                <M>{String.raw`\mathrm{Var}(q\cdot k) = d`}</M> and a typical
                magnitude is <M>{String.raw`\sqrt d`}</M>. Dividing by{" "}
                <M>{String.raw`\sqrt d`}</M> restores unit variance for any head
                width.
              </p>
              <p>
                The training argument: from Module 0.2, the softmax Jacobian is{" "}
                <M>{String.raw`\partial p_i / \partial z_j = p_i(\delta_{ij} - p_j)`}</M>.
                When one score leads the field by ~8 nats, the winner has{" "}
                <M>{String.raw`p \approx 1`}</M> and the losers{" "}
                <M>{String.raw`p \approx 0`}</M>, so every entry of that Jacobian
                is <M>{String.raw`\approx 0`}</M> — the head is saturated and
                receives almost no gradient, so it cannot learn <em>where</em> to
                look. At scale <M>{String.raw`\pm 1`}</M> the probabilities are
                intermediate and the gradient is <M>{String.raw`O(1)`}</M>. This
                is the same saturation pathology that killed sigmoid-activated
                deep nets, appearing in a new place.
              </p>
            </>
          ),
        },
        {
          id: "predict-prev",
          kind: "pencil",
          title: "Predict the previous-token head",
          prompt: (
            <>
              <p>
                Before touching a model: a head has learned to attend to the token
                immediately to its left. Sketch its{" "}
                <M>{String.raw`n \times n`}</M> attention matrix for a 6-token
                sequence — mark which cells are near 1 and which near 0.
              </p>
              <p>
                Then answer three things. (a) What must{" "}
                <M>{String.raw`W_Q^\top W_K`}</M> be reading, given that the
                residual stream at this point contains token identity{" "}
                <em>and</em> position? (b) What does row 1 look like, and why?
                (c) Could this head exist in layer 0 of a model with{" "}
                <em>no</em> positional information at all?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                The matrix is near-1 on the first sub-diagonal (<M>{String.raw`j = i-1`}</M>)
                and near-0 elsewhere — a single bright line just below the
                diagonal, with row 1 forced to <M>{String.raw`A_{11} = 1`}</M>{" "}
                because nothing else is visible.
              </p>
              <p>
                (a) It must be reading <strong>position</strong>, not content: the
                rule &ldquo;attend to <M>{String.raw`i-1`}</M>&rdquo; is
                content-independent. So the QK circuit is scoring{" "}
                <M>{String.raw`\text{pos}(i)`}</M> against{" "}
                <M>{String.raw`\text{pos}(j)`}</M> in a way that peaks at an offset
                of one — with learned positional embeddings, a bilinear form that
                rewards adjacency; with RoPE (Module 1.3), a relative rotation that
                is maximal at a lag of one.
              </p>
              <p>
                (b) Row 1 is <M>{String.raw`(1, 0, \ldots, 0)`}</M> by force of the
                causal mask, not by choice. The head&apos;s output at position 1 is
                just <M>{String.raw`v_1`}</M> — which is one reason models learn to
                treat the first token as a sink.
              </p>
              <p>
                (c) No. With zero positional information the residual stream is
                permutation-equivariant, so any function of it is too, and
                &ldquo;the token to my left&rdquo; is not a permutation-equivariant
                concept. Something must break the symmetry: absolute positional
                embeddings, RoPE, ALiBi, or — in some decoder-only models — the
                causal mask itself, which is enough to let a model infer position
                from how many tokens each position can see.
              </p>
            </>
          ),
        },
        {
          id: "mask-invariance",
          kind: "pencil",
          title: "What the mask guarantees",
          prompt: (
            <p>
              Prove that with causal masking, the attention output at position{" "}
              <M>i</M> is completely unchanged if you replace every token after
              position <M>i</M> with anything you like. Then use that fact to
              explain why one forward pass over a length-<M>n</M> sequence gives{" "}
              <M>n</M> independent training signals instead of one — and say what
              would break if the mask were <M>{String.raw`j \le i+1`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                Row <M>i</M> of the attention matrix has support only on{" "}
                <M>{String.raw`j \le i`}</M> (the other entries are exactly zero
                after the <M>{String.raw`-\infty`}</M> softmax), so{" "}
                <M>{String.raw`\text{out}_i = \sum_{j \le i} A_{ij} v_j`}</M>{" "}
                depends only on <M>{String.raw`x_1 \ldots x_i`}</M>. And{" "}
                <M>{String.raw`A_{ij}`}</M> itself depends only on{" "}
                <M>{String.raw`q_i`}</M> and{" "}
                <M>{String.raw`k_1 \ldots k_i`}</M>, which are functions of the
                same prefix. Induct up the layers: since every other sublayer is
                per-position, the whole residual stream at position <M>i</M>{" "}
                depends only on the prefix through <M>i</M>.
              </p>
              <p>
                Therefore the logits at position <M>i</M> are a legitimate
                prediction of token <M>{String.raw`i+1`}</M> from its true prefix,
                for every <M>i</M> at once. One forward pass, <M>n</M> supervised
                examples — this is the efficiency that made autoregressive
                transformers practical.
              </p>
              <p>
                With <M>{String.raw`j \le i+1`}</M> every position could see the
                answer it is being asked to predict, the model would learn the
                identity map (loss <M>{String.raw`\to 0`}</M> on training data),
                and it would be useless at generation time when token{" "}
                <M>{String.raw`i+1`}</M> does not yet exist. This is a real and
                embarrassingly common bug class: an off-by-one in a mask produces
                a suspiciously excellent training curve and a broken model.
              </p>
            </>
          ),
        },
        {
          id: "numpy-attention",
          kind: "code",
          title: "Single-head, then multi-head, in NumPy",
          prompt: (
            <>
              <p>
                Implement <code>attention(X, Wq, Wk, Wv, causal=True)</code> for
                one head, then{" "}
                <code>mha(X, Wq, Wk, Wv, Wo, n_heads)</code> where the weights are
                the full <M>{String.raw`d_{\text{model}} \times d_{\text{model}}`}</M>{" "}
                matrices and you reshape into heads. No loops over positions —
                use matrix multiplies and{" "}
                <code>np.triu</code> for the mask.
              </p>
              <p>
                Success checks, all three: (1) your single-head function
                reproduces the by-hand answer above to 3 decimals; (2) every row
                of the attention matrix sums to 1 and the upper triangle is
                exactly 0; (3) running <code>mha</code> with{" "}
                <code>n_heads=1</code> and <code>Wo = I</code> gives the same
                answer as your single-head function.
              </p>
              <p>
                Then a diagnostic: feed random <M>{String.raw`X`}</M> with{" "}
                <M>{String.raw`d_{\text{head}} = 64`}</M> and print the standard
                deviation of the pre-softmax scores with and without the{" "}
                <M>{String.raw`\sqrt d`}</M>. Confirm the ratio is <M>8</M>.
              </p>
            </>
          ),
          hint: (
            <p>
              Shape discipline is the whole exercise. Keep{" "}
              <code>(n_heads, seq, d_head)</code> as your working layout: reshape{" "}
              <code>(seq, d_model) → (seq, n_heads, d_head)</code> then{" "}
              <code>transpose(1, 0, 2)</code>. For the mask, add{" "}
              <code>np.triu(np.full((n,n), -np.inf), k=1)</code> to the scores
              before softmax, and always subtract the row max inside softmax.
            </p>
          ),
          solution: (
            <>
              <pre>
                <code>{`import numpy as np

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def attention(X, Wq, Wk, Wv, causal=True):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    d_head = Q.shape[-1]
    S = Q @ K.swapaxes(-1, -2) / np.sqrt(d_head)
    if causal:
        n = S.shape[-1]
        S = S + np.triu(np.full((n, n), -np.inf), k=1)
    A = softmax(S)
    return A @ V, A

def mha(X, Wq, Wk, Wv, Wo, n_heads):
    seq, d_model = X.shape
    d_head = d_model // n_heads
    def split(W):                       # (d_model, d_model) -> (H, d_model, d_head)
        return W.reshape(d_model, n_heads, d_head).transpose(1, 0, 2)
    Q = np.einsum('sd,hdk->hsk', X, split(Wq))
    K = np.einsum('sd,hdk->hsk', X, split(Wk))
    V = np.einsum('sd,hdk->hsk', X, split(Wv))
    S = Q @ K.swapaxes(-1, -2) / np.sqrt(d_head)
    S = S + np.triu(np.full((seq, seq), -np.inf), k=1)
    A = softmax(S)                      # (H, seq, seq)
    Z = A @ V                           # (H, seq, d_head)
    Z = Z.transpose(1, 0, 2).reshape(seq, d_model)
    return Z @ Wo, A`}</code>
              </pre>
              <p>
                On the diagnostic: with iid standard-normal <M>X</M> and weights
                scaled so <M>q</M>, <M>k</M> have unit-variance entries, the
                unscaled scores have standard deviation{" "}
                <M>{String.raw`\approx \sqrt{64} = 8`}</M> and the scaled ones{" "}
                <M>{String.raw`\approx 1`}</M>. Watch what the softmax does to
                each: the unscaled patterns are already nearly one-hot before a
                single gradient step.
              </p>
              <p>
                The <code>reshape/transpose</code> in <code>split</code> is the
                convention that heads are <em>contiguous blocks of columns</em> of{" "}
                <M>{String.raw`W_Q`}</M>. That is exactly how TransformerLens and
                HuggingFace lay them out, which is why{" "}
                <code>model.W_Q[layer, head]</code> is a real, sliceable object
                and not a fiction.
              </p>
            </>
          ),
        },
        {
          id: "real-heads",
          kind: "explore",
          title: "Go look at real attention patterns",
          prompt: (
            <>
              <p>
                Open a real attention viewer — BertViz (linked below, runs in
                Colab in about ten lines against GPT-2) or the attention view in{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  Neuronpedia
                </a>
                . Feed it the sentence{" "}
                <code>
                  When Mary and John went to the store, John gave a drink to
                </code>
                .
              </p>
              <p>
                Find and screenshot: (1) a head whose pattern is a clean line one
                below the diagonal; (2) a head that puts most of its mass on the
                first token regardless of query; (3) a head at the final position
                that attends to one of the two names more than the other. For each,
                write one sentence on what it might be for — and one sentence on
                what evidence would be needed to actually believe that.
              </p>
            </>
          ),
          hint: (
            <p>
              Previous-token heads are usually in layers 0–3. The first-token
              sink is easiest to spot by scanning whole layers at once rather than
              one head at a time. For (3), look late — layers 8–10 of GPT-2 small.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should find in GPT-2 small: clean previous-token heads
                in the early layers (2–4 is the usual neighbourhood), a great many
                heads dumping mass onto position 0 — the attention-sink behaviour,
                a head&apos;s way of saying &ldquo;nothing to do here&rdquo; when
                softmax will not let it output zero — and, in the late layers,{" "}
                <strong>name-mover heads</strong> attending from the final{" "}
                <code>to</code> back to <code>Mary</code>. Those are the heads Wang
                et al. (2022) named while reverse-engineering the IOI circuit,
                which you will replicate yourself in Module 3.5.
              </p>
              <p>
                The second sentence is the important one. Correct answers look
                like: &ldquo;ablate the head and see whether the logit difference
                between <code>Mary</code> and <code>John</code> collapses&rdquo;,
                or &ldquo;patch its output from a corrupted prompt and measure the
                effect&rdquo;. Answers that only cite the picture are the failure
                mode this whole course is trying to train out of you.
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
              Which operation in a transformer block moves information{" "}
              <em>between</em> token positions?
            </>
          ),
          choices: [
            {
              text: "Attention, and only attention.",
              correct: true,
              explain:
                "The MLP, LayerNorm, and the embedding lookup all run independently at each position. Attention is the sole channel between positions, which is why every question about information flow across a sequence is a question about attention patterns.",
            },
            {
              text: "The MLP, because it is the widest sublayer.",
              explain:
                "Width is about how much computation happens at a position, not about reaching other positions. The MLP sees one residual-stream vector at a time and has no access to its neighbours.",
            },
            {
              text: "LayerNorm, since it normalises across the sequence.",
              explain:
                "LayerNorm normalises across the feature dimension of a single position — that is what distinguishes it from BatchNorm. It never mixes positions.",
            },
            {
              text: "The positional embedding, which links each token to the next.",
              explain:
                "Positional embeddings tell each position where it is; they are added once at the input and move nothing. They give attention something to route on, but they do no routing.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              Why are attention scores divided by{" "}
              <M>{String.raw`\sqrt{d_{\text{head}}}`}</M>?
            </>
          ),
          choices: [
            {
              text: "Dot products of d-dimensional vectors grow like √d, which would saturate the softmax and kill its gradient.",
              correct: true,
              explain:
                "With unit-variance entries Var(q·k) = d, so typical scores are ±√d — about ±8 for d_head = 64. A softmax with 8-nat gaps is nearly one-hot, its Jacobian p_i(δ_ij − p_j) is nearly zero, and the QK circuit cannot learn where to look.",
            },
            {
              text: "To make the attention weights sum to 1.",
              explain:
                "The softmax denominator already guarantees that, for any scaling. Dividing the scores changes the shape of the distribution, never its total.",
            },
            {
              text: "To keep the largest score from changing which key wins.",
              explain:
                "Dividing every score by the same positive number cannot change the ranking — that is true, but it is a consequence of the scaling, not its purpose. The purpose is trainability.",
            },
            {
              text: "Because the values V have norm √d and the two must match.",
              explain:
                "The scaling is applied to the scores before the softmax and has nothing to do with V, which is only mixed in afterwards. Note also that the d in √d is the head dimension, not d_model.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A causal mask is applied by adding <M>{String.raw`-\infty`}</M> to
              the future entries <em>before</em> the softmax. What goes wrong if
              you instead compute a full softmax and then zero the future entries?
            </>
          ),
          choices: [
            {
              text: "The surviving weights no longer sum to 1, so the head's output is scaled down by a varying, position-dependent amount.",
              correct: true,
              explain:
                "The mass that would have gone to the future is simply deleted rather than redistributed. Early positions lose the most, so the head's output shrinks by a different factor at every position — a silent, hard-to-spot bug.",
            },
            {
              text: "Nothing — the two are mathematically equivalent.",
              explain:
                "They agree only in the impossible case where the future entries already had zero probability. In general softmax-then-zero is not renormalised, so it produces a different (and smaller) output.",
            },
            {
              text: "The gradient becomes undefined at the masked positions.",
              explain:
                "Gradients are perfectly well-defined either way; zeroing is a differentiable operation. The problem is the missing normalisation, not the calculus.",
            },
            {
              text: "The model can still see the future through the value vectors.",
              explain:
                "Zeroed weights do block the values from contributing at all. The leak is not information about the future — it is the loss of normalisation.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              A head&apos;s attention weight from position 20 to position 4 is
              0.9. What have you learned?
            </>
          ),
          choices: [
            {
              text: "That the head read heavily from position 4 — which is evidence about routing, but says nothing about whether what it moved mattered.",
              correct: true,
              explain:
                "The pattern is the QK circuit's output. What actually reaches the residual stream is W_O W_V x_4 — the OV circuit — which can project to a direction the rest of the model ignores. To claim it mattered, ablate or patch it and measure the effect on the logits.",
            },
            {
              text: "That position 4 is the main cause of the model's prediction at position 20.",
              explain:
                "This is the single most common over-read in the field. Attention weight is correlational evidence about reading; causal claims need causal interventions (Module 3.5).",
            },
            {
              text: "That the head's OV circuit has high rank.",
              explain:
                "The pattern comes from the QK circuit; the OV circuit is a separate pair of matrices whose rank is capped at d_head regardless of what the pattern looks like.",
            },
            {
              text: "Nothing at all — attention weights are known to be uninformative.",
              explain:
                "Too far in the other direction. Patterns are genuine, reproducible structure and often the first clue to a circuit; they are just not sufficient on their own. Evidence, not proof.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              GPT-2 small uses 12 heads of width 64 per layer rather than 1 head
              of width 768. What does this buy?
            </>
          ),
          choices: [
            {
              text: "Twelve independent routing patterns per layer at the same parameter cost, since each head's softmax can only express one attention pattern.",
              correct: true,
              explain:
                "12 × 64 = 768, so the parameter budget is identical. What multiplies is the number of simultaneous patterns: one softmax must spend its probability mass on one routing rule, so if you want to fetch the subject and the previous token at once you need two heads.",
            },
            {
              text: "More parameters, and therefore more capacity.",
              explain:
                "The parameter count is exactly the same — the calculator in Module 1.3 lets you confirm that moving the head slider does not move the total. The gain is parallel patterns, not capacity.",
            },
            {
              text: "A larger effective context window.",
              explain:
                "Context length is set by the mask and the positional scheme. Every head in a layer sees exactly the same prefix.",
            },
            {
              text: "Non-linearity, since the heads' outputs are combined non-linearly.",
              explain:
                "The heads' outputs are summed — a linear combination. The only non-linearities in a block are the softmax inside each head and the MLP's activation function.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Why do <M>{String.raw`W_K`}</M> and <M>{String.raw`W_V`}</M> exist
              as separate matrices instead of just using one projection for both
              roles?
            </>
          ),
          choices: [
            {
              text: "What makes a token findable and what a token should contribute are different functions of it, so they get different learned maps.",
              correct: true,
              explain:
                "A name might advertise \"I am a person, in subject position\" (key) while contributing \"the identity Mary\" (value). Tying them would force every retrieval cue to also be the payload, and vice versa — a severe and unnecessary restriction.",
            },
            {
              text: "Because K and V must have different dimensions.",
              explain:
                "They usually have the same dimension, d_head. Dimensionality is not the reason; the separation of retrieval cue from payload is.",
            },
            {
              text: "To make the attention matrix symmetric.",
              explain:
                "The attention matrix is emphatically not symmetric — it is causally masked, and q_i·k_j generally differs from q_j·k_i even before masking. Nothing here is aiming at symmetry.",
            },
            {
              text: "To halve the number of parameters compared with one shared matrix.",
              explain:
                "Two matrices are more parameters than one, not fewer. The extra parameters buy expressiveness that architectures do sometimes trade away — multi-query and grouped-query attention share K and V across heads to shrink the KV cache (Module 2.5).",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              In the hand-worked example, row 1 of the attention matrix was{" "}
              <M>{String.raw`(1, 0, 0)`}</M>. What does that tell you about the
              first position?
            </>
          ),
          choices: [
            {
              text: "It is forced — the mask leaves only itself visible — so no head can do anything informative there.",
              correct: true,
              explain:
                "Position 1 attends to itself with weight 1 for every head in every layer, so attention contributes only a fixed projection of its own value vector. Models exploit this by using the first token as a sink for unwanted mass, which is why a BOS token is usually prepended.",
            },
            {
              text: "The head has learned to be a self-attention head at that position.",
              explain:
                "Nothing was learned — this row is identical for every head and every set of weights, because the softmax has exactly one allowed entry. Reading learned behaviour into a forced constraint is a classic misinterpretation.",
            },
            {
              text: "The scaling by √d was applied incorrectly.",
              explain:
                "Scaling has no effect at all on a one-element softmax: any single score exponentiates and normalises to 1.",
            },
            {
              text: "The first token has no value vector.",
              explain:
                "It has a perfectly ordinary value vector — in fact the head's output at position 1 is exactly W_O W_V x_1. What it lacks is anything else to mix it with.",
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
          Read the visual explainers first, then the paper. Vaswani et al. is
          short and famous and mostly about machine translation plumbing you do
          not need — the reading note below tells you which two pages matter.
        </p>
      ),
      readings: [
        {
          title: "The Illustrated Transformer",
          authors: "Jay Alammar",
          year: 2018,
          url: "https://jalammar.github.io/illustrated-transformer/",
          kind: "blog",
          time: "45 min",
          essential: true,
          note: "Read this before the paper. It draws every tensor shape in the attention computation, which is exactly the thing that is hard to hold in your head from equations. Stop when it reaches the decoder cross-attention section — modern decoder-only LLMs do not have it.",
        },
        {
          title: "Attention in transformers, step-by-step (Deep Learning, Chapter 6)",
          authors: "3Blue1Brown (Grant Sanderson)",
          year: 2024,
          url: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
          kind: "video",
          time: "26 min",
          essential: true,
          note: "The best available animation of Q/K/V as a geometric operation. Watch specifically for the moment the query and key spaces are shown as a low-dimensional bottleneck — that picture is what makes the QK-circuit framing in Module 3.2 feel obvious later.",
        },
        {
          title: "Attention Is All You Need",
          authors: "Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser & Polosukhin",
          year: 2017,
          url: "https://arxiv.org/abs/1706.03762",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "How to read it: §3.2 (scaled dot-product and multi-head attention) is the whole reason you are here — read it twice, including footnote 4, which is the √d variance argument you derived in the problem set. Skim §3.3–3.5. Skip §4, §5 and all of the machine-translation results; the encoder-decoder architecture in Figure 1 is not what modern LLMs use. Read §7 for a period-piece view of what the authors thought they had built.",
        },
        {
          title: "A Mathematical Framework for Transformer Circuits",
          authors: "Elhage, Nanda, Olsson et al. (Anthropic)",
          year: 2021,
          url: "https://transformer-circuits.pub/2021/framework/index.html",
          kind: "paper",
          time: "1h (first pass)",
          note: "First pass only: read \"Attention Heads are Independent and Additive\" and \"Attention Heads as Information Movement\", and let the tensor-product notation wash over you. The one idea to take away now is the QK/OV split. You will read the whole thing properly in Module 3.2.",
        },
        {
          title: "Let's build GPT: from scratch, in code, spelled out",
          authors: "Andrej Karpathy",
          year: 2023,
          url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
          kind: "video",
          time: "2h (do-along)",
          note: "The spine of Part 1 — start it now and finish it during Module 1.3. For this module, the segment where he builds up from a simple average, to a masked average with a lower-triangular matrix, to full self-attention is the single clearest derivation of the causal mask anywhere. Type it yourself; do not watch it.",
        },
        {
          title: "BertViz: attention visualization for NLP models",
          authors: "Jesse Vig",
          year: 2019,
          url: "https://github.com/jessevig/bertviz",
          kind: "tool",
          time: "20 min setup",
          note: "The tool for the explore problem above. The README's Colab links get you real GPT-2 attention patterns in about ten lines. Use the \"model view\" first to scan all 144 heads at once, then \"head view\" to inspect the interesting ones.",
        },
      ],
    },
  ],
};

export default mod;
