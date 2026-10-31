/* Wordora PWA service worker. App shell only; NEVER cache Supabase requests. */
'use strict';
const VERSION='wordora-pwa-6.0.1';
const SHELL=VERSION+'-shell';
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.2';
const ASSETS=[
 '/', '/index.html', '/config.js','/favicon.svg','/manifest.webmanifest',
 '/icons/icon-192.png','/icons/icon-512.png',
 '/styles.css','/wordora-v3.css','/wordora-v4.css','/wordora-v5.css','/wordora-v6.css','/wordora-offline.css',
 '/supabase-api.js','/wordora-offline.js','/app.js',
 '/wordora-v3.js','/wordora-v4.js','/wordora-v5.js','/wordora-v6.js','/wordora-offline-bridge.js'
];
async function cacheShell(){
 const cache=await caches.open(SHELL);
 // The app shell is same-origin and must be fully cached before offline mode is promised.
 await cache.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})));
 // Supabase JS is CDN-hosted; opaque cross-origin responses can be cached for offline use.
 // Offline install support is reported incomplete if this dependency isn't cached.
 try{
  const request=new Request(CDN,{mode:'no-cors',cache:'reload'});
  const response=await fetch(request);
  if(response.ok||response.type==='opaque')await cache.put(request,response);
 }catch(e){console.warn('Wordora CDN unavailable during precache:',e);}
 const cdnReady=!!(await cache.match(CDN));
 return {shellReady:true,cdnReady};
}
self.addEventListener('install',event=>{
 event.waitUntil(cacheShell().then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('wordora-pwa-')&&k!==SHELL).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='PRECACHE')return;
 event.waitUntil((async()=>{
  let status;
  try{status=await cacheShell();}
  catch(err){status={shellReady:false,cdnReady:false,error:String(err)};}
  event.ports?.[0]?.postMessage(status);
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 // Supabase Auth, PostgREST, Storage and all other third-party calls are never cached.
 if(url.origin!==self.location.origin){
  if(url.href!==CDN)return;
  event.respondWith((async()=>{
   const cache=await caches.open(SHELL);
   const cached=await cache.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok||response.type==='opaque')cache.put(request,response.clone()).catch(()=>{});
   return response;
  })());
  return;
 }
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request);
    if(response.ok){const cache=await caches.open(SHELL);cache.put('/index.html',response.clone()).catch(()=>{});}
    return response;
   }catch{
    const cache=await caches.open(SHELL);
    return (await cache.match('/index.html'))||Response.error();
   }
  })());
  return;
 }
 if(url.pathname.startsWith('/icons/')||ASSETS.includes(url.pathname)){
  event.respondWith((async()=>{
   const cache=await caches.open(SHELL);
   const hit=await cache.match(request,{ignoreSearch:true});
   if(hit)return hit;
   const result=await fetch(request);
   if(result.ok)cache.put(request,result.clone()).catch(()=>{});
   return result;
  })());
 }
});
