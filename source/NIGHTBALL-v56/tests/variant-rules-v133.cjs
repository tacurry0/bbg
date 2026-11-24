// v133: variant-rules matches (checker item "variant-rules-match").
// Regular versus matches gain four independent, combinable rule toggles:
//   fullCount  - every at-bat starts at 2 balls / 2 strikes
//   metalBat   - +3% exit velocity in startField (v108 spin model untouched)
//   noBreaking - both pitchers throw fastballs only (CPU plan, the user's
//                throwPitch and the pitch-type buttons all enforce it)
//   twoOuts    - a half ends after 2 outs (outsNeeded=2)
// The rules are gated to mode 'match' with no umpire / remote / career
// context inside NightGame.normalizeVariantRules, and the app only passes
// them for regular versus matches. Covered here: each rule's behaviour,
// the OFF game being byte-for-byte the pre-v133 game, scope gates,
// snapshot/restore, combined-rules games playing to completion, and the
// app wiring + v133 version pins.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pennant.js','game.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function seeded(seed){const orig=Math.random;Math.random=mulberry32(seed);return()=>{Math.random=orig;};}
const ALL={fullCount:true,metalBat:true,noBreaking:true,twoOuts:true};
const NONE={fullCount:false,metalBat:false,noBreaking:false,twoOuts:false};
function matchGame(rules,extra={}){return new NightGame('match','standard',()=>{},{userHome:true,innings:3,...(rules?{variantRules:rules}:{}),...extra});}
function playOut(g){
 g.autoBatting=true;g.autoDefense=true;
 for(let i=0;i<60000&&g.phase!=='ended';i++){
  if(g.phase==='change')g.acknowledgeHalf();
  if(g.phase==='aim'&&g.defending)g.autoPitch();
  g.update(50);
 }
 return g;
}

// ---------- scope gates: only regular versus matches ----------
assert.deepEqual(matchGame(ALL).variantRules,ALL,'versus match accepts all four rules');
assert.deepEqual(matchGame().variantRules,NONE,'no option means every rule OFF');
assert.deepEqual(new NightGame('pennant','standard',()=>{},{variantRules:ALL}).variantRules,NONE,'pennant never gets variant rules');
assert.deepEqual(new NightGame('match','standard',()=>{},{variantRules:ALL,umpire:true}).variantRules,NONE,'umpire mode never gets variant rules');
assert.deepEqual(new NightGame('match','standard',()=>{},{variantRules:ALL,remoteSide:'away'}).variantRules,NONE,'online (remote) games never get variant rules');
assert.deepEqual(new NightGame('practice','standard',()=>{},{variantRules:ALL}).variantRules,NONE,'practice never gets variant rules');

// ---------- full count: every at-bat starts 2-2 ----------
{
 const g=matchGame({fullCount:true});
 assert.equal(g.balls,2,'first at-bat starts with 2 balls');
 assert.equal(g.strikes,2,'first at-bat starts with 2 strikes');
 g.resetCount();assert.equal(g.balls,2);assert.equal(g.strikes,2,'resetCount returns to 2-2');
 // Two balls walk the batter; the next at-bat is 2-2 again. (Math.random
 // is pinned high so the small HBP roll in commitCalledPitch cannot fire.)
 const random=Math.random;Math.random=()=>.99;
 try{
 g.createPitch(NightGame.TYPES[0],{x:.4,y:0});
 g.commitCalledPitch(false);
 assert.equal(g.balls,3,'one ball makes it 3-2');
 g.commitCalledPitch(false);
 }finally{Math.random=random;}
 assert(g.batFinished,'the second ball walks the batter');
 assert.equal(g.balls,2);assert.equal(g.strikes,2,'the next at-bat starts 2-2 after a walk');
 assert.equal(g.bases[0],true,'the walked batter is on first');
 // One strike is a strikeout from 2-2.
 const g2=matchGame({fullCount:true});
 g2.createPitch(NightGame.TYPES[0],{x:0,y:0});
 g2.commitCalledPitch(true);
 assert.equal(g2.outs,1,'one strike strikes out a 2-2 batter');
 assert.equal(g2.balls,2);assert.equal(g2.strikes,2,'the next at-bat starts 2-2 after a strikeout');
 // A foul does not end the at-bat (strikes stay capped at 2).
 const g3=matchGame({fullCount:true});
 g3.startField(20,5,2.0,false); // spray beyond the foul pole
 assert.equal(g3.field.foul,true);
 g3.finishBall('foul');
 assert.equal(g3.strikes,2,'a foul at 2 strikes keeps the count at 2-2');
 assert(!g3.batFinished,'the at-bat continues after a foul');
}

// ---------- no breaking balls: CPU plan and user throws ----------
{
 const g=matchGame({noBreaking:true});
 for(let i=0;i<200;i++)assert.equal(g.cpuPitchPlan().type.id,'fast','CPU plan throws only fastballs (draw '+i+')');
 // The user's own throw is forced to a fastball too.
 const u=matchGame({noBreaking:true});
 u.half='top'; // userHome=true -> top is the user's defence
 assert.equal(u.defending,true);
 const breaking=u.pitcher.pitches.find(id=>id!=='fast');
 assert(breaking,'the test pitcher has a breaking ball to forbid');
 u.pitchType=breaking;u.setPhase('aim');
 assert.equal(u.throwPitch(),true,'the user pitch is thrown');
 assert.equal(u.pitchType,'fast','a selected breaking ball is forced back to a fastball');
 assert.equal(u.pitch.id,'fast','the delivered pitch is a fastball');
 // OFF control: the same plan does throw breaking balls.
 const off=matchGame();
 const seen=new Set();for(let i=0;i<300;i++)seen.add(off.cpuPitchPlan().type.id);
 assert(seen.size>1,'without the rule the CPU mixes pitch types ('+[...seen].join(',')+')');
}

// ---------- metal bat: paired fixed-seed carry probe ----------
function carry(seed,metal){
 const g=matchGame(metal?{metalBat:true}:null);
 g.half='bottom';g.weather='clear';g.wind=0; // pin the weather so the pair differs only by the bat
 const restore=seeded(seed);
 g.startField(44,32,0,false,true,{quality:.9,side:0});
 restore();
 const landing=g.predictLanding(g.field.ball);
 return {dist:Math.hypot(landing.x,landing.y),exit:g.hit.exitKmh};
}
{
 let offSum=0,onSum=0,exitGain=0;const N=120;
 for(let seed=1;seed<=N;seed++){
  const off=carry(seed,false),on=carry(seed,true);
  offSum+=off.dist;onSum+=on.dist;exitGain+=on.exit-off.exit;
  assert(on.dist>off.dist,'metal bat carries farther on seed '+seed);
 }
 const offAvg=offSum/N,onAvg=onSum/N;
 console.log(`metal-bat probe: mean carry OFF ${offAvg.toFixed(2)} m -> ON ${onAvg.toFixed(2)} m (+${(onAvg-offAvg).toFixed(2)} m, +${((onAvg/offAvg-1)*100).toFixed(1)}%), mean exit velocity +${(exitGain/N).toFixed(1)} km/h`);
 assert(onAvg-offAvg>1,'metal bat adds real carry (+'+(onAvg-offAvg).toFixed(2)+' m)');
 assert(onAvg-offAvg<10,'metal bat stays a modest boost, not a moonshot mode (+'+(onAvg-offAvg).toFixed(2)+' m)');
}

// ---------- two outs: a half ends after the second out ----------
{
 const g=matchGame({twoOuts:true});
 assert.equal(g.outsNeeded,2);
 g.addOut();assert.notEqual(g.next,'half','one out does not end a two-out half');
 g.addOut();assert.equal(g.next,'half','the second out ends the half');
 const off=matchGame();
 assert.equal(off.outsNeeded,3,'the standard game still needs three outs');
 off.addOut();off.addOut();assert.notEqual(off.next,'half');
 off.addOut();assert.equal(off.next,'half','the standard game ends the half at three outs');
}

// ---------- OFF is exactly the pre-v133 game ----------
{
 const a=matchGame(),b=matchGame(NONE);
 a.conditionSeed=b.conditionSeed='variant-off-probe'; // per-game form seed is pre-existing engine variance, not a rule effect
 assert.deepEqual(b.variantRules,NONE);
 assert.equal(a.balls,0);assert.equal(a.strikes,0);assert.equal(a.outsNeeded,3);
 const types=g=>{const restore=seeded(99);const out=[];for(let i=0;i<25;i++)out.push(g.cpuPitchPlan().type.id);restore();return out;};
 assert.deepEqual(types(a),types(b),'explicit all-OFF plans match the no-option game pitch for pitch');
 const ball=g=>{const restore=seeded(7);g.half='bottom';g.weather='clear';g.wind=0;g.startField(44,32,.1,false,true,{quality:.9,side:.2});restore();const l=g.predictLanding(g.field.ball);return [Math.round(l.x*1e6),Math.round(l.y*1e6),g.hit.exitKmh];};
 assert.deepEqual(ball(matchGame()),ball(matchGame(NONE)),'explicit all-OFF flight matches the no-option game exactly');
}

// ---------- snapshot / restore keeps the rules ----------
{
 const g=matchGame({fullCount:true,twoOuts:true});
 const restored=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{});
 assert(restored,'variant match restores from a snapshot');
 assert.deepEqual(restored.variantRules,{fullCount:true,metalBat:false,noBreaking:false,twoOuts:true},'rules survive restore');
 assert.equal(restored.outsNeeded,2,'outsNeeded survives restore');
 restored.resetCount();assert.equal(restored.balls,2);assert.equal(restored.strikes,2,'restored game still starts at-bats 2-2');
}

// ---------- combined rules: a full game plays to completion ----------
{
 const g=playOut(matchGame(ALL));
 assert.equal(g.phase,'ended','a game with every rule ON completes');
 const pa=Object.values(g.box).reduce((n,b)=>n+(b.pa||0),0);
 assert(pa>=12,'at-bats were recorded across the combined-rules game ('+pa+' PA; two-out halves need at least 12)');
 const off=playOut(matchGame());
 assert.equal(off.phase,'ended','a standard game still completes');
}

// ---------- app wiring ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
for(const key of ['variantFullCount','variantMetalBat','variantNoBreaking','variantTwoOuts']){
 assert(app.includes(key+':false'),'setting '+key+' defaults to OFF');
 assert(app.includes('data-toggle="${v}"')||app.includes(`'${key}'`),'setup screen exposes the '+key+' toggle');
}
assert(app.includes('変則ルール（通常対戦のみ・組み合わせ可）'),'setup screen has the variant-rules section');
assert(app.includes("variantRules:mode==='match'&&!challengeId&&!pendingUmpire"),'the app passes rules only for regular versus matches');
assert(app.includes('fullCount:!!settings.variantFullCount'),'settings map into the game options');
assert(app.includes('g.variantRules.noBreaking'),'pitch-type buttons are disabled under noBreaking');
assert(index.includes('./game.js?v=138')&&index.includes('./app.js?v=138'),'index pins move to v133');
assert(sw.includes('nightball-v138-survival'),'SW cache renamed for v133');
assert(sw.includes('./game.js?v=138')&&sw.includes('./app.js?v=138'),'SW precaches the v133 scripts');
console.log('PASS: full-count 2-2 starts (walk/strikeout/foul), no-breaking on CPU plan + user throws + UI gate, metal-bat paired carry probe, two-out halves, scope gates, OFF identical, restore, combined game completion, app wiring + v133 pins.');
