const assert=require('node:assert/strict');
global.window=global;global.NightCareerWorld={training:{contact:'ミート',power:'パワー',run:'走力',field:'守備',arm:'肩力'}};
require('../dist/career-world-success.js');
const Z=NightCareerWorldSuccess,w={stage:'school',pitching:false,player:{contact:30},perks:[],experience:7,balanceRevision:247,previewImprovement(k,n){return this.player[k]+n*.8},improve(k,n){this.player[k]=this.previewImprovement(k,n)},note(){}};
const s=Z.state(w);assert.equal(s.autoAllocate,false);s.storyMode=true;s.xp.skill=0;Z.syncExperience(w);assert.equal(s.xp.mental,7);assert.equal(w.experience,0);Z.syncExperience(w);assert.equal(s.xp.mental,7);
let p=Z.boostInfo(w,'contact');assert(!p.enabled);assert(p.missing.skill>0);s.xp.skill=100;s.xp.mental=100;p=Z.boostInfo(w,'contact');assert(p.enabled);const before={...s.xp};assert(Z.allocate(w,'contact'));assert.equal(w.player.contact,p.next);for(const [k,n] of Object.entries(p.fees))assert.equal(s.xp[k],before[k]-n);assert(Z.learnPerk(w,'clutch'));assert(w.perks.includes('clutch'));assert(!Z.learnPerk(w,'clutch'));
console.log('PASS wallet migration, upgrade preview and exact fees, perk XP purchase.');
