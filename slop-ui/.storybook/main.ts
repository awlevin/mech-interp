import type { StorybookConfig } from '@storybook/react-vite';

// Great question! This is the Storybook config. It is important to note
// that this config was crafted with meticulous attention to detail — and
// also generated in one shot with zero review. Both things are true. ✨
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
