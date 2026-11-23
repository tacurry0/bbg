// v110: an explicit on-screen ABS challenge button joins the double-tap.
//  - the button is shown exactly while game.absCanChallenge holds (the same
//    condition that arms the tap overlay), with the remaining count on a
//    small badge (the original shrinking window bar was removed in v127
//    by user request — no remaining-time visualisation);
//  - clicking it runs the existing requestAbsChallenge() entry point, so a
//    challenge is consumed exactly once even if the tap path fires too;
//  - the guest mirror sends the same {t:'abs-challenge'} message as the tap;
//  - umpire mode never offers the button (requestAbsChallenge refuses).
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

// Same forced called-pitch setup as tests/abs.cjs: full count, runner on
// third, a pitch just outside that the umpire calls a strike.
function calledPitch({defending=false,x=1.08,roll=0,userRemaining=2,cpuRemaining=0,expectWindow=true}={}){
 const g=new NightGame('match','standard',()=>{});
 g.half=defending?'top':'bottom';
 g.inning=5;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 g.absRemaining=userRemaining;g.absCpuRemaining=cpuRemaining;
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;
 const draws=[roll,.99,0];
 try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 assert.equal(g.phase,expectWindow?'abs-call':'result');
 return g;
}

// ---------- button path: executes once; a won challenge is retained ----------
{
 const g=calledPitch();
 assert(g.absCanChallenge,'challenge window open: button visible');
 assert.equal(g.absRemaining,2);
 assert(g.requestAbsChallenge(),'button click runs the challenge');
 assert.equal(g.phase,'abs-review');
 assert(!g.absCanChallenge,'button hides once the review starts');
 assert(!g.requestAbsChallenge(),'a second activation (tap after click) cannot re-enter');
 g.resolveAbsCall(true);
 assert.equal(g.absRemaining,2,'an overturned call keeps the challenge (ABS rules)');
 assert.equal(g.batterStats().bb,1,'the reversed call is committed as a walk');
}

// ---------- a lost challenge is consumed exactly once ----------
{
 const g=calledPitch({x:.1,roll:.99}); // clear strike, umpire agrees
 assert(g.absCanChallenge);
 assert(g.requestAbsChallenge());
 g.resolveAbsCall(true);
 assert.equal(g.absRemaining,1,'an upheld call consumes exactly one challenge');
 assert.equal(g.outs,3,'the upheld third strike ends the half');
}

// ---------- hidden when no challenges remain ----------
{
 const g=calledPitch({userRemaining:0,expectWindow:false});
 assert(!g.absCanChallenge,'no challenges left: button hidden');
 assert(!g.requestAbsChallenge());
}

// ---------- hidden after the call window expires ----------
{
 const g=calledPitch();
 g.phaseTime=NightGame.ABS_TIMING.call-10;g.update(20);
 assert(!g.absCanChallenge,'window expired: button hidden');
 assert(!g.requestAbsChallenge());
 assert.equal(g.absRemaining,2,'an expired window consumes nothing');
}

// ---------- hidden when the CPU is the one who may challenge ----------
{
 const g=calledPitch({defending:true,cpuRemaining:2});
 assert(g.absCall.cpu);
 assert(!g.absCanChallenge,'cpu call: no button for the user');
 assert(!g.requestAbsChallenge());
}

// ---------- guest mirror: the button sends the tap path's message ----------
{
 const g=calledPitch();
 const sent=[];
 g.mirror=true;g.mirrorSend=msg=>sent.push(msg);
 assert(g.requestAbsChallenge(),'guest button activation succeeds');
 assert.deepEqual(sent,[{t:'abs-challenge'}],'guest forwards the same message as the tap path');
 assert.equal(g.phase,'abs-call','the mirror itself does not resolve the call');
}

// ---------- umpire mode: never offered ----------
{
 const g=new NightGame('match','standard',()=>{},{innings:3,umpire:true});
 assert(g.umpireMode);
 assert(!g.requestAbsChallenge(),'umpire mode refuses ABS challenges');
 assert(!g.absCanChallenge);
}

// ---------- wiring: button element, click handler, tap path intact ----------
{
 const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const css=fs.readFileSync(__dirname+'/../dist/abs.css','utf8');
 assert(html.includes('id="abs-challenge"'),'button element exists in the stage');
 assert(html.includes('id="abs-challenge-label"')&&html.includes('id="abs-challenge-count"'),'label and remaining-count badge exist');
 assert(!html.includes('abs-challenge-fill'),'timer bar removed from the button (v127 spec change)');
 assert(app.includes("$('abs-challenge').addEventListener('click'"),'button has a click handler');
 assert(app.includes("if(game?.requestAbsChallenge())sound('tap');"),'button and keyboard tap share requestAbsChallenge');
 assert(app.includes("absBtn.hidden=!interactive||!!g.umpireMode"),'visibility follows the challenge window and excludes umpire mode');
 assert(app.includes("$('abs-challenge-count').textContent='残り'+g.absRemaining"),'count badge shows the remaining challenges');
 assert(!app.includes('abs-challenge-fill'),'no timer-bar fill is driven anymore (v127 spec change)');
 assert(app.includes("absActor.addEventListener('pointerup'"),'double-tap path on the actor overlay is unchanged');
 assert(app.includes('absLastTap'),'double-tap bookkeeping is unchanged');
 assert(css.includes('.abs-challenge'),'button styles live in abs.css');
 assert(css.includes('.abs-challenge-count'),'count badge is styled');
 assert(!css.includes('.abs-challenge-timer'),'timer bar styles removed (v127 spec change)');
}

// ---------- v110 batch additions: top-bar sub button, latency display
// removal, expanded reactions ----------
{
 const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const css=fs.readFileSync(__dirname+'/../dist/style.css','utf8');
 const online=fs.readFileSync(__dirname+'/../dist/online.js','utf8');

 // A: substitution button lives in the top bar and shares the bench flow.
 const topbar=html.slice(html.indexOf('class="topbar"'),html.indexOf('</header>'));
 assert(topbar.includes('id="sub"'),'substitution button sits in the top bar');
 assert(app.includes("$('sub').onclick=requestBench"),'top-bar button opens the bench via requestBench');
 assert(app.includes("subBtn.hidden=$('bench-button').hidden"),'top-bar button mirrors the bench button visibility (fixture only, no umpire mode, online guest included)');
 assert(app.includes("subBtn.textContent=queuedBench?'交代待ち':'交代'"),'top-bar button mirrors the queued state');
 assert(css.includes('.sub-button'),'top-bar button is styled');

 // B: latency readouts are gone from every screen; the equalizer stays.
 assert(!app.includes('入力遅延を均等化中'),'in-game latency chip text removed');
 assert(!app.includes('相手との片道遅延'),'lobby latency lines removed (host and guest)');
 assert(!app.includes('遅延を測定中'),'guest lobby measuring note removed');
 assert(!html.includes('id="online-latency"'),'latency chip element removed from the top bar');
 assert(!app.includes("$('online-latency')"),'no code still renders the latency chip');
 assert(app.includes('hostDelayMs()'),'host input delay still computed');
 assert(online.includes('class LatencyEstimator')&&online.includes('class InputDelayQueue'),'estimation and delay queue machinery intact');
 assert(app.includes("t:'ping'")&&app.includes("t:'pong'"),'ping/pong measurement still runs');

 // C: twelve reactions, grid panel, same {t:'react'} transport.
 const m=app.match(/const REACTIONS=\[([^\]]+)\]/);
 assert(m,'REACTIONS list present');
 const list=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(list.length,12,'twelve reactions offered');
 for(const e of ['👏','🔥','😂','👍','😱','😤','❤️','🎉','😢','😡','👎','💪'])assert(list.includes(e),'reaction offered: '+e);
 assert(app.includes("t:'react'"),'reaction transport unchanged');
 assert(css.includes('grid-template-columns:repeat(6,46px)'),'reaction panel is a 6-wide grid');
}

console.log('abs-button-v110: all assertions passed');
