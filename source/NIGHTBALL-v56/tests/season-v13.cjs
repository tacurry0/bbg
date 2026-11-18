const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'),{filename:file});
for(let count=1;count<=10;count++){
 let season=new NightPennant('wolves',count),flat=season.schedule.flat();
 assert.equal(season.totalGames,5*count);assert.equal(flat.length,15*count);assert.equal(new Set(flat.map(f=>f.id)).size,flat.length);
 for(const fixtures of season.schedule)assert.equal(new Set(fixtures.flatMap(f=>[f.home,f.away])).size,6);
 for(const club of NightTeams.all){
  assert.equal(flat.filter(f=>f.home===club.id||f.away===club.id).length,5*count);
  for(const opp of NightTeams.all.filter(c=>c!==club)){
   const home=flat.filter(f=>f.home===club.id&&f.away===opp.id).length,away=flat.filter(f=>f.away===club.id&&f.home===opp.id).length;
   assert.equal(home+away,count);assert(Math.abs(home-away)<=1);
  }
 }
 for(let r=0;r<count*5;r++){
  assert(!season.completed);season.completeRound({homeScore:r%2?3:1,awayScore:r%2?1:2,inning:1});
  season=NightPennant.restore(JSON.parse(JSON.stringify(season)));assert(season);assert.equal(season.played,r+1);
  if(r<count*5-1)assert(season.next());
 }
 assert(season.completed);assert(!season.next());
 const rows=season.standings();assert(rows.every(r=>r.played===5*count));assert.equal(rows.reduce((n,r)=>n+r.diff,0),0);
 for(const row of rows){const games=Object.values(season.results).filter(g=>g.home===row.id||g.away===row.id);assert.equal(row.for,games.reduce((n,g)=>n+(g.home===row.id?g.homeScore:g.awayScore),0));assert.equal(row.against,games.reduce((n,g)=>n+(g.home===row.id?g.awayScore:g.homeScore),0));}
}
for(const n of [0,11,2.5,NaN,'4'])assert.throws(()=>new NightPennant('owls',n));
const legacy=new NightPennant('owls');legacy.completeRound({homeScore:7,awayScore:2});legacy.next();legacy.currentGame={checkpoint:'keep'};const old=JSON.parse(JSON.stringify(legacy));old.schema=1;delete old.gamesPerOpponent;const migrated=NightPennant.restore(old);assert.equal(migrated.gamesPerOpponent,4);assert.equal(migrated.totalGames,20);assert.deepEqual(migrated.schedule,legacy.schedule);assert.deepEqual(migrated.results,legacy.results);assert.deepEqual(migrated.currentGame,legacy.currentGame);
const tied=new NightPennant('owls',1);tied.results={a:{home:'owls',away:'foxes',homeScore:7,awayScore:1},b:{home:'foxes',away:'owls',homeScore:2,awayScore:1}};let table=tied.standings();assert.equal(table.find(r=>r.id==='owls').diff,5);assert(table.find(r=>r.id==='owls').rank<table.find(r=>r.id==='foxes').rank);
// Same win/loss/difference stays tied, even when one club has scored more runs.
tied.results={a:{home:'owls',away:'foxes',homeScore:2,awayScore:1},b:{home:'foxes',away:'owls',homeScore:2,awayScore:1},c:{home:'wolves',away:'comets',homeScore:8,awayScore:7},d:{home:'comets',away:'wolves',homeScore:8,awayScore:7}};table=tied.standings();assert.equal(table.find(r=>r.id==='owls').rank,table.find(r=>r.id==='wolves').rank);
// All 30 selectable matchups retain their own reordered real roster and selected starter.
for(const own of NightTeams.all)for(const opponent of NightTeams.all.filter(c=>c!==own)){
 const order=own.batters.slice(0,9).map(p=>p.id).reverse(),g=new NightGame('match','standard',()=>{},{homeTeamId:own.id,awayTeamId:opponent.id,pitcher:2,order,innings:5});g.beginHalf();assert.equal(g.teams.home.id,own.id);assert.equal(g.teams.away.id,opponent.id);assert.deepEqual(g.lineups.home.map(p=>p.id),order);assert.equal(g.pitcher.id,own.pitchers[2].id);assert.equal(g.batter.id,opponent.batters[0].id);
}
console.log('PASS: all 1–10 season lengths, balanced pairings, complete seasons and JSON saves, legacy 20-game migration, run totals/tiebreaks, all 30 custom matchups.');
