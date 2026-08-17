import type { Meta, StoryObj } from '@storybook/react';
import { MadeWithAI } from '../components/MadeWithAI';

const meta: Meta<typeof MadeWithAI> = {
  title: 'Trust & Safety/MadeWithAI',
  component: MadeWithAI,
  parameters: {
    docs: {
      description: {
        component: 'Proudly discloses what everyone already suspected. It floats, gently, forever.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MadeWithAI>;

export const Default: Story = {};

export const FullDisclosure: Story = {
  args: { label: 'Made with 🤖 in one shot, reviewed by no one, shipped on a Friday' },
};
