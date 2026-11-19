const assert=require('node:assert/strict');
global.window=global;
const modules=['ratings-data','players','pro-parks','pennant','npb-postseason','npb-data','npb-rosters','kbo-data','kbo-rosters',
 'career-leagues','career-development','career-life','career-extras','career','game',
 'career-world-data','career-world-leagues','career-world-school','career-world-match','career-world-save','career-world','career-world-view'];
for(const file of modules)require('../dist/'+file+'.js');
const D=NightCareerWorldData,L=NightCareerWorldLeagues,M=NightCareerWorldMatch,W=NightCareerWorld;
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
 while(w.stage==='school'&&days++<20)w.run('season');
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
 return w;
}
function season(w){
 const initial=w.history.length;
 let i=0;
 while(w.stage==='pro'&&i++<20){
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
const worlds={};
for(const country of countries){
 let w=fresh(country);
 assert.equal(w.day,'2027-'+D.countries[country].start);
 w.run('game');assert(w.queue);
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
national.advanceDate('2031-11-09');
national.proYear=2;
for(const key of M.batting)national.player[key]=99;
Object.assign(national.player.stats,{g:17,pa:69,ab:60,h:29,tb:55,bb:9});
national.playerYear.g=17;
national.representation('fall');
{
 assert(national.nationalEvent);
 const fixtures=national.nationalFixtures();
 assert.equal(fixtures.length,1);
 assert(fixtures.some(f=>f.home==='national-tw'||f.away==='national-tw'));
 assert.equal(national.player.nation,'tw');
 assert(national.members('national-tw').includes(national.player));
 const copy=roundtrip(national),regular=copy.playerYear.g;
 assert(copy.selectGame(fixtures,'national'));
 assert(copy.finishDay());
 assert.equal(copy.playerYear.g,regular);
 assert.equal(copy.national.at(-1).games.length,1);
}

// Multi-decade calendar, rosters, player aging and an uninterrupted final save.
let long=draft(enrollment(fresh('jp')));
for(let i=0;i<17;i++){
 long=season(long);
 assert.equal(long.history.length,i+1);
 if(i===0||i===8)long=roundtrip(long);
 if(i<16)nextYear(long);
}
assert(long.history.some(x=>x.farm.g));
assert(long.history.some(x=>x.stats.g));
assert(long.people.some(p=>p.stage==='retired'&&p.real));
assert(long.people.some(p=>p.id.startsWith('rookie/')));
assert(long.people.some(p=>p.school&&p.history.length));
assert.equal(long.asia.length,17);
assert.equal(long.past.at(-1).year,long.history.at(-1).year);
assert(long.retire());
const retired=roundtrip(long);
assert.equal(retired.stage,'retired');
assert.equal(retired.retirement.age,retired.age);
assert.equal(retired.lifetime.g,retired.history.reduce((n,x)=>n+x.stats.g,0));
assert(NightCareerWorldSave.encode(retired).length<2_500_000);
assert.match(NightCareerWorldView.dashboard(retired,'home',true),/現役引退/);
console.log('PASS: 3 school paths and domestic drafts; standard/short schedules; NPB/CPBL/KBO postseasons and Asia; live modes and saves; farm/promotion, overseas moves and return, 17 years and retirement.');
