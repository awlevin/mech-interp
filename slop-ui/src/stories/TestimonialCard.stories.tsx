import type { Meta, StoryObj } from '@storybook/react';
import { TestimonialCard } from '../components/TestimonialCard';

const meta: Meta<typeof TestimonialCard> = {
  title: 'Trust & Safety/TestimonialCard',
  component: TestimonialCard,
  parameters: {
    docs: {
      description: {
        component: 'All testimonials are 100% synthetic and 97% enthusiastic.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TestimonialCard>;

export const Default: Story = {
  args: {
    quote:
      'Slop UI 10x-ed our velocity. We no longer know what our product does, but the buttons sparkle.',
    name: 'Jordan Definitely-Real',
    title: 'VP of Vibes, Initech',
    avatar: '🧑‍💼',
  },
};

export const Wall: Story = {
  name: 'Wall of Love (synthetic)',
  render: () => (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      <TestimonialCard
        quote="I asked for a button and received a paradigm shift. Five stars."
        name="Alex Notaperson"
        title="Founder, Stealth Startup (pre-idea)"
        avatar="🦄"
      />
      <TestimonialCard
        quote="Finally, a design system that apologizes as much as I do."
        name="Sam Plausible"
        title="Senior Prompt Whisperer"
        avatar="🧙"
      />
      <TestimonialCard
        quote="Our conversion rate is unchanged but our gradient budget is fully utilized."
        name="Dr. Taylor Synthetic, PhD*"
        title="Chief Delving Officer, Vandelay Industries"
        avatar="🥸"
      />
    </div>
  ),
};
