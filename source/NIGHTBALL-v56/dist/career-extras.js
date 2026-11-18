/* Off-field life and optional baseball activities. */
(()=>{
 'use strict';
 const L=NightCareerLeagues,Life=NightCareerLife;
 const cities={owls:'台中',foxes:'台北',falcons:'台南',mariners:'新北',wolves:'桃園',comets:'高雄'};
 const people={
  mei:['美玲','写真部のクラスメイト'],
  yuto:['悠斗','文化祭で一緒になった友人'],
  rin:['凜','商店街の喫茶店を手伝う地元の友人']
 };
 const hobbies={photo:'写真',cook:'料理',fish:'釣り',game:'ゲーム'};
 const hobbyChoices={
  photo:[['steady','街角を撮る'],['challenge','光の難しい風景を狙う']],
  cook:[['steady','定番のおやつを作る'],['challenge','新しい味付けを試す']],
  fish:[['steady','岸辺で小魚を狙う'],['challenge','沖の大物に挑む']],
  game:[['steady','カジュアル対戦'],['challenge','大会の上級部門']]
 };
 const collections={
  photo:['雨上がりの商店街','夕暮れの河川敷','坂の途中の窓明かり','夜市の光','花蓮の朝焼け'],
  cook:['ねぎ餅','ルーロー飯','豆花','胡椒餅','台湾カステラ'],
  fish:['河口のハゼ','水路の小魚','堤防のアジ','港のメバル','夜釣りのスズキ'],
  game:['パズル大会の参加賞','対戦会の記念カード','ゲームセンターの銀メダル','協力ゲームのクリア証','地元大会の優勝トロフィー']
 };
 const apartments={studio:['駅前のワンルーム',0],sunny:['日当たりの良い部屋',23],house:['庭付きの一軒家',78]};
 const furniture={desk:['作業机',4],sofa:['ソファ',7],shelf:['思い出の棚',9],coffee:['コーヒーミル',6]};
 const cafes={coffee:['自家焙煎コーヒー',1],toast:['厚切りトースト',2],cake:['台湾カステラ',3]};
 const baseballPlans={team:'チーム練習',recovery:'コンディション調整',meeting:'起用の面談',scout:'スカウト面談',
  challenge:'育成チャレンジ',partner:'チームメイトと特訓',arrival:'新入部員との交流',campcheck:'春季キャンプの一軍選考'};
 const preferred=(c)=>c.pitching?'control':'contact';
 const school=c=>c.stage==='school';
 const grown=c=>!!c.clubId;
 const ready=c=>!c.currentGame;
 const cap=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function state(c){
  const x=c.extras??={};
  x.life??={day:1,time:2,money:0,saved:0,paidYear:0,place:null,home:'studio',items:[],homeCity:null,
   interests:{},collection:{},relationships:{},album:[],flags:{},shop:null,after:null,last:null};
  x.base??={weeks:{},goals:{},teammate:0,slump:0,rival:0,scoutBoost:{},roleTrust:0,last:null,challenge:null,leader:false};
  x.life.collection??={};
  return x;
 }
 const period=c=>school(c)?'高校'+c.schoolYear+'年':c.stage==='retired'?'引退後':grown(c)?'プロ'+c.proYear+'年目':'進路選考中';
 function city(c){return cities[c.clubId]||'地元';}
 function life(c){
  const l=state(c).life;
  if(grown(c)&&c.proYear>l.paidYear){
   l.money+=Math.max(0,c.pay);l.paidYear=c.proYear;
  }
  if(grown(c)&&city(c)!==l.homeCity){
   l.homeCity=city(c);
   if(l.place)l.place=l.homeCity;
  }
  return l;
 }
 function put(c,title,summary,album=true,photo=null){
  const l=life(c),week=baseWeek(c);
  if(album&&week&&l.refreshWeek!==week&&!c.currentGame){
   l.refreshWeek=week;c.adjustMorale(7);
   summary+=' ／ 気分転換で調子を整えた。';
  }
  const item={title,summary,period:period(c),day:l.day,photo};
  l.last=item;
  if(album){l.album.push(item);if(l.album.length>120)l.album.shift();}
  return item;
 }
 function chooseTime(l){if(l.time<1)return false;l.time--;return true;}
 const friendship=(l,id)=>l.relationships[id]??={points:0,seen:0,bond:'知り合い'};
 const recordOnce=(l,key)=>{l.flags[key]=true;};
 const albumScenes={festival:'cafe',trip:'coast',fair:'street',reunion:'cafe',gallery:'street'};
 const room=(l,n)=>l.money>=n;
 function eventList(c,l){
  const events=[];
  const append=(id,title,description,choices)=>events.push({id,title,description,choices});
  if(school(c)){
   if(c.schoolYear<=2&&!l.flags.festival)append('festival','文化祭の企画会議','教室を一日だけ店にする。クラスの意見が割れている。',
    [['cafe','喫茶店をやる'],['exhibit','写真展を開く'],['games','ゲーム大会を開く']]);
   if(c.schoolYear>=2&&!l.flags.trip)append('trip','修学旅行の自由行動','集合まであと三時間。どこへ行く？',[['sea','海辺を歩く'],['market','夜市を見て回る']]);
   if(c.schoolYear===3&&!l.flags.graduation)append('graduation','卒業前の寄せ書き','専門の進路に向かう前に、残しておきたい言葉がある。',[['promise','いつかまた会おう'],['letter','お礼を書いて渡す']]);
  }
  if(grown(c)&&!l.flags.reunion&&Object.values(l.relationships).some(r=>r.points>=2))
   append('reunion','帰省で久しぶりの再会','地元駅で高校時代の友人から連絡が来た。',[['visit','ゆっくり話す'],['invite','街を案内する']]);
  if(!l.flags.fair)append('fair','商店街の夏祭り','今年は人手が足りないらしい。何を手伝う？',[['stall','出店の手伝い'],['guide','会場の案内']]);
  if(grown(c)&&!l.flags.radio)append('radio','地元ラジオの収録','番組から、休日の過ごし方を話してほしいと依頼が来た。',[['story','街の思い出を話す'],['hobby','趣味の話をする']]);
  if(grown(c)&&!l.flags.letter)append('letter','ファンレター','地元の子どもから手書きの手紙が届いた。',[['reply','返信する'],['keep','手紙を思い出に残す']]);
  if((l.interests.photo||0)>=3&&!l.flags.gallery)
   append('gallery','写真のミニ個展','商店街の空きスペースで作品を展示できる。',[['city','街角の写真を並べる'],['friends','人との思い出を並べる']]);
  return events;
 }
 const scenes={
  festival:{cafe:['文化祭の喫茶店','悠斗と仕込みを分担した。最後のお客さんが帰ったあと、余ったケーキで乾杯した。','yuto'],
   exhibit:['文化祭の写真展','美玲と撮った街の写真に、人だかりができた。最後に二人で会場の写真を撮った。','mei'],
   games:['文化祭のゲーム大会','凜が実況を引き受けてくれた。決勝戦は隣の教室まで歓声が響いた。','rin']},
  trip:{sea:['修学旅行の海辺','美玲と波打ち際を歩いた。集合前に写真を一枚だけ撮った。','mei'],
   market:['修学旅行の夜市','悠斗と買った胡椒餅が熱すぎて、二人で笑った。','yuto']},
  graduation:{promise:['卒業の約束','それぞれの進路が決まった。何年かかっても、また会おうと約束した。',null],
   letter:['卒業の手紙','帰り道でお礼の手紙を渡した。返事はその日の夜に届いた。',null]},
  reunion:{visit:['地元駅で再会','あの頃の寄り道の話だけで、席を立つ頃には店が閉まりかけていた。',null],
   invite:['昔の友人と街歩き','新しい街へ招いた。帰りに、いつか一緒に店をやろうという話になった。',null]},
  fair:{stall:['商店街の屋台','凜と屋台を切り盛りした。顔を覚えてくれた人が、翌日も来てくれた。','rin'],
   guide:['夏祭りの案内係','迷子を本部に送り届けると、翌日、商店街にお礼の絵が届いた。',null]},
  radio:{story:['ラジオの帰り道','街の思い出を話したら、以前の商店街の仲間から連絡が来た。',null],
   hobby:['ラジオで趣味の話','趣味の話に時間を使いすぎた。翌週、同じ趣味のリスナーからメッセージが届いた。',null]},
  letter:{reply:['手書きの返信','字を何度か書き直して投函した。翌年の祭りで手紙の送り主に出会った。',null],
   keep:['机の引き出しの手紙','封筒を思い出の箱にしまった。引っ越しのたびに大事に持っていくことにした。',null]},
  gallery:{city:['街角の写真展','足を止めたお客さんが、写真に写った店の昔話を教えてくれた。',null],
   friends:['友人との写真展','来場した美玲が、写真を撮った夜のことまで覚えていた。','mei']}
 };
 function lifeAction(c,action,id,value){
  const l=life(c);
  if(action==='next'){
   l.day++;l.time=2;l.last=null;return {title:'新しい休日'};
  }
  if(action==='relax'){
   const week=baseWeek(c);
   if(!week||c.currentGame||l.relaxedWeek===week||!chooseTime(l))return null;
   const fatigue=c.fatigue;
   l.relaxedWeek=week;c.fatigue=Math.max(0,fatigue-12);c.adjustMorale(10);
   return put(c,'自由時間にリフレッシュ','疲労 '+fatigue+'% → '+c.fatigue+'%。次の試合に向けて気分を整えた。',false);
  }
  if(action==='event'){
   const event=eventList(c,l).find(e=>e.id===id);
   if(!event?.choices.some(([key])=>key===value)||!chooseTime(l))return null;
   const [title,text,person]=scenes[id][value];
   if(person)friendship(l,person).points+=2;
   recordOnce(l,id);return put(c,title,text,true,id==='trip'&&value==='market'?'market':albumScenes[id]);
  }
  if(action==='friend'&&Object.hasOwn(people,id)){
   const r=friendship(l,id),name=people[id][0];
   if(value==='date'&&r.points<3||value==='date'&&r.bond==='交際中'||!['meet','date'].includes(value)||!chooseTime(l))return null;
   r.points++;
   if(value==='date'){r.bond='交際中';return put(c,name+'との約束','気持ちを伝えると、次の休日も二人で過ごすことになった。');}
   r.seen++;
   const sameTown=!l.place||l.place===l.homeCity;
   if(r.bond==='知り合い'&&r.points>=2)r.bond='友人';
   const lines=['放課後の帰り道、よく行く店を教えてもらった。','好きなものの話で盛り上がり、閉店まで話した。','離れて暮らしても、次の休みには会おうと約束した。'];
   return put(c,name+'と出かけた',r.bond==='交際中'?'待ち合わせて、二人で夕暮れの街を歩いた。':!sameTown?'旅先で待ち合わせ、途中で見つけた店に寄った。':lines[(r.seen-1)%lines.length],r.seen<=3||r.bond==='交際中');
  }
  if(action==='hobby'&&Object.hasOwn(hobbies,id)){
   const choices=hobbyChoices[id];
   if(!choices.some(([choice])=>choice===value)||!chooseTime(l))return null;
   const steps=l.interests[id]=(l.interests[id]||0)+1;
   const items=l.collection[id]??=collections[id].slice(0,steps-1);
   const missing=collections[id].filter(name=>!items.includes(name));
   const rng=L.random(c.seed+'/hobby/'+id+'/'+steps)();
   const risk=value==='challenge';
   const score=risk?rng>=.34:rng>=.06;
   const found=score?missing[risk?Math.min(missing.length-1,1):0]:null;
   if(found)items.push(found);
   const photos=['street','street','cafe','market','coast'];
   const photo=id==='photo'&&found?photos[collections.photo.indexOf(found)]:null;
   const summary=found?'「'+found+'」をコレクションに追加した。':missing.length?
    {photo:'光が変わって狙った一枚にはならなかった。',cook:'味付けを決めきれず、また作ってみることにした。',fish:'当たりはあったが、引き上げる前に外れてしまった。',game:'あと一手のところで時間切れ。'}[id]:
    'お気に入りのひとときを過ごした。';
   return put(c,hobbies[id]+'の休日',summary,!!found,photo);
  }
  if(!grown(c))return null;
  if(action==='trip'){
   const places={'台南':'夜市の屋台を回り、路地の喫茶店で夕方まで過ごした。','花蓮':'海岸で朝焼けを眺め、帰りに友人へ絵はがきを出した。','地元':'駅前の店を訪ね、高校時代の知り合いと話し込んだ。'};
   if(!Object.hasOwn(places,id)||!room(l,3)||!chooseTime(l))return null;
   l.money-=3;l.place=id;return put(c,id+'への小旅行',places[id],true,{'台南':'market','花蓮':'coast','地元':'street'}[id]);
  }
  if(action==='money'){
   if(id==='save'&&l.money>=10){l.money-=10;l.saved+=10;return put(c,'貯金','10万台湾ドルを貯金に移した。',false);}
   if(id==='withdraw'&&l.saved>=10){l.saved-=10;l.money+=10;return put(c,'貯金を引き出す','10万台湾ドルを生活資金に戻した。',false);}
   if(id==='gift'&&room(l,4)&&chooseTime(l)){l.money-=4;return put(c,'家族に贈り物','好きだったお菓子を送った。夜にお礼の電話が来た。');}
  }
  if(action==='home'&&Object.hasOwn(apartments,id)){
   const [name,cost]=apartments[id];
   if(l.home===id||!room(l,cost))return null;
   l.money-=cost;l.home=id;l.place=l.homeCity;return put(c,name+'へ引っ越し',l.homeCity+'に新しい暮らしの拠点ができた。');
  }
  if(action==='item'&&Object.hasOwn(furniture,id)){
   const [name,cost]=furniture[id];
   if(l.items.includes(id)||!room(l,cost))return null;
   l.money-=cost;l.items.push(id);return put(c,name+'を購入','部屋に'+name+'を置いた。');
  }
  if(action==='shop'){
   if(id==='open'&&!l.shop&&room(l,28)&&((l.interests.cook||0)>=2||l.flags.festival||l.flags.reunion)&&chooseTime(l)){
    l.money-=28;l.shop={menu:'coffee',price:'regular',hours:'weekend',customers:0,turns:0,sales:0,last:null};
    return put(c,'カフェ開店',l.flags.reunion?'高校時代の友人と一緒に、商店街に小さな店を開いた。':'商店街の一角に、小さなカフェを開いた。',true,'cafe');
   }
   const shop=l.shop;
   if(!shop)return null;
   if(id==='menu'&&Object.hasOwn(cafes,value))shop.menu=value;
   else if(id==='price'&&['value','regular','premium'].includes(value))shop.price=value;
   else if(id==='hours'&&['weekend','extended'].includes(value))shop.hours=value;
   else if(id==='serve'){
    const cost=cafes[shop.menu][1],days=shop.hours==='extended'?2:1;
    if(l.time<days||!room(l,cost))return null;
    l.time-=days;
    const roll=L.random(c.seed+'/cafe/'+shop.turns)();
    const demand=42+days*19+(shop.menu==='cake'?8:0)+(shop.price==='value'?16:shop.price==='premium'?-14:0);
    const customers=Math.round(demand+roll*28);
    const revenue=Math.round(customers*({value:.052,regular:.069,premium:.094}[shop.price]));
    const profit=revenue-cost;l.money+=profit;shop.turns++;shop.customers+=customers;shop.sales+=profit;
    shop.last=customers+'人来店 · 売上 '+revenue+'万 · 原価 '+cost+'万 · 利益 '+profit+'万台湾ドル';
    if(shop.turns===5&&l.flags.radio)put(c,'ラジオを聞いたお客さん','放送で話した趣味を覚えていた人たちが、店に次々と来てくれた。');
    return put(c,days===2?'土日のカフェ営業':'土曜のカフェ営業',shop.last,shop.turns===1||shop.turns%5===0,'cafe');
   }else return null;
   return {title:'カフェの営業方針を変更'};
  }
  if(action==='after'&&c.stage==='retired'&&!l.after){
   const endings={cafe:l.shop?['カフェを続ける','店の常連が増え、かつての友人も通ってくれる。']:null,
    broadcast:l.flags.radio?['ラジオで街を取材する','街の店や人を訪ねて、月一回の番組を始めた。']:null,
    hometown:['地元で暮らす','商店街で、懐かしい人たちとまた顔を合わせるようになった。']};
   if(!endings[id])return null;
   const [title,story]=endings[id];l.after=id;return put(c,title,story);
  }
  return null;
 }
 function baseWeek(c){
  const f=c.fixture;
  if(!f)return c.stage==='offseason'?'camp/'+c.proYear:null;
  if(f.type==='school-tryout')return f.id.split('/tryout')[0];
  return Life.week(c,f);
 }
 function teamTraining(c){
  const b=c.extras?.base;
  const club=c.clubId||(c.stage==='academy'?c.academy.path:c.school);
  return b?.teamId===club&&['school','academy','pro','offseason'].includes(c.stage)?b.teammate||0:0;
 }
 function book(c){
  const x=state(c).base,week=baseWeek(c);
  return {x,week,p:(week&&x.weeks[week])||[]};
 }
 function practiceWeekStart(c,action,choice){
  if(!ready(c)||!Object.hasOwn(baseballPlans,action))return null;
  const {x,week,p}=book(c);
  if(!week||p.length>=2||p.includes(action)||x.challenge?.week===week)return null;
  const syncTeam=()=>{
   const club=c.clubId||(c.stage==='academy'?c.academy.path:c.school);
   if(x.teamId!==club){x.teamId=club;x.teammate=0;x.allyGrowth=0;}
  };
  const skill=c.drills[c.plan]?.skill||preferred(c);
  const growth=[];
  let result='';
  if(action==='challenge'){
   const options=c.pitching?['control','movement']:['contact','power','run'];
   if(!options.includes(choice))return null;
   x.challenge={skill:choice,index:0,correct:0,week,last:null};
   result='5球のチャレンジを開始した。';
  }else if(action==='recovery'){
   if(choice==='rehab'&&c.fixture?.type!=='pro')return null;
   c.fatigue=Math.max(0,c.fatigue-26);
   c.adjustMorale(11);
   if(c.injury)c.injury--;
   if(x.slump)x.slump=Math.max(0,x.slump-2);
   if(choice==='rehab'&&c.fixture)x.rehabFor=c.fixture.id;
   if(choice==='form'){c.familiarity=Math.min(3,c.familiarity+1);c.weakness=Math.max(0,c.weakness-1);}
   result=choice==='form'?'フォームを調整。疲労と技術的な不調を立て直した。':choice==='rehab'?'次戦を二軍での実戦調整に変更した。':'疲労を最大26ポイント回復し、不調や故障をケアした。';
  }else if(action==='team'||action==='partner'){
   if(c.injury>=2)return null;
   syncTeam();
   x.teammate=Math.min(9,x.teammate+(action==='partner'?2:1));
   Life.grow(c,skill,action==='partner'?28:20,growth);
   c.fatigue=Math.min(100,c.fatigue+8);
   if(action==='partner')x.allyGrowth=(x.allyGrowth||0)+1;
   result=(action==='partner'?'同僚の林 佑安と特訓し、佑安も打撃が上達した。':'合同練習を実施。')+' チームの連携 '+x.teammate+'/9。';
   if(school(c)&&c.schoolYear===3&&x.teammate>=5&&!x.leader){x.leader=true;result+=' 監督から主将に指名された。';}
  }else if(action==='arrival'){
   if(!school(c)||c.schoolYear<2||x.arrivalYear===c.schoolYear||!['guide','rival'].includes(choice))return null;
   x.arrivalYear=c.schoolYear;
   syncTeam();
   if(choice==='guide'){x.teammate=Math.min(9,x.teammate+2);result='新入部員の練習に付き合った。チームの連携が上がった。';}
   else{x.rival=Math.min(12,x.rival+2);Life.grow(c,skill,36,growth);result='新入部員と実戦形式で競い、監督に成長を見せた。';}
   Life.note(c,result);
  }else if(action==='campcheck'){
   if(c.stage!=='offseason'||!c.camp||x.campReview?.year===c.proYear)return null;
   const score=Math.max(c.seasonRatings(),c.evaluation||0)+(x.roleTrust||0)+Math.floor(x.rival/2);
   x.campReview={year:c.proYear,passed:score>=61,score};
   result=score>=61?'キャンプ選考 '+score+'点。次の契約が二軍なら開幕一軍帯同に変更。':'キャンプ選考 '+score+'点。61点が一軍帯同の基準。';
  }else if(action==='meeting'){
   if(x.goals.role&&!x.goals.role.done)return null;
   const labels=c.pitching?{rotation:'先発枠を狙う',setup:'中継ぎ枠を狙う'}:{lineup:'打順と出場枠を上げる',convert:'別ポジションに挑戦'};
   if(!Object.hasOwn(labels,choice))return null;
   const oldPosition=c.position;
   if(choice==='convert'){
    const open=c.positions.find(pos=>pos!==oldPosition)||c.plans('position')[0]?.[0];
    if(!open)return null;
    if(c.positions.includes(open))c.setPosition(open);
    else c.setPlan('position',open);
   }
   if(c.pitching)c.preferredRole=choice;
   x.goals.role={id:choice,label:labels[choice],progress:0,target:2,done:false,oldPosition};
   result='監督と目標を設定。目標達成で起用評価が上がる。';
  }else if(action==='scout'){
   if(!['school','academy'].includes(c.stage)||x.goals.scout&&!x.goals.scout.done)return null;
   const scout=c.scout().find(row=>row.clubId===choice&&!x.scoutBoost[row.clubId]);
   if(!scout)return null;
   x.goals.scout={label:scout.need,clubId:scout.clubId,progress:0,target:2,done:false};
   result=NightTeams.get(scout.clubId).name+'から「'+scout.need+'」を確認したいと言われた。';
  }
  x.weeks[week]=[...p,action];
  x.last={title:baseballPlans[action],summary:[result,...growth].join(' ／ ')};
  return x.last;
 }
 function quickDrill(c){
  const {x,week}=book(c);
  if(!week)return null;
  if(x.challenge?.week!==week){
   const drill=c.drills[c.plan]?.skill;
   const options=c.pitching?['control','movement']:['contact','power','run'];
   if(!practiceWeekStart(c,'challenge',options.includes(drill)?drill:options[0]))return null;
  }
  return practiceAnswer(c,null,true);
 }
 function practicePitch(c){
  const q=state(c).base.challenge;
  if(!q)return null;
  const random=L.random(c.seed+'/'+q.week+'/training/'+q.skill+'/'+q.index);
  const i=Math.floor(random()*3);
  if(q.skill==='control'||q.skill==='movement'){
   const options=['内角低め','外角低め','高め'];
   return {question:'指定コース '+options[i]+'。どこに投げる？',options,i};
  }
  if(q.skill==='power'||q.skill==='run'){
   const options=['引っ張る','センター返し','流し打ち'],balls=['内角','真ん中','外角'];
   return {question:balls[i]+'の球。最も合わせやすい方向は？',options,i};
  }
  const options=['振る','見送る低め','見送る外角'],balls=['ゾーン中央','ゾーンを外れる低め','ゾーンを外れる外角'];
  return {question:balls[i]+'に来た。どうする？',options,i};
 }
 function practiceAnswer(c,i,auto=false,timed=true){
  if(!ready(c))return null;
  const x=state(c).base,q=x.challenge;
  if(!q||q.week!==baseWeek(c)||!auto&&![0,1,2].includes(i))return null;
  if(auto){
   const rng=L.random(c.seed+'/'+q.week+'/auto-drill');
   while(q.index<5){if(rng()<.52+(c.skills[q.skill]-(q.skill==='velocity'?120:30))*.004)q.correct++;q.index++;}
  }else{
   const success=practicePitch(c).i===i&&timed;
   q.correct+=Number(success);q.index++;q.last=success?'成功':timed?'狙いと違った。次の1球へ。':'タイミングが合わなかった。次の1球へ。';
  }
  if(q.index<5)return {title:'チャレンジ継続'};
  const growth=[],points=12+(auto?11:16)*q.correct;
  Life.grow(c,q.skill,points,growth);c.fatigue=Math.min(100,c.fatigue+10);
  const key=c.pitching?'closer':'clutch';
  if(q.correct>=4&&(c.perks[key]||0)<2){
   const attempts=x.drillInsight=(x.drillInsight||0)+1;
   if(L.random(c.seed+'/'+q.week+'/drill-perk')()<Math.min(.78,.24+attempts*.1)){
    c.perks[key]=(c.perks[key]||0)+1;x.drillInsight=0;
    growth.push(Life.special[key].labels[c.perks[key]-1]+'を習得');
   }else growth.push('特殊能力の習得機会。経験は次回へ持ち越した。');
  }
  x.last={title:'チャレンジ結果 '+q.correct+'/5',summary:[NightCareer.skills[q.skill]+'の経験 +'+points,...growth].join(' ／ ')};
  x.challenge=null;return x.last;
 }
 const curricula={
  discipline:{title:'変化球の見極め',speaker:'打撃コーチ',reason:'打ちにいかなくていい球まで追っている。低めに落ちる球を見極めよう。',
   cue:'ゾーンを外れた変化球を見送る',skill:'contact',drill:'追い込まれて、フォークがゾーンの下へ落ちる。どうする？',
   answers:['振る','見送る','バントする'],correct:1},
  gap:{title:'強い打球を打つ',speaker:'打撃コーチ',reason:'打球が上がらなくても、野手の間を抜ければいい。まずは一本、狙いを決めてみよう。',
   cue:'自分の打席で安打を打つ',skill:'power',drill:'真ん中付近の甘い直球が来た。長打を狙うなら？',
   answers:['ゾーン外まで追う','ただ見送る','狙いを絞って強く打つ'],correct:2},
  command:{title:'ストライク先行',speaker:'投手コーチ',reason:'ボールが先行すると打者が待てる。まずはゾーンに投げ切ろう。',
   cue:'狙ってストライクゾーンへ投げる',skill:'control',drill:'初球。ストライクを先行させるコースは？',
   answers:['ゾーン内の低め','大きく外す高め','ワンバウンド'],correct:0},
  breaking:{title:'変化球でカウントを取る',speaker:'投手コーチ',reason:'決め球だけに使うと読まれる。押し引きに変化球を混ぜてみよう。',
   cue:'変化球をストライクゾーンへ投げる',skill:'control',drill:'初球から直球を待つ打者。変化球でカウントを取るなら？',
   answers:['大きく外す変化球','ストライクゾーン内に曲げる','直球で外す'],correct:1}
 };
 function episodes(c){
  return state(c).episodes??={seen:{},sequence:0,nextPhoto:null,playing:null,last:null,history:[]};
 }
 function followingEvent(c){
  const f=c.fixture,x=episodes(c);
  if(!f||c.currentGame||x.seen[f.id])return null;
  if(x.playing?.fixture===f.id)return {...curricula[x.playing.id],fixture:f.id,kind:'drill',id:x.playing.id};
  const l=life(c),year=c.clubId?'pro-'+c.proYear:'school-'+c.schoolYear;
  const story=(id,title,speaker,reason,choices,extra={})=>({id,title,speaker,reason,choices,kind:'life',fixture:f.id,...extra});
  if(x.nextPhoto==='invite')return story('photo-invite','美玲から写真展の誘い','美玲',
   '前に撮った写真を見せたら、二人で展示してみないかと言われた。',[['exhibit','一緒に展示する'],['letter','写真を手紙にする']]);
  if(x.nextPhoto==='keepsake'&&x.photoYear!==year)return story('photo-return','あの写真の残る街','美玲',
   '久しぶりに帰ると、あの写真の場所に変わらない景色があった。美玲から待ち合わせの連絡が来た。',[['meet','同じ場所で撮り直す'],['send','今の街の写真を送る']]);
  const scheduledLife=x.sequence%3===1||f.role==='inactive'&&x.sequence===0&&c.injury<2;
  if(scheduledLife){
   if(!l.flags.photoWalk&&school(c))return story('photo-walk','放課後の寄り道','美玲','帰り道、写真部の美玲に「少しだけ遠回りしない？」と誘われた。',
    [['photo','一緒に街を撮る'],['cafe','喫茶店で話す']]);
   const regular=eventList(c,l)[0];
   if(regular)return story('life-'+regular.id,regular.title,'休日',regular.description,regular.choices,{original:regular.id});
   return story('day-off','週末の予定','休日','午後から時間が空いた。どこで過ごす？',
    [['friend','友人と出かける'],['rest','家で過ごす']]);
  }
  if(f.role==='inactive'||c.weeks[Life.week(c,f)])return null;
  if(c.injury>=2||c.fatigue>=72)return {kind:'recovery',id:'rest',fixture:f.id,title:'コーチからの休養提案',speaker:'コーチ',
   reason:'疲労がたまっている。次の試合までに回復を優先しよう。'};
  const id=c.pitching?(x.sequence%2?'breaking':'command'):(x.sequence%2?'gap':'discipline');
  return {...curricula[id],kind:'training',id,fixture:f.id};
 }
 function resolveEpisode(c,choice){
  const event=followingEvent(c);
  if(!event)return null;
  const x=episodes(c),l=life(c);
  let record;
  if(choice==='pass'){
   record={title:event.title,summary:'今回は見送った。'};
  }else if(event.kind==='training'&&choice==='live'){
   x.playing={fixture:event.fixture,id:event.id};
   return {continuing:true};
  }else if(event.kind==='training'||event.kind==='drill'){
   if(event.kind==='training'&&choice!=='basic'||event.kind==='drill'&&!['0','1','2'].includes(choice))return null;
   const live=event.kind==='drill',correct=live&&Number(choice)===event.correct,mode=live?'intense':'safe';
   if(!c.selectActivity(mode))return null;
   const growth=[];
   Life.grow(c,event.skill,correct?42:live?12:21,growth);
   c.eventGoal={id:event.id,fixture:event.fixture,mode,target:live&&event.id!=='gap'?2:1};
   record={title:event.title,summary:[live?(correct?'実戦練習で正しい判断ができた。':'コーチと判断を振り返った。'):'基礎練習で感覚を確認した。',
    ...growth,'次戦の課題 · '+event.cue].join(' ／ ')};
  }else if(event.kind==='recovery'){
   if(choice!=='rest'||!c.selectActivity('rest'))return null;
   record={title:event.title,summary:c.planReport.text};
  }else{
   if(!event.choices.some(([id])=>id===choice))return null;
   l.time=2;l.day++;
   const year=c.clubId?'pro-'+c.proYear:'school-'+c.schoolYear;
   if(event.original)record=lifeAction(c,'event',event.original,choice);
   else if(event.id==='photo-walk'){
    l.flags.photoWalk=true;friendship(l,'mei').points+=2;
    if(choice==='photo'){l.interests.photo=(l.interests.photo||0)+1;x.nextPhoto='invite';}
    else{x.nextPhoto='keepsake';x.photoYear=year;}
    chooseTime(l);
    record=put(c,event.title,choice==='photo'?'雨上がりの商店街を撮った。美玲が「人にも見せたい」と笑った。':'窓際で卒業後に行きたい街の話をした。',true,choice==='photo'?'street':'cafe');
   }else if(event.id==='photo-invite'){
    x.nextPhoto='keepsake';x.photoYear=year;chooseTime(l);friendship(l,'mei').points++;
    record=put(c,event.title,choice==='exhibit'?'二人で展示した。美玲が会場の写真を残してくれた。':'焼き増しした写真に、あの日の話を書き添えて渡した。',true,'street');
   }else if(event.id==='photo-return'){
    x.nextPhoto=null;chooseTime(l);friendship(l,'mei').points++;
    record=put(c,event.title,choice==='meet'?'同じ場所で撮り直し、昔の写真と並べた。':'移った先の写真を送ると、美玲から地元の夕景が届いた。',true,'street');
   }else if(choice==='friend')record=lifeAction(c,'friend','mei','meet');
   else record=lifeAction(c,'relax')||put(c,'家で過ごした','家で好きなものを見て、ゆっくり過ごした。',true,'cafe');
  }
  if(!record)return null;
  if(choice==='pass'&&event.id==='photo-invite'){x.nextPhoto='keepsake';x.photoYear=c.clubId?'pro-'+c.proYear:'school-'+c.schoolYear;}
  if(choice==='pass'&&event.id==='photo-return')x.nextPhoto=null;
  if(choice==='pass'&&event.original)l.flags[event.original]=true;
  x.seen[event.fixture]=choice;x.sequence++;x.playing=null;
  x.last={...record,fixture:event.fixture,choice:choice==='pass'?'今回は見送る':event.choices?.find(([id])=>id===choice)?.[1]||
   (event.kind==='drill'?event.answers[Number(choice)]:choice==='basic'?'基礎練習':'休養'),period:period(c)};
  x.history.push(x.last);if(x.history.length>60)x.history.shift();
  return x.last;
 }
 function trainingReport(c,f,metrics){
  const goal=c.eventGoal;
  if(goal?.fixture!==f.id)return [];
  c.eventGoal=null;
  const entry=curricula[goal.id],counts=metrics?.training;
  if(!counts?.attempts)return ['練習の振り返り · '+entry.title+'は対象となるプレーなし。'];
  const clear=counts.success>=goal.target,growth=[];
  Life.grow(c,entry.skill,clear?(goal.mode==='intense'?40:28):12,growth);
  const base=state(c).base;
  if(clear){base.rival=cap(base.rival+1,0,12);base.roleTrust=cap(base.roleTrust+1,0,6);}
  return ['練習の振り返り · '+entry.cue+' '+counts.success+'/'+counts.attempts+'回 · '+
   (clear?'課題達成、監督の信頼が上がった。':'次の調整に向けて記録した。'),...growth];
 }
 function autoFixtures(c){
  if(!ready(c)||!c.fixture)return [];
  const results=[],stage=c.stage,year=c.schoolYear,cup=c.cup,division=c.level;
  for(let i=0;i<3;i++){
   const f=c.fixture;
   if(!f||i&&(f.important||followingEvent(c))||c.stage!==stage||c.schoolYear!==year||c.cup!==cup||c.level!==division)break;
   if(!c.weeks[Life.week(c,f)])c.selectActivity(c.fatigue>=55||c.injury?'rest':'safe');
   if(!c.skip())break;
   results.push(c.last);
  }
  return results;
 }
 function onGame(c,f,s,rating){
  const x=state(c).base,notes=[];
  if(x.rehabFor===f.id)delete x.rehabFor;
  if(!s.games)return notes;
  c.adjustMorale(rating>=66?8:rating<40?-8:c.morale<50?2:c.morale>50?-2:0);
  x.slump=rating<39?Math.min(4,x.slump+1):Math.max(0,x.slump-1);
  if(x.slump===2&&rating<39)notes.push('不調が続いています。オフの日程からフォーム調整や休養ができます。');
  x.rival=cap(x.rival+(rating>=65?2:rating<45?-1:0),0,12);
  const role=x.goals.role;
  if(role&&!role.done){
   const clear=role.id==='convert'?c.position!==role.oldPosition&&rating>=48:rating>=52;
   if(clear&&++role.progress>=role.target){
    role.done=true;x.roleTrust=cap(x.roleTrust+3,0,6);notes.push('起用目標「'+role.label+'」を達成。監督の信頼が上がった。');
   }
  }
  const goal=x.goals.scout;
  if(goal&&!goal.done&&['school','academy'].includes(f.type)){
   const meets={'出塁力':s.h+s.bb>0,'長打力':s.tb>s.h,'守備力':s.fieldOuts>0,'走力':s.h+s.bb>=2,'先発候補':s.outs>=3&&s.allowed<=1,
    '制球力':s.outs>0&&s.walks===0,'奪三振力':s.k>=2,'救援候補':s.outs>0&&s.allowed===0};
   if((meets[goal.label]??rating>=58)&&++goal.progress>=goal.target){
    goal.done=true;x.scoutBoost[goal.clubId]=9;notes.push(NightTeams.get(goal.clubId).name+'のスカウト課題を達成した。');
   }
  }

  return notes;
 }
 window.NightCareerExtras={state,life,lifeAction,eventList,period,city,people,hobbies,hobbyChoices,collections,apartments,furniture,cafes,teamTraining,
  baseballPlans,book,practiceWeekStart,quickDrill,practicePitch,practiceAnswer,autoFixtures,onGame,episodes,followingEvent,resolveEpisode,trainingReport,curricula};
})();
