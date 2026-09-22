import Image from 'next/image';

/**
 * The mascot, as one clean assembled asset.
 *
 * Deliberately simple: a single <Image> plus a CSS idle drift. The multipart
 * rig (head/tail/legs as separate layers) is NOT used yet — those PNGs still
 * live in /public/cat for later. Because every page reserves the space through
 * `.cat-stage` and this component fills it, the art inside can be swapped for
 * a rigged or animated version without touching a single page layout.
 */
export default function Cat({ size = 'large', priority = false, className = '' }) {
  const width = size === 'small' ? 240 : 460;

  return (
    <Image
      src="/cat/cat-full.png"
      alt="Samuel's mascot: a cream and grey cat with blue eyes, looking mildly unimpressed"
      width={width}
      height={Math.round((width * 1086) / 1448)}
      priority={priority}
      className={`cat ${size === 'small' ? 'small' : ''} ${className}`.trim()}
    />
  );
}
