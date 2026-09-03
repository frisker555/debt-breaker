const APP_VERSION="18.45";
const CACHE_NAME=`debt-breaker-v${APP_VERSION}-shell-v1`;
const BASE_URL=new URL("./",self.location).href;
const INDEX_URL=new URL("index.html",BASE_URL).href;
const APP_SHELL=[
  BASE_URL,
  INDEX_URL,
  new URL("manifest.webmanifest",BASE_URL).href,
  new URL("icons/icon-192.png",BASE_URL).href,
  new URL("icons/icon-512.png",BASE_URL).href,
  new URL("icons/icon-maskable-512.png",BASE_URL).href
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith("debt-breaker-v")&&k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  // version.json is deliberately network-first/no-cache so the installed app can detect a new release.
  if(url.pathname.endsWith("/version.json")||url.pathname.endsWith("version.json")){
    event.respondWith(fetch(req,{cache:"no-store"}).catch(()=>new Response(JSON.stringify({version:APP_VERSION,offline:true}),{headers:{"Content-Type":"application/json"}})));
    return;
  }

  // Keep the current app shell stable until the user explicitly accepts the waiting Service Worker.
  if(req.mode==="navigate"){
    event.respondWith(caches.match(INDEX_URL).then(hit=>hit||fetch(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>hit||fetch(req).then(resp=>{
      if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));}
      return resp;
    }))
  );
});
