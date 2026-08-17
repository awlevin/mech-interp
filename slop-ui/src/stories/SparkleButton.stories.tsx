import type { Meta, StoryObj } from '@storybook/react';
import { SparkleButton } from '../components/SparkleButton';

const meta: Meta<typeof SparkleButton> = {
  title: 'Core/SparkleButton',
  component: SparkleButton,
  parameters: {
    docs: {
      description: {
        component:
          "Certainly! The SparkleButton isn't just a button — it's a journey. Note that there is no way to remove the sparkles. We delved into it. The answer was no.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SparkleButton>;

export const Primary: Story = {
  args: { children: 'Generate', sparkle: 'excessive', variant: 'primary' },
};

export const Ultra: Story = {
  args: { children: 'Unleash Synergy', sparkle: 'unhinged', variant: 'ultra' },
};

export const Ghost: Story = {
  args: { children: 'Learn More', sparkle: 'tasteful', variant: 'ghost' },
  parameters: {
    docs: {
      description: {
        story:
          'The ghost variant, for moments of restraint. It still has a sparkle. Restraint has limits.',
      },
    },
  },
};

export const CallToActionBestPractices: Story = {
  name: 'Best Practices ✅',
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <SparkleButton>Get Started</SparkleButton>
      <SparkleButton>Get Started Free</SparkleButton>
      <SparkleButton>Get Started Now</SparkleButton>
      <SparkleButton variant="ultra" sparkle="unhinged">
        Get Started Free Now Today
      </SparkleButton>
    </div>
  ),
};
