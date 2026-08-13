import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { BpeTokenizerLab } from "./BpeTokenizerLab";
import { EmbeddingMap } from "./EmbeddingMap";

const mod: CourseModule = {
  id: "1.1",
  slug: "tokens-and-embeddings",
  title: "Tokens & Embeddings",
  part: 1,
  tagline: "How text becomes vectors: BPE, tokenizer pathologies, and the geometry of embedding space.",
  estMinutes: 120,
  objectives: [
      "Run BPE merges by hand and explain why tokenizers exist",
      "Diagnose real LLM failures caused by tokenization",
      "Describe embedding space geometry and tied unembeddings"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "why-tokens",
      title: "The model never sees your text",
      body: (
        <>
          <p>
            Before a transformer does anything, a completely separate program
            chops your string into pieces and looks each piece up in a table.
            That program is the <strong>tokenizer</strong>, the pieces are{" "}
            <strong>tokens</strong>, and the model only ever sees the results. It
            has no access to the original characters. Almost every surprising
            low-level failure in this course traces back to that sentence.
          </p>
          <Figure caption="The full front end of a language model. Only the last arrow involves learned model weights; everything before it is a lookup table built by a program that was trained separately, on a different objective.">
            <svg viewBox="0 0 620 130" className="w-full max-w-[620px]" role="img" aria-label="Pipeline diagram: text is split into pre-tokens, then tokens, then token ids, then embedding vectors">
              <defs>
                <marker id="te-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              {[
                { x: 10, label: "text", value: "“the cat”" },
                { x: 165, label: "tokens", value: "the | ·cat" },
                { x: 320, label: "ids", value: "1169 | 3797" },
                { x: 475, label: "vectors", value: "768 numbers ×2" },
              ].map((b, i) => (
                <g key={b.label}>
                  <rect x={b.x} y={34} width={135} height={52} rx={8} fill="var(--surface-2)" stroke="var(--border-strong)" />
                  <text x={b.x + 67} y={56} fontSize={11} textAnchor="middle" fill="var(--text-muted)" className="font-mono">
                    {b.label}
                  </text>
                  <text x={b.x + 67} y={74} fontSize={12} textAnchor="middle" fill="var(--text-primary)" className="font-mono">
                    {b.value}
                  </text>
                  {i < 3 ? (
                    <line
                      x1={b.x + 137}
                      y1={60}
                      x2={b.x + 161}
                      y2={60}
                      stroke="var(--text-muted)"
                      strokeWidth={1.5}
                      markerEnd="url(#te-arrow)"
                    />
                  ) : null}
                </g>
              ))}
              <text x={175} y={110} fontSize={11} fill="var(--text-muted)" className="font-mono">
                tokenizer (no learned weights)
              </text>
              <text x={455} y={110} fontSize={11} fill="var(--text-muted)" className="font-mono">
                embedding matrix W_E
              </text>
              <text x={10} y={24} fontSize={11} fill="var(--text-muted)" className="font-mono">
                one forward pass starts here
              </text>
            </svg>
          </Figure>
          <p>
            Why not feed the model characters? You could, and some models do, but
            an average English word is 4–5 characters, so every sentence becomes
            4–5× longer. Attention cost grows with the square of sequence length,
            so character models spend their compute re-deriving spelling instead
            of meaning.
          </p>
          <p>
            Why not whole words? Then the vocabulary is unbounded (every typo,
            every name, every URL is a new word), rare words get almost no
            training signal, and anything unseen becomes an{" "}
            <code>&lt;UNK&gt;</code> hole in the input.
          </p>
          <KeyIdea>
            <strong>Subword tokenization</strong> is the compromise that won:
            frequent words get one token, rare words get split into pieces, and
            nothing is ever unrepresentable. GPT-2 uses 50,257 tokens; GPT-4o&apos;s
            tokenizer uses roughly 200,000. Bigger vocabulary means fewer tokens
            per sentence (cheaper, longer effective context) but a larger
            embedding matrix and a harder final softmax.
          </KeyIdea>
          <Term word="token">
            The atomic unit of input and output. Not a word, not a character, not
            a morpheme — just a frequent byte string that the tokenizer decided
            deserves an entry in the table. The leading space usually belongs to
            the token: <code>·cat</code> and <code>cat</code> are two different
            entries with two different vectors.
          </Term>
        </>
      ),
    },
    {
      kind: "learn",
      id: "bpe",
      title: "BPE: build a vocabulary by merging",
      body: (
        <>
          <p>
            <strong>Byte-pair encoding</strong> learns the vocabulary from data
            with an almost embarrassingly simple loop. Start with every character
            as its own symbol. Count every adjacent pair of symbols in the
            corpus. Merge the most frequent pair into one new symbol. Repeat
            until you have as many merges as you wanted.
          </p>
          <Figure caption="Four BPE merges on the classic toy corpus: low ×5, lower ×2, newest ×6, widest ×3. Each row merges the most frequent adjacent pair (ties broken by first appearance). The merges are remembered in order — that ordered list is the entire tokenizer.">
            <svg viewBox="0 0 600 190" className="w-full max-w-[600px]" role="img" aria-label="Four rounds of byte pair encoding merges on a toy corpus">
              {[
                { r: "start", w: "l o w · l o w e r · n e w e s t · w i d e s t", note: "" },
                { r: "merge 1", w: "l o w · l o w e r · n e w es t · w i d es t", note: "e + s → es (9×)" },
                { r: "merge 2", w: "l o w · l o w e r · n e w est · w i d est", note: "es + t → est (9×)" },
                { r: "merge 3", w: "lo w · lo w e r · n e w est · w i d est", note: "l + o → lo (7×)" },
                { r: "merge 4", w: "low · low e r · n e w est · w i d est", note: "lo + w → low (7×)" },
              ].map((row, i) => (
                <g key={row.r} transform={`translate(0 ${i * 36 + 16})`}>
                  <text x={8} y={12} fontSize={11} fill="var(--text-muted)" className="font-mono">
                    {row.r}
                  </text>
                  <text x={78} y={12} fontSize={12} fill="var(--text-primary)" className="font-mono">
                    {row.w}
                  </text>
                  <text x={78} y={28} fontSize={11} fill="var(--text-secondary)" className="font-mono">
                    {row.note}
                  </text>
                </g>
              ))}
            </svg>
          </Figure>
          <p>
            The payoff shows up on words the corpus never contained. Feed{" "}
            <code>lowest</code> to the four merges above, in order, and you get{" "}
            <code>low</code> + <code>est</code> — two learned pieces, no{" "}
            <code>&lt;UNK&gt;</code>, and a segmentation that happens to be
            morphologically sensible. That is the whole trick: frequent things
            get short, rare things get decomposed.
          </p>
          <KeyIdea>
            Encoding is <em>not</em> longest-match or dictionary lookup. It
            replays the learned merges <strong>in the order they were
            learned</strong>. Rank 0 fires everywhere it can, then rank 1, and so
            on. Two tokenizers with identical vocabularies but different merge
            orders segment text differently — the order is part of the model.
          </KeyIdea>
          <p>
            Real implementations add two wrinkles. First, a{" "}
            <strong>pre-tokenization regex</strong> splits text into words,
            numbers, and punctuation runs before any merging, so merges can never
            straddle a space or glue a word to a comma. Second,{" "}
            <strong>byte-level fallback</strong>: GPT-2 works on the 256 raw
            bytes rather than Unicode characters, so any input at all — emoji,
            Klingon, binary — is encodable, just expensively. The widget below
            has the first wrinkle and not the second; characters missing from its
            small corpus get flagged instead.
          </p>
          <Note kind="note" title="The tokenizer is trained before the model, and separately">
            BPE training optimises compression on a tokenizer corpus. It knows
            nothing about the language model, its data, or its loss. Whatever it
            decides, the model is stuck with for its entire life — and, as the
            next section shows, so are you.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "pathologies",
      title: "Where tokenizers bite",
      body: (
        <>
          <p>
            A tokenizer is a lossy interface between the world and the model.
            Four failure families come straight out of that interface, and you
            can predict all four from the mechanism.
          </p>
          <p>
            <strong>1. Arithmetic.</strong> A model can only learn a clean
            addition algorithm if digits arrive in consistent chunks. GPT-2 and
            GPT-3 gave hundreds of multi-digit numbers their own tokens with no
            consistent grouping, so <code>380 + 42</code> and{" "}
            <code>381 + 42</code> can have completely different token shapes.
            Beren Millidge&apos;s{" "}
            <a href="https://www.beren.io/2023-02-04-Integer-tokenization-is-insane/" target="_blank" rel="noreferrer">
              Integer tokenization is insane
            </a>{" "}
            walks through how bad it was; his{" "}
            <a href="https://www.beren.io/2024-05-11-Integer-tokenization-is-now-much-less-insane/" target="_blank" rel="noreferrer">
              2024 follow-up
            </a>{" "}
            notes that newer tokenizers adopted consistent digit grouping, which
            is one reason arithmetic improved without anything changing in the
            architecture.
          </p>
          <p>
            <strong>2. Spelling and counting letters.</strong> Asking how many{" "}
            <code>r</code>s are in <code>strawberry</code> asks the model to
            report on characters it never received. It can often answer anyway —
            spelling is recoverable from context and from the token string
            itself — but it is doing inference, not lookup, and it fails in the
            way that inference fails. Tokenization is not the whole story here,
            but it is why the task is hard at all.
          </p>
          <p>
            <strong>3. Glitch tokens.</strong> In 2023 Jessica Rumbelow and
            Matthew Watkins found tokens like{" "}
            <code>&nbsp;SolidGoldMagikarp</code> sitting near the centre of
            GPT-2&apos;s embedding cloud. These strings were frequent in the{" "}
            <em>tokenizer&apos;s</em> training data (Reddit usernames from
            counting threads) but essentially absent from the{" "}
            <em>model&apos;s</em> training data, so their embedding vectors were
            never trained away from their random initialisation. Prompting with
            them produced evasion, insults, hallucinated completions, and broke
            determinism at temperature 0. Land &amp; Bartolo later automated
            detection of such under-trained tokens across many production models
            — they are not a historical curiosity.
          </p>
          <p>
            <strong>4. Language inequity.</strong> Petrov et al. measured
            tokenized length for the same text across languages and found
            differences of up to 15×. Since APIs bill per token and context
            windows are counted in tokens, speakers of under-represented
            languages pay more money for less context and slower responses — a
            fairness problem baked in before inference starts.
          </p>
          <Note kind="safety">
            Two safety consequences worth carrying forward. First, glitch tokens
            are an <strong>attack surface</strong>: inputs that put a model far
            off the distribution its safety training covered, reachable by anyone
            who can type. Any evaluation of a safety property is an evaluation
            over the token distribution you tested, and rare-token space is
            enormous. Second, tokenization silently distorts{" "}
            <strong>measurement</strong>: a capability eval that looks like a
            reasoning benchmark can be partly a tokenization benchmark, so
            &ldquo;the model cannot do X&rdquo; sometimes means &ldquo;the model
            cannot see X.&rdquo; Before blaming cognition, check the tokens.
          </Note>
          <Note kind="warning" title="The trailing-space trap">
            Because the leading space belongs to the following token,{" "}
            <code>&ldquo;The capital of France is&rdquo;</code> and{" "}
            <code>&ldquo;The capital of France is&nbsp;&rdquo;</code> are
            genuinely different inputs. The second one has already committed to a
            token boundary the training data almost never contains, and quality
            drops. If a prompt behaves strangely, look at its last character
            first.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "embeddings",
      title: "From ids to geometry",
      body: (
        <>
          <p>
            A token id is just a row number. The{" "}
            <strong>embedding matrix</strong>{" "}
            <M>{String.raw`W_E \in \mathbb{R}^{n_{\text{vocab}} \times d_{\text{model}}}`}</M>{" "}
            holds one learned vector per token, and &ldquo;embedding a
            token&rdquo; means taking that row:
          </p>
          <MB>{String.raw`x_t = W_E^{\mathsf{T}} \, e_{t} \quad\text{(one-hot } e_t \text{ selects row } t)`}</MB>
          <p>
            Written as a matrix product it looks like computation; it is a table
            lookup. For GPT-2 small,{" "}
            <M>{String.raw`50{,}257 \times 768 \approx 38.6`}</M> million
            parameters — roughly 31% of the model&apos;s 124M, spent before any
            thinking happens.
          </p>
          <KeyIdea>
            The embedding vector is the <em>starting value</em> of the residual
            stream at that position, not the model&apos;s understanding of the
            token. Every later layer reads that stream and adds to it. By the
            middle layers the vector at a position encodes far more about
            context than about the token that seeded it — the first layers of a
            transformer are substantially in the business of undoing the
            tokenizer.
          </KeyIdea>
          <p>
            Because tokens with similar contexts get similar gradient pressure,
            embedding space acquires structure: numbers cluster with numbers,
            punctuation with punctuation, code keywords with code keywords. The
            famous stronger claim is <strong>analogy arithmetic</strong> —{" "}
            <M>{String.raw`\text{king} - \text{man} + \text{woman} \approx \text{queen}`}</M>{" "}
            — which says related pairs are separated by a consistent{" "}
            <em>offset vector</em>, not just placed nearby.
          </p>
          <Note kind="warning" title="How much to believe about analogies">
            The clusters are robust and easy to verify yourself. The clean
            analogy arithmetic is weaker than its fame suggests: results depend
            on excluding the query words from the answer candidates, work far
            better for some relation types (gender, capitals) than others, and
            are noisier in modern subword embeddings than in the word2vec-era
            results that made them famous. Treat &ldquo;consistent offsets
            exist&rdquo; as a real but partial phenomenon — the map below shows
            the idealised version so you know what the claim <em>means</em>.
          </Note>
          <p>
            At the other end of the model, the <strong>unembedding</strong>{" "}
            <M>{String.raw`W_U`}</M> turns the final residual vector back into
            50,257 logits — and each logit is a dot product between the residual
            stream and one row, exactly the similarity operation from Module 0.1:
          </p>
          <MB>{String.raw`\text{logit}_t = x_{\text{final}} \cdot W_U[:, t]`}</MB>
          <Term word="tied embeddings">
            Many models, GPT-2 included, use the <em>same</em> matrix for input
            and output: <M>{String.raw`W_U = W_E^{\mathsf{T}}`}</M>. It saves
            ~38M parameters and, per Press &amp; Wolf, improves perplexity. It
            also means one geometry serves two jobs — the direction that{" "}
            <em>reads in</em> a token is the direction that{" "}
            <em>writes out</em> that token, which is why you can measure
            &ldquo;how much is the model pushing toward token <M>t</M>&rdquo; by
            projecting onto an embedding row.
          </Term>
          <p>
            That last observation is the whole idea behind the{" "}
            <a href="https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens" target="_blank" rel="noreferrer">
              logit lens
            </a>
            : if the unembedding can decode the <em>final</em> residual stream,
            point it at an <em>intermediate</em> layer and watch the
            prediction form. Module 3.1 does this properly. For now, notice that
            it is only possible because input and output live in the same
            vector space.
          </p>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Play: tokenize and map",
      body: (
        <>
          <p>
            The first widget trains a genuine BPE tokenizer in your browser —
            200 merges over a small corpus, learned when the page loads — and
            re-segments whatever you type on every keystroke. The second is a
            hand-built picture of embedding-space structure, which is honest
            about being a diagram rather than a projection of real weights.
          </p>
          <BpeTokenizerLab />
          <EmbeddingMap />
          <p>
            Things to try: (1) Drag the merge slider from 0 to 200 with the prose
            sample loaded and watch tokens fuse — at 0 merges this is a
            character-level model, and the token count falls by more than half by
            the end. (2) Switch to the <strong>numbers</strong> sample and look
            at how <code>1024</code> and <code>2048</code> get carved up; the
            corpus contains both, so ask yourself what an addition algorithm
            would have to learn from these shapes. (3) Type the same word twice,
            once after a space and once at the start of a line, and confirm they
            produce different tokens. (4) In the map, hover{" "}
            <code>actor</code> and <code>42</code> and notice that
            nearest-neighbour structure is about <em>role in text</em>, not
            meaning in the world.
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
          Problem 1 is the one to do on paper — running the merge loop by hand
          once is worth an hour of reading about it. The two code problems can
          share a notebook.
        </p>
      ),
      problems: [
        {
          id: "bpe-by-hand",
          kind: "pencil",
          title: "Run BPE by hand",
          prompt: (
            <>
              <p>
                Corpus (word: count):{" "}
                <code>low: 5, lower: 2, newest: 6, widest: 3</code>. Start with
                characters as symbols; treat words as independent (no merges
                across word boundaries). Break count ties in favour of the pair
                encountered first, scanning words in the order listed.
              </p>
              <ol>
                <li>
                  Carry out merges 1–4, writing the pair, its count, and the
                  state of all four words after each merge.
                </li>
                <li>
                  Using exactly those four merges in order, encode the unseen
                  word <code>lowest</code>. How many tokens?
                </li>
                <li>
                  What would the vocabulary need for <code>lowest</code> to be a
                  single token, and why is that a bad trade?
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              The first pair count to compute is <code>e + s</code>: it occurs in{" "}
              <code>newest</code> (6) and <code>widest</code> (3). Compare
              against <code>s + t</code>, and mind the tie-break rule.
            </p>
          ),
          solution: (
            <>
              <p>
                Merge 1: <code>e + s → es</code>, count 9 (6 + 3), tying with{" "}
                <code>s + t</code> but appearing first. State:{" "}
                <code>l o w</code>, <code>l o w e r</code>,{" "}
                <code>n e w es t</code>, <code>w i d es t</code>.
              </p>
              <p>
                Merge 2: <code>es + t → est</code>, count 9. State:{" "}
                <code>l o w</code>, <code>l o w e r</code>,{" "}
                <code>n e w est</code>, <code>w i d est</code>.
              </p>
              <p>
                Merge 3: <code>l + o → lo</code>, count 7 (5 + 2), tying with{" "}
                <code>o + w</code> but appearing first. Merge 4:{" "}
                <code>lo + w → low</code>, count 7. Final state:{" "}
                <code>low</code>, <code>low e r</code>, <code>n e w est</code>,{" "}
                <code>w i d est</code>.
              </p>
              <p>
                Encoding <code>lowest</code>: start{" "}
                <code>l o w e s t</code>; rank 0 gives <code>l o w es t</code>;
                rank 1 gives <code>l o w est</code>; rank 2 gives{" "}
                <code>lo w est</code>; rank 3 gives <code>low est</code>. Two
                tokens, both learned from other words — this is the entire
                argument for subword vocabularies.
              </p>
              <p>
                For <code>lowest</code> to be one token you would need a fifth
                merge (<code>low + est</code>), and by extension a merge for every
                word you care about. That is the word-level tokenizer again:
                vocabulary grows without bound, each rare entry gets little
                training signal, and the embedding matrix and final softmax grow
                with it. The subword vocabulary buys generalisation to unseen
                strings for the price of a few extra tokens on rare words.
              </p>
            </>
          ),
        },
        {
          id: "merge-order",
          kind: "pencil",
          title: "Why merge order is part of the model",
          prompt: (
            <>
              <p>
                A tokenizer has learned these merges, in this order:{" "}
                <code>0: t+h→th</code>, <code>1: h+e→he</code>,{" "}
                <code>2: th+e→the</code>, <code>3: ·+the→·the</code> (where{" "}
                <code>·</code> is a space).
              </p>
              <ol>
                <li>
                  Encode <code>·the</code> step by step. Which merges fire, and
                  in which order?
                </li>
                <li>
                  Now suppose merges 0 and 1 were swapped in rank. Encode{" "}
                  <code>·the</code> again. Do you get the same tokens?
                </li>
                <li>
                  Explain why <code>the</code> at the start of a document and{" "}
                  <code>·the</code> mid-sentence are different tokens with
                  different embedding vectors, and give one practical consequence
                  for prompting.
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              At each step, scan for every applicable merge and apply the one
              with the <em>lowest rank</em> — not the leftmost, and not the
              longest.
            </p>
          ),
          solution: (
            <>
              <p>
                (1) <code>· t h e</code>: the lowest applicable rank is 0 (
                <code>t+h</code>), giving <code>· th e</code>. Now rank 1 (
                <code>h+e</code>) no longer matches — the <code>h</code> has been
                consumed. Rank 2 applies: <code>· the</code>. Then rank 3:{" "}
                <code>·the</code>. One token.
              </p>
              <p>
                (2) With <code>h+e</code> at rank 0, the first merge gives{" "}
                <code>· t he</code>. Now <code>t+h</code> cannot fire, and{" "}
                <code>th+e</code> cannot fire either — <code>th</code> was never
                formed. You end with <code>· t he</code>, three tokens instead of
                one, from the same vocabulary. Merge order is not a detail; it is
                the algorithm.
              </p>
              <p>
                (3) The pre-tokenizer attaches the leading space to the word, so{" "}
                <code>·the</code> and <code>the</code> are separate vocabulary
                entries with separate, independently learned rows of{" "}
                <M>{String.raw`W_E`}</M>. Practical consequence: never end a
                prompt with a trailing space. The model expects the space to
                arrive as part of the next token, and a prompt ending in a bare
                space is a token sequence the training data almost never
                contained. The same reasoning explains why few-shot formatting is
                so sensitive to whitespace.
              </p>
            </>
          ),
        },
        {
          id: "tiktokenizer",
          kind: "explore",
          title: "Compare real tokenizers",
          prompt: (
            <>
              <p>
                Open{" "}
                <a href="https://tiktokenizer.vercel.app/" target="_blank" rel="noreferrer">
                  tiktokenizer
                </a>{" "}
                and switch between models (GPT-2 and a modern GPT-4-class
                tokenizer at minimum). For each of the following, record the
                token count and the actual split:
              </p>
              <ol>
                <li>
                  <code>1234567</code>, <code>1,234,567</code>, and{" "}
                  <code>380 + 42 = 422</code>
                </li>
                <li>
                  The same sentence in English and in a non-Latin-script language
                  you can get a translation of
                </li>
                <li>
                  A short Python function, and the same function with the
                  indentation doubled
                </li>
                <li>
                  <code>strawberry</code>, and{" "}
                  <code>&nbsp;SolidGoldMagikarp</code>
                </li>
              </ol>
              <p>
                Write two sentences per item on what the split predicts about
                model behaviour.
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                What you should see: (1) GPT-2 chops long numbers into
                inconsistent chunks, so the same arithmetic problem has different
                token shapes depending on the digits; modern tokenizers group
                digits consistently, which is why they are better at arithmetic
                without any architectural change. Commas make it worse in every
                tokenizer — the separator becomes its own token and breaks the
                digit grouping.
              </p>
              <p>
                (2) The non-English version typically costs 2–5× more tokens
                (Petrov et al. report up to 15× across a wide language sample).
                Same meaning, more money, less context.
              </p>
              <p>
                (3) Indentation is tokens. Modern tokenizers have dedicated
                multi-space tokens because they were trained with lots of code;
                GPT-2 spends a token per space or two. Doubling indentation
                roughly doubles that overhead — one reason code-heavy prompts
                blow through context faster than they look like they should.
              </p>
              <p>
                (4) <code>strawberry</code> is 2–3 tokens, none of which is a
                letter, which is why letter-counting is inference rather than
                lookup. <code>&nbsp;SolidGoldMagikarp</code> is a single token in
                GPT-2 and gets split into ordinary pieces by newer tokenizers —
                you are looking directly at the artefact that produced the
                anomalous behaviour in the LessWrong post.
              </p>
            </>
          ),
        },
        {
          id: "implement-bpe",
          kind: "code",
          title: "Implement BPE end to end",
          prompt: (
            <>
              <p>
                In a notebook, implement <code>train(corpus, num_merges)</code>,{" "}
                <code>encode(text)</code> and <code>decode(ids)</code> for
                byte-level BPE. Train 500 merges on a few hundred KB of text
                (Tiny Shakespeare, or any file on your disk).
              </p>
              <p>Success checks:</p>
              <ol>
                <li>
                  <code>decode(encode(s)) == s</code> for a dozen strings
                  including emoji, accented characters, and tabs.
                </li>
                <li>
                  Compression: report characters per token before and after
                  training. With 500 merges on English you should land around
                  3–4 characters per token, versus 1 at merge zero.
                </li>
                <li>
                  Encode a word your corpus never contained and show the
                  segmentation is sensible pieces rather than bare characters.
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              Work on <code>text.encode(&quot;utf-8&quot;)</code>, i.e. integers
              0–255, so decoding is always possible. Keep merges as a dict{" "}
              <code>{`{(a, b): new_id}`}</code> and encode by repeatedly finding
              the pair in the current sequence with the <em>lowest</em> merge
              rank, exactly as in problem 2.
            </p>
          ),
          solution: (
            <>
              <p>
                Skeleton for the encode loop, which is the part people get wrong:
              </p>
              <pre>
                <code>{`def encode(ids, merges):          # merges: {(a, b): new_id}
    while len(ids) >= 2:
        pairs = zip(ids, ids[1:])
        best = min(pairs, key=lambda p: merges.get(p, float("inf")))
        if best not in merges:
            break                  # nothing left that we know how to merge
        i, out = 0, []
        while i < len(ids):
            if i < len(ids) - 1 and (ids[i], ids[i+1]) == best:
                out.append(merges[best]); i += 2
            else:
                out.append(ids[i]); i += 1
        ids = out
    return ids`}</code>
              </pre>
              <p>
                The <code>min</code> over merge rank is the whole difference
                between a correct BPE and a plausible-looking wrong one — greedy
                longest-match gives different, incompatible tokenizations.
                Decoding is the easy direction: expand each id back to its bytes
                and call{" "}
                <code>bytes(...).decode(&quot;utf-8&quot;, errors=&quot;replace&quot;)</code>.
              </p>
              <p>
                Compare against Karpathy&apos;s{" "}
                <a href="https://github.com/karpathy/minbpe" target="_blank" rel="noreferrer">
                  minbpe
                </a>{" "}
                once you have your own working — it also has a{" "}
                <code>GPT4Tokenizer</code> that reproduces tiktoken exactly, which
                is a satisfying thing to diff against.
              </p>
            </>
          ),
        },
        {
          id: "three-failures",
          kind: "pencil",
          title: "Three failures, traced to the tokenizer",
          prompt: (
            <p>
              Write a short paragraph on each of three real LLM failures that are
              caused or amplified by tokenization. For each: name the observable
              behaviour, give the mechanism at the token level, and state one
              intervention that would fix or reduce it. At least one of your
              three must be something you can reproduce yourself today.
            </p>
          ),
          hint: (
            <p>
              Good candidates: multi-digit arithmetic, letter-level tasks
              (counting, rhyming, acrostics), glitch tokens, non-English cost and
              quality, code indentation, and prompts ending in a space.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Arithmetic.</strong> Behaviour: a model adds 3-digit
                numbers reliably and 7-digit numbers badly. Mechanism: digits
                arrive in inconsistent chunks, so a positional carry algorithm
                would have to be learned separately for each chunking pattern;
                the model memorises common cases instead. Fix: tokenize digits
                individually or in fixed right-to-left groups, which several
                modern tokenizers now do; or prompt the model to write the number
                digit-by-digit first.
              </p>
              <p>
                <strong>Glitch tokens.</strong> Behaviour: prompting GPT-2 or
                GPT-3 with <code>&nbsp;SolidGoldMagikarp</code> produces evasion,
                unrelated text, or insults, and breaks determinism at temperature
                0. Mechanism: the token was frequent in the tokenizer&apos;s
                corpus but nearly absent from the model&apos;s, so its embedding
                row stayed near its random initialisation and lands in a region
                of embedding space no training ever visited. Fix: train tokenizer
                and model on the same data distribution, and screen the
                vocabulary for under-trained tokens before release — exactly what
                Land &amp; Bartolo automated.
              </p>
              <p>
                <strong>Letter-level tasks.</strong> Behaviour: miscounting the
                letters in a word, or bad rhyming and acrostics. Mechanism: the
                model receives 2–3 opaque tokens, not a character sequence, so
                any character-level answer must be reconstructed from what it has
                learned about how those tokens are spelled. Fix at the prompt
                level: ask for the word spelled out with separators first (which
                forces the characters into the token stream), then do the count.
                Reproduce it yourself in ten seconds with any chat model, and
                watch the spelled-out version succeed where the direct question
                fails.
              </p>
              <p>
                Also fully acceptable: multilingual cost (Petrov et al.), code
                indentation overhead, and the trailing-space trap.
              </p>
            </>
          ),
        },
        {
          id: "embedding-geometry",
          kind: "code",
          title: "Real embedding geometry in ten lines",
          prompt: (
            <>
              <p>
                Load GPT-2 small in a notebook (
                <code>transformers</code> or TransformerLens) and pull out{" "}
                <code>W_E</code>, shape 50257×768.
              </p>
              <ol>
                <li>
                  Verify the tying claim: is the unembedding matrix the same
                  tensor as the embedding matrix?
                </li>
                <li>
                  Compute cosine nearest neighbours for{" "}
                  <code>&nbsp;king</code>, <code>&nbsp;Paris</code>,{" "}
                  <code>&nbsp;seven</code>, and <code>def</code>. Do the clusters
                  from the widget show up?
                </li>
                <li>
                  Compute the mean cosine similarity between 1,000 random token
                  pairs. Compare with <M>{String.raw`1/\sqrt{768} = 0.036`}</M>{" "}
                  from Module 0.1. Explain any discrepancy.
                </li>
              </ol>
              <p>
                Success check: nearest neighbours are recognisably related, and
                you can state whether real embeddings are more or less spread out
                than random directions.
              </p>
            </>
          ),
          hint: (
            <p>
              <code>model.transformer.wte.weight</code> in HuggingFace;{" "}
              <code>model.W_E</code> in TransformerLens. Normalise rows before
              the dot product, and remember to prepend a space when you tokenize
              a mid-sentence word.
            </p>
          ),
          solution: (
            <>
              <pre>
                <code>{`from transformers import GPT2LMHeadModel, GPT2TokenizerFast
import torch

model = GPT2LMHeadModel.from_pretrained("gpt2")
tok = GPT2TokenizerFast.from_pretrained("gpt2")
W = model.transformer.wte.weight                      # (50257, 768)
print(model.lm_head.weight.data_ptr() == W.data_ptr()) # True -> tied

Wn = W / W.norm(dim=-1, keepdim=True)
def nn(s, k=8):
    i = tok.encode(s)[0]
    sims = Wn @ Wn[i]
    return [tok.decode([j]) for j in sims.topk(k).indices[1:]]
print(nn(" king"), nn(" Paris"), nn(" seven"), nn("def"))`}</code>
              </pre>
              <p>
                (1) In GPT-2 the language-model head shares storage with the
                embedding matrix, so the pointer check returns <code>True</code>.
                (2) Neighbours are recognisably thematic — royalty and titles
                around <code>&nbsp;king</code>, capitals and French words around{" "}
                <code>&nbsp;Paris</code>, number words and digits around{" "}
                <code>&nbsp;seven</code>, Python keywords and snake_case
                fragments around <code>def</code>.
              </p>
              <p>
                (3) The mean pairwise cosine is clearly positive (typically
                around 0.1–0.2 for GPT-2, not ~0), and the spread is wider than{" "}
                <M>{String.raw`1/\sqrt{768}`}</M>. Real embeddings are{" "}
                <em>not</em> random directions: they share a large common
                component (a mean offset every token has) plus a few dominant
                frequency-related directions. Centring the matrix by subtracting
                the mean row before comparing brings the numbers much closer to
                the random-direction baseline — a small experiment worth running,
                because &ldquo;subtract the mean before you interpret
                cosines&rdquo; is a habit that will save you in later modules.
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
          prompt: <>Why do production LLMs use subword tokens rather than characters?</>,
          choices: [
            {
              text: "Sequences stay short, so the quadratic cost of attention is spent on meaning rather than on re-deriving spelling.",
              correct: true,
              explain:
                "Subwords compress text roughly 4× versus characters. Given attention cost grows with the square of sequence length, that compression is the whole economic argument.",
            },
            {
              text: "Characters cannot be embedded as vectors.",
              explain:
                "They can — character-level models exist and work. The objection is cost and sequence length, not representability.",
            },
            {
              text: "Subword vocabularies guarantee every word maps to exactly one token.",
              explain:
                "They guarantee the opposite: rare words are deliberately split into several tokens. That is what makes the vocabulary finite while staying open to unseen strings.",
            },
            {
              text: "Because BPE preserves morphology, tokens are meaningful units like prefixes and suffixes.",
              explain:
                "BPE optimises frequency, not morphology. It often lands on morpheme-like pieces by accident (low + est) and just as often cuts words in linguistically absurd places.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              A BPE tokenizer knows <code>0: t+h→th</code>,{" "}
              <code>1: h+e→he</code>, <code>2: th+e→the</code>. Encoding{" "}
              <code>the</code> gives:
            </>
          ),
          choices: [
            {
              text: "One token — rank 0 fires first, then rank 2 completes the word.",
              correct: true,
              explain:
                "Merges are applied in learned order: t+h forms th, which makes he impossible, and then th+e produces the. Order is the algorithm, not a detail.",
            },
            {
              text: "Two tokens: t and he, because he is a longer known piece.",
              explain:
                "That is longest-match tokenization, a different algorithm. BPE looks for the lowest-rank applicable merge, and t+h has rank 0.",
            },
            {
              text: "Three tokens, since no merge covers the whole word at once.",
              explain:
                "Merges compose: each one rewrites the symbol sequence, so the output of an early merge becomes eligible input for a later one.",
            },
            {
              text: "It depends on which merges appear elsewhere in the sentence.",
              explain:
                "Pre-tokenization isolates each word, and merges never cross those boundaries. Encoding a pre-token is context-free.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              Why did <code>&nbsp;SolidGoldMagikarp</code> make GPT-2 and GPT-3
              behave strangely?
            </>
          ),
          choices: [
            {
              text: "It was common in the tokenizer's corpus but nearly absent from the model's, so its embedding stayed near random initialisation.",
              correct: true,
              explain:
                "Tokenizer and model are trained separately, on different data. A token the model essentially never saw has an untrained row in W_E, which puts the forward pass in a region of activation space no training ever visited.",
            },
            {
              text: "The string was deliberately blacklisted during safety training.",
              explain:
                "No filtering was involved. The anomaly is an accident of two training corpora disagreeing, which is exactly what makes it interesting — and what makes it likely to recur.",
            },
            {
              text: "It exceeds the maximum token length, causing a buffer overflow.",
              explain:
                "It is a single ordinary vocabulary entry; there is no length limit being violated and no memory-safety issue. The problem is statistical, not computational.",
            },
            {
              text: "Its embedding is the zero vector, so the model receives no input at that position.",
              explain:
                "Untrained is not zero — the row keeps its random initialisation, which is a specific, arbitrary, meaningless direction. Zero would be less strange, not more.",
            },
          ],
        },
        {
          id: "q4",
          prompt: <>Which claim about tied embeddings is correct?</>,
          choices: [
            {
              text: "W_U = W_Eᵀ, so the direction that reads a token in is the direction that writes it out.",
              correct: true,
              explain:
                "GPT-2 shares one matrix for both jobs. That shared geometry saves ~38M parameters and is what lets you interpret a residual direction by projecting onto embedding rows — the logit lens depends on it.",
            },
            {
              text: "Tying means the input and output vocabularies are the same size but the matrices are learned independently.",
              explain:
                "Same size is necessary but not sufficient; tying means literally the same parameters. Untied models exist and simply learn two matrices.",
            },
            {
              text: "Tying forces the model to predict the token it just read.",
              explain:
                "Sharing the matrix constrains the geometry, not the prediction. What gets predicted depends on the residual stream after 12 layers of transformation, not on the embedding row it started from.",
            },
            {
              text: "Tying is required for the softmax to normalise correctly.",
              explain:
                "Softmax normalises any set of logits, tied or not. Tying is a parameter-efficiency and generalisation choice (Press & Wolf 2017), not a mathematical requirement.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              A model fails to count the letters in <code>strawberry</code>. The
              most accurate diagnosis is:
            </>
          ),
          choices: [
            {
              text: "It receives a handful of opaque tokens, so character-level answers must be inferred rather than read off — tokenization makes the task hard, though not impossible.",
              correct: true,
              explain:
                "This is the honest version. Models often do succeed, especially when prompted to spell the word out first, which shows the information is recoverable but not directly available.",
            },
            {
              text: "The model has no representation of letters whatsoever, so the task is impossible for it.",
              explain:
                "Too strong: models demonstrably spell, rhyme, and do acrostics, so spelling information is present in the token embeddings. It is indirect, not absent.",
            },
            {
              text: "It is a reasoning failure with nothing to do with the input encoding.",
              explain:
                "Too weak in the other direction. Rewriting the same question so the letters appear as separate tokens usually fixes it, which is strong evidence the encoding is doing the damage.",
            },
            {
              text: "The context window is too small to hold the word.",
              explain:
                "A word is a few tokens against a window of thousands. Context length is not remotely the constraint here.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              You compute cosine similarities between random rows of GPT-2&apos;s
              embedding matrix and get a mean around 0.15, not the{" "}
              <M>{String.raw`1/\sqrt{768} \approx 0.036`}</M> spread that random
              directions would give. What does that tell you?
            </>
          ),
          choices: [
            {
              text: "Learned embeddings share a large common component; they are not random directions, and centring before comparing is usually wise.",
              correct: true,
              explain:
                "Real embedding clouds have a mean offset and a few dominant directions (often frequency-related). Subtracting the mean row moves the statistics much closer to the random-direction baseline, and is a standard preprocessing step before interpreting cosines.",
            },
            {
              text: "The near-orthogonality result from Module 0.1 is wrong.",
              explain:
                "That result is about vectors drawn uniformly at random, and it holds exactly as stated. Trained embeddings are simply not drawn from that distribution — the theory is fine, the assumption did not apply.",
            },
            {
              text: "GPT-2's embedding dimension must be much smaller than 768.",
              explain:
                "The dimension is exactly 768. High mean similarity reflects where the vectors sit, not how many coordinates they have — though it does mean the effective spread is lower than the dimension suggests.",
            },
            {
              text: "The tokenizer produced duplicate tokens.",
              explain:
                "Duplicates would raise a few individual similarities toward 1, not lift the average across random pairs. A shifted mean is a global property of the cloud.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              Your prompt ends with a trailing space. Why might that hurt output
              quality?
            </>
          ),
          choices: [
            {
              text: "The space normally belongs to the next token, so a bare trailing space is a boundary the training data rarely contains.",
              correct: true,
              explain:
                "Pre-tokenization attaches the leading space to the following word, so the natural continuation token (·cat) is now unreachable — the model must emit an odd space-less variant it has seen far less often.",
            },
            {
              text: "Spaces are stripped, so the prompt is unchanged and quality cannot differ.",
              explain:
                "Nothing strips it: the space becomes a token and enters the sequence. Two prompts that look identical to you are different inputs to the model.",
            },
            {
              text: "The trailing space consumes so much of the context window that earlier text is dropped.",
              explain:
                "It is one token. Context pressure is not the mechanism; distribution shift at the token boundary is.",
            },
            {
              text: "It causes the tokenizer to fall back to character-level encoding for the whole prompt.",
              explain:
                "No fallback happens. The rest of the prompt tokenizes exactly as before — only the final boundary changes, which is enough.",
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
          Do the Karpathy video as a build-along; everything else here is either
          the primary source for a claim in the lesson or a tool you will keep
          open while prompting.
        </p>
      ),
      readings: [
        {
          title: "Let's build the GPT Tokenizer",
          authors: "Andrej Karpathy",
          year: 2024,
          url: "https://www.youtube.com/watch?v=zduSFxRajkE",
          kind: "video",
          time: "2h (build-along)",
          essential: true,
          note: "Build a real byte-level BPE tokenizer, including the GPT-4 regex and special tokens. Do it with the code problem above open — the section on why encode() must pick the lowest-rank merge is the part people always get wrong on the first attempt. The last third (SentencePiece, vocabulary size choices) can be watched passively.",
        },
        {
          title: "SolidGoldMagikarp (plus, prompt generation)",
          authors: "Jessica Rumbelow & Matthew Watkins",
          year: 2023,
          url: "https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation",
          kind: "blog",
          time: "30 min",
          essential: true,
          note: "The founding document of glitch-token weirdness. Read the section on anomalous tokens and the transcripts closely; skim the prompt-generation method (it is interesting but separate). Ask yourself throughout: what other properties of a model could two mismatched training corpora produce?",
        },
        {
          title: "Neural Machine Translation of Rare Words with Subword Units",
          authors: "Rico Sennrich, Barry Haddow & Alexandra Birch",
          year: 2016,
          url: "https://arxiv.org/abs/1508.07909",
          kind: "paper",
          time: "40 min",
          note: "The paper that brought BPE from data compression into NLP. Read §3 (the algorithm) and the worked example that matches the figure in the lesson; skip the machine-translation experiments unless you are curious about the pre-transformer era.",
        },
        {
          title: "Fishing for Magikarp: Automatically Detecting Under-trained Tokens in LLMs",
          authors: "Sander Land & Max Bartolo",
          year: 2024,
          url: "https://arxiv.org/abs/2405.05417",
          kind: "paper",
          time: "45 min",
          note: "Glitch tokens grown up: automatic detection of under-trained tokens across many production models, using the model's own predictions rather than manual poking. Read the method section and the per-model results tables. The takeaway is that this is a live vocabulary-hygiene problem, not a GPT-2 anecdote.",
        },
        {
          title: "Using the Output Embedding to Improve Language Models",
          authors: "Ofir Press & Lior Wolf",
          year: 2017,
          url: "https://arxiv.org/abs/1608.05859",
          kind: "paper",
          time: "25 min",
          note: "The tied-embeddings result: sharing input and output embeddings saves parameters and improves perplexity. Short and readable — read §2–3 and note the argument about what the two matrices are each trying to represent, because that shared geometry is what makes the logit lens work later.",
        },
        {
          title: "Language Model Tokenizers Introduce Unfairness Between Languages",
          authors: "Petrov, La Malfa, Torr & Bibi",
          year: 2023,
          url: "https://arxiv.org/abs/2305.15425",
          kind: "paper",
          time: "30 min",
          note: "Measures tokenized length for parallel text across many languages and finds differences up to 15×. Read the figures first — the disparity plot makes the argument on its own — then the discussion of cost, latency, and effective context. The clearest example in this module of a technical choice with a direct distributional-harm consequence.",
        },
        {
          title: "tiktokenizer",
          authors: "dqbd",
          year: 2023,
          url: "https://tiktokenizer.vercel.app/",
          kind: "tool",
          time: "keep open",
          note: "Paste any text, switch tokenizer, see the split and the ids. Use it whenever a model does something strange with numbers, whitespace, or a non-English string — checking the tokens is a ten-second first diagnostic that is right often enough to be a habit.",
        },
      ],
    },
  ],
};

export default mod;
