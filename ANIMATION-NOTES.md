# Portfolio animation pass

## September 26 — cat behaviour pass

The cats now react like cats, not just turn toward the pointer.

- Eyes follow the pointer on every cat, including the painted cats in the heroes. A copy of the open eyes, cut from the same artwork, slides inside soft-edged sockets, so the irises move and the fur stays put. The eyes lead with a 60 ms time constant, and the head and body follow at 160 ms.
- With no pointer around, including on touch screens, the eyes glance about every 1.4 to 4 seconds and often return to centre.
- Ears swivel toward the pointer, lagging the head slightly.
- Breathing: the layered cat's chest rises and falls on a 4.6 s cycle.
- Alert: a fast flick of the pointer within about 420 px perks the ears and sets the tail tip twitching for about 2 s.
- Petting: slow back-and-forth strokes across the cat, mouse or finger, make it purr. A single pass on the way somewhere else does not count. Its eyes close, its ears relax sideways, its head leans in, its tail lifts and sways slowly, its breathing quickens, and a small "prrr…" appears. A fast swipe counts as startling, not petting.
- Slow blink: resting the pointer near a cat's face for about 1.2 s earns a slow blink, the cat's sign of trust. The painted hero cats do the same.
- Pause motion and reduced motion switch all of this off.
- The sidebar cat is now 288 by 216 pixels, up from 208 by 156. The rail widened from 256 to 288 pixels and the cat runs edge to edge. On screens under 900 pixels tall, the rail drops its quote and tightens the nav. Under 800, it also drops the caption, so the cat and its buttons stay on screen down to 700 pixels tall.

Verified in headless Chromium against a production build. Close-up captures confirmed iris movement in four directions on the layered cat and both directions on the hero cat. Separate runs confirmed that a fast swipe triggers alert and slow strokes trigger purr. The slow blink, idle glances and Pause were also checked. After a real walk there and back, the mirrored meadow cat's eyes still look toward the pointer. The console showed no errors.

## September 26 — depth and follow pass

The hero paintings and the layered cat now respond to the pointer in perspective instead of sitting flat.

- Hero scenes (every page) tilt toward the pointer, up to 12° across and 8° vertically, inside a 1000px perspective. The steam, lamp glow and dust drift a little further than the painting, so they read as a nearer layer. See components/SceneTilt.js and the "scene depth" rules in app/globals.css.
- The sidebar and meadow cats turn their whole body toward the pointer, up to 20°, while the head leads by tipping and nodding. The body layer now also paints the neck under the back of the head, so a turned head never uncovers a gap. When the meadow cat is walking back mirrored, it still turns toward the pointer rather than away. The body turn uses the standalone CSS rotate property, so it stacks with the walk, bob and breathing animations instead of being overwritten by them.
- One shared helper, lib/follow.js, drives all of it. It uses time-based easing with a 160 ms time constant, about 95 % settled in 450 ms at any frame rate. It rests when the pointer leaves the window, the tab hides, or the scene scrolls out of view. Touch input is ignored.
- Timing: the hero notes now arrive one after another, 150 ms apart, after the headline.
- Pause motion and prefers-reduced-motion flatten every tilt and turn to rest.

Verified with a production build and headless Chromium against next start. Corner-to-corner pointer sweeps confirmed the tilt direction on the hero and the cat. Pause and resume, the mirrored meadow cat, the turn persisting mid-walk, and the tilt resuming after scrolling back to the hero were all checked. Light and dark screenshots show no blend box around the painting. The 390px viewport has no horizontal overflow, and the console showed no errors. This is a perspective effect on flat artwork, not a 3D model: the paintings and the cat rig stay 2D layers.

## September 22 continuation — current status

The footer now has a separate meadow scene with a painted clearing, swaying foreground grass, a seven-second walk across the path, a return walk facing the other direction, a longer stretch, and a curled sleeping pose. The walking legs use a half-cycle phase offset: reversing the symmetrical keyframes did not produce alternating steps. The destination is retained when the walk finishes. Walk controls are locked during travel; the global motion control remains available.

The earlier hide-and-seek scene with the corgi remains above the meadow. Hero illustrations have clipped closed-eye artwork for their blink reaction. These are stylized layered 2D animations, not a fully articulated character model.

Verified before the meadow addition: isolated production build passed; hide-and-seek completion/replay/skip, pause, reduced motion, 390px overflow, mascot action states, and the home hero closed-eye alignment were checked in the browser. These checks do not certify the subsequently added meadow.

Current meadow verification: the development server compiled and returned HTTP 200. Live browser commands repeatedly timed out, while local process and file reads also slowed considerably. Meadow playback, ground alignment, mobile framing, pause/resume during travel, and a fresh production build remain pending. Do not describe those as visually verified.

Generated assets added during this continuation: public/cat/animated/cat-sleep.png; public/scenes/home-blink.png, lab-blink.png, about-blink.png, projects-blink.png; public/scenes/meadow.png. The sleep illustration was generated from the existing cat reference, requesting the same cream-and-gray identity curled asleep on transparency. Blink edits requested closed eyes while retaining each original scene. The meadow brief requested a wide watercolor grassy clearing, trees framing the edges, and an open path along the lower third, without animals. Original artwork remains available.

Latest focused validation: PostCSS parsed the current stylesheet successfully, and Next's SWC compiled AnimatedCat, Footer, HeroBlink, HideAndSeek, and MotionControls successfully. This validates syntax, not visual playback or the complete production build.

Production build (September 22, evening, after the latest AnimatedCat/globals.css/lab/data edits): `npm run build` passed — compiled in 55s, lint and type checks clean, all 8 routes prerendered as static. Browser verification (same evening, headless Chrome via puppeteer-core against `next start`): meadow walk right and back (7s, facing flips, destination kept, controls locked during travel), pause mid-walk freezes position and resume continues, stretch and nap/wake return to idle, paws sit on the path and the cat stays inside the stage at both ends, 1440px and 390px have no horizontal overflow, reduced motion disables walk/stretch and grass sway. Screenshots were inspected. Only remaining console noise is a 404 for /favicon.ico (no favicon yet). Note: a stray `next dev` left running on port 3100 overwrote `.next` and made `next start` 500 — don't run dev and start against the same folder at once.

The historical notes below describe the earlier pass; the status above supersedes their remaining-work and feature descriptions.

Implemented September 21, 2026.

- The sidebar and footer use the existing approved cat-idle-v3 body, tail and eyelid layers, copied into public/cat/animated. The tail rotates gently on a six-second cycle; the eyelids blink briefly within that cycle.
- Existing extracted scene illustrations remain intact. Home and Lab have positioned mug steam and lamp glow; every scene has a few subtle drifting light particles.
- Hero copy enters gently; section headings animate once on entering view. Button arrows move slightly on hover.
- Footer Pause motion control persists the user's choice. Scenes pause offscreen and animations pause while the document is hidden. Reduced-motion CSS disables decorative animation.
- No animation library or new dependency was added. No new portfolio entries were added. The deferred corgi footer copy was replaced with the cat.

Files: components/AnimatedCat.js, components/MotionControls.js, components/DeskScene.js, components/Sidebar.js, components/Footer.js, app/globals.css and public/cat/animated.

Verification: the live Next.js page rendered both layered cats, the scene wrapper and motion control. Screenshot confirmed the cat artwork renders correctly. Browser computed styles confirmed mascot-tail is running for the visible cat and paused for the offscreen cat. A screenshot exposed overlap between the floating chat control and the original motion-control placement; the motion control was moved beneath the footer cat.

Remaining verification: browser action commands repeatedly timed out, so pause/resume clicking, mobile regression checks and reduced-motion emulation could not be completed. The isolated production build was stopped during prolonged machine slowdown; the prior review build passed before these animation changes. Run npm run build and finish those browser checks when the system is responsive.

The painted cats inside hero scenes are still part of the flat artwork. This pass animates the separately layered mascot and the scene atmosphere; it does not claim to independently rig every painted scene cat.
