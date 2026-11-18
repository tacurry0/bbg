// Full mobile Chromium smoke test of the actual published source files.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const dir=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml',
 '.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff':'font/woff'};
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 const name=decodeURIComponent(u.pathname)==='/'?'/index.html':decodeURIComponent(u.pathname);
 const f=resolve(dir,'.'+name);
 if(!f.startsWith(dir+sep)){res.writeHead(403);res.end();return;}
 try{
  const data=await readFile(f);
  res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream',
   'Cache-Control':'no-store'});
  res.end(data);
 }catch{
  res.writeHead(404);res.end();
 }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,errors=[],requests=[];
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage','--no-sandbox'
 ]});
 const context=await browser.newContext({
  viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 page.on('requestfailed',r=>requests.push(r.url()+' '+r.failure()?.errorText));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,{timeout:20000});
 await page.waitForTimeout(1000);
 const graphics=await page.locator('#game-canvas').getAttribute('data-graphics');
 assert(['webgl-3d','canvas-3d'].includes(graphics),'3D renderer initializes: '+graphics);
 assert.equal(await page.locator('#home').isVisible(),true);
 assert(await page.locator('link[href="./menu-polish.css?v=58"]').count());
 const hero=await page.locator('.menu-hero').boundingBox();
 assert(hero&&hero.height>=100&&hero.height<=190,'classic arcade hero must be visible');
 mkdirSync('tests/screenshots',{recursive:true});
 await page.screenshot({path:'tests/screenshots/premium-home.png'});
 await page.evaluate(async()=>{
  const {StadiumRenderer}=await import('./stadium3d.js?v=59.1');
  const original=StadiumRenderer.prototype.render;
  StadiumRenderer.prototype.render=function(game,time){
   if(game)window.testDomeMatch={renderer:this,game};
   return original.call(this,game,time);
  };
 });
 await page.locator('[data-mode="match"]').click();
 await page.locator('[data-action="match-team-next"]').click();
 await page.locator('#park-select').selectOption('tokyo-dome');
 await page.locator('[data-action="match-lineup"]').click();
 await page.locator('[data-action="lineup-play"]').click();
 await page.waitForFunction(()=>document.querySelector('#game')&&!document.querySelector('#game').hidden,{timeout:10000});
 await page.waitForTimeout(1000);
 const game=await page.locator('#game').isVisible();
 const stage=await page.locator('#stage').isVisible();
 assert(game&&stage,'match opens with visible pitch and current HUD');
 assert(await page.locator('#scoreboard').count(), 'existing HUD retained');
 await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.parkModel==='tokyo-dome');
 const dome=await page.evaluate(()=>{
  const {renderer}=window.testDomeMatch;
  return {
   membrane:!!renderer.parkDecor.getObjectByName('Tokyo Dome air-supported membrane'),
   liveScore:renderer.parkDecor.getObjectByName('Live line score').material.map===renderer.boardTexture,
   seats:renderer.parkDecor.getObjectByName('Blue stadium seats').count
  };
 });
 assert(dome.membrane&&dome.liveScore&&dome.seats>(graphics==='webgl-3d'?10000:400),'Tokyo Dome is rendered with live score and 3D seating');
 await page.screenshot({path:'tests/screenshots/premium-match.png'});
 await page.evaluate(()=>{
  const {renderer,game}=window.testDomeMatch;
  game.startField(46,43,.19,false);
  for(let i=0;i<220;i++)game.updateField(.01);
  game.paused=true;
  for(let i=0;i<9;i++)renderer.render(game,game.time+=60);
 });
 assert(await page.evaluate(()=>{
  const {renderer,game}=window.testDomeMatch;
  const camera=renderer.camera.position;
  return !game.field.foul&&renderer.fieldMode&&camera.y<NightPlayers.roofSurface(game.park,camera.x,-camera.z);
 }),'outfield fly follows the ball below the roof');
 await page.screenshot({path:'tests/screenshots/tokyo-dome-field.png'});
 assert.deepEqual(errors,[],'no page JavaScript errors');
 console.log('PASS: mobile Chromium, team selection, lineup, Tokyo Dome live score and fly-ball camera ('+graphics+').');
 if(requests.length)console.log('Nonfatal request warnings:',requests.slice(0,5));
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
