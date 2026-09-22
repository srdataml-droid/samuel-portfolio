# Cat and corgi: first scene

## Final fitting pass

The stage now scales at a 32:21 aspect ratio, with proportional character and book positions. Added a softer peek with a slight overshoot, gentle breathing, extra mobile footer clearance, and a Skip to the reveal control that remains usable when animation is paused. JSX compilation checks passed for HideAndSeek, AnimatedCat, MotionControls and Footer. Browser interaction verification remains blocked by repeated command timeouts; do not treat these checks as a completed visual or production-build test.

Open the portfolio footer and select **Play hide-and-seek**. A ten-second, finite scene sends the cat behind the foreground books, brings in a seated corgi, and lets the cat peek out again. Replay is available after completion. The existing Pause motion control pauses the story, and reduced-motion users get the final pose immediately. This is an introductory seated cameo, not a walking rig.

Implementation: components/HideAndSeek.js, components/Footer.js and the hide-and-seek styles at the end of app/globals.css. Existing layered cat assets are reused. No new portfolio work or voice service was added.

New artwork: public/cat/animated/corgi-sitting.png. Generated with the built-in image-generation tool, then copied into the project. Original retained under C:/Users/USER/.codex/generated_images/01a0c131-55aa-7c03-b2e8-bf6efa337a7b/exec-e799b2c8-a24b-46e2-8037-a561a70309e5.png.

Final generation prompt: “Create a single full-body sitting Welsh corgi illustration as a transparent PNG cutout for a cozy portfolio website. Warm tan and cream fur, upright ears, short legs, three-quarter view facing left and looking slightly upward. Refined naturalistic watercolor/gouache painting, soft fur detail. Actual transparent background, no scenery, floor, text, frame or watermark. Entire dog with generous transparent margins.”

Verification limitation: image generation succeeded on retry and the generated artwork was visually inspected. Live browser operations repeatedly timed out, preventing playback, mobile and click verification. The isolated production build was also slow and did not produce a successful result during this pass. Run npm run build and verify the ten-second scene, replay, pause/resume, reduced-motion and narrow-screen fit before treating this scene as finished QA.
