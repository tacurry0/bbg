import { AbsReview, absActorBounds } from './abs-review.js?v=2';
import { PlayReview, CHALLENGES, challengeWon, hitReadout } from './play-review.js?v=56';
import {playoffHTML} from './playoff-view.js?v=77';
import {buildMatchReport,resultReportHTML,playerBoxHTML,lineScoreHTML} from './results.js?v=76';
import { renderRunnerMap, bindRunnerMap } from './runner-map.js?v=56';
import {careerUsage, careerScoreboard, careerResult, careerSetup, careerDashboardHTML, updateCareerSetup} from './career-view.js?v=76';
import { BallparkMusic, SongVault, musicSettings, MUSIC_SLOTS, PRESETS, DEFAULT_CAREER_CHEER, teamMusicKey, playerMusicKey, careerMusicKey, trackForEvent } from './music.js?v=84';
import {updateScoreCube,updatePlayerHUD} from './game-hud.js?v=76';
import { StadiumRenderer } from './stadium3d.js?v=77';
import { GAME_LIGHTING_OPTIONS, gameLightingMode } from './game-lighting.js?v=74';
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const icons={
 sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
 settings:'<path d="m9 3-.6 2.2-2 .9L4.3 5.5 2.5 8.6 4 10.3v2.3l-1.5 1.8 1.8 3.1 2.1-.6 2 .9L9 20h3.6l.6-2.2 2-.9 2.2.6 1.8-3.1-1.6-1.8v-2.3l1.6-1.7-1.8-3.1-2.2.6-2-.9-.6-2.2H9Z"/><circle cx="10.8" cy="11.5" r="3"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 bat:'<path d="m5 20 3-3m-1-1L19 3c1-1 4 2 3 3L9 18l-2-2ZM4 18l3 3"/>',
 diamond:'<path d="m12 2 10 10-10 10L2 12 10 2Z"/><path d="m12 8 4 4-4 4-4-4 4-4Z"/><path d="M12 16v6M8 12H2m14 0h6M12 8V2"/>',
 ball:'<circle cx="12" cy="12" r="9"/><path d="M6 5c6 3 6 11 0 14M18 5c-6 3-6 11 0 14"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>'
 };
 function svg(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.ball}</svg>`;}
 const defaults={gameLighting:'auto',hudScale:100,controlsScale:100,manualRunning:false,difficulty:'standard',sound:true,soundVolume:78,crowdVolume:50,vibration:true,assist:false,cursorVersion:4,cursorLift:80,cursorShift:64,timingGuide:true,battingAssist:true,timingSound:true,sensitivity:1,releaseSwing:true,leftHanded:false,fieldSpeed:1,innings:5,park:'night',pitcher:0,practiceClub:'owls',practiceBatter:'o1',practicePitch:'random',pitchingClub:'owls',pitchingPlayer:null,derbyPark:'tokyo-dome',derbyClub:'owls',derbyBatter:'o4',showTrace:true,matchTeam:'owls',matchOpponent:'foxes',matchUserHome:true,defenseSpeed:1,apbcTeam:'apbc-taipei',apbcOpponent:'apbc-japan',apbcUserHome:true,apbcInnings:5,apbcLineups:{},matchLineups:{},pennantGamesPerOpponent:4,order:NightPlayers.owls.map(p=>p.id)};
 const recordDefaults={games:0,wins:0,draws:0,hr:0,hits:0,maxDistance:0,bestTimedDerby:0,bestTimedDerbyDistance:0,perfect:0,grandSlam:false,ks:0,thrown:0};
 let settings,records;
 try{settings={...defaults,...JSON.parse(localStorage.getItem('nightball.settings')||'{}')};records={...recordDefaults,...JSON.parse(localStorage.getItem('nightball.records')||'{}')};}catch{settings={...defaults};records={...recordDefaults};}
 if(!['casual','standard','pro'].includes(settings.difficulty))settings.difficulty='standard';
 try{if(!JSON.parse(localStorage.getItem('nightball.settings')||'{}').cursorVersion){settings.difficulty='standard';settings.assist=false;}}catch{}if(settings.cursorVersion<4){settings.cursorLift=80;settings.cursorShift=64;settings.leftHanded=false;}settings.cursorVersion=4;settings.releaseSwing=true;settings.cursorShift=Math.max(0,Math.min(140,Number(settings.cursorShift)||0));
 settings.innings=settings.innings===3?3:5;settings.fieldSpeed=settings.fieldSpeed===2?2:1;settings.pitcher=Math.max(0,Math.min(NightPlayers.homePitchers.length-1,settings.pitcher||0));settings.cursorLift=Math.max(0,Math.min(160,(Number.isFinite(Number(settings.cursorLift))?Number(settings.cursorLift):80)));if(!Array.isArray(settings.order)||settings.order.length!==9||new Set(settings.order).size!==9||settings.order.some(id=>!NightPlayers.rosters.owls.batters.some(p=>p.id===id)))settings.order=NightPlayers.owls.map(p=>p.id);
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchTeam))settings.matchTeam='owls';
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchOpponent)||settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;
 if(!settings.matchLineups||typeof settings.matchLineups!=='object'||Array.isArray(settings.matchLineups))settings.matchLineups={};
 settings.pennantGamesPerOpponent=Number.isInteger(settings.pennantGamesPerOpponent)?Math.max(1,Math.min(10,settings.pennantGamesPerOpponent)):4;
 settings.soundVolume=Math.max(0,Math.min(100,Number.isFinite(Number(settings.soundVolume))?Number(settings.soundVolume):78));
 settings.crowdVolume=Math.max(0,Math.min(100,Number.isFinite(Number(settings.crowdVolume))?Number(settings.crowdVolume):50));
 settings.music=musicSettings(settings.music);
 for(const name of ['hudScale','controlsScale'])settings[name]=Math.max(75,Math.min(120,Number(settings[name])||100));
 settings.gameLighting=gameLightingMode(settings.gameLighting);
 window.nightSettings=settings;
 const stadiumAudio=new NightAudio(),songVault=new SongVault(),ballparkMusic=new BallparkMusic(stadiumAudio,songVault);
 const review=new PlayReview();
 let game=null,screen='home',modalKind='',saved=false,lastMode='match',lastFocus=null,toastTimer;
 function makeRenderer(id,hero=false){try{return new StadiumRenderer($(id),hero);}catch(e){console.error('3D stadium initialization failed',e);const el=$(id),replacement=el.cloneNode(true);el.parentElement.querySelector('.stadium-hud')?.remove();replacement.dataset.graphics='flat-compat';el.replaceWith(replacement);return new NightRenderer(replacement,hero);}}
 const renderer=makeRenderer('game-canvas');
 const absReview=new AbsReview($('abs-canvas'));
 const reduceAbsMotion=matchMedia('(prefers-reduced-motion: reduce)');
 function applyHUDSizes(){
  $('app').style.setProperty('--hud-scale',settings.hudScale/100);
  $('app').style.setProperty('--control-scale',settings.controlsScale/100);
 }
 applyHUDSizes();
 function renderMenuClubs(){
  const clubs=NightTeams.all,key=clubs.map(c=>c.id).join('/');
  if($('menu-club-logos').dataset.clubs!==key){$('menu-club-logos').dataset.clubs=key;$('menu-club-logos').innerHTML=clubs.map(c=>`<img src="${c.logo}" alt="" width="32" height="32" loading="eager">`).join('');}
  const home=NightTeams.get(settings.matchTeam),away=NightTeams.get(settings.matchOpponent),pair=home.id+'/'+away.id;
  if($('menu-matchup').dataset.clubs!==pair){$('menu-matchup').dataset.clubs=pair;$('menu-matchup').innerHTML=`<span><img src="${home.logo}" alt="" width="56" height="56"></span><i>VS</i><span><img src="${away.logo}" alt="" width="56" height="56"></span>`;}
 }
 function save(){try{localStorage.setItem('nightball.settings',JSON.stringify(settings));localStorage.setItem('nightball.records',JSON.stringify(records));}catch{}$('home-best').textContent=records.maxDistance;renderMenuClubs();updateSound();}
 function updateSound(){$('sound').innerHTML=svg(settings.sound?'sound':'mute');$('sound').setAttribute('aria-label',settings.sound?'サウンドをオフ':'サウンドをオン');$('sound').setAttribute('aria-pressed',String(settings.sound));syncAudio();}
 function syncAudio(){
  const enabled=settings.sound&&!document.hidden,playing=screen==='game'&&game&&game.phase!=='ended';
  const active=!!playing&&!game.paused&&$('modal').hidden;
  stadiumAudio.update({enabled,active,volume:settings.soundVolume,crowd:settings.crowdVolume,park:game?.park?.theme||NightPlayers.parks.find(p=>p.id===settings.park)?.theme||'night'});
  const results=screen==='game'&&game?.phase==='ended'&&['result','career-result'].includes(modalKind);
  ballparkMusic.update(playing||results?game:null,settings.music,enabled,active||results);
 }
 function unlockAudio(){stadiumAudio.unlock();syncAudio();}
 function sound(name){syncAudio();stadiumAudio.play(name,{hand:game?.batter?.hand});if(name==='homer')vibrate([30,30,60]);else if(name==='hit'||name==='perfect')vibrate(20);}
 function vibrate(v){if(settings.vibration&&navigator.vibrate)try{navigator.vibrate(v);}catch{}}
 function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
 function modal(html,kind){$('modal-content').dataset.kind=kind;if(game?.phase!=='ended')stadiumAudio.stopEffects();if(kind!=='music-settings')ballparkMusic.stop('preview');const same=modalKind===kind;if(!same)lastFocus=document.activeElement;modalKind=kind;$('modal-content').innerHTML=html;$('modal-content').scrollTop=0;$('modal').hidden=false;document.body.style.overflow='hidden';if(!same)setTimeout(()=>{if(modalKind===kind)$('modal-content').querySelector('button')?.focus({preventScroll:true});},30);}
 function closeModal(resume=true){const previous=modalKind;ballparkMusic.stop('preview');$('modal').hidden=true;document.body.style.overflow='';modalKind='';if(resume&&game&&screen==='game'&&game.phase!=='ended')game.paused=false;lastFocus?.focus?.({preventScroll:true});if(resume&&game?.phase==='career-ready')$('career-field-overlay').querySelector('button')?.focus({preventScroll:true});if(resume&&screen==='game'&&game?.phase==='ended'&&!['result','career-result'].includes(previous))finish(game);}
 const modalTitle=(en,ja,close=true)=>`<div class="modal-top"><h2 id="modal-title">${({'今夜の試合':'試合設定','親指の操作・ゲーム設定':'設定','押して、狙って、離す。':'遊び方','ひと休み。':'タイム','練習おつかれさま':'練習結果','選手・ベンチ':'選手データ'})[ja]||ja}</h2>${close?'<button class="close-button" data-action="close" aria-label="閉じる">×</button>':''}</div>`;
 // Keep the legacy CPBL save key and one independent season for each league.
 const pennantLeagues={...NightPennant.leagues};
 try{if(localStorage.getItem('nightball.pennant.npb'))pennantLeagues.npb='旧NPB';}catch{}
 let selectedLeague=Object.hasOwn(pennantLeagues,settings.pennantLeague)?settings.pennantLeague:'cpbl';
 let league,selectedClub,selectedGamesPerOpponent,leagueSaveWarned=false;
 const leagueSaveKey=id=>id==='cpbl'?'nightball.pennant':'nightball.pennant.'+id;
 function resetLeaguePicker(){
  selectedClub=league?.clubId||NightPennant.clubsFor(selectedLeague)[0].id;
  selectedGamesPerOpponent=league?.gamesPerOpponent||settings.pennantGamesPerOpponent;
 }
 function loadLeague(id){
  league=null;
  try{
   const restored=NightPennant.restore(JSON.parse(localStorage.getItem(leagueSaveKey(id))||'null'));
   if(restored?.leagueId===id)league=restored;
  }catch{}
  resetLeaguePicker();
 }
 loadLeague(selectedLeague);
 function saveLeague(){try{localStorage.setItem(leagueSaveKey(league.leagueId),JSON.stringify(league));}catch{if(!leagueSaveWarned){toast('保存容量が足りません。画面を閉じると進行状況を失う場合があります');leagueSaveWarned=true;}}}
 const leagueTabs=()=>`<div class="pennant-league-options" role="group" aria-label="ペナントのリーグ">${Object.entries(pennantLeagues).map(([id,label])=>`<button data-pennant-league="${id}" aria-pressed="${id===selectedLeague}">${label}</button>`).join('')}</div>`;
 const clubBadge=(id,small=false)=>{
  const c=NightCareerLife.foreignClub(id)||NightTeams.get(id);
  return `<span class="club-badge ${small?'small':''}" style="--club:${c.color};--accent:${c.accent}" aria-hidden="true">${c.logo?`<img src="${c.logo}" alt="">`:`<b class="career-foreign-mark">${c.scoreMark}</b>`}</span>`;
 };
 function showLeagueScreen(){$('career').hidden=true;$('apbc-cup').hidden=true;closeModal(false);screen='pennant';$('home').hidden=true;$('game').hidden=true;$('pennant').hidden=false;$('pause').hidden=true;$('settings').hidden=false;history.replaceState({nightball:'pennant'},'',location.href);window.scrollTo(0,0);}
 function leaguePicker(){
  showLeagueScreen();
  if(selectedLeague==='npb'){
   $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">◀ 戻る</button><h1>旧NPBペナント</h1></div>${leagueTabs()}${league?'<button class="primary-button" data-league-action="dashboard">進行中のペナントへ</button>':'<p class="league-footnote">セーブデータを読み込めませんでした。</p>'}`;
   return;
  }
  const isNPB=selectedLeague.startsWith('npb-'),clubs=NightPennant.clubsFor(selectedLeague);
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">◀ 戻る</button><h1>ペナント設定</h1></div>${leagueTabs()}<section class="season-length-picker"><div class="season-length-heading"><h2>対戦数</h2><strong>${selectedGamesPerOpponent*(clubs.length-1)}<small>試合</small></strong></div><div class="season-length-options" role="group" aria-label="各相手との対戦数">${Array.from({length:10},(_,i)=>i+1).map(n=>`<button data-league-games="${n}" class="${n===selectedGamesPerOpponent?'selected':''}" aria-pressed="${n===selectedGamesPerOpponent}">${n}<small>試合ずつ</small></button>`).join('')}</div></section><h2 class="arcade-section-title">球団選択</h2><div class="club-grid">${clubs.map(c=>`<button class="club-choice ${selectedClub===c.id?'selected':''}" data-club-choice="${c.id}" aria-label="${c.name}" aria-pressed="${selectedClub===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong><span class="choice-check">${selectedClub===c.id?'✓':''}</span></button>`).join('')}</div><div class="league-rule"><b>1回制・2アウト満塁</b><p>同点は延長。各球団と${selectedGamesPerOpponent}試合。上位3球団で${isNPB?'クライマックスシリーズ':'プレーオフ'}。</p></div><button class="primary-button" data-league-action="create">${NightTeams.get(selectedClub).short}で開始</button>${league?'<button class="secondary-button" data-league-action="dashboard">進行中のペナントへ</button><p class="league-footnote">開始すると同じリーグのペナントを置き換えます。</p>':''}`;
 }
 function standingsHTML(id=league.leagueId){
  const rows=league.standings(id),own=id===league.leagueId;
  return `<div class="league-section-head"><h2>${league.completed?'最終順位':'順位表'}</h2><span>${own?`${league.played} / ${league.totalGames} 試合`:pennantLeagues[id]}</span></div><div class="standings-wrap"><table class="standings-table" aria-label="ペナント順位表"><colgroup><col style="width:25px"><col><col style="width:27px"><col style="width:27px"><col style="width:53px"><col style="width:45px"></colgroup><thead><tr><th>順位</th><th>球団</th><th>勝</th><th>敗</th><th>得 / 失</th><th>得失差</th></tr></thead><tbody>${rows.map(r=>{const c=NightTeams.get(r.id);return `<tr class="${r.id===league.clubId?'your-club':''}"><td><b class="place-number">${r.rank}</b></td><th scope="row"><span class="standing-club">${clubBadge(c.id,true)}<span>${c.short}${c.id===league.clubId?'<i>操作球団</i>':''}</span></span></th><td>${r.wins}</td><td>${r.losses}</td><td class="runs-for-against"><b>${r.for}</b><span> / </span>${r.against}</td><td class="run-difference ${r.diff>0?'positive':r.diff<0?'negative':''}"><b>${r.diff>0?'+':''}${r.diff}</b></td></tr>`;}).join('')}</tbody></table></div><p class="league-footnote">${league.isNPB?'勝率、勝利数、同順位の球団間の対戦成績、得失点差の順で順位を決定。':'同じ勝敗のときは得失点差で順位を決定。'}</p>`;
 }
 function otherStandingsHTML(){
  return league.isNPB?`<details class="league-schedule"><summary>${pennantLeagues[league.otherLeague]}順位表 <span>＋</span></summary>${standingsHTML(league.otherLeague)}</details>`:'';
 }
 function fixtureHTML(f){
  const r=league.results[f.id],own=[f.home,f.away].includes(league.clubId),a=NightTeams.get(f.away),h=NightTeams.get(f.home);
  return `<div class="fixture-row ${own?'own-fixture':''}"><div class="fixture-team">${clubBadge(a.id,true)}<b>${a.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${a.id===league.clubId?'<i>自分</i>':''}</div><div class="fixture-score"><strong>${r?`${r.awayScore}<span> − </span>${r.homeScore}`:'vs'}</strong><small>${r?r.innings>1?`延長${r.innings}回`:'試合終了':'試合前'}</small></div><div class="fixture-team right"><b>${h.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${clubBadge(h.id,true)}${h.id===league.clubId?'<i>自分</i>':''}</div></div>`;
 }
 function leagueDashboard(){
  if(!league){leaguePicker();return;}if(league.postseason){playoffDashboard();return;}showLeagueScreen();
  const f=league.activeFixture,r=league.results[f.id],isHome=f.home===league.clubId,opponent=NightTeams.get(isHome?f.away:f.home),row=league.standings().find(s=>s.id===league.clubId),won=r&&(isHome?r.homeScore>r.awayScore:r.awayScore>r.homeScore),ownScore=r?(isHome?r.homeScore:r.awayScore):0,oppScore=r?(isHome?r.awayScore:r.homeScore):0;
  const leaders=league.standings().filter(s=>s.rank===1),champion=league.completed?league.playoffSeeds()[0].clubId===league.clubId:leaders.some(s=>s.id===league.clubId),resume=!!league.currentGame;
  const matchNumber=league.played+(r?0:1);
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">← ホーム</button><h1>ペナント</h1></div>${leagueTabs()}<div class="league-club-header">${clubBadge(league.clubId)}<div><span class="eyebrow">YOUR CLUB</span><h1>${league.club.short}</h1><div class="season-summary"><span><b>${row.rank}</b>位</span><span><b>${row.wins}</b>勝 <b>${row.losses}</b>敗</span><span>得失差 <b>${row.diff>0?'+':''}${row.diff}</b></span></div></div></div><div class="season-progress"><i style="width:${league.played/league.totalGames*100}%"></i></div><div class="season-caption"><span>${league.completed?'全日程終了':`第${matchNumber}戦`}</span><span>${league.played} / ${league.totalGames} 試合終了</span></div>${league.completed?`<div class="champion-banner"><span>SEASON FINALE</span><strong>${champion?'シーズン1位':'シーズン終了'}</strong><p>${champion?(league.isNPB?'CSはファイナルステージから出場。':'プレーオフは決勝から出場。'):`あなたの球団は${row.rank}位でシーズン終了。`}<br>${leaders.map(s=>NightTeams.get(s.id).short).join(' / ')}${leaders.length>1?'が同率首位':'が通常シーズン首位'}</p></div>`:''}<section class="league-match-card ${r?won?'won':'lost':''}"><div class="league-card-kicker"><span>${r?'試合結果':resume?'試合中':'次の試合'}</span><span>第${matchNumber}戦 · ${isHome?'後攻':'先攻'}</span></div>${r?`<div class="league-result-title">${won?'勝 利':'敗 戦'}</div><div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><strong class="final-score"><b>${ownScore}</b><span>−</span><b>${oppScore}</b></strong><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>試合終了${r.innings>1?` ・ 延長${r.innings}回`:''}</p>`:`<div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><span class="versus-label">VS</span><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>${isHome?'あなたは後攻。投球からスタート。':'あなたは先攻。打撃からスタート。'}<br>1回制 / 2アウト満塁 / 同点は延長</p>`}<button class="primary-button" data-league-action="${r?league.completed?'playoff-start':'next':'play'}">${r?league.completed?(league.isNPB?'クライマックスシリーズへ':'プレーオフへ'):'次の試合へ':resume?'再開':'試合開始'}　↗</button>${r?.report?resultReportHTML(r.report):''}${!r&&!resume?'<button class="league-inline-button" data-league-action="lineup">オーダー編成</button>':''}${r&&game?.mode==='pennant'&&game.leagueFixtureId===f.id?'<button class="league-inline-button" data-league-action="box">この試合の打撃成績</button>':''}</section>${r?`<div class="league-section-head"><h2>第${league.round+1}節の全結果</h2><span>先攻　／　後攻</span></div><div class="fixture-list">${league.schedule[league.round].map(fixtureHTML).join('')}</div>`:''}${standingsHTML()}${otherStandingsHTML()}<details class="league-schedule"><summary>日程・結果 <span>＋</span></summary>${league.schedule.map((fixtures,i)=>`<div class="schedule-round"><b>第${i+1}節 ${i===league.round?'・現在':fixtures.some(f=>[f.home,f.away].includes(league.clubId))?'':'・休み'}</b>${fixtures.map(fixtureHTML).join('')}</div>`).join('')}</details><div class="league-rule compact-rule"><b>2アウト満塁</b><p>同点は延長。延長も2アウト満塁。走塁は設定で切替。</p></div><button class="secondary-button" data-league-action="roster">選手データ</button><button class="league-inline-button" data-league-action="picker">${league.leagueId==='npb'?'リーグを選ぶ':'新しいペナント'}</button><p class="league-footnote">同節のほか${league.schedule[league.round].length-1}試合は自動進行。球団能力をもとに同じ特別ルールで結果を計算します。</p>`;
 }
 function playoffDashboard(){
  showLeagueScreen();$('pennant').innerHTML=playoffHTML(league,leagueTabs())+`<details class="league-schedule"><summary>通常シーズンの順位</summary>${standingsHTML()}</details>${otherStandingsHTML()}<button class="secondary-button" data-league-action="roster">選手データ</button>`;
 }
 function playoffReport(){
  const report=league?.activeResult?.report;if(!report)return;
  modal(`${modalTitle('','プレーオフ 試合成績')}${resultReportHTML(report)}${playerBoxHTML(report,'away')}${playerBoxHTML(report,'home')}<button class="primary-button" data-action="close">戻る</button>`,'playoff-report');
 }
 function playLeague(ready=false){
  if(!league||league.activeRoundDone||!league.userInActiveFixture)return;
  const f=league.activeFixture,restored=NightGame.restore(league.currentGame,onEvent);
  if(!(restored&&restored.leagueFixtureId===f.id&&restored.phase!=='ended')&&!ready){lineupModal('league');return;}
  closeModal(false);unlockAudio();saved=false;lastMode='pennant';
  if(restored&&restored.leagueFixtureId===f.id&&restored.phase!=='ended'){
   game=restored;game.fieldSpeed=settings.fieldSpeed;game.battingAssist=settings.battingAssist;
   if(['pitch','windup'].includes(game.phase)){game.setPhase('windup');game.pitch.progress=0;game.pitch.swung=false;game.pitch.cpuActed=false;}
  }else{
   game=new NightGame('pennant',settings.difficulty,onEvent,{npbPostseason:league.isNPB&&f.playoff,innings:f.innings,maxInnings:f.maxInnings,drawClinches:f.drawClinches,homeTeamId:f.home,awayTeamId:f.away,userHome:f.home===league.clubId,park:NightTeams.get(f.home).park,defenseSpeed:settings.defenseSpeed,pitcher:lineupConfig('league').config.pitcher,order:lineupConfig('league').config.order,fielding:lineupConfig('league').config.fielding,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist});game.leagueFixtureId=f.id;
  }
  $('distance').textContent='';$('timing-result').textContent='';activateGame();onEvent('clear');if(game.phase==='intro')game.message('PENNANT PLAY BALL',`${league.postseason?(league.isNPB?NightNPBPostseason.title(league.activeSeries):league.activeSeries.id==='qualifier'?'準決勝':'決勝')+' 第'+f.game+'戦':'第'+(league.played+1)+'戦'} · ${game.userHome?'後攻':'先攻'}でプレイ`,game.loadedStart?'1回制 / 毎回2アウト満塁 / 同点は延長':f.maxInnings?'9回制 / 延長12回まで':'9回制 / 延長無制限');else if(['result','change'].includes(game.phase)){const last=game.log.at(-1);if(last)onEvent('message',last);}updateUI();
 }
 function finishLeague(g){
  if(!league||g.leagueFixtureId!==league.activeFixture.id)return;
  if(league.completeActiveGame(g)){league.activeResult.report=buildMatchReport(g);commit(g);saveLeague();if(g.userScore>g.opponentScore)sound('win');}
  leagueDashboard();
 }
 $('pennant-mode').onclick=leagueDashboard;
 $('pennant').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;unlockAudio();
  if(b.dataset.pennantLeague){
   const id=b.dataset.pennantLeague;
   if(id!==selectedLeague&&Object.hasOwn(pennantLeagues,id)){
    if(game?.mode==='pennant')game=null;
    selectedLeague=settings.pennantLeague=id;
    save();loadLeague(id);leagueDashboard();
   }
   return;
  }
  if(b.dataset.leagueGames){selectedGamesPerOpponent=Number(b.dataset.leagueGames);settings.pennantGamesPerOpponent=selectedGamesPerOpponent;save();const scroll=window.scrollY;leaguePicker();window.scrollTo(0,scroll);return;}
  if(b.dataset.clubChoice){selectedClub=b.dataset.clubChoice;const scroll=window.scrollY;leaguePicker();window.scrollTo(0,scroll);return;}
  switch(b.dataset.leagueAction){
   case'home':home();break;
   case'picker':resetLeaguePicker();leaguePicker();break;
   case'dashboard':leagueDashboard();break;
   case'create':if(selectedLeague==='npb')break;league=new NightPennant(selectedClub,selectedGamesPerOpponent);saveLeague();game=null;leagueDashboard();break;
   case'play':playLeague();break;
   case'playoff-start':if(league.startPlayoffs()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-next':if(league.nextPlayoff()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-simulate':if(league.simulatePlayoffGame()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-report':playoffReport();break;
   case'lineup':lineupModal('league');break;
   case'next':if(league.next()){game=null;saveLeague();leagueDashboard();}break;
   case'box':boxModal();break;
   case'roster':rosterModal(null,game?.mode==='pennant'?game.userSide:'home');break;
  }
 });

 function updateResume(){try{const s=JSON.parse(localStorage.getItem('nightball.match')||'null');$('resume-game').hidden=!s?.state;if(s?.state){const g=s.state;$('resume-label').textContent=`${g.inning}回${g.half==='top'?'表':'裏'} · ${g.totalInnings}回制　${g.awayScore} - ${g.homeScore}`;}}catch{$('resume-game').hidden=true;}}
 function checkpoint(){
  if(screen==='game'&&game?.worldFixture&&game.worldFixture===world?.active?.id&&game.phase!=='ended'){
   world.currentGame=game.snapshot();saveWorld();return;
  }
  if(screen==='game'&&game?.career&&game.career.fixtureId===career?.fixture?.id&&!['ended','career-pregame'].includes(game.phase)){
   career.currentGame=game.snapshot();saveCareer();
  }
  if(game?.mode==='pennant'&&league&&!league.activeRoundDone&&game.leagueFixtureId===league.activeFixture.id&&game.phase!=='ended'){league.currentGame=game.snapshot();saveLeague();}if(screen==='game'&&game?.apbcFixtureId&&game.apbcFixtureId===tournament?.active?.id&&game.phase!=='ended'){tournament.currentGame=game.snapshot();saveTournament();}if(game?.mode==='match'&&!game.apbcFixtureId&&!saved&&game.phase!=='ended')try{localStorage.setItem('nightball.match',JSON.stringify(game.snapshot()));}catch{}updateResume();}
 function clearCheckpoint(){try{localStorage.removeItem('nightball.match');}catch{}updateResume();}
 function activateGame(){
  if(game.career||game.worldFixture||game.mode==='match'&&!game.competition&&!game.apbcFixtureId)game.absRemaining??=2;
  stopReplay();review.reset();resetPlayFeedback();updatePlayTools();updateChallenge();resetCareerOverlay();$('career').hidden=true;queuedBench=false;stadiumAudio.stopEffects();screen='game';$('apbc-cup').hidden=true;$('home').hidden=true;$('pennant').hidden=true;$('game').hidden=false;$('pause').hidden=false;$('settings').hidden=false;document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);history.replaceState({nightball:'home'},'',location.href);history.pushState({nightball:'game'},'',location.href);window.scrollTo(0,0);renderer.resize();}
 function resumeGame(){try{const snapshot=JSON.parse(localStorage.getItem('nightball.match')||'null');const restored=NightGame.restore(snapshot,onEvent);if(!restored){clearCheckpoint();toast('再開できる試合がありません');return;}closeModal(false);game=restored;saved=false;lastMode=game.competition==='apbc2026'?'apbc':'match';matchContext=lastMode;game.fieldSpeed=settings.fieldSpeed;game.battingAssist=settings.battingAssist;activateGame();onEvent('clear');if(['pitch','windup'].includes(game.phase)){game.setPhase('windup');game.pitch.progress=0;game.pitch.swung=false;game.pitch.cpuActed=false;}else if(game.phase==='result'){const last=game.log.at(-1);if(last)onEvent('message',last);}updateUI();}catch{toast('保存した試合を読み込めませんでした');}}
 let lineupContext='match',pregameTarget=null,matchPickSide='home',matchContext='match',apbcPickSide='own',matchClubGroup=settings.matchTeam?.startsWith('kbo-')?'kbo':settings.matchTeam?.startsWith('npb-')?'npb':'cpbl';
 let career=null,careerSaveWarned=false,careerTab='next',alumni=[];
 try{
  const savedAlumni=JSON.parse(localStorage.getItem(NightCareerLife.archiveKey)||'[]');
  if(Array.isArray(savedAlumni))alumni=savedAlumni.filter(p=>NightCareer.validName(p?.name)&&p.player&&Object.hasOwn(NightCareer.skills,p.mentorSkill));
 }catch{}
 function archiveCareer(){
  if(!career||career.stage!=='retired')return false;
  const profile=NightCareerLife.archive(career);
  try{
   const archive=[profile,...alumni.filter(p=>p.id!==profile.id)].slice(0,16);
   localStorage.setItem(NightCareerLife.archiveKey,JSON.stringify(archive));
   alumni=archive;
   return true;
  }catch{
   toast('OB記録を保存できませんでした');
   return false;
  }
 }
 try{career=NightCareer.restore(JSON.parse(localStorage.getItem(NightCareer.key)||'null'));}catch{}
 function saveCareer(){
  try{localStorage.setItem(NightCareer.key,JSON.stringify(career.save()));}
  catch{if(!careerSaveWarned){toast('キャリアを保存できませんでした');careerSaveWarned=true;}}
 }
 let world=null,worldCountry='',worldAlumni=[],worldPickerOpen=false,worldCreating=null;
 let worldActive=false;
 const worldStore=NightCareerWorldSave;
 try{world=NightCareerWorldSlots.load();}catch{toast('キャリアの保存枠を読み込めませんでした。データは削除していません');}
 try{worldAlumni=JSON.parse(localStorage.getItem(NightCareerWorld.alumniKey)||'[]');}catch{}
 function saveWorld(){
  try{if(NightCareerWorldSlots.save(world))return true;throw Error('slot save failed');}
  catch{toast('選手キャリアを保存できませんでした');return false;}
 }
 function worldDashboard(keepScroll=false){
  worldActive=true;
  resetCareerOverlay();closeModal(false);
  if(game?.worldFixture||game?.career){stadiumAudio.stopEffects();game=null;}
  screen='career';
  for(const id of ['home','game','pennant','apbc-cup','pause'])$(id).hidden=true;
  $('career').innerHTML=worldPickerOpen?NightCareerWorldView.slots(NightCareerWorldSlots.list(),!!career):
   world?NightCareerWorldView.dashboard(world,!!career):NightCareerWorldView.setup(worldCountry,!!career,worldAlumni);
  $('career').hidden=false;
  history.replaceState({nightball:'career'},'',location.href);
  if(!keepScroll)window.scrollTo(0,0);
 }
 $('career').addEventListener('submit',e=>{
  if(e.target.id!=='world-create'||world)return;
  e.preventDefault();
  const f=Object.fromEntries(new FormData(e.target));
  try{
   world=new NightCareerWorld({...f,name:f.name.trim(),country:worldCountry,growth:+f.growth,short:f.season==='short'});
   const recent=worldAlumni.find(a=>a.country===worldCountry);
   if(recent)world.note('入学式でOBの'+recent.name+'が新入生を激励');
  }catch(error){toast(error.message);return;}
  const committed=NightCareerWorldSlots.create(world,worldCreating);
  if(!committed){world=null;toast('新しい保存枠に保存できませんでした。既存データは残っています');return;}
  worldCreating=false;worldPickerOpen=false;worldCountry='';worldDashboard();
 });
 function worldAction(e){
  const b=e.target.closest('[data-world-action]');
  if(!b)return;
  unlockAudio();
  const action=b.dataset.worldAction,v=b.dataset.value;
  if(action==='home'){home();return;}
  if(action==='legacy'){careerTab='next';careerDashboard();return;}
  if(action==='slots'){
   if(world&&!saveWorld())return;
   worldPickerOpen=true;worldDashboard();return;
  }
  if(action==='slots-close'){
   worldPickerOpen=false;worldCreating=false;
   try{world=NightCareerWorldSlots.load();}catch{toast('保存枠の読み込みに失敗しました');}
   worldDashboard();return;
  }
  if(action==='slot-open'){
   if(world&&!saveWorld())return;
   const selected=NightCareerWorldSlots.open(+v);
   if(!selected){toast('この選手データは読み込めません。既存データは削除していません');return;}
   world=selected;worldPickerOpen=false;worldCreating=false;worldCountry='';
   worldDashboard();return;
  }
  if(action==='slot-create'){
   if(world&&!saveWorld())return;
   if(NightCareerWorldSlots.list().slots.length>=NightCareerWorldSlots.capacity){toast('選手は最大3人までです');return;}
   world=null;worldCountry='';worldPickerOpen=false;worldCreating=+v;
   worldDashboard();return;
  }
  if(action==='country'){worldCountry=v;worldDashboard();return;}
  const w=world;
  if(!w)return;
  if(action==='music'){musicMenu('world-career');return;}
  if(action==='last-result'){if(w.last)showWorldResult();return;}
  if(action==='result-next'){
   if(screen==='game')worldDashboard();else closeModal(false);
   return;
  }
  if(action==='detail'){
   modal(modalTitle('',({schedule:'日程・大会',skills:'フォーム・特殊能力',players:'選手・成績',life:'契約・生活',international:'国際大会',history:'年表・記録'})[v]||'キャリア詳細')+
    NightCareerWorldView.detail(w,v),'career-world-detail');
   return;
  }
  const change={
   advance:()=>w.run(v),simulate:()=>w.finishDay(),
   'success-action':()=>NightCareerWorldSuccess.action(w,v),
   'success-skill':()=>NightCareerWorldSuccess.skill(w,v),
   'success-choice':()=>NightCareerWorldSuccess.choose(w,v),
   'success-event':()=>NightCareerWorldSuccess.openEvent(w),
   'success-dismiss':()=>{if(!w.success?.inbox)return false;w.success.inbox=null;return true;},
   'success-back':()=>{if(w.success?.pending)return false;NightCareerWorldSuccess.state(w).menu=null;return true;},
   train:()=>w.train(v),form:()=>w.changeForm(v),convert:()=>w.conversion(v),learn:()=>w.learn(v),life:()=>w.lifestyle(v),social:()=>w.lifestyle('social',v),
   'draft-apply':()=>w.draftApply(true),'draft-next':()=>w.draftReveal(false),'draft-all':()=>w.draftReveal(true),
   'draft-sign':()=>w.signDraft(),amateur:()=>w.amateur(v),request:()=>w.openMarket(true),
   refuse:()=>w.refuse(),negotiate:()=>w.negotiate(+v),accept:()=>w.accept(+v),stay:()=>w.stay(),
   retire:()=>{if(!window.confirm('この選手は現役を引退します。続けますか？'))return false;return w.retire();},
   new:()=>{
    worldAlumni=[{name:w.name,country:w.country,games:w.lifetime.g},...worldAlumni].slice(0,16);
    try{localStorage.setItem(NightCareerWorld.alumniKey,JSON.stringify(worldAlumni));}
    catch{toast('OB記録を保存できませんでした');return false;}
    if(!saveWorld())return false;
    worldPickerOpen=true;worldDashboard();return true;
   }
  };
  if(action==='play'){playWorld(v||'self');return;}
  if(change[action]?.()){
   if(action!=='new'){
    saveWorld();worldDashboard(!['advance','simulate','draft-sign','retire','accept','stay'].includes(action));
    if(action==='simulate'&&w.last)showWorldResult();
   }
  }else if(action!=='retire')toast('この操作は現在実行できません');
 }
 $('career').addEventListener('click',worldAction);
 $('modal-content').addEventListener('click',worldAction);
 function playWorld(chosen){
  const data=world.currentGame;
  const format=data?.state?.career?.format||(data?.state?.mode==='match'?'full':chosen);
  const options=world.liveOptions(format)||(!data&&format==='full'?world.liveOptions('self'):null);
  if(!options)return;
  const mode=options.career?(options.career.pitching?'career-pitch':'career-bat'):'match';
  const difficulty={easy:'casual',normal:'standard',hard:'pro'}[world.difficulty];
  const restored=NightGame.restore(data,onEvent,options);
  if(data&&!restored){toast('中断した試合を再開できませんでした');return;}
  closeModal(false);saved=false;lastMode=mode;onEvent('clear');
  game=restored||new NightGame(mode,difficulty,onEvent,{...options,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,
   battingAssist:settings.battingAssist,defenseSpeed:settings.defenseSpeed});
  activateGame();updateUI();
  if(game.phase==='career-ready')careerAppearance(game);
 }
 function finishWorld(g){
  if(!saved){
   if(!world?.completeLive(g)){worldDashboard();return;}
   saveWorld();saved=true;
  }
  resetCareerOverlay();
  showWorldResult(g);
 }
 function showWorldResult(g){
  const line=g?lineScoreHTML(buildMatchReport(g)):'';
  modal(`${modalTitle('','試合結果',false)}${NightCareerWorldView.matchResult(world)}${line}
   <button class="primary-button" data-world-action="result-next">キャリアへ戻る</button>`,'career-result');
 }

 let careerLifeTab='leisure',careerDrillAim=null;
 function careerDashboard(keepScroll=false){
  worldActive=false;
  let content;
  try{content=career?careerDashboardHTML(career,clubBadge,careerTab,careerLifeTab,careerDrillAim):careerSetup(alumni);}
  catch(error){
   console.error('Career screen could not be displayed',error);
   content=`<section class="career-panel" role="alert"><h2>キャリアを表示できませんでした</h2>
    <p>セーブデータは保持されています。</p>
    <button type="button" class="primary-button" data-career-action="tab" data-tab="next">もう一度表示</button>
    <button type="button" class="secondary-button" data-career-action="home">ホームへ戻る</button></section>`;
  }
  resetCareerOverlay();
  closeModal(false);
  if(game?.career){stadiumAudio.stopEffects();game=null;}
  screen='career';
  for(const id of ['home','game','pennant','apbc-cup','pause'])$(id).hidden=true;
  $('career').innerHTML=content;
  $('career').hidden=false;
  $('career').querySelector('.career-heading')?.insertAdjacentHTML('beforeend','<button type="button" class="career-back" data-action="world-dashboard">新キャリア</button>');
  document.querySelector('#career [data-action="world-dashboard"]')?.addEventListener('click',()=>worldDashboard());
  if(career)$('career').querySelector('.career-heading')?.insertAdjacentHTML('beforeend',
   '<button type="button" class="career-back" data-career-action="music">応援歌設定</button>');
  history.replaceState({nightball:'career'},'',location.href);
  if(!keepScroll)window.scrollTo(0,0);
 }
 $('career').addEventListener('submit',e=>{
  if(e.target.id!=='career-create'||career)return;
  e.preventDefault();
  const form=new FormData(e.target),name=form.get('name').trim();
  if(!NightCareer.validName(name)){
   $('career-error').textContent='名前は16文字以内で、文字・数字・空白・中点・ハイフンが使えます。';
   $('career-error').hidden=false;
   return;
  }
  career=new NightCareer(name,form.get('school'),form.get('style'),form.get('hand'),form.get('position'));
  const mentor=alumni.find(p=>p.id===form.get('mentor'));
  if(mentor)career.mentor={name:mentor.name,skill:mentor.mentorSkill};
  saveCareer();careerDashboard();
 });
 function careerChoiceState(){
  const {skills,fatigue,injury,wallet}=career;
  return {skills:{...skills},fatigue,injury,wallet,role:career.fixture?.role};
 }
 function showCareerChoice(title,detail,before,grade=null){
  const changes=before?Object.entries(career.skills).filter(([key,value])=>before.skills[key]!==value)
   .map(([key,value])=>NightCareer.skills[key]+' '+before.skills[key]+' → '+value+'（+'+(value-before.skills[key])+'）'):[];
  if(before&&before.fatigue!==career.fatigue)changes.push('疲労 '+before.fatigue+'% → '+career.fatigue+'%');
  if(before&&before.injury!==career.injury)changes.push(career.injury?'回復まであと '+career.injury+' 試合相当':'故障から回復');
  if(before&&before.wallet!==career.wallet)changes.push('育成資金 '+NightCareer.money(career.wallet));
  const role=career.fixture?.role;
  if(before?.role&&role&&before.role!==role)changes.push('次戦の起用 '+careerUsage(career,career.fixture));
  career.choiceHistory.push({title,detail:[grade,detail,...changes].filter(Boolean).join(' ／ ')});
  if(career.choiceHistory.length>30)career.choiceHistory.shift();
  saveCareer();
  careerDashboard();
  modal(`${modalTitle('',grade?'練習結果':'行動の結果',false)}<div class="career-choice-result" data-grade="${grade||''}">
   ${grade?`<div class="career-practice-verdict"><h3>${title}</h3>
    <strong class="career-practice-grade">${grade}</strong></div>`:`<h3>${title}</h3>`}
   <div class="career-practice-details">
    ${detail?`<p>${detail}</p>`:''}
    ${changes.length?`<ul>${changes.map(change=>`<li>${change}</li>`).join('')}</ul>`:''}
   </div></div>
   <button class="primary-button" data-action="close">確認して次へ</button>`,grade?'career-practice-result':'career-choice-result');
 }
 $('career').addEventListener('click',e=>{
  const extra=e.target.closest('button[data-extra]');
  if(extra&&career){
   const [kind,id,item,value]=extra.dataset.extra.split(':');
   const E=NightCareerExtras;
   if(kind==='life-tab'){careerLifeTab=id;careerDashboard();return;}
   let outcome=null;
   if(kind==='life')outcome=E.lifeAction(career,id,item,value);
   if(kind==='base')outcome=E.practiceWeekStart(career,id,item);
   if(kind==='practice'&&id==='auto'){careerDrillAim=null;outcome=E.quickDrill(career);}
   if(kind==='answer'){
    if(id==='timing'){
     if(!careerDrillAim)return;
     const elapsed=(performance.now()-careerDrillAim.start)%1100;
     outcome=E.practiceAnswer(career,careerDrillAim.choice,false,elapsed>=440&&elapsed<=800);
     careerDrillAim=null;
    }else if(id==='auto'){
     careerDrillAim=null;outcome=E.practiceAnswer(career,null,true);
    }else{
     careerDrillAim={choice:Number(id),start:0};careerDashboard(true);careerDrillAim.start=performance.now();
     $('career').querySelector('[data-extra="answer:timing"]')?.focus({preventScroll:true});return;
    }
   }
   if(outcome){saveCareer();careerDashboard();$('career').querySelector('.career-extra-result')?.focus({preventScroll:true});}
   return;
  }
  const b=e.target.closest('button[data-career-action]');
  if(!b)return;
  const key=b.dataset.careerAction;
  const before=['camp','rest'].includes(key)&&career?careerChoiceState():null;
  switch(key){
   case'home':home();return;
   case'music':musicMenu('career');return;
   case'episode':{
    const result=NightCareerExtras.resolveEpisode(career,b.dataset.choice);
    if(result){saveCareer();careerDashboard();
     $('career').querySelector(result.continuing?'#career-story-title':'.career-story-recap')?.focus({preventScroll:true});}
    return;
   }
   case'tab':
    careerDrillAim=null;careerTab=b.dataset.tab;careerDashboard(true);
    $('career').querySelector('[aria-current="page"]')?.focus({preventScroll:true});
    return;
   case'calendar':{
    const calendar=$('career-calendar');
    calendar?.scrollIntoView({block:'start'});
    calendar?.focus({preventScroll:true});
    return;
   }
   case'activity':
    if(!career?.selectActivity(b.dataset.id))return;
    saveCareer();careerDashboard();
    $('career').querySelector('.career-next .primary-button')?.focus({preventScroll:true});
    return;
   case'tryout':
    if(career?.startSchoolTryout()){saveCareer();careerDashboard();careerPregame();}
    return;
   case'cancel-tryout':
    if(!career?.currentGame&&career?.schoolTryoutFor){career.schoolTryoutFor=null;saveCareer();careerDashboard();}
    return;
   case'play':careerPregame(b.dataset.format);return;
   case'miss':if(career?.missGame())showCareerResult();return;
   case'decline':
    if(career?.declineDraft(b.dataset.id))showCareerChoice(b.dataset.id+'でドラフト再挑戦','選考試合でアピールして、次の指名を目指します。');
    return;
   case'camp':
    if(career?.chooseCamp(b.dataset.id))showCareerChoice(NightCareerLife.camps[b.dataset.id][0],'春季キャンプの選択を反映しました。',before);
    return;
   case'overseas':
    if(career?.goOverseas(b.dataset.id))showCareerChoice('海外キャンプへ参加',NightCareerLife.foreign[b.dataset.id].name+'の選考に進みます。');
    return;
   case'overseas-sign':
    if(career?.signOverseas())showCareerChoice('海外球団と契約','海外リーグに1年間参加します。');
    return;
   case'overseas-return':
    if(career?.returnHome())showCareerChoice('台湾球界に復帰','来季の契約を確認できます。');
    return;
   case'retire':
    if(!career?.canRetire)return;
    modal(`${modalTitle('','引退しますか？')}<p>通算成績とライバルとの対戦はOB記録に保存されます。</p>
     <button class="primary-button" data-action="career-retire">現役を引退する</button>
     <button class="secondary-button" data-action="close">戻る</button>`,'career-retire');
    return;
   case'new-career':
    if(!archiveCareer())return;
    career=null;careerTab='next';
    try{localStorage.removeItem(NightCareer.key);}catch{}
    careerDashboard();return;
   case'auto-series':{
    const results=NightCareerExtras.autoFixtures(career);
    if(!results.length)return;
    if(results.length>1)career.last.events=[...(career.last.events||[]),...results.slice(0,-1).map(r=>
     r.label+' '+r.team+' '+r.score.own+'–'+r.score.opp+' '+r.opponent)];
    showCareerResult();return;
   }
   case'skip':
    if(!career?.skip())return;
    showCareerResult();return;
   case'apbc':
    if(career?.startAPBC())showCareerChoice('台湾代表に合流','APBCの初戦に向けて準備します。');
    return;
   case'rest':
    if(career?.rest())showCareerChoice('休養',null,before);
    return;
   case'sign':
    if(career?.signDraft(Number(b.dataset.offer)))
     showCareerChoice(NightTeams.get(career.clubId).name+'に入団',NightCareer.levels[career.level]+' · 年俸 '+NightCareer.money(career.pay));
    return;
   case'negotiate':{
    const result=career?.counterOffer(Number(b.dataset.offer));
    if(!result)return;
    const offer=career.offers[Number(b.dataset.offer)];
    showCareerChoice('年俸交渉',result+'。提示額 '+NightCareer.money(offer.pay));
    return;
   }
   case'offer':{
    const index=Number(b.dataset.offer),offer=career?.offers[index];
    if(!offer)return;
    modal(`${modalTitle('','来季の契約を確認')}<p>${NightTeams.get(offer.clubId).name} · 年俸 ${NightCareer.money(offer.pay)} · ${offer.years||1}年</p>
    <button class="primary-button" data-action="career-contract" data-offer="${index}">契約して次の年へ</button>
    <button class="secondary-button" data-action="close">条件の比較に戻る</button>`,'career-contract');
    return;
   }
   case'reset':
    modal(`${modalTitle('','新しい選手を作る')}<p>今の選手とキャリアの成績を削除します。</p><button class="primary-button" data-action="career-reset">削除して作り直す</button><button class="secondary-button" data-action="close">戻る</button>`,'career-reset');
    return;
  }
 });
 $('career').addEventListener('change',e=>{
  const input=e.target;
  if(['career-new-school','career-new-position','career-new-style'].includes(input.id)){
   updateCareerSetup(input.form);
   return;
  }
  if(input.id==='career-plan')career.setPlan(...input.value.split('|'));
  else if(input.id==='career-role')career.deployAs(input.value);
  else if(input.id==='career-position')career.setPosition(input.value);
  else if(input.id==='career-form')career.setForm(input.value);
  else if(input.id==='career-difficulty')career.setDifficulty(input.value);
  else if(input.id==='career-intro')career.shortIntro=input.value==='short';
  else if(input.id==='career-running')career.manualRunning=input.value==='manual';
  else return;
  saveCareer();careerDashboard(true);
  $(input.id)?.focus({preventScroll:true});
 });
 function resetCareerOverlay(){
  const overlay=$('career-field-overlay');
  overlay.hidden=true;overlay.innerHTML='';
  $('game').classList.remove('career-presentation');
  for(const id of ['game-canvas','bat-options','pitch-deck','player-card','pitcher-card','field-speed','tactics-tool'])$(id).inert=false;
 }
 function showCareerOverlay(html,focusDelay=0){
  const overlay=$('career-field-overlay');
  overlay.innerHTML=html;
  overlay.hidden=false;
  $('game').classList.add('career-presentation');
  for(const id of ['game-canvas','bat-options','pitch-deck','player-card','pitcher-card','field-speed','tactics-tool'])$(id).inert=true;
  const button=overlay.querySelector('button');
  if(focusDelay)setTimeout(()=>{if(button?.isConnected&&$('modal').hidden)button.focus({preventScroll:true});},focusDelay);
  else button?.focus({preventScroll:true});
 }
 function careerPregame(format='quick'){
  playCareer(format,!career?.currentGame);
 }
 const careerBatLabels={single:'安打',double:'二塁打',triple:'三塁打',hr:'本塁打',walk:'四球',strikeout:'三振',
  groundout:'ゴロ',flyout:'フライ',lineout:'ライナー',forceout:'フォースアウト',doubleplay:'併殺打',sacrifice:'犠打',
  error:'失策で出塁',out:'アウト'};
 function careerAppearance(g){
  if(screen!=='game'||g!==game||g.phase!=='career-ready')return;
  const pitching=g.defending,score=g.userScore-g.opponentScore;
  const runners=g.bases.map((occupied,i)=>occupied?['一塁','二塁','三塁'][i]:null).filter(Boolean);
  const inning=g.inning+'回'+(g.half==='top'?'表':'裏');
  const difference=score===0?'同点':Math.abs(score)+'点'+(score>0?'リード':'を追う');
  const changes=Array.isArray(g.career.simulatedRuns)?g.career.simulatedRuns:[];
  const startingLead=changes.reduce((lead,e)=>lead+(e.side===g.userSide?-e.runs:e.runs),score);
  let lead=startingLead;
  const latest=changes.map(e=>{
   const previousLead=lead,friendly=e.side===g.userSide;
   lead+=friendly?e.runs:-e.runs;
   const turnaround=(friendly?previousLead<=0&&lead>0:previousLead>=0&&lead<0)?'で勝ち越し':
    (lead===0&&previousLead!==0)?'で同点':(friendly&&previousLead<lead&&lead<0)?'を返す':'';
   return e.inning+'回'+(e.side==='home'?'裏に':'表に')+(friendly?'味方':'相手')+'が'+e.runs+'点'+turnaround;
  });
  const opponent=pitching?g.batter:g.pitcher;
  const sub=g.career.completed===0&&(['pinch','defense','school-relief','fireman','setup','mop','closer'].includes(g.career.role));
  const history=g.career.atBats||[];
  const names={home:g.teams.home.name,away:g.teams.away.name},totals={home:g.homeScore,away:g.awayScore};
  const line={home:g.home,away:g.away,unknown:{
   home:NightCareerLeagues.missingRuns(g.home,g.homeScore),away:NightCareerLeagues.missingRuns(g.away,g.awayScore)}};
  const announce=sub&&!g.career.shortIntro;
  showCareerOverlay(`<div class="career-field-content${announce?' career-with-entrance':''}">
   ${sub?`<p class="career-substitution">${pitching?'投手交代':g.career.role==='defense'?'途中出場':'代打'}　<strong>${g.worldFixture?world.name:career.name}</strong></p>`:''}
   <div class="career-field-details">${careerScoreboard(names,totals,line,g.inning,changes)}
   <div class="career-field-panel career-field-context">
   <h2 class="career-field-situation">${inning} <span>${difference}</span></h2>
   <p class="career-field-runners">${g.outs}アウト · ${runners.length===3?'満塁':runners.join('・')||'走者なし'}</p>
   <p class="career-field-opponent">${pitching?'先頭打者':'相手投手'}　<strong>${opponent.name}</strong></p>
   ${g.career.trainingGoal?`<p class="career-field-note">練習の課題　${NightCareerExtras.curricula[g.career.trainingGoal]?.cue||''}</p>`:''}
   ${latest.length?`<p class="career-field-note">${latest.join(' ／ ')}</p>`:''}
   ${history.length?`<p class="career-field-note">今日の打席　${history.map(a=>'第'+a.number+'打席 '+(careerBatLabels[a.kind]||'打席終了')).join(' ／ ')}</p>`:''}
   </div>
   <button class="career-field-button" data-field-action="appearance">${pitching?'マウンドへ':'打席へ'}</button>
   </div></div>`,announce?360:0);
 }
 $('career-field-overlay').addEventListener('click',e=>{
  const key=e.target.closest('[data-field-action]')?.dataset.fieldAction;
  if(key==='cancel'){careerDashboard();return;}
  if(key==='start'&&game?.phase==='career-pregame'){
   resetCareerOverlay();game.setPhase('intro');showCareerIntro();updateUI();return;
  }
  if(key==='appearance'&&game?.phase==='career-ready'&&!game.paused&&$('modal').hidden){
   resetCareerOverlay();game.acknowledgeCareerAppearance();$('game-canvas').focus({preventScroll:true});
  }
 });
 function showCareerIntro(){
  if(!game.career.shortIntro)game.message('PLAY BALL',game.teams.home.name+' vs '+game.teams.away.name,game.career.label,'career-intro');
 }
 function playCareer(format='quick',pregame=false){
  if(!career||career.injury>=2&&!career.currentGame)return;
  const data=career.currentGame,options=career.gameOptions(data?.state?.career?.format||format);
  if(!options)return;
  Object.assign(options.career,{presentation:true,shortIntro:career.shortIntro||matchMedia('(prefers-reduced-motion: reduce)').matches});
  const mode=options.career.pitching?'career-pitch':'career-bat';
  const difficulty={relaxed:'casual',challenging:'standard',expert:'pro'}[career.difficulty]||'standard';
  const restored=NightGame.restore(data,onEvent,options);
  if(data&&!restored){toast('中断データを読み込めなかったため、この試合を最初から開始します');}
  closeModal(false);unlockAudio();saved=false;lastMode=mode;onEvent('clear');
  game=restored||new NightGame(mode,difficulty,onEvent,{...options,fieldSpeed:settings.fieldSpeed,
   battingAssist:settings.battingAssist&&career.difficulty!=='expert'});
  if(game.field&&['field','result'].includes(game.phase)&&game.mode==='career-bat')game.career.queuedRunningMode=options.manualRunning;
  else game.manualRunning=options.manualRunning;
  if(pregame)game.setPhase('career-pregame');
  activateGame();updateUI();
  if(pregame){
   const f=career.fixture,{home,away}=game.teams;
   const date=NightCareerLeagues.calendar(career,f)?.next;
   const title=f.gameName.split('・'),round=title.length>1?title.pop():null;
   showCareerOverlay(`<div class="career-field-content career-field-pregame">
    <div class="career-field-panel career-field-matchup">
    <p class="career-field-competition">${date?date+' · ':''}${title.join('・')}</p>
    ${round?`<h2 class="career-field-round">${round}</h2>`:''}
    <div class="career-field-teams"><strong>${home.name}</strong><span>VS</span><strong>${away.name}</strong></div>
    <p class="career-field-opponent">${game.park.name}${game.park.school?' · 両翼 '+game.park.corner+' m / 中堅 '+game.park.center+' m':''}</p>
    <p class="career-field-role"><strong>${career.name}</strong>　${careerUsage(career,f)}</p>
    ${career.injury?'<p class="career-field-note">軽い故障を抱えて出場</p>':''}
    </div>
    <button class="career-field-button" data-field-action="start">試合開始</button>
    <button class="career-field-back" data-field-action="cancel">キャリアへ戻る</button></div>`);
   return;
  }
  if(game.phase==='intro')showCareerIntro();
  if(restored&&restored.phase==='result'){
   const last=game.log.at(-1);
   if(last)onEvent('message',last);
  }
  if(game.phase==='career-ready')careerAppearance(game);
 }
 function finishCareer(g){
  if(!career?.complete(g)){careerDashboard();return;}
  saved=true;showCareerResult();
 }
 function showCareerResult(){
  resetCareerOverlay();
  saveCareer();
  modal(`${modalTitle('',career.last.label==='紅白戦・出場選考'?'紅白戦の選考結果':'試合結果',false)}${careerResult(career)}
   <button class="primary-button" data-action="career-dashboard">次へ</button>`,'career-result');
 }
 const Tournament=NightAPBCTournament;
 let tournament=null,apbcDraftTeam='apbc-taipei',apbcDraftInnings=1,apbcDraftRosters={},apbcSelection=null;
 try{tournament=Tournament.restore(JSON.parse(localStorage.getItem('nightball.apbc-tournament')||'null'));}catch{}
 function saveTournament(){
  try{localStorage.setItem('nightball.apbc-tournament',JSON.stringify(tournament.snapshot()));}
  catch{toast('大会データを保存できませんでした');}
 }
 function apbcHub(){
  matchContext='apbc';
  modal(`${modalTitle('','APBC 2026')}<div class="apbc-event-strip"><b>4代表</b><span>東京ドーム</span></div><div class="apbc-country-line">${NightTeams.international.map(c=>clubBadge(c.id)).join('')}</div>
   ${tournament?`<button class="primary-button" data-action="apbc-dashboard">${tournament.place?'前回の大会結果':'大会を続ける'}<small>　${NightTeams.get(tournament.team).short} · ${tournament.innings}回制</small></button>`:''}
   <button class="${tournament?'secondary':'primary'}-button" data-action="apbc-new">新しい大会</button><button class="secondary-button" data-action="apbc-single">代表対戦（1試合）</button>`,'apbc-hub');
 }
 function apbcDraft(){
  const ids=apbcDraftRosters[apbcDraftTeam]||=Tournament.official(apbcDraftTeam);
  const roster=Tournament.rosterStatus(apbcDraftTeam,ids);
  modal(`${modalTitle('','APBC 大会設定')}<div class="apbc-event-strip"><b>予選3試合＋順位決定戦</b><span>東京ドーム</span></div>
   <h3 class="apbc-section-label">操作する代表</h3><div class="team-select-grid apbc-national-grid apbc-four">${NightTeams.international.map(c=>`<button data-apbc-draft-team="${c.id}" class="${c.id===apbcDraftTeam?'selected':''}" aria-pressed="${c.id===apbcDraftTeam}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div>
   <h3 class="apbc-section-label">試合の長さ</h3><div class="segmented apbc-length">${[[1,'毎回2アウト満塁'],[9,'延長は無死一・二塁']].map(([n,note])=>`<button data-apbc-draft-innings="${n}" class="${apbcDraftInnings===n?'active':''}" aria-pressed="${apbcDraftInnings===n}">${n}イニング<small>${note}</small></button>`).join('')}</div>
   <button class="secondary-button" data-action="apbc-selection">代表選考　${ids.length}/28人</button>
   <button class="primary-button" data-action="apbc-create" ${roster.valid?'':'disabled'}>大会を開始</button>
   ${tournament&&!tournament.place?'<p class="modal-note">開始すると進行中のAPBC大会を置き換えます。</p>':''}
   <button class="secondary-button" data-action="apbc-hub">戻る</button>`,'apbc-draft');
 }
 function apbcSelectionModal(scroll=0){
  const {team,ids,kind,clubFilter}=apbcSelection,club=NightTeams.get(team),pool=Tournament.pool(team),status=Tournament.rosterStatus(team,ids),official=new Set(Tournament.official(team));
  const expanded=team==='apbc-taipei';
  const visible=pool.filter(p=>(kind==='pitchers'?p.pos==='P':p.pos!=='P')&&(!expanded||clubFilter==='all'||(clubFilter==='registered'?ids.includes(p.id):clubFilter==='other'?!p.sourceClubId:p.sourceClubId===clubFilter)));
  const filters=[['all','全候補'],['registered','登録済み'],...NightTeams.all.map(c=>[c.id,c.short]),['other','海外所属']];
  const renderPlayer=p=>{
   const selected=ids.includes(p.id),rank=NightPlayers.grade(NightSquad.overall(p));
   return `<button class="apbc-register-player ${selected?'registered':''}" data-apbc-register="${p.id}" aria-pressed="${selected}"><span class="apbc-register-check" aria-hidden="true">${selected?'✓':'＋'}</span><span><b>${p.name}</b><small>${p.club||club.short} · ${official.has(p.id)?'実際の代表':'追加候補'}${p.ratingsProvisional?' · 暫定査定':''}</small></span><span class="apbc-register-grade grade-${rank}"><small>${NightSquad.label(p.pos)}</small><b>${rank}</b></span></button>`;
  };
  const focusId=document.activeElement?.dataset.apbcRegister;
  modal(`${modalTitle('','代表選考')}<div class="apbc-register-toolbar"><div>${clubBadge(team)} <b>${club.short}</b><small>野手 ${status.batters} ・ 投手 ${status.pitchers}</small></div><button class="arcade-go" data-action="apbc-selection-done" ${status.valid?'':'disabled'}>${ids.length}/28人 · 決定</button></div>
   <div class="apbc-selection-controls"><div class="segmented"><button class="${kind==='bats'?'active':''}" data-apbc-selection-kind="bats">野手</button><button class="${kind==='pitchers'?'active':''}" data-apbc-selection-kind="pitchers">投手</button></div><button class="text-button" data-action="apbc-official">実際の代表に戻す</button></div>
   <p class="apbc-selection-note">${ids.length===28?'入れ替える選手の登録を外してから追加できます。':'登録には野手9人以上（捕手を含む）・投手2人以上が必要です。'}</p>
   ${expanded?`<label class="apbc-club-filter">所属球団・登録状況<select class="field-select" id="apbc-club-filter">${filters.map(([id,label])=>`<option value="${id}" ${id===clubFilter?'selected':''}>${label}</option>`).join('')}</select></label><p class="apbc-selection-note">${visible.length}人表示 · 大会の年齢・プロ年数制限なし</p>`:''}
   <div class="apbc-register-list">${visible.length?visible.map(renderPlayer).join(''):'<p class="apbc-selection-note">該当する選手がいません。</p>'}</div><button class="secondary-button" data-action="apbc-draft">戻る</button>`,'apbc-selection');
  $('modal-content').scrollTop=scroll;
  if(focusId)requestAnimationFrame(()=>$('modal-content').querySelector(`[data-apbc-register="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true}));
 }
 function apbcResultRow(m){
  const a=NightTeams.get(m.away),h=NightTeams.get(m.home);
  return `<div class="apbc-fixture-row ${[m.away,m.home].includes(tournament.team)?'own':''}"><span>${clubBadge(a.id)}<b>${a.short}</b></span><strong>${m.awayScore??'—'} <i>−</i> ${m.homeScore??'—'}</strong><span><b>${h.short}</b>${clubBadge(h.id)}</span></div>`;
 }
 function apbcDashboard(){
  if(!tournament){apbcHub();return;}
  closeModal(false);screen='apbc-cup';matchContext='apbc';$('home').hidden=true;$('game').hidden=true;$('pennant').hidden=true;$('apbc-cup').hidden=false;$('pause').hidden=true;
  history.replaceState({nightball:'apbc-cup'},'',location.href);window.scrollTo(0,0);
  const t=tournament,club=NightTeams.get(t.team),active=t.active,dayLabel=active?.day===3?(active.slot===1?'決勝':'3位決定戦'):`予選 第${t.day+1}戦`;
  const lastDay=t.results.filter(r=>r.day===t.day-1),last=lastDay.find(r=>r.report),result=last&&((last.home===t.team)===(last.homeScore>last.awayScore)?'勝利':'敗戦');
  $('apbc-cup').innerHTML=`<div class="league-heading"><button class="text-button" data-apbc-cup="home">← ホーム</button><h1>APBC 2026</h1></div>
   <div class="league-club-header">${clubBadge(club.id)}<div><h2>${club.short}</h2><small>${t.innings}イニング · ${t.day}/4試合終了</small></div></div>
   <section class="apbc-cup-card apbc-next">${t.place?`<h2>${['','優勝','準優勝','3位','4位'][t.place]}</h2>${last?apbcResultRow(last):''}<button class="secondary-button" data-apbc-cup="new">新しい大会</button>`:`<h2>${dayLabel}</h2>${apbcResultRow(active)}<button class="primary-button" data-apbc-cup="play">${t.currentGame?'試合を再開':'オーダー編成へ'}</button>`}</section>
   ${lastDay.length?`<section class="apbc-cup-card"><h2>${t.day===4?'順位決定戦':`予選 第${t.day}日の結果`}${result?`<small>　${result}</small>`:''}</h2>${lastDay.map(apbcResultRow).join('')}${last?.report?`<details><summary>自チームの試合詳細</summary>${resultReportHTML(last.report)}<details><summary>打撃・投手成績</summary>${playerBoxHTML(last.report,last.home===t.team?'home':'away')}</details></details>`:''}</section>`:''}
   <section class="apbc-cup-card"><h2>予選順位</h2><table class="apbc-standings"><thead><tr><th>順位</th><th>チーム</th><th>勝</th><th>敗</th><th>得失点差</th></tr></thead><tbody>${t.standings.map((r,i)=>`<tr class="${r.id===t.team?'own':''}"><td>${i+1}</td><th>${clubBadge(r.id)}${NightTeams.get(r.id).short}</th><td>${r.w}</td><td>${r.l}</td><td>${r.delta>0?'+':''}${r.delta}</td></tr>`).join('')}</tbody></table><p>同勝数は直接対戦の勝数、得失点差、総得点の順。</p></section>
   ${t.results.length?`<details class="apbc-cup-card"><summary>大会の全結果</summary>${t.results.map(apbcResultRow).join('')}</details>`:''}`;
 }
 function playTournament(ready=false){
  const t=tournament,f=t?.active;if(!f)return;
  const restored=NightGame.restore(t.currentGame,onEvent);
  if(!restored&&!ready){lineupModal('apbc-cup');return;}
  closeModal(false);unlockAudio();saved=false;lastMode='apbc-cup';matchContext='apbc';
  if(restored){
   game=restored;game.fieldSpeed=settings.fieldSpeed;game.battingAssist=settings.battingAssist;
   if(['pitch','windup'].includes(game.phase)){game.setPhase('windup');game.pitch.progress=0;game.pitch.swung=false;game.pitch.cpuActed=false;}
  }else{
   const {config}=lineupConfig('apbc-cup');
   game=new NightGame('match',settings.difficulty,onEvent,{competition:'apbc2026',apbcFixtureId:f.id,apbcFinal:f.day===3&&f.slot===1,apbcRoster:{team:t.team,ids:t.roster},homeTeamId:f.home,awayTeamId:f.away,userHome:f.home===t.team,innings:t.innings,park:'tokyo-dome',order:config.order,fielding:config.fielding,pitcher:config.pitcher,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,defenseSpeed:settings.defenseSpeed,battingAssist:settings.battingAssist});
  }
  activateGame();onEvent('clear');
  if(game.phase==='intro')game.message('APBC 2026',f.day===3?(f.slot===1?'決勝':'3位決定戦'):`予選 第${f.day+1}戦`,t.innings===1?'1イニング · 2アウト満塁':'9イニング');
  else if(['result','change'].includes(game.phase)&&game.log.length)onEvent('message',game.log.at(-1));
  updateUI();
 }
 function finishTournament(g){
  if(tournament?.complete(g,buildMatchReport(g))){commit(g);saveTournament();if(g.userScore>g.opponentScore)sound('win');}
  apbcDashboard();
 }
 $('apbc-cup').addEventListener('click',event=>{
  switch(event.target.closest('button')?.dataset.apbcCup){
   case 'play':playTournament();break;
   case 'new':apbcDraft();break;
   case 'home':home();break;
  }
 });
 function setupAPBC(){
  matchContext='apbc';const countries=NightTeams.international;
  if(!countries.some(c=>c.id===settings.apbcTeam))settings.apbcTeam=countries[0].id;
  if(!countries.some(c=>c.id===settings.apbcOpponent)||settings.apbcOpponent===settings.apbcTeam)settings.apbcOpponent=countries.find(c=>c.id!==settings.apbcTeam).id;
  const own=NightTeams.get(settings.apbcTeam),opp=NightTeams.get(settings.apbcOpponent),selected=apbcPickSide==='own'?own:opp;
  modal(`${modalTitle('','APBC 2026')}<div class="apbc-event-strip"><b>4代表対戦</b><span>東京ドーム</span></div><div class="team-versus-picker apbc-versus"><button data-apbc-side="own" class="${apbcPickSide==='own'?'selected':''}"><small>自チーム</small>${clubBadge(own.id)}<b>${own.short}</b></button><span>VS</span><button data-apbc-side="opponent" class="${apbcPickSide==='opponent'?'selected':''}"><small>相手チーム</small>${clubBadge(opp.id)}<b>${opp.short}</b></button></div><div class="team-select-grid apbc-national-grid">${countries.map(c=>`<button data-apbc-club="${c.id}" class="${selected.id===c.id?'selected':''}" aria-pressed="${selected.id===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div><div class="apbc-options"><div><label>先攻・後攻</label><div class="segmented">${[[false,'先攻'],[true,'後攻']].map(([home,label])=>`<button data-apbc-home="${home}" class="${settings.apbcUserHome===home?'active':''}" aria-pressed="${settings.apbcUserHome===home}">${label}</button>`).join('')}</div></div><div><label>イニング</label><div class="segmented">${[3,5,9].map(n=>`<button data-apbc-innings="${n}" class="${settings.apbcInnings===n?'active':''}" aria-pressed="${settings.apbcInnings===n}">${n}回</button>`).join('')}</div></div></div>${lightingField()}<button class="primary-button" data-action="apbc-lineup">オーダー編成へ</button><button class="secondary-button" data-action="apbc-roster">代表選手・能力</button><details class="apbc-data-note"><summary>収録メンバーについて</summary>${countries.map(c=>`<p><b>${c.short}</b> ${c.rosterStatus}<br>${c.rosterSources.map((url,i)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">出典${i+1} ↗</a>`).join(' ')}</p>`).join('')}<p>2026年の個人成績を同じ計算式で換算。守備・肩、未計測の球速・球種はゲーム用推定を含みます。</p></details>`,'apbc');
 }
 function startAPBC(){
  const {club,config}=lineupConfig('apbc'),opponent=NightTeams.get(settings.apbcOpponent),userHome=settings.apbcUserHome!==false;
  clearCheckpoint();closeModal(false);unlockAudio();saved=false;lastMode='apbc';matchContext='apbc';$('distance').textContent='';$('timing-result').textContent='';
  game=new NightGame('match',settings.difficulty,onEvent,{competition:'apbc2026',homeTeamId:userHome?club.id:opponent.id,awayTeamId:userHome?opponent.id:club.id,userHome,innings:settings.apbcInnings,park:'tokyo-dome',order:config.order,fielding:config.fielding,pitcher:config.pitcher,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,defenseSpeed:settings.defenseSpeed,battingAssist:settings.battingAssist});activateGame();updateStyle();updateUI();
 }
 const pitchRole=p=>({SP:'先発',RP:'中継ぎ',CP:'抑え'}[p.role]||'先発');
 const positionOptions=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
 function lineupConfig(kind){
  if(kind==='apbc-cup'){
   const club=Tournament.club(tournament.team,tournament.roster);
   const config=tournament.lineup ||= {order:club.startingOrder.slice(),pitcher:0,fielding:{...club.startingFielding}};
   const players=NightGame.arrangeLineup(club,config.order,config.fielding);
   config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));
   if(!club.pitchers[config.pitcher])config.pitcher=0;return {club,config,players};
  }
  const club=kind==='league'?league.club:NightTeams.get(kind==='apbc'?settings.apbcTeam:settings.matchTeam);
  if(kind==='apbc'){settings.apbcLineups ||= {};if(!settings.apbcLineups[club.id])settings.apbcLineups[club.id]={order:club.startingOrder.slice(),pitcher:0,fielding:{...(club.startingFielding||{})}};const config=settings.apbcLineups[club.id],players=NightGame.arrangeLineup(club,config.order,config.fielding);config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));if(!club.pitchers[config.pitcher])config.pitcher=0;return {club,config,players};}
  if(kind!=='league'&&!settings.matchLineups[club.id])settings.matchLineups[club.id]={order:club.id==='owls'?settings.order.slice():(club.startingOrder||club.batters.slice(0,9).map(p=>p.id)),pitcher:club.id==='owls'?settings.pitcher:0};
  const config=kind==='league'?league:settings.matchLineups[club.id],players=NightGame.arrangeLineup(club,config.order,config.fielding);
  config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));
  if(!Number.isInteger(config.pitcher)||!club.pitchers[config.pitcher])config.pitcher=0;
  return {club,config,players};
 }
 function saveLineup(kind){if(kind==='league')saveLeague();else if(kind==='apbc-cup')saveTournament();else if(kind==='apbc')save();else{const {club,config}=lineupConfig('match');if(club.id==='owls'){settings.order=config.order.slice();settings.pitcher=config.pitcher;}save();}}
 let editorSelection=null,editorDetail=null;
 function fittedName(name,tag='span',className='squad-name'){
  const units=Array.from(name).reduce((sum,ch)=>sum+(/[MW@%]/u.test(ch)?1.08:/[\u0000-\u007f]/u.test(ch)?.83:1),.28);
  return `<${tag} class="${className} fit-player-name"><span style="--player-name-units:${units}">${name}</span></${tag}>`;
 }

 function playerTile(p,{club,slot=null,pos=p.fieldPos||p.pos,selected=false,attrs='',disabled=false}={}){
  const grade=NightPlayers.grade(NightSquad.overall(p));
  return `<button class="squad-player tone-${NightSquad.tone(pos)} ${selected?'chosen':''}" ${attrs} ${disabled?'disabled':''} ${selected?'aria-pressed="true"':'aria-pressed="false"'} aria-label="${slot!=null?slot+1+'番 ':''}${p.name} ${NightSquad.label(pos)} 総合${grade}" title="総合ランク ${grade}"><span class="squad-rank grade-${grade}">${grade}</span>${fittedName(p.name)}${slot==null?`<small class="squad-number">#${p.no}</small>`:''}</button>`;
 }
 function editorPick(id){
  const {club,config}=lineupConfig(lineupContext),scroll=$('modal-content').scrollTop;
  editorDetail=id;
  if(!editorSelection){editorSelection=id;lineupModal(lineupContext,id,scroll);return;}
  if(editorSelection===id)editorSelection=null;
  else if(NightSquad.swap(club,config,editorSelection,id)){editorSelection=null;saveLineup(lineupContext);sound('tap');}
  else {editorSelection=id;toast('入れ替えるスタメンを選んでください');}
  lineupModal(lineupContext,id,scroll);
 }
 function lineupModal(kind='match',selectedId=null,scroll=0){
  const listScroll=modalKind==='lineup'?[...$('modal-content').querySelectorAll('.squad-list')].map(e=>e.scrollTop):[];
  if(modalKind!=='lineup'||lineupContext!==kind){editorSelection=null;editorDetail=null;}
  lineupContext=kind;const {club,config,players}=lineupConfig(kind),starter=club.pitchers[config.pitcher],bench=club.batters.filter(p=>!config.order.includes(p.id));
  const selected=club.batters.find(p=>p.id===(selectedId||editorDetail||editorSelection))||players[0];editorDetail=selected.id;
  const rows=players.map((p,i)=>`<div class="squad-starter-row"><b class="squad-slot">${i+1}</b>${playerTile(p,{club,slot:i,selected:editorSelection===p.id,attrs:`data-editor-player="${p.id}" draggable="true"`})}<select class="squad-position tone-${NightSquad.tone(p.fieldPos)}" data-editor-position="${p.id}" aria-label="${p.name}の守備位置">${positionOptions.map(pos=>`<option value="${pos}" ${pos===p.fieldPos?'selected':''}>${NightSquad.label(pos)}</option>`).join('')}</select></div>`).join('');
  modal(`${modalTitle('',kind.startsWith('apbc')?'APBC オーダー編成':'オーダー編成')}<div class="editor-toolbar">${kind==='edit'?`<select id="editor-club" class="field-select" aria-label="編成する球団">${NightTeams.matchTeams.map(c=>`<option value="${c.id}" ${c.id===club.id?'selected':''}>${c.short}</option>`).join('')}</select>`:`<span class="editor-club">${clubBadge(club.id,true)}<b>${club.short}</b></span>`}<button class="arcade-go" data-action="${kind==='edit'?'editor-done':'lineup-play'}">${kind==='edit'?'決定':'試合開始'}</button></div>${kind==='apbc'?`<p class="apbc-roster-status">${club.rosterStatus}</p>`:''}<p class="editor-hint" role="status">${editorSelection?'入れ替える相手をタップ':'選手を2人タップして交換'}</p><div class="squad-board"><section class="squad-column"><h3>スタメン</h3><div class="squad-list">${rows}</div></section><section class="squad-column reserves"><h3>控え <small>${bench.length}人</small></h3><div class="squad-list">${bench.map(p=>playerTile(p,{club,selected:editorSelection===p.id,attrs:`data-editor-player="${p.id}" draggable="true"`})).join('')}</div></section></div><section class="editor-preview"><div>${fittedName(selected.name,'strong','editor-selected-name')}<small>#${selected.no} 本職 ${NightSquad.label(selected.pos)} / ${selected.hand==='L'?'左':'右'}打</small></div><span class="rating-tiles">${batRatings(selected)}</span></section><div class="editor-actions"><button data-editor-auto>おまかせ</button><button data-editor-reset>リセット</button></div><details class="editor-pitchers"><summary>先発投手 ${fittedName(starter.name,'b','editor-starter-name')}<span>${starter.velocity}km/h　▼</span></summary><div class="editor-pitcher-grid">${club.pitchers.map((p,i)=>`<button class="squad-player tone-pitcher ${config.pitcher===i?'chosen':''}" data-lineup-pitcher="${i}" aria-pressed="${config.pitcher===i}">${fittedName(p.name)}<small>${p.velocity}km/h · ${pitchRole(p)}${p.pitchingEstimated?' · 推定':''}</small></button>`).join('')}</div></details><details class="editor-player-detail"><summary>${fittedName(selected.name+'の能力','span','editor-detail-name')}</summary>${abilityHTML(selected)}</details><button class="secondary-button" data-action="lineup-back">戻る</button>`,'lineup');
  $('modal-content').scrollTop=scroll;$('modal-content').querySelectorAll('.squad-list').forEach((e,i)=>e.scrollTop=listScroll[i]||0);
 }
 let benchTab='hit',runnerBase=0,queuedBench=false;
 function requestBench(){if(!game?.isFixture||game.phase==='ended')return;if(game.substitutionWindow&&!(game.defending&&game.phase==='windup')){queuedBench=false;benchModal();}else{queuedBench=true;closeModal(false);game.paused=false;toast('このプレー後にベンチを開きます');updateUI();}}
 function benchModal(tab=game?.defending?'pitch':'hit'){
  if(!game?.isFixture)return;game.paused=true;benchTab=tab;
  const g=game,side=g.userSide,club=g.teams[side],bench=g.bench(),current=club.pitchers[g.homePitcherIndex],record=g.pitcherRecord(current),can=g.substitutionWindow;
  if(!g.bases[runnerBase])runnerBase=Math.max(0,g.bases.findIndex(Boolean));
  let body='';
  if(tab==='hit'||tab==='run'){
   const rows=g.lineups[side].map((p,i)=>{const base=g.baseIds.indexOf(p.id),target=tab==='run'?base===runnerBase&&base>=0:i===g.battingSlot,allowed=tab==='run'?base>=0&&!g.defending:target&&!g.defending;return `<div class="squad-starter-row"><b class="squad-slot">${i+1}</b>${playerTile(p,{club,slot:i,selected:target,disabled:!allowed,attrs:tab==='run'?`data-runner-base="${base}"`:''})}<span class="squad-position tone-${NightSquad.tone(p.fieldPos)}">${tab==='run'&&base>=0?(base+1)+'塁':NightSquad.label(p.fieldPos)}</span></div>`;}).join('');
   body=`<p class="editor-hint">${g.defending?'攻撃時に起用できます':tab==='run'?'走者を選び、控えをタップ':'控えをタップして代打に起用'}</p><div class="squad-board"><section class="squad-column"><h3>${tab==='run'?'走者を選択':'スタメン'}</h3><div class="squad-list">${rows}</div></section><section class="squad-column reserves"><h3>控え</h3><div class="squad-list">${bench.map(p=>playerTile(p,{club,attrs:`data-bench-player="${p.id}" data-sub-kind="${tab==='run'?'run':'hit'}"`,disabled:tab==='run'?!g.canPinchRun(runnerBase):!g.canPinchHit()})).join('')||'<p>控えなし</p>'}</div></section></div>`;
  }else if(tab==='pitch'){
   body=`<section class="editor-preview pitcher-preview"><div><strong>${current.name}</strong><small>登板中 · ${record.pitches}球 / ${Math.floor(record.outs/3)}.${record.outs%3}回</small></div><div class="bench-stamina"><i style="width:${g.stamina}%"></i></div><small>スタミナ ${Math.round(g.stamina)}%</small></section><h3 class="arcade-section-title">控え投手</h3><div class="editor-pitcher-grid">${club.pitchers.map((p,i)=>`<button class="squad-player tone-pitcher ${i===g.homePitcherIndex?'chosen':''}" data-bench-pitch="${i}" ${g.usedPitchers.includes(i)||!g.canChangePitcher()?'disabled':''}>${fittedName(p.name)}<small>${g.usedPitchers.includes(i)?i===g.homePitcherIndex?'登板中':'登板済':`${p.velocity}km/h · ${pitchRole(p)}${p.pitchingEstimated?' · 推定':''}`}</small></button>`).join('')}</div>`;
  }else body=`<p class="editor-hint">守備位置を選んで交換</p>${g.lineups[side].map((p,i)=>`<div class="squad-defense-row"><b class="squad-slot">${i+1}</b>${playerTile(p,{club,disabled:true})}<select class="squad-position tone-${NightSquad.tone(p.fieldPos)}" data-bench-position="${p.id}" aria-label="${p.name}の守備位置" ${!can?'disabled':''}>${positionOptions.map(pos=>`<option value="${pos}" ${pos===p.fieldPos?'selected':''}>${NightSquad.label(pos)}</option>`).join('')}</select></div>`).join('')}`;
  modal(`${modalTitle('','選手交代')}<div class="bench-tabs">${[['hit','代打'],['run','代走'],['pitch','投手'],['defense','守備']].map(([id,label])=>`<button data-bench-tab="${id}" class="${tab===id?'selected':''}">${label}</button>`).join('')}</div>${!can?'<p class="bench-window-note">投球前に交代できます</p>':''}${body}<p class="bench-window-note">交代した選手は再出場できません</p>${g.substitutions.length?`<details class="substitution-log"><summary>交代履歴</summary>${g.substitutions.map(x=>`<p>${x.outName} → ${x.inName}</p>`).join('')}</details>`:''}<button class="primary-button" data-action="close">試合に戻る</button>`,'bench');
 }
 function lightingField(){
  return `<div class="setup-section"><label for="game-lighting">試合の時間帯</label><select id="game-lighting" class="field-select">${GAME_LIGHTING_OPTIONS.map(([mode,label])=>`<option value="${mode}" ${settings.gameLighting===mode?'selected':''}>${label}</option>`).join('')}</select></div>`;
 }
 function parkOptions(selected){
  const option=p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.name}${p.school?' · 両翼 '+p.corner+' m':''}</option>`;
  const groups=[
   ['台湾',p=>!p.school&&!p.league&&!['toyama','tokyo-dome'].includes(p.id)],
   ['日本',p=>p.league==='npb'||['tokyo-dome','toyama'].includes(p.id)],
   ['韓国',p=>p.league==='kbo'],
   ['高校野球・小型球場',p=>p.school]
  ];
  return groups.map(([label,filter])=>`<optgroup label="${label}">${NightPlayers.parks.filter(filter).map(option).join('')}</optgroup>`).join('');
 }
 function parkDimensions(park){
  const dimensions=[['左翼',park.left],['左中間',park.leftCenter],['中堅',park.center],['右中間',park.rightCenter],['右翼',park.right]];
  return `<dl class="park-dimensions">${dimensions.map(([label,d],i)=>`<div><dt>${label}</dt><dd>${!park.alleysVerified&&i%2?'約':''}${Number(d.toFixed(1))}<small>m</small></dd></div>`).join('')}</dl>`;
 }
 const arcadeClubs=NightTeams.playable.map(c=>c.id.startsWith('apbc-')?Tournament.club(c.id):c);
 function alumniClub(){
  const batters=alumni.filter(p=>!p.pitching&&!p.fanOnly).map(p=>({...p.player,id:'ob-'+p.id}));
  if(!batters.length)return null;
  return {...NightTeams.all[0],id:'career-alumni',name:'キャリアOB',short:'キャリアOB',batters:[...batters,...NightTeams.all[0].batters],alumni:batters};
 }
 function arcadeClub(id){return (id==='career-alumni'?alumniClub():arcadeClubs.find(c=>c.id===id))||arcadeClubs[0];}
 function trainingOpponent(id){return NightTeams.get(id==='foxes'?'falcons':'foxes');}
 function arcadeClubOptions(selected){
  const options=clubs=>clubs.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${c.name}</option>`).join('');
  return `<optgroup label="CPBL">${options(arcadeClubs.filter(c=>!c.id.startsWith('apbc-')&&!c.id.startsWith('npb-')&&!c.id.startsWith('kbo-')))}</optgroup>
   <optgroup label="NPB 2026・ファーム含む14球団">${options(arcadeClubs.filter(c=>c.id.startsWith('npb-')))}</optgroup>
   <optgroup label="KBO 2026・10球団">${options(arcadeClubs.filter(c=>c.id.startsWith('kbo-')))}</optgroup>
   <optgroup label="APBC 2026">${options(arcadeClubs.filter(c=>c.id.startsWith('apbc-')))}</optgroup>`;
 }
 function setupDerby(){
  const club=arcadeClub(settings.derbyClub),batter=(club.alumni||club.batters).find(p=>p.id===settings.derbyBatter)||club.alumni?.[0]||club.batters[3]||club.batters[0];
  const park=NightPlayers.parks.find(p=>p.id===settings.derbyPark)||NightPlayers.parks.find(p=>p.id==='tokyo-dome');
  settings.derbyClub=club.id;settings.derbyBatter=batter.id;settings.derbyPark=park.id;
  modal(`${modalTitle('','ホームランダービー')}<div class="derby-setup-summary"><div><strong>8人トーナメント</strong><small>2分間・球数無制限</small></div><button class="arcade-go" data-action="start-derby">開始</button></div>
   <div class="setup-section"><label for="derby-park">球場</label><select id="derby-park" class="field-select">${parkOptions(park.id)}</select><div id="derby-dimensions">${parkDimensions(park)}</div></div>
   ${lightingField()}
   <div class="setup-section"><label for="derby-club">打者の所属</label><select id="derby-club" class="field-select">${arcadeClubOptions(club.id)}${alumniClub()?`<option value="career-alumni" ${club.id==='career-alumni'?'selected':''}>キャリアOB</option>`:''}</select></div>
   <div class="player-select-grid">${(club.alumni||club.batters).map(p=>playerTile(p,{club,selected:p.id===batter.id,attrs:`data-derby-batter="${p.id}"`})).join('')}</div>
   <details class="editor-player-detail"><summary>ルール</summary><p>同数は1分延長。延長も同数ならゲーム内のシード順で決定。決勝が延長後も0本同士なら引き分け。</p></details>`,'derby-setup');
 }
 function derbyScoreText(m,i){
  const normal=m.normal[i],extra=m.extra[i];
  return normal==null?'—':extra==null?String(normal):`${normal} + ${extra}`;
 }
 function derbyBracket(g){
  const d=g.derby;
  return `<div class="derby-bracket">${d.rounds.map((round,i)=>`<section><h3>${['準々決勝','準決勝','決勝'][i]}</h3>${round.length?round.map(m=>`<div class="derby-pair ${m===d.matchup?'current':''}">${m.entrants.map((p,j)=>`<div class="${p===m.winner?'winner':''}">${clubBadge(p.club.id)}<span>${p.player.name}${p.user?'<small>あなた</small>':''}</span><b>${derbyScoreText(m,j)}</b></div>`).join('')}${m.reason?`<small class="derby-decision">${m.reason}</small>`:''}</div>`).join(''):'<p>対戦未定</p>'}</section>`).join('')}</div>`;
 }
 function derbyTurnResult(g){
  const d=g.derby,action=g.derbyTransition,finished=action==='finish';
  if(finished){commit(g);g.setPhase('ended');}
  const title=finished?d.champion?.user?'優勝':d.champion?`${d.champion.player.name}が優勝`:'決勝引き分け':action==='extra'?'同点・延長戦':`${d.label} 突破`;
  const match=d.matchup,index=d.userIndex;
  modal(`${modalTitle('',title,false)}
   <div class="derby-result-summary"><strong>${g.batter.name}</strong><div><b>${derbyScoreText(match,index)}</b><span>–</span><b>${derbyScoreText(match,1-index)}</b></div><strong>${d.opponent.player.name}</strong></div>
   ${finished?`<div class="derby-record"><span>大会通算 <b>${g.session.hr} 本</b></span><span>最長 <b>${g.session.maxDistance||'—'} m</b></span></div>`:''}
   <button class="primary-button" data-action="${finished?'restart':'derby-next'}">${finished?'もう一度':action==='extra'?'1分間の延長へ':'次のラウンドへ'}</button>
   ${derbyBracket(g)}${finished?'<button class="secondary-button" data-action="home">ホームへ戻る</button>':''}`,'derby-result');
 }
 function updateDerbyClock(g){
  const clock=$('derby-clock');if(!clock)return;
  const seconds=Math.ceil(g.derby.remaining/1000),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if(clock.textContent!==time){clock.textContent=time;clock.classList.toggle('low',seconds<=15);}
 }


 function matchTeamsHTML(){
  const own=NightTeams.get(settings.matchTeam),opponent=NightTeams.get(settings.matchOpponent);
  return `<div class="match-club-preview"><div>${clubBadge(own.id)}<b>${own.name}</b><small>あなた / ${settings.matchUserHome?'後攻':'先攻'}</small></div><span>VS</span><div>${clubBadge(opponent.id)}<b>${opponent.name}</b><small>対戦相手 / ${settings.matchUserHome?'先攻':'後攻'}</small></div></div>`;
 }
 function setupMatchTeams(){
  matchContext='match';
  const home=NightTeams.get(settings.matchTeam),away=NightTeams.get(settings.matchOpponent),current=matchPickSide==='home'?home:away;
  modal(`${modalTitle('','球団選択')}<div class="team-versus-picker"><button data-match-side="home" class="${matchPickSide==='home'?'selected':''}"><small>自チーム</small>${clubBadge(home.id)}<b>${home.short}</b></button><span>VS</span><button data-match-side="away" class="${matchPickSide==='away'?'selected':''}"><small>相手チーム</small>${clubBadge(away.id)}<b>${away.short}</b></button></div><div class="segmented npb-league-tabs" role="group" aria-label="球団のリーグ"><button data-match-group="cpbl" class="${matchClubGroup==='cpbl'?'active':''}" aria-pressed="${matchClubGroup==='cpbl'}">CPBL・6球団</button><button data-match-group="npb" class="${matchClubGroup==='npb'?'active':''}" aria-pressed="${matchClubGroup==='npb'}">NPB・14球団</button><button data-match-group="kbo" class="${matchClubGroup==='kbo'?'active':''}" aria-pressed="${matchClubGroup==='kbo'}">KBO・10球団</button></div>${matchClubGroup==='npb'?'<p class="modal-note">2026年公式成績から個別査定。ファーム2球団も選択可能。球速・球種などはゲーム用推定です。</p>':matchClubGroup==='kbo'?'<p class="modal-note">KBO 2026年公式成績から30選手ずつ査定。球速・球種に加え、未確認の投打・守備位置・背番号はゲーム用推定または未設定です。</p>':''}<div class="team-select-grid">${(matchClubGroup==='npb'?NightTeams.npb:matchClubGroup==='kbo'?NightTeams.kbo:NightTeams.all).map(c=>`<button data-match-club="${c.id}" class="${current.id===c.id?'selected':''}" aria-pressed="${current.id===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div><button class="primary-button" data-action="match-team-next">試合設定へ</button>`,'match-teams');
 }
 function setupMatch(){
  const pending=!$('resume-game').hidden,{club,config}=lineupConfig('match');
  modal(`${modalTitle('','試合設定')}${matchTeamsHTML()}<button class="league-inline-button" data-action="match-teams">チームを変更</button><div class="setup-section"><label>先攻・後攻</label><div class="segmented">${[[false,'先攻','打撃から'],[true,'後攻','守備から']].map(([home,label,sub])=>`<button data-match-home="${home}" class="${settings.matchUserHome===home?'active':''}" aria-pressed="${settings.matchUserHome===home}">${label}<small>${sub}</small></button>`).join('')}</div></div><div class="setup-section"><label>試合の長さ</label><div class="segmented">${[3,5].map(n=>`<button data-innings="${n}" class="${settings.innings===n?'active':''}">${n}イニング<small>${n===5?'通常':'短め'}</small></button>`).join('')}</div></div><div class="setup-section"><label for="park-select">球場</label><select id="park-select" class="field-select">${parkOptions(settings.park)}</select><div id="match-park-dimensions">${parkDimensions(NightPlayers.parks.find(p=>p.id===settings.park)||NightPlayers.parks[0])}</div></div>${lightingField()}<div class="setup-section"><label for="starter-select">先発投手</label><select id="starter-select" class="field-select">${club.pitchers.map((p,i)=>`<option value="${i}" ${config.pitcher===i?'selected':''}>${p.name} · ${p.velocity}km/h · ${p.trait}</option>`).join('')}</select></div><p class="modal-note">${settings.matchUserHome?'後攻':'先攻'} / 同点は引き分け。走塁は設定で切替。${pending?'<br>開始すると、中断中の試合を置き換えます。':''}</p><button class="primary-button" data-action="match-lineup">オーダー編成へ</button><button class="secondary-button" data-action="roster">選手の能力を見る</button>`,'setup');
 }
 const descriptions={韋駄天:'一塁への到達が速く、外野も広く守る俊足型。',巧打:'大きいミートカーソルでヒットを重ねる巧打型。',勝負強い:'二・三塁に走者がいるとミート範囲と打球の強さが上昇。',長距離砲:'高いパワーに加え、強振時に打ち出し角が上がる長打型。',強肩:'外野からの送球が速く、進塁を防ぐ。',強打:'強い打球を打つ中軸タイプ。',俊足巧打:'ミートと走力を両立し、打線をつなぐ。',守備職人:'広い捕球範囲と素早い打球反応でアウトを取る。',チャンスメーカー:'高いミートと走力で上位打線を支える。',本格派:'速球と変化球を組み合わせ、長いイニングを投げる。',精密制球:'四球の少なさが制球力に反映され、狙いを定めやすい。',速球派:'計測された速球の平均球速が高く、直球で押せる。',技巧派:'制球と変化球で打者の芯を外す。',変化球派:'変化球と緩急を組み合わせて打者を抑える。',奪三振型:'奪三振率と長打の抑制が球威に反映される。',緩急派:'速球と大きな速差の変化球でタイミングを外す。',先発型:'登板数と投球回に応じた持久力で試合を作る。',バランス:'各能力を本人の実成績から換算した選手。'};
 const rankTile=(label,n)=>`<span class="rank-tile grade-${NightPlayers.grade(n)}"><small>${label}</small><b>${NightPlayers.grade(n)}</b><em>${n}</em></span>`;
 const batRatings=p=>[['ミート',p.contact],['パワー',p.power],['走力',p.run],['守備',p.field],['肩',p.arm]].map(([l,n])=>rankTile(l,n)).join('');
 function apbcRatingEvidenceHTML(p){
  const s=p.stats||{},thrower=p.pos==='P',fmt=(v,d=0)=>Number.isFinite(v)?Number(v).toFixed(d):'—',v=p.velocityEvidence||{};
  const facts=thrower?[['防御率',fmt(s.era,2)],['投球回',s.ipText||'—'],['奪三振',fmt(s.k)],['K/9',fmt(s.k9,2)],['BB/9',fmt(s.bb9,2)],['WHIP',fmt(s.whip,2)]]:[['打率',fmt(s.avg,3).replace(/^0/,'')],['本塁打',fmt(s.hr)],['盗塁',fmt(s.sb)],['打席',fmt(s.pa)],['三振率',Number.isFinite(s.so)&&s.pa?fmt(s.so/s.pa*100,1)+'%':'—'],['OPS',fmt(s.ops,3)]];
  const small=thrower?s.ip<20:s.pa<100,period=Array.isArray(p.statsPeriod)?`${p.statsPeriod[0]} ～ ${p.statsPeriod[1]}`:p.statsPeriod||p.statsAsOf||'2026シーズン成績';
  return `<section class="rating-evidence"><div class="rating-evidence-heading"><b>${p.ratingsProvisional?'ゲーム用暫定査定':'成績に基づく査定'}</b><span>${p.season} / ${p.statsLevel}</span></div><p class="apbc-stat-label"><span>${p.club}</span>${p.nativeName&&p.nativeName!==p.name?`<span>${p.nativeName}</span>`:''}</p><div class="source-stats">${facts.map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><p class="estimate-note">${thrower?'変化量・未計測の球速・未確認の球種は推定':'守備・肩は守備位置をもとに推定。走力は走塁成績の指標です。'}</p>${thrower?`<p class="speed-evidence">${p.speedEstimated?'速球（推定）':'速球の公開値'} <b>${fmt(v.fastAvg||p.velocity,1)} km/h</b>${v.fastMax?` / 最高 ${fmt(v.fastMax,1)}`:''}<small>${v.speedBasis||'ゲーム用推定'}${v.fastSamples?`・${v.fastSamples}球`:''}</small></p>`:''}${small?'<p class="sample-note">出場数が少ないため、平均で補正した査定です。</p>':''}${p.numberBasis?`<p class="sample-note">背番号：${p.numberBasis}</p>`:''}<details class="rating-basis"><summary>査定の根拠・出典</summary><p>${thrower?'制球は四球率、体力は投球回と登板数、球威・変化は奪三振率・被本塁打率・防御率から換算。':'ミートは打率と三振率、パワーは純長打率と本塁打率、走力は盗塁・三塁打から換算。'}既存の台湾選手と同じ式・比較母集団を使い、国別の強さ補正は加えていません。所属リーグ・一軍／二軍の違いにもご留意ください。</p><p>${period}${p.placementNote?'<br>'+p.placementNote:''}${p.statsNotes?.length?'<br>'+p.statsNotes.join('<br>'):''}</p><div class="evidence-links"><a href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer">元の個人成績 ↗</a>${p.identityUrl?`<a href="${p.identityUrl}" target="_blank" rel="noopener noreferrer">選手資料 ↗</a>`:''}${v.speedSource||v.trackingUrl?`<a href="${v.speedSource||v.trackingUrl}" target="_blank" rel="noopener noreferrer">球速資料 ↗</a>`:''}${v.repertoireSource?`<a href="${v.repertoireSource}" target="_blank" rel="noopener noreferrer">球種資料 ↗</a>`:''}</div><small>確認：${p.retrieved}。本ゲーム独自の査定値です。</small></details></section>`;
 }
 function ratingEvidenceHTML(p){
  if(p.competition==='apbc2026')return apbcRatingEvidenceHTML(p);
  const s=p.stats,thrower=p.pos==='P';if(!s)return '';
  const fixed=(n,d=3)=>Number(n).toFixed(d),aver=n=>fixed(n).replace(/^0/,''),v=p.velocityEvidence||{};
  const facts=thrower?[['防御率',fixed(s.era,2)],['投球回',s.ipText],['奪三振',s.k],['K/9',fixed(s.k9,2)],['BB/9',fixed(s.bb9,2)],['WHIP',fixed(s.whip,2)]]:[['打率',aver(s.avg)],['本塁打',s.hr],['盗塁',s.sb],['打席',s.pa],['三振率',fixed(s.so/Math.max(1,s.pa)*100,1)+'%'],['OPS',fixed(s.ops,3)]];
  const small=thrower?s.ip<20:s.pa<100;
  return `<section class="rating-evidence"><div class="rating-evidence-heading"><b>実績から能力を換算</b><span>2026 / 3.28 − 10.06</span></div><div class="source-stats">${facts.map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><p class="estimate-note">${thrower?'変化量・未計測の球種別球速は推定':'守備・肩は守備位置と受賞実績からの推定'}</p>${thrower?`<p class="speed-evidence">${p.speedEstimated?'設定球速（推定）':'速球平均'} <b>${fixed(v.fastAvg||p.velocity,1)} km/h</b>${v.fastMax?` / 最高 ${fixed(v.fastMax,1)}`:''}<small>${v.speedBasis||'ゲーム用の推定値'}${v.fastSamples?`・${v.fastSamples}球`:''}</small></p>`:''}${small?'<p class="sample-note">出場数が少ないため、リーグ平均で補正しています。</p>':''}<details class="rating-basis"><summary>能力の根拠・出典</summary><p>${thrower?'制球はBB/9、体力は登板数と投球回、球威・変化はK/9・被本塁打・防御率をもとに換算。持ち球は確認できた報道・資料を参照し、資料がない追加選手の球種はゲーム用に推定しています。個々の変化量と未計測の球種別球速も推定です。':'ミートは打率と三振率、パワーは純長打率と本塁打率、走力は盗塁企図率・三塁打などから換算。少数サンプルは平均へ補正しています。守備・肩は本職の守備位置と確認できた金手套賞などをもとにした推定です。'}${p.defenseEvidence?.winner?'<br>2026年金手套賞を守備評価に反映。':''}</p><div class="evidence-links"><a href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer">Live成績 ↗</a>${thrower?`${v.speedSource||v.trackingUrl?`<a href="${v.speedSource||v.trackingUrl}" target="_blank" rel="noopener noreferrer">球速・選手資料 ↗</a>`:''}${v.repertoireSource?`<a href="${v.repertoireSource}" target="_blank" rel="noopener noreferrer">持ち球の資料 ↗</a>`:''}`:p.defenseSource?`<a href="${p.defenseSource}" target="_blank" rel="noopener noreferrer">守備評価の資料 ↗</a>`:''}</div><small>取得：2026/11/4　能力は本ゲーム独自の換算値です。</small></details></section>`;
 }
 function matchupEvidenceHTML(p){
  const e=p.matchupEvidence,positions=p.positionEvidence?.appearances,thrower=p.pos==='P';
  const split=e?.splits,fmt=n=>Number.isFinite(n)?n.toFixed(3).replace(/^0/,''):'—';
  const matchup=!thrower?split?`<section class="matchup-card"><h4>2026 投手タイプ別</h4><div class="matchup-splits">${['R','L'].map(hand=>{const a=split[hand];return `<div><b>${hand==='L'?'対左投':e.rawPitcherTypes?'対右・下手投':'対右投'}</b><strong>${fmt(a.avg)}</strong><span>${a.ab}打数 ${a.h}安打 / ${a.hr}HR</span><small>${Number.isFinite(a.slg)?'長打率 '+fmt(a.slg):'長打率未取得'}</small></div>`;}).join('')}</div><p>打率・取得済みの長打率を打撃へ反映。少数サンプルは総合成績へ補正。</p><details><summary>集計方法・出典</summary><p>${e.note}</p><a href="${e.source}" target="_blank" rel="noopener noreferrer">${e.publisher} ↗</a></details></section>`:'<p class="split-unavailable">左右別成績：未取得（総合成績を適用）</p>':'';
  const field=positions?`<section class="position-evidence"><h4>2026 守備出場</h4><div>${positions.map(a=>`<span>${({C:'捕手','1B':'一塁','2B':'二塁','3B':'三塁',SS:'遊撃',LF:'左翼',CF:'中堅',RF:'右翼',OF:'外野',DH:'指名打者'})[a.pos]||a.pos} <b>${a.games}</b>試合</span>`).join('')}</div><small>外野の「OF」は左・中・右の内訳未取得。守備・肩の能力値は推定。</small></section>`:!thrower?`<p class="position-fits">適性：${(p.positions||[p.pos]).map(pos=>({C:'捕','1B':'一','2B':'二','3B':'三',SS:'遊',LF:'左',CF:'中',RF:'右',DH:'指'})[pos]||pos).join(' / ')}${p.placementNote?'（一部配置は推定）':''}</p>`:'';
  const pitch=thrower?`<section class="repertoire-card"><h4>持ち球と設定球速</h4>${p.pitches.map(id=>{const spec=NightGame.pitchSpec(p,id),d=p.pitchDetails?.[id];return `<div><b>${spec.short}</b><strong>${Math.round(spec.speed)}<small> km/h</small></strong><span>${d?.speedBasis||'ゲーム用推定'}</span></div>`;}).join('')}<small>変化量はゲーム用の推定。球速の根拠は各球種に表示。</small></section>`:'';
  return matchup+field+pitch;
 }
 function abilityHTML(p){
  const pitching=p.pos==='P',spec=pitching?[['平均球速',Math.round((p.velocity-110)*2),p.velocity+'km'],['制球',p.control],['体力',p.stamina],['球威・変化',p.movement]]:[['ミート',p.contact],['パワー',p.power],['走力',p.run],['守備',p.field],['肩',p.arm]];
  const stats=game?.box[p.id];
  return `<div class="ability-hero"><div class="ability-header"><span class="jersey-number">${p.no}</span><div><strong>${p.name}</strong><small>${p.pos} · ${p.hand==='S'?'両':p.hand==='L'?'左':'右'}${pitching?'投':'打'}</small><span class="trait-chip">${p.trait}</span></div></div><div class="ability-bars ${pitching?'pitching-abilities':''}">${spec.map(([l,n,val])=>`<div class="ability-row"><span>${l}</span><i><i style="width:${n}%"></i></i><b class="grade-${NightPlayers.grade(n)}">${val||NightPlayers.grade(n)}${val?'':`<small>${n}</small>`}</b></div>`).join('')}</div><p class="ability-description">${descriptions[p.trait]||''}</p>${ratingEvidenceHTML(p)}${matchupEvidenceHTML(p)}${pitching?`<div class="stat-line">球種：${p.pitches.map(id=>NightGame.pitchSpec(p,id).short).join(' / ')}</div>`:stats?`<div class="stat-line">この試合：${stats.pa}打席　${stats.ab}打数 ${stats.h}安打 ${stats.hr}本塁打 ${stats.rbi}打点</div>`:''}</div>`;
 }
 function rosterModal(selectedId,team='home'){
  if(game&&screen==='game')game.paused=true;
  const active=game&&((screen==='game')||(screen==='pennant'&&game.mode==='pennant'&&game.leagueFixtureId===league?.activeFixture?.id));
  const clubs=active?game.teams:screen==='pennant'?{home:league.club,away:NightTeams.get(league.activeFixture.home===league.clubId?league.activeFixture.away:league.activeFixture.home)}:{home:NightTeams.get(matchContext==='apbc'?settings.apbcTeam:settings.matchTeam),away:NightTeams.get(matchContext==='apbc'?settings.apbcOpponent:settings.matchOpponent)},club=clubs[team];
  const lineup=active?game.lineups[team]:team==='home'?lineupConfig(screen==='pennant'?'league':matchContext==='apbc'?'apbc':'match').players:NightGame.arrangeLineup(club),retired=active?game.removedPlayers[team]:[],bench=club.batters.filter(p=>!lineup.some(b=>b.id===p.id)&&!retired.includes(p.id)),pitchers=club.pitchers;
  const selected=[...lineup,...bench,...pitchers,...club.batters.filter(p=>retired.includes(p.id))].find(p=>p.id===selectedId)||lineup[0];
  const grid=players=>`<div class="player-select-grid">${players.map(p=>playerTile(p,{club,selected:selected.id===p.id,attrs:`data-player="${p.id}" data-team="${team}"`})).join('')}</div>`;
  modal(`${modalTitle('','選手データ')}<div class="segmented"><button data-roster-team="home" class="${team==='home'?'active':''}">${clubs.home.short}</button><button data-roster-team="away" class="${team==='away'?'active':''}">${clubs.away.short}</button></div>${active&&game.isFixture&&team===game.userSide?'<button class="secondary-button" data-action="bench">選手交代へ</button>':!active&&team==='home'?'<button class="secondary-button" data-action="edit-lineup">オーダー編成</button>':''}<details class="editor-player-detail" ${selectedId?'open':''}><summary>${fittedName(selected.name+'の能力','span','editor-detail-name')}</summary>${abilityHTML(selected)}</details><h3 class="arcade-section-title">スタメン</h3>${grid(lineup)}<h3 class="arcade-section-title">控え</h3>${grid(bench)}<h3 class="arcade-section-title">投手</h3>${grid(pitchers)}${retired.length?`<details class="retired-list"><summary>交代済み</summary>${grid(club.batters.filter(p=>retired.includes(p.id)))}</details>`:''}<button class="primary-button" data-action="close">戻る</button>`,'roster');
 }
 function tacticsModal(){if(!game)return;game.paused=true;modal(`${modalTitle('GAME PLAN','守備の作戦')}<p>次に打球が飛んだときの野手の初期位置を変えます。</p><div class="segmented">${[['normal','通常','バランス'],['in','前進守備','浅い打球に対応'],['deep','長打警戒','外野を深く']].map(([v,l,d])=>`<button data-defense="${v}" class="${game.defense===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><p class="modal-note">前進守備は頭上を越える打球、長打警戒は浅いヒットに弱くなります。</p><button class="primary-button" data-action="close">プレイに戻る</button>`,'tactics');}
 function historyModal(){
  if(!game)return;game.paused=true;const pitches=game.pitchTrace.filter(p=>p.half===game.half&&p.inning===game.inning).slice(-6);
  const map=`<svg class="pitch-map" viewBox="0 0 210 180" aria-label="直近の投球位置"><rect x="45" y="30" width="120" height="120" rx="3" fill="#304a2b" stroke="#b8cc9a66"/><path d="M85 30v120m40-120v120M45 70h120M45 110h120" stroke="#b8cc9a22"/>${pitches.map((p,i)=>`<circle cx="${105+p.x*60}" cy="${90+p.y*60}" r="9" fill="${i===pitches.length-1?'#d5f36a':'#8a9c72'}"/><text x="${105+p.x*60}" y="${93+p.y*60}" fill="#182b15" text-anchor="middle" font-size="9" font-weight="bold">${i+1}</text>`).join('')}</svg>`;
  modal(`${modalTitle('GAME LOG','投球・試合の履歴')}${map}<p class="modal-note">同じイニングの直近6球。明るい色が最新です。</p>${game.log.slice(-20).reverse().map(l=>`<div class="history-item"><small>${l.inning}回${l.half==='top'?'表':'裏'} · ${l.batter}</small><b>${l.ja}</b><span> ${l.sub}</span></div>`).join('')}<button class="secondary-button" data-action="box-score">打撃成績を見る</button><button class="primary-button" data-action="close">戻る</button>`,'history');
 }
 function boxModal(side=game?.userSide||'home'){
  if(!game)return;game.paused=true;const report=buildMatchReport(game);
  modal(`${modalTitle('BOX SCORE','この試合の個人成績')}${resultReportHTML(report)}<div class="segmented box-side-tabs">${['away','home'].map(k=>`<button data-box-side="${k}" class="${side===k?'active':''}">${game.teams[k].short}</button>`).join('')}</div>${playerBoxHTML(report,side)}<button class="primary-button" data-action="close">戻る</button>`,'box');
 }
 let trainingSelection=null;
 function setupTraining(mode){
  const pitching=mode==='pitching';
  const club=arcadeClub(settings[pitching?'pitchingClub':'practiceClub']);
  trainingSelection={mode,club:club.id,player:pitching?settings.pitchingPlayer||club.pitchers[settings.pitcher]?.id:settings.practiceBatter};
  trainingModal();
 }
 function trainingModal(){
  const pick=trainingSelection,pitching=pick.mode==='pitching',club=arcadeClub(pick.club);
  const players=pitching?club.pitchers:club.batters;
  pick.player=(players.find(p=>p.id===pick.player)||players[0]).id;
  const inGame=screen==='game';
  modal(`${modalTitle('',pitching?'投球練習':'打撃練習')}
   <div class="setup-section"><label for="training-club">${pitching?'投手':'打者'}の所属</label>
   <select class="field-select" id="training-club">${arcadeClubOptions(club.id)}</select></div>
   <div class="setup-section"><label for="training-player">${pitching?'投手':'打者'}</label>
   <select class="field-select" id="training-player">${players.map(p=>`<option value="${p.id}" ${p.id===pick.player?'selected':''}>${p.name} · ${pitching?p.velocity+' km/h':p.trait}</option>`).join('')}</select></div>
   ${pitching?'':`<div class="setup-section"><label for="practice-pitch">相手が投げる球種</label><select id="practice-pitch" class="field-select">
    <option value="random">ランダム配球</option>${NightGame.TYPES.map(p=>`<option value="${p.id}" ${(pick.pitch??settings.practicePitch)===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>`}
   ${inGame?'<p class="modal-note">選手を変更すると、現在の球をやり直します。</p>':''}
   <button class="primary-button" data-action="apply-practice">${inGame?'設定して練習を再開':'練習を開始'}</button>
   ${!pitching&&!inGame?'<button class="secondary-button running-demo-button" data-action="running-demo">右中間の二塁打を見る</button><button class="secondary-button" data-action="field-challenges">状況別チャレンジ</button><button class="secondary-button" data-action="dome-scenes">東京ドームで試す</button>':''}
   <button class="secondary-button" data-action="close">戻る</button>`,'practice-options');
 }
 function practiceModal(){
  if(!game||!['practice','pitching'].includes(game.mode))return;
  game.paused=true;
  setupTraining(game.mode);
 }
 function applyTraining(demo=false){
  const pick=trainingSelection,pitching=pick.mode==='pitching';
  const club=arcadeClub(pick.club),pitch=$('practice-pitch')?.value??'random';
  settings[pitching?'pitchingClub':'practiceClub']=club.id;
  settings[pitching?'pitchingPlayer':'practiceBatter']=pick.player;
  if(!pitching)settings.practicePitch=pitch;
  save();
  if(screen!=='game'){
   start(pick.mode);
   if(demo){game.runningDemo=true;game.startField(35,20,.4,false);}
   return;
  }
  const previousPitcher=game.pitcher.id;
  const opponent=trainingOpponent(club.id);
  if(game.teams.home.id!==club.id){
   game.teams.home=club;
   game.lineups.home=NightGame.arrangeLineup(club);
   game.pitchingStaff.home=club.pitchers;
  }
  if(game.teams.away.id!==opponent.id){
   game.teams.away=opponent;
   game.lineups.away=NightGame.arrangeLineup(opponent);
   game.pitchingStaff.away=opponent.pitchers;
   game.battingIndex.away=0;
   if(pitching){
    game.bases=[false,false,false];
    game.baseIds=[null,null,null];
    game.basePitcherIds=[null,null,null];
    game.resetCount();
   }
  }
  if(pitching){
   const index=club.pitchers.findIndex(p=>p.id===pick.player);
   if(previousPitcher!==pick.player||game.homePitcherIndex!==index){
    game.homePitcherIndex=index;
    game.pitchType='fast';
    game.stamina=100;
    game.pitchHistory=[];
   }
  }else{
   game.practiceBatter=pick.player;
   game.practicePitch=pitch;
  }
  closeModal(false);
  game.paused=false;
  game.prepare();
 }
 function thumbPreview(){const lift=settings.cursorLift,shift=settings.cursorShift,sx=settings.leftHanded?shift:-shift;return `<div class="thumb-preview" aria-label="照準と指の位置のプレビュー"><span class="preview-finger"></span><i class="preview-line" style="width:${Math.hypot(shift*.5,lift*.5)}px;transform:rotate(${Math.atan2(-lift,sx)*180/Math.PI}deg)"></i><span class="preview-reticle" style="transform:translate(${sx*.5}px,${-lift*.5}px)">＋</span><small>照準</small><b>${settings.leftHanded?'左':'右'}親指</b></div>`;}
 let musicSelection={club:null,person:'',fromCareer:null};
 let importedTracks=[];
 const musicSlots=slot=>slot==='chance'?['chance','cheer']:slot==='thirdOut'?['thirdOut','out']:[slot];
 const htmlText=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function musicTarget(){
  const {club,person}=musicSelection;
  if(club==='world-career'){
   const team=game?.worldFixture?game.teams[game.userSide].id:world.active?world.owningClub(world.active):world.player.club;
   const teamKey=careerMusicKey(world.seed,true),key=person?careerMusicKey(world.seed):teamKey;
   const keys=person?[key,playerMusicKey(team,person),teamKey]:[key];
   return {key,keys:[...keys,teamMusicKey(team)]};
  }
  if(club==='career'){
   const teamKey=careerMusicKey(career.seed,true),key=person?careerMusicKey(career.seed):teamKey;
   return {key,keys:person?[key,teamKey]:[key]};
  }
  const teamKey=teamMusicKey(club),key=person?playerMusicKey(club,person):teamKey;
  return {key,keys:person?[key,teamKey]:[key]};
 }
 function musicTrack(slot,keys){
  const fallback=musicSelection.club==='world-career'&&['cheer','chance'].includes(slot)?DEFAULT_CAREER_CHEER:null;
  return trackForEvent(settings.music,musicSlots(slot),keys,fallback);
 }
 function musicControls(){
  const {club,person}=musicSelection,settingsMusic=settings.music;
  const available=NightTeams.playable||NightTeams.all;
  const current=available.find(t=>t.id===club)||available[0];
  const people=club==='world-career'?[world.player]:club==='career'?[career.player()]:[...current.batters,...current.pitchers];
  const {key,keys}=musicTarget();
  const option=(value,label,selected)=>`<option value="${htmlText(value)}"${selected?' selected':''}>${htmlText(label)}</option>`;
  const volume=[['cheer','応援歌'],['results','結果曲'],['overlap','相手の応援と重なるとき']].map(([id,label])=>
   `<div class="setting-slider"><label for="music-${id}">${label}<output id="music-${id}-value">${settingsMusic[id]}%</output></label><input id="music-${id}" data-music-volume="${id}" type="range" min="0" max="100" value="${settingsMusic[id]}"></div>`).join('');
  const rows=Object.entries(MUSIC_SLOTS).map(([slot,label])=>{
   const tracks=[...PRESETS,...importedTracks],value=settingsMusic.assignments[key]?.[slot]||'';
   if(value&&value!=='off'&&!tracks.some(t=>t.id===value))tracks.push({id:value,name:'保存済みの音源'});
   const resolved=musicTrack(slot,keys);
   const inherited=person?'チームの設定を使う':slot==='chance'?'通常の応援歌を使う':slot==='thirdOut'?'通常の判定曲を使う':
    club==='world-career'?(slot==='cheer'?'所属チームまたは標準の応援歌を使う':'所属チームの設定を使う'):'曲なし';
   const choices=option('',inherited,value==='')+option('off','曲を流さない',value==='off')+
    tracks.map(t=>option(t.id,t.name,t.id===value)).join('');
   return `<div class="music-row"><label for="song-${slot}">${label}</label><select id="song-${slot}" class="field-select" data-song-slot="${slot}">${choices}</select>
    <div class="music-actions"><button type="button" data-music-preview="${slot}" ${resolved?'':'disabled'}>試聴</button>${!['cheer','chance'].includes(slot)?`<button type="button" data-music-preview="${slot}" data-music-quiet ${resolved?'':'disabled'}>小音量で試聴</button>`:''}
    <label class="music-import">音源を選ぶ<input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" data-music-upload="${slot}"></label>${value.startsWith('user:')?`<button type="button" data-music-delete="${slot}">音源を削除</button>`:''}</div></div>`;
  }).join('');
  return `<div class="music-target"><div><label for="music-club">チーム</label><select id="music-club" class="field-select">${world?option('world-career','選手キャリア',club==='world-career'):''}${career?option('career',world?'従来キャリア':'選手キャリア',club==='career'):''}${available.map(t=>option(t.id,t.name,t.id===club)).join('')}</select></div>
   <div><label for="music-person">対象</label><select id="music-person" class="field-select">${option('','チーム全体',!person)}${people.map(p=>option(p.id,p.name,p.id===person)).join('')}</select></div></div>
   <p class="modal-note">応援とヒットは打者、アウトと3アウトは守備選手、三振は投手の設定を優先します。二塁か三塁に走者がいるとチャンステーマに切り替わります。</p>
   ${rows}<button class="secondary-button" data-action="music-stop">試聴を停止</button>
   <div class="setting-label">音量</div>${volume}
   <button class="secondary-button" data-action="music-back">戻る</button>`;
 }
 function drawMusicMenu(focus){
  if(modalKind!=='music-settings')return;
  const body=$('music-settings-body'),scroll=$('modal-content').scrollTop;
  body.innerHTML=musicControls();$('modal-content').scrollTop=scroll;
  if(focus)$(focus)?.focus({preventScroll:true});
 }
 function musicMenu(fromCareer=null){
  const club=game?.teams[game.userSide]?.id;
  const matchClub=(NightTeams.playable||NightTeams.all).some(c=>c.id===club)?club:settings.matchTeam;
  musicSelection={club:fromCareer||matchClub,person:fromCareer==='world-career'?world.player.id:fromCareer==='career'?career.player().id:'',fromCareer};
  modal(`${modalTitle('','球場の応援歌・結果曲')}<div id="music-settings-body">${musicControls()}</div>`,'music-settings');
  songVault.list().then(list=>{importedTracks=list;drawMusicMenu();}).catch(()=>{});
 }
 function setSongChoice(key,slot,value){
  const entry=settings.music.assignments[key]||={};
  if(value)entry[slot]=value;else delete entry[slot];
  save();
 }
 async function importSong(slot,file){
  if(!file)return;
  if(file.size>20*1024*1024){toast('音源は20 MB以下にしてください');return;}
  const {key}=musicTarget();unlockAudio();
  if(!stadiumAudio.context){toast('この端末では音源を読み込めません');return;}
  try{await stadiumAudio.context.decodeAudioData(await file.arrayBuffer());}
  catch{toast('再生できない形式です。MP3やWAVをお試しください');return;}
  const id='user:'+crypto.randomUUID();
  try{
   await songVault.put({id,name:file.name,file});
   importedTracks=await songVault.list();
   setSongChoice(key,slot,id);drawMusicMenu('song-'+slot);toast('音源を保存しました');
  }catch{toast('音源を保存できませんでした');}
 }
 async function removeSong(slot){
  const {key}=musicTarget(),id=settings.music.assignments[key]?.[slot];
  if(!id?.startsWith('user:'))return;
  if(!window.confirm('この音源を端末から削除しますか？ 他の選手やチームで使っている設定からも外れます。'))return;
  try{
   await songVault.remove(id);ballparkMusic.stop('preview');ballparkMusic.buffers.delete(id);
   for(const entry of Object.values(settings.music.assignments))for(const type of Object.keys(MUSIC_SLOTS))if(entry[type]===id)delete entry[type];
   importedTracks=importedTracks.filter(t=>t.id!==id);save();drawMusicMenu('song-'+slot);
  }catch{toast('音源を削除できませんでした');}
 }
 function settingsModal(){
  if(game?.phase==='derby-break'||['derby-result','career-result'].includes(modalKind))return;
  if(game&&screen==='game')game.paused=true;
  const activeCareer=career&&!worldActive&&(game?.career||screen==='career');
  const scaleOptions=[['hudScale','スコア・選手情報'],['controlsScale','操作ボタン']].map(([id,label])=>`
   <div class="setting-slider"><label for="${id}">${label} <output id="${id}-output">${settings[id]}%</output></label>
    <input id="${id}" data-ui-scale="${id}" type="range" min="75" max="120" step="5" value="${settings[id]}"></div>`).join('');
  modal(`${modalTitle('THUMB CONTROLS','親指の操作・ゲーム設定')}${lightingField()}<section class="hud-settings">
   <h3 class="setting-label">試合画面のサイズ</h3>${scaleOptions}
   <p class="modal-note">端末幅に合わせた標準サイズを基準に調整できます。${activeCareer?'':'試合中に設定を開くと、その場で反映を確認できます。'}</p></section><div id="thumb-preview-wrap">${thumbPreview()}</div><div class="setting-slider"><label for="cursor-shift">指から横への距離 <output id="shift-output">${settings.cursorShift}px</output></label><input id="cursor-shift" type="range" min="0" max="140" step="4" value="${settings.cursorShift}"></div><div class="setting-slider"><label for="cursor-lift">指から上への距離 <output id="lift-output">${settings.cursorLift}px</output></label><input id="cursor-lift" type="range" min="0" max="160" step="4" value="${settings.cursorLift}"></div><p class="modal-note">球場を押したまま親指を動かし、離して打撃・投球。照準は指の左上に表示されます。</p>${[['timingGuide','タイミングリング','リングが小さい円に重なったら離す'],['battingAssist','打撃アシスト','手前のボールを少しゆっくりにする'],['timingSound','離すタイミングの合図','音と対応端末の短い振動'],['leftHanded','左親指で操作','照準を指の右上に変更'],['assist','到達位置のガイド','予測位置を表示（練習用）'],['showTrace','前の投球位置を表示','次の投球前に確認'],['sound','サウンド','録音の打球・捕球音と観客の歓声'],['vibration','振動','ミートした手応え']].map(([v,l,d])=>`<div class="setting-row"><div><strong>${l}</strong><small>${d}</small></div><button class="toggle ${settings[v]?'on':''}" data-toggle="${v}" role="switch" aria-checked="${!!settings[v]}" aria-label="${l}"></button></div>`).join('')}<div class="audio-settings"><div class="setting-label">球場のサウンド</div><p class="modal-note">打球・グラブの録音と、プレーに反応する歓声。</p><div class="setting-slider"><label for="sound-volume">全体音量 <output id="sound-volume-output">${settings.soundVolume}%</output></label><input id="sound-volume" type="range" min="0" max="100" step="1" value="${settings.soundVolume}"></div><div class="setting-slider"><label for="crowd-volume">観客・歓声 <output id="crowd-volume-output">${settings.crowdVolume}%</output></label><input id="crowd-volume" type="range" min="0" max="100" step="1" value="${settings.crowdVolume}"></div><button class="secondary-button" data-action="music-settings">応援歌・アウト／三振の曲</button><div class="audio-preview-buttons"><button data-audio-test="perfect">打球音を試す</button><button data-audio-test="catch">捕球音を試す</button><button data-audio-test="homer">歓声を試す</button></div><details class="audio-credits"><summary>サウンド素材</summary><p>録音：martinimeniscus（打球・捕球）、eeease（球場環境）、benfree（歓声）、soundpost（スイッシュ）。CC0 1.0。編集・音量調整済み。</p><a href="./assets/audio/credits.json" target="_blank" rel="noopener">素材の出典・ライセンス一覧 ↗</a></details></div><div class="setting-label">${activeCareer?'キャリアの走塁':'走塁モード'}</div><div class="segmented">${[[false,"自動","状況に合わせて進塁"],[true,"手動",activeCareer?'自分の走者を操作':'走者を塁方向へスワイプ']].map(([manual,label,sub])=>`<button data-running-mode="${manual?"manual":"auto"}" class="${(activeCareer?(game?.career?game.manualRunning:career.manualRunning):(game?.manualRunning??settings.manualRunning))===manual?"active":""}">${label}<small>${sub}</small></button>`).join("")}</div><p class="modal-note">${activeCareer?'手動では、自分が打った直後の打者走者に進塁・帰塁を指示します。味方走者は自動です。':'手動では走者を塁方向へスワイプします。'} 打者走者はまず一塁へ。プレー中の切り替えは次の投球前に行えます。</p><div class="setting-label">打球後の速度</div><div class="segmented">${[1,2].map(n=>`<button data-field-speed="${n}" class="${settings.fieldSpeed===n?'active':''}">×${n}<small>${n===1?'通常':'2倍速'}</small></button>`).join('')}</div><div class="setting-label">難易度（次のプレイから）</div><div class="segmented">${[['casual','カジュアル'],['standard','標準'],['pro','プロ']].map(([v,l])=>`<button data-difficulty="${v}" class="${settings.difficulty===v?'active':''}">${l}</button>`).join('')}</div><button class="secondary-button" data-action="fullscreen">全画面でプレイ</button><button class="secondary-button" data-action="install">ホーム画面への追加方法</button><button class="primary-button" data-action="close">OK</button>`,'settings');
 }
 function howto(){
  if(game&&screen==='game')game.paused=true;
  modal(`${modalTitle('THUMB BASEBALL / VOL. 17','押して、狙って、離す。')}<div class="how-step"><span class="step-num">01</span><div><strong>右親指で、そのまま打つ</strong><p>球場を押したまま指を動かすと、指の左上に照準が出ます。ボールが来るコースへ合わせて、指を離すとスイング。下の操作パッドやスイングボタンを押す必要はありません。</p></div></div><div class="how-step"><span class="step-num">02</span><div><strong>リングが重なったら離す</strong><p>投球の後半に出る大きなリングが、ボールの到達位置の小さい円へ縮みます。リングが重なったら指を離そう。案内文字は表示しません。打撃アシストでは手前のボールが少しゆっくりになります。</p></div></div><div class="how-step"><span class="step-num">R</span><div><strong>親指でマニュアル走塁</strong><p>投球前に「走塁：手動」へ切替。大きいミニマップ上の丸や矢印を、進みたい塁へスワイプ。1回の指示で1つの塁まで走り、到着したら必ず停止します。次の塁への予約はできません。帰塁は戻りたい塁の方向へスワイプ。打者は最初に一塁へ走り、ほかの走者は指示待ちです。押し出される走者も自分で進塁させてください。フライ捕球後は元の塁へ戻ってから進塁。守備がボールを持ち、全員が塁で停止すると少し待って次の打者へ進みます。</p></div></div><div class="how-step"><span class="step-num">B</span><div><strong>バントで走者を送る</strong><p>縦に並ぶボタンでバントを選び、投球中に指を離します。90%で走者が1つ進塁して打者アウト、5%で進塁せずアウト、5%で打者もセーフのヒット。2アウトでは、打者アウトによる得点は入りません。</p></div></div><div class="how-step"><span class="step-num">03</span><div><strong>親指に合わせて設定</strong><p>右上の設定で、照準を指から左・上へどれだけ離すか個別に変えられます。左親指で遊ぶときは、照準を右上に切り替えられます。</p></div></div><p>打者と反対側のボタンでミートと強振を切り替え。選手、投手交代、履歴や練習設定は一時停止メニューから開けます。投手操作も球場で直接狙い、指を離すと投球。球種は球場内のボタンで選びます。守備回の自動進行は「守備を自動で進行」から開始。×1 / ×2で表示速度を切り替えられます。打球後の×1 / ×2も引き続き使えます。</p><button class="primary-button" data-action="close">プレイに戻る</button>`,'howto');
 }
 function recordModal(){
   const achievements=[
     [records.hits>0,'◇','はじめの一打','初めてのヒットを記録'],
     [records.hr>0,'↗','夜を打ち抜け','初めてのホームランを記録'],
     [records.wins>0,'★','ウイニングナイト','対戦で初勝利'],
     [records.maxDistance>=130,'◎','130mクラブ','130m以上の打球を記録'],
     [records.bestTimedDerby>=5,'♜','ホームランマシン','ダービーで5本以上を記録'],
     [records.grandSlam,'✦','グランドスラム','満塁ホームランを記録']
   ];
   modal(`${modalTitle('YOUR BASEBALL STORY','プレイ記録')}<div class="stats-grid">${[[records.maxDistance,'m','最長飛距離'],[records.hr,'本','通算ホームラン'],[records.wins,'勝','対戦勝利数'],[records.bestTimedDerby,'/ 10','ダービー最高記録']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><span class="eyebrow">ACHIEVEMENTS</span>${achievements.map(([ok,icon,title,desc])=>`<div class="achievement ${ok?'unlocked':''}"><span>${icon}</span><div><strong>${title}</strong><small>${desc}</small></div><i>${ok?'獲得':'未獲得'}</i></div>`).join('')}<p class="modal-note">対戦 ${records.games}試合 / ${records.wins}勝 ${records.draws}分 / 通算 ${records.hits}安打<br>プレイを終了すると記録に反映されます。</p><button class="primary-button" data-action="close">閉じる</button>`, 'records');
 }
 function canSimulateWorldRemainder(g){
  return !!g?.worldFixture&&!!g.career?.continuous&&
   (['intro','career-ready','aim','change'].includes(g.phase)||g.phase==='windup'&&!g.pitch?.delivered);
 }
 function canSwitchWorldBatting(g){
  return !!g?.worldFixture&&g.worldFixture===world?.active?.id&&!world.pitching&&g.canSwitchWorldBatting(world.player.id);
 }
 function pause(){if(review.playback){stopReplay();return;}if(game?.phase==='career-pregame'){careerDashboard();return;}if(!game||['ended','derby-break'].includes(game.phase))return;game.paused=true;checkpoint();modal(`${modalTitle('TIME OUT','ひと休み。',false)}<div class="match-summary"><span>${game.derby?game.derby.label:`${game.inning}回${game.half==='top'?'表':'裏'} / ${game.loadedStart?'毎回2アウト満塁':game.totalInnings+'回制'}`}</span><span>${game.derby?game.derby.turnHR+' 本':`${game.teams.away.short} ${game.awayScore} - ${game.homeScore} ${game.teams.home.short}`}</span></div><button class="primary-button" data-action="close">プレイを再開</button>${canSwitchWorldBatting(game)?'<button class="secondary-button" data-action="world-batting-only">自分の打席だけに切り替え</button>':''}${canSimulateWorldRemainder(game)?'<button class="secondary-button" data-action="world-finish-auto">残りを自動進行</button>':''}<button class="secondary-button" data-action="settings">操作・速度の設定</button><button class="secondary-button" data-action="howto">遊び方</button>${game.isFixture?'<button class="secondary-button" data-action="bench">選手交代・ベンチ</button>':''}<button class="secondary-button" data-action="roster">選手・打順</button><button class="secondary-button" data-action="history">投球履歴・成績</button>${game.inMatch?'<button class="secondary-button" data-action="tactics">守備の作戦</button>':''}${['practice','pitching'].includes(game.mode)?'<button class="secondary-button" data-action="practice-options">練習設定</button>':''}<button class="secondary-button" data-action="leave">${game.career||game.worldFixture?'保存してキャリアへ':game.apbcFixtureId?'保存して大会へ':game.mode==='pennant'?'保存してペナントへ': ['practice','pitching'].includes(game.mode)?'練習を終えて結果を見る':'中断してホームへ'}</button>${game.mode==='pennant'||game.apbcFixtureId||game.career||game.worldFixture?'':'<button class="danger-link" data-action="restart">最初からやり直す</button>'}`,'pause');}
 function start(mode,challengeId=null,fixedPark=null){
  if(mode==='apbc'){startAPBC();return;}if(mode==='apbc-cup'){playTournament(true);return;}
  if(mode==='match')clearCheckpoint();closeModal(false);unlockAudio();sound('tap');lastMode=mode;saved=false;$('distance').textContent='';$('timing-result').textContent='';
  const matchConfig=mode==='match'?lineupConfig('match').config:null,scenario=CHALLENGES[challengeId];
  const training=mode==='practice'||mode==='pitching';
  const club=mode==='match'?NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent)
   :arcadeClub(settings[mode==='derby'?'derbyClub':mode==='pitching'?'pitchingClub':'practiceClub']);
  const selectedPitcher=club.pitchers.findIndex(p=>p.id===settings.pitchingPlayer);
  if(mode==='derby')onEvent('clear');
  game=new NightGame(mode,settings.difficulty,onEvent,{clubs:mode==='derby'&&club.alumni?{home:club,away:trainingOpponent(club.id)}:undefined,homeTeamId:club.id,arcadeRoster:training||mode==='derby',awayTeamId:mode==='match'?(settings.matchUserHome?settings.matchOpponent:settings.matchTeam):trainingOpponent(club.id).id,userHome:mode==='match'?settings.matchUserHome:true,defenseSpeed:settings.defenseSpeed,innings:settings.innings,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,park:fixedPark||scenario?.park||(mode==='derby'?settings.derbyPark:settings.park),pitcher:matchConfig?matchConfig.pitcher:selectedPitcher>=0?selectedPitcher:settings.pitcher,practicePitch:settings.practicePitch,practiceBatter:mode==='derby'?settings.derbyBatter:settings.practiceBatter,order:matchConfig?.order??(club.id==='owls'?settings.order:undefined),fielding:matchConfig?.fielding,battingAssist:settings.battingAssist});
  if(scenario){
   game.challenge=challengeId;
   game.manualRunning=challengeId==='tag';
   game.defense=scenario.defense||'normal';
   game.inning=challengeId==='walkoff'?game.totalInnings:1;
   game.outs=scenario.outs;
   game.bases[scenario.base-1]=true;
   game.baseIds[scenario.base-1]=game.lineups.home.find(p=>p.id!==game.batter.id).id;
   game.basePitcherIds[scenario.base-1]=game.pitcher.id;
   game.practicePitch='fast';
  }
  activateGame();updateStyle();updateUI();
  updateChallenge();
 }
 const DOME_SCENES={
  plate:{label:'打席でプレー'},
  gap:{label:'右中間の二塁打',shot:[35,20,.4]},
  fly:{label:'高いフライ',shot:[34,66,-.16]},
  replay:{label:'得点リプレイ',shot:[53,33,.12]}
 };
 function domeSceneMenu(){
  modal(`${modalTitle('','東京ドームで試す')}<div class="challenge-menu">${Object.entries(DOME_SCENES).map(([id,c])=>
   `<button class="league-inline-button" data-action="dome-shot" data-dome-scene="${id}">${c.label}</button>`).join('')}</div>
   <button class="secondary-button" data-action="back-batting">打撃練習へ戻る</button>`,'dome-scenes');
 }
 function startDomeScene(scene){
  const selection=DOME_SCENES[scene];if(!selection)return;
  start('practice',null,'tokyo-dome');
  game.domeScene=scene;
  if(!selection.shot){onEvent('clear');return;}
  game.runningDemo=true;
  if(scene==='replay')game.challenge='broadcast-replay';
  game.startField(...selection.shot,false,true);
 }
 function challengeMenu(){
  modal(`${modalTitle('','状況別チャレンジ')}<div class="challenge-menu">${Object.entries(CHALLENGES).map(([id,c])=>
   `<button class="league-inline-button" data-challenge="${id}"><strong>${c.title}</strong><span>${c.goal}</span></button>`).join('')}</div>
   <button class="secondary-button" data-action="back-batting">打撃練習へ戻る</button>`,'field-challenges');
 }
 function updateChallenge(done=false){
  const id=game?.challenge,c=CHALLENGES[id],panel=$('challenge-panel');
  panel.hidden=!c||!!review.playback;
  if(!c)return;
  const success=done&&challengeWon(id,game.field);
  $('challenge-title').textContent=done?(success?'クリア！':'チャレンジ失敗'):c.title;
  $('challenge-goal').textContent=done?c.goal:c.goal+(id==='tag'?'。捕球後、走者を本塁へスワイプ。':'');
  $('challenge-retry').hidden=!done;
  panel.classList.toggle('won',success);
 }
 function closeChallengeResult(){if(game?.challenge&&game.field?.resolved&&!game.field.foul)updateChallenge(true);}
 $('challenge-retry').onclick=()=>{if(game?.challenge)start('practice',game.challenge);};
 function updatePlayTools(){
  $('hit-readout').textContent=hitReadout(game?.phase==='result'?game.hit:null);
  $('play-tools').hidden=!!review.playback||!$('hit-readout').textContent;
 }
 const playFeedback={score:null,scoreTime:0,callTime:0,pendingReplay:false};
 let absShownCall=null,absShownResult=null,absFrozenCall=null,absTouch=null,absLastTap=null;
 function resetPlayFeedback(){
  absShownCall=absShownResult=absFrozenCall=absTouch=absLastTap=null;
  for(const id of ['abs-actor','abs-hint','abs-review'])$(id).hidden=true;
  playFeedback.score=game?{away:game.awayScore,home:game.homeScore}:null;
  playFeedback.scoreTime=0;playFeedback.callTime=0;playFeedback.pendingReplay=false;
  $('scoring-chip').hidden=true;$('umpire-call').hidden=true;
  $('replay-skip').hidden=true;$('replay-skip').dataset.mode='';
 }
 function tickPlayFeedback(dt){
  playFeedback.scoreTime=Math.max(0,playFeedback.scoreTime-dt);
  playFeedback.callTime=Math.max(0,playFeedback.callTime-dt);
  if(!playFeedback.scoreTime)$('scoring-chip').hidden=true;
  if(!playFeedback.callTime)$('umpire-call').hidden=true;
 }
 function showPlayCall({verdict,base}){
  const panel=$('umpire-call'),label=verdict==='out'?'OUT':'SAFE';
  const sub=['','一塁','二塁','三塁','本塁'][base];
  panel.dataset.verdict=verdict;
  panel.innerHTML=`<strong>${label}</strong>`+(sub?`<small>${sub}</small>`:'');
  panel.hidden=false;playFeedback.callTime=1500;
  if(typeof panel.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   panel.getAnimations().forEach(animation=>animation.cancel());
   panel.animate([{opacity:0,transform:'translateY(7px) scale(.86)'},{opacity:1,transform:'translateY(0) scale(1)'}],
    {duration:235,easing:'cubic-bezier(.12,.74,.25,1)'});
  }
 }
 function updateAbsUI(g,draw=false){
  const interactive=g.absCanChallenge&&!g.paused&&$('modal').hidden;
  const actor=$('abs-actor'),hint=$('abs-hint'),panel=$('abs-review'),call=g.absCall;
  actor.hidden=hint.hidden=!interactive;
  if(g.phase==='abs-call'&&call!==absShownCall){
   absShownCall=call;absLastTap=null;
   const en=call.umpireStrike?'STRIKE':'BALL',ja=call.umpireStrike?'ストライク':'ボール';
   onEvent('message',{en,ja});
   const role=g.defending?'投手':'打者';
   hint.textContent=role+'を2回タップ · ABS残り'+g.absRemaining+'回';
   actor.setAttribute('aria-label',role+'でABSチャレンジ 残り'+g.absRemaining+'回');
  }
  if(interactive){
   const bounds=absActorBounds(renderer,g);
   const canvas=$('game-canvas').getBoundingClientRect(),stage=$('stage').getBoundingClientRect();
   actor.style.left=canvas.left-stage.left+bounds.x+'px';
   actor.style.top=canvas.top-stage.top+bounds.y+'px';
   actor.style.width=bounds.w+'px';actor.style.height=bounds.h+'px';
  }
  panel.hidden=g.phase!=='abs-review'||!$('modal').hidden;
  if(panel.hidden)return;
  const showResult=reduceAbsMotion.matches||g.phaseTime>=3550;
  $('abs-splash').hidden=reduceAbsMotion.matches||g.phaseTime>=450;
  const result=$('abs-verdict');
  if(showResult&&absShownResult!==call){
   absShownResult=call;
   result.dataset.strike=String(call.strike);
   $('abs-word').textContent=call.strike?'好球':'壞球';
   $('abs-gap').textContent=(call.strike?'好球帶內 ':'距離好球帶 ')+(Math.abs(call.gap)*100).toFixed(1)+' 公分';
   $('abs-change').textContent=call.strike===call.umpireStrike?'判定維持':'判定変更';
  }
  result.hidden=!showResult;
  if(draw)absReview.draw(call,g.phaseTime,reduceAbsMotion.matches);
 }
 const absActor=$('abs-actor');
 absActor.addEventListener('pointerdown',e=>{
  if(e.button!==0||!game?.absCanChallenge)return;
  absTouch={x:e.clientX,y:e.clientY,id:e.pointerId,call:game.absCall};
 });
 absActor.addEventListener('pointercancel',()=>{absTouch=null;});
 absActor.addEventListener('pointerup',e=>{
  const touch=absTouch;absTouch=null;
  if(!touch||touch.id!==e.pointerId||touch.call!==game?.absCall||Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>16)return;
  const time=e.timeStamp,call=game.absCall;
  // A slow frame can delay delivery of the second touch. Count the same
  // time visible on the pitch-decision screen as well as the event time.
  const close=absLastTap?.call===call&&
   (time-absLastTap.time<=560||game.phaseTime-absLastTap.phaseTime<=400);
  if(close){
   absLastTap=null;
   if(game.requestAbsChallenge())sound('tap');
  }else absLastTap={call,time,phaseTime:game.phaseTime};
 });
 absActor.addEventListener('click',e=>{
  if(e.detail===0&&game?.requestAbsChallenge())sound('tap');
 });
 function updateScoringChip(g){
  const score=g.displayScore(),previous=playFeedback.score;
  if(previous&&score.away===previous.away&&score.home===previous.home)return;
  playFeedback.score=score;
  if(!previous||!['field','result'].includes(g.phase))return;
  const chip=$('scoring-chip');
  if(score.away<previous.away||score.home<previous.home){
   chip.hidden=true;playFeedback.scoreTime=0;
   return;
  }
  const badge=club=>club.scoreMark?`<span class="scoring-mark" style="--team:${club.color}">${club.scoreMark}</span>`:
   `<img src="${club.logo}" width="23" height="23" alt="">`;
  chip.innerHTML=`${badge(g.teams.away)}<b>${score.away}</b><span class="score-separator">–</span><b>${score.home}</b>${badge(g.teams.home)}`;
  chip.setAttribute('aria-label',`${g.teams.away.name} ${score.away}対${score.home} ${g.teams.home.name}`);
  chip.hidden=false;playFeedback.scoreTime=960;
 }
 function launchReplay(){
  if(!game||review.playback||!$('modal').hidden||!review.open(game))return;
  $('game').classList.add('replay-active');$('replay-label').hidden=false;updatePlaySkip();
  updatePlayTools();updateChallenge();
 }
 function stopReplay(){
  if(!review.playback)return;
  review.close();$('game').classList.remove('replay-active');$('replay-label').hidden=true;updatePlaySkip();
  updatePlayTools();
  if(game?.challenge){updateChallenge(game.outs>=3);closeChallengeResult();}
 }
 function updatePlaySkip(){
  const btn=$('replay-skip');
  const trot=screen==='game'&&game?.homeRunRunning&&!game.paused&&!playFeedback.pendingReplay&&$('modal').hidden;
  const mode=review.playback?'replay':trot?'home-run':'';
  if(btn.dataset.mode===mode)return;
  btn.dataset.mode=mode;btn.hidden=!mode;
  btn.setAttribute('aria-label',mode==='home-run'?'ホームランの走塁をスキップ':'リプレイをスキップ');
 }
 $('replay-skip').onclick=()=>{
  if(review.playback)stopReplay();
  else if(game?.skipHomeRunRun()){
   playFeedback.scoreTime=0;$('scoring-chip').hidden=true;
   updatePlaySkip();
  }
 };
 function onEvent(type,data){
   if(type==='message'){
     $('message-en').textContent=data.en;$('message-ja').textContent=data.ja;$('message-sub').textContent=data.sub||'';
     if(game?.challenge&&data.en==='STRIKEOUT')updateChallenge(true);
     const stage=$('stage-message');
     const kind=data.kind||(/^(SINGLE|DOUBLE|TRIPLE|GROUND-RULE DOUBLE|BUNT HIT)$/.test(data.en)?'hit':
      data.en==='HOME RUN'?'homer':/OUT|DOUBLE PLAY/.test(data.en)?'out':'neutral');
     const pitchCall=['BALL','STRIKE','STRIKEOUT','WALK','SWING & MISS'].includes(data.en);
     stage.className='stage-message show '+kind+(pitchCall?' pitch-call':'');
     const banner=stage.querySelector('.stage-call');
     if(typeof banner.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      banner.getAnimations().forEach(animation=>animation.cancel());
      const impact=['out','hit','homer'].includes(kind);
      banner.animate([
       {opacity:0,transform:impact?'translateX(-14px) scale(.94)':'translateY(8px)'},
       {opacity:1,transform:'none'}
      ],{duration:impact?230:170,easing:'cubic-bezier(.16,1,.3,1)'});
     }
   }else if(type==='clear'){$('stage-message').className='stage-message';$('distance').textContent='';$('timing-result').textContent='';$('play-tools').hidden=true;}
   else if(type==='sound')sound(data);
   else if(type==='music-result'){syncAudio();if(game)ballparkMusic.result(game,data.kind,data.player,data.side,data.thirdOut);}
   else if(type==='field'){review.capture(game);updatePlayTools();}
   else if(type==='update')updateUI();
   else if(type==='timing'){
     // Contact feedback is sound/vibration only; no text over the field.
   }else if(type==='hit'){
     if(review.capture(game,true))playFeedback.pendingReplay=true;
     updatePlayTools();closeChallengeResult();
     $('distance').textContent=data.distance?data.distance+' m':'';
   }else if(type==='play-call')showPlayCall(data);
   else if(type==='scoring-walk'){
     review.captureWalk(game);playFeedback.pendingReplay=true;
   }else if(type==='career-ready')careerAppearance(data);
   else if(type==='derby-turn')derbyTurnResult(data);
   else if(type==='end')finish(data);
 }
 function updateHalfBreak(g){
  const waiting=g.phase==='change'&&g.isFixture;$('half-break').hidden=!waiting;
  if(!waiting){$('half-break').dataset.key='';return;}
  const h=g.halfBreak||{inning:g.half==='bottom'?g.inning:g.inning-1,half:g.half==='bottom'?'top':'bottom'};
  const key=[g.inning,g.half,g.homeScore,g.awayScore,g.autoDefense].join('/');
  if($('half-break').dataset.key!==key){
   $('half-break').dataset.key=key;$('half-break-title').textContent=`${h.inning}回${h.half==='top'?'表':'裏'} 終了`;
   $('half-break-score').innerHTML=lineScoreHTML(buildMatchReport(g));$('half-break-next').textContent=`${g.inning}回${g.half==='top'?'表':'裏'} · ${g.defending?'あなたの守備':'あなたの攻撃'}`;
   $('half-continue').textContent='タップして次の回へ';$('half-auto-note').textContent=g.autoDefense?'自動守備 ON · 次の守備回も継続':'';
  }
 }
 function continueHalf(){
  if(!game||screen!=='game'||!$('modal').hidden||game.phase!=='change')return;
  unlockAudio();if(game.acknowledgeHalf()){sound('tap');updateUI();}
 }
 let halfTap=null;
 $('half-break').addEventListener('pointerdown',e=>{halfTap={x:e.clientX,y:e.clientY,id:e.pointerId};});
 $('half-break').addEventListener('pointerup',e=>{const t=halfTap;halfTap=null;if(t&&t.id===e.pointerId&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<12)continueHalf();});
 $('half-break').addEventListener('pointercancel',()=>{halfTap=null;});
 $('half-continue').addEventListener('click',e=>{if(e.detail===0)continueHalf();});
 function updateUI(){
   if(!game)return;const g=game;updateHalfBreak(g);const def=g.defending,field=!!g.field&&['field','result'].includes(g.phase);$('bench-button').hidden=!g.isFixture;$('bench-button').disabled=g.phase==='ended';$('bench-button').textContent=queuedBench?'交代待ち':'ベンチ';$('bench-button').classList.toggle('pending',queuedBench);
   if(g.isFixture||g.career||g.challenge){
     updateScoreCube($('scoreboard'),g);
   }else if(g.derby){
     const d=g.derby;
     $('scoreboard').innerHTML=`<div class="derby-score"><div class="derby-round"><span>${d.label}${d.extra?' · 延長':''}</span><strong id="derby-clock"></strong></div><div class="derby-names"><span>${g.batter.name}<b>${d.turnHR}</b></span><span>${d.opponent.player.name}<b>${d.score[1-d.userIndex]}</b></span></div></div>`;
     updateDerbyClock(g);
   }else{
     const pitching=g.mode==='pitching';
     $('scoreboard').innerHTML=`<div class="team-mark">${pitching?'P':'N'}</div><div class="mode-score"><div class="left">${pitching?'PITCHING LAB':'CURSOR BATTING'}</div><div class="big">${pitching?g.session.ks:g.session.hr}<span>${pitching?'K':'HR'}</span></div><div class="big">${pitching?g.session.thrown:g.session.pitches}<span>球</span></div></div>`;
   }
   $('inning-label').textContent=g.isFixture?`${g.inning>g.totalInnings&&(g.loadedStart||g.apbcFixtureId||g.npbPostseason)?'延長 ':''}${g.inning}回${g.half==='top'?'表':'裏'} · ${def?'投球':'打撃'}`:g.mode==='pitching'?'ピッチング練習':g.mode==='derby'?'ホームランダービー':g.career?`${g.inning}回${def?'表 · 登板':'裏 · 自分の打席'}`:'打撃練習';
   if(g.inMatch){$('count').innerHTML=[['B',g.balls,3,'b'],['S',g.strikes,2,'s'],['O',g.outs,3,'o']].map(([l,n,max,cl])=>`<div class="count-group ${cl}"><span>${l}</span>${Array.from({length:max},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`).join('');$('count').setAttribute('aria-label',`${g.balls}ボール ${g.strikes}ストライク ${g.outs}アウト`);}else $('count').innerHTML=`<span>${g.session.hits} HITS</span>`;
   $('bases').hidden=!g.inMatch;[...$('bases').children].forEach((e,i)=>e.classList.toggle('on',g.bases[i]));$('bases').setAttribute('aria-label',g.bases.some(Boolean)?g.bases.map((b,i)=>b?`${i+1}塁`:null).filter(Boolean).join('・')+'に走者':'走者なし');
   $('role-tag').textContent=field?'LIVE FIELD':def?'PITCHING / YOU':'BATTING / YOU';$('role-tag').classList.toggle('pitching',def);
   const pitchVisible=!!g.pitch&&['pitch','miss','field','result'].includes(g.phase);
   $('pitch-label').textContent=pitchVisible?g.pitch.name:'';
   $('pitch-speed').textContent=pitchVisible?g.pitch.speed:'';
   $('pitch-label').parentElement.hidden=!pitchVisible;
   const wind=g.park.wind||0,windHUD=$('wind-hud');
   $('wind-speed').textContent=Math.abs(wind).toLocaleString('ja-JP',{maximumFractionDigits:1});
   windHUD.dataset.direction=wind<0?'in':wind?'out':'calm';
   windHUD.setAttribute('aria-label',wind?(wind<0?'向かい風 ':'追い風 ')+Math.abs(wind)+' m':'無風');
   $('batter-label').innerHTML=`${g.park.name}${g.park.wind?' · 追い風':''}　${def?g.pitcher.name+' <span class="stamina"><i style="width:'+g.stamina+'%"></i></span> '+g.session.thrown+'球':''}`;
   $('difficulty-label').textContent=g.difficulty.toUpperCase();
   $('control-hint').textContent=def?'画面で狙い、離して投げる':'押したまま狙い、離して打つ';
   $('swing').disabled=g.paused||(def?g.phase!=='aim':g.phase!=='pitch');
   $('action-label').textContent=def?'PITCH':'SWING';$('action-hint').textContent=def?'離して投球':'離してスイング';$('swing-icon').innerHTML=svg(def?'ball':'bat');
   $('pitch-status').textContent=field?(g.field.throw?'ボールが送球されました':'野手が打球を追っています'):g.phase==='aim'?'球種を選び、コースを指定':g.phase==='pitch'?(def?'投球中 · 打者との勝負':'カーソルをボールのコースへ！'):g.phase==='windup'?'投球モーション…':'次の1球へ';
   g.battingAssist=settings.battingAssist&&g.career?.difficulty!=='expert';$('game').classList.toggle('batting-touch',!def);$('game').classList.toggle('pitching-touch',def);$('game').classList.toggle('in-play',field);$('thumb-hint').hidden=field;$('release-label').textContent=def?'離して投げる':'離して打つ';$('game-canvas').setAttribute('aria-label',def?'球場を押したままコースを狙い、指を離して投球':'球場を押したまま狙い、指を離してスイング');
   if(def)renderPitchDirections(g);$('pitch-deck').hidden=!def||field||g.phase!=='aim'||g.autoDefense;$('pitch-types').hidden=false;$('pitch-types').style.setProperty('--pitch-count',g.pitcher.pitches.length);$('pitch-deck-status').textContent=g.phase==='aim'?'コースを狙って離す':g.phase==='windup'?'投球モーション中':g.phase==='pitch'?'投球中':'次の1球へ';$('pitch-types').classList.toggle('four',g.pitcher.pitches.length===4);$('bat-options').hidden=def;$('bat-options').dataset.batterHand=g.battingHand;document.querySelector('.controls').classList.toggle('defending',def);
   document.querySelectorAll('[data-pitch]').forEach(b=>{b.classList.toggle('active',b.dataset.pitch===g.pitchType);b.setAttribute('aria-pressed',String(b.dataset.pitch===g.pitchType));b.querySelector('small').textContent=Math.round(NightGame.pitchSpec(g.pitcher,b.dataset.pitch).speed)+'km/h';b.disabled=g.phase!=='aim'||!g.pitcher.pitches.includes(b.dataset.pitch);b.hidden=def&&!g.pitcher.pitches.includes(b.dataset.pitch);});
   const power=!!g.power,bunt=!!g.bunt;$('bunt').hidden=g.mode==='derby';$('bunt').classList.toggle('selected',bunt);$('bunt').setAttribute('aria-pressed',String(bunt));$('contact').classList.toggle('selected',!power&&!bunt);$('power').classList.toggle('selected',power);$('power').classList.toggle('power-mode',power);$('contact').setAttribute('aria-pressed',String(!power&&!bunt));$('power').setAttribute('aria-pressed',String(power));$('swing').classList.toggle('power-active',power&&!def);updatePad();
   updateRunningUI(g);
   const auto=g.autoDefense&&def,speed=auto?g.defenseSpeed:g.fieldSpeed;$('field-speed').hidden=!!g.derby;$('field-speed').textContent=`${auto?'自動守備':'打球後'} ×${speed}`;$('field-speed').classList.toggle('active',speed===2);$('field-speed').setAttribute('aria-pressed',String(speed===2));$('field-speed').setAttribute('aria-label',auto?'自動守備の速度を切り替え':'打球後の速度を切り替え');$('auto-defense').hidden=!g.isFixture||!def||g.phase==='ended';$('auto-defense').textContent=auto?'手動に戻す':'守備を自動で進行';$('auto-defense').setAttribute('aria-pressed',String(!!auto));$('game').classList.toggle('auto-defense',!!auto);document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);
   $('game').classList.toggle('career-running-match',g.mode==='career-bat');
   updatePlayerHUD($('player-card'),$('pitcher-card'),g);
   $('practice-tool').hidden=!['practice','pitching'].includes(g.mode);$('practice-tool').disabled=g.phase==='field';$('tactics-tool').hidden=!g.inMatch;updateAbsUI(g);checkpoint();
 }
 function updateRunningUI(g){
  const available=g.isFixture||g.mode==='career-bat',playing=!!g.field&&['field','result'].includes(g.phase);
  $('running-mode').hidden=!available;$('running-mode').textContent=`走塁：${g.manualRunning?'手動':'自動'}`;
  $('running-mode').setAttribute('aria-pressed',String(!!g.manualRunning));$('running-mode').disabled=playing||g.paused;
  const active=g.manualPlay&&!review.playback;const selected=g.field?.manual?.selection;
  $('run-actions').hidden=!active||!selected||selected==='all'||!g.field.runners.some(r=>r.id===selected&&!r.out&&!r.scored);
  renderRunnerMap($('runner-map'),g);$('game').classList.toggle('manual-running',active);
 }
 function chooseRunningMode(manual){
  if(game&&screen==='game'){
   // Settings pause the game; changing mode still waits until the current play ends.
   if(game.field&&['field','result'].includes(game.phase)){toast('走塁モードは次の投球前に変更できます');return;}
   game.manualRunning=manual;
  }
  if(career&&!worldActive&&(game?.career||screen==='career')){career.manualRunning=manual;saveCareer();}
  else settings.manualRunning=manual;
  save();if(game)updateUI();
 }
 $('running-mode').onclick=()=>{if(game)chooseRunningMode(!game.manualRunning);};
 bindRunnerMap($('runner-map'),()=>game,()=>sound('tap'));
 $('run-advance').onclick=()=>{if(game?.commandRunners('advance'))sound('tap');};
 $('run-return').onclick=()=>{if(game?.commandRunners('return'))sound('tap');};
 function updatePad(){if(!game)return;$('pad-label').textContent=game.defending?'スライドでコースを指定':'スライドで微調整';}
 function updateStyle(){if(game)updateUI();}
 function commit(g,abandoned=false){if(saved||g.challenge)return;saved=true;if(g.mode==='match'&&!g.apbcFixtureId)clearCheckpoint();const s=g.session;records.hits+=s.hits;records.hr+=s.hr;records.perfect+=s.perfect;records.maxDistance=Math.max(records.maxDistance,s.maxDistance);records.grandSlam ||= !!s.grandSlam;records.ks+=s.ks;records.thrown+=s.thrown;
   if(g.isFixture&&!abandoned){records.games++;if(g.userScore>g.opponentScore)records.wins++;if(g.homeScore===g.awayScore)records.draws++;}
   if(g.mode==='derby'&&!abandoned){records.bestTimedDerby=Math.max(records.bestTimedDerby,...g.derby.rounds.flat().map(m=>m.normal[m.entrants.findIndex(e=>e.user)]??0));records.bestTimedDerbyDistance=Math.max(records.bestTimedDerbyDistance,s.maxDistance);}save();
 }
 function finish(g){
   if(g.worldFixture){finishWorld(g);return;}
   if(g.career){finishCareer(g);return;}
   if(g.apbcFixtureId){finishTournament(g);return;}
   if(g.mode==='pennant'){finishLeague(g);return;}
   if(g.derby&&g.derbyTransition){derbyTurnResult(g);return;}
   const newDistance=g.session.maxDistance>records.maxDistance;commit(g);$('swing').disabled=true;
   const win=g.userScore>g.opponentScore,draw=g.homeScore===g.awayScore,match=g.mode==='match',pitching=g.mode==='pitching';
   const title=match?(win?'勝利':draw?'引き分け':'敗戦'):pitching?'投球練習結果':'打撃練習結果';
   if(match&&win)sound('win');
   const stats=pitching?[[g.session.ks,'奪三振'],[g.session.thrown,'投球数'],[g.session.allowed,'失点']]:[[g.session.hits,'安打'],[g.session.hr,'本塁打'],[g.session.maxDistance+' m','最長飛距離']];
   modal(`${modalTitle('',title,false)}${match?`<div class="result-hero"><div class="league-versus final-versus"><div>${clubBadge(g.teams.away.id)}<b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div>${clubBadge(g.teams.home.id)}<b>${g.teams.home.name}</b></div></div></div>${resultReportHTML(buildMatchReport(g))}`:`<div class="result-stats">${stats.map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</div>`}
   ${newDistance?'<div class="new-best">最長飛距離を更新</div>':''}<button class="primary-button" data-action="restart">もう一度プレイ</button>${match?'<button class="secondary-button" data-action="box-score">選手別の成績を見る</button>':''}<button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
 }
 function home(){stopReplay();review.reset();resetPlayFeedback();updatePlayTools();updateChallenge();resetCareerOverlay();$('career').hidden=true;$('apbc-cup').hidden=true;queuedBench=false;stadiumAudio.stopEffects();if(game&&!saved){if(game.isFixture||game.career||game.worldFixture)checkpoint();else commit(game,true);}closeModal(false);game=null;screen='home';matchContext='match';$('pennant').hidden=true;$('home').hidden=false;$('game').hidden=true;$('pause').hidden=true;$('settings').hidden=false;history.replaceState({nightball:'home'},'',location.href);window.scrollTo(0,0);renderMenuClubs();}
 function swing(){if(!game)return;const done=game.defending?game.throwPitch():game.swing();if(done)$('swing').disabled=true;}
 const types=NightGame.TYPES;
 function renderPitchDirections(g){
  const key=NightPlayers.ratingVersion+'/'+g.pitcher.id+'/'+g.pitcher.pitches.join(',');if($('pitch-types').dataset.key===key)return;$('pitch-types').dataset.key=key;
  const directions=[['up','↑',['fast']],['left','←',['slider','cutter']],['right','→',['shoot']],['downleft','↙',['curve','slowcurve']],['down','↓',['fork','split','vslider']],['downright','↘',['sinker','change','knuckle']]];
  $('pitch-types').innerHTML='<span class="pitch-ball" aria-hidden="true">⚾</span>'+directions.map(([dir,arrow,ids])=>`<div class="pitch-direction ${g.pitcher.hand==='L'?({left:'right',right:'left',downleft:'downright',downright:'downleft'}[dir]||dir):dir}">${g.pitcher.pitches.filter(id=>ids.includes(id)).map(id=>{const p=NightGame.pitchSpec(g.pitcher,id),level=Math.max(1,Math.min(7,Math.round(Math.hypot(p.bx,p.by)*82/18)));return `<button class="pitch-type ${id==='fast'?'straight':'breaking'}" data-pitch="${id}" aria-label="${p.name}${id==='fast'?'': ' 変化量'+level}"><i aria-hidden="true">${g.pitcher.hand==='L'?({'←':'→','→':'←','↙':'↘','↘':'↙'}[arrow]||arrow):arrow}</i><span>${p.short}</span><em>${id==='fast'?'':level}</em><small></small></button>`;}).join('')}</div>`).join('');
 }
 $('pitch-types').addEventListener('click',e=>{const b=e.target.closest('[data-pitch]');if(b&&game?.phase==='aim'){game.pitchType=b.dataset.pitch;sound('tap');updateUI();}});
 function bindFieldAim(el){
  let gesture=null;
  const clear=()=>{if(gesture)gesture.game.touch=null;gesture=null;};
  const valid=()=>gesture&&gesture.game===game&&!game.paused&&!(game.autoDefense&&game.defending)&&screen==='game'&&gesture.half===game.half&&gesture.inning===game.inning&&gesture.defending===game.defending;
  const move=e=>{if(!gesture||gesture.pointer!==e.pointerId||!valid()||!['aim','windup','pitch'].includes(game.phase))return;const r=el.getBoundingClientRect();
   const x=e.clientX-r.left+(settings.leftHanded?settings.cursorShift:-settings.cursorShift),y=e.clientY-r.top-settings.cursorLift;
   const aim=renderer.screenToAim?renderer.screenToAim(x,y):{x:(x/r.width*480-265)/75,y:(y/r.height*540-400)/64};game.setCursor(aim.x,aim.y);game.touch={x:(e.clientX-r.left)/r.width*480,y:(e.clientY-r.top)/r.height*540};
  };
  el.addEventListener('pointerdown',e=>{
   if(gesture||!game||game.paused||game.autoDefense&&game.defending||screen!=='game'||e.button!==0||(game.defending?game.phase!=='aim':!['intro','windup','pitch'].includes(game.phase)))return;
   e.preventDefault();unlockAudio();gesture={pointer:e.pointerId,game,half:game.half,inning:game.inning,defending:game.defending};el.setPointerCapture(e.pointerId);move(e);
  });
  el.addEventListener('pointermove',move);
  el.addEventListener('pointerup',e=>{if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();move(e);const fire=valid();clear();if(fire)swing();});
  const cancel=e=>{if(gesture?.pointer===e.pointerId)clear();};el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',cancel);
 }
 bindFieldAim($('game-canvas'));
 $('swing').addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();swing();});
 // Keyboard support also makes the game playable on a computer.
 $('swing').addEventListener('click',e=>{if(e.detail===0)swing();});
 document.addEventListener('keydown',e=>{
   if(!$('modal').hidden){if(e.key==='Escape'&&!['result','derby-result','career-result'].includes(modalKind)){e.preventDefault();closeModal();}if(e.key==='Tab'){const b=[...$('modal-content').querySelectorAll('button:not([disabled]):not([hidden]),select,input,summary')].filter(el=>el.getClientRects().length);if(e.shiftKey&&document.activeElement===b[0]){e.preventDefault();b.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===b.at(-1)){e.preventDefault();b[0]?.focus();}}return;}
   if(screen==='game'&&game?.phase==='change'){if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)continueHalf();}else if(e.key==='Escape')pause();return;}
   if(screen==='game'&&(e.code==='Space'||e.code==='Enter')&&(e.target===document.body||e.target===$('aim-pad')||e.target===$('game-canvas'))){e.preventDefault();if(!e.repeat)swing();}
   if(screen==='game'&&e.key==='Escape')pause();
   if(screen==='game'&&game&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();game.setCursor(game.cursor.x+(e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0),game.cursor.y+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0));updatePad();}
 });
 $('bench-button').onclick=requestBench;
 $('bunt').onclick=()=>{if(game&&game.mode!=='derby'){game.bunt=true;game.power=false;updateStyle();sound('tap');}};
 $('contact').onclick=()=>{if(game){game.power=false;game.bunt=false;updateStyle();sound('tap');}};$('power').onclick=()=>{if(game){game.power=true;game.bunt=false;updateStyle();sound('tap');}};
 $('sound').onclick=()=>{unlockAudio();settings.sound=!settings.sound;save();if(settings.sound)sound('tap');};
 $('settings').onclick=settingsModal;$('pause').onclick=pause;$('brand').onclick=()=>screen==='game'?(game?.domeScene?home():pause()):['pennant','apbc-cup','career'].includes(screen)?home():window.scrollTo({top:0,behavior:'smooth'});$('howto').onclick=howto;$('records').onclick=recordModal;
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>b.dataset.mode==='apbc'?apbcHub():b.dataset.mode==='match'?setupMatchTeams():b.dataset.mode==='derby'?setupDerby():b.dataset.mode==='career'?worldDashboard():setupTraining(b.dataset.mode));
 $('clubhouse').onclick=()=>lineupModal('edit');$('resume-game').onclick=resumeGame;$('players-tool').onclick=()=>rosterModal(game?.defending?game.pitcher.id:game?.batter.id,game?.userSide||'home');$('player-card').onclick=()=>{if(game)rosterModal(game.batter.id,game.side);};$('pitcher-card').onclick=()=>{if(game)rosterModal(game.pitcher.id,game.side==='home'?'away':'home');};$('tactics-tool').onclick=tacticsModal;$('history-tool').onclick=historyModal;$('practice-tool').onclick=practiceModal;
 $('auto-defense').onclick=()=>{if(game?.setAutoDefense(!game.autoDefense)){unlockAudio();updateUI();}};
 $('field-speed').onclick=()=>{if(game?.autoDefense&&game.defending){settings.defenseSpeed=game.defenseSpeed===1?2:1;game.defenseSpeed=settings.defenseSpeed;}else{settings.fieldSpeed=settings.fieldSpeed===1?2:1;if(game)game.fieldSpeed=settings.fieldSpeed;}save();updateUI();};
 $('modal-content').addEventListener('click',async e=>{
   const b=e.target.closest('button');if(!b)return;unlockAudio();
   if(b.dataset.boxSide){boxModal(b.dataset.boxSide);return;}
   if(b.dataset.apbcDraftTeam){apbcDraftTeam=b.dataset.apbcDraftTeam;apbcDraft();return;}
   if(b.dataset.apbcDraftInnings){apbcDraftInnings=Number(b.dataset.apbcDraftInnings);apbcDraft();return;}
   if(b.dataset.apbcSelectionKind){apbcSelection.kind=b.dataset.apbcSelectionKind;apbcSelectionModal();return;}
   if(b.dataset.apbcRegister){
    const id=b.dataset.apbcRegister,ids=apbcSelection.ids,index=ids.indexOf(id),scroll=$('modal-content').scrollTop;
    if(index>=0)ids.splice(index,1);else if(ids.length<28)ids.push(id);else{toast('登録済みの選手を先に外してください');return;}
    apbcSelectionModal(scroll);return;
   }
   if(b.dataset.apbcSide){apbcPickSide=b.dataset.apbcSide;setupAPBC();return;}
   if(b.dataset.apbcClub){const id=b.dataset.apbcClub;if(apbcPickSide==='own'){if(settings.apbcOpponent===id)settings.apbcOpponent=settings.apbcTeam;settings.apbcTeam=id;}else{if(settings.apbcTeam===id)settings.apbcTeam=settings.apbcOpponent;settings.apbcOpponent=id;}save();setupAPBC();return;}
   if(b.dataset.apbcHome!==undefined){settings.apbcUserHome=b.dataset.apbcHome==='true';save();setupAPBC();return;}
   if(b.dataset.apbcInnings){settings.apbcInnings=Number(b.dataset.apbcInnings);save();setupAPBC();return;}
   if(b.dataset.action==='apbc-lineup'){lineupModal('apbc');return;}
   if(b.dataset.action==='apbc-roster'){rosterModal(null,'home');return;}
   if(b.dataset.editorPlayer){editorPick(b.dataset.editorPlayer);return;}
   if(b.hasAttribute('data-editor-auto')||b.hasAttribute('data-editor-reset')){const {club,config}=lineupConfig(lineupContext);NightSquad[b.hasAttribute('data-editor-auto')?'auto':'reset'](club,config);editorSelection=null;saveLineup(lineupContext);lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(Object.hasOwn(CHALLENGES,b.dataset.challenge||'')){start('practice',b.dataset.challenge);return;}
   if(b.dataset.matchHome!==undefined){settings.matchUserHome=b.dataset.matchHome==='true';settings.park=NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;save();setupMatch();return;}
   if(b.dataset.matchGroup){matchClubGroup=b.dataset.matchGroup;setupMatchTeams();return;}
   if(b.dataset.matchSide){matchPickSide=b.dataset.matchSide;matchClubGroup=(matchPickSide==='home'?settings.matchTeam:settings.matchOpponent).startsWith('kbo-')?'kbo':(matchPickSide==='home'?settings.matchTeam:settings.matchOpponent).startsWith('npb-')?'npb':'cpbl';setupMatchTeams();return;}
   if(b.dataset.matchClub){const chosen=b.dataset.matchClub;if(matchPickSide==='home'){if(settings.matchOpponent===chosen)settings.matchOpponent=settings.matchTeam;settings.matchTeam=chosen;settings.park=NightTeams.get(chosen).park;lineupConfig('match');}else{if(settings.matchTeam===chosen)settings.matchTeam=settings.matchOpponent;settings.matchOpponent=chosen;}settings.park=NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;lineupConfig('match');save();setupMatchTeams();return;}
   if(b.dataset.musicPreview){
    const slot=b.dataset.musicPreview,{keys}=musicTarget();
    const id=musicTrack(slot,keys);
    if(!settings.sound){settings.sound=true;save();}
    if(id&&!await ballparkMusic.preview(id,slot,b.hasAttribute('data-music-quiet')))toast('音源を再生できませんでした');
    return;
   }
   if(b.dataset.musicDelete){await removeSong(b.dataset.musicDelete);return;}
   if(b.dataset.audioTest){if(!settings.sound){settings.sound=true;save();const toggle=$('modal-content').querySelector('[data-toggle="sound"]');toggle?.classList.add('on');toggle?.setAttribute('aria-checked','true');}await stadiumAudio.ready;sound(b.dataset.audioTest);return;}
   if(b.dataset.benchTab){benchModal(b.dataset.benchTab);return;}
   if(b.dataset.runnerBase!==undefined){runnerBase=Number(b.dataset.runnerBase);benchModal('run');return;}
   if(b.dataset.benchPlayer){if(game.substitute(b.dataset.benchPlayer,{type:b.dataset.subKind,base:runnerBase})){checkpoint();toast(b.dataset.subKind==='run'?'代走を起用しました':'代打を起用しました');benchModal(benchTab);}return;}
   if(b.dataset.benchPitch!==undefined){if(game.changePitcher(Number(b.dataset.benchPitch))){checkpoint();toast('投手を交代しました');benchModal('pitch');}return;}
   if(b.dataset.lineupReserve){const {config}=lineupConfig(lineupContext),slot=config.order.indexOf(pregameTarget);if(slot>=0&&!config.order.includes(b.dataset.lineupReserve)){const old=config.order[slot];config.order[slot]=b.dataset.lineupReserve;for(const pos of positionOptions)if(config.fielding[pos]===old)config.fielding[pos]=b.dataset.lineupReserve;pregameTarget=b.dataset.lineupReserve;lineupModal(lineupContext,b.dataset.lineupReserve,$('modal-content').scrollTop);}return;}
   if(b.dataset.lineupMove){const {config}=lineupConfig(lineupContext),i=config.order.indexOf(b.dataset.lineupMove),j=i+Number(b.dataset.dir),scroll=$('modal-content').scrollTop;if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];lineupModal(lineupContext,b.dataset.lineupMove,scroll);return;}
   if(b.dataset.lineupPreset){const {club,config,players}=lineupConfig(lineupContext),key=b.dataset.lineupPreset;config.order=(key==='default'?NightGame.arrangeLineup(club):players.slice().sort((a,c)=>c[key]-a[key])).map(p=>p.id);if(key==='default')config.fielding={};lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPitcher!==undefined){const {config}=lineupConfig(lineupContext);config.pitcher=Number(b.dataset.lineupPitcher);saveLineup(lineupContext);lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPlayer){lineupModal(lineupContext,b.dataset.lineupPlayer);$('modal-content').querySelector('.lineup-ability').open=true;return;}
   if(b.dataset.derbyBatter){settings.derbyBatter=b.dataset.derbyBatter;const scroll=$('modal-content').scrollTop;setupDerby();$('modal-content').scrollTop=scroll;return;}
   if(b.dataset.toggle){const k=b.dataset.toggle;settings[k]=!settings[k];b.classList.toggle('on',settings[k]);b.setAttribute('aria-checked',String(settings[k]));save();if(game)updateUI();if(k==='leftHanded'&&$('thumb-preview-wrap'))$('thumb-preview-wrap').innerHTML=thumbPreview();return;}
   if(b.dataset.difficulty){settings.difficulty=b.dataset.difficulty;save();$('modal-content').querySelectorAll('[data-difficulty]').forEach(el=>el.classList.toggle('active',el.dataset.difficulty===settings.difficulty));return;}
   if(b.dataset.innings){settings.innings=Number(b.dataset.innings);save();setupMatch();return;}
   if(b.dataset.runningMode){chooseRunningMode(b.dataset.runningMode==='manual');settingsModal();return;}
   if(b.dataset.fieldSpeed){settings.fieldSpeed=Number(b.dataset.fieldSpeed);if(game)game.fieldSpeed=settings.fieldSpeed;save();settingsModal();return;}
   if(b.dataset.rosterTeam){rosterModal(null,b.dataset.rosterTeam);return;}
   if(b.dataset.player){rosterModal(b.dataset.player,b.dataset.team);return;}
   if(b.dataset.movePlayer){const {config}=lineupConfig('match'),i=config.order.indexOf(b.dataset.movePlayer),j=i+Number(b.dataset.dir);if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];saveLineup('match');rosterModal(b.dataset.movePlayer);return;}
   if(b.dataset.orderPreset){const {club,config}=lineupConfig('match');config.order=(b.dataset.orderPreset==='default'?NightGame.arrangeLineup(club):lineupConfig('match').players.slice().sort((a,c)=>c[b.dataset.orderPreset]-a[b.dataset.orderPreset])).map(p=>p.id);if(b.dataset.orderPreset==='default')config.fielding={};saveLineup('match');rosterModal();return;}
   if(b.dataset.starter!==undefined){const kind=screen==='pennant'?'league':'match',{club,config}=lineupConfig(kind);config.pitcher=Number(b.dataset.starter);saveLineup(kind);rosterModal(club.pitchers[config.pitcher].id);return;}
   if(b.dataset.relief!==undefined){if(game?.changePitcher(Number(b.dataset.relief))){toast('投手を交代しました');rosterModal(game.pitcher.id,game.userSide);}return;}
   if(b.dataset.defense){game.defense=b.dataset.defense;checkpoint();tacticsModal();return;}
   switch(b.dataset.action){
     case'close':closeModal();break;
     case'career-dashboard':careerTab='next';careerDashboard();break;
     case'career-contract':
      if(career?.acceptOffer(Number(b.dataset.offer)))showCareerChoice('来季の契約が成立',
       NightTeams.get(career.clubId).name+' · 年俸 '+NightCareer.money(career.pay)+' · '+NightCareer.levels[career.level]);
      break;
     case'career-retire':
      if(career?.retire()){saveCareer();archiveCareer();careerTab='next';careerDashboard();}
      break;
     case'career-reset':career=null;careerLifeTab='leisure';careerDrillAim=null;careerTab='next';try{localStorage.removeItem(NightCareer.key);}catch{}careerDashboard();break;
     case'restart':if(game&&!saved)commit(game,true);history.replaceState({nightball:'home'},'',location.href);if(lastMode==='derby'){home();setupDerby();}else start(lastMode);break;
     case'home':home();break;
     case'apbc-hub':apbcHub();break;
     case'apbc-single':setupAPBC();break;
     case'apbc-dashboard':apbcDashboard();break;
     case'apbc-new':apbcDraft();break;
     case'apbc-draft':apbcDraft();break;
     case'apbc-official':apbcSelection.ids=Tournament.official(apbcSelection.team);apbcSelectionModal();break;
     case'apbc-selection':apbcSelection={team:apbcDraftTeam,ids:apbcDraftRosters[apbcDraftTeam].slice(),kind:'bats',clubFilter:'all'};apbcSelectionModal();break;
     case'apbc-selection-done':if(Tournament.rosterStatus(apbcSelection.team,apbcSelection.ids).valid){apbcDraftRosters[apbcSelection.team]=apbcSelection.ids;apbcDraft();}break;
     case'apbc-create':if(Tournament.rosterStatus(apbcDraftTeam,apbcDraftRosters[apbcDraftTeam]).valid){game=null;tournament=new Tournament(apbcDraftTeam,apbcDraftInnings,apbcDraftRosters[apbcDraftTeam]);saveTournament();apbcDashboard();}break;
     case'world-batting-only':
      if(canSwitchWorldBatting(game)){
       const activity=world.liveOptions('self')?.career;
       if(!activity)break;
       closeModal(false);queuedBench=false;game.paused=false;
       if(game.switchWorldBatting(activity)){
        if(game?.pendingWorldBatting)toast('現在のプレー後に自分の打席だけに切り替えます');
        if(game)updateUI();
       }
      }
      break;
     case'world-finish-auto':
      if(canSimulateWorldRemainder(game)){
       closeModal(false);resetCareerOverlay();game.paused=false;game.advanceCareer(true);
      }
      break;
     case'leave':if(game?.worldFixture){checkpoint();worldDashboard();}else if(game?.career){checkpoint();careerDashboard();}else if(game?.apbcFixtureId){checkpoint();game.paused=true;apbcDashboard();}else if(game?.mode==='pennant'){checkpoint();game.paused=true;leagueDashboard();}else if(['practice','pitching'].includes(game?.mode)){closeModal(false);game.paused=false;game.finish();}else home();break;
     case'howto':howto();break;
     case'start-match':start('match');break;
     case'match-teams':setupMatchTeams();break;
     case'match-team-next':setupMatch();break;
     case'match-lineup':lineupModal('match');break;
     case'lineup-play':saveLineup(lineupContext);if(lineupContext==='league')playLeague(true);else start(lineupContext.startsWith('apbc')?lineupContext:'match');break;
     case'lineup-back':saveLineup(lineupContext);if(lineupContext==='league'||lineupContext==='edit')closeModal(false);else if(lineupContext==='apbc-cup')apbcDashboard();else if(lineupContext==='apbc')setupAPBC();else setupMatch();break;
     case'edit-lineup':lineupModal(matchContext==='apbc'?'apbc':'edit');break;
     case'editor-done':saveLineup(lineupContext);closeModal();break;
     case'start-derby':save();start('derby');break;
     case'derby-next':if(game?.continueDerby()){closeModal();sound('tap');}break;
     case'roster':rosterModal(null,game?.userSide||'home');break;
     case'bench':requestBench();break;
     case'settings':settingsModal();break;
     case'music-settings':
      musicMenu(world&&(game?.worldFixture||screen==='career'&&worldActive)?'world-career':
       career&&(game?.career||screen==='career')?'career':null);
      break;
     case'music-stop':ballparkMusic.stop('preview');break;
     case'music-back':if(musicSelection.fromCareer&&screen==='career')closeModal(false);else settingsModal();break;
     case'history':historyModal();break;
     case'tactics':tacticsModal();break;
     case'practice-options':practiceModal();break;
     case'box-score':boxModal();break;
     case'apply-practice':applyTraining();break;
     case'running-demo':applyTraining(true);break;
     case'field-challenges':challengeMenu();break;
     case'dome-scenes':domeSceneMenu();break;
     case'dome-shot':startDomeScene(b.dataset.domeScene);break;
     case'back-batting':setupTraining('practice');break;
     case'fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('この端末ではホーム画面への追加をお試しください');}catch{toast('全画面表示を利用できません');}break;
     case'install':toast(/iPhone|iPad/.test(navigator.userAgent)?'Safariの共有 → ホーム画面に追加':'ブラウザのメニュー → ホーム画面に追加');break;
   }
 });
 $('modal-content').addEventListener('input',e=>{
  const scale=e.target.dataset.uiScale;
  if(scale){
   settings[scale]=Number(e.target.value);
   $(scale+'-output').textContent=settings[scale]+'%';
   applyHUDSizes();save();return;
  }
  const id=e.target.dataset.musicVolume;
  if(!id)return;
  settings.music[id]=Number(e.target.value);$('music-'+id+'-value').textContent=e.target.value+'%';save();
 });
 $('modal-content').addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='music-club'){musicSelection.club=t.value;musicSelection.person='';ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.id==='music-person'){musicSelection.person=t.value;ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.dataset.songSlot){setSongChoice(musicTarget().key,t.dataset.songSlot,t.value);ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.dataset.musicUpload&&t.files[0])importSong(t.dataset.musicUpload,t.files[0]);
 });
 $('modal-content').addEventListener('input',e=>{if(e.target.id==='sound-volume'||e.target.id==='crowd-volume'){const master=e.target.id==='sound-volume';settings[master?'soundVolume':'crowdVolume']=Number(e.target.value);$(master?'sound-volume-output':'crowd-volume-output').textContent=e.target.value+'%';save();}if(e.target.id==='cursor-lift'){settings.cursorLift=Number(e.target.value);$('lift-output').textContent=settings.cursorLift+'px';save();$('thumb-preview-wrap').innerHTML=thumbPreview();}if(e.target.id==='cursor-shift'){settings.cursorShift=Number(e.target.value);$('shift-output').textContent=settings.cursorShift+'px';save();$('thumb-preview-wrap').innerHTML=thumbPreview();}});
 $('modal-content').addEventListener('change',e=>{
  if(e.target.id==='training-club'){
   trainingSelection.club=e.target.value;
   trainingSelection.player=null;
   trainingSelection.pitch=$('practice-pitch')?.value;
   trainingModal();
   $('training-club').focus({preventScroll:true});
  }
  if(e.target.id==='training-player')trainingSelection.player=e.target.value;
 });
 $('modal-content').addEventListener('change',e=>{
  if(e.target.id==='game-lighting'){
   settings.gameLighting=gameLightingMode(e.target.value);
   save();
  }
 });
 $('modal-content').addEventListener('change',e=>{if(e.target.id==='apbc-club-filter'){apbcSelection.clubFilter=e.target.value;apbcSelectionModal();$('apbc-club-filter').focus({preventScroll:true});return;}if(e.target.id==='editor-club'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;editorSelection=null;editorDetail=null;save();lineupModal('edit');return;}if(e.target.dataset.editorPosition){editorSelection=null;const {club,config}=lineupConfig(lineupContext);NightSquad.position(club,config,e.target.dataset.editorPosition,e.target.value);saveLineup(lineupContext);lineupModal(lineupContext,e.target.dataset.editorPosition,$('modal-content').scrollTop);return;}if(e.target.id==='lineup-replace-target'){pregameTarget=e.target.value;}if(e.target.dataset.lineupPosition){const {config}=lineupConfig(lineupContext),id=e.target.dataset.lineupPosition,previous=positionOptions.find(pos=>config.fielding[pos]===id),other=config.fielding[e.target.value];config.fielding[previous]=other;config.fielding[e.target.value]=id;lineupModal(lineupContext,id,$('modal-content').scrollTop);}if(e.target.dataset.benchPosition){game.swapFieldPosition(e.target.dataset.benchPosition,e.target.value);checkpoint();benchModal('defense');}if(e.target.id==='derby-park'){settings.derbyPark=e.target.value;save();$('derby-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.derbyPark));}if(e.target.id==='derby-club'){settings.derbyClub=e.target.value;settings.derbyBatter=null;setupDerby();}if(e.target.id==='park-select'){settings.park=e.target.value;save();$('match-park-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.park));}if(e.target.id==='starter-select'){lineupConfig('match').config.pitcher=Number(e.target.value);saveLineup('match');}if(e.target.id==='match-team'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.all.find(c=>c.id!==settings.matchTeam).id;settings.park=NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;lineupConfig('match');save();setupMatchTeams();}if(e.target.id==='match-opponent'){settings.matchOpponent=e.target.value;save();setupMatchTeams();}});
 let draggedEditorPlayer=null;
 $('modal-content').addEventListener('dragstart',e=>{const b=e.target.closest('[data-editor-player]');if(!b)return;draggedEditorPlayer=b.dataset.editorPlayer;e.dataTransfer.setData('text/plain',draggedEditorPlayer);e.dataTransfer.effectAllowed='move';});
 $('modal-content').addEventListener('dragover',e=>{if(draggedEditorPlayer&&e.target.closest('[data-editor-player]'))e.preventDefault();});
 $('modal-content').addEventListener('drop',e=>{const b=e.target.closest('[data-editor-player]');if(!b||!draggedEditorPlayer)return;e.preventDefault();const {club,config}=lineupConfig(lineupContext);if(NightSquad.swap(club,config,draggedEditorPlayer,b.dataset.editorPlayer)){editorSelection=null;saveLineup(lineupContext);lineupModal(lineupContext,b.dataset.editorPlayer,$('modal-content').scrollTop);}draggedEditorPlayer=null;});
 $('modal-content').addEventListener('dragend',()=>draggedEditorPlayer=null);
 window.addEventListener('pagehide',checkpoint);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='game'&&game&&!['ended','career-pregame'].includes(game.phase)&&$('modal').hidden)pause();});
 window.addEventListener('popstate',()=>{if(screen==='game'&&game?.phase!=='ended'){if(game?.phase==='career-pregame'){careerDashboard();return;}pause();history.pushState({nightball:'game'},'',location.href);}else if(screen==='game'&&game?.worldFixture)worldDashboard();else if(screen==='game'&&game?.career)careerDashboard();else if(screen==='game'||screen==='apbc-cup'||screen==='career')home();});
 document.addEventListener('pointerdown',unlockAudio,{once:true});
 $('settings').innerHTML=svg('settings');$('pause').innerHTML=svg('pause');$('match-icon').innerHTML=svg('diamond');$('derby-icon').innerHTML=svg('bat');$('practice-icon').innerHTML=svg('target');$('swing-icon').innerHTML=svg('bat');$('pitching-icon').innerHTML=svg('ball');
 save();updateResume();history.replaceState({nightball:'home'},'',location.href);
 function updateCoach(g){
  const p=g.pitch,u=p?.progress||0;
  if(!g.defending&&g.phase==='pitch'&&u>=.92&&u<=1.09&&!p.timingCue){p.timingCue=true;if(settings.timingSound){sound('timing');vibrate(12);}}
 }
 let last=performance.now();
 function frame(now){
  requestAnimationFrame(frame);
  syncAudio();
  const dt=now-last;last=now;
  if(screen==='game'&&game){
   updatePlaySkip();
   if(review.playback){
    const state=review.frame(document.hidden?0:dt);
    if(state)renderer.render(state.game,state.time);
    else stopReplay();
   }else{
    const activeDt=document.hidden?0:dt;
    if(!game.paused)tickPlayFeedback(activeDt);
    const hold=playFeedback.scoreTime>0||playFeedback.callTime>0;
    const current=game;
    current.update(activeDt,hold||playFeedback.pendingReplay);
    if(screen!=='game'||game!==current)return;
    updateScoringChip(game);
    if(game.phase==='field'&&(game.isFixture||game.career||game.challenge))updateScoreCube($('scoreboard'),game);
    if(playFeedback.pendingReplay&&!game.paused&&game.phase==='result'&&
     !playFeedback.scoreTime&&!playFeedback.callTime&&$('modal').hidden){
     playFeedback.pendingReplay=false;launchReplay();
    }
    if(game.phase==='field')review.capture(game);
    if(game.derby)updateDerbyClock(game);
    if(!review.playback&&!playFeedback.pendingReplay&&!playFeedback.scoreTime&&!playFeedback.callTime&&queuedBench&&game.substitutionWindow&&!(game.defending&&game.phase==='windup')){queuedBench=false;benchModal();updateUI();}
    if(game.phase==='ended')queuedBench=false;
    if(game.phase==='field')renderer.adaptResolution?.(dt);
    if(game.phase!=='abs-review'&&(game.phase!=='abs-call'||absFrozenCall!==game.absCall)){
     absFrozenCall=game.absCall;
     renderer.render(game,game.time);
    }
    updateAbsUI(game,true);updateRunningUI(game);updateCoach(game);
   }
  }
 }
 requestAnimationFrame(frame);
 // PWA registration and safe update prompts are handled by pwa-update.js.
})();
