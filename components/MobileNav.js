'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Brand from './Brand';
import NavList from './NavList';
import Socials from './Socials';
import ThemeToggle from './ThemeToggle';
import { Menu, Close } from './Icons';
import useFocusTrap from '@/lib/useFocusTrap';

/**
 * Mobile navigation is its own thing, not the sidebar squeezed sideways:
 * a compact sticky bar plus a slide-in drawer holding the same links,
 * the same socials and the same theme control.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef(null);
  const drawerRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setOpen(false), [pathname]);
  useFocusTrap(drawerRef, open, close, closeRef);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
        ref={drawerRef}
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
