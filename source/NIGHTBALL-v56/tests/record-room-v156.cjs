// v156: personal record room (checker item "personal-record-room").
// A cross-mode dashboard of the player's own results: every finished
// fixture game that flows through app.js commit() (versus / pennant /
// online host / survival / conquest / draft / APBC・大会) and the
// online guest's end handler append one minimal entry (mode, result,
// runs for/against, opponent) to 'nightball.recordRoom'; aggregates
// are derived from the store so the dashboard always matches the
// recorded history. Records start at v156 — nothing is backfilled.
// Covered here: accumulation + derived totals (games / W / L / D /
// win rate / runs), per-mode breakdown, fixture-id deduplication (a
// re-displayed or restored finished fixture never counts twice),
// invalid/corrupt data safety, history cap, empty-store behaviour,
// app wiring (commit hook, exclusions, guest path, dashboard modal)
// and the v156 pins, plus a 393px browser check of the real dashboard
// in both the populated and zero-record states.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
const backing = new Map();
global.localStorage = {
  getItem: k => backing.has(k) ? backing.get(k) : null,
  setItem: (k, v) => backing.set(k, String(v)),
  removeItem: k => backing.delete(k),
};
vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/record-room.js', 'utf8'), { filename: 'record-room.js' });
const RR = global.NightRecordRoom;
assert(RR, 'NightRecordRoom module loads');
assert.equal(RR.KEY, 'nightball.recordRoom');
function memStorage() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _map: m }; }

// ---------- empty store: zero totals, no crash, rate is a dash ----------
{
  const s = memStorage();
  const sum = RR.summarize(RR.load(s));
  assert.equal(sum.total.games, 0);
  assert.equal(sum.total.w, 0); assert.equal(sum.total.l, 0); assert.equal(sum.total.d, 0);
  assert.equal(RR.formatRate(sum.total), '—', 'no decided games -> rate dash');
  assert.equal(sum.history.length, 0);
  assert(sum.byMode.every(m => m.games === 0), 'all mode buckets start at zero');
  assert.equal(sum.byMode.length, RR.MODES.length, 'every mode has a bucket row');
}

// ---------- accumulation: totals are derived and always match ----------
{
  const s = memStorage();
  RR.recordResult({ mode: 'match', result: 'win', rs: 5, ra: 2, opp: 'Foxes', at: '2026-11-24T00:00:00.000Z' }, s);
  RR.recordResult({ mode: 'match', result: 'loss', rs: 1, ra: 4, opp: 'Bears', at: '2026-11-24T01:00:00.000Z' }, s);
  RR.recordResult({ mode: 'pennant', result: 'win', rs: 3, ra: 3 - 3, opp: 'Lions', at: '2026-11-24T02:00:00.000Z' }, s);
  RR.recordResult({ mode: 'pennant', result: 'draw', rs: 2, ra: 2, opp: 'Lions', at: '2026-11-24T03:00:00.000Z' }, s);
  RR.recordResult({ mode: 'online', result: 'win', rs: 6, ra: 5, opp: 'Hawks', at: '2026-11-24T04:00:00.000Z' }, s);
  const sum = RR.summarize(RR.load(s));
  assert.equal(sum.total.games, 5, 'total games = recorded entries');
  assert.equal(sum.total.w, 3); assert.equal(sum.total.l, 1); assert.equal(sum.total.d, 1);
  assert.equal(sum.total.rs, 5 + 1 + 3 + 2 + 6, 'runs for summed across modes');
  assert.equal(sum.total.ra, 2 + 4 + 0 + 2 + 5, 'runs against summed across modes');
  assert.equal(RR.formatRate(sum.total), '.750', 'win rate excludes draws: 3 / (3+1)');
  const match = sum.byMode.find(m => m.id === 'match');
  assert.deepEqual([match.games, match.w, match.l, match.d], [2, 1, 1, 0], 'per-mode breakdown for versus');
  const pennant = sum.byMode.find(m => m.id === 'pennant');
  assert.deepEqual([pennant.games, pennant.w, pennant.l, pennant.d], [2, 1, 0, 1], 'per-mode breakdown for pennant');
  assert.equal(sum.history.length, 5);
  assert.equal(sum.history[0].mode, 'online', 'history is newest first');
  assert.equal(sum.history[0].opp, 'Hawks');
  // A fresh load from the same storage reproduces the same numbers.
  assert.deepEqual(RR.summarize(RR.load(s)).total, sum.total, 'totals survive a save/load round-trip');
}

// ---------- deduplication: a fixture id can only be recorded once ----------
{
  const s = memStorage();
  const entry = { mode: 'pennant', result: 'win', rs: 4, ra: 1, opp: 'Lions', at: '2026-11-24T00:00:00.000Z', id: 'fixture-42' };
  assert(RR.recordResult(entry, s), 'first recording of the fixture succeeds');
  assert.equal(RR.recordResult(entry, s), null, 're-recording the same fixture id is refused');
  assert.equal(RR.recordResult({ ...entry, result: 'loss', rs: 0, ra: 9 }, s), null, 'even a different-looking entry with the same id is refused');
  const sum = RR.summarize(RR.load(s));
  assert.equal(sum.total.games, 1, 'the fixture counts exactly once');
  assert.equal(sum.total.w, 1);
  // Entries without an id (versus / online) rely on the caller's
  // once-guard (app commit `saved` flag / guest o.ended) — the module
  // still records them normally.
  assert(RR.recordResult({ mode: 'match', result: 'win', rs: 2, ra: 0, opp: 'Foxes' }, s), 'id-less entries record normally');
  assert.equal(RR.summarize(RR.load(s)).total.games, 2);
}

// ---------- invalid input and corrupt storage are safe ----------
{
  const s = memStorage();
  assert.equal(RR.recordResult({ mode: 'nope', result: 'win', rs: 1, ra: 0 }, s), null, 'unknown mode rejected');
  assert.equal(RR.recordResult({ mode: 'match', result: 'won', rs: 1, ra: 0 }, s), null, 'unknown result rejected');
  assert.equal(RR.recordResult(null, s), null, 'null entry rejected');
  assert.equal(RR.summarize(RR.load(s)).total.games, 0, 'rejected entries leave no trace');
  s.setItem(RR.KEY, '{broken json');
  assert.equal(RR.summarize(RR.load(s)).total.games, 0, 'corrupt JSON loads as an empty store');
  s.setItem(RR.KEY, JSON.stringify({ byMode: { match: { games: 'x', w: -3, l: 2.9, d: 1, rs: 7, ra: 4 }, bogus: { games: 9 } }, history: [{ mode: 'match', result: 'win', rs: 1, ra: 0 }, { mode: 'nope', result: 'win' }, 'junk'], seenIds: [42, 'ok-id'] }));
  const sum = RR.summarize(RR.load(s));
  assert.deepEqual([sum.total.games, sum.total.w, sum.total.l, sum.total.d], [0, 0, 2, 1], 'bucket values are sanitised (negative/fraction/string cleaned)');
  assert.equal(sum.history.length, 1, 'only valid history entries survive cleaning');
  assert.deepEqual(RR.load(s).seenIds, ['ok-id'], 'only string fixture ids survive cleaning');
}

// ---------- history is capped, aggregates are not ----------
{
  const s = memStorage();
  for (let i = 0; i < RR.HISTORY_MAX + 5; i++)
    RR.recordResult({ mode: 'survival', result: i % 2 ? 'loss' : 'win', rs: 3, ra: 2, opp: 'Owls' }, s);
  const sum = RR.summarize(RR.load(s));
  assert.equal(sum.history.length, RR.HISTORY_MAX, 'history list is capped');
  assert.equal(sum.total.games, RR.HISTORY_MAX + 5, 'aggregates keep every game even past the history cap');
}

// ---------- app wiring + pins (static) ----------
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
assert(app.includes('recordRoomCommit(g,abandoned);save();'), 'commit() (the once-guarded result path) records into the record room');
assert(app.includes("if(abandoned||!g.isFixture||g.umpireMode||g.spectate||g.timeAttack||g.farmGame||g.allstarEvent)return;"), 'abandoned / umpire / spectate / time-attack / farm / all-star games are excluded');
assert(app.includes("if(g.onlineGame)return 'online';") && app.includes("if(g.survival)return 'survival';") && app.includes("if(g.conquest)return 'conquest';") && app.includes("if(g.draftBattle)return 'draft';") && app.includes("if(g.apbcFixtureId||g.ctFixture)return 'apbc';") && app.includes("if(g.mode==='pennant')return 'pennant';"), 'mode classification covers online/survival/conquest/draft/apbc/pennant/match');
assert(app.includes('id:g.leagueFixtureId||g.apbcFixtureId||null'), 'fixture ids are passed for deduplication');
assert(app.includes("NightRecordRoom.recordResult({mode:'online',result:draw?'draw':mine?'win':'loss'"), 'the online guest records through the same module from its end handler');
assert(app.includes('game.draftBattle=true;'), 'draft-battle games are flagged at start so commit can classify them');
assert(app.includes('function recordRoomModal(){'), 'dashboard modal exists');
assert(app.includes('data-action="record-room"') && app.includes("case'record-room':recordRoomModal();break;"), 'the records modal links to the dashboard and the action is handled');
assert(app.includes('v156 以降に終了した試合から蓄積されます'), 'the dashboard states that pre-v156 games are not backfilled');
assert(app.includes('参考（v156より前の記録）') && app.includes('従来の対戦記録') && app.includes('オンライン通算（相手球団別）') && app.includes('サバイバル ベスト'), 'pre-existing aggregates (records / online / survival best) are shown as reference, not merged');
assert(html.includes('./record-room.js?v=1'), 'index loads record-room.js at v1');
assert(html.includes('./game.js?v=162') && html.includes('./app.js?v=162'), 'index pins at v156');
assert(sw.includes('nightball-v162-result-banner-compact'), 'SW cache renamed for v156');
assert(sw.includes('./game.js?v=162') && sw.includes('./app.js?v=162') && sw.includes('./record-room.js?v=1'), 'SW precaches the v156 scripts including the new module');

console.log('record-room-v156: unit + static assertions passed');

/* ---------- browser check (393x852): the real dashboard, populated and empty ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('record-room-v156: playwright unavailable — browser layout check skipped'); return; }
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
    // --- populated dashboard: record real results through the module,
    // then walk home -> 記録 -> dashboard exactly like a player.
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.NightRecordRoom && document.querySelector('#records'), null, { timeout: 15000 });
    await page.evaluate(() => {
      const RR = window.NightRecordRoom;
      RR.recordResult({ mode: 'match', result: 'win', rs: 5, ra: 2, opp: 'テスト球団A', at: new Date().toISOString(), id: null });
      RR.recordResult({ mode: 'pennant', result: 'loss', rs: 1, ra: 4, opp: 'テスト球団B', at: new Date().toISOString(), id: 'fx-1' });
      RR.recordResult({ mode: 'pennant', result: 'loss', rs: 1, ra: 4, opp: 'テスト球団B', at: new Date().toISOString(), id: 'fx-1' }); // duplicate fixture: must not count
      RR.recordResult({ mode: 'online', result: 'draw', rs: 3, ra: 3, opp: 'テスト球団C', at: new Date().toISOString(), id: null });
    });
    await page.click('#records');
    await page.click('[data-action="record-room"]');
    const m = await page.evaluate(() => {
      const content = document.querySelector('#modal-content');
      const overflow = [...content.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > 393.5 || el.getBoundingClientRect().left < -0.5).length;
      return { text: content.textContent, scrollWidth: content.scrollWidth, clientWidth: content.clientWidth, overflow };
    });
    assert(m.text.includes('通算戦績'), 'dashboard title renders');
    assert(m.text.includes('3試合') || m.text.includes('3 試合') || /総試合数/.test(m.text), 'dashboard shows the total label');
    assert(m.text.includes('1勝 1敗 1分') || m.text.includes('1勝') && m.text.includes('1敗'), 'dashboard W/L/D matches the recorded entries (duplicate fixture excluded): ' + m.text.slice(0, 400));
    assert(!m.text.includes('4試合'), 'the duplicated fixture id is not double-counted in the dashboard');
    assert(m.text.includes('モード別') && m.text.includes('ペナント') && m.text.includes('オンライン対戦'), 'per-mode breakdown renders');
    assert(m.text.includes('最近の試合'), 'recent history renders');
    assert(m.text.includes('参考（v156より前の記録）'), 'reference section renders');
    assert(m.scrollWidth <= m.clientWidth + 1, 'dashboard modal does not overflow horizontally at 393px');
    assert.equal(m.overflow, 0, 'no dashboard element sticks out of the 393px viewport');
    assert.deepEqual(errors, [], 'no page errors while opening the dashboard: ' + errors.join(' | '));
    await context.close();
    // --- zero-record dashboard: a fresh profile must render cleanly.
    const context2 = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page2 = await context2.newPage();
    const errors2 = [];
    page2.on('pageerror', e => errors2.push(e.message));
    await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page2.waitForFunction(() => window.NightRecordRoom && document.querySelector('#records'), null, { timeout: 15000 });
    await page2.click('#records');
    await page2.click('[data-action="record-room"]');
    const z = await page2.evaluate(() => {
      const content = document.querySelector('#modal-content');
      return { text: content.textContent, scrollWidth: content.scrollWidth, clientWidth: content.clientWidth };
    });
    assert(z.text.includes('まだ記録された試合がありません'), 'zero-record state explains itself instead of showing broken zeros');
    assert(z.text.includes('v156 以降'), 'zero-record state notes that recording starts at v156');
    assert(z.scrollWidth <= z.clientWidth + 1, 'zero-record dashboard does not overflow at 393px');
    assert.deepEqual(errors2, [], 'no page errors in the zero-record dashboard');
    await context2.close();
    console.log('record-room-v156: 393px browser layout check passed (populated + zero-record)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
