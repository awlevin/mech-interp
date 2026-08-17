import { Fragment } from 'react';

export interface EmDashProps {
  /**
   * How many em dashes to render consecutively. The correct answer is
   * always "more than a human editor would allow."
   */
  count?: number;
  /** Render with the signature gradient. Of course it defaults to true. */
  gradient?: boolean;
}

/**
 * The em dash — nature's most versatile punctuation — deserves better
 * than being typed. It deserves to be a component — with props — and
 * TypeScript support — and a gradient.
 *
 * This is the most-used component in the entire system — by a wide
 * margin — and we're honestly proud of that.
 */
export function EmDash({ count = 1, gradient = true }: EmDashProps) {
  return (
    <Fragment>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={gradient ? 'slop-emdash' : undefined}>
          {' — '}
        </span>
      ))}
    </Fragment>
  );
}
