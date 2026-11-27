const level=(n,fallback)=>Number.isFinite(Number(n))?Math.max(0,Math.min(100,Number(n))):fallback;
export const MUSIC_SLOTS={cheer:'打席の応援歌',chance:'チャンステーマ（二・三塁）',hit:'ヒットの曲',out:'アウトの曲',strikeout:'三振の曲',thirdOut:'3アウトの曲'};
const brass=[
 {id:'stadium',name:'スタンドマーチ',bpm:128,notes:[60,60,64,67,69,67,64,62,65,65,69,72,74,72,69,67]},
 {id:'rally',name:'チャンスコール',bpm:145,notes:[65,68,72,68,65,68,75,72,63,67,70,67,63,67,72,70]},
 {id:'clap',name:'クラップ応援',bpm:112,notes:[62,0,62,65,67,0,69,67,65,0,65,67,69,72,69,62]},
 {id:'out',name:'アウトファンファーレ',bpm:112,notes:[67,64,60,0,55,60,64,60]},
 {id:'strike',name:'三振コール',bpm:122,notes:[72,0,72,70,67,0,65,60]},
 {id:'taiwan-rally',name:'台湾風チャンス',bpm:152,notes:[67,67,0,72,74,72,69,0,67,69,72,76,74,72,69,0]},
 {id:'korea-rally',name:'韓国風チャンス',bpm:142,notes:[60,0,65,65,67,0,72,67,65,67,0,72,74,72,67,0]},
 {id:'japan-rally',name:'日本風チャンス',bpm:136,notes:[60,64,67,67,0,67,69,67,65,64,62,65,67,0,67,0]}
];
const NPB_TAIKO='preset:npb-taiko';
const BROTHERS_HIT='preset:ctbc-brothers-hit';
// Keep the tail of a hit cheer audible but well below the next plate appearance.
const HIT_DUCK_GAIN=.10,HIT_DUCK_TIME=.25;
const recordings={ [NPB_TAIKO]:'npb-taiko.mp3',[BROTHERS_HIT]:'ctbc-brothers-hit.mp3' };
export const PRESETS=[{id:NPB_TAIKO,name:'NPB 太鼓応援'},{id:BROTHERS_HIT,name:'我們兄弟（安打）'},...brass.map(({id,name})=>({id:'preset:'+id,name}))];
// No league or career batting song is assigned automatically. Imported and
// explicitly assigned songs still work; the ambient crowd and result cues
// remain separate from music.
export const DEFAULT_CAREER_CHEER=null;
export function defaultTeamCheer(){return null;}
export function defaultTeamResult(id,kind){
 return kind==='hit'&&['owls','brothers'].includes(id)?BROTHERS_HIT:null;
}
export function musicSettings(saved){
 const s=saved&&typeof saved==='object'?saved:{};
 return {cheer:level(s.cheer,64),results:level(s.results,62),overlap:level(s.overlap,30),
  assignments:s.assignments&&typeof s.assignments==='object'&&!Array.isArray(s.assignments)?s.assignments:{}};
}
export const teamMusicKey=id=>'team:'+id;
export const playerMusicKey=(team,id)=>'player:'+team+':'+id;
export const careerMusicKey=(seed,team=false)=>(team?'career-team:':'career:')+seed;
export function trackForEvent(music,slots,keys,fallback=null){
 for(const slot of slots)for(const key of keys){
  const track=music.assignments[key]?.[slot];
  if(track)return track==='off'?null:track;
 }
 return fallback;
}
export function trackFor(music,slot,keys){return trackForEvent(music,[slot],keys);}
const battingMusic=slot=>slot==='cheer'||slot==='chance';
export function gameMusicKeys(game,side,player){
 const team=game.teams[side],keys=[];
 const career=game.worldMusic||game.career;
 if(career&&side===game.userSide){
  if(player===career.playerId)keys.push(careerMusicKey(career.teamSeed));
  if(player)keys.push(playerMusicKey(team.id,player));
  keys.push(careerMusicKey(career.teamSeed,true));
 }else if(player)keys.push(playerMusicKey(team.id,player));
 if(!game.career||game.worldMusic||!team.scoreMark)keys.push(teamMusicKey(team.id));
 return keys;
}

function presetBuffer(context,id){
 const song=brass.find(s=>'preset:'+s.id===id);if(!song)return null;
 const rate=24000,step=30/song.bpm;
 const n=Math.round((song.notes.length+1)*step*rate),buffer=context.createBuffer(1,n,rate),data=buffer.getChannelData(0);
 let random=78231;
 song.notes.forEach((note,index)=>{
  const start=Math.floor(index*step*rate),hz=440*2**((note-69)/12),root=440*2**((song.notes[Math.floor(index/4)*4]-81)/12);
  const length=Math.round(step*rate);
  for(let i=0;i<length;i++){
   const t=i/rate,phase=2*Math.PI*hz*t;
   const envelope=Math.min(1,t/.018)*Math.min(1,(step-t)/.045)*Math.exp(-t*1.8);
   random=(Math.imul(random,1664525)+1013904223)>>>0;
   const noise=random/2147483648-1;
   const horn=note?(Math.sin(phase)+.30*Math.sin(2*phase)+.14*Math.sin(3*phase))*.24*envelope:0;
   const bass=(index%2===0?.14:.065)*Math.sin(2*Math.PI*root*t)*envelope;
   const drum=(index%2===0?.23*Math.sin(2*Math.PI*(81-90*t)*t):.14*noise)*Math.min(1,t/.003)*Math.exp(-t*32);
   data[start+i]+=horn+bass+drum;
  }
 });
 return buffer;
}
function balance(buffer){
 let sum=0,count=0,peak=0;
 for(let i=0;i<buffer.numberOfChannels;i++){
  const data=buffer.getChannelData(i),step=Math.max(1,Math.floor(data.length/24000));
  for(let j=0;j<data.length;j+=step){const x=Math.abs(data[j]);sum+=x*x;peak=Math.max(peak,x);count++;}
 }
 return Math.min(1.35,.20/Math.max(.03,Math.sqrt(sum/Math.max(1,count))),.88/Math.max(.10,peak));
}
export class SongVault{
 open(){
  if(!this.db)this.db=new Promise((resolve,reject)=>{
   if(!globalThis.indexedDB){reject(new Error('Storage unavailable'));return;}
   const request=indexedDB.open('nightball-music',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'id'});
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  }).catch(error=>{this.db=null;throw error;});
  return this.db;
 }
 async access(mode,operation){
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('tracks',mode),request=operation(tx.objectStore('tracks'));
   tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error||new Error('Storage unavailable'));
  });
 }
 get(id){return this.access('readonly',store=>store.get(id));}
 put(track){return this.access('readwrite',store=>store.put(track));}
 remove(id){return this.access('readwrite',store=>store.delete(id));}
 async list(){
  return (await this.access('readonly',store=>store.getAll())).map(({id,name})=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));
 }
}

export class BallparkMusic{
 constructor(audio,vault){this.audio=audio;this.vault=vault;this.buffers=new Map();this.slots={};}
 async buffer(id){
  const c=this.audio.context;if(!c)return null;
  if(!this.buffers.has(id)){
   const task=(async()=>{
    if(Object.hasOwn(recordings,id)){
     const response=await fetch(new URL('./assets/audio/'+recordings[id],import.meta.url));
     if(!response.ok)throw new Error('Team cheer audio unavailable');
     return c.decodeAudioData(await response.arrayBuffer());
    }
    if(id.startsWith('preset:'))return presetBuffer(c,id);
    const track=await this.vault.get(id);
    return track?await c.decodeAudioData(await track.file.arrayBuffer()):null;
   })();
   this.buffers.set(id,task.catch(()=>{this.buffers.delete(id);return null;}));
   if(this.buffers.size>10)this.buffers.delete(this.buffers.keys().next().value);
  }
  return this.buffers.get(id);
 }
 stop(slot){
  const old=this.slots[slot];delete this.slots[slot];
  if(!old?.source)return;
  const now=this.audio.context.currentTime;
  old.gain.gain.setTargetAtTime(0,now,.028);
  try{old.source.stop(now+.12);}catch{}
 }
 reset(){
  this.game=null;this.atBat=null;this.atBatSide=null;this.pageActive=false;this.cheerTrack=null;
  this.stop('home');this.stop('away');
 }
 async start(slot,id,loop=false,atBat=null,resultKind=null){
  this.stop(slot);
  if(!id||!this.audio.context)return false;
  const request={id,loop,atBat,resultKind};this.slots[slot]=request;
  const buffer=await this.buffer(id);
  if(this.slots[slot]!==request)return false;
  if(!buffer){request.missing=true;return false;}
  const c=this.audio.context,source=c.createBufferSource(),gain=c.createGain();
  Object.assign(request,{source,gain,factor:balance(buffer)});
  source.buffer=buffer;source.loop=loop;source.connect(gain);gain.connect(this.audio.master);
  gain.gain.setValueAtTime(0,c.currentTime);
  source.onended=()=>{
   if(this.slots[slot]===request)delete this.slots[slot];
   source.disconnect();gain.disconnect();
  };
  this.mix();
  source.start();
  return true;
 }
 mix(){
  const s=this.settings;if(!s)return;
  const audible=this.enabled&&this.pageActive,now=this.audio.context?.currentTime;
  for(const [side,request] of Object.entries(this.slots)){
   const overlap=this.atBat&&side!==this.atBatSide&&request.atBat!==this.atBat?s.overlap/100:1;
   const ducked=side!=='preview'&&request.resultKind==='hit'&&request.ducked;
   const level=side==='preview'?
    (this.enabled?s[battingMusic(this.previewKind)?'cheer':'results']/100*(this.previewQuiet?s.overlap/100:1):0):
    audible?s[request.loop?'cheer':'results']/100*(ducked?Math.min(overlap,HIT_DUCK_GAIN):overlap):0;
   const gain=level*request.factor;
   if(!request.gain||request.volume===gain)continue;
   request.volume=gain;request.gain.gain.setTargetAtTime(gain,now,ducked&&audible?HIT_DUCK_TIME:.055);
  }
 }
 update(game,settings,enabled,active){
  if(this.game!==game){this.reset();this.game=game;}
  this.settings=settings;this.enabled=enabled;this.pageActive=active;
  const newPlate=game&&!game.batFinished&&['aim','windup','pitch','miss','field'].includes(game.phase)&&game.outs<3;
  if(newPlate){
   const side=game.side,key=[game.inning,game.half,game.battingIndex[side],game.batter.id,game.box?.[game.batter.id]?.pa,game.derby?.turn].join('/');
   // Once the next batter is up, latch the quieter volume even if no
   // batting song is assigned. Do not bring the old hit cue back up later.
   for(const slot of ['home','away']){
    const previous=this.slots[slot];
    if(previous?.resultKind==='hit'&&previous.atBat!==key)previous.ducked=true;
   }
   const chance=game.bases?.[1]||game.bases?.[2];
   const fallback=defaultTeamCheer(game.teams[side]?.id,chance)||(game.worldMusic&&side===game.userSide?DEFAULT_CAREER_CHEER:null);
   const track=trackForEvent(settings,chance?['chance','cheer']:['cheer'],gameMusicKeys(game,side,game.batter.id),fallback);
   if(this.atBat!==key||this.cheerTrack!==track){
    this.atBat=key;this.atBatSide=side;this.cheerTrack=track;
    if(this.slots[side]?.loop)this.stop(side);
   }
   const current=this.slots[side];
   if(track&&enabled&&active&&(!current||current.loop&&current.id!==track||!current.loop&&current.atBat!==key)){
    this.start(side,track,true,key);
   }
  }else if(!game||game.batFinished||game.outs>=3||['change','career-ready','ended','derby-break'].includes(game.phase)){
   for(const side of ['home','away'])if(this.slots[side]?.loop)this.stop(side);
   this.atBat=null;this.atBatSide=null;this.cheerTrack=null;
  }
  this.mix();
 }
 result(game,kind,player,side=kind==='hit'?game.side:game.side==='home'?'away':'home',thirdOut=false){
  if(!this.enabled||!this.pageActive||game!==this.game||!this.audio.context)return;
  const id=trackForEvent(this.settings,thirdOut?['thirdOut',kind]:[kind],gameMusicKeys(game,side,player),defaultTeamResult(game.teams[side]?.id,kind));
  if(!id)return;
  // A later cue replaces the previous sound only for the team that owns it.
  this.start(side,id,false,this.atBat,kind);
 }
 preview(id,slot,quiet=false){
  this.previewKind=slot;this.previewQuiet=quiet;
  return this.start('preview',id);
 }
}
