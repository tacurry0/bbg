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
 const u=new URL(req.url,'http://localhost'),name=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).slice(1),f=resolve(dir,name);
 if(!f.startsWith(resolve(dir)+sep)){res.writeHead(403);res.end();return;}
 try{const data=await readFile(f);res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/',key='nightball.community.v1';
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  window.__peerCreated=0;
  window.Peer=class {
   constructor(id){this.id=id;this.events={};window.__peerCreated++;setTimeout(()=>{if(!this.dead)this.emit('open',id);},5);}
   on(event,fn){(this.events[event]??=[]).push(fn);return this;}
   emit(event,x){for(const fn of this.events[event]||[])fn(x);}
   destroy(){this.dead=true;this.emit('close');}
  };
 });
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const openOnline=async()=>{await page.waitForFunction(()=>!!document.querySelector('#game-canvas')?.dataset.graphics,null,{timeout:30000});await page.locator('[data-mode="online"]').tap();};
 const close=()=>page.locator('#modal-content [data-action="close"]').last().click();
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const waitLobby=async(name)=>{await page.locator('.cl-profile-summary b').waitFor();assert.equal(await page.locator('.cl-profile-summary b').textContent(),name);assert.equal(await page.locator('#cl-name').count(),0);assert.equal(await page.locator('[data-cl-action="rename"]').count(),0);};
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await openOnline();
 const initial=page.locator('#online-first-name');await initial.waitFor();
 assert.equal(await initial.inputValue(),'');assert.equal(await page.locator('#online-community').count(),0);
 assert.equal(await page.evaluate(()=>window.__peerCreated),0);
 await initial.fill('   ');await page.locator('#online-first-name-form button[type=submit]').click();
 await page.locator('#online-first-name-error').waitFor();assert.equal(await page.evaluate(()=>window.__peerCreated),0);
 await initial.fill('初回テスト');await page.locator('#online-first-name-form button[type=submit]').click();
 await waitLobby('初回テスト');const id=(await saved()).id;
 await close();
 await page.locator('#menu-settings').click();await page.locator('[data-settings-section="online-profile"]').click();
 const name=page.locator('#online-settings-name');await name.waitFor();assert.equal(await name.inputValue(),'初回テスト');
 await name.fill('変更後テスト');await page.locator('#online-settings-name-form button[type=submit]').click();
 assert.equal((await saved()).name,'変更後テスト');assert.equal((await saved()).id,id);
 await page.locator('#menu-home').click();await openOnline();await waitLobby('変更後テスト');await close();
 await page.reload({waitUntil:'domcontentloaded'});await openOnline();await waitLobby('変更後テスト');await close();

 const legacyId='0123456789abcdef0123';
 await page.evaluate(({key,id})=>localStorage.setItem(key,JSON.stringify({id,name:'Player-'+id.slice(-5),rating:1532,games:4,w:3,l:1,friends:[{id:'f'.repeat(20),name:'Friend'}]})),{key,id:legacyId});
 await page.goto(url+'?room=ABC234',{waitUntil:'domcontentloaded'});
 await page.locator('#online-first-name').waitFor({timeout:30000});assert.equal(await page.evaluate(()=>window.__peerCreated),0);
 await page.locator('#online-first-name').fill('旧データ');await page.locator('#online-first-name-form button[type=submit]').click();
 await waitLobby('旧データ');assert.equal(await page.locator('#online-code-input').inputValue(),'ABC234');
 const migrated=await saved();assert.equal(migrated.id,legacyId);assert.equal(migrated.rating,1532);assert.equal(migrated.friends.length,1);
 assert.deepEqual(errors,[],'no browser errors');
 console.log('PASS v275 mobile browser: initial registration, blank validation, settings-only rename, reload, and invite migration');
 await ctx.close();
}finally{await browser?.close();await new Promise(r=>server.close(r));}
