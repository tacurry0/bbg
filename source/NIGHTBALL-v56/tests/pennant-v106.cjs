// v106 pennant features: farm (二軍) layer, free-agent market, All-Star game.
const assert=require('node:assert/strict');
global.window=global;
for(const file of ['ratings-data','players','pennant'])require('../dist/'+file+'.js');

function completeSeason(league){
 let guard=0;
 while(!league.completed&&guard++<200){league.completeRound({homeScore:2,awayScore:1});if(!league.completed)assert(league.next(),'advance round');}
 assert(league.completed,'season completed');
}
function runDraft(league){
 assert(league.beginOffseason());
 let guard=0;
 while(!league.draftDone&&guard++<200){
  if(league.draftCpuPick())continue;
  const d=league.offseason,taken=new Set(d.picks.map(k=>k.playerId));
  const p=d.pool.find(x=>!taken.has(x.id));
  assert(p&&league.draftUserPick(p.id),'user draft pick');
 }
 assert(league.draftDone,'draft done');
}

// ---------- farm ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 const roster=league.clubRoster('owls');
 const star=roster.batters.find(p=>p.id===roster.startingOrder[0]);
 assert(league.setFarm(star.id,true));
 assert(league.farmRoster('owls').some(p=>p.id===star.id));
 const fixture=league.schedule[0].find(f=>[f.home,f.away].includes('owls'));
 const sim=league.simulate(fixture);
 assert(!Object.keys(sim.stats).some(k=>k.endsWith('/'+star.id)),'farm player sits out sims');
 assert(league.setFarm(star.id,false));
 const fixture2=league.schedule[1].find(f=>[f.home,f.away].includes('owls'));
 const sim2=league.simulate(fixture2);
 assert(Object.keys(sim2.stats).some(k=>k.endsWith('/'+star.id)),'promoted player is back in sims');
 // growth: 4 development cycles -> +1 rating bonus
 const young=roster.batters.at(-1);
 league.setFarm(young.id,true);
 for(let i=0;i<4;i++)league.farmDevelop();
 assert.equal(league.farmProgress[young.id].bonus,1);
 const mod=league.ratingMods[young.id];
 assert((mod.contact||0)+(mod.power||0)>=1,'farm growth applied to ratings');
 // rehab: an injured farm player returns sooner
 league.injuries[young.id]={clubId:'owls',name:young.name,fromRound:league.round,returnRound:league.round+5};
 const before=league.injuries[young.id].returnRound;
 league.farmDevelop();
 assert(league.injuries[young.id].returnRound<before,'rehab shortened the injury');
 // CPU clubs auto-stock their farms
 assert(Object.keys(league.farmMoves).some(id=>league.farmMoves[id]!=='owls'),'CPU farm assignments exist');
}

// ---------- all-star ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 assert(!league.allstarDue,'not due in round 0');
 league.round=Math.floor(league.schedule.length/2);
 assert(league.allstarDue,'due at the midpoint');
 const {home,away}=league.allstarClubs();
 for(const club of [home,away]){
  assert(club.batters.length>=9,club.id+' has a lineup');
  assert(club.pitchers.length>=3,club.id+' has pitchers');
  assert.equal(club.startingOrder.length,9);
 }
 const ids=[...home.batters,...away.batters].map(p=>p.id);
 assert.equal(new Set(ids).size,ids.length,'no player on both all-star teams');
 const sim=league.simAllstar();
 assert(sim.homeScore!==sim.awayScore,'all-star sim has a winner');
 assert(league.completeAllstar());
 assert(!league.allstarDue&&league.allstarPlayed);
 assert(!league.completeAllstar(),'cannot complete twice');
}

// ---------- free-agent market ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 completeSeason(league);
 runDraft(league);
 assert(league.ensureFaMarket());
 assert(league.faActive);
 const fa=league.offseason.fa;
 assert(fa.pool.length>=league.clubs.length,'FA pool stocked');
 assert.equal(fa.points.owls,100);
 const target=fa.pool[0],cost=league.faCost(target);
 assert(league.faSign(target.id));
 assert.equal(fa.points.owls,100-cost,'signing points deducted');
 assert(!league.faSign(target.id),'cannot sign the same player twice');
 assert(!league.faSign('no-such-player'));
 const rosterIds=new Set([...league.clubRoster('owls').batters,...league.clubRoster('owls').pitchers].map(p=>p.id));
 assert(rosterIds.has(target.id),'signed player joins the roster');
 assert(league.faFinish());
 assert(league.faDone);
 assert(fa.signed.some(s=>s.clubId!=='owls'),'CPU clubs signed free agents');
 assert(league.startNextSeason());
 assert.equal(league.season,2);
 assert.equal(league.allstarPlayed,false,'all-star flag resets per season');
}
{ // startNextSeason auto-resolves an untouched market (back-compat path)
 const league=new NightPennant('owls',1);league.managed=true;
 completeSeason(league);
 runDraft(league);
 assert(league.startNextSeason());
 assert.equal(league.season,2);
}

// ---------- restore round-trip keeps the new layers ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 const roster=league.clubRoster('owls');
 league.setFarm(roster.batters.at(-1).id,true);
 const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
 assert(restored,'restore ok');
 assert.equal(restored.farmRoster('owls').length,1);
 assert.equal(restored.faDone,false);
 assert.equal(restored.allstarPlayed,false);
}

console.log('pennant-v106: all assertions passed');
