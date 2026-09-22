import Image from 'next/image';
import HeroBlink from './HeroBlink';

/**
 * The hero illustration: the actual painted desk scene from each page mockup,
 * cropped out of the design files (see /public/scenes). Every page carries its
 * own artwork — its own books, mug, framed print and cat pose — exactly as the
 * mockups do.
 *
 * Swapping in different art later means replacing the file and its dimensions
 * here; no page layout changes.
 */
const art = {
  home:     { src: '/scenes/home.png',     width: 760, height: 316 },
  projects: { src: '/scenes/projects.png', width: 748, height: 194 },
  lab:      { src: '/scenes/lab.png',      width: 748, height: 316 },
  about:    { src: '/scenes/about.png',    width: 680, height: 318 },
  // Services has no mockup of its own, so it borrows the Projects desk.
  services: { src: '/scenes/services.png', width: 748, height: 194 },
};

const alt = {
  home: 'A sunlit desk: the cat resting beside books reading Better Models, Useful Software and A Kinder Internet, a mug, a laptop and a framed print reading A Brighter Tomorrow.',
  projects: 'A sunlit desk: the cat curled beside books reading Ideas, Experiments, Useful Things and A Kinder Tomorrow, under a framed print reading Small Projects, Bigger Tomorrows.',
  lab: 'A sunlit desk: the cat peering over a laptop that reads Good Ideas In Progress, beside books reading Build, Experiment, Iterate, Learn and Share.',
  about: 'A sunlit desk: the cat beside books reading Better Tools, Kinder People and A Brighter Tomorrow, with a note reading Same curiosity. Bigger tomorrows.',
  services: 'A sunlit desk: the cat curled beside a stack of books, a mug and a jar of pencils.',
};

export default function DeskScene({ scene = 'home', priority = false }) {
  const image = art[scene] ?? art.home;

  return (
    <div className={`desk desk-${scene} motion-scene`}>
      <div className="desk-canvas">
      <Image
        className="desk-art"
        src={image.src}
        alt={alt[scene] ?? alt.home}
        width={image.width}
        height={image.height}
        priority={priority}
        sizes="(max-width: 1000px) 100vw, 46vw"
      />
      <HeroBlink scene={scene} />
      <div className="desk-atmosphere" aria-hidden="true">
        <span className="desk-steam"><i /><i /><i /></span>
        <span className="desk-glow" />
        <span className="desk-mote mote-one" /><span className="desk-mote mote-two" /><span className="desk-mote mote-three" />
      </div>
      </div>
    </div>
  );
}
