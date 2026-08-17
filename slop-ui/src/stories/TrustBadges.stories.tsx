import type { Meta, StoryObj } from '@storybook/react';
import { TrustBadges } from '../components/TrustBadges';

const meta: Meta<typeof TrustBadges> = {
  title: 'Trust & Safety/TrustBadges',
  component: TrustBadges,
  parameters: {
    docs: {
      description: {
        component: 'Enterprise buyers love badges. Each certification is technically a string.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TrustBadges>;

export const TheFullSuite: Story = {};

export const CustomCompliance: Story = {
  args: {
    badges: ['🏆 ISO-9000 (self-assessed)', '🤝 HIPAA-curious', '🧘 Zero Trust (in ourselves)'],
  },
};
