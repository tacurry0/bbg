// v227: exercise the real settings and editor-hub rendering code for
// home, offline and online scopes, using a minimal DOM-independent UI host.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dist=path.resolve(__dirname,'../dist'),read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js'),css=read('settings-mode.css');
const block=app.slice(app.indexOf(' function settingsScope(){'),app.indexOf(' function howto(){'));
const music=app.slice(app.indexOf(' function musicControls(){'),app.indexOf(' function drawMusicMenu('));
assert(block.includes('function settingsModal()')&&block.includes('function editHubModal()'));
const settings={hudScale:100,controlsScale:95,cursorShift:48,cursorLift:64,difficulty:'standard',customDifficulty:{bat:0,pitch:1,field:2,run:-1},gameLighting:'night',manualRunning:false,fieldSpeed:2,language:'ja',sound:true,soundVolume:85,crowdVolume:60,music:{cheer:70,results:55,overlap:20,assignments:{}}};
const saved=JSON.stringify(settings);
const calls=[],shown=[];
const ctx={settings,screen:'home',game:null,career:null,worldActive:false,modalKind:'',onlineMatchActive:()=>ctx.active,onlineOwnsMenu:()=>ctx.owns,onlineRequestMenu:k=>calls.push(['lock',k]),
 modalTitle:(_,title)=>`<h2>${title}</h2>`,thumbPreview:()=>'<div>preview</div>',lightingField:()=>'<select id="game-lighting"></select>',
 modal:(markup,kind)=>{shown.push(markup);ctx.modalKind=kind;},lineupModal:k=>{calls.push(['team',k]);ctx.modalKind='lineup';},
 uniformModal:()=>{calls.push(['uniform']);ctx.modalKind='uniform';},stadiumEditorModal:()=>{calls.push(['stadium']);ctx.modalKind='stadium-editor';},
 musicMenu:()=>{calls.push(['music']);ctx.modalKind='music-settings';},home:()=>{ctx.screen='home';ctx.modalKind='';calls.push(['home']);},
 NightLeague:{list:()=>[{id:'custom1',name:'<Test>',clubIds:['a','b']}]},uiEscape:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')};
vm.createContext(ctx);
vm.runInContext(block+'\n globalThis.render=settingsModal;globalThis.openHub=editHubModal;globalThis.openChild=openEditHubChild;globalThis.back=returnFromEditModal;globalThis.returnLeagues=returnToEditLeagues;globalThis.scope=settingsScope;globalThis.toggleSection=toggleSettingsSection;globalThis.allowed=settingsToggleAllowed;',ctx);
const last=()=>shown.at(-1),sections=h=>[...h.matchAll(/data-settings-section="([^"]+)"/g)].map(x=>x[1]);
const system=['id="game-language"','data-action="backup-export"','data-action="backup-import"','data-action="fullscreen"','data-action="install"'];
const defaults=['data-difficulty=','data-custom-diff=','data-injury-rate=','id="game-lighting"','data-toggle="tiebreak"'];
const local=['id="cursor-shift"','id="cursor-lift"','data-toggle="timingGuide"','data-toggle="leftHanded"','data-toggle="sound"','data-toggle="tts"','data-ui-scale="hudScale"','data-ui-scale="controlsScale"','id="sound-volume"','id="crowd-volume"','data-music-volume="cheer"','data-music-volume="results"','data-music-volume="overlap"'];
const edits=['data-action="music-settings"','data-action="stadium-editor"','data-action="uniform-editor"','data-action="league-editor-open"','data-action="edit-hub-open"'];
function includesAll(h,items){for(const x of items)assert(h.includes(x),'missing '+x);}
function excludesAll(h,items){for(const x of items)assert(!h.includes(x),'unexpected '+x);}
ctx.render();
assert.equal(ctx.scope(),'home');assert.deepEqual(sections(last()),['game','controls','display','sound','system']);
includesAll(last(),[...system,...defaults,...local,'data-running-mode=','data-field-speed=','data-toggle="battingAssist"']);
excludesAll(last(),edits);assert(last().includes('data-settings-scope="home"'));
for(const id of ['hudScale','controlsScale','game-language','music-cheer','music-results','music-overlap'])assert.equal((last().match(new RegExp('id="'+id+'"','g'))||[]).length,1);
assert(last().includes('data-field-speed="2" class="active"'));
const fakeBody={hidden:true},chevron={textContent:''},sectionButton={dataset:{settingsSection:'sound'},setAttribute(){},parentElement:{querySelector:()=>fakeBody},querySelector:()=>chevron};
ctx.toggleSection(sectionButton);ctx.render();assert(last().includes('data-settings-section="sound" aria-expanded="true"'),'accordion state survives home rerender');
ctx.screen='game';ctx.game={phase:'aim',manualRunning:true,fieldSpeed:1,paused:false};
ctx.render();assert.equal(ctx.scope(),'match');assert(ctx.game.paused);
assert.deepEqual(sections(last()),['controls','display','sound','speed','running']);
includesAll(last(),[...local,'data-field-speed="1" class="active"','data-running-mode="manual" class="active"','data-toggle="battingAssist"','試合に戻る']);
assert(last().includes('data-settings-section="sound" aria-expanded="false"'),'home and game accordion states independent');
excludesAll(last(),[...system,...defaults,...edits,'data-audio-test=']);
ctx.game.onlineGame=true;ctx.active=true;ctx.owns=false;ctx.game.paused=false;
const count=shown.length;ctx.render();assert.equal(shown.length,count,'online menu waits for synchronized lock');assert.deepEqual(calls.at(-1),['lock','settings']);assert.equal(ctx.game.paused,false);
ctx.owns=true;ctx.render();assert(ctx.game.paused);assert.equal(ctx.scope(),'online');assert.deepEqual(sections(last()),['controls','display','sound']);
includesAll(last(),local);excludesAll(last(),[...system,...defaults,...edits,'data-field-speed=','data-running-mode=','data-toggle="battingAssist"']);
assert(!ctx.allowed('tiebreak','online')&&!ctx.allowed('battingAssist','online')&&ctx.allowed('sound','online')&&ctx.allowed('leftHanded','online'));
ctx.game.onlineGame=false;ctx.game.onlineDerby=true;ctx.active=false;ctx.render();assert.equal(ctx.scope(),'online');assert.deepEqual(sections(last()),['controls','display','sound']);
ctx.openHub();assert.equal(ctx.modalKind,'settings','no edit hub entry during play');
ctx.screen='home';ctx.game=null;ctx.render();assert(last().includes('data-settings-section="sound" aria-expanded="true"'));
ctx.openHub();assert.deepEqual([...last().matchAll(/data-editor="([^"]+)"/g)].map(x=>x[1]),['team','uniform','stadium','league','music']);
for(const [key,kind] of [['team','lineup'],['uniform','uniform'],['stadium','stadium-editor'],['music','music-settings']]){
 ctx.openChild(key);assert.equal(ctx.modalKind,kind);assert(ctx.back());assert.equal(ctx.modalKind,'edit-hub');
}
ctx.openChild('league');assert.equal(ctx.modalKind,'edit-leagues');
assert(last().includes('data-action="edit-league-new"')&&last().includes('data-action="edit-league-existing"')&&last().includes('&lt;Test&gt;'));
ctx.screen='pennant';ctx.modalKind='';ctx.returnLeagues();assert.equal(ctx.screen,'home');assert.equal(ctx.modalKind,'edit-leagues');assert(ctx.back());assert.equal(ctx.modalKind,'edit-hub');
assert.equal(JSON.stringify(settings),saved,'opening menus never modifies stored setting values');
assert(app.includes("$('menu-team-edit').onclick=editHubModal;"));
assert(/id="menu-team-edit"[^>]*>[\s\S]*?<strong>エディット<\/strong>/.test(html));
assert(app.includes("case'stadium-back':if(!returnFromEditModal())setupMatch();break;"));
assert(app.includes("if(leagueEditorFromHub){returnToEditLeagues();toast('リーグを保存しました');break;}"));
assert(app.includes("if(leagueEditorFromHub){returnToEditLeagues();toast('リーグを追加しました');break;}"));
assert(app.includes("if(resume&&returnFromEditModal())return;"));
assert(!music.includes('data-music-volume'),'song assignment editor has no volume controls');
assert(music.includes('data-song-slot')&&music.includes('data-music-upload')&&music.includes('data-music-preview'));
assert(css.includes('.edit-hub-grid')&&css.includes('.settings-page .settings-section-body[hidden]'));
for(const f of ['app.js','i18n-catalog.js','release-notes.js','settings-mode.css']){
 const pin=html.match(new RegExp('\\./'+f.replace('.','\\.')+'\\?v=\\d+'))?.[0];
 assert(pin&&sw.includes(pin),'cache pin '+f);
}
const i18n={};vm.createContext(i18n);vm.runInContext(read('i18n-catalog.js'),i18n);
for(const s of ['エディット','エディットモード','チーム編成','リーグエディタ','応援歌・結果曲','試合中設定','画面表示','システム','プレイ速度','走塁方式'])assert(i18n.NightballMessages[s]?.every(Boolean),'translation '+s);
console.log('PASS: three settings scopes, menu lock, preserved setting values, all five edit entries and returns, league list, song/volume split, locale/cache pins');
