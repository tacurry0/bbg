// v161: pitch-call banner empty dark band removed (real-device feedback).
//
// Root cause: the v145 one-row pitch-call layout gave .stage-call a fixed
// width (min(94%,360px)) and .stage-call-detail `flex: 1`. Since v146/v147
// the Japanese detail of BALL / STRIKE / SWING & MISS is empty, but only
// the empty strong/small CHILDREN were hidden (style.css :empty rule);
// the detail CONTAINER kept its --call-panel background, padding and
// flex growth, so it painted as an empty dark-brown band stretching to
// the banner's fixed width beside the head chip.
//
// Fix: abs.css — the pitch-call banner shrink-wraps its content
// (width: fit-content, capped at min(94%,360px)), the detail no longer
// grows (flex: 0 1 auto), and a detail whose ja and sub are both empty is
// display:none (the :has() rule, plus the [hidden] rule). app.js —
// onEvent sets the detail element's hidden flag for pitch calls with an
// entirely empty ja/sub; details with real text (WALK situation line,
// STRIKEOUT) and all non-pitch-call banners are untouched. The v159
// result-banner dedup / phase guard is not modified.
//
// This test measures the REAL rendered geometry at 393x852 for every
// pitch-call pattern and saves screenshots for visual inspection.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const absCss = fs.readFileSync(root + 'abs.css', 'utf8');
const app = fs.readFileSync(root + 'app.js', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- static: the band cannot be painted ----------
assert(absCss.includes('v161: pitch-call banner empty band removed'), 'v161 root-cause note is recorded in abs.css');
const callRule = absCss.match(/#stage-message\.pitch-call \.stage-call\s*\{[^}]*\}/);
assert(callRule && /width:\s*fit-content/.test(callRule[0]), 'pitch-call banner shrink-wraps its content (fit-content)');
assert(callRule && /max-width:\s*min\(94%, 360px\)/.test(callRule[0]), 'pitch-call banner width is still capped');
assert(!/#stage-message\.pitch-call \.stage-call\s*\{[^}]*[;{]\s*width:\s*min\(94%, 360px\)/.test(absCss),
  'the old fixed stage-wide banner width is gone');
const detailRule = absCss.match(/#stage-message\.pitch-call \.stage-call-detail\s*\{[^}]*\}/);
assert(detailRule && /flex:\s*0 1 auto/.test(detailRule[0]), 'detail no longer grows to fill the banner (flex: 0 1 auto)');
assert(!/#stage-message\.pitch-call \.stage-call-detail\s*\{[^}]*flex:\s*1[;\s}]/.test(absCss),
  'the old flex:1 detail growth is gone');
assert(/#stage-message\.pitch-call \.stage-call-detail\[hidden\]\s*\{\s*display:\s*none/.test(absCss),
  'a hidden pitch-call detail is not rendered');
assert(/#stage-message\.pitch-call \.stage-call-detail:has\(> strong:empty\):has\(> small:empty\)\s*\{\s*display:\s*none/.test(absCss),
  'CSS-only fallback hides a detail whose ja and sub are both empty');
assert(app.includes('detailEl.hidden=(!!pitchCall||resultCompact)&&!(jaDup?\'\':String(data.ja||\'\').trim())&&!String(data.sub||\'\').trim()'),
  'app.js hides the detail element for pitch calls (v161) and compact results (v162) with an entirely empty detail');
assert(app.includes('stageResultShown'), 'v159 result-banner dedup machinery is still present (untouched by v161)');

// ---------- version pins (v161) ----------
assert(index.includes('./game.js?v=167') && index.includes('./app.js?v=167'), 'index pins at v161');
assert(index.includes('./abs.css?v=9'), 'abs.css pin bumped for the v161 CSS change');
assert(sw.includes('nightball-v167-back-guard'), 'SW cache renamed for v161');
assert(sw.includes('./game.js?v=167') && sw.includes('./app.js?v=167') && sw.includes('./abs.css?v=9'),
  'SW precaches the v161 assets');

// ---------- browser behaviour (393x852) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('call-banner-band-v161: playwright unavailable — browser checks skipped, static assertions passed'); return; }
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
      g.phase = 'result'; // keep the v159 stale-result guard out of this measurement
      g.message(a.en, a.ja, a.sub, a.kind || '', a.speech || '');
    }, args);
    const measure = () => page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const stage = document.getElementById('stage-message');
      const banner = stage.querySelector('.stage-call');
      const detail = banner.querySelector('.stage-call-detail');
      return {
        cls: stage.className,
        stage: rect(stage), banner: rect(banner), head: rect(banner.querySelector('.stage-call-head')), detail: rect(detail),
        detailDisplay: getComputedStyle(detail).display, detailHidden: detail.hidden,
        en: document.getElementById('message-en').textContent,
        ja: document.getElementById('message-ja').textContent,
        sub: document.getElementById('message-sub').textContent,
      };
    });
    const shotDir = resolve(__dirname, 'screenshots');
    fs.mkdirSync(shotDir, { recursive: true });
    // Headless Chromium throttles rAF, so the banner's WAAPI appear
    // animation sits at currentTime 0 (opacity 0) forever; finish it
    // before screenshotting so the shot shows the banner's settled state,
    // exactly as a real device shows it after the 245ms animation.
    const snap = async (name) => {
      // Pause the engine first so its phase progression cannot emit
      // 'clear' and hide the banner while the screenshot is taken.
      await page.evaluate(() => {
        const g = window.__bannerTest.game; if (g) g.paused = true;
        document.querySelector('.stage-call').getAnimations().forEach(a => { try { a.finish(); } catch {} });
      });
      await page.waitForTimeout(250);
      // Screenshots are for visual inspection only — the geometry
      // assertions above are the gate — so a throttled-headless screenshot
      // timeout must not fail the test. Retry once, then log and move on.
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await page.screenshot({ path: shotDir + '/call-banner-band-v161-' + name + '.png', timeout: 90000 }); break; }
        catch (e) { if (attempt === 1) console.log('call-banner-band-v161: screenshot ' + name + ' skipped (' + e.name + ')'); }
      }
      await page.evaluate(() => { const g = window.__bannerTest.game; if (g) g.paused = false; });
    };
    const results = {};
    const checkEmpty = async (label, args, shot) => {
      await show(args); await page.waitForTimeout(400);
      const m = await measure(); results[label] = m;
      assert(m.cls.includes('pitch-call'), label + ': pitch-call banner: ' + m.cls);
      assert.equal(m.en, args.en, label + ': head text');
      assert.equal(m.detailDisplay, 'none', label + ': empty detail is display:none');
      assert.equal(m.detailHidden, true, label + ': empty detail carries the hidden flag');
      assert.equal(m.detail.width, 0, label + ': empty detail has zero rendered width');
      assert(m.banner.width < 220, label + ': banner is a compact label, not a stage-wide band: ' + m.banner.width.toFixed(1) + 'px');
      assert(m.banner.width < m.stage.width * 0.6, label + ': banner well under stage width');
      assert(Math.abs(m.banner.width - m.head.width) <= 16,
        label + ': banner width matches the head chip: ' + m.banner.width.toFixed(1) + ' vs ' + m.head.width.toFixed(1));
      assert(m.banner.height >= 40 && m.banner.height <= 65, label + ': one-row height intact: ' + m.banner.height);
      if (shot) await snap(shot);
      console.log(`call-banner-band-v161: ${label} banner ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px, detail display=${m.detailDisplay} width=${m.detail.width}`);
      return m;
    };
    const checkDetail = async (label, args, shot) => {
      await show(args); await page.waitForTimeout(400);
      const m = await measure(); results[label] = m;
      assert.notEqual(m.detailDisplay, 'none', label + ': detail with real text is rendered');
      assert.equal(m.detailHidden, false, label + ': detail with real text is not hidden');
      assert(m.detail.width > 30, label + ': detail has real width: ' + m.detail.width);
      assert(m.detail.left >= m.head.right - 16 && m.detail.left < m.head.right + 4,
        label + ': detail sits directly beside the head, not floating away: head.right=' + m.head.right.toFixed(1) + ' detail.left=' + m.detail.left.toFixed(1));
      assert(Math.abs((m.head.top + m.head.bottom) / 2 - (m.detail.top + m.detail.bottom) / 2) < 6,
        label + ': head and detail share one row');
      assert(m.banner.width < m.stage.width, label + ': banner does not exceed the stage');
      if (shot) await snap(shot);
      console.log(`call-banner-band-v161: ${label} banner ${m.banner.width.toFixed(1)}x${m.banner.height.toFixed(1)}px, detail width=${m.detail.width.toFixed(1)} ja=${JSON.stringify(m.ja)} sub=${JSON.stringify(m.sub)}`);
      return m;
    };

    // Empty-detail pitch calls: no dark rectangle may be painted.
    await checkEmpty('STRIKE', { en: 'STRIKE', ja: '', sub: '', speech: 'ストライク。' }, 'strike');
    await checkEmpty('BALL', { en: 'BALL', ja: '', sub: '', speech: 'ボール。' }, 'ball');
    await checkEmpty('SWING & MISS', { en: 'SWING & MISS', ja: '', sub: '', speech: '空振り。' }, 'swing');

    // Detail-present pitch calls: the detail renders, beside the head.
    const walk = await checkDetail('WALK (bases loaded)', { en: 'WALK', ja: '', sub: '押し出しで1点', speech: 'フォアボール。押し出しで1点' }, 'walk');
    assert.equal(walk.sub, '押し出しで1点', 'WALK situation explanation is shown');
    const walk2 = await checkDetail('WALK (runners advance)', { en: 'WALK', ja: '', sub: '走者が進塁', speech: 'フォアボール。走者が進塁' });
    assert.equal(walk2.sub, '走者が進塁', 'WALK runner-advance explanation is shown');
    const so = await checkDetail('STRIKEOUT', { en: 'STRIKEOUT', ja: '見逃し三振！', sub: '1アウト', kind: 'out' });
    assert(so.cls.includes('pitch-call'), 'STRIKEOUT keeps pitch-call styling: ' + so.cls);
    await checkDetail('SWING & MISS (practice wording)', { en: 'SWING & MISS', ja: '空振り', sub: 'ボールの位置とカーソルを合わせよう' });

    // FOUL / TAKE are not pitch calls (two-row design, detail always has
    // text): assert their detail is present with its text and is not an
    // empty rectangle.
    await show({ en: 'FOUL', ja: 'ファウル', sub: '次の1球へ。' }); await page.waitForTimeout(400);
    const foul = await measure(); results.FOUL = foul;
    assert(!foul.cls.includes('pitch-call'), 'FOUL keeps the non-pitch-call design: ' + foul.cls);
    assert(foul.detail.width > 30 && foul.ja === 'ファウル', 'FOUL detail is rendered with its text (not an empty band)');
    console.log(`call-banner-band-v161: FOUL banner ${foul.banner.width.toFixed(1)}x${foul.banner.height.toFixed(1)}px, detail width=${foul.detail.width.toFixed(1)} ja=${JSON.stringify(foul.ja)}`);
    await show({ en: 'TAKE', ja: '見送り', sub: 'カーソルをコースへ動かそう' }); await page.waitForTimeout(400);
    const take = await measure(); results.TAKE = take;
    assert(take.detail.width > 30 && take.ja === '見送り', 'TAKE detail is rendered with its text (not an empty band)');

    // Non-pitch-call regression, updated for v162: a hit banner is no
    // longer two-row — it uses the v162 result-compact one-row layout —
    // but the v161 pitch-call rule itself still does not touch it (no
    // pitch-call class), its detail still renders (the sub line), and
    // only the duplicate ja line (ヒット for SINGLE) is suppressed.
    await show({ en: 'SINGLE', ja: 'ヒット', sub: 'レフト前へ', kind: 'hit' }); await page.waitForTimeout(400);
    const hit = await measure();
    assert(!hit.cls.includes('pitch-call') && hit.cls.includes('result-compact') && hit.detailHidden === false && hit.detail.width > 30,
      'hit banner detail renders via the v162 result-compact layout, untouched by the v161 pitch-call rule');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('call-banner-band-v161: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
