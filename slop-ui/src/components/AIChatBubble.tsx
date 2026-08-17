import { ReactNode } from 'react';

export interface AIChatBubbleProps {
  role?: 'assistant' | 'user';
  children: ReactNode;
  /**
   * How enthusiastically the assistant opens its message.
   * - "certainly": Certainly!
   * - "great-question": Great question!
   * - "absolutely": Absolutely — I'd be happy to help with that!
   * - "all-of-the-above": all of the above, in order, at once
   */
  politeness?: 'certainly' | 'great-question' | 'absolutely' | 'all-of-the-above';
  /** Append the classic tiny disclaimer under the bubble. Defaults to true, obviously. */
  disclaimer?: boolean;
}

const OPENERS: Record<string, string> = {
  certainly: 'Certainly! ',
  'great-question': 'Great question! ',
  absolutely: "Absolutely — I'd be happy to help with that! ",
  'all-of-the-above': "Certainly! Great question! Absolutely — I'd be happy to help with that! ",
};

/**
 * Certainly! Here is a chat bubble component.
 *
 * The AIChatBubble automatically prepends an affirmation to every
 * assistant message, because starting a sentence with the actual answer
 * would waste a valuable opportunity to validate the user.
 */
export function AIChatBubble({
  role = 'assistant',
  children,
  politeness = 'certainly',
  disclaimer = true,
}: AIChatBubbleProps) {
  const isAssistant = role === 'assistant';
  return (
    <div className={`slop-chat${isAssistant ? '' : ' slop-chat--user'}`}>
      <div className="slop-chat__avatar" aria-hidden="true">
        {isAssistant ? '🤖' : '🧑'}
      </div>
      <div>
        <div className="slop-chat__bubble">
          {isAssistant && <strong>{OPENERS[politeness]}</strong>}
          {children}
        </div>
        {isAssistant && disclaimer && (
          <span className="slop-chat__disclaimer">
            SlopBot can make mistakes. SlopBot considers this a feature.
          </span>
        )}
      </div>
    </div>
  );
}
