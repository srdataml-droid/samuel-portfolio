/**
 * Repaints the 3D cat's 64x64 colour palette from an orange tabby to the
 * site cat: grey back fading to cream belly, soft pink nose, blue eyes.
 * Each 8x8 palette cell is recoloured to a target while keeping its own
 * light-to-dark gradient, so the model's shading bands survive.
 *   node scripts/recolor-3d-cat.mjs <source-palette.jpeg>
 */
import sharp from 'sharp';
const src = process.argv[2];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// [row, col] -> target colour. Rows run top to bottom, columns left to right.
const targets = {
  // body column pair: back (top) grey, flank light grey, belly cream
  '1,0': '#8f8a84', '1,1': '#8f8a84',
  '2,0': '#a8a29a', '2,1': '#a8a29a',
  '3,0': '#cfc8bc', '3,1': '#cfc8bc',
  '4,0': '#e8e0d2', '4,1': '#e8e0d2',
  '5,0': '#f2ece1', '6,0': '#f7f3eb',
  // nose and markings
  '3,2': '#7e7973', '4,2': '#7b7772', // tail tip: dark grey, like the painted tail
  // eyes
  '6,3': '#5b97c6',
  // ear detail and stripes: warm grey
  '0,5': '#d9a7a4', '1,5': '#d7a09a', '2,5': '#b2aba3', // inner ears and nose: soft pink
  // muzzle, chest and paws: warm white
  '1,6': '#ece8e2', '2,6': '#f4f0ea', '3,6': '#f6efe9', '5,6': '#8a857f', '6,6': '#9b958e',
};
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);
for (const [key, colour] of Object.entries(targets)) {
  const [row, col] = key.split(',').map(Number);
  const [tr, tg, tb] = hex(colour);
  let mean = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = ((row * 8 + y) * info.width + col * 8 + x) * 3; mean += (data[i] + data[i + 1] + data[i + 2]) / 3; }
  mean /= 64;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const i = ((row * 8 + y) * info.width + col * 8 + x) * 3;
    const k = ((data[i] + data[i + 1] + data[i + 2]) / 3) / Math.max(mean, 1); // keep the cell's own gradient
    out[i] = Math.min(255, tr * k); out[i + 1] = Math.min(255, tg * k); out[i + 2] = Math.min(255, tb * k);
  }
}
await sharp(out, { raw: info }).png().toFile('public/cat/3d/palette.png');
console.log('wrote public/cat/3d/palette.png');
