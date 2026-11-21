const CACHE='termos-obra-shell-v1.0.4';
const FILES=['/','/index.html','/styles.css','/app.js','/core.js','/db.js','/template.js','/pdf.js','/signature.js','/tour.js','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/termo-adesao.pdf','/vendor/pdf-lib.min.js','/vendor/fflate.min.js'];
self.addEventListener('install', event => {
 event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES.map(path => new Request(path, {cache: 'reload'})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k.startsWith('termos-obra-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const path=event.request.mode==='navigate'?'/':u.pathname;const saved=await cache.match(path);return saved||fetch(event.request);})());
});
