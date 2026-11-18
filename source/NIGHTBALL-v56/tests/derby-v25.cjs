const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','derby','game'])vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
const make=()=>new NightGame('derby','standard',()=>{},{park:'tokyo-dome',fieldSpeed:2});
const g=make(),d=g.derby;
assert.equal(d.rounds[0].flatMap(m=>m.entrants).length,8);
assert.equal(d.remaining,120000);
g.beginHalf();g.paused=true;g.update(5000);assert.equal(d.remaining,120000);
g.paused=false;g.update(50);assert.equal(d.remaining,119950);
g.session.pitches=10;g.completePitch('take');assert.equal(g.next,'pitch');
g.startField(63,29,-.6,false);assert.equal(g.field.runners.length,0);
assert.equal(g.field.fielders.length,0);
d.remaining=10;
let overFence=false;
while(g.phase==='field'){
 g.update(16);
 if(g.field.overFence&&g.field.ball.bounces===0){overFence=true;assert.equal(g.session.hr,0);}
}
assert(overFence);assert.equal(g.field.ball.bounces,1);assert.equal(g.session.hr,1);
d.matchup.normal[1-d.userIndex]=1;g.update(20);
assert.equal(g.derbyTransition,'extra');assert.equal(g.phase,'derby-break');
assert(g.continueDerby());assert.equal(d.remaining,60000);assert.equal(d.turnHR,0);
d.turnHR=d.score[1-d.userIndex]+1;g.finishDerbyTurn();
assert.equal(g.derbyTransition,'round');assert(g.continueDerby());assert.equal(d.round,1);
d.turnHR=d.score[1-d.userIndex]+1;g.finishDerbyTurn();assert(g.continueDerby());assert.equal(d.round,2);
d.matchup.normal[1-d.userIndex]=0;g.finishDerbyTurn();assert(g.continueDerby());
d.matchup.extra[1-d.userIndex]=0;g.finishDerbyTurn();assert.equal(g.derbyTransition,'finish');assert.equal(d.champion,null);
const out=make();out.derby.matchup.normal[1-out.derby.userIndex]=99;out.finishDerbyTurn();
assert.equal(out.derbyTransition,'finish');assert(!out.derby.champion.user);assert.equal(out.derby.matchup.round,0);
for(const p of NightPlayers.parks){
 const limits=[p.left,p.leftCenter,p.center,p.rightCenter,p.right];
 limits.forEach((n,i)=>assert(Math.abs(NightPlayers.wallDistance(p,(i-2)*Math.PI/8)-n)<1e-7));
}
const bounced=new NightGame('match','standard',()=>{},{park:'night'});
bounced.half='bottom';bounced.startField(25,23,0,false);
Object.assign(bounced.field.ball,{y:122,z:4,vy:4,vz:2,bounces:1});
bounced.updateField(.005);
assert(bounced.field.groundRule);assert.equal(bounced.hit.kind,'double');
console.log('PASS: 2026 timed knockout, pause, unlimited pitches, landing, no runners, extra rounds, final draw and all stadium fences');
