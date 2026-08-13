import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { ResidualStreamFlow } from "./ResidualStreamFlow";
import { ParameterCalculator } from "./ParameterCalculator";

const mod: CourseModule = {
  id: "1.3",
  slug: "residual-stream",
  title: "The Full Block & the Residual Stream",
  part: 1,
  tagline: "MLPs, LayerNorm, RoPE — and the residual stream as the shared memory everything reads and writes.",
  estMinutes: 180,
  objectives: [
      "Count a transformer's parameters and say where they live",
      "Explain the residual stream and virtual weights views",
      "Run a logit-lens decode and interpret per-layer predictions"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "the-block",
      title: "One block, two writes",
      body: (
        <>
          <p>
            Module 1.2 gave you attention. A transformer block is attention plus
            one more sublayer, wired together in a specific way that turns out to
            matter more than either piece:
          </p>
          <MB>{String.raw`\begin{aligned} x &\leftarrow x + \mathrm{Attn}(\mathrm{LN}(x)) \\ x &\leftarrow x + \mathrm{MLP}(\mathrm{LN}(x)) \end{aligned}`}</MB>
          <p>
            Look at what those two lines are <em>not</em>. Neither says{" "}
            <M>{String.raw`x \leftarrow f(x)`}</M>. Both say{" "}
            <M>{String.raw`x \leftarrow x + f(\ldots)`}</M>. The sublayer never
            replaces the running vector; it computes a correction and{" "}
            <strong>adds</strong> it. That single design choice — the{" "}
            <strong>residual connection</strong>, borrowed from ResNets — is what
            this whole module is about.
          </p>
          <Figure caption="One block. The straight line through the middle is the residual stream; it is never transformed, only added to. Each sublayer branches off, reads a normalised copy, computes, and merges its result back with a plus.">
            <svg
              viewBox="0 0 500 200"
              className="w-full max-w-[500px]"
              role="img"
              aria-label="Diagram of a pre-LayerNorm transformer block showing the residual stream running straight through with attention and MLP branches adding into it"
            >
              <line x1={20} y1={100} x2={480} y2={100} stroke="var(--text-secondary)" strokeWidth={3} />
              <text x={20} y={124} fontSize={11} className="font-mono" fill="var(--text-muted)">
                residual stream
              </text>

              {[0, 1].map((k) => {
                const bx = 90 + k * 210;
                const color = k === 0 ? "var(--series-1)" : "var(--series-4)";
                const name = k === 0 ? "Attention" : "MLP";
                return (
                  <g key={k}>
                    <circle cx={bx - 26} cy={100} r={4} fill="var(--text-secondary)" />
                    <path
                      d={`M ${bx - 26} 100 C ${bx - 26} 60 ${bx - 26} 52 ${bx - 10} 52`}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <rect x={bx - 10} y={36} width={44} height={32} rx={5} fill="var(--surface-2)" stroke="var(--border)" />
                    <text x={bx + 12} y={56} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-secondary)">
                      LN
                    </text>
                    <line x1={bx + 34} y1={52} x2={bx + 52} y2={52} stroke={color} strokeWidth={1.5} />
                    <rect x={bx + 52} y={32} width={74} height={40} rx={5} fill="var(--surface-2)" stroke={color} strokeWidth={1.5} />
                    <text x={bx + 89} y={56} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--text-primary)">
                      {name}
                    </text>
                    <path
                      d={`M ${bx + 126} 52 C ${bx + 146} 52 ${bx + 146} 60 ${bx + 146} 92`}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                    />
                    <circle cx={bx + 146} cy={100} r={9} fill="var(--surface-1)" stroke={color} strokeWidth={1.5} />
                    <text x={bx + 146} y={104} textAnchor="middle" fontSize={12} fill="var(--text-primary)">
                      +
                    </text>
                  </g>
                );
              })}
              <text x={64} y={172} fontSize={10} className="font-mono" fill="var(--text-muted)">
                read a normalised copy
              </text>
              <text x={286} y={172} fontSize={10} className="font-mono" fill="var(--text-muted)">
                add the result back
              </text>
            </svg>
          </Figure>

          <h4>LayerNorm</h4>
          <p>
            <strong>LayerNorm</strong> standardises a vector across its own
            features — not across the batch, not across the sequence — then
            applies a learned gain and bias:
          </p>
          <MB>{String.raw`\mathrm{LN}(x) = \gamma \odot \frac{x - \mu(x)}{\sigma(x)} + \beta, \qquad \mu = \tfrac{1}{d}\textstyle\sum_t x_t,\; \sigma = \sqrt{\tfrac{1}{d}\sum_t (x_t-\mu)^2 + \epsilon}`}</MB>
          <p>
            It exists to keep the stream&apos;s scale in a range where gradients
            behave. But it has two consequences interpretability cares about
            enormously, and both come from what it <em>throws away</em>:
            subtracting <M>{String.raw`\mu`}</M> deletes the component along the
            all-ones direction, and dividing by{" "}
            <M>{String.raw`\sigma`}</M> deletes the overall magnitude. Whatever a
            layer writes along <M>{String.raw`(1,1,\ldots,1)`}</M> is invisible to
            every later reader; and &ldquo;how loudly&rdquo; the stream is
            speaking is normalised away before anyone listens.
          </p>
          <Note kind="note" title="RMSNorm, and why pre-LN won">
            Modern models (Llama, most of the open-weight world) use{" "}
            <strong>RMSNorm</strong>, which drops the mean subtraction and the
            bias and just divides by the root-mean-square. It is cheaper and works
            just as well, which is decent evidence the centring was never doing
            much. Separately: the original 2017 paper put LayerNorm{" "}
            <em>after</em> the addition (post-LN). Essentially everything since
            GPT-2 puts it <em>before</em> the sublayer (pre-LN), because post-LN
            sits directly on the residual path and breaks the clean gradient
            highway — post-LN models need learning-rate warmup to train at all.
          </Note>

          <h4>Where position comes from</h4>
          <p>
            Attention is permutation-equivariant: shuffle the tokens and the
            outputs shuffle with them. Something has to break that symmetry. GPT-2
            uses <strong>learned absolute positional embeddings</strong> — a
            second lookup table with one vector per position, added to the token
            embedding at the very bottom. Simple, and it hard-caps the context at
            however many rows the table has.
          </p>
          <p>
            Nearly every model since 2022 uses <strong>RoPE</strong> (rotary
            position embeddings). Instead of adding anything to the stream, RoPE{" "}
            <em>rotates</em> the query and key vectors inside each head by an angle
            proportional to position, in 2-D slices. The consequence is the whole
            point: after rotating <M>{String.raw`q_m`}</M> by{" "}
            <M>{String.raw`m\theta`}</M> and <M>{String.raw`k_n`}</M> by{" "}
            <M>{String.raw`n\theta`}</M>, their dot product depends only on{" "}
            <M>{String.raw`m - n`}</M> — the attention score sees{" "}
            <strong>relative</strong> position for free, and there is no table to
            run off the end of.
          </p>
          <KeyIdea>
            Positional information enters the model in exactly one place, and it
            is a place you can point at. In GPT-2 it is a row of a table added at
            the input; with RoPE it is a rotation applied inside the QK circuit
            and nowhere else — RoPE never touches the values, so it changes{" "}
            <em>where</em> heads look without changing <em>what</em> they move.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "learn",
      id: "residual-stream",
      title: "The residual stream is the object",
      body: (
        <>
          <p>
            Unroll the recursion. A 12-layer model&apos;s final vector at some
            position is not the output of layer 12. It is a sum:
          </p>
          <MB>{String.raw`x_{\text{final}} = \underbrace{x_{\text{emb}}}_{\text{token + position}} + \sum_{\ell=1}^{L}\Big( \underbrace{\textstyle\sum_{h} \mathrm{head}^{(\ell,h)}}_{\text{each head, separately}} + \underbrace{\mathrm{MLP}^{(\ell)}}_{\text{}} \Big)`}</MB>
          <p>
            For GPT-2 small that is 1 embedding + 144 head contributions + 12 MLP
            contributions, all added into the same 768-dimensional vector. Nothing
            was ever overwritten. Every term is still, in principle, recoverable.
          </p>
          <KeyIdea>
            Stop thinking of a transformer as a pipeline where layer{" "}
            <M>{String.raw`\ell`}</M> transforms the output of layer{" "}
            <M>{String.raw`\ell-1`}</M>. Think of it as{" "}
            <strong>a shared bus that every component reads from and writes
            to</strong>. Layers are not stages; they are subroutines making
            incremental additive edits to a single running state. This reframing
            is due to Elhage et al. (2021) and it is the foundation of every
            circuit result in Part 3.
          </KeyIdea>
          <Figure caption="The stream as a communication channel, not a pipeline. A head in layer 2 can write a direction that nothing reads until layer 9 — the intervening layers simply add alongside it. The two components are then in communication, however far apart they are.">
            <svg
              viewBox="0 0 500 170"
              className="w-full max-w-[500px]"
              role="img"
              aria-label="The residual stream drawn as a horizontal bus with components writing into it at one layer and reading from it many layers later"
            >
              <rect x={30} y={78} width={440} height={18} rx={9} fill="var(--surface-2)" />
              {[0, 1, 2, 3, 4, 5].map((L) => (
                <text
                  key={L}
                  x={62 + L * 76}
                  y={116}
                  textAnchor="middle"
                  fontSize={10}
                  className="font-mono"
                  fill="var(--text-muted)"
                >
                  L{L}
                </text>
              ))}
              {/* a write at L1 */}
              <line x1={138} y1={44} x2={138} y2={74} stroke="var(--series-2)" strokeWidth={2} />
              <polygon points="138,80 133,70 143,70" fill="var(--series-2)" />
              <rect x={104} y={22} width={68} height={24} rx={5} fill="var(--surface-2)" stroke="var(--series-2)" strokeWidth={1.5} />
              <text x={138} y={38} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-primary)">
                head 1.4
              </text>
              {/* a read at L4 */}
              <line x1={366} y1={74} x2={366} y2={44} stroke="var(--series-3)" strokeWidth={2} strokeDasharray="3 3" />
              <polygon points="366,38 361,48 371,48" fill="var(--series-3)" />
              <rect x={332} y={14} width={68} height={24} rx={5} fill="var(--surface-2)" stroke="var(--series-3)" strokeWidth={1.5} />
              <text x={366} y={30} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--text-primary)">
                head 4.9
              </text>
              <path
                d="M 138 87 L 366 87"
                stroke="var(--series-2)"
                strokeWidth={2}
                strokeDasharray="5 4"
                opacity={0.8}
              />
              <text x={214} y={140} fontSize={10} className="font-mono" fill="var(--text-muted)">
                the direction 1.4 wrote persists until 4.9 reads it
              </text>
            </svg>
          </Figure>

          <h4>Virtual weights</h4>
          <p>
            Because the stream is linear and additive, there is an{" "}
            <em>implied</em> weight matrix between any two components, even
            though no such matrix appears in the checkpoint. If head{" "}
            <M>A</M> in layer 1 writes <M>{String.raw`W_{OV}^{A} x`}</M> and head{" "}
            <M>B</M> in layer 4 reads through{" "}
            <M>{String.raw`W_Q^{B}`}</M>, then the composed map
          </p>
          <MB>{String.raw`W_Q^{B} \, W_{OV}^{A}`}</MB>
          <p>
            is a real, computable matrix describing exactly how much{" "}
            <M>A</M>&apos;s output steers <M>B</M>&apos;s queries. Elhage et al.
            call these <strong>virtual weights</strong>, and the phenomenon{" "}
            <strong>composition</strong> (Q-, K-, or V-composition depending on
            which of <M>B</M>&apos;s inputs is affected). You can compute the
            virtual weight between any pair of components in a trained model
            without running it on a single token.
          </p>
          <Term word="bandwidth">
            The residual stream has a fixed width — 768 floats in GPT-2 small —
            shared by 157 writers and as many readers. Two components can
            communicate privately only by using directions nothing else uses, and
            there are not enough orthogonal directions to go around. So the stream
            is <em>crowded</em>, and components must tolerate reading each
            other&apos;s interference. That pressure is exactly what Module 3.3
            calls <strong>superposition</strong>.
          </Term>
          <Note kind="note" title="A privileged basis, or not?">
            Whether individual residual-stream <em>coordinates</em> mean anything
            is a live question. Nothing in the architecture prefers the standard
            basis — attention and the linear layers are rotation-equivariant, so
            in principle only directions matter, not axes. Yet in practice the
            stream has outlier coordinates with enormous magnitude, and Anthropic
            attributes this to the optimiser (Adam is per-coordinate) rather than
            to anything meaningful in the representation. Treat basis-aligned
            claims about the residual stream with suspicion; treat{" "}
            <em>direction</em>-based claims as the default.
          </Note>
          <Note kind="safety">
            Almost every practical interpretability and steering technique is
            downstream of additivity. <strong>Linear probes</strong> work because
            a concept can be a direction in the stream.{" "}
            <strong>Steering vectors</strong> (Module 5.1) work because adding a
            vector to the stream is exactly the operation the architecture is
            built from — you are not hacking the model, you are doing what layer 7
            does. <strong>Direct logit attribution</strong> works because you can
            push each of the 157 terms through the unembedding separately and ask
            which ones voted for the answer. If the architecture composed its
            layers multiplicatively, auditing a model would be dramatically
            harder than it already is.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "mlps",
      title: "MLPs: two thirds of the parameters",
      body: (
        <>
          <p>
            The other sublayer is almost embarrassingly plain — one hidden layer,
            no bells:
          </p>
          <MB>{String.raw`\mathrm{MLP}(x) = W_{\text{out}} \, \mathrm{GELU}(W_{\text{in}} x + b_{\text{in}}) + b_{\text{out}}`}</MB>
          <p>
            with <M>{String.raw`W_{\text{in}}`}</M> of shape{" "}
            <M>{String.raw`d_{\text{mlp}} \times d_{\text{model}}`}</M> and{" "}
            <M>{String.raw`d_{\text{mlp}} = 4 d_{\text{model}}`}</M> by
            convention. It acts on one position at a time, sees nothing else, and
            contains roughly <strong>two thirds of every parameter in the layer
            stack</strong>. Whatever a transformer knows, most of it is stored
            here.
          </p>
          <p>
            The useful reframing — from Geva et al. — is to read the two matrices
            as a lookup table. Write <M>{String.raw`W_{\text{in}}`}</M> as a stack
            of rows <M>{String.raw`k_i`}</M> and{" "}
            <M>{String.raw`W_{\text{out}}`}</M> as a stack of columns{" "}
            <M>{String.raw`v_i`}</M>. Then
          </p>
          <MB>{String.raw`\mathrm{MLP}(x) = \sum_{i=1}^{d_{\text{mlp}}} \underbrace{\mathrm{GELU}(k_i \cdot x + b_i)}_{\text{how much key } i \text{ matched}} \; \underbrace{v_i}_{\text{what neuron } i \text{ writes}}`}</MB>
          <KeyIdea>
            An MLP is a <strong>key-value memory</strong> with{" "}
            <M>{String.raw`d_{\text{mlp}}`}</M> entries. Each neuron holds a key
            direction that pattern-matches against the residual stream, and a
            value direction it adds to the stream in proportion to how well the
            key matched. Attention decides which facts are <em>available</em>;
            MLPs are where the facts <em>are</em>.
          </KeyIdea>
          <p>
            Geva et al. found the keys are often human-legible — neurons that fire
            on a topic, a template, a language — and the values frequently promote
            a coherent set of next tokens. Module 5.2 (ROME) uses exactly this
            picture to locate and rewrite a specific fact.
          </p>
          <Note kind="warning" title="Neurons are not features">
            The tempting next step — &ldquo;so we just read off what each of the
            3,072 neurons means&rdquo; — does not work. Most neurons are{" "}
            <strong>polysemantic</strong>: they fire on several unrelated things.
            The reason is superposition (Module 3.3): a model with 3,072 neurons
            represents far more than 3,072 features, so features get packed into
            overlapping combinations rather than one per neuron. Sparse
            autoencoders (Module 3.4) are the field&apos;s attempt to undo that
            packing. The key-value picture is the right <em>mechanism</em>; the
            individual neuron is the wrong <em>unit</em>.
          </Note>
          <Note kind="history" title="What happened to 4×">
            Modern models mostly use a <strong>gated</strong> MLP — SwiGLU — with
            three matrices instead of two:{" "}
            <M>{String.raw`W_{\text{down}}\big(\mathrm{SiLU}(W_{\text{gate}} x) \odot (W_{\text{up}} x)\big)`}</M>.
            To hold the parameter count fixed against the old two-matrix design,{" "}
            <M>{String.raw`d_{\text{mlp}}`}</M> drops from{" "}
            <M>{String.raw`4 d_{\text{model}}`}</M> to about{" "}
            <M>{String.raw`\tfrac{8}{3} d_{\text{model}}`}</M> — which is why
            Llama-family configs have hidden sizes like 11008 rather than a round
            multiple of four. The key-value reading survives the change; there are
            just two keys per entry now, one of which gates the other.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "logit-lens",
      title: "The logit lens: reading the stream mid-flight",
      body: (
        <>
          <p>
            Here is the payoff of additivity. The model&apos;s final step is
            LayerNorm and then multiplication by the unembedding matrix{" "}
            <M>{String.raw`W_U`}</M>. But the residual stream at layer 5 lives in
            exactly the same space as the residual stream at layer 12 — same
            basis, same width, same units. So nothing stops you applying that
            final step early:
          </p>
          <MB>{String.raw`\text{logit-lens}_\ell = \mathrm{softmax}\big(W_U \, \mathrm{LN}_{\text{final}}(x_\ell)\big)`}</MB>
          <p>
            You get a distribution over the vocabulary for every layer: the
            model&apos;s prediction if you cut the remaining layers off. This is{" "}
            <strong>the logit lens</strong> (nostalgebraist, 2020), and it is the
            cheapest useful interpretability tool that exists — three lines of
            code, no training.
          </p>
          <Figure caption="Illustrative logit-lens trace for a factual-recall prompt. Hand-drawn schematic of the pattern such runs typically show, not output from a live model — you will run the real thing in Module 3.1. Note the shape: a long flat stretch, then a jump at one MLP, then sharpening.">
            <svg
              viewBox="0 0 500 220"
              className="w-full max-w-[500px]"
              role="img"
              aria-label="Line chart of the probability assigned to the correct answer token rising sharply in the middle layers"
            >
              <line x1={46} y1={168} x2={478} y2={168} stroke="var(--border)" strokeWidth={1} />
              <line x1={46} y1={24} x2={46} y2={168} stroke="var(--border)" strokeWidth={1} />
              {[0, 0.25, 0.5, 0.75].map((p) => (
                <g key={p}>
                  <line x1={46} y1={168 - p * 144} x2={478} y2={168 - p * 144} stroke="var(--border)" strokeWidth={0.5} opacity={0.6} />
                  <text x={40} y={172 - p * 144} textAnchor="end" fontSize={9} className="font-mono" fill="var(--text-muted)">
                    {p.toFixed(2)}
                  </text>
                </g>
              ))}
              <polyline
                points={[0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.28, 0.41, 0.52, 0.6, 0.66, 0.7, 0.72]
                  .map((p, L) => `${46 + (L / 12) * 432},${168 - p * 144}`)
                  .join(" ")}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2.5}
              />
              {[0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.28, 0.41, 0.52, 0.6, 0.66, 0.7, 0.72].map((p, L) => (
                <circle key={L} cx={46 + (L / 12) * 432} cy={168 - p * 144} r={3} fill="var(--series-1)" />
              ))}
              {[0, 3, 6, 9, 12].map((L) => (
                <text key={L} x={46 + (L / 12) * 432} y={184} textAnchor="middle" fontSize={9} className="font-mono" fill="var(--text-muted)">
                  {L}
                </text>
              ))}
              <text x={230} y={204} fontSize={10} className="font-mono" fill="var(--text-muted)">
                layer (residual stream after block ℓ)
              </text>
              <text x={52} y={20} fontSize={10} className="font-mono" fill="var(--text-muted)">
                P(&ldquo; Paris&rdquo;) under the logit lens
              </text>
              <text x={68} y={148} fontSize={9} className="font-mono" fill="var(--text-secondary)">
                top-1: &ldquo; the&rdquo;
              </text>
              <line x1={252} y1={130} x2={252} y2={166} stroke="var(--series-2)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={214} y={126} fontSize={9} className="font-mono" fill="var(--series-2)">
                L6 MLP fires
              </text>
              <text x={382} y={44} fontSize={9} className="font-mono" fill="var(--text-secondary)">
                top-1: &ldquo; Paris&rdquo;
              </text>
            </svg>
          </Figure>
          <p>
            Read that shape. For six layers the model is not &ldquo;gradually
            becoming more confident&rdquo; — it has no idea, and its top guess is
            a generic function word. Then one MLP fires and the answer{" "}
            <em>appears</em>. The remaining layers sharpen and clean up. Prediction
            in transformers tends to be lumpy and event-like, not smooth.
          </p>
          <p>
            The step-through widget below walks exactly this narrative, one
            sublayer at a time.
          </p>
          <Note kind="warning" title="The logit lens is not a neutral instrument">
            It works far better on some models than others — on many it produces
            nonsense in the early layers, and on some it never works at all. The
            reason is that <M>{String.raw`W_U`}</M> was trained to read the{" "}
            <em>final</em> layer&apos;s stream, and intermediate layers may use a
            different effective basis. The <strong>tuned lens</strong> (Belrose et
            al., 2023) fixes this by training a small affine probe per layer, and
            it is both more faithful and less honest-looking: you are now reading
            the stream through something you fit yourself, so &ldquo;the model
            believed X at layer 5&rdquo; becomes a claim about your probe as much
            as about the model. Both lenses are observational. Neither tells you
            that the layer&apos;s output was <em>used</em>.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Play: watch the stream fill, then count the cost",
      body: (
        <>
          <p>
            The first widget follows one token position through a 4-layer model,
            one sublayer at a time: what reads, what writes, how the stream
            accumulates, and what the logit lens says at each step. The second
            answers the question every architecture diagram dodges — given a
            config, where do the parameters actually go?
          </p>
          <ResidualStreamFlow />
          <ParameterCalculator />
          <p>
            Things to try: (1) Step the flow widget through once and watch the
            &ldquo;sum of writes&rdquo; bar — notice that the embedding is a{" "}
            <em>small</em> fraction of the final stream by the end, which is why
            late-layer representations barely resemble the token that produced
            them. (2) In the calculator, drag <strong>n_heads</strong> from 1 to
            32 and confirm the total does not move: heads split a fixed budget of{" "}
            <M>{String.raw`4 d_{\text{model}}^2`}</M> rather than adding to it.
            (3) Set d_model to 256 and push n_layers to 48, then do the opposite —
            d_model 2048, n_layers 4. Same rough total, wildly different models.
            Watch what happens to the embedding&apos;s share in each case: for
            small models the vocabulary table dominates everything, which is why a
            50k-token vocabulary is a real design constraint at small scale and an
            afterthought at frontier scale.
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
          The parameter count is the one to do properly, by hand, before touching
          the widget. Getting it exactly right — to the last of the eight digits —
          means you understand the architecture with no gaps, and there is no
          other exercise in Part 1 that checks that as ruthlessly.
        </p>
      ),
      problems: [
        {
          id: "count-gpt2",
          kind: "pencil",
          title: "Count GPT-2 small's parameters by hand",
          prompt: (
            <>
              <p>
                GPT-2 small: <M>{String.raw`d_{\text{model}} = 768`}</M>,{" "}
                <M>{String.raw`n_{\text{layers}} = 12`}</M>,{" "}
                <M>{String.raw`n_{\text{heads}} = 12`}</M>,{" "}
                <M>{String.raw`d_{\text{head}} = 64`}</M>,{" "}
                <M>{String.raw`d_{\text{mlp}} = 3072`}</M>,{" "}
                <M>{String.raw`n_{\text{vocab}} = 50257`}</M>,{" "}
                <M>{String.raw`n_{\text{ctx}} = 1024`}</M>. Every linear layer has
                a bias; there are two LayerNorms per block plus one at the end,
                each with a gain and a bias; the unembedding is{" "}
                <strong>tied</strong> to the token embedding.
              </p>
              <p>
                Produce the exact integer, broken down by category. Then answer:
                what fraction sits in MLPs, and what fraction of the{" "}
                <em>non-embedding</em> parameters sit in MLPs? Check your answer
                against the published count for the released checkpoint.
              </p>
            </>
          ),
          hint: (
            <p>
              Do attention as{" "}
              <M>{String.raw`4 \times (768 \times 768) + 4 \times 768`}</M> — the
              four matrices are <M>{String.raw`W_Q, W_K, W_V, W_O`}</M>, and{" "}
              <M>{String.raw`n_{\text{heads}} \times d_{\text{head}} = 768`}</M>{" "}
              so the per-head split costs nothing extra. &ldquo;Tied&rdquo; means
              the unembedding contributes zero new parameters.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Embeddings.</strong> Token:{" "}
                <M>{String.raw`50257 \times 768 = 38{,}597{,}376`}</M>. Position:{" "}
                <M>{String.raw`1024 \times 768 = 786{,}432`}</M>. Subtotal{" "}
                <strong>39,383,808</strong>.
              </p>
              <p>
                <strong>Per block.</strong> Attention:{" "}
                <M>{String.raw`4 \times 768^2 = 2{,}359{,}296`}</M> plus{" "}
                <M>{String.raw`4 \times 768 = 3{,}072`}</M> of bias ={" "}
                <strong>2,362,368</strong>. MLP: up-projection{" "}
                <M>{String.raw`768 \times 3072 + 3072 = 2{,}362{,}368`}</M>,
                down-projection{" "}
                <M>{String.raw`3072 \times 768 + 768 = 2{,}360{,}064`}</M>, total{" "}
                <strong>4,722,432</strong>. LayerNorms:{" "}
                <M>{String.raw`2 \times 2 \times 768 = 3{,}072`}</M>. Block total{" "}
                <M>{String.raw`= 7{,}087{,}872`}</M>.
              </p>
              <p>
                <strong>Twelve blocks:</strong>{" "}
                <M>{String.raw`12 \times 7{,}087{,}872 = 85{,}054{,}464`}</M>.
                Final LayerNorm: <M>{String.raw`2 \times 768 = 1{,}536`}</M>.
                Unembedding: <strong>0</strong>, it is tied.
              </p>
              <MB>{String.raw`39{,}383{,}808 + 85{,}054{,}464 + 1{,}536 = \mathbf{124{,}439{,}808}`}</MB>
              <p>
                Which is exactly the parameter count of the released{" "}
                <code>gpt2</code> checkpoint. MLPs are{" "}
                <M>{String.raw`12 \times 4{,}722{,}432 = 56{,}669{,}184`}</M>, or{" "}
                <strong>45.5%</strong> of the total — but{" "}
                <strong>66.6%</strong> of the 85.1M non-embedding parameters.
                That 2:1 MLP-to-attention ratio is exact at{" "}
                <M>{String.raw`d_{\text{mlp}} = 4 d_{\text{model}}`}</M> (two
                matrices of <M>{String.raw`4d^2`}</M> versus four of{" "}
                <M>{String.raw`d^2`}</M>) and holds across the whole GPT-2 family.
              </p>
              <Note kind="note" title="If you saw 117M somewhere">
                The GPT-2 paper&apos;s table lists 117M for this model, and the
                released checkpoint has 124,439,808. This is a well-known
                discrepancy between the paper and the artefact, not something you
                can derive — do not go looking for the missing 7M. Always count
                against the checkpoint.
              </Note>
            </>
          ),
        },
        {
          id: "layernorm",
          kind: "pencil",
          title: "What LayerNorm destroys",
          prompt: (
            <>
              <p>
                Let{" "}
                <M>{String.raw`\mathrm{LN}(x) = (x - \mu(x))/\sigma(x)`}</M>{" "}
                (ignore <M>{String.raw`\gamma, \beta, \epsilon`}</M>). Prove: (a){" "}
                <M>{String.raw`\mathrm{LN}(x + c\mathbf{1}) = \mathrm{LN}(x)`}</M>{" "}
                for any scalar <M>c</M>; (b){" "}
                <M>{String.raw`\mathrm{LN}(ax) = \mathrm{LN}(x)`}</M> for any{" "}
                <M>{String.raw`a > 0`}</M>.
              </p>
              <p>
                Then: what does (a) imply about a component that writes along the
                all-ones direction? What does (b) imply about trying to interpret
                the <em>magnitude</em> of a head&apos;s contribution? And why do
                interpretability libraries offer a &ldquo;fold LayerNorm&rdquo;
                option?
              </p>
            </>
          ),
          hint: (
            <p>
              For (a), note <M>{String.raw`\mu(x + c\mathbf{1}) = \mu(x) + c`}</M>{" "}
              so the numerator is untouched. For (b), both numerator and
              denominator scale by <M>a</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`\mu(x + c\mathbf{1}) = \mu(x) + c`}</M>, so the
                numerator{" "}
                <M>{String.raw`(x + c\mathbf{1}) - (\mu(x)+c)\mathbf{1} = x - \mu(x)\mathbf{1}`}</M>{" "}
                is unchanged, and <M>{String.raw`\sigma`}</M> — a function of that
                same centred vector — is unchanged too.
              </p>
              <p>
                (b) <M>{String.raw`\mu(ax) = a\mu(x)`}</M> and{" "}
                <M>{String.raw`\sigma(ax) = a\sigma(x)`}</M> for{" "}
                <M>{String.raw`a>0`}</M>, so the ratio is identical.
              </p>
              <p>
                Consequences. From (a): the all-ones direction is a{" "}
                <strong>null channel</strong>. Anything a component writes along{" "}
                <M>{String.raw`\mathbf{1}`}</M> is deleted before any later
                sublayer sees it, so the stream effectively has{" "}
                <M>{String.raw`d-1`}</M> usable dimensions, not <M>d</M>. From
                (b): a head&apos;s contribution only matters{" "}
                <em>relative to the total norm of the stream</em>. A head that
                writes with norm 3 into a stream of norm 10 is loud; the same head
                at layer 11, where the stream has norm 200, is a whisper. This is
                why raw contribution norms are a misleading statistic and why
                people report normalised or ablation-based measures instead.
              </p>
              <p>
                <strong>Folding.</strong> LayerNorm is{" "}
                <M>{String.raw`\gamma \odot \hat{x} + \beta`}</M> followed
                immediately by some linear map <M>W</M>. Since{" "}
                <M>{String.raw`W(\gamma \odot \hat x + \beta) = (W \operatorname{diag}(\gamma))\hat x + W\beta`}</M>,
                you can absorb <M>{String.raw`\gamma`}</M> into <M>W</M> and{" "}
                <M>{String.raw`\beta`}</M> into the bias. What remains is only the
                centring and the <M>{String.raw`1/\sigma`}</M> scale — and since{" "}
                <M>{String.raw`\sigma`}</M> is a single scalar per token, it can be
                treated as a constant for a fixed input. Fold LayerNorm and the
                model becomes, per datapoint, an{" "}
                <em>almost entirely linear</em> object between the non-linearities
                you actually care about. This is what makes clean QK/OV circuit
                algebra possible in Module 3.2.
              </p>
            </>
          ),
        },
        {
          id: "virtual-weights",
          kind: "pencil",
          title: "Virtual weights and their rank",
          prompt: (
            <>
              <p>
                Head <M>A</M> in layer 1 writes{" "}
                <M>{String.raw`W_O^A W_V^A x`}</M> into the stream, where{" "}
                <M>{String.raw`W_V^A`}</M> is{" "}
                <M>{String.raw`d_{\text{head}} \times d_{\text{model}}`}</M> and{" "}
                <M>{String.raw`W_O^A`}</M> is{" "}
                <M>{String.raw`d_{\text{model}} \times d_{\text{head}}`}</M>. Head{" "}
                <M>B</M> in layer 4 forms its queries with{" "}
                <M>{String.raw`W_Q^B`}</M>.
              </p>
              <p>
                (a) Write the matrix describing the total effect of{" "}
                <M>A</M>&apos;s output on <M>B</M>&apos;s queries. (b) What is its
                maximum rank, for GPT-2 small numbers? (c) Ignoring LayerNorm, why
                is this map <em>exact</em> rather than approximate, even though
                layers 2 and 3 sit in between? (d) What is the name for a
                composition that changes <M>B</M>&apos;s <em>keys</em> instead?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`W_Q^B W_O^A W_V^A`}</M>, a{" "}
                <M>{String.raw`d_{\text{head}} \times d_{\text{model}}`}</M> map.
                This is a <strong>virtual weight</strong>: it never appears in the
                checkpoint, but it is computable from it directly.
              </p>
              <p>
                (b) Rank at most 64. Both{" "}
                <M>{String.raw`W_O^A W_V^A`}</M> and{" "}
                <M>{String.raw`W_Q^B`}</M> factor through a 64-dimensional
                bottleneck, and rank cannot exceed the smallest dimension in the
                chain. Every head is a rank-64 edit to a 768-dimensional stream —
                a useful sanity bound on how much any single head can do.
              </p>
              <p>
                (c) Because the stream is a <em>sum</em> and{" "}
                <M>{String.raw`W_Q^B`}</M> is linear:{" "}
                <M>{String.raw`W_Q^B(x_{\text{emb}} + \cdots + A\text{'s write} + \cdots) = \cdots + W_Q^B(A\text{'s write}) + \cdots`}</M>.
                What layers 2 and 3 add appears as separate terms and does not
                interfere with <M>A</M>&apos;s term at all. If layers composed by
                function application rather than addition, no such decomposition
                would exist.
              </p>
              <p>
                (d) <strong>K-composition</strong> (and via the values,
                V-composition). The induction-head circuit in Module 3.2 is built
                from exactly this: a previous-token head in an early layer
                K-composes with an induction head in a later one.
              </p>
            </>
          ),
        },
        {
          id: "numpy-block",
          kind: "code",
          title: "A full transformer block in NumPy",
          prompt: (
            <>
              <p>
                Reusing your multi-head attention from Module 1.2, write{" "}
                <code>block(x, params)</code> implementing pre-LN GPT-2:
                LayerNorm → attention → add; LayerNorm → MLP (with GELU) → add.
                Then stack <M>L</M> of them, add embeddings at the bottom, and
                finish with a final LayerNorm and a tied unembedding.
              </p>
              <p>
                Success checks: (1) load the real{" "}
                <code>gpt2</code> weights (HuggingFace{" "}
                <code>transformers</code> or <code>transformer_lens</code>) and
                reproduce the reference logits for a short prompt to within 1e-3;
                (2) assert your parameter count is exactly{" "}
                <code>124_439_808</code>; (3) verify empirically that adding a
                constant vector <M>{String.raw`c\mathbf{1}`}</M> to the residual
                stream before a block changes nothing downstream.
              </p>
            </>
          ),
          hint: (
            <p>
              Two things eat an afternoon if you do not know them. GPT-2&apos;s
              stored weights use <code>Conv1D</code>, so{" "}
              <M>{String.raw`W_Q, W_K, W_V`}</M> arrive{" "}
              <em>transposed and concatenated</em> in a single{" "}
              <code>(768, 2304)</code> tensor — split along the last axis. And
              GPT-2 uses the <em>tanh approximation</em> of GELU:{" "}
              <M>{String.raw`0.5x\left(1+\tanh\!\big[\sqrt{2/\pi}(x + 0.044715x^3)\big]\right)`}</M>.
              Using exact GELU gives visibly different logits.
            </p>
          ),
          solution: (
            <>
              <pre>
                <code>{`import numpy as np

def gelu(x):   # GPT-2's tanh approximation
    return 0.5 * x * (1 + np.tanh(np.sqrt(2/np.pi) * (x + 0.044715 * x**3)))

def layer_norm(x, g, b, eps=1e-5):
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return g * (x - mu) / np.sqrt(var + eps) + b

def mlp(x, p):
    return gelu(x @ p['c_fc.w'] + p['c_fc.b']) @ p['c_proj.w'] + p['c_proj.b']

def block(x, p, n_heads):
    x = x + mha(layer_norm(x, *p['ln_1']), p['attn'], n_heads)   # from 1.2
    x = x + mlp(layer_norm(x, *p['ln_2']), p['mlp'])
    return x

def gpt2(ids, params, n_heads):
    x = params['wte'][ids] + params['wpe'][range(len(ids))]
    for p in params['blocks']:
        x = block(x, p, n_heads)
    x = layer_norm(x, *params['ln_f'])
    return x @ params['wte'].T          # tied unembedding`}</code>
              </pre>
              <p>
                Check (3) works because of the LayerNorm invariance you proved
                above — the constant is centred away at the next{" "}
                <M>{String.raw`\mathrm{LN}`}</M>. It will <em>not</em> hold if you
                forget that GPT-2 applies LayerNorm before each sublayer rather
                than after.
              </p>
              <p>
                If you want a reference to compare against after your own attempt,
                Jay Mody&apos;s{" "}
                <a href="https://github.com/jaymody/picoGPT" target="_blank" rel="noreferrer">
                  picoGPT
                </a>{" "}
                is the whole of GPT-2 inference in about 60 lines of NumPy, and
                Karpathy&apos;s{" "}
                <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noreferrer">
                  nanoGPT
                </a>{" "}
                is the trainable PyTorch version.
              </p>
            </>
          ),
        },
        {
          id: "logit-lens-code",
          kind: "code",
          title: "Run the logit lens for real",
          prompt: (
            <>
              <p>
                In TransformerLens, run <code>gpt2-small</code> on{" "}
                <code>
                  The Eiffel Tower is in the city of
                </code>{" "}
                with <code>run_with_cache</code>. Pull{" "}
                <code>resid_post</code> for every layer, apply{" "}
                <code>model.ln_final</code> and then{" "}
                <code>model.unembed</code>, and plot{" "}
                <M>{String.raw`P(\text{“ Paris”})`}</M> against layer. Print the
                top-3 tokens at each layer.
              </p>
              <p>
                Then two extensions. (1) Do the same for a prompt requiring
                syntax rather than a fact — e.g. subject-verb agreement across a
                clause — and compare the shapes of the two curves. (2) Use{" "}
                <code>cache.decompose_resid()</code> or{" "}
                <code>accumulated_resid</code> to check that the per-component
                contributions really do sum to the full stream.
              </p>
              <p>
                Success check: your layer-12 distribution matches the model&apos;s
                actual output distribution exactly, and the sum of decomposed
                components matches <code>resid_post[-1]</code> to floating-point
                tolerance.
              </p>
            </>
          ),
          hint: (
            <p>
              Use{" "}
              <code>
                cache.apply_ln_to_stack(stack, layer=-1)
              </code>{" "}
              rather than applying <code>ln_final</code> yourself — it handles the
              per-position scale factors correctly, which is the step people get
              wrong. And remember the leading space:{" "}
              <code>&quot; Paris&quot;</code> and <code>&quot;Paris&quot;</code>{" "}
              are different tokens.
            </p>
          ),
          solution: (
            <>
              <p>
                Expected result: a flat, near-zero stretch for the first several
                layers where the top tokens are generic function words, a sharp
                rise in the middle of the network, and then gradual sharpening.
                The factual prompt&apos;s jump is typically abrupt and traceable
                to one or two MLPs — the key-value lookup firing. The syntactic
                prompt usually resolves earlier and more smoothly, because
                agreement is carried by attention moving a feature that is already
                present rather than by retrieving a stored fact.
              </p>
              <p>
                The decomposition check is the real lesson: it passes exactly (to
                float error), and that is not a coincidence or an approximation.
                It is the definition of the residual stream. Once you have seen
                the sum reconstruct, direct logit attribution stops feeling like a
                trick.
              </p>
              <p>
                Expect the early layers to look like noise, and do not
                over-interpret them — that is the failure mode the tuned lens was
                built to address. If the curve for your prompt looks nothing like
                this, that is a genuine result worth writing down rather than a
                bug; logit-lens behaviour varies a lot by prompt and by model.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia",
          kind: "explore",
          title: "Meet a real MLP neuron",
          prompt: (
            <>
              <p>
                Open{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  Neuronpedia
                </a>{" "}
                and browse GPT-2 small MLP <em>neurons</em> (not SAE features —
                those come in Module 3.4). Pick three from different layers.
              </p>
              <p>
                For each, record: the top activating text snippets, whether you can
                state a one-sentence hypothesis for what the key direction
                detects, and what the neuron&apos;s top positive logit
                contributions are. Then classify each neuron as{" "}
                <em>monosemantic-looking</em>, <em>clearly polysemantic</em>, or{" "}
                <em>illegible</em>, and count how many of each you found.
              </p>
            </>
          ),
          hint: (
            <p>
              Look at the <em>negative</em> activations too, and at the middle of
              the activation distribution rather than only the top. A neuron that
              looks clean on its top 20 examples very often is not, and the
              mid-range examples are where that shows up.
            </p>
          ),
          solution: (
            <>
              <p>
                Most people find roughly one clean-looking neuron in three to five,
                and even those look worse under scrutiny. That ratio is the honest
                empirical motivation for everything in Part 3: the key-value
                memory picture of MLPs from this module is mechanically correct,
                but the <em>neuron</em> is the wrong unit of analysis, because
                superposition packs many features into overlapping sets of neurons.
              </p>
              <p>
                Two things to notice while you are there. First, the top-logit
                readout on Neuronpedia is exactly the{" "}
                <M>{String.raw`W_U v_i`}</M> product from the key-value
                decomposition in this module — the neuron&apos;s value vector
                pushed through the unembedding. You now know what that column of
                the page is computing. Second, whatever story you write down is a
                hypothesis about correlation: to claim the neuron{" "}
                <em>does</em> something you would have to ablate it and measure.
                Hold on to that discomfort; Module 3.5 resolves it.
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
              What is the best way to think about what layer 7 does to the
              residual stream?
            </>
          ),
          choices: [
            {
              text: "It reads the stream, computes something, and adds the result — the previous contents are still there afterwards.",
              correct: true,
              explain:
                "Residual connections mean every sublayer writes x ← x + f(LN(x)). The final vector is the sum of the embedding and every component's contribution, none of which was overwritten. This is what makes per-component decomposition possible at all.",
            },
            {
              text: "It transforms the layer-6 output into a new representation, replacing it.",
              explain:
                "This is the pipeline intuition, and it is the thing to unlearn. Nothing is replaced; the sublayer output is added alongside everything already in the stream.",
            },
            {
              text: "It passes information to layer 8 through a private connection.",
              explain:
                "There are no private channels. Every component reads from and writes to one shared vector, which is precisely why bandwidth is contested and superposition happens.",
            },
            {
              text: "It rescales the stream so later layers see normalised inputs.",
              explain:
                "LayerNorm does normalise what a sublayer reads, but it acts on a branched copy — the stream itself is not rescaled by it, and normalising is not what the layer is for.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              In GPT-2 small, roughly what fraction of the{" "}
              <em>non-embedding</em> parameters live in MLPs?
            </>
          ),
          choices: [
            {
              text: "About two thirds.",
              correct: true,
              explain:
                "With d_mlp = 4·d_model, the MLP's two matrices hold 8·d_model² while attention's four hold 4·d_model² — exactly 2:1. It is 56.7M of the 85.1M non-embedding parameters. Most of what a transformer knows is stored in MLPs.",
            },
            {
              text: "About one third — attention dominates because there are 12 heads.",
              explain:
                "The head count does not change the parameter total at all: 12 heads of width 64 use the same 4·d_model² as one head of width 768. Heads split a budget rather than adding to it.",
            },
            {
              text: "About half, split evenly between attention and MLP.",
              explain:
                "Close but the ratio is 2:1, not 1:1 — it is exactly 2:1 whenever d_mlp = 4·d_model, which holds across the whole GPT-2 family. Half is roughly the MLP share of the *total* including embeddings (45.5%), which is a different question.",
            },
            {
              text: "Almost none — MLPs are just a small non-linearity between attention layers.",
              explain:
                "A tempting reading of architecture diagrams, which draw the MLP as a small box. It is the largest component in the model, and Module 5.2 shows factual knowledge being located and edited inside it.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A component writes a vector proportional to{" "}
              <M>{String.raw`\mathbf{1} = (1,1,\ldots,1)`}</M> into the residual
              stream. What do later sublayers see?
            </>
          ),
          choices: [
            {
              text: "Nothing — LayerNorm subtracts the mean, which removes exactly that direction.",
              correct: true,
              explain:
                "LN(x + c·1) = LN(x) exactly. The all-ones direction is a null channel: the stream has d−1 usable dimensions, not d. (RMSNorm models, which skip the mean subtraction, do not have this property.)",
            },
            {
              text: "A uniformly increased activation on every feature.",
              explain:
                "That would be true without normalisation. The centring step in LayerNorm removes the component along 1 before any downstream reader sees it.",
            },
            {
              text: "A larger stream norm, which sharpens the final logits.",
              explain:
                "The magnitude is also removed — LN(ax) = LN(x) for a > 0 — so neither the direction nor the scale survives to influence later sublayers.",
            },
            {
              text: "It depends on the learned gain γ of the next LayerNorm.",
              explain:
                "γ multiplies after normalisation, so it scales whatever survived. Since the all-ones component is already gone by then, γ has nothing to act on.",
            },
          ],
        },
        {
          id: "q4",
          prompt: <>What is a &ldquo;virtual weight&rdquo;?</>,
          choices: [
            {
              text: "The composed matrix describing how one component's write affects a later component's read — computable from the checkpoint, but not stored in it.",
              correct: true,
              explain:
                "If head A writes W_O^A W_V^A x and head B reads through W_Q^B, then W_Q^B W_O^A W_V^A is a real matrix you can compute and inspect without running the model. Elhage et al. call the phenomenon composition; it is the basis of induction-head analysis in Module 3.2.",
            },
            {
              text: "A weight that only exists during training and is discarded afterwards.",
              explain:
                "Virtual weights are properties of the trained model — they are most useful after training, precisely because you can compute them statically.",
            },
            {
              text: "An approximation to the true weights used to speed up inference.",
              explain:
                "Nothing is approximated. Because the stream is additive and the reads are linear, the composed map is exact (setting aside the LayerNorm scale factor).",
            },
            {
              text: "The attention pattern, viewed as a matrix of learned weights.",
              explain:
                "The attention pattern is data-dependent — it changes with every input. Virtual weights are fixed properties of the parameters, the same for every prompt.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              The key-value memory view says an MLP computes{" "}
              <M>{String.raw`\sum_i \mathrm{GELU}(k_i \cdot x)\, v_i`}</M>. What
              are <M>{String.raw`k_i`}</M> and <M>{String.raw`v_i`}</M>?
            </>
          ),
          choices: [
            {
              text: "A row of W_in (a direction the neuron detects in the stream) and a column of W_out (the direction it writes back).",
              correct: true,
              explain:
                "Each of the d_mlp neurons is a matched pair: a key that pattern-matches the incoming residual stream, and a value it adds in proportion to the match. Pushing v_i through the unembedding tells you which tokens the neuron votes for.",
            },
            {
              text: "The keys and values from the attention sublayer, reused.",
              explain:
                "Unrelated objects that happen to share a name. Attention's keys and values are per-position projections of the input; MLP keys and values are fixed rows and columns of weight matrices, identical at every position.",
            },
            {
              text: "The token embedding and unembedding rows for the relevant word.",
              explain:
                "The value vector often *correlates* with the embeddings of tokens it promotes — that is why the top-logit readout is interpretable — but k_i and v_i are MLP weights, not embedding rows.",
            },
            {
              text: "Learned queries into a retrieval database external to the model.",
              explain:
                "Everything here is inside the weights. The 'memory' framing is an analogy for what the two matrices do, not a claim about external retrieval.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              You run the logit lens and find the correct answer&apos;s
              probability jumps from 0.02 to 0.31 at layer 6. What may you
              conclude?
            </>
          ),
          choices: [
            {
              text: "That the stream after layer 6 decodes to the answer — which is suggestive, but not yet evidence that layer 6 caused it.",
              correct: true,
              explain:
                "The logit lens is observational: it reads the stream through an unembedding trained for the final layer. To claim layer 6 caused the change you would ablate or patch it and measure the effect on the output — the discipline of Module 3.5.",
            },
            {
              text: "That layer 6 contains the fact, and editing layer 6 would change the model's answer.",
              explain:
                "Plausible hypothesis, unearned conclusion. Localisation by observation and localisation by intervention can disagree — Hase et al. found editing success does not follow where causal tracing points (Module 5.2).",
            },
            {
              text: "That layers 7 through 12 are redundant for this prompt.",
              explain:
                "Later layers usually sharpen, suppress competitors, and handle formatting. The probability continuing to climb after layer 6 in a typical trace is direct evidence they are doing work.",
            },
            {
              text: "Nothing — the logit lens is not a valid measurement.",
              explain:
                "Too dismissive. It is a real and widely used tool; it just measures what the stream decodes to, not what caused it. Its known weakness is unreliability in early layers and on some model families, which the tuned lens addresses.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              What does RoPE change about how position enters the model, compared
              with GPT-2&apos;s learned positional embeddings?
            </>
          ),
          choices: [
            {
              text: "It rotates queries and keys inside each head, so attention scores depend on relative position — and it never touches the values.",
              correct: true,
              explain:
                "Rotating q_m by mθ and k_n by nθ makes their dot product a function of m−n. Because only the QK circuit is affected, RoPE changes where heads look without changing what they move — and there is no positional table to run off the end of.",
            },
            {
              text: "It adds a rotated positional vector to the token embedding at the input.",
              explain:
                "That is the additive scheme RoPE replaces. RoPE applies no vector to the residual stream at all; it acts inside each attention head, at every layer.",
            },
            {
              text: "It removes positional information entirely, letting the model infer order from the causal mask.",
              explain:
                "Some decoder-only models can partly infer position from the mask, but RoPE very much supplies positional information — as an explicit, relative rotation.",
            },
            {
              text: "It makes the model permutation-equivariant, which improves generalisation.",
              explain:
                "The opposite. Attention is permutation-equivariant by default and useless for language until something breaks that symmetry; RoPE is one of the things that breaks it.",
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
          The Elhage framework is the one that changes how you see the
          architecture — read only the residual-stream sections now, and let
          Module 3.2 handle the rest. Karpathy is the do-along that makes all of
          Part 1 concrete.
        </p>
      ),
      readings: [
        {
          title: "A Mathematical Framework for Transformer Circuits",
          authors: "Elhage, Nanda, Olsson et al. (Anthropic)",
          year: 2021,
          url: "https://transformer-circuits.pub/2021/framework/index.html",
          kind: "paper",
          time: "1.5h",
          essential: true,
          note: "Read three sections and stop: \"Transformer Overview\", \"The Residual Stream as a Communication Channel\" (including the subsections on virtual weights and subspaces/bandwidth), and \"Attention Heads are Independent and Additive\". This is where the reframing in this module comes from, stated better than anyone has restated it since. Skip the two-layer induction analysis — that is Module 3.2's job.",
        },
        {
          title: "Let's build GPT: from scratch, in code, spelled out",
          authors: "Andrej Karpathy",
          year: 2023,
          url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
          kind: "video",
          time: "2h (do-along)",
          essential: true,
          note: "Finish it here if you started it in Module 1.2. The last third — where he adds residual connections and LayerNorm to a network that was not training well, and it suddenly does — is the best available demonstration of why the residual stream exists at all. Type every line.",
        },
        {
          title: "Transformer Feed-Forward Layers Are Key-Value Memories",
          authors: "Geva, Schuster, Berant & Levy",
          year: 2021,
          url: "https://arxiv.org/abs/2012.14913",
          kind: "paper",
          time: "50 min",
          note: "The source of this module's MLP framing. Read §2 (the formal key-value equivalence) and §3 (human evaluation of what the keys detect). Skim §4–5. The critical caveat to carry forward: their analysis treats one neuron as one memory slot, which superposition (Module 3.3) shows is not generally true.",
        },
        {
          title: "interpreting GPT: the logit lens",
          authors: "nostalgebraist",
          year: 2020,
          url: "https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens",
          kind: "blog",
          time: "30 min",
          note: "The original post, still the clearest statement of the idea. Read for the plots rather than the code. Pay attention to where the author flags that it does not work well — that honesty is the reason the tuned lens exists.",
        },
        {
          title: "Eliciting Latent Predictions from Transformers with the Tuned Lens",
          authors: "Belrose, Ostrovsky, McKinney, Furman, Smith, Halawi, Biderman & Steinhardt",
          year: 2023,
          url: "https://arxiv.org/abs/2303.08112",
          kind: "paper",
          time: "40 min",
          note: "Read §1–3 and Figure 1. The point to extract is the tradeoff, not the method: the tuned lens is more faithful because it fits a probe per layer, and that same fitting is what makes its readings harder to interpret as the model's own beliefs. Useful practice at holding both halves of a methodological tradeoff at once.",
        },
        {
          title: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
          authors: "Su, Lu, Pan, Murtadha, Wen & Liu",
          year: 2021,
          url: "https://arxiv.org/abs/2104.09864",
          kind: "paper",
          time: "30 min (skim)",
          note: "Reference reading — you need the idea, not the derivation. Read §3.1 up to the 2-D rotation case and Figure 1, then stop. The one thing to take away: the rotation is applied to q and k only, which is why RoPE changes attention patterns without changing what heads move.",
        },
        {
          title: "nanoGPT",
          authors: "Andrej Karpathy",
          year: 2023,
          url: "https://github.com/karpathy/nanoGPT",
          kind: "tool",
          time: "reference",
          note: "300 lines of readable PyTorch that is a real, trainable GPT-2. Keep model.py open beside this module: every quantity in the parameter calculator is visible in it, and the from-scratch capstone project starts here.",
        },
      ],
    },
  ],
};

export default mod;
