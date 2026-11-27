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
  s.seen ||= {};s.stories ||= [];s.xp ||= {strength:0,skill:0,speed:0,mental:0};s.autoAllocate ??= false;s.autoTrain ??= false;s.quickAdvance ??= true;s.specialTraining ??= false;s.plan ||= w.trainingPlan||(w.pitching?'control':'contact');
  return s;
 }
 const usable=w=>isPlaying(w)&&!w.currentGame&&!w.queue;
 const days=(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/86400000);
 function cast(w){
  const s=state(w),c=s.cast||={};
  const peers=w.members(w.player.club).filter(p=>p.id!==w.player.id);
  if(!c.friend){const p=peers.find(p=>p.born===w.player.born&&p.pos!==w.player.pos)||peers.find(p=>p.pos!==w.player.pos);if(p)c.friend=p.id;}
  if(!c.rival){const rivals=peers.filter(p=>p.pos===w.player.pos),same=rivals.filter(p=>p.born===w.player.born);const p=(same.length?same:rivals).sort((a,b)=>w.ability(b)-w.ability(a))[0];if(p)c.rival=p.id;}
  if(c.rival&&!w.archRivalId)w.archRivalId=c.rival;
  return c;
 }
 function coach(w){
  const s=state(w),club=w.player.club||'none';s.coaches||={};
  if(!s.coaches[club]){const r=w.random('coach/'+club),keys=w.pitching?arms:bats;s.coaches[club]={style:['育成重視','実力主義','技術重視'][Math.floor(r()*3)],specialty:keys[Math.floor(r()*keys.length)],bond:30};}
  return s.coaches[club];
 }
 const ch=(label,text,e={})=>({label,text,...e});
 function queueEvent(w,id,title,body,choices,meta={}){
  const s=state(w);if(!s.storyMode)return false;s.eventSeen||={};s.eventQueue||=[];
  if(s.eventSeen[id])return false;s.eventSeen[id]=true;
  s.eventQueue.push({type:'story',id,title,body,choices:choices.map(c=>({energy:0,morale:0,manager:0,bond:0,...c})),forced:true,optional:true,...meta});return true;
 }
 function activate(w){const s=state(w);s.storyMode=true;syncExperience(w);if(w.life?.married)w.life.partner=true;refresh(w);return s;}
 function mission(w){
  const s=state(w),school=w.stage==='school',pro=w.stage==='pro',stats=school?w.schoolTotals:pro?w.playerYear:null;
  if(!stats)return null;
  const key=school?'school-'+w.grade:'pro-'+w.proYear;
  if(s.mission?.key!==key){const goal=school?[3,8,12][w.grade-1]:w.proYear<=2?5:w.proYear<=5?12:18;s.mission={key,label:(w.pitching?'奪三振 ':'安打 ')+goal,target:goal,base:school?(w.pitching?stats.k:stats.h):0,done:false};}
  const x=s.mission;x.value=Math.max(0,(w.pitching?stats.k:stats.h)-x.base);
  if(!x.done&&x.value>=x.target){x.done=true;s.xp.mental+=5;s.xp.skill+=5;queueEvent(w,'mission/'+key,'目標達成！',x.label+'を達成。経験点を獲得した。',[ch('次の目標へ','次のステップへ進もう。',{morale:5,manager:2})]);}
  return x;
 }
 function refresh(w){
  const s=state(w);if(!s.storyMode||w.currentGame)return false;
  const c=cast(w),friend=c.friend&&w.person(c.friend),rival=c.rival&&w.person(c.rival),fn=friend?.name||'同期の仲間',rn=rival?.name||'ライバル',staff=coach(w);
  const school=w.stage==='school',pro=w.stage==='pro';s.arc||={};
  if(school){
   if(w.grade===1&&w.schoolCursor===0&&!s.actionWeek)queueEvent(w,'entrance','入部式','監督は'+staff.style+'。同期の'+fn+'、ライバルの'+rn+'と出会った。',[ch('レギュラーを目指す','監督に目標を伝えた。',{manager:3,coachBond:3}),ch('仲間と成長する','同期と練習する約束をした。',{bond:8,morale:4})],{friendId:friend?.id,arc:'entry'});
   if(w.grade>=2)queueEvent(w,'grade/'+w.grade,'新学年のスタート','新入生が加わり、競争が変わる。',[ch('自分の課題に集中','新しい目標を立てた。',{coachBond:4}),ch('後輩を支える','チームの信頼が増した。',{bond:6,manager:2})],{friendId:friend?.id});
   if(w.grade===1&&w.schoolCursor>=1)queueEvent(w,'assessment','実力測定・背番号発表','監督が現在の実力を確認した。'+(w.ability(w.player)>=45?'上級生との競争に加われそうだ。':'まだ基礎を磨く必要がある。'),[ch('弱点を鍛える','指導を受けることにした。',{coachBond:7,manager:2}),ch('得意なプレーを伸ばす','武器を磨く。',{morale:5})]);
   if(friend&&friend.club===w.player.club&&friend.relationship>=65)queueEvent(w,'friendship/'+friend.id,'友情練習の始まり',fn+'と一緒に練習すると成長しやすくなった。',[ch('一緒に強くなる','絆が深まった。',{bond:7,morale:5})],{friendId:friend.id,arc:'friendship'});
   if(w.grade>=2&&rival)queueEvent(w,'rival-2','ライバルとの約束',rn+'との能力差は'+Math.round(w.ability(rival)-w.ability(w.player))+'。最後の大会まで競い合う。',[ch('一緒に自主練習','互いに教え合った。',{bond:9,coachBond:2}),ch('必ず追い越す','競争心が高まった。',{morale:8,manager:2})],{friendId:rival.id,arc:'rival2'});
   if(w.grade===3&&w.schoolCursor>=1)queueEvent(w,'rival-3','最後の一年',rn+'と卒業後の進路を語り合った。',[ch('プロで再会しよう','将来の対戦を約束した。',{bond:8,morale:6}),ch('今の大会を優先','最後までチームに尽くす。',{manager:4})],{friendId:rival?.id,arc:'rival3'});
   if(w.grade===3&&w.scoutLevel>=10)queueEvent(w,'scout-meeting','スカウトの視察','プロのスカウトが練習を見に来た。',[ch('武器を見せる','印象を残した。',{scout:3,morale:3}),ch('普段どおり','落ち着いてプレーした。',{coachBond:5})]);
  }
  if(pro){
   if(w.proYear===1)queueEvent(w,'pro-entry','プロ入団会見','新しい球団でプロ野球人生が始まる。',[ch('一軍定着を宣言','決意を伝えた。',{fans:4,manager:2}),ch('実力を磨く','コーチと目標を確認した。',{coachBond:7})]);
   if(rival?.club&&w.clubCountry(rival.club)&&s.arc.rival3!==undefined)queueEvent(w,'rival-reunion','プロでの再会',rn+'もプロの世界でプレーしている。あの約束を思い出した。',[ch('連絡を取る','交流が続いた。',{bond:8,morale:4}),ch('グラウンドで勝負','競争を意識した。',{morale:7})],{friendId:rival.id,arc:'reunion'});
   if(w.ratings.fans>=35)queueEvent(w,'sponsor','スポンサーからの誘い','成績と人気が評価され、企業から契約の話が来た。',[ch('契約する','年間の副収入が増える。',{sponsor:true,fans:3}),ch('競技に集中','今回は見送った。',{coachBond:4})]);
   if(w.age>=20&&!w.life.partner&&w.ratings.fans>=15)queueEvent(w,'partner','新しい出会い','知人の紹介で野球を応援してくれる人と知り合った。',[ch('交流を続ける','少しずつ距離を縮めていく。',{partner:true,morale:6}),ch('今は野球に集中','友人として付き合う。',{coachBond:3})]);
   if(w.life.partner&&!w.life.married&&w.life.relationship>=6)queueEvent(w,'marriage','将来について','支えてくれた相手と将来を話し合う時が来た。',[ch('結婚する','新しい生活が始まった。',{marry:true,morale:10}),ch('もう少し待つ','互いの時間を大切にする。',{morale:3})]);
   if(w.age>=35)queueEvent(w,'veteran','世代交代','若い選手の台頭を感じる。',[ch('後輩を育てる','チームに貢献する。',{manager:4,coachBond:5}),ch('現役で結果を残す','競争を続ける決意をした。',{morale:8})]);
  }
  if(w.stage==='draft')queueEvent(w,'draft-prep/'+w.year,'進路を決める日','これまでの成績と評価がドラフトにつながる。',[ch('次へ','努力を信じよう。')]);
  if(w.stage==='offseason')queueEvent(w,'review/'+w.year,'シーズン総括',w.history?.at(-1)?.awards?.length?'タイトルを獲得した一年。来季の目標を考えよう。':'今季の結果を振り返り、来季の進路を考えよう。',[ch('来季へ向けて準備','新しい目標を決めた。',{morale:4})]);
  if(w.health.injury>=14&&!s.injuryAnnounced){s.injuryAnnounced=true;queueEvent(w,'injury/'+w.day,'長期離脱','故障で'+w.health.injury+'日ほど離脱する見込み。',[ch('治療に専念','回復を優先する。',{energy:8,morale:2}),ch('気持ちを切り替える','復帰後を見据える。',{morale:5})]);}
  if(!w.health.injury)s.injuryAnnounced=false;
  if(w.health.slump>=2&&!s.slumpAnnounced){s.slumpAnnounced=true;queueEvent(w,'slump/'+w.day,'不振が続く','コーチから助言を受けた。',[ch('基礎に戻る','フォームを見直した。',{slump:-1,coachBond:4}),ch('休養を取る','心身をリセットした。',{energy:12,morale:6,slump:-.7})]);}
  if(w.health.slump<.6)s.slumpAnnounced=false;
  mission(w);
  if(!s.pending&&s.eventQueue?.length){s.pending=s.eventQueue.shift();s.menu=null;}
  return !!s.pending;
 }
 function randomStory(w){
  const s=state(w);if(!s.storyMode||!isPlaying(w)||s.pending||s.eventQueue?.length)return;
  const r=w.random('forced-event/'+week(w)),gap=days(w.day,s.lastForcedDay||'2000-01-01'),school=w.stage!=='pro';
  if(gap<(school?12:19)||r()>(school?.48:.36))return;
  const roll=r();
  if(roll<.13){const keys=w.pitching?arms:bats,key=keys[Math.floor(r()*keys.length)];queueEvent(w,'growth/'+week(w),'練習の手応え',trainingNames[key]+'に手応えを感じた。',[ch('さらに伸ばす','成長のきっかけをつかんだ。',{skill:key,bonus:2}),ch('焦らず続ける','自信がついた。',{morale:7})]);}
  else if(roll<.25)queueEvent(w,'bad-form/'+week(w),'フォームの乱れ','いつも通りの動きができない。',[ch('コーチに相談','助言を受けて修正した。',{coachBond:6,energy:-6,slump:.5}),ch('自分で修正','試行錯誤を始めた。',{slump:1.2,morale:-3})]);
  else if(roll<.31){const c=coach(w);c.style=c.style==='実力主義'?'育成重視':'実力主義';c.bond=Math.max(20,c.bond-8);queueEvent(w,'staff/'+week(w),'指導方針の変化','指導者の方針が'+c.style+'に変わった。',[ch('方針に合わせる','信頼を築き直す。',{coachBond:6}),ch('持ち味を守る','自分のスタイルを大切にした。',{morale:5})]);}
  else{const e=scene(w,'ambient');queueEvent(w,'random/'+week(w),e.title,e.body,e.choices,{friendId:e.friendId});}
 }

 const available=w=>usable(w)&&!state(w).pending&&state(w).actionWeek!==week(w);
 function mark(w,title,summary,consume=true){
  const s=state(w);
  if(consume)s.actionWeek=week(w);s.menu=null;s.pending=null;
  s.last={day:w.day,title,summary};
  s.stories.push(s.last);
  if(s.stories.length>90)s.stories.shift();
  w.note(title+' · '+summary);
  w.player.form=clamp(Math.round((s.morale-50)/7),-7,7);
 }
 function scene(w,kind){
  const s=state(w),month=Number(w.day.slice(5,7));
  const pool=scenes[w.stage==='pro'?'pro':'school'].filter(e=>
   e.id!=='graduation'||w.stage!=='school'||w.grade===3)
   .filter(e=>e.id!=='entrance'||w.grade>=2)
   .filter(e=>e.id!=='trip'||w.grade>=2)
   .filter(e=>!['summer','senior'].includes(e.id)||month>=5&&month<=9)
   .filter(e=>e.id!=='slump'||w.health.slump>=1)
   .filter(e=>e.id!=='loss'||(w.last&&w.last.score[0]<w.last.score[1]))
   .filter(e=>!['festival','festival2'].includes(e.id)||month>=9&&month<=11)
   .filter(e=>e.id!=='graduation'||month>=2&&month<=3)
   .filter(e=>e.id!=='playoffs'||month>=8);
  const leisure=pool.filter(e=>['friend','festival','festival2','study','trip','travel','media','former'].includes(e.id));
  const eligible=kind==='outing'&&leisure.length?leisure:pool;
  const unused=eligible.filter(e=>!s.seen[e.id+'/'+(w.stage==='pro'?w.year:w.grade)]);
  const picks=unused.length?unused:eligible;
  const rng=w.random('success/story/'+kind+'/'+week(w));
  const event=picks[Math.floor(rng()*picks.length)];
  s.seen[event.id+'/'+(w.stage==='pro'?w.year:w.grade)]=true;
  const fellow=(['rival','rivalpro','former','graduation'].includes(event.id)?w.archRivalPerson?.():null)||
   (kind==='outing'?w.members(w.player.club).filter(p=>p.id!==w.player.id).sort((a,b)=>(b.relationship||0)-(a.relationship||0))[0]:null)||
   w.members(w.player.club).find(p=>p.id!==w.player.id&&p.pos===w.player.pos)||
   w.members(w.player.club).find(p=>p.id!==w.player.id);
  const friend=fellow?.name||'チームメイト';
  return {type:'story',id:event.id,title:event.title,body:event.body.replaceAll('{friend}',friend),
   friendId:fellow?.id||null,choices:event.choices.map(([label,text,energy,morale,manager,bond,skill])=>({
    label,text,energy,morale,manager,bond,skill
   }))};
 }
 function action(w,kind){
  const s=state(w);
  if(kind==='allocate-toggle'){s.autoAllocate=!s.autoAllocate;return true;}
  if(kind==='auto-toggle'){s.autoTrain=!s.autoTrain;return true;}
  if(kind==='quick-toggle'){s.quickAdvance=!s.quickAdvance;return true;}
  if(kind==='intensity-toggle'){s.specialTraining=!s.specialTraining;return true;}
  if(kind.startsWith('boost:'))return allocate(w,kind.slice(6));
  if(kind.startsWith('plan:')){const key=kind.slice(5);if(!(w.pitching?arms:bats).includes(key))return false;s.plan=key;return true;}
  if(!available(w))return false;
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
 const xpMap={contact:{skill:3,mental:1},power:{strength:4,skill:1},run:{speed:4},field:{skill:2,speed:2},arm:{strength:2,skill:2},velocity:{strength:4,skill:1},control:{skill:3,mental:2},movement:{skill:4},stamina:{strength:3,mental:2}};
 const trainingNames={contact:'打撃',power:'長打',run:'走塁',field:'守備',arm:'肩力',velocity:'球速',control:'制球',movement:'変化球',stamina:'持久力'};
 const xpLabels={strength:'筋',skill:'技',speed:'敏',mental:'精'};
 function preview(w,key,hard=false){
  const s=state(w),mix=xpMap[key];
  if(!mix||!(w.pitching?arms:bats).includes(key))return null;
  const rng=w.random('weekly-environment/'+week(w)+'/'+key);
  const r=rng(),event=r<.21?'coach':r<.38?'rival':r<.53?'light':r<.60?'heavy':'normal';
  const peers=w.members(w.player.club).filter(p=>p.id!==w.player.id&&!p.injury);
  const partner=peers.length?peers[Math.floor(rng()*peers.length)]:null,staff=s.storyMode?coach(w):null;
  const coachPresent=staff&&(event==='coach'||key===staff.specialty&&rng()<.32);
  const friendship=!!partner&&(partner.relationship||0)>=65;
  const friend=s.storyMode?friendship:peers.some(p=>(p.relationship||0)>=70);
  const level=Math.min(5,1+Math.floor((s.trainingCounts?.[key]||0)/8));
  const facility=w.stage==='school'?[.91,1,1.12][w.schoolTier]||1:1.05;
  const multiplier=(coachPresent?1.12+staff.bond*.004:event==='coach'?1.5:event==='rival'?1.3:event==='heavy'?1.2:1)*(friend?1.35:1)*(s.storyMode?facility*(1+(level-1)*.10):1);
  const baseEnergy=hard?30:['power','velocity','stamina'].includes(key)?20:key==='run'?12:15;
  const energy=Math.max(8,baseEnergy+(event==='light'?-5:event==='heavy'?4:0));
  const environment=w.stage==='school'?(w.schoolTier-1)*.035:(w.ratings.coach-50)*.001;
  const condition=clamp((s.energy-65)*.002+(s.morale-50)*.001+environment-(w.health.fatigue||0)*.0007,-.20,.14);
  const risk=clamp((.02+(s.energy<40?(40-s.energy)*.003:0)+(hard?.025:0)+(event==='heavy'?.018:0)-(event==='light'?.008:0)+(key==='run'?-.008:0))/ (w.talent?.durability||1),.005,.22);
  const gains=Object.fromEntries(Object.entries(mix).map(([k,n])=>[k,Math.round(n*1.8*multiplier*(hard?1.45:1)*(w.talent?.learning||1))]));
  return {key,label:trainingNames[key],event,level,partnerId:partner?.id,partnerName:partner?.name,friendship,coachPresent,badge:{coach:'コーチ指導',rival:'ライバル練習',light:'体力消費↓',heavy:'高負荷',normal:''}[event]+(friendship?' · 友情':'')+(coachPresent&&event!=='coach'?' · コーチ':''),energy,risk,gains,condition,multiplier,friend,enabled:available(w)&&s.energy>=energy&&!w.health.injury};
 }
 function direct(w,key,hard=false){
  const p=preview(w,key,hard);
  if(!p?.enabled)return false;
  state(w).menu=hard?'special':'practice';
  return skill(w,key);
 }
 const cost=(w,key)=>Math.max(6,Math.round((key==='velocity'?(w.player[key]-110)*.20:w.player[key]*.115)+4));
 const xpNames={strength:'筋力',skill:'技術',speed:'敏捷',mental:'精神'};
 const canSpend=w=>!w.currentGame&&!state(w).pending&&w.stage!=='retired';
 function syncExperience(w){
  const s=state(w);
  // Legacy experience and fractional game rewards are converted once as they accrue.
  if(!s.storyMode)return s;
  const n=Math.max(0,Math.floor(Number(w.experience)||0));
  if(n){s.xp.mental+=n;w.experience-=n;}
  return s;
 }
 function feesFor(mix,price){
  const sum=Object.values(mix).reduce((a,b)=>a+b,0);
  return Object.fromEntries(Object.entries(mix).map(([k,n])=>[k,Math.max(1,Math.ceil(price*n/sum))]));
 }
 function payment(w,fees){const s=state(w);return {fees,missing:Object.fromEntries(Object.entries(fees).filter(([k,n])=>s.xp[k]<n).map(([k,n])=>[k,n-s.xp[k]])),affordable:Object.entries(fees).every(([k,n])=>s.xp[k]>=n)};}
 function spend(w,fees){for(const [k,n] of Object.entries(fees))state(w).xp[k]-=n;}
 function boostInfo(w,key){
  if(!xpMap[key]||!(w.pitching?arms:bats).includes(key))return null;
  const current=w.player[key],amount=w.balanceRevision>=247?.85:1;
  const next=typeof w.previewImprovement==='function'?w.previewImprovement(key,amount):current+amount;
  const p=payment(w,feesFor(xpMap[key],cost(w,key)));
  return {key,current,next,...p,max:next<=current+1e-9,enabled:canSpend(w)&&next>current+1e-9&&p.affordable};
 }
 function allocate(w,key){
  const p=boostInfo(w,key);if(!p?.enabled)return false;
  w.improve(key,w.balanceRevision>=247?.85:1.0);
  if(w.player[key]<=p.current)return false;
  spend(w,p.fees);
  return true;
 }
 function pitchInfo(w,key){
  const p=payment(w,{skill:9,mental:3});
  const valid=w.pitching&&globalThis.NightGame?.TYPES?.some(t=>t.id===key)&&!w.player.pitches.includes(key)&&w.player.pitches.length<5;
  return {...p,enabled:!!valid&&canSpend(w)&&p.affordable,valid:!!valid};
 }
 function learnPitch(w,key){
  syncExperience(w);const p=pitchInfo(w,key);
  if(!p.enabled)return false;spend(w,p.fees);w.player.pitches.push(key);w.note('新球種を習得');return true;
 }
 function skill(w,key){
  if(!available(w)||!Object.hasOwn(xpMap,key))return false;
  const s=state(w),menu=s.menu;
  if(!['practice','special'].includes(menu)||!(w.pitching?arms:bats).includes(key))return false;
  const hard=menu==='special',p=preview(w,key,hard);
  if(!p?.enabled)return false;
  const {energy:costEnergy,condition,risk,friend,multiplier}=p;
  const rng=w.random('success/weekly-practice/'+week(w)+'/'+key+'/'+menu);
  const roll=rng(),q=rng();
  const awaken=clamp(.01+condition*.012+(hard?.004:0),.004,.018);
  const great=clamp(.09+condition*.20+(hard?.03:0),.035,.16);
  const poor=clamp(.20-condition*.35,.10,.32),failure=clamp(.08-condition*.20,.035,.15);
  const outcome=roll<risk?'怪我':q<awaken?'覚醒':q<awaken+great?'大成功':q>1-failure?'失敗':q>1-failure-poor?'不調':'成功';
  const mult={'怪我':0,'失敗':0,'不調':.5,'成功':1,'大成功':2.5,'覚醒':5}[outcome];
  const gain={};
  for(const [k,n] of Object.entries(xpMap[key])){
   gain[k]=Math.round(n*1.8*mult*multiplier*(hard?1.45:1)*(w.talent?.learning||1));s.xp[k]+=gain[k];
  }
  w.trainingPlan=key;
  if(outcome==='怪我')w.health.injury=Math.max(w.health.injury,5+Math.floor(rng()*24));
  s.energy=clamp(s.energy-costEnergy,0,100);
  s.morale=clamp(s.morale+({'覚醒':12,'大成功':7,'成功':2,'不調':-2,'失敗':-6,'怪我':-10}[outcome]),0,100);
  w.health.fatigue=clamp(w.health.fatigue+(hard?17:9),0,100);
  w.ratings.coach=clamp(w.ratings.coach+(mult>=1?1.2:-.4),0,100);
  if(mult>=1)w.experience+=Math.round(mult);
  if(outcome==='覚醒')w.note('才能が開花！ '+NightCareerWorld.training[key]);
  if(s.autoAllocate)for(let i=0;i<4&&allocate(w,key);i++){}
  if(w.stage==='school'&&mult>=2.5)w.scoutLevel=clamp(w.scoutLevel+1,0,95);
  s.goal={skill:key,label:goalLabels[key],day:w.day};
  s.trainingCounts||={};s.trainingCounts[key]=(s.trainingCounts[key]||0)+1;
  if(s.storyMode&&p.partnerId){const partner=w.person(p.partnerId);if(partner)partner.relationship=clamp((partner.relationship||40)+(mult>=1?3:1),0,100);}
  if(s.storyMode&&p.coachPresent)coach(w).bond=clamp(coach(w).bond+(mult>=1?3:1),0,100);
  s.lastOutcome=outcome;
  const labels={strength:'筋力',skill:'技術',speed:'敏捷',mental:'精神'};
  mark(w,(hard?'実戦特訓':'通常練習')+' · '+NightCareerWorld.training[key],outcome+' · '+Object.entries(gain).map(([k,n])=>labels[k]+' +'+n).join(' / ')+(p.badge?' · '+p.badge:'')+(friend?' · 友情練習':''));
  s.trainingResult={day:w.day,key,label:p.label,outcome,gain,energy:costEnergy,badge:p.badge};
  if(s.storyMode&&outcome==='覚醒'){w.talent||={};w.talent.breakthrough||={};w.talent.breakthrough[key]=Math.min(8,(w.talent.breakthrough[key]||0)+2);queueEvent(w,'awakening/'+w.day,'才能が開花！',p.label+'の成長限界が広がった。',[ch('さらに上を目指す','新しい可能性を感じた。',{morale:4})]);}
  if(s.storyMode)refresh(w);
  return true;
 }
 function autoWeek(w){
  const s=state(w);
  if(!s.autoTrain||!available(w)||s.menu)return false;
  if(w.health.injury||s.energy<45||w.health.fatigue>65)return action(w,'rest');
  const key=(w.pitching?arms:bats).includes(s.plan)?s.plan:(w.pitching?'control':'contact');
  return direct(w,key,false);
 }
 function openEvent(w){
  const s=state(w);
  if(!usable(w)||s.pending||!s.inbox)return false;
  s.pending={...s.inbox,optional:true};s.inbox=null;return true;
 }
 function choose(w,value){
  const s=state(w),e=s.pending;
  if(!e||w.currentGame||(!e.forced&&!usable(w)))return false;
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
   if(choice.skill&&Object.hasOwn(w.player,choice.skill))w.improve(choice.skill,choice.bonus||.5);
   if(choice.coachBond)coach(w).bond=clamp(coach(w).bond+choice.coachBond,0,100);
   if(choice.scout)w.scoutLevel=clamp(w.scoutLevel+choice.scout,0,95);
   if(choice.fans)w.ratings.fans=clamp(w.ratings.fans+choice.fans,0,100);
   if(choice.slump)w.health.slump=clamp(w.health.slump+choice.slump,0,4);
   if(choice.sponsor)w.life.sponsor=true;
   if(choice.partner){w.life.partner=true;w.life.relationship=Math.max(1,w.life.relationship||0);}
   if(choice.marry)w.life.married=true;
   if(e.arc){s.arc||={};s.arc[e.arc]=number;}
   if(e.forced)s.lastForcedDay=w.day;
   w.experience+=1;
   if(e.id==='scout'&&w.stage==='school')w.scoutLevel=clamp(w.scoutLevel+1.5,0,95);
   mark(w,e.title,choice.text,!e.optional);
   if(s.storyMode)refresh(w);
   return true;
  }
  return false;
 }
 function afterGame(w,f,stats){
  if(!stats?.g)return;
  const s=state(w);
  if(s.storyMode){observePerks(w,stats);mission(w);}
  if(w.balanceRevision>=247&&s.matchXpWeek!==week(w)){
   s.matchXpWeek=week(w);s.xp.mental+=1;s.xp.skill+=w.pitching?(stats.k>=3?2:1):(stats.h>=2?2:1);if(stats.hr||stats.k>=5)s.xp.strength+=1;
  }
  if(!s.milestones)s.milestones={};
  const milestoneName=w.pitching?(stats.outs>0?'初登板':null):(stats.h>0?'初安打':null);
  if(milestoneName&&!s.milestones[milestoneName]){s.milestones[milestoneName]=true;w.spotlight={day:w.day,message:milestoneName+'を記録！',kind:'gold'};}
  s.gameCount++;
  // The first big moments create an optional story, not just a stat increase.
  const milestone=w.pitching?stats.k>=5&&!s.seen['five-strikeouts']:
   stats.hr>=1&&!s.seen['first-home-run'];
  if(milestone){
   const id=w.pitching?'five-strikeouts':'first-home-run';
   s.seen[id]=true;
   if(!s.inbox||s.storyMode){
    s.inbox={type:'story',id,title:w.pitching?'初めての大奪三振':'記念すべき一発',
     body:w.pitching?'5つ以上の三振を奪った。試合後、チームメイトが声をかけてくれた。':
      'ホームランでチームを沸かせた。試合後、監督が笑顔で待っていた。',
     friendId:null,choices:[
      {label:'みんなで喜ぶ',text:'仲間に祝福され、また頑張ろうと思えた。',energy:-2,morale:10,manager:2,bond:7,skill:null},
      {label:'次の試合に集中する',text:'余韻を胸に、次の練習目標を決めた。',energy:2,morale:5,manager:3,bond:2,skill:null}
     ]};
    if(s.storyMode){const e=s.inbox;queueEvent(w,'milestone/'+id,e.title,e.body,e.choices);s.inbox=null;}
   }
  }
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
  const now=week(w);
  if(s.storyWeek!==now){
   s.storyWeek=now;
   if(s.storyMode)randomStory(w);
   else if(isPlaying(w)&&!s.inbox&&!s.pending&&w.random('success/ambient/'+now)()<.17){
    s.inbox=scene(w,'ambient');
    w.note('新しいイベント · '+s.inbox.title);
   }
  }
  if(s.storyMode)refresh(w);
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
 const perkDefs={
 clutch:['チャンス',12,'contact',3],discipline:['選球眼',12,'contact',2],bunt:['バント',8,'field',1],speed:['走塁',12,'run',3],
 average:['巧打職人',18,'contact',5],slugger:['長距離砲',18,'power',6],opposite:['広角打法',16,'contact',3],glove:['守備職人',16,'field',5],strongArm:['強肩',14,'arm',4],leadoff:['出塁職人',16,'run',3],
 pressure:['対ピンチ',12,'control',3],lateLife:['球威',12,'velocity',2],recovery:['回復',12,'stamina',4],strikeout:['奪三振',18,'movement',5],command:['精密制球',18,'control',5],breaking:['キレ',16,'movement',4],endurance:['尻上がり',16,'stamina',5],fastball:['ノビ',16,'velocity',3],
 strikeoutWeak:['三振癖',0,'contact',-4],wild:['四球癖',0,'control',-4]
 };
 const perkKeys=w=>w.pitching?['pressure','lateLife','recovery','strikeout','command','breaking','endurance','fastball','wild']:['clutch','discipline','bunt','speed','average','slugger','opposite','glove','strongArm','leadoff','strikeoutWeak'];
 function perkInfo(w,key){const d=perkDefs[key];if(!d)return null;const owned=w.perks.includes(key),negative=d[3]<0,unlocked=negative?owned:(d[1]<=12||w.player[d[2]]>=40||(state(w).trainingCounts?.[d[2]]||0)>=8||state(w).perkHints?.[key]);const price=negative?18:d[1],mix={...xpMap[d[2]]};mix.mental=(mix.mental||0)+2;const p=payment(w,feesFor(mix,price));return {key,label:d[0],cost:price,skill:d[2],effect:d[3],negative,owned,unlocked,...p,enabled:canSpend(w)&&unlocked&&(negative||!owned)&&(state(w).storyMode?p.affordable:w.experience>=price)};}
 function observePerks(w,stats){
  const s=state(w);s.perkSample||={pa:0,k:0,h:0,hr:0,outs:0,walks:0,er:0,bb:0,sb:0};for(const k of Object.keys(s.perkSample))s.perkSample[k]+=Number(stats[k])||0;
  const q=s.perkSample;s.perkHints||={};w.perks||=[];const hint=(k,on)=>{if(on)s.perkHints[k]=true;};
  if(w.pitching){hint('strikeout',q.k>=25);hint('command',q.outs>=60&&q.walks/q.outs<.12);hint('endurance',stats.outs>=18);hint('fastball',q.k>=15);if(q.outs>=75&&q.walks/q.outs>.20&&!w.perks.includes('wild')){w.perks.push('wild');queueEvent(w,'weak/wild/'+w.day,'課題：四球癖','制球の乱れが続き、四球癖が付いた。能力画面で克服できる。',[ch('課題に取り組む','制球練習を意識する。')]);}}
  else{hint('average',q.h>=20);hint('slugger',q.hr>=5);hint('leadoff',q.bb>=10);hint('glove',stats.errors===0&&q.pa>=50);if(q.pa>=60&&q.k/q.pa>.32&&!w.perks.includes('strikeoutWeak')){w.perks.push('strikeoutWeak');queueEvent(w,'weak/k/'+w.day,'課題：三振癖','三振が多く、打撃に課題が出ている。能力画面で克服できる。',[ch('課題に取り組む','打撃練習を意識する。')]);}}
 }
 function learnPerk(w,key){if(!perkKeys(w).includes(key)||!canSpend(w))return false;syncExperience(w);const p=perkInfo(w,key);if(!p?.enabled)return false;if(p.negative){w.perks=w.perks.filter(x=>x!==key);if(state(w).perkSample)for(const k of Object.keys(state(w).perkSample))state(w).perkSample[k]=0;}else w.perks.push(key);if(state(w).storyMode)spend(w,p.fees);else w.experience-=p.cost;w.note(p.label+(p.negative?'を克服':'を習得'));return true;}
 const currentQuestion=w=>{
  const e=state(w).pending;
  return e?.type==='drill'?[challengeTexts[e.skill]?.[e.index]||'集中してプレーを決めよう',tactics.map(t=>t[0])]:null;
 };
 window.NightCareerWorldSuccess={state,week,available,action,skill,choose,openEvent,afterGame,tick,semester,currentQuestion,autoWeek,allocate,cost,preview,direct,activate,refresh,queueEvent,cast,coach,mission,perkDefs,perkKeys,perkInfo,learnPerk,boostInfo,pitchInfo,learnPitch,syncExperience,xpNames};
})();
