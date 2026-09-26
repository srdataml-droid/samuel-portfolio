import { socials } from '@/data/site';
import * as Icons from './Icons';

/**
 * The social icon row, shared by the sidebar, the mobile drawer and the
 * footer. `children` lets a caller append extra links (the footer adds email).
 * Placeholder entries (`href: '#'`) are hidden rather than rendered as dead links.
 */
export default function Socials({ className = 'socials', size = 18, children }) {
  const live = socials.filter(({ href }) => href && href !== '#');
  if (live.length === 0 && !children) return null;

  return (
    <div className={className}>
      {live.map(({ label, href, icon }) => {
        const Icon = Icons[icon];
        return (
          <a
            key={label}
            href={href}
            aria-label={label}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noreferrer' : undefined}
          >
            <Icon width={size} height={size} />
          </a>
        );
      })}
      {children}
    </div>
  );
}
