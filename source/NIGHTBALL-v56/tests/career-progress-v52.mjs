import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';

globalThis.window=globalThis;
for(const file of ['ratings-data','players','pennant','apbc-data','apbc-candidates','apbc-tournament',
 'derby','game','career-leagues','career-development','career-life','career-extras','squad','career']){
 runInThisContext(readFileSync(new URL('../dist/'+file+'.js',import.meta.url),'utf8'),{filename:file+'.js'});
}
const {careerDashboardHTML}=await import('../dist/career-view.js');
const {NightCareer:C,NightCareerExtras:E,NightCareerLife:Life,NightCareerDevelopment:D}=globalThis;
const render=career=>careerDashboardHTML(career,()=>'', 'next');
const career=new C('進行テスト','青波高校','contact','R','CF');
career.seed='career-progress-v52';
const event=E.followingEvent(career);
assert(event);
assert.match(render(career),/data-story-kind="training"/);
assert(E.resolveEpisode(career,'basic'));
assert.match(render(career),/career-story-recap/);
for(let games=0;career.stage==='school'&&games<32;games++)assert(career.skip());
assert.equal(career.stage,'draft');
assert.equal(career.fixture,null);
const save=JSON.parse(JSON.stringify(career.save()));
const restored=C.restore(save);
assert.match(render(restored),/ドラフト会議/);
assert.match(render(restored),/前回の結果/);
assert.deepEqual(restored.last,save.last);

restored.clubId='owls';
restored.stage='offseason';
assert.match(render(restored),/来季の契約/);
restored.stage='overseas-result';
restored.abroad={id:Object.keys(Life.foreign)[0],phase:'trial',passed:false,stat:D.blank()};
assert.match(render(restored),/キャンプ選考で落選/);
restored.stage='retired';
E.episodes(restored).last=null;
assert.match(render(restored),/現役を引退しました/);

console.log('PASS: career event and recap, saved school-to-draft transition, offseason, overseas result and retirement.');
