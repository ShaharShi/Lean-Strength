/* Lean Strength service worker */
var V = 'ls-202609161949';
var SHELL = ['./', './index.html', './data.js', './app.js', './manifest.webmanifest', './icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.indexOf('/figs/') >= 0) {
    e.respondWith(caches.open(V).then(function (c) { return c.match(e.request).then(function (r) { return r || fetch(e.request).then(function (res) { if (res.ok) c.put(e.request, res.clone()); return res; }); }); }));
  } else {
    e.respondWith(fetch(e.request).then(function (res) { if (res.ok) caches.open(V).then(function (c) { c.put(e.request, res.clone()); }); return res; }).catch(function () { return caches.match(e.request); }));
  }
});
