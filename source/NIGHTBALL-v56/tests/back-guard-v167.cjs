// v167: pressing the device/browser Back button during a match must never
// end the match without an interrupt UI (real-device report: "the match
// just ends when I press back").
//
// The pre-v167 protection was a single history entry pushed by
// activateGame() plus a popstate handler that ran pause() BEFORE restoring
// the entry with pushState(). pause() calls checkpoint(), whose
// pennant/career/world/APBC snapshot paths are not try/catch-guarded, so
// one throw (or any popstate consumed without the handler restoring the
// entry) silently disarmed the guard: the next Back press left the app
// and the match was gone, with no confirmation ever shown.
//
// v167 hardens all three layers:
//  - activateGame() pushes the 'game' guard entry TWICE, so a single lost
//    popstate can never exit mid-match;
//  - the popstate handler restores the guard with pushState() FIRST
//    (wrapped in try/catch), before any game logic runs;
//  - pause() guards its checkpoint() call, and if pause() still throws,
//    the handler falls back to a minimal interrupt confirmation modal
//    ("戻る操作がありました。試合を中断してホームに戻りますか？") whose
//    buttons reuse the pause menu's own data-actions (close = resume,
//    leave = the mode-aware leave flow).
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: double guard at match start ----------
const activate = app.slice(app.indexOf('function activateGame()'), app.indexOf('function resumeGame()'));
assert(activate.includes("history.pushState({nightball:'game'},'',location.href);history.pushState({nightball:'game'},'',location.href);"),
  'activateGame pushes the game guard entry twice');

// ---------- static: popstate handler restores the guard first ----------
const popStart = app.indexOf("window.addEventListener('popstate'");
assert(popStart > 0, 'popstate handler exists');
const popBody = app.slice(popStart, popStart + 2200);
assert(popBody.includes("if(screen==='game'&&game?.phase!=='ended')"), 'handler still scopes to live matches');
const pushIdx = popBody.indexOf('history.pushState');
const pauseIdx = popBody.indexOf('pause()');
assert(pushIdx > 0 && pauseIdx > 0 && pushIdx < pauseIdx,
  'handler restores the history guard BEFORE calling pause()');
assert(popBody.includes('戻る操作がありました。試合を中断してホームに戻りますか？'),
  'handler has the fallback interrupt confirmation copy');
assert(popBody.includes('data-action="close"') && popBody.includes('>試合に戻る</button>'),
  'fallback confirmation offers resume via the standard close action');
assert(popBody.includes('data-action="leave"') && popBody.includes('中断してホームへ'),
  'fallback confirmation offers the mode-aware leave action');
assert(popBody.includes("game?.phase==='career-pregame'"), 'career-pregame shortcut preserved');

// ---------- static: pause() can no longer die inside checkpoint() ----------
const pauseBody = app.slice(app.indexOf('function pause()'), app.indexOf('function pause()') + 400);
assert(pauseBody.includes('try{checkpoint();}catch{}'), 'pause() guards checkpoint() with try/catch');

// ---------- version pins (v167) ----------
assert(index.includes('./game.js?v=168') && index.includes('./app.js?v=168'), 'index pins at v167');
assert(sw.includes('nightball-v168-wind-balance'), 'SW cache renamed for v167');
assert(sw.includes('./game.js?v=168') && sw.includes('./app.js?v=168'), 'SW precaches the v167 assets');

console.log('back-guard-v167: static assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('back-guard-v167: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
        if (game) window.__backTest = { game, renderer: this };
        return render.call(this, game, time);
      };
    });
    const homeLen = await page.evaluate(() => history.length);

    // Start a regular match.
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__backTest?.game);
    await page.evaluate(() => { const g = window.__backTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__backTest?.game.phase === 'aim');
    const matchLen = await page.evaluate(() => history.length);
    assert.equal(matchLen, homeLen + 2, `match start adds two guard entries (home ${homeLen} -> match ${matchLen})`);

    const view = () => page.evaluate(() => ({
      gameScreen: !document.getElementById('game').hidden,
      homeScreen: !document.getElementById('home').hidden,
      modalText: document.getElementById('modal').hidden ? null : document.getElementById('modal-content').textContent,
      paused: window.__backTest.game.paused,
      phase: window.__backTest.game.phase,
    }));

    // Back #1: pause menu (the interrupt UI) opens, match intact.
    await page.evaluate(() => history.back());
    await page.waitForTimeout(600);
    let v = await view();
    assert(v.gameScreen && !v.homeScreen, 'back #1: still on the game screen');
    assert(v.modalText && v.modalText.includes('プレイを再開'), 'back #1: pause menu is shown');
    assert.equal(v.paused, true, 'back #1: game is paused');

    // Resume from the pause menu: the same match continues.
    await page.locator('#modal-content [data-action="close"]').click();
    await page.waitForTimeout(400);
    v = await view();
    assert(!v.modalText, 'resume: modal closed');
    assert.equal(v.paused, false, 'resume: game unpaused');
    assert(v.gameScreen && !v.homeScreen, 'resume: still in the match');

    // Repeated backs with no taps: the guard holds, home never appears.
    for (let i = 0; i < 3; i++) { await page.evaluate(() => history.back()); await page.waitForTimeout(350); }
    v = await view();
    assert(v.gameScreen && !v.homeScreen, 'repeated backs: match still on screen');
    assert(v.modalText && v.modalText.includes('プレイを再開'), 'repeated backs: pause menu still shown');

    // Back -> pause menu -> intentional leave goes home (existing flow).
    await page.locator('#modal-content [data-action="leave"]').click();
    await page.waitForTimeout(600);
    v = await page.evaluate(() => ({
      gameScreen: !document.getElementById('game').hidden,
      homeScreen: !document.getElementById('home').hidden,
      modalText: document.getElementById('modal').hidden ? null : document.getElementById('modal-content').textContent,
    }));
    assert(v.homeScreen && !v.gameScreen, 'leave: home screen shown after intentional interrupt');
    assert(!v.modalText, 'leave: modal closed');

    assert.deepEqual(errors, [], 'no page errors during the back-button flow');
    console.log('back-guard-v167: browser checks passed (double guard, back -> pause, resume continues, leave goes home)');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error('back-guard-v167 FAILED:', e.message); process.exit(1); });
