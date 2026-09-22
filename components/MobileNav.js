'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Brand from './Brand';
import NavList from './NavList';
import Socials from './Socials';
import ThemeToggle from './ThemeToggle';
import { Menu, Close } from './Icons';

/**
 * Mobile navigation is its own thing, not the sidebar squeezed sideways:
 * a compact sticky bar plus a slide-in drawer holding the same links,
 * the same socials and the same theme control.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <Brand showNote={false} />
        <div className="topbar-actions">
          <ThemeToggle />
          <button
            type="button"
            className="icon-button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-drawer"
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </header>

      <div
        className={`drawer-scrim ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div
        id="mobile-drawer"
        className={`drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={open ? undefined : true}
      >
        <div className="drawer-head">
          <Brand />
          <button ref={closeRef} type="button" className="icon-button" onClick={() => setOpen(false)}>
            <Close />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <NavList onNavigate={() => setOpen(false)} />

        <div className="sidebar-rest">
          <p className="sidebar-quote">&ldquo;Good software for a kinder world.&rdquo;</p>
          <Socials />
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
