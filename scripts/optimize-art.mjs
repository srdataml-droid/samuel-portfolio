/**
 * One-off asset pass. Re-run after replacing any source artwork:
 *   node scripts/optimize-art.mjs
 *
 * 1. Cuts the closed-eye "blink" scenes down to just the eye region that
 *    HeroBlink actually reveals, and prints the viewBox rect to paste into
 *    components/HeroBlink.js. The full-size blink PNGs stay as source art.
 * 2. Re-encodes the footer artwork that is served as a plain <img> (no
 *    next/image optimisation) as WebP.
 */
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const MARGIN = 8; // viewBox units of padding around the eye ellipses

// Mirrors the geometry in components/HeroBlink.js.
const scenes = {
  home:     { width: 760, height: 316, eyes: [[260,109,23,15],[303,117,23,15]] },
  lab:      { width: 748, height: 316, eyes: [[314,108,26,17],[374,114,26,17]] },
  about:    { width: 680, height: 318, eyes: [[297,182,17,13],[334,193,17,13]] },
  projects: { width: 748, height: 194, eyes: [[150,5,19,13],[193,23,20,14]], offset: -28, imageHeight: 249 },
};

const kb = async (file) => `${Math.round((await stat(file)).size / 1024)} KB`;

for (const [name, s] of Object.entries(scenes)) {
  const src = `public/scenes/${name}-blink.png`;
  const out = `public/scenes/${name}-eyes.webp`;
  const meta = await sharp(src).metadata();
  const drawnH = s.imageHeight ?? s.height;
  const offset = s.offset ?? 0;

  // Bounding box of the ellipses in viewBox units.
  const x0 = Math.min(...s.eyes.map(([cx,,rx]) => cx - rx)) - MARGIN;
  const x1 = Math.max(...s.eyes.map(([cx,,rx]) => cx + rx)) + MARGIN;
  const y0 = Math.min(...s.eyes.map(([,cy,,ry]) => cy - ry)) - MARGIN;
  const y1 = Math.max(...s.eyes.map(([,cy,,ry]) => cy + ry)) + MARGIN;

  // Same box in source pixels, snapped outwards to whole pixels.
  const sx = meta.width / s.width, sy = meta.height / drawnH;
  const left = Math.max(0, Math.floor(x0 * sx));
  const top = Math.max(0, Math.floor((y0 - offset) * sy));
  const right = Math.min(meta.width, Math.ceil(x1 * sx));
  const bottom = Math.min(meta.height, Math.ceil((y1 - offset) * sy));

  await sharp(src)
    .extract({ left, top, width: right - left, height: bottom - top })
    .webp({ quality: 90 })
    .toFile(out);

  // The exact viewBox rect the crop now covers, so the patch lands where the full image did.
  const rect = {
    x: +(left / sx).toFixed(2),
    y: +(top / sy + offset).toFixed(2),
    width: +((right - left) / sx).toFixed(2),
    height: +((bottom - top) / sy).toFixed(2),
  };
  console.log(`${name}: ${await kb(src)} -> ${await kb(out)}  patch: ${JSON.stringify(rect)}`);

  // The open eyes, cut from the base painting (drawn 1:1 with the viewBox), for eye tracking.
  const baseSrc = `public/scenes/${name}.png`;
  const baseOut = `public/scenes/${name}-eyes-open.webp`;
  const bm = await sharp(baseSrc).metadata();
  const oL = Math.max(0, Math.floor(x0)), oT = Math.max(0, Math.floor(y0));
  const oR = Math.min(bm.width, Math.ceil(x1)), oB = Math.min(bm.height, Math.ceil(y1));
  await sharp(baseSrc).extract({ left: oL, top: oT, width: oR - oL, height: oB - oT }).webp({ quality: 92 }).toFile(baseOut);
  console.log(`${name}: open eyes ${await kb(baseOut)}  look: ${JSON.stringify({ x: oL, y: oT, width: oR - oL, height: oB - oT })}`);
}

for (const [src, opts] of [
  ['public/scenes/meadow.png', { quality: 82 }],
  ['public/cat/animated/corgi-sitting.png', { quality: 85, alphaQuality: 90 }],
  ['public/cat/animated/cat-sleep.png', { quality: 85, alphaQuality: 90 }],
]) {
  const out = src.replace(/\.png$/, '.webp');
  await sharp(src).webp(opts).toFile(out);
  console.log(`${src}: ${await kb(src)} -> ${await kb(out)}`);
}
