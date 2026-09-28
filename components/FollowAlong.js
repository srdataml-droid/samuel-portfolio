import { channels, channelUrl } from '@/data/site';
import * as Icons from './Icons';

const NAMES = { youtube: ['YouTube', 'YouTube', 'Videos, demos and builds'], instagram: ['Instagram', 'Instagram', 'Behind the scenes'], tiktok: ['TikTok', 'TikTok', 'Short experiments'] };

/** The Lab's "Follow along" row: one card per channel with a handle set in data/site.js; nothing renders until one has. */
export default function FollowAlong() {
  const live = Object.entries(channels)
    .map(([key, config]) => ({ key, config, href: channelUrl[key](config) }))
    .filter(({ href }) => href);
  if (!live.length) return null;
  return (
    <section className="section" aria-labelledby="follow-along">
      <div className="section-head">
        <h2 id="follow-along">Follow along</h2>
        <p className="hand">Where the lab posts first.</p>
      </div>
      <div className="follow-grid">
      {live.map(({ key, config, href }) => {
        const [label, icon, note] = NAMES[key];
        const Icon = Icons[icon];
        return (
          <a key={key} className="follow-card" href={href} target="_blank" rel="noreferrer">
            <Icon width={22} height={22} />
            <span>
              <strong>{label}</strong>
              <small>{config.handle ? `@${config.handle.replace(/^@/, '')}` : note}</small>
            </span>
            <Icons.Arrow width={15} height={15} className="arrow" />
          </a>
        );
      })}
      </div>
    </section>
  );
}
