// Release version management for the NIGHTBALL dist build.
//
// The release version lives in ../VERSION and identifies a release through
// the files that define the app's behaviour: the `?v=` queries of app.js
// and game.js in dist/index.html and dist/sw.js, plus the Service Worker
// cache name (`nightball-v<n>-...`). Running this script moves all of them
// together, so a release can never ship with the core files at mixed
// versions again.
//
// Every OTHER file keeps its own per-file `?v=` on purpose and is NOT
// touched here:
//   - pwa-update.js / pwa-update.css: the update checker must stay
//     reachable under a stable URL (pinned by tests/pwa-update.cjs).
//   - kbo-data.js, kbo-rosters.js, npb-data.js, npb-rosters.js: versioned
//     by the data build workflows (pinned by their tests).
//   - stadium-premium.js, menu-polish.css, stadium-fx.js, venue-vision.js,
//     open-air-parks.js, abs-review.js and similar: pinned by the
//     graphics / premium browser tests.
//
// Usage:
//   node tools/bump-version.mjs        bump VERSION by one and apply it
//   node tools/bump-version.mjs 96     set VERSION to 96 and apply it
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = join(root, 'VERSION');
const current = Number(readFileSync(versionFile, 'utf8').trim());
if (!Number.isInteger(current) || current < 1) throw new Error('VERSION must be a positive integer');

const target = process.argv[2] === undefined ? current + 1 : Number(process.argv[2]);
if (!Number.isInteger(target) || target < 1) throw new Error('Target version must be a positive integer');

for (const rel of ['dist/index.html', 'dist/sw.js']) {
  const path = join(root, rel);
  const before = readFileSync(path, 'utf8');
  const after = before
    .replace(/app\.js\?v=\d+/g, `app.js?v=${target}`)
    .replace(/game\.js\?v=\d+/g, `game.js?v=${target}`)
    .replace(/nightball-v\d+/g, `nightball-v${target}`);
  if (after !== before) writeFileSync(path, after);
  console.log(`${rel}: core files at ?v=${target}`);
}
writeFileSync(versionFile, `${target}\n`);
console.log(`VERSION -> ${target}`);
