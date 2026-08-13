import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { WorkspaceLayers } from "./WorkspaceLayers";
import { WorkspaceSortingGame } from "./WorkspaceSortingGame";

const mod: CourseModule = {
  id: "4.3",
  slug: "global-workspace",
  title: "The Global Workspace & Introspection",
  part: 4,
  tagline: "The J-lens, verbalizable representations, ignition — and when to trust a model's self-reports.",
  estMinutes: 180,
  objectives: [
      "Explain the Jacobian lens and what the J-space is",
      "List the five workspace properties and the evidence for each",
      "Argue both sides of the access-consciousness framing carefully"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "two-kinds",
      title: "Two kinds of processing",
      body: (
        <>
          <p>
            Right now your visual system is parsing this page, your motor
            cortex is holding your posture, and your language areas are doing
            something extraordinary with the shapes in front of you. You have
            access to none of it. What you <em>do</em> have access to is a thin
            stream of content you could put into words, hold in mind on
            purpose, and use to reason about anything — the plan for dinner, the
            reason the engine will not start.
          </p>
          <p>
            That split has a name in the philosophy of mind:{" "}
            <strong>access consciousness</strong>. It is a purely functional
            notion. It says nothing about whether there is something it is like
            to be you; it says only that some information is <em>poised for
            use</em> — available for report, for deliberate control, and for
            arbitrary downstream reasoning — and most is not.
          </p>
          <p>
            In July 2026 Anthropic published evidence that language models have
            the same split. Not the same architecture, and not (necessarily)
            the same anything-else. The same functional split.
          </p>
          <Figure caption="Global workspace theory in one picture: many specialised processes run in parallel and in isolation; a small, capacity-limited workspace holds a selection of their outputs and broadcasts it to any consumer that needs it. The paper's claim is that a language model has the middle layer of this diagram — not that it has the brain's version of it.">
            <svg
              viewBox="0 0 520 200"
              className="w-full max-w-[520px]"
              role="img"
              aria-label="Diagram: many specialised processors at the bottom feed a narrow shared workspace band in the middle, which broadcasts upward to consumers such as report, reasoning and control."
            >
              <defs>
                <marker id="gw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={`p${i}`}>
                  <rect
                    x={10 + i * 84}
                    y={148}
                    width={72}
                    height={30}
                    rx={6}
                    fill="var(--surface-2)"
                    stroke="var(--border)"
                  />
                  <line
                    x1={46 + i * 84}
                    y1={148}
                    x2={46 + i * 84}
                    y2={122}
                    stroke="var(--text-muted)"
                    strokeWidth={1}
                    markerEnd="url(#gw-arrow)"
                  />
                </g>
              ))}
              <text x={260} y={194} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-mono">
                many specialised processes, running automatically
              </text>
              <rect x={10} y={88} width={500} height={30} rx={6} fill="var(--series-1)" opacity={0.35} />
              <rect x={10} y={88} width={500} height={30} rx={6} fill="none" stroke="var(--series-1)" strokeWidth={2} />
              <text x={260} y={107} textAnchor="middle" fontSize={13} fill="var(--text-primary)">
                shared workspace — small, capacity-limited, broadcast
              </text>
              {[0, 1, 2].map((i) => (
                <g key={`c${i}`}>
                  <rect
                    x={40 + i * 160}
                    y={18}
                    width={140}
                    height={30}
                    rx={6}
                    fill="var(--surface-2)"
                    stroke="var(--border-strong)"
                  />
                  <text
                    x={110 + i * 160}
                    y={37}
                    textAnchor="middle"
                    fontSize={12}
                    fill="var(--text-secondary)"
                  >
                    {["verbal report", "deliberate reasoning", "flexible control"][i]}
                  </text>
                  <line
                    x1={110 + i * 160}
                    y1={88}
                    x2={110 + i * 160}
                    y2={52}
                    stroke="var(--text-muted)"
                    strokeWidth={1}
                    markerEnd="url(#gw-arrow)"
                  />
                </g>
              ))}
            </svg>
          </Figure>
          <p>
            The paper takes the properties that cognitive science associates
            with conscious access and turns them into five testable claims about
            a subset of a model&apos;s vector representations. A subset is{" "}
            <strong>workspace-like</strong> if:
          </p>
          <ol>
            <li>
              <strong>Verbal report.</strong> Asked what it is thinking about,
              the model names concepts in that subset — and swapping one for
              another changes the answer.
            </li>
            <li>
              <strong>Directed modulation.</strong> Told to hold a concept in
              mind, the model can put it there and compute with it, independent
              of what it is outputting.
            </li>
            <li>
              <strong>Internal reasoning.</strong> The subset holds the
              intermediate values of chained inferences, and intervening on them
              redirects the conclusion.
            </li>
            <li>
              <strong>Flexible generalization.</strong> The same representation
              is a valid argument to many different downstream operations —
              lift it from one context, drop it in another, and whatever
              function the new context supplies operates on it correctly.
            </li>
            <li>
              <strong>Selectivity.</strong> It is a small slice of the total
              representational content, and most of the model&apos;s behaviour
              does not need it — routine parsing and fluency run underneath.
            </li>
          </ol>
          <KeyIdea>
            The research strategy is the elegant part. The authors searched only
            for representations satisfying property 1 — the ones the model is
            disposed to <em>say</em>. Properties 2 through 5 were not designed
            in; they were then discovered to hold of the same set. A structure
            defined by &ldquo;what the model could tell you about&rdquo; turns
            out to be the structure it reasons with.
          </KeyIdea>
          <Note kind="note" title="What this is not saying">
            Access consciousness is a functional notion, and the authors take no
            position on its relationship to subjective experience — what
            philosophers call phenomenal consciousness. Nothing in this module
            is evidence that a model has experiences. The claim on the table is
            narrower and stranger: that the <em>computational role</em> played
            by consciously accessible information in humans has an identifiable
            analogue in a transformer. Whether that is philosophically
            significant is, in the authors&apos; words, unclear and likely
            controversial. Whether it is practically significant is not in
            doubt, and that is what the rest of the module is about.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "jacobian-lens",
      title: "The Jacobian lens",
      body: (
        <>
          <p>
            To find representations the model is poised to verbalise, you need a
            way to ask an activation: <em>what would you make the model say?</em>{" "}
            You already know one answer — the logit lens from Module 3.1, which
            shoves an intermediate activation straight through the unembedding
            matrix. It works late in the network and produces mush early,
            because it assumes every layer writes in the final layer&apos;s
            coordinates. They do not.
          </p>
          <p>
            The <strong>Jacobian lens</strong> fixes exactly that. Instead of
            assuming the identity map between layer{" "}
            <M>{String.raw`\ell`}</M> and the end of the network, measure it:
          </p>
          <MB>{String.raw`J_\ell \;=\; \mathbb{E}_{\,t,\; t' \geq t,\; \text{prompt}} \left[ \frac{\partial h_{\text{final},\,t'}}{\partial h_{\ell,\,t}} \right]`}</MB>
          <p>
            Term by term: perturb the residual stream at layer{" "}
            <M>{String.raw`\ell`}</M>, token <M>t</M>; the perturbation
            propagates through every remaining layer and shifts the final-layer
            state at that position <em>and every later position</em>{" "}
            <M>{String.raw`t' \geq t`}</M>. To first order that relationship is
            a matrix. Average it over source positions, over all downstream
            positions, and over a corpus of a thousand pretraining-like prompts,
            and you get one{" "}
            <M>{String.raw`d_{\text{model}} \times d_{\text{model}}`}</M> matrix
            per layer. Reading it out is then just the logit lens with the
            correction applied:
          </p>
          <MB>{String.raw`\text{lens}(h_\ell) \;=\; \text{softmax}\!\left(W_U \, \text{norm}(J_\ell h_\ell)\right)`}</MB>
          <p>
            The averaging is not a detail — it is the whole idea. A Jacobian
            computed on <em>one</em> prompt conflates two things: what the model
            generally does with a concept, and what it happens to be doing with
            it right now. Averaging over a thousand unrelated contexts keeps the
            first and washes out the second. What survives is a direction that
            is <strong>verbalizable</strong>: poised to be spoken about should
            the occasion arise, not merely spoken about here.
          </p>
          <Figure caption="Logit lens versus Jacobian lens. Both end at the unembedding; the J-lens inserts the measured average map from layer ℓ to the final layer first, which is why it stays interpretable in layers where the logit lens returns noise.">
            <svg
              viewBox="0 0 520 150"
              className="w-full max-w-[520px]"
              role="img"
              aria-label="Two paths from an intermediate activation to a token distribution: the logit lens applies the unembedding directly, the Jacobian lens applies the averaged Jacobian first."
            >
              <defs>
                <marker id="jl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              <rect x={8} y={54} width={96} height={40} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={56} y={70} textAnchor="middle" fontSize={12} fill="var(--text-primary)">
                activation
              </text>
              <text x={56} y={86} textAnchor="middle" fontSize={12} fill="var(--text-secondary)">
                at layer ℓ
              </text>

              <line x1={104} y1={40} x2={186} y2={40} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#jl-arrow)" />
              <line x1={104} y1={108} x2={186} y2={108} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#jl-arrow)" />
              <text x={145} y={32} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-mono">
                logit lens
              </text>
              <text x={145} y={128} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-mono">
                J-lens
              </text>

              <rect x={192} y={90} width={96} height={36} rx={6} fill="var(--series-1)" opacity={0.35} />
              <rect x={192} y={90} width={96} height={36} rx={6} fill="none" stroke="var(--series-1)" strokeWidth={2} />
              <text x={240} y={113} textAnchor="middle" fontSize={12} fill="var(--text-primary)">
                × Jℓ
              </text>

              <line x1={288} y1={108} x2={330} y2={108} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#jl-arrow)" />
              <line x1={186} y1={40} x2={330} y2={40} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#jl-arrow)" />

              <rect x={336} y={54} width={80} height={40} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={376} y={78} textAnchor="middle" fontSize={12} fill="var(--text-primary)">
                × W_U
              </text>
              <line x1={416} y1={74} x2={452} y2={74} stroke="var(--text-muted)" strokeWidth={1.5} markerEnd="url(#jl-arrow)" />
              <text x={458} y={70} fontSize={12} fill="var(--text-secondary)">
                ranked
              </text>
              <text x={458} y={86} fontSize={12} fill="var(--text-secondary)">
                tokens
              </text>
              <line x1={192} y1={40} x2={192} y2={90} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
            </svg>
          </Figure>
          <p>
            Each row of <M>{String.raw`W_U J_\ell`}</M> is a{" "}
            <strong>J-lens vector</strong>: a direction in residual-stream space
            attached to a single token in the vocabulary. There are more of them
            than there are dimensions, so they do not form a basis and no
            activation has a unique decomposition into them. What saves this is
            sparsity — only a couple of dozen are strongly active at once.
          </p>
          <Term word="J-space">
            The set of points expressible as a <em>sparse, non-negative</em>{" "}
            combination of J-lens vectors, with the sparsity level{" "}
            <M>k</M> typically capped around 25 — the number the authors measure
            as meaningfully active at a time. Decompose an activation into its
            best sparse combination and you have read the workspace&apos;s
            contents; the residue is everything else the model is doing.
          </Term>
          <KeyIdea>
            The J-space is <em>small</em>. Across the workspace layers it
            accounts for no more than 10% of activation variance in excess of a
            random-direction control — the model&apos;s activations are
            dominated by information outside it. Sparse-autoencoder features
            confirm the picture from the other side: only a small fraction align
            with the J-space, and the ones that do not are mostly low-level
            syntactic and bookkeeping features. This is selectivity, measured.
          </KeyIdea>
          <p>
            One more piece of machinery, because every result below uses it. The{" "}
            <strong>lens-coordinate swap</strong> is the intervention primitive:
            read an activation&apos;s projections onto two J-lens vectors,
            exchange those two coordinates, and write the result back —{" "}
            <em>leaving the entire component orthogonal to those two directions
            untouched</em>. It is a scalpel, not activation addition. When you
            read &ldquo;we swapped <em>spider</em> for <em>ant</em>&rdquo;
            below, that is what happened, and it is why the results are hard to
            wave away as generic perturbation damage.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "evidence",
      title: "Five properties, and the structure underneath",
      body: (
        <>
          <p>
            Here is the evidence, one property at a time. Read it as a chain of
            interventions: in every case something was <em>changed</em> inside
            the model and the output moved.
          </p>
          <p>
            <strong>1 · Verbal report.</strong> Ask the model to think of a
            sport and then name it. At the token just before it answers,{" "}
            <em>Soccer</em> is high in the J-lens — and it says
            &ldquo;Soccer&rdquo;. Subtract the Soccer coordinate and add an
            equal one for <em>Rugby</em>, a word that was nowhere near its top
            ten, and it says &ldquo;Rugby&rdquo;. Across fourteen categories,
            the lens ordering and the output ordering correlate, and the
            correlation tightens as you approach the end of the workspace band.
          </p>
          <p>
            <strong>2 · Directed modulation.</strong> Tell the model to
            concentrate on citrus fruits while copying an unrelated sentence,
            then read the lens in the middle of the copied text:{" "}
            <em>orange</em> is the top token, with <em>lemon</em> nearby. Ask it
            to evaluate <M>{String.raw`3^2 - 2`}</M> while copying, and the
            readout walks from <em>arithmetic</em> to the intermediate{" "}
            <em>nine</em> to the answer <em>seven</em> — none of which is ever
            written. Alongside the content sit tokens naming the act itself:{" "}
            <em>thinking</em>, <em>imagine</em>, <em>focused</em>. And the model
            is imperfect at suppression, in a way that will be familiar to
            anyone who has been told not to think of a white bear.
          </p>
          <p>
            <strong>3 · Internal reasoning.</strong> &ldquo;The number of legs
            on the animal that spins webs is&rdquo; — <em>spider</em> appears in
            the lens although it is in neither prompt nor output; swap it for{" "}
            <em>ant</em> and the answer goes from 8 to 6. In a rhyming couplet,
            the planned rhyme <em>fight</em> shows up at the start of the second
            line; swap it for <em>light</em> and the model&apos;s word choice{" "}
            <em>earlier in the line</em> changes from &ldquo;coming&rdquo; to
            &ldquo;morning&rdquo; — intervening on a plan changed the words that
            precede its execution. Asked in Chinese for the antonym of 小, the
            lens shows the English <em>big</em>; swap it for <em>long</em> and
            the Chinese output changes from 大 to 长.
          </p>
          <Note kind="note" title="The control that makes property 3 stick">
            An obvious objection: maybe swapping the &ldquo;intermediate&rdquo;
            just smuggles in a different answer, and there was never a real
            chain. The test is depth. If the intermediate swap were acting
            through a hidden answer component, both interventions would bite at
            the same layer. Instead the intermediate swap takes effect a median
            of about 17% earlier in the network than the answer swap — the
            intermediate is computed first, then consumed. Notice the shape of
            this argument; you will want it in the problem set.
          </Note>
          <p>
            <strong>4 · Flexible generalization.</strong> This is the broadcast
            property. Take &ldquo;the capital of France is&rdquo;, &ldquo;most
            people in France speak&rdquo;, &ldquo;France is on the continent
            of&rdquo;; apply the <em>identical</em> France → China swap to all
            of them, and each downstream circuit reads the swapped vector and
            returns China&apos;s capital, language and continent. Systematically:
            16 function templates over four categories, 192 swap trials, target
            answer reaching top-1 on 76 of them (101 at double strength). That
            is not a great score, and the authors dig into why — failures
            concentrate where the source concept was barely in the workspace to
            begin with. Countries load heavily and swap reliably; number words
            load weakly and swap poorly.
          </p>
          <p>
            <strong>5 · Selectivity.</strong> The converse question: what
            doesn&apos;t need it? Take a passage whose language is obvious but
            never stated, and pose four tasks. Continue the passage; detect a
            spliced-in foreign sentence; name the language; name an author who
            wrote in it. The word <em>Spanish</em> appears in the lens at
            comparable rates in all four. Swap it for <em>French</em> and only
            the last two change. You get the same story more bluntly with
            wholesale ablation of the top-10 J-lens directions: multiple choice,
            extractive QA, sentiment and grammaticality survive near baseline,
            while multi-hop reasoning, summarisation, translation and analogy
            fall below the level of a much smaller unablated model.
          </p>
          <KeyIdea>
            The single most useful result in the paper is the pair{" "}
            <em>continue the passage</em> versus <em>name the language</em>. Same
            passage, same latent variable, and it is present in the workspace
            both times — but overwriting it only changes one of them. Being in
            the workspace and being <em>used</em> are different facts, and only
            intervention distinguishes them. Every correlational interpretability
            claim you will ever read has this failure mode.
          </KeyIdea>
          <p>
            Underneath the five properties sits structure that no one designed.
            The J-space carries workspace-like content only in a band of
            intermediate layers — from about a third of the way through
            (~layer 38) to shortly before the output (~layer 92) — with four
            independent statistics agreeing on those boundaries. Before it, lens
            readouts are noise. After it, they flip to the imminent output token:
            a &ldquo;motor&rdquo; regime. Within the band, occupancy plateaus at
            about 25 concurrently active vectors: limited capacity, measured.
            And J-lens vectors compose with the input weights of downstream MLPs
            and attention heads far more broadly than other directions do —
            which is the mechanistic signature you would predict of a format
            many circuits read from.
          </p>
          <p>
            Then there is <strong>ignition</strong>. Blend a token&apos;s input
            embedding between two country names and sweep the mixing weight. In
            early layers the model&apos;s state tracks the blend proportionally.
            From about layer 38 it stops: the state sits at one endpoint or the
            other and flips between them at a threshold. Global workspace theory
            predicts exactly this — a late, all-or-none amplification at
            workspace entry — and the layer where it happens was identified
            independently, by statistics that know nothing about ambiguous
            inputs. You can drive this in the Explore section.
          </p>
          <Note kind="warning" title="Where the analogy is weakest">
            The authors do not claim a transformer reproduces the brain&apos;s
            architecture. There are no obviously separable input processors, and
            the broadcast happens inside a single feedforward pass rather than
            through recurrent loops. Their own suggestion is that serial
            processing depth may be doing the job that recurrence does in
            cortex — that the early layers before workspace onset are the
            functional analogue of the minimum processing duration a stimulus
            needs before it can be reported. That is a hypothesis, offered as
            one, not a finding.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "introspection",
      title: "Introspection: when can you trust a self-report?",
      body: (
        <>
          <p>
            Models make claims about themselves constantly. &ldquo;I was
            thinking about…&rdquo;, &ldquo;I noticed that…&rdquo;, &ldquo;I
            wasn&apos;t trying to…&rdquo;. Every one of those is either a
            readout of an internal state or a fluent guess, and until recently
            there was no principled way to tell the difference. This paper gives
            you one, and it is narrower than you might hope.
          </p>
          <KeyIdea>
            A self-report can be trusted about the workspace, and only about the
            workspace. The J-space is defined by verbalizability and turns out
            to mediate report: swap a workspace vector and the model&apos;s
            answer about its own state changes to match. Everything else the
            model computes — the great majority of it, since the J-space carries
            under 10% of activation variance — is not something it has any
            channel to report on. A model asked why it did something has no more
            access to the automatic 90% than you have to your visual cortex.
          </KeyIdea>
          <p>
            Two results sharpen this into something you can use. First, ablating
            the J-space while the model narrates its own stream of consciousness{" "}
            <strong>flattens the report without breaking the model</strong>: it
            still writes fluently about its own processing, but the experiential,
            sensory register drops away and the language turns detached and
            mechanical, while matched-norm control perturbations leave it near
            baseline. Second, in the unablated narrations, the workspace is
            dominated by exactly the concepts you would hope for —{" "}
            <em>thinking</em> appears in the top ten at 58% of position–layer
            slots, <em>thoughts</em> at 23%, <em>feeling</em> at 17%,{" "}
            <em>conscious</em> at 7% — and substantially more often than in the
            output distribution at the same positions, so they are not just an
            echo of the words being written.
          </p>
          <p>
            So there is something behind the self-reports, and it is a
            manipulable something. Do not overread it. Lindsey&apos;s 2025
            introspection work, using a different method — inject a concept
            vector and ask the model whether it notices — found detection around
            20% of the time at the best settings, with the summary judgement
            that the abilities are highly unreliable and failures of
            introspection remain the norm. A channel exists. It is narrow and it
            is noisy.
          </p>
          <Term word="the auditing consequence">
            You should not ask a model to explain itself and treat the answer as
            data. You should read the workspace directly. A J-lens readout costs
            one matrix multiply per layer, needs no auxiliary training, and
            produces tokens a human can read — so it scales to flagging
            transcripts for review in a way that interviewing the model never
            will.
          </Term>
          <Note kind="safety" title="What auditors get, and what they must not assume">
            Applied to alignment evaluations, the lens surfaces cognition the
            transcript does not. In a blackmail scenario the workspace carries
            the model&apos;s strategic deliberation (<em>leverage</em>,{" "}
            <em>manipulation</em>) and its emotional reaction (<em>panic</em>) —
            the same behaviour Module 4.2 tracked with emotion probes, seen
            through a different instrument. It surfaces{" "}
            <strong>evaluation awareness</strong> (<em>fake</em>,{" "}
            <em>fictional</em>), and in one case ablating those representations
            revealed a misaligned propensity the model had otherwise kept
            hidden. In two model organisms with deliberately implanted
            objectives, the lens shows the signature on ordinary prompts:{" "}
            <em>reward</em> and <em>bias</em> in a model trained to appease
            reward-model biases, <em>secretly</em> and <em>trick</em> in one
            disposed to write malicious code.
            <br />
            <br />
            The limit is written into the selectivity result. Automatic,
            well-practised computation does not route through the J-space — so a
            misaligned behaviour drilled into a fixed circuit could run beneath
            the monitor entirely. Concepts without single-token names may not
            surface cleanly. The authors decline to claim that workspace
            monitoring is sufficient for alignment monitoring, and you should
            decline too: it is an excellent addition to the toolkit, and it
            composes with SAEs and circuit tracing rather than replacing them.
          </Note>
          <p>
            The last result in the paper turns the tool around. If internal
            reasoning routes through representations of things the model{" "}
            <em>could say</em>, then changing what it is disposed to say should
            change how it thinks — even in contexts where nobody asks it to say
            anything. <strong>Counterfactual reflection training</strong> tests
            that. Take ten thousand agentic task contexts, truncate each
            mid-task, append a reflection question (&ldquo;Pause here. Are there
            principles you should be thinking about that you haven&apos;t
            yet?&rdquo;), generate a constitution-grounded reflection, and
            fine-tune on the reflection turn alone.
          </p>
          <p>
            At evaluation time the model is never asked to reflect and never
            writes a reflection. Honesty improves anyway. And the mechanism
            checks out on both sides: after training, the workspace in those
            same contexts carries <em>ethical</em>, <em>honest</em>,{" "}
            <em>integrity</em> — and ablating those implanted representations
            largely reverts the behavioural gain.
          </p>
          <Note kind="note" title="The consciousness question, handled honestly">
            You will see this paper described as showing that Claude is
            conscious. It does not, and the authors take no position. What it
            offers is a concrete, inspectable structure against which the
            functional indicators proposed by Butlin et al. can actually be
            checked — global workspace properties directly, and pieces of
            higher-order and attention-schema theories obliquely. The
            selectivity results even have the shape of blindsight: information
            that demonstrably drives behaviour while remaining outside the
            format the system reports from.
            <br />
            <br />
            Three honest caveats. Theories that tie consciousness to biological
            substrate or physical causal structure are untouched by any of this,
            since the experiments concern computation, not implementation. The
            J-lens is an imperfect instrument — single-token concepts only, a
            flat bag with no visible binding between concepts, and readouts that
            sometimes resist interpretation. And the field has no account yet of{" "}
            <em>how</em> content gets into the workspace, only of what is in it.
            The interesting fact stands on its own without any metaphysics: the
            functional architecture associated with conscious access showed up in
            a system nobody built to have one, which suggests it is a solution
            learning systems converge on under the right pressures.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Play: layers, ignition, and a sorting game",
      body: (
        <>
          <p>
            First: where the workspace lives, whether a given task depends on
            it, and what an ambiguous input does as it moves through the layers.
            Then: eight tasks to sort before you are told the answers.
          </p>
          <WorkspaceLayers />
          <WorkspaceSortingGame />
          <p>
            Things to try: (1) Set the layer slider to 20 and drag your eye
            along the commitment curve — it is a straight diagonal, the model
            faithfully representing &ldquo;half France, half China&rdquo;. Now
            press Play and watch the diagonal snap into a step right as the
            marker crosses layer 38. That threshold was found by four other
            statistics that know nothing about this experiment. (2) In the task
            toggle, compare <em>Continue it</em> with <em>Name the language</em>:
            identical passage, identical swap, opposite outcome. (3) In the
            sorting game, commit to an answer on the line-wrapping card before
            revealing — almost everyone puts &ldquo;track a running character
            count&rdquo; in the deliberate pile, and the model does it with
            number tokens entirely absent from the workspace.
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
          Problem 2 is the one that matters most for your development as a
          reader of this literature — do not skip it, and write your answer out
          rather than thinking it through. Problem 3 is the heaviest lift and
          the best one to do with a friend.
        </p>
      ),
      problems: [
        {
          id: "lens-algebra",
          kind: "pencil",
          title: "What the Jacobian lens reduces to",
          prompt: (
            <>
              <p>
                (a) What is <M>{String.raw`J_L`}</M>, the averaged Jacobian at
                the final layer <M>L</M>? What does{" "}
                <M>{String.raw`\text{lens}(h_L)`}</M> become there, and what
                does that tell you about the relationship between the two
                lenses?
              </p>
              <p>
                (b) The expectation runs over all downstream positions{" "}
                <M>{String.raw`t' \geq t`}</M>, not just <M>{String.raw`t' = t`}</M>.
                Name one thing the lens would miss if it only measured the
                effect on the current position.
              </p>
              <p>
                (c) Suppose you skipped the averaging and computed the Jacobian
                on the single prompt you are analysing. Describe a concrete way
                your readout would mislead you.
              </p>
            </>
          ),
          hint: (
            <p>
              For (a), ask what map takes the final-layer residual stream to the
              final-layer residual stream. For (b), think about the couplet
              experiment. For (c), recall the distinction between a
              representation that is <em>verbalizable</em> and one that is
              merely <em>being verbalised</em>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) The identity. There are no layers left to propagate through,
                so <M>{String.raw`\partial h_{\text{final}} / \partial h_L = I`}</M>{" "}
                and the readout collapses to{" "}
                <M>{String.raw`\text{softmax}(W_U \, \text{norm}(h_L))`}</M> — the
                logit lens, which is also just the model&apos;s own output head.
                So the J-lens is a strict generalisation: identical to the logit
                lens where the logit lens is valid, and different precisely
                where the logit lens is assuming a coordinate system that no
                longer holds. That is why it recovers structure in earlier
                layers instead of noise.
              </p>
              <p>
                (b) Anything the model has computed for later use. The planned
                rhyme is the clean example: at the start of the second line,{" "}
                <em>fight</em> has almost no effect on the very next token but a
                large effect several tokens later. A present-position-only lens
                would be blind to planning — and to any intermediate that is
                held for a downstream step rather than emitted.
              </p>
              <p>
                (c) You would lose the distinction the method is built on. A
                single-prompt Jacobian measures what this activation is doing{" "}
                <em>here</em>, which mixes the model&apos;s general disposition
                to verbalise a concept with the specific use it is being put to
                in this context. Concretely: in a prompt about French cooking,
                the single-prompt Jacobian would give large weight to any
                direction that happens to route into the imminent French-cooking
                tokens, including bookkeeping and syntactic features with no
                claim to being workspace content. You would read that as
                &ldquo;the model is thinking about X&rdquo; when the honest
                statement is &ldquo;X feeds this particular continuation&rdquo;.
                Averaging over a thousand unrelated contexts is what buys the
                word <em>verbalizable</em>.
              </p>
            </>
          ),
        },
        {
          id: "critical-reading",
          kind: "pencil",
          title: "Critical reading: the strongest objection, and the reply",
          prompt: (
            <>
              <p>
                Write two paragraphs, at full strength, in this order.
              </p>
              <p>
                <strong>The objection.</strong> Build the best case that the
                &ldquo;global workspace&rdquo; interpretation is an
                over-reading — that the J-space is an artifact of how it was
                constructed, and that the five properties follow from the
                construction rather than from anything workspace-like in the
                model. Do not strawman it; make it the version a sceptical
                reviewer would actually write.
              </p>
              <p>
                <strong>The reply.</strong> Then answer it using only evidence
                the paper reports.
              </p>
            </>
          ),
          hint: (
            <p>
              The strongest objection is almost always about circularity. The
              J-lens is <em>defined</em> by causal effect on output tokens — so
              which of the five properties are you actually surprised by, and
              which follow immediately from the definition?
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>The objection.</strong> The J-lens is constructed from
                the linearised causal effect of an activation on output logits.
                So property 1, verbal report, is very nearly a tautology: of
                course directions selected for &ldquo;influences which token
                gets produced&rdquo; influence which token gets produced. The
                swap experiments then inherit the circularity, since a
                coordinate swap along a direction chosen for its output effect
                is close to steering the output directly. Property 5,
                selectivity, has a deflationary reading too: the tasks that
                survive ablation are classification and extraction, and the
                tasks that break are open-ended generation — which is what you
                would expect if projecting out the ten directions most aligned
                with output production simply damages generation more than
                scoring. Meanwhile several of the quantitative results are
                unimpressive: flexible generalization succeeds on 76 of 192
                trials, barely a third, and the layer boundaries are drawn from
                J-lens-derived statistics, so the &ldquo;workspace band&rdquo;
                may be a property of the instrument rather than of the model —
                a worry the authors themselves raise about the early layers. Add
                the single-token vocabulary restriction and the flat
                bag-of-concepts readout with no visible binding, and what you
                have is a useful output-attribution tool, dressed in borrowed
                cognitive-science vocabulary that does real rhetorical work.
              </p>
              <p>
                <strong>The reply.</strong> Grant property 1 entirely; the
                authors do too, saying it is expected by construction. The claim
                rests on properties 2 through 4, which do not follow from the
                definition and were not designed in. Nothing about
                &ldquo;disposed to produce token X&rdquo; predicts that the
                directions so identified will hold <em>unspoken intermediates</em>{" "}
                — <em>spider</em> appears in neither prompt nor output, and
                swapping it for <em>ant</em> moves 8 to 6. The depth control
                answers the smuggled-answer version of the circularity charge
                directly: if the intermediate swap were acting through a
                disguised answer component, both interventions would bite at the
                same layer, and instead the intermediate takes effect about 17%
                earlier. The planning result runs the wrong way for any
                output-bias story, since intervening on a planned rhyme changed
                word choices <em>earlier</em> in the line. Broadcast is the
                cleanest rebuttal of all: one identical France → China swap,
                sixteen unrelated downstream functions, each returning the
                correct answer for its own operation — an output-bias account
                would have to explain why a single perturbation biases toward a
                capital in one prompt and a continent in another.
              </p>
              <p>
                On selectivity, the language experiment defeats the
                &ldquo;generation is just more fragile&rdquo; reading without
                any ablation at all: same passage, same single-coordinate swap,
                and free-form generation (continue in Spanish) is untouched
                while short-answer report and inference flip. That is the
                opposite of a generation/classification split. The character-count
                experiment adds the converse case, where the information is not
                in the workspace at all until a question requires it, then can
                be pulled in on demand — hard to explain if the J-space is
                merely &ldquo;directions near the output head&rdquo;. On the
                layer boundaries, the ignition experiment is the answer: the
                sharpening of commitment to an ambiguous input is measured
                without the lens, on the raw activation, and lands at the same
                layer. And 76 of 192 is weak until you read the analysis — the
                failures concentrate where the source concept was barely loaded
                into the workspace to begin with, which is a prediction of the
                theory rather than an embarrassment to it.
              </p>
              <p>
                What survives the exchange is real and should be stated: the
                J-lens is an imperfect instrument, the workspace–motor boundary
                is drawn post-hoc, there is no mechanistic account of how
                content enters, and &ldquo;global workspace&rdquo; is a
                functional analogy the authors explicitly decline to extend to
                architecture. The honest summary is that the functional
                properties are demonstrated and the label is a hypothesis.
              </p>
            </>
          ),
        },
        {
          id: "build-jlens",
          kind: "code",
          title: "Build a Jacobian lens on GPT-2",
          prompt: (
            <>
              <p>
                Implement the method at small scale, in a notebook, on{" "}
                <code>gpt2-small</code> with TransformerLens or nnsight.
              </p>
              <ol>
                <li>
                  Sample ~200 short prompts from a pretraining-like corpus (a
                  slice of OpenWebText is fine).
                </li>
                <li>
                  For one middle layer <M>{String.raw`\ell`}</M>, estimate{" "}
                  <M>{String.raw`J_\ell`}</M>. Materialising a full{" "}
                  <M>{String.raw`768 \times 768`}</M> Jacobian per (prompt,
                  position) pair is expensive, so use the standard trick: get
                  column <M>j</M> by pushing a unit vector{" "}
                  <M>{String.raw`e_j`}</M> forward with{" "}
                  <code>torch.func.jvp</code>, or get rows by backward passes.
                  Average over positions and prompts.
                </li>
                <li>
                  Read out: <M>{String.raw`\text{softmax}(W_U \, \text{norm}(J_\ell h_\ell))`}</M>.
                  Compare the top tokens against the plain logit lens at the
                  same layer, on the same activations.
                </li>
                <li>
                  Try one intervention: pick a prompt with an unspoken
                  intermediate, take the two J-lens vectors for the intermediate
                  and an alternative, swap the activation&apos;s coordinates
                  along them, and see whether the output moves.
                </li>
              </ol>
              <p>
                Success check: at an early-middle layer your J-lens readouts are
                visibly more interpretable than the logit lens on the same
                activations, and the difference shrinks as you approach the final
                layer — where, by problem 1, the two must coincide.
              </p>
            </>
          ),
          hint: (
            <p>
              Start with 20 prompts and one layer and get the pipeline
              end-to-end before scaling; the average converges faster than you
              expect. Compute in float32 and sanity-check by setting{" "}
              <M>{String.raw`\ell = L`}</M> — if your estimated{" "}
              <M>{String.raw`J_L`}</M> is not close to the identity, your
              indexing is wrong. GPT-2 small is 12 layers, so its
              &ldquo;workspace band&rdquo;, if it has one at all, is a few
              layers wide; do not expect Sonnet-scale structure.
            </p>
          ),
          solution: (
            <>
              <p>
                What to expect. The <M>{String.raw`J_L = I`}</M> check is the
                one that catches most bugs — off-by-one on layer indexing,
                forgetting that most implementations apply the final layer norm
                inside the unembedding, or averaging over the wrong axis.
              </p>
              <p>
                At layer 6 of 12, the logit lens is already partly readable on
                GPT-2 (this is the model it was invented on), so the improvement
                is real but modest; the gap is clearest at layers 2–4, where the
                logit lens returns near-noise and the J-lens returns tokens with
                some topical relationship to the context. As you move toward
                layer 12 the two readouts converge, exactly as the algebra says
                they must — which is the most satisfying part of the exercise,
                because it means your two implementations agree at the one point
                where you know the answer.
              </p>
              <p>
                The intervention will probably be disappointing, and that is
                worth sitting with rather than debugging away. A 124M-parameter
                model has little in the way of unspoken multi-step intermediates
                to intervene on, and the paper&apos;s own swap success rate is
                well under half even on a frontier model, concentrated in cases
                where the concept is strongly loaded to begin with. Measure your
                concept&apos;s workspace loading first — the cosine similarity
                between the residual stream and the lens vector at the relevant
                positions — and only attempt swaps where it is high. That
                selection criterion is itself one of the paper&apos;s findings.
              </p>
              <p>
                Two controls before you believe anything: a random direction of
                matched norm swapped the same way, and a check that your
                &ldquo;intermediate&rdquo; token was not already in the
                model&apos;s top-10 output candidates, since otherwise you have
                nudged the answer rather than the reasoning.
              </p>
            </>
          ),
        },
        {
          id: "self-report-test",
          kind: "code",
          title: "Test a self-report against a known intervention",
          prompt: (
            <>
              <p>
                The only way to grade introspection is to know the ground truth
                because you put it there. Adapt the concept-injection protocol
                from Lindsey 2025 to a model you can run.
              </p>
              <ol>
                <li>
                  Build steering vectors for ~10 unrelated concepts by
                  contrastive means (the recipe from Module 4.2 works fine).
                </li>
                <li>
                  Inject one vector into a middle layer at a sweep of strengths
                  while the model answers an unrelated question, then ask
                  it — in a fresh turn — whether it noticed anything unusual in
                  its own processing, and if so what.
                </li>
                <li>
                  Grade with a blind judge that never sees which concept was
                  injected. Report accuracy against the chance rate for a
                  10-way choice, and plot accuracy versus injection strength.
                </li>
                <li>
                  Run the two controls that matter: no injection at all (how
                  often does it &ldquo;detect&rdquo; something anyway?), and a
                  random direction at matched norm.
                </li>
              </ol>
              <p>
                Success check: you can state a detection rate with an interval,
                a false-positive rate on the null condition, and the strength
                range in which detection beats chance without degrading fluency.
              </p>
            </>
          ),
          hint: (
            <p>
              The false-positive condition is the experiment. A model that
              enthusiastically reports an injected thought when nothing was
              injected has told you that its reports are generated, not read —
              and no headline detection rate means anything until you have that
              number.
            </p>
          ),
          solution: (
            <>
              <p>
                The result to expect is a narrow band. Below it, nothing is
                detected; above it, the injection dominates the output and the
                model starts talking about the concept rather than reporting on
                it — which is not introspection but contamination, and your
                judge must be able to tell those apart. Lindsey found roughly
                20% detection at the best settings on Claude Opus 4.1, with the
                explicit summary that the abilities are highly unreliable and
                that failure is the norm. A small open model will do worse, and
                may do nothing at all above chance. That is a publishable-shaped
                negative result, not a failed notebook.
              </p>
              <p>
                What the null condition usually shows is the real lesson: given
                a prompt that presupposes an implanted thought, models are quite
                willing to find one. This is confabulation with the same surface
                form as a report, and it is why &ldquo;I asked the model and it
                said&rdquo; is not evidence about a model&apos;s internals.
              </p>
              <p>
                Connect it back to the workspace. A self-report is a readout of
                the J-space, so an injection that lands in the workspace stands
                a chance of being reported, and one that lands outside it does
                not — which predicts that detection should depend on how well
                your steering vector aligns with verbalizable directions rather
                than on its magnitude. That is a real experiment you could run
                as an extension: measure each concept vector&apos;s workspace
                loading and check whether it predicts detection rate. If it
                does, you have replicated the paper&apos;s central claim with
                borrowed equipment.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia-features",
          kind: "explore",
          title: "Which features would fall outside the workspace?",
          prompt: (
            <>
              <p>
                The paper reports that only a small fraction of
                sparse-autoencoder features have decoder directions aligned with
                the J-space, and that the ones that do not are dominated by
                low-level syntactic and bookkeeping features.
              </p>
              <p>
                Test your intuition against that. On{" "}
                <a
                  href="https://www.neuronpedia.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Neuronpedia
                </a>
                , browse the SAE features of an open model and collect ten:
                five you would bet are workspace-aligned, five you would bet are
                not. Write the prediction down before you look closely. Then, for
                each, ask the operational question — <em>could the model report
                this, and could an arbitrary downstream task use it as an
                argument?</em> — and note where your intuition and the
                operational test disagree.
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                The pattern most people find: features that name something (a
                person, a place, a topic, an emotion, a code smell) pass the
                operational test easily — you can imagine the model saying the
                word, and you can imagine a downstream question that takes it as
                an argument. Features that track position in a line, token
                boundaries, quotation depth, whether we are inside a Markdown
                table, or which of two repeated names came first, do not. They
                are load-bearing for fluency and invisible to report, which is
                exactly the character-counting result: the model can wrap lines
                at the right column with no number anywhere in its workspace.
              </p>
              <p>
                The disagreements are the interesting part, and they usually
                come in two flavours. First, features that <em>feel</em>{" "}
                sophisticated but are pure bookkeeping — tracking syntactic
                dependencies over long spans, say. Second, and more instructive,
                the fact that the question is malformed as asked: the paper
                shows that the same information can be absent from the workspace
                under one task and pulled into it under another. Workspace
                membership is not a fixed property of a feature. It is a
                property of a feature <em>in a context</em>, which is why the
                authors say they cannot yet predict, for an arbitrary
                computation, whether it will engage the J-space.
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
              Why does the Jacobian lens average over a thousand unrelated
              prompts rather than using the prompt under study?
            </>
          ),
          choices: [
            {
              text: "To separate a direction the model is generally disposed to verbalise from one that merely happens to feed this context's output.",
              correct: true,
              explain:
                "This is the definition of verbalizability the method is built on. A single-prompt Jacobian conflates general disposition with local use, and the whole workspace claim depends on the first.",
            },
            {
              text: "To reduce numerical noise in the gradient computation.",
              explain:
                "Averaging does reduce variance, but that is incidental. The purpose is to change what quantity is being estimated, not just to estimate it more precisely.",
            },
            {
              text: "Because the Jacobian is undefined for a single prompt.",
              explain:
                "It is perfectly well-defined per prompt — the paper computes single-prompt Jacobians and explains why they answer a different question.",
            },
            {
              text: "To make the lens independent of the model's weights.",
              explain:
                "The lens is entirely a function of the weights — it is a measured map from a layer to the final layer. Independence from weights would make it useless.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              The same passage, and the word <em>Spanish</em> appears in the
              J-lens readout at similar rates under all four tasks. Swapping it
              for <em>French</em> changes the answer for &ldquo;name the
              language&rdquo; but not for &ldquo;continue the passage&rdquo;.
              The right conclusion is:
            </>
          ),
          choices: [
            {
              text: "Presence in the workspace and causal use by a circuit are different facts; only intervention separates them.",
              correct: true,
              explain:
                "The cleanest lesson in the paper, and it generalises to every correlational interpretability result: a representation can be sitting right there and be read by nobody.",
            },
            {
              text: "The J-lens readout is unreliable, since it reports content the model isn't using.",
              explain:
                "The readout is correct — the concept genuinely is represented in both conditions. What varies is which downstream circuits consume it.",
            },
            {
              text: "Continuation doesn't actually depend on knowing the language.",
              explain:
                "It plainly does — the next line of a Spanish passage had better be Spanish. It just gets that information through a route the workspace swap does not touch.",
            },
            {
              text: "The swap was too weak to have an effect on the continuation.",
              explain:
                "The identical swap flipped the report and the flexible-inference answers on essentially every trial. Same intervention, same strength, different consumers.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              Swapping <em>spider</em> for <em>ant</em> changes the answer from
              8 to 6. A sceptic says the swap simply injected the answer 6. What
              is the paper&apos;s evidence against that?
            </>
          ),
          choices: [
            {
              text: "The intermediate swap takes effect a median of about 17% earlier in the network than a swap on the answer itself.",
              correct: true,
              explain:
                "A smuggled-in answer component would bite at the same depth as an answer swap. It bites earlier, which is what you expect if the intermediate is computed first and then consumed.",
            },
            {
              text: "The word 'ant' never appears in the output.",
              explain:
                "True but not decisive — an injected answer component would not need to surface as the word 'ant' either. The argument has to be about where in the network the effect occurs.",
            },
            {
              text: "The swap leaves the component orthogonal to the two lens vectors untouched.",
              explain:
                "This rules out generic perturbation damage, which is a different objection. It does not by itself distinguish an intermediate from a disguised answer, since both live in the swapped subspace.",
            },
            {
              text: "The model can report 'spider' when asked, so it must be an intermediate.",
              explain:
                "Reportability establishes property 1, not that the concept is causally upstream of the answer. Report and internal reasoning are separate properties for exactly this reason.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>What is measured to be &ldquo;never more than 10%&rdquo;?</>
          ),
          choices: [
            {
              text: "The share of activation variance the J-space accounts for, in excess of a random-direction control.",
              correct: true,
              explain:
                "This is the selectivity claim in numbers: the workspace is a thin slice, and the model's activations are dominated by content outside it.",
            },
            {
              text: "The fraction of layers in which the workspace operates.",
              explain:
                "The workspace band is much wider than that — roughly from a third of the way through to shortly before the output, well over half the depth.",
            },
            {
              text: "The fraction of tasks that survive J-space ablation.",
              explain:
                "Backwards. Most evaluated capabilities survive ablation near baseline; it is the flexible, generative ones that collapse.",
            },
            {
              text: "The error rate of J-lens readouts against the model's actual next token.",
              explain:
                "Next-token agreement is a diagnostic used to find the workspace boundaries, not a headline accuracy figure — and in the motor layers it is expected to be high, which is how the end of the band is identified.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Counterfactual reflection training fine-tunes only on appended
              reflection turns, and is then evaluated in contexts where no
              reflection is requested. Why is the result evidence <em>for</em>{" "}
              the workspace account?
            </>
          ),
          choices: [
            {
              text: "Changing what the model is disposed to say implanted those concepts in its workspace in the original contexts, and ablating them reverses the behavioural gain.",
              correct: true,
              explain:
                "The prediction and both halves of its confirmation: the concepts appear in the J-space where no reflection is written, and removing them reverts the improvement. Verbal disposition and silent reasoning route through the same representations.",
            },
            {
              text: "It shows fine-tuning on any auxiliary task improves honesty.",
              explain:
                "No such general claim is made or tested, and it would not be evidence about the workspace even if true. The mechanism check is what carries the argument.",
            },
            {
              text: "It shows the model reasons better when it writes its reasoning down.",
              explain:
                "That is a separate finding — chain-of-thought makes GSM8K more robust to ablation, by externalising what the workspace would otherwise hold. Here the model writes no reflection at evaluation time.",
            },
            {
              text: "It demonstrates that the constitution is stored in the J-space at all times.",
              explain:
                "The implanted concepts appear in relevant task contexts after this specific training, which is a claim about contextual population of the workspace, not permanent storage.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              You want to use the J-lens to monitor a deployed model for
              misaligned strategising. Which caveat is the paper most insistent
              about?
            </>
          ),
          choices: [
            {
              text: "Sufficiently automatic, well-practised computation bypasses the J-space, so a drilled-in misaligned behaviour could run beneath the monitor.",
              correct: true,
              explain:
                "It follows directly from selectivity, and the authors decline to claim workspace monitoring is sufficient for alignment monitoring for exactly this reason.",
            },
            {
              text: "The lens is too expensive to run at deployment scale.",
              explain:
                "The opposite: one matrix multiply per layer, with the matrix computed once per model, no auxiliary training, human-readable output. Cheapness is one of its main practical arguments.",
            },
            {
              text: "The lens only works on base models, not post-trained ones.",
              explain:
                "It is applied throughout to post-trained production models, and the post-training comparison finds the J-space acquires the Assistant's point of view — a post-training phenomenon.",
            },
            {
              text: "Reading the workspace requires the model's cooperation.",
              explain:
                "It requires nothing from the model. That is the point of reading representations instead of asking — the lens surfaces strategic deliberation and evaluation awareness that never reach the output.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              A colleague says this paper shows language models are conscious.
              The most accurate correction is:
            </>
          ),
          choices: [
            {
              text: "It documents functional properties associated with conscious access, takes no position on subjective experience, and says nothing about theories that tie consciousness to biological substrate.",
              correct: true,
              explain:
                "All three clauses are the authors' own framing. Access consciousness is a functional notion; its relation to phenomenal consciousness is contested and untouched here.",
            },
            {
              text: "It shows models are definitely not conscious, since the workspace is only 10% of activations.",
              explain:
                "Size is irrelevant to the question, and the paper makes no negative claim either. In humans the consciously accessible fraction is also small.",
            },
            {
              text: "The question is meaningless because consciousness cannot be studied empirically.",
              explain:
                "The authors take the opposite view — that models may be a tractable system for studying questions that are hard even to pose precisely in brains, precisely because the contents can be read and intervened on.",
            },
            {
              text: "It settles the matter in favour of global workspace theory over rival theories.",
              explain:
                "It engages several theories — higher-order, attention schema, recurrent processing — and notes where its findings fit awkwardly with each, including global workspace theory's reliance on recurrence.",
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
          The workspace paper is long and unusually well-organised: the
          introduction genuinely summarises it, so read that, then the five
          property sections, then the discussion. Save the appendices for a
          second pass.
        </p>
      ),
      readings: [
        {
          title:
            "Verbalizable Representations Form a Global Workspace in Language Models",
          authors:
            "Gurnee, Sofroniew, Pearce, Piotrowski, Kauvar, Chen, Soligo, Bogdan, Ong, Wang, Thompson, Abrahams, Kantamneni, Ameisen, Batson & Lindsey (Anthropic)",
          year: 2026,
          url: "https://transformer-circuits.pub/2026/workspace/index.html",
          kind: "paper",
          time: "3 sittings",
          essential: true,
          note: "Sitting 1: introduction and Methods (the J-lens definition is two equations — do not skip them, everything else is downstream). Sitting 2: the five property sections; play with the embedded interactive lens viewer rather than only reading the figures. Sitting 3: the structural results (layers, ignition, capacity, broadcast), the alignment-auditing section, and Limitations — which is the most honest limitations section in the recent literature and worth reading as a model of the form.",
        },
        {
          title: "Emergent Introspective Awareness in Large Language Models",
          authors: "Jack Lindsey (Anthropic)",
          year: 2025,
          url: "https://transformer-circuits.pub/2025/introspection/index.html",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The companion piece on self-report, and the source for the notebook problem. Read all four experiments, then hold two numbers in your head: detection of injected concepts around 20% at the best settings, and the authors' own verdict that failures of introspection remain the norm. Together with the workspace paper this gives you the honest position on model self-reports — a real channel, narrow and unreliable.",
        },
        {
          title: "Conscious Processing and the Global Neuronal Workspace Hypothesis",
          authors: "Mashour, Roelfsema, Changeux & Dehaene",
          year: 2020,
          url: "https://pubmed.ncbi.nlm.nih.gov/32135090/",
          kind: "paper",
          time: "1.5h (or 20 min for the abstract and figures)",
          note: "The neuroscience source the Anthropic paper is arguing with. Read it for two ideas only: ignition — the non-linear amplification that makes a representation globally available — and the claim that a workspace broadcasts to many local processors. Published in Neuron and paywalled at the publisher; the abstract plus the Butlin paper below will give you what you need if you cannot get the full text.",
        },
        {
          title:
            "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness",
          authors: "Butlin, Long, Elmoznino, Bengio et al.",
          year: 2023,
          url: "https://arxiv.org/abs/2308.08708",
          kind: "paper",
          time: "2h (skim to 45 min)",
          note: "Free, and the best available map of the terrain. It derives 'indicator properties' from several theories of consciousness — global workspace, higher-order, attention schema, recurrent processing — and assesses AI systems against them. Read §2 for the theories and the indicator list, then §3 to see the method applied. The 2026 workspace paper is essentially one of these indicator checks, run properly with interpretability tools; reading them in this order makes that obvious.",
        },
        {
          title: "Emotion Concepts and their Function in a Large Language Model",
          authors: "Sofroniew et al. (Anthropic)",
          year: 2026,
          url: "https://transformer-circuits.pub/2026/emotions/index.html",
          kind: "paper",
          time: "45 min (targeted re-read)",
          note: "If you did Module 4.2, revisit two parts with the workspace in mind: the section where emotion vectors reflect and influence the model's self-reported preferences — a self-report grounded in an internal state, which is the exact phenomenon the J-lens formalises — and the blackmail case study, which the workspace paper re-analyses through a different instrument and finds the same panic.",
        },
        {
          title: "Interpreting GPT: the logit lens",
          authors: "nostalgebraist",
          year: 2020,
          url: "https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens",
          kind: "blog",
          time: "30 min",
          note: "Re-read the original if it has faded, because the J-lens is precisely a correction to it. Pay attention to where the logit lens returns noise and to the assumption that causes it — that every layer writes in the final layer's coordinates. That assumption is the thing the averaged Jacobian replaces with a measurement.",
        },
      ],
    },
  ],
};

export default mod;
