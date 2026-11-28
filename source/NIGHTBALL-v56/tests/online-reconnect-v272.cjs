const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../dist/online.js','utf8'),app=fs.readFileSync(__dirname+'/../dist/app.js','utf8');
let now=1000,id=0;const timers=new Map();
const ctx=vm.createContext({window:{},performance:{now:()=>now},Date,Math,Uint8Array,JSON,console,crypto:globalThis.crypto,
 setTimeout:(fn,ms)=>(timers.set(++id,{at:now+ms,fn}),id),clearTimeout:h=>timers.delete(h),localStorage:{getItem:()=>null}});
vm.runInContext(src,ctx);const {Session}=ctx.window.NightOnline;
const advance=ms=>{const end=now+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
class Conn{constructor(){this.open=false;this.listeners={};this.dataChannel={bufferedAmount:0};}
 on(e,f){(this.listeners[e]??=[]).push(f);}
 emit(e,v){for(const f of this.listeners[e]||[])f(v);}
 close(){this.open=false;this.emit('close');}ready(){this.open=true;this.emit('open');}}
const log=[],s=new Session({onOpen:()=>log.push('open'),onInterrupt:()=>log.push('paused'),onResume:()=>log.push('resumed'),onClose:()=>log.push('gone'),onData:m=>log.push(m.t)},'guest','ABC234');
s.token='token';let replacement;
s.peer={connect:(name,opts)=>{assert.equal(name,'nightball-duel-ABC234');assert.equal(opts.metadata.resume,'token');return replacement=new Conn();},destroy(){}};
const c=new Conn();s.wireConn(c);c.ready();assert(s.open);
c.emit('iceStateChanged','disconnected');assert(!s.open&&s.recovering);c.emit('data',{t:'late'});assert(!log.includes('late'));
advance(200);c.emit('iceStateChanged','connected');assert(s.open&&!s.recovering);assert.deepEqual(log,['open','paused','resumed']);
c.close();advance(1700);assert(replacement);replacement.ready();assert(s.open&&!s.recovering);c.emit('data',{t:'obsolete'});assert(!log.includes('obsolete'));
replacement.close();advance(16000);assert(s.dead);assert(log.includes('gone'));s.destroy();
// Verify app barrier on a pair, including old-epoch input filtering.
const cut=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
const emitted=[],host={role:'host',sync:{epoch:3,lock:{id:1,kind:'replay'},serial:5},session:{send:m=>emitted.push(m)},delayQueue:{clear(){}}};
const g={paused:false,phase:'play-review',phaseTime:200,touch:{},remoteBatter:false},review={clip:{},playback:null},feedback={pendingReplay:true};
const scope=vm.createContext({online:host,game:g,review,playFeedback:feedback,onlineMatchActive:()=>true,performance:{now:()=>now},modalTitle:()=>'',modal(){},onlineTick:(g,force)=>emitted.push({t:'state',epoch:host.sync.epoch,recovering:host.sync.recovering}),onlineLobbyRefresh(){},onlinePeerGone(){throw Error('unexpected disconnect');}});
vm.runInContext(cut(' function onlineConnectionInterrupted()',' function onlineHeartbeat()'),scope);
scope.onlineConnectionInterrupted();assert(g.paused&&host.sync.recovering);
scope.onlineConnectionResumed();assert(g.paused&&host.sync.recovering);assert.equal(host.sync.epoch,4);assert.equal(host.sync.lock,null);assert.deepEqual(emitted.map(m=>m.t),['state','sync-resume']);
assert.equal(g.phaseTime,1400);assert.equal(review.clip,null);assert.equal(feedback.pendingReplay,false);
assert(app.includes("m.t==='sync-resume-ack'&&sync.recovering&&sync.resumeEpoch===m.epoch"));
assert(app.includes("if(sync.recovering)return;"));
console.log('PASS reconnect: transient ICE recovery, authenticated replacement, obsolete channel rejection, timeout, epoch+ack pause barrier');
