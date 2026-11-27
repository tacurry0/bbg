// Regression: the v241 changes must preserve flight carry, resolve live plays,
// and avoid a discontinuity at the bounce of a long throw.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const p of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync('dist/'+p+'.js','utf8'),{filename:p+'.js'});
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const original=Math.random;
try{
 const outcome={};let errors=0,air=0;
 for(let i=0;i<300;i++){
  const draw=rng(i+277),speed=18+draw()*42,launch=-9+draw()*64,spray=(draw()-.5)*1.8;
  Math.random=rng(i+1030);
  const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false});g.half='bottom';g.outs=i%3;
  g.bases=[i%3===0,i%7===0,i%11===0];g.baseIds=g.bases.map((b,j)=>b?g.lineups.home[5+j].id:null);
  g.startField(speed,launch,spray,false,false,{quality:draw(),side:draw()*2-1});air+=g.field.landing.time;
  let n=0;while(!g.field.resolved&&n++<3600){if(g.phase==='play-call'||g.phase==='play-review')g.resolvePlayCall(false);else g.updateField(1/120);}
  assert(g.field.resolved,'live play resolves: '+i);
  assert(g.field.fielders.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'valid fielder coordinates');
  outcome[g.hit.kind]=(outcome[g.hit.kind]||0)+1;errors+=g.homeErrors+g.awayErrors;
 }
 assert(Math.abs(air/300-1.9334)<.04,'airtime remains near v240 baseline');
 assert(outcome.hr>=40&&outcome.hr<=54,'HR distribution remains near v240 (47)');
 assert(errors<=14,'errors remain uncommon');
 assert((outcome.single||0)+(outcome.double||0)+(outcome.triple||0)>=65,'non-HR hits remain possible');
 const g=new NightGame('match','standard',()=>{}),ball={},th={from:{x:0,y:0},to:{x:0,y:70},duration:1,release:0,t:0,throwStyle:'bounce'};
 g.stepReturn(th,ball,.82);assert(Math.abs(ball.z-.08)<.002,'throw contacts ground');
 g.stepReturn(th,ball,.18);assert(Math.abs(ball.z-1.65)<.002,'throw arrives at glove');
 console.log('PASS v241 field simulation',outcome,errors);
}finally{Math.random=original;}
