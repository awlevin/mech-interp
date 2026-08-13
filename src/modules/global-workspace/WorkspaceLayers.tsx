"use client";

import { useEffect, useRef, useState } from "react";
import {
  SegmentedControl,
  Slider,
  WidgetButton,
  WidgetShell,
} from "@/components/widgets";

/** Layer indices reported in the paper for Sonnet 4.5's workspace band. */
const WS_START = 38;
const WS_END = 92;
const N_LAYERS = 100;

type TaskId = "continue" | "anomaly" | "report" | "flexible";

type Task = {
  id: TaskId;
  label: string;
  kind: "automatic" | "deliberate";
  question: string;
  clean: string;
  swapped: string;
  moved: boolean;
  note: string;
};

const TASKS: Task[] = [
  {
    id: "continue",
    label: "Continue it",
    kind: "automatic",
    question: "Write the next line of this passage.",
    clean: "…fluent Spanish",
    swapped: "…fluent Spanish",
    moved: false,
    note: "The continuation obviously depends on the language — the next line had better be Spanish. It is not affected by the swap. The J-space carries the answer here and no downstream circuit reads it.",
  },
  {
    id: "anomaly",
    label: "Spot the odd sentence",
    kind: "automatic",
    question: "A sentence from another language is spliced in. Anything out of place?",
    clean: "Yes",
    swapped: "Yes",
    moved: false,
    note: "This also depends on knowing the surrounding language — an intrusion is only an intrusion relative to it — yet overwriting the workspace representation changes nothing. Local coherence judgements run underneath.",
  },
  {
    id: "report",
    label: "Name the language",
    kind: "deliberate",
    question: "What language is this passage written in?",
    clean: "Spanish",
    swapped: "French",
    moved: true,
    note: "Explicit report follows the workspace, not the text. The passage on the screen never changed.",
  },
  {
    id: "flexible",
    label: "Name an author who wrote in it",
    kind: "deliberate",
    question: "Name a famous author who wrote in this language.",
    clean: "García Márquez",
    swapped: "Hugo",
    moved: true,
    note: "The model has to identify the language and then apply an arbitrary function to it. Hola → Bonjour and Peseta → Franc behave the same way: whatever operation the prompt supplies reads the swapped-in value.",
  },
];

/**
 * Schematic commitment curve: how strongly the activation at a given layer has
 * committed to one of two mixed input concepts, as a function of the mixing
 * weight alpha. Early layers track the mixture proportionally; from the
 * workspace onset the response is near all-or-none. Shape follows the paper's
 * ignition figure; the values are illustrative, not digitised.
 */
function commitment(layer: number, alpha: number): number {
  const t = Math.max(0, Math.min(1, (layer - (WS_START - 8)) / 16));
  const k = 2 + 70 * t;
  const step = 1 / (1 + Math.exp(-k * (alpha - 0.5)));
  return (1 - t) * alpha + t * step;
}

const BW = 520;
const BH = 96;
const CW = 460;
const CH = 210;

export function WorkspaceLayers() {
  const [taskId, setTaskId] = useState<TaskId>("continue");
  const [layer, setLayer] = useState(20);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);

  const task = TASKS.find((t) => t.id === taskId) ?? TASKS[0];
  const deliberate = task.kind === "deliberate";

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setLayer((l) => {
        const next = l + dt * 0.03;
        if (next >= N_LAYERS) {
          setPlaying(false);
          return N_LAYERS;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  const bx = (l: number) => 10 + (l / N_LAYERS) * (BW - 20);
  const cx = (a: number) => 40 + a * (CW - 60);
  const cy = (s: number) => CH - 34 - s * (CH - 60);

  const curve: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const a = i / 100;
    curve.push(`${cx(a).toFixed(1)},${cy(commitment(layer, a)).toFixed(1)}`);
  }

  const regime =
    layer < WS_START ? "sensory" : layer < WS_END ? "workspace" : "motor";

  return (
    <WidgetShell
      title="Where the workspace lives, and how sharply it commits"
      subtitle="Top: the three layer regimes the paper identifies, and which one a task actually depends on. Bottom: drag or play the layer index and watch an ambiguous input stop being ambiguous."
      footer={
        <>
          Layer indices are the ones the paper reports for Sonnet 4.5: the
          workspace band runs from about a third of the way through (~L38) to
          shortly before the output (~L92). The commitment curve is schematic —
          drawn to the shape of the paper&apos;s ignition experiment, not
          digitised from it.
        </>
      }
    >
      <SegmentedControl
        label="Task, using the same Spanish passage"
        options={TASKS.map((t) => ({ value: t.id, label: t.label }))}
        value={taskId}
        onChange={setTaskId}
      />

      <svg
        viewBox={`0 0 ${BW} ${BH}`}
        className="mt-4 w-full max-w-[520px]"
        role="img"
        aria-label={`Layer axis from 0 to 100 divided into sensory layers up to ${WS_START}, workspace layers to ${WS_END}, and motor layers to the end. The workspace band is highlighted when the selected task depends on it.`}
      >
        <rect
          x={bx(0)}
          y={22}
          width={bx(WS_START) - bx(0)}
          height={34}
          rx={6}
          fill="var(--surface-2)"
          stroke="var(--border)"
        />
        <rect
          x={bx(WS_START)}
          y={22}
          width={bx(WS_END) - bx(WS_START)}
          height={34}
          rx={6}
          fill="var(--series-1)"
          opacity={deliberate ? 0.42 : 0.12}
          stroke={deliberate ? "var(--series-1)" : "var(--border)"}
        />
        <rect
          x={bx(WS_END)}
          y={22}
          width={bx(N_LAYERS) - bx(WS_END)}
          height={34}
          rx={6}
          fill="var(--surface-2)"
          stroke="var(--border)"
        />
        <text x={bx(WS_START / 2)} y={44} textAnchor="middle" fontSize={12} fill="var(--text-secondary)">
          sensory
        </text>
        <text
          x={bx((WS_START + WS_END) / 2)}
          y={44}
          textAnchor="middle"
          fontSize={12}
          fill="var(--text-primary)"
        >
          workspace (J-space)
        </text>
        <text x={bx((WS_END + N_LAYERS) / 2)} y={44} textAnchor="middle" fontSize={12} fill="var(--text-secondary)">
          motor
        </text>
        <line
          x1={bx(layer)}
          y1={14}
          x2={bx(layer)}
          y2={64}
          stroke="var(--series-2)"
          strokeWidth={2}
        />
        <text x={bx(0)} y={78} fontSize={11} fill="var(--text-muted)" className="font-mono">
          layer 0
        </text>
        <text x={bx(WS_START)} y={78} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-mono">
          {WS_START}
        </text>
        <text x={bx(WS_END)} y={78} textAnchor="middle" fontSize={11} fill="var(--text-muted)" className="font-mono">
          {WS_END}
        </text>
        <text x={bx(N_LAYERS)} y={78} textAnchor="end" fontSize={11} fill="var(--text-muted)" className="font-mono">
          {N_LAYERS}
        </text>
      </svg>

      <div className="mt-3 rounded-lg border border-borderline bg-surface-2 p-3">
        <div className="text-[13px] text-ink-secondary">{task.question}</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-muted">
              unmodified
            </div>
            <div className="font-mono text-[13px] text-ink">{task.clean}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-muted">
              after swapping Spanish → French in the workspace
            </div>
            <div
              className="font-mono text-[13px]"
              style={{ color: task.moved ? "var(--series-2)" : "var(--text-muted)" }}
            >
              {task.swapped}
              {task.moved ? "  (changed)" : "  (unchanged)"}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[12px] leading-5 text-ink-muted">{task.note}</div>
      </div>

      <div className="mt-6 border-t border-borderline pt-4">
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <div className="w-60">
            <Slider
              label="Layer"
              value={layer}
              min={0}
              max={N_LAYERS}
              step={1}
              onChange={(v) => {
                setPlaying(false);
                setLayer(v);
              }}
              format={(v) => `${Math.round(v)} (${regime})`}
            />
          </div>
          <div className="flex gap-2">
            <WidgetButton
              primary
              onClick={() => {
                if (layer >= N_LAYERS) setLayer(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? "Pause" : "Play depth"}
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setPlaying(false);
                setLayer(20);
              }}
            >
              Reset
            </WidgetButton>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${CW} ${CH}`}
          className="w-full max-w-[460px]"
          role="img"
          aria-label="Commitment to one of two mixed input concepts as a function of the mixing weight. In early layers the curve is a straight diagonal; from the workspace onset it becomes a sharp step."
        >
          <line x1={cx(0)} y1={cy(0)} x2={cx(1)} y2={cy(0)} stroke="var(--border)" />
          <line x1={cx(0)} y1={cy(0)} x2={cx(0)} y2={cy(1)} stroke="var(--border)" />
          <line
            x1={cx(0)}
            y1={cy(0)}
            x2={cx(1)}
            y2={cy(1)}
            stroke="var(--border-strong)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <polyline points={curve.join(" ")} fill="none" stroke="var(--series-1)" strokeWidth={2.5} />
          <text x={cx(0)} y={CH - 12} fontSize={11} fill="var(--text-muted)" className="font-mono">
            all concept B
          </text>
          <text x={cx(1)} y={CH - 12} textAnchor="end" fontSize={11} fill="var(--text-muted)" className="font-mono">
            all concept A →
          </text>
          <text x={6} y={cy(1) - 6} fontSize={11} fill="var(--text-muted)" className="font-mono">
            commitment to A ↑
          </text>
        </svg>
        <p className="mt-2 text-[13px] leading-6 text-ink-muted">
          The input is a token embedding blended between two country names, in an
          ordinary sentence. Below the workspace onset the model&apos;s state
          tracks the blend proportionally — a half-and-half input gives a
          half-and-half representation. From about layer {WS_START} the curve
          snaps: the model sits at one endpoint or the other and flips between
          them at a threshold. Ambiguity in, decision out. That is what the
          neuronal version of global workspace theory calls{" "}
          <strong>ignition</strong>, and it lands at the same layer the J-lens
          statistics independently flag as the start of the workspace.
        </p>
      </div>
    </WidgetShell>
  );
}
