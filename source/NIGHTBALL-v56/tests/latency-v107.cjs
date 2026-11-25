// v107 online-latency coverage:
//  - RTT estimation: EWMA smoothing anchored by the best sample, halved to a
//    one-way estimate, clamped to the 150ms cap; invalid samples ignored.
//  - Guest-clock alignment from ping/pong stamps and per-input age.
//  - InputDelayQueue: zero delay runs now, positive delays fire after the
//    clamped delay, clear() cancels pending inputs.
//  - Offline gate: the host delay is wired only behind the started-online-
//    host check in app.js (source guard), and guest inputs carry a send
//    timestamp (source guard).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/online.js','utf8'),{filename:'online.js'});
const {LatencyEstimator,InputDelayQueue,clampDelay,LATENCY_MAX_MS,PING_INTERVAL_MS}=NightOnline;
assert(LatencyEstimator&&InputDelayQueue&&clampDelay,'latency helpers are exported');
assert.equal(LATENCY_MAX_MS,150);
assert(PING_INTERVAL_MS>=1000&&PING_INTERVAL_MS<=5000,'ping interval is a few seconds');

// ---------- clamp ----------
assert.equal(clampDelay(0),0);
assert.equal(clampDelay(-30),0);
assert.equal(clampDelay(NaN),0);
assert.equal(clampDelay(80.4),80);
assert.equal(clampDelay(99999),150);

// ---------- estimator: no samples, steady link, cap ----------
{
 const e=new LatencyEstimator();
 assert.equal(e.oneWayMs(),0,'no samples means no added delay');
 for(let i=0;i<6;i++)e.add(120);
 assert.equal(e.oneWayMs(),60,'steady 120ms RTT estimates a 60ms one-way delay');
}
{
 const e=new LatencyEstimator();
 for(let i=0;i<8;i++)e.add(1000);
 assert.equal(e.oneWayMs(),150,'a very slow link is clamped to the cap');
}
{
 const e=new LatencyEstimator();
 e.add(NaN);e.add(-5);e.add(999999);e.add('x');
 assert.equal(e.samples,0,'invalid samples are ignored');
 assert.equal(e.oneWayMs(),0);
}
// ---------- estimator: jitter resistance ----------
{
 const e=new LatencyEstimator();
 for(let i=0;i<5;i++)e.add(100);
 e.add(600); // one queueing spike
 for(let i=0;i<3;i++)e.add(100);
 assert(e.oneWayMs()>=40&&e.oneWayMs()<=85,'a single spike does not blow up the estimate, got '+e.oneWayMs());
}
// ---------- estimator: guest clock alignment / input age ----------
{
 const e=new LatencyEstimator();
 assert.equal(e.ageMs(1000,2000),null,'age is unknown before any aligned sample');
 // Host sent a ping at host t=10000; the guest stamped its pong at guest
 // t=10050 and the pong arrived at host t=10100 (RTT 100): the guest clock
 // leads the host clock by ~0ms (10050 - (10000 + 50)).
 e.add(100,10050,10000);
 const age=e.ageMs(10100,10160);
 assert.equal(age,60,'a guest input stamped 10100 arriving at host 10160 is 60ms old, got '+age);
 e.reset();
 assert.equal(e.oneWayMs(),0);
 assert.equal(e.ageMs(10100,10160),null,'reset clears the clock alignment');
}
// ---------- delay queue: fake scheduler ----------
{
 const jobs=[];
 const q=new InputDelayQueue((fn,ms)=>jobs.push({fn,ms}));
 let ran=0;
 assert.equal(q.push(0,()=>ran++),0);
 assert.equal(ran,1,'zero delay runs immediately');
 assert.equal(q.push(-10,()=>ran++),0);
 assert.equal(ran,2,'negative delay runs immediately');
 assert.equal(q.push(80,()=>ran++),80);
 assert.equal(ran,2,'a positive delay waits');
 assert.equal(jobs.at(-1).ms,80);
 jobs.at(-1).fn();
 assert.equal(ran,3,'the queued input fires when its timer elapses');
 assert.equal(q.push(99999,()=>ran++),150,'the queue clamps to the cap');
 assert.equal(jobs.at(-1).ms,150);
 q.push(50,()=>ran++);
 const pendingJob=jobs.at(-1);
 q.clear();
 pendingJob.fn();
 assert.equal(ran,3,'clear() cancels pending inputs');
 assert.equal(q.size,0);
}
// ---------- delay queue: real time ----------
async function realTime(){
 const q=new InputDelayQueue();
 const t0=Date.now();
 await new Promise(res=>q.push(40,res));
 const dt=Date.now()-t0;
 assert(dt>=30&&dt<2000,'a 40ms delay fires after roughly 40ms, got '+dt);
}
// ---------- source guards: gate + guest timestamps + SW rename ----------
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 const online=fs.readFileSync(__dirname+'/../dist/online.js','utf8');
 const gate=app.slice(app.indexOf('function hostDelayMs'),app.indexOf('function hostDelay('));
 assert(gate.includes("o.role!=='host'"),'host delay is gated to the host role');
 assert(gate.includes('!o.started'),'host delay requires a started match');
 assert(gate.includes('game.mirror'),'the guest mirror never takes the host delay');
 assert(app.includes("t:'ping'")&&app.includes("t:'pong'"),'ping/pong is exchanged while connected');
 assert(app.includes('ct:Math.round(performance.now())'),'guest inputs carry a guest-clock send timestamp');
 assert(app.includes("m.t==='swing'"),'guest swing handling still exists');
 assert(online.includes('class LatencyEstimator')&&online.includes('class InputDelayQueue'),'pure latency logic lives in online.js');
 const sw=fs.readFileSync(__dirname+'/../dist/sw.js','utf8');
 assert(sw.includes('nightball-v171-tab-swipe'),'SW cache renamed for the latency build');
}
realTime().then(()=>console.log('latency-v107: all assertions passed')).catch(e=>{console.error(e);process.exit(1);});
