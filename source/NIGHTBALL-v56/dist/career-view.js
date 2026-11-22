import {careerLifeHTML,careerBaseHTML} from './career-extras-view.js?v=56';
import {lineScoreHTML} from './results.js?v=76';
const Career=window.NightCareer,Life=window.NightCareerLife;
const option=(id,label)=>`<option value="${id}">${label}</option>`;
const statValues=(s,pitching)=>pitching?[
 ['投球回',Career.innings(s.outs)],['奪三振',s.k],['与四球',s.walks],['防御率',Career.era(s)]
]:[
 ['打率',Career.avg(s)],['安打',s.h],['本塁打',s.hr],['打点',s.rbi]
];

export function careerStats(stats,pitching){
 return `<dl class="career-stats">${statValues(stats,pitching).map(([label,value])=>
  `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

const screen=(title,body)=>`<header class="career-heading">
 <button type="button" class="career-back" data-career-action="home">‹ ホーム</button><h1>${title}</h1></header>${body}`;
const clubName=id=>NightTeams.get(id).name;
const styles=Object.entries(Career.styles);
const styleChoices=position=>styles.filter(([,s])=>(s.pos==='P')===(position==='P'));
const renderStyles=position=>styleChoices(position).map(([id,s])=>option(id,s.label)).join('');
const initialSkills=style=>Object.entries(Career.styles[style].skills)
 .map(([key,value])=>Career.skills[key]+' '+value+(key==='velocity'?' km/h':'')).join(' ／ ');
function schoolInfo(name,position){
 const school=Career.schoolProfiles[name],pitching=position==='P';
 const target=Career.schoolTarget(name,position||'C');
 const focus=school[pitching?'pitch':'bat'];
 return `<p>${school.detail}</p><dl class="career-school-facts">
  <div><dt>入部直後</dt><dd>${target?'紅白戦で出場選考':pitching?'先発候補':'スタメン候補'}</dd></div>
  <div><dt>同ポジションの競争相手</dt><dd>${school.rivals[pitching?1:0]}</dd></div>
  <div><dt>育成の強み</dt><dd>${focus?Career.skills[focus]+'の練習':'基礎能力全般'}</dd></div>
 </dl>`;
}
export function updateCareerSetup(form){
 const position=form.elements.position.value,select=form.elements.style;
 const group=styleChoices(position);
 if(!group.some(([id])=>id===select.value))select.innerHTML=renderStyles(position);
 form.querySelector('#career-initial').textContent=initialSkills(select.value);
 form.querySelector('#career-school-info').innerHTML=schoolInfo(form.elements.school.value,position);
 form.querySelector('#career-hand-label').textContent=position==='P'?'投げ腕':'打席';
}
export function careerSetup(alumni=[]){
 return screen('選手キャリア',`<section class="career-panel career-create">
  <h2>高校1年から始める</h2>
  <form id="career-create">
   <label>選手名<input name="name" maxlength="16" placeholder="選手名を入力" autocomplete="off" required></label>
   <label>高校<select id="career-new-school" name="school" aria-describedby="career-school-info">${Career.schools.map(name=>option(name,name+' · '+Career.schoolProfiles[name].tier)).join('')}</select></label>
   <div class="career-school-info" id="career-school-info" aria-live="polite">${schoolInfo(Career.schools[0],'')}</div>
   <label>ポジション<select id="career-new-position" name="position" required>
    <option value="" selected disabled>ポジションを選択</option>${Object.entries(Career.positionNames).map(([id,label])=>option(id,label)).join('')}</select></label>
   <div class="career-form-row">
    <label>プレースタイル<select id="career-new-style" name="style">${renderStyles('CF')}</select></label>
    <label><span id="career-hand-label">打席</span><select name="hand">${option('R','右')}${option('L','左')}</select></label>
   </div>
   ${alumni.length?`<label>OBコーチ<select name="mentor"><option value="">コーチを選ばず始める</option>${alumni.map(p=>option(p.id,p.name+' · '+Career.skills[p.mentorSkill])).join('')}</select></label>`:''}
   <p id="career-initial" class="career-initial" aria-live="polite">${initialSkills('contact')}</p>
   <p class="career-form-error" id="career-error" role="alert" hidden></p>
   <button class="primary-button">キャリアを始める</button>
  </form>
 </section>`);
}

const role=name=>Career.roles[name]||'一軍控え';
const statD=window.NightCareerDevelopment;
const scoreText=s=>s?`${s.won?'勝利':'敗戦'} ${s.own} − ${s.opp}`:'';
const action=(key,label,primary=false,extra='')=>`<button type="button" class="${primary?'primary':'secondary'}-button" data-career-action="${key}" ${extra}>${label}</button>`;
const form=(c)=>NightGame.conditionInfo(c.condition);
const formChip=c=>`<span class="career-condition" style="--form-color:${form(c).color}">${form(c).label}</span>`;
const mark=(label)=>`<span class="career-marker" data-mark="${label}">${label}</span>`;
export function careerUsage(c,f){
 if(!c.pitching&&['starter','farm','trainee'].includes(f.role))return `${c.battingSlot(f)+1}番・${Career.positionNames[c.position]}で先発`;
 return ({inactive:'メンバー外',rotation:'先発投手',pinch:'ベンチ入り・代打待機','school-relief':'ベンチ入り・救援待機'})[f.role]||role(f.role);
}
function fixtureButtons(c,f){
 if(c.currentGame)return `<div class="career-actions">${action('play','試合を再開',true)}</div>`;
 if(f.role==='inactive')return `<div class="career-actions">${action('skip','チームの試合結果を見る',true)}</div>`;
 if(c.injury>=2)return `<div class="career-actions">${action('miss','欠場して次へ',true)}</div>`;
 return `<div class="career-actions">
 ${action('play','対戦カードへ',true)}
 <div>${c.injury?action('miss','欠場して回復'):action('skip','おまかせ')}
 ${f.important&&!c.injury?action('play','じっくり出場',false,'data-format="extended"'):''}</div></div>`;
}
function calendar(c,f){
 if(c.currentGame)return '';
 const week=Life.week(c,f),chosen=c.weeks[week];
 const recommended=c.suggestedActivity();
 const skill=c.drills[c.plan]?.skill|| (c.pitching?'control':'contact');
 const title=f.seriesGame?'カード前の過ごし方':'試合までの過ごし方';
 const report=chosen&&c.planReport?.week===week?c.planReport:null;
 if(chosen)return `<section class="career-panel"><h2>${title}</h2><b>${Life.activities[chosen].title}を選択済み</b>
  ${report?`<p>${report.text}</p>${report.growth.length?`<p>${report.growth.join(' ／ ')}</p>`:''}`:''}
  ${c.scoutReport?.fixture===f.id?`<p class="career-status-line">${c.scoutReport.text}</p>`:''}
 </section>`;
 return `<section class="career-panel" id="career-calendar" tabindex="-1"><div class="career-panel-head"><h2>${mark('必須')} ${title}</h2><span>疲労 ${c.fatigue}%</span></div>
 <p class="career-note">練習の重点は${Career.skills[skill]}。${action('tab','育成方針を変える',false,'data-tab="training"')}</p>
 ${c.injury?`<p class="career-status-line">故障中 · 回復まであと ${c.injury} 試合相当</p>`:''}
 <div class="career-choice-grid">${Object.entries(Life.activities).map(([id,item])=>
 `<button type="button" data-career-action="activity" data-id="${id}"><strong>${item.title} ${id===recommended?mark('おすすめ'):''}</strong><small>${item.detail}
 ${id==='safe'?'疲労 +8':id==='intense'?'疲労 +21':id==='rest'?'疲労 最大−37':id==='video'?'情報を獲得':'育成や起用の助言'}</small></button>`).join('')}</div></section>`;
}
function promotionHTML(c){
 const p=c.promotion;
 if(!p)return '';
 const enough=p.played>=p.games;
 return `<div class="career-promotion"><p><b>${p.label}</b> · 直近${p.games}試合の平均 ${p.target}点以上</p>
 <p>${p.average===null?'評価待ち':'現在 '+p.average.toFixed(1)+'点'}${enough?'':'（'+p.played+'/'+p.games+'試合）'}</p>
 <p>この区分での出場 ${p.appearances} / ${p.minimum}試合</p>
 <progress value="${Math.min(p.average??0,p.target)}" max="${p.target}" aria-label="${p.label}への評価"></progress></div>`;
}
export function careerScoreboard(names,totals,line,current=null,changes=[]){
 const unknown=line.unknown||{};
 const note=[['away',names.away],['home',names.home]].filter(([side])=>unknown[side])
  .map(([side,name])=>name+' '+unknown[side]+'点').join('・');
 return `<div class="career-line-score">${lineScoreHTML({innings:Math.max(line.home.length,line.away.length,9),hideHits:true,
  highlight:current,changes,ended:current===null&&!note,teams:{
   home:{name:names.home,score:totals.home,line:line.home},
   away:{name:names.away,score:totals.away,line:line.away}
  }})}${note?`<p class="career-line-note">以前のセーブで回が未記録の得点　${note}</p>`:''}</div>`;
}

export function careerResult(c){
 const r=c.last,stat=r.stat;
 const growth=Object.entries(r.gains||{}).filter(([key])=>key!=='special').map(([key,n])=>Career.skills[key]+' +'+n);
 const reasons=r.reasons||statD.evaluate(stat,c.pitching).reasons;
 const performance=c.pitching?`${Career.innings(stat.outs)}回・${stat.allowed}失点・${stat.k}奪三振`:
  `${stat.pa}打席・${stat.h}安打・${stat.bb}四球`;
 const score=r.score,table=r.table;
 const milestones=(r.events||[]).filter(e=>e.includes('昇格')||e.includes('定着')||e.endsWith('を習得')||e.includes('支配下登録'));
 if(r.gains?.special)milestones.push(r.gains.special+'を習得');
 const title=r.team&&score?`${r.team} ${score.own}–${score.opp} ${r.opponent}`:scoreText(score)||'出場結果';
 const away=score?.actualHome===false,board=score?.line?careerScoreboard(
  {home:away?r.opponent:r.team,away:away?r.team:r.opponent},{home:away?score.opp:score.own,away:away?score.own:score.opp},
  away?{home:score.line.away,away:score.line.home}:score.line):'';
 const verdict=score?(score.won?'勝利':'敗戦')+(score.extra?'・延長':''):'結果';
 return `<div class="career-result-banner">
 <div><small>${r.label}</small><b>${board?verdict:title}</b></div>${board?'':`<strong>${verdict}</strong>`}</div>
 ${board}
 ${r.status||r.next?`<div class="career-game-outcome">${r.status?`<strong>${r.status}</strong>`:''}${r.next?`<p>${r.next}</p>`:''}</div>`:''}
 ${milestones.length?`<section class="career-choice-result"><span class="career-marker" data-mark="新着">新着</span><h3>${milestones.join(' ／ ')}</h3></section>`:''}
 ${r.highlight?`<p class="career-result-highlight"><strong>評価につながったプレー</strong><span>${r.highlight}</span></p>`:''}
 ${table?`<p class="career-standing-result"><b>${r.competition||'一軍'}　${table.rank}位</b> · ${table.wins}勝 ${table.losses}敗 · ${table.behind?'首位まで '+table.behind+'ゲーム':'首位とゲーム差なし'}</p>`:''}
 ${score?.lastInning&&(score.addedOwn||score.addedOpp)?`<p class="career-note">${score.lastInning}回の出番終了後、${[score.addedOwn?'味方が'+score.addedOwn+'点':'',score.addedOpp?'相手が'+score.addedOpp+'点':''].filter(Boolean).join('、')}を追加しました。</p>`:''}
 <p class="career-note">${stat.games?performance:r.absence||'故障で欠場'}</p>
 ${r.stat.saves?`<p class="career-result-status">セーブを記録</p>`:''}
 ${stat.games?`<section class="career-evaluation-card"><h3>選手評価　${r.rating} / 100 · ${statD.grade(r.rating)}</h3>
 <ul>${reasons.map(e=>`<li data-good="${e.good}"><b aria-hidden="true">${e.good?'+':'−'}</b><span>${e.text}</span></li>`).join('')}</ul></section>`:''}
 ${(r.events||[]).filter(e=>!milestones.includes(e)).map(e=>`<p class="career-result-status">${e}</p>`).join('')}
 ${growth.length?`<p class="career-result-status">${growth.join(' ／ ')}</p>`:''}`;
}
function contract(c,o,i,draft=false){
 const diff=o.pay-c.pay;
 return `<article class="career-contract"><div><small>${draft?o.round:o.type}</small><h3>${clubName(o.clubId)}</h3></div>
 <div><b>${Career.money(o.pay)}</b><small>${o.years||1}年 · ${o.role?role(o.role):Career.levels[o.level]}${!draft&&diff?' · 現年俸比 '+(diff>0?'+':'')+diff+'万':''}</small></div>
 ${o.need?`<p>${o.need}を評価</p>`:''}
 <div class="career-contract-actions">${action(draft?'sign':'offer',draft?'入団を承諾する':'この条件で契約',true,`data-offer="${i}"`)}
 ${!draft&&!c.countered&&!o.locked?action('negotiate','年俸を交渉',false,`data-offer="${i}"`):''}</div></article>`;
}
function schoolSelectionHTML(c){
 const s=c.schoolSelection;
 if(!s)return '';
 const decision=s.regular?(c.pitching?'先発':'スタメン'):s.called?(c.pitching?'救援待機':'代打待機'):'メンバー外';
 return `<div class="career-promotion">
  <p><b>監督評価　${decision}</b> · 直近平均 ${s.average?.toFixed(1)??'—'}点（${s.games}試合）</p>
  <p>ベンチ入りは平均 ${s.entry}点以上。先発は2試合以上かつ平均 ${s.target}点以上。</p>
  ${c.schoolTryouts.at(-1)?.year===c.schoolYear?`<p>前回の紅白戦　${c.schoolTryouts.at(-1).rating}点</p>`:''}
 </div>`;
}
function nextStep(c){
 const f=c.fixture;
 let heading='',detail='',button='';
 if(f){
  if(c.currentGame){heading='試合を再開';button=action('play','再開',true);}
  else if(f.type==='school-tryout'){heading='紅白戦の出場選考';button=action('play','対戦カードへ',true);}
  else if(c.canSchoolTryout&&f.role==='inactive'){
   heading='紅白戦で出場枠を狙う';detail='成績が基準に届くと、大会のメンバーに選ばれます。';
   button=action('tryout','紅白戦へ',true);
  }else{
   heading=f.role==='inactive'?'チームの試合を見届ける':c.injury>=2?'故障のため欠場':'次の試合へ';
   detail=f.gameName+' · '+f.opponentName;
   button=fixtureButtons(c,f);
  }
 }else if(c.stage==='draft'){heading='ドラフト後の進路を決める';detail='提示された入団条件と進学・社会人の進路を確認。';}
 else if(c.stage==='offseason'){heading='来季の契約を決める';detail='契約条件を比較できます。キャンプへの参加や代表・海外からの招待も確認できます。';}
 else if(c.stage==='overseas-result'){heading='海外挑戦後の進路を決める';}
 if(!heading)return '';
 const optional=f?.type==='school'&&c.canSchoolTryout&&f.role==='inactive';
 return `<section class="career-next" aria-label="次にやること"><div><p>${mark(optional?'おすすめ':'必須')} 次にやること</p>
 <h2>${heading}</h2>${detail?`<p>${detail}</p>`:''}
 ${f&&!c.currentGame&&c.planReport?.week===Life.week(c,f)?`<p class="career-quick-receipt" data-grade="${c.planReport.grade||''}" role="status">${c.planReport.grade?`<strong>${c.planReport.grade}</strong>`:''}${c.planReport.experience||c.planReport.text}${c.planReport.growth?.length?' ／ '+c.planReport.growth.join(' ／ '):''}</p>`:''}</div>${button}${optional?action('skip','今回はチームの試合結果を見る'):''}</section>`;
}
function progress(c){
 const f=c.fixture;
 if(c.stage==='retired'){
  return `<section class="career-panel career-feature"><h2>現役を引退しました</h2>
   <p>${c.proYear}年目・${c.age}歳で引退。OBとして記録に残ります。</p>
   ${careerStats(c.proStats,c.pitching)}
   ${action('new-career','新しい選手キャリアを始める',true)}
  </section>${timeline(c)}`;
 }
 if(c.stage==='draft'){
  const d=c.draft;
  return `<section class="career-panel career-feature"><p class="career-kicker">${mark('必須')} ドラフト会議</p><h2>${d.round}</h2>
  ${d.clubId?contract(c,d,0,true):'<p>今回は球団からの指名・契約打診はありませんでした。</p>'}
  <h3>別の進路で再挑戦</h3><p>選考試合に出場し、次のドラフトを目指します。</p>
  <div class="career-contract-actions">${action('decline','大学へ進む',false,'data-id="大学"')}${action('decline','社会人へ進む',false,'data-id="社会人"')}</div></section>`;
 }
 if(c.stage==='overseas-result'){
  const a=c.abroad,team=Life.foreign[a.id];
  return `<section class="career-panel career-feature"><p class="career-kicker">${team.name}</p>
  <h2>${a.phase==='season'?'海外シーズン終了':a.passed?'契約オファーを獲得':'キャンプ選考で落選'}</h2>
  ${careerStats(a.stat,c.pitching)}
  ${a.phase==='trial'&&a.passed?action('overseas-sign','海外で1年プレーする',true):''}
  ${action('overseas-return','台湾球界に戻る',a.phase==='season'||!a.passed)}
  </section>`;
 }
 if(c.stage==='offseason'){
  const camp=c.camp;
  return `${c.apbcInvite?`<section class="career-panel career-feature"><p class="career-kicker">台湾代表 選出</p><h2>APBCに出場</h2>
  <p>予選3試合と順位決定戦。育てた選手の出番を操作します。</p>${action('apbc','台湾代表に合流',true)}</section>`:''}
  ${c.overseasInvite?`<section class="career-panel"><h2>海外球団からキャンプ招待</h2>
   <p>選考試合の成績で、契約が決まります。</p>
   ${Object.entries(Life.foreign).map(([id,market])=>action('overseas',market.name+'の選考へ',false,`data-id="${id}"`)).join('')}</section>`:''}
  <section class="career-panel"><div class="career-panel-head"><h2>${camp?'':mark('おすすめ')+' '}自主トレ・春季キャンプ</h2><span>育成資金 ${Career.money(c.wallet)}</span></div>
  ${camp?`<p>${Life.camps[camp][0]}を選択済み</p>`:`<div class="career-choice-grid">${Object.entries(Life.camps).map(([id,[name,fee,detail]])=>
  `<button type="button" data-career-action="camp" data-id="${id}" ${c.wallet<fee?'disabled':''}><strong>${name} · ${fee?Career.money(fee):'無料'}</strong><small>${detail}</small></button>`).join('')}</div>`}</section>
  <section class="career-panel career-feature"><p class="career-kicker">プロ${c.proYear}年目 オフシーズン</p>
  <h2>${mark('必須')} 来季の契約</h2><p>今季の評価 ${c.seasonRatings()} · 現年俸 ${Career.money(c.pay)}</p>
  ${c.offers.map((o,i)=>contract(c,o,i)).join('')}
  ${c.canRetire?action('retire','現役引退を検討する'):''}</section>`;
 }
 if(!f)return '<section class="career-panel">試合情報を読み込めませんでした。</section>';
 const r=c.rival,peer=c.rivalStats,tryout=f.type==='school-tryout',prepared=!!c.weeks[Life.week(c,f)];
 const stakes=f.school&&!tryout?['勝てば地区決勝へ','勝てば全国大会へ','勝てば全国決勝へ','勝てば全国優勝'][f.round]:null;
 const rivalry=f.opponent===c.duel.clubId||f.school&&f.opponentName===c.duel.school;
 return `<section class="career-panel career-feature">
 <p class="career-kicker">${f.gameName}</p>
 <h2>${f.opponentName}戦</h2>
 ${f.seriesGame?`<p class="career-note">三連戦の第${f.seriesGame}戦</p>`:''}
 <p class="career-match-meta"><b>${careerUsage(c,f)}</b>
 ${f.fireman?'<span>2死満塁から</span>':''}${c.preparation?'<span>休養済み</span>':''}</p>
 ${stakes?`<p class="career-status-line">${stakes} · 負ければ今大会敗退</p>`:''}
 ${schoolSelectionHTML(c)}
 ${rivalry?`<p class="career-status-line">ライバル ${c.duel.name}との対戦</p>`:''}
 ${prepared&&c.canSchoolTryout&&f.role!=='inactive'?action('tryout','紅白戦でアピール'):''}
 ${tryout&&!c.currentGame?action('cancel-tryout','公式戦の予定に戻る'):''}
 ${action('tab',f.school?'大会日程・試合結果':'日程・試合結果',false,'data-tab="schedule"')}
  ${f.type==='pro'&&c.rosterNews?`<p class="career-note">${c.rosterNews.label}</p>`:''}
 ${f.school&&c.evaluation!==null?`<p class="career-objective">指名目安 ${c.draftResult().round} · 注目球団 ${clubName(c.scout()[0].clubId)}</p>`:''}
 ${f.type==='pro'?promotionHTML(c):''}
 ${r&&f.type==='pro'?`<div class="career-rival"><div><small>ポジションのライバル</small><b>${r.name}</b>
 <small>${peer.games?c.pitching?'今季 '+Career.innings(peer.outs)+'回 · '+peer.k+'奪三振':'今季 打率 '+Career.avg(peer)+' · '+peer.hr+'本塁打':'今季出場前'}</small></div>
 </div>`:''}
 </section>${tryout||c.currentGame?'':`<details class="career-panel career-archive"><summary>試合前の調整を自分で選ぶ</summary>${calendar(c,f)}</details>`}`;
}
function training(c){
 const playable=!!c.fixture&&!c.currentGame,player=c.player(),active=c.drills[c.plan],club=Life.club(c);
 const forms=c.pitching?['natural','power','command']:['balanced','compact','legkick'];
 const choices=Object.entries(c.drills).filter(([key,d])=>!d.special||c.plans(key).length);
 const defaultChoice=c.goal?c.plan+'|'+c.goal.target:c.plan;
 const options=choices.flatMap(([key,d])=>d.special?c.plans(key).map(([value,name])=>[key+'|'+value,d.label+' · '+name]):[[key,d.label]]);
 return `<section class="career-panel"><div class="career-panel-head"><h2>コンディション</h2>
 <span>${formChip(c)}　疲労 ${c.fatigue}%</span></div><div class="career-fatigue"><progress value="${c.fatigue}" max="100" aria-label="疲労"></progress></div>
 ${c.injury?`<p>故障で治療中 · 回復まであと ${c.injury} 試合相当</p>`:''}
 ${c.stage==='school'?`<p>高校の育成環境　${Career.schoolProfiles[c.school].detail}</p>`:''}
 ${club?`<p>球団の育成環境　${club[0]} · ${club[3]}</p>
 <p>本拠地　${NightPlayers.parks.find(p=>p.id===NightTeams.get(c.clubId).park)?.name||'—'}</p>`:''}
 ${c.mentor?`<p>OBコーチ　${c.mentor.name}</p>`:''}</section>
 <section class="career-panel"><h2>育成方針</h2>
 <label class="career-select">今の練習 <select id="career-plan" ${playable?'':'disabled'}>
 ${options.map(([id,name])=>`<option value="${id}" ${id===defaultChoice?'selected':''}>${name}</option>`).join('')}</select></label>
 ${c.goal?`<p>${c.goal.label} · 習得まで <progress value="${c.goal.progress}" max="3"></progress></p>`:''}
 <p class="career-note">試合で使った能力に経験が入り、選んだ練習で成長が加速します。球種と守備位置の習得度は、練習方針を変えても残ります。</p>
 ${c.pitching?`<p>持ち球 ${c.pitches.map(id=>NightGame.TYPES.find(t=>t.id===id).short).join(' / ')}</p>
  <label class="career-select">目指す起用法 <select id="career-role" ${playable?'':'disabled'}>
  ${['rotation','setup','closer'].map(id=>`<option value="${id}" ${id===c.preferredRole?'selected':''}>${role(id)}</option>`).join('')}</select></label>`:
  `<label class="career-select">守備位置 <select id="career-position" ${playable?'':'disabled'}>
   ${c.positions.map(id=>`<option value="${id}" ${id===c.position?'selected':''}>${NightSquad.label(id)}</option>`).join('')}</select></label>
   <p>対左投手補正　ミート +${c.leftTraining*3}</p>`}
 <label class="career-select">フォーム <select id="career-form" ${playable?'':'disabled'}>
 ${forms.map(id=>`<option value="${id}" ${id===c.form?'selected':''}>${Life.forms[id][0]}</option>`).join('')}</select></label>
 <p class="career-note">${Life.forms[c.form][1]}　習熟 ${c.familiarity}/3</p>
 <label class="career-select">キャリアの難易度<select id="career-difficulty" ${playable?'':'disabled'}>
 ${[['challenging','手応えあり'],['expert','上級'],['relaxed','気軽に']].map(([id,label])=>`<option value="${id}" ${id===c.difficulty?'selected':''}>${label}</option>`).join('')}</select></label>
 <h3>特殊能力・課題</h3>
 ${Object.entries(Life.special).filter(([id])=>(c.pitching?['pressure','closer']:['left','clutch']).includes(id)).map(([id,entry])=>`<p>
 <b>${entry.labels[Math.max(0,(c.perks[id]||1)-1)]}</b>　${c.perks[id]?entry.detail:'未習得 · 実戦で経験 '+(c.insight[id]||0)}
 ${c.perks[id]===1?' · 強化の進捗 '+(c.insight[id]||0):''}</p>`).join('')}
 ${c.pitching?'':`<label class="career-select">自分の走塁<select id="career-running">
 <option value="auto" ${c.manualRunning?'':'selected'}>自動</option>
 <option value="manual" ${c.manualRunning?'selected':''}>手動</option></select></label>`}
 <label class="career-select">試合開始の演出 <select id="career-intro">
 <option value="normal" ${c.shortIntro?'':'selected'}>通常</option><option value="short" ${c.shortIntro?'selected':''}>短縮</option>
 </select></label>
 ${c.weakness>=2?'<p class="career-status-line">変化球が苦手 · 映像分析かミートの基礎練習で改善</p>':''}
 <div class="career-training career-skills">${Object.entries(c.skills).map(([key,n])=>{
  const cost=c.xpCost(key),capped=n>=statD.max(key),xp=c.xp[key]||0;
  return `<div><span>${Career.skills[key]}${active?.skill===key?' ↑':''}</span><b>${n}${key==='velocity'?' km/h':''}</b>
  ${n!==player[key]?`<small>試合時 ${player[key]}</small>`:''}
  <progress value="${capped?cost:xp}" max="${cost}" aria-label="${Career.skills[key]}の経験"></progress><small>${capped?'上限':xp+'/'+cost}</small></div>`;
 }).join('')}</div>${growthHistoryHTML(c)}</section>`;
}
function growthHistoryHTML(c){
 const h=c.growthHistory||[];if(!h.length)return '';
 return `<h3>成長履歴</h3>`+h.slice(-12).reverse().map(s=>`<div class="career-list-row"><div><b>${s.season}年目 · 第${s.week}週</b><small>${(s.growth||[]).join(' ／ ')}</small><small>${Object.entries(s.skills||{}).map(([k,n])=>Career.skills[k]+' '+n).join(' · ')}</small></div></div>`).join('');
}
function scouts(c){
 return `<section class="career-panel"><h2>スカウト</h2>
 <p>指名目安 <b>${c.evaluation===null?'評価待ち':c.draftResult().round}</b></p>
 ${c.scout().map(s=>`<div class="career-list-row"><div><b>${clubName(s.clubId)}</b><small>${s.need}を重視 · ${s.detail}</small></div><strong>${s.score>=65?'有力候補':s.score>=36?'注目':'様子見'}</strong></div>`).join('')}</section>`;
}
function scheduleSummary(c,calendar){
 if(!calendar)return '';
 const {next,total,played,limit,label}=calendar;
 const remaining=Math.max(0,total-played);
 return `<section class="career-panel career-schedule-summary" aria-label="${label}の試合日程">
 ${next?`<div><small>${c.currentGame?'試合中':'次の試合'}</small><strong>${next}</strong></div>`:''}
 <div><small>${label}</small><strong>${limit?'最大 ':''}残り ${remaining} 試合</strong><small>${played} / ${total} 試合終了</small></div>
 </section>`;
}
function scheduleRows(c,calendar){
 if(!calendar?.rows)return '';
 return `<section class="career-panel career-schedule-list"><h2>${calendar.label}の日程</h2>
 ${calendar.rows.map(({date,opponent,result},i)=>`<div class="career-list-row ${i===calendar.played?'career-own':''}">
 <div><small>${date} · 第${i+1}戦</small><b>${opponent}</b></div>
 <strong>${result?scoreText(result):i<calendar.played?'終了':i===calendar.played?(c.currentGame?'試合中':'次の試合'):'予定'}</strong></div>`).join('')}</section>`;
}
function schedule(c){
 if(['school','draft','academy'].includes(c.stage)){
  const leagues=window.NightCareerLeagues,rounds=leagues.rounds;
 const nextOpponent=c.stage==='school'?leagues.schoolFixture(c).opponentName:'';
  const matchPath=c.stage==='school'?`<section class="career-panel"><h2>高${c.schoolYear}${c.cup===0?'夏':'秋'}の勝ち上がり</h2>
  ${rounds.map((label,i)=>{
   const r=c.schoolResults.find(row=>row.year===c.schoolYear&&row.cup===c.cup&&row.round===i);
   return `<div class="career-list-row ${i===c.round?'career-own':''}"><b>${label}</b><strong>${r?scoreText(r):i===c.round?'次の相手 · '+nextOpponent:i<c.round?'勝ち上がり':'未定'}</strong></div>`;
  }).join('')}</section>`:'';
  return `${matchPath}<section class="career-panel"><h2>高校大会の結果</h2>
  ${c.schoolResults.length?c.schoolResults.slice().reverse().map(row=>`<div class="career-list-row"><div><b>${row.opponent}</b>
  <small>高${row.year} · ${row.label}</small></div><strong>${scoreText(row)}</strong></div>`).join(''):'<p>夏の大会から始まります。</p>'}</section>`;
 }
 if(c.stage==='apbc'&&c.apbc){
  return `<section class="career-panel"><h2>APBC 予選順位</h2>
  ${c.apbc.standings.map((r,i)=>`<div class="career-list-row"><b>${i+1}　${clubName(r.id)}</b><strong>${r.w}勝 ${r.l}敗</strong></div>`).join('')}
  ${careerStats(c.international,c.pitching)}</section>`;
 }
 if(c.stage==='overseas'||c.stage==='overseas-result')return `<section class="career-panel"><h2>海外挑戦の成績</h2>${careerStats(c.abroad.stat,c.pitching)}</section>`;
 const l=c.league;
 const recent=l?Object.values(l.results).filter(r=>r.home===c.clubId||r.away===c.clubId).slice(-5):[];
 return l?`<section class="career-panel"><h2>CPBL 順位表</h2>
 ${c.fixture?`<p>次戦　${c.fixture.opponentName}</p>`:''}
 ${recent.length?`<p>一軍の直近${recent.length}試合　${recent.map(r=>(r.homeScore>r.awayScore)===(r.home===c.clubId)?'○':'●').join(' ')}</p>`:''}${l.standings().map(row=>`<div class="career-list-row ${row.id===c.clubId?'career-own':''}">
 <b>${row.rank}　${clubName(row.id)}</b><strong>${row.wins}勝 ${row.losses}敗</strong></div>`).join('')}
 ${Object.values(l.results).some(r=>r.home===c.clubId||r.away===c.clubId)?`<details class="career-archive"><summary>一軍の試合結果</summary>
 ${Object.values(l.results).filter(r=>r.home===c.clubId||r.away===c.clubId).reverse().map(r=>{
  const home=r.home===c.clubId,own=home?r.homeScore:r.awayScore,opp=home?r.awayScore:r.homeScore;
  return `<div class="career-list-row"><b>${clubName(home?r.away:r.home)}</b><strong>${scoreText({own,opp,won:own>opp})}</strong></div>`;
 }).join('')}</details>`:''}
 ${c.farmLeague?`<h3>二軍 順位表</h3>${c.farmLeague.standings().map(row=>`<div class="career-list-row ${row.id===c.clubId?'career-own':''}"><b>${row.rank}　${clubName(row.id)}</b><strong>${row.wins}勝 ${row.losses}敗</strong></div>`).join('')}`:''}
 ${c.farmScorecard.length?`<details class="career-archive"><summary>二軍・育成での出場結果</summary>${c.farmScorecard.slice().reverse().map(r=>`<div class="career-list-row"><b>${r.opponent}</b><strong>${scoreText(r)}</strong></div>`).join('')}</details>`:''}
 ${l.postseason?`<h3>ポストシーズン</h3>${[l.postseason.qualifier,l.postseason.final].filter(Boolean).map(s=>
 `<div class="career-list-row"><b>${clubName(s.higher)}　対　${clubName(s.lower)}</b><strong>${s.wins[s.higher]} – ${s.wins[s.lower]}</strong></div>`).join('')}`:''}</section>`:'';
}
const titleValue=(key,v)=>key==='avg'?v.toFixed(3).replace(/^0/,''):key==='era'?v.toFixed(2):v;
function timeline(c){
 const r=c.duel;
 return `<section class="career-panel"><h2>キャリア年表</h2>
 <div class="career-list-row"><div><b>ライバル　${r.name}</b><small>${r.clubId?clubName(r.clubId):r.school} · ${r.games}試合</small></div><strong>${r.pa}打席 ${r.h}${c.pitching?'被安打':'安打'} ${r.k}三振</strong></div>
 ${r.season?`<div class="career-list-row"><div><b>今季の成績くらべ</b><small>${r.seasonKey&&r.seasonKey.startsWith('school')?'高校'+c.schoolYear+'年':'プロ'+c.proYear+'年目'} · ライバル ${r.name}</small></div><strong>${c.pitching?`防御率 ${Career.era(r.season)} · ${r.season.k}奪三振`:`打率 ${Career.avg(r.season)} · ${r.season.hr}本塁打`}</strong></div>
 <div class="career-list-row"><div><b>あなた</b><small>今季</small></div><strong>${c.pitching?`防御率 ${Career.era(c.season)} · ${c.season.k}奪三振`:`打率 ${Career.avg(c.season)} · ${c.season.hr}本塁打`}</strong></div>`:''}
 ${c.milestones.slice().reverse().map(e=>`<div class="career-list-row"><div><small>${e.period}</small><b>${e.text}</b></div></div>`).join('')}
 ${c.abroadHistory.map(e=>`<div class="career-list-row"><b>${e.name} · ${e.label}</b><strong>${e.stat.games}試合</strong></div>`).join('')}
 </section>`;
}
function archive(c){
 const school=['school','draft','academy'].includes(c.stage);
 const stats=c.stage==='apbc'?c.international:c.stage==='draft'?c.schoolStats:c.stage==='academy'?c.academy.stat:c.season;
 return `<section class="career-panel"><h2>${c.stage==='apbc'?'代表成績':c.stage==='draft'?'高校通算':'今季の個人成績'}</h2>
 ${careerStats(stats,c.pitching)}
 ${c.pitching?'':`<p>出塁率 ${stats.pa?statD.obp(stats).toFixed(3):'—'} · 長打率 ${stats.ab?statD.slugging(stats).toFixed(3):'—'}</p>`}
 ${c.last?`<details class="career-archive"><summary>前回の出場結果</summary>${careerResult(c)}</details>`:''}</section>
 ${school?scouts(c):`<section class="career-panel"><h2>タイトル争い</h2>${c.titleRaces().map(t=>`<div class="career-list-row">
 <div><b>${t.label}</b><small>${t.rival.name} · ${titleValue(t.key,t.rival.value)}</small></div>
 <strong>${t.qualified?titleValue(t.key,t.value):'規定未達'}</strong></div>`).join('')}
 ${c.awards.length?`<p>${c.awards.map(a=>a.year+'年目 '+a.label).join(' ／ ')}</p>`:''}
 ${c.apbcPrior?`<p>直近の代表成績　APBC ${c.apbcPrior.place}位</p>`:''}
 <h3>プロ通算 · ${c.proStats.games}試合</h3>${careerStats(c.proStats,c.pitching)}</section>`}
 ${c.seasons.length||c.history.length?`<details class="career-panel career-archive"><summary>年度別成績・契約履歴</summary>
 ${c.seasons.slice().reverse().map(s=>`<div class="career-year"><h3>${s.title}</h3><p>${s.team} · ${s.stat.games}試合
 ${s.record?' · '+s.record:''}</p>${careerStats(s.stat,c.pitching)}
 ${s.awards?.length?`<p>${s.awards.join(' ／ ')}</p>`:''}${s.pay?`<p>${Career.levels[s.level]} · ${Career.money(s.pay)}</p>`:''}</div>`).join('')}
 <ul>${c.history.slice().reverse().map(h=>`<li><small>プロ${h.year}年目</small><span>${h.text}</span></li>`).join('')}</ul></details>`:''}${timeline(c)}`;
}
function eventHTML(c,event,f){
 if(!f)return '';
 const extra=window.NightCareerExtras,previous=extra.episodes(c).last;
 const wrap=(choice,label,primary=false)=>action('episode',label,primary,`data-choice="${choice}"`);
 const goal=c.eventGoal?.fixture===f.id?extra.curricula[c.eventGoal.id]:null;
 const recap=!c.currentGame&&previous?.fixture===f.id?`<aside class="career-story-recap" role="status" tabindex="-1">
  <strong>${previous.title}</strong><p>${previous.summary}</p>${goal?`<b>次の試合　${goal.cue}（${c.eventGoal.target}回）</b>`:''}</aside>`:'';
 if(!event)return recap;
 const current=event.kind==='drill'?event.drill:event.reason;
 const choices=event.kind==='drill'?event.answers.map((label,i)=>wrap(i,label)):event.kind==='training'?
  [wrap('basic','基礎練習 · 疲労 +8',true),wrap('live','実戦練習 · 疲労 +21')]:event.kind==='recovery'?
  [wrap('rest','休養する',true)]:event.choices.map(([id,label],i)=>wrap(id,label,i===0));
 return `<article class="career-story" aria-labelledby="career-story-title" data-story-kind="${event.kind}">
  <div class="career-story-header"><small>${event.kind==='life'?'球場の外で':'試合に向けて'}</small><span>${event.speaker}</span></div>
  <h2 id="career-story-title" tabindex="-1">${event.title}</h2><p>${current}</p>
  ${event.cue?`<p class="career-story-goal">次戦の課題　${event.cue}</p>`:''}
  <div class="career-story-actions">${choices.join('')}</div>${wrap('pass','今回は見送る')}</article>`;
}
export function careerDashboardHTML(c,clubBadge,tab,lifeTab='leisure',drillAim=null){
 const pro=!!c.clubId,overseas=['overseas','overseas-result'].includes(c.stage);
 const academy=['academy','draft'].includes(c.stage)?c.academy:null;
 const team=overseas?Life.foreign[c.abroad.id].name:pro?clubName(c.stage==='apbc'?'apbc-taipei':c.clubId):academy?academy.path+'チーム':c.school;
 const highSchool=c.stage==='school'||(c.stage==='draft'&&!academy);
 const studentYear=highSchool?c.schoolYear:academy?.universityYear;
 const identity=studentYear?`<div class="career-identity"><dt>学年</dt><dd><small>${highSchool?'高校':'大学'}</small><b>${studentYear}</b>年生</dd></div>`:
  `<div class="career-identity"><dt>年齢</dt><dd><b>${c.age}</b>歳</dd></div>`;
 const experience=pro?`<div class="career-experience"><dt>プロ歴</dt><dd><b>${c.proYear}</b>年目</dd></div>`:'';
 const sections={next:progress,training,stats:archive,schedule,life:c=>careerLifeHTML(c,lifeTab),practice:c=>careerBaseHTML(c,drillAim)};
 const tabs=[['next','進行'],['life','暮らし'],['practice','練習'],['training','能力・育成'],['stats','成績'],['schedule','日程・順位']];
 const story=tab==='next'?window.NightCareerExtras.followingEvent(c):null;
 const calendar=(tab==='next'||tab==='schedule')?window.NightCareerLeagues.calendar(c):null;
 return screen('選手キャリア',`<div class="career-profile">${pro?clubBadge(overseas?'career-foreign-'+c.abroad.id+'-0':c.stage==='apbc'?'apbc-taipei':c.clubId):'<span class="career-school-mark">18</span>'}
 <div><p>${team}${pro&&c.stage!=='apbc'?' · '+c.title:''}</p><h2>${c.name}</h2>
 <p>${c.profile.label} · ${Career.positionNames[c.position]} · ${c.hand==='L'?'左':'右'}${c.pitching?'投':'打'}</p></div>
 <dl class="career-profile-facts">${identity}${experience}<div><dt>調子</dt><dd>${formChip(c)}</dd></div></dl>
 ${pro?`<span class="career-pay"><small>年俸</small><b>${Career.money(c.pay)}</b><small>契約は${c.contractEnd||c.proYear}年目まで</small></span>`:''}</div>
 <nav class="career-tabs" aria-label="キャリア画面">
 ${tabs.map(([id,label])=>`<button data-career-action="tab" data-tab="${id}" ${tab===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav>
 ${scheduleSummary(c,calendar)}${tab==='schedule'?scheduleRows(c,calendar):''}
 ${tab==='next'?`${eventHTML(c,story,c.fixture)}${story?'':nextStep(c)}<div class="career-home-shortcuts">${action('tab',c.stage==='retired'?'引退後の暮らしへ':'休日を過ごす',false,'data-tab="life"')}
  ${c.stage!=='retired'?action('tab','追加練習をする',false,'data-tab="practice"'):''}
  ${!story&&c.fixture&&!c.currentGame&&c.fixture.type!=='school-tryout'?action('auto-series','日程をおまかせで進める'):''}</div>`:''}
 ${story?'':sections[tab](c)}
 ${tab==='next'&&c.last&&c.stage!=='retired'?`<details class="career-panel career-archive"><summary>前回の結果　${scoreText(c.last.score)||'評価 '+c.last.rating}</summary>${careerResult(c)}</details>`:''}
 ${tab==='stats'?'<button class="career-reset" data-career-action="reset">キャリアを最初から作り直す</button>':''}`);
}
