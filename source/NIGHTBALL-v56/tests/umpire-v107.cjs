// v107 umpire mode coverage:
//  - ball/strike calls are scored against the engine truth (pitch.isStrike)
//    with the ABS gap as the closeness measure: edge pitches pay more.
//  - the player umpire's call is the call of record (it moves the count),
//    and a full auto game progresses to completion on umpire input alone.
//  - close base plays open an umpire window whose verdict replaces the call
//    on the field and is scored against the play's recorded truth.
//  - a normal (non-umpire) game never enters umpire state.
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
function umpireGame(seed,options={}){
 const restore=seeded(seed);
 const g=new NightGame('match','standard',()=>{},{innings:3,umpire:true,...options});
 g.spectate=true;g.autoBatting=true;g.autoDefense=true;
 g.playChallenges=2;g.playCpuChallenges=2;
 restore();
 return g;
}
// Force the current at-bat's pitch to be taken and land in the umpire window.
function takenPitch(g,target){
 g.createPitch(NightGame.TYPES[0],target);
 g.pitch.cpuSwing=false;g.pitch.cpuBunt=false;
 g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
 g.update(16);
 assert.equal(g.phase,'umpire-call','taken pitch waits for the umpire, phase='+g.phase);
 assert(g.umpirePending,'pending call recorded');
 return g.umpirePending;
}

// ---------- (a) scoring: truth-aligned, edge pitches pay more ----------
{
 assert.equal(NightGame.umpirePoints(0),50,'dead-on-the-edge pitch pays the max');
 assert.equal(NightGame.umpirePoints(.0254),50,'one inch from the edge still pays the max');
 assert.equal(NightGame.umpirePoints(.0254*1.5),35);
 assert.equal(NightGame.umpirePoints(.0254*2.5),25);
 assert.equal(NightGame.umpirePoints(.0254*4),15);
 assert.equal(NightGame.umpirePoints(.3),10,'obvious pitches pay the floor');
 let prev=Infinity;
 for(let inches=0;inches<=10;inches+=.5){const p=NightGame.umpirePoints(inches*.0254);assert(p<=prev,'points never rise as the pitch gets less borderline');prev=p;}
}
{ // edge strike, called correctly: max points, count moves to 0-1
 const g=umpireGame(71001);
 const pending=takenPitch(g,{x:1.06,y:0});
 assert.equal(pending.strike,true);
 assert(Math.abs(pending.gap)<1e-9,'edge pitch gap is zero');
 assert.equal(g.umpireCall(true),true);
 assert.equal(g.strikes,1);assert.equal(g.balls,0);
 assert.equal(g.umpireStats.score,50);
 assert.equal(g.umpireStats.correct,1);assert.equal(g.umpireStats.calls,1);
 assert.equal(g.phase,'result','game resumes after the call');
}
{ // dead-center strike, called correctly: floor points only
 const g=umpireGame(71002);
 const pending=takenPitch(g,{x:0,y:0});
 assert.equal(pending.strike,true);
 assert.equal(g.umpireCall(true),true);
 assert.equal(g.umpireStats.score,10,'obvious strike pays less than the edge strike');
}
{ // wrong call: no points, but the player's call is the call of record
 const g=umpireGame(71003);
 takenPitch(g,{x:1.06,y:0}); // a strike on the edge
 assert.equal(g.umpireCall(false),true); // umpire calls it a ball
 assert.equal(g.balls,1,'the wrong call still moves the count');
 assert.equal(g.strikes,0);
 assert.equal(g.umpireStats.score,0);
 assert.equal(g.umpireStats.correct,0);assert.equal(g.umpireStats.calls,1);
 assert.equal(g.umpireStats.lastCall.truth,true,'truth kept for feedback');
}
{ // obvious ball, called correctly
 const g=umpireGame(71004);
 const pending=takenPitch(g,{x:2.4,y:0});
 assert.equal(pending.strike,false);
 assert.equal(g.umpireCall(false),true);
 assert.equal(g.balls,1);
 assert.equal(g.umpireStats.score,NightGame.umpirePoints(pending.gap));
 assert(g.umpireStats.score<50,'an obvious ball pays less than an edge strike');
}
{ // calls are rejected outside the window
 const g=umpireGame(71005);
 assert.equal(g.umpireCall(true),false,'no pending pitch, no call');
 assert.equal(g.umpireStats.calls,0);
}

// ---------- base plays: verdict replaces the call, scored vs truth ----------
function closePlayGame(seed){
 const g=umpireGame(seed);
 g.half='bottom';g.inning=3;g.outs=0;
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
 g.finishManualPlay();
 assert.equal(g.phase,'play-call','umpire window opened for the close play');
 assert.equal(g.baseCall.auto,false,'umpire window never auto-resolves');
 return g;
}
for(const verdictSafe of [true,false]){
 const g=closePlayGame(verdictSafe?72001:72002);
 const truth=g.baseCall.truth,called=g.baseCall.called;
 assert.equal(called,'out');
 const before=g.umpireStats.score;
 assert.equal(g.umpirePlayCall(verdictSafe),true);
 assert.equal(g.umpireStats.playCalls,1);
 const correct=(verdictSafe?'safe':'out')===truth;
 assert.equal(g.umpireStats.playCorrect,correct?1:0);
 assert.equal(g.umpireStats.score-before,correct?NightGame.UMPIRE_PLAY_POINTS:0);
 if(verdictSafe){assert.equal(g.outs,0,'umpire safe call puts the runner back');assert(g.bases[1]);}
 else{assert.equal(g.outs,1,'umpire out call keeps the out');}
 // the window waits indefinitely for the umpire: no timeout resolution
 const g2=closePlayGame(verdictSafe?72011:72012);
 for(let i=0;i<200;i++)g2.update(50);
 assert.equal(g2.phase,'play-call','umpire play window does not time out');
 assert(g2.baseCall,'call still pending');
}

// ---------- (b) full game on umpire input alone ----------
{
 const restore=seeded(73001);
 const g=umpireGame(73001);
 let expected=0,guard=0;
 while(g.phase!=='ended'&&guard++<60000){
  if(g.phase==='change'){g.acknowledgeHalf();continue;}
  if(g.phase==='umpire-call'){
   const call=Math.random()<.75,pending=g.umpirePending;
   if(call===pending.strike)expected+=NightGame.umpirePoints(pending.gap);
   assert(g.umpireCall(call));
  }else if(g.phase==='play-call'){
   const safe=Math.random()<.5;
   if((safe?'safe':'out')===g.baseCall.truth)expected+=NightGame.UMPIRE_PLAY_POINTS;
   assert(g.umpirePlayCall(safe));
  }
  g.update(50);
  invariant(g);
 }
 restore();
 assert.equal(g.phase,'ended','umpire game reaches the end, phase='+g.phase+' after '+guard+' steps');
 assert(g.umpireStats.calls>=20,'umpire judged a full game of takes: '+g.umpireStats.calls);
 assert.equal(g.umpireStats.score,expected,'score is exactly the sum of earned call points');
 assert(g.umpireStats.correct<=g.umpireStats.calls);
 assert(g.umpireStats.score>0,'some calls were correct');
}

// ---------- snapshot round-trip keeps umpire state ----------
{
 const g=umpireGame(74001);
 takenPitch(g,{x:.4,y:.2});
 g.umpireCall(g.umpirePending.strike);
 const restored=NightGame.restore(g.snapshot(),()=>{});
 assert(restored,'umpire game snapshot restores');
 assert.equal(restored.umpireMode,true);
 assert.equal(restored.umpireStats.calls,1);
 assert.equal(restored.umpireStats.score,g.umpireStats.score);
}

// ---------- (c) normal games never see umpire state ----------
{
 const restore=seeded(75001);
 const g=new NightGame('match','standard',()=>{},{innings:3});
 assert.equal(g.umpireMode,false);
 g.playChallenges=2;g.playCpuChallenges=2;
 assert.equal(g.umpireCall(true),false,'umpire call is inert in a normal game');
 assert.equal(g.umpirePlayCall(true),false,'umpire play call is inert in a normal game');
 for(let i=0;i<6000&&g.phase!=='ended';i++){
  if(g.phase==='change'){g.acknowledgeHalf();continue;}
  assert.notEqual(g.phase,'umpire-call','normal game never waits for an umpire');
  if(g.phase==='aim'&&g.defending)g.throwPitch();
  g.update(50);
  invariant(g);
 }
 restore();
 assert.equal(g.umpireStats.calls,0);
 assert.equal(g.umpireStats.score,0);
 const restored=NightGame.restore(g.snapshot(),()=>{});
 assert.equal(restored.umpireMode,false,'restored normal game stays non-umpire');
}

console.log('umpire-v107: all assertions passed');
