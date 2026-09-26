/**
 * Pointer follow with easing.
 *
 * Tracks the pointer anywhere in the window, expresses it as a -1..1 offset
 * from a point on the element (its centre by default, or `origin` as a
 * fraction of its box, e.g. where a cat's eyes are), and eases the current
 * value toward that target with a time-based curve, so the feel is the same
 * at any frame rate. Hands the eased pair to `apply`.
 *
 * Options
 *   settleMs  time constant of the easing; smaller is snappier (eyes ~60, body ~160)
 *   reach     how far, in element sizes, the pointer must be to saturate at ±1
 *   idleMs    after this long without pointer movement the follow lets go
 *   origin    {x, y} fraction of the box, or a function returning one
 *   wander    when idle, glance at random nearby points instead of resting
 *
 * Returns a cleanup function that also resets to rest.
 */
export function followPointer(el, apply, { settleMs = 160, reach = 1.3, idleMs = 3000, origin, wander = false } = {}) {
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let frame = 0;
  let idle = 0;
  let glance = 0;
  let last = 0;

  const tick = (now) => {
    frame = 0;
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
  const aim = (next) => { target = next; kick(); };

  const visible = () => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight && !document.hidden;
  };

  // Idle glances: a quick look somewhere nearby, a hold, then often back to centre.
  const scheduleGlance = () => {
    clearTimeout(glance);
    glance = setTimeout(() => {
      if (visible()) {
        const home = Math.random() < 0.4;
        aim(home ? { x: 0, y: 0 } : { x: (Math.random() * 2 - 1) * 0.8, y: (Math.random() * 2 - 1) * 0.5 });
      }
      scheduleGlance();
    }, 1400 + Math.random() * 2600);
  };
  const goIdle = () => {
    aim({ x: 0, y: 0 });
    if (wander) scheduleGlance();
  };

  const move = (event) => {
    if (event.pointerType === 'touch' || document.hidden) return;
    clearTimeout(glance);
    const box = el.getBoundingClientRect();
    if (!visible()) { goIdle(); return; }
    const o = (typeof origin === 'function' ? origin() : origin) || { x: 0.5, y: 0.5 };
    aim({
      x: clamp((event.clientX - (box.left + box.width * o.x)) / (box.width * reach)),
      y: clamp((event.clientY - (box.top + box.height * o.y)) / (box.height * reach)),
    });
    clearTimeout(idle);
    idle = setTimeout(goIdle, idleMs);
  };
  const leave = () => { clearTimeout(idle); goIdle(); };

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('blur', leave);
  document.addEventListener('visibilitychange', leave);
  document.documentElement.addEventListener('mouseleave', leave);
  if (wander) scheduleGlance(); // touch screens never send hover moves, so start looking around straight away

  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('blur', leave);
    document.removeEventListener('visibilitychange', leave);
    document.documentElement.removeEventListener('mouseleave', leave);
    clearTimeout(idle);
    clearTimeout(glance);
    cancelAnimationFrame(frame);
    frame = 0;
    apply({ x: 0, y: 0 });
  };
}

/**
 * Calls `onRest` once when the pointer stops moving within `radius` px of a
 * point on the element for `delay` ms: a visitor lingering near the cat.
 * Fires again only after the pointer moves on. Returns a cleanup.
 */
export function onPointerRest(el, onRest, { origin = { x: 0.5, y: 0.5 }, radius = 120, delay = 1200 } = {}) {
  let timer = 0;
  const move = (event) => {
    clearTimeout(timer);
    if (event.pointerType === 'touch' || document.hidden) return;
    const box = el.getBoundingClientRect();
    const o = typeof origin === 'function' ? origin() : origin;
    const dx = event.clientX - (box.left + box.width * o.x);
    const dy = event.clientY - (box.top + box.height * o.y);
    if (Math.hypot(dx, dy) <= radius) timer = setTimeout(onRest, delay);
  };
  window.addEventListener('pointermove', move, { passive: true });
  return () => { window.removeEventListener('pointermove', move); clearTimeout(timer); };
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
