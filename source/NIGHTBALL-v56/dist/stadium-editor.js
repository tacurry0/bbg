/* Custom stadium editor (v107): user-built parks stored in localStorage.
   A custom park is a plain park object in the exact shape NightPlayers.parks
   already uses, so NightPlayers.wallDistance / fenceHeight, the 2D renderer
   (which samples wallDistance) and the 3D wall builder (which also samples
   wallDistance / fenceHeight) all consume it unchanged. The generic 3D
   stands/board come from a fixed template below; only the fence geometry
   follows the custom dimensions. */
(()=>{
'use strict';
const KEY='nightball.customParks';
// Clamp ranges keep every custom park inside the envelope the engine and
// renderers already handle: the smallest built-in park is the 70 m school
// yard and the deepest built-in centre field is 125 m (Jamsil), while the
// tallest built-in wall is 5 m (Yokohama). The ranges below stay near that
// envelope while still allowing clearly shallow / deep custom parks.
const DISTANCES=['left','leftGap','leftCenter','leftDeep','center','rightDeep','rightCenter','rightGap','right'];
const HEIGHTS=Array.from({length:9},(_,i)=>'height'+i);
const LIMITS={left:[55,160],leftGap:[55,180],leftCenter:[60,180],leftDeep:[60,200],center:[70,200],rightDeep:[60,200],rightCenter:[60,180],rightGap:[55,180],right:[55,160],wallHeight:[.5,25],foulWidth:[5,35],trackWidth:[0,12],infieldSize:[24,45],bounce:[.55,1.45],roll:[.5,1.5],wallRebound:[.05,.85],standRows:[3,45],standSlope:[10,38],crowd:[0,100],roofHeight:[30,100],boardWidth:[8,60],boardHeight:[4,24],boardElevation:[4,35],lightCount:[0,8],lightHeight:[15,60],dugoutOffset:[5,30],dugoutSize:[6,20],eyeWidth:[4,40],eyeHeight:[1,15],windSpeed:[0,15],windDirection:[0,359]};
for(const k of HEIGHTS)LIMITS[k]=LIMITS.wallHeight;
const OPTIONS={fenceShape:['curve','straight'],surface:['grass','artificial','dirt'],infield:['grass','dirt','cutouts'],mow:['stripes','checker','diagonal','plain'],venue:['outdoor','dome','retractable','school'],standLayout:['full','outfield','infield','left','right','none'],roofShape:['arch','gable','barrel'],roofOpen:['open','closed'],boardPosition:['left','center','right'],boardStyle:['digital','classic'],lightLayout:['around','outfield','corners'],bullpen:['outside','inside','none'],daylight:['auto','day','night'],weather:['random','clear','cloudy','rain'],windMode:['random','fixed']};
const COLORS={turfColor:'#5d8a4a',clayColor:'#c28770',trackColor:'#9e5d4a',wallColor:'#264f54',railColor:'#e5c568',seatColor:'#325e71',roofColor:'#9eafbf',dugoutColor:'#264f54',eyeColor:'#132924',adColor:'#24414c'};
const DEFAULTS={left:100,leftCenter:110,center:120,rightCenter:110,right:100,wallHeight:2.8,foulWidth:18,trackWidth:3.5,infieldSize:38,bounce:1,roll:1,wallRebound:.25,standRows:18,standSlope:24,crowd:65,roofHeight:62,boardWidth:33,boardHeight:12,boardElevation:16,lightCount:6,lightHeight:32,dugoutOffset:12,dugoutSize:12,eyeWidth:18,eyeHeight:5,windSpeed:0,windDirection:0,fenceShape:'curve',surface:'grass',infield:'grass',mow:'stripes',venue:'outdoor',standLayout:'full',roofShape:'arch',roofOpen:'open',boardPosition:'center',boardStyle:'digital',lightLayout:'outfield',bullpen:'outside',daylight:'auto',weather:'random',windMode:'random',adText:'NIGHTBALL',...COLORS};
const num=(value,fallback)=>value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):fallback;
function clampSpec(spec={}){
 const out={...DEFAULTS};
 for(const [field,[lo,hi]] of Object.entries(LIMITS)){
  const i=DISTANCES.indexOf(field),fallback=DEFAULTS[field]??(HEIGHTS.includes(field)?num(spec.wallHeight,2.8):i%2?(num(spec[DISTANCES[i-1]],DEFAULTS[DISTANCES[i-1]])+num(spec[DISTANCES[i+1]],DEFAULTS[DISTANCES[i+1]]))/2:110);
  out[field]=Math.round(Math.max(lo,Math.min(hi,num(spec[field],fallback)))*100)/100;
 }
 out.lightCount=Math.round(out.lightCount/2)*2;
 for(const k of ['standRows','crowd','windDirection'])out[k]=Math.round(out[k]);
 for(const [k,values] of Object.entries(OPTIONS))if(values.includes(spec[k]))out[k]=spec[k];
 for(const k of Object.keys(COLORS))if(/^#[0-9a-f]{6}$/i.test(spec[k]))out[k]=spec[k].toLowerCase();
 const clean=(v,n)=>String(v??'').replace(/[<>&"']/g,'').trim().slice(0,n);
 out.name=clean(spec.name,24)||'マイスタジアム';out.adText=clean(spec.adText??DEFAULTS.adText,40);
 out.detailShape=spec.detailShape===true||(spec.detailShape!==false&&DISTANCES.some((k,i)=>i%2&&spec[k]!=null));
 if(!out.detailShape&&typeof NightPlayers!=='undefined')for(let i=1;i<9;i+=2)out[DISTANCES[i]]=Math.round(NightPlayers.wallDistance({...out,straightFence:out.fenceShape==='straight'},-Math.PI/4+i*Math.PI/16)*100)/100;
 return out;
}
function makePark(spec,id){
 const s=clampSpec(spec),hex=k=>parseInt(s[k].slice(1),16),feet=m=>Math.round(m*3.28084);
 const indoor=s.venue==='dome'||s.venue==='retractable'&&s.roofOpen==='closed',school=s.venue==='school';
 const p={id:String(id),custom:true,customSpec:s,alleysVerified:true,name:s.name,left:s.left,leftCenter:s.leftCenter,center:s.center,rightCenter:s.rightCenter,right:s.right,corner:Math.min(s.left,s.right),wallHeight:s.wallHeight,
  leftFeet:feet(s.left),centerFeet:feet(s.center),rightFeet:feet(s.right),fenceAnchors:s.detailShape?DISTANCES.map(k=>s[k]):null,heightAnchors:HEIGHTS.map(k=>s[k]),straightFence:s.fenceShape==='straight',foulWidth:s.foulWidth,
  theme:indoor?'dome':school?'school-yard':'night',school,daylight:s.daylight==='day',wind:0,turf:hex(s.surface==='dirt'?'clayColor':'turfColor'),clay:hex('clayColor'),track:hex('trackColor'),foulTrack:hex('trackColor'),trackWidth:s.trackWidth,mowing:[s.mow==='diagonal'?1:.5,s.mow==='plain'?0:1],seats:hex('seatColor'),wall:hex('wallColor'),rail:hex('railColor'),infield:s.infield,cutouts:s.infield==='cutouts',stands:[],board:[0,s.boardElevation,s.center+8,s.boardWidth,s.boardHeight]};
 if(indoor){p.roofHeight=s.roofHeight;p.roofProfile={style:s.roofShape,radiusX:Math.max(...DISTANCES.map(k=>s[k]))+s.standRows+18,radiusZ:Math.max(...DISTANCES.map(k=>s[k]))+s.standRows+18,edge:s.roofHeight*.58,height:s.roofHeight};}
 return p;
}
function fromPark(p){
 if(p.customSpec)return {...p.customSpec};
 const spec={name:p.name,left:p.left,leftCenter:p.leftCenter,center:p.center,rightCenter:p.rightCenter,right:p.right,wallHeight:p.wallHeight??2.8,venue:p.roofHeight?'dome':p.school?'school':'outdoor',roofHeight:p.roofHeight??62,fenceShape:p.straightFence?'straight':'curve',roofShape:p.roofProfile?.style??'arch',infield:p.cutouts?'cutouts':p.infield??'grass',trackWidth:p.trackWidth,boardWidth:p.board?.[3],boardHeight:p.board?.[4],boardElevation:p.board?.[1],standLayout:p.stands?.length?'full':'none'};
 for(const [k,v] of Object.entries({turfColor:p.turf,clayColor:p.clay,trackColor:p.track,wallColor:p.wall,railColor:p.rail,seatColor:p.seats}))if(Number.isFinite(v))spec[k]='#'+v.toString(16).padStart(6,'0');
 HEIGHTS.forEach((k,i)=>{spec[k]=NightPlayers.fenceHeight(p,-Math.PI/4+i*Math.PI/16);});
 return clampSpec(spec);
}
function storageOr(storage){
 if(storage)return storage;
 try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}
}
function loadSpecs(storage){
 const store=storageOr(storage);if(!store)return [];
 try{const raw=JSON.parse(store.getItem(KEY)||'[]');return Array.isArray(raw)?raw.filter(s=>s&&typeof s==='object'&&s.id):[];}catch{return [];}
}
function saveSpecs(specs,storage){
 const store=storageOr(storage);if(!store)return false;
 try{store.setItem(KEY,JSON.stringify(specs));return true;}catch{return false;}
}
// (Re)register every stored custom park in NightPlayers.parks. Existing
// custom entries are replaced in place so a game or renderer holding the
// parks array sees the edited dimensions under the same id.
function register(storage){
 if(typeof NightPlayers==='undefined'||!Array.isArray(NightPlayers.parks))return [];
 const specs=loadSpecs(storage),parks=specs.map(s=>makePark(s,s.id)),ids=new Set(parks.map(p=>p.id));
 for(let i=NightPlayers.parks.length-1;i>=0;i--)if(NightPlayers.parks[i].custom&&!ids.has(NightPlayers.parks[i].id))NightPlayers.parks.splice(i,1);
 for(const park of parks){const at=NightPlayers.parks.findIndex(p=>p.id===park.id);if(at>=0)NightPlayers.parks[at]=park;else NightPlayers.parks.push(park);}
 return parks;
}
function upsert(spec,storage){
 const specs=loadSpecs(storage);
 const id=spec.id&&String(spec.id).startsWith('custom-')?String(spec.id):'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
 const clean={id,...clampSpec(spec)};
 const at=specs.findIndex(s=>s.id===id);if(at>=0)specs[at]=clean;else specs.push(clean);
 saveSpecs(specs,storage);register(storage);
 return makePark(clean,id);
}
function remove(id,storage){
 const specs=loadSpecs(storage).filter(s=>s.id!==id);
 saveSpecs(specs,storage);register(storage);
 return specs;
}
const api={KEY,LIMITS,OPTIONS,COLORS,DEFAULTS,DISTANCES,HEIGHTS,clampSpec,makePark,fromPark,loadSpecs,saveSpecs,register,upsert,remove,
 list:storage=>loadSpecs(storage).map(s=>makePark(s,s.id))};
if(typeof window!=='undefined')window.NightStadium=api;
if(typeof globalThis!=='undefined')globalThis.NightStadium=api;
register();
})();
