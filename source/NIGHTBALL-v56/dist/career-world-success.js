/* Weekly player-first training and story events for the international career.
   Original NIGHTBALL story content; isolated from the legacy career save. */
(()=>{
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const bats=['contact','power','run','field','arm'];
 const arms=['velocity','control','movement','stamina'];
 const drills={
  contact:[
   ['追い込まれた場面。まず意識するのは？',['力任せに振る','球を長く見て芯で捉える','目を閉じてタイミングを取る'],1],
   ['外角の変化球を打ち返したい。どうする？',['引っ張り一択','上体を早く開く','逆方向にも打てる姿勢を保つ'],2],
   ['打撃練習でミスが続いている。何を直す？',['軸足とミート位置を確認','バットを重くするだけ','全ての球を強振する'],0]
  ],
  power:[
   ['長打を増やしたい。スイングで重視するのは？',['腰の回転と下半身の連動','腕だけで振り回す','毎球バントする'],0],
   ['高めの甘い球。強振するときの判断は？',['見逃すと決める','自分の打てる高さなら振る','当てにいくだけ'],1],
   ['疲れがある日の長打練習。適切なのは？',['フォームを崩して振り続ける','全力で千本振る','本数を絞って質を高める'],2]
  ],
  run:[
   ['一塁走者で投手が牽制の構え。どうする？',['リードを調整して帰塁に備える','必ず走る','ベースを離れて待つ'],0],
   ['二塁へのスタートが遅れる原因は？',['打球方向を見る','第一歩の姿勢と反応が遅い','ベースを見つめる'],1],
   ['外野への浅い飛球。走者として優先するのは？',['無条件で進塁','捕球前に次塁へ全力疾走','捕球と走者の状況を確認'],2]
  ],
  field:[
   ['ゴロを処理する基本姿勢は？',['正面に入り腰を低くする','立ったまま手だけ伸ばす','打球から目を離す'],0],
   ['強い打球が来た。まず意識するのは？',['送球先だけ考える','捕球点に足を運ぶ','先に投げる動作に入る'],1],
   ['一塁送球の前に必要なのは？',['慌てて投げる','目を閉じる','握り替えと体勢を整える'],2]
  ],
  arm:[
   ['正確な送球をするには？',['体重移動と腕の振りを合わせる','腕だけを速く動かす','踏み出さず投げる'],0],
   ['遠投で球が抜ける。見直すのは？',['球速だけ','リリース位置と踏み出し','捕球姿勢を無視する'],1],
   ['送球練習後に肩が重い。どうする？',['さらに100球投げる','無理にフォームを変える','負荷を下げて回復を図る'],2]
  ],
  velocity:[
   ['球速を上げるフォーム。基本は？',['下半身から力を伝える','腕だけで投げる','踏み出しを止める'],0],
   ['球速を維持するために大切なのは？',['全力投球だけ','体幹と下半身の連動','制球を捨てる'],1],
   ['投球後に肩が重い。どうする？',['もう一球全力','連投で慣らす','負荷を調整して回復する'],2]
  ],
  control:[
   ['四球が続いている。見直すべき点は？',['毎球球種を変える','リリースの再現性','常に全力投球'],1],
   ['ストライクを取りたい。狙いを定めるには？',['捕手のミットを見てフォームを整える','球の行方を見ない','力いっぱい投げる'],0],
   ['制球練習で意識することは？',['肩を開く','腕だけで操作する','一定のステップ幅を保つ'],2]
  ],
  movement:[
   ['変化球の精度を上げるには？',['毎球握りを変える','同じ腕の振りを再現する','無理に大きく曲げる'],1],
   ['変化球が抜けたときに確認するのは？',['指のかかりとリリース','球種を全部捨てる','全力だけを増やす'],0],
   ['打者のタイミングを外すには？',['どの球も同じ高さ','直球を投げない','直球との球速差を活かす'],2]
  ],
  stamina:[
   ['先発として長い回を投げるには？',['序盤から毎球全力','強弱をつけた配球','走り込みだけ'],1],
   ['投球数が増えてきた。フォームは？',['下半身を使い再現性を保つ','上体だけで投げる','力み続ける'],0],
   ['登板翌日の回復で重要なのは？',['無理な投げ込み','何も飲まない','睡眠・栄養・軽い調整'],2]
  ]
 };
 const scenes={
  school:[
   {id:'captain',title:'先輩からの挑戦状',body:'練習後、先輩が声をかけてきた。「次の紅白戦、俺からレギュラーを奪うつもりで来い」',
    choices:[['特訓をお願いする','先輩と守備や打撃を繰り返した。',-9,3,2,2,'field'],['自分の課題を整理する','ノートに弱点を書き、次の練習の目標を決めた。',3,1,2,0,'contact']]},
   {id:'friend',title:'放課後の寄り道',body:'{friend}から「帰りに少し寄っていかない？」と誘われた。明日も練習がある。',
    choices:[['一緒に出かける','帰り道で野球の悩みを話し、少し気持ちが軽くなった。',-3,8,0,8,null],['明日の練習に備える','約束は次の休みにして、早めに帰宅した。',10,1,1,1,null]]},
   {id:'coach',title:'監督の個別面談',body:'監督が「次の試合で何を見せたい？」と聞いてきた。',
    choices:[['自分の武器を宣言する','目標を言葉にして伝えた。次の出場に向け評価が上がった。',-4,3,4,0,null],['チームへの貢献を伝える','控えでも役割を果たす決意が伝わった。',0,3,3,5,null]]},
   {id:'festival',title:'文化祭の準備',body:'クラスの出し物の準備が遅れている。部活の時間も迫ってきた。',
    choices:[['仲間の準備を手伝う','みんなで作業し、文化祭が成功した。',-8,9,0,8,null],['練習後に合流する','練習を終えてから急いで駆けつけた。',-5,4,2,2,null]]},
   {id:'rival',title:'ライバルとの勝負',body:'同じ守備位置の{friend}が「次の試合、どちらが結果を残すか勝負だ」と笑う。',
    choices:[['勝負を受ける','お互いに刺激を受けた。監督もその姿を見ていた。',-8,3,4,5,null],['一緒に研究する','互いのフォームを確認し、新しい発見があった。',-4,5,2,8,'contact']]},
   {id:'senior',title:'先輩の最後の夏',body:'最後の夏を迎える先輩から「緊張しても、自分のプレーを忘れるな」と声をかけられた。',
    choices:[['全力で応える','先輩の言葉を胸に、練習で一段と集中した。',-9,5,3,2,null],['先輩の経験を聞く','失敗から学んだことを教えてもらった。',-2,6,1,6,null]]},
   {id:'scout',title:'スカウトの視線',body:'練習試合のスタンドにスカウトがいるらしい。周囲も少し緊張している。',
    choices:[['いつも通りのプレーを心がける','落ち着いて自分の持ち味をアピールした。',-5,3,3,0,null],['得意なプレーを磨く','得意分野に集中して存在感を示した。',-8,2,2,0,null]]}
   ,{id:'tryout',title:'初めての紅白戦',body:'監督から紅白戦のメンバーに呼ばれた。結果を出せば次の大会でベンチ入りできるかもしれない。',
    choices:[['自分の得意なプレーを見せる','自分の武器を信じて勝負した。',-12,6,5,2,null],['まずは確実なプレーに徹する','大きなミスをせず、監督から安定感を評価された。',-5,4,4,2,null]]},
   {id:'injury',title:'同期の故障',body:'同級生が足を痛めて練習を離れた。試合に出られない辛さを目の当たりにする。',
    choices:[['練習を手伝って励ます','一緒にリハビリを続け、仲間の信頼が深まった。',-6,5,0,9,null],['自分も体のケアを見直す','無理せず成長する方法を学んだ。',8,3,1,3,null]]},
   {id:'entrance',title:'新入部員の入部',body:'新しい後輩が入部した。「先輩、守備のコツを教えてください」と練習を頼まれた。',
    choices:[['時間をかけて教える','後輩の成長を見て、自分のフォームも見直せた。',-9,6,2,8,'field'],['一緒にメニューを考える','練習方法を相談し、互いに良い刺激になった。',-5,6,2,6,null]]},
   {id:'summer',title:'夏の大会が迫る',body:'組み合わせが発表された。最後の夏になる先輩たちの表情が引き締まっている。',
    choices:[['試合に備えて練習する','緊張感の中で、いつもより集中して練習した。',-11,5,4,2,null],['全員で対戦相手を研究する','仲間と映像を見て作戦を練った。',-4,7,3,7,null]]},
   {id:'loss',title:'敗戦のあとで',body:'大事な試合に敗れた。帰りのバスでは、誰もが言葉を探していた。',
    choices:[['次に向けて練習する','敗戦を忘れないために、課題を書き出した。',-8,3,2,2,null],['仲間と気持ちを分かち合う','一人ではないことに気づき、また前を向けた。',1,10,1,9,null]]},
   {id:'festival2',title:'文化祭の思い出',body:'文化祭の準備中、{friend}が手伝いに来た。野球以外の一面を初めて知った。',
    choices:[['一緒に出し物を担当する','忙しい一日だったが、忘れられない思い出になった。',-5,10,0,8,null],['部活の皆も招待する','部員たちの笑顔を見て、チームの結束が強まった。',-8,8,2,9,null]]},
   {id:'study',title:'テスト週間',body:'定期試験が近づいている。練習と勉強の両立をどうしよう。',
    choices:[['先に勉強を済ませる','気持ちに余裕が生まれ、週末の練習にも集中できた。',4,4,1,3,null],['仲間と勉強会を開く','部員同士で苦手な問題を教え合った。',-4,8,1,7,null]]},
   {id:'trip',title:'修学旅行',body:'遠征でもない旅行の朝。{friend}が「今日は野球のこと忘れよう」と誘ってきた。',
    choices:[['一緒に街を巡る','いつもと違う景色の中、たくさん笑った。',4,12,0,9,null],['早朝に軽く体を動かす','旅先でもいつもの習慣を守った。',-3,7,1,2,null]]},
   {id:'graduation',title:'卒業前の約束',body:'卒業式が近づいた。「いつかプロで対戦しよう」と{friend}が手を差し出す。',
    choices:[['必ず対戦しようと約束する','未来の試合を想像しながら、固く握手した。',-2,11,1,9,null],['いつか同じ球団に入ろうと笑う','離れてもつながる仲間ができた。',3,10,1,8,null]]}
  ],
  pro:[
   {id:'rookie',title:'先輩選手の助言',body:'練習後、同じ守備位置の先輩が「試合に出る前の準備が大事だ」と話す。',
    choices:[['一緒に練習する','細かな動きまで確認し、手応えを得た。',-9,4,3,5,'field'],['練習法を聞く','プロの調整方法を学んだ。',1,4,2,4,null]]},
   {id:'media',title:'ファンからの手紙',body:'応援してくれるファンから手紙が届いた。そこには、次の試合も楽しみにしていると書かれている。',
    choices:[['返事を書く','丁寧に返事を書いた。野球を続ける理由を思い出した。',-2,9,0,4,null],['練習で応える','次の試合でいいプレーを見せようと決意した。',-8,4,2,2,null]]},
   {id:'former',title:'高校時代の仲間から連絡',body:'高校時代に一緒に汗を流した選手から「最近どう？」と連絡が来た。',
    choices:[['近況を話し合う','久しぶりの会話に、あの頃の気持ちがよみがえった。',-2,9,0,6,null],['次の対戦を約束する','また同じグラウンドで勝負しようと約束した。',-4,5,2,5,null]]},
   {id:'coach',title:'打撃・投球コーチとの面談',body:'コーチから「最近の調子についてどう考えている？」と尋ねられた。',
    choices:[['課題を正直に話す','改善点を整理し、指導方法を一緒に考えた。',-3,4,3,2,null],['自信のある部分を伝える','持ち味を生かした起用を検討してくれることになった。',-3,5,2,2,null]]}   ,{id:'slump',title:'打てない日が続く',body:'コーチに呼び止められた。「結果が出ないときほど、何を続けるかが大事だ」',
    choices:[['基本練習をやり直す','焦らず自分のフォームを確認した。',-8,6,3,3,null],['少し休んで切り替える','体を休めて次の試合への準備を整えた。',10,8,1,2,null]]},
   {id:'contract',title:'年俸の話題',body:'ロッカールームで来季の契約の話になった。{friend}も将来を考えているようだ。',
    choices:[['まずは今季の成績に集中する','目の前の一打席に集中しようと決めた。',-3,6,2,2,null],['キャリアの目標を話す','互いの夢を知って刺激を受けた。',-1,7,1,7,null]]},
   {id:'rivalpro',title:'レギュラー争い',body:'同じ守備位置の{friend}が試合後に声をかけてきた。「次は俺が先発するからな」',
    choices:[['負けないと返す','競争心に火がつき、練習の集中力が高まった。',-8,6,4,2,null],['共に強くなろうと伝える','互いに助言しながら高め合う関係になった。',-5,6,2,8,null]]},
   {id:'travel',title:'遠征先の休日',body:'遠征の合間に少し時間が空いた。{friend}から街を歩こうと誘われた。',
    choices:[['街を散策する','違う景色に触れ、気分を切り替えられた。',3,10,0,7,null],['宿で体を休める','次の試合に向けて疲れを取った。',12,5,1,1,null]]},
   {id:'mentor',title:'ベテランからの教え',body:'長年チームを支えるベテランが、試合前のルーティンについて話してくれた。',
    choices:[['技術を教わる','細かな動作の違いが、結果を左右することに気づいた。',-6,5,3,5,null],['失敗談を聞く','どんな選手も失敗を重ねてきたと知った。',2,8,1,6,null]]},
   {id:'abroad',title:'海外リーグの話',body:'海外でプレーした経験のある選手と話した。言葉も文化も違う環境での挑戦に興味が湧く。',
    choices:[['挑戦について詳しく聞く','いつか海を渡ることを具体的に考え始めた。',-3,8,2,5,null],['今のチームで成長すると伝える','まずは目の前の役割を果たそうと決意した。',-4,5,3,3,null]]},
   {id:'playoffs',title:'シーズン終盤の緊張感',body:'上位争いが激しくなり、チーム内の空気が変わってきた。',
    choices:[['仲間を鼓舞する','声を出し、チーム全体の士気が高まった。',-5,8,3,8,null],['自分の調整に集中する','冷静な準備を評価された。',0,5,3,2,null]]}

  ]
 };
 const isPlaying=w=>['school','amateur','pro'].includes(w.stage);
 const week=w=>{
  const d=new Date(w.day+'T00:00:00Z');
  const offset=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-offset);
  return d.toISOString().slice(0,10);
 };
 function state(w){
  const s=w.success ||= {energy:76,morale:58,actionWeek:null,menu:null,pending:null,seen:{},stories:[],last:null,gameCount:0};
  s.energy=clamp(Number.isFinite(s.energy)?s.energy:76,0,100);
  s.morale=clamp(Number.isFinite(s.morale)?s.morale:58,0,100);
  s.seen ||= {};s.stories ||= [];
  return s;
 }
 const usable=w=>isPlaying(w)&&!w.currentGame&&!w.queue;
 const available=w=>usable(w)&&!state(w).pending&&state(w).actionWeek!==week(w);
 function mark(w,title,summary){
  const s=state(w);
  s.actionWeek=week(w);s.menu=null;s.pending=null;
  s.last={day:w.day,title,summary};
  s.stories.push(s.last);
  if(s.stories.length>90)s.stories.shift();
  w.note(title+' · '+summary);
  w.player.form=clamp(Math.round((s.morale-50)/7),-7,7);
 }
 function scene(w,kind){
  const s=state(w),pool=scenes[w.stage==='pro'?'pro':'school'];
  const unused=pool.filter(e=>!s.seen[e.id+'/'+w.grade]);
  const picks=unused.length?unused:pool;
  const rng=w.random('success/story/'+kind+'/'+week(w));
  const event=picks[Math.floor(rng()*picks.length)];
  s.seen[event.id+'/'+w.grade]=true;
  const fellow=w.members(w.player.club).find(p=>p.id!==w.player.id&&p.pos===w.player.pos)||
   w.members(w.player.club).find(p=>p.id!==w.player.id);
  const friend=fellow?.name||'チームメイト';
  return {type:'story',id:event.id,title:event.title,body:event.body.replaceAll('{friend}',friend),
   friendId:fellow?.id||null,choices:event.choices.map(([label,text,energy,morale,manager,bond,skill])=>({
    label,text,energy,morale,manager,bond,skill
   }))};
 }
 function action(w,kind){
  if(!available(w))return false;
  const s=state(w);
  if(kind==='practice'||kind==='special'){
   if(s.energy<(kind==='special'?32:12))return false;
   s.menu=kind;return true;
  }
  if(kind==='rest'){
   s.energy=clamp(s.energy+31,0,100);
   s.morale=clamp(s.morale+5,0,100);
   w.health.fatigue=Math.max(0,w.health.fatigue-25);
   w.health.slump=Math.max(0,w.health.slump-.5);
   mark(w,'休養','体を休めてコンディションを整えた。');
   return true;
  }
  if(kind==='friend'||kind==='outing'){
   s.menu=null;
   s.pending=scene(w,kind);
   if(kind==='outing')s.pending.body='休日に出かけた帰り、'+s.pending.body;
   return true;
  }
  return false;
 }
 const goalLabels={
  contact:'次の出場で安打を記録',power:'次の出場で長打を記録',
  run:'次の出場で出塁する',field:'次の出場を失策なしで終える',
  arm:'次の出場を失策なしで終える',velocity:'次の登板で2奪三振',
  control:'次の登板を2失点以内に抑える',movement:'次の登板で2奪三振',
  stamina:'次の登板で3イニング以上投げる'
 };
 const challengeTexts={
  contact:['速球への対応','追い込まれた打席','走者を返す一打'],
  power:['甘い球を狙う','長打を放つ集中力','逆方向への強い打球'],
  run:['スタートの第一歩','二塁への加速','状況判断とスピード'],
  field:['正面のゴロ','左右への一歩','素早い捕球と送球'],
  arm:['一塁への正確な送球','体勢を変えた送球','素早い握り替え'],
  velocity:['球威のある直球','下半身を使った投球','連続投球のフォーム'],
  control:['低めへの制球','走者を背負った投球','追い込んでからの一球'],
  movement:['変化球の握り','直球との組み合わせ','打者のタイミングを外す'],
  stamina:['長い回を想定した投球','ペース配分','疲労時のフォーム']
 };
 const tactics=[
  ['確実に決める（成功しやすい・成長は小）',.82,1],
  ['普段どおり挑む（バランス重視）',.61,2],
  ['大胆に挑戦（失敗しやすい・大成長）',.40,3.6]
 ];
 function skill(w,key){
  if(!available(w)||!Object.hasOwn(goalLabels,key))return false;
  const s=state(w),menu=s.menu;
  if(!['practice','special'].includes(menu))return false;
  if(!(w.pitching?arms:bats).includes(key))return false;
  const hard=menu==='special';
  if(s.energy<(hard?32:12))return false;
  if(hard){
   s.pending={type:'drill',title:'実戦特訓 · '+NightCareerWorld.training[key],
    skill:key,hard:true,index:0,correct:0,points:0,results:[]};
   s.menu=null;return true;
  }
  // Normal practice is a single meaningful weekly choice. Talent, fatigue and
  // luck produce excellent days, ordinary growth, stalls and rare setbacks.
  const rng=w.random('success/weekly-practice/'+week(w)+'/'+key);
  const condition=clamp((s.energy-60)*.0018+(s.morale-50)*.001, -.09,.09);
  const chance=rng()+condition;
  const outcome=chance<.07?'失敗':chance<.24?'不調':chance<.81?'成功':'大成功';
  const delta={失敗:-.28,不調:.32,成功:1.08,大成功:2.45}[outcome];
  w.improve(key,delta);
  w.trainingPlan=key;
  const injuryRisk=s.energy<35&&rng()<.11;
  if(injuryRisk)w.health.injury=Math.max(w.health.injury,3+Math.floor(rng()*7));
  s.energy=clamp(s.energy-18,0,100);
  s.morale=clamp(s.morale+(outcome==='大成功'?7:outcome==='失敗'?-6:outcome==='不調'?-2:2),0,100);
  w.health.fatigue=clamp(w.health.fatigue+9,0,100);
  w.ratings.coach=clamp(w.ratings.coach+(delta>0?1.2:-.4),0,100);
  w.experience+=outcome==='大成功'?3:outcome==='成功'?1:0;
  if(w.stage==='school'&&outcome==='大成功')w.scoutLevel=clamp(w.scoutLevel+.75,0,95);
  s.goal={skill:key,label:goalLabels[key],day:w.day};
  mark(w,'通常練習 · '+NightCareerWorld.training[key],outcome+' · '+
   (outcome==='大成功'?'思いがけない手応えがあった。':outcome==='失敗'?'調子が合わず、修正点が見えた。':
    outcome==='不調'?'伸び悩んだが、課題が残った。':'着実に手応えを積み重ねた。')+
   (injuryRisk?' 軽い故障が発生。':''));
  return true;
 }
 function openEvent(w){
  const s=state(w);
  if(!usable(w)||s.pending||!s.inbox)return false;
  s.pending=s.inbox;s.inbox=null;return true;
 }
 function choose(w,value){
  const s=state(w),e=s.pending;
  if(!usable(w)||!e)return false;
  const number=Number(value);
  if(!Number.isInteger(number)||number<0)return false;
  if(e.type==='drill'){
   if(number>=tactics.length||e.index>=3)return false;
   const [label,base,reward]=tactics[number];
   const rng=w.random('success/challenge/'+week(w)+'/'+e.skill+'/'+e.index);
   const ability=(w.player[e.skill]||55)-(e.skill==='velocity'?135:55);
   const chance=clamp(base+ability*.0035+(s.morale-50)*.001-(60-s.energy)*.0015,.19,.96);
   const success=rng()<chance;
   const points=success?reward:-.45-number*.35;
   e.points=(e.points||0)+points;
   e.results.push({tactic:label,correct:success,message:success?'成功！ '+label.split('（')[0]+'が決まった。':'失敗。次の挑戦で取り返そう。'});
   if(success)e.correct++;
   e.index++;
   if(e.index<3)return true;
   const perfect=e.correct===3,breakthrough=e.points>=6;
   const boost=clamp(.16+e.points*.29,-.55,3.6);
   w.improve(e.skill,boost);
   w.trainingPlan=e.skill;
   w.experience+=Math.max(0,Math.round(e.points));
   w.ratings.coach=clamp(w.ratings.coach+(breakthrough?3:e.correct>=2?1.5:-.5),0,100);
   s.energy=clamp(s.energy-34,0,100);
   s.morale=clamp(s.morale+(breakthrough?8:perfect?6:e.correct===0?-8:-1),0,100);
   w.health.fatigue=clamp(w.health.fatigue+17,0,100);
   const injuryRisk=e.correct===0&&rng()<.07;
   if(injuryRisk)w.health.injury=Math.max(w.health.injury,3+Math.floor(rng()*11));
   if(w.stage==='school'&&breakthrough)w.scoutLevel=clamp(w.scoutLevel+1.5,0,95);
   s.goal={skill:e.skill,label:goalLabels[e.skill],day:w.day};
   mark(w,e.title,e.correct+'/3回成功 · '+(breakthrough?'大成功！ いつも以上の成長。':
    e.correct>=2?'しっかり手応えをつかんだ。':'思うようにいかず、次週への課題が残った。')+
    (injuryRisk?' 無理がたたり、軽い故障が発生。':''));
   return true;
  }
  if(e.type==='story'){
   const choice=e.choices[number];
   if(!choice)return false;
   s.energy=clamp(s.energy+choice.energy,0,100);
   s.morale=clamp(s.morale+choice.morale,0,100);
   w.ratings.manager=clamp(w.ratings.manager+choice.manager,0,100);
   w.ratings.trust=clamp(w.ratings.trust+choice.bond*.35,0,100);
   const friend=e.friendId&&w.person(e.friendId);
   if(friend)friend.relationship=clamp((friend.relationship||40)+choice.bond,0,100);
   if(choice.skill&&Object.hasOwn(w.player,choice.skill))w.improve(choice.skill,.5);
   w.experience+=1;
   if(e.id==='scout'&&w.stage==='school')w.scoutLevel=clamp(w.scoutLevel+1.5,0,95);
   mark(w,e.title,choice.text);
   return true;
  }
  return false;
 }
 function afterGame(w,f,stats){
  if(!stats?.g)return;
  const s=state(w);
  s.gameCount++;
  if(f.kind==='school'&&s.gameCount===1){
   s.morale=clamp(s.morale+8,0,100);
   w.note('初めての試合経験。これからの成長につながる一日になった。');
  }
  if(stats.hr||stats.sv){
   s.morale=clamp(s.morale+4,0,100);
  }
  if(s.goal&&['school','regular','farm','post','asia'].includes(f.kind)){
   const skill=s.goal.skill;
   const met=skill==='contact'?stats.h>=1:skill==='power'?stats.tb>=2:skill==='run'?stats.h+stats.bb>0:
    skill==='field'||skill==='arm'?stats.errors===0:
    skill==='velocity'||skill==='movement'?stats.k>=2:skill==='control'?stats.er<=2:stats.outs>=9;
   if(met){
    w.ratings.manager=clamp(w.ratings.manager+2.5,0,100);
    w.experience+=2;
    s.morale=clamp(s.morale+4,0,100);
   }
   w.note('練習の課題 · '+s.goal.label+'：'+(met?'達成！ 監督から評価された。':'今回は未達成。次の練習に活かそう。'));
   s.goal=null;
  }
 }
 function tick(w){
  const s=state(w);
  s.energy=clamp(s.energy+1,0,100);
  if(s.morale<50)s.morale=Math.min(50,s.morale+.2);
  w.player.form=clamp(Math.round((s.morale-50)/7),-7,7);
 }
 function semester(w){
  const s=state(w);
  s.morale=clamp(s.morale+4,0,100);
  s.goal=null;
  s.last={day:w.day,title:'新しい学年',summary:'先輩の姿を思い出しながら、次の大会に向けて練習が始まった。'};
  s.stories.push(s.last);
  if(s.stories.length>90)s.stories.shift();
 }
 const currentQuestion=w=>{
  const e=state(w).pending;
  return e?.type==='drill'?[challengeTexts[e.skill]?.[e.index]||'集中してプレーを決めよう',tactics.map(t=>t[0])]:null;
 };
 window.NightCareerWorldSuccess={state,week,available,action,skill,choose,openEvent,afterGame,tick,semester,currentQuestion};
})();
