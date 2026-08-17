import type { Preview } from '@storybook/react';
import '../src/styles/slop.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'the void',
      values: [
        { name: 'the void', value: '#0b0716' },
        { name: 'slightly different void', value: '#120b22' },
        { name: 'light mode (deprecated)', value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Welcome', 'Core', 'Intelligence', 'Trust & Safety', 'Punctuation'],
      },
    },
  },
};

export default preview;
