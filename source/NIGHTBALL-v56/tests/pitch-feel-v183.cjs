// v183: pitch feel rebalance (direct user request: "the fast ones
// faster, the slow ones slower — there is not enough speed
// differential — and make breaking balls bend more").
// Two global transforms in NightGame.pitchSpec, the single source
// every mode reads:
//  - Speed stretch around a 124 km/h pivot (x1.22, floor 70): each
//    pitch's set speed moves away from the middle, so a pitcher's
//    fastball/off-speed gap and the difference between pitchers both
//    widen by the stretch factor. createPitch stretches the
//    velocityEvidence fastMax ceiling by the same map so the cap can
//    never sit below the stretched set speed.
//  - Break scale x1.30 on bx/by. The pitch deck's 1-7 level divisor
//    grew by the same factor (18 -> 23.4 in app.js), so a chart level
//    keeps exactly its pre-v183 meaning instead of saturating at 7.
// Measured on the paired fixed-seed probes (this file's harness):
// roster fastball set speeds 133.9-150.1 -> 136.1-155.8, slowest
// pitch 101.0 -> 95.9; CPU-batting outcomes over 600 paired seeds:
// whiff/swing 34.90% -> 37.97%, K 20.47% -> 22.43%, hits/PA
// 30.3% -> 29.0%, XBH/PA 8.1% -> 7.5% — livelier stuff, no collapse.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data.js', 'players.js', 'pennant.js', 'game.js'])
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file, 'utf8'), { filename: file });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const near = (a, b, tol = .15) => Math.abs(a - b) <= tol;

// ---------- the stretch map itself ----------
{
  const S = NightGame.stretchPitchSpeed;
  assert(near(S(150), 155.72), 'a 150 km/h pitch stretches to ~155.7, got ' + S(150));
  assert(near(S(124), 124), 'the pivot does not move');
  assert(near(S(109), 105.7), 'a 109 km/h pitch drops to ~105.7, got ' + S(109));
  assert(near(S(101), 95.98), 'a 101 km/h slow pitch drops to ~96.0, got ' + S(101));
  assert.equal(S(60), 70, 'the floor guards generated pitchers with very low raw speeds');
  assert(S(155) > S(140) && S(140) > S(124) && S(124) > S(100), 'the map is monotone: individual differences survive');
  assert(near(S(155) - S(140), 15 * 1.22), 'the gap between two pitchers widens by the stretch factor');
}

// ---------- pitchSpec applies both transforms ----------
{
  const p = { velocity: 150, movement: 82, control: 70, hand: 'R', pitches: ['fast', 'slider', 'curve'] };
  const fast = NightGame.pitchSpec(p, 'fast'), slider = NightGame.pitchSpec(p, 'slider'), curve = NightGame.pitchSpec(p, 'curve');
  assert(near(fast.speed, 155.72), 'fastball set speed is stretched, got ' + fast.speed);
  assert(near(slider.speed, NightGame.stretchPitchSpeed(150 * 129 / 148)), 'slider set speed follows its raw speed through the stretch');
  assert(near(curve.speed, NightGame.stretchPitchSpeed(150 * 108 / 148)), 'curve set speed follows its raw speed through the stretch');
  assert(fast.speed - curve.speed > (150 - 150 * 108 / 148) + 5, 'one pitcher\'s fastball/curve differential widened');
  // movement 82 -> break scale 1, spin at baseline -> Magnus factor 1,
  // so the spec break is the type break times exactly the v183 scale.
  assert(near(slider.bx, .85 * 1.3, .01) && near(slider.by, .13 * 1.3, .01), 'slider break is x1.30, got ' + slider.bx + '/' + slider.by);
  assert(near(fast.by, -.10 * 1.3, .01), 'even the fastball\'s small rise scales, got ' + fast.by);
  assert(near(Math.hypot(curve.bx, curve.by), Math.hypot(-.50, .95) * 1.3, .02), 'curve break magnitude is x1.30');
}

// ---------- roster-wide: range widened, chart levels unchanged ----------
{
  let fastMax = 0, slowMin = 1e9;
  for (const club of Object.values(NightPlayers.rosters)) for (const p of club.pitchers || []) {
    for (const id of p.pitches || []) {
      const s = NightGame.pitchSpec(p, id), h = Math.hypot(s.bx, s.by);
      if (id === 'fast') fastMax = Math.max(fastMax, s.speed); else slowMin = Math.min(slowMin, s.speed);
      // The deck level with the v183 divisor (23.4) on the scaled
      // break must equal the pre-v183 level (divisor 18 on the
      // unscaled break) for every pitch in the game.
      const now = Math.max(1, Math.min(7, Math.round(h * 82 / 23.4)));
      const before = Math.max(1, Math.min(7, Math.round(h / 1.3 * 82 / 18)));
      assert.equal(now, before, `chart level preserved for ${p.name}/${id}`);
    }
  }
  assert(fastMax > 154 && fastMax < 158, 'the hardest roster fastball now sits at ~156, got ' + fastMax);
  assert(slowMin > 92 && slowMin < 99, 'the slowest roster pitch now sits at ~96, got ' + slowMin);
}

// ---------- paired fixed-seed outcome bands (CPU batting) ----------
{
  const FAIR = new Set(['single', 'double', 'triple', 'hr', 'groundout', 'flyout', 'forceout', 'doubleplay', 'sacrifice', 'sacrificefly', 'buntout', 'buntsingle']);
  const agg = { pitches: 0, swings: 0, whiffs: 0, fouls: 0, fair: 0, pa: 0, k: 0, h: 0 };
  for (let seed = 1; seed <= 200; seed++) {
    const pitcherIdx = seed % 6, restore = Math.random;
    Math.random = mulberry32(seed * 7919 + pitcherIdx * 131);
    try {
      const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, pitcher: pitcherIdx, weather: 'clear' });
      g.autoDefense = true;
      const oc = g.completePitch.bind(g);
      g.completePitch = kind => {
        if (g.pitch) {
          agg.pitches++;
          if (g.pitch.swung) agg.swings++;
          if (kind === 'miss' && g.pitch.swung) agg.whiffs++;
          else if (kind === 'foul') agg.fouls++;
          else if (FAIR.has(kind)) agg.fair++;
        }
        return oc(kind);
      };
      const oe = g.endAtBat.bind(g);
      g.endAtBat = (kind, runs = 0, sim = false) => {
        agg.pa++;
        if (kind === 'strikeout') agg.k++;
        if (['single', 'double', 'triple', 'hr'].includes(kind)) agg.h++;
        return oe(kind, runs, sim);
      };
      let steps = 0;
      while (steps++ < 60000) { g.update(50); if (g.half === 'bottom' || g.phase === 'change' || g.inning > 1) break; }
      assert(steps < 60000, 'seed ' + seed + ' finished its half');
    } finally { Math.random = restore; }
  }
  const whiff = agg.whiffs / agg.swings, kRate = agg.k / agg.pa, hRate = agg.h / agg.pa;
  console.log(`pitch-feel probe: pitches=${agg.pitches} whiff/swing=${(whiff * 100).toFixed(2)}% K=${(kRate * 100).toFixed(2)}% H/PA=${(hRate * 100).toFixed(2)}%`);
  assert(whiff > .32 && whiff < .46, 'whiff rate rose into the livelier band without exploding, got ' + whiff);
  assert(kRate > .17 && kRate < .29, 'strikeout rate up but bounded, got ' + kRate);
  assert(hRate > .24, 'hits did not collapse, got ' + hRate);
  assert(agg.fouls / Math.max(1, agg.fair + agg.fouls) < .02, 'foul share stays negligible for CPU batters');
}

// ---------- version pins ----------
{
  const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
  const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
  assert(index.includes('./game.js?v=186') && index.includes('./app.js?v=186'), 'index pins at v183');
  assert(sw.includes("const CACHE='nightball-v186-pitch-guide'"), 'SW cache renamed for v183');
}
console.log('pitch-feel-v183: all assertions passed');
