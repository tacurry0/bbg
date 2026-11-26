const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createServer}=require('node:http');
const {resolve,extname,sep}=require('node:path');
const dist=resolve(__dirname,'../dist');
const read=name=>fs.readFileSync(resolve(dist,name),'utf8');
const app=read('app.js'),index=read('index.html'),sw=read('sw.js');
assert(app.includes("$('clubhouse').onclick=directoryTeams;"));
assert(app.includes("$('players-tool').onclick=()=>rosterModal("));
assert(app.includes('abilityHTML(p,false)'));
assert(app.includes("const stats=includeMatch?game?.box[p.id]:null"));
for(const file of ['app.js?v=201','player-directory.css?v=1','i18n-catalog.js?v=2']){
 assert(index.includes(file));assert(sw.includes(file));
}
// Exercise the actual directory renderers with the complete roster database,
// even in the Node-only CI job where no browser is installed.
const vm=require('node:vm');
const model=vm.createContext({console});
model.window=model;
for(const name of ['ratings-data','pitching-expansion-2026','batting-expansion-2026','players','pennant','apbc-data','npb-data','npb-rosters','kbo-data','kbo-rosters','opening-lineups-2026','matchup-data','game','squad']){
 vm.runInContext(read(name+'.js'),model,{filename:name+'.js'});
}
const slice=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b));
vm.runInContext(`
 let html='',kind='',content={scrollTop:0};
 const $=()=>content,modal=(nextHtml,nextKind)=>{html=nextHtml;kind=nextKind;content.scrollTop=0;};
 const modalTitle=(_,title)=>title,clubBadge=id=>id;
 // Reading any live game state would be a bug in the home directory.
 const game=new Proxy({},{get(){throw new Error('Unexpected live game access');}});
 ${slice(' function fittedName',' function editorPick')}
 ${slice(' const descriptions=',' function seasonGraphHTML')}
 ${slice(' const directoryGroups=',' function rosterModal')}
 globalThis.directoryTest={
  groups:()=>directoryGroups.map(([key,get])=>[key,get().map(c=>c.id)]),
  teams:key=>{directoryGroup=key;directoryTeams();return html;},
  roster:(id,scroll=0)=>{directoryRoster(id,scroll);return html;},
  player:id=>{directoryPlayer(id);return html;},
  team:directoryTeam,scroll:()=>content.scrollTop,kind:()=>kind,
  savedScroll:()=>directoryRosterScroll
 };
`,model);
const d=model.directoryTest;
let playerCount=0;
const groups=JSON.parse(JSON.stringify(d.groups()));
assert.deepEqual(groups.map(([,ids])=>ids.length),[6,14,10,4]);
for(const [group,ids] of groups){
 assert.deepEqual([...d.teams(group).matchAll(/data-directory-club="([^"]+)"/g)].map(m=>m[1]),ids);
 for(const id of ids){
  const club=d.team(id),players=[...club.batters,...club.pitchers];
  const list=d.roster(id,180);
  assert.equal(d.scroll(),180);
  assert.deepEqual([...list.matchAll(/data-directory-player="([^"]+)"/g)].map(m=>m[1]).sort(),players.map(p=>p.id).sort(),id);
  for(const p of players){
   const detail=d.player(p.id);
   assert(detail.includes(p.name),p.id);
   assert(detail.includes('ability-hero'),p.id);
   assert(!detail.includes('この試合：')&&!detail.includes('今日の調子'),p.id);
   if(p.pos==='P')assert(detail.includes('repertoire-card'),p.id);
   playerCount++;
  }
  d.roster(id,180);d.player(players[0].id);assert.equal(d.savedScroll(),180);
 }
}
console.log(`PASS: all ${groups.flatMap(([,ids])=>ids).length} team rosters and ${playerCount} registered player detail views`);
async function browserTest(){
 let chromium;
 try{({chromium}=require('playwright'));}catch{console.log('Player directory static checks passed; Playwright unavailable');return;}
 if(!process.env.CHROMIUM_PATH&&!fs.existsSync(chromium.executablePath())){console.log('Browser checks skipped: Chromium is not installed');return;}
 const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.json':'application/json','.webmanifest':'application/manifest+json'};
 const server=createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  const file=resolve(dist,'.'+(p==='/'?'/index.html':decodeURIComponent(p)));
  if(!file.startsWith(dist+sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}
  catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('nightball.settings',JSON.stringify({matchTeam:'npb-l',matchOpponent:'kbo-lg',sound:false})));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof document.getElementById('clubhouse').onclick==='function');
  const groups=await page.evaluate(()=>Object.fromEntries(Object.entries({CPBL:NightTeams.all,NPB:NightTeams.npb,KBO:NightTeams.kbo,APBC:NightTeams.international}).map(([key,clubs])=>[key,clubs.map(c=>({id:c.id,batters:c.batters.map(p=>p.id),pitchers:c.pitchers.map(p=>p.id),firstPitcher:c.pitchers[0].name}))])));
  assert.deepEqual(Object.values(groups).map(c=>c.length),[6,14,10,4]);
  const match=await page.evaluate(()=>JSON.stringify([nightSettings.matchTeam,nightSettings.matchOpponent,nightSettings.matchLineups,nightSettings.apbcLineups]));
  await page.locator('#clubhouse').click();
  const modal=page.locator('#modal-content');
  assert.equal(await modal.getAttribute('data-kind'),'directory-teams');
  for(const [group,clubs] of Object.entries(groups)){
   await page.locator(`[data-directory-group="${group}"]`).click();
   assert.deepEqual(await page.locator('[data-directory-club]').evaluateAll(bs=>bs.map(b=>b.dataset.directoryClub)),clubs.map(c=>c.id));
   for(const club of clubs){
    await page.locator(`[data-directory-club="${club.id}"]`).click();
    const ids=await page.locator('[data-directory-player]').evaluateAll(bs=>bs.map(b=>b.dataset.directoryPlayer));
    assert.deepEqual(ids.slice().sort(),[...club.batters,...club.pitchers].sort(),club.id+' includes every player once');
    await page.locator('[data-action="directory-teams"]').first().click();
   }
   const club=clubs[0];await page.locator(`[data-directory-club="${club.id}"]`).click();
   await page.locator(`[data-directory-player="${club.pitchers[0]}"]`).click();
   assert.equal(await modal.getAttribute('data-kind'),'directory-player');
   assert.equal(await modal.locator('.ability-header strong').innerText(),club.firstPitcher);
   assert(await modal.locator('.repertoire-card').count());
   await page.locator('[data-action="directory-roster"]').first().click();
   assert.equal(await modal.getAttribute('data-kind'),'directory-roster');
   await page.evaluate(()=>history.back());
   await page.waitForFunction(()=>document.getElementById('modal-content').dataset.kind==='directory-teams');
  }
  assert.equal(await page.evaluate(()=>JSON.stringify([nightSettings.matchTeam,nightSettings.matchOpponent,nightSettings.matchLineups,nightSettings.apbcLineups])),match,'directory must not change match configuration');
  await page.evaluate(()=>NightI18n.setLanguage('ko'));
  await page.waitForFunction(()=>document.getElementById('modal-title').textContent==='선수 도감');
  await page.evaluate(()=>NightI18n.setLanguage('zh-TW'));
  await page.waitForFunction(()=>document.getElementById('modal-title').textContent==='球員名鑑');
  assert.deepEqual(errors,[]);
  console.log('PASS: 34 team rosters, complete registered player lists, details and back navigation, language switching and unchanged match settings');
 }finally{
  if(browser)await browser.close();
  await new Promise(r=>server.close(r));
 }
}
browserTest().catch(err=>{console.error(err);process.exitCode=1;});
