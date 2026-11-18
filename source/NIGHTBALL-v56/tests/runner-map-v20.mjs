import assert from 'node:assert/strict';
import {runnerMapState} from '../dist/runner-map.js';
const runner=(progress,target,extra={})=>({id:'r',start:0,progress,target,...extra});
const g={phase:'field',side:'home',bases:[false,false,false],lineups:{home:[{id:'r',name:'走者'}]},field:{ball:{bounces:1},outsAtContact:0,runners:[]}};
for(const [progress,x,y] of [[0,100,180],[.5,140,140],[1,180,100],[1.5,140,60],[2,100,20],[2.5,60,60],[3,20,100],[3.5,60,140]]){
 g.field.runners=[runner(progress,progress)];const [m]=runnerMapState(g);assert.equal(m.x,x);assert.equal(m.y,y);assert.equal(m.moving,false);
}
for(const [p,target,angle] of [[.5,1,45],[1.5,2,-45],[2.5,3,-135],[3.5,4,135],[.5,0,-135],[1.5,1,135],[2.5,2,45],[3.5,3,-45]]){
 g.field.runners=[runner(p,target)];const [m]=runnerMapState(g);assert(m.moving);assert(Math.abs(((m.angle-angle+540)%360)-180)<1e-8);
}
g.field.runners=[runner(1,1,{out:true}),runner(4,4),runner(3,4,{scored:true})];assert.equal(runnerMapState(g).length,0);
g.field.runners=[runner(.4,.4)];g.field.foul=true;assert.equal(runnerMapState(g).length,0);delete g.field.foul;g.phase='aim';assert.equal(runnerMapState(g).length,0);
// Automatic base reservations should be reflected, including a blocked trailing runner.
g.phase='field';g.bases=[true,false,false];g.field.runners=[runner(1.12,2,{id:'lead',start:1}),runner(1,2)];const blocked=runnerMapState(g).find(m=>m.id==='r');assert.equal(blocked.moving,false);
console.log('PASS: exact diamond positions, stopped circles, all advance/return arrow directions, automatic path blocking, out/scored/foul/next-pitch cleanup.');
