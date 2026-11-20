import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import { BallparkMusic, musicSettings, gameMusicKeys, trackFor } from '../dist/music.js';

class Gain{
 gain={value:0,setValueAtTime:v=>{this.gain.value=v;},setTargetAtTime:v=>{this.gain.value=v;}};
 connect(){}
 disconnect(){}
}
class Source{
 connect(){}
 disconnect(){}
 start(){this.started=true;}
 stop(){this.stopped=true;this.onended?.();}
}
const buffer=(n,rate)=>{
 const data=new Float32Array(n);
 return {numberOfChannels:1,duration:n/rate,getChannelData:()=>data};
};
const context={currentTime:0,createGain:()=>new Gain(),createBufferSource:()=>new Source(),
 createBuffer:(_channels,n,rate)=>buffer(n,rate),decodeAudioData:()=>Promise.resolve(buffer(20,20))};
const mixer=new BallparkMusic({context,master:{}},{get:async()=>({file:new Blob(['audio'])})});
const g={teams:{away:{id:'foxes'},home:{id:'owls'}},side:'home',userSide:'home',batter:{id:'b1'},
 phase:'windup',inning:1,half:'bottom',outs:0,battingIndex:{home:0,away:0},bases:[true,false,false]};
const s=musicSettings({assignments:{
 'team:owls':{cheer:'preset:stadium',chance:'preset:rally',hit:'preset:out'},'player:owls:b1':{cheer:'preset:clap'},
 'team:foxes':{out:'preset:out',thirdOut:'preset:clap'},'player:foxes:p1':{strikeout:'preset:strike'},
 'career:save-a':{cheer:'user:theme'},'career-team:save-a':{out:'preset:rally'},
 'player:owls:b3':{cheer:'off'}
}});
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
mixer.update(g,s,true,true);await tick();
assert.equal(mixer.slots.home.id,'preset:clap');
assert(mixer.slots.home.source.loop);
mixer.result(g,'out','f1');await tick();
assert.equal(mixer.slots.away.id,'preset:out');
const original=mixer.slots.away.source,full=mixer.slots.away.gain.gain.value;
assert(full>0);
g.batFinished=true;g.phase='result';mixer.update(g,s,true,true);
assert(!mixer.slots.home);assert.equal(mixer.slots.away.source,original);
g.batter={id:'b2'};g.battingIndex.home=1;g.batFinished=false;g.phase='windup';
mixer.update(g,s,true,true);await tick();
assert.equal(mixer.slots.home.id,'preset:stadium');
assert(mixer.slots.home.gain.gain.value>0);
assert.equal(mixer.slots.away.source,original);
assert(Math.abs(mixer.slots.away.gain.gain.value/full-.3)<1e-6);
mixer.result(g,'hit','b2','home');await tick();
const hitSong=mixer.slots.home.source;
assert(!hitSong.loop);assert.equal(mixer.slots.away.source,original);
g.batFinished=true;g.phase='result';mixer.update(g,s,true,true);
g.batter={id:'b3'};g.battingIndex.home=2;g.batFinished=false;g.phase='windup';g.bases=[false,true,false];
mixer.update(g,s,true,true);await tick();
assert(hitSong.stopped);assert.equal(mixer.slots.home.id,'preset:rally');
g.bases=[false,false,true];mixer.update(g,s,true,true);await tick();
assert.equal(mixer.slots.home.id,'preset:rally');
g.bases=[true,false,false];mixer.update(g,s,true,true);
assert(!mixer.slots.home);
context.currentTime=1;mixer.result(g,'strikeout','p1');await tick();
assert.equal(mixer.slots.away.id,'preset:strike');
assert(original.stopped);
context.currentTime=2;mixer.result(g,'strikeout','p1','away',true);await tick();
assert.equal(mixer.slots.away.id,'preset:clap');
mixer.update(g,s,false,true);
assert.equal(mixer.slots.away.gain.gain.value,0);
mixer.update(null,s,true,false);
assert(!mixer.slots.away);
g.career={teamSeed:'save-a',playerId:'career-player'};g.batter={id:'career-player'};
assert.equal(trackFor(s,'cheer',gameMusicKeys(g,'home',g.batter.id)),'user:theme');
assert.equal(trackFor(s,'out',gameMusicKeys(g,'home',g.batter.id)),'preset:rally');
mixer.update(g,s,true,true);await tick();assert.equal(mixer.slots.home.id,'user:theme');
assert(await mixer.preview('preset:strike','strikeout',true));assert(!mixer.slots.preview.source.loop);

const worldGame={...g,career:null,worldMusic:{teamSeed:'world-save',playerId:'career-player'},
 phase:'windup',half:'top',side:'away',userSide:'away',batFinished:false,batter:{id:'career-player'},bases:[false,true,false]};
const worldSettings=musicSettings();
mixer.update(worldGame,worldSettings,true,true);await tick();
assert.equal(mixer.slots.away.id,'preset:stadium');
assert(mixer.slots.away.source.loop);
worldSettings.assignments['career-team:world-save']={cheer:'preset:clap'};
mixer.update(worldGame,worldSettings,true,true);await tick();
assert.equal(mixer.slots.away.id,'preset:clap');
worldSettings.assignments['career:world-save']={chance:'preset:rally',cheer:'off'};
mixer.update(worldGame,worldSettings,true,true);await tick();
assert.equal(mixer.slots.away.id,'preset:rally');
worldGame.bases=[false,false,false];
mixer.update(worldGame,worldSettings,true,true);
assert(!mixer.slots.away);
worldGame.side='home';worldGame.half='bottom';
mixer.update(worldGame,worldSettings,true,true);await tick();
assert(!mixer.slots.home);

globalThis.window=globalThis;
for(const file of ['ratings-data','players','pennant','game']){
 vm.runInThisContext(readFileSync('dist/'+file+'.js','utf8'));
}
const cues=[],game=new NightGame('match','standard',(type,value)=>{if(type==='music-result')cues.push(value);});
game.beginHalf();game.throwPitch();
game.strikes=2;game.strike(true);
assert.deepEqual(cues,[{kind:'strikeout',player:game.pitcher.id,side:'home',thirdOut:false}]);
game.startField(25,40,.1,true);game.finishBall('flyout');
assert.equal(cues.at(-1).kind,'out');
game.outs=2;game.strikes=2;game.strike(true);
assert.equal(cues.at(-1).thirdOut,true);
game.endAtBat('double');assert.equal(cues.at(-1).kind,'hit');
assert.equal(cues.at(-1).side,game.side);
console.log('PASS: chance, hit and third-out cues, per-team replacement, opposite-team overlap, inheritance and mute.');
