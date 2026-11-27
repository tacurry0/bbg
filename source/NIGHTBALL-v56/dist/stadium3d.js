import { jerseyUV, torsoGeometry, pantsTexture, capGeometry, visorGeometry, uniformTexture, helmetOrCap, contrast } from './uniform-render.js?v=228';
import { buildCustomPark, boardPlacement } from './custom-park3d.js?v=219';
import { rememberOriginalGround, leaveTokyoDome, showTokyoDome, domeCameraLimit } from './tokyo-nightball.js';
import * as T from './vendor/three.module.min.js';
import { CanvasSceneRenderer } from './canvas3d.js?v=228';
import { decorateBroadcastDome, decorateTaiwanPark } from './broadcast-dome.js?v=74';
import { addReferenceBackstop, decorateOpenAirPark, OPEN_AIR_MODELS } from './open-air-parks.js?v=74';
import { decorateProStadium, proOverview } from './pro-stadiums.js?v=75';
import { applyParkLighting, gameLightingMode, usesDayLight } from './game-lighting.js?v=74';
import { drawVenueVision } from './venue-vision.js?v=74';
import { loadMatchModel } from './match-models.js?v=56';
import { buildPremiumPark, decorateChibiPlayer } from './stadium-premium.js?v=228';
import {
 createStadiumEnvMap,
 createContactShadowTexture,
 createLightBeamTexture,
 createSkyMaterial,
 enhanceGrassMaterial,
 enhanceDirtMaterial,
 enhanceCrowdMaterial,
 StadiumVFX
} from './stadium-fx.js?v=205';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const Y=new T.Vector3(0,1,0);
const BALL_RADIUS=.078;
const FENCE_SEGMENTS=96;
const FLOODLIGHT_ANGLES=[-1.08,-.72,-.24,.24,.72,1.08];
const GRASS_PALETTES={
 outdoor:['#9dbf84','#84af76','#8bb780'],
 dome:['#86b4a2','#649286','#80aa98'],
 school:['#b3c28a','#9bab78','#a5b57b'],
 broadcast:['#a2b97a','#869f60','#9caf70']
};
const VENUE_VISION_PARKS=new Set(['tokyo-dome','dome','taipei-dome',...Object.keys(OPEN_AIR_MODELS)]);
const OVERVIEW_FRAMES={
 'tokyo-dome':{height:27,behind:42,target:54,portrait:73,landscape:60},
 'taipei-dome':{height:30,behind:43,target:53,portrait:74,landscape:64},
 dome:{height:21.8,behind:37,target:52,portrait:68,landscape:60},
 sky:{height:25.2,behind:39,target:51,portrait:72,landscape:60},
 harbor:{height:22.1,behind:46,target:53,portrait:76,landscape:60,minHorizontal:63},
 river:{height:25.8,behind:45,target:52,portrait:76,landscape:60,minHorizontal:63},
 toyama:{height:23.2,behind:47,target:51,portrait:75,landscape:60,minHorizontal:63}
};
const DEFAULT_OVERVIEW={height:21.4,behind:36.5,target:51,portrait:68,landscape:60};
const skinColors=[0xd3a383,0xba896a,0xe0ae8d,0xb78367];

export class StadiumRenderer {
 constructor(canvas,hero=false){
  this.canvas=canvas;this.hero=hero;this.width=0;this.height=0;this.lastTime=0;this.fieldMode=false;this.parkKey='';
  try{this.gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{this.gl=new CanvasSceneRenderer({canvas});}
  this.canvas.dataset.graphics=this.gl.isSoftwareRenderer?'canvas-3d':'webgl-3d';
  this.graphicsRatio=Math.min(devicePixelRatio||1,hero?1.25:1.65);this.gl.setPixelRatio(this.graphicsRatio);this.gl.outputColorSpace=T.SRGBColorSpace;
  this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.10;this.gl.shadowMap.enabled=!hero;this.gl.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.scene.scale.z=-1;this.scene.background=new T.Color(0x081326);this.scene.fog=new T.FogExp2(0x0c1b31,.0036);
  this.envMap=createStadiumEnvMap(this.gl);if(this.envMap)this.scene.environment=this.envMap;
  this.camera=new T.PerspectiveCamera(hero?52:44,1,.8,450);this.raycaster=new T.Raycaster();this.aimPlane=new T.Plane(new T.Vector3(0,0,1),.6);
  this.skyLight=new T.HemisphereLight(0xd7e9ff,0x4d6b47,1.65);this.scene.add(this.skyLight);
  const key=this.keyLight=new T.DirectionalLight(0xfff1d6,3.35);key.position.set(-27,55,-20);key.castShadow=!hero;
  const shadowRes=hero?512:2048;key.shadow.mapSize.set(shadowRes,shadowRes);Object.assign(key.shadow.camera,{left:-34,right:34,top:44,bottom:-22,near:1,far:145});key.shadow.normalBias=.045;key.shadow.bias=-.00035;this.scene.add(key);this.scene.add(key.target);
  const fill=new T.DirectionalLight(0xbadfff,1.18);fill.position.set(32,30,55);this.scene.add(fill);
  this.rimLight=new T.DirectionalLight(0x94d0ff,1.10);this.rimLight.position.set(0,32,96);this.scene.add(this.rimLight);
  this.clubImages=new Map();if(typeof Image==='function')for(const club of (NightTeams.playable||NightTeams.all)){const img=new Image();img.onload=()=>{this.boardKey=null;};img.src=club.logo;this.clubImages.set(club.id,img);}
  this.cameraFocus=new T.Vector3();this.fieldPosition=new T.Vector3();this.fieldFocus=new T.Vector3();
  this.materials=new Map();this.geometries={sphere:new T.SphereGeometry(1,32,24),lowSphere:new T.SphereGeometry(1,10,7),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12)};
  this.contactShadowTex=this.gl.isSoftwareRenderer?null:createContactShadowTexture();
  this.vfx=new StadiumVFX(this);
  this.makeSky();
  const groundStart = this.scene.children.length;
  this.makeGround();
  rememberOriginalGround(this, this.scene.children.slice(groundStart));
  this.makeStadium();
  this.pitcher=this.makePlayer('pitcher','away',18);this.batter=this.makePlayer('batter','home',8);this.catcher=this.makePlayer('catcher','away',2);
  this.fielders=Array.from({length:9},(_,i)=>this.makePlayer('fielder','away',i+1));this.runners=Array.from({length:4},(_,i)=>this.makePlayer('runner','home',i+1));
  this.players=[this.pitcher,this.batter,this.catcher,...this.fielders,...this.runners];
  for(const player of this.players){decorateChibiPlayer(this,player);this.stylePlayer(player,player.team,player.no);}
  this.loadUniforms();
  this.ball=new T.Group();this.ball.userData.dynamic=true;
  const leather=this.mesh(new T.SphereGeometry(BALL_RADIUS,20,14),this.mat('ball',0xfffdf7,.42,.02),this.ball);leather.castShadow=true;
  for(const turn of [0,Math.PI]){
   const points=[];
   for(let i=0;i<=28;i++){
    const a=-1.3+i/28*2.6;
    points.push(new T.Vector3(Math.cos(a)*.057,Math.sin(a)*.066,.042).setLength(BALL_RADIUS+.001).applyAxisAngle(Y,turn));
   }
   this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.0032,4,false),this.mat('seam',0xb33631,.65),this.ball);
  }
  this.pitchSpinAxis=new T.Vector3();
  this.scene.add(this.ball);
  this.ballHalo=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture(),color:0xffffda,transparent:true,opacity:.38,depthWrite:false,blending:T.AdditiveBlending,fog:false}));this.ballHalo.scale.set(.48,.48,1);this.ballHalo.userData.dynamic=true;this.scene.add(this.ballHalo);
  this.ballShadow=this.contactShadowTex
   ?this.mesh(new T.PlaneGeometry(.46,.46),new T.MeshBasicMaterial({map:this.contactShadowTex,transparent:true,opacity:.72,depthWrite:false}))
   :this.mesh(new T.CircleGeometry(.17,24),new T.MeshBasicMaterial({color:0x041a13,transparent:true,opacity:.38,depthWrite:false}));
  this.ballShadow.userData.dynamic=true;this.ballShadow.rotation.x=-Math.PI/2;
  const trailG=new T.BufferGeometry();trailG.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(42),3));this.trail=new T.Line(trailG,new T.LineBasicMaterial({color:0xffe8ad,transparent:true,opacity:.5}));this.trail.userData.dynamic=true;this.scene.add(this.trail);
  this.landing=this.mesh(new T.RingGeometry(.64,.78,48),new T.MeshBasicMaterial({color:0xffe147,transparent:true,opacity:.92,side:T.DoubleSide,depthWrite:false}));this.landing.userData.dynamic=true;this.landing.rotation.x=-Math.PI/2;
  this.landingInner=this.mesh(new T.RingGeometry(.44,.50,48),this.landing.material);this.landingInner.userData.dynamic=true;this.landingInner.rotation.x=-Math.PI/2;
  if(!hero){this.hud=document.createElement('canvas');this.hud.className='stadium-hud';this.hud.setAttribute('aria-hidden','true');canvas.parentElement.appendChild(this.hud);this.ctx=this.hud.getContext('2d');}
  this.resetCamera();this.resize();
 }
 mat(key,color,roughness=.75,metalness=0){if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return this.materials.get(key);}
 mesh(geometry,material,parent=this.scene){const m=new T.Mesh(geometry,material);parent.add(m);return m;}
 ellipsoid(parent,scale,pos,material,low=false){const m=this.mesh(low?this.geometries.lowSphere:this.geometries.sphere,material,parent);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;return m;}
 box(parent,scale,pos,mat){const m=this.mesh(this.geometries.box,mat,parent);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;return m;}
 limb(parent,a,b,r,mat){const m=this.mesh(this.geometries.cylinder,mat,parent);this.moveLimb(m,a,b,r);m.castShadow=true;return m;}
 moveLimb(mesh,a,b,r=.07){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),d=bb.clone().sub(aa);mesh.position.copy(aa.add(bb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(Y,d.clone().normalize());mesh.scale.set(r,d.length(),r);}
 glowTexture(){if(this._glow)return this._glow;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'#ffffff');g.addColorStop(.16,'#fff9d1aa');g.addColorStop(.45,'#ffffba22');g.addColorStop(1,'#ffffb000');x.fillStyle=g;x.fillRect(0,0,128,128);return this._glow=new T.CanvasTexture(c);}
 noiseTexture(kind,surface='outdoor'){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');const [base,dark,light]=GRASS_PALETTES[surface];x.fillStyle=kind==='grass'?base:surface==='broadcast'?'#c79878':'#bd825e';x.fillRect(0,0,512,512);
  if(kind==='grass')for(let i=0;i<16;i++){x.fillStyle=i%2?dark:light;x.fillRect(i*32,0,32,512);}
  for(let i=0;i<18000;i++){const k=(i*7919)%512,j=(i*3571+Math.floor(i/512)*31)%512;x.fillStyle=i%2?'#ffffff22':'#09150524';x.fillRect(k,j,1+(i%2),kind==='grass'?4:1);}
  const tex=new T.CanvasTexture(c);tex.userData.kind=kind;tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(kind==='grass'?3:1,kind==='grass'?3:1);tex.anisotropy=Math.min(8,this.gl.capabilities.getMaxAnisotropy());return tex;}
 flatShape(points,mat,y=.04){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const m=this.mesh(new T.ShapeGeometry(shape),mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;return m;}
 chalk(points,r=.04,color=0xf4efda){return this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(2,points.length*2),r,5,false),this.mat('chalk'+color,color));}
 makeSky(){
  if(this.gl.isSoftwareRenderer)return;
  this.sky=this.mesh(new T.SphereGeometry(295,32,20),createSkyMaterial());
  this.sky.position.z=55;
  this.sky.renderOrder=-100;
 }
 makeGround(){
  const grass=new T.MeshStandardMaterial({map:this.noiseTexture('grass'),roughness:.88});const ground=this.ground=this.mesh(new T.PlaneGeometry(420,420),grass);ground.rotation.x=-Math.PI/2;ground.position.z=55;ground.receiveShadow=true;
  if(this.gl.isSoftwareRenderer){
   this.mowing=new T.MeshBasicMaterial({color:0x152a17,opacity:.20,transparent:true,depthWrite:false,side:T.DoubleSide});
   for(let x=-205;x<205;x+=19)this.flatShape([[x-26,-154],[x-18,-154],[x+44,264],[x+36,264]],this.mowing,.005);
  }

  const dirt=new T.MeshStandardMaterial({map:this.noiseTexture('dirt'),color:0xd8b18c,roughness:.94});this.dirt=dirt;this.grassMaterial=grass;
  this.grassUniforms=enhanceGrassMaterial(grass,this.gl);
  enhanceDirtMaterial(dirt,this.gl);
  const skin=[[0,-1.8],[25,24]];
  for(let i=0;i<=36;i++){
   const a=Math.PI*.20+i/36*Math.PI*.60;
   skin.push([Math.cos(a)*29,18.4+Math.sin(a)*27.8]);
  }
  skin.push([-25,24]);
  this.infieldSkin=[
   this.flatShape(skin,dirt),
   this.flatShape([[0,3.6],[15.5,19.4],[0,34.6],[-15.5,19.4]],grass,.075)
  ];
  this.tokyoCutouts=[[0,-.1,4.45],[19.4,19.4,3.1],[0,38.8,3.35],[-19.4,19.4,3.1]].map(([x,z,radius])=>{
   const cutout=this.mesh(new T.CircleGeometry(radius,48),dirt);
   cutout.rotation.x=-Math.PI/2;cutout.position.set(x,.032,z);cutout.receiveShadow=true;
   return cutout;
  });
  const mound=this.mesh(new T.CylinderGeometry(2.7,2.98,.19,48),dirt);mound.position.set(0,.07,18.4);mound.receiveShadow=true;
  for(const [x,z,width,depth,angle] of [[-1.66,-.23,1.5,2.25,-.04],[1.66,-.23,1.5,2.25,.04],[0,18.02,2.55,1.25,0]]){
   const worn=this.mesh(new T.CircleGeometry(1,28),new T.MeshBasicMaterial({color:0x9e6945,transparent:true,opacity:.26,depthWrite:false}));
   worn.position.set(x,z>10?.168:.061,z);worn.rotation.set(-Math.PI/2,0,angle);worn.scale.set(width/2,depth/2,1);
  }
  const homeCircle=this.mesh(new T.CircleGeometry(3.65,48),dirt);homeCircle.rotation.x=-Math.PI/2;homeCircle.position.set(0,.03,-.1);homeCircle.receiveShadow=true;this.infieldSkin.push(homeCircle);
  const white=this.mat('base',0xfff7e6,.78),baseTrim=this.mat('baseTrim',0x1d252b,.85);
  for(const [bx,bz] of [[19.4,19.4],[0,38.8],[-19.4,19.4]]){
   const pad=this.box(this.scene,[.56,.11,.56],[bx,.095,bz],white);pad.rotation.y=Math.PI/4;
   const rim=this.box(this.scene,[.61,.04,.61],[bx,.052,bz],baseTrim);rim.rotation.y=Math.PI/4;
  }
  this.box(this.scene,[.64,.04,.16],[0,.182,18.4],white);
  const plateRim=this.flatShape([[-.27,.27],[.27,.27],[.27,-.01],[0,-.285],[-.27,-.01]],baseTrim,.084);plateRim.scale.setScalar(2.2);
  this.homePlate=this.flatShape([[-.25,.25],[.25,.25],[.25,0],[0,-.26],[-.25,0]],white,.09);this.homePlate.scale.setScalar(2.2);
  this.foulLines=[-1,1].map(sign=>this.mesh(this.geometries.box,white));
  for(const sign of [-1,1]){
   const x=sign*1.65;
   for(const z of [-1.2,.5])this.box(this.scene,[.86,.012,.042],[x,.082,z],white);
   for(const edge of [-.43,.43])this.box(this.scene,[.042,.012,1.72],[x+edge,.082,-.35],white);
   // On-deck circles & coach's boxes
   const od=this.mesh(new T.RingGeometry(.88,1.02,32),white);od.rotation.x=-Math.PI/2;od.position.set(sign*7.4,.045,-3.6);
   const odInner=this.mesh(new T.CircleGeometry(.88,32),this.mat('ondeckMat'+sign,sign>0?0x1f4f46:0x6b352c,.9));odInner.rotation.x=-Math.PI/2;odInner.position.set(sign*7.4,.042,-3.6);
   const cb=this.box(this.scene,[.05,.012,3.4],[sign*22.2,.045,15.8],white);cb.rotation.y=sign*Math.PI/4;
  }
  // Catcher's box chalk
  for(const side of [-.62,.62])this.box(this.scene,[.038,.012,1.25],[side,.081,-1.82],white);
  this.box(this.scene,[1.28,.012,.038],[0,.081,-2.44],white);
 }
 arcRibbon(r1,r2,y1,y2,mat,a1=-1.34,a2=1.34){const ps=[],ns=[],uv=[],ids=[],segments=Math.max(6,Math.ceil((a2-a1)*12));for(let i=0;i<=segments;i++){const a=a1+(a2-a1)*i/segments;for(const [r,y]of [[r1,y1],[r2,y2]]){ps.push(Math.sin(a)*r,y,Math.cos(a)*r);ns.push(0,1,0);uv.push(i/segments,y);}if(i<segments){const j=i*2;ids.push(j,j+1,j+2,j+1,j+3,j+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return this.mesh(g,mat);}
 makeStadium(){
  this.lights=[];this.lightGlows=[];this.lightBeams=[];
  const steel=this.mat('steel',0x758a93,.36,.55);
  const beamTex=this.gl.isSoftwareRenderer?null:createLightBeamTexture();
  const beamMat=beamTex?new T.MeshBasicMaterial({map:beamTex,transparent:true,opacity:.52,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false}):null;
  const bulbMat=this.bulbMat=new T.MeshBasicMaterial({color:0xfff9e2,fog:false});
  for(const a of FLOODLIGHT_ANGLES){
   const root=new T.Group();root.position.set(Math.sin(a)*140,0,Math.cos(a)*140);root.rotation.y=a;this.scene.add(root);this.lights.push(root);
   const pole=this.box(root,[.62,31,.62],[0,15.5,0],steel);pole.castShadow=false;
   const secondPole=this.box(root,[.62,31,.62],[2.30,15.5,0],steel);
   secondPole.castShadow=false;secondPole.visible=false;
   root.userData.pole=pole;root.userData.secondPole=secondPole;
   const arm=this.box(root,[2.2,.35,1.2],[0,28.5,0],steel);arm.castShadow=false;
   const housing=this.box(root,[9.0,4.5,.75],[0,31,0],this.mat('lightHousing',0x3d525c,.42,.48));housing.castShadow=false;
   const bulb=new T.InstancedMesh(new T.SphereGeometry(.28,6,4),bulbMat,32);const o=new T.Object3D();for(let i=0;i<32;i++){o.position.set((i%8-3.5)*1.04,29.6+Math.floor(i/8)*.96,-.52);o.updateMatrix();bulb.setMatrixAt(i,o.matrix);}root.add(bulb);
   const glow=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture(),color:0xffe9ba,transparent:true,opacity:.48,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
   glow.position.set(0,31,-.7);glow.scale.set(22,13,1);root.add(glow);this.lightGlows.push(glow);
   if(beamMat){
    const beam=this.mesh(new T.PlaneGeometry(24,38),beamMat,root);
    beam.position.set(0,17.2,-11.5);beam.rotation.x=-.55;beam.renderOrder=5;
    this.lightBeams.push(beam);
   }
  }
  const board=this.board=new T.Group();this.scene.add(board);
  this.box(board,[30.6,14.6,1.3],[0,0,.05],this.mat('boardTrim',0x182b38,.36,.52));
  this.box(board,[31.2,.55,1.8],[0,7.4,-.25],this.mat('boardHood',0x2c4657,.38,.48));
  this.boardPillars=[this.box(board,[.95,18,.95],[-9.6,-15.8,.2],steel),this.box(board,[.95,18,.95],[9.6,-15.8,.2],steel)];
  this.boardCanvas=document.createElement('canvas');this.boardCanvas.width=1024;this.boardCanvas.height=448;this.boardTexture=new T.CanvasTexture(this.boardCanvas);this.boardTexture.colorSpace=T.SRGBColorSpace;
  const face=this.mesh(new T.PlaneGeometry(28.4,12.4),new T.MeshBasicMaterial({map:this.boardTexture,fog:false}),board);face.renderOrder=50;face.rotation.y=Math.PI;face.scale.x=-1;face.position.z=-.72;
  board.traverse(m=>{if(m.isMesh)m.castShadow=false;});
  this.drawBoard(null);
  this.wallGroup=new T.Group();this.scene.add(this.wallGroup);this.parkDecor=new T.Group();this.scene.add(this.parkDecor);
  this.setPark(NightPlayers.parks[0]);
 }
 setPark(park,selection='auto'){
  const mode=gameLightingMode(park.customSpec?.daylight&&park.customSpec.daylight!=='auto'?park.customSpec.daylight:selection);
  // A custom park keeps its id when edited, so the fence signature must
  // join the cache key or an edited park would keep its old 3D wall.
  const parkSig=park.customSpec?JSON.stringify(park.customSpec):[park.left,park.leftCenter,park.center,park.rightCenter,park.right,park.wallHeight].join('/');
  if(this.parkKey===park.id&&this.parkSig===parkSig){
   if(this.lightingMode!==mode)applyParkLighting(this,park,mode);
   return;
  }
  leaveTokyoDome(this);
  this.parkKey=park.id;this.parkSig=parkSig;
  if(this.grassUniforms){
   const left=park.left??park.corner,right=park.right??park.corner;
   this.grassUniforms.uFenceAnchors.value.set(left,park.leftCenter??(left+park.center)/2,park.center,park.rightCenter??(right+park.center)/2);
   this.grassUniforms.uFenceRight.value=right;
   this.grassUniforms.uStraightFence.value=park.straightFence?1:0;
   this.grassUniforms.uIsSchool.value=park.school?1:0;
   this.grassUniforms.uIsDome.value=(park.theme==='dome'||park.id==='tokyo-dome')?1:0;
   this.grassUniforms.uConcourseColor.value.setHex(park.school?0x586552:park.id==='tokyo-dome'?0x1c2c3d:0x16222f);
   this.grassUniforms.uVenueMow.value.set(...(park.mowing??[0,1]));
  }
  this.decoratePark(park);this.prepareSupporters();for(const m of this.wallGroup.children){if(m.geometry&&!Object.values(this.geometries).includes(m.geometry))m.geometry.dispose();if(m.userData.parkMarker){m.material.map.dispose();m.material.dispose();}}this.wallGroup.clear();
  const wall=[],seams=[],rail=[],track=[],trackEdge=[],pts=[];
  const trackWidth=park.trackWidth??4.15;
  const colorKey=park.id;
  if(park.custom)for(const k of ['wall','padSeam','rail','warningTrack','warningEdge']){const m=this.materials.get(colorKey+k);if(m){m.dispose();this.materials.delete(colorKey+k);}}
  const quad=(out,a,b,c,d)=>out.push(...a,...b,...c,...c,...b,...d);
  for(const [i,sign] of [-1,1].entries()){
   const line=this.foulLines[i],length=NightPlayers.wallDistance(park,sign*Math.PI/4)-.25;
   line.rotation.y=sign*Math.PI/4;
   line.position.set(sign*length/Math.sqrt(8),.068,length/Math.sqrt(8));
   line.scale.set(.07,.014,length);
  }
  for(let i=0;i<=FENCE_SEGMENTS;i++){const angle=-Math.PI/4+i/FENCE_SEGMENTS*Math.PI/2,r=NightPlayers.wallDistance(park,angle);pts.push({x:Math.sin(angle)*r,z:Math.cos(angle)*r,r,h:NightPlayers.fenceHeight(park,angle)});}
  for(let i=0;i<FENCE_SEGMENTS;i++){
   const a=pts[i],b=pts[i+1],innerA=(a.r-trackWidth)/a.r,innerB=(b.r-trackWidth)/b.r;
   quad(wall,[a.x,0,a.z],[a.x,a.h,a.z],[b.x,0,b.z],[b.x,b.h,b.z]);
   if(i%2===0){
    const inset=1-.035/a.r,dx=(b.x-a.x)*.039,dz=(b.z-a.z)*.039,x=a.x*inset,z=a.z*inset;
    quad(seams,[x,.08,z],[x,a.h-.13,z],[x+dx,.08,z+dz],[x+dx,a.h-.13,z+dz]);
   }
   quad(rail,[a.x*.997,a.h+.1,a.z*.997],[a.x*1.003,a.h+.1,a.z*1.003],
    [b.x*.997,b.h+.1,b.z*.997],[b.x*1.003,b.h+.1,b.z*1.003]);
   quad(track,[a.x,.015,a.z],[a.x*innerA,.015,a.z*innerA],[b.x,.015,b.z],[b.x*innerB,.015,b.z*innerB]);
   const edgeA=innerA+.11/a.r,edgeB=innerB+.11/b.r;
   quad(trackEdge,[a.x*edgeA,.024,a.z*edgeA],[a.x*innerA,.024,a.z*innerA],
    [b.x*edgeB,.024,b.z*edgeB],[b.x*innerB,.024,b.z*innerB]);
  }
  const make=(positions,mat)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();mat.side=T.DoubleSide;const mesh=this.mesh(geo,mat,this.wallGroup);mesh.receiveShadow=true;};
  const pads=this.mat(colorKey+'wall',park.wall,.66);
  make(wall,pads);
  const tokyo=park.id==='tokyo-dome';
  const tianmu=park.id==='brick',taipei=park.id==='taipei-dome';
  make(seams,this.mat(colorKey+'padSeam',new T.Color(park.wall).multiplyScalar(.62).getHex(),.92));make(rail,this.mat(colorKey+'rail',park.rail,.48,.18));
  const trackColor=park.track??(tokyo?0x3c6247:tianmu?0x9c534c:taipei?0xc67543:0xa77959);
  const edgeColor=park.track?new T.Color(trackColor).multiplyScalar(1.21).getHex():tokyo?0x65825e:tianmu?0xa75951:0xcba684;
  make(track,this.mat(colorKey+'warningTrack',trackColor,.96));
  make(trackEdge,this.mat(colorKey+'warningEdge',edgeColor,.92));
  for(const [i,point] of pts.entries()){
   if(i%(FENCE_SEGMENTS/(park.custom?8:4))===0){
    const panel=this.distancePanel(Math.round(point.r),park.id+'-'+i,!park.alleysVerified&&i%(FENCE_SEGMENTS/2)!==0);
    panel.position.set(point.x*.992,point.h*.56,point.z*.992);
    const prev=pts[Math.max(0,i-1)],next=pts[Math.min(FENCE_SEGMENTS,i+1)];
    panel.rotation.y=Math.atan2(prev.z-next.z,next.x-prev.x);
    this.wallGroup.add(panel);
   }
  }
  const poleMat=this.mat('foulPole',0xf6cf46,.38,.28),screenMat=this.mat('foulScreen',0xe8bf38,.55,.2);
  for(const [idx,point] of [pts[0],pts.at(-1)].entries()){
   const sign=idx===0?-1:1;
   this.box(this.wallGroup,[.20,14.5,.20],[point.x,7.25,point.z],poleMat);
   const wing=this.box(this.wallGroup,[.46,10.5,.04],[point.x-sign*.24,9.0,point.z+sign*.24],screenMat);
   wing.rotation.y=sign*Math.PI/4;
  }
  if(!park.custom&&!park.pro&&!VENUE_VISION_PARKS.has(park.id))buildPremiumPark(this,park);
  applyParkLighting(this,park,mode);
  if (park.id === 'tokyo-dome') showTokyoDome(this);
 }
 loadUniforms(){
  if(typeof location==='undefined')return;
  loadMatchModel('jersey').then(model=>{
   if(!model)return;
   // The software renderer keeps the original low-cost jersey silhouette.
   const players=this.gl.isSoftwareRenderer?[this.batter,this.pitcher,this.catcher]:this.players;
   for(const player of players){
    const jersey=model.clone();
    jersey.traverse(mesh=>{
     if(mesh.name==='Uniform'){if(!this.uniformGLBGeometry)this.uniformGLBGeometry=jerseyUV(mesh.geometry);mesh.geometry=this.uniformGLBGeometry;mesh.material=player.torsoMat;}else if(mesh.name==='Piping')mesh.visible=false;
     if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}
    });
    player.body.add(jersey);
    player.jerseyPlaceholder.visible=false;
   }
   this.heroRendered=false;
   this.canvas.dataset.playerModel='jersey';
  });
 }
 distancePanel(distance,key,estimated=false){
  const c=document.createElement('canvas');c.width=256;c.height=128;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#0c2735';ctx.fillRect(0,0,256,128);
  ctx.strokeStyle='#f3cb4c';ctx.lineWidth=6;ctx.strokeRect(7,7,242,114);
  ctx.font='900 76px Arial';ctx.textAlign='center';ctx.fillStyle='#fff9df';
  ctx.fillText((estimated?'~':'')+distance+'m',128,90);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  const panel=new T.Mesh(new T.PlaneGeometry(3.5,1.75),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
  panel.renderOrder=2;panel.userData.parkMarker=key;return panel;
 }
 prepareSupporters(){
  this.supporterKey=null;this.supporterMeshes=[];
  this.parkDecor.traverse(o=>{
   if(!o.isInstancedMesh||!/(spectators|seated crowd|crowd heads|nightball crowd)/i.test(o.name))return;
   if(!this.gl.isSoftwareRenderer&&!o.material.userData.crowdEnhanced){
    o.material=o.material.clone();o.material.userData.crowdEnhanced=false;o.userData.disposeMaterial=true;
    enhanceCrowdMaterial(o.material,this.gl,this.vfx.crowdUniforms);
   }
   if(o.instanceColor&&!/crowd heads/i.test(o.name))this.supporterMeshes.push({mesh:o,colors:o.instanceColor.array.slice()});
  });
 }
 updateSupporters(g){
  if(!g||!this.supporterMeshes?.length)return;
  const home=g.teams.home,away=g.teams.away,key=[home.id,away.id,home.color,away.color].join('/');
  if(this.supporterKey===key)return;this.supporterKey=key;
  const matrix=new T.Matrix4(),color=new T.Color(),homeColor=new T.Color(home.color||0xffffff),awayColor=new T.Color(away.color||0xffffff);
  for(const {mesh,colors} of this.supporterMeshes){
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);const e=matrix.elements;
    if(Math.hypot(e[4],e[5],e[6])<.38)continue;
    color.fromArray(colors,i*3);const section=Math.floor(e[12]/12);
    if((i*17+Math.abs(section)*13)%10<8)color.lerp(section<0?awayColor:homeColor,.72);
    mesh.setColorAt(i,color);
   }
   mesh.instanceColor.needsUpdate=true;
  }
 }
 decoratePark(park){
  if(!this.parkDecor)return;
  this.parkDecor.traverse(o=>{
   if(o.geometry&&!Object.values(this.geometries).includes(o.geometry))o.geometry.dispose();
   if(o.userData.disposeTexture)o.material.map.dispose();
   if(o.userData.disposeMaterial)o.material.dispose();
   if(o.isInstancedMesh)o.dispose();
  });this.parkDecor.clear();
  delete this.canvas.dataset.parkModel;
  if(this.proVision){
   const id=this.proVision.id,vision=this.venueVisionCache?.get(id);
   if(vision){vision.material.map.dispose();vision.material.dispose();this.venueVisionCache.delete(id);}
   this.proVision=null;
  }
  this.lights.forEach((light,i)=>{
   const a=FLOODLIGHT_ANGLES[i];
   light.position.set(Math.sin(a)*140,0,Math.cos(a)*140);light.rotation.y=a;
   light.scale.setScalar(1);light.userData.pole.position.x=0;
   light.userData.pole.visible=true;light.userData.secondPole.visible=false;
  });
  const theme=park.theme||park.id,indoors=theme==='dome',day=usesDayLight(park);
  const broadcast=park.id==='tokyo-dome';
  const customVenue=park.pro||VENUE_VISION_PARKS.has(park.id),cutouts=park.cutouts??(customVenue&&indoors);
  this.board.visible=!customVenue;
  for(const mesh of this.infieldSkin)mesh.visible=!cutouts;
  if(park.infield==='dirt')this.infieldSkin[1].visible=false;
  for(const mesh of this.tokyoCutouts)mesh.visible=cutouts;
  const surface=broadcast?'broadcast':indoors?'dome':park.school?'school':'outdoor';
  this.turfTextures||={outdoor:this.grassMaterial.map};
  this.turfTextures[surface]||=this.noiseTexture('grass',surface);
  this.grassMaterial.map=this.turfTextures[surface];
  this.dirtTextures||={outdoor:this.dirt.map};
  if(broadcast)this.dirtTextures.broadcast||=this.noiseTexture('dirt','broadcast');
  this.dirt.map=this.dirtTextures[broadcast?'broadcast':'outdoor'];
  this.dirt.color.setHex(park.clay??(broadcast?0xb38e76:indoors?0xc49e88:park.school?0xc0a182:0xd8b18c));
  this.scene.userData.venueClay=park.clay!==undefined;
  if(this.mowing)this.mowing.opacity=park.school ? .20 : .14*(park.mowing?.[1]??1);
  if(this.boardPillars)for(const p of this.boardPillars)p.visible=!indoors;
  this.ground.visible=!park.custom;
  if(park.custom){
   for(const m of [...this.infieldSkin,...this.tokyoCutouts])m.visible=false;
   if(this.mowing)this.mowing.opacity=0;
   for(const light of this.lights)light.visible=false;
   buildCustomPark(this.parkDecor,park);
   const board=boardPlacement(park);this.board.position.set(...board.pos);this.board.rotation.y=board.angle;this.board.scale.set(board.width/30,board.height/14,1);
   this.customBoardStyle=park.customSpec.boardStyle;this.boardKey=null;this.canvas.dataset.parkModel='custom';
   return;
  }
  this.customBoardStyle=null;this.board.rotation.y=0;
  if(customVenue){
   for(const light of this.lights)light.visible=!indoors;
   if(park.pro)decorateProStadium(this,park);
   else if(broadcast)decorateBroadcastDome(this,park);
   else if(OPEN_AIR_MODELS[park.id])decorateOpenAirPark(this,park);
   else decorateTaiwanPark(this,park);
   addReferenceBackstop(this,park);
   this.canvas.dataset.parkModel=OPEN_AIR_MODELS[park.id]||(park.id==='dome'?'taoyuan':park.id);
   this.boardKey=null;
   return;
  }
  const group=this.parkDecor,concrete=this.mat('concrete',0x8694a0),seats=this.mat(park.id+'seats',park.seats);seats.side=T.DoubleSide;concrete.side=T.DoubleSide;
  const rowMaterial=this.mat(park.id+'row',new T.Color(park.seats).multiplyScalar(1.34).getHex());
  const addArc=(...args)=>{args[4].side=T.DoubleSide;group.add(this.arcRibbon(...args));};
  const crowdMat=this.mat('crowd',0xffffff);
  if(this.vfx)enhanceCrowdMaterial(crowdMat,this.gl,this.vfx.crowdUniforms);
  for(const [a,b,height] of park.stands){
   const rise=15*height,start=park.school?NightPlayers.wallDistance(park,clamp((a+b)/2,-Math.PI/4,Math.PI/4))+5:129;
   const end=start+29*height;
   addArc(start,end,.5,rise,seats,a,b);
   addArc(end,end+2,rise,rise+.3,concrete,a,b);
   addArc(start,start,.08,.8,this.mat(park.id+'frontRails',park.school?0x75908a:0x83969d),a,b);
   if(!park.school){
    const ledColor=theme==='taoyuan'?0xd93b63:theme==='harbor'?0x2aa2d6:0xf4c84b;
    const led=this.mat(park.id+'ledRibbon',ledColor,.35);
    led.emissive.setHex(ledColor);led.emissiveIntensity=day?.20:.65;
    addArc(start-.12,start-.12,.82,1.28,led,a,b);
   }
   const aisle=this.mat('concourseSteps',0xb5b7a4);
   for(let i=1;i<5;i++){
    const angle=a+(b-a)*i/5;
    addArc(start+.25,end+.22,.61,rise+.12,aisle,angle-.009,angle+.009);
   }
   for(let i=1;i<=11;i++){
    const r=start+(end-start)*i/12,y=.5+(rise-.5)*i/12+.05;
    addArc(r,r+.38,y,y+.08,rowMaterial,a,b);
   }
   const count=park.school?park.corner===70?20:38:this.hero?120:this.gl.isSoftwareRenderer?64:320,geo=new T.SphereGeometry(.32,6,5);
   const crowd=new T.InstancedMesh(geo,crowdMat,count),transform=new T.Object3D();
   const colors=[0xf7e4c6,0xdbe8f4,0xf29f58,0x58a4dc,0xe26d68,0x85c99f,0xf3d35e,0x355d7d];
   for(let i=0;i<count;i++){
    const t=((i*73)%count)/count,angle=a+.02+(b-a-.04)*t,row=(i%11+1)/12,r=start+(end-start)*row;
    transform.position.set(Math.sin(angle)*r,.9+(rise-.5)*row,Math.cos(angle)*r);
    transform.scale.set(.92,1.38,.88);transform.updateMatrix();
    crowd.setMatrixAt(i,transform.matrix);crowd.setColorAt(i,new T.Color(colors[(i*17+i%7)%colors.length]));
   }
   crowd.name='Nightball crowd';group.add(crowd);
  }
  // Center-field Batter's Eye & 1B/3B Pro Dugouts for non-school parks
  if(!park.school){
   const beR=park.center+2.6,beMat=this.mat('battersEye',0x132924,.92),hedgeMat=this.mat('beHedge',0x1d4432,.9);
   addArc(beR,beR+.9,0,6.6,beMat,-.14,.14);
   addArc(beR-.06,beR-.06,0,6.6,beMat,-.14,.14);
   for(let i=-4;i<=4;i++)if(Math.abs(i)>=3){
    const ang=i*.043;
    this.ellipsoid(group,[1.8,2.6,1.8],[Math.sin(ang)*(beR+.2),2.2,Math.cos(ang)*(beR+.2)],hedgeMat,true);
   }
   const dugRoof=this.mat(park.id+'dugoutRoof',park.wall,.58),dugWell=this.mat('dugoutWell',0x0d1821,.95),dugRail=this.mat('dugoutRail',0x2b6d5e,.5);
   for(const sign of [-1,1]){
    const dug=new T.Group();dug.position.set(sign*21.8,0,10.6);dug.rotation.y=sign*Math.PI/4;group.add(dug);
    this.box(dug,[2.4,2.1,11.6],[sign*.45,1.05,0],dugWell);
    this.box(dug,[2.9,.22,12.2],[sign*.3,2.2,0],dugRoof);
    this.box(dug,[.14,1.05,11.6],[-sign*.72,.52,0],dugRail);
   }
  }
  const [x,y,z,w,h]=park.board;
  this.board.position.set(x,y,z);this.board.scale.set(w/30,h/14,1);
  for(const [i,light] of this.lights.entries())light.visible=!park.school&&!indoors&&(theme==='toyama'||(i!==0&&i!==5));
  if(indoors){
   const height=park.roofHeight,isTokyo=park.id==='tokyo-dome';
   const roof=this.mesh(new T.SphereGeometry(1,48,22,0,Math.PI*2,0,Math.PI/2),
    new T.MeshStandardMaterial({color:isTokyo?0xd9e4ed:0x747f90,roughness:.94,
     emissive:isTokyo?0x526672:0x354355,emissiveIntensity:.56,side:T.BackSide}),group);
   roof.userData.roof=true;roof.scale.set(170,height-20,168);roof.position.set(0,20,55);
   for(let i=-4;i<=4;i++){
    const points=[],z=55+i*22,r=Math.sqrt(1-((z-55)/168)**2);
    for(let j=0;j<=24;j++){const a=j/24*Math.PI;points.push(new T.Vector3(Math.cos(a)*169*r,20+Math.sin(a)*(height-20)*r-.42,z));}
    this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.34,4,false),this.mat('roofRib',0xc3d3df),group);
   }
   for(const offset of [-30,0,30]){
    const track=[];
    for(let i=0;i<=28;i++){
     const z=-101+i/28*313;
     track.push(new T.Vector3(offset,NightPlayers.roofSurface(park,offset,z)-.55,z));
    }
    this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(track),28,.13,4,false),this.mat(park.id+'longRibs',isTokyo?0xc4d5e4:0x9fb5c8),group);
   }
   const domeRib=this.mat(park.id+'domeRibbon',isTokyo?0x286aa8:0x368f9d,.4);domeRib.emissive.setHex(isTokyo?0x1b568c:0x226e7a);domeRib.emissiveIntensity=.55;
   addArc(149,149,12,13.4,domeRib,-1.34,1.34);
   const deck=this.mat('domeUpperDeck',0x30465e),trim=this.mat('domeFascia',0x7d94aa);
   addArc(152,175,20,32,deck,-1.51,1.51);
   addArc(152,152,17.4,20,trim,-1.51,1.51);
   const domeLit=this.mat('domeRibbonLit',0x92c9ec,.4);domeLit.emissive.setHex(0x64b0e2);domeLit.emissiveIntensity=.65;
   addArc(151.9,151.9,18.1,18.4,domeLit,-1.51,1.51);
   for(let i=0;i<8;i++){
    const r=153+i*2.65,y=20.5+i*1.4;
    addArc(r,r+.25,y,y+.12,trim,-1.50,1.50);
   }
   for(let i=-8;i<=8;i++){
    const a=i*.177,frame=new T.Group();group.add(frame);
    frame.position.set(Math.sin(a)*160,27.7,Math.cos(a)*160);frame.rotation.y=a;
    this.box(frame,[4.65,.32,.61],[0,.35,0],concrete);
    for(let j=-2;j<=2;j++)this.box(frame,[.67,.22,.19],[j*.87,.22,-.38],new T.MeshBasicMaterial({color:0xf0f5fc,fog:false}));
   }
  }else if(park.school){
   const yard=park.corner===70,trees=this.mat(park.id+'trees',park.id.includes('river')?0x568149:0x6d8854);
   const trunk=this.mat('schoolTreeTrunk',0x69503c),bench=this.mat(park.id+'benchRoof',park.wall);
   for(let i=0;i<15;i++){
    const x=(i-7)*11,z=park.center+10+Math.sin(i*1.8)*4;
    this.box(group,[.52,3.3,.52],[x,1.65,z],trunk);
    this.ellipsoid(group,[3.5+i%3,3.6+i%3,3.5],[x,4.6,z],trees,true);
   }
   for(const sign of [-1,1]){
    const x=sign*31;
    this.box(group,[11,.18,2.9],[x,2.7,15],bench);
    this.box(group,[10,.15,.55],[x,.58,15.7],bench);
    for(const side of [-1,1])this.box(group,[.11,2.7,.12],[x+side*5.35,1.35,14.1],concrete);
    if(!yard){this.box(group,[.34,17,.34],[sign*49,8.5,park.center-19],concrete);
     this.box(group,[4,1.25,.4],[sign*49,17,park.center-19],this.mat('schoolLamp',0xcbd6d7));}
   }
  }else if(theme==='brick'||theme==='river'){
   for(let i=0;i<16;i++){
    const x=-141+i*18,z=166+i%3*9;
    this.ellipsoid(group,[10,9+i%4*2,8],[x,7,z],this.mat('parkTrees',0x2d5943),true);
   }
  }else if(theme==='sky'||theme==='toyama'){
   for(const sign of [-1,1]){
    const a=sign<0?-1.28:.53,b=sign<0?-.53:1.28;
    addArc(146,166,17,21,this.mat('canopy',0xd3dce3),a,b);
    for(let i=0;i<5;i++){const angle=a+(b-a)*i/4;this.box(group,[.55,21,.55],[Math.sin(angle)*165,10.5,Math.cos(angle)*165],concrete);}
   }
  }else{
   for(const sign of [-1,1]){
    const color=theme==='taoyuan'?0x912744:theme==='harbor'?0x29799b:0xe5b94b;
    const a=sign<0?-1.05:.42,b=sign<0?-.42:1.05;
    addArc(151,151,8,10,this.mat(park.id+'fascia',color),a,b);
   }
  }
 }
 drawBoard(g){
  this.scene.userData.staticRevision=(this.scene.userData.staticRevision||0)+1;
  if(this.proVision||VENUE_VISION_PARKS.has(this.parkKey)){
   drawVenueVision(this,this.parkKey,g);
   return;
  }
  const c=this.boardCanvas.getContext('2d'),w=1024;
  const label=value=>globalThis.NightI18n?.text(value)??value;
  const bg=c.createLinearGradient(0,0,0,448);
  bg.addColorStop(0,this.customBoardStyle==='classic'?'#4d4637':'#071320');bg.addColorStop(1,this.customBoardStyle==='classic'?'#28291f':'#040b14');
  c.fillStyle=bg;c.fillRect(0,0,w,448);
  const hdr=c.createLinearGradient(0,0,w,0);
  hdr.addColorStop(0,this.customBoardStyle==='classic'?'#6b654d':'#132f44');hdr.addColorStop(.5,this.customBoardStyle==='classic'?'#807354':'#1d4460');hdr.addColorStop(1,this.customBoardStyle==='classic'?'#61513c':'#122b3e');
  c.fillStyle=hdr;c.fillRect(0,0,w,70);
  c.fillStyle='#53b8f2';c.fillRect(0,68,w,3);
  c.fillStyle='#f3fbff';c.font='italic 900 46px Arial';c.textAlign='left';c.fillText('NIGHTBALL',42,50);
  c.font='bold 25px Arial';c.textAlign='right';c.fillStyle='#bfe2f7';c.fillText(label(g?.park?.name||'STADIUM').toUpperCase(),984,47,740);
  const home=g?.teams.home,away=g?.teams.away;
  c.textAlign='center';
  if(g?.inMatch){
   const current=Math.max(g.inning,1),first=current>9?current-8:1,innings=Array.from({length:9},(_,i)=>first+i);
   const display=g.displayScore?.()||{home:g.homeScore,away:g.awayScore},cols=[...innings,'R','H','E'];
   const x=i=>192+i*65+(i>=9?18:0);
   c.fillStyle='#0b1d2e';c.fillRect(24,92,976,278);
   c.strokeStyle='#244b6b';c.lineWidth=2;c.strokeRect(24,92,976,278);
   c.font='bold 31px Arial';c.fillStyle='#9ed0f0';
   for(const [i,col] of cols.entries())c.fillText(col,x(i),144);
   for(const [index,team] of [away,home].entries()){
    const side=index===0?'away':'home',y=236+index*98;
    c.fillStyle=index?'#091826':'#102940';c.fillRect(26,y-58,972,78);
    c.fillStyle=team?.color||(index?'#2c8f78':'#d96c45');c.fillRect(26,y-58,12,78);
    const logo=this.clubImages.get(team?.id);
    if(logo?.complete&&logo.naturalWidth&&!team.scoreMark){
     const scale=64/Math.max(logo.naturalWidth,logo.naturalHeight);
     const w=logo.naturalWidth*scale,h=logo.naturalHeight*scale;
     c.fillStyle='#f7f8f7';c.fillRect(67,y-54,70,70);
     c.drawImage(logo,102-w/2,y-19-h/2,w,h);
    }else{
     const mark=team?.scoreMark||team?.short||team?.name||'';
     c.fillStyle='#f7fbff';c.font='900 42px sans-serif';c.fillText(mark.slice(0,3),102,y,112);
    }
    c.font='900 47px Arial';
    for(const [i,inning] of innings.entries()){
     const currentHalf=inning===current&&(g.half==='top'?'away':'home')===side;
     const runs=g[side]?.[inning-1];
     if(currentHalf){
      c.fillStyle='#1b4f7d';c.fillRect(x(i)-27,y-51,54,64);
      c.strokeStyle='#ffd966';c.lineWidth=2;c.strokeRect(x(i)-27,y-51,54,64);
     }
     if(Number.isFinite(runs)||currentHalf){c.fillStyle=currentHalf?'#ffe97d':'#eff7ff';c.fillText((runs??0)+(currentHalf?display[side]-g[side+'Score']:0),x(i),y);}
    }
    c.fillStyle='#ffefc2';c.fillText(display[side],x(9),y);
    c.fillStyle='#eff7ff';
    [g[side+'Hits']||0,g[side+'Errors']||0].forEach((value,i)=>c.fillText(value,x(i+10),y));
   }
  }else{
   const call=g?.derby?'HOME RUN DERBY':g?.mode==='pitching'?'PITCHING PRACTICE':'BATTING PRACTICE';
   c.fillStyle='#ffe89c';c.font='italic 900 70px Arial';c.fillText(label(call),512,252,950);
  }
  c.fillStyle='#3c8bc2';c.fillRect(28,382,968,2);
  const call=g?.phase==='result'?{hr:'HOME RUN!',single:'BASE HIT',double:'DOUBLE!',triple:'TRIPLE!'}[g.hit?.kind]:null;
  if(call){
   const exit=g?.hit?.exitKmh?`  •  ${Math.round(g.hit.exitKmh)} km/h`:'';
   c.fillStyle=g?.hit?.kind==='hr'?'#ffd866':'#9ee8ff';c.font='italic 900 31px Arial';c.fillText(label(call)+exit,512,424);
  }else if(g?.pitch?.speed&&['pitch','miss','result','field'].includes(g.phase)){
   c.fillStyle='#9ec7df';c.font='bold 25px Arial';c.fillText(`${label(g.pitch.name||'PITCH')}  ${Math.round(g.pitch.speed)} km/h`,512,422);
  }
  // Subtle LED matrix scanline texture
  c.fillStyle='rgba(0, 6, 14, 0.17)';
  for(let y=0;y<448;y+=6)c.fillRect(0,y,w,2);
  this.boardTexture.needsUpdate=true;
 }
 makePlayer(role,team,no){
  const root=new T.Group(),body=new T.Group(),head=new T.Group();root.add(body);root.userData.dynamic=true;this.scene.add(root);
  const kit=team==='home'?0xe8efca:0xf1b681,capColor=team==='home'?0x185348:0x773d32;
  const jersey=this.mat(team+'jersey',kit,.82),pants=this.mat('pants',0xf7f2e2,.86),skin=this.mat('skin'+(no%4),skinColors[no%4],.68),dark=this.mat('shoes'+team,team==='home'?0x163b37:0x493531,.42);
  const accentMat=new T.MeshStandardMaterial({color:capColor,roughness:.52,metalness:.06});
  const trimMat=new T.MeshStandardMaterial({color:0xf2cf63,roughness:.26,metalness:.72});
  const torsoMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0});
  this.uniformTorsoGeometry??=torsoGeometry();
  const jerseyPlaceholder=this.mesh(this.uniformTorsoGeometry,torsoMat,body);jerseyPlaceholder.castShadow=true;jerseyPlaceholder.receiveShadow=true;
  const pantsMat=new T.MeshStandardMaterial({color:pants.color,roughness:.92});this.ellipsoid(body,[.232,.128,.206],[0,.415,0],pantsMat);
  const legMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.92});
  const belt=this.mesh(new T.CylinderGeometry(.268,.263,.046,24),accentMat,body);belt.position.y=.46;
  const buckle=this.box(body,[.074,.054,.030],[0,.46,.264],trimMat);buckle.castShadow=false;
  const collar=this.mesh(new T.TorusGeometry(.115,.023,6,16),accentMat,body);collar.rotation.x=Math.PI/2;collar.position.y=1.01;
  head.position.y=1.32;head.scale.set(.58,.64,.60);body.add(head);
  this.ellipsoid(body,[.108,.114,.108],[0,1.083,0],skin);this.ellipsoid(head,[.43,.40,.405],[0,0,0],skin);
  const eyes=[],brows=[];
  const cheekMat=this.mat('cheek'+(no%2),0xd48373,.78);
  for(const side of [-1,1]){
   this.ellipsoid(head,[.076,.12,.075],[side*.415,-.02,.02],skin);
   eyes.push(this.ellipsoid(head,[.047,.10,.027],[side*.145,.015,.38],this.mat('eyes',0x121e26,.18)));
   this.ellipsoid(head,[.015,.026,.01],[side*.135,.048,.407],this.mat('eyeGlints',0xffffff,.08));
   this.ellipsoid(head,[.062,.034,.022],[side*.215,-.072,.362],cheekMat,true);
  }
  this.ellipsoid(head,[.058,.057,.067],[0,-.078,.399],skin);this.chalkFace(head);
  const helmetRole=helmetOrCap(role)==='helmet';
  const capMat=new T.MeshPhysicalMaterial({color:capColor,roughness:helmetRole?.30:.96,metalness:helmetRole?.03:0,clearcoat:helmetRole?.72:0,clearcoatRoughness:.26});
  const visorMat=capMat.clone();visorMat.side=T.DoubleSide;
  this.capGeometry??=capGeometry();this.helmetGeometry??=new T.SphereGeometry(.448,24,15,0,Math.PI*2,0,Math.PI*.56);
  this.capVisorGeometry??=visorGeometry(false);this.helmetVisorGeometry??=visorGeometry(true);
  const crown=this.mesh(helmetRole?this.helmetGeometry:this.capGeometry,capMat,head);crown.name=helmetRole?'batting-helmet':'cloth-cap';if(helmetRole)crown.position.y=.045;crown.castShadow=true;
  const visor=this.mesh(helmetRole?this.helmetVisorGeometry:this.capVisorGeometry,visorMat,head);visor.name='visor';visor.castShadow=true;
  if(!helmetRole){
   const button=this.ellipsoid(head,[.034,.017,.034],[0,.435,0],visorMat,true);button.name='cap-button';
  }
  if(role==='batter'||role==='runner')for(const side of [-1,1]){
   const ear=this.ellipsoid(head,[.070,.143,.103],[side*.412,-.077,.048],capMat,true);ear.name='helmet-ear-cover';
  }
  if(role==='catcher'){
   const cageMat=this.mat('catcherCage',0x2a353d,.32,.72);
   for(const y of [-.14,-.05,.04,.12])this.box(head,[.52,.018,.025],[0,y,.425],cageMat);
   for(const side of [-.18,.18])this.box(head,[.02,.28,.025],[side,-.02,.415],cageMat);
  }
  const logoCanvas=document.createElement('canvas');logoCanvas.width=logoCanvas.height=64;const lc=logoCanvas.getContext('2d');lc.fillStyle='#edf6d6';lc.font='italic 900 43px Arial';lc.textAlign='center';lc.fillText(team==='home'?'N':'F',32,49);const logoTex=new T.CanvasTexture(logoCanvas);logoTex.colorSpace=T.SRGBColorSpace;
  const logo=this.mesh(new T.PlaneGeometry(.17,.17),new T.MeshBasicMaterial({map:logoTex,transparent:true,depthWrite:false}),head);logo.renderOrder=10;logo.position.set(0,.242,helmetRole?.436:.408);logo.scale.x=-1;
  const hands=[this.ellipsoid(body,[.095,.105,.102],[-.40,.68,.08],role==='batter'?pants:skin),this.ellipsoid(body,[.095,.105,.102],[.40,.68,.08],role==='batter'?pants:skin)];
  for(const h of hands){
   const wb=this.mesh(new T.CylinderGeometry(.76,.76,.42,10),accentMat,h);wb.position.set(0,.52,-.12);
   if(role==='batter')this.ellipsoid(h,[.78,.68,.42],[0,.05,.55],accentMat,true);
  }
  const arms=[this.limb(body,[-.23,.88,0],[-.40,.68,.08],.08,jersey),this.limb(body,[.23,.88,0],[.40,.68,.08],.08,jersey)];
  const cuffs=[this.limb(body,[-.30,.79,0],[-.32,.76,0],.084,accentMat),this.limb(body,[.30,.79,0],[.32,.76,0],.084,accentMat)];
  const socksMat=new T.MeshStandardMaterial({color:capColor,roughness:.86});
  const feet=[this.ellipsoid(root,[.125,.086,.227],[-.17,.12,.10],dark),this.ellipsoid(root,[.125,.086,.227],[.17,.12,.10],dark)];
  for(const f of feet){
   this.ellipsoid(f,[.88,.26,.48],[0,.18,-.05],pants,true);
   this.ellipsoid(f,[.94,.22,.92],[0,-.52,0],pants,true);
  }
  const legs=[this.limb(root,[-.15,.38,0],[-.17,.17,.05],.10,legMat),this.limb(root,[.15,.38,0],[.17,.17,.05],.10,legMat)];
  const forearms=[this.limb(body,[-.32,.73,0],[-.40,.68,.08],.063,skin),this.limb(body,[.32,.73,0],[.40,.68,.08],.063,skin)];
  const shins=[this.limb(root,[-.16,.27,0],[-.17,.16,.1],.074,legMat),this.limb(root,[.16,.27,0],[.17,.16,.1],.074,legMat)];
  const socks=[this.limb(root,[-.165,.22,0],[-.17,.15,.1],.079,socksMat),this.limb(root,[.165,.22,0],[.17,.15,.1],.079,socksMat)];
  const elbowGuard=role==='batter'?this.ellipsoid(body,[.076,.092,.076],[-.32,.76,.05],capMat,true):null;
  for(const sign of [-1,1]){
   brows.push(this.ellipsoid(head,[.048,.021,.057],[sign*.145,.104,.374],this.mat('brow',0x463229)));
  }
  const mittScale=role==='catcher'?1.4:1.18;
  const glove=new T.Group();hands[0].add(glove);this.ellipsoid(glove,[mittScale,1.35,.79],[0,0,.1],this.mat('glove',0x965d38,.74),true);
  this.ellipsoid(glove,[.81,1,.28],[0,0,.74],this.mat('glovePocket',0x633723,.92),true);
  // Pro two-tone wood bat (espresso handle + gold trademark ring + glossy natural maple barrel)
  const bat=new T.Group();
  const batMaple=this.mat('batMaple',0xf1d59d,.26,.04),batDark=this.mat('batEspresso',0x281812,.38,.06);
  const barrel=this.mesh(new T.CylinderGeometry(.076,.048,.58,16),batMaple,bat);barrel.position.y=.71;barrel.castShadow=true;
  const barrelTip=this.ellipsoid(bat,[.075,.022,.075],[0,1.00,0],batMaple,true);barrelTip.castShadow=false;
  const ring=this.mesh(new T.CylinderGeometry(.053,.051,.038,16),trimMat,bat);ring.position.y=.41;
  const taper=this.mesh(new T.CylinderGeometry(.047,.036,.36,12),batDark,bat);taper.position.y=.21;taper.castShadow=true;
  const grip=this.mesh(new T.CylinderGeometry(.039,.038,.28,10),this.mat('gripTape',0x1d262b,.84),bat);grip.position.y=-.08;
  this.ellipsoid(bat,[.064,.026,.064],[0,-.23,0],batDark);
  body.add(bat);bat.visible=role==='batter';glove.visible=role!=='batter'&&role!=='runner';
  let gearMat=null;
  if(role==='catcher'){
   gearMat=new T.MeshStandardMaterial({color:0x233d4b,roughness:.78});
   const chest=this.ellipsoid(body,[.28,.29,.12],[0,.75,.23],gearMat);chest.castShadow=true;
   for(const s of [-1,1])this.ellipsoid(root,[.095,.11,.085],[s*.162,.26,.09],gearMat,true);
   root.scale.setScalar(.85);
  }
  root.scale.multiplyScalar(2);
  const shadow=this.contactShadowTex
   ?this.mesh(new T.PlaneGeometry(2.35,2.35),new T.MeshBasicMaterial({map:this.contactShadowTex,transparent:true,opacity:.66,depthWrite:false}))
   :this.mesh(new T.CircleGeometry(.92,24),new T.MeshBasicMaterial({color:0x021a14,transparent:true,opacity:.24,depthWrite:false}));
  shadow.userData.dynamic=true;shadow.rotation.x=-Math.PI/2;shadow.position.y=.04;
  return {root,body,head,hands,arms,cuffs,forearms,feet,legs,shins,socks,elbowGuard,eyes,brows,bat,glove,shadow,role,team,no,lastX:0,lastZ:0,jerseyPlaceholder,torsoMat,pantsMat,legMat,socksMat,gearMat,capMat,visorMat,accentMat,trimMat,logoCanvas,logoTex};

 }
 stylePlayer(p,team,no,club=NightTeams.get(team==='home'?'owls':'foxes'),wire=null){
  const uniforms=globalThis.NightUniforms,rev=uniforms?.revision()||0;
  if(p.styleClub===club&&p.styleSide===team&&p.styleNo===no&&p.styleRev===rev&&p.styleWire===wire)return;
  p.styleClub=club;p.styleSide=team;p.styleNo=no;p.styleRev=rev;p.styleWire=wire;p.styleKey=club.id+'/'+team+'/'+no+'/'+rev;
  const k=uniforms?.resolvedKit(club,team,wire)||{shirt:team==='home'?'#f5f5f3':club.color,pants:'#f5f5f3',cap:club.color,helmet:club.color,visor:club.color,trim:club.accent||club.color,letters:club.color,outline:'#ffffff',number:club.color,stripe:club.color,socks:club.color,wordmark:club.short||club.mark||'TEAM',capMark:club.mark||'T',pattern:'plain',frontNumber:true,font:'block'};
  this.uniformTextures??=new Map();
  const textureKey=JSON.stringify([k,String(no)]);
  if(p.uniformTextureKey!==textureKey){
   const cache=this.uniformTextures,old=cache.get(p.uniformTextureKey);
   if(old)old.refs--;
   let entry=cache.get(textureKey);if(!entry){entry={texture:uniformTexture(k,no),refs:0};cache.set(textureKey,entry);}
   entry.refs++;p.uniformTextureKey=textureKey;p.torsoMat.map=entry.texture;p.torsoMat.userData.uniformBase=k.shirt;p.torsoMat.needsUpdate=true;
   if(cache.size>32)for(const [key,item] of cache){if(cache.size<=32)break;if(item.refs<=0){item.texture.dispose();cache.delete(key);}}
  }
  const sleeve=k.pattern==='contrast'?k.trim:k.shirt;
  const oldJ=p.jerseyMat||this.mat(p.team+'jersey'),newJ=this.mat('kit-sleeve-'+sleeve,sleeve,.92);
  p.root.traverse(m=>{if(m.material===oldJ)m.material=newJ;});
  p.jerseyMat=newJ;p.capMat.color.set(helmetOrCap(p.role)==='helmet'?k.helmet:k.cap);p.visorMat.color.set(k.visor);
  p.accentMat.color.set(k.trim);p.trimMat.color.set(k.outline);p.gearMat?.color.set(k.cap);
  p.pantsMat.color.set(k.pants);p.socksMat.color.set(k.socks);
  const shoe=this.mat('kit-cleats-'+k.cap,k.cap,.5);for(const f of p.feet)f.material=shoe;
  const pantsKey=k.pants+'/'+k.stripe+'/'+k.pattern;
  if(p.pantsKey!==pantsKey){p.pantsKey=pantsKey;p.legMat.map?.dispose();p.legMat.map=this.gl.isSoftwareRenderer?null:pantsTexture(k);p.legMat.color.set(this.gl.isSoftwareRenderer?k.pants:0xffffff);p.legMat.needsUpdate=true;}
  p.team=team;
  const c=p.logoCanvas.getContext('2d');c.clearRect(0,0,64,64);
  // Actual cap lettering rather than the full club badge. Plane already mirrored.
  c.font='900 40px Arial';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3;
  const mark=k.capMark,letter=contrast(helmetOrCap(p.role)==='helmet'?k.helmet:k.cap);c.strokeStyle=letter==='#ffffff'?'#1d2633':'#ffffff';c.strokeText(mark,32,34,58);c.fillStyle=letter;c.fillText(mark,32,34,58);p.logoTex.needsUpdate=true;
 }

 chalkFace(head){const pts=[new T.Vector3(-.045,-.17,.36),new T.Vector3(0,-.18,.37),new T.Vector3(.045,-.17,.36)];this.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),8,.009,4,false),this.mat('mouth',0x9f6c52),head);}
 poseArm(player,index,shoulder,hand){
  const bend=player.role==='batter'?.075:.094,side=index?1:-1;
  const elbow=[(shoulder[0]+hand[0])*.5+side*bend,(shoulder[1]+hand[1])*.5-.035,(shoulder[2]+hand[2])*.5-.06];
  this.moveLimb(player.arms[index],shoulder,elbow,.085);
  const cuffStart=[elbow[0]+(shoulder[0]-elbow[0])*.22,elbow[1]+(shoulder[1]-elbow[1])*.22,elbow[2]+(shoulder[2]-elbow[2])*.22];
  this.moveLimb(player.cuffs[index],cuffStart,elbow,.089);
  this.moveLimb(player.forearms[index],elbow,hand,.063);
  return elbow;
 }
 poseLeg(player,index,hip,foot){
  const knee=[(hip[0]+foot[0])*.5,(hip[1]+foot[1])*.5,(hip[2]+foot[2])*.5+.065];
  this.moveLimb(player.legs[index],hip,knee,.104);
  this.moveLimb(player.shins[index],knee,foot,.079);
  const sockTop=[knee[0]+(foot[0]-knee[0])*.42,knee[1]+(foot[1]-knee[1])*.42,knee[2]+(foot[2]-knee[2])*.42];
  this.moveLimb(player.socks[index],sockTop,foot,.083);
 }
 animatePlayer(p,x,z,angle,time,running=false,pose=0,pace=1){
  const m=p.motionStyle||window.NightGame.movementStyle({no:p.no}),cycle=time*.012*(.74+.26*pace)*m.cadence+m.phase,sprint=running?Math.sin(cycle)*pace:0;
  p.root.position.set(x,running?Math.abs(Math.sin(cycle))*.065*pace:0,z);p.root.rotation.y=angle;p.root.visible=true;p.shadow.visible=true;p.shadow.position.set(x,.04,z);
  const idle=!running&&time>0?Math.sin(time*.0034+p.no*1.1):0;
  p.body.rotation.set(running?m.lean*pace:0,running?sprint*.12*m.arm:0,running?sprint*.09:0);
  p.body.position.y=running?-.045-Math.abs(sprint)*.025:(p.role!=='pitcher'&&p.role!=='batter'&&time>0?-.010+idle*.010:0);
  p.head.rotation.y=0;
  if(p.eyes){
   const blinkPhase=time>0?(time*.001+p.no*1.37)%3.8:1;
   const blink=blinkPhase<.11?Math.max(.12,Math.abs(blinkPhase-.055)/.055):1;
   for(const eye of p.eyes)eye.scale.y=.10*blink;
  }
  for(let i=0;i<2;i++){
   const side=i?1:-1,foot=p.feet[i],hand=p.hands[i],kick=running?Math.max(0,Math.cos(cycle)*side)*pace:0;
   foot.position.set(side*.17,.12+kick*.15,.10+side*sprint*.30*m.stride);
   foot.rotation.x=running?-side*sprint*.30:0;
   this.poseLeg(p,i,[side*.15,.46,0],[foot.position.x,foot.position.y+.035,foot.position.z]);
   hand.position.set(side*(running?.27:.4),.67+(running?.15-side*sprint*.12*m.arm:0),.10-side*sprint*.26*m.arm);
   this.poseArm(p,i,[side*.245,.94,0],hand.position.toArray());
  }
  if(p.role==='fielder'&&!running){
   p.body.rotation.x=.14;p.body.position.y=-m.ready;
   for(let i=0;i<2;i++){const side=i?1:-1;p.feet[i].position.x=side*.23;this.poseLeg(p,i,[side*.15,.46,0],[side*.23,.155,.10]);p.hands[i].position.set(side*.27,.57,.31);this.poseArm(p,i,[side*.245,.94,0],p.hands[i].position.toArray());}
  }
  if(p.role==='pitcher'){
   const side=p.throwHand==='L'?-1:1,arm=side===1?1:0,glove=1-arm,lead=glove;
   if(p.glove.parent!==p.hands[glove])p.hands[glove].add(p.glove);
   const form=window.NightGame?.PITCH_FORMS?.[p.pitchForm]||window.NightGame?.PITCH_FORMS?.overhand||{x:.76,h:2.10,lift:.48,cockX:.38,cockY:1.35,lean:.03};
   const wind=clamp(pose,0,1),lift=Math.sin(wind*Math.PI),reach=clamp((wind-.58)/.42,0,1),follow=p.releaseProgress==null?0:clamp(p.releaseProgress/.26,0,1),release=p.releaseProgress!=null;
   const mix=(a,b,t)=>a+(b-a)*t,quick=p.fromSet?.42:1;
   const step=release?.30:reach*.30;
   if(wind===0&&!release&&time>0)p.body.position.y=idle*.011;
   p.feet[lead].position.y=.12+lift*form.lift*quick;p.feet[lead].position.z=-lift*.18*quick+step;this.poseLeg(p,lead,[side*-.15,.46,0],p.feet[lead].position.toArray());
   // At release (root scale 2), the hand matches the flight's initial
   // x/height/z; the remaining motion is a continuous follow-through.
   const handX=release?mix(form.x/2,-.12,follow):mix(mix(p.fromSet?.22:.36,form.cockX,lift),form.x/2,reach);
   const handY=release?mix(form.h/2,.60,follow):mix(mix(p.fromSet?.87:.70,form.cockY,lift),form.h/2,reach);
   const handZ=release?mix(.30,.46,follow):mix(.08-lift*.35,.30,reach);
   const throwing=[side*handX,handY,handZ];
   p.hands[arm].position.set(...throwing);this.poseArm(p,arm,[side*.245,.94,0],throwing);
   p.hands[glove].position.set(-side*.22,.88+lift*.08,.30);this.poseArm(p,glove,[-side*.245,.94,0],p.hands[glove].position.toArray());
   p.body.rotation.y=side*(release?-.25*follow:lift*.30);
   p.body.rotation.z=side*(release?-form.lean*follow:form.lean*lift);
   p.body.rotation.x=release?.20*follow:0;
  }
  if(p.role==='batter'){
   const side=p.batHand==='L'?-1:1,front=side===1?0:1;
   const sw=!!p.swingActive||pose>0,swing=clamp(pose*2,0,1);
   const m=window.NightGame.battingMotion(p.batForm,p.pitchProgress??0,swing,sw);
   const wag=!sw&&m.load===0&&time>0?Math.sin(time*.0056):0,wagC=!sw&&m.load===0&&time>0?Math.cos(time*.0056):0;
   p.body.position.y=-m.crouch+(sw?-.025*m.step:-.011+Math.abs(wag)*.011);
   p.body.rotation.y=side*(m.stance*(1-swing)+(sw?-m.turn*swing:m.load*.17));
   p.body.rotation.x=m.crouch*.9;
   for(let i=0;i<2;i++){
    const foot=p.feet[i],sign=i?1:-1,isFront=i===front;
    foot.position.x=sign*.17*m.width-(isFront?side*m.step*.10:0);
    foot.position.z=.10+(isFront?m.stance*.34+m.step*m.stride-m.load*.08:-m.stance*.12);
    foot.position.y=.12+(isFront?m.lift:0);
    this.poseLeg(p,i,[sign*.15,.46,0],[foot.position.x,foot.position.y+.035,foot.position.z]);
   }
   // All styles share the same swing clock. Only the visible stance, load,
   // stride and finish vary; the ball contact judgment stays in game.js.
   const startTilt=m.batTilt+wagC*.075;
   p.bat.position.set(side*(sw?.34-.14*swing:.34),m.batHeight+wag*.012-(sw?.10*swing:0),.27+(sw?.10*swing:0));
   p.bat.rotation.set(.12+wag*.085,sw?-side*swing*3.5:0,side*(sw?startTilt+(-m.finish-startTilt)*swing:startTilt));
   if(p.bunting){
    p.bat.position.set(-side*.05,.82,.42);p.bat.rotation.set(0,0,side*Math.PI/2);
   }
   // Attach both hands to the grip rather than leaving them in a fixed pose.
   const grip=new T.Vector3(0,1,0).applyEuler(p.bat.rotation);
   for(let i=0;i<2;i++){
    const offset=(i===front?.015:-.135);
    p.hands[i].position.copy(p.bat.position).addScaledVector(grip,offset);
   }
   const elbows=[0,1].map(i=>this.poseArm(p,i,[i?.245:-.245,.94,0],p.hands[i].position.toArray()));
   if(p.elbowGuard){
    const leadElbow=elbows[front];
    p.elbowGuard.position.set(leadElbow[0],leadElbow[1],leadElbow[2]+.03);
   }
  }
 }
 poseRunner(player,runner,elapsed,ball,homeRun=false){
  const m=player.motionStyle||window.NightGame.movementStyle({no:player.no});
  const slideAge=runner.slide?elapsed-runner.slide.time:-1;
  if(slideAge>=0&&slideAge<.48){
   const slide=window.NightGame.actionEnvelope(slideAge,.48),head=m.slide==='head';
   player.body.rotation.x=(head?1.23:-1.02)*slide;
   player.body.position.y=-.37*slide;
   for(let i=0;i<2;i++){
    const sign=i?1:-1;player.feet[i].position.z=(head?-.44:(i?.39:.62))*slide;
    this.poseLeg(player,i,[sign*.15,.46,0],player.feet[i].position.toArray());
    player.hands[i].position.set(sign*.27,.70+slide*(head?.27:.18),.15+(head?.55:-.20)*slide);
    this.poseArm(player,i,[sign*.245,.94,0],player.hands[i].position.toArray());
   }
  }else if(homeRun&&runner.batter&&runner.progress>=1&&runner.progress<3.999){
   const wave=window.NightGame.actionEnvelope(runner.progress%1,1);
   const kind=m.celebration;
   if(kind==='quiet')return;
   const indices=kind==='clap'?[0,1]:[1];
   for(const i of indices){
    const side=i?1:-1;
    const hand=kind==='clap'?[side*(.12+.09*Math.abs(Math.sin(elapsed*9))),1.01,.35]:[side*.31,.85+wave*(kind==='point'?.57:.36),.20+wave*.15];
    player.hands[i].position.set(...hand);this.poseArm(player,i,[side*.245,.94,0],hand);
   }
  }else if(runner.readingFly||runner.needsTag){
   const facing=Math.atan2(ball.x-runner.x,ball.y-runner.y)-player.root.rotation.y;
   player.head.rotation.y=clamp(Math.atan2(Math.sin(facing),Math.cos(facing)),-.75,.75);
   if(!runner.running){
    player.body.rotation.x=.10;player.body.position.y=-.07;
   }
  }
 }
 poseFielder(player,index,f,elapsed){
  const th=f.throw,m=f.manual,b=f.ball;
  const receiving=th?.receiver===index;
  const holding=th?.fromIndex===index||m?.secured&&m.holder===index;
  const chasing=!th&&!m?.secured&&f.chaser===index;
  const distance=Math.hypot(player.root.position.x-b.x,player.root.position.z-b.y);
  const action=f.fielders[index].action,age=action?elapsed-action.time:-1,glove=player.hands[0];
  const motion=player.motionStyle||window.NightGame.movementStyle({no:player.no});
  if(action&&age>=0&&age<.43&&['jump','dive','bobble'].includes(action.type)){
   const extension=window.NightGame.actionEnvelope(age,.43);
   if(action.type==='jump'){
    player.root.position.y+=.68*extension;
    glove.position.set(-.26,1+.62*extension,.33);
   }else{
    player.body.rotation.x=(action.type==='dive'?1.25:.62)*extension;
    player.body.position.y=-.40*extension;
    glove.position.set(-.28,.46,.40+.45*extension);
    const support=player.hands[1];support.position.set(.34,.53,.28+.35*extension);this.poseArm(player,1,[.245,.94,0],support.toArray());
   }
   this.poseArm(player,0,[-.245,.94,0],glove.position.toArray());
   return;
  }
  if(!receiving&&!holding&&(!chasing||distance>3)&&(!action||age>.22))return;
  const release=holding&&th?clamp(th.t/Math.max(.07,th.release||.28),0,1):0;
  const ready=receiving?clamp(1-(th.duration-th.t)*2.5,0,1):0;
  if(holding&&th&&release<1){
   const hand=player.hands[1],plant=player.feet[0],weight=Math.sin(release*Math.PI);
   hand.position.set(.27+.10*weight*motion.arm,.81+weight*.41,.05+release*.48);
   player.body.rotation.y=release*.72-.38;
   plant.position.z+=weight*.24;player.body.position.y-=weight*.07;
   this.poseLeg(player,0,[-.15,.46,0],plant.position.toArray());
   this.poseArm(player,1,[.245,.94,0],hand.position.toArray());
  }
  if((chasing&&b.z<1.05)||(action?.type==='pickup'&&age>=0&&age<.30)){
   const reach=Math.max(clamp(1-distance/3,0,1),action?.type==='pickup'?window.NightGame.actionEnvelope(age,.30):0);
   player.body.rotation.x=.22+reach*.37;
   player.body.position.y=-.23*reach;
   glove.position.set(-.32,.55-.34*reach,.31+.15*reach);
  }else if(ready||holding||action?.type==='catch'){
   const catchBeat=action?.type==='catch'?window.NightGame.actionEnvelope(age,.30):0;
   glove.position.set(-.27,.79+ready*.26+catchBeat*.22,.34+catchBeat*.10);
  }
  this.poseArm(player,0,[-.245,.94,0],glove.position.toArray());
 }
 followPlay(g,time){
  const f=g.field,trot=g.phase==='result'&&f.outcome==='hr'&&!g.derby;
  const moment=g.replayView?g.replayCloseMoment:null;
  const close=moment&&NightGame.BASES[moment.base]&&(g.replayChallenge||Math.abs(f.elapsed-moment.time)<1.1);
  if(close){
   const base=NightGame.BASES[moment.base],r=f.runners.find(p=>p.id===moment.runnerId);
   const sign=moment.base===3?1:-1,portrait=this.camera.aspect<.95;
   const rx=r?clamp(r.x-base.x,-3,3):0,ry=r?clamp(r.y-base.y,-3,3):0;
   const target=this.fieldFocus.set(base.x+rx*.25,.8,-base.y-ry*.25);
   const camera=this.fieldPosition.set(base.x+sign*(portrait?7:6),portrait?6.8:5.8,-base.y+7.6);
   const fresh=this.cameraPlay!==f||!this.closeReplay;
   const dt=clamp((time-this.lastTime)/1000,0,.07);
   this.cameraPlay=f;this.closeReplay=true;
   // Cut to the base for the review; subsequent frames ease with the runner.
   this.camera.position.lerp(camera,fresh?1:1-Math.exp(-dt*12));
   this.cameraFocus.lerp(target,fresh?1:1-Math.exp(-dt*12));
   this.camera.fov=portrait?48:42;this.camera.lookAt(this.cameraFocus);
   this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
   return;
  }
  if(this.closeReplay){this.closeReplay=false;this.cameraPlay=null;}
  const th=trot?null:f.throw,manual=f.manual;
  const selected=manual?.selection;
  const runner=f.runners.find(r=>r.id===selected&&!r.out&&!r.scored)
   ||f.runners.find(r=>r.batter&&!r.out&&!r.scored&&r.progress<3.999);
  const b=trot?{x:runner?.x??0,y:runner?.y??0,z:0,bounces:1}:f.ball;
  const returning=!!th||!!manual?.secured||b.bounces>0||f.wallHit;
  // Keep the ball as the primary subject, especially on long outfield plays.
  const outfield=!trot&&(Math.hypot(b.x,b.y)>40||f.maxTravel>44||b.z>8||f.wallHit||f.overFence);
  let x=b.x,z=b.y,span=0;
  const bias=(px,pz,weight,limit)=>{
   const dx=px-x,dz=pz-z,d=Math.hypot(dx,dz);
   const amount=Math.min(weight,limit/Math.max(.001,d));
   x+=dx*amount;z+=dz*amount;return d;
  };
  if(th)span=bias(th.to.x,th.to.y,outfield?.16:.42,outfield?5:18);
  if(runner){
   const weight=outfield?.07:selected===runner.id?.43:returning?.30:.20;
   const d=bias(runner.x,runner.y,weight,outfield?3:18);
   span=Math.max(span,outfield?Math.min(22,d):d*(returning?1.26:1.05));
  }
  if(outfield)span=Math.min(35,span);
  const portrait=this.camera.aspect<.95,park=g.park;
  const infield=trot||f.trajectory==='ground'&&f.maxTravel<44&&!f.wallHit&&(!th||th.base===1);
  const replay=g.replayView,broadcast=park.id==='tokyo-dome';
  const height=clamp((infield?18:29)+span*(portrait?.57:.37)+b.z*(outfield?.62:.20),infield?16:28,68);
  const centerZ=outfield?z+clamp((b.vy||0)*.07,-2,3):clamp(z+Math.min(5,Math.max(0,b.vy||0)*.12),2,g.derby?140:park.center+3);
  const highFly=!returning&&b.z>5&&(f.trajectory==='fly'||f.trajectory==='blooper');
  const aerial=broadcast?!returning&&!infield&&b.z>5:highFly;
  let baseSide=0;
  if(infield)baseSide=8;
  else if(broadcast)baseSide=aerial?clamp(b.x*.24,-16,16):clamp(-b.x*.36,-21,21);
  else if(highFly)baseSide=clamp(b.x*.16,-12,12);
  else if(th)baseSide=clamp((b.x-th.to.x)*.10,-9,9);
  const side=replay?(replay==='infield'?20:broadcast?-26:-22):baseSide;
  const target=this.fieldFocus.set(x,Math.max(0,b.z*(outfield?.90:.43)),-centerZ);
  const camera=this.fieldPosition.set(x*.91+side,height,-centerZ+height*(infield?.84:aerial?.76:.63));
  const roofLimit=(position)=>domeCameraLimit(this, position, NightPlayers.roofSurface(park,position.x,-position.z)-3.5);
  const squeeze=Math.max(0,camera.y-roofLimit(camera));
  if(squeeze){
   camera.z+=Math.min(10,squeeze*.65);
   camera.y=Math.min(camera.y,roofLimit(camera));
  }
  if(this.cameraPlay!==f){
   this.cameraPlay=f;
   if(park.id==='sky')this.camera.position.set(0,25,17);
   else this.camera.position.set(0,36,24);
   this.cameraFocus.set(0,0,-12);
   this.camera.fov=portrait?58:47;
  }
  const dt=clamp((time-this.lastTime)/1000,0,.07);
  this.camera.position.lerp(camera,1-Math.exp(-dt*(outfield?10:6)));
  this.camera.position.y=Math.min(this.camera.position.y,roofLimit(this.camera.position));
  this.cameraFocus.lerp(target,1-Math.exp(-dt*(outfield?17:10)));
  const fov=(portrait?56:47)+Math.min(10,squeeze*.46);
  this.camera.fov+=(fov-this.camera.fov)*(1-Math.exp(-dt*4));
  this.camera.lookAt(this.cameraFocus);
  this.camera.updateProjectionMatrix();
  this.camera.updateMatrixWorld(true);
  // Check the real ball after interpolation and roof constraints. The scene
  // is mirrored on Z. Correct only when the ball risks leaving the frame.
  if(!trot){
   const world=(this.fieldBallWorld??=new T.Vector3()).set(b.x,b.z+.08,-b.y);
   const ndc=(this.fieldBallNdc??=new T.Vector3()).copy(world).project(this.camera);
   if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y)||Math.abs(ndc.x)>.78||Math.abs(ndc.y)>.72||ndc.z<-1||ndc.z>1){
    if(world.distanceTo(this.camera.position)<8||ndc.z>1){
     this.camera.position.copy(camera);
     this.camera.position.y=Math.min(this.camera.position.y,roofLimit(this.camera.position));
    }
    this.cameraFocus.copy(world);
    this.camera.lookAt(this.cameraFocus);
    this.camera.updateMatrixWorld(true);
   }
  }
  if(this.keyLight){
   const fx=clamp(this.cameraFocus.x,-45,45),fz=clamp(-this.cameraFocus.z,0,105);
   this.keyLight.target.position.set(fx,0,fz);
   this.keyLight.position.set(fx-27,55,fz-20);
   this.keyLight.target.updateMatrixWorld();
  }
 }
 adaptResolution(frameMs){
  if(this.gl.isSoftwareRenderer||!this.width||frameMs<=0||frameMs>240)return;
  this.frameAvg=(this.frameAvg??frameMs)*.94+frameMs*.06;
  this.adjustedAt=(this.adjustedAt||0)+frameMs;
  if(this.frameAvg<25||this.adjustedAt<1400||this.graphicsRatio<=.86)return;
  this.adjustedAt=0;
  this.graphicsRatio=Math.max(.85,this.graphicsRatio-.18);
  this.gl.setPixelRatio(this.graphicsRatio);
  this.gl.setSize(this.width,this.height,false);
 }
 resetCamera(){
  if(this.hero){this.camera.position.set(18,22,35);this.camera.lookAt(0,1,-36);}
  else{this.camera.position.set(.18,3.6,8.8);this.camera.lookAt(0,1.05,-18.4);}
  this.camera.updateMatrixWorld();
  if(this.keyLight){
   this.keyLight.position.set(-27,55,-20);
   this.keyLight.target.position.set(0,0,0);
   this.keyLight.target.updateMatrixWorld();
  }
 }
 broadcastCamera(g){
  this.overviewCamera(g.park);
  const t=g.phaseTime;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const overview=this.camera.position.clone(),focus=new T.Vector3(0,1.1,-(g.park.pro?proOverview(g.park):OVERVIEW_FRAMES[g.park.id]||DEFAULT_OVERVIEW).target),fov=this.camera.fov;
  if(t<4000){const p=smooth(t/4000);this.camera.position.x+=-5+10*p;this.camera.position.y*=1-.08*p;this.camera.lookAt(focus);}
  else if(t<7000){const p=smooth(((t-4000)%1500)/1500),side=t<5500?-1:1;this.camera.position.set(side*(4.8-.9*p),2.45,12.0+.5*p);this.camera.lookAt(0,1.25,18.4);this.camera.fov=this.camera.aspect<.85?46:38;}
  else if(t<9000){this.camera.position.x=4*(1-smooth((t-7000)/2000));this.camera.lookAt(focus);}
  else{const p=smooth((t-9000)/1500);this.camera.position.copy(overview.lerp(new T.Vector3(.18,3.6,8.8),p));this.camera.lookAt(focus.lerp(new T.Vector3(0,1.05,-18.4),p));this.camera.fov=fov+((g.park.id==='dome'?54:49)-fov)*p;}
  this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
 }
 overviewCamera(park){
  const frame=park.pro?proOverview(park):OVERVIEW_FRAMES[park.id]||DEFAULT_OVERVIEW;
  this.camera.position.set(.1,frame.height,frame.behind);
  this.camera.lookAt(0,1.1,-frame.target);
  const aspect=this.camera.aspect;
  const vertical=aspect<.85?frame.portrait:frame.landscape;
  const fit=frame.minHorizontal?T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(frame.minHorizontal/2))/aspect)):0;
  this.camera.fov=Math.min(115,Math.max(vertical,fit));
  this.camera.updateProjectionMatrix();
  this.camera.updateMatrixWorld();
 }
 resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;if(this.width===r.width&&this.height===r.height)return;this.width=r.width;this.height=r.height;this.heroRendered=false;this.gl.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();if(this.hud){const d=Math.min(devicePixelRatio||1,2);this.hud.width=r.width*d;this.hud.height=r.height*d;this.hud.style.width=r.width+'px';this.hud.style.height=r.height+'px';}}
 screenToAim(x,y){this.camera.updateMatrixWorld();this.raycaster.setFromCamera(new T.Vector2(x/this.width*2-1,1-y/this.height*2),this.camera);const point=new T.Vector3();if(!this.raycaster.ray.intersectPlane(this.aimPlane,point))return{x:0,y:0};return{x:point.x/.68,y:(1.25-point.y)/.62};}
 project(x,y,z){const p=new T.Vector3(x,y,-z).project(this.camera);return{x:(p.x*.5+.5)*this.width,y:(-.5*p.y+.5)*this.height};}
 fieldBallRadius(ball,throwing){
  const depth=-new T.Vector3(ball.x,ball.z+.08,-ball.y).applyMatrix4(this.camera.matrixWorldInverse).z;
  if(depth<this.camera.near)return 0;
  const focalPixels=this.height*this.camera.projectionMatrix.elements[5]/2;
  // Keep a readable marker over the mesh while letting depth and altitude change its size.
  const prominence=NightGame.ballVisualScale(ball.z,0)/NightGame.ballVisualScale(0,0);
  return .85+(throwing?4.5:5.8)*focalPixels/(focalPixels+depth*12)*prominence;
 }
 aimPoint(x,y){return this.project(x*.68,1.25-y*.62,.6);}
 drawPitchGuide(g){
  const guide=g.pitchGuidePoint();
  const point=this.aimPoint(guide.x,guide.y);
  const edge=this.aimPoint(guide.x+BALL_RADIUS*1.25/.68,guide.y);
  const radius=clamp(Math.abs(edge.x-point.x),4.5,9);
  const c=this.ctx;
  c.save();
  c.translate(point.x,point.y);
  const u=g.pitch.progress;
  c.globalAlpha=.66*Math.max(0,Math.min(1,u/.075,(1-u)/.08));
  c.beginPath();c.arc(0,0,radius,0,Math.PI*2);
  c.fillStyle='#fff6ea';c.fill();
  c.lineWidth=1;c.strokeStyle='#563737';c.stroke();
  c.rotate(-.38);
  c.beginPath();
  for(const side of [-1,1]){
   c.moveTo(side*radius*.37,-radius*.82);
   c.quadraticCurveTo(side*radius*.84,0,side*radius*.37,radius*.82);
  }
  c.lineWidth=Math.max(1,radius*.17);c.strokeStyle='#b73e3a';c.stroke();
  c.restore();
 }
 drawHUD(g){
  const c=this.ctx,d=this.hud.width/this.width;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,this.width,this.height);if(!g||this.overviewMode)return;if(this.fieldMode){
   const field=g.field,b=field.ball,th=field.throw;
   const visible=(p,padding)=>p.x>=padding&&p.x<=this.width-padding&&p.y>=padding&&p.y<=this.height-padding;
   const diamond=(p,color,size)=>{
    if(!visible(p,size))return;
    c.beginPath();c.moveTo(p.x-size,p.y);c.lineTo(p.x,p.y-size*.49);c.lineTo(p.x+size,p.y);c.lineTo(p.x,p.y+size*.49);c.closePath();
    c.strokeStyle='#14252ddf';c.lineWidth=3;c.stroke();c.strokeStyle=color;c.lineWidth=1.3;c.stroke();
   };
   if(!g.replayView&&!field.foul&&!g.derby)for(const r of field.runners){
    if(!r.out&&!r.scored&&r.progress<3.999)diamond(this.project(r.x,.19,r.y),r.running?'#ffc676':'#ffebae',r.batter?8:6);
   }
   if(!g.replayView&&th?.receiver!=null)diamond(this.project(th.to.x,.15,th.to.y),'#9ae9ee',9);
   const impact=field.impact,age=impact?field.elapsed-impact.time:1;
   if(impact&&age<.42&&!field.resolved){
    const p=this.project(impact.x,impact.type==='wall'?2:.13,impact.y);
    if(visible(p,2)){
     c.save();c.globalAlpha=(1-age/.42)*.61;c.fillStyle=impact.type==='wall'?'#f6db9f':'#d9a270';
     for(let i=0;i<7;i++){
      const a=i*2.4,r=5+age*(30+(i%3)*13),size=Math.max(1,3-age*4);
      c.beginPath();c.arc(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.54-age*9,size,0,Math.PI*2);c.fill();
     }
     c.restore();
    }
   }
   if(field.manual?.secured&&!th||field.resolved)return;
   const size=this.fieldBallRadius(b,!!th);
   if(!size)return;
   const point=this.project(b.x,b.z+.08,b.y);
   if(!visible(point,0)){
    const x=clamp(point.x,12,this.width-12),y=clamp(point.y,13,this.height-17);
    if(!Number.isFinite(x+y))return;
    const angle=Math.atan2(point.y-y,point.x-x);
    c.save();c.translate(x,y);c.rotate(angle);
    c.beginPath();c.moveTo(7,0);c.lineTo(-5,-5);c.lineTo(-5,5);c.closePath();
    c.fillStyle='#fbe7ad';c.strokeStyle='#17272e';c.lineWidth=1.7;c.fill();c.stroke();c.restore();
    return;
   }
   c.beginPath();c.arc(point.x,point.y,size,0,Math.PI*2);
   c.strokeStyle='#111a25e6';c.lineWidth=Math.min(2.4,size*.6);c.stroke();c.fillStyle='#fff5dc';c.fill();
   return;
  }

  // Umpire mode: the strike-zone frame must not give the pitch away, so the
  // whole aiming overlay is suppressed while a pitch is live; the zone is
  // drawn only for the post-call reveal window (umpireCallReveal).
  const umpireReveal=g.umpireMode?g.umpireCallReveal?.():null;
  const aiming=!g.replayView&&((['aim','windup','pitch','miss','intro'].includes(g.phase)&&!g.umpireMode)||!!umpireReveal);if(!aiming)return;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>this.aimPoint(x,y));
  const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x));
  const top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
  const zw=right-left,zh=bottom-top;
  c.save();
  c.fillStyle='rgba(205, 236, 255, 0.042)';
  c.strokeStyle='rgba(255, 255, 255, 0.36)';c.lineWidth=1.05;
  c.beginPath();
  if(c.roundRect)c.roundRect(left,top,zw,zh,4);else c.rect(left,top,zw,zh);
  c.fill();c.stroke();
  c.strokeStyle='rgba(255, 255, 255, 0.13)';c.lineWidth=.85;c.beginPath();
  for(const f of [1/3,2/3]){
   c.moveTo(left+zw*f,top+2);c.lineTo(left+zw*f,bottom-2);
   c.moveTo(left+2,top+zh*f);c.lineTo(right-2,top+zh*f);
  }
  c.stroke();
  const arm=Math.min(11,zw*.14);
  c.strokeStyle='rgba(255, 255, 255, 0.90)';c.lineWidth=2.2;c.beginPath();
  for(const [cx,cy,sx,sy] of [[left,top,1,1],[right,top,-1,1],[right,bottom,-1,-1],[left,bottom,1,-1]]){
   c.moveTo(cx+sx*arm,cy);c.lineTo(cx,cy);c.lineTo(cx,cy+sy*arm);
  }
  c.stroke();
  c.restore();
  if(umpireReveal){
   // Answer check: plot the pitch's true crossing point (the reveal's
   // stored target coordinates, unshifted) inside the now-visible zone.
   const p=this.aimPoint(umpireReveal.x,umpireReveal.y),marker=umpireReveal.strike?'#7dff8a':'#ff9a7d';
   c.save();c.beginPath();c.arc(p.x,p.y,9,0,Math.PI*2);c.strokeStyle='#14252d';c.lineWidth=3;c.stroke();
   c.beginPath();c.arc(p.x,p.y,7,0,Math.PI*2);c.fillStyle=marker;c.fill();
   c.beginPath();c.arc(p.x,p.y,2.2,0,Math.PI*2);c.fillStyle='#14252d';c.fill();c.restore();
   return;
  }

  const center=this.aimPoint(g.cursor.x,g.cursor.y),size=g.batSize,px=this.aimPoint(g.cursor.x+size.rx,g.cursor.y),py=this.aimPoint(g.cursor.x,g.cursor.y+size.ry);
  let rx=Math.max(9,Math.abs(px.x-center.x)),ry=Math.max(8,Math.abs(py.y-center.y));
  if(g.defending)rx=ry=11;
  const color=g.defending?'#ffce96':g.power?'#ff9233':'#ffec47';
  c.save();
  c.shadowBlur=12;c.shadowColor=color;c.strokeStyle=color;
  c.fillStyle=g.defending?'#ffce9614':g.power?'#ff923318':'#ffed4014';c.lineWidth=2;
  c.beginPath();c.ellipse(center.x,center.y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();
  if(!g.defending){
   c.shadowBlur=0;c.strokeStyle=g.power?'#ffd79cd8':'#fffac2bf';c.lineWidth=1.2;
   c.beginPath();c.ellipse(center.x,center.y,rx*.42,ry*.42,0,0,Math.PI*2);c.stroke();
  }
  c.shadowBlur=3;c.shadowColor='#000';c.lineWidth=1.9;c.strokeStyle='#fff';c.beginPath();
  c.moveTo(center.x-6,center.y);c.lineTo(center.x-2,center.y);
  c.moveTo(center.x+2,center.y);c.lineTo(center.x+6,center.y);
  c.moveTo(center.x,center.y-6);c.lineTo(center.x,center.y-2);
  c.moveTo(center.x,center.y+2);c.lineTo(center.x,center.y+6);
  c.stroke();c.restore();
  if(g.touch){const tx=g.touch.x/480*this.width,ty=g.touch.y/540*this.height;c.strokeStyle='#efffd74d';c.lineWidth=1;c.setLineDash([2,5]);c.beginPath();c.moveTo(tx-3,ty-3);c.lineTo(center.x+5,center.y+5);c.stroke();c.setLineDash([]);c.fillStyle='#efffd72b';c.beginPath();c.arc(tx,ty,12,0,Math.PI*2);c.fill();}
  if(!g.replayView&&g.pitch&&g.phase==='pitch'&&!g.defending&&!g.hardcore&&window.nightSettings?.timingGuide!==false)this.drawPitchGuide(g);
 }
 render(g,time){
  this.resize();if(!this.width||this.hero&&this.heroRendered)return;const field=!!g?.field&&['field','result','play-call','play-review'].includes(g.phase);if(g){this.setPark(g.park,window.nightSettings?.gameLighting);this.updateSupporters(g);const atk=g.side,def=atk==='home'?'away':'home';this.stylePlayer(this.batter,atk,g.batter.no,g.teams[atk],g.uniformKits?.[atk]);this.stylePlayer(this.pitcher,def,g.pitcher.no,g.teams[def],g.uniformKits?.[def]);this.stylePlayer(this.catcher,def,g.fielder('C',def).no,g.teams[def],g.uniformKits?.[def]);for(let i=0;i<this.fielders.length;i++){const profile=g.fielder(NightGame.POS[i][0],def);this.stylePlayer(this.fielders[i],def,profile.no,g.teams[def],g.uniformKits?.[def]);this.fielders[i].motionStyle=window.NightGame.movementStyle(profile);}}
  const score=g?.displayScore?.();
  const boardKey=g?[g.teams.home.name,g.teams.away.name,g.inning,g.half,score?.home,score?.away,
   g.homeHits,g.awayHits,g.homeErrors,g.awayErrors,g.home?.join(','),g.away?.join(','),g.park.id,
   ...((g.park.pro||VENUE_VISION_PARKS.has(g.park.id))?[g.balls,g.strikes,g.outs,g.batter.id,g.pitcher.id,
    g.pitchingStats?.[g.pitcher.id]?.pitches,g.lineups.away.map(p=>p.id).join(','),g.lineups.home.map(p=>p.id).join(',')]:[])].join('/'):'hero';
  const boardCall=g?.phase==='result'?g?.hit?.kind:g?.pitch?.speed?Math.round(g.pitch.speed):null;
  const language=globalThis.NightI18n?.language;
  if(this.boardKey!==boardKey||this.boardCall!==boardCall||this.boardLanguage!==language){
   this.drawBoard(g);this.boardKey=boardKey;this.boardCall=boardCall;this.boardLanguage=language;
  }
  this.overviewMode=g?.phase==='intro'&&(g.broadcastIntro||g.park.pro||VENUE_VISION_PARKS.has(g.park.id));
  const cameraView=this.overviewMode?'overview':'play';
  if(this.canvas.dataset.cameraView!==cameraView)this.canvas.dataset.cameraView=cameraView;
  if(field)this.followPlay(g,time);
  else if(g?.broadcastIntro)this.broadcastCamera(g);
  else if(this.overviewMode)this.overviewCamera(g.park);
  else if(this.fieldMode||!this.hero){this.camera.fov=g?.park.id==='dome'?54:49;this.camera.updateProjectionMatrix();this.resetCamera();}
  this.lastTime=time;
  this.fieldMode=field;
  for(const p of this.players){p.root.visible=false;p.shadow.visible=false;}
  if(field){
   const f=g.field,elapsed=f.elapsed+(g.phase==='result'?g.phaseTime/1000:0);
   const contact=!g.replayView&&g.phase==='field'&&f.elapsed<.15&&!f.foul&&!g.derby;
   f.fielders.forEach((p,i)=>{
    const actor=this.fielders[i],dx=p.x-actor.lastX,dz=p.y-actor.lastZ;
    const focus=f.throw?.fromIndex===i?f.throw.to:f.ball;
    const angle=p.running&&Math.hypot(dx,dz)>.001?Math.atan2(dx,dz):
     Math.hypot(focus.x-p.x,focus.y-p.y)>.05?Math.atan2(focus.x-p.x,focus.y-p.y):actor.root.rotation.y;
    this.animatePlayer(actor,p.x,p.y,angle,time,p.running,0,clamp(p.speed/6.65,.55,1.27));
    this.poseFielder(actor,i,f,elapsed);actor.lastX=p.x;actor.lastZ=p.y;
   });
   if(contact){
    const left=g.battingHand==='L';this.batter.batHand=g.battingHand;this.batter.pitchProgress=0;this.batter.batForm=window.NightGame.battingForm(g.batter);this.batter.swingActive=true;this.batter.bunting=!!g.bunt;
    this.animatePlayer(this.batter,left?1.65:-1.65,-.25,left?-.65:.65,time,false,.12+f.elapsed);
   }
   if(!f.foul)f.runners.forEach((r,i)=>{
    const actor=this.runners[i],profile=g.lineups[g.side].find(b=>b.id===(r.id||(r.batter?g.batter.id:g.baseIds[r.start-1])));
    this.stylePlayer(actor,g.side,profile?.no||g.batter.no,g.teams[g.side],g.uniformKits?.[g.side]);actor.motionStyle=window.NightGame.movementStyle(profile||{id:r.id,no:actor.no});
    if(contact&&r.batter)return;
    const dx=r.x-actor.lastX,dz=r.y-actor.lastZ,facing=Math.hypot(dx,dz)>.002?Math.atan2(dx,dz):actor.root.rotation.y;
    const target=r.target??r.progress,distance=Math.abs(target-r.progress)*27.44;
    const brake=target===1&&r.batter?1:clamp(.42+distance/4, .42,1);
    const pace=brake*clamp(r.speed/7.45,.62,1.18);
    this.animatePlayer(actor,r.x,r.y,facing,time,!!r.running,0,pace);
    this.poseRunner(actor,r,elapsed,f.ball,g.phase==='result'&&f.outcome==='hr'&&!g.derby);
    const sliding=r.slide&&elapsed-r.slide.time>=0&&elapsed-r.slide.time<.48;
    if((r.out||r.progress>=3.999)&&!sliding){actor.root.visible=false;actor.shadow.visible=false;}
    actor.lastX=r.x;actor.lastZ=r.y;
   });
   const showBall=!(g.phase==='result'&&f.outcome==='hr'&&!g.derby);
   const ballSize=NightGame.ballVisualScale(f.ball.z,Math.hypot(f.ball.x,f.ball.y));
   this.ball.position.set(f.ball.x,f.ball.z+.08,f.ball.y);this.ball.scale.setScalar(ballSize);
   this.ball.rotation.set(0,0,time*.009);
   this.ball.visible=showBall;this.ballHalo.visible=showBall;
   this.ballHalo.scale.set(.40*ballSize,.40*ballSize,1);
   this.ballShadow.position.set(f.ball.x,.05,f.ball.y);this.ballShadow.visible=showBall&&f.ball.z<20;this.ballShadow.scale.setScalar(1+f.ball.z*.020);
   const pos=this.trail.geometry.attributes.position;const ps=f.trail;for(let i=0;i<14;i++){const p=ps[Math.max(0,ps.length-14+i)]||f.ball;pos.setXYZ(i,p.x,p.z+.08,p.y);}pos.needsUpdate=true;
   this.trail.visible=showBall&&this.gl.isSoftwareRenderer&&ps.length>1;
   const indicator=g.replayView?null:g.landingIndicator();this.landing.visible=!!indicator;this.landingInner.visible=indicator?.kind==='fly';
   if(indicator){
    const ground=indicator.kind==='ground',fly=indicator.kind==='fly';
    this.landing.position.set(indicator.x,.16,indicator.y);
    this.landing.scale.setScalar(ground?1.1+indicator.scale:fly?2.6+indicator.scale*5.8:1.7+indicator.scale*2.6);
    this.landing.material.color.setHex(ground?0xffb851:fly?0xc1ffee:0xffe4a5);
    if(fly){this.landingInner.position.copy(this.landing.position);this.landingInner.scale.copy(this.landing.scale);}
   }
  }else{
   const left=(g?.battingHand||g?.batter.hand)==='L',swing=g&&g.swingAge<380?g.swingAge/760:0;
   this.pitcher.throwHand=g?.pitch?.throwHand||g?.pitcher.hand||'R';this.pitcher.releaseProgress=g&&['pitch','miss'].includes(g.phase)?g.pitch?.progress??0:null;
   this.pitcher.pitchForm=g?.pitch?.form||(g?.pitch?'overhand':g?.derby?'overhand':window.NightGame?.pitchingForm(g?.pitcher))||'overhand';
   this.pitcher.fromSet=g?.pitch?.fromSet??!!(g?.inMatch&&g?.bases?.some(Boolean));
   if(g?.broadcastIntro&&g.phaseTime>=4000&&g.phaseTime<7000){const side=g.phaseTime<5500?'away':'home',p=g.introStarter(side);if(p)this.stylePlayer(this.pitcher,side,p.no,g.teams[side],g.uniformKits?.[side]);}
   this.animatePlayer(this.pitcher,0,18.4,Math.PI,time,false,g?.phase==='windup'?Math.min(1,g.phaseTime/(g.pitch?.windupMs??(g.derby?270:700))):0);
   this.batter.batHand=left?'L':'R';this.batter.pitchProgress=g&&['pitch','miss'].includes(g.phase)?g.pitch?.progress??0:0;this.batter.batForm=window.NightGame.battingForm(g?.batter);this.batter.swingActive=!!g&&g.swingAge<380;this.batter.bunting=!!g?.bunt;this.animatePlayer(this.batter,left?1.65:-1.65,-.25,left?-.65:.65,time,false,swing);
   this.animatePlayer(this.catcher,0,-1.45,0,time,false);this.catcher.body.scale.y=.83;if(!this.hero){this.catcher.root.visible=false;this.catcher.shadow.visible=false;}
   const positions=g?.derby?[]:(window.NightGame?.positions(g?.park)||[]);positions.forEach(([name,x,z],i)=>{if(i<2)return;this.animatePlayer(this.fielders[i],x,z,Math.PI,time);});
   if(g&&g.inMatch)g.bases.forEach((occupied,i)=>{if(!occupied)return;const p=this.runners[i],base=NightGame.BASES[i+1],profile=g.lineups[g.side].find(b=>b.id===g.baseIds[i]);this.stylePlayer(p,g.side,profile?.no||1,g.teams[g.side],g.uniformKits?.[g.side]);p.motionStyle=window.NightGame.movementStyle(profile||{no:p.no});this.animatePlayer(p,base.x,base.y,Math.PI,time,false);p.lastX=base.x;p.lastZ=base.y;});
   this.ball.visible=false;this.ballHalo.visible=false;this.ballShadow.visible=false;this.trail.visible=false;this.landing.visible=false;this.landingInner.visible=false;
   if(g&&['pitch','miss'].includes(g.phase)&&g.pitch){
    const pitch=g.pitch;
    const u=Math.min(1.24,pitch.progress+(g.phase==='miss'?g.phaseTime/pitch.duration:0)),p=g.pitchAt(u);
    this.ball.position.set(p.x*.68,2.10-.85*u-p.y*.62,17.2*(1-u)+.6);
    this.ball.scale.setScalar(1+.34*Math.min(1,u)**2);
    const spin=(pitch.spinRpm??2000)*u*pitch.duration/60000;
    this.pitchSpinAxis.set(1,pitch.bx*.5,pitch.throwHand==='L'?-.75:.75).normalize();
    this.ball.quaternion.setFromAxisAngle(this.pitchSpinAxis,spin*Math.PI*.56);
    this.ball.visible=true;
    this.ballShadow.position.set(this.ball.position.x,.05,this.ball.position.z);
    this.ballShadow.scale.setScalar(.88);this.ballShadow.visible=true;
   }
  }
  this.vfx?.update(g,time,field);
  if(this.lightGlows?.length&&this.lightsLit){
   const hrShow=g&&(g.hit?.kind==='hr'||g.field?.outcome==='hr');
   const pulse=hrShow&&time>0?.50+.22*Math.sin(time*.018):.48;
   for(const lg of this.lightGlows)lg.material.opacity=pulse;
  }
  this.ballHalo.position.copy(this.ball.position);this.gl.render(this.scene,this.camera);if(this.hero)this.heroRendered=true;if(this.hud)this.drawHUD(g);
 }
}

// Uniform editor: a lightweight three-dimensional player-only stage. The
// same player factory, material definitions and texture mapping as live play.
export class UniformPreview {
 constructor(canvas){
  this.canvas=canvas;
  const r=this.r=Object.create(StadiumRenderer.prototype);
  try{r.gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false});}catch{r.gl=new CanvasSceneRenderer({canvas});}
  canvas.dataset.graphics=r.gl.isSoftwareRenderer?'canvas-3d':'webgl-3d';
  r.gl.setPixelRatio(Math.min(1.75,globalThis.devicePixelRatio||1));r.gl.outputColorSpace=T.SRGBColorSpace;
  r.gl.setClearColor?.(0x101b2c);r.gl.toneMapping=T.ACESFilmicToneMapping;r.gl.toneMappingExposure=1.12;
  r.scene=new T.Scene();r.scene.scale.z=-1;r.scene.background=new T.Color(0x152339);
  r.materials=new Map();r.geometries={sphere:new T.SphereGeometry(1,32,24),lowSphere:new T.SphereGeometry(1,10,7),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12)};
  r.scene.add(new T.HemisphereLight(0xe7f1ff,0x5a6271,2.2));
  const key=new T.DirectionalLight(0xfff5e9,3.2);key.position.set(3,5,-4);r.scene.add(key);
  const rim=new T.DirectionalLight(0xa8d3ff,1.5);rim.position.set(-4,3,4);r.scene.add(rim);
  this.camera=new T.PerspectiveCamera(33,1,.1,30);
  this.players={};
  for(const role of ['pitcher','batter','catcher']){
   const p=r.makePlayer(role,'home',18);decorateChibiPlayer(r,p);p.root.visible=false;p.bat.visible=false;p.glove.visible=false;this.players[role]=p;
  }
  if(!r.gl.isSoftwareRenderer)loadMatchModel('jersey').then(model=>{
   if(this.closed||!model)return;
   for(const p of Object.values(this.players)){
    const jersey=model.clone();jersey.traverse(m=>{if(m.name==='Uniform'){r.uniformGLBGeometry??=jerseyUV(m.geometry);m.geometry=r.uniformGLBGeometry;m.material=p.torsoMat;}else if(m.name==='Piping')m.visible=false;});
    p.body.add(jersey);p.jerseyPlaceholder.visible=false;
   }
   this.render();
  });
 }
 update(club,side,kit,role='pitcher',angle=0){
  this.role=role;this.angle=angle;
  for(const [key,p] of Object.entries(this.players)){p.root.visible=key===role;if(p.root.visible)this.r.stylePlayer(p,side,18,club,kit);}
  this.render();
 }
 render(){
  if(this.closed)return;
  const w=Math.max(180,this.canvas.clientWidth||300),h=Math.max(180,this.canvas.clientHeight||240),r=this.r;
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;r.gl.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  const a=(this.angle||0)*Math.PI/180,d=6.55;this.camera.position.set(Math.sin(a)*d,1.94,-Math.cos(a)*d);this.camera.lookAt(0,1.62,0);r.gl.render(r.scene,this.camera);
 }
 dispose(){
  this.closed=true;const r=this.r,geometries=new Set(),materials=new Set(),textures=new Set();
  r.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);if(o.material.map)textures.add(o.material.map);}});
  for(const e of r.uniformTextures?.values()||[])textures.add(e.texture);
  for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  r.gl.dispose?.();r.gl.forceContextLoss?.();
 }
}
