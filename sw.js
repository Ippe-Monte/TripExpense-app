// TripExpense Service Worker — โหลดจากเครือข่ายก่อนเสมอ (ได้เวอร์ชันล่าสุด) ถ้าออฟไลน์ใช้ไฟล์ที่เก็บไว้
const CACHE='tripexpense-v18';
const SHELL=['./','./index.html','./manifest.webmanifest','./css/app.css?v=18','./icons/icon-192.png','./icons/icon-512.png','./img/logo.svg','./img/splash.svg',
  ...['core','groups','trips','dashboard','schedule','expenses','budget','documents','reports','profile','developer','invites','friends','chat','pwa','ui','summary','history'].map(n=>`./js/${n}.js?v=18`)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r}).catch(()=>caches.match(req).then(m=>m||(req.mode==='navigate'?caches.match('./index.html'):undefined))))});
