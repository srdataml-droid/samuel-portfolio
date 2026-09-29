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
 * One video: an entry from `data/content.js` or an upload pulled from YouTube by lib/youtube.js.
 */
export default function VideoCard({ video }) {
  const { title, date, duration, blurb, thumb, href } = video;

  return (
    <article className="video-card">
      <a className="video-thumb" href={href} target="_blank" rel="noreferrer" aria-label={`Watch “${title}”`}>
        {/* YouTube thumbnails come straight from YouTube's image server; local art goes through next/image. */}
        {thumb ? thumb.startsWith('http')
          ? <img src={thumb} alt="" width={640} height={360} loading="lazy" decoding="async" />
          : <Image src={thumb} alt="" width={640} height={400} /> : null}
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
