// v129 steal-success rebalance coverage:
//  - paired-seed measurement of resolveSteal success rates: the same seed
//    sequence drives every condition, so before/after numbers are directly
//    comparable. Conditions mirror the original audit: runner on 1st, 0 outs,
//    steal resolved on a taken pitch, standard-match defence (catcher arm 81),
//    pitch speed fixed at 148 km/h (the sampled fastball median).
//  - before v129 the same harness measured 27.7% / 34.7% / 47.0% / 58.7%
//    for run 50 / 65 / 80 / 95 — well under real baseball (~70%), so even
//    fast runners were negative-EV. Targets: 50 -> 55-65%, 80 -> 70-75%,
//    95 -> 78-85% (assert bands are widened for sampling noise).
//  - the opposing factors must keep working: a stronger catcher arm and a
//    faster pitch both lower the success rate.
//  - the v106 null-safety guard stays intact: a base flag without a runner
//    id drops the steal instead of moving a phantom runner.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data', 'players', 'pennant', 'apbc-data', 'apbc-candidates', 'apbc-tournament', 'derby', 'game', 'career-leagues', 'career-development', 'career-life', 'career-extras', 'squad', 'career']) {
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file + '.js', 'utf8'), { filename: file + '.js' });
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const origRandom = Math.random;

Math.random = mulberry32(129001);
const g = new NightGame('match', 'standard', () => {});
Math.random = origRandom;
g.half = 'bottom'; g.inning = 2;
const catcher = g.fielder('C');
assert.equal(catcher.arm, 81, 'measurement assumes the standard-match catcher (arm 81), got ' + catcher.arm);
const catcherSrc = g.lineups[g.side === 'home' ? 'away' : 'home'].find(p => (p.fieldPos || p.pos) === 'C');
const runner = g.lineups[g.side][0];

const N = 300;
function rate(run, { arm = null, speed = 148 } = {}) {
  const savedArm = catcherSrc.arm, savedRun = runner.run;
  if (arm !== null) catcherSrc.arm = arm;
  runner.run = run;
  let ok = 0;
  for (let i = 0; i < N; i++) {
    g.outs = 0;
    g.bases = [true, false, false];
    g.baseIds = [runner.id, null, null];
    g.basePitcherIds = [g.pitcher.id, null, null];
    g.steal = true;
    g.pitch = { speed };
    Math.random = mulberry32(555000 + i); // paired: identical roll sequence per attempt index in every condition
    g.resolveSteal();
    Math.random = origRandom;
    if (g.bases[1] && g.baseIds[1] === runner.id) ok++;
    else assert.equal(g.outs, 1, 'every steal attempt resolves as a success or a caught stealing');
  }
  runner.run = savedRun; catcherSrc.arm = savedArm;
  return ok / N;
}

const r50 = rate(50), r65 = rate(65), r80 = rate(80), r95 = rate(95);
console.log('steal success (N=' + N + ', paired seeds, arm 81, 148 km/h): run50=' + (r50 * 100).toFixed(1) + '% run65=' + (r65 * 100).toFixed(1) + '% run80=' + (r80 * 100).toFixed(1) + '% run95=' + (r95 * 100).toFixed(1) + '%');
assert(r50 >= .50 && r50 <= .70, 'run 50 in the widened 55-65% target band, got ' + r50);
assert(r65 >= .58 && r65 <= .75, 'run 65 between the 50 and 80 bands, got ' + r65);
assert(r80 >= .65 && r80 <= .80, 'run 80 in the widened 70-75% target band, got ' + r80);
assert(r95 >= .72 && r95 <= .90, 'run 95 in the widened 78-85% target band, got ' + r95);
assert(r95 > r80 && r80 > r50, 'success rate rises monotonically with runner speed');

// Opposing factors still bite: catcher arm and pitch speed move the rate.
const weakArm = rate(80, { arm: 61 }), strongArm = rate(80, { arm: 99 });
console.log('catcher arm effect at run 80: arm61=' + (weakArm * 100).toFixed(1) + '% arm99=' + (strongArm * 100).toFixed(1) + '%');
assert(weakArm > strongArm + .10, 'catcher arm still swings the success rate');
const slowPitch = rate(80, { speed: 130 }), fastPitch = rate(80, { speed: 160 });
assert(slowPitch > fastPitch, 'a faster pitch still lowers the success rate');

// v106 guard: phantom base state cannot move a runner.
{
  const p = new NightGame('match', 'standard', () => {});
  p.half = 'bottom';
  p.bases = [true, false, false]; p.baseIds = [null, null, null];
  p.steal = true;
  p.resolveSteal();
  assert.deepEqual(p.bases, [true, false, false]);
  assert.deepEqual(p.baseIds, [null, null, null]);
  assert.equal(p.outs, 0);
}

console.log('steal-balance-v129: all assertions passed');
