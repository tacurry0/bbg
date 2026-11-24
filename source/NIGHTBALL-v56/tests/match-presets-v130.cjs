// v130: versus-match setup presets (checker item "match-presets").
// Named snapshots of the regular versus setup are kept in localStorage
// ('nightball.matchPresets'): own/opponent club, home-away, innings,
// park, lighting, starting pitcher, difficulty + custom CPU sliders and
// the match play options. Saving, listing, applying and deleting are
// covered here at the module level (NightMatchPresets), plus the safety
// rule that a preset pointing at things that no longer exist (a deleted
// custom park, a removed club) loads without throwing and falls back
// per-field, and the app-level wiring (setup screen only — the online
// setup must not gain presets).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
const store=new Map();
global.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k),
};
for(const file of ['ratings-data.js','players.js','pro-parks.js','stadium-editor.js','pennant.js','apbc-data.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','match-presets.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const P=global.NightMatchPresets;
assert(P,'NightMatchPresets module loads');
assert.equal(P.KEY,'nightball.matchPresets');

// A second, independent storage so tests do not depend on global state.
function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_map:m};}
const ctx=()=>({teamIds:[...NightTeams.matchTeams.map(c=>c.id),'dream'],parkIds:NightPlayers.parks.map(p=>p.id),defaults:{matchTeam:'owls',matchOpponent:'foxes',park:'night'}});

// ---------- save -> load round trip keeps every field ----------
const storage=memStorage();
const settings={matchTeam:'npb-g',matchOpponent:'owls',matchUserHome:false,innings:9,park:'tokyo-dome',gameLighting:'day',difficulty:'pro',customDifficulty:{bat:3,pitch:-2,field:0,run:7},defenseSpeed:2,fieldSpeed:2,manualRunning:false,battingAssist:false,tiebreak:true,pitcher:0};
const saved=P.add('いつもの設定',P.snapshot(settings,2),storage);
assert(saved.id.startsWith('preset-'),'preset gets an id');
assert.equal(saved.name,'いつもの設定');
const loaded=P.load(storage);
assert.equal(loaded.length,1);
const applied=P.sanitizeValues(loaded[0].values,ctx());
assert.deepEqual(applied,{...settings,pitcher:2,customDifficulty:{bat:3,pitch:-2,field:0,run:7}},'round trip through localStorage preserves the whole setup, including the starter index passed separately from settings');

// ---------- multiple presets: add / list / get / delete ----------
const a=P.add('A設定',P.snapshot({...settings,innings:3},0),storage);
const b=P.add('B設定',P.snapshot({...settings,innings:5},1),storage);
assert.equal(P.load(storage).length,3,'multiple presets coexist');
assert.deepEqual(P.load(storage).map(p=>p.name),['いつもの設定','A設定','B設定'],'insertion order is kept');
assert.equal(P.get(b.id,storage).values.innings,5);
const afterRemove=P.remove(a.id,storage);
assert.deepEqual(afterRemove.map(p=>p.name),['いつもの設定','B設定'],'delete removes exactly the chosen preset');
assert.equal(P.get(a.id,storage),null,'deleted preset is gone');
assert.equal(P.remove('preset-missing',storage).length,2,'deleting an unknown id is a no-op, not an error');
// Name hygiene: markup is stripped and an empty name gets a fallback.
assert.equal(P.add('<b>x</b>',P.snapshot(settings,0),storage).name,'bx/b');
assert.equal(P.add('   ',P.snapshot(settings,0),storage).name,'プリセット');
P.remove(P.load(storage).at(-1).id,storage);P.remove(P.load(storage).at(-1).id,storage);

// ---------- stale references fall back per-field, never throw ----------
// A custom park that still exists is honoured…
const parkStorage=memStorage();
const custom=NightStadium.upsert({name:'テスト球場',left:95,leftCenter:105,center:115,rightCenter:105,right:95,wallHeight:3},parkStorage);
assert(NightPlayers.parks.some(p=>p.id===custom.id),'custom park registers');
const withCustom=P.sanitizeValues({...settings,park:custom.id},ctx());
assert.equal(withCustom.park,custom.id,'existing custom park survives sanitizing');
// …and once it is deleted, only the park field falls back.
NightStadium.remove(custom.id,parkStorage);
assert(!NightPlayers.parks.some(p=>p.id===custom.id),'custom park unregisters');
const stale=P.sanitizeValues({matchTeam:'gone-club',matchOpponent:'gone-club',matchUserHome:false,innings:7,park:custom.id,gameLighting:'sunset',pitcher:-3,difficulty:'ultra',customDifficulty:{bat:99,pitch:'x',field:-99,run:2},defenseSpeed:9,fieldSpeed:2,manualRunning:false,battingAssist:false,tiebreak:true},ctx());
assert.equal(stale.matchTeam,'owls','unknown own club falls back to the default club');
assert.equal(stale.matchOpponent,'foxes','opponent falls back to a different club than the own club');
assert.equal(stale.park,'night','deleted custom park falls back to the default park');
assert.equal(stale.innings,5,'unsupported innings falls back');
assert.equal(stale.gameLighting,'auto','unknown lighting falls back');
assert.equal(stale.difficulty,'standard','unknown difficulty falls back');
assert.equal(stale.pitcher,0,'negative starter index falls back');
assert.deepEqual(stale.customDifficulty,{bat:10,pitch:0,field:-10,run:2},'custom sliders are clamped into range');
assert.equal(stale.defenseSpeed,1,'unknown speed falls back');
assert.equal(stale.fieldSpeed,2,'still-valid fields are untouched by other fields falling back');
assert.equal(stale.manualRunning,false);assert.equal(stale.tiebreak,true);
// Self-matchup stored directly is broken up too.
const mirror=P.sanitizeValues({...settings,matchTeam:'owls',matchOpponent:'owls'},ctx());
assert.notEqual(mirror.matchOpponent,mirror.matchTeam,'a preset cannot produce a self-matchup');
// Corrupt storage reads as "no presets", and a hand-edited broken entry
// is dropped instead of breaking the list.
store.set(P.KEY,'{oops');
assert.deepEqual(P.load(),[],'corrupt JSON loads as an empty list');
store.set(P.KEY,JSON.stringify([{id:'x'},null,{id:'ok',name:'手編集',values:{innings:3}}]));
const handEdited=P.load();
assert.equal(handEdited.length,1,'entries without values are dropped');
assert.equal(handEdited[0].values.innings,3);

// ---------- app wiring: setup screen only, apply reflects, no auto-start ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const setupStart=app.indexOf('function setupMatch(){');
assert(setupStart>0);
const setupBody=app.slice(setupStart,setupStart+2600);
assert(setupBody.includes('${matchPresetsHTML()}'),'the versus setup screen renders the preset UI');
assert(app.includes("NightMatchPresets.snapshot(settings,lineupConfig('match').config.pitcher)"),'saving snapshots the live settings including the current starter');
assert(app.includes("case'match-preset-delete'"),'delete action is wired');
assert(app.includes('if(b.dataset.matchPreset){applyMatchPreset(b.dataset.matchPreset);return;}'),'apply is wired to the preset row tap');
const applyStart=app.indexOf('function applyMatchPreset(id){');
assert(applyStart>0);
const applyBody=app.slice(applyStart,applyStart+900);
assert(applyBody.includes('NightMatchPresets.sanitizeValues'),'apply sanitizes against the current club/park lists');
assert(applyBody.includes('Object.assign(settings,values)'),'apply writes the values back into the live settings');
assert(applyBody.includes('setupMatch()'),'apply returns to the setup screen for review');
assert(!/start\(|new NightGame/.test(applyBody),'apply never starts a match by itself');
const onlineStart=app.indexOf('function onlineModal(){');
assert(onlineStart>0);
assert(!app.slice(onlineStart,onlineStart+6000).includes('matchPreset'),'the online setup does not use presets');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(html.includes('./match-presets.js?v=1'),'page loads the presets module');
assert(sw.includes('./match-presets.js?v=1'),'service worker precaches the presets module');
assert(sw.includes('nightball-v152-chip-hitarea'),'SW cache renamed for v130');

console.log('PASS: match presets save/load round-trips the full versus setup, multiple presets add/delete cleanly, stale custom-park/club references fall back per-field without throwing, corrupt storage reads empty, and the wiring lives only in the versus setup screen with apply reflecting into settings (no auto-start).');
