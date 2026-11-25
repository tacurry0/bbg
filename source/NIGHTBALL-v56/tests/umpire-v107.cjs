// v107 umpire mode coverage:
//  - ball/strike calls are scored against the engine truth (pitch.isStrike)
//    with the ABS gap as the closeness measure: edge pitches pay more.
//  - the player umpire's call is the call of record (it moves the count),
//    and a full auto game progresses to completion on umpire input alone.
//  - close base plays open an umpire window whose verdict replaces the call
//    on the field and is scored against the play's recorded truth.
//  - a normal (non-umpire) game never enters umpire state.
//  - spec change: the strike-zone frame stays hidden while a pitch is live
//    and appears, with the pitch's true crossing point, only in the
//    post-call reveal window (cleared before the next pitch).
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


// ---------- (d) v107 fix: manual play inputs are inert in umpire mode ----------
// Regression for the real-device report that the batting buttons stayed
// usable: at the engine level every manual intervention method must refuse
// in umpire mode, while the CPU paths (autoPitch / cpuBat) keep working
// even if the autoBatting/autoDefense/spectate flags are cleared.
{
 const g=umpireGame(76001);
 // Manual pitch throw (no explicit target) is refused; the CPU auto-pitch
 // path (explicit target via autoPitch) still works.
 assert.equal(g.defending,true,'fixture starts with the user side pitching');
 g.setPhase('aim');
 assert.equal(g.throwPitch(),false,'manual throwPitch is inert in umpire mode');
 assert.equal(g.phase,'aim','manual throw did not start a pitch');
 assert.equal(g.autoPitch(),true,'CPU auto-pitch still throws in umpire mode');
 assert.equal(g.phase,'windup','auto-pitch moved the game on');
 // Cursor aim cannot be moved by the player umpire.
 const before={...g.cursor};g.setCursor(1.2,-1.2);
 assert.deepEqual(g.cursor,before,'setCursor is inert in umpire mode');
 // Auto-defense cannot be toggled back to manual.
 assert.equal(g.setAutoDefense(false),false,'setAutoDefense is inert in umpire mode');
 assert.equal(g.autoDefense,true);
 // Substitutions / pitcher changes / tactics-grade interventions refuse.
 g.setPhase('aim');
 assert.equal(g.changePitcher(1),false,'changePitcher is inert in umpire mode');
 assert.equal(g.swapFieldPosition(g.lineups[g.userSide][0].id,'SS'),false,'swapFieldPosition is inert in umpire mode');
 assert.equal(g.requestAbsChallenge(),false,'ABS challenge is inert in umpire mode');
 assert.equal(g.requestPlayChallenge(),false,'play challenge is inert in umpire mode');
 assert.equal(g.intentionalWalk(false),false,'manual intentional walk is inert in umpire mode');
}
{ // Batting side: a manual swing never touches the pitch; CPU decides takes/swings.
 const g=umpireGame(76002);
 g.half='bottom'; // user side batting
 assert.equal(g.defending,false);
 g.createPitch(NightGame.TYPES[0],{x:0,y:0});
 g.pitch.cpuSwing=false;g.pitch.cpuBunt=false;
 g.setPhase('pitch');g.phaseTime=100;
 assert.equal(g.swing(),false,'manual swing is inert in umpire mode');
 assert.equal(g.pitch.swung,false,'manual swing did not mark the pitch as swung');
 assert.equal(g.session.swings,0,'no manual swing was recorded');
 const subbed=g.substitute(g.bench()[0]?.id,{type:'hit'});
 assert.equal(subbed,false,'pinch hitting is inert in umpire mode');
}
{ // The same calls DO work in a normal game, proving the guards are umpire-only.
 const restore=seeded(76003);
 const g=new NightGame('match','standard',()=>{},{innings:3});
 restore();
 assert.equal(g.defending,true);
 g.setPhase('aim');
 assert.equal(g.throwPitch(),true,'manual throwPitch still works in a normal game');
 const g2=new NightGame('match','standard',()=>{},{innings:3});
 g2.half='bottom';g2.createPitch(NightGame.TYPES[0],{x:0,y:0});g2.setPhase('pitch');
 assert.equal(g2.swing(),true,'manual swing still works in a normal game');
}
{ // Full game completes on umpire calls alone even with every auto flag cleared:
 // the CPU batter/pitcher decisions key off umpireMode itself.
 const restore=seeded(76004);
 const g=umpireGame(76004);
 g.autoBatting=false;g.autoDefense=false;g.spectate=false;g.fastForward=false;
 let guard=0;
 while(g.phase!=='ended'&&guard++<60000){
  if(g.phase==='change'){g.acknowledgeHalf();continue;}
  // Attempted manual interventions throughout must all be inert.
  g.swing();g.setAutoDefense(true);
  if(g.phase==='umpire-call')assert(g.umpireCall(g.umpirePending.strike));
  else if(g.phase==='play-call')assert(g.umpirePlayCall(true));
  g.update(50);
  invariant(g);
 }
 restore();
 assert.equal(g.phase,'ended','umpire game completes with auto flags cleared, phase='+g.phase+' after '+guard+' steps');
 assert(g.umpireStats.calls>=20,'umpire still judged a full game: '+g.umpireStats.calls);
 assert.equal(g.umpireStats.correct,g.umpireStats.calls,'truth calls were all correct');
}

// ---------- (f) v107 spec change: zone hidden until the call, reveal after ----------
// Real-device feedback: with the zone frame visible from the moment of the
// pitch, the umpire only had to watch whether the ball entered the frame.
// Now the frame (and the true crossing point) may appear only AFTER the
// player calls, inside the post-call result window, and must be gone
// before the next pitch starts. Verified at the state level through
// NightGame.umpireCallReveal(), which both renderers consult.
{
 const g=umpireGame(77001);
 assert.equal(g.umpireReveal,null,'no reveal before any pitch');
 assert.equal(g.umpireCallReveal(),null);
 const pending=takenPitch(g,{x:1.06,y:0});
 // Pre-call (umpire-call window, and every live pitch phase): hidden.
 assert.equal(g.phase,'umpire-call');
 assert.equal(g.umpireReveal,null,'no reveal is recorded before the call');
 assert.equal(g.umpireCallReveal(),null,'zone stays hidden until the player calls');
 for(const phase of ['aim','windup','pitch']){
  const live=umpireGame(77002);
  live.setPhase(phase);
  assert.equal(live.umpireCallReveal(),null,'no reveal during the '+phase+' phase');
 }
 // After the call: reveal is up, in the result phase only, carrying the
 // pitch's true crossing coordinates exactly as recorded (no offset).
 assert.equal(g.umpireCall(true),true);
 assert.equal(g.phase,'result');
 const reveal=g.umpireCallReveal();
 assert(reveal,'reveal is visible right after the call');
 assert.equal(reveal.x,pending.x,'reveal x is the true target x');
 assert.equal(reveal.y,pending.y,'reveal y is the true target y');
 assert.equal(reveal.strike,pending.strike,'reveal truth matches isStrike');
 assert.equal(reveal.called,true);assert.equal(reveal.correct,true);
 // The window closes on its own: once the result phase ends and the next
 // pitch is being prepared, the reveal is gone.
 let steps=0;while(g.phase==='result'&&steps++<200)g.update(50);
 assert.notEqual(g.phase,'result','result window ended');
 assert.equal(g.umpireReveal,null,'reveal cleared before the next pitch');
 assert.equal(g.umpireCallReveal(),null);
}
{ // A wrong call still reveals the truth (that is the answer check).
 const g=umpireGame(77003);
 const pending=takenPitch(g,{x:2.4,y:0}); // an obvious ball
 assert.equal(g.umpireCall(true),true); // umpire wrongly calls strike
 const reveal=g.umpireCallReveal();
 assert(reveal,'reveal shows even after a wrong call');
 assert.equal(reveal.strike,false,'reveal shows the true ball, not the call');
 assert.equal(reveal.called,true);assert.equal(reveal.correct,false);
 assert.equal(reveal.x,pending.x);assert.equal(reveal.y,pending.y);
}
{ // Swung-at pitches are not call targets: no reveal is ever recorded.
 const g=umpireGame(77004);
 g.createPitch(NightGame.TYPES[0],{x:0,y:0});
 g.pitch.cpuSwing=true;g.pitch.cpuBunt=false;
 g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=0;
 for(let i=0;i<200&&g.phase==='pitch';i++)g.update(16);
 assert.notEqual(g.phase,'umpire-call','swung pitch never waits for a call');
 assert.equal(g.umpireReveal,null,'swung pitch records no reveal');
 assert.equal(g.umpireCallReveal(),null);
}
{ // Normal games never record a reveal either.
 const restore=seeded(77005);
 const g=new NightGame('match','standard',()=>{},{innings:3});
 restore();
 assert.equal(g.umpireReveal,null);
 assert.equal(g.umpireCallReveal(),null,'reveal helper is inert in a normal game');
}

// ---------- (e) v107 fix: UI/source guards for the two reported bugs ----------
// Node cannot render the page, so the display conditions are pinned at the
// source level (the live behaviour is additionally code-reviewed):
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const css=fs.readFileSync(__dirname+'/../dist/style.css','utf8');
 const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
 const stadium=fs.readFileSync(__dirname+'/../dist/stadium3d.js','utf8');
 const flat=fs.readFileSync(__dirname+'/../dist/renderer.js','utf8');
 const engine=fs.readFileSync(__dirname+'/../dist/game.js','utf8');
 // Batting / pitching controls hide in umpire mode.
 assert(app.includes("$('bat-options').hidden=def||!!g.umpireMode"),'bat options hide in umpire mode');
 assert(app.includes("$('pitch-deck').hidden=!def||field||g.phase!=='aim'||g.autoDefense||!!g.umpireMode"),'pitch deck hides in umpire mode');
 assert(app.includes("function swing(){if(!game||game.umpireMode||game.spectate)return;"),'app swing entry is gated in umpire mode');
 // The umpire panel no longer sits over home plate / the strike zone, and
 // the feedback is its own small element outside the status pill.
 const panelRule=css.match(/\.umpire-panel\{[^}]*\}/)[0];
 assert(!panelRule.includes('bottom:132px'),'umpire panel is off the old bottom:132px spot');
 assert(panelRule.includes('top:84px')&&panelRule.includes('left:12px'),'umpire panel sits at the upper left, below the scoreboard');
 assert(html.includes('<div id="umpire-feedback" class="umpire-feedback" role="status" hidden>'),'feedback is a separate small pill element');
 assert(app.includes("['intro','aim','windup','pitch'].includes(g.phase)"),'feedback is hidden while a pitch is in flight');
 assert(app.includes('umpireShownAt<1200'),'feedback fades out after ~1.2s');
 // Spec change (zone hidden until the call): both renderers must suppress
 // the aiming/zone overlay in umpire mode during live pitch phases and
 // draw it only through the post-call reveal helper.
 assert(engine.includes('umpireCallReveal(){'),'engine exposes the reveal window state');
 assert(engine.includes("if(p!=='result')this.umpireReveal=null"),'reveal is cleared on any non-result phase');
 assert(stadium.includes("['aim','windup','pitch','miss','intro'].includes(g.phase)&&!g.umpireMode"),'3D HUD hides the zone while an umpire pitch is live');
 assert(stadium.includes('g.umpireCallReveal?.()'),'3D HUD draws the zone only via the reveal window');
 assert(stadium.includes('this.aimPoint(umpireReveal.x,umpireReveal.y)'),'3D reveal marker plots the true crossing point');
 assert(flat.includes("['aim','windup','pitch','miss'].includes(g.phase)&&!g.umpireMode"),'2D renderer hides the zone while an umpire pitch is live');
 assert(flat.includes('g.umpireCallReveal?.()'),'2D renderer draws the zone only via the reveal window');
 assert(flat.includes('x+umpireReveal.x*75'),'2D reveal marker plots the true crossing point');
 // v110 bump: ?v= pins move to 110 and the SW cache name moves with them.
 assert(html.includes('./game.js?v=170')&&html.includes('./app.js?v=170'),'version pins move to 129');
 assert(sw.includes("nightball-v170-leaders-sort"),'SW cache renamed so existing users receive the fix');
}

console.log('umpire-v107: all assertions passed');
