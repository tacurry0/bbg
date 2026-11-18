const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','game']){
 vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'));
}
const originalRandom=Math.random;
function seeded(seed){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function pitcherMatch(defending,control){
 const g=new NightGame('match','standard',()=>{});
 g.half=defending?'top':'bottom';
 const side=g.side==='home'?'away':'home';
 g.pitchingStaff[side]=[{...g.pitcher,control,stamina:72,pitches:NightGame.TYPES.map(p=>p.id)}];
 return g;
}
function walkRate(defending,control,stamina){
 const g=pitcherMatch(defending,control),record=g.pitcherRecord(),trials=1200;
 
 Math.random=seeded(7547);
 for(let i=0;i<trials;i++){
  g.stamina=stamina;
  record.workload=(1-stamina/100)*g.pitcher.stamina/.84;
  g.outs=0;g.next='pitch';g.resetCount();g.batFinished=false;
  for(let n=0;!g.batFinished&&n<16;n++){
   if(defending){
    g.setPhase('aim');g.cursor={x:.76,y:.83};g.pitchType='fast';assert(g.throwPitch());
   }else{
    const plan=g.cpuPitchPlan();g.createPitch(plan.type,plan.target);
   }
   g.take();
   if(g.batFinished)g.bases=[false,false,false];
  }
 }
 return record.bb/trials;
}
function play(fieldRating,run){
 const g=new NightGame('match','standard',()=>{});
 const original=g.fielder.bind(g);
 g.fielder=position=>({...original(position),field:fieldRating,run});
 g.startField(30,30,.08,false);
 return g;
}
function nearCatch(rating,ballHeight,offset){
 const g=play(rating,70),f=g.field,index=7,p=f.fielders[index];
 f.chaser=index;f.elapsed=.95;
 for(const [i,actor] of f.fielders.entries())if(i!==index){actor.x+=400;actor.startX=actor.x;}
 p.intercept={x:p.x,y:p.y,time:1};
 Object.assign(f.ball,{x:p.x+offset,y:p.y,z:ballHeight,vx:0,vy:0,vz:-8,bounces:0});
 g.updateField(.001);
 return g;
}
try{
 const fresh=pitcherMatch(true,80),fast=NightGame.TYPES[0];
 Math.random=()=>.5;
 fresh.createPitch(fast,{x:0,y:0});
 const reference={speed:fresh.pitch.speed,duration:fresh.pitch.duration};
 for(const type of NightGame.TYPES.slice(1)){
  fresh.createPitch(type,{x:0,y:0});
  assert(fresh.pitch.speed<=reference.speed-type.gap+1,type.id);
  assert(fresh.pitch.duration>reference.duration,type.id);
 }
 const smart=play(96,48).field.fielders[7],slow=play(47,48).field.fielders[7],quick=play(47,92).field.fielders[7];
 assert(smart.reaction<slow.reaction);assert(smart.speed>slow.speed);assert(quick.speed>slow.speed);
 const jump=nearCatch(96,2.52,0);
 assert(jump.playEvents.some(e=>e.type==='jump'));assert.equal(jump.outs,1);
 assert.equal(nearCatch(47,2.52,0).outs,0);
 const dive=nearCatch(98,1.09,1.65);
 assert(dive.playEvents.some(e=>e.type==='dive'));assert.equal(dive.outs,1);
 assert.equal(nearCatch(47,1.09,1.65).outs,0);

 Math.random=()=>0;
 const mistake=play(47,66),f=mistake.field;
 Object.assign(f.ball,{z:.4,vx:18,vy:0,vz:-.4,bounces:1});f.elapsed=1;
 assert(mistake.bobbleGrounder(6));
 assert.equal(f.misplay,'bobble');assert(f.fielders[6].recoverAt>f.elapsed);
 assert(!mistake.bobbleGrounder(6),'one fielding mistake per play');
 const strong=play(96,66);
 Object.assign(strong.field.ball,{z:.4,vx:18,vy:0,vz:-.4,bounces:1});
 assert(!strong.bobbleGrounder(6));
 const wild=play(47,66),def=wild.field;
 const to={...NightGame.BASES[2]},from={x:42,y:74};
 const planned={fromIndex:6,receiver:4,base:2,from,to,release:.2,duration:1.4,t:0};
 const throwResult=wild.prepareFieldThrow(planned);
 assert(throwResult.coverAt===to&&Math.hypot(throwResult.to.x-to.x,throwResult.to.y-to.y)>2);
 assert(wild.prepareFieldThrow(planned)===planned);
 assert(strong.prepareFieldThrow(planned)===planned);
 def.throw=throwResult;Object.assign(def.manual,{secured:true,holder:6});
 Object.assign(def.fielders[4],to);
 wild.updateManualDefense(throwResult.duration,()=>{});
 assert.equal(wild.outs,0);assert(!def.manual.secured);
 assert.equal(wild.playEvents.find(e=>e.type==='throw-arrival').caught,false);

 const slide=play(75,74),runner=slide.field.runners[0];
 Object.assign(runner,{base:1,furthest:1,progress:1.93,command:2,target:2});
 slide.field.throw={base:2,runnerId:runner.id,t:.77,duration:1};
 slide.updateRunners(.01);
 assert.equal(runner.slide.base,2);
 assert(runner.progress>1.93&&runner.progress<2);

 for(const defending of [true,false]){
  const accurate=walkRate(defending,91,100),wildFresh=walkRate(defending,46,100),wildTired=walkRate(defending,46,0);
  assert(wildFresh>accurate);
  assert(wildTired>wildFresh);
  console.log(defending?'Manual pitching':'CPU pitching',
   [accurate,wildFresh,wildTired].map(r=>(r*100).toFixed(1)+'% walks').join(' / '));
 }
 console.log('PASS: pitch speed gaps, fielding and running ratings, athletic catches, bobbles, wild throws, and walks.');
}finally{Math.random=originalRandom;}
