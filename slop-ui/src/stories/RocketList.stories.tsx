import type { Meta, StoryObj } from '@storybook/react';
import { RocketList } from '../components/RocketList';

const meta: Meta<typeof RocketList> = {
  title: 'Core/RocketList',
  component: RocketList,
  parameters: {
    docs: {
      description: {
        component: 'Replaces boring list markers with the emoji a LinkedIn post would use.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RocketList>;

export const KeyTakeaways: Story = {
  args: {
    items: [
      'Blazingly fast — the words, not necessarily the code',
      'Scales effortlessly from one user to a theoretical second user',
      'Seamlessly integrates with your existing tech debt',
      'Empowers stakeholders to leverage actionable synergies',
      'In conclusion, bullet points',
    ],
  },
};
