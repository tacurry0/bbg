// v150: at-bat pitch chart moves to the TOP of the stage (checker item
// atbat-chart-move-top). v113's chart sat mid-stage on the left (measured
// top ~330px batting / ~371px pitching at 393px wide) and on real devices
// the left-handed batter's bat/body covered it. v150:
//  - batting (both hands): chart sits directly under the score cube on the
//    left (top ~126px stage space), same readable 96 hud-unit width — the
//    move is by PLACEMENT, never by shrinking;
//  - pitching: the pitch deck occupies the upper-left (container right edge
//    284px) and the auto-defense chip the upper-right (bottom edge ~163px),
//    so the chart mirrors to the right below that chip (top ~168px), still
//    clearing the deck container by a few px;
//  - the pitch-call banner (abs.css) drops its top floor from 178u to 266u
//    so the compact 50px banner (inner top ~261px) never covers the chart
//    in either state.
// This test pins the static rules and measures real 393x852 rects for a
// right-handed AND a left-handed at-bat plus the pitching aim/result
// states, asserting zero overlap against every neighbouring HUD element.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const hudCss = fs.readFileSync(root + 'game-hud.css', 'utf8');
const absCss = fs.readFileSync(root + 'abs.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: new placement, size preserved ----------
const chartBlock = hudCss.slice(hudCss.indexOf('.game-stage .atbat-chart{'));
assert(chartBlock.length > 100, 'atbat-chart block exists in game-hud.css');
assert(/\.game-stage \.atbat-chart\{[^}]*top:\s*max\(126px,calc\(128 \* var\(--hud-u\)\)\)/.test(chartBlock),
  'batting chart sits at the top, directly under the score cube');
assert(/\.game-stage \.atbat-chart\{[^}]*width:\s*calc\(96 \* var\(--hud-u\)\)/.test(chartBlock),
  'chart keeps the v127 readable width (96 hud units) — not shrunk');
assert(/\.game-screen\.pitching-touch \.game-stage \.atbat-chart\{[^}]*left:\s*auto[^}]*right:\s*var\(--hud-edge\)[^}]*top:\s*max\(168px,calc\(171 \* var\(--hud-u\)\)\)/.test(chartBlock),
  'pitching chart mirrors to the upper right, below the auto-defense chip');
assert(!/atbat-chart\{[^}]*top:\s*max\(calc\(262/.test(chartBlock) && !/pitching-touch \.game-stage \.atbat-chart\{top:\s*max\(calc\(372/.test(chartBlock),
  'the old mid-stage tops (262u batting / 372u pitching) are gone');
assert(/#stage-message\.pitch-call \{[^}]*inset:\s*max\(20%, calc\(266 \* var\(--hud-u\)\)\) 0 auto/.test(absCss),
  'pitch-call banner floor drops to 266u so it stays below the top chart');

// ---------- version pins (v150) ----------
assert(index.includes('./game.js?v=160') && index.includes('./app.js?v=160'), 'index pins at v150');
assert(index.includes('./game-hud.css?v=80'), 'game-hud.css pin moves with the chart rules');
assert(index.includes('./abs.css?v=8'), 'abs.css pin moves with the banner floor');
assert(sw.includes('nightball-v160-catch-sound-timing'), 'SW cache renamed for v150');
assert(sw.includes('./game.js?v=160') && sw.includes('./app.js?v=160') &&
  sw.includes('./game-hud.css?v=80') && sw.includes('./abs.css?v=8'), 'SW precaches the v150 assets');

console.log('atbat-chart-top-v150: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('atbat-chart-top-v150: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
      const { StadiumRenderer } = await import('./stadium3d.js?v=77');
      const render = StadiumRenderer.prototype.render;
      StadiumRenderer.prototype.render = function (game, time) {
        if (game) window.__chartTest = { game, renderer: this };
        return render.call(this, game, time);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__chartTest?.game);
    await page.evaluate(() => { const g = window.__chartTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__chartTest?.game.phase === 'aim');
    await page.evaluate(() => document.fonts.ready);

    const measure = () => page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const R = el => { if (!el) return null; const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { left: r.left - stage.left, top: r.top - stage.top, right: r.right - stage.left, bottom: r.bottom - stage.top, width: r.width, height: r.height } : null; };
      const vis = id => { const el = document.getElementById(id); return el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' ? R(el) : null; };
      const out = { hand: window.__chartTest.game.battingHand, phase: window.__chartTest.game.phase };
      for (const [k, id] of [['chart', 'atbat-chart'], ['scoreboard', 'scoreboard'], ['pitcherCard', 'pitcher-card'],
        ['batterCard', 'player-card'], ['pitchMeta', 'abs-count'], ['wind', 'wind-hud'], ['deck', 'pitch-deck'],
        ['autoDef', 'auto-defense'], ['speed', 'field-speed'], ['scoring', 'scoring-chip'],
        ['absChallenge', 'abs-challenge'], ['batOptions', 'bat-options'], ['pitchInfoBox', null]]) {
        out[k] = id ? vis(id) : R(document.querySelector('.pitch-info'));
      }
      const stageMsg = document.getElementById('stage-message');
      out.banner = stageMsg.classList.contains('show') ? R(stageMsg.querySelector('.stage-call')) : null;
      out.deckButtons = [...document.querySelectorAll('#pitch-deck .pitch-type')].map(R).filter(Boolean);
      return out;
    });
    const overlap = (a, b) => !a || !b ? 0 :
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const audit = (m, label, keys) => {
      assert(m.chart, `${label}: chart is visible`);
      for (const k of keys) {
        const area = overlap(m.chart, m[k]);
        assert(area <= 1, `${label}: chart must not overlap ${k} (got ${area.toFixed(1)}px^2)`);
        if (m[k]) console.log(`atbat-chart-top-v150: ${label} chart vs ${k} overlap = ${area.toFixed(1)}px^2`);
      }
    };
    const take = x => page.evaluate(x => {
      const g = window.__chartTest.game;
      g.balls = Math.min(g.balls, 1); g.strikes = Math.min(g.strikes, 1); g.field = null; g.hit = null;
      g.absRemaining = 0; g.absCpuRemaining = 0; // no ABS review windows here
      g.createPitch(NightGame.TYPES[0], { x, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random;
      try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
    }, x);
    fs.mkdirSync(__dirname + '/screenshots', { recursive: true });
    // Headless SwiftShader screenshots occasionally stall on font loading;
    // screenshots are visual evidence, not assertions — retry once, then
    // warn instead of failing the rect audits above.
    const shot = async name => {
      for (let i = 0; i < 2; i++) {
        try { await page.screenshot({ path: __dirname + '/screenshots/' + name, timeout: 90000, animations: 'disabled' }); return; }
        catch (e) { if (i === 1) console.log('atbat-chart-top-v150: screenshot ' + name + ' failed after retry: ' + e.message.split('\n')[0]); }
      }
    };

    // --- batting, right-handed batter: chart at the top-left ---
    await page.evaluate(() => { const g = window.__chartTest.game; g.half = g.userHome ? 'bottom' : 'top'; g.batter.hand = 'R'; g.notify(); });
    await take(1.6);
    await page.waitForTimeout(500);
    let m = await measure();
    assert.equal(m.hand, 'R');
    console.log(`atbat-chart-top-v150: batting R chart ${m.chart.width.toFixed(1)}x${m.chart.height.toFixed(1)}px at (${m.chart.left.toFixed(1)},${m.chart.top.toFixed(1)}) stage space (was 94.3x85.2 at top 330.5)`);
    assert(m.chart.top >= 120 && m.chart.top <= 140, 'batting chart is at the top, under the score cube: top=' + m.chart.top);
    assert(m.chart.width >= 90 && m.chart.width <= 99, 'chart width preserved (~94px): ' + m.chart.width);
    assert(m.chart.height >= 80 && m.chart.height <= 91, 'chart height preserved (~85px): ' + m.chart.height);
    assert(m.banner, 'pitch-call banner is shown after the taken pitch');
    audit(m, 'batting-R', ['scoreboard', 'pitcherCard', 'batterCard', 'pitchMeta', 'wind', 'banner', 'scoring', 'absChallenge', 'batOptions', 'pitchInfoBox']);
    await shot('atbat-chart-top-v150-R.png');

    // --- batting, left-handed batter: same top spot, no bat/body cover ---
    await page.evaluate(() => { const g = window.__chartTest.game; g.batter.hand = 'L'; g.notify(); });
    await take(0);
    await page.waitForTimeout(500);
    m = await measure();
    assert.equal(m.hand, 'L');
    console.log(`atbat-chart-top-v150: batting L chart at (${m.chart.left.toFixed(1)},${m.chart.top.toFixed(1)}), banner top=${m.banner && m.banner.top.toFixed(1)}`);
    assert(m.chart.top >= 120 && m.chart.top <= 140, 'left-handed at-bat keeps the same top placement: top=' + m.chart.top);
    assert(m.banner, 'pitch-call banner is shown for the left-handed at-bat too');
    audit(m, 'batting-L', ['scoreboard', 'pitcherCard', 'batterCard', 'pitchMeta', 'wind', 'banner', 'scoring', 'absChallenge', 'batOptions', 'pitchInfoBox']);
    await shot('atbat-chart-top-v150-L.png');

    // --- pitching aim: deck on the upper-left, chart mirrored upper-right ---
    await page.evaluate(() => {
      const g = window.__chartTest.game;
      g.half = g.userHome ? 'top' : 'bottom'; // user pitching
      g.atBatPitches = [
        { id: 'fast', name: 'ストレート', x: 0.2, y: -0.3, result: 'miss' },
        { id: 'slider', name: 'スライダー', x: 0.8, y: 0.4, result: 'ball' }];
      g.setPhase('aim'); g.notify();
    });
    await page.waitForTimeout(500);
    m = await measure();
    assert(m.deck, 'pitch deck is visible in the pitching aim phase');
    console.log(`atbat-chart-top-v150: pitching chart at (${m.chart.left.toFixed(1)},${m.chart.top.toFixed(1)}), deck right=${m.deck.right.toFixed(1)}, autoDef bottom=${m.autoDef && m.autoDef.bottom.toFixed(1)}`);
    assert(m.chart.left >= 280, 'pitching chart is on the right side: left=' + m.chart.left);
    assert(m.chart.top >= 160 && m.chart.top <= 180, 'pitching chart is in the upper area, below the auto-defense chip: top=' + m.chart.top);
    assert(m.chart.width >= 90 && m.chart.width <= 99, 'pitching chart width preserved: ' + m.chart.width);
    audit(m, 'pitching-aim', ['scoreboard', 'pitcherCard', 'batterCard', 'pitchMeta', 'wind', 'deck', 'autoDef', 'speed', 'scoring']);
    for (const [i, b] of m.deckButtons.entries()) {
      const area = overlap(m.chart, b);
      assert(area <= 1, `pitching-aim: chart must not overlap pitch-deck button ${i} (got ${area.toFixed(1)}px^2)`);
    }
    console.log(`atbat-chart-top-v150: pitching chart vs ${m.deckButtons.length} deck buttons overlap = 0`);
    await shot('atbat-chart-top-v150-pitching.png');

    // --- pitching result: banner shows below the chart, no overlap ---
    await page.evaluate(() => {
      const g = window.__chartTest.game;
      g.setPhase('result'); g.notify();
      g.message('STRIKE', '', '', '', 'ストライク。');
    });
    await page.waitForTimeout(500);
    m = await measure();
    assert(m.banner, 'pitch-call banner is shown in the pitching result state');
    console.log(`atbat-chart-top-v150: pitching-result chart bottom=${m.chart.bottom.toFixed(1)}, banner top=${m.banner.top.toFixed(1)}`);
    audit(m, 'pitching-result', ['scoreboard', 'pitcherCard', 'pitchMeta', 'wind', 'banner', 'autoDef', 'speed', 'scoring', 'absChallenge']);
    await shot('atbat-chart-top-v150-pitching-result.png');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('atbat-chart-top-v150: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
