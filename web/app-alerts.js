window.AppAlerts=window.ContextlyDevice?.alerts||(()=>{
 const preference='contextly.phoneAlerts',button=document.getElementById('enablePhoneAlerts'),status=document.getElementById('phoneAlertsStatus');
 let lastSync='',busy=false,config;
 function enabled(){try{return localStorage.getItem(preference)==='on';}catch{return false;}}
 function render(){button.textContent=enabled()?'ปิดแจ้งเตือนโทรศัพท์':'เปิดแจ้งเตือนโทรศัพท์';document.getElementById('testPhoneAlerts').disabled=!enabled();}
 async function request(method,subscription,times){
  const response=await fetch('./api/push/subscription',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint,times}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('sync');
 }
 async function notifyDue(words){
  if(!enabled()||busy||!('Notification'in window)||Notification.permission!=='granted')return;
  busy=true;
  try{
   const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
   if(!subscription){status.textContent='แตะเปิดแจ้งเตือนอีกครั้ง';localStorage.setItem(preference,'off');render();return;}
   const cache=await caches.open('contextly-alert-state'),response=await cache.match('./alert-sent');
   const sent=response?await response.json():[];
   const times=[...new Set(words.filter(w=>!sent.includes(JSON.stringify([w.id,w.dueAt]))).map(w=>w.dueAt).filter(Number.isSafeInteger))].sort((a,b)=>a-b);
   const signature=JSON.stringify(times);if(lastSync===signature)return;
   await request('POST',subscription,times);lastSync=signature;status.textContent='เปิดแล้ว · แจ้งเตือนได้แม้ปิดแอป';
  }catch{status.textContent='เชื่อมต่อแจ้งเตือนไม่สำเร็จ จะลองใหม่เมื่อเปิดแอป';}finally{busy=false;}
 }
 const prepared=fetch('./api/push/key').then(r=>{if(!r.ok)throw Error();return r.json();}).then(value=>config=value).catch(()=>{});
 button.onclick=async()=>{
  if(busy)return;button.disabled=true;
  try{
   if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){status.textContent='เปิดลิงก์นี้ใน Chrome บน Android';return;}
   if(enabled()){
    const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
    if(subscription){await request('DELETE',subscription);await subscription.unsubscribe();}
    localStorage.setItem(preference,'off');lastSync='';status.textContent='ปิดแล้ว';render();return;
   }
   const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent='อนุญาตแจ้งเตือนใน Chrome ก่อน';return;}
   await prepared;if(!config?.publicKey){status.textContent='ระบบแจ้งเตือนยังเชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง';return;}
   const registration=await navigator.serviceWorker.ready;
   const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/'));
   await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
   localStorage.setItem(preference,'on');lastSync='';render();await notifyDue(await getAll());
  }catch{status.textContent='เปิดแจ้งเตือนไม่สำเร็จ เปิดใน Chrome แล้วลองใหม่';}finally{button.disabled=false;}
 };
 document.getElementById('testPhoneAlerts').onclick=async()=>{
  const test=document.getElementById('testPhoneAlerts');test.disabled=true;
  try{
   const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
   if(!subscription)throw Error();
   const response=await fetch('./api/push/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error();status.textContent='ส่งแล้ว · ดูแจ้งเตือนบนโทรศัพท์';
  }catch{status.textContent='ส่งทดสอบไม่สำเร็จ ลองเปิดแจ้งเตือนอีกครั้ง';}finally{render();}
 };
 render();return {notifyDue};
})();
