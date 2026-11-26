// v200: delivery variation preserves the plate location, handedness and radar.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'));
const G=NightGame,near=(a,b)=>assert(Math.abs(a-b)<1e-8);
for(const form of Object.keys(G.PITCH_FORMS)){
 const preset=G.PITCH_FORMS[form];
 for(const hand of ['R','L']){
  const pitcher={id:'test',hand,pitchingForm:form};
  for(const set of [false,true]){
   const p=G.delivery(pitcher,set);
   assert.equal(p.form,form);assert.equal(p.fromSet,set);assert.equal(p.windupMs,set?490:700);
   near(p.releaseX*.68,(hand==='R'?-1:1)*preset.x);
   near(2.10-p.releaseY*.62,preset.h);
   const g={pitcher,pitch:{...p,id:'slider',targetX:.3,targetY:-.2,bx:.5,by:.4}};
   const release=G.prototype.pitchAt.call(g,0),arrival=G.prototype.pitchAt.call(g,1);
   near(release.x,p.releaseX);near(release.y,p.releaseY);near(arrival.x,.3);near(arrival.y,-.2);
  }
 }
}
const legacy={pitcher:{hand:'R'},pitch:{id:'fast',targetX:.2,targetY:.1,bx:0,by:0}};
near(G.prototype.pitchAt.call(legacy,0).y,0);
assert.equal(G.delivery({hand:'L',pitchingForm:'submarine'},true,true).windupMs,270);
assert.equal(G.delivery({hand:'L',pitchingForm:'submarine'},true,true).form,'overhand');
const forms=Array.from({length:500},(_,i)=>G.pitchingForm({id:'p'+i}));
assert.equal(new Set(forms).size,4);
assert.equal(G.pitchingForm({id:'p123'}),G.pitchingForm({id:'p123'}));
console.log('v200 delivery forms passed');
