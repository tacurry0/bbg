const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'),{filename:file});
const emit=()=>{},fresh=(opts={})=>new NightGame('pennant','standard',emit,opts);
const out=g=>{g.addOut();g.endAtBat('groundout');g.resetCount();g.changeHalf();if(g.phase!=='ended')g.beginHalf();};
const loaded=g=>{assert.equal(g.outs,2);assert.deepEqual(g.bases,[true,true,true]);assert.equal(new Set(g.baseIds).size,3);assert(!g.baseIds.includes(g.batter.id));assert(g.baseIds.every(id=>g.lineups[g.side].some(p=>p.id===id)));};
const league=new NightPennant('comets'),fixtures=league.schedule.flat();
assert.equal(fixtures.length,60);assert.equal(new Set(fixtures.map(f=>f.id)).size,60);
for(const r of league.schedule)assert.equal(new Set(r.flatMap(f=>[f.home,f.away])).size,6);
for(const c of NightTeams.all){assert.equal(fixtures.filter(f=>f.home===c.id).length,10);assert.equal(fixtures.filter(f=>f.away===c.id).length,10);for(const d of NightTeams.all.filter(d=>d!==c))assert.equal(fixtures.filter(f=>f.home===c.id&&f.away===d.id).length,2);}
assert.equal(new Set(NightTeams.all.flatMap(c=>[...c.batters,...c.pitchers].map(p=>p.id))).size,180);
for(const userHome of [true,false]){
 const g=fresh({userHome,homeTeamId:'wolves',awayTeamId:'comets'});g.beginHalf();loaded(g);
 assert.equal(g.defending,userHome);assert.equal(g.side,'away');assert.equal(g.batter.id,'comets-b1');assert.equal(g.pitcher.id,'wolves-p1');
 // A grand slam by the visitor is credited to the visiting club, regardless of control side.
 g.startField(20,20,0,!userHome);g.finishBall('hr');assert.equal(g.awayScore,4);assert.equal(g.awayHits,1);assert.equal(g.homeHits,0);assert.equal(g.userScore,userHome?0:4);
 out(g);loaded(g);assert.equal(g.half,'bottom');assert.equal(g.defending,!userHome);assert.equal(g.pitcher.id,'comets-p1');assert.equal(g.batter.id,'wolves-b1');
 g.advance(4);g.endAtBat('hr',4);assert.equal(g.homeScore,4);out(g);assert.equal(g.inning,2);loaded(g);
 // Ties keep extending with new runners and the correct next hitter, with no three/five inning limit.
 for(let inning=2;inning<=8;inning++){assert.equal(g.inning,inning);loaded(g);out(g);loaded(g);out(g);}
 assert.equal(g.inning,9);assert.equal(g.home.length,9);loaded(g);
 out(g);loaded(g);g.walk();g.checkEnd();assert.equal(g.next,'finish');assert.equal(g.homeScore,5);assert.equal(g.awayScore,4);g.finish();assert.equal(g.phase,'ended');
}
const g=fresh({userHome:false,homeTeamId:'foxes',awayTeamId:'mariners'});g.beginHalf();const snapshot=JSON.parse(JSON.stringify(g.snapshot())),restored=NightGame.restore(snapshot,emit);loaded(restored);assert.equal(restored.defending,false);assert.equal(restored.batter.id,'mariners-b1');out(restored);assert.equal(restored.changePitcher(1),true);assert.equal(restored.pitcher.id,'mariners-p2');assert.equal(restored.changePitcher(1),false);
const defeat=fresh({userHome:false});defeat.beginHalf();defeat.advance(4);out(defeat);defeat.addOut();defeat.changeHalf();assert.equal(defeat.phase,'ended');assert.equal(defeat.awayScore,4);
// A normal match still begins empty and ends tied after its configured five innings.
const normal=new NightGame('match','standard',emit,{innings:5});normal.beginHalf();assert.equal(normal.outs,0);assert.deepEqual(normal.bases,[false,false,false]);for(let i=0;i<10;i++){normal.outs=2;out(normal);}assert.equal(normal.phase,'ended');assert.equal(normal.inning,5);
const old=normal.snapshot();delete old.state.teams;delete old.state.pitchingStaff;delete old.state.userHome;assert.equal(NightGame.restore(old,emit).teams.home.id,'owls');
// All 20 rounds survive JSON round trips. Completion is idempotent; each club plays 20 games.
let season=league;
for(let r=0;r<20;r++){
 assert.equal(season.round,r);assert.equal(season.next(),false);const sim=season.simulate(season.fixture);assert.notEqual(sim.homeScore,sim.awayScore);
 assert.equal(season.completeRound({...sim,inning:sim.innings}),true);assert.equal(season.completeRound({...sim,inning:sim.innings}),false);assert.equal(Object.keys(season.results).length,(r+1)*3);
 season=NightPennant.restore(JSON.parse(JSON.stringify(season)));assert.equal(season.played,r+1);if(r<19)assert.equal(season.next(),true);
}
assert(season.completed);assert.equal(season.next(),false);const table=season.standings();assert(table.every(r=>r.played===20&&r.wins+r.losses===20));assert.equal(table.reduce((n,r)=>n+r.wins,0),60);assert.equal(table.reduce((n,r)=>n+r.losses,0),60);assert.equal(table.reduce((n,r)=>n+r.diff,0),0);
assert.throws(()=>new NightPennant('invalid'));assert.throws(()=>new NightPennant('owls').completeRound({homeScore:0,awayScore:0}));
console.log('PASS: balanced 60-game schedule, 180 unique players, both control sides, loaded extra innings through 9th, walk-off, visitor win, pitcher change, saves, normal five innings, full season and standings.');

for(const schema of [1,2]){
 const legacy=JSON.parse(JSON.stringify(season));legacy.schema=schema;delete legacy.leagueId;
 if(schema===1)delete legacy.gamesPerOpponent;
 const migrated=NightPennant.restore(legacy);
 assert.equal(migrated.leagueId,'cpbl');assert.equal(migrated.played,20);
}
for(const file of ['npb-data','npb-rosters','kbo-data','kbo-rosters'])vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'),{filename:file+'.js'});
for(const [id,clubId,count] of [['npb','npb-a',14],['kbo','kbo-hh',10]]){
 let p=new NightPennant(clubId,2);
 const fixtures=p.schedule.flat(),clubIds=p.clubs.map(c=>c.id);
 assert.equal(p.leagueId,id);assert.equal(clubIds.length,count);assert.equal(p.totalGames,2*(count-1));
 for(const r of p.schedule)assert.deepEqual(r.flatMap(f=>[f.home,f.away]).sort(),clubIds.slice().sort());
 for(const home of clubIds)for(const away of clubIds.filter(id=>id!==home))assert.equal(fixtures.filter(f=>f.home===home&&f.away===away).length,1);
 const first=p.fixture,match=fresh({userHome:first.home===clubId,homeTeamId:first.home,awayTeamId:first.away});
 match.beginHalf();loaded(match);assert.deepEqual([match.teams.home.id,match.teams.away.id],[first.home,first.away]);
 for(let r=0;r<p.totalGames;r++){
  assert(p.completeRound(p.simulate(p.fixture)));
  if(r<p.totalGames-1)assert(p.next());
 }
 assert(p.standings().every(row=>row.played===p.totalGames));
 assert(p.startPlayoffs());
 p=NightPennant.restore(JSON.parse(JSON.stringify(p)));
 assert(p.postseason.seeds.every(seed=>clubIds.includes(seed.clubId)));
 while(!p.postseasonCompleted){
  if(p.activeRoundDone)assert(p.nextPlayoff());
  else if(p.userInActiveFixture)assert(p.completeActiveGame(p.simulate(p.activeFixture)));
  else assert(p.simulatePlayoffGame());
 }
 assert(clubIds.includes(NightPennant.restore(JSON.parse(JSON.stringify(p))).postseason.champion));
}
console.log('PASS: legacy CPBL saves, NPB/KBO league schedules, match lineups, standings, playoffs and saves.');
