const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync('dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
const C=NightCareer,copy=data=>JSON.parse(JSON.stringify(data));
const newCareer=(style='contact')=>new C('試遊選手',C.schools[0],style,'L');
const seedCareer=c=>Object.assign(c,{seed:"regression-fixed"});
const make=(career,emit=()=>{})=>new NightGame(career.pitching?'career-pitch':'career-bat','casual',emit,career.gameOptions());

for(const national of NightTeams.international){
 const club=NightAPBCTournament.club(national.id);
 const pitcher=club.pitchers.at(-1),batter=club.batters.at(-1);
 const options={homeTeamId:club.id,arcadeRoster:true,pitcher:club.pitchers.indexOf(pitcher),practiceBatter:batter.id};
 for(const mode of ['practice','pitching','derby']){
  const g=new NightGame(mode,'standard',()=>{},options);
  assert.equal(g.teams.home.id,club.id);
  if(mode==='pitching')assert.equal(g.pitcher.id,pitcher.id);
  else assert.equal(g.batter.id,batter.id);
  if(mode==='derby'){
   const entries=g.derby.rounds[0].flatMap(m=>m.entrants);
   assert.equal(entries.length,8);
   assert.equal(entries.filter(e=>e.user).length,1);
   assert(entries.every(e=>e.club.id.startsWith('apbc-')));
  }
 }
}

const D=NightCareerDevelopment,L=NightCareerLeagues;
const restore=c=>C.restore(copy(c.save()));
function finish(c,good=true,format='quick'){
 const g=new NightGame(c.pitching?'career-pitch':'career-bat','casual',()=>{},c.gameOptions(format));
 const n=g.career.opportunities;
 g.career.completed=n;
 g.career.scoringBetweenAppearances=false;
 if(c.pitching)g.pitchingStats[C.id]=good?{outs:n*3,k:n*2,runs:0,bb:0}:{outs:n*3,k:0,runs:n*3,bb:n*2};
 else g.box[C.id]=good?{pa:n,ab:n,h:n,hr:n,rbi:n*3}:{pa:n,ab:n,h:0,hr:0,rbi:0,k:n};
 g.setPhase('ended');
 assert(c.complete(g));
 assert(!c.complete(g));
 return c.last;
}

const hitter=newCareer();
let g=make(hitter);
g.beginHalf();
assert.equal(g.batter.name,hitter.name);
g.balls=3;g.pitch.isStrike=false;g.take();
assert.equal(g.box[C.id].bb,1);
hitter.currentGame=copy(g.snapshot());
const resumed=restore(hitter);
g=NightGame.restore(resumed.currentGame,()=>{},resumed.gameOptions());
assert.equal(g.career.completed,1);
// The resumed match simulates the other batters and may end before the appearance cap.
for(let tick=0;tick<4000&&g.phase!=='ended';tick++){
 if(['windup','pitch'].includes(g.phase)){assert.equal(g.batter.id,C.id);g.strikes=2;g.strike(false);}
 g.update(50);
}
assert.equal(g.phase,'ended');
assert(resumed.complete(g));
assert(resumed.last.reasons.some(row=>row.text.includes('四球')));

const v29Career=seedCareer(newCareer());
const v29Game=make(v29Career);
v29Game.career.opportunities=4;
v29Game.career.completed=4;
v29Game.phase='career-field';
v29Career.currentGame=copy(v29Game.snapshot());
const carried=restore(v29Career);
const completedGame=NightGame.restore(carried.currentGame,()=>{},carried.gameOptions());
assert.equal(completedGame.phase,'result');
assert.equal(completedGame.career.opportunities,4);
completedGame.phaseTime=2000;completedGame.update(50);
assert.equal(completedGame.phase,'ended');
assert(carried.complete(completedGame));

const created=new C('試遊選手',C.schools[0],'contact','L','C');
assert.equal(created.player().pos,'C');
assert.equal(created.player().contact,46);
assert.equal(make(created).lineups.home.find(p=>p.id===C.id).fieldPos,'C');
assert.equal(newCareer('velocity').player().velocity,132);
const counts=new Set();
for(let round=0;round<4;round++){
 created.round=round;
 for(let cup=0;cup<2;cup++){
  created.cup=cup;
  counts.add(created.fixture.opportunities);
  assert.equal(restore(created).fixture.opportunities,created.fixture.opportunities);
 }
}
assert(counts.size>=2);
const updated=make(created);
updated.beginHalf();
updated.homeScore=5;
updated.career.completed++;
updated.beginCareerBat();
assert(updated.homeScore>=5);

const star=seedCareer(newCareer());
assert(star.setPlan('position','RF'));
for(let i=0;i<3;i++)finish(star);
assert(star.positions.includes('RF'));
assert(star.setPosition('RF'));
assert(star.setPlan('left','left'));
for(let i=0;i<3;i++)finish(star);
assert.equal(star.player().careerVsLeft,1);
assert(star.schoolResults.some(r=>r.label.includes('全国')));
for(let i=0;star.stage==='school'&&i<32;i++)finish(star);
assert.equal(star.stage,'draft');
assert.equal(star.draft.round,'ドラフト1位');
assert(!star.draft.offers);
const destination=star.draft.clubId;
assert(!star.signDraft(1));
assert(star.signDraft());
assert.equal(star.clubId,destination);
assert.equal(star.league,null);
const firstSeries=star.fixture.opponent;
assert.equal(star.league.totalGames,15);
assert.equal(star.fixture.seriesGame,1);
for(let i=0;i<4;i++){
 if(i<3)assert.equal(star.fixture.opponent,firstSeries);
 finish(star);
}
assert.equal(star.level,'farm');
const lastFarm=finish(star);
assert.equal(lastFarm.competition,'二軍・育成');
assert(lastFarm.table.rank>=1);
assert.equal(star.level,'bench');
assert(star.rival&&star.rivalStats.games>0);
assert(['pinch','defense'].includes(star.fixture.role));
for(let i=0;i<5;i++)finish(star);
assert.equal(star.level,'regular');
if(star.fixture)assert(star.fixture.opportunities>=2&&star.fixture.opportunities<=5);
assert(star.firstTeam.games);
for(let i=0;star.stage==='pro'&&i<26;i++){
 if(star.fixture.type==='playoffs')assert(star.gameOptions('extended').career.opportunities>star.fixture.opportunities);
 finish(star);
 assert(restore(star));
}
assert.equal(star.stage,'offseason');
assert(star.league.postseasonCompleted);
assert(star.awards.some(a=>a.label==='新人王'));
assert(star.apbcInvite);
assert(star.startAPBC());
assert.equal(star.gameOptions().clubs.home.batters[0].id,C.id);
let intl=star;
for(let i=0;i<4;i++){
 assert.equal(intl.stage,'apbc');
 finish(intl);
 intl=restore(intl);
}
assert.equal(intl.stage,'offseason');
assert.equal(intl.international.games,4);
assert(intl.apbcPrior.place>=1);
assert.equal(intl.firstTeam.games,10);
assert(intl.offers[0].locked);
assert(intl.acceptOffer(0));
for(let i=0;intl.stage==='pro'&&i<26;i++)finish(intl);
assert(intl.offers.some(o=>o.type==='トレード打診'));
assert(intl.counterOffer(0));
assert.equal(intl.counterOffer(0),null);
assert(intl.acceptOffer(0));
for(let i=0;intl.stage==='pro'&&i<26;i++)finish(intl);
assert(intl.offers.some(o=>o.type==='FA移籍'));
const first=intl.clubId;
assert(intl.acceptOffer(intl.offers.findIndex(o=>o.type==='FA移籍')));
assert.notEqual(intl.clubId,first);

const slow=seedCareer(newCareer());
for(let i=0;slow.stage==='school'&&i<32;i++)finish(slow,false);
assert.equal(slow.stage,'draft');
assert.equal(slow.draft.level,'trainee');
assert(slow.declineDraft('大学'));
for(let i=0;i<3;i++)finish(slow,true);
assert.equal(slow.stage,'draft');
assert(slow.signDraft());
assert.equal(slow.level,'farm');

const pitcher=newCareer('velocity');
assert(pitcher.setPlan('pitch','change'));
for(let i=0;i<3;i++)finish(pitcher);
assert(pitcher.pitches.includes('change'));
assert(pitcher.xp.movement>0||pitcher.skills.movement>pitcher.profile.skills.movement);
pitcher.stage='pro';pitcher.clubId='owls';pitcher.level='bench';pitcher.recent=[65];
pitcher.season=D.blank();
assert.equal(pitcher.fixture.role,'fireman');
g=make(pitcher);g.beginHalf();
assert(g.inning>=g.career.entryInning);
assert(g.career.simulatedPlates>0);
assert.equal(g.pitcher.id,C.id);
assert(g.pitcher.pitches.includes('change'));
let reliefOuts=0;
for(let i=0;i<4000&&g.phase!=='ended';i++){
 if(g.phase==='aim'){assert.equal(g.pitcher.id,C.id);g.strikes=2;g.strike(true);reliefOuts++;}
 g.update(50);
}
assert.equal(g.phase,'ended');
assert(pitcher.complete(g));
assert.equal(pitcher.season.outs,reliefOuts);
assert.equal(pitcher.season.k,reliefOuts);
pitcher.level='regular';
assert(pitcher.deployAs('closer'));
g=make(pitcher);g.beginHalf();
for(let i=0;i<4000&&g.phase!=='ended';i++){
 if(g.phase==='aim'){assert(g.inning>=g.career.entryInning);g.strikes=2;g.strike(false);}
 g.update(50);
}
assert(pitcher.complete(g));
assert(pitcher.season.saves<=1);

const old=newCareer();old.version=1;old.points=12;old.gameNumber=3;old.schoolYear=2;
old.schoolStats={games:7,pa:21,h:6,hr:2};
const migrated=restore(old);
const oldDraft=Object.assign(old,{stage:'draft',draft:{clubId:'owls',rating:70,round:'ドラフト2位',pay:270,level:'farm'}});
assert(C.restore(copy(C.restore(copy(oldDraft)).save())).signDraft());
const classic=newCareer();
const legacyGame=make(classic);
legacyGame.career={fixtureId:'school-1-0',pitching:false,completed:0,opportunities:3,label:'地区予選・初戦',
 scenarios:legacyGame.career.scenarios.slice(0,3)};
classic.version=1;
classic.currentGame=copy(legacyGame.snapshot());
const continuing=restore(classic);
assert.equal(continuing.fixture.id,'school-1-0');
const resumedClassic=NightGame.restore(continuing.currentGame,()=>{},continuing.gameOptions());
assert(resumedClassic);
resumedClassic.career.completed=3;
resumedClassic.setPhase('ended');
assert(continuing.complete(resumedClassic));
assert.equal(continuing.schoolStats.games,1);
assert.notEqual(continuing.fixture.id,'school-1-0');
assert.equal(migrated.schoolYear,2);
assert.equal(migrated.schoolStats.h,6);
assert.equal(migrated.schoolStats.tb,12);
assert.equal(migrated.xp.contact,60);
const before=slow.season.games;
assert(slow.skip());
assert.equal(slow.season.games,before+1);
assert.equal(L.random('same')(),L.random('same')());
assert(D.evaluate({...D.blank(),games:1,ab:2,pa:3,bb:1},false).reasons.some(r=>r.good&&r.text.includes('四球')));
const school=seedCareer(newCareer());
const Life=NightCareerLife;
assert(school.selectActivity('intense'));
assert(!school.selectActivity('rest'));
assert.equal(restore(school).planReport.text,school.planReport.text);
assert(school.setForm('legkick'));
assert.equal(school.familiarity,0);
assert(school.player().power>school.skills.power);
school.round=1;
const duel=make(school);
duel.beginHalf();assert.equal(duel.pitcher.name,school.duel.name);duel.endAtBat('single');
assert.equal(duel.career.rivalStats.h,1);
school.insight.left=24;
Life.postGame(school,school.fixture,{...D.blank(),games:1},true,{metrics:{leftHits:2,innerHits:3},rival:{pa:1,h:1}});
assert.equal(school.perks.left,1);
assert.equal(school.duel.h,1);
assert.equal(school.tendencies[school.fixture.opponent].inner,3);
school.injury=2;
const oldGames=school.schoolStats.games;
assert(school.missGame());
assert.equal(school.schoolStats.games,oldGames);

assert(intl.stage==='pro');
intl.stage='offseason';
intl.overseasInvite=true;
intl.wallet=100;
assert(intl.chooseCamp('coach'));
assert.equal(intl.wallet,35);
assert(!intl.chooseCamp('joint'));
assert(intl.goOverseas('pacific'));
for(let i=0;i<3;i++)finish(intl);
assert.equal(intl.stage,'overseas-result');
assert(intl.abroad.passed);
assert(intl.signOverseas());
for(let i=0;i<6;i++)finish(intl);
assert.equal(intl.stage,'overseas-result');
assert(intl.returnHome());
assert.equal(intl.abroadHistory.at(-1).stat.games,6);
intl.proYear=8;
assert(intl.retire());
const ob=Life.archive(intl);
assert.equal(ob.player.name,intl.name);
assert(ob.milestones.some(x=>x.text==='現役引退'));

console.log('PASS: APBC arcade, career saves, tournaments, training, single-club draft and retry, independent leagues, rivals, special abilities, injuries, camp, overseas, retirement and FA.');

const elite=new C('強豪テスト',C.schools[3],'power','R','1B');
const elitePitcher=new C('投手テスト',C.schools[4],'control','R','P');
assert.equal(C.schools.length,6);
assert.equal(elite.fixture.role,'inactive');
assert.equal(elitePitcher.fixture.role,'inactive');
assert.equal(elite.gameOptions(),null);
assert(elite.startSchoolTryout());
assert.equal(elite.fixture.type,'school-tryout');
assert(!elite.startSchoolTryout());
assert.equal(restore(elite).fixture.type,'school-tryout');
const eliteMatch=elite.gameNumber;
finish(elite);
assert.equal(elite.gameNumber,eliteMatch);
assert.equal(elite.schoolStats.games,0);
assert.equal(elite.fixture.role,'pinch');
assert(!elite.canSchoolTryout);
assert(elitePitcher.startSchoolTryout());
finish(elitePitcher);
assert.equal(elitePitcher.fixture.role,'school-relief');
assert.equal(elitePitcher.gameOptions().career.startInning,6);
elite.schoolTryouts=[];
const outside=new C('選外選手','東嶺学院','contact','R');
assert(outside.skip());
assert.equal(outside.schoolStats.games,0);
assert.equal(outside.last.absence,'メンバー外');
assert.equal(outside.last.stat.pa,0);
assert.equal(outside.schoolResults.length,1);
assert(restore(outside).schoolResults.length===1);
assert.equal(restore(elite).school,elite.school);
elite.season.games=2;
elite.recent=[82,77];
assert.equal(elite.fixture.role,'starter');
elite.season.games=3;
elite.recent.push(15);
assert.equal(elite.fixture.role,'pinch');
const standard=newCareer();
standard.seed=elite.seed;
let eliteMargin=0,standardMargin=0;
for(let year=1;year<=3;year++)for(let cup=0;cup<2;cup++)for(let round=0;round<4;round++){
 Object.assign(elite,{schoolYear:year,cup,round});
 Object.assign(standard,{schoolYear:year,cup,round});
 assert.notEqual(elite.fixture.opponentName,elite.school);
 const s=L.teamScore(standard,standard.fixture,D.blank());
 const e=L.teamScore(elite,elite.fixture,D.blank());
 eliteMargin+=e.own-e.opp;
 standardMargin+=s.own-s.opp;
}
assert(eliteMargin>standardMargin);
console.log('PASS: powerhouse entry, bench/regular selection, relief role, and stronger team results.');


const underdog=new C('弱小打線','青波高校','power','R','1B');
const underdogPitcher=new C('弱小投手','星南高校','control','R','P');
assert.equal(underdog.fixture.role,'starter');
assert.equal(underdog.battingSlot(underdog.fixture),1);
assert.equal(underdogPitcher.fixture.role,'rotation');
const district=new C('地区強豪','桜陵高校','contact','R','SS');
assert.equal(district.fixture.role,'inactive');
assert.equal(new C('地区外野','桜陵高校','contact','R','CF').fixture.role,'starter');

// Use the new grounds via the actual career fixture path, not just the ballpark selector.
for(const round of [0,1]){
 underdog.round=round;
 assert.equal(NightPlayers.parks.find(p=>p.id===underdog.gameOptions().park).corner,85);
}
underdog.schoolTryoutFor=underdog.fixture.id;
assert.equal(NightPlayers.parks.find(p=>p.id===underdog.gameOptions().park).corner,70);
underdog.schoolTryoutFor=null;
underdog.round=0;

let boosted=0,weakWins=0,strongWins=0;
const clean=D.blank(),productive={...clean,games:1,pa:4,ab:4,h:3,hr:1,tb:7,rbi:3};
const full={own:0,opp:0,inning:4,outs:1,rally:L.rallyStrength(productive.h,productive.tb,productive.rbi)};
const eliteStats=new C('強豪対照','東嶺学院','contact','R');
for(let i=0;i<300;i++){
 underdog.seed=eliteStats.seed='school-balance-'+i;
 const adverse=L.teamScore(underdog,underdog.fixture,clean);
 const great=L.teamScore(underdog,underdog.fixture,productive);
 const manualBoost=L.teamScore(underdog,underdog.fixture,productive,full);
 assert.equal(L.teamScore(underdog,underdog.fixture,clean,{...full,rally:0}).teammateHits,0);
 assert.equal(L.teamScore(eliteStats,eliteStats.fixture,productive,full).teammateHits,0);
 weakWins+=adverse.won;
 strongWins+=L.teamScore(eliteStats,eliteStats.fixture,clean).won;
 boosted+=great.teammateHits+manualBoost.teammateHits;
}
assert(boosted>0);
assert(strongWins>weakWins);
assert.equal(L.rallyStrength(0,0,0),0);

underdog.currentGame=null;
const opt=underdog.gameOptions();
opt.career.presentation=true;
const situations=[];
const featured=new NightGame('career-bat','standard',(type,event)=>{
 if(type==='career-ready')situations.push({inning:event.inning,outs:event.outs,score:event.homeScore});
},opt);
featured.beginHalf();
assert.equal(featured.phase,'career-ready');
assert.equal(situations.length,1);
const restoredFeatures=NightGame.restore(copy(featured.snapshot()),()=>{},opt);
assert.equal(restoredFeatures.phase,'career-ready');
assert(restoredFeatures.acknowledgeCareerAppearance());
assert.equal(restoredFeatures.phase,'windup');
assert(!restoredFeatures.acknowledgeCareerAppearance());
featured.acknowledgeCareerAppearance();
featured.endAtBat('hr',2);
assert(featured.career.pendingRally>1);
featured.beginCareerBat();
assert.equal(featured.phase,'career-ready');
assert.equal(situations.length,2);
assert(situations[1].inning>=situations[0].inning);

const mound=new C('登板前','北峰高校','control','R','P');
const moundOptions=mound.gameOptions();
moundOptions.career.presentation=true;
const moundGame=new NightGame('career-pitch','standard',()=>{},moundOptions);
moundGame.beginHalf();
assert.equal(moundGame.phase,'career-ready');
assert(moundGame.defending);
assert(moundGame.acknowledgeCareerAppearance());
assert.equal(moundGame.phase,'aim');
console.log('PASS: six school profiles, selection scrimmages, hidden weak-team batting lift, appearance gates, and compatible saves.');

const totalLine=(line)=>line.reduce((sum,run)=>sum+(run||0),0);
const broadcast=new C('中継表示','青波高校','contact','R','CF');
const broadcastOptions=broadcast.gameOptions();
Object.assign(broadcastOptions.career,{continuous:false,presentation:true,opportunities:2,scenarios:[
 {inning:3,outs:1,bases:1,home:0,away:2},
 {inning:7,outs:1,bases:2,home:2,away:1}
]});
const live=new NightGame('career-bat','standard',()=>{},broadcastOptions);
live.setPhase('career-pregame');
live.update(2000);
assert.equal(live.phase,'career-pregame');
live.setPhase('intro');
live.beginHalf();
assert.equal(live.phase,'career-ready');
assert.equal(live.home[3],null);
assert.equal(live.away[3],null);
assert.equal(totalLine(live.away),2);
live.acknowledgeCareerAppearance();
live.run();
live.run();
live.endAtBat('double',2);
assert.equal(live.career.atBats[0].moment,'同点打');
live.beginCareerBat();
assert.equal(live.phase,'career-ready');
assert.equal(live.inning,7);
assert(live.career.simulatedRuns.some(event=>event.side==='home'&&event.inning>=3&&event.inning<=7));
assert(live.career.simulatedRuns.every(event=>event.side!=='away'||event.inning>=4&&event.inning<=7));
assert.equal(totalLine(live.home),live.homeScore);
assert.equal(totalLine(live.away),live.awayScore);
const liveRestored=NightGame.restore(copy(live.snapshot()),()=>{},broadcastOptions);
assert.deepEqual(liveRestored.home,live.home);
assert.deepEqual(liveRestored.career.atBats,live.career.atBats);
const lines=L.teamScore(broadcast,broadcast.fixture,D.blank(),{
 own:live.homeScore,opp:live.awayScore,inning:live.inning,outs:live.outs,half:live.half,homeLine:live.home,awayLine:live.away
});
assert.equal(totalLine(lines.line.home),lines.own);
assert.equal(totalLine(lines.line.away),lines.opp);
assert.equal(lines.line.home[0],live.home[0]);

const oldLine=L.teamScore(broadcast,broadcast.fixture,D.blank(),{
 own:3,opp:3,inning:9,outs:3,half:'bottom',homeLine:[null,null,1],awayLine:[null,null,0]
});
assert(oldLine.extra);
assert.equal(oldLine.line.unknown.home,2);
assert.equal(oldLine.line.unknown.away,3);
assert.equal(totalLine(oldLine.line.home)+2,oldLine.own);
assert.equal(totalLine(oldLine.line.away)+3,oldLine.opp);
assert.notEqual(oldLine.line.home[9],oldLine.line.away[9]);

const simLine=L.teamScore(broadcast,broadcast.fixture,D.blank());
assert.equal(totalLine(simLine.line.home),simLine.own);
assert.equal(totalLine(simLine.line.away),simLine.opp);
console.log('PASS: scored innings, current inning, pinch entry history, saved out-of-play runs, old unknown innings, and extra innings.');


const university=newCareer();
university.stage='draft';
university.draft={clubId:null};
assert(university.declineDraft('大学'));
assert.equal(university.academy.universityYear,1);
for(let i=0;i<3;i++)finish(university);
assert(university.declineDraft('大学'));
assert.equal(university.academy.universityYear,2);
const oldUniversity=copy(university.save());
delete oldUniversity.academy.universityYear;
assert.equal(C.restore(oldUniversity).academy.universityYear,2);

const E=NightCareerExtras;
const social=newCareer();
const untouched=copy(social.skills);
const originalFixture=social.fixture.id;
assert(E.lifeAction(social,'event','festival','cafe'));
assert(!E.lifeAction(social,'event','festival','cafe'));
assert(E.lifeAction(social,'friend','yuto','meet'));
assert.equal(E.life(social).time,0);
assert(!E.lifeAction(social,'friend','yuto','date'));
assert(E.lifeAction(social,'next'));
assert(E.lifeAction(social,'friend','yuto','date'));
assert.equal(E.life(social).relationships.yuto.bond,'交際中');
assert.equal(social.fixture.id,originalFixture);
assert.deepEqual(social.skills,untouched);
assert(E.lifeAction(social,'next'));
social.schoolYear=2;
assert(E.lifeAction(social,'event','trip','sea'));
assert.equal(E.life(restore(social)).album.at(-1).photo,'coast');

Object.assign(social,{stage:'pro',clubId:'falcons',pay:100,level:'farm'});
assert.equal(E.life(social).money,100);
assert.equal(E.life(restore(social)).money,100);
assert(E.lifeAction(social,'event','reunion','invite'));
assert(E.lifeAction(social,'next'));
assert(E.lifeAction(social,'shop','open'));
assert(E.lifeAction(social,'shop','price','premium'));
assert(E.lifeAction(social,'shop','menu','cake'));
assert(E.lifeAction(social,'shop','serve'));
assert.equal(E.life(social).money,72+E.life(social).shop.sales);
assert(E.lifeAction(social,'money','save'));
assert.equal(E.life(social).saved,10);
assert(E.lifeAction(social,'home','sunny'));
social.clubId='comets';
assert.equal(E.life(social).homeCity,'高雄');
social.stage='retired';
assert(E.lifeAction(social,'after','cafe'));
assert.equal(E.life(restore(social)).after,'cafe');

const plan=newCareer();
assert(E.practiceWeekStart(plan,'challenge','contact'));
assert(!E.practiceWeekStart(plan,'team'));
assert(E.practiceAnswer(plan,E.practicePitch(plan).i,false,false));
assert.equal(E.book(plan).x.challenge.correct,0);
assert(E.practiceAnswer(plan,E.practicePitch(plan).i));
assert.equal(E.book(plan).x.challenge.correct,1);
assert(E.practiceAnswer(plan,null,true));
assert(!E.book(plan).x.challenge);
assert(E.practiceWeekStart(plan,'partner'));
assert.equal(E.teamTraining(plan),2);
assert(!E.practiceWeekStart(plan,'recovery'));
assert(E.book(restore(plan)).p.includes('partner'));

const recruiting=newCareer();
const agency=recruiting.scout()[0];
assert(E.practiceWeekStart(recruiting,'scout',agency.clubId));
const scoutStats={...D.blank(),games:1,h:2,tb:4,fieldOuts:1};
E.onGame(recruiting,recruiting.fixture,scoutStats,75);
E.onGame(recruiting,recruiting.fixture,scoutStats,75);
assert.equal(E.book(recruiting).x.scoutBoost[agency.clubId],9);
assert(E.practiceWeekStart(recruiting,'meeting','lineup'));
assert(E.onGame(recruiting,recruiting.fixture,scoutStats,75).length===0);
assert(E.onGame(recruiting,recruiting.fixture,scoutStats,75).length===1);
assert.equal(E.book(recruiting).x.roleTrust,3);
assert(E.autoFixtures(newCareer()).length>=1);
console.log('PASS: independent weekends, saved relationships and album, salary and shop, retirement, training choices, drills, scouting and coach goals.');
