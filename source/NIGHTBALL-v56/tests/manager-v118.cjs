// v118: CPU manager personalities. Each club has one stable type (hashed
// from its id) that scales relief hook thresholds, steal attempts, bunt
// probability and power-swing rate for the CPU-managed side. Online games
// (remoteSide) always use the balanced type because the opponent is human.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});

const allClubs=[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];
assert.equal(NightGame.managerFor('comets'),NightGame.managerFor('comets'),'type is stable per club');
assert.equal(NightGame.managerFor(null).id,'balanced','unknown club falls back to balanced');
assert.equal(NightGame.managerFor('').id,'balanced');
const types=new Set(allClubs.map(c=>NightGame.managerFor(c.id).id));
assert(types.size>=4,'clubs spread across at least four personalities: '+[...types].join(','));
const clubOfType=t=>allClubs.find(c=>NightGame.managerFor(c.id).id===t);
const quickClub=clubOfType('quick'),balancedClub=clubOfType('balanced');
assert(quickClub&&balancedClub,'quick and balanced clubs exist');

function matchGame(awayClub){
 const home=NightTeams.all[0].id===awayClub.id?NightTeams.all[1]:NightTeams.all[0];
 return new NightGame('match','standard',()=>{},{clubs:{home,away:awayClub},homeTeamId:home.id,awayTeamId:awayClub.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding});
}
// The game adopts the away (CPU-managed) club's personality.
assert.equal(matchGame(quickClub).cpuManager.id,'quick');
assert.equal(matchGame(balancedClub).cpuManager.id,'balanced');
{ // Online: the opponent is human, so no personality applies.
 const home=NightTeams.all[0];
 const g=new NightGame('match','standard',()=>{},{clubs:{home,away:quickClub},homeTeamId:home.id,awayTeamId:quickClub.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,remoteSide:'away'});
 assert.equal(g.cpuManager.id,'balanced','remote opponent keeps the balanced type');
}
// Relief: the same workload hooks a quick-hook starter but not a balanced one.
for(const [club,shouldHook] of [[balancedClub,false],[quickClub,true]]){
 const g=matchGame(club);
 const current=g.pitchingStaff[g.opponentSide][g.awayPitcherIndex];
 const rec=g.pitcherRecord(current);
 rec.pitches=current.role==='SP'?36:16;rec.runs=0;
 g.inning=2;
 const before=g.awayPitcherIndex;
 g.cpuRelief();
 assert.equal(g.awayPitcherIndex!==before,shouldHook,`${club.id} (${g.cpuManager.id}) relief decision`);
}
// Steals: with the roll fixed at .45, only the runner-type manager sends
// a fast runner (base chance .30, runner type .54, steady type .21).
function stealGame(type){
 const club=allClubs.find(c=>NightGame.managerFor(c.id).id===type&&Math.max(...NightGame.arrangeLineup(c).map(p=>p.run||0))>=74);
 assert(club,`${type} club with a fast lineup exists`);
 const g=matchGame(club);
 const runner=[...g.lineups.away].sort((a,b)=>(b.run||0)-(a.run||0))[0];
 g.half='top';g.inning=3;g.outs=0;g.balls=0;g.strikes=0;
 g.bases=[true,false,false];g.baseIds=[runner.id,null,null];g.basePitcherIds=[g.pitcher.id,null,null];
 g.setPhase('aim');
 const orig=Math.random;Math.random=()=>.45;
 try{assert(g.throwPitch(),'the user pitch is thrown');}finally{Math.random=orig;}
 return g.steal;
}
assert.equal(stealGame('runner'),true,'runner-type manager steals on a .45 roll');
assert.equal(stealGame('steady'),false,'steady-type manager holds the runner on a .45 roll');
assert.equal(stealGame('balanced'),false,'balanced manager holds the runner on a .45 roll');

const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('managerFor(club.id)'),'scouting report shows the manager type');

console.log('manager-v118: all assertions passed');
