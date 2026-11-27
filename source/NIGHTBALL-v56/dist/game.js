/* NIGHTBALL 2: cursor batting, pitch movement, live ball and fielding simulation. */
(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TYPES=[
 {id:'fast',name:'ストレート',short:'直球',speed:148,bx:0,by:-.10,cost:1.2,spin:2250},
 {id:'slider',name:'スライダー',short:'スライダー',speed:129,gap:13,bx:.85,by:.13,cost:1.8,spin:2450},
 {id:'curve',name:'カーブ',short:'カーブ',speed:108,gap:26,bx:-.50,by:.95,cost:1.7,spin:2350},
 {id:'fork',name:'フォーク',short:'フォーク',speed:129,gap:14,bx:.04,by:1.15,cost:2.2,spin:1050},
 {id:'sinker',name:'シンカー',short:'シンカー',speed:126,gap:12,bx:-.72,by:.64,cost:1.8,spin:1850},
 // v187 direction audit: the changeup fades ARM-side like the sinker /
 // shoot family (a right-hander's change drops down-left from the
 // batter's view); it previously carried bx +.20, the glove side, so
 // it bent the same way as the slider — the odd one out in the table.
 // Sign only: |bx| and by are unchanged, so the v183 break magnitude
 // (hypot x1.30) is untouched.
 {id:'change',name:'チェンジアップ',short:'チェンジ',speed:108,gap:24,bx:-.20,by:.46,cost:1.4,spin:1550},
 {id:'cutter',name:'カットボール',short:'カット',speed:141,gap:7,bx:.42,by:.08,cost:1.6,spin:2150},
 {id:'shoot',name:'シュート',short:'シュート',speed:139,gap:8,bx:-.56,by:.16,cost:1.7,spin:2000},
 {id:'split',name:'スプリット',short:'スプリット',speed:135,gap:10,bx:.02,by:.85,cost:2,spin:1200},
 {id:'vslider',name:'縦スライダー',short:'縦スラ',speed:125,gap:15,bx:.22,by:1.08,cost:2,spin:2400},
 {id:'slowcurve',name:'スローカーブ',short:'スローカーブ',speed:93,gap:34,bx:-.72,by:1.32,cost:1.5,spin:2050},
 {id:'knuckle',name:'ナックル',short:'ナックル',speed:100,gap:30,bx:.32,by:.38,cost:1.6,spin:300},
 {"id":"twoseam","name":"ツーシーム","short":"ツーシーム","speed":144,"gap":4,"bx":-0.52,"by":0.25,"cost":1.5,"spin":1950},
 {"id":"sweeper","name":"スイーパー","short":"スイーパー","speed":128,"gap":15,"bx":1.12,"by":0.16,"cost":1.8,"spin":2400},
 {"id":"knucklecurve","name":"ナックルカーブ","short":"ナックルC","speed":116,"gap":23,"bx":-0.34,"by":1.05,"cost":1.8,"spin":2500},
 {"id":"slurve","name":"スラーブ","short":"スラーブ","speed":118,"gap":20,"bx":0.62,"by":0.81,"cost":1.8,"spin":2350},
 {"id":"powercurve","name":"パワーカーブ","short":"パワーC","speed":124,"gap":18,"bx":-0.31,"by":0.87,"cost":1.8,"spin":2450},
 {"id":"screw","name":"スクリュー","short":"スクリュー","speed":121,"gap":16,"bx":-0.78,"by":0.63,"cost":1.8,"spin":1900},
 {"id":"oneseam","name":"ワンシーム","short":"ワンシーム","speed":144,"gap":4,"bx":-0.46,"by":0.39,"cost":1.6,"spin":1900},
 {"id":"palm","name":"パーム","short":"パーム","speed":113,"gap":25,"bx":-0.16,"by":0.9,"cost":1.5,"spin":1300},
 {"id":"slowball","name":"スローボール","short":"スロー","speed":90,"gap":35,"bx":0,"by":0.15,"cost":1.4,"spin":1250}
];
const POS=[['P',0,18.4],['C',0,-2],['1B',23,24],['2B',12,36],['SS',-13,36],['3B',-23,24],['LF',-45,74],['CF',0,88],['RF',45,74]];
const BASES=[{x:0,y:0},{x:19.4,y:19.4},{x:0,y:38.8},{x:-19.4,y:19.4},{x:0,y:0}];
const COVER=[[],[2,0,3],[3,4,0],[5,4,0],[1,0,2]];
const BAG_REACH=.48;
const BASE_PATH=27.44;
// Review only genuinely tight arrivals; error chance falls to zero at 0.16 s.
const BASE_REVIEW_WINDOW=.16;
const baseErrorRate=gap=>.16*Math.max(0,1-Math.abs(gap)/BASE_REVIEW_WINDOW);
const FIELD_READ_DELAY=.20;
// Preserve calibrated first flight; ground contact depends on the playing surface.
function fieldSurface(park,x,y){
 const spec=park?.customSpec;if(spec?.surface)return spec.surface;
 if(park?.theme==='dome')return 'artificial';
 if(park?.theme==='school-yard')return 'dirt';
 return Math.hypot(x,y)<42&&Math.abs(Math.abs(x)+y-38.8)<5?'dirt':'natural';
}
function groundFactors(park,b){
 const surface=fieldSurface(park,b.x,b.y);
 return {roll:surface==='artificial'?1.13:surface==='dirt'?.94:1,bounce:surface==='artificial'?1.10:surface==='dirt'?.94:1,wet:!!b.wetField,irregular:surface==='dirt'?1.25:surface==='artificial'?.65:1};
}
function fielderTravel(p,speed,t){
 return speed*Math.max(0,t-Math.min(t,.13)*(1-clamp((p.moveSpeed||0)/Math.max(.1,speed),0,1))*.5);
}
function fielderETA(p,target,speed,reach=0){
 const d=Math.max(0,dist(p,target)-reach),t=d/Math.max(.1,speed);
 return t+Math.min(.10,t*.16)*(1-clamp((p.moveSpeed||0)/Math.max(.1,speed),0,1));
}
function moveFielder(p,target,speed,dt){
 const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
 if(d<.002){p.moveSpeed=0;p.running=false;return;}
 const ux=dx/d,uy=dy/d,dot=p.moveX==null?1:clamp(p.moveX*ux+p.moveY*uy,-1,1);
 let v=p.moveSpeed??speed*.56;
 if(dot<.15)v*=.72;
 const desired=Math.min(speed,Math.max(speed*.56,Math.sqrt(2*32*d)));
 v=clamp(desired,Math.max(0,v-42*dt),v+(35+(p.runRating??70)*.18)*dt);
 const step=Math.min(d,Math.max(0,v)*dt);
 p.x+=ux*step;p.y+=uy*step;p.moveX=ux;p.moveY=uy;p.moveSpeed=step>=d-.002?0:v;
 p.running=d-step>.10&&v>.8;
}
function reflectFence(b,park,angle,wall){
 const slope=(NightPlayers.wallDistance(park,angle+.006)-NightPlayers.wallDistance(park,angle-.006))/.012;
 const tx=slope*Math.sin(angle)+wall*Math.cos(angle),ty=slope*Math.cos(angle)-wall*Math.sin(angle);
 const len=Math.hypot(tx,ty)||1,nx=-ty/len,ny=tx/len;
 const vn=b.vx*nx+b.vy*ny,vtX=b.vx-vn*nx,vtY=b.vy-vn*ny;
 const e=clamp(park?.customSpec?.wallRebound??.25,.08,.65);
 b.vx=vtX*.65-Math.abs(vn)*e*nx;b.vy=vtY*.65-Math.abs(vn)*e*ny;
 const radial=b.vx*Math.sin(angle)+b.vy*Math.cos(angle);
 if(radial>-.15){b.vx-=(radial+.15)*Math.sin(angle);b.vy-=(radial+.15)*Math.cos(angle);}
}
function fieldErrorChance(p,difficulty,wet=false){
 const skill=clamp(p.catchRating??p.fieldRating??70,20,99);
 return clamp((.002+Math.max(0,85-skill)*.00125)*difficulty*(wet?1.35:1),0,.12);
}

const legSpeed=(runner,target)=>runner.speed*(runner.batter&&target===2?1.10:1);
const runTime=(runner,base,progress=runner.progress)=>Math.abs(base-progress)*BASE_PATH/legSpeed(runner,base);
const catchReach=player=>player.catchReach??Math.min(1.15,player.reach);
const gloveHeight=player=>1.85+catchReach(player)*.22;
const athleticReach=player=>clamp(((player.fieldRating??0)-25)/75,0,1);
const SPECIAL_LABELS={dive:['DIVING CATCH','ダイビングキャッチ'],jump:['JUMPING CATCH','ジャンピングキャッチ'],wall:['GREAT CATCH','フェンス際の好捕'],robbery:['HOME RUN ROBBERY','ホームラン阻止'],stop:['DIVING STOP','ダイビングストップ'],laser:['LASER BEAM','レーザービーム']};
function specialFieldChance(p,difficulty=1,wet=false){
 const rating=clamp(p.fieldRating??70,0,100),tiers=[[0,.02],[20,.02],[30,.05],[40,.10],[50,.20],[60,.30],[70,.45],[80,.60],[90,.75],[100,.82]];
 let chance=.02;for(let i=1;i<tiers.length;i++){if(rating<=tiers[i][0]){const [lo,a]=tiers[i-1],[hi,b]=tiers[i];chance=a+(b-a)*(rating-lo)/(hi-lo);break;}}
 return clamp(chance*(.85+.15*clamp((p.runRating??70)/70,.65,1.35))*(1+(p.condition||0)*.045)*(wet?.84:1)/Math.max(.65,difficulty),.01,.86);
}
const RUNNER_SPEED=rating=>5.5+rating*.028;
function catchType(player,ball,distance,special=true){
 if(distance<=catchReach(player)&&ball.z<=gloveHeight(player))return 'catch';
 const skill=special?athleticReach(player):0;
 if(!skill)return null;
 if(ball.z>=1.55&&distance<=catchReach(player)+.25&&ball.z<=gloveHeight(player)+.95*skill)return 'jump';
 if(ball.z<=1.38&&distance<=catchReach(player)+.95*skill)return 'dive';
 return null;
}
// Magnus effect of batted-ball spin (v107 physics): backspin (rpm) lifts the
// ball against gravity; side spin (rpm, signed) curves it sideways in flight.
// The coefficients are far below real-world Magnus values on purpose: this
// engine's flight is already compressed/stylised (flightRate/flightLift),
// and paired-seed measurement showed the fence-distance population is very
// sensitive to carry, so spin is scaled to a visible-but-modest effect.
// v108 rebalance: at the v107 lift (.00003) the well-hit fly band gained
// +0.45 m of carry, +2.3 pt of extra-base rate and +0.3 pt of home-run rate
// versus the pre-physics engine (paired fixed-seed flight probe, N=2000,
// dt=1/120). The lift coefficient is cut to .000004 so the band rates return
// to the pre-physics baseline (same probe: HR 4.10% vs 4.15%, XBH 49.05% vs
// 48.85%, carry +0.06 m). The spin derivation and the rpm readouts are
// unchanged; only the lift's effect size is rebalanced.
const MAGNUS_LIFT=.000004,MAGNUS_SIDE=.0006;
// Wind coupling (v168, checker item wind-carry-overeffect): wind used to be
// added as a constant acceleration (vy += wind*dt) regardless of ball speed,
// which measured +31.1 m of extra carry for a +5 tailwind on the reference
// fly (44 m/s, 32 deg, calm carry 109.4 m) — roughly 3-4x the real-world
// effect of an 18 km/h tailwind (+5..9 m) and enough to tilt whole games.
// Wind now acts through the relative air velocity, like the flight drag
// itself: the per-step gain is wind*WIND_COUPLING*step. Paired probe with
// the reference fly: +5 -> +6.2 m, +3 -> +3.7 m, -5 -> -6.2 m, and a weak
// 25 m/s pop-up drifts 5.5 m at +5 instead of being shoved uniformly.
const WIND_COUPLING=.2;
function moveBattedBall(b,dt,wind,park){
 const spec=park?.customSpec,roll=(spec?.roll??1)*(spec?.surface==='artificial'?1.16:spec?.surface==='dirt'?.84:1),bounce=(spec?.bounce??1)*(spec?.surface==='artificial'?1.14:spec?.surface==='dirt'?.88:1);
 const airborne=!b.bounces&&(b.z>.1||b.vz>0),surface=b.realGround?groundFactors(park,b):null;
 // Compress and lower the first flight, keeping its horizontal carry. Ground
 // rolls, bounces and throws still run at their normal speed.
 const step=airborne?dt*(b.flightRate??1):dt,groundDrag=!airborne&&Math.hypot(b.x,b.y)>54?.32:.85,drag=Math.max(0,1-(airborne?.15:groundDrag/(surface&&!spec?.surface?roll*surface.roll:roll)*(surface?.wet?1.10:1))*step);
 b.vx=(b.vx+(typeof wind==='object'?wind.x:0)*WIND_COUPLING*step)*drag;b.vy=(b.vy+(typeof wind==='object'?wind.y:wind)*WIND_COUPLING*step)*drag;
 b.vz-=(airborne?11.25*(b.flightLift??1):9.81)*step;
 if(airborne&&b.vz>0)b.vz*=Math.max(0,1-.10*step);
 if(airborne){
  // Spin acts only in flight; the contact-time spray model is untouched.
  if(b.spinBack)b.vz+=b.spinBack*MAGNUS_LIFT*step;
  if(b.spinSide){const sp=Math.hypot(b.vx,b.vy);if(sp>1){const acc=b.spinSide*MAGNUS_SIDE*step/sp,ax=-b.vy*acc,ay=b.vx*acc;b.vx+=ax;b.vy+=ay;}}
 }
 b.x+=b.vx*step;b.y+=b.vy*step;b.z+=b.vz*step;
 if(spec&&park.roofHeight&&b.vz>0){const roof=NightPlayers.roofSurface(park,b.x,b.y);if(b.z>=roof){b.z=roof-.05;b.vz*=-.48;}}
 if(b.z>=0)return false;
 const impact=b.vz<-1.8;
 b.z=0;
 if(b.bounces===0||impact)b.bounces++;
 b.vz*= -.37*bounce*(surface&&!spec?.surface?surface.bounce:1)*(surface?.wet?.94:1);
 if(surface&&impact){const speed=Math.hypot(b.vx,b.vy),spin=clamp((b.spinSide||0)/1500,-1,1),kick=spin*Math.min(.65,speed*.018);if(speed>.1){b.vx-=b.vy/speed*kick;b.vy+=b.vx/speed*kick;}const loss=clamp(.985-(b.spinBack||0)*.000007-(surface.wet?.015:0),.94,.99);b.vx*=loss;b.vy*=loss;}
 if(b.vz<1.5)b.vz=0;
 return impact;
}
const FLY_LEAD=.045; // Catchable flies: wait nearly on the bag, ready to tag after the catch
const outfieldPickup=(fielder,point)=>fielder>=6||Math.hypot(point.x,point.y)>54;
let conditionGameSerial=0;
const conditions=[
 {label:'絶不調',color:'#576feb',mouth:'M7 17Q12 12 17 17'},
 {label:'不調',color:'#5ad4fe',mouth:'M8 17Q12 14 16 17'},
 {label:'普通',color:'#ffcb47',mouth:'M8 16H16'},
 {label:'好調',color:'#ff9259',mouth:'M7 14Q12 21 17 14'},
 {label:'絶好調',color:'#ff70c4',mouth:'M6 13H18Q17 20 12 20T6 13Z'}
];
window.NightGame=class NightGame{
 static ballVisualScale(height,distance){
  return 1.22/(1+Math.max(0,height-1)*.032+Math.max(0,distance-12)*.003);
 }
 static conditionInfo(level=0){return conditions[clamp(Math.round(Number(level)||0),-2,2)+2];}
 // Shared by the pregame lineup and the live game. The original odds
 // and explicit player.gameCondition override are deliberately unchanged.
 static conditionForSeed(seed,player){
  if(Number.isFinite(player?.gameCondition))return player.gameCondition;
  if(!player?.id||seed==null)return 0;
  const key=seed+'/'+player.id;
  let hash=2166136261;
  for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
  const roll=(hash>>>0)%100;
  return roll<7?-2:roll<25?-1:roll<75?0:roll<93?1:2;
 }
 // v200: visual/gameplay delivery presets. Unverified roster entries use
 // deterministic simulated forms, not assertions about real athletes.
 static PITCH_FORMS=Object.freeze({
  overhand:Object.freeze({x:.76,h:2.10,lift:.48,cockX:.38,cockY:1.35,lean:.03}),
  threequarter:Object.freeze({x:.96,h:1.86,lift:.42,cockX:.48,cockY:1.18,lean:.10}),
  sidearm:Object.freeze({x:1.34,h:1.45,lift:.34,cockX:.67,cockY:.90,lean:.22}),
  submarine:Object.freeze({x:1.16,h:.62,lift:.30,cockX:.58,cockY:.50,lean:.34})
 });
 static pitchingForm(pitcher){
  const supplied=pitcher?.pitchingForm;
  if(typeof supplied==='string'&&Object.hasOwn(NightGame.PITCH_FORMS,supplied))return supplied;
  if(!pitcher?.id)return 'overhand';
  let h=2166136261;for(const ch of String(pitcher.id))h=Math.imul(h^ch.charCodeAt(0),16777619);
  const n=(h>>>0)%100;
  return n<62?'overhand':n<87?'threequarter':n<98?'sidearm':'submarine';
 }
 static delivery(pitcher,fromSet=false,derby=false){
  const form=derby?'overhand':NightGame.pitchingForm(pitcher),preset=NightGame.PITCH_FORMS[form];
  return {form,fromSet:!derby&&!!fromSet,windupMs:derby?270:fromSet?490:700,releaseX:(pitcher?.hand==='L'?1:-1)*preset.x/.68,releaseY:(2.10-preset.h)/.62};
 }
 // v202: animation-only batting styles; ratings and swing judgment are unchanged.
 // Explicit battingForm is authoritative. The stable ID fallback is fictional.
 static BAT_FORMS=Object.freeze({
  standard:Object.freeze({stance:0,width:1,lift:.09,loadStart:.45,stride:.28,batTilt:-.18,batHeight:.87,crouch:0,turn:.65,finish:1.45}),
  open:Object.freeze({stance:-.34,width:1.18,lift:.13,loadStart:.39,stride:.32,batTilt:-.30,batHeight:.91,crouch:.015,turn:.87,finish:1.52}),
  closed:Object.freeze({stance:.27,width:1.05,lift:.08,loadStart:.42,stride:.23,batTilt:.06,batHeight:.91,crouch:.025,turn:.74,finish:1.36}),
  legkick:Object.freeze({stance:0,width:.90,lift:.31,loadStart:.24,stride:.39,batTilt:-.08,batHeight:1.00,crouch:0,turn:.82,finish:1.58}),
  nostride:Object.freeze({stance:-.08,width:1.38,lift:.018,loadStart:.58,stride:.065,batTilt:-.45,batHeight:.79,crouch:.085,turn:.58,finish:1.28}),
  upright:Object.freeze({stance:.08,width:.87,lift:.12,loadStart:.37,stride:.25,batTilt:.14,batHeight:1.03,crouch:0,turn:.70,finish:1.40})
 });
 static battingForm(batter){
  if(typeof batter?.battingForm==='string'&&Object.hasOwn(NightGame.BAT_FORMS,batter.battingForm))return batter.battingForm;
  if(!batter?.id)return 'standard';
  let h=2166136261;for(const c of 'bat/'+String(batter.id))h=Math.imul(h^c.charCodeAt(0),16777619);
  const n=(h>>>0)%100;
  return n<34?'standard':n<52?'open':n<63?'closed':n<80?'legkick':n<92?'nostride':'upright';
 }
 static battingMotion(form,progress=0,swing=0,active=false){
  const f=NightGame.BAT_FORMS[form]||NightGame.BAT_FORMS.standard;
  const load=clamp((progress-f.loadStart)/Math.max(.1,.89-f.loadStart),0,1);
  const u=clamp(swing,0,1),step=active?Math.sin(u*Math.PI*.76):0;
  return {load:active?0:load,step,u,stance:f.stance,width:f.width,lift:f.lift*(active?Math.max(0,1-u*5)*load:Math.sin(load*Math.PI*.82)),stride:f.stride,batTilt:f.batTilt,batHeight:f.batHeight,crouch:f.crouch,turn:f.turn,finish:f.finish};
 }
 // v203: presentation only. A player's stable ID gives a distinct gait,
 // while ratings shape the animation without changing simulated speed.
 static movementStyle(player){
  let h=2166136261;for(const c of String(player?.id??player?.name??player?.no??'default'))h=Math.imul(h^c.charCodeAt(0),16777619);
  const n=(h>>>0),kind=n%3,run=clamp(Number(player?.run)||65,0,100),field=clamp(Number(player?.field)||65,0,100);
  return {cadence:[1.15,1,.89][kind],stride:[.86,1,1.14][kind],arm:[1.16,1,.87][kind],lean:.12+run*.001,ready:.035+field*.001,phase:(n%97)/97*Math.PI*2,slide:(n>>>5)%2?'head':'feet',celebration:['fist','point','clap','quiet'][(n>>>8)%4]};
 }
 static actionEnvelope(age,duration){
  if(!Number.isFinite(age)||age<0||age>=duration||duration<=0)return 0;
  return Math.sin(Math.PI*age/duration);
 }
 // v204: count, plate history and batter profile inform probabilistic CPU
 // choices. Only completed pitches are used to predict the next delivery.
 static cpuDiscipline(batter){
  const s=batter?.stats||{},pa=Number(s.pa)||0,weight=pa/(pa+80);
  const bb=Number.isFinite(s.bb)&&pa>0?s.bb/pa:.085,k=pa>0&&Number.isFinite(s.so??s.k)?(s.so??s.k)/pa:.18;
  return {walk:clamp(.085+(bb-.085)*weight,.025,.22),strikeout:clamp(.18+(k-.18)*weight,.06,.38)};
 }
 static cpuPitchWeight(id,ctx){
  const {balls=0,strikes=0,recent=[],power=65,discipline=.085,risp=false,lateClose=false,control=70}=ctx;
  const last=recent.at(-1),repeat=recent.filter(p=>p.id===id).length,drop=['fork','split','change','vslider','curve','slowcurve','knucklecurve','powercurve','sinker','screw'].includes(id);
  const fast=['fast','twoseam','cutter','shoot','oneseam'].includes(id);
  let w=1;
  if(strikes===2&&balls<3&&drop)w*=1.30;
  if(balls===3&&fast)w*=1.30;
  if(last?.id===id)w*=repeat>=2?.50:.78;
  if(last?.id==='fast'&&drop)w*=1.22;
  if(last&&['fork','split','change','curve','slowcurve'].includes(last.id)&&fast)w*=1.22;
  if(power>=80&&risp&&fast)w*=.86;
  if(lateClose&&control<60&&balls>=2&&drop)w*=.78;
  if(discipline>=.13&&strikes<2&&fast)w*=1.10;
  return w;
 }
 static cpuSwingOdds(ctx){
  const {balls=0,strikes=0,edge=0,isStrike=true,walk=.085,contact=65,repeat=0,locationRepeat=0,breakAmount=0}=ctx;
  const ag=strikes===2?.86:strikes===1?.61:.40;
  const anticipation=Math.min(.12,repeat*.027+locationRepeat*.018);
  const strike=clamp(ag+anticipation-(edge>.78?.09:0)+(balls===3?(strikes===2?.04:-.15):balls===2&&strikes===0?-.07:0)-walk*.38,.18,.95);
  const chase=clamp((strikes===2?.32:.17)-Math.max(0,edge-1.06)*.43+(80-contact)*.0015-walk*.70+Math.min(.045,breakAmount*.025)+anticipation*.30-(balls===3?.07:0),.015,.40);
  return isStrike?strike:chase;
 }
 static crowdOptions=['full','high','medium','low','empty','auto'];
 static crowdLeague(id){return id?.startsWith('npb-')||id==='apbc-japan'?'npb':id?.startsWith('kbo-')||id==='apbc-korea'?'kbo':id?.startsWith('apbc-')?'international':'cpbl';}
 static crowdAttendance(g){
  if(g?.derby)return 1;
  const mode=g?.crowdAttendanceMode||(g?.mode==='match'&&!g?.career?'full':'auto');
  const levels={full:1,high:.75,medium:.50,low:.25,empty:0};
  if(Object.hasOwn(levels,mode))return levels[mode];
  if(!g)return 1;
  if(g.apbcFinal||g.npbPostseason||g.crowdPostseason)return .98;
  let h=2166136261;for(const c of (g.conditionSeed||'')+'/'+(g.teams?.home?.id||'')+'/'+(g.teams?.away?.id||'')+'/'+(g.park?.id||''))h=Math.imul(h^c.charCodeAt(0),16777619);
  const unit=(h>>>0)%1000/999,weekend=g.crowdWeekend??((h>>>0)%7>=5),rank=g.crowdRankBoost||0;
  const base=g.park?.school?.50:g.competition==='apbc2026'?.85:g.derby?.55:g.mode==='practice'||g.mode==='pitching'?.10:weekend?.65:.45;
  return clamp(base+unit*(g.park?.school?.35:weekend?.30:.30)+rank-(g.weather==='rain'?.12:0),.05,1);
 }
 static stadiumAtmosphere(g){
  const home=g?.teams?.home?.id||'',away=g?.teams?.away?.id||'',school=!!g?.park?.school;
  const homeLeague=school?'school':NightGame.crowdLeague(home),awayLeague=school?'school':NightGame.crowdLeague(away);
  const active=g?.side==='away'?awayLeague:homeLeague,attacking=g?.side==='away'?'away':'home';
  const excitement=g?.crowdExcitement?.()??.18,phase=g?.phase,kind=g?.field?.outcome||g?.hit?.kind;
  const review=['play-call','play-review','abs-call','abs-review'].includes(phase);
  let attack=.18+excitement*.62,defense=.10+excitement*.24,reaction='watch';
  if(review){attack=defense=.04;reaction='review';}
  else if(phase==='cinematic'&&g.broadcastCut?.kind==='walkoff'||g?.walkoffWin&&phase==='ended'){attack=1;defense=.02;reaction='win';}
  else if(phase==='result'&&kind==='hr'||phase==='cinematic'&&g.broadcastCut?.kind==='homer'){attack=1;defense=g?.derby?.enhanced?.92:.03;reaction='homer';}
  else if(phase==='result'&&['single','double','triple','error'].includes(kind)){attack=.86;defense=.10;reaction='hit';}
  else if(phase==='cinematic'&&g.broadcastCut?.kind==='strikeout'||phase==='result'&&g.pitch?.strikeCelebration){attack=.02;defense=g.pitch?.strikeCelebration?.level>=2||g.broadcastCut?.level>=2?1:.68;reaction='out';}
  else if(phase==='result'&&['flyout','groundout','forceout','doubleplay','strikeout','buntout'].includes(kind)||phase==='result'&&g?.log?.at(-1)?.en==='STRIKEOUT'){attack=.04;defense=.80;reaction='out';}
  else if(phase==='field'){attack=g?.field?.foul?.23:Math.max(.53,attack);defense=Math.max(.25,defense);reaction='flight';}
  else if(g?.bases?.[1]||g?.bases?.[2])reaction='chance';
  return {attendance:NightGame.crowdAttendance(g),excitement:review?0:excitement,league:active,homeLeague,awayLeague,attackSide:attacking,homeExcite:attacking==='home'?attack:defense,awayExcite:attacking==='away'?attack:defense,reaction,pan:attacking==='away'?-.36:.36,tempo:active==='cpbl'?1.12:active==='kbo'?1.07:active==='npb'?.96:1};
 }
 // v206: game-state-aware manager decisions. Profiles are fictional club
 // tendencies, not claims about real managers.
 static managerTactics(manager,ctx={}){
  const m=manager||NightGame.MANAGERS[0];
  const {balls=0,strikes=0,outs=0,outsNeeded=3,inning=1,total=9,lead=0,bases=[],run=65,contact=65,power=65,catcherArm=65,pitcherFatigue=0,threat=130,nextThreat=130}=ctx;
  const late=inning>=Math.max(2,total-2),close=Math.abs(lead)<=1,scoring=!!(bases[1]||bases[2]),firstOpen=!bases[0],room=outs<outsNeeded-1;
  const canBunt=room&&strikes<2&&!bases[2]&&(bases[0]||bases[1])&&late&&close&&lead<=0&&power<70&&contact<76;
  const bunt=canBunt?clamp(m.bunt*(outs===0?.50:.26)*(power<55?1.25:1),0,.65):0;
  const steal=run>=m.stealRun&&lead>=-2&&!(late&&lead>=4)&&balls!==3?clamp(.045*m.stealMul*(1+(run-72)*.045+(70-catcherArm)*.025+pitcherFatigue*.45)*(outs===2?1.15:1)*(strikes===2?.72:1)*(late&&close?1.2:1),0,.24):0;
  const ibb=firstOpen&&scoring&&late&&close&&lead<=1&&balls===0&&strikes===0&&threat>=140&&threat-nextThreat>=13?clamp((m.id==='steady'?.55:m.id==='quick'?.40:.30)*(outs===outsNeeded-1?1.1:1),0,.72):0;
  const shift=clamp((power-66)*.021*(m.id==='steady'?1.20:m.id==='slugger'?.85:1),0,.65);
  return {bunt,steal,ibb,shift};
 }
 static reliefDecision(manager,ctx={}){
  const m=manager||NightGame.MANAGERS[0],{role='SP',pitches=0,runs=0,stamina=65,inning=1,total=9,lead=0,continuous=false,hasCloser=false}=ctx;
  const late=total>1&&inning>=total,save=late&&lead>=1&&lead<=3,close=Math.abs(lead)<=2;
  const base=role==='SP'?(continuous?76:45):(continuous?25:18);
  const limit=Math.round(base*m.hook*clamp(stamina/70,.72,1.30));
  const shelled=runs>=4&&pitches>=Math.round(20*m.hook);
  const fatigue=pitches>=limit,shortHook=role==='SP'&&total>1&&inning>=Math.max(3,Math.ceil(total*.65))&&pitches>=Math.round(limit*.73)&&close;
  const change=fatigue||shelled||shortHook||(save&&hasCloser&&role!=='CP');
  return {change,prefer:save?'CP':late&&close?'RP':'RP',protectCloser:!save};
 }
 static TYPES=TYPES;
 static POS=POS;
 static BASES=BASES;
 static positions(park){
  if(!park?.school&&!park?.custom)return POS;
  return POS.map(([name,x,y],i)=>{
   if(i<6)return [name,x,y];
   const depth=Math.hypot(x,y),fence=NightPlayers.wallDistance(park,Math.atan2(x,y));
   const scale=park.custom?Math.min(1,fence*.73/depth):(fence*.73)/depth;
   return [name,x*scale,y*scale];
  });
 }
 // CPU manager personalities: one stable type per club (hashed from the
 // club id, so the same club always plays the same way). hook scales the
 // relief pitch-count thresholds (<1 = quicker hook), stealMul/stealRun
 // drive steal attempts, bunt is the sacrifice probability in bunt spots,
 // powerMul scales the CPU's power-swing rate.
 static MANAGERS=[
  {id:'balanced',label:'バランス型',desc:'標準的な采配',hook:1,stealMul:1,stealRun:72,bunt:.5,powerMul:1},
  {id:'quick',label:'継投早め型',desc:'先発を早めに代え、継投で逃げ切る',hook:.72,stealMul:1,stealRun:72,bunt:.5,powerMul:1},
  {id:'runner',label:'機動力型',desc:'俊足走者を積極的に走らせる',hook:1,stealMul:1.8,stealRun:64,bunt:.55,powerMul:.95},
  {id:'slugger',label:'強攻型',desc:'バントを嫌い、長打で攻める',hook:1,stealMul:.9,stealRun:72,bunt:.12,powerMul:1.35},
  {id:'steady',label:'堅実型',desc:'送りバントで確実に進塁させる',hook:.9,stealMul:.7,stealRun:74,bunt:.78,powerMul:.9},
 ];
 static managerFor(clubId){
  if(!clubId)return NightGame.MANAGERS[0];
  let h=5381;for(const ch of String(clubId))h=(h*33+ch.charCodeAt(0))>>>0;
  return NightGame.MANAGERS[h%NightGame.MANAGERS.length];
 }
 // Pitch mastery growth: merge one game's pitchUsage ({pitcherId:
 // {pitchId: count}}) into a mastery map ({pitcherId: {pitchId: 0..100}}).
 // +0.2 per pitch thrown keeps it a long-term system: a pitcher's main
 // pitch gains roughly +2 per pennant game, more in a full 9-inning game.
 static applyMastery(mastery,usage,rate=.2){
  if(!mastery||!usage)return 0;
  let improved=0;
  for(const [pid,types] of Object.entries(usage))for(const [type,n] of Object.entries(types||{})){
   if(!n)continue;
   const cur=Number(mastery[pid]?.[type])||0,next=Math.min(100,Math.round((cur+n*rate)*10)/10);
   if(next>cur){(mastery[pid]??={})[type]=next;improved++;}
  }
  return improved;
 }
 // Pitch feel rebalance (v183, direct user request: "the fast ones
 // faster, the slow ones slower — there is not enough speed
 // differential — and make breaking balls bend more"). Two global
 // transforms live here in pitchSpec, the single source every mode
 // reads (matches, bullpen, practice, the pitch deck), so displays
 // and flight can never disagree:
 //  - Speed stretch around a 124 km/h pivot: a 150 km/h fastball
 //    becomes ~156, a 109 km/h curve ~106, a 101 km/h slow curve ~96.
 //    The middle of the range barely moves, and because the stretch
 //    is affine in each pitch's own set speed, one pitcher's
 //    fastball/off-speed gap widens by the same factor as the
 //    difference between pitchers — individuality grows, never
 //    flattens. A 70 km/h floor guards generated (school/career)
 //    pitchers whose raw off-speed speeds can start far lower.
 //    Paired fixed-seed probe over all 84 roster pitchers: fastball
 //    set speeds 133.9-150.1 -> 136.1-155.8, slowest pitch 101 -> 96.
 //  - Break scale x1.30 on bx/by: the deck's 1-7 level conversion
 //    divides by 18*1.3 as well (app.js), so the chart numbers keep
 //    exactly their pre-v183 meaning instead of saturating at 7.
 static PITCH_SPEED_PIVOT=124;
 static PITCH_SPEED_STRETCH=1.22;
 static PITCH_BREAK_MUL=1.3;
 static stretchPitchSpeed(v){return Math.max(70,NightGame.PITCH_SPEED_PIVOT+(v-NightGame.PITCH_SPEED_PIVOT)*NightGame.PITCH_SPEED_STRETCH);}
 static pitchSpec(pitcher,id){
  const type=TYPES.find(t=>t.id===id)||TYPES[0],detail=pitcher.pitchDetails?.[id]||{},scale=(pitcher.movement/82)*(detail.breakScale||1);
  const rawSpeed=detail.speed||pitcher.velocity*type.speed/148;
  const fastSpeed=pitcher.pitchDetails?.fast?.speed||pitcher.velocity;
  // Physical km/h; the feel transform is used only for duration.
  const speed=Math.max(50,type.gap&&!Number.isFinite(detail.measuredAverage)?Math.min(rawSpeed,fastSpeed-type.gap):rawSpeed);
  // Spin rate (rpm): the pitch type's baseline spin, scaled by the pitcher's
  // movement quality. The existing bx/by break is read as the Magnus break
  // that spin produces, with a small spin-driven correction on top (a few
  // percent at most) so type-to-type break character is preserved. The
  // knuckleball barely spins, so its flutter break is not Magnus-driven.
  const spinRpm=Math.round((type.spin||0)*(.78+.22*(pitcher.movement/82))*(detail.spinScale||1));
  const mag=type.id==='knuckle'?1:clamp(.9+.1*(type.spin?spinRpm/type.spin:1),.9,1.1);
  return {...type,name:detail.label||type.name,short:detail.label||type.short,speed,bx:type.bx*scale*mag*NightGame.PITCH_BREAK_MUL,by:type.by*scale*mag*NightGame.PITCH_BREAK_MUL,spinRpm};
 }

 // Variant rules (v133, checker item "variant-rules-match"): regular
 // versus matches only. normalizeVariantRules is the single gate — any
 // other mode (pennant / career / umpire / practice / derby), or a game
 // built without the option, gets every rule OFF, so the engine below
 // only ever checks this.variantRules flags. Since v182 the gate has
 // one explicit exception: an ONLINE versus match opts in with
 // options.onlineMatch (set only by the two online starters in app.js,
 // which pass the host's lobby choices to both engines), so a remote
 // game built any other way — career-world's remoteSide path included —
 // is still blocked exactly as before.
 static VARIANT_RULE_KEYS=['fullCount','metalBat','noBreaking','twoOuts','lowReboundBat'];
 static normalizeVariantRules(mode,options={}){
  const out={};for(const k of NightGame.VARIANT_RULE_KEYS)out[k]=false;
  if(mode!=='match'||options.umpire||options.career||(options.remoteSide&&!options.onlineMatch))return out;
  const src=options.variantRules||{};
  for(const k of NightGame.VARIANT_RULE_KEYS)out[k]=src[k]===true;
  // The two bat rules are opposites and mutually exclusive (v180):
  // if a caller passes both, the metal bat wins and the low-rebound
  // bat drops, so a game can never carry both multipliers.
  if(out.metalBat&&out.lowReboundBat)out.lowReboundBat=false;
  return out;
 }
 // Handicap matches (v173, checker item "handicap-match"): regular versus
 // matches only, gated like the variant rules / time attack above. The
 // CPU's abilities are never touched — the weaker side is helped by
 // rule-level advantages: head-start runs credited before the first pitch,
 // and asymmetric outs (the user's innings at bat last 4 outs, the CPU's
 // only 2). outsNeeded is re-derived from the batting side at every half
 // change, so all in-half outs checks see the right number. Anything
 // invalid or all-default returns null = no handicap, exactly as before.
 static normalizeHandicap(mode,options={}){
  if(mode!=='match'||options.umpire||options.career||options.timeAttack||options.apbcFixtureId||options.ctFixture||options.worldFixture||options.competition||(options.remoteSide&&!options.onlineMatch))return null;
  const src=options.handicap;
  if(!src||typeof src!=='object')return null;
  const runs=v=>Number.isInteger(v)?Math.min(3,Math.max(0,v)):0;
  // Offline, the user's own outs can only be eased to 4 and the CPU's
  // only cut to 2. Online (v182) the handicap crosses the wire in
  // absolute home/away terms and each side converts it back to its own
  // perspective, which can legitimately put 2 on userOuts or 4 on
  // cpuOuts — so the online path accepts the full 2..4 range on both.
  const outs=v=>Number.isInteger(v)&&v>=2&&v<=4?v:3;
  const out=options.onlineMatch
   ?{userRuns:runs(src.userRuns),cpuRuns:runs(src.cpuRuns),userOuts:outs(src.userOuts),cpuOuts:outs(src.cpuOuts)}
   :{userRuns:runs(src.userRuns),cpuRuns:runs(src.cpuRuns),userOuts:src.userOuts===4?4:3,cpuOuts:src.cpuOuts===2?2:3};
  return out.userRuns||out.cpuRuns||out.userOuts!==3||out.cpuOuts!==3?out:null;
 }
 // Time attack (v134, checker item "time-attack-mode"): regular versus
 // matches only, like the variant rules above. The user keeps one role
 // for the whole clock — batting (kind 'bat', score = runs) or pitching
 // (kind 'pitch', score = outs) — and changeHalf restarts the same half
 // instead of switching sides, so three outs never end the run. The
 // clock lives in update() and expiry calls finishTimeAttack(); every
 // other mode, and any game built without the option, gets null here
 // and behaves exactly as before.
 static TIME_ATTACK_KINDS=['bat','pitch'];
 static normalizeTimeAttack(mode,options={}){
  if(mode!=='match'||options.umpire||options.remoteSide||options.career||options.apbcFixtureId||options.ctFixture||options.worldFixture||options.competition)return null;
  const src=options.timeAttack;
  if(!src||typeof src!=='object'||!NightGame.TIME_ATTACK_KINDS.includes(src.kind))return null;
  const seconds=Number(src.seconds);
  if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return null;
  return {kind:src.kind,seconds:Math.round(seconds)};
 }
 // Survival ladder (v138, checker item "survival-ladder"): regular
 // versus matches only, like time attack above, and never combined
 // with it. The NightSurvival module owns the run state; the engine
 // only carries {wins, boost, fatiguePitchers, fatigueBatters} and
 // applies them in conditionFor() (opponent boost / user fatigue) and
 // to the starting pitcher's stamina. Any other mode, an online or
 // umpire game, or a game built without the option gets null here and
 // behaves exactly as before.
 static SURVIVAL_BOOSTS=[-8,-5,-2,0,3,5,7,9,11];
 static survivalBoost(wins){const w=Number.isFinite(Number(wins))?Math.max(0,Math.floor(Number(wins))):0;return w>=NightGame.SURVIVAL_BOOSTS.length?12:NightGame.SURVIVAL_BOOSTS[w];}
 static cleanSurvivalFatigue(value){const out={};if(!value||typeof value!=='object')return out;for(const [id,pts] of Object.entries(value)){const n=Number(pts);if(id&&Number.isFinite(n)&&n>0)out[id]=Math.min(60,Math.floor(n));}return out;}
 static normalizeSurvival(mode,options={}){
  if(mode!=='match'||options.umpire||options.remoteSide||options.career||options.apbcFixtureId||options.ctFixture||options.worldFixture||options.competition||options.timeAttack)return null;
  const src=options.survival;
  if(!src||typeof src!=='object')return null;
  const wins=Number.isFinite(Number(src.wins))?Math.max(0,Math.min(99,Math.floor(Number(src.wins)))):0;
  const boost=Number.isFinite(Number(src.boost))?Math.max(-12,Math.min(12,Math.round(Number(src.boost)))):NightGame.survivalBoost(wins);
  return {wins,boost,fatiguePitchers:NightGame.cleanSurvivalFatigue(src.fatiguePitchers),fatigueBatters:NightGame.cleanSurvivalFatigue(src.fatigueBatters),oppIds:[],userIds:[]};
 }
 static survivalPenalty(isPitcher,points){const n=Number(points);if(!Number.isFinite(n)||n<=0)return 0;return Math.min(3,Math.floor(n/(isPitcher?10:5)));}

 static isIndoorPark(park){
  const spec=park?.customSpec;if(spec?.venue==='retractable')return spec.roofOpen==='closed';
  if(spec?.venue==='outdoor'||spec?.venue==='school')return false;
  return spec?.venue==='dome'||park?.theme==='dome'||['tokyo-dome','taipei-dome'].includes(park?.id);
 }
 static rainLevel(g){if(!g||g.weather!=='rain'||NightGame.isIndoorPark(g.park))return 0;let n=0;for(const c of String(g.conditionSeed||g.park?.id||'rain'))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n%10<3?1:n%10<8?2:3;}
 normalizeWeather(){if(NightGame.isIndoorPark(this.park)){this.weather='clear';this.wind=0;if(this.field?.ball)this.field.ball.wetField=false;}this.weatherLabel=NightGame.weatherLabelFor(this.weather);}
 static specialFieldChance(p,difficulty=1,wet=false){return specialFieldChance(p,difficulty,wet);}
 static weatherLabelFor(weather){return weather==='rain'?'雨':weather==='cloudy'?'曇り':'晴れ';}
 static rollForecast(park,random=Math.random,rollWind=true){
  // v154 (checker: weather-forecast): the pre-match forecast is rolled with
  // exactly the distributions the match itself used — weather at NightGame
  // construction (dome parks always clear, otherwise clear 55% / cloudy
  // 30% / rain 15%) and, for a normal match, the wind roll from match start
  // (25% calm, otherwise -5..+5 in 0.5 steps; dome parks excluded). The
  // caller passes the result back as options.weather / options.wind, so
  // the forecast IS the match weather, never a divergent guess. Pennant
  // live games never rolled wind (they use the park's own wind), so their
  // forecast passes rollWind=false and reports the park wind instead.
  const dome=NightGame.isIndoorPark(park);
  const custom=park?.customSpec;
  const weather=dome?'clear':custom&&custom.weather!=='random'?custom.weather:(()=>{const r=random();return r<.55?'clear':r<.85?'cloudy':'rain';})();
  const windable=!!park&&!dome;
  const wind=dome?0:custom?.windMode==='fixed'?custom.windSpeed:rollWind?(windable?(random()<.25?0:Math.round((random()*10-5)*2)/2):0):(Number.isFinite(park?.wind)?park.wind:0);
  return {weather,weatherLabel:NightGame.weatherLabelFor(weather),wind,windDirection:!dome&&custom?.windMode==='fixed'?custom.windDirection:null,park:park?.id||null};
 }
 static arrangeLineup(club,ids=[],fielding={}){
  const fallback=club.startingOrder||club.batters.slice(0,9).map(p=>p.id);
  const valid=Array.isArray(ids)&&ids.length===9&&new Set(ids).size===9&&ids.every(id=>club.batters.some(p=>p.id===id));
  if(!Object.keys(fielding||{}).length&&(!valid||ids.every((id,i)=>id===fallback[i])))fielding=club.startingFielding||{};
  const lineup=(valid?ids:fallback).map(id=>({...club.batters.find(p=>p.id===id)}));
  const free=new Set(['C','1B','2B','3B','SS','LF','CF','RF','DH']),assigned=new Set();
  for(const [pos,id]of Object.entries(fielding||{})){const player=lineup.find(p=>p.id===id);if(player&&free.has(pos)&&!assigned.has(id)){player.fieldPos=pos;free.delete(pos);assigned.add(id);}}
  for(const player of lineup)if(!assigned.has(player.id)&&free.has(player.pos)){player.fieldPos=player.pos;free.delete(player.pos);assigned.add(player.id);}
  for(const player of lineup)if(!assigned.has(player.id)){player.fieldPos=free.values().next().value;free.delete(player.fieldPos);}
  return lineup;
 }

 constructor(mode,difficulty,emit,options={}){
  this.conditionSeed=options.career?.fixtureId ? options.career.teamSeed+"/"+options.career.fixtureId : (typeof options.conditionSeed==='string'&&options.conditionSeed?options.conditionSeed:Date.now()+"/"+(++conditionGameSerial));
  this.crowdAttendanceMode=NightGame.crowdOptions.includes(options.crowdAttendance)?options.crowdAttendance:(mode==='match'&&!options.career&&!options.apbcFixtureId?'full':'auto');this.crowdWeekend=options.crowdWeekend;this.crowdRankBoost=clamp(Number(options.crowdRankBoost)||0,0,.15);this.crowdPostseason=!!options.crowdPostseason;
  this.runningRevision=41;this.competition=options.competition||null;this.apbcFixtureId=options.apbcFixtureId||null;this.apbcRoster=options.apbcRoster||null;this.apbcFinal=options.apbcFinal===true;this.mode=mode;this.career=options.career||null;this.arcadeRoster=options.arcadeRoster===true;this.difficulty=difficulty;this.emit=emit;this.phase='intro';this.phaseTime=0;this.time=0;this.paused=false;
  this.inning=1;this.half=this.career?.continuous||['match','pennant','pitching','career-pitch'].includes(mode)?'top':'bottom';this.outs=0;this.balls=0;this.strikes=0;this.bases=[false,false,false];
  this.npbPostseason=mode==='pennant'&&options.npbPostseason===true;
  this.worldFixture=options.worldFixture||null;
  if(options.worldMusic)this.worldMusic=options.worldMusic;
  this.maxInnings=this.npbPostseason?options.maxInnings??null:this.worldFixture?options.worldMaxInnings??null:null;
  this.drawClinches=this.npbPostseason&&options.drawClinches===true||!!this.worldFixture&&options.worldDrawClinches===true;
  this.totalInnings=(mode==='pennant'&&!this.npbPostseason)||(this.apbcFixtureId&&options.innings===1)?1:options.innings===9?9:options.innings===3?3:5;this.userHome=options.userHome!==false;this.teams=options.clubs||{home:this.fixtureClub(options.homeTeamId||'owls'),away:this.fixtureClub(options.awayTeamId||'foxes')};this.pitchingStaff={home:this.teams.home.pitchers,away:this.teams.away.pitchers};this.home=Array(this.totalInnings).fill(null);this.away=Array(this.totalInnings).fill(null);this.homeScore=0;this.awayScore=0;this.homeHits=0;this.awayHits=0;this.homeErrors=0;this.awayErrors=0;
  this.cursor={x:0,y:0};this.power=mode==='derby';this.bunt=false;this.steal=false;this.pitchType='fast';this.stamina=100;this.pitchHistory=[];this.pitch=null;this.lastPitch=null;this.hit=null;this.field=null;this.swingAge=9999;this.next='pitch';
  this.wind=Number.isFinite(options.wind)?options.wind:null;this.tiebreak=!!options.tiebreak;this.halfBreak=null;this.autoDefense=false;this.autoBatting=false;this.fastForward=false;this.spectate=false;this.defenseSpeed=options.defenseSpeed===2?2:1;this.manualRunning=options.manualRunning===true;this.fieldSpeed=options.fieldSpeed===2?2:1;this.battingAssist=options.battingAssist!==false;this.park=options.parkDefinition||NightPlayers.parks.find(p=>p.id===options.park)||NightPlayers.parks[0];
  if(this.park.custom){if(this.park.theme==='dome')this.wind=0;else if(this.park.customSpec.windMode==='fixed')this.wind=this.park.customSpec.windSpeed;else if(this.wind===null)this.wind=NightGame.rollForecast(this.park).wind;}
  const order=(options.order||[]).map(id=>this.teams[this.userSide].batters.find(p=>p.id===id)).filter(Boolean);
  this.lineups={home:NightGame.arrangeLineup(this.teams.home),away:NightGame.arrangeLineup(this.teams.away)};this.lineups[this.userSide]=NightGame.arrangeLineup(this.teams[this.userSide],order.map(p=>p.id),options.fielding);if(options.onlineMatch){this.lineups[this.opponentSide]=NightGame.arrangeLineup(this.teams[this.opponentSide],options.opponentOrder,options.opponentFielding);}this.battingIndex={home:0,away:0};this.practiceBatter=options.practiceBatter||'o1';this.homePitcherIndex=Number.isInteger(options.pitcher)&&this.pitchingStaff[this.userSide][options.pitcher]?options.pitcher:(NightPlayers.defaultPitcherIndex?.(this.teams[this.userSide])??0);this.awayPitcherIndex=Number.isInteger(options.opponentPitcher)&&this.pitchingStaff[this.userSide==='home'?'away':'home'][options.opponentPitcher]?options.opponentPitcher:(NightPlayers.defaultPitcherIndex?.(this.teams[this.userSide==='home'?'away':'home'])??0);this.usedPitchers=[this.homePitcherIndex];this.usedCpuPitchers=[this.awayPitcherIndex];this.removedPlayers={home:[],away:[]};this.participants={home:this.lineups.home.map(p=>p.id),away:this.lineups.away.map(p=>p.id)};this.substitutions=[];this.pitchingStats={};this.baseIds=[null,null,null];this.box={};this.basePitcherIds=[null,null,null];this.leadDecision=null;this.playEvents=[];this.log=[];this.pitchTrace=[];this.atBatPitches=[];this.atBatRisp=false;this.defense='normal';this.batFinished=false;this.practicePitch=options.practicePitch||'random';this.touch=null;const umpRoll=Math.random();this.umpireBias=umpRoll<.25?-.0127:umpRoll<.75?0:.0127;this.umpireLabel=this.umpireBias<0?'ゾーン狭め':this.umpireBias>0?'ゾーン広め':'ゾーン標準';this.pitchMemory={};const dome=NightGame.isIndoorPark(this.park);const forcedWeather=['clear','cloudy','rain'].includes(options.weather)?options.weather:this.park.customSpec?.weather!=='random'?this.park.customSpec?.weather??null:null;const wRoll=forcedWeather?null:Math.random();this.weather=dome?'clear':forcedWeather||(wRoll<.55?'clear':wRoll<.85?'cloudy':'rain');this.normalizeWeather();this.shift='none';this.cpuShiftNow=false;this.remoteSide=options.remoteSide||null;this.remoteRunning=options.remoteRunning===true;this.remotePitching=false;this.remoteBatter=false;this.mirror=false;this.mirrorSend=null;this._mirrorPitchSeq=-1;this._mirrorSwung=false;this._mirrorThrew=false;this._sentSteal=false;this._ptAt=null;this._ptBase=0;this._fieldPrev=null;this._fieldCurr=null;this._mirrorFseq=-1;this._mirrorRunners=new Map();this.customDifficulty=options.customDifficulty||globalThis.NightGameCustomDifficulty||null;this.walkoffWin=false;this.cpuManager=options.remoteSide?NightGame.MANAGERS[0]:NightGame.managerFor(this.teams[this.opponentSide]?.id);this.mastery=options.mastery||null;this.pitchUsage={};this.randomRoster=options.randomRoster===true;this.variantRules=NightGame.normalizeVariantRules(mode,options);this.hardcore=options.hardcore===true;this.outsNeeded=this.variantRules.twoOuts?2:3;this.handicap=NightGame.normalizeHandicap(mode,options);if(this.handicap){this.outsNeeded=this.side===this.userSide?this.handicap.userOuts:this.handicap.cpuOuts;if(this.handicap.userRuns)this[this.userSide+'Score']+=this.handicap.userRuns;if(this.handicap.cpuRuns)this[this.opponentSide+'Score']+=this.handicap.cpuRuns;}if(this.variantRules.fullCount){this.balls=2;this.strikes=2;}this.timeAttack=NightGame.normalizeTimeAttack(mode,options);if(this.timeAttack){this.timeAttack.remaining=this.timeAttack.seconds*1000;this.timeAttack.outs=0;this.timeAttack.halves=0;this.timeAttack.result=null;this.totalInnings=999;this.home=Array(999).fill(null);this.away=Array(999).fill(null);this.half=this.timeAttack.kind==='bat'?(this.userHome?'bottom':'top'):(this.userHome?'top':'bottom');}this.survival=NightGame.normalizeSurvival(mode,options);if(this.survival){this.survival.oppIds=[...this.teams[this.opponentSide].batters,...this.teams[this.opponentSide].pitchers].map(p=>p.id);this.survival.userIds=[...this.teams[this.userSide].batters,...this.teams[this.userSide].pitchers].map(p=>p.id);const starterId=this.pitchingStaff[this.userSide][this.homePitcherIndex]?.id,fp=starterId?this.survival.fatiguePitchers[starterId]||0:0;if(fp)this.stamina=Math.max(60,100-Math.min(40,fp));}this.baseCall=null;this.umpireMode=options.umpire===true;this.umpirePending=null;this.umpireReveal=null;this.umpireStats={calls:0,correct:0,score:0,playCalls:0,playCorrect:0,lastCall:null,lastPlay:null,last:null};
  if(options.injured){for(const side of ['home','away']){const out=new Set(options.injured[side]||[]);if(!out.size)continue;const club=this.teams[side],lineup=this.lineups[side],used=new Set(lineup.map(p=>p.id)),bench=club.batters.filter(p=>!used.has(p.id)&&!out.has(p.id)).sort((a,b)=>(b.contact+b.power)-(a.contact+a.power));for(let i=0;i<lineup.length;i++)if(out.has(lineup[i].id)&&bench.length){const sub=bench.shift();lineup[i]={...sub,fieldPos:lineup[i].fieldPos};}this.participants[side]=lineup.map(p=>p.id);}}
  this.session={hits:0,hr:0,maxDistance:0,perfect:0,swings:0,contacts:0,pitches:0,runs:0,history:[],thrown:0,ks:0,allowed:0,grandSlam:false};
  if(this.loadedStart)this.seedRunners(3,2);
  if(mode==='derby')this.derby=new NightDerby(this.teams.home,this.batter,this.park,options.derby);
  if(!this.career&&mode!=='derby')this.message(mode==='pennant'?'PENNANT PLAY BALL':mode==='match'?'PLAY BALL':mode==='pitching'?'TAKE THE MOUND':'CURSOR BATTING',this.loadedStart&&mode==='pennant'?'2アウト満塁。一打で動くペナント。':mode==='match'||this.npbPostseason?this.timeAttack?`制限時間 ${this.timeAttack.seconds} 秒。${this.timeAttack.kind==='bat'?'打ち続けて得点を競え。':'投げ続けてアウトを競え。'}`:`投打でつかむ、${this.totalInnings}イニング。`:mode==='pitching'?'配球で、打者を打ち取れ。':'コースを読んで、芯で捉えろ。',this.loadedStart&&mode==='pennant'?(this.userHome?'あなたは後攻 / 毎回2アウト満塁':'あなたは先攻 / 毎回2アウト満塁'):mode==='match'||this.npbPostseason?(this.userHome?'後攻 / 守備からスタート':'先攻 / 打撃からスタート'):mode==='pitching'?'指の左上に照準 / 離して投球':'指の左上に照準 / 離してスイング');
 }
 customAdj(kind){const c=this.customDifficulty;const v=c?Number(c[kind]):0;return Number.isFinite(v)?clamp(v,-10,10):0;}
 static migrateForeignMatch(state,clubs){
  const sides=['home','away'];
  if(!sides.every(side=>clubs[side].id.startsWith('career-foreign-')&&
   NightTeams.all.some(club=>club.id===state.teams?.[side]?.id)))return state;
  const ids=new Map(),names=new Map();
  for(const side of sides){
   const previous=NightTeams.get(state.teams[side].id),next=clubs[side];
   for(const group of ['batters','pitchers']){
    const players=next[group].filter(p=>p.id!==state.career.playerId);
    previous[group].forEach((p,i)=>{ids.set(p.id,players[i].id);names.set(p.name,players[i].name);});
   }
  }
  const match=structuredClone(state),id=value=>ids.get(value)??value,name=value=>names.get(value)??value;
  for(const side of sides){
   match.lineups[side].forEach(p=>{p.id=id(p.id);});
   for(const key of ['participants','removedPlayers'])if(match[key]?.[side])match[key][side]=match[key][side].map(id);
  }
  for(const key of ['box','pitchingStats'])match[key]=Object.fromEntries(Object.entries(match[key]||{}).map(([key,stats])=>[id(key),stats]));
  for(const key of ['baseIds','basePitcherIds'])if(match[key])match[key]=match[key].map(id);
  if(match.leadDecision)for(const key of ['winner','loser'])match.leadDecision[key]=id(match.leadDecision[key]);
  for(const row of match.log||[])if(row.batter)row.batter=name(row.batter);
  for(const row of match.pitchTrace||[])row.pitcherId=id(row.pitcherId);
  for(const row of match.substitutions||[]){
   row.inId=id(row.inId);row.outId=id(row.outId);row.inName=name(row.inName);row.outName=name(row.outName);
  }
  for(const event of match.playEvents||[])if(event.runnerId)event.runnerId=id(event.runnerId);
  if(match.field){
   for(const runner of match.field.runners){
    runner.id=id(runner.id);runner.chargedPitcherId=id(runner.chargedPitcherId);
   }
   if(match.field.throw?.runnerId)match.field.throw.runnerId=id(match.field.throw.runnerId);
   if(match.field.manual){
    const {manual}=match.field;
    if(manual.initialIds)manual.initialIds=manual.initialIds.map(id);
    for(const out of manual.outs||[])out.id=id(out.id);
    if(manual.lastOut)manual.lastOut.id=id(manual.lastOut.id);
   }
  }
  return match;
 }
 static restore(snapshot,emit,options={}){
  if(![3,4].includes(snapshot?.schema)||!snapshot.state)return null;
  let {state}=snapshot;
  if(state.career){
   if(!options.clubs||options.career?.fixtureId!==state.career.fixtureId||
      state.mode!==(state.career.pitching?'career-pitch':'career-bat'))return null;
   state=this.migrateForeignMatch(state,options.clubs);
  }else if(!['match','pennant'].includes(state.mode))return null;
  const career=state.career;
  const g=Object.create(NightGame.prototype);Object.assign(g,state);g.emit=emit;g.paused=false;g.touch=null;g.userHome ??= true;
  if(options.worldMusic)g.worldMusic=options.worldMusic;
  if(career)Object.assign(career,{presentation:options.career.presentation??career.presentation,shortIntro:options.career.shortIntro??career.shortIntro,
   weakSchool:career.weakSchool??options.career.weakSchool,teamSeed:career.teamSeed??options.career.teamSeed});
  if(career&&!career.pitching){
   // Older saves can be waiting in the removed fielding activity.
   if(g.next==='career-field')g.next='finish';
   if(g.phase==='career-field'){
    g.setPhase('result');
    g.next=career.completed>=career.opportunities?'finish':'career';
   }
  }
  g.teams ||= {home:NightTeams.get('owls'),away:NightTeams.get('foxes')};
  const oldNames=new Map();g.lineups ||= {};
  for(const side of ['home','away']){
   const club=options.clubs?.[side]||(state.randomRoster?g.teams[side]:g.fixtureClub(g.teams[side].id)),old=g.lineups[side]||[],fresh=old.map(p=>club.batters.find(b=>b.id===p.id)).filter(Boolean);
   for(const p of old){const next=club.batters.find(b=>b.id===p.id);if(next)oldNames.set(p.name,next.name);}
   g.teams[side]=club;g.lineups[side]=NightGame.arrangeLineup(club,fresh.map(p=>p.id),Object.fromEntries(old.filter(p=>p.fieldPos).map(p=>[p.fieldPos,p.id])));
  }
  g.pitchingStaff={home:g.teams.home.pitchers,away:g.teams.away.pitchers};g.usedPitchers ||= [g.homePitcherIndex];g.usedCpuPitchers ||= [g.awayPitcherIndex||0];g.removedPlayers ||= {home:[],away:[]};g.participants ||= {home:g.lineups.home.map(p=>p.id),away:g.lineups.away.map(p=>p.id)};g.substitutions ||= [];g.pitchingStats ||= {};for(const side of ['home','away']){g.removedPlayers[side] ||= [];g.participants[side] ||= g.lineups[side].map(p=>p.id);}if(g.pitch)g.pitch.delivered ??= ['pitch','miss','field','result'].includes(g.phase);
  for(const entry of g.log||[])if(oldNames.has(entry.batter))entry.batter=oldNames.get(entry.batter);
  if(g.field){g.field.batterName=g.batter.name;for(const f of g.field.fielders){f.player=g.fielder(f.name).name;}}
  if(g.field?.manual?.secured&&g.field.manual.outfield==null){
   const holder=g.field.manual.holder;
   const fielder=g.field.fielders[holder];
   if(fielder)g.field.manual.outfield=outfieldPickup(holder,fielder);
  }
  if(g.pitch){g.pitch.throwHand ??= g.pitcher.hand==='L'?'L':'R';g.pitch.releaseX ??= (g.pitch.throwHand==='L'?1:-1)*.76/.68;}
  if(g.phase==='change'&&!g.halfBreak)g.halfBreak={inning:g.half==='bottom'?g.inning:Math.max(1,g.inning-1),half:g.half==='bottom'?'top':'bottom',nextInning:g.inning,nextHalf:g.half};g.autoDefense ??= false;g.autoBatting??=false;g.fastForward??=false;g.spectate??=false;g.umpireMode??=false;g.umpirePending??=null;g.umpireReveal??=null;g.umpireStats??={calls:0,correct:0,score:0,playCalls:0,playCorrect:0,lastCall:null,lastPlay:null,last:null};g.defenseSpeed=g.defenseSpeed===2?2:1;g.park=NightPlayers.parks.find(p=>p.id===g.park?.id)||NightPlayers.parks[0];g.normalizeWeather();
  g.basePitcherIds ||= [null,null,null];g.variantRules??={fullCount:false,metalBat:false,noBreaking:false,twoOuts:false,lowReboundBat:false};g.hardcore??=false;g.outsNeeded=g.variantRules.twoOuts?2:3;g.handicap??=null;if(g.handicap)g.outsNeeded=g.side===g.userSide?g.handicap.userOuts:g.handicap.cpuOuts;g.timeAttack??=null;g.survival??=null;g.atBatPitches??=[];g.atBatRisp??=false;g.playEvents ||= [];g.leadDecision ??= null;g.manualRunning ??= false;if((g.runningRevision??0)<23&&g.field?.manual){g.field.manual.userControlled=g.manualRunning&&!g.defending;for(const r of g.field.runners){const at=Math.abs(r.progress-Math.round(r.progress))<.000001;r.command=at?Math.round(r.progress):(r.target??r.start)<r.progress?Math.floor(r.progress):Math.ceil(r.progress);r.target=r.command;r.waiting=at;r.touchedAt ||= {[r.base??r.start]:0};}}if((g.runningRevision??0)<41&&g.phase==='field'&&g.field?.manual)g.startForcedRunners();
  if(career){
   if(!career.continuous&&g.mode==='career-bat'&&(career.runnerTurn||g.next==='career-run')){
    if(career.runnerTurn&&g.phase==='field'){
     g.field=null;g.hit=null;g.pitch=null;g.setPhase('result');
    }
    career.runnerTurn=0;
    g.next=career.completed<career.opportunities?'career':'finish';
   }
   if(g.field?.manual&&g.mode==='career-bat'){
    g.field.manual.userControlled=!!g.manualRunning&&!g.defending;
    g.field.manual.selection=g.field.runners.some(r=>r.id===career.playerId&&!r.out&&!r.scored)?career.playerId:null;
   }
  }
  g.conditionSeed??=career?career.teamSeed+'/'+career.fixtureId:'legacy/'+g.teams.home.id+'/'+g.teams.away.id;
  g._cutSubSeen??=(g.substitutions||[]).length;g.runningRevision=41;if(g.battingAssist===undefined)g.battingAssist=true;return g;
 }

 fixtureClub(id){
  if(this.apbcFixtureId)return NightAPBCTournament.club(id,this.apbcRoster?.team===id?this.apbcRoster.ids:undefined);
  if(this.arcadeRoster&&id.startsWith('apbc-'))return NightAPBCTournament.club(id);
  return NightTeams.get(id);
 }
 snapshot(){
  const state=Object.fromEntries(Object.entries(this).filter(([k])=>k!=='emit'&&k!=='touch'));
  if(this.apbcFixtureId||this.career){state.teams={home:{id:this.teams.home.id},away:{id:this.teams.away.id}};delete state.pitchingStaff;}
  return {schema:4,state};
 }
 get loadedStart(){return (this.mode==='pennant'||!!this.apbcFixtureId)&&this.totalInnings===1;}
 get drawDecidesSeries(){return this.drawClinches&&this.inning===this.maxInnings;}
 get mercyRule(){return !!this.apbcFixtureId&&this.totalInnings===9&&!this.apbcFinal&&this.inning>=7;}

 get side(){return this.half==='top'?'away':'home';}
 get userSide(){return this.userHome?'home':'away';}
 get opponentSide(){return this.userHome?'away':'home';}
 get userScore(){return this[this.userSide+'Score'];}
 get opponentScore(){return this[this.opponentSide+'Score'];}
 get battingScore(){return this[this.side+'Score'];}
 get isFixture(){return this.mode==='match'||this.mode==='pennant';}
 get resultCutsEnabled(){return (this.isFixture||!!this.career)&&!this.derby&&!this.timeAttack&&!this.challenge&&!this.umpireMode&&!this.spectate&&!this.fastForward&&!this.autoDefense&&!this.autoBatting&&!this.replayView;}
 get liveCutsEnabled(){return this.isFixture&&!this.career&&!this.derby&&!this.timeAttack&&!this.challenge&&!this.umpireMode&&!this.spectate&&!this.fastForward&&!this.autoDefense&&!this.autoBatting&&!this.replayView;}
 startBroadcastCut(kind,data={},duration=1400){
  if(!(['homer','strikeout','catch'].includes(kind)?this.resultCutsEnabled:this.liveCutsEnabled)||this.mirror||this.phase==='cinematic'||this.phase==='ended')return false;
  this.broadcastCut={...data,kind,duration,resume:this.phase,at:this.phaseTime,id:(this._cutSerial=(this._cutSerial||0)+1)};
  this.phase='cinematic';this.phaseTime=0;this.touch=null;this.notify();return true;
 }
 endBroadcastCut(){
  if(this.mirror||this.phase!=='cinematic'||!this.broadcastCut||this.paused)return false;
  const cut=this.broadcastCut;this.broadcastCut=null;this.phase=cut.resume;this.phaseTime=cut.at;
  if(cut.kind==='walkoff'){this._walkoffCutDone=true;this.finish();}
  else this.notify();
  return true;
 }
 maybeBroadcastCut(){
  if(this.paused||this.mirror||!['aim','windup','result'].includes(this.phase))return false;
   if(!this.liveCutsEnabled&&!(this.phase==='result'&&this.resultCutsEnabled))return false;
   if(this.phase==='result'&&this.pitch?.strikeCelebration&&!this.pitch.strikeCelebration.seen){const k=this.pitch.strikeCelebration;k.seen=true;if(k.level>=2)return this.startBroadcastCut('strikeout',k,k.level===3?2000:1550);}
  const fieldSide=this.side==='home'?'away':'home',half=this.inning+'/'+this.half;
  if(this.phase==='result'&&this.field?.resolved&&!this.field.broadcastCutSeen){
   const field=this.field;field.broadcastCutSeen=true;
   if(field.outcome==='hr'){const h=field.homerCelebration||{};return this.startBroadcastCut('homer',{side:this.side,playerId:this.batter.id,name:this.batter.name,distance:this.hit?.distance||Math.round(field.maxTravel||0),...h},h.level===3?2600:h.level===2?2300:2050);}
   const play=field.greatPlay;
   if(play?.confirmed&&this.resultCutsEnabled){const actor=field.fielders[play.fielder];const profile=actor&&this.fielder(actor.name,fieldSide);
    if(profile)return this.startBroadcastCut('catch',{...play,side:fieldSide,playerId:profile.id,name:profile.name,no:profile.no,pos:actor.name,x:actor.x,z:actor.y},play.type==='robbery'?2400:1850);
   }
  }
  if(!['aim','windup'].includes(this.phase))return false;
  const subs=this.substitutions||[],seen=this._cutSubSeen||0;
  if(subs.length>seen){
   this._cutSubSeen=subs.length;
   const row=subs.slice(seen).reverse().find(s=>s.inning===this.inning&&s.half===this.half&&['pitch','hit'].includes(s.type));
   if(row)return this.startBroadcastCut(row.type==='pitch'?'relief':'pinch-hit',{side:row.side,playerId:row.inId,name:row.inName,previous:row.outName},1600);
  }
  if(this.balls||this.strikes||this._cutPressureHalf===half)return false;
  const close=Math.abs(this.homeScore-this.awayScore)<=2,late=this.inning>=Math.max(2,this.totalInnings-1);
  if(this.inning>=this.totalInnings&&close){this._cutPressureHalf=half;return this.startBroadcastCut('final-inning',{side:fieldSide},1350);}
  if(late&&close&&(this.bases[1]||this.bases[2])){this._cutPressureHalf=half;return this.startBroadcastCut('pressure',{side:fieldSide,base:this.bases[2]?3:2},1350);}
  return false;
 }
 get broadcastIntro(){return this.phase==='intro'&&this.isFixture&&!this.career&&!this.derby&&!this.timeAttack&&!this.fastForward;}
 get introDuration(){return this.derby?.enhanced?3200:this.broadcastIntro?10500:this.career?(this.career.shortIntro?160:1100):1400;}
 introStarter(side){const index=side===this.userSide?this.homePitcherIndex:this.awayPitcherIndex;return this.pitchingStaff[side]?.[index]||this.pitchingStaff[side]?.[0];}
 skipIntro(){if(!this.broadcastIntro||this.mirror||this.paused)return false;this.beginHalf();return true;}
 get batter(){return (['practice','derby'].includes(this.mode)||this.mode==='career-bat'&&!this.career?.continuous)?this.teams.home.batters.find(p=>p.id===this.practiceBatter)||this.lineups.home[0]:this.lineups[this.side][this.battingIndex[this.side]%9];}
 get pitcher(){return this.pitchingStaff[this.side==='home'?'away':'home'][this.defending?this.homePitcherIndex:this.awayPitcherIndex];}
 get battingHand(){return this.batter.hand==='S'?(this.pitcher.hand==='L'?'R':'L'):this.batter.hand;}
 static clutchFor(p){
  const s=p?.stats;if(!s||!(s.pa>=150)||!Number.isFinite(s.rbi))return 0;
  const rate=s.rbi/s.pa;return rate>=.155?1:rate<=.085?-1:0;
 }
 conditionFor(player){
  const base=NightGame.conditionForSeed(this.isFixture||this.career?this.conditionSeed:null,player);
  // Survival ladder: the opponent plays above/below its base ratings
  // by the stage boost, and the user's players carry fatigue over
  // from previous games of the run. Both fold into the condition so
  // every existing matchup / control / fatigue path sees them.
  const sv=this.survival;
  if(!sv||!player?.id)return base;
  if((sv.oppIds||[]).includes(player.id))return base+Math.round(sv.boost/3);
  if((sv.userIds||[]).includes(player.id)){
   const isPitcher=player.pos==='P'||player.velocity!=null;
   const pts=(isPitcher?sv.fatiguePitchers:sv.fatigueBatters)?.[player.id]||0;
   if(pts)return base-NightGame.survivalPenalty(isPitcher,pts);
  }
  return base;
 }
 get batSize(){const scale=.62+this.matchup().contact/150+((this.batter.trait==='勝負強い'||NightGame.clutchFor(this.batter)>0)&&(this.bases[1]||this.bases[2])?.08:0);return {rx:(this.power?.24:.44)*scale,ry:(this.power?.24:.31)*scale};}
 matchup(p=this.batter){
  const condition=this.conditionFor(p);
  const split=p.matchupEvidence?.splits?.[this.pitcher.hand==='L'?'L':'R'];
  const sample=split?.pa??split?.ab;
  if(!split||!Number.isFinite(sample)||sample<20||!Number.isFinite(split.avg)){
   const perks=p.careerPerks||{};
   const left=this.pitcher.hand==='L'?((p.careerVsLeft||0)+(perks.left||0))*3:0;
   const platoon=p.hand==='S'?3:this.pitcher.hand===p.hand?-4:3;
   const clutch=(this.inning>=7&&(this.bases[1]||this.bases[2])?((perks.clutch||0)+NightGame.clutchFor(p))*4:0);
   return {contact:clamp(p.contact+left+clutch+condition*3+platoon+this.adaptationBonus(p),10,99),power:clamp(p.power+condition*3+Math.round(platoon/2),10,99),source:null};
  }
  const weight=sample/(sample+120),avg=p.stats?.avg??split.avg,iso=(p.stats?.slg??avg)-avg;
  return {contact:clamp(p.contact+condition*3+(split.avg-avg)*140*weight+(this.inning>=7&&(this.bases[1]||this.bases[2])?NightGame.clutchFor(p)*4:0)+this.adaptationBonus(p),20,99),power:clamp(p.power+condition*3+(Number.isFinite(split.slg)?split.slg-split.avg-iso:0)*100*weight,20,99),source:split.source};
 }
 adaptationBonus(p){
  if(!(this.defending||this.autoBatting||this.spectate||this.fastForward))return 0;
  const mem=this.pitchMemory?.[p.id];if(!mem||!this.pitch||!mem.recent?.length)return 0;
  const same=mem.recent.filter(t=>t===this.pitch.id).length;
  return clamp((same-1)*2,0,6);
 }
 get activeBatter(){return {...this.batter,...this.matchup()};}
 runnerRating(p){return p?.run??65;}
 get runnerSpeed(){return RUNNER_SPEED(this.runnerRating(this.batter));}
 batterStats(){return this.box[this.batter.id]||(this.box[this.batter.id]={pa:0,ab:0,h:0,hr:0,rbi:0,k:0,bb:0,r:0,doubles:0,triples:0});}
 endAtBat(kind,runs=0,simulated=false){const streakKey=this.inning+'/'+this.half+'/'+this.pitcher.id;this._strikeStreak={key:streakKey,n:kind==='strikeout'?(this._strikeStreak?.key===streakKey?this._strikeStreak.n:0)+1:0};this.atBatPitches=[];this.pitcherRecord().batters++;const b=this.batterStats();b.pa++;if(!['walk','hbp','sacrifice','sacrificefly'].includes(kind))b.ab++;if(kind==='sacrifice')b.sac=(b.sac||0)+1;if(kind==='sacrificefly')b.sf=(b.sf||0)+1;if(kind==='doubleplay')b.gidp=(b.gidp||0)+1;if(['single','double','triple','hr'].includes(kind))b.h++;if(kind==='hr')b.hr++;if(kind==='double')b.doubles=(b.doubles||0)+1;if(kind==='triple')b.triples=(b.triples||0)+1;if(kind==='strikeout'){b.k++;this.pitcherRecord().k=(this.pitcherRecord().k||0)+1;}if(kind==='walk'){b.bb++;this.pitcherRecord().bb=(this.pitcherRecord().bb||0)+1;}if(kind==='hbp'){b.hbp=(b.hbp||0)+1;this.pitcherRecord().hbp=(this.pitcherRecord().hbp||0)+1;}b.rbi+=runs;if(!simulated&&this.atBatRisp){if(!['walk','hbp','sacrifice','sacrificefly'].includes(kind))b.rispAb=(b.rispAb||0)+1;if(['single','double','triple','hr'].includes(kind))b.rispH=(b.rispH||0)+1;}this.atBatRisp=false;this.batFinished=true;
  if(this.career?.rivalId&&(this.pitcher.id===this.career.rivalId||this.batter.id===this.career.rivalId)){
   if(!simulated||this.batter.id===this.career.playerId||this.pitcher.id===this.career.playerId){
    const r=this.career.rivalStats||={pa:0,h:0,hr:0,k:0};
    r.pa++;if(['single','double','triple','hr'].includes(kind))r.h++;if(kind==='hr')r.hr++;if(kind==='strikeout')r.k++;
   }
  }
  if(simulated)return;
  if(['single','double','triple'].includes(kind)){
   const f=this.field,batter=f?.runners.find(r=>r.batter);
   if(f?.resolved&&batter&&!batter.out&&(batter.furthest??batter.progress)<1)f.hitMusicPending=true;
   else this.playHitMusic();
  }
  if(this.career?.continuous&&this.defending&&this.outs>=3)this.next='career';
  if(this.career){
   const c=this.career,tracking=c.metrics||={};
   const isHit=['single','double','triple','hr'].includes(kind),isBreaking=this.pitch&&this.pitch.id!=='fast';
   const important=this.inning>=7&&Math.abs(this.homeScore-this.awayScore)<=3;
   const bump=key=>{tracking[key]=(tracking[key]||0)+1;};
   if(this.defending){
    if(important&&kind==='strikeout')bump('pressure');
    if(kind==='strikeout'&&this.bases.some(Boolean))bump('withRunners');
   }else{
    if(isHit){
     if(this.pitcher.hand==='L')bump('leftHits');
     if(this.pitch&&Math.sign(this.pitch.targetX)!==(this.battingHand==='L'?-1:1)){
      bump('innerHits');
      const counts=tracking.byPitcher||={};
      counts[this.pitcher.id]=(counts[this.pitcher.id]||0)+1;
     }
     if(important&&(runs||this.bases[1]||this.bases[2]))bump('clutch');
     if(isBreaking)bump('breakingHits');
    }else if(kind==='strikeout'&&isBreaking)bump('breakingK');
   }
  }
  if(this.mode==='career-bat'){
   if(this.career.weakSchool){
    const bases={single:1,double:2,triple:3,hr:4}[kind]||0;
    const gained=NightCareerLeagues.rallyStrength(bases?1:0,bases,runs);
    this.career.pendingRally=Math.min(3,(this.career.pendingRally||0)*.72+gained);
   }
   const score=this.userScore-this.opponentScore,priorScore=score-runs;
   const moment=runs?(priorScore<0&&score===0?(kind==='walk'?'押し出し四球で同点':'同点打'):
    priorScore<=0&&score>0?(kind==='walk'?'押し出し四球で勝ち越し':'勝ち越し打'):runs+'打点'):null;
   (this.career.atBats||=[]).push({number:this.career.completed+1,inning:this.inning,half:this.half,kind,runs,moment});
   this.career.completed++;
   this.next=this.career.continuous||this.career.completed<this.career.opportunities?'career':'finish';
  }
 }
 get battingSlot(){return (this.battingIndex[this.userSide]+(this.batFinished&&this.side===this.userSide?1:0))%9;}
 get nextUserBatter(){return this.lineups[this.userSide][this.battingSlot];}
 get substitutionWindow(){return this.isFixture&&this.phase!=='ended'&&this.outs<this.outsNeeded&&this.next!=='finish'&&(['intro','change','aim','windup'].includes(this.phase)||(this.phase==='result'&&(!this.field||this.field.runners.every(r=>r.out||Math.abs(r.progress-(r.target??r.start))<.01))));}
 bench(side=this.userSide){return this.teams[side].batters.filter(p=>!this.lineups[side].some(b=>b.id===p.id)&&!this.removedPlayers[side].includes(p.id));}
 canPinchHit(){return this.substitutionWindow&&!this.defending;}
 canPinchRun(base){return this.canPinchHit()&&Number.isInteger(base)&&base>=0&&base<3&&this.bases[base]&&this.lineups[this.userSide].some(p=>p.id===this.baseIds[base]);}
 substitute(id,{type='hit',base=null}={}){
  if(this.umpireMode)return false;
  if(this.mirror)return false;
  if(type==='run'?!this.canPinchRun(base):type!=='hit'||!this.canPinchHit())return false;
  const side=this.userSide,player=this.bench(side).find(p=>p.id===id);if(!player)return false;
  const slot=type==='run'?this.lineups[side].findIndex(p=>p.id===this.baseIds[base]):this.battingSlot,old=this.lineups[side][slot];
  if(this.baseIds.includes(id)||type==='hit'&&this.baseIds.includes(old.id))return false;
  this.replaceBatter(slot,player,type,base);
  if(this.phase==='result'&&this.field){this.field=null;this.hit=null;}
  this.notify();return true;
 }
 replaceBatter(slot,player,type='hit',base=null){
  const side=this.userSide,old=this.lineups[side][slot];
  this.lineups[side][slot]={...player,fieldPos:old.fieldPos||old.pos};
  this.removedPlayers[side].push(old.id);
  this.participants[side].push(player.id);
  if(type==='run')this.baseIds[base]=player.id;
  this.substitutions.push({type,inning:this.inning,half:this.half,side,slot,base,outId:old.id,inId:player.id,outName:old.name,inName:player.name});
 }
 swapFieldPosition(id,pos){
  if(this.umpireMode)return false;
  if(this.mirror)return false;
  if(!this.substitutionWindow)return false;const lineup=this.lineups[this.userSide],a=lineup.find(p=>p.id===id),b=lineup.find(p=>p.fieldPos===pos);if(!a||!b||a===b)return false;
  [a.fieldPos,b.fieldPos]=[b.fieldPos,a.fieldPos];this.notify();return true;
 }
 fielder(pos,side=this.side==='home'?'away':'home'){
  if(pos==='P')return {...this.pitcher,run:58,field:74,arm:this.pitcher.velocity-65};
  const p=this.lineups[side].find(p=>(p.fieldPos||p.pos)===pos)||this.lineups[side][0];
  const fits=p.pos===pos||(p.positions||[]).includes(pos),factor=fits?1:pos==='C'?.55:.74;
  return {...p,field:Math.round(p.field*factor),arm:Math.round(p.arm*(fits?1:.85))};
 }
 pitcherRecord(p=this.pitcher){return this.pitchingStats[p.id] ||= {pitches:0,batters:0,outs:0,runs:0,k:0,bb:0,h:0};}
 canChangePitcher(){return this.substitutionWindow&&this.defending&&this.phase!=='windup';}
 changePitcher(index){
  if(this.umpireMode)return false;
  if(this.mirror)return false;
  if(!this.canChangePitcher()||!Number.isInteger(index)||this.usedPitchers.includes(index)||!this.pitchingStaff[this.userSide][index])return false;
  const old=this.pitcher;this.homePitcherIndex=index;this.usedPitchers.push(index);this.stamina=100;this.pitchHistory=[];this.pitchType='fast';this.pitch=null;
  this.substitutions.push({type:'pitch',inning:this.inning,half:this.half,side:this.userSide,outId:old.id,inId:this.pitcher.id,outName:old.name,inName:this.pitcher.name});
  this.notify();return true;
 }
 managerContext(){
  const side=this.side,other=side==='home'?'away':'home',order=this.lineups[side]||[],next=order[(this.battingIndex[side]+1)%Math.max(1,order.length)];
  const b=this.batter,catcher=this.fielder('C',other);
  return {balls:this.balls,strikes:this.strikes,outs:this.outs,outsNeeded:this.outsNeeded,inning:this.inning,total:this.totalInnings,lead:this[side+'Score']-this[other+'Score'],bases:this.bases,contact:b.contact,power:b.power,catcherArm:catcher?.arm??65,pitcherFatigue:this.pitchFatigue(),threat:b.contact+b.power,nextThreat:next?next.contact+next.power:130};
 }
 managerForSide(side){return this.remoteSide?NightGame.MANAGERS[0]:side===this.opponentSide?(this.cpuManager||NightGame.managerFor(this.teams[side]?.id)):NightGame.managerFor(this.teams[side]?.id);}
 cpuRelief(){
  if((!this.isFixture&&!this.career?.continuous)||this.balls||this.strikes||this.remotePitching)return;
  const side=this.opponentSide,current=this.pitchingStaff[side][this.awayPitcherIndex];if(!current)return;
  const record=this.pitcherRecord(current),mgr=this.managerForSide(side);
  const unused=this.pitchingStaff[side].map((p,i)=>({p,i})).filter(({i})=>!this.usedCpuPitchers.includes(i));
  if(!unused.length)return;
  const d=NightGame.reliefDecision(mgr,{role:current.role,pitches:record.pitches,runs:record.runs,stamina:current.stamina,inning:this.inning,total:this.totalInnings,lead:this[side+'Score']-this[this.userSide+'Score'],continuous:!!this.career?.continuous,hasCloser:unused.some(({p})=>p.role==='CP')});
  if(!d.change)return;
  const rank=({p})=>(p.movement??65)+(p.control??65)+(p.role===d.prefer?45:0)-(d.protectCloser&&p.role==='CP'?65:0)-(p.role==='SP'?25:0);
  const choice=unused.sort((a,b)=>rank(b)-rank(a))[0];
  if(choice){this.awayPitcherIndex=choice.i;this.usedCpuPitchers.push(choice.i);this.substitutions.push({type:'pitch',inning:this.inning,half:this.half,side,outId:current.id,inId:choice.p.id,outName:current.name,inName:choice.p.name});}
 }

 get defending(){return (this.half==='top')===this.userHome;}
 get inMatch(){return this.isFixture||this.mode==='pitching'||!!this.career||!!this.challenge;}
 message(en,ja,sub='',kind='',speech='',homeRunRuns=0,celebration=null){const data={en,ja,sub,kind,speech};if(celebration)data.celebration={...celebration};if(en==='HOME RUN'&&homeRunRuns>=1&&homeRunRuns<=4)data.homeRunRuns=homeRunRuns;if(this.log){this.log.push({inning:this.inning,half:this.half,...data,batter:this.batter?.name||''});if(this.log.length>80)this.log.shift();}this.emit('message',data);}
 notify(){this.emit('update',this);}
 setPhase(p){if(p!=='result')this.umpireReveal=null;this.phase=p;this.phaseTime=0;}
 get homeRunRunning(){
  return !this.derby&&this.phase==='result'&&this.field?.outcome==='hr'&&
   this.field.runners.some(r=>!r.out&&r.progress<3.99);
 }
 skipHomeRunRun(){
  if(this.mirror)return false;
  if(!this.homeRunRunning||this.paused)return false;
  for(const runner of this.field.runners){
   if(runner.out)continue;
   Object.assign(runner,{target:4,progress:4,x:BASES[4].x,y:BASES[4].y,running:false});
  }
  this.phaseTime=Math.max(this.phaseTime,this.runningDemo?3301:621);
  return true;
 }
 setCursor(x,y){if(this.paused||this.umpireMode)return;this.cursor={x:clamp(x,-1.55,1.55),y:clamp(y,-1.55,1.55)};}
 update(dt,holdResult=false){
  if(dt<=0||this.paused||['ended','change','derby-break','career-pregame','career-ready'].includes(this.phase))return;
  if(this.phase==='cinematic'){this.phaseTime+=Math.min(dt,100);if(this.phaseTime>=(this.broadcastCut?.duration||1000))this.endBroadcastCut();return;}
  const derby=this.derby;
   if(derby&&this.phase!=='intro'&&derby.mode!=='simulation'){
    // Real time throughout the entire active turn, including ball flight,
    // rolls, misses and celebrations. Only a released final pitch can finish
    // after time expires; an unfinished windup cannot become another pitch.
    derby.remaining=Math.max(0,derby.remaining-dt);
    if(derby.pendingFinish){
     if(this.phaseTime>=NightGame.derbyResultDuration(this.field,this.hit,true)){this.finishDerbyTurn();return;}
    }else if(!derby.remaining){
     if(!['pitch','field','miss','result'].includes(this.phase)){this.finishDerbyTurn();return;}
     if(this.phase==='result'&&(!derby.enhanced||this.phaseTime>=NightGame.derbyResultDuration(this.field,this.hit))){this.finishDerbyTurn();return;}
    }
   }
  const ta=this.timeAttack;
  if(ta&&this.phase!=='intro'){
   ta.remaining=Math.max(0,ta.remaining-dt);
   if(!ta.remaining&&!['field','miss'].includes(this.phase)){this.finishTimeAttack();return;}
  }
  if((this.fastForward||this.spectate)&&this.defending&&!this.autoDefense)this.autoDefense=true;
   dt=Math.min(dt,this.phase==='field'?240:50);if(this.fastForward)dt*=4;if(this.phase==='pitch'&&!this.defending&&this.battingAssist&&this.pitch.progress>.62&&this.pitch.progress<1.12)dt*=.76;if(this.autoDefense&&this.defending&&!['intro','abs-call','abs-review','play-call','play-review'].includes(this.phase))dt*=this.defenseSpeed;else if(!derby&&(this.phase==='field'||this.phase==='result'&&this.field))dt*=this.fieldSpeed;this.time+=dt;this.phaseTime+=dt;this.swingAge+=dt;if(this.phase==='result'&&this.field){this.updateRunners(dt/1000);this.updateFoulMotion(dt/1000);if(derby?.enhanced)this.updateDerbyRoll(dt/1000);}
  if(this.phase==='intro'&&this.phaseTime>=this.introDuration){this.beginHalf();}
  else if(this.phase==='abs-call'&&this.absCall?.cpu&&!this.absCall.remote&&this.phaseTime>=NightGame.ABS_TIMING.cpuCall){
   this.setPhase('abs-review');this.notify();
  }
  else if(this.phase==='abs-call'&&!this.onlineDecisionManaged&&this.phaseTime>=this.absCallDuration+(this.onlineGame?800:0)+(this.absCall?.remote?700:0))this.resolveAbsCall(false);
  else if(this.phase==='abs-review'&&this.phaseTime>=NightGame.ABS_TIMING.reviewEnd)this.resolveAbsCall(true);
  else if(this.phase==='play-call'){
   if(this.umpireMode){/* Umpire mode: the window waits for the player's own safe/out call. */}
   else if(this.baseCall?.auto){if(this.phaseTime>=700){if(this.baseCall.willChallenge){this.setPhase('play-review');this.notify();}else this.resolvePlayCall(false);}}
   else if(!this.onlineDecisionManaged&&this.phaseTime>=2600)this.resolvePlayCall(false);
  }
  else if(this.phase==='play-review'&&this.phaseTime>=1400)this.resolvePlayCall(true);
  else if(this.phase==='aim'&&(this.autoDefense||this.umpireMode)&&this.defending&&this.phaseTime>480)this.autoPitch();
  else if(this.phase==='windup'&&this.phaseTime>(this.pitch?.windupMs??(derby?270:700))){if(!this.pitch.delivered){this.pitch.delivered=true;const record=this.pitcherRecord();record.workload=(record.workload??record.pitches*1.65)+(this.pitch.cost??1.65);record.pitches++;if(this.defending)this.session.thrown++;}this.setPhase('pitch');this.emit('sound','pitch');this.notify();}
  else if(this.phase==='pitch'){
   this.pitch.progress=this.phaseTime/this.pitch.duration;
   if((this.defending||this.autoBatting||this.umpireMode)&&!this.pitch.cpuActed&&this.pitch.progress>=this.pitch.cpuTime){this.pitch.cpuActed=true;this.cpuBat();}
   // v160: the mitt sound belongs to the ball's arrival (progress 1.0),
   // not to the call resolution in take()/commitCalledPitch()/strike(),
   // which only runs at progress 1.24 — or, when an ABS challenge window
   // opens, seconds later. Fire it at the arrival frame, once per pitch;
   // the resolution paths keep a guarded fallback (catchPitchSound) for
   // direct calls that never pass through this frame loop.
   if(this.phase==='pitch'&&!this.pitch.swung&&!derby&&this.pitch.progress>=1)this.catchPitchSound();
   if(this.phase==='pitch'&&this.pitch.progress>1.24&&!(this.remoteBatter&&!this.pitch.swung&&(this.onlineGame?this.phaseTime<this.pitch.duration*1.24+Math.max(70,Math.min(500,(this.onlineRttMs??180)+70)):this.pitch.progress<1.8)))this.take();
  }else if(this.phase==='miss'){
   // A whiff leaves the ball travelling: pitch.progress froze when the
   // swing missed, and the renderers extend it by phaseTime/duration
   // (capped at 1.24). The mitt sound fires when that extended travel
   // reaches the catcher (u>=1), not when strike() resolves 330 ms later.
   if(this.pitch&&this.pitch.progress+this.phaseTime/(this.pitch.duration||1)>=1)this.catchPitchSound();
   if(this.phaseTime>330)this.strike(true);
  }
  else if(this.phase==='field'){let remaining=dt/1000;while(remaining>1e-6&&this.phase==='field'){const untilCatch=this.field?.throw?Math.max(.000001,this.field.throw.duration-this.field.throw.t):Infinity;const step=Math.min(remaining,1/120,untilCatch);this.updateField(step);remaining-=step;}}
  else if(this.phase==='result'&&!derby?.pendingFinish&&(!holdResult||derby)&&this.phaseTime>(derby?(derby.enhanced?NightGame.derbyResultDuration(this.field,this.hit):(this.hit?.kind==='hr'?700:240)):this.field?(this.runningDemo?3300:this.field.outcome==='foul'?850:620):this.pitch?.callResult?NightGame.ABS_TIMING.pitchResult:720)){
   if(this.challenge&&(this.field&&!this.field.foul||this.outs>=this.outsNeeded))return;
   if(this.field&&this.phaseTime<18000&&this.field.runners.some(r=>!r.out&&Math.abs(r.progress-(r.target??r.start))>.01))return;
   if(typeof this.career?.queuedRunningMode==='boolean'){
    this.manualRunning=this.career.queuedRunningMode;delete this.career.queuedRunningMode;
   }
   if(this.inMatch&&this.outs>=this.outsNeeded&&this.next==='pitch')this.next='half';
   if(this.pendingWorldBatting&&this.next!=='finish'){this.applyWorldBatting();return;}
   if(this.career?.continuous&&['career','half','finish'].includes(this.next))this.advanceCareer();
   else if(this.next==='finish')this.finish();else if(this.next==='career')this.beginCareerBat();else if(this.next==='half')this.changeHalf();else this.prepare();
  }
 }
 seedRunners(count=3,outs=2){
  this.outs=outs;
  this.bases=[0,1,2].map(i=>i<count);
  this.baseIds=this.bases.map((occupied,i)=>occupied?this.lineups[this.side][(this.battingIndex[this.side]-i-1+18)%9].id:null);
  this.basePitcherIds=this.baseIds.map(id=>id?this.pitcher.id:null);
 }
 seedHalf(){
  if(this.loadedStart)this.seedRunners();
  else if(this.apbcFixtureId&&this.inning>this.totalInnings)this.seedRunners(2,0);
 }
 beginHalf(){
  if(this.career?.continuous&&this.phase==='intro'){this.advanceCareer();return;}
  if(this.handicap)this.outsNeeded=this.side===this.userSide?this.handicap.userOuts:this.handicap.cpuOuts;
  this.halfBreak=null;const scores=this[this.side];if(scores[this.inning-1]==null)scores[this.inning-1]=0;if(this.phase==='intro'){
   if(this.mode==='career-bat'){this.beginCareerBat();return;}
   if(this.mode==='career-pitch'&&this.career.startInning){
    const c=this.career;
    this.inning=c.startInning;
    const start=c.scenarios?.[0];
    const own=c.role==='rotation'?0:c.role==='closer'?3:start?.home??(c.role==='mop'?1:3);
    const opp=c.role==='rotation'?0:c.role==='closer'?2:start?.away??(c.role==='mop'?4:2);
    if(this.inning>1){
     this.addCareerInningRuns('home',own,1,this.inning-1,'entry');
     this.addCareerInningRuns('away',opp,1,this.inning-1,'entry');
    }
    this.away[this.inning-1]??=0;
    if(c.fireman){
     this.seedRunners(3,2);
     this.basePitcherIds.fill('career-previous-pitcher');
    }
   }
   this.seedHalf();
   if(this.mode==='career-pitch'){this.offerCareerAppearance();return;}
  }
  this.prepare();
 }
 acknowledgeHalf(){
  if(this.mirror)return false;
  if(this.phase!=='change'||this.paused)return false;this.beginHalf();return true;
 }
 beginCareerBat(){
  const c=this.career,situation=c.scenarios?.[c.completed];
  if(c.continuous||!c.scenarios){this.advanceCareer();return;}
  if(!situation){this.finish();return;}
  const previous=c.scenarios[c.completed-1];
  this.inning=situation.inning;
  let rallyRuns=0;
  if(c.weakSchool&&c.completed&&c.pendingRally){
   const chances=Math.max(2,(situation.inning-previous.inning)*3);
   const rng=NightCareerLeagues.random(c.teamSeed+'/'+c.fixtureId+'/rally/'+c.completed);
   const rally=NightCareerLeagues.rallyRuns(rng,c.pendingRally,chances);
   c.pendingRally*=.62;
   c.teammateHits=(c.teammateHits||0)+rally.hits;
   rallyRuns=rally.runs;
  }
  const loggedHome=this.addCareerInningRuns('home',situation.home+rallyRuns,previous?.inning||1,this.inning,c.completed);
  const loggedAway=this.addCareerInningRuns('away',situation.away,Math.min(this.inning,(previous?.inning||0)+1),this.inning,c.completed);
  c.simulatedRuns=previous?[...loggedAway,...loggedHome].sort((a,b)=>a.inning-b.inning||Number(a.side==='home')-Number(b.side==='home')):[];
  this.resetCount();
  // Each featured appearance starts with its own runners and game situation.
  this.battingIndex.home=Math.max(0,this.lineups.home.findIndex(p=>p.id===c.playerId));
  this.batFinished=false;
  this.bunt=false;
  this.seedRunners(situation.bases,situation.outs);
  this.offerCareerAppearance();
 }
 canSwitchWorldBatting(playerId){
  return !!this.worldFixture&&this.mode==='match'&&!this.pendingWorldBatting&&this.phase!=='ended'&&this.next!=='finish'&&
   (this.lineups[this.userSide].some(p=>p.id===playerId)||this.bench().some(p=>p.id===playerId));
 }
 switchWorldBatting(activity){
  if(!activity||activity.pitching||activity.fixtureId!==this.worldFixture||!this.canSwitchWorldBatting(activity.playerId))return false;
  this.pendingWorldBatting=activity;
  if(['intro','change','aim'].includes(this.phase)||this.phase==='windup'&&!this.pitch?.delivered)this.applyWorldBatting();
  return true;
 }
 applyWorldBatting(){
  const activity=this.pendingWorldBatting;
  delete this.pendingWorldBatting;
  const pinching=!this.lineups[this.userSide].some(p=>p.id===activity.playerId);
  this.career={...activity,pinching,opportunities:null,completed:this.box[activity.playerId]?.pa||0};
  this.mode='career-bat';
  this.autoDefense=false;
  this.halfBreak=null;
  this.touch=null;
  this.advanceCareer(false,true);
 }
 advanceCareer(auto=false,keepCount=false){
  const c=this.career;
  this.field=null;this.hit=null;this.pitch=null;this.bunt=false;
  if(!keepCount)this.resetCount();
  c.simulatedRuns=[];
  for(let plates=0;plates<3000;plates++){
   if(this.batFinished){this.battingIndex[this.side]=(this.battingIndex[this.side]+1)%9;this.batFinished=false;}
   const regulation=this.inning>=this.totalInnings;
   if(regulation&&this.half==='bottom'&&this.homeScore>this.awayScore||
    this.outs>=3&&regulation&&(this.half==='top'?this.homeScore>this.awayScore||this.drawDecidesSeries&&this.homeScore===this.awayScore:this.homeScore!==this.awayScore||this.maxInnings&&this.inning>=this.maxInnings)){
    c.simulationFinal=true;this.finish();return;
   }
   if(this.outs>=3){
    if(c.pitching&&this.defending&&c.pitchActive){
     c.completed++;
     if(c.completed>=c.opportunities){
      c.pitchActive=false;c.pitchDone=true;
      this.homePitcherIndex=this.nextCareerReliever();
     }
    }
    if(this.half==='top')this.half='bottom';else{this.half='top';this.inning++;}
    this.outs=0;this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];
    this.stamina=Math.min(100,this.stamina+15);
    if(this.inning>this.totalInnings&&!this.worldFixture){
     const order=this.lineups[this.side],idx=this.battingIndex[this.side];
     this.bases[1]=true;this.baseIds[1]=order[(idx+8)%9].id;
     this.basePitcherIds[1]=this.pitcher.id;
    }
   }
   this[this.side][this.inning-1]??=0;
   const canEnter=c.role!=='inactive'&&this.inning>=c.entryInning;
   if(c.pitching&&this.defending&&canEnter&&!c.pitchDone&&!c.pitchActive&&
    (!c.fireman||this.outs===2&&this.bases.some(Boolean)||this.inning>=c.entryInning+1)){
    c.pitchActive=true;this.homePitcherIndex=0;this.usedPitchers.push(0);this.stamina=100;this.pitchHistory=[];
    const lead=this.userScore-this.opponentScore;
    c.saveEligible=c.role==='closer'&&lead>0&&(lead<=3||lead<=this.bases.filter(Boolean).length+2);
   }
   if(!c.pitching&&!this.defending&&canEnter&&c.pinching&&!c.batEntered&&this.battingIndex[this.side]===c.slot&&
    !this.balls&&!this.strikes&&!this.baseIds.includes(this.batter.id)){
    const player=this.bench().find(p=>p.id===c.playerId);
    if(player){this.replaceBatter(c.slot,player);c.batEntered=true;}
   }
   if(!this.defending&&!this.balls&&!this.strikes)this.cpuRelief();
   else if(!c.pitchActive){
    const pitcher=this.pitcher,limit=pitcher.role==='SP'?74:24;
    if(this.pitcherRecord(pitcher).pitches>=limit)this.homePitcherIndex=this.nextCareerReliever();
   }
   const live=!auto&&(c.opportunities==null||c.completed<c.opportunities)&&(c.pitching?this.defending&&c.pitchActive:!this.defending&&this.batter.id===c.playerId);
   const key=c.important&&this.inning>=7||this.inning>=7&&Math.abs(this.homeScore-this.awayScore)<=2||
    (this.inning>=5&&(this.bases[1]||this.bases[2]));
   if(live&&(!c.keyOnly||key||c.firstAppearance&&c.completed===0)){this.offerCareerAppearance();return;}
   this.simulateCareerPlate();
   this.resetCount();
  }
  // The simulation can yield in a very long extra-inning game instead of leaving the UI blocked.
  this.setPhase('result');this.next='career';this.notify();
 }
 nextCareerReliever(){
  const c=this.career,staff=this.pitchingStaff[this.userSide];
  const unused=staff.map((p,i)=>({p,i})).filter(({i})=>!this.usedPitchers.includes(i)&&(!c.pitching||i!==0));
  const preferred=this.inning>=8?'CP':'RP';
  const next=unused.find(({p})=>p.role===preferred)||unused.find(({p})=>p.role!=='SP')||unused[0];
  if(next){this.usedPitchers.push(next.i);return next.i;}
  return this.homePitcherIndex===0&&c.pitching?c.reservePitcher:this.homePitcherIndex;
 }
 simulateCareerPlate(){
  const c=this.career,side=this.side,bat=this.batter,pitch=this.pitcher,record=this.pitcherRecord();
  const rng=NightCareerLeagues.random(c.teamSeed+'/'+c.fixtureId+'/plate/'+(c.simulatedPlates=(c.simulatedPlates||0)+1));
  const attack=this.matchup(bat),command=pitch.control+this.conditionFor(pitch)*3,movement=pitch.movement;
  const fatigue=clamp((record.pitches-pitch.stamina*.65)/75,0,.55);
  const defense=NightGame.POS.map(([pos])=>this.fielder(pos));
  const field=defense.reduce((n,f)=>n+f.field,0)/defense.length;
  const own=!this.defending,player=bat.id===c.playerId,weakLift=own&&!player?(c.pendingRally||0):0;
  const bb=clamp(.070+(58-command)*.0015+(attack.contact-56)*.0004+fatigue*.06+this.balls*.032-this.strikes*.008,.028,.29);
  const k=clamp(.175+(movement-57)*.0013+(pitch.velocity-138)*.0025-(attack.contact-55)*.002-fatigue*.06+this.strikes*.065-this.balls*.012,.085,.43);
  const hit=clamp(.237+(attack.contact-58)*.00215-(command-58)*.00085-(movement-56)*.00078-
   (field-58)*.00075+(own?(c.teamAttack||0):-(c.teamDefense||0))*.022+weakLift*.025+fatigue*.08,.09,.47);
  const power=clamp(.020+(attack.power-55)*.0012+(pitch.velocity<130?.011:0),.003,.12);
  const roll=rng(),before=this.battingScore;
  record.pitches+=Math.round(2+rng()*5);record.workload=(record.workload||0)+5;
  let kind='groundout';
  if(roll<bb){kind='walk';this.walk();}
  else if(roll<bb+k){kind='strikeout';record.outs++;this.outs++;}
  else if(roll<bb+k+hit){
   const extra=rng(),bases=this.hitAdvance(extra<power*3?4:extra<power*3+.027+(bat.run-40)*.00045?3:extra<power*3+.235?2:1);
   kind=['','single','double','triple','hr'][bases];record.h++;
   this[side+'Hits']++;
   this.advance(bases);
   if(bases<3&&this.bases[2]&&this.outs<3&&!(this.half==='bottom'&&this.inning>=this.totalInnings&&this.homeScore>this.awayScore)){
    const runner=this.lineups[side].find(p=>p.id===this.baseIds[2]);
    if(rng()<clamp(.28+((runner?.run??55)-55)*.006+(this.outs===2?.17:0)+(bases===2?.10:0),.10,.71)){
     this.run(this.baseIds[2],this.basePitcherIds[2]);
     this.bases[2]=false;this.baseIds[2]=null;this.basePitcherIds[2]=null;
    }
   }
   if(weakLift)c.teammateHits=(c.teammateHits||0)+1;
   if(player&&c.weakSchool)c.pendingRally=Math.min(3,(c.pendingRally||0)*.72+NightCareerLeagues.rallyStrength(1,bases,this.battingScore-before));
  }else{
   const fielder=defense[2+Math.floor(rng()*(defense.length-2))],ownFielder=!c.pitching&&fielder.id===c.playerId;
   const tracking=ownFielder?c.fieldStats||={fieldChances:0,fieldOuts:0,errors:0}:null;
   if(tracking)tracking.fieldChances++;
   if(rng()<clamp(.022+(64-fielder.field)*.00075,.006,.061)){
    kind='error';const club=side==='home'?'away':'home';this[club+'Errors']++;
    if(tracking)tracking.errors++;
    this.walk();
   }else{
    if(tracking)tracking.fieldOuts++;
    this.outs++;record.outs++;
    if(this.bases[0]&&this.outs<3&&rng()<.12){
     kind='doubleplay';this.outs++;record.outs++;this.bases[0]=false;this.baseIds[0]=null;this.basePitcherIds[0]=null;
    }
   }
  }
  if(weakLift)c.pendingRally*=.83;
  const runs=this.battingScore-before;
  if(runs){
   const last=c.simulatedRuns.at(-1);
   if(last?.side===side&&last.inning===this.inning)last.runs+=runs;
   else c.simulatedRuns.push({side,inning:this.inning,runs});
  }
  this.endAtBat(kind,runs,true);
  this.battingIndex[side]=(this.battingIndex[side]+1)%9;
  this.batFinished=false;
 }
 addCareerInningRuns(side,runs,from,to,key){
  const c=this.career;
  const changes=NightCareerLeagues.inningRuns(this[side],runs,from,to,[c.teamSeed,c.fixtureId,side,key].join('/'));
  this[side+'Score']+=runs;
  return changes.map(change=>({...change,side}));
 }
 offerCareerAppearance(){
  if(!this.career?.presentation){this.prepare();return;}
  this.field=null;this.hit=null;this.pitch=null;
  this.setPhase('career-ready');
  this.emit('clear');
  this.notify();
  this.emit('career-ready',this);
 }
 acknowledgeCareerAppearance(){
  if(this.phase!=='career-ready')return false;
  this.prepare();
  return true;
 }
 changeHalf(){
  this.steal=false;
  const endedHalf={inning:this.inning,half:this.half};
  if(this.batFinished){this.battingIndex[this.side]=(this.battingIndex[this.side]+1)%9;this.batFinished=false;this.bunt=false;this.steal=false;}
  if(this.mode==='career-pitch'){
   this.career.completed++;
   if(this.career.completed===this.career.opportunities){this.finish();return;}
  }
  if(this.mode==='pitching'||this.mode==='career-pitch'){
   const c=this.career;
   if(c?.teamSeed){
    const rng=NightCareerLeagues.random(c.teamSeed+'/'+c.fixtureId+'/support/'+this.inning);
    const runs=Number(rng()<.31+c.teamAttack*.11)+Number(rng()<.10+c.teamAttack*.035);
    c.simulatedRuns=this.addCareerInningRuns('home',runs,this.inning,this.inning,'support');
   }
   this.inning++;this.outs=0;this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];
   this.stamina=Math.min(100,this.stamina+20);this.resetCount();
   if(c){this.away[this.inning-1]??=0;this.offerCareerAppearance();}else this.prepare();
   return;
  }
  if(this.timeAttack){
   // Time attack never switches sides: the completed half's outs are
   // banked (pitching kind), the bases clear, and the same half starts
   // again as the next set. No 'change' break — the clock is running.
   const ta=this.timeAttack;
   if(ta.kind==='pitch')ta.outs+=this.outs;
   ta.halves++;
   this.inning++;if(this.home.length<this.inning){this.home.push(null);this.away.push(null);}
   this.outs=0;this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];this.resetCount();this.cursor={x:0,y:0};this.field=null;this.hit=null;this.stamina=Math.min(100,this.stamina+12);
   this.message('TIME ATTACK',`${ta.halves+1}セット目 · ${ta.kind==='bat'?'あなたの攻撃':'あなたの投球'}`,'3アウトでも時間内は続きます');
   this.prepare();return;
  }
  if(this.half==='top'){
   if((this.inning>=this.totalInnings&&this.homeScore>this.awayScore)||(this.drawDecidesSeries&&this.homeScore===this.awayScore)||(this.mercyRule&&this.homeScore-this.awayScore>=10)){this.finish();return;}this.half='bottom';
  }else{if((this.inning>=this.totalInnings&&(!(this.mode==='pennant'||this.apbcFixtureId||this.worldFixture)||this.homeScore!==this.awayScore)&&!(this.tiebreak&&this.homeScore===this.awayScore&&this.inning<this.totalInnings+3))||(this.maxInnings&&this.inning>=this.maxInnings)||(this.mercyRule&&Math.abs(this.homeScore-this.awayScore)>=10)){this.finish();return;}this.inning++;if(this.home.length<this.inning){this.home.push(null);this.away.push(null);}this.half='top';this.stamina=Math.min(100,this.stamina+12);}
  this.outs=0;this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];this.resetCount();this.cursor={x:0,y:0};this.field=null;this.hit=null;this.halfBreak={...endedHalf,nextInning:this.inning,nextHalf:this.half};this.setPhase('change');
  if(this.tiebreak&&this.inning>this.totalInnings&&!this.loadedStart&&!this.career){const side=this.side,order=this.lineups[side],runner=order[((this.battingIndex[side]-1)%9+9)%9];if(runner){this.bases[1]=true;this.baseIds[1]=runner.id;this.basePitcherIds[1]=this.pitcher.id;}}
  if(this.handicap)this.outsNeeded=this.side===this.userSide?this.handicap.userOuts:this.handicap.cpuOuts;
  this.seedHalf();this.message('CHANGE',`${this.inning}回${this.half==='top'?'オモテ':'ウラ'} · ${this.defending?'あなたの投球':'あなたの攻撃'}`,this.loadedStart?'2アウト満塁から再開':this.apbcFixtureId&&this.inning>this.totalInnings?'無死一・二塁から再開':this.defending?'球種を選び、画面で狙って離す':'カーソルを合わせて SWING');this.notify();
 }
 prepare(){
  // Never start another plate appearance in a completed half.
  if(this.derby?.enhanced&&this.derby.mode!=='simulation'&&!this.derby.remaining){this.finishDerbyTurn();return;}
  if(this.inMatch&&this.outs>=this.outsNeeded){if(this.challenge)return;if(this.career?.continuous){this.advanceCareer();return;}this.changeHalf();return;}
  if(this.batFinished){this.battingIndex[this.side]=(this.battingIndex[this.side]+1)%9;this.batFinished=false;this.bunt=false;}
  this.field=null;this.hit=null;this.pitch=null;this.runningDemo=false;this.next='pitch';this.emit('clear');
  const fieldSide=this.side==='home'?'away':'home';this.remotePitching=!!this.remoteSide&&fieldSide===this.remoteSide;this.remoteBatter=!!this.remoteSide&&this.side===this.remoteSide;
  if(this.defending){this.cpuShiftNow=false;if((this.autoDefense||this.spectate||this.fastForward)&&this.cpuWantsIBB()&&this.intentionalWalk(true))return;this.setPhase('aim');this.notify();return;}
  if(this.remotePitching){this.cpuShiftNow=false;if(!this.career?.continuous||!this.balls&&!this.strikes)this.cpuRelief();this.setPhase('aim');this.notify();return;}
  if(this.derby){this.createPitch(TYPES[0],{x:rnd(-.45,.45),y:rnd(-.13,.36)});return;}
  if(!this.career?.continuous||!this.balls&&!this.strikes)this.cpuRelief();
  const plan=this.cpuPitchPlan();
  const type=this.mode==='practice'&&this.practicePitch!=='random'?(TYPES.find(p=>p.id===this.practicePitch)||plan.type):plan.type;
  const target=this.isFixture||this.mode==='career-bat'
   ?plan.target:{x:rnd(-.9,.9),y:rnd(-.88,.88)};
  this.createPitch(type,target);
  if(!this.balls&&!this.strikes)this.cpuShiftNow=Math.random()<NightGame.managerTactics(this.managerForSide(fieldSide),this.managerContext()).shift;
  if(this.cpuWantsIBB())this.intentionalWalk(true);
 }
 windNow(){return NightGame.isIndoorPark(this.park)?0:((this.park.customSpec?.windMode==='fixed'?this.park.customSpec.windSpeed:this.wind??this.park.wind)||0)+(this.weather==='rain'?-1.2:0);}
 windVector(){const s=this.park.customSpec;if(s?.windMode==='fixed'&&!NightGame.isIndoorPark(this.park)){const a=s.windDirection*Math.PI/180;return {x:Math.sin(a)*s.windSpeed,y:Math.cos(a)*s.windSpeed+(this.weather==='rain'?-1.2:0)};}return this.windNow();}
 pitchFatigue(){
  if(this.defending)return clamp(1-this.stamina/100,0,1);
  const record=this.pitchingStats[this.pitcher.id];
  const workload=record?.workload??(record?.pitches??0)*1.65;
  return clamp(workload*.84/Math.max(35,this.pitcher.stamina),0,1);
 }
 cpuPitchPlan(){
  const p=this.pitcher,control=clamp(p.control+this.conditionFor(p)*3,10,99),b=this.activeBatter,recent=this.pitchTrace.filter(x=>x.pitcherId===p.id).slice(-3),two=this.strikes===2,behind=this.balls>this.strikes;
  const read=this.mode==='career-bat'?this.career.opponentPlan:null;
  const plate=(this.atBatPitches||[]).slice(-4),history=plate.length?plate:recent;
  const discipline=NightGame.cpuDiscipline(b).walk,risp=!!(this.bases[1]||this.bases[2]);
  const lateClose=this.inning>=Math.max(3,this.totalInnings-2)&&Math.abs(this.homeScore-this.awayScore)<=2;
  const tactics={balls:this.balls,strikes:this.strikes,recent:history,power:b.power,discipline,risp,lateClose,control};
  const counter=(read?.byPitcher?.[p.id]??(read?.byPitcher?0:read?.inner??0))>=2;
  const pitcherStyle=this.mode==='career-bat'?Number(p.id.charCodeAt(p.id.length-1))%3:-1;
  let weighted=p.pitches.map(id=>{
   const detail=p.pitchDetails?.[id]||{};
   let weight=Number.isFinite(detail.usage)?Math.max(.1,detail.usage):id==='fast'?3:1.4;
   if(two&&['fork','split','slider','vslider','curve','change'].includes(id))weight*=1.6;
   if(behind&&id==='fast')weight*=1.6;
   weight*=NightGame.cpuPitchWeight(id,tactics);
   if(b.power>=85&&id==='fast')weight*=.85;
   if(counter)weight*=id==='fast'?.66:1.35;
   if(pitcherStyle===0&&id==='fast')weight*=1.4;
   if(pitcherStyle===1&&['sinker','fork','change'].includes(id))weight*=1.5;
   if(pitcherStyle===2&&['slider','cutter','curve'].includes(id))weight*=1.45;
   return {type:TYPES.find(t=>t.id===id),weight};
  }).filter(x=>x.type);
  // No-breaking variant rule: both pitchers throw fastballs only. The
  // user's own pitch selection is forced the same way in throwPitch().
  if(this.variantRules?.noBreaking)weighted=[{type:TYPES[0],weight:1}];
  let draw=Math.random()*weighted.reduce((n,x)=>n+x.weight,0),choice=weighted.at(-1);
  for(const x of weighted){draw-=x.weight;if(draw<=0){choice=x;break;}}
  const type=choice?.type||TYPES[0],waste=two&&this.balls<3&&Math.random()<clamp(.42-(discipline-.085)*1.5-(lateClose&&this.bases.every(Boolean)?.12:0),.16,.50);
  const fatigue=this.pitchFatigue(),lostCommand=fatigue*fatigue;
  const baseline=this.balls===3?.86:behind?.78:two?.58:.70;
  const attack=clamp(baseline+(control-70)*.004-lostCommand*.19,.33,.95);
  const strike=!waste&&Math.random()<attack;
  const handed=this.battingHand==='L'?-1:1,outside=handed;
  let x=(Math.random()<(counter?.86:pitcherStyle===0?.49:.68)?outside:-outside)*rnd(.48,.9),y=rnd(-.85,.85);
  const last=history.at(-1);if(last&&Math.random()<.56){if(Math.abs(last.x)>.42&&Math.sign(x)===Math.sign(last.x))x=-x;if(Math.abs(last.y)>.40&&Math.sign(y)===Math.sign(last.y))y=-y;}
  if(counter&&type.id!=='fast')y=Math.max(.18,y);
  if(two&&['fork','split','change','vslider','curve'].includes(type.id))y=rnd(.5,.93);
  if(!strike){if(['fork','split','change','vslider','curve'].includes(type.id))y=rnd(1.14,1.51)+lostCommand*.16;else x=outside*(rnd(1.14,1.53)+lostCommand*.16);}
  // Control scatter (v184, direct user request: "make the ball miss
  // by more, depending on control"). Two-part shape, mirroring
  // throwPitch(): at control 70+ the long-standing precision is kept
  // exactly (an S-grade arm scatters ~0.6 cm, so the screenshot's
  // S-control pitcher stays a surgeon), while below 70 the aim error
  // grows on a second, steeper slope, and below 65 a wild chance can
  // shove the target clear out of the zone on one axis — a wild arm
  // now visibly cannot find the zone, instead of every arm spraying
  // the same token amount. Fatigue (lostCommand) feeds both parts.
  const error=.025+(100-control)*.0045+Math.max(0,70-control)*.004+lostCommand*.25;
  const target={x:x+rnd(-error,error),y:y+rnd(-error,error)};
  const wildChance=clamp((65-control)*.0035,0,.12)+lostCommand*.08;
  if(Math.random()<wildChance){
   const axis=Math.abs(target.x)>Math.abs(target.y)?'x':'y';
   const sign=Math.sign(target[axis])||(Math.random()<.5?-1:1);
   target[axis]=sign*rnd(1.19,1.52);
  }
  return {type,target};
 }

 createPitch(type,target){
  if(this.bases[1]||this.bases[2])this.atBatRisp=true;
  if(this.derby)type=TYPES[0];
  const base={casual:1150,standard:900,pro:760}[this.difficulty],pitcher=this.pitcher,spec=NightGame.pitchSpec(pitcher,type.id),pitchAdj=this.side===this.userSide&&!this.mirror?this.customAdj('pitch'):0;
  const observedMax=pitcher.pitchDetails?.[type.id]?.measuredMax??(type.id==='fast'?pitcher.velocityEvidence?.fastMax:undefined);
  const boost=clamp(pitchAdj*.35,-3,2);
  const ceiling=Math.min(165,Number.isFinite(observedMax)?observedMax:spec.speed+(type.id==='fast'?3:2)+Math.max(0,boost));
  const velocity=this.derby?150:Math.round(Math.max(50,Math.min(ceiling,spec.speed+boost+rnd(-1.6,1.6)-Math.round(Math.pow(this.pitchFatigue(),2)*6))));
  // Preserve the previous perceptual pace without inflating radar readings.
  const flightSpeed=this.derby?150:NightGame.stretchPitchSpeed(velocity);
  const flightPace=1+Math.max(0,flightSpeed-135)*.016;
  this.pitch={...spec,...NightGame.delivery(pitcher,this.inMatch&&this.bases.some(Boolean),!!this.derby),throwHand:pitcher.hand==='L'?'L':'R',bx:spec.bx*(pitcher.hand==='L'?-1:1)*(1+pitchAdj*.015),by:spec.by*(1+pitchAdj*.015),spinRpm:Math.round((spec.spinRpm||0)*(1+pitchAdj*.01)),targetX:target.x,targetY:target.y,isStrike:Math.abs(target.x)<=1.06&&Math.abs(target.y)<=1.06,speed:velocity,duration:base*148/(flightSpeed*flightPace),progress:0,swung:false,cpuActed:false};
  const pitcherPerks=pitcher.careerPerks||{};
  if(this.career&&this.defending&&this.strikes===2&&type.id!=='fast'&&pitcherPerks.closer){
   this.pitch.bx*=1+pitcherPerks.closer*.12;
   this.pitch.by*=1+pitcherPerks.closer*.12;
  }
  const mastery=this.masteryFor(pitcher.id,type.id);
  if(mastery>0){const m=1+mastery*.0025;this.pitch.bx*=m;this.pitch.by*=m;this.pitch.spinRpm=Math.round((this.pitch.spinRpm||0)*m);}
  if((this.defending||this.autoBatting||this.umpireMode)&&!this.remoteBatter){
   const repeated=this.career?.opponentPlan?.repeat===type.id;
   const recent=(this.atBatPitches||[]).slice(-4),repeat=recent.filter(p=>p.id===type.id).length,locationRepeat=recent.filter(p=>Math.hypot(p.x-target.x,p.y-target.y)<.4).length;
   // Read more pitches early, protect with two strikes, and punish repetition.
   const contact=this.matchup().contact,profile=NightGame.cpuDiscipline(this.batter),kRate=profile.strikeout,edge=Math.max(Math.abs(target.x),Math.abs(target.y));
   const breakAmount=Math.hypot(this.pitch.bx,this.pitch.by);
   this.pitch.cpuSwing=Math.random()<NightGame.cpuSwingOdds({balls:this.balls,strikes:this.strikes,edge,isStrike:this.pitch.isStrike,walk:profile.walk,contact,repeat,locationRepeat,breakAmount});
   const tactics=NightGame.managerTactics(this.managerForSide(this.side),this.managerContext());
   this.pitch.cpuBunt=this.inMatch&&edge<1.18&&Math.random()<tactics.bunt;if(this.pitch.cpuBunt)this.pitch.cpuSwing=false;
   const skill={casual:.09,standard:0,pro:-.07}[this.difficulty]-this.customAdj('bat')*.01;
   const error=clamp(.35+(80-contact)*.004+(kRate-.16)*.75+skill+.17*Math.hypot(this.pitch.bx,this.pitch.by)+Math.max(0,velocity-145)*.004-.05*repeat-.025*locationRepeat-(repeated?(this.career.scouted?.025:.085):0),.17,.88);
   this.pitch.cpuAim={x:target.x+rnd(-error,error)-this.pitch.bx*.16,y:target.y+rnd(-error,error)-this.pitch.by*.12};
   const timingSpread=Math.max(.05,.11+Math.max(0,kRate-.14)*.3+breakAmount*.04+Math.max(0,velocity-145)*.002-this.customAdj('bat')*.004-Math.min(.025,repeat*.008));
   this.pitch.cpuTime=1+rnd(-timingSpread,timingSpread)+(Math.random()<.22?rnd(-.17,.17):0);
   this.pitchHistory.push({id:type.id,x:target.x,y:target.y});if(this.pitchHistory.length>12)this.pitchHistory.shift();
  }
  if(this.inMatch&&this.defending&&!this.steal&&!this.remoteBatter){
   const from=this.bases[1]&&!this.bases[2]?2:this.bases[0]&&!this.bases[1]?1:0;
   if(from){const runner=this.lineups[this.side].find(p=>p.id===this.baseIds[from-1]);if(runner){const tactics=NightGame.managerTactics(this.managerForSide(this.side),{...this.managerContext(),run:runner.run});if(Math.random()<clamp(tactics.steal*(1+this.customAdj('run')*.035),0,.28))this.steal=true;}}
  }
  this.setPhase('windup');this.emit('clear');this.notify();
 }
 cpuWantsIBB(){
  if(!this.isFixture||this.career||this.batFinished||this.remotePitching||this.balls||this.strikes||this.outs>=this.outsNeeded)return false;
  const fieldSide=this.side==='home'?'away':'home';
  return Math.random()<NightGame.managerTactics(this.managerForSide(fieldSide),this.managerContext()).ibb;
 }

 // Crowd excitement 0..1 from the game situation: later innings, a close
 // score, runners in scoring position and a final-inning comeback chance
 // all raise it. app.js feeds it to the stadium audio bed and cheers.
 masteryFor(pitcherId,typeId){const v=this.mastery?.[pitcherId]?.[typeId];return Number.isFinite(v)?clamp(v,0,100):0;}
 crowdExcitement(){
  if(this.derby)return this.derby.enhanced?clamp(.45+this.derby.streak*.09+(this.derby.pendingFinish?.25:0)+(this.derby.remaining<15000?.15:0),0,1):.3;
  const total=Math.max(1,this.totalInnings);
  const late=clamp((this.inning-1)/Math.max(1,total-1),0,1);
  const diff=Math.abs(this.homeScore-this.awayScore);
  const close=diff===0?1:diff===1?.82:diff===2?.55:diff<=4?.28:.08;
  const runners=(this.bases[1]||this.bases[2])?.5:this.bases[0]?.22:0;
  const finalChance=this.half==='bottom'&&this.inning>=total&&this.homeScore<=this.awayScore&&diff<=3?.3:0;
  return clamp(late*.3+close*.35+runners*.25+finalChance,0,1);
 }
 intentionalWalk(internal=false){
  if(this.umpireMode&&!internal)return false;
  if(this.mirror){if(!internal&&this.defending&&this.phase==='aim'){this.mirrorSend?.({t:'pitch-decision',ibb:true});return true;}return false;}
  if(!this.inMatch||this.batFinished)return false;
  if(!internal&&!['aim','windup'].includes(this.phase))return false;
  const before=this.battingScore;
  this.walk();this.endAtBat('walk',this.battingScore-before);this.resetCount();
  this.message('INTENTIONAL WALK','申告敬遠','勝負を避けて一塁を埋めた');this.checkEnd();this.setPhase('result');this.notify();
  return true;
 }
 rollHbp(){
  if(!this.inMatch||this.batFinished||!this.pitch)return false;
  const chance=clamp((74-(this.pitcher.control||70))*.00045,0,.008);
  if(Math.random()>=chance)return false;
  this.completePitch('hbp');
  const before=this.battingScore;
  this.walk();this.endAtBat('hbp',this.battingScore-before);this.resetCount();
  this.message('HIT BY PITCH','死球','打者は一塁へ');this.checkEnd();this.emit('sound','ball');this.setPhase('result');this.notify();
  return true;
 }
 rollWildPitch(){
  if(!this.inMatch||this.batFinished||this.outs>=this.outsNeeded||this.next==='half')return false;
  if(!this.bases.some(Boolean))return false;
  const catcher=this.fielder('C');
  const rainMul=this.weather==='rain'?1.6:1;
  const wp=clamp((70-(this.pitcher.control||70))*.002*rainMul,0,.05),pb=clamp((70-(catcher.field||70))*.0016*rainMul,0,.035);
  const roll=Math.random();if(roll>=wp+pb)return false;
  const wild=roll<wp;
  if(this.bases[2]){this.run(this.baseIds[2],this.basePitcherIds[2]);this.bases[2]=false;this.baseIds[2]=null;this.basePitcherIds[2]=null;}
  if(this.bases[1]){this.bases[2]=true;this.baseIds[2]=this.baseIds[1];this.basePitcherIds[2]=this.basePitcherIds[1];this.bases[1]=false;this.baseIds[1]=null;this.basePitcherIds[1]=null;}
  if(this.bases[0]){this.bases[1]=true;this.baseIds[1]=this.baseIds[0];this.basePitcherIds[1]=this.basePitcherIds[0];this.bases[0]=false;this.baseIds[0]=null;this.basePitcherIds[0]=null;}
  this.message(wild?'WILD PITCH':'PASSED BALL',wild?'暴投':'捕逸','走者が進塁した');this.notify();
  return true;
 }
 resolveSteal(){
  if(!this.steal||!this.inMatch)return;this.steal=false;
  const from=this.bases[1]&&!this.bases[2]?2:this.bases[0]&&!this.bases[1]?1:0;
  if(!from)return;
  // A base flag without a runner id is an inconsistent state: drop the steal
  // instead of moving a phantom runner (bases[from]=true with a null id),
  // which corrupts base state for every later play of the game.
  const runnerId=this.baseIds[from-1];if(!runnerId)return;
  const runner=this.lineups?.[this.side]?.find(p=>p.id===runnerId);
  if(!runner)return;
  const catcher=this.fielder('C');
  // v129 steal rebalance: the old line (.58 base, run-arm slope .008) left
  // even fast runners below break-even against a typical catcher (arm 81,
  // ~148 km/h pitch: run 50 -> ~28%, 80 -> ~47%, 95 -> ~59% over N=300
  // paired-seed attempts). Anchor the curve at run 70 / arm 70 / 140 km/h,
  // flatten the runner slope so speed still matters without deciding alone,
  // and keep the catcher-arm and pitch-speed terms working against the
  // runner: the same matchup now measures roughly 50 -> 60%, 65 -> 66%,
  // 80 -> 73%, 95 -> 80% (real-baseball success sits near 70%).
  const chance=clamp(.77+((runner?.run??60)-70)*.0045-((catcher?.arm??70)-70)*.007-((this.pitch?.speed??140)-140)*.0008,.30,.92);
  const id=this.baseIds[from-1],pid=this.basePitcherIds[from-1];
  this.bases[from-1]=false;this.baseIds[from-1]=null;this.basePitcherIds[from-1]=null;
  if(Math.random()<chance){
   this.bases[from]=true;this.baseIds[from]=id;this.basePitcherIds[from]=pid;
   this.message('STEAL','盗塁成功',`${runner?.name||'走者'}が${from+1}塁へ`);
  }else{
   this.addOut('caughtstealing',catcher?.id);
   this.message('STEAL OUT','盗塁失敗',`${runner?.name||'走者'}はタッチアウト · ${this.outs}アウト`,'out');
  }
  this.notify();
 }
 setAutoDefense(active){
  if(this.umpireMode)return false;
  if(!this.isFixture||!this.defending||this.phase==='ended'||this.paused)return false;
  this.autoDefense=!!active;this.touch=null;this.notify();return true;
 }
 autoPitch(){
  if(!(this.autoDefense||this.umpireMode)||!this.defending||this.phase!=='aim')return false;
  const plan=this.cpuPitchPlan();this.pitchType=plan.type.id;this.cursor=plan.target;return this.throwPitch(plan.target);
 }

 throwPitch(autoTarget=null){
  if(this.umpireMode&&!autoTarget)return false;
  if(this.mirror){if(this.paused||!this.defending||this.phase!=='aim'||this._mirrorThrew)return false;this._mirrorThrew=true;this.mirrorSend?.({t:'pitch-decision',pitchType:this.pitchType,aim:{x:this.cursor.x,y:this.cursor.y},shift:this.shift==='pull'});return true;}
  if(this.paused||!this.defending||this.phase!=='aim')return false;
  if(!this.pitcher.pitches.includes(this.pitchType))this.pitchType=this.pitcher.pitches[0];
  if(this.variantRules?.noBreaking&&this.pitchType!=='fast')this.pitchType='fast';
  const type=TYPES.find(t=>t.id===this.pitchType)||TYPES[0];
  const pressure=this.inning>=7&&this.bases.some(Boolean)?(this.pitcher.careerPerks?.pressure||0)*5:0;
  const control=clamp(this.pitcher.control+pressure+this.conditionFor(this.pitcher)*3+this.masteryFor(this.pitcher.id,this.pitchType)*.06,0,99),fatigue=this.pitchFatigue(),lostCommand=fatigue*fatigue;
  // Same v184 control-scatter shape as cpuPitchPlan: unchanged at
  // control 70+, a steeper second slope below it, and a steeper
  // zone-miss chance for wild arms (remoteThrowPitch matches).
  const error=.03+(100-control)*.006+Math.max(0,70-control)*.004+lostCommand*.4;
  let target=autoTarget;
  if(!target){
   target={x:this.cursor.x+rnd(-error,error),y:this.cursor.y+rnd(-error,error)};
   const missChance=clamp(.01+(70-control)*.0045+lostCommand*.18,.005,.32);
   if(Math.abs(this.cursor.x)<=1.06&&Math.abs(this.cursor.y)<=1.06&&Math.random()<missChance){
    const axis=Math.abs(this.cursor.x)>Math.abs(this.cursor.y)?'x':'y';
    const sign=Math.sign(this.cursor[axis])||(Math.random()<.5?-1:1);
    target[axis]=sign*rnd(1.19,1.52+lostCommand*.20);
   }
  }
  this.stamina=Math.max(0,this.stamina-type.cost*90/this.pitcher.stamina);
  this.createPitch(type,target);return true;
 }
 remoteThrowPitch(){
  if(this.paused||!this.remotePitching||this.phase!=='aim')return false;
  if(!this.pitcher.pitches.includes(this.pitchType))this.pitchType=this.pitcher.pitches[0];
  const type=TYPES.find(t=>t.id===this.pitchType)||TYPES[0];
  const pressure=this.inning>=7&&this.bases.some(Boolean)?(this.pitcher.careerPerks?.pressure||0)*5:0;
  const control=clamp(this.pitcher.control+pressure+this.conditionFor(this.pitcher)*3,0,99),fatigue=this.pitchFatigue(),lostCommand=fatigue*fatigue;
  const error=.03+(100-control)*.006+Math.max(0,70-control)*.004+lostCommand*.4;
  const target={x:this.cursor.x+rnd(-error,error),y:this.cursor.y+rnd(-error,error)};
  const missChance=clamp(.01+(70-control)*.0045+lostCommand*.18,.005,.32);
  if(Math.abs(this.cursor.x)<=1.06&&Math.abs(this.cursor.y)<=1.06&&Math.random()<missChance){
   const axis=Math.abs(this.cursor.x)>Math.abs(this.cursor.y)?'x':'y';
   const sign=Math.sign(this.cursor[axis])||(Math.random()<.5?-1:1);
   target[axis]=sign*rnd(1.19,1.52+lostCommand*.20);
  }
  this.createPitch(type,target);return true;
 }
 // Online guest mirror: the host streams render state; this instance never
 // simulates. applyMirror stores the latest host state, mirrorTick advances
 // local clocks and interpolates field positions between snapshots.
 applyMirror(s){
  const now=performance.now(),samePhase=this.phase===s.phase&&this._mirrorPitchSeq===s.pitchSeq;
  // A stable presentation clock prevents a late packet from rewinding
  // the visible pitch, while a new phase starts on its authoritative time.
  this._ptBase=samePhase&&!s.lock?Math.max(s.pt,Math.min(this.phaseTime,s.pt+80)):s.pt;this._ptAt=now;
  this.phaseTime=this._ptBase;
  this.phase=s.phase;this.broadcastCut=s.cut||null;this.inning=s.inning;this.half=s.half;
  this.outs=s.outs;this.balls=s.balls;this.strikes=s.strikes;
  this.homeScore=s.hs;this.awayScore=s.as;this.home=s.home;this.away=s.away;
  this.homeHits=s.hh;this.awayHits=s.ah;this.homeErrors=s.he;this.awayErrors=s.ae;
  this.bases=[!!s.bases[0],!!s.bases[1],!!s.bases[2]];this.baseIds=s.baseIds.slice();
  this.battingIndex={home:s.bi.home,away:s.bi.away};this.batFinished=!!s.batFin;
  // Delta decoding keeps unchanged lineups by reference.
  if(this._mirrorLineupWire!==s.lu){
   this._mirrorLineupWire=s.lu;
   for(const side of ['home','away']){
    const club=this.teams[side];
    this.lineups[side]=s.lu[side].map(([id,pos])=>{const p=club.batters.find(b=>b.id===id);return p?{...p,fieldPos:pos}:this.lineups[side][0];});
   }
  }
  this.homePitcherIndex=s.pi.c;this.awayPitcherIndex=s.pi.u;
  this.usedPitchers=s.usedC.slice();this.usedCpuPitchers=s.usedU.slice();if(s.removed)this.removedPlayers=s.removed;if(s.substitutions)this.substitutions=s.substitutions;
  this.pitchingStats=s.ps||{};this.box=s.box||{};
  this.absRemaining=s.absCpu;this.absCpuRemaining=s.absU;
  this.playChallenges=s.playCpu;this.playCpuChallenges=s.playU;
  if(s.baseCall)this.baseCall={...s.baseCall,cpu:(s.baseCall.challenger||s.baseCall.batSide)!==this.userSide};else if(this.baseCall)this.baseCall=null;
  this.weather=s.weather;this.wind=s.wind;this.normalizeWeather();this.next=s.next;
  if(s.umpireLabel!==undefined)this.umpireLabel=s.umpireLabel;
  this.halfBreak=s.halfBreak||null;this.hit=s.hit||null;
  if(s.lastPitch)this.lastPitch=s.lastPitch;
  this.atBatPitches=Array.isArray(s.abp)?s.abp.map(p=>({id:p.i,name:p.n||'',x:p.x,y:p.y,result:p.r})):[];
  if(!(samePhase&&this._mirrorSwung&&s.phase==='pitch'&&!s.pitch?.swung))this.swingAge=s.swingAge;
  if(s.pitchSeq!==this._mirrorPitchSeq){this._mirrorPitchSeq=s.pitchSeq;this._mirrorSwung=false;this.pitch=s.pitch;}
  else if(s.pitch&&this.pitch){const prog=this.pitch.progress;Object.assign(this.pitch,s.pitch);this.pitch.progress=prog;}
  else this.pitch=s.pitch;
  if(this.phase==='aim')this._mirrorThrew=false;
  if(s.absCall){
   // The streamed cpu flag is from the host's perspective ("not the host").
   // Recompute it from this mirror's own perspective with the same formula
   // take() uses (cpu = the challenger is not the local user), so
   // absCanChallenge arms exactly when the guest is the disadvantaged side.
   const ac={...s.absCall,cpu:s.absCall.umpireStrike===this.defending};
   const a=this.absCall;if(!a||a.gap!==ac.gap||a.strike!==ac.strike||a.umpireStrike!==ac.umpireStrike||a.cpu!==ac.cpu)this.absCall=ac;
  }
  else if(this.absCall)delete this.absCall;
  const mp=this.pitcher;if(mp)this.session.thrown=this.pitchingStats[mp.id]?.pitches||0;
  if(s.field){
   const stamp=Number.isFinite(s.stamp)?s.stamp:now;
   const observed=now-stamp;
   this._mirrorOffset=this._mirrorOffset==null?observed:Math.min(observed,this._mirrorOffset+.15);
   let buffer=this._fieldFrames;
   if(!buffer||buffer.at(-1)?.fsq!==s.fsq||!samePhase||s.lock)buffer=this._fieldFrames=[];
   const t=stamp+this._mirrorOffset;
   const previous=buffer.at(-1);
   if(previous&&t<=previous.t)buffer.pop();
   buffer.push({t,f:s.field,fs:s.fs||1,fsq:s.fsq});
   while(buffer.length>8)buffer.shift();
   this._fieldCurr=buffer.at(-1);
  }else{this._fieldFrames=[];this._fieldCurr=null;}
 }
 mirrorTick(dt){
  const now=performance.now();
  if(dt>0&&!this.paused){
   this.time+=dt;this.swingAge+=dt;
   if(this._ptAt!=null)this.phaseTime=Math.min(this._ptBase+(now-this._ptAt),this._ptBase+5000);
   if(this.phase==='pitch'&&this.pitch)this.pitch.progress=Math.min(1.24,this.phaseTime/this.pitch.duration);
   if(this.mirrorSend&&this.steal!==this._sentSteal){this._sentSteal=this.steal;this.mirrorSend({t:'steal',on:!!this.steal});}
  }
  const buffer=this._fieldFrames||[],latest=buffer.at(-1);
  if(!latest){this.field=null;this._mirrorFseq=-1;return;}
  // Interpolate on the host's packet timestamps rather than arrival gaps.
  // Keep a short buffer for jitter; extrapolate for at most 25 ms.
  let cur=latest,prev=null;
  const target=now-50;
  if(!this.paused&&buffer.length>1){
   const i=buffer.findIndex(v=>v.t>=target);
   if(i===0){cur=buffer[0];}
   else if(i>0){cur=buffer[i];prev=buffer[i-1];}
   else{cur=latest;prev=buffer[buffer.length-2];}
  }
  const cf=cur.f,span=prev?Math.max(1,cur.t-prev.t):0;
  const a=prev?Math.max(0,Math.min(1+(cf.resolved?0:25/span),(target-prev.t)/span)):1,lerp=(p,c)=>p+(c-p)*a;
  if(this._mirrorFseq!==cur.fsq||!this.field){
   // New play: fresh field objects exactly once. The 3D camera resets and
   // re-aims whenever the field object identity changes, so identity must
   // stay stable for the whole play or the camera jitters and never
   // follows the ball.
   this._mirrorFseq=cur.fsq;
   this.field={...cf,ball:{...cf.ball,wetField:!NightGame.isIndoorPark(this.park)&&!!cf.ball.wetField},fielders:cf.fielders.map(p=>({...p})),runners:cf.runners.map(r=>({...r})),trail:[]};
   this._mirrorRunners=new Map(this.field.runners.map(r=>[r.id,r]));
  }else{
   const F=this.field,pf=prev?prev.f:null,localSelection=F.manual?.selection;
   for(const k in cf){if(k!=='ball'&&k!=='fielders'&&k!=='runners'&&k!=='trail')F[k]=cf[k];}
   // The streamed manual block carries the host's selection; the guest's
   // own runner selection is local state and must survive snapshot merges.
   if(localSelection&&F.manual)F.manual={...F.manual,selection:localSelection};
   const pb=pf?pf.ball:cf.ball;
   F.ball.x=lerp(pb.x,cf.ball.x);F.ball.y=lerp(pb.y,cf.ball.y);F.ball.z=lerp(pb.z||0,cf.ball.z||0);
   for(const k in cf.ball){if(k!=='x'&&k!=='y'&&k!=='z')F.ball[k]=cf.ball[k];}
   cf.fielders.forEach((p,i)=>{const tf=F.fielders[i];if(!tf){F.fielders[i]={...p};return;}const q=pf?pf.fielders[i]:null;if(q){tf.x=lerp(q.x,p.x);tf.y=lerp(q.y,p.y);}for(const k in p){if(k!=='x'&&k!=='y')tf[k]=p[k];}});
   const order=[];
   for(const r of cf.runners){let tr=this._mirrorRunners.get(r.id);const q=pf?pf.runners.find(x=>x.id===r.id):null;if(!tr){tr={...r};this._mirrorRunners.set(r.id,tr);}else{if(q){tr.x=lerp(q.x,r.x);tr.y=lerp(q.y,r.y);tr.progress=lerp(q.progress||0,r.progress||0);}for(const k in r){if(k!=='x'&&k!=='y'&&k!=='progress')tr[k]=r[k];}}order.push(tr);}
   F.runners=order;
   for(const id of[...this._mirrorRunners.keys()])if(!cf.runners.some(r=>r.id===id)&&!(pf&&pf.runners.some(r=>r.id===id)))this._mirrorRunners.delete(id);
  }
  const F=this.field;
  F.elapsed=prev?lerp(prev.f.elapsed,cf.elapsed):cf.elapsed;
  F.trail.push({x:F.ball.x,y:F.ball.y,z:F.ball.z});if(F.trail.length>40)F.trail.shift();
 }
 pitchAt(u){
  const p=this.pitch,k=Math.pow(clamp(u,0,1.3),1.65),late=Math.pow(clamp(u,0,1.3),4.4);
  const flutter=p.id==='knuckle'?Math.sin(u*31)*Math.sin(Math.min(1,u)*Math.PI)*.23:0;return{x:(p.releaseX??((p.throwHand||this.pitcher.hand)==='L'?1:-1)*.76/.68)*(1-Math.min(1,Math.max(0,u)))+p.targetX*k+p.bx*(late-k)+flutter,y:(p.releaseY??0)*(1-Math.min(1,Math.max(0,u)))+p.targetY*k+p.by*(late-k)+flutter*.6};
 }
 // Start at the no-break point on the plate plane, then follow the
 // developing break so the guide and live ball meet at the plate.
 // The cursor already specifies the intended plate crossing. Show the
 // unbroken aim point and its movement toward that crossing, not a second
 // break added to the cursor. This is a nominal prediction, before command error.
 pitchAimPreview(){
  if(!this.defending||this.phase!=='aim'||this.paused||this.autoDefense||this.umpireMode||this.spectate||this.replayView||this.fastForward)return null;
  const p=this.pitcher;if(!p)return null;
  let id=p.pitches.includes(this.pitchType)?this.pitchType:p.pitches[0]||'fast';
  if(this.variantRules?.noBreaking)id='fast';
  const spec=NightGame.pitchSpec(p,id),adj=this.side===this.userSide&&!this.mirror?this.customAdj('pitch'):0;
  let scale=1+adj*.015;
  if(this.career&&this.strikes===2&&id!=='fast'&&p.careerPerks?.closer)scale*=1+p.careerPerks.closer*.12;
  scale*=1+this.masteryFor(p.id,id)*.0025;
  const bx=spec.bx*(p.hand==='L'?-1:1)*scale,by=spec.by*scale;
  const end={x:this.cursor.x,y:this.cursor.y};
  return {id,start:{x:end.x-bx,y:end.y-by},end,bx,by};
 }
 pitchGuidePoint(){
  const p=this.pitch;
  if(!p)return null;
  const t=clamp((p.progress-.52)/(1-.52),0,1);
  const remainingBreak=1-t*t*(3-2*t);
  return {x:p.targetX-p.bx*remainingBreak,y:p.targetY-p.by*remainingBreak};
 }
 swing(){if(this.umpireMode)return false;if(this.mirror){if(this.paused||this.defending||this.phase!=='pitch'||!this.pitch||this.pitch.swung||this._mirrorSwung||this.phaseTime>this.pitch.duration*1.24+30)return false;this._mirrorSwung=true;this.swingAge=0;this.mirrorSend?.({t:'swing',aim:{x:this.cursor.x,y:this.cursor.y},power:!!this.power,delta:Math.max(-1.2,Math.min(1.2,this.pitch.progress-1)),bunt:!!this.bunt});return true;}if(this.paused||this.defending||this.phase!=='pitch'||this.pitch.swung)return false;if(this.bunt&&this.mode!=='derby')this.buntBall();else this.attempt(this.cursor,this.power,this.pitch.progress-1,false);return true;}
 buntBall(){
  this.pitch.swung=true;this.swingAge=0;this.session.swings++;this.session.contacts++;
  // One roll per bunt: 90% sacrifice, 5% failed advance, 5% bunt hit.
  const roll=Math.random();this.startField(9,1,rnd(-.3,.3),false);
  this.field.manual=null;this.field.buntResult=roll<.90?'sacrifice':roll<.95?'buntout':'buntsingle';
 }
 cpuBat(){if(this.pitch.cpuBunt){this.buntBall();return;}if(this.pitch.cpuSwing){const m=this.matchup(),edge=Math.max(Math.abs(this.pitch.targetX),Math.abs(this.pitch.targetY)),trailing=this[this.side+'Score']<this[(this.side==='home'?'away':'home')+'Score'];const power=clamp((m.power>80?.50:.27)*(this.managerForSide(this.side).powerMul??1)+(this.balls>=2&&this.strikes===0?.10:0)-(this.strikes===2?.16:0)-(edge>.85?.09:0)+(trailing&&this.inning>=Math.max(3,this.totalInnings-1)?.06:0),.04,.8);this.attempt(this.pitch.cpuAim,Math.random()<power,this.pitch.cpuTime-1,true);}}
 attempt(aim,power,delta,cpu){
  if(this.paused)return false;const p=this.pitch;p.swung=true;this.swingAge=0;this.emit('sound','swing');if(!cpu)this.session.swings++;
  const previousPower=this.power;this.power=power;const {rx,ry}=this.batSize;this.power=previousPower;
  const contactError=Math.hypot((aim.x-p.targetX)/(rx+.07),(aim.y-p.targetY)/(ry+.07));
  const form=this.batter.careerForm;
  const tight=!cpu&&this.career?.difficulty!=='relaxed'&&(this.career?.difficulty?1:0);
  const penalty=(!cpu&&p.id!=='fast'&&this.batter.careerWeakness>=2?.018:0)+(form==='legkick'?.024:0);
  const baseWindow=(cpu?{casual:.24,standard:.21,pro:.18}:{casual:.22,standard:.185,pro:.16})[this.difficulty]-(tight?.027:0)-penalty
   +(!cpu&&this.career?.scouted?.012:0)+(form==='compact'?.009:0);
  const timeWindow=cpu?baseWindow:baseWindow*.93;
  if(Math.abs(delta)>timeWindow||contactError>1.07){if(!cpu)this.emit('timing',{text:contactError>1.07?'カーソルが合っていない':delta<0?'振り出しが早い':'振り遅れ'});this.setPhase('miss');this.notify();return;}
  const timingOffset=delta/timeWindow;
  const core=clamp(1-contactError,0,1),timing=1-Math.abs(timingOffset),quality=core*.82+timing*.18;
  const perfect=core>.82&&(cpu||timing>.7);
  if(!cpu){this.session.contacts++;if(perfect)this.session.perfect++;this.emit('timing',{text:perfect?'芯で捉えた！':core>.45?'ナイスミート':'バットの端に当たった'});}
  // Give small timing offsets more directional effect, tapering that
  // extra sensitivity near the edges of the contact window.
  const timingSpray=cpu?delta*3:delta*(5.4+2.6*timing)+.18*timingOffset**3;
  const courseSpray=cpu?0:clamp(p.targetX,-1,1)*.14;
  const handed=this.battingHand==='L'?-1:1;
  const spray=clamp(timingSpray*handed+courseSpray+(p.targetX-aim.x)*.43+rnd(-.04,.04)+(cpu?rnd(-.24,.24):0),-1.35,1.35);
  const launch=clamp(13+(this.batter.trait==='長距離砲'&&power?3:0)+(aim.y-p.targetY)*77+(power?12:0)+rnd(-4,4),-8,65);
  const exitSpeed=22+quality*19+(this.matchup().power-60)*.12+(power?6:0)+(this.batter.trait==='勝負強い'&&(this.bases[1]||this.bases[2])?1.5:0);
  // Horizontal miss distance signs the side spin: dragging across the ball
  // slices/hooks it in flight (initial spray above stays as modelled).
  const sideMiss=clamp((aim.x-p.targetX)/(rx+.07),-1,1);
  // A mishit loses at most 2.6 m/s (9.36 km/h). Good contact and derby carry remain unchanged.
  const mishitLoss=this.derby?0:Math.max(0,.65-quality)*4;
  this.startField(exitSpeed+(this.derby&&power?3:0)-mishitLoss,launch,spray,cpu,perfect,{quality,side:sideMiss});
 }
 startField(speed,launch,spray,cpu,perfect=false,contact=null){
  // Metal bat (variant rule): a flat +3% exit-velocity boost, applied
  // only here so the v108 spin/carry model (MAGNUS_LIFT etc.) is
  // untouched. Paired fixed-seed probe (tests/variant-rules-v133.cjs):
  // mean carry of a squared-up fly gains +5.6 m (N=120).
  if(this.variantRules?.metalBat&&!this.derby)speed*=1.03;
  // Low-rebound bat (v180 variant rule): the metal bat's mirror —
  // a flat -3% exit velocity, applied at the same single point so
  // the spin/carry model is untouched. Paired fixed-seed probe
  // (tests/low-rebound-v180.cjs): the reference fly loses 5.42 m
  // of mean carry (metal gains 5.59 m on the same probe), and a
  // mixed-swing probe loses 5.02 m — perceptible, not extreme.
  // normalizeVariantRules guarantees the two never combine.
  if(this.variantRules?.lowReboundBat&&!this.derby)speed*=.97;
  this.playEvents=[];const a=launch*Math.PI/180,flat=speed*Math.cos(a);
  const fly=clamp((launch-12)/30,0,1),flightLift=1-.28*fly;
  // Batted-ball spin (v107 physics). Backspin grows with fly-ball shape and
  // contact quality: a squared-up fly carries, while an undercut ball with
  // poor contact balloons on excess backspin. Side spin comes from the
  // horizontal miss. Grounders stay near-neutral.
  const quality=contact?clamp(contact.quality,0,1):(perfect?.88:.5);
  const flyF=clamp((launch-4)/34,0,1),undercut=clamp((launch-40)/25,0,1)*(1-quality);
  // Derby balls carry no spin effect (v108): a derby is a pure carry contest
  // judged against fixed fences, so the flight must not depend on contact
  // spin. spinBack/spinSide are zeroed, which also drops the rpm readout for
  // derby hits (hit.spinBack below), keeping the display consistent with
  // the actual flight instead of showing spin that did nothing.
  const spinBack=this.derby?0:Math.round(clamp(flyF*(750+2050*quality)+undercut*1300,0,3600));
  const spinSide=this.derby?0:Math.round((contact?clamp(contact.side,-1,1):0)*1500*clamp((launch+12)/42,.3,1));
  const ball={x:0,y:0,z:1,vx:Math.sin(spray)*flat,vy:Math.cos(spray)*flat,
   vz:Math.sin(a)*speed*flightLift,bounces:0,flightRate:1+.53*fly,flightLift,spinBack,spinSide,irregular:false,realGround:!this.derby||!!this.derby.enhanced,wetField:this.weather==='rain'};
  const landing=this.predictLanding(ball);const foul=Math.abs(spray)>Math.PI/4;
  const fielders=this.derby?[]:NightGame.positions(this.park).map(([name,x,y],i)=>{const profile=this.fielder(name);
   if((this.defending||this.challenge)&&this.defense==='in')y-=i>=6?9:i>1?5:0;if(this.defending&&this.defense==='deep')y+=i>=6?10:0;
   const fieldRating=profile.field,run=profile.run,outfielder=i>=6,condition=clamp(this.conditionFor(profile),-2,2),catchRating=clamp((profile.catch??profile.catching??fieldRating)+condition*2,20,99);
   let reaction=Math.max(FIELD_READ_DELAY,(outfielder?.64:.24)+(70-fieldRating)*.009-condition*.018);
   let speedMul=1;
   if(i>=2&&(this.defending?this.shift==='pull':!!this.cpuShiftNow)&&launch<25&&Math.abs(spray)>.08){
    const toPull=(spray>0)===(this.battingHand==='L');
    if(toPull){if(i===3){reaction*=.85;speedMul=1.08;}else if(i===4||i===5){reaction*=.7;speedMul=1.15;}}
    else if(i===3){reaction*=2.2;speedMul=.78;}
    else if(i===2){reaction*=1.3;speedMul=.94;}
    else if(i===(this.battingHand==='L'?6:8))reaction*=1.35;
   }
   const baseSpeed=(6.62+(run-70)*.036+(fieldRating-70)*.025)*(outfielder?1.09:1.07);
   return {name,player:profile.name,x,y,startX:x,startY:y,fieldRating,catchRating,runRating:run,armRating:profile.arm,condition,
    speed:baseSpeed*speedMul,pickSpeed:baseSpeed,arm:22+profile.arm*.12,
    reach:.79+fieldRating*.008,catchReach:.58+fieldRating*.006,
    reaction,target:{x,y},running:false,moveSpeed:0};});
  if(this.side===this.userSide&&!this.mirror){const fa=1+this.customAdj('field')*.012;if(fa!==1)for(const p of fielders){p.speed*=fa;p.pickSpeed*=fa;p.arm*=fa;}}
  const candidate=fielders.map((f,i)=>({i,t:dist(f,landing)/(f.pickSpeed||f.speed)})).sort((a,b)=>a.t-b.t)[0]?.i??0;
  const runners=[{id:this.batter.id,start:0,progress:0,x:0,y:0,batter:true,speed:this.runnerSpeed}];this.bases.forEach((b,i)=>{if(b)runners.push({id:this.baseIds[i],start:i+1,progress:i+1,x:BASES[i+1].x,y:BASES[i+1].y,batter:false,speed:RUNNER_SPEED(this.runnerRating(this.lineups[this.side].find(p=>p.id===this.baseIds[i])))});});
  this.field={ball,landing,fielders,chaser:candidate,elapsed:0,foul,cpu,perfect,trail:[],runners:this.derby?[]:runners,outsAtContact:this.outs,throw:null,resolved:false,outcome:null,maxTravel:0,landingTime:landing.time||1, batterName:this.batter.name,runnerSpeed:this.runnerSpeed};
  if((this.inMatch||this.mode==='practice')&&!foul){this.field.manual={userControlled:(this.isFixture||!!this.challenge||this.mode==='career-bat')&&this.runnersCommanded(),selection:this.mode==='career-bat'?this.career.playerId:null,secured:false,holder:null,bag:null,initialBases:this.bases.slice(),initialIds:this.baseIds.slice(),outs:[],lastOut:null,fly:false,recovery:0};for(const r of runners)Object.assign(r,{base:r.start,furthest:r.start,autoTarget:r.batter?1:r.start,command:r.batter?1:r.start,waiting:!r.batter,out:false,scored:false,needsTag:false,chargedPitcherId:r.batter?this.pitcher.id:this.basePitcherIds[r.start-1]||this.pitcher.id,touchedAt:{[r.start]:0}});}
  this.field.trajectory=launch<8?'ground':launch<=22?'liner':launch>=36&&Math.hypot(landing.x,landing.y)<75?'blooper':'fly';this.field.wallHit=false;this.planIntercepts();
  if(this.field.manual)this.startForcedRunners();
  this.hit={distance:0,kind:'live',perfect,exitKmh:Math.round(speed*3.6),launchAngle:Math.round(launch),sprayAngle:Math.round(spray*180/Math.PI),spinBack};this.setPhase('field');this.emit('clear');this.emit('sound',perfect?'perfect':'hit');this.emit('field',this.field);this.notify();
 }
 planIntercepts(){
  const f=this.field,b={...f.ball},samples=[];
  for(let t=.025;t<=f.landingTime+.035;t+=.025){
   moveBattedBall(b,.025,this.windVector(),this.park);
   if(b.bounces)break;
   if(b.vz<0&&(!f.foul||NightPlayers.insideFoul(this.park,b.x,b.y)))samples.push({x:b.x,y:b.y,z:b.z,t});
  }
  let best=null;
  f.fielders.forEach((p,i)=>{
   // Infielders turn and run back toward the outfield much slower than they
   // charge in, so a hard liner over their head drops instead of being run
   // down at full sprint speed.
   const backSpeed=q=>i<6&&q.y>p.startY+2?.6:1;
   const point=samples.find(q=>q.t>p.reaction&&catchType(p,q,Math.max(0,dist(p,q)-fielderTravel(p,p.speed*backSpeed(q),q.t-p.reaction)),!f.foul));
   p.intercept=point?{x:point.x,y:point.y,time:point.t}:{...f.landing,time:f.landingTime+Math.max(0,dist(p,f.landing)-p.reach)/(p.speed*backSpeed(f.landing))};
   if(!best||p.intercept.time<best.t)best={i,t:p.intercept.time,air:!!point};
  });
  f.chaser=best?.i??f.chaser;
  f.catchable=!!best?.air;
 }
 predictLanding(initial){
  const b={...initial};
  for(let i=1;i<=1600;i++){
   moveBattedBall(b,.01,this.windVector(),this.park);
   if(b.bounces)return{x:b.x,y:b.y,time:i*.01};
  }
  return{x:b.x,y:b.y,time:16};
 }
 readGroundBall(){
  const f=this.field;
  if(f.groundRead&&f.elapsed<f.groundRead.until)return f.groundRead;
  const b={...f.ball},wind=this.windVector();
  let best=null;
  for(let i=0;i<=36&&!best;i++){
   const t=i*.1;
   if(b.z<1.25&&(b.bounces||f.wallHit)){
    f.fielders.forEach((p,index)=>{
     const eta=fielderETA(p,b,p.speed,p.reach)+Math.max(0,Math.max(p.reaction,p.recoverAt??0)-f.elapsed);
     if(eta<=t+.04&&(!best||eta<best.eta))best={x:b.x,y:b.y,index,t,eta};
    });
   }
   if(!best)for(let j=0;j<6;j++)moveBattedBall(b,1/60,wind,this.park);
  }
  if(!best){const p=f.fielders[f.chaser];best={x:b.x,y:b.y,index:f.chaser,t:Math.max(3.6,dist(p,b)/p.speed)};}
  return f.groundRead={...best,at:f.elapsed+best.t,until:f.elapsed+.12};
 }
 landingIndicator(){
  const f=this.field;if(!f||f.foul||f.resolved||f.manual?.secured||f.ball.bounces>0)return null;
  const kind=f.trajectory==='ground'?'ground':f.trajectory==='liner'?'liner':'fly';
  const remaining=Math.max(.16,1-Math.min(1,f.elapsed/(f.landingTime||f.landing.time||1)));
  return {x:f.landing.x,y:f.landing.y,kind,scale:remaining};
 }
 startForcedRunners(){
  for(const r of this.field.runners){
   if(r.batter||r.out||r.scored||r.progress!==r.start||r.command!==r.start)continue;
   const next=this.manualForceBase(r);
   if(next){r.command=next;r.waiting=false;r.contactAdvance=true;r.readingFly=this.holdForCatch();}
  }
 }
 holdForCatch(){
  const f=this.field;
  return f.outsAtContact<this.outsNeeded-1&&f.trajectory!=='ground'&&f.catchable&&!f.wallHit&&!f.ball.bounces&&!f.manual.secured;
 }
 updateRunners(dt){
  const f=this.field;if(f.manual&&!f.resolved){this.updateManualRunners(dt);return;}
  // Lead runners move first. Reserve space on the path so a faster trailing
  // runner cannot pass or stand on the same base as the runner ahead.
  let ahead=Infinity;
  for(const r of [...f.runners].sort((a,b)=>b.start-a.start)){
   if(r.out)continue;
   const forced=f.ball.bounces>0&&!f.foul&&this.bases.slice(0,r.start).every(Boolean);
   const provisional=r.batter?1:((f.outsAtContact===this.outsNeeded-1||forced)&&!f.foul?Math.min(4,r.start+1):r.start);
   const target=Math.min(r.target??provisional,ahead-.12);
   const delta=target-r.progress;r.running=Math.abs(delta)>.01;
   r.progress+=Math.sign(delta)*Math.min(Math.abs(delta),dt*r.speed/27.44);
   r.progress=clamp(r.progress,0,4);ahead=r.progress>=4?Infinity:r.progress;
   const i=Math.min(3,Math.floor(r.progress)),u=r.progress-i;r.x=BASES[i].x+(BASES[i+1].x-BASES[i].x)*u;r.y=BASES[i].y+(BASES[i+1].y-BASES[i].y)*u;
   if(f.hitMusicPending&&r.batter&&r.progress>=1)this.playHitMusic();
  }
 }
 playHitMusic(){
  const f=this.field;
  if(f?.hitMusicPlayed)return;
  if(f){f.hitMusicPlayed=true;delete f.hitMusicPending;}
  this.emit('music-result',{kind:'hit',player:this.batter.id,side:this.side});
 }
 updateLiveHitMusic(){
  const f=this.field,m=f.manual;
  if(!this.inMatch||!m||f.resolved||f.hitMusicPlayed||f.overFence||!f.ball.bounces||m.fly||this.outs>=this.outsNeeded)return;
  if(f.runners.find(r=>r.batter).furthest<1||m.outs.some(o=>o.type==='force'))return;
  // An outstanding force on another runner can still turn safe arrival into a fielder's choice.
  if(f.runners.some(r=>!r.out&&!r.scored&&this.manualForceBase(r)))return;
  this.playHitMusic();
 }
 specialAttempt(index,type,difficulty=1){
  const f=this.field,p=f.fielders[index];f.specialAttempts ||= {};
  if(f.specialAttempts[index]!==undefined)return false;
  const pass=Math.random()<specialFieldChance(p,difficulty,this.weather==='rain');
  f.specialAttempts[index]=pass?type:'failed';
  if(!pass){this.fieldingAction(index,type,false);p.recoverAt=f.elapsed+.48;p.running=false;}
  return pass;
 }
 markGreat(index,type,confirmed=false){
  const f=this.field,p=f.fielders[index],label=SPECIAL_LABELS[type];if(!p||!label||f.foul||f.misplay)return;
  if(f.greatPlay?.confirmed)return;
  f.greatPlay={type,fielder:index,time:f.elapsed,x:p.x,z:p.y,label:label[0],confirmed};
 }
 tryRobbery(wall,angle){
  const f=this.field,b=f.ball,i=f.chaser,p=f.fielders[i];if(this.derby||f.foul||b.bounces||i<6||!p||b.vz>=0)return false;
  const height=NightPlayers.fenceHeight(this.park,angle);
  if(height>3.1||b.z>Math.min(height+.35,gloveHeight(p)+.9)||b.z<height||dist(p,b)>catchReach(p)+.65||f.elapsed<p.reaction)return false;
  if(!this.specialAttempt(i,'robbery',2.1))return false;
  this.fieldingAction(i,'robbery');this.markGreat(i,'robbery',true);
  if(f.manual)this.secureManualBall(i,true);else this.finishBall('flyout');return true;
 }
 fieldingAction(index,type,success=true){
  const f=this.field,actor=f.fielders[index];
  actor.action={type,time:f.elapsed,success,dx:f.ball.x-actor.x,dy:f.ball.y-actor.y};
  const calls={...SPECIAL_LABELS,bobble:['MISPLAY','打球を後逸'],wild:['WILD THROW','送球がそれた']};
  if(!calls[type])return;
  if(SPECIAL_LABELS[type]){if(success){this.playEvents.push({type,fielder:index,time:f.elapsed,success:true});f.fieldingNote=calls[type][1];}return;}
  const [en,ja]=calls[type];
  f.fieldingNote=ja;
  this.playEvents.push({type,fielder:index,time:f.elapsed});
  this.message(en,ja,actor.player,type==='wild'||type==='bobble'?'neutral':'out');
 }
 dropFly(index){
  const f=this.field,b=f.ball,p=f.fielders[index];
  if(f.misplay||f.buntResult||this.runningDemo||p.fieldRating==null)return false;
  const reach=dist(p,b)/Math.max(.5,catchReach(p)),moving=(p.moveSpeed||0)/Math.max(1,p.speed),hard=reach>.82||moving>.8||Math.hypot(p.x-p.startX,p.y-p.startY)>9;
  const difficulty=hard?clamp(.85+reach*.55+moving*.35,.8,2.1):.10;
  if(Math.random()>=fieldErrorChance(p,difficulty,this.weather==='rain'))return false;
  f.errorWouldOut=reach<=1&&b.z<=gloveHeight(p);
  const errors=(this.side==='home'?'away':'home')+'Errors';
  this[errors]=(this[errors]||0)+1;
  f.misplay='drop';f.groundRead=null;p.recoverAt=f.elapsed+.7;
  b.z=0;b.vz=0;b.bounces=Math.max(1,b.bounces);b.vx*=.35;b.vy*=.35;
  this.fieldingAction(index,'bobble');this.emit('sound','bounce');
  return true;
 }
 bobbleGrounder(index){
  const f=this.field,b=f.ball,p=f.fielders[index];
  const speed=Math.hypot(b.vx,b.vy),difficult=speed>23||speed>13&&b.z>.30;
  if(f.misplay||f.buntResult||this.runningDemo||p.fieldRating==null)return false;
  const reach=dist(p,b)/Math.max(.5,p.reach),difficulty=difficult?clamp(.7+speed/36+b.z*.4+reach*.25+(b.irregular?.3:0),.75,2.2):.10;
  if(Math.random()>=fieldErrorChance(p,difficulty,this.weather==='rain'))return false;
  const runner=f.runners.find(r=>r.batter);f.errorWouldOut=!!runner&&index<6&&this.baseThrow(index,1,.25).duration+.20<runTime(runner,1);
  const errors=(this.side==='home'?'away':'home')+'Errors';
  this[errors]=(this[errors]||0)+1;
  f.misplay='bobble';f.groundRead=null;p.recoverAt=f.elapsed+.48;
  b.vx*=.58;b.vy*=.68;b.vz=Math.max(.5,b.vz);
  this.fieldingAction(index,'bobble');this.emit('sound','bounce');
  return true;
 }
 prepareFieldThrow(plan){
  const f=this.field,p=f.fielders[plan.fromIndex],length=dist(plan.from,plan.to);
  if(!p)return plan;
  const low=length>43&&p.armRating<65,skip=low&&length>54;
  plan={...plan,throwStyle:skip?'bounce':length>40?'crow-hop':(p.pickupStyle==='backhand'?'sidearm':p.pickupStyle==='charge'?'running':'overhand')};
  if(f.misplay||this.runningDemo||length<31||p.fieldRating==null)return plan;
  const error=fieldErrorChance({...p,catchRating:Math.round(p.fieldRating*.7+(p.armRating??70)*.3)},length>42?1.3:.55,this.weather==='rain');
  if(Math.random()>=error)return plan;
  const offset=rnd(2.5,4.3)*(Math.random()<.5?-1:1);
  const wanted=plan.to;
  const to={x:wanted.x+(wanted.y-plan.from.y)/length*offset,y:wanted.y-(wanted.x-plan.from.x)/length*offset};
  const errors=(this.side==='home'?'away':'home')+'Errors';
  this[errors]=(this[errors]||0)+1;
  f.misplay='wild';const runner=f.runners.find(r=>r.id===plan.runnerId);f.errorWouldOut=!!runner?.batter&&plan.duration+.15<runTime(runner,1);this.fieldingAction(plan.fromIndex,'wild');
  return {...plan,to,coverAt:wanted,duration:plan.duration+(dist(plan.from,to)-length)/p.arm};
 }
 // A called foul is dead for gameplay, but its existing velocity is kept
 // for a brief visual follow-through. No fielding, runner or scoring logic.
 updateFoulMotion(dt){
  const f=this.field;
  if(!f||f.outcome!=='foul'||!f.resolved||!(f.foulMotionRemaining>0)||dt<=0)return;
  let remaining=Math.min(dt,f.foulMotionRemaining);
  f.foulMotionRemaining=Math.max(0,f.foulMotionRemaining-remaining);
  const b=f.ball;
  while(remaining>1e-6){
   const step=Math.min(remaining,1/120);
   const landed=moveBattedBall(b,step,this.windVector(),this.park);
   if(landed&&b.bounces<=3)this.emit('sound','bounce');
   remaining-=step;
  }
  f.trail.push({x:b.x,y:b.y,z:b.z});if(f.trail.length>14)f.trail.shift();
 }
 updateField(dt){
  const f=this.field,b=f.ball;f.elapsed+=dt;
  const move=(p,target,speed)=>moveFielder(p,target,speed,dt);
  this.updateRunners(dt);
  this.updateLiveHitMusic();
  if(f.manual?.secured){this.updateManualDefense(dt,move);return;}
  if(f.throw){
   const th=f.throw,arrived=this.stepReturn(th,b,dt);
   f.fielders.forEach((p,i)=>{if(i!==th.fromIndex)move(p,i===th.receiver?th.to:p.target,p.speed);else p.running=false;});
   if(arrived){
    const caught=!!f.fielders[th.receiver]&&dist(f.fielders[th.receiver],th.to)<=BAG_REACH;
    if(caught)this.emit('sound','catch');
    const base=th.base??BASES.findIndex((bag,i)=>i>0&&dist(bag,th.to)<.01);
    const runner=f.runners.find(r=>base===2?r.start===1:r.batter);
    const force=['groundout','forceout','doubleplay','buntout','sacrifice'].includes(th.result);
    if(force&&(!caught||!runner||runner.out||runner.progress>=base-1e-6)){
     if(runner&&!runner.out&&runner.progress>=base-1e-6)this.playCall('safe',base);
     this.finishBall(f.forceOutRecorded?'forceout':f.buntResult?'buntsingle':'single');return;
    }
    if(force)this.playCall('out',base);
    if(th.relay&&this.outs<this.outsNeeded-1){
     this.addOut();f.forceOutRecorded=true;
     runner.out=true;runner.running=false;
     f.throw={...th.relay,from:{...th.to},t:0};this.emit('sound','throw');this.notify();
    }else this.finishBall(th.result);
   }
   return;
  }
  if(moveBattedBall(b,dt,this.windVector(),this.park)&&b.bounces<=2){
   // Irregular hop (v107 physics): ~3% of infield grounders kick sideways
   // or hop on their first bounce. Small enough that the fielder's cached
   // read goes stale and he sometimes reacts late — never a sure error.
   if(b.bounces===1&&!b.irregular&&!f.foul&&!f.buntResult&&!this.derby&&f.trajectory==='ground'&&Math.hypot(b.x,b.y)<42&&Math.random()<clamp(.03*groundFactors(this.park,b).irregular*(b.wetField?1.25:1)*clamp(Math.hypot(b.vx,b.vy)/24,.55,1.5),.01,.055)){
    b.irregular=true;const kick=clamp(Math.hypot(b.vx,b.vy)*.055,.55,1.8);b.vx+=rnd(-kick,kick);b.vz=Math.max(b.vz,rnd(.9,2.25));f.groundRead=null;
   }
   f.impact={type:'bounce',x:b.x,y:b.y,time:f.elapsed};
   this.emit('sound','bounce');
  }
  const travel=Math.hypot(b.x,b.y);f.maxTravel=Math.max(f.maxTravel,travel);this.hit.distance=Math.round(f.maxTravel);
  const angle=Math.atan2(b.x,b.y),wall=NightPlayers.wallDistance(this.park,angle);
  if(!f.foul&&!f.overFence&&travel>=wall){
   const clearsWall=!f.wallHit&&b.z>NightPlayers.fenceHeight(this.park,angle);
   if(clearsWall&&b.bounces&&!this.derby){f.groundRule=true;this.finishBall('double');return;}
   if(clearsWall&&!b.bounces){if(this.tryRobbery(wall,angle))return;f.overFence=true;}
   else{
    this.emit('sound','wall');f.impact={type:'wall',x:b.x,y:b.y,time:f.elapsed};f.wallHit=true;f.groundRead=null;f.wallAt=f.elapsed;const ratio=(wall-.25)/travel;b.x*=ratio;b.y*=ratio;if(this.derby&&!this.derby.enhanced){b.vx*=-(this.park.customSpec?.wallRebound??.25);b.vy*=-(this.park.customSpec?.wallRebound??.25);}else reflectFence(b,this.park,angle,wall);
    if(this.derby){const landing=this.predictLanding(b);f.landing=landing;f.landingTime=f.elapsed+landing.time;}
    else f.landing={x:b.x,y:b.y};
   }
  }
  if(f.overFence&&!this.derby){
   f.trail.push({x:b.x,y:b.y,z:b.z});if(f.trail.length>14)f.trail.shift();
   if(b.bounces>0)this.finishBall('hr');
   return;
  }
  if(!this.derby&&!f.foul&&!f.airReaction&&f.maxTravel>48&&b.z>3&&Math.hypot(f.landing.x,f.landing.y)>80){
   f.airReaction=true;this.emit('sound','flight');
  }
   if(this.derby){
    f.trail.push({x:b.x,y:b.y,z:b.z});if(f.trail.length>14)f.trail.shift();
    if(this.derby.enhanced){
     if(b.bounces>0&&!f.derbyLanding){f.derbyLanding={x:b.x,y:b.y};f.derbyGroundAt=f.elapsed;}
     if(f.overFence&&b.bounces>0){this.finishDerbyBall(true);return;}
     // No fielder is present in derby. Follow the first landing, roll or
     // rebound for a readable interval, then keep rolling through the result.
     // A foul stays live visually until it actually lands.
     if(!f.overFence&&b.bounces>0){
      const groundTime=f.elapsed-f.derbyGroundAt,wallTime=f.wallHit?f.elapsed-f.wallAt:Infinity;
      if((Math.hypot(b.vx,b.vy)<2.5&&b.z<.2&&groundTime>.35||groundTime>=(f.trajectory==='ground'?1.55:f.foul?.80:1.05))&&wallTime>.6)this.finishDerbyBall(false);
     }
    }else if(b.bounces>0)this.finishDerbyBall(f.overFence);
    return;
   }
  if(f.foul&&(b.bounces>0||(this.park.custom&&!NightPlayers.insideFoul(this.park,b.x,b.y)))){this.finishBall('foul');return;}
  if(f.elapsed>FIELD_READ_DELAY){
   const grounded=b.bounces>0||f.wallHit;
   const target=grounded?this.readGroundBall():f.landing;
   if(grounded)f.chaser=target.index;
   const second=this.secondBaseCover(f.chaser,target);
   f.fielders.forEach((p,i)=>{
    let dest={x:p.startX,y:p.startY};
    if(i===f.chaser){dest=grounded?target:p.intercept||target;
     if(!grounded&&f.elapsed<p.reaction+.30&&p.fieldRating<78){const read=clamp((78-p.fieldRating)/55,0,.45)*(1-clamp((f.elapsed-p.reaction)/.30,0,1));dest={x:dest.x+(f.ball.x-dest.x)*read,y:dest.y+(f.ball.y-dest.y)*read};}
    }
    else if(i===2)dest=BASES[1];
    else if(i===second)dest=BASES[2];
    else if(i===3||i===4)dest={x:target.x*.35,y:Math.min(48,target.y*.5)};
    else if(i===5&&f.chaser!==5&&f.runners.some(r=>r.start>=2&&!r.out))dest=BASES[3];
    else if(i===0&&target.y>48)dest={x:0,y:-3};
    else if(i>=6){const drift=grounded&&target.y>45?.5:.18;dest={x:p.startX+(target.x-p.startX)*drift,y:p.startY+(target.y-p.startY)*drift};if(f.chaser>=6&&Math.abs(i-f.chaser)===1&&target.y>55){dest={x:target.x*.65+p.startX*.35,y:Math.max(p.startY,target.y+5)};}}
    if(!f.foul&&dest.y>0&&Math.abs(dest.x)<=dest.y){const a=Math.atan2(dest.x,dest.y),limit=NightPlayers.wallDistance(this.park,a)-.75,range=Math.hypot(dest.x,dest.y);if(range>limit&&limit>0)dest={x:dest.x*limit/range,y:dest.y*limit/range};}
    p.target=dest;if(f.elapsed>Math.max(p.reaction,p.recoverAt??0))move(p,dest,p.speed*(i<6&&dest.y>p.startY+2?.6:i>=6&&i===f.chaser?1.15:1));else p.running=false;
   });
   for(let i=0;i<f.fielders.length;i++){
    const p=f.fielders[i];if(f.elapsed<Math.max(p.reaction,p.recoverAt??0))continue;
    const distance=dist(p,b);
    const catchKind=!f.buntResult&&!grounded&&b.vz<0?catchType(p,b,distance,i===f.chaser&&!f.foul):null;

    if(catchKind){
     const gap=NightPlayers.wallDistance(this.park,Math.atan2(b.x,b.y))-Math.hypot(b.x,b.y);
     const special=catchKind!=='catch'?catchKind:!f.foul&&i>=6&&gap>=0&&gap<2.3&&Math.hypot(p.x-p.startX,p.y-p.startY)>10&&(distance>catchReach(p)*.65||b.z>1.65)?'wall':null;
     if(special&&catchKind!=='catch'&&!this.specialAttempt(i,special,1+Math.max(0,distance-catchReach(p))*.6))continue;
     if(f.manual&&!f.foul&&this.dropFly(i))return;
     this.fieldingAction(i,special||catchKind);
     if(special)this.markGreat(i,special,true);
     if(f.manual&&!f.foul)this.secureManualBall(i,true);else this.finishBall('flyout');return;
    }
    const diveStop=grounded&&!f.buntResult&&!f.foul&&i===f.chaser&&i>=2&&i<6&&b.z<.65&&distance>p.reach&&distance<=p.reach+.65*athleticReach(p)&&Math.hypot(b.vx,b.vy)>13&&this.specialAttempt(i,'stop',1.2);
    if(grounded&&b.z<1.3&&(distance<=p.reach||diveStop)){
     if(f.manual&&!f.foul){
      if(!this.bobbleGrounder(i)){this.fieldingAction(i,diveStop?'stop':'pickup');if(diveStop)this.markGreat(i,'stop');this.secureManualBall(i);}
      return;
     }
     if(f.buntResult){
      const info=this.baseThrow(i,1,.18);
      this.emit('sound','pickup');f.throw={...info,t:0,from:{x:b.x,y:b.y},result:f.buntResult};
      this.emit('sound','throw');this.notify();return;
     }
     const doublePlay=this.planDoublePlay(p);
     if(doublePlay){this.emit('sound','pickup');f.throw=doublePlay;this.emit('sound','throw');this.notify();return;}
     const deep=outfieldPickup(i,b),first=this.baseThrow(i,1,deep?.82:.23);
     const groundOut=!deep&&travel<47&&f.elapsed+first.duration<27.44/f.runnerSpeed;
     const returnTime=f.elapsed+this.baseThrow(i,2,deep?.96:.4).duration;
     const n=groundOut?0:travel<50?1:clamp(Math.floor((returnTime+.65)/(27.44/f.runnerSpeed)),1,3);
     const result=groundOut?'groundout':n===1?'single':n===2?'double':'triple';
     if(!groundOut)f.runners.forEach(r=>r.target=Math.min(4,r.start+n));
     this.emit('sound','pickup');
     f.throw={...(groundOut?first:this.baseThrow(i,Math.min(n+1,3),.3)),from:{x:b.x,y:b.y},t:0,result};
     p.running=false;this.emit('sound','throw');this.notify();return;
    }
   }
  }
  f.trail.push({x:b.x,y:b.y,z:b.z});if(f.trail.length>14)f.trail.shift();
  if(f.manual){if(f.elapsed>25&&!f.manual.secured&&!f.slowBall){f.slowBall=true;b.vx=0;b.vy=0;b.z=0;b.bounces=Math.max(1,b.bounces);f.groundRead=null;}return;}
  if(f.elapsed>18){if(f.buntResult){this.finishBall(f.buntResult);return;}if(f.foul)this.finishBall('foul');else this.finishBall(travel>90?'triple':travel>55?'double':'single');}
 }
 secondBaseCover(chaser,point){
  const f=this.field;
  if(f.foul||!outfieldPickup(chaser,point))return null;
  // The middle infielder opposite the play covers second; the other can relay.
  const leftField=f.landing.x<0;
  return chaser===3?4:chaser===4?3:leftField?3:4;
 }
 baseThrow(holder,base,release,from=this.field.fielders[holder]){
  const cover=base===2?this.secondBaseCover(holder,from):null;
  return this.coverThrow(holder,BASES[base],cover==null?COVER[base]:[cover],release,from,base);
 }
 coverThrow(holder,to,candidates,release,from,base=null){
  const f=this.field;
  let receiver=null,coverTime=Infinity;
  for(const i of candidates){
   const candidate=f.fielders[i];
   if(i===holder||!candidate)continue;
   const eta=fielderETA(candidate,to,candidate.speed);
   if(eta<coverTime){receiver=i;coverTime=eta;}
  }
  const flight=dist(from,to)/(f.fielders[holder].arm*(outfieldPickup(holder,from)?(base==null?.95:1.02):1));
  // Give the covering player time to arrive by holding the release briefly.
  // The actual arrival still requires the ball to meet the receiving glove.
  const extraHold=base==null?.8:outfieldPickup(holder,from)?.48:1.2;
  const windup=release+clamp(coverTime+.05-release-flight,0,extraHold);
  return {to:{...to},base,receiver,duration:Math.max(.05,windup+flight),release:windup,fromIndex:holder};
 }
 stepReturn(th,b,dt){
  th.t+=dt;
  const release=th.release||0,u=clamp((th.t-release)/Math.max(.001,th.duration-release),0,1);
  b.x=th.from.x+(th.to.x-th.from.x)*u;b.y=th.from.y+(th.to.y-th.from.y)*u;
  const arc=clamp(dist(th.from,th.to)*.07,.35,5.2);
  if(th.throwStyle==='bounce'){
   const q=u<=.82?u/.82:(u-.82)/.18;
   b.z=u<=.82?1.65*(1-q)+.08*q+Math.sin(q*Math.PI)*arc*.66:.08+(1.65-.08)*q+Math.sin(q*Math.PI)*.28;
  }else b.z=1.65+Math.sin(u*Math.PI)*arc;
  return th.t>=th.duration-1e-8;
 }
 planDoublePlay(fielder){
  const f=this.field,holder=f.fielders.indexOf(fielder);
  if(holder<0||f.buntResult||f.foul||!this.bases[0]||this.outs>=this.outsNeeded-1||outfieldPickup(holder,f.ball)||Math.hypot(f.ball.x,f.ball.y)>47)return null;
  const runner=f.runners.find(r=>r.start===1),batter=f.runners.find(r=>r.batter);
  if(!runner||!batter)return null;
  const second=this.baseThrow(holder,2,.18);
  if(second.duration>=Math.max(0,2-runner.progress)*27.44/runner.speed)return null;
  const relay=this.baseThrow(second.receiver,1,.22,BASES[2]);
  const dp=second.duration+relay.duration<Math.max(0,1-batter.progress)*27.44/batter.speed;
  return {...second,from:{x:f.ball.x,y:f.ball.y},t:0,result:'forceout',
   relay:dp?{...relay,result:'doubleplay'}:null};
 }
 finishSmallBall(kind){
  const f=this.field,old=this.baseIds.slice(),oldCharges=this.basePitcherIds.slice();
  const hit=kind==='buntsingle',sac=kind==='sacrifice',dp=kind==='doubleplay',force=kind==='forceout';
  const thirdOut=(f.outsAtContact??this.outs)+(dp?2:1)>=this.outsNeeded;
  const record=hit?'single':sac&&old.some(Boolean)&&!thirdOut?'sacrifice':dp?'doubleplay':force?'forceout':'groundout';
  const before=this.battingScore;
  if(this.inMatch){
   if(hit)this.advance(1);
   else if(dp){
    if(!f.forceOutRecorded)this.addOut();this.addOut();this.bases[0]=false;this.baseIds[0]=null;this.basePitcherIds[0]=null;
   }else{
    if(!force||!f.forceOutRecorded)this.addOut();
    if((sac||force)&&!thirdOut){
     this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];
     for(let i=2;i>=0;i--)if(old[i]&&!(force&&i===0)){
      if(i===2)this.run(old[i],oldCharges[i]);else{this.bases[i+1]=true;this.baseIds[i+1]=old[i];this.basePitcherIds[i+1]=oldCharges[i];}
     }
     if(force){this.bases[0]=true;this.baseIds[0]=this.batter.id;this.basePitcherIds[0]=this.pitcher.id;}
    }
   }
  }
  f.resolved=true;f.outcome=kind;
  for(const r of f.runners){
   r.out=!hit&&((r.batter&&!force)||((dp||force)&&r.start===1));
   r.target=hit?Math.min(4,r.start+1):thirdOut?r.progress:(sac||force?Math.min(4,r.start+1):r.start);
   r.running=false;
  }
  const runs=this.battingScore-before;
  if(hit){this[this.side+'Hits']++;this.pitcherRecord().h++;if(!this.defending)this.session.hits++;}
  this.completePitch(record);
  if(this.inMatch){this.endAtBat(record,runs);this.resetCount();this.checkEnd();}
  this.hit.kind=kind;
  const label=hit?['BUNT HIT','バントヒット']:dp?['DOUBLE PLAY','ダブルプレー']:force?['FORCE OUT','二塁フォースアウト']:sac?['SACRIFICE BUNT','送りバント']:['BUNT OUT','バント失敗'];
  this.message(label[0],label[1],`${this.outs}アウト${runs?' · '+runs+'点':''}`,hit?'hit':'out');
  this.emit('cue',hit?'hit':'out');this.emit('sound',hit?'safe':'out');this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 // Runners are human-commanded when the batting side is a person using
 // manual running. Offline that is the local user while batting. In an
 // online game the batting side may be the remote player: the host then
 // takes the remote player's own manual-running choice (remoteRunning,
 // synced from the guest) instead of its local one.
 runnersCommanded(){
  if(this.remoteSide)return this.remoteBatter?!!this.remoteRunning:this.manualRunning&&!this.defending;
  return this.manualRunning&&!this.defending;
 }
 canControlRunner(id){
  return !!this.field?.manual?.userControlled&&(this.mode!=='career-bat'||id===this.career?.playerId&&this.field.runners.some(r=>r.id===id&&r.batter));
 }
 get manualPlay(){
  return !!(this.field?.manual?.userControlled&&!this.umpireMode&&!this.field.resolved&&this.phase==='field'&&!this.defending&&
   (this.mode!=='career-bat'||this.field.runners.some(r=>!r.out&&!r.scored&&this.canControlRunner(r.id))));
 }
 setRunningMode(manual){
  if(this.paused||this.field&&['field','result'].includes(this.phase))return false;
  this.manualRunning=!!manual;this.notify();return true;
 }
 selectRunner(id){
  if(!this.manualPlay||!this.canControlRunner(id))return false;
  if(id!=='all'&&!this.field.runners.some(r=>r.id===id&&!r.out&&!r.scored))return false;
  this.field.manual.selection=id;this.notify();return true;
 }
 commandRunner(id,base){
  if(this.mirror){
   // Guest: the host owns the simulation, so forward the command instead
   // of applying it locally; the host re-validates it against the
   // authoritative runner state (remoteCommandRunner).
   if(!this.manualPlay||!this.canControlRunner(id)||this.paused||!Number.isInteger(base))return false;
   const r=this.field.runners.find(x=>x.id===id&&!x.out&&!x.scored);if(!r)return false;
   if(!this.runnerCommandValid(r,base))return false;
   this.mirrorSend?.({t:'runner-command',id,base});return true;
  }
  if(!this.manualPlay||!this.canControlRunner(id)||this.paused||!Number.isInteger(base))return false;
  const r=this.field.runners.find(x=>x.id===id&&!x.out&&!x.scored);if(!r)return false;
  return this.applyRunnerCommand(r,base);
 }
 runnerCommandValid(r,base){
  const at=Math.abs(r.progress-Math.round(r.progress))<.000001;
  const forward=at?Math.round(r.progress)+1:Math.ceil(r.progress),backward=at?Math.round(r.progress)-1:Math.floor(r.progress);
  return !(base<1||base>4||base!==forward&&base!==backward||r.needsTag&&(base>=r.progress||base<r.start));
 }
 applyRunnerCommand(r,base){
  if(!this.runnerCommandValid(r,base))return false;
  r.command=base;r.target=base;r.waiting=false;r.running=Math.abs(base-r.progress)>.001;this.field.manual.selection=r.id;this.notify();return true;
 }
 // Host side of online play: apply a baserunning command the guest sent
 // for the guest's own runners. Mirrors commandRunner's validation, but
 // the "user" at the controls is the remote batter, not the local player.
 remoteCommandRunner(id,base){
  if(this.paused||!this.remoteSide||!this.remoteBatter||this.umpireMode)return false;
  if(this.phase!=='field'||!this.field||this.field.resolved||!this.field.manual?.userControlled)return false;
  if(!Number.isInteger(base))return false;
  const r=this.field.runners.find(x=>x.id===id&&!x.out&&!x.scored);if(!r)return false;
  return this.applyRunnerCommand(r,base);
 }
 commandRunners(action){
  if(this.mirror){
   // Guest: resolve the selected runner's advance/return against the
   // mirrored state and forward it as an explicit runner command.
   if(!this.manualPlay||!['advance','return'].includes(action)||this.paused)return false;
   const r=this.field.runners.find(x=>x.id===this.field.manual.selection);if(!r)return false;
   const at=Math.abs(r.progress-Math.round(r.progress))<.000001;
   return this.commandRunner(r.id,action==='advance'?(at?Math.round(r.progress)+1:Math.ceil(r.progress)):(at?Math.round(r.progress)-1:Math.floor(r.progress)));
  }
  if(!this.manualPlay||!['advance','return'].includes(action))return false;
  const r=this.field.runners.find(x=>x.id===this.field.manual.selection);if(!r||this.paused)return false;
  if(this.mode==='career-bat'&&r.batter&&r.progress<1&&action==='advance'){
   if(r.requestNext)return false;
   r.requestNext=2;return true;
  }
  if(action==='return')delete r.requestNext;
  const at=Math.abs(r.progress-Math.round(r.progress))<.000001;
  return this.commandRunner(r.id,action==='advance'?(at?Math.round(r.progress)+1:Math.ceil(r.progress)):(at?Math.round(r.progress)-1:Math.floor(r.progress)));
 }
 manualForceBase(r){
  const f=this.field,m=f.manual;if(m.fly)return 0;
  const base=r.batter?1:m.initialBases.slice(0,r.start).every(Boolean)?r.start+1:0;
  if(!base||r.furthest>=base)return 0;
  const chain=f.runners.filter(p=>p.start<r.start);
  return chain.some(p=>p.out)?0:base;
 }
 projectRunner(r){
  r.progress=clamp(r.progress,0,4);const i=Math.min(3,Math.floor(r.progress)),u=r.progress-i;
  r.x=BASES[i].x+(BASES[i+1].x-BASES[i].x)*u;r.y=BASES[i].y+(BASES[i+1].y-BASES[i].y)*u;
 }

 playCall(verdict,base){
  this.emit('play-call',{verdict,base});
 }
 safeOnThrow(r,base){
  if(!r||r.out||!base)return;
  if(!r.needsTag&&(r.base===base||r.scored&&base===4)){
   this.playCall('safe',base);
   r.contestedBase=null;
  }else r.contestedBase=base;
 }
 manualOut(r,type,base=r.target??Math.ceil(r.progress)){
  if(!r||r.out||this.outs>=this.outsNeeded)return;
  if(r.batter&&r.furthest<1&&type!=='catch')type='batter';
  // A close throw is adjudicated before committing an out (see reviewBaseArrival).
  r.out=true;r.running=false;r.waiting=false;r.target=r.progress;r.scored=false;
  const m=this.field.manual;const great=this.field.greatPlay,th=m.lastThrow;
  if(type!=='catch'&&type!=='appeal'&&th&&th.runnerId===r.id&&th.base===base&&this.field.elapsed-th.time<2.5){if(great?.type==='stop'&&great.fielder===th.fromIndex)great.confirmed=true;else if(th.fromIndex>=6&&th.distance>=42&&th.armRating>=76&&r.start>0)this.markGreat(th.fromIndex,'laser',true);}
  m.outs.push({id:r.id,type,time:this.field.elapsed});m.lastOut=m.outs.at(-1);
  this.playEvents.push({type:'out',runnerId:r.id,method:type,time:this.field.elapsed});if(this.inMatch)this.addOut();this.emit('sound','out');
  if(type!=='catch'&&!this._committingBaseReview)this.playCall('out',Number.isInteger(base)?base:null);
  this.notify();
 }
 // Evaluate arrival using the same simulation clock as runner and throw.
 // A positive gap means the ball/tag got there first; negative means safe.
 reviewBaseArrival(r,th,receiver,onBag){
  const f=this.field,m=f.manual,base=th.base;
  if(!Number.isInteger(base)||base<1||base>3||th.appeal||!onBag||r.needsTag||r.scored)return false;
  const force=!m.fly&&base===r.start+1&&(r.batter||m.initialBases.slice(0,r.start).every(Boolean)&&!f.runners.some(p=>p.start<r.start&&p.out));
  const touch=r.touchedAt?.[base];
  if(Math.abs(r.progress-base)>.085||!force&&dist(receiver,r)>1.35)return false;
  if(touch!=null&&r.progress>base+.015)return false;
  if(touch==null&&(r.command!==base||r.progress>=base))return false;
  const arrival=f.elapsed-Math.max(0,th.t-th.duration);
  const gap=(touch??(f.elapsed+runTime(r,base)))-arrival;
  if(!Number.isFinite(gap)||Math.abs(gap)>BASE_REVIEW_WINDOW)return false;
  const type=force?(r.batter?'batter':'force'):'tag';
  const truth=gap>0?'out':'safe';
  f.reviewMoment={base,time:arrival,runnerId:r.id,gap};
  // In unsupported modes the physical ruling is still used, without a challenge.
  const eligible=this.inMatch&&this.playChallenges!==undefined&&!this.runningDemo;
  const called=eligible&&!this.umpireMode&&Math.random()<baseErrorRate(gap)?(truth==='out'?'safe':'out'):truth;
  const challenger=called==='out'?this.side:this.side==='home'?'away':'home';
  const call={runnerId:r.id,base,type,called,truth,gap,time:arrival,batSide:this.side,challenger,pending:true,done:false};
  m.closeCall=call;
  if(eligible&&this.beginPlayCall())return true;
  this.commitBaseArrival(call,called);return true;
 }
 commitBaseArrival(call,verdict){
  const f=this.field,m=f?.manual,r=f?.runners.find(x=>x.id===call.runnerId);
  if(!r||!m)return;
  if(m.closeCall)m.closeCall.done=true;
  if(verdict==='out'){
   this._committingBaseReview=true;
   try{this.manualOut(r,call.type,call.base);}finally{this._committingBaseReview=false;}
  }else{
   r.out=false;r.scored=false;r.base=call.base;r.command=call.base;r.progress=call.base;r.target=call.base;
   r.waiting=true;r.running=false;r.contestedBase=null;r.blocked=false;
   r.furthest=Math.max(r.furthest||0,call.base);r.touchedAt||={};r.touchedAt[call.base]??=call.time??f.elapsed;
   this.projectRunner(r);
  }
 }
 updateAutoTargets(){
  const f=this.field,m=f.manual,b=f.ball;
  if(m.userControlled&&this.mode!=='career-bat')return;
  const down=b.bounces>0||f.wallHit;
  const read=!m.secured&&down?this.readGroundBall():null;
  const pickup=m.secured?f.fielders[m.holder]:read;
  const pickupIndex=m.secured?m.holder:read?.index;
  const depth=pickup?Math.max(f.maxTravel,Math.hypot(pickup.x,pickup.y)):f.maxTravel;
  const deep=pickup&&outfieldPickup(pickupIndex,pickup);
  for(const r of [...f.runners].sort((a,b)=>b.start-a.start)){
   if(r.out||r.scored||this.canControlRunner(r.id))continue;
   if(r.needsTag){r.command=r.start;continue;}
   const enRoute=r.command>r.base;
   const forced=this.manualForceBase(r);
   if(forced&&(r.batter||down||!f.catchable||this.outs===this.outsNeeded-1)){
    if(!enRoute||forced>r.command){r.command=forced;continue;}
    if(forced<r.command)continue;
   }
   const next=enRoute?r.command+1:r.base+1;
   if(next>4||r.batter&&next===4)continue;
   if(f.runners.some(other=>other.start>r.start&&!other.out&&!other.scored&&other.progress<=next&&(other.command??other.base)<=next))continue;
   if(m.fly){
    if(!m.secured||f.outsAtContact>=this.outsNeeded-1||r.didTag)continue;
    // Decision after retouch: depth, arm and fielder transfer versus runner's ETA.
    const minimum=r.start===3?54:r.start===2?73:91;
    if(depth<minimum)continue;
    const throwTime=Math.max(0,m.recovery)+this.baseThrow(m.holder,next,.38).duration;
    const margin=r.start===3?-.08:r.start===2?.10:.24;
    if(throwTime>runTime(r,next)+margin){r.command=next;r.didTag=true;r.waiting=false;}
    continue;
   }
   if(!down||!deep||depth<(r.batter&&next===3?87:next===4?57:51))continue;
   const returning=f.throw;
   let returnTime;
   if(returning&&f.fielders[returning.receiver]){
    returnTime=Math.max(0,returning.duration-returning.t);
    if(next!==returning.base)returnTime+=this.baseThrow(returning.receiver,next,.27,returning.to).duration;
   }else{
    const pickupDelay=m.secured?Math.max(0,m.recovery):Math.max(0,read.at-f.elapsed)+(next===2?(Math.hypot(f.landing.x,f.landing.y)>=57&&f.trajectory!=='ground'?2.45:.88):.54);
    returnTime=pickupDelay+this.baseThrow(pickupIndex,next,next===4?.72:next===2?.62:.53,pickup).duration;
    const beaten=Math.abs(pickup.x-pickup.y*.025)>pickup.y*.23||f.wallHit;
    if(depth>=57&&(beaten||depth>=68)){
     const relayPt={x:pickup.x*.39,y:clamp(pickup.y*.60,36,47)};
     const relay=this.coverThrow(pickupIndex,relayPt,[3,4,0].filter(i=>i!==pickupIndex),.38,pickup);
     if(relay.receiver!=null)returnTime=pickupDelay+relay.duration+.34+this.baseThrow(relay.receiver,next,.27,relayPt).duration;
    }
   }
   // The coach has less to lose on a clear drive into a gap than on a ball straight to an outfielder.
   const onTheRun=Math.abs(pickup.x-pickup.y*.025)>pickup.y*.23||f.wallHit;
   const margin=next===2?(f.trajectory==='ground'&&!f.wallHit?.75:.15):r.batter&&next===3?.82:next===4?.08:onTheRun&&depth>=68?-1.24:-.28;
   if(returnTime>runTime(r,next)+margin-(this.side!==this.userSide?this.customAdj('run')*.03:0))r.command=next;
  }
 }
 updateManualRunners(dt){
  const f=this.field,m=f.manual;this.updateAutoTargets();
  // Move in direction order; collisions stop the moving runner, never push another runner backwards.
  const ordered=[...f.runners].sort((a,b)=>((a.command??a.base)<a.progress?0:1)-((b.command??b.base)<b.progress?0:1)||((a.command??a.base)<a.progress?a.progress-b.progress:b.progress-a.progress));
  for(const r of ordered){
   if(r.out||r.scored)continue;
   if(r.readingFly&&!this.holdForCatch())r.readingFly=false;
   const target=r.command??r.base??r.start,previous=r.progress,delta=target-previous;
   const limit=r.readingFly&&delta>0?Math.max(previous,Math.min(target,r.start+FLY_LEAD)):target;
   r.target=target;
   const remaining=(target-previous)*BASE_PATH,th=f.throw;
   if(target>1&&remaining>0&&remaining<2.5&&th?.base===target&&th.runnerId===r.id&&
    Math.abs(th.duration-th.t-runTime(r,target))<.42&&r.slide?.base!==target){
    r.slide={base:target,time:f.elapsed};
   }
   let next=previous+Math.sign(delta)*Math.min(Math.abs(limit-previous),dt*legSpeed(r,target)/BASE_PATH);
   for(const other of f.runners){
    if(other===r||other.out||other.scored)continue;
    if(delta>0&&other.progress>previous+.001)next=Math.min(next,Math.max(previous,other.progress-.10));
    if(delta<0&&other.progress<previous-.001)next=Math.max(next,Math.min(previous,other.progress+.10));
   }
   const force=this.manualForceBase(r),holder=m.secured?f.fielders[m.holder]:null;
   if(holder&&!f.throw&&m.bag===target&&force===target&&dist(holder,BASES[target])<=BAG_REACH&&delta>0&&next>=target-.005){r.progress=Math.min(next,target-.005);this.projectRunner(r);this.manualOut(r,r.batter?'batter':'force');continue;}
   r.progress=clamp(next,0,4);r.running=Math.abs(r.progress-previous)>.000001;r.blocked=!r.readingFly&&Math.abs(delta)>.001&&!r.running;
   if(r.progress>previous)r.furthest=Math.max(r.furthest,Math.min(3,Math.floor(r.progress)));
   
   const reached=Math.abs(r.progress-target)<.00001&&Math.abs(delta)>.00001;
   if(reached){
    const touched=target;r.base=touched;r.furthest=Math.max(r.furthest,touched);r.touchedAt ||= {};r.touchedAt[touched]=f.elapsed-dt+runTime(r,touched,previous);
    r.command=touched;r.target=touched;r.running=false;r.waiting=true;r.blocked=false;
    this.playEvents.push({type:'base',runnerId:r.id,base:touched,time:r.touchedAt[touched]});
    if(r.needsTag&&touched===r.start){r.needsTag=false;r.furthest=r.start;}
    if(touched===4&&!r.needsTag){r.scored=true;r.waiting=false;r.crossedAt=r.touchedAt[4];}
    if(touched===r.contestedBase&&!r.needsTag)this.safeOnThrow(r,touched);
    if(r.requestNext===touched+1&&this.outs<this.outsNeeded&&!r.needsTag){
     r.command=r.requestNext;r.target=r.command;r.waiting=false;delete r.requestNext;
    }
   }
   this.projectRunner(r);
  }
 }

 secureManualBall(index,fly=false){
  const f=this.field,m=f.manual;m.secured=true;m.holder=index;m.bag=null;m.outfield=outfieldPickup(index,f.ball);
  const cover=this.secondBaseCover(index,f.ball);
  if(cover!==null)f.fielders[cover].target=BASES[2];
  const player=f.fielders[index],acrobatics=['dive','jump','wall','robbery','stop'].includes(player.action?.type);
  if(!fly){const cross=(player.moveX||0)*(f.ball.y-player.startY)-(player.moveY||0)*(f.ball.x-player.startX);player.pickupStyle=Math.abs(cross)>4?'backhand':player.moveY<-.5&&(player.moveSpeed||0)>player.speed*.65?'charge':'routine';}
  m.recovery=(fly?.28:m.outfield?(Math.hypot(f.landing.x,f.landing.y)>=57&&f.trajectory!=='ground'?1.1:.24):.24)+(70-(player.fieldRating??70))*.004+(acrobatics?.46:0)+(player.pickupStyle==='backhand'?.09:player.pickupStyle==='charge'?-.045:0)-clamp(player.condition||0,-2,2)*.012;m.recovery=Math.max(.12,m.recovery);m.fly=fly||m.fly;m.pickupAt=f.elapsed;
  f.ball.vx=f.ball.vy=f.ball.vz=0;f.trail=[];this.playEvents.push({type:fly?'catch':'pickup',fielder:index,time:f.elapsed});
  if(fly){
   this.emit('sound','catch');this.manualOut(f.runners.find(r=>r.batter),'catch');
   for(const r of f.runners.filter(r=>!r.batter&&!r.out)){
    r.needsTag=r.progress>r.start+.001;r.scored=false;r.crossedAt=null;
    const autoReturn=r.contactAdvance||!this.canControlRunner(r.id)||this.mode==='career-bat';
    r.readingFly=false;
    if(r.needsTag||Math.abs(r.progress-r.start)<.001){
     r.command=autoReturn||!r.needsTag?r.start:r.progress;r.target=r.command;
     r.autoTarget=r.start;r.base=r.start;r.waiting=!autoReturn||!r.needsTag;
    }
   }
  }else this.emit('sound','pickup');
  this.notify();
 }
 manualRuns(){
  const f=this.field,m=f.manual;
  if(this.outs>=this.outsNeeded&&['force','batter'].includes(m.lastOut?.type))return [];
  return f.runners.filter(r=>r.scored&&!r.out&&!r.needsTag&&(this.outs<this.outsNeeded||r.crossedAt<(m.lastOut?.time??-Infinity))).sort((a,b)=>a.crossedAt-b.crossedAt||b.start-a.start);
 }
 displayScore(){
  const score={away:this.awayScore,home:this.homeScore};
  const f=this.field;
  if(this.phase!=='field'||!f?.manual||f.resolved||!f.runners.some(r=>r.scored))return score;
  if(f.outsAtContact===this.outsNeeded-1&&f.runners.some(r=>!r.out&&this.manualForceBase(r)))return score;
  let pending=this.manualRuns().length;
  if((this.isFixture||this.career?.continuous)&&this.half==='bottom'&&this.inning>=this.totalInnings){
   const needed=this.runsToEndGame;
   if(needed>0)pending=Math.min(pending,needed);
  }
  score[this.side]+=pending;
  return score;
 }
 manualWalkoffReady(){
  if(!this.isFixture&&!this.career?.continuous||this.half!=='bottom'||this.inning<this.totalInnings)return false;
  const f=this.field,needed=this.runsToEndGame;
  return needed>0&&this.manualRuns().length>=needed&&f.runners.find(r=>r.batter).furthest>=1&&!f.runners.some(r=>!r.out&&this.manualForceBase(r));
 }
 manualThrowPlan(){
  const f=this.field,m=f.manual,holder=f.fielders[m.holder],choices=[];
  const batter=f.runners.find(r=>r.batter&&!r.out&&!r.scored);
  const firstRunner=f.runners.find(r=>r.start===1&&!r.out&&!r.scored);
  for(const r of f.runners){
   if(r.out||r.scored)continue;
   const force=this.manualForceBase(r),appeal=r.needsTag&&r.progress>r.start+.04;
   const atBase=Math.abs(r.progress-Math.round(r.progress))<.015;
   if(!force&&!appeal&&atBase&&!r.running)continue;
   const base=force||(appeal?r.start:clamp(r.target<r.progress?Math.floor(r.progress):Math.ceil(r.progress),1,4));
   const release=m.outfield?.62:base===2?.16:.24;
   const plan=this.baseThrow(m.holder,base,release),{receiver,duration}=plan;
   if(receiver==null||m.bag===base&&dist(holder,BASES[base])<=BAG_REACH)continue;
   if(m.outfield&&!appeal&&base!==2&&dist(holder,BASES[base])>(force?57:37))continue;
   if(m.outfield&&base===2&&dist(holder,BASES[2])>40)continue;
   const runnerETA=runTime(r,base);
   const safeMargin=m.outfield?.27:.035;
   if(!((appeal&&duration<runnerETA)||
        (force&&duration<runnerETA-safeMargin)||
        (!force&&r.running&&duration<runnerETA+.15)))continue;

   // First choose a possible TWO-OUT play rather than sorting targets by base
   // number. Especially on a 4/6 grounder with runners on first and second,
   // the usual pivot must be SECOND -> FIRST, not an unnecessary throw to third.
   let doublePlay=false;
   if(force&&base===2&&firstRunner===r&&batter&&this.outs<this.outsNeeded-1&&!m.fly&&!m.outfield){
    const relay=this.baseThrow(receiver,1,.18,BASES[2]);
    if(relay.receiver!=null&&relay.receiver!==receiver){
     doublePlay=duration+.16+relay.duration<runTime(batter,1)-.04;
    }
   }
   let score=(appeal?105:force?112:35)-duration*8.5;
   if(force&&base===2&&firstRunner===r&&this.outs<this.outsNeeded-1&&!m.outfield){
    score+=84; // middle-infield force is the correct pivot before evaluating a relay
    if(doublePlay)score+=270;
   }
   if(force&&base===3&&firstRunner&&this.outs<this.outsNeeded-1)score-=42;
   // With loaded bases and a runner about to score, keep a feasible play at
   // home competitive when the second-base double play is not available.
   if(force&&base===4&&this.bases.every(Boolean)&&this.outs<this.outsNeeded-1)score+=56;
   if(appeal)score+=13; // retouch appeals after a caught fly
   choices.push({...plan,runnerId:r.id,appeal,score,doublePlay});
  }
  const choice=choices.sort((a,b)=>b.score-a.score||a.duration-b.duration)[0];
  if(!choice)return null;
  return {...choice,from:{x:f.ball.x,y:f.ball.y},to:{...BASES[choice.base]},t:0,manual:true};
 }
 updateManualDefense(dt,move){
  const f=this.field,m=f.manual,b=f.ball;
  if(this.outs>=this.outsNeeded||this.manualWalkoffReady()){this.finishManualPlay();return;}
  if(f.throw){
   const th=f.throw,arrived=this.stepReturn(th,b,dt);
   f.fielders.forEach((p,i)=>{if(i!==(th.fromIndex??m.holder))move(p,i===th.receiver?(th.coverAt||th.to):p.target,p.speed);else p.running=false;});
   if(arrived){
    const receiver=f.fielders[th.receiver],runner=th.runnerId==null?null:f.runners.find(r=>r.id===th.runnerId);
    f.throw=null;m.lastThrow={fromIndex:th.fromIndex,runnerId:th.runnerId,base:th.base,time:f.elapsed,distance:dist(th.from,th.to),armRating:f.fielders[th.fromIndex]?.armRating||0};this.playEvents.push({type:'throw-arrival',base:th.base,time:f.elapsed,caught:!!receiver&&dist(receiver,th.to)<=BAG_REACH});
    if(!receiver||dist(receiver,th.to)>BAG_REACH){
     m.secured=false;m.holder=null;m.bag=null;f.groundRead=null;
     if(receiver)f.chaser=th.receiver;
     this.safeOnThrow(runner,th.base);
     b.vx=0;b.vy=0;b.vz=0;b.z=.04;b.bounces=Math.max(1,b.bounces);return;
    }
    this.fieldingAction(th.receiver,'catch');this.emit('sound','catch');m.holder=th.receiver;m.bag=th.base??null;m.recovery=th.base==null?.85:.22;m.outfield=false;
    if(runner&&!runner.out&&!runner.scored){
     const onBag=dist(receiver,BASES[th.base])<=BAG_REACH;
     if(this.reviewBaseArrival(runner,th,receiver,onBag)){if(this.phase!=='play-call')this.playCall(m.closeCall.called,th.base);this.notify();return;}
     if(onBag&&th.appeal&&runner.needsTag&&runner.progress>runner.start+.04)this.manualOut(runner,'appeal',th.base);
     else if(onBag&&this.manualForceBase(runner)===th.base&&runner.progress<th.base+.25)this.manualOut(runner,runner.batter?'batter':'force',th.base);
     else if(runner.progress<th.base-.03&&Math.abs(runner.progress-Math.round(runner.progress))>.001&&dist(receiver,runner)<1.35)this.manualOut(runner,'tag',th.base);
     // Clear safe arrivals cannot be turned into fictitious outs.
    }
    this.safeOnThrow(runner,th.base);
    this.notify();
   }
   return;
  }
  const holder=f.fielders[m.holder];b.x=holder.x;b.y=holder.y;b.z=2;m.recovery-=dt;
  for(const p of f.fielders)p.running=false;
  const cover=m.outfield?this.secondBaseCover(m.holder,holder):null;
  if(cover!==null){
   const receiver=f.fielders[cover];receiver.target=BASES[2];
   if(f.elapsed>Math.max(receiver.reaction,receiver.recoverAt??0))move(receiver,receiver.target,receiver.speed);
  }
  const settled=f.runners.every(r=>r.out||r.scored||
   !r.needsTag&&!r.running&&Math.abs(r.progress-r.base)<.015&&(r.command??r.base)===r.base);
  const tagDrill=this.challenge==='tag'&&m.fly&&f.elapsed-m.pickupAt<1.8;
  const waitingInOutfield=m.outfield&&(!m.fly||f.runners.some(r=>!r.out&&!r.scored));
  if(settled&&!waitingInOutfield&&!tagDrill){this.finishManualPlay();return;}
  if(m.bag===2&&dist(holder,BASES[2])<=BAG_REACH){
   const approaching=f.runners.find(r=>!r.out&&!r.scored&&r.running&&r.command===2&&!this.manualForceBase(r));
   if(approaching){
    holder.running=false;
    if(dist(holder,approaching)<1.35)this.manualOut(approaching,'tag',2);
    return;
   }
  }
  const stranded=f.runners.filter(r=>!r.out&&!r.scored&&Math.abs(r.progress-Math.round(r.progress))>.04).sort((a,c)=>dist(holder,a)-dist(holder,c))[0];
  if(m.recovery<=0){
   const forceRunner=f.runners.find(r=>{
    if(r.out||r.scored)return false;
    const base=this.manualForceBase(r);
    return base&&r.progress<base&&dist(holder,BASES[base])<Math.min(4.6,runTime(r,base)*holder.speed*.9);
   });
   if(forceRunner){
    const base=this.manualForceBase(forceRunner);
    move(holder,BASES[base],holder.speed);b.x=holder.x;b.y=holder.y;
    if(dist(holder,BASES[base])<=BAG_REACH){m.bag=base;this.manualOut(forceRunner,forceRunner.batter?'batter':'force',base);}
    return;
   }
   const plan=this.manualThrowPlan();
   if(plan){f.throw=this.prepareFieldThrow(plan);m.bag=null;this.emit('sound','throw');this.notify();return;}
   if(waitingInOutfield){
    const relay={x:holder.x*.39,y:clamp(holder.y*.60,36,47)};
    const cutoff=this.coverThrow(m.holder,relay,[3,4,0].filter(i=>i!==cover),.38,holder);
    f.throw=this.prepareFieldThrow({...cutoff,from:{x:b.x,y:b.y},t:0,manual:true});
    m.bag=null;this.emit('sound','throw');this.notify();return;
   }
   if(stranded){
    // A runner who stops between bases can be chased and tagged.
    m.bag=null;move(holder,stranded,holder.speed);b.x=holder.x;b.y=holder.y;
    if(dist(holder,stranded)<1.35&&Math.abs(stranded.progress-Math.round(stranded.progress))>.001)this.manualOut(stranded,'tag');
   }
  }
 }
 finishManualPlay(){
  const f=this.field,m=f.manual;if(f.resolved)return;
  if(m?.closeCall&&!m.closeCall.done&&!this.baseCall&&this.beginPlayCall())return;
  const batter=f.runners.find(r=>r.batter),distance=Math.round(f.maxTravel),outs=m.outs.length;
  const eligible=this.manualRuns(),needed=this.runsToEndGame;
  const walkoff=(this.isFixture||this.career?.continuous)&&this.half==='bottom'&&this.inning>=this.totalInnings&&needed>0&&eligible.length>=needed;
  const scorers=walkoff?eligible.slice(0,needed):eligible;
  const sacFly=m.fly&&scorers.length>0&&this.outs<this.outsNeeded;
  let kind=m.fly?(sacFly?'sacrificefly':'flyout'):m.outs.some(o=>o.type==='force')?(outs>=2?'doubleplay':'forceout'):batter.furthest<1?(outs>=2?'doubleplay':'groundout'):['','single','double','triple'][Math.min(3,batter.furthest)];
  const reachedOnError=kind==='single'&&f.misplay&&f.errorWouldOut&&batter.furthest>=1&&!batter.out;
  if(reachedOnError)kind='error';
  const hit=['single','double','triple'].includes(kind);
  this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];
  for(const r of f.runners){
   if(!r.out&&!r.scored&&r.base>0&&r.base<4){this.bases[r.base-1]=true;this.baseIds[r.base-1]=r.id;this.basePitcherIds[r.base-1]=r.chargedPitcherId;}
   r.target=walkoff||this.outs>=this.outsNeeded?r.progress:r.scored?4:r.base;r.running=false;
  }
  for(const r of scorers)this.run(r.id,r.chargedPitcherId);
  if(hit&&!this.runningDemo){this[this.side+'Hits']++;this.pitcherRecord().h=(this.pitcherRecord().h||0)+1;if(!this.defending){this.session.hits++;this.session.maxDistance=Math.max(this.session.maxDistance,distance);}}
  this.completePitch(kind);if(this.inMatch){this.endAtBat(kind,scorers.length);this.resetCount();this.checkEnd();}
  f.resolved=true;f.outcome=kind;this.hit.kind=kind;this.hit.contactType=this.contactType(kind);
  const label=reachedOnError?['ERROR','失策で出塁']:outs>=2?['DOUBLE PLAY','ダブルプレー']:m.fly?[sacFly?'SACRIFICE FLY':'FLY OUT',scorers.length?'タッチアップで生還':'フライアウト']:hit?[kind.toUpperCase(),{single:'ヒット',double:'ツーベース',triple:'スリーベース'}[kind]]:['OUT',m.lastOut?.type==='tag'?'タッチアウト':m.lastOut?.type==='force'?'フォースアウト':'アウト'];
  this.message(label[0],label[1],`${f.fieldingNote?f.fieldingNote+' · ':''}${this.contactType(kind)} · ${distance} m · ${this.outs}アウト${scorers.length?' · '+scorers.length+'点':''}`,reachedOnError?'neutral':hit?'hit':'out');
  this.emit('cue',hit||reachedOnError?'hit':'out');this.emit('sound',hit||reachedOnError?'safe':'out');this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 completePitch(kind){
  if(this.pitch)this.lastPitch={name:this.pitch.name,speed:this.pitch.speed,id:this.pitch.id,breakCm:Math.round(Math.hypot(this.pitch.bx||0,this.pitch.by||0)*20.4),spinRpm:this.pitch.spinRpm??null};
  if(this.inMatch&&this.pitch){const book=this.pitchMemory||(this.pitchMemory={});const mem=book[this.batter.id]||(book[this.batter.id]={recent:[]});mem.recent.push(this.pitch.id);if(mem.recent.length>6)mem.recent.shift();}
  if(this.pitch&&!this.pitch.logged){
   this.pitch.logged=true;
   const goal=this.career?.trainingGoal;
   if(goal){
    const batting=!this.defending&&this.batter.id===this.career.playerId;
    const pitching=this.defending&&this.pitcher.id===this.career.playerId;
    const fair=['single','double','triple','hr','groundout','flyout','forceout','doubleplay'].includes(kind);
    const attempt=goal==='discipline'?batting&&this.pitch.id!=='fast'&&!this.pitch.isStrike:
     goal==='gap'?batting&&fair:pitching&&(goal==='command'||this.pitch.id!=='fast');
    if(attempt){
     const metrics=this.career.metrics||={},count=metrics.training||={attempts:0,success:0};
     count.attempts++;
     count.success+=Number(goal==='discipline'?kind==='ball':goal==='gap'?['single','double','triple','hr'].includes(kind):this.pitch.isStrike);
    }
   }
   if(this.career&&this.defending){
    const m=this.career.metrics||={},counts=m.pitches||={};
    counts[this.pitch.id]=(counts[this.pitch.id]||0)+1;
   }
   this.pitchTrace.push({id:this.pitch.id,name:this.pitch.name,x:this.pitch.targetX,y:this.pitch.targetY,result:kind,pitcherId:this.pitcher.id,half:this.half,inning:this.inning});if(this.pitchTrace.length>20)this.pitchTrace.shift();const pu=this.pitchUsage[this.pitcher.id]??={};pu[this.pitch.id]=(pu[this.pitch.id]||0)+1;
   this.atBatPitches.push({id:this.pitch.id,name:this.pitch.name,x:this.pitch.targetX,y:this.pitch.targetY,result:kind});if(this.atBatPitches.length>24)this.atBatPitches.shift();}
  if(!this.defending&&!this.runningDemo){this.session.pitches++;this.session.history.push(kind);}
  if(this.derby?.enhanced&&['take','miss','strike'].includes(kind)){const result=this.derby.record({hr:false,kind,distance:0});this.emit('derby-ball',result);}
 }
 static derbyResultDuration(field,hit,walkoff=false){
  if(walkoff)return 3600;
  if(hit?.kind==='hr')return 1500;
  return field?550:180;
 }
 updateDerbyRoll(dt){
  const f=this.field;if(!f?.resolved||!f.ball||f.outcome==='hr')return;
  let left=Math.min(dt,.24);
  while(left>1e-6){const step=Math.min(left,1/120);moveBattedBall(f.ball,step,this.windVector(),this.park);left-=step;}
  f.trail.push({x:f.ball.x,y:f.ball.y,z:f.ball.z});if(f.trail.length>14)f.trail.shift();
 }
 finishDerbyBall(homeRun){
  const f=this.field;if(f.resolved)return;f.resolved=true;f.outcome=homeRun?'hr':f.foul?'foul':'in-play';
  this.hit.kind=f.outcome;this.completePitch(f.outcome);
  if(this.derby.enhanced){const pos=f.derbyLanding||f.ball;if(homeRun||f.foul)this.hit.distance=Math.round(Math.hypot(pos.x,pos.y));
   this.hit.derbyResult=this.derby.record({hr:!!homeRun,kind:f.outcome,distance:this.hit.distance,exitKmh:this.hit.exitKmh,launchAngle:this.hit.launchAngle,sprayAngle:this.hit.sprayAngle,x:pos.x,y:pos.y});
  }
  if(homeRun){
   this.derby.turnHR++;this.session.hr++;this.session.hits++;
   this.session.maxDistance=Math.max(this.session.maxDistance,this.hit.distance);
   if(this.derby.enhanced){
     const walkoff=this.derby.clinched,streak=this.derby.streak,deep=this.hit.distance>=140;
     f.homerCelebration={level:walkoff||deep||streak>=5?3:streak>=3?2:1,walkoff,streak,distance:this.hit.distance,tag:walkoff?'WALK-OFF HOME RUN':deep?'MONSTER SHOT':streak>=3?streak+' IN A ROW':'HOME RUN'};
    }
    this.message('HOME RUN','ホームラン！',this.hit.distance+' m','homer');this.emit('sound','homer');
  }else if(f.foul)this.emit('sound','foul');
  this.setPhase('result');this.emit('hit',this.hit);
  if(homeRun&&this.derby.clinched){
    if(this.derby.matchup)this.derby.matchup.walkOff=true;
    if(this.derby.enhanced){this.derby.pendingFinish=true;this.emit('derby-walkoff',this);this.notify();return;}
    if(!this.onlineDerby){this.finishDerbyTurn();return;}
   }
  this.notify();
 }
 finishDerbyTurn(){
  const d=this.derby;
   if(d.mode==='online'){this.setPhase('derby-break');this.notify();this.emit('derby-online-turn',this);return;}
   this.derbyTransition=d.finishTurn();this.pitch=null;this.field=null;this.hit=null;
  this.setPhase('derby-break');this.emit('clear');this.notify();this.emit('derby-turn',this);
 }
 continueDerby(){
  if(this.phase!=='derby-break'||this.derbyTransition==='finish')return false;
  this.derby.continue(this.derbyTransition);
  this.derbyTransition=null;this.setPhase('intro');this.notify();return true;
 }
 finishBall(kind){
  const f=this.field;if(f.resolved)return;if(f.manual&&(kind==='hr'||kind==='foul'||f.groundRule)){f.manual=null;for(const r of f.runners){r.target=undefined;r.out=false;}}if(['sacrifice','buntout','buntsingle','doubleplay','forceout'].includes(kind)){this.finishSmallBall(kind);return;}const originalAdvance={single:1,double:2,triple:3,hr:4}[kind];if(originalAdvance&&originalAdvance<4)kind=['','single','double','triple'][this.hitAdvance(originalAdvance)];if(kind==='flyout')this.emit('sound','catch');f.resolved=true;f.outcome=kind;const advance={single:1,double:2,triple:3,hr:4}[kind]||0;
  const thirdOut=['flyout','groundout'].includes(kind)&&(f.outsAtContact??this.outs)===this.outsNeeded-1;
  f.runners.forEach(r=>{r.target=advance?Math.min(4,r.start+advance):thirdOut?r.progress:r.start;if(!advance&&r.batter)r.out=true;r.running=false;});this.hit.kind=kind;
  const distance=Math.round(f.maxTravel),out=kind==='flyout'||kind==='groundout';let runs=0;const leadBefore=this.battingScore-(this.side==='home'?this.awayScore:this.homeScore);
  if(kind==='foul'){
   f.foulMotionRemaining=.85;for(const p of f.fielders){p.running=false;p.moveSpeed=0;}
   this.emit('cue','foul');this.emit('sound','foul');this.steal=false;if(this.inMatch)this.strikes=Math.min(2,this.strikes+1);this.completePitch('foul');this.message('FOUL','ファウル',this.strikes===2?'2ストライク。もう一度。':'次の1球へ。');
  }else{
   if(!this.defending){if(!out){this.session.hits++;this.session.maxDistance=Math.max(this.session.maxDistance,distance);}if(kind==='hr')this.session.hr++;}
   if(!out){this[this.side+'Hits']++;this.pitcherRecord().h=(this.pitcherRecord().h||0)+1;}
   this.completePitch(kind);
   if(this.inMatch){if(out)this.addOut();else{const before=this.battingScore;this.advance({single:1,double:2,triple:3,hr:4}[kind]);runs=(this.battingScore)-before;if(!this.defending&&runs===4&&kind==='hr')this.session.grandSlam=true;}this.endAtBat(kind,runs);this.resetCount();this.checkEnd();}
   if(kind==='hr'){const leadAfter=leadBefore+runs,walkoff=!!this.walkoffWin,tag=walkoff?'WALK-OFF HOME RUN':runs===4?'GRAND SLAM':leadBefore<0&&leadAfter>0?'GO-AHEAD HOME RUN':leadBefore<0&&leadAfter===0?'GAME-TYING HOME RUN':null;const level=walkoff||runs===4||leadBefore<0&&leadAfter>0?3:tag||leadBefore===0||distance>=135?2:1;f.homerCelebration={runs,level,tag,distance,variant:distance>=135?'deep':(this.hit?.launchAngle??this.hit?.launch??0)>=32?'tower':(this.hit?.exitKmh??0)>=155?'liner':'standard',walkoff};}
    const label={single:['SINGLE','ヒット'],double:f.groundRule?['GROUND-RULE DOUBLE','エンタイトルツーベース']:['DOUBLE','ツーベース'],triple:['TRIPLE','スリーベース'],hr:['HOME RUN','ホームラン！'],flyout:['FLY OUT','フライをキャッチ！'],groundout:['OUT AT FIRST','一塁へ送球、アウト！']}[kind];
   this.message(label[0],label[1],`${f.fieldingNote?f.fieldingNote+' · ':''}${distance} m${runs?' · '+runs+'点':''}${out?' · '+this.outs+'アウト':''}`,kind==='hr'?'homer':out?'out':'hit','',kind==='hr'?runs:0,kind==='hr'?f.homerCelebration:null);
   this.emit('cue',kind==='hr'?'homer':out?'out':'hit');this.emit('sound',kind==='hr'?'homer':out?'out':'safe');
  }
  this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 static ABS_TIMING=Object.freeze({call:1700,calledK:3000,cpuCall:650,pitchResult:980,reviewReveal:4200,reviewEnd:5450});

 // Retain the game's strike zone. Convert its axes to a 43.2 cm plate and
 // a 60 cm high zone for the review graphic and for the Statcast distance bins.
 static absLocation(x,y){
  const edge=1.06,halfWidth=.216,halfHeight=.30;
  const dx=(Math.abs(x)/edge-1)*halfWidth,dy=(Math.abs(y)/edge-1)*halfHeight;
  const gap=dx>0||dy>0?Math.hypot(Math.max(0,dx),Math.max(0,dy)):Math.max(dx,dy);
  return {x:x/edge*halfWidth,y:halfHeight-y/edge*halfHeight,gap};
 }
 // Umpire mode scoring: a correct ball/strike call earns more the closer
 // the pitch finished to the zone edge (gap from absLocation, in metres).
 static umpirePoints(gap){
  const inches=Math.abs(gap)/.0254;
  return inches<=1?50:inches<=2?35:inches<=3?25:inches<=5?15:10;
 }
 static UMPIRE_PLAY_POINTS=30;
 // Sabermetrics for a set of accumulated player rows (pennant playerStats
 // or the all-mode career totals). League context (average wOBA / ERA) is
 // derived from the same rows, so the indices stay self-consistent.
 // WAR here is a game-specific conversion, documented in the UI:
 //  batting  wRAA = (wOBA - league wOBA) / 1.15 * PA, plus a replacement
 //           credit of 20 runs per 600 PA, at 10 runs per win;
 //  pitching runs saved vs league ERA over the pitcher's innings, plus a
 //           replacement credit of 1.2 runs per 9 innings, at 10 per win.
 // OBP uses (H+BB)/(AB+BB): HBP and sacrifice flies are not separated in
 // the accumulated rows. Pitching rows may carry earned or plain runs.
 static saberMetrics(rows){
  let ab=0,bb=0,single=0,dbl=0,tpl=0,hr=0,outs=0,earned=0;
  for(const r of rows||[]){
   ab+=r.ab||0;bb+=r.bb||0;dbl+=r.doubles||0;tpl+=r.triples||0;hr+=r.hr||0;
   single+=Math.max(0,(r.h||0)-(r.doubles||0)-(r.triples||0)-(r.hr||0));
   outs+=r.outs||0;earned+=(r.earned??r.runs??0);
  }
  const denom=ab+bb;
  const lgWoba=denom?(0.69*bb+0.89*single+1.27*dbl+1.62*tpl+2.10*hr)/denom:0;
  const lgEra=outs?earned*27/outs:0;
  const calc=r=>{
   const s=Math.max(0,(r.h||0)-(r.doubles||0)-(r.triples||0)-(r.hr||0));
   const d=(r.ab||0)+(r.bb||0);
   const obpRate=d?((r.h||0)+(r.bb||0))/d:0;
   const tb=s+2*(r.doubles||0)+3*(r.triples||0)+4*(r.hr||0);
   const slg=(r.ab||0)?tb/(r.ab||0):0;
   const woba=d?(0.69*(r.bb||0)+0.89*s+1.27*(r.doubles||0)+1.62*(r.triples||0)+2.10*(r.hr||0))/d:0;
   const wraa=(woba-lgWoba)/1.15*(r.pa||0);
   const batWar=(wraa+(r.pa||0)*(20/600))/10;
   const era=(r.outs||0)?(r.earned??r.runs??0)*27/(r.outs||0):0;
   const pitWar=(r.outs||0)?(((lgEra-era)*(r.outs||0)/27)+((r.outs||0)/3)*(1.2/9))/10:0;
   return {obp:obpRate,slg,ops:obpRate+slg,woba,batWar,pitWar,era,
    rispAb:r.rispAb||0,risp:(r.rispAb||0)?(r.rispH||0)/(r.rispAb||0):null,
    gs:r.gs||0,qs:r.qs||0,qsRate:(r.gs||0)?(r.qs||0)/(r.gs||0):null};
  };
  return {lgWoba,lgEra,calc};
 }
 static absUmpireStrike(gap,roll){
  // Baseball Savant league called-strike rates for takes 0–1, 1–2, and 2–3
  // inches from the edge. Outside the near-edge band, use the official zone.
  // https://baseballsavant.mlb.com/leaderboard/catcher-framing
  const inside=gap<=0,band=Math.floor(Math.abs(gap)/.0254);
  const rate=(inside?[.63,.84,.94]:[.38,.17,.06])[band]??Number(inside);
  return roll<rate;
 }
 shouldCpuChallenge(gap){
  if(!(this.absCpuRemaining>0)||Math.abs(gap)>.0762)return false;
  // A batter reads the outside of the zone; the catcher's view is more precise.
  // Tune their estimates against the 2026 MLB Statcast 49%/58% overturn rates.
  // https://baseballsavant.mlb.com/abs?gameType=regular&level=mlb&year=2026
  const batter=this.defending;
  const terminal=batter?this.strikes===2:this.balls===3;
  const late=this.inning>=Math.max(3,this.totalInnings-2)&&Math.abs(this.homeScore-this.awayScore)<=2;
  const saving=this.absCpuRemaining===1&&!late;
  const perceived=(batter?gap:-gap)+rnd(batter?-.09:-.068,batter?.09:.068);
  const threshold=.015-(terminal?.006:0)-(late?.005:0)+(saving?.006:0);
  if(perceived<threshold)return false;
  const attempt=(batter?.14:.20)*(terminal?(batter?2.6:1.8):1)*(late?1.45:1)*
   (this.bases[1]||this.bases[2]?1.15:1)*(saving?.67:1);
  return Math.random()<attempt;
 }
 beginPlayCall(){
  const m=this.field?.manual,call=m?.closeCall;
  if(!call||this.baseCall)return false;
  if(!call.pending){
   const snap=call.snapshot;
   if(!snap||m.outs.length!==snap.mOutsLen+1||this.homeScore+this.awayScore!==snap.score){call.done=true;return false;}
  }
  const batSide=this.side,challenger=call.challenger||batSide,userSideCall=challenger===this.userSide;
  const remaining=userSideCall?this.playChallenges:this.playCpuChallenges;
  if(!this.umpireMode&&!(remaining>0)){call.done=true;return false;}
  this.baseCall={...call,batSide,challenger,cpu:!userSideCall,auto:!this.onlineGame&&!userSideCall&&!this.umpireMode,willChallenge:false};
  // CPU has an imperfect estimate, not direct access to the correct verdict.
  if(this.baseCall.auto)this.baseCall.willChallenge=Math.random()<.42*Math.max(.2,1-Math.abs(call.gap||0)/.20);
  this.setPhase('play-call');
  if(!this.umpireMode)this.playCall(call.called,call.base);
  this.notify();return true;
 }
 get playCanChallenge(){return this.phase==='play-call'&&!!this.baseCall&&!this.baseCall.cpu&&this.playChallenges>0&&!this.paused;}
 requestPlayChallenge(remote=false){
  if(this.umpireMode)return false;
  if(this.mirror){if(this.phase!=='play-call'||!this.baseCall||this.baseCall.cpu||this.paused)return false;this.mirrorSend?.({t:'play-challenge'});return true;}
  if(this.paused||this.phase!=='play-call'||!this.baseCall)return false;
  if(remote?!this.baseCall.cpu:this.baseCall.cpu)return false;
  this.setPhase('play-review');this.notify();return true;
 }
 resolvePlayCall(reviewed){
  const call=this.baseCall;if(!call)return;this.baseCall=null;
  const m=this.field?.manual;if(m?.closeCall)m.closeCall.done=true;
  if(call.pending){
   const verdict=reviewed?call.truth:call.called,overturn=verdict!==call.called;
   if(reviewed&&!overturn&&!this.umpireMode){
    if(call.challenger===this.userSide)this.playChallenges=Math.max(0,(this.playChallenges||0)-1);
    else this.playCpuChallenges=Math.max(0,(this.playCpuChallenges||0)-1);
   }
   this.setPhase('field');
   this.commitBaseArrival(call,verdict);
   if(reviewed&&!this.umpireMode)this.emit('challenge-result',{verdict,base:call.base,overturn});
   this.notify();return;
  }
  if(reviewed){
   const overturn=call.truth!==call.called;
   if(overturn)this.applyPlayOverturn(call);
   else if(call.batSide===this.userSide)this.playChallenges=Math.max(0,(this.playChallenges||0)-1);
   else this.playCpuChallenges=Math.max(0,(this.playCpuChallenges||0)-1);
   this.message(overturn?'CHALLENGE SUCCESS':'CHALLENGE',overturn?'判定変更！':'判定維持',overturn?call.base+'塁はセーフに変更':call.base+'塁のアウトは維持 · チャレンジ1回消費');
  }
  if(this.field&&!this.field.resolved)this.finishManualPlay();
 }
 applyPlayOverturn(call){
  const f=this.field,m=f?.manual,s=call.snapshot;if(!f||!m||!s)return;
  const r=f.runners.find(x=>x.id===call.runnerId);if(!r)return;
  this.outs=s.outs;const pr=this.pitchingStats[s.pitcherId];if(pr)pr.outs=s.pitcherOuts;
  this.next=s.next;m.outs.length=s.mOutsLen;m.lastOut=m.outs.at(-1)||null;this.playEvents.length=s.playEventsLen;
  r.out=false;r.base=call.base;r.command=call.base;r.progress=call.base;r.target=call.base;r.waiting=true;r.running=false;r.furthest=Math.max(r.furthest||0,call.base);this.projectRunner(r);
  this.playCall('safe',call.base);
 }
 get absCalledStrikeout(){return this.phase==='abs-call'&&!!this.absCall?.umpireStrike&&this.inMatch&&this.strikes>=2;}
 get absCallDuration(){return this.absCalledStrikeout?NightGame.ABS_TIMING.calledK:NightGame.ABS_TIMING.call;}
 get absCanChallenge(){
  return this.phase==='abs-call'&&!!this.absCall&&!this.absCall.cpu&&this.absRemaining>0&&!(this.autoDefense&&this.defending);
 }

 requestAbsChallenge(remote=false){
  if(this.umpireMode)return false;
  if(this.mirror){if(!this.absCanChallenge||this.paused)return false;this.mirrorSend?.({t:'abs-challenge'});return true;}
  if(remote){
   // Host accepting the online guest's challenge: valid only while the
   // open call is flagged as the guest's to challenge (see take()).
   if(this.paused||this.phase!=='abs-call'||!this.absCall?.remote||!(this.absCpuRemaining>0))return false;
   this.setPhase('abs-review');this.notify();return true;
  }
  if(!this.absCanChallenge||this.paused)return false;
  this.setPhase('abs-review');this.notify();
  return true;
 }
 resolveAbsCall(reviewed){
  const call=this.absCall;
  if(!call)return;
  delete this.absCall;
  if(reviewed&&call.strike===call.umpireStrike){
   if(call.cpu)this.absCpuRemaining--;
   else this.absRemaining--;
  }
  if(!reviewed&&call.umpireStrike&&this.strikes>=2&&this.pitch)this.pitch.calledKPreview=true;
  this.commitCalledPitch(reviewed?call.strike:call.umpireStrike);
  if(!reviewed&&!this.batFinished)this.phaseTime=NightGame.ABS_TIMING.pitchResult;
 }
 // v160: mitt sound for a pitch that reaches the catcher, exactly once
 // per pitch. update() fires it at the arrival frame (progress 1.0, or
 // the extended travel in the miss phase); the call-resolution paths
 // below call it as a fallback so direct take()/strike()/
 // commitCalledPitch() calls (tests, restores) still sound exactly once.
 catchPitchSound(){
  const p=this.pitch;if(!p||p.catchSound)return false;
  p.catchSound=true;this.emit('sound','catch');return true;
 }
 take(){
  if(!this.inMatch)this.catchPitchSound();
  if(this.derby){this.completePitch('take');this.setPhase('result');this.notify();return;}
  if(!this.inMatch){this.completePitch('take');this.message('TAKE','見送り','カーソルをコースへ動かそう');this.setPhase('result');this.notify();return;}
  if(this.umpireMode){
   // Umpire mode: hold the game on this taken pitch until the player umpire
   // makes the call. Truth is the engine's own isStrike; closeness to the
   // zone edge is the same gap the ABS review uses.
   const location=NightGame.absLocation(this.pitch.targetX,this.pitch.targetY);
   this.umpirePending={strike:this.pitch.isStrike,gap:location.gap,x:this.pitch.targetX,y:this.pitch.targetY};
   this.setPhase('umpire-call');this.notify();return;
  }
  const location=NightGame.absLocation(this.pitch.targetX,this.pitch.targetY);
  if(this.absRemaining===undefined){let call=this.pitch.isStrike;if(this.umpireBias&&Math.abs(location.gap)<=.0254&&(this.umpireBias>0)!==call&&Math.random()<.5)call=!call;this.commitCalledPitch(call);return;}
  const umpireStrike=NightGame.absUmpireStrike(location.gap-(this.umpireBias||0),Math.random());
  const cpu=umpireStrike===this.defending;
  // Online: the "other side" is the human guest, not the CPU. Their
  // challenge must not be decided by the CPU's random challenge model:
  // the window opens whenever they have challenges left, and the call is
  // flagged remote so update() waits for their input (with round-trip
  // grace) instead of auto-reviewing it as a CPU challenge.
  const remote=cpu&&!!this.remoteSide;
  const challenge=remote?this.absCpuRemaining>0:cpu?this.shouldCpuChallenge(location.gap):this.absRemaining>0&&!(this.autoDefense&&this.defending)&&!this.autoBatting;
  if(!challenge){
   this.commitCalledPitch(umpireStrike);
   return;
  }
  this.absCall={...location,strike:this.pitch.isStrike,umpireStrike,cpu,remote};
  this.setPhase('abs-call');this.notify();
 }
 // Strike-zone reveal for umpire mode: the zone frame and the pitch's true
 // crossing point stay hidden from the moment a pitch starts until the
 // player umpire has made the call. Only then is the reveal recorded (in
 // umpireCall, from the pending pitch's true target — the same data
 // isStrike / absLocation use), and it is visible solely while the game
 // sits in the post-call 'result' phase. setPhase clears it on entering
 // any other phase, so it can never leak into the next pitch.
 umpireCallReveal(){
  return this.umpireMode&&this.phase==='result'&&this.umpireReveal?this.umpireReveal:null;
 }
 // The player umpire's call is the call of record: it is committed to the
 // count exactly as made, and scored against the engine truth afterwards.
 umpireCall(strike){
  if(!this.umpireMode||this.paused||this.phase!=='umpire-call'||!this.umpirePending)return false;
  const pending=this.umpirePending;this.umpirePending=null;
  const called=!!strike,correct=called===pending.strike;
  const points=correct?NightGame.umpirePoints(pending.gap):0;
  const stats=this.umpireStats;stats.calls++;if(correct)stats.correct++;stats.score+=points;
  stats.lastCall={called,truth:pending.strike,correct,points,gap:pending.gap};
  stats.last={kind:'pitch',...stats.lastCall};
  this.umpireReveal={x:pending.x,y:pending.y,strike:pending.strike,called,correct,gap:pending.gap};
  this.commitCalledPitch(called);
  return true;
 }
 // Close play on the bases: the player umpire's verdict replaces the call on
 // the field (an overturn reuses the challenge snapshot machinery), and is
 // scored against the play's recorded truth.
 umpirePlayCall(safe){
  if(!this.umpireMode||this.paused||this.phase!=='play-call'||!this.baseCall)return false;
  const call=this.baseCall,verdict=safe?'safe':'out',truth=call.truth;
  const correct=verdict===truth,points=correct?NightGame.UMPIRE_PLAY_POINTS:0;
  const stats=this.umpireStats;stats.playCalls++;if(correct)stats.playCorrect++;stats.score+=points;
  stats.lastPlay={verdict,truth,correct,points,base:call.base};
  stats.last={kind:'play',...stats.lastPlay};
  if(call.pending){call.called=verdict;this.resolvePlayCall(false);}
  else if(verdict!==call.called){call.truth=verdict;this.resolvePlayCall(true);}
  else this.resolvePlayCall(false);
  return true;
 }
 commitCalledPitch(strike){
  if(this.rollHbp())return;
  if(strike){this.strike(false);return;}
  this.pitch.callResult=true;
  this.emit('cue','ball');
  this.catchPitchSound();this.balls++;this.completePitch('ball');
  const before=this.battingScore;
  if(this.balls>=4){const loaded=this.bases.every(Boolean);this.walk();this.endAtBat('walk',this.battingScore-before);this.resetCount();this.message('WALK','',loaded?'押し出しで1点':'走者が進塁','','フォアボール。'+(loaded?'押し出しで1点':'走者が進塁'));this.checkEnd();}else{this.message('BALL','','','','ボール。');this.resolveSteal();this.rollWildPitch();}
  this.emit('sound','ball');this.setPhase('result');
  if(this.battingScore>before)this.emit('scoring-walk');
  this.notify();
 }
 strike(swung){
  this.emit('cue','strike');
  if(this.pitch)this.pitch.callResult=true;
  this.completePitch('miss');this.catchPitchSound();this.emit('sound','strike');
  if(this.inMatch){this.strikes++;if(this.strikes>=3){const risp=!!(this.bases[1]||this.bases[2]),loaded=this.bases.every(Boolean),third=this.outs+1===this.outsNeeded,side=this.side==='home'?'away':'home';this.addOut('strikeout',this.pitcher.id);if(this.defending)this.session.ks++;this.endAtBat('strikeout');this.resetCount();const ks=this.pitcherRecord().k||0,streak=this._strikeStreak?.n||1,level=third&&loaded||streak===3||ks===10||third&&risp&&this.inning>=this.totalInnings?3:third&&risp||risp&&Math.abs(this.homeScore-this.awayScore)<=2||streak===2?2:1;const k={side,playerId:this.pitcher.id,name:this.pitcher.name,swung:!!swung,ks,streak,level,third,speed:this.pitch?.speed||this.lastPitch?.speed||0};if(this.pitch){if(this.pitch.calledKPreview)k.seen=true;this.pitch.strikeCelebration=k;}this.message('STRIKEOUT',swung?'空振り三振！':'見逃し三振！',`${this.outs}アウト`,'out','',0,k);this.emit('sound','strikeout');}else{this.message(swung?'SWING & MISS':'STRIKE',swung?'空振り':'','','',`${swung?'空振り':'ストライク'}。`);this.resolveSteal();this.rollWildPitch();}}
  else if(!this.derby)this.message('SWING & MISS','空振り','ボールの位置とカーソルを合わせよう');
  this.setPhase('result');this.notify();
 }
 addOut(kind='out',player){
  this.pitcherRecord().outs++;this.outs++;if(this.outs>=this.outsNeeded)this.next='half';
  const f=this.field,actor=f?.fielders?.[f?.manual?.holder??f?.throw?.receiver??f?.chaser];
  this.emit('music-result',{kind,player:player??(actor?this.fielder(actor.name).id:null),side:this.side==='home'?'away':'home',thirdOut:this.outs===this.outsNeeded});
 }
 resetCount(){if(this.variantRules?.fullCount){this.balls=2;this.strikes=2;}else{this.balls=0;this.strikes=0;}}
 pitcherForSide(side){return this.pitchingStaff[side][side===this.userSide?this.homePitcherIndex:this.awayPitcherIndex];}
 run(id=null,chargedPitcherId=null){
  const side=this.side,opponent=side==='home'?'away':'home',before=this[side+'Score']-this[opponent+'Score'];
  const charge=chargedPitcherId||this.pitcher.id,pr=this.pitchingStats[charge] ||= {pitches:0,batters:0,outs:0,runs:0,k:0,bb:0,h:0};pr.runs++;
  if(id){const st=this.box[id] ||= {pa:0,ab:0,h:0,hr:0,rbi:0,k:0,bb:0,r:0};st.r=(st.r||0)+1;}
  this[side+'Score']++;this[side][this.inning-1]=(this[side][this.inning-1]||0)+1;
  if(before===0&&(this.isFixture||this.career?.continuous)&&this.half==='bottom'&&this.inning>=this.totalInnings)this.walkoffWin=true;
  if(before===0)this.leadDecision={side,winner:this.pitcherForSide(side).id,loser:charge};
  else if(before===-1)this.leadDecision=null;
  if(this.defending)this.session.allowed++;else this.session.runs++;
 }
 contactType(kind){
  const f=this.field;if(kind==='hr')return '本塁打';if(!f)return '';
  return f.wallHit?'フェンス直撃':kind==='single'&&f.maxTravel<47?'内野安打':f.trajectory==='blooper'&&['single','double'].includes(kind)?'ポテンヒット':f.trajectory==='liner'?'ライナー':f.trajectory==='ground'?'ゴロ':'フライ';
 }
 matchSummary(){
  const sides=['away','home'],all=sides.flatMap(side=>[...this.teams[side].batters,...this.teams[side].pitchers].map(p=>({...p,side})));
  const decision=this.homeScore===this.awayScore?null:this.leadDecision;
  const heroes=all.map(p=>{const b=this.box[p.id],q=this.pitchingStats[p.id];return {player:p,bat:b,pitch:q,score:b?(b.rbi*2+b.h+(b.hr||0)*2+(b.r||0)*.5):q?(q.outs*.35+(q.k||0)*.8-q.runs*1.7):0};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  return {decision:decision?{winner:all.find(p=>p.id===decision.winner),loser:all.find(p=>p.id===decision.loser)}:null,heroes};
 }

 hitAdvance(n){
  if(n===4||!this.isFixture&&!this.career?.continuous||this.half!=='bottom'||this.inning<this.totalInnings)return n;
  const needed=this.runsToEndGame,scorers=[2,1,0].filter(i=>this.bases[i]&&i+n>=3);
  return needed>0&&scorers.length>=needed?Math.min(n,3-scorers[needed-1]):n;
 }
 advance(n){
  n=this.hitAdvance(n);for(let i=2;i>=0;i--)if(this.bases[i]){const id=this.baseIds[i],charge=this.basePitcherIds[i];this.bases[i]=false;this.baseIds[i]=null;this.basePitcherIds[i]=null;if(i+n>=3)this.run(id,charge);else{this.bases[i+n]=true;this.baseIds[i+n]=id;this.basePitcherIds[i+n]=charge;}}
  if(n===4)this.run(this.batter.id);else{this.bases[n-1]=true;this.baseIds[n-1]=this.batter.id;this.basePitcherIds[n-1]=this.pitcher.id;}
 }
 walk(){
  if(this.bases[0]){if(this.bases[1]){if(this.bases[2])this.run(this.baseIds[2],this.basePitcherIds[2]);this.bases[2]=true;this.baseIds[2]=this.baseIds[1];this.basePitcherIds[2]=this.basePitcherIds[1];}this.bases[1]=true;this.baseIds[1]=this.baseIds[0];this.basePitcherIds[1]=this.basePitcherIds[0];}
  this.bases[0]=true;this.baseIds[0]=this.batter.id;this.basePitcherIds[0]=this.pitcher.id;
 }

 get runsToEndGame(){return this.awayScore-this.homeScore+(this.drawDecidesSeries?0:1);}
 checkEnd(){if((this.isFixture||this.career?.continuous)&&this.half==='bottom'&&((this.inning>=this.totalInnings&&this.homeScore>this.awayScore)||(this.drawDecidesSeries&&this.homeScore===this.awayScore)||(this.mercyRule&&this.homeScore-this.awayScore>=10)))this.next='finish';}
 finishTimeAttack(){
  if(this.phase==='ended'||!this.timeAttack||this.timeAttack.result)return false;
  const ta=this.timeAttack,userRuns=this.userHome?this.homeScore:this.awayScore,oppRuns=this.userHome?this.awayScore:this.homeScore;
  ta.result=ta.kind==='pitch'
   ?{kind:'pitch',outs:ta.outs+(this.defending?this.outs:0),allowed:oppRuns,ks:this.session.ks,runs:userRuns,halves:ta.halves}
   :{kind:'bat',runs:userRuns,hits:this.session.hits,hr:this.session.hr,allowed:oppRuns,halves:ta.halves};
  this.finish();return true;
 }
 finish(){if(this.phase==='ended'||this.phase==='cinematic')return;if(this.liveCutsEnabled&&this.walkoffWin&&!this._walkoffCutDone&&this.startBroadcastCut('walkoff',{side:'home',playerId:this.batter.id,name:this.batter.name},2200))return;delete this.pendingWorldBatting;this.setPhase('ended');this.emit('end',this);}
};
})();
