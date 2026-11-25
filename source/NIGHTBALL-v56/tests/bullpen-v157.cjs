// v157: bullpen practice (checker item "bullpen-practice-mode").
// A pitcher-only, batter-less practice mode: pick any club's pitcher,
// a pitch type and an aim point on the zone, throw repeatedly, and read
// the scatter — actual arrival vs aim, speed and break. The pitch math
// is the match engine's own: NightGame.pitchSpec() for speed / break /
// spin and NightGame.throwPitch()'s command-scatter formula (uniform
// error band + in-zone miss chance), with a fresh arm (no fatigue /
// pressure / mastery). Covered here: recording of arrival / speed /
// break per pitch, accumulation across pitches and the derived
// summary, fixed-seed reproducibility of the whole scatter, the
// control rating actually tightening the scatter, invalid pitch-type
// fallback, static wiring (home entry, no record-room recording) and
// the v157 pins, plus a 393px browser check that drives the real
// modal: open from the home menu, aim on the zone, throw, and confirm
// the dots accumulate with no overflow and no record-room entry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data', 'players', 'pennant', 'apbc-data', 'apbc-candidates', 'apbc-tournament', 'derby', 'game', 'bullpen']) {
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file + '.js', 'utf8'), { filename: file + '.js' });
}
const B = global.NightBullpen;
assert(B, 'NightBullpen module loads');
const pitcher = NightPlayers.homePitchers[0];
assert(pitcher && pitcher.pitches.length >= 2, 'a real staff pitcher with multiple pitch types is available');
const typeId = pitcher.pitches[1];

// ---------- one throw records arrival, speed and break ----------
{
  const s = B.createSession(pitcher.id);
  assert.equal(B.summarize(s).count, 0, 'a fresh session is empty');
  const rec = B.throwPitch(s, pitcher, typeId, { x: .7, y: .7 }, B.createRng(157001));
  assert(rec, 'a throw returns a record');
  assert.equal(rec.n, 1);
  assert.equal(rec.typeId, typeId);
  assert.equal(rec.aimX, .7); assert.equal(rec.aimY, .7);
  const spec = NightGame.pitchSpec(pitcher, typeId);
  assert.equal(rec.breakCm, Math.round(Math.hypot(spec.bx, spec.by) * 20.4), 'break (cm) matches the engine pitchSpec conversion');
  assert.equal(rec.spinRpm, spec.spinRpm, 'spin comes from pitchSpec');
  assert(rec.speed <= spec.speed + 2 && rec.speed >= Math.floor(spec.speed - 2), 'speed is the pitchSpec speed with the createPitch ±2 roll, got ' + rec.speed);
  assert.equal(rec.devCm, Math.round(Math.hypot(rec.x - rec.aimX, rec.y - rec.aimY) * 20.4), 'deviation is aim-to-arrival distance in cm');
  assert.equal(rec.strike, Math.abs(rec.x) <= 1.06 && Math.abs(rec.y) <= 1.06, 'strike flag uses the engine zone extent');
  assert.equal(s.pitches.length, 1, 'the throw is recorded in the session');
  assert.equal(s.pitches[0], rec);
}

// ---------- accumulation + summary across many pitches ----------
{
  const s = B.createSession(pitcher.id);
  const rng = B.createRng(157002);
  for (let i = 0; i < 12; i++) B.throwPitch(s, pitcher, i % 2 ? typeId : 'fast', { x: -.5 + i * .08, y: .4 }, rng);
  assert.equal(s.pitches.length, 12, 'pitches accumulate in one session');
  assert.deepEqual(s.pitches.map(p => p.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'pitch numbers are sequential');
  const sum = B.summarize(s);
  assert.equal(sum.count, 12);
  assert.equal(sum.strikes, s.pitches.filter(p => p.strike).length, 'summary strike count matches the records');
  assert.equal(sum.avgDevCm, Math.round(s.pitches.reduce((a, p) => a + p.devCm, 0) / 12), 'average deviation is derived from the records');
  assert.equal(sum.byType.fast.count + sum.byType[typeId].count, 12, 'per-type counts cover every pitch');
  assert.equal(B.throwPitch(s, pitcher, 'fast', { x: 0, y: 0 }, rng).n, 13, 'the session keeps accumulating');
}

// ---------- fixed seed: the whole scatter is reproducible ----------
{
  const run = seed => {
    const s = B.createSession(pitcher.id), rng = B.createRng(seed);
    for (let i = 0; i < 20; i++) B.throwPitch(s, pitcher, typeId, { x: .6, y: -.3 }, rng);
    return s.pitches;
  };
  assert.deepEqual(run(42), run(42), 'the same seed reproduces every arrival, speed and deviation exactly');
  assert.notDeepEqual(run(42), run(43), 'a different seed scatters differently');
}

// ---------- control rating tightens the scatter (paired seeds) ----------
{
  const avgDev = control => {
    const clone = { ...pitcher, control };
    const s = B.createSession(clone.id), rng = B.createRng(157003);
    for (let i = 0; i < 200; i++) B.throwPitch(s, clone, 'fast', { x: 0, y: 0 }, rng);
    return B.summarize(s).avgDevCm;
  };
  const sharp = avgDev(95), wild = avgDev(30);
  assert(sharp < wild, `control 95 scatters less than control 30 (avg dev ${sharp}cm vs ${wild}cm)`);
}

// ---------- invalid pitch type falls back to the pitcher's first pitch ----------
{
  const s = B.createSession(pitcher.id);
  const rec = B.throwPitch(s, pitcher, 'no-such-pitch', { x: 0, y: 0 }, B.createRng(7));
  assert.equal(rec.typeId, pitcher.pitches[0], 'unknown types fall back like throwPitch() does');
  assert.equal(B.throwPitch(null, pitcher, 'fast', { x: 0, y: 0 }), null, 'a missing session is refused');
  assert.equal(B.throwPitch(s, null, 'fast', { x: 0, y: 0 }), null, 'a missing pitcher is refused');
}

// ---------- app wiring + pins (static) ----------
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
const arcade = fs.readFileSync(__dirname + '/../dist/arcade.css', 'utf8');
assert(html.includes('data-mode="bullpen"'), 'the home training menu has a bullpen entry');
assert(app.includes("b.dataset.mode==='bullpen'?setupBullpen()"), 'the menu dispatch routes bullpen to its setup');
assert(app.includes('function setupBullpen(){') && app.includes('function bullpenModal(){') && app.includes('function bullpenThrow(){'), 'bullpen setup / modal / throw exist');
assert(app.includes('NightBullpen.throwPitch(bullpenSel.session,pitcher,bullpenSel.type,bullpenSel.aim)'), 'throwing goes through the bullpen module with the chosen pitcher, type and aim');
assert(app.includes('id="bullpen-zone"') && app.includes('bullpen-club') && app.includes('bullpen-player'), 'the modal has the zone figure and club/pitcher selectors');
assert(app.includes("case'bullpen-throw':bullpenThrow();break;") && app.includes("case'bullpen-type'") && app.includes("case'bullpen-reset'"), 'throw / type / reset actions are handled');
assert(app.includes('試合の記録（記録室）には数えません'), 'the modal states bullpen throws are practice and not recorded as matches');
const throwFn = app.slice(app.indexOf('function bullpenThrow(){'), app.indexOf('function loadOnlineRecord(){'));
assert(!throwFn.includes('NightRecordRoom') && !throwFn.includes('records.'), 'bullpen throws never touch the record room or the match records');
assert(arcade.includes('.bullpen-zone{') && arcade.includes('.menu-bullpen{'), 'arcade.css carries the bullpen styles');
assert(html.includes('./bullpen.js?v=1'), 'index loads bullpen.js at v1');
assert(html.includes('./game.js?v=173') && html.includes('./app.js?v=173'), 'index pins at v157');
assert(html.includes('./arcade.css?v=80'), 'index pin for the changed arcade.css moves');
assert(sw.includes('nightball-v173-handicap'), 'SW cache renamed for v157');
assert(sw.includes('./game.js?v=173') && sw.includes('./app.js?v=173') && sw.includes('./bullpen.js?v=1') && sw.includes('./arcade.css?v=80'), 'SW precaches the v157 scripts including the new module');

console.log('bullpen-v157: unit + static assertions passed');

/* ---------- browser check (393x852): the real bullpen modal ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('bullpen-v157: playwright unavailable — browser layout check skipped'); return; }
  const dir = resolve(__dirname, '../dist');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.woff': 'font/woff' };
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(u.pathname) === '/' ? '/index.html' : decodeURIComponent(u.pathname);
    const filePath = resolve(dir, '.' + name);
    if (!filePath.startsWith(dir + sep)) { res.writeHead(403); res.end(); return; }
    try { const data = await readFile(filePath); res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox'] });
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/';
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.NightBullpen && document.querySelector('[data-mode="bullpen"]'), null, { timeout: 15000 });
    await page.click('[data-mode="bullpen"]');
    await page.waitForSelector('#bullpen-zone', { timeout: 10000 });
    let text = await page.textContent('#modal-content');
    assert(text.includes('ブルペン投球練習'), 'the bullpen modal opens from the home menu');
    assert(text.includes('まだ投げていません'), 'the empty state explains how to start');
    // Aim at the low-outside corner of the zone figure, then throw 4.
    await page.click('#bullpen-zone', { position: { x: 170, y: 140 } });
    for (let i = 0; i < 4; i++) await page.click('[data-action="bullpen-throw"]');
    const state = await page.evaluate(() => {
      const content = document.querySelector('#modal-content');
      const dots = document.querySelectorAll('#bullpen-zone circle');
      return {
        text: content.textContent,
        // zone dots: pitch circles only (the aim marker is in a <g> with its own circle)
        scrollWidth: content.scrollWidth, clientWidth: content.clientWidth,
        overflow: [...content.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > 393.5 || el.getBoundingClientRect().left < -0.5).length,
        recordRoom: localStorage.getItem('nightball.recordRoom'),
      };
    });
    assert(state.text.includes('4球目'), 'the 4th pitch is reported in the modal: ' + state.text.slice(0, 300));
    assert(state.text.includes('セッション集計') && state.text.includes('ストライク率'), 'the session summary renders after throwing');
    assert(state.text.includes('変化量'), 'break is displayed for the latest pitch');
    assert(state.text.includes('狙いとのずれ'), 'aim deviation is displayed for the latest pitch');
    const dotCount = await page.evaluate(() => document.querySelectorAll('#bullpen-zone > circle').length);
    assert.equal(dotCount, 4, 'four arrival dots accumulate on the zone figure, got ' + dotCount);
    assert.equal(state.recordRoom, null, 'bullpen throws write nothing to the record room');
    assert(state.scrollWidth <= state.clientWidth + 1, 'bullpen modal does not overflow horizontally at 393px');
    assert.equal(state.overflow, 0, 'no bullpen element sticks out of the 393px viewport');
    assert.deepEqual(errors, [], 'no page errors in the bullpen flow: ' + errors.join(' | '));
    // Reset clears the scatter.
    await page.click('[data-action="bullpen-reset"]');
    const afterReset = await page.evaluate(() => document.querySelectorAll('#bullpen-zone > circle').length);
    assert.equal(afterReset, 0, 'reset clears the accumulated dots');
    await context.close();
    console.log('bullpen-v157: 393px browser check passed (open, aim, 4 throws accumulated, reset, no record-room write)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
