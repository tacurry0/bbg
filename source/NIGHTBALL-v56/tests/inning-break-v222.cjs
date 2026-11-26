// Inning-break visual change: score values/lineup, tap gate, guest wait,
// localized labels and responsive geometry in the optional browser check.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=path.resolve(__dirname,'../dist');
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
const source=read('app.js'),html=read('index.html'),css=read('half-break.css');
const appBlock=source.slice(source.indexOf('function updateHalfBreak('),source.indexOf(' let halfTap=null;'));
assert(appBlock.includes('function continueHalf('));
(async()=>{
 const {halfBreakScoreHTML,lineScoreHTML}=await import('../dist/results.js');
 const report={innings:3,highlight:1,teams:{
  away:{name:'横浜DeNAベイスターズ',logo:'./assets/npb/npb-db.svg',score:1,hits:1,line:[1]},
  home:{name:'楽天モンキーズ',logo:'./assets/clubs/monkeys.png',score:2,hits:2,line:[2]}
 }};
 const clubs={away:{short:'DeNA'},home:{short:'楽天'}};
 const rendered=halfBreakScoreHTML(report,clubs);
 assert(rendered.includes('class="half-break-matchup"'));
 assert(rendered.indexOf('DeNA')<rendered.indexOf('class="half-break-totals"'));
 assert(rendered.includes('<b class="">1</b><i>–</i><b class="is-leading">2</b>'),'away/home score and leading colour');
 assert(rendered.includes('./assets/npb/npb-db.png'),'saved SVG logo path converted');
 assert(rendered.includes(lineScoreHTML(report)),'original line score table and all innings preserved');
 assert(rendered.includes('aria-current="true"'),'completed inning highlighted');
 const tied=structuredClone(report);tied.teams.home.score=1;
 assert(!halfBreakScoreHTML(tied,clubs).includes('is-leading'),'tie has no leading side');
 const wide=structuredClone(report);wide.teams.home.score=123;
 assert(halfBreakScoreHTML(wide,clubs).includes('data-wide="true"'),'large totals fit');
 assert(halfBreakScoreHTML(report,{away:{short:'<test>'}}).includes('&lt;test&gt;'),'team name is escaped');
 const ids=Object.fromEntries(['half-break','half-break-title','half-break-score','half-break-next','half-break-next-inning','half-continue','half-auto-note','modal'].map(id=>[id,{dataset:{},hidden:true,disabled:false,textContent:'',innerHTML:''}]));
 let ack=0,update=0,sounds=0,reports=0;
 const g={phase:'change',isFixture:true,inning:2,half:'top',halfBreak:{inning:1,half:'bottom'},homeScore:2,awayScore:1,homeHits:2,awayHits:1,teams:clubs,defending:true,acknowledgeHalf(){ack++;return true;}};
 const ctx={$:id=>ids[id],game:g,screen:'game',buildMatchReport(){reports++;return structuredClone(report);},halfBreakScoreHTML,onlineInputBlocked:()=>false,unlockAudio(){},sound(){sounds++;},updateUI(){update++;}};
 vm.createContext(ctx);vm.runInContext(appBlock+'\n globalThis.render=updateHalfBreak;globalThis.next=continueHalf;',ctx);
 ctx.render(g);
 assert(!ids['half-break'].hidden&&ids['half-break'].dataset.turn==='defense');
 assert.equal(ids['half-break-title'].textContent,'1回裏 終了');
 assert.equal(ids['half-break-next-inning'].textContent,'NEXT · 2回表');
 assert.equal(ids['half-break-next'].textContent,'DEFENSE');
 assert.equal(ids['half-continue'].textContent,'PLAY');
 assert(!ids['half-continue'].disabled);
 assert(ids['half-break-score'].innerHTML.includes('is-leading'));
 ctx.render(g);assert.equal(reports,1,'unchanged UI not rerendered');
 g.homeHits++;ctx.render(g);assert.equal(reports,2,'updated hits refresh the scoreboard');
 ctx.next();assert.equal(ack,1);assert.equal(update,1);assert.equal(sounds,1);
 g.mirror=true;g.defending=false;ctx.render(g);
 assert.equal(ids['half-break'].dataset.turn,'attack');
 assert(ids['half-continue'].disabled);
 assert.equal(ids['half-break-next'].textContent,'ATTACK');
 assert.equal(ids['half-continue'].textContent,'WAITING');
 ctx.next();assert.equal(ack,1,'mirror cannot advance the inning');
 g.mirror=false;g.autoDefense=true;g.umpireMode=true;ctx.render(g);
 assert.equal(ids['half-break'].dataset.turn,'umpire');assert(!ids['half-continue'].disabled);
 assert.equal(ids['half-break-next'].textContent,'UMPIRE');
 assert.equal(ids['half-auto-note'].textContent,'AUTO DEFENSE ON');
 g.phase='aim';ctx.render(g);assert(ids['half-break'].hidden);assert.equal(ids['half-break'].dataset.key,'');
 ctx.next();assert.equal(ack,1,'not in an inning transition');
 const locale={};vm.createContext(locale);vm.runInContext(read('i18n-catalog.js'),locale);
 for(const label of ['PLAY','NEXT','INNING BREAK','ATTACK','DEFENSE','UMPIRE','WAITING','AUTO DEFENSE ON'])assert(locale.NightballMessages[label].every(Boolean),'new short label localized');
 const pin=html.match(/\.\/half-break\.css\?v=\d+/)[0];assert(read('sw.js').includes(pin),'CSS cached and loaded');
 assert(read('sw.js').includes('results.js?v=222')&&source.includes('results.js?v=222'));
 assert(css.includes('#half-break .scoreline-table')&&css.includes('overflow-x: auto')&&css.includes('#half-break #half-continue:disabled'));
 console.log('PASS: inning scoreboard, correct scores/inning/hits, tie & large totals, host vs guest and locale/cache pins');
 if(!process.argv.includes('--browser'))return;
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const links=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^?"]+)\?[^"]+">/g)].map(m=>m[1]);
  const styles=links.map(read).join('\n');
  const markup=html.match(/<section id="half-break"[\s\S]*?<\/section>/)[0];
  for(const [width,height] of [[320,530],[393,720],[844,270]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.setContent('<meta charset="utf-8"><style>'+styles+'\nhtml,body{margin:0;width:100%;height:100%;overflow:hidden}#stage{position:relative;width:100%;height:100%;min-height:0;background:#28463b}</style><div id="stage" class="game-stage">'+markup+'</div>');
   const long=structuredClone(report);long.innings=9;long.highlight=8;
   long.teams.away.line=[1,0,0,0,2,0,0,0];long.teams.home.line=[2,0,0,1,0,0,0];long.teams.home.score=3;long.teams.away.score=3;
   const withEmbeddedLogos=halfBreakScoreHTML(long,clubs).replace(/src="(\.\/assets\/[^"]+\.png)"/g,(_,p)=>'src="data:image/png;base64,'+fs.readFileSync(path.resolve(dist,p)).toString('base64')+'"');
   await page.evaluate(({view})=>{
    const p=document.getElementById('half-break');p.hidden=false;p.dataset.turn='defense';
    document.getElementById('half-break-title').textContent='8回表 終了';
    document.getElementById('half-break-score').innerHTML=view;
    document.getElementById('half-break-next-inning').textContent='NEXT · 8回裏';
    document.getElementById('half-break-next').textContent='DEFENSE';
    document.getElementById('half-continue').textContent='PLAY';
   },{view:withEmbeddedLogos});
   const m=await page.locator('#half-break').evaluate(p=>{
    const card=p.querySelector('.half-break-card'),scroll=p.querySelector('.scoreline-scroll'),totals=p.querySelector('.half-break-totals'),button=p.querySelector('#half-continue');
    const r=card.getBoundingClientRect(),t=totals.getBoundingClientRect(),b=button.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,cardWidth:card.clientWidth,cardScrollWidth:card.scrollWidth,buttonHeight:b.height,totalWidth:t.width,scoreStyle:getComputedStyle(totals.querySelector('b')).fontSize,scrollable:getComputedStyle(scroll).overflowX,headerBackground:getComputedStyle(card.querySelector('h2')).backgroundImage};
   });
   assert(m.left>=0&&m.right<=width+1&&m.top>=0&&m.bottom<=height+1,'card stays in stage: '+JSON.stringify(m));
   assert(m.cardScrollWidth<=m.cardWidth+1,'no horizontal card overflow');
   assert(m.totalWidth>35&&parseFloat(m.scoreStyle)>=29,'prominent total score');
   assert(m.buttonHeight>=36&&m.scrollable==='auto'&&m.headerBackground==='none','touch target and flat layout');
   assert(m.scrollWidth>=m.clientWidth,'all innings remain available');
   if(width===393){fs.mkdirSync(path.resolve(__dirname,'screenshots'),{recursive:true});await page.screenshot({path:path.resolve(__dirname,'screenshots/inning-break-v222.png')});}
   await page.close();
  }
  console.log('PASS: compact responsive inning scoreboard in Chromium');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
