import assert from 'node:assert/strict';
import {BallparkMusic,musicSettings} from '../dist/music.js';
class Gain{
 gain={value:0,setValueAtTime:v=>{this.gain.value=v},setTargetAtTime:(v,t,f)=>{this.gain.value=v;this.gain.fade=f}};
 connect(){} disconnect(){}
}
class Source{
 connect(){} disconnect(){} start(){} stop(){this.stopped=true;this.onended?.()}
}
const context={currentTime:0,createGain:()=>new Gain(),createBufferSource:()=>new Source()};
const m=new BallparkMusic({context,master:{}},{});m.buffer=async()=>({numberOfChannels:1,getChannelData:()=>new Float32Array([.1,.2])});
const g={teams:{away:{id:'foxes'},home:{id:'owls'}},side:'home',userSide:'home',batter:{id:'one'},phase:'aim',inning:1,half:'bottom',outs:0,battingIndex:{home:0,away:0},bases:[false,false,false],box:{}};
const s=musicSettings();
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const update=()=>m.update(g,s,true,true);
update();
m.result(g,'hit','one','home');await tick();
const cue=m.slots.home,full=cue.gain.gain.value;
assert(full>0);assert.equal(cue.resultKind,'hit');
update();assert.equal(cue.gain.gain.value,full,'same plate does not duck the recording');
g.phase='result';g.batFinished=true;update();assert.equal(cue.gain.gain.value,full,'hit celebration remains loud');
g.phase='aim';g.batFinished=false;g.batter={id:'two'};g.battingIndex.home=1;update();
assert.equal(m.slots.home,cue,'no next cheer: let recording finish');
assert(Math.abs(cue.gain.gain.value/full-.1)<1e-8);
assert.equal(cue.gain.gain.fade,.25,'smooth fading rather than an abrupt change');
g.phase='result';g.batFinished=true;update();assert(Math.abs(cue.gain.gain.value/full-.1)<1e-8,'old cue never becomes loud again');
g.phase='aim';g.batFinished=false;g.batter={id:'three'};g.battingIndex.home=2;update();
m.result(g,'hit','three','home');await tick();
assert(cue.source.stopped);assert.equal(m.slots.home.gain.gain.value,full,'another hit starts at full level');
const second=m.slots.home;
g.phase='result';g.batFinished=true;update();
s.assignments['player:owls:four']={cheer:'preset:clap'};
g.phase='aim';g.batFinished=false;g.batter={id:'four'};g.battingIndex.home=3;update();await tick();
assert(second.source.stopped);assert.equal(m.slots.home.id,'preset:clap','new batter cheer still replaces the hit cue');
// A hit emitted at the final judgement has no active plate key. It must
// stay loud until the next plate, including an inning/side transition.
m.reset();m.update(g,s,true,true);
g.phase='result';g.batFinished=true;update();
m.result(g,'hit','four','home');await tick();
const late=m.slots.home;assert.equal(late.atBat,null);assert.equal(late.gain.gain.value,full);
g.half='top';g.inning=2;g.side='away';g.batter={id:'five'};g.phase='aim';g.batFinished=false;update();
assert(Math.abs(late.gain.gain.value/full-.1)<1e-8);
m.update(g,s,false,false);assert.equal(late.gain.gain.value,0,'mute always wins');
m.update(g,s,true,true);assert(Math.abs(late.gain.gain.value/full-.1)<1e-8,"mute/unmute does not restore an old hit's full volume");
console.log('PASS: next-plate hit ducking without cheer, soft fade, no rebound, new hit restored, next cheer replacement, late result and side change.');
