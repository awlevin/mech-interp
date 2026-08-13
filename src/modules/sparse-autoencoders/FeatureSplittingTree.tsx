"use client";

import { useState } from "react";
import { SegmentedControl, WidgetShell } from "@/components/widgets";

/**
 * Feature-splitting explorer: one coarse feature at a small dictionary size
 * fragments into finer features as the dictionary grows.
 *
 * The "bird" example is illustrative — hand-authored to be legible — but the
 * shape is taken from the published results: Towards Monosemanticity reports
 * base64 features going 1 -> 3 -> many as the dictionary grows 512 -> 4,096 ->
 * 16,384, and Scaling Monosemanticity reports a single "San Francisco" feature
 * in the 1M SAE splitting into 2 features at 4M and 11 at 34M.
 */

type Level = 0 | 1 | 2;

type Node = {
  id: string;
  level: Level;
  label: string;
  parents: string[];
  blurb: string;
  fires: string[];
  predicts: string;
};

const NODES: Node[] = [
  {
    id: "bird",
    level: 0,
    label: "bird",
    parents: [],
    blurb:
      "One feature covering everything avian. It fires on sparrows, on roast chicken, on “free as a bird”, and on a paragraph about penguin colonies — all at roughly the same strength.",
    fires: [
      "a small brown bird landed on the rail",
      "the bird flu outbreak spread to poultry farms",
      "she felt free as a bird that summer",
    ],
    predicts: "generic continuations: “ species”, “ feeder”, “ watching”",
  },
  {
    id: "flight",
    level: 1,
    label: "birds in flight & flocks",
    parents: ["bird"],
    blurb:
      "Fires on wings, soaring, migration and flocks. Already noticeably more specific than the parent — and it no longer fires on chicken recipes.",
    fires: [
      "a flock wheeled above the estuary",
      "the hawk circled on a thermal",
      "geese passed overhead in a ragged V",
    ],
    predicts: "“ wings”, “ soared”, “ migration”",
  },
  {
    id: "song",
    level: 1,
    label: "songbirds & birdsong",
    parents: ["bird"],
    blurb:
      "Fires on small perching birds and on the sounds they make. Splitting sound off from flight is the first real conceptual cut this dictionary can afford.",
    fires: [
      "the dawn chorus started before five",
      "a wren was singing from the hedge",
      "he could identify warblers by call alone",
    ],
    predicts: "“ song”, “ call”, “ chirped”",
  },
  {
    id: "water",
    level: 1,
    label: "waterfowl & seabirds",
    parents: ["bird"],
    blurb:
      "Fires on ducks, gulls, gannets, penguins — birds bound to water. Note the overlap with the flight feature: migration text lights both.",
    fires: [
      "gulls harried the trawler all afternoon",
      "the pond was full of mallards",
      "a colony of gannets on the sea stack",
    ],
    predicts: "“ pond”, “ colony”, “ shoreline”",
  },
  {
    id: "poultry",
    level: 1,
    label: "poultry as food",
    parents: ["bird"],
    blurb:
      "Fires on birds as agricultural product and ingredient. Same word, completely different job — this is the split that most obviously improves the model's predictions.",
    fires: [
      "debone the chicken thighs first",
      "free-range eggs cost more per dozen",
      "the poultry aisle was picked clean",
    ],
    predicts: "“ breast”, “ stock”, “ roasted”",
  },
  {
    id: "raptor",
    level: 2,
    label: "raptors: hawks, eagles, falcons",
    parents: ["flight"],
    blurb:
      "Hunting birds specifically. Fires on talons, stoops, kills and falconry — not on any old bird in the sky.",
    fires: [
      "the peregrine stooped at two hundred miles an hour",
      "a red-tailed hawk on every third fence post",
      "the eyrie sat on the cliff's north face",
    ],
    predicts: "“ talons”, “ prey”, “ stooped”",
  },
  {
    id: "owl",
    level: 2,
    label: "owls & nocturnal birds",
    parents: ["flight", "song"],
    blurb:
      "A two-parent feature: owls are raptors that you mostly encounter as a sound at night. It inherits from both the flight cluster and the birdsong cluster — feature splitting is a graph, not a tree.",
    fires: [
      "a barn owl quartering the field at dusk",
      "we heard tawny owls calling all night",
      "silent flight, thanks to fringed primaries",
    ],
    predicts: "“ hooted”, “ nocturnal”, “ dusk”",
  },
  {
    id: "hummingbird",
    level: 2,
    label: "hummingbirds & nectar feeding",
    parents: ["flight", "song"],
    blurb:
      "Very rare in the corpus, so it only earns its own dictionary slot at the largest width. Below that width its activations are absorbed by the flight feature.",
    fires: [
      "a ruby-throat hovering at the feeder",
      "wingbeats too fast to resolve",
      "they defend a nectar territory aggressively",
    ],
    predicts: "“ hovered”, “ nectar”, “ feeder”",
  },
  {
    id: "chorus",
    level: 2,
    label: "dawn chorus & seasonal song",
    parents: ["song"],
    blurb:
      "Birdsong specifically as a time-of-day and time-of-year marker. Its top predictions are about mornings and springs, not about birds.",
    fires: [
      "the chorus peaks about forty minutes before sunrise",
      "the blackbirds start up again in March",
      "by August the woods had gone quiet",
    ],
    predicts: "“ sunrise”, “ spring”, “ quiet”",
  },
  {
    id: "parrot",
    level: 2,
    label: "parrots & talking birds",
    parents: ["song"],
    blurb:
      "Fires on mimicry, cages and pet birds. In smaller dictionaries this text lands on the songbird feature, which then makes worse predictions about it.",
    fires: [
      "the African grey had a vocabulary of eight hundred words",
      "the macaw shrieked at the postman",
      "budgies will mimic a microwave beep",
    ],
    predicts: "“ mimic”, “ cage”, “ vocabulary”",
  },
  {
    id: "penguin",
    level: 2,
    label: "penguins & polar colonies",
    parents: ["water"],
    blurb:
      "Flightless, aquatic, polar. A good test of your interpretation: it should not fire on the flight-related text that lights its sibling features.",
    fires: [
      "emperor penguins huddle through the winter",
      "the rookery stretched to the horizon",
      "they porpoise through the water at speed",
    ],
    predicts: "“ colony”, “ ice”, “ huddle”",
  },
  {
    id: "duck",
    level: 2,
    label: "ducks, geese & migration",
    parents: ["water", "flight"],
    blurb:
      "The other two-parent feature. Migration is where “bound to water” and “in the air” genuinely overlap, and the dictionary represents that overlap rather than forcing a choice.",
    fires: [
      "the first pink-footed geese arrived in September",
      "mallards up-ending in the shallows",
      "the flyway runs the length of the coast",
    ],
    predicts: "“ flyway”, “ overwinter”, “ V-formation”",
  },
  {
    id: "seabird",
    level: 2,
    label: "seabirds & coastal cliffs",
    parents: ["water"],
    blurb:
      "Gulls, gannets, guillemots and the cliffs they nest on. Note how much of this feature is really about coastal places rather than about birds.",
    fires: [
      "kittiwakes packed onto every ledge",
      "the stack is a protected seabird site",
      "fulmars glided along the cliff face",
    ],
    predicts: "“ cliff”, “ ledge”, “ colony”",
  },
  {
    id: "chickenfood",
    level: 2,
    label: "chicken as ingredient",
    parents: ["poultry"],
    blurb:
      "Recipe register only. Its top predictions are cooking verbs, which is strong evidence the split is real and not an artifact.",
    fires: [
      "sear the chicken skin-side down",
      "shred the meat into the broth",
      "brine it overnight for juicier breast",
    ],
    predicts: "“ thighs”, “ stock”, “ shredded”",
  },
  {
    id: "eggs",
    level: 2,
    label: "eggs, laying hens & farming",
    parents: ["poultry"],
    blurb:
      "The agricultural-economics half of poultry: flocks, sheds, prices, avian influenza. Very little to do with birds as animals.",
    fires: [
      "egg prices rose after the cull",
      "cage-free mandates take effect next year",
      "the flock was depopulated as a precaution",
    ],
    predicts: "“ prices”, “ flock”, “ producers”",
  },
  {
    id: "idiom",
    level: 2,
    label: "“bird” in idiom & metaphor",
    parents: ["bird"],
    blurb:
      "A feature the parent quietly contained all along: bird as figure of speech. It attaches directly to the coarse feature rather than to any of the intermediate ones.",
    fires: [
      "free as a bird once the mortgage cleared",
      "a bird in the hand, as my father said",
      "that's one for the birds",
    ],
    predicts: "“ in the hand”, “ of a feather”, “ nest egg”",
  },
];

const WIDTHS = [
  { value: "0" as const, label: "1× · 512 features" },
  { value: "1" as const, label: "8× · 4,096 features" },
  { value: "2" as const, label: "32× · 16,384 features" },
];

const COLS = [
  { x: 8, w: 108 },
  { x: 168, w: 156 },
  { x: 376, w: 300 },
];
const ROW_H = 28;
const ROW_GAP = 8;
const TOP = 34;

export function FeatureSplittingTree() {
  const [width, setWidth] = useState<"0" | "1" | "2">("2");
  const [selected, setSelected] = useState<string>("bird");

  const maxLevel = Number(width) as Level;
  const visible = NODES.filter((n) => n.level <= maxLevel);
  const byLevel: Node[][] = [0, 1, 2].map((l) =>
    visible.filter((n) => n.level === l),
  );

  const maxRows = Math.max(1, ...byLevel.map((n) => n.length));
  const pos = new Map<string, { x: number; y: number; w: number }>();
  byLevel.forEach((nodes, l) => {
    const total = nodes.length * (ROW_H + ROW_GAP) - ROW_GAP;
    const start = TOP + (maxRows * (ROW_H + ROW_GAP) - ROW_GAP - total) / 2;
    nodes.forEach((n, i) => {
      pos.set(n.id, {
        x: COLS[l].x,
        y: start + i * (ROW_H + ROW_GAP),
        w: COLS[l].w,
      });
    });
  });

  const sel = NODES.find((n) => n.id === selected) ?? NODES[0];
  const related = new Set<string>([sel.id]);
  // ancestors
  const walkUp = (id: string) => {
    const n = NODES.find((m) => m.id === id);
    n?.parents.forEach((p) => {
      related.add(p);
      walkUp(p);
    });
  };
  const walkDown = (id: string) => {
    NODES.filter((m) => m.parents.includes(id)).forEach((c) => {
      related.add(c.id);
      walkDown(c.id);
    });
  };
  walkUp(sel.id);
  walkDown(sel.id);

  const H = TOP + maxRows * (ROW_H + ROW_GAP) - ROW_GAP + 16;
  const W = 690;

  return (
    <WidgetShell
      title="Feature splitting: one feature, three dictionary widths"
      subtitle="Widen the dictionary and coarse features fragment into finer ones. Click any feature to see what it fires on and what it predicts."
      footer={
        <>
          Illustrative example, real phenomenon. Bricken et al. report base64
          features going from 1 → 3 → many as the dictionary grows 512 → 4,096 →
          16,384, and a coarse{" "}
          <span className="font-mono text-ink">the</span>-in-mathematics feature
          splitting into machine-learning, abstract-algebra and field-theory
          versions with correspondingly specific top predictions. Templeton et
          al. report a single &ldquo;San Francisco&rdquo; feature in the 1M SAE
          splitting into 2 features at 4M and 11 at 34M.
        </>
      }
    >
      <div className="mb-4">
        <SegmentedControl
          label="Dictionary width"
          options={WIDTHS}
          value={width}
          onChange={(v) => {
            setWidth(v);
            const node = NODES.find((n) => n.id === selected);
            if (node && node.level > Number(v)) setSelected("bird");
          }}
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[690px]"
        role="img"
        aria-label="Tree of bird-related sparse autoencoder features at three dictionary widths"
      >
        {[0, 1, 2].slice(0, maxLevel + 1).map((l) => (
          <text
            key={l}
            x={COLS[l].x}
            y={18}
            fontSize={10}
            className="font-mono"
            fill="var(--text-muted)"
          >
            {WIDTHS[l].label}
          </text>
        ))}

        {/* edges */}
        {visible.map((n) =>
          n.parents
            .filter((p) => pos.has(p))
            .map((p) => {
              const a = pos.get(p);
              const b = pos.get(n.id);
              if (!a || !b) return null;
              const x1 = a.x + a.w;
              const y1 = a.y + ROW_H / 2;
              const x2 = b.x;
              const y2 = b.y + ROW_H / 2;
              const mid = (x1 + x2) / 2;
              const on = related.has(n.id) && related.has(p);
              return (
                <path
                  key={`${p}-${n.id}`}
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={on ? "var(--series-1)" : "var(--border)"}
                  strokeWidth={on ? 2 : 1.25}
                  opacity={on ? 1 : 0.6}
                />
              );
            }),
        )}

        {/* nodes */}
        {visible.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isSel = n.id === sel.id;
          const isRel = related.has(n.id);
          return (
            <g
              key={n.id}
              onClick={() => setSelected(n.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Feature: ${n.label}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(n.id);
              }}
            >
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={ROW_H}
                rx={6}
                fill={isSel ? "var(--series-1)" : "var(--surface-2)"}
                stroke={isRel ? "var(--series-1)" : "var(--border)"}
                strokeWidth={isRel ? 1.5 : 1}
                opacity={isRel ? 1 : 0.55}
              />
              <text
                x={p.x + 9}
                y={p.y + ROW_H / 2 + 4}
                fontSize={11}
                fill={isSel ? "var(--surface-1)" : "var(--text-primary)"}
                opacity={isRel ? 1 : 0.7}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-4 rounded-lg border border-borderline bg-surface-2 p-4">
        <div className="text-[13px] font-semibold text-ink">{sel.label}</div>
        <p className="mt-1 text-[13px] leading-6 text-ink-secondary">
          {sel.blurb.replace(/<\/?em>/g, "")}
        </p>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Top activating contexts
        </div>
        <ul className="mt-1 space-y-1">
          {sel.fires.map((s) => (
            <li key={s} className="font-mono text-[12px] leading-5 text-ink-secondary">
              …{s}…
            </li>
          ))}
        </ul>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Top positive logits
        </div>
        <div className="font-mono text-[12px] leading-5 text-ink-secondary">
          {sel.predicts}
        </div>
      </div>
    </WidgetShell>
  );
}
