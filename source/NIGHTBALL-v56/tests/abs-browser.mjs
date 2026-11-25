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
  const {StadiumRenderer}=await import('./stadium3d.js?v=79');
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
 const initialCount=page.locator('#abs-count');
 assert(await initialCount.isVisible());
 assert.equal(await page.locator('#abs-remaining').textContent(),'2');
 const counters=await page.evaluate(()=>{
  const a=document.getElementById('abs-count').getBoundingClientRect();
  const w=document.getElementById('wind-hud').getBoundingClientRect();
  return {gap:w.left-a.right,topMatch:Math.abs(w.top-a.top)};
 });
 assert(counters.gap>0&&counters.gap<12&&counters.topMatch<2,'ABS is immediately left of wind');
 assert.equal(await page.locator('#abs-hint').count(),0);
 const poses=await page.evaluate(async()=>{
  const {absCameraPose}=await import('./abs-review.js?v=3');
  const ball=[.22,.8,-.015],reveal=NightGame.ABS_TIMING.reviewReveal;
  return [0,1260,2040,reveal].map(t=>absCameraPose(ball,t,true,reveal).eye);
 });
 assert(poses[0][2]>0&&poses[1][0]<-2.5&&Math.abs(poses[1][2])<.01&&poses[2][2]<-2&&poses[3][2]<0);
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
 let bannerTop;
 for(const [defending,corrected] of [[true,true],[false,true],[false,false]]){
  const expectedColor=defending?'#7cea75':'#ffe054';
  await page.evaluate(({defending,corrected})=>{
   const {game:g}=window.absTest;
   g.half=defending===g.userHome?'top':'bottom';
   g.balls=0;g.strikes=0;g.field=null;g.hit=null;
   g.createPitch(NightGame.TYPES[0],{x:defending?1.04:corrected?1.08:0,y:.65});
   g.pitch.delivered=true;g.setPhase('pitch');
   const random=Math.random;
   try{Math.random=()=>defending?.99:0;g.take();}
   finally{Math.random=random;}
  },{defending,corrected});
  const call=page.locator('#stage-message');
  const layout=await call.evaluate(e=>{
   const stage=document.getElementById('stage').getBoundingClientRect();
   const banner=e.querySelector('.stage-call'),box=banner.getBoundingClientRect();
   const pitcher=window.absTest.renderer.project(0,2.22,18.4);
   const style=getComputedStyle(e);
   return {top:parseFloat(style.top),bottom:box.bottom-stage.top,head:pitcher.y,height:stage.height,
    oldClass:e.classList.contains('pitch-ball'),color:getComputedStyle(banner).getPropertyValue('--call-accent').trim()};
  });
  assert(!layout.oldClass,'the pitch selector sprite class must not style the call banner');
  assert.equal(layout.color,expectedColor);
  // v150: the pitch-call banner moved DOWN (top floor 266u in abs.css) so it
  // never covers the at-bat pitch chart, which now sits at the top of the
  // stage — it must start below that chart zone (~32% of the stage) while
  // still sitting fully above the pitcher.
  assert(layout.top>layout.height*.30&&layout.bottom<layout.head,'banner sits below the top chart and above the pitcher');
  bannerTop??=layout.top;
  assert.equal(layout.top,bannerTop,'balls and strikes use the same banner position');
  assert(await initialCount.isVisible());
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
  assert.equal(await page.locator('#abs-word').textContent(),defending||!corrected?'好球':'壞球');
  assert.equal(await page.locator('#abs-change').textContent(),corrected?'判定変更':'判定維持');
  assert.match(await page.locator('#abs-gap').textContent(),/\d\.\d 公分/);
  if(!defending&&corrected)await page.locator('#abs-review').screenshot({path:'tests/screenshots/abs-ball.png',timeout:6000});
  await page.locator('#abs-review').waitFor({state:'hidden',timeout:15000});
  assert.equal(await page.locator('#abs-remaining').textContent(),corrected?'2':'1');
 }
 // A correctly called borderline strike can still draw an unsuccessful CPU challenge.
 await page.evaluate(()=>{
  const {game:g}=window.absTest;
  g.half=g.userHome?'top':'bottom';
  g.balls=0;g.strikes=0;
  g.createPitch(NightGame.TYPES[0],{x:1.04,y:.65});
  g.pitch.delivered=true;g.setPhase('pitch');
  const draws=[0,.99,0],random=Math.random;
  try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 });
 await page.locator('#abs-review').waitFor({state:'visible',timeout:14000});
 assert(await page.locator('#abs-actor').isHidden());
 assert.match(await page.locator('#abs-challenger').textContent(),/打者のチャレンジ/);
 await page.locator('#abs-verdict').waitFor({state:'visible',timeout:18000});
 assert.equal(await page.locator('#abs-change').textContent(),'判定維持');
 await page.locator('#abs-review').waitFor({state:'hidden',timeout:15000});
 assert.equal(await page.evaluate(()=>window.absTest.game.absCpuRemaining),1);
 assert.equal(await page.locator('#abs-remaining').textContent(),'1');
 assert.deepEqual(errors,[]);
 console.log('PASS: actual mobile double taps on pitcher and batter, banner positions, 3D replay, and unsuccessful CPU appeal.');
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
