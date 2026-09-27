'use client';

import { useState } from 'react';
import { site } from '@/data/site';

/**
 * A mailto link does nothing for visitors without a mail app set up, so the
 * address can also be copied. Falls back to showing it when the clipboard is blocked.
 */
export default function CopyEmail({ className = 'button ghost' }) {
  const [state, setState] = useState('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2500);
  }
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {state === 'copied' ? 'Copied' : state === 'failed' ? site.email : 'Copy email'}
    </button>
  );
}
