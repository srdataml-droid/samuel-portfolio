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
- Replace `site.email` in `data/site.js`. Every `mailto:` link reads it.
- Fill in the `socials` links in `data/site.js`. Entries still set to `#` are
  hidden rather than rendered as dead links.
- Point the two "Book a Call" buttons at a real scheduling link.
- The chat drawer is a front end only; the composer stays disabled until a
  backend exists.

## Artwork

`node scripts/optimize-art.mjs` regenerates the small closed-eye patches the
hero blink uses and the WebP versions of the footer art. Run it after
replacing any of the source PNGs and paste the printed `patch` rects into
`components/HeroBlink.js`.

Animation notes and verification history: `ANIMATION-NOTES.md`,
`HIDE-AND-SEEK.md`.
