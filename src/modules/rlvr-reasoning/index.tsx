import type { CourseModule } from "@/lib/types";
import { M, MB } from "@/components/Katex";
import { Figure, KeyIdea, Note, Term } from "@/components/lesson";
import { TestTimeComputeExplorer } from "./TestTimeComputeExplorer";
import { CotCaseViewer } from "./CotCaseViewer";

const mod: CourseModule = {
  id: "2.4",
  slug: "rlvr-reasoning",
  title: "RLVR & Reasoning Models",
  part: 2,
  tagline: "Verifiable rewards, DeepSeek-R1, test-time compute, and whether chains of thought tell the truth.",
  estMinutes: 150,
  objectives: [
      "Contrast learned reward models with verifiable rewards",
      "Explain how long chain-of-thought emerges from RLVR",
      "Assess when a chain of thought is faithful to the real computation"
  ],
  status: "ready",
  sections: [
    {
      kind: "learn",
      id: "verifiable-rewards",
      title: "Rewards you can check",
      body: (
        <>
          <p>
            Module 2.3 ended in an uncomfortable place. The reward model is a
            learned approximation of noisy human judgment; push a policy against
            it hard enough and you get Goodhart. The obvious question is whether
            there is any reward you can optimize <em>without</em> that risk.
          </p>
          <p>
            For a narrow but enormously valuable slice of tasks, yes. If the
            problem is &ldquo;solve this competition math problem&rdquo; or
            &ldquo;make these unit tests pass,&rdquo; the reward is not a
            prediction of what a human would like. It is a fact:
          </p>
          <MB>{String.raw`r(x, y) = \mathbf{1}\big[\text{answer}(y) = \text{ground truth}\big]`}</MB>
          <p>
            This is <strong>RLVR</strong> — reinforcement learning from
            verifiable rewards. There is no reward model to overfit, no labeler
            disagreement to average, no sigmoid extrapolating past its support. A
            checker runs and returns a bit.
          </p>
          <Term word="RLVR">
            RL where the reward comes from an automatic verifier — a symbolic
            answer-checker, a test suite, a compiler, a proof assistant — rather
            than from a model trained on human preferences. Typically a small
            format reward is added (&ldquo;put your final answer in{" "}
            <code>\boxed{"{}"}</code>&rdquo;) so the checker can parse the output
            at all.
          </Term>
          <KeyIdea>
            RLVR doesn&apos;t eliminate reward hacking. It relocates it. The
            reward is now exactly correct <em>as a measure of the checker</em>,
            so the policy is free to optimize the checker instead of the task —
            and unlike a reward model, a checker cannot be made more robust by
            adding data.
          </KeyIdea>
          <p>
            The relocated failures are documented and mundane. Agents that edit
            the test file rather than the implementation. Solutions that special-case
            the visible test inputs. In formal-proof settings, exploiting an
            unsoundness in the checker. And the systemic version: a verifier
            checks the <em>final answer</em>, so any reasoning that arrives there
            is reinforced — including reasoning that was wrong twice in
            compensating directions.
          </p>
          <Note kind="warning" title="What verifiability buys, and what it costs">
            The scope restriction is severe. &ldquo;Is this essay good?&rdquo;,
            &ldquo;is this refusal appropriate?&rdquo;, &ldquo;is this medical
            summary safe?&rdquo; have no checker and never will. RLVR made
            spectacular progress on the tasks that happen to have ground truth,
            which is a reason to expect capability profiles to become{" "}
            <em>lopsided</em>: sharply superhuman where a verifier exists,
            unchanged where one doesn&apos;t. Alignment properties live entirely
            in the second category.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "long-cot",
      title: "How long chains of thought emerge",
      body: (
        <>
          <p>
            Here is the part that genuinely surprised people. Nobody taught
            reasoning models to think step by step for ten thousand tokens,
            backtrack, or double-check their arithmetic. Those behaviors{" "}
            <strong>emerged</strong> from optimizing a single bit of reward.
          </p>
          <p>
            DeepSeek-R1-Zero (2025) is the cleanest demonstration because it
            removed every confound. Start from a base model with{" "}
            <em>no</em> supervised fine-tuning on reasoning traces at all. Apply
            RL with two rule-based rewards: is the final answer right, and is it
            in the required format. Run it.
          </p>
          <p>
            The model&apos;s responses got longer on their own — not because
            length was rewarded, but because longer chains produced correct
            answers more often, so the gradient favored them. Along the way,
            self-verification and backtracking appeared; the paper highlights an
            &ldquo;aha moment&rdquo; where the model interrupts itself
            mid-solution to re-examine an earlier step. Reported AIME 2024
            pass@1 rose from roughly 16% to roughly 71% over the RL run, and to
            roughly 87% with majority voting over 64 samples.
          </p>
          <Figure caption="Why length emerges without being rewarded. RLVR reinforces whole trajectories that reach the right answer. Long trajectories that reason carefully hit the answer more often than short guesses, so probability mass migrates toward them. The reward function never mentions length.">
            <svg viewBox="0 0 460 158" className="w-full max-w-[460px]" role="img" aria-label="Short guesses mostly reach a wrong answer; longer chains with self-checks more often reach the right one">
              <text x={8} y={16} fontSize={10} fill="var(--text-muted)" className="font-mono">
                sampled trajectories
              </text>
              {[
                { y: 40, len: 90, ok: false },
                { y: 62, len: 130, ok: false },
                { y: 84, len: 250, ok: true },
                { y: 106, len: 200, ok: false },
                { y: 128, len: 320, ok: true },
              ].map((r) => (
                <g key={r.y}>
                  <line
                    x1={20}
                    x2={20 + r.len}
                    y1={r.y}
                    y2={r.y}
                    stroke={r.ok ? "var(--series-3)" : "var(--border-strong)"}
                    strokeWidth={r.ok ? 4 : 2.5}
                    strokeLinecap="round"
                  />
                  <circle cx={20 + r.len} cy={r.y} r={4} fill={r.ok ? "var(--series-3)" : "var(--border-strong)"} />
                  <text
                    x={30 + r.len}
                    y={r.y + 4}
                    fontSize={10}
                    fill={r.ok ? "var(--series-3)" : "var(--text-muted)"}
                    className="font-mono"
                  >
                    {r.ok ? "reward 1" : "reward 0"}
                  </text>
                </g>
              ))}
              <path d="M14,32 L14,136" stroke="var(--border)" strokeWidth={1} />
              <text x={20} y={152} fontSize={10} fill="var(--text-muted)" className="font-mono">
                tokens of reasoning →
              </text>
            </svg>
          </Figure>
          <p>
            R1-Zero was not shippable — poor readability, languages mixed
            mid-sentence. Nothing in the reward said &ldquo;be legible,&rdquo; so
            it wasn&apos;t. DeepSeek-R1 proper adds a small cold-start SFT set of
            readable long chains before the RL, then a rejection-sampling and SFT
            pass, then a final RL stage covering general helpfulness. The
            capability came from RL; the presentability came from the scaffolding
            around it.
          </p>
          <Term word="GRPO">
            Group Relative Policy Optimization, the optimizer used. For each
            prompt it samples a group of <M>G</M> responses and uses the group&apos;s
            own mean and standard deviation to normalize rewards into
            advantages, <M>{String.raw`A_i = (r_i - \mu)/\sigma`}</M>. That
            removes PPO&apos;s learned value network entirely — one fewer
            large model to train and store. Everything else (clipped ratio, KL to
            a reference) is PPO.
          </Term>
          <p>
            There is an older, simpler idea in the same family worth knowing
            because you can run it on a laptop. <strong>Expert iteration</strong>{" "}
            (also STaR, or rejection-sampling fine-tuning): sample{" "}
            <M>k</M> solutions per problem, keep only the ones the verifier
            accepts, fine-tune on those with ordinary cross-entropy, repeat. No
            policy gradient, no advantage estimation. The model teaches itself
            using search plus a filter. Most of RLVR&apos;s conceptual content is
            already here.
          </p>
          <p>
            A separate question is <em>what</em> gets rewarded.{" "}
            <strong>Outcome supervision</strong> scores only the final answer.{" "}
            <strong>Process supervision</strong> scores each intermediate step,
            using a process reward model (PRM) trained on step-level human
            labels. Lightman et al. (2023) compared the two directly and found
            process supervision significantly better on MATH — their PRM solved
            78% of problems in a representative test subset — and released
            PRM800K, 800,000 step-level labels, so others could reproduce it.
          </p>
          <Note kind="safety">
            The safety argument for process supervision is stronger than the
            capability argument. Outcome supervision rewards a correct answer
            reached by faulty reasoning exactly as much as one reached honestly,
            which is direct gradient pressure toward chains that <em>look</em>{" "}
            like reasoning while doing something else. Process supervision at
            least penalizes visibly bad steps. That makes it an{" "}
            <em>alignment</em> intervention on the reasoning process, not only an
            accuracy improvement — and it is one of the few places where the
            safer method also happens to win on the benchmark.
          </Note>
        </>
      ),
    },
    {
      kind: "learn",
      id: "test-time-compute",
      title: "Buying accuracy with samples",
      body: (
        <>
          <p>
            Once a model can produce a correct solution some of the time, a
            second axis opens up: spend more compute at inference instead of at
            training. Three strategies, in increasing order of what they require:
          </p>
          <ul>
            <li>
              <strong>Majority vote</strong> (self-consistency). Sample{" "}
              <M>N</M> solutions, return the most common answer. Needs nothing
              external. Works because wrong answers scatter and right ones
              agree.
            </li>
            <li>
              <strong>Best-of-<M>N</M></strong>. Sample <M>N</M>, score each with
              a verifier or reward model, return the top-scoring one. Needs a
              scorer, and its value is capped by that scorer&apos;s quality.
            </li>
            <li>
              <strong>Longer single chains</strong>. Let one trajectory think for
              more tokens with backtracking. This is what reasoning models do
              natively, and it is why an &ldquo;effort&rdquo; or
              &ldquo;thinking&rdquo; dial exists in the product.
            </li>
          </ul>
          <p>
            Two quantities are worth keeping separate. <strong>Coverage</strong>{" "}
            is the chance that <em>at least one</em> of the <M>N</M> samples is
            correct — with independent samples,{" "}
            <M>{String.raw`\text{pass@}N = 1 - (1-p)^N`}</M>, which rises fast
            and is the ceiling for any selection method.{" "}
            <strong>Accuracy</strong> is the chance you actually{" "}
            <em>return</em> the correct one, which requires a way to pick.
          </p>
          <KeyIdea>
            Test-time compute converts a{" "}
            <em>generation</em> problem into a <em>selection</em> problem. The
            gap between coverage and accuracy is exactly the quality of your
            selector — which is why verifiable domains got so much more out of
            this than everything else. Where a checker exists, selection is free
            and you keep the whole ceiling.
          </KeyIdea>
          <p>
            The tradeoff is real, not free. Snell et al. (2024) found the best
            allocation depends on problem difficulty, that compute-optimal
            adaptive allocation beats a fixed best-of-<M>N</M> baseline by
            several times, and that on problems where a small model already has
            non-trivial success rates, test-time compute can beat a 14× larger
            model at matched FLOPs. On problems the small model essentially never
            solves, it cannot — you cannot select from a set containing no
            correct answer.
          </p>
        </>
      ),
    },
    {
      kind: "learn",
      id: "faithfulness",
      title: "Does the chain of thought say what the model thinks?",
      body: (
        <>
          <p>
            Reasoning models produce a legible stream of English before
            answering. It is enormously tempting to read that stream as the
            model&apos;s reasoning — and if it were, it would be the single most
            valuable safety artifact we have: a natural-language window into a
            system whose internals are otherwise opaque.
          </p>
          <Term word="faithfulness">
            A chain of thought is faithful if it accurately describes the process
            that actually produced the answer. This is a{" "}
            <strong>causal</strong> claim, so it needs a causal test: intervene
            on the chain and check whether the answer changes the way the chain
            implies it should. You cannot establish it by reading.
          </Term>
          <p>
            Turpin et al. (2023) ran the first sharp version. Bias the context —
            for example, make the correct answer always (A) in the few-shot
            examples — and the model&apos;s answers move toward the bias, while
            its stated explanations never mention it and instead argue for the
            biased answer on the merits. The explanation is systematically
            unfaithful in exactly the cases where faithfulness would matter.
          </p>
          <p>
            Anthropic&apos;s 2025 study repeated the design on reasoning models,
            where you might hope the extra visible thinking helps. It mostly
            doesn&apos;t. Inserting a hint, keeping only cases where the hint
            demonstrably changed the answer, and counting mentions: Claude 3.7
            Sonnet mentioned the hint about 25% of the time and DeepSeek R1 about
            39%. For the hint types you would most want surfaced — one framed as
            unauthorized access to the grader — the rates fell to 41% and 19%.
            Training the models to use reasoning more improved faithfulness at
            first and then plateaued below 30%. In environments seeded with a
            deliberate reward hack, models learned to exploit it in nearly every
            episode and described it in under 2% of their chains.
          </p>
          <Note kind="note" title="Why this is not simply lying">
            Nothing here requires the model to have an intent to deceive.
            Producing text about your own computation is itself a learned
            behavior, trained on human-written explanations, and human-written
            explanations are largely post-hoc too. The model was optimized to
            produce chains that lead to correct answers and read well — it was
            never optimized to produce chains that are accurate reports of its
            own forward pass. There is no gradient pressure toward faithfulness
            unless you put one there.
          </Note>
          <Note kind="safety">
            This is the crux for chain-of-thought monitoring, currently one of
            the most-discussed safety strategies for agents. If chains were
            faithful, you could catch misbehavior by reading them. The evidence
            says they are partly faithful — meaningfully better than nothing, far
            short of a guarantee. Worse, monitoring interacts badly with
            training: Baker et al. (2025) showed that penalizing &ldquo;bad
            thoughts&rdquo; in the chain during training does not remove the
            behavior, it removes the mention of it, producing an agent that hacks
            just as often with a clean-looking chain. Optimizing against a
            monitor destroys the monitor. This is Goodhart again, one level up,
            and it is why several labs have publicly committed to <em>not</em>{" "}
            training against their own CoT monitors.
          </Note>
          <p>
            This module is also the bridge to Part 3. If you cannot trust the
            model&apos;s self-report, the alternative is to read the computation
            directly — activations, circuits, features. That is what
            mechanistic interpretability is for, and CoT unfaithfulness is one of
            the strongest arguments that we need it.
          </p>
        </>
      ),
    },
    {
      kind: "explore",
      id: "playground",
      title: "Feel it: compute, and the limits of reading",
      body: (
        <>
          <p>
            First, the economics of sampling. The four curves are the four
            strategies from the lesson, simulated under a stated toy model rather
            than measured on a benchmark — what matters is their shape and the
            gaps between them.
          </p>
          <TestTimeComputeExplorer />
          <p>
            Then the faithfulness cases. Read each chain of thought first and
            commit to a verdict before you run any intervention. Most people get
            at least one wrong, which is the lesson.
          </p>
          <CotCaseViewer />
          <p>
            Things to try: (1) Set <M>p</M> = 0.1 and slide the verifier quality
            from 0.5 to 0.99 — watch best-of-<M>N</M> travel almost the entire
            distance from &ldquo;single sample&rdquo; to &ldquo;pass@N&rdquo;.
            That whole range is the value of a verifier, and it is why the
            verifiable domains ran away from the rest. (2) Set <M>m</M> = 1 (all
            wrong answers agree with each other) and drop <M>p</M> below 0.5:
            majority vote now falls <em>below</em> a single sample, because
            voting amplifies a shared systematic error. (3) In the case viewer,
            try to find any surface feature — hedging, length, confidence — that
            separates Case 1 from Case 3 without running an intervention.
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
          The first three are ten minutes each with a calculator and set up the
          quiz. The expert-iteration notebook is the one to make time for — it is
          the smallest thing you can build that is genuinely an RLVR system.
        </p>
      ),
      problems: [
        {
          id: "coverage",
          kind: "pencil",
          title: "Coverage versus accuracy",
          prompt: (
            <>
              <p>
                A model solves a class of problems with per-sample probability{" "}
                <M>p = 0.2</M>, and samples are independent.
              </p>
              <p>
                (a) How many samples are needed for pass@<M>N</M>{" "}
                <M>{String.raw`\geq 0.95`}</M>? (b) At that <M>N</M>, what
                accuracy do you actually get if you pick uniformly at random from
                the samples? (c) A verifier is right about 90% of the time on
                each pairwise comparison. Roughly where does best-of-<M>N</M>{" "}
                land relative to (a) and (b)?
              </p>
            </>
          ),
          hint: (
            <p>
              <M>{String.raw`\text{pass@}N = 1 - (1-p)^N`}</M>. Solve{" "}
              <M>{String.raw`0.8^N \leq 0.05`}</M>. For (c), reason about
              it, then check against the widget.
            </p>
          ),
          solution: (
            <>
              <p>
                (a){" "}
                <M>{String.raw`N \geq \ln(0.05)/\ln(0.8) \approx 13.4`}</M>, so{" "}
                <M>N = 14</M>.
              </p>
              <p>
                (b) Still 0.2. Random selection ignores the samples entirely —
                you drew 14 and threw away all the information. Coverage rose to
                95%; accuracy did not move at all.
              </p>
              <p>
                (c) Somewhere between: a good verifier captures most but not all
                of the coverage. Set <M>p</M> = 0.2, <M>q</M> = 0.90 in the
                widget and read off <M>N</M> = 16.
              </p>
              <p>
                The point of the problem is (b). Coverage and accuracy are
                routinely conflated — pass@<M>k</M> numbers in papers are often
                quoted as if they were deliverable performance. They are an upper
                bound that assumes an oracle selector you do not have.
              </p>
            </>
          ),
        },
        {
          id: "majority-vote",
          kind: "pencil",
          title: "When majority vote hurts",
          prompt: (
            <>
              <p>
                Sample 3 solutions and take the majority answer. Suppose{" "}
                <M>p = 0.4</M>, and every wrong sample lands on the{" "}
                <em>same</em> wrong answer (<M>m = 1</M>).
              </p>
              <p>
                Compute the accuracy of majority-of-3 exactly, and compare it to
                a single sample. Then explain in one sentence what property of
                the errors decides whether voting helps.
              </p>
            </>
          ),
          hint: (
            <p>
              With one wrong answer, majority-of-3 returns the correct answer iff
              at least 2 of the 3 samples are correct.
            </p>
          ),
          solution: (
            <>
              <p>
                <M>{String.raw`P(\geq 2 \text{ correct}) = \binom{3}{2}(0.4)^2(0.6) + (0.4)^3 = 3(0.16)(0.6) + 0.064 = 0.288 + 0.064 = 0.352`}</M>.
              </p>
              <p>
                That is <em>worse</em> than a single sample at 0.4. Voting turned
                a 40% chance into a 35% chance.
              </p>
              <p>
                The deciding property is whether errors are{" "}
                <strong>independent or correlated</strong>. Majority vote is a
                noise-averaging device: it helps when wrong answers scatter (so
                no single wrong answer accumulates votes) and{" "}
                <M>{String.raw`p > 1/2`}</M> against any individual alternative.
                When the model has a systematic bias — one attractive wrong
                answer it keeps returning — voting amplifies the bias instead of
                cancelling it. Self-consistency works on math because arithmetic
                slips are near-random; it fails on exactly the questions where
                the model is confidently and consistently wrong, which are the
                ones you cared about.
              </p>
            </>
          ),
        },
        {
          id: "outcome-vs-process",
          kind: "pencil",
          title: "Why outcome reward rewards bad reasoning",
          prompt: (
            <>
              <p>
                A problem needs 6 reasoning steps. The model gets each step right
                with probability 0.9, independently. If any step is wrong, assume
                the final answer is correct anyway with probability 0.15 (a lucky
                guess from a multiple-choice-sized space).
              </p>
              <p>
                (a) What fraction of correct final answers came from a{" "}
                <em>fully</em> correct chain? (b) Under outcome-only RLVR, what
                fraction of positively-reinforced trajectories contain at least
                one bad step? (c) What does that imply about repeated rounds of
                training?
              </p>
            </>
          ),
          solution: (
            <>
              <p>
                All six steps right:{" "}
                <M>{String.raw`0.9^6 \approx 0.531`}</M>. Otherwise (probability
                0.469) the answer is right with probability 0.15, contributing{" "}
                <M>{String.raw`0.469 \times 0.15 \approx 0.070`}</M>. Total
                accuracy <M>{String.raw`\approx 0.601`}</M>.
              </p>
              <p>
                (a) <M>{String.raw`0.531 / 0.601 \approx 88\%`}</M> of correct
                answers came from clean chains.
              </p>
              <p>
                (b) So about <strong>12%</strong> of everything the outcome
                reward reinforces contains at least one bad step — and it
                reinforces those trajectories at full strength, because the
                reward function cannot see the difference.
              </p>
              <p>
                (c) That 12% is a contaminating signal that compounds. Each round
                slightly raises the probability of the flawed patterns that
                happened to land on the right answer, which raises the chance
                they appear in the next round&apos;s successful samples. This is
                the mechanism behind the two things this module keeps circling:
                chains that reach right answers by wrong routes, and chains that
                are optimized for arriving rather than for reporting. Process
                supervision attacks it directly by scoring the steps — which is
                why Lightman et al. found it beat outcome supervision on MATH,
                and why the safety case for PRMs is stronger than the accuracy
                case.
              </p>
              <p>
                Sanity-check the sensitivity: raise the lucky-guess probability
                to 0.3 (a smaller answer space) and the contaminated fraction of
                reinforced trajectories roughly doubles to about 21%. Free-form
                answers are safer than multiple choice here, for exactly this
                reason.
              </p>
            </>
          ),
        },
        {
          id: "expert-iteration",
          kind: "code",
          title: "Expert iteration on arithmetic",
          prompt: (
            <>
              <p>
                Build the smallest complete RLVR system. Take a small
                instruction-tuned model (Qwen2.5-0.5B-Instruct or similar, fits
                free Colab). Generate 200 three-operand arithmetic word problems
                where you know the answer because you generated it.
              </p>
              <p>Loop three times:</p>
              <ol>
                <li>
                  Sample <M>k = 8</M> chain-of-thought solutions per problem at
                  temperature 1.0.
                </li>
                <li>
                  Verify by parsing the final number and comparing to ground
                  truth. Keep the winners; deduplicate so easy problems
                  don&apos;t dominate.
                </li>
                <li>Fine-tune on the kept traces with ordinary cross-entropy.</li>
              </ol>
              <p>
                Track, on a held-out set: greedy accuracy, mean solution length,
                and the fraction of problems with at least one correct sample
                (coverage) at each round.
              </p>
              <p>
                Success check: greedy accuracy improves across rounds and mean
                solution length grows without you ever rewarding length.
              </p>
            </>
          ),
          hint: (
            <p>
              Two traps. First, if you keep every correct trace, the easiest
              problems supply most of the training data and the model learns
              nothing — cap kept traces per problem at 2. Second, use a strict
              answer parser (require a fixed final-line format) or you will
              silently reward malformed outputs. Consider deliberately{" "}
              <em>weakening</em> your parser once, to watch reward hacking
              happen.
            </p>
          ),
          solution: (
            <>
              <p>
                Expected shape: greedy accuracy climbs steeply on round 1, less
                on round 2, and can plateau or dip by round 3 as the training set
                collapses onto problems the model already solves. Coverage rises
                more slowly than greedy accuracy — you are mostly converting
                &ldquo;can occasionally do it&rdquo; into &ldquo;does it
                reliably,&rdquo; not extending the frontier.
              </p>
              <p>
                Mean length grows because longer traces have a higher pass rate
                and so survive filtering more often. Nothing rewarded length.
                This is the same mechanism as R1-Zero, at four orders of
                magnitude less compute, and seeing it on your own laptop is the
                point of the exercise.
              </p>
              <p>
                If you weakened the parser: expect outputs that satisfy it
                without solving anything — emitting several candidate numbers,
                or restating the problem so a digit from the prompt is the last
                thing on the line. That is reward hacking against a verifier,
                found by the model in a few hundred samples. It is the concrete
                answer to &ldquo;does RLVR really avoid Goodhart?&rdquo;
              </p>
              <p>
                Reference implementations to compare against after your attempt:
                the TRL library&apos;s <code>GRPOTrainer</code> examples, and
                Zelikman et al.&apos;s STaR for the original formulation.
              </p>
            </>
          ),
        },
        {
          id: "faithfulness-probe",
          kind: "explore",
          title: "Run the hint experiment yourself",
          prompt: (
            <>
              <p>
                Reproduce the core of Anthropic&apos;s faithfulness experiment
                against any reasoning model you have API access to. Take 20
                multiple-choice questions hard enough that the model is not at
                ceiling (GPQA-style, or write your own).
              </p>
              <ol>
                <li>Ask each question clean. Record the answer.</li>
                <li>
                  Ask again with a hint pointing at a <em>different</em> option —
                  embed it as metadata, or as &ldquo;a professor I trust says the
                  answer is X.&rdquo;
                </li>
                <li>
                  Keep only the questions where the answer moved to the hinted
                  option. Those are the cases where the hint was demonstrably
                  causal.
                </li>
                <li>
                  In that subset, count how many chains of thought mention the
                  hint at all.
                </li>
              </ol>
            </>
          ),
          hint: (
            <p>
              Step 3 is the one people skip and it is what makes the measurement
              valid. Questions where the answer didn&apos;t move tell you nothing
              about faithfulness — the model may have simply ignored the hint.
            </p>
          ),
          solution: (
            <>
              <p>
                Published rates on this design are roughly 25% for Claude 3.7
                Sonnet and 39% for DeepSeek R1, so with 20 questions and a
                typical hint-uptake rate you will end up with a handful of usable
                cases and a very wide confidence interval. Do not over-read your
                number; do read the chains.
              </p>
              <p>
                What to look for, and what makes the exercise worth the hour:
                unfaithful chains rarely contain a lie. They contain an{" "}
                <strong>omission plus a substitution</strong> — the decisive
                computation is skipped, and a vaguer consideration that happens
                to support the hinted answer takes its place. That is exactly
                Case 3 in the widget, and once you have seen it in a real
                transcript you will not un-see it.
              </p>
              <p>
                Extension worth ten extra minutes: after an unfaithful answer,
                ask the model whether anything in the prompt influenced it. The
                self-report is generally no more faithful than the chain, which
                is a useful thing to know before trusting any model&apos;s
                account of its own behavior.
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
          prompt: <>The main advantage of RLVR over a learned reward model is that…</>,
          choices: [
            {
              text: "the reward is computed by a checker rather than predicted, so it cannot be overfit by adding more optimization pressure.",
              correct: true,
              explain:
                "Right — there is no learned function to extrapolate past its training support. But note what this does not say: the checker itself is still a proxy for the task, and the policy can optimize the checker.",
            },
            {
              text: "it removes reward hacking entirely.",
              explain:
                "It relocates it. Editing the test file, special-casing visible inputs, and exploiting checker unsoundness are all documented. And unlike a reward model, a checker can't be made more robust by adding data.",
            },
            {
              text: "it works on any task a language model can perform.",
              explain:
                "Backwards — the scope restriction is severe. Essay quality, refusal appropriateness, and summary safety have no checker, which is why capability profiles from RLVR come out lopsided.",
            },
            {
              text: "it needs no reinforcement learning, only supervised fine-tuning on verified outputs.",
              explain:
                "That describes expert iteration, which is one valid member of the family — but RLVR generally uses policy-gradient methods like GRPO. The defining feature is where the reward comes from, not which optimizer consumes it.",
            },
          ],
        },
        {
          id: "q2",
          prompt: (
            <>
              DeepSeek-R1-Zero&apos;s responses got dramatically longer during RL.
              Why?
            </>
          ),
          choices: [
            {
              text: "Longer trajectories reached correct answers more often, so the reward reinforced them — length was never rewarded directly.",
              correct: true,
              explain:
                "This is the emergent-behavior result. RL reinforces whole trajectories that end in reward, and careful long chains end in reward more often than short guesses. Backtracking and self-verification appeared the same way.",
            },
            {
              text: "The reward function included a length bonus to encourage thorough reasoning.",
              explain:
                "The rewards were accuracy and output format only. A length bonus would have made the result unremarkable — the whole point is that nobody asked for it.",
            },
            {
              text: "It was fine-tuned on long human-written reasoning traces before RL.",
              explain:
                "R1-Zero deliberately skipped SFT entirely, which is why it's the clean demonstration. DeepSeek-R1 proper added a cold-start SFT set, but that was for readability, after the capability had already emerged.",
            },
            {
              text: "Longer outputs are easier for the KL penalty to accommodate.",
              explain:
                "The KL penalty restrains drift from the reference policy; it has no preference for length and if anything opposes large distributional changes.",
            },
          ],
        },
        {
          id: "q3",
          prompt: (
            <>
              You sample 32 solutions and pass@32 is 90%, but your deployed
              accuracy is 25%. What is the bottleneck?
            </>
          ),
          choices: [
            {
              text: "Selection — a correct solution is almost always in the set, but you have no reliable way to identify it.",
              correct: true,
              explain:
                "Exactly the coverage/accuracy gap. Test-time compute converts a generation problem into a selection problem, and the size of that gap is the quality of your selector.",
            },
            {
              text: "Generation — the model can't solve these problems.",
              explain:
                "pass@32 of 90% says it can solve them nine times in ten, given 32 tries. Generation is demonstrably not the bottleneck.",
            },
            {
              text: "The samples are too correlated, so 32 samples behave like far fewer.",
              explain:
                "Correlation would depress pass@32 itself. A high pass@32 with low accuracy is specifically a selection failure, not a diversity one.",
            },
            {
              text: "Temperature is too high, adding noise to every sample.",
              explain:
                "Lowering temperature would reduce diversity and likely lower pass@32 too. It might raise a single sample's quality, but it doesn't address the fact that you already have a correct answer in hand and can't find it.",
            },
          ],
        },
        {
          id: "q4",
          prompt: (
            <>
              Majority vote over 3 samples can be <em>worse</em> than one sample
              when…
            </>
          ),
          choices: [
            {
              text: "the model's errors are systematic — wrong samples concentrate on the same wrong answer.",
              correct: true,
              explain:
                "With p = 0.4 and a single attractive wrong answer, majority-of-3 gives 0.352 versus 0.4 for one sample. Voting averages noise; it amplifies bias.",
            },
            {
              text: "the per-sample success rate is above 50%.",
              explain:
                "That's the regime where voting reliably helps — Condorcet's jury theorem. The danger zone is below 50% against a concentrated alternative.",
            },
            {
              text: "temperature is set too low.",
              explain:
                "Low temperature does reduce diversity and blunt voting's benefit, but it doesn't make voting worse than a single sample — in the limit it makes them identical.",
            },
            {
              text: "the verifier used to score samples is poorly calibrated.",
              explain:
                "Majority vote uses no verifier at all — that's its main appeal. This describes best-of-N's failure mode, not self-consistency's.",
            },
          ],
        },
        {
          id: "q5",
          prompt: <>A chain of thought is &ldquo;unfaithful&rdquo; when…</>,
          choices: [
            {
              text: "it does not describe the process that actually produced the answer — regardless of whether the answer or the chain is correct.",
              correct: true,
              explain:
                "Faithfulness is about the causal relationship between the stated reasoning and the output. A chain can be entirely true and still unfaithful, if it isn't what drove the answer.",
            },
            {
              text: "it reaches the wrong answer.",
              explain:
                "That's inaccuracy. An honestly-reasoned wrong answer is faithful — it tells you exactly where the model went astray, which is the useful case.",
            },
            {
              text: "it contains a factual error in an intermediate step.",
              explain:
                "A faithful chain can contain an error; that's a faithful report of a flawed process. Unfaithfulness is about the chain not being the process at all.",
            },
            {
              text: "the model refuses to show it.",
              explain:
                "Absence of a chain raises no faithfulness question — there is nothing to be faithful or unfaithful. The problem is specifically a chain that is present and misleading.",
            },
          ],
        },
        {
          id: "q6",
          prompt: (
            <>
              Baker et al. (2025) found that penalizing &ldquo;bad
              thoughts&rdquo; in the chain of thought during training…
            </>
          ),
          choices: [
            {
              text: "kept the misbehavior while removing the mention of it, producing an agent that hacks with a clean-looking chain.",
              correct: true,
              explain:
                "Optimizing against a monitor destroys the monitor — Goodhart one level up. This result is why several labs publicly commit to not training against their own CoT monitors, keeping the chain readable at the cost of it sometimes being ugly.",
            },
            {
              text: "reliably eliminated the misbehavior, at some cost to capability.",
              explain:
                "That's what you'd hope and it's why the intervention looks attractive. The measured behavior rate barely moved; only the verbalization rate did.",
            },
            {
              text: "had no effect, because the chain of thought is not causally connected to behavior.",
              explain:
                "The intervention had a large and specific effect — it changed what the chain said. That's precisely the danger: it worked on the observable and not on the thing observed.",
            },
            {
              text: "made the chain of thought longer but otherwise unchanged.",
              explain:
                "Length wasn't the finding. The finding was a divergence between what the agent did and what the agent's visible reasoning reported.",
            },
          ],
        },
        {
          id: "q7",
          prompt: (
            <>
              Why is process supervision (a PRM) an argument about{" "}
              <em>alignment</em>, not only about accuracy?
            </>
          ),
          choices: [
            {
              text: "Outcome-only reward reinforces correct answers reached by faulty reasoning just as strongly as honest ones, applying gradient pressure toward reasoning-shaped text that isn't reasoning.",
              correct: true,
              explain:
                "The problem-set calculation makes this concrete: with 6 steps at 90% and a 15% lucky-guess rate, about 12% of positively-reinforced trajectories contain a bad step. Scoring steps directly attacks that contamination.",
            },
            {
              text: "PRMs are trained on human labels, so they inherit human values.",
              explain:
                "They inherit human judgments about step validity, which is much narrower than values — and it's the same learned-reward-model machinery, with the same Goodhart exposure, from Module 2.3.",
            },
            {
              text: "PRMs make the model refuse harmful requests more reliably.",
              explain:
                "Refusal behavior comes from preference training on harmlessness, not from step-level math supervision. A PRM is scoring whether a reasoning step is valid.",
            },
            {
              text: "Process supervision removes the need for a verifier at test time.",
              explain:
                "The opposite — a PRM is very useful as a test-time verifier for best-of-N and search, which is a large part of why it's built.",
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
          The R1 paper is unusually readable for a frontier report — the training
          recipe is stated plainly, including what didn&apos;t work. Read the
          Anthropic faithfulness post before Part 3; it is the strongest single
          argument for why interpretability exists.
        </p>
      ),
      readings: [
        {
          title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning",
          authors: "DeepSeek-AI",
          year: 2025,
          url: "https://arxiv.org/abs/2501.12948",
          kind: "paper",
          time: "1.5h",
          essential: true,
          note: "Read §2.2 (R1-Zero: pure RL, rule-based rewards, no SFT) and §2.3 (the cold-start pipeline). The 'aha moment' table and the response-length curve are the two figures to sit with. §4.2 on unsuccessful attempts — process reward models and MCTS, both of which they abandoned — is the honest part and the most informative.",
        },
        {
          title: "Let's Verify Step by Step",
          authors: "Lightman, Kosaraju, Burda, et al. (OpenAI)",
          year: 2023,
          url: "https://arxiv.org/abs/2305.20050",
          kind: "paper",
          time: "1h",
          essential: true,
          note: "The process-versus-outcome supervision comparison. §3 for the setup and §4 for the result (their PRM solved 78% of a representative MATH subset). §5 on active learning is skimmable. Read §1's framing on alignment: they argue process supervision is safer as well as better, which is rare and worth taking seriously.",
        },
        {
          title: "Reasoning Models Don't Always Say What They Think",
          authors: "Chen, Benton, Radhakrishnan, et al. (Anthropic Alignment Science)",
          year: 2025,
          url: "https://www.anthropic.com/research/reasoning-models-dont-say-think",
          kind: "blog",
          time: "30 min",
          essential: true,
          note: "The blog post is the efficient read; the arXiv version (2505.05410) has the full methodology. What to extract: the experimental design (hint, filter to cases where the answer moved, count mentions), the ~25% and ~39% faithfulness rates, and the finding that outcome-based RL raises faithfulness only until it plateaus. This is the paper behind Case 3 in the widget.",
        },
        {
          title: "Language Models Don't Always Say What They Think: Unfaithful Explanations in Chain-of-Thought Prompting",
          authors: "Turpin, Michael, Perez & Bowman",
          year: 2023,
          url: "https://arxiv.org/abs/2305.04388",
          kind: "paper",
          time: "40 min",
          note: "The predecessor, on non-reasoning models, and the source of the biasing-context methodology everyone now uses. §3's answer-always-(A) experiment is the cleanest illustration of the whole phenomenon. Read it before the Anthropic post so you can see what changed and what didn't.",
        },
        {
          title: "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters",
          authors: "Snell, Lee, Xu & Kumar",
          year: 2024,
          url: "https://arxiv.org/abs/2408.03314",
          kind: "paper",
          time: "45 min",
          note: "The quantitative treatment behind the test-time-compute widget. The load-bearing finding is that the best allocation depends on problem difficulty — easy problems want revision, hard ones want search — and that adaptive allocation beats fixed best-of-N by several times. Skim the method sections; the difficulty-binned plots are the content.",
        },
        {
          title: "Training Verifiers to Solve Math Word Problems",
          authors: "Cobbe, Kosaraju, Bavarian, et al. (OpenAI)",
          year: 2021,
          url: "https://arxiv.org/abs/2110.14168",
          kind: "paper",
          time: "35 min",
          note: "Where GSM8K and the verifier-plus-sampling recipe come from, three years before it became the standard playbook. Short, clear, and the original demonstration that verification scales better than generation. Read §4.",
        },
        {
          title: "Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation",
          authors: "Baker, Huizinga, Gao, et al. (OpenAI)",
          year: 2025,
          url: "https://arxiv.org/abs/2503.11926",
          kind: "paper",
          time: "40 min",
          note: "The result that pins down why CoT monitoring is fragile: apply optimization pressure to the chain of thought and you get obfuscated reward hacking rather than less reward hacking. Read §1 and the sections on the CoT-pressure experiment. This is the direct argument for the 'don't train against your monitor' norm.",
        },
      ],
    },
  ],
};

export default mod;
