const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../dist'),app=fs.readFileSync(dir+'/app.js','utf8');
const between=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
const escape=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const logo='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%224%22 fill=%22%23eac16a%22/%3E%3Cpath d=%22M7 5h10v14H7z%22 fill=%22%23132844%22/%3E%3C/svg%3E';
const c=vm.createContext({uiEscape:escape,clubBadge:()=>'<span class="club-badge"><img src="'+logo+'"></span>',derbyClubMark:()=>'<img src="'+logo+'" alt="">',NightPlayers:{wallDistance:()=>115}});
vm.runInContext(between(' function derbyStats(',' function derbyHud(')+between(' function derbyScoreText(',' function derbyRoundPreview('),c);
const people=['キム・ドヨン','宋柏翰','サンタナ','ファビアン','ダルベック','ユニオル・セベリーノ','キム・ジェファン','エンカーナシオン'].map((name,i)=>({club:{id:'club'+i},player:{name},user:i===0}));
const match=(a,b,normal,extra=[null,null],winner=0)=>({entrants:[a,b],normal,extra,winner:[a,b][winner]||null,complete:true});
const q=[match(people[0],people[1],[3,2]),match(people[2],people[3],[13,13],[5,6],1),match(people[4],people[5],[11,14],[null,null],1),match(people[6],people[7],[12,15],[null,null],1)];
const g={derby:{rounds:[q,[],[]],matchup:q[0]}};
const bracket=c.derbyBracket(g);
assert.equal((bracket.match(/class="derby-pair/g)||[]).length,7);
assert.match(bracket,/winner-path/);assert.match(bracket,/user-path/);assert.match(bracket,/13<small>\+5<\/small>/);
assert.match(bracket,/ユニオル・セベリーノ/);assert(!bracket.includes('<details'));
const hero=c.derbyResultHero({title:'準々決勝 突破',call:'ROUND CLEAR',round:'準々決勝',player:people[0].player.name,club:people[0].club,score:3,opponent:people[1].player.name,opClub:people[1].club,opScore:2,won:true,note:'サヨナラ勝利！'});
const stats=c.derbyStats([{hr:true,x:37,y:120,distance:126,exitKmh:168,launchAngle:29},{hr:true,x:-43,y:133,distance:140,exitKmh:189,launchAngle:28},{hr:true,x:1,y:132,distance:132,exitKmh:176,launchAngle:32},{hr:false,x:20,y:50,distance:54,exitKmh:120,launchAngle:4}],{center:120});
assert.match(stats,/width="340" height="/);assert.match(stats,/着弾マップ・全打球（4）/);
if(process.env.DERBY_FIXTURE){
 const css=['style','arcade','game-hud','menu-polish','match-ui','pregame','nightball-brand'].map(f=>fs.readFileSync(dir+'/'+f+'.css','utf8')).join('\n');
 fs.writeFileSync(process.env.DERBY_FIXTURE,'<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+css+'</style></head><body><div class="modal-backdrop"><div class="modal" id="modal-content" data-kind="derby-result">'+hero+'<div class="dr-result-actions"><button class="primary-button">次のラウンドへ ›</button><button class="secondary-button">相手の打撃を見る</button></div>'+bracket+stats+'</div></div></body></html>');
}
console.log('PASS v265: actual result markup — all seven bracket matches, player path, overtime, long names and chart dimensions');
