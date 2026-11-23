// v113: at-bat pitch chart data. The engine keeps the current plate
// appearance's pitches (type, target, result) in game.atBatPitches:
//  - every completed pitch is appended via completePitch (the same choke
//    point that feeds pitchTrace);
//  - the list resets when the plate appearance ends (endAtBat), so the HUD
//    chart always shows the CURRENT at-bat only;
//  - the online host streams it (onlineState abp) and the guest mirror
//    rebuilds it in applyMirror, so both players see the same chart.
const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
for(const file of ['ratings-data','players','pennant','game'])require('../dist/'+file+'.js');

const appJs=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const indexHtml=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
assert(appJs.includes('abp:(g.atBatPitches||[])'),'onlineState streams the at-bat pitches');
assert(appJs.includes('updateAtBatChart'),'app renders the at-bat chart');
assert(indexHtml.includes('id="atbat-chart"'),'HUD has the chart element');

// A taken pitch with ABS windows disabled, so calls commit immediately.
// x=1.6 is a clear ball, x=0 a clear strike; Math.random pinned high so
// HBP / wild-pitch rolls never fire.
function takenPitch(g,x){
 g.createPitch(NightGame.TYPES[0],{x,y:0});
 g.pitch.delivered=true;g.setPhase('pitch');
 const random=Math.random;
 try{Math.random=()=>.99;g.take();}finally{Math.random=random;}
}

function battingGame(){
 const g=new NightGame('match','standard',()=>{});
 g.half='bottom';g.inning=1;g.outs=0;g.balls=0;g.strikes=0;
 g.absRemaining=0;g.absCpuRemaining=0; // no ABS windows in this test
 return g;
}

// ---------- accumulation + per-pitch fields ----------
{
 const g=battingGame();
 assert.deepEqual(g.atBatPitches,[],'starts empty');
 takenPitch(g,1.6);
 assert.equal(g.atBatPitches.length,1);
 assert.equal(g.atBatPitches[0].result,'ball');
 assert.equal(g.atBatPitches[0].id,'fast');
 assert.equal(typeof g.atBatPitches[0].x,'number');
 takenPitch(g,0);
 assert.equal(g.atBatPitches.length,2);
 assert.equal(g.atBatPitches[1].result,'miss','a called strike is recorded');
 assert.equal(g.balls,1);assert.equal(g.strikes,1);
 // pitchTrace behaviour is unchanged alongside the new list
 assert.equal(g.pitchTrace.length,2);
}

// ---------- walk ends the plate appearance and clears the chart ----------
{
 const g=battingGame();
 for(let i=0;i<3;i++)takenPitch(g,1.6);
 assert.equal(g.atBatPitches.length,3);
 takenPitch(g,1.6); // ball four
 assert.equal(g.batterStats().bb,1,'walk recorded');
 assert.deepEqual(g.atBatPitches,[],'chart clears when the at-bat ends');
}

// ---------- strikeout also clears; the next batter starts fresh ----------
{
 const g=battingGame();
 takenPitch(g,0);takenPitch(g,0);
 assert.equal(g.atBatPitches.length,2);
 takenPitch(g,0); // strike three
 assert.equal(g.batterStats().k,1,'strikeout recorded');
 assert.deepEqual(g.atBatPitches,[],'chart clears on strikeout');
 takenPitch(g,1.6);
 assert.equal(g.atBatPitches.length,1,'next at-bat accumulates from zero');
 assert.equal(g.atBatPitches[0].result,'ball');
}

// ---------- mirror: the guest rebuilds the chart from the stream ----------
{
 const host=battingGame();
 takenPitch(host,1.6);takenPitch(host,0);
 const guest=new NightGame('match','standard',()=>{},{userHome:false});
 guest.mirror=true;
 const s={
  phase:host.phase,pt:host.phaseTime,inning:host.inning,half:host.half,outs:host.outs,balls:host.balls,strikes:host.strikes,
  hs:0,as:0,home:host.home.slice(),away:host.away.slice(),hh:0,ah:0,he:0,ae:0,
  bases:[0,0,0],baseIds:host.baseIds.slice(),bi:{...host.battingIndex},batFin:0,
  lu:{home:host.lineups.home.map(p=>[p.id,p.fieldPos||p.pos]),away:host.lineups.away.map(p=>[p.id,p.fieldPos||p.pos])},
  pi:{u:host.homePitcherIndex,c:host.awayPitcherIndex},usedU:host.usedPitchers.slice(),usedC:host.usedCpuPitchers.slice(),
  ps:host.pitchingStats,box:host.box,pitch:null,pitchSeq:0,lastPitch:null,
  abp:host.atBatPitches.map(p=>({i:p.id,n:p.name,x:p.x,y:p.y,r:p.result})),
  field:null,fs:1,fsq:0,hit:null,swingAge:0,
  absCall:null,absU:0,absCpu:2,halfBreak:null,baseCall:null,playU:2,playCpu:2,
  weather:host.weather,weatherLabel:host.weatherLabel,wind:host.wind,next:host.next,umpireLabel:host.umpireLabel,
 };
 guest.applyMirror(s);
 assert.equal(guest.atBatPitches.length,2,'guest chart mirrors the host');
 assert.equal(guest.atBatPitches[0].result,'ball');
 assert.equal(guest.atBatPitches[1].id,'fast');
 guest.applyMirror({...s,abp:[]});
 assert.deepEqual(guest.atBatPitches,[],'an empty stream clears the guest chart');
}

console.log('atbat-chart-v113: all assertions passed');
