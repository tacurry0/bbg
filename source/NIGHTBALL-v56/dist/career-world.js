/* Player career state. The 2026 clubs are immutable outside this save. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,L=NightCareerWorldLeagues,S=NightCareerWorldSchool,M=NightCareerWorldMatch,I=NightCareerWorldInternational,Z=NightCareerWorldSuccess;
 const {date,stamp,countries,leagueCountries}=D;
 const {clamp,blank,merge}=M;
 const playerId='career-player';
 const ownsSchool=(w,id)=>id===w.player.club||id==='region-player';
 const calendarYear=d=>+d.slice(0,4);
 const formats={full:'フル試合',self:'自分の出番',key:'重要場面',auto:'自動試合'};
 const training={contact:'ミート',power:'長打',run:'走塁',field:'守備',arm:'送球',velocity:'球速',control:'制球',movement:'変化量',stamina:'スタミナ'};
 const startYear=2027;
 const identity=(p,origin)=>{
  const row=window.NightCareerWorldIdentities?.[p.id];
  if(!row||row[0]!==p.name||row[3]!==origin)return {nation:null,registration:'unknown'};
  return {nation:p.nationality||row[1],registration:row[2]};
 };
 const iso=/^\d{4}-\d\d-\d\d$/;
 const compactPlayer=(p,club,country,year,rng)=>({
  id:p.id,name:p.name,no:p.no,hand:p.hand||'R',throwHand:p.throwHand||p.hand||'R',pos:p.pos,
  positions:p.pos==='P'?['P']:[...new Set([p.pos,...(p.positions||[])])],role:p.role||(p.pos==='P'?'RP':null),
  ...Object.fromEntries((p.pos==='P'?M.pitching:M.batting).map(k=>[k,p[k]??55])),
  pitches:p.pos==='P'?p.pitches?.slice()||['fast','slider','change']:null,
  born:p.birthDate&&/^\d{4}/.test(p.birthDate)?+p.birthDate.slice(0,4):year-(22+Math.floor(rng()*14)),
  ...identity(p,country),
  origin:country,club,school:null,real:true,form:0,injury:0,stats:blank(),history:[],growth:Math.floor(rng()*6)
 });
 class NightCareerWorld{
  static key='nightball.career.world';
  static alumniKey='nightball.career.world.ob';
  static formats=formats;
  static training=training;
  static countries=countries;
  constructor({country,name,region,style,position,hand,throwHand,schoolIndex,schoolTier,difficulty,short,growth,seed}){
   const c=countries[country],profile=NightCareer.styles[style];
   if(!c||!profile||!NightCareer.validName(name)||!c.region.includes(region))throw Error('選手設定を確認してください');
   if(!['easy','normal','hard'].includes(difficulty))throw Error('難易度を選択してください');
   this.version=2;
   this.seed=seed||Date.now().toString(36)+Math.random().toString(36).slice(2,10);
   this.country=country;this.region=region;
   const entry=this.random('enrollment/'+country+'/'+region),roll=entry();
   this.schoolTier=schoolTier!==undefined&&schoolTier!==null&&schoolTier!==''&&Number.isInteger(Number(schoolTier))?clamp(Number(schoolTier),0,2):1;
   this.schoolIndex=seed&&Number.isInteger(schoolIndex)?clamp(schoolIndex,0,D.schools[country].length-1):Math.floor(entry()*D.schools[country].length);
   this.school=D.schools[country][this.schoolIndex];
   const talent=this.random('hidden-talent'),t=talent();
   const hiddenGrowth=t<.19?0:t<.59?1:t<.78?2:t<.82?3:t<.94?4:5;
   const r=talent(),tier=r<.10?0:r<.65?1:r<.90?2:r<.99?3:4;
   this.talent={tier,ceiling:Math.min(99,Math.round([72,84,91,96,99][tier]+talent()*8)),durability:.75+talent()*.65,learning:[.8,1,1.12,1.27,1.48][tier]*(.93+talent()*.14)};
   this.balanceRevision=247;
   const initial=this.random('initial-abilities'),bonus=[-5,0,6,12,20][tier];
   const initialSkill=(key,num)=>{
    const variance=Math.round((initial()-.5)*(key==='velocity'?8:12));
    if(key==='velocity')return clamp(Math.round(121+(num-126)*.65+bonus*.55+variance),112,147);
    const center={contact:29,power:23,run:35,field:27,arm:32,control:29,movement:25,stamina:32}[key]||28;
    return clamp(Math.round(center+(num-40)*.45+bonus+variance),14,65);
   };
   this.style=style;this.difficulty=difficulty;this.short=short!==false;this.format='self';this.stage='school';
   this.academicYear=startYear;this.grade=1;this.year=startYear;this.day=date(this.year,c.start);
   this.trainingPlan=profile.pos==='P'?'control':'contact';
   this.player={id:playerId,name,pos:profile.pos==='P'?'P':D.positions.includes(position)?position:profile.pos,
    hand:(profile.pos==='P'?throwHand:hand)==='L'?'L':'R',batHand:hand==='L'?'L':'R',throwHand:throwHand==='L'?'L':'R',no:18,
    born:startYear-15,nation:country,origin:country,club:'school-player',school:this.school,stage:'school',
    role:profile.pos==='P'?'SP':null,pitches:profile.pitches?.slice()||null,
    stats:blank(),growth:hiddenGrowth,form:0,injury:0,history:[],
    ...Object.fromEntries(Object.entries(profile.skills).map(([key,num])=>[key,initialSkill(key,num)]))};
   this.player.positions=[this.player.pos];
   this.people=[];this.schoolClubs={};this.schoolEvents={};this.schoolHistory=[];
   this.regionalSelected=false;this.schoolPlay={};this.schoolCursor=0;this.schoolTotals=blank();this.tournament=null;this.scoutLevel=0;
   this.club=null;this.proYear=0;this.service=0;this.contract=null;this.path=null;this.academyGames=0;this.draft=null;
   this.ratings={manager:25,coach:35,trust:30,fans:5,media:2,scout:0};
   this.health={fatigue:0,injury:0,slump:0,adapt:0};this.perks=[];this.form='基本';this.experience=0;
   this.life={savings:0,housing:'寮',relationship:0,married:false,friends:0,spend:0,currency:c.currency,budget:{}};
   this.standings=L.tables();this.past=[];this.post=null;this.daysPlayed=0;this.seasonDays=0;this.postStarted=false;
   this.timeline=[];this.history=[];this.titles=[];this.national=[];this.asia=[];this.moves=[];this.rivalry={};this.archRivalId=null;
   this.playerYear=blank();this.farmStats=blank();this.recentFarm=[];this.selection=null;this.playerPost=blank();this.currentGame=null;this.last=null;
   this.queue=null;this.offers=[];this.salaryDemand=null;this.acquired=null;this.lastWin=null;this.marketChoice=null;
   this.ensureSchoolClub('school-player',this.school,this.schoolTier,this.region);
   this.ensureSchoolClub('region-player',this.region+'代表',2,this.region);
   this.note(this.region+'の'+this.school+'に入学（'+['弱小校','中堅校','強豪校'][this.schoolTier]+'）');
   Z.state(this);
  }
  static restore(data){
   if(![1,2].includes(data?.version)||!countries[data.country]||!iso.test(data.day)||data.player?.id!==playerId||
    data.player.nation!==data.country||!Array.isArray(data.people)||!['school','amateur','draft','pro','offseason','retired'].includes(data.stage))return null;
   const seen=new Set([playerId]);
   for(const p of data.people){if(!p||typeof p.id!=='string'||seen.has(p.id))return null;seen.add(p.id);}
   const world=Object.assign(Object.create(NightCareerWorld.prototype),data);
   if(data.version===1){
    for(const player of world.people)if(player.real)Object.assign(player,identity(player,player.origin));
    world.version=2;
   }
   world.schoolPlay ||= {};
   world.recentFarm ||= [];
   Z.state(world);
   if(world.farmStats)world.farmStats.walks ??= 0;
   if(world.queue?.kind==='school'&&!world.currentGame)world.protectSchoolFixture(world.active);
   if(world.country==='tw'&&!countries.tw.region.includes(world.region)){
    world.region=countries.tw.region.find(region=>region.startsWith(world.region))||countries.tw.region[0];
   }
   if(world.stage==='amateur'&&!world.player.club?.startsWith('amateur-')){
    world.player.club='amateur-player-'+world.amateurStart;
    world.ensureSchoolClub(world.player.club,world.path,1,world.region);
    if(world.queue||world.tournament&&!world.tournament.finished){
     const previous=world.tournament?.own||'school-player';
     const rewrite=p=>p===previous?world.player.club:p;
     if(world.tournament){
      const t=world.tournament;
      t.own=world.player.club;t.clubs=t.clubs.map(rewrite);
      t.draw=t.draw.map(round=>round.map(game=>game.map(rewrite)));
      t.table[world.player.club]=t.table[previous];
      delete t.table[previous];
      for(const g of t.results){g.homeId=rewrite(g.homeId);g.awayId=rewrite(g.awayId);}
     }
     for(const f of world.queue?.games||[]){f.home=rewrite(f.home);f.away=rewrite(f.away);}
     if(world.currentGame){
      const state=world.currentGame.state;
      for(const side of ['home','away'])for(const team of [state.teams?.[side]])if(team)team.id=rewrite(team.id);
     }
    }
   }
   if(world.club&&(!world.clubCountry(world.club)||world.player.club!==world.club))return null;
   return world;
  }
  save(){return this;}
  cache(key,make){
   if(!Object.hasOwn(this,key))Object.defineProperty(this,key,{value:make(),writable:true,configurable:true});
   return this[key];
  }
  invalidate(){delete this._members;delete this._people;}
  random(key){return NightCareerLeagues.random(this.seed+'/'+key);}
  get name(){return this.player.name;}
  get age(){return this.year-this.player.born;}
  get adaptation(){return this.health.adapt;}
  get playingCountry(){return this.clubCountry(this.club)||this.country;}
  get currency(){return countries[this.playingCountry].currency;}
  get pitching(){return this.player.pos==='P';}
  get active(){return this.queue?.games[this.queue.selected]||null;}
  get leagueLabel(){return countries[this.playingCountry].league;}
  get yearLabel(){return this.stage==='retired'?'引退':this.proYear?'プロ'+this.proYear+'年目':this.path||'高校'+this.grade+'年';}
  get costs(){return {jp:[5,22,380],tw:[1,6,130],kr:[25,95,1300]}[this.playingCountry];}
  get regularNext(){return this.cache('_days',()=>L.schedules(this.year,this.short));}
  money(amount,country=this.playingCountry){return new Intl.NumberFormat('ja-JP',{style:'currency',currency:countries[country].currency,maximumFractionDigits:0}).format(amount*countries[country].unit);}
  archRivalPerson(){
   if(this.archRivalId){const p=this.person(this.archRivalId);if(p)return p;}
   const cands=this.people.filter(p=>p.school&&p.club!==this.player.club&&p.pos===this.player.pos&&p.id!==this.player.id);
   if(!cands.length)return null;
   const best=cands.sort((a,b)=>this.ability(b)-this.ability(a))[0];
   this.archRivalId=best.id;return best;
  }
  ability(p){
   return p.pos==='P'?((p.velocity-115)*1.65+p.control+p.movement+p.stamina*.65)/3.65:
    p.contact*.32+p.power*.24+p.run*.11+p.field*.22+p.arm*.11;
  }
  clubCountry(id){
   const all=this.cache('_league',()=>Object.fromEntries(leagueCountries.flatMap(k=>D.roster(k).map(c=>[c.id,k]))));
   return all[id]||null;
  }
  clubName(id){
   if(id?.startsWith('national-'))return (I.names[id.slice(9)]||id.slice(9))+'代表';
   return this.schoolClubs[id]?.label||NightTeams.get(id).name;
  }
  members(id){
   if(id?.startsWith('national-'))return this.nationalMembers(id);
   const index=this.cache('_members',()=>{
    const all=new Map();
    for(const p of this.people){if(p.club&&!all.has(p.club))all.set(p.club,[]);if(p.club)all.get(p.club).push(p);}
    return all;
   });
   const players=index.get(id)||[];
   if(id===this.player.club||id==='region-player'&&this.player.club==='school-player'&&this.regionalSelected)return [this.player,...players];
   return players;
  }
  npc(country,id,tier,pos,rng,age,club,school=null){
   const center=school?41+tier*8+Math.max(0,age-15)*3:52+tier*5;
   const get=()=>clamp(Math.round(center+25*(rng()-.5)),25,92);
   const stats=pos==='P'?{velocity:Math.round(118+get()*.41),control:get(),movement:get(),stamina:get()}:
    Object.fromEntries(M.batting.map(key=>[key,get()]));
   return {id,name:D.name(country,rng),no:null,pos,positions:[pos],hand:rng()<.22?'L':'R',
    role:pos==='P'?(rng()<.61?'SP':rng()<.28?'CP':'RP'):null,
    pitches:pos==='P'?['fast','slider','change']:null,born:this.year-age,nation:country,origin:country,club,
    school,form:0,injury:0,stats:blank(),history:[],relationship:Math.round(rng()*30+35),growth:Math.floor(rng()*6),
    stage:school?'school':club?'pro':'amateur',...stats};
  }
  ensureSchoolClub(id,label,tier,region){
   const existing=this.schoolClubs[id];
   const players=existing?this.members(id).filter(p=>p.id!==playerId):[];
   const hitters=players.filter(p=>p.pos!=='P');
   const pitchers=players.length-hitters.length;
   if(existing&&hitters.length>=11&&pitchers>=6)return;
   this.schoolClubs[id]={label,tier,region};
   const rng=this.random(id+'/'+(existing?this.day:'initial'));
   const positions=existing?[...D.positions.slice(0,Math.max(0,11-hitters.length)),...Array(Math.max(0,6-pitchers)).fill('P')]:
    [...D.positions,'C','SS','CF','1B',...Array(7).fill('P')];
   if(id==='school-player'&&!existing)positions.push(this.player.pos,this.player.pos);
   const amateur=id.startsWith('amateur-');
   const roster=positions.map((p,i)=>this.npc(this.country,`${id}/${this.academicYear}/${existing?this.people.length+i:i}`,tier,p,rng,
    (amateur?18:15)+i%3,id,label));
   if(amateur)for(const p of roster)p.stage='amateur';
   this.people.push(...roster);
   this.invalidate();
  }
  ensurePro(){
   if(this.proReady)return;
   this.proReady=true;
   for(const country of leagueCountries)for(const club of D.roster(country)){
    const rng=this.random('roster/'+club.id);
    for(const p of [...club.batters,...club.pitchers])this.people.push(compactPlayer(p,club.id,country,startYear,rng));
   }
   this.invalidate();
  }
  nextGrade(){
   this.academicYear++;this.grade++;this.schoolCursor=0;this.schoolEvents={};this.tournament=null;this.regionalSelected=false;
   this.note('高校'+this.grade+'年に進級');
   Z.semester(this);
   if(this.balanceRevision>=247){for(const key of (this.pitching?M.pitching:M.batting))this.improve(key,key==='velocity'?1.5:3.5);}
   for(const p of this.people.filter(p=>p.stage==='school'&&p.club)){
    if(this.year-p.born<18){this.grow(p);continue;}
    p.stage='amateur';p.club=null;p.amateur=routing(p.nation,p.growth);
   }
   for(const [id,c] of Object.entries(this.schoolClubs)){
    const rng=this.random(id+'/'+this.academicYear),positions=[...D.positions,'C','SS','CF','1B',...Array(7).fill('P')];
    for(const [i,pos] of positions.entries()){
     const current=this.people.filter(p=>p.club===id&&p.pos===pos).length;
     if(current<=(pos==='P'?5:1))this.people.push(this.npc(this.country,`${id}/${this.academicYear}/${i}`,c.tier,pos,rng,15,id,c.label));
    }
   }
   this.invalidate();
  }
  schoolScout(){
   const stageWins=this.schoolHistory.filter(x=>x.place===1&&!x.name.includes('練習')).length;
   const outcome=this.pitching?clamp((4.5-M.era(this.schoolTotals))*5,0,18):clamp((M.ops(this.schoolTotals)-.52)*42,0,20);
   return clamp(this.scoutLevel*.55+outcome+stageWins*1.4+this.ratings.coach*.10+(this.schoolTier-1)*3,0,95);
  }
  depth(id,pos){return this.members(id).filter(p=>p.positions.includes(pos)).map(p=>this.ability(p)).sort((a,b)=>b-a).slice(0,pos==='P'?5:2).reduce((a,b)=>a+b,0);}
  pastRanking(country){return this.past.at(-1)?.ranking?.[country]?.map(r=>r.id)||D.roster(country).map(c=>c.id);}
  note(message){
   this.timeline.push({day:this.day,message});
   if(/に入学（|に進級|一軍に昇格|二軍に降格|才能が開花|で優勝|指名|現役引退|代表選出|へ移籍|負傷・復帰/.test(message)){this.spotlight={day:this.day,message,kind:/優勝|才能|指名|昇格|代表/.test(message)?'gold':'blue'};}
   if(this.timeline.length>650)this.timeline.splice(0,1);
  }
  advanceDate(next){this.day=next;this.year=calendarYear(next);}
  nextTarget(){
   if(this.active)return this.active.day;
   if(['school','amateur'].includes(this.stage)){
    if(this.tournament&&!this.tournament.finished)return this.day;
    return S.calendar(this)[this.schoolCursor]?.day||this.day;
   }
   if(this.stage==='pro')return Object.keys(this.regularNext).sort().find(d=>d>=this.day)||date(this.year,'10-05');
   return this.day;
  }
  selectGame(fixtures,kind){
   if(!fixtures.length)return false;
   const homeIds=kind==='school'?[this.player.club,'region-player']:kind==='national'?(this.nationalEvent?.selected===false?[]:['national-'+this.country]):[this.club];
   let selected=fixtures.findIndex(f=>homeIds.includes(f.home)||homeIds.includes(f.away));
   if(kind==='regular'&&selected!==-1){
    const own=fixtures[selected];
    const role=this.usage(own);
    this.selectionChange(own,role);
    if(role==='inactive'&&this.health.injury===0){
     const opponent=own.home===this.club?own.away:own.home;
     fixtures.push({...own,id:own.id+'/farm',name:(this.leagueLabel==='KBO'?'フューチャーズリーグ':'二軍公式戦'),
      kind:'farm',farm:true,otherClub:opponent});
     selected=fixtures.length-1;
    }
   }
   this.queue={games:fixtures,selected,kind};
   if(kind==='school')this.protectSchoolFixture(this.active);
   return true;
  }
  selectionChange(f,role){
   if(this.health.injury)return;
   const level=role==='inactive'?'farm':'first';
   if(this.selection?.level===level)return;
   const previous=this.selection?.level;
   const peer=this.members(this.club).filter(p=>p.id!==playerId&&p.positions.includes(this.player.pos))
    .sort((a,b)=>this.ability(b)-this.ability(a))[0];
   let reason;
   if(level==='first')reason=this.history.at(-1)?.year===this.year-1&&this.history.at(-1)?.awards?.length&&this.playerYear.g<8?
    '前年のタイトル獲得が評価され、今季も一軍で起用されます。':M.farmForm(this)>=5?'二軍での好成績が評価され、一軍に昇格しました。':
    peer?.injury?peer.name+'の離脱で一軍に昇格しました。':'能力と監督・コーチ評価をもとに一軍に選ばれました。';
   else reason=previous==='first'?(peer&&!peer.injury?peer.name+'との起用競争と直近の成績を受け、二軍に降格しました。':'直近の成績を受け、二軍で調整します。'):
    '二軍で開幕。出場を重ねて昇格を目指します。';
   this.selection={level,day:f.day,reason};
   this.note(reason);
  }
  get schoolPlayKey(){return this.academicYear+'/'+this.grade;}
  protectSchoolFixture(f){
   if(this.stage==='school'&&f&&!this.schoolPlay[this.schoolPlayKey]&&!this.health.injury)f.development=true;
  }
  usage(f){
   const id=this.owningClub(f);
   if(!id||![f.home,f.away].includes(id)||this.health.injury>0)return 'inactive';
   return M.lineup(this,id,this.clubCountry(id)||this.country,f.day,{farm:f.kind==='farm',development:f.development}).usage;
  }
  nextDay(){
   if(this.queue||this.currentGame||['draft','offseason','retired'].includes(this.stage))return false;
   if(this.stage==='school'||this.stage==='amateur'){
    if(this.tournament&&!this.tournament.finished){
     const next=stamp(this.tournament.event.day,this.tournament.round*3);
     if(this.day<next){this.tickDay();return true;}
     return this.selectGame(S.fixtures(this,this.tournament),'school');
    }
    const next=S.calendar(this)[this.schoolCursor];
    if(this.day<next.day){this.tickDay();return true;}
    this.schoolCursor++;
    S.open(this,next);
    if(this.stage==='draft')this.ensurePro();
    return true;
   }
   const year=this.year,key=this.day;
   if(!this.post&&key>=date(year,'10-05')){
    this.post=L.createPost(this.standings);
    this.note('ポストシーズン進出球団が決定');
    this.representation('fall');
   }
   if((!this.post||Object.keys(this.post.champions).length===3)&&this.nationalEvent){
    const national=this.nationalFixtures();
    if(national.length)return this.selectGame(national,'national');
   }
   if(this.post){
    if(this.post.done){this.closeSeason();return true;}
    const fixtures=L.fixtures(this.post,year,key);
    if(!fixtures.length){this.tickDay();return true;}
    if(fixtures[0].kind==='asia'&&!this.asiaAnnounced){
     this.asiaAnnounced=true;
     this.note('アジアシリーズ開幕 · 開催地 '+countries[this.post.asia.host].label);
    }
    return this.selectGame(fixtures,fixtures[0].kind);
   }
   const games=this.regularNext[key];
   if(games)return this.selectGame(games.slice(),'regular');
   this.tickDay();
   return true;
  }
  tickDay(){
   const d=stamp(this.day,1);
   this.advanceDate(d);
   if(this.health.injury>0){
    this.health.injury--;
    if(!this.health.injury)this.note('故障から復帰。出場選考を再開');
   }
   this.health.fatigue=Math.max(0,this.health.fatigue-3);
   this.health.slump=Math.max(0,this.health.slump-.035);
   this.health.adapt=Math.max(0,this.health.adapt-.04);
   if(this.stage==='pro'&&d.endsWith('-01')){
    const m=this.random('month/'+d);
    for(const p of this.people.filter(p=>p.club&&this.clubCountry(p.club))){
     p.form=Math.round((m()-.5)*15);
     p.injury=m()<.035?Math.round(8+m()*26):Math.max(0,p.injury-30);
    }
   }
   Z.tick(this);
  }
  run(mode){
   if(this.currentGame||Z.state(this).pending)return 0;
   const from=this.day,stage=this.stage,grade=this.grade,year=this.year,lastNote=this.timeline.at(-1),injuryAtStart=this.health.injury,initialLevel=this.selection?.level;
   const limit={day:1,week:7,month:30,game:370,event:370,season:420,'training-week':7}[mode]||1;
   const startWeek=Z.week(this),trainingWeek=mode==='training-week';
   const batch=mode==='season'||mode==='month';
   let steps=0;
   const start=Date.parse(from);
   while(Date.parse(this.day)-start<limit*86400000&&steps<900&&
    !['draft','offseason','retired'].includes(this.stage)){
    if(trainingWeek&&Z.week(this)!==startWeek)break;
    if(!this.queue&&!trainingWeek){
     const before=this.health.injury;
     const trained=Z.autoWeek(this);
     if(trained&&(Z.state(this).last?.summary.startsWith('覚醒')||this.health.injury>before+14)){steps++;break;}
    }
    if(this.queue){
     const f=this.active;
     if(f&&(!batch||f.development||f.important||['post','asia','national'].includes(f.kind)))break;
     this.finishDay();
    }else if(!this.nextDay())break;
    steps++;
    if(batch&&(this.health.injury>injuryAtStart+14||(initialLevel&&this.selection?.level!==initialLevel)))break;
    if(trainingWeek&&Z.week(this)!==startWeek&&!this.queue)break;
    if(this.grade!==grade||this.year!==year&&stage==='pro'||mode==='event'&&this.timeline.at(-1)!==lastNote)break;
   }
   return steps;
  }
  finishDay(live=null){
   if(!this.queue||live&&this.active?.id!==live.id||!live&&this.currentGame)return false;
   const {games,kind}=this.queue;
   const affiliateAppearance=this.active?.kind==='regular'&&this.usage(this.active)!=='inactive';
   const events=games.map(f=>{
    if(live?.id===f.id)return [f,live.result];
    const farm=f.kind==='farm';
    const shadow=kind==='regular'&&this.active?.kind==='farm'&&!farm&&[f.home,f.away].includes(this.club);
    return [f,M.simulate(this,f,{farm,withoutPlayer:shadow,development:f.development})];
   });
   for(const [f,r] of events){
    if(f.kind==='regular'){
     L.record(this.standings,f,r);
     for(const [id,s] of Object.entries(r.stats)){
      const p=this.person(id);
      if(p)merge(p.stats,s);
     }
     if([f.home,f.away].includes(this.club)){
      this.seasonDays++;
      if(affiliateAppearance)this.daysPlayed++;
     }
    }else if(f.kind==='post'||f.kind==='asia'){
     L.recordPost(this.post,f,{home:r.home,away:r.away,inning:r.inning});
     if(f.kind==='asia'){
      for(const [id,s] of Object.entries(r.stats))merge(this.post.asia.stats[id] ||= blank(),s);
      if(f.final){
       const asia=this.post.asia;
       asia.mvp=Object.keys(asia.stats).filter(id=>this.person(id)?.club===asia.winner).sort((a,b)=>
        impact(asia.stats[b])-impact(asia.stats[a]))[0]||null;
       this.note(this.clubName(asia.winner)+'がアジアシリーズ優勝');
      }
     }
    }else if(f.kind==='national'){
     const record=this.national.at(-1),campaign=this.nationalEvent,own=this.owningClub(f);
     if(campaign.selected!==false&&[f.home,f.away].includes(own)){
      const player=r.stats[playerId];
      if(player?.g){merge(record.stats,player);record.status='代表出場';}
      record.games.push({day:f.day,opponent:this.clubName(f.home===own?f.away:f.home),home:r.home,away:r.away});
     }
     if(!campaign.format){campaign.played++;campaign.next=stamp(this.day,2);}
    }else if(f.kind==='school'){
     for(const [id,s] of Object.entries(r.stats)){
      const p=this.person(id);
      if(p)merge(p.stats,s);
     }
    }
    if(this.active?.id===f.id){
     this.recordOwn(f,r);
     if(f.development&&(!live||r.stats[playerId]?.g))this.schoolPlay[this.schoolPlayKey]=live?'live':'auto';
    }
   }
   if(kind==='national'&&this.nationalEvent.format){
    const n=this.nationalEvent,record=this.national.at(-1);
    I.complete(n,this.day,events);
    if(n.done){
     record.champion=n.champion;
     record.third=n.third;
     record.stages=n.history.map(h=>({key:h.key,rank:h.rank,results:h.results}));
     this.note(n.cup+'優勝 · '+this.clubName(n.champion));
    }
   }
   if(kind==='school')S.completeRound(this,events.map(([f,r])=>[f,{home:r.home,away:r.away,inning:r.inning}]));
   this.queue=null;
   this.currentGame=null;
   this.tickDay();
   return true;
  }
  person(id){
   if(id===this.player.id)return this.player;
   return this.cache('_people',()=>new Map(this.people.map(p=>[p.id,p]))).get(id)||this.nationalEvent?.guests?.find(p=>p.id===id);
  }
  recordOwn(f,r){
   const school=f.kind==='school';
   const team=this.owningClub(f),own=f.home===team;
   const s=r.stats[this.player.id]||blank();
   if(f.kind==='farm'&&s.g){
    this.recentFarm ||= [];
    this.recentFarm.push(s);
    if(this.recentFarm.length>8)this.recentFarm.shift();
   }
   if(f.kind!=='national')merge(school?this.schoolTotals:f.kind==='farm'?this.farmStats:f.kind==='regular'?this.playerYear:this.playerPost,s);
   const result=own?[r.home,r.away]:[r.away,r.home],rival=own?f.away:f.home;
   this.last={id:f.id,day:f.day,name:f.name,team:this.clubName(team),opponent:this.clubName(rival),score:result,stat:s,inning:r.inning,pitching:this.pitching};
   const people=this.members(rival).filter(p=>p.school&&r.stats[p.id]);
   for(const p of people){
    const head=this.rivalry[p.id] ||= {games:0,wins:0};
    head.games++;
    if(result[0]>result[1])head.wins++;
    if(p.relationship>24)p.relationship-=.3;
   }
   const arch=this.archRivalPerson();
   if(arch&&people.some(p=>p.id===arch.id))this.note('ライバル対決 · '+arch.name+'（'+this.clubName(rival)+'）と対戦');
   if(s.g){
    Z.afterGame(this,f,s);
    const quality=this.pitching?clamp((4.5-M.era(s))*.7,-5,6):clamp((M.ops(s)-.65)*3,-3,6);
    this.ratings.manager=clamp(this.ratings.manager+quality*.48-(s.errors||0),0,100);
    this.ratings.coach=clamp(this.ratings.coach+quality*.3+.08,0,100);
    this.ratings.fans=clamp(this.ratings.fans+s.hr*1.45+s.sv*.7+(result[0]>result[1]?.25:0),0,100);
    this.ratings.media=clamp(this.ratings.media+(f.kind==='post'||f.kind==='asia'?1:.12)+Math.max(0,quality)*.23,0,100);
    this.ratings.scout=clamp(this.ratings.scout+Math.max(0,quality)*.07+s.hr*.11,0,100);
    this.experience+=2+Math.max(0,quality);
    this.health.fatigue=clamp(this.health.fatigue+(this.pitching?3+s.outs*.34:3)+this.health.slump*.2,0,100);
    const rng=this.random(f.id+'/health');
    if(rng()<.001+Math.max(0,this.health.fatigue-45)*.0008){
     this.health.injury=rng()<.25?36+Math.floor(rng()*40):6+Math.floor(rng()*10);
     this.note('試合で負傷・復帰見込み '+this.health.injury+'日');
    }
    this.health.slump=clamp(this.health.slump+(quality<-1?.45:-.15),0,4);
    if(!this.balanceRevision&&f.kind==='farm'&&quality>0){
     const track=(this.pitching?M.pitching:M.batting).filter(key=>key!==this.trainingPlan);
     this.improve(track[Math.floor(this.random(f.id+'/growth')()*track.length)],.55+quality*.1);
    }
    if(school){
     this.scoutLevel=clamp(this.scoutLevel+[.20,.32,.48][this.schoolTier]+Math.max(0,quality)*.52+(f.important?1.1:0),0,95);
     if(this.scoutLevel>12&&Math.floor(this.scoutLevel)%9===0)this.note(countries[this.country].league+'スカウトが視察');
    }
    if(!this.balanceRevision&&this.experience>=16){this.experience-=9;this.improve(this.trainingPlan,school?.9:1.2);}
   }
   if(f.kind==='post'||f.kind==='asia'||s.hr>=2||s.sv>0)this.note(f.name+' '+result.join('–')+' / '+this.clubName(rival)+(s.hr?' · '+s.hr+'本塁打':''));
  }
  draftApply(apply){
   if(this.stage!=='draft'||this.draft.picks.length)return false;
   this.draft.application=!!apply;
   if(apply)S.selectDraft(this);
   return true;
  }
  draftReveal(all){
   if(this.stage!=='draft'||!this.draft.picks.length)return false;
   this.draft.visible=Math.min(this.draft.picks.length,all?this.draft.picks.length:this.draft.visible+D.roster(this.country).length);
   return true;
  }
  amateur(path){
   if(this.stage!=='draft'||!(this.country==='kr'?['大学']:this.country==='jp'?['大学','社会人','独立リーグ']:['大学','社会人','再挑戦']).includes(path))return false;
   if(this.draft.picks.length&&!this.draft.resolved)this.assignDraftees();
   this.stage='amateur';this.path=path;this.schoolCursor=0;this.academyGames=0;this.tournament=null;
   this.schoolEvents={};
   this.amateurStart=this.year+1;
   this.player.club='amateur-player-'+this.amateurStart;
   this.ensureSchoolClub(this.player.club,path,1,this.region);
   this.advanceDate(date(this.amateurStart,countries[this.country].start));
   this.note(path+'でドラフトを目指す');
   return true;
  }
  assignDraftees(){
   S.materializePicks(this,this.draft.picks);
   this.draft.resolved=true;
   for(const pick of this.draft.picks){
    if(pick.id===this.player.id)continue;
    const p=this.person(pick.id);
    if(p&&!p.draftRecord){
     p.club=pick.club;p.stage='pro';p.stats=blank();
     p.draftRecord={year:this.year,round:pick.round,sequence:pick.sequence,club:pick.club};
     p.contract={years:pick.round<=3?2:1,signed:true};
    }
   }
   for(const p of this.people.filter(p=>p.stage==='school'&&this.year-p.born>=17)){
    p.club=null;p.stage='amateur';p.amateur=routing(this.country,p.growth);
   }
   this.invalidate();
  }
  signDraft(){
   const offer=this.draft?.offer;
   if(this.stage!=='draft'||!offer||this.draft.visible<offer.sequence)return false;
   if(!this.draft.resolved)this.assignDraftees();
   this.draftRecord={day:this.day,round:offer.round,club:offer.club,bids:offer.bids};
   const salary=countries[this.country].salary;
   this.sign({club:offer.club,annual:Math.round(salary*(offer.round===1?1.7:offer.round<=3?1.25:1)),years:offer.round<=3?2:1,type:'新人契約'});
   this.startSeason(this.year+1);
   this.note('ドラフト'+offer.round+'巡目指名 · '+this.clubName(offer.club)+'に入団');
   return true;
  }
  improve(key,amount){
   if(!Object.hasOwn(this.player,key))return false;
   const scale=[this.age<24?1.45:.65,1,this.age<24?.8:1.35,1.38,.95,this.age<27?.67:1.63][this.player.growth];
   const difficulty={easy:1.15,normal:1,hard:.88}[this.difficulty];
   const ceiling=this.talent?.ceiling??99;
   const cap=Math.max(this.player[key],key==='velocity'?Math.min(164,137+Math.round((ceiling-70)*.85)):ceiling);
   this.player[key]=clamp(this.player[key]+amount*scale*difficulty*(this.health.injury>0?.34:1),key==='velocity'?115:22,cap);
   this.lastGrowth={day:this.day,text:training[key]+'を強化'};
   return true;
  }
  train(key){
   if(this.currentGame||this.stage==='retired'||this.lastTraining===this.day||!Object.hasOwn(training,key)||!Object.hasOwn(this.player,key))return false;
   const rng=this.random('train/'+this.day+'/'+key);
   this.trainingPlan=key;this.lastTraining=this.day;
   const result=rng()<.15?2.3:rng()<.09?.25:1.1;
   this.improve(key,result);
   this.health.fatigue=clamp(this.health.fatigue+9,0,100);
   this.ratings.coach=clamp(this.ratings.coach+.6,0,100);
   this.note(training[key]+'練習'+(result>2?'・大成功':''));
   return true;
  }
  changeForm(form){
   if(this.currentGame||this.stage==='retired'||this.lastTraining===this.day||
    !(this.pitching?['オーバー','スリークォーター','サイド']:['基本','振り子','ノーステップ','長打重視']).includes(form)||form===this.form)return false;
   this.lastTraining=this.day;this.form=form;
   const fit=this.random('form/'+form+'/'+this.day)()<.69;
   this.health.adapt+=fit?2:6;this.health.slump=fit?0:Math.max(this.health.slump,2);
   this.improve(this.pitching?(form==='サイド'?'movement':'control'):(form==='長打重視'?'power':'contact'),fit?3:0);
   this.note('フォームを'+form+'に変更'+(fit?'・手応えあり':'・調整中'));
   return true;
  }
  conversion(value){
   if(this.currentGame||this.stage==='retired'||this.lastTraining===this.day)return false;
   const valid=this.pitching?['SP','RP','CP'].includes(value):D.positions.includes(value);
   if(!valid||(this.pitching?this.player.role:this.player.pos)===value)return false;
   this.lastTraining=this.day;this.health.adapt+=3+this.random('convert/'+this.day)()*5;
   if(this.pitching)this.player.role=value;
   else{this.player.pos=value;this.player.positions=[...new Set([...this.player.positions,value])];}
   this.note('起用・ポジションを '+value+' に変更');
   return true;
  }
  learn(key){
   if(this.currentGame||this.stage==='retired'||this.experience<12)return false;
   if(this.pitching&&NightGame.TYPES.some(t=>t.id===key)){
    if(this.player.pitches.length>=5||this.player.pitches.includes(key))return false;
    this.player.pitches.push(key);
   }else{
    const list=this.pitching?['pressure','lateLife','recovery']:['clutch','discipline','bunt','speed'];
    if(!list.includes(key)||this.perks.includes(key))return false;
    this.perks.push(key);
   }
   this.experience-=12;
   this.note('特殊能力・球種を習得');
   return true;
  }
  lifestyle(action,id=null){
   if(this.currentGame||this.stage==='retired'||this.lastLife===this.day)return false;
   const cost=this.costs;
   const account=this.currency;
   const wallet=this.life.budget[account]||0;
   const spending={hobby:cost[0],move:cost[1],house:cost[2]};
   if(Object.hasOwn(spending,action)&&wallet<spending[action])return false;
   if(action==='move'||action==='house')this.life.housing=action==='house'?'持ち家':'賃貸';
   else if(action==='social'){
    const friend=this.person(id);
    if(!friend||friend.club!==this.player.club)return false;
    friend.relationship=clamp((friend.relationship||50)+8,0,100);this.life.friends++;
    this.ratings.trust=clamp(this.ratings.trust+1.7,0,100);
    if(friend.relationship>=70)this.improve(this.trainingPlan,.35);
   }else if(action==='family'&&this.age>=18){
    this.life.relationship+=1;
    if(this.life.relationship===6&&this.age>=20){this.life.married=true;this.note('結婚を報告');}
   }else if(action==='rehab'){
    if(!this.health.injury)return false;
    this.health.injury=Math.max(0,this.health.injury-3);
   }else if(action!=='rest'&&action!=='hobby')return false;
   this.lastLife=this.day;
   this.life.budget[account]=wallet-(spending[action]||0);
   this.health.fatigue=Math.max(0,this.health.fatigue-(action==='rest'?20:9));
   this.health.slump=Math.max(0,this.health.slump-(action==='hobby'?.9:.35));
   return true;
  }
  grow(p){
   const age=this.year-p.born;
   const rng=this.random('grow/'+p.id+'/'+this.year);
   const prime=[27,31,34,33,35,37][p.growth||0];
   const k=p.pos==='P'?M.pitching:M.batting;
   const used=p.pos==='P'?p.stats.outs:p.stats.pa;
   const training=p.id===this.player.id?this.trainingPlan:k[Math.floor(rng()*k.length)];
   for(const key of k){
    const young=age<prime?Math.max(.1,(p.id===playerId&&this.proYear?1.25:1.6)-(age-16)*.055)+(key===training?.6:0):-(age-prime)*.3-.7;
    const scale=key==='velocity'?.43:1;
    const ceiling=p.id===playerId&&this.talent?Math.max(p[key],key==='velocity'?Math.min(164,137+Math.round((this.talent.ceiling-70)*.85)):this.talent.ceiling):key==='velocity'?166:99;
    p[key]=clamp(p[key]+(young+(rng()-.44)*1.35+Math.min(.38,used/600)-(p.injury>0?.7:0))*scale,key==='velocity'?111:19,ceiling);
   }
  }
  standingsFor(country=this.playingCountry,split='all',division=null){
   return L.standings(this.standings,D.roster(country).filter(c=>!division||c.division===division).map(c=>c.id),split);
  }
  playerRankings(country=this.playingCountry){
   const players=this.people.concat(this.player).filter(p=>this.clubCountry(p.club)===country&&p.stats.g);
   const teamGames=this.short?(country==='jp'?22:country==='tw'?20:18):(country==='jp'?143:country==='tw'?120:144);
   const bat=players.filter(p=>p.pos!=='P'),pitch=players.filter(p=>p.pos==='P');
   const qualified=bat.filter(p=>p.stats.pa>=Math.floor(teamGames*3.1));
   const qualifiedPitch=pitch.filter(p=>p.stats.outs>=teamGames*3);
   const batter=(label,key,score=p=>p.stats[key],pool=bat)=>({label,rows:pool.map(p=>({id:p.id,value:score(p),name:p.name})).sort((a,b)=>b.value-a.value).slice(0,5)});
   const leaderboards=[
    batter('首位打者','avg',p=>M.rate(p.stats.h,p.stats.ab),qualified),batter('本塁打王','hr'),batter('打点王','rbi'),
    batter('盗塁王','sb'),batter('最多安打','h'),
    ...(country==='kr'?[]:[batter('最高出塁率','obp',p=>M.rate(p.stats.h+p.stats.bb,p.stats.pa),qualified)]),
    batter('最多勝','w',undefined,pitch),
    {label:'最優秀防御率',rows:qualifiedPitch.map(p=>({id:p.id,value:M.era(p.stats),name:p.name})).sort((a,b)=>a.value-b.value).slice(0,5)},
    batter('最多奪三振','k',undefined,pitch),batter('最多セーブ','sv',undefined,pitch),
    ...(country==='tw'||country==='kr'?[batter('最多ホールド','hd',undefined,pitch)]:
     [batter('最優秀中継ぎ','hd',p=>p.stats.hd+p.stats.rw,pitch)])
   ];
   return leaderboards;
  }
  nationalFixtures(){
   const n=this.nationalEvent;
   if(n?.format)return I.fixtures(this,n);
   if(!n||n.played>=2||this.day<n.next)return [];
   const a=this.country,b=D.leagueCountries.filter(c=>c!==a)[n.played];
   const sides=n.played===0?[a,b]:[b,a];
   return [{id:`${this.year}/national/${n.cup}/${n.played+1}`,kind:'national',day:this.day,country:a,
    home:'national-'+sides[0],away:'national-'+sides[1],name:n.cup+' 代表カード',important:true,park:D.park(a)}];
  }
  owningClub(f){
   if(f.kind==='school')return [f.home,f.away].find(id=>ownsSchool(this,id));
   if(f.kind==='national')return 'national-'+this.country;
   return this.club;
  }
  nationalMembers(id){
   const n=this.nationalEvent,r=n?.rosters?.[id]||[];
   return r.map(pid=>this.person(pid)).filter(Boolean);
  }
  makeNationalSquad(nation,include){
   const pool=this.people.filter(p=>p.nation===nation&&this.clubCountry(p.club)&&p.injury===0&&
    (this.nationalEvent.cup!=='APBC'||this.year-p.born<=24));
   const strongest=pool.slice().sort((a,b)=>this.ability(b)-this.ability(a));
   const pick=[];
   for(const pos of D.positions){
    const available=strongest.find(p=>p.pos!=='P'&&!pick.includes(p)&&(p.positions.includes(pos)||pos==='DH'));
    if(available)pick.push(available);
   }
   pick.push(...strongest.filter(p=>p.pos!=='P'&&!pick.includes(p)).slice(0,Math.max(0,14-pick.length)));
   pick.push(...strongest.filter(p=>p.pos==='P').slice(0,9));
   // Keep regional cards playable if the conservation of under-age slots leaves a small team.
   const depth=pick.filter(p=>p.pos!=='P').length,arms=pick.length-depth;
   if(depth<12||arms<7){
    const r=this.random('national/'+nation+'/'+this.year);
    const positions=[...Array.from({length:Math.max(0,12-depth)},(_,i)=>D.positions[i%9]),...Array(Math.max(0,7-arms)).fill('P')];
    positions.forEach((pos,i)=>{
     const p=this.npc(nation,'national-pool/'+this.year+'/'+this.nationalEvent.cup+'/'+nation+'/'+i,5,pos,r,22,null);
     this.nationalEvent.guests.push(p);pick.push(p);
    });
    this.invalidate();
   }
   if(include)pick.push(this.player);
   return pick.map(p=>p.id);
  }
  representation(time){
   const year=this.year,age=this.age;
   const cup=time==='spring'&&year>=2030&&(year-2030)%4===0?'WBC':
    time==='fall'&&(year-2027)%4===0?'プレミア12':
    time==='fall'&&year>=2030&&(year-2030)%4===0?'APBC':null;
   if(!cup||this.national.some(row=>row.cup===cup&&row.year===year))return;
   const peers=this.people.filter(p=>p.nation===this.country&&this.clubCountry(p.club)&&p.pos===this.player.pos);
   const p=this.player;
   const score=x=>this.ability(x)+(x.pos==='P'?(x.stats.outs>=18?Math.max(-12,(4-M.era(x.stats))*8):0):x.stats.pa>=12?M.ops(x.stats)*24:0);
   const eligible=age>=18&&!this.health.injury&&(cup!=='APBC'||age<=24&&this.proYear<=3);
   const selected=eligible&&(this.playerYear.g||this.history.at(-1)?.stats.g)&&score(p)>=65&&
    peers.filter(x=>score(x)>score(p)).length<(p.pos==='P'?9:4);
   this.national.push({year,cup,nation:this.country,status:selected?'代表選出':'選外',games:[],stats:blank(),projected:!(cup==='プレミア12'&&year===2027)});
   const event=this.nationalEvent=I.create(cup,year);
   event.selected=!!selected;
   for(const id of event.round.groups.flat()){
    const nation=id.slice(9);
    event.rosters[id]=countries[nation]?this.makeNationalSquad(nation,selected&&nation===this.country):I.guestRoster(this,event,id);
   }
   if(selected)this.note(countries[this.country].label+'代表に選出 · '+cup);
  }
  closeSeason(){
   if(this.stage!=='pro')return false;
   const year=this.year,league=this.playingCountry,asia=this.post.asia;
   const ranking=Object.fromEntries(leagueCountries.map(c=>[c,this.standingsFor(c)]));
   const awards=this.playerRankings(league).flatMap(row=>{
    if(!row.rows.length||row.rows[0].value===0)return [];
    return row.rows.some(p=>p.id===playerId&&p.value===row.rows[0].value)?[row.label]:[];
   });
   this.titles.push(...awards.map(title=>({year,league:this.leagueLabel,title})));
   const champions={...this.post.champions};
   this.past.push({year,ranking,champions,halves:this.post.halves,asia:asia.winner});
   this.asia.push({year,host:asia.host,clubs:asia.clubs.slice(),winner:asia.winner,mvp:this.person(asia.mvp)?.name||null,games:asia.games.slice()});
   const salary=this.contract?.annual||0,currency=this.currency;
   this.life.budget[currency]=(this.life.budget[currency]||0)+Math.max(0,salary-this.costs[1]*4);
   this.history.push({year,age:this.age,league,currency,salary,club:this.club,stats:{...this.playerYear},farm:{...this.farmStats},post:{...this.playerPost},
    champion:champions[league]===this.club,asia:asia.winner===this.club,awards});
   if(this.daysPlayed>=Math.ceil(this.seasonDays*.68))this.service++;
   if(this.contract)this.contract.remaining--;
   for(const p of this.people.filter(p=>this.clubCountry(p.club))){
    const a=p.stats;
    p.history.push([year,p.club,a.g,a.ab,a.h,a.hr,a.rbi,a.bb,a.k,a.outs,a.er,a.w,a.sv,a.hd,a.sb,a.tb]);
   }
   this.stage='offseason';
   this.marketChoice=null;this.salaryDemand=null;
   this.lastWin={champions,asia:asia.winner};
   this.note(this.leagueLabel+' シーズン終了'+(champions[league]===this.club?' · 国内王者':'')+(awards.length?' · '+awards.join('、'):''));
   this.openMarket();
   return true;
  }
  openMarket(request=false){
   if(this.stage!=='offseason')return false;
   const current=this.playingCountry,club=this.club,p=this.player;
   const year=this.history.at(-1),k=this.pitching;
   const dominance=k?(year.stats.outs>=24&&M.era(year.stats)<=3.4)||(year.farm.outs>=42&&M.era(year.farm)<=3.1):
    (year.stats.pa>=20&&M.ops(year.stats)>=.79)||(year.farm.pa>=26&&M.ops(year.farm)>=.77);
   const rng=this.random('market/'+this.year+'/'+(request?'request':'base'));
   const ability=this.ability(p);
   const releasable=this.age>=25&&(this.age>=40&&ability<69||this.service<2&&this.proYear>=4&&!dominance&&rng()<.54);
   let free=this.contract?.remaining<=0,waived=false;
   if(!this.marketChoice&&free&&releasable){
    waived=true;this.marketChoice='released';this.note(this.clubName(club)+'が戦力外通告');
   }
   waived=waived||this.marketChoice==='released';
   const threshold=current==='jp'&&['大学','社会人'].includes(this.path)?7:countries[current].fa;
   const canFA=this.service>=threshold||this.rightsReleased;
   const canAbroad=this.service>=countries[current].internationalFA||waived||this.rightsReleased||current!==this.country&&free||
    free&&dominance&&this.proYear>=2&&rng()<.78;
   const dollars=countries[current].salary;
   this.offers=[];
   if(!waived&&this.marketChoice!=='refused'){
    if(!free&&!request)return true;
    this.offers.push({club,annual:Math.round(dollars*(.9+ability*.014+(dominance?.44:0))),years:dominance?3:1,type:'契約更新'});
   }
   if(!(free||request))return true;
   for(const target of leagueCountries){
    const foreign=target!==current;
    const traded=!free&&request&&!foreign;
    const marketOK=foreign?(canAbroad&&free):free&&(canFA||waived)||traded;
    if(!marketOK)continue;
    const pool=D.roster(target).filter(c=>c.id!==club&&this.foreignSlot(c.id))
     .sort((a,b)=>this.depth(a.id,p.pos)-this.depth(b.id,p.pos));
    const level=countries[target].level;
    const floor=foreign?(target==='jp'?63:target==='kr'?58:53):50;
    for(const c of pool.slice(0,request?5:3)){
     const score=ability+(dominance?13:0)+this.ratings.scout*.07+Math.max(-14,Math.min(9,(this.depth(c.id,p.pos)-(k?325:130))*-.17))+
      rng()*13-Math.max(0,this.age-32)*.75+countries[current].level-level;
     if(score<floor||this.age>=44)continue;
     const foreignType=waived||this.rightsReleased?'自由契約後の海外移籍':current!==this.country?'外国人契約満了後の移籍':
      this.service>=countries[current].internationalFA?'海外FA':'球団合意による海外移籍（ゲーム内）';
     this.offers.push({club:c.id,annual:Math.round(countries[target].salary*(1.12+Math.max(0,score-floor)*.046)),
      years:dominance&&this.age<37?2:1,type:foreign?foreignType:traded?'トレード':waived?'自由契約':'国内FA'});
    }
   }
   return true;
  }
  registrationFor(p,country){
   if(p.real&&p.origin===country)return p.registration;
   if(p.nation===country)return 'domestic';
   if(!p.nation)return 'unknown';
   return p.asianSigning&&country==='kr'?'asian':'foreign';
  }
  availableSlot(id,p=this.player){
   const target=this.clubCountry(id);
   if(!target)return null;
   if(this.registrationFor(p,target)==='domestic'||p.id===playerId&&this.rights?.[target])return 'domestic';
   const members=this.members(id).filter(x=>x.id!==p.id);
   const occupied=this.registrationFor.bind(this);
   if(target==='kr'&&['jp','tw','au'].includes(p.nation)&&!members.some(x=>occupied(x,target)==='asian'))return 'asian';
   const limit={jp:5,kr:3,tw:4}[target];
   return members.filter(x=>occupied(x,target)==='foreign').length<limit?'foreign':null;
  }
  foreignSlot(id){return !!this.availableSlot(id);}
  negotiate(index){
   const offer=this.offers[index];
   if(this.stage!=='offseason'||!offer||this.salaryDemand!==null)return false;
   this.salaryDemand=index;
   const leverage=this.ability(this.player)+this.ratings.media*.22;
   if(this.random('salary/'+this.year)()<clamp((leverage-44)/66,.18,.86)){
    offer.annual=Math.round(offer.annual*1.12);
    this.note(this.clubName(offer.club)+'が年俸の増額に合意');
   }else this.note(this.clubName(offer.club)+'が当初の年俸を維持');
   return true;
  }
  sign(offer){
   const before=this.club,beforeCountry=this.clubCountry(before),dest=this.clubCountry(offer.club);
   this.club=offer.club;this.player.club=offer.club;this.player.stage='pro';
   this.player.asianSigning=before===offer.club?this.player.asianSigning:this.availableSlot(offer.club)==='asian';
   this.contract={annual:offer.annual,remaining:offer.years,years:offer.years,currency:countries[dest].currency,type:offer.type};
   if(before!==offer.club){
    this.moves.push({day:this.day,from:before,to:offer.club,type:offer.type});
    this.note(this.clubName(offer.club)+'と'+offer.years+'年契約 · '+offer.type);
    this.health.adapt+=before?beforeCountry===dest?2:7:0;
    if(beforeCountry!==dest){this.service=0;this.rightsReleased=false;this.life.housing='寮';}
    this.life.currency=countries[dest].currency;
   }
   this.invalidate();
  }
  accept(index){
   const offer=this.offers[index];
   if(this.stage!=='offseason'||!offer||!this.foreignSlot(offer.club))return false;
   if(offer.type==='トレード'){
    const counterpart=this.members(offer.club).filter(p=>this.registrationFor(p,this.playingCountry)==='domestic'&&p.pos===this.player.pos)
     .sort((a,b)=>Math.abs(this.ability(a)-this.ability(this.player))-Math.abs(this.ability(b)-this.ability(this.player)))[0];
    if(!counterpart)return false;
    counterpart.club=this.club;this.invalidate();
    this.note(counterpart.name+'との交換トレードが成立');
   }
   this.sign(offer);
   this.startSeason(this.year+1);
   return true;
  }
  stay(){
   if(this.stage!=='offseason'||!this.contract||this.contract.remaining<=0)return false;
   this.startSeason(this.year+1);
   return true;
  }
  refuse(){
   if(this.stage!=='offseason'||!(this.contract?.remaining<=0)||this.marketChoice==='refused')return false;
   this.marketChoice='refused';
   this.openMarket(true);
   this.offers=this.offers.filter(o=>o.club!==this.club);
   this.note('球団の更新提示を辞退');
   return true;
  }
  startSeason(year){
   this.proYear++;
   this.stage='pro';
   const fate=this.random('player-season-fortune/'+year);
   this.fortune={year,swing:Math.round((fate()+fate()+fate()-1.5)*11)};
   this.advanceDate(date(year,'03-01'));
   this.nationalEvent=null;
   this.representation('spring');
   this.standings=L.tables();this.post=null;this.asiaAnnounced=false;this.queue=null;delete this._days;
   this.daysPlayed=0;this.seasonDays=0;this.offers=[];this.health.fatigue=0;
   this.playerYear=blank();this.farmStats=blank();this.recentFarm=[];this.selection=null;this.playerPost=blank();
   const previous=this.history.at(-1);
   if(previous?.year===year-1&&previous?.awards?.length){
    this.selection={level:'first',day:this.day,reason:'前季の'+previous.awards.join('・')+'を評価し、今季は一軍からスタート。'};
    this.note(this.selection.reason);
   }
   const rng=this.random('world/'+year);
   const openings=[];
   for(const p of this.people){
    const origin=this.clubCountry(p.club);
    if(origin){
     this.grow(p);
     const age=year-p.born;
     if(age>=43||age>=35&&this.ability(p)<67&&rng()<.14){
      openings.push([p.club,p.pos]);
      p.retiredFrom=p.club;p.stage='retired';p.club=null;
      if(p.school&&this.rivalry[p.id])this.note(p.name+'が現役引退');
     }else if(this.registrationFor(p,origin)==='domestic'&&age>=27&&rng()<.013){
      const destination=D.roster(origin).filter(c=>c.id!==p.club)[Math.floor(rng()*(D.roster(origin).length-1))];
      const partner=this.people.find(q=>q.club===destination.id&&q.pos===p.pos&&q.draftRecord?.year!==year-1&&this.registrationFor(q,origin)==='domestic'&&this.ability(q)<75);
      if(partner){[p.club,partner.club]=[partner.club,p.club];if(p.school||partner.school)this.note(p.name+'と'+partner.name+'のトレード');}
     }else if(p.school&&age>=26&&this.ability(p)>=72&&rng()<.035){
      const next=leagueCountries.filter(x=>x!==origin)[Math.floor(rng()*2)];
      const dest=D.roster(next).find(c=>this.availableSlot(c.id,p));
      if(dest){openings.push([p.club,p.pos]);p.asianSigning=this.availableSlot(dest.id,p)==='asian';p.club=dest.id;this.invalidate();this.note(p.name+'が'+this.clubName(dest.id)+'へ移籍');}
     }
    }
    p.stats=blank();
   }
   for(const [club,pos] of openings){
    const c=this.clubCountry(club),id='rookie/'+year+'/'+club+'/'+this.people.length;
    const prospect=this.people.find(p=>p.stage==='amateur'&&p.nation===c&&p.pos===pos&&year-p.born>=19&&this.ability(p)>=48);
    if(prospect){prospect.stage='pro';prospect.club=club;this.note(prospect.name+'が'+this.clubName(club)+'に入団');}
    else this.people.push(this.npc(c,id,1+Math.floor(rng()*3),pos,rng,18,club));
   }
   this.invalidate();
   for(const country of leagueCountries)for(const club of D.roster(country)){
    const own=this.members(club.id),positions=own.filter(p=>p.pos!=='P').length;
    const arms=own.length-positions;
    const first=positions<13?13-positions:positions<18?1:0;
    const second=arms<8?8-arms:arms<13?1:0;
    for(let i=0;i<first+second;i++){
     const pos=i<first?D.positions[(year+i)%9]:'P';
     this.people.push(this.npc(country,'replacement/'+year+'/'+club.id+'/'+i,1,pos,rng,18,club.id));
    }
   }
   this.grow(this.player);this.player.stats=blank();
   this.invalidate();
   this.note(this.leagueLabel+' プロ'+this.proYear+'年目');
  }
  retire(){
   if(this.stage!=='offseason')return false;
   this.stage='retired';
   this.retirement={day:this.day,age:this.age,club:this.club,annual:this.history.at(-1)?.salary||0};
   this.note('現役引退');
   return true;
  }
  get lifetime(){return this.history.reduce((total,row)=>merge(total,row.stats),blank());}
  canPlay(f=this.active){
   return !!f&&!this.health.injury&&!['inactive','bench'].includes(this.usage(f));
  }
  liveOptions(format=this.format){
   const f=this.active;
   if(!f||format==='auto'||this.health.injury||!formats[format])return null;
   const role=this.usage(f);
   if(['inactive','bench'].includes(role))return null;
   const own=this.owningClub(f);
   const userHome=f.home===own,player=this.player;
   const sides={home:f.home,away:f.away};
   const plans=Object.fromEntries(Object.entries(sides).map(([side,id])=>{
    const country=this.clubCountry(id)||this.country;
    const roster=M.lineup(this,id,country,f.day,{farm:f.kind==='farm',development:f.development&&id===own});
    return [side,{roster,team:M.team(this,roster,country)}];
   }));
   const user=plans[userHome?'home':'away'],rival=plans[userHome?'away':'home'];
   const ownTeam=user.team;
   const pId=player.id;
   const rotIndex=(team,seed)=>{const pool=team.pitchers.map((p,i)=>i).filter(i=>team.pitchers[i].role==='SP');const list=pool.length?pool:team.pitchers.map((_,i)=>i).slice(0,4);let h=0;for(const ch of String(seed))h=(h*31+ch.charCodeAt(0))>>>0;return list[h%list.length];};
   let userStarter=0;
   const pitchRole={rotation:1,setup:7,closer:9};
   const pinching=!this.pitching&&!ownTeam.startingOrder.includes(pId);
   if(this.pitching){
    const selected=ownTeam.pitchers.findIndex(p=>p.id===pId);
    if(selected<0)return null;
    if(format!=='full'){
     const p=ownTeam.pitchers.splice(selected,1)[0];
     ownTeam.pitchers.unshift(p);
     userStarter=role==='rotation'?0:1;
    }
   }
   const slot=pinching?7:ownTeam.startingOrder.indexOf(pId);
   const park=f.park||(this.clubCountry(f.home)?NightTeams.get(f.home).park:D.park(this.country));
   const activity={fixtureId:f.id,playerId:pId,pitching:this.pitching,continuous:true,teamSeed:this.seed,
    opportunities:this.pitching?role==='rotation'?6:role==='closer'?1:2:5,label:f.name,format,role,slot,pinching,presentation:true,
    // At least twelve batting slots remain from the fifth through the eighth,
    // even if a home win skips the ninth. The reserved slot cannot be missed.
    entryInning:this.pitching?(f.development?Math.min(7,pitchRole[role]):pitchRole[role]):pinching?(f.development?5:7):1,pitchActive:this.pitching&&role==='rotation',
    reservePitcher:1,shortIntro:true,prospect:true,keyOnly:format==='key',firstAppearance:f.development===true,important:!!f.important||f.kind==='post'||f.kind==='asia',completed:0};
   return {worldFixture:f.id,career:format==='full'?null:activity,homeTeamId:f.home,awayTeamId:f.away,
    worldMusic:{teamSeed:this.seed,playerId:pId},
    clubs:{home:plans.home.team,away:plans.away.team},innings:9,park,userHome,pitcher:this.pitching?userStarter:rotIndex(ownTeam,f.id+'/own'),opponentPitcher:rotIndex(rival.team,f.id+'/opp'),
    order:ownTeam.startingOrder,fielding:ownTeam.startingFielding,practiceBatter:pId,
    worldMaxInnings:L.inningLimit(f),worldDrawClinches:f.drawClinches,
    worldRival:rival.team.id};
  }
  completeLive(g){
   if(g.phase!=='ended'||g.worldFixture!==this.active?.id)return false;
   const stats={};
   for(const [id,box] of Object.entries(g.box)){
    stats[id]={...blank(),...box,g:1,tb:box.h+box.hr*3+(box.doubles||0)+(box.triples||0)*2};
   }
   const summary=g.matchSummary();
   for(const [id,p] of Object.entries(g.pitchingStats)){
    if(!p.batters&&!p.outs&&!p.pitches)continue;
    const win=summary.decision?.winner?.id===id;
    stats[id]={...blank(),g:1,outs:p.outs,k:p.k,walks:p.bb||0,er:p.earned??p.runs,w:win?1:0,
     sv:id===this.player.id&&g.career?.saveEligible&&g.userScore>g.opponentScore&&p.outs>=3?1:0};
   }
   if(g.career?.fieldStats?.errors) (stats[this.player.id] ||= blank()).errors=g.career.fieldStats.errors;
   return this.finishDay({id:g.worldFixture,result:{home:g.homeScore,away:g.awayScore,inning:g.inning,stats}});
  }
 }
 const impact=s=>s.hr*4+s.rbi*1.5+s.h+s.sb+s.outs*.45+s.k*.35+s.sv*3-s.er*1.6;
 const routing=(country,n)=>country==='kr'?'大学':n%2?'大学':'社会人';
 window.NightCareerWorld=NightCareerWorld;
})();
