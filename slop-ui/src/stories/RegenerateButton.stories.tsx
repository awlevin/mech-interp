import type { Meta, StoryObj } from '@storybook/react';
import { RegenerateButton } from '../components/RegenerateButton';

const meta: Meta<typeof RegenerateButton> = {
  title: 'Intelligence/RegenerateButton',
  component: RegenerateButton,
  parameters: {
    docs: {
      description: {
        component: 'Click it. Each regeneration emits a fresh, heartfelt, randomly-selected apology.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RegenerateButton>;

export const Default: Story = {};
