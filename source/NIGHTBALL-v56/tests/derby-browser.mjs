import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const dir=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=resolve(dir,'.'+(name==='/'?'/index.html':name));
 if(!f.startsWith(dir+sep)){res.writeHead(403);return res.end();}
 try{const body=await readFile(f);res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
 const page=await browser.newPage({viewport:{width:412,height:860},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,null,{timeout:30000});
 mkdirSync('tests/screenshots',{recursive:true});
 await page.locator('[data-mode="derby"]').tap();
 await page.locator('.dr-hero').waitFor();
 assert.equal(await page.locator('.dr-mode').count(),3);assert(await page.locator('.dr-start').isVisible());
 await page.screenshot({path:'tests/screenshots/derby-menu-v263.png',timeout:90000});
 await page.locator('[data-action="derby-player-open"]').tap();
 assert((await page.locator('.dr-roster-player').count())>5);
 const power=await page.locator('.dr-roster-player .dr-power em').allTextContents();assert(power.map(Number).every((x,i,a)=>i===0||a[i-1]>=x));
 await page.screenshot({path:'tests/screenshots/derby-player-v263.png',timeout:90000});
 await page.locator('.dr-roster-player').first().tap();await page.locator('[data-action="derby-menu-back"].dr-start').tap();
 await page.locator('[data-derby-mode="record"]').tap();
 await page.evaluate(async()=>{
  const {StadiumRenderer}=await import('./stadium3d.js?v=269');
  const render=StadiumRenderer.prototype.render;
  StadiumRenderer.prototype.render=function(g,t){if(g?.derby)window.derbyTest={g,r:this};return render.apply(this,arguments);};
 });
 await page.locator('[data-action="start-derby"]').tap();
 await page.locator('#modal-content [data-action="close"]').tap();
 await page.locator('#modal').waitFor({state:'hidden'});
 await page.waitForFunction(()=>window.derbyTest?.g.derby&&document.querySelector('#game-canvas').dataset.spectatorModel==='tokyo-dome-real'&&Number(document.querySelector('#game-canvas').dataset.spectators)>20000,null,{timeout:45000});
 // Exercise the real countdown UI without charging the timer; the engine
 // timing is independently checked in derby-v262.cjs.
 await page.evaluate(()=>{const {g}=window.derbyTest;g.setPhase('intro');g.derby.remaining=120000;g.paused=true;g.phaseTime=0;});
 await page.evaluate(()=>{window.derbyTest.g.phaseTime=1250;});
 assert.equal(await page.locator('#derby-intro-overlay').isVisible(),false);
 for(const [number,at] of [[3,2120],[2,3120],[1,4120]]){
  await page.evaluate(t=>{window.derbyTest.g.phaseTime=t;},at);
  await page.waitForFunction(n=>document.querySelector('#derby-intro-overlay:not([hidden]) .dr-start-count>b')?.textContent===String(n),number,{timeout:10000});
  assert.equal(await page.locator('#derby-clock').textContent(),'2:00');
  assert.equal(await page.locator('#bat-options').isVisible(),false);
  if(number===3){
   await page.evaluate(()=>{const g=window.derbyTest.g;g.paused=false;g.savedUpdate=g.update;g.update=()=>{};});
   const rect=await page.locator('#game-canvas').boundingBox();const before=await page.evaluate(()=>({...window.derbyTest.g.cursor}));
   await page.mouse.move(rect.x+rect.width*.42,rect.y+rect.height*.78);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.65);await page.mouse.up();
   const after=await page.evaluate(()=>{const g=window.derbyTest.g;g.update=g.savedUpdate;g.paused=true;return {...g.cursor};});assert(Math.hypot(after.x-before.x,after.y-before.y)>.1,'aim must move during countdown');
  }
  if(number===1)await page.screenshot({path:'tests/screenshots/derby-countdown-v269.png',timeout:90000});
 }
 await page.evaluate(()=>{const {g,r}=window.derbyTest;g.beginHalf();g.startField(62,29,.10,false,true);while(g.phase==='field')g.updateField(1/120);assertDriver();function assertDriver(){if(g.hit.kind!=='hr')throw Error('Expected HR');}g.phaseTime=460;g.paused=true;
  const impact=document.querySelector('#impact-fx');
  if(impact.hidden||impact.dataset.kind!=='hr')throw Error('The shared HOME RUN animation did not start');
  void impact.offsetWidth;
  // GPU-free CI is slow. Freeze the actual live animation halfway through,
  // not the finished transparent state, so the screenshot is representative.
  const animations=impact.getAnimations({subtree:true});
  if(!animations.length)throw Error('HOME RUN animation is missing');
  for(const a of animations){a.pause();a.currentTime=460;}
  r.render(g,g.time);});
 await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.cameraView==='derby-landing',null,{timeout:10000});
 const scene=await page.evaluate(()=>{const {g,r}=window.derbyTest,show=r.vfx.derbyShow;return {clock:g.derby.remaining,show:show.group.visible,puffs:show.jets.filter(j=>j.root.visible).map(j=>j.flame.filter(f=>f.visible).length),jets:show.jets.filter(j=>j.root.visible).length,bursts:show.bursts.filter(b=>b.root.visible).length,spectators:Number(r.canvas.dataset.spectators)};});
 assert(scene.show&&scene.jets>=3&&scene.bursts>=2&&scene.spectators>20000&&scene.puffs.every(n=>n>=3),JSON.stringify(scene));
 assert.equal(await page.locator('#modal').isVisible(),false);
 assert(await page.locator('.dr-hud').isVisible());assert.equal(await page.locator('.dr-hud-metrics>span').count(),3);
 // At the first post-landing frame, measure each active jet's camera projection.
 // A visible mesh alone does not prove the celebration is in the shot.
 const framing=await page.evaluate(()=>{const {r}=window.derbyTest;return r.vfx.derbyShow.jets.filter(j=>j.root.visible).map(j=>{const p=j.root.position;const a=r.project(p.x,p.y+3,p.z);return a.x>=0&&a.x<=r.width&&a.y>=0&&a.y<=r.height;});});
 assert(framing.filter(Boolean).length>=3,'at least three flame jets must be in the frame: '+framing);
 
 await page.screenshot({path:'tests/screenshots/derby-homer-v269.png',timeout:90000});
 // A long non-walkoff HR never cuts to a batter close-up.
 await page.evaluate(()=>{const {g,r}=window.derbyTest;g.phaseTime=1500;r.render(g,g.time);});
 assert.equal(await page.locator('#game-canvas').getAttribute('data-camera-view'),'derby-landing');
 // Also shoot a normal home run in an outdoor stadium, the configuration
 // where three flat flames were originally reported. Use the real ball physics.
 await page.evaluate(()=>{
  const {g,r}=window.derbyTest;g.park=NightPlayers.parks.find(p=>p.id==='river');g.paused=true;
  for(let speed=43;speed<=57;speed+=2){
   g.derby.streak=0;g.beginHalf();g.startField(speed,28,.28,false,true);
   while(g.phase==='field')g.updateField(1/120);
   if(g.hit.kind==='hr'&&g.field.homerCelebration?.level===1)break;
  }
  if(g.hit.kind!=='hr'||g.field.homerCelebration?.level!==1)throw Error('Expected normal outdoor HR');
  g.phaseTime=510;g.paused=true;const impact=document.querySelector('#impact-fx');void impact.offsetWidth;
  for(const a of impact.getAnimations({subtree:true})){a.pause();a.currentTime=510;}
  r.render(g,g.time);
 });
 // All four shots share actual stadium geometry. Verify projected lane
 // positions and capture the peak of each animation for visual review.
 for(const kind of ['landing','outfield','sweep','fan','vision','stands','field','sideline']){
  const shot=await page.evaluate(kind=>{const {g,r}=window.derbyTest;g.field.homerCelebration.presentation=kind;g.derby.turnHR=NightGame.DERBY_SHOWS.indexOf(kind)+1;g.phaseTime=kind==='sweep'?660:560;r.render(g,g.time);
   const active=r.vfx.derbyShow.jets.filter(j=>j.root.visible),projected=active.map(j=>{const p=j.root.position,a=r.project(p.x,p.y+3,p.z);return a.x>=0&&a.x<=r.width&&a.y>=0&&a.y<=r.height;});
   return {view:r.canvas.dataset.cameraView,lanes:active.length,visible:projected.filter(Boolean).length,puffs:active.map(j=>j.flame.filter(f=>f.visible).length),shells:r.vfx.derbyShow.bursts.filter(b=>b.root.visible&&b.lines.visible).length};
  },kind);
  assert.equal(shot.view,'derby-'+kind);assert.equal(shot.lanes,kind==='outfield'?7:kind==='landing'?3:5);assert(shot.visible>=shot.lanes-1,JSON.stringify(shot));assert(shot.puffs.every(n=>n>=3),JSON.stringify(shot));assert(shot.shells>=2,JSON.stringify(shot));
  await page.screenshot({path:'tests/screenshots/derby-'+kind+'-v269.png',timeout:90000});
 }

 // Actual tournament result, not just interpolated test markup.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,null,{timeout:30000});
 await page.locator('[data-mode="derby"]').tap();await page.locator('[data-derby-mode="tournament"]').tap();
 await page.evaluate(async()=>{const {StadiumRenderer}=await import('./stadium3d.js?v=269');const render=StadiumRenderer.prototype.render;StadiumRenderer.prototype.render=function(g,t){if(g?.derby)window.derbyTest={g,r:this};return render.apply(this,arguments);};});
 await page.locator('[data-action="start-derby"]').tap();
 await page.locator('.dr-wheel').waitFor();
 await page.locator('.dr-wheel').evaluate(el=>{const a=el.getAnimations()[0];a.pause();a.currentTime=2000;});
 await page.screenshot({path:'tests/screenshots/derby-draw-v269.png',timeout:90000});
 await page.locator('.dr-wheel').evaluate(el=>el.getAnimations()[0].play());
 await page.locator('#modal-content[data-kind="derby-bracket"]').waitFor({timeout:40000});
 await page.locator('#modal-content [data-action="close"]').tap();
 await page.waitForFunction(()=>window.derbyTest?.g.derby.mode==='tournament',null,{timeout:45000});
 await page.evaluate(()=>{const {g}=window.derbyTest,d=g.derby;g.paused=true;if(d.drawSlot!==d.rounds[0].flatMap(m=>m.entrants).findIndex(e=>e.user))throw Error('draw not matched');d.matchup.first=1-d.userIndex;d.matchup.normal[1-d.userIndex]=2;for(let i=0;i<3;i++)d.record({hr:true,kind:'hr',distance:128+i*6,exitKmh:167+i*7,launchAngle:29,sprayAngle:0,x:(i-1)*25,y:125+i*5});d.turnHR=3;g.finishDerbyTurn();});
 await page.locator('#derby-victory-overlay:not([hidden])').waitFor();
 await page.evaluate(()=>{const {g,r}=window.derbyTest;g.derbyVictory.elapsed=610;g.derbyVictory.duration=30000;r.render(g,g.time+610);});
 await page.screenshot({path:'tests/screenshots/derby-victory-v269.png',timeout:90000});
 await page.locator('.dr-victory-skip').tap();
 await page.locator('#modal-content[data-kind="derby-result"]').waitFor();
 assert.equal(await page.locator('.derby-bracket .derby-pair').count(),7);
 assert.equal(await page.locator('.derby-bracket details').count(),0);
 assert(await page.locator('.derby-bracket .winner-path').count()>0);
 const layout=await page.evaluate(()=>{const modal=document.querySelector('#modal-content'),b=document.querySelector('.derby-bracket'),svg=document.querySelector('.dr-map-frame svg');const overlaps=[...b.querySelectorAll('.derby-entry:not(.pending)')].some(e=>{const n=e.querySelector('.derby-player').getBoundingClientRect(),v=e.querySelector('.dr-bracket-score').getBoundingClientRect(),l=e.querySelector('.dr-bracket-logo').getBoundingClientRect();return n.right>v.left+1||l.right>n.left+1||Math.abs(n.top+n.height/2-v.top-v.height/2)>2;});return {width:modal.clientWidth,scrollWidth:modal.scrollWidth,mapHeight:svg.getBoundingClientRect().height,bracketHeight:b.getBoundingClientRect().height,overlaps};});
 assert(layout.scrollWidth<=layout.width+2&&layout.mapHeight>=150&&layout.bracketHeight<390&&!layout.overlaps,JSON.stringify(layout));
 await page.locator('#modal-content').evaluate(el=>el.getAnimations().forEach(a=>a.finish()));
 await page.screenshot({path:'tests/screenshots/derby-result-v269.png',timeout:90000});
 await page.locator('.dr-map-frame').scrollIntoViewIfNeeded();
 await page.screenshot({path:'tests/screenshots/derby-spray-v269.png',timeout:90000});
 assert.deepEqual(errors,[]);console.log('PASS v269 mobile derby UI, 3D crowd, HR camera and stadium pyrotechnics',scene);
}finally{await browser?.close();server.close();}

