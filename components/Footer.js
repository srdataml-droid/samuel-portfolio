import Link from 'next/link';
import HideAndSeek from './HideAndSeek';
import AnimatedCat from './AnimatedCat';
import MotionControls from './MotionControls';
import Socials from './Socials';
import { pages, site } from '@/data/site';
import { Mail } from './Icons';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <p className="hand" style={{ maxWidth: '22ch' }}>
          &ldquo;A kinder, more creative, more curious tomorrow.&rdquo;
        </p>

        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <Socials className="footer-socials" size={19}>
            <a href={`mailto:${site.email}`} aria-label="Email">
              <Mail width={19} height={19} />
            </a>
          </Socials>
          <p className="muted" style={{ fontSize: 13 }}>
            Let&rsquo;s connect and build something good.
          </p>
        </div>

        <div className="footer-mascot footer-play-scene"><HideAndSeek /></div>
      </div>

      <section className="meadow-section" aria-label="The cat's meadow">
        <p className="hand">A little fresh air.</p>
        <AnimatedCat meadow />
        <MotionControls />
      </section>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}. Built with curiosity.</span>
        <nav className="footer-nav" aria-label="Footer">
          {pages.map(({ label, href }) => (
            <Link key={href} href={href}>{label.replace(' / Videos', '')}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
