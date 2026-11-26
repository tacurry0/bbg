import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BallparkMusic, musicSettings, defaultTeamResult, trackForEvent, PRESETS} from '../dist/music.js';

const preset='preset:ctbc-brothers-hit';
assert.equal(defaultTeamResult('owls','hit'),preset);
assert.equal(defaultTeamResult('brothers','hit'),preset);
assert.equal(defaultTeamResult('foxes','hit'),null);
for(const kind of ['out','strikeout','thirdOut','cheer','chance'])assert.equal(defaultTeamResult('owls',kind),null);
assert(PRESETS.some(p=>p.id===preset&&p.name==='我們兄弟（安打）'));
const settings=musicSettings();
let bytes=0;
const context={
 currentTime:0,
 decodeAudioData:async a=>{bytes=a.byteLength;return {numberOfChannels:1,getChannelData:()=>new Float32Array([.1,.2])}},
 createGain:()=>({gain:{setValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}}),
 createBufferSource:()=>({connect(){},disconnect(){},start(){this.started=true},stop(){this.onended?.()}})
};
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{assert(url.pathname.endsWith('/ctbc-brothers-hit.mp3'));const a=readFileSync(url);return {ok:true,arrayBuffer:async()=>a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength)}};
try{
 const mixer=new BallparkMusic({context,master:{}},{});
 const g={teams:{home:{id:'owls'},away:{id:'foxes'}},side:'home',userSide:'home'};
 Object.assign(mixer,{game:g,settings,enabled:true,pageActive:true});
 mixer.result(g,'hit','b1','home');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(mixer.slots.home.id,preset);assert.equal(mixer.slots.home.source.loop,false);
 assert.equal(bytes,readFileSync(new URL('../dist/assets/audio/ctbc-brothers-hit.mp3',import.meta.url)).length);
 mixer.stop('home');mixer.result(g,'hit','f1','away');assert(!mixer.slots.away);
 settings.assignments['team:owls']={hit:'off'};mixer.result(g,'hit','b1','home');assert(!mixer.slots.home);
 settings.assignments['team:owls'].hit='preset:out';
 assert.equal(trackForEvent(settings,['hit'],['team:owls'],preset),'preset:out');
 assert(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8').includes("'./assets/audio/ctbc-brothers-hit.mp3'"));
}finally{globalThis.fetch=originalFetch}
console.log('PASS: CTBC Brothers default hit recording, unchanged MP3 fetch, one-shot playback, unrelated teams/cues and user overrides.');
