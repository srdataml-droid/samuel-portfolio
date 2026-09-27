import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside an open dialog, closes it on Escape, and hands
 * focus back to whatever opened it once it closes: what `aria-modal` promises.
 */
export default function useFocusTrap(ref, open, onClose, initial) {
  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const panel = ref.current;
    const opener = document.activeElement;
    (initial?.current || panel.querySelector(FOCUSABLE))?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [ref, open, onClose, initial]);
}
