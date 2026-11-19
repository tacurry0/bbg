const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','pennant','npb-postseason','npb-data','npb-rosters','game']){
 vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
const central='npb-central',pacific='npb-pacific';
const data=p=>JSON.parse(JSON.stringify(p));
const restore=p=>{const saved=NightPennant.restore(data(p));assert(saved);return saved;};
const finishGame=(p,winner)=>{
 const f=p.activeFixture;
 assert(p.completeActiveGame({leagueFixtureId:f.id,homeScore:winner===f.home?1:0,awayScore:winner===f.away?1:0,inning:winner?9:12}));
 assert.equal(p.completeActiveGame({homeScore:1,awayScore:0}),false);
 return restore(p);
};
for(const [id,clubId] of [[central,'npb-a'],[pacific,'npb-v']]){
 let p=new NightPennant(clubId,2);
 assert.equal(p.leagueId,id);assert.equal(p.clubs.length,7);assert.equal(p.totalGames,12);
 assert.equal(p.clubs.filter(c=>c.division.startsWith('farm-')).length,1);
 for(const club of p.clubs){
  const games=p.schedule.flat().filter(f=>[f.home,f.away].includes(club.id));
  assert.equal(games.length,12);
  for(const opponent of p.clubs.filter(c=>c.id!==club.id)){
   assert.equal(games.filter(f=>f.home===club.id&&f.away===opponent.id).length,1);
   assert.equal(games.filter(f=>f.away===club.id&&f.home===opponent.id).length,1);
  }
 }
 assert.equal(p.round,1,'the opening bye is processed automatically');
 for(let r=0;r<12;r++){
  const f=p.fixture;
  assert([f.home,f.away].includes(clubId));
  const home=f.home===clubId;
  assert(p.completeRound({homeScore:home?5:0,awayScore:home?0:5}));
  p=restore(p);
  assert.equal(p.played,r+1);
  if(r<11)assert(p.next());
 }
 assert(p.completed);
 for(const division of [p.leagueId,p.otherLeague]){
  const rows=p.standings(division);
  assert.equal(rows.length,7);
  assert.deepEqual(rows.map(r=>r.rank),[1,2,3,4,5,6,7]);
  assert(rows.every(row=>row.played===12));
 }
 assert.equal(p.standings()[0].id,clubId);
 assert(p.startPlayoffs());assert(!p.userInActiveFixture);
 p=restore(p);
 assert.equal(p.activeFixture.home,p.postseason.brackets[id].seeds[1].clubId);
 assert.equal(p.activeFixture.maxInnings,12);
 p=finishGame(p,p.activeFixture.home);assert(p.nextPlayoff());
 assert(p.activeFixture.drawClinches);
 p=finishGame(p,null);
 assert.equal(p.activeSeries.winner,p.activeFixture.home);
 assert(p.nextPlayoff());assert.equal(p.postseason.stage,'final');
 assert.equal(p.activeFixture.home,clubId);
 assert([1,2].includes(p.activeSeries.advantage));
 while(!p.activeSeries.winner){p=finishGame(p,clubId);if(!p.activeSeries.winner)assert(p.nextPlayoff());}
 assert(p.nextPlayoff());assert.equal(p.postseason.stage,'japan');
 assert.equal(p.postseason.brackets[p.otherLeague].final.winner,p.postseason.japan[id===central?'lower':'higher']);
 const series=p.postseason.japan;
 for(const [i,home] of [series.higher,series.higher,series.lower,series.lower,series.lower,series.higher,series.higher].entries()){
  assert.equal(p.activeFixture.game,i+1);assert.equal(p.activeFixture.home,home);assert.equal(p.activeFixture.maxInnings,12);
  p=finishGame(p,null);assert(p.nextPlayoff());
 }
 assert.equal(p.activeFixture.home,series.higher);assert.equal(p.activeFixture.maxInnings,null);
 assert.throws(()=>p.completePlayoffGame({homeScore:0,awayScore:0,innings:12}));
 p=finishGame(p,clubId);assert(p.nextPlayoff());
 assert.equal(p.activeFixture.home,series.lower);
 while(!p.postseasonCompleted){p=finishGame(p,clubId);if(!p.postseasonCompleted)assert(p.nextPlayoff());}
 assert.equal(p.postseason.champion,clubId);
 const broken=data(p);broken.postseason.japan.games[0].home='owls';
 assert.equal(NightPennant.restore(broken),null);
}

for(const [behind,pct,advantage] of [[9,.5,1],[10,.5,2],[0,.49,2]]){
 const seeds=id=>[1,2,3].map(seed=>({seed,clubId:id+'-'+seed}));
 const p={leagueId:central,playoffSeeds:seeds,standings:()=>[{id:central+'-2',behind,pct}]};
 NightNPBPostseason.start(p);
 const first=NightNPBPostseason.activeSeries(p);
 NightNPBPostseason.complete(p,{homeScore:1,awayScore:0,innings:9});
 p.postseason.awaitingNext=false;
 NightNPBPostseason.complete(p,{homeScore:1,awayScore:0,innings:9});
 assert.equal(first.winner,central+'-2');
 NightNPBPostseason.next(p);
 const final=NightNPBPostseason.activeSeries(p);
 assert.deepEqual([final.advantage,final.target,final.limit],[advantage,3+advantage,5+advantage]);
 assert.equal(final.wins[central+'-1'],advantage);
}

// Restore the original combined NPB season and its old playoff format.
const combined=NightPennant.clubsFor('npb').map(c=>c.id),schedule=[];
for(let round=0;round<13;round++){
 schedule.push(Array.from({length:7},(_,i)=>({id:`r${round+1}-${i+1}`,round,home:combined[i],away:combined[13-i]})));
 combined.splice(1,0,combined.pop());
}
let legacy=NightPennant.restore({schema:3,leagueId:'npb',clubId:'npb-a',gamesPerOpponent:1,round:0,id:'mixed',schedule,results:{}});
assert.equal(legacy.clubs.length,14);assert.equal(legacy.totalGames,13);
do assert(legacy.completeRound(legacy.simulate(legacy.fixture)));while(legacy.next());
assert(legacy.startPlayoffs());
legacy=restore(legacy);
assert.equal(legacy.postseason.schema,1);
assert.equal(legacy.activeFixture.maxInnings,undefined);

const game=(maxInnings,drawClinches=false)=>new NightGame('pennant','standard',()=>{},
 {npbPostseason:true,innings:9,maxInnings,drawClinches,homeTeamId:'npb-a',awayTeamId:'npb-v'});
function endHalf(g){g.outs=3;g.changeHalf();}
const capped=game(12);
assert.equal(capped.totalInnings,9);assert.equal(capped.outs,0);assert.deepEqual(capped.bases,[false,false,false]);
for(let i=0;i<24;i++)endHalf(capped);
assert.equal(capped.phase,'ended');assert.equal(capped.inning,12);
const early=game(12,true);
for(let i=0;i<23;i++)endHalf(early);
assert.equal(early.phase,'ended');assert.equal(early.half,'top');assert.equal(early.inning,12);
const comeback=game(12,true);
comeback.inning=12;comeback.awayScore=1;endHalf(comeback);
assert.equal(comeback.half,'bottom');assert.notEqual(comeback.phase,'ended');
comeback.homeScore=1;comeback.checkEnd();assert.equal(comeback.next,'finish');
const extra=game(null);
for(let i=0;i<24;i++)endHalf(extra);
assert.notEqual(extra.phase,'ended');assert.equal(extra.inning,13);assert.deepEqual(extra.bases,[false,false,false]);
const savedGame=NightGame.restore(data(extra.snapshot()),()=>{});
assert.equal(savedGame.totalInnings,9);assert.equal(savedGame.maxInnings,null);
savedGame.homeScore=1;endHalf(savedGame);
assert.equal(savedGame.phase,'ended');assert.equal(savedGame.half,'top');
console.log('PASS: separate seven-club leagues, saves and byes, both CS brackets, 2026 advantages, Japan Series hosting, draws and extra innings.');
