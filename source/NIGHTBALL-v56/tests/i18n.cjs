const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dist = path.join(__dirname, '../dist');
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');

function fixture(storedLanguage) {
  let onMutations;
  const root = {lang: 'ja', nodeType: 1, matches: () => false, getAttribute: () => null, childNodes: []};
  const context = vm.createContext({
    document: {documentElement: root, querySelectorAll: () => []},
    Node: {ELEMENT_NODE: 1, TEXT_NODE: 3},
    MutationObserver: class {
      constructor(callback) { onMutations = callback; }
      observe() {}
      disconnect() {}
    },
    localStorage: {getItem: () => JSON.stringify({language: storedLanguage})}
  });
  vm.runInContext(read('i18n-catalog.js'), context);
  vm.runInContext(read('i18n.js'), context);
  const container = {nodeType: 1, isConnected: true, closest: () => null};
  const textNode = {nodeType: 3, data: '対戦', parentNode: container, parentElement: container};
  root.childNodes.push(textNode);
  return {
    root,
    textNode,
    messages: context.NightballMessages,
    i18n: context.NightI18n,
    update(value) {
      textNode.data = value;
      onMutations([{type: 'characterData', target: textNode}]);
    }
  };
}

const {i18n, root, messages, textNode, update} = fixture('unknown');
assert.equal(root.lang, 'ja');
assert.equal(i18n.text('スライダー'), 'スライダー');
assert.equal(i18n.setLanguage('zh-TW'), 'zh-TW');
assert.equal(root.lang, 'zh-TW');
assert.equal(textNode.data, '對戰');
assert.equal(i18n.text('スライダー'), '滑球');
assert.equal(i18n.text('12回ウラ'), '12 局下');
update('次の試合');
assert.equal(textNode.data, '下一場比賽');
assert.equal(i18n.setLanguage('ko'), 'ko');
assert.equal(root.lang, 'ko');
assert.equal(textNode.data, '다음 경기');
assert.equal(i18n.text('スライダー'), '슬라이더');
assert.equal(i18n.text('12回ウラ'), '12회 말');
assert.equal(i18n.text('山田 太郎'), '山田 太郎');
i18n.setLanguage('ja');
assert.equal(textNode.data, '次の試合');
assert.equal(fixture('ko').i18n.language, 'ko');

const slots = message => [...message.matchAll(/\{(\d+)\}/g)].map(match => match[1]).sort();
for (const [source, locales] of Object.entries(messages)) {
  assert.equal(locales.length, 2, source);
  for (const translated of locales) {
    assert(translated, source);
    assert.deepEqual(slots(translated), slots(source), source);
  }
}
for (const file of ['i18n-catalog.js?v=1', 'i18n.js?v=1']) {
  assert(read('index.html').includes(file));
  assert(read('sw.js').includes(file));
}
console.log('PASS: locale switching, dynamic text, interpolation, original labels, and offline assets');
