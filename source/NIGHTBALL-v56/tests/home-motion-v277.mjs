import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const dir=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.mp4':'video/mp4','.glb':'model/gltf-binary','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),file=resolve(dir,name);
 if(!file.startsWith(resolve(dir)+sep)){res.writeHead(403);res.end();return;}
 try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'no-preference'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ready=()=>page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics&&[...document.querySelectorAll('video[data-home-clip]')].every(v=>v.parentElement.classList.contains('nb-home-motion-ready')),null,{timeout:40000});
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready();
 const snapshot=()=>page.evaluate(()=>{
  const order=s=>Array.from(document.querySelectorAll(s)).map(b=>b.dataset.mode||b.id);
  const rects=Array.from(document.querySelectorAll('#home .menu-card,#home .menu-mini,#home .menu-utilities button')).map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n));});
  const vids=[...document.querySelectorAll('video[data-home-clip]')].map(v=>{
   let hash=null;if(v.readyState>=2&&!v.paused&&v.videoWidth){const c=document.createElement('canvas');c.width=96;c.height=48;const x=c.getContext('2d');x.drawImage(v,0,0,96,48);const d=x.getImageData(0,0,96,48).data;let h=0;for(let i=0;i<d.length;i+=20)h=(h*31+d[i])|0;hash=h;}
   return {key:v.dataset.homeClip,time:v.currentTime,paused:v.paused,show:v.classList.contains('nb-home-clip-show'),fallback:v.parentElement.querySelector('.nb-home-clip-fallback')?.getAttribute('src'),hash,events:getComputedStyle(v).pointerEvents};
  });
  const icon=document.querySelector('#home .nb-mini-bat');
  return {vids,rects,featured:order('#home .menu-modes > button'),training:order('#home .menu-training [data-mode]'),other:order('#home .menu-other-grid > button'),nav:order('#home .menu-utilities > button'),overflow:document.documentElement.scrollWidth>innerWidth,icon:icon?getComputedStyle(icon).animationName:'none',notice:getComputedStyle(document.querySelector('.nb-home-notice-art')).backgroundImage};
 });
 const before=await snapshot();
 assert.equal(before.vids.length,5);
 assert(before.vids.every(v=>v.events==='none'&&(v.show||v.fallback?.endsWith('-animated.webp'))));
 assert.deepEqual(before.featured,['match','pennant-mode','online','career']);
 assert.deepEqual(before.training,['practice','derby','pitching','bullpen']);
 assert.deepEqual(before.other,['tournament','apbc','timeattack','survival','draft','conquest','scrimmage','menu-team-edit']);
 assert.deepEqual(before.nav,['menu-home','clubhouse','records','menu-trophies','menu-settings']);
 assert.equal(before.overflow,false);assert.equal(before.icon,'nb-mini-swing');
 await page.waitForTimeout(1150);
 const after=await snapshot();
 for(const v of before.vids.filter(x=>x.show&&!x.paused&&x.hash!==null)){
  const n=after.vids.find(x=>x.key===v.key);assert.notEqual(n.time,v.time,'video playback '+v.key);assert.notEqual(n.hash,v.hash,'real visual motion '+v.key);
 }
 assert.deepEqual(after.rects,before.rects,'no hit-target movement');
 await mkdir('tests/screenshots',{recursive:true});await page.screenshot({path:'tests/screenshots/home-motion-v277.png'});
 const notice=page.locator('#notice-title'),noticetext=await notice.textContent();await page.locator('#home [data-notice-step="1"]').tap();assert.notEqual(await notice.textContent(),noticetext);
 // The next notice may share a category, but every actual entry change
 // gets the slide transition, and the native notice navigation remains.
 assert((await snapshot()).notice.includes('motion-v277/'));
 await page.locator('#home [data-mode="online"]').tap();await page.locator('#online-first-name').waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('video[data-home-clip]')].every(v=>v.paused));
 assert(await page.locator('#home').evaluate(e=>e.classList.contains('nb-home-motion-paused')));
 await page.locator('#modal-content [data-action="close"]').last().tap();await page.locator('#modal').waitFor({state:'hidden'});
 await page.evaluate(()=>window.scrollTo(0,0));await ready();
 await page.emulateMedia({reducedMotion:'reduce'});
 try{await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&[...document.querySelectorAll('video[data-home-clip]')].every(v=>v.paused&&!v.parentElement.classList.contains('nb-home-motion-ready')),null,{timeout:12000});}
 catch(e){console.log('reduced-motion diagnostics',await page.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,homeHidden:document.getElementById('home').hidden,homePaused:document.getElementById('home').classList.contains('nb-home-motion-paused'),clips:[...document.querySelectorAll('video[data-home-clip]')].map(v=>({key:v.dataset.homeClip,paused:v.paused,ready:v.readyState,hostReady:v.parentElement.classList.contains('nb-home-motion-ready'),src:v.getAttribute('src')}))})));throw e;}
 const reduced=await snapshot();
 assert(!reduced.icon.includes('nb-mini-swing'));
 assert.deepEqual(reduced.rects,before.rects,'reduced motion should restore original layout');
 assert.equal(reduced.overflow,false);assert.deepEqual(errors,[],'no uncaught JS errors');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await ready();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>[...document.querySelectorAll('video[data-home-clip]')].every(v=>v.paused&&!v.parentElement.classList.contains('nb-home-motion-ready')),null,{timeout:12000});
 await context.close();

 // Browser with blocked media still gets genuine animated WebP, and the
 // card remains the same clickable button.
 const fallbackCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'no-preference'});
 await fallbackCtx.route('**/motion-v277/*.mp4',route=>route.abort());
 const fallback=await fallbackCtx.newPage();await fallback.goto(url,{waitUntil:'domcontentloaded'});
 await fallback.waitForFunction(()=>[...document.querySelectorAll('video[data-home-clip]')].every(v=>{const img=v.parentElement.querySelector('.nb-home-clip-fallback');return img?.classList.contains('nb-home-clip-show')&&img.getAttribute('src')?.endsWith('-animated.webp')&&img.naturalWidth>0;}),null,{timeout:40000});
 await fallback.locator('#home [data-mode="online"]').tap();await fallback.locator('#online-first-name').waitFor();
 await fallback.waitForFunction(()=>[...document.querySelectorAll('.nb-home-clip-fallback')].every(i=>!i.getAttribute('src')?.endsWith('-animated.webp')));
 await fallbackCtx.close();
 console.log('PASS v277: real media playback, original menu/hit targets, animated mini modes, notice navigation, modal pause, reduced motion and animated-image fallback');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
