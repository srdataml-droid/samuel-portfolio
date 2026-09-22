'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from './Icons';

const STORAGE_KEY = 'samuel-theme';

/**
 * Two explicit buttons rather than one ambiguous switch: you can always see
 * which mode you are in. The initial value is applied by the inline script in
 * the root layout, so this only has to read what is already on <html>.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  function choose(next) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just will not persist */
    }
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      <button type="button" onClick={() => choose('light')} aria-pressed={theme === 'light'}>
        <Sun />
        <span className="sr-only">Light mode</span>
      </button>
      <button type="button" onClick={() => choose('dark')} aria-pressed={theme === 'dark'}>
        <Moon />
        <span className="sr-only">Dark mode</span>
      </button>
    </div>
  );
}
