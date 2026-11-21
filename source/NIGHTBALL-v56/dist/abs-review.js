import {PerspectiveCamera, Vector3} from './vendor/three.module.min.js';

// Both renderers place the gesture over the on-field player, away from the HUD.
export function absActorBounds(renderer,game){
 const {width,height}=renderer;
 if(!renderer.project){
  return game.defending
   ?{x:width*.5,y:height*.55,w:44,h:Math.max(44,height*.10)}
   :{x:width*(game.battingHand==='L'?.875:.125),y:height*.84,w:Math.max(44,width*.15),h:height*.23};
 }
 const x=game.defending?0:game.battingHand==='L'?1.65:-1.65;
 const z=game.defending?18.4:-.25;
 const head=renderer.project(x,2.22,z),feet=renderer.project(x,0,z);
 const shoulder=renderer.project(x+.51,1.25,z),other=renderer.project(x-.51,1.25,z);
 const y=Math.min(head.y,feet.y),h=Math.max(44,Math.abs(feet.y-head.y)+14);
 return {x:(shoulder.x+other.x)/2,y:y+Math.abs(feet.y-head.y)/2,w:Math.max(44,Math.abs(shoulder.x-other.x)+18),h};
}

const clip=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const smooth=u=>u*u*(3-2*u);
const blend=(from,to,u)=>from.map((n,i)=>n+(to[i]-n)*u);
const plate=[[-.216,0,-.216],[.216,0,-.216],[.216,0,0],[0,0,.216],[-.216,0,0]];
const ORBIT_BEGIN=480,ORBIT_END=2040,ZOOM_BEGIN=3260;

export function absCameraPose(ball,time,portrait,reveal){
 if(time<ORBIT_BEGIN){
  const u=smooth(clip(time/ORBIT_BEGIN,0,1));
  return {eye:blend([0,1.8,4.3],[0,1.43,3.2],u),look:blend([0,.77,-.65],[0,.65,-.46],u),fov:34+u};
 }
 if(time<ORBIT_END){
  // Orbit on a half-circle from behind the catcher to the pitcher's side.
  const u=smooth((time-ORBIT_BEGIN)/(ORBIT_END-ORBIT_BEGIN)),angle=Math.PI*u,radius=3.2-.53*u;
  const eye=[-Math.sin(angle)*radius,1.43-.31*u,Math.cos(angle)*radius];
  return {eye,look:[0,.65+.02*u,-.46+.78*u],fov:35+8*Math.sin(Math.PI*u/2)};
 }
 const u=smooth(clip((time-ZOOM_BEGIN)/(reveal-ZOOM_BEGIN),0,1));
 const end=[ball[0],ball[1]+.035,portrait?-.36:-.43];
 return {eye:blend([0,1.12,-2.67],end,u),look:blend([0,.67,.32],ball,u),fov:43-9*u};
}

export class AbsReview {
 constructor(canvas){
  this.canvas=canvas;
  this.ctx=canvas.getContext('2d');
  this.camera=new PerspectiveCamera(40,1,.045,250);
 }
 draw(call,time,reducedMotion=false){
  const c=this.ctx,r=this.canvas.getBoundingClientRect();
  if(!c||!r.width||!r.height)return;
  const scale=Math.min(devicePixelRatio||1,2);
  const w=Math.round(r.width*scale),h=Math.round(r.height*scale);
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  this.width=w;this.height=h;
  const camera=this.camera,ball=[call.x,.66+call.y,-.015],reveal=NightGame.ABS_TIMING.reviewReveal;
  const portrait=w<h,pose=absCameraPose(ball,reducedMotion?reveal:time,portrait,reveal);
  camera.position.set(...pose.eye);
  camera.lookAt(...pose.look);
  camera.aspect=w/h;
  camera.fov=pose.fov+(portrait?10:0);
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  c.fillStyle='#91d0e3';c.fillRect(0,0,w,h);
  // The horizon stays level throughout the turn, including the side-on view.
  const far=camera.getWorldDirection(new Vector3());
  far.y=0;far.normalize().multiplyScalar(100).add(camera.position);far.y=0;
  const horizon=clip(this.screen(far.applyMatrix4(camera.matrixWorldInverse)).y,0,h);
  c.fillStyle='#2d513d';c.fillRect(0,horizon,w,h-horizon);
  this.polygon([[-6,-.025,8],[-5,-.025,-3],[0,-.025,-7],[5,-.025,-3],[6,-.025,8]],'#42352d');
  this.polygon([[-42,-.026,-43],[-41.75,-.026,-43],[-.19,.002,-.19],[-.235,.002,-.19]],'#f5eddf');
  this.polygon([[42,-.026,-43],[41.75,-.026,-43],[.19,.002,-.19],[.235,.002,-.19]],'#f5eddf');
  for(const direction of [-1,1])this.batterBox(direction);
  this.polygon(plate,'#fffef9');
  this.polygon([[-.216,.66,-.015],[.216,.66,-.015],[.216,1.26,-.015],[-.216,1.26,-.015]],'#f1fcf889');
  const p=new Vector3(...ball).applyMatrix4(camera.matrixWorldInverse);
  const center=this.screen(p),radius=Math.min(h*.20,Math.max(w/145,.0367*h*camera.projectionMatrix.elements[5]/(-2*p.z)));
  this.baseball(center,radius);
 }
 screen(point){
  const v=point.clone().applyMatrix4(this.camera.projectionMatrix);
  return {x:(v.x*.5+.5)*this.width,y:(.5-v.y*.5)*this.height};
 }
 polygon(world,color){
  const c=this.ctx,near=-.05;
  const points=world.map(p=>new Vector3(...p).applyMatrix4(this.camera.matrixWorldInverse));
  const clipped=[];
  for(let i=0;i<points.length;i++){
   const from=points[i],to=points[(i+1)%points.length],inside=from.z<=near,entering=to.z<=near;
   if(inside)clipped.push(from);
   if(inside!==entering)clipped.push(from.clone().lerp(to,(near-from.z)/(to.z-from.z)));
  }
  if(clipped.length<3)return;
  c.beginPath();
  clipped.map(v=>this.screen(v)).forEach(({x,y},i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.closePath();c.fillStyle=color;c.fill();
 }
 batterBox(direction){
  const left=.34,right=1.23,front=-.84,back=.98,line=.038,y=.003;
  for(const [x1,x2,z1,z2] of [[left,right,front,front+line],[left,right,back-line,back],
   [left,left+line,front,back],[right-line,right,front,back]]){
   this.polygon([[direction*x1,y,z1],[direction*x2,y,z1],[direction*x2,y,z2],[direction*x1,y,z2]],'#f5eddf');
  }
 }
 baseball({x,y},r){
  const c=this.ctx;
  c.save();c.translate(x,y);c.scale(r,r);c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.clip();
  const light=c.createRadialGradient(-.32,-.41,.13,.18,.22,1.24);
  light.addColorStop(0,'#fffef7');light.addColorStop(.64,'#e5e4e2');light.addColorStop(1,'#9a9c9f');
  c.fillStyle=light;c.fillRect(-1,-1,2,2);
  c.strokeStyle='#842d3c';c.lineWidth=.026;c.lineCap='round';
  for(const side of [-1,1]){
   const seam=y=>side*(.46-.28*y*y);
   c.beginPath();
   for(let i=0;i<=30;i++){const y=(i-15)*.07,x=seam(y);if(i)c.lineTo(x,y);else c.moveTo(x,y);}
   c.stroke();
   c.beginPath();
   for(let i=-10;i<=10;i++){
    const y=i*.087,x=seam(y);
    c.moveTo(x+side*.070,y+.052);c.lineTo(x-side*.050,y-.015);
   }
   c.stroke();
  }
  c.restore();
 }
}
