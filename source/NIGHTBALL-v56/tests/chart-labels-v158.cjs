// v158: the one-character pitch-type label row under the at-bat pitch
// chart is removed (real-device feedback: "これはいらない").
//  - the row was #atbat-chart-seq inside #atbat-chart, filled by app.js
//    from ATBAT_PITCH_SHORT ('直'・'ス'・...) joined with '・';
//  - v158 deletes the element (index.html), its CSS rule and the app.js
//    writer + the ATBAT_PITCH_SHORT table — display only;
//  - the pitch history DATA (game.atBatPitches, pitchTrace, the online
//    'abp' stream) is untouched, and the chart body (strike zone, pitch
//    dots, sequence numbers) renders exactly as before;
//  - the chart box keeps its v150 outer size: game-hud.css pins the box
//    height to 87 hud units so removing the row does not move or shrink
//    the chart (v150 measured 94.3x85.2px at 393px wide, batting top
//    ~126px, pitching mirrored right at top ~168px).
// This test pins the removal statically and measures the real 393x852
// rects + chart SVG contents for a right-handed at-bat, a left-handed
// at-bat and the pitching state, saving screenshots of all three.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const appJs = fs.readFileSync(root + 'app.js', 'utf8');
const hudCss = fs.readFileSync(root + 'game-hud.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: label row gone everywhere, chart body intact ----------
assert(!index.includes('atbat-chart-seq'), 'index.html no longer carries the label row element');
assert(!appJs.includes('atbat-chart-seq'), 'app.js no longer writes the label row');
assert(!appJs.includes('ATBAT_PITCH_SHORT'), 'the one-character pitch-type table is gone from app.js');
assert(!hudCss.includes('.atbat-chart-seq'), 'game-hud.css no longer styles the label row');
assert(index.includes('id="atbat-chart"') && index.includes('id="atbat-chart-svg"'), 'chart box and SVG remain');
assert(appJs.includes('updateAtBatChart') && appJs.includes('atbat-chart-svg'), 'app still renders the chart body');
assert(appJs.includes('abp:(g.atBatPitches||[])'), 'pitch history data stream is untouched');
assert(/\.game-stage \.atbat-chart\{[^}]*width:\s*calc\(96 \* var\(--hud-u\)\)[^}]*height:\s*calc\(87 \* var\(--hud-u\)\)/.test(hudCss),
  'chart box keeps its v150 outer size (96u wide, 87u tall) after the row removal');
assert(/\.game-stage \.atbat-chart\{[^}]*top:\s*max\(126px,calc\(128 \* var\(--hud-u\)\)\)/.test(hudCss),
  'batting chart top is unchanged (126px)');
assert(/\.game-screen\.pitching-touch \.game-stage \.atbat-chart\{[^}]*top:\s*max\(168px,calc\(171 \* var\(--hud-u\)\)\)/.test(hudCss),
  'pitching chart top is unchanged (168px, mirrored right)');

// ---------- version pins (v158) ----------
assert(index.includes('./game.js?v=168') && index.includes('./app.js?v=168'), 'index pins at v158');
assert(index.includes('./game-hud.css?v=80'), 'game-hud.css pin moves with the chart rules');
assert(sw.includes('nightball-v168-wind-balance'), 'SW cache renamed for v158');
assert(sw.includes('./game.js?v=168') && sw.includes('./app.js?v=168') && sw.includes('./game-hud.css?v=80'),
  'SW precaches the v158 assets');

console.log('chart-labels-v158: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('chart-labels-v158: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
      const el = document.getElementById('atbat-chart');
      const r = el.getBoundingClientRect();
      const svg = document.getElementById('atbat-chart-svg');
      return {
        hand: window.__chartTest.game.battingHand,
        seqEl: !!document.getElementById('atbat-chart-seq'),
        chart: { left: r.left - stage.left, top: r.top - stage.top, right: r.right - stage.left, bottom: r.bottom - stage.top, width: r.width, height: r.height },
        hidden: el.hidden,
        zone: !!svg.querySelector('rect'),
        circles: svg.querySelectorAll('circle').length,
        texts: [...svg.querySelectorAll('text')].map(t => t.textContent),
        chartText: el.textContent,
        data: (window.__chartTest.game.atBatPitches || []).map(p => p.id),
      };
    });
    const audit = (m, label) => {
      assert(!m.hidden && m.chart.width > 0, `${label}: chart is visible`);
      assert.equal(m.seqEl, false, `${label}: no label-row element in the DOM`);
      assert(!m.chartText.includes('・'), `${label}: no '・'-joined pitch-type labels under the chart`);
      assert(m.zone, `${label}: strike-zone rect is drawn`);
      assert(m.circles >= 1, `${label}: pitch dots are drawn (${m.circles})`);
      assert(m.texts.length === m.circles && m.texts.every((t, i) => t === String(i + 1)),
        `${label}: only the sequence numbers remain as chart text (${JSON.stringify(m.texts)})`);
      assert(m.data.length >= 1, `${label}: pitch history data still exists (${JSON.stringify(m.data)})`);
      assert(m.chart.width >= 90 && m.chart.width <= 99, `${label}: chart width matches v150 (~94.3px): ${m.chart.width}`);
      assert(m.chart.height >= 82 && m.chart.height <= 89, `${label}: chart height matches v150 (~85.2px): ${m.chart.height}`);
      console.log(`chart-labels-v158: ${label} chart ${m.chart.width.toFixed(1)}x${m.chart.height.toFixed(1)}px at (${m.chart.left.toFixed(1)},${m.chart.top.toFixed(1)}), dots=${m.circles}, texts=${JSON.stringify(m.texts)}, data=${JSON.stringify(m.data)}`);
    };
    const take = x => page.evaluate(x => {
      const g = window.__chartTest.game;
      g.balls = Math.min(g.balls, 1); g.strikes = Math.min(g.strikes, 1); g.field = null; g.hit = null;
      g.absRemaining = 0; g.absCpuRemaining = 0;
      g.createPitch(NightGame.TYPES[0], { x, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random;
      try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
    }, x);
    fs.mkdirSync(__dirname + '/screenshots', { recursive: true });
    const shot = async name => {
      for (let i = 0; i < 2; i++) {
        try { await page.screenshot({ path: __dirname + '/screenshots/' + name, timeout: 90000, animations: 'disabled' }); return; }
        catch (e) { if (i === 1) console.log('chart-labels-v158: screenshot ' + name + ' failed after retry: ' + e.message.split('\n')[0]); }
      }
    };

    // --- batting, right-handed ---
    await page.evaluate(() => { const g = window.__chartTest.game; g.half = g.userHome ? 'bottom' : 'top'; g.batter.hand = 'R'; g.notify(); });
    await take(1.6);
    await page.waitForTimeout(500);
    let m = await measure();
    assert.equal(m.hand, 'R');
    audit(m, 'batting-R');
    assert(m.chart.top >= 120 && m.chart.top <= 140, 'batting-R chart top matches v150 (~126px): ' + m.chart.top);
    await shot('chart-labels-v158-R.png');

    // --- batting, left-handed ---
    await page.evaluate(() => { const g = window.__chartTest.game; g.batter.hand = 'L'; g.notify(); });
    await take(0);
    await page.waitForTimeout(500);
    m = await measure();
    assert.equal(m.hand, 'L');
    audit(m, 'batting-L');
    assert(m.chart.top >= 120 && m.chart.top <= 140, 'batting-L chart top matches v150 (~126px): ' + m.chart.top);
    await shot('chart-labels-v158-L.png');

    // --- pitching: chart mirrored to the upper right ---
    await page.evaluate(() => {
      const g = window.__chartTest.game;
      g.half = g.userHome ? 'top' : 'bottom';
      g.atBatPitches = [
        { id: 'fast', name: 'ストレート', x: 0.2, y: -0.3, result: 'miss' },
        { id: 'slider', name: 'スライダー', x: 0.8, y: 0.4, result: 'ball' }];
      g.setPhase('aim'); g.notify();
    });
    await page.waitForTimeout(500);
    m = await measure();
    audit(m, 'pitching');
    assert(m.chart.left >= 280, 'pitching chart is on the right side: left=' + m.chart.left);
    assert(m.chart.top >= 160 && m.chart.top <= 180, 'pitching chart top matches v150 (~168px): ' + m.chart.top);
    await shot('chart-labels-v158-pitching.png');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('chart-labels-v158: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
