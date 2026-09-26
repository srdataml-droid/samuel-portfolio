'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { followPointer, onPointerRest, watchStillness } from '@/lib/follow';

/**
 * The painted cat in each hero, brought a little to life:
 *
 * - Its eyes follow the pointer. A small patch of the open eyes, cut from the
 *   painting, is drawn over them through a feathered mask and nudged toward
 *   the pointer, so the irises move while the fur around them stays put.
 * - With no pointer around, it glances about now and then.
 * - Linger near its face and it gives a slow blink, the way cats greet
 *   someone they trust. Clicking it does the same.
 *
 * Patch rects come from `node scripts/optimize-art.mjs`; re-run it whenever
 * the artwork or the eye ellipses change.
 */
const scenes = {
  home: {
    width: 760, height: 316,
    eyes: [[260,109,23,15],[303,117,23,15]],
    patch: { x: 228.74, y: 85.65, width: 105.39, height: 54.36 },
    look: { x: 229, y: 86, width: 105, height: 54 },
  },
  lab: {
    width: 748, height: 316,
    eyes: [[314,108,26,17],[374,114,26,17]],
    patch: { x: 279.82, y: 82.97, width: 128.28, height: 56.22 },
    look: { x: 280, y: 83, width: 128, height: 56 },
  },
  about: {
    width: 680, height: 318,
    eyes: [[297,182,17,13],[334,193,17,13]],
    patch: { x: 271.85, y: 160.67, width: 87.41, height: 53.43 },
    look: { x: 272, y: 161, width: 87, height: 53 },
  },
  projects: {
    width: 748, height: 194,
    eyes: [[150,5,19,13],[193,23,20,14]],
    patch: { x: 122.94, y: -16.31, width: 98.15, height: 61.56 },
    look: { x: 123, y: 0, width: 98, height: 45 },
  },
};

// How far the irises travel, in viewBox units, at full reach.
const TRAVEL = { x: 4.5, y: 2.6 };

export default function HeroBlink({ scene }) {
  const name = scene === 'services' ? 'projects' : scene;
  const config = scenes[name] || scenes.home;
  const id = useId().replace(/:/g, '');
  const [blink, setBlink] = useState(0);
  const button = useRef(null);
  const iris = useRef(null);

  // Where the eyes sit, as a fraction of the scene: the follow and the linger
  // detector both measure from here rather than from the middle of the painting.
  const eyeX = config.eyes.reduce((sum, [cx]) => sum + cx, 0) / config.eyes.length / config.width;
  const eyeY = config.eyes.reduce((sum, [, cy]) => sum + cy, 0) / config.eyes.length / config.height;

  useEffect(() => {
    const el = button.current;
    let stops = [];
    const halt = () => { stops.forEach((stop) => stop()); stops = []; };
    const unwatch = watchStillness((still) => {
      halt();
      if (still) return;
      stops.push(followPointer(el, ({ x, y }) => {
        iris.current?.setAttribute('transform', `translate(${(x * TRAVEL.x).toFixed(2)} ${(y * TRAVEL.y).toFixed(2)})`);
      }, { settleMs: 70, reach: 0.9, idleMs: 2500, origin: { x: eyeX, y: eyeY }, wander: true }));
      stops.push(onPointerRest(el, () => setBlink((value) => value + 1), { origin: { x: eyeX, y: eyeY }, radius: 110, delay: 1300 }));
    });
    return () => { halt(); unwatch(); };
  }, [eyeX, eyeY]);

  return (
    <button
      ref={button}
      className="hero-cat-reaction"
      type="button"
      aria-label="Say hello to the cat in the illustration"
      onClick={() => setBlink((value) => value + 1)}
    >
      <svg viewBox={`0 0 ${config.width} ${config.height}`} aria-hidden="true">
        <defs>
          <clipPath id={`hero-eyes-${id}`}>
            {config.eyes.map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
          </clipPath>
          {/* Soft-edged eye sockets: the moving patch fades into the still painting. */}
          <radialGradient id={`hero-socket-fade-${id}`}>
            <stop offset="0.55" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={`hero-socket-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={config.width} height={config.height}>
            {config.eyes.map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.85} fill={`url(#hero-socket-fade-${id})`} />
            ))}
          </mask>
        </defs>
        <g mask={`url(#hero-socket-${id})`}>
          <g ref={iris}>
            <image href={`/scenes/${name}-eyes-open.webp`} {...config.look} preserveAspectRatio="none" />
          </g>
        </g>
        <g
          key={blink}
          className={blink ? 'hero-eyes hero-eyes-greeting' : 'hero-eyes'}
          clipPath={`url(#hero-eyes-${id})`}
        >
          <image href={`/scenes/${name}-eyes.webp`} {...config.patch} preserveAspectRatio="none" />
        </g>
      </svg>
    </button>
  );
}
