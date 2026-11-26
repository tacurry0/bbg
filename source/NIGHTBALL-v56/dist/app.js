import { CustomParkPreview } from './custom-park3d.js?v=219';
import { AbsReview, absActorBounds } from './abs-review.js?v=3';
import { PlayReview, CHALLENGES, challengeWon, hitReadout } from './play-review.js?v=56';
import {playoffHTML} from './playoff-view.js?v=77';
import {buildMatchReport,resultReportHTML,playerBoxHTML,lineScoreHTML,heroInterviewHTML,finalScoreCard,resultHighlightsHTML,halfBreakScoreHTML} from './results.js?v=222';
import { renderRunnerMap, bindRunnerMap } from './runner-map.js?v=56';
import {careerUsage, careerScoreboard, careerResult, careerSetup, careerDashboardHTML, updateCareerSetup} from './career-view.js?v=77';
import { BallparkMusic, SongVault, musicSettings, MUSIC_SLOTS, PRESETS, DEFAULT_CAREER_CHEER, defaultTeamCheer, teamMusicKey, playerMusicKey, careerMusicKey, trackForEvent } from './music.js?v=223';
import {updateScoreCube,updatePlayerHUD} from './game-hud.js?v=76';
import { StadiumRenderer } from './stadium3d.js?v=219';
import { GAME_LIGHTING_OPTIONS, gameLightingMode } from './game-lighting.js?v=74';
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const {text: localize, setLanguage}=NightI18n;
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
 const defaults={gameLighting:'auto',hudScale:100,controlsScale:100,manualRunning:true,runningModeChosen:false,difficulty:'standard',sound:true,audioCues:false,soundVolume:78,crowdVolume:50,vibration:true,assist:false,cursorVersion:4,cursorLift:80,cursorShift:64,timingGuide:true,battingAssist:true,timingSound:true,sensitivity:1,releaseSwing:true,leftHanded:false,fieldSpeed:1,innings:5,park:'night',pitcher:NightPlayers.defaultPitcherIndex?.(NightTeams.get('owls'))??0,practiceClub:'owls',practiceBatter:'o1',practicePitch:'random',pitchingClub:'owls',pitchingPlayer:null,bullpenClub:'owls',bullpenPlayer:null,derbyPark:'tokyo-dome',derbyClub:'owls',derbyBatter:'o4',showTrace:true,matchTeam:'owls',matchOpponent:'foxes',matchUserHome:true,randomRoster:false,variantFullCount:false,variantMetalBat:false,variantLowReboundBat:false,variantNoBreaking:false,variantTwoOuts:false,hardcore:false,handicapUserRuns:0,handicapCpuRuns:0,handicapUserOuts:3,handicapCpuOuts:3,taKind:'bat',taSeconds:90,defenseSpeed:1,apbcTeam:'apbc-taipei',apbcOpponent:'apbc-japan',apbcUserHome:true,apbcInnings:5,apbcLineups:{},matchLineups:{},pennantGamesPerOpponent:4,tiebreak:false,injuries:'normal',tts:false,customDifficulty:{bat:0,pitch:0,field:0,run:0},order:NightPlayers.owls.map(p=>p.id)};
 const recordDefaults={games:0,wins:0,draws:0,hr:0,hits:0,maxDistance:0,bestTimedDerby:0,bestTimedDerbyDistance:0,perfect:0,grandSlam:false,ks:0,thrown:0,practicePitches:0,practiceHits:0,practiceHr:0,practiceMaxDistance:0,practiceThrown:0,practiceKs:0,achievements:{},winStreak:0,bestStreak:0};
 let settings,records;
 try{settings={...defaults,...JSON.parse(localStorage.getItem('nightball.settings')||'{}')};records={...recordDefaults,...JSON.parse(localStorage.getItem('nightball.records')||'{}')};}catch{settings={...defaults};records={...recordDefaults};}
 if(!['casual','standard','pro'].includes(settings.difficulty))settings.difficulty='standard';
 try{if(!JSON.parse(localStorage.getItem('nightball.settings')||'{}').cursorVersion){settings.difficulty='standard';settings.assist=false;}}catch{}if(settings.cursorVersion<4){settings.cursorLift=80;settings.cursorShift=64;settings.leftHanded=false;}settings.cursorVersion=4;settings.releaseSwing=true;settings.cursorShift=Math.max(0,Math.min(140,Number(settings.cursorShift)||0));
 settings.innings=[3,5,9].includes(settings.innings)?settings.innings:5;settings.fieldSpeed=settings.fieldSpeed===2?2:1;settings.pitcher=Math.max(0,Math.min(NightPlayers.homePitchers.length-1,settings.pitcher||0));settings.cursorLift=Math.max(0,Math.min(160,(Number.isFinite(Number(settings.cursorLift))?Number(settings.cursorLift):80)));if(!Array.isArray(settings.order)||settings.order.length!==9||new Set(settings.order).size!==9||settings.order.some(id=>!NightPlayers.rosters.owls.batters.some(p=>p.id===id)))settings.order=NightPlayers.owls.map(p=>p.id);
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchTeam))settings.matchTeam='owls';
 if(!NightTeams.matchTeams.some(c=>c.id===settings.matchOpponent)||settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;
 if(!settings.matchLineups||typeof settings.matchLineups!=='object'||Array.isArray(settings.matchLineups))settings.matchLineups={};
 if(settings.openingLineupRevision!==2026){
  const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((id,i)=>id===b[i]);
  for(const club of NightTeams.matchTeams||[]){if(!club.openingLineup)continue;const old=club.previousStartingOrder;const cfg=settings.matchLineups[club.id];if(cfg&&same(cfg.order,old)){cfg.order=club.startingOrder.slice();cfg.fielding={...club.startingFielding};if(cfg.pitcher===0)cfg.pitcher=NightPlayers.defaultPitcherIndex(club);}if(club.id==='owls'&&same(settings.order,old)){settings.order=club.startingOrder.slice();if(settings.pitcher===0)settings.pitcher=NightPlayers.defaultPitcherIndex(club);}}
  settings.openingLineupRevision=2026;
 }
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
 // v109: manual baserunning becomes the default. Settings saved by older
 // versions always contain manualRunning (the whole object is persisted),
 // so a stored false cannot be told apart from the old default; choices
 // made through the running controls record runningModeChosen instead.
 // Without that marker, treat the stored value as the old default and
 // migrate to manual once. The marker is set here so the migration runs
 // only once, and any later explicit choice (including auto) is kept.
 if(!settings.runningModeChosen){settings.manualRunning=true;settings.runningModeChosen=true;}
 settings.language=setLanguage(settings.language);
 window.nightSettings=settings;
 // v120: saved uniform colour overrides recolour the shared club objects.
 let uniformOverrides=NightUniforms.load(),uniformClub='owls';
 const allClubs=()=>[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];
 function applyUniforms(){NightUniforms.apply(allClubs(),uniformOverrides);}
 applyUniforms();
 const stadiumAudio=new NightAudio(),songVault=new SongVault(),ballparkMusic=new BallparkMusic(stadiumAudio,songVault);
 const review=new PlayReview();
 let game=null,screen='home',modalKind='',saved=false,pendingSpectate=false,pendingUmpire=false,pendingTimeAttack=false,pendingSurvival=false,pendingDraft=false,pendingConquest=false,conquestCtx=null,conquestUser=null,draftState=null,draftFilter='ALL',draftOrigin=new Map(),lastMode='match',lastFocus=null,toastTimer;
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
 }
 function save(){try{localStorage.setItem('nightball.settings',JSON.stringify(settings));localStorage.setItem('nightball.records',JSON.stringify(records));}catch{}renderMenuClubs();updateSound();}
 function updateSound(){$('sound').innerHTML=svg(settings.sound?'sound':'mute');$('sound').setAttribute('aria-label',settings.sound?'サウンドをオフ':'サウンドをオン');$('sound').setAttribute('aria-pressed',String(settings.sound));syncAudio();}
 function syncAudio(){
  const enabled=settings.sound&&!document.hidden,playing=screen==='game'&&game&&game.phase!=='ended';
  const active=!!playing&&!game.paused&&$('modal').hidden;
  stadiumAudio.update({enabled,active,volume:settings.soundVolume,crowd:settings.crowdVolume,cues:!!settings.audioCues,park:game?.park?.theme||NightPlayers.parks.find(p=>p.id===settings.park)?.theme||'night'});
  const results=screen==='game'&&game?.phase==='ended'&&['result','career-result'].includes(modalKind);
  ballparkMusic.update(playing||results?game:null,settings.music,enabled,active||results);
 }
 function unlockAudio(){stadiumAudio.unlock();syncAudio();}
 function sound(name){syncAudio();stadiumAudio.play(name,{hand:game?.batter?.hand});if(name==='homer')vibrate([30,30,60]);else if(name==='hit'||name==='perfect')vibrate(20);}
 function vibrate(v){if(settings.vibration&&navigator.vibrate)try{navigator.vibrate(v);}catch{}}
 function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('show');$('toast').textContent='';},2500);}
 // Loading progress (v169, checker item loading-progress-display): one shared
 // overlay for waits that used to look like a freeze — match-start preparation
 // (indeterminate, set by activateGame) and the on-demand Tokyo Dome download
 // (real byte progress, reported by tokyo-nightball.js through
 // 'nightball-loading' events). The overlay appears only when a wait outlasts
 // a 250ms grace period, so fast cached loads never flash it, and while it is
 // up it blocks taps so a waiting user cannot double-fire a start button.
 const loadingState={prep:false,asset:null,shown:false,timer:0};
 function currentLoading(){return loadingState.asset||(loadingState.prep?{label:'試合を準備しています',fraction:null}:null);}
 function paintLoading(){
  const el=$('loading-overlay');if(!el)return;
  const active=currentLoading();
  if(!active){if(loadingState.shown){el.hidden=true;loadingState.shown=false;}return;}
  el.hidden=false;loadingState.shown=true;$('loading-label').textContent=active.label||'読み込んでいます';const f=active.fraction,bar=$('loading-bar');bar.style.width=f==null?'40%':Math.max(2,Math.round(f*100))+'%';bar.classList.toggle('indeterminate',f==null);$('loading-pct').textContent=f==null?'':Math.round(f*100)+'%';
 }
 function renderLoading(){
  const el=$('loading-overlay');if(!el)return;
  if(!currentLoading()){clearTimeout(loadingState.timer);loadingState.timer=0;if(loadingState.shown){el.hidden=true;loadingState.shown=false;}return;}
  if(loadingState.shown){paintLoading();return;}
  // The grace timer is armed once per wait, never re-armed by progress
  // updates (they arrive faster than the grace period during a download).
  if(!loadingState.timer)loadingState.timer=setTimeout(()=>{loadingState.timer=0;paintLoading();},250);
 }
 window.addEventListener('nightball-loading',e=>{const d=e.detail||{};loadingState.asset=(d.phase==='done'||d.phase==='error')?null:{label:d.label,fraction:d.fraction};renderLoading();});
 // Tab swipe navigation (v171, checker item tab-swipe-navigation): on tabbed
 // screens a decisive horizontal swipe moves to the adjacent tab, exactly as
 // if that tab had been tapped. Swipes starting on form controls or the game
 // canvas never trigger it, vertical-dominant and slow drags are ignored,
 // and the ends of the tab row do not wrap.
 function attachTabSwipe(el,buttonsSel){
  if(!el||el.dataset.swipeBound)return;el.dataset.swipeBound='1';
  let sx=0,sy=0,st=0,tracking=false;
  el.addEventListener('touchstart',e=>{
   if(e.touches.length!==1||e.target.closest('input,textarea,select,canvas,[data-no-swipe]')){tracking=false;return;}
   const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=Date.now();tracking=true;
  },{passive:true});
  el.addEventListener('touchend',e=>{
   if(!tracking)return;tracking=false;
   const t=e.changedTouches[0];if(!t)return;
   const dx=t.clientX-sx,dy=t.clientY-sy;
   if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.6||Date.now()-st>700)return;
   const buttons=[...el.querySelectorAll(buttonsSel)];
   if(buttons.length<2)return;
   const cur=buttons.findIndex(b=>b.getAttribute('aria-current')==='page'||b.getAttribute('aria-pressed')==='true');
   if(cur<0)return;
   const next=cur+(dx<0?1:-1);
   if(next<0||next>=buttons.length)return;
   buttons[next].click();
  },{passive:true});
 }
 attachTabSwipe($('career'),'.career-tabs [data-tab]');
 attachTabSwipe($('pennant'),'.pennant-league-options [data-pennant-league]');
 // Screen history (v174, checker item back-navigation-consistency; the
 // match-ending part was pre-fixed in v167): top-level screens record
 // themselves in a stack mirrored into the browser history, so the
 // device/browser Back button closes an open modal first and then walks
 // back to the previous screen instead of leaving the app mid-flow.
 // Home is the root. In-app transitions push one history entry; when the
 // navigation is itself caused by a Back press (navPop), the stack is
 // updated without pushing. Match screens keep their own stronger
 // double-entry guard from v167 and stay out of this stack.
 let screenStack=['home'],navPop=false;
 const screenScrollPositions=new Map();
 let scrollView='home',modalScrollOrigin=null;
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 function changeScreen(next,view=next){
  const y=window.scrollY;
  if(screen===next&&scrollView===view)return y;
  if(screen!=='game')screenScrollPositions.set(scrollView,y);
  screen=next;scrollView=view;
  return screenScrollPositions.get(view)??0;
 }
 function restorePageScroll(y){
  if(window.scrollY!==y)window.scrollTo(0,y);
 }
 function trackScreen(next){
  if(screenStack[screenStack.length-1]===next)return;
  screenStack.push(next);
  if(!navPop)try{history.pushState({nightball:'screen',screen:next},'',location.href);}catch{}
 }
 function trackHome(){screenStack=['home'];}
 function backToPreviousScreen(){
  navPop=true;
  try{
   if(modalKind){if(returnFromEditModal()){try{history.pushState({nightball:'screen',screen},'',location.href);}catch{}return;}if(['online-teams','online-park','online-pitchers','online-options'].includes(modalKind)||(modalKind==='lineup'&&lineupContext==='online')){if(lineupContext==='online'&&modalKind==='lineup')saveLineup('online');onlineModal();}else if(modalKind==='online'&&online){onlineCleanup();closeModal(false);}else if(['match-teams','park-picker','match-pitchers','match-options','match-presets'].includes(modalKind)||(modalKind==='lineup'&&lineupContext==='match')||(modalKind==='roster'&&pregameRoster))setupMatch();else if(modalKind==='directory-player')directoryRoster(directoryClub,directoryRosterScroll);else if(modalKind==='directory-roster')directoryTeams();else closeModal(false);try{history.pushState({nightball:'screen',screen},'',location.href);}catch{}return;}
   if(screen==='home')return;
   if(leagueEditorFromHub&&screen==='pennant'&&scrollView==='pennant-editor'){returnToEditLeagues();return;}
   screenStack.pop();
   const prev=screenStack[screenStack.length-1]||'home';
   if(prev==='pennant')leagueDashboard();
   else if(prev==='career')worldDashboard();
   else if(prev==='apbc-cup')apbcDashboard();
   else home();
  }finally{navPop=false;}
 }
 function modal(html,kind){
  const backdrop=$('modal'),content=$('modal-content');
  if(modalKind==='stadium-editor')disposeStadiumPreview();
  const same=!backdrop.hidden&&modalKind===kind;
  const scroller=content.querySelector('.pf-body')||content;
  const scroll=same?scroller.scrollTop:0;
  const openDetails=same?new Set([...content.querySelectorAll('details[data-ui-section][open]')].map(d=>d.dataset.uiSection)):new Set();
  if(backdrop.hidden){
   lastFocus=document.activeElement;
   modalScrollOrigin={screen,y:window.scrollY,overflow:document.body.style.overflow};
  }
  if(game?.phase!=='ended')stadiumAudio.stopEffects();
  if(kind!=='music-settings')ballparkMusic.stop('preview');
  modalKind=kind;content.dataset.kind=kind;
  // Never leave a transform animation attached to the fixed-size pregame shell.
  if(!same)content.getAnimations?.().forEach(animation=>animation.cancel());
  content.innerHTML=html;
  content.classList.toggle('preflight',!!content.querySelector(':scope > .pf-header'));
  backdrop.classList.toggle('preflight-backdrop',content.classList.contains('preflight'));
  if(same)content.querySelectorAll('details[data-ui-section]').forEach(d=>d.open=openDetails.has(d.dataset.uiSection));
  backdrop.hidden=false;document.body.style.overflow='hidden';
  if(!same&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const body=content.querySelector('.pf-body');
   if(body)body.animate?.([{opacity:.65},{opacity:1}],{duration:140,easing:'ease-out'});
   else content.animate?.([{opacity:.55,transform:'translateY(10px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:160,easing:'ease-out'});
  }
  (content.querySelector('.pf-body')||content).scrollTop=scroll;
  if(!same){
   const button=content.querySelector('button');
   if(button)setTimeout(()=>{if(!backdrop.hidden&&content.contains(button))button.focus({preventScroll:true});},30);
  }
 }
 let pregameRoster=false;
 function closeModal(resume=true){
  if(resume&&returnFromEditModal())return;
  if(resume&&onlineMatchActive()){
   if(online.sync.disconnected||modalKind==='online-gone')return;
   if(online.sync.lock){if(!onlineOwnsMenu())return;if(online.sync.subPending!=null){toast('交代内容を同期しています…');return;}closeModal(false);onlineFinishLocalLock();return;}
  }
  const previous=modalKind,backdrop=$('modal');
  if(previous==='stadium-editor')disposeStadiumPreview();
  pregameRoster=false;
  ballparkMusic.stop('preview');modalKind='';
  if(!backdrop.hidden){
   const origin=modalScrollOrigin;
   backdrop.hidden=true;
   document.body.style.overflow=origin?.overflow??'';
   if(origin?.screen===screen)restorePageScroll(origin.y);
   modalScrollOrigin=null;
   lastFocus?.focus?.({preventScroll:true});lastFocus=null;
  }
  if(resume&&game&&screen==='game'&&game.phase!=='ended')game.paused=false;
  if(resume&&game&&screen==='game')updateUI();
  if(resume&&game?.phase==='career-ready')$('career-field-overlay').querySelector('button')?.focus({preventScroll:true});
  if(resume&&screen==='game'&&game?.phase==='ended'&&!['result','career-result'].includes(previous))finish(game);
 }
 const modalTitle=(en,ja,close=true)=>`<div class="modal-top"><h2 id="modal-title">${({'今夜の試合':'試合設定','親指の操作・ゲーム設定':'設定','押して、狙って、離す。':'遊び方','ひと休み。':'タイム','練習おつかれさま':'練習結果','選手・ベンチ':'選手データ'})[ja]||ja}</h2>${close?'<button class="close-button" data-action="close" aria-label="閉じる">×</button>':''}</div>`;
 // Keep the legacy CPBL save key and one independent season for each league.
 const pennantLeagues={...NightPennant.leagues};
 try{if(localStorage.getItem('nightball.pennant.npb'))pennantLeagues.npb='旧NPB';}catch{}
 try{for(const d of NightLeague.list())pennantLeagues[d.id]=d.name;}catch{}
 let selectedLeague=Object.hasOwn(pennantLeagues,settings.pennantLeague)?settings.pennantLeague:'cpbl';
 let league,selectedClub,selectedGamesPerOpponent,leagueSaveWarned=false,leagueSlot=1;
 // v136 pennant save slots: 3 slots per league. Slot 1 is the legacy key
 // itself (see NightPennantSlots in pennant.js), so existing saves carry
 // over untouched; slots 2/3 live under new <base>.slot<N> keys.
 const leagueSaveKey=(id,slot=leagueSlot)=>NightPennantSlots.key(id,slot);
 function resetLeaguePicker(){
  selectedClub=league?.clubId||NightPennant.clubsFor(selectedLeague)[0].id;
  selectedGamesPerOpponent=league?.gamesPerOpponent||settings.pennantGamesPerOpponent;
  const def=NightLeague.get(selectedLeague);
  if(def){selectedGamesPerOpponent=def.gamesPerOpponent;if(!def.clubIds.includes(selectedClub))selectedClub=def.clubIds[0];}
 }
 function loadLeague(id,slot){
  league=null;
  leagueSlot=slot===undefined?NightPennantSlots.getActive(localStorage,id):NightPennantSlots.setActive(localStorage,id,slot);
  try{
   const restored=NightPennantSlots.restore(localStorage,id,leagueSlot);
   if(restored)league=restored;
   if(league){league.managed=true;NightPennant.injuryRate=settings.injuries||'normal';}
  }catch{}
  resetLeaguePicker();
 }
 loadLeague(selectedLeague);
 function saveLeague(){NightPennant.injuryRate=settings.injuries||'normal';if(!NightPennantSlots.write(localStorage,league.leagueId,leagueSlot,league)&&!leagueSaveWarned){toast('保存容量が足りません。画面を閉じると進行状況を失う場合があります');leagueSaveWarned=true;}}
 function slotListHTML(){
  const slots=NightPennantSlots.list(localStorage,selectedLeague);
  const fmt=t=>{if(!t)return '';const d=new Date(t);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  return `<h2 class="arcade-section-title">セーブスロット（リーグごとに3つ）</h2><div class="pennant-slot-list">${slots.map(s=>`<div class="pennant-slot-row ${s.slot===leagueSlot?'selected':''}"><button data-pennant-slot="${s.slot}" aria-pressed="${s.slot===leagueSlot}"><b>スロット${s.slot}</b><span>${s.exists?(s.valid?`${s.clubShort||s.clubId||''} · ${s.season||1}年目 · ${s.played} / ${s.totalGames} 試合${s.savedAt?` · 最終保存 ${fmt(s.savedAt)}`:''}`:'読み込めないデータ'):'空き'}</span></button>${s.exists?`<button class="league-inline-button" data-slot-delete="${s.slot}">削除</button>`:''}</div>`).join('')}</div><p class="league-footnote">スロット1は従来のセーブそのものです。開始すると選択中のスロット（スロット${leagueSlot}）に保存されます。</p>`;
 }
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
 function showLeagueScreen(view){
  trackScreen('pennant');closeModal(false);
  const y=changeScreen('pennant',view);
  $('career').hidden=true;$('apbc-cup').hidden=true;$('home').hidden=true;$('game').hidden=true;$('pennant').hidden=false;
  $('pause').hidden=true;$('sub').hidden=true;$('settings').hidden=false;
  history.replaceState({nightball:'pennant'},'',location.href);
  return y;
 }
 function leaguePicker(){
  const y=showLeagueScreen('pennant-picker');
  if(selectedLeague==='npb'){
   $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">◀ 戻る</button><h1>旧NPBペナント</h1></div>${leagueTabs()}${slotListHTML()}${league?'<button class="primary-button" data-league-action="dashboard">進行中のペナントへ</button>':'<p class="league-footnote">セーブデータを読み込めませんでした。</p>'}`;
   restorePageScroll(y);
   return;
  }
  const customDef=NightLeague.get(selectedLeague);
  if(customDef){
   const clubs=NightPennant.clubsFor(selectedLeague);
   $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">◀ 戻る</button><h1>ペナント設定</h1></div>${leagueTabs()}${slotListHTML()}<button class="secondary-button" data-league-action="league-editor">＋ カスタムリーグを作成</button><div class="league-rule"><b>${customDef.name}</b><p>${customDef.clubIds.length}球団参加。各球団と${customDef.gamesPerOpponent}試合（1球団あたり${NightLeague.totalGamesPerClub(customDef)}試合・全${NightLeague.totalFixtures(customDef)}試合）。DH${customDef.dh?'あり':'なし'}。${customDef.playoffs?'上位3球団でプレーオフ。':'プレーオフなし（シーズン1位が優勝）。'}</p></div><h2 class="arcade-section-title">球団選択</h2><div class="club-grid">${clubs.map(c=>`<button class="club-choice ${selectedClub===c.id?'selected':''}" data-club-choice="${c.id}" aria-label="${c.name}" aria-pressed="${selectedClub===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong><span class="choice-check">${selectedClub===c.id?'✓':''}</span></button>`).join('')}</div><div class="league-rule"><b>1回制・2アウト満塁</b><p>同点は延長。</p></div><button class="primary-button" data-league-action="create">${NightTeams.get(selectedClub).short}で開始</button><button class="secondary-button" data-league-action="league-editor-edit">リーグを編集</button><button class="secondary-button" data-league-action="league-editor-delete">リーグを削除</button>${league?'<button class="secondary-button" data-league-action="dashboard">進行中のペナントへ</button><p class="league-footnote">開始すると選択中のスロットのペナントを置き換えます。</p>':''}`;
   restorePageScroll(y);
   return;
  }
  const isNPB=selectedLeague.startsWith('npb-'),clubs=NightPennant.clubsFor(selectedLeague);
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">◀ 戻る</button><h1>ペナント設定</h1></div>${leagueTabs()}${slotListHTML()}<button class="secondary-button" data-league-action="league-editor">＋ カスタムリーグを作成</button><section class="season-length-picker"><div class="season-length-heading"><h2>対戦数</h2><strong>${selectedGamesPerOpponent*(clubs.length-1)}<small>試合</small></strong></div><div class="season-length-options" role="group" aria-label="各相手との対戦数">${Array.from({length:10},(_,i)=>i+1).map(n=>`<button data-league-games="${n}" class="${n===selectedGamesPerOpponent?'selected':''}" aria-pressed="${n===selectedGamesPerOpponent}">${n}<small>試合ずつ</small></button>`).join('')}</div></section><h2 class="arcade-section-title">球団選択</h2><div class="club-grid">${clubs.map(c=>`<button class="club-choice ${selectedClub===c.id?'selected':''}" data-club-choice="${c.id}" aria-label="${c.name}" aria-pressed="${selectedClub===c.id}">${clubBadge(c.id)}<strong>${c.short}</strong><span class="choice-check">${selectedClub===c.id?'✓':''}</span></button>`).join('')}</div><div class="league-rule"><b>1回制・2アウト満塁</b><p>同点は延長。各球団と${selectedGamesPerOpponent}試合。上位3球団で${isNPB?'クライマックスシリーズ':'プレーオフ'}。</p></div><button class="primary-button" data-league-action="create">${NightTeams.get(selectedClub).short}で開始</button>${league?'<button class="secondary-button" data-league-action="dashboard">進行中のペナントへ</button><p class="league-footnote">開始すると選択中のスロットのペナントを置き換えます。</p>':''}`;
  restorePageScroll(y);
 }
 let leagueDraft=null;
 function captureLeagueDraftName(){const input=$('league-name-input');if(input&&leagueDraft)leagueDraft.name=input.value;}
 function leagueEditor(def,fromHub=false){
  leagueEditorFromHub=fromHub;
  leagueDraft=def?{...def,clubIds:[...def.clubIds]}:{name:'',clubIds:NightTeams.all.map(c=>c.id),gamesPerOpponent:4,dh:true,playoffs:true};
  renderLeagueEditor();
 }
 function renderLeagueEditor(){
  const y=showLeagueScreen('pennant-editor');
  const d=leagueDraft,v=NightLeague.validate({id:d.id||'custom-draft',name:d.name,clubIds:d.clubIds,gamesPerOpponent:d.gamesPerOpponent,dh:d.dh,playoffs:d.playoffs}),n=d.clubIds.length;
  const groups=[['CPBL',NightTeams.all],['NPB',NightTeams.npb||[]],['KBO',NightTeams.kbo||[]]];
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="picker">◀ 戻る</button><h1>カスタムリーグ${d.id?'編集':'作成'}</h1></div><p class="league-footnote">既存リーグの球団プールから参加球団を選びます。球団数は偶数（${NightPennant.CUSTOM_MIN_CLUBS}球団以上）で指定してください。奇数だと毎節1球団が試合のない節になってしまうため作成できません。</p><div class="setup-section"><label for="league-name-input">リーグ名</label><input id="league-name-input" class="field-select league-name-input" type="text" maxlength="24" value="${String(d.name||'').replace(/"/g,'&quot;')}" placeholder="リーグ名を入力"></div><h2 class="arcade-section-title">参加球団（${n}球団${n%2?'・奇数のため作成できません':''}）</h2>${groups.map(([label,list])=>`<h3 class="arcade-section-title">${label}</h3><div class="club-grid">${list.map(c=>`<button class="club-choice ${d.clubIds.includes(c.id)?'selected':''}" data-league-draft-club="${c.id}" aria-label="${c.name}" aria-pressed="${d.clubIds.includes(c.id)}">${clubBadge(c.id)}<strong>${c.short}</strong><span class="choice-check">${d.clubIds.includes(c.id)?'✓':''}</span></button>`).join('')}</div>`).join('')}<section class="season-length-picker"><div class="season-length-heading"><h2>対戦数</h2><strong>${n>=2?d.gamesPerOpponent*(n-1):0}<small>試合 / 球団</small></strong></div><p class="league-footnote">各対戦カード${d.gamesPerOpponent}試合ずつ、シーズン全${n>=2?NightLeague.totalFixtures(d):0}試合。</p><div class="season-length-options" role="group" aria-label="各相手との対戦数">${Array.from({length:10},(_,i)=>i+1).map(x=>`<button data-league-draft-games="${x}" class="${x===d.gamesPerOpponent?'selected':''}" aria-pressed="${x===d.gamesPerOpponent}">${x}<small>試合ずつ</small></button>`).join('')}</div></section><div class="league-rule"><b>ルール</b><div class="setting-label">DH（指名打者）</div><div class="segmented" role="group" aria-label="DHのありなし">${[[true,'あり'],[false,'なし']].map(([val,label])=>`<button data-league-draft-toggle="dh" data-league-draft-toggle-value="${val}" class="${d.dh===val?'active':''}" aria-pressed="${d.dh===val}">${label}</button>`).join('')}</div><div class="setting-label">プレーオフ</div><div class="segmented" role="group" aria-label="プレーオフのありなし">${[[true,'あり（上位3球団）'],[false,'なし']].map(([val,label])=>`<button data-league-draft-toggle="playoffs" data-league-draft-toggle-value="${val}" class="${d.playoffs===val?'active':''}" aria-pressed="${d.playoffs===val}">${label}</button>`).join('')}</div></div>${v.ok?'':`<p class="league-save-reason" role="alert">保存できません：${v.errors.join(' / ')}</p>`}<button class="primary-button" data-league-action="league-editor-save" ${v.ok?'':'disabled'}>保存する</button><button class="secondary-button" data-league-action="picker">キャンセル</button><h2 class="arcade-section-title">共有コード</h2><p class="league-footnote">${d.id?'「コードを発行」を押すと、このリーグを表す文字列コードを発行してコピーします。':''}受け取ったリーグのコードは下の欄に貼って読み込んでください。名前が同じリーグがある場合は、上書きせず別名で追加されます。</p><div class="setup-section"><label for="share-league-code">リーグの共有コード</label><textarea id="share-league-code" class="field-select" rows="3" placeholder="NB1.LEAGUE.…"></textarea></div>${d.id?'<button class="secondary-button" data-league-action="league-share-export">コードを発行</button>':''}<button class="secondary-button" data-league-action="league-share-import">コードを読み込む</button>`;
  const nameInput=$('league-name-input');
  if(nameInput)nameInput.addEventListener('input',()=>{
   captureLeagueDraftName();if(!leagueDraft)return;
   const vv=NightLeague.validate({id:leagueDraft.id||'custom-draft',name:leagueDraft.name,clubIds:leagueDraft.clubIds,gamesPerOpponent:leagueDraft.gamesPerOpponent,dh:leagueDraft.dh,playoffs:leagueDraft.playoffs});
   const btn=document.querySelector('[data-league-action="league-editor-save"]');if(btn)btn.disabled=!vv.ok;
   let reason=document.querySelector('.league-save-reason');
   if(!vv.ok){if(!reason&&btn){reason=document.createElement('p');reason.className='league-save-reason';reason.setAttribute('role','alert');btn.before(reason);}if(reason){reason.textContent='保存できません：'+vv.errors.join(' / ');reason.hidden=false;}}
   else if(reason)reason.hidden=true;
  });
  restorePageScroll(y);
 }
 function standingsHTML(id=league.leagueId){
  const rows=league.standings(id),own=id===league.leagueId;
  return `<div class="league-section-head"><h2>${league.completed?'最終順位':'順位表'}</h2><span>${own?`${league.played} / ${league.totalGamesAll} 試合`:pennantLeagues[id]}</span></div><div class="standings-wrap"><table class="standings-table" aria-label="ペナント順位表"><colgroup><col style="width:25px"><col><col style="width:27px"><col style="width:27px"><col style="width:53px"><col style="width:45px"></colgroup><thead><tr><th>順位</th><th>球団</th><th>勝</th><th>敗</th><th>得 / 失</th><th>得失差</th></tr></thead><tbody>${rows.map(r=>{const c=NightTeams.get(r.id);return `<tr class="${r.id===league.clubId?'your-club':''}"><td><b class="place-number">${r.rank}</b></td><th scope="row"><span class="standing-club">${clubBadge(c.id,true)}<span>${c.short}${c.id===league.clubId?'<i>操作球団</i>':''}</span></span></th><td>${r.wins}</td><td>${r.losses}</td><td class="runs-for-against"><b>${r.for}</b><span> / </span>${r.against}</td><td class="run-difference ${r.diff>0?'positive':r.diff<0?'negative':''}"><b>${r.diff>0?'+':''}${r.diff}</b></td></tr>`;}).join('')}</tbody></table></div><p class="league-footnote">${league.isNPB?'勝率、勝利数、同順位の球団間の対戦成績、得失点差の順で順位を決定。':'同じ勝敗のときは得失点差で順位を決定。'}</p>`;
 }
 function otherStandingsHTML(){
  return league.isNPB?`<details class="league-schedule"><summary>${pennantLeagues[league.otherLeague]}順位表 <span>＋</span></summary>${standingsHTML(league.otherLeague)}</details>`:'';
 }
 function fixtureHTML(f){
  const r=league.results[f.id]||league.interleague?.results?.[f.id],own=[f.home,f.away].includes(league.clubId),a=NightTeams.get(f.away),h=NightTeams.get(f.home);
  return `<div class="fixture-row ${own?'own-fixture':''}"><div class="fixture-team">${clubBadge(a.id,true)}<b>${a.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${a.id===league.clubId?'<i>自分</i>':''}</div><div class="fixture-score"><strong>${r?`${r.awayScore}<span> − </span>${r.homeScore}`:'vs'}</strong><small>${r?r.cold?`${r.innings}回コールド`:r.innings>1?`延長${r.innings}回`:'試合終了':'試合前'}</small></div><div class="fixture-team right"><b>${h.short.replace(/(ドラゴンズ|ライオンズ|ガーディアンズ|モンキーズ|ホークス)$/,'<br>$1')}</b>${clubBadge(h.id,true)}${h.id===league.clubId?'<i>自分</i>':''}</div></div>`;
 }
 function championshipCeremony(){
  if(!league?.postseasonCompleted||league.postseason.champion!==league.clubId||league.celebrated)return;
  league.celebrated=true;saveLeague();unlockAchievement('champion');
  showCelebration('優勝！',league.club.short+' チャンピオン',5200);
  modal(modalTitle('','🏆 優勝セレモニー')+'<p class="career-status-line">'+league.club.name+' が'+(league.isNPB?'日本シリーズ':'プレーオフ')+'を制覇しました！</p><p class="modal-note">'+(league.season||1)+'年目のチャンピオンです。おめでとうございます。</p><button class="primary-button" data-action="close">閉じる</button>','ceremony');
 }
 function preseasonDashboard(){
  const y=showLeagueScreen('pennant-preseason');
  const pre=league.preseason,f=league.preseasonFixture,isHome=f.home===league.clubId,opponent=NightTeams.get(isHome?f.away:f.home),resume=!!league.currentGame;
  const gameRow=g=>{const r=pre.results[g.id],h=NightTeams.get(g.home),a=NightTeams.get(g.away);return `<div class="fixture-row ${[g.home,g.away].includes(league.clubId)?'own-fixture':''}"><div class="fixture-team">${clubBadge(a.id,true)}<b>${a.short}</b>${a.id===league.clubId?'<i>自分</i>':''}</div><div class="fixture-score"><strong>${r?`${r.awayScore}<span> − </span>${r.homeScore}`:'vs'}</strong><small>${r?'試合終了':'試合前'}</small></div><div class="fixture-team right"><b>${h.short}</b>${clubBadge(h.id,true)}${h.id===league.clubId?'<i>自分</i>':''}</div></div>`;};
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">← ホーム</button><h1>ペナント</h1></div>${leagueTabs()}<div class="league-club-header">${clubBadge(league.clubId)}<div><span class="eyebrow">PRESEASON · オープン戦 · スロット${leagueSlot}</span><h1>${league.club.short}</h1><div class="season-summary"><span>開幕まであと <b>${pre.games.length-pre.index}</b> 試合</span></div></div></div><div class="season-progress"><i style="width:${pre.index/pre.games.length*100}%"></i></div><div class="season-caption"><span>オープン戦 第${pre.index+1}戦</span><span>${pre.index} / ${pre.games.length} 試合終了</span></div><div class="league-rule"><b>オープン戦</b><p>開幕前の調整期間です。結果は順位・シーズン個人成績には加算されません。二軍の選手も一軍戦に出場でき、出場した二軍選手には小さな育成クレジットが入ります。</p></div><section class="league-match-card"><div class="league-card-kicker"><span>${resume?'試合中':'次のオープン戦'}</span><span>第${pre.index+1}戦 · ${isHome?'後攻':'先攻'}</span></div><div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><span class="versus-label">VS</span><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>${isHome?'あなたは後攻。投球からスタート。':'あなたは先攻。打撃からスタート。'}<br>1回制 / 2アウト満塁 / 同点は延長</p>${weatherForecastHTML(ensurePennantForecast(f))}<button class="primary-button" data-league-action="play">${resume?'再開':'試合開始'}　↗</button><button class="league-inline-button" data-league-action="preseason-sim">この試合をシミュレート</button><button class="league-inline-button" data-league-action="lineup">オーダー編成</button></section><div class="league-section-head"><h2>オープン戦の日程・結果</h2><span>先攻　／　後攻</span></div><div class="fixture-list">${pre.games.map(gameRow).join('')}</div>${standingsHTML()}${otherStandingsHTML()}<button class="secondary-button" data-league-action="preseason-skip">オープン戦をスキップして開幕</button><button class="secondary-button" data-league-action="roster">選手データ</button><button class="secondary-button" data-league-action="farm">二軍（ファーム）</button><button class="secondary-button" data-league-action="scrimmage">紅白戦（練習試合）</button><button class="league-inline-button" data-league-action="picker">新しいペナント</button><p class="league-footnote">オープン戦をすべて終えるかスキップすると、ペナントレースが開幕します。</p>`;
  restorePageScroll(y);
 }
 function leagueDashboard(){
  if(!league){leaguePicker();return;}championshipCeremony();if(league.postseason){playoffDashboard();return;}if(league.preseasonActive&&!league.completed){preseasonDashboard();return;}if(league.interleagueActive)league.advanceInterleagueByes();const y=showLeagueScreen('pennant-season');
  const f=league.activeFixture,r=league.activeResult,isHome=f.home===league.clubId,opponent=NightTeams.get(isHome?f.away:f.home),row=league.standings().find(s=>s.id===league.clubId),won=r&&(isHome?r.homeScore>r.awayScore:r.awayScore>r.homeScore),ownScore=r?(isHome?r.homeScore:r.awayScore):0,oppScore=r?(isHome?r.awayScore:r.homeScore):0;
  const ilActive=league.interleagueActive,ilRoundFixtures=ilActive?league.interleague.rounds[league.interleague.index]:league.schedule[league.round];
  const leaders=league.standings().filter(s=>s.rank===1),champion=league.completed?league.playoffSeeds()[0].clubId===league.clubId:leaders.some(s=>s.id===league.clubId),resume=!!league.currentGame;
  const matchNumber=league.played+(r?0:1);
  $('pennant').innerHTML=`<div class="league-heading"><button class="text-button" data-league-action="home">← ホーム</button><h1>ペナント</h1></div>${leagueTabs()}<div class="league-club-header">${clubBadge(league.clubId)}<div><span class="eyebrow">YOUR CLUB · スロット${leagueSlot}</span><h1>${league.club.short}</h1><div class="season-summary"><span><b>${row.rank}</b>位</span><span><b>${row.wins}</b>勝 <b>${row.losses}</b>敗</span><span>得失差 <b>${row.diff>0?'+':''}${row.diff}</b></span></div></div></div><div class="season-progress"><i style="width:${league.played/league.totalGamesAll*100}%"></i></div><div class="season-caption"><span>${league.completed?'全日程終了':`第${matchNumber}戦`}</span><span>${league.played} / ${league.totalGamesAll} 試合終了</span></div>${league.completed?`<div class="champion-banner"><span>SEASON FINALE</span><strong>${champion?'シーズン1位':'シーズン終了'}</strong><p>${champion?(league.playoffs===false?'プレーオフなしのため、シーズン1位が優勝です。':league.isNPB?'CSはファイナルステージから出場。':'プレーオフは決勝から出場。'):`あなたの球団は${row.rank}位でシーズン終了。`}<br>${leaders.map(s=>NightTeams.get(s.id).short).join(' / ')}${leaders.length>1?'が同率首位':'が通常シーズン首位'}</p></div>`:''}${league.allstarDue?`<div class="league-injuries"><b>オールスター</b><span>シーズン中盤のオールスターゲームを開催できます</span><button class="league-inline-button" data-league-action="allstar">開催する</button></div>`:''}${league.tradeOffer&&!league.currentGame?`<div class="league-injuries trade-offer"><b>トレード提案</b><span>${NightTeams.get(league.tradeOffer.fromClub)?.short||''}の ${league.tradeOffer.giveName} ⇄ あなたの ${league.tradeOffer.takeName}</span><button class="league-inline-button" data-league-action="trade-negotiate">交渉する</button><button class="league-inline-button" data-league-action="trade-accept">承諾</button><button class="league-inline-button" data-league-action="trade-decline">見送る</button></div>`:''}${(()=>{const inj=Object.values(league.injuries||{}).filter(i=>i.clubId===league.clubId&&i.returnRound>league.round&&league.round>i.fromRound);return inj.length?`<div class="league-injuries"><b>離脱中</b>${inj.map(i=>`<span>${i.name}（あと${i.returnRound-league.round}節）</span>`).join('')}</div>`:'';})()}<section class="league-match-card ${r?won?'won':'lost':''}"><div class="league-card-kicker"><span>${ilActive?'交流戦 · ':''}${r?'試合結果':resume?'試合中':'次の試合'}</span><span>第${matchNumber}戦 · ${isHome?'後攻':'先攻'}</span></div>${r?`<div class="league-result-title">${won?'勝 利':'敗 戦'}</div><div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><strong class="final-score"><b>${ownScore}</b><span>−</span><b>${oppScore}</b></strong><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>試合終了${r.innings>1?` ・ 延長${r.innings}回`:''}</p>`:`<div class="league-versus"><div>${clubBadge(league.clubId)}<b>${league.club.short}</b></div><span class="versus-label">VS</span><div>${clubBadge(opponent.id)}<b>${opponent.short}</b></div></div><p>${isHome?'あなたは後攻。投球からスタート。':'あなたは先攻。打撃からスタート。'}<br>1回制 / 2アウト満塁 / 同点は延長</p>${weatherForecastHTML(ensurePennantForecast(f))}`}<button class="primary-button" data-league-action="${r?league.completed?(league.playoffs===false?'offseason':'playoff-start'):(ilActive?'interleague-next':'next'):'play'}">${r?league.completed?(league.playoffs===false?'ドラフトして来シーズンへ':league.isNPB?'クライマックスシリーズへ':'プレーオフへ'):'次の試合へ':resume?'再開':'試合開始'}　↗</button>${r?.report?resultReportHTML(r.report)+heroInterviewHTML(r.report):''}${!r&&!resume?'<button class="league-inline-button" data-league-action="lineup">オーダー編成</button><button class="league-inline-button" data-league-action="scout">相手スカウト</button>'+(ilActive?'<button class="league-inline-button" data-league-action="interleague-sim">この試合をシミュレート</button>':''):''}${r&&game?.mode==='pennant'&&game.leagueFixtureId===f.id?'<button class="league-inline-button" data-league-action="box">この試合の打撃成績</button>':''}</section>${r?`<div class="league-section-head"><h2>${ilActive?`交流戦 第${league.interleague.index+1}戦の全結果`:`第${league.round+1}節の全結果`}</h2><span>先攻　／　後攻</span></div><div class="fixture-list">${ilRoundFixtures.map(fixtureHTML).join('')}</div>`:''}${standingsHTML()}${otherStandingsHTML()}<details class="league-schedule"><summary>日程・結果 <span>＋</span></summary>${league.schedule.map((fixtures,i)=>`<div class="schedule-round"><b>第${i+1}節 ${i===league.round?'・現在':fixtures.some(f=>[f.home,f.away].includes(league.clubId))?'':'・休み'}</b>${fixtures.map(fixtureHTML).join('')}</div>`).join('')}</details>${league.interleague?`<details class="league-schedule"><summary>交流戦日程・結果（${pennantLeagues[league.interleague.partner]||league.interleague.partner}） <span>＋</span></summary>${league.interleague.rounds.map((fixtures,i)=>`<div class="schedule-round"><b>交流戦 第${i+1}戦 ${i===league.interleague.index&&league.interleagueActive?'・現在':''}</b>${fixtures.map(fixtureHTML).join('')}</div>`).join('')}</details>`:''}<div class="league-rule compact-rule"><b>2アウト満塁</b><p>同点は延長。延長も2アウト満塁。走塁は設定で切替。</p></div>${league.news?.length?`<div class="league-section-head"><h2>リーグニュース</h2></div><div class="fixture-list">${league.news.slice(0,5).map(n=>`<div class="fixture-row"><small>第${n.round+1}節</small><span>${n.text}</span></div>`).join('')}</div>`:''}<button class="secondary-button" data-league-action="roster">選手データ</button><button class="secondary-button" data-league-action="farm">二軍（ファーム）</button><button class="secondary-button" data-league-action="scrimmage">紅白戦（練習試合）</button><button class="secondary-button" data-league-action="leaders">個人成績ランキング</button><button class="secondary-button" data-league-action="form">順位・成績の推移</button>${league.completed?'<button class="secondary-button" data-league-action="awards">シーズン表彰</button>':''}${league.completed?`<button class="secondary-button" data-league-action="offseason">${league.offseason?'ドラフトの続き':'ドラフトして来シーズンへ'}</button>`:''}<button class="league-inline-button" data-league-action="picker">${league.leagueId==='npb'?'リーグを選ぶ':'新しいペナント'}</button><p class="league-footnote">同節のほか${ilRoundFixtures.length-1}試合は自動進行。球団能力をもとに同じ特別ルールで結果を計算します。</p>`;
  restorePageScroll(y);
 }
 function playoffDashboard(){
  const y=showLeagueScreen('pennant-playoffs');$('pennant').innerHTML=playoffHTML(league,leagueTabs())+`${league.userInActiveFixture&&!league.activeResult&&league.activeFixture?weatherForecastHTML(ensurePennantForecast(league.activeFixture)):''}<details class="league-schedule"><summary>通常シーズンの順位</summary>${standingsHTML()}</details>${otherStandingsHTML()}<button class="secondary-button" data-league-action="roster">選手データ</button>${league.postseasonCompleted?`<button class="secondary-button" data-league-action="offseason">${league.offseason?'ドラフトの続き':'ドラフトして来シーズンへ'}</button>`:''}`;
  restorePageScroll(y);
 }
 function playoffReport(){
  const report=league?.activeResult?.report;if(!report)return;
  modal(`${modalTitle('','プレーオフ 試合成績')}${resultReportHTML(report)}${playerBoxHTML(report,'away')}${playerBoxHTML(report,'home')}<button class="primary-button" data-action="close">戻る</button>`,'playoff-report');
 }
 function playLeague(ready=false){
  if(!league)return;
  const pre=!league.postseason&&league.preseasonActive?league.preseasonFixture:null;
  if(!pre&&(league.activeRoundDone||!league.userInActiveFixture))return;
  const f=pre||league.activeFixture;if(!f)return;
  const restored=NightGame.restore(league.currentGame,onEvent);
  if(!(restored&&restored.leagueFixtureId===f.id&&restored.phase!=='ended')&&!ready){lineupModal('league');return;}
  closeModal(false);unlockAudio();saved=false;lastMode='pennant';
  if(restored&&restored.leagueFixtureId===f.id&&restored.phase!=='ended'){
   game=restored;game.fieldSpeed=settings.fieldSpeed;game.battingAssist=settings.battingAssist;
   if(['pitch','windup'].includes(game.phase)){game.setPhase('windup');game.pitch.progress=0;game.pitch.swung=false;game.pitch.cpuActed=false;}
  }else{
   const pennantWeather=ensurePennantForecast(f);
   game=new NightGame('pennant',settings.difficulty,onEvent,{conditionSeed:lineupConditionSeed('league',true),weather:pennantWeather.weather,wind:pennantWeather.wind,npbPostseason:league.isNPB&&f.playoff,innings:f.innings,maxInnings:f.maxInnings,drawClinches:f.drawClinches,homeTeamId:f.home,awayTeamId:f.away,userHome:f.home===league.clubId,park:NightTeams.get(f.home).park,defenseSpeed:settings.defenseSpeed,opponentPitcher:league.starterIndexFor(f.away),pitcher:lineupConfig('league').config.pitcher,order:lineupConfig('league').config.order,fielding:lineupConfig('league').config.fielding,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,tiebreak:settings.tiebreak,injured:pre?{home:league.injuredIds(f.home),away:league.injuredIds(f.away)}:{home:[...league.injuredIds(f.home),...league.farmIds(f.home)],away:[...league.injuredIds(f.away),...league.farmIds(f.away)]},clubs:{home:league.clubRoster(f.home),away:league.clubRoster(f.away)},mastery:league.mastery});game.leagueFixtureId=f.id;if(pre)game.preseasonGame=true;
  }
  $('distance').textContent='';$('timing-result').textContent='';activateGame();onEvent('clear');if(game.phase==='intro')game.message('PENNANT PLAY BALL',`${pre?'オープン戦 第'+(league.preseason.index+1)+'戦':league.postseason?(league.isNPB?NightNPBPostseason.title(league.activeSeries):league.activeSeries.id==='qualifier'?'準決勝':'決勝')+' 第'+f.game+'戦':league.interleagueActive?'交流戦 第'+(league.interleague.index+1)+'戦':'第'+(league.played+1)+'戦'} · ${game.userHome?'後攻':'先攻'}でプレイ`,game.loadedStart?'1回制 / 毎回2アウト満塁 / 同点は延長':f.maxInnings?'9回制 / 延長12回まで':'9回制 / 延長無制限');else if(['result','change'].includes(game.phase)){const last=game.log.at(-1);if(last)onEvent('message',last);}updateUI();
 }
 function foldLeagueStats(g){
  const stats=league.playerStats||={};
  const clubOf=id=>{for(const side of ['home','away']){const club=g.teams[side];if([...club.batters,...club.pitchers].some(p=>p.id===id))return club;}return null;};
  const row=(id,club)=>stats[club.id+'/'+id]||={name:([...club.batters,...club.pitchers].find(p=>p.id===id)?.name||id),clubId:club.id,pos:([...club.batters,...club.pitchers].find(p=>p.id===id)?.pos||'DH'),pa:0,ab:0,h:0,hr:0,rbi:0,outs:0,k:0,runs:0,pitches:0,bb:0,doubles:0,triples:0};
  for(const [id,s] of Object.entries(g.box||{})){const club=clubOf(id);if(!club)continue;const r=row(id,club);r.pa+=s.pa||0;r.ab+=s.ab||0;r.h+=s.h||0;r.hr+=s.hr||0;r.rbi+=s.rbi||0;r.bb+=s.bb||0;r.doubles+=s.doubles||0;r.triples+=s.triples||0;}
  for(const [id,s] of Object.entries(g.pitchingStats||{})){const club=clubOf(id);if(!club)continue;const r=row(id,club);r.outs+=s.outs||0;r.k+=s.k||0;r.runs+=s.runs||0;r.pitches+=s.pitches||0;}
 }
 function uniformModal(){
   const club=allClubs().find(c=>c.id===uniformClub)||allClubs()[0];uniformClub=club.id;
   const orig=NightUniforms.originals()[club.id]||{color:club.color,accent:club.accent};
   const cur=uniformOverrides[club.id]||{};
   const color=cur.color||orig.color||'#325e71',accent=cur.accent||orig.accent||'#f2cf63';
   modal(`${modalTitle('UNIFORM','ユニフォームカラー')}<div class="setting-label">球団</div><div class="team-select-grid">${allClubs().map(c=>`<button data-uniform-club="${c.id}" class="${c.id===club.id?'selected':''}">${clubBadge(c.id)}<strong>${c.short}</strong></button>`).join('')}</div><div class="uniform-preview" id="uniform-preview" style="--club:${color};--accent:${accent}"><b>${club.name}</b><small>ビジターはメインカラー、ホームは白基調にアクセント</small></div><div class="setting-slider"><label for="uniform-color">メインカラー</label><input id="uniform-color" type="color" value="${color}"></div><div class="setting-slider"><label for="uniform-accent">アクセントカラー</label><input id="uniform-accent" type="color" value="${accent}"></div><div class="uniform-swatches">${NightUniforms.PRESETS.map(h=>`<button data-uniform-swatch="${h}" style="background:${h}" aria-label="メインカラーを${h}にする"></button>`).join('')}</div><p class="modal-note">バッジ・スコア表示・3Dユニフォームに反映されます。</p><button class="primary-button" data-action="uniform-save">保存して反映</button><button class="secondary-button" data-action="uniform-reset">この球団を初期カラーに戻す</button><button class="secondary-button" data-action="close">閉じる</button>`,'uniform');
 }
 function scoutingModal(oppId,fromMatch=false){
   let club=null,report=null;
   if(oppId){club=fromMatch?matchClub(oppId):NightTeams.get(oppId);}
   else if(screen==='pennant'&&league){const f=league.activeFixture;if(!f)return;oppId=f.home===league.clubId?f.away:f.home;report=league.scoutingReport(oppId);club=league.clubRoster(oppId);}
   if(!club)return;
   const starter=report?.starter||club.pitchers.filter(p=>p.role==='SP')[0]||club.pitchers[0];
   const lineup=NightGame.arrangeLineup(club);
   const avg=k=>Math.round(lineup.reduce((s,p)=>s+(p[k]||0),0)/Math.max(1,lineup.length));
   const lefts=lineup.filter(p=>p.hand==='L').length;
   const sluggers=[...lineup].sort((a,b)=>(b.power||0)-(a.power||0)).slice(0,2);
   const tags=[];
   if(avg('power')>=68)tags.push('長打力のある打線');
   if(avg('contact')>=70)tags.push('巧打者揃い');
   if(avg('run')>=70)tags.push('機動力が高い');
   if(!tags.length)tags.push('バランス型の打線');
   const pitchList=starter?(starter.pitches||[]).map(id=>{const spec=NightGame.pitchSpec(starter,id);return `${spec.name} ${Math.round(spec.speed)}km/h`;}).join(' / '):'';
   const formHTML=report?`<h3 class="arcade-section-title">直近の調子</h3><p>${report.standing?`${report.standing.rank}位 · ${report.standing.wins}勝${report.standing.losses}敗<br>`:''}${report.form.length?report.form.map(g=>`${g.win?'○':'●'} ${g.for}-${g.against} vs ${NightTeams.get(g.opponent)?.short||''}`).join('　'):'まだ試合がありません'}</p>${(report.leaders.hr||report.leaders.avg||report.leaders.era)?`<h3 class="arcade-section-title">今季の主力</h3><p>${[report.leaders.avg?`打率 ${report.leaders.avg.name}（${(report.leaders.avg.h/Math.max(1,report.leaders.avg.ab)).toFixed(3).replace(/^0/,'')}）`:'',report.leaders.hr?`本塁打 ${report.leaders.hr.name}（${report.leaders.hr.hr}本）`:'',report.leaders.era?`防御率 ${report.leaders.era.name}（${(report.leaders.era.runs*27/Math.max(1,report.leaders.era.outs)).toFixed(2)}）`:''].filter(Boolean).join('<br>')}</p>`:''}`:'';
   modal(`${modalTitle('SCOUTING',`${club.name} スカウティング`)}<h3 class="arcade-section-title">監督</h3><p>${NightGame.managerFor(club.id).label} — ${NightGame.managerFor(club.id).desc}</p><h3 class="arcade-section-title">先発投手</h3>${starter?`<p><b>${starter.name}</b>（${starter.hand==='L'?'左':'右'}投） 最速 ${starter.velocity}km/h · 制球 ${starter.control} · 体力 ${starter.stamina}${starter.trait?`<br>特性：${starter.trait}`:''}<br>球種：${pitchList}</p>`:'<p>投手情報がありません</p>'}<h3 class="arcade-section-title">打線の特徴</h3><p>ミート ${avg('contact')} · パワー ${avg('power')} · 走力 ${avg('run')}（先発9人の平均）<br>左打者 ${lefts}人 / 右打者 ${lineup.length-lefts}人<br>${tags.join('・')}<br>主砲：${sluggers.map(p=>`${p.name}（パワー${p.power}）`).join('、')}</p>${formHTML}<button class="primary-button" data-action="${fromMatch?'ui-park-back':'close'}">${fromMatch?'試合設定に戻る':'閉じる'}</button>`,'scouting');
 }
 let leadersMetric='avg',leadersScope='league';
 function leadersModal(){
  // v170 (checker item records-sort-options): the ranking used to print a
  // fixed top-10 for every metric at once. It now shows one metric at a
  // time, switchable, with a league-wide / own-team scope toggle.
  const rows=Object.values(league.playerStats||{});
  const saber=NightGame.saberMetrics(rows);
  const scoped=leadersScope==='team'?rows.filter(r=>r.clubId===league.clubId):rows;
  const bat=scoped.filter(r=>r.ab>=3),pit=scoped.filter(r=>r.outs>=9);
  const metrics=[
   ['avg','打率','bat',(a,b)=>b.h/Math.max(1,b.ab)-a.h/Math.max(1,a.ab),r=>(r.h/r.ab).toFixed(3).replace(/^0/,'')],
   ['hr','本塁打','bat',(a,b)=>b.hr-a.hr||b.rbi-a.rbi,r=>r.hr+' 本'],
   ['rbi','打点','bat',(a,b)=>b.rbi-a.rbi,r=>r.rbi+' 打点'],
   ['ops','OPS','bat',(a,b)=>saber.calc(b).ops-saber.calc(a).ops,r=>saber.calc(r).ops.toFixed(3)],
   ['era','防御率','pit',(a,b)=>a.runs*27/Math.max(1,a.outs)-b.runs*27/Math.max(1,b.outs),r=>(r.runs*27/r.outs).toFixed(2)],
   ['k','奪三振','pit',(a,b)=>b.k-a.k,r=>r.k+' K'],
   ['warBat','WAR相当（打者）','bat',(a,b)=>saber.calc(b).batWar-saber.calc(a).batWar,r=>saber.calc(r).batWar.toFixed(1)],
   ['warPit','WAR相当（投手）','pit',(a,b)=>saber.calc(b).pitWar-saber.calc(a).pitWar,r=>saber.calc(r).pitWar.toFixed(1)],
  ];
  const m=metrics.find(x=>x[0]===leadersMetric)||metrics[0];
  const items=[...(m[2]==='bat'?bat:pit)].sort(m[3]).slice(0,10);
  const list=items.length?items.map((r,i)=>`<div class="career-list-row"><div><b>${i+1}. ${r.name}</b><small>${NightTeams.get(r.clubId)?.short||''}</small></div><strong>${m[4](r)}</strong></div>`).join(''):'<p class="modal-note">まだ記録がありません</p>';
  modal(`${modalTitle('','個人成績ランキング')}<p class="modal-note">シーズン全試合（自動進行分も含む）の通算成績です。指標と範囲を切り替えて表示できます。</p><div class="segmented leaders-scope">${[['league','リーグ全体'],['team','自チームのみ']].map(([v,l])=>`<button data-leaders-scope="${v}" class="${leadersScope===v?'active':''}" aria-pressed="${leadersScope===v}">${l}</button>`).join('')}</div><div class="segmented leaders-metrics">${metrics.map(([k,t])=>`<button data-leaders-metric="${k}" class="${m[0]===k?'active':''}" aria-pressed="${m[0]===k}">${t}</button>`).join('')}</div><h3 class="arcade-section-title">${m[1]}${leadersScope==='team'?'（自チーム）':''}</h3>${list}<p class="modal-note">対象は打者3打数以上・投手9アウト以上、上位10人まで表示します。WAR相当はゲーム独自の換算です（打者はwOBA、投手は防御率と投球回をもとに、リーグ平均との差から算出）。</p><button class="primary-button" data-action="close">閉じる</button>`,'leaders');
 }
 function tradeNegotiationModal(){
  if(!league?.tradeOffer)return;
  const o=league.tradeOffer,neg=league.tradeNegotiation(),from=NightTeams.get(o.fromClub);
  const mine=league.clubRoster(league.clubId),theirs=league.clubRoster(o.fromClub);
  const give=[...theirs.batters,...theirs.pitchers].find(x=>x.id===o.giveId);
  const pool=[...mine.batters.slice(2,12),...mine.pitchers.slice(1,6)].filter(x=>x.id!==o.takeId);
  const val=x=>Math.round(league.playerValue(x));
  const hist=neg.history.length?`<h3 class="arcade-section-title">交渉の経過</h3>${neg.history.map(h=>`<div class="career-list-row"><div><b>${h.takeName}</b><small>${h.response==='accepted'?'受諾':h.response==='rejected'?'拒否'+(h.counterTakeId?' · 逆提示あり':''):h.response}</small></div></div>`).join('')}`:'';
  modal(`${modalTitle('TRADE','トレード交渉')}<p class="modal-note">${from?.short||''}の ${o.giveName}（評価 ${give?val(give):'―'}）⇄ あなたの ${o.takeName} という提案が届いています。別の選手を代わりに提示して交渉できます。断られた選手は再提示できず、交渉は${NightPennant.TRADE_NEG_MAX}回まで。期限は第${o.expiresRound+1}節までです。</p>${neg.counterTakeId?`<p class="modal-note">相手の逆提示: あなたの <b>${neg.counterTakeName}</b> なら合意できます。下の一覧から提示してください。</p>`:''}${hist}<h3 class="arcade-section-title">代わりに提示する選手</h3>${pool.map(x=>{const rejected=neg.rejectedTakeIds.includes(x.id);return `<div class="career-list-row"><div><b>${x.name}</b><small>${x.pos} · 評価 ${val(x)}${x.id===neg.counterTakeId?' · 相手の要求':''}</small></div>${rejected?'<strong>拒否済み</strong>':`<button class="league-inline-button" data-trade-counter="${x.id}">提示する</button>`}</div>`;}).join('')}<button class="primary-button" data-trade-accept>元の条件で承諾（${o.takeName}）</button><button class="secondary-button" data-trade-decline>見送る</button><button class="secondary-button" data-action="close">閉じる</button>`,'trade-negotiation');
 }
 function draftModal(){
  if(!league?.offseason)return;
  let faHTML='';
  if(league.draftDone&&!league.faDone&&league.ensureFaMarket()){
   const fa=league.offseason.fa,pts=fa.points[league.clubId]??0;
   const line=p=>p.pos==='P'?`投手 球速${p.velocity} 制球${p.control} スタミナ${p.stamina}`:`${p.pos} ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`;
   faHTML=`<h3 class="arcade-section-title">FA市場（残り ${pts} pt）</h3><p class="modal-note">ドラフト後のFA市場です。獲得にはサインポイントを使います（各球団100pt、コストは能力に応じて12〜60pt）。安い金額で交渉もでき、断られると相手の要求額（逆提示）が示されます。同じ金額以下では再提示できず、交渉は1選手3回までです。他球団を自由契約になった選手も市場に出ます。CPU球団も獲得し、残りポイントは来季に持ち越せません。</p>${fa.signed.filter(s=>s.clubId===league.clubId).map(s=>`<div class="career-list-row"><div><b>${s.name}</b><small>獲得済み · ${s.cost}pt</small></div></div>`).join('')}${[...fa.pool].sort((a,b)=>league.playerValue(b)-league.playerValue(a)).map(p=>{const cost=league.faCost(p),ses=league.faNegotiation(p.id),lastOffer=ses?.history?.at(-1)?.offer||0,offers=[Math.max(1,Math.floor(cost*.8)),Math.max(1,Math.floor(cost*.9))].filter((v,i,a)=>v<cost&&a.indexOf(v)===i&&v>lastOffer&&v<=pts);const negHTML=ses?.status==='closed'?'<small>交渉決裂（即決のみ可）</small>':ses&&ses.history.length?`<small>交渉${ses.rounds}回 · 相手の要求 ${ses.counter}pt</small>${ses.counter&&ses.counter<=pts?`<button class="league-inline-button" data-fa-neg="${p.id}" data-fa-amount="${ses.counter}">要求額 ${ses.counter}pt で提示</button>`:''}`:offers.length?offers.map(v=>`<button class="league-inline-button" data-fa-neg="${p.id}" data-fa-amount="${v}">${v}pt で交渉</button>`).join(''):'';return `<div class="career-list-row"><div><b>${p.name}</b><small>${line(p)}${league.ages[p.id]?' · '+league.ages[p.id]+'歳':''}</small></div>${negHTML}${cost<=pts?`<button class="league-inline-button" data-fa-sign="${p.id}">即決 ${cost}pt</button>`:`<strong>${cost}pt</strong>`}</div>`;}).join('')||'<p class="modal-note">市場に選手はいません</p>'}`;
   saveLeague();
  }
  const d=league.offseason,done=league.draftDone,currentClub=d.order[d.pickIndex%d.order.length],myTurn=!done&&currentClub===league.clubId;
  const taken=new Set(d.picks.map(k=>k.playerId)),pool=d.pool.filter(p=>!taken.has(p.id)).sort((a,b)=>league.playerValue(b)-league.playerValue(a));
  const poolHTML=pool.map(p=>`<div class="career-list-row"><div><b>${p.name}</b><small>${p.pos==='P'?`投手 球速${p.velocity} 制球${p.control} スタミナ${p.stamina}`:`${p.pos} ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`}</small></div>${myTurn?`<button class="league-inline-button" data-draft-pick="${p.id}">指名</button>`:`<strong>${league.playerValue(p).toFixed(0)}</strong>`}</div>`).join('');
  const picksHTML=d.picks.map((k,i)=>`<div class="career-list-row"><div><b>${i+1}. ${k.name}</b><small>${NightTeams.get(k.clubId)?.short||''} · ${k.pos}</small></div></div>`).join('');
  const lastPick=d.picks.at(-1),lastRound=lastPick?Math.floor((d.picks.length-1)/d.order.length)+1:0;
  const announceHTML=lastPick?`<div class="draft-announce"><span>第${lastRound}巡目</span><strong>${NightTeams.get(lastPick.clubId)?.short||''} が ${lastPick.name}（${lastPick.pos}）を指名！</strong></div>`:'';
  const stepHTML=done?'':myTurn?'<p class="modal-note">あなたの指名ターンです。候補から1名選んでください。</p>':`<button class="primary-button" data-action="draft-step">次の指名へ進む（${NightTeams.get(currentClub)?.short||''}）</button><button class="secondary-button" data-action="draft-skip">自分のターンまで進める</button>`;
  modal(`${modalTitle('',(league.season||1)+'年目 ドラフト会議')}${announceHTML}<p class="modal-note">${done?'全指名が終了しました。':myTurn?'':`残り ${d.order.length*d.rounds-d.pickIndex} 指名`}</p>${stepHTML}${picksHTML?`<h3 class="arcade-section-title">指名済み</h3>${picksHTML}`:''}<h3 class="arcade-section-title">候補選手</h3>${poolHTML}${faHTML}${done?(league.faDone?'<button class="primary-button" data-action="draft-finish">来シーズンを開始</button>':'<button class="primary-button" data-action="fa-finish">FAを終えて来シーズンへ</button>'):'<button class="primary-button" data-action="close">閉じる</button>'}`,'draft');
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
  modal(`${modalTitle('','二軍（ファーム）')}<p class="modal-note">二軍の選手は一軍の試合（プレイ・シミュレーションとも）に出場しません。節ごとに少しずつ成長し（最大+6）、負傷中の選手は復帰が早まります。入れ替えは次の試合から反映されます。</p>${league.canPlayFarmGame()?`<button class="primary-button" data-league-action="farm-game">二軍戦をプレイ（vs ${NightTeams.get(league.farmGameOpponent())?.short||''} 二軍 · 3回制）</button><p class="modal-note">1節に1試合だけプレイできます。出場した二軍選手には通常の2節分の育成クレジットが入ります。</p>`:league.completed?'':`<p class="modal-note">今節の二軍戦はプレイ済みです（1節に1試合）。</p>`}<h3 class="arcade-section-title">野手</h3>${roster.batters.map(row).join('')}<h3 class="arcade-section-title">投手</h3>${roster.pitchers.map(row).join('')}<button class="primary-button" data-action="close">閉じる</button>`,'farm');
 }
 function allstarModal(){
  if(!league?.allstarDue)return;
  const {home,away}=league.allstarClubs();
  const ownRoster=league.clubRoster(league.clubId),ownIds=new Set([...(ownRoster?.batters||[]),...(ownRoster?.pitchers||[])].map(p=>p.id));
  const ownCount=[away,home].reduce((sum,c)=>sum+c.batters.filter(p=>ownIds.has(p.id)).length+c.pitchers.filter(p=>ownIds.has(p.id)).length,0);
  const list=c=>`<h3 class="arcade-section-title">${c.name}</h3>${c.batters.slice(0,9).map(p=>`<div class="career-list-row ${ownIds.has(p.id)?'allstar-own':''}"><div><b>${p.name}${ownIds.has(p.id)?' <span class="allstar-own-mark">自球団</span>':''}</b><small>${p.pos}</small></div></div>`).join('')}<p class="modal-note">先発投手: ${c.pitchers[0]?.name||'―'}${c.pitchers[0]&&ownIds.has(c.pitchers[0].id)?' <span class="allstar-own-mark">自球団</span>':''}</p>`;
  modal(`${modalTitle('','オールスターゲーム')}<p class="modal-note">シーズン前半の成績で選出しました（成績が少ない選手は能力値で選出）。あなたはホームチームを操作します。</p><p class="allstar-own-summary">${league.club.short} から ${ownCount} 人選出</p>${list(away)}${list(home)}<button class="primary-button" data-action="allstar-play">試合をする</button><button class="secondary-button" data-action="allstar-sim">シミュレート</button><button class="secondary-button" data-action="close">閉じる</button>`,'allstar');
 }
 function playAllstar(){
  if(!league?.allstarDue)return;
  const {home,away}=league.allstarClubs();
  closeModal(false);unlockAudio();lastMode='match';saved=false;
  game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:5,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist});
  game.allstarEvent=true;
  activateGame();updateStyle();updateUI();
 }
 let scrimmageState=null,scrimmageSelection=null;
 function scrimmageModal(source){
  const base=source==='pennant'&&league?league.clubRoster(league.clubId):matchClub(settings.matchTeam);
  if(!base)return;
  if(!scrimmageState||scrimmageState.baseId!==base.id||scrimmageState.source!==source)scrimmageState={source,baseId:base.id,split:NightScrimmage.splitClub(base)};
  scrimmageSelection=null;renderScrimmageModal();
 }
 function renderScrimmageModal(){
  if(!scrimmageState)return;const {split}=scrimmageState;
  const side=(club,label)=>`<h3 class="arcade-section-title">${label}${club.scrimmageSide==='red'?'（あなたが操作）':''}</h3>${club.batters.map(p=>`<div class="career-list-row"><div><b>${p.name}</b><small>${p.scrimmagePitcherBatter?'DH（先発投手）':(Object.entries(club.startingFielding).find(([,id])=>id===p.id)?.[0]||p.pos)} ミート${p.contact} パワー${p.power}</small></div>${p.scrimmagePitcherBatter?'':`<button class="league-inline-button" data-scrimmage-player="${p.id}">${scrimmageSelection===p.id?'選択中':'入替'}</button>`}</div>`).join('')}<p class="modal-note">先発投手: ${club.pitchers[0]?.name||'―'} ／ 投手 ${club.pitchers.length}人</p>`;
  modal(`${modalTitle('SCRIMMAGE','紅白戦')}<p class="modal-note">同じ球団の選手を紅組・白組に分ける練習試合です。二軍戦（他球団の二軍との対戦）とは別物です。野手はポジション適性で自動分割し、各組の最速投手がDHで打席にも立ちます（登録野手16人のため）。結果はペナントの順位・シーズン成績・二軍育成には影響せず、記録室にも記録されません。3回制。</p><p class="modal-note">${scrimmageSelection?'入れ替える相手（反対の組の野手）をタップしてください。守備位置と打順は自動で組み直します。':'野手を2人（紅・白1人ずつ）タップすると入れ替えできます。'}</p>${side(split.red,'🔴 紅組')}${side(split.white,'⚪ 白組')}<button class="primary-button" data-action="scrimmage-play">紅白戦を開始（3回制）</button><button class="secondary-button" data-action="close">閉じる</button>`,'scrimmage');
 }
 function startScrimmage(){
  if(!scrimmageState)return;
  const {red,white}=scrimmageState.split;
  closeModal(false);unlockAudio();lastMode='match';saved=false;
  game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home:red,away:white},homeTeamId:red.id,awayTeamId:white.id,userHome:true,innings:3,park:red.park,pitcher:0,opponentPitcher:0,order:red.startingOrder,fielding:red.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist});
  game.scrimmageGame=true;game.scrimmageSource=scrimmageState.source;
  activateGame();updateStyle();updateUI();
 }
 function startFarmGame(){
  if(!league?.canPlayFarmGame())return;
  const oppId=league.farmGameOpponent(),home=league.farmClub(league.clubId),away=league.farmClub(oppId);
  if(!home||!away)return;
  closeModal(false);unlockAudio();lastMode='match';saved=false;
  game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:home.id,awayTeamId:away.id,userHome:true,innings:3,park:home.park,pitcher:0,opponentPitcher:0,order:home.startingOrder,fielding:home.startingFielding,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,mastery:league.mastery});
  game.farmGame=true;
  activateGame();updateStyle();updateUI();
 }
 function finishLeague(g){
  if(!league)return;
  if(!league.postseason&&league.preseasonActive&&league.preseasonFixture&&g.leagueFixtureId===league.preseasonFixture.id){
   // Preseason results never fold into season playerStats or standings.
   if(league.completePreseasonGame(g,g)){commit(g);checkAchievements(g);saveLeague();if(g.userScore>g.opponentScore)sound('win');}
   leagueDashboard();return;
  }
  if(g.leagueFixtureId!==league.activeFixture.id)return;
  if(league.completeActiveGame(g)){league.addMasteryFromGame(g);foldLeagueStats(g);league.activeResult.report=buildMatchReport(g);commit(g);checkAchievements(g);if(league.completed&&league.playoffSeeds()[0]?.clubId===league.clubId)unlockAchievement('seasonFirst');saveLeague();if(g.userScore>g.opponentScore)sound('win');}
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
  if(b.dataset.pennantSlot){const n=Number(b.dataset.pennantSlot);if(game?.mode==='pennant')game=null;loadLeague(selectedLeague,n);leaguePicker();return;}
  if(b.dataset.slotDelete){const n=Number(b.dataset.slotDelete);if(!confirm(localize(`スロット${n}のペナントを削除しますか？この操作は取り消せません。`)))return;NightPennantSlots.remove(localStorage,selectedLeague,n);if(n===leagueSlot){league=null;game=null;}toast(`スロット${n}を削除しました`);leaguePicker();return;}
  if(b.dataset.leagueGames){selectedGamesPerOpponent=Number(b.dataset.leagueGames);settings.pennantGamesPerOpponent=selectedGamesPerOpponent;save();leaguePicker();return;}
  if(b.dataset.clubChoice){selectedClub=b.dataset.clubChoice;leaguePicker();return;}
  if(b.dataset.leagueDraftClub&&leagueDraft){captureLeagueDraftName();const id=b.dataset.leagueDraftClub;leagueDraft.clubIds=leagueDraft.clubIds.includes(id)?leagueDraft.clubIds.filter(c=>c!==id):[...leagueDraft.clubIds,id];renderLeagueEditor();return;}
  if(b.dataset.leagueDraftGames&&leagueDraft){captureLeagueDraftName();leagueDraft.gamesPerOpponent=Number(b.dataset.leagueDraftGames);renderLeagueEditor();return;}
  if(b.dataset.leagueDraftToggle&&leagueDraft){captureLeagueDraftName();const key=b.dataset.leagueDraftToggle;leagueDraft[key]=b.dataset.leagueDraftToggleValue!==undefined?b.dataset.leagueDraftToggleValue==='true':!leagueDraft[key];renderLeagueEditor();return;}
  switch(b.dataset.leagueAction){
   case'home':home();break;
   case'picker':if(leagueEditorFromHub){returnToEditLeagues();break;}resetLeaguePicker();leaguePicker();break;
   case'dashboard':leagueDashboard();break;
   case'league-editor':leagueEditor();break;
   case'league-editor-edit':{const def=NightLeague.get(selectedLeague);if(def)leagueEditor(def);break;}
   case'league-editor-delete':{let hasSeason=league?.leagueId===selectedLeague;try{hasSeason=hasSeason||NightPennantSlots.anyExists(localStorage,selectedLeague);}catch{}if(hasSeason){toast('進行中のペナントがあるため削除できません');break;}NightLeague.remove(selectedLeague);delete pennantLeagues[selectedLeague];selectedLeague=settings.pennantLeague='cpbl';save();loadLeague('cpbl');leaguePicker();break;}
   case'league-editor-save':{captureLeagueDraftName();const saved=NightLeague.upsert(leagueDraft);if(!saved){renderLeagueEditor();break;}pennantLeagues[saved.id]=saved.name;if(leagueEditorFromHub){returnToEditLeagues();toast('リーグを保存しました');break;}selectedLeague=settings.pennantLeague=saved.id;save();loadLeague(saved.id);leaguePicker();break;}
   case'league-share-export':{const code=leagueDraft?.id?NightShare.exportLeague(leagueDraft.id):null;if(!code){toast('共有コードを発行できませんでした');break;}const box=$('share-league-code');if(box)box.value=code;copyText(code).then(ok=>toast(ok?'共有コードをコピーしました':'コードを発行しました（欄からコピーしてください）'));break;}
   case'league-share-import':{const result=NightShare.importCode($('share-league-code')?.value,undefined,'league');if(!result.ok){toast(result.error);break;}pennantLeagues[result.item.id]=result.item.name;if(leagueEditorFromHub){returnToEditLeagues();toast('リーグを追加しました');break;}selectedLeague=settings.pennantLeague=result.item.id;save();loadLeague(result.item.id);leaguePicker();toast(`リーグ「${result.item.name}」を追加しました${result.renamed?'（名前が重なったため別名で追加）':''}`);break;}
   case'create':{if(selectedLeague==='npb')break;const def=NightLeague.get(selectedLeague);league=def?new NightPennant(selectedClub,def.gamesPerOpponent,{customLeague:def}):new NightPennant(selectedClub,selectedGamesPerOpponent);league.managed=true;saveLeague();game=null;leagueDashboard();break;}
   case'play':playLeague();break;
   case'playoff-start':if(league.startPlayoffs()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-next':if(league.nextPlayoff()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-simulate':if(league.simulatePlayoffGame()){game=null;saveLeague();leagueDashboard();}break;
   case'playoff-report':playoffReport();break;
   case'lineup':lineupModal('league');break;
   case'scout':scoutingModal();break;
   case'next':if(league.next()){game=null;saveLeague();leagueDashboard();}break;
   case'interleague-next':if(league.nextInterleague()){game=null;saveLeague();leagueDashboard();}break;
   case'interleague-sim':if(league.simulateInterleagueGame()){game=null;saveLeague();leagueDashboard();}break;
   case'preseason-sim':if(league.simulatePreseasonGame()){game=null;saveLeague();leagueDashboard();}break;
   case'preseason-skip':if(league.skipPreseason()){game=null;saveLeague();leagueDashboard();}break;
   case'box':boxModal();break;
   case'roster':rosterModal(null,game?.mode==='pennant'?game.userSide:'home');break;
   case'farm':farmModal();break;
   case'farm-game':startFarmGame();break;
   case'scrimmage':scrimmageModal('pennant');break;
   case'allstar':allstarModal();break;
   case'leaders':leadersModal();break;
   case'awards':awardsModal();break;
   case'form':formGraphModal();break;
   case'trade-negotiate':tradeNegotiationModal();break;
   case'trade-accept':if(league.acceptTrade()){saveLeague();leagueDashboard();}break;
   case'trade-decline':league.declineTrade();saveLeague();leagueDashboard();break;
   case'offseason':if(league.offseason)draftModal();else if(league.beginOffseason()){saveLeague();draftModal();}break;
  }
 });

 function updateResume(){
  let match;
  try{match=JSON.parse(localStorage.getItem('nightball.match')||'null')?.state;}catch{}
  const resume=$('resume-game');
  const entry=match?['match',`対戦  ${match.inning}回${match.half==='top'?'表':'裏'}  ${match.awayScore}–${match.homeScore}`]
   :league?['pennant',`ペナント  ${league.season||1}年目  ${league.club.short}`]
   :world?['career',`選手キャリア  ${world.player.name}`]
   :career?['legacy-career','選手キャリア']:null;
  resume.hidden=!entry;
  resume.dataset.saveKind=entry?.[0]||'';
  $('resume-label').textContent=entry?.[1]||'';
 }
 function resumeFromMenu(){
  const kind=$('resume-game').dataset.saveKind;
  if(kind==='match')resumeGame();
  else if(kind==='pennant')leagueDashboard();
  else if(kind==='career')worldDashboard();
  else if(kind==='legacy-career')careerDashboard();
 }
 function checkpoint(){
  if(screen==='game'&&game?.worldFixture&&game.worldFixture===world?.active?.id&&game.phase!=='ended'){
   world.currentGame=game.snapshot();saveWorld();return;
  }
  if(screen==='game'&&game?.career&&game.career.fixtureId===career?.fixture?.id&&!['ended','career-pregame'].includes(game.phase)){
   career.currentGame=game.snapshot();saveCareer();
  }
  if(game?.mode==='pennant'&&league&&(league.preseasonActive?league.preseasonFixture:league.activeFixture)&&game.leagueFixtureId===(league.preseasonActive?league.preseasonFixture:league.activeFixture).id&&game.phase!=='ended'){league.currentGame=game.snapshot();saveLeague();}if(screen==='game'&&game?.apbcFixtureId&&game.apbcFixtureId===tournament?.active?.id&&game.phase!=='ended'){tournament.currentGame=game.snapshot();saveTournament();}if(game?.mode==='match'&&!game.apbcFixtureId&&!game.ctFixture&&!game.onlineGame&&!game.timeAttack&&!game.scrimmageGame&&!saved&&game.phase!=='ended')try{localStorage.setItem('nightball.match',JSON.stringify(game.snapshot()));}catch{}updateResume();}
 function clearCheckpoint(){try{localStorage.removeItem('nightball.match');}catch{}updateResume();}
 function activateGame(){
  stageResultShown=new Set();stageResultKey='';
  if(!game.umpireMode&&(game.career||game.worldFixture||game.mode==='pennant'||game.mode==='match'&&!game.competition&&!game.apbcFixtureId)){
   game.absRemaining??=2;
   game.absCpuRemaining??=2;
  }
  if(game.career||game.worldFixture||game.mode==='pennant'||game.mode==='match'&&!game.competition&&!game.apbcFixtureId){
   game.playChallenges??=2;
   game.playCpuChallenges??=2;
  }
  stopReplay();review.reset();resetPlayFeedback();[...$('bases').children].forEach(e=>e.classList.remove('on'));$('bases').setAttribute('aria-label','走者なし');updatePlayTools();updateChallenge();resetCareerOverlay();changeScreen('game');$('career').hidden=true;queuedBench=false;stadiumAudio.stopEffects();$('apbc-cup').hidden=true;$('home').hidden=true;$('pennant').hidden=true;$('game').hidden=false;$('pause').hidden=false;$('settings').hidden=false;document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);history.replaceState({nightball:'home'},'',location.href);history.pushState({nightball:'game'},'',location.href);history.pushState({nightball:'game'},'',location.href);/* v167: two guard entries — one lost popstate must never exit mid-match */window.scrollTo(0,0);renderer.resize();loadingState.prep=true;renderLoading();requestAnimationFrame(()=>requestAnimationFrame(()=>{loadingState.prep=false;renderLoading();}));}
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
 function worldDashboard(){
  worldActive=true;trackScreen('career');
  resetCareerOverlay();closeModal(false);
  if(game?.worldFixture||game?.career){stadiumAudio.stopEffects();game=null;}
  const y=changeScreen('career',worldPickerOpen?'career-slots':'career-world');
  for(const id of ['home','game','pennant','apbc-cup','pause'])$(id).hidden=true;
  $('career').innerHTML=worldPickerOpen?NightCareerWorldView.slots(NightCareerWorldSlots.list(),!!career):
   world?NightCareerWorldView.dashboard(world,!!career):NightCareerWorldView.setup(worldCountry,!!career,worldAlumni);
  $('career').hidden=false;
  history.replaceState({nightball:'career'},'',location.href);
  restorePageScroll(y);
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
   retire:()=>{if(!window.confirm(localize('この選手は現役を引退します。続けますか？')))return false;return w.retire();},
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
    saveWorld();worldDashboard();
    if(action==='simulate'&&w.last)showWorldResult();
   }
  }else if(action!=='retire')toast('この操作は現在実行できません');
 }
 $('career').addEventListener('click',worldAction);
 $('modal-content').addEventListener('click',worldAction);
 // v126: swap the loaded game for a career live match defensively. The
 // previous game is dropped BEFORE the new one is built, and construction
 // plus the first UI pass run under a guard: if anything throws, the user
 // lands back on the career dashboard with a message instead of a game
 // screen still showing the previous match behind the career HUD.
 function beginCareerLive(create,fallback){
  stopReplay();review.reset();resetPlayFeedback();game=null;onEvent('clear');
  try{
   const g=create();
   game=g;activateGame();updateUI();
   return g;
  }catch(error){
   console.error('Career match could not start',error);
   game=null;onEvent('clear');fallback();
   toast('試合を開始できませんでした。もう一度お試しください');
   return null;
  }
 }
 function restoreCareerGame(data,options){
  if(!data)return null;
  try{return NightGame.restore(data,onEvent,options);}
  catch(error){console.error('Career match could not be restored',error);return null;}
 }
 function playWorld(chosen){
  const data=world.currentGame;
  const format=data?.state?.career?.format||(data?.state?.mode==='match'?'full':chosen);
  const options=world.liveOptions(format)||(!data&&format==='full'?world.liveOptions('self'):null);
  if(!options)return;
  const mode=options.career?(options.career.pitching?'career-pitch':'career-bat'):'match';
  const difficulty={easy:'casual',normal:'standard',hard:'pro'}[world.difficulty];
  const restored=restoreCareerGame(data,options);
  if(data&&!restored){toast('中断した試合を再開できませんでした');return;}
  closeModal(false);saved=false;lastMode=mode;onEvent('clear');
  const g=beginCareerLive(()=>restored||new NightGame(mode,difficulty,onEvent,{...options,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,
   battingAssist:settings.battingAssist,defenseSpeed:settings.defenseSpeed}),worldDashboard);
  if(!g)return;
  if(g.phase==='career-ready')careerAppearance(g);
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
 function careerDashboard(){
  worldActive=false;trackScreen('career');
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
  const y=changeScreen('career','career-legacy');
  for(const id of ['home','game','pennant','apbc-cup','pause'])$(id).hidden=true;
  $('career').innerHTML=content;
  $('career').hidden=false;
  $('career').querySelector('.career-heading')?.insertAdjacentHTML('beforeend','<button type="button" class="career-back" data-action="world-dashboard">新キャリア</button>');
  document.querySelector('#career [data-action="world-dashboard"]')?.addEventListener('click',()=>worldDashboard());
  if(career)$('career').querySelector('.career-heading')?.insertAdjacentHTML('beforeend',
   '<button type="button" class="career-back" data-career-action="music">応援歌設定</button>');
  history.replaceState({nightball:'career'},'',location.href);
  restorePageScroll(y);
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
     careerDrillAim={choice:Number(id),start:0};careerDashboard();careerDrillAim.start=performance.now();
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
    careerDrillAim=null;careerTab=b.dataset.tab;careerDashboard();
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
  else if(input.id==='career-training-plan')career.setTrainingPlan(input.value);
  else if(input.id==='career-role')career.deployAs(input.value);
  else if(input.id==='career-position')career.setPosition(input.value);
  else if(input.id==='career-form')career.setForm(input.value);
  else if(input.id==='career-difficulty')career.setDifficulty(input.value);
  else if(input.id==='career-intro')career.shortIntro=input.value==='short';
  else if(input.id==='career-running')career.manualRunning=input.value==='manual';
  else return;
  saveCareer();careerDashboard();
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
  const restored=restoreCareerGame(data,options);
  if(data&&!restored){toast('中断データを読み込めなかったため、この試合を最初から開始します');}
  closeModal(false);unlockAudio();saved=false;lastMode=mode;onEvent('clear');
  const started=beginCareerLive(()=>{
   const created=restored||new NightGame(mode,difficulty,onEvent,{...options,fieldSpeed:settings.fieldSpeed,
    battingAssist:settings.battingAssist&&career.difficulty!=='expert'});
   if(created.field&&['field','result'].includes(created.phase)&&created.mode==='career-bat')created.career.queuedRunningMode=options.manualRunning;
   else created.manualRunning=options.manualRunning;
   if(pregame)created.setPhase('career-pregame');
   return created;
  },careerDashboard);
  if(!started)return;
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
 function apbcSelectionModal(scroll=null){
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
  if(scroll!==null)$('modal-content').scrollTop=scroll;
  if(focusId)requestAnimationFrame(()=>$('modal-content').querySelector(`[data-apbc-register="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true}));
 }
 function apbcResultRow(m){
  const a=NightTeams.get(m.away),h=NightTeams.get(m.home);
  return `<div class="apbc-fixture-row ${[m.away,m.home].includes(tournament.team)?'own':''}"><span>${clubBadge(a.id)}<b>${a.short}</b></span><strong>${m.awayScore??'—'} <i>−</i> ${m.homeScore??'—'}</strong><span><b>${h.short}</b>${clubBadge(h.id)}</span></div>`;
 }
 function apbcDashboard(){
  if(!tournament){apbcHub();return;}
  trackScreen('apbc-cup');
  closeModal(false);const y=changeScreen('apbc-cup');matchContext='apbc';$('home').hidden=true;$('game').hidden=true;$('pennant').hidden=true;$('apbc-cup').hidden=false;$('pause').hidden=true;$('sub').hidden=true;
  history.replaceState({nightball:'apbc-cup'},'',location.href);
  const t=tournament,club=NightTeams.get(t.team),active=t.active,dayLabel=active?.day===3?(active.slot===1?'決勝':'3位決定戦'):`予選 第${t.day+1}戦`;
  const lastDay=t.results.filter(r=>r.day===t.day-1),last=lastDay.find(r=>r.report),result=last&&((last.home===t.team)===(last.homeScore>last.awayScore)?'勝利':'敗戦');
  $('apbc-cup').innerHTML=`<div class="league-heading"><button class="text-button" data-apbc-cup="home">← ホーム</button><h1>APBC 2026</h1></div>
   <div class="league-club-header">${clubBadge(club.id)}<div><h2>${club.short}</h2><small>${t.innings}イニング · ${t.day}/4試合終了</small></div></div>
   <section class="apbc-cup-card apbc-next">${t.place?`<h2>${['','優勝','準優勝','3位','4位'][t.place]}</h2>${last?apbcResultRow(last):''}<button class="secondary-button" data-apbc-cup="new">新しい大会</button>`:`<h2>${dayLabel}</h2>${apbcResultRow(active)}<button class="primary-button" data-apbc-cup="play">${t.currentGame?'試合を再開':'オーダー編成へ'}</button>`}</section>
   ${lastDay.length?`<section class="apbc-cup-card"><h2>${t.day===4?'順位決定戦':`予選 第${t.day}日の結果`}${result?`<small>　${result}</small>`:''}</h2>${lastDay.map(apbcResultRow).join('')}${last?.report?`<details><summary>自チームの試合詳細</summary>${resultReportHTML(last.report)}<details><summary>打撃・投手成績</summary>${playerBoxHTML(last.report,last.home===t.team?'home':'away')}</details></details>`:''}</section>`:''}
   <section class="apbc-cup-card"><h2>予選順位</h2><table class="apbc-standings"><thead><tr><th>順位</th><th>チーム</th><th>勝</th><th>敗</th><th>得失点差</th></tr></thead><tbody>${t.standings.map((r,i)=>`<tr class="${r.id===t.team?'own':''}"><td>${i+1}</td><th>${clubBadge(r.id)}${NightTeams.get(r.id).short}</th><td>${r.w}</td><td>${r.l}</td><td>${r.delta>0?'+':''}${r.delta}</td></tr>`).join('')}</tbody></table><p>同勝数は直接対戦の勝数、得失点差、総得点の順。</p></section>
   ${t.results.length?`<details class="apbc-cup-card"><summary>大会の全結果</summary>${t.results.map(apbcResultRow).join('')}</details>`:''}`;
  restorePageScroll(y);
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
   game=new NightGame('match',settings.difficulty,onEvent,{conditionSeed:lineupConditionSeed('apbc-cup',true),competition:'apbc2026',apbcFixtureId:f.id,apbcFinal:f.day===3&&f.slot===1,apbcRoster:{team:t.team,ids:t.roster},homeTeamId:f.home,awayTeamId:f.away,userHome:f.home===t.team,innings:t.innings,park:'tokyo-dome',order:config.order,fielding:config.fielding,pitcher:config.pitcher,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,defenseSpeed:settings.defenseSpeed,battingAssist:settings.battingAssist});
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
  game=new NightGame('match',settings.difficulty,onEvent,{conditionSeed:lineupConditionSeed('apbc',true),competition:'apbc2026',homeTeamId:userHome?club.id:opponent.id,awayTeamId:userHome?opponent.id:club.id,userHome,innings:settings.apbcInnings,park:'tokyo-dome',order:config.order,fielding:config.fielding,pitcher:config.pitcher,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,defenseSpeed:settings.defenseSpeed,battingAssist:settings.battingAssist});activateGame();updateStyle();updateUI();
 }
 const pitchRole=p=>({SP:'先発',RP:'中継ぎ',CP:'抑え'}[p.role]||'先発');
 const positionOptions=['C','1B','2B','3B','SS','LF','CF','RF','DH'];
 // v132 random roster (regular versus only): the drawn clubs and their
 // editable configs live only in memory, keyed by the chosen matchup, so
 // a rematch (a fresh start) draws again and nothing random is ever
 // written into the saved per-club lineups.
 let randomMatch=null;
 function ensureRandomMatch(){
  if(!settings.randomRoster){randomMatch=null;return null;}
  const key=settings.matchTeam+'|'+settings.matchOpponent;
  if(!randomMatch||randomMatch.key!==key){
   const seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
   const built=NightRandomRoster.buildMatch(matchClub(settings.matchTeam),matchClub(settings.matchOpponent),NightTeams.matchTeams,seed);
   randomMatch={key,seed,clubs:{[settings.matchTeam]:built.home,[settings.matchOpponent]:built.away},configs:{}};
   for(const id of [settings.matchTeam,settings.matchOpponent]){const c=randomMatch.clubs[id];randomMatch.configs[id]={order:c.startingOrder.slice(),pitcher:0,fielding:{...c.startingFielding}};}
  }
  return randomMatch;
 }
 function randomConfigFor(clubId){
  const rm=ensureRandomMatch();if(!rm)return null;
  const club=rm.clubs[clubId];if(!club)return null;
  const config=rm.configs[clubId],players=NightGame.arrangeLineup(club,config.order,config.fielding);
  config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));
  if(!Number.isInteger(config.pitcher)||!club.pitchers[config.pitcher])config.pitcher=0;
  return {club,config,players};
 }
 function lineupConfig(kind){
  if(kind==='online'){
   const club=onlineClubs().find(c=>c.id===online?.myClub);
   const config=online.myLineup ||= onlineNormalizeLineup(club,{pitcher:online.myPitcher});
   const players=NightSquad.normalize(club,config);
   return {club,config,players};
  }
  if(kind==='apbc-cup'){
   const club=Tournament.club(tournament.team,tournament.roster);
   const config=tournament.lineup ||= {order:club.startingOrder.slice(),pitcher:0,fielding:{...club.startingFielding}};
   const players=NightGame.arrangeLineup(club,config.order,config.fielding);
   config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));
   if(!club.pitchers[config.pitcher])config.pitcher=0;return {club,config,players};
  }
  if(kind==='match'&&settings.randomRoster){const drawn=randomConfigFor(settings.matchTeam);if(drawn)return drawn;}
  const club=kind==='league'?league.clubRoster(league.clubId):kind==='apbc'?NightTeams.get(settings.apbcTeam):matchClub(settings.matchTeam);
  if(kind==='apbc'){settings.apbcLineups ||= {};if(!settings.apbcLineups[club.id])settings.apbcLineups[club.id]={order:club.startingOrder.slice(),pitcher:0,fielding:{...(club.startingFielding||{})}};const config=settings.apbcLineups[club.id],players=NightGame.arrangeLineup(club,config.order,config.fielding);config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));if(!club.pitchers[config.pitcher])config.pitcher=0;return {club,config,players};}
  if(kind!=='league'&&!settings.matchLineups[club.id])settings.matchLineups[club.id]={order:club.id==='owls'?settings.order.slice():(club.startingOrder||club.batters.slice(0,9).map(p=>p.id)),pitcher:club.id==='owls'?settings.pitcher:(NightPlayers.defaultPitcherIndex?.(club)??0),fielding:club.id==='owls'?undefined:{...(club.startingFielding||{})}};
  const config=kind==='league'?league:settings.matchLineups[club.id],players=NightGame.arrangeLineup(club,config.order,config.fielding);
  config.order=players.map(p=>p.id);config.fielding=Object.fromEntries(players.map(p=>[p.fieldPos,p.id]));
  if(!Number.isInteger(config.pitcher)||!club.pitchers[config.pitcher])config.pitcher=0;
  return {club,config,players};
 }
 function saveLineup(kind){if(kind==='online'){online.myPitcher=lineupConfig('online').config.pitcher;onlineSendClub();return;}if(kind==='match'&&settings.randomRoster&&randomMatch)return;if(kind==='league')saveLeague();else if(kind==='apbc-cup')saveTournament();else if(kind==='apbc')save();else{const {club,config}=lineupConfig('match');if(club.id==='owls'){settings.order=config.order.slice();settings.pitcher=config.pitcher;}save();}}
 // Draw each pending fixture once; changing a lineup or reopening it
 // never rerolls form. The same seed is consumed by the actual match.
 let lineupConditionSerial=0;
 const lineupConditionSeeds=new Map();
 function lineupConditionKey(kind){
  if(kind==='match')return 'match/'+settings.matchTeam+'/'+settings.matchOpponent;
  if(kind==='apbc')return 'apbc/'+settings.apbcTeam+'/'+settings.apbcOpponent;
  if(kind==='league'){const f=(!league?.postseason&&league?.preseasonActive?league.preseasonFixture:league?.activeFixture);return f?'league/'+league.clubId+'/'+f.id:null;}
  if(kind==='apbc-cup'){const f=tournament?.active;return f?'apbc-cup/'+tournament.team+'/'+f.id:null;}
  return null;
 }
 function lineupConditionSeed(kind,consume=false){
  if(kind==='online')return online?.conditionSeed||null;
  const key=lineupConditionKey(kind);if(!key)return null;
  if(!lineupConditionSeeds.has(key)){
   if(lineupConditionSeeds.size>=32)lineupConditionSeeds.delete(lineupConditionSeeds.keys().next().value);
   lineupConditionSeeds.set(key,Date.now()+'/'+(++lineupConditionSerial)+'/'+Math.random().toString(36).slice(2));
  }
  const seed=lineupConditionSeeds.get(key);if(consume)lineupConditionSeeds.delete(key);return seed;
 }
 function lineupConditionFace(seed,p){
  if(seed==null)return '';
  const level=NightGame.conditionForSeed(seed,p),info=NightGame.conditionInfo(level);
  return `<svg class="lineup-condition-face" data-condition="${level}" role="img" aria-label="${info.label}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.6" fill="${info.color}" stroke="#173452" stroke-width=".7"/><circle cx="8.4" cy="9.6" r="1.35" fill="#18243b"/><circle cx="15.6" cy="9.6" r="1.35" fill="#18243b"/><path d="${info.mouth}" fill="${level>=2?'#18243b':'none'}" stroke="#18243b" stroke-width="1.6" stroke-linecap="round"/></svg>`;
 }
 function lineupPreview(p,seed){
  const pitcher=p.pos==='P',info=seed==null?null:NightGame.conditionInfo(NightGame.conditionForSeed(seed,p));
  const ratings=pitcher?rankTile('制球',p.control)+rankTile('スタミナ',p.stamina)+rankTile('変化量',p.movement):batRatings(p);
  return `<section class="editor-preview lineup-live-preview" data-preview-player="${uiEscape(p.id)}" aria-live="polite"><div class="lineup-preview-heading"><span class="lineup-preview-identity">${lineupConditionFace(seed,p)}${fittedName(p.name,'strong','editor-selected-name')}${info?`<small class="lineup-condition-label">${info.label}</small>`:''}</span><small>#${p.no} ${NightSquad.label(p.pos)} · ${p.hand==='S'?'両':p.hand==='L'?'左':'右'}${pitcher?'投':'打'}${pitcher?' '+p.velocity+'km/h':''}</small></div><span class="rating-tiles">${ratings}</span></section>`;
 }
 let editorSelection=null,editorDetail=null;
 function fittedName(name,tag='span',className='squad-name'){
  const units=Array.from(name).reduce((sum,ch)=>sum+(/[MW@%]/u.test(ch)?1.08:/[\u0000-\u007f]/u.test(ch)?.83:1),.28);
  return `<${tag} class="${className} fit-player-name"><span style="--player-name-units:${units}">${name}</span></${tag}>`;
 }

 function playerTile(p,{club,slot=null,pos=p.fieldPos||p.pos,selected=false,attrs='',disabled=false,conditionSeed=null}={}){
  const grade=NightPlayers.grade(NightSquad.overall(p));
  return `<button class="squad-player tone-${NightSquad.tone(pos)} ${selected?'chosen':''}" ${attrs} ${disabled?'disabled':''} ${selected?'aria-pressed="true"':'aria-pressed="false"'} aria-label="${slot!=null?slot+1+'番 ':''}${p.name} ${NightSquad.label(pos)} 総合${grade}" title="総合ランク ${grade}"><span class="squad-rank grade-${grade}">${grade}</span>${fittedName(p.name)}${lineupConditionFace(conditionSeed,p)}${slot==null?`<small class="squad-number">#${p.no}</small>`:''}</button>`;
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
 function lineupModal(kind='match',selectedId=null,scroll=null){
  const listScroll=modalKind==='lineup'?[...$('modal-content').querySelectorAll('.squad-list')].map(e=>e.scrollTop):[];
  if(modalKind!=='lineup'||lineupContext!==kind){editorSelection=null;editorDetail=null;}
  lineupContext=kind;const shared=kind==='match'||kind==='online',done=kind==='online'?'online-lineup-done':'ui-lineup-done';const {club,config,players}=lineupConfig(kind),starter=club.pitchers[config.pitcher],bench=club.batters.filter(p=>!config.order.includes(p.id));
  const seed=lineupConditionSeed(kind),selected=[...club.batters,...club.pitchers].find(p=>p.id===(selectedId||editorDetail||editorSelection))||players[0];editorDetail=selected.id;
  const preview=lineupPreview(selected,seed);
  const rows=players.map((p,i)=>`<div class="squad-starter-row"><b class="squad-slot">${i+1}</b><span class="ui-drag-handle" data-editor-handle="${p.id}" aria-hidden="true">⠿</span>${playerTile(p,{club,slot:i,conditionSeed:seed,selected:editorSelection===p.id,attrs:`data-editor-player="${p.id}" draggable="true"`})}<select class="squad-position tone-${NightSquad.tone(p.fieldPos)}" data-editor-position="${p.id}" aria-label="${p.name}の守備位置">${positionOptions.map(pos=>`<option value="${pos}" ${pos===p.fieldPos?'selected':''}>${NightSquad.label(pos)}</option>`).join('')}</select></div>`).join('');
  const lineupBody=`<div class="editor-toolbar">${kind==='edit'?`<select id="editor-club" class="field-select" aria-label="編成する球団">${NightTeams.matchTeams.map(c=>`<option value="${c.id}" ${c.id===club.id?'selected':''}>${c.short}</option>`).join('')}</select>`:`<span class="editor-club">${clubBadge(club.id,true)}<b>${club.short}</b></span>`}<button class="arcade-go" data-action="${kind==='edit'?'editor-done':shared?done:'lineup-play'}">${kind==='edit'||shared?'決定':'試合開始'}</button></div>${kind==='apbc'?`<p class="apbc-roster-status">${club.rosterStatus}</p>`:''}<p class="editor-hint" role="status">${editorSelection?`${([...players,...bench].find(p=>p.id===editorSelection)?.name||'選択した選手')}を選択中。入れ替える相手をタップ` :'選手を2人タップ、またはつまみをドラッグして交換'}</p><div class="squad-board"><section class="squad-column"><h3>スタメン</h3><div class="squad-list">${rows}</div></section><section class="squad-column reserves"><h3>控え <small>${bench.length}人</small></h3><div class="squad-list">${bench.map(p=>`<div class="ui-bench-row"><span class="ui-drag-handle" data-editor-handle="${p.id}" aria-hidden="true">⠿</span>${playerTile(p,{club,conditionSeed:seed,selected:editorSelection===p.id,attrs:`data-editor-player="${p.id}" draggable="true"`})}</div>`).join('')}</div></section></div><div class="editor-actions"><button data-editor-auto>おまかせ</button><button data-editor-reset>リセット</button></div><details class="editor-pitchers" data-ui-section="pitchers"><summary>先発投手 ${lineupConditionFace(seed,starter)}${fittedName(starter.name,'b','editor-starter-name')}<span>${starter.velocity}km/h　▼</span></summary><div class="editor-pitcher-grid">${club.pitchers.map((p,i)=>`<button class="squad-player tone-pitcher ${config.pitcher===i?'chosen':''}" data-lineup-pitcher="${i}" aria-pressed="${config.pitcher===i}"><span class="lineup-pitcher-name">${lineupConditionFace(seed,p)}${fittedName(p.name)}</span><small>${p.velocity}km/h · ${pitchRole(p)}${p.pitchingEstimated?' · 推定':''}</small></button>`).join('')}</div></details><details class="editor-player-detail" data-ui-section="player-detail"><summary>${fittedName(selected.name+'の能力','span','editor-detail-name')}</summary>${abilityHTML(selected,false)}</details>${shared?'':'<button class="secondary-button" data-action="lineup-back">戻る</button>'}`;
  if(shared)pfScreen('オーダー編成',lineupBody,'lineup',`<button class="pf-primary pf-wide" data-action="${done}">決定</button>`,done,`<div class="lineup-preview-fixed">${preview}</div>`);else modal(modalTitle('',kind.startsWith('apbc')?'APBC オーダー編成':'オーダー編成')+preview+lineupBody,'lineup');
  if(scroll!==null&&!shared)$('modal-content').scrollTop=scroll;
  $('modal-content').querySelectorAll('.squad-list').forEach((e,i)=>e.scrollTop=listScroll[i]||0);
 }
 let benchTab='hit',runnerBase=0,queuedBench=false;
 function requestBench(){if(!game?.isFixture||game.umpireMode||game.phase==='ended')return;if(onlineMatchActive()){if(onlineOwnsMenu()){if(game.substitutionWindow)benchModal();else toast('次の投球前に交代できます');}else onlineRequestMenu('bench');return;}if(game.substitutionWindow&&!(game.defending&&game.phase==='windup')){queuedBench=false;benchModal();}else{queuedBench=true;closeModal(false);game.paused=false;toast('このプレー後にベンチを開きます');updateUI();}}
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
 // v143 (settings-hub-consolidation): this one field is shared by every
 // setup screen (gear settings / match / APBC / derby); all of them read
 // and write the single settings.gameLighting value — no per-screen copy.
 function lightingField(){
  return `<div class="setup-section"><label for="game-lighting">試合の時間帯</label><select id="game-lighting" class="field-select">${GAME_LIGHTING_OPTIONS.map(([mode,label])=>`<option value="${mode}" ${settings.gameLighting===mode?'selected':''}>${label}</option>`).join('')}</select></div>`;
 }
 function parkOptions(selected){
  const option=p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.name}${p.school?' · 両翼 '+p.corner+' m':''}</option>`;
  const groups=[
   ['台湾',p=>!p.school&&!p.league&&!['toyama','tokyo-dome'].includes(p.id)],
   ['日本',p=>p.league==='npb'||['tokyo-dome','toyama'].includes(p.id)],
   ['韓国',p=>p.league==='kbo'],
   ['高校野球・小型球場',p=>p.school],
   ['カスタム球場',p=>p.custom]
  ];
  return groups.map(([label,filter])=>`<optgroup label="${label}">${NightPlayers.parks.filter(filter).map(option).join('')}</optgroup>`).join('');
 }
 function parkDimensions(park){
  const dimensions=[['左翼',park.left],['左中間',park.leftCenter],['中堅',park.center],['右中間',park.rightCenter],['右翼',park.right]];
  return `<dl class="park-dimensions">${dimensions.map(([label,d],i)=>`<div><dt>${label}</dt><dd>${!park.alleysVerified&&i%2?'約':''}${Number(d.toFixed(1))}<small>m</small></dd></div>`).join('')}</dl>`;
 }
 const stadiumSections=[
  ['shape','フェンス・形状',[['fenceShape','フェンス形状'],['wallHeight','全体の高さ（一括）','m',.1],...NightStadium.DISTANCES.map((k,i)=>[k,['左翼','左翼寄り','左中間','左中堅','中堅','右中堅','右中間','右翼寄り','右翼'][i],'m',.5]),...NightStadium.HEIGHTS.map((k,i)=>[k,['左翼','左翼寄り','左中間','左中堅','中堅','右中堅','右中間','右翼寄り','右翼'][i]+' 高さ','m',.1]),['foulWidth','ファウルグラウンド幅','m',.5],['wallColor','フェンス色'],['railColor','フェンス上部色']]],
  ['ground','グラウンド',[['surface','外野の地面'],['infield','内野の地面'],['mow','芝の模様'],['turfColor','芝の色'],['clayColor','土の色'],['trackColor','ウォーニングトラック色'],['trackWidth','トラック幅','m',.5],['infieldSize','内野土の広さ','m',.5],['bounce','打球の反発倍率','倍',.05],['roll','打球の転がり倍率','倍',.05],['wallRebound','フェンス反発率','',.05]]],
  ['stands','観客席・屋根',[['venue','球場タイプ'],['standLayout','観客席配置'],['standRows','観客席の列数','列',1],['standSlope','観客席の傾斜','°',1],['seatColor','座席の色'],['crowd','観客の入り','%',5],['roofShape','屋根の形'],['roofOpen','開閉式屋根の状態'],['roofHeight','屋根の高さ','m',1],['roofColor','屋根色']]],
  ['facilities','設備',[['boardPosition','スコアボード位置'],['boardStyle','スコアボードデザイン'],['boardWidth','スコアボード幅','m',1],['boardHeight','スコアボード高さ','m',1],['boardElevation','スコアボード設置高さ','m',1],['lightLayout','照明配置'],['lightCount','照明塔の数','基',2],['lightHeight','照明塔の高さ','m',1],['bullpen','ブルペン配置'],['dugoutOffset','ベンチの位置（ラインから）','m',.5],['dugoutSize','ベンチの長さ','m',.5],['dugoutColor','ベンチの色'],['eyeWidth','バックスクリーン幅','m',1],['eyeHeight','バックスクリーン高さ','m',.5],['eyeColor','バックスクリーン色'],['adText','広告の文字'],['adColor','広告背景色']]],
  ['environment','試合環境',[['daylight','時間帯'],['weather','天候'],['windMode','風の設定'],['windSpeed','風速','m/s',.5],['windDirection','風向（中堅方向=0°）','°',1]]],
  ['saved','保存・共有',[]]
 ];
 const stadiumOptionLabels={curve:'曲線',straight:'直線',grass:'天然芝',artificial:'人工芝',dirt:'土',cutouts:'ベース周りのみ土',stripes:'縦縞',checker:'市松模様',diagonal:'斜め縞',plain:'無地',outdoor:'屋外',dome:'ドーム',retractable:'開閉式ドーム',school:'学校・小型球場',full:'全周',outfield:'外野',infield:'内野',left:'左側',right:'右側',none:'なし',arch:'アーチ',gable:'切妻',barrel:'かまぼこ',open:'開く',closed:'閉じる',center:'中央',digital:'デジタル',classic:'クラシック',around:'全周',corners:'四隅',outside:'場外',inside:'場内',auto:'球場標準',day:'デイゲーム',night:'ナイター',random:'ランダム',clear:'晴れ',cloudy:'曇り',rain:'雨',fixed:'固定'};
 let stadiumDraft=null,stadiumEditId=null,stadiumSection='shape',stadiumPreview=null,stadiumPreviewTimer=null;
 function disposeStadiumPreview(){clearTimeout(stadiumPreviewTimer);stadiumPreview?.dispose();stadiumPreview=null;}
 function refreshStadiumPreview(){clearTimeout(stadiumPreviewTimer);stadiumPreviewTimer=setTimeout(()=>{if(stadiumPreview&&stadiumDraft){try{stadiumPreview.update(NightStadium.makePark(stadiumDraft,'preview'));}catch(err){console.error('Stadium preview',err);}}},80);}
 function stadiumField([key,label,unit='',step=1]){
  const v=stadiumDraft[key],L=NightStadium.LIMITS[key],options=NightStadium.OPTIONS[key],color=NightStadium.COLORS[key];
  const control=options?'<select class="field-select" data-stadium-field="'+key+'">'+options.map(o=>'<option value="'+o+'" '+(v===o?'selected':'')+'>'+stadiumOptionLabels[o]+'</option>').join('')+'</select>':color?'<input type="color" data-stadium-field="'+key+'" value="'+v+'"><span class="stadium-color-value">'+v+'</span>':L?'<div class="stadium-number"><input type="range" data-stadium-field="'+key+'" aria-label="'+label+'" min="'+L[0]+'" max="'+L[1]+'" step="'+step+'" value="'+v+'"><input type="number" class="field-select" data-stadium-field="'+key+'" aria-label="'+label+' 数値" min="'+L[0]+'" max="'+L[1]+'" step="'+step+'" value="'+v+'"><span>'+unit+'</span></div>':'<input class="field-select" type="text" data-stadium-field="'+key+'" maxlength="40" value="'+uiEscape(v)+'">';
  return '<label class="stadium-field"><span>'+label+(L?' <small>'+L[0]+'–'+L[1]+' '+unit+'</small>':'')+'</span>'+control+'</label>';
 }
 function stadiumSavedHTML(){
  const customs=NightPlayers.parks.filter(p=>p.custom);
  return '<div class="stadium-template"><label>既存の球場をベースに作成<select id="stadium-template" class="field-select"><option value="">球場を選択</option>'+NightPlayers.parks.map(p=>'<option value="'+uiEscape(p.id)+'">'+uiEscape(p.name)+'</option>').join('')+'</select></label><button class="secondary-button" data-action="stadium-template">ベースから新規作成</button></div><h3 class="arcade-section-title">保存済みのカスタム球場</h3>'+(!customs.length?'<p class="modal-note">まだ保存された球場はありません。</p>':'')+customs.map(p=>'<div class="career-list-row stadium-saved-row"><div><b>'+uiEscape(p.name)+'</b><small>'+p.left+' / '+p.center+' / '+p.right+' m</small></div><span class="stadium-list-actions"><button class="stadium-list-button" data-action="stadium-edit" data-park-id="'+uiEscape(p.id)+'">編集</button><button class="stadium-list-button" data-action="stadium-duplicate" data-park-id="'+uiEscape(p.id)+'">複製</button><button class="stadium-list-button" data-action="stadium-share" data-park-id="'+uiEscape(p.id)+'">共有コード</button><button class="stadium-list-button danger" data-action="stadium-delete" data-park-id="'+uiEscape(p.id)+'">削除</button></span></div>').join('')+'<h3 class="arcade-section-title">共有コード</h3><p class="modal-note">旧バージョンのコードも読み込めます。新しいコードにはすべての編集設定が含まれます。</p><textarea id="share-park-code" class="field-select" rows="3" placeholder="NB1.PARK.…"></textarea><button class="secondary-button" data-action="stadium-share-import">コードを読み込む</button>';
 }
 function stadiumSectionHTML(){
  const section=stadiumSections.find(s=>s[0]===stadiumSection)||stadiumSections[0];
  if(section[0]==='saved')return stadiumSavedHTML();
  const note=section[0]==='shape'?'9か所の距離と高さを自由に組み合わせられます。全体の高さは9か所を一括変更します。':section[0]==='environment'?'屋根が閉じた球場では雨と風は無効です。固定風向はホームから中堅方向を0°、右翼方向を正とします。':section[0]==='ground'?'地面と反発・転がりの設定は試合の打球にも反映されます。':section[0]==='stands'?'屋根の形・高さはドームと開閉式ドームに適用されます。':'位置やサイズを変更して球場をデザインできます。';
  return '<div class="stadium-section-head"><p class="modal-note">'+note+'</p><button class="stadium-list-button" data-action="stadium-reset">この項目を初期化</button></div><div class="stadium-fields">'+section[2].map(stadiumField).join('')+'</div>';
 }
 function stadiumSetSection(section){stadiumSection=section;const body=$('stadium-fields');if(!body)return;body.innerHTML=stadiumSectionHTML();body.scrollTop=0;document.querySelectorAll('[data-stadium-section]').forEach(b=>{b.classList.toggle('active',b.dataset.stadiumSection===section);b.setAttribute('aria-selected',String(b.dataset.stadiumSection===section));});}
 function stadiumEditorModal(editId=null,initial=null,section='shape'){
  const editing=NightPlayers.parks.find(p=>p.custom&&p.id===editId)||null;
  stadiumEditId=editing?.id||null;stadiumDraft=NightStadium.clampSpec(initial||editing?.customSpec||{});stadiumSection=section;
  modal('<div class="stadium-editor-shell">'+modalTitle('','球場エディタ')+'<div class="stadium-name-row"><input id="stadium-name" class="field-select" type="text" maxlength="24" aria-label="球場名" value="'+uiEscape(stadiumDraft.name)+'"><button class="stadium-list-button" data-action="stadium-new">新規</button></div><div class="stadium-preview3d"><canvas id="stadium-preview3d" aria-label="球場の3Dプレビュー"></canvas><div class="stadium-preview-hint">ドラッグで回転 · ピンチ / ホイールで拡大縮小</div><button class="stadium-list-button stadium-camera-reset" data-action="stadium-camera-reset">視点リセット</button></div><div class="stadium-editor-tabs" role="tablist">'+stadiumSections.map(([k,l])=>'<button role="tab" aria-selected="'+(k===section)+'" class="'+(k===section?'active':'')+'" data-stadium-section="'+k+'">'+l+'</button>').join('')+'</div><div id="stadium-fields" class="stadium-fields-scroll">'+stadiumSectionHTML()+'</div><div class="stadium-editor-footer"><button class="secondary-button" data-action="stadium-back">'+(editHubChild==='stadium'?'戻る':'試合設定へ')+'</button><button class="primary-button" data-action="stadium-save">'+(editing?'変更を保存':'球場を保存')+'</button></div></div>','stadium-editor');
  const root=$('modal-content');
  $('stadium-name').addEventListener('input',e=>{stadiumDraft.name=e.target.value;});
  try{stadiumPreview=new CustomParkPreview($('stadium-preview3d'));stadiumPreview.update(NightStadium.makePark(stadiumDraft,'preview'));}catch(err){console.error('Stadium preview unavailable',err);$('stadium-preview3d').hidden=true;}
  $('stadium-fields').addEventListener('input',e=>{
   const key=e.target.dataset.stadiumField;if(!key)return;
   if(e.target.type==='number'&&e.target.value==='')return;
   const old=stadiumDraft[key];stadiumDraft[key]=e.target.value;
   if(NightStadium.DISTANCES.includes(key)&&old!==Number(e.target.value))stadiumDraft.detailShape=true;
   if(key==='wallHeight')NightStadium.HEIGHTS.forEach(k=>stadiumDraft[k]=e.target.value);
   stadiumDraft=NightStadium.clampSpec(stadiumDraft);
   document.querySelectorAll('[data-stadium-field]').forEach(el=>{if(el!==e.target&&el.dataset.stadiumField===key)el.value=stadiumDraft[key];if(key==='wallHeight'&&NightStadium.HEIGHTS.includes(el.dataset.stadiumField))el.value=stadiumDraft[el.dataset.stadiumField];});
   if(e.target.type==='color')e.target.parentElement.querySelector('.stadium-color-value').textContent=stadiumDraft[key];
   refreshStadiumPreview();
  });
  $('stadium-fields').addEventListener('change',e=>{const key=e.target.dataset.stadiumField;if(key)e.target.value=stadiumDraft[key];});
 }
 function stadiumDeleteConfirmModal(parkId){
  const park=NightPlayers.parks.find(p=>p.custom&&p.id===parkId);if(!park){stadiumEditorModal();return;}
  const selected=settings.park===parkId;
  modal(`${modalTitle('','球場を削除しますか？')}<p>カスタム球場「${park.name}」を削除します。この操作は取り消せません。</p>${selected?'<p class="stadium-delete-note">この球場は試合設定で選択中です。削除すると、試合設定の球場は既定の球場に戻ります。</p>':''}<button class="primary-button danger-button-solid" data-action="stadium-delete-confirm" data-park-id="${park.id}">削除する</button><button class="secondary-button" data-action="stadium-editor">キャンセル</button>`,'stadium-delete-confirm');
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
   <details class="editor-player-detail"><summary>ルール</summary><p>投球は150 km/hのストレート。先攻・後攻は抽選で決まり、後攻が先攻の本数を超えた時点で勝利。同数なら1分延長し、延長も同数ならシード順で決定します。決勝が延長後も0本同士なら引き分けです。</p></details>`,'derby-setup');
 }
 function derbyScoreText(m,i){
  const normal=m.normal[i],extra=m.extra[i];
  return normal==null?'—':extra==null?String(normal):`${normal} + ${extra}`;
 }
 function derbyBracket(g){
  const d=g.derby;
  const entry=(p,score,winner)=>{
   if(!p)return '<div class="derby-entry pending"><span>未定</span><b>—</b></div>';
   return `<div class="derby-entry${p.user?' user':''}${winner?' winner':''}">
    <span class="derby-entry-name">${clubBadge(p.club.id,true)}${fittedName(p.player.name,'span','derby-player')}</span>
    <b>${score}</b>${p.user?'<small class="derby-you">自分</small>':''}${winner?'<small class="derby-winner">勝ち</small>':''}
   </div>`;
  };
  return `<div class="derby-bracket" role="region" aria-label="トーナメント表" tabindex="0"><div class="derby-tree">
   ${['準々決勝','準決勝','決勝'].map((name,round)=>`<section class="derby-tree-round">
    <h3>${name}</h3><div class="derby-round-fixtures">${Array.from({length:4>>round},(_,slot)=>{
     const match=d.rounds[round][slot];
     const projected=round?[d.rounds[round-1][slot*2]?.winner,d.rounds[round-1][slot*2+1]?.winner]:[];
     const entries=match?.entrants??projected;
     const reason=match?.reason;
     return `<div class="derby-pair${match&&match===d.matchup?' current':''}"${reason?' title="'+reason+'"':''}>
      ${[0,1].map(i=>entry(entries[i],match?derbyScoreText(match,i):'—',!!entries[i]&&entries[i]===match?.winner)).join('')}
     </div>`;
    }).join('')}</div>
   </section>`).join('')}
  </div></div>`;
 }
 function derbyRoundPreview(g){
  const d=g.derby;
  const turn=d.userBatsSecond?`後攻 · ${d.opponent.player.name}の${d.score[1-d.userIndex]}本を上回れば勝利`:'先攻 · 2分間で本数を伸ばそう';
  g.paused=true;
  modal(`${modalTitle('','ホームラン競走',false)}
   <p class="career-status-line">${d.label} · ${turn}</p>
   ${derbyBracket(g)}
   <button class="primary-button" data-action="close">対戦開始</button>
   <button class="secondary-button" data-action="home">ホームへ戻る</button>`,'derby-bracket');
 }
 function derbyTurnResult(g){
  const d=g.derby,action=g.derbyTransition,finished=action==='finish';
  if(finished){commit(g);g.setPhase('ended');}
  const title=finished?d.champion?.user?'優勝':d.champion?`${d.champion.player.name}が優勝`:'決勝引き分け':action==='extra'?'同点・延長戦':`${d.label} 突破`;
  const match=d.matchup,index=d.userIndex;
  modal(`${modalTitle('',title,false)}
   <div class="derby-result-summary"><strong>${g.batter.name}</strong><div><b>${derbyScoreText(match,index)}</b><span>–</span><b>${derbyScoreText(match,1-index)}</b></div><strong>${d.opponent.player.name}</strong></div>
   ${match.walkOff?'<p class="career-status-line">後攻で先攻の本数を超え、勝利しました。</p>':''}
   ${finished?`<div class="derby-record"><span>大会通算 <b>${g.session.hr} 本</b></span><span>最長 <b>${g.session.maxDistance||'—'} m</b></span></div>`:''}
   <button class="primary-button" data-action="${finished?'restart':'derby-next'}">${finished?'もう一度':action==='extra'?'1分間の延長へ':'次のラウンドへ'}</button>
   ${derbyBracket(g)}${finished?'<button class="secondary-button" data-action="home">ホームへ戻る</button>':''}`,'derby-result');
 }
 function updateDerbyClock(g){
  const clock=$('derby-clock');if(!clock)return;
  const seconds=Math.ceil(g.derby.remaining/1000),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  if(clock.textContent!==time){clock.textContent=time;clock.classList.toggle('low',seconds<=15);}
 }


 // Dedicated, reusable pregame screen shell. No changes to the live HUD.
 const pfIcons={back:'<path d="m15 5-7 7 7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',chevron:'<path d="m9 5 7 7-7 7"/>',swap:'<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="M6 5a12 12 0 0 1 0 14M18 5a12 12 0 0 0 0 14"/>',lineup:'<path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="M12 9v6m-3-3h6"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',check:'<path d="m5 12 4 4L19 6"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>'};
 const pfIcon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true">${pfIcons[id]||''}</svg>`;
 const pregameColor=c=>/^#[0-9a-f]{6}$/i.test(c?.color||'')?c.color:'#2785c4';
 const pfHeader=(title,back='close')=>`<header class="pf-header"><button type="button" class="pf-back" data-action="${back}" aria-label="${back==='close'?'閉じる':'戻る'}">${pfIcon(back==='close'?'close':'back')}</button><h2 id="modal-title">${title}</h2><span class="pf-header-mark" aria-hidden="true">${pfIcon('ball')}</span></header>`;
 function pfScreen(title,body,kind,footer='',back='ui-park-back',above=''){
  modal(`${pfHeader(title,back)}${above}<div class="pf-body">${body}</div>${footer?`<footer class="pf-footer">${footer}</footer>`:''}`,kind);
 }
 const pfChoice=(pairs,key,attribute)=>`<div class="pf-choice" role="group">${pairs.map(([v,l])=>`<button type="button" ${attribute}="${v}" aria-pressed="${key===v}" class="${key===v?'active':''}">${l}</button>`).join('')}</div>`;
 const pfLink=(icon,label,value,action)=>`<button type="button" class="pf-link" data-action="${action}"><span class="pf-link-icon">${pfIcon(icon)}</span><span class="pf-link-copy"><small>${label}</small><b>${value}</b></span><span class="pf-chevron">${pfIcon('chevron')}</span></button>`;
 function matchTeamsHTML(){
  const own=matchClub(settings.matchTeam),opponent=matchClub(settings.matchOpponent);
  const card=(key,club,label,order)=>`<button type="button" class="pf-team" data-ui-team-side="${key}" style="--team-color:${pregameColor(club)}" aria-label="${label}：${uiEscape(club.name)}"><span class="pf-team-label">${label}</span><span class="pf-team-logo">${clubBadge(club.id)}</span><b>${uiEscape(club.short)}</b><span class="pf-team-side">${order}</span><i class="pf-team-edit" aria-hidden="true">${pfIcon('swap')}</i></button>`;
  return `<div class="pf-matchup">${card('home',own,'自チーム',settings.matchUserHome?'後攻':'先攻')}<span class="pf-vs" aria-hidden="true">VS</span>${card('away',opponent,'相手チーム',settings.matchUserHome?'先攻':'後攻')}</div>`;
 }
 function matchPickerGroup(id){return id.startsWith('kbo-')?'kbo':id.startsWith('npb-')?'npb':'cpbl';}
 function matchDefaultPark(){return matchClub(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;}
 function setupMatchTeams(){
  matchContext='match';
  const home=matchClub(settings.matchTeam),away=matchClub(settings.matchOpponent),current=matchPickSide==='home'?home:away;
  const clubs=matchClubGroup==='npb'?NightTeams.npb:matchClubGroup==='kbo'?NightTeams.kbo:NightTeams.all;
  const tile=c=>`<button type="button" class="pf-team-tile ${current.id===c.id?'selected':''}" style="--team-color:${pregameColor(c)}" data-match-club="${c.id}" aria-pressed="${current.id===c.id}">${clubBadge(c.id)}<b>${uiEscape(c.short)}</b>${current.id===c.id?`<span class="pf-check">${pfIcon('check')}</span>`:''}</button>`;
  pfScreen('球団選択',`<div class="pf-select-side">${pfChoice([['home','自チーム'],['away','相手チーム']],matchPickSide,'data-match-side')}</div><div class="pf-current">${clubBadge(current.id,true)}<b>${uiEscape(current.name)}</b></div><div class="pf-sticky-filter">${pfChoice([['cpbl','CPBL'],['npb','NPB'],['kbo','KBO']],matchClubGroup,'data-match-group')}</div><div class="pf-team-grid">${clubs.map(tile).join('')}${tile(matchClub('dream'))}</div><details class="pf-source"><summary>査定の根拠・出典</summary><p class="modal-note">${matchClubGroup==='npb'?'2026年公式成績から個別査定。ファーム2球団も選択可能。球速・球種などはゲーム用推定です。':matchClubGroup==='kbo'?'KBO 2026年公式成績から査定。未確認の投打・守備位置・背番号、球速・球種はゲーム用推定または未設定です。':'選手名鑑で個別の査定情報を確認できます。'}</p></details>`,'match-teams');
 }
 function matchPresetContext(){
  return {teamIds:[...NightTeams.matchTeams.map(c=>c.id),'dream'],parkIds:NightPlayers.parks.map(p=>p.id),defaults:{matchTeam:'owls',matchOpponent:'foxes',park:'night'}};
 }
 function matchPresetsHTML(){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const presets=NightMatchPresets.load();
  const summary=p=>{const v=NightMatchPresets.sanitizeValues(p.values,matchPresetContext()),park=NightPlayers.parks.find(x=>x.id===v.park);return `${matchClub(v.matchTeam).short} vs ${matchClub(v.matchOpponent).short} · ${v.innings}イニング${park?' · '+park.name:''}`;};
  return `<div class="setup-section match-presets"><label for="match-preset-name">お気に入りプリセット</label><div class="match-preset-save"><input id="match-preset-name" class="field-select" type="text" maxlength="24" placeholder="プリセット名（例：いつもの設定）"><button type="button" class="match-preset-save-button" data-action="match-preset-save">現在の設定を保存</button></div>${presets.length?`<div class="match-preset-list">${presets.map(p=>`<div class="match-preset-row"><button type="button" class="match-preset-apply" data-match-preset="${p.id}"><b>${esc(p.name)}</b><small>${esc(summary(p))}</small></button><button type="button" class="match-preset-delete" data-action="match-preset-delete" data-preset-id="${p.id}" aria-label="${esc(p.name)}を削除">削除</button></div>`).join('')}</div>`:'<p class="modal-note">現在の対戦設定に名前を付けて保存すると、ここからワンタップで呼び出せます。</p>'}</div>`;
 }
 function applyMatchPreset(id){
  const preset=NightMatchPresets.get(id);
  if(!preset){toast('プリセットが見つかりませんでした');setupMatch();return;}
  // Stale entries (deleted custom park, removed club) fall back per-field
  // inside sanitizeValues; applying only rewrites the setup screen's
  // settings — the match still starts through the usual flow.
  const values=NightMatchPresets.sanitizeValues(preset.values,matchPresetContext());
  // v153: presets now also carry randomRoster + the variant rules.
  // Keys a pre-v153 preset does not carry are omitted from values, so
  // Object.assign leaves those live settings untouched. When the random
  // roster flag actually flips, drop the drawn roster like the setup
  // toggle handler does, so the next lineup is drawn under the new flag.
  const hadRandomRoster=settings.randomRoster;
  Object.assign(settings,values);settings.customDifficulty={...values.customDifficulty};globalThis.NightGameCustomDifficulty=settings.customDifficulty;
  if(settings.randomRoster!==hadRandomRoster)randomMatch=null;
  lineupConfig('match').config.pitcher=values.pitcher;
  save();setupMatch();toast(`プリセット「${preset.name}」を呼び出しました`);
 }
 let matchForecast=null,pennantForecast=null;
 function ensureMatchForecast(){
  const park=NightPlayers.parks.find(p=>p.id===settings.park)||NightPlayers.parks[0];
  if(!matchForecast||matchForecast.park!==park.id)matchForecast=NightGame.rollForecast(park);
  return matchForecast;
 }
 function ensurePennantForecast(fixture){
  const park=NightPlayers.parks.find(p=>p.id===NightTeams.get(fixture.home).park)||NightPlayers.parks[0];
  const key=fixture.id+'@'+park.id;
  if(!pennantForecast||pennantForecast.key!==key)pennantForecast={key,...NightGame.rollForecast(park,Math.random,false)};
  return pennantForecast;
 }
 function weatherForecastHTML(forecast){
  const wind=forecast.wind||0,windText=forecast.windDirection!=null?`風速 ${wind} m/s · ${forecast.windDirection}°`:wind>0?`追い風 ${wind} m`:wind<0?`向かい風 ${Math.abs(wind)} m`:'無風';
  const icon=forecast.weather==='rain'?'🌧':forecast.weather==='cloudy'?'☁':'☀';
  const note=forecast.weather==='rain'?'雨で打球は失速し、守備のエラーが増える見込み':forecast.weather==='cloudy'?'天候による影響は小さい見込み':'好天の見込み。風向きに注意';
  return `<div class="weather-forecast" data-weather-forecast data-weather="${forecast.weather}" data-wind="${wind}" role="note" aria-label="天気予報 ${forecast.weatherLabel}、${windText}"><span class="weather-forecast-title">天気予報</span><b>${icon} ${forecast.weatherLabel}</b><span>${windText}</span><small>${note}</small></div>`;
 }
 const uiEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function parkMiniSVG(park){
  const scale=Math.min(.55,80/Math.max(park.center,park.left,park.right,...(park.fenceAnchors||[])));
  const points=Array.from({length:31},(_,i)=>{const a=-Math.PI/4+i*Math.PI/60,d=NightPlayers.wallDistance(park,a);return [90+Math.sin(a)*d*scale,98-Math.cos(a)*d*scale];});
  const coords=pts=>pts.map(pt=>pt.map(n=>n.toFixed(1)).join(',')).join(' ');
  const expanded=(scale)=>points.map(([x,y])=>[90+(x-90)*scale,98+(y-98)*scale]);
  const turf=park.turf!==undefined&&Number.isFinite(park.turf)?'#'+Math.round(park.turf).toString(16).padStart(6,'0').slice(-6):'#448d59';
  const dome=park.theme==='dome'||park.id?.includes('dome');
  const bands=[1.23,1.15,1.07].map((scale,k)=>`<polyline points="${coords(expanded(scale))}" stroke="${k===1?'#728c9b':'#476176'}" stroke-width="4.4" fill="none"/>`).join('');
  const foul=`M90 98 L${points[0].join(' ')} M90 98 L${points.at(-1).join(' ')}`;
  return `<svg class="ui-park-mini" viewBox="0 0 180 110" aria-hidden="true"><rect width="180" height="110" rx="8" fill="#122e48"/>${dome?'<ellipse cx="90" cy="55" rx="84" ry="49" fill="#213f57" stroke="#829bad" stroke-width="2"/>':''}${bands}<polygon points="90,98 ${coords(points)}" fill="${turf}" stroke="#b8d4c8" stroke-width="1.4"/><path d="M90 98 114 74 90 50 66 74Z" fill="#c89b70"/><path d="M90 92 108 74 90 56 72 74Z" fill="${turf}"/><path d="${foul}" fill="none" stroke="#f3f3e1" stroke-width=".8"/><circle cx="90" cy="74" r="3.7" fill="#c89b70"/><path d="M87 50h6v3h-6ZM66 72h4v4h-4ZM110 72h4v4h-4Z" fill="#fff"/><circle cx="90" cy="98" r="2" fill="#fff"/></svg>`;
 }
 function parkGroup(p){return p.custom?'custom':p.school?'school':p.league==='kbo'?'kbo':p.league==='npb'||['toyama','tokyo-dome'].includes(p.id)?'npb':'cpbl';}
 let parkPickerGroup='cpbl';
 function parkPicker(opening=false,kind='match'){
  const isOnline=kind==='online',selected=isOnline?onlineParkId():settings.park;
  if(opening)parkPickerGroup=parkGroup(NightPlayers.parks.find(p=>p.id===selected)||NightPlayers.parks[0]);
  const groups=[['cpbl','台湾'],['npb','日本'],['kbo','韓国'],['school','高校野球'],['custom','カスタム']];
  const parks=NightPlayers.parks.filter(p=>parkGroup(p)===parkPickerGroup);
  pfScreen('球場選択',`<div class="pf-sticky-filter">${pfChoice(groups,parkPickerGroup,isOnline?'data-online-park-group':'data-ui-park-group')}</div><div class="pf-park-grid">${parks.map(p=>`<button type="button" class="pf-park-tile ${p.id===selected?'selected':''}" data-${isOnline?'online':'ui'}-park="${uiEscape(p.id)}" aria-pressed="${p.id===selected}">${parkMiniSVG(p)}<span><b>${uiEscape(p.name)}</b><small>${p.left??p.corner} / ${p.center} / ${p.right??p.corner} m</small></span>${p.id===selected?`<span class="pf-check">${pfIcon('check')}</span>`:''}</button>`).join('')}</div>${isOnline?'<p class="modal-note">カスタム球場の設定は対戦相手へ自動で送信されます。</p>':'<button class="pf-secondary pf-wide" data-action="stadium-editor">球場エディタ（カスタム球場を作成）</button>'}`,isOnline?'online-park':'park-picker','',isOnline?'online-lobby-back':'ui-park-back');
 }
 function matchPitchers(kind='match'){
  const isOnline=kind==='online',{club,config}=lineupConfig(kind);
  const row=(p,i)=>`<button type="button" class="pf-pitcher-row ${config.pitcher===i?'selected':''}" data-${isOnline?'online':'ui'}-pitcher="${i}" aria-pressed="${config.pitcher===i}"><span class="pf-pitcher-no">${uiEscape(p.no??'—')}</span><span class="pf-pitcher-name"><b>${uiEscape(p.name)}</b><small>${p.hand==='L'?'左投':'右投'} · ${pitchRole(p)}</small></span><span class="pf-pitcher-speed"><b>${p.velocity??'—'}</b><small>km/h</small></span><span class="pf-pitcher-grade grade-${NightPlayers.grade(NightSquad.overall(p))}">${NightPlayers.grade(NightSquad.overall(p))}</span><span class="pf-pitcher-check">${config.pitcher===i?pfIcon('check'):''}</span></button>`;
  const groups=[['先発',p=>p.role==='SP'||!['RP','CP'].includes(p.role)],['中継ぎ',p=>p.role==='RP'],['抑え',p=>p.role==='CP']];
  pfScreen('先発投手',`<div class="pf-current">${clubBadge(club.id,true)}<b>${uiEscape(club.name)}</b></div>${groups.map(([label,filter])=>{const list=club.pitchers.map((p,i)=>({p,i})).filter(({p})=>filter(p));return list.length?`<h3 class="pf-section-label">${label}</h3><div class="pf-pitcher-list">${list.map(({p,i})=>row(p,i)).join('')}</div>`:'';}).join('')}`,isOnline?'online-pitchers':'match-pitchers','',isOnline?'online-lobby-back':'ui-park-back');
 }
 function matchRuleCount(){
  return ['randomRoster','variantFullCount','variantMetalBat','variantLowReboundBat','variantNoBreaking','variantTwoOuts','hardcore'].filter(k=>settings[k]).length+(settings.handicapUserRuns>0?1:0)+(settings.handicapCpuRuns>0?1:0)+(settings.handicapUserOuts===4?1:0)+(settings.handicapCpuOuts===2?1:0);
 }
 function matchOptions(){
  pregameRoster=false;
  pfScreen('詳細設定',`<div class="pf-advanced"><div class="setup-section"><label>編成</label><div class="setting-row"><div><strong>ランダム編成</strong><small>両チームの選手を全リーグのプールから毎試合ランダムに編成（通常対戦のみ）</small></div><button class="toggle ${settings.randomRoster?'on':''}" data-toggle="randomRoster" role="switch" aria-checked="${!!settings.randomRoster}" aria-label="ランダム編成"></button></div></div><div class="setup-section"><label>変則ルール（通常対戦のみ・組み合わせ可）</label>${[['variantFullCount','フルカウント開始','全打席が2ボール2ストライクから始まる'],['variantMetalBat','金属バット','打球の初速が上がり、長打が出やすくなる（低反発バットとは同時使用不可）'],['variantLowReboundBat','低反発バット','打球の初速が下がり、長打が出にくくなる（金属バットとは同時使用不可）'],['variantNoBreaking','変化球禁止','両投手ともストレートのみ（球種ボタンも無効化）'],['variantTwoOuts','2アウト制','2アウトで攻守交代']].map(([v,l,d])=>`<div class="setting-row"><div><strong>${l}</strong><small>${d}</small></div><button class="toggle ${settings[v]?'on':''}" data-toggle="${v}" role="switch" aria-checked="${!!settings[v]}" aria-label="${l}"></button></div>`).join('')}</div><div class="setup-section"><label>情報制限ハードコア（通常対戦のみ）</label><div class="setting-row"><div><strong>ハードコアモード</strong><small>自分の打席で、球種・球速・変化量の表示、配球チャート、タイミングリング、前球マーカーをすべて消します。ボールの軌道と読みだけで打つ上級者向けです</small></div><button class="toggle ${settings.hardcore?'on':''}" data-toggle="hardcore" role="switch" aria-checked="${!!settings.hardcore}" aria-label="ハードコアモード"></button></div></div><div class="setup-section"><label>ハンデ（通常対戦のみ・CPUの能力は変わりません）</label><div class="setting-label">自分の先行点</div><div class="segmented">${[0,1,2,3].map(n=>`<button data-handicap="userRuns:${n}" class="${settings.handicapUserRuns===n?'active':''}">${n}点</button>`).join('')}</div><div class="setting-label">相手の先行点</div><div class="segmented">${[0,1,2,3].map(n=>`<button data-handicap="cpuRuns:${n}" class="${settings.handicapCpuRuns===n?'active':''}">${n}点</button>`).join('')}</div><div class="setting-label">自分の攻撃のアウト数</div><div class="segmented">${[[3,'3アウト（通常）'],[4,'4アウト（優遇）']].map(([n,l])=>`<button data-handicap="userOuts:${n}" class="${settings.handicapUserOuts===n?'active':''}">${l}</button>`).join('')}</div><div class="setting-label">相手の攻撃のアウト数</div><div class="segmented">${[[3,'3アウト（通常）'],[2,'2アウト（優遇）']].map(([n,l])=>`<button data-handicap="cpuOuts:${n}" class="${settings.handicapCpuOuts===n?'active':''}">${l}</button>`).join('')}</div></div><button class="league-inline-button" data-action="stadium-editor">球場エディタ（カスタム球場を作成）</button><button class="league-inline-button" data-action="match-scout">相手をスカウト</button><button class="league-inline-button" data-action="ui-match-roster">選手の能力を見る</button></div>`,'match-options',`<button class="pf-primary pf-wide" data-action="ui-park-back">決定</button>`);
 }
 function matchPresetsScreen(){
  pfScreen('お気に入りプリセット',`<div class="pf-advanced">${matchPresetsHTML()}</div>`,'match-presets');
 }
 function setupMatch(){
  matchContext='match';pregameRoster=false;
  const pending=$('resume-game').dataset.saveKind==='match',{club,config,players}=lineupConfig('match');
  const pitcher=club.pitchers[config.pitcher],park=NightPlayers.parks.find(p=>p.id===settings.park)||NightPlayers.parks[0],forecast=ensureMatchForecast();
  const wind=forecast.wind||0,windText=forecast.windDirection!=null?`風速 ${wind} m/s · ${forecast.windDirection}°`:wind>0?`追い風 ${wind} m`:wind<0?`向かい風 ${Math.abs(wind)} m`:'無風';
  const icon=forecast.weather==='rain'?'🌧':forecast.weather==='cloudy'?'☁':'☀',count=matchRuleCount();
  const pitcherValue=pitcher?`${uiEscape(pitcher.name)} <small class="pf-inline-stat">${pitcher.velocity} km/h</small>`:'—';
  const orderPreview=`<span class="pf-order-preview">${players.map((p,i)=>`<span><i>${i+1}</i><b>${uiEscape(p.name)}</b><small>${NightSquad.label(p.fieldPos||p.pos)}</small></span>`).join('')}</span>`;
  const body=`${matchTeamsHTML()}<div class="pf-conditions"><div><label>先攻・後攻</label>${pfChoice([[false,'先攻'],[true,'後攻']],settings.matchUserHome,'data-match-home')}</div><div><label>イニング</label>${pfChoice([3,5,9].map(n=>[n,n+'回']),settings.innings,'data-innings')}</div></div>
  <section class="pf-venue"><button type="button" class="pf-venue-main" data-action="ui-park-open">${parkMiniSVG(park)}<span><b>${uiEscape(park.name)}</b><small>${icon} ${forecast.weatherLabel} · ${windText}</small></span><span class="pf-chevron">${pfIcon('chevron')}</span></button><div class="pf-light"><label>時間帯</label>${pfChoice(GAME_LIGHTING_OPTIONS,settings.gameLighting,'data-ui-light')}</div></section>
  <div class="pf-roster">${pfLink('ball','先発投手',pitcherValue,'ui-pitcher-open')}<button type="button" class="pf-link pf-order-link" data-action="match-lineup"><span class="pf-link-icon">${pfIcon('lineup')}</span><span class="pf-link-copy"><small>オーダー編成</small><b>${players.length}人</b></span><span class="pf-chevron">${pfIcon('chevron')}</span>${orderPreview}</button></div>
  <div class="pf-aux"><button type="button" data-action="ui-options-open">${pfIcon('gear')}<span>詳細設定</span>${count?`<b class="pf-count">${count}</b>`:''}${pfIcon('chevron')}</button><button type="button" data-action="ui-presets-open">${pfIcon('star')}<span>プリセット</span>${pfIcon('chevron')}</button></div>`;
  pfScreen('対戦',body,'setup',`${pending?'<p class="pf-warning">開始すると、中断中の試合を置き換えます。</p>':''}<div class="pf-launch"><button class="pf-secondary" data-action="spectate-start">観戦</button><button class="pf-primary" data-action="ui-match-start">${pfIcon('play')}<span>試合開始</span></button></div>`,'close');
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
  const pitch=thrower?`<section class="repertoire-card"><h4>持ち球と設定球速</h4>${p.pitches.map(id=>{const spec=NightGame.pitchSpec(p,id),d=p.pitchDetails?.[id];return `<div><b>${spec.short}</b><strong>${Math.round(spec.speed)}<small> km/h</small></strong><span>${d?.speedBasis||'ゲーム用推定'}${Number.isFinite(d?.measuredAverage)?`・実測 ${d.measuredAverage} km/h`:''}${Number.isFinite(d?.measuredMax)?` / 最高 ${d.measuredMax} km/h`:''}${Number.isFinite(d?.usagePct)?` / ${d.usagePct}%`:''}</span></div>`;}).join('')}<small>変化量はゲーム用の推定。球速の根拠は各球種に表示。</small></section>`:'';
  return matchup+field+pitch;
 }
 function abilityHTML(p,includeMatch=true){
  const pitching=p.pos==='P',spec=pitching?[['平均球速',Math.round((p.velocity-110)*2),p.velocity+'km'],['制球',p.control],['体力',p.stamina],['球威・変化',p.movement]]:[['ミート',p.contact],['パワー',p.power],['走力',p.run],['守備',p.field],['肩',p.arm]];
  const stats=includeMatch?game?.box[p.id]:null;
  return `<div class="ability-hero"><div class="ability-header"><span class="jersey-number">${p.no}</span><div><strong>${p.name}</strong><small>${p.pos} · ${p.hand==='S'?'両':p.hand==='L'?'左':'右'}${pitching?'投':'打'}</small><span class="trait-chip">${p.trait}</span>${!pitching&&p.stats?.pa>=150&&Number.isFinite(p.stats?.rbi)?(p.stats.rbi/p.stats.pa>=.155?'<span class="trait-chip">勝負強い</span>':p.stats.rbi/p.stats.pa<=.085?'<span class="trait-chip">チャンスに弱い</span>':''):''}${includeMatch&&game?.isFixture?`<span class="trait-chip">今日の調子：${['絶不調','不調','普通','好調','絶好調'][game.conditionFor(p)+2]}</span>`:''}</div></div><div class="ability-bars ${pitching?'pitching-abilities':''}">${spec.map(([l,n,val])=>`<div class="ability-row"><span>${l}</span><i><i style="width:${n}%"></i></i><b class="grade-${NightPlayers.grade(n)}">${val||NightPlayers.grade(n)}${val?'':`<small>${n}</small>`}</b></div>`).join('')}</div><p class="ability-description">${descriptions[p.trait]||''}</p>${ratingEvidenceHTML(p)}${matchupEvidenceHTML(p)}${pitching?`<div class="stat-line">球種：${p.pitches.map(id=>NightGame.pitchSpec(p,id).short).join(' / ')}</div>`:stats?`<div class="stat-line">この試合：${stats.pa}打席　${stats.ab}打数 ${stats.h}安打 ${stats.hr}本塁打 ${stats.rbi}打点</div>`:''}</div>`;
 }
 function seasonGraphHTML(p,isPitcher){
   if(screen!=='pennant'||!league||typeof league.playerSeasonHistory!=='function')return '';
   const hist=league.playerSeasonHistory(p.id);
   if(!hist.length)return '';
   const fmt3=v=>v.toFixed(3).replace(/^0/,'');
   const metric=h=>isPitcher?(h.outs?h.runs*27/h.outs:null):(h.ab?h.h/h.ab:null);
   const pts=hist.map(h=>({h,v:metric(h)})).filter(x=>x.v!=null);
   let graph='';
   if(pts.length>=2){
     const vals=pts.map(x=>x.v);let min=Math.min(...vals),max=Math.max(...vals);if(max-min<1e-9){max+=.05;min-=.05;}
     const X=i=>14+i*(232/Math.max(1,pts.length-1)),Y=v=>8+(max-v)/(max-min)*44;
     graph=`<svg class="season-graph" viewBox="0 0 260 64" role="img" aria-label="${isPitcher?'防御率':'打率'}の年度推移"><path d="M14 8v44h232" stroke="#5f745d66" fill="none"/><path d="${pts.map((x,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Y(x.v).toFixed(1)}`).join('')}" stroke="#d5f36a" fill="none" stroke-width="1.6"/>${pts.map((x,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="3" fill="#d5f36a"/><text x="${X(i).toFixed(1)}" y="62" fill="#9cb09b" font-size="8" text-anchor="middle">S${x.h.season}</text>`).join('')}</svg>`;
   }
   const lines=hist.map(h=>isPitcher
     ?`<div class="career-list-row"><div><b>シーズン${h.season}${h.current?'（進行中）':''}</b></div><strong>${h.outs?(h.runs*27/h.outs).toFixed(2):'—'} · ${h.k||0} 奪三振</strong></div>`
     :`<div class="career-list-row"><div><b>シーズン${h.season}${h.current?'（進行中）':''}</b></div><strong>${h.ab?fmt3(h.h/h.ab):'—'} · ${h.hr||0} 本 · ${h.rbi||0} 打点</strong></div>`).join('');
   return `<h3 class="arcade-section-title">年度別成績</h3>${graph}${lines}`;
 }
 function masteryHTML(p,isPitcher){
   if(!isPitcher||screen!=='pennant'||!league)return '';
   const map=(league.mastery||{})[p.id];if(!map)return '';
   const rows=(p.pitches||[]).filter(id=>map[id]>0).map(id=>{const spec=NightGame.pitchSpec(p,id),v=Math.round(map[id]);return `<div class="career-list-row"><div><b>${spec.name}</b></div><span class="mastery-bar"><i style="width:${v}%"></i></span><strong>${v}</strong></div>`;}).join('');
   if(!rows)return '';
   return `<h3 class="arcade-section-title">球種熟練度</h3><p class="modal-note">投げるほど上がり、その球種の変化と制球が少しずつ良くなります（最大100）。</p>${rows}`;
 }
 function learnPitchHTML(p,isPitcher){
   if(!isPitcher||screen!=='pennant'||!league||game)return '';
   const roster=league.clubRoster(league.clubId),rp=roster?.pitchers.find(x=>x.id===p.id);if(!rp)return '';
   const owned=rp.pitches||[],learned=(league.learnedPitches||{})[p.id]||[],state=(league.pitchLearning||{})[p.id];
   const trained=!!state&&state.round===league.round,options=league.learnablePitches(p.id),chance=Math.round(league.learnChance(p.id)*100);
   const nameOf=id=>NightGame.TYPES.find(t=>t.id===id)?.name||id;
   return `<h3 class="arcade-section-title">新球種トレーニング</h3><p class="modal-note">持ち球 ${owned.length} / ${NightPennant.LEARN_MAX_PITCHES}（${owned.map(nameOf).join('・')}）${learned.length?`<br>習得済み: ${learned.map(nameOf).join('・')}`:''}<br>1節に1回だけ挑戦できます。成功率の目安 ${chance}%（変化球の能力と二軍調整で上昇）。同じ球種に3回失敗すると次は必ず習得できます。</p>${options.length?(trained?'<p class="modal-note">今節はトレーニング済みです。次の節にまた挑戦できます。</p>':options.map(id=>`<button class="league-inline-button" data-learn-pitch="${p.id}" data-learn-type="${id}">${nameOf(id)}を練習</button>`).join(' ')):'<p class="modal-note">持ち球が上限に達しています。</p>'}`;
 }
 // The home directory is a read-only view of the registered team rosters.
 // Keep it independent of the current/previous game and lineup editor settings.
 const directoryGroups=[
  ['CPBL',()=>NightTeams.all],
  ['NPB',()=>NightTeams.npb],
  ['KBO',()=>NightTeams.kbo],
  ['APBC',()=>NightTeams.international]
 ];
 let directoryGroup='CPBL',directoryClub=null,directoryRosterScroll=0,directoryTab='all',directoryQuery='',directorySort='order';
 function directoryTeam(id){
  return directoryGroups.flatMap(([,clubs])=>clubs()||[]).find(c=>c.id===id);
 }
 function directoryTeams(){
  const clubs=directoryGroups.find(([key])=>key===directoryGroup)?.[1]()||[];
  modal(`${modalTitle('','選手名鑑')}<div class="segmented directory-leagues" role="group" aria-label="球団のリーグ">${directoryGroups.map(([key])=>`<button data-directory-group="${key}" class="${key===directoryGroup?'active':''}" aria-pressed="${key===directoryGroup}">${key}</button>`).join('')}</div><div class="team-select-grid directory-teams ui-team-grid">${clubs.map(c=>`<button data-directory-club="${c.id}">${clubBadge(c.id)}<strong>${c.short}</strong><small>${c.batters.length+c.pitchers.length}人</small></button>`).join('')}</div><button class="secondary-button" data-action="close">戻る</button>`,'directory-teams');
  $('modal-content').scrollTop=0;
 }
 function directoryPlayers(club){
  const lineup=NightGame.arrangeLineup(club),ids=new Set(lineup.map(p=>p.id));
  return [...lineup.map(p=>({p,group:'starter'})),...club.batters.filter(p=>!ids.has(p.id)).map(p=>({p,group:'bench'})),...club.pitchers.map(p=>({p,group:'pitcher'}))];
 }
 function filteredDirectory(club){
  const q=directoryQuery.normalize('NFKC').toLowerCase().trim();
  const rows=directoryPlayers(club).filter(({p,group})=>(directoryTab==='all'||directoryTab===group||(directoryTab==='batters'&&group!=='pitcher'))&&(!q||[p.name,p.nativeName,p.no,String(p.no).padStart(2,'0'),p.pos,p.fieldPos].some(v=>String(v??'').normalize('NFKC').toLowerCase().includes(q))));
  if(directorySort==='number')rows.sort((a,b)=>(Number(a.p.no)||0)-(Number(b.p.no)||0));
  if(directorySort==='rating')rows.sort((a,b)=>NightSquad.overall(b.p)-NightSquad.overall(a.p));
  return rows;
 }
 function directoryRowsHTML(club){
  const rows=filteredDirectory(club);
  return rows.length?rows.map(({p,group})=>{
   const pitching=group==='pitcher',grade=NightPlayers.grade(NightSquad.overall(p)),pos=NightSquad.label(p.fieldPos||p.pos);
   const info=pitching?`${p.velocity??'—'} km/h · ${pitchRole(p)}`:`${pos} · ${p.hand==='S'?'両':p.hand==='L'?'左':'右'}打`;
   return `<button class="ui-directory-row" data-directory-player="${uiEscape(p.id)}"><b class="ui-directory-number">${uiEscape(p.no??'—')}</b><span class="ui-directory-name"><strong>${uiEscape(p.name)}</strong><small>${info}</small></span><span class="rank-tile grade-${grade}"><b>${grade}</b></span><span aria-hidden="true">›</span></button>`;
  }).join(''):'<p class="modal-note">該当する選手がいません</p>';
 }
 function refreshDirectoryRows(){
  const club=directoryTeam(directoryClub),list=$('ui-directory-rows');if(club&&list){list.innerHTML=directoryRowsHTML(club);const n=$('ui-directory-count');if(n)n.textContent=filteredDirectory(club).length+'人';}
 }
 function directoryRoster(id,scroll=0){
  const club=directoryTeam(id);if(!club){directoryTeams();return;}
  directoryClub=id;
  const tabs=[['all','全選手'],['starter','スタメン'],['bench','控え'],['pitcher','投手']];
  modal(`${modalTitle('','選手一覧')}<div class="directory-heading">${clubBadge(id)}<div><strong>${club.name}</strong><small>${club.batters.length+club.pitchers.length}人</small></div><button class="league-inline-button" data-action="directory-teams">チーム変更</button></div><div class="segmented ui-directory-tabs">${tabs.map(([k,l])=>`<button data-directory-tab="${k}" class="${directoryTab===k?'active':''}" aria-pressed="${directoryTab===k}">${l}</button>`).join('')}</div><div class="ui-directory-filters"><input id="ui-directory-search" type="search" class="field-select" placeholder="選手名・背番号" aria-label="選手名・背番号" value="${uiEscape(directoryQuery)}"><select id="ui-directory-sort" class="field-select" aria-label="並び替え">${[['order','登録順'],['number','背番号'],['rating','総合能力']].map(([k,l])=>`<option value="${k}" ${directorySort===k?'selected':''}>${l}</option>`).join('')}</select></div><small id="ui-directory-count">${filteredDirectory(club).length}人</small><div id="ui-directory-rows" class="ui-directory-list">${directoryRowsHTML(club)}</div><button class="secondary-button" data-action="directory-teams">チーム選択に戻る</button>`,'directory-roster');
  $('modal-content').scrollTop=scroll;
 }
 function directoryPlayer(id){
  const club=directoryTeam(directoryClub);if(!club)return;
  const all=directoryPlayers(club),p=all.find(x=>x.p.id===id)?.p;if(!p)return;
  if(modalKind==='directory-roster')directoryRosterScroll=$('modal-content').scrollTop;
  const list=filteredDirectory(club),index=list.findIndex(x=>x.p.id===id),prev=index>0?list[index-1].p:null,next=index>=0&&index+1<list.length?list[index+1].p:null;
  const pitching=p.pos==='P',grade=NightPlayers.grade(NightSquad.overall(p));
  modal(`${modalTitle('','選手データ')}<div class="directory-heading">${clubBadge(club.id,true)}<strong>${club.name}</strong><button class="league-inline-button" data-action="directory-roster">選手一覧に戻る</button></div><div class="ui-player-rating"><small>総合能力</small><span class="rank-tile grade-${grade}"><b>${grade}</b></span><strong>${uiEscape(p.name)}</strong></div>${abilityHTML(p,false)}<div class="ui-player-nav"><button class="secondary-button" ${prev?`data-directory-player="${uiEscape(prev.id)}"`:'disabled'}>‹ 前の選手</button><button class="secondary-button" ${next?`data-directory-player="${uiEscape(next.id)}"`:'disabled'}>次の選手 ›</button></div><button class="primary-button" data-action="directory-roster">選手一覧に戻る</button>`,'directory-player');
  $('modal-content').scrollTop=0;
 }
 function rosterModal(selectedId,team='home'){
  if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('roster',[selectedId,team]);return;}
  if(game&&screen==='game')game.paused=true;
  const active=game&&((screen==='game')||(screen==='pennant'&&game.mode==='pennant'&&game.leagueFixtureId===league?.activeFixture?.id));
  const clubs=pregameRoster?{home:lineupConfig('match').club,away:randomConfigFor(settings.matchOpponent)?.club||matchClub(settings.matchOpponent)}:active?game.teams:screen==='pennant'?{home:league.club,away:NightTeams.get(league.activeFixture.home===league.clubId?league.activeFixture.away:league.activeFixture.home)}:{home:NightTeams.get(matchContext==='apbc'?settings.apbcTeam:settings.matchTeam),away:NightTeams.get(matchContext==='apbc'?settings.apbcOpponent:settings.matchOpponent)},club=clubs[team];
  const lineup=pregameRoster?(team==='home'?lineupConfig('match').players:NightGame.arrangeLineup(club)):active?game.lineups[team]:team==='home'?lineupConfig(screen==='pennant'?'league':matchContext==='apbc'?'apbc':'match').players:NightGame.arrangeLineup(club),retired=active?game.removedPlayers[team]:[],bench=club.batters.filter(p=>!lineup.some(b=>b.id===p.id)&&!retired.includes(p.id)),pitchers=club.pitchers;
  const selected=[...lineup,...bench,...pitchers,...club.batters.filter(p=>retired.includes(p.id))].find(p=>p.id===selectedId)||lineup[0];
  const grid=players=>`<div class="player-select-grid">${players.map(p=>playerTile(p,{club,selected:selected.id===p.id,attrs:`data-player="${p.id}" data-team="${team}"`})).join('')}</div>`;
  modal(`${modalTitle('','選手データ')}<div class="segmented"><button data-roster-team="home" class="${team==='home'?'active':''}">${clubs.home.short}</button><button data-roster-team="away" class="${team==='away'?'active':''}">${clubs.away.short}</button></div>${active&&game.isFixture&&team===game.userSide?'<button class="secondary-button" data-action="bench">選手交代へ</button>':!active&&team==='home'?`<button class="secondary-button" data-action="${pregameRoster?'match-lineup':'edit-lineup'}">オーダー編成</button>`:''}<details class="editor-player-detail" ${selectedId?'open':''}><summary>${fittedName(selected.name+'の能力','span','editor-detail-name')}</summary>${abilityHTML(selected,!pregameRoster)}</details>${seasonGraphHTML(selected,pitchers.some(p=>p.id===selected.id))}${masteryHTML(selected,pitchers.some(p=>p.id===selected.id))}${learnPitchHTML(selected,pitchers.some(p=>p.id===selected.id))}<h3 class="arcade-section-title">スタメン</h3>${grid(lineup)}<h3 class="arcade-section-title">控え</h3>${grid(bench)}<h3 class="arcade-section-title">投手</h3>${grid(pitchers)}${retired.length?`<details class="retired-list"><summary>交代済み</summary>${grid(club.batters.filter(p=>retired.includes(p.id)))}</details>`:''}<button class="primary-button" data-action="${pregameRoster?'ui-options-open':'close'}">戻る</button>`,'roster');
 }
 function tacticsModal(){if(!game)return;if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('tactics');return;}game.paused=true;modal(`${modalTitle('GAME PLAN','守備の作戦')}<p>次に打球が飛んだときの野手の初期位置を変えます。</p><div class="segmented">${[['normal','通常','バランス'],['in','前進守備','浅い打球に対応'],['deep','長打警戒','外野を深く']].map(([v,l,d])=>`<button data-defense="${v}" class="${game.defense===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><p class="modal-note">前進守備は頭上を越える打球、長打警戒は浅いヒットに弱くなります。</p><p>打者に合わせたシフト。</p><div class="segmented">${[['none','シフトなし','通常の守備位置'],['pull','引っ張りシフト','引っ張り方向へ寄せる']].map(([v,l,d])=>`<button data-shift="${v}" class="${game.shift===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div><p class="modal-note">シフトは引っ張り方向のゴロに強くなる代わり、逆方向を突かれやすくなります。</p><button class="primary-button" data-action="close">プレイに戻る</button>`,'tactics');}
 function historyModal(){
  if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('history');return;}
  if(!game)return;game.paused=true;const pitches=game.pitchTrace.filter(p=>p.half===game.half&&p.inning===game.inning).slice(-6);
  const map=`<svg class="pitch-map" viewBox="0 0 210 180" aria-label="直近の投球位置"><rect x="45" y="30" width="120" height="120" rx="3" fill="#304a2b" stroke="#b8cc9a66"/><path d="M85 30v120m40-120v120M45 70h120M45 110h120" stroke="#b8cc9a22"/>${pitches.map((p,i)=>`<circle cx="${105+p.x*60}" cy="${90+p.y*60}" r="9" fill="${i===pitches.length-1?'#d5f36a':'#8a9c72'}"/><text x="${105+p.x*60}" y="${93+p.y*60}" fill="#182b15" text-anchor="middle" font-size="9" font-weight="bold">${i+1}</text>`).join('')}</svg>`;
  modal(`${modalTitle('GAME LOG','投球・試合の履歴')}${map}<p class="modal-note">同じイニングの直近6球。明るい色が最新です。</p>${game.log.slice(-20).reverse().map(l=>`<div class="history-item"><small>${l.inning}回${l.half==='top'?'表':'裏'} · ${l.batter}</small><b>${l.speech||l.ja}</b><span> ${l.speech?'':l.sub}</span></div>`).join('')}<button class="secondary-button" data-action="box-score">打撃成績を見る</button><button class="primary-button" data-action="close">戻る</button>`,'history');
 }
 function boxModal(side=game?.userSide||'home'){
  if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('box',[side]);return;}
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
  const fallback=['cheer','chance'].includes(slot)?(musicSelection.club==='world-career'?DEFAULT_CAREER_CHEER:defaultTeamCheer(musicSelection.club,slot==='chance')):null;
  return trackForEvent(settings.music,musicSlots(slot),keys,fallback);
 }
 function musicControls(){
  const {club,person}=musicSelection,settingsMusic=settings.music;
  const available=NightTeams.playable||NightTeams.all;
  const current=available.find(t=>t.id===club)||available[0];
  const people=club==='world-career'?[world.player]:club==='career'?[career.player()]:[...current.batters,...current.pitchers];
  const {key,keys}=musicTarget();
  const option=(value,label,selected)=>`<option value="${htmlText(value)}"${selected?' selected':''}>${htmlText(label)}</option>`;
  const rows=Object.entries(MUSIC_SLOTS).map(([slot,label])=>{
   const tracks=[...PRESETS,...importedTracks],value=settingsMusic.assignments[key]?.[slot]||'';
   if(value&&value!=='off'&&!tracks.some(t=>t.id===value))tracks.push({id:value,name:'保存済みの音源'});
   const resolved=musicTrack(slot,keys);
   const inherited=person?'チームの設定を使う':slot==='chance'?'通常の応援歌を使う':slot==='thirdOut'?'通常の判定曲を使う':
    club==='world-career'?(slot==='cheer'?'所属チームまたは標準の応援歌を使う':'所属チームの設定を使う'):club.startsWith('npb-')&&slot==='cheer'?'標準の太鼓応援を使う':'曲なし';
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
   <button class="secondary-button" data-action="music-back">戻る</button>`;
 }
 function drawMusicMenu(focus){
  if(modalKind!=='music-settings')return;
  const body=$('music-settings-body'),scroll=$('modal-content').scrollTop;
  body.innerHTML=musicControls();$('modal-content').scrollTop=scroll;
  if(focus)$(focus)?.focus({preventScroll:true});
 }
 function musicMenu(fromCareer=null){
  if(screen==='game')return;
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
  if(!window.confirm(localize('この音源を端末から削除しますか？ 他の選手やチームで使っている設定からも外れます。')))return;
  try{
   await songVault.remove(id);ballparkMusic.stop('preview');ballparkMusic.buffers.delete(id);
   for(const entry of Object.values(settings.music.assignments))for(const type of Object.keys(MUSIC_SLOTS))if(entry[type]===id)delete entry[type];
   importedTracks=importedTracks.filter(t=>t.id!==id);save();drawMusicMenu('song-'+slot);
  }catch{toast('音源を削除できませんでした');}
 }
 // v227: environment settings and edit data are separate.  The same
 // persisted keys underpin both settings screens; match rules are never
 // presented as live controls, and online menus contain local controls only.
 function settingsScope(){
  if(screen!=='game'||!game)return 'home';
  return game.onlineGame||game.onlineDerby||game.mirror||onlineMatchActive()?'online':'match';
 }
 const settingsSectionState={home:{},match:{},online:{}};
 let settingsSectionScope='home';
 const settingsIcons={game:'home-ball',controls:'home-target',display:'home-sliders',sound:'home-note',system:'home-gear',speed:'home-clock',running:'home-flag'};
 function settingsSection(id,title,body){
  const open=!!settingsSectionState[settingsSectionScope][id];
  return `<div class="settings-section"><button type="button" class="settings-section-head" data-settings-section="${id}" aria-expanded="${open}"><span class="settings-section-name"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${settingsIcons[id]}"></use></svg><span>${title}</span></span><span class="settings-section-chevron" aria-hidden="true">${open?'▾':'▸'}</span></button><div class="settings-section-body" data-settings-body="${id}"${open?'':' hidden'}>${body}</div></div>`;
 }
 function toggleSettingsSection(b){
  const id=b.dataset.settingsSection,state=settingsSectionState[settingsSectionScope];
  state[id]=!state[id];const open=state[id];
  b.setAttribute('aria-expanded',String(open));const body=b.parentElement?.querySelector('[data-settings-body]');if(body)body.hidden=!open;
  const chevron=b.querySelector('.settings-section-chevron');if(chevron)chevron.textContent=open?'▾':'▸';
 }
 const settingsToggleRow=([v,l,d])=>`<div class="setting-row"><div><strong>${l}</strong><small>${d}</small></div><button class="toggle ${settings[v]?'on':''}" data-toggle="${v}" role="switch" aria-checked="${!!settings[v]}" aria-label="${l}"></button></div>`;
 function settingsControlRows(scope){
  const rows=[['timingGuide','タイミングリング','リングが小さい円に重なったら離す'],['leftHanded','左親指で操作','照準を指の右上に変更'],['assist','到達位置のガイド','変化しなかった場合の到達位置を表示（練習用）'],['showTrace','前の投球位置を表示','次の投球前に確認']];
  // Batting assist changes pitch time in the simulation, not just the HUD.
  if(scope!=='online')rows.splice(1,0,['battingAssist','打撃アシスト','手前のボールを少しゆっくりにする']);
  return rows;
 }
 const settingsAudioRows=[['sound','サウンド','録音の打球・捕球音と観客の歓声'],['timingSound','離すタイミングの合図','音と対応端末の短い振動'],['vibration','振動','ミートした手応え'],['tts','実況の音声読み上げ','打席の結果を端末の音声合成で読み上げる'],['audioCues','音響ガイド','判定（ストライク／ボール）と打球結果を音の高さとパターンで知らせる。審判モードでは自分のコール後にだけ鳴る']];
 function settingsToggleAllowed(key,scope){
  return settingsControlRows(scope).some(row=>row[0]===key)||settingsAudioRows.some(row=>row[0]===key)||scope==='home'&&key==='tiebreak';
 }
 function musicVolumeControls(){
  return [['cheer','応援歌'],['results','結果曲'],['overlap','相手の応援と重なるとき']].map(([id,label])=>`<div class="setting-slider"><label for="music-${id}">${label}<output id="music-${id}-value">${settings.music[id]}%</output></label><input id="music-${id}" data-music-volume="${id}" type="range" min="0" max="100" value="${settings.music[id]}"></div>`).join('');
 }
 function settingsModal(){
  const scope=settingsScope(),inGame=scope!=='home';
  if(inGame&&onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('settings');return;}
  if(inGame&&(game.phase==='ended'||game.phase==='derby-break'||['derby-result','career-result'].includes(modalKind)))return;
  if(inGame)game.paused=true;
  settingsSectionScope=scope;
  const activeCareer=career&&!worldActive&&((inGame&&game.career)||screen==='career');
  const manual=inGame?game.manualRunning:activeCareer?career.manualRunning:settings.manualRunning;
  const scaleOptions=[['hudScale','スコア・選手情報'],['controlsScale','操作ボタン']].map(([id,label])=>`<div class="setting-slider"><label for="${id}">${label} <output id="${id}-output">${settings[id]}%</output></label><input id="${id}" data-ui-scale="${id}" type="range" min="75" max="120" step="5" value="${settings[id]}"></div>`).join('');
  const controls=`<div id="thumb-preview-wrap">${thumbPreview()}</div><div class="setting-slider"><label for="cursor-shift">指から横への距離 <output id="shift-output">${settings.cursorShift}px</output></label><input id="cursor-shift" type="range" min="0" max="140" step="4" value="${settings.cursorShift}"></div><div class="setting-slider"><label for="cursor-lift">指から上への距離 <output id="lift-output">${settings.cursorLift}px</output></label><input id="cursor-lift" type="range" min="0" max="160" step="4" value="${settings.cursorLift}"></div>${settingsControlRows(scope).map(settingsToggleRow).join('')}`;
  const display=`<section class="hud-settings"><h3 class="setting-label">試合画面のサイズ</h3>${scaleOptions}</section>`;
  const audio=`${settingsAudioRows.map(settingsToggleRow).join('')}<div class="audio-settings"><div class="setting-label">音量</div><div class="setting-slider"><label for="sound-volume">全体音量 <output id="sound-volume-output">${settings.soundVolume}%</output></label><input id="sound-volume" type="range" min="0" max="100" step="1" value="${settings.soundVolume}"></div><div class="setting-slider"><label for="crowd-volume">観客・歓声 <output id="crowd-volume-output">${settings.crowdVolume}%</output></label><input id="crowd-volume" type="range" min="0" max="100" step="1" value="${settings.crowdVolume}"></div>${musicVolumeControls()}${inGame?'':`<div class="audio-preview-buttons"><button data-audio-test="perfect">打球音を試す</button><button data-audio-test="catch">捕球音を試す</button><button data-audio-test="homer">歓声を試す</button></div><details class="audio-credits"><summary>サウンド素材</summary><p>録音：martinimeniscus（打球・捕球）、eeease（球場環境）、benfree（歓声）、soundpost（スイッシュ）。CC0 1.0。編集・音量調整済み。</p><a href="./assets/audio/credits.json" target="_blank" rel="noopener">素材の出典・ライセンス一覧 ↗</a></details>`}</div>`;
  const running=`<div class="setting-label">${activeCareer?'キャリアの走塁':'走塁モード'}</div><div class="segmented">${[[false,'自動','状況に合わせて進塁'],[true,'手動',activeCareer?'自分の走者を操作':'走者を塁方向へスワイプ']].map(([value,label,sub])=>`<button data-running-mode="${value?'manual':'auto'}" class="${manual===value?'active':''}">${label}<small>${sub}</small></button>`).join('')}</div><p class="modal-note">${activeCareer?'手動では、自分が打った直後の打者走者に進塁・帰塁を指示します。味方走者は自動です。':'手動では走者を塁方向へスワイプします。'} ${inGame?'プレー中の切り替えは次の投球前に行えます。':''}</p>`;
  const speed=`<div class="setting-label">打球後の速度</div><div class="segmented">${[1,2].map(n=>`<button data-field-speed="${n}" class="${(inGame?game.fieldSpeed:settings.fieldSpeed)===n?'active':''}">×${n}<small>${n===1?'通常':'2倍速'}</small></button>`).join('')}</div>`;
  const gameDefaults=`${lightingField()}${settingsToggleRow(['tiebreak','延長タイブレーク','同点の延長は無死二塁から（最大3回まで）'])}<div class="setting-label">難易度（次のプレイから）</div><div class="segmented">${[['casual','カジュアル'],['standard','標準'],['pro','プロ']].map(([v,l])=>`<button data-difficulty="${v}" class="${settings.difficulty===v?'active':''}">${l}</button>`).join('')}</div><div class="setting-label">CPUの強さ（カスタム）</div>${[['bat','CPU打撃','打者の読みとタイミング'],['pitch','CPU投球','球速と変化のキレ'],['field','CPU守備','守備範囲と送球'],['run','CPU走塁','進塁の積極性と盗塁']].map(([k,l,d])=>`<div class="setting-slider"><label for="cd-${k}">${l}（${d}） <output id="cd-${k}-output">${settings.customDifficulty[k]>0?'+':''}${settings.customDifficulty[k]}</output></label><input id="cd-${k}" data-custom-diff="${k}" type="range" min="-10" max="10" step="1" value="${settings.customDifficulty[k]}"></div>`).join('')}<p class="modal-note">難易度プリセットに上乗せされます。0で無効、+でCPUが強く、−で弱くなります。</p><div class="setting-label">ペナントの故障発生</div><div class="segmented">${[['off','なし','故障は発生しない'],['low','少なめ','たまに離脱'],['normal','ふつう','現実的な頻度']].map(([v,l,d])=>`<button data-injury-rate="${v}" class="${(settings.injuries||'normal')===v?'active':''}">${l}<small>${d}</small></button>`).join('')}</div>${speed}`;
  const system=`<div class="setup-section"><label for="game-language">表示言語</label><select id="game-language" class="field-select" data-no-localize>${[['ja','日本語'],['zh-TW','台灣華語（繁體中文）'],['ko','한국어']].map(([code,label])=>`<option value="${code}" lang="${code}"${settings.language===code?' selected':''}>${label}</option>`).join('')}</select></div><button class="secondary-button" data-action="fullscreen">全画面でプレイ</button><button class="secondary-button" data-action="install">ホーム画面への追加方法</button><div class="setting-label">セーブデータ</div><button class="secondary-button" data-action="backup-export">データを書き出す（JSON）</button><button class="secondary-button" data-action="backup-import">データを読み込む</button><p class="modal-note">記録・ペナント・キャリアなど、この端末に保存された全データを1ファイルにまとめます。読み込むと現在のデータに上書きされます。</p>`;
  const sections=inGame?[
   ['controls','操作',controls],['display','画面表示',display],['sound','サウンド',audio],
   ...(scope==='match'?[['speed','プレイ速度',speed],['running','走塁方式',running]]:[])
  ]:[
   ['game','ゲーム',gameDefaults],['controls','操作',controls+running],['display','画面表示',display],['sound','サウンド',audio],['system','システム',system]
  ];
  modal(`${modalTitle('',inGame?'試合中設定':'設定')}<div class="settings-page" data-settings-scope="${scope}">${sections.map(row=>settingsSection(...row)).join('')}</div><button class="primary-button" data-action="close">${inGame?'試合に戻る':'OK'}</button>`,'settings');
 }
 // The edit hub owns just the entry/return navigation, never the edit data.
 let editHubChild='',leagueEditorFromHub=false;
 function editHubModal(){
  if(screen!=='home')return;
  editHubChild='';
  const tiles=[['team','home-people','チーム編成'],['uniform','home-shirt','ユニフォーム'],['stadium','home-target','球場エディタ'],['league','home-trophy','リーグエディタ'],['music','home-note','応援歌・結果曲']];
  modal(`${modalTitle('','エディットモード')}<div class="edit-hub-grid">${tiles.map(([id,icon,label])=>`<button type="button" class="edit-hub-tile" data-action="edit-hub-open" data-editor="${id}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${icon}"></use></svg><strong>${label}</strong><span aria-hidden="true">›</span></button>`).join('')}</div>`,'edit-hub');
 }
 function openEditHubChild(kind){
  if(screen!=='home'||modalKind!=='edit-hub'||!['team','uniform','stadium','league','music'].includes(kind))return;
  editHubChild=kind;
  if(kind==='team')lineupModal('edit');
  else if(kind==='uniform')uniformModal();
  else if(kind==='stadium')stadiumEditorModal();
  else if(kind==='league')editLeagueList();
  else musicMenu();
 }
 function returnFromEditModal(){
  if(screen!=='home'||!editHubChild||!['lineup','uniform','stadium-editor','stadium-delete-confirm','edit-leagues','music-settings'].includes(modalKind))return false;
  editHubModal();return true;
 }
 function editLeagueList(){
  if(screen!=='home'||editHubChild!=='league')return;
  const custom=NightLeague.list();
  modal(`${modalTitle('','リーグエディタ')}<button class="primary-button" data-action="edit-league-new">＋ カスタムリーグを作成</button><div class="edit-league-list">${custom.map(def=>`<div class="edit-league-row"><button class="secondary-button" data-action="edit-league-existing" data-league-id="${uiEscape(def.id)}">${uiEscape(def.name)} <small>${def.clubIds.length}球団</small></button><button class="edit-league-delete" data-action="edit-league-remove" data-league-id="${uiEscape(def.id)}">削除</button></div>`).join('')}</div><button class="secondary-button" data-action="close">戻る</button>`,'edit-leagues');
 }
 function returnToEditLeagues(){
  leagueEditorFromHub=false;home();editHubChild='league';editLeagueList();
 }
 function howto(){
  if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('howto');return;}
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
 function recordModal(section){
   const unlockedMap=records.achievements||{};
   const derived={firstHit:records.hits>0,firstHr:records.hr>0,firstWin:records.wins>0,distance130:records.maxDistance>=130,derby5:records.bestTimedDerby>=5,grandSlam:!!records.grandSlam,games50:records.games>=50,streak5:(records.bestStreak||0)>=5,streak10:(records.bestStreak||0)>=10};
   const achievements=ACHIEVEMENTS.map(([id,icon,title,desc])=>{const ok=!!unlockedMap[id]||!!derived[id];const date=unlockedMap[id]?new Date(unlockedMap[id]).toLocaleDateString('ja-JP'):'';return [ok,icon,title,desc+(date?'（'+date+'）':'')];});
   const achievementTiles=achievements.map(([ok,icon,title,desc])=>`<div class="achievement ${ok?'unlocked':''}"><span>${icon}</span><div><strong>${title}</strong><small>${desc}</small></div><i>${ok?'獲得':'未獲得'}</i></div>`).join('');
   if(section==='trophies'){
    modal(`${modalTitle('','トロフィー')}${achievementTiles}<button class="primary-button" data-action="close">閉じる</button>`,'trophies');
    return;
   }
   modal(`${modalTitle('YOUR BASEBALL STORY','プレイ記録')}<div class="stats-grid">${[[records.maxDistance,'m','最長飛距離'],[records.hr,'本','通算ホームラン'],[records.wins,'勝','対戦勝利数'],[records.bestTimedDerby,'/ 10','ダービー最高記録']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><span class="eyebrow">ACHIEVEMENTS</span>${achievementTiles}<p class="modal-note">対戦 ${records.games}試合 / ${records.wins}勝 ${records.draws}分 / 通算 ${records.hits}安打<br>プレイを終了すると記録に反映されます。</p><button class="secondary-button" data-action="record-room">通算戦績ダッシュボード（記録室）を見る</button><button class="secondary-button" data-action="totals">選手通算成績（全モード）を見る</button>${records.practicePitches||records.practiceThrown?`<span class="eyebrow">PRACTICE</span><div class="stats-grid">${[[records.practiceHits,'安打','打撃練習 通算安打'],[records.practiceHr,'本','打撃練習 本塁打'],[records.practiceMaxDistance,'m','打撃練習 最長飛距離'],[records.practiceKs,'K','投球練習 奪三振']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><p class="modal-note">打撃練習 ${records.practicePitches}球 / 投球練習 ${records.practiceThrown}球</p>`:''}<button class="primary-button" data-action="close">閉じる</button>`, 'records');
 }
 function canSimulateWorldRemainder(g){
  return !!g?.worldFixture&&!!g.career?.continuous&&
   (['intro','career-ready','aim','change'].includes(g.phase)||g.phase==='windup'&&!g.pitch?.delivered);
 }
 function canSwitchWorldBatting(g){
  return !!g?.worldFixture&&g.worldFixture===world?.active?.id&&!world.pitching&&g.canSwitchWorldBatting(world.player.id);
 }
 function pause(){if(review.playback){stopReplay();return;}if(onlineMatchActive()&&!onlineOwnsMenu()){onlineRequestMenu('pause');return;}if(game?.phase==='career-pregame'){navPop=true;careerDashboard();navPop=false;return;}if(!game||['ended','derby-break'].includes(game.phase))return;game.paused=true;try{checkpoint();}catch{}modal(`${modalTitle('TIME OUT','ひと休み。',false)}<div class="match-summary"><span>${game.derby?game.derby.label:`${game.inning}回${game.half==='top'?'表':'裏'} / ${game.loadedStart?'毎回2アウト満塁':game.totalInnings+'回制'}`}</span><span>${game.derby?game.derby.turnHR+' 本':`${game.teams.away.short} ${game.awayScore} - ${game.homeScore} ${game.teams.home.short}`}</span></div><button class="primary-button" data-action="close">プレイを再開</button>${canSwitchWorldBatting(game)?'<button class="secondary-button" data-action="world-batting-only">自分の打席だけに切り替え</button>':''}${canSimulateWorldRemainder(game)?'<button class="secondary-button" data-action="world-finish-auto">残りを自動進行</button>':''}${game.isFixture&&!game.onlineGame&&!game.umpireMode&&!game.career&&!game.worldFixture&&!game.apbcFixtureId?(game.fastForward||game.spectate?'<button class="secondary-button" data-action="auto-off">自動進行を止めて操作に戻る</button>':'<button class="secondary-button" data-action="fast-forward">残りを自動で高速進行</button>'):''}<button class="secondary-button" data-action="settings">試合中設定</button><button class="secondary-button" data-action="howto">遊び方</button>${game.isFixture&&!game.umpireMode?'<button class="secondary-button" data-action="bench">選手交代・ベンチ</button>':''}<button class="secondary-button" data-action="roster">選手・打順</button><button class="secondary-button" data-action="history">投球履歴・成績</button>${game.inMatch&&!game.umpireMode?'<button class="secondary-button" data-action="tactics">守備の作戦</button>':''}${['practice','pitching'].includes(game.mode)?'<button class="secondary-button" data-action="practice-options">練習設定</button>':''}<button class="secondary-button" data-action="leave">${game.career||game.worldFixture?'保存してキャリアへ':game.apbcFixtureId?'保存して大会へ':game.mode==='pennant'?'保存してペナントへ': ['practice','pitching'].includes(game.mode)?'練習を終えて結果を見る':'中断してホームへ'}</button>${game.onlineGame||game.mode==='pennant'||game.apbcFixtureId||game.career||game.worldFixture?'':'<button class="secondary-button danger-button" data-action="restart">最初からやり直す</button>'}`,'pause');}
 function umpireSetup(){
  modal(`${modalTitle('UMPIRE MODE','審判モード')}<div class="umpire-howto"><p>両チーム自動の試合を、主審として裁くモードです。あなたの判定が、そのままコールとして試合に反映されます。</p><ul><li>見送られた投球ごとに、ボール／ストライクを判定します。</li><li>投球中はストライクゾーンが表示されません。ボールの行方だけを目で追って判定してください。</li><li>判定後にゾーンと実際の通過位置が表示され、答え合わせができます。</li><li>接戦の塁プレーでは、セーフ／アウトの判定も求められます。</li></ul><table class="umpire-points"><caption>得点（正解したときだけ入ります）</caption><tbody><tr><th>投球判定</th><td>ゾーンの縁から1インチ以内の際どい球：50点／2インチ以内：35点／3インチ以内：25点／5インチ以内：15点／それ以外：10点</td></tr><tr><th>塁上判定</th><td>セーフ／アウト正解で30点</td></tr></tbody></table><p class="modal-note">試合の長さは対戦設定のイニング数（現在 ${settings.innings} イニング）、対戦カードと球場も対戦設定に準じます。</p></div><button class="primary-button" data-action="umpire-start">審判として開始</button><button class="secondary-button" data-action="close">戻る</button>`,'umpire-setup');
 }
 function setupTimeAttack(){
  const best=NightTimeAttack.loadBest(),kind=settings.taKind==='pitch'?'pitch':'bat',secs=NightTimeAttack.DURATIONS.includes(settings.taSeconds)?settings.taSeconds:90;
  const own=NightTeams.get(settings.matchTeam),opp=NightTeams.get(settings.matchOpponent),park=NightPlayers.parks.find(p=>p.id===settings.park);
  modal(`${modalTitle('TIME ATTACK','タイムアタック')}<p class="modal-note">制限時間のあいだ同じ役割が続く短時間モードです。3アウトでも時間内は次のセットが始まります。球団・球場は対戦設定を使います（${own?own.short:''} vs ${opp?opp.short:''} / ${park?park.name:''}）。</p><div class="setup-section"><label>種別</label><div class="segmented">${[['bat','攻撃編','時間内に何点取れるか'],['pitch','守備編','時間内に何アウト取れるか']].map(([v,l,d])=>`<button data-ta-kind="${v}" class="${kind===v?'active':''}" aria-pressed="${kind===v}">${l}<small>${d}</small></button>`).join('')}</div></div><div class="setup-section"><label>制限時間</label><div class="segmented">${NightTimeAttack.DURATIONS.map(n=>`<button data-ta-seconds="${n}" class="${secs===n?'active':''}" aria-pressed="${secs===n}">${n}秒</button>`).join('')}</div></div><div class="derby-record"><span>攻撃編ベスト <b>${best.bat} 点</b></span><span>守備編ベスト <b>${best.pitch} アウト</b></span></div><button class="primary-button" data-action="ta-start">スタート</button><button class="secondary-button" data-action="close">戻る</button>`,'timeattack-setup');
 }
 function updateTimeAttackClock(g){
  const clock=$('ta-clock');if(!clock||!g.timeAttack)return;
  const seconds=Math.ceil(g.timeAttack.remaining/1000);clock.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 }
 function finishTimeAttackResult(g){
  const r=g.timeAttack.result||{kind:g.timeAttack.kind,runs:0,hits:0,hr:0,outs:0,allowed:0,ks:0,halves:0};
  const rec=NightTimeAttack.recordBest(r.kind,NightTimeAttack.scoreOf(r));
  commit(g);checkAchievements(g);$('swing').disabled=true;
  const stats=r.kind==='bat'?[[r.runs,'得点'],[r.hits,'安打'],[r.hr,'本塁打']]:[[r.outs,'アウト'],[r.ks,'奪三振'],[r.allowed,'失点']];
  modal(`${modalTitle('TIME UP','タイムアタック結果',false)}<div class="result-stats">${stats.map(([n,l])=>`<div><strong>${n}</strong><span>${l}</span></div>`).join('')}</div>${rec.updated?'<div class="new-best">ベストスコア更新！</div>':''}<p class="modal-note">${r.kind==='bat'?'攻撃編':'守備編'} ベスト: ${r.kind==='bat'?rec.best.bat+' 点':rec.best.pitch+' アウト'}（制限時間 ${g.timeAttack.seconds} 秒 / ${r.halves+1} セット）</p><button class="primary-button" data-action="ta-restart">もう一度挑戦</button><button class="secondary-button" data-action="timeattack">設定を変える</button><button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
 }
 function survivalSetup(){
  const best=NightSurvival.loadBest(),run=NightSurvival.loadRun();
  const own=NightTeams.get(settings.matchTeam),park=NightPlayers.parks.find(p=>p.id===settings.park);
  if(run&&run.status==='active'){
   const opp=NightTeams.get(run.opponentId),stage=NightSurvival.stageForWins(run.wins);
   const tiredP=Object.keys(run.fatiguePitchers).length,tiredB=Object.keys(run.fatigueBatters).length;
   modal(`${modalTitle('SURVIVAL LADDER','勝ち抜きサバイバル')}<p class="modal-note">現在 <b>${run.wins} 連勝中</b>（ステージ ${stage.stage} / 相手補正 ${stage.boost>0?'+':''}${stage.boost}）。次の相手は ${opp?opp.name:run.opponentId} です。疲労の持ち越し: 投手 ${tiredP} 名 / 野手 ${tiredB} 名。負けるか引き分け（引き分けは敗北扱い）で終了します。</p><div class="derby-record"><span>ベスト記録 <b>${best} 連勝</b></span></div><button class="primary-button" data-action="survival-next">次の試合へ（${run.wins+1} 戦目）</button><button class="secondary-button" data-action="survival-new">最初からやり直す</button><button class="secondary-button" data-action="close">戻る</button>`,'survival-setup');
   return;
  }
  modal(`${modalTitle('SURVIVAL LADDER','勝ち抜きサバイバル')}<p class="modal-note">連勝を重ねるほど相手が段階的に強くなるエンドレスモードです。自球団は対戦設定の球団（${own?own.name:''}）、球場は ${park?park.name:''} を使います。相手はランダムで、勝つと次の相手へ進みます。投手のスタミナ消耗と選手の疲労は次試合へ持ち越され、試合間に少しだけ回復します。負けるか引き分け（引き分けは敗北扱い）で終了です。進行は自動で保存されます。</p><div class="derby-record"><span>ベスト記録 <b>${best} 連勝</b></span></div><button class="primary-button" data-action="survival-new">サバイバル開始</button><button class="secondary-button" data-action="close">戻る</button>`,'survival-setup');
 }
 function startSurvivalRun(){
  const pool=(NightTeams.matchTeams||NightTeams.all).map(c=>c.id);
  const run=NightSurvival.createRun(settings.matchTeam,pool);
  if(!run){toast('相手球団を決められませんでした');return;}
  NightSurvival.saveRun(run);
  pendingSurvival=true;save();start('match');
 }
 function finishSurvivalResult(g){
  const run=NightSurvival.loadRun();
  commit(g);checkAchievements(g);$('swing').disabled=true;
  if(!run||run.status!=='active'){modal(`${modalTitle('SURVIVAL','勝ち抜きサバイバル結果',false)}<p class="modal-note">進行中の記録が見つかりませんでした。ベスト記録は ${NightSurvival.loadBest()} 連勝です。</p><button class="primary-button" data-action="home">ホームへ戻る</button>`,'result');return;}
  const usage={pitchers:{},batters:{}};
  const userClub=g.teams[g.userSide];
  for(const pl of userClub.pitchers){const rec=g.pitchingStats[pl.id];if(rec&&rec.pitches)usage.pitchers[pl.id]=rec.pitches;}
  for(const pl of userClub.batters){const rec=g.box[pl.id];if(rec&&rec.pa)usage.batters[pl.id]=rec.pa;}
  const won=g.userScore>g.opponentScore,draw=g.homeScore===g.awayScore;
  const res=NightSurvival.recordResult(run,{won,draw,usage,poolIds:(NightTeams.matchTeams||NightTeams.all).map(c=>c.id)});
  const score=`${g.teams.away.short} ${g.awayScore} - ${g.homeScore} ${g.teams.home.short}`;
  if(res&&!res.ended){
   const next=NightTeams.get(res.state.opponentId),stage=NightSurvival.stageForWins(res.state.wins);
   modal(`${modalTitle('SURVIVAL WIN','勝ち抜きサバイバル',false)}<div class="result-stats"><div><strong>${res.state.wins}</strong><span>連勝</span></div><div><strong>${stage.stage}</strong><span>次のステージ</span></div><div><strong>${stage.boost>0?'+':''}${stage.boost}</strong><span>次の相手補正</span></div></div><p class="modal-note">${score} で勝利。次の相手は ${next?next.name:res.state.opponentId}。疲労は少し回復して持ち越されます。ベスト記録 ${res.best} 連勝。</p><button class="primary-button" data-action="survival-next">次の試合へ</button><button class="secondary-button" data-action="home">中断してホームへ（進行は保存済み）</button>`,'result');
  }else{
   modal(`${modalTitle('SURVIVAL END','勝ち抜きサバイバル終了',false)}<div class="result-stats"><div><strong>${run.wins}</strong><span>連勝で終了</span></div><div><strong>${res?res.best:run.wins}</strong><span>ベスト記録</span></div></div>${res&&res.bestUpdated?'<div class="new-best">ベスト記録更新！</div>':''}<p class="modal-note">${score}（${draw?'引き分けは敗北扱いです':'敗戦'}）。おつかれさまでした。</p><button class="primary-button" data-action="survival">もう一度挑戦</button><button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
  }
 }
 function conquestSetup(){
 const C=NightConquest,clubs=NightTeams.matchTeams;
 if(!conquestUser||!clubs.some(c=>c.id===conquestUser))conquestUser=settings.matchTeam;
 let progress=NightConquest.loadProgress(conquestUser);
 if(!progress){progress=C.createProgress(conquestUser);C.saveProgress(progress);}
 const own=clubs.find(c=>c.id===conquestUser),sum=C.summarize(progress,clubs);
 const beaten=new Set(progress.defeated);
 const groups=C.LEAGUES.map(l=>{
  const list=clubs.filter(c=>c.id!==conquestUser&&C.leagueOf(c)===l.id);
  const row=sum.byLeague.find(r=>r.id===l.id);
  return `<h3 class="arcade-section-title">${l.label} ${row.done}/${row.total}</h3><div class="draft-roster">${list.map(c=>beaten.has(c.id)?`<span>🏆 ${c.short} 制覇</span>`:`<button data-conquest-opp="${c.id}" class="draft-candidate"><b>${c.short}</b><small>${c.name} と対戦</small></button>`).join('')}</div>`;
 }).join('');
 modal(`${modalTitle('ALL-LEAGUES CONQUEST','全球団制覇チャレンジ')}<p class="modal-note">自球団を1つ選び、残り29球団を好きな順番で倒していく長期チャレンジです。勝った相手には制覇マークが付き、負けても進行は消えません（何度でも再挑戦できます）。対戦は通常対戦フロー（対戦設定のイニング数・球場）で行います。進行は自球団ごとに自動保存されます。</p>${sum.complete?'<div class="champion-banner"><span>ALL-LEAGUES CONQUEST</span><strong>🏆 全球団制覇達成！</strong><p>'+(own?own.name:conquestUser)+' で全29球団を制覇しました。おめでとうございます！</p></div>':`<div class="derby-record"><span>制覇 <b>${sum.done} / ${sum.total}</b> 球団</span><span>${sum.byLeague.map(r=>`${r.label} ${r.done}/${r.total}`).join(' ・ ')}</span></div>`}<div class="setup-section"><label>自球団（選ぶとその球団の進行を表示）</label><div class="draft-roster">${clubs.map(c=>`<button data-conquest-user="${c.id}" class="draft-candidate ${c.id===conquestUser?'selected':''}"><b>${c.short}</b></button>`).join('')}</div></div>${groups}<button class="secondary-button" data-action="conquest-reset">この球団の進行をリセット</button><button class="secondary-button" data-action="close">戻る</button>`,'conquest-setup');
}
function startConquestMatch(opponentId){
 const C=NightConquest,clubs=NightTeams.matchTeams;
 if(!conquestUser||!clubs.some(c=>c.id===conquestUser))conquestUser=settings.matchTeam;
 if(!clubs.some(c=>c.id===opponentId)||opponentId===conquestUser){toast('対戦相手を選んでください');return;}
 let progress=C.loadProgress(conquestUser);
 if(!progress){progress=C.createProgress(conquestUser);C.saveProgress(progress);}
 if(progress.defeated.includes(opponentId)){toast('その球団は制覇済みです');conquestSetup();return;}
 settings.matchTeam=conquestUser;settings.matchOpponent=opponentId;
 conquestCtx={userTeamId:conquestUser,opponentId};
 pendingConquest=true;save();start('match');
}
function finishConquestResult(g){
 const C=NightConquest,ctx=g.conquest,clubs=NightTeams.matchTeams;
 commit(g);checkAchievements(g);$('swing').disabled=true;
 const score=`${g.teams.away.short} ${g.awayScore} - ${g.homeScore} ${g.teams.home.short}`;
 let progress=C.loadProgress(ctx.userTeamId);
 if(!progress){progress=C.createProgress(ctx.userTeamId);}
 const won=g.userScore>g.opponentScore,draw=g.homeScore===g.awayScore;
 const res=NightConquest.recordResult(progress,{opponentId:ctx.opponentId,won,draw},clubs);
 const opp=clubs.find(c=>c.id===ctx.opponentId);
 if(res&&res.completedNow){
  sound('win');
  modal(`${modalTitle('CONQUEST COMPLETE','🏆 全球団制覇達成！',false)}<div class="result-stats"><div><strong>${res.done}</strong><span>制覇球団</span></div><div><strong>${res.total}</strong><span>全相手</span></div></div><p class="modal-note">${score} で ${opp?opp.name:ctx.opponentId} を倒し、全29球団の制覇が完了しました。おめでとうございます！</p><button class="primary-button" data-action="conquest">制覇一覧を見る</button><button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
 }else if(res&&res.conqueredNow){
  sound('win');
  modal(`${modalTitle('CONQUERED','制覇！',false)}<div class="result-stats"><div><strong>${res.done}</strong><span>制覇球団</span></div><div><strong>${res.remaining}</strong><span>残り</span></div></div><p class="modal-note">${score} で勝利し、${opp?opp.name:ctx.opponentId} に制覇マークが付きました（${res.byLeague.map(r=>`${r.label} ${r.done}/${r.total}`).join(' ・ ')}）。</p><button class="primary-button" data-action="conquest">制覇一覧へ（次の相手を選ぶ）</button><button class="secondary-button" data-action="home">中断してホームへ（進行は保存済み）</button>`,'result');
 }else{
  modal(`${modalTitle('NO CONQUEST','制覇ならず',false)}<div class="result-stats"><div><strong>${res?res.done:progress.defeated.length}</strong><span>制覇球団</span></div></div><p class="modal-note">${score}（${draw?'引き分けでは制覇になりません':'敗戦'}）。制覇状況は消えていません。同じ相手に何度でも再挑戦できます。</p><button class="primary-button" data-conquest-opp="${ctx.opponentId}">同じ相手に再挑戦</button><button class="secondary-button" data-action="conquest">制覇一覧へ</button><button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');
 }
}
function draftSetup(){
 const own=NightTeams.get(settings.matchTeam),opp=NightTeams.get(settings.matchOpponent),park=NightPlayers.parks.find(p=>p.id===settings.park);
 modal(`${modalTitle('DRAFT BATTLE','ドラフト対決')}<p class="modal-note">全30球団（CPBL / NPB / KBO）の全選手プールから、あなたとCPUが交互に指名してチームを編成し、そのまま対戦する短期モードです。指名は蛇行方式（1巡目はあなた→CPU、2巡目はCPU→あなた…）で全${NightDraftBattle.ROUNDS}巡・各${NightDraftBattle.PICKS_PER_SIDE}名（スタメン野手9＋控え3＋投手5）。編成はこのモード専用で、保存済みオーダーには影響しません。自チームの看板は対戦設定の球団（${own?own.name:''}）、CPUは ${opp?opp.name:''}、球場は ${park?park.name:''} を使います。</p><button class="primary-button" data-action="draft-start">ドラフト開始</button><button class="secondary-button" data-action="close">戻る</button>`,'draft-setup');
}
function startDraftBattle(){
 draftOrigin=new Map();
 for(const c of NightTeams.matchTeams)for(const p of [...c.batters,...c.pitchers])draftOrigin.set(p.id,c.short);
 draftState=NightDraftBattle.createDraft(NightTeams.matchTeams,(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
 draftFilter='ALL';
 draftRender();
}
function draftRosterHtml(side,label){
 const D=NightDraftBattle,st=draftState,s=st.sides[side],g=D.guideFor(st,side);
 const posOf=new Map(Object.entries(g.fielding).map(([pos,id])=>[id,pos]));
 const rows=s.batters.map(p=>`<span>${posOf.get(p.id)||'控'} ${p.name}</span>`).join('')+s.pitchers.map(p=>`<span>投 ${p.name}</span>`).join('');
 return `<div class="setup-section"><label>${label}（${s.batters.length+s.pitchers.length}/${D.PICKS_PER_SIDE}名）</label><div class="draft-roster">${rows||'<span>まだ指名なし</span>'}</div></div>`;
}
function draftRender(){
 const D=NightDraftBattle,st=draftState;
 if(!st){draftSetup();return;}
 while(D.currentSide(st)==='cpu'){if(!D.cpuPick(st))break;}
 if(D.isComplete(st)){draftCompleteRender();return;}
 const guide=D.guideFor(st,'user');
 const round=Math.floor(st.picks.length/2)+1;
 const seq=D.pickSequence(),nextSides=seq.slice(st.picks.length,st.picks.length+4).map(s=>s==='user'?'あなた':'CPU').join(' → ');
 const avail=D.available(st);
 let cands;
 if(draftFilter==='P')cands=avail.pitchers.map(p=>({p,score:D.scoreCandidate(st,'user',p,()=>0.5)}));
 else if(draftFilter==='ALL')cands=[...avail.batters,...avail.pitchers].map(p=>({p,score:D.scoreCandidate(st,'user',p,()=>0.5)}));
 else cands=avail.batters.filter(p=>D.eligible(p,draftFilter)).map(p=>({p,score:D.scoreCandidate(st,'user',p,()=>0.5)}));
 cands=cands.filter(c=>c.score!==null).sort((a,b)=>b.score-a.score).slice(0,30);
 const filters=['ALL',...D.FIELD_POSITIONS,'P'];
 const candHtml=cands.map(({p})=>`<button data-draft-pick="${p.id}" class="draft-candidate"><b>${p.pos} ${p.name}</b><small>${draftOrigin.get(p.id)||''} · ${p.pos==='P'?`球速${p.velocity} 制球${p.control} スタ${p.stamina}`:`ミート${p.contact} パワー${p.power} 走${p.run} 守${p.field}`}</small></button>`).join('');
 modal(`${modalTitle('DRAFT BATTLE',`ドラフト対決 第${round}巡目`)}<p class="modal-note">あなたの指名です（指名順: ${nextSides}…／蛇行方式）。<br>ガイド: 不足ポジション <b>${guide.positionsNeeded.length?guide.positionsNeeded.join('・'):'なし'}</b> ／ 投手あと <b>${guide.pitchersNeeded}</b> 名 ／ 野手あと <b>${guide.battersNeeded}</b> 名（控え含む）。不足ポジションが埋まらなくなる指名は選べません。</p><div class="segmented draft-filters">${filters.map(f=>`<button data-draft-filter="${f}" class="${draftFilter===f?'active':''}" aria-pressed="${draftFilter===f}">${f==='ALL'?'全員':f==='P'?'投手':f}</button>`).join('')}</div><div class="draft-candidates">${candHtml||'<p class="modal-note">候補がいません。フィルターを変えてください。</p>'}</div>${draftRosterHtml('user','あなたの編成')}${draftRosterHtml('cpu','CPUの編成')}<button class="secondary-button" data-action="draft-auto">自動補完して完了する</button><button class="secondary-button" data-action="draft-quit">ドラフトをやめる</button>`,'draft-battle');
}
function draftCompleteRender(){
 const D=NightDraftBattle,st=draftState;
 modal(`${modalTitle('DRAFT COMPLETE','ドラフト完了')}<p class="modal-note">両チームの編成がそろいました。このまま通常対戦（対戦設定のイニング数・球場）で試合を始めます。編成はこの試合専用で、保存済みオーダーには影響しません。</p>${draftRosterHtml('user','あなたの編成')}${draftRosterHtml('cpu','CPUの編成')}<button class="primary-button" data-action="draft-finish">試合開始</button><button class="secondary-button" data-action="draft-quit">やめる</button>`,'draft-battle');
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
  const windPark=NightPlayers.parks.find(p=>p.id===(fixedPark||scenario?.park||(mode==='derby'?settings.derbyPark:settings.park)));
  // v154: a forecast shown on the setup screen for this park is consumed
  // verbatim, so the match weather/wind equal the forecast exactly. Entry
  // points without a setup-screen forecast keep the on-the-spot rolls.
  const forecast=mode==='match'&&matchForecast&&windPark&&matchForecast.park===windPark.id?matchForecast:null;
  const matchWind=forecast?forecast.wind:(!training&&mode!=='derby'&&windPark&&windPark.theme!=='dome'&&!windPark.id.includes('dome'))?(Math.random()<.25?0:Math.round((Math.random()*10-5)*2)/2):0;
  const survRun=pendingSurvival&&mode==='match'?NightSurvival.loadRun():null;
  const survClubs=survRun&&survRun.status==='active'?(()=>{const user=NightTeams.get(survRun.userTeamId),opp=NightTeams.get(survRun.opponentId);if(!user||!opp)return undefined;return settings.matchUserHome?{home:user,away:opp}:{home:opp,away:user};})():undefined;
  const randomClubs=mode==='match'&&settings.randomRoster&&!pendingUmpire&&!pendingTimeAttack&&!pendingSurvival&&!pendingDraft&&!pendingConquest?(()=>{const rm=ensureRandomMatch();if(!rm)return undefined;const homeId=settings.matchUserHome?settings.matchTeam:settings.matchOpponent,awayId=settings.matchUserHome?settings.matchOpponent:settings.matchTeam;return {home:rm.clubs[homeId],away:rm.clubs[awayId]};})():undefined;
  const draftClubs=pendingDraft&&mode==='match'&&draftState&&NightDraftBattle.isComplete(draftState)?(()=>{const built=NightDraftBattle.buildMatch(draftState,matchClub(settings.matchTeam),matchClub(settings.matchOpponent));return settings.matchUserHome?{home:built.user,away:built.cpu}:{home:built.cpu,away:built.user};})():undefined;
  const draftUserClub=draftClubs?(settings.matchUserHome?draftClubs.home:draftClubs.away):null;
  game=new NightGame(mode,settings.difficulty,onEvent,{conditionSeed:mode==='match'&&!challengeId&&!pendingUmpire&&!pendingTimeAttack&&!pendingSurvival&&!pendingDraft&&!pendingConquest?lineupConditionSeed('match',true):undefined,wind:matchWind,weather:forecast?forecast.weather:undefined,randomRoster:!!randomClubs,variantRules:mode==='match'&&!challengeId&&!pendingUmpire&&!pendingTimeAttack&&!pendingSurvival&&!pendingDraft&&!pendingConquest?{fullCount:!!settings.variantFullCount,metalBat:!!settings.variantMetalBat,lowReboundBat:!!settings.variantLowReboundBat,noBreaking:!!settings.variantNoBreaking,twoOuts:!!settings.variantTwoOuts}:undefined,handicap:mode==='match'&&!challengeId&&!pendingUmpire&&!pendingTimeAttack&&!pendingSurvival&&!pendingDraft&&!pendingConquest?{userRuns:settings.handicapUserRuns,cpuRuns:settings.handicapCpuRuns,userOuts:settings.handicapUserOuts,cpuOuts:settings.handicapCpuOuts}:undefined,timeAttack:pendingTimeAttack&&mode==='match'?{kind:settings.taKind,seconds:settings.taSeconds}:undefined,survival:survClubs?NightSurvival.gameOption(survRun):undefined,clubs:draftClubs||survClubs||randomClubs||(mode==='match'&&(settings.matchTeam==='dream'||settings.matchOpponent==='dream')?{home:matchClub(settings.matchUserHome?settings.matchTeam:settings.matchOpponent),away:matchClub(settings.matchUserHome?settings.matchOpponent:settings.matchTeam)}:mode==='derby'&&club.alumni?{home:club,away:trainingOpponent(club.id)}:undefined),homeTeamId:survClubs?(settings.matchUserHome?survRun.userTeamId:survRun.opponentId):club.id,arcadeRoster:training||mode==='derby',awayTeamId:survClubs?(settings.matchUserHome?survRun.opponentId:survRun.userTeamId):mode==='match'?(settings.matchUserHome?settings.matchOpponent:settings.matchTeam):trainingOpponent(club.id).id,userHome:mode==='match'?settings.matchUserHome:true,defenseSpeed:settings.defenseSpeed,innings:settings.innings,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,park:fixedPark||scenario?.park||(mode==='derby'?settings.derbyPark:settings.park),pitcher:draftClubs?0:matchConfig?matchConfig.pitcher:selectedPitcher>=0?selectedPitcher:settings.pitcher,practicePitch:settings.practicePitch,practiceBatter:mode==='derby'?settings.derbyBatter:settings.practiceBatter,order:draftUserClub?draftUserClub.startingOrder.slice():(matchConfig?.order??(club.id==='owls'?settings.order:undefined)),fielding:draftUserClub?{...draftUserClub.startingFielding}:matchConfig?.fielding,battingAssist:settings.battingAssist,tiebreak:settings.tiebreak,umpire:pendingUmpire&&mode==='match',hardcore:mode==='match'&&!!settings.hardcore});
  if(randomClubs)randomMatch=null;
  if(forecast)matchForecast=null;
  if(pendingDraft&&mode==='match'){game.draftBattle=true;pendingDraft=false;draftState=null;}
  if(pendingSpectate&&mode==='match'){game.spectate=true;game.autoBatting=true;game.autoDefense=true;pendingSpectate=false;}
  if(pendingUmpire&&mode==='match'){game.spectate=true;game.autoBatting=true;game.autoDefense=true;pendingUmpire=false;}
  if(pendingTimeAttack&&mode==='match')pendingTimeAttack=false;
  if(pendingSurvival&&mode==='match')pendingSurvival=false;
  if(pendingConquest&&mode==='match'){game.conquest=conquestCtx;pendingConquest=false;conquestCtx=null;}
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
  if(mode==='derby'){onEvent('clear');derbyRoundPreview(game);}
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
  // Live play uses only the main verdict. Replay retains the optional
  // trajectory readout for reviewing the previous play.
  $('hit-readout').textContent='';
  $('play-tools').hidden=true;
 }
 const playFeedback={score:null,scoreTime:0,callTime:0,resultTime:0,pendingReplay:false,umpireLast:null,umpireShownAt:0};
 let absShownCall=null,absShownResult=null,absFrozenCall=null,absTouch=null,absLastTap=null;
 function resetPlayFeedback(){
  absShownCall=absShownResult=absFrozenCall=absTouch=absLastTap=null;
  for(const id of ['abs-actor','abs-count','abs-review','abs-challenge'])$(id).hidden=true;
  playFeedback.score=game?{away:game.awayScore,home:game.homeScore}:null;
  playFeedback.scoreTime=0;playFeedback.callTime=0;playFeedback.resultTime=0;playFeedback.pendingReplay=false;playFeedback.umpireLast=null;playFeedback.umpireShownAt=0;
  $('scoring-chip').hidden=true;$('umpire-call').hidden=true;
  $('replay-skip').hidden=true;$('replay-skip').dataset.mode='';
 }
 function tickPlayFeedback(dt){
  playFeedback.scoreTime=Math.max(0,playFeedback.scoreTime-dt);
  // The base OUT/SAFE panel takes visual priority over the result banner.
  // Only count time during which the final result can actually be read.
  const coveredTime=Math.min(dt,playFeedback.callTime);
  playFeedback.callTime=Math.max(0,playFeedback.callTime-dt);
  playFeedback.resultTime=Math.max(0,playFeedback.resultTime-(dt-coveredTime));
  if(!playFeedback.scoreTime)$('scoring-chip').hidden=true;
  if(!playFeedback.callTime)$('umpire-call').hidden=true;
 }
 function showPlayCall({verdict,base}){
  const panel=$('umpire-call'),label=verdict==='out'?'OUT':'SAFE';
  panel.dataset.verdict=verdict;
  panel.innerHTML=`<strong>${label}</strong>`;
  panel.hidden=false;playFeedback.callTime=verdict==='out'?1800:1500;
  if(typeof panel.animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   panel.getAnimations().forEach(animation=>animation.cancel());
   panel.animate([{opacity:0,transform:'translateY(7px) scale(.86)'},{opacity:1,transform:'translateY(0) scale(1)'}],
    {duration:235,easing:'cubic-bezier(.12,.74,.25,1)'});
  }
 }
 function updateAbsUI(g,draw=false){
  const interactive=g.absCanChallenge&&!g.paused&&$('modal').hidden&&onlineDecisionVisible('abs');
  const actor=$('abs-actor'),panel=$('abs-review'),call=g.absCall;
  actor.hidden=!interactive;
  if(g.phase==='abs-call'&&call!==absShownCall){
   absShownCall=call;absLastTap=null;
   const en=call.umpireStrike?'STRIKE':'BALL',speech=call.umpireStrike?'ストライク':'ボール';
   onEvent('message',{en,ja:'',speech});
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
  // Explicit ABS challenge button: same entry point as the double-tap on
  // the actor overlay, shown only while a challenge is actually available.
  const absBtn=$('abs-challenge');
  absBtn.hidden=!interactive||!!g.umpireMode;
  if(!absBtn.hidden)$('abs-challenge-count').textContent='残り'+g.absRemaining;
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
 $('play-challenge').addEventListener('click',()=>{if(onlineDecisionVisible('play')&&game?.requestPlayChallenge())sound('tap');});
 $('abs-challenge').addEventListener('click',()=>{if(onlineDecisionVisible('abs')&&game?.requestAbsChallenge())sound('tap');});
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
   if(onlineDecisionVisible('abs')&&game.requestAbsChallenge())sound('tap');
  }else absLastTap={call,time,phaseTime:game.phaseTime};
 });
 absActor.addEventListener('click',e=>{
  if(e.detail===0&&onlineDecisionVisible('abs')&&game?.requestAbsChallenge())sound('tap');
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
   btn.hidden=!g.playCanChallenge||!$('modal').hidden||!!g.umpireMode||!onlineDecisionVisible('play');
   if(!btn.hidden)btn.textContent='チャレンジ（残り'+g.playChallenges+'）';
  }else{
   if(g.phase!=='play-review')playCallSeen=null;
   btn.hidden=true;
  }
  if(!onlineMatchActive()&&g.phase==='play-review'&&!review.playback&&$('modal').hidden&&!playFeedback.pendingReplay)launchReplay();
 }
 function updateUmpireUI(g){
  const panel=$('umpire-panel');if(!panel)return;
  const active=!!g?.umpireMode&&screen==='game'&&!review.playback;
  panel.hidden=!active;
  if(!active)return;
  const s=g.umpireStats;
  $('umpire-score').textContent=s.score;
  $('umpire-accuracy').textContent=s.calls?Math.round(s.correct/s.calls*100)+'%（'+s.correct+'/'+s.calls+'）':'—';
  const playWrap=$('umpire-play-wrap');if(playWrap){playWrap.hidden=!s.playCalls;if(s.playCalls)$('umpire-play-accuracy').textContent=Math.round(s.playCorrect/s.playCalls*100)+'%（'+s.playCorrect+'/'+s.playCalls+'）';}
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
 function launchReplay(){if(onlineMatchActive()){if(online.role==='host')onlineStartReplay();return;}launchReplayLocal();}
 function launchReplayLocal(){
  if(!game||review.playback||!$('modal').hidden||!review.open(game))return;
  $('game').classList.add('replay-active');$('replay-label').hidden=false;updatePlaySkip();
  updatePlayTools();updateChallenge();return true;
 }
 function stopReplay(){
  if(!review.playback)return;
  if(game?.phase==='play-review'&&!onlineMatchActive())game.phaseTime=Math.max(game.phaseTime,1300);
  review.close();$('game').classList.remove('replay-active');$('replay-label').hidden=true;updatePlaySkip();if(onlineMatchActive()&&online.sync.lock?.kind==='replay'){game.paused=true;onlineFinishLocalLock();}
  updatePlayTools();
  if(game?.challenge){updateChallenge(game.outs>=3);closeChallengeResult();}
 }
 function updatePlaySkip(){
  const btn=$('replay-skip');
  const trot=!onlineMatchActive()&&screen==='game'&&game?.homeRunRunning&&!game.paused&&!playFeedback.pendingReplay&&$('modal').hidden;
  const mode=review.playback?'replay':trot?'home-run':'';
  if(btn.dataset.mode===mode)return;
  btn.dataset.mode=mode;btn.hidden=!mode;
  btn.setAttribute('aria-label',mode==='home-run'?'ホームランの走塁をスキップ':'リプレイをスキップ');
 }
 $('replay-skip').onclick=()=>{
  if(review.playback)stopReplay();
  else if(!onlineMatchActive()&&game?.skipHomeRunRun()){
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
   // Display text (data.ja/data.sub) and spoken text are separate since
   // v146: pitch-call banners no longer show the katakana call words, but
   // TTS keeps reading them from data.speech when a message carries one.
   const text=data.speech?localize(data.speech):[data.ja,data.sub].filter(Boolean).map(value=>localize(value)).join(NightI18n.language==='ko'?'. ':'。');
   if(!speakable||!text)return;
   try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=NightI18n.language==='ja'?'ja-JP':NightI18n.language;u.rate=1.05;speechSynthesis.speak(u);}catch{}
 }
 // v159 (result-banner-once): a play result is announced exactly once, in
 // the one stage-banner design. The engine emits each result once, but the
 // banner itself had no lifetime of its own: it stayed visible until the
 // next 'clear' event and nothing else ever hid it, and the same result
 // could be delivered to onEvent a second time (the re-entry paths that
 // re-emit the last log entry — playLeague / resumeGame / career /
 // tournament starts — and online re-sends), presenting the identical
 // result again, including over the next at-bat's batting screen. Result
 // messages are therefore tracked by a signature (inning / half / batter /
 // en / ja / sub / outs / score): a second delivery of the same play's
 // result within one game-screen session is neither shown nor spoken
 // again, and updateUI hides a tracked result banner the moment a new
 // at-bat phase (aim / windup / pitch / miss / field / intro) begins, so a
 // stale result can never sit on the batting screen. activateGame() resets
 // the set, so a restored game may still present its in-progress result
 // once on entry. STRIKEOUT and WALK are included because they end the
 // at-bat exactly like FLY OUT (their pitch-call styling is unchanged —
 // only the duplicate announcement is suppressed); pure pitch calls that
 // do not end an at-bat (BALL / STRIKE / SWING & MISS / FOUL / TAKE) are
 // not tracked and keep their existing display behaviour.
 const RESULT_NON_RESULTS=['BALL','STRIKE','SWING & MISS','FOUL','TAKE'];
 // v220: semantic colours for the Stadium Vision verdict display (H).
 // Use raw event labels; the locale layer may translate the rendered text.
 const VISION_CALL_TONES=Object.freeze({
  'STRIKE':'strike','SWING & MISS':'strike','STRIKEOUT':'strike','BALL':'ball','WALK':'ball',
  'INTENTIONAL WALK':'ball','HIT BY PITCH':'ball','FOUL':'neutral','TAKE':'neutral',
  'MISPLAY':'error','WILD THROW':'error','WILD PITCH':'error','PASSED BALL':'error',
  'STEAL':'hit','HOME RUN':'homer'
 });
 // v224: display a single verdict, preserving the full engine event for
 // the history, speech, online relay and duplicate-result detection.
 function visionLabel(data){
  if(data.en==='HOME RUN'){
   // Older saved messages have the scored runs in the detail string.
   // The new event explicitly carries the number, even before the guest's
   // next state snapshot arrives. Derby/practice has no scored runs.
   const runs=data.homeRunRuns??Number((data.sub||'').match(/(?:^| · )([1-4])点(?:$| · )/)?.[1]||0);
   return ['HOME RUN','SOLO HOME RUN','2-RUN HOME RUN','3-RUN HOME RUN','GRAND SLAM'][runs]||'HOME RUN';
  }
  return ({'SWING & MISS':'STRIKE','SINGLE':'HIT','MISPLAY':'ERROR','WILD THROW':'ERROR'})[data.en]||data.en;
 }
 function visionCallTone(en,kind){
  return Object.hasOwn(VISION_CALL_TONES,en)?VISION_CALL_TONES[en]:
   kind==='hit'?'hit':kind==='out'?'out':kind==='homer'?'homer':'';
 }
 let stageResultKey='',stageResultShown=new Set();
 function resultSignature(data){
   if(!game||!data?.en||RESULT_NON_RESULTS.includes(data.en))return '';
   const isResult=['hit','out','homer'].includes(data.kind)||
     /^(SINGLE|DOUBLE|TRIPLE|GROUND-RULE DOUBLE|HOME RUN|FLY OUT|OUT|OUT AT FIRST|DOUBLE PLAY|FORCE OUT|BUNT HIT|SACRIFICE FLY|SACRIFICE BUNT|BUNT OUT|HIT BY PITCH|INTENTIONAL WALK|WALK|STEAL OUT|GAME SET|WALK-OFF)/.test(data.en);
   if(!isResult)return '';
   return [game.inning,game.half,game.batter?.name||'',data.en,data.ja||'',data.sub||'',game.outs,game.homeScore,game.awayScore].join('|');
 }
 // Keep the current tone and layout until opacity finishes fading out.
 // Resetting every class immediately briefly repaints the legacy banner.
 function hideStageBanner(){ $('stage-message').classList.remove('show'); }
 function hideStaleResultBanner(){
   if(!stageResultKey||!game)return;
   if(!['aim','windup','pitch','miss','field','intro'].includes(game.phase))return;
   hideStageBanner();stageResultKey='';playFeedback.resultTime=0;
 }
 function onEvent(type,data){
   if(online?.role==='host'&&online.session?.open){if(type==='message')online.session.send({t:'msg',d:data});else if(type==='clear')online.session.send({t:'clear'});else if(type==='sound')online.session.send({t:'snd',d:data});else if(type==='cue')online.session.send({t:'cue',d:data});else if(type==='music-result')online.session.send({t:'music',d:data});else if(type==='scoring-walk')online.session.send({t:'walk-replay'});else if(type==='end'&&data){online.session.send({t:'end',hs:data.homeScore,as:data.awayScore,hn:data.teams.home.name,an:data.teams.away.name});online.endSent=true;}}
   if(type==='message'){
     const resultSig=resultSignature(data);
     if(resultSig&&stageResultShown.has(resultSig))return;
     if(resultSig){stageResultShown.add(resultSig);stageResultKey=resultSig;}
     speakPlay(data);
     const previousCall=$('stage-message').dataset.visionLabel;
     if(game?.challenge&&data.en==='STRIKEOUT')updateChallenge(true);
     const stage=$('stage-message');
     const kind=data.kind||(/^(SINGLE|DOUBLE|TRIPLE|GROUND-RULE DOUBLE|BUNT HIT)$/.test(data.en)?'hit':
      data.en==='HOME RUN'?'homer':/OUT|DOUBLE PLAY/.test(data.en)?'out':'neutral');
     const pitchCall=['BALL','WALK'].includes(data.en)?'ball':
      ['STRIKE','STRIKEOUT','SWING & MISS'].includes(data.en)?'strike':'';
     const displayEn=visionLabel(data);
     const samePitchCall=pitchCall&&previousCall===displayEn&&stage.classList.contains('show')&&stage.classList.contains('pitch-call');
     // v162: batted-ball result banners (kind hit/out that are not pitch
     // calls) get the .result-compact one-row layout from style.css, at
     // the same ~50px height as the v145 pitch-call banner instead of
     // the old two-row 103px design. HOME RUN uses its own larger
     // Stadium Vision style, not the old separate celebration overlay.
     const resultCompact=!pitchCall&&['hit','out'].includes(kind)&&data.en!=='HOME RUN';
     const visionTone=visionCallTone(data.en,kind);
     // The engine's field result phase can end in only 620 simulated ms
     // (even faster with auto-defence). Hold the actual result for 1.5s
     // of readable wall-clock time, without altering pitch/ABS rules.
     const finalOut=kind==='out'&&!['JUMPING CATCH','DIVING CATCH'].includes(data.en);
     playFeedback.resultTime=game?.fastForward?0:finalOut?1500:visionTone==='homer'&&!game?.derby?1800:0;
     stage.className='stage-message show '+kind+(pitchCall?' pitch-call pitch-call--'+pitchCall:'')+(resultCompact?' result-compact':'')+(visionTone?' vision-call':'');
     stage.dataset.visionTone=visionTone;
     stage.dataset.visionLabel=displayEn;
     stage.dataset.visionLong=String(displayEn.length>12);
     stage.dataset.visionImpact=String(['STRIKEOUT','DOUBLE PLAY','JUMPING CATCH','DIVING CATCH'].includes(data.en)||visionTone==='error'||visionTone==='homer');
     $('message-en').textContent=displayEn;
     $('message-ja').textContent=visionTone?'':data.ja;
     $('message-sub').textContent=visionTone?'':data.sub||'';
     $('message-ja').hidden=!!visionTone;
     const detailEl=stage.querySelector('.stage-call-detail');
     if(detailEl)detailEl.hidden=!!visionTone;
     const banner=stage.querySelector('.stage-call');
     if(!samePitchCall&&typeof banner.animate==='function'&&!reduceAbsMotion.matches){
      banner.getAnimations().forEach(animation=>animation.cancel());
      const impact=['out','hit','homer'].includes(kind);
      banner.animate([
       {opacity:0,transform:visionTone?(impact?'scale(.94)':'translateY(4px)'):(impact?'translateX(-14px) scale(.94)':'translateY(8px)')},
       {opacity:1,transform:'none'}
      ],{duration:pitchCall?245:impact?230:170,easing:'cubic-bezier(.16,1,.3,1)'});
     }
   }else if(type==='clear'){stageResultKey='';playFeedback.resultTime=0;hideStageBanner();$('distance').textContent='';$('timing-result').textContent='';$('play-tools').hidden=true;const hrEl=$('hr-celebration');if(hrEl)hrEl.hidden=true;}
   else if(type==='sound')sound(data);
   else if(type==='cue'){syncAudio();stadiumAudio.cue(data);}
   else if(type==='music-result'){syncAudio();if(game)ballparkMusic.result(game,data.kind,data.player,data.side,data.thirdOut);}
   else if(type==='field'){review.capture(game);updatePlayTools();}
   else if(type==='update')updateUI();
   else if(type==='timing'){
     // Contact feedback is sound/vibration only; no text over the field.
   }else if(type==='hit'){
     if(game?.onlineDerby)onlineDerbyOnHit(data);
     if(game?.walkoffWin&&game.next==='finish'&&data.kind!=='hr')showCelebration('サヨナラ！','WALK-OFF WIN');
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
  const panel=$('half-break'),waiting=g.phase==='change'&&g.isFixture;panel.hidden=!waiting;
  if(!waiting){panel.dataset.key='';return;}
  const h=g.halfBreak||{inning:g.half==='bottom'?g.inning:g.inning-1,half:g.half==='bottom'?'top':'bottom'};
  const turn=g.umpireMode?'umpire':g.defending?'defense':'attack';
  const key=[g.inning,g.half,h.inning,h.half,g.homeScore,g.awayScore,g.homeHits,g.awayHits,g.autoDefense,turn,!!g.mirror].join('/');
  if(panel.dataset.key!==key){
   panel.dataset.key=key;panel.dataset.turn=turn;
   $('half-break-title').textContent=`${h.inning}回${h.half==='top'?'表':'裏'} 終了`;
   const report=buildMatchReport(g);report.highlight=h.inning;
   $('half-break-score').innerHTML=halfBreakScoreHTML(report,g.teams);
   $('half-break-next-inning').textContent=`NEXT · ${g.inning}回${g.half==='top'?'表':'裏'}`;
   $('half-break-next').textContent=g.umpireMode?'UMPIRE':g.defending?'DEFENSE':'ATTACK';
   const next=$('half-continue');next.disabled=!!g.mirror;
   next.textContent=g.mirror?'WAITING':'PLAY';
   $('half-auto-note').textContent=g.autoDefense?'AUTO DEFENSE ON':'';
  }
 }
 function continueHalf(){
  if(!game||game.mirror||onlineInputBlocked()||screen!=='game'||!$('modal').hidden||game.phase!=='change')return;
  unlockAudio();if(game.acknowledgeHalf()){sound('tap');updateUI();}
 }
 let halfTap=null;
 $('half-break').addEventListener('pointerdown',e=>{halfTap={x:e.clientX,y:e.clientY,id:e.pointerId};});
 $('half-break').addEventListener('pointerup',e=>{const t=halfTap;halfTap=null;if(t&&t.id===e.pointerId&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<12)continueHalf();});
 $('half-break').addEventListener('pointercancel',()=>{halfTap=null;});
 $('half-continue').addEventListener('click',e=>{if(e.detail===0)continueHalf();});
 const ATBAT_RESULT_FILL={ball:'#6ab0ff',miss:'#ffd34d',foul:'#aebba4'};
 function updateAtBatChart(g,field){
   const box=$('atbat-chart');if(!box)return;
   const pitches=g&&g.inMatch&&!g.umpireMode&&!g.hardcore&&!field?(g.atBatPitches||[]):[];
   box.hidden=!pitches.length;
   if(!pitches.length)return;
   const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
   $('atbat-chart-svg').innerHTML=`<rect x="24" y="8" width="36" height="48" rx="2" fill="#304a2b" stroke="#b8cc9a66"/><path d="M36 8v48m12-48v48M24 24h36M24 40h36" stroke="#b8cc9a22"/>${pitches.map((p,i)=>{const cx=clamp(42+p.x*18,7,77),cy=clamp(32+p.y*24,7,57),fill=ATBAT_RESULT_FILL[p.result]||'#d5f36a',last=i===pitches.length-1;return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.2" fill="${fill}"${last?' stroke="#fff" stroke-width="1.5"':''}/><text x="${cx.toFixed(1)}" y="${(cy+2.4).toFixed(1)}" fill="#182b15" text-anchor="middle" font-size="7" font-weight="bold">${i+1}</text>`;}).join('')}`;
 }
 function updateUI(){
   if(!game)return;const g=game;hideStaleResultBanner();stadiumAudio.setAtmosphere(NightGame.stadiumAtmosphere(g));stadiumAudio.setExcitement(g.crowdExcitement());updateHalfBreak(g);const def=g.defending,field=!!g.field&&['field','result'].includes(g.phase);$('bench-button').hidden=!g.isFixture||!!g.umpireMode||(g.mirror&&!g.onlineGame);$('bench-button').disabled=g.phase==='ended';$('bench-button').textContent=queuedBench?'交代待ち':'ベンチ';$('bench-button').classList.toggle('pending',queuedBench);const subBtn=$('sub');subBtn.hidden=$('bench-button').hidden;subBtn.disabled=g.phase==='ended';subBtn.textContent=queuedBench?'交代待ち':'交代';subBtn.classList.toggle('pending',queuedBench);
   if(g.timeAttack){
     const ta=g.timeAttack,live=ta.kind==='pitch'?ta.outs+(g.defending?g.outs:0):(g.userHome?g.homeScore:g.awayScore),opp=g.userHome?g.awayScore:g.homeScore;
     $('scoreboard').innerHTML=`<div class="derby-score"><div class="derby-round"><span>タイムアタック · ${ta.kind==='bat'?'攻撃編':'守備編'} · ${ta.halves+1}セット目</span><strong id="ta-clock"></strong></div><div class="derby-names"><span>${ta.kind==='bat'?'得点':'アウト'}<b>${live}</b></span><span>${ta.kind==='bat'?`安打 ${g.session.hits} · 本塁打 ${g.session.hr}`:`失点 ${opp} · 奪三振 ${g.session.ks}`}</span></div></div>`;
     updateTimeAttackClock(g);
   }else if(g.isFixture||g.career||g.challenge){
     updateScoreCube($('scoreboard'),g);
   }else if(g.onlineDerby&&online?.derbyContest){
     const c=online.derbyContest,turn=NightOnlineDerby.turnIndex(c);
     $('scoreboard').innerHTML=`<div class="derby-score"><div class="derby-round"><span>オンラインHRダービー</span><strong>${turn===online.derbyMyIndex?'あなたの番':'相手の番'}</strong></div><div class="derby-names">${c.players.map(p=>`<span>${p.name}<b>${p.hr} 本 · ${p.maxDistance||0} m</b></span>`).join('')}</div></div>`;
   }else if(g.derby){
     const d=g.derby;
     $('scoreboard').innerHTML=`<div class="derby-score"><div class="derby-round"><span>${d.label}${d.extra?' · 延長':''} · ${d.userBatsSecond?'後攻':'先攻'}</span><strong id="derby-clock"></strong></div><div class="derby-names"><span>${g.batter.name}<b>${d.turnHR}</b></span><span>${d.opponent.player.name}<b>${d.score[1-d.userIndex]??'未打撃'}</b></span></div></div>`;
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
   const pitchVisible=!!chipPitch&&['pitch','miss','field','result','abs-call'].includes(g.phase)&&!(g.hardcore&&!def);
   $('pitch-label').textContent=pitchVisible?chipPitch.name:'';
   $('pitch-speed').textContent=pitchVisible?chipPitch.speed:'';
   const pitchDetail=$('pitch-detail');if(pitchDetail){if(pitchVisible&&chipPitch){const brk=chipPitch.breakCm??(chipPitch.bx!=null?Math.round(Math.hypot(chipPitch.bx,chipPitch.by||0)*20.4):null);pitchDetail.textContent=brk!=null?'変化'+brk+'cm'+(chipPitch.spinRpm?' · '+chipPitch.spinRpm.toLocaleString('ja-JP')+'rpm':''):'';}else pitchDetail.textContent='';}
   $('pitch-label').parentElement.hidden=!pitchVisible;
   updateAtBatChart(g,field);
   const absCount=$('abs-count');
   absCount.hidden=g.absRemaining===undefined;
   if(!absCount.hidden){
    $('abs-remaining').textContent=g.absRemaining;
    absCount.dataset.empty=String(g.absRemaining===0);
    absCount.setAttribute('aria-label','ABS 残り'+g.absRemaining+'回');
   }
   const wind=g.wind??g.park.wind??0,windHUD=$('wind-hud');
   $('wind-speed').textContent=Math.abs(wind).toLocaleString('ja-JP',{maximumFractionDigits:1});
   const fixedWind=g.park.customSpec?.windMode==='fixed'&&g.park.theme!=='dome',windAngle=fixedWind?g.park.customSpec.windDirection:null;
   windHUD.dataset.direction=wind?(fixedWind&&Math.cos(windAngle*Math.PI/180)<0||wind<0?'in':'out'):'calm';
   windHUD.setAttribute('aria-label',fixedWind?`風速 ${wind} m/s・風向 ${windAngle}°`:wind?(wind<0?'向かい風 ':'追い風 ')+Math.abs(wind)+' m':'無風');
   $('rain-overlay').hidden=g.weather!=='rain';
   $('batter-label').innerHTML=`${g.park.name}${wind?' · '+(fixedWind?`風 ${windAngle}°`:wind>0?'追い風':'向かい風'):''}${g.inMatch?' · '+(g.umpireLabel||'ゾーン標準'):''}${g.weather&&g.weather!=='clear'?' · '+g.weatherLabel:''}　${def?g.pitcher.name+' <span class="stamina"><i style="width:'+g.stamina+'%"></i></span> '+g.session.thrown+'球':(g.isFixture?g.pitcher.name+' '+(g.pitchingStats?.[g.pitcher.id]?.pitches||0)+'球':'')}`;
   $('difficulty-label').textContent=g.difficulty.toUpperCase();
   $('control-hint').textContent=g.umpireMode?'判定（ボール／ストライク、セーフ／アウト）だけ操作できます':def?'画面で狙い、離して投げる':'押したまま狙い、離して打つ';
   $('swing').disabled=g.paused||!!g.umpireMode||!!g.spectate||(def?g.phase!=='aim':g.phase!=='pitch');
   $('action-label').textContent=def?'PITCH':'SWING';$('action-hint').textContent=def?'離して投球':'離してスイング';$('swing-icon').innerHTML=svg(def?'ball':'bat');
   $('pitch-status').textContent=field?(g.field.throw?'ボールが送球されました':'野手が打球を追っています'):g.phase==='aim'?'球種を選び、コースを指定':g.phase==='pitch'?(def?'投球中 · 打者との勝負':'カーソルをボールのコースへ！'):g.phase==='windup'?'投球モーション…':'次の1球へ';
   g.battingAssist=settings.battingAssist&&g.career?.difficulty!=='expert';$('game').classList.toggle('batting-touch',!def);$('game').classList.toggle('pitching-touch',def);$('game').classList.toggle('in-play',field);$('thumb-hint').hidden=field;$('release-label').textContent=def?'離して投げる':'離して打つ';$('game-canvas').setAttribute('aria-label',def?'球場を押したままコースを狙い、指を離して投球':'球場を押したまま狙い、指を離してスイング');
   if(def)renderPitchDirections(g);$('pitch-deck').hidden=!def||field||g.phase!=='aim'||g.autoDefense||!!g.umpireMode||!!g.spectate;$('pitch-types').hidden=false;$('pitch-types').style.setProperty('--pitch-count',g.pitcher.pitches.length);$('pitch-deck-status').textContent=g.phase==='aim'?'コースを狙って離す':g.phase==='windup'?'投球モーション中':g.phase==='pitch'?'投球中':'次の1球へ';$('pitch-types').classList.toggle('four',g.pitcher.pitches.length===4);$('bat-options').hidden=def||!!g.umpireMode||!!g.spectate||!!g.autoBatting;$('ibb').hidden=!def||!g.inMatch||g.phase!=='aim'||g.autoDefense||g.spectate||g.fastForward||!!g.umpireMode;$('bat-options').dataset.batterHand=g.battingHand;document.querySelector('.controls').classList.toggle('defending',def);
   document.querySelectorAll('[data-pitch]').forEach(b=>{b.classList.toggle('active',b.dataset.pitch===g.pitchType);b.setAttribute('aria-pressed',String(b.dataset.pitch===g.pitchType));b.querySelector('small').textContent=Math.round(NightGame.pitchSpec(g.pitcher,b.dataset.pitch).speed)+'km/h';b.disabled=g.phase!=='aim'||!g.pitcher.pitches.includes(b.dataset.pitch)||!!(g.variantRules&&g.variantRules.noBreaking&&b.dataset.pitch!=='fast');b.hidden=def&&!g.pitcher.pitches.includes(b.dataset.pitch);});
   const power=!!g.power,bunt=!!g.bunt;$('bunt').hidden=g.mode==='derby';const stealable=!def&&g.inMatch&&(g.bases[0]&&!g.bases[1]||g.bases[1]&&!g.bases[2]);$('steal').hidden=!stealable;$('steal').classList.toggle('selected',!!g.steal);$('steal').setAttribute('aria-pressed',String(!!g.steal));$('bunt').classList.toggle('selected',bunt);$('bunt').setAttribute('aria-pressed',String(bunt));$('contact').classList.toggle('selected',!power&&!bunt);$('power').classList.toggle('selected',power);$('power').classList.toggle('power-mode',power);$('contact').setAttribute('aria-pressed',String(!power&&!bunt));$('power').setAttribute('aria-pressed',String(power));$('swing').classList.toggle('power-active',power&&!def);updatePad();
   updateRunningUI(g);
   const auto=g.autoDefense&&def,speed=auto?g.defenseSpeed:g.fieldSpeed;$('field-speed').hidden=!!g.derby||!!g.umpireMode;$('field-speed').textContent=`${auto?'自動守備':'打球後'} ×${speed}`;$('field-speed').classList.toggle('active',speed===2);$('field-speed').setAttribute('aria-pressed',String(speed===2));$('field-speed').setAttribute('aria-label',auto?'自動守備の速度を切り替え':'打球後の速度を切り替え');$('auto-defense').hidden=!!g.onlineGame||!g.isFixture||!def||g.phase==='ended'||!!g.umpireMode;$('auto-defense').textContent=auto?'手動に戻す':'守備を自動で進行';$('auto-defense').setAttribute('aria-pressed',String(!!auto));$('game').classList.toggle('auto-defense',!!auto);document.querySelector('.controls').classList.toggle('left-handed',settings.leftHanded);
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
  else{settings.manualRunning=manual;settings.runningModeChosen=true;}
  save();if(game?.mirror)game.mirrorSend?.({t:'running-mode',manual});
  if(game)updateUI();
 }
 $('running-mode').onclick=()=>{if(game)chooseRunningMode(!game.manualRunning);};
 bindRunnerMap($('runner-map'),()=>game,()=>sound('tap'));
 $('run-advance').onclick=()=>{if(game?.commandRunners('advance'))sound('tap');};
 $('run-return').onclick=()=>{if(game?.commandRunners('return'))sound('tap');};
 function updatePad(){if(!game)return;$('pad-label').textContent=game.defending?'スライドでコースを指定':'スライドで微調整';}
 function updateStyle(){if(game)updateUI();}
 function commit(g,abandoned=false){if(saved||g.challenge)return;saved=true;if(g.mode==='match'&&!g.apbcFixtureId)clearCheckpoint();const s=g.session;records.hits+=s.hits;records.hr+=s.hr;records.perfect+=s.perfect;records.maxDistance=Math.max(records.maxDistance,s.maxDistance);records.grandSlam ||= !!s.grandSlam;records.ks+=s.ks;records.thrown+=s.thrown;if(g.mode==='practice'){records.practicePitches+=s.pitches;records.practiceHits+=s.hits;records.practiceHr+=s.hr;records.practiceMaxDistance=Math.max(records.practiceMaxDistance,s.maxDistance);}if(g.mode==='pitching'){records.practiceThrown+=s.thrown;records.practiceKs+=s.ks;}
   if(g.isFixture&&!abandoned){records.games++;if(g.userScore>g.opponentScore){records.wins++;records.winStreak=(records.winStreak||0)+1;records.bestStreak=Math.max(records.bestStreak||0,records.winStreak);}else if(g.userScore<g.opponentScore)records.winStreak=0;if(g.homeScore===g.awayScore)records.draws++;}
   if(g.mode==='derby'&&!abandoned){records.bestTimedDerby=Math.max(records.bestTimedDerby,...g.derby.rounds.flat().map(m=>m.normal[m.entrants.findIndex(e=>e.user)]??0));records.bestTimedDerbyDistance=Math.max(records.bestTimedDerbyDistance,s.maxDistance);}recordRoomCommit(g,abandoned);save();
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
    for(const [id,b] of Object.entries(g.box||{})){const r=row(id);if(!r)continue;r.games++;for(const k of ['pa','ab','h','doubles','triples','hr','rbi','bb','k'])r[k]+=b[k]||0;if(g.totalInnings>=3){r.rispAb=(r.rispAb||0)+(b.rispAb||0);r.rispH=(r.rispH||0)+(b.rispH||0);}}
    for(const [id,s] of Object.entries(g.pitchingStats||{})){const r=row(id);if(!r)continue;r.outs+=s.outs||0;r.pk+=s.k||0;r.runs+=s.runs||0;r.earned+=s.earned??s.runs??0;}
    if(g.totalInnings===9){const used=side===g.userSide?g.usedPitchers:g.usedCpuPitchers;const sp=club.pitchers[used?.[0]];if(sp){const r=row(sp.id);if(r){const s=g.pitchingStats[sp.id]||{};r.gs=(r.gs||0)+1;if((s.outs||0)>=18&&(s.earned??s.runs??99)<=3)r.qs=(r.qs||0)+1;}}}
   }
   try{localStorage.setItem('nightball.careerTotals',JSON.stringify(store));}catch{}
 }
 function totalsModal(){
   const rows=Object.values(loadTotals().rows);
   const bat=rows.filter(r=>r.ab>=10).sort((a,b)=>b.h/Math.max(1,b.ab)-a.h/Math.max(1,a.ab)).slice(0,15);
   const pow=rows.filter(r=>r.pa>0).sort((a,b)=>b.hr-a.hr||b.rbi-a.rbi).slice(0,10);
   const pit=rows.filter(r=>r.outs>=9).sort((a,b)=>a.earned*27/Math.max(1,a.outs)-b.earned*27/Math.max(1,b.outs)).slice(0,15);
   const row=(r,main)=>`<div class="career-list-row"><div><b>${r.name}</b><small>${matchClub(r.clubId)?.short||''} · ${r.games}試合</small></div><strong>${main}</strong></div>`;
   const saber=NightGame.saberMetrics(rows);
   const opsRows=rows.filter(r=>r.ab>=10).sort((a,b)=>saber.calc(b).ops-saber.calc(a).ops).slice(0,10);
   const rispRows=rows.filter(r=>(r.rispAb||0)>=5).sort((a,b)=>saber.calc(b).risp-saber.calc(a).risp).slice(0,10);
   const warRows=rows.filter(r=>r.pa>0).sort((a,b)=>saber.calc(b).batWar-saber.calc(a).batWar).slice(0,10);
   const qsRows=rows.filter(r=>(r.gs||0)>=3).sort((a,b)=>saber.calc(b).qsRate-saber.calc(a).qsRate).slice(0,10);
   modal(`${modalTitle('','選手通算成績（全モード）')}<p class="modal-note">対戦・ペナント・APBC・トーナメントなど、全モードの試合を通算した個人成績です。</p><h3 class="arcade-section-title">打率（10打数以上）</h3>${bat.map(r=>row(r,(r.h/r.ab).toFixed(3).replace(/^0/,'')+' · '+r.hr+'本塁打 · '+r.rbi+'打点')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">本塁打</h3>${pow.map(r=>row(r,r.hr+'本 · '+r.rbi+'打点')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">OPS（10打数以上）</h3>${opsRows.map(r=>row(r,saber.calc(r).ops.toFixed(3)+' · 出塁率 '+saber.calc(r).obp.toFixed(3).replace(/^0/,''))).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">得点圏打率（得点圏5打数以上）</h3>${rispRows.map(r=>row(r,saber.calc(r).risp.toFixed(3).replace(/^0/,'')+' · '+r.rispH+'/'+r.rispAb)).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">WAR相当（打者）</h3>${warRows.map(r=>row(r,saber.calc(r).batWar.toFixed(1))).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">防御率（3投球回以上）</h3>${pit.map(r=>row(r,(r.earned*27/r.outs).toFixed(2)+' · '+r.pk+'奪三振')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<h3 class="arcade-section-title">QS率（9回制・先発3試合以上）</h3>${qsRows.map(r=>row(r,Math.round(saber.calc(r).qsRate*100)+' % · '+r.qs+'/'+r.gs+' QS')).join('')||'<p class="modal-note">まだ記録がありません</p>'}<p class="modal-note">WAR相当はゲーム独自の換算です（打者はwOBA、投手は防御率と投球回をもとに算出）。得点圏は3回制以上の試合、QSは9回制の試合の先発のみ集計します。</p><button class="primary-button" data-action="close">閉じる</button>`,'totals');
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
 // v218: the host owns all transitions; a lock carries a monotonic
 // epoch so late inputs and delayed host controls cannot cross a stop.
 const ONLINE_SYNC_VERSION=219,ONLINE_CHALLENGE_MS=3000;
 const onlineMatchActive=()=>!!(online?.started&&online.sync&&game?.onlineGame&&!game.onlineDerby&&game.phase!=='ended');
 const onlineOwnsMenu=()=>onlineMatchActive()&&!online.sync.disconnected&&online.sync.lock?.kind==='menu'&&online.sync.lock.owner===online.role&&!online.sync.lock.done?.[online.role]&&!online.sync.lock.releasing;
 const onlineInputBlocked=()=>onlineMatchActive()&&(!!online.sync.lock||!!online.sync.disconnected);
 function onlineInitSync(o){o.sync={epoch:0,serial:0,lock:null,request:null,localIntent:null,decision:null,localDecision:null,subPending:null,subSerial:0,lastRx:performance.now()};game.onlineDecisionManaged=true;}
 function onlineWait(label){
  if(modalKind==='online-hold'&&$('modal-content').querySelector('[role=status]')?.textContent===label)return;
  modal(`${modalTitle('','試合一時停止',false)}<p class="career-status-line" role="status">${label}</p><p class="modal-note">試合は停止中です。</p>`,'online-hold');
 }
 function onlineOpenMenu(intent){
  if(!onlineOwnsMenu())return;
  const k=intent?.kind||'pause';
  if(k==='box')boxModal(...(intent.args||[]));else if(k==='bench')benchModal();else if(k==='settings')settingsModal();else if(k==='roster')rosterModal(...(intent.args||[]));else if(k==='history')historyModal();else if(k==='tactics')tacticsModal();else if(k==='howto')howto();else pause();
 }
 function onlineRequestMenu(kind,args=[]){
  const o=online;if(!onlineMatchActive()||o.sync.disconnected||o.sync.lock||o.sync.request||o.sync.localIntent)return;
  o.sync.localIntent={kind,args};const request={kind,owner:o.role};
  if(o.role==='host'){o.sync.request=request;onlineSyncTick();}else o.session?.send({t:'sync-menu',kind,epoch:o.sync.epoch});
  if(!o.sync.lock)toast('プレー終了後にタイムを取ります');
 }
 function onlineSafeMenu(g,kind){
  return ['aim','intro','change'].includes(g.phase)&&!review.playback&&!playFeedback.pendingReplay&&(kind!=='bench'||g.substitutionWindow);
 }
 function onlineAcquire(kind,owner,menu=null){
  const o=online,g=game;if(!onlineMatchActive()||o.role!=='host'||o.sync.lock)return false;
  const lock={id:++o.sync.serial,kind,owner,menu,done:{host:false,guest:false},releasing:false};
  o.sync.lock=lock;o.sync.epoch++;o.delayQueue?.clear();g.paused=true;g.touch=null;
  onlineTick(g,true);
  if(kind==='menu'){if(owner==='host')onlineOpenMenu(o.sync.localIntent);else onlineWait(menu==='bench'?'相手が選手交代中です…':'相手がタイム中です…');}
  return true;
 }
 function onlineMarkDone(role,id){
  const o=online,l=o?.sync?.lock;if(!l||l.id!==id||l.releasing||l.kind==='menu'&&l.owner!==role)return;
  l.done[role]=true;
  if(l.kind==='menu'?l.done[l.owner]:l.done.host&&l.done.guest)l.releasing=true;
  onlineTick(game,true);
 }
 function onlineFinishLocalLock(){
  const o=online,l=o?.sync?.lock;if(!l||l.done[o.role]||l.releasing)return;
  if(o.role==='host')onlineMarkDone('host',l.id);
  else{l.done.guest=true;o.session?.send({t:'sync-done',id:l.id,epoch:o.sync.epoch});}
  game.paused=true;onlineWait(l.kind==='replay'?'相手のリプレイ終了を待っています…':'同期を確認しています…');
 }
 function onlineRelease(id){
  const o=online,l=o?.sync?.lock;if(!l?.releasing||l.id!==id)return;
  o.sync.lock=null;o.sync.localIntent=null;o.sync.epoch++;
  game.paused=false;if(modalKind==='online-hold')closeModal(false);
  if(l.kind==='replay'&&game.phase==='play-review')game.phaseTime=Math.max(game.phaseTime,1400);
  onlineTick(game,true);updateUI();
 }
 function onlineApplyRemoteLock(s){
  const o=online,sync=o.sync;if(!sync||!Number.isInteger(s.epoch)||s.epoch<sync.epoch)return;
  const prev=sync.lock,l=s.lock||null,changed=prev?.id!==l?.id;
  if(l&&prev?.id===l.id&&prev.done.guest)l.done.guest=true;
  sync.epoch=s.epoch;sync.lock=l;game.paused=!!l||!!sync.disconnected;
  if(!l){
   if(prev){sync.localIntent=null;sync.subPending=null;if(modalKind==='online-hold')closeModal(false);}
   return;
  }
  if(changed){
   if(l.kind==='menu'){
    if(l.owner==='guest')onlineOpenMenu(sync.localIntent||{kind:l.menu});
    else{sync.localIntent=null;onlineWait(l.menu==='bench'?'相手が選手交代中です…':'相手がタイム中です…');}
   }else{playFeedback.pendingReplay=false;onlineWait('リプレイを準備しています…');}
  }
  if(l.releasing){if(!review.playback)onlineWait('同期を確認しています…');o.session?.send({t:'sync-release-ack',id:l.id,epoch:sync.epoch});}
 }
 function onlineStartReplay(){
  const o=online;if(o.role!=='host'||o.sync.lock||!review.clip||!$('modal').hidden)return false;
  const clip=review.clip;
  // Send only recorded poses, not the engine or live simulation object.
  const frames=clip.frames,step=frames?Math.max(1,Math.ceil(frames.length/105)):1;
  const sampled=frames?frames.filter((_,i)=>i%step===0||i===frames.length-1):undefined;
  if(!onlineAcquire('replay','both'))return false;
  o.session?.send({t:'sync-replay',id:o.sync.lock.id,clip:clip.pitch?{pitch:clip.pitch}:{frames:sampled,hit:clip.hit}});
  playFeedback.pendingReplay=false;
  if(!launchReplayLocal())onlineFinishLocalLock();
  return true;
 }
 function onlineDecisionVisible(kind){
  if(!onlineMatchActive())return true;
  const o=online,d=o.sync.decision;
  if(!d||d.kind!==kind||d.owner!==o.role||o.sync.lock||o.sync.disconnected||game.paused||game.phase!==(kind==='abs'?'abs-call':'play-call')||document.hidden)return false;
  const now=performance.now();let local=o.sync.localDecision;
  if(!local||local.id!==d.id){local=o.sync.localDecision={id:d.id,shown:now,sent:false};if(o.role==='guest')o.session?.send({t:'sync-call-seen',id:d.id,epoch:o.sync.epoch});else d.seenAt=now;}
  if(local.sent)return false;
  if(now-local.shown<=ONLINE_CHALLENGE_MS)return true;
  // Reliable ordered delivery: the host must not resolve a guest's call
  // before either the challenge or the explicitly expired local window arrives.
  if(o.role==='guest'){local.sent=true;o.session?.send({t:'sync-call-pass',id:d.id,epoch:o.sync.epoch});}
  return false;
 }
 function onlineDecisionTick(){
  const o=online,g=game;if(!onlineMatchActive()||o.role!=='host')return;
  const sync=o.sync,kind=g.phase==='abs-call'?'abs':g.phase==='play-call'?'play':null;
  if(!kind){sync.decision=null;sync.localDecision=null;return;}
  const call=kind==='abs'?g.absCall:g.baseCall;if(!call)return;
  if(!sync.decision||sync.decision.call!==call){
   sync.decision={id:++sync.serial,kind,owner:call.cpu?'guest':'host',call,openedAt:performance.now(),seenAt:null};
   sync.localDecision=null;
  }
  const d=sync.decision,now=performance.now();
  // Uncapped measured RTT (the gameplay equalizer itself is capped at
  // 150 ms); the guest gets 3 seconds after it actually sees the call,
  // plus transport grace for the decision packet.
  const grace=d.owner==='guest'?Math.min(2500,Math.max(500,Math.ceil((o.latency?.ewma||350)*1.5))):0;
  if(sync.lock||g.paused)return;
  if(d.owner==='host'&&d.seenAt!=null&&now-d.seenAt>=ONLINE_CHALLENGE_MS){
   onlinePassDecision(d);
  }else if(d.seenAt==null&&now-d.openedAt>15000||d.owner==='guest'&&d.seenAt!=null&&now-d.seenAt>ONLINE_CHALLENGE_MS+grace+12000){
   onlineSyncLost(); // never commit a decision the remote player did not see
  }
 }
 function onlinePassDecision(d){
  if(!d||online.sync.decision!==d||game.phase!==(d.kind==='abs'?'abs-call':'play-call'))return;
  if(d.kind==='abs')game.resolveAbsCall(false);else game.resolvePlayCall(false);
  online.sync.decision=null;online.sync.localDecision=null;
 }
 function onlineSyncLost(){if(!onlineMatchActive()||online.sync.disconnected)return;online.session?.send({t:'sync-lost'});onlinePeerGone();}
 function onlineHeartbeat(){if(onlineMatchActive()&&!online.sync.disconnected&&performance.now()-online.sync.lastRx>20000)onlineSyncLost();}
 function onlineSyncTick(){
  if(!onlineMatchActive()||online.role!=='host')return;
  const o=online,g=game;onlineDecisionTick();
  if(o.sync.lock||o.sync.disconnected)return;
  if(g.phase==='play-review'&&review.clip&&!review.playback&&$('modal').hidden){onlineStartReplay();return;}
  if(playFeedback.pendingReplay&&g.phase==='result'&&!playFeedback.scoreTime&&!playFeedback.callTime&&!playFeedback.resultTime&&$('modal').hidden&&review.clip){onlineStartReplay();return;}
  const r=o.sync.request;if(r&&onlineSafeMenu(g,r.kind)){o.sync.request=null;onlineAcquire('menu',r.owner,r.kind);}
 }
 function onlineSendGameInput(msg){
  const o=online,sync=o?.sync;if(!o?.session?.open||!sync)return;
  if(msg.t==='abs-challenge'||msg.t==='play-challenge'){
   const kind=msg.t==='abs-challenge'?'abs':'play';
   if(!onlineDecisionVisible(kind))return;
   sync.localDecision.sent=true;msg={...msg,decision:sync.decision.id};
  }
  // Mode changes inside an owned menu are allowed; live input never is.
  if(onlineInputBlocked()&&!(msg.t==='running-mode'&&onlineOwnsMenu()))return;
  o.session.send({...msg,epoch:sync.epoch,pitchSeq:o.remotePitchSeq||0,ct:Math.round(performance.now())});
 }
 function onlineRequestSub(msg){
  const o=online;if(!onlineOwnsMenu()||o.role!=='guest'||o.sync.subPending!=null)return;
  const seq=++o.sync.subSerial;o.sync.subPending=seq;
  o.session?.send({t:'sub',...msg,seq,idLock:o.sync.lock.id,epoch:o.sync.epoch});
  toast('交代内容を同期しています…');
 }
 function onlineCleanup(){if(online?.pingTimer)clearInterval(online.pingTimer);if(online?.delayQueue)online.delayQueue.clear();if(online?.session)online.session.destroy();online=null;}
 // v107 latency equalization: while hosting, hold the host's own timing
 // inputs for the estimated one-way delay (see online.js LatencyEstimator)
 // so they take effect as late as the guest's network-delayed inputs.
 // Offline and guest play are untouched: the delay is 0 unless this client
 // is the started online host with a measured estimate.
 function hostDelayMs(){const o=online;if(!o||o.role!=='host'||!o.started||!game?.onlineGame||game.mirror||!o.latency)return 0;return o.latency.oneWayMs();}
 function hostDelay(fn){const o=online,g=game,d=hostDelayMs(),epoch=o?.sync?.epoch;if(onlineInputBlocked())return 0;if(d<5||!o?.delayQueue){fn();return 0;}return o.delayQueue.push(d,()=>{if(game===g&&online===o&&(!o?.sync||o.sync.epoch===epoch&&!onlineInputBlocked()))fn();});}
 function startHostPing(){const o=online;if(!o||o.role!=='host'||o.pingTimer)return;const ping=()=>{if(online!==o||!o.session?.open)return;o.session.send({t:'ping',ts:Math.round(performance.now())});};ping();o.pingTimer=setInterval(ping,NightOnline.PING_INTERVAL_MS);}
 function onlineClubs(){return[...NightTeams.all,...(NightTeams.npb||[]),...(NightTeams.kbo||[])];}
 function onlineLobbyRefresh(){if(modalKind==='online')onlineModal();}
 // v156 record room (checker item "personal-record-room"): cross-mode
 // personal W/L/D dashboard. commit() is the once-guarded result path
 // shared by every fixture finish (versus / pennant / online host /
 // survival / conquest / draft / APBC・大会), so recording there can
 // never double-count: result-modal re-renders, snapshot restores and
 // rematches either re-enter through a fresh game or not at all, and
 // fixture-id entries are deduplicated again inside NightRecordRoom.
 // The online guest has no local commit, so its end-message handler
 // records through the same module (guarded by o.ended). Excluded:
 // abandoned games, practice / pitching practice, HR derby, time
 // attack (no W/L), umpire & spectate (not the player's own team),
 // farm & all-star exhibitions, scrimmage practice games, and the career modes (their results
 // belong to the career saves, not to a versus record).
 function recordRoomMode(g){
  if(g.onlineGame)return 'online';
  if(g.survival)return 'survival';
  if(g.conquest)return 'conquest';
  if(g.draftBattle)return 'draft';
  if(g.apbcFixtureId||g.ctFixture)return 'apbc';
  if(g.mode==='pennant')return 'pennant';
  return 'match';
 }
 function recordRoomCommit(g,abandoned){
  if(abandoned||!g.isFixture||g.umpireMode||g.spectate||g.timeAttack||g.farmGame||g.allstarEvent||g.scrimmageGame)return;
  NightRecordRoom.recordResult({mode:recordRoomMode(g),result:g.userScore>g.opponentScore?'win':g.userScore<g.opponentScore?'loss':'draw',rs:g.userScore,ra:g.opponentScore,opp:g.teams[g.opponentSide]?.name||'',at:new Date().toISOString(),id:g.leagueFixtureId||g.apbcFixtureId||null});
 }
 function recordRoomModal(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const R=NightRecordRoom,sum=R.summarize(R.load()),t=sum.total;
  const rate=R.formatRate(t);
  const modeRows=sum.byMode.filter(m=>m.games>0).map(m=>`<div class="career-list-row"><div><b>${esc(m.label)}</b><small>勝率 ${R.formatRate(m)} · 得点 ${m.rs} / 失点 ${m.ra}</small></div><strong>${m.games}試合 ${m.w}勝 ${m.l}敗 ${m.d}分</strong></div>`).join('');
  const hist=sum.history.slice(0,10).map(h=>`<div class="career-list-row"><div><b>${esc(R.MODE_LABELS[h.mode]||h.mode)}${h.opp?' · '+esc(h.opp):''}</b><small>${h.at?new Date(h.at).toLocaleDateString('ja-JP'):''}</small></div><strong>${h.result==='win'?'勝':h.result==='loss'?'敗':'分'} ${h.rs} - ${h.ra}</strong></div>`).join('');
  const onlineRec=loadOnlineRecord(),onlineTotal=Object.values(onlineRec.byOpponent||{}).reduce((a,o)=>({w:a.w+(o.w||0),l:a.l+(o.l||0),d:a.d+(o.d||0)}),{w:0,l:0,d:0});
  const survivalBest=(()=>{try{return NightSurvival.loadBest();}catch{return 0;}})();
  modal(`${modalTitle('RECORD ROOM','通算戦績')}<p class="modal-note">モードを横断した、あなた自身の通算戦績です。この記録は v156 以降に終了した試合から蓄積されます（過去の試合は遡って集計できません）。</p>${t.games?`<div class="stats-grid">${[[t.games,'試合','総試合数'],[t.w,'勝','勝利'],[t.l,'敗','敗戦'],[rate,'','勝率（引き分け除く）']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div><p class="modal-note">引き分け ${t.d} · 得点 ${t.rs} / 失点 ${t.ra}</p>`:'<p class="career-status-line">まだ記録された試合がありません。対戦・ペナント・オンラインなどの試合を終えると、ここに通算戦績が蓄積されます。</p>'}${modeRows?`<h3 class="arcade-section-title">モード別</h3>${modeRows}`:''}${hist?`<h3 class="arcade-section-title">最近の試合</h3>${hist}`:''}<h3 class="arcade-section-title">参考（v156より前の記録）</h3><div class="career-list-row"><div><b>従来の対戦記録</b><small>これまでの対戦モードの累計（上の通算には合算していません）</small></div><strong>${records.games}試合 ${records.wins}勝 ${records.draws}分</strong></div><div class="career-list-row"><div><b>オンライン通算（相手球団別）</b><small>オンライン対戦の従来記録</small></div><strong>${onlineTotal.w}勝 ${onlineTotal.l}敗 ${onlineTotal.d}分</strong></div><div class="career-list-row"><div><b>サバイバル ベスト</b><small>勝ち抜きサバイバルの最長連勝</small></div><strong>${survivalBest} 連勝</strong></div><p class="modal-note">対象モード: 通常対戦 / ペナント / オンライン対戦 / サバイバル / 全球団制覇 / ドラフト対決 / APBC・大会。練習・HRダービー・タイムアタック・審判/観戦・二軍戦・オールスター・キャリア系は対象外です。</p><button class="secondary-button" data-action="records-back">プレイ記録へ戻る</button><button class="primary-button" data-action="close">閉じる</button>`,'record-room');
 }
 let bullpenSel=null;
 function setupBullpen(){
  const club=arcadeClub(settings.bullpenClub||settings.pitchingClub);
  bullpenSel={club:club.id,player:settings.bullpenPlayer||club.pitchers[0]?.id,type:'fast',aim:{x:.7,y:.7},session:NightBullpen.createSession(settings.bullpenPlayer||club.pitchers[0]?.id)};
  bullpenModal();
 }
 function bullpenPitcher(){const club=arcadeClub(bullpenSel.club);return club.pitchers.find(p=>p.id===bullpenSel.player)||club.pitchers[0];}
 function bullpenModal(){
  if(!bullpenSel)return;
  const club=arcadeClub(bullpenSel.club),pitcher=bullpenPitcher();
  bullpenSel.player=pitcher.id;
  if(!(pitcher.pitches||['fast']).includes(bullpenSel.type))bullpenSel.type=(pitcher.pitches||['fast'])[0];
  const s=bullpenSel.session,sum=NightBullpen.summarize(s),last=s.pitches[s.pitches.length-1];
  const cx=v=>110+v*56,cy=v=>95+v*56;
  const dots=s.pitches.map((p,i)=>`<circle cx="${cx(p.x)}" cy="${cy(p.y)}" r="${i===s.pitches.length-1?7:5}" fill="${p.strike?'#d5f36a':'#ff9d5c'}" stroke="#14281c" stroke-width="1.5"/>`).join('');
  const aim=bullpenSel.aim;
  const zone=`<svg id="bullpen-zone" class="pitch-map bullpen-zone" viewBox="0 0 220 190" role="button" aria-label="ストライクゾーン図。タップで狙うコースを変更"><rect x="6" y="6" width="208" height="178" rx="7" fill="#1d3a24"/><rect x="${cx(-1.06)}" y="${cy(-1.06)}" width="${2.12*56}" height="${2.12*56}" fill="#304a2b" stroke="#b8cc9a" stroke-width="1.5"/><path d="M${cx(-.353)} ${cy(-1.06)}v${2.12*56}M${cx(.353)} ${cy(-1.06)}v${2.12*56}M${cx(-1.06)} ${cy(-.353)}h${2.12*56}M${cx(-1.06)} ${cy(.353)}h${2.12*56}" stroke="#b8cc9a33"/>${dots}<g stroke="#ffffff" stroke-width="2"><circle cx="${cx(aim.x)}" cy="${cy(aim.y)}" r="8" fill="none"/><path d="M${cx(aim.x)-12} ${cy(aim.y)}h24M${cx(aim.x)} ${cy(aim.y)-12}v24"/></g></svg>`;
  modal(`${modalTitle('BULLPEN','ブルペン投球練習')}
   <p class="modal-note">打者なしで、投手視点で同じ球を繰り返し投げる練習です。既存の「投球練習」は打者との対戦（カウント・奪三振）ですが、ブルペンは狙いと実際の到達点のずれ（散らばり）と変化量だけを確認します。試合の記録（記録室）には数えません。</p>
   <div class="setup-section"><label for="bullpen-club">投手の所属</label><select class="field-select" id="bullpen-club">${arcadeClubOptions(club.id)}</select></div>
   <div class="setup-section"><label for="bullpen-player">投手</label><select class="field-select" id="bullpen-player">${club.pitchers.map(p=>`<option value="${p.id}" ${p.id===pitcher.id?'selected':''}>${p.name} · ${p.velocity} km/h · 制球 ${p.control}</option>`).join('')}</select></div>
   <div class="setup-section"><label>球種</label><div class="segmented bullpen-types">${(pitcher.pitches||['fast']).map(id=>{const t=NightGame.TYPES.find(x=>x.id===id);return `<button data-action="bullpen-type" data-type="${id}" class="${bullpenSel.type===id?'active':''}">${t?t.name:id}</button>`;}).join('')}</div></div>
   <p class="modal-note">ゾーン図をタップして狙うコースを変えられます（白い照準）。点が蓄積表示：黄緑＝ストライク、橙＝ボール、大きい点が直近の投球です。</p>
   ${zone}
   ${last?`<div class="stats-grid">${[[last.speed,'km/h','直近の球速'],[last.breakCm,'cm','変化量（横'+last.breakXCm+' / 縦'+last.breakYCm+'）'],[last.devCm,'cm','狙いとのずれ'],[last.strike?'ストライク':'ボール','','直近の判定']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div>
   <p class="modal-note">直近: ${last.n}球目 ${last.name} · 狙い (${last.aimX.toFixed(2)}, ${last.aimY.toFixed(2)}) → 到達 (${last.x.toFixed(2)}, ${last.y.toFixed(2)})${last.spinRpm!=null?` · 回転数 ${last.spinRpm} rpm`:''}</p>`:'<p class="career-status-line">まだ投げていません。球種と狙うコースを選んで「投げる」を押してください。</p>'}
   ${sum.count?`<h3 class="arcade-section-title">セッション集計（${pitcher.name}）</h3><div class="stats-grid">${[[sum.count,'球','投球数'],[sum.strikeRate,'%','ストライク率'],[sum.avgDevCm,'cm','平均のずれ'],[sum.avgSpeed,'km/h','平均球速']].map(([n,u,l])=>`<div class="stat-box"><strong>${n}<small>${u}</small></strong><span>${l}</span></div>`).join('')}</div>
   ${s.pitches.slice(-5).reverse().map(p=>`<div class="career-list-row"><div><b>${p.n}球目 ${p.name}</b><small>変化 ${p.breakCm}cm · ずれ ${p.devCm}cm</small></div><strong>${p.speed} km/h · ${p.strike?'ストライク':'ボール'}</strong></div>`).join('')}`:''}
   <button class="primary-button" data-action="bullpen-throw">投げる（${(NightGame.TYPES.find(x=>x.id===bullpenSel.type)||{}).name||bullpenSel.type}）</button>
   ${sum.count?'<button class="secondary-button" data-action="bullpen-reset">散らばりをリセット</button>':''}
   <button class="secondary-button" data-action="close">閉じる</button>`,'bullpen');
 }
 function bullpenThrow(){
  if(!bullpenSel)return;
  const pitcher=bullpenPitcher();
  settings.bullpenClub=bullpenSel.club;settings.bullpenPlayer=pitcher.id;save();
  NightBullpen.throwPitch(bullpenSel.session,pitcher,bullpenSel.type,bullpenSel.aim);
  bullpenModal();
 }
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
 // Recent rooms (v112): one tap reconnects as the same role. Host entries
 // reopen the room under the same code; guest entries join that code
 // (and now wait for the host if it is not open yet).
 function recentRoomsHTML(){
  const rooms=NightOnline.loadRooms();if(!rooms.length)return '';
  const name=id=>id?(NightTeams.get(id)?.name||id):'';
  const rows=rooms.map(r=>{
   const clubs=[name(r.club),name(r.opp)].filter(Boolean).join(' vs ');
   return `<div class="career-list-row"><div><b>${r.code}</b><small>${r.role==='host'?'ホスト':'ゲスト'}${clubs?' · '+clubs:''} · ${new Date(r.at).toLocaleDateString('ja-JP')}</small></div><span><button class="secondary-button" data-room-join="${r.code}" data-room-role="${r.role}">再接続</button> <button class="secondary-button" data-room-delete="${r.code}" data-room-role="${r.role}">削除</button></span></div>`;
  }).join('');
  return `<h3 class="arcade-section-title">最近の部屋</h3>${rows}`;
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
 // Online pregame shares the normal match screen, player editor and picker.
 function onlineNormalizeLineup(club,wire){
   const config={order:Array.isArray(wire?.order)?wire.order:[],fielding:wire?.fielding&&typeof wire.fielding==='object'?wire.fielding:{},pitcher:Number.isInteger(wire?.pitcher)&&club.pitchers[wire.pitcher]?wire.pitcher:(NightPlayers.defaultPitcherIndex?.(club)??0)};
   NightSquad.normalize(club,config);return config;
 }
 function onlineSeed(){return 'online/'+Date.now()+'/'+Math.random().toString(36).slice(2);}
 function onlineParkId(){
   const o=online;
   return o.role==='host'?(o.park||NightTeams.get(o.mode==='derby'||o.hostHome?o.myClub:o.guestClub||o.myClub).park):o.config?.park||NightTeams.get(o.config?.club||o.myClub).park;
 }
 function onlineParkDefinition(id,spec){return spec&&String(id).startsWith('custom-')?NightStadium.makePark(spec,id):null;}
 function onlineParkSpec(id){return NightPlayers.parks.find(p=>p.id===id&&p.custom)?.customSpec||null;}
 function onlineSendClub(){
   const o=online;if(!o?.myClub)return;
   if(o.role==='host'){onlineSendLobbyConfig();return;}
   if(!o.session?.open)return;
   const {config}=lineupConfig('online');
   o.session.send({t:'club',club:o.myClub,pitcher:config.pitcher,order:config.order,fielding:config.fielding,ready:!!o.myReady,syncVersion:ONLINE_SYNC_VERSION});
 }
 function onlineBeginEdit(){
   if(online?.role==='guest'&&online.myReady){online.myReady=false;onlineSendClub();}
 }
 let onlineClubGroup='cpbl';
 function onlineTeams(opening=false){
   const o=online;if(!o)return;
   if(opening){onlineBeginEdit();onlineClubGroup=matchPickerGroup(o.myClub||settings.matchTeam);}
   const current=onlineClubs().find(c=>c.id===o.myClub);
   const clubs=onlineClubs().filter(c=>matchPickerGroup(c.id)===onlineClubGroup);
   pfScreen('球団選択',`<div class="pf-current">${current?clubBadge(current.id,true)+'<b>'+uiEscape(current.name)+'</b>':'自チームを選択'}</div><div class="pf-sticky-filter">${pfChoice([['cpbl','CPBL'],['npb','NPB'],['kbo','KBO']],onlineClubGroup,'data-online-group')}</div><div class="pf-team-grid">${clubs.map(c=>`<button type="button" class="pf-team-tile ${current?.id===c.id?'selected':''}" style="--team-color:${pregameColor(c)}" data-online-club="${uiEscape(c.id)}" aria-pressed="${current?.id===c.id}">${clubBadge(c.id)}<b>${uiEscape(c.short)}</b>${current?.id===c.id?`<span class="pf-check">${pfIcon('check')}</span>`:''}</button>`).join('')}</div>`,'online-teams','','online-lobby-back');
 }
 function onlineOptions(){
   if(online?.role!=='host')return;
   pfScreen('詳細設定',`<div class="pf-advanced"><h3 class="arcade-section-title">変則ルール（通常対戦と同じ）</h3>
     ${[['variantFullCount','フルカウント開始','全打席が2ボール2ストライクから始まる'],['variantMetalBat','金属バット','打球の初速が上がり、長打が出やすくなる（低反発バットとは同時使用不可）'],['variantLowReboundBat','低反発バット','打球の初速が下がり、長打が出にくくなる（金属バットとは同時使用不可）'],['variantNoBreaking','変化球禁止','両投手ともストレートのみ（球種ボタンも無効化）'],['variantTwoOuts','2アウト制','2アウトで攻守交代']].map(([v,l,d])=>`<div class="setting-row"><div><strong>${l}</strong><small>${d}</small></div><button class="toggle ${settings[v]?'on':''}" data-toggle="${v}" role="switch" aria-checked="${!!settings[v]}" aria-label="${l}"></button></div>`).join('')}
     <div class="setting-row"><div><strong>ハードコアモード</strong><small>自分の打席の球種・球速表示などを消します（自分の画面だけの設定で、相手には伝わりません）</small></div><button class="toggle ${settings.hardcore?'on':''}" data-toggle="hardcore" role="switch" aria-checked="${!!settings.hardcore}" aria-label="ハードコアモード"></button></div>
     <div class="setting-row"><div><strong>タイブレーク</strong><small>延長は無死1・2塁から開始します（両側共通）</small></div><button class="toggle ${settings.tiebreak?'on':''}" data-toggle="tiebreak" role="switch" aria-checked="${!!settings.tiebreak}" aria-label="タイブレーク"></button></div>
     <h3 class="arcade-section-title">ハンデ（通常対戦と同じ）</h3>
     <div class="setting-label">自分の先行点</div>
     <div class="segmented online-seg" role="group" aria-label="自分の先行点">${[0,1,2,3].map(n=>`<button data-online-handicap="userRuns:${n}" class="${settings.handicapUserRuns===n?'active':''}" aria-pressed="${settings.handicapUserRuns===n}">${n}点</button>`).join('')}</div>
     <div class="setting-label">相手の先行点</div>
     <div class="segmented online-seg" role="group" aria-label="相手の先行点">${[0,1,2,3].map(n=>`<button data-online-handicap="cpuRuns:${n}" class="${settings.handicapCpuRuns===n?'active':''}" aria-pressed="${settings.handicapCpuRuns===n}">${n}点</button>`).join('')}</div>
     <div class="setting-label">自分の攻撃のアウト数</div>
     <div class="segmented online-seg" role="group" aria-label="自分の攻撃のアウト数">${[[3,'3アウト（通常）'],[4,'4アウト（優遇）']].map(([n,l])=>`<button data-online-handicap="userOuts:${n}" class="${settings.handicapUserOuts===n?'active':''}" aria-pressed="${settings.handicapUserOuts===n}">${l}</button>`).join('')}</div>
     <div class="setting-label">相手の攻撃のアウト数</div>
     <div class="segmented online-seg" role="group" aria-label="相手の攻撃のアウト数">${[[3,'3アウト（通常）'],[2,'2アウト（優遇）']].map(([n,l])=>`<button data-online-handicap="cpuOuts:${n}" class="${settings.handicapCpuOuts===n?'active':''}" aria-pressed="${settings.handicapCpuOuts===n}">${l}</button>`).join('')}</div></div>`,'online-options','<button class="pf-primary pf-wide" data-action="online-lobby-back">決定</button>','online-lobby-back');
 }
 function onlinePregame(){
   const o=online,host=o.role==='host',derby=o.mode==='derby',connected=!!o.session?.open;
   const own=onlineClubs().find(c=>c.id===o.myClub),opp=onlineClubs().find(c=>c.id===(host?o.guestClub:o.config?.club));
   const home=host?o.hostHome:!o.config?.hostHome;
   const card=(club,label,side,editable)=>`<button type="button" class="pf-team" ${editable?'data-action="online-teams-open"':'disabled'} style="--team-color:${pregameColor(club)}"><span class="pf-team-label">${label}</span><span class="pf-team-logo">${club?clubBadge(club.id):'<span class="pf-online-unknown">?</span>'}</span><b>${club?uiEscape(club.short):editable?'球団を選択':'選択待ち'}</b><span class="pf-team-side">${derby?'HRダービー':!host&&typeof o.config?.hostHome!=='boolean'?'—':side}</span>${editable?`<i class="pf-team-edit">${pfIcon('swap')}</i>`:''}</button>`;
   const matchup=`<div class="pf-matchup">${card(own,'自チーム',home?'後攻':'先攻',true)}<span class="pf-vs" aria-hidden="true">VS</span>${card(opp,'相手チーム',home?'先攻':'後攻',false)}</div>`;
   const park=(!host&&onlineParkDefinition(onlineParkId(),o.config?.parkSpec))||NightPlayers.parks.find(p=>p.id===onlineParkId())||NightPlayers.parks[0],innings=host?settings.innings:o.config?.innings;
   const room=`<section class="pf-online-room"><div><small>${host?'ホスト':'ゲスト'} / 合言葉</small><b class="online-code">${uiEscape(o.code)}</b></div><div class="pf-online-share"><button class="pf-secondary" data-action="online-copy-code">コピー</button>${host?'<button class="pf-secondary" data-action="online-copy-link">招待リンク</button>':''}${host&&typeof navigator.share==='function'?'<button class="pf-secondary" data-action="online-share-link">共有</button>':''}</div><p class="pf-online-status" role="status">${uiEscape(o.status||'')}</p></section>`;
   const mode=host?pfChoice([['match','通常対戦'],['derby','HRダービー']],o.mode,'data-online-mode'):`<p class="pf-online-mode">${derby?'HRダービー':'通常対戦'}（ホスト設定）</p>`;
   const conditions=derby?'':host?`<div class="pf-conditions"><div><label>先攻・後攻</label>${pfChoice([['away','先攻'],['home','後攻']],home?'home':'away','data-online-side')}</div><div><label>イニング</label>${pfChoice([3,5,9].map(n=>[n,n+'回']),innings,'data-online-innings')}</div></div>`:`<div class="pf-conditions"><div><label>先攻・後攻</label><b>${typeof o.config?.hostHome==='boolean'?(home?'後攻':'先攻'):'—'}</b></div><div><label>イニング</label><b>${innings?innings+'回':'—'}</b></div></div>`;
   const venue=`<section class="pf-venue"><button type="button" class="pf-venue-main" ${host?'data-action="online-park-open"':'disabled'}>${parkMiniSVG(park)}<span><b>${uiEscape(park.name)}</b><small>${host?'球場選択':'ホスト設定'}</small></span><span class="pf-chevron">${host?pfIcon('chevron'):''}</span></button></section>`;
   let roster='';
   if(!derby&&own&&(host||o.conditionSeed)){
     const {config,players}=lineupConfig('online'),pitcher=own.pitchers[config.pitcher];
     const preview=`<span class="pf-order-preview">${players.map((p,i)=>`<span><i>${i+1}</i><b>${uiEscape(p.name)}</b><small>${NightSquad.label(p.fieldPos||p.pos)}</small></span>`).join('')}</span>`;
     roster=`<div class="pf-roster">${pfLink('ball','先発投手',uiEscape(pitcher.name)+` <small class="pf-inline-stat">${pitcher.velocity} km/h</small>`,'online-pitchers-open')}<button type="button" class="pf-link pf-order-link" data-action="online-lineup-open"><span class="pf-link-icon">${pfIcon('lineup')}</span><span class="pf-link-copy"><small>オーダー編成</small><b>${players.length}人</b></span><span class="pf-chevron">${pfIcon('chevron')}</span>${preview}</button></div>`;
   }
   const options=derby?'<p class="modal-note">交互に1スイングずつ、各10スイングで本数と最長飛距離を競います。</p>':host?`<div class="pf-aux"><button data-action="online-options-open">${pfIcon('gear')}<span>詳細設定</span>${pfIcon('chevron')}</button></div>`:(o.config?`<p class="modal-note">対戦条件（ホスト設定）：${uiEscape(onlineConfigSummary(o.config.rules,o.config.handicap))}${o.config.tiebreak?' / タイブレーク':''}</p>`:'');
   const canStart=connected&&!!o.guestClub&&(derby||o.guestReady===true&&o.guestSyncVersion===ONLINE_SYNC_VERSION);
   const launch=host?`<button class="pf-primary" data-action="online-start" ${canStart?'':'disabled'}>${pfIcon('play')}${canStart?(derby?'HRダービー開始':'対戦開始'):o.guestClub?'相手の準備を待っています':'相手の参加を待っています'}</button>`:`<button class="pf-primary" data-action="online-ready" ${own&&connected&&(derby||o.conditionSeed&&o.config?.syncVersion===ONLINE_SYNC_VERSION)?'':'disabled'}>${o.myReady?'準備完了（変更する）':'準備完了'}</button>`;
   pfScreen('オンライン対戦',room+mode+matchup+conditions+venue+roster+options+(o.waitFailed?'<button class="pf-secondary pf-wide" data-action="online-rejoin">もう一度接続する</button>':''),'online',`<div class="pf-launch"><button class="pf-secondary" data-action="online-cancel">${host?'部屋を閉じる':'退出'}</button>${launch}</div>`,'online-cancel');
 }
 function onlineModal(){
   const o=online;let inner='';
   if(!o){
     inner=`<p class="career-status-line">離れた相手と1対1で対戦できます。ホストが部屋を作って合言葉（6文字）を相手に伝え、ゲストがその合言葉で入ります。招待リンクを送れば、開くだけで合言葉が入力された状態になります。接続の仲介にはPeerJSの無料サービスを使います（サーバー代・アカウント不要、要インターネット接続）。</p>
     ${onlineHistoryHTML()}
     ${recentRoomsHTML()}
     <button class="primary-button" data-action="online-host">部屋を作る（ホスト）</button>
     <label class="online-join-label" for="online-code-input">合言葉で参加</label>
     <input id="online-code-input" class="online-code-input" type="text" maxlength="8" placeholder="合言葉を入力" autocomplete="off">
     <button class="primary-button" data-action="online-join">部屋に入る（ゲスト）</button>
     <button class="secondary-button" data-action="close">閉じる</button>`;
   }else{
     onlinePregame();return;
   }
   modal(`${modalTitle('','オンライン対戦')}${inner}`,'online');
   if(!o&&pendingInviteCode){const input=$('online-code-input');if(input&&!input.value)input.value=pendingInviteCode;}
 }
 let pendingInviteCode='';
 function onlineInviteUrl(code){return location.origin+location.pathname+'?room='+encodeURIComponent(code);}
 async function copyText(text){
   try{await navigator.clipboard.writeText(text);return true;}catch{}
   try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return !!ok;}catch{return false;}
 }
 // v143: the host lobby's innings ARE settings.innings (the normal-match
 // value). The room object only mirrors it for the guest-start record;
 // changing it in the lobby writes settings.innings and saves, so the
 // normal match setup shows the same value, and vice versa.
 async function onlineCreateRoom(codeOverride){
   onlineCleanup();
   const code=codeOverride||NightOnline.makeCode();
   online={role:'host',code,session:null,myClub:onlineClubs().some(c=>c.id===settings.matchTeam)?settings.matchTeam:onlineClubs()[0].id,guestClub:null,myPitcher:0,guestPitcher:0,guestReady:false,conditionSeed:onlineSeed(),mode:'match',innings:settings.innings,hostHome:true,park:null,started:false,endSent:false,status:'接続を準備中…',pitchSeq:0,lastPitchObj:null,lastStateAt:0,lastStatePhase:'',latency:new NightOnline.LatencyEstimator(),delayQueue:new NightOnline.InputDelayQueue(),pingTimer:null,lastGuestAgeMs:null};
   onlineModal();
   try{
     online.session=await NightOnline.host(code,{
       onReady:()=>{if(online?.code===code){NightOnline.rememberRoom({code,role:'host',club:online.myClub});online.status='合言葉を相手に伝えてください。接続を待っています…';onlineLobbyRefresh();}},
       onOpen:()=>{if(online?.code===code){online.status='ゲストが接続しました。相手の準備を待っています…';online.session?.send({t:'lobby-mode',mode:online.mode});onlineSendLobbyConfig();onlineLobbyRefresh();startHostPing();}},
       onData:m=>onlineHostData(m),
       onClose:()=>onlinePeerGone(),
       onError:kind=>{if(online?.code===code&&!online.started){online.status=kind==='taken'?'合言葉が重複しました。部屋を作り直してください。':'接続エラーが発生しました。';onlineLobbyRefresh();}}
     });
   }catch{if(online?.code===code){online.status='通信ライブラリを読み込めませんでした。ネット接続を確認してください。';onlineLobbyRefresh();}}
 }
 async function onlineJoinRoom(codeOverride){
   const code=(codeOverride||($('online-code-input')?.value||'')).trim().toUpperCase();
   if(code.length<4){toast('合言葉を入力してください');return;}
   pendingInviteCode='';
   onlineCleanup();
   online={role:'guest',code,session:null,myClub:null,myPitcher:0,myReady:false,conditionSeed:null,config:null,mode:'match',started:false,status:'接続中…',ended:false,lastUiKey:'',lastLat:0,waiting:false,waitAttempts:0,waitFailed:false};
   onlineModal();
   try{
     // Guests wait for the host (v112): if the room is not open yet, the
     // join retries in the background instead of failing, and connects
     // on its own once the host opens the room. 退出する cancels the wait.
     online.session=await NightOnline.join(code,{
       onOpen:()=>{if(online?.code===code){online.waiting=false;online.status='接続しました。自分の球団を選んでください。';if(online.myClub)onlineSendClub();onlineLobbyRefresh();}},
       onData:m=>onlineGuestData(m),
       onClose:()=>onlinePeerGone(),
       onWaiting:n=>{if(online?.code===code&&!online.started){online.waiting=true;online.waitAttempts=n;online.status='ホストを待っています…（自動で再接続を試みています · '+n+'回目）';onlineLobbyRefresh();}},
       onError:kind=>{if(online?.code===code&&!online.started){online.waiting=false;if(kind==='notfound'){online.waitFailed=true;online.status='ホストが見つかりませんでした。ホストが部屋を開いてから、もう一度接続してください。';}else online.status='接続エラーが発生しました。';onlineLobbyRefresh();}}
     },{wait:true,retryMs:3000,maxWaitMs:120000});
   }catch{if(online?.code===code){online.status='通信ライブラリを読み込めませんでした。ネット接続を確認してください。';onlineLobbyRefresh();}}
 }
 function onlinePeerGone(){
   if(!online)return;
   if(online.sync){if(online.sync.disconnected)return;online.sync.disconnected=true;online.delayQueue?.clear();if(review.playback){review.close();$('game').classList.remove('replay-active');$('replay-label').hidden=true;}if(game)game.paused=true;}

   if(online.role==='guest'){
     if(online.started&&!online.ended&&(game?.mirror||game?.onlineDerby)&&game.phase!=='ended'){online.ended=true;game.paused=true;modal(`${modalTitle('','接続が切れました')}<p class="career-status-line">相手との接続が切断されました。</p><button class="primary-button" data-action="online-exit">ホームへ戻る</button>`,'online-gone');}
     else if(!online.started){online.myReady=false;online.status='相手との接続が切れました。';onlineModal();}
     return;
   }
   if(online.started&&game&&game.phase!=='ended'){game.paused=true;modal(`${modalTitle('','接続が切れました')}<p class="career-status-line">相手との接続が切断されました。試合は一時停止しています。</p><button class="primary-button" data-action="online-exit">ホームへ戻る</button>`,'online-gone');}
   else if(!online.started){online.guestClub=null;online.guestLineup=null;online.guestReady=false;online.status='ゲストが退出しました。接続を待っています…';onlineLobbyRefresh();}
 }
 const REACTIONS=['👏','🔥','😂','👍','😱','😤','❤️','🎉','😢','😡','👎','💪'];
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
 let chatTimer=0;
 function showQuickChat(text,mine){
   const el=$('chat-pop');if(!el||!text)return;
   el.textContent=(mine?'':'相手： ')+text;el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
   clearTimeout(chatTimer);chatTimer=setTimeout(()=>{el.classList.remove('show');el.hidden=true;},2600);
 }
 function sendQuickChat(index){
   const text=NightOnline.quickChatText(index);
   if(!text||!online?.started||!online.session?.open)return;
   online.session.send({t:'chat',i:index});showQuickChat(text,true);$('react-panel').hidden=true;
 }
 function onlineHostData(m){
   const o=online;if(!o||o.role!=='host')return;
   if(o.sync)o.sync.lastRx=performance.now();if(m.t==='sync-lost'){onlinePeerGone();return;}
   if(m.t==='pong'){if(o.latency){o.latency.add(performance.now()-Number(m.ts),Number(m.gt),Number(m.ts));const v=o.latency.oneWayMs();if(!o.started&&o._latShown!==v){o._latShown=v;o.session?.send({t:'latency',ms:v});}}return;}
   if(m.t==='club'){
     if(o.started)return;
     const club=onlineClubs().find(c=>c.id===m.club);if(!club)return;
     o.guestClub=club.id;o.guestLineup=onlineNormalizeLineup(club,m);o.guestPitcher=o.guestLineup.pitcher;o.guestReady=m.ready===true;o.guestSyncVersion=m.syncVersion;
     o.session?.send({t:'lobby-mode',mode:o.mode||'match'});onlineSendLobbyConfig();
     o.status=`ゲスト：${club.name} · ${o.mode!=='derby'&&o.guestSyncVersion!==ONLINE_SYNC_VERSION?'最新版に更新してください':o.guestReady||o.mode==='derby'?'準備完了':'編成中'}`;
     onlineLobbyRefresh();return;
   }
   if(m.t==='guest-left'){onlinePeerGone();return;}
   if(m.t==='rematch-yes'&&o.rematchState==='offered'){o.rematchState='';if(o.rematchSwap)o.hostHome=!o.hostHome;startOnlineMatch();return;}
   if(m.t==='rematch-no'&&o.rematchState==='offered'){o.rematchState='declined';if(game&&modalKind==='result')finish(game);else if(modalKind==='online-derby-result')onlineDerbyResultModal();return;}
   if(m.t==='derby-swing'){onlineDerbyOnPeerSwing(m);return;}
   if(m.t==='derby-end'){return;}
   const g=game;if(!g||!o.started)return;
   if(m.t==='react'){showReaction(m.e);return;}
   if(m.t==='chat'){const t=NightOnline.quickChatText(m.i);if(t)showQuickChat(t,false);return;}
   if(Number.isFinite(m.ct)&&o.latency)o.lastGuestAgeMs=o.latency.ageMs(m.ct,performance.now());
   const sync=o.sync;if(!sync||sync.disconnected)return;
   if(m.epoch!==sync.epoch)return;
   if(m.t==='sync-menu'){
     if(!sync.lock&&!sync.request&&['pause','bench','settings','roster','history','box','tactics','howto'].includes(m.kind)){sync.request={kind:m.kind,owner:'guest'};onlineSyncTick();}
     else o.session?.send({t:'sync-menu-denied',epoch:sync.epoch});
     return;
   }
   if(m.t==='sync-done'){onlineMarkDone('guest',m.id);return;}
   if(m.t==='sync-release-ack'){onlineRelease(m.id);return;}
   if(m.t==='sync-call-seen'){const d=sync.decision;if(d?.id===m.id&&d.owner==='guest'&&d.seenAt==null)d.seenAt=performance.now();return;}
   if(m.t==='sync-call-pass'){const d=sync.decision;if(!sync.lock&&!g.paused&&d?.id===m.id&&d.owner==='guest'&&d.seenAt!=null)onlinePassDecision(d);return;}
   if(m.t==='sub'){
     const l=sync.lock;if(!l||l.kind!=='menu'||l.owner!=='guest'||l.done.guest||l.releasing||l.id!==m.idLock)return;
     const ok=applyRemoteSub(g,m);onlineTick(g,true);o.session?.send({t:'sync-sub-result',seq:m.seq,ok});return;
   }
   if(m.t==='running-mode'&&(!sync.lock||sync.lock.kind==='menu'&&sync.lock.owner==='guest'&&!sync.lock.releasing)){g.remoteRunning=!!m.manual;return;}
   if(sync.lock||g.paused)return;
   if(m.t==='abs-challenge'||m.t==='play-challenge'){
     const d=sync.decision,kind=m.t==='abs-challenge'?'abs':'play';
     if(d?.id!==m.decision||d.owner!=='guest'||d.kind!==kind||d.seenAt==null)return;
     if(kind==='abs')g.requestAbsChallenge(true);else if(g.baseCall?.cpu)g.requestPlayChallenge(true);return;
   }
   if(m.pitchSeq!==o.pitchSeq)return;
   if(m.t==='pitch-decision'&&g.phase==='aim'&&g.remotePitching){
     if(m.ibb){g.intentionalWalk(false);return;}
     const kx=g.cursor.x,ky=g.cursor.y;g.pitchType=m.pitchType;g.setCursor(m.aim?.x||0,m.aim?.y||0);g.shift=m.shift?'pull':'none';g.remoteThrowPitch();g.cursor.x=kx;g.cursor.y=ky;
   }else if(m.t==='swing'&&g.phase==='pitch'&&g.remoteBatter&&g.pitch&&!g.pitch.swung){
     if(m.bunt){g.bunt=true;g.buntBall();}
     else g.attempt({x:m.aim?.x||0,y:m.aim?.y||0},!!m.power,Math.max(-1.2,Math.min(1.2,Number(m.delta)||0)),false);
   }else if(m.t==='steal'&&g.remoteBatter){g.steal=!!m.on;}
   else if(m.t==='runner-command'&&g.remoteBatter){g.remoteCommandRunner(m.id,m.base);}

 }
 // Apply a substitution for the guest's team on the authoritative game:
 // briefly treat the guest as the game's user so the standard substitution
 // methods validate and apply against the guest's lineup, then swap back.
 function applyRemoteSub(g,m){
   const flip=()=>{g.userHome=!g.userHome;[g.homePitcherIndex,g.awayPitcherIndex]=[g.awayPitcherIndex,g.homePitcherIndex];[g.usedPitchers,g.usedCpuPitchers]=[g.usedCpuPitchers,g.usedPitchers];};
   let ok=false;const emit=g.emit;flip();g.emit=(type,data)=>{if(type!=='update')emit(type,data);};
   try{
     if(m.kind==='hit'||m.kind==='run')ok=g.substitute(m.id,{type:m.kind,base:m.base});
     else if(m.kind==='pitch')ok=g.changePitcher(Number(m.index));
     else if(m.kind==='defense')ok=g.swapFieldPosition(m.id,m.pos);
   }catch{}finally{flip();g.emit=emit;}updateUI();return !!ok;
 }
 // v182: online matches share the normal match setup. The host picks
 // the variant rules, handicap and tiebreak in the lobby — the values
 // live in settings, exactly like the lobby innings since v143 — and
 // the start message carries them to the guest so both engines run the
 // same match. The variant rules apply to both teams symmetrically and
 // travel as-is; the handicap crosses the wire in ABSOLUTE home/away
 // terms (onlineHandicapWire) so its meaning can never flip with the
 // sides, and each side converts it back to its own perspective
 // (onlineHandicapLocal) when building its NightGame. The engine gates
 // accept these only via the explicit onlineMatch opt-in both starters
 // pass. The starting pitcher is each player's own pick: the guest's
 // rides the club message, the host's the start message. Hardcore is a
 // per-device display choice and is deliberately NOT synced — each
 // side applies its own settings.hardcore locally.
 function onlineRulesConfig(){
   return {fullCount:!!settings.variantFullCount,metalBat:!!settings.variantMetalBat,lowReboundBat:!!settings.variantLowReboundBat,noBreaking:!!settings.variantNoBreaking,twoOuts:!!settings.variantTwoOuts};
 }
 function onlineHandicapWire(){
   return online?.hostHome
     ?{homeRuns:settings.handicapUserRuns,awayRuns:settings.handicapCpuRuns,homeOuts:settings.handicapUserOuts,awayOuts:settings.handicapCpuOuts}
     :{homeRuns:settings.handicapCpuRuns,awayRuns:settings.handicapUserRuns,homeOuts:settings.handicapCpuOuts,awayOuts:settings.handicapUserOuts};
 }
 function onlineHandicapLocal(wire,home){
   if(!wire||typeof wire!=='object')return undefined;
   return home?{userRuns:wire.homeRuns,cpuRuns:wire.awayRuns,userOuts:wire.homeOuts,cpuOuts:wire.awayOuts}
              :{userRuns:wire.awayRuns,cpuRuns:wire.homeRuns,userOuts:wire.awayOuts,cpuOuts:wire.homeOuts};
 }
 function onlineConfigSummary(rules,handicap){
   const names={fullCount:'フルカウント開始',metalBat:'金属バット',lowReboundBat:'低反発バット',noBreaking:'変化球禁止',twoOuts:'2アウト制'};
   const parts=Object.keys(names).filter(k=>rules?.[k]).map(k=>names[k]);
   if(handicap&&(handicap.homeRuns||handicap.awayRuns||handicap.homeOuts!==3||handicap.awayOuts!==3)){
     const h=[];
     if(handicap.homeRuns)h.push(`ホーム先行${handicap.homeRuns}点`);
     if(handicap.awayRuns)h.push(`アウェイ先行${handicap.awayRuns}点`);
     if(handicap.homeOuts!==3)h.push(`ホーム${handicap.homeOuts}アウト`);
     if(handicap.awayOuts!==3)h.push(`アウェイ${handicap.awayOuts}アウト`);
     if(h.length)parts.push('ハンデ（'+h.join('・')+'）');
   }
   return parts.length?parts.join(' / '):'変則ルール・ハンデなし';
 }
 function onlineSendLobbyConfig(){
   const o=online;if(!o||o.role!=='host')return;
   o.session?.send({t:'lobby-config',rules:onlineRulesConfig(),handicap:onlineHandicapWire(),innings:settings.innings,club:o.myClub,hostHome:o.hostHome,park:onlineParkId(),parkSpec:onlineParkSpec(onlineParkId()),conditionSeed:o.conditionSeed,tiebreak:!!settings.tiebreak,syncVersion:ONLINE_SYNC_VERSION});
 }
 function startOnlineMatch(){
   const o=online;if(!o||o.role!=='host'||!o.guestClub||!o.session?.open)return;
   if(o.mode==='derby'){startOnlineDerby();return;}
   const homeId=o.hostHome?o.myClub:o.guestClub,awayId=o.hostHome?o.guestClub:o.myClub;
   const home=NightTeams.get(homeId),away=NightTeams.get(awayId),mine=NightTeams.get(o.myClub);
   if(!home||!away||!mine)return;
   if(o.guestSyncVersion!==ONLINE_SYNC_VERSION||!o.guestReady&&!o.started)return;
   const park=o.park||home.park;
   const {config:hostLineup}=lineupConfig('online'),guestLineup=onlineNormalizeLineup(NightTeams.get(o.guestClub),o.guestLineup);
   if(o.started)o.conditionSeed=onlineSeed();
   const rules=onlineRulesConfig(),forecast=NightGame.rollForecast(NightPlayers.parks.find(p=>p.id===park));
   o.session?.send({t:'start',home:homeId,away:awayId,innings:settings.innings,difficulty:settings.difficulty,park,parkSpec:onlineParkSpec(park),weather:forecast.weather,wind:forecast.wind,rules,handicap:onlineHandicapWire(),tiebreak:!!settings.tiebreak,hostPitcher:hostLineup.pitcher,hostHome:o.hostHome,hostLineup,guestLineup,conditionSeed:o.conditionSeed,syncVersion:ONLINE_SYNC_VERSION});
   NightOnline.rememberRoom({code:o.code,role:'host',club:o.myClub,opp:o.guestClub});
   closeModal(false);unlockAudio();lastMode='match';saved=false;clearCheckpoint();
   game=new NightGame('match',settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:homeId,awayTeamId:awayId,userHome:o.hostHome,innings:settings.innings,park,weather:forecast.weather,wind:forecast.wind,pitcher:hostLineup.pitcher,opponentPitcher:guestLineup.pitcher,order:hostLineup.order,fielding:hostLineup.fielding,opponentOrder:guestLineup.order,opponentFielding:guestLineup.fielding,conditionSeed:o.conditionSeed,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,remoteSide:o.hostHome?'away':'home',variantRules:rules,handicap:{userRuns:settings.handicapUserRuns,cpuRuns:settings.handicapCpuRuns,userOuts:settings.handicapUserOuts,cpuOuts:settings.handicapCpuOuts},onlineMatch:true,tiebreak:!!settings.tiebreak,hardcore:!!settings.hardcore});
   game.onlineGame=true;o.started=true;o.pitchSeq=0;o.lastPitchObj=null;o.lastStateAt=0;o.lastStatePhase='';o.endSent=false;o.rematchState='';o.resultRecorded=false;onlineInitSync(o);
   activateGame();updateStyle();updateUI();
 }
 // Full render state for the guest's mirror game (see NightGame.applyMirror).
 function onlineState(g,o){
   const fieldPhase=['field','result'].includes(g.phase)&&g.field;
   let field=null;
   if(fieldPhase){field={...g.field,trail:undefined,manual:g.field.manual?{...g.field.manual}:g.field.manual};}
   let fsq=0;if(field){if(o._ofield!==g.field){o._ofield=g.field;o._fseq=(o._fseq||0)+1;}fsq=o._fseq;}
   return {
     epoch:o.sync?.epoch??0,lock:o.sync?.lock||null,decision:o.sync?.decision?{id:o.sync.decision.id,kind:o.sync.decision.kind,owner:o.sync.decision.owner}:null,removed:g.removedPlayers,substitutions:g.substitutions,phase:g.phase,pt:g.phaseTime,inning:g.inning,half:g.half,outs:g.outs,balls:g.balls,strikes:g.strikes,
     hs:g.homeScore,as:g.awayScore,home:g.home.slice(),away:g.away.slice(),hh:g.homeHits,ah:g.awayHits,he:g.homeErrors,ae:g.awayErrors,
     bases:g.bases.map(b=>b?1:0),baseIds:g.baseIds.slice(),bi:{...g.battingIndex},batFin:g.batFinished?1:0,
     lu:{home:g.lineups.home.map(p=>[p.id,p.fieldPos||p.pos]),away:g.lineups.away.map(p=>[p.id,p.fieldPos||p.pos])},
     pi:{u:g.homePitcherIndex,c:g.awayPitcherIndex},usedU:g.usedPitchers.slice(),usedC:g.usedCpuPitchers.slice(),
     ps:g.pitchingStats,box:g.box,pitch:g.pitch||null,pitchSeq:o.pitchSeq,
     lastPitch:g.lastPitch?{name:g.lastPitch.name,speed:g.lastPitch.speed,id:g.lastPitch.id,breakCm:g.lastPitch.breakCm,spinRpm:g.lastPitch.spinRpm??null}:null,
    abp:(g.atBatPitches||[]).map(p=>({i:p.id,n:p.name,x:p.x,y:p.y,r:p.result})),
     field,fs:g.fieldSpeed,fsq,hit:g.hit?{kind:g.hit.kind,distance:g.hit.distance}:null,swingAge:g.swingAge,
     absCall:g.absCall||null,absU:g.absRemaining,absCpu:g.absCpuRemaining,halfBreak:g.halfBreak||null,
     baseCall:g.baseCall?{base:g.baseCall.base,type:g.baseCall.type,batSide:g.baseCall.batSide}:null,playU:g.playChallenges,playCpu:g.playCpuChallenges,
     weather:g.weather,weatherLabel:g.weatherLabel,wind:g.wind,next:g.next,umpireLabel:g.umpireLabel,
     batId:g.batter?.id||'',pitId:g.pitcher?.id||'',lat:o.latency?o.latency.oneWayMs():0
   };
 }
 function onlineTick(g,force=false){
   const o=online;if(!o||o.role!=='host'||!o.session?.open||!g||!g.onlineGame)return;
   if(g.pitch&&g.pitch!==o.lastPitchObj){o.lastPitchObj=g.pitch;o.pitchSeq=(o.pitchSeq||0)+1;}
   const now=performance.now();
   const interval=(g.phase==='field'||g.phase==='result')?30:60;
   if(!force&&now-(o.lastStateAt||0)<interval&&g.phase===o.lastStatePhase)return;
   o.lastStateAt=now;o.lastStatePhase=g.phase;
   let s;try{s=JSON.parse(JSON.stringify(onlineState(g,o)));}catch{return;}
   o.session.send({t:'state',s});
 }
 // ----- guest side: a mirror NightGame renders the real game screen -----
 function onlineGuestData(m){
   const o=online;if(!o||o.role!=='guest')return;
   if(o.sync)o.sync.lastRx=performance.now();if(m.t==='sync-lost'){onlinePeerGone();return;}
   if(m.t==='start'){startOnlineGuestMatch(m);return;}
   if(m.t==='start-derby'){startOnlineGuestDerby(m);return;}
   if(m.t==='lobby-mode'){const mode=m.mode==='derby'?'derby':'match',changed=o.mode!==mode;o.mode=mode;if(changed&&!o.started){o.myReady=false;onlineSendClub();if((mode==='derby'&&(modalKind==='online-pitchers'||(modalKind==='lineup'&&lineupContext==='online'))))onlineModal();else onlineLobbyRefresh();}return;}
   if(m.t==='lobby-config'){o.config={rules:m.rules,handicap:m.handicap,innings:m.innings,club:m.club,hostHome:m.hostHome,park:m.park,parkSpec:m.parkSpec,tiebreak:m.tiebreak,syncVersion:m.syncVersion};if(typeof m.conditionSeed==='string')o.conditionSeed=m.conditionSeed;if(!o.started){if(o.mode!=='derby'&&m.syncVersion!==ONLINE_SYNC_VERSION)o.status='ホストとゲストを最新版に更新してください';onlineLobbyRefresh();}return;}
   if(m.t==='host-left'){onlinePeerGone();return;}
   if(m.t==='ping'){o.session?.send({t:'pong',ts:m.ts,gt:Math.round(performance.now())});return;}
   if(m.t==='latency'){o.lastLat=Number(m.ms)||0;return;}
   if(!o.started)return;
   if(m.t==='derby-swing'){onlineDerbyOnPeerSwing(m);return;}
   if(m.t==='derby-end'){onlineDerbyFinish();return;}
   if(m.t==='sync-menu-denied'){o.sync.localIntent=null;return;}
   if(m.t==='sync-replay'){
     const l=o.sync?.lock;if(o.sync.disconnected||!l||l.kind!=='replay'||l.id!==m.id||l.done.guest||review.playback)return;
     closeModal(false);playFeedback.pendingReplay=false;
     if(m.clip?.pitch||m.clip?.frames?.length>1){review.save(game,m.clip);if(launchReplayLocal())return;}
     onlineFinishLocalLock();return;
   }
   if(m.t==='sync-sub-result'){
     if(o.sync?.subPending!==m.seq)return;o.sync.subPending=null;
     if(modalKind==='bench')benchModal(benchTab);
     toast(m.ok?'選手交代を反映しました':'交代できませんでした');return;
   }
   if(m.t==='state'){
     const g=game;if(!g||!g.mirror)return;const s=m.s;
     o.lastLat=s.lat||0;
     if(o.sync&&(o.sync.disconnected||s.epoch<o.sync.epoch))return;
     g.applyMirror(s);
     o.remotePitchSeq=s.pitchSeq;o.sync.decision=s.decision;
     onlineApplyRemoteLock(s);
     const key=[s.epoch,s.lock?.id,s.lock?.releasing,s.decision?.id,s.phase,s.inning,s.half,s.outs,s.balls,s.strikes,s.bases.join(''),s.hs,s.as,s.batId,s.pitId,s.absU,s.absCpu,s.playU,s.playCpu,s.baseCall?s.baseCall.base+'/'+s.baseCall.batSide:'',s.lu.home.map(x=>x[0]).join(','),s.lu.away.map(x=>x[0]).join(',')].join('|');
     if(key!==o.lastUiKey){o.lastUiKey=key;updateUI();}
     $('distance').textContent=s.hit?.distance?s.hit.distance+' m':'';
   }
   else if(m.t==='react')showReaction(m.e);
   else if(m.t==='chat'){const t=NightOnline.quickChatText(m.i);if(t)showQuickChat(t,false);}
   else if(m.t==='walk-replay'){/* host sends the canonical replay clip under a lock */}
   else if(m.t==='msg')onEvent('message',m.d);
   else if(m.t==='clear')onEvent('clear');
   else if(m.t==='snd')onEvent('sound',m.d);
   else if(m.t==='cue')onEvent('cue',m.d);
   else if(m.t==='music')onEvent('music-result',m.d);
   else if(m.t==='rematch'){o.rematchOffer={swap:!!m.swap};if(modalKind==='online-result')guestResultModal();else if(modalKind==='online-derby-result')onlineDerbyResultModal();}
   else if(m.t==='end'){
     if(o.ended)return;o.ended=true;
     const mine=(o.mySide==='home'?m.hs>m.as:m.as>m.hs),draw=m.as===m.hs;
     recordOnlineResult(o.mySide==='home'?o.awayClub:o.homeClub,mine,draw,m.hs,m.as);
    NightRecordRoom.recordResult({mode:'online',result:draw?'draw':mine?'win':'loss',rs:o.mySide==='home'?m.hs:m.as,ra:o.mySide==='home'?m.as:m.hs,opp:NightTeams.get(o.mySide==='home'?o.awayClub:o.homeClub)?.name||'',at:new Date().toISOString()});
     o.lastEnd=m;o.rematchOffer=null;
     guestResultModal();
   }
 }
 // The guest's innings come from the host's start message and are kept
 // only as this match's record (o.innings): a guest never writes the
 // host's choice into their own settings.innings.
 function startOnlineGuestMatch(m){
   const o=online;if(!o)return;if(m.syncVersion!==ONLINE_SYNC_VERSION){toast('双方を最新版に更新してください');return;}
   const home=NightTeams.get(m.home),away=NightTeams.get(m.away);
   if(!home||!away)return;
   const guestHome=typeof m.hostHome==='boolean'?!m.hostHome:m.home===o.myClub,mine=guestHome?home:away,other=guestHome?away:home;
   const guestLineup=onlineNormalizeLineup(mine,m.guestLineup||{pitcher:o.myPitcher}),hostLineup=onlineNormalizeLineup(other,m.hostLineup||{pitcher:Number(m.hostPitcher)||0});
   o.started=true;o.ended=false;o.lastUiKey='';o.homeClub=m.home;o.awayClub=m.away;o.innings=m.innings;o.mySide=guestHome?'home':'away';o.rematchOffer=null;o.lastEnd=null;
   NightOnline.rememberRoom({code:o.code,role:'guest',club:o.myClub,opp:guestHome?m.away:m.home});
   closeModal(false);unlockAudio();lastMode='match';saved=false;clearCheckpoint();
   game=new NightGame('match',m.difficulty||settings.difficulty,onEvent,{clubs:{home,away},homeTeamId:m.home,awayTeamId:m.away,userHome:guestHome,innings:m.innings,park:m.park||home.park,parkDefinition:onlineParkDefinition(m.park,m.parkSpec),weather:m.weather,wind:m.wind,pitcher:guestLineup.pitcher,opponentPitcher:hostLineup.pitcher,order:guestLineup.order,fielding:guestLineup.fielding,opponentOrder:hostLineup.order,opponentFielding:hostLineup.fielding,conditionSeed:m.conditionSeed,defenseSpeed:settings.defenseSpeed,manualRunning:settings.manualRunning,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist,remoteSide:guestHome?'away':'home',variantRules:(m.rules&&typeof m.rules==='object')?m.rules:undefined,handicap:onlineHandicapLocal(m.handicap,guestHome),onlineMatch:true,tiebreak:!!m.tiebreak,hardcore:!!settings.hardcore});
   game.onlineGame=true;game.mirror=true;onlineInitSync(o);game.mirrorSend=onlineSendGameInput;
   // Tell the host this player's baserunning choice so the host engine
   // hands over (or keeps) control of this side's runners accordingly.
   game.mirrorSend({t:'running-mode',manual:!!settings.manualRunning});
   activateGame();updateStyle();updateUI();
 }
 // ----- online HR derby (v141): alternating single swings, simple sync -----
 // Each side bats on its OWN device with the regular derby engine and
 // sends only the resolved result ({hr, distance}); both sides tally the
 // same contest state (NightOnlineDerby.record enforces turn order, so
 // the host ignores out-of-turn guest results, and the host's final
 // derby-end tally closes the contest). No anti-cheat: a modified client
 // could fake a distance — accepted for a friends-only tool.
 function startOnlineDerby(){
   const o=online;if(!o||o.role!=='host'||!o.guestClub)return;
   const hostClub=NightTeams.get(o.myClub),guestClub=NightTeams.get(o.guestClub);
   if(!hostClub||!guestClub)return;
   const park=o.park||hostClub.park;
   const hb=NightOnlineDerby.pickBatter(hostClub),gb=NightOnlineDerby.pickBatter(guestClub);
   if(!hb||!gb)return;
   o.session?.send({t:'start-derby',hostClub:o.myClub,guestClub:o.guestClub,hostBatter:hb.id,guestBatter:gb.id,park,parkSpec:onlineParkSpec(park),swings:NightOnlineDerby.SWINGS_PER_PLAYER,difficulty:settings.difficulty});
   NightOnline.rememberRoom({code:o.code,role:'host',club:o.myClub,opp:o.guestClub});
   setupOnlineDerby({hostClub:o.myClub,guestClub:o.guestClub,hostBatter:hb.id,guestBatter:gb.id,park,parkSpec:onlineParkSpec(park),swings:NightOnlineDerby.SWINGS_PER_PLAYER,difficulty:settings.difficulty},true);
 }
 function startOnlineGuestDerby(m){
   const o=online;if(!o||o.role!=='guest')return;
   o.mode='derby';
   NightOnline.rememberRoom({code:o.code,role:'guest',club:o.myClub,opp:m.guestClub});
   setupOnlineDerby(m,false);
 }
 function setupOnlineDerby(m,amHost){
   const o=online;if(!o)return;
   const hostClub=NightTeams.get(m.hostClub),guestClub=NightTeams.get(m.guestClub);
   if(!hostClub||!guestClub)return;
   const hostBatter=hostClub.batters.find(p=>p.id===m.hostBatter)||NightOnlineDerby.pickBatter(hostClub);
   const guestBatter=guestClub.batters.find(p=>p.id===m.guestBatter)||NightOnlineDerby.pickBatter(guestClub);
   if(!hostBatter||!guestBatter)return;
   const myClub=amHost?hostClub:guestClub,oppClub=amHost?guestClub:hostClub;
   o.derbyContest=NightOnlineDerby.create({swings:m.swings,host:{clubId:m.hostClub,batterId:hostBatter.id,name:hostBatter.name,clubName:hostClub.name},guest:{clubId:m.guestClub,batterId:guestBatter.id,name:guestBatter.name,clubName:guestClub.name}});
   o.derbyMyIndex=amHost?0:1;o.derbyOver=false;o.started=true;o.ended=false;o.endSent=false;o.rematchState='';o.rematchOffer=null;
   closeModal(false);unlockAudio();lastMode='derby';saved=false;clearCheckpoint();
   game=new NightGame('derby',m.difficulty||settings.difficulty,onEvent,{clubs:{home:myClub,away:oppClub},homeTeamId:myClub.id,awayTeamId:oppClub.id,park:m.park||myClub.park,parkDefinition:onlineParkDefinition(m.park,m.parkSpec),practiceBatter:(amHost?hostBatter:guestBatter).id,fieldSpeed:settings.fieldSpeed,battingAssist:settings.battingAssist});
   game.onlineGame=true;game.onlineDerby=true;
   // The offline tournament timer must not end an online turn: the
   // contest is swing-count based, so park the clock far in the future.
   if(game.derby)game.derby.remaining=3600000;
   activateGame();updateStyle();updateUI();
   onlineDerbySyncTurn();
 }
 function onlineDerbyMyTurn(){
   const o=online,c=o?.derbyContest;
   return !!c&&!NightOnlineDerby.isOver(c)&&NightOnlineDerby.turnIndex(c)===o.derbyMyIndex;
 }
 function onlineDerbyScoreHTML(){
   const o=online,c=o?.derbyContest;if(!c)return '';
   return `<div class="derby-record">${c.players.map((p,i)=>`<span>${i===o.derbyMyIndex?'あなた · ':''}${p.name}（${p.clubName}） <b>${p.hr} 本</b> / 最長 <b>${p.maxDistance||'—'} m</b>（残り ${c.swingsPerPlayer-p.used} スイング）</span>`).join('')}</div>`;
 }
 function onlineDerbyWaitModal(){
   const o=online,c=o?.derbyContest;if(!c)return;
   const op=c.players[1-o.derbyMyIndex];
   modal(`${modalTitle('ONLINE HR DERBY','相手の番です')}<p class="career-status-line">${op.name}（${op.clubName}）が打っています…</p>${onlineDerbyScoreHTML()}<p class="modal-note">交互に1スイングずつ、各${c.swingsPerPlayer}スイングで本数と最長飛距離を競います。</p>`,'online-derby-wait');
 }
 function onlineDerbySyncTurn(){
   const o=online;if(!o?.derbyContest||!game?.onlineDerby)return;
   if(NightOnlineDerby.isOver(o.derbyContest)){onlineDerbyFinish();return;}
   if(onlineDerbyMyTurn()){
     if(modalKind==='online-derby-wait')closeModal(false);
     game.paused=false;
   }else{
     game.paused=true;
     onlineDerbyWaitModal();
   }
   updateUI();
 }
 function onlineDerbyOnHit(data){
   const o=online;if(!o?.derbyContest||!game?.onlineDerby||o.derbyOver)return;
   if(!onlineDerbyMyTurn())return;
   playFeedback.pendingReplay=false;
   const res={hr:data?.kind==='hr',distance:Math.round(Number(data?.distance)||0)};
   if(!NightOnlineDerby.record(o.derbyContest,o.derbyMyIndex,res))return;
   o.session?.send({t:'derby-swing',hr:res.hr,distance:res.distance});
   if(NightOnlineDerby.isOver(o.derbyContest)&&o.role==='host')onlineDerbySendEnd();
   onlineDerbySyncTurn();
 }
 function onlineDerbyOnPeerSwing(m){
   const o=online;if(!o?.derbyContest||o.derbyOver)return;
   // Turn order is enforced inside record(): an out-of-turn or duplicate
   // result changes nothing on either side (host-side validation too).
   if(!NightOnlineDerby.record(o.derbyContest,1-o.derbyMyIndex,{hr:!!m.hr,distance:Number(m.distance)||0}))return;
   if(NightOnlineDerby.isOver(o.derbyContest)){
     if(o.role==='host')onlineDerbySendEnd();
     onlineDerbyFinish();return;
   }
   onlineDerbySyncTurn();
 }
 function onlineDerbySendEnd(){
   const o=online,c=o?.derbyContest;if(!c||o.endSent)return;
   o.endSent=true;
   o.session?.send({t:'derby-end',winner:NightOnlineDerby.winner(c),players:c.players.map(p=>({hr:p.hr,maxDistance:p.maxDistance,used:p.used}))});
 }
 function onlineDerbyFinish(){
   const o=online;if(!o?.derbyContest||o.derbyOver)return;
   o.derbyOver=true;o.ended=true;
   if(game)game.paused=true;
   const c=o.derbyContest,w=NightOnlineDerby.winner(c),draw=w==='draw',mine=w===o.derbyMyIndex;
   const me=c.players[o.derbyMyIndex],op=c.players[1-o.derbyMyIndex];
   recordOnlineResult(op.clubId,mine,draw,me.hr,op.hr);
   onlineDerbyResultModal();
 }
 function onlineDerbyResultModal(){
   const o=online,c=o?.derbyContest;if(!c)return;
   const w=NightOnlineDerby.winner(c),draw=w==='draw',mine=w===o.derbyMyIndex;
   const offer=o.role==='guest'?o.rematchOffer:null;
   const hostButtons=o.role==='host'
     ?(o.rematchState==='offered'?'<p class="modal-note">再戦を申し込みました。相手の返答を待っています…</p>'
       :o.rematchState==='declined'?'<p class="modal-note">再戦は見送られました。</p>'
       :'<button class="primary-button" data-action="derby-rematch">再戦を申し込む</button>')
     :'';
   modal(`${modalTitle('ONLINE HR DERBY','結果')}<p class="career-status-line">${draw?'引き分け':mine?'あなたの勝利！':'あなたの敗戦'}</p>${onlineDerbyScoreHTML()}<p class="modal-note">勝敗は本数 → 最長飛距離の順で決まります。</p>${offer?`<p class="career-status-line">ホストから再戦の申し込みが届きました</p><button class="primary-button" data-action="rematch-accept">再戦する</button><button class="secondary-button" data-action="rematch-decline">見送る</button>`:hostButtons+'<button class="secondary-button" data-action="online-exit">ホームへ戻る</button>'}`,'online-derby-result');
 }
 function hideOnlineGuest(){const v=$('online-view');if(v)v.hidden=true;}
 let finalResultState=null;
 function showFinalResult(){
  const s=finalResultState;if(!s||s.g!==game)return;
  const {g,report,title,newDistance,tab}=s;
  const tabs=[['summary','試合結果'],['away',g.teams.away.short],['home',g.teams.home.short]];
  const body=tab==='summary'?resultHighlightsHTML(report):playerBoxHTML(report,tab);
  modal(`${modalTitle('','試合終了',false)}${finalScoreCard(report,g.userSide)}<div class="segmented ui-result-tabs" role="group">${tabs.map(([key,label])=>`<button data-final-tab="${key}" aria-pressed="${tab===key}" class="${tab===key?'active':''}">${label}</button>`).join('')}</div><div class="ui-result-body">${body}</div>${g.umpireMode?umpireResultHTML(g):''}${newDistance?'<div class="new-best">最長飛距離を更新</div>':''}${g.onlineGame&&online?.role==='host'?onlineRematchButtons():''}<div class="ui-action-dock"><button class="secondary-button" data-action="home">ホームへ戻る</button><button class="primary-button" data-action="${g.umpireMode?'umpire-restart':'restart'}">${g.umpireMode?'もう一度審判する':'もう一度プレイ'}</button></div>`,'result');
 }
 function finish(g){
   if(g.mode==='match'||g.mode==='pennant'||g.apbcFixtureId)foldCareerTotals(g);
   if(g.timeAttack){finishTimeAttackResult(g);return;}
   if(g.survival){finishSurvivalResult(g);return;}
   if(g.conquest){finishConquestResult(g);return;}
   if(g.ctFixture){finishCustomTourney(g);return;}
   if(g.worldFixture){finishWorld(g);return;}
   if(g.career){finishCareer(g);return;}
   if(g.apbcFixtureId){finishTournament(g);return;}
   if(g.mode==='pennant'){finishLeague(g);return;}
   if(g.derby&&g.derbyTransition){derbyTurnResult(g);return;}
   if(g.scrimmageGame){commit(g);checkAchievements(g);$('swing').disabled=true;modal(`${modalTitle('','紅白戦 結果',false)}<div class="result-hero"><div class="league-versus final-versus"><div><b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div><b>${g.teams.home.name}</b></div></div></div><p class="modal-note">練習試合のため、ペナントの順位・シーズン成績・二軍育成には影響せず、記録室にも記録されません。</p><button class="primary-button" data-action="scrimmage-back">${g.scrimmageSource==='pennant'?'ペナントへ戻る':'ホームへ戻る'}</button>`,'result');return;}
   if(g.farmGame){const credited=league?league.farmGameCredit(g):[];if(league)saveLeague();commit(g);checkAchievements(g);$('swing').disabled=true;modal(`${modalTitle('','二軍戦 結果',false)}<div class="result-hero"><div class="league-versus final-versus"><div><b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div><b>${g.teams.home.name}</b></div></div></div><p class="modal-note">${credited.length?`出場した二軍選手 ${credited.length} 名に育成クレジット（通常の2節分）が入りました。`:'出場した二軍選手はいませんでした。'}</p><button class="primary-button" data-action="farm-back">ペナントへ戻る</button>`,'result');return;}
   if(g.allstarEvent){if(league){league.completeAllstar();saveLeague();}commit(g);checkAchievements(g);$('swing').disabled=true;modal(`${modalTitle('','オールスター結果',false)}<div class="result-hero"><div class="league-versus final-versus"><div><b>${g.teams.away.name}</b></div><strong class="final-score"><b>${g.awayScore}</b><span>−</span><b>${g.homeScore}</b></strong><div><b>${g.teams.home.name}</b></div></div></div><button class="primary-button" data-action="allstar-back">ペナントへ戻る</button>`,'result');return;}
   if(g.onlineGame&&online?.role==='host'&&online.started&&!online.resultRecorded){online.resultRecorded=true;recordOnlineResult(online.guestClub,g.userScore>g.opponentScore,g.homeScore===g.awayScore,g.homeScore,g.awayScore);}
   const newDistance=g.session.maxDistance>records.maxDistance;commit(g);checkAchievements(g);$('swing').disabled=true;
   const win=g.userScore>g.opponentScore,draw=g.homeScore===g.awayScore,match=g.mode==='match',pitching=g.mode==='pitching';
   const title=match?(win?'勝利':draw?'引き分け':'敗戦'):pitching?'投球練習結果':'打撃練習結果';
   if(match&&win)sound('win');
   const stats=pitching?[[g.session.ks,'奪三振'],[g.session.thrown,'投球数'],[g.session.allowed,'失点']]:[[g.session.hits,'安打'],[g.session.hr,'本塁打'],[g.session.maxDistance+' m','最長飛距離']];
   const report=match?buildMatchReport(g):null;
   if(match){finalResultState={g,report,title,newDistance,tab:'summary'};showFinalResult();return;}
   modal(`${modalTitle('',title,false)}<div class="result-stats">${stats.map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</div>${g.umpireMode?umpireResultHTML(g):''}${newDistance?'<div class="new-best">最長飛距離を更新</div>':''}<button class="primary-button" data-action="${g.umpireMode?'umpire-restart':'restart'}">${g.umpireMode?'もう一度審判する':'もう一度プレイ'}</button><button class="secondary-button" data-action="home">ホームへ戻る</button>`,'result');

 }
 function home(){
  editHubChild='';leagueEditorFromHub=false;
  try{speechSynthesis.cancel();}catch{}
  stopReplay();
  if(online?.started){
   if(!online.endSent)online.session?.send({t:online.role==='guest'?'guest-left':'host-left'});
   onlineCleanup();hideOnlineGuest();
  }
  review.reset();resetPlayFeedback();updatePlayTools();updateChallenge();resetCareerOverlay();queuedBench=false;stadiumAudio.stopEffects();
  if(game&&!saved){if(game.isFixture||game.career||game.worldFixture)checkpoint();else commit(game,true);}
  closeModal(false);game=null;finalResultState=null;onEvent('clear');trackHome();
  const y=changeScreen('home');matchContext='match';
  for(const id of ['career','apbc-cup','pennant','game','pause','sub','react','react-panel'])$(id).hidden=true;
  $('home').hidden=false;$('settings').hidden=false;
  history.replaceState({nightball:'home'},'',location.href);
  renderMenuClubs();updateResume();restorePageScroll(y);
 }
 function swing(){if(!game||game.paused||onlineInputBlocked()||game.umpireMode||game.spectate)return;
   const g=game;
   // Host latency equalization: capture the decision as made (pitch type /
   // aim / shift) and let the delay queue fire it one-way-delay later; the
   // swing timing itself is judged at fire time, like the guest's is.
   const cap={pitchType:g.pitchType,x:g.cursor.x,y:g.cursor.y,shift:g.shift};
   hostDelay(()=>{g.pitchType=cap.pitchType;g.setCursor(cap.x,cap.y);g.shift=cap.shift;const done=g.defending?g.throwPitch():g.swing();if(done)$('swing').disabled=true;});
 }
 const types=NightGame.TYPES;
 function renderPitchDirections(g){
  const key=NightPlayers.ratingVersion+'/'+g.pitcher.id+'/'+g.pitcher.pitches.join(',');if($('pitch-types').dataset.key===key)return;$('pitch-types').dataset.key=key;
  // v179: Power Pro style pitch picker, following the reference
  // layout the user supplied. A ball sits at the centre; around it,
  // one chunky blue arrow marker per pitch points in that pitch's
  // true break direction (engine screen direction: +bx is
  // screen-right for a right-handed pitcher, mirrored for
  // left-handers, +by is down; the fastball points up) and carries
  // the break level as a number inside the arrow; the pitch name
  // rides on a blue pill beyond the arrow in the same direction.
  // Every control is blue (the user waived the reference's gold).
  // No panel behind any of it (v178). Arrows start on a ring at
  // each pitch's exact break angle and relax apart when two breaks
  // nearly coincide; pills start on a ring along the same
  // direction and relax as rectangles, so the worst real
  // repertoires (sinker + curve sit 20 degrees apart) still never
  // overlap. If a repertoire cannot fit, the deck grows taller
  // once and lays out again. Speeds stay off the pills — the
  // selected pitch's speed / break still shows in the pitch-info
  // display, as before (updateUI keeps filling the hidden <small>
  // each pill carries for it).
  // v181: proportions aligned to the user's own mockup (an edited
  // real-device screenshot): the ball grows to 38px and sits lower
  // and a touch more central on the stage (the deck itself shifts
  // down in game-hud.css), the pills grow to 96x38px and ride on a
  // circle of radius 80 around the ball instead of the wider,
  // flatter ellipse — in the mockup the bottom pills hang lower
  // (about +64px under the ball) and the whole cluster reads as a
  // ring, not a row. Arrow markers grow to 28px on a ring of 41.
  const orderIds=['slider','sweeper','cutter','shoot','twoseam','oneseam','curve','knucklecurve','powercurve','slurve','slowcurve','fork','split','vslider','sinker','screw','change','palm','knuckle','slowball'];
  const flip=g.pitcher.hand==='L'?-1:1;
  // v183: pitchSpec scales every break by 1.3, so the level divisor
  // grows by the same factor (18 -> 23.4) and a level keeps meaning
  // exactly what it meant before the break rebalance.
  const items=g.pitcher.pitches.map(id=>{const p=NightGame.pitchSpec(g.pitcher,id),dx=p.bx*flip,dy=p.by;return{id,p,dx,dy,level:Math.max(1,Math.min(7,Math.round(Math.hypot(p.bx,p.by)*82/23.4)))};});
  const fast=items.find(i=>i.id==='fast');
  const breaking=items.filter(i=>i.id!=='fast').sort((a,b)=>orderIds.indexOf(a.id)-orderIds.indexOf(b.id));
  const W=264,CX=W/2,PW=96,PH=38;
  const angOf=b=>b.id==='fast'?-Math.PI/2:Math.atan2(b.dy,b.dx);
  const layout=H=>{
   const CY=H/2+8;
   // v187: relaxation may spread markers/pills around the ball, but
   // never rotate one far from its true break angle — with the
   // changeup corrected to the arm side it sits ~5 degrees from the
   // curve, and the unconstrained relaxation used to shove the curve
   // pill to nearly pure-left (and, in the sinker repertoire, the
   // sinker pill above the ball), i.e. the deck itself started lying
   // about directions. Clamp every point's angular drift from its
   // true angle to 35 degrees at its current radius. The pill
   // Pill separation pushes along the line between the two centres
   // (separating-axis style): for two pills stacked near the bottom
   // that line is mostly horizontal, so a crowded pair escapes
   // sideways instead of one pill being shoved up toward horizontal.
   const trueAng=new Map(items.map(b=>[b.id,angOf(b)]));
   const clampDrift=(p,maxDrift)=>{
    const dx=p.x-CX,dy=p.y-CY,d=Math.hypot(dx,dy);if(!d)return;
    let diff=Math.atan2(dy,dx)-trueAng.get(p.id);diff=((diff+Math.PI*3)%(Math.PI*2))-Math.PI;
    if(Math.abs(diff)>maxDrift){const a=trueAng.get(p.id)+Math.sign(diff)*maxDrift;p.x=CX+Math.cos(a)*d;p.y=CY+Math.sin(a)*d;}
   };
   const arrows=new Map();
   for(const b of items){const a=angOf(b);arrows.set(b.id,{x:CX+Math.cos(a)*41,y:CY+Math.sin(a)*41});}
   const apts=items.map(b=>({id:b.id,...arrows.get(b.id)}));
   for(let it=0;it<240;it++){
    let moved=false;
    for(let i=0;i<apts.length;i++)for(let j=i+1;j<apts.length;j++){
     const a=apts[i],c=apts[j];let dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy);
     if(d<29){if(d<.01){dx=0;dy=1;d=1;}const ux=dx/d,uy=dy/d,push=(29-d)/2;a.x-=ux*push;a.y-=uy*push;c.x+=ux*push;c.y+=uy*push;moved=true;}
    }
    for(const p of apts){const dx=p.x-CX,dy=p.y-CY,d=Math.hypot(dx,dy)||1,r=Math.max(35,Math.min(62,d));p.x=CX+dx/d*r;p.y=CY+dy/d*r;p.x=Math.max(14,Math.min(W-14,p.x));p.y=Math.max(14,Math.min(H-14,p.y));clampDrift(p,.61);}
    if(!moved)break;
   }
   for(const p of apts)arrows.set(p.id,{x:p.x,y:p.y});
   const pills=new Map();
   for(const b of items){const a=arrows.get(b.id),dx=a.x-CX,dy=a.y-CY,d=Math.hypot(dx,dy)||1;pills.set(b.id,{x:CX+dx/d*80,y:CY+dy/d*80});}
   const ppts=items.map(b=>({id:b.id,...pills.get(b.id)}));
   for(let it=0;it<300;it++){
    let moved=false;
    for(let i=0;i<ppts.length;i++)for(let j=i+1;j<ppts.length;j++){
     const a=ppts[i],c=ppts[j];let dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy);
     if(d<.01){dx=0;dy=1;d=1;}
     const ux=dx/d,uy=dy/d,need=(PW+18)*Math.abs(ux)+(PH+18)*Math.abs(uy);
     if(d<need){const push=(need-d)/2;a.x-=ux*push;a.y-=uy*push;c.x+=ux*push;c.y+=uy*push;moved=true;}
    }
    for(const p of ppts){p.x=Math.max(PW/2,Math.min(W-PW/2,p.x));p.y=Math.max(PH/2,Math.min(H-PH/2,p.y));
     const dx=p.x-CX,dy=p.y-CY,d=Math.hypot(dx,dy);if(d<76&&d>0){const r=76/d;p.x=CX+dx*r;p.y=CY+dy*r;}else if(d>100){const r=100/d;p.x=CX+dx*r;p.y=CY+dy*r;}clampDrift(p,.61);}
    if(!moved)break;
   }
   // Repair pass: if the relaxation still leaves a pair overlapping
   // (three arm-side pills can crowd one quadrant past what pushes
   // can settle), scan a grid around the crowded pill's true
   // direction for the nearest clearing spot — first with a gap
   // wide enough to keep the v152 tap expansions from colliding,
   // then with a minimal gap, and only as a last resort anywhere
   // around the ball (the arrow beside the ball keeps pointing in
   // the true direction regardless; the pill carries the name).
   const clears=(x,y,self,mx,my)=>ppts.every(q=>q===self||Math.abs(q.x-x)>=PW+mx||Math.abs(q.y-y)>=PH+my);
   for(const p of ppts){
    if(clears(p.x,p.y,p,1,1))continue;
    const ta=trueAng.get(p.id);let bx=0,by=0,bcost=Infinity;
    const scan=(a0,a1,mx,my,flipPenalty)=>{
     for(let da=a0;da<=a1;da+=.035)for(let r=70;r<=100;r+=4){
      const x=CX+Math.cos(ta+da)*r,y=CY+Math.sin(ta+da)*r;
      if(x<PW/2||x>W-PW/2||y<PH/2||y>H-PH/2||!clears(x,y,p,mx,my))continue;
      const cost=Math.abs(((da+Math.PI*3)%(Math.PI*2))-Math.PI)*57.3+Math.abs(r-80)*.5+(Math.sign(Math.sin(ta+da))!==Math.sign(Math.sin(ta))?flipPenalty:0);
      if(cost<bcost){bcost=cost;bx=x;by=y;}
     }
    };
    scan(-.61,.611,7,7,0);
    if(bcost===Infinity)scan(-.61,.611,1,1,0);
    if(bcost===Infinity)scan(-Math.PI,Math.PI,1,1,25);
    if(bcost<Infinity){p.x=bx;p.y=by;}
   }
   for(const p of ppts)pills.set(p.id,{x:p.x,y:p.y});
   let worst=Infinity;
   for(let i=0;i<ppts.length;i++)for(let j=i+1;j<ppts.length;j++){const a=ppts[i],c=ppts[j];worst=Math.min(worst,Math.max(Math.abs(c.x-a.x)-PW,Math.abs(c.y-a.y)-PH));}
   return{CY,arrows,pills,worst};
  };
  let H=204,laid=layout(H);
  if(laid.worst<2){H=232;laid=layout(H);}
  const arrowMark=b=>{
   const p=laid.arrows.get(b.id),deg=b.id==='fast'?-90:Math.round(Math.atan2(p.y-laid.CY,p.x-CX)*180/Math.PI);
   return `<span class="pt-arrow-mark" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px" aria-hidden="true"><span class="pt-arrow-shape" style="transform:rotate(${deg}deg)"></span>${b.id==='fast'?'':`<span class="pt-arrow-num">${b.level}</span>`}</span>`;
  };
  const pill=b=>{
   const p=laid.pills.get(b.id);
   return `<button class="pitch-type ${b.id==='fast'?'straight':'breaking'}" data-pitch="${b.id}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px" aria-label="${b.p.name}${b.id==='fast'?'':' 変化量'+b.level}"><span class="pt-name">${b.p.name}</span><small aria-hidden="true"></small></button>`;
  };
  $('pitch-types').style.height=H+'px';
  $('pitch-types').innerHTML=`<div class="pitch-ball" style="left:${CX}px;top:${laid.CY}px" aria-hidden="true"></div>`+items.map(arrowMark).join('')+[...breaking,...(fast?[fast]:[])].map(pill).join('');
 }

 $('pitch-types').addEventListener('click',e=>{const b=e.target.closest('[data-pitch]');if(b&&game&&!game.umpireMode&&!game.spectate&&game.phase==='aim'){game.pitchType=b.dataset.pitch;sound('tap');updateUI();}});
 function bindFieldAim(el){
  let gesture=null;
  const clear=()=>{if(gesture)gesture.game.touch=null;gesture=null;};
  const valid=()=>gesture&&gesture.game===game&&gesture.epoch===online?.sync?.epoch&&!game.paused&&!game.umpireMode&&!game.spectate&&!(game.autoDefense&&game.defending)&&screen==='game'&&gesture.half===game.half&&gesture.inning===game.inning&&gesture.defending===game.defending;
  const move=e=>{if(!gesture||gesture.pointer!==e.pointerId||!valid()||!['aim','windup','pitch'].includes(game.phase))return;const r=el.getBoundingClientRect();
   const thumb=e.pointerType!=='mouse'&&e.pointerType!=='pen';
   const x=e.clientX-r.left+(thumb?(settings.leftHanded?settings.cursorShift:-settings.cursorShift):0),y=e.clientY-r.top-(thumb?settings.cursorLift:0);
   const aim=renderer.screenToAim?renderer.screenToAim(x,y):{x:(x/r.width*480-265)/75,y:(y/r.height*540-400)/64};game.setCursor(aim.x,aim.y);game.touch={x:(e.clientX-r.left)/r.width*480,y:(e.clientY-r.top)/r.height*540};
  };
  el.addEventListener('pointerdown',e=>{
   if(gesture||!game||game.paused||game.umpireMode||game.spectate||game.autoDefense&&game.defending||screen!=='game'||e.button!==0||(game.defending?game.phase!=='aim':!['intro','windup','pitch'].includes(game.phase)&&!(game.phase==='aim'&&(game.remotePitching||game.mirror))))return;
   e.preventDefault();unlockAudio();gesture={pointer:e.pointerId,epoch:online?.sync?.epoch,game,half:game.half,inning:game.inning,defending:game.defending};el.setPointerCapture(e.pointerId);move(e);
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
 const releases=globalThis.NightballReleases||[];
 const latestRelease=releases[0];
 const releaseTitle=r=>'v'+r.version+' '+r.title;
 const releaseReadKey='nightball.releaseSeen';
 function markReleaseRead(){
  if(!latestRelease)return;
  try{localStorage.setItem(releaseReadKey,String(latestRelease.version));}catch{}
  delete $('menu-notices').dataset.unread;
 }
 function releaseHistory(){
  markReleaseRead();
  modal(`${modalTitle('','更新履歴')}${releases.map((r,i)=>`<section class="release-note"><h3>${releaseTitle(r)}</h3><p>${r.detail}</p>${r.items.length?`<ul>${r.items.map(t=>`<li>${t}</li>`).join('')}</ul>`:''}</section>`).join('')}<button class="secondary-button" data-action="home-notices">お知らせ</button>`,'release-history');
 }
 const homeNotices=[
  ...(latestRelease?[{title:releaseTitle(latestRelease),detail:latestRelease.detail,open:releaseHistory}]:[]),
  {title:'APBCモード',detail:'日本・台湾・韓国・豪州が参戦',open:apbcHub},
  {title:'オンライン対戦',detail:'ルームを作成・参加',open:onlineModal},
  {title:'選手キャリア',detail:'選手の育成・シーズンの進行',open:worldDashboard},
 ];
 const noticeRegion=document.querySelector('.menu-notices'),noticeCard=$('notice-card');
 const noticeCopy=noticeCard.querySelector('.notice-card-copy');
 noticeRegion.querySelector('.notice-pages').innerHTML=homeNotices.map((_,i)=>`<button type="button" data-notice-index="${i}" aria-label="お知らせ ${i+1}" aria-current="${i===0}"></button>`).join('');
 $('notice-title').textContent=homeNotices[0].title;
 $('notice-detail').textContent=homeNotices[0].detail;
 try{if(latestRelease&&Number(localStorage.getItem(releaseReadKey)||0)>=latestRelease.version)delete $('menu-notices').dataset.unread;else if(latestRelease)$('menu-notices').dataset.unread='true';}catch{}
 const hoverNotices=matchMedia('(hover: hover)');
 const noticeInterval=6000;
 let homeNoticeIndex=0,noticeAnimation,noticeGesture=null,noticeClickUntil=0;
 let nextNoticeAt=0;
 function showHomeNotice(index,manual=true){
  const direction=Math.sign(index-homeNoticeIndex);
  const next=(index+homeNotices.length)%homeNotices.length;
  if(manual)nextNoticeAt=performance.now()+noticeInterval;
  if(next===homeNoticeIndex)return;
  homeNoticeIndex=next;
  const {title,detail}=homeNotices[homeNoticeIndex];
  $('notice-title').textContent=title;
  $('notice-detail').textContent=detail;
  noticeRegion.querySelectorAll('[data-notice-index]').forEach((button,i)=>button.setAttribute('aria-current',String(i===homeNoticeIndex)));
  noticeAnimation?.cancel();
  if(!reduceAbsMotion.matches)noticeAnimation=noticeCopy.animate?.(
   [{transform:'translateX('+(direction*18)+'px)',opacity:.35},{transform:'translateX(0)',opacity:1}],
   {duration:300,easing:'cubic-bezier(.2,.65,.3,1)'}
  );
 }
 window.setInterval(()=>{
  if(screen!=='home'||document.hidden||modalKind||reduceAbsMotion.matches||performance.now()<nextNoticeAt||noticeGesture)return;
  if(noticeRegion.matches(':focus-within')||(hoverNotices.matches&&noticeRegion.matches(':hover')))return;
  const bounds=noticeCard.getBoundingClientRect();
  const visibleHeight=Math.min(window.innerHeight,bounds.bottom)-Math.max(0,bounds.top);
  if(bounds.height&&visibleHeight>=bounds.height*.5)showHomeNotice(homeNoticeIndex+1,false);
 },noticeInterval);
 function openHomeNotice(index){
  const notice=homeNotices[index];
  if(!notice)return;
  if(index===0&&latestRelease)markReleaseRead();
  notice.open();
 }
 function homeNoticesModal(){
  modal(`${modalTitle('','お知らせ')}${homeNotices.map(({title},i)=>`<button class="secondary-button" data-open-notice="${i}">${title}</button>`).join('')}<button class="secondary-button" data-action="howto">遊び方</button>`,'home-notices');
 }
 $('bench-button').onclick=requestBench;$('sub').onclick=requestBench;
 $('bunt').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate&&game.mode!=='derby'){game.bunt=true;game.power=false;updateStyle();sound('tap');}};
 $('steal').onclick=()=>{if(game&&!onlineInputBlocked()&&!game.umpireMode&&!game.spectate&&game.inMatch){const g=game,target=!g.steal;const apply=()=>{g.steal=target;updateStyle();};if(hostDelayMs()>=5&&['aim','intro','windup'].includes(g.phase))hostDelay(apply);else apply();sound('tap');}};
 $('ibb').onclick=()=>{if(game&&!game.umpireMode){const g=game;hostDelay(()=>{if(g.intentionalWalk()){sound('tap');updateUI();}});}};
 $('contact').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate){game.power=false;game.bunt=false;updateStyle();sound('tap');}};$('power').onclick=()=>{if(game&&!game.umpireMode&&!game.spectate){game.power=true;game.bunt=false;updateStyle();sound('tap');}};
 $('sound').onclick=()=>{unlockAudio();settings.sound=!settings.sound;save();if(settings.sound)sound('tap');};
 $('settings').onclick=settingsModal;$('pause').onclick=pause;$('react').onclick=()=>{const p=$('react-panel');p.hidden=!p.hidden;};$('react-panel').innerHTML=REACTIONS.map(e=>`<button type="button" data-react="${e}" aria-label="リアクション ${e}">${e}</button>`).join('')+`<div class="chat-list">${NightOnline.QUICK_CHATS.map((t,i)=>`<button type="button" data-chat="${i}">${t}</button>`).join('')}</div>`;$('react-panel').addEventListener('click',ev=>{const b=ev.target.closest('[data-react]');if(b){sendReaction(b.dataset.react);return;}const c=ev.target.closest('[data-chat]');if(c)sendQuickChat(Number(c.dataset.chat));});$('brand').onclick=()=>screen==='game'?(game?.domeScene?home():pause()):['pennant','apbc-cup','career'].includes(screen)?home():window.scrollTo({top:0,behavior:'smooth'});$('records').onclick=recordModal;$('menu-settings').onclick=settingsModal;
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>b.dataset.mode==='apbc'?apbcHub():b.dataset.mode==='match'?setupMatch():b.dataset.mode==='tournament'?customTourneyHub():b.dataset.mode==='online'?onlineModal():b.dataset.mode==='derby'?setupDerby():b.dataset.mode==='career'?worldDashboard():b.dataset.mode==='umpire'?umpireSetup():b.dataset.mode==='timeattack'?setupTimeAttack():b.dataset.mode==='survival'?survivalSetup():b.dataset.mode==='draft'?draftSetup():b.dataset.mode==='conquest'?conquestSetup():b.dataset.mode==='bullpen'?setupBullpen():b.dataset.mode==='scrimmage'?scrimmageModal('match'):setupTraining(b.dataset.mode));
 $('clubhouse').onclick=directoryTeams;
 $('menu-team-edit').onclick=editHubModal;
 $('menu-home').onclick=()=>{if(screen!=='home')home();};
 $('menu-trophies').onclick=()=>recordModal('trophies');
 $('resume-game').onclick=resumeFromMenu;
 $('menu-notices').onclick=homeNoticesModal;
 $('menu-training-more').onclick=()=>modal(`${modalTitle('','練習・カスタム')}<button class="secondary-button" data-action="home-umpire">審判</button><button class="secondary-button" data-action="howto">遊び方</button>`,'home-training');
 noticeCard.onclick=()=>{if(performance.now()>=noticeClickUntil)openHomeNotice(homeNoticeIndex);};
 noticeRegion.addEventListener('click',event=>{
  const button=event.target.closest('button[data-notice-step],button[data-notice-index]');
  if(button)showHomeNotice(button.dataset.noticeIndex===undefined?homeNoticeIndex+Number(button.dataset.noticeStep):Number(button.dataset.noticeIndex));
 });
 noticeCard.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'&&event.isPrimary)noticeGesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 noticeCard.addEventListener('pointercancel',event=>{if(noticeGesture?.id===event.pointerId)noticeGesture=null;});
 noticeCard.addEventListener('pointerup',event=>{
  if(noticeGesture?.id!==event.pointerId)return;
  const dx=event.clientX-noticeGesture.x,dy=event.clientY-noticeGesture.y;
  noticeGesture=null;
  if(Math.abs(dx)<34||Math.abs(dx)<Math.abs(dy)*1.5)return;
  noticeClickUntil=performance.now()+350;
  showHomeNotice(homeNoticeIndex+(dx<0?1:-1));
 });
 $('players-tool').onclick=()=>rosterModal(game?.defending?game.pitcher.id:game?.batter.id,game?.userSide||'home');$('player-card').onclick=()=>{if(game)rosterModal(game.batter.id,game.side);};$('pitcher-card').onclick=()=>{if(game)rosterModal(game.pitcher.id,game.side==='home'?'away':'home');};$('tactics-tool').onclick=tacticsModal;$('history-tool').onclick=historyModal;$('practice-tool').onclick=practiceModal;
 $('auto-defense').onclick=()=>{if(game&&!game.onlineGame&&!game.umpireMode&&game.setAutoDefense(!game.autoDefense)){unlockAudio();updateUI();}};
 $('field-speed').onclick=()=>{if(game?.autoDefense&&game.defending){settings.defenseSpeed=game.defenseSpeed===1?2:1;game.defenseSpeed=settings.defenseSpeed;}else{settings.fieldSpeed=settings.fieldSpeed===1?2:1;if(game)game.fieldSpeed=settings.fieldSpeed;}save();updateUI();};
 $('modal-content').addEventListener('click',async e=>{
   const b=e.target.closest('button');if(!b)return;unlockAudio();
   if(b.dataset.openNotice!==undefined){openHomeNotice(Number(b.dataset.openNotice));return;}
   if(b.dataset.settingsSection){toggleSettingsSection(b);return;}
   if(b.dataset.finalTab&&finalResultState&&['summary','away','home'].includes(b.dataset.finalTab)){finalResultState.tab=b.dataset.finalTab;showFinalResult();return;}
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
   if(b.dataset.matchPreset){applyMatchPreset(b.dataset.matchPreset);return;}
   if(b.dataset.uiPitcher!==undefined){const {club,config}=lineupConfig('match'),n=Number(b.dataset.uiPitcher);if(Number.isInteger(n)&&club.pitchers[n]){config.pitcher=n;saveLineup('match');setupMatch();}return;}
   if(b.dataset.stadiumSection){stadiumSetSection(b.dataset.stadiumSection);return;}
   if(b.dataset.uiLight){settings.gameLighting=gameLightingMode(b.dataset.uiLight);save();setupMatch();return;}
   if(b.dataset.uiTeamSide){matchPickSide=b.dataset.uiTeamSide;matchClubGroup=matchPickerGroup(matchPickSide==='home'?settings.matchTeam:settings.matchOpponent);setupMatchTeams();return;}
   if(b.dataset.matchHome!==undefined){const autoPark=settings.park===matchDefaultPark();settings.matchUserHome=b.dataset.matchHome==='true';if(autoPark)settings.park=matchDefaultPark();save();setupMatch();return;}
   if(b.dataset.uiParkGroup){parkPickerGroup=b.dataset.uiParkGroup;parkPicker();return;}
   if(b.dataset.uiPark){if(NightPlayers.parks.some(p=>p.id===b.dataset.uiPark)){settings.park=b.dataset.uiPark;save();setupMatch();}return;}
   if(b.dataset.matchGroup){matchClubGroup=b.dataset.matchGroup;setupMatchTeams();return;}
   if(b.dataset.uniformClub){uniformClub=b.dataset.uniformClub;uniformModal();return;}
   if(b.dataset.uniformSwatch){const input=$('uniform-color');if(input){input.value=b.dataset.uniformSwatch;$('uniform-preview')?.style.setProperty('--club',b.dataset.uniformSwatch);}return;}
   if(b.dataset.matchSide){matchPickSide=b.dataset.matchSide;matchClubGroup=(matchPickSide==='home'?settings.matchTeam:settings.matchOpponent).startsWith('kbo-')?'kbo':(matchPickSide==='home'?settings.matchTeam:settings.matchOpponent).startsWith('npb-')?'npb':'cpbl';setupMatchTeams();return;}
   if(b.dataset.conquestUser){conquestUser=b.dataset.conquestUser;conquestSetup();return;}
   if(b.dataset.conquestOpp){startConquestMatch(b.dataset.conquestOpp);return;}
   if(b.dataset.draftFilter){draftFilter=b.dataset.draftFilter;draftRender();return;}
   if(b.dataset.draftPick){if(draftState&&NightDraftBattle.applyPick(draftState,'user',b.dataset.draftPick)){sound('tap');draftRender();}else toast('その選手は指名できません（不足ポジションが埋まらなくなる指名は不可）');return;}
   if(b.dataset.matchClub){const chosen=b.dataset.matchClub,autoPark=settings.park===matchDefaultPark();if(matchPickSide==='home'){if(settings.matchOpponent===chosen)settings.matchOpponent=settings.matchTeam;settings.matchTeam=chosen;}else{if(settings.matchTeam===chosen)settings.matchTeam=settings.matchOpponent;settings.matchOpponent=chosen;}if(autoPark)settings.park=matchDefaultPark();lineupConfig('match');save();setupMatch();return;}
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
   if(b.dataset.benchPlayer){if(game.mirror){onlineRequestSub({kind:b.dataset.subKind,id:b.dataset.benchPlayer,base:runnerBase});}else if(game.substitute(b.dataset.benchPlayer,{type:b.dataset.subKind,base:runnerBase})){checkpoint();toast(b.dataset.subKind==='run'?'代走を起用しました':'代打を起用しました');benchModal(benchTab);}return;}
   if(b.dataset.benchPitch!==undefined){if(game.mirror){onlineRequestSub({kind:'pitch',index:Number(b.dataset.benchPitch)});}else if(game.changePitcher(Number(b.dataset.benchPitch))){checkpoint();toast('投手を交代しました');benchModal('pitch');}return;}
   if(b.dataset.lineupReserve){const {config}=lineupConfig(lineupContext),slot=config.order.indexOf(pregameTarget);if(slot>=0&&!config.order.includes(b.dataset.lineupReserve)){const old=config.order[slot];config.order[slot]=b.dataset.lineupReserve;for(const pos of positionOptions)if(config.fielding[pos]===old)config.fielding[pos]=b.dataset.lineupReserve;pregameTarget=b.dataset.lineupReserve;lineupModal(lineupContext,b.dataset.lineupReserve,$('modal-content').scrollTop);}return;}
   if(b.dataset.lineupMove){const {config}=lineupConfig(lineupContext),i=config.order.indexOf(b.dataset.lineupMove),j=i+Number(b.dataset.dir),scroll=$('modal-content').scrollTop;if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];lineupModal(lineupContext,b.dataset.lineupMove,scroll);return;}
   if(b.dataset.lineupPreset){const {club,config,players}=lineupConfig(lineupContext),key=b.dataset.lineupPreset;config.order=(key==='default'?NightGame.arrangeLineup(club):players.slice().sort((a,c)=>c[key]-a[key])).map(p=>p.id);if(key==='default'){config.fielding={...(club.startingFielding||{})};config.pitcher=NightPlayers.defaultPitcherIndex?.(club)??0;}lineupModal(lineupContext,null,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPitcher!==undefined){const {club,config}=lineupConfig(lineupContext),n=Number(b.dataset.lineupPitcher);if(!club.pitchers[n])return;config.pitcher=n;editorSelection=null;saveLineup(lineupContext);lineupModal(lineupContext,club.pitchers[n].id,$('modal-content').scrollTop);return;}
   if(b.dataset.lineupPlayer){lineupModal(lineupContext,b.dataset.lineupPlayer);$('modal-content').querySelector('.lineup-ability').open=true;return;}
   if(b.dataset.derbyBatter){settings.derbyBatter=b.dataset.derbyBatter;const scroll=$('modal-content').scrollTop;setupDerby();$('modal-content').scrollTop=scroll;return;}
   if(b.dataset.taKind){settings.taKind=b.dataset.taKind;save();setupTimeAttack();return;}
   if(b.dataset.taSeconds){settings.taSeconds=Number(b.dataset.taSeconds);save();setupTimeAttack();return;}
   if(b.dataset.toggle){const k=b.dataset.toggle;if(modalKind==='settings'&&!settingsToggleAllowed(k,settingsScope()))return;settings[k]=!settings[k];b.classList.toggle('on',settings[k]);b.setAttribute('aria-checked',String(settings[k]));if(settings[k]&&(k==='variantMetalBat'||k==='variantLowReboundBat')){const off=k==='variantMetalBat'?'variantLowReboundBat':'variantMetalBat';settings[off]=false;const ob=$('modal-content')?.querySelector(`[data-toggle="${off}"]`);ob?.classList.remove('on');ob?.setAttribute('aria-checked','false');}save();if(k==='randomRoster')randomMatch=null;if(modalKind==='setup'){setupMatch();return;}if(modalKind==='match-options'){matchOptions();return;}if(online?.role==='host'&&['online','online-options'].includes(modalKind))onlineSendLobbyConfig();if(game)updateUI();if(k==='leftHanded'&&$('thumb-preview-wrap'))$('thumb-preview-wrap').innerHTML=thumbPreview();return;}
   if(b.dataset.ctClub){const id=b.dataset.ctClub,i=ctPicks.indexOf(id);if(i>=0)ctPicks.splice(i,1);else if(ctPicks.length<8)ctPicks.push(id);ctSetupModal();return;}
   if(b.dataset.roomJoin){if(b.dataset.roomRole==='host')onlineCreateRoom(b.dataset.roomJoin);else onlineJoinRoom(b.dataset.roomJoin);return;}
   if(b.dataset.roomDelete){NightOnline.forgetRoom(b.dataset.roomDelete,b.dataset.roomRole);onlineModal();return;}
   if(b.dataset.onlineMode){if(online?.role==='host'&&online.mode!==b.dataset.onlineMode){online.mode=b.dataset.onlineMode==='derby'?'derby':'match';online.guestReady=false;online.session?.send({t:'lobby-mode',mode:online.mode});onlineSendLobbyConfig();onlineModal();}return;}
   if(b.dataset.onlineGroup){onlineClubGroup=b.dataset.onlineGroup;onlineTeams();return;}
   if(b.dataset.onlineClub){
     const club=onlineClubs().find(c=>c.id===b.dataset.onlineClub);
     if(online&&club){
       if(online.myClub!==club.id){online.myClub=club.id;online.myLineup=onlineNormalizeLineup(club);online.myPitcher=online.myLineup.pitcher;online.myReady=false;}
       onlineSendClub();if(online.role==='guest')online.status='編成を確認して準備完了を押してください。';onlineModal();
     }return;
   }
   if(b.dataset.onlinePitcher!==undefined&&online?.myClub){const {club,config}=lineupConfig('online'),i=Number(b.dataset.onlinePitcher);if(club.pitchers[i]){config.pitcher=i;saveLineup('online');onlineModal();}return;}
   if(b.dataset.onlineParkGroup){parkPickerGroup=b.dataset.onlineParkGroup;parkPicker(false,'online');return;}
   if(b.dataset.onlineInnings){if(online?.role==='host'){settings.innings=Number(b.dataset.onlineInnings);online.innings=settings.innings;save();onlineSendLobbyConfig();onlineModal();}return;}
   if(b.dataset.onlineSide){if(online?.role==='host'){online.hostHome=b.dataset.onlineSide==='home';onlineSendLobbyConfig();onlineModal();}return;}
   if(b.dataset.onlinePark){if(online?.role==='host'){online.park=b.dataset.onlinePark;onlineSendLobbyConfig();onlineModal();}return;}
   if(b.dataset.onlineHandicap){if(online?.role==='host'){const [k,v]=b.dataset.onlineHandicap.split(':');settings['handicap'+k[0].toUpperCase()+k.slice(1)]=Number(v);save();onlineSendLobbyConfig();if(modalKind==='online-options')onlineOptions();else onlineModal();}return;}
   if(b.dataset.draftPick){if(league?.draftUserPick(b.dataset.draftPick)){saveLeague();draftModal();}return;}
   if(b.dataset.faSign){if(league?.faSign(b.dataset.faSign)){saveLeague();draftModal();}return;}
   if(b.dataset.faNeg){const r=league?.faNegotiate(b.dataset.faNeg,Number(b.dataset.faAmount));if(r){saveLeague();toast(r.response==='accepted'?`交渉成立！ ${r.cost}ptで獲得しました`:r.response==='counter'?`断られました。相手の要求は ${r.counter}pt です`:r.response==='broken'?'交渉が決裂しました':r.response==='blocked'?'同じ条件では再提示できません。条件を上げてください':'交渉できませんでした');draftModal();}return;}
   if(b.dataset.tradeCounter){const r=league?.tradeNegotiate(b.dataset.tradeCounter);if(r){saveLeague();if(r.response==='accepted'){closeModal(false);leagueDashboard();toast('トレード交渉が成立しました');}else{toast(r.response==='counter'?`断られました。相手は ${r.counterTakeName||''} を要求しています`:r.response==='broken'?'トレード交渉が決裂しました':r.response==='blocked'?'その選手は提示済みです':'交渉できませんでした');if(league?.tradeOffer)tradeNegotiationModal();else{closeModal(false);leagueDashboard();}}}return;}
   if(b.dataset.tradeAccept!==undefined){if(league?.acceptTrade()){saveLeague();closeModal(false);leagueDashboard();}return;}
   if(b.dataset.tradeDecline!==undefined){league?.declineTrade();saveLeague();closeModal(false);leagueDashboard();return;}
   if(b.dataset.farmPlayer){if(league){const id=b.dataset.farmPlayer;league.setFarm(id,!league.farmIds(league.clubId).includes(id));saveLeague();farmModal();}return;}
   if(b.dataset.learnPitch){if(league){const r=league.trainNewPitch(b.dataset.learnPitch,b.dataset.learnType);saveLeague();toast(r?(r.learned?'新球種を習得しました！':'まだ習得できませんでした。次の節も挑戦できます'):'今節はトレーニング済みです');rosterModal(b.dataset.learnPitch,'home');}return;}
   if(b.dataset.leadersMetric){leadersMetric=b.dataset.leadersMetric;leadersModal();return;}
   if(b.dataset.leadersScope){leadersScope=b.dataset.leadersScope;leadersModal();return;}
   if(b.dataset.difficulty){if(screen==='game')return;settings.difficulty=b.dataset.difficulty;save();$('modal-content').querySelectorAll('[data-difficulty]').forEach(el=>el.classList.toggle('active',el.dataset.difficulty===settings.difficulty));return;}
   if(b.dataset.injuryRate){if(screen==='game')return;settings.injuries=b.dataset.injuryRate;save();NightPennant.injuryRate=settings.injuries;$('modal-content').querySelectorAll('[data-injury-rate]').forEach(el=>el.classList.toggle('active',el.dataset.injuryRate===settings.injuries));return;}
   if(b.dataset.handicap){const [k,v]=b.dataset.handicap.split(':');settings['handicap'+k[0].toUpperCase()+k.slice(1)]=Number(v);save();if(modalKind==='match-options')matchOptions();else setupMatch();return;}
   if(b.dataset.innings){settings.innings=Number(b.dataset.innings);save();setupMatch();return;}
   if(b.dataset.runningMode){if(modalKind==='settings'&&settingsScope()==='online')return;chooseRunningMode(b.dataset.runningMode==='manual');settingsModal();return;}
   if(b.dataset.fieldSpeed){if(modalKind==='settings'&&settingsScope()==='online')return;settings.fieldSpeed=Number(b.dataset.fieldSpeed);if(screen==='game'&&game)game.fieldSpeed=settings.fieldSpeed;save();settingsModal();return;}
   if(b.dataset.directoryGroup){directoryGroup=b.dataset.directoryGroup;directoryTeams();return;}
   if(b.dataset.directoryTab){directoryTab=b.dataset.directoryTab;directoryRoster(directoryClub);return;}
   if(b.dataset.directoryClub){directoryRosterScroll=0;directoryQuery='';directoryTab='all';directorySort='order';directoryRoster(b.dataset.directoryClub);return;}
   if(b.dataset.directoryPlayer){directoryPlayer(b.dataset.directoryPlayer);return;}
   if(b.dataset.action==='directory-teams'){directoryTeams();return;}
   if(b.dataset.action==='directory-roster'){directoryRoster(directoryClub,directoryRosterScroll);return;}
   if(b.dataset.rosterTeam){rosterModal(null,b.dataset.rosterTeam);return;}
   if(b.dataset.player){rosterModal(b.dataset.player,b.dataset.team);return;}
   if(b.dataset.scrimmagePlayer){const id=b.dataset.scrimmagePlayer;if(!scrimmageSelection){scrimmageSelection=id;renderScrimmageModal();}else if(scrimmageSelection===id){scrimmageSelection=null;renderScrimmageModal();}else{const next=NightScrimmage.swapBatters(scrimmageState.split,scrimmageSelection,id);if(next){scrimmageState.split=next;scrimmageSelection=null;renderScrimmageModal();}else{scrimmageSelection=id;renderScrimmageModal();}}return;}
   if(b.dataset.movePlayer){const {config}=lineupConfig('match'),i=config.order.indexOf(b.dataset.movePlayer),j=i+Number(b.dataset.dir);if(j>=0&&j<9)[config.order[i],config.order[j]]=[config.order[j],config.order[i]];saveLineup('match');rosterModal(b.dataset.movePlayer);return;}
   if(b.dataset.orderPreset){const {club,config}=lineupConfig('match');config.order=(b.dataset.orderPreset==='default'?NightGame.arrangeLineup(club):lineupConfig('match').players.slice().sort((a,c)=>c[b.dataset.orderPreset]-a[b.dataset.orderPreset])).map(p=>p.id);if(b.dataset.orderPreset==='default'){config.fielding={...(club.startingFielding||{})};config.pitcher=NightPlayers.defaultPitcherIndex?.(club)??0;}saveLineup('match');rosterModal();return;}
   if(b.dataset.starter!==undefined){const kind=screen==='pennant'?'league':'match',{club,config}=lineupConfig(kind);config.pitcher=Number(b.dataset.starter);saveLineup(kind);rosterModal(club.pitchers[config.pitcher].id);return;}
   if(b.dataset.relief!==undefined){if(game?.changePitcher(Number(b.dataset.relief))){toast('投手を交代しました');rosterModal(game.pitcher.id,game.userSide);}return;}
   if(b.dataset.defense){if(game&&!game.umpireMode){game.defense=b.dataset.defense;checkpoint();tacticsModal();}return;}
   if(b.dataset.shift){if(game&&!game.umpireMode){game.shift=b.dataset.shift;checkpoint();tacticsModal();}return;}
   switch(b.dataset.action){
     case'stadium-editor':if(screen!=='game')stadiumEditorModal();break;
     case'stadium-edit':stadiumEditorModal(b.dataset.parkId);break;
     case'stadium-delete':stadiumDeleteConfirmModal(b.dataset.parkId);break;
     case'stadium-delete-confirm':{NightStadium.remove(b.dataset.parkId);if(settings.park===b.dataset.parkId){settings.park='night';save();}stadiumEditorModal();toast('カスタム球場を削除しました');break;}
     case'stadium-new':stadiumEditorModal();break;
     case'stadium-camera-reset':if(stadiumPreview){stadiumPreview.angle=.12;stadiumPreview.elev=.83;stadiumPreview.zoom=1;stadiumPreview.render();}break;
     case'stadium-reset':{const section=stadiumSections.find(s=>s[0]===stadiumSection),defaults=NightStadium.clampSpec();for(const [k] of section[2])stadiumDraft[k]=defaults[k];if(stadiumSection==='shape')stadiumDraft.detailShape=false;stadiumSetSection(stadiumSection);refreshStadiumPreview();break;}
     case'stadium-template':{const p=NightPlayers.parks.find(p=>p.id===$('stadium-template')?.value);if(p)stadiumEditorModal(null,{...NightStadium.fromPark(p),name:p.name.slice(0,20)+' 改'});break;}
     case'stadium-duplicate':{const p=NightPlayers.parks.find(p=>p.id===b.dataset.parkId&&p.custom);if(p)stadiumEditorModal(null,{...p.customSpec,name:p.name.slice(0,20)+' コピー'});break;}
     case'stadium-save':{const park=NightStadium.upsert({id:stadiumEditId||undefined,...stadiumDraft,name:$('stadium-name').value});settings.park=park.id;matchForecast=null;save();stadiumEditorModal(park.id,null,stadiumSection);toast(`球場「${park.name}」を保存しました`);break;}
     case'stadium-share':{const code=NightShare.exportPark(b.dataset.parkId);if(!code){toast('共有コードを発行できませんでした');break;}const box=$('share-park-code');if(box)box.value=code;copyText(code).then(ok=>toast(ok?'共有コードをコピーしました':'コードを発行しました（欄からコピーしてください）'));break;}
    case'stadium-share-import':{const result=NightShare.importCode($('share-park-code')?.value,undefined,'park');if(!result.ok){toast(result.error);break;}stadiumEditorModal(result.item.id);toast(`球場「${result.item.name}」を追加しました${result.renamed?'（名前が重なったため別名で追加）':''}`);break;}
    case'stadium-back':if(!returnFromEditModal())setupMatch();break;
     case'league-editor-open':if(screen!=='game')leagueEditor();break;
     case'edit-hub-open':openEditHubChild(b.dataset.editor);break;
     case'edit-league-new':if(screen==='home'&&modalKind==='edit-leagues')leagueEditor(null,true);break;
     case'edit-league-existing':{const def=NightLeague.get(b.dataset.leagueId);if(screen==='home'&&modalKind==='edit-leagues'&&def)leagueEditor(def,true);break;}
     case'edit-league-remove':{if(screen!=='home'||modalKind!=='edit-leagues')break;const id=b.dataset.leagueId,def=NightLeague.get(id);if(!def)break;let hasSeason=league?.leagueId===id;try{hasSeason=hasSeason||NightPennantSlots.anyExists(localStorage,id);}catch{hasSeason=true;}if(hasSeason){toast('進行中のペナントがあるため削除できません');break;}if(!confirm(localize('このリーグを削除しますか？')))break;NightLeague.remove(id);delete pennantLeagues[id];if(selectedLeague===id){selectedLeague=settings.pennantLeague='cpbl';loadLeague('cpbl');save();}editLeagueList();break;}
     case'match-preset-save':{const preset=NightMatchPresets.add($('match-preset-name')?.value,NightMatchPresets.snapshot(settings,lineupConfig('match').config.pitcher));matchPresetsScreen();toast(`プリセット「${preset.name}」を保存しました`);break;}
     case'match-preset-delete':NightMatchPresets.remove(b.dataset.presetId);matchPresetsScreen();toast('プリセットを削除しました');break;
     case'close':closeModal();break;
     case'home-umpire':umpireSetup();break;
     case'record-room':recordRoomModal();break;
    case'bullpen-type':if(bullpenSel){bullpenSel.type=b.dataset.type;bullpenModal();}break;
    case'bullpen-throw':bullpenThrow();break;
    case'bullpen-reset':if(bullpenSel){bullpenSel.session=NightBullpen.createSession(bullpenSel.player);bullpenModal();}break;
     case'records-back':recordModal();break;
     case'totals':totalsModal();break;
   case'ct-start':customTourney={clubs:ctPicks.slice(),rounds:[[[0,7],[3,4],[2,5],[1,6]].map(([a,b])=>({home:ctPicks[a],away:ctPicks[b],winner:null,hs:null,as:null}))],champion:null};saveCustomTourney();customTourneyModal();break;
   case'ct-play':playCustomTourney();break;
   case'ct-reset':customTourney=null;saveCustomTourney();closeModal(false);toast('トーナメントを破棄しました');break;
   case'online-host':onlineCreateRoom();break;
   case'online-join':onlineJoinRoom();break;
   case'online-rejoin':if(online?.role==='guest')onlineJoinRoom(online.code);break;
   case'online-copy-code':if(online?.code)copyText(online.code).then(ok=>toast(ok?'合言葉をコピーしました':'コピーできませんでした'));break;
   case'online-copy-link':if(online?.code)copyText(onlineInviteUrl(online.code)).then(ok=>toast(ok?'招待リンクをコピーしました':'コピーできませんでした'));break;
   case'online-share-link':if(online?.code&&typeof navigator.share==='function')navigator.share({title:'NIGHTBALL オンライン対戦',text:'オンライン対戦の招待です。合言葉: '+online.code,url:onlineInviteUrl(online.code)}).catch(()=>{});break;
   case'online-teams-open':onlineTeams(true);break;
   case'online-park-open':if(online?.role==='host')parkPicker(true,'online');break;
   case'online-pitchers-open':if(online?.myClub&&online.mode!=='derby'){onlineBeginEdit();matchPitchers('online');}break;
   case'online-lineup-open':if(online?.myClub&&online.mode!=='derby'){onlineBeginEdit();lineupModal('online');}break;
   case'online-lineup-done':saveLineup('online');onlineModal();break;
   case'online-options-open':onlineOptions();break;
   case'online-lobby-back':onlineModal();break;
   case'online-ready':if(online?.role==='guest'&&online.myClub&&online.session?.open){online.myReady=!online.myReady;online.status=online.myReady?'準備完了。ホストの開始を待っています…':'編成を変更できます。';onlineSendClub();onlineModal();}break;
   case'online-start':startOnlineMatch();break;
   case'online-cancel':onlineCleanup();closeModal();break;
   case'online-exit':onlineCleanup();hideOnlineGuest();home();break;
   case'draft-step':if(league?.draftCpuPick()){saveLeague();draftModal();}break;
   case'draft-skip':if(league){league.runCpuPicks();saveLeague();draftModal();}break;
   case'draft-finish':if(league?.startNextSeason()){saveLeague();closeModal(false);leagueDashboard();toast((league.season)+'年目のシーズンが始まりました');}break;
   case'fa-finish':if(league){league.ensureFaMarket();league.faFinish();saveLeague();if(league.startNextSeason()){saveLeague();closeModal(false);leagueDashboard();toast((league.season)+'年目のシーズンが始まりました');}else draftModal();}break;
   case'allstar-play':playAllstar();break;
   case'allstar-sim':if(league?.allstarDue){const s=league.simAllstar();league.completeAllstar();saveLeague();closeModal(false);leagueDashboard();toast('オールスター: '+s.awayScore+' - '+s.homeScore);}break;
   case'allstar-back':closeModal(false);game=null;leagueDashboard();break;
   case'farm-back':closeModal(false);game=null;leagueDashboard();break;
   case'scrimmage-play':startScrimmage();break;
   case'scrimmage-back':{const src=game?.scrimmageSource||scrimmageState?.source;closeModal(false);game=null;if(src==='pennant')leagueDashboard();else home();break;}
   case'rematch-same':case'rematch-swap':if(online?.role==='host'&&online.session?.open){online.rematchSwap=b.dataset.action==='rematch-swap';online.rematchState='offered';online.session.send({t:'rematch',swap:online.rematchSwap});if(game)finish(game);}break;
   case'rematch-accept':if(online?.role==='guest'&&online.rematchOffer){online.session?.send({t:'rematch-yes'});online.rematchOffer=null;closeModal(false);toast('再戦を開始します…');}break;
   case'derby-rematch':if(online?.role==='host'&&online.session?.open&&online.derbyContest){online.rematchSwap=false;online.rematchState='offered';online.session.send({t:'rematch',swap:false});onlineDerbyResultModal();}break;
   case'rematch-decline':if(online?.role==='guest'){online.session?.send({t:'rematch-no'});online.rematchOffer=null;if(online.mode==='derby'&&online.derbyContest)onlineDerbyResultModal();else guestResultModal();}break;
   case'backup-export':{if(screen==='game')break;const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('nightball.'))data[k]=localStorage.getItem(k);}const blob=new Blob([JSON.stringify({app:'nightball',version:1,exportedAt:new Date().toISOString(),data})],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nightball-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('セーブデータを書き出しました');break;}
     case'backup-import':{if(screen==='game')break;const input=document.createElement('input');input.type='file';input.accept='application/json';input.onchange=()=>{const file=input.files[0];if(!file)return;file.text().then(text=>{try{const parsed=JSON.parse(text);if(parsed?.app!=='nightball'||!parsed.data||typeof parsed.data!=='object')throw new Error('bad file');let n=0;for(const [k,v] of Object.entries(parsed.data))if(k.startsWith('nightball.')){localStorage.setItem(k,String(v));n++;}if(!n)throw new Error('empty');toast('データを読み込みました。再読み込みします');setTimeout(()=>location.reload(),700);}catch{toast('読み込めないファイルです');}});};input.click();break;}
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
      if(game&&game.isFixture&&!game.onlineGame){closeModal(false);game.paused=false;game.fastForward=true;game.autoBatting=true;game.autoDefense=true;toast('自動で高速進行中。ポーズから操作に戻れます');updateUI();}
      break;
     case'auto-off':
      if(game&&!game.onlineGame&&!game.umpireMode){game.fastForward=false;game.spectate=false;game.autoBatting=false;game.autoDefense=false;closeModal(false);game.paused=false;toast('手動操作に戻りました');updateUI();}
      break;
     case'spectate-start':
      pendingSpectate=true;start('match');
      break;
     case'umpire-start':
     case'umpire-restart':
      pendingUmpire=true;start('match');
      break;
     case'leave':if(game?.worldFixture){checkpoint();worldDashboard();}else if(game?.career){checkpoint();careerDashboard();}else if(game?.apbcFixtureId){checkpoint();game.paused=true;apbcDashboard();}else if(game?.mode==='pennant'){checkpoint();game.paused=true;leagueDashboard();}else if(['practice','pitching'].includes(game?.mode)){closeModal(false);game.paused=false;game.finish();}else home();break;
     case'home-notices':homeNoticesModal();break;
     case'howto':howto();break;
     case'start-match':start('match');break;
     case'match-teams':setupMatchTeams();break;
     case'match-team-next':setupMatch();break;
     case'ui-park-open':parkPicker(true);break;
     case'ui-pitcher-open':matchPitchers();break;
     case'ui-options-open':matchOptions();break;
     case'ui-presets-open':matchPresetsScreen();break;
     case'ui-match-roster':pregameRoster=true;rosterModal(null,'home');break;
     case'ui-park-back':setupMatch();break;
     case'ui-match-start':saveLineup('match');start('match');break;
     case'match-scout':scoutingModal(settings.matchOpponent,true);break;
     case'uniform-editor':if(screen!=='game')uniformModal();break;
     case'uniform-save':{const color=$('uniform-color')?.value,accent=$('uniform-accent')?.value;if(NightUniforms.valid(color)&&NightUniforms.valid(accent)){uniformOverrides[uniformClub]={color,accent};NightUniforms.save(uniformOverrides);applyUniforms();toast('ユニフォームカラーを反映しました');uniformModal();}break;}
     case'uniform-reset':{delete uniformOverrides[uniformClub];NightUniforms.save(uniformOverrides);applyUniforms();toast('初期カラーに戻しました');uniformModal();break;}
     case'match-lineup':lineupModal('match');break;
     case'ui-lineup-done':saveLineup('match');setupMatch();break;
     case'lineup-play':saveLineup(lineupContext);if(lineupContext==='league')playLeague(true);else start(lineupContext.startsWith('apbc')?lineupContext:'match');break;
     case'lineup-back':saveLineup(lineupContext);if(returnFromEditModal())break;if(lineupContext==='league'||lineupContext==='edit')closeModal(false);else if(lineupContext==='apbc-cup')apbcDashboard();else if(lineupContext==='apbc')setupAPBC();else setupMatch();break;
     case'edit-lineup':lineupModal(matchContext==='apbc'?'apbc':'edit');break;
     case'editor-done':saveLineup(lineupContext);closeModal();break;
     case'start-derby':save();start('derby');break;
     case'ta-start':save();pendingTimeAttack=true;start('match');break;
     case'ta-restart':save();pendingTimeAttack=true;start('match');break;
     case'timeattack':setupTimeAttack();break;
     case'survival':survivalSetup();break;
     case'survival-new':startSurvivalRun();break;
     case'survival-next':save();pendingSurvival=true;start('match');break;
     case'draft':draftSetup();break;
     case'conquest':conquestSetup();break;
     case'conquest-reset':if(conquestUser&&window.confirm(localize('この球団の全球団制覇の進行をリセットしますか？'))){NightConquest.clearProgress(conquestUser);toast('進行をリセットしました');conquestSetup();}break;
     case'draft-start':startDraftBattle();break;
     case'draft-auto':if(draftState){NightDraftBattle.autoComplete(draftState);draftRender();}break;
     case'draft-finish':if(draftState&&NightDraftBattle.isComplete(draftState)){pendingDraft=true;save();start('match');}break;
     case'draft-quit':draftState=null;pendingDraft=false;closeModal(false);break;
     case'derby-next':if(game?.continueDerby()){closeModal();sound('tap');}break;
     case'roster':rosterModal(null,game?.userSide||'home');break;
     case'bench':requestBench();break;
     case'settings':settingsModal();break;
     case'music-settings':
      musicMenu(world&&(game?.worldFixture||screen==='career'&&worldActive)?'world-career':
       career&&(game?.career||screen==='career')?'career':null);
      break;
     case'music-stop':ballparkMusic.stop('preview');break;
     case'music-back':if(returnFromEditModal())break;if(musicSelection.fromCareer&&screen==='career')closeModal(false);else if(screen==='home')editHubModal();else closeModal(false);break;
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
 $('modal-content').addEventListener('input',e=>{if(e.target.dataset?.customDiff){if(screen==='game')return;const k=e.target.dataset.customDiff;settings.customDifficulty[k]=Math.max(-10,Math.min(10,Number(e.target.value)||0));globalThis.NightGameCustomDifficulty=settings.customDifficulty;const o=$('cd-'+k+'-output');if(o)o.textContent=(settings.customDifficulty[k]>0?'+':'')+settings.customDifficulty[k];save();}
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
  if(t.id==='game-language'){
   settings.language=setLanguage(t.value);
   save();
  }
  else if(t.id==='music-club'){musicSelection.club=t.value;musicSelection.person='';ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.id==='music-person'){musicSelection.person=t.value;ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.dataset.songSlot){setSongChoice(musicTarget().key,t.dataset.songSlot,t.value);ballparkMusic.stop('preview');drawMusicMenu(t.id);}
  else if(t.dataset.musicUpload&&t.files[0])importSong(t.dataset.musicUpload,t.files[0]);
 });
 $('modal-content').addEventListener('input',e=>{if(e.target.id==='uniform-color'||e.target.id==='uniform-accent'){$('uniform-preview')?.style.setProperty(e.target.id==='uniform-color'?'--club':'--accent',e.target.value);}if(e.target.id==='sound-volume'||e.target.id==='crowd-volume'){const master=e.target.id==='sound-volume';settings[master?'soundVolume':'crowdVolume']=Number(e.target.value);$(master?'sound-volume-output':'crowd-volume-output').textContent=e.target.value+'%';save();}if(e.target.id==='cursor-lift'){settings.cursorLift=Number(e.target.value);$('lift-output').textContent=settings.cursorLift+'px';save();$('thumb-preview-wrap').innerHTML=thumbPreview();}if(e.target.id==='cursor-shift'){settings.cursorShift=Number(e.target.value);$('shift-output').textContent=settings.cursorShift+'px';save();$('thumb-preview-wrap').innerHTML=thumbPreview();}});
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
  if(!bullpenSel)return;
  if(e.target.id==='bullpen-club'){bullpenSel.club=e.target.value;bullpenSel.player=null;bullpenSel.session=NightBullpen.createSession(null);bullpenModal();$('bullpen-club')?.focus({preventScroll:true});}
  if(e.target.id==='bullpen-player'){bullpenSel.player=e.target.value;bullpenSel.session=NightBullpen.createSession(e.target.value);settings.bullpenClub=bullpenSel.club;settings.bullpenPlayer=e.target.value;save();bullpenModal();}
 });
 $('modal-content').addEventListener('click',e=>{
  const svg=e.target.closest('#bullpen-zone');if(!svg||!bullpenSel)return;
  const r=svg.getBoundingClientRect();if(!r.width||!r.height)return;
  const clampAim=v=>Math.max(-1.6,Math.min(1.6,v));
  bullpenSel.aim={x:clampAim(((e.clientX-r.left)/r.width*220-110)/56),y:clampAim(((e.clientY-r.top)/r.height*190-95)/56)};
  bullpenModal();
 });
 $('modal-content').addEventListener('change',e=>{
  if(e.target.id==='game-lighting'){
   if(screen==='game')return;
   settings.gameLighting=gameLightingMode(e.target.value);
   save();
  }
 });
 $('modal-content').addEventListener('change',e=>{if(e.target.id==='apbc-club-filter'){apbcSelection.clubFilter=e.target.value;apbcSelectionModal();$('apbc-club-filter').focus({preventScroll:true});return;}if(e.target.id==='editor-club'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.matchTeams.find(c=>c.id!==settings.matchTeam).id;editorSelection=null;editorDetail=null;save();lineupModal('edit');return;}if(e.target.dataset.editorPosition){editorSelection=null;const {club,config}=lineupConfig(lineupContext);NightSquad.position(club,config,e.target.dataset.editorPosition,e.target.value);saveLineup(lineupContext);lineupModal(lineupContext,e.target.dataset.editorPosition,$('modal-content').scrollTop);return;}if(e.target.id==='lineup-replace-target'){pregameTarget=e.target.value;}if(e.target.dataset.lineupPosition){const {config}=lineupConfig(lineupContext),id=e.target.dataset.lineupPosition,previous=positionOptions.find(pos=>config.fielding[pos]===id),other=config.fielding[e.target.value];config.fielding[previous]=other;config.fielding[e.target.value]=id;lineupModal(lineupContext,id,$('modal-content').scrollTop);}if(e.target.dataset.benchPosition){if(game.mirror){onlineRequestSub({kind:'defense',id:e.target.dataset.benchPosition,pos:e.target.value});}else{game.swapFieldPosition(e.target.dataset.benchPosition,e.target.value);checkpoint();benchModal('defense');}}if(e.target.id==='derby-park'){settings.derbyPark=e.target.value;save();$('derby-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.derbyPark));}if(e.target.id==='derby-club'){settings.derbyClub=e.target.value;settings.derbyBatter=null;setupDerby();}if(e.target.id==='park-select'){settings.park=e.target.value;save();$('match-park-dimensions').innerHTML=parkDimensions(NightPlayers.parks.find(p=>p.id===settings.park));const wf=document.querySelector('[data-weather-forecast]');if(wf)wf.outerHTML=weatherForecastHTML(ensureMatchForecast());}if(e.target.id==='starter-select'){lineupConfig('match').config.pitcher=Number(e.target.value);saveLineup('match');}if(e.target.id==='match-team'){settings.matchTeam=e.target.value;if(settings.matchOpponent===settings.matchTeam)settings.matchOpponent=NightTeams.all.find(c=>c.id!==settings.matchTeam).id;settings.park=NightTeams.get(settings.matchUserHome?settings.matchTeam:settings.matchOpponent).park;lineupConfig('match');save();setupMatchTeams();}if(e.target.id==='match-opponent'){settings.matchOpponent=e.target.value;save();setupMatchTeams();}});
 $('modal-content').addEventListener('input',e=>{if(e.target.id==='ui-directory-search'){directoryQuery=e.target.value;refreshDirectoryRows();}});
 $('modal-content').addEventListener('change',e=>{if(e.target.id==='ui-directory-sort'){directorySort=e.target.value;refreshDirectoryRows();}});
 let draggedEditorPlayer=null;
 $('modal-content').addEventListener('dragstart',e=>{const b=e.target.closest('[data-editor-player]');if(!b)return;draggedEditorPlayer=b.dataset.editorPlayer;e.dataTransfer.setData('text/plain',draggedEditorPlayer);e.dataTransfer.effectAllowed='move';});
 $('modal-content').addEventListener('dragover',e=>{if(draggedEditorPlayer&&e.target.closest('[data-editor-player]'))e.preventDefault();});
 $('modal-content').addEventListener('drop',e=>{const b=e.target.closest('[data-editor-player]');if(!b||!draggedEditorPlayer)return;e.preventDefault();const {club,config}=lineupConfig(lineupContext);if(NightSquad.swap(club,config,draggedEditorPlayer,b.dataset.editorPlayer)){editorSelection=null;saveLineup(lineupContext);lineupModal(lineupContext,b.dataset.editorPlayer,$('modal-content').scrollTop);}draggedEditorPlayer=null;});
 $('modal-content').addEventListener('dragend',()=>draggedEditorPlayer=null);
 // Touch drag is restricted to a dedicated handle; ordinary row swipes scroll.
 let touchEditorDrag=null;
 const editorContent=$('modal-content');
 function clearEditorTouch(){
  if(!touchEditorDrag)return;
  touchEditorDrag.ghost?.remove();touchEditorDrag.target?.classList.remove('ui-drop-target');
  touchEditorDrag.source?.classList.remove('ui-drag-source');touchEditorDrag=null;
 }
 editorContent.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-editor-handle]');if(!handle||modalKind!=='lineup'||e.pointerType==='mouse'||!e.isPrimary)return;
  const source=handle.parentElement.querySelector('[data-editor-player]');if(!source)return;
  e.preventDefault();clearEditorTouch();handle.setPointerCapture(e.pointerId);
  const ghost=document.createElement('div');ghost.className='ui-editor-ghost';ghost.textContent=source.querySelector('.squad-name')?.textContent||'';
  document.body.append(ghost);source.classList.add('ui-drag-source');
  touchEditorDrag={id:e.pointerId,player:handle.dataset.editorHandle,source,ghost,target:null};
  ghost.style.transform='translate('+ (e.clientX+12)+'px,'+(e.clientY-36)+'px)';
 });
 editorContent.addEventListener('pointermove',e=>{
  const d=touchEditorDrag;if(!d||d.id!==e.pointerId)return;e.preventDefault();
  d.ghost.style.transform='translate('+(Math.max(0,Math.min(innerWidth-120,e.clientX+12)))+'px,'+Math.max(0,e.clientY-36)+'px)';
  const el=document.elementFromPoint(e.clientX,e.clientY),target=el?.closest('[data-editor-player]')||el?.closest('.squad-starter-row,.ui-bench-row')?.querySelector('[data-editor-player]');
  if(d.target!==target){d.target?.classList.remove('ui-drop-target');d.target=target===d.source?null:target;d.target?.classList.add('ui-drop-target');}
  const scroll=el?.closest('.squad-list')||editorContent.querySelector('.pf-body')||editorContent,rect=scroll.getBoundingClientRect();
  if(e.clientY>rect.bottom-24)scroll.scrollTop+=9;else if(e.clientY<rect.top+24)scroll.scrollTop-=9;
 },{passive:false});
 editorContent.addEventListener('pointerup',e=>{
  const d=touchEditorDrag;if(!d||d.id!==e.pointerId)return;
  const target=d.target?.dataset.editorPlayer,from=d.player;clearEditorTouch();
  if(modalKind!=='lineup'||!target||target===from)return;
  const {club,config}=lineupConfig(lineupContext);
  if(NightSquad.swap(club,config,from,target)){editorSelection=null;saveLineup(lineupContext);sound('tap');lineupModal(lineupContext,target,editorContent.scrollTop);}
  else toast('入れ替えるスタメンを選んでください');
 });
 editorContent.addEventListener('pointercancel',clearEditorTouch);
 editorContent.addEventListener('lostpointercapture',clearEditorTouch);

 window.addEventListener('pagehide',checkpoint);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='game'&&game&&!['ended','career-pregame'].includes(game.phase)&&$('modal').hidden)pause();});
 // v174: one sacrificial home entry, pushed once at startup, so the first
// Back at the root — or with a modal open over home — is absorbed by the
// app's popstate handling instead of leaving it; a further Back still
// exits, as the platform expects.
try{history.pushState({nightball:'home'},'',location.href);}catch{}
window.addEventListener('popstate',()=>{if(screen==='game'&&game?.phase!=='ended'){try{history.pushState({nightball:'game'},'',location.href);}catch{}if(game?.phase==='career-pregame'){navPop=true;careerDashboard();navPop=false;return;}try{pause();}catch{if(game){try{game.paused=true;modal(`${modalTitle('TIME OUT','ひと休み。',false)}<p class="modal-note">戻る操作がありました。試合を中断してホームに戻りますか？</p><button class="primary-button" data-action="close">試合に戻る</button><button class="secondary-button danger-button" data-action="leave">${game.career||game.worldFixture?'保存してキャリアへ':game.apbcFixtureId?'保存して大会へ':game.mode==='pennant'?'保存してペナントへ':['practice','pitching'].includes(game.mode)?'練習を終えて結果を見る':'中断してホームへ'}</button>`,'pause');}catch{}}}}else if(screen==='game'&&game?.worldFixture){navPop=true;worldDashboard();navPop=false;}else if(screen==='game'&&game?.career){navPop=true;careerDashboard();navPop=false;}else if(screen==='game')home();else backToPreviousScreen();});
 document.addEventListener('pointerdown',unlockAudio,{once:true});
 $('settings').innerHTML=svg('settings');$('pause').innerHTML=svg('pause');$('swing-icon').innerHTML=svg('bat');
 save();updateResume();history.replaceState({nightball:'home'},'',location.href);
 function updateCoach(g){
  const p=g.pitch,u=p?.progress||0;
  if(!g.defending&&g.phase==='pitch'&&u>=.92&&u<=1.09&&!p.timingCue){p.timingCue=true;if(settings.timingSound){sound('timing');vibrate(12);}}
 }
 let last=performance.now();
 // v126: a throwing update() used to abort every frame before render,
 // leaving the previous match frozen on the canvas with dead input.
 // Route back to the owning dashboard instead, with the error visible.
 function handleGameError(g,error){
  console.error('Game update failed',error);
  if(game!==g)return;
  game=null;onEvent('clear');
  if(g.worldFixture)worldDashboard();
  else if(g.career)careerDashboard();
  else home();
  toast('試合の処理でエラーが発生しました');
 }
 function frame(now){
  requestAnimationFrame(frame);
  syncAudio();
  const dt=now-last;last=now;
  if(screen==='game'&&game){
   updatePlaySkip();
   if(onlineMatchActive()){onlineHeartbeat();if(online.role==='host')onlineSyncTick();if(online.sync.lock||online.sync.disconnected)game.paused=true;}
   if(review.playback){
    if(onlineMatchActive())onlineTick(game);
    const state=review.frame(document.hidden?0:dt);
    if(state){renderer.render(state.game,state.time);const ro=hitReadout(state.game.hit);if(ro){$('hit-readout').textContent=ro+(state.game.hit?.distance?' · '+Math.round(state.game.hit.distance)+'m':'');$('play-tools').hidden=false;}}
    else stopReplay();
   }else{
    const activeDt=document.hidden?0:dt;
    if(!game.paused)tickPlayFeedback(activeDt);
    const hold=playFeedback.scoreTime>0||playFeedback.callTime>0||playFeedback.resultTime>0;
    const current=game;
    try{
     if(current.mirror)current.mirrorTick(activeDt);
     else current.update(activeDt,hold||playFeedback.pendingReplay);
    }catch(error){handleGameError(current,error);return;}
    if(screen!=='game'||game!==current)return;
    if(onlineMatchActive()&&online.role==='host')onlineSyncTick();
    const rb=$('react');if(rb)rb.hidden=!game?.onlineGame;onlineTick(game);updateScoringChip(game);
    try{updatePlayCallUI(game);}catch{}
    try{updateUmpireUI(game);}catch{}
    if(game.phase==='field'&&!review.playback)updatePlayTools();
    if((game.fastForward||game.spectate)&&game.phase==='change'&&$('modal').hidden)continueHalf();
    if(game.phase==='field'&&(game.isFixture||game.career||game.challenge))updateScoreCube($('scoreboard'),game);
    if(!onlineMatchActive()&&playFeedback.pendingReplay&&!game.fastForward&&!game.spectate&&!game.paused&&(game.phase==='result'||(game.mirror&&['intro','change'].includes(game.phase)))&&
     !playFeedback.scoreTime&&!playFeedback.callTime&&!playFeedback.resultTime&&$('modal').hidden){
     playFeedback.pendingReplay=false;launchReplay();
    }
    if(game.phase==='field'&&!game.mirror)review.capture(game);
    if(game.mirror&&!onlineMatchActive()&&(game.phase==='field'||game.phase==='result')){try{review.capture(game);if(game.phase==='result'&&game.field?.resolved&&!game.field._rf){game.field._rf=1;if(review.capture(game,true))playFeedback.pendingReplay=true;}}catch{}}
    if(game.derby)updateDerbyClock(game);
    if(game.timeAttack)updateTimeAttackClock(game);
    if(!review.playback&&!playFeedback.pendingReplay&&!playFeedback.scoreTime&&!playFeedback.callTime&&!playFeedback.resultTime&&queuedBench&&game.substitutionWindow&&!(game.defending&&game.phase==='windup')){queuedBench=false;benchModal();updateUI();}
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
 // Invite link (?room=CODE): open the online modal with the code prefilled.
 // Joining still takes the guest's own tap and club pick; nothing connects
 // automatically.
 try{
   const room=new URLSearchParams(location.search).get('room');
   if(room){
     const code=room.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
     if(code.length>=4){pendingInviteCode=code;onlineModal();}
   }
 }catch{}
 // PWA registration and safe update prompts are handled by pwa-update.js.
})();
