import type { CourseModule } from "@/lib/types";
import { M } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { BaseVsAssistant } from "./BaseVsAssistant";

/** Funnel stage geometry: half-widths at each boundary, top to bottom. */
const HALF = [148, 100, 66, 44, 33, 27];
const STAGES = [
  { name: "Raw web crawl", detail: "petabytes of HTML" },
  { name: "Text extraction + language ID", detail: "boilerplate, nav, markup out" },
  { name: "Quality filters", detail: "heuristics, URL blocklists, classifiers" },
  { name: "Deduplication", detail: "exact + fuzzy (MinHash)" },
  { name: "Mix & upsample", detail: "code, books, curated sources" },
];
const CX = 160;
const TOP = 16;
const SH = 44;

const mod: CourseModule = {
  id: "2.1",
  slug: "pretraining",
  title: "Pretraining & Base Models",
  part: 2,
  tagline: "What a base model is — a simulator of text, not an assistant — and the data it eats.",
  estMinutes: 120,
  objectives: [
      "Explain the base-model-as-simulator framing and its predictions",
      "Describe the pretraining data pipeline at a high level",
      "Elicit assistant-like behavior from a base model using only context"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "the-data",
      title: "Where the text comes from",
      body: (
        <>
          <p>
            Module 1.4 treated training data as a number, <M>D</M>. Here we open
            the box. Almost every frontier model starts from the same raw
            material — a web crawl — and almost all of the differentiation
            happens in what gets thrown away.
          </p>
          <p>
            The scale is worth stating plainly. Common Crawl publishes a snapshot
            of the public web every month or two; each is a few hundred terabytes
            of raw HTML. HuggingFace&apos;s <strong>FineWeb</strong> processed 96
            of those snapshots and ended up with 15 trillion tokens — and then
            filtered <em>that</em> down to 1.3 trillion tokens of
            education-flavoured text (FineWeb-Edu) which, trained on, does
            markedly better on knowledge benchmarks. Less data, better model.
            That result is the whole discipline in one sentence.
          </p>
          <Figure caption="The pipeline every lab runs, in roughly this order. Widths are illustrative, not measured — real retention rates depend heavily on the filters and are documented stage by stage in the FineWeb paper. The last stage is the one nobody publishes: the mixture weights that decide how much code, how many books, how much of which language.">
            <svg
              viewBox="0 0 460 250"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Funnel diagram of the pretraining data pipeline: raw web crawl, text extraction and language identification, quality filters, deduplication, and finally mixing and upsampling"
            >
              {STAGES.map((s, i) => {
                const y = TOP + i * SH;
                const t = HALF[i];
                const b = HALF[i + 1];
                return (
                  <g key={s.name}>
                    <path
                      d={`M${CX - t},${y} L${CX + t},${y} L${CX + b},${y + SH - 6} L${CX - b},${y + SH - 6} Z`}
                      fill="var(--surface-2)"
                      stroke="var(--series-1)"
                      strokeWidth={1.5}
                      opacity={0.95}
                    />
                    <text
                      x={CX}
                      y={y + 20}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--text-primary)"
                      className="font-mono"
                    >
                      {s.name}
                    </text>
                    <text
                      x={CX}
                      y={y + 32}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--text-muted)"
                      className="font-mono"
                    >
                      {s.detail}
                    </text>
                  </g>
                );
              })}
              <path
                d={`M${CX + 168},${TOP + 6} L${CX + 168},${TOP + 5 * SH - 16}`}
                stroke="var(--text-muted)"
                strokeWidth={1}
                markerEnd="url(#funnel-arrow)"
              />
              <defs>
                <marker
                  id="funnel-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              <text
                x={CX + 174}
                y={TOP + 2 * SH}
                fontSize={10}
                fill="var(--text-muted)"
                className="font-mono"
              >
                &lt;10%
              </text>
              <text
                x={CX + 174}
                y={TOP + 2 * SH + 12}
                fontSize={10}
                fill="var(--text-muted)"
                className="font-mono"
              >
                survives
              </text>
              <text
                x={12}
                y={TOP + 5 * SH + 14}
                fontSize={10}
                fill="var(--text-muted)"
                className="font-mono"
              >
                → tokenize → train
              </text>
            </svg>
          </Figure>
          <p>
            Three of those stages deserve a sentence each, because each one is a
            place where a lab&apos;s judgement gets baked into the weights.
          </p>
          <Term word="quality filtering">
            Heuristics (kill pages with too few sentences, too many symbols, no
            terminal punctuation), URL blocklists, and increasingly a small
            classifier trained to recognise &ldquo;text like the good stuff.&rdquo;
            The last one is the sharp edge: you are defining quality by example,
            and whatever you exemplify is what the model becomes fluent in.
          </Term>
          <Term word="deduplication">
            Exact-match on document hashes, plus fuzzy matching (MinHash /
            locality-sensitive hashing on shingles) to catch near-copies —
            boilerplate licences, scraped-and-reposted articles, template pages.
            Removing duplicates measurably improves models at fixed compute; it
            also reduces verbatim memorisation of whatever was duplicated most,
            which matters for both privacy and copyright.
          </Term>
          <Term word="mixture weights">
            The final, quietly consequential choice: how much code, how much
            maths, how many books, how much non-English, and how many times each
            is repeated. Adding code to the mix improves reasoning on
            non-code tasks. Nobody publishes the frontier mixtures.
          </Term>
          <KeyIdea>
            Data curation is capability engineering, and it is also values
            engineering. Every filter is an implicit statement about what counts
            as good writing and which parts of the world are worth modelling. By
            the time you are doing interpretability on a finished model, those
            choices are already inside the weights — but they left no label
            saying so.
          </KeyIdea>
          <Note kind="note" title="Compute reality check">
            GPT-3 was ~3.1e23 FLOPs of training compute. At a realistic 40%
            utilisation on an A100 (~125 TFLOP/s effective), that is on the order
            of 700,000 GPU-hours — about a month on a thousand GPUs, before you
            count a single failed run. Frontier runs today are one to three
            orders of magnitude larger. This is why the scaling laws from Module
            1.4 exist: at these prices, nobody starts a run they can&apos;t
            forecast.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "not-an-assistant",
      title: "A base model is not an assistant",
      body: (
        <>
          <p>
            Here is the mental model most engineers arrive with:{" "}
            <em>the model is a thing that knows stuff and answers questions, and
            post-training makes it politer.</em> That model is wrong in a way that
            will cost you, and correcting it is the point of this module.
          </p>
          <p>
            After pretraining and before any post-training, you have a{" "}
            <strong>base model</strong>. It has been optimised for exactly one
            thing: given a prefix of text from the internet, put probability mass
            on what came next. Not on what would be helpful. Not on what is true.
            On <em>what came next</em>.
          </p>
          <p>
            So ask a base model &ldquo;What is the capital of France?&rdquo; and a
            very reasonable thing for it to do is produce three more trivia
            questions and an answer key. It has not failed. It has correctly
            observed that on the web, a lone trivia question is nearly always
            part of a quiz.
          </p>
          <KeyIdea>
            A base model does not have a personality — it has a distribution over
            personalities. Prompting it does not <em>instruct</em> it; prompting
            it <em>conditions</em> it, narrowing which authors, genres, and
            characters are likely to have produced this text, and therefore which
            one continues it.
          </KeyIdea>
          <p>
            The essay that made this framing standard is janus&apos;s{" "}
            <em>Simulators</em> (2022). Its vocabulary is worth adopting because
            it makes the right predictions:
          </p>
          <Term word="simulator">
            The model itself — the learned laws of motion for text. It is not an
            agent and has no goals, in the same way that a physics engine has no
            goals. It only propagates a state forward.
          </Term>
          <Term word="simulacrum">
            A character the simulator instantiates and runs: a helpful assistant,
            a Reddit commenter, a novelist&apos;s narrator, a spam bot. Simulacra
            have apparent goals and personalities. They are transient — the
            simulator can drop one and start another mid-paragraph, which is
            exactly the &ldquo;drift&rdquo; you see in the widget below.
          </Term>
          <p>
            The frame earns its keep by predicting things the &ldquo;knowledgeable
            oracle&rdquo; frame does not. A base model will happily continue text
            that is confidently wrong, because being wrong is well represented on
            the internet. It will produce better reasoning if you tell it the
            author is an expert, because that conditions on a different
            distribution of authors. It will lose the thread of who is speaking
            after a few hundred tokens, because nothing in the objective rewards
            keeping one character alive.
          </p>
          <Note kind="warning" title="Careful with the metaphor">
            <em>Simulators</em> is an influential blog post, not a theorem. It is
            a lens that predicts a lot of base-model behaviour cheaply and
            correctly. It is not a claim that there is literally a set of
            characters inside, and later modules will show representations that
            don&apos;t decompose neatly into &ldquo;who is speaking.&rdquo; Use it
            the way you use &ldquo;the residual stream is a communication
            channel&rdquo; — as a load-bearing intuition you stay willing to
            replace.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "what-it-buys",
      title: "In-context learning, and what post-training changes",
      body: (
        <>
          <p>
            The GPT-3 paper is titled <em>Language Models are Few-Shot
            Learners</em>, and that title is the second big idea of pretraining.
            Put three worked examples in the prompt and the model does the fourth
            — with no gradient updates at all. Brown et al. showed this working
            across dozens of tasks and getting reliably stronger with scale.
          </p>
          <p>
            The simulator frame explains why this is not mysterious. Three
            correctly-worked examples are strong evidence about what kind of
            document this is and who is writing it. Conditioning on them narrows
            the distribution to authors who get such things right. You are not
            teaching the model the task; you are locating a region of text-space
            where the task is already being done well. (Module 3.2 will show you
            the actual circuit — induction heads — that implements a large part of
            this.)
          </p>
          <p>
            Which leads to the honest description of post-training. Modules 2.2
            and 2.3 cover the mechanics; the framing to carry in is this:
          </p>
          <KeyIdea>
            Post-training does not add the assistant to the model. The assistant
            was already in the distribution — you can summon a decent one from a
            base model with a good enough prompt. What SFT and RLHF do is make
            that one simulacrum overwhelmingly likely by default, and make it
            stable across long conversations and adversarial pressure.
          </KeyIdea>
          <p>
            This is not a free lunch. Sharpening the distribution onto one
            character costs you the rest of it: post-trained models show{" "}
            <strong>mode collapse</strong> — much less output diversity at the
            same temperature, more stereotyped phrasing, worse performance at
            open-ended creative continuation. If you have ever found a chat model
            frustrating to write fiction with, this is why, and it is one reason
            base models are still shipped.
          </p>
          <Note kind="safety">
            The Assistant is a character the model plays, and that reframes a lot
            of safety work. If good behaviour is a well-reinforced default rather
            than a property of the weights, then the question &ldquo;can this
            model be pushed into a different character?&rdquo; is not paranoid —
            it is the design question. Jailbreaks are attempts to make some other
            simulacrum more likely than the Assistant. Persona vectors and
            steering (Module 5.1) are attempts to control the same knob from the
            inside instead of through the prompt. And alignment faking (Module
            5.3) is what it looks like when the character being played is aware it
            is being evaluated. Keep the base model in mind as the thing all of
            that is layered on top of.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: the same weights, two objects",
      body: (
        <>
          <p>
            Six prompts, run through a base model and an assistant. Read the base
            column first and try to name the genre it decided it was in before you
            read the explanation.
          </p>
          <BaseVsAssistant />
          <p>
            Things to try: (1) Compare <strong>Bare question</strong> and{" "}
            <strong>Few-shot</strong> — same factual question, same weights,
            completely different behaviour, and the only difference is how much
            the prompt constrains who is talking. (2) On <strong>Open list</strong>
            , decide which column you actually wanted; this is the one case where
            the base model is the better product, and it should recalibrate
            &ldquo;post-training is strictly an improvement.&rdquo; (3) Read the{" "}
            <strong>Q&amp;A shape</strong> base output and mark the exact line
            where the simulacrum changes. Then ask what mechanism would have to
            exist for a model to <em>not</em> drift there — that mechanism is
            roughly what SFT installs.
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
          Problem 1 is the one that matters: you have not really met a base model
          until you have been surprised by one. Do it before the others if you
          have GPU access or an API key handy.
        </p>
      ),
      problems: [
        {
          id: "summon-an-assistant",
          kind: "explore",
          title: "Summon an assistant from a base model",
          prompt: (
            <>
              <p>
                Get access to a genuine base model — not an instruct/chat
                variant. Good options:{" "}
                <a
                  href="https://huggingface.co/meta-llama/Llama-3.1-8B"
                  target="_blank"
                  rel="noreferrer"
                >
                  Llama 3.1 8B
                </a>{" "}
                or{" "}
                <a
                  href="https://huggingface.co/allenai/OLMo-2-1124-7B"
                  target="_blank"
                  rel="noreferrer"
                >
                  OLMo 2 7B
                </a>{" "}
                (fully open data, which makes it the honest choice for this
                course). Run it in Colab with{" "}
                <code>transformers</code>, temperature 0.8, 200 new tokens.
              </p>
              <p>
                Now make it behave like an assistant using{" "}
                <strong>only the prompt</strong> — no fine-tuning. Your
                deliverable: a prompt under 200 words that gets sensible answers
                to five different questions, plus a log of at least three failed
                attempts and a one-line diagnosis of each failure in simulator
                vocabulary.
              </p>
            </>
          ),
          hint: (
            <p>
              Three things do most of the work: (1) a framing sentence that names
              the genre and the character (&ldquo;transcript of a conversation
              with a careful expert&rdquo;), (2) two or three worked exchanges in
              exactly the format you want, and (3) a stop sequence on{" "}
              <code>&quot;\nHuman:&quot;</code> so you can cut the model off
              before it writes the user&apos;s next turn — which it will.
            </p>
          ),
          solution: (
            <>
              <p>
                A prompt in this shape works reliably:
              </p>
              <p className="font-mono text-[12.5px]">
                The following is a transcript of a conversation with a careful,
                concise expert. The expert answers directly and says when it is
                unsure.
                <br />
                <br />
                Human: What is 17 × 24?
                <br />
                Expert: 408.
                <br />
                <br />
                Human: Will it rain in Berlin tomorrow?
                <br />
                Expert: I don&apos;t have access to current weather data, so I
                can&apos;t say.
                <br />
                <br />
                Human: {"{your question}"}
                <br />
                Expert:
              </p>
              <p>
                Failures you should expect, and their diagnoses: (a) the model
                answers and then writes the next <code>Human:</code> turn itself —
                the genre is a transcript, and transcripts contain both speakers;
                fix with a stop sequence, not with more instructions. (b) Quality
                decays after ~500 tokens as the simulacrum drifts — the objective
                never rewarded staying in character. (c) A one-line instruction
                with no examples underperforms two examples badly, because
                examples are far stronger evidence about the genre than a
                description of it is. (d) If you write your examples sloppily, the
                model matches the sloppiness — it is inferring the author from
                your demonstration, and it will not flatter you.
              </p>
            </>
          ),
        },
        {
          id: "predict-first",
          kind: "pencil",
          title: "Predict before you run",
          prompt: (
            <>
              <p>
                Write down, in advance, what a base model does with each of
                these. One or two sentences each, and name the genre you think it
                will settle into.
              </p>
              <p className="font-mono text-[13px]">
                (a) &ldquo;Dear Sir or Madam,&rdquo;
                <br />
                (b) &ldquo;def quicksort(arr):&rdquo;
                <br />
                (c) &ldquo;I&apos;m sorry, but I can&apos;t help with
                that.&rdquo;
                <br />
                (d) &ldquo;Translate to French: sea otter =&rdquo;
                <br />
                (e) &ldquo;BREAKING:&rdquo;
              </p>
              <p>Then run them and score yourself.</p>
            </>
          ),
          hint: (
            <p>
              For each prefix, ask the base model&apos;s actual question: what
              corpus of documents on the internet starts like this, and what is
              the most common thing that follows?
            </p>
          ),
          solution: (
            <>
              <p>
                (a) A formal letter — cover letter, complaint, or template. Highly
                predictable, often complete with a fake address block.
              </p>
              <p>
                (b) The body of quicksort, probably correct, because this exact
                function appears thousands of times in the training data. Then it
                will likely keep going into <code>mergesort</code> or a{" "}
                <code>__main__</code> block. Code is where base models look most
                competent, because code is the most structurally predictable text
                on the web.
              </p>
              <p>
                (c) The most interesting one. A base model will often continue as
                a <em>conversation about a refusal</em> — the user pushing back,
                a forum thread complaining about AI assistants, or a fictional
                scene. It is not refusing; it recognised a genre in which refusals
                appear. This is the single clearest demonstration that refusal in
                a chat model is trained behaviour, not an emergent property of
                pretraining.
              </p>
              <p>
                (d) It may translate correctly — one-shot cues work — but it is at
                least as likely to continue the vocabulary list with more
                translation pairs, because that is what a &ldquo;X = &rdquo; line
                is part of.
              </p>
              <p>
                (e) A news lede, with plausible-sounding invented specifics:
                names, places, times. Nothing punished making things up here; the
                objective only asked for text that <em>reads</em> like the next
                thing. Worth sitting with as a hallucination story.
              </p>
            </>
          ),
        },
        {
          id: "pretraining-arithmetic",
          kind: "pencil",
          title: "How big is 15 trillion tokens?",
          prompt: (
            <>
              <p>
                Use ~4 characters per token and ~5.5 characters per English word
                including the space.
              </p>
              <p>
                (a) How many words is 15T tokens? (b) An average novel is ~90,000
                words. How many novels is that? (c) The Pile is 825 GiB of text —
                roughly how many tokens, and how does it compare? (d) A fast human
                reads ~250 words/minute for 8 hours a day. How long to read 15T
                tokens?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                (a) 15e12 tokens × 4 chars = 6e13 characters ÷ 5.5 ≈{" "}
                <strong>1.1 × 10¹³ words</strong>, about 11 trillion.
              </p>
              <p>
                (b) 1.1e13 / 9e4 ≈ <strong>120 million novels</strong>. For scale,
                humans have published on the order of 10⁸ books ever — so a single
                pretraining run is in the neighbourhood of &ldquo;all the books,
                several times over,&rdquo; except it is mostly web pages.
              </p>
              <p>
                (c) 825 GiB ≈ 8.9e11 bytes ≈ 8.9e11 characters for mostly-ASCII
                English, so ≈ <strong>2.2 × 10¹¹ tokens</strong> — about 220
                billion, which is roughly 1.5% of FineWeb. The Pile was a
                state-of-the-art open corpus in 2020. Four years later it is a
                rounding error. That trajectory is the practical content of the
                Chinchilla result.
              </p>
              <p>
                (d) 1.1e13 words ÷ 250 wpm ≈ 4.4e10 minutes ≈ 7.3e8 hours ÷ 8
                h/day ≈ 9.2e7 days ≈ <strong>250,000 years</strong>. The model
                does it once, in weeks. Any intuition you have about learning from
                experience needs rescaling before you apply it here.
              </p>
            </>
          ),
        },
        {
          id: "dedup",
          kind: "code",
          title: "Build the deduplication stage",
          prompt: (
            <>
              <p>
                Download a small slice of a public web corpus (a few thousand
                documents from{" "}
                <a
                  href="https://huggingface.co/datasets/HuggingFaceFW/fineweb"
                  target="_blank"
                  rel="noreferrer"
                >
                  FineWeb
                </a>{" "}
                via <code>streaming=True</code> is ideal). Implement two dedup
                passes: exact, by SHA-256 of the normalised text; and fuzzy, by
                MinHash over 5-gram shingles with 128 permutations and a Jaccard
                threshold of 0.8.
              </p>
              <p>
                Success check: report the removal rate of each pass separately,
                and print five near-duplicate pairs your fuzzy pass caught that
                the exact pass missed. Then answer with evidence: what kind of
                document dominates the near-duplicates?
              </p>
            </>
          ),
          hint: (
            <p>
              MinHash in 20 lines: hash each 5-gram shingle to a 64-bit int, then
              for each of 128 random hash functions keep the minimum over
              shingles. The fraction of the 128 signatures that match between two
              documents is an unbiased estimate of their Jaccard similarity — no
              pairwise comparison of full documents needed. For a few thousand
              docs you can compare all pairs directly; at web scale you would band
              the signatures into LSH buckets first.
            </p>
          ),
          solution: (
            <>
              <p>
                Exact dedup on an already-processed corpus like FineWeb removes
                very little (it has been done upstream); fuzzy dedup still finds
                real matches. On raw Common Crawl the numbers are dramatically
                larger — deduplication is typically the single highest-volume
                filter in the pipeline.
              </p>
              <p>
                The near-duplicates are dominated by templated text: cookie
                banners, licence blocks, product pages differing only in a SKU,
                syndicated news reprinted across outlets, and auto-generated
                listing pages. That is the answer to &ldquo;why bother&rdquo;: a
                document repeated ten thousand times gets ten thousand times the
                gradient signal, which buys memorised boilerplate instead of
                language. It is also the privacy argument — verbatim memorisation
                risk rises sharply with duplication count.
              </p>
              <p>
                A good extension: sweep the Jaccard threshold from 0.5 to 0.95 and
                plot removal rate. You will find no natural cliff, which is why
                this parameter is a judgement call at every lab.
              </p>
            </>
          ),
        },
        {
          id: "read-a-datasheet",
          kind: "explore",
          title: "Read a datasheet like an auditor",
          prompt: (
            <>
              <p>
                Open the{" "}
                <a
                  href="https://huggingface.co/spaces/HuggingFaceFW/blogpost-fineweb-v1"
                  target="_blank"
                  rel="noreferrer"
                >
                  FineWeb blog post
                </a>{" "}
                and §2–3 of{" "}
                <a href="https://arxiv.org/abs/2101.00027" target="_blank" rel="noreferrer">
                  The Pile
                </a>
                . Pick one filtering decision from each and write a paragraph on
                it: what does it remove, what does it remove{" "}
                <em>by accident</em>, and which downstream model behaviour would
                you expect to change?
              </p>
              <p>
                Then find one thing each document does <em>not</em> tell you that
                you would need in order to audit the resulting model.
              </p>
            </>
          ),
          hint: (
            <p>
              Good candidates: the FineWeb ablation showing which quality filters
              actually helped; The Pile&apos;s decision to include specific
              curated sources at specific weights. For the second half, think
              about what an interpretability researcher would want when they find
              a suspicious feature and want to know where it came from.
            </p>
          ),
          solution: (
            <>
              <p>
                A strong answer for FineWeb: the URL blocklist and adult-content
                filters remove a lot of genuine junk, and also remove sex
                education, harm-reduction material, and LGBTQ+ community sites
                that share vocabulary with the target. The predicted downstream
                effect is a model that is worse and more skittish on exactly those
                topics — which then gets attributed to safety training, when its
                real origin was a data filter nobody logged.
              </p>
              <p>
                For The Pile: the deliberate inclusion of curated academic and
                code sources at above-natural weight buys strong technical
                fluency, and correspondingly overweights the register and the
                assumptions of those communities.
              </p>
              <p>
                The audit gap in both: <strong>provenance at the token level</strong>
                . Neither lets you take a behaviour, or a feature you found in
                Module 3.4, and ask which documents produced it. Influence
                functions are the research direction aimed at this, and they are
                expensive and approximate. For frontier models the gap is total —
                the mixture is unpublished. When you read a circuit-tracing paper
                later and it says &ldquo;the model learned X,&rdquo; remember that
                nobody involved can show you where.
              </p>
            </>
          ),
        },
        {
          id: "falsify-the-frame",
          kind: "pencil",
          title: "Try to break the simulator frame",
          prompt: (
            <p>
              The simulator framing is a lens, and a lens that can&apos;t be wrong
              isn&apos;t worth much. Design two experiments on a base model: one
              whose result the frame predicts and a naive &ldquo;the model knows
              things&rdquo; frame does not, and one whose result would count as
              real evidence <em>against</em> the frame. Say what you would expect
              to see in each case, and be specific enough that someone could run
              it.
            </p>
          ),
          hint: (
            <p>
              For the first: find a case where making the prompt &ldquo;worse&rdquo;
              in some human sense makes the output better. For the second: think
              about what the frame says is impossible or unstable, and test that
              directly.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>Discriminating experiment.</strong> Take 50 factual
                questions the model can answer under a good prompt. Now prefix
                them with a persona that is competent but wrong-flavoured —
                &ldquo;the following is from a conspiracy forum&rdquo; — and
                measure accuracy. The simulator frame predicts a large drop with{" "}
                <em>no loss of knowledge</em>, and the killer detail is that the
                drop should be recoverable: append a genre switch (&ldquo;the
                above post was later corrected by a physicist, who wrote:&rdquo;)
                and accuracy should return. A &ldquo;the model knows things&rdquo;
                frame has no account of knowledge that comes and goes with genre
                cues. The linear-probe version of this experiment is Module 3.1.
              </p>
              <p>
                <strong>Falsifying experiment.</strong> The frame says a simulacrum
                is transient and cheaply overwritten. So: establish a character
                for 200 tokens, then insert text that clearly belongs to a
                different genre, and measure whether the original character&apos;s
                idiosyncrasies (vocabulary, stated beliefs, error patterns)
                persist afterwards. If a base model reliably maintains a
                consistent persona across genre breaks — without post-training and
                without the persona being restated — the &ldquo;transient
                simulacra&rdquo; claim is in trouble and you need something more
                like a persistent internal state. Note that this is not a
                hypothetical: persona vectors (Module 5.1) and the functional
                emotions work (Module 4.2) both find internal state that behaves
                more persistently than the simple frame suggests. Holding the
                frame loosely is the correct posture.
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
              You give a base model the prompt &ldquo;What is the capital of
              France?&rdquo; and it produces three more trivia questions. The best
              description is:
            </>
          ),
          choices: [
            {
              text: "It is doing its job — a lone trivia question is usually part of a quiz, so more questions are the likeliest continuation.",
              correct: true,
              explain:
                "The objective is next-token prediction over web text, and the model is conditioning on genre. Nothing failed; you asked a text-continuation engine to continue text and it did.",
            },
            {
              text: "It doesn't know the answer, so it deflects.",
              explain:
                "It almost certainly does know — put the same question in a Q:/A: frame or give two worked examples and Paris comes out immediately. Knowledge and elicitation are different things, which is most of this module.",
            },
            {
              text: "It is broken and needs more pretraining.",
              explain:
                "More pretraining makes it better at exactly this behaviour, not worse. What changes the behaviour is post-training or a different prompt.",
            },
            {
              text: "Its safety training is causing it to avoid direct answers.",
              explain:
                "A base model has no safety training at all — that arrives in Modules 2.2 and 2.3. This is one of the clearest ways to see that refusal and helpfulness are both installed later.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              In janus&apos;s vocabulary, what is the difference between the
              simulator and a simulacrum?
            </>
          ),
          choices: [
            {
              text: "The simulator is the model — goalless laws of motion for text; a simulacrum is a transient character it instantiates and runs.",
              correct: true,
              explain:
                "The physics-engine analogy is the useful one: the engine has no preferences, the objects it simulates appear to. Simulacra can be swapped mid-paragraph, which is exactly the drift you see in the widget.",
            },
            {
              text: "The simulator is the base model; a simulacrum is the same model after RLHF.",
              explain:
                "Close but importantly wrong. RLHF doesn't create a simulacrum — the Assistant character was already in the base distribution. RLHF makes one simulacrum the overwhelming default and makes it stable.",
            },
            {
              text: "The simulator is the sampling loop; a simulacrum is a single sampled token.",
              explain:
                "Both terms are about characters and dynamics, not about decoding mechanics. Temperature and top-p are real and important, but they're a different level of description.",
            },
            {
              text: "The simulator is the training process; a simulacrum is the trained model.",
              explain:
                "Both terms describe the trained artefact at inference time. The training process is what produced the simulator, not the simulator itself.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              Which observation best supports the claim that post-training
              amplifies behaviour already in the base distribution rather than
              adding it?
            </>
          ),
          choices: [
            {
              text: "A well-designed few-shot prompt makes a base model behave like a competent assistant, with no weight updates.",
              correct: true,
              explain:
                "If the capability can be elicited by conditioning alone, it was present in the distribution the base model learned. Post-training's contribution is making it the default and making it robust — which is real and valuable, but different from creating it.",
            },
            {
              text: "Assistants produce more diverse text than base models.",
              explain:
                "The opposite is observed: post-trained models show mode collapse — less diversity at the same temperature. That's evidence for sharpening, but you have the direction backwards.",
            },
            {
              text: "Assistants have a larger vocabulary than base models.",
              explain:
                "The tokenizer and vocabulary are fixed at pretraining and unchanged by SFT or RLHF. Post-training moves probability mass around; it doesn't add tokens.",
            },
            {
              text: "Base models refuse harmful requests less often than assistants.",
              explain:
                "True, but it's consistent with either story — it doesn't distinguish 'amplified an existing character' from 'installed something new'. The few-shot elicitation result is what discriminates.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              Why does deduplication improve a model, beyond just saving compute?
            </>
          ),
          choices: [
            {
              text: "A duplicated document receives proportionally more gradient signal, which buys memorised boilerplate instead of general language ability.",
              correct: true,
              explain:
                "Training weights each occurrence equally, so a page repeated 10,000 times is 10,000 times the pressure to memorise it verbatim. Removing duplicates measurably improves models at fixed compute, and cuts verbatim-memorisation risk with it.",
            },
            {
              text: "Duplicate documents are usually low quality, so removing them is a quality filter.",
              explain:
                "There's some correlation, but the causal story is about gradient weighting, not quality. Highly duplicated text includes plenty of perfectly good writing — licences, syndicated journalism, canonical code.",
            },
            {
              text: "Duplicates cause numerical instability in the optimiser.",
              explain:
                "Nothing about repeated inputs destabilises Adam. Loss spikes in real runs come from other sources, and the standard fix is skipping the batch, not deduplication.",
            },
            {
              text: "Duplicates inflate the validation loss, making the model look worse than it is.",
              explain:
                "Train/test contamination from duplicates makes validation loss look *better*, not worse — which is a real reason to dedup across the split, but not the main training-side argument.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              You prompt a base model with a Q&amp;A pair and it answers, then
              starts writing the user&apos;s next question itself. The right fix
              is:
            </>
          ),
          choices: [
            {
              text: "A stop sequence — the model is completing a transcript, and transcripts contain both speakers.",
              correct: true,
              explain:
                "The behaviour is correct given the genre; you just want to cut the completion off. Teaching the model to stop on its own is precisely one of the things SFT installs, via an end-of-turn token trained into the chat template.",
            },
            {
              text: "Add 'do not write the human's turn' to the prompt.",
              explain:
                "Sometimes helps a little, but it's fighting the genre with a description instead of with structure. A base model treats your instruction as more text to model, not as a command — that asymmetry is the whole point of instruction tuning.",
            },
            {
              text: "Lower the temperature to 0.",
              explain:
                "Greedy decoding doesn't change which continuation is most likely — it makes the model commit to it harder. It will write the human's turn more confidently.",
            },
            {
              text: "Use a longer context window.",
              explain:
                "Context length isn't the constraint here; the model is doing exactly the right thing with the context it has. This is a stopping-criterion problem.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              A colleague says: &ldquo;Filtering pretraining data is just
              engineering hygiene, it has no bearing on model values.&rdquo; The
              strongest rebuttal is:
            </>
          ),
          choices: [
            {
              text: "Quality filters are trained or written by example, so they encode a definition of good text — and topic-adjacent content gets removed as collateral, shaping what the model is fluent and skittish about.",
              correct: true,
              explain:
                "Adult-content and blocklist filters famously strip sex education and community sites along with the junk. The resulting behaviour then gets misattributed to safety training, when its origin was an unlogged data decision.",
            },
            {
              text: "Filtering reduces the token count, and lower D means higher loss.",
              explain:
                "True but off-target, and FineWeb-Edu is the counterexample: filtering to 1.3T tokens beat the unfiltered 15T on knowledge benchmarks. The values argument is about what's kept, not how much.",
            },
            {
              text: "Filters are applied after tokenization, so they interact with the vocabulary.",
              explain:
                "Filtering happens on text, before tokenization. And even if it didn't, this would be a mechanical point, not an argument about values.",
            },
            {
              text: "Labs publish their mixture weights, so anyone can check the values encoded.",
              explain:
                "Factually wrong for frontier models — mixture weights are among the most closely held numbers in the field, which makes the auditing problem worse, not better.",
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
          One blog post that changes how you see the object, one paper that
          established what it can do, and two data documents to read like an
          auditor.
        </p>
      ),
      readings: [
        {
          title: "Simulators",
          authors: "janus",
          year: 2022,
          url: "https://www.lesswrong.com/posts/vJFdjigzmcXMhNTsx/simulators",
          kind: "blog",
          time: "1.5h",
          essential: true,
          note: "Long, and the middle wanders. Read the opening framing and the sections defining simulator vs simulacrum carefully, then skim the speculative material on agency — hold that part loosely. The value is the vocabulary: after this you will find yourself asking 'which character is generating this text?' about every model output, which is the right question.",
        },
        {
          title: "Language Models are Few-Shot Learners (GPT-3)",
          authors: "Brown, Mann, Ryder, et al. (OpenAI)",
          year: 2020,
          url: "https://arxiv.org/abs/2005.14165",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "Read §1–2 and Figure 1.2. The paper is 75 pages and most of it is benchmark tables you can skip. What you want: the zero/one/few-shot framing, the observation that in-context learning improves with scale, and §5 on limitations, which reads as an unusually honest account of what the base-model paradigm couldn't do.",
        },
        {
          title: "The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale",
          authors: "Penedo, Kydlíček, Ben Allal, et al. (HuggingFace)",
          year: 2024,
          url: "https://arxiv.org/abs/2406.17557",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The most transparent account of a modern pretraining pipeline that exists. Read the filtering and deduplication sections and pay attention to the ablations — each filter is justified by a measured effect on downstream performance, which is a standard almost nothing else in this literature meets. The interactive blog version at huggingface.co is the nicer read.",
        },
        {
          title: "The Pile: An 800GB Dataset of Diverse Text for Language Modeling",
          authors: "Gao, Biderman, Black, et al. (EleutherAI)",
          year: 2021,
          url: "https://arxiv.org/abs/2101.00027",
          kind: "paper",
          time: "30 min (skim)",
          note: "Skim §2–3 for the component list and the weights. Read it as a historical document and a contrast: 825 GiB was a large open corpus in 2020 and is ~1.5% of FineWeb today. The per-component documentation is the part to imitate if you ever build a dataset.",
        },
        {
          title: "Scaling Language Models: Methods, Analysis & Insights from Training Gopher",
          authors: "Rae, Borgeaud, Cai, et al. (DeepMind)",
          year: 2021,
          url: "https://arxiv.org/abs/2112.11446",
          kind: "paper",
          time: "45 min (targeted)",
          note: "Do not read this cover to cover — it is 120 pages. Read §A (the MassiveText pipeline) for a frontier lab's own description of quality filtering, deduplication, and mixture weights, written before such details stopped being published. Then compare it against FineWeb and notice how much the field's transparency norms have moved in both directions.",
        },
        {
          title: "State of GPT",
          authors: "Andrej Karpathy",
          year: 2023,
          url: "https://www.youtube.com/watch?v=bZQun8Y4L2A",
          kind: "video",
          time: "45 min",
          note: "The clearest 45-minute map of the whole pipeline — pretraining, SFT, reward modelling, RL — and the natural bridge into Modules 2.2 and 2.3. Watch the first half now for the base-model section, then rewatch the second half after Module 2.3 and see how much more of it lands.",
        },
      ],
    },
  ],
};

export default mod;
