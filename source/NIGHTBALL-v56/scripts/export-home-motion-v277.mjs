// Offline asset builder. It uses exactly the same model geometry and posing
// methods as the game. Nothing here is loaded or rendered on player devices.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
const D=fileURLToPath(new URL('../dist/',import.meta.url));
globalThis.window=globalThis;
globalThis.document={createElement(name){if(name!=='canvas')throw Error(name);return createCanvas(64,64);}};
vm.runInThisContext(fs.readFileSync(path.join(D,'game.js'),'utf8'),{filename:'game.js'});
const T=await import('../dist/vendor/three.module.min.js');
const {StadiumRenderer}=await import('../dist/stadium3d.js');
const out=process.argv[2]||'/tmp/nightball-home-v277';
fs.mkdirSync(out,{recursive:true});
const fps=16;
const ease=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const meshes=new Map(),geometries=[],geometryIds=new Map(),materials=[],materialIds=new Map();
const material=(color,roughness=.55,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function renderer(){
 const r=Object.create(StadiumRenderer.prototype);
 r.scene=new T.Scene();r.materials=new Map();
 r.geometries={sphere:new T.SphereGeometry(1,24,18),lowSphere:new T.SphereGeometry(1,10,7),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12)};
 r.gl={isSoftwareRenderer:true};return r;
}
function player(r,role,kit,no){
 const p=r.makePlayer(role,'home',no);
 // Use the game's geometry, pose rig, proportions and equipment. The
 // neutral home-card presentation uses original NIGHTBALL colorways.
 const [shirt,cap,pants]=kit;
 p.torsoMat.color.set(shirt);p.pantsMat.color.set(pants);p.legMat.color.set(pants);
 p.accentMat.color.set(cap);p.socksMat.color.set(cap);p.capMat.color.set(cap);p.visorMat.color.set(cap);
 const j=r.mat('homejersey'),shoe=r.mat('shoeshome'),jersey=j.clone(),cleat=shoe.clone();jersey.color.set(shirt);cleat.color.set(cap);
 p.root.traverse(o=>{if(o.isMesh&&o.material===j)o.material=jersey;if(o.isMesh&&o.material===shoe)o.material=cleat;});
 // The offline material color is used on the same jersey geometry.
 p.root.traverse(o=>{if(o.isMesh&&o.material?.map)o.visible=false;});
 // Workbench is an offline color renderer. Recreate the small N cap
 // emblem and jersey piping as geometry so they stay visible in motion.
 const deco=material(cap===0xd99a11?0x153773:cap,.62);
 const stroke=(parent,points,radius,mat)=>r.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),12,radius,6,false),mat,parent);
 for(const x of [-.025,.025])stroke(p.body,[[x,.52,.224],[x,.64,.248],[x,.81,.274],[x,.92,.248],[x,.98,.180]],.008,deco);
 for(const y of [.62,.74,.86])r.ellipsoid(p.body,[.013,.013,.010],[0,y,.274],deco,true);
 const mark=material(0xfaf4d8,.7);stroke(p.head,[[-.055,.183,.452],[-.055,.300,.432],[.055,.183,.452],[.055,.300,.432]],.012,mark);

 p.batHand='R';p.throwHand='R';p.batForm='legkick';p.pitchForm='overhand';
 p.shadow.visible=false;
 return p;
}
const blue=[0xf7f5e7,0x153c90,0xf8f5ee],red=[0xf6e7cd,0xa22339,0xf5ebd9],gold=[0xffc32e,0xd99a11,0xf7eee0],sky=[0xb9e2fd,0x153773,0xf6f0e5];
function rigBall(r){
 const g=new T.Group();r.scene.add(g);const m=material(0xfffbf0,.5);
 r.mesh(new T.SphereGeometry(.15,20,16),m,g);
 for(const a of [0,Math.PI]){
  const points=Array.from({length:27},(_,i)=>{const t=-1.3+i/26*2.6;return new T.Vector3(Math.cos(t)*.11,Math.sin(t)*.13,.08).setLength(.151).applyAxisAngle(new T.Vector3(0,1,0),a);});
  r.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),26,.008,4,false),material(0xad2734,.7),g);
 }
 return g;
}
function batPose(r,p,t,x,z,angle,start=.9,hit=1.55){
 const load=clamp((t-start)/(hit-start));const swing=t<hit?0:clamp((t-hit)/.34);
 const recover=ease((t-hit-.75)/.65);
 p.swingActive=t>=hit&&recover<1;p.pitchProgress=t<hit?load:0;
 r.animatePlayer(p,x,z,angle,t*1000,false,p.swingActive?(swing*(1-recover))/2:0);
 p.shadow.visible=false;
}
function pitchPose(r,p,t,x,z,angle,release=1.15){
 const wind=clamp((t-.2)/(release-.2)),after=t-release;
 p.releaseProgress=after>=0&&after<.6?Math.min(.26,after*.55):null;
 const reset=ease((after-.65)/.6);
 r.animatePlayer(p,x,z,angle,t*1000,false,t<release?wind:1-reset);p.shadow.visible=false;
}
function runPose(r,p,t,x,z,angle,pace=.85){r.animatePlayer(p,x,z,angle,t*1000,true,0,pace);p.shadow.visible=false;}
function ballMotion(g,t,from,to,begin,hit,end,arc=1.4){g.visible=t>=begin&&t<end;if(!g.visible)return;
 if(t<hit){const k=clamp((t-begin)/(hit-begin));g.position.set(mix(from[0],to[0],k),mix(from[1],to[1],k)+.12*Math.sin(k*Math.PI),mix(from[2],to[2],k));}
 else{const k=clamp((t-hit)/(end-hit));g.position.set(to[0]-k*5.4,to[1]+arc*k+1.3*Math.sin(k*Math.PI*.88),to[2]+k*1.2);}
 g.rotation.set(t*15,t*18,t*8);
}
function trophy(r){
 const root=new T.Group(),cup=new T.Group();r.scene.add(root);root.add(cup);
 const gold=material(0xf0bd32,.24,.8),light=material(0xffe18d,.23,.66),dark=material(0x6c3d11,.35,.38);
 const lathe=(pts,mat)=>r.mesh(new T.LatheGeometry(pts.map(v=>new T.Vector2(...v)),40),mat,cup);
 lathe([[0,.15],[.65,.15],[.65,.25],[.46,.30],[.38,.43],[.36,.52],[.38,.57],[0,.57]],dark);
 lathe([[0,.53],[.36,.53],[.33,.63],[.22,.74],[.18,1.01],[.34,1.16],[.58,1.30],[.76,1.63],[.84,1.94],[.86,2.12],[.82,2.15],[.77,2.12],[.74,1.94],[.65,1.68],[.49,1.45],[.24,1.24],[0,1.19]],gold);
 for(const s of [-1,1]){
  const v=[[s*.77,1.92,0],[s*1.15,2.07,0],[s*1.3,1.80,0],[s*1.13,1.48,0],[s*.62,1.41,0]].map(x=>new T.Vector3(...x));r.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(v),32,.075,12,false),gold,cup);
 }
 r.mesh(new T.TorusGeometry(.83,.05,12,40),light,cup).rotation.x=Math.PI/2;cup.children.at(-1).position.y=2.12;
 const badge=r.mesh(new T.SphereGeometry(.20,20,16),light,cup);badge.scale.set(1.12,1.12,.30);badge.position.set(0,1.67,.71);
 return root;
}
function flag(r,kit,x,y,z,angle){
 const group=new T.Group();r.scene.add(group);group.position.set(x,y,z);group.rotation.y=angle;
 const pole=r.mesh(new T.CylinderGeometry(.025,.025,2.2,12),material(0xead9ac,.3,.6),group);pole.position.y=1.1;
 const g=new T.PlaneGeometry(1.15,.68,15,8);g.translate(.575,1.65,0);const m=material(kit,.7);m.side=T.DoubleSide;const flag=r.mesh(g,m,group);
 const base=Float32Array.from(g.attributes.position.array);return t=>{const at=g.attributes.position;for(let i=0;i<at.count;i++){const x=base[i*3],y=base[i*3+1];at.setXYZ(i,x,y,.15*x*Math.sin(t*6-x*5+y*2));}at.needsUpdate=true;g.computeVertexNormals();};
}
const shots=[];
function shot(name,w,h,seconds,camera,init){
 const r=renderer(),anim=init(r),frames=[],n=Math.round(seconds*fps);
 const shotMeshes=[];
 for(let i=0;i<n;i++){
  const t=i/fps;anim(t);r.scene.updateMatrixWorld(true);
  const frame={};r.scene.traverse(o=>{
   if(!o.isMesh||o.material?.map)return;
   if(!meshes.has(o.id)){
    const g=o.geometry,m=o.material,geoKey=g.id;
    if(!geometryIds.has(geoKey)){
     const v=Array.from(g.attributes.position.array),index=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,j)=>j);
     geometryIds.set(geoKey,geometries.length);geometries.push({v,index,n:g.attributes.normal?Array.from(g.attributes.normal.array):null});
    }
    if(!materialIds.has(m.id)){materialIds.set(m.id,materials.length);materials.push({color:[m.color.r,m.color.g,m.color.b],roughness:m.roughness??.5,metalness:m.metalness??0});}
    meshes.set(o.id,{id:o.id,g:geometryIds.get(geoKey),m:materialIds.get(m.id)});shotMeshes.push(o.id);
   }
   let vis=o.visible,parent=o.parent;while(parent){vis&&=parent.visible;parent=parent.parent;}
   frame[o.id]={matrix:Array.from(o.matrixWorld.elements),vis};
   // Deforming cloth uses game-independent vertices only on flags.
   if(o.geometry.type==='PlaneGeometry'&&o.geometry.attributes.position.count>100)frame[o.id].v=Array.from(o.geometry.attributes.position.array);
  });
  frames.push(frame);
 }
 shots.push({name,w,h,fps,camera,meshes:shotMeshes,frames});
}
shot('hero',640,240,3.75,{width:10.7,target:[0,1.72,0],eye:[0,3.0,11]},r=>{
 const p=player(r,'pitcher',red,18),b=player(r,'batter',gold,8),ball=rigBall(r);
 return t=>{pitchPose(r,p,t,.82,.25,.75,1.15);batPose(r,b,t,3.15,.55,-.45,1.0,1.68);ballMotion(ball,t,[1.3,2.1,.55],[2.57,1.75,.80],1.13,1.68,2.42,1.1);};
});
shot('match',400,210,3.5,{width:7.1,target:[0,1.75,0],eye:[0,2.8,10]},r=>{
 const b=player(r,'batter',blue,8),ball=rigBall(r);
 return t=>{batPose(r,b,t,1.65,.2,-.40,.56,1.46);ballMotion(ball,t,[-1.8,1.76,.5],[1.10,1.58,.74],.96,1.46,2.35,1.3);};
});
shot('career',400,210,3.25,{width:6.7,target:[0,1.65,0],eye:[0,2.6,10]},r=>{
 const p=player(r,'runner',sky,7);p.root.scale.setScalar(1.9);
 return t=>{
  const phase=t/3.25;const move=ease(phase/.60);const x=.22+1.52*move,angle=mix(.90,-.48,ease((phase-.55)/.35));
  runPose(r,p,t,x,.1,angle,.82);
  if(phase>.7){const settle=ease((phase-.7)/.22);r.animatePlayer(p,x,.1,angle,t*1000,settle<.5,0,.35);p.body.position.y=.015*Math.sin(t*7);p.hands[1].position.set(.32,.95+.16*Math.sin(t*6),.2);r.poseArm(p,1,[.245,.94,0],p.hands[1].position.toArray());p.shadow.visible=false;}
 };
});
shot('online',400,190,3.0,{width:6.6,target:[0,1.45,0],eye:[0,2.7,10]},r=>{
 const a=player(r,'runner',blue,4),b=player(r,'runner',red,9);a.root.scale.setScalar(1.35);b.root.scale.setScalar(1.35);
 return t=>{const enter=ease(t/.75),turn=ease((t-1.55)/.48);runPose(r,a,t,mix(-1.6,.65,enter),-.03,1.0,enter<.98?.8:.15);runPose(r,b,t,mix(3.7,2.22,enter),.03,-1.0,enter<.98?.8:.15);
  if(t>.78){for(const [p,angle,x,s] of [[a,1.05,.65,1],[b,-1.05,2.22,-1]]){r.animatePlayer(p,x,.03,angle,t*1000,false,0);p.hands[s===1?1:0].position.set(s*.30,.67+.3*turn,.24+.26*turn);r.poseArm(p,s===1?1:0,[s*.245,.94,0],p.hands[s===1?1:0].position.toArray());p.shadow.visible=false;}}
 };
});
shot('season',400,210,3.5,{width:5.5,target:[0,1.25,0],eye:[0,2.5,10]},r=>{
 const t=trophy(r),f1=flag(r,0x2569c9,.45,0,-.1,-.25),f2=flag(r,0xb8313b,1.91,0,-.4,.25);t.position.set(1.23,.12,.35);t.scale.setScalar(.9);
 return time=>{t.rotation.y=time/3.5*Math.PI*2;t.position.y=.12+.07*Math.sin(time/3.5*Math.PI*2);f1(time);f2(time+.4);};
});
shot('hero-field',640,240,3.25,{width:10.7,target:[0,1.72,0],eye:[0,3.0,11]},r=>{
 const a=player(r,'fielder',blue,4),b=player(r,'runner',red,9),ball=rigBall(r);
 a.root.scale.setScalar(1.85);b.root.scale.setScalar(1.5);
 a.hands[0].toArray=()=>a.hands[0].position.toArray(); // offline adapter for the catch-pose hand mesh
 return t=>{
  const move=ease(t/.95),x=mix(3.7,1.67,move);
  r.animatePlayer(a,x,.15,-.4,t*1000,t<.95,0,.92);
  const f={ball:{x:1.7,y:.3,z:2.8},fielders:[{action:{type:'jump',time:.95,dx:-.3,dy:1}}],chaser:0};
  if(t>=.95&&t<1.87)r.poseFielder(a,0,f,t);
  if(t>1.87){a.hands[0].position.set(-.32,1.06,.28);r.poseArm(a,0,[-.245,.94,0],a.hands[0].position.toArray());}
  a.shadow.visible=false;
  r.animatePlayer(b,3.6,-.4,-.5,t*1000,false,0);b.shadow.visible=false;
  if(t>1.6){b.hands[1].position.set(.35,.92+.18*Math.sin(t*6),.3);r.poseArm(b,1,[.245,.94,0],b.hands[1].position.toArray());}
  const k=clamp((t-.15)/1.13);ball.visible=t>=.15&&t<1.28;ball.position.set(mix(-1.8,1.25,k),mix(3.4,3.25,k)+.35*Math.sin(Math.PI*k),.5);ball.rotation.set(t*16,t*20,0);
 };
});
shot('match-pitch',400,210,3.25,{width:7.1,target:[0,1.75,0],eye:[0,2.8,10]},r=>{
 const p=player(r,'pitcher',blue,18),ball=rigBall(r);
 return t=>{pitchPose(r,p,t,1.65,.2,-.65,1.22);const k=clamp((t-1.22)/.65);ball.visible=t>=1.22&&t<1.87;ball.position.set(mix(1.95,-2.9,k),mix(2.04,1.37,k),mix(.6,.9,k));ball.rotation.set(t*22,t*15,t*5);};
});
fs.writeFileSync(path.join(out,'scene.json'),JSON.stringify({geometries,materials,meshes:Object.fromEntries(meshes),shots}));
console.log('Exported',shots.map(s=>s.name+':'+s.frames.length).join(', '),'using game model and animation methods');
