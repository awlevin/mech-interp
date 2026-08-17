import { CSSProperties, ElementType, ReactNode } from 'react';

export interface GradientTextProps {
  children: ReactNode;
  /** Which HTML element to render. They all deserve the gradient equally. */
  as?: ElementType;
  size?: number;
  /**
   * Animation speed in seconds. Lower is faster. There is no way to
   * disable the animation, because motion is a core pillar of our
   * brand tapestry.
   */
  driftSeconds?: number;
}

/**
 * Great question — what if text, but gradient?
 *
 * GradientText seamlessly elevates any string into a vibrant, dynamic
 * journey from purple to blue (with a brief, transformative stop at pink).
 * Studies we did not conduct show gradient text increases engagement by
 * up to 400%.
 */
export function GradientText({
  children,
  as: Tag = 'span',
  size,
  driftSeconds = 6,
}: GradientTextProps) {
  const style: CSSProperties = {
    animationDuration: `${driftSeconds}s`,
    ...(size ? { fontSize: size } : {}),
  };
  return (
    <Tag className="slop-gradient-text" style={style}>
      {children}
    </Tag>
  );
}
