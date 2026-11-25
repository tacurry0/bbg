// v180: low-rebound bat (variant rule "lowReboundBat").
// The metal bat's mirror image in the v133 variant-rule frame:
// where the metal bat multiplies exit velocity by 1.03 in
// startField, the low-rebound bat multiplies it by 0.97 at the same
// single point, so the v108 spin/carry model is untouched. The two
// bat rules are mutually exclusive — the setup toggles turn each
// other off, and normalizeVariantRules (the single gate) drops the
// low-rebound bat if a caller passes both. Scope, gating and
// preset handling match the other variant rules exactly: regular
// versus matches only, and the settings key variantLowReboundBat
// rides in match presets as an OPTIONAL_BOOL_KEY (v153 frame).
// Effect size is pinned by the same paired fixed-seed probe as the
// metal bat (reference swing 44 m/s at 32 degrees, N=120): metal
// gains +5.59 m of mean carry there; the low-rebound bat must lose
// a comparable, perceptible but not extreme amount.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
for (const file of ['ratings-data.js', 'players.js', 'pennant.js', 'game.js'])
  vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file, 'utf8'), { filename: file });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seeded(seed) { const orig = Math.random; Math.random = mulberry32(seed); return () => { Math.random = orig; }; }
function matchGame(rules, extra = {}) { return new NightGame('match', 'standard', () => {}, { userHome: true, innings: 3, ...(rules ? { variantRules: rules } : {}), ...extra }); }
const OFF = { fullCount: false, metalBat: false, noBreaking: false, twoOuts: false, lowReboundBat: false };

// ---------- normalize: acceptance, exclusivity, scope gates ----------
assert.deepEqual(matchGame({ lowReboundBat: true }).variantRules, { ...OFF, lowReboundBat: true }, 'versus match accepts the low-rebound bat');
assert.deepEqual(matchGame({ metalBat: true, lowReboundBat: true }).variantRules, { ...OFF, metalBat: true }, 'both bats passed: the metal bat wins, low-rebound drops');
assert.deepEqual(matchGame({ lowReboundBat: true, fullCount: true }).variantRules, { ...OFF, lowReboundBat: true, fullCount: true }, 'low-rebound combines with the non-bat rules');
assert.deepEqual(new NightGame('pennant', 'standard', () => {}, { variantRules: { lowReboundBat: true } }).variantRules, OFF, 'pennant never gets the low-rebound bat');
assert.deepEqual(new NightGame('match', 'standard', () => {}, { variantRules: { lowReboundBat: true }, umpire: true }).variantRules, OFF, 'umpire mode never gets the low-rebound bat');
assert.deepEqual(new NightGame('match', 'standard', () => {}, { variantRules: { lowReboundBat: true }, remoteSide: 'away' }).variantRules, OFF, 'online games never get the low-rebound bat');
assert.deepEqual(matchGame().variantRules, OFF, 'no option means the low-rebound bat is OFF');

// ---------- paired fixed-seed carry probe (the v133 yardstick) ----------
function carry(seed, rules) {
  const g = matchGame(rules);
  g.half = 'bottom'; g.weather = 'clear'; g.wind = 0; // pin the weather so the pair differs only by the bat
  const restore = seeded(seed);
  g.startField(44, 32, 0, false, true, { quality: .9, side: 0 });
  restore();
  const landing = g.predictLanding(g.field.ball);
  return { dist: Math.hypot(landing.x, landing.y), exit: g.hit.exitKmh };
}
{
  let offSum = 0, lowSum = 0, metalSum = 0, exitDrop = 0; const N = 120;
  for (let seed = 1; seed <= N; seed++) {
    const off = carry(seed, null), low = carry(seed, { lowReboundBat: true }), metal = carry(seed, { metalBat: true });
    offSum += off.dist; lowSum += low.dist; metalSum += metal.dist; exitDrop += off.exit - low.exit;
    assert(low.dist < off.dist, 'low-rebound bat carries shorter on seed ' + seed);
    assert(metal.dist > off.dist, 'metal bat still carries farther on seed ' + seed);
  }
  const offAvg = offSum / N, lowAvg = lowSum / N, metalAvg = metalSum / N;
  console.log(`low-rebound probe: mean carry OFF ${offAvg.toFixed(2)} m -> LOW ${lowAvg.toFixed(2)} m (${(lowAvg - offAvg).toFixed(2)} m, ${((lowAvg / offAvg - 1) * 100).toFixed(1)}%), metal ${(metalAvg - offAvg >= 0 ? '+' : '') + (metalAvg - offAvg).toFixed(2)} m on the same probe, mean exit velocity -${(exitDrop / N).toFixed(1)} km/h`);
  assert(offAvg - lowAvg > 3, 'low-rebound bat removes real carry (-' + (offAvg - lowAvg).toFixed(2) + ' m)');
  assert(offAvg - lowAvg < 9, 'low-rebound bat stays a modest drag, not a dead-ball mode (-' + (offAvg - lowAvg).toFixed(2) + ' m)');
  assert(Math.abs((offAvg - lowAvg) - (metalAvg - offAvg)) < 2.5, 'the drag is the metal boost\'s mirror in magnitude');
  assert(exitDrop / N > 2, 'exit velocity actually drops');
}

// ---------- OFF is exactly the no-option game ----------
{
  const ball = g => { const restore = seeded(7); g.half = 'bottom'; g.weather = 'clear'; g.wind = 0; g.startField(44, 32, .1, false, true, { quality: .9, side: .2 }); restore(); const l = g.predictLanding(g.field.ball); return [Math.round(l.x * 1e6), Math.round(l.y * 1e6), g.hit.exitKmh]; };
  assert.deepEqual(ball(matchGame()), ball(matchGame({ lowReboundBat: false })), 'explicit low-rebound OFF flight matches the no-option game exactly');
  // The derby is exempt, like the metal bat: normalizeVariantRules
  // gates every non-match mode out before startField ever sees a flag.
  assert.deepEqual(NightGame.normalizeVariantRules('derby', { variantRules: { lowReboundBat: true } }), OFF, 'the derby never gets the low-rebound bat (normalize gates it out)');
}

// ---------- snapshot / restore keeps the rule ----------
{
  const g = matchGame({ lowReboundBat: true });
  const restored = NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())), () => {});
  assert(restored, 'low-rebound match restores from a snapshot');
  assert.deepEqual(restored.variantRules, { ...OFF, lowReboundBat: true }, 'the low-rebound bat survives restore');
}

// ---------- presets carry the settings key (v153 frame) ----------
{
  const store = new Map();
  global.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  for (const file of ['pro-parks.js', 'stadium-editor.js', 'apbc-data.js', 'npb-data.js', 'npb-rosters.js', 'kbo-data.js', 'kbo-rosters.js', 'match-presets.js'])
    vm.runInThisContext(fs.readFileSync(__dirname + '/../dist/' + file, 'utf8'), { filename: file });
  const P = global.NightMatchPresets;
  assert(P, 'NightMatchPresets module loads');
  assert(P.VARIANT_KEYS.includes('variantLowReboundBat'), 'preset VARIANT_KEYS includes the low-rebound settings key');
  assert(P.OPTIONAL_BOOL_KEYS.includes('variantLowReboundBat'), 'the low-rebound key is an optional bool key (old presets leave it untouched)');
  const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
  const storage = mem();
  const base = { matchTeam: 'owls', matchOpponent: 'foxes', matchUserHome: true, innings: 5, park: 'night', gameLighting: 'auto', pitcher: 0, difficulty: 'standard', customDifficulty: { bat: 0, pitch: 0, field: 0, run: 0 }, defenseSpeed: 1, fieldSpeed: 1, manualRunning: true, battingAssist: true, tiebreak: false };
  const saved = P.add('低反発テスト', P.snapshot({ ...base, variantLowReboundBat: true }, 0), storage);
  assert.equal(P.get(saved.id, storage).values.variantLowReboundBat, true, 'preset snapshot captures variantLowReboundBat');
  const cleaned = P.cleanValues({ variantLowReboundBat: true });
  assert.equal(cleaned.variantLowReboundBat, true, 'cleanValues keeps a present low-rebound key');
  assert(!('variantLowReboundBat' in P.cleanValues({})), 'an absent low-rebound key stays absent (pre-v180 presets preserve the live value)');
  assert.equal(P.cleanValues({ variantLowReboundBat: 'yes' }).variantLowReboundBat, false, 'a malformed low-rebound value falls back to false');
}

// ---------- app wiring + version pins ----------
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const game = fs.readFileSync(__dirname + '/../dist/game.js', 'utf8');
const presets = fs.readFileSync(__dirname + '/../dist/match-presets.js', 'utf8');
const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
assert(game.includes("'lowReboundBat'"), 'the engine rule key exists');
assert(game.includes('speed*=.97'), 'startField applies the -3% exit velocity');
assert(app.includes('variantLowReboundBat:false'), 'settings default the low-rebound bat OFF');
assert(app.includes("['variantLowReboundBat','低反発バット'"), 'the setup screen renders the low-rebound toggle in the variant section');
assert(app.includes('lowReboundBat:!!settings.variantLowReboundBat'), 'the app passes the rule into regular versus matches');
assert(app.includes("k==='variantMetalBat'||k==='variantLowReboundBat'"), 'the toggle handler enforces bat exclusivity');
assert(presets.includes("'variantLowReboundBat'"), 'the presets module lists the settings key');
assert(index.includes('./game.js?v=183') && index.includes('./app.js?v=183'), 'index pins at v180');
assert(index.includes('./match-presets.js?v=3'), 'presets module pin bumped for the new key');
assert(sw.includes('nightball-v183-pitch-feel'), 'SW cache renamed for v180');
assert(sw.includes('./match-presets.js?v=3'), 'SW precaches the v180 presets module');

console.log('low-rebound-v180: all assertions passed');
