import Link from 'next/link';
import DeskScene from '@/components/DeskScene';
import { bookingHref, services, site } from '@/data/site';
import * as Icons from '@/components/Icons';
import CopyEmail from '@/components/CopyEmail';

export const metadata = {
  title: 'Services',
  description: 'AI/ML development, full-stack builds, and useful automation.',
};

const how = [
  { icon: 'Chat',  title: 'Talk it through', text: 'What is the actual problem, and is software even the right answer?' },
  { icon: 'Flask', title: 'Build a small version', text: 'Something real and narrow, fast enough to learn from.' },
  { icon: 'Box',   title: 'Ship and refine', text: 'Put it in front of people, then make it genuinely good.' },
];

export default function ServicesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-copy">
          <p className="hand">Let&rsquo;s build something useful.</p>
          <h1>Services</h1>
          <p className="page-sub">What I can help with.</p>
          <p className="lead">
            Three overlapping things, really: intelligent systems, the software around
            them, and the quiet automation that saves people time. If your problem sits
            somewhere between those, it is probably a good fit.
          </p>
        </div>

        <DeskScene scene="services" priority />
      </section>

      <section className="section" aria-labelledby="service-list">
        <h2 id="service-list" className="sr-only">Services in detail</h2>
        <div className="cols-3">
          {services.map(({ icon, title, blurb, detail }) => {
            const Icon = Icons[icon];
            return (
              <div className="card service-detail" key={title}>
                <Icon width={24} height={24} style={{ color: 'var(--gold)' }} />
                <h3 style={{ marginTop: 10 }}>{title}</h3>
                <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>{blurb}</p>
                <ul>
                  {detail.map((line) => <li key={line}>{line}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section paper">
        <div className="section-head">
          <h2>How it usually goes</h2>
          <p className="hand">No mystery, no ten-stage process.</p>
        </div>

        <div className="cols-3">
          {how.map(({ icon, title, text }) => {
            const Icon = Icons[icon];
            return (
              <div className="focus-card" key={title}>
                <Icon width={20} height={20} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section" id="book">
        <div className="cta-grid">
          <div className="cta-card">
            <Icons.Calendar width={22} height={22} />
            <h3>Book a Call</h3>
            <p>Got a project, an idea, or just want to chat? Let&rsquo;s find time.</p>
            <div className="cta-actions">
              <a className="button primary" href={bookingHref}>
                Email to book <Icons.Arrow className="arrow" width={15} height={15} />
              </a>
              <CopyEmail />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Opens your mail app with a short template, addressed to {site.email}.
            </p>
          </div>

          <div className="cta-card">
            <Icons.Grid width={22} height={22} />
            <h3>See the work first</h3>
            <p>
              The projects page is still filling up — it will show what I built, why,
              and what came of it.
            </p>
            <Link className="button ghost" href="/projects">
              View Projects <Icons.Arrow className="arrow" width={15} height={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
