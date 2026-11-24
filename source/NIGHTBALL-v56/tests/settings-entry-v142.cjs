// v142: settings entry on the main menu (checker item settings-menu-entry).
// The home screen's only settings入口 used to be the unlabeled gear icon in
// the top bar (34x36px). The utilities row （選手・記録・遊び方） now also has a
// labeled 「設定」 button wired to the same settingsModal(), and the gear icon
// keeps working. The utilities grid moves to 4 columns so all four buttons
// stay on one row at 393px without wrapping or overflowing.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
const arcade = fs.readFileSync(__dirname + '/../dist/arcade.css', 'utf8');

// ---------- the button exists in the home utilities row ----------
const navStart = index.indexOf('class="menu-utilities"');
assert(navStart >= 0, 'home has the utilities nav');
const nav = index.slice(navStart, index.indexOf('</nav>', navStart));
for (const id of ['clubhouse', 'records', 'howto', 'menu-settings']) {
  assert(nav.includes(`id="${id}"`), `utilities row contains #${id}`);
}
const settingsButton = nav.slice(nav.indexOf('id="menu-settings"'));
assert(settingsButton.includes('<svg'), 'settings button carries an icon like its neighbours');
assert(settingsButton.includes('<span>設定</span>'), 'settings button is labeled 設定');
assert(
  nav.indexOf('id="howto"') < nav.indexOf('id="menu-settings"'),
  'settings button sits at the end of the utilities row'
);

// ---------- wiring: both entries open the same settings modal ----------
assert(app.includes("$('menu-settings').onclick=settingsModal"), 'menu settings button opens settingsModal');
assert(app.includes("$('settings').onclick=settingsModal"), 'gear icon still opens settingsModal');
assert(index.includes('id="settings"'), 'gear icon button is still on the page');
const modalFn = app.slice(app.indexOf('function settingsModal()'));
assert(modalFn.slice(0, 30000).includes(",'settings')"), 'settingsModal renders the settings modal');

// ---------- layout: 4 columns so the row does not wrap at 393px ----------
assert(
  arcade.includes('.menu-utilities{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'),
  'utilities grid fits all four buttons in one row'
);

// ---------- v142 version pins ----------
assert(index.includes('./game.js?v=150') && index.includes('./app.js?v=150'), 'index pins move to v142');
assert(sw.includes('nightball-v150-chart-top'), 'SW cache renamed for v142');
assert(sw.includes('./game.js?v=150') && sw.includes('./app.js?v=150'), 'SW precaches the v142 scripts');
assert(index.includes('./arcade.css?v=78'), 'index pin for the changed arcade.css moves');
assert(sw.includes('./arcade.css?v=78'), 'SW precaches the new arcade.css');

console.log('settings-entry-v142: all assertions passed');
