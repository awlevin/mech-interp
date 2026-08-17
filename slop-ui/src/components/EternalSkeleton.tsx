export interface EternalSkeletonProps {
  /** Number of shimmering lines. */
  lines?: number;
  /** Show the reassuring caption. */
  caption?: boolean;
}

const WIDTHS = ['100%', '92%', '96%', '78%', '88%', '64%'];

/**
 * Certainly! The EternalSkeleton is a loading state with no loaded state.
 *
 * Traditional design systems treat skeletons as a transition. We treat
 * them as a destination. Your content may never arrive — but the shimmer?
 * The shimmer is forever.
 */
export function EternalSkeleton({ lines = 4, caption = true }: EternalSkeletonProps) {
  return (
    <div className="slop-skeleton" role="status" aria-label="Loading, in a permanent sense">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="slop-skeleton__line" style={{ width: WIDTHS[i % WIDTHS.length] }} />
      ))}
      {caption && (
        <span className="slop-skeleton__caption">
          Loading… (this component does not have a loaded state. Loading is a mindset.)
        </span>
      )}
    </div>
  );
}
