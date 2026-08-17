import type { Meta, StoryObj } from '@storybook/react';
import { DelveCard } from '../components/DelveCard';

const meta: Meta<typeof DelveCard> = {
  title: 'Core/DelveCard',
  component: DelveCard,
  parameters: {
    docs: {
      description: {
        component:
          'Every DelveCard ships with a mandatory "Delve deeper →" link. A card without an invitation to delve is just a div.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DelveCard>;

export const Default: Story = {
  args: {
    title: '🚀 Blazingly Fast',
    children:
      "Our components render at the speed of light, in the sense that light also takes a nonzero amount of time. Let's unpack what that means for your team.",
  },
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 320px)', gap: 20 }}>
      <DelveCard title="💡 Intuitive by Design" delveLabel="Delve deeper">
        We embarked on a journey to reimagine what a card could be. It could be this. It's this.
      </DelveCard>
      <DelveCard title="🔒 Enterprise-Grade" delveLabel="Delve further">
        Robust. Scalable. Secure. These words appear on this card, which is the first step.
      </DelveCard>
      <DelveCard title="🌈 Gradient-Native" delveLabel="Delve differently">
        Built from the ground up on gradient-first architecture, fostering a holistic color story.
      </DelveCard>
      <DelveCard title="🧠 AI-Powered" delveLabel="Delve recursively">
        Is it though? In today's landscape, the question itself is the answer. Food for thought.
      </DelveCard>
    </div>
  ),
};
