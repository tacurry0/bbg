// v159: result banner once (real-device feedback: the same play result —
// e.g. FLY OUT — was presented twice, the second time over the next
// at-bat's batting screen in a different-looking form).
//
// Root cause, established by reading the display path and by reproduction
// on the pre-fix code: the engine (game.js) emits each play result exactly
// once (verified in Node and in the browser), and app.js renders it into
// the single #stage-message banner. But the banner had no lifetime of its
// own — it stayed visible until the next 'clear' event and nothing else
// ever hid it — and the identical result could be delivered to onEvent a
// second time (the re-entry paths that re-emit the last log entry:
// playLeague / resumeGame / career / tournament starts, and online
// re-sends). Pre-fix reproduction in a real browser: delivering the same
// FLY OUT result twice ran the banner's appear animation twice, and a
// result banner still shown when the aim/windup phase began stayed
// 'show' on the batting screen indefinitely.
//
// Fix (app.js, display layer only; game.js emissions unchanged): result
// messages are tracked by a signature (inning / half / batter / en / ja /
// sub / outs / score). A second delivery of the same play's result within
// one game-screen session is neither shown nor spoken again, and
// updateUI hides a tracked result banner as soon as a new at-bat phase
// (aim / windup / pitch / miss / field / intro) begins. activateGame()
// resets the set, so a restored game may still present its in-progress
// result once on entry (the resume/re-entry path keeps its behaviour).
// STRIKEOUT and WALK are tracked because they end the at-bat like FLY
// OUT; their pitch-call styling is unchanged. Pure pitch calls that do
// not end an at-bat (BALL / STRIKE / SWING & MISS / FOUL / TAKE) are not
// tracked and keep their existing display behaviour, including the
// same-call animation suppression from v145-v147.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: the once-only machinery ----------
assert(app.includes('result-banner-once'), 'v159 root-cause note is recorded in app.js');
assert(app.includes('function resultSignature(data)'), 'result signature tracker exists');
assert(app.includes("const RESULT_NON_RESULTS=['BALL','STRIKE','SWING & MISS','FOUL','TAKE'];"),
  'pure pitch calls are excluded from result tracking');
assert(app.includes('if(resultSig&&stageResultShown.has(resultSig))return;'),
  'a second delivery of the same result is not shown again');
assert(app.includes('function hideStaleResultBanner()'), 'stale result banner guard exists');
assert(app.includes("['aim','windup','pitch','miss','field','intro'].includes(game.phase)"),
  'the guard fires when a new at-bat phase begins');
assert(app.includes('hideStaleResultBanner();stadiumAudio.setExcitement'),
  'updateUI runs the stale-result guard on every UI pass');
assert(app.includes("stageResultShown=new Set();stageResultKey='';\n  if(!game.umpireMode"),
  'activateGame resets the shown set so a restored game may present its result once on entry');
assert(app.includes("}else if(type==='clear'){stageResultKey='';"),
  'clear untracks the visible result banner');
// The single-design rule: still exactly one stage banner element/mechanism.
assert(index.includes('id="stage-message"'), 'the one stage banner element remains');
assert(!app.includes('stage-message-2') && !index.includes('result-banner'), 'no second result banner component was added');

// ---------- version pins (v159) ----------
assert(index.includes('./game.js?v=189') && index.includes('./app.js?v=189'), 'index pins at v159');
assert(sw.includes('nightball-v189-fast-pitches'), 'SW cache renamed for v159');
assert(sw.includes('./game.js?v=189') && sw.includes('./app.js?v=189'), 'SW precaches the v159 scripts');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('result-banner-once-v159: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
      const { StadiumRenderer } = await import('./stadium3d.js?v=81');
      const render = StadiumRenderer.prototype.render;
      StadiumRenderer.prototype.render = function (game, time) {
        if (game) window.__bannerTest = { game, renderer: this };
        return render.call(this, game, time);
      };
      // Count banner presentations: the appear animation runs once per
      // display of a message (existing same-pitch-call suppression aside).
      window.__anims = [];
      const orig = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (this.classList && this.classList.contains('stage-call'))
          window.__anims.push(document.getElementById('message-en').textContent);
        return orig.call(this, keyframes, options);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__bannerTest?.game);
    await page.evaluate(() => { const g = window.__bannerTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__bannerTest?.game.phase === 'aim');

    // Drive one real engine result of each kind on the batting side and
    // count how many times its banner is presented; then walk the real
    // exit path (prepare()) into the next at-bat and confirm the banner
    // is gone from the batting screen.
    const drive = kind => page.evaluate(kind => {
      const g = window.__bannerTest.game;
      const stage = document.getElementById('stage-message');
      g.half = g.userHome ? 'bottom' : 'top'; // user batting
      g.outs = 0; g.bases = [false, false, false]; g.baseIds = [null, null, null];
      g.balls = 0; g.strikes = 0; g.field = null; g.hit = null;
      window.__anims.length = 0;
      let en;
      if (kind === 'strikeout') {
        g.strikes = 2;
        g.createPitch(NightGame.TYPES[0], { x: 0, y: 0 });
        g.strike(true);
        en = 'STRIKEOUT';
      } else if (kind === 'walk') {
        g.balls = 3;
        g.createPitch(NightGame.TYPES[0], { x: 0, y: 0 });
        const random = Math.random;
        try { Math.random = () => .99; g.commitCalledPitch(false); } finally { Math.random = random; }
        en = 'WALK';
      } else {
        g.startField(35, 55, 0, false);
        g.finishBall(kind);
        en = { flyout: 'FLY OUT', groundout: 'OUT AT FIRST', single: 'SINGLE', double: 'DOUBLE', hr: 'HOME RUN' }[kind];
      }
      const shown = {
        en: document.getElementById('message-en').textContent,
        cls: stage.className,
        anims: window.__anims.filter(e => e === en).length,
        phase: g.phase,
      };
      // Real exit into the next at-bat.
      g.prepare();
      const next = { cls: stage.className, phase: g.phase, batter: g.batter?.name };
      return { shown, next };
    }, kind);

    const shots = resolve(__dirname, 'screenshots');
    fs.mkdirSync(shots, { recursive: true });
    for (const [kind, en] of [['flyout', 'FLY OUT'], ['groundout', 'OUT AT FIRST'], ['single', 'SINGLE'],
      ['double', 'DOUBLE'], ['hr', 'HOME RUN'], ['strikeout', 'STRIKEOUT'], ['walk', 'WALK']]) {
      const r = await drive(kind);
      assert.equal(r.shown.en, en, `${kind}: the result banner shows ${en} (got ${r.shown.en})`);
      assert(r.shown.cls.includes('show'), `${kind}: banner is shown at the result: ${r.shown.cls}`);
      assert.equal(r.shown.anims, 1, `${kind}: result banner is presented exactly once (got ${r.shown.anims})`);
      assert(!r.next.cls.includes('show'), `${kind}: no result banner on the next at-bat screen (${r.next.phase}): ${r.next.cls}`);
      console.log(`result-banner-once-v159: ${kind} (${en}) presented ${r.shown.anims}x, next at-bat (${r.next.phase}) clean`);
    }

    // Visual record (393x852): a flyout result shows the banner once over
    // the field; after the real exit into the next at-bat the batting
    // screen carries no result banner.
    await page.evaluate(() => {
      const g = window.__bannerTest.game;
      g.half = g.userHome ? 'bottom' : 'top';
      g.outs = 0; g.bases = [false, false, false]; g.baseIds = [null, null, null];
      g.startField(35, 55, 0, false); g.finishBall('flyout');
    });
    await page.waitForTimeout(600);
    try { await page.screenshot({ path: shots + '/result-banner-v159-flyout.png', timeout: 20000, animations: 'disabled' }); } catch {}
    await page.evaluate(() => window.__bannerTest.game.prepare());
    await page.waitForTimeout(600);
    const nextShot = await page.evaluate(() => {
      const stage = document.getElementById('stage-message');
      return { cls: stage.className, phase: window.__bannerTest.game.phase };
    });
    assert(!nextShot.cls.includes('show'), 'visual record state: next at-bat has no banner: ' + nextShot.cls);
    try { await page.screenshot({ path: shots + '/result-banner-v159-next-atbat.png', timeout: 20000, animations: 'disabled' }); } catch {}

    // Duplicate delivery of the same play's result (the log-replay /
    // re-send path): presented once, and the one presentation stays the
    // single existing design.
    const dup = await page.evaluate(() => {
      const g = window.__bannerTest.game;
      g.half = g.userHome ? 'bottom' : 'top';
      g.outs = 1; g.bases = [false, false, false]; g.baseIds = [null, null, null];
      window.__anims.length = 0;
      g.message('FLY OUT', 'フライアウト', 'テスト · 1アウト', 'out');
      g.message('FLY OUT', 'フライアウト', 'テスト · 1アウト', 'out');
      return {
        anims: window.__anims.filter(e => e === 'FLY OUT').length,
        cls: document.getElementById('stage-message').className,
        en: document.getElementById('message-en').textContent,
      };
    });
    assert.equal(dup.anims, 1, 'the same result delivered twice is presented once (got ' + dup.anims + ')');
    assert(dup.cls.includes('show') && dup.cls.includes('out'), 'the single presentation keeps the standard out design: ' + dup.cls);
    console.log('result-banner-once-v159: duplicate delivery of one result presented once');

    // Stale banner: if a new at-bat phase begins while a result banner is
    // still shown (no 'clear' reached it), updateUI must not leave the
    // previous result on the batting screen.
    const stale = await page.evaluate(() => {
      const g = window.__bannerTest.game;
      const stage = document.getElementById('stage-message');
      const before = stage.className;
      g.setPhase('aim'); g.notify();
      const afterAim = stage.className;
      g.setPhase('windup'); g.notify();
      return { before, afterAim, afterWindup: stage.className };
    });
    assert(stale.before.includes('show'), 'precondition: result banner is shown before the phase change');
    assert(!stale.afterAim.includes('show'), 'result banner is hidden once the aim phase begins: ' + stale.afterAim);
    assert(!stale.afterWindup.includes('show'), 'result banner stays hidden into windup: ' + stale.afterWindup);
    console.log('result-banner-once-v159: stale result banner never reaches the batting screen');

    // Pure pitch calls are untouched: BALL still uses the compact
    // pitch-call banner, the same-call animation suppression still
    // applies, and the result guard does not hide pitch calls.
    const call = await page.evaluate(() => {
      const g = window.__bannerTest.game;
      const stage = document.getElementById('stage-message');
      window.__anims.length = 0;
      g.message('BALL', '', '', '', 'ボール。');
      g.message('BALL', '', '', '', 'ボール。');
      const anims = window.__anims.filter(e => e === 'BALL').length;
      g.setPhase('pitch'); g.notify();
      return { anims, cls: stage.className };
    });
    assert.equal(call.anims, 1, 'repeated BALL keeps the existing same-call suppression');
    assert(call.cls.includes('pitch-call') && call.cls.includes('show'),
      'pitch-call banner is not hidden by the result guard: ' + call.cls);
    console.log('result-banner-once-v159: pitch-call behaviour unchanged');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('result-banner-once-v159: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
