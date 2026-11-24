// v149: settings edit hub (follow-up to v143 settings-hub-consolidation and
// v144 settings-modal-sections). The user pointed out that the editors —
// stadium edit, custom league creation, uniform edit — belong in settings
// too. The settings modal gains a fifth accordion section,
// エディット／カスタム, between 試合 and データ, holding one entry button per
// editor that ACTUALLY exists in the game:
//   - 球場エディタ: stadiumEditorModal() in app.js, backed by
//     dist/stadium-editor.js (window.NightStadium). Already reachable from
//     match setup via the same data-action="stadium-editor".
//   - カスタムリーグ作成・編集: leagueEditor() in app.js, backed by
//     dist/league-editor.js (window.NightLeague). Already reachable from the
//     pennant picker via data-league-action="league-editor"; settings uses a
//     new data-action="league-editor-open" wired to the same function, which
//     closes the modal via showLeagueScreen().
//   - ユニフォームカラー: uniformModal() in app.js, backed by
//     dist/uniform-editor.js (window.NightUniforms). Its entry MOVED here
//     from the 試合 section (where v144 had placed it) so it is not listed
//     twice.
// Share codes (v135) live inside the stadium and league editors
// (dist/share-codes.js), so they get no separate entry — the section note
// says so. There is NO player editor and NO custom-team editor in the game
// (share-codes.js header confirms the latter; pennant.js customPlayers are
// engine-generated draft rookies, not a user-facing editor), so no entry is
// offered for those. Existing entries elsewhere (match setup, pennant
// picker) are untouched.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = __dirname + '/../dist/';
const app = fs.readFileSync(root + 'app.js', 'utf8');
const css = fs.readFileSync(root + 'style.css', 'utf8');
const arcade = fs.readFileSync(root + 'arcade.css', 'utf8');
const index = fs.readFileSync(root + 'index.html', 'utf8');
const sw = fs.readFileSync(root + 'sw.js', 'utf8');

// ---------- the editors really exist ----------
for (const [file, marker] of [['stadium-editor.js', 'NightStadium'], ['league-editor.js', 'NightLeague'],
  ['uniform-editor.js', 'NightUniforms'], ['share-codes.js', 'NightShare']]) {
  assert(fs.existsSync(root + file), file + ' exists');
  assert(fs.readFileSync(root + file, 'utf8').includes(marker), file + ' defines ' + marker);
  assert(index.includes(file), 'index.html loads ' + file);
}
assert(app.includes('function stadiumEditorModal('), 'stadium editor UI exists in app.js');
assert(app.includes('function leagueEditor('), 'league editor UI exists in app.js');
assert(app.includes('function uniformModal(){'), 'uniform editor UI exists in app.js');
// No player editor / custom-team editor exists, so none may be linked.
assert(!app.includes('data-action="player-editor"') && !app.includes('data-action="team-editor"'),
  'no phantom editor entries');

// ---------- static structure of the new section ----------
const fnStart = app.indexOf(' function settingsModal(){');
const fnEnd = app.indexOf('// v144: settings modal sections', fnStart);
assert(fnStart >= 0 && fnEnd > fnStart, 'settingsModal exists');
const fn = app.slice(fnStart, fnEnd);

const editCall = "settingsSection('edit','エディット／カスタム'";
const editPos = fn.indexOf(editCall);
assert(editPos >= 0, 'edit section is rendered by settingsModal');
assert(fn.indexOf("settingsSection('match','試合'") < editPos && editPos < fn.indexOf("settingsSection('data','データ'"),
  'edit section sits between 試合 and データ');
const editRegion = fn.slice(editPos, fn.indexOf("settingsSection('data','データ'"));

const editActions = [...editRegion.matchAll(/data-action="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(editActions, ['stadium-editor', 'league-editor-open', 'uniform-editor'],
  'edit section holds exactly the three real editor entries, in order');
assert(editRegion.includes('共有コード'), 'section note points at the share codes inside the editors');
// The uniform entry moved: exactly one uniform-editor button in the whole modal.
assert.equal((fn.match(/data-action="uniform-editor"/g) || []).length, 1, 'uniform entry is not duplicated');
const matchRegion = fn.slice(fn.indexOf("settingsSection('match','試合'"), editPos);
assert(!matchRegion.includes('data-action="uniform-editor"'), 'uniform entry no longer sits in 試合');
// Collapsed by default, like the other non-操作 sections.
assert(app.includes("const settingsSectionState={controls:true,sound:false,match:false,edit:false,data:false};"),
  'edit section starts collapsed');

// ---------- wiring ----------
assert(app.includes("case'stadium-editor':stadiumEditorModal();break;"), 'stadium entry opens the stadium editor modal');
assert(app.includes("case'league-editor-open':leagueEditor();break;"), 'league entry opens the league editor screen');
assert(app.includes("case'uniform-editor':uniformModal();break;"), 'uniform entry opens the uniform modal');

// ---------- pre-existing entries elsewhere are untouched ----------
assert(app.includes('data-action="stadium-editor">球場エディタ（カスタム球場を作成）'),
  'match-setup stadium entry still exists');
assert(app.includes('data-league-action="league-editor">＋ カスタムリーグを作成'),
  'pennant-picker league entry still exists');

// ---------- heading contrast (same head rule as v148) ----------
function lum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
const headRule = css.match(/\.settings-section-head\{[^}]*\}/);
assert(headRule, 'section head rule exists');
const headColorM = headRule[0].match(/color:#([0-9a-f]{6})/i);
assert(headColorM && headColorM[1].toLowerCase() === '103e71', 'edit head uses the v148 heading colour #103e71');
const modalRule = arcade.match(/\.modal\{[^}]*background:linear-gradient\([^)]*\)[^}]*\}/) || arcade.match(/\.modal\{[^}]*\}/);
assert(modalRule && modalRule[0].includes('linear-gradient'), 'modal gradient background found');
const gradArg = modalRule[0].match(/linear-gradient\(([^)]*)\)/)[1];
const gradStops = [...gradArg.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map(m => {
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return hex(h);
});
assert(gradStops.length >= 2, 'gradient stops parsed');
for (const stop of gradStops) {
  const r = ratio(hex('103e71'), stop);
  assert(r >= 4.5, `edit head text contrast vs gradient stop rgb(${stop}) is ${r.toFixed(2)}:1 (>= 4.5)`);
}
console.log('settings-edit-hub-v149: static assertions passed (worst head contrast ' +
  Math.min(...gradStops.map(s => ratio(hex('103e71'), s))).toFixed(2) + ':1)');

// ---------- v149 version pins ----------
assert(index.includes('./game.js?v=160') && index.includes('./app.js?v=160'), 'index pins at v149');
assert(sw.includes('nightball-v160-catch-sound-timing'), 'SW cache renamed for v149');
assert(sw.includes('./game.js?v=160') && sw.includes('./app.js?v=160'), 'SW precaches the v149 assets');

// ---------- browser behaviour (393px) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, join, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('settings-edit-hub-v149: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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

    // Each editor is checked from a fresh page load: once an editor modal is
    // open it covers the gear button (true on a real device too), so going
    // back through the UI would mean a different flow per editor.
    const openSettingsEdit = async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!document.querySelector('#game-canvas')?.dataset.graphics, { timeout: 20000 });
      await page.click('#settings');
      await page.waitForSelector('[data-settings-section="edit"]', { timeout: 10000 });
      const expanded = await page.getAttribute('[data-settings-section="edit"]', 'aria-expanded');
      if (expanded !== 'true') await page.click('[data-settings-section="edit"]');
      await page.waitForFunction(() => !document.querySelector('[data-settings-body="edit"]').hidden, { timeout: 5000 });
    };

    // Section renders collapsed by default with a readable head.
    await page.click('#settings');
    await page.waitForSelector('[data-settings-section="edit"]', { timeout: 10000 });
    const head = await page.evaluate(() => {
      const e = document.querySelector('[data-settings-section="edit"]');
      return { label: e.textContent.trim(), expanded: e.getAttribute('aria-expanded'),
        color: getComputedStyle(e).color, bodyHidden: document.querySelector('[data-settings-body="edit"]').hidden };
    });
    assert(head.label.includes('エディット／カスタム'), 'edit head label renders: ' + head.label);
    assert.equal(head.expanded, 'false', 'edit section starts collapsed');
    assert.equal(head.bodyHidden, true, 'edit body starts hidden');
    const rgbStr = s => { const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/); return m && [+m[1], +m[2], +m[3]]; };
    // Worst case is against the lightest modal gradient stop (#ffffff).
    assert(ratio(rgbStr(head.color), [255, 255, 255]) >= 4.5,
      'edit head computed colour contrast vs white >= 4.5: ' + head.color);

    await page.click('[data-settings-section="edit"]');
    await page.waitForFunction(() => !document.querySelector('[data-settings-body="edit"]').hidden, { timeout: 5000 });
    const buttons = await page.$$eval('[data-settings-body="edit"] [data-action]', els => els.map(e => e.dataset.action));
    assert.deepEqual(buttons, ['stadium-editor', 'league-editor-open', 'uniform-editor'],
      'edit section renders exactly the three editor buttons');

    // 1) Stadium editor opens as its modal.
    await page.click('[data-settings-body="edit"] [data-action="stadium-editor"]');
    await page.waitForFunction(() => document.querySelector('#modal-content').dataset.kind === 'stadium-editor'
      && !!document.querySelector('#stadium-name'), { timeout: 10000 });
    console.log('settings-edit-hub-v149: stadium editor opened from settings');

    // 2) Uniform editor opens as its modal (reopen settings first).
    await openSettingsEdit();
    await page.click('[data-settings-body="edit"] [data-action="uniform-editor"]');
    await page.waitForFunction(() => document.querySelector('#modal-content').dataset.kind === 'uniform'
      && !!document.querySelector('#uniform-color'), { timeout: 10000 });
    console.log('settings-edit-hub-v149: uniform editor opened from settings');

    // 3) League editor replaces the modal with the pennant editor screen.
    await openSettingsEdit();
    await page.click('[data-settings-body="edit"] [data-action="league-editor-open"]');
    await page.waitForFunction(() => !!document.querySelector('#league-name-input')
      && !document.querySelector('#pennant').hidden && document.querySelector('#modal').hidden, { timeout: 10000 });
    console.log('settings-edit-hub-v149: league editor opened from settings');

    // The pre-existing pennant-picker entry still works from that screen.
    await page.click('[data-league-action="picker"]');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-league-action="league-editor"]')]
      .some(e => e.textContent.includes('カスタムリーグを作成')), { timeout: 10000 });
    console.log('settings-edit-hub-v149: pennant picker still offers its own league-editor entry');

    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('settings-edit-hub-v149: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
