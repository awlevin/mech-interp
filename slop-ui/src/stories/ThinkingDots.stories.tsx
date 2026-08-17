import type { Meta, StoryObj } from '@storybook/react';
import { ThinkingDots } from '../components/ThinkingDots';

const meta: Meta<typeof ThinkingDots> = {
  title: 'Intelligence/ThinkingDots',
  component: ThinkingDots,
  parameters: {
    docs: {
      description: {
        component:
          'Communicates that something profound is happening. Whether it is happening is out of scope.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThinkingDots>;

export const Default: Story = {};

export const CustomJourney: Story = {
  args: {
    labels: [
      'Reticulating splines…',
      'Asking a bigger model…',
      'Blaming the prompt…',
      'Rewriting from scratch…',
      'Shipping it anyway…',
    ],
    intervalMs: 1200,
  },
};
