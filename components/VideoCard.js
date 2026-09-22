import Image from 'next/image';
import { Play, Calendar } from './Icons';

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Renders one entry from `data/content.js`. Unused while the list is empty.
 */
export default function VideoCard({ video }) {
  const { title, date, duration, blurb, thumb, href } = video;

  return (
    <article className="video-card">
      <a className="video-thumb" href={href} target="_blank" rel="noreferrer">
        {thumb ? <Image src={thumb} alt="" width={640} height={400} /> : null}
        <span className="play"><Play width={22} height={22} /></span>
        {duration && <span className="video-dur">{duration}</span>}
      </a>
      <h3 style={{ fontSize: 19 }}>{title}</h3>
      <div className="video-meta">
        {date && <span><Calendar width={14} height={14} /> {formatDate(date)}</span>}
        {duration && <span>{duration}</span>}
      </div>
      {blurb && <p className="muted" style={{ fontSize: 14 }}>{blurb}</p>}
    </article>
  );
}
