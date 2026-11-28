// v270 regression: normal catches before acrobatics, no artificial recovery on a
// failed reach, and glove contact is not the same as touching a force base.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
global.window=global;
for(const p of ['ratings-data','players','pennant'])vm.runInThisContext(fs.readFileSync(path.join(root,'dist',p+'.js'),'utf8'),{filename:p+'.js'});
const originalRandom=Math.random;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function loadGame(file){vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});}
const outKinds=new Set(['flyout','groundout','forceout','doubleplay','sacrificefly','sacrifice']);
function simulate(n,defend,fieldRating=null,weather='clear'){
 const results={outs:0,inPlay:0,hr:0,flyout:0,errors:0,missedThrows:0,great:0};
 for(let i=0;i<n;i++){
  const draw=rng(i+277),speed=18+draw()*42,launch=-9+draw()*64,spray=(draw()-.5)*1.8;
  Math.random=rng(i+1030);
  const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false,weather});g.weather=weather;g.wind=0;g.half=defend?'top':'bottom';g.outs=i%3;
  if(fieldRating!==null){const fielder=g.fielder.bind(g);g.fielder=(...args)=>({...fielder(...args),field:fieldRating,catch:fieldRating});}
  g.bases=[i%3===0,i%7===0,i%11===0];g.baseIds=g.bases.map((b,j)=>b?g.lineups[g.side][5+j].id:null);
  g.startField(speed,launch,spray,defend,false,{quality:draw(),side:draw()*2-1});
  if(g.field.routineCatch)assert.equal(g.field.chaser,g.field.routineCatch.i,'ordinary catch assigned first');
  let steps=0;while(!g.field.resolved&&steps++<3600){if(g.phase==='play-call'||g.phase==='play-review')g.resolvePlayCall(false);else g.updateField(1/120);}
  assert(g.field.resolved,'play resolves: '+i);
  assert(g.field.fielders.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'finite positions');
  const kind=g.hit.kind;
  if(kind==='hr')results.hr++;
  else if(kind!=='foul'){results.inPlay++;if(outKinds.has(kind))results.outs++;}
  if(kind==='flyout')results.flyout++;
  results.errors+=g.homeErrors+g.awayErrors;
  results.missedThrows+=g.playEvents.filter(e=>e.type==='throw-arrival'&&!e.caught).length;
  if(g.field.greatPlay?.confirmed)results.great++;
 }
 return {...results,outRate:results.outs/results.inPlay};
}
function throwProbe(offset){
 Math.random=rng(8);
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning:false,weather:'clear'});g.half='top';g.outs=0;g.bases=[false,false,false];g.baseIds=[null,null,null];
 g.startField(28,0,0,true);g.secureManualBall(0);
 const f=g.field,m=f.manual,r=f.runners[0],p=f.fielders[2],base={x:19.4,y:19.4};
 r.progress=.4;r.command=1;r.target=1;r.running=true;g.projectRunner(r);
 p.x=base.x+offset;p.y=base.y;p.catchReach=1.0;
 f.throw={from:{x:0,y:18.4},to:base,duration:.1,t:.1,release:0,fromIndex:0,receiver:2,base:1,runnerId:r.id};
 g.updateManualDefense(0,()=>{});
 return {secured:m.secured,bag:m.bag,out:r.out};
}
try{
 const baseline=process.env.BASELINE;
 if(baseline){loadGame(baseline);console.log('BASELINE batting',simulate(1000,false));console.log('BASELINE defending',simulate(500,true));}
 loadGame(path.join(root,'dist','game.js'));
 // A failed optional attempt is recorded but never stops the player's run or
 // disables the next routine catch. Actual fielding errors retain penalties.
 Math.random=rng(33);const g=new NightGame('match','standard',()=>{},{weather:'clear'});
 g.startField(35,30,0,false);
 const p=g.field.fielders[g.field.chaser];p.running=true;p.recoverAt=0;Math.random=()=>.999;
 assert.equal(g.specialAttempt(g.field.chaser,'jump'),false);
 assert.equal(p.recoverAt,0);assert.equal(p.running,true);assert(!p.action);
 assert.equal(g.field.specialAttempts[g.field.chaser],'failed');
 assert.equal(g.specialAttempt(g.field.chaser,'jump'),false,'one attempt per fielder per play');
 assert.deepEqual(throwProbe(.8),{secured:true,bag:null,out:false},'reachable but off-base throw is caught, not an automatic out');
 assert.deepEqual(throwProbe(0),{secured:true,bag:1,out:true},'on-base catch with runner still far away is an out');
 assert.equal(throwProbe(2.8).secured,false,'genuinely wild/unreachable throw stays loose');
 const batting=simulate(1000,false),defending=simulate(500,true);
 console.log('v270 batting',batting);console.log('v270 defending',defending);
 assert(batting.outRate>=.60&&batting.outRate<=.76,'recover v259 normal fielding balance');
 assert(defending.outRate>=.54&&defending.outRate<=.72,'recover user defense');
 assert(batting.flyout>=255,'ordinary fly balls are no longer dropped frequently');
 assert(batting.hr>=175&&batting.hr<=183,'home run balance preserved');
 assert(batting.errors<=22&&defending.errors<=12,'actual errors remain uncommon');
 assert(batting.great>0,'legitimate great plays still occur');
 const low=simulate(220,true,40),high=simulate(220,true,85);
 console.log('rating 40 vs 85',low,high);
 assert(high.outRate>low.outRate+.06,'higher defensive rating still earns more outs');
 const rain=simulate(120,true,null,'rain');console.log('rain',rain);assert(rain.inPlay>0&&rain.outRate>.35,'rain remains playable');
 console.log('PASS v270: routine catches, failed reaches, receiving vs base contact, both sides, skill and rain');
}finally{Math.random=originalRandom;}
