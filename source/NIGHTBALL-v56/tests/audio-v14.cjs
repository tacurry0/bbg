const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;
let fetches=0,decoded=0,starts=[],stops=0;
class Param{constructor(){this.value=1;}setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{constructor(){this.gain=new Param();this.pan=new Param();this.playbackRate=new Param();}connect(n){return n;}disconnect(){this.disconnected=true;}start(at,offset){starts.push({node:this,at,offset});}stop(){stops++;}}
class Context{constructor(){this.currentTime=1;this.sampleRate=22050;this.state='suspended';this.destination=new Node();}createGain(){return new Node();}createConvolver(){return new Node();}createBufferSource(){return new Node();}createStereoPanner(){return new Node();}createDynamicsCompressor(){const n=new Node();for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n;}createBuffer(ch,n,sr){return {duration:n/sr,length:n,getChannelData:()=>new Float32Array(n)};}async decodeAudioData(){decoded++;return {duration:10};}async resume(){this.state='running';}}
global.AudioContext=Context;global.fetch=async url=>{fetches++;assert(fs.existsSync('dist/'+url.slice(2)));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
vm.runInThisContext(fs.readFileSync('dist/audio.js','utf8'));
(async()=>{
 const a=new NightAudio();assert.equal(a.context,null);await a.files;assert.equal(fetches,7);a.unlock();await a.ready;assert.equal(decoded,7);assert.equal(a.context.state,'running');
 a.update({active:true,volume:50,crowd:35,enabled:true});assert(a.bed);assert(a.bed.source.loop);assert.equal(a.master.gain.value,.41);assert.equal(a.crowd.gain.value,.35);
 const original=a.bed;for(let i=0;i<40;i++)a.play('perfect');assert(a.voices.size<=12);assert(a.voices.has(original),'voice cap keeps ambience alive');assert.equal(a.bed,original);
 const outdoor=a.reverb.buffer.length;a.update({park:'dome'});assert(a.reverb.buffer.length>outdoor);a.play('catch');assert(starts.length>0);
 a.update({enabled:false});assert.equal(a.master.gain.value,0);assert.equal(a.voices.size,0);assert.equal(a.bed,null);const before=starts.length;a.play('hit');a.play('homer');assert.equal(starts.length,before);
 a.update({enabled:true,active:true,crowd:0});assert.equal(a.bed,null);a.play('hit');assert(a.voices.size>0);const crowdBefore=starts.length;a.cheer();assert.equal(starts.length,crowdBefore);
 a.update({crowd:50});assert(a.bed);a.update({active:false});assert.equal(a.bed,null);a.stopEffects();assert.equal(a.voices.size,0);assert(stops>0);
 a.update({volume:0});assert.equal(a.master.gain.value,0);a.update({volume:100});assert.equal(a.master.gain.value,.82);
 for(const file of ['ratings-data.js','players.js','pennant.js','game.js'])vm.runInThisContext(fs.readFileSync('dist/'+file,'utf8'));
 const events=[],g=new NightGame('match','standard',(type,value)=>{if(type==='sound')events.push(value);});g.beginHalf();g.throwPitch();g.pitch.isStrike=true;events.length=0;g.take();assert.equal(events.filter(x=>x==='catch').length,1);g.prepare();g.throwPitch();g.pitch.isStrike=false;events.length=0;g.take();assert.equal(events.filter(x=>x==='catch').length,1);
 g.startField(30,20,0,true);events.length=0;g.finishBall('single');assert(events.includes('safe'));assert(!events.includes('hit')&&!events.includes('perfect'),'no second bat crack on result');
 g.startField(30,30,0,true);events.length=0;g.finishBall('flyout');g.finishBall('flyout');assert.equal(events.filter(x=>x==='catch').length,1);assert(events.includes('out'));
 console.log('PASS: seven local recordings decode; gesture unlock, gain/mute, bounded voices, protected ambience, dome reverb, crowd-only mute, synchronized catches and no duplicate bat crack.');
})().catch(e=>{console.error(e);process.exitCode=1;});
