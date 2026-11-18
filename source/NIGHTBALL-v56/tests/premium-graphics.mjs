import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import { buildPremiumPark, decorateChibiPlayer } from '../dist/stadium-premium.js';

const context = new Proxy({
 createLinearGradient:()=>({addColorStop(){}}),
 createRadialGradient:()=>({addColorStop(){}})
},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
globalThis.NightPlayers={wallDistance:()=>122};
const cache=new Map(),sphere=new T.SphereGeometry(1,12,10);
const renderer={
 gl:{isSoftwareRenderer:false},parkDecor:new T.Group(),scene:new T.Scene(),
 mat(key,color=0xffffff,roughness=.75,metalness=0){
  if(!cache.has(key))cache.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));
  return cache.get(key);
 },
 mesh(geometry,material,parent){
  const m=new T.Mesh(geometry,material);parent.add(m);return m;
 },
 ellipsoid(parent,scale,pos,material){
  const m=this.mesh(sphere,material,parent);
  m.scale.set(...scale);m.position.set(...pos);return m;
 }
};
const park={
 id:'night',theme:'night',stands:[[-1.12,-.21,.8],[.20,1.12,.8]],
 center:121.92,corner:99.06,seats:0x325e71,wall:0x11546a
};
buildPremiumPark(renderer,park);
assert(renderer.parkDecor.userData.premium);
const seats=renderer.parkDecor.children.filter(x=>x.isInstancedMesh);
assert(seats.length>=8,'seat backs, cushions, crowds and heads for each grandstand');
assert(seats.reduce((n,x)=>n+x.count,0)>1000,'thousands of real stadium detail instances');
assert(renderer.parkDecor.children.filter(x=>x.isMesh).length>40,'roof trusses, VIP suites, dugouts and billboards');
const player={
 root:new T.Group(),body:new T.Group(),head:new T.Group(),
 capMat:renderer.mat('cap',0x123756),accentMat:renderer.mat('team',0xebc86b)
};
decorateChibiPlayer(renderer,player);
assert(player.head.children.length>=11,'preserved oversize chibi face with detailed helmet');
assert(player.body.children.length>=9,'kit piping and shoulder details');
assert(player.root.children.length>=4,'cleat details');
renderer.gl.isSoftwareRenderer=true;
const previous=renderer.parkDecor.children.length;
buildPremiumPark(renderer,park);
assert.equal(renderer.parkDecor.children.length,previous,'CPU renderer can skip expensive detail');
console.log('PASS: premium WebGL geometry, thousands of 3D stands/chairs, chibi detailing and software fallback.');
