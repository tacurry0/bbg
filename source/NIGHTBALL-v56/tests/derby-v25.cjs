const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','derby','game'])vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
const make=()=>new NightGame('derby','standard',()=>{},{park:'tokyo-dome',fieldSpeed:2});
const g=make(),d=g.derby;
assert.equal(d.rounds[0].flatMap(m=>m.entrants).length,8);
assert.equal(d.remaining,120000);
g.beginHalf();assert.equal(g.pitch.id,'fast');assert.equal(g.pitch.speed,150);
g.createPitch(NightGame.TYPES.find(type=>type.id==='slider'),{x:0,y:0});
assert.equal(g.pitch.id,'fast');assert.equal(g.pitch.speed,150);
g.paused=true;g.update(5000);assert.equal(d.remaining,120000);
g.paused=false;g.update(50);assert.equal(d.remaining,119950);
g.session.pitches=10;g.completePitch('take');assert.equal(g.next,'pitch');
g.startField(63,29,-.6,false);assert.equal(g.field.runners.length,0);
assert.equal(g.field.fielders.length,0);
d.remaining=10;
d.matchup.normal[1-d.userIndex]=1;
let overFence=false;
while(g.phase==='field'){
 g.update(16);
 if(g.field.overFence&&g.field.ball.bounces===0){overFence=true;assert.equal(g.session.hr,0);}
}
assert(overFence);assert.equal(g.field.ball.bounces,1);assert.equal(g.session.hr,1);
g.update(20);
assert.equal(g.derbyTransition,'extra');assert.equal(g.phase,'derby-break');
assert(g.continueDerby());assert.equal(d.remaining,60000);assert.equal(d.turnHR,0);
d.turnHR=21;g.finishDerbyTurn();
assert.equal(g.derbyTransition,'round');assert(g.continueDerby());assert.equal(d.round,1);
d.turnHR=21;g.finishDerbyTurn();assert(g.continueDerby());assert.equal(d.round,2);
d.matchup.normal[1-d.userIndex]=0;g.finishDerbyTurn();assert(g.continueDerby());
d.matchup.extra[1-d.userIndex]=0;g.finishDerbyTurn();assert.equal(g.derbyTransition,'finish');assert.equal(d.champion,null);
const out=make();out.derby.matchup.normal[1-out.derby.userIndex]=99;out.finishDerbyTurn();
assert.equal(out.derbyTransition,'finish');assert(!out.derby.champion.user);assert.equal(out.derby.matchup.round,0);
const originalRandom=Math.random;
let leadoff,chasing;
try{
 Math.random=()=>0;
 const firstDraw=make();
 Math.random=()=>.9;
 const secondDraw=make();
 assert.equal(firstDraw.derby.matchup.first,0);
 assert.equal(secondDraw.derby.matchup.first,1);
 [leadoff]=[firstDraw,secondDraw].filter(g=>!g.derby.userBatsSecond);
 [chasing]=[firstDraw,secondDraw].filter(g=>g.derby.userBatsSecond);
 Math.random=()=>0;
 assert.equal(chasing.derby.cpuScore(chasing.derby.opponent,false,1),2,'CPU batting second also stops at the winning homer');
}finally{Math.random=originalRandom;}
assert.equal(leadoff.derby.score[1-leadoff.derby.userIndex],null);
assert.notEqual(chasing.derby.score[1-chasing.derby.userIndex],null);
chasing.derby.score[1-chasing.derby.userIndex]=1;
chasing.startField(63,29,-.6,false);chasing.finishDerbyBall(true);
assert.equal(chasing.phase,'result','a tying homer does not stop the turn');
chasing.startField(63,29,-.6,false);chasing.finishDerbyBall(true);
assert.equal(chasing.phase,'derby-break','a go-ahead homer ends the turn immediately');
assert.equal(chasing.derbyTransition,'round');
assert(chasing.derby.remaining>0);
assert(chasing.derby.matchup.walkOff&&chasing.derby.matchup.winner.user);
const dFirst=leadoff.derby;
let target;
dFirst.cpuScore=(_opponent,_extra,scoreToBeat)=>{
 if(target===undefined)target=scoreToBeat;
 return Number.isFinite(scoreToBeat)?scoreToBeat+1:2;
};
leadoff.startField(63,29,-.6,false);leadoff.finishDerbyBall(true);
assert.equal(leadoff.phase,'result','batting first keeps the clock running');
assert.equal(target,undefined);
leadoff.finishDerbyTurn();assert.equal(target,1);
assert(!dFirst.matchup.winner.user);
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
