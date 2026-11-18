const Extra=window.NightCareerExtras;
const Career=window.NightCareer;
const fee=n=>n?' · '+n+'万台湾ドル':'';
const button=(key,label,{disabled=false,primary=false}={})=>
 `<button type="button" class="${primary?'career-extra-primary':'career-extra-button'}" data-extra="${key}" ${disabled?'disabled':''}>${label}</button>`;
const panel=(title,body)=>`<section class="career-panel career-extra-panel"><h2>${title}</h2>${body}</section>`;
const grid=body=>`<div class="career-extra-grid">${body}</div>`;
const images={street:'雨上がりの街',market:'夜市の屋台',coast:'花蓮の海辺',cafe:'商店街の喫茶店'};
const photo=(id)=>Object.hasOwn(images,id)?`<span class="career-memory-photo" data-photo="${id}" role="img" aria-label="${images[id]}"></span>`:'';
const result=record=>record?.summary?`<section class="career-extra-result" aria-live="polite" tabindex="-1">
 <h2>${record.title}</h2><p>${record.summary}</p>${photo(record.photo)}</section>`:'';
const options=(id,items,disabled=false)=>grid(items.map(([value,label])=>button(id+':'+value,label,{disabled})).join(''));

function leisure(c,l){
 const school=c.stage==='school';
 const context=c.stage==='retired'?'引退後の日常':school?'放課後・休日':'休日';
 const busy=l.time===0;
 const event=Extra.eventList(c,l)[0],week=Extra.book(c).week;
 const hobby=Object.keys(Extra.hobbies)[(l.day-1)%Object.keys(Extra.hobbies).length];
 const main=event?panel(event.title,`<p>${event.description}</p>${options('life:event:'+event.id,event.choices,busy)}`):'';
 return `<section class="career-life-hero">
  <div><h2>${context}</h2><p>${Extra.period(c)} · ${l.place||Extra.city(c)} · 第${l.day}週</p></div>
  <strong>自由時間 ${l.time}/2</strong>
  ${busy?button('life:next','次の休日へ',{primary:true}):''}
 </section>${result(l.last)}
 ${c.stage==='retired'&&!l.after?panel('引退後に始めること',options('life:after',[
  ['hometown','地元で暮らす'],...(l.shop?[['cafe','店を続ける']]:[]),...(l.flags.radio?[['broadcast','街の取材・ラジオ番組']]:[])
 ])):''}
 ${main}
 ${panel('自由時間を使う',grid(
  button('life:relax','リフレッシュ',{disabled:busy||!week||c.currentGame||l.relaxedWeek===week,primary:!event})+
  button('life:hobby:'+hobby+':'+Extra.hobbyChoices[hobby][0][0],Extra.hobbyChoices[hobby][0][1],{disabled:busy})))}
 <details class="career-panel career-archive"><summary>ほかの予定・趣味・旅行</summary>
 ${Extra.eventList(c,l).slice(1).map(e=>panel(e.title,`<p>${e.description}</p>${options('life:event:'+e.id,e.choices,busy)}`)).join('')}
 ${panel('趣味',`<p>好きなことを選ぶと、思い出や収集品が増えます。</p>
 ${Object.entries(Extra.hobbies).map(([id,name])=>`<details class="career-extra-entry"><summary>${name}</summary>
 ${options('life:hobby:'+id,Extra.hobbyChoices[id],busy)}</details>`).join('')}`)}
 ${c.clubId?panel('小旅行',`<p>自由時間1枠と旅費3万台湾ドル。</p>${options('life:trip',[['台南','台南の夜市'],['花蓮','花蓮の海岸'],['地元','地元に帰省']],busy||l.money<3)}`):''}</details>`;
}
function relationships(c,l){
 const busy=l.time===0,events=Extra.episodes(c).history;
 return `${result(l.last)}
 ${Object.entries(Extra.people).map(([id,[name,detail]])=>{
  const r=l.relationships[id],points=r?.points||0;
  return panel(name,`<p>${detail} · ${r?.bond||'知り合い'} · 親しさ ${points}</p>
   ${grid(button('life:friend:'+id+':meet','一緒に出かける',{disabled:busy})+
    (points>=3&&r.bond!=='交際中'?button('life:friend:'+id+':date','気持ちを伝える',{disabled:busy}):''))}`);
 }).join('')}
 ${panel('思い出アルバム',l.album.length?l.album.slice().reverse().map(a=>
  `<article class="career-extra-entry"><small>${a.period} · 第${a.day}週</small><strong>${a.title}</strong><p>${a.summary}</p>${photo(a.photo)}</article>`).join(''):'<p>出かけた先のエピソードがここに残ります。</p>')}
 ${events.length?`<details class="career-panel career-archive"><summary>キャリアの出来事</summary>
 ${events.slice().reverse().map(e=>`<article class="career-extra-entry"><small>${e.period}</small><strong>${e.title}</strong>
 <p>${e.choice} ／ ${e.summary}</p></article>`).join('')}</details>`:''}
 ${panel('趣味のコレクション',Object.entries(Extra.collections).map(([id,items])=>{
  const collected=l.collection[id]||items.slice(0,l.interests[id]||0);
  return `<details class="career-extra-entry"><summary>${Extra.hobbies[id]}　${collected.length}/${items.length}</summary>
   ${collected.length?`<ul>${collected.map(item=>`<li>${item}</li>`).join('')}</ul>`:'<p>収集品はまだありません。</p>'}</details>`;
 }).join(''))}`;
}
function shopView(l){
 const shop=l.shop;
 if(!shop){
  const unlocked=(l.interests.cook||0)>=2||l.flags.festival||l.flags.reunion;
  return panel('商店街のカフェ',`<p>${unlocked?'開業費28万台湾ドルと自由時間1枠。':
   '文化祭・友人との再会・料理を2回以上体験すると、開店できます。'}</p>
   ${button('life:shop:open','カフェを開く',{disabled:!unlocked||l.money<28||!l.time})}`);
 }
 const settings=(key,list)=>grid(list.map(([id,label])=>button('life:shop:'+key+':'+id,
  shop[key]===id?label+' · 選択中':label,{disabled:shop[key]===id})).join(''));
 return panel('商店街のカフェ',`<p>営業 ${shop.turns}回 · 来店 ${shop.customers}人 · 累計利益 ${Career.money(shop.sales)}</p>
  ${shop.last?`<p class="career-extra-entry">${shop.last}</p>`:''}
  <h3>看板メニュー</h3>${settings('menu',Object.entries(Extra.cafes).map(([id,[name,cost]])=>[id,name+' · 原価'+cost+'万']))}
  <h3>価格帯</h3>${settings('price',[['value','お手頃'],['regular','標準'],['premium','こだわり価格']])}
  <h3>営業時間</h3>${settings('hours',[['weekend','土曜のみ · 1枠'],['extended','土日営業 · 2枠']])}
  ${button('life:shop:serve','店を営業する',{disabled:l.time<(shop.hours==='extended'?2:1)||l.money<Extra.cafes[shop.menu][1],primary:true})}`);
}
function finances(c,l){
 if(!c.clubId)return panel('暮らしとお金','<p>プロ入りすると、年俸で暮らしを組み立てられます。</p>');
 return `${result(l.last)}
 ${panel('生活資金',`<p>生活費 <strong>${Career.money(l.money)}</strong> · 貯金 <strong>${Career.money(l.saved)}</strong></p>
 <p>その年の年俸を生活資金に受け取ります。試合用の育成資金は別口です。</p>
 ${grid(button('life:money:save','10万を貯金',{disabled:l.money<10})+
 button('life:money:withdraw','10万を引き出す',{disabled:l.saved<10})+
 button('life:money:gift','家族に贈り物 · 4万',{disabled:l.money<4||!l.time}))}`)}
 ${panel('住まい',`<p>${l.homeCity} · ${Extra.apartments[l.home][0]}</p>
 ${grid(Object.entries(Extra.apartments).map(([id,[name,cost]])=>button('life:home:'+id,name+fee(cost),
  {disabled:l.home===id||l.money<cost})).join(''))}
 <h3>家具</h3>
 ${grid(Object.entries(Extra.furniture).map(([id,[name,cost]])=>button('life:item:'+id,l.items.includes(id)?name+' · 所有':name+fee(cost),
  {disabled:l.items.includes(id)||l.money<cost})).join(''))}`)}
 ${shopView(l)}`;
}
export function careerLifeHTML(c,tab='leisure'){
 const l=Extra.life(c),views={leisure,relationships,finances};
 return `<nav class="career-life-nav" aria-label="暮らしのメニュー">
 ${[['leisure','休日'],['relationships','友人・思い出'],['finances','住まい・お金']].map(([id,label])=>
  `<button type="button" data-extra="life-tab:${id}" ${tab===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav>${views[tab](c,l)}`;
}
export function careerBaseHTML(c,aim=null){
 const {x,week,p}=Extra.book(c),current=x.challenge?.week===week?x.challenge:null;
 const disabled=!week||p.length>=2||!!c.currentGame||!!current;
 const opts=(key,list,lock=false)=>options('base:'+key,list,disabled||lock||p.includes(key));
 const fitness=c.injury?'故障 · 回復まで'+c.injury+'試合相当':x.slump>=2?'スランプ中':'練習可能';
 const practice=current?Extra.practicePitch(c):null;
 return `${result(x.last)}
 ${panel('試合前の追加練習',`<p>残り ${week?2-p.length:0}枠 · 疲労 ${c.fatigue}% · ${fitness}</p>
  ${p.length?`<p>今週は ${p.map(id=>Extra.baseballPlans[id]).join('、')} を選択済み</p>`:''}
  <div class="career-extra-grid">
   ${button('practice:auto', current?'残りをおまかせ':'おまかせ練習',{primary:true,disabled:!week||!!c.currentGame||!current&&(p.length>=2||p.includes('challenge'))})}
   ${button('base:recovery:rest','疲労を回復',{disabled:disabled||p.includes('recovery')})}
  </div>`)}
 <details class="career-panel career-archive" ${current?'open':''}><summary>練習を選ぶ・自分で挑戦する</summary>
 ${practice?panel('育成チャレンジ · '+(current.index+1)+'/5',`<h3>${practice.question}</h3>
  ${current.last?`<p>${current.last}</p>`:''}
  ${aim?`<p>タイミングの帯にマーカーが重なった瞬間に決定。</p>
   <div class="career-drill-meter" aria-hidden="true"><i></i></div>
   ${button('answer:timing',c.pitching?'投げる':'決定',{primary:true})}`:
  options('answer',practice.options.map((label,i)=>[i,label]),!!c.currentGame)}
  ${button('answer:auto','残りはおまかせ',{disabled:!!c.currentGame})}`):panel('育成チャレンジ',`<p>5球でコースや狙いを選び、タイミングを合わせます。経験と特殊能力の習得機会が得られます。</p>
  ${opts('challenge',c.pitching?[['control','制球'],['movement','変化球']]:[['contact','選球眼'],['power','打ち分け'],['run','打球判断']])}`)}
 ${panel('チームメイトとコンディション',`<p>連携 ${Extra.teamTraining(c)}/9${x.allyGrowth&&Extra.teamTraining(c)?' · 佑安の特訓 '+x.allyGrowth+'回':''} · 起用評価 ${x.rival}/12${x.leader?' · 主将':''}</p>
  ${opts('team',[['team','チーム練習']],c.injury>=2)}
  ${opts('partner',[['team','個別に特訓']],c.injury>=2)}
  ${opts('recovery',[['rest','休養・リハビリ'],['form','フォームの立て直し'],...(c.fixture?.type==='pro'?[['rehab','二軍で実戦調整']]:[])])}
  ${c.stage==='school'&&c.schoolYear>=2&&x.arrivalYear!==c.schoolYear?opts('arrival',[['guide','新入部員を教える'],['rival','新人と実戦形式で競う']]):''}`)}
 ${panel('起用の面談',`<p>${c.rival?'同ポジションのライバル '+c.rival.name:'監督に希望する役割を伝えます。'}${c.rosterNews?' · '+c.rosterNews.label:''}</p>
  ${x.goals.role?`<p>${x.goals.role.label}　${x.goals.role.done?'達成':x.goals.role.progress+'/'+x.goals.role.target}</p>`:''}
  ${opts('meeting',c.pitching?[['rotation','先発で勝負'],['setup','救援枠を目指す']]:[['lineup','打順・出場枠を上げたい'],
   ...(c.positions.length>1||c.plans('position').length?[['convert','別ポジションを狙う']]:[])],!!x.goals.role&&!x.goals.role.done)}`)}
 ${['school','academy'].includes(c.stage)?panel('スカウト面談',`<p>${x.goals.scout?
  '課題「'+x.goals.scout.label+'」 · '+(x.goals.scout.done?'達成':x.goals.scout.progress+'/'+x.goals.scout.target):
  '球団から次の試合で見たいポイントを聞く。'} </p>${opts('scout',c.scout().filter(row=>!x.scoutBoost[row.clubId]).slice(0,3).map(row=>
  [row.clubId,NightTeams.get(row.clubId).name+' · '+row.need]),!!x.goals.scout&&!x.goals.scout.done)}`):''}
 ${c.stage==='offseason'?panel('春季キャンプの一軍選考',`<p>${c.camp?'キャンプで測定を受けると、次の開幕時の起用が決まります。':'進行画面でキャンプを選ぶと選考を受けられます。'}</p>
  ${opts('campcheck',[['check','キャンプの選考を受ける']],!c.camp||x.campReview?.year===c.proYear)}`):''}</details>`;
}
