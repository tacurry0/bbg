// v124: playable farm games. Once per round the user can play a 3-inning
// farm game (farm players lead the lineup, youngest bench players fill
// in) against the farm side of that round's opponent. Appearing farm
// players earn two rounds of development credit through the same
// every-4-rounds bonus cadence as passive farmDevelop.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});

const league=new NightPennant('comets');
const f=league.activeFixture;
const oppId=f.home===league.clubId?f.away:f.home;
assert.equal(league.farmGameOpponent(),oppId,'the farm opponent mirrors the first-team fixture');
assert.equal(league.canPlayFarmGame(),true,'a farm game is available in round 1');

const roster=league.clubRoster(league.clubId);
const farmBat1=roster.batters[10],farmBat2=roster.batters[11],farmPit=roster.pitchers[4];
for(const p of [farmBat1,farmBat2,farmPit])assert.equal(league.setFarm(p.id,true),true);
const club=league.farmClub(league.clubId);
assert(club.name.endsWith('二軍'),'farm club is labelled');
assert.equal(club.startingOrder.length,9,'nine farm starters');
assert.deepEqual(club.batters.slice(0,2).map(p=>p.id),[farmBat1.id,farmBat2.id],'assigned farm batters lead the order');
assert.equal(club.pitchers[0].id,farmPit.id,'assigned farm pitcher leads the staff');
const oppClub=league.farmClub(oppId);
assert(oppClub&&oppClub.startingOrder.length===9,'opponent farm club fields nine');

// Play the farm game out with the real engine.
const g=new NightGame('match','standard',()=>{},{clubs:{home:club,away:oppClub},homeTeamId:club.id,awayTeamId:oppClub.id,userHome:true,innings:3,park:club.park,pitcher:0,opponentPitcher:0,order:club.startingOrder,fielding:club.startingFielding});
g.autoBatting=true;g.autoDefense=true;
for(let i=0;i<40000&&g.phase!=='ended';i++){
 if(g.phase==='change')g.acknowledgeHalf();
 if(g.phase==='aim'&&g.defending)g.autoPitch();
 g.update(50);
}
assert.equal(g.phase,'ended','the farm game completes');

league.farmProgress[farmBat1.id]={rounds:3,bonus:0};
const credited=league.farmGameCredit(g);
assert(credited.includes(farmBat1.id),'an appearing farm batter is credited');
assert(credited.includes(farmPit.id),'the farm starting pitcher is credited');
assert.equal(league.farmProgress[farmBat1.id].rounds,5,'two rounds of credit landed');
assert.equal(league.farmProgress[farmBat1.id].bonus,1,'crossing 4 rounds paid the growth bonus');
assert(league.ratingMods[farmBat1.id],'the bonus wrote a rating mod');
assert.equal(league.farmGameRound,league.round);
assert.deepEqual(league.farmGameCredit(g),[],'no double credit in the same round');
assert.equal(league.canPlayFarmGame(),false,'one farm game per round');

// Saves keep the marker; legacy saves default to -1 (never played).
const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
assert.equal(restored.farmGameRound,league.round,'farm game marker survives save/restore');
const legacy=JSON.parse(JSON.stringify(league));delete legacy.farmGameRound;
assert.equal(NightPennant.restore(legacy).farmGameRound,-1);

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('function startFarmGame()'),'farm game starter exists');
assert(app.includes("case'farm-game':startFarmGame();"),'farm modal action is wired');
assert(app.includes('league.farmGameCredit(g)'),'finished farm games credit development');
assert(app.includes("case'farm-back'"),'result returns to the pennant dashboard');
assert(app.includes('data-league-action="farm-game"'),'farm modal exposes the play button');

console.log('farm-games-v124: all assertions passed');
