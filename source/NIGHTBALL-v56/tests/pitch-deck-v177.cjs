// v177 regression: pitch deck as a Power Pro / ProSpi style pitch
// chart. v176's flat grid was compact but hid where each pitch
// breaks; v177 puts the fastball badge at the origin of a small
// chart and every breaking badge in its true break direction
// (engine screen direction: +bx is screen-right for a right-handed
// pitcher, mirrored for left-handers, +by is down) at a distance
// proportional to the break amount, with an SVG guide arrow from
// the origin and an in-badge arrow rotated to the exact break
// angle. The panel stays compact (244x166px at 393x852 for real
// repertoires) and never overlaps the strike zone. Name / speed /
// break level stay visible in a label beside each badge, and every
// badge keeps an effective tap height of at least 44px.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const hud = fs.readFileSync(path.join(root, 'dist', 'game-hud.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(hud.includes('Pitch deck redesign (v177)'), 'v177 deck block exists');
assert(hud.includes('.pitch-chart-guides'), 'the chart guide layer is styled');
assert(hud.includes('width:min(244px,76%)'), 'the panel is capped at 244px wide');
assert(hud.includes('width:36px;height:36px'), 'badges are uniform 36px circles');
assert(app.includes('pitch-chart-guides') && app.includes('pd-arrow'), 'guide arrows are rendered per pitch');
assert(app.includes('pt-arrow') && app.includes('pt-label') && app.includes('変化${b.level}'), 'badge markup carries arrow, name label and break-level pill');
assert(!app.includes('pitch-ball') && !app.includes('pitch-direction'), 'the compass scaffolding stays gone');
assert(index.includes('./game.js?v=177') && index.includes('./app.js?v=177'), 'index pins at v177');
assert(index.includes('./game-hud.css?v=83'), 'game-hud pin bumped for the redesign');
assert(sw.includes('nightball-v177-pitch-chart'), 'SW cache renamed for v177');

console.log('pitch-deck-v177: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('pitch-deck-v177: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
    await page.evaluate(() => { window.__deckGame.phaseTime = 5000; });
    await page.waitForFunction(() => {
      const d = document.getElementById('pitch-deck');
      return d && !d.hidden && document.querySelectorAll('[data-pitch]').length >= 3;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(500);

    const measure = () => page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
      const deck = rect(document.getElementById('pitch-deck'));
      const btns = [...document.querySelectorAll('[data-pitch]')].map(b => ({
        pitch: b.dataset.pitch, ...rect(b),
        speed: b.querySelector('small')?.textContent || '',
        level: b.querySelector('em')?.textContent || '',
        name: b.querySelector('.pt-name')?.textContent || '',
        arrow: b.querySelector('.pt-arrow')?.style.transform || '',
      }));
      let zone = null;
      const R = window.__deckRenderer;
      if (R && typeof R.aimPoint === 'function' && R.hud) {
        const hud = R.hud.getBoundingClientRect();
        const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => R.aimPoint(x, y));
        zone = { x: hud.x + Math.min(...cs.map(p => p.x)), y: hud.y + Math.min(...cs.map(p => p.y)), right: hud.x + Math.max(...cs.map(p => p.x)), bottom: hud.y + Math.max(...cs.map(p => p.y)) };
      }
      const guides = document.querySelectorAll('.pitch-chart-guides line[marker-end]').length;
      return { deck, btns, zone, guides };
    });
    const hitHeight = pitch => page.evaluate(pitch => {
      const el = document.querySelector(`[data-pitch="${pitch}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hits = y => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
      if (!hits(cy)) return 0;
      let top = cy, bottom = cy;
      while (top > r.top - 30 && hits(top - 1)) top--;
      while (bottom < r.bottom + 30 && hits(bottom + 1)) bottom++;
      return bottom - top;
    }, pitch);
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    const byPitch = (btns, id) => btns.find(b => b.pitch === id);

    const checkCommon = async (layout, label) => {
      assert(layout.deck.w <= 250, `${label}: deck is at most 250px wide (got ${layout.deck.w})`);
      assert(layout.deck.h <= 172, `${label}: deck is at most 172px tall (got ${layout.deck.h})`);
      assert(layout.guides >= layout.btns.length - 1, `${label}: one guide arrow per breaking pitch (${layout.guides})`);
      for (const b of layout.btns) {
        assert(b.w >= 34 && b.w <= 38 && b.h >= 34 && b.h <= 38, `${label}: ${b.pitch} badge is a ~36px circle (got ${b.w}x${b.h})`);
        assert(b.name.length > 0, `${label}: ${b.pitch} label shows its name`);
        assert(/^\d+km\/h$/.test(b.speed), `${label}: ${b.pitch} label shows its speed (got "${b.speed}")`);
        if (b.pitch !== 'fast') assert(/^変化[1-7]$/.test(b.level), `${label}: ${b.pitch} label shows its break level (got "${b.level}")`);
        assert(/rotate\(-?\d+deg\)/.test(b.arrow), `${label}: ${b.pitch} badge carries a rotated direction arrow (got "${b.arrow}")`);
        const hit = await hitHeight(b.pitch);
        assert(hit >= 44, `${label}: ${b.pitch} effective tap height >= 44px (got ${hit})`);
      }
      // Badges are circles: non-overlap means centre distance >= diameter.
      for (let i = 0; i < layout.btns.length; i++) for (let j = i + 1; j < layout.btns.length; j++) {
        const d = Math.hypot(layout.btns[j].cx - layout.btns[i].cx, layout.btns[j].cy - layout.btns[i].cy);
        assert(d >= 35, `${label}: ${layout.btns[i].pitch} and ${layout.btns[j].pitch} badges do not overlap (centre distance ${d.toFixed(1)})`);
      }
      if (layout.zone) {
        assert(overlap(layout.deck, layout.zone) === 0, `${label}: the deck frame never overlaps the strike zone`);
        assert(layout.zone.y - layout.deck.bottom >= 30, `${label}: at least 30px clearance above the strike zone (got ${(layout.zone.y - layout.deck.bottom).toFixed(1)})`);
      } else console.log(`pitch-deck-v177: ${label}: strike-zone projection unavailable — zone check skipped`);
    };

    // Default repertoire (right-handed pitcher: fast, slider, curve, change).
    const layout = await measure();
    await checkCommon(layout, 'default repertoire');
    const fast = byPitch(layout.btns, 'fast'), slider = byPitch(layout.btns, 'slider'),
      curve = byPitch(layout.btns, 'curve'), change = byPitch(layout.btns, 'change');
    assert(fast && slider && curve && change, 'default repertoire renders fast/slider/curve/change');
    // Engine screen direction for a right-hander: slider breaks right,
    // curve breaks left and down, change drops below-right of the origin.
    assert(slider.cx > fast.cx + 20, `slider sits right of the origin (slider ${slider.cx.toFixed(1)} vs fast ${fast.cx.toFixed(1)})`);
    assert(curve.cx < fast.cx - 12 && curve.cy > fast.cy + 12, 'curve sits left-down of the origin');
    assert(change.cy > fast.cy + 12, 'change sits below the origin');
    const dist = b => Math.hypot(b.cx - fast.cx, b.cy - fast.cy);
    assert(dist(curve) > dist(change) + 2, `distance encodes break amount: curve (${dist(curve).toFixed(1)}) is farther out than change (${dist(change).toFixed(1)})`);
    console.log(`pitch-deck-v177: default deck ${layout.deck.w}x${layout.deck.h}px, zone clearance ${layout.zone ? (layout.zone.y - layout.deck.bottom).toFixed(1) + 'px' : 'n/a'}, chart directions verified`);

    // Worst real repertoire (sinker + curve sit 20 degrees apart at
    // nearly the same radius — the hardest layout in the roster data).
    await page.evaluate(() => {
      const g = window.__deckGame;
      g.pitcher.pitches = ['fast', 'sinker', 'slider', 'curve', 'change'];
      document.getElementById('pitch-types').dataset.key = '';
    });
    await page.locator('[data-pitch="fast"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-pitch]').length >= 5, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    const worst = await measure();
    await checkCommon(worst, 'worst-case repertoire (5 pitches)');
    console.log(`pitch-deck-v177: worst-case deck ${worst.deck.w}x${worst.deck.h}px, zone clearance ${worst.zone ? (worst.zone.y - worst.deck.bottom).toFixed(1) + 'px' : 'n/a'}`);

    // Selected state: clicking a badge fills it (lime) unlike the others.
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
    assert(states.slider.active && states.slider.bg !== states.curve.bg, 'the selected badge is visually distinct');
    assert(Number(states.disabledOpacity) <= 0.5, `a disabled badge dims out (opacity ${states.disabledOpacity})`);
    assert.deepEqual(errors, [], 'no page errors during the deck flow');
    console.log('pitch-deck-v177: browser checks passed (pitch chart, info intact, no badge/deck/zone overlaps)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('pitch-deck-v177 FAILED:', e.message); process.exit(1); });
