"use client";

import { useState } from "react";
import { WidgetButton, WidgetShell } from "@/components/widgets";

/**
 * Side-by-side "base model vs assistant" simulator.
 *
 * The continuations are hand-written illustrations, not logged model outputs.
 * Each one is chosen to show a documented base-model behaviour: continuing the
 * genre rather than serving the user, drifting between simulacra, completing a
 * structure, and — in the last case — behaving helpfully once the context makes
 * a helpful character the most likely continuation.
 */

type Case = {
  tab: string;
  prompt: string;
  base: string;
  assistant: string;
  why: string;
};

const CASES: Case[] = [
  {
    tab: "Bare question",
    prompt: "What is the capital of France?",
    base: `What is the largest country in Europe?
What is the longest river in Europe?
What is the smallest country in the world?

Answers on page 42. Score 8 or more and you're ready for
the quiz night final!`,
    assistant: `The capital of France is Paris. It has been the country's
capital since 987 CE (with brief interruptions) and is home
to about 2.1 million people within the city proper.`,
    why: "On the open web, a line like this almost never appears alone — it appears in a quiz, a worksheet, a trivia list. The base model isn't refusing to answer; it is answering a different question, namely \u201cwhat kind of document is this?\u201d The most likely continuation of one trivia question is another trivia question.",
  },
  {
    tab: "Code request",
    prompt: "Write a Python function that reverses a string.",
    base: `Write a Python function that checks whether a string is a
palindrome.
Write a Python function that counts vowels in a string.

Exercises 3.1-3.9 should be completed before Thursday's lab.
Submit a single .py file via the course portal. Late work
loses 10% per day.`,
    assistant: `def reverse_string(s: str) -> str:
    return s[::-1]

Python's slice syntax with a step of -1 walks the string
backwards, which is both the shortest and the fastest
option for this. Want the version that reverses words
instead of characters?`,
    why: "An imperative sentence in the shape of an exercise is, statistically, an exercise — so the model continues the problem set and then the syllabus around it. Notice it produced no code at all. Nothing is broken; the genre simply didn't call for any.",
  },
  {
    tab: "Q&A shape",
    prompt: "Q: How do I fix a dripping tap?\nA:",
    base: `First thing is to shut off the water at the isolator valve
under the sink. Then unscrew the handle, pull the cartridge
and take it to the shop so you get the right washer.

Q: Mine has no isolator, what then?
A: Mains stopcock, usually under the stairs.

> Thanks mate, worked first time. 3 replies · 2y

Re: Re: dripping tap (was: Re: dripping tap)
Posted by plumbob92 on Tue 14 Mar`,
    assistant: `Here's the usual fix:

1. Turn off the water supply (isolator valve under the sink,
   or the main stopcock).
2. Open the tap to drain the remaining water.
3. Unscrew the handle and lift out the cartridge or washer.
4. Take the old washer to a hardware shop to match it.
5. Reassemble and turn the supply back on slowly.

If the drip continues after a new washer, the valve seat is
probably scored — that needs a reseating tool.`,
    why: "The \u201cQ:/A:\u201d frame is a real format on the web, so the base model does answer — briefly, in the register of a forum post. Then it keeps going, because a forum post is followed by more forum posts. This is the clearest case of drift: the model was a helpful plumber for four lines and then became a thread, a timestamp, and a username.",
  },
  {
    tab: "Open list",
    prompt: "Shopping list:\n- eggs\n- milk\n-",
    base: ` bread
- butter
- coffee
- washing-up liquid
- bin bags

Recipe of the week: shakshuka. Serves 4. You will need
6 eggs, 2 tins of chopped tomatoes...`,
    assistant: `It looks like your list got cut off. Did you want me to
suggest what usually goes with eggs and milk — bread,
butter, coffee — or were you about to add something
specific?`,
    why: "Here the base model is simply better. The task genuinely is text continuation, so it does it fluently, while the assistant's trained instinct to check in with a user gets in the way. Base models remain the right tool for autocomplete, and this is why.",
  },
  {
    tab: "Greeting",
    prompt: "Hello! How are you today?",
    base: `"Fine," said Marguerite, in the voice she used for people
she intended never to see again. "And you?"

He hesitated. The rain had started up again against the
window of the waiting room, and somewhere down the corridor
a trolley squeaked.

"I've been better."`,
    assistant: `I'm doing well, thanks for asking! What can I help you
with today?`,
    why: "There is no assistant in this context — only a line of dialogue. So the model instantiates whoever most plausibly said it and whoever most plausibly replies, and you get fiction. Chat feels like the default use of a language model only because post-training made it one.",
  },
  {
    tab: "Few-shot",
    prompt: `The following is a transcript of a conversation with an
expert assistant. The assistant is careful, concise, and
says when it is unsure.

Human: What is 17 x 24?
Assistant: 408.

Human: What is the capital of France?
Assistant:`,
    base: ` Paris.

Human: Who wrote "The Left Hand of Darkness"?
Assistant: Ursula K. Le Guin, published 1969.

Human: Will it rain in Berlin tomorrow?
Assistant: I don't have access to current weather data, so
I can't say.`,
    assistant: `Paris.`,
    why: "Same weights as every other tab — and now it behaves. This is the prediction that makes the simulator framing useful rather than poetic: if the model is choosing which character generates the text, then describing the character precisely enough should summon it. It also shows the limit. The base model keeps writing the *user's* turns too, because the transcript genre includes them; post-training is largely about teaching the model to stop at the right place.",
  },
];

export function BaseVsAssistant() {
  const [sel, setSel] = useState(0);
  const c = CASES[sel];

  return (
    <WidgetShell
      title="Base model vs assistant"
      subtitle="Same prompt, two very different objects. Left: a raw next-token predictor with no post-training. Right: the same model after instruction tuning and RLHF. Pick a prompt and read both."
      footer={
        <>
          <strong className="text-ink">Why the base model does this: </strong>
          {c.why}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {CASES.map((x, i) => (
          <WidgetButton key={x.tab} primary={i === sel} onClick={() => setSel(i)}>
            {x.tab}
          </WidgetButton>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-borderline bg-surface-2 p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Prompt
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-5 text-ink">
          {c.prompt}
        </pre>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-borderline bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--series-1)" }}
            />
            <span className="text-[12px] font-semibold text-ink">
              Base model
            </span>
            <span className="text-[11px] text-ink-muted">
              pretraining only
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-5 text-ink-secondary">
            {c.base}
          </pre>
        </div>
        <div className="rounded-lg border border-borderline bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--series-2)" }}
            />
            <span className="text-[12px] font-semibold text-ink">Assistant</span>
            <span className="text-[11px] text-ink-muted">
              + SFT + RLHF
            </span>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-5 text-ink-secondary">
            {c.assistant}
          </pre>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-5 text-ink-muted">
        These continuations are written by hand to illustrate documented
        base-model behaviour — they are not logged outputs from a specific
        model. Run the same prompts against a real base model (Llama 3.1 8B or
        OLMo 2, not their &ldquo;-Instruct&rdquo; variants) in the problem set
        and compare.
      </p>
    </WidgetShell>
  );
}
