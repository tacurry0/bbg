// v137 pennant preseason (checker item "pennant-preseason"):
//  - a new pennant starts in a 3-game preseason (オープン戦) against other
//    clubs, separate from the regular schedule,
//  - preseason results (played out via completePreseasonGame or simulated)
//    never enter the standings, the season total, or playerStats,
//  - a farm-assigned player who appears in a live preseason game earns one
//    development step (half the v124 farm-game credit),
//  - the preseason can be skipped to open the season immediately,
//  - preseason progress survives a save/restore round trip through the
//    v136 slot storage, mid-slate included,
//  - pre-v137 saves (no preseason field) restore with the preseason over,
//  - once the preseason ends, the regular season runs exactly as before,
//  - app wiring + v137 pins (pennant.js pin moves because it changed).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','pennant','npb-data','npb-rosters','kbo-data','kbo-rosters','league-editor']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
function memStorage(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),keys:()=>[...mem.keys()]};}
const roundTrip=p=>NightPennant.restore(JSON.parse(JSON.stringify(p)));

// ---------- a new pennant starts in the preseason ----------
{
 const p=new NightPennant('owls',2);
 assert.equal(p.preseasonActive,true,'new pennant opens with the preseason');
 assert.equal(p.preseason.games.length,3,'three preseason games');
 assert.equal(new Set(p.preseason.games.map(g=>g.id)).size,3);
 const opponents=p.preseason.games.map(g=>g.home===p.clubId?g.away:g.home);
 assert.equal(new Set(opponents).size,3,'three different opponents');
 assert(opponents.every(id=>id!==p.clubId&&p.clubs.some(c=>c.id===id)),'opponents are league clubs');
 assert(p.preseason.games.every(g=>[g.home,g.away].includes(p.clubId)),'the user club plays every preseason game');
 assert.equal(p.preseasonFixture.id,'pre-1');
 assert.equal(p.preseasonPlayed,0);
 assert.equal(p.round,0,'regular schedule has not started');
 assert.equal(p.played,0);
 assert.equal(p.totalGames,2*(p.clubs.length-1),'season total excludes the preseason');
}

// ---------- preseason results never touch standings or season stats ----------
{
 const p=new NightPennant('owls',2);
 // Played-out game (explicit score) with a farm player appearing.
 const farmPlayer=p.clubRoster(p.clubId).batters.at(-1);
 assert.equal(p.setFarm(farmPlayer.id,true),true);
 const fakeGame={box:{[farmPlayer.id]:{pa:3}},pitchingStats:{}};
 assert.equal(p.completePreseasonGame({homeScore:5,awayScore:2,inning:1},fakeGame),true);
 assert.deepEqual(p.preseason.results['pre-1'].credits,[farmPlayer.id],'appearing farm player is credited');
 assert.equal(p.farmProgress[farmPlayer.id].rounds,1,'one development step (half the farm-game credit)');
 assert.equal(p.preseasonFixture.id,'pre-2','completion advances to the next preseason game');
 // Simulated games discard their stats entirely.
 assert.equal(p.simulatePreseasonGame(),true);
 assert.equal(p.simulatePreseasonGame(),true);
 assert.equal(p.preseasonActive,false,'preseason ends after three games');
 assert.equal(p.preseasonPlayed,3);
 assert.equal(p.preseasonFixture,null);
 // Nothing leaked into the season.
 assert.equal(p.round,0);assert.equal(p.played,0);
 assert.deepEqual(p.results,{},'regular results stay empty');
 assert.deepEqual(p.playerStats,{},'season player stats stay empty');
 assert(p.standings().every(r=>r.played===0&&r.wins===0&&r.losses===0&&r.for===0&&r.against===0),'standings stay at zero');
 // A tie is not a valid preseason result either.
 const q=new NightPennant('foxes',2);
 assert.equal(q.completePreseasonGame({homeScore:3,awayScore:3}),false,'tied preseason game rejected');
 assert.equal(q.preseasonPlayed,0);
}

// ---------- skip opens the season immediately ----------
{
 const p=new NightPennant('comets',2);
 assert.equal(p.simulatePreseasonGame(),true);
 assert.equal(p.skipPreseason(),true);
 assert.equal(p.preseason.skipped,true);
 assert.equal(p.preseasonActive,false);
 assert.equal(p.skipPreseason(),false,'skip is idempotent');
 assert.equal(p.preseasonPlayed,1,'played games stay on record after a skip');
 assert.equal(p.played,0,'season itself still untouched');
 const fresh=new NightPennant('comets',2);
 assert.equal(fresh.skipPreseason(),true,'skip works before any game too');
 assert.equal(fresh.preseasonPlayed,0);
}

// ---------- preseason progress survives save/restore via the slot keys ----------
{
 const store=memStorage();
 const p=new NightPennant('owls',2);
 assert.equal(p.simulatePreseasonGame(),true);
 assert(NightPennantSlots.write(store,'cpbl',2,p),'preseason state saves into slot 2');
 const restored=NightPennantSlots.restore(store,'cpbl',2);
 assert(restored,'mid-preseason save restores');
 assert.equal(restored.preseasonActive,true,'still in the preseason after restore');
 assert.equal(restored.preseason.index,1);
 assert.equal(restored.preseasonPlayed,1);
 assert(restored.preseason.results['pre-1'],'first result kept');
 assert.equal(restored.preseasonFixture.id,'pre-2','resumes at the next preseason game');
 assert.equal(restored.played,0);
 // Finish the slate on the restored copy and re-save: season opens cleanly.
 assert.equal(restored.simulatePreseasonGame(),true);
 assert.equal(restored.simulatePreseasonGame(),true);
 assert.equal(restored.preseasonActive,false);
 assert(NightPennantSlots.write(store,'cpbl',2,restored));
 const opened=NightPennantSlots.restore(store,'cpbl',2);
 assert.equal(opened.preseasonActive,false,'finished preseason stays finished');
 assert.equal(opened.preseasonPlayed,3);
 // A skipped preseason also restores as over.
 const s=new NightPennant('foxes',2);s.skipPreseason();
 const rs=roundTrip(s);
 assert.equal(rs.preseasonActive,false);assert.equal(rs.preseason.skipped,true);
 // A corrupt preseason block fails safe to "over" instead of trapping play.
 const bad=JSON.parse(JSON.stringify(new NightPennant('owls',2)));
 bad.preseason={games:[{id:'pre-1',home:'owls',away:'owls'}],index:0,results:{},done:false};
 const rb=NightPennant.restore(bad);
 assert(rb,'save with a corrupt preseason still restores');
 assert.equal(rb.preseasonActive,false,'corrupt preseason fails safe to over');
}

// ---------- pre-v137 saves have no preseason ----------
{
 const p=new NightPennant('owls',2);
 assert(p.completeRound(p.simulate(p.fixture)));
 const legacy=JSON.parse(JSON.stringify(p));
 delete legacy.preseason; // exactly what a pre-v137 save looks like
 const restored=NightPennant.restore(legacy);
 assert(restored,'pre-v137 save restores');
 assert.equal(restored.preseasonActive,false,'an in-progress season does not re-enter the preseason');
 assert.equal(restored.preseason.done,true);
 assert.equal(restored.played,1,'season progress is untouched');
}

// ---------- after the preseason, the season runs as before ----------
{
 const p=new NightPennant('owls',1); // shortest season: one game per opponent
 while(p.preseasonActive)assert.equal(p.simulatePreseasonGame(),true);
 const totalRounds=p.schedule.length;
 for(let r=0;r<totalRounds;r++){
  assert.equal(p.round,r);
  assert(p.completeRound(p.simulate(p.fixture)),'regular round completes after the preseason');
  if(r<totalRounds-1)assert.equal(p.next(),true);
 }
 assert(p.completed,'season completes');
 assert(p.standings().every(row=>row.played===p.totalGames),'standings count only regular games');
 assert.equal(Object.keys(p.results).length,p.schedule.flat().length,'no preseason fixture in regular results');
 assert(Object.keys(p.playerStats).length>0,'regular sims do fold stats once the season starts');
 // The next season (after draft/FA) opens with a fresh preseason again.
 assert.equal(p.beginOffseason(),true);
 for(let guard=0;!p.draftDone&&guard<500;guard++){
  if(p.draftCpuPick())continue;
  const taken=new Set(p.offseason.picks.map(k=>k.playerId)),cand=p.offseason.pool.find(x=>!taken.has(x.id));
  if(!cand||!p.draftUserPick(cand.id))break;
 }
 assert(p.draftDone,'draft finishes');
 assert.equal(p.startNextSeason(),true);
 assert.equal(p.season,2);
 assert.equal(p.preseasonActive,true,'next season starts with a new preseason');
 assert.equal(p.preseasonPlayed,0);
 assert.equal(p.played,0);
}

// ---------- playoffs close any leftover preseason state ----------
{
 const p=new NightPennant('owls',1);
 assert.equal(p.preseasonActive,true);
 for(let r=0;r<p.schedule.length;r++){assert(p.completeRound(p.simulate(p.fixture)));if(!p.completed)assert(p.next());}
 assert(p.completed);
 assert.equal(p.startPlayoffs(),true);
 assert.equal(p.preseasonActive,false,'starting the playoffs closes the preseason for good');
 const restored=roundTrip(p);
 assert.equal(restored.preseasonActive,false,'postseason saves never resurrect the preseason');
 assert(restored.postseason,'postseason survives the round trip');
}

// ---------- NPB split leagues get a preseason too, other league untouched ----------
{
 for(const file of ['npb-postseason'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
 const p=new NightPennant('npb-g',2);
 assert.equal(p.isNPB,true);
 assert.equal(p.preseasonActive,true);
 const otherBefore=p.standings(p.otherLeague).map(r=>r.played).join(',');
 const ownBefore=p.standings().map(r=>r.played).join(',');
 assert.equal(p.simulatePreseasonGame(),true);
 assert.equal(p.standings(p.otherLeague).map(r=>r.played).join(','),otherBefore,'other league standings untouched by the preseason');
 assert.equal(p.standings().map(r=>r.played).join(','),ownBefore,'own standings untouched by the preseason');
 assert.equal(p.skipPreseason(),true);
 assert.equal(p.preseasonActive,false);
}

// ---------- app wiring + v137 pins ----------
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
 assert(app.includes('preseasonDashboard()'),'dashboard routes to the preseason view while active');
 assert(app.includes("case'preseason-sim'")&&app.includes('league.simulatePreseasonGame()'),'sim action wired');
 assert(app.includes("case'preseason-skip'")&&app.includes('league.skipPreseason()'),'skip action wired');
 assert(app.includes('league.completePreseasonGame(g,g)'),'live games finish through the preseason path');
 assert(app.includes('game.preseasonGame=true'),'live preseason games are flagged');
 assert(index.includes('./pennant.js?v=86'),'index pin for the changed pennant.js moves');
 assert(sw.includes('./pennant.js?v=86'),'SW precaches the new pennant.js');
 assert(index.includes('./game.js?v=168')&&index.includes('./app.js?v=168'),'index pins move to v137');
 assert(sw.includes('nightball-v168-wind-balance'),'SW cache renamed for v137');
 assert(sw.includes('./game.js?v=168')&&sw.includes('./app.js?v=168'),'SW precaches the v137 scripts');
}
console.log('pennant-preseason-v137: all assertions passed');
