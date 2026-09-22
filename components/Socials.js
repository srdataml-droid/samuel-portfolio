import { socials } from '@/data/site';
import * as Icons from './Icons';

export default function Socials({ className = 'socials', size = 18 }) {
  return (
    <div className={className}>
      {socials.map(({ label, href, icon }) => {
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
    </div>
  );
}
