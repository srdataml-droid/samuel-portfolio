import Link from 'next/link';
import DeskScene from '@/components/DeskScene';
import VideoCard from '@/components/VideoCard';
import EmptyState, { SlotGrid } from '@/components/EmptyState';
import { videos, experiments } from '@/data/content';
import * as Icons from '@/components/Icons';

export const metadata = {
  title: 'Lab / Videos',
  description:
    'A tech diary of experiments, demos, lessons, and things Samuel is figuring out in public.',
};

const featured = videos.find((v) => v.featured) ?? videos[0] ?? null;
const rest = videos.filter((v) => v !== featured);

export default function LabPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-copy">
          <p className="hand">Experiment. Learn. Share. Repeat. &hearts;</p>
          <h1>Lab / Videos</h1>
          <p className="lead" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(19px, 2vw, 25px)' }}>
            A tech diary of experiments, demos, lessons, and things I&rsquo;m figuring out
            in public.
          </p>

          <div className="hero-notes">
            <p className="hero-note">
              <Icons.Flask width={17} height={17} />
              <span>Small experiments.<br />Big learnings.</span>
            </p>
            <p className="hero-note">
              <Icons.Play width={17} height={17} />
              <span>Real demos.<br />Real progress.</span>
            </p>
            <p className="hero-note">
              <Icons.Book width={17} height={17} />
              <span>Occasionally messy.<br />Always honest.</span>
            </p>
          </div>
        </div>

        <DeskScene scene="lab" priority />
      </section>

      {/* ------------------------------------------------- featured + focus */}
      <section className="section">
        <div className="cols-2">
          <div>
            <div className="section-head">
              <h2>Featured Video</h2>
              <p className="hand">Latest experiment, fresh from the lab.</p>
            </div>

            {featured ? (
              <VideoCard video={featured} />
            ) : (
              <EmptyState
                icon="Camera"
                title="The camera will eventually point here."
                note="This is where the featured experiment will sit — the build, the wins, the fails, and what I learned. Nothing filmed yet."
                hand="Progress over perfection."
              >
                <Link className="button ghost" href="/projects">
                  See what I&rsquo;m building <Icons.Arrow className="arrow" width={15} height={15} />
                </Link>
              </EmptyState>
            )}
          </div>

          <div className="card" style={{ padding: 'clamp(20px, 3vw, 28px)', alignSelf: 'start' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 'clamp(22px, 2.4vw, 28px)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icons.Flask width={22} height={22} /> Currently Experimenting With
              </h2>
            </div>

            {experiments.length > 0 ? (
              <ul className="experiment-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {experiments.map(({ title, state, done }) => (
                  <li className="experiment" key={title}>
                    {done ? <Icons.Check width={17} height={17} /> : <Icons.Sparkle width={17} height={17} />}
                    <span>{title}</span>
                    <span className="state">{state}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing listed yet. Current experiments will be noted here as they begin.</p>
            )}

            <p className="hand" style={{ marginTop: 18 }}>
              Ideas here might be rough, but that&rsquo;s the point. &hearts;
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ video grid */}
      <section className="section paper">
        <div className="section-head">
          <h2>More Videos</h2>
          <p className="hand">Experiments, tutorials, random ideas, and happy accidents.</p>
        </div>

        {rest.length > 0 ? (
          <div className="cols-3">
            {rest.map((video) => <VideoCard key={video.slug} video={video} />)}
          </div>
        ) : (
          <>
            <EmptyState
              icon="Play"
              title="No videos published yet."
              note="When there are, they land in this grid — title, date, length, and a one-line note on what actually happened."
              hand="More experiments ahead…"
            />
            <SlotGrid count={3} label="Video slot" />
          </>
        )}
      </section>
    </>
  );
}
