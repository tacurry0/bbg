const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'));
const G=NightGame,forms=Object.keys(G.BAT_FORMS);
assert.equal(forms.length,6);
for(const form of forms){
 assert.equal(G.battingForm({id:'x',battingForm:form}),form);
 for(const p of [0,.24,.4,.65,.89,1])for(const swing of [0,.15,.5,1]){
  const m=G.battingMotion(form,p,swing,swing>0);
  assert(Object.values(m).every(Number.isFinite));
  assert(m.lift>=0&&m.load>=0&&m.load<=1);
 }
 assert.equal(G.battingMotion(form,0,0,false).lift,0);
}
assert(G.battingMotion('legkick',.65).lift>G.battingMotion('nostride',.65).lift*5);
assert(G.battingMotion('open').stance<0&&G.battingMotion('closed').stance>0);
assert.equal(new Set(Array.from({length:500},(_,i)=>G.battingForm({id:'p'+i}))).size,6);
assert.equal(G.battingForm({id:'x'}),G.battingForm({id:'x',battingForm:'bad'}));
assert.equal(G.battingForm({id:'x',hand:'L'}),G.battingForm({id:'x',hand:'R'}));
console.log('v202 batting forms passed');
