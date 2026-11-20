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
  ],
  pro:[
   {id:'rookie',title:'先輩選手の助言',body:'練習後、同じ守備位置の先輩が「試合に出る前の準備が大事だ」と話す。',
    choices:[['一緒に練習する','細かな動きまで確認し、手応えを得た。',-9,4,3,5,'field'],['練習法を聞く','プロの調整方法を学んだ。',1,4,2,4,null]]},
   {id:'media',title:'ファンからの手紙',body:'応援してくれるファンから手紙が届いた。そこには、次の試合も楽しみにしていると書かれている。',
    choices:[['返事を書く','丁寧に返事を書いた。野球を続ける理由を思い出した。',-2,9,0,4,null],['練習で応える','次の試合でいいプレーを見せようと決意した。',-8,4,2,2,null]]},
   {id:'former',title:'高校時代の仲間から連絡',body:'高校時代に一緒に汗を流した選手から「最近どう？」と連絡が来た。',
    choices:[['近況を話し合う','久しぶりの会話に、あの頃の気持ちがよみがえった。',-2,9,0,6,null],['次の対戦を約束する','また同じグラウンドで勝負しようと約束した。',-4,5,2,5,null]]},
   {id:'coach',title:'打撃・投球コーチとの面談',body:'コーチから「最近の調子についてどう考えている？」と尋ねられた。',
    choices:[['課題を正直に話す','改善点を整理し、指導方法を一緒に考えた。',-3,4,3,2,null],['自信のある部分を伝える','持ち味を生かした起用を検討してくれることになった。',-3,5,2,2,null]]}
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
 function skill(w,key){
  if(!available(w)||!Object.hasOwn(drills,key))return false;
  const s=state(w);
  if(!['practice','special'].includes(s.menu))return false;
  if(!(w.pitching?arms:bats).includes(key))return false;
  const hard=s.menu==='special';
  if(s.energy<(hard?32:12))return false;
  s.pending={type:'drill',title:(hard?'実戦特訓':'基礎練習')+' · '+NightCareerWorld.training[key],
   skill:key,hard,index:0,correct:0,results:[]};
  s.menu=null;return true;
 }
 function choose(w,value){
  const s=state(w),e=s.pending;
  if(!usable(w)||!e)return false;
  const number=Number(value);
  if(!Number.isInteger(number)||number<0)return false;
  if(e.type==='drill'){
   const q=drills[e.skill]?.[e.index];
   if(!q||number>=q[1].length)return false;
   const hit=number===q[2];
   e.results.push({question:q[0],correct:hit});
   if(hit)e.correct++;
   e.index++;
   if(e.index<drills[e.skill].length)return true;
   const success=e.correct>=2;
   const boost=(e.hard?.75:.5)+e.correct*(e.hard?1.05:.65);
   w.improve(e.skill,boost);
   w.experience+=(e.hard?4:2)+e.correct;
   w.ratings.coach=clamp(w.ratings.coach+(success?2:1),0,100);
   if(w.stage==='school')w.scoutLevel=clamp(w.scoutLevel+(success&&e.hard?1.5:.25),0,95);
   s.energy=clamp(s.energy-(e.hard?34:15),0,100);
   s.morale=clamp(s.morale+(success?e.hard?6:3:-3),0,100);
   w.health.fatigue=clamp(w.health.fatigue+(e.hard?17:7),0,100);
   if(!success&&e.hard)w.health.slump=clamp(w.health.slump+.2,0,4);
   w.trainingPlan=e.skill;
   mark(w,e.title, e.correct+' / '+drills[e.skill].length+'問正解 · '+(success?'技術が身についた。':'課題を持ち帰って次週の練習へ。'));
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
  s.last={day:w.day,title:'新しい学年',summary:'先輩の姿を思い出しながら、次の大会に向けて練習が始まった。'};
  s.stories.push(s.last);
  if(s.stories.length>90)s.stories.shift();
 }
 const currentQuestion=w=>{
  const e=state(w).pending;
  return e?.type==='drill'?drills[e.skill]?.[e.index]||null:null;
 };
 window.NightCareerWorldSuccess={state,week,available,action,skill,choose,afterGame,tick,semester,currentQuestion};
})();
