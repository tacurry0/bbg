const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),version=Number(fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
const ctx={NightballMessages:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'dist/release-notes.js'),'utf8'),ctx);
const rows=ctx.NightballReleases;assert(Array.isArray(rows)&&rows.length,'Release notes are required');
assert.equal(rows[0].version,version,'Add newest release note matching VERSION before deployment');
for(let i=0;i<rows.length;i++){const r=rows[i];assert(r.title&&r.detail&&Array.isArray(r.items));if(i)assert(rows[i-1].version>r.version);for(const s of ['v'+r.version+' '+r.title,r.detail,...r.items])assert(ctx.NightballMessages[s]?.every(Boolean),'Missing translations: '+s);}
for(const file of ['index.html','sw.js'])assert(fs.readFileSync(path.join(root,'dist',file),'utf8').includes('release-notes.js?v='+version),'Bump release notes URL in '+file);
console.log('Release notes v'+version+' verified');
