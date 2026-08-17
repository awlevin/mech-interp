import { ReactNode } from 'react';

export interface DelveCardProps {
  title: ReactNode;
  children: ReactNode;
  /**
   * The call-to-action text. Defaults to "Delve deeper" and honestly,
   * why would you change it?
   */
  delveLabel?: string;
  onDelve?: () => void;
}

/**
 * Certainly! In today's fast-paced digital landscape, content needs a
 * home — and that home is a glassmorphic card with a 28px border radius.
 *
 * Every DelveCard ships with a built-in "Delve deeper →" link. This is
 * not configurable-off. A card without an invitation to delve is just a
 * div, and we are better than that.
 */
export function DelveCard({ title, children, delveLabel = 'Delve deeper', onDelve }: DelveCardProps) {
  return (
    <div className="slop-card">
      <h3 className="slop-card__title">{title}</h3>
      <p className="slop-card__body">{children}</p>
      <button type="button" className="slop-card__delve" onClick={onDelve}>
        {delveLabel} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
