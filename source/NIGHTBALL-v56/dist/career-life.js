/* Calendar, training, roster changes and career milestones. */
(()=>{
 const L=NightCareerLeagues;
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 const CLUBS=[
  ['打撃・制球を重視','contact','control','外野手と先発の層が厚い',5],
  ['フォームづくり','power','velocity','長距離砲を育てやすい',0],
  ['基礎と持久力','field','stamina','守備型の選手に出番がある',-3],
  ['守備・変化球の指導','arm','movement','内野手と救援の層が厚い',4],
  ['走塁と実戦練習','run','control','若手に出番が回りやすい',-4],
  ['長打・球威を重視','power','movement','競争と育成のバランス型',1]
 ];
 const ACTIVITIES={
  safe:{title:'基礎練習',detail:'疲労を抑えて、育成方針に沿って練習。'},
  intense:{title:'集中練習',detail:'大成功しやすい。疲労も大きく増える。'},
  video:{title:'映像分析',detail:'相手の攻め方を読み、次の試合に備える。'},
  rest:{title:'休養・リハビリ',detail:'疲労を回復。故障中は復帰を早める。'},
  mentor:{title:'コーチに相談',detail:'打順や起用・練習の助言を受ける。'}
 };
 const FORMS={
  compact:['すり足打法','ミートを広げる。長打力は下がる。',3,-3],
  legkick:['足上げ打法','長打が出やすい。タイミングがシビア。',-3,5],
  balanced:['標準フォーム','ミートと長打のバランス。',0,0],
  command:['制球重視','制球が上がり、球速は下がる。',4,-2],
  power:['球威重視','球速が上がり、制球は下がる。',-3,2],
  natural:['標準フォーム','制球と球速のバランス。',0,0]
 };
 const SPECIAL={
  left:{labels:['対左投手○','対左投手◎'],detail:'左投手との対戦時、ミートが上がる。'},
  clutch:{labels:['チャンス○','チャンス◎'],detail:'終盤の得点圏でミートが上がる。'},
  pressure:{labels:['ピンチ○','ピンチ◎'],detail:'走者を背負った終盤で制球が上がる。'},
  closer:{labels:['奪三振○','奪三振◎'],detail:'追い込むと変化球の変化量が増える。'}
 };
 const CAMPS={
  fundamentals:['基礎から鍛える',0,'制球・ミートと守備の基礎を伸ばす。'],
  coach:['個人コーチ',65,'重点能力を強化し、次のキャンプで習得を進める。'],
  joint:['合同自主トレ',40,'体力や走力を上げ、先輩に助言をもらう。'],
  conditioning:['コンディショニング',25,'新シーズンの疲労と故障を抑える。']
 };
 const FOREIGN={
  pacific:{name:'パシフィック・スターズ',opponents:['ベイ・パイオニアーズ','東京フォックス','ノース・ウィンズ'],park:'tokyo-dome',difficulty:57},
  harbor:{name:'メルボルン・マリナーズ',opponents:['サザン・コメッツ','シドニー・ブレーブス','ウエスト・ホークス'],park:'harbor',difficulty:51}
 };
 const FOREIGN_NAMES={
  pacific:[
   'コール イーライ デクラン ジェイス オーウェン ノーラン ジュード サイラス ルーカス マイロ フィン ブライス ローガン アッシャー グレイソン メイソン',
   'ウェストブルック グレイリッジ アッシュフォード クロスウェル ローウェイク ドレイクウッド カーライル ストーンフィールド'
  ],
  harbor:[
   'フリン ラクラン ヒュー キーラン ハミッシュ リース アンガス ロリー ネイト カラム ヘイデン エリス タイ ナッシュ ブロディ ジェット',
   'レッドベリー ブレイクモア ケントリッジ マーロウ ウィンフィールド ホーソーン トレントウッド ブラックウォーター'
  ]
 };
 const FOREIGN_COLORS=['#153b7d','#a72b4a','#265b52','#694894','#1d5775','#963818','#332575','#317531'];
 const FOREIGN_MARKS=['PS','BP','TF','NW','MM','SC','SB','WH'];
 const FOREIGN_POSITIONS=['CF','SS','RF','1B','DH','3B','LF','C','2B'];
 const FOREIGN_ARSENALS=[
  ['fast','slider','split','cutter','change'],['fast','curve','sinker','change','cutter'],
  ['fast','vslider','fork','cutter','shoot'],['fast','slowcurve','split','sinker','slider']
 ];
 const FOREIGN_CLUBS=Object.fromEntries(Object.entries(FOREIGN).flatMap(([marketId,market],marketIndex)=>{
  const [first,last]=FOREIGN_NAMES[marketId].map(names=>names.split(' '));
  return [market.name,...market.opponents].map((name,clubIndex)=>{
   const id='career-foreign-'+marketId+'-'+clubIndex,index=marketIndex*4+clubIndex;
   const person=(i,pos)=>({
    id:id+'-p'+(i+1),name:first[i%first.length]+'・'+last[clubIndex*2+Math.floor(i/first.length)],
    no:i+1,hand:(i+clubIndex*2)%5<2?'L':'R',pos
   });
   const rating=(i,shift,min,max)=>min+(i*17+shift*11+index*7)%(max-min+1);
   const batters=Array.from({length:18},(_,i)=>{
    const pos=FOREIGN_POSITIONS[i%9];
    return {...person(i,pos),positions:[pos],contact:rating(i,0,81,98),power:rating(i,1,83,99),
     run:rating(i,2,74,98),field:rating(i,3,83,98),arm:rating(i,4,82,99)};
   });
   const pitchers=Array.from({length:14},(_,i)=>({...person(i+18,'P'),
    role:i<5?'SP':i===13?'CP':'RP',velocity:rating(i,1,150,164),control:rating(i,2,84,98),
    movement:rating(i,3,87,99),stamina:i<5?rating(i,4,88,99):rating(i,4,62,81),
    pitches:FOREIGN_ARSENALS[(clubIndex+i)%FOREIGN_ARSENALS.length].slice()
   }));
   return [id,{id,name,short:name,mark:FOREIGN_MARKS[index],scoreMark:FOREIGN_MARKS[index],color:FOREIGN_COLORS[index],
    accent:'#f3ead1',park:market.park,batters,pitchers,startingOrder:batters.slice(0,9).map(p=>p.id),
    startingFielding:Object.fromEntries(batters.slice(0,9).map(p=>[p.pos,p.id]))}];
  });
 }));
 const shiftKey=c=>c.stage==='school'?'高'+c.schoolYear:c.stage==='academy'?'再挑戦'+c.academyAttempts+'年目':c.stage==='draft'?'ドラフト':('プロ'+c.proYear+'年目');
 class CareerLife{
  static activities=ACTIVITIES;
  static forms=FORMS;
  static special=SPECIAL;
  static camps=CAMPS;
  static foreign=FOREIGN;
  static foreignClub(id){return FOREIGN_CLUBS[id]||null;}
  static foreignSchedule(a){
   const camp=a.phase==='trial',days=camp?['2/10','2/14','2/18']:['4/5','5/10','6/14','7/19','8/23','9/27'];
   return days.map((date,i)=>({date,club:this.foreignClub('career-foreign-'+a.id+'-'+(i%3+1))}));
  }
  static archiveKey='nightball.career.alumni';
  static initialize(c){
   const defaults={age:15,difficulty:'challenging',weeks:{},
    planReport:null,scoutReport:null,form:c.pitching?'natural':'balanced',familiarity:3,perks:{},insight:{},
    weakness:0,injury:0,healthyBonus:0,tendencies:{},milestones:[],duel:null,academyAttempts:0,
    academy:null,abroad:null,overseasInvite:false,abroadHistory:[],wallet:0,camp:null,
    rosterNews:null,levelGames:0,farmScorecard:[],careerId:c.seed,mentor:null};
   for(const [key,value] of Object.entries(defaults))c[key]??=value;
   c.duel??={id:'career-rival',name:c.pitching?'江 宇翔':'林 承岳',school:'明徳学園',clubId:null,
    games:0,pa:0,h:0,hr:0,k:0,season:null,seasonKey:null,skills:null};
   return c;
  }
  static rng(c,key){return L.random(c.seed+'/'+key);}
  static club(c){return CLUBS[NightTeams.all.findIndex(t=>t.id===c.clubId)]||null;}
  static note(c,text){
   c.milestones.push({period:shiftKey(c),text});
   if(c.milestones.length>150)c.milestones.shift();
  }
  static week(c,f){
   if(f.school||f.type==='academy')return f.id;
   if(f.type==='pro')return f.id.replace(/-[0-9]+$/,'')+'/card/'+Math.floor(c.gameNumber/3);
   return f.id;
  }
  static clubFocus(c){const club=this.club(c);return club?.[c.pitching?2:1];}
  static train(c,key){
   const f=c.fixture;
   if(!f||c.currentGame||!Object.hasOwn(ACTIVITIES,key))return false;
   const week=this.week(c,f);
   if(c.weeks[week])return false;
   const rng=this.rng(c,week+'/training');
   const school=c.stage==='school'?NightCareer.schoolProfiles[c.school]:null;
   const coachFocus=this.clubFocus(c)||school?.[c.pitching?'pitch':'bat'];
   const drill=c.drills[c.plan],skill=drill?.skill||coachFocus||(c.pitching?'control':'contact');
   const growth=[];
   let result='',grade=null,experience=null;
   c.scoutReport=null;
   c.coachOrder=null;
   if(key==='rest'){
    const before=c.fatigue;
    c.fatigue=Math.max(0,c.fatigue-37);
    c.injury=Math.max(0,c.injury-1);
    c.adjustMorale(14);
    result='休養 · 疲労 '+before+'% → '+c.fatigue+'%'+(c.injury?' · リハビリ継続':'');
   }else if(key==='video'){
    const m=c.tendencies[f.opponent]||{};
    const arsenal=(this.foreignClub(f.opponent)||NightTeams.get(f.opponent)).pitchers[0].pitches;
    const labels=arsenal.filter(id=>id!=='fast').slice(0,2).map(id=>NightGame.TYPES.find(t=>t.id===id)?.name).filter(Boolean);
    c.scoutReport={fixture:f.id,text:c.pitching?
     m.repeat?'相手打線は前回多投した'+this.pitchName(m.repeat)+'を狙いそうです。':'先頭打者には早いカウントでストライクを取りましょう。':
     m.inner>=2?'内角の安打が多く、低め・外角の変化球で対策されそうです。':'警戒球種 '+(labels.join('・')||'ストレート')+'。追い込まれたら低めのボール球に注意。'};
    c.weakness=Math.max(0,c.weakness-1);
    c.adjustMorale(4);
    result='映像分析を完了 · 相手の傾向を確認';
   }else if(key==='mentor'){
    this.grow(c,skill,30,growth);
    if(c.goal)c.goal.progress=Math.min(2.9,c.goal.progress+.55);
    c.familiarity=Math.min(3,c.familiarity+1);
    const coach=!c.clubId?(c.mentor?.name||'高校の監督'):rng()<.27?'一軍コーチ':'担当コーチ';
    result=coach+'の助言 · '+(c.pitching?'コースを投げ分けると球種を活かせる':'ボール球の見極めを優先');
    if(!c.pitching&&f.school&&f.role==='starter'){
     const slot=c.skills.power>=48?3:c.skills.run>=49?0:1;
     c.coachOrder={fixture:f.id,slot};
     result+='。次戦は'+(slot+1)+'番で起用';
    }
    if(f.school&&rng()<.25){
     result+='。強豪校の練習相手に招かれ、経験が増えた';
     this.grow(c,skill,30,growth);
    }
   }else{
    const hard=key==='intense',before=c.fatigue,match=coachFocus===skill;
    const roll=rng()+(school?.development||0)+(match?.09:0)+(c.mentor?.skill===skill?.08:0)-before*.003;
    const tier=roll>(hard?.69:.87)?2:roll>(hard?.36:.47)?1:0;
    const exp=(hard?[22,46,90]:[19,33,60])[tier];
    this.grow(c,skill,exp,growth);
    if(tier===2&&drill?.support)this.grow(c,drill.support,30,growth);
    c.fatigue=Math.min(100,before+(hard?21:8));
    if(c.goal)c.goal.progress=Math.min(2.9,c.goal.progress+(tier===2?.85:.3));
    if(key==='safe'&&c.weakness&&skill==='contact')c.weakness--;
    c.familiarity=Math.min(3,c.familiarity+1);
    c.adjustMorale([hard?-4:-1,3,9][tier]);
    grade=['通常','成功','大成功'][tier];
    experience=NightCareer.skills[skill]+'の経験 +'+exp;
    result=grade+' · '+experience;
   }
   if(growth.length){(c.growthHistory??=[]).push({season:(c.seasons?.length||0)+1,week:week+1,skills:{...c.skills},growth:growth.slice()});if(c.growthHistory.length>80)c.growthHistory.splice(0,c.growthHistory.length-80);}
   c.weeks[week]=key;
   c.planReport={week,text:result,growth,grade,experience};
   return true;
  }
  static grow(c,skill,amount,growth=[]){
   if(!Object.hasOwn(c.skills,skill))return;
   const capped=window.NightCareerDevelopment.max(skill);
   let exp=(c.xp[skill]||0)+amount;
   while(c.skills[skill]<capped&&exp>=c.xpCost(skill)){
    exp-=c.xpCost(skill);
    c.skills[skill]++;
    growth.push(NightCareer.skills[skill]+' +1');
   }
   c.xp[skill]=c.skills[skill]>=capped?0:exp;
  }
  static useForm(c,key){
   const choices=c.pitching?['natural','power','command']:['balanced','compact','legkick'];
   if(c.currentGame||!choices.includes(key)||c.form===key)return false;
   c.form=key;
   c.familiarity=0;
   return true;
  }
  static effective(c,stats){
   const [, ,primary,secondary]=FORMS[c.form];
   if(c.pitching){
    stats.control+=primary;
    stats.velocity+=secondary;
   }else{
    stats.contact+=primary;
    stats.power+=secondary;
   }
   const fade=Math.max(0,c.age-32);
   for(const key of Object.keys(stats)){
    const decline=key==='run'||key==='velocity'||key==='stamina'?fade:Math.floor(fade/2);
    const penalty=c.injury?6:0;
    const formPenalty=c.familiarity<2&&(key==='contact'||key==='control')?3-c.familiarity:0;
    stats[key]=clamp(stats[key]-decline-penalty-formPenalty+(key==='stamina'?c.healthyBonus:0),
     key==='velocity'?111:15,key==='velocity'?162:99);
   }
   return stats;
  }
  static rivalSeason(c,f,myRating){
   const Dev=window.NightCareerDevelopment,d=c.duel;
   if(!d||!(f.school||f.type==='pro'||f.type==='playoffs'))return [];
   const key=f.school?'school-'+c.schoolYear:'pro-'+c.proYear;
   if(d.seasonKey!==key){d.seasonKey=key;d.season=Dev.blank();}
   if(!d.skills){const rng=this.rng(c,'rival-skills');d.skills={};for(const [k,v] of Object.entries(c.skills))d.skills[k]=Math.max(20,Math.round(v+(rng()*10-5)));}
   const player={...d.skills,id:d.id,name:d.name,pos:c.pitching?'P':c.position,hand:'R'};
   const sim=Dev.simulate({seed:c.seed+'/duel',pitching:c.pitching,player:()=>player},{id:'duel-'+f.id,opportunities:c.pitching?2:4});
   for(const k of Object.keys(sim))if(typeof sim[k]==='number')d.season[k]=(d.season[k]||0)+sim[k];
   const events=[];
   const duelGame=(f.school&&f.opponentName===d.school)||((f.type==='pro'||f.type==='playoffs')&&d.clubId&&d.clubId===f.opponent);
   if(duelGame){
    const rr=Dev.evaluate(sim,c.pitching).rating;
    events.push('ライバル対決 · '+d.name+'は'+(c.pitching?Math.floor((sim.outs||0)/3)+'回 被安打'+(sim.h||0)+' '+sim.k+'奪三振':(sim.h||0)+'安打'+(sim.hr?' '+sim.hr+'本塁打':'')+' '+sim.k+'三振')+'。この試合の評価は'+(myRating>=rr?'あなたが上':'相手が上'));
   }else if(c.pitching?(sim.k>=5||(sim.outs>=6&&sim.allowed===0)):(sim.hr>=1||sim.h>=3)){
    events.push('ライバル '+d.name+'が好調 · '+(c.pitching?sim.k+'奪三振':'今季'+d.season.hr+'本塁打'));
   }
   return events;
  }
  static postGame(c,f,s,manual,info){
   const notes=[];
   if(manual)c.familiarity=Math.min(3,c.familiarity+1);
   if(s.games===0){
    c.injury=Math.max(0,c.injury-1);
    c.fatigue=Math.max(0,c.fatigue-20);
    return ['故障で欠場 · '+(c.injury?'治療中':'次戦から復帰可能')];
   }
   const {metrics={},rival={}}=info;
   const rng=this.rng(c,f.id+'/progress');
   const key=c.pitching?'pressure':'left',other=c.pitching?'closer':'clutch';
   const points=c.pitching?[Math.min(2,metrics.pressure||0),Math.min(2,Math.floor(s.k/2))]:
    [Math.min(2,metrics.leftHits||0),Math.min(2,metrics.clutch||0)];
   for(const [i,id] of [key,other].entries()){
    const level=c.perks[id]||0;
    if(!points[i]||level>=2)continue;
    const progress=(c.insight[id]||0)+points[i];
    c.insight[id]=progress;
    if(progress<2+level*2)continue;
    if(rng()<Math.min(.95,.26+(progress-2-level*2)*.13)){
     c.perks[id]=level+1;
     c.insight[id]=0;
     const label=SPECIAL[id].labels[level];
     notes.push(label+'を習得');
     this.note(c,label+'を習得');
    }else notes.push(SPECIAL[id].labels[level]+'の習得チャンスを逃した。進捗は持ち越し');
   }
   if(!c.pitching&&s.k>=2&&(metrics.breakingK||0)>=2){
    c.weakness=Math.min(3,c.weakness+1);
    if(c.weakness===2)notes.push('課題「変化球が苦手」がついた。映像分析やミートの基礎練習で改善できる');
   }else if(!c.pitching&&metrics.breakingHits)c.weakness=Math.max(0,c.weakness-1);
   if(c.age>=16&&c.fatigue>=75&&rng()<Math.min(.38,(c.fatigue-64)*.007+Math.max(0,c.age-31)*.01-(c.healthyBonus||0)*.013)){
    c.injury=c.fatigue>=90?2:1;
    notes.push('故障 · '+c.injury+'試合分の回復が必要');
    this.note(c,'故障で離脱');
   }
   if(c.healthyBonus)c.healthyBonus--;
   if(rival?.pa){
    c.duel.games++;
    for(const n of ['pa','h','hr','k'])c.duel[n]+=rival[n]||0;
    if(rival.h&&(c.duel.h===rival.h))this.note(c,c.duel.name+'との対戦で'+(c.pitching?'初被安打':'初安打'));
    if(rival.hr&&(c.duel.hr===rival.hr))this.note(c,c.duel.name+'との対戦で'+(c.pitching?'初被本塁打':'初本塁打'));
    notes.push(c.duel.name+'との対戦 · '+rival.pa+'打席 '+(rival.h||0)+'安打 '+(rival.k||0)+'三振');
   }
   const profile=c.tendencies[f.opponent]||{inner:0,repeat:null,counts:{}};
   profile.inner=Math.min(10,Math.round(profile.inner*.6)+(metrics.innerHits||0));
   const faced=profile.byPitcher||={};
   for(const id of Object.keys(faced)){
    faced[id]=Math.floor(faced[id]*.65);
    if(!faced[id])delete faced[id];
   }
   for(const [id,n] of Object.entries(metrics.byPitcher||{}))faced[id]=Math.min(10,(faced[id]||0)+n);
   for(const id of Object.keys(profile.counts))profile.counts[id]*=.65;
   for(const [id,n] of Object.entries(metrics.pitches||{}))profile.counts[id]=(profile.counts[id]||0)+n;
   const pitches=Object.entries(profile.counts).sort((a,b)=>b[1]-a[1]);
   const total=pitches.reduce((sum,[,n])=>sum+n,0);
   profile.repeat=total>=7&&pitches[0]?.[1]/total>.48?pitches[0][0]:null;
   c.tendencies[f.opponent]=profile;
   return notes;
  }
  static pitchName(id){return NightGame.TYPES.find(t=>t.id===id)?.name||'決め球';}
  static camp(c,id){
   if(c.stage!=='offseason'||c.camp||!Object.hasOwn(CAMPS,id)||c.wallet<CAMPS[id][1])return false;
   c.wallet-=CAMPS[id][1];
   c.camp=id;
   const primary=c.pitching?'control':'contact',secondary=c.pitching?'stamina':'run';
   if(id==='conditioning'){
    c.injury=0;c.fatigue=0;c.healthyBonus=8;
   }else{
    this.grow(c,id==='coach'?(c.drills[c.plan]?.skill||primary):id==='joint'?secondary:primary,id==='coach'?155:100);
    if(id==='joint')this.grow(c,primary,45);
    if(id==='coach'&&c.goal)c.goal.progress=Math.min(2.9,c.goal.progress+1);
   }
   this.note(c,CAMPS[id][0]+'に参加');
   return true;
  }
  static roster(c){
   const rng=this.rng(c,'roster/'+c.proYear+'/'+c.clubId),roll=rng();
   c.rosterNews=roll<.33?{label:'主力の移籍 · '+NightCareer.positionNames[c.position]+'に空きができた',adjust:-8}:
    roll<.65?{label:'有力新人が加入 · '+NightCareer.positionNames[c.position]+'の競争が激化',adjust:7}:
     {label:'監督が交代 · 実戦で結果を残した選手を優先',adjust:-3};
   this.note(c,c.rosterNews.label);
  }
  static archive(c){
   return {id:c.careerId,name:c.name,pitching:c.pitching,clubId:c.clubId,year:c.proYear,
    player:c.player(),stats:{...c.proStats},milestones:c.milestones.slice(),
    awards:c.awards.slice(),duel:{...c.duel},mentorSkill:c.drills[c.plan]?.skill||(c.pitching?'control':'contact')};
  }
 }
 window.NightCareerLife=CareerLife;
})();
