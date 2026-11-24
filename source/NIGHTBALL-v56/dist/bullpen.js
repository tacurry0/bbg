/* Bullpen practice (v157, checker item "bullpen-practice-mode"):
   a pitcher-only practice mode with NO batter. The existing pitching
   practice (mode 'pitching') is a live at-bat against a CPU batter —
   counts, swings and strikeouts — so it cannot isolate command: the
   batter's behaviour decides half of every result. The bullpen instead
   lets the player pick a pitcher (any club's staff), a pitch type and
   an aim point, throw the same pitch again and again, and read the
   scatter directly: where the ball actually arrived versus where it
   was aimed, its speed and its break.
   The pitch itself is NOT a new simulation. Break, spin and the speed
   baseline come from the match engine's own NightGame.pitchSpec()
   (the same numbers the pitch deck shows in a game), and the command
   scatter reuses NightGame.throwPitch()'s exact formula: a uniform
   error band of .03 + (100 - control) * .006 around the aim, plus the
   same miss chance that can push an in-zone aim out of the zone
   (.01 + (70 - control) * .0035, clamped .005–.32, pushed to
   1.19–1.52 on the dominant axis). Bullpen throws are fresh (no
   in-game fatigue, no count pressure, no mastery bonus), so the
   fatigue / pressure / mastery terms of a live game are the only
   pieces intentionally left out. Speed follows createPitch(): the
   pitchSpec speed with a ±2 km/h roll, capped at spec + 2.
   Break in centimetres uses the engine's own conversion from
   completePitch(): hypot(bx, by) * 20.4. One zone unit is likewise
   ~20.4 cm (the zone is 2.12 units wide ≈ 43 cm), so aim deviation
   is reported in the same centimetres.
   A session is plain in-memory state: nothing is written to the
   record room (v156 explicitly excludes practice) or to the career /
   match records — this is practice, and leaving the modal discards
   the session. The RNG is injectable so tests can reproduce a whole
   session from a fixed seed. */
(()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ZONE=1.06;      // strike-zone half extent, as in createPitch().isStrike
const CM_PER_UNIT=20.4; // the engine's break conversion (completePitch)
function createRng(seed){
 let a=Number(seed)>>>0||1;
 return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
function createSession(pitcherId){
 return {pitcherId:pitcherId||null,pitches:[]};
}
// One bullpen throw. `aim` is {x, y} in zone units (0 = centre,
// ±1.06 = zone edge, same coordinates as NightGame pitch targets).
// Returns the recorded pitch, also appended to session.pitches.
function throwPitch(session,pitcher,typeId,aim,rng){
 if(!session||!pitcher)return null;
 const rand=typeof rng==='function'?rng:Math.random;
 const rnd=(a,b)=>a+rand()*(b-a);
 const type=(pitcher.pitches||[]).includes(typeId)?typeId:(pitcher.pitches||['fast'])[0];
 const spec=globalThis.NightGame?.pitchSpec?globalThis.NightGame.pitchSpec(pitcher,type):
  {id:type,name:type,short:type,speed:pitcher.velocity||140,bx:0,by:0,spinRpm:0};
 const ax=clamp(Number(aim?.x)||0,-1.6,1.6),ay=clamp(Number(aim?.y)||0,-1.6,1.6);
 // Scatter: NightGame.throwPitch() with a fresh arm (fatigue 0).
 const control=clamp(Number(pitcher.control)||0,0,99);
 const error=.03+(100-control)*.006;
 const target={x:ax+rnd(-error,error),y:ay+rnd(-error,error)};
 const missChance=clamp(.01+(70-control)*.0035,.005,.32);
 if(Math.abs(ax)<=ZONE&&Math.abs(ay)<=ZONE&&rand()<missChance){
  const axis=Math.abs(ax)>Math.abs(ay)?'x':'y';
  const sign=Math.sign(axis==='x'?ax:ay)||(rand()<.5?-1:1);
  target[axis]=sign*rnd(1.19,1.52);
 }
 const speed=Math.round(Math.min(spec.speed+2,spec.speed+rnd(-2,2)));
 const rec={
  n:session.pitches.length+1,
  typeId:type,name:spec.name||type,short:spec.short||spec.name||type,
  aimX:ax,aimY:ay,x:target.x,y:target.y,
  dx:target.x-ax,dy:target.y-ay,
  devCm:Math.round(Math.hypot(target.x-ax,target.y-ay)*CM_PER_UNIT),
  speed,
  breakCm:Math.round(Math.hypot(spec.bx||0,spec.by||0)*CM_PER_UNIT),
  breakXCm:Math.round((spec.bx||0)*CM_PER_UNIT),
  breakYCm:Math.round((spec.by||0)*CM_PER_UNIT),
  spinRpm:spec.spinRpm??null,
  strike:Math.abs(target.x)<=ZONE&&Math.abs(target.y)<=ZONE,
 };
 session.pitches.push(rec);
 return rec;
}
function summarize(session){
 const list=session?.pitches||[];
 if(!list.length)return {count:0,strikes:0,strikeRate:null,avgDevCm:null,avgSpeed:null,byType:{}};
 const byType={};
 for(const p of list){const b=byType[p.typeId]||(byType[p.typeId]={count:0,strikes:0,devSum:0});b.count++;b.strikes+=p.strike?1:0;b.devSum+=p.devCm;}
 for(const b of Object.values(byType))b.avgDevCm=Math.round(b.devSum/b.count);
 const strikes=list.filter(p=>p.strike).length;
 return {
  count:list.length,strikes,
  strikeRate:Math.round(strikes/list.length*100),
  avgDevCm:Math.round(list.reduce((s,p)=>s+p.devCm,0)/list.length),
  avgSpeed:Math.round(list.reduce((s,p)=>s+p.speed,0)/list.length),
  byType,
 };
}
const api={ZONE,CM_PER_UNIT,createRng,createSession,throwPitch,summarize};
if(typeof window!=='undefined')window.NightBullpen=api;
if(typeof globalThis!=='undefined')globalThis.NightBullpen=api;
})();
