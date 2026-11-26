/* Uniforms v228. Regular-season-inspired kit data; separate home/away cuts,
   with backwards compatible localStorage club-colour overrides. */
(()=>{
'use strict';
const KEY='nightball.uniforms';
const HEX=/^#[0-9a-fA-F]{6}$/;
const valid=v=>typeof v==='string'&&HEX.test(v);
const hex=(v,fallback='#ffffff')=>valid(v)?v.toLowerCase():typeof v==='string'&&/^#[0-9a-f]{3}$/i.test(v)?'#'+[...v.slice(1)].map(x=>x+x).join('').toLowerCase():fallback;
const PRESETS=['#d23b2e','#1f6fd0','#1d9e75','#f2b01e','#7a4fd0','#e86aa8','#22262b','#f2f5df'];
const COLORS=['shirt','pants','cap','visor','helmet','trim','letters','outline','number','stripe','socks'];
const PATTERNS=['plain','pinstripe','contrast','panel','chevron'];
const fields=['wordmark','capMark','pattern','frontNumber','font'];
const WHITE='#f5f5f3', GREY='#c8cbd0', BLACK='#161922', NAVY='#14263e', GOLD='#e7b82c';
// Each entry describes regular home & road looks, not exact manufacturer artwork.
// [cap, trim, home jersey, road jersey, home lettering, road lettering, cap initials, home pattern, away pattern, road pants, home letters, road letters, visor]
const DATA={
 owls:['#14263e','#14263e','#f7c516','#202b3c','Brothers','Brothers','B','plain','plain',WHITE,NAVY,'#f7c516','#f7c516'],
 foxes:['#c51b30','#c51b30',WHITE,'#c51b30','Dragons','Dragons','W','plain','plain',WHITE,'#c51b30',WHITE],
 falcons:[BLACK,'#ed731a',WHITE,'#25292e','Lions','Lions','UL','contrast','contrast',WHITE,BLACK,'#ef7926'],
 mariners:['#063c78','#1265b1',WHITE,'#075aa5','Guardians','Fubon','G','plain','plain',WHITE,'#09549f',WHITE],
 wolves:['#74142e','#74142e',WHITE,'#74142e','Rakuten','Rakuten','R','plain','plain',WHITE,'#74142e',WHITE],
 comets:['#145c45','#145c45',WHITE,'#14634c','Hawks','TSG','H','plain','plain',WHITE,'#145c45',WHITE],
 'npb-g':[BLACK,'#e86c21',WHITE,GREY,'GIANTS','TOKYO','YG','plain','plain',GREY,BLACK,BLACK],
 'npb-db':['#0966a9','#0966a9',WHITE,'#0860b1','BAYSTARS','YOKOHAMA','B','pinstripe','chevron',WHITE,'#0757a2',WHITE],
 'npb-t':[BLACK,GOLD,WHITE,GREY,'Tigers','HANSHIN','HT','pinstripe','pinstripe',GREY,BLACK,BLACK],
 'npb-c':['#c3132b','#c3132b',WHITE,'#c3132b','Carp','Hiroshima','C','plain','plain',WHITE,'#c3132b',WHITE],
 'npb-d':['#0753a5','#0753a5',WHITE,'#1555aa','Dragons','CHUNICHI','CD','plain','plain',GREY,'#0753a5',WHITE],
 'npb-s':[NAVY,'#8bc745',WHITE,NAVY,'Swallows','Yakult','YS','pinstripe','plain',GREY,NAVY,WHITE],
 'npb-h':[BLACK,'#efc600',WHITE,BLACK,'SoftBank','SoftBank','Sh','plain','plain',WHITE,BLACK,WHITE],
 'npb-f':['#174b83','#278fca',WHITE,'#228dcc','FIGHTERS','HOKKAIDO','F','panel','panel',WHITE,'#174b83',WHITE],
 'npb-e':['#981739','#981739',WHITE,'#981739','Rakuten','RAKUTEN','E','plain','plain',GREY,'#981739',WHITE],
 'npb-m':[BLACK,BLACK,WHITE,BLACK,'Marines','MARINES','M','pinstripe','plain',WHITE,BLACK,WHITE],
 'npb-b':[NAVY,'#b99a50',WHITE,NAVY,'Buffaloes','ORIX','B','plain','plain',GREY,NAVY,WHITE],
 'npb-l':['#132c4e','#132c4e',WHITE,'#182e53','Lions','SEIBU','L','plain','plain',GREY,'#132c4e',WHITE],
 'npb-a':[BLACK,'#e66a21',WHITE,BLACK,'Oisix','NIIGATA','O','plain','contrast',WHITE,BLACK,WHITE],
 'npb-v':[NAVY,'#e0b332',WHITE,NAVY,'HAYATE','HAYATE','H','plain','plain',GREY,NAVY,WHITE],
 'kbo-ht':[BLACK,'#c71f39',WHITE,'#c51b34','TIGERS','KIA','T','plain','plain',WHITE,'#c51b34',WHITE,'#c51b34'],
 'kbo-ss':['#1259ab','#1259ab',WHITE,'#135bb3','Lions','SAMSUNG','SL','plain','plain',WHITE,'#1259ab',WHITE],
 'kbo-lg':[BLACK,'#bd1838',WHITE,BLACK,'TWINS','LG TWINS','LG','pinstripe','plain',WHITE,BLACK,WHITE],
 'kbo-ob':[NAVY,'#b81939',WHITE,NAVY,'BEARS','DOOSAN','D','plain','plain',WHITE,NAVY,WHITE],
 'kbo-kt':[BLACK,'#d11e33',WHITE,BLACK,'wiz','KT wiz','KT','plain','plain',WHITE,BLACK,WHITE],
 'kbo-sk':['#ba1730','#ba1730',WHITE,'#ba1730','LANDERS','SSG','L','plain','plain',WHITE,'#ba1730',WHITE],
 'kbo-lt':[NAVY,'#d82d37',WHITE,NAVY,'Giants','LOTTE','G','plain','plain',GREY,NAVY,WHITE],
 'kbo-hh':[BLACK,'#f47721',WHITE,'#f47721','Eagles','HANWHA','H','contrast','plain',WHITE,BLACK,BLACK],
 'kbo-nc':[NAVY,'#b49a63',WHITE,NAVY,'Dinos','NC DINOS','NC','plain','plain',GREY,NAVY,WHITE],
 'kbo-wo':['#781433','#781433',WHITE,'#781433','HEROES','KIWOOM','K','plain','plain',WHITE,'#781433',WHITE],
 'apbc-japan':[NAVY,'#be172d',WHITE,NAVY,'JAPAN','JAPAN','J','pinstripe','plain',GREY,NAVY,WHITE],
 'apbc-taipei':['#123c75','#d5253b',WHITE,'#172f50','TAIWAN','TAIWAN','CT','plain','plain',WHITE,'#123c75',WHITE],
 'apbc-korea':['#1359ab','#1359ab',WHITE,'#1459a6','KOREA','KOREA','K','plain','plain',GREY,'#1359ab',WHITE],
 'apbc-australia':['#125347','#d8b331',WHITE,'#125347','AUSTRALIA','AUSTRALIA','A','plain','plain',WHITE,'#125347',WHITE]
};
function cleanKit(o){
 const e={};if(!o||typeof o!=='object')return e;
 for(const k of COLORS)if(valid(o[k]))e[k]=hex(o[k]);
 if(PATTERNS.includes(o.pattern))e.pattern=o.pattern;
 for(const k of ['wordmark','capMark'])if(typeof o[k]==='string')e[k]=o[k].replace(/[\u0000-\u001f<>]/g,'').slice(0,k==='capMark'?4:22);
 if(typeof o.frontNumber==='boolean')e.frontNumber=o.frontNumber;
 if(['block','script'].includes(o.font))e.font=o.font;
 return e;
}
function cleanOverride(o){
 const e={};if(!o||typeof o!=='object')return e;
 for(const k of ['color','accent'])if(valid(o[k]))e[k]=hex(o[k]);
 for(const side of ['home','away']){const kit=cleanKit(o[side]);if(Object.keys(kit).length)e[side]=kit;}
 return e;
}
function load(){
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),out={};for(const [id,o] of Object.entries(raw||{})){if(!/^[\w-]+$/.test(id)||['__proto__','constructor','prototype'].includes(id))continue;const e=cleanOverride(o);if(Object.keys(e).length)out[id]=e;}return out;}catch{return {};}
}
function save(map){try{localStorage.setItem(KEY,JSON.stringify(map||{}));}catch{}}
const originals=Object.create(null);
const overrides=Object.create(null);
let revision=0;
function apply(clubs,map){
 revision++;
 for(const club of clubs||[]){
  if(!club?.id)continue;
  if(!(club.id in originals))originals[club.id]={color:club.color,accent:club.accent};
  const o=cleanOverride(map?.[club.id]);overrides[club.id]=o;
  club.color=o.color||originals[club.id].color;
  club.accent=o.accent||originals[club.id].accent;
 }
}
function defaultKit(club,side){
 const home=side==='home',c=hex(originals[club.id]?.color||club.color,NAVY),a=hex(originals[club.id]?.accent||club.accent,WHITE);
 const d=DATA[club.id]||[c,c,WHITE,c,String(club.mark||club.short||'TEAM'),String(club.mark||club.short||'TEAM'),String(club.mark||'T').slice(0,3),'plain','plain',GREY,c,WHITE];
 const [cap,trim,hs,as,hw,aw,mark,hp,ap,pants,hl,al,visor]=d;
 const letters=home?hl:al;
 return {shirt:home?hs:as,pants:home?WHITE:pants,cap,visor:visor||cap,helmet:cap,trim,letters,outline:letters===WHITE?trim:(letters===BLACK?GOLD:WHITE),number:letters,stripe:club.id==='npb-t'||club.id==='npb-m'||club.id==='kbo-lg'?BLACK:trim,socks:cap,wordmark:home?hw:aw,capMark:mark,pattern:home?hp:ap,frontNumber:true,font:/[a-z]/.test(home?hw:aw)?'script':'block'};
}
function kit(club,side,override){
 const base=defaultKit(club,side),o=override===undefined?overrides[club.id]||{}:cleanOverride(override);
 // Legacy colours used to affect all 3D surfaces. Keep their visible intent.
 const legacy=o.color?{cap:o.color,visor:o.color,helmet:o.color,socks:o.color,trim:o.color,...(side==='home'?{letters:o.color,number:o.color,stripe:o.color}:{shirt:o.color})}:{};
 if(o.accent)Object.assign(legacy,{outline:o.accent,...(side==='away'?{letters:o.accent,number:o.accent,trim:o.accent}:{})});
 return {...base,...legacy,...o[side]};
}
function snapshot(club,side){return kit(club,side);}
function resolvedKit(club,side,wire){const base=kit(club,side);return wire?{...defaultKit(club,side),...cleanKit(wire)}:base;}
window.NightUniforms={KEY,valid,hex,load,save,apply,PRESETS,COLORS,PATTERNS,fields,cleanKit,cleanOverride,defaultKit,kit,snapshot,resolvedKit,revision:()=>revision,originals:()=>({...originals}),hasPreset:id=>!!DATA[id]};
})();
