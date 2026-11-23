// v111: online ABS challenges must work for BOTH players, not only the host.
// Before the fix, three defects combined to block the guest:
//  1. On the host, a call whose disadvantaged side was the guest was flagged
//     absCall.cpu, so the CPU's random shouldCpuChallenge() decided for the
//     guest (usually opening no window at all), and update() auto-advanced
//     the window to a "CPU" review after 650ms.
//  2. The guest mirror copied absCall (and its host-perspective cpu flag)
//     verbatim, so absCanChallenge was false exactly when the guest was the
//     side entitled to challenge: no button, no tap.
//  3. The host's {t:'abs-challenge'} handler required remoteBatter &&
//     absCanChallenge, dropping guest challenges whenever the guest was the
//     defending side (and whenever the call was flagged cpu).
// The fix: take() flags guest-challengeable calls absCall.remote (window
// opens on the guest's remaining count, no CPU model, no auto-review, plus
// a modest round-trip grace on the window); applyMirror recomputes cpu
// from the mirror's own perspective (same formula as take(), local user);
// requestAbsChallenge(true) lets the host accept the guest's challenge;
// the app.js handler routes the message to it without the remoteBatter gate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

// Host game: host is home, guest is away (remoteSide 'away').
// Mirror game: the guest's own instance (userHome false).
function hostGame(){const g=new NightGame('match','standard',()=>{},{userHome:true,remoteSide:'away'});g.onlineGame=true;return g;}
function guestGame(){const g=new NightGame('match','standard',()=>{},{userHome:false});g.onlineGame=true;g.mirror=true;const sent=[];g.mirrorSend=m=>sent.push(m);g._sent=sent;return g;}

// Replicates the fields of app.js onlineState() that applyMirror consumes.
function streamState(g,pitchSeq=0){
 return {
  phase:g.phase,pt:g.phaseTime,inning:g.inning,half:g.half,outs:g.outs,balls:g.balls,strikes:g.strikes,
  hs:g.homeScore,as:g.awayScore,home:g.home.slice(),away:g.away.slice(),hh:g.homeHits,ah:g.awayHits,he:g.homeErrors,ae:g.awayErrors,
  bases:g.bases.map(b=>b?1:0),baseIds:g.baseIds.slice(),bi:{...g.battingIndex},batFin:g.batFinished?1:0,
  lu:{home:g.lineups.home.map(p=>[p.id,p.fieldPos||p.pos]),away:g.lineups.away.map(p=>[p.id,p.fieldPos||p.pos])},
  pi:{u:g.homePitcherIndex,c:g.awayPitcherIndex},usedU:g.usedPitchers.slice(),usedC:g.usedCpuPitchers.slice(),
  ps:g.pitchingStats,box:g.box,pitch:g.pitch||null,pitchSeq,
  lastPitch:g.lastPitch||null,field:null,fs:1,fsq:0,hit:null,swingAge:g.swingAge,
  absCall:g.absCall||null,absU:g.absRemaining,absCpu:g.absCpuRemaining,halfBreak:null,
  baseCall:null,playU:g.playChallenges,playCpu:g.playCpuChallenges,
  weather:g.weather,weatherLabel:g.weatherLabel,wind:g.wind,next:g.next,umpireLabel:g.umpireLabel,
 };
}

// Force a taken pitch on the host. half 'top' = guest batting (host
// defending); 'bottom' = host batting (guest defending). x=1.08 is a true
// ball just outside; roll 0 makes the umpire call it a strike, roll .99
// makes the umpire agree with the truth.
function hostCalledPitch(g,{half='top',x=1.08,roll=0}={}){
 g.half=half;g.inning=5;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 g.absRemaining=2;g.absCpuRemaining=2;
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;const draws=[roll,.99,0];
 try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 return g;
}

// ---------- case A: guest batting, umpire's bad strike call ----------
// The guest is disadvantaged. The window must open for the guest (not be
// decided by the CPU model), must not auto-review as a CPU challenge, the
// mirror must arm the guest's button, and the guest's challenge must run
// the review on the host and keep the guest's challenge when overturned.
{
 const host=hostCalledPitch(hostGame(),{half:'top',roll:0});
 assert.equal(host.phase,'abs-call','host opens the challenge window for the guest');
 assert.equal(host.absCall.cpu,true,'from the host perspective the challenger is the other side');
 assert.equal(host.absCall.remote,true,'the call is flagged as the online guest\u2019s to challenge');
 host.phaseTime=NightGame.ABS_TIMING.cpuCall+100;host.update(20);
 assert.equal(host.phase,'abs-call','no CPU auto-review while the guest decides');
 host.phaseTime=NightGame.ABS_TIMING.call+800+100;host.update(20);
 assert.equal(host.phase,'abs-call','remote window carries round-trip grace beyond the online window');

 const guest=guestGame();
 guest.applyMirror(streamState(host));
 assert.equal(guest.phase,'abs-call');
 assert.equal(guest.absCall.cpu,false,'mirror recomputes cpu from the guest perspective');
 assert.equal(guest.absRemaining,2,'mirror shows the guest\u2019s own remaining challenges');
 assert(guest.absCanChallenge,'guest button/tap is armed');
 assert(guest.requestAbsChallenge(),'guest activation succeeds');
 assert.deepEqual(guest._sent,[{t:'abs-challenge'}],'guest forwards the challenge to the host');
 assert.equal(guest.phase,'abs-call','the mirror itself does not resolve the call');

 assert(host.requestAbsChallenge(true),'host accepts the guest challenge');
 assert.equal(host.phase,'abs-review','host enters the review');
 host.phaseTime=NightGame.ABS_TIMING.reviewEnd+10;host.update(20);
 assert.equal(host.absCpuRemaining,2,'overturned: the guest keeps the challenge');
 assert.equal(host.absRemaining,2,'host count untouched');

 guest.applyMirror(streamState(host,1));
 assert.equal(guest.absRemaining,2,'guest count after the review streams back unchanged');
 assert(!guest.absCanChallenge,'no challenge armed after the pitch is committed');
}

// ---------- case B: guest defending, umpire's bad ball call ----------
// The disadvantaged side is the defense = the guest. The old host handler
// required remoteBatter and dropped exactly this case.
{
 // True strike just inside the edge, umpire calls it a ball: the defense
 // (guest) is disadvantaged and may challenge; the call is overturned.
 const host=hostCalledPitch(hostGame(),{half:'bottom',x:.92,roll:.99});
 assert.equal(host.phase,'abs-call','window opens with the guest defending');
 assert.equal(host.absCall.remote,true);
 assert.equal(host.remoteBatter,false,'guest is defending: remoteBatter gate would have dropped this');
 const guest=guestGame();
 guest.applyMirror(streamState(host));
 assert(guest.absCanChallenge,'guest defending can challenge');
 assert(guest.requestAbsChallenge());
 assert(host.requestAbsChallenge(true),'host accepts a defending guest\u2019s challenge');
 host.phaseTime=NightGame.ABS_TIMING.reviewEnd+10;host.update(20);
 assert.equal(host.absCpuRemaining,2,'overturned strike: guest keeps the challenge');
 assert.equal(host.outs,3,'the reviewed strike is committed as strike three: strikeout, third out');
}

// ---------- case C: host disadvantaged in an online game ----------
// Local flow is unchanged: the host challenges with the no-arg entry point,
// and a stray guest message cannot spend the host's challenge.
{
 const host=hostCalledPitch(hostGame(),{half:'top',x:.92,roll:.99}); // true strike called ball; host (defense) disadvantaged
 assert.equal(host.phase,'abs-call');
 assert.equal(host.absCall.cpu,false);
 assert(!host.absCall.remote,'host\u2019s own call is not flagged remote');
 assert(host.absCanChallenge,'host can challenge');
 assert(!host.requestAbsChallenge(true),'a remote acceptance is refused for the host\u2019s own call');
 assert(host.requestAbsChallenge(),'host challenge runs');
 assert.equal(host.phase,'abs-review');
}

// ---------- case D: guest out of challenges gets no window ----------
{
 const host=hostGame();
 hostCalledPitch(host,{half:'top',roll:0});
 assert.equal(host.phase,'abs-call');
 const host2=hostGame();
 host2.half='top';host2.inning=5;host2.outs=2;host2.balls=3;host2.strikes=2;host2.seedRunners(3,2);
 host2.absRemaining=2;host2.absCpuRemaining=0;
 host2.createPitch(NightGame.TYPES[0],{x:1.08,y:0});host2.pitch.delivered=true;host2.setPhase('pitch');
 const random=Math.random;const draws=[0,.99,0];
 try{Math.random=()=>draws.shift()??0;host2.take();}finally{Math.random=random;}
 assert.notEqual(host2.phase,'abs-call','no window when the guest has no challenges left');
 assert(!host2.requestAbsChallenge(true),'nothing for the host to accept');
}

// ---------- case E: offline behaviour is untouched ----------
{
 const g=new NightGame('match','standard',()=>{});
 g.half='top';g.inning=5;g.outs=2;g.balls=3;g.strikes=2;g.seedRunners(3,2);
 g.absRemaining=0;g.absCpuRemaining=2;
 g.createPitch(NightGame.TYPES[0],{x:1.08,y:0});g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;const draws=[0,.99,0];
 // Force the CPU model to accept (shouldCpuChallenge draws after take's).
 try{Math.random=()=>draws.shift()??0;g.take();}finally{Math.random=random;}
 if(g.phase==='abs-call'){
  assert.equal(g.absCall.cpu,true);
  assert(!g.absCall.remote,'offline calls are never flagged remote');
  g.phaseTime=NightGame.ABS_TIMING.cpuCall+100;g.update(20);
  assert.equal(g.phase,'abs-review','offline CPU challenges still auto-review on the old timing');
 }
}

// ---------- app.js wiring ----------
{
 const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
 assert(app.includes("m.t==='abs-challenge'"),'host still routes the guest abs-challenge message');
 assert(app.includes('requestAbsChallenge(true)'),'host routes it to the remote acceptance path');
 assert(!app.includes("m.t==='abs-challenge'&&g.remoteBatter"),'the remoteBatter gate that dropped defending-guest challenges is gone');
}

console.log('abs-online-v111: all assertions passed');
