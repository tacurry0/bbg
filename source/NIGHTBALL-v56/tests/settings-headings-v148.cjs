// v148: settings modal section headings were unreadable on real devices
// (checker follow-up to v144 settings-modal-sections).
// Root cause: v144 added .settings-section-head in style.css with
// color:#e6f2da (a near-white pale green) and background:none — colours
// chosen against style.css's own DARK modal (#18241f). But arcade.css is
// loaded after style.css and restyles every .modal to a LIGHT gradient
// (linear-gradient(120deg,#fff,#eafaff 65%,#d1f2ff)) with dark text
// (#103e71). arcade.css never overrode .settings-section-head, so the pale
// #e6f2da text sat directly on the near-white modal background:
// contrast 1.16:1 vs #fff, 1.09:1 vs #eafaff, 1.01:1 vs #d1f2ff —
// effectively invisible, exactly as the user reported (collapsed heads
// サウンド / 試合 / データ unreadable; the expanded 操作 head had the
// same colours and the same problem).
// Fix (colours only; v144 structure, accordion behaviour and every control
// wiring are untouched): the head text now uses #103e71 — the modal's own
// text colour in the arcade theme — and the chevron uses #0862a6, the
// modal h3 colour in the same theme. Worst-case contrast over every modal
// gradient stop: head text 9.16:1, chevron 5.40:1 (both >= 4.5:1).
// This test recomputes the WCAG contrast ratio from the actual CSS
// (statically, always) and from real-browser computed styles (when
// playwright is available), for all section heads in BOTH accordion states
// (five heads since v149 added the エディット／カスタム section).
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const css = fs.readFileSync(root + 'style.css', 'utf8');
const arcade = fs.readFileSync(root + 'arcade.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- WCAG contrast helpers ----------
function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbStr = s => { const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/); return m && [+m[1], +m[2], +m[3]]; };

// ---------- static: the fixed colours ----------
const headRule = css.match(/\.settings-section-head\{[^}]*\}/);
assert(headRule, 'section head rule exists in style.css');
assert(!headRule[0].includes('#e6f2da'), 'the unreadable pale colour #e6f2da is gone from the head rule');
const headColorM = headRule[0].match(/color:#([0-9a-f]{6})/i);
assert(headColorM, 'head rule declares an explicit hex text colour');
const headColor = hex(headColorM[1]);
assert.equal(headColorM[1].toLowerCase(), '103e71', 'head text uses the arcade modal text colour #103e71');

const chevRule = css.match(/\.settings-section-chevron\{[^}]*\}/);
assert(chevRule, 'chevron rule exists');
const chevColorM = chevRule[0].match(/color:#([0-9a-f]{6})/i);
assert(chevColorM, 'chevron declares an explicit hex colour (not var(--lime), which themes differently)');
const chevColor = hex(chevColorM[1]);

// The effective background behind a head (background:none) is the modal's
// own background from arcade.css: a light gradient. Take EVERY gradient
// stop as a candidate background — the head must pass against all of them,
// wherever it sits in the modal.
const modalRule = arcade.match(/\.modal\{[^}]*background:linear-gradient\([^)]*\)[^}]*\}/) ||
  arcade.match(/\.modal\{[^}]*\}/);
assert(modalRule && modalRule[0].includes('linear-gradient'), 'arcade.css modal uses a gradient background');
const stops = [...modalRule[0].matchAll(/#([0-9a-f]{6})\b/gi)].map(m => hex(m[1]));
// The gradient declaration itself carries the colour stops; the trailing
// box-shadow hexes in the same rule are not background colours, so restrict
// to the gradient(...) argument.
const gradArg = modalRule[0].match(/linear-gradient\(([^)]*)\)/)[1];
const gradStops = [...gradArg.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map(m => {
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return hex(h);
});
assert(gradStops.length >= 2, 'modal gradient stops parsed: ' + gradStops.length);
for (const stop of gradStops) {
  const r = ratio(headColor, stop);
  assert(r >= 4.5, `head text contrast vs modal gradient stop rgb(${stop}) is ${r.toFixed(2)}:1 (>= 4.5)`);
  const rc = ratio(chevColor, stop);
  assert(rc >= 4.5, `chevron contrast vs modal gradient stop rgb(${stop}) is ${rc.toFixed(2)}:1 (>= 4.5)`);
}
const worst = Math.min(...gradStops.map(s => ratio(headColor, s)));
console.log(`settings-headings-v148: static worst-case head contrast = ${worst.toFixed(2)}:1 over ${gradStops.length} modal gradient stops (was ~1.01-1.16:1 with #e6f2da)`);
// Sanity: the old colour really did fail, so this test would have caught it.
assert(ratio(hex('e6f2da'), gradStops[gradStops.length - 1]) < 4.5, 'the old #e6f2da indeed failed on the modal background');

// v144 structure is untouched: only colours changed in the head rules.
assert(/\.settings-section-head\{[^}]*min-height:44px/.test(css), 'head tap area is still >= 44px');
assert(css.includes('.settings-section-body[hidden]{display:none}'), 'collapsed bodies still hide');

// ---------- v148 version pins ----------
assert(index.includes('./game.js?v=181') && index.includes('./app.js?v=181'), 'index pins move to v148');
assert(index.includes('./style.css?v=77'), 'style.css pin moves with the colour fix');
assert(sw.includes('nightball-v181-mockup-chart'), 'SW cache renamed for v148');
assert(sw.includes('./game.js?v=181') && sw.includes('./app.js?v=181') && sw.includes('./style.css?v=77'),
  'SW precaches the v148 assets');

// ---------- browser behaviour (393px): computed styles, both states ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('settings-headings-v148: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!document.querySelector('#game-canvas')?.dataset.graphics, { timeout: 20000 });
    await page.click('#settings');
    await page.waitForSelector('[data-settings-section="controls"]', { timeout: 10000 });

    // Measure every head: computed text/chevron colour vs every colour stop
    // of the modal's computed gradient background (the head itself is
    // transparent, so the modal gradient is its effective background).
    const measure = () => page.$$eval('[data-settings-section]', els => els.map(e => {
      const cs = getComputedStyle(e);
      const chev = e.querySelector('.settings-section-chevron');
      const modal = e.closest('.modal');
      const bgImage = getComputedStyle(modal).backgroundImage;
      const stops = [...bgImage.matchAll(/rgb\(\d+,\s*\d+,\s*\d+\)/g)].map(m => m[0]);
      const r = e.getBoundingClientRect();
      return { id: e.dataset.settingsSection, label: e.textContent.trim(), expanded: e.getAttribute('aria-expanded'),
        color: cs.color, chevColor: chev ? getComputedStyle(chev).color : null, bgStops: stops,
        width: r.width, height: r.height };
    }));
    const checkAll = (heads, phase) => {
      assert.equal(heads.length, 5, phase + ': five section heads render');
      for (const h of heads) {
        const fg = rgbStr(h.color); assert(fg, phase + ': head colour parses: ' + h.color);
        assert(h.bgStops.length >= 2, phase + ': modal gradient stops found for ' + h.id);
        for (const s of h.bgStops) {
          const rr = ratio(fg, rgbStr(s));
          assert(rr >= 4.5, `${phase}: head ${h.id} (${h.label}) contrast vs ${s} is ${rr.toFixed(2)}:1 (>= 4.5)`);
        }
        const fc = rgbStr(h.chevColor); assert(fc, phase + ': chevron colour parses');
        for (const s of h.bgStops) {
          const rr = ratio(fc, rgbStr(s));
          assert(rr >= 4.5, `${phase}: chevron ${h.id} contrast vs ${s} is ${rr.toFixed(2)}:1 (>= 4.5)`);
        }
        assert(h.height >= 44, phase + ': head tap area >= 44px: ' + h.id);
        console.log(`settings-headings-v148: ${phase} head ${h.id} "${h.label}" color=${h.color} worst contrast=${Math.min(...h.bgStops.map(s => ratio(fg, rgbStr(s)))).toFixed(2)}:1 expanded=${h.expanded}`);
      }
      return heads;
    };

    // Initial state: 操作 expanded, サウンド/試合/データ collapsed — the
    // exact state from the user's screenshot. Scroll each head into view
    // inside the modal and confirm it is rendered (non-empty box).
    let heads = checkAll(await measure(), 'initial');
    assert.deepEqual(heads.map(h => h.expanded), ['true', 'false', 'false', 'false', 'false'], 'initial accordion state unchanged (v149 adds the collapsed edit head)');
    for (const id of ['controls', 'sound', 'match', 'edit', 'data']) {
      const box = await page.evaluate(i => {
        const e = document.querySelector(`[data-settings-section="${i}"]`);
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect();
        return { w: r.width, h: r.height, text: e.textContent.trim() };
      }, id);
      assert(box.w > 300 && box.h >= 44 && box.text.length > 0, 'head is laid out and visible at 393px: ' + id + ' ' + JSON.stringify(box));
    }

    // Expand the three collapsed sections and re-measure: colours must not
    // depend on the open/closed state.
    for (const id of ['sound', 'match', 'edit', 'data']) await page.click(`[data-settings-section="${id}"]`);
    heads = checkAll(await measure(), 'expanded');
    assert.deepEqual(heads.map(h => h.expanded), ['true', 'true', 'true', 'true', 'true'], 'all sections expand as before');

    // Collapse everything again (including 操作) and re-measure once more.
    for (const id of ['controls', 'sound', 'match', 'edit', 'data']) await page.click(`[data-settings-section="${id}"]`);
    heads = checkAll(await measure(), 'collapsed');
    assert.deepEqual(heads.map(h => h.expanded), ['false', 'false', 'false', 'false', 'false'], 'all sections collapse as before');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('settings-headings-v148: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
