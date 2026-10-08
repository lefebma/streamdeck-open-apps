import { build } from 'esbuild';
import { mkdir, writeFile, unlink, readFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const plugin = 'com.marclefebvre.openapps.sdPlugin';
execFileSync('python3', ['scripts/profile.py'], { stdio: 'inherit' });
await mkdir(`${plugin}/bin`, { recursive: true });
await mkdir(`${plugin}/imgs`, { recursive: true });
await build({ entryPoints: ['src/plugin.ts'], outfile: `${plugin}/bin/plugin.js`, bundle: true, platform: 'node', target: 'node20', format: 'esm', banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' } });
// Build both macOS architectures so one installer works on Intel and Apple Silicon.
for (const architecture of ['arm64', 'x86_64']) {
  execFileSync('swiftc', ['-swift-version', '5', '-parse-as-library', '-O', '-target', `${architecture}-apple-macosx12.0`, '-module-cache-path', `/private/tmp/open-apps-swift-cache-${architecture}`, 'native/OpenApps.swift', '-o', `${plugin}/bin/helper-${architecture}`], { stdio: 'inherit' });
}
execFileSync('lipo', ['-create', `${plugin}/bin/helper-arm64`, `${plugin}/bin/helper-x86_64`, '-output', `${plugin}/bin/open-apps-helper`]);
execFileSync('codesign', ['--force', '--sign', '-', `${plugin}/bin/open-apps-helper`]);
await unlink(`${plugin}/bin/helper-arm64`);
await unlink(`${plugin}/bin/helper-x86_64`);
// Stream Deck recognizes vector assets; no generated bitmap assets required.
const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#10151e"/>${body}</svg>`;
const grid = [30, 78].flatMap(x => [30, 78].map(y => `<rect x="${x}" y="${y}" width="36" height="36" rx="7" fill="#80efb6"/>`)).join('');
await writeFile(`${plugin}/imgs/logo.svg`, wrap(grid));
await unlink(`${plugin}/imgs/plugin.svg`).catch(error => { if (error.code !== 'ENOENT') throw error; });
// The plugin-list icon must be PNG; encode our original geometric icon locally.
const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const payload = Buffer.concat([Buffer.from(type), data]);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([size, payload, crc]);
};
for (const [size, destination] of [[256, `${plugin}/imgs/plugin.png`], [512, `${plugin}/imgs/plugin@2x.png`], [288, 'marketplace/app-icon.png']]) {
  const stride = size * 4 + 1;
  const pixels = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x * 144 / size, v = y * 144 / size;
    const square = [30, 78].some(left => u >= left && u < left + 36)
      && [30, 78].some(top => v >= top && v < top + 36);
    pixels.set(square ? [128, 239, 182, 255] : [16, 21, 30, 255], y * stride + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  await mkdir('marketplace', { recursive: true });
  await writeFile(destination, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]));
}
const listIcon = body => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 144 144">${body}</svg>`;
const outlineGrid = [30, 78].flatMap(x => [30, 78].map(y => `<rect x="${x}" y="${y}" width="36" height="36" rx="7" fill="none" stroke="#FFFFFF" stroke-width="9"/>`)).join('');
await writeFile(`${plugin}/imgs/logo.svg`, listIcon(outlineGrid));
await writeFile(`${plugin}/imgs/action-apps.svg`, listIcon(outlineGrid));
for (const [name, points] of [['previous', '88 35 51 72 88 109'], ['next', '56 35 93 72 56 109']]) {
  await writeFile(`${plugin}/imgs/action-${name}.svg`, listIcon(`<polyline points="${points}" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`));
}
await writeFile(`${plugin}/imgs/key.svg`, wrap(grid));
for (const [name, points] of [['previous', '88 35 51 72 88 109'], ['next', '56 35 93 72 56 109']]) {
  await writeFile(`${plugin}/imgs/${name}.svg`, wrap(`<polyline points="${points}" fill="none" stroke="#80efb6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`));
}

await copyFile('LICENSE', `${plugin}/LICENSE`);
const thirdParty = [];
for (const dependency of ['@elgato/streamdeck', '@elgato/utils', '@elgato/schemas', 'ws', '@elgato/streamdeck/node_modules/ws']) {
  const path = `node_modules/${dependency}`;
  try {
    const metadata = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));
    thirdParty.push(`${metadata.name} ${metadata.version}\n\n${(await readFile(`${path}/LICENSE`, 'utf8')).replace(/\r\n/g, '\n')}`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await writeFile(`${plugin}/THIRD-PARTY-NOTICES.txt`, thirdParty.join('\n\n----------------------------------------\n\n'));
