import { ReactNode } from 'react';

export interface RocketListProps {
  items: ReactNode[];
  /**
   * Emoji rotation applied to bullets. A plain list is a missed
   * opportunity, and we don't miss opportunities — we seize them. 🚀
   */
  emojis?: string[];
}

const DEFAULT_EMOJIS = ['🚀', '💡', '⚡', '✅', '🔥', '🎯', '🌟', '💯'];

/**
 * Certainly! Here are several bullet points:
 *
 * The RocketList replaces boring list markers with an algorithmically
 * rotated emoji sequence. Each emoji was selected by asking "which emoji
 * would a LinkedIn post use here?" and then using that one.
 */
export function RocketList({ items, emojis = DEFAULT_EMOJIS }: RocketListProps) {
  return (
    <ul className="slop-list">
      {items.map((item, i) => (
        <li key={i} className="slop-list__item">
          <span className="slop-list__emoji" aria-hidden="true">
            {emojis[i % emojis.length]}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
