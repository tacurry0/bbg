// v166: pennant interleague block (checker item "pennant-interleague").
// A mid-season phase layered on the regular season like the postseason:
// when the regular schedule reaches its midpoint round, every club of
// the user's league plays every club of the partner league once
// (セ・パ交流戦 for NPB, CPBL⇄KBO for the single leagues; custom leagues
// have no partner and get no block). Results live in
// interleague.results and are INTEGRATED into both leagues' standings
// and into playerStats; the DH rule is the league's own (unchanged).
// The regular round does not advance while the block runs, rounds in
// which the user's club has no game (smaller-league byes) are simulated
// whole automatically, and pre-v166 saves (no interleague field) restore
// with no block this season — the next season gets one.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','game.js','npb-data.js','npb-rosters.js','kbo-data.js','kbo-rosters.js','npb-postseason.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'),{filename:file});
const roundTrip=p=>NightPennant.restore(JSON.parse(JSON.stringify(p)));

// Drive a whole season through the app-facing flow (activeFixture /
// completeActiveGame / next / nextInterleague), exactly as app.js does.
function driveSeason(p){
 let guard=0,ilPlayed=0;
 while(!p.completed&&guard++<2000){
  if(p.interleagueActive)p.advanceInterleagueByes(); // the dashboard's phase entry point
  const f=p.activeFixture;
  assert(f,`active fixture (round ${p.round}, il index ${p.interleague?.index})`);
  if(p.activeRoundDone){ // a restored save can sit on the result screen
   if(f.interleague)assert(p.nextInterleague(),'advance resulted interleague round');
   else assert(p.next(),'advance resulted round');
   continue;
  }
  const s=p.simulate(f);
  assert(p.completeActiveGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings}),'completeActiveGame');
  assert(p.activeRoundDone,'result recorded');
  if(f.interleague){ilPlayed++;assert(p.nextInterleague(),'advance interleague');}
  else if(!p.completed)assert(p.next(),'advance round');
 }
 assert(p.completed,'season completed');
 return ilPlayed;
}

// ---------- Generation: every built-in league gets a complete block ----------
const EXPECT={cpbl:['owls','kbo',10],kbo:['kbo-lg','cpbl',6],'npb-central':['npb-c','npb-pacific',7],'npb-pacific':['npb-h','npb-central',7]};
for(const [leagueId,[clubId,partner,userGames]] of Object.entries(EXPECT)){
 const p=new NightPennant(clubId,2);p.managed=true;
 const il=p.interleague;
 assert(il,`interleague generated for ${leagueId}`);
 assert.equal(il.partner,partner,'partner league');
 assert.equal(il.startRound,Math.floor(p.schedule.length/2),'block starts at the schedule midpoint');
 assert.equal(il.index,0);assert.equal(il.done,false);
 assert.equal(p.interleagueGames,userGames,'user club cross games');
 assert.equal(p.totalGamesAll,p.totalGames+userGames,'season total grows by the cross games');
 // Every cross pair exactly once; each round is a matching.
 const mine=new Set(p.clubs.map(c=>c.id)),theirs=new Set(NightPennant.clubsFor(partner).map(c=>c.id));
 const pairs=new Set(),ids=new Set();
 for(const round of il.rounds){
  const playing=new Set();
  for(const f of round){
   assert.equal(f.interleague,true,'fixture flagged');
   assert(!ids.has(f.id),'unique fixture id');ids.add(f.id);
   assert(!p.schedule.flat().some(x=>x.id===f.id),'id does not collide with the regular schedule');
   const [a,b]=mine.has(f.home)?[f.home,f.away]:[f.away,f.home];
   assert(mine.has(a)&&theirs.has(b),'fixture crosses the two leagues');
   const key=[f.home,f.away].sort().join('/');
   assert(!pairs.has(key),'pair meets once');pairs.add(key);
   assert(!playing.has(f.home)&&!playing.has(f.away),'matching within a round');playing.add(f.home);playing.add(f.away);
  }
 }
 assert.equal(pairs.size,mine.size*theirs.size,'complete bipartite coverage');
 // The user's club faces every partner club exactly once.
 const opponents=il.rounds.flat().filter(f=>[f.home,f.away].includes(clubId)).map(f=>f.home===clubId?f.away:f.home);
 assert.equal(new Set(opponents).size,theirs.size,'user faces every partner club');
 assert(opponents.every(id=>theirs.has(id)),'all opponents are partner-league clubs');
}

// ---------- Flow: the block interrupts at mid-season, round stays put ----------
{
 const p=new NightPennant('owls',2);p.managed=true;
 let guard=0;
 while(!p.interleagueActive&&guard++<100){
  assert.equal(p.activeFixture.interleague,undefined,'regular fixture before the block');
  const s=p.simulate(p.activeFixture);
  p.completeActiveGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings});
  if(!p.completed)p.next();
 }
 assert(p.interleagueActive,'block activates at the midpoint');
 assert.equal(p.round,p.interleague.startRound,'activation round is the midpoint round');
 const roundAtStart=p.round,playedAtStart=p.played;
 const f=p.activeFixture;
 assert.equal(f.interleague,true,'active fixture is an interleague game');
 assert(![f.home,f.away].every(id=>p.clubs.some(c=>c.id===id)),'opponent is from the partner league');
 // Cannot advance the block before the game is played.
 assert.equal(p.nextInterleague(),false,'nextInterleague blocked until the game is done');
 // Simulate route works and sims the rest of the round too.
 assert(p.simulateInterleagueGame(),'simulateInterleagueGame');
 assert.equal(p.activeRoundDone,true);
 const roundResults=Object.keys(p.interleague.results).length;
 assert.equal(roundResults,p.interleague.rounds[p.interleague.index].length,'whole round resulted');
 assert(p.nextInterleague(),'advance after the game');
 assert.equal(p.round,roundAtStart,'regular round does not move during the block');
 assert.equal(p.played,playedAtStart+1,'played counts the interleague game');
 // Finish the block: regular season resumes at the same round.
 guard=0;
 while(p.interleagueActive&&guard++<100){
  assert(p.simulateInterleagueGame());assert(p.nextInterleague());
 }
 assert.equal(p.interleague.done,true,'block finished');
 assert.equal(p.round,roundAtStart,'regular season resumes at the midpoint round');
 assert.equal(p.activeFixture.interleague,undefined,'regular fixture after the block');
}

// ---------- Full-season soak, CPBL: standings + stats integration, playoffs ----------
{
 const p=new NightPennant('owls',2);p.managed=true;
 const ilPlayed=driveSeason(p);
 assert.equal(ilPlayed,10,'user played all 10 cross games');
 const table=p.standings();
 assert(table.every(r=>r.played===p.totalGamesAll),'every CPBL club played regular + interleague games');
 // Within one league the cross games unbalance wins/losses (the other
 // side of each cross result lives in the partner league's table).
 assert(table.every(r=>r.wins+r.losses===r.played),'wins + losses = played');
 assert.equal(table.reduce((n,r)=>n+r.played,0),6*p.totalGamesAll,'total played adds up');
 // Partner-league players earned season stats in the simmed cross games.
 const kboRows=Object.values(p.playerStats).filter(r=>String(r.clubId).startsWith('kbo-'));
 assert(kboRows.length>20&&kboRows.some(r=>(r.pa||0)>0),'KBO players folded into playerStats');
 // The season restores identically after the block.
 const restored=roundTrip(p);
 assert(restored&&restored.completed,'completed season restores');
 assert.deepEqual(restored.standings().map(r=>[r.id,r.wins,r.losses]),table.map(r=>[r.id,r.wins,r.losses]),'standings survive the round trip');
 // Playoffs run to a champion exactly as before.
 assert(p.startPlayoffs(),'playoffs start');
 let guard=0;
 while(!p.postseasonCompleted&&guard++<100){
  if(p.activeRoundDone||p.postseason.awaitingNext){assert(p.nextPlayoff(),'next playoff step');continue;}
  if(p.userInActiveFixture){const s=p.simulate(p.activeFixture);assert(p.completeActiveGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings}),'playoff game');}
  else assert(p.simulatePlayoffGame(),'cpu playoff game sims');
 }
 assert(p.postseasonCompleted&&p.postseason.champion,'playoffs produce a champion');
}

// ---------- Full-season soak, NPB: BOTH leagues integrate the block ----------
{
 const p=new NightPennant('npb-c',2);p.managed=true;
 const ilPlayed=driveSeason(p);
 assert.equal(ilPlayed,7,'user played all 7 cross games');
 let allWins=0,allLosses=0;
 for(const id of ['npb-central','npb-pacific']){
  const table=p.standings(id);
  assert(table.every(r=>r.played===p.totalGamesAll),`${id} standings include interleague results`);
  assert(table.every(r=>r.wins+r.losses===r.played),`${id} wins + losses = played`);
  allWins+=table.reduce((n,r)=>n+r.wins,0);allLosses+=table.reduce((n,r)=>n+r.losses,0);
 }
 assert.equal(allWins,allLosses,'across both leagues every cross win is a cross loss');
 assert(p.startPlayoffs(),'NPB postseason starts');
 const restored=roundTrip(p);
 assert(restored&&restored.postseason,'NPB postseason save validates (Climax Series brackets intact)');
}

// ---------- Full-season soak, KBO: user byes inside the block are auto-played ----------
{
 const p=new NightPennant('kbo-hh',2);p.managed=true; // index 7: even the block's first round is a user bye
 const ilPlayed=driveSeason(p);
 assert.equal(ilPlayed,6,'KBO user plays the 6 CPBL clubs (bye rounds auto-simmed)');
 assert(p.standings().every(r=>r.played===p.totalGamesAll),'KBO standings include the block');
 const cpblPlayed=p.interleague.rounds.flat().filter(f=>[f.home,f.away].includes('owls'));
 assert.equal(Object.keys(p.interleague.results).length,p.interleague.rounds.flat().length,'every cross fixture resulted');
 assert.equal(cpblPlayed.length,10,'each CPBL club played all 10 KBO clubs');
 assert(p.startPlayoffs(),'KBO playoffs start');
}

// ---------- Save / restore in the middle of the block ----------
{
 const p=new NightPennant('npb-g',2);p.managed=true;
 let guard=0;
 while(!p.interleagueActive&&guard++<100){
  const s=p.simulate(p.activeFixture);
  p.completeActiveGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings});
  if(!p.completed)p.next();
 }
 assert(p.simulateInterleagueGame());
 const snap=JSON.parse(JSON.stringify(p));
 const restored=NightPennant.restore(snap);
 assert(restored,'mid-block save restores');
 assert(restored.interleagueActive,'block still active after restore');
 assert.equal(restored.interleague.index,p.interleague.index,'block index preserved');
 assert.deepEqual(Object.keys(restored.interleague.results).sort(),Object.keys(p.interleague.results).sort(),'block results preserved');
 assert.deepEqual(restored.standings().map(r=>[r.id,r.wins,r.losses]),p.standings().map(r=>[r.id,r.wins,r.losses]),'standings identical after restore');
 assert.equal(driveSeason(restored),6,'restored season finishes its block and season');
 // A tampered block (partial round results) fails safe to no block.
 const tampered=JSON.parse(JSON.stringify(p));
 const firstId=tampered.interleague.rounds[tampered.interleague.index][0].id;
 delete tampered.interleague.results[firstId];
 const safe=NightPennant.restore(tampered);
 assert(safe,'tampered save still restores');
 assert.equal(safe.interleague,null,'inconsistent block is dropped, season stays playable');
}

// ---------- Custom league: no partner, no block, nothing breaks ----------
{
 const def=NightPennant.validateCustomLeague({id:'custom-il166',name:'テスト',clubIds:['owls','foxes','falcons','mariners'],gamesPerOpponent:2}).def;
 const p=new NightPennant('owls',2,{customLeague:def});p.managed=true;
 assert.equal(p.interleague,null,'custom leagues have no interleague block');
 assert.equal(p.interleagueActive,false);assert.equal(p.totalGamesAll,p.totalGames);
 let guard=0;
 while(!p.completed&&guard++<100){
  const s=p.simulate(p.activeFixture);
  assert(p.completeActiveGame({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings}));
  if(!p.completed)assert(p.next());
 }
 assert(p.completed,'custom season completes');
 assert(p.standings().every(r=>r.played===p.totalGames),'custom standings unchanged');
 const restored=roundTrip(p);
 assert(restored&&restored.interleague===null,'custom save restores without a block');
}

// ---------- Pre-v166 saves: no block injected mid-season, next season gets one ----------
{
 const p=new NightPennant('owls',2);p.managed=true;
 for(let i=0;i<3;i++){const s=p.simulate(p.fixture);p.completeRound({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings});p.next();}
 const old=JSON.parse(JSON.stringify(p));
 delete old.interleague; // a genuine v165-era save has no such field
 const restored=NightPennant.restore(old);
 assert(restored,'pre-v166 save restores');
 assert.equal(restored.interleague,null,'no block is injected into an in-progress old season');
 let guard=0;
 while(!restored.completed&&guard++<100){
  const s=restored.simulate(restored.fixture);
  assert(restored.completeRound({homeScore:s.homeScore,awayScore:s.awayScore,inning:s.innings}));
  if(!restored.completed)assert(restored.next());
 }
 assert(restored.completed,'old season completes without a block');
 assert(restored.standings().every(r=>r.played===restored.totalGames),'old season standings are regular-only');
 // ...and its next season is built with a block.
 assert(restored.beginOffseason());
 let g2=0;
 while(!restored.draftDone&&g2++<200){
  if(restored.draftCpuPick())continue;
  const d=restored.offseason,taken=new Set(d.picks.map(k=>k.playerId));
  const pick=d.pool.find(x=>!taken.has(x.id));
  assert(pick&&restored.draftUserPick(pick.id),'draft pick');
 }
 assert(restored.startNextSeason(),'next season starts');
 assert(restored.interleague&&restored.interleague.partner==='kbo','next season has an interleague block');
}

// ---------- Partner data unavailable in this runtime: no block, no trap ----------
// (Regression guard: the classic-career context loads no KBO/NPB roster
// files, so clubsFor('kbo') is empty there. A block built anyway would
// activate at mid-season with no fixture and trap the season.)
{
 const {execFileSync}=require('node:child_process');
 const script=`global.window=global;const fs=require('fs'),vm=require('vm');
  for(const f of ['ratings-data.js','players.js','pennant.js'])vm.runInThisContext(fs.readFileSync('dist/'+f,'utf8'),{filename:f});
  const p=new NightPennant('owls',3);
  if(p.interleague!==null)throw Error('block built without partner data');
  let g=0;while(!p.completed&&g++<50){p.completeRound(p.simulate(p.fixture));if(!p.completed)p.next();}
  if(!p.completed)throw Error('season trapped');
  console.log('no-partner-data season completes');`;
 const out=execFileSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'});
 assert(out.includes('no-partner-data season completes'));
}

// ---------- Static wiring / pins ----------
{
 const index=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8'),app=fs.readFileSync('dist/app.js','utf8'),pennant=fs.readFileSync('dist/pennant.js','utf8');
 assert(pennant.includes('pennant-interleague'),'implementation tagged');
 assert(app.includes("case'interleague-next'")&&app.includes('league.nextInterleague()'),'next action wired');
 assert(app.includes("case'interleague-sim'")&&app.includes('league.simulateInterleagueGame()'),'sim action wired');
 assert(app.includes('league.interleagueActive'),'dashboard marks the block');
 assert(app.includes('league.advanceInterleagueByes()'),'dashboard advances user-bye rounds at phase entry');
 assert(index.includes('./pennant.js?v=86')&&sw.includes('./pennant.js?v=86'),'pennant pin bumped');
 assert(index.includes('./game.js?v=177')&&index.includes('./app.js?v=177'),'index pins at v166');
 assert(sw.includes('nightball-v177-pitch-chart'),'SW cache renamed for v166');
 assert(sw.includes('./game.js?v=177')&&sw.includes('./app.js?v=177'),'SW precaches the v166 scripts');
}
console.log('interleague-v166: all assertions passed');
