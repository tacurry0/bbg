const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'));
const G=NightGame,profiles=Array.from({length:500},(_,i)=>({id:'p'+i,run:i%101,field:(i*3)%101}));
for(const p of profiles){const m=G.movementStyle(p);assert.deepEqual(m,G.movementStyle({...p}));for(const key of ['cadence','stride','arm','lean','ready','phase'])assert(Number.isFinite(m[key]));assert(['head','feet'].includes(m.slide));}
assert.equal(new Set(profiles.map(p=>G.movementStyle(p).cadence)).size,3);
assert.equal(new Set(profiles.map(p=>G.movementStyle(p).celebration)).size,4);
assert.equal(new Set(profiles.map(p=>G.movementStyle(p).slide)).size,2);
for(const d of [.3,.43,.48,1]){assert.equal(G.actionEnvelope(-.1,d),0);assert.equal(G.actionEnvelope(d,d),0);assert.equal(G.actionEnvelope(0,d),0);assert.equal(G.actionEnvelope(d/2,d),1);}
console.log('v203 player motion passed');
