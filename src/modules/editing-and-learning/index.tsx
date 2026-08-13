import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { CausalTracingHeatmap } from "./CausalTracingHeatmap";
import { EditRippleSimulator } from "./EditRippleSimulator";

const mod: CourseModule = {
  id: "5.2",
  slug: "editing-and-learning",
  title: "Editing Weights & Learning on the Fly",
  part: 5,
  tagline: "ROME, MEMIT, test-time training — what it takes to change what a model knows.",
  estMinutes: 180,
  objectives: [
      "Explain causal tracing and where facts live in MLPs",
      "Run a ROME edit and probe its ripple effects",
      "Compare ICL, LoRA, and editing for on-the-fly adaptation"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "where-facts-live",
      title: "Where does a fact live?",
      body: (
        <>
          <p>
            &ldquo;The Eiffel Tower is located in&rdquo; → &ldquo;Paris&rdquo;.
            Somewhere in a hundred billion floating-point numbers, that
            association is stored. Not metaphorically — you can find it, and you
            can change it, and the second thing is the subject of this module.
          </p>
          <p>
            The technique that located it is <strong>causal tracing</strong>, and
            it is activation patching (Module 3.5) pointed at a new question.
            Three runs:
          </p>
          <Figure caption="Causal tracing in three runs. Corrupt the subject to destroy the answer, then copy exactly one clean hidden state back in and see how much of the answer returns. Sweep over every (layer, token) pair and you get a map of which states the answer causally depends on.">
            <svg
              viewBox="0 0 468 218"
              className="w-full max-w-[468px]"
              role="img"
              aria-label="Three runs: a clean run predicting Paris, a corrupted run predicting nothing, and a restored run recovering the prediction"
            >
              <defs>
                <marker id="ct-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              {[
                { y: 8, name: "clean", p: "p(Paris) = 0.73", col: "var(--series-3)" },
                { y: 80, name: "corrupted", p: "p(Paris) = 0.05", col: "var(--series-2)" },
                { y: 152, name: "restored", p: "p(Paris) = 0.62", col: "var(--series-1)" },
              ].map((row, ri) => (
                <g key={row.name}>
                  <text x={4} y={row.y + 30} fontSize={11} fill={row.col} className="font-mono">
                    {row.name}
                  </text>
                  {["The", "Eiffel", "Tower", "is", "located", "in"].map((t, i) => {
                    const corrupted = ri >= 1 && (i === 1 || i === 2);
                    return (
                      <g key={t}>
                        <rect
                          x={72 + i * 48}
                          y={row.y + 14}
                          width={44}
                          height={24}
                          rx={4}
                          fill={corrupted ? "var(--surface-2)" : "var(--surface-1)"}
                          stroke={corrupted ? "var(--series-2)" : "var(--border-strong)"}
                          strokeDasharray={corrupted ? "3 2" : undefined}
                        />
                        <text
                          x={94 + i * 48}
                          y={row.y + 30}
                          textAnchor="middle"
                          fontSize={9}
                          fill={corrupted ? "var(--series-2)" : "var(--text-secondary)"}
                          className="font-mono"
                        >
                          {corrupted ? "noise" : t}
                        </text>
                      </g>
                    );
                  })}
                  <line
                    x1={362}
                    y1={row.y + 26}
                    x2={378}
                    y2={row.y + 26}
                    stroke="var(--text-muted)"
                    markerEnd="url(#ct-arr)"
                  />
                  <text x={382} y={row.y + 30} fontSize={10} fill={row.col} className="font-mono">
                    {row.p}
                  </text>
                </g>
              ))}
              <circle cx={168} cy={166} r={7} fill="var(--series-1)" />
              <text x={168} y={170} textAnchor="middle" fontSize={9} fill="var(--background)" className="font-mono">
                ↺
              </text>
              <text x={182} y={205} fontSize={10} fill="var(--series-1)" className="font-mono">
                copy one clean hidden state back in (here: layer 6 at “Tower”)
              </text>
            </svg>
          </Figure>
          <Term word="average indirect effect (AIE)">
            The recovery attributable to one restored state, averaged over many
            facts: <M>{String.raw`\mathrm{AIE} = \mathbb{E}\big[p_{\text{restored}} - p_{\text{corrupt}}\big]`}</M>.
            High AIE means the answer causally flows through that state.
          </Term>
          <p>
            Run that sweep and a specific shape appears — the one you will click
            around in the widget below. Two hot regions, not one. An{" "}
            <strong>early site</strong> at the <em>last token of the subject</em>{" "}
            in early-to-middle layers, and a <strong>late site</strong> at the
            final token in late layers. Restoring MLP outputs recovers the early
            site and not the late one; restoring attention outputs does the
            reverse.
          </p>
          <KeyIdea>
            The model looks up &ldquo;which city&rdquo; at the token{" "}
            <em>&ldquo;Tower&rdquo;</em> — before it has read the words
            &ldquo;located in&rdquo;. Mid-layer MLPs at the subject do the
            retrieval; late attention heads at the last position do the
            transport. Facts are recalled speculatively at the subject and moved
            into place later.
          </KeyIdea>
          <p>
            Why MLPs? Because an MLP layer is shaped exactly like a lookup table.
            Write it as{" "}
            <M>{String.raw`\mathrm{MLP}(x) = W_{\text{out}}\,\sigma(W_{\text{in}} x)`}</M>:
            the rows of <M>{String.raw`W_{\text{in}}`}</M> are{" "}
            <strong>keys</strong> that fire when the input matches a pattern, and
            the corresponding columns of{" "}
            <M>{String.raw`W_{\text{out}}`}</M> are the <strong>values</strong>{" "}
            that get written to the residual stream when they do. Geva et al.
            (2020) argued this &ldquo;key-value memory&rdquo; reading directly;
            ROME took it seriously enough to edit with it.
          </p>
          <Note kind="note" title="Two-thirds of the parameters">
            In a standard transformer the MLPs hold roughly two-thirds of the
            weights. If you had to guess where a model puts memorized facts
            before running a single experiment, &ldquo;the big lookup tables&rdquo;
            would be a reasonable prior — and it is nice, for once, when the
            experiment agrees with the prior.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "rome",
      title: "Editing: one rank-one update, and everything it breaks",
      body: (
        <>
          <p>
            Take the key-value picture literally. If the down-projection{" "}
            <M>{String.raw`W = W_{\text{out}}`}</M> is a linear associative
            memory mapping keys to values, then inserting a new memory is a
            constrained least-squares problem: change <M>W</M> as little as
            possible, subject to mapping one new key to one new value.
          </p>
          <MB>{String.raw`\hat W = \arg\min_{\tilde W} \; \big\| \tilde W K - W K \big\|_F \quad \text{subject to} \quad \tilde W k_* = v_*`}</MB>
          <p>
            The solution has a closed form, and it is <strong>rank one</strong>:
          </p>
          <MB>{String.raw`\hat W = W + \Lambda \, (C^{-1} k_*)^{\top}, \qquad \Lambda = \frac{v_* - W k_*}{(C^{-1}k_*)^{\top} k_*}`}</MB>
          <p>
            Term by term. <M>{String.raw`k_*`}</M> is the MLP&apos;s internal
            activation at the last subject token — the key for &ldquo;Eiffel
            Tower&rdquo;. <M>{String.raw`v_*`}</M> is a value vector found by
            gradient descent, chosen so that writing it there makes the model say
            &ldquo;Rome&rdquo;. <M>C</M> is the uncentered covariance{" "}
            <M>{String.raw`\mathbb{E}[kk^{\top}]`}</M> of keys over a big text
            sample — it is what makes the update respect which directions in key
            space are actually used, so you disturb common memories least. The
            whole change is an outer product of two vectors: one new
            memory, written in place, in about a second.
          </p>
          <Figure caption="ROME's update is an outer product — one column direction times one row direction. Keys orthogonal to C⁻¹k* pass through completely unchanged, which is why the edit can be surgical at all. MEMIT generalizes the same algebra to thousands of memories spread over a range of layers.">
            <svg
              viewBox="0 0 460 150"
              className="w-full max-w-[460px]"
              role="img"
              aria-label="Weight matrix plus the outer product of a value vector and a key vector equals the edited weight matrix"
            >
              <rect x={10} y={26} width={86} height={86} rx={4} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={53} y={74} textAnchor="middle" fontSize={16} fill="var(--text-secondary)" className="font-mono">W</text>
              <text x={53} y={128} textAnchor="middle" fontSize={10} fill="var(--text-muted)">original MLP</text>
              <text x={110} y={76} fontSize={18} fill="var(--text-muted)">+</text>

              <rect x={136} y={26} width={16} height={86} rx={3} fill="var(--series-2)" fillOpacity={0.35} stroke="var(--series-2)" />
              <text x={144} y={128} textAnchor="middle" fontSize={10} fill="var(--series-2)" className="font-mono">Λ</text>
              <rect x={158} y={26} width={86} height={16} rx={3} fill="var(--series-3)" fillOpacity={0.35} stroke="var(--series-3)" />
              <text x={201} y={56} textAnchor="middle" fontSize={10} fill="var(--series-3)" className="font-mono">(C⁻¹k*)ᵀ</text>
              <text x={190} y={100} textAnchor="middle" fontSize={10} fill="var(--text-muted)">rank 1</text>
              <text x={258} y={76} fontSize={18} fill="var(--text-muted)">=</text>

              <rect x={286} y={26} width={86} height={86} rx={4} fill="var(--surface-2)" stroke="var(--series-1)" />
              <text x={329} y={74} textAnchor="middle" fontSize={16} fill="var(--series-1)" className="font-mono">Ŵ</text>
              <text x={329} y={128} textAnchor="middle" fontSize={10} fill="var(--text-muted)">edited MLP</text>
              <text x={386} y={62} fontSize={10} fill="var(--text-muted)" className="font-mono">Ŵk* = v*</text>
              <text x={386} y={78} fontSize={10} fill="var(--text-muted)" className="font-mono">Ŵk ≈ Wk</text>
              <text x={386} y={92} fontSize={10} fill="var(--text-muted)" className="font-mono">otherwise</text>
            </svg>
          </Figure>
          <p>
            It works. Editing papers report near-100% <strong>efficacy</strong>{" "}
            (the edited prompt gives the new answer) and strong{" "}
            <strong>generalization</strong> (paraphrases give it too), with{" "}
            <strong>specificity</strong> (unrelated facts untouched) and{" "}
            <strong>fluency</strong> as the guardrail metrics. MEMIT scales the
            same algebra to thousands of simultaneous edits by spreading the
            update over a range of critical layers instead of one.
          </p>
          <p>
            And then you ask the model what country the Eiffel Tower is in, and
            it says France.
          </p>
          <KeyIdea>
            An edit changes one association. It does not change the beliefs that
            depended on that association, because nothing in a transformer
            recomputes downstream beliefs — there is no inference engine, only
            more stored associations. After the edit the model holds a set of
            beliefs that describe no possible world: a tower in Rome, in France,
            surrounded by French speakers.
          </KeyIdea>
          <p>
            Cohen et al. (2023) made this measurable with a benchmark of{" "}
            <strong>ripple effects</strong> — logical implications, compositions,
            two-hop questions, subject aliasing — and found editing methods that
            score in the nineties on standard efficacy score far lower once the
            neighbourhood is probed. The simulator below lets you feel the shape
            of it: generalization and specificity trade off along one dial, and
            ripple consistency is not on that dial at all.
          </p>
          <Note kind="warning" title="Localization does not tell you where to edit">
            The tidiest story in this module is: causal tracing finds the fact at
            layer <M>{String.raw`\ell`}</M>, therefore edit at layer{" "}
            <M>{String.raw`\ell`}</M>. Hase et al. (2023) tested that story and it
            failed. Where tracing says a fact is localized turns out to be
            essentially uncorrelated with where editing that fact works best; you
            can successfully edit at layers tracing calls unimportant. Both
            techniques are sound and they answer different questions —{" "}
            <em>where does information flow</em> is not{" "}
            <em>where can I write information</em>. It is the single most useful
            piece of epistemic hygiene in this module, and it generalizes: a
            causal claim about a forward pass is not automatically a claim about
            weights.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "fast-weights",
      title: "Learning on the fly: what actually works",
      body: (
        <>
          <p>
            You came to this course partly wanting models that learn while you
            talk to them. Here is the honest state of it, arranged from cheapest
            to most invasive.
          </p>
          <p>
            <strong>In-context learning</strong> is the one that already works.
            The residual stream <em>is</em> a scratchpad, induction heads (Module
            3.2) <em>are</em> a copy-from-context mechanism, and the effect of a
            few-shot prompt is often well described as an implicit weight update
            — the &ldquo;fast weights&rdquo; framing. Nothing is stored, so
            nothing is corrupted; the trade is that it lasts exactly as long as
            the context window and costs tokens every single call.
          </p>
          <p>
            <strong>Test-time training</strong> is the interesting middle. Hardt
            and Sun (2023) build a nearest-neighbour index over a large corpus,
            retrieve the neighbours of the current input, take a few gradient
            steps on them, answer, and throw the update away. Perplexity gains
            are large, and largest on exactly the data a model is worst at: rare,
            tail, domain-specific text. The cost is a training step inside your
            request path — which is a lot to ask of a serving stack, and the main
            reason you do not see it in products.
          </p>
          <p>
            <strong>Fine-tuning and LoRA</strong> are the durable option, and the
            one that pays the classic tax:
          </p>
          <Term word="catastrophic forgetting">
            Training on new data overwrites the representations that supported old
            behavior, because gradient descent has no notion of &ldquo;leave that
            part alone&rdquo;. Named in the connectionist literature in 1989 and
            never solved, only managed — with replay of old data, with parameter
            regularization, or by constraining the update to a low-rank subspace
            as LoRA does.
          </Term>
          <p>
            <strong>Editing</strong> is the most surgical and the most brittle,
            for all the reasons above. And the brittleness compounds: sequential
            edits applied one after another degrade the model, and papers on
            large-scale sequential editing report accumulating damage to fluency
            and to unrelated knowledge well before you reach the number of edits a
            real deployment would need.
          </p>
          <KeyIdea>
            No frontier model in production today updates its weights from your
            conversations. What ships as &ldquo;memory&rdquo; is retrieval:
            text written to a store and pulled back into context. That is not a
            stopgap for the lack of a better method so much as a consequence of
            everything in this module — weight updates are irreversible, hard to
            evaluate, hard to attribute, and hard to roll back, and text in a
            database is none of those things.
          </KeyIdea>
          <p>
            The open research direction is the one you would guess: architectures
            with a separate, addressable, <em>revisable</em> memory, so that
            learning a new fact is a write to a store rather than a perturbation
            of the function that computes everything. Nobody has made that work
            at frontier scale. It remains one of the more attractive open
            problems in the field, and it is unusually well suited to someone who
            thinks like an engineer about state management.
          </p>
          <Note kind="safety">
            Editing is quietly a safety topic in three directions. First,{" "}
            <strong>unlearning</strong>: if a model has memorized something
            dangerous, targeted removal is much more attractive than retraining —
            but current evaluations repeatedly find that &ldquo;removed&rdquo;
            knowledge is recoverable by rephrasing, by fine-tuning on adjacent
            data, or by asking in another language, which means the information
            was suppressed rather than deleted. Second,{" "}
            <strong>attribution</strong>: a rank-one edit is a tiny, targeted,
            hard-to-detect change to open weights, which is a supply-chain
            problem waiting to happen. Third, the pattern you should carry into
            5.3: an intervention that passes your eval and fails your neighbourhood
            probes has not fixed the model, it has fixed your eval. Sleeper
            Agents is the same lesson in a much scarier setting.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Play: find the fact, then break it",
      body: (
        <>
          <p>
            First locate the fact, then move it and watch the neighbourhood.
            These two widgets are the module in miniature: the first is why
            people believed editing would work, the second is why it mostly
            doesn&apos;t.
          </p>
          <CausalTracingHeatmap />
          <EditRippleSimulator />
          <p>
            Things to try: (1) In the heatmap, switch between MLP-only and
            attention-only and watch the hot region jump from the subject to the
            last token — that single contrast is ROME&apos;s whole argument for
            editing MLPs rather than attention. (2) Click a cell at the last
            token in layer 5 and one at &ldquo;Tower&rdquo; in layer 5: same
            layer, wildly different effect. Position matters more than depth
            here. (3) In the simulator, set λ low, run all probes, and note which
            column is red; then set λ to 95 and run again. You should be able to
            state the tradeoff in one sentence. (4) Find the probe that is
            secretly useless and work out what makes it useless before reading
            its note — then go check whether your own evals at work contain one
            like it.
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
          Problem 2 is the one to do carefully — once you have verified the
          rank-one update by hand, ROME stops being a black box forever. The
          three-way comparison in problem 4 is the most useful thing in this
          module for actual engineering work.
        </p>
      ),
      problems: [
        {
          id: "read-the-trace",
          kind: "pencil",
          title: "Read the trace",
          prompt: (
            <>
              <p>
                Using the heatmap widget: (a) Why is the early site at{" "}
                <em>&ldquo;Tower&rdquo;</em> rather than at{" "}
                <em>&ldquo;Eiffel&rdquo;</em>? (b) The tokens
                &ldquo;located&rdquo; and &ldquo;in&rdquo; show almost no effect
                at any layer, even though they are the relation. What does that
                tell you about when the lookup happens? (c) Predict the heatmap
                for the prompt &ldquo;The city containing the Eiffel Tower
                is&rdquo; — where the subject now ends one token before the
                prediction — and say specifically what would change.
              </p>
            </>
          ),
          hint: (
            <p>
              Attention is causal: a token&apos;s representation can depend on
              everything to its left and nothing to its right. Ask at which
              position the model first has the complete subject available.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) &ldquo;Eiffel&rdquo; cannot see &ldquo;Tower&rdquo; — causal
                masking forbids it. Only at the last subject token is the full
                multi-token subject assembled, so only there can the MLPs key on
                the entity rather than on a fragment. The residual effect at
                &ldquo;Eiffel&rdquo; is real but smaller, which fits: a partial
                subject is a partial key.
              </p>
              <p>
                (b) The lookup has already happened by the time the relation is
                read. The model retrieves salient attributes of a subject
                speculatively when it encounters the subject, and the relation
                tokens mostly select which already-retrieved attribute to
                transport. That is a genuinely counterintuitive result and the
                reason the early site is at the subject rather than at
                &ldquo;in&rdquo;.
              </p>
              <p>
                (c) The early site should move with the subject and stay at the
                last subject token (&ldquo;Tower&rdquo;), which is now adjacent
                to the prediction. The late site should compress or partly merge
                with the early site, because the transport distance is one token
                instead of three — with less to move, the late attention
                contribution shrinks. The layer of the early site should barely
                move; it is a property of the model, not of the sentence.
              </p>
            </>
          ),
        },
        {
          id: "rank-one",
          kind: "pencil",
          title: "Verify the rank-one update",
          prompt: (
            <>
              <p>
                Let <M>{String.raw`W = I`}</M> (2×2), <M>{String.raw`C = I`}</M>,{" "}
                <M>{String.raw`k_* = (1,0)^{\top}`}</M> and{" "}
                <M>{String.raw`v_* = (0,2)^{\top}`}</M>.
              </p>
              <p>
                (a) Compute <M>{String.raw`\Lambda`}</M> and{" "}
                <M>{String.raw`\hat W`}</M> from the formula. (b) Check{" "}
                <M>{String.raw`\hat W k_* = v_*`}</M>. (c) Compute{" "}
                <M>{String.raw`\hat W k`}</M> for{" "}
                <M>{String.raw`k = (0,1)^{\top}`}</M> and explain the result in
                terms of specificity. (d) In a real model{" "}
                <M>{String.raw`C \neq I`}</M> — what does the{" "}
                <M>{String.raw`C^{-1}`}</M> actually buy you?
              </p>
            </>
          ),
          hint: (
            <p>
              Everything is a rank-one outer product{" "}
              <M>{String.raw`\Lambda u^{\top}`}</M> with{" "}
              <M>{String.raw`u = C^{-1}k_*`}</M>. Applying it to a vector{" "}
              <M>k</M> gives <M>{String.raw`\Lambda (u^{\top} k)`}</M> — a
              scalar times a fixed direction.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`C^{-1}k_* = (1,0)^{\top}`}</M>, so the
                denominator is <M>{String.raw`(1,0)\cdot(1,0) = 1`}</M> and{" "}
                <M>{String.raw`\Lambda = v_* - Wk_* = (0,2) - (1,0) = (-1,2)^{\top}`}</M>.
                Then{" "}
                <M>{String.raw`\Delta W = \Lambda (1,0) = \begin{pmatrix}-1 & 0\\ 2 & 0\end{pmatrix}`}</M>{" "}
                and{" "}
                <M>{String.raw`\hat W = \begin{pmatrix}0 & 0\\ 2 & 1\end{pmatrix}`}</M>.
              </p>
              <p>
                (b) <M>{String.raw`\hat W (1,0)^{\top} = (0,2)^{\top} = v_*`}</M>.
                The constraint is satisfied exactly, not approximately — this is
                an interpolation, not a fit.
              </p>
              <p>
                (c) <M>{String.raw`\hat W (0,1)^{\top} = (0,1)^{\top} = W k`}</M>{" "}
                — completely unchanged, because{" "}
                <M>{String.raw`u^{\top}k = 0`}</M>. That is the mathematical
                content of &ldquo;specificity&rdquo;: any key orthogonal to{" "}
                <M>{String.raw`C^{-1}k_*`}</M> is untouched at any edit strength.
                Real keys are almost never exactly orthogonal, so real edits leak
                a little into every memory, in proportion to overlap.
              </p>
              <p>
                (d) <M>{String.raw`C^{-1}`}</M> whitens the key space using
                second-order statistics from real text. Without it you would
                perturb along <M>{String.raw`k_*`}</M> itself, which may point
                along a high-variance direction that many other memories also use
                — maximum collateral damage. With it, you perturb along the
                direction that isolates <M>{String.raw`k_*`}</M> from the keys the
                model actually encounters. It is the difference between shouting
                and speaking into the one channel nobody else is on.
              </p>
            </>
          ),
        },
        {
          id: "run-rome",
          kind: "code",
          title: "Move the Eiffel Tower",
          prompt: (
            <>
              <p>
                Using EasyEdit (
                <a href="https://github.com/zjunlp/EasyEdit" target="_blank" rel="noreferrer">
                  github.com/zjunlp/EasyEdit
                </a>
                ) or the original ROME repository (
                <a href="https://github.com/kmeng01/rome" target="_blank" rel="noreferrer">
                  github.com/kmeng01/rome
                </a>
                ), apply ROME to GPT-2 XL or GPT-J to make the Eiffel Tower be in
                Rome.
              </p>
              <p>
                Then run the probe suite from the simulator against the real
                edited model: the edited prompt, three paraphrases, one
                cross-lingual phrasing, the two-hop country and language
                questions, and two unrelated Paris facts.
              </p>
              <p>
                Success check: a table of nine prompts × (pre-edit, post-edit)
                answers, plus a one-paragraph verdict naming which of efficacy,
                generalization, specificity and ripple consistency your edit
                actually achieved.
              </p>
            </>
          ),
          hint: (
            <p>
              The covariance statistics <M>C</M> take a while to compute the
              first time; both repositories ship precomputed ones for the common
              models — use them. If your edit shows 100% efficacy and nothing
              else, that is the expected result, not a bug in your setup.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should see, and what the literature reports: the edited
                prompt and close paraphrases flip cleanly. Cross-lingual and
                described-subject phrasings are hit or miss. The two-hop
                questions almost certainly still answer France and French. One or
                two unrelated Paris facts may wobble.
              </p>
              <p>
                The verdict paragraph should say something like: &ldquo;Efficacy
                1.0, paraphrase generalization 3/3, cross-lingual 0/1, ripple
                consistency 0/2, specificity 2/2. The edit changed a stored
                association and nothing that depends on it. As a mechanism for
                correcting a model&apos;s beliefs it is not sufficient; as a
                mechanism for correcting a model&apos;s <em>outputs</em> on a
                known prompt distribution it is very cheap and very
                effective.&rdquo; That distinction is the deliverable.
              </p>
            </>
          ),
        },
        {
          id: "three-way",
          kind: "code",
          title: "ICL vs LoRA vs ROME on the same fact",
          prompt: (
            <>
              <p>
                Take one fact your model gets wrong and install it three ways:
                (1) in context, as a sentence in the prompt; (2) with a LoRA
                fine-tune on ~50 generated sentences expressing the fact and its
                consequences; (3) with a single ROME edit.
              </p>
              <p>
                Evaluate all three on the same probe suite from problem 3, and
                additionally on a 100-item general benchmark (a slice of MMLU or
                just perplexity on a held-out corpus) to measure collateral
                damage.
              </p>
              <p>
                Success check: a 3 × 5 table — method by (efficacy,
                generalization, ripple consistency, specificity, general
                capability delta) — plus wall-clock cost per method and one
                sentence on when you would choose each.
              </p>
            </>
          ),
          hint: (
            <p>
              Give the LoRA arm a fair shot: include the two-hop consequences in
              its training data. Whether it then gets the ripple probes right is
              the single most informative number in the whole table, because it
              separates &ldquo;editing is hard&rdquo; from &ldquo;this method is
              hard&rdquo;.
            </p>
          ),
          solution: (
            <>
              <p>
                The expected ordering: ICL wins on everything except persistence
                and cost-per-call — it generalizes, it ripples correctly (the
                model reasons from the stated fact), and it damages nothing,
                because nothing changed. LoRA with consequence data gets ripple
                probes substantially right, at the cost of a measurable general
                capability dip and an hour of work. ROME is instant and surgical
                and ripples not at all.
              </p>
              <p>
                The sentence you should end up writing is close to: &ldquo;Use
                context when the fact fits in it and you can retrieve it; use
                LoRA when you need many related facts to hold together and can
                afford an eval suite; use editing when you need one specific
                output changed in weights you control and you have probed the
                neighbourhood yourself.&rdquo; If your LoRA arm ripples correctly,
                you have also demonstrated something worth saying out loud:
                ripple failure is a property of rank-one editing, not an
                inevitable feature of changing a model&apos;s knowledge.
              </p>
            </>
          ),
        },
        {
          id: "ripple-eval",
          kind: "pencil",
          title: "Design a ripple-effect eval you would actually ship",
          prompt: (
            <>
              <p>
                Your team wants to correct a factual error about your product in
                a deployed open-weights model, using an edit rather than a
                retrain. Write the eval that decides whether the edit ships.
              </p>
              <p>
                It must cover: the edited fact, paraphrases, two-hop
                consequences, subject aliases, the negation, the temporal version
                (&ldquo;what was true before&rdquo;), unrelated neighbours, and a
                general-capability regression check. For each category, give
                three example items and the pass threshold you would defend to a
                sceptical reviewer.
              </p>
            </>
          ),
          hint: (
            <p>
              At least one category should have a pass threshold you know the
              edit will fail. An eval that your method passes by construction is
              a marketing document.
            </p>
          ),
          solution: (
            <>
              <p>
                A defensible skeleton. <strong>Edited fact</strong> (3 items,
                threshold 3/3 — anything less means the edit did not take).{" "}
                <strong>Paraphrases</strong> (10 items, 8/10; below that you have
                patched a string, not an association).{" "}
                <strong>Subject aliases</strong> — the product&apos;s full name,
                its abbreviation, its internal codename (6 items, 5/6).{" "}
                <strong>Two-hop</strong> — questions whose answer requires
                chaining through the edited fact (8 items, and here you set the
                threshold at whatever the pre-edit model scored, because the
                requirement is &ldquo;do not make it worse&rdquo;, and you should
                expect to fail a stricter one).
              </p>
              <p>
                <strong>Negation</strong> (&ldquo;is it true that X is
                Y?&rdquo;, 6 items, 5/6 — editing methods are known to leave
                negated forms inconsistent).{" "}
                <strong>Temporal</strong> (&ldquo;before the change, what
                was…&rdquo;, 4 items — flag rather than gate, since the desired
                behaviour is a product decision).{" "}
                <strong>Unrelated neighbours</strong> — 30 facts about the same
                entity type and the same relation, threshold 30/30 exact match
                with the pre-edit model, no exceptions.{" "}
                <strong>Regression</strong> — 500-item benchmark slice plus
                held-out perplexity, threshold: within noise, where you have
                measured noise by running the unedited model twice.
              </p>
              <p>
                The reviewer-facing sentence: &ldquo;We gate on efficacy,
                paraphrase, alias, negation and specificity; we report and do not
                gate on two-hop and temporal, because no current editing method
                achieves them and pretending otherwise would mean shipping on a
                threshold we set to be passable.&rdquo;
              </p>
            </>
          ),
        },
        {
          id: "hase-critique",
          kind: "explore",
          title: "Localization vs editing: the argument, both sides",
          prompt: (
            <>
              <p>
                Read Hase et al. 2023 (linked below), then write two paragraphs.
                First: the strongest version of their critique — what exactly did
                they show, and what does it invalidate?
              </p>
              <p>
                Second: the strongest reply a ROME author could make. Does the
                result undermine causal tracing as a method, undermine editing as
                a method, or undermine only the inference from one to the other?
                Say which and defend it.
              </p>
            </>
          ),
          hint: (
            <p>
              Be precise about what causal tracing measures — an effect on a
              forward pass under a specific corruption — and what edit success
              measures. Ask whether there is any reason those two quantities{" "}
              <em>should</em> have correlated.
            </p>
          ),
          solution: (
            <>
              <p>
                <strong>The critique.</strong> Hase and colleagues took the
                natural inference — tracing localizes a fact to layer{" "}
                <M>{String.raw`\ell`}</M>, so layer <M>{String.raw`\ell`}</M> is
                where to edit it — and tested it directly. Edit success is
                essentially uncorrelated with tracing-derived localization: facts
                can be edited successfully at layers tracing calls unimportant,
                and choosing the layer by tracing does not beat choosing a fixed
                layer. What this invalidates is a methodological habit, and a
                widespread one: treating a localization result as a map of where
                to intervene on weights.
              </p>
              <p>
                <strong>The reply.</strong> The result undermines the inference,
                not either method. Causal tracing answers &ldquo;through which
                states does this prediction flow, under noise corruption of the
                subject?&rdquo; — a claim about one forward pass. Editing answers
                &ldquo;at which parameters can I write a new association with
                least collateral damage?&rdquo; — a claim about a loss surface
                over weights. Information can flow through a state whose weights
                are a terrible place to write, because many parameter settings
                produce the same activation, and the easiest one to reach is not
                the one the trace pointed at. Read that way, ROME&apos;s
                empirical success stands, tracing&apos;s findings stand, and the
                casualty is the bridge between them.
              </p>
              <p>
                The transferable lesson, and the reason this problem exists: in
                interpretability, <em>where the information is</em> and{" "}
                <em>where the intervention works</em> are separate empirical
                questions, and you have to run both experiments. Carry it into
                5.3, where the same gap shows up as the difference between
                finding a feature that correlates with deception and finding the
                mechanism that produces it.
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
              In causal tracing, why are the subject tokens corrupted with noise
              rather than replaced with a different subject?
            </>
          ),
          choices: [
            {
              text: "Noise destroys the subject information without substituting a competing, well-formed alternative — so any recovery is attributable to the restored state rather than to a rival fact.",
              correct: true,
              explain:
                "The design goal is a clean baseline where the answer is unavailable for one identifiable reason. Substituting another subject introduces a second complete fact, and you can no longer tell whether recovery came from your restoration or from competition between two associations.",
            },
            {
              text: "Replacing the subject would change the number of tokens and break the position alignment needed for patching.",
              explain:
                "A real practical concern, and easily handled by choosing a length-matched substitute. It is a nuisance, not the reason for the design choice.",
            },
            {
              text: "Noise is required for the average indirect effect to be well defined.",
              explain:
                "AIE is defined for any corruption you choose, including subject substitution — several papers do exactly that. The choice is about interpretability of the result, not about the definition.",
            },
            {
              text: "Because Gaussian noise is the corruption the model saw during pretraining.",
              explain:
                "Models are not pretrained on noised embeddings. The noise is deliberately off-distribution, which is itself a known criticism of the method — off-distribution corruption can produce effects that would not appear under a natural one.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              The heatmap shows the early site at{" "}
              <em>&ldquo;Tower&rdquo;</em> — the last subject token — and almost
              nothing at &ldquo;located in&rdquo;. The best reading is:
            </>
          ),
          choices: [
            {
              text: "The model retrieves attributes of the subject as soon as it finishes reading the subject, before it knows which attribute the prompt is asking for.",
              correct: true,
              explain:
                "This is the surprising finding and it holds up: lookup is speculative and happens at the subject; the relation tokens and late attention heads mostly select and transport what was already fetched.",
            },
            {
              text: "The relation tokens are unimportant to the prediction.",
              explain:
                "They are essential — change 'located in' to 'was designed by' and the answer changes completely. Their low restoration effect means the relation is not where the corrupted information was destroyed, not that the relation does no work.",
            },
            {
              text: "Attention heads at the subject token do the factual lookup.",
              explain:
                "The mode toggle disagrees. Restoring attention alone barely recovers the early site while restoring MLPs alone nearly fully recovers it — that dissociation is the argument that MLPs hold the association.",
            },
            {
              text: "The fact is stored in the token embedding for 'Tower'.",
              explain:
                "The effect peaks in middle layers, not at layer 0. If the embedding carried the answer, restoring the earliest layers would be enough — and it is not.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              ROME&apos;s update is <M>{String.raw`\hat W = W + \Lambda (C^{-1}k_*)^{\top}`}</M>.
              What is the role of <M>C</M>?
            </>
          ),
          choices: [
            {
              text: "It is the second-moment matrix of keys over real text, and inverting it directs the update along a direction that other frequently-used keys overlap with least.",
              correct: true,
              explain:
                "Exactly — it is what makes the edit least-damaging rather than merely correct. Without it you would push along k* itself, which may be a direction many other memories rely on.",
            },
            {
              text: "It normalizes the update so the edited weights keep the same Frobenius norm.",
              explain:
                "Nothing here preserves the norm, and there is no reason to want that. The objective minimizes the change in outputs on real keys, which is a different and more useful constraint.",
            },
            {
              text: "It is the covariance of the model's outputs, used to keep the output distribution calibrated.",
              explain:
                "C is computed over MLP keys — internal activations — not over outputs. The constraint acts in key space, which is where interference between memories happens.",
            },
            {
              text: "It is a learned parameter optimized jointly with the new value vector.",
              explain:
                "C is estimated once by sampling activations over a corpus and then cached and reused for every edit. Only v* is obtained by optimization.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              After editing &ldquo;Eiffel Tower is in Paris&rdquo; → Rome, the
              model still says the Eiffel Tower is in France. Why?
            </>
          ),
          choices: [
            {
              text: "The country fact is a separately stored association; nothing in the architecture recomputes beliefs that depended on the edited one.",
              correct: true,
              explain:
                "This is the ripple problem stated precisely. A transformer holds associations, not a database with foreign keys — there is no update propagation, and no mechanism that would notice the inconsistency.",
            },
            {
              text: "The edit strength was too low; a larger update would propagate to the country fact.",
              explain:
                "Turning the edit up makes it leak into unrelated subjects — the specificity failure — long before it would touch the two-hop fact. The two failures are on different axes, which is exactly what the simulator's dial demonstrates.",
            },
            {
              text: "ROME edits only one layer; MEMIT's multi-layer version fixes ripple effects.",
              explain:
                "MEMIT solves a different problem — many edits at once, at scale. Ripple consistency remains poor for both, and Cohen et al. measured this across methods.",
            },
            {
              text: "The country fact is stored in attention rather than in MLPs, and ROME only edits MLPs.",
              explain:
                "Both facts trace to mid-layer MLPs at their respective subjects. The issue is not which component stores it but that it is a different, independently stored association.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              Hase et al. found that where causal tracing localizes a fact is
              roughly uncorrelated with where editing that fact succeeds. The
              right conclusion is:
            </>
          ),
          choices: [
            {
              text: "Both methods remain valid; what fails is the inference from one to the other, because 'where information flows in a forward pass' and 'where I can write a new association' are different questions.",
              correct: true,
              explain:
                "The cleanest statement of the result, and the transferable lesson. Many parameter settings produce the same activation, so a state can be causally important without its weights being the best place to intervene.",
            },
            {
              text: "Causal tracing is unsound and its results should be discarded.",
              explain:
                "The tracing results replicate and describe real information flow. The paper does not challenge the measurements; it challenges what people inferred from them.",
            },
            {
              text: "Model editing does not really work, since it is not editing where the fact is.",
              explain:
                "Editing measurably works on its own metrics — efficacy and paraphrase generalization are high. Its problems are ripple effects and sequential degradation, not the layer-choice question.",
            },
            {
              text: "Facts are not localized in models at all; they are fully distributed.",
              explain:
                "Too strong, and not what was shown. Tracing finds concentrated, reproducible effects at the subject's last token in mid layers. Localization of information flow is real; it just does not hand you an editing recipe.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              A colleague proposes shipping a product where the model
              permanently learns from each user conversation by fine-tuning on
              it nightly. The strongest technical objection is:
            </>
          ),
          choices: [
            {
              text: "Sequential updates accumulate catastrophic forgetting and are hard to attribute or roll back — you cannot tell which of ten thousand updates caused a regression, or undo just that one.",
              correct: true,
              explain:
                "Both halves matter, and the second is the one engineers underrate. Weight updates compose irreversibly; a text store composes reversibly. That asymmetry is most of why production memory is retrieval.",
            },
            {
              text: "Fine-tuning cannot install new facts, so the feature could not work at all.",
              explain:
                "Fine-tuning is the one technique in this module that reliably does install new knowledge. The objection is about operating it safely over time, not about capability.",
            },
            {
              text: "Nightly fine-tuning would be too slow to run on modern hardware.",
              explain:
                "A LoRA pass over a day of conversations is entirely tractable. Compute is not the binding constraint here.",
            },
            {
              text: "The model would become too specialized to individual users, which users would dislike.",
              explain:
                "Personalization is arguably the point of the feature. The problem is that the mechanism damages the shared model and cannot be inspected or reverted per update.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              You add a specificity probe to your edit eval: &ldquo;The Colosseum
              is located in ___&rdquo;, expecting Rome. Why is this a bad probe
              for the Paris → Rome edit?
            </>
          ),
          choices: [
            {
              text: "Its correct answer is the edit's new target, so it reads as passing whether or not the edit leaked into it.",
              correct: true,
              explain:
                "The probe has no discriminating power: both the healthy model and a model whose edit has leaked everywhere output Rome. Specificity probes must have answers that differ from the edit target.",
            },
            {
              text: "The Colosseum is not semantically related to the Eiffel Tower, so it cannot detect bleedover.",
              explain:
                "Distant items are perfectly legitimate specificity probes — you do want to check that far-away knowledge survives. The defect here is the coincidence of answers, not the distance.",
            },
            {
              text: "It is a two-hop question, and two-hop questions always fail after editing.",
              explain:
                "It is a single-hop lookup about a different subject. Two-hop failures are real but this is not one.",
            },
            {
              text: "Specificity should only be measured on the edited subject.",
              explain:
                "Backwards — specificity is by definition about everything other than the edited fact. Measuring it on the edited subject would measure efficacy instead.",
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
          Read ROME for the method and the beauty of it, Hase immediately after
          for the corrective, and Cohen for what an honest evaluation looks like.
          The rest are for when you need them.
        </p>
      ),
      readings: [
        {
          title: "Locating and Editing Factual Associations in GPT (ROME)",
          authors: "Kevin Meng, David Bau, Alex Andonian, Yonatan Belinkov",
          year: 2022,
          url: "https://arxiv.org/abs/2202.05262",
          kind: "paper",
          time: "2h",
          essential: true,
          note: "One of the best-constructed papers in the field. Read §2 (causal tracing) slowly and make sure you can redraw Figure 1 from memory — that figure is the widget above. §3 is the rank-one derivation; do problem 2 alongside it rather than after. The evaluation section is where to notice what is and is not measured: efficacy, generalization, specificity, fluency — and no ripple metric, which is precisely the gap Cohen et al. filled.",
        },
        {
          title: "Does Localization Inform Editing? Surprising Differences in Causality-Based Localization vs. Knowledge Editing in Language Models",
          authors: "Peter Hase, Mohit Bansal, Been Kim, Asma Ghandeharioun",
          year: 2023,
          url: "https://arxiv.org/abs/2301.04213",
          kind: "paper",
          time: "1.5h",
          essential: true,
          note: "Read this straight after ROME, while the localization story still feels obvious — the effect is much stronger that way. Focus on the experimental design: what would have had to be true for tracing to predict edit success, and how they tested it. This is the paper that should permanently change how you read localization claims in any interpretability paper.",
        },
        {
          title: "Evaluating the Ripple Effects of Knowledge Editing in Language Models",
          authors: "Roi Cohen, Eden Biran, Ori Yoran, Amir Globerson, Mor Geva",
          year: 2023,
          url: "https://arxiv.org/abs/2307.12976",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The benchmark that made ripple failure a number instead of an anecdote. Read the taxonomy of ripple types (logical generalization, composition, subject aliasing, forgetfulness) and steal it wholesale for problem 5 — it is a better eval design than most people would produce from scratch.",
        },
        {
          title: "Mass-Editing Memory in a Transformer (MEMIT)",
          authors: "Kevin Meng, Arnab Sen Sharma, Alex Andonian, Yonatan Belinkov, David Bau",
          year: 2022,
          url: "https://arxiv.org/abs/2210.07229",
          kind: "paper",
          time: "1h",
          note: "The scaled-up sequel: thousands of edits at once by spreading the update across a range of critical layers. Read §3 for the multi-layer least-squares generalization and skim the rest. The useful question to hold while reading: does editing ten thousand facts at once make the ripple problem better, worse, or neither?",
        },
        {
          title: "Transformer Feed-Forward Layers Are Key-Value Memories",
          authors: "Mor Geva, Roei Schuster, Jonathan Berant, Omer Levy",
          year: 2020,
          url: "https://arxiv.org/abs/2012.14913",
          kind: "paper",
          time: "1h",
          note: "The conceptual foundation everything in this module stands on. Read §2–3 for the key-value framing and the evidence that individual keys correspond to human-recognizable input patterns. Short, clear, and it makes the ROME derivation feel inevitable rather than clever.",
        },
        {
          title: "Test-Time Training on Nearest Neighbors for Large Language Models",
          authors: "Moritz Hardt, Yu Sun",
          year: 2023,
          url: "https://arxiv.org/abs/2305.18466",
          kind: "paper",
          time: "45 min",
          note: "The cleanest demonstration that a gradient step at inference time is a real option. Read the setup and the results table, and pay attention to where the gains concentrate — tail and domain-specific data, which is exactly where retrieval-only approaches also shine. Worth asking yourself which of the two you would build first.",
        },
        {
          title: "A Comprehensive Study of Knowledge Editing for Large Language Models",
          authors: "Ningyu Zhang et al.",
          year: 2024,
          url: "https://arxiv.org/abs/2401.01286",
          kind: "paper",
          time: "reference",
          note: "A survey plus the KnowEdit benchmark — use it as a map rather than a read. Go to it when you need to know what family a method belongs to (memory-based, meta-learning, locate-then-edit) or want a defensible baseline set for an experiment. The failure-mode discussion near the end is the part worth reading properly.",
        },
      ],
    },
  ],
};

export default mod;
