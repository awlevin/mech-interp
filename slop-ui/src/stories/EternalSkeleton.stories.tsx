import type { Meta, StoryObj } from '@storybook/react';
import { EternalSkeleton } from '../components/EternalSkeleton';

const meta: Meta<typeof EternalSkeleton> = {
  title: 'Core/EternalSkeleton',
  component: EternalSkeleton,
  parameters: {
    docs: {
      description: {
        component: 'A loading state with no loaded state. Your content may never arrive — but the shimmer is forever.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EternalSkeleton>;

export const Default: Story = {};

export const AnEntireDashboard: Story = {
  args: { lines: 12 },
};
