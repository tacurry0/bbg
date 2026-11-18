const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/app.js','utf8'),code=source.slice(source.indexOf(' function bindFieldAim('),source.indexOf(" bindFieldAim($('game-canvas'))"));
function setup(defending=true){
 const listeners={},events=[],game={paused:false,phase:defending?'aim':'pitch',half:'top',inning:1,defending,touch:null,setCursor(x,y){this.cursor={x,y};}},settings={leftHanded:false,cursorShift:64,cursorLift:80};
 const sandbox={game,screen:'game',settings,renderer:{screenToAim:(x,y)=>({x,y})},unlockAudio(){},swing(){events.push(game.defending?'pitch':'bat');}},el={addEventListener(n,fn){listeners[n]=fn;},setPointerCapture(){},getBoundingClientRect:()=>({left:10,top:20,width:390,height:640})};
 vm.createContext(sandbox);vm.runInContext(code+'\nbindFieldAim(el);',Object.assign(sandbox,{el}));
 const emit=(name,extra={})=>listeners[name]({pointerId:1,button:0,clientX:200,clientY:400,preventDefault(){},...extra});return {sandbox,game,events,emit};
}
let t=setup();t.emit('pointerdown');assert.equal(t.events.length,0);assert.equal(t.game.cursor.x,126);assert.equal(t.game.cursor.y,300);t.emit('pointermove',{clientX:225});assert.equal(t.game.cursor.x,151);t.emit('pointerup',{clientX:225});assert.deepEqual(t.events,['pitch']);assert.equal(t.game.touch,null);t.emit('pointerup');assert.equal(t.events.length,1);
t=setup(false);t.emit('pointerdown');t.emit('pointerup');assert.deepEqual(t.events,['bat']);
for(const cancel of ['pointercancel','lostpointercapture']){t=setup();t.emit('pointerdown');t.emit(cancel);t.emit('pointerup');assert.equal(t.events.length,0);assert.equal(t.game.touch,null);}
for(const change of [t=>t.game.paused=true,t=>t.game.half='bottom',t=>t.game.inning=2,t=>t.sandbox.game={...t.game},t=>t.sandbox.screen='home']){t=setup();t.emit('pointerdown');change(t);t.emit('pointerup');assert.equal(t.events.length,0);}
t=setup();t.emit('pointerdown');t.emit('pointerdown',{pointerId:2});t.emit('pointerup',{pointerId:2});assert.equal(t.events.length,0);t.emit('pointerup');assert.equal(t.events.length,1);
t=setup();t.game.phase='windup';t.emit('pointerdown');t.emit('pointerup');assert.equal(t.events.length,0);
t=setup();t.sandbox.settings.leftHanded=true;t.emit('pointerdown');assert.equal(t.game.cursor.x,254);t.emit('pointercancel');
console.log('PASS: release to pitch/bat, adjustable thumb offset, cancellation, pause/half/game changes, multitouch and duplicate release.');
