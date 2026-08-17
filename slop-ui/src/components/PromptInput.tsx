import { useState } from 'react';

export interface PromptInputProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
}

/**
 * Certainly! Every product is a chat product now. This is the law.
 *
 * The PromptInput features a vibes-based character counter, a gradient
 * send button, and a placeholder that manages expectations while
 * simultaneously raising them.
 */
export function PromptInput({
  placeholder = "Ask anything… (we'll answer confidently either way)",
  onSubmit,
}: PromptInputProps) {
  const [value, setValue] = useState('');

  const vibes =
    value.length === 0
      ? 'awaiting vibes'
      : value.length < 20
        ? 'vibes: emerging'
        : value.length < 80
          ? 'vibes: immaculate'
          : 'vibes: too powerful';

  return (
    <div className="slop-prompt">
      <div className="slop-prompt__box">
        <textarea
          className="slop-prompt__input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
        />
        <button
          type="button"
          className="slop-prompt__send"
          aria-label="Send prompt"
          onClick={() => {
            onSubmit?.(value);
            setValue('');
          }}
        >
          ✨
        </button>
      </div>
      <div className="slop-prompt__meta">
        <span>{vibes}</span>
        <span>{value.length} tokens (probably)</span>
      </div>
    </div>
  );
}
