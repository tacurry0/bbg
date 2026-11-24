// v140: all-leagues conquest challenge (checker item
// "all-leagues-conquest"). The user picks one home club and beats the
// other 29 clubs (CPBL + NPB + KBO) in any order; a win stamps the
// opponent as conquered, a loss or draw stamps nothing and progress is
// never lost, progress is stored per home club in localStorage
// ('nightball.conquest'), and beating all 29 completes the conquest.
// Covered here: win stamps + persists, loss/draw stamp nothing and
// keep earlier stamps, per-club progress separation, league-split
// summaries (NPB 8/14 style), full completion, interrupt/resume
// round-trip and corruption safety, other modes' saves being
// untouched, a regular match starting with the chosen clubs, and the
// app wiring + v140 pins.
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
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','game.js','conquest.js'])
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});
const C=global.NightConquest;
assert(C,'NightConquest module loads');
assert.equal(C.KEY,'nightball.conquest');
function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_map:m};}
const clubs=NightTeams.matchTeams;
assert.equal(clubs.length,30,'the pool is all 30 clubs');
const ALL=clubs.map(c=>c.id);

// ---------- league split of the full pool ----------
{
 const sum=C.summarize(C.createProgress('owls'),clubs);
 assert.equal(sum.total,29,'the home club itself is excluded: 29 opponents');
 assert.equal(sum.done,0);
 assert.deepEqual(sum.byLeague.map(r=>[r.id,r.total]),[['cpbl',5],['npb',14],['kbo',10]],
  'opponents split CPBL 5 (home club excluded) / NPB 14 / KBO 10');
 const sumNpb=C.summarize(C.createProgress('npb-g'),clubs);
 assert.deepEqual(sumNpb.byLeague.map(r=>r.total),[6,13,10],'an NPB home club sees CPBL 6 / NPB 13 / KBO 10');
 assert.equal(C.leagueOf(clubs.find(c=>c.id==='owls')),'cpbl');
 assert.equal(C.leagueOf(clubs.find(c=>c.id==='npb-g')),'npb');
 assert.equal(C.leagueOf(clubs.find(c=>c.id==='kbo-ht')),'kbo');
}

// ---------- a win stamps the opponent and persists ----------
{
 const s=memStorage();
 let p=C.createProgress('owls');
 const r=C.recordResult(p,{opponentId:'npb-g',won:true},clubs,s);
 assert.equal(r.conqueredNow,true,'the win conquers the opponent');
 assert.equal(r.done,1);
 assert.equal(r.byLeague.find(x=>x.id==='npb').done,1,'the league split counts the stamp (NPB 1/14)');
 const saved=C.loadProgress('owls',s);
 assert.deepEqual(saved.defeated,['npb-g'],'the stamp is persisted');
 assert.equal(saved.attempts['npb-g'],1,'the attempt is counted');
 // A second win over the same club does not double-count.
 const r2=C.recordResult(saved,{opponentId:'npb-g',won:true},clubs,s);
 assert.equal(r2.conqueredNow,false,'re-beating a conquered club stamps nothing new');
 assert.equal(r2.done,1);
 assert.equal(C.loadProgress('owls',s).attempts['npb-g'],2,'but the retry attempt is counted');
}

// ---------- a loss or draw stamps nothing and keeps progress ----------
{
 const s=memStorage();
 let p=C.createProgress('owls');
 C.recordResult(p,{opponentId:'npb-g',won:true},clubs,s);
 p=C.loadProgress('owls',s);
 const loss=C.recordResult(p,{opponentId:'kbo-ht',won:false},clubs,s);
 assert.equal(loss.conqueredNow,false,'a loss conquers nothing');
 assert.deepEqual(loss.state.defeated,['npb-g'],'earlier stamps survive a loss');
 const draw=C.recordResult(loss.state,{opponentId:'kbo-ht',won:false,draw:true},clubs,s);
 assert.equal(draw.conqueredNow,false,'a draw conquers nothing');
 assert.deepEqual(C.loadProgress('owls',s).defeated,['npb-g'],'progress is intact after loss and draw');
 // The same opponent can then be beaten on a retry.
 const retry=C.recordResult(C.loadProgress('owls',s),{opponentId:'kbo-ht',won:true},clubs,s);
 assert.equal(retry.conqueredNow,true,'a retry win conquers the opponent');
 assert.equal(retry.done,2);
 // The home club can never be its own opponent.
 assert.equal(C.recordResult(retry.state,{opponentId:'owls',won:true},clubs,s),null,'self-match is rejected');
}

// ---------- progress is separated per home club ----------
{
 const s=memStorage();
 C.recordResult(C.createProgress('owls'),{opponentId:'npb-g',won:true},clubs,s);
 C.recordResult(C.createProgress('npb-g'),{opponentId:'kbo-ht',won:true},clubs,s);
 C.recordResult(C.loadProgress('npb-g',s),{opponentId:'kbo-ss',won:true},clubs,s);
 assert.deepEqual(C.loadProgress('owls',s).defeated,['npb-g'],'the owls campaign is unchanged by the giants campaign');
 assert.deepEqual(C.loadProgress('npb-g',s).defeated,['kbo-ht','kbo-ss'],'the giants campaign holds its own stamps');
 assert.equal(C.loadProgress('kbo-ht',s),null,'a club with no campaign has no progress');
 // Clearing one club leaves the other untouched.
 C.clearProgress('owls',s);
 assert.equal(C.loadProgress('owls',s),null);
 assert.deepEqual(C.loadProgress('npb-g',s).defeated,['kbo-ht','kbo-ss'],'clearing is local to one club');
}

// ---------- interrupt -> resume restores progress exactly ----------
{
 const s=memStorage();
 let p=C.createProgress('kbo-ht');
 for(const id of ['owls','npb-g','npb-t'])p=C.recordResult(p,{opponentId:id,won:true},clubs,s).state;
 const resumed=C.loadProgress('kbo-ht',s);
 assert.deepEqual(resumed.defeated,['owls','npb-g','npb-t'],'a fresh load restores every stamp');
 assert.deepEqual(resumed,p,'the restored state matches the in-memory state');
 const sum=C.summarize(resumed,clubs);
 assert.equal(sum.done,3);assert.equal(sum.remaining,26);
}

// ---------- beating all 29 completes the conquest, exactly once ----------
{
 const s=memStorage();
 let p=C.createProgress('owls');
 let last=null,completedFlags=0;
 for(const id of ALL.filter(id=>id!=='owls')){
  last=C.recordResult(p,{opponentId:id,won:true},clubs,s,'2026-11-24T00:00:00.000Z');
  p=last.state;
  if(last.completedNow)completedFlags++;
 }
 assert.equal(last.done,29);
 assert.equal(last.complete,true,'all 29 beaten = conquest complete');
 assert.equal(last.completedNow,true,'the final win reports the completion');
 assert.equal(completedFlags,1,'the completion fires exactly once');
 assert.equal(C.isComplete(C.loadProgress('owls',s),clubs),true,'the completed state persists');
 assert.equal(C.loadProgress('owls',s).completedAt,'2026-11-24T00:00:00.000Z','the completion time is stamped');
 const after=C.recordResult(C.loadProgress('owls',s),{opponentId:'npb-g',won:true},clubs,s);
 assert.equal(after.completedNow,false,'completion does not re-fire after completion');
 // One short of the full set is not complete.
 let q=C.createProgress('foxes');
 for(const id of ALL.filter(id=>id!=='foxes').slice(0,28))q=C.recordResult(q,{opponentId:id,won:true},clubs,s).state;
 assert.equal(C.isComplete(q,clubs),false,'28 of 29 is not a conquest');
}

// ---------- corruption safety ----------
{
 const s=memStorage();
 s.setItem(C.KEY,'{not json');
 assert.deepEqual(C.loadAll(s),{},'corrupt JSON loads as no progress');
 s.setItem(C.KEY,JSON.stringify({owls:{userTeamId:'owls',defeated:['npb-g','owls',42,'npb-g'],attempts:{'npb-g':2,bad:-1}},bad:{userTeamId:'other'}}));
 const all=C.loadAll(s);
 assert.deepEqual(all.owls.defeated,['npb-g'],'stamps are de-duplicated, the home club and non-strings are dropped');
 assert.deepEqual(all.owls.attempts,{'npb-g':2},'invalid attempt counts are dropped');
 assert.equal(all.bad,undefined,'a progress entry whose key and club disagree is dropped');
}

// ---------- other modes' saves are never touched ----------
{
 store.clear();
 global.localStorage.setItem('nightball.pennant','PENNANT-SAVE');
 global.localStorage.setItem('nightball.survival','SURVIVAL-SAVE');
 global.localStorage.setItem('nightball.survivalBest','7');
 let p=C.createProgress('owls');
 C.recordResult(p,{opponentId:'npb-g',won:true},clubs);
 C.recordResult(C.loadProgress('owls'),{opponentId:'kbo-ht',won:false},clubs);
 C.clearProgress('owls');
 assert.equal(global.localStorage.getItem('nightball.pennant'),'PENNANT-SAVE','pennant save untouched');
 assert.equal(global.localStorage.getItem('nightball.survival'),'SURVIVAL-SAVE','survival save untouched');
 assert.equal(global.localStorage.getItem('nightball.survivalBest'),'7','survival best untouched');
 assert.deepEqual([...store.keys()].sort(),['nightball.pennant','nightball.survival','nightball.survivalBest'],
  'conquest writes only its own key (removed again by the clear)');
}

// ---------- a regular match starts with the chosen clubs ----------
{
 const g=new NightGame('match','standard',()=>{},{clubs:{home:NightTeams.get('owls'),away:NightTeams.get('npb-g')},homeTeamId:'owls',awayTeamId:'npb-g',userHome:true});
 assert.equal(g.teams.home.id,'owls');
 assert.equal(g.teams.away.id,'npb-g');
 assert.equal(g.conquest,undefined,'a plain match carries no conquest context until the app attaches one');
}

// ---------- app wiring + v140 pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(index.includes('data-mode="conquest"'),'home menu offers the conquest mode');
assert(index.includes('./conquest.js?v=1'),'index loads the conquest module');
assert(app.includes('conquestSetup'),'app has the conquest list screen');
assert(app.includes('finishConquestResult'),'app has the conquest result flow');
assert(app.includes('NightConquest.recordResult'),'results are recorded through the module');
assert(app.includes('NightConquest.loadProgress'),'the list screen reads per-club progress');
assert(app.includes('全球団制覇達成'),'the completion celebration is in the UI');
assert(app.includes('game.conquest=conquestCtx'),'the match carries its conquest context');
assert(index.includes('./game.js?v=155')&&index.includes('./app.js?v=155'),'index pins move to v140');
assert(sw.includes('nightball-v155-hero-interview'),'SW cache renamed for v140');
assert(sw.includes('./game.js?v=155')&&sw.includes('./app.js?v=155'),'SW precaches the v140 scripts');
assert(sw.includes('./conquest.js?v=1'),'SW precaches the conquest module');
console.log('conquest-v140: all assertions passed');
