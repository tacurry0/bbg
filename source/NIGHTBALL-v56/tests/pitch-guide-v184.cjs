// v184: two direct user requests from real-device play.
// (1) "Whatever the breaking ball, the ball arrives right on the
// cursor marker, so it is too easy to hit — shouldn't it move away
// from there by the break?" The flight model already encoded the
// Pawapuro read — pitchAt's base path heads for (target - break)
// and the break term carries the ball to the target — but both
// batting markers (the 3D timing ring and the 2D assist dot) were
// drawn ON the arrival point, so the marker gave the arrival away.
// Fix: markers now draw NightGame.pitchGuidePoint() = target - break,
// the no-break arrival; the ball arrives exactly one break away.
// Flight, arrival, strike/ball judgment and contact judgment are
// untouched (they all read the target, which is the arrival).
// (2) "Make the ball miss by more, depending on control." The aim
// scatter in cpuPitchPlan (CPU arms) and throwPitch /
// remoteThrowPitch (the user's arms) gained a second, steeper slope
// below control 70 plus a wild-pitch chance below 65 in the plan;
// control 70+ keeps the exact pre-v184 precision, so an S-grade arm
// stays a surgeon. Paired fixed-seed probes (40 seeds x 3 innings,
// take-all): walk rate by control band 95/85/70/55/40 was
// 1.6/3.7/10.1/11.2/25.1% before and 1.4/5.5/6.9/16.6/27.3% after —
// a clearly steeper gradient at the wild end, no walk collapse;
// plan targets outside the zone 21% -> 47% from control 95 to 40.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data.js', 'players.js', 'pennant.js', 'game.js'])
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file, 'utf8'), { filename: file });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

// ---------- guide point: marker = no-break arrival, ball = marker + break ----------
{
  const restore = Math.random; Math.random = mulberry32(4242);
  try {
    const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, weather: 'clear' });
    g.half = 'bottom'; g.side = 'home';
    g.pitcher.movement = 70; // the user's screenshot case: a ~24cm curve
    g.createPitch({ id: 'curve' }, { x: 0.2, y: 0.15 });
    const p = g.pitch, guide = g.pitchGuidePoint(), arrival = g.pitchAt(1);
    assert(near(arrival.x, p.targetX) && near(arrival.y, p.targetY), 'the ball still arrives exactly on the target (flight unchanged)');
    assert(near(guide.x, p.targetX - p.bx) && near(guide.y, p.targetY - p.by), 'the guide point is the target minus the full break');
    const offsetCm = Math.hypot(arrival.x - guide.x, arrival.y - guide.y) * 20.4;
    const shownCm = Math.hypot(p.bx, p.by) * 20.4;
    assert(Math.abs(offsetCm - shownCm) < 1e-6, 'marker-to-arrival offset equals the break amount');
    assert(shownCm > 20 && shownCm < 29, `the test curve breaks ~24cm like the user's screenshot (got ${shownCm.toFixed(1)})`);
    assert.equal(p.isStrike, Math.abs(p.targetX) <= 1.06 && Math.abs(p.targetY) <= 1.06, 'strike judgment still reads the arrival point');
    // A fastball's guide sits almost on the arrival (tiny break).
    g.createPitch({ id: 'fast' }, { x: 0.2, y: 0.15 });
    const fp = g.pitch, fg = g.pitchGuidePoint();
    assert(Math.hypot(fp.targetX - fg.x, fp.targetY - fg.y) < Math.hypot(p.bx, p.by) * .3, 'fastball guide stays near the arrival');
    assert.equal(g.pitchGuidePoint.call({ pitch: null }), null, 'no pitch -> no guide point');
  } finally { Math.random = restore; }
}

// ---------- both marker renderers read the guide point ----------
{
  const stadium = fs.readFileSync(__dirname + '/../dist/stadium3d.js', 'utf8');
  const renderer = fs.readFileSync(__dirname + '/../dist/renderer.js', 'utf8');
  assert(stadium.includes('pitchGuidePoint'), 'the 3D timing ring is drawn at the guide point');
  assert(renderer.includes('pitchGuidePoint'), 'the 2D assist dot is drawn at the guide point');
  assert(!stadium.includes('aimPoint(g.pitch.targetX,g.pitch.targetY)'), 'the timing ring no longer sits on the arrival point');
  assert(!renderer.includes('tx=x+g.pitch.targetX*75'), 'the assist dot no longer sits on the arrival point');
  // Umpire mode keeps every aiming overlay hidden (the whole HUD
  // block is gated on !g.umpireMode) and hardcore still hides the ring.
  assert(stadium.includes('!g.umpireMode') && stadium.includes('!g.hardcore'), 'umpire/hardcore overlay gates untouched');
}

// ---------- control scatter: plan targets spread by control band ----------
{
  const outRate = control => {
    const restore = Math.random; Math.random = mulberry32(12345 + control);
    try {
      const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, weather: 'clear' });
      g.half = 'bottom'; g.side = 'home'; g.pitcher.control = control;
      let out = 0; const N = 3000;
      for (let i = 0; i < N; i++) {
        g.balls = 0; g.strikes = 0; g.pitchTrace = [];
        const plan = g.cpuPitchPlan();
        if (Math.abs(plan.target.x) > 1.06 || Math.abs(plan.target.y) > 1.06) out++;
      }
      return out / N;
    } finally { Math.random = restore; }
  };
  const hi = outRate(95), lo = outRate(40);
  assert(hi < .27, `an S-grade arm still lives in/near the zone (out ${hi.toFixed(3)})`);
  assert(lo > hi + .12, `a wild arm misses the zone far more often (out ${lo.toFixed(3)} vs ${hi.toFixed(3)})`);
}

// ---------- control scatter: throwPitch deviation by control band ----------
{
  const meanDevCm = control => {
    const restore = Math.random; Math.random = mulberry32(777 + control);
    try {
      const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, weather: 'clear' });
      g.half = 'top'; g.side = 'away'; g.batFinished = false; g.prepare();
      g.pitcher.control = control;
      let sum = 0, n = 0;
      for (let i = 0; i < 800; i++) {
        g.phase = 'aim'; g.pitch = null; g.stamina = 100; g.balls = 0; g.strikes = 0;
        g.pitchType = 'fast'; g.cursor = { x: 0.55, y: -0.2 };
        if (!g.throwPitch()) continue;
        sum += Math.hypot(g.pitch.targetX - 0.55, g.pitch.targetY + 0.2); n++;
      }
      return sum / Math.max(1, n) * 20.4;
    } finally { Math.random = restore; }
  };
  const hi = meanDevCm(95), lo = meanDevCm(40);
  assert(hi < 2, `an S-grade arm stays precise (mean deviation ${hi.toFixed(1)}cm)`);
  assert(lo > 6, `a wild arm visibly misses its spot (mean deviation ${lo.toFixed(1)}cm)`);
}

// ---------- take-all walk sanity: steeper gradient, no collapse ----------
{
  const bbRate = control => {
    let pa = 0, bb = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const restore = Math.random; Math.random = mulberry32(seed * 31337 + control * 101);
      try {
        const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, weather: 'clear' });
        g.autoDefense = true;
        const oc = g.createPitch.bind(g);
        g.createPitch = (type, target) => { if (!g.defending && g.pitcher) g.pitcher.control = control; return oc(type, target); };
        const oe = g.endAtBat.bind(g);
        g.endAtBat = (kind, runs = 0, sim = false) => { if (!g.defending) { pa++; if (kind === 'walk') bb++; } return oe(kind, runs, sim); };
        let steps = 0;
        while (steps++ < 200000 && g.phase !== 'ended') { if (g.phase === 'change') { g.acknowledgeHalf(); continue; } g.update(50); if (g.inning > 3) break; }
      } finally { Math.random = restore; }
    }
    return bb / Math.max(1, pa);
  };
  const hi = bbRate(95), lo = bbRate(40);
  assert(lo < .42, `even a take-all batter does not walk at a game-breaking rate vs the wildest arm (got ${(lo * 100).toFixed(1)}%)`);
  assert(lo > hi, `walks still grade with control (${(hi * 100).toFixed(1)}% at 95 vs ${(lo * 100).toFixed(1)}% at 40)`);
}

// ---------- version pins ----------
{
  const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
  const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
  assert(index.includes('./game.js?v=185') && index.includes('./app.js?v=185'), 'index pins at v184');
  assert(index.includes('./renderer.js?v=63'), 'the changed renderer module pin moved in index');
  assert(fs.readFileSync(__dirname + '/../dist/app.js', 'utf8').includes('stadium3d.js?v=80'), 'the changed stadium module pin moved in app.js');
  assert(sw.includes("const CACHE='nightball-v185-pitch-flight'"), 'SW cache renamed for v184');
  assert(sw.includes('./game.js?v=185') && sw.includes('./renderer.js?v=63') && sw.includes('./stadium3d.js?v=80'), 'SW precaches the v184 assets');
}
console.log('pitch-guide-v184: all assertions passed');
