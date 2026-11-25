// v171 regression: tabbed screens accept horizontal swipes to move to the
// adjacent tab (checker item tab-swipe-navigation). Career detail tabs and
// the pennant league tabs used to be tap-only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(app.includes('function attachTabSwipe(el,buttonsSel)'), 'swipe helper exists');
assert(app.includes("attachTabSwipe($('career'),'.career-tabs [data-tab]')"), 'career tabs are swipe-bound');
assert(app.includes("attachTabSwipe($('pennant'),'.pennant-league-options [data-pennant-league]')"), 'pennant league tabs are swipe-bound');
assert(app.includes("closest('input,textarea,select,canvas,[data-no-swipe]')"), 'swipes starting on form controls / canvas are ignored');
assert(app.includes('Math.abs(dx)<60'), 'minimum swipe distance guard exists');
assert(app.includes('Math.abs(dx)<Math.abs(dy)*1.6'), 'vertical-dominant drags are ignored');
assert(app.includes('buttons[next].click()'), 'swipe activates the adjacent tab button');

// ---------- version pins (v171) ----------
assert(index.includes('./game.js?v=175') && index.includes('./app.js?v=175'), 'index pins at v171');
assert(sw.includes('nightball-v175-pitch-deck'), 'SW cache renamed for v171');
assert(sw.includes('./game.js?v=175') && sw.includes('./app.js?v=175'), 'SW precaches the v171 assets');

console.log('tab-swipe-v171: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('tab-swipe-v171: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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

    const swipe = (containerSel, dx, dy) => page.evaluate(([sel, dx, dy]) => {
      const el = document.querySelector(sel);
      const mk = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(200, 400)], bubbles: true, cancelable: true }));
      el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(200 + dx, 400 + dy)], bubbles: true, cancelable: true }));
    }, [containerSel, dx, dy]);

    // --- pennant league tabs ---
    await page.locator('#pennant-mode').click();
    await page.waitForSelector('.pennant-league-options [data-pennant-league]', { timeout: 15000 });
    const pressedLeague = () => page.evaluate(() => document.querySelector('.pennant-league-options [aria-pressed="true"]')?.dataset.pennantLeague);
    assert.equal(await pressedLeague(), 'cpbl', 'pennant picker starts on CPBL');
    await swipe('#pennant', -120, 10);
    await page.waitForTimeout(300);
    assert.equal(await pressedLeague(), 'npb-central', 'swipe left moves to the next league tab');
    await swipe('#pennant', 120, 10);
    await page.waitForTimeout(300);
    assert.equal(await pressedLeague(), 'cpbl', 'swipe right moves back to the previous league tab');
    await swipe('#pennant', -30, 140);
    await page.waitForTimeout(300);
    assert.equal(await pressedLeague(), 'cpbl', 'vertical-dominant drag does not switch tabs');
    await page.locator('[data-league-action="home"]').click();
    await page.waitForTimeout(300);

    // --- classic career tabs (seeded career) ---
    await page.evaluate(() => {
      const c = new NightCareer('テスト選手', NightCareer.schools[0], 'contact', 'R');
      localStorage.setItem(NightCareer.key, JSON.stringify(c.save()));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.nightSettings, null, { timeout: 30000 });
    await page.locator('[data-mode="career"]').click();
    await page.locator('[data-world-action="legacy"]').click();
    await page.waitForSelector('.career-tabs [data-tab]', { timeout: 15000 });
    const currentTab = () => page.evaluate(() => document.querySelector('.career-tabs [aria-current="page"]')?.dataset.tab);
    assert.equal(await currentTab(), 'next', 'career dashboard starts on the first tab');
    await swipe('#career', -120, 10);
    await page.waitForTimeout(300);
    assert.equal(await currentTab(), 'life', 'swipe left moves to the next career tab');
    await swipe('#career', -120, 10);
    await page.waitForTimeout(300);
    assert.equal(await currentTab(), 'practice', 'a second swipe left moves one more tab');
    await swipe('#career', 120, 10);
    await page.waitForTimeout(300);
    assert.equal(await currentTab(), 'life', 'swipe right moves back one tab');

    assert.deepEqual(errors, [], 'no page errors during the swipe flows');
    console.log('tab-swipe-v171: browser checks passed (pennant league tabs + career tabs switch by swipe)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('tab-swipe-v171 FAILED:', e.message); process.exit(1); });
