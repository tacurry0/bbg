// v143: settings hub consolidation (checker item settings-hub-consolidation).
// Shared settings live in exactly one place — the settings object persisted
// as nightball.settings — and every screen reads/writes that same object:
//  - gameLighting: one lightingField() shared by gear settings / match setup
//    / APBC / derby, one change handler writing settings.gameLighting.
//  - fieldSpeed: gear-settings segmented control and the in-match chip both
//    write settings.fieldSpeed (the chip's auto-defense branch writes the
//    separate settings.defenseSpeed, which is a different setting).
//  - manualRunning: gear settings and the in-match running chip both go
//    through chooseRunningMode(), which writes settings.manualRunning.
//    (Career keeps its own per-save manualRunning — different meaning: it
//    only steers the player's own batter-runner — so it is NOT merged.)
//  - sound: the top-bar button and the settings toggle both flip
//    settings.sound, and save() re-renders the top-bar icon via updateSound().
//  - Online innings (the one real split state): the host lobby used to keep
//    its own innings:5. It now initialises from settings.innings, renders
//    from settings.innings, writes back to settings.innings + save() when
//    changed in the lobby, and starts matches with settings.innings — so
//    the normal match setup and the online lobby are bidirectionally linked.
//    The guest never writes the host's innings into their own settings.
// Saved-format compatibility: the nightball.settings shape is unchanged (no
// key added or removed); stored values survive the load normalisation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');

// ---------- gameLighting: one field, one handler, one stored value ----------
assert.equal((app.match(/id="game-lighting"/g) || []).length, 1, 'exactly one game-lighting field template exists');
assert(app.includes('function lightingField()'), 'the shared lighting field exists');
assert((app.match(/lightingField\(\)\}/g) || []).length >= 4, 'gear/match/APBC/derby screens all render the shared lighting field');
assert(app.includes("${settings.gameLighting===mode?'selected':''}"), 'the field renders its selection from settings.gameLighting');
assert.equal((app.match(/settings\.gameLighting=[^=]/g) || []).length, 2, 'gameLighting is only written by load normalisation and the one change handler');
assert(app.includes("settings.gameLighting=gameLightingMode(e.target.value);"), 'the change handler writes the shared value');
assert(!/derbyLighting|apbcLighting|matchLighting/.test(app), 'no per-screen lighting copies exist');

// Behaviour: run the real change-handler body and the real gameLightingMode
// from game-lighting.js; a change made on any screen lands in the one value
// that every screen renders from.
{
  const lightingSrc = fs.readFileSync(__dirname + '/../dist/game-lighting.js', 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/export\s+/g, '');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(lightingSrc + '\nthis.gameLightingMode=gameLightingMode;', ctx);
  const settings = { gameLighting: 'auto' };
  let saved = null;
  const save = () => { saved = JSON.parse(JSON.stringify(settings)); };
  const handler = new Function('e', 'settings', 'gameLightingMode', 'save',
    "if(e.target.id==='game-lighting'){settings.gameLighting=gameLightingMode(e.target.value);save();}");
  handler({ target: { id: 'game-lighting', value: 'day' } }, settings, ctx.gameLightingMode, save);
  assert.equal(settings.gameLighting, 'day', 'changing the field on one screen changes the shared value');
  assert.equal(saved.gameLighting, 'day', 'the shared value is what gets persisted to nightball.settings');
  handler({ target: { id: 'game-lighting', value: 'bogus' } }, settings, ctx.gameLightingMode, save);
  assert.equal(settings.gameLighting, 'auto', 'invalid lighting values normalise instead of creating a second state');
}

// ---------- fieldSpeed / manualRunning / sound: both entry points, one key ----------
assert(app.includes("settings.fieldSpeed=settings.fieldSpeed===1?2:1;if(game)game.fieldSpeed=settings.fieldSpeed;"), 'in-match chip writes settings.fieldSpeed and mirrors it into the live game');
assert(app.includes("if(b.dataset.fieldSpeed){settings.fieldSpeed=Number(b.dataset.fieldSpeed);if(game)game.fieldSpeed=settings.fieldSpeed;save();settingsModal();return;}"), 'gear settings write the same settings.fieldSpeed');
assert(app.includes("${settings.fieldSpeed===n?'active':''}"), 'gear settings render field speed from the shared value');
assert(app.includes("function chooseRunningMode(manual){"), 'running mode has a single writer');
assert(app.includes("settings.manualRunning=manual;settings.runningModeChosen=true;"), 'chooseRunningMode writes settings.manualRunning');
assert(app.includes("$('running-mode').onclick=()=>{if(game)chooseRunningMode(!game.manualRunning);};"), 'in-match running chip goes through chooseRunningMode');
assert(app.includes("if(b.dataset.runningMode){chooseRunningMode(b.dataset.runningMode==='manual');settingsModal();return;}"), 'gear settings go through chooseRunningMode');
assert(app.includes("$('sound').onclick=()=>{unlockAudio();settings.sound=!settings.sound;save();"), 'top-bar sound button flips settings.sound');
assert(app.includes("['sound','サウンド'"), 'gear settings expose the same sound toggle');
assert(app.includes("function save(){try{localStorage.setItem('nightball.settings',JSON.stringify(settings));"), 'save() persists the one settings object');
assert(app.includes("function updateSound(){$('sound').innerHTML=svg(settings.sound?'sound':'mute');"), 'the top-bar icon renders from settings.sound, so a settings-side toggle updates it via save()');

// ---------- online innings: bidirectionally linked with settings.innings ----------
assert(!app.includes("mode:'match',innings:5,hostHome:true"), 'the lobby no longer hard-codes its own innings');
assert(app.includes("mode:'match',innings:settings.innings,hostHome:true"), 'room creation initialises the lobby from the normal-match innings');
assert(app.includes("data-online-innings=\"${n}\" class=\"${settings.innings===n?'active':''}\""), 'the lobby renders its innings selection from settings.innings (v151 segmented markup)');
assert(app.includes("innings:settings.innings,difficulty:settings.difficulty,park"), 'the start message sends the shared innings');
assert(app.includes("userHome:o.hostHome,innings:settings.innings,park,pitcher:0"), 'the host game is created with the shared innings');
{
  // Run the real lobby handler body: changing innings in the lobby must
  // change (and persist) the normal-match setting, and vice versa the
  // normal-match handler value is what a new room starts from.
  const line = app.split('\n').map(l => l.trim()).find(l => l.startsWith('if(b.dataset.onlineInnings)'));
  assert(line, 'online innings handler exists');
  const settings = { innings: 9 };
  const online = { role: 'host', innings: 5 };
  let saved = null, modalCalls = 0;
  const save = () => { saved = JSON.parse(JSON.stringify(settings)); };
  const onlineModal = () => { modalCalls++; };
  const handler = new Function('b', 'online', 'settings', 'save', 'onlineModal', line.replace(/return;$/, ''));
  handler({ dataset: { onlineInnings: '3' } }, online, settings, save, onlineModal);
  assert.equal(settings.innings, 3, 'changing innings in the online lobby changes the normal-match setting');
  assert.equal(saved.innings, 3, 'the lobby change is persisted to nightball.settings');
  assert.equal(online.innings, 3, 'the room mirror follows the shared value');
  assert(modalCalls >= 1, 'the lobby re-renders after the change');
  // Normal-match side writes the same key (existing handler), so a room
  // created afterwards starts from that value.
  assert(app.includes('if(b.dataset.innings){settings.innings=Number(b.dataset.innings);save();setupMatch();return;}'), 'normal match setup writes the same settings.innings');
}
{
  // The guest records the host's innings for the match only; it must not
  // overwrite the guest's own settings.innings.
  const guestFn = app.slice(app.indexOf('function startOnlineGuestMatch(m)'), app.indexOf('// ----- online HR derby'));
  assert(guestFn.includes('o.innings=m.innings'), 'guest keeps the match innings as a match record');
  assert(!guestFn.includes('settings.innings='), 'guest never writes the host innings into their own settings');
}

// ---------- saved-format compatibility: stored values survive the load ----------
{
  // Execute the real load-normalisation line from app.js against a stored
  // (old-format) settings object: every shared value must be preserved.
  const normLine = app.split('\n').map(l => l.trim()).find(l => l.startsWith('settings.innings=[3,5,9]'));
  assert(normLine, 'load normalisation line exists');
  const NightPlayers = {
    homePitchers: [{}, {}, {}],
    rosters: { owls: { batters: Array.from({ length: 9 }, (_, i) => ({ id: 'o' + (i + 1) })) } },
  };
  const stored = {
    gameLighting: 'night', fieldSpeed: 2, manualRunning: false, runningModeChosen: true,
    sound: false, innings: 9, pitcher: 1, cursorShift: 64, cursorLift: 80,
    order: NightPlayers.rosters.owls.batters.map(p => p.id),
  };
  const settings = { ...stored };
  new Function('settings', 'NightPlayers', normLine)(settings, NightPlayers);
  assert.equal(settings.innings, 9, 'stored innings preserved');
  assert.equal(settings.fieldSpeed, 2, 'stored fieldSpeed preserved');
  assert.equal(settings.manualRunning, false, 'stored manualRunning untouched by normalisation');
  assert.equal(settings.sound, false, 'stored sound untouched by normalisation');
  const invalid = { ...stored, innings: 7, fieldSpeed: 3 };
  const s2 = { ...invalid };
  new Function('settings', 'NightPlayers', normLine)(s2, NightPlayers);
  assert.equal(s2.innings, 5, 'out-of-range stored innings falls back to the default, as before');
  assert.equal(s2.fieldSpeed, 1, 'out-of-range stored fieldSpeed falls back to the default, as before');
  // No key was added to or removed from the persisted shape by this change.
  assert(!/settings\.onlineInnings|onlineInnings:/.test(app), 'no new onlineInnings key is introduced into settings');
}

// ---------- v143 version pins ----------
assert(index.includes('./game.js?v=152') && index.includes('./app.js?v=152'), 'index pins move to v143');
assert(sw.includes('nightball-v152-chip-hitarea'), 'SW cache renamed for v143');
assert(sw.includes('./game.js?v=152') && sw.includes('./app.js?v=152'), 'SW precaches the v143 scripts');

console.log('settings-hub-v143: all assertions passed');
