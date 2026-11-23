import { AbsReview, absActorBounds } from './abs-review.js?v=3';
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
 const defaults={gameLighting:'auto',hudScale:100,controlsScale:100,manualRunning:false,difficulty:'standard',sound:true,soundVolume:78,crowdVolume:50,vibration:true,assist:false,cursorVersion:4,cursorLift:80,cursorShift:64,timingGuide:true,battingAssist:true,timingSound:true,sensitivity:1,releaseSwing:true,leftHanded:false,fieldSpeed:1,innings:5,park:'night',pitcher:0,practiceClub:'owls',practiceBatter:'o1',practicePitch:'random',pitchingClub:'owls',pitchingPlayer:null,derbyPark:'tokyo-dome',derbyClub:'owls',derbyBatter:'o4',showTrace:true,matchTeam:'owls',matchOpponent:'foxes',matchUserHome:true,defenseSpeed:1,apbcTeam:'apbc-taipei',apbcOpponent:'apbc-japan',apbcUserHome:true,apbcInnings:5,apbcLineups:{},matchLineups:{},pennantGamesPerOpponent:4,tiebreak:false,injuries:'normal',tts:false,customDifficulty:{bat:0,pitch:0,field:0,run:0},order:NightPlayers.owls.map(p=>p.id)};
 const recordDefaults={games:0,wins:0,draws:0,hr:0,hits:0,maxDistance:0,bestTimedDerby:0,bestTimedDerbyDistance:0,perfect:0,grandSlam:false,ks:0,thrown:0,practicePitches:0,practiceHits:0,practiceHr:0,practiceMaxDistance:0,practiceThrown:0,practiceKs:0,achievements:{},winStreak:0,bestStreak:0};
 let settings,records;
 try{settings={...defaults,...JSON.parse(localStorage.getItem('nightball.settings')||'{}')};records={...recordDefaults,...JSON.parse(localStorage.getItem('nightball.records')||'{}')};}catch{settings={...defaults};records={...recordDefaults};}
 if(!['casual','standard','pro'].includes(settings.difficulty))settings.difficulty='standard';
 try{if(!JSON.parse(localStorage.getItem('nightball.settings')||'{}').cursorVersion){settings.difficulty='standard';settings.assist=false;}}catch{}if(settings.cursorVersion<4){settings.cursorLift=80;settings.cursorShift=64;settings.leftHanded=false;}settings.cursorVersion=4;settings.releaseSwing=true;settings.cursorShift=Math.max(0,Math.min(140,Number(settings.cursorShift)||0));
 settings.innings=[3,5,9].includes(settings.innings)?settings.innings:5;settings.fieldSpeed=settings.fieldSpeed===2?2:1;settings.pitcher=Math.max(0,Math.min(NightPlayers.homePitchers.length-1,settings.pitcher||0));settings.cursorLift=Math.max(0,Math.min(160,(Number.isFinite(Number(settings.cursorLift))?Number(settings.cursorLift):80)));if(!Array.isArray(settings.order)||settings.order.length!==9||new Set(settings.order).size!==9||settings.order.some(id=>!NightPlayers.rosters.owls.batters.some(p=>p.id===id)))settings.order=NightPlayers.owls.map(p=>p.id);
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchTeam))settings.matchTeam='owls';
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchOpponent)||settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;
 if(!settings.matchLineups||typeof settings.matchLineups!=='object'||Array.isArray(settings.matchLineups))settings.matchLineups={};
 settings.pennantGamesPerOpponent=Number.isInteger(settings.pennantGamesPerOpponent)?Math.max(1,Math.min(10,settings.pennantGamesPerOpponent)):4;
 settings.customDifficulty={bat:0,pitch:0,field:0,run:0,...(settings.customDifficulty&&typeof settings.customDifficulty==='object'?settings.customDifficulty:{})};
 for(const k of ['bat','pitch','field','run'])settings.customDifficulty[k]=Math.max(-10,Math.min(10,Math.round(Number(settings.customDifficulty[k])||0)));
 globalThis.NightGameCustomDifficulty=settings.customDifficulty;
 if(!records.achievements||typeof records.achievements!=='object')records.achievements={};
 records.winStreak??=0;records.bestStreak??=0;
 settings.soundVolume=Math.max(0,Math.min(100,Number.isFinite(Number(settings.soundVolume))?Number(settings.soundVolume):78));
 settings.crowdVolume=Math.max(0,Math.min(100,Number.isFinite(Number(settings.crowdVolume))?Number(settings.crowdVolume):50));
 settings.music=musicSettings(settings.music);
 for(const name of ['hudScale','controlsScale'])settings[name]=Math.max(75,Math.min(120,Number(settings[name])||100));
 settings.gameLighting=gameLightingMode(settings.gameLighting);
 window.nightSettings=settings;
 const stadiumAudio=new NightAudio(),songVault=new SongVault(),ballparkMusic=new BallparkMusic(stadiumAudio,songVault);
 const review=new PlayReview();
 let game=null,screen='home',modalKind='',saved=false,pendingSpectate=false,pendingUmpire=false,lastMode='match',lastFocus=null,toastTimer;
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
  const home=matchClub(settings.matchTeam),away=matchClub(settings.matchOpponent),pair=home.id+'/'+away.id;
  if($('menu-matchup').dataset.clubs!==pair){$('menu-matchup').dataset.clubs=pair;$('menu-matchup').innerHTML=`<span>${home.logo?`<img src="${home.logo}" alt="" width="56" height="56">`:'<b>夢</b>'}</span><i>VS</i><span>${away.logo?`<img src="${away.logo}" alt="" width="56" height="56">`:'<b>夢</b>'}</span>`;}
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
 function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('show');$('toast').textContent='';},2500);}
 function modal(html,kind){$('modal-content').dataset.kind=kind;if(game?.phase!=='ended')stadiumAudio.stopEffects();if(kind!=='music-settings')ballparkMusic.stop('preview');const same=modalKind===kind;if(!same)lastFocus=document.activeElement;modalKind=kind;$('modal-content').innerHTML=html;$('modal-content').scrollTop=0;$('modal').hidden=false;document.body.style.overflow='hidden';if(!same)setTimeout(()=>{if(modalKind===kind)$('modal-content').querySelector('button')?.focus({preventScroll:true});},30);}
 function closeModal(resume=true){const previous=modalKind;ballparkMusic.stop('preview');$('modal').hidden=true;document.body.style.overflow='';modalKind='';if(resume&&game&&screen==='game'&&game.phase!=='ended')game.paused=false;lastFocus?.focus?.({preventScroll:true});if(resume&&game&&screen==='game')updateUI();if(resume&&game?.phase==='career-ready')$('career-field-overlay').querySelector('button')?.focus({preventScroll:true});if(resume&&screen==='game'&&game?.phase==='ended'&&!['result','career-result'].includes(previous))finish(game);}
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
   if(league){league.managed=true;NightPennant.injuryRate=settings.injuries||'normal';}
  }catch{}
  resetLeaguePicker();
 }
 loadLeague(selectedLeague);
 function saveLeague(){NightPennant.injuryRate=settings.injuries||'normal';try{localStorage.setItem(leagueSaveKey(league.leagueId),JSON.stringify(league));}catch{if(!leagueSaveWarned){toast('保存容量が足りません。画面を閉じると進行状況を失う場合があります');leagueSaveWarned=true;}}}
 const leagueTabs=()=>`<div class="pennant-league-options" role="group" aria-label="ペナントのリーグ">${Object.entries(pennantLeagues).map(([id,label])=>`<button data-pennant-league="${id}" aria-pressed="${id===selectedLeague}">${label}</button>`).join('')}</div>`;
 let dreamCache=null;
 function dreamClub(){
  if(dreamCache)return dreamCache;
  const seen=new Set(),batters=[],pitchers=[];
  for(const c of [...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])]){for(const p of c.batters)if(!seen.has(p.id)){seen.add(p.id);batters.push(p);}for(const p of c.pitchers)if(!seen.has(p.id)){seen.add(p.id);pitchers.push(p);}}
  batters.sort((a,b)=>(b.contact+b.power+b.run*.5+b.field*.3)-(a.contact+a.power+a.run*.5+a.field*.3));
  pitchers.sort((a,b)=>(b.velocity+b.control+b.movement+b.stamina*.5)-(a.velocity+a.control+a.movement+a.stamina*.5));
  const bs=batters.slice(0,24),ps=pitchers.slice(0,10),order=bs.slice(0,9),fielding={};
  for(const p of order)if(p.pos&&p.pos!=='DH'&&!fielding[p.pos])fielding[p.pos]=p.id;
  dreamCache={id:'dream',name:'ドリームチーム',short:'ドリーム',park:'tokyo-dome',color:'#7a5cff',accent:'#ffd34d',scoreMark:'夢',logo:null,batters:bs,pitchers:ps,startingOrder:order.map(p=>p.id),startingFielding:fielding};
  return dreamCache;
 }
 function matchClub(id){return id==='dream'?dreamClub():NightTeams.get(id);}
 const clubBadge=(id,small=false)=>{
  const c=NightCareerLife.foreignClub(id)||matchClub(id);
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
  return `<div class="fixture-row ${own?'own-fixture':''}"><div class="fixture-team">${clubBadge(a.id,true)}<b>${a.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${a.id===league.clubId?'<i>自分</i>':''}</div><div class="fixture-score"><strong>${r?`${r.awayScore}<span> − </span>${r.homeScore}`:'vs'}</strong><small>${r?r.cold?`${r.innings}回コールド`:r.innings>1?`延長${r.innings}回`:'試合終了':'試合前'}</small></div><div class="fixture-team right"><b>${h.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${clubBadge(h.id,true)}${h.id===league.clubId?'<i>自分</i>':''}</div></div>`;
 }
 function championshipCeremony(){
  if(!league?.postseasonCompleted||league.postseason.champion!==league.clubId||league.celebrated)return;
  league.celebrated=true;saveLeague();unlockAchievement('champion');
  showCelebration('優勝！',league.club.short+' チャンピオン',5200);
  modal(modalTitle('','🏆 優勝セレモニー')+'<p class="career-status-line">'+league.club.name+' が'+(league.isNPB?'日本シリーズ':'プレーオフ')+'を制覇しました！</p><p class="modal-note">'+(league.season||1)+'年目のチャンピオンです。おめでとうございます。</p><button class="primary-button" data-action="close">閉じる</button>','ceremony');
 }
 function leagueDashboard(){
  if(!league){leaguePicker();return;}championshipCeremony();if(league.postseason){playoffDashboard();return;}showLeagueScreen();
  const f=league.activeFixture,r=league.results[f.id],isHome=f.home===league.clubId,opponent=NightTeams.get(isHome?f.away:f.home),row=league.standings().find(s=>s.id===league.clubId),won=r&&(isHome?r.homeScore>r.awayScore:r.awayScore>r.homeScore),ownScore=r?(isHome?r.homeScore:r.awayScore):0,oppScore=r?(isHome?r.awayScore:r.homeScore):0;
  const leaders=league.standings().filter(s=>s.rank===1),champion=league.completed?league.playoffSeeds()[0].clubId===league.clubId:leaders.some(s=>s.id===league.clubId),resume=!!league.currentGame;
  const matchNumber=league.played+(r?0:1);
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">← ホーム</button><h1>ペナント</h1></div>${leagueTabs()}<div class="league-club-header">${clubBadge(league.clubId)}<div><span class="eyebrow">YOUR CLUB</span><h1>${league.club.short}</h1><div class="season-summary"><span><b>${row.rank}</b>位</span><span><b>${row.wins}</b>勝 <b>${row.losses}</b>敗</span><span>得失差 <b>${row.diff>0?'+':''}${row.diff}</b></span></div></div></div><div class="season-progress"><i style="width:${league.played/league.totalGames*100}%"></i></div><div class="season-caption"><span>${league.completed?'全日程終了':`第${matchNumber}戦`}</span><span>${league.played} / ${league.totalGames} 試合終了</span></div>${league.completed?`<div class="champion-banner"><span>SEASON FINALE</span><strong>${champion?'シーズン1位':'シーズン終了'}</strong><p>${champion?(league.isNPB?'CSはファイナルステージから出場。':'プレーオフは決勝から出場。'):`あなたの球団は${row.rank}位でシーズン終了。`}<br>${leaders.map(s=>NightTeams.get(s.id).short).join(' / ')}${leaders.length>1?'が同率首位':'が通常シーズン首位'}</p></div>`:''}${league.allstarDue?`<div class="league-injuries"><b>オールスター</b><span>シーズン中盤のオールスターゲームを開催できます</span><button class="league-inline-button" data-league-action="allstar">開催する</button></div>`:''}${league.tradeOffer&&!league.currentGame?`<div class="league-injuries trade-offer"><b>トレード提案</b><span>${NightTeams.get(league.tradeOffer.fromClub)?.short||''}の ${league.tradeOffer.giveName} ⇄ あなたの ${league.tradeOffer.takeName}</span><button class="league-inline-button" data-league-action="trade-accept">承諾</button><button class="league-inline-button" data-league-action="trade-decline">見送る</button></div>`:''}${(()=>{const inj=Object.values(league.injuries||{}).filter(i=>i.clubId===league.clubId&&i.returnRound>league.round&&league.round>i.fromRound);return inj.length?`<div class="league-injuries"><b>離脱中</b>${inj.map(i=>`<span>${i.name}（あと${i.returnRound-league.round}節）</span>`).join('')}</div>`:'';})()}<section class="league-match-card ${r?won?'won':'lost':''}"><div class="league-card-kicker"><span>${r?'試合結果':resume?'試合中':'次の試合'}</span><span>第${matchNumber}戦 · ${isHome?'後攻':'先攻'}</span></div>${r?`<div class="league-result-title">${won?'勝 利':'敗 戦'}</div><div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><strong class="final-score"><b>${ownScore}</b><span>−</span><b>${oppScore}</b></strong><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>試合終了${r.innings>1?` ・ 延長${r.innings}回`:''}</p>`:`<div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><span class="versus-label">VS</span><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>${isHome?'あなたは後攻。投球からスタート。':'あなたは先攻。打撃からスタート。'}<br>1回制 / 2アウト満塁 / 同点は延長</p>`}<button class="primary-button" data-league-action="${r?league.completed?'playoff-start':'next':'play'}">${r?league.completed?(league.isNPB?'クライマックスシリーズへ':'プレーオフへ'):'次の試合へ':resume?'再開':'試合開始'}　↗</button>${r?.report?resultReportHTML(r.report):''}${!r&&!resume?'<button class="league-inline-button" data-league-action="lineup">オーダー編成</button>':''}${r&&game?.mode==='pennant'&&game.leagueFixtureId===f.id?'<button class="league-inline-button" data-league-action="box">この試合の打撃成績</button>':''}</section>${r?`<div class="league-section-head"><h2>第${league.round+1}節の全結果</h2><span>先攻　／　後攻</span></div><div class="fixture-list">${league.schedule[league.round].map(fixtureHTML).join('')}</div>`:''}${standingsHTML()}${otherStandingsHTML()}<details class="league-schedule"><summary>日程・結果 <span>＋</span></summary>${league.schedule.map((fixtures,i)=>`<div class="schedule-round"><b>第${i+1}節 ${i===league.round?'・現在':fixtures.some(f=>[f.home,f.away].includes(league.clubId))?'':'・休み'}</b>${fixtures.map(fixtureHTML).join('')}</div>`).join('')}</details><div class="league-rule compact-rule"><b>2アウト満塁</b><p>同点は延長。延長も2アウト満塁。走塁は設定で切替。</p></div>${league.news?.length?`<div class="league-section-head"><h2>リーグニュース</h2></div><div class="fixture-list">${league.news.slice(0,5).map(n=>`<div class="fixture-row"><small>第${n.round+1}節</small><span>${n.text}</span></div>`).join('')}</div>`:''}<button class="secondary-button" data-league-action="roster">選手データ</button><button class="secondary-button" data-league-action="farm">二軍（ファーム）</button><button class="secondary-button" data-league-action="leaders">個人成績ランキング</button><button class="secondary-button" data-league-action="form">順位・成績の推移</button>${league.completed?'<button class="secondary-button" data-league-action="awards">シーズン表彰</button>':''}${league.completed?`<button class="secondary-button" data-league-action="offseason">${league.offseason?'ドラフトの続き':'ドラフトして来シーズンへ'}</button>`:''}<button class="league-inline-button" data-league-action="picker">${league.leagueId==='npb'?'リーグを選ぶ':'新しいペナント'}</button><p class="league-footnote">同節のほか${league.schedule[league.round].length-1}試合は自動進行。球団能力をもとに同じ特別ルールで結果を計算します。</p>`;
 }
 function playoffDashboard(){
  showLeagueScreen();$('pennant').innerHTML=playoffHTML(league,leagueTabs())+`<details class="league-schedule"><summary>通常シーズンの順位</summary>${standingsHTML()}</details>${otherStandingsHTML()}<button class="secondary-button" data-league-action="roster">選手データ</button>${league.postseasonCompleted?`<button class="secondary-button" data-league-action="offseason">${league.offseason?'ドラフトの続き':'ドラフトして来シーズンへ'}</button>`:''}`;
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
   game=new NightGame('pennant',settings.difficulty,onEvent,{npbPostseason:league.isNPB&&f.playoff,innings:f.innings,maxInnings:f.maxInnings,drawClinches:f.drawClinches,homeTeamId:f.home,awayTeamId:f.away,userHome:f.home===league.clubId,park:NightTeams.get(f.home).park,defenseSpeed:settings.defenseSpeed,opponentPitcher:league.starterIndexFor(f.away),pitcher:lineupConfig('league').config.pitcher,order:lineupConfig('league').config.order,fielding:lineupConfig('league').config.fielding,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,tiebreak:settings.tiebreak,injured:{home:[...league.injuredIds(f.home),...league.farmIds(f.home)],away:[...league.injuredIds(f.away),...league.farmIds(f.away)]},clubs:{home:league.clubRoster(f.home),away:league.clubRoster(f.away)}});game.leagueFixtureId=f.id;
  }
  $('distance').textContent='';$('timing-result').textContent='';activateGame();onEvent('clear');if(game.phase==='intro')game.message('PENNANT PLAY BALL',`${league.postseason?(league.isNPB?NightNPBPostseason.title(league.activeSeries):league.activeSeries.id==='qualifier'?'準決勝':'決勝')+' 第'+f.game+'戦':'第'+(league.played+1)+'戦'} · ${game.userHome?'後攻':'先攻'}でプレイ`,game.loadedStart?'1回制 / 毎回2アウト満塁 / 同点は延長':f.maxInnings?'9回制 / 延長12回まで':'9回制 / 延長無制限');else if(['result','change'].includes(game.phase)){const last=game.log.at(-1);if(last)onEvent('message',last);}updateUI();
 }
 function foldLeagueStats(g){
  const stats=league.playerStats||={};
  const clubOf=id=>{for(const side of ['home','away']){const club=g.teams[side];if([...club.batters,...club.pitchers].some(p=>p.id===id))return club;}return null;};
  const row=(id,club)=>stats[club.id+'/'+id]||={name:([...club.batters,...club.pitchers].find(p=>p.id===id)?.name||id),clubId:club.id,pos:([...club.batters,...club.pitchers].find(p=>p.id===id)?.pos||'DH'),pa:0,ab:0,h:0,hr:0,rbi:0,outs:0,k:0,runs:0,pitches:0,bb:0,doubles:0,triples:0};
  for(const [id,s] of Object.entries(g.box||{})){const club=clubOf(id);if(!club)continue;const r=row(id,club);r.pa+=s.pa||0;r.ab+=s.ab||0;r.h+=s.h||0;r.hr+=s.hr||0;r.rbi+=s.rbi||0;r.bb+=s.bb||0;r.doubles+=s.doubles||0;r.triples+=s.triples||0;}
  for(const [id,s] of Object.entries(g.pitchingStats||{})){const club=clubOf(id);if(!club)continue;const r=row(id,club);r.outs+=s.outs||0;r.k+=s.k||0;r.runs+=s.runs||0;r.pitches+=s.pitches||0;}
 }
 function leadersModal(){
  const rows=Object.values(league.playerStats||{});
  const bat=rows.filter(r=>r.ab>=3),pit=rows.filter(r=>r.outs>=9);
  const list=(title,items,fmt)=>`<h3 class="arcade-section-title">${title}</h3>${items.length?items.map((r,i)=>`<div class="career-list-row"><div><b>${i+1}. ${r.name}</b><small>${NightTeams.get(r.clubId)?.short||''}</small></div><strong>${fmt(r)}</strong></div>`).join(''):'<p class="modal-note">まだ記録がありません</p>'}`;
  modal(`${modalTitle('','個人成績ランキング')}<p class="modal-note">シーズン全試合（自動進行分も含む）の通算成績です。</p>${list('打率',[...bat].sort((a,b)=>b.h/Math.max(1,b.ab)-a.h/Math.max(1,a.ab)).slice(0,10),r=>(r.h/r.ab).toFixed(3).replace(/^0/,''))}${list('本塁打',[...bat].sort((a,b)=>b.hr-a.hr||b.rbi-a.rbi).slice(0,10),r=>r.hr+' 本')}${list('打点',[...bat].sort((a,b)=>b.rbi-a.rbi).slice(0,10),r=>r.rbi+' 打点')}${list('防御率',[...pit].sort((a,b)=>a.runs*27/Math.max(1,a.outs)-b.runs*27/Math.max(1,b.outs)).slice(0,10),r=>(r.runs*27/r.outs).toFixed(2))}${list('奪三振',[...pit].sort((a,b)=>b.k-a.k).slice(0,10),r=>r.k+' K')}<button class="primary-button" data-action="close">閉じる</button>`,'leaders');
 }
 function draftModal(){
  if(!league?.offseason)return;
  league.runCpuPicks();saveLeague();
  let faHTML='';
  if(league.draftDone&&!league.faDone&&league.ensureFaMarket()){
   const fa=league.offseason.fa,pts=fa.points[league.clubId]??0;
   const line=p=>p.pos==='P'?`投手 球速${p.velocity} 制球${p.control} スタミナ${p.stamina}`:`${p.pos} ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`;
   faHTML=`<h3 class="arcade-section-title">FA市場（残り ${pts} pt）</h3><p class="modal-note">ドラフト後のFA市場です。獲得にはサインポイントを使います（各球団100pt、コストは能力に応じて12〜60pt）。他球団を自由契約になった選手も市場に出ます。CPU球団も獲得し、残りポイントは来季に持ち越せません。</p>${fa.signed.filter(s=>s.clubId===league.clubId).map(s=>`<div class="career-list-row"><div><b>${s.name}</b><small>獲得済み · ${s.cost}pt</small></div></div>`).join('')}${[...fa.pool].sort((a,b)=>league.playerValue(b)-league.playerValue(a)).map(p=>{const cost=league.faCost(p);return `<div class="career-list-row"><div><b>${p.name}</b><small>${line(p)}${league.ages[p.id]?' · '+league.ages[p.id]+'歳':''}</small></div>${cost<=pts?`<button class="league-inline-button" data-fa-sign="${p.id}">獲得 ${cost}pt</button>`:`<strong>${cost}pt</strong>`}</div>`;}).join('')||'<p class="modal-note">市場に選手はいません</p>'}`;
   saveLeague();
  }
  const d=league.offseason,done=league.draftDone,currentClub=d.order[d.pickIndex%d.order.length],myTurn=!done&&currentClub===league.clubId;
  const taken=new Set(d.picks.map(k=>k.playerId)),pool=d.pool.filter(p=>!taken.has(p.id)).sort((a,b)=>league.playerValue(b)-league.playerValue(a));
  const poolHTML=pool.map(p=>`<div class="career-list-row"><div><b>${p.name}</b><small>${p.pos==='P'?`投手 球速${p.velocity} 制球${p.control} スタミナ${p.stamina}`:`${p.pos} ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`}</small></div>${myTurn?`<button class="league-inline-button" data-draft-pick="${p.id}">指名</button>`:`<strong>${league.playerValue(p).toFixed(0)}</strong>`}</div>`).join('');
  const picksHTML=d.picks.map((k,i)=>`<div class="career-list-row"><div><b>${i+1}. ${k.name}</b><small>${NightTeams.get(k.clubId)?.short||''} · ${k.pos}</small></div></div>`).join('');
  modal(`${modalTitle('',(league.season||1)+'年目 ドラフト会議')}<p class="modal-note">${done?'全指名が終了しました。':myTurn?'あなたの指名ターンです。候補から1名選んでください。':`${NightTeams.get(currentClub)?.short||''}の指名ターン`}</p>${picksHTML?`<h3 class="arcade-section-title">指名済み</h3>${picksHTML}`:''}<h3 class="arcade-section-title">候補選手</h3>${poolHTML}${faHTML}${done?(league.faDone?'<button class="primary-button" data-action="draft-finish">来シーズンを開始</button>':'<button class="primary-button" data-action="fa-finish">FAを終えて来シーズンへ</button>'):'<button class="primary-button" data-action="close">閉じる</button>'}`,'draft');
 }
 function awardsModal(){
  if(!league)return;const a=league.seasonAwards(),club=r=>NightTeams.get(r.clubId)?.short||'';
  const batLine=r=>`打率${a.avg(r).toFixed(3).replace(/^0/,'')} · ${r.hr}本塁打 · ${r.rbi}打点`;
  const pitLine=r=>`防御率${a.era(r).toFixed(2)} · ${r.k}奪三振 · ${(r.outs/3).toFixed(1)}回`;
  const head=(title,r,line,score)=>r?`<h3 class="arcade-section-title">${title}</h3><div class="career-list-row"><div><b>${r.name}</b><small>${club(r)}</small></div><strong>${score}</strong></div><p class="modal-note">${line}</p>`:'';
  modal(`${modalTitle('','シーズン表彰')}${head('MVP',a.mvp,a.mvp?batLine(a.mvp):'',a.mvp?a.batScore(a.mvp).toFixed(0)+' pts':'')}${head('最優秀投手',a.bestPitcher,a.bestPitcher?pitLine(a.bestPitcher):'',a.bestPitcher?a.pitScore(a.bestPitcher).toFixed(0)+' pts':'')}${head('新人王',a.rookie,a.rookie?(a.rookie.outs>=12&&a.rookie.ab<8?pitLine(a.rookie):batLine(a.rookie)):'','')}<h3 class="arcade-section-title">ベストナイン</h3>${a.bestNine.length?a.bestNine.map(({pos,player})=>`<div class="career-list-row"><div><b>${pos}　${player.name}</b><small>${club(player)}</small></div><strong>${pos==='P'?'防御率 '+a.era(player).toFixed(2):'打率 '+a.avg(player).toFixed(3).replace(/^0/,'')}</strong></div>`).join(''):'<p class="modal-note">まだ記録が不足しています。</p>'}<button class="primary-button" data-action="close">閉じる</button>`,'awards');
 }
 function formGraphModal(){
  if(!league)return;const hist=league.history||[];
  if(hist.length<2){modal(`${modalTitle('','順位・成績の推移')}<p class="modal-note">節が進むと、ここに順位の推移グラフが表示されます。</p><button class="primary-button" data-action="close">閉じる</button>`,'form');return;}
  const clubs=league.clubs,W=320,H=170,pad=18;
  const x=i=>pad+i*(W-2*pad)/Math.max(1,hist.length-1),y=r=>pad+(r-1)*(H-2*pad)/Math.max(1,clubs.length-1);
  const lines=clubs.map(c=>{const pts=hist.map((h,i)=>h.ranks[c.id]?`${x(i).toFixed(1)},${y(h.ranks[c.id]).toFixed(1)}`:null).filter(Boolean).join(' ');const own=c.id===league.clubId;return `<polyline points="${pts}" fill="none" stroke="${own?'#ffd34d':c.color}" stroke-width="${own?3:1.2}" opacity="${own?1:.55}"/>`;}).join('');
  const userRows=hist.map(h=>`<div class="career-list-row"><div><b>第${h.round+1}節</b><small>${h.ranks[league.clubId]}位</small></div><strong>${h.user.avg!=null?'打率 '+h.user.avg.toFixed(3).replace(/^0/,''):'―'}${h.user.era!=null?' · 防御率 '+h.user.era.toFixed(2):''}</strong></div>`).join('');
  modal(`${modalTitle('','順位・成績の推移')}<svg viewBox="0 0 ${W} ${H}" class="form-graph" role="img" aria-label="順位推移グラフ">${lines}</svg><div class="form-legend">${clubs.map(c=>`<span><i style="background:${c.id===league.clubId?'#ffd34d':c.color}"></i>${c.short}</span>`).join('')}</div><h3 class="arcade-section-title">自球団の推移（累計）</h3>${userRows}<button class="primary-button" data-action="close">閉じる</button>`,'form');
 }
 function farmModal(){
  if(!league)return;
  const roster=league.clubRoster(league.clubId),farm=new Set(league.farmIds(league.clubId)),inj=new Set(league.injuredIds(league.clubId));
  const row=p=>`<div class="career-list-row"><div><b>${p.name}</b><small>${p.pos==='P'||p.velocity?`投手 球速${p.velocity} 制球${p.control} スタミナ${p.stamina}`:`${p.pos} ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`}${inj.has(p.id)?' · 負傷中（二軍で調整すると復帰が早まる）':''} · 育成ボーナス +${league.farmProgress[p.id]?.bonus||0}/6</small></div><button class="league-inline-button" data-farm-player="${p.id}">${farm.has(p.id)?'一軍へ昇格':'二軍へ降格'}</button></div>`;
  modal(`${modalTitle('','二軍（ファーム）')}<p class="modal-note">二軍の選手は一軍の試合（プレイ・シミュレーションとも）に出場しません。節ごとに少しずつ成長し（最大+6）、負傷中の選手は復帰が早まります。入れ替えは次の試合から反映されます。</p><h3 class="arcade-section-title">野手</h3>${roster.batters.map(row).join('')}<h3 class="arcade-section-title">投手</h3>${roster.pitchers.map(row).join('')}<button class="primary-button" data-action="close">閉じる</button>`,'farm');
 }
 function allstarModal(){
  if(!league?.allstarDue)return;
  const {home,away}=league.allstarClubs();
  const list=c=>`<h3 class="arcade-section-title">${c.name}</h3>${c.batters.slice(0,9).map(p=>`<div class="career-list-row"><div><b>${p.name}</b><small>${p.pos}</small></div></div>`).join('')}<p class="modal-note">先発投手: ${c.pitchers[0]?.name||'―'}</p>`;
  modal(`${modalTitle('','オールスターゲーム')}<p class="modal-note">シーズン前半の成績で選出しました（成績が少ない選手は能力値で選出）。あなたはホームチームを操作します。</p>${list(away)}${list(home)}<button class="primary-button" data-action="allstar-play">試合をする</button><button class="secondary-button" data-action="allstar-sim">シミュレート</button><button class="secondary-button" data-action="close">閉じる</button>`,'allstar');
 }
 function playAllstar(){
  if(!league?.allstarDue)return;
  const {home,away}=league.allstarClubs();
  closeModal(false);unlockAudio();lastMode='match';saved=false;
  game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist});
  game.allstarEvent=true;
  activateGame();updateStyle();updateUI();
 }
 function finishLeague(g){
  if(!league||g.leagueFixtureId!==league.activeFixture.id)return;
  if(league.completeActiveGame(g)){foldLeagueStats(g);league.activeResult.report=buildMatchReport(g);commit(g);checkAchievements(g);if(league.completed&&league.playoffSeeds()[0]?.clubId===league.clubId)unlockAchievement('seasonFirst');saveLeague();if(g.userScore>g.opponentScore)sound('win');}
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
   case'create':if(selectedLeague==='npb')break;league=new NightPennant(selectedClub,selectedGamesPerOpponent);league.managed=true;saveLeague();game=null;leagueDashboard();break;
   case'play':playLeague();break;
   case'playoff-start':if(league.startPlayoffs()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-next':if(league.nextPlayoff()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-simulate':if(league.simulatePlayoffGame()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-report':playoffReport();break;
   case'lineup':lineupModal('league');break;
   case'next':if(league.next()){game=null;saveLeague();leagueDashboard();}break;
   case'box':boxModal();break;
   case'roster':rosterModal(null,game?.mode==='pennant'?game.userSide:'home');break;
   case'farm':farmModal();break;
   case'allstar':allstarModal();break;
   case'leaders':leadersModal();break;
   case'awards':awardsModal();break;
   case'form':formGraphModal();break;
   case'trade-accept':if(league.acceptTrade()){saveLeague();leagueDashboard();}break;
   case'trade-decline':league.declineTrade();saveLeague();leagueDashboard();break;
   case'offseason':if(league.offseason)draftModal();else if(league.beginOffseason()){saveLeague();draftModal();}break;
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
  if(game?.mode==='pennant'&&league&&!league.activeRoundDone&&game.leagueFixtureId===league.activeFixture.id&&game.phase!=='ended'){league.currentGame=game.snapshot();saveLeague();}if(screen==='game'&&game?.apbcFixtureId&&game.apbcFixtureId===tournament?.active?.id&&game.phase!=='ended'){tournament.currentGame=game.snapshot();saveTournament();}if(game?.mode==='match'&&!game.apbcFixtureId&&!game.ctFixture&&!game.onlineGame&&!saved&&game.phase!=='ended')try{localStorage.setItem('nightball.match',JSON.stringify(game.snapshot()));}catch{}updateResume();}
 function clearCheckpoint(){try{localStorage.removeItem('nightball.match');}catch{}updateResume();}
 function activateGame(){
  if(!game.umpireMode&&(game.career||game.worldFixture||game.mode==='match'&&!game.competition&&!game.apbcFixtureId)){
   game.absRemaining??=2;
   game.absCpuRemaining??=2;
  }
  if(game.career||game.worldFixture||game.mode==='pennant'||game.mode==='match'&&!game.competition&&!game.apbcFixtureId){
   game.playChallenges??=2;
   game.playCpuChallenges??=2;
  }
  stopReplay();review.reset();resetPlayFeedback();[...$('bases').children].forEach(e=>e.classList.remove('on'));$('bases').setAttribute('aria-label','走者なし');updatePlayTools();updateChallenge();resetCareerOverlay();$('career').hidden=true;queuedBench=false;stadiumAudio.stopEffects();screen='game';$('apbc-cup').hidden=true;$('home').hidden=true;$('pennant').hidden=true;$('game').hidden=false;$('pause').hidden=false;$('settings').hidden=false;document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);history.replaceState({nightball:'home'},'',location.href);history.pushState({nightball:'game'},'',location.href);window.scrollTo(0,0);renderer.resize();}
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
 const careerBatLabels={single:'安打',double:'二塁打',triple:'三塁打',hr:'本塁打',walk:'四球',hbp:'死球',strikeout:'三振',
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
  const club=kind==='league'?league.clubRoster(league.clubId):kind==='apbc'?NightTeams.get(settings.apbcTeam):matchClub(settings.matchTeam);
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
  modal(`${modalTitle('',kind.startsWith('apbc')?'APBC オーダー編成':'オーダー編成')}<div class="editor-toolbar">${kind==='edit'?`<select id="editor-club" class="field-select" aria-label="編成する球団">${NightTeams.matchTeams.map(c=>`<option value="${c.id}" ${c.id===club.id?'selected':''}>${c.short}</option>`).join('')}</select>`:`<span class="editor-club">${clubBadge(club.id,true)}<b>${club.short}</b></span>`}<button class="arcade-go" data-action="${kind==='edit'?'editor-done':'lineup-play'}">${kind==='edit'?'決定':'試合開始'}</button></div>${kind==='apbc'?`<p class="apbc-roster-status">${club.rosterStatus}</p>`:''}<p class="editor-hint" role="status">${editorSelection?`${([...players,...bench].find(p=>p.id===editorSelection)?.name||'選択した選手')}を選択中。入れ替える相手をタップ`:'選手を2人タップして交換'}</p><div class="squad-board"><section class="squad-column"><h3>スタメン</h3><div class="squad-list">${rows}</div></section><section class="squad-column reserves"><h3>控え <small>${bench.length}人</small></h3><div class="squad-list">${bench.map(p=>playerTile(p,{club,selected:editorSelection===p.id,attrs:`data-editor-player="${p.id}" draggable="true"`})).join('')}</div></section></div><section class="editor-preview"><div>${fittedName(selected.name,'strong','editor-selected-name')}<small>#${selected.no} 本職 ${NightSquad.label(selected.pos)} / ${selected.hand==='L'?'左':'右'}打</small></div><span class="rating-tiles">${batRatings(selected)}</span></section><div class="editor-actions"><button data-editor-auto>おまかせ</button><button data-editor-reset>リセット</button></div><details class="editor-pitchers"><summary>先発投手 ${fittedName(starter.name,'b','editor-starter-name')}<span>${starter.velocity}km/h　▼</span></summary><div class="editor-pitcher-grid">${club.pitchers.map((p,i)=>`<button class="squad-player tone-pitcher ${config.pitcher===i?'chosen':''}" data-lineup-pitcher="${i}" aria-pressed="${config.pitcher===i}">${fittedName(p.name)}<small>${p.velocity}km/h · ${pitchRole(p)}${p.pitchingEstimated?' · 推定':''}</small></button>`).join('')}</div></details><details class="editor-player-detail"><summary>${fittedName(selected.name+'の能力','span','editor-detail-name')}</summary>${abilityHTML(selected)}</details><button class="secondary-button" data-action="lineup-back">戻る</button>`,'lineup');
  $('modal-content').scrollTop=scroll;$('modal-content').querySelectorAll('.squad-list').forEach((e,i)=>e.scrollTop=listScroll[i]||0);
 }
 let benchTab='hit',runnerBase=0,queuedBench=false;
 function requestBench(){if(!game?.isFixture||game.umpireMode||game.phase==='ended')return;if(game.substitutionWindow&&!(game.defending&&game.phase==='windup')){queuedBench=false;benchModal();}else{queuedBench=true;closeModal(false);game.paused=false;toast('このプレー後にベンチを開きます');updateUI();}}
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
  const own=matchClub(settings.matchTeam),opponent=matchClub(settings.matchOpponent);
  return `<div class="match-club-preview"><div>${clubBadge(own.id)}<b>${own.name}</b><small>あなた / ${settings.matchUserHome?'後攻':'先攻'}</small></div><span>VS</span><div>${clubBadge(opponent.id)}<b>${opponent.name}</b><small>対戦相手 / ${settings.matchUserHome?'先攻':'後攻'}</small></div></div>`;
 }
 function setupMatchTeams(){
  matchContext='match';
  const home=matchClub(settings.matchTeam),away=matchClub(settings.matchOpponent),current=matchPickSide==='home'?home:away;
  modal(`${modalTitle('','球団選択')}<div class="team-versus-picker"><button data-match-side="home" class="${matchPickSide==='home'?'selected':''}"><small>自チーム</small>${clubBadge(home.id)}<b>${home.short}</b></button><span>VS</span><button data-match-side="away" class="${matchPickSide==='away'?'selected':''}"><small>相手チーム</small>${clubBadge(away.id)}<b>${away.short}</b></button></div><div class="segmented npb-league-tabs" role="group" aria-label="球団のリーグ"><button data-match-group="cpbl" class="${matchClubGroup==='cpbl'?'active':''}" aria-pressed="${matchClubGroup==='cpbl'}">CPBL・6球団</button><button data-match-group="npb" class="${matchClubGroup==='npb'?'active':''}" aria-pressed="${matchClubGroup==='npb'}">NPB・14球団</button><button data-match-group="kbo" class="${matchClubGroup==='kbo'?'active':''}" aria-pressed="${matchClubGroup==='kbo'}">KBO・10球団</button></div>${matchClubGroup==='npb'?'<p class="modal-note">2026年公式成績から個別査定。ファーム2球団も選択可能。球速・球種などはゲーム用推定です。</p>':matchClubGroup==='kbo'?'<p class="modal-note">KBO 2026年公式成績から30選手ずつ査定。球速・球種に加え、未確認の投打・守備位置・背番号はゲーム用推定または未設定です。</p>':''}<button data-match-club="dream" class="dream-pick ${current.id==='dream'?'selected':''}" aria-pressed="${current.id==='dream'}">★ ドリームチーム（全リーグのオールスター編成）</button><div class="team-select-grid">${(matchClubGroup==='npb'?NightTeams.npb:matchClubGroup==='kbo'?NightTeams.kbo:NightTeams.all).map(c=>`<button data-match-club="${c.id}" class="${current.id===c.id?'selected':''}" aria-pressed="${current.id===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div><button class="primary-button" data-action="match-team-next">試合設定へ</button>`,'match-teams');
 }
 function setupMatch(){
  const pending=!$('resume-game').hidden,{club,config}=lineupConfig('match');
  modal(`${modalTitle('','試合設定')}${matchTeamsHTML()}<button class="league-inline-button" data-action="match-teams">チームを変更</button><div class="setup-section"><label>先攻・後攻</label><div class="segmented">${[[false,'先攻','打撃から'],[true,'後攻','守備から']].map(([home,label,sub])=>`<button data-match-home="${home}" class="${settings.matchUserHome===home?'active':''}" aria-pressed="${settings.matchUserHome===home}">${label}<small>${sub}</small></button>`).join('')}</div></div><div class="setup-section"><label>試合の長さ</label><div class="segmented">${[3,5,9].map(n=>`<button data-innings="${n}" class="${settings.innings===n?'active':''}">${n}イニング<small>${n===9?'フル':n===5?'通常':'短め'}</small></button>`).join('')}</div></div><div class="setup-section"><label for="park-select">球場</label><select id="park-select" class="field-select">${parkOptions(settings.park)}</select><div id="match-park-dimensions">${parkDimensions(NightPlayers.parks.find(p=>p.id===settings.park)||NightPlayers.parks[0])}</div></div>${lightingField()}<div class="setup-section"><label for="starter-select">先発投手</label><select id="starter-select" class="field-select">${club.pitchers.map((p,i)=>`<option value="${i}" ${config.pitcher===i?'selected':''}>${p.name} · ${p.velocity}km/h · ${p.trait}</option>`).join('')}</select></div><p class="modal-note">${settings.matchUserHome?'後攻':'先攻'} / 同点は引き分け。走塁は設定で切替。${pending?'<br>開始すると、中断中の試合を置き換えます。':''}</p><button class="primary-button" data-action="match-lineup">オーダー編成へ</button><button class="secondary-button" data-action="spectate-start">観戦モードで開始（両チーム自動）</button><button class="secondary-button" data-action="roster">選手の能力を見る</button>`,'setup');
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
  return `<div class="ability-hero"><div class="ability-header"><span class="jersey-number">${p.no}</span><div><strong>${p.name}</strong><small>${p.pos} · ${p.hand==='S'?'両':p.hand==='L'?'左':'右'}${pitching?'投':'打'}</small><span class="trait-chip">${p.trait}</span>${!pitching&&p.stats?.pa>=150&&Number.isFinite(p.stats?.rbi)?(p.stats.rbi/p.stats.pa>=.155?'<span class="trait-chip">勝負強い</span>':p.stats.rbi/p.stats.pa<=.085?'<span class="trait-chip">チャンスに弱い</span>':''):''}${game?.isFixture?`<span class="trait-chip">今日の調子：${['絶不調','不調','普通','好調','絶好調'][game.conditionFor(p)+2]}</span>`:''}</div></div><div class="ability-bars ${pitching?'pitching-abilities':''}">${spec.map(([l,n,val])=>`<div class="ability-row"><span>${l}</span><i><i style="width:${n}%"></i></i><b class="grade-${NightPlayers.grade(n)}">${val||NightPlayers.grade(n)}${val?'':`<small>${n}</small>`}</b></div>`).join('')}</div><p class="ability-description">${descriptions[p.trait]||''}</p>${ratingEvidenceHTML(p)}${matchupEvidenceHTML(p)}${pitching?`<div class="stat-line">球種：${p.pitches.map(id=>NightGame.pitchSpec(p,id).short).join(' / ')}</div>`:stats?`<div class="stat-line">この試合：${stats.pa}打席　${stats.ab}打数 ${stats.h}安打 ${stats.hr}本塁打 ${stats.rbi}打点</div>`:''}</div>`;
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
 function tacticsModal(){if(!game)return;game.paused=true;modal(`${modalTitle('GAME PLAN','守備の作戦')}<p>次に打球が飛んだときの野手の初期位置を変えます。</p><div class="segmented">${[['normal','通常','バランス'],['in','前進守備','浅い打球に対応'],['deep','長打警戒','外野を深く']].map(([v,l,d])=>`<button data-defense="${v}" class="${game.defense===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><p class="modal-note">前進守備は頭上を越える打球、長打警戒は浅いヒットに弱くなります。</p><p>打者に合わせたシフト。</p><div class="segmented">${[['none','シフトなし','通常の守備位置'],['pull','引っ張りシフト','引っ張り方向へ寄せる']].map(([v,l,d])=>`<button data-shift="${v}" class="${game.shift===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><p class="modal-note">シフトは引っ張り方向のゴロに強くなる代わり、逆方向を突かれやすくなります。</p><button class="primary-button" data-action="close">プレイに戻る</button>`,'tactics');}
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
   <p class="modal-note">端末幅に合わせた標準サイズを基準に調整できます。${activeCareer?'':'試合中に設定を開くと、その場で反映を確認できます。'}</p></section><div id="thumb-preview-wrap">${thumbPreview()}</div><div class="setting-slider"><label for="cursor-shift">指から横への距離 <output id="shift-output">${settings.cursorShift}px</output></label><input id="cursor-shift" type="range" min="0" max="140" step="4" value="${settings.cursorShift}"></div><div class="setting-slider"><label for="cursor-lift">指から上への距離 <output id="lift-output">${settings.cursorLift}px</output></label><input id="cursor-lift" type="range" min="0" max="160" step="4" value="${settings.cursorLift}"></div><p class="modal-note">球場を押したまま親指を動かし、離して打撃・投球。照準は指の左上に表示されます。</p>${[['timingGuide','タイミングリング','リングが小さい円に重なったら離す'],['battingAssist','打撃アシスト','手前のボールを少しゆっくりにする'],['timingSound','離すタイミングの合図','音と対応端末の短い振動'],['leftHanded','左親指で操作','照準を指の右上に変更'],['assist','到達位置のガイド','予測位置を表示（練習用）'],['showTrace','前の投球位置を表示','次の投球前に確認'],['sound','サウンド','録音の打球・捕球音と観客の歓声'],['vibration','振動','ミートした手応え'],['tiebreak','延長タイブレーク','同点の延長は無死二塁から（最大3回まで）'],['tts','実況の音声読み上げ','打席の結果を端末の音声合成で読み上げる']].map(([v,l,d])=>`<div class="setting-row"><div><strong>${l}</strong><small>${d}</small></div><button class="toggle ${settings[v]?'on':''}" data-toggle="${v}" role="switch" aria-checked="${!!settings[v]}" aria-label="${l}"></button></div>`).join('')}<div class="setting-label">ペナントの故障発生</div><div class="segmented">${[['off','なし','故障は発生しない'],['low','少なめ','たまに離脱'],['normal','ふつう','現実的な頻度']].map(([v,l,d])=>`<button data-injury-rate="${v}" class="${(settings.injuries||'normal')===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><div class="audio-settings"><div class="setting-label">球場のサウンド</div><p class="modal-note">打球・グラブの録音と、プレーに反応する歓声。</p><div class="setting-slider"><label for="sound-volume">全体音量 <output id="sound-volume-output">${settings.soundVolume}%</output></label><input id="sound-volume" type="range" min="0" max="100" step="1" value="${settings.soundVolume}"></div><div class="setting-slider"><label for="crowd-volume">観客・歓声 <output id="crowd-volume-output">${settings.crowdVolume}%</output></label><input id="crowd-volume" type="range" min="0" max="100" step="1" value="${settings.crowdVolume}"></div><button class="secondary-button" data-action="music-settings">応援歌・アウト／三振の曲</button><div class="audio-preview-buttons"><button data-audio-test="perfect">打球音を試す</button><button data-audio-test="catch">捕球音を試す</button><button data-audio-test="homer">歓声を試す</button></div><details class="audio-credits"><summary>サウンド素材</summary><p>録音：martinimeniscus（打球・捕球）、eeease（球場環境）、benfree（歓声）、soundpost（スイッシュ）。CC0 1.0。編集・音量調整済み。</p><a href="./assets/audio/credits.json" target="_blank" rel="noopener">素材の出典・ライセンス一覧 ↗</a></details></div><div class="setting-label">${activeCareer?'キャリアの走塁':'走塁モード'}</div><div class="segmented">${[[false,"自動","状況に合わせて進塁"],[true,"手動",activeCareer?'自分の走者を操作':'走者を塁方向へスワイプ']].map(([manual,label,sub])=>`<button data-running-mode="${manual?"manual":"auto"}" class="${(activeCareer?(game?.career?game.manualRunning:career.manualRunning):(game?.manualRunning??settings.manualRunning))===manual?"active":""}">${label}<small>${sub}</small></button>`).join("")}</div><p class="modal-note">${activeCareer?'手動では、自分が打った直後の打者走者に進塁・帰塁を指示します。味方走者は自動です。':'手動では走者を塁方向へスワイプします。'} 打者走者はまず一塁へ。プレー中の切り替えは次の投球前に行えます。</p><div class="setting-label">打球後の速度</div><div class="segmented">${[1,2].map(n=>`<button data-field-speed="${n}" class="${settings.fieldSpeed===n?'active':''}">×${n}<small>${n===1?'通常':'2倍速'}</small></button>`).join('')}</div><div class="setting-label">難易度（次のプレイから）</div><div class="segmented">${[['casual','カジュアル'],['standard','標準'],['pro','プロ']].map(([v,l])=>`<button data-difficulty="${v}" class="${settings.difficulty===v?'active':''}">${l}</button>`).join('')}</div><div class="setting-label">CPUの強さ（カスタム）</div>${[['bat','CPU打撃','打者の読みとタイミング'],['pitch','CPU投球','球速と変化のキレ'],['field','CPU守備','守備範囲と送球'],['run','CPU走塁','進塁の積極性と盗塁']].map(([k,l,d])=>`<div class="setting-slider"><label for="cd-${k}">${l}（${d}） <output id="cd-${k}-output">${settings.customDifficulty[k]>0?'+':''}${settings.customDifficulty[k]}</output></label><input id="cd-${k}" data-custom-diff="${k}" type="range" min="-10" max="10" step="1" value="${settings.customDifficulty[k]}"></div>`).join('')}<p class="modal-note">難易度プリセットに上乗せされます。0で無効、+でCPUが強く、−で弱くなります。</p><div class="setting-label">セーブデータ</div><button class="secondary-button" data-action="backup-export">データを書き出す（JSON）</button><button class="secondary-button" data-action="backup-import">データを読み込む</button><p class="modal-note">記録・ペナント・キャリアなど、この端末に保存された全データを1ファイルにまとめます。読み込むと現在のデータに上書きされます。</p><button class="secondary-button" data-action="fullscreen">全画面でプレイ</button><button class="secondary-button" data-action="install">ホーム画面への追加方法</button><button class="primary-button" data-action="close">OK</button>`,'settings');
 }
 function howto(){
  if(game&&screen==='game')game.paused=true;
  modal(`${modalTitle('THUMB BASEBALL / VOL. 17','押して、狙って、離す。')}<div class="how-step"><span class="step-num">01</span><div><strong>右親指で、そのまま打つ</strong><p>球場を押したまま指を動かすと、指の左上に照準が出ます。ボールが来るコースへ合わせて、指を離すとスイング。下の操作パッドやスイングボタンを押す必要はありません。</p></div></div><div class="how-step"><span class="step-num">02</span><div><strong>リングが重なったら離す</strong><p>投球の後半に出る大きなリングが、ボールの到達位置の小さい円へ縮みます。リングが重なったら指を離そう。案内文字は表示しません。打撃アシストでは手前のボールが少しゆっくりになります。</p></div></div><div class="how-step"><span class="step-num">R</span><div><strong>親指でマニュアル走塁</strong><p>投球前に「走塁：手動」へ切替。大きいミニマップ上の丸や矢印を、進みたい塁へスワイプ。1回の指示で1つの塁まで走り、到着したら必ず停止します。次の塁への予約はできません。帰塁は戻りたい塁の方向へスワイプ。打者は最初に一塁へ走り、ほかの走者は指示待ちです。押し出される走者も自分で進塁させてください。フライ捕球後は元の塁へ戻ってから進塁。守備がボールを持ち、全員が塁で停止すると少し待って次の打者へ進みます。</p></div></div><div class="how-step"><span class="step-num">B</span><div><strong>バントで走者を送る</strong><p>縦に並ぶボタンでバントを選び、投球中に指を離します。90%で走者が1つ進塁して打者アウト、5%で進塁せずアウト、5%で打者もセーフのヒット。2アウトでは、打者アウトによる得点は入りません。</p></div></div><div class="how-step"><span class="step-num">03</span><div><strong>親指に合わせて設定</strong><p>右上の設定で、照準を指から左・上へどれだけ離すか個別に変えられます。左親指で遊ぶときは、照準を右上に切り替えられます。</p></div></div><p>打者と反対側のボタンでミートと強振を切り替え。選手、投手交代、履歴や練習設定は一時停止メニューから開けます。投手操作も球場で直接狙い、指を離すと投球。球種は球場内のボタンで選びます。守備回の自動進行は「守備を自動で進行」から開始。×1 / ×2で表示速度を切り替えられます。打球後の×1 / ×2も引き続き使えます。</p><button class="primary-button" data-action="close">プレイに戻る</button>`,'howto');
 }
 const ACHIEVEMENTS=[
  ['firstHit','◇','はじめの一打','初めてのヒットを記録'],
  ['firstHr','↗','夜を打ち抜け','初めてのホームランを記録'],
  ['firstWin','★','ウイニングナイト','対戦で初勝利'],
  ['distance130','◎','130mクラブ','130m以上の打球を記録'],
  ['derby5','♜','ホームランマシン','ダービーで5本以上を記録'],
  ['grandSlam','✦','グランドスラム','満塁ホームランを記録'],
  ['noHitter','◯','ノーヒットノーラン','3回以上の試合で相手を無安打に抑える'],
  ['perfectGame','◆','完全試合','3回以上の試合で走者を一人も出さない'],
  ['shutout','▦','完封','3回以上の試合で無失点勝利'],
  ['walkoff','☾','サヨナラ','サヨナラ勝ちを決める'],
  ['extraWin','⏱','延長制覇','延長戦で勝利'],
  ['tenRuns','⑩','二桁得点','1試合で10得点以上'],
  ['k10','🌀','奪三振ショー','1試合で10奪三振'],
  ['hr3','💥','ハットトリック','1人の選手が1試合3本塁打'],
  ['hits4','🎯','猛打賞プラス','1人の選手が1試合4安打'],
  ['streak5','🔥','5連勝','対戦で5連勝'],
  ['streak10','🌟','10連勝','対戦で10連勝'],
  ['games50','🏟','常連','対戦を50試合プレイ'],
  ['seasonFirst','🥇','レギュラーシーズン1位','ペナントで通常シーズン1位'],
  ['champion','🏆','チャンピオン','ペナントで優勝'],
  ['onlineWin','🌐','オンライン初勝利','オンライン対戦で勝利']
 ];
 function unlockAchievement(id){
  records.achievements||={};
  if(records.achievements[id])return false;
  records.achievements[id]=new Date().toISOString();
  const a=ACHIEVEMENTS.find(x=>x[0]===id);
  if(a)toast('🏆 実績解除: '+a[2]);
  save();return true;
 }
 function checkAchievements(g){
  if(!g||g.challenge)return;
  if(g.session.hits>0)unlockAchievement('firstHit');
  if(g.session.hr>0)unlockAchievement('firstHr');
  if(g.session.maxDistance>=130)unlockAchievement('distance130');
  if(g.session.grandSlam)unlockAchievement('grandSlam');
  if(g.mode==='derby'&&g.derby){const best=Math.max(0,...g.derby.rounds.flat().map(m=>m.normal[m.entrants.findIndex(e=>e.user)]??0));if(best>=5)unlockAchievement('derby5');}
  if(!g.isFixture)return;
  const won=g.userScore>g.opponentScore;
  if(won)unlockAchievement('firstWin');
  if(won&&g.walkoffWin)unlockAchievement('walkoff');
  if(won&&g.inning>g.totalInnings)unlockAchievement('extraWin');
  if(g.userScore>=10)unlockAchievement('tenRuns');
  if(g.session.ks>=10)unlockAchievement('k10');
  const myIds=new Set([...g.teams[g.userSide].batters,...g.teams[g.userSide].pitchers].map(p=>p.id));
  for(const [id,b] of Object.entries(g.box||{}))if(myIds.has(id)){if((b.hr||0)>=3)unlockAchievement('hr3');if((b.h||0)>=4)unlockAchievement('hits4');}
  if(won&&g.totalInnings>=3){
   const oppHits=g.userSide==='home'?g.awayHits:g.homeHits;
   if(oppHits===0)unlockAchievement('noHitter');
   if(g.opponentScore===0)unlockAchievement('shutout');
   const walksAllowed=Object.entries(g.pitchingStats||{}).filter(([id])=>myIds.has(id)).reduce((s,[,v])=>s+(v.bb||0),0);
   const myErrors=g.userSide==='home'?g.homeErrors:g.awayErrors;
   if(oppHits===0&&g.opponentScore===0&&walksAllowed===0&&myErrors===0)unlockAchievement('perfectGame');
  }
  if((records.bestStreak||0)>=5)unlockAchievement('streak5');
  if((records.bestStreak||0)>=10)unlockAchievement('streak10');
  if(records.games>=50)unlockAchievement('games50');
 }
 function recordModal(){
   const unlockedMap=records.achievements||{};
   const derived={firstHit:records.hits>0,firstHr:records.hr>0,firstWin:records.wins>0,distance130:records.maxDistance>=130,derby5:records.bestTimedDerby>=5,grandSlam:!!records.grandSlam,games50:records.games>=50,streak5:(records.bestStreak||0)>=5,streak10:(records.bestStreak||0)>=10};
   const achievements=ACHIEVEMENTS.map(([id,icon,title,desc])=>{const ok=!!unlockedMap[id]||!!derived[id];const date=unlockedMap[id]?new Date(unlockedMap[id]).toLocaleDateString('ja-JP'):'';return [ok,icon,title,desc+(date?'（'+date+'）':'')];});
   modal(`${modalTitle('YOUR BASEBALL STORY','プレイ記録')}<div class="stats-grid">${[[records.maxDistance,'m','最長飛距離'],[records.hr,'本','通算ホームラン'],[records.wins,'勝','対戦勝利数'],[records.bestTimedDerby,'/ 10','ダービー最高記録']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><span class="eyebrow">ACHIEVEMENTS</span>${achievements.map(([ok,icon,title,desc])=>`<div class="achievement ${ok?'unlocked':''}"><span>${icon}</span><div><strong>${title}</strong><small>${desc}</small></div><i>${ok?'獲得':'未獲得'}</i></div>`).join('')}<p class="modal-note">対戦 ${records.games}試合 / ${records.wins}勝 ${records.draws}分 / 通算 ${records.hits}安打<br>プレイを終了すると記録に反映されます。</p><button class="secondary-button" data-action="totals">選手通算成績（全モード）を見る</button>${records.practicePitches||records.practiceThrown?`<span class="eyebrow">PRACTICE</span><div class="stats-grid">${[[records.practiceHits,'安打','打撃練習 通算安打'],[records.practiceHr,'本','打撃練習 本塁打'],[records.practiceMaxDistance,'m','打撃練習 最長飛距離'],[records.practiceKs,'K','投球練習 奪三振']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><p class="modal-note">打撃練習 ${records.practicePitches}球 / 投球練習 ${records.practiceThrown}球</p>`:''}<button class="primary-button" data-action="close">閉じる</button>`, 'records');
 }
 function canSimulateWorldRemainder(g){
  return !!g?.worldFixture&&!!g.career?.continuous&&
   (['intro','career-ready','aim','change'].includes(g.phase)||g.phase==='windup'&&!g.pitch?.delivered);
 }
 function canSwitchWorldBatting(g){
  return !!g?.worldFixture&&g.worldFixture===world?.active?.id&&!world.pitching&&g.canSwitchWorldBatting(world.player.id);
 }
 function pause(){if(review.playback){stopReplay();return;}if(game?.phase==='career-pregame'){careerDashboard();return;}if(!game||['ended','derby-break'].includes(game.phase))return;game.paused=true;checkpoint();modal(`${modalTitle('TIME OUT','ひと休み。',false)}<div class="match-summary"><span>${game.derby?game.derby.label:`${game.inning}回${game.half==='top'?'表':'裏'} / ${game.loadedStart?'毎回2アウト満塁':game.totalInnings+'回制'}`}</span><span>${game.derby?game.derby.turnHR+' 本':`${game.teams.away.short} ${game.awayScore} - ${game.homeScore} ${game.teams.home.short}`}</span></div><button class="primary-button" data-action="close">プレイを再開</button>${canSwitchWorldBatting(game)?'<button class="secondary-button" data-action="world-batting-only">自分の打席だけに切り替え</button>':''}${canSimulateWorldRemainder(game)?'<button class="secondary-button" data-action="world-finish-auto">残りを自動進行</button>':''}${game.isFixture&&!game.umpireMode&&!game.career&&!game.worldFixture&&!game.apbcFixtureId?(game.fastForward||game.spectate?'<button class="secondary-button" data-action="auto-off">自動進行を止めて操作に戻る</button>':'<button class="secondary-button" data-action="fast-forward">残りを自動で高速進行</button>'):''}<button class="secondary-button" data-action="settings">操作・速度の設定</button><button class="secondary-button" data-action="howto">遊び方</button>${game.isFixture&&!game.umpireMode?'<button class="secondary-button" data-action="bench">選手交代・ベンチ</button>':''}<button class="secondary-button" data-action="roster">選手・打順</button><button class="secondary-button" data-action="history">投球履歴・成績</button>${game.inMatch&&!game.umpireMode?'<button class="secondary-button" data-action="tactics">守備の作戦</button>':''}${['practice','pitching'].includes(game.mode)?'<button class="secondary-button" data-action="practice-options">練習設定</button>':''}<button class="secondary-button" data-action="leave">${game.career||game.worldFixture?'保存してキャリアへ':game.apbcFixtureId?'保存して大会へ':game.mode==='pennant'?'保存してペナントへ': ['practice','pitching'].includes(game.mode)?'練習を終えて結果を見る':'中断してホームへ'}</button>${game.mode==='pennant'||game.apbcFixtureId||game.career||game.worldFixture?'':'<button class="secondary-button danger-button" data-action="restart">最初からやり直す</button>'}`,'pause');}
 function umpireSetup(){
  modal(`${modalTitle('UMPIRE MODE','審判モード')}<p class="modal-note">両チーム自動の試合を主審として裁くモードです。見送られた投球ごとにボール／ストライクを判定してください。あなたの判定がそのままコールとして試合に反映されます。ゾーン際の際どい球ほど正解時の得点が高く（最大50点）、接戦の塁プレーでのセーフ／アウト判定は正解30点です。試合の長さは対戦設定のイニング数（現在 ${settings.innings} イニング）、対戦カードと球場も対戦設定に準じます。</p><button class="primary-button" data-action="umpire-start">審判として開始</button><button class="secondary-button" data-action="close">戻る</button>`,'umpire-setup');
 }
 function start(mode,challengeId=null,fixedPark=null){
  if(mode==='apbc'){startAPBC();return;}if(mode==='apbc-cup'){playTournament(true);return;}
  if(mode==='match')clearCheckpoint();closeModal(false);unlockAudio();sound('tap');lastMode=mode;saved=false;$('distance').textContent='';$('timing-result').textContent='';
  const matchConfig=mode==='match'?lineupConfig('match').config:null,scenario=CHALLENGES[challengeId];
  const training=mode==='practice'||mode==='pitching';
  const club=mode==='match'?matchClub(settings.matchUserHome?settings.matchTeam:settings.matchOpponent)
   :arcadeClub(settings[mode==='derby'?'derbyClub':mode==='pitching'?'pitchingClub':'practiceClub']);
  const selectedPitcher=club.pitchers.findIndex(p=>p.id===settings.pitchingPlayer);
  if(mode==='derby')onEvent('clear');
  const windPark=NightPlayers.parks.find(p=>p.id===(fixedPark||scenario?.park||(mode==='derby'?settings.derbyPark:settings.park)));const matchWind=(!training&&mode!=='derby'&&windPark&&windPark.theme!=='dome'&&!windPark.id.includes('dome'))?(Math.random()<.25?0:Math.round((Math.random()*10-5)*2)/2):0;
  game=new NightGame(mode,settings.difficulty,onEvent,{wind:matchWind,clubs:mode==='match'&&(settings.matchTeam==='dream'||settings.matchOpponent==='dream')?{home:matchClub(settings.matchUserHome?settings.matchTeam:settings.matchOpponent),away:matchClub(settings.matchUserHome?settings.matchOpponent:settings.matchTeam)}:mode==='derby'&&club.alumni?{home:club,away:trainingOpponent(club.id)}:undefined,homeTeamId:club.id,arcadeRoster:training||mode==='derby',awayTeamId:mode==='match'?(settings.matchUserHome?settings.matchOpponent:settings.matchTeam):trainingOpponent(club.id).id,userHome:mode==='match'?settings.matchUserHome:true,defenseSpeed:settings.defenseSpeed,innings:settings.innings,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,park:fixedPark||scenario?.park||(mode==='derby'?settings.derbyPark:settings.park),pitcher:matchConfig?matchConfig.pitcher:selectedPitcher>=0?selectedPitcher:settings.pitcher,practicePitch:settings.practicePitch,practiceBatter:mode==='derby'?settings.derbyBatter:settings.practiceBatter,order:matchConfig?.order??(club.id==='owls'?settings.order:undefined),fielding:matchConfig?.fielding,battingAssist:settings.battingAssist,tiebreak:settings.tiebreak,umpire:pendingUmpire&&mode==='match'});
  if(pendingSpectate&&mode==='match'){game.spectate=true;game.autoBatting=true;game.autoDefense=true;pendingSpectate=false;}
  if(pendingUmpire&&mode==='match'){game.spectate=true;game.autoBatting=true;game.autoDefense=true;pendingUmpire=false;}
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
  if(mode==='derby')onEvent('clear');
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
  const hit=game&&['field','result'].includes(game.phase)?game.hit:null,base=hitReadout(hit);
  $('hit-readout').textContent=base?(hit.distance?base+' · '+Math.round(hit.distance)+'m':base):'';
  $('play-tools').hidden=!!review.playback||!$('hit-readout').textContent;
 }
 const playFeedback={score:null,scoreTime:0,callTime:0,pendingReplay:false,umpireLast:null,umpireShownAt:0};
 let absShownCall=null,absShownResult=null,absFrozenCall=null,absTouch=null,absLastTap=null;
 function resetPlayFeedback(){
  absShownCall=absShownResult=absFrozenCall=absTouch=absLastTap=null;
  for(const id of ['abs-actor','abs-count','abs-review'])$(id).hidden=true;
  playFeedback.score=game?{away:game.awayScore,home:game.homeScore}:null;
  playFeedback.scoreTime=0;playFeedback.callTime=0;playFeedback.pendingReplay=false;playFeedback.umpireLast=null;playFeedback.umpireShownAt=0;
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
  const actor=$('abs-actor'),panel=$('abs-review'),call=g.absCall;
  actor.hidden=!interactive;
  if(g.phase==='abs-call'&&call!==absShownCall){
   absShownCall=call;absLastTap=null;
   const en=call.umpireStrike?'STRIKE':'BALL',ja=call.umpireStrike?'ストライク':'ボール';
   onEvent('message',{en,ja});
   const role=g.defending?'投手':'打者';
   actor.setAttribute('aria-label',role+'でABSチャレンジ 残り'+g.absRemaining+'回');
  }
  if(interactive){
   const bounds=absActorBounds(renderer,g);
   const canvas=$('game-canvas').getBoundingClientRect(),stage=$('stage').getBoundingClientRect();
   actor.style.left=canvas.left-stage.left+bounds.x+'px';
   actor.style.top=canvas.top-stage.top+bounds.y+'px';
   actor.style.width=bounds.w+'px';actor.style.height=bounds.h+'px';
  }
  const opening=panel.hidden;
  panel.hidden=g.phase!=='abs-review'||!$('modal').hidden;
  if(panel.hidden)return;
  if(opening){
   const challenger=$('abs-challenger');
   challenger.hidden=!call.cpu;
   if(call.cpu){
    const opponent=g.teams[g.userSide==='home'?'away':'home'];
    challenger.textContent=opponent.short+' · '+(g.defending?'打者':'捕手')+'のチャレンジ';
   }
  }
  const showResult=reduceAbsMotion.matches||g.phaseTime>=NightGame.ABS_TIMING.reviewReveal;
  $('abs-splash').hidden=reduceAbsMotion.matches||g.phaseTime>=530;
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
 $('play-challenge').addEventListener('click',()=>{if(game?.requestPlayChallenge())sound('tap');});
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
 let playCallSeen=null;
 function updatePlayCallUI(g){
  const btn=$('play-challenge');if(!btn)return;
  if(g.phase==='play-call'&&g.baseCall){
   if(playCallSeen!==g.baseCall){playCallSeen=g.baseCall;try{review.saveCurrentPlay(g);}catch{}}
   btn.hidden=!g.playCanChallenge||!$('modal').hidden||!!g.umpireMode;
   if(!btn.hidden)btn.textContent='チャレンジ（残り'+g.playChallenges+'）';
  }else{
   if(g.phase!=='play-review')playCallSeen=null;
   btn.hidden=true;
  }
  if(g.phase==='play-review'&&!review.playback&&$('modal').hidden&&!playFeedback.pendingReplay)launchReplay();
 }
 function updateUmpireUI(g){
  const panel=$('umpire-panel');if(!panel)return;
  const active=!!g?.umpireMode&&screen==='game'&&!review.playback;
  panel.hidden=!active;
  if(!active)return;
  const s=g.umpireStats;
  $('umpire-score').textContent=s.score;
  $('umpire-accuracy').textContent=s.calls?Math.round(s.correct/s.calls*100)+'%（'+s.correct+'/'+s.calls+'）':'—';
  const last=s.last,feedback=$('umpire-feedback');
  if(last!==playFeedback.umpireLast){playFeedback.umpireLast=last;playFeedback.umpireShownAt=performance.now();}
  // Feedback must never cover the next pitch: it is hidden while a pitch is
  // being delivered (aim/windup/pitch) and fades out ~1.2s after the call.
  const inFlight=['intro','aim','windup','pitch'].includes(g.phase);
  const showFeedback=!!last&&!inFlight&&performance.now()-playFeedback.umpireShownAt<1200;
  feedback.hidden=!showFeedback;
  if(showFeedback){
   feedback.textContent=last.correct?'正解！ +'+last.points+'点':last.kind==='pitch'?'不正解（正解は'+(last.truth?'ストライク':'ボール')+'）':'不正解（正解は'+(last.truth==='safe'?'セーフ':'アウト')+'）';
   feedback.dataset.correct=String(last.correct);
  }
  const modalOpen=!$('modal').hidden;
  $('umpire-pitch-buttons').hidden=modalOpen||g.phase!=='umpire-call'||!g.umpirePending;
  const playButtons=$('umpire-play-buttons'),showPlay=!modalOpen&&g.phase==='play-call'&&!!g.baseCall;
  playButtons.hidden=!showPlay;
  if(showPlay)$('umpire-play-prompt').textContent=(['','一塁','二塁','三塁','本塁'][g.baseCall.base]||'')+'の接戦プレー、判定は？';
 }
 $('umpire-ball').addEventListener('click',()=>{if(game?.umpireCall(false))sound('tap');});
 $('umpire-strike').addEventListener('click',()=>{if(game?.umpireCall(true))sound('tap');});
 $('umpire-safe').addEventListener('click',()=>{if(game?.umpirePlayCall(true))sound('tap');});
 $('umpire-out').addEventListener('click',()=>{if(game?.umpirePlayCall(false))sound('tap');});
 function umpireResultHTML(g){
  const s=g.umpireStats,total=s.calls+s.playCalls,correct=s.correct+s.playCorrect,rate=total?Math.round(correct/total*100):0;
  return `<span class="eyebrow">UMPIRE MODE</span><div class="stats-grid">${[[s.score,'点','審判スコア'],[rate+'%','','総合正解率'],[s.correct+' / '+s.calls,'','投球判定（正解/全判定）'],[s.playCorrect+' / '+s.playCalls,'','塁上判定（正解/全判定）']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div>`;
 }
 function launchReplay(){
  if(!game||review.playback||!$('modal').hidden||!review.open(game))return;
  $('game').classList.add('replay-active');$('replay-label').hidden=false;updatePlaySkip();
  updatePlayTools();updateChallenge();
 }
 function stopReplay(){
  if(!review.playback)return;
  if(game?.phase==='play-review')game.phaseTime=Math.max(game.phaseTime,1300);
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
 function showCelebration(title,sub,ms=3400){
  if(reduceAbsMotion.matches)return;
  const hr=$('hr-celebration');if(!hr)return;
  hr.querySelector('strong').textContent=title;
  $('hr-distance').textContent=sub||'';
  hr.hidden=false;hr.classList.remove('play');void hr.offsetWidth;hr.classList.add('play');
  clearTimeout(hr._hideTimer);hr._hideTimer=setTimeout(()=>{hr.hidden=true;},ms);
 }
 function speakPlay(data){
   if(!settings.tts||!('speechSynthesis' in window))return;
   const speakable=['homer','hit','out'].includes(data.kind)||/^(HOME RUN|STRIKEOUT|WALK|HIT BY PITCH|WILD PITCH|PASSED BALL|INTENTIONAL WALK|GAME SET|WALK-OFF)/.test(data.en||'');
   if(!speakable||!data.ja)return;
   try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(data.ja+(data.sub?'。'+data.sub:''));u.lang='ja-JP';u.rate=1.05;speechSynthesis.speak(u);}catch{}
 }
 function onEvent(type,data){
   if(online?.role==='host'&&online.session?.open){if(type==='message')online.session.send({t:'msg',d:data});else if(type==='clear')online.session.send({t:'clear'});else if(type==='sound')online.session.send({t:'snd',d:data});else if(type==='music-result')online.session.send({t:'music',d:data});else if(type==='scoring-walk')online.session.send({t:'walk-replay'});else if(type==='end'&&data){online.session.send({t:'end',hs:data.homeScore,as:data.awayScore,hn:data.teams.home.name,an:data.teams.away.name});online.endSent=true;}}
   if(type==='message'){
     speakPlay(data);
     if(data.en==='HOME RUN'){const hr=$('hr-celebration');if(hr){hr.querySelector('strong').textContent='ホームラン！';$('hr-distance').textContent=data.sub||'';hr.hidden=false;hr.classList.remove('play');void hr.offsetWidth;hr.classList.add('play');clearTimeout(hr._hideTimer);hr._hideTimer=setTimeout(()=>{hr.hidden=true;},3000);}}
     const previousCall=$('message-en').textContent;
     $('message-en').textContent=data.en;$('message-ja').textContent=data.ja;$('message-sub').textContent=data.sub||'';
     if(game?.challenge&&data.en==='STRIKEOUT')updateChallenge(true);
     const stage=$('stage-message');
     const kind=data.kind||(/^(SINGLE|DOUBLE|TRIPLE|GROUND-RULE DOUBLE|BUNT HIT)$/.test(data.en)?'hit':
      data.en==='HOME RUN'?'homer':/OUT|DOUBLE PLAY/.test(data.en)?'out':'neutral');
     const pitchCall=['BALL','WALK'].includes(data.en)?'ball':
      ['STRIKE','STRIKEOUT','SWING & MISS'].includes(data.en)?'strike':'';
     const samePitchCall=pitchCall&&previousCall===data.en&&stage.classList.contains('pitch-call');
     stage.className='stage-message show '+kind+(pitchCall?' pitch-call pitch-call--'+pitchCall:'');
     const banner=stage.querySelector('.stage-call');
     if(!samePitchCall&&typeof banner.animate==='function'&&!reduceAbsMotion.matches){
      banner.getAnimations().forEach(animation=>animation.cancel());
      const impact=['out','hit','homer'].includes(kind);
      banner.animate([
       {opacity:0,transform:impact?'translateX(-14px) scale(.94)':'translateY(8px)'},
       {opacity:1,transform:'none'}
      ],{duration:pitchCall?245:impact?230:170,easing:'cubic-bezier(.16,1,.3,1)'});
     }
   }else if(type==='clear'){$('stage-message').className='stage-message';$('distance').textContent='';$('timing-result').textContent='';$('play-tools').hidden=true;const hrEl=$('hr-celebration');if(hrEl)hrEl.hidden=true;}
   else if(type==='sound')sound(data);
   else if(type==='music-result'){syncAudio();if(game)ballparkMusic.result(game,data.kind,data.player,data.side,data.thirdOut);}
   else if(type==='field'){review.capture(game);updatePlayTools();}
   else if(type==='update')updateUI();
   else if(type==='timing'){
     // Contact feedback is sound/vibration only; no text over the field.
   }else if(type==='hit'){
     if(game?.walkoffWin&&game.next==='finish')showCelebration('サヨナラ！','WALK-OFF WIN');
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
   $('half-break-score').innerHTML=lineScoreHTML(buildMatchReport(g));$('half-break-next').textContent=`${g.inning}回${g.half==='top'?'表':'裏'} · ${g.umpireMode?'審判として判定':g.defending?'あなたの守備':'あなたの攻撃'}`;
   $('half-continue').textContent=g.mirror?'相手が次へ進めるのを待っています':'タップして次の回へ';$('half-auto-note').textContent=g.autoDefense?'自動守備 ON · 次の守備回も継続':'';
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
   if(!game)return;const g=game;updateHalfBreak(g);const def=g.defending,field=!!g.field&&['field','result'].includes(g.phase);$('bench-button').hidden=!g.isFixture||!!g.umpireMode||(g.mirror&&!g.onlineGame);$('bench-button').disabled=g.phase==='ended';$('bench-button').textContent=queuedBench?'交代待ち':'ベンチ';$('bench-button').classList.toggle('pending',queuedBench);
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
   $('role-tag').textContent=g.umpireMode?'UMPIRE / YOU':field?'LIVE FIELD':def?'PITCHING / YOU':'BATTING / YOU';$('role-tag').classList.toggle('pitching',def);
   const chipPitch=g.phase==='result'?(g.lastPitch||g.pitch):g.pitch;
   const pitchVisible=!!chipPitch&&['pitch','miss','field','result','abs-call'].includes(g.phase);
   $('pitch-label').textContent=pitchVisible?chipPitch.name:'';
   $('pitch-speed').textContent=pitchVisible?chipPitch.speed:'';
   if(pitchVisible&&chipPitch){const brk=chipPitch.breakCm??(chipPitch.bx!=null?Math.round(Math.hypot(chipPitch.bx,chipPitch.by||0)*20.4):null);if(brk!=null)$('pitch-speed').textContent=chipPitch.speed+' · 変化'+brk+'cm'+(chipPitch.spinRpm?' · '+chipPitch.spinRpm.toLocaleString('ja-JP')+'rpm':'');}
   $('pitch-label').parentElement.hidden=!pitchVisible;
   const absCount=$('abs-count');
   absCount.hidden=g.absRemaining===undefined;
   if(!absCount.hidden){
    $('abs-remaining').textContent=g.absRemaining;
    absCount.dataset.empty=String(g.absRemaining===0);
    absCount.setAttribute('aria-label','ABS 残り'+g.absRemaining+'回');
   }
   const wind=g.wind??g.park.wind??0,windHUD=$('wind-hud');
   $('wind-speed').textContent=Math.abs(wind).toLocaleString('ja-JP',{maximumFractionDigits:1});
   windHUD.dataset.direction=wind<0?'in':wind?'out':'calm';
   windHUD.setAttribute('aria-label',wind?(wind<0?'向かい風 ':'追い風 ')+Math.abs(wind)+' m':'無風');
   $('rain-overlay').hidden=g.weather!=='rain';
   $('batter-label').innerHTML=`${g.park.name}${wind?' · '+(wind>0?'追い風':'向かい風'):''}${g.inMatch?' · '+(g.umpireLabel||'ゾーン標準'):''}${g.weather&&g.weather!=='clear'?' · '+g.weatherLabel:''}　${def?g.pitcher.name+' <span class="stamina"><i style="width:'+g.stamina+'%"></i></span> '+g.session.thrown+'球':(g.isFixture?g.pitcher.name+' '+(g.pitchingStats?.[g.pitcher.id]?.pitches||0)+'球':'')}`;
   $('difficulty-label').textContent=g.difficulty.toUpperCase();
   $('control-hint').textContent=g.umpireMode?'判定（ボール／ストライク、セーフ／アウト）だけ操作できます':def?'画面で狙い、離して投げる':'押したまま狙い、離して打つ';
   $('swing').disabled=g.paused||!!g.umpireMode||!!g.spectate||(def?g.phase!=='aim':g.phase!=='pitch');
   $('action-label').textContent=def?'PITCH':'SWING';$('action-hint').textContent=def?'離して投球':'離してスイング';$('swing-icon').innerHTML=svg(def?'ball':'bat');
   $('pitch-status').textContent=field?(g.field.throw?'ボールが送球されました':'野手が打球を追っています'):g.phase==='aim'?'球種を選び、コースを指定':g.phase==='pitch'?(def?'投球中 · 打者との勝負':'カーソルをボールのコースへ！'):g.phase==='windup'?'投球モーション…':'次の1球へ';
   g.battingAssist=settings.battingAssist&&g.career?.difficulty!=='expert';$('game').classList.toggle('batting-touch',!def);$('game').classList.toggle('pitching-touch',def);$('game').classList.toggle('in-play',field);$('thumb-hint').hidden=field;$('release-label').textContent=def?'離して投げる':'離して打つ';$('game-canvas').setAttribute('aria-label',def?'球場を押したままコースを狙い、指を離して投球':'球場を押したまま狙い、指を離してスイング');
   if(def)renderPitchDirections(g);$('pitch-deck').hidden=!def||field||g.phase!=='aim'||g.autoDefense||!!g.umpireMode||!!g.spectate;$('pitch-types').hidden=false;$('pitch-types').style.setProperty('--pitch-count',g.pitcher.pitches.length);$('pitch-deck-status').textContent=g.phase==='aim'?'コースを狙って離す':g.phase==='windup'?'投球モーション中':g.phase==='pitch'?'投球中':'次の1球へ';$('pitch-types').classList.toggle('four',g.pitcher.pitches.length===4);$('bat-options').hidden=def||!!g.umpireMode||!!g.spectate||!!g.autoBatting;$('ibb').hidden=!def||!g.inMatch||g.phase!=='aim'||g.autoDefense||g.spectate||g.fastForward||!!g.umpireMode;$('bat-options').dataset.batterHand=g.battingHand;document.querySelector('.controls').classList.toggle('defending',def);
   document.querySelectorAll('[data-pitch]').forEach(b=>{b.classList.toggle('active',b.dataset.pitch===g.pitchType);b.setAttribute('aria-pressed',String(b.dataset.pitch===g.pitchType));b.querySelector('small').textContent=Math.round(NightGame.pitchSpec(g.pitcher,b.dataset.pitch).speed)+'km/h';b.disabled=g.phase!=='aim'||!g.pitcher.pitches.includes(b.dataset.pitch);b.hidden=def&&!g.pitcher.pitches.includes(b.dataset.pitch);});
   const power=!!g.power,bunt=!!g.bunt;$('bunt').hidden=g.mode==='derby';const stealable=!def&&g.inMatch&&(g.bases[0]&&!g.bases[1]||g.bases[1]&&!g.bases[2]);$('steal').hidden=!stealable;$('steal').classList.toggle('selected',!!g.steal);$('steal').setAttribute('aria-pressed',String(!!g.steal));$('bunt').classList.toggle('selected',bunt);$('bunt').setAttribute('aria-pressed',String(bunt));$('contact').classList.toggle('selected',!power&&!bunt);$('power').classList.toggle('selected',power);$('power').classList.toggle('power-mode',power);$('contact').setAttribute('aria-pressed',String(!power&&!bunt));$('power').setAttribute('aria-pressed',String(power));$('swing').classList.toggle('power-active',power&&!def);updatePad();
   updateRunningUI(g);
   const auto=g.autoDefense&&def,speed=auto?g.defenseSpeed:g.fieldSpeed;$('field-speed').hidden=!!g.derby;$('field-speed').textContent=`${auto?'自動守備':'打球後'} ×${speed}`;$('field-speed').classList.toggle('active',speed===2);$('field-speed').setAttribute('aria-pressed',String(speed===2));$('field-speed').setAttribute('aria-label',auto?'自動守備の速度を切り替え':'打球後の速度を切り替え');$('auto-defense').hidden=!g.isFixture||!def||g.phase==='ended'||!!g.umpireMode;$('auto-defense').textContent=auto?'手動に戻す':'守備を自動で進行';$('auto-defense').setAttribute('aria-pressed',String(!!auto));$('game').classList.toggle('auto-defense',!!auto);document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);
   $('game').classList.toggle('career-running-match',g.mode==='career-bat');
   updatePlayerHUD($('player-card'),$('pitcher-card'),g);
   $('practice-tool').hidden=!['practice','pitching'].includes(g.mode);$('practice-tool').disabled=g.phase==='field';$('tactics-tool').hidden=!g.inMatch||!!g.umpireMode;updateAbsUI(g);checkpoint();
 }
 function updateRunningUI(g){
  const available=(g.isFixture||g.mode==='career-bat')&&!g.umpireMode,playing=!!g.field&&['field','result'].includes(g.phase);
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
 function commit(g,abandoned=false){if(saved||g.challenge)return;saved=true;if(g.mode==='match'&&!g.apbcFixtureId)clearCheckpoint();const s=g.session;records.hits+=s.hits;records.hr+=s.hr;records.perfect+=s.perfect;records.maxDistance=Math.max(records.maxDistance,s.maxDistance);records.grandSlam ||= !!s.grandSlam;records.ks+=s.ks;records.thrown+=s.thrown;if(g.mode==='practice'){records.practicePitches+=s.pitches;records.practiceHits+=s.hits;records.practiceHr+=s.hr;records.practiceMaxDistance=Math.max(records.practiceMaxDistance,s.maxDistance);}if(g.mode==='pitching'){records.practiceThrown+=s.thrown;records.practiceKs+=s.ks;}
   if(g.isFixture&&!abandoned){records.games++;if(g.userScore>g.opponentScore){records.wins++;records.winStreak=(records.winStreak||0)+1;records.bestStreak=Math.max(records.bestStreak||0,records.winStreak);}else if(g.userScore<g.opponentScore)records.winStreak=0;if(g.homeScore===g.awayScore)records.draws++;}
   if(g.mode==='derby'&&!abandoned){records.bestTimedDerby=Math.max(records.bestTimedDerby,...g.derby.rounds.flat().map(m=>m.normal[m.entrants.findIndex(e=>e.user)]??0));records.bestTimedDerbyDistance=Math.max(records.bestTimedDerbyDistance,s.maxDistance);}save();
 }
 let careerTotals=null;
 function loadTotals(){if(careerTotals)return careerTotals;try{careerTotals=JSON.parse(localStorage.getItem('nightball.careerTotals')||'{"rows":{}}');}catch{careerTotals={rows:{}};}careerTotals.rows??={};return careerTotals;}
 function foldCareerTotals(g){
   if(g._totalsFolded)return;g._totalsFolded=true;
   const store=loadTotals();
   for(const side of ['home','away']){
    const club=g.teams[side];if(!club)continue;
    const find=id=>[...club.batters,...club.pitchers].find(p=>p.id===id);
    const row=id=>{const p=find(id);if(!p)return null;const r=store.rows[id]||(store.rows[id]={name:p.name,clubId:club.id,pa:0,ab:0,h:0,doubles:0,triples:0,hr:0,rbi:0,bb:0,k:0,outs:0,pk:0,runs:0,earned:0,games:0});r.name=p.name;r.clubId=club.id;return r;};
    for(const [id,b] of Object.entries(g.box||{})){const r=row(id);if(!r)continue;r.games++;for(const k of ['pa','ab','h','doubles','triples','hr','rbi','bb','k'])r[k]+=b[k]||0;}
    for(const [id,s] of Object.entries(g.pitchingStats||{})){const r=row(id);if(!r)continue;r.outs+=s.outs||0;r.pk+=s.k||0;r.runs+=s.runs||0;r.earned+=s.earned??s.runs??0;}
   }
   try{localStorage.setItem('nightball.careerTotals',JSON.stringify(store));}catch{}
 }
 function totalsModal(){
   const rows=Object.values(loadTotals().rows);
   const bat=rows.filter(r=>r.ab>=10).sort((a,b)=>b.h/Math.max(1,b.ab)-a.h/Math.max(1,a.ab)).slice(0,15);
   const pow=rows.filter(r=>r.pa>0).sort((a,b)=>b.hr-a.hr||b.rbi-a.rbi).slice(0,10);
   const pit=rows.filter(r=>r.outs>=9).sort((a,b)=>a.earned*27/Math.max(1,a.outs)-b.earned*27/Math.max(1,b.outs)).slice(0,15);
   const row=(r,main)=>`<div class="career-list-row"><div><b>${r.name}</b><small>${matchClub(r.clubId)?.short||''} · ${r.games}試合</small></div><strong>${main}</strong></div>`;
   modal(`${modalTitle('','選手通算成績（全モード）')}<p class="modal-note">対戦・ペナント・APBC・トーナメントなど、全モードの試合を通算した個人成績です。</p><h3 class="arcade-section-title">打率（10打数以上）</h3>${bat.map(r=>row(r,(r.h/r.ab).toFixed(3).replace(/^0/,'')+' · '+r.hr+'本塁打 · '+r.rbi+'打点')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">本塁打</h3>${pow.map(r=>row(r,r.hr+'本 · '+r.rbi+'打点')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">防御率（3投球回以上）</h3>${pit.map(r=>row(r,(r.earned*27/r.outs).toFixed(2)+' · '+r.pk+'奪三振')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<button class="primary-button" data-action="close">閉じる</button>`,'totals');
 }
 let customTourney=null,ctPicks=[];
 function loadCustomTourney(){if(customTourney)return customTourney;try{customTourney=JSON.parse(localStorage.getItem('nightball.customTournament')||'null');}catch{customTourney=null;}return customTourney;}
 function saveCustomTourney(){try{localStorage.setItem('nightball.customTournament',JSON.stringify(customTourney));}catch{}}
 function customTourneyHub(){if(loadCustomTourney())customTourneyModal();else{ctPicks=[];ctSetupModal();}}
 function ctSetupModal(){
   modal(`${modalTitle('','勝ち抜きトーナメント')}<p class="modal-note">8球団を選んでください（選んだ順がシード順、5イニング制）。選択中 ${ctPicks.length}/8${ctPicks.length?'：'+ctPicks.map(id=>NightTeams.get(id)?.short||'').join('、'):''}</p>${[['CPBL',NightTeams.all],['NPB',NightTeams.npb],['KBO',NightTeams.kbo]].map(([label,list])=>`<h3 class="arcade-section-title">${label}</h3><div class="team-select-grid">${list.map(c=>`<button data-ct-club="${c.id}" class="${ctPicks.includes(c.id)?'selected':''}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div>`).join('')}<button class="primary-button" data-action="ct-start" ${ctPicks.length===8?'':'disabled'}>トーナメント開始</button><button class="secondary-button" data-action="close">閉じる</button>`,'ct-setup');
 }
 function ctCurrent(){const t=loadCustomTourney();if(!t||t.champion)return null;const round=t.rounds[t.rounds.length-1],m=round.find(x=>!x.winner);return m?{round:t.rounds.length-1,match:m}:null;}
 function ctAdvance(){const t=customTourney,round=t.rounds[t.rounds.length-1];if(!round.every(m=>m.winner))return;if(round.length===1){t.champion=round[0].winner;return;}const next=[];for(let i=0;i<round.length;i+=2)next.push({home:round[i].winner,away:round[i+1].winner,winner:null,hs:null,as:null});t.rounds.push(next);}
 function customTourneyModal(){
   const t=loadCustomTourney();if(!t){ctPicks=[];ctSetupModal();return;}
   const names={4:'準々決勝',2:'準決勝',1:'決勝'},cur=ctCurrent();
   modal(`${modalTitle('','勝ち抜きトーナメント')}${t.champion?`<p class="career-status-line">優勝: ${NightTeams.get(t.champion).name}</p>`:''}${t.rounds.map(round=>`<h3 class="arcade-section-title">${names[round.length]||'ラウンド'}</h3>${round.map(m=>`<div class="career-list-row"><div><b>${NightTeams.get(m.away)?.short||''} ${m.as??'–'} - ${m.hs??'–'} ${NightTeams.get(m.home)?.short||''}</b><small>${m.winner?'勝者: '+NightTeams.get(m.winner).name+(m.drawn?'（引き分けのためシード順で進出）':''):'未実施'}</small></div></div>`).join('')}`).join('')}${cur?`<button class="primary-button" data-action="ct-play">次の試合をプレイ: ${NightTeams.get(cur.match.away).short} vs ${NightTeams.get(cur.match.home).short}（あなたは${NightTeams.get(cur.match.home).short}）</button>`:''}<button class="secondary-button" data-action="ct-reset">トーナメントを破棄</button><button class="secondary-button" data-action="close">閉じる</button>`,'ct-bracket');
 }
 function playCustomTourney(){
   const cur=ctCurrent();if(!cur)return;
   const m=cur.match,home=NightTeams.get(m.home),away=NightTeams.get(m.away);
   closeModal(false);unlockAudio();lastMode='match';saved=false;clearCheckpoint();
   game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:m.home,awayTeamId:m.away,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,tiebreak:true});
   game.ctFixture={round:cur.round};
   activateGame();updateStyle();updateUI();
 }
 function finishCustomTourney(g){
   const t=loadCustomTourney();if(!t)return;
   const m=t.rounds[g.ctFixture.round]?.find(x=>!x.winner);
   if(m){m.hs=g.homeScore;m.as=g.awayScore;m.drawn=g.homeScore===g.awayScore;m.winner=g.homeScore>g.awayScore?m.home:g.awayScore>g.homeScore?m.away:m.home;ctAdvance();saveCustomTourney();}
   home();customTourneyModal();
 }
 // ---------- Online play: host runs the game, guest sends decisions (PeerJS/WebRTC) ----------
 let online=null;
 function onlineCleanup(){if(online?.session)online.session.destroy();online=null;}
 function onlineClubs(){return[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];}
 function onlineLobbyRefresh(){if(modalKind==='online')onlineModal();}
 function loadOnlineRecord(){try{const r=JSON.parse(localStorage.getItem('nightball.online')||'null');if(r&&typeof r==='object'&&r.byOpponent&&Array.isArray(r.history))return r;}catch{}return {byOpponent:{},history:[]};}
 function saveOnlineRecord(r){try{localStorage.setItem('nightball.online',JSON.stringify(r));}catch{}}
 function recordOnlineResult(oppClubId,won,draw,hs,as){
  if(!oppClubId)return;
  const r=loadOnlineRecord(),o=r.byOpponent[oppClubId]||(r.byOpponent[oppClubId]={w:0,l:0,d:0,streak:0});
  if(draw)o.d++;else if(won){o.w++;o.streak=o.streak>0?o.streak+1:1;}else{o.l++;o.streak=o.streak<0?o.streak-1:-1;}
  r.history.unshift({at:new Date().toISOString(),opp:oppClubId,hs,as,result:draw?'draw':won?'win':'loss'});
  r.history=r.history.slice(0,20);saveOnlineRecord(r);
  if(won)unlockAchievement('onlineWin');
 }
 function onlineHistoryHTML(){
  const r=loadOnlineRecord();if(!r.history.length)return '';
  return `<h3 class="arcade-section-title">オンライン対戦の履歴</h3>${r.history.slice(0,10).map(h=>`<div class="career-list-row"><div><b>${NightTeams.get(h.opp)?.name||h.opp}</b><small>${new Date(h.at).toLocaleDateString('ja-JP')} · 通算は相手球団ごとに保存</small></div><strong>${h.result==='win'?'勝':h.result==='loss'?'敗':'分'} ${h.as} - ${h.hs}</strong></div>`).join('')}`;
 }
 function onlineRematchButtons(){
  const o=online;if(!o||o.role!=='host')return '';
  const rec=loadOnlineRecord().byOpponent[o.guestClub];
  const line=rec?`<p class="modal-note">対 ${NightTeams.get(o.guestClub)?.name||''} 通算 ${rec.w}勝 ${rec.l}敗 ${rec.d}分${rec.streak>1?' · '+rec.streak+'連勝中':rec.streak<-1?' · '+(-rec.streak)+'連敗中':''}</p>`:'';
  if(o.rematchState==='offered')return line+'<p class="modal-note">再戦を申し込みました。相手の返答を待っています…</p>';
  if(o.rematchState==='declined')return line+'<p class="modal-note">再戦は見送られました。</p>';
  return line+'<button class="secondary-button" data-action="rematch-same">再戦を申し込む（サイドそのまま）</button><button class="secondary-button" data-action="rematch-swap">再戦を申し込む（サイド入替）</button>';
 }
 function guestResultModal(){
  const o=online,m=o?.lastEnd;if(!o||!m)return;
  const oppId=o.mySide==='home'?o.awayClub:o.homeClub;
  const mine=o.mySide==='home'?m.hs>m.as:m.as>m.hs,draw=m.as===m.hs;
  const rec=loadOnlineRecord().byOpponent[oppId];
  const offer=o.rematchOffer;
  modal(`${modalTitle('','試合終了')}<p class="career-status-line">${m.an} ${m.as} - ${m.hs} ${m.hn}</p><p class="career-status-line">${draw?'引き分け':mine?'あなたの勝利！':'あなたの敗戦'}</p>${rec?`<p class="modal-note">この相手との通算 ${rec.w}勝 ${rec.l}敗 ${rec.d}分</p>`:''}${offer?`<p class="career-status-line">ホストから再戦の申し込みが届きました${offer.swap?'（サイド入替）':''}</p><button class="primary-button" data-action="rematch-accept">再戦する</button><button class="secondary-button" data-action="rematch-decline">見送る</button>`:'<button class="primary-button" data-action="online-exit">ホームへ戻る</button>'}`,'online-result');
 }
 function onlineModal(){
   const o=online;let inner='';
   if(!o){
     inner=`<p class="career-status-line">離れた相手と1対1で対戦できます。ホストが部屋を作って合言葉（6文字）を相手に伝え、ゲストがその合言葉で入ります。接続の仲介にはPeerJSの無料サービスを使います（サーバー代・アカウント不要、要インターネット接続）。</p>
     ${onlineHistoryHTML()}
     <button class="primary-button" data-action="online-host">部屋を作る（ホスト）</button>
     <div class="online-join-row"><input id="online-code-input" class="online-code-input" type="text" maxlength="8" placeholder="合言葉を入力" autocomplete="off"><button class="secondary-button" data-action="online-join">部屋に入る（ゲスト）</button></div>
     <button class="secondary-button" data-action="close">閉じる</button>`;
   }else if(o.role==='host'){
     const effPark=o.park||NightTeams.get(o.hostHome?o.myClub:o.guestClub||o.myClub)?.park;
     inner=`<p class="career-status-line">あなたはホストです。合言葉を相手に伝えてください。先攻・後攻とスタジアムはホストが決めます。</p>
     <div class="online-code">${o.code}</div>
     <p class="online-status-line">${o.status||''}</p>
     <h3 class="arcade-section-title">自分の球団</h3>
     <div class="online-club-list">${onlineClubs().map(c=>`<button class="online-club${o.myClub===c.id?' selected':''}" data-online-club="${c.id}">${c.name}</button>`).join('')}</div>
     <h3 class="arcade-section-title">イニング</h3>
     <div class="online-club-list">${[3,5,9].map(n=>`<button class="online-club${o.innings===n?' selected':''}" data-online-innings="${n}">${n}回</button>`).join('')}</div>
     <h3 class="arcade-section-title">先攻・後攻（自分）</h3>
     <div class="online-club-list"><button class="online-club${o.hostHome?' selected':''}" data-online-side="home">後攻・ホーム</button><button class="online-club${!o.hostHome?' selected':''}" data-online-side="away">先攻・アウェイ</button></div>
     <h3 class="arcade-section-title">スタジアム</h3>
     <div class="online-club-list">${NightPlayers.parks.map(p=>`<button class="online-club${effPark===p.id?' selected':''}" data-online-park="${p.id}">${p.name}</button>`).join('')}</div>
     ${o.guestClub?`<button class="primary-button" data-action="online-start">対戦開始（相手: ${NightTeams.get(o.guestClub)?.name||o.guestClub}）</button>`:`<button class="primary-button" disabled>相手の球団選択を待っています</button>`}
     <button class="secondary-button" data-action="online-cancel">部屋を閉じる</button>`;
   }else{
     inner=`<p class="career-status-line">あなたはゲストです。自分の球団を選んでください。先攻・後攻とスタジアムはホストが決めます。</p>
     <p class="online-status-line">${o.status||''}</p>
     <div class="online-club-list">${onlineClubs().map(c=>`<button class="online-club${o.myClub===c.id?' selected':''}" data-online-club="${c.id}">${c.name}</button>`).join('')}</div>
     <button class="secondary-button" data-action="online-cancel">退出する</button>`;
   }
   modal(`${modalTitle('','オンライン対戦')}${inner}`,'online');
 }
 async function onlineCreateRoom(){
   onlineCleanup();
   const code=NightOnline.makeCode();
   online={role:'host',code,session:null,myClub:settings.matchTeam,guestClub:null,innings:5,hostHome:true,park:null,started:false,endSent:false,status:'接続を準備中…',pitchSeq:0,lastPitchObj:null,lastStateAt:0,lastStatePhase:''};
   onlineModal();
   try{
     online.session=await NightOnline.host(code,{
       onReady:()=>{if(online?.code===code){online.status='合言葉を相手に伝えてください。接続を待っています…';onlineLobbyRefresh();}},
       onOpen:()=>{if(online?.code===code){online.status='ゲストが接続しました。相手の球団選択を待っています…';onlineLobbyRefresh();}},
       onData:m=>onlineHostData(m),
       onClose:()=>onlinePeerGone(),
       onError:kind=>{if(online?.code===code&&!online.started){online.status=kind==='taken'?'合言葉が重複しました。部屋を作り直してください。':'接続エラーが発生しました。';onlineLobbyRefresh();}}
     });
   }catch{if(online?.code===code){online.status='通信ライブラリを読み込めませんでした。ネット接続を確認してください。';onlineLobbyRefresh();}}
 }
 async function onlineJoinRoom(){
   const code=($('online-code-input')?.value||'').trim().toUpperCase();
   if(code.length<4){toast('合言葉を入力してください');return;}
   onlineCleanup();
   online={role:'guest',code,session:null,myClub:null,started:false,status:'接続中…',ended:false,lastUiKey:''};
   onlineModal();
   try{
     online.session=await NightOnline.join(code,{
       onOpen:()=>{if(online?.code===code){online.status='接続しました。自分の球団を選んでください。';if(online.myClub)online.session?.send({t:'club',club:online.myClub});onlineLobbyRefresh();}},
       onData:m=>onlineGuestData(m),
       onClose:()=>onlinePeerGone(),
       onError:kind=>{if(online?.code===code&&!online.started){online.status=kind==='notfound'?'その合言葉の部屋が見つかりません。':'接続エラーが発生しました。';onlineLobbyRefresh();}}
     });
     setTimeout(()=>{if(online?.code===code&&online.role==='guest'&&!online.session?.open&&!online.started){online.status='接続できませんでした。合言葉と、相手が待機中かを確認してください。';onlineLobbyRefresh();}},15000);
   }catch{if(online?.code===code){online.status='通信ライブラリを読み込めませんでした。ネット接続を確認してください。';onlineLobbyRefresh();}}
 }
 function onlinePeerGone(){
   if(!online)return;
   if(online.role==='guest'){
     if(online.started&&!online.ended&&game?.mirror&&game.phase!=='ended'){online.ended=true;game.paused=true;modal(`${modalTitle('','接続が切れました')}<p class="career-status-line">相手との接続が切断されました。</p><button class="primary-button" data-action="online-exit">ホームへ戻る</button>`,'online-gone');}
     else if(!online.started){online.status='相手との接続が切れました。';onlineLobbyRefresh();}
     return;
   }
   if(online.started&&game&&game.phase!=='ended'){game.paused=true;modal(`${modalTitle('','接続が切れました')}<p class="career-status-line">相手との接続が切断されました。試合は一時停止しています。</p><button class="primary-button" data-action="online-exit">ホームへ戻る</button>`,'online-gone');}
   else if(!online.started){online.guestClub=null;online.status='ゲストが退出しました。接続を待っています…';onlineLobbyRefresh();}
 }
 const REACTIONS=['👏','🔥','😂','👍','😱','😤'];
 let reactionTimer=0;
 function showReaction(e){
   if(!REACTIONS.includes(e))return;
   const el=$('react-pop');if(!el)return;
   el.textContent=e;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
   clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>el.classList.remove('show'),1950);
 }
 function sendReaction(e){
   if(!online?.started||!online.session?.open)return;
   online.session.send({t:'react',e});showReaction(e);$('react-panel').hidden=true;
 }
 function onlineHostData(m){
   const o=online;if(!o||o.role!=='host')return;
   if(m.t==='club'){o.guestClub=m.club;o.status=`ゲストの球団: ${NightTeams.get(m.club)?.name||m.club}。開始できます。`;onlineLobbyRefresh();return;}
   if(m.t==='guest-left'){onlinePeerGone();return;}
   if(m.t==='rematch-yes'&&o.rematchState==='offered'){o.rematchState='';if(o.rematchSwap)o.hostHome=!o.hostHome;startOnlineMatch();return;}
   if(m.t==='rematch-no'&&o.rematchState==='offered'){o.rematchState='declined';if(game&&modalKind==='result')finish(game);return;}
   const g=game;if(!g||!o.started)return;
   if(m.t==='react'){showReaction(m.e);return;}
   if(m.t==='pitch-decision'&&g.phase==='aim'&&g.remotePitching){
     if(m.ibb){g.intentionalWalk(false);return;}
     const kx=g.cursor.x,ky=g.cursor.y;g.pitchType=m.pitchType;g.setCursor(m.aim?.x||0,m.aim?.y||0);g.shift=m.shift?'pull':'none';g.remoteThrowPitch();g.cursor.x=kx;g.cursor.y=ky;
   }else if(m.t==='swing'&&g.phase==='pitch'&&g.remoteBatter&&g.pitch&&!g.pitch.swung){
     if(m.bunt){g.bunt=true;g.buntBall();}
     else g.attempt({x:m.aim?.x||0,y:m.aim?.y||0},!!m.power,Math.max(-1.2,Math.min(1.2,Number(m.delta)||0)),false);
   }else if(m.t==='steal'&&g.remoteBatter){g.steal=!!m.on;}
   else if(m.t==='abs-challenge'&&g.remoteBatter&&g.absCanChallenge){g.requestAbsChallenge();}
   else if(m.t==='play-challenge'&&g.phase==='play-call'&&g.baseCall?.cpu){g.requestPlayChallenge(true);}
   else if(m.t==='sub')applyRemoteSub(g,m);
 }
 // Apply a substitution for the guest's team on the authoritative game:
 // briefly treat the guest as the game's user so the standard substitution
 // methods validate and apply against the guest's lineup, then swap back.
 function applyRemoteSub(g,m){
   const flip=()=>{g.userHome=!g.userHome;[g.homePitcherIndex,g.awayPitcherIndex]=[g.awayPitcherIndex,g.homePitcherIndex];[g.usedPitchers,g.usedCpuPitchers]=[g.usedCpuPitchers,g.usedPitchers];};
   flip();
   try{
     if(m.kind==='hit'||m.kind==='run')g.substitute(m.id,{type:m.kind,base:m.base});
     else if(m.kind==='pitch')g.changePitcher(Number(m.index));
     else if(m.kind==='defense')g.swapFieldPosition(m.id,m.pos);
   }catch{}finally{flip();}
 }
 function startOnlineMatch(){
   const o=online;if(!o||o.role!=='host'||!o.guestClub)return;
   const homeId=o.hostHome?o.myClub:o.guestClub,awayId=o.hostHome?o.guestClub:o.myClub;
   const home=NightTeams.get(homeId),away=NightTeams.get(awayId),mine=NightTeams.get(o.myClub);
   if(!home||!away||!mine)return;
   const park=o.park||home.park;
   o.session?.send({t:'start',home:homeId,away:awayId,innings:o.innings,difficulty:settings.difficulty,park});
   closeModal(false);unlockAudio();lastMode='match';saved=false;clearCheckpoint();
   game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:homeId,awayTeamId:awayId,userHome:o.hostHome,innings:o.innings,park,pitcher:0,opponentPitcher:0,order:mine.startingOrder,fielding:mine.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,remoteSide:o.hostHome?'away':'home'});
   game.onlineGame=true;o.started=true;o.pitchSeq=0;o.lastPitchObj=null;o.lastStateAt=0;o.lastStatePhase='';o.endSent=false;o.rematchState='';o.resultRecorded=false;
   activateGame();updateStyle();updateUI();
 }
 // Full render state for the guest's mirror game (see NightGame.applyMirror).
 function onlineState(g,o){
   const fieldPhase=['field','result'].includes(g.phase)&&g.field;
   let field=null;
   if(fieldPhase){field={...g.field,trail:undefined,manual:g.field.manual?{...g.field.manual,userControlled:false}:g.field.manual};}
   let fsq=0;if(field){if(o._ofield!==g.field){o._ofield=g.field;o._fseq=(o._fseq||0)+1;}fsq=o._fseq;}
   return {
     phase:g.phase,pt:g.phaseTime,inning:g.inning,half:g.half,outs:g.outs,balls:g.balls,strikes:g.strikes,
     hs:g.homeScore,as:g.awayScore,home:g.home.slice(),away:g.away.slice(),hh:g.homeHits,ah:g.awayHits,he:g.homeErrors,ae:g.awayErrors,
     bases:g.bases.map(b=>b?1:0),baseIds:g.baseIds.slice(),bi:{...g.battingIndex},batFin:g.batFinished?1:0,
     lu:{home:g.lineups.home.map(p=>[p.id,p.fieldPos||p.pos]),away:g.lineups.away.map(p=>[p.id,p.fieldPos||p.pos])},
     pi:{u:g.homePitcherIndex,c:g.awayPitcherIndex},usedU:g.usedPitchers.slice(),usedC:g.usedCpuPitchers.slice(),
     ps:g.pitchingStats,box:g.box,pitch:g.pitch||null,pitchSeq:o.pitchSeq,
     lastPitch:g.lastPitch?{name:g.lastPitch.name,speed:g.lastPitch.speed,id:g.lastPitch.id,breakCm:g.lastPitch.breakCm,spinRpm:g.lastPitch.spinRpm??null}:null,
     field,fs:g.fieldSpeed,fsq,hit:g.hit?{kind:g.hit.kind,distance:g.hit.distance}:null,swingAge:g.swingAge,
     absCall:g.absCall||null,absU:g.absRemaining,absCpu:g.absCpuRemaining,halfBreak:g.halfBreak||null,
     baseCall:g.baseCall?{base:g.baseCall.base,type:g.baseCall.type,batSide:g.baseCall.batSide}:null,playU:g.playChallenges,playCpu:g.playCpuChallenges,
     weather:g.weather,weatherLabel:g.weatherLabel,wind:g.wind,next:g.next,umpireLabel:g.umpireLabel,
     batId:g.batter?.id||'',pitId:g.pitcher?.id||''
   };
 }
 function onlineTick(g){
   const o=online;if(!o||o.role!=='host'||!o.session?.open||!g||!g.onlineGame)return;
   if(g.pitch&&g.pitch!==o.lastPitchObj){o.lastPitchObj=g.pitch;o.pitchSeq=(o.pitchSeq||0)+1;}
   const now=performance.now();
   const interval=(g.phase==='field'||g.phase==='result')?30:60;
   if(now-(o.lastStateAt||0)<interval&&g.phase===o.lastStatePhase)return;
   o.lastStateAt=now;o.lastStatePhase=g.phase;
   let s;try{s=JSON.parse(JSON.stringify(onlineState(g,o)));}catch{return;}
   o.session.send({t:'state',s});
 }
 // ----- guest side: a mirror NightGame renders the real game screen -----
 function onlineGuestData(m){
   const o=online;if(!o||o.role!=='guest')return;
   if(m.t==='start'){startOnlineGuestMatch(m);return;}
   if(m.t==='host-left'){onlinePeerGone();return;}
   if(!o.started)return;
   if(m.t==='state'){
     const g=game;if(!g||!g.mirror)return;const s=m.s;
     g.applyMirror(s);
     const key=[s.phase,s.inning,s.half,s.outs,s.balls,s.strikes,s.bases.join(''),s.hs,s.as,s.batId,s.pitId,s.absU,s.absCpu,s.playU,s.playCpu,s.baseCall?s.baseCall.base+'/'+s.baseCall.batSide:'',s.lu.home.map(x=>x[0]).join(','),s.lu.away.map(x=>x[0]).join(',')].join('|');
     if(key!==o.lastUiKey){o.lastUiKey=key;updateUI();}
     $('distance').textContent=s.hit?.distance?s.hit.distance+' m':'';
   }
   else if(m.t==='react')showReaction(m.e);
   else if(m.t==='walk-replay'){try{review.captureWalk(game);playFeedback.pendingReplay=true;}catch{}}
   else if(m.t==='msg')onEvent('message',m.d);
   else if(m.t==='clear')onEvent('clear');
   else if(m.t==='snd')onEvent('sound',m.d);
   else if(m.t==='music')onEvent('music-result',m.d);
   else if(m.t==='rematch'){o.rematchOffer={swap:!!m.swap};if(modalKind==='online-result')guestResultModal();}
   else if(m.t==='end'){
     if(o.ended)return;o.ended=true;
     const mine=(o.mySide==='home'?m.hs>m.as:m.as>m.hs),draw=m.as===m.hs;
     recordOnlineResult(o.mySide==='home'?o.awayClub:o.homeClub,mine,draw,m.hs,m.as);
     o.lastEnd=m;o.rematchOffer=null;
     guestResultModal();
   }
 }
 function startOnlineGuestMatch(m){
   const o=online;if(!o)return;
   const home=NightTeams.get(m.home),away=NightTeams.get(m.away);
   if(!home||!away)return;
   const guestHome=m.home===o.myClub,mine=guestHome?home:away;
   o.started=true;o.ended=false;o.lastUiKey='';o.homeClub=m.home;o.awayClub=m.away;o.innings=m.innings;o.mySide=guestHome?'home':'away';o.rematchOffer=null;o.lastEnd=null;
   closeModal(false);unlockAudio();lastMode='match';saved=false;clearCheckpoint();
   game=new NightGame('match',m.difficulty||settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:m.home,awayTeamId:m.away,userHome:guestHome,innings:m.innings,park:m.park||home.park,pitcher:0,opponentPitcher:0,order:mine.startingOrder,fielding:mine.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,remoteSide:guestHome?'away':'home'});
   game.onlineGame=true;game.mirror=true;game.mirrorSend=msg=>{if(online?.session?.open)online.session.send(msg);};
   activateGame();updateStyle();updateUI();
 }
 function hideOnlineGuest(){const v=$('online-view');if(v)v.hidden=true;}
 function finish(g){
   if(g.mode==='match'||g.mode==='pennant'||g.apbcFixtureId)foldCareerTotals(g);
   if(g.ctFixture){finishCustomTourney(g);return;}
   if(g.worldFixture){finishWorld(g);return;}
   if(g.career){finishCareer(g);return;}
   if(g.apbcFixtureId){finishTournament(g);return;}
   if(g.mode==='pennant'){finishLeague(g);return;}
   if(g.derby&&g.derbyTransition){derbyTurnResult(g);return;}
   if(g.allstarEvent){if(league){league.completeAllstar();saveLeague();}commit(g);checkAchievements(g);$('swing').disabled=true;modal(`${modalTitle('','オールスター結果',false)}<div class="result-hero"><div class="league-versus final-versus"><div><b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div><b>${g.teams.home.name}</b></div></div></div><button class="primary-button" data-action="allstar-back">ペナントへ戻る</button>`,'result');return;}
   if(g.onlineGame&&online?.role==='host'&&online.started&&!online.resultRecorded){online.resultRecorded=true;recordOnlineResult(online.guestClub,g.userScore>g.opponentScore,g.homeScore===g.awayScore,g.homeScore,g.awayScore);}
   const newDistance=g.session.maxDistance>records.maxDistance;commit(g);checkAchievements(g);$('swing').disabled=true;
   const win=g.userScore>g.opponentScore,draw=g.homeScore===g.awayScore,match=g.mode==='match',pitching=g.mode==='pitching';
   const title=match?(win?'勝利':draw?'引き分け':'敗戦'):pitching?'投球練習結果':'打撃練習結果';
   if(match&&win)sound('win');
   const stats=pitching?[[g.session.ks,'奪三振'],[g.session.thrown,'投球数'],[g.session.allowed,'失点']]:[[g.session.hits,'安打'],[g.session.hr,'本塁打'],[g.session.maxDistance+' m','最長飛距離']];
   modal(`${modalTitle('',title,false)}${match?`<div class="result-hero"><div class="league-versus final-versus"><div>${clubBadge(g.teams.away.id)}<b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div>${clubBadge(g.teams.home.id)}<b>${g.teams.home.name}</b></div></div></div>${resultReportHTML(buildMatchReport(g))}`:`<div class="result-stats">${stats.map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</div>`}
   ${g.umpireMode?umpireResultHTML(g):''}${newDistance?'<div class="new-best">最長飛距離を更新</div>':''}${g.umpireMode?'<button class="primary-button" data-action="umpire-restart">もう一度審判する</button>':'<button class="primary-button" data-action="restart">もう一度プレイ</button>'}${g.onlineGame&&online?.role==='host'?onlineRematchButtons():''}${match?'<button class="secondary-button" data-action="box-score">選手別の成績を見る</button>':''}<button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
 }
 function home(){try{speechSynthesis.cancel();}catch{}stopReplay();if(online?.started){if(!online.endSent)online.session?.send({t:online.role==='guest'?'guest-left':'host-left'});onlineCleanup();hideOnlineGuest();}review.reset();resetPlayFeedback();updatePlayTools();updateChallenge();resetCareerOverlay();$('career').hidden=true;$('apbc-cup').hidden=true;queuedBench=false;stadiumAudio.stopEffects();if(game&&!saved){if(game.isFixture||game.career||game.worldFixture)checkpoint();else commit(game,true);}closeModal(false);game=null;onEvent('clear');screen='home';matchContext='match';$('pennant').hidden=true;$('home').hidden=false;$('game').hidden=true;$('pause').hidden=true;$('react').hidden=true;$('react-panel').hidden=true;$('settings').hidden=false;history.replaceState({nightball:'home'},'',location.href);window.scrollTo(0,0);renderMenuClubs();}
 function swing(){if(!game||game.umpireMode||game.spectate)return;const done=game.defending?game.throwPitch():game.swing();if(done)$('swing').disabled=true;}
 const types=NightGame.TYPES;
 function renderPitchDirections(g){
  const key=NightPlayers.ratingVersion+'/'+g.pitcher.id+'/'+g.pitcher.pitches.join(',');if($('pitch-types').dataset.key===key)return;$('pitch-types').dataset.key=key;
  const directions=[['up','↑',['fast']],['left','←',['slider','cutter']],['right','→',['shoot']],['downleft','↙',['curve','slowcurve']],['down','↓',['fork','split','vslider']],['downright','↘',['sinker','change','knuckle']]];
  $('pitch-types').innerHTML='<span class="pitch-ball" aria-hidden="true">⚾</span>'+directions.map(([dir,arrow,ids])=>`<div class="pitch-direction ${g.pitcher.hand==='L'?({left:'right',right:'left',downleft:'downright',downright:'downleft'}[dir]||dir):dir}">${g.pitcher.pitches.filter(id=>ids.includes(id)).map(id=>{const p=NightGame.pitchSpec(g.pitcher,id),level=Math.max(1,Math.min(7,Math.round(Math.hypot(p.bx,p.by)*82/18)));return `<button class="pitch-type ${id==='fast'?'straight':'breaking'}" data-pitch="${id}" aria-label="${p.name}${id==='fast'?'': ' 変化量'+level}"><i aria-hidden="true">${g.pitcher.hand==='L'?({'←':'→','→':'←','↙':'↘','↘':'↙'}[arrow]||arrow):arrow}</i><span>${p.short}</span><em>${id==='fast'?'':level}</em><small></small></button>`;}).join('')}</div>`).join('');
 }
 $('pitch-types').addEventListener('click',e=>{const b=e.target.closest('[data-pitch]');if(b&&game&&!game.umpireMode&&!game.spectate&&game.phase==='aim'){game.pitchType=b.dataset.pitch;sound('tap');updateUI();}});
 function bindFieldAim(el){
  let gesture=null;
  const clear=()=>{if(gesture)gesture.game.touch=null;gesture=null;};
  const valid=()=>gesture&&gesture.game===game&&!game.paused&&!game.umpireMode&&!game.spectate&&!(game.autoDefense&&game.defending)&&screen==='game'&&gesture.half===game.half&&gesture.inning===game.inning&&gesture.defending===game.defending;
  const move=e=>{if(!gesture||gesture.pointer!==e.pointerId||!valid()||!['aim','windup','pitch'].includes(game.phase))return;const r=el.getBoundingClientRect();
   const thumb=e.pointerType!=='mouse'&&e.pointerType!=='pen';
   const x=e.clientX-r.left+(thumb?(settings.leftHanded?settings.cursorShift:-settings.cursorShift):0),y=e.clientY-r.top-(thumb?settings.cursorLift:0);
   const aim=renderer.screenToAim?renderer.screenToAim(x,y):{x:(x/r.width*480-265)/75,y:(y/r.height*540-400)/64};game.setCursor(aim.x,aim.y);game.touch={x:(e.clientX-r.left)/r.width*480,y:(e.clientY-r.top)/r.height*540};
  };
  el.addEventListener('pointerdown',e=>{
   if(gesture||!game||game.paused||game.umpireMode||game.spectate||game.autoDefense&&game.defending||screen!=='game'||e.button!==0||(game.defending?game.phase!=='aim':!['intro','windup','pitch'].includes(game.phase)&&!(game.phase==='aim'&&(game.remotePitching||game.mirror))))return;
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
 $('bunt').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate&&game.mode!=='derby'){game.bunt=true;game.power=false;updateStyle();sound('tap');}};
 $('steal').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate&&game.inMatch){game.steal=!game.steal;updateStyle();sound('tap');}};
 $('ibb').onclick=()=>{if(game&&!game.umpireMode&&game.intentionalWalk()){sound('tap');updateUI();}};
 $('contact').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate){game.power=false;game.bunt=false;updateStyle();sound('tap');}};$('power').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate){game.power=true;game.bunt=false;updateStyle();sound('tap');}};
 $('sound').onclick=()=>{unlockAudio();settings.sound=!settings.sound;save();if(settings.sound)sound('tap');};
 $('settings').onclick=settingsModal;$('pause').onclick=pause;$('react').onclick=()=>{const p=$('react-panel');p.hidden=!p.hidden;};$('react-panel').innerHTML=REACTIONS.map(e=>`<button type="button" data-react="${e}" aria-label="リアクション ${e}">${e}</button>`).join('');$('react-panel').addEventListener('click',ev=>{const b=ev.target.closest('[data-react]');if(b)sendReaction(b.dataset.react);});$('brand').onclick=()=>screen==='game'?(game?.domeScene?home():pause()):['pennant','apbc-cup','career'].includes(screen)?home():window.scrollTo({top:0,behavior:'smooth'});$('howto').onclick=howto;$('records').onclick=recordModal;
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>b.dataset.mode==='apbc'?apbcHub():b.dataset.mode==='match'?setupMatchTeams():b.dataset.mode==='tournament'?customTourneyHub():b.dataset.mode==='online'?onlineModal():b.dataset.mode==='derby'?setupDerby():b.dataset.mode==='career'?worldDashboard():b.dataset.mode==='umpire'?umpireSetup():setupTraining(b.dataset.mode));
 $('clubhouse').onclick=()=>lineupModal('edit');$('resume-game').onclick=resumeGame;$('players-tool').onclick=()=>rosterModal(game?.defending?game.pitcher.id:game?.batter.id,game?.userSide||'home');$('player-card').onclick=()=>{if(game)rosterModal(game.batter.id,game.side);};$('pitcher-card').onclick=()=>{if(game)rosterModal(game.pitcher.id,game.side==='home'?'away':'home');};$('tactics-tool').onclick=tacticsModal;$('history-tool').onclick=historyModal;$('practice-tool').onclick=practiceModal;
 $('auto-defense').onclick=()=>{if(game&&!game.umpireMode&&game.setAutoDefense(!game.autoDefense)){unlockAudio();updateUI();}};
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
   if(b.dataset.matchClub){const chosen=b.dataset.matchClub;if(matchPickSide==='home'){if(settings.matchOpponent===chosen)settings.matchOpponent=settings.matchTeam;settings.matchTeam=chosen;settings.park=matchClub(chosen).park;lineupConfig('match');}else{if(settings.matchTeam===chosen)settings.matchTeam=settings.matchOpponent;settings.matchOpponent=chosen;}settings.park=matchClub(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;lineupConfig('match');save();setupMatchTeams();return;}
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
   if(b.dataset.benchPlayer){if(game.mirror){game.mirrorSend?.({t:'sub',kind:b.dataset.subKind,id:b.dataset.benchPlayer,base:runnerBase});toast('交代をリクエストしました');setTimeout(()=>{if(modalKind==='bench')benchModal(benchTab);},600);}else if(game.substitute(b.dataset.benchPlayer,{type:b.dataset.subKind,base:runnerBase})){checkpoint();toast(b.dataset.subKind==='run'?'代走を起用しました':'代打を起用しました');benchModal(benchTab);}return;}
   if(b.dataset.benchPitch!==undefined){if(game.mirror){game.mirrorSend?.({t:'sub',kind:'pitch',index:Number(b.dataset.benchPitch)});toast('投手交代をリクエストしました');setTimeout(()=>{if(modalKind==='bench')benchModal('pitch');},600);}else if(game.changePitcher(Number(b.dataset.benchPitch))){checkpoint();toast('投手を交代しました');benchModal('pitch');}return;}
   if(b.dataset.lineupReserve){const {config}=lineupConfig(lineupContext),slot=config.order.indexOf(pregameTarget);if(slot>=0&&!config.order.includes(b.dataset.lineupReserve)){const old=config.order[slot];config.order[slot]=b.dataset.lineupReserve;for(const pos of positionOptions)if(config.fielding[pos]===old)config.fielding[pos]=b.dataset.lineupReserve;pregameTarget=b.dataset.lineupReserve;lineupModal(lineupContext,b.dataset.lineupReserve,$('modal-content').scrollTop);}return;}
   if(b.dataset.lineupMove){const {config}=lineupConfig(lineupContext),i=config.order.indexOf(b.dataset.lineupMove),j=i+Number(b.dataset.dir),scroll=$('modal-content').scrollTop;if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];lineupModal(lineupContext,b.dataset.lineupMove,scroll);return;}
   if(b.dataset.lineupPreset){const {club,config,players}=lineupConfig(lineupContext),key=b.dataset.lineupPreset;config.order=(key==='default'?NightGame.arrangeLineup(club):players.slice().sort((a,c)=>c[key]-a[key])).map(p=>p.id);if(key==='default')config.fielding={};lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPitcher!==undefined){const {config}=lineupConfig(lineupContext);config.pitcher=Number(b.dataset.lineupPitcher);saveLineup(lineupContext);lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPlayer){lineupModal(lineupContext,b.dataset.lineupPlayer);$('modal-content').querySelector('.lineup-ability').open=true;return;}
   if(b.dataset.derbyBatter){settings.derbyBatter=b.dataset.derbyBatter;const scroll=$('modal-content').scrollTop;setupDerby();$('modal-content').scrollTop=scroll;return;}
   if(b.dataset.toggle){const k=b.dataset.toggle;settings[k]=!settings[k];b.classList.toggle('on',settings[k]);b.setAttribute('aria-checked',String(settings[k]));save();if(game)updateUI();if(k==='leftHanded'&&$('thumb-preview-wrap'))$('thumb-preview-wrap').innerHTML=thumbPreview();return;}
   if(b.dataset.ctClub){const id=b.dataset.ctClub,i=ctPicks.indexOf(id);if(i>=0)ctPicks.splice(i,1);else if(ctPicks.length<8)ctPicks.push(id);ctSetupModal();return;}
   if(b.dataset.onlineClub){const id=b.dataset.onlineClub;if(online?.role==='host'){online.myClub=id;onlineModal();}else if(online?.role==='guest'){online.myClub=id;online.session?.send({t:'club',club:id});online.status='球団を送信しました。ホストの開始を待っています…';onlineModal();}return;}
   if(b.dataset.onlineInnings){if(online?.role==='host'){online.innings=Number(b.dataset.onlineInnings);onlineModal();}return;}
   if(b.dataset.onlineSide){if(online?.role==='host'){online.hostHome=b.dataset.onlineSide==='home';onlineModal();}return;}
   if(b.dataset.onlinePark){if(online?.role==='host'){online.park=b.dataset.onlinePark;onlineModal();}return;}
   if(b.dataset.draftPick){if(league?.draftUserPick(b.dataset.draftPick)){saveLeague();draftModal();}return;}
   if(b.dataset.faSign){if(league?.faSign(b.dataset.faSign)){saveLeague();draftModal();}return;}
   if(b.dataset.farmPlayer){if(league){const id=b.dataset.farmPlayer;league.setFarm(id,!league.farmIds(league.clubId).includes(id));saveLeague();farmModal();}return;}
   if(b.dataset.difficulty){settings.difficulty=b.dataset.difficulty;save();$('modal-content').querySelectorAll('[data-difficulty]').forEach(el=>el.classList.toggle('active',el.dataset.difficulty===settings.difficulty));return;}
   if(b.dataset.injuryRate){settings.injuries=b.dataset.injuryRate;save();NightPennant.injuryRate=settings.injuries;$('modal-content').querySelectorAll('[data-injury-rate]').forEach(el=>el.classList.toggle('active',el.dataset.injuryRate===settings.injuries));return;}
   if(b.dataset.innings){settings.innings=Number(b.dataset.innings);save();setupMatch();return;}
   if(b.dataset.runningMode){chooseRunningMode(b.dataset.runningMode==='manual');settingsModal();return;}
   if(b.dataset.fieldSpeed){settings.fieldSpeed=Number(b.dataset.fieldSpeed);if(game)game.fieldSpeed=settings.fieldSpeed;save();settingsModal();return;}
   if(b.dataset.rosterTeam){rosterModal(null,b.dataset.rosterTeam);return;}
   if(b.dataset.player){rosterModal(b.dataset.player,b.dataset.team);return;}
   if(b.dataset.movePlayer){const {config}=lineupConfig('match'),i=config.order.indexOf(b.dataset.movePlayer),j=i+Number(b.dataset.dir);if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];saveLineup('match');rosterModal(b.dataset.movePlayer);return;}
   if(b.dataset.orderPreset){const {club,config}=lineupConfig('match');config.order=(b.dataset.orderPreset==='default'?NightGame.arrangeLineup(club):lineupConfig('match').players.slice().sort((a,c)=>c[b.dataset.orderPreset]-a[b.dataset.orderPreset])).map(p=>p.id);if(b.dataset.orderPreset==='default')config.fielding={};saveLineup('match');rosterModal();return;}
   if(b.dataset.starter!==undefined){const kind=screen==='pennant'?'league':'match',{club,config}=lineupConfig(kind);config.pitcher=Number(b.dataset.starter);saveLineup(kind);rosterModal(club.pitchers[config.pitcher].id);return;}
   if(b.dataset.relief!==undefined){if(game?.changePitcher(Number(b.dataset.relief))){toast('投手を交代しました');rosterModal(game.pitcher.id,game.userSide);}return;}
   if(b.dataset.defense){if(game&&!game.umpireMode){game.defense=b.dataset.defense;checkpoint();tacticsModal();}return;}
   if(b.dataset.shift){if(game&&!game.umpireMode){game.shift=b.dataset.shift;checkpoint();tacticsModal();}return;}
   switch(b.dataset.action){
     case'close':closeModal();break;
     case'totals':totalsModal();break;
   case'ct-start':customTourney={clubs:ctPicks.slice(),rounds:[[[0,7],[3,4],[2,5],[1,6]].map(([a,b])=>({home:ctPicks[a],away:ctPicks[b],winner:null,hs:null,as:null}))],champion:null};saveCustomTourney();customTourneyModal();break;
   case'ct-play':playCustomTourney();break;
   case'ct-reset':customTourney=null;saveCustomTourney();closeModal(false);toast('トーナメントを破棄しました');break;
   case'online-host':onlineCreateRoom();break;
   case'online-join':onlineJoinRoom();break;
   case'online-start':startOnlineMatch();break;
   case'online-cancel':onlineCleanup();closeModal();break;
   case'online-exit':onlineCleanup();hideOnlineGuest();home();break;
   case'draft-finish':if(league?.startNextSeason()){saveLeague();closeModal(false);leagueDashboard();toast((league.season)+'年目のシーズンが始まりました');}break;
   case'fa-finish':if(league){league.ensureFaMarket();league.faFinish();saveLeague();if(league.startNextSeason()){saveLeague();closeModal(false);leagueDashboard();toast((league.season)+'年目のシーズンが始まりました');}else draftModal();}break;
   case'allstar-play':playAllstar();break;
   case'allstar-sim':if(league?.allstarDue){const s=league.simAllstar();league.completeAllstar();saveLeague();closeModal(false);leagueDashboard();toast('オールスター: '+s.awayScore+' - '+s.homeScore);}break;
   case'allstar-back':closeModal(false);game=null;leagueDashboard();break;
   case'rematch-same':case'rematch-swap':if(online?.role==='host'&&online.session?.open){online.rematchSwap=b.dataset.action==='rematch-swap';online.rematchState='offered';online.session.send({t:'rematch',swap:online.rematchSwap});if(game)finish(game);}break;
   case'rematch-accept':if(online?.role==='guest'&&online.rematchOffer){online.session?.send({t:'rematch-yes'});online.rematchOffer=null;closeModal(false);toast('再戦を開始します…');}break;
   case'rematch-decline':if(online?.role==='guest'){online.session?.send({t:'rematch-no'});online.rematchOffer=null;guestResultModal();}break;
   case'backup-export':{const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('nightball.'))data[k]=localStorage.getItem(k);}const blob=new Blob([JSON.stringify({app:'nightball',version:1,exportedAt:new Date().toISOString(),data})],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nightball-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('セーブデータを書き出しました');break;}
     case'backup-import':{const input=document.createElement('input');input.type='file';input.accept='application/json';input.onchange=()=>{const file=input.files[0];if(!file)return;file.text().then(text=>{try{const parsed=JSON.parse(text);if(parsed?.app!=='nightball'||!parsed.data||typeof parsed.data!=='object')throw new Error('bad file');let n=0;for(const [k,v] of Object.entries(parsed.data))if(k.startsWith('nightball.')){localStorage.setItem(k,String(v));n++;}if(!n)throw new Error('empty');toast('データを読み込みました。再読み込みします');setTimeout(()=>location.reload(),700);}catch{toast('読み込めないファイルです');}});};input.click();break;}
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
     case'fast-forward':
      if(game&&game.isFixture){closeModal(false);game.paused=false;game.fastForward=true;game.autoBatting=true;game.autoDefense=true;toast('自動で高速進行中。ポーズから操作に戻れます');updateUI();}
      break;
     case'auto-off':
      if(game&&!game.umpireMode){game.fastForward=false;game.spectate=false;game.autoBatting=false;game.autoDefense=false;closeModal(false);game.paused=false;toast('手動操作に戻りました');updateUI();}
      break;
     case'spectate-start':
      pendingSpectate=true;start('match');
      break;
     case'umpire-start':
     case'umpire-restart':
      pendingUmpire=true;start('match');
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
 $('modal-content').addEventListener('input',e=>{if(e.target.dataset?.customDiff){const k=e.target.dataset.customDiff;settings.customDifficulty[k]=Math.max(-10,Math.min(10,Number(e.target.value)||0));globalThis.NightGameCustomDifficulty=settings.customDifficulty;const o=$('cd-'+k+'-output');if(o)o.textContent=(settings.customDifficulty[k]>0?'+':'')+settings.customDifficulty[k];save();}
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
 $('modal-content').addEventListener('change',e=>{if(e.target.id==='apbc-club-filter'){apbcSelection.clubFilter=e.target.value;apbcSelectionModal();$('apbc-club-filter').focus({preventScroll:true});return;}if(e.target.id==='editor-club'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;editorSelection=null;editorDetail=null;save();lineupModal('edit');return;}if(e.target.dataset.editorPosition){editorSelection=null;const {club,config}=lineupConfig(lineupContext);NightSquad.position(club,config,e.target.dataset.editorPosition,e.target.value);saveLineup(lineupContext);lineupModal(lineupContext,e.target.dataset.editorPosition,$('modal-content').scrollTop);return;}if(e.target.id==='lineup-replace-target'){pregameTarget=e.target.value;}if(e.target.dataset.lineupPosition){const {config}=lineupConfig(lineupContext),id=e.target.dataset.lineupPosition,previous=positionOptions.find(pos=>config.fielding[pos]===id),other=config.fielding[e.target.value];config.fielding[previous]=other;config.fielding[e.target.value]=id;lineupModal(lineupContext,id,$('modal-content').scrollTop);}if(e.target.dataset.benchPosition){if(game.mirror){game.mirrorSend?.({t:'sub',kind:'defense',id:e.target.dataset.benchPosition,pos:e.target.value});toast('守備交代をリクエストしました');setTimeout(()=>{if(modalKind==='bench')benchModal('defense');},600);}else{game.swapFieldPosition(e.target.dataset.benchPosition,e.target.value);checkpoint();benchModal('defense');}}if(e.target.id==='derby-park'){settings.derbyPark=e.target.value;save();$('derby-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.derbyPark));}if(e.target.id==='derby-club'){settings.derbyClub=e.target.value;settings.derbyBatter=null;setupDerby();}if(e.target.id==='park-select'){settings.park=e.target.value;save();$('match-park-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.park));}if(e.target.id==='starter-select'){lineupConfig('match').config.pitcher=Number(e.target.value);saveLineup('match');}if(e.target.id==='match-team'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.all.find(c=>c.id!==settings.matchTeam).id;settings.park=NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;lineupConfig('match');save();setupMatchTeams();}if(e.target.id==='match-opponent'){settings.matchOpponent=e.target.value;save();setupMatchTeams();}});
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
    if(state){renderer.render(state.game,state.time);const ro=hitReadout(state.game.hit);if(ro){$('hit-readout').textContent=ro+(state.game.hit?.distance?' · '+Math.round(state.game.hit.distance)+'m':'');$('play-tools').hidden=false;}}
    else stopReplay();
   }else{
    const activeDt=document.hidden?0:dt;
    if(!game.paused)tickPlayFeedback(activeDt);
    const hold=playFeedback.scoreTime>0||playFeedback.callTime>0;
    const current=game;
    if(current.mirror)current.mirrorTick(activeDt);
    else current.update(activeDt,hold||playFeedback.pendingReplay);
    if(screen!=='game'||game!==current)return;
    const rb=$('react');if(rb)rb.hidden=!game?.onlineGame;onlineTick(game);updateScoringChip(game);
    try{updatePlayCallUI(game);}catch{}
    try{updateUmpireUI(game);}catch{}
    if(game.phase==='field'&&!review.playback)updatePlayTools();
    if((game.fastForward||game.spectate)&&game.phase==='change'&&$('modal').hidden)continueHalf();
    if(game.phase==='field'&&(game.isFixture||game.career||game.challenge))updateScoreCube($('scoreboard'),game);
    if(playFeedback.pendingReplay&&!game.fastForward&&!game.spectate&&!game.paused&&(game.phase==='result'||(game.mirror&&['intro','change'].includes(game.phase)))&&
     !playFeedback.scoreTime&&!playFeedback.callTime&&$('modal').hidden){
     playFeedback.pendingReplay=false;launchReplay();
    }
    if(game.phase==='field'&&!game.mirror)review.capture(game);
    if(game.mirror&&(game.phase==='field'||game.phase==='result')){try{review.capture(game);if(game.phase==='result'&&game.field?.resolved&&!game.field._rf){game.field._rf=1;if(review.capture(game,true))playFeedback.pendingReplay=true;}}catch{}}
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
