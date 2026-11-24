// v138: survival ladder mode (checker item "survival-ladder").
// An endless win-streak mode on the regular versus engine: each win
// advances the streak and the opponent's stage boost rises, a loss or
// a draw (draw = defeat, documented in the UI) ends the run, fatigue
// from each game carries into the next after a small recovery, the
// run persists in localStorage ('nightball.survival') for
// interrupt/resume, and the best streak persists separately
// ('nightball.survivalBest'). Covered here: the stage table, the
// fatigue model in numbers, win/loss/draw recording, best-streak
// persistence, save/load round-trip and corruption safety, the
// engine gates (no other mode, no online/umpire), the in-engine
// numeric effects (opponent condition rises with the boost, a
// fatigued user's condition and starting stamina drop), a normal
// versus match being completely untouched, and app wiring + pins.
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
for(const file of ['ratings-data.js','players.js','pennant.js','survival.js','game.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const SV=global.NightSurvival;
assert(SV,'NightSurvival module loads');
assert.equal(SV.KEY,'nightball.survival');
assert.equal(SV.BEST_KEY,'nightball.survivalBest');
function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_map:m};}
const POOL=['owls','foxes','bears','lions'];
const zeroRng=()=>0;

// ---------- stage table: weak start, positive later, capped ----------
assert.equal(SV.boostForWins(0),-8,'stage 1 opponent is weakened');
assert.equal(SV.boostForWins(1),-5);
assert.equal(SV.boostForWins(3),0,'fourth game is even');
assert.equal(SV.boostForWins(4),3,'boost turns positive at 5 wins... (wins=4 is the 5th game)');
assert(SV.boostForWins(8)>SV.boostForWins(4),'later stages are stronger');
assert.equal(SV.boostForWins(9),12,'boost caps at +12');
assert.equal(SV.boostForWins(50),12,'boost stays capped');
assert.equal(SV.stageForWins(0).stage,1);
assert(SV.stageForWins(8).stage>SV.stageForWins(0).stage,'stage number rises with wins');

// ---------- fatigue model in numbers ----------
assert.equal(SV.pitcherFatigueAdd(90),30,'a 90-pitch start adds 30 fatigue');
assert.equal(SV.pitcherFatigueAdd(15),5,'a 15-pitch relief adds 5');
assert.equal(SV.pitcherFatigueAdd(0),0);
assert.equal(SV.batterFatigueAdd(4),4,'four plate appearances add 4');
assert.equal(SV.conditionPenalty(true,20),2,'20 pitcher fatigue = -2 condition levels');
assert.equal(SV.conditionPenalty(true,9),0,'single-digit pitcher fatigue has no condition penalty yet');
assert.equal(SV.conditionPenalty(false,10),2,'10 batter fatigue = -2 condition levels');
assert.equal(SV.conditionPenalty(false,99),3,'condition penalty caps at 3');
assert.equal(SV.staminaLoss(25),25,'starting stamina drops by the fatigue points');
assert.equal(SV.staminaLoss(99),40,'stamina loss caps at 40 so a run can never hard-lock');

// ---------- run lifecycle: win advances + strengthens, fatigue carries ----------
{
 const s=memStorage();
 const run=SV.createRun('owls',POOL,zeroRng);
 assert(run,'run created');
 assert.equal(run.wins,0);assert.equal(run.status,'active');
 assert.notEqual(run.opponentId,'owls','opponent is never the user club');
 assert.equal(SV.saveRun(run,s),true);
 const starterId='p-starter',batterId='b-one';
 const r1=SV.recordResult(run,{won:true,usage:{pitchers:{[starterId]:90},batters:{[batterId]:4}},poolIds:POOL,rng:zeroRng},s);
 assert.equal(r1.ended,false,'a win keeps the run alive');
 assert.equal(r1.state.wins,1,'the streak advances to 1');
 // Fatigue carried into the next game, numerically: 30 added - 10 recovery = 20.
 assert.equal(r1.state.fatiguePitchers[starterId],20,'pitcher fatigue carries over after recovery (30-10)');
 assert.equal(r1.state.fatigueBatters[batterId],2,'batter fatigue carries over after recovery (4-2)');
 assert.equal(SV.boostForWins(r1.state.wins),-5,'next opponent stage is set from the new streak');
 const saved=SV.loadRun(s);
 assert.equal(saved.wins,1,'the advanced run is persisted');
 assert.equal(saved.fatiguePitchers[starterId],20,'persisted fatigue matches');
 // Interrupt -> resume: a fresh load restores exactly the same state.
 const resumed=SV.loadRun(s);
 assert.deepEqual(resumed,r1.state,'interrupt/resume restores the run state');
 // Second win: fatigue keeps accumulating (20 + 30 - 10 = 40).
 const r2=SV.recordResult(resumed,{won:true,usage:{pitchers:{[starterId]:90},batters:{}},poolIds:POOL,rng:zeroRng},s);
 assert.equal(r2.state.wins,2);
 assert.equal(r2.state.fatiguePitchers[starterId],40,'fatigue accumulates across wins');
 // Loss ends the run, records the best, clears the stored run.
 const r3=SV.recordResult(r2.state,{won:false,usage:{pitchers:{},batters:{}},poolIds:POOL,rng:zeroRng},s);
 assert.equal(r3.ended,true,'a loss ends the run');
 assert.equal(r3.best,2,'best streak records the 2-win run');
 assert.equal(r3.bestUpdated,true);
 assert.equal(SV.loadBest(s),2,'best streak persists in its own key');
 assert.equal(SV.loadRun(s),null,'the ended run is cleared from storage');
 // A shorter later run does not lower the best.
 const run2=SV.createRun('owls',POOL,zeroRng);
 const r4=SV.recordResult(run2,{won:false,usage:{},poolIds:POOL,rng:zeroRng},s);
 assert.equal(r4.best,2,'a winless run does not lower the best');
 assert.equal(r4.bestUpdated,false);
 // A draw also ends the run (draw = defeat in this mode).
 const run3=SV.createRun('owls',POOL,zeroRng);
 SV.recordResult(run3,{won:true,usage:{},poolIds:POOL,rng:zeroRng},s);
 const run3b=SV.loadRun(s);
 const r5=SV.recordResult(run3b,{won:false,draw:true,usage:{},poolIds:POOL,rng:zeroRng},s);
 assert.equal(r5.ended,true,'a draw ends the run');
 assert.equal(r5.state.history.at(-1).draw,true,'the draw is recorded as a draw');
 // Corrupt storage reads as no run / zero best, never throws.
 s._map.set(SV.KEY,'{broken');
 assert.equal(SV.loadRun(s),null,'a corrupt run reads as null');
 s._map.set(SV.BEST_KEY,'junk');
 assert.equal(SV.loadBest(s),0,'a corrupt best reads as 0');
}

// ---------- engine gates: only regular versus matches ----------
const OPT={wins:2,fatiguePitchers:{},fatigueBatters:{}};
assert(new NightGame('match','standard',()=>{},{survival:OPT}).survival,'versus match accepts survival');
assert.equal(new NightGame('match','standard',()=>{},{}).survival,null,'no option means no survival');
assert.equal(new NightGame('pennant','standard',()=>{},{survival:OPT}).survival,null,'pennant never gets survival');
assert.equal(new NightGame('match','standard',()=>{},{survival:OPT,umpire:true}).survival,null,'umpire mode never gets survival');
assert.equal(new NightGame('match','standard',()=>{},{survival:OPT,remoteSide:'away'}).survival,null,'online (remote) games never get survival');
assert.equal(new NightGame('match','standard',()=>{},{survival:OPT,career:{fixtureId:'x'}}).survival,null,'career games never get survival');
assert.equal(new NightGame('match','standard',()=>{},{survival:OPT,timeAttack:{kind:'bat',seconds:90}}).survival,null,'survival never combines with time attack');
assert.equal(new NightGame('practice','standard',()=>{},{survival:OPT}).survival,null,'practice never gets survival');

// ---------- engine effects in numbers ----------
// Opponent condition rises with the stage boost, measured against a
// plain match with the same clubs (condition is seed-deterministic).
{
 const plain=new NightGame('match','standard',()=>{},{});
 const weak=new NightGame('match','standard',()=>{},{survival:{wins:0,fatiguePitchers:{},fatigueBatters:{}}});
 const strong=new NightGame('match','standard',()=>{},{survival:{wins:8,fatiguePitchers:{},fatigueBatters:{}}});
 const oppOf=g=>({...g.teams[g.opponentSide].batters[0],gameCondition:0});
 assert.equal(weak.survival.boost,-8);
 assert.equal(strong.survival.boost,11);
 assert.equal(weak.conditionFor(oppOf(weak)),plain.conditionFor(oppOf(plain))-3,'stage 1: opponent condition -3 levels (boost -8)');
 assert.equal(strong.conditionFor(oppOf(strong)),plain.conditionFor(oppOf(plain))+4,'late stage: opponent condition +4 levels (boost +11)');
 assert(strong.conditionFor(oppOf(strong))>weak.conditionFor(oppOf(weak)),'opponent condition strictly rises across stages');
 // The user's own players are unaffected by the boost itself.
 const userOf=g=>({...g.teams[g.userSide].batters[0],gameCondition:0});
 assert.equal(strong.conditionFor(userOf(strong)),plain.conditionFor(userOf(plain)),'user condition is untouched by the opponent boost');
}
// User fatigue: condition drops and the starting pitcher loses stamina.
{
 const plain=new NightGame('match','standard',()=>{},{});
 const userBatter={...plain.teams[plain.userSide].batters[0],gameCondition:0};
 const userStarter={...plain.teams[plain.userSide].pitchers[0],gameCondition:0};
 const tired=new NightGame('match','standard',()=>{},{survival:{wins:1,
  fatiguePitchers:{[userStarter.id]:25},fatigueBatters:{[userBatter.id]:10}}});
 assert.equal(tired.conditionFor({...tired.teams[tired.userSide].batters[0],gameCondition:0}),
  plain.conditionFor(userBatter)-2,'10 batter fatigue = -2 condition levels in engine');
 const tiredStarter={...tired.teams[tired.userSide].pitchers[0],gameCondition:0};
 assert.equal(tired.conditionFor(tiredStarter),plain.conditionFor(userStarter)-2,'25 pitcher fatigue = -2 condition levels in engine');
 assert.equal(tired.stamina,75,'a starter carrying 25 fatigue begins at 75 stamina (100-25)');
 assert.equal(plain.stamina,100,'a fresh match starts at full stamina');
 // The gameOption payload from a saved run feeds the engine directly.
 const s=memStorage();const run=SV.createRun('owls',POOL,zeroRng);SV.saveRun(run,s);
 const opt=SV.gameOption(SV.loadRun(s));
 const g=new NightGame('match','standard',()=>{},{survival:opt});
 assert(g.survival&&g.survival.wins===0,'gameOption round-trips into the engine');
}
// A normal versus match carries no survival state at all.
{
 const g=new NightGame('match','standard',()=>{},{});
 assert.equal(g.survival,null);
 assert.equal(g.stamina,100);
 const p=g.teams[g.opponentSide].batters[0];
 assert(g.conditionFor(p)>=-2&&g.conditionFor(p)<=2,'normal condition stays in the classic -2..2 band');
}

// ---------- app wiring + v139 pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(index.includes('data-mode="survival"'),'home menu offers the survival mode');
assert(index.includes('./survival.js?v=1'),'index loads the survival module');
assert(app.includes('survivalSetup'),'app has the survival setup screen');
assert(app.includes('finishSurvivalResult'),'app has the survival result flow');
assert(app.includes('NightSurvival.recordResult'),'results are recorded through the module');
assert(app.includes('NightSurvival.loadBest'),'the setup/result screens show the best streak');
assert(app.includes('引き分けは敗北扱い'),'the draw rule is stated in the UI');
assert(index.includes('./game.js?v=156')&&index.includes('./app.js?v=156'),'index pins move to v139');
assert(sw.includes('nightball-v156-record-room'),'SW cache renamed for v139');
assert(sw.includes('./game.js?v=156')&&sw.includes('./app.js?v=156'),'SW precaches the v139 scripts');
assert(sw.includes('./survival.js?v=1'),'SW precaches the survival module');
console.log('survival-ladder-v138: all assertions passed');
