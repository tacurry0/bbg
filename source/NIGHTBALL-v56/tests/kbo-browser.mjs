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
 await page.locator('[data-mode="match"]').click();
 await page.locator('[data-match-group="kbo"]').click();
 assert.equal(await page.locator('[data-match-club^="kbo-"]').count(),10);
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
 await page.locator('[data-action="match-lineup"]').click();
 assert.equal(await page.locator('.squad-starter-row').count(),9,'full nine-player roster');
 await page.locator('[data-action="lineup-play"]').click();
 await page.waitForFunction(()=>document.querySelector('#game')&&!document.querySelector('#game').hidden,{timeout:12000});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,{timeout:15000});
 await page.waitForTimeout(500);
 assert.equal(await page.locator('#scoreboard').count(),1,'legacy match HUD preserved');
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
