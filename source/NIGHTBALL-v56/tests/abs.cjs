const assert=require('node:assert/strict');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

function calledPitch({defending=false,x,roll,review=true}){
 const g=new NightGame('match','standard',()=>{});
 g.half=defending?'top':'bottom';
 g.inning=5;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 g.absRemaining=2;
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;
 try{Math.random=()=>roll;g.take();}finally{Math.random=random;}
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
const ordinary=new NightGame('match','standard',()=>{});
ordinary.createPitch(NightGame.TYPES[0],{x:0,y:0});
ordinary.take();
assert.equal(ordinary.phase,'result');
ordinary.update(40);assert.equal(ordinary.strikes,1);
ordinary.phaseTime=850;ordinary.update(40);
assert.equal(ordinary.phase,'result');
ordinary.phaseTime=NightGame.ABS_TIMING.pitchResult;ordinary.update(20);
assert.equal(ordinary.phase,'aim');

console.log('PASS: Statcast distance bins, strike/ball reversals, full counts, walk-off, third out, challenge budget and replay save.');
