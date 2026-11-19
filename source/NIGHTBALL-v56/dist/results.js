const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Existing pennant reports store the logo path at the time of the game.
const reportLogo=path=>path?.replace(/^(\.\/assets\/(?:npb\/npb|kbo\/kbo)-[a-z]+)\.svg$/,'$1.png');
const ip=outs=>`${Math.floor((outs||0)/3)}.${(outs||0)%3}`;
export function buildMatchReport(g){
 const summary=g.matchSummary();
 return {innings:g.inning,ended:g.phase==='ended',decision:summary.decision,heroes:summary.heroes,teams:Object.fromEntries(['away','home'].map(side=>{
  const club=g.teams[side],used=new Set(side===g.userSide?g.usedPitchers:g.usedCpuPitchers);
  return [side,{name:club.name,logo:club.logo,score:g[side+'Score'],hits:g[side+'Hits'],line:g[side].slice(),batters:[...new Set(g.participants[side])].map(id=>{const p=club.batters.find(p=>p.id===id);return {id,name:p?.name||id,removed:g.removedPlayers[side].includes(id),...(g.box[id]||{})};}),pitchers:club.pitchers.filter((p,i)=>used.has(i)).map(p=>({id:p.id,name:p.name,...(g.pitchingStats[p.id]||{})}))}];
 }))};
}
export function lineScoreHTML(report){
 const {teams,highlight,changes=[],hideHits=false}=report;
 const n=Math.max(report.innings,teams.away.line.length,teams.home.line.length);
 return `<div class="scoreline-scroll"><table class="scoreline-table"><caption>イニング別スコア</caption>
 <thead><tr><th scope="col">チーム</th>${Array.from({length:n},(_,i)=>`<th scope="col"${i+1===highlight?' class="scoreline-current" aria-current="true"':''}>${i+1}</th>`).join('')}<th scope="col">計</th>${hideHits?'':'<th scope="col">安</th>'}</tr></thead>
 <tbody>${['away','home'].map(side=>{
  const t=teams[side];
  return `<tr><th scope="row">${t.logo?`<img src="${escape(reportLogo(t.logo))}" alt="">`:''}${escape(t.name)}</th>
  ${Array.from({length:n},(_,i)=>{
   const changed=changes.some(x=>x.side===side&&x.inning===i+1);
   const value=t.line[i]??(side==='home'&&i===report.innings-1&&report.ended&&t.score>teams.away.score?'×':'－');
   return `<td class="${i+1===highlight?'scoreline-current ':''}${changed?'scoreline-changed':''}">${value}</td>`;
  }).join('')}<td class="scoreline-total">${t.score}</td>${hideHits?'':`<td>${t.hits}</td>`}</tr>`;
 }).join('')}</tbody></table></div>`;
}
export function resultReportHTML(report){
 const d=report.decision;
 return `<section class="match-report">${lineScoreHTML(report)}<div class="pitcher-decisions"><div><small>勝利投手</small><strong>${escape(d?.winner?.name||'—')}</strong></div><div><small>敗戦投手</small><strong>${escape(d?.loser?.name||'—')}</strong></div></div>${report.heroes.length?`<h3 class="report-heading">活躍した選手</h3><div class="hero-players">${report.heroes.map(({player:p,bat:b,pitch:q})=>`<div><span class="hero-team"><img src="${escape(reportLogo(report.teams[p.side].logo))}" alt=""></span><div><strong>${escape(p.name)}</strong><small>${b?`${b.ab}打数 ${b.h}安打${b.hr?' '+b.hr+'本塁打':''} ${b.rbi}打点`:q?`${ip(q.outs)}回 ${(q.k||0)}奪三振 ${q.runs}失点`:''}</small></div></div>`).join('')}</div>`:''}<small class="record-basis">勝敗投手は短縮試合用のゲーム内記録。決勝のリードと走者の責任投手から算出。</small></section>`;
}
export function playerBoxHTML(report,side){
 const t=report.teams[side];
 return `<div class="box-team-heading">${t.logo?`<img src="${escape(reportLogo(t.logo))}" alt="">`:''}<b>${escape(t.name)}</b></div><div class="box-scroll"><table class="box-table detailed-box"><caption>打撃成績</caption><thead><tr><th>選手</th><th>打数</th><th>安打</th><th>得点</th><th>打点</th><th>HR</th><th>四球</th><th>三振</th></tr></thead><tbody>${t.batters.map(p=>`<tr><th>${escape(p.name)}${p.removed?'<small>交代</small>':''}</th>${['ab','h','r','rbi','hr','bb','k'].map(k=>`<td>${p[k]||0}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="box-scroll"><table class="box-table detailed-box"><caption>投手成績</caption><thead><tr><th>投手</th><th>回</th><th>球数</th><th>被安打</th><th>奪三振</th><th>四球</th><th>失点</th></tr></thead><tbody>${t.pitchers.map(p=>`<tr><th>${escape(p.name)}</th><td>${ip(p.outs)}</td>${['pitches','h','k','bb','runs'].map(k=>`<td>${p[k]||0}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="modal-note">失点は走者を出した投手へ記録。自責点とは異なります。旧セーブの未記録項目は再開後から集計します。</p>`;
}
