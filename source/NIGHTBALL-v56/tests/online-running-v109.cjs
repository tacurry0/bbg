// v109 manual-baserunning coverage:
//  - Settings: manual running is the new default, and settings stored by
//    older versions (which always persisted manualRunning, choice or not)
//    migrate to manual once unless the running controls recorded an
//    explicit choice (runningModeChosen). The migration line is executed
//    verbatim from app.js against representative stored objects.
//  - Career: new careers default to manual; restored saves keep exactly
//    the mode they recorded (a pre-v109 save without the field stays auto).
//  - Online host engine: when the guest bats, the host hands runner
//    control to the guest iff the guest uses manual running
//    (remoteRunning); guest commands validate and apply on the host.
//    When the host bats, its own manualRunning governs and remote
//    commands are rejected.
//  - Online guest mirror: commandRunner / commandRunners forward
//    {t:'runner-command'} to the host instead of applying locally, and
//    stay inert while the guest is defending.
//  - app.js wiring (source guards): the guest announces its running mode
//    at match start and on toggle, the host routes runner-command /
//    running-mode messages, and the streamed field state no longer
//    forces userControlled off.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window=global;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament','derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/'+file+'.js','utf8'),{filename:file+'.js'});
}
const appSrc=fs.readFileSync(__dirname+'/../dist/app.js','utf8');

// ---------- settings: default + one-time migration ----------
assert(appSrc.includes('manualRunning:true,runningModeChosen:false'),'settings default is manual running with no recorded choice');
const migLine=appSrc.split('\n').map(l=>l.trim()).find(l=>l.startsWith('if(!settings.runningModeChosen)'));
assert(migLine,'one-time migration line exists in app.js');
const migrate=new Function('settings',migLine);
{ // stored by an old version: false may be an explicit choice or the old
  // default -- indistinguishable, so it migrates to manual exactly once.
 const s={manualRunning:false};migrate(s);
 assert.equal(s.manualRunning,true,'old stored settings migrate to manual');
 assert.equal(s.runningModeChosen,true,'migration records itself so it runs once');
}
{ // an explicit auto choice recorded by the running controls is respected.
 const s={manualRunning:false,runningModeChosen:true};migrate(s);
 assert.equal(s.manualRunning,false,'explicit auto choice is respected');
}
{ // an explicit manual choice is untouched.
 const s={manualRunning:true,runningModeChosen:true};migrate(s);
 assert.equal(s.manualRunning,true);
}
{ // toggling the running mode records the choice (source guard).
 assert(appSrc.includes('settings.runningModeChosen=true'),'chooseRunningMode records explicit choices');
}

// ---------- career: new default manual, saves keep their recorded mode ----------
{
 const c=new NightCareer('走塁テスト','青波高校','contact','L','LF');
 assert.equal(c.manualRunning,true,'new careers default to manual running');
 const copy=x=>JSON.parse(JSON.stringify(x));
 const savedAuto=copy(c.save());savedAuto.manualRunning=false;
 assert.equal(NightCareer.restore(savedAuto).manualRunning,false,'a save recorded as auto restores as auto');
 const savedManual=copy(c.save());savedManual.manualRunning=true;
 assert.equal(NightCareer.restore(savedManual).manualRunning,true,'a save recorded as manual restores as manual');
 const legacy=copy(c.save());delete legacy.manualRunning;
 assert.equal(NightCareer.restore(legacy).manualRunning,false,'a pre-v109 save without the field keeps the old default');
}

// ---------- online host: remote running control ----------
function hostGame({remoteRunning=true,manualRunning=false,guestBats=true}={}){
 const g=new NightGame('match','standard',()=>{},{userHome:true,manualRunning,remoteSide:'away'});
 g.remoteRunning=remoteRunning;
 g.half=guestBats?'top':'bottom';
 g.remoteBatter=guestBats;g.remotePitching=!guestBats;
 if(guestBats){g.bases=[true,false,false];g.baseIds=[g.lineups.away[5].id,null,null];}
 g.startField(36,20,.3,false);
 return g;
}
{ // guest bats + guest uses manual: runners wait for the guest, and the
  // guest's command applies on the authoritative host game.
 const g=hostGame();
 assert.equal(g.field.manual.userControlled,true,'host hands runner control to the manual guest');
 const lead=g.field.runners.find(r=>r.start===1&&!r.batter);
 assert(lead,'lead runner exists');
 assert.equal(lead.command,2,'the force still moves a forced runner without any command');
 assert.equal(g.remoteCommandRunner(lead.id,3),false,'cannot queue the next leg before touching second');
 assert.equal(g.remoteCommandRunner(lead.id,0),false,'returning home is not a legal command');
 for(let i=0;i<400;i++)g.updateRunners(.02);
 assert.equal(lead.progress,2);assert(lead.waiting,'at second the runner waits for the guest');
 g.updateAutoTargets();
 assert.equal(lead.command,2,'coach does not extend the guest runner while control is handed over');
 assert(lead.waiting);
 assert.equal(g.remoteCommandRunner(lead.id,3),true,'guest advance command applies on the host');
 assert.equal(lead.command,3);assert.equal(lead.target,3);assert.equal(lead.waiting,false);
 assert.equal(g.field.manual.selection,lead.id,'host tracks the commanded runner as selected');
}
{ // guest bats + guest uses auto: the coach keeps control, commands rejected.
 const g=hostGame({remoteRunning:false});
 assert.equal(g.field.manual.userControlled,false,'auto guest leaves runners with the coach');
 const lead=g.field.runners.find(r=>r.start===1&&!r.batter);
 assert.equal(g.remoteCommandRunner(lead.id,2),false,'commands are rejected while the coach controls the runners');
}
{ // host bats: the host's own manualRunning governs; remote commands rejected.
 const g=hostGame({guestBats:false,manualRunning:true});
 assert.equal(g.field.manual.userControlled,true,'host keeps its own manual control while batting');
 const batter=g.field.runners.find(r=>r.batter);
 assert.equal(g.remoteCommandRunner(batter.id,2),false,'remote commands are rejected on the host turn');
 assert.equal(g.commandRunner(batter.id,2),false,'batter-runner must touch first before being sent on');
 for(let i=0;i<300;i++)g.updateRunners(.02);
 assert.equal(batter.progress,1);
 assert.equal(g.commandRunner(batter.id,2),true,'host commands its own runner locally');
 assert.equal(batter.command,2);
}
{ // offline games are untouched by the remote path.
 const g=new NightGame('match','standard',()=>{},{manualRunning:true});
 g.half='bottom';g.startField(36,20,.3,false);
 assert.equal(g.field.manual.userControlled,true);
 assert.equal(g.remoteCommandRunner(g.field.runners[0].id,2),false,'no remote side, no remote commands');
}

// ---------- online guest mirror: commands are forwarded, not applied ----------
function guestGame({defending=false}={}){
 const g=new NightGame('match','standard',()=>{},{userHome:false,manualRunning:true,remoteSide:'home'});
 g.mirror=true;
 g.half=defending?'bottom':'top'; // guest is the away side: bats on top
 const sent=[];g.mirrorSend=m=>sent.push(m);
 const runner={id:'away5',batter:false,start:1,base:1,progress:1,command:1,target:1,waiting:true,out:false,scored:false,needsTag:false,running:false,furthest:1};
 const batter={id:'away1',batter:true,start:0,base:0,progress:0,command:1,target:1,waiting:false,out:false,scored:false,needsTag:false,running:false,furthest:0};
 g.phase='field';
 g.field={manual:{userControlled:true,selection:'away5'},runners:[batter,runner],resolved:false,ball:{},fielders:[]};
 return {g,sent,runner};
}
{
 const {g,sent,runner}=guestGame();
 assert.equal(g.manualPlay,true,'guest sees an active manual play while batting');
 assert.equal(g.commandRunner('away5',3),false,'illegal commands are not forwarded');
 assert.equal(sent.length,0);
 assert.equal(g.commandRunner('away5',2),true,'guest swipe command is accepted for forwarding');
 assert.deepEqual(sent,[{t:'runner-command',id:'away5',base:2}]);
 assert.equal(runner.command,1,'the mirror does not apply the command locally');
 assert.equal(g.commandRunners('return'),false,'a runner on first cannot be sent back home');
 assert.equal(sent.length,1);
 assert.equal(g.commandRunners('advance'),true,'advance button forwards for the selected runner');
 assert.deepEqual(sent[1],{t:'runner-command',id:'away5',base:2});
}
{
 const {g,sent}=guestGame({defending:true});
 assert.equal(g.manualPlay,false,'no manual play while the guest defends');
 assert.equal(g.commandRunner('away5',2),false,'no runner UI actions while defending');
 assert.equal(g.commandRunners('advance'),false);
 assert.equal(sent.length,0,'nothing is sent while defending');
}

// ---------- app.js online wiring (source guards) ----------
assert(appSrc.includes("game.mirrorSend({t:'running-mode',manual:!!settings.manualRunning})"),'guest announces its running mode at match start');
assert(appSrc.includes("if(game?.mirror)game.mirrorSend?.({t:'running-mode',manual})"),'guest announces running-mode changes mid-match');
assert(appSrc.includes("m.t==='running-mode'")&&appSrc.includes('g.remoteRunning=!!m.manual'),'host stores the guest running mode');
assert(appSrc.includes("m.t==='runner-command'&&g.remoteBatter")&&appSrc.includes('g.remoteCommandRunner(m.id,m.base)'),'host routes guest runner commands to the engine');
assert(!appSrc.includes('userControlled:false'),'streamed field state no longer forces userControlled off');

console.log('online-running-v109: all assertions passed');
