'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { nav } from '@/data/site';
import { useChat } from './ChatProvider';
import * as Icons from './Icons';

/**
 * The one navigation list, rendered by both the desktop sidebar and the
 * mobile drawer. `onNavigate` lets the drawer close itself on selection.
 */
export default function NavList({ onNavigate }) {
  const pathname = usePathname();
  const { openChat } = useChat();

  const isActive = (href) => {
    if (href.startsWith('/#')) return false;
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  return (
    <nav className="nav" aria-label="Main">
      {nav.map((item) => {
        const Icon = Icons[item.icon];

        if (item.action === 'chat') {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                onNavigate?.();
                openChat();
              }}
            >
              <Icon />
              {item.label}
            </button>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={isActive(item.href) ? 'active' : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
