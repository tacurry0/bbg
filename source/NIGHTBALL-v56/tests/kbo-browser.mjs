// KBO ten-club integrated mobile Chromium smoke test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
 '.webp':'image/webp','.glb':'model/gltf-binary','.woff':'font/woff','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const f=resolve(root,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));
 if(!f.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 try{
  res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream',
                    'Cache-Control':'no-store'});
  res.end(await readFile(f));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--disable-dev-shm-usage','--no-sandbox']});
 const context=await browser.newContext({viewport:{width:412,height:915},
   deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.NightKBO&&!!window.NightNPB&&!!window.NightTeams,{timeout:25000});
 assert.deepEqual(await page.evaluate(()=>[NightTeams.all.length,NightNPB.teams.length,NightKBO.teams.length]),
  [6,14,10],'all three domestic league registers are available');
 await page.locator('#pennant-mode').click();
 assert.equal(await page.locator('[data-club-choice]').count(),6);
 for(const [id,club,count,total] of [['npb','npb-a',14,13],['kbo','kbo-hh',10,9]]){
  await page.locator('[data-pennant-league="'+id+'"]').click();
  assert.equal(await page.locator('[data-club-choice]').count(),count);
  await page.locator('[data-league-games="1"]').click();
  assert.match(await page.locator('.season-length-heading strong').innerText(),new RegExp('^'+total+'\\s*試合$'));
  await page.locator('[data-club-choice="'+club+'"]').click();
  await page.locator('[data-league-action="create"]').click();
  assert.equal(await page.locator('.standings-table tbody tr').count(),count);
  await page.locator('[data-league-action="play"]').click();
  assert.equal(await page.locator('.squad-starter-row').count(),9);
  await page.locator('[data-action="lineup-back"]').click();
 }
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#pennant-mode').click();
 assert.equal(await page.locator('[data-pennant-league="kbo"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.standings-table tbody tr').count(),10);
 await page.locator('[data-pennant-league="npb"]').click();
 assert.equal(await page.locator('.standings-table tbody tr').count(),14);
 await page.locator('[data-league-action="home"]').click();
 await page.locator('[data-mode="match"]').click();
 await page.locator('[data-match-group="kbo"]').click();
 assert.equal(await page.locator('[data-match-club^="kbo-"]').count(),10);
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-match-club^="kbo-"] img')].length===10&&
  [...document.querySelectorAll('[data-match-club^="kbo-"] img')].every(img=>img.complete&&img.naturalWidth&&img.src.endsWith('.png')));
 assert.equal(await page.locator('[data-match-club="kbo-hh"]').count(),1);
 assert.equal(await page.locator('[data-match-club="kbo-wo"]').count(),1);
 mkdirSync('tests/screenshots',{recursive:true});
 await page.screenshot({path:'tests/screenshots/kbo-10-clubs.png'});
 await page.locator('[data-match-club="kbo-hh"]').click();
 await page.locator('[data-match-side="away"]').click();
 await page.locator('[data-match-group="kbo"]').click();
 await page.locator('[data-match-club="kbo-kt"]').click();
 await page.locator('[data-action="match-team-next"]').click();
 const body=await page.locator('#modal-content').innerText();
 assert(body.includes('ハンファ')&&body.includes('KT'),'new teams selected in pregame setup');
 await page.locator('[data-match-home="true"]').click();
 assert.equal(await page.locator('#park-select').inputValue(),'daejeon-hanwha');
 assert.equal(await page.locator('#park-select optgroup[label="韓国"] option').count(),9);
 const longPitcher='ウィルケル・エルナンデス';
 const pitcherChoice=page.locator('#starter-select option').filter({hasText:longPitcher});
 const pitcherValue=await pitcherChoice.getAttribute('value');
 await page.locator('#starter-select').selectOption(pitcherValue);
 await page.locator('[data-action="match-lineup"]').click();
 assert.equal(await page.locator('.squad-starter-row').count(),9,'full nine-player roster');
 assert.match(await page.locator('.squad-starter-row .squad-name').first().innerText(),/^[ァ-ヺー・]+$/u);
 assert((await page.locator('.editor-pitchers summary').innerText()).includes(longPitcher));
 await page.locator('.editor-pitchers summary').click();
 for(const width of [320,412]){
  await page.setViewportSize({width,height:915});
  const clipped=await page.locator('.fit-player-name').evaluateAll(names=>names.filter(name=>{
   const box=name.getBoundingClientRect(), parent=name.parentElement.getBoundingClientRect();
   const range=document.createRange();range.selectNodeContents(name.firstElementChild.firstChild);
   const lines=[...range.getClientRects()];
   return lines.length!==1||lines.some(line=>line.left<box.left-1||line.right>box.right+1||
    line.top<parent.top-1||line.bottom>parent.bottom+1);
  }).map(name=>name.textContent));
  assert.deepEqual(clipped,[],'lineup names fit at '+width+'px');
 }
 await page.locator('[data-action="lineup-play"]').click();
 await page.waitForFunction(()=>document.querySelector('#game')&&!document.querySelector('#game').hidden,{timeout:12000});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('#game-canvas')?.dataset.parkModel==='daejeon-hanwha',
  {timeout:15000});
 await page.waitForTimeout(500);
 assert.equal(await page.locator('#scoreboard').count(),1,'legacy match HUD preserved');
 assert.deepEqual(await page.locator('#scoreboard image').evaluateAll(images=>images.map(i=>i.getAttribute('href'))),
  ['./assets/kbo/kbo-kt.png','./assets/kbo/kbo-hh.png']);
 const hudName=page.locator('#pitcher-card .hud-name-text');
 await hudName.waitFor({state:'visible'});
 assert.equal(await hudName.innerText(),longPitcher);
 assert.match(await page.locator('#player-card .hud-name-text').innerText(),/^[ァ-ヺー・]+$/u);
 for(const width of [412,320]){
  await page.setViewportSize({width,height:915});
  const sizes=await page.evaluate(()=>{
   const stats=id=>{
    const card=document.querySelector(id),name=card.querySelector('.hud-name-text');
    const range=document.createRange();range.selectNodeContents(name);
    return {width:card.getBoundingClientRect().width,box:name.getBoundingClientRect().width,
     text:range.getBoundingClientRect().width,left:card.getBoundingClientRect().left};
   };
   return {batter:stats('#player-card'),pitcher:stats('#pitcher-card'),
    scoreRight:document.querySelector('#scoreboard').getBoundingClientRect().right};
  });
  assert(Math.abs(sizes.pitcher.width-sizes.batter.width)<1,'same card width at '+width+'px');
  assert(Math.abs(sizes.pitcher.box-sizes.batter.box)<1,'same name width at '+width+'px');
  assert(sizes.pitcher.text<=sizes.pitcher.box+1,'long pitcher name fits at '+width+'px: '+JSON.stringify(sizes));
  assert(sizes.scoreRight<=sizes.pitcher.left,'score and pitcher card do not overlap at '+width+'px');
 }
 await page.setViewportSize({width:412,height:915});
 assert(['webgl-3d','canvas-3d'].includes(await page.locator('#game-canvas').getAttribute('data-graphics')));
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nightball.settings')||'{}'));
 assert.equal(saved.matchTeam,'kbo-hh');
 assert.equal(saved.matchOpponent,'kbo-kt');
 await page.screenshot({path:'tests/screenshots/kbo-hanwha-vs-kt.png'});
 assert.deepEqual(errors,[],'no KBO source or 3D rendering JS errors');
 console.log('PASS KBO Mobile Chromium: 10-team picker, Hanwha vs KT lineups, 2026 real player records, 3D match and existing HUD.');
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
