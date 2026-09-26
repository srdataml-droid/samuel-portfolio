import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import DeskScene from '@/components/DeskScene';
import * as Icons from '@/components/Icons';

export const metadata = {
  title: 'Page not found',
  robots: { index: false },
};

/** A 404 in the site's own voice, inside the normal shell. */
export default function NotFound() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-copy">
          <p className="hand">Hmm. The cat has not seen this page either.</p>
          <h1>Page not found</h1>
          <p className="lead">
            Whatever used to be here has wandered off, or never existed. The rest of
            the site is right where you left it.
          </p>
        </div>
        <DeskScene scene="about" priority />
      </section>

      <section className="section">
        <EmptyState
          icon="Sparkle"
          title="Nothing at this address."
          note="If you followed a link from somewhere else, it may be out of date. Try one of these instead."
          hand="The internet is a weird place."
        >
          <Link className="button primary" href="/">
            Back home <Icons.Arrow className="arrow" width={15} height={15} />
          </Link>
          <Link className="button ghost" href="/projects">See the projects</Link>
        </EmptyState>
      </section>
    </>
  );
}
