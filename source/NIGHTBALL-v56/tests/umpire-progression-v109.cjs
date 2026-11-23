// v109 guard for the reported umpire-mode stall: after a base play has
// been judged once, a grounder with a fielding bobble (rain) that ends in
// an out — with a second close play judged during it — must resolve and
// the game must move on to the next at-bat. Audited in v109: the engine
// sequence was verified end-to-end (this test), in full-game fuzz, and in
// the real app; progression out of the result phase is asserted here so
// the reported sequence stays covered.
const assert = require('node:assert/strict');
global.window = global;
const modules = ['ratings-data', 'players', 'pro-parks', 'pennant', 'npb-postseason', 'npb-data', 'npb-rosters', 'kbo-data', 'kbo-rosters', 'career-leagues', 'derby', 'game'];
for (const file of modules) require('../dist/' + file + '.js');
function seeded(seed) { let s = seed >>> 0; const orig = Math.random; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; return () => { Math.random = orig; }; }

for (const seed of [31004, 31006]) {
  const restore = seeded(seed);
  const g = new NightGame('match', 'standard', () => {}, { umpire: true, innings: 9, userHome: true });
  g.playChallenges = 2; g.playCpuChallenges = 2; g.spectate = true; g.autoBatting = true; g.autoDefense = true;
  g.weather = 'rain';
  // First close play, judged by the umpire.
  const side = g.side, runner = g.lineups[side][4];
  g.bases = [true, false, false]; g.baseIds = [runner.id, null, null]; g.basePitcherIds = [g.pitcher.id, null, null];
  g.startField(28, 10, .3, false);
  const batter = g.field.runners.find(r => r.batter);
  Object.assign(batter, { progress: 1, base: 1, furthest: 1, command: 1, waiting: true, running: false });
  const lead = g.field.runners.find(r => !r.batter);
  lead.progress = 1.84;
  g.manualOut(lead, 'tag', 2);
  g.finishManualPlay();
  assert.equal(g.phase, 'play-call');
  assert.equal(g.umpirePlayCall(false), true);
  assert.equal(g.umpireStats.playCalls, 1);
  let t = 0;
  while (!['aim', 'windup', 'pitch'].includes(g.phase) && t++ < 3000) {
    if (g.phase === 'umpire-call') { g.umpireCall(true); continue; }
    if (g.phase === 'play-call') { g.umpirePlayCall(false); continue; }
    if (g.phase === 'change') { g.acknowledgeHalf(); continue; }
    g.update(50);
  }
  assert(['aim', 'windup', 'pitch'].includes(g.phase), 'game reaches the next at-bat after the judged play');
  // Bobble grounder against a weakened defense, windows answered.
  const defSide = g.side === 'home' ? 'away' : 'home';
  for (const p of g.lineups[defSide]) p.field = 25;
  g.startField(30, 8, .25, false);
  let resultAt = -1, noteSeen = '';
  for (t = 0; t < 6000; t++) {
    if (g.field?.fieldingNote) noteSeen = g.field.fieldingNote;
    if (g.phase === 'field' && g.field && !g.field.misplay) {
      const idx = g.field.chaser ?? g.field.manual?.holder;
      if (idx != null) g.bobbleGrounder(idx);
    }
    if (g.phase === 'play-call') { assert.equal(g.umpirePlayCall(false), true); continue; }
    if (g.phase === 'umpire-call') { g.umpireCall(true); continue; }
    if (g.phase === 'change') { g.acknowledgeHalf(); continue; }
    g.update(50);
    if (g.phase === 'result' && g.field?.resolved && resultAt < 0) resultAt = t;
    if (resultAt >= 0 && g.phase !== 'result') break;
  }
  assert(noteSeen, 'the grounder produced a fielding note (bobble) for seed ' + seed);
  assert(resultAt >= 0, 'the bobble play resolved');
  assert(t - resultAt < 200, `game leaves the result phase promptly after the error play (took ${t - resultAt} ticks)`);
  assert(['aim', 'windup', 'pitch', 'umpire-call', 'play-call'].includes(g.phase), 'next at-bat is live, phase=' + g.phase);
  restore();
}
console.log('umpire-progression-v109: judged bobble plays resolve and the game moves on');
