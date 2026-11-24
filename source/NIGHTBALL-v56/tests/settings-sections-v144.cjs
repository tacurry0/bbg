// v144: settings modal sections (checker item settings-modal-sections).
// The gear settings modal used to be one flat 3,048px-tall list of ~44
// controls. It is now grouped into four accordion sections — 操作 / サウンド /
// 試合 / データ — with only 操作 open by default. This is a purely visual
// regrouping: every control keeps its id, data-* wiring and settings key,
// the persisted nightball.settings shape is unchanged, and the accordion
// open state lives in memory for the session only (never persisted).
// Placement notes: 試合の時間帯 (lightingField) and 延長タイブレーク moved to
// 試合; ペナントの故障発生 moved to 試合 (it is a pennant match rule, not an
// operation setting); ユニフォームカラー編集 moved out of the audio block to
// 試合; 振動 sits with the other feedback settings in サウンド.
// v149 update: a fifth section エディット／カスタム was added between 試合 and
// データ, and the uniform entry moved there from 試合 (see
// settings-edit-hub-v149.cjs). This file's expectations follow that spec.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const css = fs.readFileSync(__dirname + '/../dist/style.css', 'utf8');
const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');

// ---------- static structure ----------
const fnStart = app.indexOf(' function settingsModal(){');
const fnEnd = app.indexOf('// v144: settings modal sections', fnStart);
assert(fnStart >= 0 && fnEnd > fnStart, 'settingsModal exists');
const fn = app.slice(fnStart, fnEnd);

const sectionCalls = ["settingsSection('controls','操作'", "settingsSection('sound','サウンド'",
  "settingsSection('match','試合'", "settingsSection('edit','エディット／カスタム'", "settingsSection('data','データ'"];
const pos = sectionCalls.map(s => { const i = fn.indexOf(s); assert(i >= 0, 'section call exists: ' + s); return i; });
assert(pos[0] < pos[1] && pos[1] < pos[2] && pos[2] < pos[3] && pos[3] < pos[4], 'sections render in order 操作/サウンド/試合/エディット／カスタム/データ');
const region = i => fn.slice(pos[i], i + 1 < pos.length ? pos[i + 1] : fn.length);

// Every pre-v144 control must survive inside exactly one named section.
const placement = [
  [0, ['<section class="hud-settings">', 'id="thumb-preview-wrap"', 'for="cursor-shift"', 'for="cursor-lift"',
    "['timingGuide','タイミングリング'", "['battingAssist','打撃アシスト'", "['leftHanded','左親指で操作'",
    "['assist','到達位置のガイド'", "['showTrace','前の投球位置を表示'"]],
  [1, ["['sound','サウンド'", "['timingSound','離すタイミングの合図'", "['vibration','振動'",
    "['tts','実況の音声読み上げ'", "['audioCues','音響ガイド'", 'id="sound-volume"', 'id="crowd-volume"',
    'data-action="music-settings"', 'data-audio-test="perfect"', 'data-audio-test="catch"', 'data-audio-test="homer"',
    'class="audio-credits"']],
  [2, ['${lightingField()}', "['tiebreak','延長タイブレーク'", "'走塁モード'", 'data-running-mode=', 'data-field-speed=',
    'data-difficulty=', 'data-custom-diff=', 'ペナントの故障発生', 'data-injury-rate=']],
  // v149: the uniform entry moved from 試合 into the new エディット／カスタム
  // section, alongside the stadium and custom-league editor entries.
  [3, ['data-action="stadium-editor"', 'data-action="league-editor-open"', 'data-action="uniform-editor"']],
  [4, ['data-action="backup-export"', 'data-action="backup-import"', 'data-action="fullscreen"', 'data-action="install"']],
];
let placed = 0;
for (const [i, markers] of placement) {
  const r = region(i);
  for (const m of markers) { assert(r.includes(m), `control stays in section ${i}: ${m}`); placed++; }
}
assert(placed >= 35, 'the full control inventory is placed in sections');
assert(fn.includes('<button class="primary-button" data-action="close">OK</button>'), 'OK button stays outside the sections');
// Scale sliders are built once in scaleOptions and rendered via the controls section.
assert(fn.includes('data-ui-scale="${id}"') && region(0).includes('${scaleOptions}'), 'HUD scale sliders render in 操作');

// Accordion mechanics: session-only state, defaults, head wiring.
assert(app.includes("const settingsSectionState={controls:true,sound:false,match:false,edit:false,data:false};"),
  'only 操作 is open by default');
assert(app.includes('function toggleSettingsSection(b)'), 'accordion toggle helper exists');
assert(app.includes("if(b.dataset.settingsSection){toggleSettingsSection(b);return;}"),
  'section heads are wired into the modal click handler');
assert(!/localStorage\.setItem\('nightball\.settingsSections'/.test(app) && !app.includes('settingsSectionState,'),
  'accordion state is never persisted');
assert(app.includes('data-settings-body="${id}"') && app.includes("aria-expanded"), 'heads expose aria-expanded and bodies are labelled');
// No settings key was added or removed by the regrouping.
assert(app.includes("function save(){try{localStorage.setItem('nightball.settings',JSON.stringify(settings));"),
  'save() still persists the one settings object, unchanged');

// CSS: heads are comfortable tap targets and hidden bodies really hide.
assert(css.includes('.settings-section-head{'), 'section head styles exist');
assert(/\.settings-section-head\{[^}]*min-height:44px/.test(css), 'section head tap area is at least 44px tall');
assert(css.includes('.settings-section-body[hidden]{display:none}'), 'collapsed bodies are display:none');

// ---------- v144 version pins ----------
assert(index.includes('./game.js?v=151') && index.includes('./app.js?v=151'), 'index pins move to v144');
assert(index.includes('./style.css?v=72'), 'style.css pin moves with the new section styles');
assert(sw.includes('nightball-v151-online-seg'), 'SW cache renamed for v144');
assert(sw.includes('./game.js?v=151') && sw.includes('./app.js?v=151') && sw.includes('./style.css?v=72'),
  'SW precaches the v144 assets');

// ---------- browser behaviour (393px) ----------
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, join, extname, sep } = require('node:path');

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('settings-sections-v144: playwright unavailable in this environment — browser checks skipped, static assertions passed'); return; }
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

    const heads = await page.$$eval('[data-settings-section]', els => els.map(e => e.textContent.trim()));
    assert.equal(heads.length, 5, 'five section heads render');
    for (const label of ['操作', 'サウンド', '試合', 'エディット／カスタム', 'データ']) assert(heads.some(h => h.includes(label)), 'head present: ' + label);

    let vis = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-settings-body]')].map(e => [e.dataset.settingsBody, !e.hidden])));
    assert.deepEqual(vis, { controls: true, sound: false, match: false, edit: false, data: false }, 'only 操作 is open on first display');

    // Initial height: far below the pre-v144 flat list (3,048px scroll height).
    const initial = await page.evaluate(() => {
      const c = document.querySelector('#modal-content');
      return { scrollHeight: c.scrollHeight, scrollWidth: c.scrollWidth, clientWidth: c.clientWidth };
    });
    console.log('settings-sections-v144: initial modal scrollHeight at 393px =', initial.scrollHeight, '(was 3048)');
    assert(initial.scrollHeight < 1600, 'initial height is drastically reduced: ' + initial.scrollHeight);
    assert(initial.scrollWidth <= initial.clientWidth + 1, 'no horizontal overflow at 393px');

    const headBox = await page.locator('[data-settings-section="sound"]').boundingBox();
    assert(headBox && headBox.height >= 44, 'section head tap area >= 44px: ' + (headBox && headBox.height));

    // All controls live inside a section body, and the inventory is complete.
    const inventory = await page.evaluate(() => {
      const inSection = sel => { const el = document.querySelector(sel); return !!el && !!el.closest('[data-settings-body]'); };
      const checks = {
        hudScale: inSection('#hudScale'), controlsScale: inSection('#controlsScale'),
        cursorShift: inSection('#cursor-shift'), cursorLift: inSection('#cursor-lift'),
        lighting: inSection('#game-lighting'), soundVolume: inSection('#sound-volume'), crowdVolume: inSection('#crowd-volume'),
        cdBat: inSection('#cd-bat'), cdPitch: inSection('#cd-pitch'), cdField: inSection('#cd-field'), cdRun: inSection('#cd-run'),
      };
      const toggles = [...document.querySelectorAll('[data-toggle]')].map(e => e.dataset.toggle);
      const segmented = [...document.querySelectorAll('[data-injury-rate],[data-running-mode],[data-field-speed],[data-difficulty]')]
        .every(e => !!e.closest('[data-settings-body]'));
      const actions = [...document.querySelectorAll('[data-action]')].map(e => e.dataset.action);
      const total = document.querySelectorAll('#modal-content button, #modal-content input, #modal-content select').length;
      return { checks, toggles, segmented, actions, total };
    });
    for (const [k, v] of Object.entries(inventory.checks)) assert(v, 'control inside a section: ' + k);
    assert.deepEqual([...inventory.toggles].sort(),
      ['assist', 'audioCues', 'battingAssist', 'leftHanded', 'showTrace', 'sound', 'tiebreak', 'timingGuide', 'timingSound', 'tts', 'vibration'],
      'all 11 toggles survive');
    assert(inventory.segmented, 'all segmented controls sit inside sections');
    for (const a of ['music-settings', 'uniform-editor', 'backup-export', 'backup-import', 'fullscreen', 'install', 'close'])
      assert(inventory.actions.includes(a), 'action button survives: ' + a);
    console.log('settings-sections-v144: interactive elements in modal =', inventory.total);
    assert(inventory.total >= 44, 'modal still holds the full ~44-control inventory: ' + inventory.total);

    // Accordion open/close works and updates aria-expanded.
    await page.click('[data-settings-section="sound"]');
    vis = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-settings-body]')].map(e => [e.dataset.settingsBody, !e.hidden])));
    assert(vis.sound === true && vis.controls === true, 'サウンド opens alongside 操作');
    assert.equal(await page.getAttribute('[data-settings-section="sound"]', 'aria-expanded'), 'true');
    await page.click('[data-settings-section="sound"]');
    vis = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-settings-body]')].map(e => [e.dataset.settingsBody, !e.hidden])));
    assert(vis.sound === false, 'サウンド closes again');

    // Settings changed inside sections persist exactly as before.
    const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('nightball.settings')));
    const before = await read();
    await page.click('[data-toggle="timingGuide"]');
    assert.equal((await read()).timingGuide, !before.timingGuide, '操作 toggle persists to nightball.settings');
    await page.click('[data-settings-section="sound"]');
    await page.click('[data-toggle="sound"]');
    assert.equal((await read()).sound, !before.sound, 'サウンド toggle persists');
    await page.evaluate(() => { const el = document.querySelector('#sound-volume'); el.value = '37'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal((await read()).soundVolume, 37, '音量 slider persists');
    // 試合: field-speed re-renders the modal; the open section must stay open.
    await page.click('[data-settings-section="match"]');
    await page.click('[data-field-speed="2"]');
    assert.equal((await read()).fieldSpeed, 2, '打球後の速度 persists');
    vis = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-settings-body]')].map(e => [e.dataset.settingsBody, !e.hidden])));
    assert(vis.match === true && vis.sound === true, 'open sections survive a settingsModal() re-render (session state)');
    await page.click('[data-difficulty="pro"]');
    assert.equal((await read()).difficulty, 'pro', '難易度 persists');
    await page.click('[data-injury-rate="low"]');
    assert.equal((await read()).injuries, 'low', 'ペナントの故障発生 persists from its new home in 試合');
    assert(!errors.length, 'no page errors: ' + errors.join(' | '));
    console.log('settings-sections-v144: all assertions passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
