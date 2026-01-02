// tajweed SW v24
const VERSION='tajweed-v24';
const CACHE=VERSION+'-cache';
const CORE=[
  './',
  './index.html?v=24',
  './styles.css?v=24',
  './app.js?v=24',
  './data.js?v=24',
  './tests.js?v=24',
  './manifest.json?v=24',
];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>!k.includes(VERSION)).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
  const req=e.request; const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  const isHTML=req.headers.get('accept')?.includes('text/html');
  if(isHTML){
    e.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});(await caches.open(CACHE)).put(req,fresh.clone());return fresh;}catch{return (await caches.match(req))||await caches.match('./');}})());
    return;
  }
  e.respondWith((async()=>{const cached=await caches.match(req);if(cached) return cached;const resp=await fetch(req);(await caches.open(CACHE)).put(req,resp.clone());return resp;})());
});
