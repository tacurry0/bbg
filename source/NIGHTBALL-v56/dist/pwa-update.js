// NIGHTBALL PWA updater: keep match state intact and apply updates only from the menu.
(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;

  const CHECK_INTERVAL = 10 * 60 * 1000;
  let registration = null;
  let banner = null;
  let updateAvailable = false;
  let dismissed = false;
  let applying = false;
  let reloading = false;
  let reloadOnControl = false;
  let hasController = Boolean(navigator.serviceWorker.controller);

  // The game view remains visible during a match, including pause/result screens.
  // Never reload until the player has returned to a non-game screen.
  const inGame = () => {
    const game = document.getElementById('game');
    return Boolean(game && !game.hidden);
  };

  function showNotice() {
    if (!banner) return;
    banner.hidden = !updateAvailable || dismissed || inGame();
    const button = banner.querySelector('[data-pwa-apply]');
    button.disabled = applying;
    button.textContent = applying ? '更新を準備中…' : '更新する';
  }

  function updateReady() {
    if (!hasController) return; // Initial offline installation isn't an app update.
    updateAvailable = true;
    dismissed = false;
    showNotice();
  }

  function reloadWhenSafe() {
    if (reloading || inGame()) return;
    reloading = true;
    // No caches, localStorage, sessionStorage or IndexedDB are deleted.
    window.location.reload();
  }

  function applyUpdate() {
    if (inGame() || !updateAvailable || applying) return;
    const waiting = registration && registration.waiting;
    if (!waiting) {
      reloadWhenSafe(); // Legacy worker may already have taken control.
      return;
    }
    applying = true;
    reloadOnControl = true;
    showNotice();
    try {
      waiting.postMessage({type: 'SKIP_WAITING'});
    } catch (_) {
      applying = false;
      reloadOnControl = false;
      showNotice();
      return;
    }
    // Let the user retry if activation didn't finish (for example while offline).
    window.setTimeout(() => {
      if (!reloading) {
        applying = false;
        showNotice();
      }
    }, 12000);
  }

  function createNotice() {
    banner = document.createElement('section');
    banner.id = 'nightball-update-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `<div class="nightball-update-copy"><strong>新しいNIGHTBALLが利用できます</strong><span>セーブデータはそのまま。試合中は更新を保留します。</span></div><div class="nightball-update-actions"><button type="button" data-pwa-apply>更新する</button><button type="button" data-pwa-later aria-label="更新をあとで行う">あとで</button></div>`;
    banner.querySelector('[data-pwa-apply]').addEventListener('click', applyUpdate);
    banner.querySelector('[data-pwa-later]').addEventListener('click', () => {
      dismissed = true;
      showNotice();
    });
    document.body.appendChild(banner);
    const game = document.getElementById('game');
    if (game && typeof MutationObserver !== 'undefined') {
      new MutationObserver(showNotice).observe(game, {attributes: true, attributeFilter: ['hidden']});
    }
  }

  function watchInstalling(worker) {
    if (!worker) return;
    const check = () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) updateReady();
    };
    worker.addEventListener('statechange', check);
    check();
  }

  async function checkForUpdates() {
    if (!registration || document.hidden || navigator.onLine === false) return;
    try {
      await registration.update();
      if (registration.waiting && navigator.serviceWorker.controller) updateReady();
    } catch (_) {
      // Keep the existing cached game usable when offline or on network failure.
    }
  }

  async function init() {
    createNotice();
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hasController) {
        hasController = true;
        return;
      }
      updateReady();
      if (reloadOnControl) reloadWhenSafe();
    });

    try {
      registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});
      registration.addEventListener('updatefound', () => watchInstalling(registration.installing));
      if (registration.installing) watchInstalling(registration.installing);
      if (registration.waiting && navigator.serviceWorker.controller) updateReady();
      await checkForUpdates();
    } catch (_) {
      // The game works online even if Service Worker registration is unavailable.
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        showNotice();
        checkForUpdates();
      }
    });
    window.addEventListener('focus', checkForUpdates);
    window.addEventListener('online', checkForUpdates);
    window.setInterval(checkForUpdates, CHECK_INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once: true});
  } else {
    init();
  }
})();
