/* Player career progression and save data. On-field play stays in NightGame. */
(()=>{
 'use strict';
 const LEVELS={trainee:'練習生',farm:'二軍',bench:'一軍帯同',regular:'一軍レギュラー'};
 const STYLES={
  contact:{label:'巧打型',pos:'CF',trait:'巧打',skills:{contact:46,power:29,run:44,field:37,arm:34}},
  power:{label:'長打型',pos:'1B',trait:'長距離砲',skills:{contact:34,power:51,run:33,field:34,arm:39}},
  speed:{label:'俊足型',pos:'SS',trait:'韋駄天',skills:{contact:39,power:28,run:53,field:42,arm:40}},
  velocity:{label:'速球派',pos:'P',trait:'速球派',skills:{velocity:132,control:38,movement:37,stamina:44},pitches:['fast','slider','fork']},
  control:{label:'制球派',pos:'P',trait:'精密制球',skills:{velocity:122,control:51,movement:40,stamina:45},pitches:['fast','cutter','change']},
  breaking:{label:'変化球派',pos:'P',trait:'変化球派',skills:{velocity:125,control:42,movement:52,stamina:39},pitches:['fast','curve','split']},
  twoway:{label:'二刀流',pos:'P',trait:'二刀流',skills:{velocity:128,control:43,movement:41,stamina:47,contact:43,power:39,run:43,field:36,arm:41},pitches:['fast','slider','change']}
 };
 const SKILLS={contact:'ミート',power:'パワー',run:'走力',field:'守備',arm:'肩',velocity:'球速',control:'制球',movement:'変化球',stamina:'持久力'};
 const SCHOOL_PROFILES={
  北峰高校:{tier:'中堅・育成型',detail:'設備と指導が充実。下級生も起用し、基礎から苦手な能力を補える。',
   rivals:['同学年の野手','同学年の投手'],development:.18},
  青波高校:{tier:'弱小・打線不足',detail:'出塁と長打を求められる。1年目から上位打線を任されやすい。',
   attack:-1.25,defense:-.25,weak:true,slot:1,bat:'contact',pitch:'stamina',rivals:['控えの同級生','上級生の先発投手']},
  星南高校:{tier:'弱小・投手不足',detail:'援護や継投に余裕が少ない。投手は1年目から先発を任される。',
   attack:-.65,defense:-1.15,weak:true,slot:2,bat:'run',pitch:'movement',rivals:['上級生の野手','控えの同級生']},
  東嶺学院:{tier:'全国強豪・打撃型',detail:'強い打線を持つ全国常連。まず実戦で結果を出してベンチ入りを狙う。',
   attack:1.65,defense:.72,threshold:65,bat:'power',pitch:'velocity',rivals:['全国大会経験のある上級生','先発と救援を兼ねる上級生']},
  白峰学園:{tier:'全国強豪・投手型',detail:'投手力と守備が持ち味。特に先発投手の競争が厳しい。',
   attack:1.00,defense:1.48,threshold:66,pitchThreshold:70,bat:'field',pitch:'control',rivals:['守備力の高い上級生','全国大会で登板したエース']},
  桜陵高校:{tier:'地区強豪',detail:'地区大会で安定した実績。内野手は起用枠が厚く、外野手や投手には出番が多い。',
   attack:.58,defense:.42,threshold:58,bat:'arm',pitch:'movement',rivals:['地区大会を経験した上級生','上級生の先発投手']}
 };
 const SCHOOLS=Object.keys(SCHOOL_PROFILES);
 const L=NightCareerLeagues,D=NightCareerDevelopment,Life=NightCareerLife;
 const ID='career-player';
 const validName=name=>typeof name==='string'&&/^[\p{L}\p{N}][\p{L}\p{N}\p{M} ・ー\-]{0,15}$/u.test(name);
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 const number=n=>Number.isFinite(n)?Math.max(0,n):0;
 const add=(to,from)=>{for(const key of Object.keys(to))to[key]+=number(from[key]);};
 const money=amount=>amount.toLocaleString('ja-JP')+'万台湾ドル';
 const avg=stats=>stats.ab?(stats.h/stats.ab).toFixed(3).replace(/^0/, ''):'—';
 const era=stats=>stats.outs?((stats.earned??stats.allowed)*27/stats.outs).toFixed(2):'—';
 const innings=outs=>Math.floor(outs/3)+(outs%3?'.'+outs%3:'');
 const ROLES={trainee:'練習生',farm:'二軍主力',pinch:'代打',defense:'守備固め',starter:'スタメン',
  inactive:'メンバー外',mop:'ロングリリーフ',fireman:'火消し',setup:'セットアッパー',closer:'クローザー',rotation:'先発ローテーション','school-relief':'控え投手・救援'};
 const schoolTarget=(school,position)=>{
  const profile=SCHOOL_PROFILES[school];
  if(school==='桜陵高校'&&['P','LF','CF','RF','DH'].includes(position))return null;
  return (position==='P'?profile.pitchThreshold:null)||profile.threshold||null;
 };
 const carriesForm=ratings=>ratings.length>0&&ratings.at(-1)>=55;
 const baseRoles={trainee:'trainee',farm:'farm'};
 const POSITION_NAMES={P:'投手',C:'捕手','1B':'一塁手','2B':'二塁手','3B':'三塁手',SS:'遊撃手',LF:'左翼手',CF:'中堅手',RF:'右翼手',DH:'指名打者'};
 const POSITIONS=Object.keys(POSITION_NAMES).filter(pos=>pos!=='P');
 const BAT_CHANCES={starter:[2,3,3,4,4,5],farm:[2,3,3,4],trainee:[1,2,2,3],pinch:[1,1,1,2],defense:[1,1,2]};
 const PITCH_CHANCES={rotation:[2,2,3,3,4],farm:[1,2,2,3],trainee:[1,1,2],mop:[1,2,2,3],fireman:[1,1,2],setup:[1,1,2],closer:[1,1,1,2],'school-relief':[1,1,1,2]};
 window.NightCareer=class NightCareer{
  static id=ID;
  static validName=validName;
  static key='nightball.career';
  static levels=LEVELS;
  static styles=STYLES;
  static skills=SKILLS;
  static roles=ROLES;
  static positions=POSITIONS;
  static positionNames=POSITION_NAMES;
  static schools=SCHOOLS;
  static schoolProfiles=SCHOOL_PROFILES;
  static schoolTarget=schoolTarget;
  static money=money;
  static avg=avg;
  static era=era;
  static innings=innings;
  constructor(name,school,style,hand,position=STYLES[style].pos){
   this.version=3;
   this.seed=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
   this.name=name;
   this.school=school;
   this.style=style;
   this.hand=hand;
   this.stage='school';
   this.schoolYear=1;
   this.proYear=1;
   this.gameNumber=0;
   this.clubId=null;
   this.level=null;
   this.pay=0;
   this.xp={};
   this.plan=STYLES[style].pos==='P'?'control':'contact';
   this.pitches=STYLES[style].pitches?.slice()||[];
   const natural=STYLES[style].pos;
   this.position=natural==='P'||!POSITIONS.includes(position)?natural:position;
   this.positions=[this.position];
   this.leftTraining=0;
   this.batPos=style==='twoway'?'DH':null;
   this.goal=null;
   this.specialProgress={};
   this.cup=0;
   this.round=0;
   this.schoolTitles=0;
   this.schoolResults=[];
   this.schoolTryouts=[];
   this.schoolTryoutFor=null;
   this.choiceHistory=[];
   this.shortIntro=false;
   this.league=null;
   this.farmLeague=null;
   this.apbc=null;
   this.apbcPrior=null;
   this.apbcInvite=false;
   this.awards=[];
   this.firstTeam=D.blank();
   this.postseason=D.blank();
   this.international=D.blank();
   this.contractEnd=0;
   this.oldFixture=null;
   this.preferredRole='rotation';
   this.fatigue=0;
   this.morale=50;
   this.manualRunning=true;
   this.skills={...STYLES[style].skills};
   this.recent=[];
   this.history=[];
   this.schoolStats=D.blank();
   this.proStats=D.blank();
   this.season=D.blank();
   this.seasons=[];
   this.draft=null;
   this.offers=[];
   this.preparation=null;
   this.currentGame=null;
   this.last=null;
   Life.initialize(this);
  }
  static restore(data){
   if(![1,2,3].includes(data?.version)||!validName(data.name)||!Object.hasOwn(STYLES,data.style)||
    !SCHOOLS.includes(data.school)||!['L','R'].includes(data.hand)||
    !['school','draft','pro','offseason','apbc','academy','overseas','overseas-result','retired'].includes(data.stage)||
    !['recent','seasons','history','offers'].every(k=>Array.isArray(data[k]))||
    !['skills','season','schoolStats','proStats'].every(k=>data[k]&&typeof data[k]==='object'))return null;
   const c=Object.assign(new this(data.name,data.school,data.style,data.hand),data,{version:3});
   c.morale=clamp(Number.isFinite(c.morale)?c.morale:50,0,100);
   // Read the stored value itself, not the (new) constructor default:
   // saves written before v109 keep exactly the mode they recorded.
   c.manualRunning=data.manualRunning===true;
   for(const key of ['schoolStats','proStats','season','firstTeam','postseason','international']){
    const stats=c[key];
    c[key]={...D.blank(),...stats,tb:stats.tb??(stats.h||0)+(stats.hr||0)*3,earned:stats.earned??stats.allowed??0};
   }
   if(data.version===1){
    for(const key of Object.keys(c.skills))c.xp[key]=Math.min(90,(data.points||0)*5);
    delete c.points;
    c.contractEnd=c.proYear;
    c.preparation=c.preparation==='休養'?'休養':null;
    c.seed='legacy/'+c.school+'/'+c.name+'/'+c.style;
    if(c.stage==='school'){
     c.cup=c.gameNumber<2||c.schoolYear===3?0:1;
     c.round=c.gameNumber%2;
    }
    if(c.currentGame)c.oldFixture=c.currentGame.state?.career?.fixtureId||null;
    if(c.stage==='draft'&&c.draft)c.draft={...c.draft,offers:[{...c.draft}]};
   }else{
    c.league=NightPennant.restore(data.league);
    c.farmLeague=NightPennant.restore(data.farmLeague);
    c.apbc=NightAPBCTournament.restore(data.apbc);
    if(c.stage==='apbc'&&!c.apbc)c.stage='offseason';
   }
   if(data.version<3){
    c.age=c.clubId?18+c.proYear-1:14+c.schoolYear;
    c.careerId=c.seed;
    if(c.stage==='draft'&&c.draft){
     const {offers,...decision}=c.draft;
     c.draft=decision;
    }
    if(c.stage==='offseason')c.wallet=Math.max(c.wallet,Math.round(c.pay*.65));
    if(c.clubId){
     c.levelGames=c.recent.length;
     c.duel.clubId=NightTeams.all[Math.floor(Life.rng(c,'rival-legacy')()*6)].id;
     Life.roster(c);
    }
   }
   if(c.academy?.path==='大学'&&!c.academy.universityYear){
    const paths=c.milestones.map(entry=>entry.text.match(/(大学|社会人)で(?:ドラフト)?再挑戦$/)?.[1]).filter(Boolean);
    let years=0;
    while(paths.pop()==='大学')years++;
    if(years||c.academyAttempts===1)c.academy.universityYear=Math.min(4,years||1);
   }
   return c;
  }
  save(){
   window.NightCareerExtras?.life(this);
   return {...this,apbc:this.apbc?.snapshot()||null};
  }
  get condition(){
   return clamp(Math.round((this.morale-50)/23+(20-this.fatigue)/52)-Number(this.injury>0),-2,2);
  }
  adjustMorale(amount){this.morale=clamp(this.morale+amount,0,100);}
  suggestedActivity(){return this.fatigue>=55||this.injury||this.condition<0?'rest':this.weakness>=2?'video':'safe';}
  get profile(){return STYLES[this.style];}
  get pitching(){return this.profile.pos==='P';}
  get twoWay(){return this.style==='twoway';}
  get evaluation(){
   const ratings=this.stage==='school'||this.stage==='draft'?this.recent:this.recent.slice(-4);
   return ratings.length?Math.round(ratings.reduce((sum,n)=>sum+n,0)/ratings.length):null;
  }
  get title(){
   if(this.stage==='academy')return this.academy.path+' · ドラフト再挑戦';
   if(this.stage==='overseas'||this.stage==='overseas-result')return this.abroad.phase==='trial'?'海外キャンプ':'海外リーグ';
   if(this.stage==='retired')return '引退';
   if(this.stage==='school'||this.stage==='draft')return '高校'+this.schoolYear+'年';
   return LEVELS[this.level];
  }
  get numberOfGames(){return this.league?.totalGames??10;}
  get drills(){return this.twoWay?{...D.drills(true),...D.drills(false)}:D.drills(this.pitching);}
  get role(){
   if(['school','apbc','academy'].includes(this.stage))return this.pitching?'rotation':'starter';
   return baseRoles[this.level]||(this.level==='regular'?(this.pitching?this.preferredRole:'starter'):
    this.pitching?((this.evaluation??0)>=54?'fireman':'mop'):this.skills.field>=66&&this.gameNumber%2===0?'defense':'pinch');
  }
  get rival(){
   if(this.stage!=='pro'||!['bench','regular'].includes(this.level))return null;
   const club=NightTeams.get(this.clubId),s=this.position;
   const pool=this.pitching?club.pitchers:club.batters.filter(p=>p.pos===s||p.positions?.includes(s));
   return pool.find(p=>!this.pitching||p.role===(this.preferredRole==='rotation'?'SP':this.preferredRole==='closer'?'CP':'RP'))||pool[0]||club.batters[0];
  }
  get rivalStats(){
   const p=this.rival;
   if(!p)return null;
   const stats=D.blank();
   const games=this.gameNumber;
   for(let i=0;i<games;i++){
    const f={id:'rival-'+this.proYear+'-'+p.id+'-'+i,opportunities:this.pitching?2:4,role:p.role==='CP'?'closer':null};
    add(stats,D.simulate({seed:this.seed,pitching:this.pitching,player:()=>p},f));
   }
   return stats;
  }
  get rivalRating(){
   const p=this.rival;
   if(!p)return 58;
   const talent=this.pitching?(p.control+p.movement+p.stamina)/3:(p.contact+p.power+p.field)/3;
   const season=this.rivalStats;
   const form=season.games?D.evaluate(season,this.pitching).rating:talent;
   return clamp(Math.round(talent*.72+form*.28),53,76);
  }
  get schoolSelection(){
   const threshold=schoolTarget(this.school,this.position);
   const target=threshold&&threshold-(this.extras?.base?.roleTrust||0);
   if(this.stage!=='school'||!target)return null;
   const official=this.schoolResults.filter(r=>r.year===this.schoolYear&&r.played).map(r=>({rating:r.rating,order:r.order}));
   const tryouts=this.schoolTryouts.filter(r=>r.year===this.schoolYear);
   const legacyCount=Math.max(0,this.season.games-official.length);
   const legacy=legacyCount?this.recent.slice(-this.season.games).slice(0,legacyCount):[];
   const recent=[...legacy.map(rating=>({rating,order:-1})),...official,...tryouts].sort((a,b)=>a.order-b.order).slice(-3);
   const games=recent.length,average=games?recent.reduce((sum,row)=>sum+row.rating,0)/games:null;
   return {target,games,average,entry:target-16,called:games>0&&average>=target-16,regular:games>=2&&average>=target};
  }
  get canSchoolTryout(){
   const f=this.stage==='school'?L.schoolFixture(this):null;
   return f&&!this.currentGame&&!this.schoolTryoutFor&&this.injury<2&&this.schoolSelection&&!this.schoolSelection.regular&&
    !this.schoolTryouts.some(r=>r.fixture===f.id);
  }
  startSchoolTryout(){
   if(!this.canSchoolTryout)return false;
   this.schoolTryoutFor=L.schoolFixture(this).id;
   return true;
  }
  battingSlot(f){
   return this.coachOrder?.fixture===f.id?this.coachOrder.slot:f.school?(f.schoolProfile.slot??6):0;
  }
  get fixture(){
   let f=this.stage==='school'?L.schoolFixture(this):this.stage==='pro'?L.proFixture(this):this.stage==='apbc'?L.apbcFixture(this):
    this.stage==='academy'?this.academyFixture():this.stage==='overseas'?this.overseasFixture():null;
   if(!f)return null;
   const rehab=f.type==='pro'&&this.extras?.base?.rehabFor===f.id;
   const tryout=f.school&&this.schoolTryoutFor===f.id;
   if(tryout)f={...f,id:f.id+'/tryout',type:'school-tryout',park:NightPlayers.schoolPark(this.round,NightCareer.schools.indexOf(this.school),true),opponentName:'校内選抜',gameName:'紅白戦・出場選考',important:false};
   const pitching=this.pitching,gotCallup=f.type==='playoffs'&&baseRoles[this.level];
   const guestStart=f.type==='pro'&&this.level==='bench'&&this.rosterNews?.adjust<0&&carriesForm(this.recent)&&this.gameNumber%3===0;
   const selection=tryout?null:this.schoolSelection;
   const saved=this.currentGame?.state?.career;
   const role=saved?.role||(rehab?'farm':selection&&!selection.regular?(selection.called||saved?(pitching?'school-relief':'pinch'):'inactive'):
    this.stage==='school'&&pitching&&this.extras?.base?.goals?.role?.id==='setup'&&!tryout?'school-relief':
    guestStart?(pitching?'rotation':'starter'):gotCallup?(pitching?'mop':'pinch'):f.type==='overseas'?(pitching?'mop':'starter'):this.role);
   const chances=pitching?(role==='rotation'&&f.school?[1,1,2,2,3]:PITCH_CHANCES[role]):BAT_CHANCES[role];
   const roll=L.random(this.seed+'/'+f.id+'/appearances')();
   const opportunities=chances?.[Math.floor(roll*chances.length)]??0;
   const legacy=this.oldFixture&&this.currentGame?.state?.career;
   return {...f,id:legacy?this.oldFixture:f.id,opponent:legacy?this.currentGame.state.teams.away.id:f.opponent,role,pitching,
    gameName:legacy?legacy.label:rehab?'二軍公式戦・実戦調整':f.gameName,rehab,
    firstTeam:!rehab&&(f.type==='playoffs'||f.type==='pro'&&['bench','regular'].includes(this.level)),
    opportunities:saved?.opportunities??opportunities,teamTraining:(window.NightCareerExtras?.teamTraining(this)||0)*.11,
    startInning:({mop:5,fireman:7,setup:8,closer:9,'school-relief':6})[role]||1,
    fireman:role==='fireman',fielding:!pitching&&this.position!=='DH'&&['starter','farm','defense'].includes(role),legacy:!!legacy};
  }
  get promotion(){
   if(this.stage!=='pro')return null;
   const [label,games,target,minimum]={
    trainee:['支配下登録',3,47,4],
    farm:['一軍昇格',4,59,5],
    bench:['レギュラー定着',4,Math.max(64,this.rivalRating-3+(this.rosterNews?.adjust||0)+(Life.club(this)?.[4]||0)),5],
    regular:['レギュラー維持',4,42,4]
   }[this.level];
   const ratings=this.recent.slice(-games);
   const average=ratings.length?ratings.reduce((sum,n)=>sum+n,0)/ratings.length:null;
   return {label,games,target:target-(this.extras?.base?.roleTrust||0),average,played:ratings.length,minimum,appearances:this.levelGames};
  }
  player(){
   const stats=Object.fromEntries(Object.entries(this.skills).map(([key,value])=>[
    key,Math.max(key==='velocity'?115:20,value-Math.floor(this.fatigue/(key==='velocity'?18:12))-(key===(this.pitching?'control':'contact')?Math.max(0,(this.extras?.base?.slump||0)-1)*2:0))
   ]));
   const common={id:ID,name:this.name,no:18,pos:this.position,hand:this.hand,trait:this.profile.trait,careerForm:this.form,gameCondition:this.condition,careerPerks:{...this.perks},careerWeakness:this.weakness,...Life.effective(this,stats)};
   return this.pitching?{...common,role:this.preferredRole==='rotation'?'SP':this.preferredRole==='closer'?'CP':'RP',pitches:this.pitches.slice()}:
    {...common,positions:this.positions.slice(),careerVsLeft:this.leftTraining};
  }
  gameOptions(format='quick',allowInactive=false){
   const base=this.fixture;
   if(!base||base.role==='inactive'&&!allowInactive)return null;
   const f=this.configureFixture(base,format);
   const ongoing=this.currentGame?.state,legacy=ongoing?.career&&!ongoing.career.continuous?ongoing:null;
   const userHome=legacy?true:f.ownHome!==false;
   const home=base.type==='apbc'?NightAPBCTournament.club(base.own):Life.foreignClub(base.own)||NightTeams.get(base.own);
   const away=base.type==='apbc'?NightAPBCTournament.club(base.opponent):Life.foreignClub(base.opponent)||NightTeams.get(base.opponent);
   const p=this.player();
   const scale=f.type==='school-tryout'?0:f.school?this.schoolYear-1+Math.max(0,this.round-1)*2+(f.strongOpponent?2:0):this.level==='trainee'?2:this.level==='farm'?3:6;
   const minor=f.school||f.type==='academy'||f.type==='pro'&&['trainee','farm'].includes(this.level);
   const batters=away.batters.map((b,i)=>minor?{...b,id:'career-opp-b'+i,name:f.school?'打者 '+(i+1):b.name,
    matchupEvidence:null,contact:Math.max(44,b.contact-14+scale*2),power:Math.max(42,b.power-17+scale*2),
    run:Math.max(46,b.run-9+scale),field:Math.max(37,b.field-10+scale)}:b);
   const pitchers=away.pitchers.map((q,i)=>minor?{...q,id:'career-opp-p'+i,name:f.school?'先発・'+f.opponentName:q.name,
    velocity:Math.max(125,q.velocity-17+scale*3),movement:Math.max(42,q.movement-23+scale*3),
    control:Math.max(42,q.control-18+scale*3),pitchDetails:null,velocityEvidence:null,
    pitches:f.school&&this.schoolYear===1?['fast','slider','change']:q.pitches}:q);
   const customHome=f.school?this.school:f.type==='academy'?this.academy.path:f.type==='overseas'?Life.foreign[this.abroad.id].name:null;
   const schoolBoost=f.school?(f.schoolProfile.attack||0):0,schoolGloves=f.school?(f.schoolProfile.defense||0):0;
   const homeBatters=f.school?home.batters.map(b=>({...b,matchupEvidence:null,
    contact:clamp(b.contact-15+schoolBoost*7+scale,28,87),power:clamp(b.power-17+schoolBoost*5+scale,24,86),
    field:clamp(b.field-10+schoolGloves*6,30,92),run:clamp(b.run-7,38,88)})):home.batters;
   const homePitchers=f.school?home.pitchers.map(q=>({...q,pitchDetails:null,velocityEvidence:null,
    velocity:clamp(q.velocity-16+schoolGloves*3+scale,119,153),
    control:clamp(q.control-15+schoolGloves*6+scale,31,89),movement:clamp(q.movement-18+schoolGloves*6+scale,29,89)})):home.pitchers;
   const newHome={...home,name:customHome||home.name,short:customHome||home.short,scoreMark:home.scoreMark||customHome?.slice(0,2)||null,
    batters:this.pitching?(this.twoWay?[{...p,pos:this.batPos||'DH'},...homeBatters]:homeBatters):[p,...homeBatters],pitchers:this.pitching?[p,...homePitchers]:homePitchers};
   const pinching=['pinch','defense'].includes(f.role),slot=this.battingSlot(f);
   if(!this.pitching){
    const starts=legacy||!pinching&&f.role!=='inactive';
    const displaced=starts&&f.type==='overseas'?home.startingFielding[p.pos]:null;
    const order=home.startingOrder.filter(id=>id!==displaced).slice(0,starts?8:9);
    if(starts)order.splice(slot,0,p.id);
    newHome.startingOrder=order;
    newHome.startingFielding=starts?{...home.startingFielding,[p.pos]:p.id}:home.startingFielding;
   }
   if(this.twoWay){
    const order=newHome.startingOrder.filter(id=>id!==p.id).slice(0,8);
    order.splice(Math.min(slot,order.length),0,p.id);
    newHome.startingOrder=order;
    if(this.batPos&&this.batPos!=='DH')newHome.startingFielding={...newHome.startingFielding,[this.batPos]:p.id};
   }
   const duel=(f.school&&f.opponentName===this.duel.school)||(f.type==='pro'||f.type==='playoffs')&&this.duel.clubId===f.opponent;
   const teammate=(f.type==='pro'||f.type==='playoffs')&&this.duel.clubId===this.clubId;
   const starter=legacy?.awayPitcherIndex??f.index%Math.min(away.pitchers.length,5);
   const makeRival=(player)=>({...player,id:this.duel.id,name:this.duel.name,
    ...(player.pos==='P'?{velocity:Math.max(player.velocity,f.school?132+scale:144)}:
      {contact:Math.max(player.contact,f.school?58+scale:73)})});
   if(duel){
    if(this.pitching)batters[0]=makeRival(batters[0]);
    else pitchers[starter]=makeRival(pitchers[starter]);
   }
   if(teammate){
    if(this.pitching)newHome.batters=[makeRival(homeBatters[0]),...homeBatters.slice(1)];
    else newHome.pitchers=[makeRival(homePitchers[0]),...homePitchers.slice(1)];
    if(this.pitching)newHome.startingOrder=[this.duel.id,...home.startingOrder.filter(id=>id!==home.batters[0].id)].slice(0,9);
   }
   const newAway={...away,name:f.opponentName,short:f.opponentName,scoreMark:away.scoreMark||(customHome?f.opponentName.slice(0,2):null),batters,pitchers,
    startingOrder:minor||duel&&this.pitching?batters.slice(0,9).map(b=>b.id):away.startingOrder,
    startingFielding:minor?{}:away.startingFielding};
   return {
    career:{fixtureId:f.id,playerId:ID,pitching:this.pitching,opportunities:f.opportunities,label:f.gameName,format,
     role:f.role,startInning:f.startInning,fireman:f.fireman,scoringBetweenAppearances:true,
     continuous:!legacy,simulatedPlates:0,slot,pinching,entryInning:pinching?6:f.startInning||1,
     pitchActive:false,reservePitcher:this.pitching?1:0,trainingGoal:this.eventGoal?.fixture===f.id?this.eventGoal.id:null,
     teamSeed:this.seed,weakSchool:f.school&&f.type==='school'&&f.schoolProfile.weak===true,
     teamAttack:(f.schoolProfile?.attack||0)+(window.NightCareerExtras?.teamTraining(this)||0)*.11,teamDefense:f.schoolProfile?.defense||0,
     difficulty:this.difficulty,opponentPlan:this.tendencies[f.opponent]||{},scouted:this.scoutReport?.fixture===f.id,
     rivalId:duel?this.duel.id:null,
     scenarios:Array.from({length:f.opportunities},(_,i)=>D.situation(f,i,this.seed)),completed:0},
    clubs:userHome?{home:newHome,away:newAway}:{home:newAway,away:newHome},
    userHome,homeTeamId:userHome?home.id:away.id,awayTeamId:userHome?away.id:home.id,park:f.park||(base.type==='apbc'?'tokyo-dome':f.ownHome===false?away.park:home.park),
    manualRunning:this.manualRunning&&!this.pitching,
    innings:9,order:newHome.startingOrder,practiceBatter:ID,pitcher:this.pitching&&!legacy?1:0,fielding:newHome.startingFielding,opponentPitcher:starter
   };
  }
  configureFixture(f,format){
   if(this.currentGame||f.legacy)return f;
   if(format!=='extended'||!f.important)return {...f,startInning:Math.min(f.startInning,10-f.opportunities)};
   const opportunities=Math.min(this.pitching?5:6,f.opportunities+2);
   return {...f,opportunities,startInning:Math.min(f.startInning,10-opportunities)};
  }
  xpCost(key){return this.skills[key]>(key==='velocity'?148:80)?125:100;}
  plans(key){
   if(key==='pitch')return NightGame.TYPES.filter(p=>!this.pitches.includes(p.id)&&this.pitches.length<5).map(p=>[p.id,p.name]);
   if(key==='position')return POSITIONS.filter(pos=>!this.positions.includes(pos)&&this.positions.length<3).map(pos=>[pos,POSITION_NAMES[pos]]);
   if(key==='left'&&this.leftTraining<3)return [['left','対左投手対策']];
   return [];
  }
  setPlan(key,target){
   if(this.goal)this.specialProgress[this.plan+'|'+this.goal.target]=this.goal.progress;
   if(this.currentGame||!this.fixture||!Object.hasOwn(this.drills,key))return false;
   const drill=this.drills[key];
   if(drill.special){
    const choice=this.plans(key).find(([id])=>id===target);
    if(!choice)return false;
    if(this.plan===key&&this.goal?.target===target)return true;
    this.goal={target,label:choice[1],progress:this.specialProgress[key+'|'+target]||0};
   }else this.goal=null;
   this.plan=key;
   return true;
  }
  deployAs(role){
   if(this.currentGame||!this.fixture||!this.pitching||!['rotation','setup','closer'].includes(role))return false;
   this.preferredRole=role;
   return true;
  }
  setPosition(pos){
   if(this.twoWay&&POSITIONS.includes(pos)){this.batPos=pos;if(!this.positions.includes(pos)&&this.positions.length<3)this.positions.push(pos);return true;}
   if(this.currentGame||!this.fixture||!this.positions.includes(pos))return false;
   this.position=pos;
   return true;
  }
  rest(){
   if(!this.fixture||this.currentGame||this.preparation||!this.fatigue)return false;
   this.fatigue=Math.max(0,this.fatigue-29);
   this.adjustMorale(12);
   this.preparation='休養';
   return true;
  }
  academyFixture(){
   const f=L.schoolFixture(this),i=this.academy.played;
   return {...f,id:'academy-'+this.academyAttempts+'-'+i,school:false,schoolProfile:null,index:i+2,
    gameName:this.academy.path+'・ドラフト選考試合 第'+(i+1)+'戦',type:'academy',important:i===2,
    opponentName:['選抜アカデミー','東部クラブ選抜','台北選抜'][i]};
  }
  overseasFixture(){
   const a=this.abroad,market=Life.foreign[a.id],i=a.played;
   const next=Life.foreignSchedule(a)[i];
   if(!next)return null;
   return {id:'overseas-'+this.proYear+'-'+a.id+'-'+a.phase+'-'+i,own:'career-foreign-'+a.id+'-0',opponent:next.club.id,
    type:'overseas',index:i+5,opponentName:next.club.name,park:market.park,
    gameName:a.phase==='trial'?'海外キャンプ・選考試合':'海外リーグ公式戦',important:i>=2};
  }
  selectActivity(id){return Life.train(this,id);}
  setForm(id){return Life.useForm(this,id);}
  setDifficulty(level){
   if(this.currentGame||!['challenging','expert','relaxed'].includes(level))return false;
   this.difficulty=level;
   return true;
  }
  chooseCamp(id){return Life.camp(this,id);}
  missGame(){
   const fixture=this.fixture;
   if(!fixture||!this.injury||this.currentGame)return false;
   return this.simulateFixture(fixture,'故障で欠場');
  }
  skip(){
   const f=this.fixture;
   if(!f||this.currentGame)return false;
   if(this.injury>=2)return this.missGame();
   return this.simulateFixture(f,f.role==='inactive'?'メンバー外':null);
  }
  simulateFixture(f,absence){
   const options=this.gameOptions('quick',true);
   if(!options)return false;
   if(absence){
    options.career.role='inactive';
    const own=options.clubs[options.userHome?'home':'away'];
    const idx=own.startingOrder.indexOf(ID);
    if(idx>=0){
     const replacement=own.batters.find(p=>p.id!==ID&&!own.startingOrder.includes(p.id));
     own.startingOrder=own.startingOrder.map(id=>id===ID?replacement.id:id);
     options.order=own.startingOrder;
    }
   }
   const game=new NightGame(this.pitching?'career-pitch':'career-bat','standard',()=>{},options);
   game.advanceCareer(true);
   return this.complete(game,false,absence);
  }
  complete(game,manual=true,absence=null){
   const base=this.fixture;
   if(!base||game.phase!=='ended'||game.career?.fixtureId!==base.id)return false;
   const f=this.configureFixture(base,game.career.format);
   if(!game.career.simulationFinal&&game.career.completed!==f.opportunities)return false;
   const stat=D.blank(),bat=game.box[ID]||{},pitch=game.pitchingStats[ID]||{};
   stat.games=absence?0:1;
   for(const key of ['pa','ab','h','hr','rbi','bb','k'])stat[key]=number(bat[key]);
   stat.tb=stat.h+number(bat.doubles)+number(bat.triples)*2+stat.hr*3;
   if(this.pitching)Object.assign(stat,{outs:number(pitch.outs),k:number(pitch.k),allowed:game.career.continuous?number(pitch.runs):number(game.session?.allowed??pitch.runs)||number(pitch.runs),walks:number(pitch.bb),
    earned:number(pitch.earned??pitch.runs),saves:f.role==='closer'&&game.userScore>game.opponentScore&&pitch.outs>=3&&(!game.career.continuous||game.career.saveEligible&&game.homePitcherIndex===0)?1:0});
   if(game.career.fieldStats)Object.assign(stat,game.career.fieldStats);
   if(game.career.fieldResult){
    stat.fieldChances=1;
    stat.fieldOuts=game.career.fieldResult.out?1:0;
    stat.errors=1-stat.fieldOuts;
   }
   const useScore=(f.firstTeam||f.school||['apbc','pro','academy','overseas'].includes(f.type))&&(game.career.scoringBetweenAppearances||game.inning>=9);
   const full=game.career.simulationFinal;
   const partial=useScore||full?{own:game.userScore,opp:game.opponentScore,inning:game.inning,outs:game.outs,half:game.half,
    homeLine:game[game.userSide],awayLine:game[game.opponentSide],actualHome:game.userHome,completedGame:full,
    rally:game.career.pendingRally||0,teammateHits:game.career.teammateHits||0}:null;
   return this.record(f,stat,manual,partial,{absence,metrics:game.career.metrics,rival:game.career.rivalStats,atBats:game.career.atBats});
  }
  record(f,stat,manual,partial=null,info={}){
   if(f.type==='school-tryout'){
    const {rating,reasons}=D.evaluate(stat,this.pitching),score=L.teamScore(this,f,stat,partial);
    if(stat.games)this.fatigue=clamp(this.fatigue+(this.pitching?5:3),0,100);
    const gains=stat.games?D.addExperience(this,stat,manual):{};
    const fixture=this.schoolTryoutFor;
    this.currentGame=null;this.schoolTryoutFor=null;
    if(stat.games)this.schoolTryouts.push({fixture,year:this.schoolYear,rating,order:this.schoolResults.length*2});
    const events=[...(window.NightCareerExtras?.onGame(this,f,stat,rating)||[]),...(window.NightCareerExtras?.trainingReport(this,f,info.metrics)||[])];
    const selection=this.schoolSelection;
    this.last={rating,reasons,gains,stat,score,label:f.gameName,opponent:f.opponentName,team:this.school,events,
     status:selection.regular?'次の公式戦は'+(this.pitching?'先発':'スタメン'):
      selection.called?'次の公式戦でベンチ入り':'次の公式戦はメンバー外',absence:stat.games?null:'故障で欠場'};
    return true;
   }
   const previousLevel=this.level;
   const positive=info.atBats?.filter(atBat=>atBat.moment).sort((a,b)=>b.runs-a.runs)[0];
   const highlight=positive?`${positive.inning}回${positive.half==='top'?'表':'裏'}に${positive.moment}`:
    this.pitching&&stat.outs&&stat.allowed===0?(info.metrics?.withRunners?'走者を背負って奪三振・無失点':stat.k?`${stat.k}奪三振・無失点`:'無失点で登板を終えた'):null;
   if(!partial?.completedGame)D.simulateFielding(this,f,stat);
   let {rating,reasons}=D.evaluate(stat,this.pitching);const score=L.teamScore(this,f,stat,partial);
   if(this.twoWay&&stat.pa){const batEval=D.evaluate(stat,false);rating=Math.round((rating+batEval.rating)/2);reasons=[...reasons,...batEval.reasons];}
   if(!score.won)stat.saves=0;
   const gains=stat.games?D.addExperience(this,stat,manual):{};
   if(stat.games)this.fatigue=clamp(this.fatigue+(this.pitching?5+f.opportunities*2:3)+(!this.preparation?2:0),0,100);
   this.currentGame=null;this.preparation=null;this.oldFixture=null;
   const round=f.school?{year:this.schoolYear,season:this.cup===0?'夏':'秋',round:this.round}:null;
   this.last={rating,reasons,gains,stat,score,label:f.gameName,opponent:f.opponentName,status:null,round,
    highlight,absence:stat.games?null:info.absence||'故障で欠場',
    team:f.school?this.school:f.type==='academy'?this.academy.path:f.type==='overseas'?Life.foreign[this.abroad.id].name:NightTeams.get(f.own).name,
    competition:f.type==='pro'?f.firstTeam?'一軍':'二軍・育成':null};
   this.last.events=info.absence?['監督：紅白戦の結果で次戦の起用を判断します']:Life.postGame(this,f,stat,manual,info);
   this.last.events.push(...(window.NightCareerExtras?.onGame(this,f,stat,rating)||[]),...(window.NightCareerExtras?.trainingReport(this,f,info.metrics)||[]));
   this.last.events.push(...Life.rivalSeason(this,f,rating));
   if(f.type==='academy'){
    add(this.academy.stat,stat);
    if(stat.games)this.academy.ratings.push(rating);
    if(++this.academy.played>=3){
     this.stage='draft';this.draft=this.draftResult();
     this.last.status='再挑戦のドラフト結果が発表されました';
    }
    return true;
   }
   if(f.type==='overseas'){
    (this.abroad.results||=[]).push({opponent:f.opponentName,...score});
    add(this.abroad.stat,stat);
    if(stat.games)this.abroad.ratings.push(rating);
    const limit=Life.foreignSchedule(this.abroad).length;
    if(++this.abroad.played>=limit){
     const ratings=this.abroad.ratings;
     this.abroad.passed=this.abroad.phase==='trial'&&ratings.length>=2&&ratings.reduce((sum,n)=>sum+n,0)/ratings.length>=Life.foreign[this.abroad.id].difficulty;
     this.stage='overseas-result';
     this.last.status=this.abroad.phase==='season'?'海外リーグのシーズン終了':this.abroad.passed?'海外球団から契約の提示':'海外キャンプの選考を通過できず';
     Life.note(this,this.last.status);
    }
    return true;
   }
   if(f.type==='apbc'){
    add(this.international,stat);L.advanceAPBC(this,f,score);
    if(this.apbc.place){
     this.apbcPrior={year:this.proYear,place:this.apbc.place};
     this.last.status='APBC '+this.apbc.place+'位';
     if(this.apbc.place===1)this.awards.push({year:this.proYear,label:'APBC優勝'});
     this.overseasInvite=this.international.games>=3&&D.evaluate(this.international,this.pitching).rating>=58;
     Life.note(this,this.last.status);
     this.stage='offseason';
    }
    return true;
   }
   if(stat.games)this.recent.push(rating);
   if(!f.school){
    if(f.type==='playoffs')add(this.postseason,stat);
    else{
     add(this.season,stat);
     if(f.firstTeam)add(this.firstTeam,stat);
     else this.farmScorecard.push({opponent:f.opponentName,...score});
    }
    const oldGames=this.proStats.games,oldHits=this.proStats.h,oldK=this.proStats.k;
    if(!oldGames&&stat.games)Life.note(this,'プロ初出場');
    if(f.firstTeam&&!this.firstTeamDebut&&stat.games){this.firstTeamDebut=true;Life.note(this,'一軍初出場');}
    if(!oldHits&&stat.h)Life.note(this,'プロ初安打');
    if(!oldK&&stat.k)Life.note(this,'プロ初奪三振');
    if(f.firstTeam&&!this.firstTeamHit&&stat.h){this.firstTeamHit=true;Life.note(this,'一軍初安打');}
    add(this.proStats,stat);
    if(f.type==='pro'){
     this.gameNumber++;
     if(!f.rehab){this.levelGames+=stat.games;this.updateLevel();}
    }
    const seasonOver=L.advanceLeague(this,f,score);
    const row=(f.firstTeam?this.league:this.farmLeague).standings().find(r=>r.id===this.clubId);
    this.last.table={rank:row.rank,behind:row.behind,wins:row.wins,losses:row.losses};
    if(f.type==='playoffs'&&this.league.postseason?.champion===this.clubId)this.last.status='台湾シリーズ優勝';
    if(!seasonOver&&f.type==='pro'&&this.gameNumber%3===0&&!this.last.status){
     const next=this.fixture;
     if(next)this.last.next='監督の次カード予定：'+ROLES[next.role];
    }
    if(seasonOver)this.finishSeason();
    if(!seasonOver&&previousLevel!==this.level&&this.fixture)this.last.next='次戦は'+ROLES[this.fixture.role];
    return true;
   }
   add(this.season,stat);add(this.schoolStats,stat);this.gameNumber++;
   this.schoolResults.push({year:this.schoolYear,cup:this.cup,round:this.round,label:f.gameName,opponent:f.opponentName,
    played:!!stat.games,rating,quality:f.scoutQuality,order:this.schoolResults.length*2+1,...score});
   if(score.won&&this.round<3){
    this.round++;
    this.last.status=this.round===2?'全国大会出場決定':L.rounds[this.round]+'進出';
    this.addSchoolRoleChange(f);
    return true;
   }
   if(score.won){this.schoolTitles++;this.last.status='全国大会優勝';}
   else this.last.status=(this.cup===0?'夏':'秋')+'大会 '+(this.round===0?'初戦敗退（'+L.rounds[0]+'）':L.rounds[this.round]+'で敗退');
   Life.note(this,this.last.status);
   if(this.schoolYear===3)Life.note(this,'高校最後の試合 '+score.own+'–'+score.opp+' '+(score.won?'勝利':'敗戦'));
   this.round=0;
   if(this.cup===0&&this.schoolYear<3){this.cup=1;this.last.next='次は秋大会';this.addSchoolRoleChange(f);return true;}
   this.seasons.push({title:this.title,team:this.school,stat:this.season});
   if(this.schoolYear<3){this.schoolYear++;this.age++;this.cup=0;this.season=D.blank();this.gameNumber=0;this.fatigue=0;}
   else{this.age=Math.max(18,this.age+1);this.stage='draft';this.draft=this.draftResult();this.last.next='次はドラフト会議';}
   this.addSchoolRoleChange(f);
   return true;
  }
  addSchoolRoleChange(previous){
   const next=this.stage==='school'?this.fixture:null;
   if(next&&previous.role!==next.role)this.last.next=[this.last.next,'次戦は'+ROLES[next.role]].filter(Boolean).join(' ／ ');
  }
  get scoutExposure(){
   return Math.min(8,this.schoolResults.reduce((n,r)=>n+(r.played&&r.rating>=55?(r.quality||0)*(r.rating>=70?1:.55):0),0));
  }
  scout(){return D.scout(this);}
  draftResult(){
   const retry=this.academy?.ratings||[];
   const retryRating=retry.length?retry.reduce((sum,n)=>sum+n,0)/retry.length:0;
   const rating=clamp(Math.round(Math.max(this.evaluation??0,retryRating*.88+(this.evaluation??0)*.12)+this.scoutExposure),0,100);
   const brackets=[[79,360],[69,270],[57,200],[46,145],[36,100],[0,45]];
   const rank=brackets.findIndex(([min])=>rating>=min),level=rank===5?'trainee':'farm';
   const rng=Life.rng(this,'draft/'+this.academyAttempts);
   const treated=rank<5||rating>=23||rng()<.43+Math.min(.42,this.academyAttempts*.14);
   const interested=this.scout().map(s=>({...s,bid:s.score+rng()*15})).sort((a,b)=>b.bid-a.bid);
   const {clubId,need,score}=interested[0];
   return {rating,round:rank===5?(treated?'指名なし・練習生の打診':'指名なし'):'ドラフト'+(rank+1)+'位',
    level,clubId:treated?clubId:null,need,score,pay:brackets[rank][1],years:rank<2?2:1};
  }
  declineDraft(path){
   if(this.stage!=='draft'||!['大学','社会人'].includes(path))return false;
   Life.note(this,this.draft.clubId?'入団を見送り、'+path+'で再挑戦':path+'でドラフト再挑戦');
   this.academyAttempts++;
   let universityYear=null;
   if(path==='大学'){
    const previous=this.academy;
    if(previous?.path!=='大学')universityYear=1;
    else if(previous.universityYear)universityYear=Math.min(4,previous.universityYear+1);
   }
   this.academy={path,universityYear,played:0,ratings:[],stat:D.blank()};
   this.age++;
   this.fatigue=0;
   this.injury=0;
   Life.grow(this,path==='大学'?(this.pitching?'control':'contact'):(this.pitching?'stamina':'power'),45);
   this.stage='academy';
   return true;
  }
  signDraft(index=0){
   if(this.stage!=='draft'||index!==0||!this.draft.clubId)return false;
   const d=this.draft;
   this.clubId=d.clubId;this.level=d.level;this.pay=d.pay;this.contractEnd=d.years||1;
   const clubs=NightTeams.all;
   const rng=Life.rng(this,'rival-draft');
   this.duel.clubId=rng()<.26?this.clubId:clubs[Math.floor(rng()*clubs.length)].id;
   this.stage='pro';this.season=D.blank();this.gameNumber=0;this.recent=[];this.fatigue=0;this.levelGames=0;
   this.history.push({year:1,text:d.round+' · '+NightTeams.get(d.clubId).name+' · '+money(d.pay)});
   Life.note(this,d.round+'で'+NightTeams.get(d.clubId).name+'に入団');
   Life.note(this,this.duel.name+'は'+NightTeams.get(this.duel.clubId).name+'に入団');
   Life.roster(this);
   return true;
  }
  goOverseas(id){
   if(this.stage!=='offseason'||!this.overseasInvite||this.abroad||!Object.hasOwn(Life.foreign,id))return false;
   this.overseasInvite=false;this.apbcInvite=false;
   this.abroad={id,phase:'trial',played:0,ratings:[],stat:D.blank(),results:[],passed:null};
   this.stage='overseas';
   this.fatigue=Math.max(0,this.fatigue-38);
   Life.note(this,Life.foreign[id].name+'のキャンプへ');
   return true;
  }
  signOverseas(){
   const a=this.abroad;
   if(this.stage!=='overseas-result'||a.phase!=='trial'||!a.passed)return false;
   this.abroadHistory.push({name:Life.foreign[a.id].name,label:'キャンプ通過',stat:a.stat});
   this.abroad={...a,phase:'season',played:0,stat:D.blank(),ratings:[],results:[]};
   this.stage='overseas';this.fatigue=0;
   Life.note(this,Life.foreign[a.id].name+'と1年契約');
   return true;
  }
  returnHome(){
   if(this.stage!=='overseas-result')return false;
   const a=this.abroad,name=Life.foreign[a.id].name;
   this.abroadHistory.push({name,label:a.phase==='season'?'海外シーズン終了':a.passed?'契約を辞退':'選考落ち',stat:a.stat});
   if(a.phase==='season'){
    this.age++;this.wallet+=160;
    this.pay=Math.round(this.pay*.9);
    for(const o of this.offers)o.pay=Math.max(45,Math.round(o.pay*.9));
   }
   this.stage='offseason';
   Life.note(this,'台湾球界に復帰するため帰国');
   return true;
  }
  get canRetire(){return this.stage==='offseason'&&(this.proYear>=8||this.age>=30);}
  retire(){
   if(!this.canRetire)return false;
   this.stage='retired';
   Life.note(this,'現役引退');
   return true;
  }
  updateLevel(){
   const from=this.level,{played,games,target,average,minimum}=this.promotion;
   if(played<games)return;
   if(from==='regular'){
    if(average<target)this.level='bench';
   }else if(average>=target&&this.levelGames>=minimum)this.level={trainee:'farm',farm:'bench',bench:'regular'}[from];
   else if(from==='bench'&&average<33)this.level='farm';
   if(from===this.level)return;
   const text={
    'trainee-farm':'支配下登録 · 二軍へ','farm-bench':'一軍へ昇格','bench-regular':'一軍レギュラーに定着',
    'bench-farm':'二軍へ降格','regular-bench':'一軍控えに降格'
   }[from+'-'+this.level];
   if(from==='trainee')this.pay=Math.max(this.pay,85);
   this.last.status=text;this.history.push({year:this.proYear,text});Life.note(this,text);this.recent=[];this.levelGames=0;
  }
  finishSeason(){
   const l=L.league(this),s=this.firstTeam,labels=[];
   const f=l.standings().find(row=>row.id===this.clubId);
   if(l.postseason?.seeds[0]?.clubId===this.clubId)labels.push('レギュラーシーズン1位');
   if(l.postseason?.champion===this.clubId)labels.push('台湾シリーズ優勝');
   const race=this.titleRaces();
   for(const title of race)if(title.qualified&&(title.lower?title.value<title.rival.value:title.value>title.rival.value))labels.push(title.label);
   if(this.proYear===1&&s.games>=3&&D.evaluate(s,this.pitching).rating>=68)labels.push('新人王');
   for(const label of labels){this.awards.push({year:this.proYear,label});Life.note(this,label);}
   this.seasons.push({title:'プロ'+this.proYear+'年目',team:NightTeams.get(this.clubId).name,stat:this.season,
    pay:this.pay,level:this.level,firstTeam:s,postseason:this.postseason,record:f.wins+'勝 '+f.losses+'敗',awards:labels,titleRaces:race});
   this.apbcInvite=this.level==='regular'&&s.games>=3&&D.evaluate(s,this.pitching).rating>=58;
   this.offers=this.makeOffers();
   this.stage='offseason';this.wallet+=Math.round(this.pay*.65);this.camp=null;this.abroad=null;this.overseasInvite=false;
  }
  titleRaces(){
   const s=this.firstTeam,pitch=this.pitching;
   const defs=pitch?[
    {label:'最優秀防御率',key:'era',value:Number(era(s)),qualified:s.outs>=12,lower:true},
    {label:'最多奪三振',key:'k',value:s.k,qualified:s.outs>=12},
    {label:'最多セーブ',key:'saves',value:s.saves,qualified:s.saves>=2}
   ]:[
    {label:'首位打者',key:'avg',value:s.h/Math.max(1,s.ab),qualified:s.ab>=12},
    {label:'本塁打王',key:'hr',value:s.hr,qualified:s.pa>=12},
    {label:'打点王',key:'rbi',value:s.rbi,qualified:s.pa>=12}
   ];
   const seed=this.seed+'/titles/'+this.proYear;
   return defs.map(def=>{
    const candidates=NightTeams.all.flatMap(club=>{
     const players=pitch?club.pitchers.filter(p=>def.key!=='saves'||p.role==='CP').slice(0,4):club.batters.slice(0,5);
     return players.map(p=>{
      const rng=L.random(seed+'/'+p.id+'/'+def.key);
      const chance=rng();
      const value=({
       avg:()=>.16+p.contact*.0015+chance*.082,
       hr:()=>Math.floor(Math.max(0,p.power-45)*.053+chance*3),
       rbi:()=>Math.floor((p.power+p.contact-110)*.085+chance*5),
       era:()=>1.45+((100-p.control)+(100-p.movement))*.027+chance*2.2,
       k:()=>Math.floor(3+p.movement*.16+chance*10),
       saves:()=>2+Math.floor(chance*4)
      })[def.key]();
      return {name:p.name,clubId:club.id,value};
     });
    });
    const rival=candidates.sort((a,b)=>def.lower?a.value-b.value:b.value-a.value)[0];
    return {...def,value:Number.isFinite(def.value)?def.value:0,rival};
   });
  }
  startAPBC(){
   if(this.stage!=='offseason'||!this.apbcInvite)return false;
   const taipei='apbc-taipei';
   this.apbc=new NightAPBCTournament(taipei,9,NightAPBCTournament.official(taipei));
   this.international=D.blank();this.apbcInvite=false;
   this.stage='apbc';this.fatigue=Math.max(0,this.fatigue-25);
   return true;
  }
  makeOffers(){
   const rating=this.seasonRatings();
   const minimum={trainee:45,farm:85,bench:130,regular:200}[this.level];
   const locked=this.contractEnd>this.proYear;
   const responsibility=this.extras?.base?.goals?.role?.done?10:0;
   const newPay=Math.max(minimum,responsibility+Math.round(this.pay*(rating<38?.76:rating<55?.97:1.08+(rating-55)/120)/5)*5);
   const offers=[{clubId:this.clubId,pay:locked?this.pay:newPay,level:this.level,type:locked?'契約継続':newPay<this.pay?'契約更改・減俸':'契約更改',
    role:this.role,years:locked?this.contractEnd-this.proYear:1,locked}];
   if(!locked&&rating>=65)offers.push({clubId:this.clubId,pay:Math.max(minimum,newPay-15),level:this.level,type:'複数年契約',role:this.role,years:2});
   if(!locked&&rating<31&&this.level==='farm')offers.push({clubId:this.clubId,pay:55,level:'trainee',type:'育成再契約',role:'trainee',years:2});
   if(this.level!=='trainee'&&this.proYear>=2&&rating>=44){
    const other=NightTeams.all.filter(c=>c.id!==this.clubId),fa=!locked&&this.proYear>=3;
    const first=(this.proYear+rating)%other.length;
    const reserve=this.level==='regular'?'bench':this.level;
    const benchRole=this.pitching?'mop':'pinch';
    offers.push({clubId:other[first].id,pay:newPay+35,level:reserve,type:fa?'FA移籍':'トレード打診',
     role:reserve==='bench'?benchRole:baseRoles[reserve],years:fa?2:Math.max(1,this.contractEnd-this.proYear)});
    if(fa&&rating>=57)offers.push({clubId:other[(first+2)%other.length].id,pay:Math.max(minimum,newPay-15),level:this.level,
     type:'FA移籍',role:this.role,years:1});
   }
   return offers;
  }
  seasonRatings(){return D.evaluate(this.season,this.pitching).rating;}
  counterOffer(index){
   if(this.stage!=='offseason'||this.countered||!this.offers[index]||this.offers[index].locked)return null;
   const o=this.offers[index],rating=this.seasonRatings();
   this.countered=true;
   const roleBonus=this.extras?.base?.goals?.role?.done?6:0;
   if(rating+roleBonus<60)return '球団は当初の提示額を維持しました';
   o.pay+=Math.round((rating+roleBonus-45)/5)*5;
   return '条件交渉がまとまり、年俸の提示額が上がりました';
  }
  acceptOffer(index){
   const offer=this.offers[index];
   if(this.stage!=='offseason'||!offer)return false;
   this.history.push({year:this.proYear+1,text:offer.type+' · '+NightTeams.get(offer.clubId).name+' · '+money(offer.pay)});
   const review=this.extras?.base?.campReview;
   this.clubId=offer.clubId;this.pay=offer.pay;this.level=offer.level;
   if(review?.year===this.proYear&&review.passed&&this.level==='farm'){
    this.level='bench';Life.note(this,'春季キャンプの選考を通過。一軍帯同で開幕');
   }
   if(this.pitching&&['rotation','setup','closer'].includes(offer.role))this.preferredRole=offer.role;
   this.proYear++;this.age++;this.contractEnd=this.proYear+(offer.years||1)-1;this.gameNumber=0;this.fatigue=0;this.recent=[];
   this.season=D.blank();this.firstTeam=D.blank();this.postseason=D.blank();this.league=null;this.farmLeague=null;this.apbc=null;
   this.apbcInvite=false;this.overseasInvite=false;this.countered=false;this.offers=[];this.stage='pro';
   this.farmScorecard=[];this.levelGames=0;this.weeks={};this.scoutReport=null;
   if(this.duel.clubId&&this.proYear%4===0){
    const next=NightTeams.all.filter(t=>t.id!==this.duel.clubId);
    this.duel.clubId=next[Math.floor(Life.rng(this,'rival-transfer/'+this.proYear)()*next.length)].id;
    Life.note(this,this.duel.name+'が'+NightTeams.get(this.duel.clubId).name+'へ移籍');
   }
   if(!this.duel.clubId)this.duel.clubId=NightTeams.all[Math.floor(Life.rng(this,'rival-legacy')()*6)].id;
   Life.roster(this);
   return true;
  }
 };
})();
