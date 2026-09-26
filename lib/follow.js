/**
 * Pointer follow with easing.
 *
 * Tracks the pointer anywhere in the window, expresses it as a -1..1 offset
 * from the element's centre, and eases the current value toward that target
 * a little every frame, so motion always arrives with a soft landing rather
 * than snapping. Hands the eased pair to `apply`. Returns to rest when the
 * pointer leaves the window, the tab hides, or nothing moves for a while.
 *
 * Returns a cleanup function that also resets to rest.
 */
export function followPointer(el, apply, { settleMs = 160, reach = 1.3, idleMs = 3000 } = {}) {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let frame = 0;
  let idle = 0;
  let last = 0;

  const tick = (now) => {
    frame = 0;
    // Time-based easing (exponential approach with a ~settleMs time constant),
    // so the feel is identical at 30, 60 or 120 frames per second.
    const dt = last ? Math.min(now - last, 100) : 16;
    last = now;
    const ease = 1 - Math.exp(-dt / settleMs);
    current = {
      x: current.x + (target.x - current.x) * ease,
      y: current.y + (target.y - current.y) * ease,
    };
    const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
    if (settled) current = { ...target };
    apply(current);
    if (!settled) frame = requestAnimationFrame(tick);
  };
  const kick = () => { if (!frame) { last = 0; frame = requestAnimationFrame(tick); } };
  const rest = () => { target = { x: 0, y: 0 }; kick(); };

  const move = (event) => {
    if (event.pointerType === 'touch' || document.hidden) return;
    const box = el.getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > window.innerHeight) { rest(); return; }
    target = {
      x: clamp((event.clientX - (box.left + box.width / 2)) / (box.width * reach)),
      y: clamp((event.clientY - (box.top + box.height / 2)) / (box.height * reach)),
    };
    clearTimeout(idle);
    idle = setTimeout(rest, idleMs);
    kick();
  };

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('blur', rest);
  document.addEventListener('visibilitychange', rest);
  document.documentElement.addEventListener('mouseleave', rest);

  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('blur', rest);
    document.removeEventListener('visibilitychange', rest);
    document.documentElement.removeEventListener('mouseleave', rest);
    clearTimeout(idle);
    cancelAnimationFrame(frame);
    frame = 0;
    apply({ x: 0, y: 0 });
  };
}

/**
 * True while decorative motion should stay still: the visitor prefers
 * reduced motion, or pressed the site's Pause control. `onChange` fires
 * whenever that answer changes; returns a cleanup.
 */
export function watchStillness(onChange) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const read = () => media.matches || document.documentElement.dataset.motion === 'paused';
  const sync = () => onChange(read());
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  media.addEventListener('change', sync);
  sync();
  return () => { observer.disconnect(); media.removeEventListener('change', sync); };
}
