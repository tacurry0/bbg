// v160 catch-sound timing: the mitt sound for a pitch that reaches the
// catcher must fire at the ball's arrival (pitch progress 1.0), not when
// the call is resolved. Before v160 the only pitch-catch emissions lived
// in commitCalledPitch()/strike()/take(), which run at progress >= 1.24
// (0.24 * duration late: ~190-290 ms depending on difficulty/speed) —
// and when an ABS challenge window opened, seconds later, after the
// STRIKE/BALL banner. The mitt recordings themselves start ~10 ms in
// (measured on the decoded mp3s), and NightAudio.sample() schedules at
// currentTime+0, so neither the asset nor WebAudio scheduling explains
// the lag: it was purely the emission point. Fielder catches in the
// field phase are a different sound path and are not touched.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data.js','players.js','pennant.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'));
vm.runInThisContext(fs.readFileSync('dist/game.js','utf8'));
const gameSrc=fs.readFileSync('dist/game.js','utf8');

// --- static wiring: arrival emission + guarded resolution fallbacks ---
{
 const pitchBranch=gameSrc.slice(gameSrc.indexOf("else if(this.phase==='pitch'){"));
 assert(pitchBranch.slice(0,900).includes('this.pitch.progress>=1)this.catchPitchSound()'),
  'update() fires the mitt sound at the arrival frame (progress>=1) in the pitch phase');
 assert(pitchBranch.indexOf('catchPitchSound()')<pitchBranch.indexOf('this.take()'),
  'arrival emission precedes the take() resolution (progress 1.24) in the pitch phase');
 const missBranch=gameSrc.slice(gameSrc.indexOf("else if(this.phase==='miss'){"));
 assert(missBranch.slice(0,700).includes('catchPitchSound()')&&missBranch.indexOf('catchPitchSound()')<missBranch.indexOf('this.strike(true)'),
  'miss phase fires the mitt sound on the extended travel (u>=1) before strike() resolves');
 const commit=gameSrc.slice(gameSrc.indexOf('commitCalledPitch(strike){'),gameSrc.indexOf('strike(swung){'));
 assert(commit.includes('this.catchPitchSound()')&&!commit.includes("emit('sound','catch')"),
  'commitCalledPitch uses the once-per-pitch guard, not a raw catch emission');
 const strikeStart=gameSrc.indexOf('strike(swung){');
 const strikeFn=gameSrc.slice(strikeStart,gameSrc.indexOf('addOut(',strikeStart));
 assert(strikeFn.includes('this.catchPitchSound()')&&!strikeFn.includes("emit('sound','catch')"),
  'strike() uses the once-per-pitch guard, not a raw catch emission');
 // Fielder catches (field phase) keep their own emissions.
 assert(gameSrc.includes("if(caught)this.emit('sound','catch')"),'fielding catch sound path unchanged');
}

// --- harness: record every event with the pitch state at emission time ---
function harness(){
 const holder={g:null},events=[];
 const emit=(type,value)=>{
  const g=holder.g;
  events.push({type,value,phase:g?.phase,progress:g?.pitch?.progress??null,
   missU:g?.phase==='miss'&&g?.pitch?g.pitch.progress+g.phaseTime/(g.pitch.duration||1):null});
 };
 const g=new NightGame('match','standard',emit);holder.g=g;
 return {g,events};
}
function drive(g,maxFrames=600){
 for(let i=0;i<maxFrames&&g.phase!=='result';i++)g.update(16);
 assert.equal(g.phase,'result','pitch resolves to the result phase');
 for(let i=0;i<5;i++)g.update(16); // a few extra frames: no late duplicates
}
const catches=ev=>ev.filter(e=>e.type==='sound'&&e.value==='catch');
const messages=ev=>ev.filter(e=>e.type==='message');

{ // --- taken pitch: catch at arrival, before the call banner, once ---
 const {g,events}=harness();
 g.beginHalf();g.throwPitch();
 g.pitch.cpuSwing=false;g.pitch.cpuBunt=false; // a take
 events.length=0;
 drive(g);
 const cs=catches(events);
 assert.equal(cs.length,1,'taken pitch sounds the mitt exactly once');
 assert.equal(cs[0].phase,'pitch','mitt sound fires during the pitch phase, at arrival');
 assert(cs[0].progress>=1&&cs[0].progress<1.1,
  `mitt sound fires at arrival (progress ${cs[0].progress?.toFixed(3)} in [1,1.1)), not at the 1.24 take threshold`);
 const catchIdx=events.indexOf(cs[0]),msgIdx=events.findIndex(e=>e.type==='message');
 assert(msgIdx===-1||catchIdx<msgIdx,'mitt sound precedes the STRIKE/BALL call message');
 assert(messages(events).every(m=>events.indexOf(m)>catchIdx),'no call banner of this pitch precedes the mitt sound');
}

{ // --- deferred resolution (ABS-style): no second mitt sound at commit ---
 const {g,events}=harness();
 g.beginHalf();g.throwPitch();
 g.pitch.cpuSwing=false;g.pitch.cpuBunt=false;
 events.length=0;
 // Drive only until the arrival frame has sounded the mitt.
 for(let i=0;i<600&&!catches(events).length;i++)g.update(16);
 assert.equal(catches(events).length,1,'arrival mitt sound fired before any resolution');
 assert.equal(g.pitch.catchSound,true,'pitch is marked as sounded');
 // Now resolve the call the way a deferred ABS resolution would.
 g.commitCalledPitch(true);
 assert.equal(catches(events).length,1,'commitCalledPitch does not re-sound the mitt after arrival');
 g.strike(false);
 assert.equal(catches(events).length,1,'strike() does not re-sound the mitt after arrival');
}

{ // --- direct-call fallback: take()/commit without the frame loop ---
 const {g,events}=harness();
 g.beginHalf();g.throwPitch();g.pitch.isStrike=true;events.length=0;
 g.take();
 assert.equal(catches(events).length,1,'direct take() still sounds the mitt exactly once (fallback)');
 const h2=harness();h2.g.beginHalf();h2.g.throwPitch();h2.events.length=0;
 h2.g.commitCalledPitch(false);
 assert.equal(catches(h2.events).length,1,'direct commitCalledPitch(ball) sounds the mitt exactly once (fallback)');
 assert(h2.events.some(e=>e.type==='cue'&&e.value==='ball'),'v131 ball cue still emitted by the commit path');
}

{ // --- swing and miss: swing sound, then mitt at extended arrival, then call ---
 const {g,events}=harness();
 g.beginHalf();g.throwPitch();
 g.pitch.cpuSwing=true;g.pitch.cpuBunt=false;
 g.pitch.cpuAim={x:g.pitch.targetX+5,y:g.pitch.targetY}; // whiff by position
 g.pitch.cpuTime=0.9; // swing starts before the ball arrives
 events.length=0;
 drive(g);
 const cs=catches(events);
 assert.equal(cs.length,1,'swing-and-miss sounds the mitt exactly once');
 assert.equal(cs[0].phase,'miss','mitt sound fires in the miss phase, when the ball reaches the catcher');
 assert(cs[0].missU>=1&&cs[0].missU<1.15,`mitt sound at extended arrival (u=${cs[0].missU?.toFixed(3)})`);
 const swingIdx=events.findIndex(e=>e.type==='sound'&&e.value==='swing');
 const catchIdx=events.indexOf(cs[0]),msgIdx=events.findIndex(e=>e.type==='message');
 assert(swingIdx>-1&&swingIdx<catchIdx,'swing (swish) sound precedes the mitt sound');
 assert(msgIdx===-1||catchIdx<msgIdx,'mitt sound precedes the SWING & MISS / STRIKE call message');
 assert(events.some(e=>e.type==='sound'&&e.value==='strike'),'strike crowd sound still follows the call resolution');
}

{ // --- foul and fair contact: no pitch-catch sound on those paths ---
 const {g,events}=harness();
 g.beginHalf();
 g.startField(30,20,1.2,true);events.length=0;g.finishBall('foul');
 assert(events.some(e=>e.type==='sound'&&e.value==='foul'),'foul sound path unchanged');
 assert(events.some(e=>e.type==='cue'&&e.value==='foul'),'v131 foul cue unchanged');
 assert.equal(catches(events).length,0,'a foul ball never reaches the mitt: no catch sound');
 g.startField(30,20,0,true);events.length=0;g.finishBall('single');
 assert(events.some(e=>e.type==='sound'&&e.value==='safe'),'hit result sound path unchanged');
 assert.equal(catches(events).length,0,'a fair hit has no pitch-catch sound');
 g.startField(30,30,0,true);events.length=0;g.finishBall('flyout');
 assert.equal(catches(events).length,1,'flyout keeps exactly one fielder catch sound');
}

console.log('PASS: mitt sound fires at ball arrival (progress 1.0 in the pitch phase; extended u>=1 in the miss phase), exactly once per pitch, before the call message, with guarded fallbacks for direct resolutions, and foul/hit/flyout sound paths unchanged.');
