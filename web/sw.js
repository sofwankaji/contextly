const CACHE='contextly-v51';const ASSETS=['./recall-swipe.js?v=51','./context-meaning.js?v=51','./recall-example.js?v=51','./translation-status.js?v=51','./gemini-translation.js?v=51','./word-progress.js?v=51','./word-examples.js?v=51','./writing-ui.js?v=51','./learning-ui.js?v=51','./grammar-suggest.js?v=51','./context-suggest.js?v=51','./smart-completion.js?v=51','./suggest-examples.txt','./vendor/common-english.txt','./premium.css?v=51','./premium-ui.js?v=51','./recall.css?v=51','./online-translation.js?v=51','./vendor/compromise-14.18.0.js','./word-selection.js?v=51','./word-tools.js?v=51','./','./index.html','./auto-meaning.js?v=51','./recall-plan.js?v=51','./recall-ui.js?v=51','./live-translation.js?v=51','./app-alerts.js?v=51','./icon.svg','./manifest.webmanifest','./fonts/Prompt-400.ttf','./fonts/Prompt-500.ttf','./fonts/Prompt-600.ttf','./fonts/Prompt-700.ttf'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('contextly-v')&&k!==CACHE)||['contextly-nllb-model-v1','contextly-nllb-runtime-v1'].includes(k)).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)))})

self.addEventListener('notificationclick',event=>{event.notification.close();const id=event.notification.data?.cardId;if(typeof id!=='string'||id.length>300)return;const url=new URL('./',self.location.href);url.searchParams.set('card',id);event.waitUntil((async()=>{const windows=await clients.matchAll({type:'window',includeUncontrolled:true});const window=windows.find(w=>new URL(w.url).origin===url.origin);if(window){await window.navigate(url.href);return window.focus();}return clients.openWindow(url.href);})());});

function alertWords(){return new Promise((resolve,reject)=>{
 const open=indexedDB.open('contextly',1);
 open.onsuccess=()=>{const db=open.result;if(!db.objectStoreNames.contains('words')){db.close();resolve([]);return;}
  const read=db.transaction('words','readonly').objectStore('words').getAll();read.onsuccess=()=>{db.close();resolve(read.result);};read.onerror=()=>{db.close();reject(read.error);};};
 open.onerror=()=>reject(open.error);
});}
async function showPushRecall(){
 let due=[],words=[];
 const state=await caches.open('contextly-alert-state');
 let sent=[];try{const memo=await state.match('./alert-sent');if(memo)sent=await memo.json();
  words=await alertWords();due=words.filter(w=>Number.isFinite(w.dueAt)&&w.dueAt<=Date.now()&&!sent.includes(JSON.stringify([w.id,w.dueAt]))).sort((a,b)=>a.dueAt-b.dueAt);
 }catch{}
 if(due.length){
  for(const word of due.slice(0,2))await self.registration.showNotification('Contextly · '+word.word,{body:'ถึงเวลาทบทวน แตะเพื่อเปิดการ์ด',tag:'recall-'+word.id,data:{cardId:word.id},icon:'./icon.svg',badge:'./icon.svg'});
  sent.push(...due.map(w=>JSON.stringify([w.id,w.dueAt])));
  await state.put('./alert-sent',new Response(JSON.stringify(sent.slice(-5000)),{headers:{'Content-Type':'application/json'}}));
 }else await self.registration.showNotification(words[0]?'Contextly · '+words[0].word:'Contextly',{body:'แตะเพื่อเปิดการ์ดทบทวน',tag:'recall-status',data:{cardId:words[0]?.id||''},icon:'./icon.svg'});
}
self.addEventListener('push',event=>event.waitUntil(showPushRecall()));




