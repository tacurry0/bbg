const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const app = fs.readFileSync(__dirname + '/../dist/app.js', 'utf8');
const sw = fs.readFileSync(__dirname + '/../dist/sw.js', 'utf8');
const homeMenu = fs.readFileSync(__dirname + '/../dist/home-menu.css', 'utf8');

// ---------- the button exists in the home utilities row ----------
const navStart = index.indexOf('class="menu-utilities"');
assert(navStart >= 0, 'home has the utilities nav');
const nav = index.slice(navStart, index.indexOf('</nav>', navStart));
for (const id of ['menu-home', 'clubhouse', 'records', 'menu-trophies', 'menu-settings']) {
  assert(nav.includes(`id="${id}"`), `utilities row contains #${id}`);
}
const settingsButton = nav.slice(nav.indexOf('id="menu-settings"'));
assert(settingsButton.includes('<svg'), 'settings button carries an icon like its neighbours');
assert(settingsButton.includes('<span>設定</span>'), 'settings button is labeled 設定');
assert(
  nav.indexOf('id="menu-trophies"') < nav.indexOf('id="menu-settings"'),
  'settings button sits at the end of the utilities row'
);

// ---------- wiring: both entries open the same settings modal ----------
assert(app.includes("$('menu-settings').onclick=settingsModal"), 'menu settings button opens settingsModal');
assert(app.includes("$('settings').onclick=settingsModal"), 'gear icon still opens settingsModal');
assert(index.includes('id="settings"'), 'gear icon button is still on the page');
const modalFn = app.slice(app.indexOf('function settingsModal()'));
assert(modalFn.slice(0, 30000).includes(",'settings')"), 'settingsModal renders the settings modal');

// ---------- layout: five bottom navigation buttons ----------
assert(
  homeMenu.includes('.menu-utilities {\n  display: grid;\n  grid-template-columns: repeat(5, minmax(0, 1fr))'),
  'utilities grid fits all five buttons in one row'
);

// ---------- v142 version pins ----------
assert(index.includes('./game.js?v=193') && index.includes('./app.js?v=193'), 'index pins move to v142');
assert(sw.includes('nightball-v193-derby-bracket'), 'SW cache renamed for v142');
assert(sw.includes('./game.js?v=193') && sw.includes('./app.js?v=193'), 'SW precaches the v142 scripts');
assert(index.includes('./home-menu.css?v=2'), 'index loads the home menu stylesheet');
assert(sw.includes('./home-menu.css?v=2'), 'SW precaches the home menu stylesheet');

console.log('settings-entry-v142: all assertions passed');
