// v165: dialogue-style trade / FA negotiation (checker item
// "negotiation-dialogue"). Layered on the existing instant routes:
//  FA: faSign still signs instantly at the asking price (faCost).
//  faNegotiate offers less -> accept (signed at the offered price via
//  the same _faSignAt bookkeeping) or reject with a concrete counter
//  demand; a rejected offer is recorded (session history +
//  negotiationLog), the same or a lower offer cannot be re-presented,
//  offering the counter demand always signs, and 3 rejected rounds
//  close the talks for that player this offseason.
//  Trade: the incoming tradeOffer was accept/decline only.
//  tradeNegotiate counters with a different own player, evaluated with
//  the same playerValue metric that built the offer; rejections are
//  recorded on the offer, a rejected player cannot be re-proposed, the
//  partner counters with a concrete demanded player (proposing that
//  player always succeeds), and a 3rd rejection breaks the talks down
//  and withdraws the offer. Rolls are seeded by default; tests inject
//  fixed rolls where a specific branch is needed.
const assert=require('node:assert/strict'),fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant'])require('../dist/'+file+'.js');

function completeSeason(league){
 let guard=0;
 while(!league.completed&&guard++<200){league.completeRound({homeScore:2,awayScore:1});if(!league.completed)assert(league.next(),'advance round');}
 assert(league.completed,'season completed');
}
function runDraft(league){
 assert(league.beginOffseason());
 let guard=0;
 while(!league.draftDone&&guard++<200){
  if(league.draftCpuPick())continue;
  const d=league.offseason,taken=new Set(d.picks.map(k=>k.playerId));
  const p=d.pool.find(x=>!taken.has(x.id));
  assert(p&&league.draftUserPick(p.id),'user draft pick');
 }
 assert(league.draftDone,'draft done');
}
function faLeague(){
 const league=new NightPennant('owls',1);league.managed=true;
 completeSeason(league);runDraft(league);
 assert(league.ensureFaMarket());assert(league.faActive);
 return league;
}

// ---------- FA: offer -> rejection recorded -> improved offer -> signed ----------
{
 const league=faLeague();
 const fa=league.offseason.fa;
 const target=fa.pool[0],ask=league.faCost(target);
 assert(ask>=20,'target has a meaningful asking price: '+ask);
 // Instant route still works at the asking price for another player.
 const instant=fa.pool[1];
 assert(league.faSign(instant.id),'existing instant faSign still signs at ask');
 assert.equal(fa.signed.find(s=>s.playerId===instant.id).cost,league.faCost(instant),'instant route charges the ask');
 // Low offer, forced rejection roll: counter demand comes back concrete.
 const low=Math.max(1,Math.floor(ask*.6));
 const r1=league.faNegotiate(target.id,low,.999);
 assert.equal(r1.response,'counter','a low offer is rejected with a counter');
 assert(r1.counter>low&&r1.counter<=ask,'counter is concrete, above the offer and at most the ask: '+r1.counter);
 assert.equal(r1.rounds,1);
 const ses=league.faNegotiation(target.id);
 assert.equal(ses.history.length,1,'the rejected offer is recorded in the session');
 assert.equal(ses.history[0].offer,low);assert.equal(ses.history[0].response,'rejected');assert.equal(ses.history[0].counter,r1.counter);
 assert(league.negotiationLog.some(e=>e.kind==='fa'&&e.targetId===target.id&&e.response==='rejected'),'the rejection is recorded in the negotiation log');
 assert(fa.pool.some(p=>p.id===target.id),'a rejected player stays in the pool');
 // The same (or a lower) offer can never be re-presented.
 assert.equal(league.faNegotiate(target.id,low,0).response,'blocked','same offer is blocked');
 assert.equal(league.faNegotiate(target.id,Math.max(1,low-1),0).response,'blocked','lower offer is blocked');
 assert.equal(league.faNegotiation(target.id).history.length,1,'blocked offers are not recorded as new rounds');
 // Re-present with changed (improved) terms: the counter demand signs.
 const ptsBefore=fa.points[league.clubId];
 const r2=league.faNegotiate(target.id,r1.counter,.999);
 assert.equal(r2.response,'accepted','offering the counter demand always signs');
 assert.equal(r2.cost,r1.counter,'signed at the negotiated price, not the ask');
 assert.equal(fa.points[league.clubId],ptsBefore-r1.counter,'points deducted by the negotiated price');
 assert(!fa.pool.some(p=>p.id===target.id),'signed player leaves the pool');
 assert(fa.signed.some(s=>s.playerId===target.id&&s.cost===r1.counter),'signing recorded at the negotiated cost');
 const rosterIds=new Set([...league.clubRoster(league.clubId).batters,...league.clubRoster(league.clubId).pitchers].map(p=>p.id));
 assert(rosterIds.has(target.id),'negotiated player joins the roster');
 assert(league.negotiationLog.some(e=>e.kind==='fa'&&e.targetId===target.id&&e.response==='accepted'),'the acceptance is recorded in the log');
 // Seeded default roll is reproducible for identical leagues/ids
 // (the id is aligned before the season, so the seeded FA pool —
 // veterans and releases are generated from the league id — matches).
 const mkFa=alignId=>{const l=new NightPennant('owls',1);l.managed=true;if(alignId)l.id=alignId;completeSeason(l);runDraft(l);assert(l.ensureFaMarket());return l;};
 const a=mkFa(),b=mkFa(a.id);
 const ta=a.offseason.fa.pool[0],tb=b.offseason.fa.pool[0];
 assert.equal(ta.id,tb.id,'same pool target');
 assert.equal(a.faCost(ta),b.faCost(tb),'same asking price under the same league id');
 const offerA=Math.max(1,Math.floor(a.faCost(ta)*.85));
 assert.equal(a.faNegotiate(ta.id,offerA).response,b.faNegotiate(tb.id,offerA).response,'default roll is seeded and reproducible');
}

// ---------- FA: three rejections close the talks; instant route remains ----------
{
 const league=faLeague();
 const fa=league.offseason.fa,target=fa.pool[0],ask=league.faCost(target);
 let offer=Math.max(1,Math.floor(ask*.5)),last;
 for(let i=0;i<NightPennant.FA_NEG_MAX;i++){
  last=league.faNegotiate(target.id,offer,.999);
  assert.equal(last.response,i<NightPennant.FA_NEG_MAX-1?'counter':'broken','round '+(i+1)+' response');
  offer++; // improve by 1pt each round, staying far below the counter demand
 }
 assert.equal(last.response,'broken','the third rejection breaks the talks down');
 assert.equal(league.faNegotiation(target.id).status,'closed','the session is closed');
 assert.equal(league.faNegotiate(target.id,ask,0).response,'closed','no further negotiation with that player this offseason');
 assert(league.faSign(target.id),'the instant full-price route still remains after a breakdown');
 // Negotiation is confined to the FA window.
 const league2=faLeague();
 const t2=league2.offseason.fa.pool[0];
 assert(league2.faFinish());
 assert.equal(league2.faNegotiate(t2.id,10,0),false,'no negotiation after the FA window closes');
}

// ---------- FA: save / restore, legacy saves ----------
{
 const league=faLeague();
 const target=league.offseason.fa.pool[0],ask=league.faCost(target);
 const r=league.faNegotiate(target.id,Math.max(1,Math.floor(ask*.6)),.999);
 assert.equal(r.response,'counter');
 const restored=NightPennant.restore(JSON.parse(JSON.stringify(league)));
 assert(restored,'league with an open negotiation restores');
 assert(restored.faActive,'restored league is still in the FA window');
 const ses=restored.faNegotiation(target.id);
 assert(ses&&ses.history.length===1&&ses.counter===r.counter,'negotiation session survives save/restore');
 assert(restored.negotiationLog.some(e=>e.kind==='fa'&&e.targetId===target.id),'negotiation log survives save/restore');
 assert.equal(restored.faNegotiate(target.id,r.counter,.999).response,'accepted','restored negotiation can be concluded');
 const legacy=JSON.parse(JSON.stringify(league));
 delete legacy.negotiationLog;
 if(legacy.offseason?.fa)delete legacy.offseason.fa.negotiations;
 const old=NightPennant.restore(legacy);
 assert(old,'legacy save without negotiation fields restores');
 assert.deepEqual(old.negotiationLog,[],'legacy saves gain an empty negotiation log');
 const t2=old.offseason.fa.pool.find(p=>p.id!==target.id)||old.offseason.fa.pool[0];
 const rr=old.faNegotiate(t2.id,Math.max(1,Math.floor(old.faCost(t2)*.6)),.999);
 assert(rr&&(rr.response==='counter'||rr.response==='broken'||rr.response==='accepted'),'legacy-restored leagues can negotiate');
}

// ---------- Trade: counter-proposal -> rejection recorded -> counter demand -> deal ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 const from=league.clubs.find(c=>c.id!==league.clubId);
 const theirs=league.clubRoster(from.id),mine=league.clubRoster(league.clubId);
 const give=theirs.batters[5],original=mine.batters[8];
 league.tradeOffer={fromClub:from.id,giveId:give.id,giveName:give.name,takeId:original.id,takeName:original.name,expiresRound:league.round+2};
 // Proposing the original player is the accept route, not a negotiation.
 assert.equal(league.tradeNegotiate(original.id,0).response,'original');
 // A far weaker player, forced rejection: recorded + concrete counter demand.
 const weak=[...mine.batters.slice(2,12),...mine.pitchers.slice(1,6)].sort((a,b)=>league.playerValue(a)-league.playerValue(b))[0];
 const r1=league.tradeNegotiate(weak.id,.999);
 assert.equal(r1.response,'counter','a weak counter-proposal is rejected with a counter demand');
 assert(r1.counterTakeId&&r1.counterTakeName,'the counter demand names a concrete player');
 const neg=league.tradeNegotiation();
 assert(neg.rejectedTakeIds.includes(weak.id),'the rejected proposal is recorded on the offer');
 assert.equal(neg.history.length,1);
 assert(league.negotiationLog.some(e=>e.kind==='trade'&&e.response==='rejected'),'the rejection is recorded in the log');
 assert(league.tradeOffer,'the offer survives a first rejection');
 // The same player cannot be re-proposed.
 assert.equal(league.tradeNegotiate(weak.id,0).response,'blocked','a rejected player cannot be re-proposed');
 // Proposing the demanded player always concludes the trade.
 const r2=league.tradeNegotiate(r1.counterTakeId,.999);
 assert.equal(r2.response,'accepted','the counter demand concludes the trade even on a high roll');
 assert.equal(league.tradeOffer,null,'the offer is consumed by the deal');
 assert.equal(league.rosterMoves[give.id],league.clubId,'the give player moved to the user club');
 assert.equal(league.rosterMoves[r1.counterTakeId],from.id,'the demanded player moved the other way');
 assert(league.negotiationLog.some(e=>e.kind==='trade'&&e.response==='accepted'),'the deal is recorded in the log');
 // Seeded default roll reproducible.
 const mk=()=>{const l=new NightPennant('owls',1);l.managed=true;const f=l.clubs.find(c=>c.id!==l.clubId);const th=l.clubRoster(f.id),mi=l.clubRoster(l.clubId);const g=th.batters[5],o=mi.batters[8];l.tradeOffer={fromClub:f.id,giveId:g.id,giveName:g.name,takeId:o.id,takeName:o.name,expiresRound:l.round+2};return [l,mi.batters[3].id];};
 const [la,pa]=mk(),[lb,pb]=mk();lb.id=la.id;
 assert.equal(la.tradeNegotiate(pa).response,lb.tradeNegotiate(pb).response,'trade default roll is seeded and reproducible');
}

// ---------- Trade: breakdown after 3 rejections; accept/decline unchanged ----------
{
 const league=new NightPennant('owls',1);league.managed=true;
 const from=league.clubs.find(c=>c.id!==league.clubId);
 const theirs=league.clubRoster(from.id),mine=league.clubRoster(league.clubId);
 const give=theirs.batters[5],original=mine.batters[8];
 league.tradeOffer={fromClub:from.id,giveId:give.id,giveName:give.name,takeId:original.id,takeName:original.name,expiresRound:league.round+2};
 const candidates=[...mine.batters.slice(2,12),...mine.pitchers.slice(1,6)].filter(x=>x.id!==original.id)
  .sort((a,b)=>league.playerValue(a)-league.playerValue(b)).slice(0,3);
 let last;
 for(const c of candidates){last=league.tradeNegotiate(c.id,.999);if(!league.tradeOffer)break;}
 assert.equal(last.response,'broken','the third rejection breaks the trade talks down');
 assert.equal(league.tradeOffer,null,'a broken-down offer is withdrawn');
 // Plain accept / decline still behave as before on a fresh offer.
 const league2=new NightPennant('owls',1);league2.managed=true;
 const f2=league2.clubs.find(c=>c.id!==league2.clubId),t2=league2.clubRoster(f2.id),m2=league2.clubRoster(league2.clubId);
 const g2=t2.batters[5],o2=m2.batters[8];
 league2.tradeOffer={fromClub:f2.id,giveId:g2.id,giveName:g2.name,takeId:o2.id,takeName:o2.name,expiresRound:league2.round+2};
 assert(league2.acceptTrade(),'original acceptTrade still works');
 assert.equal(league2.rosterMoves[g2.id],league2.clubId);
 assert.equal(league2.rosterMoves[o2.id],f2.id);
 // Save/restore with an in-progress trade negotiation.
 const league3=new NightPennant('owls',1);league3.managed=true;
 const f3=league3.clubs.find(c=>c.id!==league3.clubId),t3=league3.clubRoster(f3.id),m3=league3.clubRoster(league3.clubId);
 const g3=t3.batters[5],o3=m3.batters[8];
 league3.tradeOffer={fromClub:f3.id,giveId:g3.id,giveName:g3.name,takeId:o3.id,takeName:o3.name,expiresRound:league3.round+2};
 const weak3=[...m3.batters.slice(2,12),...m3.pitchers.slice(1,6)].sort((a,b)=>league3.playerValue(a)-league3.playerValue(b))[0];
 league3.tradeNegotiate(weak3.id,.999);
 const restored=NightPennant.restore(JSON.parse(JSON.stringify(league3)));
 assert(restored&&restored.tradeOffer,'trade offer with negotiation restores');
 assert(restored.tradeNegotiation().rejectedTakeIds.includes(weak3.id),'rejected proposals survive save/restore');
 const legacy=JSON.parse(JSON.stringify(league3));delete legacy.negotiationLog;delete legacy.tradeOffer.negotiation;
 const old=NightPennant.restore(legacy);
 assert(old&&old.tradeOffer,'legacy save with a plain trade offer restores');
 assert.deepEqual(old.negotiationLog,[],'legacy saves gain an empty negotiation log');
 assert.equal(old.tradeNegotiation().rounds,0,'legacy offers gain a fresh negotiation state');
}

// ---------- Wiring / pins ----------
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
assert(app.includes('data-league-action="trade-negotiate"'),'dashboard trade banner offers negotiation');
assert(app.includes('tradeNegotiationModal()'),'trade negotiation modal exists');
assert(app.includes('data-trade-counter'),'trade modal offers counter-proposals');
assert(app.includes('league?.tradeNegotiate(b.dataset.tradeCounter)'),'UI calls tradeNegotiate');
assert(app.includes('data-fa-neg'),'FA rows offer negotiation');
assert(app.includes('league?.faNegotiate(b.dataset.faNeg'),'UI calls faNegotiate');
const index=fs.readFileSync(__dirname+'/../dist/index.html','utf8'),sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
assert(index.includes('./game.js?v=190')&&index.includes('./app.js?v=190'),'index pins at v165');
assert(index.includes('./pennant.js?v=86'),'index pin for the changed pennant.js moves');
assert(sw.includes('nightball-v190-batting-direction'),'SW cache renamed for v165');
assert(sw.includes('./pennant.js?v=86')&&sw.includes('./app.js?v=190'),'SW precaches the v165 scripts');

console.log('negotiation-v165: unit + static assertions passed');

/* ---------- browser check (393x852): pennant dashboard -> trade negotiation modal -> counter-proposal ---------- */
const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
(async()=>{
 let chromium;
 try{({chromium}=require('playwright'));}
 catch{console.log('negotiation-v165: playwright unavailable — browser check skipped');return;}
 const dir=resolve(__dirname,'../dist');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.woff':'font/woff'};
 const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(u.pathname)==='/'?'/index.html':decodeURIComponent(u.pathname);
  const filePath=resolve(dir,'.'+name);
  if(!filePath.startsWith(dir+sep)){res.writeHead(403);res.end();return;}
  try{const data=await readFile(filePath);res.writeHead(200,{'Content-Type':mime[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-sandbox']});
 try{
  const url='http://127.0.0.1:'+server.address().port+'/';
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.NightPennant&&window.NightPennantSlots,null,{timeout:15000});
  // Seed a pennant save carrying an incoming trade offer, then reload so
  // the app restores it and the dashboard shows the offer banner.
  await page.evaluate(()=>{
   const league=new NightPennant('comets');league.managed=true;league.round=2;
   league.preseason={games:league.preseason.games,index:league.preseason.games.length,results:{},done:true,skipped:true};
   const from=league.clubs.find(c=>c.id!==league.clubId);
   const theirs=league.clubRoster(from.id),mine=league.clubRoster(league.clubId);
   const give=theirs.batters[5],want=mine.batters[8];
   league.tradeOffer={fromClub:from.id,giveId:give.id,giveName:give.name,takeId:want.id,takeName:want.name,expiresRound:league.round+2};
   NightPennantSlots.write(localStorage,league.leagueId,1,league);
   NightPennantSlots.setActive(localStorage,league.leagueId,1);
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.NightPennant,null,{timeout:15000});
  await page.click('#pennant-mode');
  await page.waitForSelector('[data-league-action="trade-negotiate"]',{timeout:10000});
  await page.click('[data-league-action="trade-negotiate"]');
  await page.waitForSelector('[data-trade-counter]',{timeout:10000});
  const m=await page.evaluate(()=>{
   const content=document.querySelector('#modal-content');
   const overflow=[...content.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>393.5||el.getBoundingClientRect().left<-0.5).length;
   return {text:content.textContent,scrollWidth:content.scrollWidth,clientWidth:content.clientWidth,overflow,counters:content.querySelectorAll('[data-trade-counter]').length};
  });
  assert(m.text.includes('トレード交渉'),'modal shows the negotiation title');
  assert(m.text.includes('代わりに提示する選手'),'modal lists counter-proposal candidates');
  assert(m.counters>=5,'several counter-proposal buttons: '+m.counters);
  assert(m.scrollWidth<=m.clientWidth+1,'modal does not overflow horizontally at 393px');
  assert.equal(m.overflow,0,'no modal element sticks out of the 393px viewport');
  try{await page.screenshot({path:resolve(__dirname,'screenshots/negotiation-v165-modal.png'),timeout:90000});}catch{}
  // Present a counter-proposal through the real UI: the flow must stay
  // consistent (modal re-opens with history, or the dashboard returns).
  await page.locator('[data-trade-counter]').first().click();
  await page.waitForFunction(()=>!document.querySelector('#modal').hidden||!!document.querySelector('[data-league-action="trade-negotiate"]')||!document.querySelector('#pennant').hidden,null,{timeout:10000});
  await page.waitForTimeout(600);
  const after=await page.evaluate(()=>({modalHidden:document.querySelector('#modal').hidden,text:document.querySelector('#modal').hidden?document.querySelector('#pennant').textContent:document.querySelector('#modal-content').textContent}));
  assert(after.text.includes('交渉')||after.text.includes('トレード'),'after a counter-proposal the negotiation flow continues: '+after.text.slice(0,80));
  assert.deepEqual(errors,[],'no page errors: '+errors.join(' | '));
  await context.close();
  console.log('negotiation-v165: browser check passed (393x852, trade negotiation modal + counter-proposal)');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
