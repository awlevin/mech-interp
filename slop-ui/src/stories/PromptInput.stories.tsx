import type { Meta, StoryObj } from '@storybook/react';
import { PromptInput } from '../components/PromptInput';

const meta: Meta<typeof PromptInput> = {
  title: 'Intelligence/PromptInput',
  component: PromptInput,
  parameters: {
    docs: {
      description: {
        component:
          'Every product is a chat product now. This is the law. Features a vibes-based character counter.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PromptInput>;

export const Default: Story = {};

export const ForATodoApp: Story = {
  name: 'In a To-Do App (for some reason)',
  args: {
    placeholder: 'Describe the task you would like to imagine completing…',
  },
};
