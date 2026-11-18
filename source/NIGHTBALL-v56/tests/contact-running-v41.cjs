const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','game']){
 vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
}
function match(occupied,outs=0,manualRunning=true,emit=()=>{}){
 const g=new NightGame('match','standard',emit,{manualRunning});
 g.half='bottom';g.outs=outs;
 g.bases=occupied;
 g.baseIds=occupied.map((on,i)=>on?g.lineups.home[5+i].id:null);
 return g;
}
function tickUntil(g,condition,limit=1000){
 for(let i=0;i<limit&&!condition();i++)g.update(16);
 assert(condition(),'play did not reach the expected state');
}
(async()=>{
 const loaded=[true,true,true];
 for(const manual of [false,true]){
  const g=match(loaded,0,manual);g.startField(25,60,0,false);
  assert.equal(g.landingIndicator().kind,'fly');
  assert(g.field.catchable);
  const runners=g.field.runners.slice(1);
  assert.deepEqual(runners.map(r=>r.command),[2,3,4]);
  for(let i=0;i<100;i++)g.updateRunners(.02);
  assert(runners.every(r=>r.progress>r.start&&!r.running&&r.base===r.start));
  g.secureManualBall(g.field.chaser,true);
  assert(runners.every(r=>r.command===r.start&&r.needsTag));
  tickUntil(g,()=>g.field.resolved);
  assert(runners.every(r=>r.progress===r.start&&!r.needsTag));
  assert.equal(g.homeScore,0);
 }
 const drop=match(loaded);drop.startField(25,60,0,false);
 for(let i=0;i<75;i++)drop.updateRunners(.02);
 drop.field.ball.bounces=1;
 for(let i=0;i<250;i++)drop.updateRunners(.02);
 assert.deepEqual(drop.field.runners.map(r=>r.progress),[1,2,3,4]);
 assert.equal(drop.field.runners.at(-1).scored,true);
 const ground=match([true,true,false]);ground.startField(24,0,.17,false);
 assert.equal(ground.landingIndicator().kind,'ground');
 assert.deepEqual(ground.field.runners.map(r=>r.command),[1,2,3]);
 ground.update(50);
 assert(ground.field.runners.every(r=>r.progress>r.start));
 const unforced=match([false,true,true]);unforced.startField(25,60,0,false);
 assert.deepEqual(unforced.field.runners.map(r=>r.command),[1,2,3]);
 const twoOuts=match(loaded,2);twoOuts.startField(25,60,0,false);
 for(let i=0;i<100;i++)twoOuts.updateRunners(.02);
 assert(twoOuts.field.runners.slice(1).every(r=>r.progress>r.start+.27));

 const returned=match([false,false,false]);returned.startField(35,20,.4,false);
 tickUntil(returned,()=>returned.playEvents.some(e=>e.type==='throw-arrival'&&e.caught&&e.base===null));
 assert(returned.field.runners[0].base===1);
 tickUntil(returned,()=>returned.phase==='result',2);
 tickUntil(returned,()=>returned.phase!=='result',50);

 const {PlayReview}=await import('../dist/play-review.js');
 let walk;
 const review=new PlayReview();
 walk=match(loaded,0,true,type=>{if(type==='scoring-walk')review.captureWalk(walk);});
 walk.pitch={id:'fast',name:'ストレート',targetX:1.4,targetY:1,duration:540,isStrike:false,progress:1.25};
 walk.balls=3;walk.take();
 assert.equal(walk.homeScore,1);assert(review.open(walk));
 assert.equal(review.frame(180).game.phase,'pitch');
 assert.equal(walk.pitch.progress,1.25);
 review.close();assert(!walk.paused);
 console.log('PASS: forced runners in auto/manual, lead and retouch, drop/grounder, two outs, cutoff and quick result, scoring walk replay.');
})().catch(err=>{console.error(err);process.exitCode=1;});
