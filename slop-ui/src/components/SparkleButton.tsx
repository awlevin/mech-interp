import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface SparkleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * How much sparkle? There is no "none" option. This is intentional.
   * We delved deeply into whether buttons should be allowed to exist
   * without sparkles and the answer was no.
   */
  sparkle?: 'tasteful' | 'excessive' | 'unhinged';
  variant?: 'primary' | 'ultra' | 'ghost';
}

const SPARKLE_MAP = {
  tasteful: ['✨'],
  excessive: ['✨', '✨'],
  unhinged: ['✨', '🚀', '✨', '💫'],
} as const;

/**
 * Certainly! Here is the button component you requested.
 *
 * The SparkleButton isn't just a button — it's a call to action, a moment
 * of delight, and a testament to what's possible when you stop asking
 * "should we?" and start asking "how many sparkles?"
 *
 * It is important to note that this button leverages a gradient. All of
 * our components leverage a gradient. It's kind of our whole thing.
 */
export function SparkleButton({
  children,
  sparkle = 'excessive',
  variant = 'primary',
  ...rest
}: SparkleButtonProps) {
  const sparkles = SPARKLE_MAP[sparkle];
  const variantClass =
    variant === 'primary' ? '' : variant === 'ultra' ? ' slop-btn--ultra' : ' slop-btn--ghost';

  return (
    <button className={`slop-btn${variantClass}`} {...rest}>
      {sparkles.slice(0, Math.ceil(sparkles.length / 2)).map((s, i) => (
        <span key={`pre-${i}`} aria-hidden="true">
          {s}
        </span>
      ))}
      {children}
      {sparkles.slice(Math.ceil(sparkles.length / 2)).map((s, i) => (
        <span key={`post-${i}`} aria-hidden="true">
          {s}
        </span>
      ))}
    </button>
  );
}
