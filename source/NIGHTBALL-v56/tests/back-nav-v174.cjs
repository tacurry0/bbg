// v174 regression: unified back navigation (checker item
// back-navigation-consistency; the match-ending part was fixed in v167).
// Outside a match, the device/browser Back button now closes an open
// modal first and then walks back to the previous top-level screen
// instead of doing nothing (pennant) or leaving the app.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// ---------- static ----------
assert(app.includes("let screenStack=['home'],navPop=false"), 'screen stack state exists');
assert(app.includes('function trackScreen(next)') && app.includes('function backToPreviousScreen()'), 'navigation helpers exist');
assert(app.includes("function showLeagueScreen(){trackScreen('pennant');"), 'pennant entry is tracked');
assert(app.includes("worldActive=true;trackScreen('career');"), 'career-world entry is tracked');
assert(app.includes("worldActive=false;trackScreen('career');"), 'classic career entry is tracked');
assert(app.includes("trackScreen('apbc-cup');"), 'APBC cup entry is tracked');
assert(app.includes("trackHome();screen='home'"), 'home() resets the stack');
const popStart = app.indexOf("window.addEventListener('popstate'");
const popBody = app.slice(popStart, popStart + 2400);
assert(popBody.includes('backToPreviousScreen()'), 'popstate walks the screen stack outside matches');
assert(app.includes("try{history.pushState({nightball:'home'},'',location.href);}catch{}"), 'a sacrificial home entry is pushed at startup');
assert(popBody.indexOf('history.pushState') < popBody.indexOf('pause()'), 'v167: the in-match guard is still restored before pause()');
assert(popBody.includes('戻る操作がありました。試合を中断してホームに戻りますか？'), 'v167: fallback confirmation intact');

// ---------- version pins (v174) ----------
assert(index.includes('./game.js?v=178') && index.includes('./app.js?v=178'), 'index pins at v174');
assert(sw.includes('nightball-v178-bare-chart'), 'SW cache renamed for v174');
assert(sw.includes('./game.js?v=178') && sw.includes('./app.js?v=178'), 'SW precaches the v174 assets');

console.log('back-nav-v174: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('back-nav-v174: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
    const visible = () => page.evaluate(() => ({
      home: !document.getElementById('home').hidden,
      pennant: !document.getElementById('pennant').hidden,
      career: !document.getElementById('career').hidden,
      modal: !document.getElementById('modal').hidden,
    }));
    const back = async () => { await page.evaluate(() => history.back()); await page.waitForTimeout(450); };

    // Home -> pennant picker -> Back returns home (previously Back did
    // nothing useful on the pennant screen and could leave the app).
    await page.locator('#pennant-mode').click();
    await page.waitForTimeout(400);
    let v = await visible();
    assert(v.pennant && !v.home, 'pennant screen is shown');
    await back();
    v = await visible();
    assert(v.home && !v.pennant, 'Back from pennant returns home');

    // Home -> career (world slots) -> Back returns home.
    await page.locator('[data-mode="career"]').click();
    await page.waitForTimeout(400);
    v = await visible();
    assert(v.career && !v.home, 'career screen is shown');
    await back();
    v = await visible();
    assert(v.home && !v.career, 'Back from career returns home');

    // A modal open on home: Back closes the modal instead of leaving.
    await page.locator('#menu-settings').click();
    await page.waitForTimeout(400);
    v = await visible();
    assert(v.modal && v.home, 'settings modal is open over home');
    await back();
    v = await visible();
    assert(!v.modal && v.home, 'Back closes the modal and stays home');

    // Back at the root is a no-op inside the app.
    await back();
    v = await visible();
    assert(v.home, 'Back at home stays home');

    assert.deepEqual(errors, [], 'no page errors during the back-navigation flow');
    console.log('back-nav-v174: browser checks passed (pennant/career Back -> home, modal Back -> close, root Back -> stay)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('back-nav-v174 FAILED:', e.message); process.exit(1); });
