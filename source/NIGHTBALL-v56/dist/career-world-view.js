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
   ${field('出身地域','region',c.region.map(r=>[r,r]))}${field('高校','schoolIndex',schools[country].map((s,i)=>[i,s]))}
   ${field('学校の強さ','schoolTier',country==='tw'?[[1,'中堅校・木棒組'],[2,'強豪校・木棒組'],[0,'弱小校・鋁棒組']]:[[1,'中堅校'],[2,'強豪校'],[0,'弱小校']])}
   ${field('スタイル','style',styles)}
   ${field('守備位置','position',[['','スタイルに合わせる'],...D.positions.map(p=>[p,NightCareer.positionNames[p]])])}
   ${field('打席','hand',[['R','右打'],['L','左打']])}${field('投球','throwHand',[['R','右投'],['L','左投']])}
   ${field('成長タイプ','growth',[1,0,2,3,4,5].map(i=>[i,D.types[i]]))}
   ${field('難易度','difficulty',[['normal','ノーマル'],['easy','イージー'],['hard','ハード']])}
   ${field('プロの試合数','season',[['short','短縮'],['standard','標準']])}
   </div>
   <button type="submit" class="primary-button">高校に入学する</button>${act('country','国・地域の選択へ戻る')}</form>`;
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
 function dashboard(w,legacy){
  const f=w.active,next=upcoming(w),clubId=w.club;
  const p=w.player,country=countries[w.country];
  const status=w.stage==='retired'?'引退':w.stage==='draft'?'ドラフト':w.stage==='offseason'?'契約・移籍':
   w.health.injury?'故障で離脱中':f?f.kind==='farm'?'二軍・'+M.roleText[w.usage(f)]:M.roleText[w.usage(f)]:
   w.selection?.level==='first'?'一軍':w.selection?.level==='farm'?'二軍':w.club?'出場選考前':'選考中';
  const marks=NightTeams.get(clubId),badge=clubId&&marks.id===clubId&&marks.logo?'<img class="cw-team-logo" src="'+esc(marks.logo)+'" alt="">':'';
  const rank=w.club&&w.seasonDays?rankOf(w):null;
  const hero=`<section class="career-panel cw-hero"><div class="cw-profile">${badge}<div>
   <p class="cw-profile-line">${country.label}出身 · ${w.age}歳 · ${w.yearLabel}</p>
   <h2>${esc(w.name)}</h2>
   <p>${esc(w.club?w.clubName(w.club):w.path||w.school)} · ${NightCareer.positionNames[p.pos]||p.pos}${rank?' · '+rank+'位':''}</p>
   </div><div class="cw-date"><time datetime="${w.day}">${w.day.replaceAll('-','/')}</time><b>${esc(status)}</b></div></div></section>`;
  const action=w.stage==='draft'?draft(w):w.stage==='offseason'?market(w):w.stage==='retired'?retired(w):daily(w,f,next);
  const scores=w.club?w.playerYear:w.schoolTotals;
  const ability=(w.pitching?M.pitching:M.batting).map(key=>`<span>${NightCareerWorld.training[key]} <b>${Math.round(p[key])}${key==='velocity'?' km/h':''}</b></span>`).join('');
  const health=w.health.injury?'故障残り '+w.health.injury+'日':w.health.slump>=1?'スランプ':w.health.fatigue>55?'疲労が高い':'良好';
  const state=section(w.club?'今季の成績と能力':'高校の成績と能力',
   pills('成績',stat(scores,w.pitching))+pills('能力',ability)+
   `<dl class="cw-summary"><div><dt>監督評価</dt><dd>${Math.round(w.ratings.manager)}</dd></div><div><dt>コンディション</dt><dd>${health}</dd></div><div><dt>疲労</dt><dd>${Math.round(w.health.fatigue)}</dd></div></dl>`+
   (w.lastGrowth?`<p class="cw-note">${esc(w.lastGrowth.day)} · ${esc(w.lastGrowth.text)}</p>`:'')+
   (w.selection?`<p class="cw-note">${esc(w.selection.reason)}</p>`:'')+
   act('detail','成績とポジション争い','players','cw-link'));
  const recent=w.timeline.slice(-3).reverse();
  const news=section('試合結果・ニュース',
   (w.last?`<p class="cw-last"><strong>${w.last.score.join(' – ')}</strong> ${esc(w.last.opponent)} <small>${esc(w.last.name)} · ${w.last.day}</small></p>`+
    act('last-result','前回の試合結果','','cw-link'):'')+
   (recent.length?`<ul class="cw-news">${recent.map(x=>`<li><time>${esc(x.day.slice(5).replace('-','/'))}</time>${esc(x.message)}</li>`).join('')}</ul>`:blank)+
   act('detail','年表・年度別成績','history','cw-link'));
  const extras=`<div class="cw-details">${act('detail','日程・大会','schedule','cw-link')}${act('detail','フォーム・特殊能力','skills','cw-link')}
   ${w.club?act('detail','契約・生活','life','cw-link')+act('detail','国際大会','international','cw-link'):act('detail','生活・交流','life','cw-link')}
   ${act('music','応援歌設定','','cw-link')}</div>`;
  return title('選手キャリア',legacy)+hero+action+(w.stage==='retired'?'':state+news)+extras;
 }
 function successPanel(w){
  const s=Z.state(w);
  const meter='<div class="cw-success-meter"><div><span>体力</span><b>'+Math.round(s.energy)+'/100</b><meter min="0" max="100" value="'+s.energy+'"></meter></div>'+
   '<div><span>気分</span><b>'+Math.round(s.morale)+'/100</b><meter min="0" max="100" value="'+s.morale+'"></meter></div></div>';
  if(s.pending){
   const e=s.pending;
   if(e.type==='drill'){
    const q=Z.currentQuestion(w);
    return meter+'<div class="cw-success-scene" role="group" aria-label="実戦練習"><p class="cw-scene-kicker">実戦特訓 · '+(e.index+1)+'/3回</p>'+
     '<h3>'+esc(e.title)+'</h3><p>'+esc(q[0])+'</p><div class="cw-choices">'+q[1].map((label,i)=>act('success-choice',label,i,i===0?'primary-button':'secondary-button')).join('')+'</div>'+
     '<p class="cw-note">成功 '+e.correct+'回 / 3回 · '+esc(e.results?.at(-1)?.message||'安全策と大胆な挑戦で成功率と成長量が変わります。')+'</p></div>';
   }
   return meter+'<div class="cw-success-scene" role="group" aria-label="キャリアイベント"><p class="cw-scene-kicker">今週のイベント</p>'+
    '<h3>'+esc(e.title)+'</h3><p>'+esc(e.body)+'</p><div class="cw-choices">'+
     e.choices.map((option,i)=>act('success-choice',option.label,i,i===0?'primary-button':'secondary-button')).join('')+'</div></div>';
  }
  if(s.menu){
   const keys=w.pitching?M.pitching:M.batting;
   return meter+'<div class="cw-success-scene"><p class="cw-scene-kicker">'+(s.menu==='special'?'実戦特訓':'基礎練習')+'</p>'+
    '<h3>伸ばしたい能力を選ぶ</h3><p class="cw-note">'+(s.menu==='special'?'3回の実戦チャレンジ。安全策は成功しやすく、大胆な挑戦は上振れを狙えます。':'通常練習は選択後すぐに結果が出ます。好調・大成功だけでなく、伸び悩む週もあります。')+'</p>'+
    '<div class="cw-grid">'+keys.map(key=>act('success-skill',NightCareerWorld.training[key]+' '+Math.round(w.player[key]),key)).join('')+
    act('success-back','戻る')+'</div></div>';
  }
  const inbox=s.inbox?'<div class="cw-success-inbox"><strong>新しいイベント：'+esc(s.inbox.title)+'</strong><p>今週の出来事を確認できます。</p>'+act('success-event','イベントを見る','','primary-button')+act('success-dismiss','今回は見送る')+'</div>':'';
  if(Z.available(w)){
   return meter+inbox+'<div class="cw-success-cmd"><h3>今週の行動を選ぶ</h3><p class="cw-note">1週間に1つ。選んだ行動で成長・体力・仲間との関係が変わります。</p>'+
    '<div class="cw-grid cw-command-grid">'+act('success-action','⚾ 練習','practice','primary-button')+
    act('success-action','🔥 実戦特訓','special')+act('success-action','🛌 休む','rest')+
    act('success-action','💬 交流','friend')+act('success-action','🌿 遊ぶ','outing')+'</div></div>'+
    (s.last?'<p class="cw-last-action"><strong>前回：</strong>'+esc(s.last.title)+' · '+esc(s.last.summary)+'</p>':'');
  }
  return meter+inbox+'<p class="cw-last-action"><strong>今週の行動は完了</strong>'+
   (s.last?' · '+esc(s.last.title)+'：'+esc(s.last.summary):' · 次の週へ進めます')+'</p>';
 }
 function daily(w,f,next){
  const elapsed=next?Math.max(0,Math.round((Date.parse(next.day)-Date.parse(w.day))/86400000)):null;
  const park=next?.fixture?.park?NightPlayers.parks.find(x=>x.id===f.park)?.name:null;
  const role=f?w.usage(f):null;
  const eligible=w.canPlay(f);
  const info=next?'<div class="cw-fixture"><div><p class="cw-fixture-date">'+esc(next.day)+' · '+(elapsed===0?'本日':elapsed+'日後')+'</p>'+
   '<h3>'+esc(next.name)+'</h3><p>'+(next.opponent?'対 '+club(w,next.opponent):'対戦相手は抽選・進行後に決定')+(park?' · '+esc(park):'')+'</p></div></div>':'';
  let contents;
  if(f){
   const reason=w.health.injury?'故障のため欠場':role==='bench'?'今日は登板予定なし':role==='inactive'?'出場メンバー外':'';
   contents=info+(w.currentGame?act('play','試合を再開','','primary-button'):
    eligible?'<p class="cw-note">'+esc(M.roleText[role])+(f.development?' · 今学年の出場機会':'')+'</p>'+
      '<div class="cw-grid">'+act('play','自分の出番をプレー','self','primary-button')+act('play','フル試合をプレー','full')+
      act('play','重要場面だけ','key')+act('simulate','この試合を自動進行')+'</div>':
      '<p class="cw-note">'+reason+'</p>'+act('simulate','試合結果を確認する','','primary-button'));
  }else{
   const upcomingSchool=['school','amateur'].includes(w.stage)?
    NightCareerWorldSchool.calendar(w).find(e=>e.format>=3&&e.day>=w.day):null;
   contents=info+(upcomingSchool&&upcomingSchool.name!==next?.name?
      '<p class="cw-note">次の節目 · '+esc(upcomingSchool.name)+' '+upcomingSchool.day+'</p>':'')+
     (next?.opponent?'<p class="cw-note">'+(w.health.injury>elapsed?'故障のため欠場見込み':'出場予定は当日の選考で決定')+'</p>':'')+
     successPanel(w)+
     '<div class="cw-grid cw-next-buttons">'+act('advance','次の週へ','week','primary-button')+
     act('advance','次の試合へ','game')+act('advance','重要イベントへ','event')+
     act('advance','1日だけ進める','day')+'</div>'+
     '<details class="cw-batch"><summary>まとめて進める</summary>'+
      '<p>通常試合を自動処理し、学年最初の出場機会や重要な大会では停止します。</p>'+
      act('advance','シーズンを自動進行','season')+'</details>';
  }
  return section(f?'今日の試合':'今日の行動',(w.success?.goal?'<p class="cw-goal"><strong>次戦の課題：</strong>'+esc(w.success.goal.label)+'</p>':'')+contents);
 }
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
  const id=w.player.club,l=M.lineup(w,id,w.playingCountry,w.day);
  const pos=w.player.pos;
  const peers=w.members(id).filter(p=>p.positions.includes(pos)).sort((a,b)=>M.positionScore(w,b,pos,w.playingCountry)-M.positionScore(w,a,pos,w.playingCountry));
  const cohort=w.people.filter(p=>p.school&&p.club!==id).sort((a,b)=>(w.rivalry[b.id]?.games||0)-(w.rivalry[a.id]?.games||0)).slice(0,12);
  return section('ポジション争い · '+NightCareer.positionNames[pos],`<ol class="cw-list">${peers.map(p=>`<li><strong>${esc(p.name)}</strong> · ${w.year-p.born}歳 · 評価 ${Math.round(M.positionScore(w,p,pos,w.playingCountry))}
   ${p.injury?' · 故障':''}${p.id===w.player.id?' · あなた':''} ${p.pos==='P'?(p.stats.outs?' · 防御率 '+fmt(M.era(p.stats),2):''):(p.stats.ab?' · 打率 '+fmt(M.rate(p.stats.h,p.stats.ab)):'')}</li>`).join('')}</ol>`)+
   section('今日の想定オーダー',`<ol class="cw-list">${Object.entries(l.assign).map(([p,id])=>`<li>${p} · ${esc(w.person(id)?.name)}</li>`).join('')}<li>先発 · ${esc(l.starter?.name)}</li></ol>`)+
   section('高校時代の選手',cohort.length?cohort.map(p=>`<details><summary>${esc(p.name)} · ${esc(p.stage==='retired'?'引退':p.club?w.clubName(p.club):p.amateur||'アマチュア')}</summary>
    <p>${esc(p.school)} · ${esc(countries[p.nation]?.label||'海外')} · ${w.year-p.born}歳 · ${NightCareer.positionNames[p.pos]} · ${D.types[p.growth]}</p>
    <p>関係 ${Math.round(p.relationship||0)} · 能力評価 ${Math.round(w.ability(p))}
    ${w.rivalry[p.id]?' · 対戦 '+w.rivalry[p.id].games+'試合 '+w.rivalry[p.id].wins+'勝':''}</p>
    ${p.history.slice(-3).map(row=>`<p>${row[0]} · ${club(w,row[1])} · ${row[2]}試合 · ${p.pos==='P'?row[11]+'勝':row[5]+'本塁打'}</p>`).join('')}</details>`).join(''):blank);
 }
 function skills(w){
  const keys=w.pitching?M.pitching:M.batting;
  const forms=w.pitching?['オーバー','スリークォーター','サイド']:['基本','振り子','ノーステップ','長打重視'];
  const perks=w.pitching?{pressure:'対ピンチ',lateLife:'球威',recovery:'回復'}:{clutch:'チャンス',discipline:'選球眼',bunt:'バント',speed:'走塁'};
  return section('練習・能力',`<p>${D.types[w.player.growth]} · 疲労 ${Math.round(w.health.fatigue)} · スランプ ${w.health.slump>=1?'あり':'なし'}</p><p class="cw-note">練習はメイン画面の「今週の行動」から実行します。</p>${pills('能力',keys.map(k=>'<span>'+NightCareerWorld.training[k]+' '+Math.round(w.player[k])+'</span>').join(''))}`)+
   section('フォーム・転向',`<p>現在のフォーム ${esc(w.form)}</p><div class="cw-grid">${forms.map(x=>act('form',x,x)).join('')}${(w.pitching?['SP','RP','CP']:D.positions).map(x=>act('convert',NightCareer.positionNames[x]||({SP:'先発',RP:'中継ぎ',CP:'抑え'})[x],x)).join('')}</div>`)+
   section('特殊能力・球種',`<p>経験値 ${Math.floor(w.experience)} · 習得に12必要</p><div class="cw-grid">${Object.entries(perks).map(([k,v])=>act('learn',v+(w.perks.includes(k)?' ✓':''),k)).join('')}${w.pitching?NightGame.TYPES.filter(t=>!w.player.pitches.includes(t.id)).map(t=>act('learn',t.name,t.id)).join(''):''}</div>`);
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
  return section('私生活',`<p>${w.life.housing} · ${wallet} · ${w.life.married?'既婚':'未婚'}</p><div class="cw-grid">
   ${act('life','休養','rest')}${act('life','趣味 '+w.money(w.costs[0]),'hobby')}${act('life','引っ越し '+w.money(w.costs[1]),'move')}
   ${act('life','住居購入 '+w.money(w.costs[2]),'house')}${act('life','家族・恋愛','family')}${act('life','リハビリ','rehab')}
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
   <p>最終年俸 ${w.money(w.retirement.annual)} · 特殊能力 ${esc(w.perks.join('、')||'—')}</p>`+
   '<h3>通算成績</h3>'+pills('通算成績',stat(w.lifetime,w.pitching))+
   w.moves.map(x=>`<p>${x.day} · ${club(w,x.from)} → ${club(w,x.to)} · ${esc(x.type)}</p>`).join('')+
   act('new','OB記録を保存して新しいキャリアへ','','primary-button'))+history(w);
 }
 window.NightCareerWorldView={setup,dashboard,detail,matchResult,slots};
})();
