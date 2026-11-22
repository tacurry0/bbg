/* NIGHTBALL 2: cursor batting, pitch movement, live ball and fielding simulation. */
(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TYPES=[
 {id:'fast',name:'ストレート',short:'直球',speed:148,bx:0,by:-.10,cost:1.2},
 {id:'slider',name:'スライダー',short:'スライダー',speed:129,gap:13,bx:.85,by:.13,cost:1.8},
 {id:'curve',name:'カーブ',short:'カーブ',speed:108,gap:26,bx:-.50,by:.95,cost:1.7},
 {id:'fork',name:'フォーク',short:'フォーク',speed:129,gap:14,bx:.04,by:1.15,cost:2.2},
 {id:'sinker',name:'シンカー',short:'シンカー',speed:126,gap:12,bx:-.72,by:.64,cost:1.8},
 {id:'change',name:'チェンジアップ',short:'チェンジ',speed:108,gap:24,bx:.20,by:.46,cost:1.4},
 {id:'cutter',name:'カットボール',short:'カット',speed:141,gap:7,bx:.42,by:.08,cost:1.6},
 {id:'shoot',name:'シュート',short:'シュート',speed:139,gap:8,bx:-.56,by:.16,cost:1.7},
 {id:'split',name:'スプリット',short:'スプリット',speed:135,gap:10,bx:.02,by:.85,cost:2},
 {id:'vslider',name:'縦スライダー',short:'縦スラ',speed:125,gap:15,bx:.22,by:1.08,cost:2},
 {id:'slowcurve',name:'スローカーブ',short:'スローカーブ',speed:93,gap:34,bx:-.72,by:1.32,cost:1.5},
 {id:'knuckle',name:'ナックル',short:'ナックル',speed:100,gap:30,bx:.32,by:.38,cost:1.6}
];
const POS=[['P',0,18.4],['C',0,-2],['1B',23,24],['2B',12,36],['SS',-13,36],['3B',-23,24],['LF',-45,74],['CF',0,88],['RF',45,74]];
const BASES=[{x:0,y:0},{x:19.4,y:19.4},{x:0,y:38.8},{x:-19.4,y:19.4},{x:0,y:0}];
const COVER=[[],[2,0,3],[3,4,0],[5,4,0],[1,0,2]];
const BAG_REACH=.48;
const BASE_PATH=27.44;
const FIELD_READ_DELAY=.20;
const legSpeed=(runner,target)=>runner.speed*(runner.batter&&target===2?1.075:1);
const runTime=(runner,base,progress=runner.progress)=>Math.abs(base-progress)*BASE_PATH/legSpeed(runner,base);
const catchReach=player=>player.catchReach??Math.min(1.15,player.reach);
const gloveHeight=player=>1.85+catchReach(player)*.22;
const athleticReach=player=>clamp(((player.fieldRating??0)-70)/30,0,1);
const RUNNER_SPEED=rating=>5.5+rating*.028;
function catchType(player,ball,distance,special=true){
 if(distance<=catchReach(player)&&ball.z<=gloveHeight(player))return 'catch';
 const skill=special?athleticReach(player):0;
 if(!skill)return null;
 if(ball.z>=1.55&&distance<=catchReach(player)+.25&&ball.z<=gloveHeight(player)+.95*skill)return 'jump';
 if(ball.z<=1.38&&distance<=catchReach(player)+.95*skill)return 'dive';
 return null;
}
function moveBattedBall(b,dt,wind){
 const airborne=!b.bounces&&(b.z>.1||b.vz>0);
 // Compress and lower the first flight, keeping its horizontal carry. Ground
 // rolls, bounces and throws still run at their normal speed.
 const step=airborne?dt*(b.flightRate??1):dt,drag=Math.max(0,1-(airborne?.15:.85)*step);
 b.vx*=drag;b.vy=(b.vy+wind*step)*drag;
 b.vz-=(airborne?11.25*(b.flightLift??1):9.81)*step;
 if(airborne&&b.vz>0)b.vz*=Math.max(0,1-.10*step);
 b.x+=b.vx*step;b.y+=b.vy*step;b.z+=b.vz*step;
 if(b.z>=0)return false;
 const impact=b.vz<-1.8;
 b.z=0;
 if(b.bounces===0||impact)b.bounces++;
 b.vz*= -.37;
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
 static TYPES=TYPES;
 static POS=POS;
 static BASES=BASES;
 static positions(park){
  if(!park?.school)return POS;
  return POS.map(([name,x,y],i)=>{
   if(i<6)return [name,x,y];
   const depth=Math.hypot(x,y),fence=NightPlayers.wallDistance(park,Math.atan2(x,y));
   const scale=(fence*.73)/depth;
   return [name,x*scale,y*scale];
  });
 }
 static pitchSpec(pitcher,id){
  const type=TYPES.find(t=>t.id===id)||TYPES[0],detail=pitcher.pitchDetails?.[id]||{},scale=(pitcher.movement/82)*(detail.breakScale||1);
  const rawSpeed=detail.speed||pitcher.velocity*type.speed/148;
  const fastSpeed=pitcher.pitchDetails?.fast?.speed||pitcher.velocity;
  const speed=type.gap?Math.min(rawSpeed,fastSpeed-type.gap):rawSpeed;
  return {...type,name:detail.label||type.name,short:detail.label||type.short,speed,bx:type.bx*scale,by:type.by*scale};
 }

 static arrangeLineup(club,ids=[],fielding={}){
  const fallback=club.startingOrder||club.batters.slice(0,9).map(p=>p.id);
  const valid=Array.isArray(ids)&&ids.length===9&&new Set(ids).size===9&&ids.every(id=>club.batters.some(p=>p.id===id));
  if(!valid&&!Object.keys(fielding||{}).length)fielding=club.startingFielding||{};
  const lineup=(valid?ids:fallback).map(id=>({...club.batters.find(p=>p.id===id)}));
  const free=new Set(['C','1B','2B','3B','SS','LF','CF','RF','DH']),assigned=new Set();
  for(const [pos,id]of Object.entries(fielding||{})){const player=lineup.find(p=>p.id===id);if(player&&free.has(pos)&&!assigned.has(id)){player.fieldPos=pos;free.delete(pos);assigned.add(id);}}
  for(const player of lineup)if(!assigned.has(player.id)&&free.has(player.pos)){player.fieldPos=player.pos;free.delete(player.pos);assigned.add(player.id);}
  for(const player of lineup)if(!assigned.has(player.id)){player.fieldPos=free.values().next().value;free.delete(player.fieldPos);}
  return lineup;
 }

 constructor(mode,difficulty,emit,options={}){
  this.conditionSeed=options.career?.fixtureId ? options.career.teamSeed+"/"+options.career.fixtureId : Date.now()+"/"+(++conditionGameSerial);
  this.runningRevision=41;this.competition=options.competition||null;this.apbcFixtureId=options.apbcFixtureId||null;this.apbcRoster=options.apbcRoster||null;this.apbcFinal=options.apbcFinal===true;this.mode=mode;this.career=options.career||null;this.arcadeRoster=options.arcadeRoster===true;this.difficulty=difficulty;this.emit=emit;this.phase='intro';this.phaseTime=0;this.time=0;this.paused=false;
  this.inning=1;this.half=this.career?.continuous||['match','pennant','pitching','career-pitch'].includes(mode)?'top':'bottom';this.outs=0;this.balls=0;this.strikes=0;this.bases=[false,false,false];
  this.npbPostseason=mode==='pennant'&&options.npbPostseason===true;
  this.worldFixture=options.worldFixture||null;
  if(options.worldMusic)this.worldMusic=options.worldMusic;
  this.maxInnings=this.npbPostseason?options.maxInnings??null:this.worldFixture?options.worldMaxInnings??null:null;
  this.drawClinches=this.npbPostseason&&options.drawClinches===true||!!this.worldFixture&&options.worldDrawClinches===true;
  this.totalInnings=(mode==='pennant'&&!this.npbPostseason)||(this.apbcFixtureId&&options.innings===1)?1:options.innings===9?9:options.innings===3?3:5;this.userHome=options.userHome!==false;this.teams=options.clubs||{home:this.fixtureClub(options.homeTeamId||'owls'),away:this.fixtureClub(options.awayTeamId||'foxes')};this.pitchingStaff={home:this.teams.home.pitchers,away:this.teams.away.pitchers};this.home=Array(this.totalInnings).fill(null);this.away=Array(this.totalInnings).fill(null);this.homeScore=0;this.awayScore=0;this.homeHits=0;this.awayHits=0;this.homeErrors=0;this.awayErrors=0;
  this.cursor={x:0,y:0};this.power=mode==='derby';this.bunt=false;this.steal=false;this.pitchType='fast';this.stamina=100;this.pitchHistory=[];this.pitch=null;this.lastPitch=null;this.hit=null;this.field=null;this.swingAge=9999;this.next='pitch';
  this.wind=Number.isFinite(options.wind)?options.wind:null;this.tiebreak=!!options.tiebreak;this.halfBreak=null;this.autoDefense=false;this.autoBatting=false;this.fastForward=false;this.spectate=false;this.defenseSpeed=options.defenseSpeed===2?2:1;this.manualRunning=options.manualRunning===true;this.fieldSpeed=options.fieldSpeed===2?2:1;this.battingAssist=options.battingAssist!==false;this.park=NightPlayers.parks.find(p=>p.id===options.park)||NightPlayers.parks[0];
  const order=(options.order||[]).map(id=>this.teams[this.userSide].batters.find(p=>p.id===id)).filter(Boolean);
  this.lineups={home:NightGame.arrangeLineup(this.teams.home),away:NightGame.arrangeLineup(this.teams.away)};this.lineups[this.userSide]=NightGame.arrangeLineup(this.teams[this.userSide],order.map(p=>p.id),options.fielding);this.battingIndex={home:0,away:0};this.practiceBatter=options.practiceBatter||'o1';this.homePitcherIndex=Number.isInteger(options.pitcher)&&this.pitchingStaff[this.userSide][options.pitcher]?options.pitcher:0;this.awayPitcherIndex=options.opponentPitcher??0;this.usedPitchers=[this.homePitcherIndex];this.usedCpuPitchers=[this.awayPitcherIndex];this.removedPlayers={home:[],away:[]};this.participants={home:this.lineups.home.map(p=>p.id),away:this.lineups.away.map(p=>p.id)};this.substitutions=[];this.pitchingStats={};this.baseIds=[null,null,null];this.box={};this.basePitcherIds=[null,null,null];this.leadDecision=null;this.playEvents=[];this.log=[];this.pitchTrace=[];this.defense='normal';this.batFinished=false;this.practicePitch=options.practicePitch||'random';this.touch=null;const umpRoll=Math.random();this.umpireBias=umpRoll<.25?-.0127:umpRoll<.75?0:.0127;this.umpireLabel=this.umpireBias<0?'ゾーン狭め':this.umpireBias>0?'ゾーン広め':'ゾーン標準';this.pitchMemory={};const dome=this.park?.theme==='dome';const wRoll=Math.random();this.weather=dome?'clear':wRoll<.55?'clear':wRoll<.85?'cloudy':'rain';this.weatherLabel=this.weather==='rain'?'雨':this.weather==='cloudy'?'曇り':'晴れ';this.shift='none';this.cpuShiftNow=false;
  this.session={hits:0,hr:0,maxDistance:0,perfect:0,swings:0,contacts:0,pitches:0,runs:0,history:[],thrown:0,ks:0,allowed:0,grandSlam:false};
  if(this.loadedStart)this.seedRunners(3,2);
  if(mode==='derby')this.derby=new NightDerby(this.teams.home,this.batter,this.park);
  if(!this.career&&mode!=='derby')this.message(mode==='pennant'?'PENNANT PLAY BALL':mode==='match'?'PLAY BALL':mode==='pitching'?'TAKE THE MOUND':'CURSOR BATTING',this.loadedStart&&mode==='pennant'?'2アウト満塁。一打で動くペナント。':mode==='match'||this.npbPostseason?`投打でつかむ、${this.totalInnings}イニング。`:mode==='pitching'?'配球で、打者を打ち取れ。':'コースを読んで、芯で捉えろ。',this.loadedStart&&mode==='pennant'?(this.userHome?'あなたは後攻 / 毎回2アウト満塁':'あなたは先攻 / 毎回2アウト満塁'):mode==='match'||this.npbPostseason?(this.userHome?'後攻 / 守備からスタート':'先攻 / 打撃からスタート'):mode==='pitching'?'指の左上に照準 / 離して投球':'指の左上に照準 / 離してスイング');
 }
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
   const club=options.clubs?.[side]||g.fixtureClub(g.teams[side].id),old=g.lineups[side]||[],fresh=old.map(p=>club.batters.find(b=>b.id===p.id)).filter(Boolean);
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
  if(g.phase==='change'&&!g.halfBreak)g.halfBreak={inning:g.half==='bottom'?g.inning:Math.max(1,g.inning-1),half:g.half==='bottom'?'top':'bottom',nextInning:g.inning,nextHalf:g.half};g.autoDefense ??= false;g.autoBatting??=false;g.fastForward??=false;g.spectate??=false;g.defenseSpeed=g.defenseSpeed===2?2:1;g.park=NightPlayers.parks.find(p=>p.id===g.park?.id)||NightPlayers.parks[0];
  g.basePitcherIds ||= [null,null,null];g.playEvents ||= [];g.leadDecision ??= null;g.manualRunning ??= false;if((g.runningRevision??0)<23&&g.field?.manual){g.field.manual.userControlled=g.manualRunning&&!g.defending;for(const r of g.field.runners){const at=Math.abs(r.progress-Math.round(r.progress))<.000001;r.command=at?Math.round(r.progress):(r.target??r.start)<r.progress?Math.floor(r.progress):Math.ceil(r.progress);r.target=r.command;r.waiting=at;r.touchedAt ||= {[r.base??r.start]:0};}}if((g.runningRevision??0)<41&&g.phase==='field'&&g.field?.manual)g.startForcedRunners();
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
  g.runningRevision=41;if(g.battingAssist===undefined)g.battingAssist=true;return g;
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
 get batter(){return (['practice','derby'].includes(this.mode)||this.mode==='career-bat'&&!this.career?.continuous)?this.teams.home.batters.find(p=>p.id===this.practiceBatter)||this.lineups.home[0]:this.lineups[this.side][this.battingIndex[this.side]%9];}
 get pitcher(){return this.pitchingStaff[this.side==='home'?'away':'home'][this.defending?this.homePitcherIndex:this.awayPitcherIndex];}
 get battingHand(){return this.batter.hand==='S'?(this.pitcher.hand==='L'?'R':'L'):this.batter.hand;}
 static clutchFor(p){
  const s=p?.stats;if(!s||!(s.pa>=150)||!Number.isFinite(s.rbi))return 0;
  const rate=s.rbi/s.pa;return rate>=.155?1:rate<=.085?-1:0;
 }
 conditionFor(player){
  if(Number.isFinite(player?.gameCondition))return player.gameCondition;
  if(!player?.id||!this.isFixture&&!this.career)return 0;
  const key=this.conditionSeed+'/'+player.id;
  let hash=2166136261;
  for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
  const roll=(hash>>>0)%100;
  return roll<7?-2:roll<25?-1:roll<75?0:roll<93?1:2;
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
 endAtBat(kind,runs=0,simulated=false){this.pitcherRecord().batters++;const b=this.batterStats();b.pa++;if(!['walk','hbp','sacrifice','sacrificefly'].includes(kind))b.ab++;if(kind==='sacrifice')b.sac=(b.sac||0)+1;if(kind==='sacrificefly')b.sf=(b.sf||0)+1;if(kind==='doubleplay')b.gidp=(b.gidp||0)+1;if(['single','double','triple','hr'].includes(kind))b.h++;if(kind==='hr')b.hr++;if(kind==='double')b.doubles=(b.doubles||0)+1;if(kind==='triple')b.triples=(b.triples||0)+1;if(kind==='strikeout'){b.k++;this.pitcherRecord().k=(this.pitcherRecord().k||0)+1;}if(kind==='walk'){b.bb++;this.pitcherRecord().bb=(this.pitcherRecord().bb||0)+1;}if(kind==='hbp'){b.hbp=(b.hbp||0)+1;this.pitcherRecord().hbp=(this.pitcherRecord().hbp||0)+1;}b.rbi+=runs;this.batFinished=true;
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
 get substitutionWindow(){return this.isFixture&&this.phase!=='ended'&&this.outs<3&&this.next!=='finish'&&(['intro','change','aim','windup'].includes(this.phase)||(this.phase==='result'&&(!this.field||this.field.runners.every(r=>r.out||Math.abs(r.progress-(r.target??r.start))<.01))));}
 bench(side=this.userSide){return this.teams[side].batters.filter(p=>!this.lineups[side].some(b=>b.id===p.id)&&!this.removedPlayers[side].includes(p.id));}
 canPinchHit(){return this.substitutionWindow&&!this.defending;}
 canPinchRun(base){return this.canPinchHit()&&Number.isInteger(base)&&base>=0&&base<3&&this.bases[base]&&this.lineups[this.userSide].some(p=>p.id===this.baseIds[base]);}
 substitute(id,{type='hit',base=null}={}){
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
  if(!this.canChangePitcher()||!Number.isInteger(index)||this.usedPitchers.includes(index)||!this.pitchingStaff[this.userSide][index])return false;
  const old=this.pitcher;this.homePitcherIndex=index;this.usedPitchers.push(index);this.stamina=100;this.pitchHistory=[];this.pitchType='fast';this.pitch=null;
  this.substitutions.push({type:'pitch',inning:this.inning,half:this.half,side:this.userSide,outId:old.id,inId:this.pitcher.id,outName:old.name,inName:this.pitcher.name});
  this.notify();return true;
 }
 cpuRelief(){
  if(!this.isFixture&&!this.career?.continuous)return;const current=this.pitchingStaff[this.opponentSide][this.awayPitcherIndex],record=this.pitcherRecord(current),late=this.inning>=this.totalInnings&&this.totalInnings>1;
  const shelled=record.runs>=4&&record.pitches>=25;
  const lateHook=this.isFixture&&this.awayPitcherIndex===0&&this.inning>=Math.max(3,Math.ceil(this.totalInnings*.6))&&record.pitches>=30;
  if(record.pitches<(current.role==='SP'?(this.career?.continuous?76:45):this.career?.continuous?25:18)&&
   !shelled&&!lateHook&&!(late&&current.role!=='CP'&&this.pitchingStaff[this.opponentSide].some((p,i)=>p.role==='CP'&&!this.usedCpuPitchers.includes(i))))return;
  const unused=this.pitchingStaff[this.opponentSide].map((p,i)=>({p,i})).filter(({i})=>!this.usedCpuPitchers.includes(i));
  const choice=unused.filter(({p})=>p.role===(late?'CP':'RP')).sort((a,b)=>b.p.movement+b.p.control-a.p.movement-a.p.control)[0]||unused.find(({p})=>p.role!=='SP')||unused[0];
  if(choice){this.awayPitcherIndex=choice.i;this.usedCpuPitchers.push(choice.i);}
 }

 get defending(){return (this.half==='top')===this.userHome;}
 get inMatch(){return this.isFixture||this.mode==='pitching'||!!this.career||!!this.challenge;}
 message(en,ja,sub='',kind=''){if(this.log){this.log.push({inning:this.inning,half:this.half,en,ja,sub,kind,batter:this.batter?.name||''});if(this.log.length>80)this.log.shift();}this.emit('message',{en,ja,sub,kind});}
 notify(){this.emit('update',this);}
 setPhase(p){this.phase=p;this.phaseTime=0;}
 get homeRunRunning(){
  return !this.derby&&this.phase==='result'&&this.field?.outcome==='hr'&&
   this.field.runners.some(r=>!r.out&&r.progress<3.99);
 }
 skipHomeRunRun(){
  if(!this.homeRunRunning||this.paused)return false;
  for(const runner of this.field.runners){
   if(runner.out)continue;
   Object.assign(runner,{target:4,progress:4,x:BASES[4].x,y:BASES[4].y,running:false});
  }
  this.phaseTime=Math.max(this.phaseTime,this.runningDemo?3301:621);
  return true;
 }
 setCursor(x,y){if(this.paused)return;this.cursor={x:clamp(x,-1.55,1.55),y:clamp(y,-1.55,1.55)};}
 update(dt,holdResult=false){
  if(dt<=0||this.paused||['ended','change','derby-break','career-pregame','career-ready'].includes(this.phase))return;
  const derby=this.derby;
  if(derby&&this.phase!=='intro'){
   derby.remaining=Math.max(0,derby.remaining-dt);
   if(!derby.remaining&&!['field','miss'].includes(this.phase)){this.finishDerbyTurn();return;}
  }
  if((this.fastForward||this.spectate)&&this.defending&&!this.autoDefense)this.autoDefense=true;
   dt=Math.min(dt,this.phase==='field'?240:50);if(this.fastForward)dt*=4;if(this.phase==='pitch'&&!this.defending&&this.battingAssist&&this.pitch.progress>.62&&this.pitch.progress<1.12)dt*=.76;if(this.autoDefense&&this.defending&&this.phase!=='abs-call'&&this.phase!=='abs-review')dt*=this.defenseSpeed;else if(!derby&&(this.phase==='field'||this.phase==='result'&&this.field))dt*=this.fieldSpeed;this.time+=dt;this.phaseTime+=dt;this.swingAge+=dt;if(this.phase==='result'&&this.field)this.updateRunners(dt/1000);
  if(this.phase==='intro'&&this.phaseTime>(this.career?(this.career.shortIntro?160:1100):1400)){this.beginHalf();}
  else if(this.phase==='abs-call'&&this.absCall?.cpu&&this.phaseTime>=NightGame.ABS_TIMING.cpuCall){
   this.setPhase('abs-review');this.notify();
  }
  else if(this.phase==='abs-call'&&this.phaseTime>=NightGame.ABS_TIMING.call)this.resolveAbsCall(false);
  else if(this.phase==='abs-review'&&this.phaseTime>=NightGame.ABS_TIMING.reviewEnd)this.resolveAbsCall(true);
  else if(this.phase==='aim'&&this.autoDefense&&this.defending&&this.phaseTime>480)this.autoPitch();
  else if(this.phase==='windup'&&this.phaseTime>(derby?270:700)){if(!this.pitch.delivered){this.pitch.delivered=true;const record=this.pitcherRecord();record.workload=(record.workload??record.pitches*1.65)+(this.pitch.cost??1.65);record.pitches++;if(this.defending)this.session.thrown++;}this.setPhase('pitch');this.emit('sound','pitch');this.notify();}
  else if(this.phase==='pitch'){
   this.pitch.progress=this.phaseTime/this.pitch.duration;
   if((this.defending||this.autoBatting)&&!this.pitch.cpuActed&&this.pitch.progress>=this.pitch.cpuTime){this.pitch.cpuActed=true;this.cpuBat();}
   if(this.phase==='pitch'&&this.pitch.progress>1.24)this.take();
  }else if(this.phase==='miss'&&this.phaseTime>330)this.strike(true);
  else if(this.phase==='field'){let remaining=dt/1000;while(remaining>1e-6&&this.phase==='field'){const untilCatch=this.field?.throw?Math.max(.000001,this.field.throw.duration-this.field.throw.t):Infinity;const step=Math.min(remaining,1/120,untilCatch);this.updateField(step);remaining-=step;}}
  else if(this.phase==='result'&&!holdResult&&this.phaseTime>(derby?(this.hit?.kind==='hr'?700:240):this.field?(this.runningDemo?3300:620):this.pitch?.callResult?NightGame.ABS_TIMING.pitchResult:720)){
   if(this.challenge&&(this.field&&!this.field.foul||this.outs>=3))return;
   if(this.field&&this.phaseTime<18000&&this.field.runners.some(r=>!r.out&&Math.abs(r.progress-(r.target??r.start))>.01))return;
   if(typeof this.career?.queuedRunningMode==='boolean'){
    this.manualRunning=this.career.queuedRunningMode;delete this.career.queuedRunningMode;
   }
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
  if(this.phase!=='change'||this.paused)return false;this.beginHalf();return true;
 }
 beginCareerBat(){
  const c=this.career,situation=c.scenarios[c.completed];
  if(c.continuous){this.advanceCareer();return;}
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
  if(this.half==='top'){
   if((this.inning>=this.totalInnings&&this.homeScore>this.awayScore)||(this.drawDecidesSeries&&this.homeScore===this.awayScore)||(this.mercyRule&&this.homeScore-this.awayScore>=10)){this.finish();return;}this.half='bottom';
  }else{if((this.inning>=this.totalInnings&&(!(this.mode==='pennant'||this.apbcFixtureId||this.worldFixture)||this.homeScore!==this.awayScore)&&!(this.tiebreak&&this.homeScore===this.awayScore&&this.inning<this.totalInnings+3))||(this.maxInnings&&this.inning>=this.maxInnings)||(this.mercyRule&&Math.abs(this.homeScore-this.awayScore)>=10)){this.finish();return;}this.inning++;if(this.home.length<this.inning){this.home.push(null);this.away.push(null);}this.half='top';this.stamina=Math.min(100,this.stamina+12);}
  this.outs=0;this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];this.resetCount();this.cursor={x:0,y:0};this.field=null;this.hit=null;this.halfBreak={...endedHalf,nextInning:this.inning,nextHalf:this.half};this.setPhase('change');
  if(this.tiebreak&&this.inning>this.totalInnings&&!this.loadedStart&&!this.career){const side=this.side,order=this.lineups[side],runner=order[((this.battingIndex[side]-1)%9+9)%9];if(runner){this.bases[1]=true;this.baseIds[1]=runner.id;this.basePitcherIds[1]=this.pitcher.id;}}
  this.seedHalf();this.message('CHANGE',`${this.inning}回${this.half==='top'?'オモテ':'ウラ'} · ${this.defending?'あなたの投球':'あなたの攻撃'}`,this.loadedStart?'2アウト満塁から再開':this.apbcFixtureId&&this.inning>this.totalInnings?'無死一・二塁から再開':this.defending?'球種を選び、画面で狙って離す':'カーソルを合わせて SWING');this.notify();
 }
 prepare(){
  if(this.batFinished){this.battingIndex[this.side]=(this.battingIndex[this.side]+1)%9;this.batFinished=false;this.bunt=false;}
  this.field=null;this.hit=null;this.pitch=null;this.runningDemo=false;this.next='pitch';this.emit('clear');
  if(this.defending){this.cpuShiftNow=false;if((this.autoDefense||this.spectate||this.fastForward)&&this.cpuWantsIBB()&&this.intentionalWalk(true))return;this.setPhase('aim');this.notify();return;}
  if(this.derby){this.createPitch(TYPES[0],{x:rnd(-.45,.45),y:rnd(-.13,.36)});return;}
  if(!this.career?.continuous||!this.balls&&!this.strikes)this.cpuRelief();
  const plan=this.cpuPitchPlan();
  const type=this.mode==='practice'&&this.practicePitch!=='random'?(TYPES.find(p=>p.id===this.practicePitch)||plan.type):plan.type;
  const target=this.isFixture||this.mode==='career-bat'
   ?plan.target:{x:rnd(-.9,.9),y:rnd(-.88,.88)};
  this.createPitch(type,target);
  this.cpuShiftNow=this.batter.power>=72&&Math.random()<.6;
  if(this.cpuWantsIBB())this.intentionalWalk(true);
 }
 windNow(){return ((this.wind??this.park.wind)||0)+(this.weather==='rain'?-1.2:0);}
 pitchFatigue(){
  if(this.defending)return clamp(1-this.stamina/100,0,1);
  const record=this.pitchingStats[this.pitcher.id];
  const workload=record?.workload??(record?.pitches??0)*1.65;
  return clamp(workload*.84/Math.max(35,this.pitcher.stamina),0,1);
 }
 cpuPitchPlan(){
  const p=this.pitcher,control=clamp(p.control+this.conditionFor(p)*3,10,99),b=this.activeBatter,recent=this.pitchTrace.filter(x=>x.pitcherId===p.id).slice(-3),two=this.strikes===2,behind=this.balls>this.strikes;
  const read=this.mode==='career-bat'?this.career.opponentPlan:null;
  const counter=(read?.byPitcher?.[p.id]??(read?.byPitcher?0:read?.inner??0))>=2;
  const pitcherStyle=this.mode==='career-bat'?Number(p.id.charCodeAt(p.id.length-1))%3:-1;
  const weighted=p.pitches.map(id=>{
   const detail=p.pitchDetails?.[id]||{};
   let weight=Number.isFinite(detail.usage)?Math.max(.1,detail.usage):id==='fast'?3:1.4;
   if(two&&['fork','split','slider','vslider','curve','change'].includes(id))weight*=1.6;
   if(behind&&id==='fast')weight*=1.6;
   if(recent.at(-1)?.id===id)weight*=.55;
   if(b.power>=85&&id==='fast')weight*=.85;
   if(counter)weight*=id==='fast'?.66:1.35;
   if(pitcherStyle===0&&id==='fast')weight*=1.4;
   if(pitcherStyle===1&&['sinker','fork','change'].includes(id))weight*=1.5;
   if(pitcherStyle===2&&['slider','cutter','curve'].includes(id))weight*=1.45;
   return {type:TYPES.find(t=>t.id===id),weight};
  }).filter(x=>x.type);
  let draw=Math.random()*weighted.reduce((n,x)=>n+x.weight,0),choice=weighted.at(-1);
  for(const x of weighted){draw-=x.weight;if(draw<=0){choice=x;break;}}
  const type=choice?.type||TYPES[0],waste=two&&this.balls<3&&Math.random()<.42;
  const fatigue=this.pitchFatigue(),lostCommand=fatigue*fatigue;
  const baseline=this.balls===3?.86:behind?.78:two?.58:.70;
  const attack=clamp(baseline+(control-70)*.004-lostCommand*.19,.33,.95);
  const strike=!waste&&Math.random()<attack;
  const handed=this.battingHand==='L'?-1:1,outside=handed;
  let x=(Math.random()<(counter?.86:pitcherStyle===0?.49:.68)?outside:-outside)*rnd(.48,.9),y=rnd(-.85,.85);
  if(counter&&type.id!=='fast')y=Math.max(.18,y);
  if(two&&['fork','split','change','vslider','curve'].includes(type.id))y=rnd(.5,.93);
  if(!strike){if(['fork','split','change','vslider','curve'].includes(type.id))y=rnd(1.14,1.51)+lostCommand*.16;else x=outside*(rnd(1.14,1.53)+lostCommand*.16);}
  const error=.025+(100-control)*.0045+lostCommand*.2;
  return {type,target:{x:x+rnd(-error,error),y:y+rnd(-error,error)}};
 }

 createPitch(type,target){
  const base={casual:1150,standard:900,pro:760}[this.difficulty],pitcher=this.pitcher,spec=NightGame.pitchSpec(pitcher,type.id),ceiling=type.id==='fast'?(pitcher.velocityEvidence?.fastMax||spec.speed+3):spec.speed+2,velocity=Math.round(Math.min(ceiling,spec.speed+rnd(-2,2)+(Math.random()<.25?rnd(-2,1):0)-Math.round(Math.pow(this.pitchFatigue(),2)*6)));
  this.pitch={...spec,throwHand:pitcher.hand==='L'?'L':'R',releaseX:(pitcher.hand==='L'?1:-1)*.76/.68,bx:spec.bx*(pitcher.hand==='L'?-1:1),by:spec.by,targetX:target.x,targetY:target.y,isStrike:Math.abs(target.x)<=1.06&&Math.abs(target.y)<=1.06,speed:velocity,duration:base*148/velocity,progress:0,swung:false,cpuActed:false};
  const pitcherPerks=pitcher.careerPerks||{};
  if(this.career&&this.defending&&this.strikes===2&&type.id!=='fast'&&pitcherPerks.closer){
   this.pitch.bx*=1+pitcherPerks.closer*.12;
   this.pitch.by*=1+pitcherPerks.closer*.12;
  }
  if(this.defending||this.autoBatting){
   const repeated=this.career?.opponentPlan?.repeat===type.id;
   const recent=this.pitchHistory.slice(-3),repeat=recent.filter(p=>p.id===type.id).length,locationRepeat=recent.filter(p=>Math.hypot(p.x-target.x,p.y-target.y)<.4).length;
   // Read more pitches early, protect with two strikes, and punish repetition.
   const contact=this.matchup().contact,kRate=(this.batter.stats?.so??this.batter.stats?.k??0)/Math.max(1,this.batter.stats?.pa||200),edge=Math.max(Math.abs(target.x),Math.abs(target.y));
   const discipline=clamp((this.batter.stats?.bb||0)/Math.max(1,this.batter.stats?.pa||200),.02,.2);const aggression=this.strikes===2?.86:this.strikes===1?.61:.40;
   const strikeSwing=clamp(aggression+(repeat+locationRepeat)*.025-(edge>.78?.08:0)+(this.balls===3?.05:0)-discipline*.4,.26,.94);
   const chase=clamp((this.strikes===2?.29:.14)-(edge-1.06)*.24+(80-contact)*.002-discipline*.45,.02,.32);
   this.pitch.cpuSwing=Math.random()<(this.pitch.isStrike?strikeSwing:chase);
   const buntSpot=(this.bases[0]||this.bases[1])&&!this.bases[2]&&this.outs<2&&this.inning>=Math.max(2,this.totalInnings-2)&&Math.abs(this.homeScore-this.awayScore)<=1&&this.batter.contact<64&&this.batter.power<62;
   this.pitch.cpuBunt=buntSpot&&Math.random()<.5;if(this.pitch.cpuBunt)this.pitch.cpuSwing=false;
   const skill={casual:.09,standard:0,pro:-.07}[this.difficulty];
   const error=clamp(.35+(80-contact)*.004+(kRate-.16)*.75+skill+.17*Math.hypot(this.pitch.bx,this.pitch.by)+Math.max(0,velocity-145)*.004-.05*repeat-.025*locationRepeat-(repeated?(this.career.scouted?.025:.085):0),.17,.88);
   this.pitch.cpuAim={x:target.x+rnd(-error,error)-this.pitch.bx*.16,y:target.y+rnd(-error,error)-this.pitch.by*.12};
   const timingSpread=.11+Math.max(0,kRate-.14)*.3+Math.hypot(this.pitch.bx,this.pitch.by)*.04+Math.max(0,velocity-145)*.002;
   this.pitch.cpuTime=1+rnd(-timingSpread,timingSpread)+(Math.random()<.22?rnd(-.17,.17):0);
   this.pitchHistory.push({id:type.id,x:target.x,y:target.y});if(this.pitchHistory.length>12)this.pitchHistory.shift();
  }
  if(this.inMatch&&this.defending&&!this.steal){
   const from=this.bases[1]&&!this.bases[2]?2:this.bases[0]&&!this.bases[1]?1:0;
   if(from){const runner=this.lineups[this.side].find(p=>p.id===this.baseIds[from-1]);if((runner?.run??0)>=72&&Math.random()<.3)this.steal=true;}
  }
  this.setPhase('windup');this.emit('clear');this.notify();
 }
 cpuWantsIBB(){
  if(!this.inMatch||this.career||this.batFinished||this.outs>=2||this.bases[0])return false;
  if(!(this.bases[1]||this.bases[2]))return false;
  const b=this.batter;if(!b||b.power+b.contact<130)return false;
  const rank=[...this.lineups[this.side]].sort((x,y)=>(y.power+y.contact)-(x.power+x.contact)).indexOf(b);
  if(rank>1)return false;
  const late=this.inning>=Math.max(5,this.totalInnings-2),close=Math.abs(this.homeScore-this.awayScore)<=2;
  return ((late&&close)||(this.bases[2]&&this.outs===1))&&Math.random()<.55;
 }
 intentionalWalk(internal=false){
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
  if(!this.inMatch||this.batFinished||this.outs>=3||this.next==='half')return false;
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
  const runner=this.lineups[this.side].find(p=>p.id===this.baseIds[from-1]);
  const catcher=this.fielder('C');
  const chance=clamp(.58+((runner?.run??60)-(catcher?.arm??70))*.008-(this.pitch?.speed??140)*.0008,.25,.92);
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
  if(!this.isFixture||!this.defending||this.phase==='ended'||this.paused)return false;
  this.autoDefense=!!active;this.touch=null;this.notify();return true;
 }
 autoPitch(){
  if(!this.autoDefense||!this.defending||this.phase!=='aim')return false;
  const plan=this.cpuPitchPlan();this.pitchType=plan.type.id;this.cursor=plan.target;return this.throwPitch(plan.target);
 }

 throwPitch(autoTarget=null){
  if(this.paused||!this.defending||this.phase!=='aim')return false;
  if(!this.pitcher.pitches.includes(this.pitchType))this.pitchType=this.pitcher.pitches[0];
  const type=TYPES.find(t=>t.id===this.pitchType)||TYPES[0];
  const pressure=this.inning>=7&&this.bases.some(Boolean)?(this.pitcher.careerPerks?.pressure||0)*5:0;
  const control=clamp(this.pitcher.control+pressure+this.conditionFor(this.pitcher)*3,0,99),fatigue=this.pitchFatigue(),lostCommand=fatigue*fatigue;
  const error=.03+(100-control)*.006+lostCommand*.35;
  let target=autoTarget;
  if(!target){
   target={x:this.cursor.x+rnd(-error,error),y:this.cursor.y+rnd(-error,error)};
   const missChance=clamp(.01+(70-control)*.0035+lostCommand*.18,.005,.32);
   if(Math.abs(this.cursor.x)<=1.06&&Math.abs(this.cursor.y)<=1.06&&Math.random()<missChance){
    const axis=Math.abs(this.cursor.x)>Math.abs(this.cursor.y)?'x':'y';
    const sign=Math.sign(this.cursor[axis])||(Math.random()<.5?-1:1);
    target[axis]=sign*rnd(1.19,1.52+lostCommand*.20);
   }
  }
  this.stamina=Math.max(0,this.stamina-type.cost*90/this.pitcher.stamina);
  this.createPitch(type,target);return true;
 }
 pitchAt(u){
  const p=this.pitch,k=Math.pow(clamp(u,0,1.3),1.65),late=Math.pow(clamp(u,0,1.3),4.4);
  const flutter=p.id==='knuckle'?Math.sin(u*31)*Math.sin(Math.min(1,u)*Math.PI)*.23:0;return{x:(p.releaseX??((p.throwHand||this.pitcher.hand)==='L'?1:-1)*.76/.68)*(1-Math.min(1,Math.max(0,u)))+p.targetX*k+p.bx*(late-k)+flutter,y:p.targetY*k+p.by*(late-k)+flutter*.6};
 }
 swing(){if(this.paused||this.defending||this.phase!=='pitch'||this.pitch.swung||(this.derby&&!this.derby.remaining))return false;if(this.bunt&&this.mode!=='derby')this.buntBall();else this.attempt(this.cursor,this.power,this.pitch.progress-1,false);return true;}
 buntBall(){
  this.pitch.swung=true;this.swingAge=0;this.session.swings++;this.session.contacts++;
  // One roll per bunt: 90% sacrifice, 5% failed advance, 5% bunt hit.
  const roll=Math.random();this.startField(9,1,rnd(-.3,.3),false);
  this.field.manual=null;this.field.buntResult=roll<.90?'sacrifice':roll<.95?'buntout':'buntsingle';
 }
 cpuBat(){if(this.pitch.cpuBunt){this.buntBall();return;}if(this.pitch.cpuSwing)this.attempt(this.pitch.cpuAim,Math.random()<(this.matchup().power>80?.50:.27),this.pitch.cpuTime-1,true);}
 attempt(aim,power,delta,cpu){
  const p=this.pitch;p.swung=true;this.swingAge=0;this.emit('sound','swing');if(!cpu)this.session.swings++;
  const previousPower=this.power;this.power=power;const {rx,ry}=this.batSize;this.power=previousPower;
  const contactError=Math.hypot((aim.x-p.targetX)/(rx+.07),(aim.y-p.targetY)/(ry+.07));
  const form=this.batter.careerForm;
  const tight=!cpu&&this.career?.difficulty!=='relaxed'&&(this.career?.difficulty?1:0);
  const penalty=(!cpu&&p.id!=='fast'&&this.batter.careerWeakness>=2?.018:0)+(form==='legkick'?.024:0);
  const timeWindow={casual:.24,standard:.21,pro:.18}[this.difficulty]-(tight?.027:0)-penalty
   +(!cpu&&this.career?.scouted?.012:0)+(form==='compact'?.009:0);
  if(Math.abs(delta)>timeWindow||contactError>1.07){if(!cpu)this.emit('timing',{text:contactError>1.07?'カーソルが合っていない':delta<0?'振り出しが早い':'振り遅れ'});this.setPhase('miss');this.notify();return;}
  const core=clamp(1-contactError,0,1),timing=clamp(1-Math.abs(delta)/timeWindow,0,1),quality=core*.82+timing*.18;
  if(!cpu){this.session.contacts++;if(core>.82&&timing>.7)this.session.perfect++;this.emit('timing',{text:core>.82?'芯で捉えた！':core>.45?'ナイスミート':'バットの端に当たった'});}
  // Off-center contact sets launch angle and spray; contact is spatially required.
  const spray=clamp(delta*3.0*(this.battingHand==='L'?-1:1)+(p.targetX-aim.x)*.43+rnd(-.04,.04)+(cpu?rnd(-.24,.24):0),-1.35,1.35);
  const launch=clamp(13+(this.batter.trait==='長距離砲'&&power?3:0)+(aim.y-p.targetY)*77+(power?12:0)+rnd(-4,4),-8,65);
  const exitSpeed=22+quality*19+(this.matchup().power-60)*.12+(power?6:0)+(this.batter.trait==='勝負強い'&&(this.bases[1]||this.bases[2])?1.5:0);
  this.startField(exitSpeed+(this.derby&&power?3:0),launch,spray,cpu,core>.82);
 }
 startField(speed,launch,spray,cpu,perfect=false){
  this.playEvents=[];const a=launch*Math.PI/180,flat=speed*Math.cos(a);
  const fly=clamp((launch-12)/30,0,1),flightLift=1-.28*fly;
  const ball={x:0,y:0,z:1,vx:Math.sin(spray)*flat,vy:Math.cos(spray)*flat,
   vz:Math.sin(a)*speed*flightLift,bounces:0,flightRate:1+.53*fly,flightLift};
  const landing=this.predictLanding(ball);const foul=Math.abs(spray)>Math.PI/4;
  const fielders=this.derby?[]:NightGame.positions(this.park).map(([name,x,y],i)=>{const profile=this.fielder(name);
   if((this.defending||this.challenge)&&this.defense==='in')y-=i>=6?9:i>1?5:0;if(this.defending&&this.defense==='deep')y+=i>=6?10:0;
   const fieldRating=profile.field,run=profile.run,outfielder=i>=6;
   let reaction=Math.max(FIELD_READ_DELAY,(outfielder?.64:.24)+(70-fieldRating)*.009);
   let speedMul=1;
   if(i>=2&&(this.defending?this.shift==='pull':!!this.cpuShiftNow)&&launch<25&&Math.abs(spray)>.08){
    const toPull=(spray>0)===(this.battingHand==='L');
    if(toPull){if(i===3){reaction*=.85;speedMul=1.08;}else if(i===4||i===5){reaction*=.7;speedMul=1.15;}}
    else if(i===3){reaction*=2.2;speedMul=.78;}
    else if(i===2){reaction*=1.3;speedMul=.94;}
    else if(i===(this.battingHand==='L'?6:8))reaction*=1.35;
   }
   const baseSpeed=(6.62+(run-70)*.036+(fieldRating-70)*.025)*(outfielder?1.09:1.07);
   return {name,player:profile.name,x,y,startX:x,startY:y,fieldRating,
    speed:baseSpeed*speedMul,pickSpeed:baseSpeed,arm:22+profile.arm*.12,
    reach:.79+fieldRating*.008,catchReach:.58+fieldRating*.006,
    reaction,target:{x,y},running:false};});
  const candidate=fielders.map((f,i)=>({i,t:dist(f,landing)/(f.pickSpeed||f.speed)})).sort((a,b)=>a.t-b.t)[0]?.i??0;
  const runners=[{id:this.batter.id,start:0,progress:0,x:0,y:0,batter:true,speed:this.runnerSpeed}];this.bases.forEach((b,i)=>{if(b)runners.push({id:this.baseIds[i],start:i+1,progress:i+1,x:BASES[i+1].x,y:BASES[i+1].y,batter:false,speed:RUNNER_SPEED(this.runnerRating(this.lineups[this.side].find(p=>p.id===this.baseIds[i])))});});
  this.field={ball,landing,fielders,chaser:candidate,elapsed:0,foul,cpu,perfect,trail:[],runners:this.derby?[]:runners,outsAtContact:this.outs,throw:null,resolved:false,outcome:null,maxTravel:0,landingTime:landing.time||1, batterName:this.batter.name,runnerSpeed:this.runnerSpeed};
  if((this.inMatch||this.mode==='practice')&&!foul){this.field.manual={userControlled:(this.isFixture||!!this.challenge||this.mode==='career-bat')&&this.manualRunning&&!this.defending,selection:this.mode==='career-bat'?this.career.playerId:null,secured:false,holder:null,bag:null,initialBases:this.bases.slice(),initialIds:this.baseIds.slice(),outs:[],lastOut:null,fly:false,recovery:0};for(const r of runners)Object.assign(r,{base:r.start,furthest:r.start,autoTarget:r.batter?1:r.start,command:r.batter?1:r.start,waiting:!r.batter,out:false,scored:false,needsTag:false,chargedPitcherId:r.batter?this.pitcher.id:this.basePitcherIds[r.start-1]||this.pitcher.id,touchedAt:{[r.start]:0}});}
  this.field.trajectory=launch<8?'ground':launch<=22?'liner':launch>=36&&Math.hypot(landing.x,landing.y)<75?'blooper':'fly';this.field.wallHit=false;this.planIntercepts();
  if(this.field.manual)this.startForcedRunners();
  this.hit={distance:0,kind:'live',perfect,exitKmh:Math.round(speed*3.6),launchAngle:Math.round(launch),sprayAngle:Math.round(spray*180/Math.PI)};this.setPhase('field');this.emit('clear');this.emit('sound',perfect?'perfect':'hit');this.emit('field',this.field);this.notify();
 }
 planIntercepts(){
  const f=this.field,b={...f.ball},samples=[];
  for(let t=.025;t<=f.landingTime+.035;t+=.025){
   moveBattedBall(b,.025,this.windNow());
   if(b.bounces)break;
   if(b.vz<0)samples.push({x:b.x,y:b.y,z:b.z,t});
  }
  let best=null;
  f.fielders.forEach((p,i)=>{
   // Infielders turn and run back toward the outfield much slower than they
   // charge in, so a hard liner over their head drops instead of being run
   // down at full sprint speed.
   const backSpeed=q=>i<6&&q.y>p.startY+2?.6:1;
   const point=samples.find(q=>q.t>p.reaction&&catchType(p,q,Math.max(0,dist(p,q)-p.speed*backSpeed(q)*(q.t-p.reaction)),!f.foul));
   p.intercept=point?{x:point.x,y:point.y,time:point.t}:{...f.landing,time:f.landingTime+Math.max(0,dist(p,f.landing)-p.reach)/(p.speed*backSpeed(f.landing))};
   if(!best||p.intercept.time<best.t)best={i,t:p.intercept.time,air:!!point};
  });
  f.chaser=best?.i??f.chaser;
  f.catchable=!!best?.air;
 }
 predictLanding(initial){
  const b={...initial};
  for(let i=1;i<=1600;i++){
   moveBattedBall(b,.01,this.windNow());
   if(b.bounces)return{x:b.x,y:b.y,time:i*.01};
  }
  return{x:b.x,y:b.y,time:16};
 }
 readGroundBall(){
  const f=this.field;
  if(f.groundRead&&f.elapsed<f.groundRead.until)return f.groundRead;
  const b={...f.ball},wind=this.windNow();
  let best=null;
  for(let i=0;i<=36&&!best;i++){
   const t=i*.1;
   if(b.z<1.25&&(b.bounces||f.wallHit)){
    f.fielders.forEach((p,index)=>{
     const eta=Math.max(0,dist(p,b)-p.reach)/p.speed+Math.max(0,Math.max(p.reaction,p.recoverAt??0)-f.elapsed);
     if(eta<=t+.04&&(!best||eta<best.eta))best={x:b.x,y:b.y,index,t,eta};
    });
   }
   if(!best)for(let j=0;j<6;j++)moveBattedBall(b,1/60,wind);
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
  return f.outsAtContact<2&&f.trajectory!=='ground'&&f.catchable&&!f.wallHit&&!f.ball.bounces&&!f.manual.secured;
 }
 updateRunners(dt){
  const f=this.field;if(f.manual&&!f.resolved){this.updateManualRunners(dt);return;}
  // Lead runners move first. Reserve space on the path so a faster trailing
  // runner cannot pass or stand on the same base as the runner ahead.
  let ahead=Infinity;
  for(const r of [...f.runners].sort((a,b)=>b.start-a.start)){
   if(r.out)continue;
   const forced=f.ball.bounces>0&&!f.foul&&this.bases.slice(0,r.start).every(Boolean);
   const provisional=r.batter?1:((f.outsAtContact===2||forced)&&!f.foul?Math.min(4,r.start+1):r.start);
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
  if(!this.inMatch||!m||f.resolved||f.hitMusicPlayed||f.overFence||!f.ball.bounces||m.fly||this.outs>=3)return;
  if(f.runners.find(r=>r.batter).furthest<1||m.outs.some(o=>o.type==='force'))return;
  // An outstanding force on another runner can still turn safe arrival into a fielder's choice.
  if(f.runners.some(r=>!r.out&&!r.scored&&this.manualForceBase(r)))return;
  this.playHitMusic();
 }
 fieldingAction(index,type){
  const f=this.field,actor=f.fielders[index];
  actor.action={type,time:f.elapsed};
  const calls={jump:['JUMPING CATCH','ジャンピングキャッチ'],dive:['DIVING CATCH','ダイビングキャッチ'],bobble:['MISPLAY','打球を後逸'],wild:['WILD THROW','送球がそれた']};
  if(!calls[type])return;
  const [en,ja]=calls[type];
  f.fieldingNote=ja;
  this.playEvents.push({type,fielder:index,time:f.elapsed});
  this.message(en,ja,actor.player,type==='wild'||type==='bobble'?'neutral':'out');
 }
 dropFly(index){
  const f=this.field,b=f.ball,p=f.fielders[index];
  if(f.misplay||f.buntResult||this.runningDemo||p.fieldRating==null)return false;
  const hard=b.z>5||Math.hypot(p.x-p.startX,p.y-p.startY)>9;
  if(!hard||Math.random()>=clamp((90-p.fieldRating)*.0038*(this.weather==='rain'?1.6:1),0,.2))return false;
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
  if(f.misplay||f.buntResult||this.runningDemo||!difficult||p.fieldRating==null||p.fieldRating>=78)return false;
  if(Math.random()>=clamp((80-p.fieldRating)*.005*(this.weather==='rain'?1.6:1),0,.26))return false;
  const errors=(this.side==='home'?'away':'home')+'Errors';
  this[errors]=(this[errors]||0)+1;
  f.misplay='bobble';f.groundRead=null;p.recoverAt=f.elapsed+.48;
  b.vx*=.58;b.vy*=.68;b.vz=Math.max(.5,b.vz);
  this.fieldingAction(index,'bobble');this.emit('sound','bounce');
  return true;
 }
 prepareFieldThrow(plan){
  const f=this.field,p=f.fielders[plan.fromIndex],length=dist(plan.from,plan.to);
  if(f.misplay||this.runningDemo||length<31||p?.fieldRating==null||p.fieldRating>=78)return plan;
  const error=clamp((80-p.fieldRating)*.004*(length>42?1:.55),0,.16);
  if(Math.random()>=error)return plan;
  const offset=rnd(2.5,4.3)*(Math.random()<.5?-1:1);
  const wanted=plan.to;
  const to={x:wanted.x+(wanted.y-plan.from.y)/length*offset,y:wanted.y-(wanted.x-plan.from.x)/length*offset};
  const errors=(this.side==='home'?'away':'home')+'Errors';
  this[errors]=(this[errors]||0)+1;
  f.misplay='wild';this.fieldingAction(plan.fromIndex,'wild');
  return {...plan,to,coverAt:wanted,duration:plan.duration+(dist(plan.from,to)-length)/p.arm};
 }
 updateField(dt){
  const f=this.field,b=f.ball;f.elapsed+=dt;
  const move=(p,target,speed)=>{const d=dist(p,target),step=Math.min(d,speed*dt);p.running=d>.5;if(d>.001){p.x+=(target.x-p.x)/d*step;p.y+=(target.y-p.y)/d*step;}};
  this.updateRunners(dt);
  this.updateLiveHitMusic();
  if(f.manual?.secured){this.updateManualDefense(dt,move);return;}
  if(f.throw){
   const th=f.throw,arrived=this.stepReturn(th,b,dt);
   f.fielders.forEach((p,i)=>{if(i!==th.fromIndex)move(p,i===th.receiver?th.to:p.target,p.speed);});
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
    if(th.relay&&this.outs<2){
     this.addOut();f.forceOutRecorded=true;
     runner.out=true;runner.running=false;
     f.throw={...th.relay,from:{...th.to},t:0};this.emit('sound','throw');this.notify();
    }else this.finishBall(th.result);
   }
   return;
  }
  if(moveBattedBall(b,dt,this.windNow())&&b.bounces<=2){
   f.impact={type:'bounce',x:b.x,y:b.y,time:f.elapsed};
   this.emit('sound','bounce');
  }
  const travel=Math.hypot(b.x,b.y);f.maxTravel=Math.max(f.maxTravel,travel);this.hit.distance=Math.round(f.maxTravel);
  const angle=Math.atan2(b.x,b.y),wall=NightPlayers.wallDistance(this.park,angle);
  if(!f.foul&&!f.overFence&&travel>=wall){
   const clearsWall=!f.wallHit&&b.z>NightPlayers.fenceHeight(this.park,angle);
   if(clearsWall&&b.bounces&&!this.derby){f.groundRule=true;this.finishBall('double');return;}
   if(clearsWall&&!b.bounces)f.overFence=true;
   else{
    this.emit('sound','wall');f.impact={type:'wall',x:b.x,y:b.y,time:f.elapsed};f.wallHit=true;f.groundRead=null;f.wallAt=f.elapsed;const ratio=(wall-.25)/travel;b.x*=ratio;b.y*=ratio;b.vx*=-.25;b.vy*=-.25;
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
   if(b.bounces>0)this.finishDerbyBall(f.overFence);
   return;
  }
  if(f.foul&&b.bounces>0){this.finishBall('foul');return;}
  if(f.elapsed>FIELD_READ_DELAY){
   const grounded=b.bounces>0||f.wallHit;
   const target=grounded?this.readGroundBall():f.landing;
   if(grounded)f.chaser=target.index;
   const second=this.secondBaseCover(f.chaser,target);
   f.fielders.forEach((p,i)=>{
    let dest={x:p.startX,y:p.startY};
    if(i===f.chaser)dest=grounded?target:p.intercept||target;
    else if(i===2)dest=BASES[1];
    else if(i===second)dest=BASES[2];
    else if(i===3||i===4)dest={x:target.x*.35,y:Math.min(48,target.y*.5)};
    else if(i>=6){const drift=grounded&&target.y>45?.5:.18;dest={x:p.startX+(target.x-p.startX)*drift,y:p.startY+(target.y-p.startY)*drift};}
    p.target=dest;if(f.elapsed>Math.max(p.reaction,p.recoverAt??0))move(p,dest,p.speed*(i<6&&dest.y>p.startY+2?.6:i>=6&&i===f.chaser?1.15:1));else p.running=false;
   });
   for(let i=0;i<f.fielders.length;i++){
    const p=f.fielders[i];if(f.elapsed<Math.max(p.reaction,p.recoverAt??0))continue;
    const distance=dist(p,b);
    const catchKind=!f.buntResult&&!grounded&&b.vz<0?catchType(p,b,distance,i===f.chaser&&!f.foul):null;
    if(catchKind){
     if(f.manual&&!f.foul&&this.dropFly(i))return;
     this.fieldingAction(i,catchKind);
     if(f.manual&&!f.foul)this.secureManualBall(i,true);else this.finishBall('flyout');return;
    }
    if(grounded&&b.z<1.3&&distance<=p.reach){
     if(f.manual&&!f.foul){
      if(!this.bobbleGrounder(i)){this.fieldingAction(i,'pickup');this.secureManualBall(i);}
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
   const eta=dist(candidate,to)/candidate.speed;
   if(eta<coverTime){receiver=i;coverTime=eta;}
  }
  const flight=dist(from,to)/(f.fielders[holder].arm*(outfieldPickup(holder,from)?1.15:1));
  // Give the covering player time to arrive by holding the release briefly.
  // The actual arrival still requires the ball to meet the receiving glove.
  const extraHold=base==null?1.65:outfieldPickup(holder,from)?.48:2.5;
  const windup=release+clamp(coverTime+.05-release-flight,0,extraHold);
  return {to:{...to},base,receiver,duration:Math.max(.05,windup+flight),release:windup,fromIndex:holder};
 }
 stepReturn(th,b,dt){
  th.t+=dt;
  const release=th.release||0,u=clamp((th.t-release)/Math.max(.001,th.duration-release),0,1);
  b.x=th.from.x+(th.to.x-th.from.x)*u;b.y=th.from.y+(th.to.y-th.from.y)*u;
  b.z=1.65+Math.sin(u*Math.PI)*clamp(dist(th.from,th.to)*.07,.35,5.2);
  return th.t>=th.duration-1e-8;
 }
 planDoublePlay(fielder){
  const f=this.field,holder=f.fielders.indexOf(fielder);
  if(holder<0||f.buntResult||f.foul||!this.bases[0]||this.outs>=2||outfieldPickup(holder,f.ball)||Math.hypot(f.ball.x,f.ball.y)>47)return null;
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
  const thirdOut=(f.outsAtContact??this.outs)+(dp?2:1)>=3;
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
  this.emit('sound',hit?'safe':'out');this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 canControlRunner(id){
  return !!this.field?.manual?.userControlled&&(this.mode!=='career-bat'||id===this.career?.playerId&&this.field.runners.some(r=>r.id===id&&r.batter));
 }
 get manualPlay(){
  return !!(this.field?.manual?.userControlled&&!this.field.resolved&&this.phase==='field'&&!this.defending&&
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
  if(!this.manualPlay||!this.canControlRunner(id)||this.paused||!Number.isInteger(base))return false;
  const f=this.field,r=f.runners.find(x=>x.id===id&&!x.out&&!x.scored);if(!r)return false;
  const at=Math.abs(r.progress-Math.round(r.progress))<.000001,minimum=r.batter?1:1;
  const forward=at?Math.round(r.progress)+1:Math.ceil(r.progress),backward=at?Math.round(r.progress)-1:Math.floor(r.progress);
  if(base<minimum||base>4||base!==forward&&base!==backward||r.needsTag&&(base>=r.progress||base<r.start))return false;
  r.command=base;r.target=base;r.waiting=false;r.running=Math.abs(base-r.progress)>.001;f.manual.selection=id;this.notify();return true;
 }
 commandRunners(action){
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
  if(!r||r.out||this.outs>=3)return;
  if(r.batter&&r.furthest<1&&type!=='catch')type='batter';
  r.out=true;r.running=false;r.waiting=false;r.target=r.progress;r.scored=false;
  const m=this.field.manual;m.outs.push({id:r.id,type,time:this.field.elapsed});m.lastOut=m.outs.at(-1);
  this.playEvents.push({type:'out',runnerId:r.id,method:type,time:this.field.elapsed});if(this.inMatch)this.addOut();this.emit('sound','out');
  if(type!=='catch')this.playCall('out',Number.isInteger(base)?base:null);
  this.notify();
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
   if(r.command>r.base)continue;
   const forced=this.manualForceBase(r);
   if(forced&&(r.batter||down||!f.catchable||this.outs===2)){r.command=forced;continue;}
   const next=r.base+1;
   if(next>4||r.batter&&next===4)continue;
   if(f.runners.some(other=>other.start>r.start&&!other.out&&!other.scored&&other.progress<=next&&(other.command??other.base)<=next))continue;
   if(m.fly){
    if(!m.secured||f.outsAtContact>=2||r.didTag)continue;
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
   }
   // The coach has less to lose on a clear drive into a gap than on a ball straight to an outfielder.
   const onTheRun=Math.abs(pickup.x-pickup.y*.025)>pickup.y*.23||f.wallHit;
   const margin=next===2?(f.trajectory==='ground'&&!f.wallHit?.75:.15):r.batter&&next===3?.82:next===4?.08:onTheRun&&depth>=68?-1.24:-.28;
   if(returnTime>runTime(r,next)+margin)r.command=next;
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
   const reached=Math.abs(r.progress-target)<.00001&&Math.abs(delta)>.00001;
   if(reached){
    const touched=target;r.base=touched;r.furthest=Math.max(r.furthest,touched);r.touchedAt ||= {};r.touchedAt[touched]=f.elapsed-dt+runTime(r,touched,previous);
    r.command=touched;r.target=touched;r.running=false;r.waiting=true;r.blocked=false;
    this.playEvents.push({type:'base',runnerId:r.id,base:touched,time:r.touchedAt[touched]});
    if(r.needsTag&&touched===r.start){r.needsTag=false;r.furthest=r.start;}
    if(touched===4&&!r.needsTag){r.scored=true;r.waiting=false;r.crossedAt=r.touchedAt[4];}
    if(touched===r.contestedBase&&!r.needsTag)this.safeOnThrow(r,touched);
    if(r.requestNext===touched+1&&this.outs<3&&!r.needsTag){
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
  const player=f.fielders[index],acrobatics=['dive','jump'].includes(player.action?.type);
  m.recovery=(fly?(m.outfield?.95:.28):m.outfield?(Math.hypot(f.landing.x,f.landing.y)>=57&&f.trajectory!=='ground'?2.45:.88):.24)+(70-(player.fieldRating??70))*.004+(acrobatics?.32:0);m.fly=fly||m.fly;m.pickupAt=f.elapsed;
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
  if(this.outs>=3&&['force','batter'].includes(m.lastOut?.type))return [];
  return f.runners.filter(r=>r.scored&&!r.out&&!r.needsTag&&(this.outs<3||r.crossedAt<(m.lastOut?.time??-Infinity))).sort((a,b)=>a.crossedAt-b.crossedAt||b.start-a.start);
 }
 displayScore(){
  const score={away:this.awayScore,home:this.homeScore};
  const f=this.field;
  if(this.phase!=='field'||!f?.manual||f.resolved||!f.runners.some(r=>r.scored))return score;
  if(f.outsAtContact===2&&f.runners.some(r=>!r.out&&this.manualForceBase(r)))return score;
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
   const runnerETA=runTime(r,base);
   const safeMargin=m.outfield?.27:.035;
   if(!((appeal&&duration<runnerETA)||
        (force&&duration<runnerETA-safeMargin)||
        (!force&&r.running&&duration<runnerETA+.15)))continue;

   // First choose a possible TWO-OUT play rather than sorting targets by base
   // number. Especially on a 4/6 grounder with runners on first and second,
   // the usual pivot must be SECOND -> FIRST, not an unnecessary throw to third.
   let doublePlay=false;
   if(force&&base===2&&firstRunner===r&&batter&&this.outs<2&&!m.fly&&!m.outfield){
    const relay=this.baseThrow(receiver,1,.18,BASES[2]);
    if(relay.receiver!=null&&relay.receiver!==receiver){
     doublePlay=duration+.16+relay.duration<runTime(batter,1)-.04;
    }
   }
   let score=(appeal?105:force?112:35)-duration*8.5;
   if(force&&base===2&&firstRunner===r&&this.outs<2&&!m.outfield){
    score+=84; // middle-infield force is the correct pivot before evaluating a relay
    if(doublePlay)score+=270;
   }
   if(force&&base===3&&firstRunner&&this.outs<2)score-=42;
   // With loaded bases and a runner about to score, keep a feasible play at
   // home competitive when the second-base double play is not available.
   if(force&&base===4&&this.bases.every(Boolean)&&this.outs<2)score+=56;
   if(appeal)score+=13; // retouch appeals after a caught fly
   choices.push({...plan,runnerId:r.id,appeal,score,doublePlay});
  }
  const choice=choices.sort((a,b)=>b.score-a.score||a.duration-b.duration)[0];
  if(!choice)return null;
  return {...choice,from:{x:f.ball.x,y:f.ball.y},to:{...BASES[choice.base]},t:0,manual:true};
 }
 updateManualDefense(dt,move){
  const f=this.field,m=f.manual,b=f.ball;
  if(this.outs>=3||this.manualWalkoffReady()){this.finishManualPlay();return;}
  if(f.throw){
   const th=f.throw,arrived=this.stepReturn(th,b,dt);
   f.fielders.forEach((p,i)=>{if(i!==(th.fromIndex??m.holder))move(p,i===th.receiver?(th.coverAt||th.to):p.target,p.speed);else p.running=false;});
   if(arrived){
    const receiver=f.fielders[th.receiver],runner=th.runnerId==null?null:f.runners.find(r=>r.id===th.runnerId);
    f.throw=null;this.playEvents.push({type:'throw-arrival',base:th.base,time:f.elapsed,caught:!!receiver&&dist(receiver,th.to)<=BAG_REACH});
    if(!receiver||dist(receiver,th.to)>BAG_REACH){
     m.secured=false;m.holder=null;m.bag=null;f.groundRead=null;
     if(receiver)f.chaser=th.receiver;
     this.safeOnThrow(runner,th.base);
     b.vx=0;b.vy=0;b.vz=0;b.z=.04;b.bounces=Math.max(1,b.bounces);return;
    }
    this.fieldingAction(th.receiver,'catch');this.emit('sound','catch');m.holder=th.receiver;m.bag=th.base??null;m.recovery=th.base==null?.34:.22;m.outfield=false;
    if(runner&&!runner.out&&!runner.scored){
     const onBag=dist(receiver,BASES[th.base])<=BAG_REACH;
     if(onBag&&th.appeal&&runner.needsTag&&runner.progress>runner.start+.04)this.manualOut(runner,'appeal',th.base);
     else if(onBag&&this.manualForceBase(runner)===th.base)this.manualOut(runner,runner.batter?'batter':'force',th.base);
     else if(Math.abs(runner.progress-Math.round(runner.progress))>.001&&dist(receiver,runner)<1.35)this.manualOut(runner,'tag',th.base);
    }
    this.safeOnThrow(runner,th.base);
    this.notify();
   }
   return;
  }
  const holder=f.fielders[m.holder];b.x=holder.x;b.y=holder.y;b.z=2;m.recovery-=dt;
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
    return base&&dist(holder,BASES[base])<Math.min(4.6,runTime(r,base)*holder.speed*.9);
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
  const batter=f.runners.find(r=>r.batter),distance=Math.round(f.maxTravel),outs=m.outs.length;
  const eligible=this.manualRuns(),needed=this.runsToEndGame;
  const walkoff=(this.isFixture||this.career?.continuous)&&this.half==='bottom'&&this.inning>=this.totalInnings&&needed>0&&eligible.length>=needed;
  const scorers=walkoff?eligible.slice(0,needed):eligible;
  const sacFly=m.fly&&scorers.length>0&&this.outs<3;
  let kind=m.fly?(sacFly?'sacrificefly':'flyout'):m.outs.some(o=>o.type==='force')?(outs>=2?'doubleplay':'forceout'):batter.furthest<1?(outs>=2?'doubleplay':'groundout'):['','single','double','triple'][Math.min(3,batter.furthest)];
  const hit=['single','double','triple'].includes(kind);
  this.bases=[false,false,false];this.baseIds=[null,null,null];this.basePitcherIds=[null,null,null];
  for(const r of f.runners){
   if(!r.out&&!r.scored&&r.base>0&&r.base<4){this.bases[r.base-1]=true;this.baseIds[r.base-1]=r.id;this.basePitcherIds[r.base-1]=r.chargedPitcherId;}
   r.target=walkoff||this.outs>=3?r.progress:r.scored?4:r.base;r.running=false;
  }
  for(const r of scorers)this.run(r.id,r.chargedPitcherId);
  if(hit&&!this.runningDemo){this[this.side+'Hits']++;this.pitcherRecord().h=(this.pitcherRecord().h||0)+1;if(!this.defending){this.session.hits++;this.session.maxDistance=Math.max(this.session.maxDistance,distance);}}
  this.completePitch(kind);if(this.inMatch){this.endAtBat(kind,scorers.length);this.resetCount();this.checkEnd();}
  f.resolved=true;f.outcome=kind;this.hit.kind=kind;this.hit.contactType=this.contactType(kind);
  const label=outs>=2?['DOUBLE PLAY','ダブルプレー']:m.fly?[sacFly?'SACRIFICE FLY':'FLY OUT',scorers.length?'タッチアップで生還':'フライアウト']:hit?[kind.toUpperCase(),{single:'ヒット',double:'ツーベース',triple:'スリーベース'}[kind]]:['OUT',m.lastOut?.type==='tag'?'タッチアウト':m.lastOut?.type==='force'?'フォースアウト':'アウト'];
  this.message(label[0],label[1],`${f.fieldingNote?f.fieldingNote+' · ':''}${this.contactType(kind)} · ${distance} m · ${this.outs}アウト${scorers.length?' · '+scorers.length+'点':''}`,hit?'hit':'out');
  this.emit('sound',hit?'safe':'out');this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 completePitch(kind){
  if(this.pitch)this.lastPitch={name:this.pitch.name,speed:this.pitch.speed};
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
   this.pitchTrace.push({id:this.pitch.id,name:this.pitch.name,x:this.pitch.targetX,y:this.pitch.targetY,result:kind,pitcherId:this.pitcher.id,half:this.half,inning:this.inning});if(this.pitchTrace.length>20)this.pitchTrace.shift();}
  if(!this.defending&&!this.runningDemo){this.session.pitches++;this.session.history.push(kind);}
 }
 finishDerbyBall(homeRun){
  const f=this.field;f.resolved=true;f.outcome=homeRun?'hr':f.foul?'foul':'in-play';
  this.hit.kind=f.outcome;this.completePitch(f.outcome);
  if(homeRun){
   this.derby.turnHR++;this.session.hr++;this.session.hits++;
   this.session.maxDistance=Math.max(this.session.maxDistance,this.hit.distance);
   this.message('HOME RUN','ホームラン！',this.hit.distance+' m','homer');this.emit('sound','homer');
  }else if(f.foul)this.emit('sound','foul');
  this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 finishDerbyTurn(){
  const d=this.derby;
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
  const thirdOut=['flyout','groundout'].includes(kind)&&(f.outsAtContact??this.outs)===2;
  f.runners.forEach(r=>{r.target=advance?Math.min(4,r.start+advance):thirdOut?r.progress:r.start;if(!advance&&r.batter)r.out=true;r.running=false;});this.hit.kind=kind;
  const distance=Math.round(f.maxTravel),out=kind==='flyout'||kind==='groundout';let runs=0;
  if(kind==='foul'){
   this.emit('sound','foul');this.steal=false;if(this.inMatch)this.strikes=Math.min(2,this.strikes+1);this.completePitch('foul');this.message('FOUL','ファウル',this.strikes===2?'2ストライク。もう一度。':'次の1球へ。');
  }else{
   if(!this.defending){if(!out){this.session.hits++;this.session.maxDistance=Math.max(this.session.maxDistance,distance);}if(kind==='hr')this.session.hr++;}
   if(!out){this[this.side+'Hits']++;this.pitcherRecord().h=(this.pitcherRecord().h||0)+1;}
   this.completePitch(kind);
   if(this.inMatch){if(out)this.addOut();else{const before=this.battingScore;this.advance({single:1,double:2,triple:3,hr:4}[kind]);runs=(this.battingScore)-before;if(!this.defending&&runs===4&&kind==='hr')this.session.grandSlam=true;}this.endAtBat(kind,runs);this.resetCount();this.checkEnd();}
   const label={single:['SINGLE','ヒット'],double:f.groundRule?['GROUND-RULE DOUBLE','エンタイトルツーベース']:['DOUBLE','ツーベース'],triple:['TRIPLE','スリーベース'],hr:['HOME RUN','ホームラン！'],flyout:['FLY OUT','フライをキャッチ！'],groundout:['OUT AT FIRST','一塁へ送球、アウト！']}[kind];
   this.message(label[0],label[1],`${f.fieldingNote?f.fieldingNote+' · ':''}${distance} m${runs?' · '+runs+'点':''}${out?' · '+this.outs+'アウト':''}`,kind==='hr'?'homer':out?'out':'hit');
   this.emit('sound',kind==='hr'?'homer':out?'out':'safe');
  }
  this.setPhase('result');this.emit('hit',this.hit);this.notify();
 }
 static ABS_TIMING=Object.freeze({call:1700,cpuCall:650,pitchResult:980,reviewReveal:4200,reviewEnd:5450});

 // Retain the game's strike zone. Convert its axes to a 43.2 cm plate and
 // a 60 cm high zone for the review graphic and for the Statcast distance bins.
 static absLocation(x,y){
  const edge=1.06,halfWidth=.216,halfHeight=.30;
  const dx=(Math.abs(x)/edge-1)*halfWidth,dy=(Math.abs(y)/edge-1)*halfHeight;
  const gap=dx>0||dy>0?Math.hypot(Math.max(0,dx),Math.max(0,dy)):Math.max(dx,dy);
  return {x:x/edge*halfWidth,y:halfHeight-y/edge*halfHeight,gap};
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
 get absCanChallenge(){
  return this.phase==='abs-call'&&!!this.absCall&&!this.absCall.cpu&&this.absRemaining>0&&!(this.autoDefense&&this.defending);
 }

 requestAbsChallenge(){
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
  this.commitCalledPitch(reviewed?call.strike:call.umpireStrike);
  if(!reviewed&&!this.batFinished)this.phaseTime=NightGame.ABS_TIMING.pitchResult;
 }
 take(){
  if(!this.inMatch)this.emit('sound','catch');
  if(this.derby){this.completePitch('take');this.setPhase('result');this.notify();return;}
  if(!this.inMatch){this.completePitch('take');this.message('TAKE','見送り','カーソルをコースへ動かそう');this.setPhase('result');this.notify();return;}
  const location=NightGame.absLocation(this.pitch.targetX,this.pitch.targetY);
  if(this.absRemaining===undefined){let call=this.pitch.isStrike;if(this.umpireBias&&Math.abs(location.gap)<=.0254&&(this.umpireBias>0)!==call&&Math.random()<.5)call=!call;this.commitCalledPitch(call);return;}
  const umpireStrike=NightGame.absUmpireStrike(location.gap-(this.umpireBias||0),Math.random());
  const cpu=umpireStrike===this.defending;
  const challenge=cpu?this.shouldCpuChallenge(location.gap):this.absRemaining>0&&!(this.autoDefense&&this.defending)&&!this.autoBatting;
  if(!challenge){
   this.commitCalledPitch(umpireStrike);
   return;
  }
  this.absCall={...location,strike:this.pitch.isStrike,umpireStrike,cpu};
  this.setPhase('abs-call');this.notify();
 }
 commitCalledPitch(strike){
  if(this.rollHbp())return;
  if(strike){this.strike(false);return;}
  this.pitch.callResult=true;
  this.emit('sound','catch');this.balls++;this.completePitch('ball');
  const before=this.battingScore;
  if(this.balls>=4){const loaded=this.bases.every(Boolean);this.walk();this.endAtBat('walk',this.battingScore-before);this.resetCount();this.message('WALK','フォアボール',loaded?'押し出しで1点':'走者が進塁');this.checkEnd();}else{this.message('BALL','ボール',`${this.balls}ボール · ${this.strikes}ストライク`);this.resolveSteal();this.rollWildPitch();}
  this.emit('sound','ball');this.setPhase('result');
  if(this.battingScore>before)this.emit('scoring-walk');
  this.notify();
 }
 strike(swung){
  if(this.pitch)this.pitch.callResult=true;
  this.completePitch('miss');this.emit('sound','catch');this.emit('sound','strike');
  if(this.inMatch){this.strikes++;if(this.strikes>=3){this.addOut('strikeout',this.pitcher.id);if(this.defending)this.session.ks++;this.endAtBat('strikeout');this.resetCount();this.message('STRIKEOUT',swung?'空振り三振！':'見逃し三振！',`${this.outs}アウト`,'out');}else{this.message(swung?'SWING & MISS':'STRIKE',swung?'空振り':'ストライク',`${this.balls}ボール · ${this.strikes}ストライク`);this.resolveSteal();this.rollWildPitch();}}
  else if(!this.derby)this.message('SWING & MISS','空振り','ボールの位置とカーソルを合わせよう');
  this.setPhase('result');this.notify();
 }
 addOut(kind='out',player){
  this.pitcherRecord().outs++;this.outs++;if(this.outs>=3)this.next='half';
  const f=this.field,actor=f?.fielders?.[f?.manual?.holder??f?.throw?.receiver??f?.chaser];
  this.emit('music-result',{kind,player:player??(actor?this.fielder(actor.name).id:null),side:this.side==='home'?'away':'home',thirdOut:this.outs===3});
 }
 resetCount(){this.balls=0;this.strikes=0;}
 pitcherForSide(side){return this.pitchingStaff[side][side===this.userSide?this.homePitcherIndex:this.awayPitcherIndex];}
 run(id=null,chargedPitcherId=null){
  const side=this.side,opponent=side==='home'?'away':'home',before=this[side+'Score']-this[opponent+'Score'];
  const charge=chargedPitcherId||this.pitcher.id,pr=this.pitchingStats[charge] ||= {pitches:0,batters:0,outs:0,runs:0,k:0,bb:0,h:0};pr.runs++;
  if(id){const st=this.box[id] ||= {pa:0,ab:0,h:0,hr:0,rbi:0,k:0,bb:0,r:0};st.r=(st.r||0)+1;}
  this[side+'Score']++;this[side][this.inning-1]=(this[side][this.inning-1]||0)+1;
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
 finish(){if(this.phase==='ended')return;delete this.pendingWorldBatting;this.setPhase('ended');this.emit('end',this);}
};
})();
