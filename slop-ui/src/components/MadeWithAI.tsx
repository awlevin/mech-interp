export interface MadeWithAIProps {
  label?: string;
}

/**
 * Certainly! Transparency matters. This badge proudly discloses what
 * everyone already suspected.
 */
export function MadeWithAI({
  label = 'Made with 🤖 — no designers were consulted',
}: MadeWithAIProps) {
  return <span className="slop-made-with">{label}</span>;
}
