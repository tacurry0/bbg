// Only field poses are recorded. A replay never invokes the game simulation.
const copyField=f=>({
 ball:{...f.ball},fielders:f.fielders.map(p=>({...p})),runners:f.runners.map(r=>({...r})),
 throw:f.throw?{...f.throw,to:{...f.throw.to}}:null,
 manual:f.manual?{secured:f.manual.secured,holder:f.manual.holder,selection:null,userControlled:false}:null,
 trail:f.trail.slice(-14),foul:f.foul,resolved:f.resolved,wallHit:f.wallHit,trajectory:f.trajectory,
 maxTravel:f.maxTravel,landing:f.landing,landingTime:f.landingTime,elapsed:f.elapsed,impact:f.impact
});
const mix=(a,b,u)=>a+(b-a)*u;
const position=(a,b,u,ball=false)=>a?{...a,x:mix(a.x,b?.x??a.x,u),y:mix(a.y,b?.y??a.y,u),
 ...(ball?{z:mix(a.z,b?.z??a.z,u)}:{})}:a;

export class PlayReview {
 reset(){this.record=null;this.clip=null;this.playback=null;}
 constructor(){this.reset();}
 capture(game,final=false){
  const f=game.field;
  if(!f||f.foul||!['field','result'].includes(game.phase))return null;
  if(this.record?.field!==f){
   this.record={field:f,frames:[],score:game.homeScore+game.awayScore};
   this.clip=null;
  }
  const frames=this.record.frames,last=frames.at(-1);
  if(last&&f.elapsed-last.elapsed<1/24&&!final)return this.clip;
  const frame=copyField(f);
  if(final&&last&&frame.elapsed-last.elapsed<.001)frames[frames.length-1]=frame;
  else frames.push(frame);
  if(frames.length>385)frames.shift();
  if(final&&frames.length>1&&game.homeScore+game.awayScore>this.record.score){
   this.save(game,{frames,hit:{...game.hit}});
  }
  return this.clip;
 }
 save(game,recording){
  this.clip={game,...recording,teams:game.teams,lineups:game.lineups,bases:game.bases.slice(),
   half:game.half,inning:game.inning,outs:game.outs,homeScore:game.homeScore,awayScore:game.awayScore};
 }
 // Persist the in-progress play's frames as a reviewable clip even when it did
 // not score (used by base-call challenges, which review non-scoring plays).
 saveCurrentPlay(game){
  const rec=this.record;
  if(!rec||rec.field!==game.field||rec.frames.length<2)return false;
  this.save(game,{frames:rec.frames.slice(),hit:game.hit?{...game.hit}:undefined});
  return true;
 }
 captureWalk(game){
  this.save(game,{pitch:{...game.pitch}});
 }
 open(game,view='outfield'){
  const clip=this.clip;
  if(!clip||clip.game!==game)return false;
  const {pitch,frames}=clip;
  const projected=Object.create(game);
  Object.assign(projected,{phase:pitch?'pitch':'field',replayView:view,hit:clip.hit,teams:clip.teams,lineups:clip.lineups,
   field:pitch?null:{...frames[0]},pitch:pitch?{...pitch}:game.pitch,phaseTime:0,inning:clip.inning,half:clip.half,outs:clip.outs,
   homeScore:clip.homeScore,awayScore:clip.awayScore,bases:clip.bases,paused:true});
  const span=pitch?0:frames.at(-1).elapsed-frames[0].elapsed;
  this.playback={clip,projected,clock:0,index:0,wasPaused:game.paused,rate:Math.max(.82,span/3.4)};
  this.clip=null;
  game.paused=true;
  return true;
 }
 close(){
  if(this.playback)this.playback.clip.game.paused=this.playback.wasPaused;
  this.playback=null;
 }
 frame(dt){
  const replay=this.playback;
  if(!replay)return null;
  const {clip,projected}=replay;
  replay.clock+=Math.max(0,Math.min(200,dt))*.001*replay.rate;
  if(clip.pitch){
   const duration=clip.pitch.duration/1000,progress=replay.clock/duration;
   if(progress>1.24+.4/duration)return null;
   projected.pitch.progress=Math.min(1.24,progress);
   return {game:projected,time:replay.clock*1000};
  }
  const frames=clip.frames,last=frames.at(-1);
  const time=frames[0].elapsed+replay.clock;
  if(time>last.elapsed+.45*replay.rate)return null;
  while(replay.index<frames.length-1&&frames[replay.index+1].elapsed<=time)replay.index++;
  const a=frames[replay.index],b=frames[replay.index+1]||a;
  const u=a===b?0:Math.max(0,Math.min(1,(time-a.elapsed)/(b.elapsed-a.elapsed)));
  Object.assign(projected.field,a,{elapsed:Math.min(time,last.elapsed),
   ball:position(a.ball,b.ball,u,true),
   runners:a.runners.map((p,i)=>position(p,b.runners[i],u)),
   fielders:a.fielders.map((p,i)=>position(p,b.fielders[i],u)),
   resolved:a===last});
  return {game:projected,time:replay.clock*1000};
 }
}

export const CHALLENGES={
 gap:{title:'一塁から三塁へ',goal:'一塁走者を外野への打球で三塁まで進める',base:1,outs:0,park:'school-district-east'},
 tag:{title:'外野フライでタッチアップ',goal:'三塁走者を、フライ捕球後に本塁へ生還させる',base:3,outs:1,park:'tokyo-dome'},
 walkoff:{title:'前進守備を破る',goal:'同点の最終回。三塁走者を返してサヨナラ',base:3,outs:1,park:'school-district-west',defense:'in'}
};
export function challengeWon(id,field){
 const lead=(field?.runners||[]).find(r=>!r.batter);
 if(!lead||lead.out)return false;
 if(id==='gap')return !field.foul&&(lead.furthest??lead.base)>=3;
 if(id==='tag')return field.outcome==='flyout'&&lead.scored;
 return id==='walkoff'&&(!field.foul&&lead.scored||field.outcome==='hr');
}
export function hitReadout(hit){
 if(!Number.isFinite(hit?.exitKmh))return '';
 const {exitKmh,launchAngle,sprayAngle}=hit;
 const direction=Math.abs(sprayAngle)>45?(sprayAngle<0?'左ファウル':'右ファウル'):
  sprayAngle<=-32?'左翼':sprayAngle<=-13?'左中間':sprayAngle>=32?'右翼':sprayAngle>=13?'右中間':'中堅';
 return exitKmh+' km/h · '+launchAngle+'° · '+direction+(Number.isFinite(hit.spinBack)&&hit.spinBack>0?' · '+Math.round(hit.spinBack).toLocaleString('ja-JP')+'rpm':'');
}
