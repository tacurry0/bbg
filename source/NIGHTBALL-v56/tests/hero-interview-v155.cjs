// v155: post-game hero interview (checker item "hero-interview").
// On a user win, the result screen shows an interview-style comment from
// the user's most valuable player. Selection reuses the exact scoring
// formula of NightGame.matchSummary() heroes (bat: rbi*2 + h + hr*2 +
// r*.5; pitch: outs*.35 + k*.8 - runs*1.7), restricted to the user's
// side, so the pick agrees with the existing 活躍した選手 list. The
// comment type follows the performance: walkoff / homer / multihit /
// clutch for batters, shutout / strikeout / winner for pitchers, and the
// player's name plus real stat line are embedded. Losses, draws,
// umpire mode and spectate produce no interview.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// results.js is an ES module; strip the export keywords and load it in a
// sandbox so buildMatchReport / heroInterviewHTML run unmodified.
const src = fs.readFileSync(__dirname + '/../dist/results.js', 'utf8').replace(/export function/g, 'function');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(src + '\nmodule.exports={buildMatchReport,buildHeroInterview,heroInterviewHTML,resultReportHTML};', sandbox);
const { buildMatchReport, heroInterviewHTML } = sandbox.module.exports;

function fakeGame({ userHome = true, homeScore = 0, awayScore = 0, box = {}, pitchingStats = {}, walkoffWin = false, umpireMode = false, decision = null } = {}) {
  const mk = prefix => ({
    name: prefix + '球団', logo: '',
    batters: [{ id: prefix + 'b1', name: prefix + '一郎' }, { id: prefix + 'b2', name: prefix + '二郎' }, { id: prefix + 'p1', name: prefix + '投手' }],
    pitchers: [{ id: prefix + 'p1', name: prefix + '投手' }, { id: prefix + 'p2', name: prefix + '救援' }]
  });
  const teams = { home: mk('H'), away: mk('A') };
  const userSide = userHome ? 'home' : 'away';
  return {
    inning: 1, phase: 'ended', teams, userSide, walkoffWin, umpireMode, spectate: false,
    userScore: userHome ? homeScore : awayScore, opponentScore: userHome ? awayScore : homeScore,
    homeScore, awayScore, homeHits: 0, awayHits: 0, home: [homeScore], away: [awayScore],
    usedPitchers: [0], usedCpuPitchers: [0],
    participants: { home: teams.home.batters.map(p => p.id), away: teams.away.batters.map(p => p.id) },
    removedPlayers: { home: [], away: [] }, box, pitchingStats,
    matchSummary: () => ({ decision, heroes: [] })
  };
}
const B = (ab, h, hr, rbi, r = 0) => ({ pa: ab, ab, h, hr, rbi, k: 0, bb: 0, r });
const P = (outs, k, runs) => ({ pitches: 40, batters: 12, outs, runs, k, bb: 0, h: 2 });

// ---------- batter heroes: type follows the performance ----------
{
  // Home run hero beats a decent pitching line.
  const g = fakeGame({ homeScore: 5, awayScore: 2, box: { Hb1: B(4, 2, 1, 3, 1) }, pitchingStats: { Hp1: P(9, 3, 2) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.name, 'H一郎', 'the top-scoring user batter is the hero');
  assert.equal(r.interview.type, 'homer');
  assert.equal(r.interview.stat, '4打数 2安打 1本塁打 3打点', 'the stat line mirrors the box score');
  const html = heroInterviewHTML(r);
  assert(html.includes('ヒーローインタビュー') && html.includes('H一郎') && html.includes(r.interview.comment) && html.includes('4打数 2安打 1本塁打 3打点'), 'the rendered interview carries name, comment and stats');
}
{
  // Walkoff hit outranks the plain homer/multihit wording.
  const g = fakeGame({ homeScore: 3, awayScore: 2, walkoffWin: true, box: { Hb2: B(4, 2, 0, 2, 1) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.name, 'H二郎');
  assert.equal(r.interview.type, 'walkoff');
  assert(r.interview.comment.includes('サヨナラ'), 'walkoff wording: ' + r.interview.comment);
}
{
  // Three hits, no homer -> multihit wording naming the hit total.
  const g = fakeGame({ homeScore: 4, awayScore: 1, box: { Hb1: B(4, 3, 0, 1, 2) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.type, 'multihit');
  assert(r.interview.comment.includes('3安打'), 'multihit wording names the hits: ' + r.interview.comment);
}
{
  // One hit but three RBI -> clutch wording.
  const g = fakeGame({ homeScore: 3, awayScore: 0, box: { Hb1: B(3, 1, 0, 3, 0) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.type, 'clutch');
  assert(r.interview.comment.includes('走者を還す'), 'clutch wording: ' + r.interview.comment);
}
{
  // Two homers get their own emphasis.
  const g = fakeGame({ homeScore: 6, awayScore: 2, box: { Hb1: B(4, 2, 2, 4, 2) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.type, 'homer');
  assert(r.interview.comment.includes('2本塁打'), 'multi-homer wording: ' + r.interview.comment);
}

// ---------- pitcher heroes ----------
{
  // Scoreless outing beats a one-hit batter; winner tag comes from the decision.
  const g = fakeGame({ homeScore: 2, awayScore: 0, box: { Hb1: B(3, 1, 0, 0, 1) }, pitchingStats: { Hp1: P(9, 4, 0) }, decision: { winner: { id: 'Hp1', name: 'H投手' }, loser: null } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.name, 'H投手');
  assert.equal(r.interview.role, '投手');
  assert.equal(r.interview.type, 'shutout');
  assert(r.interview.comment.includes('無失点'), 'shutout wording: ' + r.interview.comment);
  assert.equal(r.interview.stat, '3.0回 4奪三振 0失点 ・ 勝利投手', 'pitcher stat line with the win tag');
}
{
  // Seven strikeouts with a run allowed -> strikeout wording.
  const g = fakeGame({ homeScore: 3, awayScore: 1, box: { Hb1: B(3, 1, 0, 1, 0) }, pitchingStats: { Hp1: P(6, 7, 1) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.type, 'strikeout');
  assert(r.interview.comment.includes('7個の三振'), 'strikeout wording names the total: ' + r.interview.comment);
}

// ---------- only the user's side, only on a win ----------
{
  // The opponent's huge game never becomes the interview hero.
  const g = fakeGame({ homeScore: 1, awayScore: 0, box: { Ab1: B(4, 4, 2, 0, 0), Hb1: B(3, 1, 0, 1, 1) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.name, 'H一郎', 'hero is picked from the user side only');
}
{
  // Away user (先攻) works too.
  const g = fakeGame({ userHome: false, homeScore: 1, awayScore: 4, box: { Ab1: B(4, 2, 1, 2, 1) } });
  const r = buildMatchReport(g);
  assert.equal(r.interview.name, 'A一郎');
  assert.equal(r.interview.type, 'homer');
}
for (const [label, g] of [
  ['loss', fakeGame({ homeScore: 1, awayScore: 5, box: { Hb1: B(4, 3, 1, 1, 1) } })],
  ['draw', fakeGame({ homeScore: 2, awayScore: 2, box: { Hb1: B(4, 3, 1, 1, 1) } })],
  ['umpire mode win', fakeGame({ homeScore: 5, awayScore: 2, umpireMode: true, box: { Hb1: B(4, 3, 1, 3, 1) } })],
  ['no positive performance', fakeGame({ homeScore: 1, awayScore: 0, box: { Hb1: B(3, 0, 0, 0, 0) } })]
]) {
  const r = buildMatchReport(g);
  assert.equal(r.interview, null, `no interview on a ${label}`);
  assert.equal(heroInterviewHTML(r), '', `no interview HTML on a ${label}`);
}

// ---------- app wiring + version pins ----------
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
assert(app.includes("heroInterviewHTML} from './results.js?v=77'"), 'app imports the interview renderer at results v77');
assert(app.includes('const report=match?buildMatchReport(g):null;'), 'finish() builds the match report once');
assert(app.includes('${resultReportHTML(report)+heroInterviewHTML(report)}'), 'the normal-match result modal appends the interview');
assert(app.includes('resultReportHTML(r.report)+heroInterviewHTML(r.report)'), 'the pennant dashboard appends the interview to the stored report');
const html = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
assert(html.includes('./game.js?v=193') && html.includes('./app.js?v=193'), 'index pins at v155');
assert(sw.includes('nightball-v193-derby-bracket'), 'SW cache renamed for v155');
assert(sw.includes('./game.js?v=193') && sw.includes('./app.js?v=193') && sw.includes('./results.js?v=77'), 'SW precaches the v155 scripts');
assert(html.includes('./arcade.css?v=81') && sw.includes('./arcade.css?v=81'), 'arcade.css pin moves with the interview styles');
const arcade = fs.readFileSync(__dirname + '/../dist/arcade.css', 'utf8');
assert(arcade.includes('.hero-interview-card{') && arcade.includes('.hero-interview-comment{'), 'arcade.css carries the interview styles');

console.log('hero-interview-v155: unit + static assertions passed');

/* ---------- browser layout check (393x852): interview inside the result modal ---------- */
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.log('hero-interview-v155: playwright unavailable — browser layout check skipped'); return; }
  const interviewHTML = heroInterviewHTML(buildMatchReport(fakeGame({ homeScore: 5, awayScore: 2, box: { Hb1: B(4, 2, 1, 3, 1) }, pitchingStats: { Hp1: P(9, 3, 2) } })));
  assert(interviewHTML.includes('hero-interview'), 'interview HTML generated for the layout check');
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
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const m = await page.evaluate(h => {
      const modal = document.querySelector('#modal'), content = document.querySelector('#modal-content');
      content.innerHTML = '<div class="modal-top"><h2 id="modal-title">勝利</h2></div>' + h;
      modal.hidden = false;
      const el = content.querySelector('.hero-interview');
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, modalScrollWidth: content.scrollWidth, modalClientWidth: content.clientWidth, text: el.textContent };
    }, interviewHTML);
    assert(m.left >= -0.5 && m.right <= 393.5, `interview stays inside the 393px viewport (${JSON.stringify(m)})`);
    assert(m.scrollWidth <= m.clientWidth + 1, 'interview content does not overflow horizontally');
    assert(m.modalScrollWidth <= m.modalClientWidth + 1, 'the result modal does not overflow horizontally at 393px');
    assert(m.text.includes('H一郎') && m.text.includes('4打数 2安打 1本塁打 3打点'), 'interview text renders in the modal: ' + m.text);
    assert.deepEqual(errors, [], 'no page errors while rendering the interview');
    await context.close();
    console.log('hero-interview-v155: 393px browser layout check passed');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
