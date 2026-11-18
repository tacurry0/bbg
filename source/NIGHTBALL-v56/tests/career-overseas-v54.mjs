import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';

globalThis.window=globalThis;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament',
 'derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 runInThisContext(readFileSync(new URL('../dist/'+file+'.js',import.meta.url),'utf8'),{filename:file+'.js'});
}
const {careerDashboardHTML}=await import('../dist/career-view.js');
const {NightCareer:C,NightCareerLife:Life,NightCareerLeagues:Leagues,NightGame:Game,NightTeams:Teams}=globalThis;
const domestic=new Set(Teams.all.flatMap(t=>[...t.batters,...t.pitchers].map(p=>p.id)));
const names=new Set();

function goAbroad(market,style='contact'){
 const career=new C('テスト選手','青波高校',style,'R');
 career.seed='overseas-v54';
 Object.assign(career,{clubId:'owls',stage:'offseason',level:'regular',overseasInvite:true});
 assert(career.goOverseas(market));
 return career;
}

for(const market of Object.keys(Life.foreign)){
 const career=goAbroad(market,market==='pacific'?'contact':'velocity');
 const mode=career.pitching?'career-pitch':'career-bat';
 for(let i=0;i<4;i++){
  const club=Life.foreignClub('career-foreign-'+market+'-'+i);
  for(const p of [...club.batters,...club.pitchers]){
   assert(!domestic.has(p.id));
   assert(!names.has(p.name));
   names.add(p.name);
  }
  assert(club.batters.every(p=>p.contact>=81&&p.power>=83&&p.field>=83));
  assert(club.pitchers.every(p=>p.velocity>=150&&p.control>=84&&p.movement>=87));
 }
 const options=career.gameOptions();
 const game=new Game(mode,'standard',()=>{},options);
 assert.equal((career.pitching?game.teams.home.pitchers:game.teams.home.batters)[0].id,C.id);
 assert([...game.lineups.away,...game.pitchingStaff.away].every(p=>p.id.startsWith('career-foreign-')));
 assert(Game.restore(JSON.parse(JSON.stringify(game.snapshot())),()=>{},options));
 assert.equal(Leagues.calendar(career).total,3);
 assert.match(careerDashboardHTML(career,()=>'', 'next'),/2\/10.*残り 3 試合/s);
 assert(career.skip());
 assert.equal(career.abroad.played,1);
 assert.notEqual(career.fixture.opponent,options.clubs.away.id);
 const schedule=careerDashboardHTML(career,()=>'', 'schedule');
 assert.match(schedule,/2\/14.*残り 2 試合/s);
 assert.match(schedule,/2\/18/);
 for(let i=0;i<2;i++)assert(career.skip());
 assert.equal(career.stage,'overseas-result');
 assert.match(careerDashboardHTML(career,()=>'', 'schedule'),/残り 0 試合/);
 career.abroad.passed=true;
 assert(career.signOverseas());
 assert.match(careerDashboardHTML(career,()=>'', 'next'),/4\/5.*残り 6 試合/s);
 for(let i=0;i<6;i++)assert(career.skip());
 assert.equal(career.stage,'overseas-result');
 assert.equal(Leagues.calendar(career).played,6);
 assert(career.returnHome());
 assert.equal(career.clubId,'owls');
}

const abroad=goAbroad('pacific');
const options=abroad.gameOptions(),player=abroad.player(),own=Teams.get('owls'),opp=Teams.get('foxes');
const oldOwn={...own,batters:[player,...own.batters],startingOrder:[C.id,...own.startingOrder.slice(0,8)]};
const old=new Game('career-bat','standard',()=>{},{
 ...options,clubs:{home:oldOwn,away:opp},order:oldOwn.startingOrder,fielding:{}
});
old.half='top';
old.inning=4;
old.homeScore=2;
old.balls=2;
old.bases[0]=true;
old.baseIds[0]=old.lineups.away[1].id;
old.basePitcherIds[0]=old.pitcher.id;
old.box[old.baseIds[0]]={h:2};
old.pitchingStats[old.pitcher.id]={outs:7};
old.startField(35,20,.4,true);
abroad.currentGame={...JSON.parse(JSON.stringify(old.snapshot()))};
const saved=C.restore(JSON.parse(JSON.stringify(abroad.save())));
const resumed=Game.restore(saved.currentGame,()=>{},saved.gameOptions());
assert.equal(resumed.inning,4);
assert.equal(resumed.homeScore,2);
assert.equal(resumed.balls,2);
assert(resumed.lineups.away.some(p=>p.id===resumed.baseIds[0]));
assert(resumed.baseIds[0].startsWith('career-foreign-'));
assert.equal(resumed.box[resumed.baseIds[0]].h,2);
assert.equal(resumed.pitchingStats[resumed.pitcher.id].outs,7);
assert(resumed.field.runners.some(r=>r.id===resumed.baseIds[0]));
assert(Game.restore(JSON.parse(JSON.stringify(resumed.snapshot())),()=>{},options));

const school=new C('学校テスト','東嶺学院','contact','R');
assert.equal(Leagues.calendar(school).next,'7/12');
assert(Leagues.calendar(school).limit);
assert(school.startSchoolTryout());
assert.equal(Leagues.calendar(school).next,'7/9');
const pro=goAbroad('pacific');
Object.assign(pro,{stage:'pro',abroad:null});
const regular=Leagues.calendar(pro);
assert.equal(regular.total,15);
assert.equal(regular.next,'3/27');
assert.equal(regular.rows[2].date,'3/29');
assert(pro.skip());
assert.equal(Leagues.calendar(pro).played,1);
assert.equal(Leagues.calendar(pro).next,'3/28');

console.log('PASS: eight strong fictional clubs; camp and season dates; overseas checkpoint migration; school and pro calendars.');
