const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function playoffHTML(league,leagueTabsHTML=''){
 if(league.isNPB)return npbPlayoffHTML(league,leagueTabsHTML);
 const p=league.postseason,s=league.activeSeries,f=league.activeFixture,r=league.activeResult,own=league.userInActiveFixture,club=id=>NightTeams.get(id);
 const badge=id=>`<img src="${esc(club(id).logo)}" alt="" width="54" height="58">`;
 const side=id=>`<div>${badge(id)}<b>${esc(club(id).name)}</b>${id===league.clubId?'<small>あなた</small>':''}</div>`;
 const title=s.id==='qualifier'?'準決勝':'決勝',seed=p.seeds.find(x=>x.clubId===league.clubId)?.seed;
 const notice=p.stage==='complete'?(p.champion===league.clubId?'優勝おめでとう！':`${club(p.champion).name}が優勝`):own?'自チームの試合を操作できます':seed===1&&p.stage==='qualifier'?'1位のあなたは決勝から出場':!seed?'自チームは上位3球団に入れず、出場なし':'自チームの試合は終了。残りの結果を確認できます';
 const seriesHTML=(series,label)=>{
  if(!series)return `<section class="playoff-series waiting"><h2>${label}<small>4勝先取</small></h2><div class="series-waiting">${side(p.seeds[0].clubId)}<span>VS</span><div class="unknown-finalist">準決勝の勝者</div></div></section>`;
  return `<section class="playoff-series ${series===s?'current-series':''}"><h2>${label}<small>${series.target}勝先取</small></h2><div class="series-matchup">${[series.higher,series.lower].map(id=>`<div class="series-team ${series.winner===id?'series-winner':''}">${badge(id)}<strong>${esc(club(id).name)}</strong><div class="series-wins" aria-label="${esc(club(id).name)} ${series.wins[id]}勝">${Array.from({length:series.target},(_,i)=>`<i class="${i<series.wins[id]?'won':''}"></i>`).join('')}</div><b>${series.wins[id]}<small>勝</small></b></div>`).join('<span class="series-versus">VS</span>')}</div>${series.winner?`<div class="series-verdict">${esc(club(series.winner).name)} ${series.id==='qualifier'?'決勝進出':'優勝'}</div>`:''}${series.games.length?`<details class="playoff-game-list" ${series===s?'open':''}><summary>試合結果</summary>${series.games.map(g=>`<div><small>第${g.game}戦</small><span>${esc(club(g.away).mark)}</span><strong>${g.awayScore} − ${g.homeScore}</strong><span>${esc(club(g.home).mark)}</span><small>${g.innings>1?'延長'+g.innings+'回':''}</small></div>`).join('')}</details>`:''}</section>`;
 };
 let action,label;
 if(p.stage==='complete'){action='picker';label='新しいペナントへ';}
 else if(r){action='playoff-next';label=s.winner?'決勝へ進む':'次の試合へ';}
 else{action=own?'play':'playoff-simulate';label=own?(league.currentGame?'試合を再開':'試合開始'):'この試合を自動進行';}
 return `<div class="league-heading"><button class="text-button" data-league-action="home">◀ ホーム</button><h1>プレーオフ</h1></div>${leagueTabsHTML}<div class="playoff-seeds">${p.seeds.map(x=>`<div class="${x.clubId===league.clubId?'your-seed':''}"><small>シーズン${x.seed}位</small>${badge(x.clubId)}<strong>${esc(club(x.clubId).name)}</strong></div>`).join('')}</div>${p.stage==='complete'?`<div class="champion-banner playoff-champion"><span>PLAYOFF CHAMPION</span>${badge(p.champion)}<strong>優 勝</strong><b>${esc(club(p.champion).name)}</b></div>`:''}<p class="playoff-status">${esc(notice)}</p><section class="league-match-card playoff-current ${r?(r.homeScore>r.awayScore?f.home:f.away)===league.clubId?'won':'lost':''}"><div class="league-card-kicker"><span>${r?'試合結果':'次の試合'}</span><span>${title} 第${f.game}戦</span></div><div class="league-versus">${side(f.away)}<strong class="final-score">${r?`<b>${r.awayScore}</b><span>−</span><b>${r.homeScore}</b>`:'VS'}</strong>${side(f.home)}</div><p>${r?'試合終了'+(r.innings>1?'・延長'+r.innings+'回':''):'1回制 / 2アウト満塁 / 同点は延長'}</p><button class="primary-button" data-league-action="${action}">${label}</button>${own&&!r&&!league.currentGame?'<button class="league-inline-button" data-league-action="lineup">オーダー編成</button>':''}${r?.report?'<button class="league-inline-button" data-league-action="playoff-report">この試合の成績</button>':''}</section>${seriesHTML(p.qualifier,'2位 vs 3位')}${seriesHTML(p.final,'1位 vs 準決勝の勝者')}<p class="league-footnote">準決勝は2勝先取（最大3試合）、決勝は4勝先取（最大7試合）。勝ち数の持ち越し・アドバンテージなし。上位球団は準決勝の第1・3戦、決勝の第1・2・5・7戦で後攻。</p><p class="league-footnote">勝敗・得失点差まで同じ場合、直接対決、総得点、球団順でシードを決定します。</p>`;
}

function npbPlayoffHTML(league,tabs){
 const p=league.postseason,s=league.activeSeries,f=league.activeFixture,r=league.activeResult,own=league.userInActiveFixture;
 const club=id=>NightTeams.get(id),name=id=>esc(club(id).short);
 const badge=id=>`<img src="${esc(club(id).logo)}" alt="" width="54" height="58">`;
 const title=series=>NightNPBPostseason.title(series);
 const complete=p.stage==='complete',draw=r&&r.homeScore===r.awayScore;
 const ownSeed=p.brackets[league.leagueId].seeds.find(x=>x.clubId===league.clubId)?.seed;
 const status=complete?`${name(p.champion)}が日本一`:own?'あなたの球団の試合':!ownSeed?'自球団はレギュラーシーズンで敗退':ownSeed===1&&p.stage==='qualifier'?'リーグ1位のためファイナルステージから出場':'この試合は自動進行できます';
 const park=NightPlayers.parks.find(park=>park.id===club(f.home).park);
 const team=(id,label)=>`<div>${badge(id)}<b>${name(id)}</b><small>${label}${id===league.clubId?' · あなた':''}</small></div>`;
 let action='picker',label='新しいペナントへ';
 if(!complete){
  if(r){action='playoff-next';label=!s.winner?'次の試合へ':p.stage==='qualifier'?'ファイナルステージへ':'日本シリーズへ';}
  else{action=own?'play':'playoff-simulate';label=own?(league.currentGame?'試合を再開':'試合開始'):'この試合を自動進行';}
 }
 const seriesCard=series=>{
  const stageWinner=series.id==='japan'?'日本一':series.id.endsWith('-first')?'ファイナル進出':'日本シリーズ進出';
  return `<section class="playoff-series ${series===s?'current-series':''}"><h2>${title(series)}<small>${series.target}勝先取</small></h2>
   <div class="series-matchup">${[series.higher,series.lower].map(id=>`<div class="series-team ${series.winner===id?'series-winner':''}">${badge(id)}<strong>${name(id)}</strong>
    <div class="series-wins" aria-hidden="true">${Array.from({length:series.target},(_,i)=>`<i class="${i<series.wins[id]?'won':''}"></i>`).join('')}</div>
    <b>${series.wins[id]}<small>勝</small></b>${id===series.higher&&series.advantage?`<small class="npb-advantage">アドバンテージ ${series.advantage}勝</small>`:''}</div>`).join('<span class="series-versus">VS</span>')}</div>
   ${series.winner?`<p class="series-verdict">${name(series.winner)} ${stageWinner}</p>`:''}
   ${series.games.length?`<details class="playoff-game-list" ${series===s?'open':''}><summary>試合結果</summary>${series.games.map(g=>`<div><small>第${g.game}戦</small><span>${esc(club(g.away).mark)}</span><strong>${g.awayScore} − ${g.homeScore}</strong><span>${esc(club(g.home).mark)}</span><small>${g.homeScore===g.awayScore?'引分':g.innings>9?`延長${g.innings}回`:''}</small></div>`).join('')}</details>`:''}</section>`;
 };
 const bracketCard=(id,open)=>{
  const b=p.brackets[id];
  return `<details class="league-schedule npb-bracket" ${open?'open':''}><summary>${NightPennant.leagues[id]} CS <span>${b.final?.winner?name(b.final.winner):'＋'}</span></summary>
   <div class="playoff-seeds">${b.seeds.map(x=>`<div class="${x.clubId===league.clubId?'your-seed':''}"><small>シーズン${x.seed}位</small>${badge(x.clubId)}<strong>${name(x.clubId)}</strong></div>`).join('')}</div>
   ${seriesCard(b.qualifier)}${b.final?seriesCard(b.final):`<p class="playoff-status">ファイナルステージは ${name(b.seeds[0].clubId)} 対 ファーストステージの勝者</p>`}</details>`;
 };
 const resultClass=r&&own&&!draw?((r.homeScore>r.awayScore?f.home:f.away)===league.clubId?'won':'lost'):'';
 return `<div class="league-heading"><button class="text-button" data-league-action="home">◀ ホーム</button><h1>${p.japan?'日本シリーズ':'クライマックスシリーズ'}</h1></div>${tabs}
  ${complete?`<div class="champion-banner playoff-champion">${badge(p.champion)}<strong>日本一</strong><b>${name(p.champion)}</b></div>`:`<p class="playoff-status">${status}</p>`}
  <section class="league-match-card playoff-current ${resultClass}"><div class="league-card-kicker"><span>${r?'試合結果':'次の試合'}</span><span>${title(s)} 第${f.game}戦</span></div>
   <div class="league-versus">${team(f.away,'先攻')}<strong class="final-score">${r?`<b>${r.awayScore}</b><span>−</span><b>${r.homeScore}</b>`:'VS'}</strong>${team(f.home,'後攻')}</div>
   <p>${park?esc(park.name):name(f.home)+'の本拠地'}<br>${r?`${draw?'引き分け':'試合終了'}${r.innings>9?` · 延長${r.innings}回`:''}`:`9回制 / ${f.maxInnings?'延長12回まで':'延長無制限'}`}</p>
   <button class="primary-button" data-league-action="${action}">${label}</button>
   ${own&&!r&&!league.currentGame?'<button class="league-inline-button" data-league-action="lineup">オーダー編成</button>':''}
   ${r?.report?'<button class="league-inline-button" data-league-action="playoff-report">この試合の成績</button>':''}</section>
  ${p.japan?seriesCard(p.japan):''}
  ${bracketCard(league.leagueId,!p.japan)}${bracketCard(league.otherLeague,false)}`;
}
