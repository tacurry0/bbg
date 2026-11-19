import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css',
 '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp',
 '.glb':'model/gltf-binary','.woff':'font/woff','.json':'application/json',
 '.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);
 const f=resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!f.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 try{
  res.writeHead(200,{'Content-Type':types[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(await readFile(f));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage','--no-sandbox']});
 const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.NightNPB&&!!document.getElementById('home'),{timeout:20000});
 const data=await page.evaluate(()=>({
  number:NightNPB.teams.length,players:NightNPB.teams.reduce((n,t)=>n+t.batters.length+t.pitchers.length,0),
  cpbl:NightTeams.all.length,apbc:NightTeams.get('apbc-japan').id
 }));
 assert.deepEqual(data,{number:14,players:420,cpbl:6,apbc:'apbc-japan'});
 await page.locator('[data-mode="match"]').click();
 await page.locator('[data-match-group="npb"]').click();
 assert.equal(await page.locator('[data-match-club^="npb-"]').count(),14);
 assert(await page.getByText('オイシックス').count(),'Oisix farm member is selectable');
 await page.locator('[data-match-club="npb-l"]').click();
 await page.locator('[data-match-side="away"]').click();
 await page.locator('[data-match-group="npb"]').click();
 await page.locator('[data-match-club="npb-v"]').click();
 await page.locator('[data-action="match-team-next"]').click();
 const before=await page.locator('#modal-content').innerText();
 assert(before.includes('西武')&&before.includes('ハヤテ'),'NPB vs NPB setup must show selected teams');
 await page.locator('[data-action="match-lineup"]').click();
 assert.equal(await page.locator('.squad-starter-row').count(),9,'nine sourced NPB batters appear');
 await page.locator('[data-action="lineup-play"]').click();
 await page.waitForFunction(()=>document.getElementById('game')&&!document.getElementById('game').hidden,{timeout:12000});
 await page.waitForTimeout(450);
 assert.equal(await page.locator('#scoreboard').count(),1,'old HUD preserved');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nightball.settings')||'{}'));
 assert.equal(saved.matchTeam,'npb-l');
 assert.equal(saved.matchOpponent,'npb-v');
 assert.deepEqual(errors,[],'NPB mode should launch without JavaScript exceptions');
 console.log('PASS: smartphone Chromium NPB 14-club picker, Seibu vs Hayate, roster lineup and live 3D match; CPBL/APBC retained.');
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
