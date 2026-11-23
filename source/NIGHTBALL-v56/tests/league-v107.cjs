// v107 custom-league (league-editor) coverage:
//  (a) definition validation: odd club counts and below-minimum counts are
//      rejected at creation time, as are duplicates, unknown clubs and
//      out-of-range games-per-opponent values,
//  (b) a custom league's generated schedule satisfies validSchedule with the
//      exact per-pair meeting count and total fixture count,
//  (c) a custom-league NightPennant sims a full season without exceptions,
//      survives JSON restore (re-registering its embedded definition),
//      completes its playoffs, drafts and rolls into season 2; a
//      playoffs-off league refuses startPlayoffs,
//  (d) the DH flag reaches match generation: in a simulated 9-inning game
//      the starting pitcher bats (PA > 0) only when dh:false,
//  (e) built-in CPBL/NPB/KBO pennants generate exactly as before.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','pennant','npb-data','npb-rosters','kbo-data','kbo-rosters','league-editor']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function memStorage(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};}
const CPBL4=['owls','foxes','falcons','mariners'];

// ---------- (a) validation ----------
{
 const base={id:'custom-test',name:'テストリーグ',clubIds:CPBL4,gamesPerOpponent:3,dh:true,playoffs:true};
 const ok=NightPennant.validateCustomLeague(base);
 assert.equal(ok.ok,true,'a valid 4-club definition passes');
 assert.deepEqual(ok.def.clubIds,CPBL4);
 assert.equal(ok.def.dh,true);assert.equal(ok.def.playoffs,true);
 const odd=NightPennant.validateCustomLeague({...base,clubIds:[...CPBL4,'wolves']});
 assert.equal(odd.ok,false,'five clubs are rejected');
 assert(odd.errors.some(e=>e.includes('偶数')),'the odd-count error explains the even-count rule');
 const small=NightPennant.validateCustomLeague({...base,clubIds:['owls','foxes']});
 assert.equal(small.ok,false,'two clubs are below the minimum');
 assert(small.errors.some(e=>e.includes('4')),'the minimum-count error names the minimum');
 assert.equal(NightPennant.validateCustomLeague({...base,clubIds:['owls','owls','foxes','falcons']}).ok,false,'duplicate clubs are rejected');
 assert.equal(NightPennant.validateCustomLeague({...base,clubIds:['owls','foxes','falcons','nope']}).ok,false,'unknown clubs are rejected');
 assert.equal(NightPennant.validateCustomLeague({...base,gamesPerOpponent:0}).ok,false,'0 games per opponent is rejected');
 assert.equal(NightPennant.validateCustomLeague({...base,gamesPerOpponent:11}).ok,false,'11 games per opponent is rejected');
 assert.equal(NightPennant.validateCustomLeague({...base,name:'  '}).ok,false,'a blank name is rejected');
 assert.throws(()=>new NightPennant('owls',3,{customLeague:{...base,clubIds:[...CPBL4,'wolves']}}),'the constructor refuses an odd-club definition');
 assert.throws(()=>new NightPennant('wolves',3,{customLeague:base}),'the controlled club must belong to the custom league');
 // Persistence layer: invalid definitions never reach storage.
 const store=memStorage();
 assert.equal(NightLeague.upsert({...base,id:'custom-store-odd',clubIds:[...CPBL4,'wolves']},store),null,'upsert rejects an odd-club definition');
 assert.equal(NightLeague.loadDefs(store).length,0,'nothing was stored for the invalid definition');
 const saved=NightLeague.upsert({...base,id:'custom-store'},store);
 assert.equal(saved.id,'custom-store');
 assert.equal(NightLeague.loadDefs(store).length,1,'a valid definition is stored');
 NightLeague.register(store);
 assert.deepEqual(NightPennant.clubsFor('custom-store').map(c=>c.id),CPBL4,'a stored definition resolves through clubsFor');
 NightLeague.remove('custom-store',store);
 assert.equal(NightLeague.loadDefs(store).length,0,'remove deletes the stored definition');
 assert.equal(NightPennant.customLeague('custom-store'),null,'remove also unregisters the definition');
 console.log('PASS (a): validation rejects odd/below-minimum/duplicate/unknown/out-of-range definitions; storage round-trips.');
}

// ---------- (b) schedule ----------
{
 const def={id:'custom-sched',name:'混成リーグ',clubIds:['owls','npb-g','npb-t','kbo-lg','kbo-ss','wolves'],gamesPerOpponent:3,dh:true,playoffs:true};
 const p=new NightPennant('npb-g',3,{customLeague:def});
 assert.equal(p.leagueId,'custom-sched');
 assert.deepEqual(p.clubs.map(c=>c.id),def.clubIds,'the pennant clubs are the definition clubs in order');
 assert.equal(NightPennant.validSchedule(p.schedule,p.clubs,3),true,'the generated schedule satisfies validSchedule');
 assert.equal(p.schedule.length,15,'rounds = gamesPerOpponent * (clubs - 1)');
 assert.equal(p.totalGames,15,'each club plays 3 * 5 = 15 games');
 const fixtures=p.schedule.flat();
 assert.equal(fixtures.length,45,'total fixtures = 3 * 6 * 5 / 2');
 const pairs=new Map();
 for(const f of fixtures){const k=[f.home,f.away].sort().join('/');pairs.set(k,(pairs.get(k)||0)+1);}
 assert.equal(pairs.size,15,'every pair of clubs meets');
 assert([...pairs.values()].every(n=>n===3),'every pair meets exactly 3 times');
 assert.equal(NightLeague.totalGamesPerClub(def),15);
 assert.equal(NightLeague.totalFixtures(def),45);
 console.log('PASS (b): mixed-pool 6-club schedule is valid, balanced and exactly sized.');
}

// ---------- (c) full season, restore, playoffs, next season ----------
{
 const def={id:'custom-season',name:'シーズンリーグ',clubIds:CPBL4,gamesPerOpponent:2,dh:true,playoffs:true};
 let p=new NightPennant('owls',2,{customLeague:def});
 let guard=0;
 while(!p.completed){
  const sim=p.simulate(p.fixture);
  assert.notEqual(sim.homeScore,sim.awayScore);
  assert.equal(p.completeRound({...sim,inning:sim.innings}),true);
  if(p.round===2&&!p.completed){
   p=NightPennant.restore(JSON.parse(JSON.stringify(p)));
   assert(p,'custom season restores mid-season');
   assert.equal(p.leagueId,'custom-season');
   assert.equal(p.dh,true);assert.equal(p.playoffs,true);
   assert.deepEqual(p.customLeague.clubIds,CPBL4,'the restored season carries its league definition');
  }
  if(!p.completed)assert.equal(p.next(),true);
  if(++guard>50)throw Error('season did not finish');
 }
 const table=p.standings();
 assert(table.every(r=>r.played===6&&r.wins+r.losses===6),'every club played its 6 games');
 assert.equal(table.reduce((n,r)=>n+r.wins,0),12,'wins across the table equal the 12 fixtures');
 // Restore re-registers the embedded definition even after unregistering.
 NightPennant.unregisterCustomLeague('custom-season');
 const revived=NightPennant.restore(JSON.parse(JSON.stringify(p)));
 assert(revived&&revived.leagueId==='custom-season','a save revives its league from the embedded definition');
 p=revived;
 // Playoffs (existing top-3 format) run to a champion.
 assert.equal(p.startPlayoffs(),true);
 guard=0;
 while(!p.postseasonCompleted){
  if(p.activeRoundDone)assert.equal(p.nextPlayoff(),true);
  else if(p.userInActiveFixture){const s=p.simulate(p.activeFixture);assert.equal(p.completePlayoffGame({...s,inning:s.innings}),true);}
  else assert.equal(p.simulatePlayoffGame(),true);
  if(++guard>50)throw Error('playoffs did not finish');
 }
 assert(def.clubIds.includes(p.postseason.champion),'the champion is a league club');
 // Offseason draft and the roll into season 2.
 assert.equal(p.beginOffseason(),true);
 guard=0;
 while(!p.draftDone){
  const before=p.offseason.pickIndex;
  const next=p.offseason.pool.find(x=>!p.offseason.picks.some(k=>k.playerId===x.id));
  if(!p.draftUserPick(next.id))p.runCpuPicks();
  assert(p.draftDone||p.offseason.pickIndex>before,'the draft keeps advancing');
  if(++guard>50)throw Error('draft did not finish');
 }
 assert.equal(p.startNextSeason(),true);
 assert.equal(p.season,2);
 assert.equal(NightPennant.validSchedule(p.schedule,p.clubs,2),true,'season 2 regenerates a valid schedule');
 assert.equal(p.round,0);
 // Playoffs-off league: the season simply ends at the standings.
 const noDef={id:'custom-nopo',name:'プレーオフなし',clubIds:CPBL4,gamesPerOpponent:1,dh:true,playoffs:false};
 let q=new NightPennant('foxes',1,{customLeague:noDef});
 guard=0;
 while(!q.completed){q.completeRound(q.simulate(q.fixture));if(!q.completed)q.next();if(++guard>20)throw Error('short season did not finish');}
 assert.equal(q.startPlayoffs(),false,'a playoffs-off league refuses startPlayoffs');
 assert.equal(q.postseason,null);
 console.log('PASS (c): full custom season, restore, playoffs, draft and season 2 all complete; playoffs-off honoured.');
}

// ---------- (d) DH reaches match generation ----------
{
 const mk=dh=>({id:dh?'custom-dh-on':'custom-dh-off',name:'DHリーグ',clubIds:CPBL4,gamesPerOpponent:1,dh,playoffs:true});
 for(const dh of [true,false]){
  const p=new NightPennant('owls',1,{customLeague:mk(dh)});
  assert.equal(p.dh,dh);
  const f={id:'dh-check',home:'owls',away:'foxes',innings:9};
  const s=p.simulate(f);
  const rows=Object.values(s.stats);
  const pitcherRows=rows.filter(r=>r.pos==='P');
  assert(pitcherRows.length>=2,'pitching records exist for both clubs');
  if(dh)assert(pitcherRows.every(r=>r.pa===0),'with the DH, no pitcher records a plate appearance');
  else for(const clubId of ['owls','foxes']){
   const sp=p.clubRoster(clubId).pitchers[p.starterIndexFor(clubId)];
   const row=s.stats[clubId+'/'+sp.id];
   assert(row&&row.pa>0,`without the DH, ${clubId}'s starting pitcher bats (PA=${row?.pa})`);
  }
 }
 console.log('PASS (d): dh:false puts the starting pitcher in the batting order; dh:true keeps pitchers out of it.');
}

// ---------- (e) built-in leagues unchanged ----------
{
 const cpbl=new NightPennant('owls');
 assert.equal(cpbl.leagueId,'cpbl');assert.equal(cpbl.customLeague,null);
 assert.equal(cpbl.dh,true);assert.equal(cpbl.playoffs,true);
 assert.equal(cpbl.schedule.length,20);
 assert.equal(cpbl.schedule.flat().length,60);
 assert.equal(NightPennant.validSchedule(cpbl.schedule,cpbl.clubs,4),true);
 const npb=new NightPennant('npb-g',2);
 assert.equal(npb.leagueId,'npb-central');assert.equal(npb.isNPB,true);assert.equal(npb.customLeague,null);
 assert.equal(NightPennant.validSchedule(npb.schedule,npb.clubs,2),true,'NPB own-league schedule unchanged');
 assert.equal(NightPennant.validSchedule(npb.otherSchedule,NightPennant.clubsFor('npb-pacific'),2),true,'NPB other-league schedule unchanged');
 const kbo=new NightPennant('kbo-hh',2);
 assert.equal(kbo.leagueId,'kbo');assert.equal(kbo.clubs.length,10);assert.equal(kbo.customLeague,null);
 assert.equal(NightPennant.validSchedule(kbo.schedule,kbo.clubs,2),true,'KBO schedule unchanged');
 console.log('PASS (e): CPBL/NPB/KBO pennants generate exactly as before, with no custom state attached.');
}
console.log('league-v107: all assertions passed');
