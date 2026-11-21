const assert=require('node:assert/strict');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

function calledPitch({defending=false,x,roll,review=true,cpuRemaining=0,userRemaining=2,read=.99,attempt=0}){
 const g=new NightGame('match','standard',()=>{});
 g.half=defending?'top':'bottom';
 g.inning=5;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 g.absRemaining=userRemaining;g.absCpuRemaining=cpuRemaining;
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;
 const draws=[roll,read,attempt];
 try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 if(review){
  assert.equal(g.phase,'abs-call');
  assert.equal(g.balls,3);assert.equal(g.strikes,2);assert.equal(g.outs,2);
  assert.equal(g.battingScore,0);assert.equal(g.batterStats().pa,0);
  assert(g.requestAbsChallenge());
  assert(!g.requestAbsChallenge());
 }
 return g;
}

// The physical zone and the game's existing strike call share the same edge.
const edge=NightGame.absLocation(1.06,0);
assert(Math.abs(edge.gap)<1e-9);
assert(NightGame.absLocation(1.08,0).gap>0);
assert(NightGame.absLocation(.99,0).gap<0);
assert(!NightGame.absUmpireStrike(.012,.38));
assert(NightGame.absUmpireStrike(.012,.379));
assert(!NightGame.absUmpireStrike(-.012,.63));
assert(NightGame.absUmpireStrike(-.012,.629));
assert(!NightGame.absUmpireStrike(.08,0));
assert(NightGame.absUmpireStrike(-.08,.999));

const batter=calledPitch({x:1.08,roll:0});
const recovered=NightGame.restore(JSON.parse(JSON.stringify(batter.snapshot())),()=>{});
assert.equal(recovered.phase,'abs-review');assert.deepEqual(recovered.absCall,batter.absCall);
recovered.phaseTime=NightGame.ABS_TIMING.reviewEnd-10;recovered.update(20);
assert.equal(recovered.next,'finish');assert.equal(recovered.homeScore,1);
assert.equal(recovered.outs,2);assert.equal(recovered.batterStats().bb,1);
assert.equal(recovered.absRemaining,2);
recovered.resolveAbsCall(true);
assert.equal(recovered.homeScore,1);assert.equal(recovered.batterStats().pa,1);

const pitcher=calledPitch({defending:true,x:1.04,roll:.99});
pitcher.phaseTime=NightGame.ABS_TIMING.reviewEnd-10;pitcher.update(20);
assert.equal(pitcher.outs,3);assert.equal(pitcher.awayScore,0);
assert.equal(pitcher.batterStats().k,1);assert.equal(pitcher.next,'half');
assert.equal(pitcher.pitcherRecord().k,1);assert.equal(pitcher.absRemaining,2);

const stands=calledPitch({x:.1,roll:.99});
stands.phaseTime=NightGame.ABS_TIMING.reviewEnd-10;stands.update(20);
assert.equal(stands.outs,3);assert.equal(stands.absRemaining,1);

const pass=calledPitch({defending:true,x:1.04,roll:.99,review:false});
assert.equal(pass.phase,'abs-call');
pass.phaseTime=NightGame.ABS_TIMING.call-10;pass.update(20);
assert.equal(pass.outs,2);assert.equal(pass.awayScore,1);assert.equal(pass.absRemaining,2);
assert(!pass.requestAbsChallenge());

const swing=calledPitch({x:0,roll:.99,review:false});
delete swing.absCall;
swing.setPhase('miss');swing.phaseTime=325;swing.update(20);
assert.equal(swing.phase,'result');assert.equal(swing.outs,3);
assert(!swing.requestAbsChallenge());
const cpuHitter=calledPitch({defending:true,x:1.08,roll:0,review:false,cpuRemaining:2,userRemaining:0});
assert.equal(cpuHitter.phase,'abs-call');assert(cpuHitter.absCall.cpu);
assert(!cpuHitter.absCanChallenge);assert(!cpuHitter.requestAbsChallenge());
assert.equal(cpuHitter.batterStats().pa,0);
const savedCpu=NightGame.restore(JSON.parse(JSON.stringify(cpuHitter.snapshot())),()=>{});
savedCpu.phaseTime=NightGame.ABS_TIMING.cpuCall-10;savedCpu.update(20);
assert.equal(savedCpu.phase,'abs-review');
savedCpu.phaseTime=NightGame.ABS_TIMING.reviewEnd-10;savedCpu.update(20);
assert.equal(savedCpu.absCpuRemaining,2);
assert.equal(savedCpu.absRemaining,0);
assert.equal(savedCpu.awayScore,1);
assert.equal(savedCpu.batterStats().bb,1);

const cpuCatcher=calledPitch({x:1.04,roll:.99,review:false,cpuRemaining:2});
assert(cpuCatcher.absCall.cpu);
cpuCatcher.phaseTime=NightGame.ABS_TIMING.cpuCall-10;cpuCatcher.update(20);
cpuCatcher.resolveAbsCall(true);
assert.equal(cpuCatcher.outs,3);
assert.equal(cpuCatcher.homeScore,0);
assert.equal(cpuCatcher.absCpuRemaining,2);

const cpuMiss=calledPitch({defending:true,x:1.04,roll:0,review:false,cpuRemaining:2});
assert(cpuMiss.absCall.cpu);
cpuMiss.phaseTime=NightGame.ABS_TIMING.cpuCall-10;cpuMiss.update(20);
cpuMiss.resolveAbsCall(true);
assert.equal(cpuMiss.outs,3);
assert.equal(cpuMiss.absCpuRemaining,1);
assert.equal(cpuMiss.absRemaining,2);

for(const params of [{x:1.6,cpuRemaining:2},{x:1.08,cpuRemaining:0},{x:1.08,cpuRemaining:2,attempt:.999}]){
 const noReview=calledPitch({...params,roll:.99,review:false});
 assert.equal(noReview.absCall,undefined);
 assert.equal(noReview.phase,'result');
}

const decision=new NightGame('match','standard',()=>{});
decision.absCpuRemaining=1;decision.strikes=2;
const standardRandom=Math.random;
for(const [inning,expected] of [[1,false],[5,true]]){
 const ordered=[.5,.4];
 decision.inning=inning;
 try{Math.random=()=>ordered.shift();assert.equal(decision.shouldCpuChallenge(.025),expected);}
 finally{Math.random=standardRandom;}
}

const ordinary=new NightGame('match','standard',()=>{});
ordinary.createPitch(NightGame.TYPES[0],{x:0,y:0});
ordinary.take();
assert.equal(ordinary.phase,'result');
ordinary.update(40);assert.equal(ordinary.strikes,1);
ordinary.phaseTime=850;ordinary.update(40);
assert.equal(ordinary.phase,'result');
ordinary.phaseTime=NightGame.ABS_TIMING.pitchResult;ordinary.update(20);
assert.equal(ordinary.phase,'aim');

console.log('PASS: Statcast distance bins, strike/ball reversals, full counts, walk-off, third out, challenge budgets, CPU leverage and replay save.');
