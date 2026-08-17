import type { Meta, StoryObj } from '@storybook/react';
import { GradientText } from '../components/GradientText';

const meta: Meta<typeof GradientText> = {
  title: 'Core/GradientText',
  component: GradientText,
  parameters: {
    docs: {
      description: {
        component:
          'Great question — what if text, but gradient? Studies we did not conduct show a 400% engagement lift.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GradientText>;

export const Headline: Story = {
  args: {
    children: 'Unlock the Future of Everything',
    as: 'h1',
    size: 48,
  },
};

export const Subtle: Story = {
  name: 'Subtle (still a gradient)',
  args: {
    children: 'terms and conditions apply',
    size: 14,
  },
};

export const MaximumDrift: Story = {
  args: {
    children: 'SYNERGY',
    size: 72,
    driftSeconds: 1,
  },
};
