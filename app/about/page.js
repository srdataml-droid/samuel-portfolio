import Link from 'next/link';
import DeskScene from '@/components/DeskScene';
import { journey, values, focusAreas } from '@/data/site';
import * as Icons from '@/components/Icons';

export const metadata = {
  title: 'About',
  description: 'Engineer, maker, builder, and a lifelong learner.',
};

const quickFacts = [
  { icon: 'Pin',    term: 'Based in',        detail: 'Somewhere on Earth 🌍' },
  { icon: 'Laptop', term: 'What I do',       detail: 'AI/ML · Full-stack · Build cool things' },
  { icon: 'Heart',  term: 'Interests',       detail: 'Technology, creativity, nature, coffee, cats (obviously)' },
  { icon: 'Cap',    term: 'Always learning', detail: 'New tools, new ideas, new perspectives' },
  { icon: 'Leaf',   term: 'Goal',            detail: 'Build a kinder, brighter tomorrow' },
];

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-copy">
          <h1>About Me</h1>
          <p className="hand" style={{ fontSize: 24, marginTop: 10 }}>
            Engineer, maker, builder, and a lifelong learner.
          </p>

          <p className="lead" style={{ marginTop: 18 }}>
            I&rsquo;m Samuel — an AI/ML engineer, full-stack developer, and a curious
            builder who loves turning ideas into real, useful things. I care about
            thoughtful technology, meaningful projects, and a kinder tomorrow.
          </p>

          <div className="hero-notes">
            <p className="hero-note">
              <Icons.Leaf width={17} height={17} />
              <span>Build useful things.</span>
            </p>
            <p className="hero-note">
              <Icons.Book width={17} height={17} />
              <span>Keep learning.</span>
            </p>
            <p className="hero-note">
              <Icons.Mountain width={17} height={17} />
              <span>Make a positive impact.</span>
            </p>
            <p className="hero-note">
              <Icons.Heart width={17} height={17} />
              <span>Stay curious and kind.</span>
            </p>
          </div>
        </div>

        <DeskScene scene="about" priority />
      </section>

      {/* ---------------------------------------------------------- story */}
      <section className="section">
        <div className="story-grid">
          <figure className="photo-frame">
            <div className="photo-slot" style={{ aspectRatio: '4 / 5' }}>
              <p className="hand" style={{ fontSize: 22 }}>Photo here someday :)</p>
            </div>
            <figcaption>&ldquo;Still a work in progress, but a good direction.&rdquo;</figcaption>
          </figure>

          <div>
            <div className="section-head">
              <h2>My Story</h2>
              <p className="hand">A curious human, figuring things out.</p>
            </div>

            <div className="prose">
              <p>
                I&rsquo;ve always been curious about how things work — from the small
                details to the big picture. That curiosity eventually led me to computer
                science, and now I get to work on AI/ML systems, full-stack applications,
                and all kinds of in-between ideas.
              </p>
              <p>
                I enjoy turning abstract ideas into real, useful things — whether it&rsquo;s
                an AI agent, a creative tool, or a small experiment that makes someone&rsquo;s
                day a little better. I&rsquo;m especially drawn to projects that combine
                technology, creativity, and real human impact.
              </p>
              <p>
                Outside of code, I&rsquo;m a big believer in good coffee, long walks,
                interesting conversations, and a life that makes room for curiosity,
                creativity, and kindness.
              </p>
              <p>
                This is just one chapter — there&rsquo;s a lot more to build. 🌿
              </p>

              {/* Room for the longer version: add more <p> blocks here. */}
            </div>
          </div>

          <aside className="story-rail" style={{ display: 'grid', gap: 20 }}>
            <blockquote className="pull-quote">
              &ldquo;The internet is a weird place. Glad you found this corner.&rdquo;
              <cite>— Samuel</cite>
            </blockquote>

            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 24, marginBottom: 12 }}>Quick Facts</h3>
              <dl className="facts">
                {quickFacts.map(({ icon, term, detail }) => {
                  const Icon = Icons[icon];
                  return (
                    <div className="fact" key={term}>
                      <Icon width={17} height={17} />
                      <dt>{term}</dt>
                      <dd>{detail}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------------- journey */}
      <section className="section paper">
        <div className="section-head">
          <h2>My Journey</h2>
          <p className="hand">A few milestones along the way. More to come.</p>
        </div>

        <ol className="timeline" style={{ listStyle: 'none', margin: 0, padding: '34px 0 0' }}>
          {journey.map(({ icon, title, text }) => {
            const Icon = Icons[icon];
            return (
              <li className="milestone" key={title}>
                <span className="dot"><Icon width={17} height={17} /></span>
                <h4>{title}</h4>
                <p>{text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ------------------------------------------------ focus and values */}
      <section className="section">
        <div className="cols-2">
          <div>
            <div className="section-head">
              <h2>Current Focus</h2>
              <p className="hand">What I&rsquo;m working on these days.</p>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {focusAreas.map(({ icon, title, text }) => {
                const Icon = Icons[icon];
                return (
                  <div className="focus-card" key={title}>
                    <Icon width={20} height={20} />
                    <h4>{title}</h4>
                    <p>{text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="section-head">
              <h2>My Values</h2>
              <p className="hand">What guides me.</p>
            </div>
            <div className="cols-2" style={{ gap: 14 }}>
              {values.map(({ icon, title, text }) => {
                const Icon = Icons[icon];
                return (
                  <div className="value-card" key={title}>
                    <Icon width={22} height={22} />
                    <h4>{title}</h4>
                    <p>{text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="contact-band">
        <div>
          <p className="kicker">Let&rsquo;s connect</p>
          <h2>I&rsquo;d love to hear from you.</h2>
          <p>
            Whether you want to collaborate, chat about ideas, or just say hi — I&rsquo;m
            always up for a good conversation.
          </p>
        </div>
        <div className="contact-actions">
          <Link className="button primary" href="/#book">
            Book a Call <Icons.Arrow className="arrow" width={15} height={15} />
          </Link>
          <Link className="button ghost" href="/services">What I can help with</Link>
        </div>
      </div>
    </>
  );
}
