// v126 regression: starting a career live match right after a versus match
// must never leave the previous match on screen, frozen.
//
// Field report: after playing a versus match, starting a player-career
// match showed the career HUD over the previous match's field/score/
// players and accepted no input. The consistent-codebase reproduction did
// NOT reproduce it (262 classic-career live starts and the browser flow
// below all start cleanly), so the fix is defensive, at the app seam:
//  - playCareer / playWorld swap games through beginCareerLive, which
//    drops the previous game BEFORE building the new one and guards
//    construction + the first UI pass; on failure the user returns to
//    the career dashboard with a toast instead of a stale game screen.
//  - restoreCareerGame guards NightGame.restore the same way.
//  - frame() guards game.update()/mirrorTick(): a throwing update used
//    to abort every frame before render (the freeze signature); it now
//    routes back to the owning dashboard via handleGameError.
// This test pins those guards and fuzzes both career systems' live starts
// (each preceded by a versus-match game, the reported sequence).
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
const modules=['ratings-data','players','pro-parks','pennant','npb-postseason','npb-data','npb-rosters','kbo-data','kbo-rosters',
 'apbc-data','apbc-candidates','apbc-tournament','derby','career-leagues','career-development','career-life','career-extras','squad','career','game',
 'career-world-data','career-world-identities','career-world-leagues','career-world-international','career-world-school','career-world-match','career-world-save','career-world-success','career-world','career-world-slots','career-world-view'];
for(const file of modules)require('../dist/'+file+'.js');
const copy=d=>JSON.parse(JSON.stringify(d));

// ---------- app-level guards (the actual fix) ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('function beginCareerLive(create,fallback)'),'career starts go through the guarded swap');
assert(app.includes('game=null;onEvent(\'clear\');fallback()'),'a failed start drops the game and returns to the dashboard');
assert(app.includes('試合を開始できませんでした'),'a failed start tells the user instead of freezing');
assert(app.includes('function restoreCareerGame(data,options)'),'restore is guarded');
assert((app.match(/beginCareerLive\(/g)||[]).length>=3,'both playCareer and playWorld use beginCareerLive (plus its definition)');
assert(app.includes('function handleGameError(g,error)'),'frame has an error route');
assert(app.includes('}catch(error){handleGameError(current,error);return;}'),'frame guards update/mirrorTick');
assert(app.includes('試合の処理でエラーが発生しました'),'a mid-match failure surfaces instead of freezing');

// ---------- shared driver ----------
function versusGame(){
 const home=NightTeams.get('npb-l'),away=NightTeams.get('npb-v');
 const g=new NightGame('match','standard',()=>{},{clubs:{home,away},homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding});
 g.update(50);
 return g;
}
function driveLive(g){
 let sawReady=false,restored=false;
 for(let tick=0;tick<6000;tick++){
  if(g.phase==='ended')break;
  if(g.phase==='career-ready'){sawReady=true;g.acknowledgeCareerAppearance();}
  else if(g.phase==='change'&&g.acknowledgeHalf)g.acknowledgeHalf();
  else if(g.phase==='pitch'&&g.pitch?.delivered&&!g.defending){if(Math.random()<.5)g.take();else g.strike(Math.random()<.5);}
  g.update(50); // must never throw: a throw here is the freeze
  if(!restored&&sawReady&&tick>40){
   restored=true;
   const r=NightGame.restore(copy(g.snapshot()),()=>{});
   if(r)g=r;
  }
 }
 return sawReady;
}

// ---------- classic career: live starts across stages ----------
const C=NightCareer;
function finishClassic(c,good=true){
 const g=new NightGame(c.pitching?'career-pitch':'career-bat','casual',()=>{},c.gameOptions('quick'));
 const n=g.career.opportunities;g.career.completed=n;g.career.scoringBetweenAppearances=false;
 if(c.pitching)g.pitchingStats[C.id]=good?{outs:n*3,k:n*2,runs:0,bb:0}:{outs:n*3,k:0,runs:n*3,bb:n*2};
 else g.box[C.id]=good?{pa:n,ab:n,h:n,hr:n,rbi:n*3}:{pa:n,ab:n,h:0,hr:0,rbi:0,k:n};
 g.setPhase('ended');c.complete(g);
}
let classicStarts=0;
function classicTrial(c,label){
 for(const format of ['quick','extended']){
  versusGame();
  const options=c.gameOptions(format);
  if(!options)continue;
  const g=new NightGame(c.pitching?'career-pitch':'career-bat','standard',()=>{},options);
  const sawReady=driveLive(g);
  assert.notEqual(g.phase,'intro',label+'/'+format+': leaves the intro');
  if(!c.pitching)assert(sawReady||g.phase==='ended',label+'/'+format+': reaches an appearance');
  classicStarts++;
 }
}
for(const style of ['contact','power','velocity','control']){
 for(let year=1;year<=3;year++){
  const c=new C('試遊'+style,C.schools[year%3],style,'L');
  c.seed='v126-'+style+year;c.schoolYear=year;
  for(let round=0;round<3;round++){c.round=round;for(let cup=0;cup<2;cup++){c.cup=cup;classicTrial(c,'school/'+style+'/y'+year);}}
 }
}
for(const style of ['contact','velocity']){
 const star=new C('進路'+style,C.schools[0],style,'R');star.seed='v126-pro-'+style;
 let guard=0;
 while(star.stage!=='retired'&&guard++<70){
  if(star.fixture&&!star.currentGame){classicTrial(star,'pro/'+style+'/'+star.stage+'/'+star.level+'/'+star.fixture.type+'/'+star.fixture.role);finishClassic(star,guard%3!==0);}
  else if(star.stage==='draft'){if(!star.signDraft())break;}
  else break;
 }
}
assert(classicStarts>150,'classic fuzz covered many starts ('+classicStarts+')');

// ---------- world career: live starts after a versus match ----------
const D=NightCareerWorldData,W=NightCareerWorld;
let worldStarts=0;
function worldTrial(w,format,label){
 versusGame();
 const options=w.liveOptions(format);
 if(!options)return;
 const mode=options.career?(options.career.pitching?'career-pitch':'career-bat'):'match';
 const g=new NightGame(mode,'standard',()=>{},{...options,manualRunning:false});
 driveLive(g);
 assert.notEqual(g.phase,'intro',label+' ('+format+'): leaves the intro');
 worldStarts++;
}
{ // school stage, JP batter
 const w=new W({country:'jp',name:'早瀬 悠馬',region:D.countries.jp.region[0],style:'contact',schoolIndex:0,schoolTier:2,difficulty:'normal',short:true,seed:'v126-world-jp'});
 let guard=0;
 while(guard++<12){
  w.run('game');
  if(!w.queue)break;
  worldTrial(w,'self','world-school');
  w.finishDay();
 }
}
{ // pro stage, TW batter (the v109 save profile): progress, then start fixtures
 const w=new W({country:'tw',name:'陳承翰',region:D.countries.tw.region[0],style:'contact',schoolIndex:1,schoolTier:1,difficulty:'normal',short:true,seed:'v126-world-tw'});
 let days=0;while(w.stage==='school'&&days++<100){w.run('season');if(w.queue)w.finishDay();}
 w.draftApply(true);w.draftReveal(true);
 if(!w.draft.offer){w.amateur('大学');w.run('season');w.draftApply(true);w.draftReveal(true);}
 assert(w.signDraft(),'draft signing');
 let guard=0,fixtures=0;
 while(w.stage==='pro'&&guard++<60&&fixtures<6){
  w.run('game');
  if(!w.queue){if(w.stage!=='pro')break;continue;}
  if(w.active){worldTrial(w,'self','world-pro');worldTrial(w,'full','world-pro');fixtures++;}
  w.finishDay();
 }
 assert(fixtures>0,'reached pro fixtures');
}
assert(worldStarts>10,'world fuzz covered starts ('+worldStarts+')');
console.log('PASS: career live starts are guarded in app.js and fuzzed clean (classic '+classicStarts+', world '+worldStarts+')');
