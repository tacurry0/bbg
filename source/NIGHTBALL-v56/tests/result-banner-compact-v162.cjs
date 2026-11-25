// v162: result banner compact (real-device feedback: batted-ball result
// banners — FLY OUT etc. — were still the old two-row design, English
// head + katakana restatement + detail, measured 295.1x103.1px at 393px
// wide, while pitch calls have been a one-row ~50px banner since v145;
// the user reads both as the same oversized display).
//
// Fix: app.js adds a .result-compact class for kind hit/out messages
// that are neither pitch calls (already compact since v145, STRIKEOUT /
// WALK included) nor HOME RUN (its banner belongs to the home-run
// celebration, with the separate full-screen #hr-celebration overlay —
// deliberately NOT shrunk, like the walk-off / championship overlays).
// style.css gives .result-compact the pitch-call one-row layout:
// shrink-wrapped width, ~50px height, head chip + one small detail line
// side by side. A Japanese line that merely restates the English head
// (フライアウト / ヒット / ツーベース / ...) is not rendered — display
// only, following the v146 display/TTS split: data.ja, the game log
// (history modal) and TTS wording are untouched. Japanese lines that add
// information (タッチアップで生還, タッチアウト, ...) stay as the detail
// line. The v161 no-empty-band rule extends to results: a suppressed ja
// plus an empty sub renders no detail container at all. The v159
// once-only dedup / phase guard is untouched and re-verified here.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const app = fs.readFileSync(root + 'app.js', 'utf8');
const game = fs.readFileSync(root + 'game.js', 'utf8');
const styleCss = fs.readFileSync(root + 'style.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: compact result layout ----------
assert(styleCss.includes('v162: result banner compact'), 'v162 root-cause note is recorded in style.css');
const callRule = styleCss.match(/#stage-message\.result-compact \.stage-call\s*\{[^}]*\}/);
assert(callRule && /display:\s*flex/.test(callRule[0]) && /width:\s*fit-content/.test(callRule[0]) && /min-height:\s*50px/.test(callRule[0]),
  'result banner is a shrink-wrapped one-row flex banner ~50px tall');
assert(/#stage-message\.result-compact \.stage-call-detail\[hidden\]\s*\{\s*display:\s*none/.test(styleCss),
  'a hidden result detail is not rendered (v161 no-empty-band rule)');
assert(/#stage-message\.result-compact #message-ja\[hidden\]\s*\{\s*display:\s*none/.test(styleCss),
  'a suppressed duplicate ja line is not rendered');
assert(/#stage-message\.result-compact #message-sub\s*\{[^}]*white-space:\s*nowrap/.test(styleCss),
  'the result detail is a single line');

// ---------- static: app.js wiring ----------
assert(app.includes('const RESULT_JA_DUP='), 'duplicate-ja table exists');
assert(app.includes("'FLY OUT':['フライアウト']") && app.includes("'SINGLE':['ヒット']") && app.includes("'DOUBLE':['ツーベース']"),
  'the headline duplicate lines are listed');
assert(app.includes("const resultCompact=!pitchCall&&['hit','out'].includes(kind)&&data.en!=='HOME RUN';"),
  'compact applies to hit/out results, excluding pitch calls and HOME RUN');
assert(app.includes("?' result-compact':''"), 'stage gets the result-compact class');
assert(app.includes("$('message-ja').hidden=jaDup;"), 'app.js hides only the duplicate ja line, display-side');
assert(app.includes('detailEl.hidden=(!!pitchCall||resultCompact)'),
  'empty details are not rendered for results either (v161 rule extended)');
// Display/TTS/history split: the engine wording itself is unchanged, so
// the log (history modal) and TTS (speech || ja) keep the full text.
assert(game.includes("'FLY OUT'") && game.includes('フライアウト'), 'engine still emits the full Japanese wording');
assert(app.includes('const text=data.speech||(data.ja?'), 'TTS still reads speech || ja from the untouched data');
// v159 once-only machinery untouched.
assert(app.includes('function resultSignature(data)') && app.includes('function hideStaleResultBanner()'),
  'v159 dedup / phase guard is still present');

// ---------- version pins (v162) ----------
assert(index.includes('./game.js?v=186') && index.includes('./app.js?v=186'), 'index pins at v162');
assert(index.includes('./style.css?v=77'), 'style.css pin bumped for the v162 CSS change');
assert(sw.includes('nightball-v186-pitch-guide'), 'SW cache renamed for v162');
assert(sw.includes('./game.js?v=186') && sw.includes('./app.js?v=186') && sw.includes('./style.css?v=77'),
  'SW precaches the v162 assets');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('result-banner-compact-v162: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
    await page.evaluate(() => document.fonts.ready);

    const show = (args) => page.evaluate((a) => {
      const g = window.__bannerTest.game;
      g.phase = 'result'; // keep the v159 stale-result guard out of the measurement
      g.message(a.en, a.ja, a.sub, a.kind || '', a.speech || '');
    }, args);
    const measure = () => page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const stage = document.getElementById('stage-message');
      const banner = stage.querySelector('.stage-call');
      const detail = banner.querySelector('.stage-call-detail');
      const ja = document.getElementById('message-ja');
      const sub = document.getElementById('message-sub');
      const g = window.__bannerTest.game;
      return {
        cls: stage.className,
        stage: rect(stage), banner: rect(banner), head: rect(banner.querySelector('.stage-call-head')), detail: rect(detail),
        detailDisplay: getComputedStyle(detail).display, detailHidden: detail.hidden,
        en: document.getElementById('message-en').textContent,
        ja: ja.textContent, jaHidden: ja.hidden, jaDisplay: getComputedStyle(ja).display, jaRect: rect(ja),
        sub: sub.textContent, subRect: rect(sub),
        logJa: g.log.at(-1)?.ja, logEn: g.log.at(-1)?.en,
        anims: window.__anims.slice(),
      };
    });
    const shotDir = resolve(__dirname, 'screenshots');
    fs.mkdirSync(shotDir, { recursive: true });
    const snap = async (name) => {
      await page.evaluate(() => {
        const g = window.__bannerTest.game; if (g) g.paused = true;
        document.querySelector('.stage-call').getAnimations().forEach(a => { try { a.finish(); } catch {} });
      });
      await page.waitForTimeout(250);
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await page.screenshot({ path: shotDir + '/result-banner-compact-v162-' + name + '.png', timeout: 90000 }); break; }
        catch (e) { if (attempt === 1) console.log('result-banner-compact-v162: screenshot ' + name + ' skipped (' + e.name + ')'); }
      }
      await page.evaluate(() => { const g = window.__bannerTest.game; if (g) g.paused = false; });
    };
    const checkCompact = async (label, args, shot) => {
      await show(args); await page.waitForTimeout(400);
      const m = await measure();
      assert(m.cls.includes('result-compact') && !m.cls.includes('pitch-call'), label + ': result-compact (not pitch-call): ' + m.cls);
      assert.equal(m.en, args.en, label + ': head text');
      assert(m.banner.height >= 40 && m.banner.height <= 65,
        label + ': one-row compact height (was 103.1px): ' + m.banner.height.toFixed(1));
      assert(m.banner.width < m.stage.width, label + ': banner does not cover the stage width');
      if (shot) await snap(shot);
      console.log(`result-banner-compact-v162: ${label} banner ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px (was 295.1x103.1) ja=${JSON.stringify(m.ja)} jaDisplay=${m.jaDisplay} sub=${JSON.stringify(m.sub)}`);
      return m;
    };

    // Fly out: katakana restatement suppressed, detail survives as one line.
    const fly = await checkCompact('FLY OUT', { en: 'FLY OUT', ja: 'フライアウト', sub: 'センターへのフライ · 105 m · 1アウト', kind: 'out' }, 'flyout');
    assert.equal(fly.jaHidden, true, 'FLY OUT: duplicate ja line carries the hidden flag');
    assert.equal(fly.jaDisplay, 'none', 'FLY OUT: duplicate ja line is not rendered');
    assert.equal(fly.jaRect.width, 0, 'FLY OUT: duplicate ja line has zero rendered width');
    assert.equal(fly.ja, 'フライアウト', 'FLY OUT: ja text itself is untouched (history/TTS keep it)');
    assert.equal(fly.logJa, 'フライアウト', 'FLY OUT: game log keeps the full Japanese wording for the history modal');
    assert.notEqual(fly.detailDisplay, 'none', 'FLY OUT: detail with real text renders');
    assert(fly.sub.includes('105 m') && fly.sub.includes('1アウト'), 'FLY OUT: detail line keeps distance and out count');
    assert(Math.abs((fly.head.top + fly.head.bottom) / 2 - (fly.detail.top + fly.detail.bottom) / 2) < 6,
      'FLY OUT: head and detail share one row');
    assert(fly.detail.left >= fly.head.right - 16 && fly.detail.left < fly.head.right + 4,
      'FLY OUT: detail sits directly beside the head');

    // Ground out: the send-to-first sentence restates OUT AT FIRST.
    const ground = await checkCompact('OUT AT FIRST', { en: 'OUT AT FIRST', ja: '一塁へ送球、アウト！', sub: '95 m · 1アウト', kind: 'out' });
    assert.equal(ground.jaDisplay, 'none', 'OUT AT FIRST: restatement ja line is not rendered');
    assert(ground.sub.includes('1アウト'), 'OUT AT FIRST: detail line is shown');

    // Hits: katakana restatements suppressed, detail line shown.
    const single = await checkCompact('SINGLE', { en: 'SINGLE', ja: 'ヒット', sub: 'レフト前へ · 88 m', kind: 'hit' }, 'single');
    assert.equal(single.jaDisplay, 'none', 'SINGLE: ヒット is not rendered');
    assert(single.sub.includes('レフト前へ'), 'SINGLE: detail line is shown');
    const dbl = await checkCompact('DOUBLE', { en: 'DOUBLE', ja: 'ツーベース', sub: '右中間 · 118 m', kind: 'hit' });
    assert.equal(dbl.jaDisplay, 'none', 'DOUBLE: ツーベース is not rendered');

    // A ja line that adds information stays, as the single detail line.
    const sac = await checkCompact('SACRIFICE FLY (tag-up run)', { en: 'SACRIFICE FLY', ja: 'タッチアップで生還', sub: 'ライトへのフライ · 98 m · 2アウト · 1点', kind: 'out' });
    assert.equal(sac.jaHidden, false, 'SACRIFICE FLY: informative ja line is kept');
    assert.notEqual(sac.jaDisplay, 'none', 'SACRIFICE FLY: informative ja line renders');
    assert(sac.jaRect.width > 30, 'SACRIFICE FLY: ja line has real width');

    // Suppressed ja + empty sub: no detail container, no empty band.
    const bare = await checkCompact('FLY OUT (no detail)', { en: 'FLY OUT', ja: 'フライアウト', sub: '', kind: 'out' });
    assert.equal(bare.detailDisplay, 'none', 'empty result detail is not rendered (no empty band)');
    assert.equal(bare.detailHidden, true, 'empty result detail carries the hidden flag');
    assert(Math.abs(bare.banner.width - bare.head.width) <= 16,
      'bare result banner shrink-wraps the head chip: ' + bare.banner.width.toFixed(1) + ' vs ' + bare.head.width.toFixed(1));

    // Strikeout: pitch-call since v145 — compact already, ja kept, and
    // NOT result-compact (the two layouts must not fight).
    await show({ en: 'STRIKEOUT', ja: '見逃し三振！', sub: '1アウト', kind: 'out' }); await page.waitForTimeout(400);
    const so = await measure();
    assert(so.cls.includes('pitch-call') && !so.cls.includes('result-compact'), 'STRIKEOUT keeps pitch-call styling only: ' + so.cls);
    assert(so.banner.height >= 40 && so.banner.height <= 65, 'STRIKEOUT is one-row compact: ' + so.banner.height.toFixed(1));
    assert.equal(so.jaHidden, false, 'STRIKEOUT: 見逃し三振！ (swinging/looking info) is kept');
    await snap('strikeout');
    console.log(`result-banner-compact-v162: STRIKEOUT banner ${so.banner.width.toFixed(1)}x${so.banner.height.toFixed(1)}px ja=${JSON.stringify(so.ja)}`);

    // HOME RUN: excluded on purpose — the celebration banner keeps the
    // two-row design (the full-screen celebration overlay is separate).
    await show({ en: 'HOME RUN', ja: 'ホームラン！', sub: '128 m', kind: 'homer' }); await page.waitForTimeout(400);
    const hr = await measure();
    assert(!hr.cls.includes('result-compact'), 'HOME RUN banner is not compacted (celebration)');
    assert(hr.banner.height > 80, 'HOME RUN banner keeps the two-row celebration height: ' + hr.banner.height.toFixed(1));
    assert.equal(hr.jaHidden, false, 'HOME RUN: ja line is kept');

    // v159 non-regression: the same result delivered twice is shown once.
    const before = (await measure()).anims.filter(e => e === 'FLY OUT').length;
    await page.evaluate(() => {
      const g = window.__bannerTest.game; g.phase = 'result';
      g.message('FLY OUT', 'フライアウト', ' dedup-check · 3アウト', 'out');
      g.message('FLY OUT', 'フライアウト', ' dedup-check · 3アウト', 'out');
    });
    await page.waitForTimeout(400);
    const after = await measure();
    assert.equal(after.anims.filter(e => e === 'FLY OUT').length - before, 1,
      'v159: the same result is presented exactly once (anims: ' + JSON.stringify(after.anims) + ')');
    assert(after.cls.includes('show') && after.cls.includes('result-compact'), 'deduped result still shows once, compact');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('result-banner-compact-v162: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
