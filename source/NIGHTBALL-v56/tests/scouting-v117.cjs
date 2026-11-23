// v117: pre-game scouting report. NightPennant.scoutingReport(clubId)
// returns the rotation starter, the last five results, this season's
// category leaders and the standing line; app.js renders it from the
// pennant dashboard and the match team picker (source-guarded).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pro-parks.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),{filename:file});

const league=new NightPennant('comets');
const oppId='foxes';
const fresh=league.scoutingReport(oppId);
assert(fresh,'report exists for a real club');
assert.equal(fresh.clubId,oppId);
assert(fresh.starter&&fresh.starter.pos==='P','starter is a pitcher');
assert.equal(fresh.starter,league.clubRoster(oppId).pitchers[league.starterIndexFor(oppId)],'starter follows the rotation');
assert.deepEqual(fresh.form,[],'no results yet');
assert(fresh.standing&&fresh.standing.wins===0,'standing line present');
assert.equal(league.scoutingReport('no-such-club'),null,'unknown club reports null');

// Play three rounds: form fills with chronological results.
for(let r=0;r<3;r++){
 const sim=league.simulate(league.fixture);
 league.completeRound({...sim,inning:sim.innings});
 if(r<2)league.next();
}
const played=league.scoutingReport(oppId);
assert(played.form.length>=1&&played.form.length<=5,'form holds up to five results');
for(const g of played.form){assert.equal(typeof g.win,'boolean');assert(g.opponent&&g.opponent!==oppId);assert(g.for>=0&&g.against>=0);}

// Leaders come from playerStats with sensible qualifiers.
league.playerStats[oppId+'/slugger']={name:'強打者',clubId:oppId,pos:'DH',pa:20,ab:18,h:9,hr:4,rbi:9,bb:2,doubles:1,triples:0,outs:0,k:0,runs:0};
league.playerStats[oppId+'/ace']={name:'エース',clubId:oppId,pos:'P',pa:0,ab:0,h:0,hr:0,rbi:0,bb:0,doubles:0,triples:0,outs:27,k:20,runs:2};
league.playerStats[oppId+'/wild']={name:'荒れ球',clubId:oppId,pos:'P',pa:0,ab:0,h:0,hr:0,rbi:0,bb:0,doubles:0,triples:0,outs:27,k:2,runs:9};
const led=league.scoutingReport(oppId).leaders;
assert.equal(led.hr.name,'強打者');assert.equal(led.hr.hr,4);
assert.equal(led.avg.name,'強打者','the .500 hitter leads the average board');
assert.equal(led.era.name,'エース','lowest ERA among qualified pitchers leads');

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('function scoutingModal'),'scouting modal exists');
assert(app.includes('data-league-action="scout"'),'pennant dashboard exposes the report');
assert(app.includes("case'scout':scoutingModal();"),'dashboard action is wired');
assert(app.includes("case'match-scout':scoutingModal(settings.matchOpponent);"),'match picker action is wired');
assert(app.includes('スカウティング'),'report is titled');

console.log('scouting-v117: all assertions passed');
