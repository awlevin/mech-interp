# Interpretable: A Crash Course in Transformers, LLMs & Mechanistic Interpretability

A comprehensive, hands-on curriculum built for a visual learner who learns by doing.
Goal: go from "curious engineer" to "can read Transformer Circuits papers critically,
run real interpretability experiments, and reason about training/steering/safety tradeoffs."

## Why this curriculum exists (your goals, mapped)

1. **AI safety (primary):** Parts 3–5 build toward understanding models well enough to
   audit them — superposition, SAEs, circuits, deception, alignment faking, evals.
2. **Model performance & reliability:** Module 2.5 + threads throughout (calibration,
   hallucination, CoT faithfulness, reward hacking).
3. **Influencing behavior / enjoyable models:** Modules 4.2, 5.1 (functional emotions,
   steering vectors, persona shaping, Golden Gate Claude).
4. **On-the-fly learning by adjusting weights:** Module 5.2 (model editing, ROME/MEMIT,
   test-time training, continual learning) plus 3.2 (in-context learning as "fast weights").
5. **Training-stage taxonomy (base vs SFT vs RLHF vs RLVR):** All of Part 2.

## Pedagogy

Every module follows the same loop, designed for visual + kinesthetic learning:

| Phase | What it is | Format |
|---|---|---|
| **Learn** | Visual-first explainer. Diagrams before equations, equations annotated term-by-term. | Interactive lesson pages |
| **Explore** | A widget you play with until the concept clicks. | Interactive React components |
| **Practice** | Problem set: pencil-and-paper + coding exercises (Colab/notebook links). | Problems with hidden solutions & hints |
| **Check** | Quiz with instant feedback and explanations for every option. | Quiz engine, results saved to profile |
| **Go deeper** | The real literature, ordered by accessibility, with reading guides. | Annotated reading lists |

Rules of thumb baked in: never introduce notation before the picture; every paper gets a
"how to read this" note; every abstract concept gets a toy example you can manipulate.

**Estimated total time:** ~80–120 hours. Suggested pace: 2 modules/week ≈ 10 weeks.

---

## Part 0 — Foundations (the minimum viable math)

### Module 0.1 · Linear Algebra as Geometry
The whole field runs on "directions in activation space." This module makes that phrase mean something.
- **Concepts:** vectors as directions/points; dot product as similarity; matrices as maps;
  rank & low-rank factorization; projections; change of basis; SVD; why high-dimensional
  space is weird (near-orthogonality, you can cram exponentially many almost-orthogonal
  directions into d dimensions — the seed of superposition).
- **Explore:** projection playground (drag a vector, see its shadow on a subspace);
  "how many ε-orthogonal vectors fit?" simulator.
- **Practice:** compute attention-shaped matrix products by hand at 2×2 scale; show a
  rank-1 matrix is an outer product; verify near-orthogonality numerically in a notebook.
- **Readings:** 3Blue1Brown *Essence of Linear Algebra* (chapters 1–4, 9, 13);
  Goodfellow *Deep Learning* ch. 2 (reference only).

### Module 0.2 · Probability, Information & Optimization
- **Concepts:** distributions over tokens; softmax & temperature; cross-entropy loss and
  why it's "surprise"; KL divergence; perplexity; gradient descent; backprop as chain rule
  on a graph; loss landscapes.
- **Explore:** softmax temperature slider on real logits; gradient descent ball rolling on
  a 2D loss surface (with learning-rate slider so you can make it diverge).
- **Practice:** hand-compute cross-entropy for a 4-token vocab; derive the softmax
  gradient; implement backprop for a 2-layer net in ~40 lines of NumPy.
- **Readings:** 3Blue1Brown neural network series (ch. 1–4); Karpathy *"The spelled-out
  intro to neural networks and backpropagation: building micrograd"* (video, do-along).

---

## Part 1 — Transformer Fundamentals

### Module 1.1 · Tokens & Embeddings
- **Concepts:** why tokenize; BPE; tokenizer quirks (SolidGoldMagikarp, arithmetic,
  multilingual costs); embedding matrices; embedding space geometry (analogies,
  clusters); tied embeddings/unembeddings; the logit lens preview.
- **Explore:** live BPE tokenizer (type text, watch merges happen); embedding-space
  map (2D projection of real token embeddings, searchable).
- **Practice:** implement BPE merges by hand on a tiny corpus; explain three real-world
  LLM failures traceable to tokenization.
- **Readings:** Karpathy *"Let's build the GPT Tokenizer"* (video);
  *"SolidGoldMagikarp"* (LessWrong).

### Module 1.2 · Attention, Fully Understood
The single most important module in Part 1.
- **Concepts:** queries/keys/values as soft lookup; scaled dot-product (why √d);
  causal masking; multi-head attention; attention patterns as information routing;
  heads as independent communication channels reading/writing the residual stream.
- **Explore:** interactive attention visualizer — type a sentence, see per-head
  patterns; QK playground where you drag key vectors and watch weights shift.
- **Practice:** hand-compute a full attention pass for a 3-token, d=4 example;
  implement single-head then multi-head attention in NumPy; predict the attention
  pattern of a "previous token head" before running it.
- **Readings:** Vaswani et al. 2017 *Attention Is All You Need* (with reading guide —
  read §3 only, skip the MT plumbing); Jay Alammar *The Illustrated Transformer*;
  3Blue1Brown *"Attention in transformers, visually explained."*

### Module 1.3 · The Full Block & the Residual Stream
- **Concepts:** MLP layers (where most parameters live; key-value memories view);
  LayerNorm/RMSNorm; positional information & RoPE; **the residual stream as the
  central object** — shared bandwidth, virtual weights, everything reads/writes it;
  why "layers" are better thought of as incremental updates to a running state.
- **Explore:** residual-stream flow diagram (animated: watch information accumulate
  layer by layer); parameter-count calculator (sliders for d_model, n_layers, n_heads
  → see where params go).
- **Practice:** count GPT-2 small's parameters by hand and check against reality;
  implement a full transformer block in NumPy; logit-lens exercise — decode the
  residual stream at every layer and watch the prediction form.
- **Readings:** Elhage et al. 2021 *A Mathematical Framework for Transformer
  Circuits* (§ on residual stream + virtual weights — first pass, revisited in 3.2);
  Karpathy *"Let's build GPT: from scratch, in code"* (do-along, the spine of Part 1).

### Module 1.4 · Training Dynamics & Scaling
- **Concepts:** next-token prediction as the universal objective; loss curves; what
  loss numbers mean in nats/token; scaling laws (Kaplan → Chinchilla compute-optimal);
  emergence debates; grokking & phase changes; double descent.
- **Explore:** scaling-law explorer (log-log sliders: params/data/compute → predicted
  loss); grokking curve animation (train vs test accuracy over 10k epochs).
- **Practice:** fit a power law to provided loss data; compute Chinchilla-optimal
  tokens for a given FLOP budget; train a tiny transformer on modular addition and
  watch it grok (notebook).
- **Readings:** Kaplan et al. 2020 *Scaling Laws for Neural Language Models* (§1–3);
  Hoffmann et al. 2022 *Chinchilla* (skim); Nanda et al. 2023 *Progress measures for
  grokking via mechanistic interpretability*.

---

## Part 2 — How LLMs Are Actually Made

### Module 2.1 · Pretraining & Base Models
- **Concepts:** data pipelines (Common Crawl → filtered corpora); what base models are
  (simulators/next-token predictors, not assistants); base-model psychology — why they
  continue rather than answer; compute realities of frontier pretraining.
- **Explore:** "base model vs assistant" side-by-side simulator on the same prompts.
- **Practice:** prompt a real base model (via API or local) to behave like an assistant
  using only few-shot context; document where the simulator framing predicts its behavior.
- **Readings:** janus *Simulators* (LessWrong); GPT-3 paper (Brown et al. 2020, §1–2);
  *The Pile* paper (skim for data intuition).

### Module 2.2 · Supervised Fine-Tuning & PEFT
- **Concepts:** instruction tuning; chat templates; SFT datasets; full fine-tune vs
  LoRA/QLoRA (the low-rank insight connects back to 0.1); catastrophic forgetting;
  when fine-tuning is/isn't the right tool.
- **Explore:** LoRA rank visualizer (see the low-rank update ΔW = BA morph a weight
  matrix; slider for rank r vs quality vs params).
- **Practice:** fine-tune a small model (Qwen/Llama-class) with LoRA on a tiny custom
  dataset in Colab; measure what it forgot.
- **Readings:** Hu et al. 2021 *LoRA*; Dettmers et al. 2023 *QLoRA* (skim);
  Ouyang et al. 2022 *InstructGPT* §3 (SFT stage).

### Module 2.3 · RLHF, Reward Models & DPO
- **Concepts:** preference data; reward model training; PPO at a conceptual level;
  KL penalty against the reference model; DPO as "RLHF without RL"; Constitutional AI /
  RLAIF; failure modes — **reward hacking, sycophancy, mode collapse** (safety thread).
- **Explore:** reward-hacking playground (toy agent maximizes a proxy reward; watch it
  Goodhart); preference-pair labeler (you label pairs, watch a reward model fit to you).
- **Practice:** derive the DPO objective from the RLHF objective (guided); label 20
  preference pairs and articulate where your own ratings are inconsistent — connect to
  reward-model noise.
- **Readings:** Christiano et al. 2017 *Deep RL from Human Preferences*; Ouyang et al.
  2022 *InstructGPT* (full); Rafailov et al. 2023 *DPO*; Bai et al. 2022
  *Constitutional AI*; Anthropic *Towards understanding sycophancy in language models*.

### Module 2.4 · RLVR & Reasoning Models
- **Concepts:** verifiable rewards (math/code checkers) vs learned reward models; why
  RLVR sidesteps reward hacking (and where it doesn't); DeepSeek-R1 & the emergence of
  long chain-of-thought; test-time compute scaling; CoT faithfulness — does the chain
  of thought reflect the real computation? (bridges to interp in 4.1).
- **Explore:** test-time-compute explorer (accuracy vs #samples/vs thinking length on
  real benchmark data); faithful-vs-unfaithful CoT case viewer.
- **Practice:** build a tiny RLVR loop — sample solutions to arithmetic problems,
  reward exact answers, fine-tune on winners (expert iteration in a notebook).
- **Readings:** DeepSeek-AI 2025 *DeepSeek-R1*; Lightman et al. 2023 *Let's Verify Step
  by Step*; Anthropic 2025 *Reasoning models don't always say what they think*.

### Module 2.5 · Inference, Performance & Reliability
- **Concepts:** sampling (temperature/top-p/top-k) and their failure modes; KV cache;
  speculative decoding; quantization (what actually degrades); hallucination —
  calibration vs confabulation; uncertainty & refusal tuning; evals 101.
- **Explore:** sampling playground (same prompt, live token-probability bars, adjust
  temperature/top-p and watch text change); KV-cache memory calculator.
- **Practice:** implement top-p sampling from raw logits; design a 10-item eval for a
  behavior you care about and run it against two models.
- **Readings:** Holtzman et al. 2019 *The Curious Case of Neural Text Degeneration*;
  Kadavath et al. 2022 *Language Models (Mostly) Know What They Know*.

---

## Part 3 — Mechanistic Interpretability: The Core

### Module 3.1 · The Interp Mindset & Observational Tools
- **Concepts:** what mech interp is (reverse-engineering learned programs); features,
  circuits, motifs, universality; microscope vs behavioral evals; observational tools —
  logit lens, tuned lens, linear probes; correlational vs causal evidence (the field's
  central epistemic discipline).
- **Explore:** logit lens on GPT-2 (type text, see per-layer predictions crystallize);
  probe trainer on cached activations.
- **Practice:** run logit lens in TransformerLens; train a linear probe for a simple
  property; construct a case where a probe finds a direction the model provably
  doesn't use (correlation ≠ causation).
- **Readings:** Olah et al. 2020 *Zoom In: An Introduction to Circuits*; nostalgebraist
  *interpreting GPT: the logit lens*; Neel Nanda *A Comprehensive Mechanistic
  Interpretability Explainer & Glossary* (reference for the whole Part).

### Module 3.2 · A Mathematical Framework & Induction Heads
- **Concepts:** the full Elhage et al. 2021 treatment — attention heads as independent
  additive operations; QK circuits (where to attend) vs OV circuits (what to move);
  composition (Q-, K-, V-composition); virtual attention heads; **induction heads** as
  the canonical circuit; in-context learning as the induction bump; ICL as "fast
  weights" — learning without weight updates (your on-the-fly-learning interest starts here).
- **Explore:** induction head visualizer ([A][B]...[A]→[B] with live attention
  patterns); composition diagram builder.
- **Practice:** find induction heads in a real 2-layer model with TransformerLens;
  verify a previous-token head feeds them via K-composition; ablate and measure.
- **Readings:** Elhage et al. 2021 *A Mathematical Framework for Transformer Circuits*
  (full, with reading guide); Olsson et al. 2022 *In-context Learning and Induction
  Heads* (§1–4).

### Module 3.3 · Superposition (Toy Models) ⭐ your gateway paper
- **Concepts:** the linear representation hypothesis; features as directions; why
  models represent more features than dimensions; importance & sparsity as the axes of
  the phase diagram; feature geometry (digons, triangles, pentagons, antipodal pairs);
  computation in superposition; why superposition is *the* obstacle for interp and a
  crux for safety (can't audit what you can't decompose).
- **Explore:** **live toy model of superposition** — train the actual ReLU toy model in
  the browser, sliders for sparsity/importance, watch the feature-geometry phase
  transitions happen (the module's centerpiece); interference visualizer.
- **Practice:** replicate the core Toy Models phase diagram in a notebook; derive when
  two antipodal features beat one dedicated dimension; explore what happens with
  correlated features.
- **Readings:** Elhage et al. 2022 *Toy Models of Superposition* (full, sectioned
  reading plan across 3 sittings); Gurnee et al. 2023 *Finding Neurons in a Haystack*
  (skim); *Superposition, Memorization, and Double Descent* (optional).

### Module 3.4 · Sparse Autoencoders & Dictionary Learning
- **Concepts:** dictionary learning as the answer to superposition; SAE architecture &
  training (L1 vs TopK; the reconstruction/sparsity frontier); feature splitting;
  Towards → Scaling Monosemanticity: safety-relevant features in Claude 3 Sonnet
  (deception, sycophancy, bias, dangerous capabilities); **Golden Gate Claude** as the
  proof-of-concept for feature steering; known SAE limitations (dark matter, shrinkage,
  atomicity debates).
- **Explore:** SAE anatomy diagram (animated encode→sparse→decode); embedded
  Neuronpedia feature browser; feature-splitting tree explorer.
- **Practice:** train a small SAE on GPT-2 activations (notebook, ~30 min GPU); find
  your favorite feature on Neuronpedia and characterize its activation distribution;
  measure reconstruction loss vs sparsity tradeoff on your own SAE.
- **Readings:** Bricken et al. 2023 *Towards Monosemanticity*; Templeton et al. 2024
  *Scaling Monosemanticity* ⭐; Gao et al. 2024 *Scaling and evaluating sparse
  autoencoders* (OpenAI, skim).

### Module 3.5 · Causal Methods: Patching, Ablation & Circuit Discovery
- **Concepts:** the interventionist ladder — ablation (zero/mean/resample), activation
  patching (denoising vs noising), path patching, attribution patching (gradients as
  cheap patching); the **IOI circuit** as the canonical worked example (name movers,
  S-inhibition, backup heads); causal scrubbing as the rigorous standard; what "the
  circuit explains X% of performance" actually means.
- **Explore:** interactive patching sandbox — pick a component on a model diagram,
  patch it between clean/corrupt prompts, see the logit difference move; IOI circuit
  map with clickable heads.
- **Practice:** full IOI replication arc in TransformerLens (guided notebook,
  the classic rite of passage); attribution-patch the same circuit and compare to
  real patching.
- **Readings:** Wang et al. 2022 *Interpretability in the Wild (IOI)*; Heimersheim &
  Nanda 2024 *How to use and interpret activation patching*; Neel Nanda *Attribution
  Patching* (blog).

---

## Part 4 — Frontier Interpretability (the 2025–2026 wave)

### Module 4.1 · Circuit Tracing & the Biology of LLMs
- **Concepts:** from features to circuits at scale — transcoders (per-layer MLP
  replacements), cross-layer transcoders, **attribution graphs**; case studies from
  *On the Biology of a Large Language Model*: multi-step reasoning (Dallas→Austin),
  poetry planning (planned rhymes!), addition circuits, multilingual "language of
  thought," why models hallucinate (known-entity features suppressing "can't answer"),
  unfaithful CoT detection, refusal circuits, hidden-goal detection.
- **Explore:** attribution-graph walkthrough viewer (step through the poetry-planning
  and Dallas→Austin graphs node by node); "predict the mechanism" game — guess how the
  model does a task before seeing the graph.
- **Practice:** work through an attribution graph on Neuronpedia's circuit-tracing
  tools; write a one-page "biology report" on a behavior of your choice.
- **Readings:** Anthropic 2025 *On the Biology of a Large Language Model* ⭐ (the
  centerpiece — 3-sitting reading plan); Anthropic 2025 *Circuit Tracing* (methods
  companion, skim); Marks et al. 2024 *Sparse Feature Circuits* (optional).

### Module 4.2 · Functional Emotions ⭐ your gateway paper
- **Concepts:** emotion concept representations in Claude Sonnet 4.5; emotion vectors —
  finding them, validating them (activation in context, causal influence on outputs);
  the geometry of emotion space (valence/arousal structure); present-speaker vs
  other-speaker emotions; **functional emotions** as mediators of misaligned behavior —
  the blackmail, reward-hacking, and sycophancy case studies; what changes across
  post-training; what this does and doesn't say about subjective experience.
- **Explore:** emotion-space map (2D valence/arousal layout of emotion vectors);
  case-study viewer for the blackmail/reward-hacking/sycophancy transcripts with
  steering deltas.
- **Practice:** steer a small open model with a contrastive "emotion" vector you build
  yourself (notebook); design an eval for emotion-mediated behavior change.
- **Readings:** Anthropic 2026 *Emotion Concepts and their Function in a Large
  Language Model* ⭐ (full reading plan); Anthropic 2025 *Persona vectors* (companion);
  Lindsey 2025 *Emergent introspective awareness* (optional bridge to 4.3).
- **Safety tie-in:** this is the clearest published example of interp finding
  *behavior-mediating* internal state relevant to misalignment — discuss what an
  auditor would do with it.

### Module 4.3 · The Global Workspace & Introspection ⭐ your gateway paper
- **Concepts:** the J-lens (Jacobian lens) — linearized causal effect of activations on
  outputs; the **J-space** as a sparse privileged subspace (~10% of variance);
  five workspace properties (verbal report, directed modulation, reasoning mediation,
  flexible generalization, selectivity); ignition effects; automatic vs deliberate
  processing in LLMs; access-consciousness framing (carefully); counterfactual
  reflection training; connections to introspection & model self-reports — when can
  you trust what a model says about itself?
- **Explore:** workspace-layers diagram (which layers "ignite"); verbalizable-vs-not
  sorting game (which computations need the workspace?).
- **Practice:** critical-reading exercise — write the strongest objection to the
  workspace interpretation, then the strongest reply; test a model's self-report
  accuracy against a known intervention (notebook).
- **Readings:** Gurnee et al. 2026 *Verbalizable Representations Form a Global
  Workspace in Language Models* ⭐; Anthropic 2026 (emotions paper §on self-report);
  Baars/Dehaene global workspace theory primer (short secondary source).

---

## Part 5 — Applications: Safety, Steering & Editing

### Module 5.1 · Steering Behavior & Making Models Enjoyable
- **Concepts:** activation addition & contrastive activation steering (CAA);
  representation engineering; SAE-feature steering (Golden Gate Claude mechanics);
  persona vectors & the Assistant persona; system prompts vs fine-tuning vs steering —
  when to use which; character training; sycophancy vs warmth tradeoffs; what "makes a
  model enjoyable" decomposes into (and how you'd measure it).
- **Explore:** steering-strength slider demos (pre-computed generations across steering
  coefficients — watch coherence degrade past the sweet spot); persona-design worksheet.
- **Practice:** build a steering vector for a trait you choose on a small model and
  produce a steering-strength sweep; write a character spec and evaluate it blind.
- **Readings:** Rimsky et al. 2023 *Steering Llama 2 via Contrastive Activation
  Addition*; Zou et al. 2023 *Representation Engineering*; Anthropic *Golden Gate
  Claude* (blog); Anthropic 2025 *Persona vectors*; Anthropic *Claude's Character*
  (blog).

### Module 5.2 · Editing Weights & Learning on the Fly
- **Concepts:** where facts live (ROME's causal tracing → MLP key-value memories);
  ROME/MEMIT editing; why editing is brittle (ripple effects, specificity vs
  generalization); fine-tuning as heavy-hammer editing; **test-time training & fast
  weights**; in-context learning vs weight updates (when each wins); continual
  learning & catastrophic forgetting; memory-augmented architectures; the honest state
  of the art on "models that keep learning."
- **Explore:** causal-tracing heatmap viewer (where does "The Eiffel Tower is in ___"
  live?); edit-ripple simulator (edit a fact, see which related facts break).
- **Practice:** run ROME on GPT-2 to move the Eiffel Tower to Rome, then probe the
  edit's ripple effects; compare against few-shot ICL and LoRA for the same fact.
- **Readings:** Meng et al. 2022 *Locating and Editing Factual Associations in GPT
  (ROME)*; Meng et al. 2022 *MEMIT*; Hardt & Sun 2023 *Test-Time Training on Nearest
  Neighbors*; a critical read: *Does Localization Inform Editing?* (Hase et al. 2023).

### Module 5.3 · The AI Safety Landscape (capstone context)
- **Concepts:** the alignment problem precisely stated; outer vs inner alignment;
  deceptive alignment — **Sleeper Agents** (backdoors survive safety training) and
  **Alignment Faking** (Claude 3 Opus strategically complying); auditing games
  (*Auditing language models for hidden objectives* — interp teams win); emergent
  misalignment; evals & responsible scaling policies; the case for interp as a safety
  agenda (and the steelmanned case against); where a committed newcomer contributes
  (ARENA, MATS, Neel Nanda's 200 Concrete Open Problems, replications).
- **Explore:** safety-landscape concept map (interactive: agendas → labs → papers);
  "auditing game" interactive case study.
- **Practice:** run a mini auditing game on a provided backdoored toy model; write a
  1-page research proposal for an open problem that excites you.
- **Readings:** Hubinger et al. 2024 *Sleeper Agents*; Greenblatt et al. 2024
  *Alignment Faking in Large Language Models*; Marks et al. 2025 *Auditing language
  models for hidden objectives*; Betley et al. 2025 *Emergent Misalignment*; Olah
  *Interpretability Dreams* (blog); Nanda *200 Concrete Open Problems in Mechanistic
  Interpretability*.

---

## Capstone Projects (pick ≥2)

1. **Build nanoGPT from scratch** — Karpathy's video series, then train on Shakespeare.
   Cements all of Part 1. (~8h)
2. **Replicate the Toy Models phase diagram** — train the superposition toy model,
   reproduce the sparsity/importance phase transitions. Cements 3.3. (~4h)
3. **Train & analyze your own SAE** — GPT-2 small, one layer; find 5 interpretable
   features and validate them causally. Cements 3.4. (~6h)
4. **IOI circuit replication** — full activation-patching workup in TransformerLens.
   The field's rite of passage. Cements 3.5. (~6h)
5. **Build a steering demo** — pick a trait, build a CAA vector, ship a small demo
   page with a steering slider. Cements 5.1. (~5h)
6. **Mini auditing game** — take a friend's LoRA-finetuned model with a hidden quirk
   and find it using only interp tools. Cements Part 5. (~8h)

## Tooling you'll meet along the way
TransformerLens · nnsight · Neuronpedia · SAELens · Colab GPUs · PyTorch (light) ·
the ARENA 3.0 curriculum (parallel track for heavier coding reps).

## Standing advice
- Read papers in three passes: figures → intro+discussion → methods.
- Every claim in this field gets the question: *is the evidence correlational or causal?*
- When stuck, train the toy version. When still stuck, draw the computation graph.
- Keep a lab notebook (the app's per-module notes field syncs to your profile).
