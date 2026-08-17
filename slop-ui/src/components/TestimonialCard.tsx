export interface TestimonialCardProps {
  quote: string;
  name: string;
  title: string;
  /** An emoji standing in for a face. Faces are expensive; emoji are forever. */
  avatar?: string;
  /** Star count. Values below 5 are technically supported but deeply off-brand. */
  stars?: number;
}

/**
 * Absolutely! Social proof is the cornerstone of trust, and trust is the
 * cornerstone of conversion, and conversion is the cornerstone of a
 * quote we put here from someone who may not exist.
 *
 * All testimonials shipped with Slop UI are 100% synthetic and 97%
 * enthusiastic.
 */
export function TestimonialCard({
  quote,
  name,
  title,
  avatar = '🧑‍💻',
  stars = 5,
}: TestimonialCardProps) {
  return (
    <figure className="slop-testimonial">
      <div className="slop-testimonial__stars" aria-label={`${stars} out of 5 stars`}>
        {'⭐'.repeat(Math.max(0, Math.min(5, stars)))}
      </div>
      <blockquote className="slop-testimonial__quote">“{quote}”</blockquote>
      <figcaption className="slop-testimonial__person">
        <span className="slop-testimonial__avatar" aria-hidden="true">
          {avatar}
        </span>
        <span>
          <div className="slop-testimonial__name">{name}</div>
          <div className="slop-testimonial__title">{title}</div>
        </span>
      </figcaption>
    </figure>
  );
}
