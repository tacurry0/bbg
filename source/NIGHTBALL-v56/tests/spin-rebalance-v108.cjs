// v108 spin rebalance coverage:
//  - MAGNUS_LIFT rebalance: a squared-up fly still gets real backspin and an
//    rpm readout, but its spin-driven carry gain over a spin-free clone of
//    the same ball is back near the pre-physics baseline (the v107
//    coefficient .00003 gained roughly 7.5x as much on this contact).
//  - Derby: batted balls carry no spin at all (no lift, no side curve), and
//    hit.spinBack is 0 so the rpm readout is omitted for derby hits — the
//    display never claims spin that did not act on the flight.
//  - Match play is untouched: spin derivation and side-spin curve remain.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seeded(seed){const orig=Math.random;Math.random=mulberry32(seed);return()=>{Math.random=orig;};}
function game(mode,seed){
 const restore=seeded(seed);
 const g=new NightGame(mode,'standard',()=>{},{userHome:true,manualRunning:false});
 g.half='bottom';restore();return g;
}
function start(g,seed,...args){
 const restore=seeded(seed);
 g.startField(...args);
 restore();
 return g.field.ball;
}

// ---------- lift rebalance: spin exists, carry gain is small ----------
{
 const g=game('match',11);
 const ball=start(g,777,44,35,0,false,true,{quality:.9,side:0});
 assert(ball.spinBack>2000,'squared-up fly still spins ('+ball.spinBack+'rpm)');
 assert.equal(g.hit.spinBack,ball.spinBack,'rpm readout still carried on the hit');
 const withSpin=g.predictLanding(ball);
 const noSpin=g.predictLanding({...ball,spinBack:0,spinSide:0});
 const gain=Math.hypot(withSpin.x,withSpin.y)-Math.hypot(noSpin.x,noSpin.y);
 assert(gain>=0,'backspin never shortens carry');
 assert(gain<0.5,`spin carry gain rebalanced to near-baseline (got ${gain.toFixed(2)}m; v107 coefficient would give ~1.4m)`);
}

// ---------- derby: no spin effect, no rpm readout ----------
{
 const d=game('derby',11);
 const ball=start(d,888,44,32,0,false,true,{quality:1,side:.5});
 assert.equal(ball.spinBack,0,'derby ball has no backspin');
 assert.equal(ball.spinSide,0,'derby ball has no side spin');
 assert.equal(d.hit.spinBack,0,'derby hit carries no rpm readout');
 // The same contact in a match keeps its spin (the derby gate is narrow).
 const m=game('match',11);
 const mBall=start(m,888,44,32,0,false,true,{quality:1,side:.5});
 assert(mBall.spinBack>2000&&mBall.spinSide!==0,'match contact keeps spin ('+mBall.spinBack+'/'+mBall.spinSide+')');
 // A derby swing still resolves as a derby ball (over-fence judgement intact).
 const d2=game('derby',13);
 start(d2,999,63,29,-.6,false);
 let guard=0;
 while(d2.phase==='field'&&guard++<2000)d2.update(16);
 assert.equal(d2.hit.kind,'hr','derby moonshot still clears for a home run');
 assert.equal(d2.session.hr,1,'derby HR counted');
}
console.log('spin-rebalance-v108: all assertions passed');
