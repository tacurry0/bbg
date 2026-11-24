// v131 audio cues (音響ガイド): pitch calls and batted-ball results are
// signalled by distinct synthesized tones, but only when the player turned
// the guide on (default off). In umpire mode no cue may sound before the
// player umpire makes their own call; afterwards the cue only echoes the
// player's own call as feedback, never the engine truth.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
let fetches=0,oscs=[];
class Param{constructor(){this.value=1;}setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{constructor(){this.gain=new Param();this.pan=new Param();this.playbackRate=new Param();}connect(n){return n;}disconnect(){this.disconnected=true;}start(){}stop(){}}
class Osc extends Node{constructor(){super();this.frequency=new Param();this.type='';}start(at){oscs.push({freq:this.frequency.value,at});}}
class Context{constructor(){this.currentTime=1;this.sampleRate=22050;this.state='suspended';this.destination=new Node();}createGain(){return new Node();}createConvolver(){return new Node();}createBufferSource(){return new Node();}createStereoPanner(){return new Node();}createOscillator(){return new Osc();}createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n;}createBuffer(ch,n,sr){return {duration:n/sr,length:n,getChannelData:()=>new Float32Array(n)};}async decodeAudioData(){return {duration:10};}async resume(){this.state='running';}}
global.AudioContext=Context;global.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
vm.runInThisContext(fs.readFileSync('dist/audio.js','utf8'));
(async()=>{
 // --- audio layer: OFF by default, ON plays the documented patterns ---
 const a=new NightAudio();await a.files;a.unlock();await a.ready;
 a.update({active:true,volume:50,crowd:0,enabled:true});
 assert.equal(a.cue('strike'),false,'cues are off unless the guide is enabled');
 assert.equal(oscs.length,0);
 a.update({cues:true});
 const expect={strike:[880],ball:[392],foul:[587,587],hit:[659,988],homer:[659,880,1319],out:[523,330],safe:[784,1047]};
 let total=0;
 for(const [kind,freqs] of Object.entries(expect)){
  oscs=[];assert.equal(a.cue(kind),true,kind+' cue fires when the guide is on');
  assert.deepEqual(oscs.map(o=>o.freq),freqs,kind+' pattern pitches');
  total+=freqs.length;
 }
 assert.equal(a.cue('bogus'),false,'unknown cue kinds stay silent');
 a.update({enabled:false});oscs=[];assert.equal(a.cue('strike'),false,'master sound off silences cues');
 assert.equal(oscs.length,0);
 a.update({enabled:true});a.update({cues:false});assert.equal(a.cue('hit'),false,'turning the guide off silences cues');

 // --- game layer: events are emitted for calls and batted-ball results ---
 for(const file of ['ratings-data.js','players.js','pennant.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'));
 vm.runInThisContext(fs.readFileSync('dist/game.js','utf8'));
 function gameWith(events,options={}){
  return new NightGame('match','standard',(type,value)=>{if(type==='cue')events.push(value);},options);
 }
 { // called strike / ball via the committed call path
  const events=[],g=gameWith(events);g.beginHalf();g.throwPitch();events.length=0;
  g.commitCalledPitch(true);assert.deepEqual(events,['strike'],'called strike cues strike');
  const events2=[],g2=gameWith(events2);g2.beginHalf();g2.throwPitch();events2.length=0;
  g2.commitCalledPitch(false);assert.deepEqual(events2,['ball'],'called ball cues ball');
 }
 { // batted-ball results: hit / out / foul / homer
  const events=[],g=gameWith(events);g.beginHalf();
  g.startField(30,20,0,true);events.length=0;g.finishBall('single');assert.deepEqual(events,['hit'],'single cues hit');
  g.startField(30,30,0,true);events.length=0;g.finishBall('flyout');assert.deepEqual(events,['out'],'flyout cues out');
  g.startField(30,20,0,true);events.length=0;g.finishBall('foul');assert.deepEqual(events,['foul'],'foul cues foul');
 }
 { // umpire mode: silence before the player's call; feedback echoes the
   // player's own call, not the truth (a strike pitch called a ball cues ball).
  const events=[],g=gameWith(events,{innings:3,umpire:true});
  g.spectate=true;g.autoBatting=true;g.autoDefense=true;
  g.beginHalf();
  g.createPitch(NightGame.TYPES[0],{x:0,y:0}); // dead-center: truth is a strike
  g.pitch.cpuSwing=false;g.pitch.cpuBunt=false;g.pitch.delivered=true;g.setPhase('pitch');g.phaseTime=6000;
  events.length=0;g.update(16);
  assert.equal(g.phase,'umpire-call');assert.equal(g.umpirePending.strike,true);
  assert.deepEqual(events,[],'no cue leaks the answer before the umpire calls');
  assert.equal(g.umpireCall(false),true); // player calls it a ball (wrong)
  assert.deepEqual(events,['ball'],'post-call cue echoes the player call, not the truth');
 }
 console.log('PASS: audio cues are off by default, fire the documented pitch/pattern set when on, follow the master sound switch, and never leak the call in umpire mode (post-call feedback only).');
})().catch(e=>{console.error(e);process.exitCode=1;});
