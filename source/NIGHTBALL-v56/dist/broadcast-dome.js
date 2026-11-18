import * as T from './vendor/three.module.min.js';

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
 const point = (x, z, y = 0) => [x, NightPlayers.roofSurface(park, x, z) + y, z];
 const positions = [], colors = [], triangles = [];
 const rings = software ? 15 : 58, sectors = software ? 52 : 144;
 const fabric = new T.Color(0xe8e2d1);
 for (let row = 0; row <= rings; row++) {
  const r = row / rings;
  for (let column = 0; column <= sectors; column++) {
   const angle = TAU * column / sectors;
   const x = Math.sin(angle) * r * ROOF_RADIUS;
   const z = Math.cos(angle) * r * ROOF_RADIUS;
   const warp = Math.abs(Math.sin(Math.PI * x / CABLE_SPACING));
   const weft = Math.abs(Math.sin(Math.PI * z / CABLE_SPACING));
   const billow = warp * weft, neutral = .82 + .15 * r + .10 * billow;
   positions.push(...point(x, CENTER_Z + z, (.48 * billow - .48) * (1 - r)));
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
 const membrane = mesh(group, 'Tokyo Dome air-supported membrane', geometry, materials.fabric);
 if (software) membrane.renderOrder = -2;

 const cables = [];
 for (const alongZ of [false, true]) {
  const step = software ? CABLE_SPACING * 1.5 : CABLE_SPACING;
  for (let offset = -108; offset <= 108; offset += step) {
   const end = Math.sqrt(ROOF_RADIUS ** 2 - offset ** 2);
   const steps = software ? 22 : 56;
   const points = Array.from({ length: steps + 1 }, (_, i) => {
    const run = -end + 2 * end * i / steps;
    return new T.Vector3(...point(alongZ ? offset : run, CENTER_Z + (alongZ ? run : offset), -.63));
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
  object.name = 'Tokyo Dome crossing roof cables';
  const anchor = new T.Object3D(), up = new T.Vector3(0, 1, 0), d = new T.Vector3();
  cables.forEach(([a, b], i) => {
   d.subVectors(b, a);
   anchor.position.copy(a).lerp(b, .5);
   anchor.scale.set(.135, d.length() + .12, .135);
   anchor.quaternion.setFromUnitVectors(up, d.normalize());
   anchor.updateMatrix();
   object.setMatrixAt(i, anchor.matrix);
  });
  group.add(object);
 }

 const segments = software ? 56 : 112;
 for (const [name, material, profile] of [
  ['Perimeter interior wall', materials.shadow, [[113,113,0],[116,116,ROOF_EDGE]]],
  ['Roof compression ring', materials.steel, [[115,115,ROOF_EDGE],[113.5,113.5,ROOF_EDGE-.5],[113.5,113.5,30.4]]],
  ['Light gallery fascia', materials.shadow, [[112,112,29.3],[112,112,31.3],[114,114,31.7]]]
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

function dugouts(group, materials) {
 const facades = [], caps = [], railings = [], backs = [];
 for (const side of [-1,1]) {
  const angle = side * .76;
  const at = (along, behind, y) => [
   side * 29 + along * Math.sin(angle) + side * behind * Math.cos(angle),
   y,
   14 + along * Math.cos(angle) - behind * Math.sin(.76)
  ];
  facades.push({point:at(0,0,.56),size:[.46,1.12,20.5],angle});
  backs.push({point:at(0,3.55,1.12),size:[.4,2.24,20.5],angle});
  caps.push({point:at(0,2,2.33),size:[4,.23,20.7],angle});
  railings.push({point:at(0,-.12,1.16),size:[.19,.16,20.52],angle});
  for (const end of [-10.15,10.15]) backs.push({point:at(end,1.8,1.13),size:[3.6,2.26,.28],angle});
 }
 boxBatch(group,'Foul-side dugout padding',facades,materials.eye);
 boxBatch(group,'Dugout canopy',caps,materials.concrete);
 boxBatch(group,'Dugout inner walls',backs,materials.shadow);
 boxBatch(group,'Dugout padded rails',railings,materials.steel);
}

function lighting(group, materials, software) {
 const frames = [], lights = [], glints = [];
 const count = software ? 32 : 76;
 for (let i = 0; i < count; i++) {
  const angle = TAU * i / count;
  frames.push({point:bowlPoint(angle,111.6,111.6,30.35),size:[5.5,1.38,.69],angle});
  for (const y of [30.07,30.62]) {
   const bulbs = software ? 3 : 7;
   for (let j = 0; j < bulbs; j++) {
    const a = angle + (j - (bulbs-1)/2) * (software ? .014 : .006);
    lights.push({point:bowlPoint(a,111.04,111.04,y),size:[software?.91:.40,.31,.35],angle});
   }
  }
  if (!software && i % 4 === 1) glints.push(bowlPoint(angle,110.6,110.6,30.39));
 }
 boxBatch(group, 'Roof-edge floodlight housings', frames, materials.shadow);
 boxBatch(group, 'Roof-edge LED lamps', lights, materials.lamp);
 return glints;
}

function visionTexture(software) {
 const canvas = document.createElement('canvas');
 canvas.width = 2048;
 canvas.height = 160;
 const c = canvas.getContext('2d');
 const tint = c.createLinearGradient(0,0,0,160);
 tint.addColorStop(0,'#202c38');
 tint.addColorStop(.47,'#101923');
 tint.addColorStop(1,'#071119');
 c.fillStyle = tint;
 c.fillRect(0,0,2048,160);
 c.fillStyle = '#df8c3c';
 c.fillRect(0,0,2048,5);
 c.fillStyle = '#fff0d1';
 c.textAlign = 'center';
 c.font = '900 98px sans-serif';
 c.fillText('WELCOME TO TOKYO DOME',1024,110,1340);
 if (!software) {
  c.fillStyle = '#04101b35';
  for (let y = 5; y < 160; y += 4) c.fillRect(0,y,2048,1);
 }
 const texture = new T.CanvasTexture(canvas);
 texture.colorSpace = T.SRGBColorSpace;
 return texture;
}

function vision(group, renderer, materials, software) {
 const span = software ? 14 : 52;
 strip(group, 'Center-field batter’s eye', materials.eye, [[107,97,3.9],[107,97,18.5]], -EYE_EDGE,EYE_EDGE,14);
 strip(group, 'Main vision structure', materials.shadow,
  [[108,97,16.8],[108,97,26],[112,101,26],[112,101,16.8]],
  VISION_START-.02,VISION_END+.02,span);
 const texture = visionTexture(software);
 const welcome = new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false,fog:false});
 const welcomeMesh = strip(group, 'Curved 125 m wide main vision', welcome,
  [[107.4,96.4,18.3],[107.4,96.4,25.3]],VISION_START,VISION_END,span);
 welcomeMesh.userData.disposeMaterial = true;
 welcomeMesh.userData.disposeTexture = true;

 strip(group,'Live line score housing',materials.shadow,[[105.2,94.2,10.0],[105.2,94.2,18.6]],-.155,.155,12);
 const display = renderer.tokyoScoreMaterial ||= new T.MeshBasicMaterial({
  map:renderer.boardTexture,side:T.DoubleSide,toneMapped:false,fog:false
 });
 strip(group,'Live line score',display,[[104.8,93.8,10.5],[104.8,93.8,18.25]],-.148,.148,software?2:18);
 for (const [start,end] of [[-.887,-.172],[.172,.887]]) {
  strip(group,'Outfield LED ribbon housing',materials.shadow,
   [[85,76.6,4.10],[85,76.6,5.05]],start,end,24);
  strip(group,'Outfield LED ribbon',materials.ribbon,
   [[84.7,76.3,4.34],[84.7,76.3,4.91]],start,end,24);
 }
}

export function decorateBroadcastDome(renderer, park) {
 const {parkDecor:group,gl,keyLight,skyLight,scene} = renderer;
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
 const glints = lighting(group,materials,software);
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

 skyLight.intensity = 1.92;
 skyLight.color.setHex(0xf7f4ed);
 keyLight.intensity = 2.63;
 keyLight.color.setHex(0xfff5e6);
 scene.fog.density = .0009;
 scene.fog.color.setHex(0x656b66);
 renderer.grassMaterial.color.setHex(0x6f9f45);
}
