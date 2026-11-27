const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
(async()=>{
 const {BallparkMusic,musicSettings,defaultTeamCheer,PRESETS}=await import('../dist/music.js');
 const id='preset:npb-taiko',file=path.join(root,'dist/assets/audio/npb-taiko.mp3');
 const supplied=fs.readFileSync(file);
 assert(supplied.length>10000);
 assert(PRESETS.some(p=>p.id===id));
 // Check every registered NPB club rather than just one representative.
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'dist/npb-data.js'),'utf8'),ctx);
 const npbIds=ctx.window.NightNPBData.teams.map(t=>t.id);
 assert.equal(npbIds.length,14);
 for(const team of npbIds){assert.equal(defaultTeamCheer(team,false),null);assert.equal(defaultTeamCheer(team,true),null);}
 for(const [team,normal,chance] of [['brothers','preset:clap','preset:taiwan-rally'],['kbo-lg','preset:clap','preset:korea-rally'],['apbc-japan','preset:stadium','preset:japan-rally']]){
  assert.equal(defaultTeamCheer(team),null);assert.equal(defaultTeamCheer(team,true),null);
 }
 let fetches=0,decodes=0;
 global.fetch=async url=>{
  assert.equal(url.pathname.endsWith('/assets/audio/npb-taiko.mp3'),true);
  fetches++;return {ok:true,arrayBuffer:async()=>supplied.buffer.slice(supplied.byteOffset,supplied.byteOffset+supplied.byteLength)};
 };
 const context={currentTime:0,createGain:()=>({gain:{setValueAtTime(){},setTargetAtTime(v){this.value=v;}},connect(){},disconnect(){}}),
  createBufferSource:()=>({connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}}),
  decodeAudioData:async bytes=>{decodes++;assert.deepEqual(Buffer.from(bytes),supplied);return {numberOfChannels:1,getChannelData:()=>new Float32Array([.1,.2,.1]),duration:8};}};
 const mixer=new BallparkMusic({context,master:{}},{get:()=>{throw Error('Bundled cheer must not rely on imported local tracks');}});
 const game={teams:{home:{id:npbIds[0]},away:{id:npbIds[1]}},side:'home',userSide:'home',batter:{id:'p1'},phase:'aim',inning:1,half:'bottom',outs:0,battingIndex:{home:0,away:0},bases:[false,false,false]};
 const settings=musicSettings(),tick=()=>new Promise(resolve=>setImmediate(resolve));
 mixer.update(game,settings,true,true);await tick();
 assert(!mixer.slots.home);assert.equal(fetches,0);
 settings.assignments['team:'+game.teams.home.id]={cheer:id};
 settings.assignments['team:'+game.teams.away.id]={cheer:id};
 mixer.update(game,settings,true,true);await tick();
 const first=mixer.slots.home.source;
 assert(first.started&&first.loop);assert.equal(fetches,1);assert.equal(decodes,1);
 // Scoring position must not interrupt the same recording.
 game.bases[1]=true;mixer.update(game,settings,true,true);await tick();
 assert.equal(mixer.slots.home.source,first);
 mixer.update(game,settings,true,false);assert.equal(mixer.slots.home.gain.gain.value,0);
 mixer.update(game,settings,true,true);assert(mixer.slots.home.gain.gain.value>0);
 game.outs=3;game.phase='change';mixer.update(game,settings,true,true);assert(first.stopped);
 game.outs=0;game.phase='aim';game.side='away';game.half='top';game.inning=2;
 mixer.update(game,settings,true,true);await tick();
 assert(mixer.slots.away.source.loop);assert.equal(fetches,1);assert.equal(decodes,1);
 // Explicit local overrides are still respected.
 settings.assignments['team:'+game.teams.away.id]={cheer:'off'};
 mixer.update(game,settings,true,true);assert(!mixer.slots.away);
 assert(await mixer.preview(id,'cheer'));assert(!mixer.slots.preview.source.loop);
 const sw=fs.readFileSync(path.join(root,'dist/sw.js'),'utf8');
 assert(sw.includes("'./assets/audio/npb-taiko.mp3'"));
 console.log('PASS: defaults disabled, manually selected bundled recording retained, with offline caching, mute, inning transition and custom override preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
