// v106 regression coverage:
//  - steal-freeze audit: steal resolution must never corrupt base state
//    (a base flag set without a runner id) or throw, across match (user
//    toggle + CPU auto), pennant, career-bat and practice contexts.
//  - challenge-expansion: close safe/out calls on bases open a challenge
//    window; overturn restores the pre-out state, upheld consumes a challenge.
//  - difficulty-custom: the four CPU sliders move their systems directionally.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seeded(seed){const orig=Math.random;Math.random=mulberry32(seed);return()=>{Math.random=orig;};}
function invariant(g){
 for(let i=0;i<3;i++)if(g.bases[i])assert(g.baseIds[i],'base '+(i+1)+' occupied without a runner id');
 assert(g.outs>=0&&g.outs<=3,'outs out of range: '+g.outs);
}
// Drive a game forward with the simplest legal inputs; the user never swings
// (takes resolve pitches), pitches when defending, and optionally toggles the
// steal command at random moments while batting.
function drive(g,steps,{stealChaos=false}={}){
 for(let i=0;i<steps&&g.phase!=='ended';i++){
  if(stealChaos&&g.inMatch&&!g.defending&&Math.random()<.25)g.steal=!g.steal;
  if(g.phase==='aim'&&g.defending)g.throwPitch();
  g.update(50);
  invariant(g);
 }
}

// ---------- steal: user toggle resolves on a called ball ----------
{
 const restore=seeded(10601);
 const g=new NightGame('match','standard',()=>{});
 g.half='bottom';g.inning=2;g.outs=0;
 const runner=g.lineups.home[3];
 g.bases=[true,false,false];g.baseIds=[runner.id,null,null];g.basePitcherIds=[g.pitcher.id,null,null];
 g.steal=true;
 g.createPitch(NightGame.TYPES[0],{x:2.4,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
 g.update(16); // progress > 1.24 -> take() -> ball -> resolveSteal
 assert.equal(g.steal,false,'steal flag consumed');
 invariant(g);
 assert(g.bases[1]||g.outs===1,'steal either advanced the runner or was an out');
 restore();
}

// ---------- steal: phantom state cannot move a runner ----------
{
 const g=new NightGame('match','standard',()=>{});
 g.half='bottom';
 g.bases=[true,false,false];g.baseIds=[null,null,null]; // corrupted: flag without id
 g.steal=true;
 g.resolveSteal(); // must not throw, must not invent a runner on 2nd
 assert.deepEqual(g.bases,[true,false,false]);
 assert.deepEqual(g.baseIds,[null,null,null]);
 assert.equal(g.outs,0);
}

// ---------- steal: CPU auto-steal fires and resolves while user pitches ----------
{
 let attempts=0,resolutions=0;
 for(let seed=1;seed<=40&&attempts<3;seed++){
  const restore=seeded(20000+seed);
  const g=new NightGame('match','standard',()=>{});
  g.half='top'; // user fields first (userHome), CPU team bats
  const fast=g.lineups.away.find(p=>(p.run??0)>=72)||g.lineups.away[0];
  fast.run=99;
  g.bases=[true,false,false];g.baseIds=[fast.id,null,null];g.basePitcherIds=[g.pitcher.id,null,null];
  g.createPitch(NightGame.TYPES[0],{x:2.4,y:0});
  if(g.steal){
   attempts++;
   g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
   g.update(16);
   invariant(g);
   if(!g.steal&&(g.bases[1]||g.outs===1))resolutions++;
   else assert.equal(g.phase,'field','unresolved steal must be a batted-ball play, phase='+g.phase);
  }
  restore();
 }
 assert(attempts>=1,'CPU steal decision fired at least once in 40 seeded pitches');
 assert(resolutions>=1,'at least one CPU steal resolved on a taken pitch');
}

// ---------- steal soak: full games with chaotic toggles ----------
for(const seed of [31001,31002]){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{innings:3});
 g.playChallenges=2;g.playCpuChallenges=2;
 drive(g,6000,{stealChaos:true});
 restore();
}
{ // pennant: loaded-start format, steal toggles while batting
 const restore=seeded(32001);
 const g=new NightGame('pennant','standard',()=>{});
 g.playChallenges=2;g.playCpuChallenges=2;
 drive(g,6000,{stealChaos:true});
 restore();
}
{ // career-bat: the user's team bats around the user's own appearances
 const restore=seeded(33001);
 const career=new NightCareer('試遊選手',NightCareer.schools[0],'contact','L');
 career.seed='v106-steal';
 const g=new NightGame('career-bat','casual',()=>{},career.gameOptions());
 drive(g,6000,{stealChaos:true});
 restore();
}
{ // practice: steal is inert but must never throw
 const restore=seeded(34001);
 const g=new NightGame('practice','standard',()=>{});
 g.steal=true;g.resolveSteal();
 drive(g,600);
 restore();
}

// ---------- challenge-expansion ----------
function closeCallGame(seed,{userBatting=true}={}){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{});
 g.playChallenges=2;g.playCpuChallenges=2;
 g.half=userBatting?'bottom':'top';g.inning=3;g.outs=0;
 const side=g.side,runner=g.lineups[side][4];
 g.bases=[true,false,false];g.baseIds=[runner.id,null,null];g.basePitcherIds=[g.pitcher.id,null,null];
 g.startField(28,10,.3,false);
 const m=g.field.manual;assert(m,'manual field play expected');
 const batter=g.field.runners.find(r=>r.batter);
 Object.assign(batter,{progress:1,base:1,furthest:1,command:1,waiting:true,running:false});
 const lead=g.field.runners.find(r=>!r.batter);
 lead.progress=1.84; // tag margin .16 <= .22 -> close call
 g.manualOut(lead,'tag',2);
 assert(m.closeCall,'close call registered');
 assert.equal(m.closeCall.base,2);
 g.finishManualPlay();
 assert.equal(g.phase,'play-call','challenge window opened');
 restore();
 return g;
}
let sawOverturn=false,sawUpheld=false;
for(let seed=41000;seed<41040&&!(sawOverturn&&sawUpheld);seed++){
 const g=closeCallGame(seed);
 const truth=g.baseCall.truth;
 assert(g.playCanChallenge);
 assert(g.requestPlayChallenge());
 assert.equal(g.phase,'play-review');
 for(let i=0;i<60&&g.phase==='play-review';i++)g.update(50);
 assert.notEqual(g.phase,'play-review','review resolved');
 if(truth==='safe'){
  sawOverturn=true;
  assert.equal(g.outs,0,'overturn restored the out count');
  assert(g.bases[1],'overturned runner is on 2nd');
  assert.equal(g.playChallenges,2,'overturn keeps the challenge');
 }else{
  sawUpheld=true;
  assert.equal(g.outs,1,'upheld out stands');
  assert.equal(g.playChallenges,1,'upheld review consumes a challenge');
 }
}
assert(sawOverturn&&sawUpheld,'both review outcomes exercised');
{ // window timeout: call stands, no challenge consumed
 const g=closeCallGame(42001);
 for(let i=0;i<80&&g.phase==='play-call';i++)g.update(50);
 assert.notEqual(g.phase,'play-call','window timed out');
 assert.equal(g.outs,1);
 assert.equal(g.playChallenges,2);
}
{ // CPU side disadvantaged: auto decision runs without user input
 let sawCpuReview=false,sawCpuStand=false;
 for(let seed=43000;seed<43040&&!(sawCpuReview&&sawCpuStand);seed++){
  const g=closeCallGame(seed,{userBatting:false});
  assert.equal(g.baseCall.cpu,true);
  assert(!g.playCanChallenge,'user cannot challenge the CPU side\u2019s call');
  for(let i=0;i<80&&['play-call','play-review'].includes(g.phase);i++)g.update(50);
  assert(!['play-call','play-review'].includes(g.phase),'CPU window resolved');
  if(g.playCpuChallenges<2||g.outs===0)sawCpuReview=true;else sawCpuStand=true;
 }
 assert(sawCpuReview&&sawCpuStand,'CPU both challenged and stood pat across seeds');
}

// ---------- difficulty-custom directional checks ----------
function pitchWith(adj,seed){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{customDifficulty:adj});
 g.half='bottom'; // user bats, CPU pitches
 g.createPitch(NightGame.TYPES[0],{x:0,y:0});
 const p={speed:g.pitch.speed,break:Math.hypot(g.pitch.bx,g.pitch.by)};
 restore();return p;
}
{
 const hi=pitchWith({pitch:10},51001),lo=pitchWith({pitch:-10},51001);
 assert(hi.speed>lo.speed,'pitch slider raises CPU velocity: '+hi.speed+' vs '+lo.speed);
 assert(hi.break>lo.break,'pitch slider increases CPU break');
}
function cpuAimError(adj,seed){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{customDifficulty:adj});
 g.half='top'; // user pitches, CPU bats
 g.createPitch(NightGame.TYPES[0],{x:.2,y:.1});
 const e=Math.abs(g.pitch.cpuAim.x-.2)+Math.abs(g.pitch.cpuAim.y-.1);
 restore();return e;
}
{
 let hi=0,lo=0;const N=30;
 for(let s=0;s<N;s++){hi+=cpuAimError({bat:10},52000+s);lo+=cpuAimError({bat:-10},52000+s);}
 assert(hi/N<lo/N,'bat slider sharpens CPU aim: '+(hi/N).toFixed(3)+' vs '+(lo/N).toFixed(3));
}
function fielderSpeed(adj,seed){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{customDifficulty:adj});
 g.half='bottom';
 g.startField(30,18,.2,false);
 const v=g.field.fielders.reduce((a,p)=>a+p.speed,0);
 restore();return v;
}
{
 const hi=fielderSpeed({field:10},53001),lo=fielderSpeed({field:-10},53001);
 assert(hi>lo*1.15,'field slider scales CPU fielder speed: '+hi.toFixed(1)+' vs '+lo.toFixed(1));
}
function stealRate(adj){
 let n=0;const N=60;
 for(let s=0;s<N;s++){
  const restore=seeded(54000+s);
  const g=new NightGame('match','standard',()=>{},{customDifficulty:adj});
  g.half='top';
  const fast=g.lineups.away.find(p=>(p.run??0)>=72)||g.lineups.away[0];
  fast.run=99;
  g.bases=[true,false,false];g.baseIds=[fast.id,null,null];g.basePitcherIds=[g.pitcher.id,null,null];
  g.createPitch(NightGame.TYPES[0],{x:0,y:0});
  if(g.steal)n++;
  restore();
 }
 return n;
}
assert(stealRate({run:10})>stealRate({run:-10}),'run slider raises CPU steal frequency');

// ---------- statcast: lastPitch carries measured break ----------
{
 const restore=seeded(55001);
 const g=new NightGame('match','standard',()=>{});
 g.half='bottom';
 g.createPitch(NightGame.TYPES[3]||NightGame.TYPES[0],{x:2.4,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
 g.update(16);
 assert(g.lastPitch,'lastPitch recorded');
 assert.equal(typeof g.lastPitch.breakCm,'number');
 assert(g.lastPitch.breakCm>=0);
 assert(g.lastPitch.id,'lastPitch id present for online state');
 restore();
}

console.log('steal-challenge-v106: all assertions passed');
