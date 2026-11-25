// v170 regression: pennant leaders ranking is switchable by metric and by
// scope (checker item records-sort-options). Before, the modal printed a
// fixed top-10 for all eight metrics at once with no way to switch metric
// or to restrict the ranking to the user's own club.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'dist', 'style.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(app.includes("let leadersMetric='avg',leadersScope='league'"), 'leaders view state exists');
assert(app.includes("data-leaders-metric=") && app.includes("data-leaders-scope="), 'metric and scope switchers are rendered');
assert(app.includes("leadersScope==='team'?rows.filter(r=>r.clubId===league.clubId):rows"), 'team scope filters to the user club');
assert(app.includes("if(b.dataset.leadersMetric){leadersMetric=b.dataset.leadersMetric;leadersModal();return;}"), 'metric clicks re-render the ranking');
assert(app.includes("if(b.dataset.leadersScope){leadersScope=b.dataset.leadersScope;leadersModal();return;}"), 'scope clicks re-render the ranking');
for (const key of ['avg', 'hr', 'rbi', 'ops', 'era', 'k', 'warBat', 'warPit']) assert(app.includes(`'${key}'`), `metric ${key} is defined`);
assert(style.includes('.leaders-metrics'), 'metric switcher styles exist');

// ---------- version pins (v170) ----------
assert(index.includes('./game.js?v=171') && index.includes('./app.js?v=171'), 'index pins at v170');
assert(index.includes('./style.css?v=77'), 'style.css pin bumped for the switcher styles');
assert(sw.includes('nightball-v171-tab-swipe'), 'SW cache renamed for v170');
assert(sw.includes('./game.js?v=171') && sw.includes('./app.js?v=171') && sw.includes('./style.css?v=77'), 'SW precaches the v170 assets');

console.log('leaders-sort-v170: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('leaders-sort-v170: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
    await page.waitForFunction(() => !!window.nightSettings, null, { timeout: 30000 });

    // Seed a CPBL pennant (user club: brothers) with known player stats.
    await page.evaluate(() => {
      const L = new NightPennant('owls');
      if (L.preseason) L.preseason.done = true;
      const bat = (name, clubId, o) => ({ name, clubId, pa: 110, ab: 100, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 10, outs: 0, runs: 0, k: 0, ...o });
      const pit = (name, clubId, o) => ({ name, clubId, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, outs: 0, runs: 0, k: 0, ...o });
      L.playerStats = {
        'brothers/b1': bat('テスト打者A', 'owls', { h: 40, doubles: 8, triples: 1, hr: 5, rbi: 20 }),
        'lions/b1': bat('テスト打者B', 'comets', { h: 30, doubles: 5, hr: 15, rbi: 40 }),
        'brothers/p1': pit('テスト投手A', 'owls', { outs: 90, runs: 10, k: 50 }),
        'lions/p1': pit('テスト投手B', 'comets', { outs: 90, runs: 20, k: 80 }),
      };
      NightPennantSlots.write(localStorage, L.leagueId, 1, L);
      NightPennantSlots.setActive(localStorage, L.leagueId, 1);
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.nightSettings, null, { timeout: 30000 });
    await page.locator('#pennant-mode').click();
    await page.locator('[data-league-action="leaders"]').click();
    await page.waitForFunction(() => !document.getElementById('modal').hidden && document.getElementById('modal-content').textContent.includes('個人成績ランキング'), null, { timeout: 15000 });

    const modalText = () => page.evaluate(() => document.getElementById('modal-content').textContent);
    const firstRow = () => page.evaluate(() => document.querySelector('#modal-content .career-list-row')?.textContent || '');

    // Default: batting average, league-wide -> A (.400) leads.
    let row = await firstRow();
    assert(row.includes('テスト打者A') && row.includes('.400'), `default AVG leader is A: ${row}`);

    // Switch metric to home runs -> B (15) leads.
    await page.locator('[data-leaders-metric="hr"]').click();
    row = await firstRow();
    assert(row.includes('テスト打者B') && row.includes('15 本'), `HR leader is B: ${row}`);

    // Scope to own team -> only brothers players remain; A (5 HR) leads.
    await page.locator('[data-leaders-scope="team"]').click();
    let text = await modalText();
    row = await firstRow();
    assert(row.includes('テスト打者A') && row.includes('5 本'), `team-scope HR leader is A: ${row}`);
    assert(!text.includes('テスト打者B'), 'team scope excludes other clubs');

    // Back to league scope, ERA -> pitcher A (3.00) leads; Ks -> pitcher B.
    await page.locator('[data-leaders-scope="league"]').click();
    await page.locator('[data-leaders-metric="era"]').click();
    row = await firstRow();
    assert(row.includes('テスト投手A') && row.includes('3.00'), `ERA leader is pitcher A: ${row}`);
    await page.locator('[data-leaders-metric="k"]').click();
    row = await firstRow();
    assert(row.includes('テスト投手B') && row.includes('80 K'), `K leader is pitcher B: ${row}`);

    assert.deepEqual(errors, [], 'no page errors during the leaders flow');
    console.log('leaders-sort-v170: browser checks passed (metric + scope switching re-ranks correctly)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('leaders-sort-v170 FAILED:', e.message); process.exit(1); });
