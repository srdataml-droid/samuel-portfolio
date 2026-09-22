'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';

export default function CatRig({ compact=false }) {
  const rigRef = useRef(null);
  useEffect(() => {
    if (compact) return;
    const onMove = (e) => {
      const el = rigRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width/2)) / 500));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height/2)) / 500));
      el.style.setProperty('--look-x', `${dx*3}px`);
      el.style.setProperty('--look-y', `${dy*2}px`);
    };
    window.addEventListener('pointermove', onMove, { passive:true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [compact]);
  if (compact) return <div className="mini-cat"><Image src="/cat/assembled_reference.png" alt="The portfolio cat" width={190} height={145} /></div>;
  return <div className="cat-rig" ref={rigRef} aria-label="Animated cream and grey cat mascot">
    <div className="cat-shadow" />
    <Image className="part tail" src="/cat/tail.png" alt="" width={301} height={425}/>
    <Image className="part back-leg back-a" src="/cat/back_leg_left.png" alt="" width={217} height={319}/>
    <Image className="part back-leg back-b" src="/cat/back_leg_right.png" alt="" width={183} height={327}/>
    <Image className="part front-leg front-b" src="/cat/front_leg_right.png" alt="" width={151} height={332}/>
    <Image className="part body" src="/cat/body.png" alt="" width={742} height={402}/>
    <Image className="part front-leg front-a" src="/cat/front_leg_left.png" alt="" width={162} height={330}/>
    <div className="head-wrap">
      <Image className="part head" src="/cat/head.png" alt="" width={364} height={372}/>
      <span className="lid lid-left" /><span className="lid lid-right" />
    </div>
  </div>;
}
