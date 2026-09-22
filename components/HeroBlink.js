'use client';

import { useId, useState } from 'react';

const scenes = {
  home: { width: 760, height: 316, eyes: [[260,109,23,15],[303,117,23,15]] },
  lab: { width: 748, height: 316, eyes: [[314,108,26,17],[374,114,26,17]] },
  about: { width: 680, height: 318, eyes: [[297,182,17,13],[334,193,17,13]] },
  projects: { width: 748, height: 194, eyes: [[150,5,19,13],[193,23,20,14]], offset: -28, imageHeight: 249 },
};

export default function HeroBlink({ scene }) {
  const name = scene === 'services' ? 'projects' : scene;
  const config = scenes[name] || scenes.home;
  const id = useId().replace(/:/g, '');
  const [blink, setBlink] = useState(0);
  return <button className="hero-cat-reaction" type="button" aria-label="Say hello to the cat in the illustration" onClick={() => setBlink(value => value + 1)}>
    <svg viewBox={`0 0 ${config.width} ${config.height}`} aria-hidden="true">
      <defs><clipPath id={`hero-eyes-${id}`}>
        {config.eyes.map(([cx,cy,rx,ry],i) => <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />)}
      </clipPath></defs>
      <g key={blink} className={blink ? 'hero-eyes hero-eyes-greeting' : 'hero-eyes'} clipPath={`url(#hero-eyes-${id})`}>
        <image href={`/scenes/${name}-blink.png`} width={config.width} height={config.imageHeight || config.height} y={config.offset || 0} preserveAspectRatio="none" />
      </g>
    </svg>
  </button>;
}
