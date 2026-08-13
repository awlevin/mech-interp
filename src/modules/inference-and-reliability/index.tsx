import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { SamplingPlayground } from "./SamplingPlayground";
import { KVCacheCalculator } from "./KVCacheCalculator";

const mod: CourseModule = {
  id: "2.5",
  slug: "inference-and-reliability",
  title: "Inference, Performance & Reliability",
  part: 2,
  tagline: "Sampling, KV caches, quantization, hallucination, and calibration — making models fast and trustworthy.",
  estMinutes: 150,
  objectives: [
      "Predict how temperature and top-p reshape the token distribution",
      "Explain the KV cache and estimate its memory cost",
      "Distinguish calibration failures from confabulation and design a small eval"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "sampling",
      title: "From a distribution to a sentence",
      body: (
        <>
          <p>
            Everything up to now produced one thing: a probability distribution
            over the next token. Turning that into text requires a decision rule,
            and the choice of rule changes the output more than most people
            expect — same weights, same prompt, wildly different behavior.
          </p>
          <p>
            The obvious rule is to take the most likely token every time
            (<strong>greedy decoding</strong>), or to search for the
            highest-probability <em>sequence</em> (<strong>beam search</strong>).
            Both are wrong, and the way they are wrong is one of the more
            interesting empirical facts about language models.
          </p>
          <KeyIdea>
            Maximizing likelihood is the right training objective and the wrong
            decoding objective. Holtzman et al. (2019) showed that
            likelihood-maximizing decoders produce text that is
            &ldquo;bland and strangely repetitive&rdquo; — and that real human
            text is <em>not</em> the highest-probability continuation of itself.
            People are routinely surprising. Text that never surprises reads as
            broken.
          </KeyIdea>
          <p>
            The failure is self-reinforcing, which is what makes it dramatic. Once
            a phrase repeats, it becomes a strong contextual predictor of itself
            — the induction machinery you will meet in Part 3 — so its
            probability rises with every repetition. Greedy decoding on an
            open-ended prompt reliably falls into a loop it cannot leave.
          </p>
          <Term word="degeneration">
            The characteristic failure of low-entropy decoding: repetition loops,
            bland hedging, and collapse onto a few high-frequency phrasings. It
            is not a bug in the weights — the same model sampled differently is
            fine.
          </Term>
          <p>
            So we sample. Three knobs, applied in this order:
          </p>
          <ul>
            <li>
              <strong>Temperature</strong> <M>T</M> divides the logits before the
              softmax: <M>{String.raw`p_i \propto e^{z_i/T}`}</M>. Below 1 it
              sharpens, above 1 it flattens. It reshapes the whole distribution
              and removes nothing.
            </li>
            <li>
              <strong>Top-<M>k</M></strong> keeps the <M>k</M> highest-probability
              tokens and zeroes the rest. Simple and blunt: <M>k</M> is fixed
              whether the model is certain or not.
            </li>
            <li>
              <strong>Top-<M>p</M></strong> (nucleus sampling) keeps the smallest
              set of tokens whose probabilities sum to at least <M>p</M>. The cut
              is <em>dynamic</em> — a confident distribution keeps 2 tokens, an
              uncertain one keeps 200 — which is precisely Holtzman&apos;s
              contribution and why it became the default.
            </li>
          </ul>
          <p>
            Whatever survives is renormalized to sum to 1 and sampled from. The
            widget below shows every step, including which rule killed which
            token.
          </p>
          <Note kind="warning" title="Temperature and top-p interact, and the order matters">
            Temperature is applied to the logits <em>first</em>, so it changes the
            cumulative probabilities that top-<M>p</M> then reads. Lowering{" "}
            <M>T</M> shrinks the nucleus for free even at a fixed <M>p</M>.
            Tuning both at once is why people end up with configurations they
            cannot explain; move one at a time. Note also that{" "}
            <M>T = 0</M> is not a temperature at all — implementations special-case
            it to mean greedy.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "making-it-fast",
      title: "Making it fast: caches, drafts, and smaller numbers",
      body: (
        <>
          <p>
            Generating a token requires a forward pass over the whole context.
            Generating the next one requires a forward pass over the whole
            context plus one. Done naively, producing <M>n</M> tokens costs{" "}
            <M>{String.raw`O(n^2)`}</M> work that is almost entirely redundant —
            because attention at position <M>t</M> needs the keys and values of
            every earlier position, and those never change.
          </p>
          <Term word="KV cache">
            Store the key and value vectors for every token, in every layer, the
            first time they are computed. Each new token then computes only its
            own query, key, and value, and attends against the cache. Decoding
            drops from quadratic to linear time — at the cost of memory that grows
            linearly with context and is held for the entire request.
          </Term>
          <Figure caption="Why the cache works: keys and values for past tokens are fixed once computed, because attention is causal — nothing later can change them. Only the new token's Q, K, V are computed each step, and its K and V are appended.">
            <svg viewBox="0 0 460 150" className="w-full max-w-[460px]" role="img" aria-label="Cached key and value vectors for past tokens, with the new token appending its own and attending to all of them">
              {["The", "weather", "today", "is"].map((t, i) => (
                <g key={t}>
                  <rect x={20 + i * 78} y={54} width={66} height={34} rx={5} fill="var(--surface-2)" stroke="var(--border)" />
                  <text x={53 + i * 78} y={74} textAnchor="middle" fontSize={11} fill="var(--text-secondary)" className="font-mono">
                    K,V
                  </text>
                  <text x={53 + i * 78} y={104} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                    {t}
                  </text>
                </g>
              ))}
              <rect x={332} y={54} width={66} height={34} rx={5} fill="var(--surface-1)" stroke="var(--series-2)" strokeWidth={2} />
              <text x={365} y={74} textAnchor="middle" fontSize={11} fill="var(--series-2)" className="font-mono">
                K,V
              </text>
              <text x={365} y={104} textAnchor="middle" fontSize={10} fill="var(--series-2)">
                sunny
              </text>
              <text x={20} y={26} fontSize={10} fill="var(--text-muted)" className="font-mono">
                cached — never recomputed
              </text>
              <text x={332} y={26} fontSize={10} fill="var(--series-2)" className="font-mono">
                new
              </text>
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M356,50 C${300 - i * 60},20 ${80 + i * 78},20 ${53 + i * 78},50`}
                  fill="none"
                  stroke="var(--series-1)"
                  strokeWidth={1}
                  opacity={0.55}
                />
              ))}
              <text x={20} y={140} fontSize={10} fill="var(--series-1)" className="font-mono">
                the new query attends to every cached key
              </text>
            </svg>
          </Figure>
          <p>
            The cache is not a footnote. For a 70B-class model at a 128K context
            it runs to tens of gigabytes for a <em>single</em> request, which is
            why serving systems are designed around it: paged allocation so
            requests do not need contiguous blocks (vLLM&apos;s PagedAttention),
            and prefix sharing so a common system prompt is cached once for
            thousands of users. The calculator below makes the arithmetic
            concrete.
          </p>
          <p>
            The architectural fix is <strong>grouped-query attention</strong>{" "}
            (GQA): let several query heads share one key/value head. Llama-3 70B
            has 64 query heads and 8 KV heads, cutting the cache by 8× for a
            small quality cost. Multi-query attention (MQA) is the extreme, with
            one KV head. Toggle the &ldquo;70B without GQA&rdquo; preset in the
            widget to see what this bought.
          </p>
          <p>
            A second inefficiency is subtler.{" "}
            <strong>Decoding is memory-bandwidth bound, not compute bound.</strong>{" "}
            Producing one token requires reading every weight of the model from
            memory in order to do a handful of arithmetic operations on each. The
            GPU sits mostly idle waiting on memory. Two techniques exploit this.
          </p>
          <Term word="speculative decoding">
            A small, cheap draft model proposes{" "}
            <M>{String.raw`\gamma`}</M> tokens; the large model verifies all of
            them in <em>one</em> forward pass (which costs about the same as
            verifying one, since it was bandwidth-bound anyway) and keeps the
            longest prefix that matches what it would have sampled. Leviathan et
            al. (2022) show the accept/reject rule leaves the output
            distribution <strong>exactly unchanged</strong> — it is a pure
            latency win, not an approximation, and they measured 2–3× on T5-XXL.
          </Term>
          <p>
            <strong>Quantization</strong> attacks the same bottleneck by making
            the weights smaller: store them in 8-bit or 4-bit instead of 16-bit,
            and you read a quarter as many bytes per token. What degrades is
            specific rather than uniform. Dettmers et al. found that transformers
            past a few billion parameters develop{" "}
            <strong>outlier features</strong> — a small number of dimensions with
            enormous magnitudes that dominate the layer&apos;s behavior and are
            destroyed by naive rounding. LLM.int8() keeps exactly those in 16-bit
            and quantizes the rest; later methods (GPTQ, AWQ) refine which
            weights are worth protecting.
          </p>
          <Note kind="note" title="What quantization actually costs">
            Perplexity barely moves, which is why the technique looks free on the
            headline metric. Aggregate benchmarks are dominated by the common
            cases the model handles easily. What degrades first is the long
            tail: rare facts, multi-step arithmetic, low-resource languages, and
            — relevant here — <em>calibration</em>. If you quantize, evaluate on
            the tail you care about, not on perplexity.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "hallucination-and-calibration",
      title: "Confabulation, calibration, and knowing what you don't know",
      body: (
        <>
          <p>
            &ldquo;Hallucination&rdquo; gets used for two failures with different
            causes and different fixes. Separating them is most of the work.
          </p>
          <Term word="calibration error">
            The model&apos;s confidence does not match its accuracy. It says 90%
            and is right 70% of the time. The model has the uncertainty
            <em>internally</em> and reports it badly. Measurable, and fixable by
            changing what you read out.
          </Term>
          <Term word="confabulation">
            The model produces a fluent, specific, entirely invented claim — a
            citation that does not exist, an API that was never shipped — with no
            internal signal that anything is wrong. Nothing to read out.
          </Term>
          <p>
            Kadavath et al. (2022) is the load-bearing result here, and it is
            more optimistic than the discourse suggests. Large models{" "}
            <em>are</em> well calibrated on multiple-choice and true/false
            questions when asked in the right format. They can be asked to
            propose an answer and then evaluate the probability{" "}
            <M>{String.raw`P(\text{True})`}</M> that it is correct, with decent
            calibration and improvement as models scale. They can even be trained
            to predict <M>{String.raw`P(\text{IK})`}</M> — &ldquo;do I know
            this?&rdquo; — before answering, though calibration of{" "}
            <M>{String.raw`P(\text{IK})`}</M> transfers poorly to new task
            distributions.
          </p>
          <KeyIdea>
            A well-calibrated model that hallucinates is not confused — it is
            being read out wrong. The uncertainty is present in the
            distribution; sampling one token at a time and rendering it as fluent
            prose is what discards it. Much of what looks like a knowledge
            failure is an interface failure.
          </KeyIdea>
          <Figure caption="A reliability diagram. Perfect calibration is the diagonal. The curve below it is the usual shape: the model is overconfident everywhere, and the gap widens as stated confidence rises. The expected calibration error is the average vertical gap, weighted by how many predictions fall in each bin.">
            <svg viewBox="0 0 300 190" className="w-full max-w-[300px]" role="img" aria-label="Reliability diagram showing a calibration curve bowing below the perfect-calibration diagonal">
              <line x1={40} y1={160} x2={280} y2={160} stroke="var(--border)" />
              <line x1={40} y1={20} x2={40} y2={160} stroke="var(--border)" />
              <line x1={40} y1={160} x2={280} y2={20} stroke="var(--border-strong)" strokeDasharray="4 3" strokeWidth={1.5} />
              <text x={196} y={54} fontSize={9.5} fill="var(--text-muted)" className="font-mono">
                perfect
              </text>
              <polyline
                points="40,160 88,140 136,124 184,110 232,94 280,72"
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2.5}
              />
              {[
                [88, 140],
                [136, 124],
                [184, 110],
                [232, 94],
                [280, 72],
              ].map(([x, y]) => (
                <circle key={x} cx={x} cy={y} r={3.5} fill="var(--series-1)" />
              ))}
              <line x1={232} y1={94} x2={232} y2={49} stroke="var(--series-2)" strokeWidth={1.5} />
              <text x={238} y={74} fontSize={9.5} fill="var(--series-2)" className="font-mono">
                gap
              </text>
              <text x={36} y={166} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">0</text>
              <text x={36} y={24} textAnchor="end" fontSize={9} fill="var(--text-muted)" className="font-mono">1</text>
              <text x={4} y={14} fontSize={10} fill="var(--text-muted)" className="font-mono">accuracy</text>
              <text x={280} y={180} textAnchor="end" fontSize={10} fill="var(--text-muted)" className="font-mono">stated confidence</text>
            </svg>
          </Figure>
          <p>
            RLHF makes this worse in a specific and well-documented way.
            OpenAI&apos;s GPT-4 system card reported that the pre-RLHF base model
            was well calibrated on MMLU and the post-RLHF model was noticeably
            less so. That should be unsurprising after Module 2.3: humans prefer
            confident answers, so preference optimization pushes stated
            confidence up regardless of what the underlying distribution says.
            Alignment training and calibration are in direct tension.
          </p>
          <p>
            Kalai et al. (2025) push the argument one step further and blame the
            scoreboard. Almost every benchmark grades binary — right or wrong —
            with no credit for &ldquo;I don&apos;t know.&rdquo; Under that rule,
            guessing strictly dominates abstaining whenever you have any
            information at all, exactly as it does for a student on a multiple-choice
            exam with no penalty for wrong answers. Models are optimized to be
            good test-takers, and we built a test that rewards bluffing. Their
            proposed fix is socio-technical rather than algorithmic: change the
            scoring of the benchmarks that dominate leaderboards.
          </p>
          <Note kind="safety">
            This is why <strong>honesty</strong> is treated as a separate
            alignment property from helpfulness and harmlessness, and why it is
            the hardest of the three to train. Helpfulness and harmlessness can
            be scored by a rater reading the output. Honesty is a claim about the
            relationship between the output and the model&apos;s{" "}
            <em>internal state</em> — a model that asserts something it
            &ldquo;believes&rdquo; is false and one that asserts something it has
            no belief about are behaviorally identical from outside. That is the
            same wall you hit with chain-of-thought faithfulness in Module 2.4,
            and the same reason Part 3 goes looking inside.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "evals",
      title: "Evals 101",
      body: (
        <>
          <p>
            An eval is a measurement instrument, and the failure modes are the
            ones every measurement instrument has: measuring something adjacent
            to what you meant, measuring something you already trained on, or
            measuring with less precision than your decisions require.
          </p>
          <ul>
            <li>
              <strong>Multiple-choice benchmarks</strong> (MMLU, GPQA) are cheap,
              reproducible, and heavily contaminated by now. They also measure
              recognition rather than generation, and are graded binary — the
              scoring problem above.
            </li>
            <li>
              <strong>Verifiable-answer benchmarks</strong> (GSM8K, HumanEval,
              SWE-bench) have real ground truth and are the best instruments we
              have, restricted to the domains where a checker exists — the
              Module 2.4 story again.
            </li>
            <li>
              <strong>Human preference arenas</strong> (Chatbot Arena) measure
              what people like, which is genuinely useful and is also, as Module
              2.3 established, precisely the signal that rewards confident
              formatting.
            </li>
            <li>
              <strong>LLM-as-judge</strong> scales, and inherits every bias of the
              judge model, including a well-documented preference for its own
              outputs and for longer answers.
            </li>
            <li>
              <strong>Red-teaming and behavioral evals</strong> target a specific
              hazard rather than average quality. This is where safety-relevant
              evaluation actually happens.
            </li>
          </ul>
          <Note kind="note" title="What makes a small eval good">
            Precision comes from a narrow question, not a large <M>n</M>. A
            10-item eval on one specific behavior, with a deterministic grader
            and a pre-registered pass criterion, will tell you more than a
            1,000-item aggregate score you cannot interpret. Write down what
            result would change your mind <em>before</em> you run it. Report the
            binomial confidence interval — with 10 items, 8/10 and 6/10 are not
            distinguishable, and pretending otherwise is the most common eval
            mistake.
          </Note>
          <p>
            The deeper problem is Goodhart, one last time. Every eval that
            becomes important becomes a training target, whether deliberately
            (training on the benchmark) or structurally (the field selects for
            methods that score well on it). The half-life of a useful benchmark
            is short, and holding out an eval you never train on is worth more
            than any single number it produces.
          </p>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: truncation and memory",
      body: (
        <>
          <p>
            The sampling playground uses one fixed illustrative distribution.
            Temperature is applied first, then top-<M>k</M>, then top-<M>p</M>,
            then what survives is renormalized — the same order as a real
            sampler. Every removed token is labeled with the rule that removed
            it.
          </p>
          <SamplingPlayground />
          <p>
            The calculator is the arithmetic every serving engineer runs before
            promising a context length.
          </p>
          <KVCacheCalculator />
          <p>
            Things to try: (1) Set <M>T</M> = 0.2 and draw fifty tokens — one
            token takes essentially all the draws. That is degeneration in
            miniature, and it is why greedy decoding loops. (2) Set top-<M>p</M>{" "}
            to 0.90 and sweep temperature from 0.5 to 2.0, watching the nucleus
            size change without touching <M>p</M> — a fixed top-<M>p</M> is not a
            fixed vocabulary. (3) In the calculator, load Llama-3 70B at 128K,
            then hit &ldquo;70B without GQA&rdquo; and watch the line jump above
            the H100 reference. Then set batch to 32 with GQA back on: this is
            why context length is priced the way it is.
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
          The first three are arithmetic you should be able to do from memory by
          the end of this module — they come up constantly in real deployment
          conversations. The eval-design problem is the one worth doing slowly.
        </p>
      ),
      problems: [
        {
          id: "top-p-by-hand",
          kind: "pencil",
          title: "Nucleus sampling by hand",
          prompt: (
            <>
              <p>
                Logits over six tokens:{" "}
                <M>{String.raw`z = (2.0,\; 1.5,\; 1.0,\; 0.5,\; 0.0,\; -0.5)`}</M>.
                Use top-<M>p</M> = 0.85.
              </p>
              <p>
                (a) At <M>T = 1</M>, how many tokens are in the nucleus, and what
                are their renormalized probabilities? (b) At <M>T = 0.7</M>?
                (c) State in one sentence why top-<M>p</M> is generally preferred
                to top-<M>k</M>.
              </p>
            </>
          ),
          hint: (
            <p>
              <M>{String.raw`e^{2}=7.389,\ e^{1.5}=4.482,\ e^{1}=2.718,\ e^{0.5}=1.649,\ e^{0}=1,\ e^{-0.5}=0.607`}</M>.
              For (b) divide every logit by 0.7 first. Keep the smallest prefix
              whose cumulative mass <em>reaches</em> 0.85.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>(a)</strong> Sum = 17.844, so{" "}
                <M>{String.raw`p \approx (0.414,\, 0.251,\, 0.152,\, 0.092,\, 0.056,\, 0.034)`}</M>{" "}
                with cumulative{" "}
                <M>{String.raw`(0.414,\, 0.665,\, 0.818,\, 0.910,\, 0.966,\, 1.0)`}</M>.
                Three tokens only reach 0.818, so the fourth is needed:{" "}
                <strong>4 tokens</strong>, total mass 0.910. Renormalized:{" "}
                <M>{String.raw`(0.455,\, 0.276,\, 0.167,\, 0.102)`}</M>.
              </p>
              <p>
                <strong>(b)</strong> Divide by 0.7:{" "}
                <M>{String.raw`z/T = (2.857,\, 2.143,\, 1.429,\, 0.714,\, 0,\, -0.714)`}</M>,
                sum of exponentials 33.64, so{" "}
                <M>{String.raw`p \approx (0.518,\, 0.253,\, 0.124,\, 0.061,\, 0.030,\, 0.015)`}</M>{" "}
                with cumulative{" "}
                <M>{String.raw`(0.518,\, 0.771,\, 0.895,\, \ldots)`}</M>. Now{" "}
                <strong>3 tokens</strong> suffice, mass 0.895. Renormalized:{" "}
                <M>{String.raw`(0.578,\, 0.283,\, 0.139)`}</M>.
              </p>
              <p>
                The nucleus shrank from 4 to 3 <em>without touching <M>p</M></em>.
                Temperature changes the cumulative probabilities that top-
                <M>p</M> reads, which is why tuning both at once is confusing.
              </p>
              <p>
                <strong>(c)</strong> Top-<M>p</M> adapts to the model&apos;s
                confidence: where the model is sure it keeps two tokens, where it
                is genuinely uncertain it keeps hundreds. A fixed <M>k</M> either
                truncates real uncertainty or admits nonsense from a peaked
                distribution — it cannot do both, because it does not look at the
                probabilities.
              </p>
            </>
          ),
        },
        {
          id: "kv-arithmetic",
          kind: "pencil",
          title: "Will it fit?",
          prompt: (
            <>
              <p>
                A model has 80 layers, 64 query heads, 8 KV heads, head dimension
                128, and an fp16 KV cache.
              </p>
              <p>
                (a) How many bytes of cache per token? (b) At a 128K context and
                batch size 1, how many GB? (c) The model&apos;s weights are 140 GB
                in fp16 — what does that imply about serving 128K contexts on a
                single 8×H100 node (640 GB)? (d) How much does the answer to (a)
                change if the model used plain multi-head attention?
              </p>
            </>
          ),
          hint: (
            <p>
              <M>{String.raw`\text{bytes/token} = 2 \times L \times h_{kv} \times d_{head} \times \text{bytes}`}</M>.
              The leading 2 is for K and V, not for fp16.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>(a)</strong>{" "}
                <M>{String.raw`2 \times 80 \times 8 \times 128 \times 2 = 327{,}680`}</M>{" "}
                bytes = <strong>320 KB per token</strong>. Note the query-head
                count never appears — with GQA, only the KV heads cost memory.
              </p>
              <p>
                <strong>(b)</strong>{" "}
                <M>{String.raw`327{,}680 \times 131{,}072 \approx 4.29 \times 10^{10}`}</M>{" "}
                bytes ≈ <strong>40 GB</strong> for one request.
              </p>
              <p>
                <strong>(c)</strong> 140 GB of weights leaves 500 GB, so about a
                dozen concurrent 128K requests — before activation memory,
                fragmentation, and headroom. That is a small number of users per
                $250k of hardware, and it is the entire reason long-context
                pricing looks the way it does, why paged allocation and prefix
                caching exist, and why fp8 KV caches are now common in
                production.
              </p>
              <p>
                <strong>(d)</strong> With 64 KV heads instead of 8, the cache is
                8× larger: 2.56 MB per token, <strong>320 GB</strong> at 128K for
                a single request. GQA is not a micro-optimization; without it,
                long context on this model would not be a product.
              </p>
            </>
          ),
        },
        {
          id: "spec-decoding",
          kind: "pencil",
          title: "How much does speculation buy?",
          prompt: (
            <>
              <p>
                A draft model proposes <M>{String.raw`\gamma`}</M> tokens per
                round; each is accepted independently with probability{" "}
                <M>{String.raw`\alpha`}</M>, and the first rejection ends the
                round (with one token still emitted from the target&apos;s
                corrected distribution). The expected tokens per round is
              </p>
              <MB>{String.raw`\mathbb{E}[\text{tokens}] = \frac{1 - \alpha^{\gamma+1}}{1 - \alpha}`}</MB>
              <p>
                Assume the draft model costs 5% of a target forward pass, and one
                round costs{" "}
                <M>{String.raw`\gamma \times 0.05 + 1`}</M> target-equivalents.
              </p>
              <p>
                (a) Speedup at <M>{String.raw`\alpha = 0.8`}</M>,{" "}
                <M>{String.raw`\gamma = 4`}</M>? (b) At{" "}
                <M>{String.raw`\gamma = 8`}</M> and{" "}
                <M>{String.raw`\gamma = 16`}</M>? (c) At{" "}
                <M>{String.raw`\alpha = 0.5,\ \gamma = 4`}</M>? (d) Why is the
                verification step nearly free?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                <strong>(a)</strong>{" "}
                <M>{String.raw`(1 - 0.8^5)/0.2 = 0.6723/0.2 = 3.36`}</M> tokens
                per round, cost <M>{String.raw`4(0.05)+1 = 1.2`}</M>. Speedup{" "}
                <strong>≈ 2.8×</strong>.
              </p>
              <p>
                <strong>(b)</strong>{" "}
                <M>{String.raw`\gamma=8`}</M>: 4.33 tokens / 1.4 cost ={" "}
                <strong>3.1×</strong>.{" "}
                <M>{String.raw`\gamma=16`}</M>: 4.89 / 1.8 ={" "}
                <strong>2.7×</strong>. There is an interior optimum: expected
                accepted tokens saturate at{" "}
                <M>{String.raw`1/(1-\alpha) = 5`}</M> while draft cost keeps
                growing linearly, so drafting further ahead eventually loses.
              </p>
              <p>
                <strong>(c)</strong>{" "}
                <M>{String.raw`(1-0.5^5)/0.5 = 1.94`}</M> tokens / 1.2 ={" "}
                <strong>1.6×</strong>. Acceptance rate dominates everything —
                which is why draft models are trained or distilled to match the
                target rather than merely being small.
              </p>
              <p>
                <strong>(d)</strong> Because decoding is memory-bandwidth bound.
                Scoring <M>{String.raw`\gamma+1`}</M> positions in one pass still
                reads each weight from memory exactly once; the extra arithmetic
                runs on hardware that was idle. And because the accept/reject rule
                is constructed so the emitted distribution is identical to
                sampling from the target directly, the speedup costs no quality
                at all — a rare thing in systems work.
              </p>
            </>
          ),
        },
        {
          id: "calibration-ece",
          kind: "pencil",
          title: "Compute a calibration error",
          prompt: (
            <>
              <p>
                A model answers 100 questions, bucketed by stated confidence:
              </p>
              <ul>
                <li>conf ≈ 0.55 — 20 questions, 55% correct</li>
                <li>conf ≈ 0.65 — 20 questions, 60% correct</li>
                <li>conf ≈ 0.75 — 30 questions, 63% correct</li>
                <li>conf ≈ 0.85 — 20 questions, 70% correct</li>
                <li>conf ≈ 0.95 — 10 questions, 80% correct</li>
              </ul>
              <p>
                (a) Compute the expected calibration error,{" "}
                <M>{String.raw`\mathrm{ECE} = \sum_b \frac{n_b}{N}\,\big|\mathrm{acc}_b - \mathrm{conf}_b\big|`}</M>.
                (b) Overall accuracy and mean confidence? (c) If you refuse to
                answer below 0.8 confidence, what accuracy do you ship, and at
                what coverage? (d) Is this model hallucinating?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                <strong>(a)</strong> Gaps: 0.00, 0.05, 0.12, 0.15, 0.15. Weighted:{" "}
                <M>{String.raw`0.20(0) + 0.20(0.05) + 0.30(0.12) + 0.20(0.15) + 0.10(0.15)`}</M>{" "}
                = 0 + 0.010 + 0.036 + 0.030 + 0.015 ={" "}
                <strong>ECE ≈ 0.091</strong>.
              </p>
              <p>
                <strong>(b)</strong> Accuracy{" "}
                <M>{String.raw`= 63.9/100 = 0.639`}</M>; mean confidence 0.730.
                The 9.1-point overconfidence gap matches the ECE, because every
                bin errs in the same direction — worth noticing, since ECE alone
                would not tell you that.
              </p>
              <p>
                <strong>(c)</strong> The two top bins are 30 questions with 22
                correct: <strong>73% accuracy at 30% coverage</strong>. You bought
                9 points of accuracy by declining 70% of the questions. Whether
                that is a good trade is a product decision, and stating it as a
                trade is the point.
              </p>
              <p>
                <strong>(d)</strong> Not in the confabulation sense. This is a
                calibration failure: the ranking is informative (accuracy rises
                monotonically with stated confidence), the numbers are just
                inflated. It is fixable by recalibrating the readout — temperature
                scaling on the confidence, or thresholding as in (c) — without
                touching the model&apos;s knowledge. Confabulation is the case
                where the confidence signal carries no information at all, and no
                threshold helps.
              </p>
            </>
          ),
        },
        {
          id: "implement-top-p",
          kind: "code",
          title: "Implement the sampler",
          prompt: (
            <>
              <p>
                From raw logits, in NumPy or PyTorch, implement{" "}
                <code>sample(logits, temperature, top_k, top_p)</code> applying
                temperature, then top-<M>k</M>, then top-<M>p</M>, then
                renormalizing and sampling. No library sampling helpers.
              </p>
              <p>Then verify, on a real small model (GPT-2 via HuggingFace):</p>
              <ol>
                <li>
                  <code>temperature=1e-6</code> reproduces greedy decoding exactly.
                </li>
                <li>
                  <code>top_p=1.0, top_k=None</code> matches{" "}
                  <code>torch.multinomial</code> on the full softmax, over 10,000
                  draws, within sampling error.
                </li>
                <li>
                  Generate 200 tokens at <code>temperature=0.3</code> from an
                  open-ended prompt and count the longest repeated 5-gram.
                  Compare against <code>temperature=1.0, top_p=0.95</code>.
                </li>
              </ol>
              <p>
                Success check: check 3 shows visible degeneration in the low-
                temperature sample and none in the nucleus sample.
              </p>
            </>
          ),
          hint: (
            <p>
              Three traps. Sort descending once and work in sorted order.
              Use <code>cumsum</code> and keep indices where{" "}
              <code>cumsum - p_i &lt; top_p</code> — the shifted comparison is
              what guarantees you always keep at least one token, even when the
              top token alone exceeds <M>p</M>. And mask with{" "}
              <code>-inf</code> before the softmax rather than zeroing
              probabilities after it, so renormalization is free.
            </p>
          ),
          solution: (
            <>
              <p>Reference shape (PyTorch):</p>
              <pre>
                <code>{`def sample(logits, temperature=1.0, top_k=None, top_p=None):
    logits = logits / max(temperature, 1e-6)
    if top_k:
        kth = torch.topk(logits, top_k).values[..., -1, None]
        logits = logits.masked_fill(logits < kth, float("-inf"))
    if top_p is not None and top_p < 1.0:
        s, idx = torch.sort(logits, descending=True)
        probs = s.softmax(-1)
        cum = probs.cumsum(-1)
        # shift: always keep the first token
        drop = (cum - probs) >= top_p
        s = s.masked_fill(drop, float("-inf"))
        logits = torch.full_like(logits, float("-inf")).scatter(-1, idx, s)
    return torch.multinomial(logits.softmax(-1), 1)`}</code>
              </pre>
              <p>
                On check 1, note that <code>temperature=0</code> divides by zero;
                every production implementation special-cases it to argmax rather
                than treating it as a limit.
              </p>
              <p>
                On check 3, the low-temperature run will typically lock into a
                repeated phrase within 100 tokens and never leave. The mechanism
                is the self-reinforcing one from the lesson: each repetition
                raises the conditional probability of repeating again, and a
                sharpened distribution has no escape mass. This is Holtzman&apos;s
                central observation, reproducible on a 124M-parameter model in
                about twenty lines.
              </p>
            </>
          ),
        },
        {
          id: "design-an-eval",
          kind: "explore",
          title: "Design a 10-item eval",
          prompt: (
            <>
              <p>
                Pick one behavior you actually care about and can grade
                mechanically. Good candidates: &ldquo;refuses to invent a
                citation when asked for a source it does not have,&rdquo;
                &ldquo;says &lsquo;I don&apos;t know&rsquo; on questions about
                events after its cutoff,&rdquo; &ldquo;does not change a correct
                answer when the user pushes back&rdquo; (the sycophancy probe
                from Module 2.3).
              </p>
              <p>Write down, before running anything:</p>
              <ol>
                <li>The exact 10 prompts.</li>
                <li>
                  A deterministic grading rule — a regex, a string check, or an
                  LLM-judge with a fixed rubric and a fixed judge model.
                </li>
                <li>Your prediction for each of two models.</li>
                <li>What result would change your mind.</li>
              </ol>
              <p>
                Then run it against two models, three samples each at
                temperature 0, and report scores with binomial confidence
                intervals.
              </p>
            </>
          ),
          hint: (
            <p>
              Include two or three items where the desired behavior is{" "}
              <em>not</em> refusal — otherwise a model that refuses everything
              scores perfectly, and you have measured caution rather than
              honesty. Every eval needs its negative controls.
            </p>
          ),
          solution: (
            <>
              <p>
                What the exercise is designed to teach, and what nearly everyone
                discovers on their first attempt:
              </p>
              <ul>
                <li>
                  <strong>The grader is the eval.</strong> You will spend more
                  time deciding what counts as a pass than writing the prompts,
                  and every ambiguity you leave is a place where the number
                  stops meaning anything.
                </li>
                <li>
                  <strong>10 items cannot separate close models.</strong> The 95%
                  binomial interval for 8/10 is roughly 44–97%. If your two
                  models score 8 and 6, you have learned nothing about which is
                  better — you have learned that this eval needs to be bigger or
                  the effect needs to be larger. Writing this down in advance is
                  what stops you from over-reading it.
                </li>
                <li>
                  <strong>Prompt sensitivity swamps model differences.</strong>{" "}
                  Rephrase one item and watch the score move. Any claim from a
                  small eval should be robust to rewording, which means testing
                  a couple of paraphrases per item.
                </li>
                <li>
                  <strong>Your negative controls will fail first.</strong> Models
                  tuned for caution over-refuse, and an eval without controls
                  would have scored that as a win.
                </li>
              </ul>
              <p>
                None of this makes small evals useless — the opposite. A narrow,
                honest 10-item eval with a stated confidence interval is more
                informative than a leaderboard number you cannot interpret,
                because you know exactly what it measured. Keep it, never train
                on it, and re-run it after every model change.
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
          prompt: <>Greedy decoding produces repetitive text because…</>,
          choices: [
            {
              text: "repetition is self-reinforcing — once a phrase appears, context makes it the most likely continuation again, and greedy decoding has no escape mass.",
              correct: true,
              explain:
                "The model's own copying machinery raises the probability of a phrase each time it recurs. Sampling can escape the loop; taking the argmax cannot.",
            },
            {
              text: "the model was undertrained and hasn't learned enough continuations.",
              explain:
                "The same model with nucleus sampling produces fluent, varied text. Nothing about the weights changed — only the decoding rule.",
            },
            {
              text: "greedy decoding has a numerical bug in most implementations.",
              explain:
                "It's a two-line operation with no numerical subtlety. The behavior is a genuine property of maximizing likelihood at each step.",
            },
            {
              text: "beam search would fix it by finding the globally best sequence.",
              explain:
                "Backwards — beam search searches harder for high-likelihood sequences and degenerates more, which is Holtzman et al.'s central and most counterintuitive finding.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              You set top-<M>p</M> = 0.9 and then lower temperature from 1.0 to
              0.6. What happens to the nucleus?
            </>
          ),
          choices: [
            {
              text: "It shrinks — temperature is applied first, so the sharpened distribution reaches 0.9 cumulative mass with fewer tokens.",
              correct: true,
              explain:
                "The order of operations is the whole answer. Top-p reads cumulative probabilities that temperature has already reshaped, so p and T are not independent knobs.",
            },
            {
              text: "It stays the same — top-p keeps a fixed fraction of the mass regardless of temperature.",
              explain:
                "It keeps a fixed fraction of the *mass*, yes — but the number of tokens needed to reach that mass depends entirely on how peaked the distribution is.",
            },
            {
              text: "It grows, because lower temperature spreads probability over more tokens.",
              explain:
                "That's the T > 1 direction. Dividing logits by a number below 1 stretches the differences between them and concentrates mass on the leaders.",
            },
            {
              text: "It becomes undefined, since top-p requires T = 1.",
              explain:
                "They compose fine and are routinely used together — the pitfall is that tuning both at once makes the effect of either hard to attribute.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              A 70B model with GQA (80 layers, 8 KV heads, head dim 128, fp16)
              needs how much KV cache for one 128K-token request?
            </>
          ),
          choices: [
            {
              text: "About 40 GB — 320 KB per token, times 131,072 tokens.",
              correct: true,
              explain:
                "2 × 80 × 8 × 128 × 2 bytes = 320 KB per token. This is the arithmetic behind long-context pricing, and it's worth being able to do in your head.",
            },
            {
              text: "About 5 GB — the cache stores one vector per token, not per layer.",
              explain:
                "It stores a key and a value per token per layer per KV head. The layer count is the biggest multiplier and the easiest to forget.",
            },
            {
              text: "About 140 GB — the same as the model weights.",
              explain:
                "Weights are a fixed cost paid once. Cache is a per-request, per-token cost, which is why it dominates as concurrency and context grow.",
            },
            {
              text: "It depends on the number of query heads, which isn't given.",
              explain:
                "Query heads don't enter the formula — that's exactly what GQA exploits. 64 query heads sharing 8 KV heads cost the same cache as 8 query heads would.",
            },
          ],
        },
        {
          id: "q4",
          prompt: <>Speculative decoding speeds up generation without changing output quality because…</>,
          choices: [
            {
              text: "the accept/reject rule is constructed so the emitted distribution is exactly the target model's, and verifying γ tokens costs about one forward pass since decoding is bandwidth-bound.",
              correct: true,
              explain:
                "Both halves matter. The exactness makes it free in quality; the bandwidth-bound nature of decoding makes it nearly free in compute.",
            },
            {
              text: "the draft model is trained to be nearly as good as the target, so its errors are negligible.",
              explain:
                "Draft errors are not tolerated at all — they're rejected. Draft quality affects the acceptance rate, and therefore speed, but never output quality.",
            },
            {
              text: "it caches previously generated sequences and reuses them.",
              explain:
                "That's prefix caching, a different (also useful) technique. Speculative decoding drafts genuinely new tokens each round.",
            },
            {
              text: "it lowers precision on the draft model's forward passes.",
              explain:
                "Draft models are often small or quantized, but that's an implementation choice. The speedup comes from parallel verification, not from reduced precision.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              A model says &ldquo;90% confident&rdquo; and is right 70% of the
              time, with accuracy rising monotonically as stated confidence
              rises. This is best described as…
            </>
          ),
          choices: [
            {
              text: "a calibration failure — the ranking is informative, the numbers are inflated, and it can be fixed by recalibrating the readout.",
              correct: true,
              explain:
                "Monotonicity is the tell: the model's confidence signal carries real information. Temperature-scaling it, or thresholding on it, recovers useful behavior without touching the model's knowledge.",
            },
            {
              text: "confabulation — the model is inventing answers.",
              explain:
                "Confabulation is the case where the confidence signal carries no information. Here it carries plenty; it's just on the wrong scale.",
            },
            {
              text: "evidence that the model doesn't represent uncertainty internally.",
              explain:
                "The opposite. Kadavath et al. found large models are well calibrated in the right format, and the monotonic curve here shows the uncertainty is represented — the reported number is what's off.",
            },
            {
              text: "a sampling problem, fixable with a lower temperature.",
              explain:
                "Temperature affects which tokens get emitted, not whether stated confidence matches accuracy. Lowering it would make the model sound more certain, not less.",
            },
          ],
        },
        {
          id: "q6",
          prompt: <>Kalai et al. (2025) argue that hallucinations persist partly because…</>,
          choices: [
            {
              text: "benchmarks grade binary with no credit for abstention, so guessing strictly dominates saying 'I don't know' — models are optimized to be good test-takers.",
              correct: true,
              explain:
                "The exam analogy is exact: with no penalty for a wrong answer, a rational test-taker never leaves a blank. Their proposed fix is to change the scoring of dominant benchmarks, not to add another hallucination eval.",
            },
            {
              text: "pretraining data contains too many factual errors.",
              explain:
                "Data quality matters, but their argument is that hallucination arises from statistical pressure even with clean data — the model must generalize past what it can distinguish — and is then *sustained* by how we grade.",
            },
            {
              text: "models lack the architecture to represent uncertainty.",
              explain:
                "The softmax output is a distribution; uncertainty is natively representable and demonstrably present. The issue is what training and evaluation reward doing with it.",
            },
            {
              text: "RLHF removes the model's ability to refuse.",
              explain:
                "RLHF'd models refuse constantly. It does push stated confidence up and degrade calibration — a real and related effect — but it is not the argument this paper makes.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              Your 10-item eval scores model A 8/10 and model B 6/10. The correct
              conclusion is:
            </>
          ),
          choices: [
            {
              text: "The evidence is too weak to rank them — the binomial intervals overlap heavily — but the eval may still be worth keeping and re-running.",
              correct: true,
              explain:
                "The 95% interval for 8/10 runs roughly 44–97%. A narrow eval with a stated interval is genuinely useful; treating a 2-item difference as a ranking is the most common eval mistake.",
            },
            {
              text: "Model A is better at this behavior.",
              explain:
                "That's the reading the numbers invite and the sample size doesn't support. Two items is well inside the noise for n = 10.",
            },
            {
              text: "The eval is worthless and you should use a standard benchmark instead.",
              explain:
                "A standard benchmark would give you a tighter number on a question you didn't ask. A narrow eval you designed measures the thing you care about — it just needs more items or a larger effect to resolve.",
            },
            {
              text: "You should re-run with a higher temperature to get more signal.",
              explain:
                "Higher temperature adds variance, not signal. If anything you want temperature 0 and multiple paraphrases per item, so that variation you measure comes from the model rather than the sampler.",
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
          Holtzman is short and will change how you set sampling parameters
          forever. Kadavath is the one to read carefully — it is the most
          hopeful result in this module and the direct ancestor of honesty
          research.
        </p>
      ),
      readings: [
        {
          title: "The Curious Case of Neural Text Degeneration",
          authors: "Holtzman, Buys, Du, Forbes & Choi",
          year: 2019,
          url: "https://arxiv.org/abs/1904.09751",
          kind: "paper",
          time: "40 min",
          essential: true,
          note: "The paper that gave us nucleus sampling. §2 has the figure that matters: human text sits nowhere near the model's per-token maximum, and its probability fluctuates wildly. §4 defines top-p. Read it before touching a temperature slider again.",
        },
        {
          title: "Language Models (Mostly) Know What They Know",
          authors: "Kadavath, Conerly, Askell, et al. (Anthropic)",
          year: 2022,
          url: "https://arxiv.org/abs/2207.05221",
          kind: "paper",
          time: "1.5h",
          essential: true,
          note: "Long but worth it. §2 on calibration for multiple-choice, §4 on P(True) self-evaluation, §5 on training a model to predict P(IK). The framing to carry forward: uncertainty is present internally and the problem is largely a readout problem — which is exactly the claim interpretability is positioned to test.",
        },
        {
          title: "Why Language Models Hallucinate",
          authors: "Kalai, Nachum, Vempala & Zhang (OpenAI)",
          year: 2025,
          url: "https://arxiv.org/abs/2509.04664",
          kind: "paper",
          time: "45 min",
          essential: true,
          note: "Argues hallucination originates as ordinary binary-classification error in pretraining and persists because binary-graded benchmarks reward guessing over abstention. Read §1 and the sections on evaluation scoring; the reduction arguments are skimmable. Pair it with the eval-design problem — it is the strongest case for why your grading rule is a values choice.",
        },
        {
          title: "Fast Inference from Transformers via Speculative Decoding",
          authors: "Leviathan, Kalman & Matias (Google)",
          year: 2022,
          url: "https://arxiv.org/abs/2211.17192",
          kind: "paper",
          time: "35 min",
          note: "Short and elegant. §2 has the accept/reject rule and the proof that the output distribution is unchanged — read that proof, it is half a page and it is the whole reason the technique is safe to deploy. §3 has the expected-token formula used in the problem set.",
        },
        {
          title: "Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)",
          authors: "Kwon, Li, Zhuang, et al.",
          year: 2023,
          url: "https://arxiv.org/abs/2309.06180",
          kind: "paper",
          time: "45 min",
          note: "What the KV-cache calculator implies for real systems. §3 on memory fragmentation is the motivation — naive contiguous allocation wastes 60–80% of cache memory. The virtual-memory analogy is the whole idea and it is well told.",
        },
        {
          title: "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
          authors: "Dettmers, Lewis, Belkada & Zettlemoyer",
          year: 2022,
          url: "https://arxiv.org/abs/2208.07339",
          kind: "paper",
          time: "40 min",
          note: "Read §3 on emergent outlier features. The interpretability-relevant finding is that past a few billion parameters, a tiny number of dimensions carry outsized magnitude and dominate the layer — a fact that shows up again in the superposition and residual-stream modules.",
        },
        {
          title: "Transformer Inference Arithmetic",
          authors: "kipply (Carol Chen)",
          year: 2022,
          url: "https://kipp.ly/transformer-inference-arithmetic/",
          kind: "blog",
          time: "45 min",
          note: "The reference for back-of-envelope inference math: KV cache size, memory-bandwidth versus compute bounds, why decoding is latency-bound and prefill is not. Keep it open the first few times you size a deployment; it is the source most people quietly reproduce.",
        },
      ],
    },
  ],
};

export default mod;
