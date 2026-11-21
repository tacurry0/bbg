import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const f=resolve(root,path==='/'?'index.html':'.'+path);
 if(!f.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 try{
  const bytes=await readFile(f);
  res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
 browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,
  hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const {StadiumRenderer}=await import('./stadium3d.js?v=77');
  const render=StadiumRenderer.prototype.render;
  StadiumRenderer.prototype.render=function(game,time){
   if(game)window.absTest={game,renderer:this};
   return render.call(this,game,time);
  };
 });
 await page.locator('[data-mode="match"]').click();
 await page.locator('[data-action="match-team-next"]').click();
 await page.locator('[data-action="match-lineup"]').click();
 await page.locator('[data-action="lineup-play"]').click();
 await page.waitForFunction(()=>window.absTest?.game.phase==='aim');
 await page.evaluate(()=>{
  window.absTouches=[];
  for(const type of ['pointerdown','pointerup','pointercancel','click']){
   document.addEventListener(type,e=>{
    window.absTouches.push({type,id:e.target.id,t:Math.round(e.timeStamp),button:e.button,
     phase:window.absTest.game.phase,at:Math.round(window.absTest.game.phaseTime)});
   },true);
  }
 });
 await mkdir('tests/screenshots',{recursive:true});
 for(const defending of [true,false]){
  await page.evaluate(defending=>{
   const {game:g}=window.absTest;
   g.half=defending===g.userHome?'top':'bottom';
   g.balls=0;g.strikes=0;g.field=null;g.hit=null;
   g.createPitch(NightGame.TYPES[0],{x:defending?1.04:1.08,y:.65});
   g.pitch.delivered=true;g.setPhase('pitch');
   const random=Math.random;
   try{Math.random=()=>defending?.99:0;g.take();}
   finally{Math.random=random;}
  },defending);
  const actor=page.locator('#abs-actor'),box=await actor.boundingBox();
  assert(box&&box.width>=44&&box.height>=44);
  assert.match(await actor.getAttribute('aria-label'),defending?/投手/:/打者/);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x,y}),'abs-actor','actor center receives touch');
  // One physical touch never opens a review; the second touch on the player does.
  await page.touchscreen.tap(x,y);
  assert(await page.locator('#abs-review').isHidden());
  await page.touchscreen.tap(x,y);
  try{await page.locator('#abs-review').waitFor({state:'visible',timeout:6000});}
  catch(error){
   throw Error((defending?'pitcher':'batter')+' touches: '+JSON.stringify(await page.evaluate(()=>window.absTouches)),{cause:error});
  }
  await page.locator('#abs-verdict').waitFor({state:'visible',timeout:18000});
  assert.equal(await page.locator('#abs-word').textContent(),defending?'好球':'壞球');
  assert.equal(await page.locator('#abs-change').textContent(),'判定変更');
  assert.match(await page.locator('#abs-gap').textContent(),/\d\.\d 公分/);
  if(!defending)await page.locator('#abs-review').screenshot({path:'tests/screenshots/abs-ball.png',timeout:6000});
  await page.locator('#abs-review').waitFor({state:'hidden',timeout:15000});
  assert.equal(await page.evaluate(()=>window.absTest.game.absRemaining),2);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: actual mobile double taps on pitcher and batter, 3D replay, 好球 and 壞球, and corrected calls.');
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
