'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { followPointer, onPointerRest } from '@/lib/follow';

export default function AnimatedCat({ className = '', interactive = true, meadow = false }) {
  const id = useId().replace(/:/g, '');
  const root = useRef(null);
  const [action, setAction] = useState('idle');
  const [still, setStill] = useState(false);
  const [atRight, setAtRight] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  // Moods layered on top of the current action: alert (something moved fast
  // nearby), purr (being stroked) and a slow blink (someone lingering close).
  const [alert, setAlert] = useState(false);
  const [purr, setPurr] = useState(false);
  const [slowBlink, setSlowBlink] = useState(false);
  const activity = useRef(Date.now());
  const actionRef = useRef('idle');
  actionRef.current = action;
  const facingRef = useRef(false);
  facingRef.current = facingLeft;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setStill(media.matches || document.documentElement.dataset.motion === 'paused');
      if (!media.matches) return;
      // A walk cut short by reduced motion arrives at its destination instead of snapping back to the start.
      if (actionRef.current === 'walk') setAtRight(value => !value);
      setAction(value => ['walk', 'stretch', 'wave'].includes(value) ? 'idle' : value);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    media.addEventListener('change', sync);
    sync();
    return () => { observer.disconnect(); media.removeEventListener('change', sync); };
  }, []);

  useEffect(() => {
    if (!interactive || still) return;
    const el = root.current;
    const touch = el.querySelector('.cat-touch');
    const set = (xName, yName) => ({ x, y }) => {
      el.style.setProperty(xName, x.toFixed(3));
      el.style.setProperty(yName, y.toFixed(3));
    };
    // Where the eyes are in the artwork, mirrored when the meadow cat faces left.
    const eyes = () => ({ x: facingRef.current ? 0.19 : 0.81, y: 0.25 });
    const timers = {};
    const later = (key, fn, ms) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); };
    const busy = () => actionRef.current === 'sleep' || actionRef.current === 'walk';

    // The eyes lead: quick, and they glance about when nothing is moving.
    // The body follows more slowly behind them.
    const stops = [
      followPointer(touch, set('--eye-x', '--eye-y'), { settleMs: 60, reach: 0.9, idleMs: 2500, origin: eyes, wander: true }),
      followPointer(touch, set('--cat-yaw', '--cat-pitch')),
      onPointerRest(touch, () => {
        if (busy()) return;
        setSlowBlink(true);
        later('blink', () => setSlowBlink(false), 1700);
      }, { origin: eyes, radius: 150, delay: 1200 }),
    ];

    // A fast flick of the pointer nearby puts the cat on alert: ears up, tail twitching.
    let prev = null;
    const watch = (event) => {
      activity.current = Date.now();
      if (event.pointerType === 'touch' || busy()) { prev = null; return; }
      const now = performance.now();
      if (prev && now > prev.t) {
        const speed = Math.hypot(event.clientX - prev.x, event.clientY - prev.y) / (now - prev.t);
        const box = touch.getBoundingClientRect();
        const near = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2)) < 420;
        if (near && speed > 1.8) { setAlert(true); later('alert', () => setAlert(false), 1800); }
      }
      prev = { x: event.clientX, y: event.clientY, t: now };
    };

    // Stroking the cat (moving across it, mouse or finger) starts a purr.
    let stroke = 0, strokeAt = 0, strokePrev = null, heading = 0, turns = 0;
    const pet = (event) => {
      if (busy()) return;
      const now = performance.now();
      if (now - strokeAt > 600) { stroke = 0; strokePrev = null; heading = 0; turns = 0; }
      if (strokePrev) {
        const dx = event.clientX - strokePrev.x;
        const step = Math.hypot(dx, event.clientY - strokePrev.y);
        // Petting is unhurried; a fast swipe across the cat startles it instead.
        if (step / Math.max(now - strokeAt, 1) < 1.5) stroke += step;
        // A stroke goes back and forth; one pass on the way somewhere else doesn't count.
        if (Math.abs(dx) > 3) {
          const dir = Math.sign(dx);
          if (heading && dir !== heading) turns += 1;
          heading = dir;
        }
      }
      strokePrev = { x: event.clientX, y: event.clientY };
      strokeAt = now;
      if (stroke > 140 && turns >= 1) {
        setPurr(true);
        setAlert(false);
        later('purr', () => setPurr(false), 1400);
      }
    };

    const wake = () => { activity.current = Date.now(); };
    const timer = window.setInterval(() => {
      if (!document.hidden && Date.now() - activity.current > 45000 && actionRef.current === 'idle') setAction('sleep');
    }, 5000);
    window.addEventListener('pointermove', watch, { passive: true });
    window.addEventListener('keydown', wake);
    touch.addEventListener('pointermove', pet, { passive: true });
    return () => {
      stops.forEach((stop) => stop());
      Object.values(timers).forEach(clearTimeout);
      clearInterval(timer);
      window.removeEventListener('pointermove', watch);
      window.removeEventListener('keydown', wake);
      touch.removeEventListener('pointermove', pet);
      setAlert(false); setPurr(false); setSlowBlink(false);
    };
  }, [interactive, still]);

  function perform(next) {
    if (meadow && action === 'walk') return;
    activity.current = Date.now();
    if (next === 'walk') setFacingLeft(atRight);
    if (next === 'sleep') {
      setAction(action === 'sleep' ? 'idle' : 'sleep');
    } else if (!still) { setAction(next); }
  }
  const clip = name => `url(#${id}-${name})`;
  // Legs and torso overlap through soft gradient edges so a rotating leg never exposes a hard slab of belly fur.
  const legMask = (name, x, width) => <mask id={`${id}-${name}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1200">
    <rect x={x} y="735" width={width} height="465" fill={`url(#${id}-leg-fade)`} />
  </mask>;
  const source = <image href="/cat/animated/body-display.png" width="1600" height="1200" />;
  const graphic = <>
    <svg viewBox="0 0 1600 1200" aria-hidden="true" className="mascot articulated-cat">
      <defs>
        <linearGradient id={`${id}-torso-fade`} gradientUnits="userSpaceOnUse" x1="0" y1="775" x2="0" y2="815"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#000" /></linearGradient>
        <linearGradient id={`${id}-leg-fade`} gradientUnits="userSpaceOnUse" x1="0" y1="740" x2="0" y2="780"><stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" /></linearGradient>
        <mask id={`${id}-torso`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1200">
          <path d="M0 0H1065V450H1600V815H0Z" fill={`url(#${id}-torso-fade)`} />
          {/* The belly between the rear and front legs (it ends near y 836) stays with the torso. */}
          <rect x="795" y="770" width="200" height="110" fill="#fff" />
          {/* Neck fur under the back of the head, so turning the head never uncovers a gap. */}
          <rect x="1030" y="300" width="150" height="170" fill="#fff" />
        </mask>
        {/* Soft-edged eye sockets: a copy of the eyes slides inside them to look around. */}
        <radialGradient id={`${id}-socket-fade`}><stop offset="0.55" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
        <mask id={`${id}-sockets`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1200">
          <ellipse cx="1226" cy="302" rx="38" ry="24" fill={`url(#${id}-socket-fade)`} />
          <ellipse cx="1364" cy="300" rx="38" ry="24" fill={`url(#${id}-socket-fade)`} />
        </mask>
        <clipPath id={`${id}-head`}><path d="M1060 245L1180 235L1190 145H1350V230H1500V470H1060Z" /></clipPath>
        <clipPath id={`${id}-ear-left`}><path d="M1085 60L1198 62L1232 246L1085 264Z" /></clipPath>
        <clipPath id={`${id}-ear-right`}><path d="M1340 60H1500V255L1330 243Z" /></clipPath>
        {legMask('rear-near', 0, 535)}
        {legMask('rear-far', 535, 265)}
        {legMask('front-near', 985, 235)}
        {legMask('front-far', 1220, 380)}
      </defs>
      <g className="rig-body">
        <g className="tail-motion"><image href="/cat/animated/tail-display.png" x="120" y="130" width="330" height="465.947" /></g>
        <g className="rig-leg leg-rear-far" mask={clip('rear-far')}>{source}</g>
        <g className="rig-leg leg-front-far" mask={clip('front-far')}>{source}</g>
        <g mask={clip('torso')}>{source}</g>
        <g className="rig-leg leg-rear-near" mask={clip('rear-near')}>{source}</g>
        <g className="rig-leg leg-front-near" mask={clip('front-near')}>{source}</g>
        <g className="rig-head">
          <g clipPath={clip('head')}>{source}</g>
          <g mask={clip('sockets')}><g className="rig-iris">{source}</g></g>
          <g className="rig-ear ear-left" clipPath={clip('ear-left')}>{source}</g>
          <g className="rig-ear ear-right" clipPath={clip('ear-right')}>{source}</g>
          <g className="blink-motion"><image href="/cat/animated/eyes-display.png" x="1160" y="235" width="280" height="120" /></g>
        </g>
      </g>
    </svg>
    <img className="cat-sleep-pose" src="/cat/animated/cat-sleep.webp" width="1456" height="1088" alt="" aria-hidden="true" />
    <span className="cat-zzz" aria-hidden="true">z z z</span>
    <span className="cat-purr-note" aria-hidden="true">prrr…</span>
  </>;

  const actor = interactive ? <button type="button" className="cat-touch" onClick={() => perform(action === 'sleep' ? 'sleep' : 'wave')} aria-label={action === 'sleep' ? 'Wake the cat' : 'Say hello to the cat'}>{graphic}</button> : <div className="cat-touch">{graphic}</div>;
  return <div ref={root} className={`animated-cat motion-scene cat-${action} ${alert ? 'cat-alert' : ''} ${purr ? 'cat-purr' : ''} ${slowBlink ? 'cat-slowblink' : ''} ${still ? 'cat-still' : ''} ${meadow ? 'cat-meadow' : ''} ${facingLeft ? 'cat-facing-left' : ''} ${className}`}
    style={meadow ? { '--cat-position': atRight ? 'var(--meadow-span)' : '0%', '--walk-from': atRight ? 'var(--meadow-span)' : '0%', '--walk-to': atRight ? '0%' : 'var(--meadow-span)' } : undefined}
    onAnimationEnd={event => {
      if (event.animationName === 'meadow-stroll') { setAtRight(value => !value); setAction('idle'); activity.current = Date.now(); }
      if (['cat-wave', 'cat-stretch', 'cat-stroll', 'meadow-stretch'].includes(event.animationName)) setAction('idle');
    }}>
    {meadow ? <div className="meadow-stage">
      <img className="meadow-landscape" src="/scenes/meadow.webp" alt="A quiet grassy clearing with a path between the trees" width="2048" height="683" />
      <div className="meadow-traveller"><span className="meadow-shadow" aria-hidden="true" />{actor}</div>
      <svg className="meadow-grasses" viewBox="0 0 900 300" preserveAspectRatio="none" aria-hidden="true">
        {[20,48,78,112,740,780,820,858,886].map((x,i) => <g key={x} className="grass-tuft" style={{ transformOrigin: `${x}px 300px`, animationDelay: `${-i*.4}s` }}>
          <path d={`M${x} 300 Q${x-12} 276 ${x-18} ${254+i%3*7} M${x} 300 Q${x+7} 267 ${x+17} ${247+i%2*9} M${x} 300 Q${x-2} 270 ${x+1} 258`} />
        </g>)}
      </svg>
    </div> : actor}
    {interactive && <div className="cat-actions" role="group" aria-label="Cat activities">
      <button type="button" onClick={() => perform('walk')} disabled={still || (meadow && action === 'walk')}>{meadow ? action === 'walk' ? 'Walking…' : atRight ? 'Walk back' : 'Take a walk' : 'Walk'}</button>
      <button type="button" onClick={() => perform('stretch')} disabled={still || (meadow && action === 'walk')}>Stretch</button>
      <button type="button" onClick={() => perform('sleep')} disabled={meadow && action === 'walk'}>{action === 'sleep' ? 'Wake' : 'Nap'}</button>
    </div>}
    {meadow && <p className="meadow-status" role="status">{action === 'walk' ? 'A little wander through the grass.' : action === 'stretch' ? 'A long stretch, paws forward.' : action === 'sleep' ? 'A sunny spot for a nap. Tap the cat to wake up.' : purr ? 'Purring. Keep going.' : 'Stroke the cat, tap to say hello, or choose a little adventure.'}</p>}
  </div>;
}
