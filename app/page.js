import Link from 'next/link';
import DeskScene from '@/components/DeskScene';
import EmptyState, { SlotGrid } from '@/components/EmptyState';
import ProjectCard from '@/components/ProjectCard';
import VideoCard from '@/components/VideoCard';
import { projects, videos as manual } from '@/data/content';
import { latestVideos } from '@/lib/youtube';
import { bookingHref, services, site } from '@/data/site';
import ChatButton from '@/components/ChatButton';
import * as Icons from '@/components/Icons';
import CopyEmail from '@/components/CopyEmail';

const featuredProjects = projects.slice(0, 4);
// Refreshed hourly in the background so the latest uploads appear without a deploy.
export const revalidate = 3600;

export default async function HomePage() {
  const fromYouTube = await latestVideos(2);
  const latest = [...manual, ...fromYouTube.filter(v => !manual.some(m => m.href === v.href))].slice(0, 2);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Build · Experiment · A brighter tomorrow</p>

          <h1>Oh, you&rsquo;re here. Nice.</h1>

          <p className="hero-aside-note">
            <span className="arrow-in" aria-hidden="true">&larr;</span>
            <span className="hand">
              The internet is a weird place. Glad you found this corner.
            </span>
          </p>

          <p className="hero-lead">
            <b>I&rsquo;m Samuel</b> — I build AI/ML systems, experiments, and useful software.
          </p>

          <div className="hero-actions">
            <Link className="button primary" href="/projects">
              View Projects <Icons.Arrow className="arrow" />
            </Link>
            <Link className="button ghost" href="/about">
              Read My Story
            </Link>
          </div>

          <div className="hero-notes">
            <p className="hero-note">
              <Icons.Leaf width={17} height={17} />
              <span>Curious by nature.<br />Builder by choice.</span>
            </p>
            <p className="hero-note">
              <Icons.Coffee width={17} height={17} />
              <span>Fuelled by coffee,<br />cats and big ideas.</span>
            </p>
            <p className="hero-note">
              <Icons.Mountain width={17} height={17} />
              <span>Small experiments.<br />Bigger tomorrows.</span>
            </p>
          </div>
        </div>

        <DeskScene scene="home" priority />
      </section>

      {/* -------------------------------------------------------- about me */}
      <section className="section" aria-labelledby="about-preview">
        <div className="section-head">
          <h2 id="about-preview">About Me</h2>
          <p className="hand">Engineer, maker, lifelong learner.</p>
        </div>

        <div className="card about-preview" style={{ padding: 'clamp(20px, 3vw, 34px)' }}>
          <figure className="photo-frame">
            <div className="photo-slot">
              <p className="hand">Photo here someday :)</p>
            </div>
            <figcaption>Still a work in progress, but a good direction.</figcaption>
          </figure>

          <div>
            <h3 style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>Hi, I&rsquo;m Samuel.</h3>
            <p className="lead" style={{ marginTop: 14 }}>
              I&rsquo;m an AI/ML engineer and full-stack developer who loves turning ideas
              into real, useful things. I&rsquo;m curious about how technology can make
              life simpler, kinder, and a bit more magical.
            </p>
            <Link className="button primary" href="/about" style={{ marginTop: 22 }}>
              Read My Full Story <Icons.Arrow className="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- projects */}
      <section className="section paper" aria-labelledby="featured-projects">
        <div className="section-head">
          <h2 id="featured-projects">Featured Projects</h2>
          <p className="hand">Real problems. Real builds. Real results.</p>
          <Link className="text-link" href="/projects">
            View all projects <Icons.Arrow width={15} height={15} />
          </Link>
        </div>

        {featuredProjects.length > 0 ? (
          <div className="cols-3">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <>
            <EmptyState
              icon="Grid"
              title="Nothing pinned here yet. I’m building."
              note="The first projects are still in progress. When one is genuinely worth showing, it lands here — problem, what I built, and what actually came of it."
              hand="Curious about what we can build next?"
            >
              <Link className="button primary" href="/projects">
                See the projects page <Icons.Arrow className="arrow" width={15} height={15} />
              </Link>
              <Link className="button ghost" href="/services">What I can help with</Link>
            </EmptyState>
            <SlotGrid count={3} label="Project slot" />
          </>
        )}
      </section>

      {/* ------------------------------------------------------------- lab */}
      <section className="section" aria-labelledby="latest-lab">
        <div className="section-head">
          <h2 id="latest-lab">Latest from the Lab / Videos</h2>
          <p className="hand">Experiments, ideas, and the occasional happy accident.</p>
          <Link className="text-link" href="/lab">
            View all videos <Icons.Arrow width={15} height={15} />
          </Link>
        </div>

        {latest.length > 0 ? (
          <div className="cols-2">
            {latest.map((video) => <VideoCard key={video.slug} video={video} />)}
          </div>
        ) : (
          <EmptyState
            icon="Camera"
            title="The camera will eventually point here."
            note="Experiments, demos, things that broke, and what I learned from them. Nothing recorded yet — the setup is still being built."
            hand="Progress over perfection."
          >
            <Link className="button ghost" href="/lab">
              See what the lab is for <Icons.Arrow className="arrow" width={15} height={15} />
            </Link>
          </EmptyState>
        )}
      </section>

      {/* -------------------------------------------------------- services */}
      <section className="section paper" aria-labelledby="services-preview">
        <div className="section-head">
          <h2 id="services-preview">Services / What I Can Help With</h2>
          <p className="hand">Let&rsquo;s build something useful.</p>
          <Link className="text-link" href="/services">
            All services <Icons.Arrow width={15} height={15} />
          </Link>
        </div>

        <div className="cols-3">
          {services.map(({ icon, title, blurb }) => {
            const Icon = Icons[icon];
            return (
              <div className="service-card" key={title}>
                <Icon width={22} height={22} />
                <h3>{title}</h3>
                <p>{blurb}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTAs */}
      <section className="section" id="book" aria-labelledby="work-together">
        <div className="section-head">
          <h2 id="work-together">Let&rsquo;s talk</h2>
          <p className="hand">Two doors — pick whichever feels easier.</p>
        </div>

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
            <Icons.Chat width={22} height={22} />
            <h3>Ask the site guide</h3>
            <p>
              Quick questions about my work, services or how to reach me. It answers
              from this site, so it is always up to date, if not very chatty.
            </p>
            <ChatButton>
              Ask a question <Icons.Arrow className="arrow" width={15} height={15} />
            </ChatButton>
          </div>
        </div>
      </section>

      <div className="contact-band">
        <div>
          <p className="kicker">Let&rsquo;s connect</p>
          <h2>Small experiments. Bigger tomorrows.</h2>
          <p>
            Whether you want to collaborate, chat about ideas, or just say hi — I&rsquo;m
            always up for a good conversation.
          </p>
        </div>
        <div className="contact-actions">
          <a className="button primary" href={`mailto:${site.email}`}>
            Say Hello <Icons.Arrow className="arrow" width={15} height={15} />
          </a>
          <Link className="button ghost" href="/about">More about me</Link>
        </div>
      </div>
    </>
  );
}
