# samuel-portfolio

Samuel's personal site: Next.js 15 (App Router), React 19, plain CSS, no UI
library. Five static routes plus a custom 404, all prerendered.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build; also the pre-push check
npm start          # serve the production build
```

Do not run `next dev` and `next start` against the same folder at the same
time: both write to `.next/`.

## Where things live

| What | Where |
| --- | --- |
| Name, canonical URL, contact email, nav, socials, service copy | `data/site.js` |
| Projects, videos, experiments, Instagram/TikTok posts | `data/content.js` |
| Routes | `app/*/page.js`, `app/not-found.js` |
| Colour tokens, type, every style | `app/globals.css` |
| Shell (sidebar, mobile nav, footer, chat drawer) | `components/` |
| Hero paintings and the cat rig artwork | `public/scenes`, `public/cat` |

Adding a project or a video means adding one object to the matching list in
`data/content.js`; the page switches from its empty state to a real grid with
no other change. The object shapes are documented at the top of that file.

## Before going live

- Set `NEXT_PUBLIC_SITE_URL` (for example `https://samuel.example`) in the
  deployment environment. Open Graph URLs, `robots.txt` and `sitemap.xml`
  read it.
- Contact email and social links live in `data/site.js`. Entries still set
  to `#` (currently YouTube) are hidden rather than rendered as dead links.
- "Book a Call" opens an email template (`bookingHref` in `data/site.js`). Swap it for a scheduling link once one exists.
- The chat panel is a site guide (`lib/guide.js`): it matches a question to a
  topic and answers from `data/site.js` and `data/content.js`, so it updates
  itself when those do. It is not a language model and says so. To add a topic,
  add an entry with its trigger words and an answer. Swapping in a real model
  later means replacing `answer()` with a call to an API route.

## The Lab: YouTube, Instagram, TikTok

Post on the platforms as usual; the site follows.

- **Connect a channel:** put the handle in `channels` in `data/site.js`. Its icon
  appears in the sidebar, footer and phone menu, and a card appears in the Lab's
  "Follow along" row. Empty handles stay hidden.
- **YouTube uploads appear on their own.** `lib/youtube.js` reads the channel's
  latest uploads; the home page and the Lab rebuild in the background at most
  once an hour, so a new video shows up within the hour with no redeploy.
  - Set `YOUTUBE_API_KEY` in Vercel (Project → Settings → Environment Variables).
    It is a free Google Cloud API key with the YouTube Data API v3 enabled; each
    refresh costs 1 unit of the default 10,000 a day. Without it the site uses
    YouTube's public feed, which often refuses requests from cloud servers.
  - Fill in `channelId` (starts with `UC`) as well as the handle; looking a handle
    up costs an extra request on every refresh.
  - If YouTube is unreachable during a refresh, the last good page stays up. If it
    is unreachable during a build, the build carries on without the grid.
- **Instagram and TikTok posts:** paste a post's share link into `posts` in
  `data/content.js`; the Lab embeds it with the platform's own player. There is
  no automatic feed for these two: that needs each platform's API access.

## Demos

`demos/hvac-request/` is a standalone client demo (an HVAC service request
page) with its own README. It is plain Node with no dependencies and is not part
of the site build.

## Artwork

`node scripts/optimize-art.mjs` regenerates the small open- and closed-eye
patches the hero cats use to look around and blink, and the WebP versions of the footer art. Run it after
replacing any of the source PNGs and paste the printed `patch` rects into
`components/HeroBlink.js`.

Animation notes and verification history: `ANIMATION-NOTES.md`,
`HIDE-AND-SEEK.md`.
