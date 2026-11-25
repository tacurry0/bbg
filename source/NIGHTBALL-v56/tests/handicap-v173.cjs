// v173 regression: handicap matches (checker item handicap-match).
// Rule-level advantages only — head-start runs and asymmetric outs —
// with CPU abilities untouched. Regular versus matches only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'dist', f), 'utf8');
const app = read('app.js'), gameSrc = read('game.js');
const index = read('index.html'), sw = read('sw.js');

// ---------- engine ----------
global.window = global;
for (const f of ['ratings-data.js', 'players.js', 'pro-parks.js', 'pennant.js', 'game.js']) vm.runInThisContext(read(f), { filename: f });
const emit = () => {};
const match = opts => new NightGame('match', 'standard', emit, { innings: 3, ...opts });

// Gate: other modes and all-default settings get no handicap.
assert.equal(NightGame.normalizeHandicap('pennant', { handicap: { userRuns: 2 } }), null, 'pennant is gated out');
assert.equal(NightGame.normalizeHandicap('match', { remoteSide: 'away', handicap: { userRuns: 2 } }), null, 'online is gated out');
assert.equal(NightGame.normalizeHandicap('match', { umpire: true, handicap: { userRuns: 2 } }), null, 'umpire mode is gated out');
assert.equal(NightGame.normalizeHandicap('match', { handicap: { userRuns: 0, cpuRuns: 0, userOuts: 3, cpuOuts: 3 } }), null, 'all-default is no handicap');
assert.equal(NightGame.normalizeHandicap('match', {}), null, 'missing option is no handicap');
assert.deepEqual(NightGame.normalizeHandicap('match', { handicap: { userRuns: 9, cpuRuns: -2, userOuts: 4, cpuOuts: 2 } }),
  { userRuns: 3, cpuRuns: 0, userOuts: 4, cpuOuts: 2 }, 'values are clamped to the offered ranges');
assert.equal(match({}).handicap, null, 'a plain match has no handicap');

// Head-start runs land on the right sides for both home/away users.
let g = match({ userHome: true, handicap: { userRuns: 2, cpuRuns: 1 } });
assert.equal(g.homeScore, 2, 'user at home starts with their head-start runs');
assert.equal(g.awayScore, 1, 'CPU starts with its head-start runs');
g = match({ userHome: false, handicap: { userRuns: 2, cpuRuns: 1 } });
assert.equal(g.awayScore, 2, 'user away starts with their head-start runs');
assert.equal(g.homeScore, 1, 'CPU at home starts with its head-start runs');

// Asymmetric outs: the user's at-bat lasts 4 outs, the CPU's only 2.
g = match({ userHome: false, handicap: { userOuts: 4, cpuOuts: 2 } });
g.beginHalf(); // top: user bats
assert.equal(g.outsNeeded, 4, 'user half needs four outs');
g.addOut(); g.addOut(); g.addOut();
assert.notEqual(g.next, 'half', 'three outs do not end the user half');
g.addOut();
assert.equal(g.next, 'half', 'the fourth out ends the user half');
g.changeHalf(); g.beginHalf(); // bottom: CPU bats
assert.equal(g.outsNeeded, 2, 'CPU half needs two outs');
g.addOut();
assert.notEqual(g.next, 'half', 'one out does not end the CPU half');
g.addOut();
assert.equal(g.next, 'half', 'the second out ends the CPU half');
// And back again: the per-half value follows the batting side.
g.changeHalf(); g.beginHalf();
assert.equal(g.outsNeeded, 4, 'the next user half is back to four outs');

// Snapshot/restore: handicap kept, head starts not applied twice.
g = match({ userHome: true, handicap: { userRuns: 2, cpuRuns: 1, userOuts: 4, cpuOuts: 2 } });
const snap = JSON.parse(JSON.stringify(g.snapshot()));
const restored = NightGame.restore(snap, emit);
assert.deepEqual(restored.handicap, { userRuns: 2, cpuRuns: 1, userOuts: 4, cpuOuts: 2 }, 'handicap survives restore');
assert.equal(restored.homeScore, 2, 'head start is not doubled on restore (home)');
assert.equal(restored.awayScore, 1, 'head start is not doubled on restore (away)');
const oldSnap = JSON.parse(JSON.stringify(match({}).snapshot()));
delete oldSnap.state.handicap;
assert.equal(NightGame.restore(oldSnap, emit).handicap, null, 'old saves restore with no handicap');

// A full game completes under a handicap and keeps the head starts.
g = match({ userHome: true, innings: 3, handicap: { userRuns: 1, cpuRuns: 0, userOuts: 4, cpuOuts: 2 } });
g.beginHalf();
let guard = 0;
while (g.phase !== 'ended' && guard++ < 600) {
  g.addOut(); g.endAtBat('groundout'); g.resetCount();
  if (g.next === 'half') { g.changeHalf(); if (g.phase !== 'ended') g.beginHalf(); }
}
assert.equal(g.phase, 'ended', 'a handicapped game completes');
assert(g.homeScore >= 1, 'the user head start is still on the final score');

// ---------- static: app wiring ----------
assert(gameSrc.includes('static normalizeHandicap(mode,options={})'), 'engine gate exists');
assert(app.includes('handicapUserRuns:0,handicapCpuRuns:0,handicapUserOuts:3,handicapCpuOuts:3'), 'settings defaults exist');
assert(app.includes('data-handicap="userRuns:') && app.includes('data-handicap="cpuOuts:'), 'setup offers the handicap controls');
assert(app.includes("if(b.dataset.handicap){"), 'handicap clicks are handled');
assert(app.includes('handicap:mode===\'match\'&&!challengeId') && app.includes('userRuns:settings.handicapUserRuns'), 'match start passes the handicap with the challenge-mode gates');

// ---------- version pins (v173) ----------
assert(index.includes('./game.js?v=174') && index.includes('./app.js?v=174'), 'index pins at v173');
assert(sw.includes('nightball-v174-back-nav'), 'SW cache renamed for v173');
assert(sw.includes('./game.js?v=174') && sw.includes('./app.js?v=174'), 'SW precaches the v173 assets');

console.log('handicap-v173: engine + static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('handicap-v173: playwright unavailable — browser checks skipped, engine/static assertions passed'); return; }
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff': 'font/woff' };
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(u.pathname) === '/' ? '/index.html' : decodeURIComponent(u.pathname);
    const f = resolve(dir, '.' + name);
    if (!f.startsWith(dir + sep)) { res.writeHead(403); res.end(); return; }
    try { const data = await readFile(f); res.writeHead(200, { 'Content-Type': mime[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('nightball.settings', JSON.stringify({ handicapUserRuns: 2, handicapUserOuts: 4 })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      const { StadiumRenderer } = await import('./stadium3d.js?v=78');
      const render = StadiumRenderer.prototype.render;
      StadiumRenderer.prototype.render = function (game, time) { if (game) window.__hcTest = { game }; return render.call(this, game, time); };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    // The handicap section is offered in match setup, with the seeded values active.
    const setup = await page.evaluate(() => ({
      buttons: document.querySelectorAll('#modal-content [data-handicap]').length,
      active: [...document.querySelectorAll('#modal-content [data-handicap].active')].map(b => b.dataset.handicap),
    }));
    assert(setup.buttons >= 12, `handicap controls are rendered (${setup.buttons})`);
    assert(setup.active.includes('userRuns:2') && setup.active.includes('userOuts:4'), `seeded handicap values are active (${setup.active.join(',')})`);
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__hcTest?.game, null, { timeout: 30000 });
    const state = await page.evaluate(() => { const g = window.__hcTest.game; return { handicap: g.handicap, homeScore: g.homeScore, awayScore: g.awayScore }; });
    assert.deepEqual(state.handicap, { userRuns: 2, cpuRuns: 0, userOuts: 4, cpuOuts: 3 }, 'the started match carries the chosen handicap');
    assert.equal(state.homeScore, 2, 'the user head start is on the scoreboard from the first pitch');
    assert.equal(state.awayScore, 0, 'the CPU has no head start');
    assert.deepEqual(errors, [], 'no page errors during the handicap flow');
    console.log('handicap-v173: browser checks passed (setup controls + head start applied at match start)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('handicap-v173 FAILED:', e.message); process.exit(1); });
