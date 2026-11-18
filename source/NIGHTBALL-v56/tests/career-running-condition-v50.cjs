const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const name of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game',
 'career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync('dist/'+name+'.js','utf8'),{filename:name+'.js'});
}
const makeCareer=()=>Object.assign(new NightCareer('走塁テスト','青波高校','contact','L','LF'),{seed:'runner-v50'});
const copy=x=>JSON.parse(JSON.stringify(x));
const career=makeCareer();
assert.equal(career.condition,0);
career.fatigue=85;career.morale=43;
assert(career.condition<0);
assert.equal(career.suggestedActivity(),'rest');
assert(career.selectActivity('rest'));
assert(career.condition>=0);
const afterRest=career.fatigue;
assert(NightCareerExtras.lifeAction(career,'relax'));
assert(career.fatigue<afterRest);
assert.equal(NightCareerExtras.lifeAction(career,'relax'),null);
const drill=NightCareerExtras.quickDrill(career);
assert.match(drill.title,/チャレンジ結果 \d\/5/);
assert.equal(NightCareerExtras.quickDrill(career),null);
const old=copy(career.save());delete old.manualRunning;delete old.morale;
assert.equal(NightCareer.restore(old).manualRunning,false);
assert.equal(NightCareer.restore(old).morale,50);

const lineSum=line=>line.reduce((n,x)=>n+(x||0),0);
for(const manual of [true,false]){
 const c=makeCareer();c.manualRunning=manual;c.morale=85;
 const f=c.fixture;c.coachOrder={fixture:f.id,slot:0};
 const options=c.gameOptions();
 const g=new NightGame('career-bat','standard',()=>{},options);
 g.beginHalf();
 assert.equal(g.manualRunning,manual);
 assert.equal(g.conditionFor(g.batter),2);
 assert(g.matchup().contact>g.batter.contact);
 assert.equal(g.inning,1);
 assert.equal(g.outs,0);
 assert(!g.bases.some(Boolean));
 assert.equal(g.battingIndex[g.userSide],0);
 assert(g.career.simulatedPlates>=3);
 g.seedRunners(1,0);
 const teammate=g.baseIds[0];
 g.startField(33,6,.32,false);
 assert.equal(g.manualPlay,manual);
 assert.equal(g.canControlRunner(teammate),false);
 assert.equal(g.commandRunner(teammate,2),false);
 assert.equal(g.commandRunner(NightCareer.id,1),manual);
 assert.equal(g.commandRunners('advance'),manual);
 const recovered=NightGame.restore(copy(g.snapshot()),()=>{},options);
 assert.equal(recovered.manualPlay,manual);
 // The walk is followed by unseen match simulation, not by the next batter's rendered play.
 g.field=null;g.prepare();g.seedRunners(0,0);
 g.balls=3;g.pitch.isStrike=false;g.take();
 const previous=g.career.simulatedPlates;
 const restored=NightGame.restore(copy(g.snapshot()),()=>{},options);
 while(g.phase==='result')g.update(100);
 while(restored.phase==='result')restored.update(100);
 assert(['windup','ended'].includes(g.phase));
 assert.equal(g.field,null);
 assert(g.career.simulatedPlates>previous);
 assert.equal(g.box[NightCareer.id].bb,1);
 assert.deepEqual(g.baseIds,restored.baseIds);
 assert.deepEqual(g.home,restored.home);
 assert.deepEqual(g.away,restored.away);
 g.advanceCareer(true);
 assert.equal(g.phase,'ended');
 assert.notEqual(g.homeScore,g.awayScore);
 assert.equal(lineSum(g.home),g.homeScore);
 assert.equal(lineSum(g.away),g.awayScore);
 assert(c.complete(g));
 assert.equal(c.last.score.own,g.userScore);
 assert.equal(c.last.score.opp,g.opponentScore);
}

for(const away of [false,true]){
 for(const slot of [0,1,2]){
  const c=makeCareer();
  c.coachOrder={fixture:c.fixture.id,slot};
  const options=c.gameOptions();
  if(away){
   options.userHome=false;
   options.clubs={home:options.clubs.away,away:options.clubs.home};
  }
  const game=new NightGame('career-bat','standard',()=>{},options);
  game.beginHalf();
  assert.equal(game.inning,1);
  assert.equal(game.half,away?'top':'bottom');
  assert.equal(game.battingIndex[game.userSide],slot);
  assert(game.outs+game.bases.filter(Boolean).length+game.userScore<=slot);
  if(away)assert.equal(game.career.simulatedPlates,slot);
 }
}
let stronger=0,weaker=0;
for(let seed=0;seed<20;seed++){
 for(const ability of [28,85]){
  const c=makeCareer();c.seed='roster-strength-'+seed;
  const options=c.gameOptions();
  options.clubs.home={...options.clubs.home,batters:options.clubs.home.batters.map(p=>({...p,contact:ability,power:ability}))};
  const match=new NightGame('career-bat','standard',()=>{},options);
  match.advanceCareer(true);
  if(ability===85)stronger+=match.homeScore;else weaker+=match.homeScore;
 }
}
assert(stronger>weaker+30);

const pupil=makeCareer();
const E=NightCareerExtras;
assert.equal(E.followingEvent(pupil).kind,'training');
assert(E.resolveEpisode(pupil,'live').continuing);
assert.equal(E.followingEvent(pupil).kind,'drill');
assert(E.resolveEpisode(pupil,'1'));
const target=pupil.eventGoal;
const coached=new NightGame('career-bat','standard',()=>{},pupil.gameOptions());
coached.beginHalf();
coached.pitch.id='slider';coached.pitch.isStrike=false;coached.take();
assert.deepEqual(coached.career.metrics.training,{attempts:1,success:1});
coached.pitch.logged=false;coached.take();
assert.equal(coached.career.metrics.training.success,2);
assert(E.trainingReport(pupil,pupil.fixture,coached.career.metrics).some(s=>s.includes('課題達成')));
assert.equal(target.mode,'intense');
// Re-enter progress between fixtures to see the continuing event without visiting a submenu.
assert(pupil.skip());
assert.equal(E.followingEvent(pupil).id,'photo-walk');
assert(E.resolveEpisode(pupil,'photo'));
assert(pupil.skip());
assert.equal(E.followingEvent(pupil).id,'photo-invite');
assert(E.resolveEpisode(pupil,'exhibit'));
assert(E.episodes(pupil).history.some(e=>e.choice==='一緒に展示する'));
console.log('PASS: ability-driven career match, no base-running turn after the plate, persisted situation, batting and life events.');
