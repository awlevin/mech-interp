import { useState } from 'react';
import {
  AIChatBubble,
  DelveCard,
  EmDash,
  EternalSkeleton,
  GradientText,
  HallucinationBadge,
  MadeWithAI,
  PromptInput,
  RegenerateButton,
  RocketList,
  SparkleButton,
  TestimonialCard,
  ThinkingDots,
  TrustBadges,
} from '../index';

function CopyInstall() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="install">
      <div className="install__box">
        <code>npm install slop-ui</code>
        <button
          type="button"
          className="install__copy"
          onClick={() => {
            navigator.clipboard?.writeText('npm install slop-ui').catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? 'Copied! ✨🎉' : 'Copy ✨'}
        </button>
      </div>
      <p className="install__note">
        That's it! That's the whole setup. We would say "it just works" but our lawyers* asked us to
        say "it just runs." (*also synthetic)
      </p>
    </div>
  );
}

export function App() {
  return (
    <div className="landing">
      <div className="orb orb--1" />
      <div className="orb orb--2" />
      <div className="orb orb--3" />
      <div className="grid-bg" />

      <nav className="nav">
        <div className="nav__inner">
          <div className="nav__logo">
            ✨ <GradientText size={20}>Slop UI</GradientText>
          </div>
          <div className="nav__links">
            <a href="#features">Features</a>
            <a href="#components">Components</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#pricing">Pricing</a>
            <SparkleButton variant="ghost" sparkle="tasteful">
              Star on GitHub
            </SparkleButton>
          </div>
        </div>
      </nav>

      <section className="hero container">
        <div className="hero__badge">
          🎉 Announcing Slop UI v0.0.1-alpha.1 <EmDash /> production ready
        </div>
        <h1>
          Design at the
          <br />
          <GradientText>speed of slop.</GradientText>
        </h1>
        <p className="hero__sub">
          Slop UI isn't just a component library <EmDash /> it's a rich tapestry of gradients,
          glassmorphism, and unearned confidence. In today's fast-paced digital landscape, teams
          don't have time to design. So we didn't. Delve into 14 meticulously hallucinated
          components and seamlessly elevate your workflow to the next level. 🚀
        </p>
        <div className="hero__ctas">
          <SparkleButton variant="ultra" sparkle="unhinged">
            Get Started Free
          </SparkleButton>
          <SparkleButton variant="ghost" sparkle="tasteful">
            Delve Deeper →
          </SparkleButton>
        </div>
        <div className="hero__demo">
          <AIChatBubble role="user">Can you build me an entire design system?</AIChatBubble>
          <AIChatBubble politeness="absolutely">
            I've created 14 components, a landing page, three pricing tiers, several fictional
            testimonials, and a compliance strategy based primarily on emoji. Would you like me to
            delve deeper?
          </AIChatBubble>
          <ThinkingDots />
        </div>
      </section>

      <section className="stats">
        <div className="container stats__grid">
          <div>
            <div className="stats__number">
              <GradientText size={44}>∞</GradientText>
            </div>
            <div className="stats__label">components (14, but spiritually ∞)</div>
          </div>
          <div>
            <div className="stats__number">
              <GradientText size={44}>10×</GradientText>
            </div>
            <div className="stats__label">developer velocity (direction unspecified)</div>
          </div>
          <div>
            <div className="stats__number">
              <GradientText size={44}>97%*</GradientText>
            </div>
            <div className="stats__label">factual accuracy (*number hallucinated)</div>
          </div>
          <div>
            <div className="stats__number">
              <GradientText size={44}>0</GradientText>
            </div>
            <div className="stats__label">designers consulted</div>
          </div>
        </div>
      </section>

      <section className="section container" id="features">
        <div className="section__kicker">Features</div>
        <h2 className="section__title">
          Why <GradientText>Slop UI</GradientText>?
        </h2>
        <p className="section__sub">
          Great question! Let's unpack that. Here are six glassmorphic cards, each containing one
          buzzword-forward value proposition and a mandatory invitation to delve.
        </p>
        <div className="features__grid">
          <DelveCard title="🚀 Blazingly Fast">
            Our bundle contains 14 components and roughly 4,000 adjectives. The adjectives are
            tree-shakeable. The confidence is not.
          </DelveCard>
          <DelveCard title="🧠 AI-Native Architecture">
            Every component was generated in one shot and reviewed by absolutely no one, fostering a
            truly authentic AI experience across your entire stack.
          </DelveCard>
          <DelveCard title="🌈 Gradient-First Design">
            Solid colors are a legacy pattern. Slop UI embraces a holistic gradient story from
            purple to blue, the only two colors that exist.
          </DelveCard>
          <DelveCard title="🔒 Enterprise-Grade Trust">
            Ships with compliance badges for frameworks we've heard of. Each certification is
            technically a string, which is also how we describe our security model.
          </DelveCard>
          <DelveCard title="♿ Accessibility-Aware">
            We are aware of accessibility. Deeply, sincerely aware. Awareness is step one, and we
            are proud to announce we have completed step one.
          </DelveCard>
          <DelveCard title="📈 Web Scale">
            Slop UI scales seamlessly from one user to a theoretical second user, unlocking
            actionable synergies at every touchpoint of the journey.
          </DelveCard>
        </div>
      </section>

      <section className="section container" id="components">
        <div className="section__kicker">Components</div>
        <h2 className="section__title">
          See the slop <GradientText>in action</GradientText>
        </h2>
        <p className="section__sub">
          Each component is fully typed, fully animated, and fully convinced of its own importance.
          Explore the complete collection in our Storybook <EmDash /> it's not just documentation,
          it's a destination.
        </p>
        <div className="showcase__grid">
          <div className="showcase__cell">
            <h4>SparkleButton</h4>
            <SparkleButton>Generate</SparkleButton>
            <SparkleButton variant="ultra" sparkle="unhinged">
              Unleash Synergy
            </SparkleButton>
          </div>
          <div className="showcase__cell">
            <h4>PromptInput</h4>
            <PromptInput />
          </div>
          <div className="showcase__cell">
            <h4>EternalSkeleton</h4>
            <EternalSkeleton lines={4} />
          </div>
          <div className="showcase__cell">
            <h4>RegenerateButton</h4>
            <RegenerateButton />
          </div>
          <div className="showcase__cell">
            <h4>HallucinationBadge + TrustBadges</h4>
            <HallucinationBadge />
            <TrustBadges />
          </div>
          <div className="showcase__cell">
            <h4>RocketList</h4>
            <RocketList
              items={[
                'Key takeaway one',
                'Another key takeaway',
                'In conclusion, takeaways',
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section__kicker">Installation</div>
        <h2 className="section__title">
          Ship slop in <GradientText>seconds</GradientText>
        </h2>
        <p className="section__sub">
          Certainly! Here is a step-by-step guide. Step one: run the command below. There are no
          other steps, but we found that "step-by-step guide" tested well.
        </p>
        <CopyInstall />
      </section>

      <section className="section container" id="testimonials">
        <div className="section__kicker">Testimonials</div>
        <h2 className="section__title">
          Loved by <GradientText>developers we made up</GradientText>
        </h2>
        <p className="section__sub">
          Real feedback from synthetic users. Every quote below is 100% generated, which our legal
          team assures us is the most honest a testimonial section has ever been.
        </p>
        <div className="testimonials__grid">
          <TestimonialCard
            quote="Slop UI 10x-ed our velocity. We no longer know what our product does, but the buttons sparkle."
            name="Jordan Definitely-Real"
            title="VP of Vibes, Initech"
            avatar="🧑‍💼"
          />
          <TestimonialCard
            quote="I asked for a button and received a paradigm shift. Five stars."
            name="Alex Notaperson"
            title="Founder, Stealth Startup (pre-idea)"
            avatar="🦄"
          />
          <TestimonialCard
            quote="Finally, a design system that apologizes as much as I do."
            name="Sam Plausible"
            title="Senior Prompt Whisperer, Vandelay Industries"
            avatar="🧙"
          />
        </div>
      </section>

      <section className="section container" id="pricing">
        <div className="section__kicker">Pricing</div>
        <h2 className="section__title">
          Simple, transparent, <GradientText>gradient</GradientText> pricing
        </h2>
        <p className="section__sub">
          Three tiers, because every pricing page has three tiers. The middle one glows, because the
          middle one always glows.
        </p>
        <div className="pricing__grid">
          <div className="price-card">
            <h3>Hobbyist</h3>
            <div className="price-card__price">
              $0<span>/forever</span>
            </div>
            <ul>
              <li>✅ All 14 components</li>
              <li>✅ Unlimited gradients</li>
              <li>✅ Unlimited em dashes</li>
              <li>✅ The complete source code</li>
              <li>✅ Literally everything</li>
            </ul>
            <SparkleButton variant="ghost">Start Free</SparkleButton>
          </div>
          <div className="price-card price-card--featured">
            <div className="price-card__flag">MOST POPULAR (we assume)</div>
            <h3>Pro</h3>
            <div className="price-card__price">
              $0<span>/mo, billed annually</span>
            </div>
            <ul>
              <li>✅ Everything in Hobbyist</li>
              <li>✨ A feeling of professionalism</li>
              <li>✨ Priority access to the same GitHub repo</li>
              <li>✨ The word "Pro"</li>
              <li>✨ Annual billing of $0 (12 easy payments)</li>
            </ul>
            <SparkleButton variant="ultra">Go Pro ✦</SparkleButton>
          </div>
          <div className="price-card">
            <h3>Enterprise</h3>
            <div className="price-card__price">
              Custom<span> (it's also $0)</span>
            </div>
            <ul>
              <li>✅ Everything in Pro</li>
              <li>🏢 SSO (Sparkles Sign-On)</li>
              <li>🏢 A dedicated Slack channel we never check</li>
              <li>🏢 Quarterly synergy reviews</li>
              <li>🏢 SLA measured in vibes</li>
            </ul>
            <SparkleButton variant="ghost">Contact Sales (we won't reply)</SparkleButton>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section__kicker">FAQ</div>
        <h2 className="section__title">
          Frequently asked <GradientText>questions</GradientText>
        </h2>
        <p className="section__sub">
          Every answer begins with praise for the question. This is by design. Everything here is by
          design, except the design.
        </p>
        <div className="faq">
          <AIChatBubble role="user">Is Slop UI production ready?</AIChatBubble>
          <AIChatBubble politeness="great-question">
            Slop UI is version 0.0.1-alpha.1 and describes itself as production ready in the same
            sentence. We believe this tension is what gives the project its energy.
          </AIChatBubble>
          <AIChatBubble role="user">Does it support light mode?</AIChatBubble>
          <AIChatBubble politeness="certainly">
            Light mode is deprecated. The sun is deprecated. Please see our migration guide, which
            is a single em dash.
          </AIChatBubble>
          <AIChatBubble role="user">Why does every component have a gradient?</AIChatBubble>
          <AIChatBubble politeness="absolutely">
            Because in today's fast-paced digital landscape, a solid color communicates that you
            have stopped believing in the future. We will never stop believing in the future. The
            future is purple-to-blue, at 135 degrees.
          </AIChatBubble>
          <AIChatBubble role="user">Was any of this reviewed by a human?</AIChatBubble>
          <AIChatBubble politeness="all-of-the-above">
            No. And we think that's beautiful. It's important to note that transparency is one of
            our core values, along with synergy, velocity, and the color purple.
          </AIChatBubble>
        </div>
      </section>

      <section className="bigcta">
        <h2 className="section__title" style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}>
          Ready to <GradientText>elevate your workflow</GradientText>
          <br />
          to the next level?
        </h2>
        <p className="section__sub">
          Join ∞ developers* who have already embarked on this journey. (*number includes
          hypothetical developers)
        </p>
        <div className="hero__ctas">
          <SparkleButton variant="ultra" sparkle="unhinged">
            Get Started Free Now Today
          </SparkleButton>
        </div>
        <ThinkingDots
          labels={[
            'Personalizing this button for you…',
            'A/B testing against nothing…',
            'Measuring engagement…',
            'Feeling engaged…',
          ]}
        />
      </section>

      <footer className="footer">
        <MadeWithAI />
        <p>
          © 2026 Slop UI <EmDash /> It's not just a footer, it's a commitment.
          <br />
          Built with ❤️, ✨, and a frankly irresponsible number of tokens. No designers were
          consulted in the making of this design system.
          <br />
          Slop UI is open source, MIT licensed, and 97% factual*. <em>*number hallucinated</em>
        </p>
      </footer>
    </div>
  );
}
