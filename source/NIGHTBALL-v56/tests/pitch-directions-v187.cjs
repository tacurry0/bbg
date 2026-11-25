// v187: break-direction audit (direct user report: "the breaking
// balls bend in a weird direction"). Every pitch type was measured
// three ways — the TYPES table via pitchSpec, the actual flight
// (guide point -> arrival point on the batter's-view screen, +x
// screen-right, +y down), and the pitch deck's arrow formula
// (dx = spec.bx * hand flip, dy = spec.by) — for right- and
// left-handed pitchers. Engine flight and deck agreed everywhere,
// and left-handers mirror correctly. One type contradicted real
// baseball: the changeup carried bx +.20 (glove side, the slider's
// side), while a changeup fades ARM-side like the sinker/shoot
// family. v187 flips only its sign; the v183 break magnitude is
// untouched. This test pins the direction family of every pitch so
// a sign can never silently wander again.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data.js', 'players.js', 'pennant.js', 'game.js'])
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file, 'utf8'), { filename: file });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// Direction families for a RIGHT-handed pitcher, batter's view:
// glove = screen-right (bx > 0), arm = screen-left (bx < 0).
const GLOVE = ['slider', 'cutter', 'vslider'];
const ARM = ['curve', 'slowcurve', 'sinker', 'shoot', 'change'];
const STRAIGHT_DOWN = ['fork', 'split']; // |bx| a small fraction of by

for (const hand of ['R', 'L']) {
  const restore = Math.random; Math.random = mulberry32(1870);
  try {
    const g = new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, weather: 'clear' });
    g.half = 'bottom'; g.side = 'home';
    const P = g.pitcher;
    Object.assign(P, { hand, movement: 82, control: 80, velocity: 145, pitchDetails: {}, pitches: NightGame.TYPES.map(t => t.id) });
    const flip = hand === 'L' ? -1 : 1;
    for (const t of NightGame.TYPES) {
      const spec = NightGame.pitchSpec(P, t.id);
      g.createPitch({ id: t.id }, { x: 0, y: 0 });
      const p = g.pitch;
      // Flight: the pitch object carries the hand flip exactly once.
      assert(near(p.bx, spec.bx * flip, .02), `${hand}/${t.id}: pitch bx is spec bx with the hand flip`);
      assert(near(p.by, spec.by, .02), `${hand}/${t.id}: pitch by matches spec by`);
      // Guide -> arrival (the perceived break on screen) is +(bx, by).
      const arrival = g.pitchAt(1);
      assert(near(arrival.x, p.targetX) && near(arrival.y, p.targetY), `${hand}/${t.id}: ball arrives on target`);
      const vx = p.bx, vy = p.by; // arrival - guide, guide = target - break
      // Deck formula must point the same way as the flight.
      const dx = spec.bx * flip, dy = spec.by;
      assert(Math.sign(dx) === Math.sign(vx) && Math.sign(dy) === Math.sign(vy), `${hand}/${t.id}: deck arrow matches flight direction`);
      // Family membership (signs stated for R, mirrored for L).
      if (GLOVE.includes(t.id)) assert(Math.sign(vx) === flip, `${hand}/${t.id}: glove-side break`);
      if (ARM.includes(t.id)) assert(Math.sign(vx) === -flip, `${hand}/${t.id}: arm-side break`);
      if (STRAIGHT_DOWN.includes(t.id)) assert(Math.abs(vx) < Math.abs(vy) * .15 && vy > 0, `${hand}/${t.id}: drops almost straight down`);
      if (t.id !== 'fast') assert(vy > 0, `${hand}/${t.id}: breaking ball moves down`);
    }
    // The v187 fix itself: changeup is arm-side, magnitude preserved.
    const ch = NightGame.pitchSpec(P, 'change');
    assert(Math.sign(ch.bx) === -1, 'changeup base bx is arm-side (negative before the hand flip)');
    assert(near(ch.bx / ch.by, -.20 / .46, .02), 'changeup break ratio unchanged — sign flip only');
    assert(near(Math.hypot(ch.bx, ch.by) / NightGame.PITCH_BREAK_MUL / Math.hypot(-.20, .46), 1, .12), 'changeup break magnitude preserved (spin correction aside)');
    // Vertical slider stays vertical-dominant.
    const vs = NightGame.pitchSpec(P, 'vslider');
    assert(Math.abs(vs.by) > Math.abs(vs.bx) * 3, 'vertical slider is drop-dominant');
    console.log(`pitch-directions-v187: hand=${hand} all ${NightGame.TYPES.length} pitch directions verified`);
  } finally { Math.random = restore; }
}
console.log('pitch-directions-v187: PASS');
