// v134: time attack mode (checker item "time-attack-mode").
// A short timed mode on the regular versus engine: the user keeps one
// role for the whole clock — batting (score = runs) or pitching
// (score = outs). Three outs restart the same half as the next set
// instead of switching sides, the clock in update() ends the game via
// finishTimeAttack(), and best scores persist per kind in localStorage
// ('nightball.timeAttackBest') through the NightTimeAttack module.
// Covered here: config/best-score module behaviour, the engine scope
// gates, deterministic run/outs tallies (four walks force a run; three
// strikeouts bank three outs and the half does NOT switch), timer
// expiry ending both kinds with a consistent result, a normal versus
// match being completely free of the timer, and app wiring + v134 pins.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
const store=new Map();
global.localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k),
};
for(const file of ['ratings-data.js','players.js','pennant.js','time-attack.js','game.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const TA=global.NightTimeAttack;
assert(TA,'NightTimeAttack module loads');
assert.equal(TA.KEY,'nightball.timeAttackBest');
assert.deepEqual(TA.DURATIONS,[60,90,120],'the UI offers 60/90/120 second clocks');

function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_map:m};}
function playUntil(g,cond,cap=200000){
 g.autoBatting=true;g.autoDefense=true;
 let n=0;
 while(!cond(g)&&n<cap){
  if(g.phase==='change')g.acknowledgeHalf();
  if(g.phase==='aim'&&g.defending)g.autoPitch();
  g.update(50);n++;
 }
 return n;
}
// Four called balls walk the batter (Math.random pinned high so the
// small HBP roll in commitCalledPitch cannot fire).
function walkBatter(g){
 const rnd=Math.random;Math.random=()=>.99;
 try{for(let i=0;i<4;i++){g.createPitch(NightGame.TYPES[0],{x:.4,y:0});g.commitCalledPitch(false);}}
 finally{Math.random=rnd;}
 assert(g.batFinished,'four balls walk the batter');
}
function strikeOutBatter(g){
 for(let i=0;i<3;i++){g.createPitch(NightGame.TYPES[0],{x:0,y:0});g.commitCalledPitch(true);}
 assert(g.batFinished,'three strikes retire the batter');
}

// ---------- module: config cleanup ----------
assert.deepEqual(TA.cleanConfig({kind:'bat',seconds:90}),{kind:'bat',seconds:90});
assert.deepEqual(TA.cleanConfig({kind:'pitch',seconds:60}),{kind:'pitch',seconds:60});
assert.equal(TA.cleanConfig({kind:'both',seconds:90}),null,'unknown kind rejected');
assert.equal(TA.cleanConfig({kind:'bat',seconds:0}),null,'zero seconds rejected');
assert.equal(TA.cleanConfig({kind:'bat'}),null,'missing seconds rejected');
assert.equal(TA.cleanConfig(null),null);
assert.equal(TA.scoreOf({kind:'bat',runs:4,outs:9}),4,'batting score is runs');
assert.equal(TA.scoreOf({kind:'pitch',runs:4,outs:9}),9,'pitching score is outs');

// ---------- module: best scores persist, only move up, survive corruption ----------
{
 const s=memStorage();
 assert.deepEqual(TA.loadBest(s),{bat:0,pitch:0},'empty store reads as zeroes');
 const r1=TA.recordBest('bat',3,s);
 assert.equal(r1.updated,true);assert.equal(r1.best.bat,3);
 const r2=TA.recordBest('bat',2,s);
 assert.equal(r2.updated,false,'a lower run does not lower the best');
 assert.equal(r2.best.bat,3);
 const r3=TA.recordBest('pitch',7,s);
 assert.equal(r3.updated,true);assert.deepEqual(r3.best,{bat:3,pitch:7},'kinds keep separate bests');
 assert.deepEqual(TA.loadBest(s),{bat:3,pitch:7},'bests survive a reload from the same store');
 assert.equal(JSON.parse(s._map.get(TA.KEY)).pitch,7,'stored under the documented key');
 s._map.set(TA.KEY,'{not json');
 assert.deepEqual(TA.loadBest(s),{bat:0,pitch:0},'a corrupt store reads as zeroes, never throws');
 s._map.set(TA.KEY,JSON.stringify({bat:-5,pitch:'x'}));
 assert.deepEqual(TA.loadBest(s),{bat:0,pitch:0},'nonsense values are sanitised to zeroes');
}

// ---------- engine gates: only regular versus matches ----------
const TA_BAT={kind:'bat',seconds:90};
assert(new NightGame('match','standard',()=>{},{timeAttack:TA_BAT}).timeAttack,'versus match accepts time attack');
assert.equal(new NightGame('match','standard',()=>{},{}).timeAttack,null,'no option means no time attack');
assert.equal(new NightGame('pennant','standard',()=>{},{timeAttack:TA_BAT}).timeAttack,null,'pennant never gets time attack');
assert.equal(new NightGame('match','standard',()=>{},{timeAttack:TA_BAT,umpire:true}).timeAttack,null,'umpire mode never gets time attack');
assert.equal(new NightGame('match','standard',()=>{},{timeAttack:TA_BAT,remoteSide:'away'}).timeAttack,null,'online (remote) games never get time attack');
assert.equal(new NightGame('match','standard',()=>{},{timeAttack:TA_BAT,career:{fixtureId:'x'}}).timeAttack,null,'career games never get time attack');
assert.equal(new NightGame('practice','standard',()=>{},{timeAttack:TA_BAT}).timeAttack,null,'practice never gets time attack');
assert.equal(new NightGame('match','standard',()=>{},{timeAttack:{kind:'both',seconds:90}}).timeAttack,null,'unknown kind rejected by the engine');
assert.equal(new NightGame('match','standard',()=>{},{timeAttack:{kind:'bat',seconds:0}}).timeAttack,null,'zero seconds rejected by the engine');

// ---------- batting kind: the user bats from the first pitch ----------
{
 const home=new NightGame('match','standard',()=>{},{userHome:true,timeAttack:TA_BAT});
 assert.equal(home.half,'bottom','home user bats in the bottom half');
 assert.equal(home.defending,false,'batting kind starts on offence');
 assert.equal(home.totalInnings,999,'innings can never end a time attack');
 const away=new NightGame('match','standard',()=>{},{userHome:false,timeAttack:TA_BAT});
 assert.equal(away.half,'top');assert.equal(away.defending,false,'away user also bats first');
 const pitchHome=new NightGame('match','standard',()=>{},{userHome:true,timeAttack:{kind:'pitch',seconds:90}});
 assert.equal(pitchHome.half,'top');assert.equal(pitchHome.defending,true,'pitching kind starts on defence');
 const pitchAway=new NightGame('match','standard',()=>{},{userHome:false,timeAttack:{kind:'pitch',seconds:90}});
 assert.equal(pitchAway.half,'bottom');assert.equal(pitchAway.defending,true,'away user also pitches first');
}

// ---------- batting kind: four walks force in a run, and the tally matches ----------
{
 const g=new NightGame('match','standard',()=>{},{userHome:true,timeAttack:{kind:'bat',seconds:2}});
 walkBatter(g);walkBatter(g);walkBatter(g);
 assert.equal(g.homeScore,0,'bases loaded, no run yet');
 walkBatter(g);
 assert.equal(g.homeScore,1,'the fourth walk forces in a run');
 assert.equal(g.session.runs,1,'the run is the user\'s');
 playUntil(g,x=>x.phase==='ended');
 const r=g.timeAttack.result;
 assert(r,'time expiry produced a result');
 assert.equal(r.kind,'bat');
 assert.equal(r.runs,g.homeScore,'result runs equal the scoreboard');
 assert(r.runs>=1,'the forced run is in the tally ('+r.runs+')');
 assert.equal(r.hits,g.session.hits,'result hits equal the session hits');
 assert.equal(r.hr,g.session.hr,'result home runs equal the session home runs');
 assert.equal(g.timeAttack.remaining,0,'the clock ran out');
}

// ---------- pitching kind: outs bank across sets, the half never switches ----------
{
 const g=new NightGame('match','standard',()=>{},{userHome:true,timeAttack:{kind:'pitch',seconds:2}});
 strikeOutBatter(g);strikeOutBatter(g);
 assert.equal(g.timeAttack.outs,0,'outs bank only when the set ends');
 strikeOutBatter(g);
 assert.equal(g.outs,3,'the third strikeout makes three outs');
 playUntil(g,x=>x.timeAttack.halves>=1,5000);
 assert.equal(g.timeAttack.outs,3,'the completed set banks its three outs');
 assert.equal(g.half,'top','the user is STILL pitching after three outs — no side switch');
 assert.equal(g.defending,true);
 assert.equal(g.inning,2,'the next set is a fresh inning with clear bases');
 assert.deepEqual(g.bases,[false,false,false]);
 playUntil(g,x=>x.phase==='ended');
 const r=g.timeAttack.result;
 assert(r,'time expiry produced a result');
 assert.equal(r.kind,'pitch');
 assert(r.outs>=3,'banked outs are in the tally ('+r.outs+')');
 assert.equal(r.allowed,g.awayScore,'result runs-allowed equal the opponent score');
 assert.equal(r.ks,g.session.ks,'result strikeouts equal the session strikeouts');
}

// ---------- timer expiry: a short clock ends the game promptly, once ----------
{
 const g=new NightGame('match','standard',()=>{},{userHome:true,timeAttack:{kind:'bat',seconds:2}});
 const steps=playUntil(g,x=>x.phase==='ended',10000);
 assert.equal(g.phase,'ended','a 2-second clock ends the game');
 assert(steps<1000,'expiry is prompt, not innings-driven ('+steps+' steps)');
 assert(g.timeAttack.result,'result recorded at expiry');
 assert.equal(g.finishTimeAttack(),false,'finishTimeAttack cannot run twice');
}

// ---------- a normal versus match has no timer mixed in ----------
{
 const g=new NightGame('match','standard',()=>{},{userHome:true,innings:3});
 assert.equal(g.timeAttack,null);
 playUntil(g,x=>x.phase==='ended');
 assert.equal(g.phase,'ended','the normal match still ends');
 assert.equal(g.inning,3,'it ends by innings, as before');
 assert.equal(g.timeAttack,null,'no time attack state appears mid-game');
}

// ---------- app wiring + v134 pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(index.includes('data-mode="timeattack"'),'home menu gains a time attack entry');
assert(index.includes('./time-attack.js?v=1'),'index loads the time attack module');
assert(app.includes('function setupTimeAttack('),'app has the setup modal');
assert(app.includes('pendingTimeAttack'),'app starts time attack through the match flow');
assert(app.includes("timeAttack:pendingTimeAttack&&mode==='match'"),'app passes the config only for a time attack start');
assert(app.includes('NightTimeAttack.recordBest'),'the result screen records the best score');
assert(app.includes('NightTimeAttack.loadBest'),'the setup screen shows the best scores');
assert(app.includes('!game.timeAttack'),'time attack games are kept out of the match checkpoint');
assert(index.includes('./game.js?v=179')&&index.includes('./app.js?v=179'),'index pins move to v134');
assert(sw.includes('nightball-v179-powerpro-picker'),'SW cache renamed for v134');
assert(sw.includes('./game.js?v=179')&&sw.includes('./app.js?v=179'),'SW precaches the v134 scripts');
assert(sw.includes('./time-attack.js?v=1'),'SW precaches the time attack module');
console.log('PASS: config + best-score module (persist / monotonic / corrupt-safe), engine gates, role-first halves, walk-forced run tally, banked outs without a side switch, prompt one-shot timer expiry, normal match untouched, app wiring + v134 pins.');
