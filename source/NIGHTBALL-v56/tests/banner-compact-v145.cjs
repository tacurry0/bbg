// v145: pitch-call banner compact (checker item pitch-call-banner-compact).
// The pitch-call banner (.stage-call inside #stage-message.pitch-call) used
// to stack the English head over the Japanese detail: measured 313.9x109.0px
// at 393px wide (~10.8% of the stage). It is now ONE row — head chip and
// detail side by side with compressed padding — at roughly half the height
// (~50px). This is a dimensions/structure change ONLY: the wording was
// untouched in v145 (same en/ja/sub strings in the same elements, still set
// by the same app.js code). v146 (katakana-call-labels-remove) later changed
// the pitch-call WORDING inside this same layout — the Japanese detail no
// longer carries the call words; see call-labels-v146.cjs — so the wording
// assertions below follow the v146 text. v147 (count-sentence-remove) then
// removed the count notation itself from the pitch-call sub/speech, so the
// live BALL wording assertion below follows the v147 text (sub is empty).
// Non-pitch-call banners (hit/out/homer/career
// intro) keep the original two-row design. The appear animation in app.js
// animates opacity/transform only, so it follows the new size unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const absCss = fs.readFileSync(root + 'abs.css', 'utf8');
const styleCss = fs.readFileSync(root + 'style.css', 'utf8');
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: one-row compact rules, scoped to pitch calls ----------
const compact = absCss.slice(absCss.indexOf('v145: pitch-call banner compact'));
assert(compact.length > 100, 'v145 compact block exists in abs.css');
assert(/#stage-message\.pitch-call \.stage-call\s*\{[^}]*display:\s*flex/.test(compact),
  'pitch-call banner is a single flex row');
assert(/#stage-message\.pitch-call \.stage-call\s*\{[^}]*min-height:\s*50px/.test(compact),
  'pitch-call banner height is pinned near half of the old 109px');
assert(/#stage-message\.pitch-call \.stage-call-head\s*\{[^}]*min-height:\s*0/.test(compact),
  'head no longer forces the old 48px row height in pitch calls');
assert(/#stage-message\.pitch-call \.stage-call-detail\s*\{[^}]*display:\s*flex/.test(compact),
  'detail joins the same row (flex), not a second grid row');
assert(/#stage-message\.pitch-call \.stage-call-detail\s*\{[^}]*margin-right:\s*0/.test(compact),
  'the two-row detail offset (margin-right:15px) is removed in the one-row layout');
assert(/#stage-message\.pitch-call #message-en\s*\{[^}]*white-space:\s*nowrap/.test(compact),
  'English head stays on the single line');
assert(/#stage-message\.pitch-call #message-ja\s*\{[^}]*white-space:\s*nowrap/.test(compact),
  'Japanese detail stays on the single line');

// ---------- static: base two-row design and wording are untouched ----------
assert(/\.stage-call-head\s*\{\s*display:grid[^}]*min-height:48px/.test(styleCss),
  'base head keeps its original two-row metrics for non-pitch-call banners');
assert(/\.stage-call-detail\s*\{\s*display:grid/.test(styleCss),
  'base detail keeps its original grid row for non-pitch-call banners');
assert(index.includes('<div class="stage-call-head"><span id="message-en"></span></div>') &&
  index.includes('<div class="stage-call-detail"><strong id="message-ja"></strong><small id="message-sub"></small></div>'),
  'banner DOM and wording elements are unchanged');
assert(app.includes("$('message-en').textContent=data.en;$('message-ja').textContent=data.ja;$('message-sub').textContent=data.sub||'';"),
  'app.js still writes the same en/ja/sub wording');
assert(app.includes("const pitchCall=['BALL','WALK'].includes(data.en)?'ball':"),
  'pitch-call classification is unchanged');
assert(app.includes("duration:pitchCall?245:impact?230:170"),
  'appear animation timing is unchanged (opacity/transform only, size-agnostic)');

// ---------- version pins (v147 since count-sentence-remove) ----------
assert(index.includes('./game.js?v=150') && index.includes('./app.js?v=150'), 'index pins move to v147');
assert(index.includes('./abs.css?v=8'), 'abs.css pin moves with the compact rules');
assert(sw.includes('nightball-v150-chart-top'), 'SW cache renamed for v147');
assert(sw.includes('./game.js?v=150') && sw.includes('./app.js?v=150') && sw.includes('./abs.css?v=8'),
  'SW precaches the v147 assets');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('banner-compact-v145: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
        if (game) window.__bannerTest = { game, renderer: this };
        return render.call(this, game, time);
      };
      // Record WAAPI appear animations on the banner.
      window.__bannerAnims = [];
      const orig = Element.prototype.animate;
      Element.prototype.animate = function (keyframes, options) {
        if (this.classList && this.classList.contains('stage-call'))
          window.__bannerAnims.push({ duration: options && options.duration, frames: JSON.stringify(keyframes) });
        return orig.call(this, keyframes, options);
      };
    });
    await page.locator('[data-mode="match"]').click();
    await page.locator('[data-action="match-team-next"]').click();
    await page.locator('[data-action="match-lineup"]').click();
    await page.locator('[data-action="lineup-play"]').click();
    await page.waitForFunction(() => !!window.__bannerTest?.game);
    // The intro phase auto-advances on game time (1,400ms), which crawls on
    // throttled headless render loops; beginHalf() is the game's own intro
    // exit, so call it directly and continue from the real aim state.
    await page.evaluate(() => { const g = window.__bannerTest.game; if (g.phase === 'intro') g.beginHalf(); });
    await page.waitForFunction(() => window.__bannerTest?.game.phase === 'aim');
    await page.evaluate(() => document.fonts.ready);

    const take = x => page.evaluate(x => {
      const g = window.__bannerTest.game;
      g.half = g.userHome ? 'bottom' : 'top'; // user batting
      g.balls = 0; g.strikes = 0; g.field = null; g.hit = null;
      g.absRemaining = 0; g.absCpuRemaining = 0; // no ABS review windows here
      g.createPitch(NightGame.TYPES[0], { x, y: 0 });
      g.pitch.delivered = true; g.setPhase('pitch');
      const random = Math.random;
      try { Math.random = () => .99; g.take(); } finally { Math.random = random; }
    }, x);
    const measure = () => page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const vis = el => !!el && !el.hidden && el.getBoundingClientRect().height > 0;
      const stage = document.getElementById('stage-message');
      const banner = stage.querySelector('.stage-call');
      const out = {
        cls: stage.className,
        banner: rect(banner),
        head: rect(banner.querySelector('.stage-call-head')),
        detail: rect(banner.querySelector('.stage-call-detail')),
        en: document.getElementById('message-en').textContent,
        ja: document.getElementById('message-ja').textContent,
        sub: document.getElementById('message-sub').textContent,
        opacity: getComputedStyle(stage).opacity,
        anims: window.__bannerAnims.slice(),
      };
      for (const [k, id] of [['chart', 'atbat-chart'], ['autoDefense', 'auto-defense'], ['pitchDeck', 'pitch-deck'],
        ['fieldSpeed', 'field-speed'], ['batOptions', 'bat-options'], ['absChallenge', 'abs-challenge']]) {
        const el = document.getElementById(id);
        out[k] = vis(el) ? rect(el) : null;
      }
      return out;
    });
    const overlap = (a, b) => !a || !b ? 0 :
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const audit = (m, label) => {
      for (const k of ['chart', 'autoDefense', 'pitchDeck', 'fieldSpeed', 'batOptions', 'absChallenge']) {
        const area = overlap(m.banner, m[k]);
        assert(area <= 1, `${label}: banner must not overlap ${k} (got ${area.toFixed(1)}px^2)`);
        if (m[k]) console.log(`banner-compact-v145: ${label} overlap vs ${k} = ${area.toFixed(1)}px^2`);
      }
    };

    // --- batting state: a taken ball renders the compact one-row banner ---
    await page.evaluate(() => { window.__bannerAnims.length = 0; }); // ignore intro/change animations
    await take(1.6);
    await page.waitForTimeout(400); // appear animation (245ms) finished
    let m = await measure();
    assert(m.cls.includes('pitch-call') && m.cls.includes('pitch-call--ball'), 'ball call uses the pitch-call banner: ' + m.cls);
    assert.equal(m.en, 'BALL'); assert.equal(m.ja, ''); assert.equal(m.sub, '', 'v147 wording: count notation removed from the pitch-call sub: ' + JSON.stringify(m.sub));
    console.log(`banner-compact-v145: pitch-call banner measured ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px (was 313.9x109.0)`);
    assert(m.banner.height >= 40 && m.banner.height <= 65, 'height is about half of 109px: ' + m.banner.height);
    assert(m.banner.height < 109 * 0.6, 'height is well under the old two-row height');
    assert(Math.abs((m.head.top + m.head.bottom) / 2 - (m.detail.top + m.detail.bottom) / 2) < 6,
      'head and detail share one row (centres aligned)');
    assert(m.detail.left >= m.head.right - 16 && m.detail.left < m.head.right + 4,
      'detail sits beside the head, not below it');
    assert.equal(m.anims.length, 1, 'appear animation ran once');
    assert.equal(m.anims[0].duration, 245, 'pitch-call appear animation keeps its 245ms duration');
    assert(m.anims[0].frames.includes('opacity'), 'appear animation is opacity/transform based');
    audit(m, 'batting');

    // --- a strike re-animates; the same call repeated does not ---
    await take(0);
    await page.waitForTimeout(400);
    m = await measure();
    assert(m.cls.includes('pitch-call--strike'), 'strike call recolours the compact banner: ' + m.cls);
    assert.equal(m.anims.length, 2, 'a different pitch call replays the appear animation');
    assert(m.banner.height <= 65, 'strike banner is compact too: ' + m.banner.height);
    // Same-call suppression, checked synchronously so the (slow) game loop
    // cannot interleave a CHANGE banner between the two messages.
    const suppression = await page.evaluate(() => {
      const g = window.__bannerTest.game;
      window.__bannerAnims.length = 0;
      g.message('BALL', '', '', '', 'ボール。');
      g.message('BALL', '', '', '', 'ボール。');
      return { anims: window.__bannerAnims.length, cls: document.getElementById('stage-message').className };
    });
    assert.equal(suppression.anims, 1, 'repeating the same pitch call does not restart the animation');
    assert(suppression.cls.includes('pitch-call'), 'banner stays shown for the repeated call');

    // --- non-pitch-call banners keep the tall two-row design ---
    await page.evaluate(() => window.__bannerTest.game.message('SINGLE', 'ヒット', 'レフト前へ', 'hit'));
    await page.waitForTimeout(400);
    m = await measure();
    assert(!m.cls.includes('pitch-call'), 'hit banner is not a pitch call');
    console.log(`banner-compact-v145: hit banner measured ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px (two-row design kept)`);
    assert(m.banner.height > 80, 'hit banner keeps the original two-row height: ' + m.banner.height);
    assert(m.detail.top >= m.head.bottom - 2, 'hit detail still sits below the head');

    // --- pitching state: the banner shows during pitch/result phases, when
    // the chart and the auto-defense chip are on screen. The pitch deck only
    // appears in the aim phase, which prepare() enters AFTER emitting
    // 'clear' — so banner and deck are never on screen together (checked
    // separately below, in the real sequence). ---
    await page.evaluate(() => {
      const g = window.__bannerTest.game;
      g.half = g.userHome ? 'top' : 'bottom'; // user pitching
      g.setPhase('result'); g.notify();
      g.message('STRIKE', '', '', '', 'ストライク。');
    });
    await page.waitForTimeout(400);
    m = await measure();
    assert(m.cls.includes('pitch-call--strike'), 'pitching-state banner is a pitch call: ' + m.cls);
    assert(m.chart, 'at-bat chart is visible in the pitching state');
    assert(m.autoDefense, 'auto-defense chip is visible in the pitching state');
    console.log(`banner-compact-v145: pitching-state banner ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px, autoDefense=${!!m.autoDefense}, chart=${!!m.chart}`);
    assert(m.banner.height <= 65, 'pitching-state banner is compact: ' + m.banner.height);
    audit(m, 'pitching');

    // Real sequence into the next pitch: prepare() clears the banner first,
    // then the aim phase shows the pitch deck — no shared screen time.
    await page.evaluate(() => window.__bannerTest.game.prepare());
    // The .12s opacity transition needs compositor frames, which are scarce
    // on throttled headless render loops — poll instead of a fixed wait.
    await page.waitForFunction(() => getComputedStyle(document.getElementById('stage-message')).opacity < 0.05,
      null, { timeout: 30000, polling: 400 });
    m = await measure();
    assert(!m.cls.includes('show'), 'prepare() clears the banner before the deck appears: ' + m.cls);
    assert(parseFloat(m.opacity) < 0.05, 'banner is faded out when the pitch deck is shown: ' + m.opacity);
    assert(m.pitchDeck, 'pitch deck is visible in the aim phase after prepare()');
    console.log('banner-compact-v145: pitch deck appears only after the banner clears (real prepare() sequence)');

    // --- disappearance: removing .show fades the banner out as before ---
    await page.evaluate(() => {
      const g = window.__bannerTest.game;
      g.message('BALL', '', '', '', 'ボール。');
      document.getElementById('stage-message').classList.remove('show');
    });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('stage-message')).opacity < 0.05,
      null, { timeout: 30000, polling: 400 });
    m = await measure();
    assert(parseFloat(m.opacity) < 0.05, 'banner fades out when .show is removed: ' + m.opacity);

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('banner-compact-v145: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
