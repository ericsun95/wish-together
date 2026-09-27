/* App shell only. Auth, API calls, private photos and external map tiles are never cached. */
const CACHE='wish-together-shell-v1';
const root=new URL('./',self.registration.scope).pathname;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);const response=await fetch(root,{cache:'reload'});
  if(response.ok){await cache.put(root,response.clone());const html=await response.text();const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^" ]*)?)"/g)].map(m=>new URL(m[1],self.registration.scope)).filter(u=>u.origin===self.location.origin&&u.pathname.includes('/_next/static/'));await Promise.allSettled(assets.map(u=>cache.add(u.href)));}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const navigation=request.mode==='navigate'&&(url.pathname===root||url.pathname===root.slice(0,-1));
 const asset=url.pathname.startsWith(root+'_next/static/');
 if(!navigation&&!asset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(asset){const stored=await cache.match(request);if(stored)return stored;}
  try{const result=await fetch(request);if(result.ok)await cache.put(navigation?root:request,result.clone());return result;}
  catch(error){const stored=await cache.match(navigation?root:request);if(stored)return stored;throw error;}
 })());
});
