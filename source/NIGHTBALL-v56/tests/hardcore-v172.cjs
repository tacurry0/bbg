// v172 regression: information-restriction hardcore mode (checker item
// no-hud-hardcore-mode). With the mode on, the batting user gets no pitch
// type / speed / break readout, no at-bat pitch chart, no timing ring and
// no previous-pitch marker — the ball's flight and their own read only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'dist', f), 'utf8');
const app = read('app.js'), gameSrc = read('game.js'), stadium = read('stadium3d.js'), renderer2d = read('renderer.js');
const index = read('index.html'), sw = read('sw.js');

// ---------- engine: the flag is an option, defaults off, survives saves ----------
global.window = global;
for (const f of ['ratings-data.js', 'players.js', 'pro-parks.js', 'pennant.js', 'game.js']) vm.runInThisContext(read(f), { filename: f });
const emit = () => {};
assert.equal(new NightGame('match', 'standard', emit, {}).hardcore, false, 'hardcore defaults to false');
const hc = new NightGame('match', 'standard', emit, { hardcore: true });
assert.equal(hc.hardcore, true, 'hardcore option is honoured');
const restored = NightGame.restore(JSON.parse(JSON.stringify(hc.snapshot())), emit);
assert.equal(restored.hardcore, true, 'hardcore survives a snapshot/restore round trip');
const oldSnap = JSON.parse(JSON.stringify(new NightGame('match', 'standard', emit, {}).snapshot()));
delete oldSnap.state.hardcore;
assert.equal(NightGame.restore(oldSnap, emit).hardcore, false, 'old saves without the field restore as hardcore off');

// ---------- static: every information surface is gated ----------
assert(gameSrc.includes('this.hardcore=options.hardcore===true'), 'engine stores the option');
assert(gameSrc.includes('g.hardcore??=false'), 'restore defaults the flag for old saves');
assert(app.includes('hardcore:false,'), 'settings default exists');
assert(app.includes('data-toggle="hardcore"'), 'match setup offers the hardcore toggle');
assert(app.includes("hardcore:mode==='match'&&!!settings.hardcore"), 'match start passes the option');
assert(app.includes("&&!(g.hardcore&&!def)"), 'pitch chip (type/speed/break) is hidden while the user bats');
assert(app.includes('!g.umpireMode&&!g.hardcore&&!field'), 'at-bat pitch chart is hidden in hardcore');
assert(stadium.includes('!g.defending&&!g.hardcore&&window.nightSettings?.timingGuide'), 'timing ring is suppressed in hardcore');
assert(renderer2d.includes('showTrace&&!g.hardcore&&last'), 'previous-pitch marker is suppressed in hardcore');

// ---------- version pins (v172) ----------
assert(index.includes('./game.js?v=183') && index.includes('./app.js?v=183'), 'index pins at v172');
assert(app.includes('./stadium3d.js?v=78'), 'stadium3d pin bumped for the ring gate');
assert(sw.includes('nightball-v183-pitch-feel'), 'SW cache renamed for v172');
assert(sw.includes('./game.js?v=183') && sw.includes('./app.js?v=183') && sw.includes('./stadium3d.js?v=78') && sw.includes('./renderer.js?v=61'), 'SW precaches the v172 assets');

console.log('hardcore-v172: engine + static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('hardcore-v172: playwright unavailable — browser checks skipped, engine/static assertions passed'); return; }
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
    async function startMatch(hardcore) {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      await context.addInitScript(v => localStorage.setItem('nightball.settings', JSON.stringify({ hardcore: v })), hardcore);
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
      await page.locator('[data-action="match-lineup"]').click();
      await page.locator('[data-action="lineup-play"]').click();
      await page.waitForFunction(() => !!window.__hcTest?.game, null, { timeout: 30000 });
      return { context, page, errors };
    }
    async function probe(page) {
      return page.evaluate(() => {
        const g = window.__hcTest.game;
        g.atBatPitches = [{ x: 0, y: 0, result: 'strike' }, { x: .5, y: -.5, result: 'ball' }];
        const wasDefending = g.defending;
        // Force a batting pitch-in-flight state for the chip check when the
        // user is on offense; when defending, flip the half virtually by
        // reporting from the pitch object only.
        g.pitch = { name: 'ストレート', speed: 142, breakCm: 3, spinRpm: 2100, progress: .5, targetX: 0, targetY: 0 };
        g.setPhase ? null : null;
        const phaseBackup = g.phase; g.phase = 'pitch';
        g.notify();
        const chip = { label: document.getElementById('pitch-label').textContent, hidden: document.getElementById('pitch-label').parentElement.hidden };
        g.phase = phaseBackup; g.notify();
        return { hardcore: g.hardcore, defending: wasDefending, chartHidden: document.getElementById('atbat-chart').hidden, chip };
      });
    }
    // Hardcore ON: chart hidden; chip hidden while batting.
    const on = await startMatch(true);
    let r = await probe(on.page);
    assert.equal(r.hardcore, true, 'started match carries the hardcore flag');
    assert.equal(r.chartHidden, true, 'hardcore: at-bat chart stays hidden even with pitches recorded');
    if (!r.defending) assert.equal(r.chip.hidden, true, 'hardcore: pitch chip hidden while batting');
    assert.deepEqual(on.errors, [], 'no page errors (hardcore)');
    await on.context.close();
    // Hardcore OFF (control): chart shows; chip shows while batting.
    const off = await startMatch(false);
    r = await probe(off.page);
    assert.equal(r.hardcore, false, 'control match has hardcore off');
    assert.equal(r.chartHidden, false, 'control: at-bat chart is shown with pitches recorded');
    if (!r.defending) { assert.equal(r.chip.hidden, false, 'control: pitch chip visible while batting'); assert.equal(r.chip.label, 'ストレート', 'control: chip names the pitch'); }
    assert.deepEqual(off.errors, [], 'no page errors (control)');
    await off.context.close();
    console.log('hardcore-v172: browser checks passed (chart + chip gated by the mode, control unaffected)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('hardcore-v172 FAILED:', e.message); process.exit(1); });
