// v176 regression: pitch deck redesign, second pass. v175's compass
// panel (272x248px) was rejected on real devices: too big, and its
// frame crowded the strike zone. v176 is a flat, aligned 2-column
// grid of identical chips (badge + name / speed + break level) on a
// quieter panel: at most 244px wide, ~104px tall with 4 pitches and
// ~150px with the roster-worst 5, never overlapping the strike-zone
// frame in the pitching aim state. No information from the old deck
// (name / speed / break amount) may be lost, chips must not overlap
// each other, and the selected / disabled states stay legible.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const hud = fs.readFileSync(path.join(root, 'dist', 'game-hud.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(hud.includes('Pitch deck redesign (v176)'), 'v176 deck block exists');
assert(hud.includes('grid-template-columns:1fr 1fr'), 'the deck is a flat 2-column grid');
assert(hud.includes('width:min(244px,76%)'), 'the panel is capped at 244px wide');
assert(hud.includes('min-height:40px;height:40px'), 'chips are a uniform 40px tall');
assert(hud.includes('.pitch-deck .pitch-type.active') && hud.includes('#e9f9c3'), 'selected chip is a filled lime pill');
assert(hud.includes('.pitch-deck .pitch-type:disabled{opacity:.35'), 'unavailable chips dim out');
assert(app.includes('flatMap') && app.includes('pt-row') && app.includes('pt-meta') && app.includes('変化${level}'), 'chip markup carries name, speed slot and break-level pill');
assert(!app.includes('pitch-ball') && !app.includes('pitch-direction'), 'the compass scaffolding and centre ball are gone');
assert(index.includes('./game.js?v=176') && index.includes('./app.js?v=176'), 'index pins at v176');
assert(index.includes('./game-hud.css?v=82'), 'game-hud pin bumped for the redesign');
assert(sw.includes('nightball-v176-smart-deck'), 'SW cache renamed for v176');

console.log('pitch-deck-v176: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('pitch-deck-v176: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      const { StadiumRenderer } = await import('./stadium3d.js?v=78');
      const render = StadiumRenderer.prototype.render;
      StadiumRenderer.prototype.render = function (game, time) { if (game) { window.__deckGame = game; window.__deckRenderer = this; } return render.call(this, game, time); };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__deckGame, null, { timeout: 30000 });
    // The sandbox renders only a few frames per second; fast-forward the
    // opening intro the same way the engine does when its timer elapses.
    await page.evaluate(() => { window.__deckGame.phaseTime = 5000; });
    await page.waitForFunction(() => {
      const d = document.getElementById('pitch-deck');
      return d && !d.hidden && document.querySelectorAll('[data-pitch]').length >= 3;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(500);

    const measure = () => page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
      const deck = rect(document.getElementById('pitch-deck'));
      const btns = [...document.querySelectorAll('[data-pitch]')].map(b => ({
        pitch: b.dataset.pitch, ...rect(b),
        speed: b.querySelector('small')?.textContent || '',
        level: b.querySelector('em')?.textContent || '',
        name: b.querySelector('.pt-name')?.textContent || '',
      }));
      const others = {};
      for (const sel of ['#atbat-chart', '#abs-challenge']) {
        const el = document.querySelector(sel);
        if (el && !el.hidden && el.getBoundingClientRect().width > 0) others[sel] = rect(el);
      }
      let zone = null;
      const R = window.__deckRenderer;
      if (R && typeof R.aimPoint === 'function' && R.hud) {
        const hud = R.hud.getBoundingClientRect();
        const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => R.aimPoint(x, y));
        zone = {
          x: hud.x + Math.min(...cs.map(p => p.x)), y: hud.y + Math.min(...cs.map(p => p.y)),
          right: hud.x + Math.max(...cs.map(p => p.x)), bottom: hud.y + Math.max(...cs.map(p => p.y)),
        };
        zone.w = zone.right - zone.x; zone.h = zone.bottom - zone.y;
      }
      return { deck, btns, others, zone };
    });
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    const checkLayout = (layout, label) => {
      assert(layout.deck.w <= 250, `${label}: deck is at most 250px wide (got ${layout.deck.w})`);
      assert(layout.deck.h <= 155, `${label}: deck is at most 155px tall (got ${layout.deck.h})`);
      assert(layout.deck.w * layout.deck.h <= 40000, `${label}: deck area shrinks vs v175's 67456px^2 (got ${Math.round(layout.deck.w * layout.deck.h)})`);
      for (const b of layout.btns) {
        assert(b.h >= 39 && b.h <= 41, `${label}: ${b.pitch} chip is a uniform ~40px tall (got ${b.h})`);
        assert(b.name.length > 0, `${label}: ${b.pitch} chip shows its name`);
        assert(/^\d+km\/h$/.test(b.speed), `${label}: ${b.pitch} chip shows its speed (got "${b.speed}")`);
        if (b.pitch !== 'fast') assert(/^変化[1-7]$/.test(b.level), `${label}: ${b.pitch} chip shows its break level (got "${b.level}")`);
      }
      for (let i = 0; i < layout.btns.length; i++) for (let j = i + 1; j < layout.btns.length; j++)
        assert(overlap(layout.btns[i], layout.btns[j]) <= 2, `${label}: ${layout.btns[i].pitch} and ${layout.btns[j].pitch} chips do not overlap`);
      for (const [sel, r] of Object.entries(layout.others))
        assert(overlap(layout.deck, r) <= 2, `${label}: the deck does not overlap ${sel}`);
      if (layout.zone) {
        assert(overlap(layout.deck, layout.zone) === 0, `${label}: the deck frame never overlaps the strike zone (deck bottom ${layout.deck.bottom.toFixed(1)}, zone top ${layout.zone.y.toFixed(1)})`);
        assert(layout.zone.y - layout.deck.bottom >= 30, `${label}: at least 30px clearance above the strike zone (got ${(layout.zone.y - layout.deck.bottom).toFixed(1)})`);
      } else console.log(`pitch-deck-v176: ${label}: strike-zone projection unavailable in this environment — zone check skipped`);
      return layout;
    };

    const layout = checkLayout(await measure(), 'default repertoire');
    console.log(`pitch-deck-v176: default deck ${layout.deck.w}x${layout.deck.h}px, zone clearance ${layout.zone ? (layout.zone.y - layout.deck.bottom).toFixed(1) + 'px' : 'n/a'}`);

    // Worst case across all rosters: 5 pitch types (fast + 4 breaking).
    await page.evaluate(() => {
      const g = window.__deckGame;
      g.pitcher.pitches = ['fast', 'sinker', 'slider', 'curve', 'change'];
      document.getElementById('pitch-types').dataset.key = '';
    });
    await page.locator('[data-pitch="fast"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-pitch]').length >= 5, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    const worst = checkLayout(await measure(), 'worst-case repertoire (5 pitches)');
    console.log(`pitch-deck-v176: worst-case deck ${worst.deck.w}x${worst.deck.h}px, zone clearance ${worst.zone ? (worst.zone.y - worst.deck.bottom).toFixed(1) + 'px' : 'n/a'}`);

    // Selected state: clicking a chip fills it (lime) unlike the others.
    await page.locator('[data-pitch="slider"]').first().click();
    await page.waitForTimeout(350);
    const states = await page.evaluate(() => {
      const read = sel => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return { active: el.classList.contains('active'), bg: cs.backgroundImage || cs.backgroundColor, opacity: cs.opacity }; };
      const slider = read('[data-pitch="slider"]');
      const curve = read('[data-pitch="curve"]');
      const fastEl = document.querySelector('[data-pitch="fast"]');
      fastEl.disabled = true;
      const disabledOpacity = getComputedStyle(fastEl).opacity;
      return { slider, curve, disabledOpacity };
    });
    assert(states.slider.active && states.slider.bg !== states.curve.bg, 'the selected chip is visually distinct');
    assert(Number(states.disabledOpacity) <= 0.5, `a disabled chip dims out (opacity ${states.disabledOpacity})`);
    assert.deepEqual(errors, [], 'no page errors during the deck flow');
    console.log('pitch-deck-v176: browser checks passed (compact grid, info intact, no chip/deck/zone overlaps)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('pitch-deck-v176 FAILED:', e.message); process.exit(1); });
