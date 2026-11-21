const assert=require('node:assert/strict');
global.window=global;
const modules=['ratings-data','players','pro-parks','pennant','npb-postseason','npb-data','npb-rosters','kbo-data','kbo-rosters',
 'career-leagues','career-development','career-life','career-extras','career','game',
 'career-world-data','career-world-identities','career-world-leagues','career-world-international','career-world-school','career-world-match','career-world-save','career-world-success','career-world','career-world-slots','career-world-view'];
for(const file of modules)require('../dist/'+file+'.js');
const D=NightCareerWorldData,L=NightCareerWorldLeagues,M=NightCareerWorldMatch,W=NightCareerWorld,Z=NightCareerWorldSuccess,Slots=NightCareerWorldSlots;
const countries=['jp','tw','kr'];
const fresh=(country,extra={})=>new W({country,name:{jp:'早瀬 悠馬',tw:'陳承翰',kr:'キム・ハジュン'}[country],
 region:D.countries[country].region[0],style:'contact',schoolIndex:1,schoolTier:1,
 difficulty:'easy',short:true,seed:'career-test-'+country,...extra});
const roundtrip=w=>{
 const text=NightCareerWorldSave.encode(w),restored=W.restore(NightCareerWorldSave.decode(text));
 assert(restored);assert.equal(restored.day,w.day);assert.equal(restored.active?.id,w.active?.id);
 assert.equal(JSON.stringify(restored),JSON.stringify(w));
 return restored;
};
function enrollment(w){
 const tests={jp:'夏の地方大会',tw:'中信盃黑豹旗',kr:'鳳凰大旗'};
 let days=0;
 while(w.stage==='school'&&days++<100){
  w.run('season');
  if(w.queue)assert(w.finishDay());
 }
 assert.equal(w.stage,'draft');assert.equal(w.grade,3);
 assert(w.schoolHistory.some(x=>x.name.includes(tests[w.country])));
 return w;
}
function draft(w){
 if(!w.draftApply(true))throw Error('not at draft');
 w.draftReveal(false);
 assert.equal(w.draft.visible,D.roster(w.country).length);
 w=roundtrip(w);
 w.draftReveal(true);
 for(const p of w.draft.picks)assert.equal(w.clubCountry(p.club),w.country);
 if(!w.draft.offer){
  assert(w.amateur('大学'));w.run('season');assert.equal(w.stage,'draft');
  w.draftApply(true);w.draftReveal(true);
 }
 assert(w.signDraft());assert.equal(w.playingCountry,w.country);assert.equal(w.proYear,1);
 const drafted=w.draft.picks.filter(p=>p.id!==w.player.id);
 assert(drafted.every(p=>w.person(p.id)?.club===p.club&&w.person(p.id).draftRecord?.round===p.round));
 assert.equal(new Set(w.draft.picks.map(p=>p.id)).size,w.draft.picks.length);
 return w;
}
function season(w){
 const initial=w.history.length;
 let i=0;
 while(w.stage==='pro'&&i++<50){
  w.run('season');
  if(w.queue)assert(w.finishDay());
 }
 assert.equal(w.stage,'offseason');assert.equal(w.history.length,initial+1);
 return w;
}
function nextYear(w){
 const old=w.year;
 if(!w.stay()){
  const same=w.offers.findIndex(o=>o.club===w.club);
  assert(w.accept(same>=0?same:0));
 }
 assert.equal(w.year,old+1);
}
// Protect the first controllable appearance even on a high-tier school and hard difficulty.
for(const country of countries){
 const w=fresh(country,{schoolTier:2,difficulty:'hard',style:country==='kr'?'control':'contact'});
 for(let grade=1;grade<=3;grade++){
  while(w.stage==='school'&&w.grade===grade){
   w.run('season');
   if(!w.active)continue;
   if(w.active.development){
    assert.equal(w.grade,grade);
    const before=w.active.id;
    w.run('game');w.run('event');w.run('day');w.run('season');
    assert.equal(w.active.id,before);
    const options=w.liveOptions('key');
    assert(options);
    const game=new NightGame(w.pitching?'career-pitch':'career-bat','standard',()=>{},options);
    for(let tick=0;tick<220&&game.phase!=='career-ready';tick++)game.update(50);
    assert.equal(game.phase,'career-ready',country+' grade '+grade+' never received a live appearance');
    assert(game.acknowledgeCareerAppearance());
    if(w.pitching){
     assert(game.throwPitch());
    }else{
     for(let tick=0;tick<60&&game.phase==='windup';tick++)game.update(50);
     assert(game.swing());
    }
   }
   assert(w.finishDay());
  }
 }
 assert.equal(Object.keys(w.schoolPlay).length,3);
}
// Change a live full game without replacing its box score, lineup, count or save slot.
{
 const w=fresh('jp');
 for(const key of M.batting)w.player[key]=98;
 w.run('game');
 const full=w.liveOptions('full'),self=w.liveOptions('self');
 const g=new NightGame('match','standard',()=>{},full);
 const id=w.player.id,slot=g.lineups[g.userSide].findIndex(p=>p.id===id);
 assert(slot>=0);
 const awayBefore=g.away.slice();
 g.inning=4;g.half=g.userHome?'bottom':'top';g.battingIndex[g.userSide]=slot;
 g[g.userSide][3]=2;g[g.userSide+'Score']=2;
 g.batterStats().pa=6;g.batterStats().ab=6;g.batterStats().h=2;
 g.seedRunners(1,1);g.balls=2;g.strikes=1;
 const runner=g.baseIds[0],pitcher=g.pitcher.id;
 g.setPhase('windup');g.pitch={delivered:false};
 assert(g.switchWorldBatting(self.career));
 assert.equal(g.phase,'career-ready');
 assert.equal(g.batter.id,id);assert.equal(g.pitcher.id,pitcher);
 assert.equal(g.inning,4);assert.equal(g.outs,1);
 assert.equal(g.balls,2);assert.equal(g.strikes,1);
 assert.equal(g.baseIds[0],runner);
 assert.equal(g.userScore,2);
 if(g.userHome)assert.deepEqual(g.away,awayBefore);
 assert.equal(g.box[id].h,2);assert.equal(g.career.completed,6);
 assert(!g.canSwitchWorldBatting(id));
 const restored=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{},self);
 assert.equal(restored.phase,'career-ready');assert.equal(restored.balls,2);
 assert.equal(restored.box[id].pa,6);assert.equal(restored.career.opportunities,null);
 assert(restored.acknowledgeCareerAppearance());
 restored.endAtBat('single');
 restored.advanceCareer(true);
 assert.equal(restored.phase,'ended');
 assert(restored.box[id].pa>=7);assert(restored.box[id].h>=3);
 assert(w.completeLive(restored));assert(!w.completeLive(restored));
}
{
 const w=fresh('tw',{schoolTier:2,difficulty:'hard'});
 w.run('game');
 const full=w.liveOptions('full'),self=w.liveOptions('self');
 const g=new NightGame('match','standard',()=>{},full);
 g.setPhase('result');
 assert(g.switchWorldBatting(self.career));assert.equal(g.mode,'match');
 const restored=NightGame.restore(JSON.parse(JSON.stringify(g.snapshot())),()=>{},full);
 assert.equal(restored.mode,'match');assert.equal(restored.pendingWorldBatting.playerId,w.player.id);
 for(let i=0;i<30&&restored.mode==='match';i++)restored.update(50);
 assert.equal(restored.phase,'career-ready');
 assert.equal(restored.batter.id,w.player.id);
 assert.equal(restored.pendingWorldBatting,undefined);
 if(restored.career.pinching){
  assert(restored.removedPlayers[restored.userSide].length);
  assert.equal(restored.substitutions.at(-1).inId,w.player.id);
 }
 const normal=new NightGame('match','standard',()=>{});
 assert(!normal.switchWorldBatting(self.career));
}
const detail=fresh('jp');
for(const place of [null,undefined,0,3]){
 detail.schoolEvents[6]={place};
 assert.equal(NightCareerWorldSchool.eligible(detail,'top:6'),false);
}
detail.schoolEvents[6]={place:2};
assert(NightCareerWorldSchool.eligible(detail,'top:6'));
assert(!NightCareerWorldSchool.eligible(detail,'win:6'));
const rosterCheck=fresh('kr');rosterCheck.ensurePro();
assert.equal(Object.keys(NightCareerWorldIdentities).length,900);
assert.equal(rosterCheck.person('kbo-ht-b-52605').nation,'kr');
assert.equal(rosterCheck.person('kbo-ht-b-56626').registration,'foreign');
assert.equal(rosterCheck.person('kbo-hh-p-56719').registration,'asian');
assert.equal(rosterCheck.person('kbo-hh-p-56719').nation,'tw');
assert.equal(rosterCheck.person('falcons-p4').nation,'jp');
assert.equal(rosterCheck.registrationFor(rosterCheck.person('falcons-p4'),'tw'),'domestic');
assert(rosterCheck.people.filter(p=>p.real).every(p=>['domestic','foreign','asian'].includes(p.registration)));
const old=JSON.parse(JSON.stringify(rosterCheck));old.version=1;
old.people.find(p=>p.id==='kbo-ht-b-52605').nation='other';
assert.equal(W.restore(old).person('kbo-ht-b-52605').nation,'kr');
for(const short of [true,false]){
 const counts={};
 for(const [day,games] of Object.entries(L.schedules(2032,short))){
  assert.match(day,/^2032-/);
  const sameDay=games.flatMap(g=>[g.home,g.away]);
  assert.equal(sameDay.length,new Set(sameDay).size);
  for(const id of sameDay)counts[id]=(counts[id]||0)+1;
 }
 assert.equal(Object.keys(counts).length,28);
 for(const [id,expected] of Object.entries(short?{jp:22,tw:20,kr:18}:{jp:143,tw:120,kr:144})){
  for(const club of D.roster(id))assert.equal(counts[club.id],expected);
 }
 assert.equal(counts['npb-a'],undefined);assert.equal(counts['npb-v'],undefined);
}
// A prospect who was not drafted still has a complete lineup at their new school.
{
 const w=enrollment(fresh('tw',{schoolTier:0,style:'velocity',seed:'undrafted-amateur'}));
 assert(w.draftApply(true));w.draftReveal(true);
 assert(w.amateur('大学'));
 assert(w.player.club.startsWith('amateur-'));
 w.run('season');
 assert.equal(w.stage,'draft');assert.equal(w.academyGames,3);
 assert(w.schoolHistory.some(row=>row.name==='大学 リーグ戦'));
 assert.equal(D.countries.jp.region.length,47);
}
// Success-style weekly choice, training with multiple answers, story branching and save/load.
{
 const w=fresh('jp');
 assert(Z.available(w));
 const old=w.player.contact,energy=Z.state(w).energy;
 assert(Z.action(w,'practice'));
 assert(Z.skill(w,'contact'));
 assert.equal(Z.state(w).pending,null);
 assert.equal(Z.state(w).actionWeek,Z.week(w));
 assert(w.player.contact!==old);
 assert.equal(Z.state(w).goal.skill,'contact');
 assert(Z.state(w).energy<energy);
 assert(!Z.action(w,'rest'));
 const saved=roundtrip(w);
 assert.equal(saved.success.stories.length,1);
 assert.match(saved.success.last.title,/通常練習/);
 saved.advanceDate('2027-04-12');
 assert(Z.available(saved));
 assert(Z.action(saved,'friend'));
 assert(saved.success.pending?.type==='story');
 const previous=saved.ratings.trust;
 assert(Z.choose(saved,0));
 assert(saved.ratings.trust>=previous);
 assert.equal(saved.success.stories.length,2);
 assert(!Z.available(saved));
 const kr=fresh('kr',{style:'control'});
 assert(Z.action(kr,'special'));assert(Z.skill(kr,'control'));
 for(let i=0;i<3;i++){
  assert(Z.currentQuestion(kr)?.[1].length===3);
  assert(Z.choose(kr,i));
 }
 assert.equal(kr.success.last.title,'実戦特訓 · 制球');
 assert.equal(kr.success.actionWeek,Z.week(kr));
 const tw=fresh('tw');
 assert(Z.action(tw,'rest'));
 assert.equal(tw.success.actionWeek,Z.week(tw));
 assert(tw.success.energy>76);
}
// Three independent player slots: migrate the legacy key without deleting it.
{
 const mem=new Map();
 global.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,
  setItem:(k,v)=>{mem.set(k,String(v));},removeItem:k=>mem.delete(k)};
 const original=fresh('jp'),oldSave=NightCareerWorldSave.encode(original);
 localStorage.setItem(W.key,oldSave);
 assert.equal(Slots.load().name,original.name);
 assert.equal(localStorage.getItem(Slots.key(0)),oldSave);
 assert.equal(Slots.list().slots.length,1);
 const second=fresh('tw'),third=fresh('kr');
 assert(Slots.create(second,1));
 assert.equal(Slots.list().active,1);
 assert(Slots.create(third,2));
 assert.equal(Slots.list().slots.length,3);
 assert(!Slots.create(fresh('jp')));
 assert.equal(Slots.open(0).country,'jp');
 assert.equal(Slots.load().seed,original.seed);
 assert.equal(Slots.open(1).country,'tw');
 assert.equal(Slots.open(2).country,'kr');
 assert.equal(localStorage.getItem(Slots.key(0)),oldSave);
 // Never load or overwrite a corrupted player slot through a mistaken selection.
 const encoded=localStorage.getItem(Slots.key(1));
 localStorage.setItem(Slots.key(1),'bad data');
 assert.equal(Slots.open(1),null);
 assert.equal(Slots.list().active,2);
 localStorage.setItem(Slots.key(1),encoded);
 delete global.localStorage;
}
// A two-title winner starts the next season in the first team, with bounded luck.
{
 const w=fresh('jp');
 w.ensurePro();
 const club=D.roster('jp')[0].id;
 w.club=club;w.player.club=club;w.stage='pro';
 w.history=[{year:2027,club,awards:['首位打者','本塁打王'],stats:{...M.blank(),pa:500,ab:470,h:172,hr:40}}];
 w.startSeason(2028);
 assert.equal(w.selection?.level,'first');
 assert.match(w.selection.reason,/首位打者・本塁打王/);
 assert.equal(w.fortune.year,2028);
 assert(Math.abs(w.fortune.swing)<=17);
 const first=M.lineup(w,club,'jp',w.day);
 assert(!['inactive','bench'].includes(first.usage),first.usage);
 assert(M.positionScore(w,w.player,w.player.pos,'jp')>w.ability(w.player));
 let rising=false,falling=false;
 for(let year=2028;year<=2060;year++){
  const rand=w.random('player-season-fortune/'+year);
  const luck=Math.round((rand()+rand()+rand()-1.5)*11);
  rising ||=luck>0;falling ||=luck<0;
 }
 assert(rising&&falling,'fortune must have both high and low outcomes');
}
// Match results can unlock a unique story without destroying the player's progress.
{
 const w=fresh('jp');
 Z.afterGame(w,{kind:'school'},{g:1,h:2,hr:1,sv:0,k:0});
 assert.equal(w.success.inbox?.id,'first-home-run');
 assert(Z.openEvent(w));
 assert(Z.choose(w,0));
 assert(w.success.stories.some(row=>row.title==='記念すべき一発'));
}
const worlds={};
for(const country of countries){
 let w=fresh(country);
 assert.equal(w.day,'2027-'+D.countries[country].start);
 while(!w.queue&&w.stage==='school')w.run('day');
 assert(w.queue);
 w=roundtrip(w);assert(w.finishDay());assert.equal(w.finishDay(),false);
 w=draft(enrollment(w));
 w.run('game');assert(w.queue);
 w=roundtrip(w);
 const f=w.active,option=w.liveOptions('full');
 assert(option);assert.equal(option.worldFixture,f.id);
 const game=new NightGame('match','standard',()=>{},option);
 game.homeScore=1;game.inning=9;game.finish();
 const restored=NightGame.restore(JSON.parse(JSON.stringify(game.snapshot())),()=>{},option);
 assert.equal(restored.worldFixture,f.id);
 assert(w.completeLive(restored));assert.equal(w.completeLive(restored),false);
 w=season(w);
 assert.deepEqual(Object.keys(w.lastWin.champions).sort(),countries.slice().sort());
 assert.equal(w.post.asia.games.length,4);
 assert(w.post.asia.clubs.includes(w.post.asia.winner));
 assert(Object.values(w.post.champions).every(id=>w.post.asia.clubs.includes(id)));
 assert(w.post.series.japan[0].winner);
 assert(w.post.series.tw[1].winner);
 assert(w.post.series.kr[3].winner);
 assert(w.people.some(p=>p.history.length&&p.real));
 assert(w.people.every(p=>!p.club||typeof p.club==='string'));
 worlds[country]=roundtrip(w);
}
// A strong player club can qualify through its own real bracket.
for(const nation of countries){
 const w=draft(enrollment(fresh(nation,{seed:'championship-route-'+nation})));
 for(const p of w.members(w.club)){
  if(p.pos==='P'){p.velocity=161;p.control=97;p.movement=97;p.stamina=95;}
  else for(const key of M.batting)p[key]=96;
 }
 do{
  w.run('season');
  if(w.active?.kind==='asia')break;
  if(w.queue)w.finishDay();
 }while(w.stage==='pro');
 assert.equal(w.post.champions[nation],w.club);
 assert.equal(w.active?.kind,'asia');
 const a=roundtrip(w);
 assert(a.active.id.includes('/asia/'));
 season(a);
 assert(a.history.at(-1).champion);
}
// Draw rules and seeding in the domestic brackets and Asia Series.
const tbl=L.tables();
for(const league of countries)D.roster(league).forEach((c,i)=>{
 Object.assign(tbl[c.id].all,{w:30-i,l:i+6});
 Object.assign(tbl[c.id].first,{w:20-i,l:i+3});
 Object.assign(tbl[c.id].second,{w:20-i,l:i+3});
});
const post=L.createPost(tbl);
assert.equal(post.both,true);
assert.equal(post.series.tw[0].credit,0);
const next=L.fixtures(post,2030,'2030-10-06');
assert(next.some(f=>f.series==='kr'&&f.home===post.kr[3].id));
for(const f of next)if(f.series==='kr')L.recordPost(post,f,{home:0,away:0,inning:12});
assert.equal(post.series.kr[0].winner,post.kr[3].id);

// Korean extra games replace a draw instead of crowning a team below the required wins.
{
 const same=L.createPost(tbl);
 const kr=()=>L.fixtures(same,2031,'2031-10-10').find(f=>f.series==='kr');
 let f=kr();
 L.recordPost(same,f,{home:1,away:0,inning:9});
 for(let i=0;i<5;i++){
  f=kr();
  assert.equal(f.maxInnings,15);
  L.recordPost(same,f,i===0?{home:0,away:0,inning:15}:{home:i%2,away:1-i%2,inning:9});
 }
 const s=same.series.kr.at(-1);
 assert.equal(s.winner,null);
 f=kr();
 assert.match(f.name,/再試合/);
 assert.equal(f.home,s.games[0].homeId);
 L.recordPost(same,f,{home:1,away:0,inning:9});
 assert(s.winner);
}
{
 const same=L.tables(),twClubs=D.roster('tw');
 for(const [i,c] of twClubs.entries()){
  Object.assign(same[c.id].all,{w:11-i,l:9+i});
  Object.assign(same[c.id].first,{w:i<=1?7:4-i%3,l:i<=1?3:6+i%3});
  Object.assign(same[c.id].second,{w:i===0?8:3,l:i===0?2:7});
 }
 const tournament=L.createPost(same);
 assert.equal(tournament.series.tw.length,0);
 const f=L.fixtures(tournament,2031,'2031-10-10').find(f=>f.series==='tw-tiebreak');
 assert.equal(f.maxInnings,null);
 assert.match(f.name,/前期/);
 L.recordPost(tournament,f,{home:8,away:3,inning:9});
 assert.equal(tournament.halves[0],f.home);
}
// Competition is based on the real club depth. Strong recent performances and
// an unavailable incumbent can actually change the selected lineup.
const jp=worlds.jp;
const source=jp.club;
const pos=jp.player.pos;
const incumbent=jp.members(source).filter(p=>p.id!==jp.player.id&&p.pos===pos)
 .sort((a,b)=>jp.ability(b)-jp.ability(a))[0];
assert(incumbent);
for(const key of M.batting)jp.player[key]=43;
jp.player.stats=M.blank();
incumbent.injury=0;
assert(M.positionScore(jp,incumbent,pos,'jp')>M.positionScore(jp,jp.player,pos,'jp'));
for(const key of M.batting)jp.player[key]=79;
Object.assign(jp.player.stats,{pa:82,ab:74,h:31,tb:56,hr:8,bb:8});
incumbent.injury=35;
assert(M.positionScore(jp,incumbent,pos,'jp')<M.positionScore(jp,jp.player,pos,'jp'));
assert(Object.values(M.lineup(jp,source,'jp',jp.day).assign).includes(jp.player.id));

// Farm quality changes selection even if skills and representative registration are fixed.
{
 const w=roundtrip(worlds.jp);
 w.stage='pro';
 w.player.stats=M.blank();
 w.farmStats=M.blank();
 w.recentFarm=[];
 const before=M.positionScore(w,w.player,w.player.pos,'jp');
 Object.assign(w.farmStats,{pa:65,ab:54,h:27,bb:11,hr:9,rbi:26,tb:61});
 w.recentFarm=[{...w.farmStats}];
 assert(M.farmForm(w)>20);
 assert(M.positionScore(w,w.player,w.player.pos,'jp')>before+20);
 w.selection={level:'farm'};
 w.selectionChange({day:w.day},'starter');
 assert.match(w.selection.reason,/二軍での好成績/);
 const pitcher=fresh('kr',{style:'control'});
 pitcher.stage='pro';
 Object.assign(pitcher.farmStats,{outs:72,er:5,k:29,walks:5});
 const command=M.farmForm(pitcher);
 pitcher.farmStats.walks=28;
 assert(command>M.farmForm(pitcher));
}
// A released NPB farm player can go to Taiwan, sign in TWD, then earn an NPB return.
jp.marketChoice='released';jp.contract.remaining=0;jp.player.born=jp.year-26;
Object.assign(jp.history.at(-1).farm,{g:20,pa:80,ab:70,h:27,tb:44,bb:10});
jp.openMarket(true);
const tw=jp.offers.findIndex(o=>jp.clubCountry(o.club)==='tw');
assert(tw>=0);assert(jp.accept(tw));assert.equal(jp.currency,'TWD');assert.equal(jp.player.nation,'jp');
assert.equal(jp.members(source).some(p=>p.id===jp.player.id),false);
season(jp);
jp.contract.remaining=0;jp.openMarket(true);
const returned=jp.offers.findIndex(o=>jp.clubCountry(o.club)==='jp');
assert(returned>=0);assert(jp.accept(returned));assert.equal(jp.currency,'JPY');
assert(jp.moves.some(x=>x.from&&jp.clubCountry(x.from)==='tw'));

// A domestic star has a cross-border offer route, and the acquired slot is checked again on signing.
for(const nation of ['tw','kr']){
 const w=worlds[nation];
 w.proYear=4;w.contract.remaining=0;w.service=D.countries[nation].internationalFA;
 for(const key of M.batting)w.player[key]=88;
 Object.assign(w.history.at(-1).stats,{g:20,pa:80,ab:71,h:30,tb:58,hr:9,bb:9});
 w.openMarket(true);
 const npb=w.offers.findIndex(o=>w.clubCountry(o.club)==='jp');
 assert(npb>=0);assert(w.accept(npb));assert.equal(w.playingCountry,'jp');assert.equal(w.player.nation,nation);
}

// Actual self/key game options and the in-game snapshot keep the same fixture / mode.
let pitch=fresh('kr',{style:'control',throwHand:'L',name:'イ・テウ'});
for(const key of ['control','movement','stamina'])pitch.player[key]=83;
pitch.player.velocity=148;
pitch.run('game');
assert(pitch.active);
for(const format of ['self','key','full']){
 const o=pitch.liveOptions(format);
 if(!o)throw Error('missing '+format);
 if(o.career)assert.equal(o.career.keyOnly,format==='key');
 const mode=o.career?'career-pitch':'match',g=new NightGame(mode,'standard',()=>{},o);
 assert.equal(g.teams[g.userSide].pitchers.find(x=>x.id===pitch.player.id).hand,'L');
 g.beginHalf();
 pitch.currentGame=JSON.parse(JSON.stringify(g.snapshot()));
 const save=roundtrip(pitch);
 const restored=NightGame.restore(save.currentGame,()=>{},o);
 assert.equal(restored.worldFixture,pitch.active.id);
 assert.equal(restored.career?.format,o.career?.format);
}
pitch.currentGame=null;

// In a representative season the player keeps nationality while on a foreign club.
const national=worlds.tw;
national.advanceDate('2035-11-09');
national.proYear=2;
for(const key of M.batting)national.player[key]=99;
Object.assign(national.player.stats,{g:17,pa:69,ab:60,h:29,tb:55,bb:9});
national.playerYear.g=17;
national.representation('fall');
{
 assert(national.nationalEvent);
 const fixtures=national.nationalFixtures();
 assert(fixtures.length>1);
 assert(fixtures.every(f=>f.kind==='national'));
 assert(fixtures.some(f=>f.home==='national-tw'||f.away==='national-tw'));
 assert.equal(national.player.nation,'tw');
 assert(national.members('national-tw').includes(national.player));
 const copy=roundtrip(national),regular=copy.playerYear.g;
 assert(copy.selectGame(fixtures,'national'));
 assert(copy.finishDay());
 assert.equal(copy.playerYear.g,regular);
 assert.equal(copy.national.at(-1).games.length,1);
}

// The group fixtures, advancement and championship are all computed for each tournament.
for(const [cup,year,teams,rounds] of [['WBC',2030,20,4],['プレミア12',2031,16,4],['APBC',2030,4,2]]){
 const I=NightCareerWorldInternational,n=I.create(cup,year);
 assert.equal(n.round.groups.flat().length,teams);
 let count=0;
 while(!n.done&&count++<30){
  const day=n.next,fixtures=I.fixtures({day,country:'jp'},n);
  assert.ok(fixtures.length);
  assert.equal(fixtures.flatMap(f=>[f.home,f.away]).length,new Set(fixtures.flatMap(f=>[f.home,f.away])).size);
  I.complete(n,day,fixtures.map(f=>[f,{home:4,away:1,inning:9}]));
 }
 assert.equal(n.history.length,rounds);
 assert.equal(n.champion,n.history.at(-1).results[0].homeId);
}
// Multi-decade calendar, rosters, player aging and an uninterrupted final save.
let long=draft(enrollment(fresh('jp')));
for(let i=0;i<20;i++){
 long=season(long);
 assert.equal(long.history.length,i+1);
 if(i===0||i===8)long=roundtrip(long);
 assert.equal(new Set(long.people.map(p=>p.id)).size,long.people.length);
 for(const nation of countries)for(const club of D.roster(nation)){
  const roster=long.members(club.id);
  assert(roster.length>=19&&roster.length<=55,club.id+' roster '+roster.length);
 }
 if(i<19)nextYear(long);
}
assert(long.history.some(x=>x.farm.g));
assert(long.history.some(x=>x.stats.g));
assert(long.people.some(p=>p.stage==='retired'&&p.real));
assert(long.people.some(p=>p.id.startsWith('rookie/')));
assert(long.people.some(p=>p.school&&p.history.length));
assert.equal(long.asia.length,20);
assert.equal(long.past.at(-1).year,long.history.at(-1).year);
assert(long.retire());
const retired=roundtrip(long);
assert.equal(retired.stage,'retired');
assert.equal(retired.retirement.age,retired.age);
assert.equal(retired.lifetime.g,retired.history.reduce((n,x)=>n+x.stats.g,0));
assert(NightCareerWorldSave.encode(retired).length<2_500_000);
assert.match(NightCareerWorldView.dashboard(retired,'home',true),/現役引退/);
console.log('PASS: 3 school paths and domestic drafts; standard/short schedules; NPB/CPBL/KBO postseasons and Asia; live modes and saves; farm/promotion, overseas moves and return, 20 years and retirement.');
