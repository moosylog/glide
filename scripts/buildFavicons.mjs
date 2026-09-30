// scripts/buildFavicons.mjs — regenerates every favicon/icon file from the one source of truth,
// assets/favicon.svg (the orange "G" monogram). Run this after editing that file; nothing else
// in the repo should be hand-edited to change the icon.
//
// Outputs, all at the repo root except the PNGs used by the explicit <link> tags in glide.html:
//   favicon.ico            — classic multi-size (16/32/48) .ico, the one every browser/OS still
//                             falls back to by convention even with no <link rel="icon"> at all
//   apple-touch-icon.png    — 180x180, what iOS/iPadOS uses for a home-screen/bookmark icon
//   assets/favicon-32x32.png, assets/favicon-16x16.png — explicit PNG fallbacks for browsers
//                             that don't yet support SVG favicons
//
// assets/favicon.svg itself ships as-is (no build step needed for browsers that DO support SVG
// favicons — modern Firefox/Chrome/Safari).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(repoRoot, 'assets', 'favicon.svg');
const svg = readFileSync(svgPath);

const renderPng = (size) => sharp(svg).resize(size, size).png().toBuffer();

const [ico16, ico32, ico48, png32, png16, touch180] = await Promise.all([
    renderPng(16), renderPng(32), renderPng(48), renderPng(32), renderPng(16), renderPng(180),
]);

const ico = await pngToIco([ico16, ico32, ico48]);
writeFileSync(join(repoRoot, 'favicon.ico'), ico);
writeFileSync(join(repoRoot, 'apple-touch-icon.png'), touch180);
writeFileSync(join(repoRoot, 'assets', 'favicon-32x32.png'), png32);
writeFileSync(join(repoRoot, 'assets', 'favicon-16x16.png'), png16);

console.log('Regenerated favicon.ico, apple-touch-icon.png, and assets/favicon-{16,32}x{16,32}.png from assets/favicon.svg.');
