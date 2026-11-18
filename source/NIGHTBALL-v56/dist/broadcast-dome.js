import * as T from './vendor/three.module.min.js';
import { enhanceCrowdMaterial } from './stadium-fx.js?v=56';

const roofPoint=(park,angle,radius)=>{
 const x=Math.sin(angle)*169*radius,z=55+Math.cos(angle)*167*radius;
 return [x,NightPlayers.roofSurface(park,x,z)-.55,z];
};

export function decorateBroadcastDome(renderer,park){
 const {parkDecor:group,gl,keyLight,skyLight,scene}=renderer;
 const software=gl.isSoftwareRenderer;
 const material=(name,color)=>renderer.mat('broadcast:'+name,color);
 const arc=(material,profile,parent=group)=>parent.add(renderer.arcRibbon(...profile,material,-1.65,1.65));
 const screenLight=material('light',0xf4faff);
 screenLight.emissive.setHex(0xc2e7ff);screenLight.emissiveIntensity=.85;screenLight.fog=false;
 const roofMaterial=new T.MeshStandardMaterial({color:0xb9ccdc,roughness:.92,emissive:0x27394d,emissiveIntensity:.28,side:T.BackSide});
 const roof=renderer.mesh(new T.SphereGeometry(1,48,18,0,Math.PI*2,0,Math.PI/2),roofMaterial,group);
 roof.userData.roof=true;roof.userData.disposeMaterial=true;roof.scale.set(170,park.roofHeight-20,168);roof.position.set(0,20,55);
 const beamMaterial=material('truss',0x94a6b6);
 const cableMaterial=material('cable',0x5c758e);
 const tube=(points,radius,mat)=>{
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  if(software){
   const wire=new T.BufferGeometry().setFromPoints(curve.getPoints(13));
   const line=new T.Line(wire,new T.LineBasicMaterial({color:mat.color}));line.userData.disposeMaterial=true;group.add(line);
   return;
  }
  renderer.mesh(new T.TubeGeometry(curve,30,radius,5,false),mat,group);
 };
 const ribs=software?10:24;
 for(let i=0;i<ribs;i++){
  const angle=i/ribs*Math.PI*2;
  tube(Array.from({length:8},(_,j)=>roofPoint(park,angle,.07+j*.127)),i%3===0?.47:.21,beamMaterial);
 }
 for(const radius of [.28,.53,.80,.91]){
  tube(Array.from({length:25},(_,i)=>roofPoint(park,i/24*Math.PI*2,radius)),radius>.8?.5:.22,cableMaterial);
 }
 const fascia=material('balcony',0x677d8f),ribbon=material('ribbon',0x1b79b8),seats=material('seats',0x254b65);
 ribbon.emissive.setHex(0x166ba8);ribbon.emissiveIntensity=.55;
 const terraces=new T.Group();terraces.name='broadcast-terraces';group.add(terraces);
 const profiles=[[131,2,20,10],[139,15,19,10],[151,27,14,5]];
 for(const [r,y,w,h] of profiles){
  arc(seats,[r,r+w,y,y+h],terraces);
  for(let row=1;row<5;row++){
   const t=row/5;
   arc(row%2?fascia:seats,[r+w*t,r+w*t+.35,y+h*t,y+h*t+.16],terraces);
  }
  arc(fascia,[r,r,y-1.1,y],terraces);
  arc(ribbon,[r-.4,r-.4,y-.68,y-.25]);
 }
 for(const mat of [fascia,seats,ribbon])mat.side=T.DoubleSide;
 const crowdMat=material('crowd',0xffffff);
 if(renderer.vfx)enhanceCrowdMaterial(crowdMat,gl,renderer.vfx.crowdUniforms);
 const crowdCount=software?90:1080,geo=new T.SphereGeometry(.32,6,5),crowd=new T.InstancedMesh(geo,crowdMat,crowdCount);
 const pose=new T.Object3D();
 const colors=[0xe6eef5,0xf7f2e4,0xff9c44,0x4da0df,0x2b5374,0xe06858,0xf2d15b,0x7fc8a9].map(c=>new T.Color(c));
 for(let i=0;i<crowdCount;i++){
  const a=-1.39+(i*137%crowdCount)/crowdCount*2.78,row=(i*19%61)/61;
  const tier=i%7===0?2:i%3===0?1:0;
  if(software){
   const [r,y,w,h]=profiles[tier];
   pose.position.set((r+w*row)*Math.sin(a),y+h*row+.53,(r+w*row)*Math.cos(a));
  }else{
   const [start,floor,rows,run,rise]=[[147,1.8,12,1.21,.49],[151,12.6,9,1.37,.62],[154,23.2,7,1.85,.85]][tier];
   const seat=Math.floor(row*rows),r=start+(seat+.52)*run;
   pose.position.set(r*Math.sin(a),floor+seat*rise+.6,43+r*.79*Math.cos(a));
  }
  pose.scale.set(.92,1.46,.86);pose.updateMatrix();crowd.setMatrixAt(i,pose.matrix);crowd.setColorAt(i,colors[(i*29+i%11)%colors.length]);
 }
 group.add(crowd);
 for(let i=-8;i<=8;i++){
  if(Math.abs(i)<=1)continue;
  const a=i*.178,r=149,x=Math.sin(a)*r,z=Math.cos(a)*r;
  const rig=new T.Group();rig.position.set(x,29,z);rig.rotation.y=a;group.add(rig);
  renderer.box(rig,[7,.62,1.2],[0,0,0],beamMaterial);
  renderer.box(rig,[6.25,.25,.08],[0,-.08,-.63],screenLight);
  if(!software){
   const glow=new T.Sprite(new T.SpriteMaterial({map:renderer.glowTexture(),color:0xc3e4ff,transparent:true,opacity:.40,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
   glow.userData.disposeMaterial=true;glow.position.set(0,-.16,-.8);glow.scale.set(12,4,1);rig.add(glow);
  }
 }
 skyLight.intensity=1.72;skyLight.color.setHex(0xdff2ff);
 keyLight.intensity=3.35;keyLight.color.setHex(0xfbf5e8);
 scene.fog.density=.0014;scene.fog.color.setHex(0x1f3148);
 renderer.grassMaterial.color.setHex(0x589872);
}
