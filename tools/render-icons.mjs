// Build the app icon from KanjiVG stroke paths (font-independent) and rasterize
// to PNG for iOS home-screen / manifest use. Run: node tools/render-icons.mjs
// Regenerates icon.svg, icon-180.png, icon-512.png.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { KANJI_DATA } from '../data/kanji-data.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Draw 花 (hana / flower) — friendly and on-brand — as white centerlines on a
// green rounded square. Strokes are KanjiVG paths in a 109×109 space.
const glyph = KANJI_DATA.find((k) => k.kanji === '花');
const paths = glyph.strokes.map((d) => `<path d="${d}"/>`).join('');
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n` +
  `  <rect width="512" height="512" rx="96" fill="#4caf50"/>\n` +
  `  <g transform="translate(66,66) scale(3.486)" fill="none" stroke="#ffffff" ` +
  `stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g>\n` +
  `</svg>\n`;

await writeFile(here('../icon.svg'), svg, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}</style>` +
      `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" width="${size}" height="${size}">`
  );
  await page.screenshot({ path: here(`../icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('Wrote icon.svg, icon-180.png, icon-192.png, icon-512.png');
