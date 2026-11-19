import * as T from './vendor/three.module.min.js';

export const GAME_LIGHTING_OPTIONS=[
 ['auto','球場標準'],
 ['day','デイゲーム'],
 ['night','ナイター']
];

export function gameLightingMode(value){
 return value==='day'||value==='night'?value:'auto';
}

export function usesDayLight(park){
 return !!park.school||['sky','brick','toyama','taoyuan'].includes(park.theme||park.id);
}

const AUTO_SKIES={
 night:{canvas:['#465c83','#8495ae','#e8c6a2'],zenith:0x657b9c,horizon:0xe3c7ad,fog:0xa9a8ae,density:.00185},
 brick:{canvas:['#2d65ab','#6cabe2','#c5ddef'],zenith:0x2a62ae,horizon:0xaad0e6,fog:0x9fbed4,density:.00165},
 sky:{canvas:['#6394be','#b2cde0','#e8dfd1'],zenith:0x688eaf,horizon:0xe3e4dc,fog:0xc5c8c2,density:.00165},
 harbor:{canvas:['#5f748f','#9cafd0','#d4dbe4'],zenith:0x697f9d,horizon:0xd4dbe4,fog:0xacb7c6,density:.00185},
 river:{canvas:['#35628c','#749ab8','#c0c6bb'],zenith:0x4e759e,horizon:0xc3c7bf,fog:0x9aaebc,density:.00195},
 toyama:{canvas:['#3978ad','#90b9d8','#dde8e6'],zenith:0x3978ad,horizon:0xd8e7ef,fog:0xb6ccda,density:.00145}
};
const DAY_SKY={canvas:['#3476bd','#72b1de','#d1e7f5'],zenith:0x3476bd,horizon:0xc5dff3,fog:0xb1cadd,density:.0023};
const NIGHT_SKY={canvas:['#060f24','#142644','#355173'],zenith:0x050c23,horizon:0x253f62,fog:0x253d57,density:.0031};

function applyTurfLighting(renderer,park,night){
 const sampled=!park.school&&park.turf!==undefined;
 const nightSample=night?park.turfNight:undefined;
 const illumination=sampled&&night&&!nightSample ? .86 : 1;
 const turf=renderer.grassMaterial.color;
 turf.setHex(nightSample??park.turf??0x487e4d).multiplyScalar(illumination);
 const near=sampled?new T.Color(nightSample??park.turfNear??park.turf).multiplyScalar(illumination):null;
 renderer.scene.userData.turfNear=near;
 if(renderer.grassUniforms){
  renderer.grassUniforms.uPhotoTurf.value=sampled?1:0;
  renderer.grassUniforms.uTurfNear.value.copy(near??turf);
 }
}

export function applyParkLighting(renderer,park,mode){
 const {scene,sky,skyLight,keyLight,rimLight}=renderer;
 const indoor=park.theme==='dome',tokyo=park.id==='tokyo-dome';
 const auto=mode==='auto',day=auto?usesDayLight(park):mode==='day';
 const named=auto?AUTO_SKIES[park.id]:null;
 const outdoor=auto?named:day?DAY_SKY:NIGHT_SKY;
 applyTurfLighting(renderer,park,mode==='night'||(auto&&!indoor&&!day));
 renderer.lightingMode=mode;
 renderer.canvas.dataset.gameLighting=mode;
 if(!indoor&&outdoor)scene.userData.outdoorSky=outdoor.canvas;
 else delete scene.userData.outdoorSky;
 scene.userData.nightLighting=!auto&&!day;
 scene.userData.indoors=indoor;
 scene.userData.broadcastDome=tokyo;
 scene.fog.density=indoor?(tokyo?.0009:.0011):outdoor?.density??(park.theme==='taoyuan'?.0019:.0036);
 scene.fog.color.setHex(indoor?(auto?tokyo?0x656b66:0x2b3e52:day?0x748688:0x334255):outdoor?.fog??(day?0xb4d8ea:0x0c1b31));
 scene.background.setHex(indoor?(auto?0x455c6d:day?0x526778:0x202e45):outdoor?.horizon??(day?0x8ab9d4:0x081326));
 if(sky){
  sky.visible=!indoor;
  const uniforms=sky.material.uniforms;
  uniforms.zenith.value.setHex(outdoor?.zenith??(day?0x2d6da6:0x050e22));
  uniforms.horizon.value.setHex(outdoor?.horizon??(day?0xbbe0f2:0x1c3a59));
  uniforms.uNight.value=day||named?0:1;
  uniforms.uRural.value=(park.school||['brick','toyama','river'].includes(park.theme))?1:0;
 }

 if(indoor){
  skyLight.intensity=auto?(tokyo?1.92:1.87):day?2.30:1.27;
  skyLight.color.setHex(auto?(tokyo?0xf7f4ed:0xf6f0e7):day?0xe8f7fc:0xb8d1fa);
  keyLight.intensity=auto?(tokyo?2.63:2.72):day?2.86:3.48;
  keyLight.color.setHex(auto?(tokyo?0xfff5e6:0xfff5df):day?0xfff8ee:0xe7efff);
  const roofLighting=renderer.parkDecor.getObjectByName('Roof-edge LED lamps')?.material;
  if(roofLighting)roofLighting.emissiveIntensity=auto?(tokyo?1.05:1):day?.80:1.55;
 }else{
  skyLight.intensity=day?2.25:auto?1.62:1.17;
  skyLight.color.setHex(day||auto?0xd7e9ff:0xa7c4ec);
  keyLight.intensity=day?3.48:auto?3.42:3.68;
  keyLight.color.setHex(day?0xffedcb:auto?0xfff2dd:0xf1f4ff);
 }
 rimLight.intensity=indoor?.78:day?.52:1.15;
 rimLight.color.setHex(day?0xdff2ff:0x8eceff);
 renderer.lightsLit=!day&&!indoor;
 for(const glow of renderer.lightGlows)glow.visible=renderer.lightsLit;
 for(const beam of renderer.lightBeams)beam.visible=renderer.lightsLit;
 renderer.bulbMat.color.setHex(renderer.lightsLit?0xfff9e2:0xbfcbd2);
 scene.userData.staticRevision=(scene.userData.staticRevision||0)+1;
}
