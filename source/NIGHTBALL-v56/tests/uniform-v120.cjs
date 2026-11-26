// v120: uniform colour editor. NightUniforms stores per-club color/accent
// overrides (validated #rrggbb) in localStorage and applies them onto the
// shared club objects that badges, score marks and the 3D kit read.
// Originals are captured so a reset restores the factory colours exactly.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','uniform-editor.js'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});

assert.equal(NightUniforms.valid('#D23B2E'),true);
assert.equal(NightUniforms.valid('#12345'),false);
assert.equal(NightUniforms.valid('red'),false);
assert.equal(NightUniforms.valid(123),false);

const clubs=[...NightTeams.all];
const owls=clubs.find(c=>c.id==='owls');
const factory={color:owls.color,accent:owls.accent};

// Garbage in storage is sanitised away on load.
store.set(NightUniforms.KEY,JSON.stringify({owls:{color:'#ABCDEF',accent:'blue'},foxes:{color:'nope'}}));
const loaded=NightUniforms.load();
assert.deepEqual(loaded,{owls:{color:'#abcdef'}},'only valid hex survives, lower-cased');

// Apply recolours; a partial override keeps the other channel factory.
NightUniforms.apply(clubs,{owls:{color:'#112233'}});
assert.equal(owls.color,'#112233');
assert.equal(owls.accent,factory.accent,'accent untouched by a color-only override');
assert.equal(NightUniforms.originals().owls.color,factory.color,'factory colour was captured');
// Removing the override restores the factory colours exactly.
NightUniforms.apply(clubs,{});
assert.equal(owls.color,factory.color);
assert.equal(owls.accent,factory.accent);

// Save/load round trip.
NightUniforms.save({owls:{color:'#445566',accent:'#778899'}});
assert.deepEqual(NightUniforms.load(),{owls:{color:'#445566',accent:'#778899'}});
store.clear();
assert.deepEqual(NightUniforms.load(),{},'missing storage loads empty');

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('NightUniforms.load()'),'app loads overrides at boot');
assert(app.includes('applyUniforms()'),'app applies overrides at boot');
assert(app.includes("else if(kind==='uniform')uniformModal();"),'settings entry is wired');
assert(app.includes("case'uniform-save'"),'save action exists');
assert(app.includes("case'uniform-reset'"),'reset action exists');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
assert(html.includes('./uniform-editor.js?v=228'),'module is loaded by the page');
const css=fs.readFileSync(__dirname+'/../dist/style.css','utf8');
assert(css.includes('.uniform-preview'),'preview styles exist');

console.log('uniform-v120: all assertions passed');
