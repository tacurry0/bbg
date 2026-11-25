// v163: intrasquad scrimmage (checker item "intrasquad-scrimmage").
//  - one club's registered players split into red / white sides that
//    play each other (practice / evaluation use),
//  - distinct from the v124 farm game (vs another club's farm side)
//    and from the v139 draft battle (pool of all 30 clubs),
//  - both sides are the SAME club's players with no person duplicated
//    across sides, and every side fields all nine positions,
//  - a real engine game between the split sides runs to completion,
//  - a scrimmage never touches pennant standings, season player stats,
//    farm development or the v156 record room,
//  - app wiring (both entrances, swap editor, finish branch) + v163 pins,
//  - 393x852 browser check of the real scrimmage modal and game start.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pro-parks','pennant','npb-data','npb-rosters','kbo-data','kbo-rosters','league-editor','scrimmage','game'])vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});

const POS=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
function checkSplit(base,split,label){
 assert(split&&split.red&&split.white,label+': split exists');
 const clubIds=new Set([...base.batters,...base.pitchers].map(p=>p.id));
 for(const side of [split.red,split.white]){
  assert.equal(side.baseClubId,base.id,label+': side belongs to the base club');
  assert.equal(side.batters.length,9,label+': nine batters per side');
  assert.equal(side.startingOrder.length,9,label+': nine in the order');
  assert(side.pitchers.length>=1,label+': pitchers assigned');
  assert(side.batters.every(p=>clubIds.has(p.id)),label+': every batter is a club player');
  assert(side.pitchers.every(p=>clubIds.has(p.id)),label+': every pitcher is a club player');
  const lineup=NightGame.arrangeLineup(side);
  assert.deepEqual(lineup.map(p=>p.fieldPos).sort(),POS.slice().sort(),label+': all nine positions are fielded');
 }
 // No person on both sides: batter ids and pitcher ids are disjoint
 // across sides (a side's DH is that same side's own pitcher).
 const redBat=new Set(split.red.batters.map(p=>p.id)),whiteBat=new Set(split.white.batters.map(p=>p.id));
 assert([...redBat].every(id=>!whiteBat.has(id)),label+': no batter on both sides');
 const redPit=new Set(split.red.pitchers.map(p=>p.id)),whitePit=new Set(split.white.pitchers.map(p=>p.id));
 assert([...redPit].every(id=>!whitePit.has(id)),label+': no pitcher on both sides');
 assert([...redBat].every(id=>!whitePit.has(id))&&[...whiteBat].every(id=>!redPit.has(id)),label+': no person crosses sides in any role');
 // All 16 registered batters are used exactly once across the two sides.
 const realBat=[...split.red.batters,...split.white.batters].filter(p=>!p.scrimmagePitcherBatter).map(p=>p.id);
 assert.deepEqual(realBat.slice().sort(),base.batters.map(p=>p.id).sort(),label+': every registered batter is used exactly once');
 // Each side's DH is its own starting pitcher (16 batters cannot make
 // two full nines, so the pitcher bats — the same person, not a copy).
 for(const side of [split.red,split.white]){
  const dh=side.batters.find(p=>p.scrimmagePitcherBatter);
  assert(dh&&dh.id===side.pitchers[0].id,label+': DH is the side\'s own starting pitcher');
 }
 return split;
}

// ---------- every playable club splits cleanly ----------
const allClubs=[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];
assert(allClubs.length>=30,'club pool covers CPBL+NPB+KBO');
for(const club of allClubs)checkSplit(club,NightScrimmage.splitClub(club),club.id);

// ---------- swap editor: exchanging two batters keeps a valid split ----------
{
 const base=NightTeams.get('owls'),split=NightScrimmage.splitClub(base);
 const a=split.red.batters.find(p=>!p.scrimmagePitcherBatter),b=split.white.batters.find(p=>!p.scrimmagePitcherBatter);
 const swapped=NightScrimmage.swapBatters(split,a.id,b.id);
 assert(swapped,'swap returns a new split');
 assert(swapped.red.batters.some(p=>p.id===b.id)&&swapped.white.batters.some(p=>p.id===a.id),'the two batters exchanged sides');
 checkSplit(base,swapped,'owls-after-swap');
 assert.equal(NightScrimmage.swapBatters(split,a.id,a.id),null,'same-player swap rejected');
 const c=split.red.batters.find(p=>!p.scrimmagePitcherBatter&&p.id!==a.id);
 assert.equal(NightScrimmage.swapBatters(split,a.id,c.id),null,'same-side swap rejected');
}

// ---------- a real game between the split sides completes ----------
{
 const split=NightScrimmage.splitClub(NightTeams.get('owls'));
 const g=new NightGame('match','standard',()=>{},{clubs:{home:split.red,away:split.white},homeTeamId:split.red.id,awayTeamId:split.white.id,userHome:true,innings:3,park:split.red.park,pitcher:0,opponentPitcher:0,order:split.red.startingOrder,fielding:split.red.startingFielding});
 g.scrimmageGame=true;
 g.autoBatting=true;g.autoDefense=true;
 for(let i=0;i<40000&&g.phase!=='ended';i++){
  if(g.phase==='change')g.acknowledgeHalf();
  if(g.phase==='aim'&&g.defending)g.autoPitch();
  g.update(50);
 }
 assert.equal(g.phase,'ended','the scrimmage game completes');
 assert(Number.isInteger(g.homeScore)&&Number.isInteger(g.awayScore),'final score recorded');
}

// ---------- pennant isolation: roster source + nothing folds back ----------
{
 const league=new NightPennant('comets');
 const roster=league.clubRoster(league.clubId);
 const split=checkSplit(roster,NightScrimmage.splitClub(roster),'pennant-comets');
 const before=JSON.stringify({results:league.results,playerStats:league.playerStats,standings:league.standings(),farmProgress:league.farmProgress,farmGameRound:league.farmGameRound,round:league.round,mastery:league.mastery});
 const g=new NightGame('match','standard',()=>{},{clubs:{home:split.red,away:split.white},homeTeamId:split.red.id,awayTeamId:split.white.id,userHome:true,innings:3,park:split.red.park,pitcher:0,opponentPitcher:0,order:split.red.startingOrder,fielding:split.red.startingFielding});
 g.autoBatting=true;g.autoDefense=true;
 for(let i=0;i<40000&&g.phase!=='ended';i++){
  if(g.phase==='change')g.acknowledgeHalf();
  if(g.phase==='aim'&&g.defending)g.autoPitch();
  g.update(50);
 }
 assert.equal(g.phase,'ended','pennant-source scrimmage completes');
 // The scrimmage path in app.js is mode 'match' with no league calls:
 // playing the game out must leave every pennant structure untouched.
 assert.equal(JSON.stringify({results:league.results,playerStats:league.playerStats,standings:league.standings(),farmProgress:league.farmProgress,farmGameRound:league.farmGameRound,round:league.round,mastery:league.mastery}),before,'pennant standings / season stats / farm / mastery untouched by the scrimmage');
 assert.equal(league.played,0,'no pennant game counted');
}

// ---------- app wiring + record-room exclusion + pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(app.includes('function scrimmageModal(source)'),'scrimmage modal exists');
assert(app.includes("league.clubRoster(league.clubId)"),'pennant entrance uses the current pennant roster');
assert(app.includes("matchClub(settings.matchTeam)"),'normal entrance uses the selected match club');
assert(app.includes('data-league-action="scrimmage"'),'pennant dashboard exposes the scrimmage entrance');
assert(app.includes("case'scrimmage':scrimmageModal('pennant');"),'pennant entrance is wired');
assert(app.includes('data-mode="scrimmage"')===false&&html.includes('data-mode="scrimmage"'),'home menu exposes the scrimmage entrance');
assert(app.includes("b.dataset.mode==='scrimmage'?scrimmageModal('match')"),'home entrance is wired');
assert(app.includes('data-scrimmage-player='),'swap editor buttons render');
assert(app.includes('NightScrimmage.swapBatters'),'swap editor uses the module swap');
assert(app.includes("case'scrimmage-play':startScrimmage();"),'play action is wired');
assert(app.includes('game.scrimmageGame=true;'),'started games are flagged as scrimmage');
assert(app.includes('if(g.scrimmageGame){'),'finish branch handles scrimmage separately');
assert(app.includes('記録室にも記録されません'),'finish/result copy states the record-room treatment');
assert(app.includes('g.scrimmageGame)return;'),'record room excludes scrimmage games');
assert(!app.slice(app.indexOf('if(g.scrimmageGame){'),app.indexOf('if(g.scrimmageGame){')+600).includes('foldLeagueStats'),'scrimmage finish never folds league stats');
assert(!app.slice(app.indexOf('if(g.scrimmageGame){'),app.indexOf('if(g.scrimmageGame){')+600).includes('farmGameCredit'),'scrimmage finish grants no farm credit');
assert(html.includes('./scrimmage.js?v=1'),'index loads scrimmage.js at v1');
assert(html.includes('./game.js?v=171')&&html.includes('./app.js?v=171'),'index pins at v163');
assert(sw.includes('nightball-v171-tab-swipe'),'SW cache renamed for v163');
assert(sw.includes('./scrimmage.js?v=1')&&sw.includes('./game.js?v=171')&&sw.includes('./app.js?v=171'),'SW precaches the v163 scripts including the new module');

console.log('scrimmage-v163: unit + static assertions passed');

/* ---------- browser check (393x852): menu -> modal -> swap -> start ---------- */
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
(async()=>{
 let chromium;
 try{({chromium}=require('playwright'));}
 catch{console.log('scrimmage-v163: playwright unavailable — browser check skipped');return;}
 const dir=resolve(__dirname,'../dist');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff':'font/woff'};
 const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(u.pathname)==='/'?'/index.html':decodeURIComponent(u.pathname);
  const filePath=resolve(dir,'.'+name);
  if(!filePath.startsWith(dir+sep)){res.writeHead(403);res.end();return;}
  try{const data=await readFile(filePath);res.writeHead(200,{'Content-Type':mime[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
 try{
  const url='http://127.0.0.1:'+server.address().port+'/';
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.NightScrimmage&&document.querySelector('[data-mode="scrimmage"]'),null,{timeout:15000});
  await page.click('[data-mode="scrimmage"]');
  await page.waitForSelector('[data-action="scrimmage-play"]',{timeout:10000});
  const m=await page.evaluate(()=>{
   const content=document.querySelector('#modal-content');
   const overflow=[...content.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>393.5||el.getBoundingClientRect().left<-0.5).length;
   return {text:content.textContent,scrollWidth:content.scrollWidth,clientWidth:content.clientWidth,overflow,players:content.querySelectorAll('[data-scrimmage-player]').length};
  });
  assert(m.text.includes('紅白戦')&&m.text.includes('紅組')&&m.text.includes('白組'),'modal shows both sides');
  assert(m.text.includes('二軍戦'),'modal distinguishes the farm game');
  assert(m.text.includes('記録室にも記録されません'),'modal states the practice treatment');
  assert.equal(m.players,16,'all 16 batters listed with swap buttons');
  assert(m.scrollWidth<=m.clientWidth+1,'modal does not overflow horizontally at 393px');
  assert.equal(m.overflow,0,'no modal element sticks out of the 393px viewport');
  try{await page.screenshot({path:resolve(__dirname,'screenshots/scrimmage-v163-modal.png'),timeout:90000});}catch{}
  // Swap two batters through the real UI, then start the game.
  const buttons=page.locator('[data-scrimmage-player]');
  await buttons.nth(0).click();
  await page.waitForFunction(()=>document.querySelector('#modal-content').textContent.includes('入れ替える相手'),null,{timeout:5000});
  await buttons.nth(15).click();
  await page.waitForFunction(()=>!!document.querySelector('[data-action="scrimmage-play"]'),null,{timeout:5000});
  await page.click('[data-action="scrimmage-play"]');
  await page.waitForFunction(()=>{const g=document.querySelector('#game');return g&&!g.hidden;},null,{timeout:15000});
  const started=await page.evaluate(()=>({gameVisible:!document.querySelector('#game').hidden,modalHidden:document.querySelector('#modal').hidden}));
  assert(started.gameVisible,'game screen shows after starting the scrimmage');
  try{await page.screenshot({path:resolve(__dirname,'screenshots/scrimmage-v163-game.png'),timeout:90000});}catch{}
  assert.deepEqual(errors,[],'no page errors: '+errors.join(' | '));
  await context.close();
  console.log('scrimmage-v163: browser check passed (393x852, modal + swap + game start)');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
