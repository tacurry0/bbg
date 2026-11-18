const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.window=global;
for(const f of ['ratings-data','players','pennant','game'])vm.runInThisContext(fs.readFileSync('dist/'+f+'.js','utf8'));
function setup(mask=7,outs=0){const g=new NightGame('match','standard',()=>{});g.half='bottom';g.inning=5;g.home[4]=0;g.away[4]=0;g.outs=outs;g.bases=[0,1,2].map(i=>!!(mask&(1<<i)));g.baseIds=g.bases.map((v,i)=>v?g.lineups.home[i+5].id:null);return g;}
function settle(g){for(let i=0;i<1600;i++)g.updateRunners(.02);}
// The winning runner determines hit credit; only a home run scores everyone.
for(const userHome of [true,false])for(const kind of ['double','triple'])for(const deficit of [0,1,2]){
 const g=setup(7,2);g.userHome=userHome;g.homeScore=4;g.awayScore=4+deficit;g.startField(35,20,0,false);g.finishBall(kind);settle(g);
 const enough=kind==='triple'||deficit<2;
 assert.equal(g.homeScore,enough?g.awayScore+1:6);assert.equal(g.batterStats().rbi,enough?deficit+1:2);
 if(enough){assert.equal(g.next,'finish');assert.equal(g.field.runners.filter(r=>r.progress===4).length,deficit+1);}
}
for(const kind of ['single','double','triple','hr']){const g=setup(7,2);g.homeScore=3;g.awayScore=3;g.startField(40,35,0,false);g.finishBall(kind);assert.equal(g.homeScore,kind==='hr'?7:4);assert.equal(g.next,'finish');assert.equal(g.batterStats().h,1);assert.equal(g.pitcherRecord().runs,kind==='hr'?4:1);}
const early=setup(7);early.inning=4;early.startField(20,10,0,false);early.finishBall('double');assert.equal(early.homeScore,2);
// Probability boundaries and third-out scoring, including actual field animation.
for(const [roll,result]of [[0,'sacrifice'],[.89999,'sacrifice'],[.9,'buntout'],[.94999,'buntout'],[.95,'buntsingle'],[.99999,'buntsingle']])for(const outs of [0,1,2]){
 const g=setup(7,outs);g.inning=1;const old=g.baseIds.slice(),id=g.batter.id;g.phase='pitch';g.pitch={swung:false,progress:1};g.bunt=true;const random=Math.random;Math.random=()=>roll;assert(g.swing());Math.random=random;assert.equal(g.field.buntResult,result);
 for(let i=0;i<1400&&!g.field.resolved;i++)g.updateField(.02);assert(g.field.resolved);assert.equal(g.field.outcome,result);settle(g);
 if(result==='buntsingle'){assert.equal(g.outs,outs);assert.equal(g.homeHits,1);assert.deepEqual(g.baseIds,[id,old[0],old[1]]);assert.equal(g.homeScore,1);assert.equal(g.batterStats().h,1);}
 else {assert.equal(g.outs,outs+1);assert.equal(g.homeHits,0);assert.equal(g.homeScore,result==='sacrifice'&&outs<2?1:0);assert.deepEqual(g.baseIds,result==='sacrifice'&&outs<2?[null,old[0],old[1]]:old);assert.equal(g.field.runners[0].out,true);assert.equal(g.batterStats().ab,result==='sacrifice'&&outs<2?0:1);}
}
// DP is decided by two throws beating both runners, with only two outs available.
for(const outs of [0,1]){
 const g=setup(7,outs);g.inning=1;const old=g.baseIds.slice();g.startField(25,0,0,false);const f=g.field;f.ball={x:4,y:26,z:.1,vx:0,vy:0,vz:0,bounces:1};f.elapsed=.7;const p=f.fielders[3];p.x=4;p.y=26;const th=g.planDoublePlay(p);assert(th?.relay);assert.equal(th.result,'forceout');assert.equal(th.relay.result,'doubleplay');f.throw=th;
 for(let i=0;i<300&&!f.resolved;i++)g.updateField(.02);assert(f.resolved);assert.equal(f.outcome,'doubleplay');assert.equal(g.outs,outs+2);assert.equal(g.pitcherRecord().outs,2);assert.equal(g.homeScore,0);assert.deepEqual(g.baseIds,[null,old[1],old[2]]);assert.equal(g.batterStats().gidp,1);assert(f.runners.filter(r=>r.out).length===2);
}
const last=setup(1,2);last.startField(20,0,0,false);last.field.ball.bounces=1;assert.equal(last.planDoublePlay(last.field.fielders[3]),null);
// A slow relay produces a force out, with the batter safe at first.
const fc=setup(1);fc.inning=1;fc.startField(20,0,0,false);fc.field.ball={x:0,y:36,z:0,bounces:1};const second=fc.field.fielders[3];second.x=0;second.y=36;fc.field.fielders[4].arm=1;fc.field.runners[0].progress=.75;const choice=fc.planDoublePlay(second);assert(choice&&!choice.relay);fc.finishBall('forceout');settle(fc);assert.equal(fc.outs,1);assert.equal(fc.baseIds[0],fc.batter.id);assert(fc.field.runners.find(r=>r.start===1).out);assert(!fc.field.runners[0].out);
// Seeded CPU pitch decisions across counts: more patience early, protects late, Ks exist.
let seed=1605;const nativeRandom=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const cpu=new NightGame('match','standard',()=>{});let pitches=0,firstSwings=0,firsts=0,ks=0,walks=0;const appearances=2000;
for(let pa=0;pa<appearances;pa++){
 cpu.balls=0;cpu.strikes=0;cpu.outs=0;cpu.batFinished=false;cpu.pitchHistory=[];cpu.battingIndex.away=pa%9;
 for(let count=0;count<30&&!cpu.batFinished;count++){
  const pool=cpu.pitcher.pitches,id=pool[Math.floor(Math.random()*pool.length)],type=NightGame.TYPES.find(t=>t.id===id),inZone=Math.random()<.70,target=inZone?{x:(Math.random()*1.8-.9),y:(Math.random()*1.8-.9)}:{x:1.15+Math.random()*.4,y:Math.random()*.8};
  cpu.createPitch(type,target);pitches++;if(!cpu.balls&&!cpu.strikes){firsts++;firstSwings+=+cpu.pitch.cpuSwing;}
  if(cpu.pitch.cpuSwing){cpu.cpuBat();if(cpu.phase==='miss')cpu.strike(true);else if(cpu.phase==='field')cpu.finishBall(cpu.field.foul?'foul':'single');}else cpu.take();
 }
 assert(cpu.batFinished);ks+=cpu.batterStats().k||0;walks+=cpu.batterStats().bb||0;cpu.box={};
}
Math.random=nativeRandom;
const rates={pitchesPerPA:pitches/appearances,firstPitchSwing:firstSwings/firsts,strikeouts:ks/appearances,walks:walks/appearances};assert(rates.firstPitchSwing<.5);assert(rates.pitchesPerPA>2.6);assert(rates.strikeouts>.10&&rates.strikeouts<.48);
assert(fs.readFileSync('dist/stadium3d.js','utf8').includes('root.scale.multiplyScalar(2)'));
console.log('PASS: walk-off scoring/hit credit/HR exception; all bunt probability boundaries and third outs; animated DP/force out; player scale. CPU:',rates);
