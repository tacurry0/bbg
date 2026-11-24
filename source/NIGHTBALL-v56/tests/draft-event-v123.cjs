// v123: the pennant draft runs as a step-by-step conference. CPU picks
// advance one at a time (draftCpuPick), stop at the user's turn, and the
// modal announces each pick as it lands instead of silently resolving
// every CPU pick when it opens (app.js source-guarded).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});

const league=new NightPennant('comets');
for(let r=0;r<20;r++){
 const sim=league.simulate(league.fixture);
 league.completeRound({...sim,inning:sim.innings});
 if(r<19)league.next();
}
// The draft order is the final standings reversed (worst club picks
// first). Capture the expected order before the offseason begins so the
// assertions below verify that spec directly instead of assuming where
// the user's club happened to finish: when the user finishes last, the
// user picks first and zero CPU clubs pick before them, which used to
// flake the old 'at least one CPU club picked before the user' check.
const expectedOrder=league.standings().slice().reverse().map(r=>r.id);
assert(league.beginOffseason(),'offseason begins');
const d=league.offseason,total=d.order.length*d.rounds;
assert.deepEqual(d.order,expectedOrder,'draft order is the final standings reversed');
assert.equal(d.picks.length,0,'no picks are made before the conference starts');
const userSlot=d.order.indexOf(league.clubId);
assert(userSlot>=0,'the user club is in the draft order');

// Step one pick at a time until the user's turn arrives. However many
// CPU picks that takes depends on the standings: exactly userSlot of
// them, each made by the club whose slot in the order it was.
let steps=0;
while(d.order[d.pickIndex%d.order.length]!==league.clubId&&steps<total){
 const before=d.pickIndex;
 assert.equal(league.draftCpuPick(),true,'a CPU pick advances');
 assert.equal(d.pickIndex,before+1,'exactly one pick per step');
 assert.equal(d.picks.length,before+1);
 assert.equal(d.picks.at(-1).clubId,d.order[before%d.order.length],'each pick is made by the club whose turn it was');
 steps++;
}
assert.equal(steps,userSlot,'CPU picks before the user turn match the user slot in the order');
// On the user's turn the CPU stepper refuses and the user must choose.
assert.equal(league.draftCpuPick(),false,'CPU picks stop at the user turn');
const taken=new Set(d.picks.map(k=>k.playerId));
const choice=d.pool.find(p=>!taken.has(p.id));
assert.equal(league.draftUserPick('not-a-player'),false,'unknown players cannot be picked');
assert.equal(league.draftUserPick(choice.id),true,'the user pick lands');
assert.equal(d.picks.at(-1).clubId,league.clubId);
assert.equal(d.picks.at(-1).playerId,choice.id,'the latest pick is the announced one');
// runCpuPicks (the skip control) still stops at the next user turn.
league.runCpuPicks();
assert(d.order[d.pickIndex%d.order.length]===league.clubId||league.draftDone,'skip stops at the user turn or the end');
// Finish the draft through the same step/user loop the UI drives.
while(!league.draftDone){
 if(league.draftCpuPick())continue;
 const t=new Set(d.picks.map(k=>k.playerId));
 const p=d.pool.find(x=>!t.has(x.id));
 assert(p&&league.draftUserPick(p.id),'user picks advance the draft');
}
assert.equal(d.picks.length,total,'every slot was announced exactly once');
d.picks.forEach((pick,i)=>assert.equal(pick.clubId,d.order[i%d.order.length],'every pick in both rounds follows the draft order'));

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const draftFn=app.slice(app.indexOf('function draftModal()'),app.indexOf('function awardsModal()'));
assert(!draftFn.includes('runCpuPicks()'),'the modal no longer auto-resolves CPU picks on open');
assert(draftFn.includes('draft-announce'),'each pick gets an announcement banner');
assert(draftFn.includes('を指名！'),'the announcement names the pick');
assert(draftFn.includes('data-action="draft-step"'),'a step control exists');
assert(draftFn.includes('data-action="draft-skip"'),'a skip-to-my-turn control exists');
assert(app.includes("case'draft-step':if(league?.draftCpuPick())"),'step action is wired');
assert(app.includes("case'draft-skip'"),'skip action is wired');
const css=fs.readFileSync(__dirname+'/../dist/style.css','utf8');
assert(css.includes('.draft-announce'),'announcement styles exist');

console.log('draft-event-v123: all assertions passed');
