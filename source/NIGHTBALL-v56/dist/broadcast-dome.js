import * as T from './vendor/three.module.min.js';
import { venueVision } from './venue-vision.js?v=69';

const TAU = 2 * Math.PI;
const CENTER_Z = 48;
const ROOF_RADIUS = 116;
const CABLE_SPACING = 12;
const ROOF_EDGE = 33;
const BOWL = [
 { width: 85, depth: 77, floor: 4.55, rows: 19, run: .94, rise: .51 },
 { width: 103, depth: 96, floor: 20.6, rows: 12, run: .88, rise: .69 }
];
const VISION_START = -.621;
const VISION_END = .621;
const EYE_EDGE = .154;

const bowlPoint = (angle, width, depth, y) =>
 [width * Math.sin(angle), y, CENTER_Z + depth * Math.cos(angle)];
const varying = seed => ((Math.imul(seed, 16807) >>> 0) % 65521) / 65521;

function mesh(group, name, geometry, material) {
 const object = new T.Mesh(geometry, material);
 object.name = name;
 group.add(object);
 return object;
}

// A continuous curved surface with UVs that span the whole strip.
function strip(group, name, material, profile, start, end, segments) {
 const position = [], uv = [], indices = [];
 for (let i = 0; i <= segments; i++) {
  const t = i / segments;
  const angle = start + (end - start) * t;
  profile.forEach(([w, d, y], row) => {
   position.push(...bowlPoint(angle, w, d, y));
   uv.push(t, row / (profile.length - 1));
  });
  if (i === segments) continue;
  for (let row = 0; row < profile.length - 1; row++) {
   const a = i * profile.length + row, b = a + profile.length;
   indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
 }
 const geometry = new T.BufferGeometry();
 geometry.setAttribute('position', new T.Float32BufferAttribute(position, 3));
 geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return mesh(group, name, geometry, material);
}

function boxBatch(group, name, entries, material) {
 const object = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), material, entries.length);
 object.name = name;
 const anchor = new T.Object3D();
 entries.forEach(({ point, size, angle = 0, color }, i) => {
  anchor.position.set(...point);
  anchor.scale.set(...size);
  anchor.rotation.y = angle;
  anchor.updateMatrix();
  object.setMatrixAt(i, anchor.matrix);
  if (color !== undefined) object.setColorAt(i, new T.Color(color));
 });
 group.add(object);
 return object;
}

function roof(group, park, materials, software) {
 // The underlying dome equation is shared with the gameplay camera.
 const taipei=park.id==='taipei-dome',radius=taipei?128:ROOF_RADIUS,edge=taipei?40:ROOF_EDGE;
 const spacing=taipei?8.6:CABLE_SPACING;
 const point = (x, z, y = 0) => [x, NightPlayers.roofSurface(park, x, z) + y, z];
 const positions = [], colors = [], triangles = [];
 const rings = software ? 15 : 58, sectors = software ? 52 : 144;
 const fabric = new T.Color(taipei?0x161b20:0xe8e2d1);
 for (let row = 0; row <= rings; row++) {
  const r = row / rings;
  for (let column = 0; column <= sectors; column++) {
   const angle = TAU * column / sectors;
   const x = Math.sin(angle) * r * radius;
   const z = Math.cos(angle) * r * radius;
   const warp = Math.abs(Math.sin(Math.PI * x / spacing));
   const weft = Math.abs(Math.sin(Math.PI * z / spacing));
   const billow = warp * weft, neutral = .82 + .15 * r + .10 * billow;
   positions.push(...point(x,CENTER_Z+z,taipei?0:(.48*billow-.48)*(1-r)));
   colors.push(fabric.r * neutral, fabric.g * neutral, fabric.b * (neutral + .023));
   if (row < rings && column < sectors) {
    const a = row * (sectors + 1) + column, b = a + sectors + 1;
    if (row > 0) triangles.push(a, b, a + 1);
    triangles.push(a + 1, b, b + 1);
   }
  }
 }
 const geometry = new T.BufferGeometry();
 geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
 geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
 geometry.setIndex(triangles);
 geometry.computeVertexNormals();
 const membrane=mesh(group,taipei?'Taipei Dome dark ceiling':'Tokyo Dome air-supported membrane',geometry,materials.fabric);
 if (software) membrane.renderOrder = -2;

 const cables = [];
 for (const alongZ of [false, true]) {
  const step=software?spacing*1.5:spacing;
  for(let offset=-Math.floor((radius-5)/step)*step;offset<radius-5;offset+=step){
   const end=Math.sqrt(radius**2-offset**2),steps=software?22:48;
   const points = Array.from({ length: steps + 1 }, (_, i) => {
    const run = -end + 2 * end * i / steps;
    const x=alongZ?offset:run,z=alongZ?run:offset;
    return new T.Vector3(...(taipei?point((x+z)*Math.SQRT1_2,CENTER_Z+(z-x)*Math.SQRT1_2,-.78):point(x,CENTER_Z+z,-.63)));
   });
   if (software) {
    const line = new T.Line(new T.BufferGeometry().setFromPoints(points), materials.fallbackCable);
    line.renderOrder = -1;
    group.add(line);
    continue;
   }
   for (let i = 0; i < steps; i++) {
    const a = points[i], b = points[i + 1];
    cables.push([a, b]);
   }
  }
 }
 if (cables.length) {
  const object = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 5), materials.cable, cables.length);
  object.name = taipei?'Taipei Dome diagonal steel lattice':'Tokyo Dome crossing roof cables';
  const anchor = new T.Object3D(), up = new T.Vector3(0, 1, 0), d = new T.Vector3();
  cables.forEach(([a, b], i) => {
   d.subVectors(b, a);
   anchor.position.copy(a).lerp(b, .5);
   const thickness=taipei?.205:.135;
   anchor.scale.set(thickness,d.length()+.12,thickness);
   anchor.quaternion.setFromUnitVectors(up, d.normalize());
   anchor.updateMatrix();
   object.setMatrixAt(i, anchor.matrix);
  });
  group.add(object);
 }

 const segments = software ? 56 : 112;
 for (const [name, material, profile] of [
  ['Perimeter interior wall',materials.shadow,[[radius-3,radius-3,0],[radius,radius,edge]]],
  ['Roof compression ring',materials.steel,[[radius-1,radius-1,edge],[radius-2.5,radius-2.5,edge-.5],[radius-2.5,radius-2.5,edge-2.6]]],
  ['Light gallery fascia',materials.shadow,[[radius-4,radius-4,edge-3.7],[radius-4,radius-4,edge-1.7],[radius-2,radius-2,edge-1.3]]]
 ]) strip(group, name, material, profile, -Math.PI, Math.PI, segments);
}

function seating(group, materials, software) {
 const seats = [], heads = [], shirts = [], bays = [];
 const seatsBlue = [0x283966, 0x303d71, 0x354784, 0x24315d];
 const shirtsColor = [0xffa438, 0xf68b2f, 0xf0eee1, 0xd5d9e2, 0x27428b, 0x362c31, 0xc96834];
 const skin = [0xd9ae8d, 0xb5866c, 0x8d6251];
 const profileFor = ({width, depth, floor, rows, run, rise}) => {
  const profile = [[width, depth, floor]];
  for (let row = 1; row <= rows; row++) {
   const w = width + row * run, d = depth + row * run;
   profile.push([w, d, floor + (row - 1) * rise], [w, d, floor + row * rise]);
  }
  return profile;
 };
 BOWL.forEach((tier, level) => {
  const {width, depth, floor, rows, run, rise} = tier;
  const profile = profileFor(tier);
  // The center-field batter's eye replaces the lower seats. The upper outfield hosts the vision.
  const gap = level === 0 ? EYE_EDGE : VISION_END + .035;
  strip(group, 'Stepped seating bowl', materials.seats, profile, gap, TAU - gap, software ? 45 : 100);
  strip(group, 'Balcony fascia', materials.fascia,
   [[width,depth,floor-1.15], [width-.36,depth-.36,floor+.28]],
   gap, TAU-gap, software ? 28 : 90);
  strip(group, 'Blue balcony edge', materials.seats,
   [[width-.48,depth-.48,floor+.20], [width-.48,depth-.48,floor+.49]],
   gap, TAU-gap, software ? 28 : 90);
  for (let section = 0; section < 30; section++) {
   const start = section / 30 * TAU, end = (section + 1) / 30 * TAU;
   const aisle = start + .013;
   if (aisle > gap && aisle < TAU - gap) {
    const stairs = profile.map(([w,d,y]) => [w-.025,d-.025,y+.032]);
    strip(group, 'Concrete aisle', materials.steps, stairs, aisle-.0107, aisle+.0107, 1);
    if (!software) bays.push({
     point: bowlPoint(aisle, width+rows*run+.35, depth+rows*run+.35, floor+rows*rise+1.37),
     size: [2.7,2.55,.27], angle: aisle
    });
   }
   for (let row = 0; row < rows; row += software ? 3 : 1) {
    const seatCount = software ? 3 : 21;
    for (let n = 0; n < seatCount; n++) {
     const angle = start + .033 + (end-start-.045) * (n + .5) / seatCount;
     if (angle <= gap || angle >= TAU-gap) continue;
     const w = width + (row+.73)*run, d = depth + (row+.73)*run, y = floor + row*rise;
     const seed = 1 + section*113 + row*2797 + level*53089 + n*421;
     seats.push({point: bowlPoint(angle,w,d,y+.30), size: [software?1.55:.63,.44,.17],
      angle, color: seatsBlue[(section+row+n)%seatsBlue.length]});
     if (varying(seed) < (software ? .31 : .59)) {
      const shirt = shirtsColor[(section*7 + row*3 + n*11 + Math.floor(varying(seed+17)*23)) % shirtsColor.length];
      shirts.push({point:bowlPoint(angle,w-.21,d-.21,y+.49),size:[.41,.53,.32],angle,color:shirt});
      if (!software) heads.push({point:bowlPoint(angle,w-.23,d-.23,y+.87),size:[.25,.26,.24],
       angle,color:skin[Math.floor(varying(seed+31)*skin.length)]});
     }
    }
   }
  }
 });
 boxBatch(group, 'Blue stadium seats', seats, materials.instance);
 boxBatch(group, 'Seated crowd', shirts, materials.instance);
 if (heads.length) boxBatch(group, 'Crowd heads', heads, materials.instance);
 if (bays.length) boxBatch(group, 'Open concourse entrances', bays, materials.shadow);
}

function dugouts(group, materials, {lateral=29,depth=14}={}) {
 const facades = [], caps = [], railings = [], backs = [];
 for (const side of [-1,1]) {
  const angle = side * .76;
  const at = (along, behind, y) => [
   side * lateral + along * Math.sin(angle) + side * behind * Math.cos(angle),
   y,
   depth + along * Math.cos(angle) - behind * Math.sin(.76)
  ];
  facades.push({point:at(0,0,.56),size:[.46,1.12,20.5],angle});
  backs.push({point:at(0,3.55,1.12),size:[.4,2.24,20.5],angle});
  caps.push({point:at(0,2,2.33),size:[4,.23,20.7],angle});
  railings.push({point:at(0,-.12,1.16),size:[.19,.16,20.52],angle});
  for (const end of [-10.15,10.15]) backs.push({point:at(end,1.8,1.13),size:[3.6,2.26,.28],angle});
 }
 boxBatch(group,'Foul-side dugout padding',facades,materials.eye);
 boxBatch(group,'Dugout canopy',caps,materials.dugoutRoof??materials.concrete);
 boxBatch(group,'Dugout inner walls',backs,materials.shadow);
 boxBatch(group,'Dugout padded rails',railings,materials.steel);
}

function lighting(group, materials, software, radius=116, edge=33) {
 const frames = [], lights = [], glints = [];
 const count = software ? 32 : 76;
 for (let i = 0; i < count; i++) {
  const angle = TAU * i / count;
  frames.push({point:bowlPoint(angle,radius-4.4,radius-4.4,edge-2.65),size:[5.5,1.38,.69],angle});
  for (const y of [edge-2.93,edge-2.38]) {
   const bulbs = software ? 3 : 7;
   for (let j = 0; j < bulbs; j++) {
    const a = angle + (j - (bulbs-1)/2) * (software ? .014 : .006);
    lights.push({point:bowlPoint(a,radius-4.96,radius-4.96,y),size:[software?.91:.40,.31,.35],angle});
   }
  }
  if (!software && i % 4 === 1) glints.push(bowlPoint(angle,radius-5.4,radius-5.4,edge-2.61));
 }
 boxBatch(group, 'Roof-edge floodlight housings', frames, materials.shadow);
 boxBatch(group, 'Roof-edge LED lamps', lights, materials.lamp);
 return glints;
}

function parkSign(group,name,point,width,height,color,background=null){
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=160;
 const ctx=canvas.getContext('2d');
 if(background){ctx.fillStyle=background;ctx.fillRect(0,0,1024,160);}
 ctx.fillStyle=color;ctx.font='800 115px system-ui,sans-serif';ctx.textAlign='center';
 ctx.fillText(name,512,120,974);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map,transparent:!background,alphaTest:background?0:.28,side:T.DoubleSide,toneMapped:false});
 const sign=mesh(group,name,new T.PlaneGeometry(width,height),material);
 sign.position.set(...point);sign.userData.disposeMaterial=true;sign.userData.disposeTexture=true;
 return sign;
}

function vision(group, renderer, materials, software) {
 const span = software ? 14 : 52;
 strip(group,'Dark wall beneath the main vision',materials.shadow,[[106.8,96.8,3.9],[106.8,96.8,15.4]],-.17,.17,14);
 strip(group, 'Main vision structure', materials.shadow,
  [[108,97,14.7],[108,97,27.3],[112,101,27.3],[112,101,14.7]],
  VISION_START-.02,VISION_END+.02,span);
 strip(group,'Curved 125 m wide main vision',venueVision(renderer,'tokyo-dome').material,
  [[107.4,96.4,15.1],[107.4,96.4,26.85]],VISION_START,VISION_END,span);
 parkSign(group,'TOKYO DOME',[0,28.92,144],26,2.7,'#38ea65');
 for (const [start,end] of [[-.887,-.172],[.172,.887]]) {
  strip(group,'Outfield LED ribbon housing',materials.shadow,
   [[85,76.6,4.10],[85,76.6,5.05]],start,end,24);
  strip(group,'Outfield LED ribbon',materials.ribbon,
   [[84.7,76.3,4.34],[84.7,76.3,4.91]],start,end,24);
 }
}

export function decorateBroadcastDome(renderer, park) {
 const {parkDecor:group,gl} = renderer;
 const software = gl.isSoftwareRenderer;
 const solid = (name, color) => {
  const material = renderer.mat('tokyo-dome:'+name,color);
  material.side = T.DoubleSide;
  return material;
 };
 const materials = {
  concrete:solid('terrace',0x747981), steps:solid('aisle',0xa9a9a4),
  fascia:solid('balcony',0x979a98), shadow:solid('concourse',0x1c2527),
  seats:solid('blue',0x292f51), instance:solid('instances',0xffffff),
  steel:solid('roof-ring',0x51575a), cable:solid('cable',0x373934),
  eye:solid('batter-eye',0x19352a), ribbon:solid('ribbon',0xe9ad52),
  lamp:solid('lamp',0xfff8de), fabric:solid('fabric',software?0xc5c0af:0xffffff)
 };
 materials.fabric.vertexColors = true;
 materials.fabric.emissive.setHex(0xbab1a3);
 materials.fabric.emissiveIntensity = .21;
 for (const item of [materials.lamp,materials.ribbon]) {
  item.emissive.copy(item.color);
  item.emissiveIntensity = 1.05;
 }
 if (software) materials.fallbackCable = renderer.tokyoFallbackCable ||= new T.LineBasicMaterial({color:0x4c4b44});

 roof(group,park,materials,software);
 seating(group,materials,software);
 dugouts(group,materials);
 vision(group,renderer,materials,software);
 addGlints(renderer,group,lighting(group,materials,software));
}

function addGlints(renderer,group,glints){
 for (const point of glints) {
  const glow = new T.Sprite(new T.SpriteMaterial({
   map:renderer.glowTexture(), color:0xfff5df, transparent:true, opacity:.24,
   depthWrite:false, blending:T.AdditiveBlending, fog:false
  }));
  glow.userData.disposeMaterial = true;
  glow.position.set(...point);
  glow.scale.set(4.8,2.8,1);
  group.add(glow);
 }
}

function taiwanMaterials(renderer,id,software){
 const make=(name,color)=>{
  const material=renderer.mat(id+':venue-'+name,color);
  material.side=T.DoubleSide;
  return material;
 };
 const lamp=make('light',0xfff3d8);
 lamp.emissive.setHex(0xfff3d8);lamp.emissiveIntensity=1;
 const fabric=make('ceiling',software?0x20262b:0xffffff);
 fabric.vertexColors=true;fabric.emissive.setHex(0x101719);fabric.emissiveIntensity=.20;
 return {
  steel:make('steel',0x818a89),shadow:make('shadow',0x222730),lamp,fabric,
  concrete:make('concrete',0xa5a7a7),steps:make('stairs',0xb5b9bb),canvas:make('black vision',0x11161d),
  seats:make('seat base',id==='dome'?0x973550:0x8d9397),blue:make('blue seats',0x236795),
  instance:make('instances',0xffffff),cable:make('steel lattice',0x818988),
  eye:make('eye',id==='dome'?0x226849:0x191b20),
  dugoutRoof:id==='dome'?make('red dugout roof',0xa93849):null,
  fallbackCable:renderer.taipeiFallbackCable??=new T.LineBasicMaterial({color:0xa2a7a6})
 };
}

function standsSection(group,name,materials,config,software){
 const {start,end,width,depth,floor,rows,run,rise,palette,concourse,attendance=0,shirts=[]}=config;
 const chairs=[],crowd=[],profile=[[width,depth,floor]];
 for(let row=1;row<=rows;row++){
  profile.push([width+row*run,depth+row*run,floor+(row-1)*rise],
   [width+row*run,depth+row*run,floor+row*rise]);
 }
 const sections=Math.max(2,Math.round((end-start)*7)),segments=sections*(software?4:6);
 strip(group,name,config.base??materials.seats,profile,start,end,segments);
 strip(group,'Stadium terrace facade',materials.concrete,[[width,depth,floor-.89],[width,depth,floor+.09]],start,end,segments);
 if(concourse){
  const w=width+rows*run,d=depth+rows*run,y=floor+rows*rise;
  strip(group,'Terrace top concourse',materials.concrete,[[w,d,y],[w+2.4,d+2.4,y]],start,end,segments);
  strip(group,'Concrete parapet',materials.concrete,[[w+2.4,d+2.4,y],[w+2.4,d+2.4,y+.82]],start,end,segments);
 }
 for(let section=0;section<sections;section++){
  const a=start+(end-start)*section/sections,b=start+(end-start)*(section+1)/sections;
  const stair=profile.map(([w,d,y])=>[w-.023,d-.023,y+.033]);
  strip(group,'White stepped aisles',materials.steps,stair,a,a+.022,1);
  const n=software?6:18;
  for(let row=0;row<rows;row+=software?2:1)for(let i=0;i<n;i++){
   const angle=a+.024+(b-a-.03)*(i+.5)/n,r=(row+.67)*run;
   const seed=17+section*601+row*1013+i*73;
   const color=palette[Math.floor(varying(seed)*palette.length)];
   chairs.push({point:bowlPoint(angle,width+r,depth+r,floor+row*rise+.33),
    size:[software?1.38:.61,.49,.18],angle,color});
   if(shirts.length&&varying(seed+119)<attendance){
    const y=floor+row*rise,top=shirts[Math.floor(varying(seed+241)*shirts.length)];
    crowd.push({point:bowlPoint(angle,width+r-.24,depth+r-.24,y+.64),
     size:[software?.57:.43,.60,.31],angle,color:top});
    if(!software)crowd.push({point:bowlPoint(angle,width+r-.27,depth+r-.27,y+1.02),
     size:[.24,.27,.24],angle,color:varying(seed+617)>.36?0xc1947b:0x9c6f58});
   }
  }
 }
 boxBatch(group,name+' seat rows',chairs,materials.instance);
 if(crowd.length)boxBatch(group,name+' spectators',crowd,materials.instance);
}

function flatVision(group,renderer,materials,{name,x,y,z,width,height,angle=0,dark=false,variant='main'}){
 const cabinet=new T.Group();cabinet.name=name;cabinet.position.set(x,y,z);cabinet.rotation.y=angle;group.add(cabinet);
 mesh(cabinet,'LED steel cabinet',new T.BoxGeometry(width+.70,height+.70,1.1),materials.shadow);
 const glass=dark?materials.canvas:venueVision(renderer,renderer.parkKey,variant).material;
 const screen=mesh(cabinet,dark?'Inactive LED surface':'Live stadium vision',new T.PlaneGeometry(width,height),glass);
 screen.position.z=-.58;
 // Canvas sorts by triangle-centre depth; keep both halves above the cabinet.
 if(renderer.gl.isSoftwareRenderer)screen.renderOrder=3;
}

function decorateTaipei(renderer,park,group,materials,software){
 roof(group,park,materials,software);
 const gray=[0xeeeeec,0xd5d6d4,0xbfc4c5,0xe2e0db,0x3f4349,0x555b60,0x8a8e94];
 for(const [start,end] of [[.16,Math.PI],[Math.PI,TAU-.16]]){
  standsSection(group,'Taipei lower mosaic seating',materials,
   {start,end,width:87,depth:78,floor:3.65,rows:9,run:.94,rise:.46,palette:gray,concourse:true},software);
 }
 for(const [start,end] of [[.17,1.02],[1.19,Math.PI],[Math.PI,TAU-1.19],[TAU-1.02,TAU-.17]]){
  standsSection(group,'Taipei gray and white upper seating',materials,
   {start,end,width:99,depth:88,floor:11.65,rows:12,run:.97,rise:.62,palette:gray,concourse:true},software);
 }
 const arc=(name,mat,profile,a=-Math.PI,b=Math.PI)=>
  strip(group,name,mat,profile,a,b,software?48:108);
 arc('Taipei enclosed concourse below the roof',materials.concrete,[[113,105,22],[125,125,37.7]]);
 arc('Taipei long white balcony fascia',materials.steps,[[111,102,19.1],[111,102,22]]);
 arc('Taipei black suite band',materials.shadow,[[110,101.4,17.8],[110,101.4,19.3]]);
 arc('Taipei center field batter’s eye',materials.eye,[[88,78,3.55],[88,78,10.2]],-.165,.165);
 flatVision(group,renderer,materials,{name:'Taipei centralized main vision',x:0,y:27.1,z:149,width:27.5,height:15.45});
 for(const side of [-1,1]){
  const tower=bowlPoint(side*1.02,111,103,13.2);
  const [x,y,z]=tower;
  boxBatch(group,'Taipei structural suites',[{point:tower,size:[13,17,6],angle:side*1.02}],materials.concrete);
  flatVision(group,renderer,materials,{name:'Taipei auxiliary outfield display',x:x-side*2.6,y:y-.3,z:z-2.3,
   angle:side*1.02,width:11,height:6.6,dark:true});
 }
 dugouts(group,materials);
 addGlints(renderer,group,lighting(group,materials,software,128,40));
}

function decorateTaoyuan(renderer,group,materials,software){
 const red=[0xa52858,0xb73560,0xc0376d,0xdc5483,0xac3151];
 const blue=[0x216fa9,0x2b83bb,0x3694ce,0x236899];
 for(const side of [-1,1]){
  const segment=(a,b)=>side>0?[a,b]:[-b,-a];
  for(const [a,b,rise] of [[.17,.60,.47],[.63,1.42,.62]]){
   const [start,end]=segment(a,b);
   standsSection(group,'Taoyuan rose outfield pavilions',materials,
    {start,end,width:87,depth:76,floor:3.2,rows:14,run:1.03,rise,palette:red,concourse:true},software);
  }
  const [start,end]=segment(1.49,Math.PI);
  standsSection(group,'Taoyuan sky blue infield stands',materials,
   {start,end,width:75,depth:71,floor:2.55,rows:20,run:1.05,rise:.61,palette:blue,base:materials.blue,concourse:true},software);
  const [s,e]=segment(1.65,2.52);
  standsSection(group,'Taoyuan red field-level seating',materials,
   {start:s,end:e,width:68,depth:66,floor:1.24,rows:5,run:.91,rise:.35,palette:red},software);
  const x=side*34,z=137;
  flatVision(group,renderer,materials,{name:side<0?'Taoyuan left field vision':'Taoyuan right field vision',
   x,y:16.4,z,width:33,height:16.8,angle:side*.18});
  boxBatch(group,'Taoyuan vision support columns',[-9,9].map(offset=>({point:[x+offset,4.5,z],size:[1.15,9,1.7]})),materials.shadow);
  if(side<0)parkSign(group,'樂天桃園棒球場',[x,26.1,z-.72],27,2.4,'#fff0ef','#542038').rotation.y=side*.18;
 }
 strip(group,'Taoyuan open center-field batter’s eye',materials.eye,[[87.2,76,0],[87.2,76,7.3]],-.17,.17,16);
 const skyline=[];
 for(let i=0;i<20;i++){
  const x=-142+i*15,level=4+varying(i*39+17)*15;
  skyline.push({point:[x,level/2,163+varying(i*81+70)*32],
   size:[6+varying(i*389+13)*13,level,6+varying(i*79+29)*10],
   color:i%3===0?0x718598:i%3===1?0xa2a7a8:0x576b78});
 }
 boxBatch(group,'Taoyuan skyline beyond the open outfield',skyline,materials.instance);
 dugouts(group,materials);
}

export function decorateTaiwanPark(renderer,park){
 const group=renderer.parkDecor,software=renderer.gl.isSoftwareRenderer;
 const materials=taiwanMaterials(renderer,park.id,software);
 if(park.id==='taipei-dome')decorateTaipei(renderer,park,group,materials,software);
 else decorateTaoyuan(renderer,group,materials,software);
}

export { bowlPoint, boxBatch, dugouts, flatVision, mesh, parkSign, standsSection, strip, varying };
