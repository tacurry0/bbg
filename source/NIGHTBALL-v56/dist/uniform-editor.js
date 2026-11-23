/* Uniform colour editor (v120): per-club colour overrides in localStorage.
   An override recolours the shared club object's color/accent, which is
   exactly what the badge UI, the score marks and the 3D kit materials
   read, so applying here recolours every surface at once. Originals are
   captured before the first override so a club can always be reset. */
(()=>{
'use strict';
const KEY='nightball.uniforms';
const HEX=/^#[0-9a-fA-F]{6}$/;
const valid=v=>typeof v==='string'&&HEX.test(v);
const PRESETS=['#d23b2e','#1f6fd0','#1d9e75','#f2b01e','#7a4fd0','#e86aa8','#22262b','#f2f5df'];
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),out={};
  for(const [id,o] of Object.entries(raw||{})){
   const e={};
   if(valid(o?.color))e.color=o.color.toLowerCase();
   if(valid(o?.accent))e.accent=o.accent.toLowerCase();
   if(e.color||e.accent)out[id]=e;
  }
  return out;
 }catch{return {};}
}
function save(map){try{localStorage.setItem(KEY,JSON.stringify(map||{}));}catch{}}
const originals={};
function apply(clubs,map){
 for(const club of clubs||[]){
  if(!club||!club.id)continue;
  if(!(club.id in originals))originals[club.id]={color:club.color,accent:club.accent};
  const o=(map||{})[club.id];
  club.color=o?.color||originals[club.id].color;
  club.accent=o?.accent||originals[club.id].accent;
 }
}
window.NightUniforms={KEY,valid,load,save,apply,PRESETS,originals:()=>({...originals})};
})();
