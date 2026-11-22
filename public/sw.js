// Curling : petit service worker qui rend le jeu installable sur l'écran d'accueil.
// Il ne garde rien en mémoire : chaque ouverture charge toujours la dernière version en ligne.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { if (e.request.method === 'GET') e.respondWith(fetch(e.request)); });
