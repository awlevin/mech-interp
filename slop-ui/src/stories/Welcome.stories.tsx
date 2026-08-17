import type { Meta, StoryObj } from '@storybook/react';
import { GradientText } from '../components/GradientText';
import { RocketList } from '../components/RocketList';
import { MadeWithAI } from '../components/MadeWithAI';

function Welcome() {
  return (
    <div style={{ maxWidth: 640, fontFamily: 'var(--font-slop)', color: 'var(--slop-text)' }}>
      <GradientText as="h1" size={44}>
        Welcome to Slop UI ✨
      </GradientText>
      <p style={{ lineHeight: 1.7, color: 'var(--slop-text-dim)' }}>
        It's not just a design system — it's a paradigm shift. In today's fast-paced digital
        landscape, teams need components that don't just work — they <em>resonate</em>. Slop UI is a
        rich tapestry of gradients, glassmorphism, and unearned confidence, meticulously crafted to
        seamlessly elevate your workflow to the next level. Let's dive in! 🚀
      </p>
      <RocketList
        items={[
          <span key="1">14 production-ready* components (*production not required)</span>,
          <span key="2">Every color is a gradient. Every gradient is animated. You're welcome.</span>,
          <span key="3">Fully typed with TypeScript, for when the vibes need interfaces</span>,
          <span key="4">Dark mode only. Light mode is deprecated. The sun is deprecated.</span>,
          <span key="5">Zero accessibility audits failed (zero were run)</span>,
        ]}
      />
      <div style={{ marginTop: 32 }}>
        <MadeWithAI />
      </div>
    </div>
  );
}

const meta: Meta<typeof Welcome> = {
  title: 'Welcome/Start Here',
  component: Welcome,
};

export default meta;
type Story = StoryObj<typeof Welcome>;

export const StartHere: Story = {};
