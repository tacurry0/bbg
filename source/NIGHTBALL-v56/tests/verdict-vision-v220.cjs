// v224: Verify Stadium Vision contrast, result readability, semantic colours and timing using the real
// app.js event handler, plus an optional Chromium check of the actual CSS.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dist=path.resolve(__dirname,'../dist');
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
const source=read('app.js'), html=read('index.html'), css=read('verdict-vision.css');
const handler=source.slice(source.indexOf('const RESULT_NON_RESULTS='),source.indexOf(' function updateHalfBreak('));
const baseCall=source.slice(source.indexOf('function tickPlayFeedback('),source.indexOf(' function updateAbsUI('));
assert(handler.includes('function onEvent(')&&baseCall.includes("callTime=verdict==='out'?1800:1500"));
const samples=[
 ['STRIKE','','','', 'strike'],
 ['BALL','','','', 'ball'],
 ['SWING & MISS','空振り','','','strike'],
 ['STRIKEOUT','見逃し三振！','1アウト','out','strike'],
 ['FOUL','ファウル','次の1球へ。','','neutral'],
 ['WALK','','押し出しで1点','','ball'],
 ['HIT BY PITCH','死球','打者は一塁へ','','ball'],
 ['FLY OUT','フライアウト','1アウト','out','out'],
 ['SINGLE','ヒット','レフト前へ','hit','hit'],
 ['GROUND-RULE DOUBLE','エンタイトルツーベース','2塁','hit','hit'],
 ['DOUBLE PLAY','ダブルプレー','2アウト','out','out'],
 ['MISPLAY','打球を後逸','田中','neutral','error'],
 ['WILD THROW','送球がそれた','田中','neutral','error'],
 ['WILD PITCH','暴投','走者が進塁した','','error'],
 ['PASSED BALL','捕逸','走者が進塁した','','error'],
 ['JUMPING CATCH','ジャンピングキャッチ','田中','out','out'],
 ['STEAL','盗塁成功','二塁へ','','hit'],
 ['HOME RUN','ホームラン！','128 m','homer','homer'],
 ['HOME RUN','ホームラン！','129 m · 1点','homer','homer','SOLO HOME RUN',1],
 ['HOME RUN','ホームラン！','130 m · 2点','homer','homer','2-RUN HOME RUN',2],
 ['HOME RUN','ホームラン！','131 m · 3点','homer','homer','3-RUN HOME RUN',3],
 ['HOME RUN','ホームラン！','132 m · 4点','homer','homer','GRAND SLAM',4],
];
const makeData=([en,ja,sub,kind,tone,label,runs])=>({en,ja,sub,kind,speech:ja,...(runs?{homeRunRuns:runs}:{})});
const expectedLabel=sample=>sample[5]||({'SWING & MISS':'STRIKE','SINGLE':'HIT','MISPLAY':'ERROR','WILD THROW':'ERROR'})[sample[0]]||sample[0];
const fake=()=>({textContent:'',className:'',dataset:{},hidden:false,innerHTML:'',
  get classList(){return {contains:c=>this.className.split(' ').includes(c),remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ')}}},
  animations:[],getAnimations(){return []},animate(frames,opts){this.animations.push({frames,opts})}});
const ids=Object.fromEntries(['message-en','message-ja','message-sub','stage-message','umpire-call','distance','timing-result','play-tools','scoring-chip'].map(id=>[id,fake()]));
const detail=fake(),banner=fake();
ids['stage-message'].querySelector=s=>s==='.stage-call'?banner:detail;
const speech=[],sent=[];
const context={ $:id=>ids[id],game:{inning:1,half:'top',batter:{name:'A'},outs:0,homeScore:0,awayScore:0,phase:'result'},
  online:{role:'host',session:{open:true,send:d=>sent.push(d)}},speakPlay:d=>speech.push(d),
  reduceAbsMotion:{matches:false},matchMedia:()=>({matches:false}),playFeedback:{callTime:0,resultTime:0,scoreTime:0},updateChallenge:()=>{} };
vm.createContext(context);
vm.runInContext(handler+'\n'+baseCall+'\n globalThis.call=onEvent;globalThis.baseCall=showPlayCall;globalThis.hideStale=hideStaleResultBanner;globalThis.tickFeedback=tickPlayFeedback;',context);
const call=(data)=>context.call('message',data);
for(const sample of samples){
 const data=makeData(sample),raw=JSON.stringify(data);
 call(data);
 assert(ids['stage-message'].classList.contains('vision-call'),data.en);
 assert.equal(ids['stage-message'].dataset.visionTone,sample[4],data.en+' colour');
 assert.equal(ids['message-en'].textContent,expectedLabel(sample));
 assert(ids['message-ja'].hidden&&detail.hidden,'single label only');
 assert.equal(ids['message-sub'].textContent,'');
 assert.equal(JSON.stringify(data),raw,'event data stays intact');
 assert.equal(speech.at(-1),data,'voice still receives raw message');
 assert.equal(sent.at(-1).d,data,'online peer receives the same raw event');
}
call(makeData(['SWING & MISS','空振り','','']));
assert(ids['message-ja'].hidden&&detail.hidden,'no duplicate Japanese or empty detail on an ordinary miss');
call(makeData(['SWING & MISS','空振り','ボールの位置とカーソルを合わせよう','']));
assert(ids['message-ja'].hidden&&detail.hidden,'practice miss stays one label');
call(makeData(['FOUL','ファウル','次の1球へ。','']));
assert(ids['message-ja'].hidden&&detail.hidden,'foul displays one label');
const strikeout=makeData(['STRIKEOUT','空振り三振！','2アウト','out']);
call(strikeout);
assert(ids['message-ja'].hidden&&detail.hidden,'strikeout displays one label');
assert.equal(speech.at(-1).ja,'空振り三振！','speech still distinguishes swinging and looking');
assert.equal(context.playFeedback.resultTime,1500,'strikeouts remain readable for at least 1.5s');
const n=banner.animations.length;call(strikeout);
assert.equal(banner.animations.length,n,'result dedup is unchanged');
const beforeStale=ids['stage-message'].className;
context.game.phase='aim';context.hideStale();assert(!ids['stage-message'].classList.contains('show'),'stale result hidden');
assert.equal(ids['stage-message'].className,beforeStale.replace(' show',''),'stale result retains tone and layout during fade');
assert.equal(context.playFeedback.resultTime,0,'stale state cannot carry a hold into a new pitch');
context.game.phase='result';
call(makeData(['BALL','','','']));const p=banner.animations.length;call(makeData(['BALL','','','']));
assert.equal(banner.animations.length,p,'same-pitch animation suppression preserved');
assert.equal(banner.animations.at(-1).opts.duration,245,'existing pitch animation duration');
const pitchClass=ids['stage-message'].className;
context.call('clear');
assert.equal(ids['stage-message'].className,pitchClass.replace(' show',''),'fade keeps pitch styling');
call(makeData(['BALL','','','']));
assert.equal(banner.animations.length,p+1,'same call on a new pitch animates again');
call(makeData(['PLAY BALL','試合開始','次の試合','neutral']));
assert(!ids['stage-message'].classList.contains('vision-call'),'announcements untouched');
call(makeData(['HOME RUN','ホームラン！','141 m','homer']));
assert(ids['stage-message'].classList.contains('vision-call'),'home run now uses Stadium Vision');
assert.equal(ids['stage-message'].dataset.visionTone,'homer');
assert(ids['message-ja'].hidden&&detail.hidden,'one HOME RUN headline without distance');
assert.equal(context.playFeedback.resultTime,1800,'normal homer readable before continuing');
context.game.walkoffWin=true;context.game.next='finish';
call({en:'HOME RUN',ja:'ホームラン！',sub:'142 m · 3点',kind:'homer',homeRunRuns:3});
assert.equal(ids['message-en'].textContent,'3-RUN HOME RUN','walk-off HR keeps run-based title');
assert.equal(ids['message-sub'].textContent,'');
context.game.walkoffWin=false;context.game.next='pitch';
context.game.derby={};
call(makeData(['HOME RUN','ホームラン！','143 m','homer']));
assert.equal(ids['message-en'].textContent,'HOME RUN','derby home run is not labelled solo');
assert.equal(context.playFeedback.resultTime,0,'derby pace remains unchanged');
delete context.game.derby;
call(makeData(['OUT','アウト','2アウト','out']));
assert.equal(context.playFeedback.resultTime,1500,'final out held for 1.5s');
context.tickFeedback(500);assert.equal(context.playFeedback.resultTime,1000);
context.baseCall({verdict:'out',base:1});
assert.equal(context.playFeedback.callTime,1800,'base OUT lasts 1.8s');
context.tickFeedback(1800);
assert.equal(context.playFeedback.resultTime,1000,'covered result does not count as visible time');
assert(ids['umpire-call'].hidden);
context.tickFeedback(999);assert.equal(context.playFeedback.resultTime,1,'result is still held before its minimum elapsed');
context.tickFeedback(1);assert.equal(context.playFeedback.resultTime,0);
context.baseCall({verdict:'safe',base:1});
assert.equal(ids['umpire-call'].dataset.verdict,'safe');
assert.equal(ids['umpire-call'].innerHTML,'<strong>SAFE</strong>');
assert.equal(context.playFeedback.callTime,1500,'SAFE duration unchanged');
context.game.fastForward=true;
call(makeData(['OUT AT FIRST','一塁へ送球、アウト！','3アウト','out']));
assert.equal(context.playFeedback.resultTime,0,'fast-forward does not wait on verdicts');
context.game.fastForward=false;
const beforeClear=ids['stage-message'].className;
context.call('clear');assert.equal(ids['stage-message'].className,beforeClear.replace(' show',''),'clear only removes visibility, not the current visual design');
assert.equal(context.playFeedback.resultTime,0,'clear removes result hold');
assert(source.includes('const hold=playFeedback.scoreTime>0||playFeedback.callTime>0||playFeedback.resultTime>0;'),'frame holds the actual result phase');
assert.equal((source.match(/!playFeedback.scoreTime&&!playFeedback.callTime&&!playFeedback.resultTime/g)||[]).length,3,'local/online replay and queued bench wait for readability');
assert(css.includes('border-block: 1px solid var(--vision-accent)')&&css.includes('background: rgba(0, 0, 0, .36)')&&css.includes('clip-path: none'));
assert(!handler.includes("hr.querySelector('strong').textContent='ホームラン！'"),'old duplicate homer graphic is no longer shown');
const currentAppPin=html.match(/\.\/app\.js\?v=\d+/)?.[0];
assert(currentAppPin&&read('sw.js').includes(currentAppPin),'app URL is consistent with the cache');
const currentCssPin=html.match(/\.\/verdict-vision\.css\?v=\d+/)[0];
assert(read('sw.js').includes(currentCssPin));
// Exercise the actual engine's HR scoring and event/log metadata, not just UI fixtures.
global.window=global;
for(const f of ['ratings-data','players','pennant','game'])vm.runInThisContext(read(f+'.js'));
for(const half of ['top','bottom'])for(let n=0;n<=3;n++){
 const messages=[],g=new NightGame('match','standard',(type,data)=>{if(type==='message')messages.push(data)});
 g.half=half;g.inning=3;g.totalInnings=3;g.bases=[0,1,2].map(i=>i<n);
 g.baseIds=g.bases.map((on,i)=>on?g.lineups[g.side][4+i].id:null);
 g.startField(44,36,.30,false);
 const score=g.battingScore;
 g.finishBall('hr');
 const hr=messages.findLast(m=>m.en==='HOME RUN');
 assert.equal(g.battingScore-score,n+1,'actual home-run score');
 assert.equal(hr.homeRunRuns,n+1,'event explicitly carries the scored runs');
 assert.equal(g.log.at(-1).homeRunRuns,n+1,'retained in game history / resume');
 const guestEvent=JSON.parse(JSON.stringify(hr));
 context.game.homeScore+=n+1;
 context.online={role:'guest'};
 call(guestEvent);
 assert.equal(ids['message-en'].textContent,['SOLO HOME RUN','2-RUN HOME RUN','3-RUN HOME RUN','GRAND SLAM'][n],'guest renders from message before next state');
}
context.online={role:'host',session:{open:true,send:d=>sent.push(d)}};
console.log('PASS: H design tones, compact labels, single-label details, readability timing, home-run style, raw online events, cache pins');

if(process.argv.includes('--browser')) (async()=>{
 const {chromium}=require('playwright');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const links=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^?"]+)\?[^"]+">/g)].map(m=>m[1]);
  const styles=links.map(read).join('\n');
  const markup=html.match(/<div class="stage-message" id="stage-message"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)[0];
  for(const [width,height] of [[320,700],[393,852],[844,390]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.setContent('<meta charset="utf-8"><style>'+styles+
     '\nhtml,body{margin:0;width:100%;height:100%;overflow:hidden}.game-stage{position:relative;width:100%;height:100%;background:#28463b;--hud-u:1px;--hud-scale:1}</style>'+
     '<div class="game-stage">'+markup+'<div id="umpire-call" class="umpire-call" hidden></div></div>');
   await page.addScriptTag({content:'const $=id=>document.getElementById(id);let online=null, game={inning:1,half:"top",batter:{name:"A"},outs:0,homeScore:0,awayScore:0,phase:"result"}; const speakPlay=()=>{},reduceAbsMotion={matches:true},playFeedback={callTime:0,resultTime:0,scoreTime:0};\n'+handler+'\n'+baseCall+'\n window.sendVerdict=onEvent;window.sendBaseCall=showPlayCall;'});
   for(const sample of samples){
    await page.evaluate(data=>window.sendVerdict('message',data),makeData(sample));
    const m=await page.locator('.stage-call').evaluate(el=>{
     const head=el.querySelector('.stage-call-head'),label=el.querySelector('#message-en');
     const r=el.getBoundingClientRect(),hr=head.getBoundingClientRect(),lr=label.getBoundingClientRect(),cs=getComputedStyle(el),hs=getComputedStyle(head);
     return {width:r.width,height:r.height,left:r.left,right:r.right,headWidth:hr.width,labelWidth:lr.width,
      bg:cs.backgroundColor,headBg:hs.backgroundColor,top:cs.borderTopWidth,bottom:cs.borderBottomWidth,headClip:hs.clipPath};
    });
    assert(m.width>0&&m.width<=width&&m.left>=0&&m.right<=width,sample[0]+' fits '+width+': '+JSON.stringify(m));
    assert(m.labelWidth<=m.headWidth+1,sample[0]+' no clipping');
    assert.equal(await page.locator('#message-en').textContent(),expectedLabel(sample));
    assert.equal(await page.locator('.stage-call-detail').isVisible(),false);
    assert(m.height<=65&&m.bg==='rgba(0, 0, 0, 0.36)'&&m.headBg==='rgba(0, 0, 0, 0)'&&m.top==='1px'&&m.bottom==='1px'&&m.headClip==='none',sample[0]+' thin-line translucent-black design');
    const fade=await page.evaluate(()=>{
     const stage=document.getElementById('stage-message'),call=stage.querySelector('.stage-call'),head=stage.querySelector('.stage-call-head');
     const before=[getComputedStyle(call).backgroundColor,getComputedStyle(head).backgroundImage,getComputedStyle(head).clipPath,stage.className.replace(' show','')];
     window.sendVerdict('clear');
     const after=[getComputedStyle(call).backgroundColor,getComputedStyle(head).backgroundImage,getComputedStyle(head).clipPath,stage.className];
     return {before,after,show:stage.classList.contains('show')};
    });
    assert.deepEqual(fade.after,fade.before,'the old banner never reappears during fade');
    assert.equal(fade.show,false,'the banner is dismissed');

   }
   for(const verdict of ['out','safe']){
    await page.evaluate(verdict=>window.sendBaseCall({verdict,base:1}),verdict);
    const m=await page.locator('#umpire-call').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,height:el.getBoundingClientRect().height}));
    assert(m.bg==='rgba(0, 0, 0, 0.36)'&&m.border==='1px'&&m.height<=65,'base call matches the visual style');
   }
   assert.equal(await page.locator('.stage-message').evaluate(el=>getComputedStyle(el).visibility),'hidden','base call still takes priority over other banners');
   await page.close();
  }
  console.log('PASS: actual Chromium layout at 320px, 393px and landscape 844px');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
