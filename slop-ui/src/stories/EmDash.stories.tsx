import type { Meta, StoryObj } from '@storybook/react';
import { EmDash } from '../components/EmDash';

const meta: Meta<typeof EmDash> = {
  title: 'Punctuation/EmDash',
  component: EmDash,
  parameters: {
    docs: {
      description: {
        component:
          "The em dash — nature's most versatile punctuation — as a fully-typed React component. Our most-used component by a wide margin.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmDash>;

export const Single: Story = {
  render: () => (
    <p style={{ color: 'var(--slop-text)', fontFamily: 'var(--font-slop)', fontSize: 18 }}>
      It's not just punctuation
      <EmDash />
      it's a statement.
    </p>
  ),
};

export const InTheWild: Story = {
  render: () => (
    <p style={{ color: 'var(--slop-text)', fontFamily: 'var(--font-slop)', fontSize: 18, maxWidth: 520, lineHeight: 1.8 }}>
      We built something new
      <EmDash />
      not just a product
      <EmDash />
      a movement
      <EmDash />
      and honestly
      <EmDash />
      isn't that
      <EmDash />
      in a very real sense
      <EmDash />
      what design is all about?
    </p>
  ),
};

export const StressTest: Story = {
  args: { count: 12 },
};
