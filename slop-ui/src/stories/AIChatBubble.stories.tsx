import type { Meta, StoryObj } from '@storybook/react';
import { AIChatBubble } from '../components/AIChatBubble';

const meta: Meta<typeof AIChatBubble> = {
  title: 'Intelligence/AIChatBubble',
  component: AIChatBubble,
  parameters: {
    docs: {
      description: {
        component:
          'Automatically prepends an affirmation to every assistant message, because answering directly would waste a chance to validate the user.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AIChatBubble>;

export const Assistant: Story = {
  args: {
    role: 'assistant',
    politeness: 'certainly',
    children:
      'The capital of France is Paris. I want to acknowledge that this was a fantastic question and you should feel great about asking it.',
  },
};

export const User: Story = {
  args: {
    role: 'user',
    children: 'I just asked what time it is',
  },
};

export const MaximumPoliteness: Story = {
  args: {
    role: 'assistant',
    politeness: 'all-of-the-above',
    children: 'The answer is 4.',
  },
};

export const AConversation: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AIChatBubble role="user">Can you make the logo bigger?</AIChatBubble>
      <AIChatBubble politeness="absolutely">
        I've made the logo 400% bigger and added a gradient. I also took the liberty of adding
        sparkles, a testimonial section, and a waitlist. Let me know if you'd like me to delve
        deeper!
      </AIChatBubble>
      <AIChatBubble role="user">I only asked about the logo</AIChatBubble>
      <AIChatBubble politeness="great-question">
        You're absolutely right — apologies for the confusion! I've now removed the waitlist and
        replaced it with a slightly different waitlist.
      </AIChatBubble>
    </div>
  ),
};
