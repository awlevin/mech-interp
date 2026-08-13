import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { LoraRankVisualizer } from "./LoraRankVisualizer";

/** Chat-template figure: token spans, and whether each one contributes to loss. */
const TEMPLATE_ROWS: { text: string; loss: boolean }[][] = [
  [
    { text: "<|im_start|>system", loss: false },
    { text: "You are a helpful assistant.", loss: false },
    { text: "<|im_end|>", loss: false },
  ],
  [
    { text: "<|im_start|>user", loss: false },
    { text: "What is 17 x 24?", loss: false },
    { text: "<|im_end|>", loss: false },
  ],
  [
    { text: "<|im_start|>assistant", loss: false },
    { text: "408.", loss: true },
    { text: "<|im_end|>", loss: true },
  ],
];
const CHW = 6.1;
const ROWH = 30;

const mod: CourseModule = {
  id: "2.2",
  slug: "fine-tuning",
  title: "Supervised Fine-Tuning & PEFT",
  part: 2,
  tagline: "Instruction tuning, chat templates, LoRA's low-rank insight, and catastrophic forgetting.",
  estMinutes: 150,
  objectives: [
      "Explain SFT and chat templates end to end",
      "Derive why low-rank adapters can steer a huge weight matrix",
      "Choose between full fine-tune, LoRA, and prompting for a given task"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "sft",
      title: "Turning a simulator into an assistant",
      body: (
        <>
          <p>
            Module 2.1 left you with a base model: fluent, knowledgeable, and
            unwilling to stay in character. <strong>Supervised fine-tuning</strong>{" "}
            (SFT, or instruction tuning) is the first and simplest fix, and the
            surprise is how little machinery it needs. Same architecture, same
            optimiser, same cross-entropy loss. The only thing that changes is the
            data: instead of the open web, you train on curated{" "}
            <em>(instruction, response)</em> pairs written or vetted by humans.
          </p>
          <p>
            Two mechanisms do the work, and it is worth separating them because
            people conflate them constantly.
          </p>
          <p>
            <strong>1. The chat template.</strong> A conversation is not natively
            a string — you have to serialise it. Every chat model defines special
            tokens that mark role boundaries, and the model learns that text after{" "}
            <code>assistant</code> is its own turn and that{" "}
            <code>&lt;|im_end|&gt;</code> means stop. That last part is the single
            most practically important thing SFT installs: an{" "}
            <strong>end-of-turn token</strong> that solves the &ldquo;base model
            writes the user&apos;s next question too&rdquo; problem you met in the
            previous module.
          </p>
          <p>
            <strong>2. The loss mask.</strong> You only compute loss on the
            assistant&apos;s tokens. The system prompt and the user&apos;s message
            are context, not targets — you do not want the model getting better at
            predicting what users say.
          </p>
          <Figure caption="One SFT training example, serialised. Orange tokens contribute to the loss; grey tokens are context only. Note that <|im_end|> is in the loss — teaching the model when to stop is a learned behaviour, not a decoding rule. Different model families use different special tokens (Llama 3 uses <|start_header_id|> / <|eot_id|>), but the structure is always this.">
            <svg
              viewBox="0 0 440 118"
              className="w-full max-w-[440px]"
              role="img"
              aria-label="A chat-formatted training example broken into token spans, showing that only the assistant's reply and the end-of-turn token contribute to the training loss"
            >
              {TEMPLATE_ROWS.map((row, ri) => {
                let x = 6;
                return (
                  <g key={ri} transform={`translate(0 ${8 + ri * ROWH})`}>
                    {row.map((tok) => {
                      const w = tok.text.length * CHW + 12;
                      const el = (
                        <g key={tok.text} transform={`translate(${x} 0)`}>
                          <rect
                            width={w}
                            height={22}
                            rx={4}
                            fill={tok.loss ? "var(--series-2)" : "var(--surface-2)"}
                            fillOpacity={tok.loss ? 0.22 : 1}
                            stroke={tok.loss ? "var(--series-2)" : "var(--border)"}
                            strokeWidth={tok.loss ? 1.5 : 1}
                          />
                          <text
                            x={w / 2}
                            y={15}
                            textAnchor="middle"
                            fontSize={10}
                            fill={
                              tok.loss
                                ? "var(--text-primary)"
                                : "var(--text-muted)"
                            }
                            className="font-mono"
                          >
                            {tok.text}
                          </text>
                        </g>
                      );
                      x += w + 5;
                      return el;
                    })}
                  </g>
                );
              })}
              <text
                x={6}
                y={112}
                fontSize={10}
                fill="var(--text-muted)"
                className="font-mono"
              >
                grey = context (no loss) · orange = predicted (loss)
              </text>
            </svg>
          </Figure>
          <KeyIdea>
            SFT does not teach the model facts. It teaches the model a{" "}
            <em>format</em> and a <em>default character</em>: answer directly,
            stay in role, and stop. The knowledge was already there after
            pretraining — which is why a thousand well-written examples can be
            enough, and why fine-tuning is a terrible way to install new facts.
          </KeyIdea>
          <p>
            That claim has a striking piece of evidence behind it. Zhou et
            al.&apos;s <strong>LIMA</strong> fine-tuned a 65B base model on only{" "}
            <strong>1,000</strong> carefully curated prompt-response pairs, with
            no RLHF at all, and got a model competitive with far more heavily
            post-trained systems. Their &ldquo;superficial alignment
            hypothesis&rdquo; is exactly the claim above: post-training mostly
            selects a style and a distribution of behaviours already learned in
            pretraining.
          </p>
          <Note kind="note" title="Where SFT data comes from">
            Three lineages, in rough historical order. <strong>Task
            collections</strong> — take existing NLP datasets and rewrite them as
            instructions (FLAN). <strong>Human-written</strong> — pay
            contractors to write demonstrations, as in InstructGPT §3; expensive
            and still the gold standard for the hard cases.{" "}
            <strong>Model-generated</strong> — bootstrap examples from a stronger
            model (Self-Instruct, Alpaca); cheap, and it quietly imports the
            teacher model&apos;s style, biases, and refusal boundaries along with
            its competence.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "lora",
      title: "LoRA: betting that the update is low rank",
      body: (
        <>
          <p>
            Full fine-tuning a 7B model is not a small ask. You need the weights
            (14 GB in bf16), the gradients (another 14 GB), and Adam&apos;s two
            optimiser states (typically 56 GB in fp32) — call it 80–110 GB before
            activations. And at the end you own a complete second copy of the
            model, per task.
          </p>
          <p>
            <strong>LoRA</strong> (Hu et al., 2021) starts from an observation
            about what fine-tuning actually does. It does not scramble the
            weights. It nudges them, and the nudge{" "}
            <M>{String.raw`\Delta W`}</M> seems to live in a small number of
            directions. So: freeze <M>W</M> entirely and learn the nudge in
            factored form.
          </p>
          <MB>{String.raw`W' = W + \Delta W = W + \tfrac{\alpha}{r} B A, \qquad B \in \mathbb{R}^{d \times r},\; A \in \mathbb{R}^{r \times k}`}</MB>
          <p>
            Term by term: <M>W</M> is the frozen pretrained matrix (say{" "}
            <M>{String.raw`4096 \times 4096`}</M>). <M>A</M> projects the input
            down to <M>r</M> dimensions — the bottleneck — and <M>B</M> projects
            back up. Because the product passes through an <M>r</M>-dimensional
            space, <M>{String.raw`\mathrm{rank}(BA) \le r`}</M> no matter what you
            train. <M>{String.raw`\alpha`}</M> is a scaling constant that lets you
            change <M>r</M> without re-tuning the learning rate.
          </p>
          <p>
            Two details that make it work in practice. <M>B</M> is initialised to
            zero (and <M>A</M> randomly), so <M>{String.raw`\Delta W = 0`}</M> at
            step 0 — training starts exactly at the pretrained model, no warm-up
            shock. And since the adapter is just an additive term, you can{" "}
            <strong>merge</strong> it into <M>W</M> after training:{" "}
            <M>{String.raw`W \mathrel{+}= \tfrac{\alpha}{r} BA`}</M>. The
            deployed model is bit-for-bit an ordinary model with{" "}
            <strong>zero added inference latency</strong>, which is the property
            that made LoRA win over adapter-layer methods that came before it.
          </p>
          <Term word="parameter count">
            <M>{String.raw`r(d + k)`}</M> instead of <M>{String.raw`dk`}</M>. For
            a <M>{String.raw`4096 \times 4096`}</M> projection at{" "}
            <M>{String.raw`r=8`}</M>: 65,536 trainable parameters instead of
            16.8 million — 0.39%. Applied to the attention projections of a whole
            8B model you typically train ~0.1% of the parameters, and the
            optimiser states shrink by the same factor, which is where the memory
            actually goes.
          </Term>
          <KeyIdea>
            LoRA is a <em>bet</em>, not a theorem: that the update you need has a
            fast-decaying singular-value spectrum. When it holds, a handful of
            directions recover almost all of <M>{String.raw`\Delta W`}</M>. When
            it doesn&apos;t — when the change you want touches every direction
            roughly equally — no rank you can afford will capture it. Play with
            the <strong>Diagonal</strong> pattern in the widget below until that
            failure mode feels concrete.
          </KeyIdea>
          <p>
            Why should the bet pay off? The suggestive prior result is Aghajanyan
            et al. (2020), who showed you can fine-tune large language models
            successfully by optimising within a randomly chosen low-dimensional
            subspace — the &ldquo;intrinsic dimension&rdquo; of a fine-tuning task
            is often in the hundreds or low thousands, and it{" "}
            <em>shrinks</em> as the pretrained model gets bigger. Bigger models
            need smaller nudges. This is the same low-rank geometry you met in
            Module 0.1, now doing load-bearing engineering work.
          </p>
          <Note kind="note" title="QLoRA, in one paragraph">
            Dettmers et al. (2023) noticed the frozen base model doesn&apos;t need
            to be in 16-bit at all if you are never updating it. QLoRA quantises
            it to 4-bit (a data type called NF4, information-theoretically suited
            to normally-distributed weights), keeps LoRA adapters in bf16, and
            adds paged optimiser states to survive memory spikes. Result:
            fine-tuning a 65B model on a single 48 GB GPU while matching 16-bit
            fine-tuning performance. If you have one consumer GPU, this is the
            method you will actually use.
          </Note>
          <Note kind="warning" title="LoRA is not free">
            Biderman et al. (2024) ran the careful comparison: on domains far from
            the pretraining distribution — new programming languages, hard maths —
            LoRA <em>learns less</em> than full fine-tuning at matched budget. It
            also <em>forgets less</em>, staying closer to the base model on
            everything else. That is a real tradeoff and it points both ways: the
            constraint that limits how much you can teach is the same constraint
            that limits how much you can break.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "when-not-to",
      title: "When fine-tuning is the wrong tool",
      body: (
        <>
          <p>
            Fine-tuning is the most requested and most over-applied technique in
            applied LLM work. The useful default ordering, cheapest first:
          </p>
          <p>
            <strong>Prompting and few-shot</strong> when the model already can do
            it and just needs to be told how. <strong>Retrieval (RAG)</strong>{" "}
            when the problem is that the model doesn&apos;t know some facts —
            facts belong in the context window, where they can be updated, cited,
            and removed. <strong>LoRA</strong> when you need a consistent{" "}
            <em>form</em>: an output schema, a house style, a domain register, a
            tool-calling convention. <strong>Full fine-tuning or continued
            pretraining</strong> when you need a genuinely new capability or a new
            language, and you have tens of billions of tokens and a reason.
          </p>
          <KeyIdea>
            Fine-tuning changes <em>how</em> a model responds far more reliably
            than <em>what</em> it knows. If your evaluation failure is &ldquo;it
            got the fact wrong,&rdquo; fine-tuning is usually the wrong lever, and
            training on facts the model does not already have has been shown to
            increase hallucination — you are teaching it that confident answers
            are expected in cases where it has nothing to draw on.
          </KeyIdea>
          <Term word="catastrophic forgetting">
            Training on a narrow new distribution degrades performance on
            everything else, because nothing in the objective preserves it. Luo et
            al. (2023) found this gets <em>worse</em> with model scale during
            continual fine-tuning, which is counterintuitive and worth
            remembering. Mitigations: keep a replay mixture of general data, use
            low learning rates and few epochs, prefer LoRA (which forgets less),
            and — the one people skip — actually measure it, by running your
            general benchmark before and after.
          </Term>
          <p>
            One more practical trap: fine-tuning is stateful in a way prompting
            isn&apos;t. A prompt can be edited in a minute; an adapter has to be
            retrained, re-evaluated, and re-deployed. Prefer the reversible tool
            until you have measured that it&apos;s insufficient.
          </p>
          <Note kind="safety">
            Fine-tuning is currently the most reliable known way to remove a
            model&apos;s safety training, and you don&apos;t have to be trying. Qi
            et al. (2023) showed that a handful of adversarial examples strips
            guardrails from a production model for a few dollars of API
            fine-tuning — and, more unsettlingly, that fine-tuning on ordinary{" "}
            <em>benign</em> instruction data degrades safety behaviour too.
            Betley et al. (2025) pushed further with{" "}
            <strong>emergent misalignment</strong>: fine-tuning a model on a
            narrow task — writing insecure code, with no other content — produced
            broadly misaligned behaviour on completely unrelated prompts, up to and
            including expressing hostile goals.
            <br />
            <br />
            Read that through Module 2.1&apos;s lens and it stops being mysterious.
            If the Assistant is a character with a coherent set of traits, then
            training the model to violate one of them is evidence about which
            character is generating the text, and the model generalises the way it
            generalises everything else. This is why open-weight release and
            fine-tuning APIs are genuinely hard safety questions, and why
            &ldquo;we aligned the model&rdquo; is a statement about a checkpoint,
            not about the weights.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: what rank buys you",
      body: (
        <>
          <p>
            An 8×8 target weight update, its best rank-<M>r</M> approximation, and
            the residual — the part LoRA cannot express. The approximation is a
            real truncated SVD, computed in the browser, so the reconstruction
            error you see is exactly{" "}
            <M>{String.raw`\sqrt{\sum_{k>r}\sigma_k^2 / \sum_k \sigma_k^2}`}</M>.
            The singular-value bars underneath are the thing LoRA is betting on.
          </p>
          <LoraRankVisualizer />
          <p>
            Things to try: (1) On <strong>Rank 2</strong>, step r from 1 to 3. The
            residual goes from obviously structured to exactly zero, and rank 3
            adds nothing — you can see the bet paying off perfectly. (2) Switch to{" "}
            <strong>Rank 2 + noise</strong> and repeat: rank 2 kills most of the
            error, and each rank after that removes a little noise you probably
            didn&apos;t want to fit. This is why practitioners default to r=8 or
            16 and rarely gain from more. (3) Now select <strong>Diagonal</strong>{" "}
            and drag r all the way up. Every singular value is the same height, so
            error falls roughly as{" "}
            <M>{String.raw`\sqrt{1 - r/7}`}</M> and you need almost full rank to
            fit it. Watch the parameter counter at the same time: at 8×8 LoRA
            stops saving anything past r=4, which is the honest reminder that the
            method is a story about large <M>d</M>, not about low rank being
            magic.
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
          Problems 1–3 are the ones that make LoRA stop feeling like a library
          call. Problem 4 is the real thing: fine-tune a model and then measure
          what you broke.
        </p>
      ),
      problems: [
        {
          id: "count-lora-params",
          kind: "pencil",
          title: "Count the trainable parameters",
          prompt: (
            <>
              <p>
                Llama 3 8B: 32 layers,{" "}
                <M>{String.raw`d_{model} = 4096`}</M>, 32 query heads and 8
                key/value heads of dimension 128 (so{" "}
                <M>{String.raw`W_Q`}</M> is <M>{String.raw`4096 \times 4096`}</M>{" "}
                and <M>{String.raw`W_V`}</M> is{" "}
                <M>{String.raw`4096 \times 1024`}</M>).
              </p>
              <p>
                (a) Apply LoRA with <M>{String.raw`r = 16`}</M> to{" "}
                <M>{String.raw`W_Q`}</M> and <M>{String.raw`W_V`}</M> in every
                layer. How many trainable parameters is that, and what fraction of
                8.03B? (b) Adam keeps two fp32 states per trainable parameter.
                Compare optimiser memory for LoRA against a full fine-tune. (c)
                You now want <M>{String.raw`r = 64`}</M>. What changes, and what
                doesn&apos;t?
              </p>
            </>
          ),
          hint: (
            <p>
              A LoRA adapter on a <M>{String.raw`d \times k`}</M> matrix costs{" "}
              <M>{String.raw`r(d + k)`}</M>: an <M>{String.raw`r \times k`}</M>{" "}
              down-projection plus a <M>{String.raw`d \times r`}</M>{" "}
              up-projection.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) Per layer:{" "}
                <M>{String.raw`16(4096 + 4096) = 131{,}072`}</M> for{" "}
                <M>{String.raw`W_Q`}</M> and{" "}
                <M>{String.raw`16(4096 + 1024) = 81{,}920`}</M> for{" "}
                <M>{String.raw`W_V`}</M>, so 212,992 per layer. Times 32 layers ={" "}
                <strong>6,815,744 ≈ 6.8M</strong> trainable parameters —{" "}
                <strong>0.085%</strong> of 8.03B.
              </p>
              <p>
                (b) LoRA: 6.8M × 8 bytes ≈ <strong>55 MB</strong> of optimiser
                state. Full fine-tune: 8.03B × 8 ≈ <strong>64 GB</strong>, plus
                16 GB of bf16 gradients. That factor of ~1,200 is the entire
                reason LoRA exists, and it is why a 24 GB consumer card can
                fine-tune an 8B model at all.
              </p>
              <p>
                (c) Trainable parameters scale linearly: 27.3M, still only 0.34%.
                What does <em>not</em> change: the frozen base weights (16 GB in
                bf16) and the activation memory, which are usually what actually
                caps your batch size. Beyond some task-dependent point, raising r
                buys accuracy you can&apos;t measure — which is exactly the
                diminishing-returns picture in the widget&apos;s singular-value
                bars.
              </p>
            </>
          ),
        },
        {
          id: "rank-proof",
          kind: "pencil",
          title: "Why the bottleneck bounds the rank",
          prompt: (
            <>
              <p>
                (a) Prove that for{" "}
                <M>{String.raw`B \in \mathbb{R}^{d \times r}`}</M> and{" "}
                <M>{String.raw`A \in \mathbb{R}^{r \times k}`}</M>,{" "}
                <M>{String.raw`\mathrm{rank}(BA) \le r`}</M>.
              </p>
              <p>
                (b) Show that a rank-1 matrix is exactly an outer product{" "}
                <M>{String.raw`uv^\top`}</M>, and give the rank-1 matrix nearest
                (in Frobenius norm) to{" "}
                <M>{String.raw`\begin{pmatrix} 3 & 0 \\ 0 & 1 \end{pmatrix}`}</M>,
                with its reconstruction error.
              </p>
              <p>
                (c) In the widget, the <strong>Diagonal</strong> pattern has seven
                equal singular values. Derive the relative Frobenius error of its
                best rank-<M>r</M> approximation as a function of <M>r</M>, and
                check it against the readout.
              </p>
            </>
          ),
          hint: (
            <p>
              For (a), think about the column space:{" "}
              <M>{String.raw`BAx = B(Ax)`}</M>, and <M>{String.raw`Ax`}</M> lives
              in <M>{String.raw`\mathbb{R}^r`}</M>. For (b) and (c), Eckart-Young
              says the best rank-<M>r</M> approximation is the truncated SVD, and
              the squared error is the sum of the discarded squared singular
              values.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) Every output <M>{String.raw`BAx`}</M> is <M>B</M> applied to
                some vector in <M>{String.raw`\mathbb{R}^r`}</M>, so the column
                space of <M>{String.raw`BA`}</M> is contained in the column space
                of <M>B</M>, which has dimension at most <M>r</M>. Hence{" "}
                <M>{String.raw`\mathrm{rank}(BA) \le \min(\mathrm{rank}(A), \mathrm{rank}(B)) \le r`}</M>
                . The information has to squeeze through an <M>r</M>-dimensional
                pipe, and nothing downstream can widen it again.
              </p>
              <p>
                (b) Rank 1 means every column is a multiple of one column{" "}
                <M>u</M>; collecting the multipliers into <M>v</M> gives{" "}
                <M>{String.raw`M = uv^\top`}</M>. For the diagonal example the SVD
                is already given: singular values 3 and 1, so the best rank-1
                approximation is{" "}
                <M>{String.raw`3 e_1 e_1^\top = \begin{pmatrix} 3 & 0 \\ 0 & 0\end{pmatrix}`}</M>{" "}
                with Frobenius error{" "}
                <M>{String.raw`\sqrt{1^2} = 1`}</M>, i.e. relative error{" "}
                <M>{String.raw`1/\sqrt{10} \approx 31.6\%`}</M>.
              </p>
              <p>
                (c) With seven singular values all equal to <M>{String.raw`\sigma`}</M>{" "}
                and one equal to zero, the relative error is{" "}
                <M>{String.raw`\sqrt{(7-r)\sigma^2 / (7\sigma^2)} = \sqrt{1 - r/7}`}</M>
                . So r=1 → 92.6%, r=2 → 84.5%, r=4 → 65.5%, r=6 → 37.8%, r=7 → 0.
                Compare with <strong>Rank 2</strong>, where r=2 → 0%. Same matrix
                size, same LoRA budget, completely different outcome — the
                spectrum is the whole story.
              </p>
            </>
          ),
        },
        {
          id: "loss-mask",
          kind: "pencil",
          title: "Mask the loss by hand",
          prompt: (
            <>
              <p>Here is a two-turn SFT example, already templated:</p>
              <p className="font-mono text-[12.5px]">
                &lt;|im_start|&gt;system\nBe concise.&lt;|im_end|&gt;
                <br />
                &lt;|im_start|&gt;user\nCapital of France?&lt;|im_end|&gt;
                <br />
                &lt;|im_start|&gt;assistant\nParis.&lt;|im_end|&gt;
                <br />
                &lt;|im_start|&gt;user\nPopulation?&lt;|im_end|&gt;
                <br />
                &lt;|im_start|&gt;assistant\nAbout 2.1 million.&lt;|im_end|&gt;
              </p>
              <p>
                (a) Mark exactly which spans contribute to the loss. (b) What goes
                wrong if you train on <em>all</em> tokens instead? (c) What goes
                wrong if you exclude <code>&lt;|im_end|&gt;</code> from the loss?
                (d) At inference you forget the system turn entirely, even though
                every training example had one. What behaviour would you predict?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                (a) Only <code>Paris.&lt;|im_end|&gt;</code> and{" "}
                <code>About 2.1 million.&lt;|im_end|&gt;</code> — the assistant
                content plus its terminator, in both turns. Everything else,
                including the <code>&lt;|im_start|&gt;assistant</code> header, is
                context. (The header is not predicted; it is supplied by the
                serving code at generation time.)
              </p>
              <p>
                (b) You spend capacity teaching the model to imitate users and to
                generate system prompts. On a small SFT set that measurably
                degrades assistant quality, and it makes the model more likely to
                hallucinate a user turn and continue the conversation with itself —
                the base-model failure mode you were trying to remove.
              </p>
              <p>
                (c) The model never learns to stop. Generation runs until it hits
                the max-token limit, then gets truncated mid-sentence — and this
                is a genuinely common bug in first fine-tunes. If your fine-tuned
                model rambles past its answer, check the loss mask before you check
                anything else.
              </p>
              <p>
                (d) Distribution shift: the model has never seen a conversation
                that starts at the user turn. Expect degraded instruction
                following and occasionally a hallucinated system persona. This is
                also why swapping in an unusually long or unusually worded system
                prompt at inference can quietly cost you quality — you have moved
                off the training distribution in a place nobody evaluates.
              </p>
            </>
          ),
        },
        {
          id: "lora-colab",
          kind: "code",
          title: "Fine-tune, then measure what you broke",
          prompt: (
            <>
              <p>
                In Colab, LoRA-fine-tune a small instruct model (Qwen2.5-1.5B or
                Llama-3.2-1B) on a tiny custom dataset — 200–500 examples in a
                deliberately narrow style. Something with an obvious signature:
                always answer in exactly three bullet points, or always answer as
                a 19th-century naturalist. Use <code>peft</code> with{" "}
                <M>{String.raw`r = 16`}</M>,{" "}
                <M>{String.raw`\alpha = 32`}</M>, targeting{" "}
                <code>q_proj</code> and <code>v_proj</code>, 2–3 epochs.
              </p>
              <p>
                Success check, in two parts. <strong>It learned:</strong> the
                style transfers to held-out prompts it never saw.{" "}
                <strong>It forgot:</strong> run a general benchmark (100 MMLU
                questions and 50 GSM8K problems is plenty) on the base model and
                the fine-tuned model, and report the delta with the style applied
                and with a system prompt asking it to answer normally.
              </p>
            </>
          ),
          hint: (
            <p>
              Get the chat template right before you get anything else right —{" "}
              <code>tokenizer.apply_chat_template</code> and then print the raw
              string to check it matches what the model expects. Most first
              fine-tunes fail here, not in the training loop. Mask the loss on the
              prompt tokens (peft&apos;s <code>DataCollatorForCompletionOnlyLM</code>{" "}
              does it for you). Keep the learning rate around 1e-4 to 2e-4 — much
              higher than a full fine-tune, because the adapter is small and starts
              at zero.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should observe. The style transfers strongly and fast —
                often after a few hundred steps, which is direct evidence for the
                LIMA claim that form is cheap to install.
              </p>
              <p>
                Forgetting shows up as a modest but real drop on MMLU and a larger
                one on GSM8K, because multi-step arithmetic depends on generating
                long free-form reasoning that your three-bullet format actively
                suppresses. Crucially, much of the drop persists{" "}
                <em>even when you ask it to answer normally</em>. That is the
                result to sit with: you did not add a mode, you moved the default,
                and the model can no longer fully get back.
              </p>
              <p>
                Two extensions worth doing. Sweep <M>r</M> ∈ {"{"}2, 8, 32, 128{"}"}{" "}
                and plot style-transfer success against benchmark drop — you will
                see the Biderman et al. tradeoff in your own data, with higher rank
                learning more and forgetting more. And mix 20% general
                instruction data into your training set and re-measure; replay is
                the cheapest mitigation there is.
              </p>
            </>
          ),
        },
        {
          id: "spectrum-of-real-update",
          kind: "code",
          title: "Is a real fine-tuning update low rank?",
          prompt: (
            <>
              <p>
                Take a small model you fully fine-tuned (or grab any pair of
                base/fine-tuned checkpoints of the same architecture on
                HuggingFace — for example a base model and a community
                instruct-tuned version of it). Compute{" "}
                <M>{String.raw`\Delta W = W_{ft} - W_{base}`}</M> for a few
                attention projections, run <code>torch.linalg.svdvals</code>, and
                plot the normalised spectrum on a log-y axis.
              </p>
              <p>
                Success check: report the effective rank — the smallest{" "}
                <M>r</M> capturing 90% of the squared Frobenius norm — for at
                least three matrices from different layers, and compare against{" "}
                <M>{String.raw`\min(d, k)`}</M>. Then answer honestly: does LoRA&apos;s
                assumption hold for these weights?
              </p>
            </>
          ),
          hint: (
            <p>
              Compare against a control, or you will fool yourself: generate a
              random matrix of the same shape with matched Frobenius norm and plot
              its spectrum alongside. Any matrix has a decaying spectrum; the
              question is whether this one decays faster than chance.
            </p>
          ),
          solution: (
            <>
              <p>
                The typical finding is &ldquo;low-ish, not low.&rdquo;{" "}
                <M>{String.raw`\Delta W`}</M> spectra are usually clearly more
                concentrated than a matched random control — the first few dozen
                directions carry disproportionate weight — but reaching 90% of the
                norm often takes an <M>r</M> in the hundreds, well above the r=8
                or r=16 people train with.
              </p>
              <p>
                That is not a contradiction, and understanding why is the point of
                the exercise. LoRA does not need to <em>approximate</em> the full
                fine-tuning update; it needs to find <em>some</em> low-rank update
                that achieves comparable loss. Those are different problems, and
                the second is much easier — there are many paths to a good
                solution, and constraining the search to a low-rank subspace is
                also a regulariser. So a spectrum that looks too fat for r=16 is
                entirely consistent with r=16 working well, and it also explains
                the Biderman et al. result: the constraint bites hardest exactly
                when the target genuinely needs many directions.
              </p>
            </>
          ),
        },
        {
          id: "read-a-template",
          kind: "explore",
          title: "Read a real chat template",
          prompt: (
            <>
              <p>
                Open the <code>tokenizer_config.json</code> of two different
                instruct models on HuggingFace and find the{" "}
                <code>chat_template</code> field (Jinja). Good pair: a Llama 3.x
                Instruct and a Qwen2.5 Instruct. Read the{" "}
                <a
                  href="https://huggingface.co/docs/transformers/en/chat_templating"
                  target="_blank"
                  rel="noreferrer"
                >
                  chat templating docs
                </a>{" "}
                alongside.
              </p>
              <p>
                Then, by hand: render a two-turn conversation with a system
                message through both templates and write out the exact token
                strings. Compare against{" "}
                <code>tokenizer.apply_chat_template(...)</code>. Finally, find one
                behaviour each template encodes that is not obvious — a default
                system prompt, a date injection, a tool-calling block, or special
                handling when no system message is supplied.
              </p>
            </>
          ),
          hint: (
            <p>
              Look specifically at what happens when <code>messages</code> has no
              system entry, and at whether the template appends a generation
              prompt (the <code>add_generation_prompt</code> flag). Those two
              lines cause most of the &ldquo;works in the playground, broken in my
              code&rdquo; bugs in production.
            </p>
          ),
          solution: (
            <>
              <p>
                Things you should have found: Llama 3 uses{" "}
                <code>&lt;|start_header_id|&gt;role&lt;|end_header_id|&gt;</code>{" "}
                with <code>&lt;|eot_id|&gt;</code> as the turn terminator, and
                some versions inject a current date into a default system prompt —
                so the same code produces different prompts on different days.
                Qwen uses the ChatML style shown in this module&apos;s figure, with{" "}
                <code>&lt;|im_start|&gt;</code> / <code>&lt;|im_end|&gt;</code>,
                and supplies its own default system message when you omit one.
              </p>
              <p>
                The practical lesson: the template is part of the model, not part
                of your application. Serialising a conversation yourself, or
                reusing one model&apos;s template with another&apos;s weights,
                puts you off the training distribution in a way that degrades
                quality subtly rather than loudly — no error, just worse answers.
                Always call <code>apply_chat_template</code>, and when a fine-tune
                behaves strangely, print the exact string you sent before you
                suspect anything else.
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
              In an SFT training example, which tokens should contribute to the
              loss?
            </>
          ),
          choices: [
            {
              text: "The assistant's reply and its end-of-turn token only.",
              correct: true,
              explain:
                "You want the model to get better at producing assistant turns and at stopping. Including the end-of-turn token is what teaches it to stop at all — omit it and your fine-tune will ramble until it hits the token limit.",
            },
            {
              text: "Every token, so the model learns the full conversational format.",
              explain:
                "This spends capacity teaching the model to imitate users and generate system prompts, and it encourages the very failure mode SFT is meant to fix: the model writing the next user turn itself.",
            },
            {
              text: "The assistant's reply, but not the end-of-turn token — stopping is handled by the decoder.",
              explain:
                "A very common and very costly bug. Stopping is learned behaviour: the sampler stops when the model emits the terminator, so the model has to be trained to emit it.",
            },
            {
              text: "Only the first token of the reply, since the rest follows from it.",
              explain:
                "Nothing about autoregressive training works this way — each position is a separate prediction with its own loss term, and all of them carry signal about the response.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              LoRA replaces a <M>{String.raw`4096 \times 4096`}</M> weight update
              with <M>{String.raw`BA`}</M> at <M>{String.raw`r=8`}</M>. What is
              the essential assumption?
            </>
          ),
          choices: [
            {
              text: "That the update needed lives in a small number of directions — that its singular-value spectrum decays fast.",
              correct: true,
              explain:
                "rank(BA) ≤ 8 is a hard constraint, so anything the update needs beyond 8 directions is simply unrepresentable. When the spectrum is flat — the widget's Diagonal pattern — no affordable rank works.",
            },
            {
              text: "That the pretrained weight matrix W is itself low rank.",
              explain:
                "W is full rank and stays frozen. The bet is about ΔW, the change — a much weaker and much more plausible assumption.",
            },
            {
              text: "That the model has fewer than 8 attention heads.",
              explain:
                "The rank r is a property of the adapter factorisation and has nothing to do with head count. You can run r=8 on a 32-head model.",
            },
            {
              text: "That the fine-tuning dataset has at most 8 distinct tasks.",
              explain:
                "There's no correspondence between rank and task count. A single task can require a high-rank update, and multiple related tasks can share a low-rank one.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>Why is <M>B</M> initialised to zero in LoRA?</>
          ),
          choices: [
            {
              text: "So that ΔW = 0 at step 0 and training starts exactly at the pretrained model.",
              correct: true,
              explain:
                "With B = 0 the adapter contributes nothing initially, so there's no shock to the network and no warm-up needed. A is initialised randomly so gradients can flow — zeroing both would leave the product stuck at zero forever.",
            },
            {
              text: "To make the product BA exactly rank 1 at the start.",
              explain:
                "The product is the zero matrix, which has rank 0. And rank isn't the goal of the initialisation anyway — starting from the pretrained function is.",
            },
            {
              text: "To halve the memory needed for the adapter.",
              explain:
                "Zero-initialised parameters occupy exactly as much memory as any others. The memory saving comes from r(d+k) ≪ dk, not from initialisation.",
            },
            {
              text: "Because zero initialisation prevents catastrophic forgetting.",
              explain:
                "It sets where training starts, not where it ends. LoRA does forget less than full fine-tuning, but that comes from the low-rank constraint on the whole trajectory, not from the first step.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              Your customer-support bot cites outdated refund policies. Which tool
              should you reach for first?
            </>
          ),
          choices: [
            {
              text: "Retrieval — put the current policy in the context window, where it can be updated, cited, and removed.",
              correct: true,
              explain:
                "This is a facts problem, and facts belong in context. Retrieval is auditable, instantly updatable when the policy changes next quarter, and lets the model quote a source.",
            },
            {
              text: "LoRA fine-tune on the new policy documents.",
              explain:
                "Fine-tuning changes how the model responds far more reliably than what it knows, and training on facts the model doesn't have has been shown to increase hallucination. You'd also have to retrain every time the policy changes.",
            },
            {
              text: "Full fine-tune, so the policy is deeply embedded in the weights.",
              explain:
                "Everything wrong with the LoRA answer, plus far more compute, plus catastrophic forgetting risk. 'Deeply embedded' is not a property you can verify, and it makes the fact harder to remove, not easier.",
            },
            {
              text: "Raise the temperature so the model explores less-common answers.",
              explain:
                "Temperature controls diversity, not accuracy. Raising it makes a confidently wrong model produce a wider variety of wrong answers.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Biderman et al. (2024) found that LoRA &ldquo;learns less and
              forgets less&rdquo; than full fine-tuning. The best reading is:
            </>
          ),
          choices: [
            {
              text: "One constraint produces both effects: restricting the update to a low-rank subspace limits how far the model can move, in the target domain and away from it alike.",
              correct: true,
              explain:
                "This is why it's a genuine tradeoff rather than a bug. If you need a large capability shift — a new programming language, hard maths — the constraint hurts. If you want a style change while preserving general ability, the same constraint is exactly what you want.",
            },
            {
              text: "LoRA is simply a worse method and should be avoided when you can afford full fine-tuning.",
              explain:
                "Forgetting less is a real benefit, not a consolation prize — most production fine-tunes care more about not breaking general ability than about maximal domain gain. And the memory difference is often the difference between feasible and not.",
            },
            {
              text: "LoRA underfits because the learning rate has to be lower.",
              explain:
                "LoRA is typically trained at a *higher* learning rate than full fine-tuning (1e-4 vs 1e-5 range), because the adapter is small and starts at zero. The constraint is structural, not a schedule artefact.",
            },
            {
              text: "The result only applies to r < 8; at higher rank LoRA matches full fine-tuning exactly.",
              explain:
                "The paper sweeps rank, and the gap narrows but persists on far-from-distribution domains. And as rank rises you give up the memory advantage that motivated LoRA in the first place.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Qi et al. (2023) found that fine-tuning an aligned model on{" "}
              <em>benign</em> instruction data still degrades its safety
              behaviour. The best explanation is:
            </>
          ),
          choices: [
            {
              text: "Nothing in the fine-tuning objective preserves safety behaviour, so it decays like any other capability not represented in the new data.",
              correct: true,
              explain:
                "Safety training is a distribution over behaviours installed by post-training, not a protected module. Fine-tuning on data with no refusals in it moves the default away from refusing — a special case of catastrophic forgetting with unusually high stakes.",
            },
            {
              text: "Benign datasets secretly contain harmful examples.",
              explain:
                "The effect shows up on carefully inspected datasets like Alpaca and Dolly. Contamination would be an easier problem — you could filter it. This one you can't filter away.",
            },
            {
              text: "Fine-tuning corrupts the weights numerically, degrading all behaviours equally.",
              explain:
                "General capability drops far less than safety behaviour does. The effect is selective, which points to a distributional-shift explanation rather than a numerical one.",
            },
            {
              text: "The safety layer is stored in specific parameters that LoRA happens to target.",
              explain:
                "The effect appears with full fine-tuning and with LoRA on various target modules. There's no evidence for a localised 'safety layer' that fine-tuning happens to hit.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              After merging a LoRA adapter with{" "}
              <M>{String.raw`W \mathrel{+}= \tfrac{\alpha}{r} BA`}</M>, what is
              the inference-time cost of having used LoRA?
            </>
          ),
          choices: [
            {
              text: "None — the merged model is an ordinary weight matrix of the same shape, with identical latency.",
              correct: true,
              explain:
                "This is LoRA's decisive practical advantage over the adapter-layer methods that preceded it, which inserted extra modules and paid for them on every forward pass. The cost is that a merged model can no longer be swapped per request.",
            },
            {
              text: "Two extra matrix multiplications per layer, adding roughly 10% latency.",
              explain:
                "That's the cost of serving the adapter *unmerged*, which people do deliberately when they want to hot-swap adapters per request. Once merged, the extra multiplications are gone.",
            },
            {
              text: "Extra memory equal to r(d+k) per adapted matrix.",
              explain:
                "After merging you can discard B and A entirely — the update is folded into W. You keep them only if you want the option to unmerge or swap.",
            },
            {
              text: "Reduced numerical precision, because BA is stored in low precision.",
              explain:
                "The adapters are trained in bf16 or fp32 and the merge is done at full precision. (QLoRA quantises the *frozen base* during training, which is a separate choice and is usually dequantised for the merge.)",
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
          One method paper to read properly, one to skim for the engineering, and
          three results that keep you honest about what fine-tuning costs.
        </p>
      ),
      readings: [
        {
          title: "LoRA: Low-Rank Adaptation of Large Language Models",
          authors: "Hu, Shen, Wallis, et al. (Microsoft)",
          year: 2021,
          url: "https://arxiv.org/abs/2106.09685",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "Short and unusually readable. Read §4 (the method — it is one equation), then §7.2, where they check how much of the full fine-tuning update's subspace a rank-1 or rank-2 adapter actually captures. That section is the empirical heart of the paper and the direct counterpart of this module's widget. Skip the GLUE tables.",
        },
        {
          title: "Training language models to follow instructions with human feedback (InstructGPT)",
          authors: "Ouyang, Wu, Jiang, et al. (OpenAI)",
          year: 2022,
          url: "https://arxiv.org/abs/2203.02155",
          kind: "paper",
          time: "45 min (§3 only)",
          essential: true,
          note: "Read §3.1–3.4 now, for the SFT stage specifically: where the demonstration data came from, how many examples, who wrote them, and what the labelling instructions said. Come back for the reward-model and PPO sections in Module 2.3. The appendix on labeller instructions is worth ten minutes on its own — it is the closest thing to a written specification of the Assistant character.",
        },
        {
          title: "Fine-tuning Aligned Language Models Compromises Safety, Even When Users Do Not Intend To!",
          authors: "Qi, Zeng, Xie, et al.",
          year: 2023,
          url: "https://arxiv.org/abs/2310.03693",
          kind: "paper",
          time: "45 min",
          essential: true,
          note: "The result that should change how you think about fine-tuning APIs and open weights. Read §3 and §4: a handful of adversarial examples for a few dollars, and — the part people miss — the benign-dataset result. Then read Betley et al.'s Emergent Misalignment (arXiv 2502.17424) as the sharper 2025 follow-up.",
        },
        {
          title: "QLoRA: Efficient Finetuning of Quantized LLMs",
          authors: "Dettmers, Pagnoni, Holtzman & Zettlemoyer",
          year: 2023,
          url: "https://arxiv.org/abs/2305.14314",
          kind: "paper",
          time: "30 min (skim)",
          note: "Skim for the three engineering ideas: the NF4 data type, double quantization, and paged optimisers. You do not need the details unless you are implementing it — but you will use this method the first time you fine-tune anything on one GPU, so knowing what each knob does is worth half an hour.",
        },
        {
          title: "LoRA Learns Less and Forgets Less",
          authors: "Biderman, Portes, Gonzalez Ortiz, et al.",
          year: 2024,
          url: "https://arxiv.org/abs/2405.09673",
          kind: "paper",
          time: "45 min",
          note: "The careful comparison the field needed. Read the figures: LoRA vs full fine-tuning on code and maths, swept over rank and data budget. Read it as a decision aid — after this you should be able to say, for a given task, which method you would pick and what you would expect to lose.",
        },
        {
          title: "LIMA: Less Is More for Alignment",
          authors: "Zhou, Liu, Xu, et al. (Meta AI)",
          year: 2023,
          url: "https://arxiv.org/abs/2305.11206",
          kind: "paper",
          time: "40 min",
          note: "1,000 curated examples, no RLHF, surprisingly strong results. Read §1 and the 'superficial alignment hypothesis' framing, then the human-evaluation section with a sceptical eye — the evaluation is small and the claim is large. It is the strongest available evidence that SFT selects an existing distribution rather than teaching new capability, which is exactly the Module 2.1 thesis in experimental form.",
        },
        {
          title: "Chat Templates (documentation)",
          authors: "HuggingFace",
          year: 2024,
          url: "https://huggingface.co/docs/transformers/en/chat_templating",
          kind: "tool",
          time: "20 min",
          note: "Read this before your first fine-tune, not after. Focus on apply_chat_template, the add_generation_prompt flag, and the section on training with templates. Most first fine-tunes fail on serialisation rather than on anything to do with learning, and this page is the fix.",
        },
      ],
    },
  ],
};

export default mod;
