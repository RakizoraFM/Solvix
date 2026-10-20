// Solvix service worker (NV56): the app keeps opening without internet.
// - The app page: network first (so a new version is used as soon as it is online), the saved copy when offline or very slow.
// - Libraries and fonts from cdnjs / jsdelivr / Google Fonts (fixed versions): saved on first use, then read from the saved copy.
// - Everything else (Supabase, map tiles, the «new version» check ?nvv=…) goes to the network untouched.
const V = 'solvix-v1'; // change only when this file changes
const SCOPE = self.registration.scope;
const LIB = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then((c) => c.add(new Request(SCOPE, { cache: 'reload' }))).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

// /index.html and the folder address are the same page: one saved copy, under the folder address
const norm = (url) => { const b = String(url).split(/[?#]/)[0]; return b.endsWith('/index.html') && b.slice(0, -10) === SCOPE ? SCOPE : b; };
const isApp = (r, u) => r.mode === 'navigate' || (u.origin === self.location.origin && (u.href.split(/[?#]/)[0] === SCOPE || u.pathname.endsWith('/index.html')));

async function appPage(r) {
  const c = await caches.open(V);
  const net = fetch(r).then(async (res) => { if (res.ok) await c.put(SCOPE, res.clone()); return res; });
  const saved = await c.match(SCOPE);
  if (!saved) return net; // first visit: wait for the network
  // a saved copy exists: give the network 6 seconds, then the saved copy (it is refreshed in the background when the network answers)
  return Promise.race([net.catch(() => saved), new Promise((ok) => setTimeout(() => ok(saved), 6000))]);
}

async function library(r) {
  const hit = await caches.match(r);
  if (hit) return hit;
  const res = await fetch(r);
  if (res.ok || res.type === 'opaque') (await caches.open(V)).put(r, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.searchParams.has('nvv')) return; // the «new version» check always asks the server
  if (isApp(r, u)) { e.respondWith(appPage(r)); return; }
  if (LIB.test(r.url)) e.respondWith(library(r));
});

// the page asks to save a list of library URLs before going offline
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'nv56-prefetch' || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const c = await caches.open(V); let n = 0;
    for (const url of d.urls.slice(0, 40)) {
      const app = norm(url) === SCOPE;
      if (!LIB.test(url) && !app) continue;
      try { const key = app ? SCOPE : url; if (app || !(await c.match(key))) { const res = await fetch(app ? SCOPE : url, app ? { cache: 'reload' } : { mode: 'no-cors' }); if (res.ok || res.type === 'opaque') { await c.put(key, res.clone()); } } n++; } catch (err) { /* offline: skip */ }
    }
    if (e.source) e.source.postMessage({ type: 'nv56-prefetched', n });
  })());
});
