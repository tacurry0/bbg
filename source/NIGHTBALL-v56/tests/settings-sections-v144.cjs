// v227 supersedes the single v144 settings accordion. Keep the
// accordion invariants; the per-scope content/behaviour is exercised by
// settings-mode-v227.cjs (run separately by the Node test workflow).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dist=path.resolve(__dirname,'../dist'),read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const app=read('app.js'),css=read('settings-mode.css');
assert(app.includes('const settingsSectionState={home:{},match:{},online:{}};'),'independent session-only accordion state');
assert(app.includes('state[id]=!state[id]')&&app.includes("b.setAttribute('aria-expanded',String(open))")&&app.includes('body.hidden=!open'));
assert(app.includes('if(b.dataset.settingsSection){toggleSettingsSection(b);return;}'));
assert(!app.includes("localStorage.setItem('nightball.settingsSections'"));
assert(css.includes('min-height: 50px')&&css.includes('.settings-section-body[hidden] { display: none; }'));
assert(app.includes("['game','ゲーム',gameDefaults]")&&app.includes("['system','システム',system]"));
assert(app.includes("['speed','プレイ速度',speed]")&&app.includes("['running','走塁方式',running]"));
console.log('PASS: separate home and match accordions, retained toggle semantics, tap targets and session-only state');
