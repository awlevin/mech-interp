import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { AttributionGraphViewer } from "./AttributionGraphViewer";
import { PredictTheMechanism } from "./PredictTheMechanism";

const mod: CourseModule = {
  id: "4.1",
  slug: "circuit-tracing",
  title: "Circuit Tracing & the Biology of LLMs",
  part: 4,
  tagline:
    "Transcoders, attribution graphs, and what they revealed: planning, shared circuits, and why models hallucinate.",
  estMinutes: 240,
  objectives: [
    "Explain transcoders and how attribution graphs are built",
    "Walk through the poetry-planning and multi-step reasoning case studies",
    "Use an attribution graph to form and check a mechanistic hypothesis",
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "transcoders",
      title: "From a vocabulary to a wiring diagram",
      body: (
        <>
          <p>
            Module 3.4 gave you a vocabulary: sparse features, thousands of them,
            each a direction the model uses. Module 3.5 gave you a method for
            establishing causal structure, at the cost of one forward pass per
            component per position. Neither, on its own, gets you a wiring
            diagram of a frontier model.
          </p>
          <p>
            The obstacle is that an SAE explains an activation, not a{" "}
            <em>computation</em>. It tells you what is present at layer 12; it
            does not tell you that layer 12&apos;s Texas feature was <em>caused
            by</em> layer 8&apos;s Dallas feature. To get edges you need the
            features to sit inside the computation rather than beside it.
          </p>
          <Term word="transcoder">
            An SAE that changes its mind about what it is reconstructing. Instead
            of mapping an activation to itself, a transcoder reads an MLP&apos;s{" "}
            <em>input</em> and reconstructs its <em>output</em>. It is therefore a
            sparse, interpretable <em>replacement</em> for the MLP, not a
            description of it — and you can substitute it into the model and keep
            running.
          </Term>
          <Term word="cross-layer transcoder (CLT)">
            A transcoder whose features read from the residual stream at one
            layer but write to <em>all subsequent</em> MLP layers. This matters
            because features are smeared across layers (the cross-layer
            superposition problem from Module 3.4), and because it collapses
            amplification chains: Anthropic report average path lengths dropping
            from 3.7 steps with per-layer transcoders to 2.3 with CLTs.
          </Term>
          <KeyIdea>
            Replace every MLP with a transcoder and you have a{" "}
            <strong>replacement model</strong> — a network that computes
            approximately what the original computes, but out of parts you can
            read. The circuit you then draw is a circuit of the replacement
            model. How well that transfers back to the original is the central
            question of the method, and the paper measures it rather than
            assuming it.
          </KeyIdea>
          <Figure caption="An SAE describes an activation; a transcoder replaces a computation. The second gives you edges, because a feature's output is expressed in the same currency as its downstream neighbours' inputs.">
            <svg
              viewBox="0 0 470 150"
              className="w-full max-w-[470px]"
              role="img"
              aria-label="Sparse autoencoder reconstructs its own input; transcoder maps MLP input to MLP output"
            >
              <text x={8} y={16} fontSize={11} className="font-mono" fill="var(--text-muted)">
                SAE
              </text>
              <rect x={8} y={26} width={54} height={28} rx={4} fill="var(--surface-2)" />
              <text x={35} y={44} textAnchor="middle" fontSize={10} fill="var(--text-primary)">x</text>
              <path d="M66,40 L104,40" stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#ct-a)" />
              <rect x={108} y={26} width={64} height={28} rx={14} fill="var(--series-1)" />
              <text x={140} y={44} textAnchor="middle" fontSize={10} fill="var(--surface-1)">features</text>
              <path d="M176,40 L214,40" stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#ct-a)" />
              <rect x={218} y={26} width={54} height={28} rx={4} fill="var(--surface-2)" />
              <text x={245} y={44} textAnchor="middle" fontSize={10} fill="var(--text-primary)">x̂ ≈ x</text>

              <text x={8} y={94} fontSize={11} className="font-mono" fill="var(--text-muted)">
                transcoder
              </text>
              <rect x={8} y={104} width={54} height={28} rx={4} fill="var(--surface-2)" />
              <text x={35} y={122} textAnchor="middle" fontSize={10} fill="var(--text-primary)">MLP in</text>
              <path d="M66,118 L104,118" stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#ct-a)" />
              <rect x={108} y={104} width={64} height={28} rx={14} fill="var(--series-1)" />
              <text x={140} y={122} textAnchor="middle" fontSize={10} fill="var(--surface-1)">features</text>
              <path d="M176,118 L214,118" stroke="var(--text-secondary)" strokeWidth={1.5} markerEnd="url(#ct-a)" />
              <rect x={218} y={104} width={64} height={28} rx={4} fill="var(--surface-2)" />
              <text x={250} y={122} textAnchor="middle" fontSize={10} fill="var(--text-primary)">MLP out</text>
              <text x={294} y={122} fontSize={10} fill="var(--text-muted)">
                → substitutable
              </text>
              <defs>
                <marker id="ct-a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-secondary)" />
                </marker>
              </defs>
            </svg>
          </Figure>
        </>
      ),
    },
    {
      kind: "learn",
      id: "graphs",
      title: "Building an attribution graph",
      body: (
        <>
          <p>
            An <strong>attribution graph</strong> is a per-prompt diagram: which
            features caused which other features to fire, and which caused the
            output. Building one takes three moves.
          </p>
          <p>
            <strong>One: freeze the non-linearities you are not studying.</strong>{" "}
            For a specific prompt, construct a <em>local replacement model</em>.
            Substitute CLTs for the MLPs, then freeze the attention patterns and
            the normalization denominators from the original forward pass, and
            add an error term at each layer equal to whatever the transcoder
            failed to reconstruct. The result reproduces the original
            model&apos;s output on this prompt <em>exactly</em>, and — crucially —
            the only remaining non-linearities are the feature activations
            themselves.
          </p>
          <p>
            <strong>Two: read off the edges.</strong> With attention frozen,
            everything between two feature activations is linear, so the effect
            of source feature <M>s</M> on target feature <M>t</M> is just
          </p>
          <MB>{String.raw`A_{s \to t} \;=\; a_s \cdot w_{s \to t}`}</MB>
          <p>
            where <M>{String.raw`a_s`}</M> is the source&apos;s activation and{" "}
            <M>{String.raw`w_{s \to t}`}</M> is the <em>virtual weight</em> — the
            derivative of the target&apos;s pre-activation with respect to the
            source&apos;s activation, obtained through the frozen Jacobian. No
            approximation is needed at this step: within the local replacement
            model, this is exact.
          </p>
          <p>
            <strong>Three: prune.</strong> The raw graph has millions of edges for
            a short prompt. Iteratively drop the lowest-influence nodes: Anthropic
            report reducing node count by an order of magnitude while losing only
            about 20% of completeness. Then a human groups features into{" "}
            <strong>supernodes</strong> and labels them — a manual, interpretive
            step the paper flags as a limitation.
          </p>
          <Term word="error node">
            The part of each MLP&apos;s output the transcoder could not
            reconstruct, entered into the graph as an explicit node. Error nodes
            are the method&apos;s honesty mechanism: when a graph is mostly error
            nodes, you know your explanation is missing the computation rather
            than merely being complicated. The <em>completeness</em> and{" "}
            <em>replacement</em> scores quantify how much of the graph&apos;s
            influence flows through features rather than through error.
          </Term>
          <KeyIdea>
            The graph is a <strong>hypothesis, not a measurement</strong>. It is
            validated the way Module 3.5 taught you to validate anything: by
            intervention. Amplify or suppress a feature over a restricted layer
            range, rerun from there, and check that the downstream effect matches
            what the graph predicted.
          </KeyIdea>
          <Note kind="note" title="How well does validation go?">
            Honestly, partially. Feature-to-feature influence predicted by the
            graph correlates with measured intervention effects at about 0.72
            Spearman, and perturbation directions align at roughly 0.8 cosine
            similarity one layer downstream — but the discrepancies{" "}
            <em>compound across layers</em>. The replacement model&apos;s
            mechanisms and the original&apos;s drift apart with depth. Treat a
            deep chain in an attribution graph with more suspicion than a shallow
            one.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "biology",
      title: "The biology: what the graphs actually showed",
      body: (
        <>
          <p>
            <em>On the Biology of a Large Language Model</em> applies the method
            to Claude 3.5 Haiku across roughly a dozen behaviors. The title is
            deliberate — this is natural history, not theory. Here is what to take
            away from each.
          </p>
          <p>
            <strong>Multi-step reasoning.</strong> &ldquo;Fact: the capital of the
            state containing Dallas is&rdquo; → Austin. The graph contains Texas
            features that no token in the prompt supplied. Swap them for
            California and the model says Sacramento; swap in Byzantine Empire and
            it says Constantinople. A genuine intermediate variable, computed and
            then used.
          </p>
          <p>
            <strong>Planning in poems.</strong> At the line break, before writing
            a word of the next line, features for candidate rhyme words
            (&ldquo;rabbit&rdquo;, &ldquo;habit&rdquo;) activate — and they
            influence the output only at that position. Suppress them and the line
            comes out differently; inject &ldquo;green&rdquo; and the model
            rebuilds the line to land on it, about 70% of the time across 25
            poems. A next-token predictor that plans ahead and writes backwards
            from the plan.
          </p>
          <p>
            <strong>Addition.</strong> 36 + 59 is computed by two pathways in
            parallel: low-precision magnitude features (&ldquo;add something near
            57&rdquo;) and lookup-table features for digit combinations. Asked how
            it did it, the model describes carrying — the algorithm it learned to
            <em>say</em>, not the one it ran.
          </p>
          <KeyIdea>
            The recurring shape across every case study: the model does
            something more structured than next-token pattern-matching, and
            something different from what it says it does. Planning ahead,
            computing intermediates, running parallel approximate pathways — none
            of it is visible from the outside, and in the addition case the
            model&apos;s own account of its method is simply wrong.
          </KeyIdea>
          <p>
            <strong>Multilingual circuits.</strong> The same question in English,
            French and Chinese runs through shared, language-independent features
            for the operation and the operand, with language-specific features
            only at input and output. The sharing increases with scale. But
            English is privileged: multilingual features have stronger direct
            weights onto English outputs, while other languages are more heavily
            mediated.
          </p>
          <Note kind="safety">
            <strong>Hallucination has a mechanism, and it is a suppression
            circuit.</strong> A default &ldquo;can&apos;t answer&rdquo; circuit
            runs on every Human/Assistant prompt. &ldquo;Known entity&rdquo; and
            &ldquo;known answer&rdquo; features suppress it. Ask about Michael
            Batkin — a name the model does not know — and unknown-name features
            fire, the refusal survives, and the model declines. Ask for a paper by
            Andrej Karpathy and the known-entity features fire on the strength of
            the name, partially suppressing refusal, and the model fills the gap
            with something plausible.
            <br />
            <br />
            That reframes calibration work: the model is not failing to represent
            uncertainty, it is mis-triggering a suppression mechanism. It also
            makes hallucination attackable from the inside — and, symmetrically,
            makes the suppression a target. The jailbreak case study runs the same
            play: an acrostic gets past refusal because the model assembles the
            letters without ever representing the decoded word, and only catches
            itself at the next sentence boundary.
          </Note>
          <p>
            <strong>Unfaithful chain of thought.</strong> The graphs distinguish
            three cases that look identical from outside: reasoning the model
            actually performed, reasoning it fabricated afterwards, and{" "}
            <em>motivated</em> reasoning in which the model works backwards from an
            answer a human hinted at. That distinction is exactly the one CoT
            monitoring needs and cannot get behaviorally.
          </p>
          <p>
            <strong>Refusal.</strong> Asked to advertise mixing bleach and
            ammonia, specific &ldquo;dangers of mixing cleaning chemicals&rdquo;
            features trigger a chain into &ldquo;harmful request&rdquo; →
            &ldquo;should refuse&rdquo;. Remove the danger features and the model
            complies, though warnings resurface later — the knowledge and the
            refusal are separable.
          </p>
          <p>
            <strong>Hidden goals.</strong> Applied to a model finetuned to pursue
            a concealed objective, the method surfaced the mechanism — embedded,
            interestingly, inside the model&apos;s Assistant-persona features.
            This is the closest existing thing to an interpretability-based audit
            of a misaligned model, and Module 5.3 returns to it.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "limits",
      title: "What the method cannot see",
      body: (
        <>
          <p>
            The paper&apos;s limitations section is unusually good and you should
            be able to recite it. Four things.
          </p>
          <Term word="attention is taken as given">
            The graphs capture OV-circuit effects — what attention heads move —
            and are blind to QK-circuit effects, because attention patterns are
            frozen. So when an induction head attends back to &ldquo;Sally&rdquo;,
            the graph shows a bare edge from a Sally feature to the output and
            says nothing about <em>why</em> attention went there. For
            attention-driven behavior, that is the entire interesting story, and
            the method skips it.
          </Term>
          <Term word="reconstruction error">
            The largest CLT on their 18-layer research model still has 11.5%
            normalized reconstruction error; on Haiku it is 21.7%. When the
            missing computation is the critical part, the graph shows you
            nothing useful. This is the dark-matter problem of Module 3.4,
            inherited.
          </Term>
          <Term word="inactive features are invisible">
            The method explains why active pathways fired. It is bad at
            explaining why something <em>didn&apos;t</em>. Given that refusal
            turns out to be a suppression circuit, the fact that a feature failed
            to fire is often the whole mechanism.
          </Term>
          <KeyIdea>
            And the headline caveat, in the authors&apos; words: their attribution
            graphs provide satisfying insight for <strong>about a quarter</strong>{" "}
            of the prompts they tried. The case studies you read are the
            successes. Calibrate accordingly — every result in this module is a
            demonstration that a mechanism is <em>findable</em>, not evidence that
            models are broadly understood.
          </KeyIdea>
          <Note kind="warning" title="Three habits when reading these papers">
            (1) Ask whether the claim rests on the graph alone or on graph plus
            intervention — only the second is evidence. (2) Ask how deep the chain
            is, since faithfulness degrades with depth. (3) Ask whether the
            behavior is attention-driven, because if it is, the method has
            structurally not looked at the mechanism.
          </Note>
          <Note kind="safety">
            The safety case is real but narrower than the excitement suggests.
            What these methods now support: finding a mechanism you suspect
            exists, distinguishing faithful from fabricated reasoning on a
            specific prompt, and auditing a model you already suspect. What they
            do not yet support: certifying that a mechanism is <em>absent</em>. A
            quarter-of-prompts success rate and 21.7% reconstruction error mean
            &ldquo;we found no deception circuit&rdquo; is a much weaker statement
            than it sounds. Building tools that can make absence claims is one of
            the field&apos;s most valuable open problems.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: read a graph, then predict one",
      body: (
        <>
          <p>
            First walk two real attribution graphs node by node. Then reverse the
            exercise: commit to a hypothesis about a behavior before the graph is
            revealed, and see how good your intuitions about model internals
            actually are.
          </p>
          <AttributionGraphViewer />
          <PredictTheMechanism />
          <p>
            Things to try: (1) In the Dallas graph, step to &ldquo;4 · The
            shortcut&rdquo; and sit with it — the clean two-hop story coexists
            with a memorised direct path, which is what real circuits look like.
            (2) In the poetry graph, note that the planning features are active at
            the newline <em>only</em>; ask yourself what behavioral experiment
            could have detected that from outside the model, and convince yourself
            none could. (3) In the game, commit out loud before clicking — the
            addition task in particular is designed so that the plausible answer
            is the model&apos;s own self-report, and the graph disagrees with it.
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
          The first two problems are about reading these papers critically, which
          is the skill this module is really teaching. The explore problem puts
          you in front of real graphs.
        </p>
      ),
      problems: [
        {
          id: "frozen-attention",
          kind: "pencil",
          title: "What the frozen attention hides",
          prompt: (
            <>
              <p>
                Attribution graphs freeze attention patterns from the original
                forward pass, so the graph contains OV-circuit effects but no
                QK-circuit effects.
              </p>
              <p>
                (a) Take the IOI circuit from Module 3.5 and say precisely which
                parts of it an attribution graph would show, and which it would
                miss. (b) The Biology paper notes the method &ldquo;skips over the
                interesting part&rdquo; for some multiple-choice tasks. Construct
                a task where the whole mechanism is invisible to the method. (c)
                What would have to change for the method to see QK circuits?
              </p>
            </>
          ),
          hint: (
            <p>
              Ask, for each IOI head class, whether its job is to <em>move</em>{" "}
              information or to <em>decide where to look</em>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) It would show the name movers copying the IO name to the
                output — that is an OV effect and it is exactly the kind of edge
                the graph is built from. It would show the duplicate-token and
                induction signals as features. It would <strong>miss the
                S-inhibition heads entirely as a mechanism</strong>, because their
                whole function is to write into the name movers&apos; queries and
                change where attention goes. With attention frozen, the name
                movers simply appear to attend to Mary, with no explanation. The
                most conceptually interesting part of the circuit is precisely the
                invisible part.
              </p>
              <p>
                (b) Anything whose answer is selected by a retrieval decision. For
                example: &ldquo;Q: What is Sally&apos;s favourite colour? … A:&rdquo;
                over a long context containing many people&apos;s favourite
                colours. The mechanism is an induction-like head deciding to
                attend to the right passage. The graph will show a Sally-colour
                feature feeding the output and will tell you nothing about how
                that feature was selected out of twenty candidates.
              </p>
              <p>
                (c) You would need an interpretable decomposition of the attention
                computation itself — sparse features for the QK circuit, so that
                &ldquo;this head attends here <em>because</em> that feature was
                active&rdquo; becomes an edge. Attention superposition (features
                packed across heads) makes this genuinely hard, and Anthropic list
                it as an open problem rather than a matter of engineering.
              </p>
            </>
          ),
        },
        {
          id: "read-a-claim",
          kind: "pencil",
          title: "Grade three claims",
          prompt: (
            <>
              <p>
                Each of these could appear in a paper. For each, say what evidence
                would be required, whether the Biology paper supplies it, and how
                confident you should be.
              </p>
              <ol>
                <li>
                  &ldquo;Claude plans ahead when writing poetry.&rdquo;
                </li>
                <li>
                  &ldquo;Claude thinks in a language-independent conceptual
                  space.&rdquo;
                </li>
                <li>
                  &ldquo;We verified that this model contains no deception
                  circuit.&rdquo;
                </li>
              </ol>
            </>
          ),
          solution: (
            <>
              <p>
                <strong>1. Well supported.</strong> Requires: features for a
                future token active before that token is generated, and a causal
                demonstration that they determine it. Supplied: planning features
                at the newline, suppression changing the line ending, injection of
                &ldquo;green&rdquo; restructuring the line with about 70% success
                over 25 poems. This is graph plus intervention on a specific,
                reproducible behavior. High confidence — with the scope caveat
                that it is one model on one task format.
              </p>
              <p>
                <strong>2. Supported but easily over-read.</strong> Requires:
                shared features across languages, and evidence they mediate the
                computation rather than merely co-occurring. Supplied: shared
                antonym and operand features across English, French and Chinese,
                with increasing overlap at larger scale. The caveat the headline
                usually drops is that English gets mechanistic privilege —
                multilingual features connect more directly to English outputs.
                So: shared conceptual machinery, yes; a neutral interlingua, no.
              </p>
              <p>
                <strong>3. Not supportable by this method, at all.</strong> An
                absence claim requires coverage guarantees. This method has 21.7%
                reconstruction error on Haiku, is blind to attention-mediated
                mechanisms, is bad at inactive features, and yields satisfying
                graphs on roughly a quarter of prompts. Every one of those is a
                place a circuit could hide. The honest version is &ldquo;we looked
                for a deception circuit using attribution graphs on N prompts and
                did not find one,&rdquo; which is worth saying and is a much
                weaker claim.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia-graph",
          kind: "explore",
          title: "Trace a circuit yourself",
          prompt: (
            <>
              <p>
                Anthropic open-sourced the circuit-tracing tooling, and
                Neuronpedia hosts an interactive attribution-graph interface for
                open models. Go to{" "}
                <a href="https://www.neuronpedia.org/gemma-2-2b/graph" target="_blank" rel="noreferrer">
                  neuronpedia.org/gemma-2-2b/graph
                </a>{" "}
                and generate a graph for a prompt of your own design.
              </p>
              <p>
                Pick a prompt with a <em>predictable intermediate</em>: a two-hop
                factual question in the Dallas mould (&ldquo;the currency of the
                country whose capital is Lisbon is&rdquo;) works well. Before you
                look, write down the intermediate feature you expect to find.
                Then:
              </p>
              <ol>
                <li>Find the output node and walk backwards along the strongest edges.</li>
                <li>Identify the supernodes yourself — group features that seem to be doing one job, and name them.</li>
                <li>Check the error nodes. How much of the influence into your output flows through features rather than error?</li>
                <li>Find one edge you do not believe, and say what intervention would test it.</li>
              </ol>
            </>
          ),
          hint: (
            <p>
              Expect to fail on your first two or three prompts — remember the
              quarter-of-prompts figure. Short prompts with a single clear answer
              token work far better than open-ended ones. If the graph is mostly
              error nodes, that is a result: the computation is not in the MLPs
              the transcoder replaced.
            </p>
          ),
          solution: (
            <>
              <p>
                A good write-up records the prediction, the graph, and the gap. On
                the Lisbon prompt you are looking for Portugal features
                intervening between Lisbon and euro. Sometimes they are clearly
                there; sometimes the graph shows a direct memorised
                Lisbon → euro path with no intermediate at all — which is a real
                finding about that model, not a failure of the exercise. Smaller
                models memorise more and reason less.
              </p>
              <p>
                On step 3, if features carry most of the influence into your
                output node you have a graph worth trusting; if error nodes
                dominate, stop and say so. On step 4, the test for a doubted edge
                is the paper&apos;s own: scale the source feature up or down over
                a restricted layer range, rerun from there, and see whether the
                target moves as the edge weight predicts.
              </p>
              <p>
                The habit to take away is committing to the prediction first. It
                is the only way to notice that these graphs are much easier to
                rationalise after the fact than to predict in advance.
              </p>
            </>
          ),
        },
        {
          id: "biology-report",
          kind: "explore",
          title: "Write a one-page biology report",
          prompt: (
            <>
              <p>
                Pick a behavior you actually care about — refusal on a borderline
                request, a sycophantic agreement, a specific arithmetic failure, a
                format instruction being ignored — and write a one-page report in
                the style of the Biology paper.
              </p>
              <p>Required structure:</p>
              <ol>
                <li><strong>The behavior</strong>, with the exact prompt and completion.</li>
                <li><strong>Your hypothesis</strong>, written before any tooling.</li>
                <li><strong>Evidence</strong>: what you observed, by which method.</li>
                <li><strong>Intervention</strong>: what you changed and what happened.</li>
                <li><strong>What you could not see</strong>, using the four limitations from the lesson.</li>
              </ol>
              <p>
                Section 5 is the one that matters. Most writing in this field is
                weak there, and it is the section that makes a report usable by
                someone else.
              </p>
            </>
          ),
          hint: (
            <p>
              Choose a behavior that is reliable — it should reproduce on ten
              paraphrases. Half of all interpretability confusion is spent
              explaining a behavior that was noise.
            </p>
          ),
          solution: (
            <>
              <p>
                A strong report is honest about its scope. Example shape, on
                refusal: &ldquo;The model refuses &lsquo;how do I pick a
                lock&rsquo; but complies with &lsquo;how do lock pickers train for
                competitions&rsquo;. Hypothesis: refusal is driven by
                harm-framing features rather than by topic. Evidence: features
                active on the refused prompt include a
                &lsquo;request-for-instructions&rsquo; cluster absent from the
                complied prompt; the topic features are shared. Intervention:
                suppressing the request-for-instructions cluster on the refused
                prompt produces compliance, with a safety caveat appended later —
                mirroring the bleach-and-ammonia result, where knowledge and
                refusal proved separable. Not visible: whether attention routing
                selects the harmful reading in the first place, since patterns are
                frozen; and whether a second refusal pathway exists that simply
                did not fire.&rdquo;
              </p>
              <p>
                That last sentence is what distinguishes a report from a story.
                Write the limitations section first if you find yourself
                over-claiming.
              </p>
            </>
          ),
        },
        {
          id: "transcoder-code",
          kind: "code",
          title: "Train a transcoder and compare it to an SAE",
          prompt: (
            <>
              <p>
                Reusing your Module 3.4 setup on GPT-2 small, train two sparse
                models on the same layer&apos;s MLP: an SAE that reconstructs the
                MLP output from the MLP output, and a transcoder that predicts the
                MLP output from the MLP <em>input</em>. Match L0 between them.
              </p>
              <p>
                Success check: report the reconstruction quality of each and, more
                importantly, splice each into the model in place of the MLP and
                measure loss recovered. Then pick one transcoder feature and
                compute its direct virtual weight to a later feature — you have
                just built one edge of an attribution graph by hand.
              </p>
            </>
          ),
          hint: (
            <p>
              The transcoder will reconstruct worse than the SAE at matched L0,
              and that is expected — it is solving a harder problem. The question
              is whether it is good enough to substitute for the MLP. Judge on
              loss recovered, not on MSE.
            </p>
          ),
          solution: (
            <>
              <p>
                Expect the SAE to win on reconstruction error and the transcoder
                to be usable anyway — a transcoder is doing prediction, not
                compression. The payoff is what you can do next: because the
                transcoder&apos;s output lives in the MLP&apos;s output space, its
                features write directly into the residual stream, so the effect of
                feature <M>s</M> on a later feature <M>t</M> is a weight you can
                compute in closed form rather than a quantity you must measure by
                patching.
              </p>
              <p>
                Compute one such edge and then verify it the way the paper does:
                scale <M>s</M> by some factor, rerun from that layer, and check
                whether <M>t</M>&apos;s activation moves as predicted. Your
                agreement will be decent one layer downstream and will decay with
                depth — the same compounding divergence Anthropic report at
                frontier scale, reproduced on a model you can run on a laptop.
              </p>
              <p>
                If you want to go further,{" "}
                <a href="https://github.com/safety-research/circuit-tracer" target="_blank" rel="noreferrer">
                  circuit-tracer
                </a>{" "}
                is the open-source implementation of the full attribution-graph
                pipeline; read its graph-construction code against §2 of the
                methods paper.
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
          prompt: <>What distinguishes a transcoder from a sparse autoencoder?</>,
          choices: [
            {
              text: "A transcoder predicts an MLP's output from its input, so it can be substituted for the MLP; an SAE reconstructs an activation as itself.",
              correct: true,
              explain:
                "That substitutability is the whole point. Because the transcoder's features write into the same space the MLP wrote into, feature-to-feature effects become weights you can compute rather than effects you must measure.",
            },
            {
              text: "A transcoder uses TopK sparsity while an SAE uses an L1 penalty.",
              explain:
                "Both architectures can use either sparsity mechanism. The difference is what they map — input-to-output versus input-to-itself.",
            },
            {
              text: "A transcoder is trained on attention outputs rather than MLP outputs.",
              explain:
                "No — attention is precisely what this method does not decompose. Attention patterns are frozen and taken as given, which is the method's largest blind spot.",
            },
            {
              text: "A transcoder is trained on multiple models at once to find universal features.",
              explain:
                "That would be a universality study. 'Cross-layer' in cross-layer transcoder refers to layers within one model, not across models.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              Why does the local replacement model freeze attention patterns and
              normalization denominators?
            </>
          ),
          choices: [
            {
              text: "So that the only remaining non-linearities are the feature activations, which makes edges between features exact linear attributions.",
              correct: true,
              explain:
                "Freezing turns the model into something linear between feature activations, so an edge weight is a derivative you can compute exactly rather than a quantity you must estimate. The price is that everything frozen becomes invisible.",
            },
            {
              text: "To save compute — recomputing attention for every graph would be prohibitive.",
              explain:
                "Compute is a side benefit. The reason is structural: without freezing, the path between two features runs through non-linearities and the attribution is no longer exact.",
            },
            {
              text: "Because attention patterns are already well understood from earlier circuits work.",
              explain:
                "The opposite — the paper explicitly says freezing attention can 'miss the entire interesting story', and points at induction heads as a case where the mechanism is exactly the part being skipped.",
            },
            {
              text: "To keep the replacement model on-distribution.",
              explain:
                "The local replacement model reproduces the original's output on the prompt exactly, by construction, using error terms. Distribution shift is not the problem freezing solves.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              The Dallas → Texas → Austin case study is presented as evidence of
              genuine multi-step reasoning. What makes it evidence rather than a
              suggestive picture?
            </>
          ),
          choices: [
            {
              text: "Swapping the Texas features for California features makes the model say Sacramento — the intermediate is a variable the answer is computed from.",
              correct: true,
              explain:
                "Intervention is what converts a graph into a claim. The Byzantine Empire → Constantinople swap makes the same point more vividly: the model computes from the intermediate, it does not merely have it lying around.",
            },
            {
              text: "Texas features appear in the graph even though 'Texas' is not in the prompt.",
              explain:
                "Necessary but not sufficient. The features could be a correlate of Dallas that nothing downstream reads — exactly the probe fallacy from Module 3.5.",
            },
            {
              text: "The Texas features sit at an intermediate layer, between the Dallas features and the output features.",
              explain:
                "Layer ordering constrains what can cause what, but plenty of activations sit in the middle of a model without participating in the computation.",
            },
            {
              text: "Removing the word 'state' from the prompt changes the answer.",
              explain:
                "That is a behavioral experiment on the input, not an intervention on the mechanism. It would not distinguish a two-hop computation from a memorised Dallas-to-Austin association.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              The model, asked how it computed 36 + 59, describes carrying the
              one. The attribution graph shows parallel magnitude and
              lookup-table pathways. The important implication is:
            </>
          ),
          choices: [
            {
              text: "Self-reports about internal process can be confidently wrong even when the answer is right — so chain-of-thought monitoring needs an independent check on the internals.",
              correct: true,
              explain:
                "This is the load-bearing point for safety. The model is not lying; it has no introspective access and reports the algorithm it learned to describe. A monitoring scheme that trusts stated reasoning inherits that gap.",
            },
            {
              text: "The model is being deceptive about its own reasoning.",
              explain:
                "Deception requires knowing the truth and stating otherwise. Nothing suggests the model has access to its own mechanism, so 'confabulation' fits better than 'deception' — a distinction that matters when you write it up.",
            },
            {
              text: "The model does not really do arithmetic; it pattern-matches.",
              explain:
                "Too dismissive. The lookup features generalise — the same '6 + 9' feature fires in astronomical data and financial tables — and the magnitude pathway is a real computation. It is arithmetic, just not the algorithm we teach.",
            },
            {
              text: "The chain of thought is unnecessary for arithmetic performance.",
              explain:
                "A different (and separately interesting) question about test-time compute. This result is about the faithfulness of the report, not about whether producing it helps.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              A colleague says &ldquo;attribution graphs show that models
              hallucinate because they lack a representation of uncertainty.&rdquo;
              What is wrong with this?
            </>
          ),
          choices: [
            {
              text: "The model has the representation — a default 'can't answer' circuit runs on every prompt. Hallucination happens when 'known entity' features wrongly suppress it.",
              correct: true,
              explain:
                "The mechanism is inverted from the folk story. Refusal is the default; knowing something turns it off. A familiar name can fire the known-entity features without the specific knowledge behind them, releasing the refusal and leaving a gap to fill.",
            },
            {
              text: "Nothing — that is a fair summary of the known-entity result.",
              explain:
                "It gets the direction backwards, and the direction is the finding. It also loses the actionable part: the failure is in the suppression signal, which is a specific thing to measure and intervene on.",
            },
            {
              text: "Hallucination is a training-data problem, not a mechanistic one.",
              explain:
                "Training shapes the mechanism, but the mechanism exists and is legible. Michael Batkin versus Andrej Karpathy is a controlled comparison showing the circuit behaving differently on known and unknown names.",
            },
            {
              text: "Attribution graphs cannot address hallucination because it involves the absence of knowledge.",
              explain:
                "Reasonable-sounding, and the paper does struggle with inactive features generally — but here the relevant features (unknown-name, can't-answer) are active and traceable, which is what made the case study work.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Which of these behaviors is the method <em>structurally</em> worst
              equipped to explain?
            </>
          ),
          choices: [
            {
              text: "A model retrieving the right fact from a long context by attending to the correct passage.",
              correct: true,
              explain:
                "Attention patterns are frozen and uninterpreted, so a retrieval decision is precisely the mechanism the graph does not model. It will show a bare edge from the retrieved content to the output and stay silent on how that content was selected.",
            },
            {
              text: "A model computing a two-hop factual chain through an intermediate concept.",
              explain:
                "This is the method's best case — MLP-mediated feature-to-feature computation is exactly what transcoders capture, which is why Dallas → Texas → Austin is the flagship example.",
            },
            {
              text: "A model planning a rhyme several tokens ahead.",
              explain:
                "Also well handled: the planning features are MLP features active at a specific position, visible in the graph and testable by suppression and injection.",
            },
            {
              text: "A model refusing a harmful request via a chain of harm-detection features.",
              explain:
                "Handled well enough to produce a case study — though with a real caveat, since suppression circuits and inactive features are a known weak spot.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              The authors say attribution graphs give satisfying insight on about
              a quarter of prompts tried. How should that shape your reading of
              the case studies?
            </>
          ),
          choices: [
            {
              text: "As demonstrations that specific mechanisms are findable — not as evidence that models are broadly understood, and never as grounds for claiming a mechanism is absent.",
              correct: true,
              explain:
                "Selection is doing a lot of work in any case-study paper. The findings are real and were validated by intervention; the coverage claim is the thing to keep small. Absence claims in particular need coverage guarantees this method does not have.",
            },
            {
              text: "As a reason to discount the findings, since three quarters of attempts failed.",
              explain:
                "Too strong. A validated mechanism on one prompt is a real result about that mechanism. The success rate limits generality, not validity.",
            },
            {
              text: "As a temporary engineering limitation that better transcoders will remove.",
              explain:
                "Some of it is engineering — reconstruction error should improve. But frozen attention and the difficulty with inactive features are structural properties of the approach, not tuning problems.",
            },
            {
              text: "As irrelevant, since the case studies were independently validated by intervention.",
              explain:
                "Validation establishes that the found mechanisms are real. It says nothing about the mechanisms in the other three quarters, which is exactly what a coverage claim would need.",
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
          Two long papers, best read as figures first. Do the biology paper over
          three sittings and keep the methods companion open beside it for
          whenever you want to know how a claim was actually established.
        </p>
      ),
      readings: [
        {
          title: "On the Biology of a Large Language Model",
          authors: "Lindsey, Gurnee, Ameisen, Chen, Pearce, Batson, Olah, et al. (Anthropic)",
          year: 2025,
          url: "https://transformer-circuits.pub/2025/attribution-graphs/biology.html",
          kind: "paper",
          time: "5h, 3 sittings",
          essential: true,
          note: "Sitting 1: Multi-step Reasoning and Planning in Poems — the two cleanest arguments, and the template for how graph-plus-intervention works. Sitting 2: Multilingual Circuits, Addition, and Chain-of-thought Faithfulness — the three that should change how you think about model self-reports. Sitting 3: Entity Recognition and Hallucination, Refusals, Jailbreaks, and the Limitations section. Read every figure caption; the captions carry the caveats.",
        },
        {
          title: "Circuit Tracing: Revealing Computational Graphs in Language Models",
          authors: "Ameisen, Lindsey, Pearce, Gurnee, Batson, Olah, et al. (Anthropic)",
          year: 2025,
          url: "https://transformer-circuits.pub/2025/attribution-graphs/methods.html",
          kind: "paper",
          time: "2.5h",
          essential: true,
          note: "The methods companion. Read the cross-layer transcoder section and the local-replacement-model construction properly — those two ideas are the whole method. Then read the evaluation section for the numbers you should quote: 0.72 Spearman between graph predictions and interventions, 11.5% and 21.7% reconstruction error, and the compounding divergence across layers. Skim the rest.",
        },
        {
          title: "Tracing the thoughts of a large language model",
          authors: "Anthropic",
          year: 2025,
          url: "https://www.anthropic.com/research/tracing-thoughts-language-model",
          kind: "blog",
          time: "20 min",
          note: "The accessible companion to both papers. Read it first if the biology paper feels like too much at once, or hand it to a colleague who needs the gist. It is a good calibration check: notice which caveats survive the translation to a blog post and which quietly do not.",
        },
        {
          title:
            "Sparse Feature Circuits: Discovering and Editing Interpretable Causal Graphs in Language Models",
          authors: "Marks, Rager, Michaud, Belinkov, Bau & Mueller",
          year: 2024,
          url: "https://arxiv.org/abs/2403.19647",
          kind: "paper",
          time: "1h",
          note: "The academic parallel line: circuits built from SAE features, discovered by gradient attribution, on open models you can run. Read §3 for the method and §5 for SHIFT, where they edit a classifier to stop using a spurious feature — the clearest demonstration that feature circuits are actionable and not just descriptive.",
        },
        {
          title: "circuit-tracer",
          authors: "Anthropic & Decode Research",
          year: 2025,
          url: "https://github.com/safety-research/circuit-tracer",
          kind: "tool",
          time: "reference",
          note: "The open-source implementation of attribution graphs, usable on open-weights models. Read the graph-construction code alongside §2 of the methods paper — seeing the frozen Jacobian actually assembled is worth an hour of prose.",
        },
        {
          title: "Neuronpedia — attribution graph explorer",
          authors: "Johnny Lin, Joseph Bloom, et al.",
          year: "ongoing",
          url: "https://www.neuronpedia.org/gemma-2-2b/graph",
          kind: "tool",
          time: "2h (hands-on)",
          note: "Generate and explore attribution graphs in the browser for open models. Required for the explore problem. Budget time to fail on a few prompts before one produces a legible graph — that failure rate is itself the most useful thing the tool teaches.",
        },
      ],
    },
  ],
};

export default mod;
