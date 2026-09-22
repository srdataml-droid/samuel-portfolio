'use client';

import { useState } from 'react';
import AnimatedCat from './AnimatedCat';

export default function HideAndSeek() {
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFinished(true);
      setPlaying(false);
      return;
    }
    setFinished(false);
    setRound(value => value + 1);
    setPlaying(true);
  }

  return (
    <div className="hide-and-seek">
      <div className={`seek-stage motion-scene ${playing ? 'seek-playing' : ''} ${finished ? 'seek-finished' : ''}`} aria-hidden="true"
        onAnimationEnd={event => {
          if (event.animationName === 'seek-cat-story') {
            setPlaying(false);
            setFinished(true);
          }
        }}>
        <div key={`cat-${round}`} className="seek-cat"><AnimatedCat interactive={false} /></div>
        <div key={`corgi-${round}`} className="seek-corgi"><img src="/cat/animated/corgi-sitting.png" alt="" width="1024" height="1024" /></div>
        <div className="seek-books"><span>Little mysteries</span><span>Big ideas</span><span>A kinder world</span></div>
        <span className="seek-question">?</span>
        <span className="seek-found">There you are.</span>
      </div>
      <p className="hand">A small game of hide-and-seek.</p>
      <button className="motion-control seek-play" onClick={playing ? () => { setPlaying(false); setFinished(true); } : play}>
        {playing ? 'Skip to the reveal' : finished ? 'Play again' : 'Play hide-and-seek'}
      </button>
      <span className="sr-only" role="status">{finished ? 'The corgi found the cat peeking over the books.' : ''}</span>
    </div>
  );
}
