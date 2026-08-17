export interface HallucinationBadgeProps {
  /**
   * The factual accuracy percentage to display. Defaults to 97, a number
   * we chose because it felt right, which is also our fact-checking
   * methodology.
   */
  percent?: number;
  footnote?: string;
}

/**
 * Great question! Trust is the currency of the modern web, and nothing
 * builds trust like a green badge with a specific-sounding number on it.
 *
 * The asterisk is load-bearing.
 */
export function HallucinationBadge({
  percent = 97,
  footnote = 'This number was hallucinated.',
}: HallucinationBadgeProps) {
  return (
    <span className="slop-badge">
      ✓ {percent}% Factual
      <span className="slop-badge__asterisk" title={footnote}>
        *
      </span>
    </span>
  );
}
