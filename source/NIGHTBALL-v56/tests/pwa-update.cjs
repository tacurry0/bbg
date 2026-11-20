// Regression tests for non-disruptive installed-PWA updates.
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

const source = readFileSync('dist/pwa-update.js', 'utf8');
const sw = readFileSync('dist/sw.js', 'utf8');
const index = readFileSync('dist/index.html', 'utf8');

async function tick() {
  await new Promise(resolve => setImmediate(resolve));
}

async function scenario({controlled = true, playing = false} = {}) {
  const documentHandlers = {};
  const workerHandlers = {};
  const button = {disabled: false, textContent: '', addEventListener(type, fn) {this[type] = fn;}};
  const later = {addEventListener(type, fn) {this[type] = fn;}};
  const banner = {
    hidden: true,
    innerHTML: '',
    setAttribute() {},
    querySelector(selector) {
      if (selector === '[data-pwa-apply]') return button;
      if (selector === '[data-pwa-later]') return later;
      throw Error('Unexpected selector ' + selector);
    }
  };
  const game = {hidden: !playing};
  let mutation = () => {};
  let reloads = 0;
  const registration = {
    waiting: null, installing: null,
    listeners: {},
    addEventListener(type, fn) {this.listeners[type] = fn;},
    async update() {}
  };
  const swApi = {
    controller: controlled ? {} : null,
    addEventListener(type, fn) {workerHandlers[type] = fn;},
    async register() {return registration;}
  };
  const document = {
    readyState: 'complete', hidden: false,
    body: {appendChild() {}},
    createElement() {return banner;},
    getElementById(id) {return id === 'game' ? game : null;},
    addEventListener(type, fn) {documentHandlers[type] = fn;}
  };
  const window = {
    location: {reload() {reloads++;}},
    addEventListener() {},
    setInterval() {},
    setTimeout() {}
  };
  class MutationObserver {
    constructor(fn) {mutation = fn;}
    observe() {}
  }
  vm.runInNewContext(source, {
    window, document, navigator: {serviceWorker: swApi, onLine: true},
    location: {protocol: 'https:'}, MutationObserver
  });
  await tick();
  return {
    registration, banner, button, later, game,
    get reloads() {return reloads;},
    async poll() {documentHandlers.visibilitychange(); await tick();},
    menu() {game.hidden = true; mutation();},
    match() {game.hidden = false; mutation();},
    controlChanged() {workerHandlers.controllerchange();}
  };
}

(async () => {
  const active = await scenario();
  active.registration.waiting = {postMessage(message) {
    assert.equal(message.type, 'SKIP_WAITING');
    active.controlChanged();
  }};
  await active.poll();
  assert.equal(active.banner.hidden, false, 'an installed update is offered in the menu');
  active.match();
  assert.equal(active.banner.hidden, true, 'the update cannot cover a live match');
  assert.equal(active.reloads, 0, 'the ongoing match is never reloaded');
  active.menu();
  assert.equal(active.banner.hidden, false, 'update prompt returns after leaving game view');
  active.button.click();
  assert.equal(active.reloads, 1, 'one click activates the waiting worker and reloads once');

  const postponed = await scenario();
  postponed.registration.waiting = {postMessage() {}};
  await postponed.poll();
  postponed.later.click();
  assert.equal(postponed.banner.hidden, true, 'the notice can be dismissed');

  const firstInstall = await scenario({controlled: false});
  firstInstall.registration.waiting = {postMessage() {}};
  await firstInstall.poll();
  assert.equal(firstInstall.banner.hidden, true, 'first-time installation does not ask to update');

  assert(index.includes('./pwa-update.js?v=1'));
  assert(index.includes('./pwa-update.css?v=1'));
  assert(index.includes('./app.js?v=85'));
  assert(sw.includes('./pwa-update.js?v=1'));
  assert(sw.includes('./pwa-update.css?v=1'));
  assert(sw.includes('./stadium3d.js?v=77'));
  assert(sw.includes('./app.js?v=85'));
  assert(sw.includes("'SKIP_WAITING'"));
  assert(!/self.addEventListener\('install',[^\n]*skipWaiting/.test(sw), 'install must not replace an active match');
  assert(!/caches\.delete\([^)]*localStorage/.test(sw));
  console.log('PASS: PWA update detection, menu-only prompt, one-tap activation and match deferral');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
