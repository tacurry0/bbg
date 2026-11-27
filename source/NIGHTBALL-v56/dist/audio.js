/* Recorded baseball foley, a quiet ballpark bed, and bounded Web Audio mixing.
   Recording credits and CC0 source links: assets/audio/credits.json. */
(()=>{
 'use strict';
 const FILES=['bat-1','bat-2','mitt-1','mitt-2','crowd-bed','crowd-cheer','swish'];
 class NightAudio{
  constructor(){
   this.context=null;this.buffers={};this.voices=new Set();this.lastVariant={};this.scene={enabled:true,active:false,volume:78,crowd:50,park:'night',cues:false};this.sceneKey='';this.bed=null;this.lastCheer=-100;this.disposed=false;this.excitement=0;this.bedGain=.26;this.atmosphere={attendance:1,pan:0,tempo:1};
   // Fetch early; decode once a user gesture creates the context. Works offline via the service worker.
   this.files=Promise.all(FILES.map(async id=>{try{const r=await fetch(`./assets/audio/${id}.mp3`);if(!r.ok)throw Error(r.status);return [id,await r.arrayBuffer()];}catch{return [id,null];}}));
  }
  unlock(){
   if(this.disposed)return;
   if(!this.context){
    try{
     const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
     const c=this.context=new Context({latencyHint:'interactive'});
     this.master=c.createGain();this.effects=c.createGain();this.crowd=c.createGain();this.compressor=c.createDynamicsCompressor();
     this.compressor.threshold.value=-15;this.compressor.knee.value=12;this.compressor.ratio.value=4;this.compressor.attack.value=.003;this.compressor.release.value=.16;
     this.effects.connect(this.master);this.crowd.connect(this.master);this.master.connect(this.compressor);this.compressor.connect(c.destination);
     this.reverb=c.createConvolver();this.wet=c.createGain();this.effects.connect(this.reverb);this.reverb.connect(this.wet);this.wet.connect(this.master);
     this.setPark(this.scene.park);this.sceneKey='';this.update(this.scene);
     this.ready=this.files.then(async files=>{await Promise.all(files.map(async([id,data])=>{if(data)try{this.buffers[id]=await c.decodeAudioData(data);}catch{}}));if(!this.disposed)this.updateBed();});
    }catch{this.context=null;return;}
   }
   if(this.context.state==='suspended')this.context.resume().catch(()=>{});
  }
  setPark(park){
   const c=this.context;if(!c)return;this.park=park;
   const dome=park==='dome',seconds=dome?1.35:.52,n=Math.ceil(c.sampleRate*seconds),ir=c.createBuffer(2,n,c.sampleRate);let seed=7319;
   for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);let smooth=0;for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;smooth=smooth*.58+((seed>>>0)/2147483648-1)*.42;a[i]=smooth*Math.exp(-i/(c.sampleRate*(dome?.26:.11)))*.30;if(i<c.sampleRate*.018)a[i]=0;}}
   this.reverb.buffer=ir;this.wet.gain.setTargetAtTime(dome?.14:.065,c.currentTime,.08);
  }
  update(scene){
   this.scene={...this.scene,...scene};const s=this.scene,key=[s.enabled,s.active,s.volume,s.crowd,s.park,s.cues].join('/');if(key===this.sceneKey)return;this.sceneKey=key;
   const c=this.context;if(!c)return;
   if(this.park!==s.park){this.setPark(s.park);this.stopBed();}
   const volume=Math.max(0,Math.min(100,Number(s.volume)||0))/100,crowd=Math.max(0,Math.min(100,Number(s.crowd)||0))/100;
   this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(s.enabled?volume*.82:0,c.currentTime,.012);
   this.crowd.gain.setTargetAtTime(crowd,c.currentTime,.06);
   if(!s.enabled||!s.active){this.stopBed();if(!s.enabled)this.stopEffects();}else this.updateBed();
   this.wasActive=s.active&&s.enabled;
  }
  variant(group){const n=this.lastVariant[group]===1?2:1;this.lastVariant[group]=n;return `${group}-${n}`;}
  sample(id,{gain=1,rate=1,pan=0,delay=0,crowd=false,duration,fade=.04,offset=0,loop=false}={}){
   const c=this.context,buffer=this.buffers[id];if(!c||!buffer||!this.scene.enabled||this.disposed)return null;
   if(this.voices.size>=12){const oldest=[...this.voices].find(v=>v!==this.bed);this.stopVoice(oldest);}
   const source=c.createBufferSource(),amp=c.createGain(),nodes=[source,amp];source.buffer=buffer;source.playbackRate.value=rate;source.loop=loop;
   source.connect(amp);let end=amp;
   if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));amp.connect(p);end=p;nodes.push(p);}
   end.connect(crowd?this.crowd:this.effects);
   const start=c.currentTime+delay,available=(buffer.duration-offset)/rate,length=duration?Math.min(duration,available):available;
   amp.gain.setValueAtTime(loop?0:gain,start);
   if(loop)amp.gain.linearRampToValueAtTime(gain,start+.7);
   else if(crowd){amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(gain,start+.16);amp.gain.setValueAtTime(gain,start+Math.max(.17,length-fade));amp.gain.linearRampToValueAtTime(0,start+length);}
   const voice={source,amp,nodes,loop};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);nodes.forEach(n=>{try{n.disconnect();}catch{}});};
   source.start(start,offset);if(!loop)source.stop(start+length+.01);return voice;
  }
  stopVoice(v){if(!v)return;try{v.source.stop();}catch{}this.voices.delete(v);v.nodes.forEach(n=>{try{n.disconnect();}catch{}});}
  stopEffects(){for(const v of [...this.voices])if(v!==this.bed)this.stopVoice(v);}
  setAtmosphere(a){if(!a)return;const changed=a.attendance!==this.atmosphere.attendance||a.reaction!==this.atmosphere.reaction;this.atmosphere=a;if(a.reaction==='review'&&this.cheerVoice){this.stopVoice(this.cheerVoice);this.cheerVoice=null;this.lastCheer=-100;}if(changed&&this.bed&&this.context)this.bed.amp.gain.setTargetAtTime(this.crowdBedLevel(),this.context.currentTime,.32);}
  crowdBedLevel(){const a=this.atmosphere;return this.bedGain*(.7+this.excitement*.8)*a.attendance*(a.reaction==='review'?.40:1);}
  updateBed(){if(this.scene.active&&this.scene.enabled&&this.scene.crowd>0&&!this.bed){this.bedGain=this.park?.startsWith('school-')?.13:.26;this.bed=this.sample('crowd-bed',{gain:this.crowdBedLevel(),crowd:true,loop:true});}if(this.scene.crowd===0)this.stopBed();}
  // Game-situation excitement (0..1) from NightGame.crowdExcitement: the
  // bed swells and every cheer gets louder as the game tightens.
  setExcitement(v){
   const x=Math.max(0,Math.min(1,Number(v)||0));
   if(Math.abs(x-this.excitement)<.04)return;
   this.excitement=x;
   if(this.bed&&this.context)this.bed.amp.gain.setTargetAtTime(this.crowdBedLevel(),this.context.currentTime,.4);
  }
  stopBed(){if(!this.bed)return;const v=this.bed;this.bed=null;this.stopVoice(v);}
  cheer(level=1,seconds=3,pan=this.atmosphere.pan,rate=1){
   const c=this.context;if(!c||!this.scene.enabled||!this.scene.crowd||!this.atmosphere.attendance)return;
   const scaled=Math.min(1.3,level*(0.72+this.excitement*.55)*this.atmosphere.attendance);
   // Replace a small reaction with a big one; never stack several crowd recordings.
   if(c.currentTime-this.lastCheer<.45&&scaled<=this.cheerLevel)return;
   if(this.cheerVoice)this.stopVoice(this.cheerVoice);
   this.lastCheer=c.currentTime;this.cheerLevel=scaled;
   this.cheerVoice=this.sample('crowd-cheer',{gain:scaled*.54,crowd:true,pan,rate:(.96+this.atmosphere.tempo*.04)*rate,duration:seconds,offset:Math.random()*.5,fade:Math.min(1.4,seconds*.55)});
  }
  noise(kind,gain=.2){
   const c=this.context;if(!c||!this.scene.enabled)return;
   const length=kind==='wall'?.21:kind==='bounce'?.115:.035,n=Math.ceil(c.sampleRate*length),buffer=c.createBuffer(1,n,c.sampleRate),a=buffer.getChannelData(0);
   let smooth=0;for(let i=0;i<n;i++){smooth=.68*smooth+.32*(Math.random()*2-1);a[i]=(smooth+(kind==='wall'?Math.sin(i/c.sampleRate*2*Math.PI*127)*.47:0))*Math.exp(-i/(c.sampleRate*(kind==='wall'?.043:kind==='bounce'?.018:.005)))*Math.min(1,i/20);}
   // Same bounded voice lifecycle as recordings, without caching throwaway buffers.
   this.buffers['transient']=buffer;this.sample('transient',{gain,rate:kind==='timing'?1.7:1});
  }
  // Accessibility audio cues (v131): short, quiet synthesized tones routed
  // through the effects bus, so the existing SE (sound) volume governs them.
  // Patterns are deliberately distinct in pitch and rhythm; they only sound
  // when the player turned the guide on (scene.cues, default off).
  cue(kind){
   const c=this.context;if(!c||!this.scene.enabled||!this.scene.cues||this.disposed||typeof c.createOscillator!=='function')return false;
   const patterns=NightAudio.CUES[kind];if(!patterns)return false;
   const now=c.currentTime;
   if(this.lastCueKind===kind&&now-this.lastCueAt<.12)return true; // collapse duplicate emissions of the same event
   this.lastCueKind=kind;this.lastCueAt=now;
   for(const [freq,delay,dur] of patterns){
    try{
     const osc=c.createOscillator(),amp=c.createGain();osc.type='sine';osc.frequency.value=freq;
     const start=now+delay;amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(.14,start+.012);amp.gain.setValueAtTime(.14,start+Math.max(.013,dur-.03));amp.gain.linearRampToValueAtTime(0,start+dur);
     osc.connect(amp);amp.connect(this.effects);osc.start(start);osc.stop(start+dur+.02);
    }catch{return false;}
   }
   return true;
  }
  play(name,detail={}){
   if(!this.context||!this.scene.enabled)return;
   const jitter=()=>.975+Math.random()*.05,pan=detail.hand==='L'?.16:-.16;
   switch(name){
    case'hit':case'perfect':this.sample(this.variant('bat'),{gain:name==='perfect'?.96:.76,rate:jitter(),pan});this.cheer(name==='perfect'?.30:.15,1.2,this.atmosphere.pan,1.07);break;
    case'flight':this.cheer(.32,2.1,this.atmosphere.pan,1.04);break;
    case'catch':this.sample(this.variant('mitt'),{gain:.74,rate:jitter(),pan:detail.pan||0});break;
    case'pickup':this.sample(this.variant('mitt'),{gain:.38,rate:.93*jitter(),pan:detail.pan||0});break;
    case'swing':this.sample('swish',{gain:.16,rate:1.75*jitter(),pan});break;
    case'pitch':this.sample('swish',{gain:.065,rate:2.2*jitter(),pan:.08});break;
    case'throw':this.sample('swish',{gain:.10,rate:2*jitter(),delay:.035,pan:detail.pan||0});break;
    case'bounce':this.noise('bounce',.28);break;
    case'wall':this.noise('wall',.45);this.cheer(.37,1.65);break;
    case'safe':this.cheer(.44,2.3);break;
    case'foul':this.cheer(Math.abs(detail.ballPan||0)>.35?.25:.12,1.2,detail.ballPan||this.atmosphere.pan,1.12);break;
    case'out':if(this.cheerLevel<.6&&this.cheerVoice){this.stopVoice(this.cheerVoice);this.lastCheer=-100;}this.cheer(.34,1.5,-this.atmosphere.pan,1.04);break;
    case'strike':this.cheer(.12,1,-this.atmosphere.pan);break;
    case'ball':break;
    case'homer':this.cheer(1.15,6.5,this.atmosphere.pan,.98);break;
    case'win':this.cheer(1.15,8);break;
    case'timing':this.noise('timing',.12);break;
    case'tap':this.noise('tap',.08);break;
   }
  }
 }
 NightAudio.CUES=Object.freeze({strike:[[880,0,.08]],ball:[[392,0,.09]],foul:[[587,0,.055],[587,.085,.055]],hit:[[659,0,.06],[988,.075,.09]],homer:[[659,0,.06],[880,.075,.06],[1319,.15,.11]],out:[[523,0,.06],[330,.075,.1]],safe:[[784,0,.06],[1047,.075,.09]]});
 NightAudio.FILES=FILES;window.NightAudio=NightAudio;
})();
