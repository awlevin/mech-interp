import { useState } from 'react';

export interface RegenerateButtonProps {
  onRegenerate?: () => void;
}

const APOLOGIES = [
  'You’re absolutely right — apologies for the confusion!',
  'Apologies for the oversight! Here is a completely different answer.',
  'Thank you for your patience! I have now delved even deeper.',
  'Great catch! I have regenerated with 30% more confidence.',
  'I apologize for the previous response. This one is also like that.',
  'Upon reflection, I stand by nothing.',
];

/**
 * Certainly! The RegenerateButton lets users politely reject your
 * product's output while your product politely apologizes for it. It is
 * the circle of AI life.
 *
 * Each click emits a fresh, heartfelt, randomly-selected apology.
 */
export function RegenerateButton({ onRegenerate }: RegenerateButtonProps) {
  const [spinning, setSpinning] = useState(false);
  const [apologyIndex, setApologyIndex] = useState<number | null>(null);

  const regenerate = () => {
    setSpinning(true);
    onRegenerate?.();
    setTimeout(() => {
      setSpinning(false);
      setApologyIndex((prev) => (prev === null ? 0 : (prev + 1) % APOLOGIES.length));
    }, 900);
  };

  return (
    <div>
      <button type="button" className="slop-regen" onClick={regenerate}>
        <span className={spinning ? 'slop-regen__icon--spinning' : undefined} aria-hidden="true">
          🔄
        </span>
        Regenerate response
      </button>
      {apologyIndex !== null && !spinning && (
        <p className="slop-regen__apology">{APOLOGIES[apologyIndex]}</p>
      )}
    </div>
  );
}
