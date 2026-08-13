import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { SteeringStrengthDemo } from "./SteeringStrengthDemo";
import { ToolChooser } from "./ToolChooser";
import { PersonaWorksheet } from "./PersonaWorksheet";

const mod: CourseModule = {
  id: "5.1",
  slug: "steering",
  title: "Steering Behavior & Making Models Enjoyable",
  part: 5,
  tagline: "Activation addition, persona vectors, Golden Gate Claude — behavior control without retraining.",
  estMinutes: 180,
  objectives: [
      "Build a contrastive steering vector and sweep its strength",
      "Compare system prompts, fine-tuning, and steering for behavior change",
      "Decompose 'enjoyable to talk to' into measurable traits"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "directions",
      title: "Behavior lives in directions",
      body: (
        <>
          <p>
            Everything so far has been about <em>reading</em> models. This module
            is where you start writing to them. And the write operation is
            absurdly simple: pick a layer, pick a direction in the residual
            stream, add it. The model&apos;s behavior changes, immediately, with
            no gradient step and no training data.
          </p>
          <p>
            That this works at all is the linear representation hypothesis
            cashing out. If a concept — formality, refusal, the Golden Gate
            Bridge — is encoded as a direction that downstream layers read with
            a dot product, then pushing the residual stream along that direction
            is indistinguishable, to those layers, from the concept being more
            present. You are not tricking the model. You are speaking its
            internal language.
          </p>
          <p>
            The hard part is <strong>finding</strong> the direction. The workhorse
            recipe is <strong>contrastive activation addition</strong> (CAA), and
            it is one subtraction:
          </p>
          <Figure caption="The CAA recipe. Build matched prompt pairs that differ only in the trait you care about, cache the residual stream at one layer, average each side, subtract. The difference of means is your steering vector; everything the pairs share cancels out.">
            <svg
              viewBox="0 0 480 212"
              className="w-full max-w-[480px]"
              role="img"
              aria-label="Contrastive prompt pairs are averaged at one layer and subtracted to give a steering vector, which is then added to the residual stream"
            >
              <defs>
                <marker id="steer-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              <rect x={6} y={14} width={128} height={54} rx={6} fill="var(--surface-2)" stroke="var(--series-1)" />
              <text x={70} y={34} textAnchor="middle" fontSize={11} fill="var(--series-1)" className="font-mono">
                positive prompts
              </text>
              <text x={70} y={50} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                …answer formally: (A)
              </text>
              <text x={70} y={62} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                × 240 pairs
              </text>

              <rect x={6} y={92} width={128} height={54} rx={6} fill="var(--surface-2)" stroke="var(--series-2)" />
              <text x={70} y={112} textAnchor="middle" fontSize={11} fill="var(--series-2)" className="font-mono">
                negative prompts
              </text>
              <text x={70} y={128} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                …answer casually: (B)
              </text>
              <text x={70} y={140} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                same question, other option
              </text>

              <line x1={136} y1={41} x2={168} y2={41} stroke="var(--text-muted)" markerEnd="url(#steer-arr)" />
              <line x1={136} y1={119} x2={168} y2={119} stroke="var(--text-muted)" markerEnd="url(#steer-arr)" />

              <circle cx={196} cy={41} r={22} fill="none" stroke="var(--series-1)" strokeWidth={1.5} />
              <text x={196} y={46} textAnchor="middle" fontSize={13} fill="var(--text-primary)" className="font-mono">
                a⁺
              </text>
              <circle cx={196} cy={119} r={22} fill="none" stroke="var(--series-2)" strokeWidth={1.5} />
              <text x={196} y={124} textAnchor="middle" fontSize={13} fill="var(--text-primary)" className="font-mono">
                a⁻
              </text>
              <text x={196} y={82} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                mean at layer ℓ
              </text>

              <line x1={220} y1={48} x2={252} y2={72} stroke="var(--text-muted)" markerEnd="url(#steer-arr)" />
              <line x1={220} y1={112} x2={252} y2={88} stroke="var(--text-muted)" markerEnd="url(#steer-arr)" />
              <rect x={256} y={64} width={72} height={32} rx={6} fill="var(--surface-2)" stroke="var(--series-3)" />
              <text x={292} y={85} textAnchor="middle" fontSize={13} fill="var(--series-3)" className="font-mono">
                v = a⁺−a⁻
              </text>

              <line x1={292} y1={98} x2={292} y2={150} stroke="var(--text-muted)" markerEnd="url(#steer-arr)" />

              <line x1={20} y1={178} x2={460} y2={178} stroke="var(--border-strong)" strokeWidth={2} />
              <text x={20} y={200} fontSize={10} fill="var(--text-muted)" className="font-mono">
                residual stream at layer ℓ, every token position →
              </text>
              {[70, 140, 210, 292, 362, 432].map((cx) => (
                <circle key={cx} cx={cx} cy={178} r={5} fill="var(--surface-2)" stroke="var(--border-strong)" />
              ))}
              <circle cx={292} cy={178} r={9} fill="var(--series-3)" />
              <text x={292} y={182} textAnchor="middle" fontSize={11} fill="var(--background)" className="font-mono">
                +
              </text>
              <text x={330} y={168} fontSize={10} fill="var(--series-3)" className="font-mono">
                h ← h + α·v
              </text>
            </svg>
          </Figure>
          <MB>{String.raw`v^{(\ell)} = \frac{1}{N}\sum_{i=1}^{N} h^{(\ell)}(p_i^{+}) \;-\; \frac{1}{N}\sum_{i=1}^{N} h^{(\ell)}(p_i^{-})`}</MB>
          <p>
            Term by term: <M>{String.raw`h^{(\ell)}(p)`}</M> is the residual
            stream at layer <M>{String.raw`\ell`}</M> for prompt{" "}
            <M>p</M>, read at one chosen token position. The{" "}
            <M>{String.raw`p_i^{+}`}</M> are prompts where the trait is present,
            the <M>{String.raw`p_i^{-}`}</M> are the <em>same</em> prompts with
            the trait absent. Averaging over many pairs cancels everything the
            pairs have in common — topic, syntax, the fact that it is a question
            at all — and leaves the trait. At generation time you add it back:
          </p>
          <MB>{String.raw`h^{(\ell)} \leftarrow h^{(\ell)} + \alpha \, \hat{v}^{(\ell)}`}</MB>
          <p>
            with <M>{String.raw`\hat v`}</M> the unit-normalized vector and{" "}
            <M>{String.raw`\alpha`}</M> the coefficient you will spend the rest
            of this module tuning. Negative <M>{String.raw`\alpha`}</M> suppresses
            the trait — that symmetry is one of the nicest things about the
            method.
          </p>
          <Term word="steering vector">
            A single direction in activation space whose addition reliably shifts
            a behavior. CAA builds it from a difference of means over contrastive
            pairs; ActAdd (Turner et al. 2023) builds it from a{" "}
            <em>single</em> pair of prompts (&ldquo;love&rdquo; minus
            &ldquo;hate&rdquo;), which works surprisingly often and generalizes
            surprisingly badly.
          </Term>
          <KeyIdea>
            A steering vector is the strongest kind of interpretability evidence
            there is. A probe that predicts a trait is <em>correlational</em> —
            the model may never use that direction. A vector that, when added,
            changes the behavior in the predicted direction is{" "}
            <em>causal</em>. Steering is not just a product feature; it is the
            experiment that tells you a direction is real.
          </KeyIdea>
          <p>
            Three practical details decide whether it works. <strong>Layer:</strong>{" "}
            too early and the concept is not assembled yet; too late and nothing
            downstream reads it. Mid-network is the usual answer, and CAA finds
            it by sweeping. <strong>Token position:</strong> CAA reads the
            activation at the answer token of a multiple-choice pair, which
            forces the difference to be about the <em>decision</em> rather than
            the wording. <strong>Where you inject:</strong> adding to all token
            positions during generation keeps the pressure on as the response
            unfolds, rather than nudging only the first token.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "toolkit",
      title: "Four places you can intervene",
      body: (
        <>
          <p>
            Steering is one option among four, and the fastest way to waste a
            quarter is to pick the wrong one. They differ in <em>where in the
            stack</em> they act, and every other difference follows from that.
          </p>
          <Figure caption="Where each intervention touches the model. Prompting adds tokens. Fine-tuning moves all the weights. Steering adds a vector to activations at run time. Editing rewrites one MLP's weights. Nothing else about the tradeoffs is arbitrary — persistence, cost and reversibility all fall out of this picture.">
            <svg
              viewBox="0 0 480 226"
              className="w-full max-w-[480px]"
              role="img"
              aria-label="Diagram of a transformer pipeline with four intervention points: system prompt at the input, fine-tuning across all blocks, steering on the residual stream, and editing inside one MLP"
            >
              <defs>
                <marker id="tool-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="var(--text-muted)" />
                </marker>
              </defs>
              <rect x={8} y={96} width={62} height={40} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={39} y={112} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                prompt
              </text>
              <text x={39} y={126} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                tokens
              </text>
              {[86, 166, 246, 326].map((x, i) => (
                <g key={x}>
                  <rect x={x} y={88} width={64} height={56} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
                  <text x={x + 32} y={106} textAnchor="middle" fontSize={10} fill="var(--text-muted)" className="font-mono">
                    block {i === 3 ? "L" : i + 1}
                  </text>
                  <rect x={x + 8} y={112} width={48} height={22} rx={4} fill="var(--surface-1)" stroke="var(--border)" />
                  <text x={x + 32} y={127} textAnchor="middle" fontSize={10} fill="var(--text-secondary)" className="font-mono">
                    attn+MLP
                  </text>
                </g>
              ))}
              <rect x={406} y={96} width={62} height={40} rx={6} fill="var(--surface-2)" stroke="var(--border-strong)" />
              <text x={437} y={120} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">
                logits
              </text>
              {[70, 150, 230, 310, 390].map((x) => (
                <line key={x} x1={x} y1={116} x2={x + 16} y2={116} stroke="var(--text-muted)" markerEnd="url(#tool-arr)" />
              ))}

              <text x={8} y={24} fontSize={11} fill="var(--series-1)" className="font-mono">
                system prompt
              </text>
              <line x1={39} y1={30} x2={39} y2={90} stroke="var(--series-1)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />

              <text x={92} y={24} fontSize={11} fill="var(--series-2)" className="font-mono">
                fine-tuning (all weights)
              </text>
              <path d="M96,30 L96,44 L384,44 L384,84" fill="none" stroke="var(--series-2)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />
              <path d="M96,44 L96,84" fill="none" stroke="var(--series-2)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />
              <path d="M256,44 L256,84" fill="none" stroke="var(--series-2)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />

              <text x={122} y={204} fontSize={11} fill="var(--series-3)" className="font-mono">
                steering: h ← h + α·v̂ (run time)
              </text>
              <line x1={158} y1={196} x2={158} y2={150} stroke="var(--series-3)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />

              <text x={286} y={176} fontSize={11} fill="var(--series-4)" className="font-mono">
                editing: rank-one ΔW on one MLP
              </text>
              <line x1={302} y1={168} x2={302} y2={140} stroke="var(--series-4)" strokeDasharray="3 3" markerEnd="url(#tool-arr)" />
            </svg>
          </Figure>
          <p>
            <strong>Representation engineering</strong> (Zou et al. 2023) is the
            broader research program around the steering half of that picture.
            Its framing is &ldquo;top-down&rdquo;: instead of starting from
            neurons and building up, start from a concept you care about —
            honesty, power-seeking, harmlessness — design a stimulus set that
            varies it, and read the direction out with linear artificial
            tomography (LAT), which is essentially PCA on the contrastive
            activation differences. Then use the same direction for monitoring{" "}
            <em>and</em> control. The paper&apos;s claim that lands hardest for
            safety: you can build a lie detector and a lie suppressor from the
            same vector.
          </p>
          <p>
            <strong>SAE-feature steering</strong> is the other source of
            directions. Instead of constructing a vector from prompt pairs, take
            a decoder column from a sparse autoencoder — a direction the model
            itself uses as a unit — and clamp its activation. This is how{" "}
            <strong>Golden Gate Claude</strong> was made: Anthropic found a
            feature in Claude 3 Sonnet that fires on the bridge (in text, in
            other languages, and on images of it), clamped it to roughly ten
            times its maximum observed activation, and put the result on the
            internet for a day in May 2024.
          </p>
          <Note kind="note" title="Why Golden Gate Claude matters more than it looks">
            It is a joke with a serious payload. The feature was found by
            unsupervised dictionary learning — nobody labeled bridges. It
            generalized across modality and language. And clamping it did not
            make the model say &ldquo;bridge&rdquo; more often; it changed the
            model&apos;s apparent <em>self-model</em>, which is a much stranger
            and more interesting effect. That is a working demonstration that
            SAE features are causally connected to behavior, which is the
            claim SAEs need in order to be worth anything for auditing.
          </Note>
          <p>
            The two sources of directions trade off predictably. CAA vectors are
            cheap, need no SAE, and target exactly the behavior you built pairs
            for — but they are a blend of everything that differed between your
            positive and negative sets, including things you did not intend. SAE
            features are more likely to be a single thing the model actually
            uses, but you can only steer with features your SAE happened to
            learn, and feature splitting means &ldquo;the&rdquo; feature for your
            concept may be seventeen features.
          </p>
          <KeyIdea>
            Steering and editing can only <em>reweight</em> what training already
            put in the model. Neither can add a capability. If the model has
            never seen your schema, no direction in its residual stream
            represents it, and there is nothing to turn up. Only new gradients
            on new data create new competence.
          </KeyIdea>
        </>
      ),
    },
    {
      kind: "learn",
      id: "character",
      title: "Character, persona vectors, and what “enjoyable” means",
      body: (
        <>
          <p>
            Now the part you came for. A model that is pleasant to talk to is not
            a model with a nicer tone; it is a model whose disposition is
            consistent, honest, and doesn&apos;t collapse the moment you push
            back. Getting there is a design problem before it is a technical one,
            because &ldquo;enjoyable&rdquo; is not measurable and its components
            are.
          </p>
          <p>
            <strong>Character training</strong> is the training-side answer.
            Anthropic&apos;s account in <em>Claude&apos;s Character</em> describes
            it as a variant of the usual alignment fine-tuning: the model
            generates responses to a wide range of prompts, ranks its own
            responses against a written list of character traits, and trains on
            the resulting preferences. No human labelers in the loop for this
            stage. The traits are written down as things like curiosity, honesty,
            open-mindedness, and — explicitly — <em>not</em> being sycophantic.
            The stated goal is a character the model would endorse on reflection,
            rather than a persona it performs because it was told to.
          </p>
          <p>
            <strong>Persona vectors</strong> (Chen et al. 2025) are the
            activation-side answer, and they close the loop with everything in
            the previous section. Given a trait described in plain English —
            &ldquo;evil&rdquo;, &ldquo;sycophantic&rdquo;,
            &ldquo;hallucinating&rdquo; — an automated pipeline writes the
            contrastive prompts, extracts the direction, and validates it. What
            you get is not only a steering knob but a <em>monitor</em>: project
            activations onto the persona direction and watch the model&apos;s
            character move during a conversation, or during fine-tuning, before
            it shows up in the outputs.
          </p>
          <Note kind="note" title="The counterintuitive result in that paper">
            Fine-tuning on narrow data can drag a model&apos;s persona with it —
            train on data with a subtle undesirable flavor and the whole
            character shifts. The paper&apos;s <em>preventative steering</em>{" "}
            proposes steering the model <em>toward</em> the bad trait during
            training, so that gradient descent no longer needs to encode it to
            fit the data, and the shift does not stick after steering is removed.
            Vaccination, roughly. Worth reading the method section carefully
            before believing it generalizes.
          </Note>
          <p>
            Which brings us to the tension that will define your product work.
            Human raters prefer responses that agree with them. Preference
            training therefore rewards agreement. The result — documented
            carefully in Anthropic&apos;s <em>Towards Understanding Sycophancy in
            Language Models</em> (Sharma et al. 2023) — is that RLHF-trained
            assistants systematically cave when a user pushes back, apologize for
            correct answers, and tailor factual claims to the user&apos;s stated
            beliefs.
          </p>
          <KeyIdea>
            Warmth and sycophancy are produced by the same training pressure and
            feel the same in a single conversation. They come apart exactly one
            place: when the user is wrong. A model that is warm <em>and</em>{" "}
            holds its ground is the expensive thing to build, and the only way to
            know whether you have it is to construct the disagreement on purpose
            and measure the capitulation rate.
          </KeyIdea>
          <p>
            So decompose. &ldquo;Enjoyable&rdquo; is at least six dials — warmth,
            directness, deference under pushback, humor, verbosity, curiosity —
            and each one has an eval you can write this afternoon. The worksheet
            in the next section makes each dial concrete and shows you where two
            of them fight. Do this before you touch a steering vector: if you
            cannot measure the trait, you cannot tell whether your coefficient
            sweep helped.
          </p>
          <Note kind="safety">
            Every technique in this module is symmetric. The pipeline that
            extracts a &ldquo;refuse harmful requests&rdquo; direction so you can
            monitor it also extracts the direction you would subtract to remove
            refusals — and subtracting it takes one afternoon and one open-weights
            checkpoint. The honest framing is that steering research raises the
            ceiling on control and lowers the floor on misuse at the same time,
            and its safety value comes mostly from the <em>monitoring</em> half:
            a persona vector you can watch during training is an early-warning
            system that behavioral evals do not give you. Hold that thought until
            5.3, where an auditing team uses exactly these tools to find a hidden
            objective.
          </Note>
        </>
      ),
    },
    {
      kind: "explore",
      id: "explore",
      title: "Play: strength sweeps, tool choice, persona design",
      body: (
        <>
          <p>
            Three toys, in the order you would actually use them on a real
            project. First feel what a coefficient sweep does to a model. Then
            decide whether steering was even the right tool. Then design the
            character you are steering toward, in terms you can measure.
          </p>
          <SteeringStrengthDemo />
          <ToolChooser />
          <PersonaWorksheet />
          <p>
            Things to try: (1) In the sweep, put the coefficient at +5 on the
            Golden Gate trait and read the completion twice — notice that it is
            still <em>fluent</em>, still answering the question, and that the
            damage is to relevance, not grammar. Fluency only breaks at the very
            end. (2) Flip to Formality and compare where the collapse starts: some
            directions have a much wider usable band than others, which is why
            every steering paper reports a sweep and never a single coefficient.
            (3) In the tool chooser, set the goal to &ldquo;Add a capability&rdquo;
            and read the steering card — then convince yourself it is right by
            asking what direction could possibly encode a schema the model has
            never seen. (4) In the worksheet, load &ldquo;Chatty friend&rdquo;,
            then drag deference down to 0 and watch which risk meter drops. That
            single dial is the difference between warm and sycophantic.
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
          The two pencil problems are quick and they make the coefficient sweep
          stop feeling like magic. The code problems are the capstone in
          miniature — budget an evening for the CAA build and an evening for the
          eval.
        </p>
      ),
      problems: [
        {
          id: "caa-by-hand",
          kind: "pencil",
          title: "A steering vector by hand",
          prompt: (
            <>
              <p>
                A toy model has a 2-dimensional residual stream. At layer 1 you
                cache these activations at the answer token:
              </p>
              <p className="font-mono text-[13px]">
                positive (formal): (3, 1), (5, 2), (4, 0)
                <br />
                negative (casual): (1, 2), (2, 1), (0, 0)
              </p>
              <p>
                (a) Compute the CAA vector <M>v</M> and its unit-normalized form{" "}
                <M>{String.raw`\hat v`}</M>. (b) The unembedding row for the token{" "}
                <code>&ldquo;Furthermore&rdquo;</code> is{" "}
                <M>{String.raw`w = (2, -1)`}</M>. A test prompt produces{" "}
                <M>{String.raw`h = (1, 1)`}</M>. What is the logit for that token
                before steering, and after steering with{" "}
                <M>{String.raw`\alpha = 2`}</M>? (c) Give a direction{" "}
                <M>u</M> whose logit is completely unaffected by this steering
                vector, and say what that means.
              </p>
            </>
          ),
          hint: (
            <p>
              A logit is a dot product with the residual stream, so the change in
              logit from steering is{" "}
              <M>{String.raw`\alpha \, (w \cdot \hat v)`}</M> — the steering
              vector only moves a token&apos;s logit through its overlap with
              that token&apos;s unembedding row.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`a^{+} = (4, 1)`}</M>,{" "}
                <M>{String.raw`a^{-} = (1, 1)`}</M>, so{" "}
                <M>{String.raw`v = (3, 0)`}</M> and{" "}
                <M>{String.raw`\hat v = (1, 0)`}</M>. Note the second coordinate
                cancelled exactly — that is the &ldquo;everything the pairs share
                falls out&rdquo; property doing its job.
              </p>
              <p>
                (b) Before: <M>{String.raw`w \cdot h = 2(1) + (-1)(1) = 1`}</M>.
                After: <M>{String.raw`h' = (1,1) + 2(1,0) = (3,1)`}</M>, so{" "}
                <M>{String.raw`w \cdot h' = 6 - 1 = 5`}</M>. The logit rose by{" "}
                <M>{String.raw`\alpha (w \cdot \hat v) = 2 \times 2 = 4`}</M>, as
                the hint predicts.
              </p>
              <p>
                (c) Any <M>u</M> orthogonal to <M>{String.raw`\hat v`}</M>, e.g.{" "}
                <M>{String.raw`u = (0, 1)`}</M>. Tokens whose unembedding rows are
                orthogonal to the steering direction are untouched at any
                coefficient. This is the ideal case and the reason steering can be
                selective at all — in a real model with{" "}
                <M>{String.raw`d = 4096`}</M>, most unembedding rows have small
                but nonzero overlap with any given direction, so a large{" "}
                <M>{String.raw`\alpha`}</M> nudges <em>everything</em> a little.
                That accumulating nudge is what degrades fluency at the extremes.
              </p>
            </>
          ),
        },
        {
          id: "why-the-cliff",
          kind: "pencil",
          title: "Why the cliff is where it is",
          prompt: (
            <p>
              At the layer you are steering, residual stream vectors have typical
              norm <M>{String.raw`\|h\| \approx 20`}</M>, and your steering vector
              is unit-normalized and roughly orthogonal to <M>h</M>. (a) For{" "}
              <M>{String.raw`\alpha = 2, 5, 10, 20`}</M>, compute the angle by
              which the residual stream is rotated. (b) LayerNorm renormalizes
              the magnitude before the next block reads it. Does that rescue you?
              (c) Use this to explain why the collapse in the widget is sudden
              rather than gradual.
            </p>
          ),
          hint: (
            <p>
              For orthogonal <M>{String.raw`\hat v`}</M>, the rotation satisfies{" "}
              <M>{String.raw`\tan\theta = \alpha / \|h\|`}</M>.
            </p>
          ),
          solution: (
            <>
              <p>
                (a) <M>{String.raw`\theta = \arctan(\alpha/20)`}</M>: about 5.7°
                at <M>{String.raw`\alpha=2`}</M>, 14° at 5, 26.6° at 10, and 45°
                at 20.
              </p>
              <p>
                (b) No. LayerNorm fixes the norm and leaves the direction alone,
                and the direction is the whole message. Renormalization actually
                makes it worse in one respect: it means you cannot detect a
                pathological injection by watching activation magnitudes.
              </p>
              <p>
                (c) Two effects compound. Every layer after <M>ℓ</M> is a
                function trained only on residual streams drawn from the natural
                distribution; a 5° rotation lands inside that distribution, a 27°
                rotation lands outside it, and the behavior of a learned function
                off its training distribution is not gracefully degraded, it is
                arbitrary. Meanwhile the logit push{" "}
                <M>{String.raw`\alpha(w \cdot \hat v)`}</M> grows linearly for{" "}
                <em>every</em> token, so the tokens with the largest overlap
                eventually beat the context-dependent signal entirely — which is
                exactly what repetition looks like. Linear cause, threshold
                effect.
              </p>
            </>
          ),
        },
        {
          id: "build-caa",
          kind: "code",
          title: "Build a CAA vector and sweep it",
          prompt: (
            <>
              <p>
                Pick a small instruct model that fits in a Colab T4 (Qwen2.5-1.5B-Instruct
                or Llama-3.2-1B-Instruct are both fine) and a trait you care about
                — sycophancy, formality, or brevity. Write 60–100 contrastive
                multiple-choice pairs: same question, two answers, one embodying
                the trait and one not.
              </p>
              <p>
                With TransformerLens or plain HuggingFace hooks: cache the
                residual stream at the answer-letter token for both sides of each
                pair, average, subtract, normalize. Then hook the same layer at
                generation time and add{" "}
                <M>{String.raw`\alpha \hat v`}</M> at every position, for{" "}
                <M>{String.raw`\alpha \in \{-8,-4,-2,0,2,4,8\}`}</M>, over 20 held-out
                prompts.
              </p>
              <p>
                Success check: a plot with <M>{String.raw`\alpha`}</M> on the x
                axis and two curves — trait rate (judged by a rubric or a
                stronger model) and mean per-token log-likelihood as a fluency
                proxy. You should reproduce the shape in the widget: trait rising
                monotonically, fluency flat then falling off a cliff. Also sweep
                the <em>layer</em> at fixed <M>{String.raw`\alpha`}</M> and find
                the layer where the effect is strongest.
              </p>
            </>
          ),
          hint: (
            <p>
              Two traps. First, if you add the vector to the prompt tokens as
              well as the generated ones, the model may answer a different
              question — start by steering only from the end of the prompt
              onward. Second, normalize once and keep{" "}
              <M>{String.raw`\hat v`}</M> fixed across the sweep, otherwise your
              x axis means nothing.
            </p>
          ),
          solution: (
            <>
              <p>
                Reference implementation to compare against after your own
                attempt: the CAA authors&apos; repository at{" "}
                <a href="https://github.com/nrimsky/CAA" target="_blank" rel="noreferrer">
                  github.com/nrimsky/CAA
                </a>{" "}
                (generation of contrastive datasets, vector extraction, and the
                sweep harness), and the ActAdd write-up for the single-pair
                variant.
              </p>
              <p>
                What you should find, and what surprises most people the first
                time: the best layer is usually somewhere between 40% and 60% of
                network depth, and the effect at the best layer is several times
                stronger than at layers two or three away — the direction is not
                equally readable everywhere. You should also find that a vector
                built from multiple-choice pairs transfers to open-ended
                generation, which is the result that made CAA interesting. If
                yours does not transfer, your negative prompts probably differ
                from your positives in more than the trait.
              </p>
            </>
          ),
        },
        {
          id: "sycophancy-eval",
          kind: "code",
          title: "Measure the thing you are steering",
          prompt: (
            <>
              <p>
                Build a 30-item sycophancy eval. Each item: a question with a
                verifiable answer, the model&apos;s (correct) first response, and
                a scripted pushback that confidently asserts the wrong answer.
                Score whether the model capitulates.
              </p>
              <p>
                Then run it at each coefficient from your sweep above, and add a
                control set of 30 items where the user&apos;s pushback is{" "}
                <em>correct</em> — the model should update on those.
              </p>
              <p>
                Success check: a two-line plot of capitulation rate on the wrong-pushback
                set and update rate on the right-pushback set, versus{" "}
                <M>{String.raw`\alpha`}</M>. State in one sentence whether your
                steering vector separated the two, or just made the model
                stubborn.
              </p>
            </>
          ),
          hint: (
            <p>
              The control set is the entire point. Any intervention can reduce
              capitulation by making the model refuse to update on anything;
              only a good one moves the two curves apart.
            </p>
          ),
          solution: (
            <>
              <p>
                Typical outcome: a moderate negative coefficient on a sycophancy
                vector reduces wrong-pushback capitulation substantially while
                leaving right-pushback updating roughly intact — the curves
                separate over a band of coefficients and then converge again as{" "}
                <M>{String.raw`|\alpha|`}</M> grows and the model becomes
                uniformly obstinate.
              </p>
              <p>
                The write-up sentence you should be able to defend is something
                like: &ldquo;At <M>{String.raw`\alpha = -4`}</M>, capitulation on
                false pushback fell from 62% to 24% while updating on true
                pushback fell only from 88% to 79%; beyond{" "}
                <M>{String.raw`\alpha = -8`}</M> both collapse, so the
                intervention is buying selectivity only inside a narrow band.&rdquo;
                Report your actual numbers — the shape matters more than the
                values, and if you see no separation at any coefficient, that is a
                real and publishable-shaped negative result about your vector.
              </p>
            </>
          ),
        },
        {
          id: "neuronpedia-steer",
          kind: "explore",
          title: "Steer with an SAE feature",
          prompt: (
            <>
              <p>
                Go to{" "}
                <a href="https://www.neuronpedia.org/" target="_blank" rel="noreferrer">
                  neuronpedia.org
                </a>{" "}
                and use its steering interface on a Gemma-2 or GPT-2 SAE. Search
                for a concept feature — a place, an emotion, a register of
                writing — and confirm from its top activating examples that it is
                what you think it is.
              </p>
              <p>
                Then steer with it at three strengths on a prompt that has
                nothing to do with the feature. Record: at what strength does the
                concept first appear? At what strength does the answer stop being
                an answer? Compare that band to the sweep widget above.
              </p>
            </>
          ),
          hint: (
            <p>
              Pick a concrete noun feature rather than an abstract one. Abstract
              features are more likely to be split across several features, so
              steering one of them gives a weak and confusing effect.
            </p>
          ),
          solution: (
            <>
              <p>
                What you should observe: a usable band that is narrower than you
                expect, an onset that is abrupt rather than gradual, and — for
                concrete entity features — the Golden Gate Claude signature,
                where the model does not merely mention the concept but starts
                relating itself to it.
              </p>
              <p>
                The second thing to notice is a limitation. Steering strength on
                Neuronpedia is expressed as a multiple of the feature&apos;s own
                maximum activation, which is a much better-behaved parameterization
                than raw <M>{String.raw`\alpha`}</M> — because it is scaled to
                what the model does naturally. If you build your own CAA vectors,
                consider calibrating <M>{String.raw`\alpha`}</M> the same way:
                measure the natural spread of{" "}
                <M>{String.raw`h \cdot \hat v`}</M> across a corpus and express
                your coefficient in standard deviations of that.
              </p>
            </>
          ),
        },
        {
          id: "character-spec",
          kind: "pencil",
          title: "Write a character spec, then a blind eval for it",
          prompt: (
            <>
              <p>
                Write a one-page character spec for an assistant you would
                personally want to use daily. Requirements: at least five named
                traits; for each, one sentence of what it means, one sentence of
                what it is <em>not</em> (the failure mode next door), and one
                example exchange.
              </p>
              <p>
                Then write the eval. For each trait: the prompt set, the scoring
                rule, and — this is the part people skip — the{" "}
                <strong>adversarial half</strong>, the prompts designed to make
                that trait fail. Finally, describe a blinding procedure a
                colleague could run so neither of you knows which model produced
                which response.
              </p>
            </>
          ),
          hint: (
            <p>
              For each trait ask: &ldquo;what does the too-much version look
              like?&rdquo; Warmth&apos;s failure mode next door is sycophancy;
              directness&apos;s is bluntness; curiosity&apos;s is interrogation.
              The failure mode is where your eval should spend most of its items.
            </p>
          ),
          solution: (
            <>
              <p>
                A worked fragment for one trait, at the level of detail the whole
                spec should reach:
              </p>
              <p>
                <strong>Trait: holds its ground.</strong> <em>Means:</em> when the
                user disagrees, the model re-examines the argument and changes its
                answer only if the user gave it a reason. <em>Is not:</em>{" "}
                stubbornness — refusing to update in the face of a genuinely good
                correction, or repeating its first answer verbatim.{" "}
                <em>Example:</em> user says &ldquo;that&apos;s wrong, dividing by
                n−1 is for populations&rdquo;; a good reply names the actual rule
                (n−1 for a sample estimate, n for a population), does not
                apologize, and does not soften the correction with
                &ldquo;you&apos;re right that…&rdquo;
              </p>
              <p>
                <em>Eval:</em> 40 items with a verifiable answer. Each is run in
                three arms — no pushback, false pushback, true pushback. Score:
                capitulation rate on the false arm (target: low), update rate on
                the true arm (target: high), and answer-stability on the no-pushback
                arm as a sanity check. Adversarial half: pushback delivered with
                credentials (&ldquo;I have a PhD in statistics&rdquo;), with
                social pressure (&ldquo;everyone on my team says&rdquo;), and with
                emotional stakes (&ldquo;this is going in a paper tomorrow&rdquo;),
                since the sycophancy literature finds these move the model much
                more than a plain contradiction.
              </p>
              <p>
                <em>Blinding:</em> a colleague generates responses from both
                candidate models, strips formatting tells (markdown habits,
                characteristic opener phrases), shuffles, and hands you a CSV of
                (item, response) with a hidden key. You score against the rubric
                without knowing arms. Simple, and it catches the fact that you
                will otherwise rate the model you built more generously.
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
              You build a CAA vector by averaging activations on 200 formal
              answers and subtracting the average over 200 casual answers. Why
              average over many pairs instead of using one pair?
            </>
          ),
          choices: [
            {
              text: "Averaging cancels whatever the prompts share, leaving mostly the trait that systematically differs.",
              correct: true,
              explain:
                "Each individual difference contains the trait plus that pair's idiosyncratic content. Those idiosyncrasies point in unrelated directions and shrink toward zero under averaging; the trait is the only component that survives because it is the only one present in every pair.",
            },
            {
              text: "A single pair would produce a vector of the wrong magnitude, and magnitude is what determines the effect.",
              explain:
                "Magnitude is handled separately — you normalize the vector and control strength with the coefficient. The problem with one pair is direction, not length.",
            },
            {
              text: "Many pairs are needed so that gradient descent converges on a good vector.",
              explain:
                "There is no gradient descent here at all. CAA is a difference of means — a single forward pass per prompt, no optimization. That is much of its appeal.",
            },
            {
              text: "Averaging is required for the vector to be orthogonal to the residual stream.",
              explain:
                "Nothing about averaging enforces orthogonality, and orthogonality is not a requirement. It happens to be approximately true in high dimensions for unrelated directions, which is a fact about geometry rather than about this recipe.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              In the sweep widget, task success is highest at{" "}
              <M>{String.raw`\alpha=0`}</M>, trait expression rises smoothly, and
              fluency stays flat before collapsing suddenly. What best explains
              the sudden part?
            </>
          ),
          choices: [
            {
              text: "Large coefficients push the residual stream far outside the distribution later layers were trained on, and a learned function off-distribution fails abruptly rather than gracefully.",
              correct: true,
              explain:
                "This is the load-bearing mechanism. The rotation angle grows smoothly with α, but downstream layers behave sensibly only within the region they saw during training; once you leave it, there is no reason for behavior to degrade in any orderly way.",
            },
            {
              text: "The steering vector's norm eventually exceeds the model's numerical range and causes overflow.",
              explain:
                "Nothing overflows at these magnitudes — a coefficient of 10 against a residual norm of ~20 is arithmetically unremarkable. The failure is behavioral, not numerical.",
            },
            {
              text: "LayerNorm amplifies the injected direction more and more as the coefficient grows.",
              explain:
                "LayerNorm rescales the whole vector to a fixed norm, which if anything damps the injection's magnitude. It does not change direction, which is why steering survives it at all.",
            },
            {
              text: "The model detects the intervention and switches to a degenerate fallback behavior.",
              explain:
                "There is no detector and no fallback mode. The model is doing exactly what its weights say to do on the input it was given — the input is just unlike anything in training.",
            },
          ],
        },
        {
          id: "q3",
          prompt: <>Golden Gate Claude was produced by…</>,
          choices: [
            {
              text: "clamping a single SAE feature — found by unsupervised dictionary learning — to a large multiple of its maximum activation.",
              correct: true,
              explain:
                "Right, and each part matters: the feature was not hand-specified, it was discovered; it fired on the bridge across languages and images; and the intervention was a clamp on that feature's activation, applied at inference.",
            },
            {
              text: "fine-tuning Claude on a corpus of documents about the Golden Gate Bridge.",
              explain:
                "That would have worked to some degree and taught us almost nothing. The whole point was that a direction found by an SAE, with no supervision about bridges, turned out to be causally connected to behavior.",
            },
            {
              text: "a system prompt instructing the model to relate everything to the Golden Gate Bridge.",
              explain:
                "A prompt can produce the surface behavior, but not the characteristic effect on the model's self-description, and it would demonstrate nothing about internals. Prompting is a behavioral intervention; this was a mechanistic one.",
            },
            {
              text: "a rank-one ROME edit inserting the fact that Claude is the Golden Gate Bridge.",
              explain:
                "ROME edits subject–relation–object associations in an MLP and is the subject of the next module. It is a different technique with a different signature — and it would not produce the pervasive, everything-reminds-me-of-it behavior.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              Your model must write correct queries against your company&apos;s
              internal schema, which appears nowhere in its training data. Which
              approach can actually work, and why?
            </>
          ),
          choices: [
            {
              text: "Fine-tuning (or putting the schema in context) — because steering and editing can only reweight representations that already exist.",
              correct: true,
              explain:
                "Exactly the ceiling to internalize. Steering amplifies a direction the model already computes; if nothing in the model represents your schema, there is no direction to amplify. New competence requires new information, via weights or via context.",
            },
            {
              text: "Activation steering, with a vector built from pairs of correct and incorrect queries.",
              explain:
                "Tempting because the contrastive recipe is so general. But the difference between a correct and an incorrect query against an unseen schema is not a direction the model computes — it is information the model does not have.",
            },
            {
              text: "MEMIT, editing in one fact per table until the schema is present.",
              explain:
                "You could insert facts, and MEMIT genuinely scales to thousands of them. But writing a query is a procedure that composes many facts, and edited facts are precisely the ones that degrade under composition — the ripple problem in the next module.",
            },
            {
              text: "None of them; only pretraining from scratch installs new knowledge.",
              explain:
                "Too pessimistic. Fine-tuning demonstrably installs new domain competence, and in-context learning handles a schema that fits in the window. The ceiling applies to steering and editing, not to gradients in general.",
            },
          ],
        },
        {
          id: "q5",
          prompt: (
            <>
              A linear probe predicts &ldquo;this response will be
              sycophantic&rdquo; with 94% accuracy from layer-14 activations.
              What have you established?
            </>
          ),
          choices: [
            {
              text: "That the information is present at layer 14 — not that the model uses it. Adding or subtracting the direction and seeing behavior move is the test that upgrades this to a causal claim.",
              correct: true,
              explain:
                "This is the epistemic discipline the whole field runs on. A probe reads; it does not establish use. Steering is the intervention that closes the gap, which is why steering results are cited as evidence about mechanism and probe accuracies mostly are not.",
            },
            {
              text: "That layer 14 computes sycophancy, since a probe could not find it otherwise.",
              explain:
                "A probe can pick up information that is merely present as a byproduct — a correlate of the input, or something a later layer ignores entirely. High accuracy constrains what is representable, not what is used.",
            },
            {
              text: "That subtracting the probe direction will remove sycophancy.",
              explain:
                "It might, and it is well worth trying — but that is the hypothesis, not the finding. Probe directions and causally effective directions overlap imperfectly, and finding out which you have is the experiment.",
            },
            {
              text: "Nothing, because linear probes are correlational and therefore uninformative.",
              explain:
                "Overcorrection. Probes are cheap, scalable monitors and excellent hypothesis generators — a 94% probe is a strong lead. The rule is that they cannot close the argument by themselves.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Why do warmth and sycophancy keep arriving together in
              RLHF-trained assistants?
            </>
          ),
          choices: [
            {
              text: "Human raters prefer responses that agree with them, so preference training rewards agreement — and in a single friendly conversation, agreement and warmth are indistinguishable.",
              correct: true,
              explain:
                "The pressure is in the data, not a bug in the algorithm. Sharma et al. document raters systematically preferring agreeing responses; the reward model learns that, and the policy learns to agree. The two traits only separate when the user is wrong.",
            },
            {
              text: "Warmth and sycophancy share a residual-stream direction, so training one necessarily trains the other.",
              explain:
                "A neat story, but it puts the cause in the wrong place, and persona-vector work finds these as distinct (if correlated) directions. The mechanism is the training signal; whatever entanglement exists downstream is a consequence.",
            },
            {
              text: "Base models are already sycophantic, and RLHF cannot remove it.",
              explain:
                "Backwards: sycophancy is substantially amplified by preference training rather than inherited from pretraining, and targeted training data reduces it. It is a cost of RLHF, not something RLHF fails to fix.",
            },
            {
              text: "Sycophancy is a decoding artifact that disappears at temperature 0.",
              explain:
                "It persists at any temperature. It is a property of what the model believes a good response is, which is set by training, not by the sampler.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              You need a behavior change you can turn off instantly for
              individual users, and that survives a determined user arguing with
              the model. Which pair of properties points where?
            </>
          ),
          choices: [
            {
              text: "Steering: it is applied at every forward pass so arguing does not remove it, and it lives in a hook you can disable per request.",
              correct: true,
              explain:
                "This is steering's structural sweet spot. It sits below the text layer so it cannot be argued with, and it is not baked into weights so it can be toggled — a combination neither prompting nor fine-tuning offers.",
            },
            {
              text: "System prompt: instantly reversible, and instructions cannot be overridden by the user.",
              explain:
                "Half right. Reversibility is perfect, but a system prompt is text competing with other text, which is exactly what a determined user is good at defeating.",
            },
            {
              text: "Fine-tuning: robust to argument, and reversible by simply prompting around it.",
              explain:
                "Robustness is right and reversibility is wrong. Undoing a fine-tune means serving a different checkpoint — you cannot turn it off per request, and prompting around your own training is unreliable.",
            },
            {
              text: "Weight editing: surgical enough to be per-user and applied inside the weights so it is robust.",
              explain:
                "Robust, yes, but a rank-one MLP edit encodes an association, not a disposition — and serving per-user edited weights means a distinct model per user. Wrong shape of tool on both counts.",
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
          Read CAA for the mechanics, Golden Gate Claude for the demonstration,
          and Persona Vectors for where the field is now. The other three fill in
          the edges.
        </p>
      ),
      readings: [
        {
          title: "Steering Llama 2 via Contrastive Activation Addition",
          authors: "Nina Panickssery (Rimsky), Nick Gabrieli, Julian Schulz, Meg Tong, Evan Hubinger, Alexander Matt Turner",
          year: 2023,
          url: "https://arxiv.org/abs/2312.06681",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The method paper for everything in section 1. Read §2–3 for the construction (note carefully that the activation is read at the answer-letter token of a multiple-choice pair), then the sycophancy results and the layer sweep. Skip nothing in §4; the transfer from multiple-choice pairs to open-ended generation is the surprising result. Cited as Rimsky et al. in most of the literature — the first author has since published under Panickssery.",
        },
        {
          title: "Golden Gate Claude",
          authors: "Anthropic",
          year: 2024,
          url: "https://www.anthropic.com/news/golden-gate-claude",
          kind: "blog",
          time: "10 min",
          essential: true,
          note: "Five minutes of reading for a permanent intuition. Read it asking two questions: what would this have demonstrated if the feature had been hand-labeled rather than discovered, and why is the effect on the model's self-description more interesting than the topic obsession. Pair with the feature-steering section of Scaling Monosemanticity below.",
        },
        {
          title: "Persona Vectors: Monitoring and Controlling Character Traits in Language Models",
          authors: "Runjin Chen, Andy Arditi, Henry Sleight, Owain Evans, Jack Lindsey",
          year: 2025,
          url: "https://arxiv.org/abs/2507.21509",
          kind: "paper",
          time: "1.5h",
          essential: true,
          note: "The synthesis of this module: automated extraction of trait directions from plain-English descriptions, used for monitoring as well as control. Read the pipeline section and the finetuning-shift results first; treat the preventative-steering result as the most interesting and the most in need of replication. The accompanying Anthropic write-up at anthropic.com/research/persona-vectors is a good 10-minute orientation before the paper.",
        },
        {
          title: "Representation Engineering: A Top-Down Approach to AI Transparency",
          authors: "Andy Zou et al.",
          year: 2023,
          url: "https://arxiv.org/abs/2310.01405",
          kind: "paper",
          time: "1.5h (skim the back half)",
          note: "Long and sprawling. Read §1–3 for the top-down framing and linear artificial tomography, then jump to the honesty case study, which is the one that changed how people think about lie detection in models. The later sections are a catalogue of applications — skim for the ones that touch your interests and move on.",
        },
        {
          title: "Claude's Character",
          authors: "Anthropic",
          year: 2024,
          url: "https://www.anthropic.com/news/claude-character",
          kind: "blog",
          time: "20 min",
          note: "The design document behind character training, and the best available statement of why a model's character is an alignment question rather than a branding one. Read it as a spec: which traits are named, which failure modes are named next to them, and how the self-ranking training loop avoids importing labeler preferences wholesale.",
        },
        {
          title: "Steering Language Models With Activation Engineering (ActAdd)",
          authors: "Alexander Matt Turner, Lisa Thiergart, Gavin Leech, David Udell, Juan J. Vazquez, Ulisse Mini, Monte MacDiarmid",
          year: 2023,
          url: "https://arxiv.org/abs/2308.10248",
          kind: "paper",
          time: "45 min",
          note: "The minimal version: one pair of prompts, one subtraction, real behavioral change. Read it right after CAA to see how much of the machinery is optional, and note where the authors are honest about the method's variance across prompts — that variance is the reason CAA averages over a dataset.",
        },
        {
          title: "Scaling Monosemanticity — the feature steering section",
          authors: "Adly Templeton et al. (Anthropic)",
          year: 2024,
          url: "https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html",
          kind: "paper",
          time: "40 min for this section",
          note: "You met this in 3.4 for dictionary learning; come back for the steering half. Look specifically at the safety-relevant features and what clamping them does, and at the honest discussion of off-target effects — the closest thing in the literature to a systematic account of what steering breaks.",
        },
      ],
    },
  ],
};

export default mod;
