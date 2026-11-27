/* Career-only views. The live game uses the existing HUD. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,M=NightCareerWorldMatch,L=NightCareerWorldLeagues,Z=NightCareerWorldSuccess;
 const {countries,schools}=D;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const act=(key,label,value='',kind='secondary-button')=>
  `<button type="button" class="${kind}" data-world-action="${key}" data-value="${esc(value)}">${esc(label)}</button>`;
 const section=(label,body)=>`<section class="career-panel cw-panel"><h2>${esc(label)}</h2>${body}</section>`;
 const options=(entries)=>entries.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('');
 const fmt=(n,d=3)=>Number(n).toFixed(d);
 const blank='<p class="cw-note">記録がありません。</p>';
 const club=(w,id)=>id?esc(w.clubName(id)):'—';
 const stat=(s,pitch)=>pitch?
  `<span>${s.g}登板</span><span>${Math.floor(s.outs/3)}${s.outs%3?'.'+s.outs%3:''}回</span><span>防御率 ${s.outs?fmt(M.era(s),2):'—'}</span><span>${s.k}奪三振</span><span>${s.sv}S</span>`:
  `<span>${s.g}試合</span><span>打率 ${s.ab?fmt(M.rate(s.h,s.ab)):'—'}</span><span>${s.hr}本</span><span>${s.rbi}打点</span><span>${s.sb}盗塁</span>`;
 const pills=(label,inner)=>`<div class="cw-pills" aria-label="${esc(label)}">${inner}</div>`;
 const title=(screen,legacy)=>`<div class="career-heading"><button type="button" class="career-back" data-world-action="home">◀ ホーム</button><h1>${esc(screen)}</h1>${act('slots','選手データ（最大3人）','','career-back')}${legacy?act('legacy','従来キャリア','','career-back'):''}</div>`;
 function matchResult(w){
  const {name,day,team,opponent,score,stat:s,inning,pitching=w.pitching}=w.last;
  const [own,rival]=score;
  const outcome=own===rival?'引き分け':own>rival?'勝利':'敗戦';
  const performance=!s.g?'<p class="cw-note">出場なし</p>':pills('個人成績',pitching?
   `<span>${Math.floor(s.outs/3)}回${s.outs%3?' '+s.outs%3+'/3':''}</span><span>${s.k}奪三振</span><span>${s.er}自責点</span>`:
   `<span>${s.ab}打数 ${s.h}安打</span><span>${s.hr}本塁打</span><span>${s.rbi}打点</span><span>${s.sb}盗塁</span>`);
  return `<p class="modal-note">${esc(day)} · ${esc(name)}${inning?' · '+inning+'回':''}</p>
   <div class="career-result-banner${own<rival?' career-lost':''}"><div><small>${esc(team||w.clubName(w.player.club))} 対 ${esc(opponent)}</small>
   <b>${own} − ${rival}</b></div><strong>${outcome}</strong></div><h3>${esc(w.name)}の成績</h3>${performance}`;
 }
 function slots(meta,legacy){
  const byId=new Map(meta.slots.map(slot=>[slot.id,slot]));
  const cards=Array.from({length:3},(_,i)=>{
   const item=byId.get(i);
   if(!item)return '<article class="career-panel cw-panel cw-slot-card cw-slot-empty"><h3>選手 '+(i+1)+'</h3><p>新しい高校生活を始められます</p>'+
    act('slot-create','この枠で新しい選手を作る',i,'primary-button')+'</article>';
   const c=countries[item.country];
   return '<article class="career-panel cw-panel cw-slot-card"><div class="cw-slot-head"><strong>選手 '+(i+1)+'</strong>'+
    (meta.active===i?'<span class="cw-slot-current">現在の選手</span>':'')+'</div>'+
    '<h3>'+esc(item.name)+'</h3><p>'+esc(c?.label||'—')+' · '+esc(item.yearLabel||item.stage||'—')+'</p>'+
    '<p>'+esc(item.day||'—')+'</p>'+act('slot-open',meta.active===i?'この選手で続ける':'この選手を読み込む',i,'primary-button')+'</article>';
  }).join('');
  return title('選手データ',legacy)+
   '<p class="cw-note">保存は選手ごとに独立しています。既存の選手を削除せず、最大3人まで作成できます。試合途中の状態も保存します。</p>'+
   '<div class="cw-slot-list">'+cards+'</div>'+act('slots-close','前の画面に戻る','','secondary-button');
 }
 function setup(country,legacy,alumni=[]){
  if(!country)return title('選手キャリア',legacy)+section('高校生活を始める国・地域',`<div class="cw-grid">${Object.entries(countries).map(([id,c])=>
    act('country',c.label+' · '+c.league,id,'primary-button')).join('')}</div>`)+
   (alumni.length?section('過去のキャリア',alumni.map(a=>`<p>${esc(a.name)} · ${esc(countries[a.country]?.label)} · 通算${a.games}試合</p>`).join('')):'');
  const c=countries[country];
  const styles=Object.entries(NightCareer.styles).map(([id,v])=>[id,v.label]);
  const field=(label,id,entries)=>`<label>${label}<select name="${id}">${options(entries)}</select></label>`;
  return title('選手作成 · '+c.label,legacy)+`<form id="world-create" class="career-panel cw-panel">
   <label class="cw-name">選手名<input name="name" maxlength="16" required placeholder="${country==='jp'?'高橋 大地':country==='tw'?'陳宥澤':'キム・ドユン'}"></label>
   <div class="cw-fields">
   ${field('出身地域','region',c.region.map(r=>[r,r]))}
   ${field('学校の強さ','schoolTier',country==='tw'?[[1,'中堅校・木棒組'],[0,'弱小校・鋁棒組'],[2,'強豪校・木棒組']]:[[1,'中堅校'],[0,'弱小校'],[2,'強豪校']])}
   ${field('スタイル','style',styles)}
   ${field('守備位置','position',[['','スタイルに合わせる'],...D.positions.map(p=>[p,NightCareer.positionNames[p]])])}
   ${field('打席','hand',[['R','右打'],['L','左打']])}${field('投球','throwHand',[['R','右投'],['L','左投']])}
   ${field('難易度','difficulty',[['normal','ノーマル'],['easy','イージー'],['hard','ハード']])}
   ${field('プロの試合数','season',[['short','短縮'],['standard','標準']])}
   </div>
   <p class="cw-note">高校名は出身地域と学校の強さから自動決定。才能・成長曲線は非公開です。弱小校は出場機会、強豪校は育成環境に優れます。</p><button type="submit" class="primary-button">野球人生を始める</button>${act('country','国・地域の選択へ戻る')}</form>`;
 }
 function upcoming(w){
  const f=w.active;
  if(f)return {day:f.day,name:f.name,opponent:f.home===w.owningClub(f)?f.away:f.home,fixture:f};
  if(['school','amateur'].includes(w.stage)){
   const t=w.tournament;
   if(t&&!t.finished){
    const pair=t.draw[t.round].find(row=>row.includes(t.own));
    if(pair)return {day:[w.day,D.stamp(t.event.day,t.round*3)].sort().at(-1),name:t.event.name,opponent:pair.find(id=>id!==t.own)};
   }
   const events=NightCareerWorldSchool.calendar(w).slice(w.schoolCursor);
   const next=events.find(e=>e.format>=3||!e.requirement||NightCareerWorldSchool.eligible(w,e.requirement));
   if(next)return {day:next.day,name:next.name};
  }
  if(w.stage==='pro'){
   const n=w.nationalEvent;
   if(n?.format&&!n.done&&n.selected)return {day:[w.day,n.next].sort().at(-1),name:n.cup+' '+NightCareerWorldInternational.labels[n.round.key]};
   if(w.post)return {day:w.day,name:w.post.asia?'アジアシリーズ':'ポストシーズン'};
   const dates=Object.keys(w.regularNext).filter(day=>day>=w.day).sort();
   for(const day of dates){
    const game=w.regularNext[day].find(f=>[f.home,f.away].includes(w.club));
    if(game)return {day,name:game.name,opponent:game.home===w.club?game.away:game.home};
   }
   return {day:D.date(w.year,'10-05'),name:'ポストシーズン'};
  }
  return null;
 }
 let boardTab='home',boardSeed=null,boardStage=null;
 function setTab(tab){boardTab=['home','skills','stats','team','schedule','history'].includes(tab)?tab:'home';}
 const rankLetter=n=>n>=90?'S':n>=80?'A':n>=70?'B':n>=60?'C':n>=50?'D':n>=40?'E':n>=30?'F':'G';
 const bars=(w)=> (w.pitching?M.pitching:M.batting).map(k=>{
  const value=Math.round(w.player[k]),rank=k==='velocity'?rankLetter((value-110)*2):rankLetter(value);
  return '<div class="cw-ability-tile" data-rank="'+rank+'"><span>'+NightCareerWorld.training[k]+'</span><b>'+rank+'</b><small>'+value+(k==='velocity'?' km/h':'')+'</small></div>';
 }).join('');
 function trainingSettings(w){
  const s=Z.state(w);
  return section('育成方針・経験点','<div class="cw-xp">'+Object.entries({strength:'筋力',skill:'技術',speed:'敏捷',mental:'精神'}).map(([k,l])=>'<span>'+l+' <b>'+s.xp[k]+'</b></span>').join('')+'</div><div class="cw-grid">'+act('success-action','自動育成 '+(s.autoTrain?'ON':'OFF'),'auto-toggle')+act('success-action','自動振り分け '+(s.autoAllocate?'ON':'OFF'),'allocate-toggle')+'</div><p class="cw-note">重点：'+esc(NightCareerWorld.training[s.plan])+'</p><div class="cw-grid">'+(w.pitching?M.pitching:M.batting).map(k=>act('success-action',NightCareerWorld.training[k]+'を重点','plan:'+k)+act('success-action',NightCareerWorld.training[k]+' 強化','boost:'+k)).join('')+'</div>');
 }
 const xpShort={strength:'筋',skill:'技',speed:'敏',mental:'精'};
 const button=(action,value,label,inner,cls='',disabled=false)=>'<button type="button" data-world-action="'+action+'" data-value="'+esc(value)+'" class="'+cls+'" '+(disabled?'disabled':'')+' aria-label="'+esc(label)+'">'+inner+'</button>';
 function trainingResult(w){
  const s=Z.state(w),r=s.trainingResult;
  if(!r&&!s.last)return '';
  if(!r||s.last?.day!==r.day||!s.last?.title.includes('練習')&&!s.last?.title.includes('特訓'))return '<div class="cw-tr-result"><span>前回</span><b>'+esc(s.last?.title||'')+'</b><small>'+esc(s.last?.summary||'')+'</small></div>';
  return '<div class="cw-tr-result" data-outcome="'+esc(r.outcome)+'"><span>'+esc(r.label)+'練習</span><b>'+esc(r.outcome)+'</b><small>'+Object.entries(r.gain).map(([k,n])=>xpShort[k]+' +'+n).join('　')+'</small></div>';
 }
 function pendingPanel(w){
  const s=Z.state(w),e=s.pending;if(!e)return '';
  if(e.type==='drill'){const q=Z.currentQuestion(w);return '<div class="cw-event-panel"><b>'+esc(e.title)+'</b><p>'+esc(q?.[0])+'</p><div class="cw-grid">'+(q?.[1]||[]).map((label,i)=>act('success-choice',label,i)).join('')+'</div></div>';}
  return '<div class="cw-event-panel '+(e.forced?'cw-forced-event':'')+'" role="group" aria-label="キャリアイベント">'+(e.forced?'<span class="cw-event-kicker">EVENT · '+esc(w.day.replaceAll('-','/'))+'</span>':'')+'<b>'+esc(e.title)+'</b><p>'+esc(e.body)+'</p><div class="cw-choices">'+e.choices.map((option,i)=>act('success-choice',option.label,i,i===0?'primary-button':'secondary-button')).join('')+'</div></div>';
 }
 function trainingDeck(w,compact=false){
  const s=Z.state(w);if(s.pending)return pendingPanel(w);
  const keys=w.pitching?M.pitching:M.batting;
  const icons={contact:'打',power:'長',run:'走',field:'守',arm:'肩',velocity:'速',control:'制',movement:'変',stamina:'持'};
  const cards=keys.map(k=>{
   const p=Z.preview(w,k,s.specialTraining);
   return button('train-direct',k,p.label+'練習','<div class="cw-tr-head"><i>'+icons[k]+'</i><strong>'+p.label+' <em>Lv.'+p.level+'</em></strong><small>−'+p.energy+'</small></div><div class="cw-tr-gains">'+Object.entries(p.gains).map(([x,n])=>'<span data-xp="'+x+'">'+xpShort[x]+'+'+n+'</span>').join('')+'</div><div class="cw-tr-foot"><span title="'+esc(p.partnerName||'')+'">'+esc([p.partnerName,p.badge].filter(Boolean).join(' · ')||'通常')+'</span><span>故障 '+(p.risk*100).toFixed(1)+'%</span></div>','cw-tr-card '+(p.event==='normal'?'':'cw-bonus-'+p.event),!p.enabled);
  }).join('');
  const rest=button('rest-direct','','休養','<div class="cw-tr-head"><i>休</i><strong>休養</strong><small>+31</small></div><div class="cw-tr-gains"><span>体力回復</span></div><div class="cw-tr-foot"><span>故障なし</span></div>','cw-tr-card cw-rest',!Z.available(w));
  const event=s.inbox?act('success-event','イベント：'+s.inbox.title,'','cw-event-button'):'';
  return '<div class="cw-training-deck"><div class="cw-tr-toolbar"><b>今週の練習</b><div>'+button('success-action','intensity-toggle','特訓切替','<span>'+(s.specialTraining?'特訓':'通常')+'</span>','cw-mini-toggle '+(s.specialTraining?'on':''))+button('success-action','quick-toggle','自動進行切替','<span>自動進行 '+(s.quickAdvance?'ON':'OFF')+'</span>','cw-mini-toggle '+(s.quickAdvance?'on':''))+'</div></div><div class="cw-tr-grid">'+cards+rest+'</div>'+(!Z.available(w)?'<small class="cw-week-done">今週の行動は完了</small>':'')+trainingResult(w)+'<div class="cw-tr-social">'+event+(Z.available(w)?act('success-action','交流','friend','cw-social-button')+act('success-action','遊ぶ','outing','cw-social-button'):'')+'</div></div>';
 }
 function gameDeck(w,f){
  const role=w.usage(f),eligible=w.canPlay(f);
  return '<div class="cw-game-deck"><div class="cw-game-kicker">GAME DAY</div><h3>'+esc(f.name)+'</h3><p>対 '+club(w,f.home===w.owningClub(f)?f.away:f.home)+' · '+esc(M.roleText[role]||'出場なし')+'</p>'+(w.currentGame?act('play','試合を再開','','primary-button'):eligible?'<div class="cw-grid">'+act('play','自分の出番','self','primary-button')+act('play','重要場面','key')+act('play','フル試合','full')+'</div>':'<p class="cw-note">'+(w.health.injury?'故障で欠場':'出場メンバー外')+'</p>')+'</div>';
 }
 function dashboard(w,legacy){
  if(boardSeed!==w.seed||boardStage!==w.stage){boardSeed=w.seed;boardStage=w.stage;setTab('home');}
  const f=w.active,next=upcoming(w),p=w.player,s=Z.state(w),school=w.stage==='school',pro=w.stage==='pro',playing=school||pro||w.stage==='amateur';
  if(s.pending)boardTab='home';
  const status=w.stage==='retired'?'引退':w.stage==='draft'?'ドラフト':w.stage==='offseason'?'契約・移籍':w.health.injury?'故障 '+w.health.injury+'日':f?(f.kind==='farm'?'二軍・':'')+M.roleText[w.usage(f)]:w.selection?.level==='first'?'一軍':w.selection?.level==='farm'?'二軍':school?'選考中':'選考前';
  const morale=s.morale>=80?'絶好調':s.morale>=65?'好調':s.morale>=45?'普通':s.morale>=30?'不調':'絶不調';
  const grade=w.grade,objective=school?(grade===1?'レギュラー獲得':grade===2?'全国大会出場':'ドラフト指名'):pro?(w.selection?.level==='farm'?'一軍昇格':w.proYear<=3?'一軍定着':'優勝・タイトル'):w.stage==='amateur'?'ドラフト再挑戦':'';
  const days=next?Math.max(0,Math.round((Date.parse(next.day)-Date.parse(w.day))/86400000)):null;
  const date=w.day.replaceAll('-','/'),clubname=w.club?w.clubName(w.club):w.path||w.school;
  const hero='<section class="cw-compact-profile"><div class="cw-cp-top"><span>'+esc(w.yearLabel)+' · '+w.age+'歳</span><time>'+date+'</time></div><div class="cw-cp-name"><strong>'+esc(w.name)+'</strong><small>'+esc(clubname)+' · '+esc(NightCareer.positionNames[p.pos]||p.pos)+'</small></div><div class="cw-cp-tags"><b>'+esc(status)+'</b><b data-mood="'+morale+'">'+morale+'</b>'+(school?'<b>'+['弱小校','中堅校','強豪校'][w.schoolTier]+'</b>':'')+'</div><div class="cw-cp-gauges"><label>体力 <meter min="0" max="100" value="'+s.energy+'"></meter><b>'+Math.round(s.energy)+'</b></label><label>監督 <meter min="0" max="100" value="'+w.ratings.manager+'"></meter><b>'+Math.round(w.ratings.manager)+'</b></label></div><div class="cw-board-abilities">'+bars(w)+'</div></section>';
  const summary='<div class="cw-board-stats">'+stat(w.club?w.playerYear:w.schoolTotals,w.pitching)+'</div>';
  const target=next?'<div class="cw-next-line"><span>'+esc(next.name)+'</span><b>'+(days===0?'本日':'あと'+days+'日')+'</b></div>':'';
  const highlight=w.spotlight?'<div class="cw-compact-highlight"><span>'+esc(w.spotlight.message)+'</span>'+act('spotlight-dismiss','×','','cw-text-button')+'</div>':'';
  const tabs='<nav class="cw-board-tabs" aria-label="キャリアメニュー">'+[['home','⌂','ホーム'],['skills','↗','能力'],['stats','▥','成績'],['team','♟','チーム'],['schedule','▦','日程'],['history','★','記録']].map(([id,icon,label])=>'<button type="button" data-world-action="tab" data-value="'+id+'" aria-selected="'+(boardTab===id)+'"><span>'+icon+'</span>'+label+'</button>').join('')+'</nav>';
  const overview='<div class="cw-pro-overview">'+summary+target+(w.last?'<div class="cw-last-game"><span>前回 '+esc(w.last.opponent)+'</span><b>'+w.last.score.join(' – ')+'</b>'+act('last-result','結果','','cw-text-button')+'</div>':'')+'<div class="cw-pro-actions">'+act('training-open','練習・休養','','cw-pro-train')+act('detail','契約・生活','life','cw-pro-train')+'</div></div>';
  const gameplay=s.pending?pendingPanel(w):f?gameDeck(w,f):pro?overview:trainingDeck(w);
  const ms=s.mission,missionLine=ms&&playing?'<div class="cw-mission-line"><span>目標：'+esc(ms.label)+'</span><b>'+Math.min(ms.value||0,ms.target)+' / '+ms.target+(ms.done?' ✓':'')+'</b></div>':'';
  const home=hero+(s.pending?pendingPanel(w):(pro?'':target)+missionLine+highlight+(playing?gameplay:w.stage==='draft'?draft(w):w.stage==='offseason'?market(w):retired(w)));
  const body=boardTab==='home'?home:boardTab==='skills'?'<div class="cw-board-abilities standalone">'+bars(w)+'</div>'+trainingSettings(w)+skills(w):boardTab==='stats'?stats(w):boardTab==='team'?squad(w):boardTab==='schedule'?schedule(w)+(w.club?international(w):''):history(w)+life(w);
  const progress=playing?'<div class="cw-fixed-progress">'+(s.pending?'<span class="cw-dock-note">イベントを選択してください</span>':w.currentGame?act('play','試合を再開','','cw-main-progress'):f?act('simulate','試合を自動進行','','cw-main-progress')+button('tab','home','試合画面','試合画面','cw-alt-progress'):act('advance',pro?'次の試合へ':'次の週へ',pro?'game':'week','cw-main-progress')+act('advance',pro?'1か月':'次の試合',pro?'month':'game','cw-alt-progress')+act('progress-menu','⋯','','cw-more-progress'))+'</div>':'';
  const head='<div class="cw-mini-head">'+act('home','‹ 戻る','','career-back')+'<strong>選手キャリア</strong>'+act('slots','選手切替','','career-back')+act('career-options','⚙','','career-back')+'</div>';
  return head+'<div class="cw-board cw-compact-board '+(school?'cw-school-board':'cw-pro-board')+'"><main class="cw-board-body">'+body+'</main><div class="cw-fixed-dock">'+progress+tabs+'</div></div>';
 }
 function progressMenu(w){return '<div class="cw-grid">'+act('advance','1日進める','day')+act('advance','次の週へ','week')+act('advance','次の試合へ','game')+act('advance','1か月進める','month')+act('advance','重要イベントへ','event')+act('advance','シーズンを進める','season')+'</div>';}
 function careerOptions(w){return '<div class="cw-grid">'+act('music','応援歌設定')+act('detail','生活・契約','life')+act('detail','日程・大会','schedule')+act('last-result','前回の試合')+act('legacy','従来キャリア')+'</div>';}
 const detailViews={schedule,skills,players:w=>squad(w)+stats(w),life:w=>market(w)+life(w),international,history};
 const detail=(w,id)=>detailViews[id]?.(w)||'';
 function rankOf(w){
  const c=NightTeams.get(w.club),division=w.playingCountry==='jp'?c.division:null;
  return w.standingsFor(w.playingCountry,'all',division).findIndex(x=>x.id===w.club)+1;
 }
 function table(w,rows){
  return `<table class="cw-table"><thead><tr><th>順</th><th>球団</th><th>勝</th><th>敗</th><th>分</th><th>得失</th></tr></thead><tbody>
   ${rows.map((r,i)=>`<tr ${r.id===w.club?'class="cw-own"':''}><td>${i+1}</td><th scope="row">${club(w,r.id)}</th><td>${r.w}</td><td>${r.l}</td><td>${r.t}</td><td>${r.rf-r.ra}</td></tr>`).join('')}</tbody></table>`;
 }
 function schedule(w){
  if(!w.club){
   const calendar=NightCareerWorldSchool.calendar(w);
   const t=w.tournament;
   return section('年間日程',`<ol class="cw-list">${calendar.map(e=>`<li><time>${e.day}</time> ${esc(e.name)} ${w.schoolEvents[e.index]?.place?' · '+w.schoolEvents[e.index].place+'位':''}</li>`).join('')}</ol>`)+
    (t?section(t.event.name,`<p>${t.finished?'結果':'第'+(t.round+1)+'ラウンド'}</p>`+
     (t.event.format===2?table(w,L.standings(t.table,t.clubs)):'')+
     `<ol class="cw-list">${t.results.map(g=>`<li>第${g.round+1}ラウンド · ${club(w,g.awayId)} ${g.away}–${g.home} ${club(w,g.homeId)}</li>`).join('')}</ol>`):'');
  }
  const c=w.playingCountry;
  const lists=c==='jp'?[['セ・リーグ',w.standingsFor(c,'all','central')],['パ・リーグ',w.standingsFor(c,'all','pacific')]]:
   c==='tw'?[['年間順位',w.standingsFor(c)],['前期順位',w.standingsFor(c,'first')],['後期順位',w.standingsFor(c,'second')]]:[['KBO 順位',w.standingsFor(c)]];
  const matches=Object.keys(w.regularNext).sort().filter(day=>day>=w.day).flatMap(day=>w.regularNext[day].filter(f=>[f.home,f.away].includes(w.club))).slice(0,6);
  return lists.map(([label,rows])=>section(label,table(w,rows))).join('')+
   (w.post?section('ポストシーズン',Object.entries(w.post.series).filter(([id])=>c==='jp'?['central','pacific','japan'].includes(id):id===c)
    .flatMap(([,rounds])=>rounds.map(s=>`<p><strong>${esc(s.name)}</strong> · ${club(w,s.upper)} ${s.wins[0]}–${s.wins[1]} ${club(w,s.lower)}${s.winner?' · 勝者 '+club(w,s.winner):''}</p>`)).join('')):
    section('次の6試合',`<ol class="cw-list">${matches.map(f=>`<li><time>${f.day}</time> ${club(w,f.away)} VS ${club(w,f.home)}</li>`).join('')}</ol>`));
 }
 function squad(w){
  const arch=w.archRivalPerson(),archHTML=arch?section('同期ライバル',`<p><strong>${esc(arch.name)}</strong> · ${esc(arch.school||'')} · ${esc(arch.stage==='retired'?'引退':arch.club?w.clubName(arch.club):'アマチュア')} · ${NightCareer.positionNames[arch.pos]||arch.pos}</p>
   <p>${arch.pos==='P'?(arch.stats.outs?'防御率 '+fmt(M.era(arch.stats),2)+' · '+arch.stats.k+'奪三振':'まだ登板なし'):(arch.stats.ab?'打率 '+fmt(M.rate(arch.stats.h,arch.stats.ab))+' · '+arch.stats.hr+'本塁打':'まだ安打なし')}${w.rivalry[arch.id]?' · 対戦 '+w.rivalry[arch.id].games+'試合 あなたのチーム '+w.rivalry[arch.id].wins+'勝':''}</p>
   <p>あなた · ${w.player.pos==='P'?(w.player.stats.outs?'防御率 '+fmt(M.era(w.player.stats),2)+' · '+w.player.stats.k+'奪三振':'まだ登板なし'):(w.player.stats.ab?'打率 '+fmt(M.rate(w.player.stats.h,w.player.stats.ab))+' · '+w.player.stats.hr+'本塁打':'まだ安打なし')}</p>`):'';
  const id=w.player.club,l=M.lineup(w,id,w.playingCountry,w.day);
  const pos=w.player.pos;
  const peers=w.members(id).filter(p=>p.positions.includes(pos)).sort((a,b)=>M.positionScore(w,b,pos,w.playingCountry)-M.positionScore(w,a,pos,w.playingCountry));
  const ownScore=M.positionScore(w,w.player,pos,w.playingCountry);
   const peer=peers.find(p=>p.id!==w.player.id);
   const gap=peer?Math.round(M.positionScore(w,peer,pos,w.playingCountry)-ownScore):0;
   const competition=peer?'<p class="cw-competition">競争相手：'+esc(peer.name)+' · 評価差 '+(gap>0?'+':'')+gap+'（'+(gap>0?'能力・試合成績を伸ばそう':'評価でリード中')+'）</p>':'';
   const cohort=w.people.filter(p=>p.school&&p.club!==id).sort((a,b)=>(w.rivalry[b.id]?.games||0)-(w.rivalry[a.id]?.games||0)).slice(0,12);
  const c=Z.cast(w),staff=Z.coach(w),friend=c.friend&&w.person(c.friend),rival=c.rival&&w.person(c.rival);
  const castHTML=section('仲間・指導者','<p>監督：'+esc(staff.style)+' · コーチ信頼 '+Math.round(staff.bond)+'</p>'+[friend,rival].filter(Boolean).map((p,i)=>'<p>'+ (i?'ライバル':'同期')+'：'+esc(p.name)+' · 絆 '+Math.round(p.relationship||0)+'/100</p>').join(''));
  return castHTML+archHTML+section('ポジション争い · '+NightCareer.positionNames[pos],`${competition}<ol class="cw-list">${peers.map(p=>`<li><strong>${esc(p.name)}</strong> · ${w.year-p.born}歳 · 評価 ${Math.round(M.positionScore(w,p,pos,w.playingCountry))}
   ${p.injury?' · 故障':''}${p.id===w.player.id?' · あなた':''} ${p.pos==='P'?(p.stats.outs?' · 防御率 '+fmt(M.era(p.stats),2):''):(p.stats.ab?' · 打率 '+fmt(M.rate(p.stats.h,p.stats.ab)):'')}</li>`).join('')}</ol>`)+
   section('今日の想定オーダー',`<ol class="cw-list">${Object.entries(l.assign).map(([p,id])=>`<li>${p} · ${esc(w.person(id)?.name)}</li>`).join('')}<li>先発 · ${esc(l.starter?.name)}</li></ol>`)+
   section('高校時代の選手',cohort.length?cohort.map(p=>`<details><summary>${esc(p.name)} · ${esc(p.stage==='retired'?'引退':p.club?w.clubName(p.club):p.amateur||'アマチュア')}</summary>
    <p>${esc(p.school)} · ${esc(countries[p.nation]?.label||'海外')} · ${w.year-p.born}歳 · ${NightCareer.positionNames[p.pos]} · </p>
    <p>関係 ${Math.round(p.relationship||0)} · 能力評価 ${Math.round(w.ability(p))}
    ${w.rivalry[p.id]?' · 対戦 '+w.rivalry[p.id].games+'試合 '+w.rivalry[p.id].wins+'勝':''}</p>
    ${p.history.slice(-3).map(row=>`<p>${row[0]} · ${club(w,row[1])} · ${row[2]}試合 · ${p.pos==='P'?row[11]+'勝':row[5]+'本塁打'}</p>`).join('')}</details>`).join(''):blank);
 }
 function skills(w){
  const keys=w.pitching?M.pitching:M.batting;
  const forms=w.pitching?['オーバー','スリークォーター','サイド']:['基本','振り子','ノーステップ','長打重視'];
  const perks=Z.perkKeys(w).map(k=>Z.perkInfo(w,k)).filter(p=>!p.negative||p.owned);
  return section('練習・能力',`<p>成長タイプ：非公開 · 疲労 ${Math.round(w.health.fatigue)} · スランプ ${w.health.slump>=1?'あり':'なし'}</p><p class="cw-note">練習はメイン画面の「今週の行動」から実行します。</p>${pills('能力',keys.map(k=>'<span>'+NightCareerWorld.training[k]+' '+Math.round(w.player[k])+'</span>').join(''))}`)+
   section('フォーム・転向',`<p>現在のフォーム ${esc(w.form)}</p><div class="cw-grid">${forms.map(x=>act('form',x,x)).join('')}${(w.pitching?['SP','RP','CP']:D.positions).map(x=>act('convert',NightCareer.positionNames[x]||({SP:'先発',RP:'中継ぎ',CP:'抑え'})[x],x)).join('')}</div>`)+
   section('特殊能力・球種',`<p>経験値 ${Math.floor(w.experience)} · 習得条件・費用</p><div class="cw-grid">${perks.map(p=>button('learn',p.key,p.label,'<strong>'+esc(p.label)+'</strong><small>'+(!p.negative&&p.owned?'習得済み':p.negative?'克服 '+p.cost+'pt':p.unlocked?p.cost+'pt':'未解放')+'</small>','cw-perk-card '+(p.negative?'negative':''),!p.unlocked||(!p.negative&&p.owned)||w.experience<p.cost)).join('')}${w.pitching?NightGame.TYPES.filter(t=>!w.player.pitches.includes(t.id)).map(t=>act('learn',t.name,t.id)).join(''):''}</div>`);
 }
 function stats(w){
  return section('個人成績',[['今季',w.club?w.playerYear:w.schoolTotals],['二軍',w.farmStats],['ポストシーズン',w.playerPost],['通算（一軍公式戦）',w.lifetime]].map(([label,s])=>`<h3>${label}</h3>`+pills(label,stat(s,w.pitching))).join(''))+
   (w.club?section('リーグタイトル争い',w.playerRankings().map(board=>`<details><summary>${board.label} · ${esc(board.rows[0]?.name||'—')}</summary><ol class="cw-list">${board.rows.map(p=>`<li>${esc(p.name)} <b>${Number.isInteger(p.value)?p.value:fmt(p.value)}</b></li>`).join('')}</ol></details>`).join(''))+records(w):'');
 }
 function records(w){
  const marks=[['年間本塁打',5],['年間打点',6],['年間勝利',11],['年間奪三振',8],['年間セーブ',12]];
  const people=w.people.concat(w.player);
  const rows=marks.map(([label,key])=>{
   let best=null;
   for(const p of people)for(const r of p===w.player?w.history:p.history){
    const value=Array.isArray(r)?r[key]:({5:r.stats.hr,6:r.stats.rbi,11:r.stats.w,8:r.stats.k,12:r.stats.sv})[key];
    if(w.clubCountry(Array.isArray(r)?r[1]:r.club)!==w.playingCountry||!value||best?.value>=value)continue;
    if(key===8&&p.pos!=='P')continue;
    best={label,value,name:p.name,year:Array.isArray(r)?r[0]:r.year};
   }
   return best?`<p>${best.label} <strong>${best.value}</strong> · ${esc(best.name)} · ${best.year}</p>`:'';
  });
  return section('キャリア世界の歴代記録',rows.join('')||blank);
 }
 function draft(w){
  const d=w.draft,available=d.offer&&d.visible>=d.offer.sequence;
  const open=d.picks.length&&!d.visible;
  const docs=w.country==='jp'?'プロ志望届を提出':w.country==='tw'?'CPBL新人選抜に申請':'KBO新人ドラフトに登録';
  return section(countries[w.country].league+' ドラフト会議',`<p>スカウト評価 ${Math.round(w.schoolScout())} · ${w.day}</p>`+
   (!d.picks.length?act('draft-apply',docs,'','primary-button'):d.visible<d.picks.length?`<div class="cw-grid">${act('draft-next',open?'指名発表を開始':'次の巡目')}${act('draft-all','全指名を表示')}</div>`:'')+
   (d.visible?`<ol class="cw-list cw-scroll" start="${Math.max(1,d.visible-23)}">${d.picks.slice(Math.max(0,d.visible-24),d.visible).map(p=>`<li>${p.round}巡目 · ${club(w,p.club)} · ${esc(p.name)}${p.id===w.player.id?' ★':''}</li>`).join('')}</ol>`:'')+
   (available?`<p><strong>${club(w,d.offer.club)}から${d.offer.round}巡目指名</strong></p>
    ${d.offer.bids.length>1?`<p>競合抽選 · ${d.offer.bids.map(id=>club(w,id)).join('、')}</p>`:''}${act('draft-sign','入団する','','primary-button')}`:
    d.picks.length&&d.visible===d.picks.length?'<p>今季は指名なし。進路を選択できます。</p>':'')+
   `<div class="cw-grid">${(w.country==='kr'?['大学']:w.country==='jp'?['大学','社会人','独立リーグ']:['大学','社会人','再挑戦']).map(x=>act('amateur',x+'へ',x)).join('')}</div>`);
 }
 function market(w){
  if(w.stage!=='offseason')return section('契約',w.contract?`<p>${club(w,w.club)} · 年俸 ${w.money(w.contract.annual)} · 残り${w.contract.remaining}年</p><p>FA算定 ${w.service}年</p>`:blank);
  return section('オフシーズン · 契約オファー',`<p>FA算定 ${w.service}年 · 年齢 ${w.age}歳</p>`+
   (w.contract?.remaining>0?act('stay','契約を継続して翌年へ','','primary-button'):'')+
   `<div class="cw-grid">${act('request','移籍を志願')}${w.contract?.remaining<=0?act('refuse','契約更新を辞退'):''}${act('retire','引退手続き')}</div>`+
   (w.offers.length?w.offers.map((o,i)=>`<details class="cw-offer" ${i===0||w.salaryDemand===i?'open':''}><summary>${club(w,o.club)} · ${esc(o.type)}</summary><p>${o.years}年 · 年俸 ${w.money(o.annual,w.clubCountry(o.club))}</p><p>同ポジションの層 評価 ${Math.round(w.depth(o.club,w.player.pos)/(w.pitching?5:2))}</p><div class="cw-grid">${act('accept','契約する',i,'primary-button')}${w.salaryDemand===null?act('negotiate','年俸交渉',i):''}</div></details>`).join(''):'<p>現在のオファーはありません。</p>'));
 }
 function international(w){
  const a=w.post?.asia;
  return section('アジアシリーズ',`<p>NIGHTBALL独自の復活大会 · 国内王者3球団が出場</p>`+
   (a?`<p>開催地 ${countries[a.host].label}</p>${a.clubs.map(id=>`<p><strong>${club(w,id)}</strong> · ${countries[w.clubCountry(id)].league}王者</p>`).join('')}
    ${table(w,L.asiaStandings(a))}${a.games.map((g,i)=>`<p>${i===3?'決勝':'総当たり'} · ${club(w,g.awayId)} ${g.away}–${g.home} ${club(w,g.homeId)}</p>`).join('')}
    ${a.winner?`<p class="cw-trophy">🏆 ${club(w,a.winner)} · MVP ${esc(w.person(a.mvp)?.name||'—')}</p>`:''}
    ${pills('大会個人成績',stat(a.stats[w.player.id]||M.blank(),w.pitching))}`:blank))+
   section('歴代アジア王者',w.asia.slice().reverse().map(x=>`<p>${x.year} · ${club(w,x.winner)} · MVP ${esc(x.mvp||'—')}</p>`).join('')||blank)+
   section('代表大会',nationalEvents(w));
 }
 function nationalEvents(w){
  return w.national.slice().reverse().map(record=>{
   const current=w.nationalEvent?.cup===record.cup&&w.nationalEvent.year===record.year?w.nationalEvent:null;
   const label=NightCareerWorldInternational.labels;
   const stageRows=(record.stages||current?.history||[]).map(stage=>
    `<h3>${esc(label[stage.key]||stage.key)}</h3>`+
    (stage.rank||[]).map(group=>`<p>${group.map(id=>club(w,id)).join(' / ')}</p>`).join('')+
    `<ul class="cw-news">${stage.results.map(g=>`<li>${club(w,g.homeId)} ${g.home}–${g.away} ${club(w,g.awayId)}</li>`).join('')}</ul>`).join('');
   return `<details><summary>${record.year} · ${esc(record.cup)} · ${esc(record.status)}${record.champion?' · 優勝 '+club(w,record.champion):''}</summary>
    ${record.projected?'<p class="cw-note">ゲーム内開催年・組み合わせ</p>':''}
    ${current&&!current.done?`<p>次回 ${esc(current.next)} · ${esc(label[current.round.key])}</p>`:''}
    ${pills('大会個人成績',stat(record.stats||M.blank(),w.pitching))}${stageRows}</details>`;
  }).join('')||blank;
 }
 function life(w){
  const wallet=w.money(w.life.budget[w.currency]||0);
  const peer=w.members(w.player.club).find(p=>p.id!==w.player.id);
  return section('私生活',`<p>${w.life.housing} · ${wallet} · ${w.life.married?'既婚':w.life.partner?'交際中':'未婚'}</p><div class="cw-grid">
   ${act('life','休養','rest')}${act('life','趣味 '+w.money(w.costs[0]),'hobby')}${act('life','引っ越し '+w.money(w.costs[1]),'move')}
   ${act('life','住居購入 '+w.money(w.costs[2]),'house')}${w.life.car?'<p>自家用車あり</p>':act('life','車を購入 '+w.money(Math.round(w.costs[2]*.10)),'car')}${w.life.partner?act('life',w.life.married?'家族と過ごす':'恋人と過ごす','family'):''}${w.life.sponsor?'<p>スポンサー契約中</p>':''}${act('life','リハビリ','rehab')}
   ${peer?act('social',peer.name+'と交流',peer.id):''}</div>`)+
   section('人気・評価',Object.entries({fans:'ファン人気',media:'メディア',scout:'海外スカウト',coach:'コーチ',manager:'監督',trust:'信頼'}).map(([k,label])=>`<p>${label} <strong>${Math.round(w.ratings[k])}</strong></p>`).join(''));
 }
 function history(w){
  return section('ニュース・年表',`<ol class="cw-list cw-scroll">${w.timeline.slice().reverse().map(x=>`<li><time>${x.day}</time> ${esc(x.message)}</li>`).join('')}</ol>`)+
   section('年度別個人成績',w.history.slice().reverse().map(x=>`<details><summary>${x.year} · ${club(w,x.club)}${x.champion?' · 国内優勝':''}${x.asia?' · アジア優勝':''}</summary>
    ${pills('一軍',stat(x.stats,w.pitching))}<p>年俸 ${w.money(x.salary,x.league)}${x.awards.length?' · '+esc(x.awards.join('、')):''}</p></details>`).join('')||blank);
 }
 function retired(w){
  return section('現役引退 · '+w.retirement.age+'歳',`<p>${countries[w.country].label} · ${esc(w.school)} · ドラフト${w.draftRecord?.round||'—'}巡目</p>
   <p>国内王者 ${w.history.filter(x=>x.champion).length}回 · アジア王者 ${w.history.filter(x=>x.asia).length}回 · 代表 ${w.national.length}回</p>
   <p>最終年俸 ${w.money(w.retirement.annual)} · 特殊能力 ${esc(w.perks.map(k=>Z.perkDefs[k]?.[0]||k).join('、')||'—')}</p><p class="cw-career-award">${w.titles.length>=5?'レジェンド':w.titles.length>=1?'タイトルホルダー':w.lifetime.g>=100?'一軍経験者':'挑戦の記録'} · タイトル ${w.titles.length}回 · プロ ${w.proYear}年</p>`+
   '<h3>通算成績</h3>'+pills('通算成績',stat(w.lifetime,w.pitching))+
   w.moves.map(x=>`<p>${x.day} · ${club(w,x.from)} → ${club(w,x.to)} · ${esc(x.type)}</p>`).join('')+
   act('new','OB記録を保存して新しいキャリアへ','','primary-button'))+history(w);
 }
 window.NightCareerWorldView={setup,dashboard,detail,matchResult,slots,setTab,trainingDeck,progressMenu,careerOptions};
})();
