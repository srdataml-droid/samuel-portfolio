'use client';

import { useEffect, useRef } from 'react';
import { followPointer, watchStillness } from '@/lib/follow';

/**
 * Gives a painted scene a little depth: the wrapper tilts in perspective
 * toward the pointer, and layers inside it can sit at different depths via
 * the `--tilt-x` / `--tilt-y` custom properties (-1..1). Pure CSS transforms;
 * see the "scene depth" rules in globals.css.
 */
export default function SceneTilt({ children, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let stop = null;
    const set = ({ x, y }) => {
      el.style.setProperty('--tilt-x', x.toFixed(3));
      el.style.setProperty('--tilt-y', y.toFixed(3));
    };
    const unwatch = watchStillness((still) => {
      if (still) { stop?.(); stop = null; set({ x: 0, y: 0 }); }
      else if (!stop) stop = followPointer(el, set);
    });
    return () => { stop?.(); unwatch(); };
  }, []);

  return <div ref={ref} className={`scene-tilt ${className}`.trim()}>{children}</div>;
}
