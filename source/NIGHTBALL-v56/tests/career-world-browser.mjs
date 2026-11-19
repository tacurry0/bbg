// World career setup, mobile navigation, live resume and archive smoke test.
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
  const bytes=await readFile(f);
  res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream',
                    'Cache-Control':'no-store'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox'
 ]});
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const press=(action,value)=>page.locator('[data-world-action="'+action+'"]'+(value?'[data-value="'+value+'"]':'')).first().click();
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('[data-mode="career"]').click();
 assert.equal(await page.locator('[data-world-action="country"]').count(),3);
 await press('country','tw');
 assert.match(await page.locator('#career h1').innerText(),/台湾/);
 assert.match(await page.locator('[name="schoolIndex"]').innerText(),/高商/);
 await page.locator('[name="name"]').fill('陳承翰');
 await page.locator('#world-create [type="submit"]').click();
 assert.match(await page.locator('.cw-hero').innerText(),/2027-08-15/);
 await press('tab','schedule');
 assert.match(await page.locator('#career').innerText(),/黑豹旗/);
 assert.match(await page.locator('#career').innerText(),/玉山盃/);
 await press('tab','skills');
 await press('train','contact');
 assert.match(await page.locator('.cw-hero').innerText(),/ミート/);
 await page.evaluate(()=>{
  const w=NightCareerWorld.restore(NightCareerWorldSave.decode(localStorage.getItem(NightCareerWorld.key)));
  for(const key of NightCareerWorldMatch.batting)w.player[key]=79;
  w.run('game');
  if(!w.active||!w.liveOptions('self'))throw Error('No live school game');
  localStorage.setItem(NightCareerWorld.key,NightCareerWorldSave.encode(w));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-mode="career"]').click();
 await press('play');
 await page.waitForFunction(()=>!document.getElementById('game').hidden);
 await page.locator('#pause').click();
 await page.locator('[data-action="leave"]').click();
 assert.match(await page.locator('[data-world-action="play"]').innerText(),/再開/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-mode="career"]').click();
 await press('play');
 await page.waitForFunction(()=>!document.getElementById('game').hidden);
 await page.locator('#pause').click();
 await page.locator('[data-action="leave"]').click();
 await press('tab','international');
 assert.match(await page.locator('#career').innerText(),/アジアシリーズ/);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile country picker, local school calendar, training, live pause/save/reload and international tab.');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
