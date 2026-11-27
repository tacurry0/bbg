// Only field poses are recorded. A replay never invokes the game simulation.
const copyField=f=>({
 ball:{...f.ball},fielders:f.fielders.map(p=>({...p})),runners:f.runners.map(r=>({...r})),
 throw:f.throw?{...f.throw,to:{...f.throw.to}}:null,
 manual:f.manual?{secured:f.manual.secured,holder:f.manual.holder,selection:null,userControlled:false}:null,
 trail:f.trail.slice(-14),foul:f.foul,resolved:f.resolved,wallHit:f.wallHit,trajectory:f.trajectory,
 maxTravel:f.maxTravel,landing:f.landing,landingTime:f.landingTime,elapsed:f.elapsed,impact:f.impact,reviewMoment:f.reviewMoment?{...f.reviewMoment}:null
});
const mix=(a,b,u)=>a+(b-a)*u;
// Map wall time to recording time with the same slow-motion segment on
// both devices, independent of FPS or network arrival order.
export function replayClock(seconds,rate,slowFrom,slowTo){
 let left=Math.max(0,seconds),clock=0;
 const slow=Math.min(.52,rate);
 if(!Number.isFinite(slowFrom)||!Number.isFinite(slowTo))return left*rate;
 const before=Math.max(0,slowFrom),end=Math.max(before,slowTo);
 const first=before/rate;
 if(left<=first)return left*rate;
 left-=first;clock=before;
 const duration=(end-before)/slow;
 if(left<=duration)return clock+left*slow;
 return end+(left-duration)*rate;
}
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
  const highlight=final&&game.liveCutsEnabled&&['flyout','groundout','forceout','doubleplay'].includes(f.outcome)?(game.playEvents||[]).find(e=>e.type==='jump'||e.type==='dive'):null;
  if(final&&frames.length>1&&(game.homeScore+game.awayScore>this.record.score||highlight)){
   this.save(game,{frames,hit:{...game.hit},highlight:highlight?{fielder:highlight.fielder,time:highlight.time}:null});
  }
  return this.clip;
 }
 save(game,recording){
  this.clip={game,closeMoment:game.field?.reviewMoment?{...game.field.reviewMoment}:null,...recording,teams:game.teams,lineups:game.lineups,bases:game.bases.slice(),
   half:game.half,inning:game.inning,outs:game.outs,homeScore:game.homeScore,awayScore:game.awayScore};
 }
 // Persist the in-progress play's frames as a reviewable clip even when it did
 // not score (used by base-call challenges, which review non-scoring plays).
 saveCurrentPlay(game){
  const rec=this.record;
  if(!rec||rec.field!==game.field||!rec.frames.length)return false;
  const pose=copyField(game.field),frames=rec.frames.slice(),last=frames.at(-1);
  if(last&&pose.elapsed-last.elapsed<.001)frames[frames.length-1]=pose;else frames.push(pose);
  const call=game.baseCall,closeMoment=call?.pending?{base:call.base,time:call.time,runnerId:call.runnerId}:game.field.reviewMoment;
  const near=closeMoment?frames.filter(f=>f.elapsed>=closeMoment.time-1.35&&f.elapsed<=closeMoment.time+.35):frames;
  const clipFrames=near.length>=2?near:frames;
  if(clipFrames.length<2)return false;
  this.save(game,{frames:clipFrames,closeMoment,challenge:true,hit:game.hit?{...game.hit}:undefined});
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
  Object.assign(projected,{phase:pitch?'pitch':'field',replayView:view,replayCloseMoment:clip.closeMoment||null,replayChallenge:!!clip.challenge,replayHighlight:clip.highlight||null,hit:clip.hit,teams:clip.teams,lineups:clip.lineups,
   field:pitch?null:{...frames[0]},pitch:pitch?{...pitch}:game.pitch,phaseTime:0,inning:clip.inning,half:clip.half,outs:clip.outs,
   homeScore:clip.homeScore,awayScore:clip.awayScore,bases:clip.bases,paused:true});
  const span=pitch?0:frames.at(-1).elapsed-frames[0].elapsed;
  this.playback={clip,projected,clock:0,index:0,wasPaused:game.paused,rate:clip.challenge?.52:Math.max(.82,span/3.4)};
  this.clip=null;
  game.paused=true;
  return true;
 }
 close(){
  if(this.playback)this.playback.clip.game.paused=this.playback.wasPaused;
  this.playback=null;
 }
 frame(dt,now=performance.now()){
  const replay=this.playback;
  if(!replay)return null;
  const {clip,projected}=replay;
  const moment=clip.closeMoment,near=moment&&clip.frames&&Math.abs(clip.frames[0].elapsed+replay.clock-moment.time)<1.1;
  if(Number.isFinite(replay.syncStart)){
   const relative=moment&&clip.frames?moment.time-clip.frames[0].elapsed:NaN;
   replay.clock=replayClock((now-replay.syncStart)/1000,replay.rate,relative-1.1,relative+1.1);
  }else replay.clock+=Math.max(0,Math.min(200,dt))*.001*(near?Math.min(.52,replay.rate):replay.rate);
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
   runners:a.runners.map(p=>position(p,b.runners.find(q=>q.id===p.id),u)),
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
