/* Career-only views. The live game uses the existing HUD. */
(()=>{
 'use strict';
 const D=NightCareerWorldData,M=NightCareerWorldMatch,L=NightCareerWorldLeagues;
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
 const title=(screen,legacy)=>`<div class="career-heading"><button type="button" class="career-back" data-world-action="home">◀ ホーム</button><h1>${esc(screen)}</h1>${legacy?act('legacy','従来キャリア','','career-back'):''}</div>`;
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
 const tabs={home:'ホーム',schedule:'日程・順位',squad:'起用・選手',skills:'練習',stats:'成績',market:'契約',international:'国際',life:'生活',history:'年表'};
 function dashboard(w,tab,legacy){
  const current=w.club?w.clubName(w.club):w.path||w.school;
  const rating=pills('評価',`<span>監督評価 ${Math.round(w.ratings.manager)}</span><span>コーチ ${Math.round(w.ratings.coach)}</span><span>信頼 ${Math.round(w.ratings.trust)}</span>`);
  const scores=w.club?w.playerYear:w.schoolTotals;
  const rank=w.club?rankOf(w):null;
  const hero=`<section class="career-panel cw-hero"><div><span>${esc(countries[w.playingCountry].label)} · ${w.club?w.leagueLabel:'高校・アマ'} · ${w.day}</span>
   <h2>${esc(w.name)}</h2><p>${esc(current)} · ${w.age}歳 · ${w.yearLabel}</p></div>
   ${pills('今季成績',stat(scores,w.pitching))}
   ${rating}
   <p class="cw-note">${rank?`順位 ${rank}位 · `:''}${w.health.injury?'故障離脱 '+w.health.injury+'日':w.active?M.roleText[w.usage(w.active)]:w.club?'所属選手':'高校選手'}
   ${w.lastGrowth?' · '+esc(w.lastGrowth.text):''}</p></section>`;
  const navigation=`<nav class="cw-tabs" aria-label="キャリア"> ${Object.entries(tabs).map(([id,label])=>
    `<button data-world-action="tab" data-value="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</nav>`;
  const render={home:overview,schedule,squad,skills,stats,market,international,life,history};
  const body=w.stage==='draft'&&tab==='home'?draft(w):w.stage==='retired'&&tab==='home'?retired(w):render[tab](w);
  return title('選手キャリア',legacy)+hero+navigation+body;
 }
 function rankOf(w){
  const c=NightTeams.get(w.club),division=w.playingCountry==='jp'?c.division:null;
  return w.standingsFor(w.playingCountry,'all',division).findIndex(x=>x.id===w.club)+1;
 }
 function overview(w){
  if(w.stage==='offseason')return market(w);
  const f=w.active,day=w.nextTarget(),role=f?w.usage(f):null;
  const canPlay=f&&!['inactive','bench'].includes(role)&&!w.health.injury;
  const next=f?`<p>${f.day} · ${esc(f.name)}</p><p><strong>${club(w,f.away)} VS ${club(w,f.home)}</strong></p>`:
   `<p>次の日程 ${esc(day)}</p>`;
  return section('次の試合',next+
   (f?'<div class="cw-grid">'+(w.currentGame?act('play','中断した試合を再開','','primary-button'):
    canPlay?act('play',w.format==='auto'?'自動で試合を進める':'試合へ進む','','primary-button'):'')+
    (w.currentGame?'':act('simulate','自動で試合を進める'))+'</div>':'')+
   (!w.currentGame?`<div class="cw-modes">${Object.entries(NightCareerWorld.formats).map(([id,label])=>
    `<button type="button" data-world-action="format" data-value="${id}" aria-pressed="${w.format===id}">${label}</button>`).join('')}</div>`:''))+
   (!w.currentGame?section('日程を進める',`<div class="cw-grid">${[['day','1日'],['week','1週間'],['game','次の出場'],['event','重要イベント'],['season','シーズン終了']].map(([id,label])=>act('advance',label,id)).join('')}</div>`):'')+
   (w.last?section('直前の試合',`<p>${esc(w.last.name)} · ${esc(w.last.opponent)} <strong>${w.last.score.join(' – ')}</strong></p>`+pills('個人成績',stat(w.last.stat,w.pitching))):'')+
   section('次の目標',`<p>${w.club?w.playerYear.g?'所属球団で出場を重ね、国内優勝を目指す':'二軍の成績を伸ばし、同ポジションの選手から出場枠を奪う':w.stage==='amateur'?'スカウトにアピールし、ドラフトを目指す':'公式戦と練習で評価を上げ、地元のドラフトを目指す'}</p>`);
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
  const id=w.club||'school-player',l=M.lineup(w,id,w.playingCountry,w.day);
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
  return section('練習・能力',`<p>${D.types[w.player.growth]} · 疲労 ${Math.round(w.health.fatigue)} · スランプ ${w.health.slump>=1?'あり':'なし'}</p><div class="cw-grid">${keys.map(k=>act('train',NightCareerWorld.training[k]+' '+Math.round(w.player[k]),k)).join('')}</div>`)+
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
  return section(countries[w.country].league+' ドラフト',`<p>スカウト評価 ${Math.round(w.schoolScout())} · ${w.day}</p>`+
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
   (w.offers.length?w.offers.map((o,i)=>`<div class="cw-offer"><b>${club(w,o.club)}</b><p>${esc(o.type)} · ${o.years}年 · 年俸 ${w.money(o.annual,w.clubCountry(o.club))}</p><p>同ポジションの層 評価 ${Math.round(w.depth(o.club,w.player.pos)/(w.pitching?5:2))}</p><div class="cw-grid">${act('accept','契約する',i,'primary-button')}${act('negotiate','年俸交渉',i)}</div></div>`).join(''):'<p>現在のオファーはありません。</p>'));
 }
 function international(w){
  const a=w.post?.asia;
  return section('アジアシリーズ',`<p>NIGHTBALL独自の復活大会 · 国内王者3球団が出場</p>`+
   (a?`<p>開催地 ${countries[a.host].label}</p>${a.clubs.map(id=>`<p><strong>${club(w,id)}</strong> · ${countries[w.clubCountry(id)].league}王者</p>`).join('')}
    ${table(w,L.asiaStandings(a))}${a.games.map((g,i)=>`<p>${i===3?'決勝':'総当たり'} · ${club(w,g.awayId)} ${g.away}–${g.home} ${club(w,g.homeId)}</p>`).join('')}
    ${a.winner?`<p class="cw-trophy">🏆 ${club(w,a.winner)} · MVP ${esc(w.person(a.mvp)?.name||'—')}</p>`:''}
    ${pills('大会個人成績',stat(a.stats[w.player.id]||M.blank(),w.pitching))}`:blank))+
   section('歴代アジア王者',w.asia.slice().reverse().map(x=>`<p>${x.year} · ${club(w,x.winner)} · MVP ${esc(x.mvp||'—')}</p>`).join('')||blank)+
   section('代表歴',w.national.map(x=>`<p>${x.year} · ${countries[x.nation].label} · ${x.cup} · ${x.status} · ${x.stats?.g||0}試合</p>`).join('')||blank);
 }
 function life(w){
  const wallet=w.money(w.life.budget[w.currency]||0);
  const peer=w.members(w.club||'school-player').find(p=>p.id!==w.player.id);
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
   pills('通算成績',stat(w.lifetime,w.pitching))+
   w.moves.map(x=>`<p>${x.day} · ${club(w,x.from)} → ${club(w,x.to)} · ${esc(x.type)}</p>`).join('')+
   act('new','OB記録を保存して新しいキャリアへ','','primary-button'))+history(w);
 }
 window.NightCareerWorldView={setup,dashboard};
})();
