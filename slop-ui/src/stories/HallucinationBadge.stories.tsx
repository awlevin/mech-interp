import type { Meta, StoryObj } from '@storybook/react';
import { HallucinationBadge } from '../components/HallucinationBadge';

const meta: Meta<typeof HallucinationBadge> = {
  title: 'Trust & Safety/HallucinationBadge',
  component: HallucinationBadge,
  parameters: {
    docs: {
      description: {
        component: 'Nothing builds trust like a green badge with a specific-sounding number on it. The asterisk is load-bearing.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof HallucinationBadge>;

export const Default: Story = {};

export const Bold: Story = {
  args: { percent: 100, footnote: 'At this point the asterisk is doing all the work.' },
};

export const Honest: Story = {
  name: 'Honest Mode (experimental)',
  args: { percent: 62, footnote: 'Even this number is a guess.' },
};
