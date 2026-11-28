import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const dir=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.glb':'model/gltf-binary','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),file=resolve(dir,name);
 if(!file.startsWith(resolve(dir)+sep)){res.writeHead(403);res.end();return;}
 try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'no-preference'});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,null,{timeout:30000});
 await page.locator('#home').waitFor();
 await page.waitForTimeout(550);
 const details=()=>page.evaluate(()=>{
  const style=(selector,pseudo=null)=>{const s=getComputedStyle(document.querySelector(selector),pseudo);return {name:s.animationName,state:s.animationPlayState,transform:s.transform,opacity:s.opacity,pointerEvents:s.pointerEvents};};
  const order=s=>Array.from(document.querySelectorAll(s)).map(b=>b.dataset.mode||b.id);
  const rects=Array.from(document.querySelectorAll('#home .menu-card,#home .menu-mini,#home .menu-utilities button')).map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));});
  return {hero:style('#home .menu-key-art'),beam:style('#home .menu-hero','::after'),cards:Array.from(document.querySelectorAll('#home .menu-card')).map(el=>{const s=getComputedStyle(el,'::after');return {name:s.animationName,state:s.animationPlayState,delay:s.animationDelay,pointerEvents:s.pointerEvents};}),trophy:style('#home .menu-trophy'),online:style('#home .menu-online-art'),icon:style('#home .menu-training .menu-mini svg'),notice:style('#home .notice-card','::after'),featured:order('#home .menu-modes > button'),training:order('#home .menu-training [data-mode]'),other:order('#home .menu-other-grid > button'),nav:order('#home .menu-utilities > button'),rects,overflow:document.documentElement.scrollWidth>window.innerWidth};
 });
 const before=await details();
 assert.equal(before.hero.name,'nb-home-hero-drift');
 assert.equal(before.beam.name,'nb-home-hero-light');
 assert.equal(before.beam.pointerEvents,'none');
 assert.equal(before.trophy.name,'nb-home-trophy');
 assert.equal(before.online.name,'nb-home-online');
 assert.equal(before.icon.name,'nb-home-icon');
 assert.equal(before.notice.name,'nb-home-card-sweep');
 assert(before.cards.every(c=>c.name==='nb-home-card-sweep'&&c.pointerEvents==='none'));
 assert.equal(new Set(before.cards.map(c=>c.delay)).size,4,'stagger the light effects');
 assert.deepEqual(before.featured,['match','pennant-mode','online','career']);
 assert.deepEqual(before.training,['practice','derby','pitching','bullpen']);
 assert.deepEqual(before.other,['tournament','apbc','timeattack','survival','draft','conquest','scrimmage','menu-team-edit']);
 assert.deepEqual(before.nav,['menu-home','clubhouse','records','menu-trophies','menu-settings']);
 assert.equal(before.overflow,false);
 await page.waitForTimeout(900);
 const after=await details();
 assert.notEqual(after.hero.transform,before.hero.transform,'hero artwork actually moves');
 assert.notEqual(after.trophy.transform,before.trophy.transform,'trophy actually moves');
 assert.deepEqual(after.rects,before.rects,'animation must not shift hit targets');

 const notice=page.locator('#notice-title');
 const noticeText=await notice.textContent();
 await page.locator('#home [data-notice-step="1"]').tap();
 assert.notEqual(await notice.textContent(),noticeText,'existing notice navigation still works');
 await page.locator('#home [data-mode="online"]').tap();
 await page.locator('#online-first-name').waitFor();
 const paused=await details();
 assert.equal(paused.hero.state,'paused','pause the homepage behind dialogs');
 assert(paused.cards.every(c=>c.state==='paused'));
 await page.locator('#modal-content [data-action="close"]').last().tap();
 await page.locator('#modal').waitFor({state:'hidden'});
 assert.equal((await details()).hero.state,'running');

 // Reduced motion removes all new loops and leaves the original menu.
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await details();
 for(const item of [reduced.hero,reduced.beam,reduced.trophy,reduced.online,reduced.icon,reduced.notice,...reduced.cards])assert(!item.name.includes('nb-home-'),'new motion is disabled');
 assert.deepEqual(reduced.featured,before.featured);
 assert.deepEqual(reduced.rects,before.rects,'reduced motion preserves layout');
 assert.equal(reduced.overflow,false);
 assert.deepEqual(errors,[],'no uncaught JS errors');
 console.log('PASS v276: animation movement, layout/hit-target stability, notice navigation, modal pause and reduced motion');
 await ctx.close();
} finally {await browser?.close();await new Promise(r=>server.close(r));}
