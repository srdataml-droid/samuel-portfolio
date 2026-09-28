'use client';

import { useEffect } from 'react';

/**
 * Instagram and TikTok posts, embedded with each platform's own script. The
 * markup is their documented blockquote; the scripts load only on pages that
 * actually show a post, and are re-run after client-side navigation.
 */

const SCRIPTS = {
  instagram: 'https://www.instagram.com/embed.js',
  tiktok: 'https://www.tiktok.com/embed.js',
};

export const platformOf = (url) =>
  /instagram\.com\/(p|reel|tv)\//.test(url) ? 'instagram'
  : /tiktok\.com\/@[^/]+\/video\/\d+/.test(url) ? 'tiktok'
  : null;

function load(platform) {
  if (platform === 'instagram' && window.instgrm) { window.instgrm.Embeds.process(); return; }
  // TikTok's script scans the page once when it runs, so it is re-added to pick up new posts.
  document.querySelectorAll(`script[data-embed="${platform}"]`).forEach(el => el.remove());
  const script = document.createElement('script');
  script.src = SCRIPTS[platform];
  script.async = true;
  script.dataset.embed = platform;
  document.body.appendChild(script);
}

export default function SocialPosts({ posts }) {
  const shown = posts.map(p => ({ ...p, platform: platformOf(p.url) })).filter(p => p.platform);

  useEffect(() => {
    new Set(shown.map(p => p.platform)).forEach(load);
  }, [shown.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown.length) return null;
  return (
    <div className="social-posts">
      {shown.map(({ url, platform }) => platform === 'instagram' ? (
        <blockquote key={url} className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
          <a href={url} target="_blank" rel="noreferrer">View this post on Instagram</a>
        </blockquote>
      ) : (
        <blockquote key={url} className="tiktok-embed" cite={url} data-video-id={url.match(/video\/(\d+)/)[1]}>
          <section><a href={url} target="_blank" rel="noreferrer">Watch on TikTok</a></section>
        </blockquote>
      ))}
    </div>
  );
}
