// v175 regression: pitch deck redesign. The pitch-type chips are now
// dark glass chips on the break-direction compass: 44px touch height,
// name + speed on every chip, break level as a visible pill, a filled
// lime selected state and a dimmed disabled state. No information from
// the old deck (name / speed / break amount) may be lost, chips must
// not overlap each other or neighbouring HUD elements.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const hud = fs.readFileSync(path.join(root, 'dist', 'game-hud.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(hud.includes('Pitch deck redesign (v175)'), 'v175 deck block exists');
assert(hud.includes('.pitch-deck .pitch-type{') && hud.includes('min-height:44px;height:44px'), 'chips are 44px tall');
assert(hud.includes('.pitch-deck .pitch-type.active{') && hud.includes('#e7f7c0'), 'selected chip is a filled lime pill');
assert(hud.includes('.pitch-deck .pitch-type:disabled{opacity:.38'), 'unavailable chips dim out');
assert(app.includes('pt-row') && app.includes('pt-meta') && app.includes('変化${level}'), 'chip markup carries name, speed slot and break-level pill');
assert(!app.includes('aria-hidden="true">⚾</span>'), 'the emoji ball is replaced by the CSS ball');
assert(index.includes('./game.js?v=175') && index.includes('./app.js?v=175'), 'index pins at v175');
assert(index.includes('./game-hud.css?v=81'), 'game-hud pin bumped for the redesign');
assert(sw.includes('nightball-v175-pitch-deck'), 'SW cache renamed for v175');

console.log('pitch-deck-v175: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('pitch-deck-v175: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
      StadiumRenderer.prototype.render = function (game, time) { if (game) window.__deckGame = game; return render.call(this, game, time); };
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

    const layout = await page.evaluate(() => {
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
      return { deck, btns, others };
    });
    assert(layout.btns.length >= 3, `pitch chips are rendered (${layout.btns.length})`);
    for (const b of layout.btns) {
      assert(b.h >= 43.5, `${b.pitch} chip is at least 44px tall (got ${b.h})`);
      assert(b.name.length > 0, `${b.pitch} chip shows its name`);
      assert(/^\d+km\/h$/.test(b.speed), `${b.pitch} chip shows its speed (got "${b.speed}")`);
      if (b.pitch !== 'fast') assert(/^変化[1-7]$/.test(b.level), `${b.pitch} chip shows its break level (got "${b.level}")`);
    }
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    for (let i = 0; i < layout.btns.length; i++) for (let j = i + 1; j < layout.btns.length; j++)
      assert(overlap(layout.btns[i], layout.btns[j]) <= 2, `${layout.btns[i].pitch} and ${layout.btns[j].pitch} chips do not overlap`);
    for (const [sel, r] of Object.entries(layout.others))
      assert(overlap(layout.deck, r) <= 2, `the deck does not overlap ${sel}`);

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
    console.log(`pitch-deck-v175: browser checks passed (${layout.btns.length} chips at 44px, speeds + break levels shown, no overlaps)`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('pitch-deck-v175 FAILED:', e.message); process.exit(1); });
