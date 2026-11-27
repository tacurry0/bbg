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
assert(!mixer.slots.away);
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

function battedBall({speed=8,firstOccupied=false,manualRunning=false}={}){
 const hits=[];
 const g=new NightGame('match','standard',(type,value)=>{
  if(type==='music-result'&&value.kind==='hit')hits.push(value);
 },{manualRunning});
 g.half='bottom';
 if(firstOccupied){g.bases[0]=true;g.baseIds[0]=g.lineups.home[1].id;}
 g.startField(36,43,.16,false);
 for(const p of g.field.fielders)p.x=p.y=p.startX=p.startY=999;
 const batter=g.field.runners.find(r=>r.batter);
 batter.speed=speed;
 return {g,hits,batter};
}
function fieldUntil(g,condition){
 for(let i=0;i<1200&&!condition()&&g.phase==='field';i++)g.updateField(.01);
 assert(condition());
}
for(const manualRunning of [false,true]){
 const {g,hits,batter}=battedBall({speed:5.5,manualRunning});
 fieldUntil(g,()=>g.field.ball.bounces>0);
 assert(batter.progress<1);
 assert.equal(hits.length,0,'ground contact alone does not start the hit song');
 fieldUntil(g,()=>batter.furthest===1);
 assert.deepEqual(hits,[{kind:'hit',player:batter.id,side:'home'}]);
 assert.equal(g.phase,'field','the hit song starts before the ball comes back in');
 g.finishManualPlay();
 assert.equal(hits.length,1,'the final hit ruling does not restart the song');
}
const longFly=battedBall({speed:18});
fieldUntil(longFly.g,()=>longFly.batter.furthest===1);
assert.equal(longFly.g.field.ball.bounces,0);
assert.equal(longFly.hits.length,0,'first base alone does not confirm the hit');
fieldUntil(longFly.g,()=>longFly.hits.length===1);
assert(longFly.g.field.ball.bounces>0);

const caught=battedBall({speed:18});
fieldUntil(caught.g,()=>caught.batter.furthest===1);
caught.g.secureManualBall(7,true);
caught.g.finishManualPlay();
assert.equal(caught.hits.length,0,'a fly caught before it lands is an out even after first base');

const choice=battedBall({firstOccupied:true,manualRunning:true});
const lead=choice.g.field.runners.find(r=>r.start===1);
lead.speed=2.5;
fieldUntil(choice.g,()=>choice.batter.furthest===1&&choice.g.field.ball.bounces>0);
assert.equal(choice.hits.length,0,'a force on a lead runner is still possible');
choice.g.manualOut(lead,'force',2);
choice.g.finishManualPlay();
assert.equal(choice.hits.length,0,'a fielder’s choice does not play the hit song');

const groundRule=battedBall();
groundRule.g.field.ball.bounces=1;
groundRule.g.field.groundRule=true;
groundRule.g.finishBall('double');
assert.equal(groundRule.hits.length,0,'an awarded hit waits for actual first-base arrival');
for(let i=0;i<1200&&!groundRule.hits.length;i++)groundRule.g.updateRunners(.01);
assert(groundRule.batter.progress>=1);
assert.equal(groundRule.hits.length,1);
console.log('PASS: per-team music, result cues, fair-ball and first-base timing, force plays and one hit cue per play.');
