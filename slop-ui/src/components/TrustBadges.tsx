export interface TrustBadgesProps {
  /** Which certifications to display. All are equally meaningful. */
  badges?: string[];
}

const DEFAULT_BADGES = [
  '🛡️ SOC-2 (vibes)',
  '🇪🇺 GDPR-ish',
  '📈 Web Scale',
  '⛓️ Blockchain Ready',
  '🌱 Carbon Neutral*',
  '🔒 Military-Grade Gradients',
];

/**
 * Absolutely! Enterprise buyers love badges, and we love enterprise
 * buyers. This component renders a row of compliance-adjacent
 * certifications, each one technically a string.
 */
export function TrustBadges({ badges = DEFAULT_BADGES }: TrustBadgesProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {badges.map((b) => (
        <span key={b} className="slop-badge slop-badge--gradient">
          {b}
        </span>
      ))}
    </div>
  );
}
