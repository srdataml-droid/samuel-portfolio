'use client';

import { useEffect, useId, useRef, useState } from 'react';

export default function AnimatedCat({ className = '', interactive = true, meadow = false }) {
  const id = useId().replace(/:/g, '');
  const root = useRef(null);
  const [action, setAction] = useState('idle');
  const [still, setStill] = useState(false);
  const [atRight, setAtRight] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const activity = useRef(Date.now());
  const actionRef = useRef('idle');
  actionRef.current = action;

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
    let frame = 0;
    const wake = () => {
      activity.current = Date.now();
    };
    const move = event => {
      wake();
      if (frame || event.pointerType === 'touch') return;
      const x = event.clientX, y = event.clientY;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = root.current;
        if (!el || document.hidden || el.closest('[data-in-view="false"]')) return;
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) return;
        el.style.setProperty('--cat-look', `${Math.max(-2.5, Math.min(2.5, (x - box.left - box.width / 2) / 160))}deg`);
        el.style.setProperty('--cat-nod', `${Math.max(-5, Math.min(5, (y - box.top - box.height / 2) / 70))}px`);
      });
    };
    const timer = window.setInterval(() => {
      if (!document.hidden && Date.now() - activity.current > 45000 && actionRef.current === 'idle') setAction('sleep');
    }, 5000);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('keydown', wake);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); window.removeEventListener('pointermove', move); window.removeEventListener('keydown', wake); };
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
          <g className="rig-ear ear-left" clipPath={clip('ear-left')}>{source}</g>
          <g className="rig-ear ear-right" clipPath={clip('ear-right')}>{source}</g>
          <g className="blink-motion"><image href="/cat/animated/eyes-display.png" x="1160" y="235" width="280" height="120" /></g>
        </g>
      </g>
    </svg>
    <img className="cat-sleep-pose" src="/cat/animated/cat-sleep.webp" width="1456" height="1088" alt="" aria-hidden="true" />
    <span className="cat-zzz" aria-hidden="true">z z z</span>
  </>;

  const actor = interactive ? <button type="button" className="cat-touch" onClick={() => perform(action === 'sleep' ? 'sleep' : 'wave')} aria-label={action === 'sleep' ? 'Wake the cat' : 'Say hello to the cat'}>{graphic}</button> : <div className="cat-touch">{graphic}</div>;
  return <div ref={root} className={`animated-cat motion-scene cat-${action} ${still ? 'cat-still' : ''} ${meadow ? 'cat-meadow' : ''} ${facingLeft ? 'cat-facing-left' : ''} ${className}`}
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
    {meadow && <p className="meadow-status" role="status">{action === 'walk' ? 'A little wander through the grass.' : action === 'stretch' ? 'A long stretch, paws forward.' : action === 'sleep' ? 'A sunny spot for a nap. Tap the cat to wake up.' : 'Tap the cat to say hello, or choose a little adventure.'}</p>}
  </div>;
}
