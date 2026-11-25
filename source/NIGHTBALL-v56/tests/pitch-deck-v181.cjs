// v181 regression: the pitch picker follows the Power Pro
// reference layout the user supplied — a ball at the centre of the
// deck, one chunky blue arrow marker per pitch around it (arrow
// points in the pitch's true break direction: engine screen
// direction, +bx screen-right for a right-handed pitcher, mirrored
// for left-handers, +by down, fastball up; the break level rides
// inside the arrow as a number), and the pitch name on a blue pill
// beyond the arrow in the same direction. All controls are blue.
// Still no panel (v178): ball, arrows and pills float directly
// over the field. Speeds are NOT printed on the pills (the
// pitch-info display keeps that job); updateUI still fills the
// hidden <small> each pill carries. The deck never overlaps the
// strike zone and every pill keeps an effective tap height of at
// least 44px (38px pill + the v152 ::after expansion).
// v181 proportions follow the user's own mockup (an edited
// real-device screenshot): ball 38px at about (37% W, 35% H) of
// the stage, pills 96x38px riding a circle of radius ~80 around
// the ball (bottom pills hang ~+64px below it), arrows 28px.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const hud = fs.readFileSync(path.join(root, 'dist', 'game-hud.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(hud.includes('Pitch picker (v181)'), 'v181 picker block exists');
assert(hud.includes('.pt-arrow-mark') && hud.includes('.pt-arrow-shape') && hud.includes('.pt-arrow-num'), 'arrow markers are styled');
assert(hud.includes('width:min(264px,90%)'), 'the deck is capped at 264px wide');
assert(hud.includes('background:transparent') && hud.includes('backdrop-filter:none'), 'the deck panel stays gone: transparent background, no blur');
assert(!hud.includes('Pitch chart (v178)'), 'the v178 chart block is gone');
assert(hud.includes('width:96px;height:38px'), 'pills are uniform 96x38px');
assert(hud.includes('clip-path:polygon(0 24%,52% 24%'), 'the arrow marker is a chunky arrow shape');
assert(app.includes('pt-arrow-mark') && app.includes('pt-arrow-num') && app.includes('pitch-ball'), 'picker markup carries ball, arrow markers and numbers');
assert(app.includes('pt-name') && app.includes('${b.p.name}'), 'pills show the full pitch name');
assert(!app.includes('pitch-chart-guides') && !app.includes('pd-arrow') && !app.includes('pt-label'), 'the v177/v178 badge chart markup is gone');
assert(index.includes('./game.js?v=185') && index.includes('./app.js?v=185'), 'index pins at v181');
assert(index.includes('./game-hud.css?v=86'), 'game-hud pin bumped for the redesign');
assert(sw.includes('nightball-v185-pitch-flight'), 'SW cache renamed for v181');

console.log('pitch-deck-v181: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('pitch-deck-v181: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
      const { StadiumRenderer } = await import('./stadium3d.js?v=80');
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
      const deckEl = document.getElementById('pitch-deck');
      const deck = rect(deckEl);
      const dcs = getComputedStyle(deckEl);
      deck.bg = dcs.backgroundColor; deck.blur = dcs.backdropFilter; deck.shadow = dcs.boxShadow;
      const ballEl = document.querySelector('.pitch-deck .pitch-ball');
      const ball = ballEl ? rect(ballEl) : null;
      const pills = [...document.querySelectorAll('[data-pitch]')].map(b => ({
        pitch: b.dataset.pitch, ...rect(b),
        name: b.querySelector('.pt-name')?.textContent || '',
        speed: b.querySelector('small')?.textContent || '',
        smallDisplay: b.querySelector('small') ? getComputedStyle(b.querySelector('small')).display : 'missing',
        bg: getComputedStyle(b).backgroundImage || getComputedStyle(b).backgroundColor,
      }));
      const marks = [...document.querySelectorAll('.pt-arrow-mark')].map(m => ({
        ...rect(m),
        num: m.querySelector('.pt-arrow-num')?.textContent || '',
        rot: m.querySelector('.pt-arrow-shape')?.style.transform || '',
      }));
      let zone = null;
      const R = window.__deckRenderer;
      if (R && typeof R.aimPoint === 'function' && R.hud) {
        const hud = R.hud.getBoundingClientRect();
        const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => R.aimPoint(x, y));
        zone = { x: hud.x + Math.min(...cs.map(p => p.x)), y: hud.y + Math.min(...cs.map(p => p.y)), right: hud.x + Math.max(...cs.map(p => p.x)), bottom: hud.y + Math.max(...cs.map(p => p.y)) };
      }
      return { deck, ball, pills, marks, zone };
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
    const byPitch = (pills, id) => pills.find(b => b.pitch === id);

    const checkCommon = async (layout, label) => {
      assert(layout.deck.w <= 270, `${label}: deck is at most 270px wide (got ${layout.deck.w})`);
      assert(layout.deck.h <= 245, `${label}: deck is at most 245px tall (got ${layout.deck.h})`);
      assert(layout.deck.bg === 'rgba(0, 0, 0, 0)', `${label}: no panel background (got ${layout.deck.bg})`);
      assert(layout.deck.blur === 'none', `${label}: no backdrop blur (got ${layout.deck.blur})`);
      assert(layout.deck.shadow === 'none', `${label}: no panel shadow (got ${layout.deck.shadow})`);
      assert(layout.ball && layout.ball.w >= 36 && layout.ball.w <= 40, `${label}: centre ball renders (~38px)`);
      assert(layout.marks.length === layout.pills.length, `${label}: one arrow marker per pitch (${layout.marks.length} vs ${layout.pills.length})`);
      for (const b of layout.pills) {
        assert(b.w >= 94 && b.w <= 98 && b.h >= 36 && b.h <= 40, `${label}: ${b.pitch} pill is a ~96x38px pill (got ${b.w}x${b.h})`);
        const rad = Math.hypot(b.cx - layout.ball.cx, b.cy - layout.ball.cy);
        assert(rad >= 66 && rad <= 102, `${label}: ${b.pitch} pill rides the mockup ring around the ball (radius ${rad.toFixed(1)})`);
        assert(b.name.length >= 2, `${label}: ${b.pitch} pill shows its pitch name (got "${b.name}")`);
        assert(/^\d+km\/h$/.test(b.speed), `${label}: ${b.pitch} speed data still fills the hidden slot (got "${b.speed}")`);
        assert(b.smallDisplay === 'none', `${label}: ${b.pitch} speed is not printed on the pill (display ${b.smallDisplay})`);
        assert(overlap(b, layout.ball) === 0, `${label}: ${b.pitch} pill does not cover the centre ball`);
        const hit = await hitHeight(b.pitch);
        assert(hit >= 44, `${label}: ${b.pitch} effective tap height >= 44px (got ${hit})`);
      }
      for (let i = 0; i < layout.pills.length; i++) for (let j = i + 1; j < layout.pills.length; j++) {
        assert(overlap(layout.pills[i], layout.pills[j]) === 0, `${label}: ${layout.pills[i].pitch} and ${layout.pills[j].pitch} pills do not overlap`);
      }
      // Arrow numbers: exactly one numberless marker (the fastball,
      // pointing up); every breaking marker carries its level 1-7.
      const nums = layout.marks.map(m => m.num);
      assert(nums.filter(n => n === '').length === 1, `${label}: only the fastball arrow has no number (got ${JSON.stringify(nums)})`);
      for (const n of nums) if (n !== '') assert(/^[1-7]$/.test(n), `${label}: arrow number is a break level 1-7 (got "${n}")`);
      for (const m of layout.marks) assert(/rotate\(-?\d+deg\)/.test(m.rot), `${label}: arrow shape is rotated to its break angle (got "${m.rot}")`);
      if (layout.zone) {
        assert(overlap(layout.deck, layout.zone) === 0, `${label}: the deck never overlaps the strike zone`);
        assert(layout.zone.y - layout.deck.bottom >= 30, `${label}: at least 30px clearance above the strike zone (got ${(layout.zone.y - layout.deck.bottom).toFixed(1)})`);
      } else console.log(`pitch-deck-v181: ${label}: strike-zone projection unavailable — zone check skipped`);
    };

    // Default repertoire (right-handed pitcher: fast, slider, curve, change).
    const layout = await measure();
    await checkCommon(layout, 'default repertoire');
    const ball = layout.ball;
    const fast = byPitch(layout.pills, 'fast'), slider = byPitch(layout.pills, 'slider'),
      curve = byPitch(layout.pills, 'curve'), change = byPitch(layout.pills, 'change');
    assert(fast && slider && curve && change, 'default repertoire renders fast/slider/curve/change');
    assert(fast.name === 'ストレート', `fastball pill shows ストレート (got "${fast.name}")`);
    // Reference layout: fastball pill above the ball, slider pill to
    // the right (engine: a right-hander's slider breaks right),
    // curve down-left, change below the ball.
    assert(fast.cy < ball.cy - 60, `fastball pill sits above the ball (fast ${fast.cy.toFixed(1)} vs ball ${ball.cy.toFixed(1)})`);
    // Mockup placement: the ball sits at about 37% of the stage
    // width and 35% of its height (upper-centre cluster).
    assert(ball.cx >= 138 && ball.cx <= 154, `ball sits near the mockup x (got ${ball.cx.toFixed(1)})`);
    assert(ball.cy >= 290 && ball.cy <= 310, `ball sits near the mockup y (got ${ball.cy.toFixed(1)})`);
    assert(slider.cx > ball.cx + 50, `slider pill sits right of the ball (slider ${slider.cx.toFixed(1)} vs ball ${ball.cx.toFixed(1)})`);
    assert(curve.cx < ball.cx - 20 && curve.cy > ball.cy + 40, 'curve pill sits down-left of the ball');
    assert(change.cy > ball.cy + 40, 'change pill sits below the ball');
    console.log(`pitch-deck-v181: default deck ${layout.deck.w}x${layout.deck.h}px, zone clearance ${layout.zone ? (layout.zone.y - layout.deck.bottom).toFixed(1) + 'px' : 'n/a'}, picker directions verified`);

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
    console.log(`pitch-deck-v181: worst-case deck ${worst.deck.w}x${worst.deck.h}px, zone clearance ${worst.zone ? (worst.zone.y - worst.deck.bottom).toFixed(1) + 'px' : 'n/a'}`);

    // Selected state: clicking a pill highlights it unlike the others.
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
    assert(states.slider.active && states.slider.bg !== states.curve.bg, 'the selected pill is visually distinct');
    assert(Number(states.disabledOpacity) <= 0.5, `a disabled pill dims out (opacity ${states.disabledOpacity})`);
    assert.deepEqual(errors, [], 'no page errors during the picker flow');
    console.log('pitch-deck-v181: browser checks passed (Power Pro picker, no overlaps, blue throughout)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('pitch-deck-v181 FAILED:', e.message); process.exit(1); });
