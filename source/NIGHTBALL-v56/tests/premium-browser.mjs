// Full mobile Chromium smoke test of the actual published source files.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

// Frame checks don't depend on fonts fetched by locale/UI overlays.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
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
  viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true
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
  const {StadiumRenderer}=await import('./stadium3d.js?v=61');
  const original=StadiumRenderer.prototype.render;
  StadiumRenderer.prototype.render=function(game,time){
   if(game){
    const previous=window.testDomeMatch;
    window.testDomeMatch={renderer:this,game};
    if(game.paused&&previous?.game===game&&this.lastTime===time)return;
   }
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
   liveScore:renderer.parkDecor.getObjectByName('Curved 125 m wide main vision').material===renderer.venueVisionCache.get('tokyo-dome').material,
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
 for(const [parkId,model,parts] of [
  ['dome','taoyuan',['Taoyuan left field vision','Taoyuan right field vision','Taoyuan sky blue infield stands']],
  ['taipei-dome','taipei-dome',['Taipei centralized main vision','Taipei Dome dark ceiling','Taipei gray and white upper seating']]
 ]){
  const status=await page.evaluate(({parkId,parts})=>{
   const {renderer,game}=window.testDomeMatch;
   game.park=NightPlayers.parks.find(park=>park.id===parkId);
   game.field=null;game.setPhase('aim');renderer.render(game,++game.time);
   return {id:renderer.canvas.dataset.parkModel,all:parts.every(name=>renderer.parkDecor.getObjectByName(name)),
    live:renderer.parkDecor.getObjectByName('Live stadium vision').material===renderer.venueVisionCache.get(parkId).material};
  },{parkId,parts});
  assert.deepEqual(status,{id:model,all:true,live:true});
  await page.screenshot({path:'tests/screenshots/'+model+'-plate.png'});
 }
 const before=await page.evaluate(()=>{
  const {game}=window.testDomeMatch;
  game.half='bottom';game.paused=false;
  const score=game.homeScore;
  game.startField(56,35,0,false);
  for(let i=0;i<900&&game.phase==='field';i++)game.updateField(.01);
  return score;
 });
 await page.locator('#game.replay-active').waitFor({state:'visible',timeout:15000});
 await page.touchscreen.tap(25,70);
 await page.locator('#replay-skip[data-mode="home-run"]').waitFor({state:'visible',timeout:8000});
 await page.touchscreen.tap(27,86);
 await page.waitForFunction(()=>window.testDomeMatch.game.phase!=='result');
 assert.equal(await page.evaluate(()=>window.testDomeMatch.game.homeScore),before+1,'skip advances play without double-counting the HR');
 for(const [id,model,landmark] of [
  ['night','intercontinental','Taichung multi-level outfield complex'],
  ['brick','tianmu','TAIPEI lettering behind home plate'],
  ['sky','tainan','Tainan horseshoe canopy']
 ]){
  const state=await page.evaluate(({id,landmark})=>{
   const {renderer,game}=window.testDomeMatch;
   game.park=NightPlayers.parks.find(park=>park.id===id);
   game.field=null;game.paused=true;game.setPhase('intro');
   renderer.render(game,++game.time);
   return {model:renderer.canvas.dataset.parkModel,shown:renderer.overviewMode,
    landmark:!!renderer.parkDecor.getObjectByName(landmark),
    board:!!renderer.parkDecor.getObjectByName('Live stadium vision')};
  },{id,landmark});
  assert.deepEqual(state,{model,shown:true,landmark:true,board:true});
  await page.screenshot({path:'tests/screenshots/'+model+'-overview.png'});
 }
 assert.deepEqual(errors,[],'no page JavaScript errors');
 console.log('PASS: mobile Chromium, live visions, three outdoor stadium overviews, fly-ball camera and separate replay/run skips ('+graphics+').');
 if(requests.length)console.log('Nonfatal request warnings:',requests.slice(0,5));
 await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
