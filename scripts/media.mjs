import { Resvg } from '@resvg/resvg-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { appImage, navImage, escapeXml } from '../src/model.mjs';

// Original sample artwork: no user app list, third-party logos, or device mockup.
const apps = ['Browser', 'Editor', 'Mail', 'Notes', 'Music', 'Calendar'];
const colors = ['#5cb9ff', '#a594ff', '#ffb869', '#ffda79', '#ef85b6', '#80efb6'];
const decode = image => Buffer.from(image.split(',')[1], 'base64').toString().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const text = (x, y, value, size = 28, color = '#c5d0df') => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}">${escapeXml(value)}</text>`;

function keys({ active = 2, page = 1 } = {}) {
  return Array.from({ length: 8 }, (_, i) => {
    const name = apps[i];
    let artwork;
    if (i < 6) {
      const icon = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect x="8" y="8" width="80" height="80" rx="18" fill="${colors[i]}"/><path d="M28 31h40v8H28zm0 17h40v8H28zm0 17h25v8H28z" fill="#10151e"/></svg>`).render().asPng();
      artwork = decode(appImage({ pid: i + 1, name, icon: icon.toString('base64') }, active + 1));
    } else artwork = decode(navImage(i === 6 ? -1 : 1, i === 7 || page > 1));
    const title = i < 6 ? name : `${i === 6 ? 'Prev' : 'Next'} ${page}/3`;
    return `<g transform="translate(${1000 + (i % 4) * 194},${318 + Math.floor(i / 4) * 194}) scale(1.2)">${artwork}<text x="72" y="130" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="13">${title}</text></g>`;
  }).join('');
}

await mkdir('marketplace', { recursive: true });
const cards = [
  ['thumbnail', 'Open Apps', 'Your running Mac apps.', 'One press away.', 2, 1],
  ['gallery-1', 'Switch apps', 'Six live keys.', 'A green border marks your active app.', 0, 1],
  ['gallery-2', 'Browse more', 'More than six apps?', 'Use the arrows to move through the list.', 4, 2],
  ['gallery-3', 'Keep your pages', 'Add a navigator page', 'to your existing Stream Deck profile.', 2, 1]
];
for (const [file, title, line1, line2, active, page] of cards) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="960"><rect width="1920" height="960" fill="#10151e"/><rect x="920" y="210" width="900" height="575" rx="42" fill="#182231"/>${text(100, 178, 'OPEN APPS  /  macOS', 24, '#80efb6')}${text(100, 366, title, 68, '#ffffff')}${text(100, 453, line1, 32)}${text(100, 503, line2, 29)}${text(100, 744, 'For Stream Deck Neo', 24, '#80efb6')}${keys({ active, page })}${text(1000, 825, 'Illustrative keys with original sample app icons', 21, '#8d98aa')}</svg>`;
  await writeFile(`marketplace/${file}.svg`, svg);
  await writeFile(`marketplace/${file}.png`, new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
}
console.log('Created one thumbnail and three gallery PNGs at 1920 × 960.');
