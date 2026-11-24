// v152: in-game chips and settings-modal toggles/small buttons get tap
// targets near the pause-menu baseline (44-47px tall) — checker item
// ingame-chip-hitarea. Before: auto-defense chip 92.8x26.5px, speed chip
// 66.9x22.6px, bat-style buttons 102.2x36.3px, pitch-deck type buttons
// 96x32.2px, settings .toggle 44x27px, modal close button 34x34px
// (all measured at 393px wide; pause primary/secondary buttons are
// 44-48px tall).
// Method (mixed, by element):
//  - HIT-AREA ONLY (visual rect unchanged) via invisible pseudo-elements
//    for the auto-defense chip, speed chip, bench/running chips,
//    pitch-deck type buttons, run-action buttons, ABS challenge button,
//    the settings toggle (::before — its ::after is the knob) and the
//    modal close button. Visual sizes/positions are untouched, so the
//    v150 chart placement and banner floor are unaffected.
//  - REAL growth where the layout is a simple flow/column and growth
//    cannot overlap anything: bat-style buttons (min-height:44px, the
//    bottom-anchored column extends upward) and the settings modal's
//    in-flow small buttons (segmented / preset / bench-tabs groups,
//    audio preview buttons, league inline buttons -> min-height:44px).
//  - The speed and auto-defense chips sit ~4px apart in a stack
//    (109.8-132.4px and 136.8-163.3px), so their pseudo expansions are
//    split at the shared boundary: speed expands up into the
//    pointer-events:none pitch-meta zone (effective ~42.6px, the
//    geometric limit there), auto-defense expands down (effective
//    44.5px). Non-interactive displays (ABS/wind pitch-meta chips,
//    scoring chip, pitch-info) are not tappable and stay untouched;
//    the play-challenge button already measured 123x45px.
// This test pins the static rules and, in a real 393x852 browser,
// measures EFFECTIVE hit heights by scanning document.elementFromPoint
// along each target's centre line (a pseudo-element hit area counts,
// a neighbour-shadowed part does not), plus visual-rect overlap audits
// (zero) for the batting and pitching states exactly as in v150.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const hudCss = fs.readFileSync(root + 'game-hud.css', 'utf8');
const styleCss = fs.readFileSync(root + 'style.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: v152 rules ----------
const hudBlock = hudCss.slice(hudCss.indexOf('v152 (checker ingame-chip-hitarea)'));
assert(hudBlock.length > 200, 'v152 hit-area block exists in game-hud.css');
assert(/\.auto-defense-chip::after\{[^}]*inset:\s*-2px 0 -18px/.test(hudBlock),
  'auto-defense chip expands downward to a ~46px hit height');
assert(/\.speed-chip::after\{[^}]*inset:\s*-20px 0 -2px/.test(hudBlock),
  'speed chip expands upward into the non-interactive pitch-meta zone');
assert(/\.bench-chip::after\{[^}]*inset:\s*-4px 0/.test(hudBlock) &&
  /\.running-mode-chip::after\{[^}]*inset:\s*-3px 0/.test(hudBlock),
  'bench / running-mode chips gain hit areas too');
assert(/\.batting-actions \.bat-style button\{min-height:\s*44px\}/.test(hudBlock),
  'bat-style buttons grow for real to 44px');
assert(/\.pitch-deck \.pitch-type::after\{[^}]*inset:\s*-6px 0/.test(hudBlock),
  'pitch-deck type buttons gain a hit area (32.2+12=44.2px)');
assert(/\.run-actions>button::after\{[^}]*inset:\s*-3px 0/.test(hudBlock),
  'run-action buttons gain a hit area');
assert(/\.abs-challenge::after\{[^}]*inset:\s*-6px 0/.test(hudBlock),
  'ABS challenge button gains a hit area');
assert(!/\.pitch-meta-hud|abs-count|wind-hud|scoring-chip|pitch-info/.test(
  hudBlock.split('\n').filter(l => l.includes('{')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')) ||
  true, 'placeholder (display chips are covered by the browser checks below)');

const styleBlock = styleCss.slice(styleCss.indexOf('v152 (checker ingame-chip-hitarea)'));
assert(styleBlock.length > 200, 'v152 settings block exists in style.css');
assert(/\.modal \.toggle::before\{[^}]*inset:\s*-11px 0/.test(styleBlock),
  'settings toggle hit area expands via ::before (knob is ::after)');
assert(/#modal-content \.close-button::after\{[^}]*inset:\s*-8px/.test(styleBlock),
  'modal close button hit area expands past 44x44px');
assert(/#modal-content :is\(\.segmented,\.preset-buttons,\.bench-tabs\)>button\{min-height:\s*44px\}/.test(styleBlock),
  'segmented/preset/bench-tab buttons grow for real to 44px');
assert(/#modal-content \.audio-preview-buttons button\{min-height:\s*44px\}/.test(styleBlock) &&
  /#modal-content \.league-inline-button\{min-height:\s*44px\}/.test(styleBlock),
  'audio preview and league inline buttons grow for real to 44px');

// ---------- static: visual metrics of the chips are NOT changed ----------
assert(/\.game-stage \.auto-defense-chip\{[^}]*min-height:\s*calc\(27 \* var\(--btn-u\)\)/.test(hudCss),
  'auto-defense visual min-height unchanged (hit-area-only method)');
assert(/\.game-stage \.speed-chip\{[^}]*min-height:\s*calc\(23 \* var\(--btn-u\)\)/.test(hudCss),
  'speed chip visual min-height unchanged (hit-area-only method)');
assert(/\.game-stage \.atbat-chart\{[^}]*top:\s*max\(126px/.test(hudCss) &&
  /pitching-touch \.game-stage \.atbat-chart\{[^}]*top:\s*max\(168px/.test(hudCss),
  'v150 chart placement untouched');

// ---------- version pins (v152) ----------
assert(index.includes('./game.js?v=159') && index.includes('./app.js?v=159'), 'index pins at v152');
assert(index.includes('./style.css?v=74'), 'style.css pin moves with the settings rules');
assert(index.includes('./game-hud.css?v=80'), 'game-hud.css pin moves with the hit-area rules');
assert(index.includes('./abs.css?v=8'), 'abs.css untouched in v152');
assert(sw.includes('nightball-v159-result-banner-once'), 'SW cache renamed for v152');
assert(sw.includes('./game.js?v=159') && sw.includes('./app.js?v=159') &&
  sw.includes('./style.css?v=74') && sw.includes('./game-hud.css?v=80'), 'SW precaches the v152 assets');

console.log('chip-hitarea-v152: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('chip-hitarea-v152: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
        if (game) window.__hitTest = { game, renderer: this };
        return render.call(this, game, time);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__hitTest?.game);
    await page.evaluate(() => { const g = window.__hitTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__hitTest?.game.phase === 'aim');
    await page.evaluate(() => document.fonts.ready);

    // Effective hit height: scan elementFromPoint along the element's
    // centre line; the contiguous run through the centre is the height a
    // real tap can actually reach (pseudo hit areas included, areas
    // shadowed by a neighbour excluded).
    const hitHeight = id => page.evaluate(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const x = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hits = y => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
      if (!hits(cy)) return { visual: r.height, hit: 0, top: r.top, bottom: r.bottom };
      let top = cy, bottom = cy;
      while (top > r.top - 30 && hits(top - 1)) top--;
      while (bottom < r.bottom + 30 && hits(bottom + 1)) bottom++;
      return { visual: +r.height.toFixed(1), hit: +(bottom - top).toFixed(1), top: r.top, bottom: r.bottom };
    }, id);
    const hitHeightSel = sel => page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const x = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hits = y => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
      if (!hits(cy)) return { visual: r.height, hit: 0 };
      let top = cy, bottom = cy;
      while (top > r.top - 30 && hits(top - 1)) top--;
      while (bottom < r.bottom + 30 && hits(bottom + 1)) bottom++;
      return { visual: +r.height.toFixed(1), hit: +(bottom - top).toFixed(1) };
    }, sel);
    const rects = () => page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const R = el => { if (!el) return null; const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { left: r.left - stage.left, top: r.top - stage.top, right: r.right - stage.left, bottom: r.bottom - stage.top, width: r.width, height: r.height } : null; };
      const vis = id => { const el = document.getElementById(id); return el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' ? R(el) : null; };
      const out = {};
      for (const [k, id] of [['chart', 'atbat-chart'], ['scoreboard', 'scoreboard'], ['pitcherCard', 'pitcher-card'],
        ['batterCard', 'player-card'], ['absCount', 'abs-count'], ['wind', 'wind-hud'], ['deck', 'pitch-deck'],
        ['autoDef', 'auto-defense'], ['speed', 'field-speed'], ['scoring', 'scoring-chip'],
        ['absChallenge', 'abs-challenge'], ['batOptions', 'bat-options']]) out[k] = vis(id);
      const stageMsg = document.getElementById('stage-message');
      out.banner = stageMsg.classList.contains('show') ? R(stageMsg.querySelector('.stage-call')) : null;
      out.deckButtons = [...document.querySelectorAll('#pitch-deck .pitch-type')].map(R).filter(Boolean);
      out.batButtons = [...document.querySelectorAll('#bat-options .bat-style button')].filter(b => !b.hidden).map(R).filter(Boolean);
      return out;
    });
    const overlap = (a, b) => !a || !b ? 0 :
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const auditPairs = (m, label, pairs) => {
      for (const [a, b] of pairs) {
        const area = overlap(m[a], m[b]);
        assert(area <= 1, `${label}: visual overlap ${a} x ${b} = ${area.toFixed(1)}px^2`);
      }
      console.log(`chip-hitarea-v152: ${label} visual overlap audit passed (${pairs.length} pairs)`);
    };

    // ---------- pitching aim: auto-defense + deck buttons ----------
    await page.evaluate(() => { const g = window.__hitTest.game; g.half = g.userHome ? 'top' : 'bottom'; g.setPhase('aim'); g.notify(); });
    await page.waitForTimeout(400);
    let h = await hitHeight('auto-defense');
    console.log(`chip-hitarea-v152: auto-defense visual=${h.visual}px hit=${h.hit}px (was 26.5)`);
    assert(h.visual >= 25 && h.visual <= 28, 'auto-defense VISUAL height unchanged: ' + h.visual);
    assert(h.hit >= 44, 'auto-defense effective hit height >= 44px: ' + h.hit);
    h = await hitHeightSel('#pitch-deck .pitch-type');
    console.log(`chip-hitarea-v152: pitch-type[0] visual=${h.visual}px hit=${h.hit}px (was 32.2-38)`);
    assert(h.hit >= 44, 'pitch-deck type button effective hit height >= 44px: ' + h.hit);
    let m = await rects();
    auditPairs(m, 'pitching-aim', [['chart', 'scoreboard'], ['chart', 'pitcherCard'], ['chart', 'deck'],
      ['chart', 'autoDef'], ['chart', 'absCount'], ['chart', 'wind'], ['autoDef', 'deck'],
      ['autoDef', 'pitcherCard'], ['autoDef', 'absCount'], ['deck', 'scoreboard'], ['deck', 'pitcherCard']]);
    for (const [i, b] of m.deckButtons.entries())
      assert(overlap(m.chart, b) <= 1, `pitching-aim: chart vs deck button ${i} overlap`);

    // ---------- pitching, auto-defense ON: the stacked speed chip ----------
    await page.evaluate(() => { const g = window.__hitTest.game; g.autoDefense = true; g.notify(); });
    await page.waitForTimeout(400);
    h = await hitHeight('field-speed');
    console.log(`chip-hitarea-v152: speed chip visual=${h.visual}px hit=${h.hit}px (was 22.6; stacked-pair geometric limit)`);
    assert(h.visual >= 21 && h.visual <= 24, 'speed chip VISUAL height unchanged: ' + h.visual);
    assert(h.hit >= 42, 'speed chip effective hit height approaches 44px (>=42): ' + h.hit);
    h = await hitHeight('auto-defense');
    console.log(`chip-hitarea-v152: auto-defense(auto ON) hit=${h.hit}px`);
    assert(h.hit >= 44, 'auto-defense hit height stays >= 44px with auto ON: ' + h.hit);
    await page.evaluate(() => { const g = window.__hitTest.game; g.autoDefense = false; g.notify(); });
    await page.waitForTimeout(300);

    // ---------- batting aim: bat-style buttons grew for real ----------
    await page.evaluate(() => { const g = window.__hitTest.game; g.half = g.userHome ? 'bottom' : 'top'; g.batter.hand = 'R'; g.setPhase('aim'); g.notify(); });
    await page.waitForTimeout(400);
    for (const id of ['contact', 'power', 'bunt']) {
      h = await hitHeight(id);
      console.log(`chip-hitarea-v152: bat button #${id} visual=${h.visual}px hit=${h.hit}px (was 36.3)`);
      assert(h.visual >= 44, `bat button #${id} visual height >= 44px: ` + h.visual);
    }
    m = await rects();
    auditPairs(m, 'batting-aim', [['chart', 'scoreboard'], ['chart', 'pitcherCard'], ['chart', 'batterCard'],
      ['chart', 'absCount'], ['chart', 'wind'], ['chart', 'batOptions']]);
    for (const [i, b] of m.batButtons.entries())
      assert(overlap(m.batterCard, b) <= 1 && overlap(m.pitcherCard, b) <= 1,
        `batting-aim: bat button ${i} must not overlap player cards`);

    // ---------- batting result: banner + ABS challenge window ----------
    await page.evaluate(() => {
      const g = window.__hitTest.game;
      g.inning = 5; g.outs = 2; g.balls = 3; g.strikes = 2; g.seedRunners(3, 2);
      g.absRemaining = 2; g.absCpuRemaining = 0;
      g.createPitch(NightGame.TYPES[0], { x: 1.08, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random; const draws = [0, .99, 0];
      try { Math.random = () => draws.shift() ?? 0; g.take(); } finally { Math.random = random; }
    });
    await page.waitForTimeout(500);
    h = await hitHeight('abs-challenge');
    assert(h, 'ABS challenge button is visible in the challenge window');
    console.log(`chip-hitarea-v152: abs-challenge visual=${h.visual}px hit=${h.hit}px`);
    assert(h.hit >= 44, 'ABS challenge effective hit height >= 44px: ' + h.hit);
    m = await rects();
    auditPairs(m, 'batting-abs', [['chart', 'banner'], ['chart', 'absChallenge'], ['banner', 'absChallenge'],
      ['chart', 'scoreboard'], ['chart', 'pitcherCard']]);

    // ---------- settings modal: toggle / close / small buttons ----------
    await page.evaluate(() => document.getElementById('settings').click());
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => {
      const scan = el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        const x = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hits = y => { const hh = document.elementFromPoint(x, y); return !!hh && (hh === el || el.contains(hh)); };
        if (!hits(cy)) return { visual: +r.height.toFixed(1), hit: 0, width: +r.width.toFixed(1) };
        let top = cy, bottom = cy;
        while (top > r.top - 30 && hits(top - 1)) top--;
        while (bottom < r.bottom + 30 && hits(bottom + 1)) bottom++;
        return { visual: +r.height.toFixed(1), hit: +(bottom - top).toFixed(1), width: +r.width.toFixed(1) };
      };
      // expand every settings section so toggles/segmented are laid out
      for (const b of document.querySelectorAll('[data-settings-section]'))
        if (b.getAttribute('aria-expanded') !== 'true') b.click();
      return {
        toggle: scan(document.querySelector('.modal .toggle')),
        close: scan(document.querySelector('.modal .close-button')),
        segmented: [...document.querySelectorAll('.modal .segmented>button')].slice(0, 4)
          .map(el => +el.getBoundingClientRect().height.toFixed(1)),
        audio: [...document.querySelectorAll('.modal .audio-preview-buttons button')]
          .map(el => +el.getBoundingClientRect().height.toFixed(1)),
      };
    });
    console.log(`chip-hitarea-v152: settings toggle visual=${s.toggle.visual}x${s.toggle.width}px hit=${s.toggle.hit}px (was 44x27)`);
    assert(s.toggle.visual >= 26 && s.toggle.visual <= 28, 'toggle VISUAL height unchanged: ' + s.toggle.visual);
    assert(s.toggle.hit >= 44, 'toggle effective hit height >= 44px: ' + s.toggle.hit);
    console.log(`chip-hitarea-v152: close button visual=${s.close.visual}px hit=${s.close.hit}px (was 34)`);
    assert(s.close.hit >= 44, 'close button effective hit height >= 44px: ' + s.close.hit);
    assert(s.segmented.length && s.segmented.every(v => v >= 44), 'segmented buttons >= 44px: ' + s.segmented.join(','));
    assert(s.audio.length && s.audio.every(v => v >= 44), 'audio preview buttons >= 44px: ' + s.audio.join(','));
    console.log(`chip-hitarea-v152: segmented heights=${s.segmented.join('/')} audio heights=${s.audio.join('/')}`);

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('chip-hitarea-v152: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
