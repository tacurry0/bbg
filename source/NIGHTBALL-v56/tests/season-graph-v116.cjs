// v116: player season graphs. Finished seasons' playerStats are archived
// at startNextSeason (previously they were reset and lost), capped at 10
// seasons, and playerSeasonHistory(playerId) returns archived lines plus
// the current season's live line. The pennant roster modal renders the
// history as a line graph (app.js source-guarded; it is not node-loadable).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});

const league=new NightPennant('comets');
for(let r=0;r<20;r++){
 const sim=league.simulate(league.fixture);
 league.completeRound({...sim,inning:sim.innings});
 if(r<19)league.next();
}
assert(league.completed,'season 1 finished');
const someKey=Object.keys(league.playerStats).find(k=>league.playerStats[k].ab>=3);
assert(someKey,'sim produced batting lines');
const pid=someKey.split('/').slice(1).join('/'),before={...league.playerStats[someKey]};
assert.equal(league.playerSeasonHistory(pid).length,1,'current season is visible before archiving');
assert.equal(league.playerSeasonHistory(pid)[0].current,true);

// Pre-fill the archive to the cap so the rollover must trim the oldest.
league.seasonArchive=Array.from({length:10},(_,i)=>({season:-i,stats:{}}));

assert.equal(league.beginOffseason(),true);
while(!league.draftDone){
 if(league.draftCpuPick())continue;
 const d=league.offseason,taken=new Set(d.picks.map(k=>k.playerId));
 const p=d.pool.find(x=>!taken.has(x.id));
 assert(p&&league.draftUserPick(p.id),'user pick advances the draft');
}
assert.equal(league.startNextSeason(),true);
assert.equal(league.season,2);
assert.equal(league.seasonArchive.length,10,'archive is capped at 10 seasons');
const archived=league.seasonArchive.at(-1);
assert.equal(archived.season,1,'the finished season was archived under its own number');
assert.equal(archived.stats[someKey].h,before.h,'archived line keeps the batting record');
assert.equal(archived.stats[someKey].ab,before.ab);
assert.deepEqual(league.playerStats,{},'live stats reset for the new season');

const hist=league.playerSeasonHistory(pid);
assert.equal(hist.length,1);
assert.equal(hist[0].current,false);
assert.equal(hist[0].season,1);
// A current-season line joins the history as it accumulates.
league.playerStats[someKey]={...before,ab:10,h:4};
const hist2=league.playerSeasonHistory(pid);
assert.equal(hist2.length,2);
assert.equal(hist2[1].current,true);assert.equal(hist2[1].season,2);assert.equal(hist2[1].h,4);

// Saves round-trip with the archive; legacy saves without it restore fine.
const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
assert.equal(restored.playerSeasonHistory(pid).length,2,'archive survives save/restore');
const legacy=JSON.parse(JSON.stringify(league));delete legacy.seasonArchive;
const migrated=NightPennant.restore(legacy);
assert.deepEqual(migrated.seasonArchive,[],'legacy saves gain an empty archive');
assert.equal(migrated.playerSeasonHistory(pid).length,1,'only the current line without an archive');

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('seasonGraphHTML'),'roster modal renders the season graph');
assert(app.includes('playerSeasonHistory(p.id)'),'graph reads the league history API');
assert(app.includes('年度別成績'),'section is labelled');

console.log('season-graph-v116: all assertions passed');
