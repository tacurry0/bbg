// v58 regression suite: ball-flight times, sacrifice flies and infield DP decisions.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const name of ['ratings-data','players','pennant','game'])
 vm.runInThisContext(fs.readFileSync('dist/'+name+'.js','utf8'),{filename:name+'.js'});

const originalRandom=Math.random;
Math.random=()=>.5;
function match(mask=0,outs=0){
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false});
 g.half='bottom';g.outs=outs;
 g.bases=[0,1,2].map(i=>!!(mask&(1<<i)));
 g.baseIds=g.bases.map((b,i)=>b?g.lineups.home[5+i].id:null);
 return g;
}
try{
 // A 50m/s, 45° fly should reach center field without hanging for 5+ seconds.
 const g=match();
 g.startField(50,45,0,false);
 const landing=g.field.landing;
 assert(landing.time>3.3&&landing.time<4.0,'normal strong fly time: '+landing.time);
 assert(Math.hypot(landing.x,landing.y)>125,'retain long-fly carry');
 const light=match();light.startField(35,55,0,false);
 assert(light.field.landing.time<3.4,'ordinary fly no longer hangs: '+light.field.landing.time);
 assert(NightGame.ballVisualScale(28,60)<NightGame.ballVisualScale(0,116),'ball shrinks on ascent and grows towards landing');
 // Make the fielders unreachable to inspect the actual live integrated ball.
 const sample=match();sample.startField(38,40,0,false);
 for(const p of sample.field.fielders){p.x=p.y=p.startX=p.startY=999;}
 let bounced=false,realTime=0;
 for(let i=0;i<1100&&!bounced;i++){
  sample.updateField(.01);
  bounced=sample.field.ball.bounces>0;realTime=sample.field.elapsed;
 }
 assert(bounced,'real ball must land');
 assert(Math.abs(realTime-sample.field.landingTime)<.031,
  'predicted and rendered live landing times match');

 const homer=match(3,1);homer.startField(56,35,0,false);
 let crossedFenceInFlight=false;
 for(let i=0;i<1100&&homer.phase==='field';i++){
  homer.updateField(.01);
  if(homer.field.overFence&&!homer.field.ball.bounces)crossedFenceInFlight=true;
 }
 assert(crossedFenceInFlight,'home run keeps flying after clearing the fence');
 assert.equal(homer.hit.kind,'hr');
 assert.equal(homer.field.ball.z,0,'home run reaches the ground before the result');
 assert(homer.homeRunRunning);
 assert(homer.skipHomeRunRun());
 assert(!homer.skipHomeRunRun());
 assert.equal(homer.homeScore,3);
 assert(homer.field.runners.every(r=>r.progress===4&&!r.running));

 // One out, men on first + second. A second-baseman grounder must pivot to
 // second for a 4-6-3 attempt; third base is not a default first target.
 for(const [holder,receiver] of [[3,4],[4,3],[5,3]]){
  const d=match(3,1);d.startField(30,0,0,false);
  const f=d.field,m=f.manual,p=f.fielders[holder];
  assert(m,'field possession state needed in automatic running too');
  m.secured=true;m.holder=holder;m.outfield=false;m.recovery=0;
  f.ball.x=p.x;f.ball.y=p.y;f.ball.bounces=1;f.trajectory='ground';
  const plan=d.manualThrowPlan();
  assert(plan,'grounder should provide a force throw');
  assert.equal(plan.base,2,'first throw to second (fielder '+holder+')');
  assert.equal(plan.receiver,receiver,'correct middle-infielder pivot');
  assert(plan.doublePlay,'second-to-first relay can beat batter for this setup');
 }
 // Run the actual throw -> catch -> relay -> catch sequence, not just the
 // planner. The fielder at second must record the lead force before the
 // first-baseman records the second out.
 const realDP=match(3,1);realDP.startField(30,0,0,false);
 const df=realDP.field,dm=df.manual,pivot=df.fielders[3];
 dm.secured=true;dm.holder=3;dm.outfield=false;dm.recovery=0;
 df.ball.x=pivot.x;df.ball.y=pivot.y;df.ball.bounces=1;df.trajectory='ground';
 for(let i=0;i<1600&&!df.resolved;i++)realDP.updateField(.01);
 assert(df.resolved,'4-6-3 live play must terminate');
 assert.equal(realDP.outs,3,'both outs recorded after one-out DP');
 assert.equal(df.outcome,'doubleplay','4-6-3 play classification');
 const arrivals=realDP.playEvents.filter(e=>e.type==='throw-arrival'&&e.caught).map(e=>e.base);
 assert.deepEqual(arrivals.slice(0,2),[2,1],'ball goes second then first');

 // Confirm a double play is not attempted with two already out.
 const late=match(3,2);late.startField(30,0,0,false);
 const lm=late.field.manual;lm.secured=true;lm.holder=3;lm.outfield=false;
 const lateThrow=late.manualThrowPlan();
 assert(lateThrow&&!lateThrow.doublePlay,'two-out fielding is one-out force only');

 // Caught deep outfield fly: runner should automatically retouch and go.
 for(const [mask,from,to] of [[4,3,4],[2,2,3]]){
  const d=match(mask,1);d.startField(40,49,0,false);
  const f=d.field;
  f.fielders[7].x=0;f.fielders[7].y=115;
  f.fielders[7].arm=20;
  d.secureManualBall(7,true);
  const r=f.runners.find(p=>p.start===from);
  assert.equal(d.outs,2,'catch adds one out');
  for(let i=0;i<30&&r.command!==to;i++)d.updateRunners(.02);
  assert.equal(r.command,to,'automatic tag-up from '+from+' to '+to);
 }
 // Full automatic live tag-up: weak-armed CF catches deep fly; the runner
 // leaves after the catch, beats the return and receives the correct run.
 const liveSF=match(4,1);liveSF.startField(40,49,0,false);
 const cf=liveSF.field.fielders[7];cf.x=0;cf.y=115;cf.arm=18;
 liveSF.secureManualBall(7,true);
 for(let i=0;i<1500&&!liveSF.field.resolved;i++)liveSF.updateField(.01);
 assert(liveSF.field.resolved,'live sacrifice fly play must terminate');
 assert.equal(liveSF.homeScore,1,'runner tags up and scores automatically');
 assert.equal(liveSF.hit.kind,'sacrificefly','live play records sacrifice fly');

 // Verify a scored tag-up is a sacrifice fly (no hit, no at-bat, one RBI).
 const sf=match(4,1);sf.startField(38,48,0,false);
 sf.secureManualBall(7,true);
 const runner=sf.field.runners.find(r=>r.start===3);
 Object.assign(runner,{needsTag:false,command:4,progress:4,base:4,furthest:4,scored:true,crossedAt:2});
 sf.finishManualPlay();
 assert.equal(sf.homeScore,1);
 assert.equal(sf.homeHits,0);
 assert.equal(sf.hit.kind,'sacrificefly');
 assert.equal(sf.batterStats().ab,0);
 assert.equal(sf.batterStats().sf,1);
 assert.equal(sf.batterStats().rbi,1);

 // Third out fly catch disallows tag-up.
 const two=match(4,2);two.startField(40,50,0,false);
 two.field.fielders[7].y=115;two.secureManualBall(7,true);
 const t=two.field.runners.find(r=>r.start===3);
 for(let i=0;i<30;i++)two.updateRunners(.02);
 assert.notEqual(t.command,4,'no sacrifice fly after third out');

 console.log('PASS v58: matched ball landing, shorter flight, 4-6-3/6-4-3 pivots, automatic tag-ups, sac fly stats and third-out rules.');
} finally {Math.random=originalRandom;}
