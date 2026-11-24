// v128 regression: pennant live-play matches never got ABS challenges.
//
// Root cause (code-confirmed): app.js activateGame() initialized the ABS
// budgets (absRemaining / absCpuRemaining) only for career, career-world
// and plain versus matches. A pennant live game (mode 'pennant') was not
// in that list, so game.js take() saw absRemaining === undefined and
// committed the umpire's call directly — the ABS window never opened and
// the #abs-challenge button (driven by absCanChallenge) never appeared.
// Play-call challenges already included pennant and are untouched.
// No comment or spec in the codebase said pennant excluded ABS on purpose
// (the play-challenge line right below already includes pennant), so this
// was a bug, not a design rule.
//
// Fix: activateGame()'s ABS condition gains game.mode==='pennant', with
// the same budget (2 per side) and the same exclusions as versus matches
// (umpire mode still excluded). Pennant's shortened format (1 inning,
// 2 outs, bases loaded) gets exactly the versus treatment — no special
// budget. Pennant simulation games never construct a NightGame at all
// (NightPennant.simulate is pure score math), so they are unaffected.
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

// ---------- app-level fix (the actual change) ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const start=app.indexOf('function activateGame(){');
assert(start>=0,'activateGame exists');
const activate=app.slice(start,start+900);
const absInit=activate.indexOf('game.absRemaining??=2');
assert(absInit>0,'activateGame initializes the ABS budget');
const absCondition=activate.slice(0,absInit);
assert(absCondition.includes("game.mode==='pennant'"),'pennant live games are in the ABS initialization condition');
assert(absCondition.includes('!game.umpireMode'),'umpire mode stays excluded from ABS');
assert(absCondition.includes("game.mode==='match'"),'versus matches keep ABS');
assert(activate.includes('game.absCpuRemaining??=2'),'CPU-side ABS budget is initialized too');
// Play-call challenges already covered pennant before v128; keep them pinned.
assert(activate.includes("game.mode==='pennant'||game.mode==='match'")||activate.includes('game.playChallenges??=2'),'play challenges remain initialized in activateGame');

// ---------- engine behavior on a pennant game ----------
// Same disadvantaged-call setup as tests/abs.cjs: full count, pitch just
// outside the zone, umpire calls it a ball-side miss for the batter.
function pennantCalledPitch(init){
 const g=new NightGame('pennant','standard',()=>{});
 g.half='bottom';g.inning=1;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 if(init){g.absRemaining=2;g.absCpuRemaining=0;} // exactly what activateGame now does
 g.createPitch(NightGame.TYPES[0],{x:1.08,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;const draws=[0,.99,0];
 try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 return g;
}

// Without initialization (pre-v128 pennant state) no ABS window opens.
const uninitialized=pennantCalledPitch(false);
assert.equal(uninitialized.absRemaining,undefined);
assert.notEqual(uninitialized.phase,'abs-call','without a budget the call is committed directly (the bug)');
assert(!uninitialized.absCanChallenge,'ABS button would stay hidden without a budget');

// With initialization the window opens, the count is held, and the user
// can challenge — in pennant's own shortened format (2 outs, loaded).
const g=pennantCalledPitch(true);
assert.equal(g.phase,'abs-call','disadvantaged call opens the ABS window in pennant');
assert.equal(g.absCall.strike,false,'the pitch was truly outside the zone');
assert.equal(g.absCall.umpireStrike,true,'the umpire wrongly called it a strike');
assert.equal(g.balls,3);assert.equal(g.strikes,2);assert.equal(g.outs,2);
assert(g.absCanChallenge,'ABS challenge button condition is met');
assert(g.requestAbsChallenge(),'challenge executes');
assert.equal(g.phase,'abs-review');
assert(!g.requestAbsChallenge(),'a second challenge in the same window is rejected');
g.phaseTime=NightGame.ABS_TIMING.reviewEnd-10;g.update(20);
assert.equal(g.batterStats().bb,1,'overturned call becomes the walk');
assert.equal(g.absRemaining,2,'an overturned call keeps the challenge budget');

// Snapshot/restore (pennant checkpoint resume goes through activateGame's
// ??=, so a restored budget must survive untouched).
const restored=NightGame.restore(JSON.parse(JSON.stringify(pennantCalledPitch(true).snapshot())),()=>{});
assert.equal(restored.mode,'pennant');
assert.equal(restored.absRemaining,2);assert.equal(restored.absCpuRemaining,0);

// ---------- simulation games are unchanged ----------
// NightPennant.simulate builds no NightGame and touches no ABS state.
const league=new NightPennant('comets');
const sim=league.simulate(league.fixture);
assert(Number.isInteger(sim.homeScore)&&Number.isInteger(sim.awayScore),'simulation still produces a score');
assert(!('absRemaining' in sim)&&!('absCpuRemaining' in sim),'simulation result carries no ABS state');
const freshPennant=new NightGame('pennant','standard',()=>{});
assert.equal(freshPennant.absRemaining,undefined,'a bare pennant game (never activated, as in simulation-side use) is unchanged — initialization lives in activateGame only');

console.log('PASS: pennant live games initialize ABS budgets in activateGame, the ABS window opens and a challenge executes in the shortened pennant format, budgets survive restore, and simulation games are untouched.');
