// v146: katakana call labels removed from the pitch-call banner
// (checker item katakana-call-labels-remove).
// The banner's Japanese detail (message-ja + message-sub) for pitch calls
// (BALL / STRIKE / SWING & MISS / WALK, and the ABS call display) no longer
// carries the katakana call words ボール / ストライク: the verdict is read
// from the English head (BALL / STRIKE / ...) and the banner colour
// (pitch-call--ball / pitch-call--strike). (v147, count-sentence-remove,
// later removed the count notation from both display and speech — the
// assertions below follow the v147 text: sub is empty and speech is just
// the call word.) Display text and spoken text are SEPARATE since v146:
// every call message also carries a `speech` field with the original
// wording (call words included), and speakPlay() prefers data.speech, so
// TTS keeps announcing ボール / ストライク / フォアボール exactly as
// before. The umpire-mode call buttons are operation labels, NOT banner
// text, and are deliberately unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const gameSrc = fs.readFileSync(root + 'game.js', 'utf8');
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

const CALL_WORDS = /ボール|ストライク/;
const noCallWords = (label, text) =>
  assert(!CALL_WORDS.test(text), `${label} must not contain a katakana call word: ${text}`);

// ---------- static: display / speech separation in the sources ----------
assert(/message\(en,ja,sub='',kind='',speech=''\)/.test(gameSrc),
  'NightGame.message carries a separate speech field');
assert(gameSrc.includes("this.emit('message',{en,ja,sub,kind,speech})"),
  'the emitted message carries speech alongside the display text');
assert(gameSrc.includes("this.message('BALL','','','','ボール。')"),
  'BALL: display ja/sub are empty (v147: no count notation), speech keeps only the call word');
assert(gameSrc.includes("swung?'空振り':'','','',`${swung?'空振り':'ストライク'}。`"),
  'STRIKE / SWING & MISS: display drops ストライク and the count (v147), speech keeps only the call word');
assert(gameSrc.includes("this.message('WALK','',loaded?'押し出しで1点':'走者が進塁','','フォアボール。'+(loaded?'押し出しで1点':'走者が進塁'))"),
  'WALK: display ja is empty, speech keeps フォアボール');
assert(app.includes("const en=call.umpireStrike?'STRIKE':'BALL',speech=call.umpireStrike?'ストライク':'ボール';"),
  'ABS display keeps the original call word only as speech');
assert(app.includes("onEvent('message',{en,ja:'',speech});"),
  'ABS display sends an empty Japanese line with the call word as speech');
assert(app.includes('const text=data.speech||'),
  'speakPlay prefers the separate speech text over the display text');
assert(app.includes("$('message-en').textContent=data.en;$('message-ja').textContent=data.ja;$('message-sub').textContent=data.sub||'';"),
  'the banner still renders en/ja/sub exactly as supplied (no speech leak into the banner)');
assert(app.includes("const pitchCall=['BALL','WALK'].includes(data.en)?'ball':") &&
  app.includes("['STRIKE','STRIKEOUT','SWING & MISS'].includes(data.en)?'strike':''"),
  'pitch-call colour classification (ball/strike) is unchanged');

// ---------- static: umpire-mode call buttons are out of scope ----------
assert(index.includes('<button id="umpire-ball" type="button">ボール</button>'),
  'umpire BALL button label is unchanged (operation label, not banner text)');
assert(index.includes('<button id="umpire-strike" type="button">ストライク</button>'),
  'umpire STRIKE button label is unchanged (operation label, not banner text)');

// ---------- version pins (v147 since count-sentence-remove) ----------
assert(index.includes('./game.js?v=191') && index.includes('./app.js?v=191'), 'index pins move to v147');
assert(sw.includes('nightball-v191-home-menu'), 'SW cache renamed for v147');
assert(sw.includes('./game.js?v=191') && sw.includes('./app.js?v=191'), 'SW precaches the v146 scripts');

// ---------- game level (Node): emitted messages ----------
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

{ // taken ball
  const { g, call } = takenPitch(1.6);
  assert.equal(call.en, 'BALL');
  noCallWords('BALL ja', call.ja); noCallWords('BALL sub', call.sub);
  assert.equal(call.ja, ''); assert.equal(call.sub, '', 'v147: BALL sub carries no count notation');
  assert.equal(call.speech, 'ボール。', 'BALL speech is only the call word (v147: no count): ' + call.speech);
  assert.equal(g.log.at(-1).speech, call.speech, 'the game log carries the speech text too');
}
{ // taken strike (looking)
  const { call } = takenPitch(0);
  assert.equal(call.en, 'STRIKE');
  noCallWords('STRIKE ja', call.ja); noCallWords('STRIKE sub', call.sub);
  assert.equal(call.ja, ''); assert.equal(call.sub, '', 'v147: STRIKE sub carries no count notation');
  assert.equal(call.speech, 'ストライク。', 'STRIKE speech is only the call word (v147: no count): ' + call.speech);
}
{ // swing and miss
  const msgs = [];
  const g = new NightGame('match', 'standard', (t, v) => { if (t === 'message') msgs.push(v); });
  g.half = g.userHome ? 'bottom' : 'top';
  g.createPitch(NightGame.TYPES[0], { x: 0, y: 0 });
  g.pitch.delivered = true; g.setPhase('pitch'); g.strike(true);
  const call = msgs.at(-1);
  assert.equal(call.en, 'SWING & MISS');
  assert.equal(call.ja, '空振り', '空振り is a swing description, not a call word, and stays');
  noCallWords('SWING & MISS sub', call.sub);
  assert.equal(call.sub, '', 'v147: SWING & MISS sub carries no count notation');
  assert.equal(call.speech, '空振り。', 'SWING & MISS speech is only the swing word (v147: no count): ' + call.speech);
}
{ // ball four: walk
  const { call } = takenPitch(1.6, 3, 0);
  assert.equal(call.en, 'WALK');
  noCallWords('WALK ja', call.ja); noCallWords('WALK sub', call.sub);
  assert.equal(call.ja, ''); assert.equal(call.sub, '走者が進塁');
  assert(call.speech.includes('フォアボール'), 'WALK speech keeps フォアボール: ' + call.speech);
}
console.log('call-labels-v146: game-level assertions passed');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('call-labels-v146: playwright unavailable in this environment — browser checks skipped, static/game assertions passed'); return; }
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
    // TTS capture + tts:on BEFORE any page script runs.
    await context.addInitScript(() => {
      window.__utterances = [];
      // The native speechSynthesis / SpeechSynthesisUtterance are
      // getter-only in Chromium, so plain assignment silently fails;
      // defineProperty is required to install the capture stub.
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } }, configurable: true });
      Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(u) { window.__utterances.push(u.text); } }, configurable: true });
      try { localStorage.setItem('nightball.settings', JSON.stringify({ tts: true })); } catch {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      const { StadiumRenderer } = await import('./stadium3d.js?v=81');
      const render = StadiumRenderer.prototype.render;
      StadiumRenderer.prototype.render = function (game, time) {
        if (game) window.__callTest = { game, renderer: this };
        return render.call(this, game, time);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__callTest?.game);
    await page.evaluate(() => { const g = window.__callTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__callTest?.game.phase === 'aim');
    await page.evaluate(() => document.fonts.ready);

    const take = (x, balls = 0, strikes = 0) => page.evaluate(([x, balls, strikes]) => {
      const g = window.__callTest.game;
      g.half = g.userHome ? 'bottom' : 'top'; // user batting
      g.balls = balls; g.strikes = strikes; g.field = null; g.hit = null;
      g.absRemaining = 0; g.absCpuRemaining = 0;
      g.createPitch(NightGame.TYPES[0], { x, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random;
      try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
    }, [x, balls, strikes]);
    const banner = () => page.evaluate(() => {
      const stage = document.getElementById('stage-message');
      const el = stage.querySelector('.stage-call');
      const r = el.getBoundingClientRect();
      return {
        cls: stage.className, height: r.height,
        en: document.getElementById('message-en').textContent,
        ja: document.getElementById('message-ja').textContent,
        sub: document.getElementById('message-sub').textContent,
        jaVisible: getComputedStyle(document.getElementById('message-ja')).display !== 'none',
      };
    });

    // --- taken ball: English head + colour carry the verdict ---
    await take(1.6);
    await page.waitForTimeout(400);
    let m = await banner();
    assert.equal(m.en, 'BALL'); assert(m.cls.includes('pitch-call--ball'), 'ball colour class kept: ' + m.cls);
    assert.equal(m.ja, ''); noCallWords('banner BALL ja+sub', m.ja + m.sub);
    assert.equal(m.sub, '', 'v147: count notation is gone from the banner sub');
    assert(!m.jaVisible, 'empty Japanese line is hidden so the one-row banner does not collapse or leave a gap');
    assert(m.height >= 40 && m.height <= 65, 'v145 one-row banner height is intact: ' + m.height);

    // --- taken strike ---
    await take(0);
    await page.waitForTimeout(400);
    m = await banner();
    assert.equal(m.en, 'STRIKE'); assert(m.cls.includes('pitch-call--strike'), 'strike colour class kept: ' + m.cls);
    assert.equal(m.ja, ''); noCallWords('banner STRIKE ja+sub', m.ja + m.sub);
    assert.equal(m.sub, '', 'v147: STRIKE banner sub is empty');

    // --- ABS call display: same separation ---
    await page.evaluate(() => {
      const g = window.__callTest.game;
      g.absRemaining = 2;
      g.absCall = { x: 0, y: 0, gap: -.01, strike: true, umpireStrike: true, cpu: false, remote: false };
      g.setPhase('abs-call'); g.notify();
    });
    await page.waitForFunction(() => document.getElementById('message-en').textContent === 'STRIKE' &&
      document.getElementById('stage-message').classList.contains('pitch-call'), null, { timeout: 10000 });
    m = await banner();
    assert.equal(m.ja, ''); assert.equal(m.sub, '');
    noCallWords('banner ABS ja+sub', m.ja + m.sub);
    assert(m.height >= 40 && m.height <= 65, 'ABS banner keeps the one-row height with an empty Japanese line: ' + m.height);

    // --- TTS: the walk is speakable, and its utterance keeps the call word
    // even though the banner's Japanese line is empty ---
    await page.evaluate(() => { window.__utterances.length = 0; });
    await take(1.6, 3, 0);
    await page.waitForTimeout(400);
    m = await banner();
    assert.equal(m.en, 'WALK'); noCallWords('banner WALK ja+sub', m.ja + m.sub);
    const utterances = await page.evaluate(() => window.__utterances);
    assert(utterances.some(t => t.includes('フォアボール')),
      'TTS utterance keeps the original call wording: ' + JSON.stringify(utterances));

    // --- umpire-mode call buttons unchanged in the live DOM ---
    const buttons = await page.evaluate(() => ({
      ball: document.getElementById('umpire-ball').textContent,
      strike: document.getElementById('umpire-strike').textContent,
    }));
    assert.equal(buttons.ball, 'ボール'); assert.equal(buttons.strike, 'ストライク');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('call-labels-v146: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
