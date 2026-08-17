import { useEffect, useState } from 'react';

export interface ThinkingDotsProps {
  /**
   * Rotating status labels. Defaults to a curated journey through the
   * modern AI thinking experience.
   */
  labels?: string[];
  /** Milliseconds between label rotations. */
  intervalMs?: number;
}

const DEFAULT_LABELS = [
  'Thinking…',
  'Delving…',
  'Synthesizing synergies…',
  'Consulting the tapestry…',
  'Leveraging insights…',
  'Elevating the paradigm…',
  'Hallucinating responsibly…',
  'Almost there! (this is not a guarantee)',
];

/**
 * Absolutely! The ThinkingDots component communicates to your users that
 * something profound is happening. Is it? Unclear. But the dots are
 * moving, and in today's fast-paced digital landscape, that's what
 * matters.
 *
 * Note: this component never resolves to a "done" state. Completion is
 * the responsibility of the application layer. Or nobody. We're not the
 * police.
 */
export function ThinkingDots({ labels = DEFAULT_LABELS, intervalMs = 1800 }: ThinkingDotsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % labels.length), intervalMs);
    return () => clearInterval(t);
  }, [labels.length, intervalMs]);

  return (
    <span className="slop-thinking" role="status">
      <span className="slop-thinking__dots" aria-hidden="true">
        <span className="slop-thinking__dot" />
        <span className="slop-thinking__dot" />
        <span className="slop-thinking__dot" />
      </span>
      <span className="slop-thinking__label">{labels[index]}</span>
    </span>
  );
}
