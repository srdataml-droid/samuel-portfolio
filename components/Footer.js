import Link from 'next/link';
import HideAndSeek from './HideAndSeek';
import AnimatedCat from './AnimatedCat';
import MotionControls from './MotionControls';
import { socials } from '@/data/site';
import * as Icons from './Icons';

const links = [
  ['Home', '/'],
  ['Projects', '/projects'],
  ['Lab', '/lab'],
  ['Services', '/services'],
  ['About', '/about'],
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <p className="hand" style={{ maxWidth: '22ch' }}>
          &ldquo;A kinder, more creative, more curious tomorrow.&rdquo;
        </p>

        <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <div className="footer-socials">
            {socials.map(({ label, href, icon }) => {
              const Icon = Icons[icon];
              return (
                <a key={label} href={href} aria-label={label}>
                  <Icon width={19} height={19} />
                </a>
              );
            })}
            <a href="mailto:hello@example.com" aria-label="Email">
              <Icons.Mail width={19} height={19} />
            </a>
          </div>
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
        <span>© {new Date().getFullYear()} Samuel. Built with curiosity.</span>
        <nav className="footer-nav" aria-label="Footer">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
