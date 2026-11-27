// v255: exercise the actual ABS UI functions with a minimal DOM stub.
const assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
const get=(from,to)=>app.slice(app.indexOf(from),app.indexOf(to,app.indexOf(from)));
const setup=`
const els={},events=[];function make(){return {hidden:true,dataset:{},style:{setProperty(){}},classList:{remove(){}},querySelector(sel){return this[sel]??=make()},replaceChildren(){},append(){},setAttribute(){},getBoundingClientRect(){return {left:0,top:0}},offsetWidth:100};}
const $=id=>els[id]??=make();$('modal').hidden=true;
const document={createElement:make},review={playback:false},renderer={},reduceAbsMotion={matches:false},NightGame={ABS_TIMING:{reviewReveal:4200}},absReview={draw(){}};
let absShownCall,absShownResult,absLastTap;
function absActorBounds(){return {x:1,y:1,w:1,h:1}}function onlineDecisionVisible(){return true}
function onEvent(t,d){events.push(d.en)}
let game={phase:'abs-call',absCall:{umpireStrike:true,strike:false},inMatch:true,strikes:2,absCanChallenge:true,absRemaining:2,pitch:{speed:145},phaseTime:0,teams:{},defending:false};
`;
new Function(setup+get('var impactRemaining=0;','function hideStaleResultBanner()')+get('function updateAbsUI(g,draw=false){',"$('play-challenge').addEventListener")+`
updateAbsUI(game);if($('impact-fx').hidden||$('impact-fx').dataset.source!=='abs'||$('abs-challenge').hidden||events.length)throw Error('called K must replace STRIKE and show ABS');
if($('stage').dataset.absStrikeout!=='true')throw Error('K layout');
updateAbsUI(game);if(events.length)throw Error('repeated call');
showImpact({en:'STRIKEOUT',celebration:{ks:1}});if($('impact-fx').dataset.settled!=='true')throw Error('confirmed K should not restart');
game.phase='result';game.absCanChallenge=false;updateAbsUI(game);if(!$('abs-challenge').hidden||$('impact-fx').hidden)throw Error('final K stays, button closes');
hideImpact();game.phase='abs-call';game.absCall={umpireStrike:true,strike:false};game.absCanChallenge=true;updateAbsUI(game);game.phase='abs-review';game.absCanChallenge=false;updateAbsUI(game);if(!$('impact-fx').hidden||$('abs-review').hidden||!$('abs-challenge').hidden)throw Error('ABS review takes over');
game.phase='abs-call';game.strikes=1;game.absCall={umpireStrike:true,strike:true};game.absCanChallenge=true;updateAbsUI(game);if(events.at(-1)!=='STRIKE'||$('abs-challenge').hidden)throw Error('ordinary strike unchanged');
`)();
assert(app.includes("call.strike?(g.inMatch&&g.strikes>=2?'STRIKEOUT':'STRIKE'):'BALL'"));
console.log('Called strikeout ABS presentation passed');
