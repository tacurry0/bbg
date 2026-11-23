// v109 regression: a pro career live game must always start.
// Found by fuzzing a CPBL (tw) batter career: liveOptions computed
// opponentPitcher from the fixture's AWAY team instead of the rival team.
// When the player was the away side, that index pointed into the player's
// own staff and could exceed the opponent staff's length, so the engine's
// pitcher for the opponent was undefined and advanceCareer -> cpuRelief ->
// pitcherRecord threw on the first intro tick, freezing the game on a
// blank stage (the v99 pattern). Fixes: liveOptions uses the rival team,
// the NightGame constructor validates opponentPitcher like pitcher, and
// cpuRelief bails out when the current pitcher is missing.
const assert = require('node:assert/strict');
global.window = global;
const modules = ['ratings-data', 'players', 'pro-parks', 'pennant', 'npb-postseason', 'npb-data', 'npb-rosters', 'kbo-data', 'kbo-rosters',
  'career-leagues', 'career-development', 'career-life', 'career-extras', 'career', 'game',
  'career-world-data', 'career-world-identities', 'career-world-leagues', 'career-world-international', 'career-world-school', 'career-world-match', 'career-world-save', 'career-world-success', 'career-world', 'career-world-slots', 'career-world-view'];
for (const file of modules) require('../dist/' + file + '.js');
const D = NightCareerWorldData, W = NightCareerWorld;
const clone = w => W.restore(NightCareerWorldSave.decode(NightCareerWorldSave.encode(w)));

// ---- engine guard: an out-of-range opponentPitcher can never wedge a game
{
  const g = new NightGame('match', 'standard', () => {}, { opponentPitcher: 99 });
  const cpuStaff = g.pitchingStaff[g.userSide === 'home' ? 'away' : 'home'];
  assert(cpuStaff[g.awayPitcherIndex], 'awayPitcherIndex falls back into the opponent staff');
  assert.equal(g.awayPitcherIndex, 0);
  assert(g.pitcher, 'a pitcher is always resolvable');
  assert.doesNotThrow(() => g.pitcherRecord(g.pitcher));
}

// ---- the fuzzed career: every fixture of four pro seasons must start
const w = new W({ country: 'tw', name: '陳承翰', region: D.countries.tw.region[0], style: 'contact', schoolIndex: 1, schoolTier: 1, difficulty: 'normal', short: true, seed: 'career-fuzz-b/contact' });
{ let days = 0; while (w.stage === 'school' && days++ < 100) { w.run('season'); if (w.queue) w.finishDay(); } assert.equal(w.stage, 'draft'); }
w.draftApply(true); w.draftReveal(true);
if (!w.draft.offer) { w.amateur('大学'); w.run('season'); w.draftApply(true); w.draftReveal(true); }
assert(w.signDraft(), 'draft signing');

let started = 0, awayFixtures = 0;
for (let season = 0; season < 4 && w.stage !== 'retired'; season++) {
  let guard = 0;
  while (w.stage === 'pro' && guard++ < 60) {
    w.run('game');
    if (!w.queue) { if (w.stage !== 'pro') break; continue; }
    const f = w.active;
    if (f) {
      for (const format of ['self', 'full']) {
        const wc = clone(w);
        const options = wc.liveOptions(format);
        if (!options) continue;
        const rivalSide = options.userHome ? 'away' : 'home';
        const rivalPitchers = options.clubs[rivalSide].pitchers;
        assert(rivalPitchers[options.opponentPitcher],
          `fixture ${f.id} (${format}): opponentPitcher ${options.opponentPitcher} must index the rival staff (${rivalPitchers.length})`);
        const mode = options.career ? (options.career.pitching ? 'career-pitch' : 'career-bat') : 'match';
        const game = new NightGame(mode, 'standard', () => {}, { ...options, manualRunning: false });
        if (!options.userHome) awayFixtures++;
        assert(game.pitchingStaff[rivalSide][game.awayPitcherIndex], 'engine opponent pitcher resolves');
        for (let t = 0; t < 40 && game.phase !== 'ended'; t++) {
          if (game.phase === 'career-ready') game.acknowledgeCareerAppearance();
          else if (game.phase === 'change') game.acknowledgeHalf();
          game.update(50); // must never throw: a throw here is the blank-stage freeze
        }
        assert.notEqual(game.phase, 'intro', `fixture ${f.id} (${format}) leaves the intro`);
        started++;
      }
    }
    w.finishDay();
  }
  if (w.stage === 'offseason') {
    const same = w.offers.findIndex(o => o.club === w.club);
    if (!w.stay() && !w.accept(same >= 0 ? same : 0)) break;
  } else break;
}
assert(started > 20, 'fixtures were exercised: ' + started);
assert(awayFixtures > 0, 'away fixtures (the broken side) were exercised: ' + awayFixtures);
console.log(`career-world-freeze-v109: ${started} live starts OK (${awayFixtures} away)`);
