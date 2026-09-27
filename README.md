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
| Projects, videos, experiments (currently empty on purpose) | `data/content.js` |
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

## Artwork

`node scripts/optimize-art.mjs` regenerates the small open- and closed-eye
patches the hero cats use to look around and blink, and the WebP versions of the footer art. Run it after
replacing any of the source PNGs and paste the printed `patch` rects into
`components/HeroBlink.js`.

Animation notes and verification history: `ANIMATION-NOTES.md`,
`HIDE-AND-SEEK.md`.
