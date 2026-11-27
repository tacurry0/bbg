const CACHE='nightball-v241-real-field';
const FILES=['./utility-pages.css?v=234','./uniform-render.js?v=228','./uniform-editor.css?v=228','./settings-mode.css?v=227','./nightball-brand.css?v=236','./assets/menu/nightball-logo-v226.png','./custom-park3d.js?v=219','./stadium-editor.css?v=219','./i18n-catalog.js?v=228','./match-ui.css?v=211','./pregame.css?v=235','./release-notes.js?v=241','./i18n.js?v=1','./opening-lineups-2026.js?v=198','./batting-expansion-2026.js?v=197','./pitching-expansion-2026.js?v=196','./abs-review.js?v=3','./abs.css?v=9','./verdict-vision.css?v=233','./half-break.css?v=224','./pwa-update.js?v=2','./pwa-update.css?v=1','./tokyo-nightball.js','./tokyo-model.js','./career-world.css?v=90','./career-world-data.js?v=79','./career-world-identities.js?v=80','./career-world-leagues.js?v=80','./career-world-international.js?v=80','./career-world-school.js?v=80','./career-world-match.js?v=90','./career-world-save.js?v=78','./career-world-success.js?v=90','./career-world.js?v=91','./career-world-slots.js?v=90','./career-world-view.js?v=90','./pro-parks.js?v=74','./league-editor.js?v=1','./share-codes.js?v=219','./stadium-editor.js?v=219','./uniform-editor.js?v=228','./match-presets.js?v=3','./random-roster.js?v=1','./scrimmage.js?v=1','./time-attack.js?v=1','./survival.js?v=1','./record-room.js?v=1','./bullpen.js?v=1','./draft-battle.js?v=1','./conquest.js?v=1','./pro-stadiums.js?v=75','./game-lighting.js?v=74','./stadium-fx.js?v=205','./game-hud.js?v=76','./game-hud.css?v=239','./menu-polish.css?v=58','./home-menu.css?v=2','./assets/menu/home-card-art-v1.webp','./music.js?v=231','./broadcast-dome.js?v=74','./open-air-parks.js?v=74','./venue-vision.js?v=74','./play-review.js?v=239','./match-models.js?v=56','./assets/3d/jersey.glb','./assets/career/album-scenes.webp','./career-extras.js?v=56','./career-extras-view.js?v=56','./assets/fonts/noto-display-bold-italic.woff','./assets/fonts/noto-jp-display-bold.woff','./career-life.js?v=56','./career-leagues.js?v=56','./career-development.js?v=57','./career.js?v=58','./career-view.js?v=77','./career.css?v=56','./apbc-tournament.js?v=56','./apbc-candidates.js?v=56','./assets/nations/australia.svg','./derby.js?v=57','./playoff-view.js?v=77','./results.js?v=222','./matchup-data.js?v=56','./apbc-data.js?v=56','./npb-data.js?v=76','./npb-rosters.js?v=197','./kbo-data.js?v=76','./kbo-rosters.js?v=197','./assets/nations/taipei.svg','./assets/nations/korea.svg','./assets/nations/japan.svg','./runner-map.js?v=56','./','./index.html','./style.css?v=77','./arcade.css?v=81','./player-directory.css?v=1','./squad.js?v=56','./assets/menu/clubhouse-v18.webp','./assets/menu/trophy.svg','./vendor/three.module.min.js','./stadium3d.js?v=241','./stadium-premium.js?v=228','./canvas3d.js?v=228','./ratings-data.js?v=56','./players.js?v=219','./pennant.js?v=198','./npb-postseason.js?v=77','./game.js?v=241','./renderer.js?v=238','./online.js?v=236','./online-derby.js?v=1','./app.js?v=241','./audio.js?v=205','./assets/audio/credits.json','./assets/audio/npb-taiko.mp3','./assets/audio/ctbc-brothers-hit.mp3','./assets/audio/bat-1.mp3','./assets/audio/bat-2.mp3','./assets/audio/mitt-1.mp3','./assets/audio/mitt-2.mp3','./assets/audio/crowd-bed.mp3','./assets/audio/crowd-cheer.mp3','./assets/audio/swish.mp3','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./assets/clubs/brothers.png','./assets/clubs/dragons.png','./assets/clubs/lions.png','./assets/clubs/guardians.png','./assets/clubs/monkeys.png','./assets/clubs/hawks.png','./assets/kbo/kbo-ht.png','./assets/kbo/kbo-ss.png','./assets/kbo/kbo-lg.png','./assets/kbo/kbo-ob.png','./assets/kbo/kbo-kt.png','./assets/kbo/kbo-sk.png','./assets/kbo/kbo-lt.png','./assets/kbo/kbo-hh.png','./assets/kbo/kbo-nc.png','./assets/kbo/kbo-wo.png','./assets/npb/npb-g.png','./assets/npb/npb-db.png','./assets/npb/npb-t.png','./assets/npb/npb-c.png','./assets/npb/npb-d.png','./assets/npb/npb-s.png','./assets/npb/npb-h.png','./assets/npb/npb-f.png','./assets/npb/npb-e.png','./assets/npb/npb-m.png','./assets/npb/npb-b.png','./assets/npb/npb-l.png','./assets/npb/npb-a.png','./assets/npb/npb-v.png'];
// Install the next version without interrupting existing game sessions.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

// The player chooses when to switch to a waiting version from the main menu.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // Never touch unrelated caches; browser saves/localStorage are unaffected.
    await Promise.all(names.filter(name => name.startsWith('nightball-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Prefer the network so newly released files are available immediately, but
// keep the complete offline game available when the network cannot be reached.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    try {
      const networkRequest = request.mode === 'navigate'
        ? new Request(request, {cache: 'no-cache'})
        : request;
      const response = await fetch(networkRequest);
      if (response.ok && response.type !== 'opaque') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    } catch (_) {
      const saved = await caches.match(request);
      if (saved) return saved;
      if (request.mode === 'navigate') {
        const offlineHome = await caches.match('./index.html');
        if (offlineHome) return offlineHome;
      }
      return Response.error();
    }
  })());
});
