'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function MotionControls() {
  const [paused, setPaused] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try { setPaused(localStorage.getItem('samuel-motion') === 'paused'); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = paused ? 'paused' : 'playing';
  }, [paused]);

  useEffect(() => {
    const visibility = () => {
      document.documentElement.dataset.motionSuspended = String(document.hidden);
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.dataset.inView = String(entry.isIntersecting);
        if (entry.isIntersecting) entry.target.classList.add('motion-arrived');
      });
    }, { threshold: 0.08 });
    const targets = document.querySelectorAll('.motion-scene, .section-head');
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);

  function toggle() {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem('samuel-motion', next ? 'paused' : 'playing'); } catch {}
  }

  return <button className="motion-control" type="button" onClick={toggle} aria-pressed={paused}>
    {paused ? 'Resume motion' : 'Pause motion'}
  </button>;
}
