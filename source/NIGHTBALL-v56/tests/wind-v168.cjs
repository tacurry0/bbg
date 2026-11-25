// v168 regression: wind must act through relative air velocity, not as a
// constant acceleration (checker item wind-carry-overeffect). Before the
// fix, a +5 tailwind added +31.1 m to the reference fly (44 m/s, 32 deg,
// calm carry ~109.4 m) — 3-4x the real-world effect. After: about +6 m.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'dist', 'game.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'dist', 'sw.js'), 'utf8');

// --- static: the coupling is in place and the old constant push is gone ---
assert(game.includes('const WIND_COUPLING=.2'), 'WIND_COUPLING constant missing');
assert(game.includes('b.vy+wind*WIND_COUPLING*step'), 'wind term does not use the coupling');
assert(!game.includes('b.vy+wind*step'), 'old constant-acceleration wind term still present');
assert(game.includes('wind-carry-overeffect'), 'rationale comment missing');

// --- numeric probe on the real moveBattedBall extracted from game.js ---
const start = game.indexOf('const MAGNUS_LIFT');
const end = game.indexOf('const FLY_LEAD');
assert(start >= 0 && end > start, 'probe anchors missing');
eval(game.slice(start, end));
function fly(wind, sp0 = 44, deg = 32) {
  const ang = deg * Math.PI / 180, dt = 1 / 120;
  const b = { x: 0, y: 0, z: 1, vx: 0, vy: sp0 * Math.cos(ang), vz: sp0 * Math.sin(ang), bounces: 0, spinBack: 0, spinSide: 0 };
  let t = 0;
  while (t < 12) { if (moveBattedBall(b, dt, wind)) break; t += dt; }
  return b.y;
}
const calm = fly(0);
assert(calm > 105 && calm < 114, `calm carry drifted: ${calm.toFixed(1)}m`);
const plus5 = fly(5) - calm, plus3 = fly(3) - calm, minus5 = fly(-5) - calm;
assert(plus5 > 3.5 && plus5 < 10, `+5 tailwind effect out of band: +${plus5.toFixed(1)}m (was +31.1m before the fix)`);
assert(plus3 > 1.5 && plus3 < 6, `+3 tailwind effect out of band: +${plus3.toFixed(1)}m`);
assert(minus5 < -3.5 && minus5 > -10, `-5 headwind effect out of band: ${minus5.toFixed(1)}m`);
assert(Math.abs(plus5 + minus5) < 1.5, `wind effect should be near-symmetric: +${plus5.toFixed(1)} / ${minus5.toFixed(1)}`);
const popDrift = fly(5, 25, 60) - fly(0, 25, 60);
assert(popDrift > 1 && popDrift < 10, `weak pop-up drift out of band: ${popDrift.toFixed(1)}m`);

// --- version pins ---
assert(index.includes('./game.js?v=178') && index.includes('./app.js?v=178'), 'index pins not at v168');
assert(sw.includes('nightball-v178-bare-chart'), 'SW cache not renamed for v168');
assert(sw.includes('./game.js?v=178') && sw.includes('./app.js?v=178'), 'SW does not precache the v168 scripts');

console.log(`PASS: wind acts through relative air velocity (calm ${calm.toFixed(1)}m, +5 ${plus5 >= 0 ? '+' : ''}${plus5.toFixed(1)}m, -5 ${minus5.toFixed(1)}m, pop-up drift ${popDrift.toFixed(1)}m); v168 pins verified.`);
