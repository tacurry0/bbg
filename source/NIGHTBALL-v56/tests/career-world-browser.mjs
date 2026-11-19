// World career setup, mobile navigation, live resume and archive smoke test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
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
 const url='http://127.0.0.1:'+server.address().port+'/';
 for(const [country,label,name,style] of [
  ['jp','日本','早瀬 悠馬','contact'],['tw','台湾','陳承翰','contact'],['kr','韓国','キム・ハジュン','control']
 ]){
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,
   reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{
   // Observe the existing engine in the browser test without substituting its actions or scores.
   Object.defineProperty(window,'NightGame',{configurable:true,set(klass){
    const watch=g=>{if(g?.worldFixture)window.observedCareerGame=g;return g;};
    const Type=new Proxy(klass,{
     construct(target,args,newTarget){return watch(Reflect.construct(target,args,newTarget));},
     get(target,key,receiver){
      if(key==='restore')return (...args)=>watch(Reflect.apply(target.restore,receiver,args));
      return Reflect.get(target,key,receiver);
     }
    });
    Object.defineProperty(window,'NightGame',{value:Type,writable:true,configurable:true});
   }});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const button=(action,value)=>page.locator('[data-world-action="'+action+'"]'+(value===undefined?'':'[data-value="'+value+'"]')).first();
  const press=(action,value)=>button(action,value).click();
  const open=async()=>{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('[data-mode="career"]').click();
  };
  const state=()=>page.evaluate(()=>NightCareerWorldSave.decode(localStorage.getItem(NightCareerWorld.key)));
  await open();
  assert.equal(await page.locator('[data-world-action="country"]').count(),3);
  await press('country',country);
  assert.match(await page.locator('#career h1').innerText(),new RegExp(label));
  await page.locator('[name="name"]').fill(name);
  await page.locator('[name="schoolTier"]').selectOption('2');
  await page.locator('[name="style"]').selectOption(style);
  await page.locator('#world-create [type="submit"]').click();
  await page.locator('.cw-train summary').click();
  const drill=country==='kr'?'control':'contact';
  await press('train',drill);
  assert.match(await page.locator('.cw-hero').innerText(),new RegExp(name));
  assert.equal(await page.locator('[data-world-action="tab"]').count(),0);
  await press('detail','schedule');
  if(country==='tw')assert.match(await page.locator('#modal-content').innerText(),/黑豹旗/);
  if(country==='jp')assert.match(await page.locator('#modal-content').innerText(),/甲子園/);
  if(country==='kr')assert.match(await page.locator('#modal-content').innerText(),/週末リーグ/);
  await page.locator('[data-action="close"]').click();

  for(let grade=1;grade<=3;grade++){
   let w=await state();
   assert.equal(w.grade,grade);
   await press('advance','game');
   w=await state();
   assert(w.queue?.selected>=0);
   const id=w.queue.games[w.queue.selected].id;
   assert(w.queue.games[w.queue.selected].development);
   await press('play','self');
   await page.locator('[data-field-action="appearance"]').waitFor({state:'visible',timeout:20000});
   if(grade===1){
    await page.locator('#pause').click();
    await page.locator('[data-action="leave"]').click();
    assert.match(await button('play').innerText(),/再開/);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-mode="career"]').click();
    assert.equal((await state()).currentGame.state.worldFixture,id);
    await press('play');
   }
   await page.locator('[data-field-action="appearance"]').click();
   await page.waitForFunction(pitcher=>window.observedCareerGame?.phase===(pitcher?'aim':'pitch'),country==='kr');
   await page.locator('#swing').dispatchEvent('pointerdown',{pointerType:'touch',detail:1});
   await page.waitForFunction(pitcher=>{
    const g=window.observedCareerGame;
    return pitcher?g.session.thrown>0||g.phase==='windup':g.session.swings>0;
   },country==='kr');
   await page.waitForFunction(()=>['aim','career-ready','ended'].includes(window.observedCareerGame.phase));
   if(await page.locator('#game').isVisible()){
    await page.locator('#pause').click();
    await page.locator('[data-action="world-finish-auto"]').click();
   }
   await page.locator('#career .cw-last').waitFor({state:'visible'});
   w=await state();
   assert.equal(w.last.id,id);
   assert.equal(w.schoolPlay[w.academicYear+'/'+grade],'live');
   assert(w.last.stat.g>0);
   let clicks=0;
   while(w.stage==='school'&&w.grade===grade&&clicks++<30){
    if(w.queue?.selected>=0) await press('simulate');
    else{
     await page.locator('.cw-batch summary').click();
     await press('advance','season');
    }
    w=await state();
   }
   assert(clicks<30);
  }
  assert.equal((await state()).stage,'draft');
  await press('draft-apply');
  await press('draft-all');
  const draft=await state();
  if(draft.draft.offer){
   await press('draft-sign');
   assert.equal((await state()).stage,'pro');
  }else{
   await press('amateur','大学');
   assert.equal((await state()).stage,'amateur');
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log('PASS:',label,'393 px setup, calendar, training, live operation each school year, saved result and draft decision.');
  await context.close();
 }
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
