const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Existing pennant reports store the logo path at the time of the game.
const reportLogo=path=>path?.replace(/^(\.\/assets\/(?:npb\/npb|kbo\/kbo)-[a-z]+)\.svg$/,'$1.png');
const ip=outs=>`${Math.floor((outs||0)/3)}.${(outs||0)%3}`;
// v155 hero interview (checker item "hero-interview"). The hero is the
// user's own player with the highest score under the exact same formula
// NightGame.matchSummary() uses for its "heroes" list (bat: rbi*2 + h +
// hr*2 + r*.5, pitch: outs*.35 + k*.8 - runs*1.7), so the interview pick
// always agrees with the existing 活躍した選手 display. Only a user win
// produces an interview; losses, draws, umpire mode and spectate get none.
const heroScoreBat=b=>b?((b.rbi||0)*2+(b.h||0)+(b.hr||0)*2+(b.r||0)*.5):0;
const heroScorePitch=q=>q?((q.outs||0)*.35+(q.k||0)*.8-(q.runs||0)*1.7):0;
export function buildHeroInterview(g,report){
 if(g.umpireMode||g.spectate)return null;
 if(!(g.userScore>g.opponentScore))return null;
 const t=report.teams[g.userSide];if(!t)return null;
 const cands=[];
 for(const b of t.batters){const s=heroScoreBat(b);if(s>0)cands.push({id:b.id,name:b.name,kind:'bat',bat:b,score:s});}
 for(const p of t.pitchers){if(cands.some(c=>c.id===p.id))continue;const s=heroScorePitch(p);if(s>0)cands.push({id:p.id,name:p.name,kind:'pitch',pitch:p,score:s});}
 if(!cands.length)return null;
 cands.sort((a,b)=>b.score-a.score);
 const hero=cands[0];
 if(hero.kind==='bat'){
  const b=hero.bat,hr=b.hr||0,h=b.h||0,rbi=b.rbi||0;
  const stat=`${b.ab||0}打数 ${h}安打${hr?` ${hr}本塁打`:''} ${rbi}打点`;
  let type,comment;
  if(g.walkoffWin&&rbi>0){type='walkoff';comment='最後は自分が決めるつもりで打席に入りました。サヨナラ打を打てて、チームのみんなと喜べて最高です';}
  else if(hr>=2){type='homer';comment=`今日はバットがよく振れていました。${hr}本塁打は自分でも驚きです。この調子を続けていきたいです`;}
  else if(hr===1){type='homer';comment='完璧に捉えられました。あの一発が勝ちにつながってよかったです';}
  else if(h>=3){type='multihit';comment=`${h}安打と、状態は上がってきています。つなぐ意識が結果に出ました。次もこの調子でいきます`;}
  else if(h===2){type='multihit';comment='2安打できて、少しずつ自分の形になってきました。チームの勝利が何よりうれしいです';}
  else if(rbi>=2){type='clutch';comment='チャンスで回ってきたら、とにかく走者を還すことだけを考えていました。仕事ができてよかったです';}
  else{type='bat';comment='チームの勝利に貢献できてうれしいです。この勢いのまま、次も勝ちにいきます';}
  return {name:hero.name,role:'打者',type,comment,stat};
 }
 const q=hero.pitch,win=report.decision?.winner?.id===hero.id;
 const stat=`${ip(q.outs)}回 ${(q.k||0)}奪三振 ${q.runs||0}失点${win?' ・ 勝利投手':''}`;
 let type,comment;
 if((q.runs||0)===0&&(q.outs||0)>=6){type='shutout';comment='最後まで集中して投げられました。無失点で抑えられたのは、野手のみんなのおかげです';}
 else if((q.k||0)>=5){type='strikeout';comment=`今日は球が走っていました。${q.k}個の三振を奪えて、自分の投球ができたと思います`;}
 else if(win){type='winner';comment='勝ち投手になれてほっとしています。チームの勝利に貢献できてうれしいです';}
 else{type='pitch';comment='自分の役割は果たせたと思います。チームの勝利が何よりうれしいです';}
 return {name:hero.name,role:'投手',type,comment,stat};
}
export function heroInterviewHTML(report){
 const iv=report?.interview;if(!iv)return '';
 return `<section class="hero-interview"><h3 class="report-heading">ヒーローインタビュー</h3><div class="hero-interview-card"><div class="hero-interview-name"><strong>${escape(iv.name)}</strong><span>${escape(iv.role)}</span></div><p class="hero-interview-comment">「${escape(iv.comment)}」</p><small class="hero-interview-stat">${escape(iv.stat)}</small></div></section>`;
}
export function buildMatchReport(g){
 const summary=g.matchSummary();
 const report={innings:g.inning,ended:g.phase==='ended',decision:summary.decision,heroes:summary.heroes,teams:Object.fromEntries(['away','home'].map(side=>{
  const club=g.teams[side],used=new Set(side===g.userSide?g.usedPitchers:g.usedCpuPitchers);
  return [side,{name:club.name,logo:club.logo,score:g[side+'Score'],hits:g[side+'Hits'],line:g[side].slice(),batters:[...new Set(g.participants[side])].map(id=>{const p=club.batters.find(p=>p.id===id);return {id,name:p?.name||id,removed:g.removedPlayers[side].includes(id),...(g.box[id]||{})};}),pitchers:club.pitchers.filter((p,i)=>used.has(i)).map(p=>({id:p.id,name:p.name,...(g.pitchingStats[p.id]||{})}))}];
 }))};
 report.interview=buildHeroInterview(g,report);
 return report;
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

 // v208: result presentation. Uses the recorded report, never recomputes the score.
 export function finalScoreCard(report,userSide='home'){
  const {teams}=report,draw=teams.home.score===teams.away.score,winner=draw?null:teams.home.score>teams.away.score?'home':'away';
  const team=side=>{const t=teams[side];return `<div class="ui-final-team ${winner===side?'is-winner':''}">${t.logo?`<img src="${escape(reportLogo(t.logo))}" alt="">`:''}<strong>${escape(t.name)}</strong><small>${side==='away'?'先攻':'後攻'}</small></div>`;};
  return `<section class="ui-final-card" data-outcome="${draw?'draw':winner===userSide?'win':'loss'}"><div class="ui-final-status">${draw?'引き分け':winner===userSide?'勝利':'敗戦'}</div><div class="ui-final-grid">${team('away')}<div class="ui-final-score"><b class="${winner==='away'?'is-winner':''}">${teams.away.score}</b><i>–</i><b class="${winner==='home'?'is-winner':''}">${teams.home.score}</b></div>${team('home')}</div><div class="ui-final-hits"><span>${teams.away.hits??'—'}</span><small>安打</small><span>${teams.home.hits??'—'}</span></div></section>`;
 }
 export function resultHighlightsHTML(report){
  const d=report.decision,heroes=report.heroes||[];
  const homers=['away','home'].flatMap(side=>(report.teams[side].batters||[]).filter(b=>b.hr>0).map(b=>({name:b.name,hr:b.hr,logo:report.teams[side].logo})));
  const decisions=`<div class="pitcher-decisions"><div><small>勝利投手</small><strong>${escape(d?.winner?.name||'—')}</strong></div><div><small>敗戦投手</small><strong>${escape(d?.loser?.name||'—')}</strong></div></div>`;
  const homerHTML=`<section class="ui-result-section"><h3>本塁打</h3>${homers.length?homers.map(h=>`<div class="ui-homer-row">${h.logo?`<img src="${escape(reportLogo(h.logo))}" alt="">`:''}<b>${escape(h.name)}</b><strong>${h.hr}本</strong></div>`).join(''):'<p class="modal-note">なし</p>'}</section>`;
  const heroHTML=heroes.length?`<section class="ui-result-section"><h3>活躍した選手</h3><div class="hero-players">${heroes.map(({player:p,bat:b,pitch:q},i)=>`<div><span class="hero-team"><img src="${escape(reportLogo(report.teams[p.side]?.logo))}" alt=""></span><div><strong>${escape(p.name)}</strong><small>${b?`${b.ab||0}打数 ${b.h||0}安打 ${b.rbi||0}打点`:q?`${ip(q.outs)}回 ${q.k||0}奪三振 ${q.runs||0}失点`:''}</small></div>${i===0?'<span class="ui-star">★</span>':''}</div>`).join('')}</div></section>`:'';
  return lineScoreHTML(report)+decisions+homerHTML+heroHTML+heroInterviewHTML(report)+'<small class="record-basis">勝敗投手は短縮試合用のゲーム内記録。決勝のリードと走者の責任投手から算出。</small>';
 }
