'use client';

import { useId, useState } from 'react';

/**
 * Tap the hero cat and it blinks. Only the eyes change, so instead of
 * shipping the full closed-eye painting we ship a small patch cut from it
 * (public/scenes/*-eyes.webp) and place it at the exact viewBox rect it came
 * from. `patch` values come from `node scripts/optimize-art.mjs` — re-run it
 * whenever the blink artwork or the eye ellipses change.
 */
const scenes = {
  home: {
    width: 760, height: 316,
    eyes: [[260,109,23,15],[303,117,23,15]],
    patch: { x: 228.74, y: 85.65, width: 105.39, height: 54.36 },
  },
  lab: {
    width: 748, height: 316,
    eyes: [[314,108,26,17],[374,114,26,17]],
    patch: { x: 279.82, y: 82.97, width: 128.28, height: 56.22 },
  },
  about: {
    width: 680, height: 318,
    eyes: [[297,182,17,13],[334,193,17,13]],
    patch: { x: 271.85, y: 160.67, width: 87.41, height: 53.43 },
  },
  projects: {
    width: 748, height: 194,
    eyes: [[150,5,19,13],[193,23,20,14]],
    patch: { x: 122.94, y: -16.31, width: 98.15, height: 61.56 },
  },
};

export default function HeroBlink({ scene }) {
  const name = scene === 'services' ? 'projects' : scene;
  const config = scenes[name] || scenes.home;
  const id = useId().replace(/:/g, '');
  const [blink, setBlink] = useState(0);

  return (
    <button
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
        </defs>
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
