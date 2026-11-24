// v147: count sentence removed from pitch-call banners
// (checker item count-sentence-remove).
// Since v146 the BALL / STRIKE / SWING & MISS banner sub carried a redundant
// "B n · S n" count notation, and the TTS speech carried the matching
// "○ボール · ○ストライク" count sentence — even though the scoreboard
// B/S/O lamps already show the count at all times. v147 removes the count
// from BOTH the display sub (now empty; the existing :empty rule hides the
// element so the one-row banner does not collapse) and the speech (the
// call word itself — ボール。/ ストライク。/ 空振り。 — stays, so TTS
// still announces the verdict). WALK is different: its sub/speech carry a
// situation explanation (押し出しで1点 / 走者が進塁), not a count, and are
// kept verbatim. The ABS call display (app.js updateAbsUI) never carried a
// count notation, and is asserted to stay that way. The scoreboard count
// lamps themselves are unchanged and keep updating.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const gameSrc = fs.readFileSync(root + 'game.js', 'utf8');
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

const COUNT_NOTATION = /B \d+ · S \d+|\d+ボール|\d+ストライク/;
const noCount = (label, text) =>
  assert(!COUNT_NOTATION.test(text || ''), `${label} must not contain a count notation: ${text}`);

// ---------- static: the two game.js call sites ----------
assert(gameSrc.includes("this.message('BALL','','','','ボール。')"),
  'BALL: display ja/sub empty, speech is only the call word');
assert(gameSrc.includes("swung?'空振り':'','','',`${swung?'空振り':'ストライク'}。`"),
  'STRIKE / SWING & MISS: display ja/sub empty, speech is only the call word');
assert(!gameSrc.includes('`B ${this.balls} · S ${this.strikes}`'),
  'no message builds a "B n · S n" sub any more');
assert(!gameSrc.includes('${this.balls}ボール · ${this.strikes}ストライク'),
  'no speech builds a "○ボール · ○ストライク" count sentence any more');
assert(gameSrc.includes("this.message('WALK','',loaded?'押し出しで1点':'走者が進塁','','フォアボール。'+(loaded?'押し出しで1点':'走者が進塁'))"),
  'WALK: situation explanation is kept in both display sub and speech (not a count)');

// ---------- static: ABS display carries no count notation ----------
const absStart = app.indexOf('function updateAbsUI');
assert(absStart >= 0, 'updateAbsUI exists in app.js');
const absBlock = app.slice(absStart, absStart + 2500);
noCount('ABS updateAbsUI block', absBlock.replace(/absRemaining/g, ''));
assert(absBlock.includes("onEvent('message',{en,ja:'',speech});"),
  'ABS display still sends only en + speech (no sub, hence no count)');

// ---------- static: empty sub is hidden, banner does not collapse ----------
const styleCss = fs.readFileSync(root + 'style.css', 'utf8');
assert(styleCss.includes('.stage-call-detail :is(strong,small):empty { display:none; }'),
  'the existing :empty rule hides an empty sub line');

// ---------- static: scoreboard count lamps are untouched ----------
assert(app.includes("[['B',g.balls,3,'b'],['S',g.strikes,2,'s'],['O',g.outs,3,'o']]"),
  'scoreboard still renders the B/S/O lamp groups from the live count');

// ---------- v147 version pins ----------
assert(index.includes('./game.js?v=159') && index.includes('./app.js?v=159'), 'index pins move to v147');
assert(sw.includes('nightball-v159-result-banner-once'), 'SW cache renamed for v147');
assert(sw.includes('./game.js?v=159') && sw.includes('./app.js?v=159'), 'SW precaches the v147 scripts');

// ---------- game level (Node): emitted messages + live count state ----------
global.window = global;
for (const file of ['ratings-data', 'players', 'pennant', 'game']) require(root + file + '.js');

function takenPitch(x, balls = 0, strikes = 0) {
  const msgs = [];
  const g = new NightGame('match', 'standard', (t, v) => { if (t === 'message') msgs.push(v); });
  g.half = g.userHome ? 'bottom' : 'top'; // user batting
  g.balls = balls; g.strikes = strikes; g.field = null; g.hit = null;
  g.absRemaining = 0; g.absCpuRemaining = 0; // no ABS window: commit the umpire call directly
  g.createPitch(NightGame.TYPES[0], { x, y: 0 });
  g.pitch.delivered = true; g.setPhase('pitch');
  const random = Math.random;
  try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
  return { g, call: msgs.at(-1) };
}

{ // taken ball: no count anywhere, call word stays in speech, count state advances
  const { g, call } = takenPitch(1.6, 1, 1);
  assert.equal(call.en, 'BALL');
  assert.equal(call.ja, ''); assert.equal(call.sub, '');
  noCount('BALL ja+sub', call.ja + call.sub);
  assert.equal(call.speech, 'ボール。');
  noCount('BALL speech', call.speech);
  assert.equal(g.balls, 2, 'internal ball count still advances (scoreboard lamps read this)');
  assert.equal(g.strikes, 1, 'strike count is untouched by a ball');
  assert.equal(g.log.at(-1).sub, '', 'the game log sub carries no count either');
  assert.equal(g.log.at(-1).speech, 'ボール。', 'history modal (speech-first) shows the call word, no count');
}
{ // taken strike (looking)
  const { g, call } = takenPitch(0, 2, 0);
  assert.equal(call.en, 'STRIKE');
  assert.equal(call.ja, ''); assert.equal(call.sub, '');
  noCount('STRIKE ja+sub', call.ja + call.sub);
  assert.equal(call.speech, 'ストライク。');
  noCount('STRIKE speech', call.speech);
  assert.equal(g.balls, 2); assert.equal(g.strikes, 1, 'internal strike count still advances');
}
{ // swing and miss
  const msgs = [];
  const g = new NightGame('match', 'standard', (t, v) => { if (t === 'message') msgs.push(v); });
  g.half = g.userHome ? 'bottom' : 'top';
  g.balls = 1; g.strikes = 1;
  g.createPitch(NightGame.TYPES[0], { x: 0, y: 0 });
  g.pitch.delivered = true; g.setPhase('pitch'); g.strike(true);
  const call = msgs.at(-1);
  assert.equal(call.en, 'SWING & MISS');
  assert.equal(call.ja, '空振り', '空振り is a swing description, not a count, and stays');
  assert.equal(call.sub, '');
  noCount('SWING & MISS ja+sub', call.ja + call.sub);
  assert.equal(call.speech, '空振り。');
  noCount('SWING & MISS speech', call.speech);
  assert.equal(g.strikes, 2, 'internal strike count still advances on a swing and miss');
}
{ // ball four: walk keeps its situation explanation
  const { call } = takenPitch(1.6, 3, 0);
  assert.equal(call.en, 'WALK');
  assert.equal(call.sub, '走者が進塁', 'WALK situation explanation stays in the display sub');
  assert.equal(call.speech, 'フォアボール。走者が進塁', 'WALK speech keeps call word + situation');
  noCount('WALK sub+speech', call.sub + call.speech);
}
{ // bases loaded walk: run-scoring explanation stays
  const msgs = [];
  const g = new NightGame('match', 'standard', (t, v) => { if (t === 'message') msgs.push(v); });
  g.half = g.userHome ? 'bottom' : 'top';
  g.balls = 3; g.strikes = 0; g.bases = [g.batter, g.batter, g.batter]; g.field = null; g.hit = null;
  g.absRemaining = 0; g.absCpuRemaining = 0;
  g.createPitch(NightGame.TYPES[0], { x: 1.6, y: 0 });
  g.pitch.delivered = true; g.setPhase('pitch');
  const random = Math.random;
  try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
  const call = msgs.find(m => m.en === 'WALK');
  assert(call, 'a WALK message is emitted');
  assert.equal(call.sub, '押し出しで1点', 'loaded-walk explanation stays');
  assert(call.speech.includes('押し出しで1点'), 'loaded-walk speech keeps the explanation');
}
console.log('count-sentence-v147: game-level assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('count-sentence-v147: playwright unavailable in this environment — browser checks skipped, static/game assertions passed'); return; }
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
        if (game) window.__countTest = { game, renderer: this };
        return render.call(this, game, time);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__countTest?.game);
    await page.evaluate(() => { const g = window.__countTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__countTest?.game.phase === 'aim');
    await page.evaluate(() => document.fonts.ready);

    const take = (x, balls = 0, strikes = 0) => page.evaluate(([x, balls, strikes]) => {
      const g = window.__countTest.game;
      g.half = g.userHome ? 'bottom' : 'top'; // user batting
      g.balls = balls; g.strikes = strikes; g.field = null; g.hit = null;
      g.absRemaining = 0; g.absCpuRemaining = 0;
      g.createPitch(NightGame.TYPES[0], { x, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random;
      try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
    }, [x, balls, strikes]);
    const snapshot = () => page.evaluate(() => {
      const stage = document.getElementById('stage-message');
      const el = stage.querySelector('.stage-call');
      const r = el.getBoundingClientRect();
      const lamps = sel => document.querySelectorAll(`#count .count-group.${sel} i.on`).length;
      return {
        cls: stage.className, height: r.height,
        en: document.getElementById('message-en').textContent,
        ja: document.getElementById('message-ja').textContent,
        sub: document.getElementById('message-sub').textContent,
        subDisplay: getComputedStyle(document.getElementById('message-sub')).display,
        lampB: lamps('b'), lampS: lamps('s'),
        countLabel: document.getElementById('count').getAttribute('aria-label'),
      };
    });

    // --- taken ball (from 1-1): banner shows no count, lamps show 2-1 ---
    await take(1.6, 1, 1);
    await page.waitForTimeout(400);
    let m = await snapshot();
    assert.equal(m.en, 'BALL');
    assert.equal(m.ja, ''); assert.equal(m.sub, '');
    noCount('banner BALL', m.ja + m.sub);
    assert.equal(m.subDisplay, 'none', 'empty sub is hidden by the :empty rule, banner does not break');
    assert(m.height >= 40 && m.height <= 65, 'one-row banner height is intact with an empty sub: ' + m.height);
    assert.equal(m.lampB, 2, 'scoreboard B lamps still update: ' + m.countLabel);
    assert.equal(m.lampS, 1, 'scoreboard S lamps still update: ' + m.countLabel);

    // --- taken strike (from 2-0): banner shows no count, lamps show 2-1 ---
    await take(0, 2, 0);
    await page.waitForTimeout(400);
    m = await snapshot();
    assert.equal(m.en, 'STRIKE');
    assert.equal(m.ja, ''); assert.equal(m.sub, '');
    noCount('banner STRIKE', m.ja + m.sub);
    assert.equal(m.lampB, 2); assert.equal(m.lampS, 1);

    // --- walk: situation explanation remains on the banner ---
    await take(1.6, 3, 0);
    await page.waitForTimeout(400);
    m = await snapshot();
    assert.equal(m.en, 'WALK');
    assert.equal(m.sub, '走者が進塁', 'WALK banner keeps its situation explanation');
    assert.notEqual(m.subDisplay, 'none', 'non-empty WALK sub is visible');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('count-sentence-v147: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
