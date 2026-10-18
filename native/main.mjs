import {Capacitor,registerPlugin} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import protocol from './gemini-protocol.cjs';
import reminders from './reminders.cjs';
import updates from './updates.cjs';
if(Capacitor.isNativePlatform()){
 const Secure=registerPlugin('ContextlySecure'),version=__CONTEXTLY_VERSION__,preference='contextly.nativeAlerts.v1';
 let hooks=null,pendingCard=null,latestWords=null,syncTask=null,lastSignature='',lastGeminiStart=0,lastUpdateCheck=0,availableUpdate=null;
 const $=id=>document.getElementById(id),enabled=()=>localStorage.getItem(preference)==='on';
 const status=text=>{if($('phoneAlertsStatus'))$('phoneAlertsStatus').textContent=text;};
 function renderAlerts(){if($('enablePhoneAlerts'))$('enablePhoneAlerts').textContent=enabled()?'ปิดแจ้งเตือน':'เปิดแจ้งเตือน';if($('testPhoneAlerts')){$('testPhoneAlerts').disabled=!enabled();$('testPhoneAlerts').textContent='ทดสอบ 15 วินาที';}}
 async function openPending(){if(!hooks||!pendingCard)return;const id=pendingCard;pendingCard=null;await hooks.openCard(id);}
 async function syncOne(words){
  const desired=enabled()?reminders.plan(words):{notifications:[],remaining:0},signature=JSON.stringify(desired.notifications.map(note=>[note.id,note.extra.dueAt,note.title]));
  if(signature===lastSignature)return;
  const permission=await LocalNotifications.checkPermissions();if(enabled()&&permission.display!=='granted'){status('อนุญาตแจ้งเตือนในตั้งค่าโทรศัพท์');return;}
  const {notifications:pending}=await LocalNotifications.getPending(),diff=reminders.changes(pending,desired.notifications);
  if(diff.cancel.length)await LocalNotifications.cancel({notifications:diff.cancel});
  if(diff.schedule.length)await LocalNotifications.schedule({notifications:diff.schedule});
  lastSignature=signature;
  if(enabled())status('เปิดแล้ว · ตั้งไว้ '+desired.notifications.length+' รายการ'+(desired.remaining?' · เปิดแอปเพื่อตั้งรายการถัดไป':''));else status('ปิดแล้ว');
 }
 async function notifyDue(words){
  latestWords=words;await openPending();if(syncTask)return syncTask;
  syncTask=(async()=>{while(latestWords){const values=latestWords;latestWords=null;try{await syncOne(values);}catch{lastSignature='';status('ตั้งแจ้งเตือนไม่สำเร็จ · ลองเปิดใหม่อีกครั้ง');}}})();
  try{await syncTask;}finally{syncTask=null;}
 }
 const gemini={async request(path,options={}){
  if(path==='key'){
   if(options.method==='POST'){const data=JSON.parse(options.body);if(data.freeTier!==true)throw Error('ยืนยันว่าโปรเจกต์ไม่เปิด billing ก่อน');return Secure.connect({key:data.key});}
   if(options.method==='DELETE')return Secure.disconnect();
   return Secure.status();
  }
  if(!['translate','example'].includes(path))throw Error('คำขอไม่ถูกต้อง');
  const signal=options.signal;if(signal?.aborted)throw new DOMException('Canceled','AbortError');
  if(Date.now()-lastGeminiStart<1500){const error=Error('รอสักครู่');error.code='RATE';throw error;}
  const input=protocol.validateInput(JSON.parse(options.body)),body=protocol.makeBody(path,input),id=crypto.randomUUID();lastGeminiStart=Date.now();
  let abort;
  const canceled=new Promise((_,reject)=>{abort=()=>{Secure.cancel({id}).catch(()=>{});reject(new DOMException('Canceled','AbortError'));};signal?.addEventListener('abort',abort,{once:true});});
  try{const result=await Promise.race([Secure.generate({id,body:JSON.stringify(body)}),canceled]);if(signal?.aborted)throw new DOMException('Canceled','AbortError');return protocol.readResponse(result.payload,path,input,result.model);}
  finally{signal?.removeEventListener('abort',abort);}
 }};
 async function checkUpdate(manual=false){
  if(!manual&&Date.now()-lastUpdateCheck<300000)return;lastUpdateCheck=Date.now();
  const label=$('nativeUpdateStatus');if(manual&&label)label.textContent='กำลังตรวจ…';
  try{
   const info=await App.getInfo(),response=await fetch('https://api.github.com/repos/'+version.repository+'/releases/latest',{cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
   if(response.status===404){if(manual&&label)label.textContent='ยังไม่มีรุ่นใหม่';return;}if(!response.ok)throw Error();
   availableUpdate=updates.releaseInfo(await response.json(),version.repository,Number(info.build));
   $('nativeUpdateNotice')?.classList.toggle('hidden',!availableUpdate);
   if(availableUpdate&&$('nativeUpdateLabel'))$('nativeUpdateLabel').textContent='มีรุ่นใหม่ · '+availableUpdate.versionName;
   if(manual&&label)label.textContent=availableUpdate?'มีรุ่นใหม่ · กดอัปเดต':'เป็นรุ่นล่าสุดแล้ว';
  }catch{if(manual&&label)label.textContent='ตรวจอัปเดตไม่ได้ · ลองอีกครั้ง';}
 }
 function mountSettings(){
  const settings=$('settings');if(!settings)return;
  if($('geminiStorageInfo'))$('geminiStorageInfo').textContent='คีย์เก็บเข้ารหัสเฉพาะเครื่องนี้ · แอปตรวจสถานะ billing ไม่ได้';
  const group=document.createElement('div');group.className='settings-group';
  group.innerHTML='<h3>APK</h3><p id="nativeCurrentVersion" class="muted"></p><button id="checkNativeUpdate" class="secondary" type="button">ตรวจอัปเดต</button><p id="nativeUpdateStatus" class="muted" role="status"></p><p class="muted">นำเข้าไฟล์สำรองเพื่อย้ายคำศัพท์จากรุ่นเดิม</p>';
  settings.append(group);$('nativeCurrentVersion').textContent=version.versionName+' · '+version.commit;$('checkNativeUpdate').onclick=()=>checkUpdate(true);
  const notice=document.createElement('aside');notice.id='nativeUpdateNotice';notice.className='native-update-notice hidden';notice.setAttribute('role','status');notice.innerHTML='<span id="nativeUpdateLabel"></span><button id="installNativeUpdate" type="button">อัปเดต</button>';document.querySelector('.app-header')?.after(notice);
  $('installNativeUpdate').onclick=()=>{if(availableUpdate)Browser.open({url:availableUpdate.url});};
  const timeButton=document.createElement('button');timeButton.type='button';timeButton.className='secondary';timeButton.textContent='เวลาแจ้งเตือน';timeButton.onclick=async()=>{try{await LocalNotifications.changeExactNotificationSetting();}catch{status('เปิดสิทธิ์นาฬิกาปลุกในการตั้งค่าโทรศัพท์');}};
  $('enablePhoneAlerts')?.parentElement.append(timeButton);
  $('enablePhoneAlerts').onclick=async()=>{
   const button=$('enablePhoneAlerts');button.disabled=true;
   try{
    if(enabled()){localStorage.setItem(preference,'off');lastSignature='';await notifyDue([]);}
    else{
     const permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted'){status('อนุญาตแจ้งเตือนก่อน');return;}
     await LocalNotifications.createChannel({id:'recall',name:'ทบทวนคำศัพท์',description:'แจ้งเตือนเมื่อถึงเวลาทบทวน',importance:4,visibility:0});
     localStorage.setItem(preference,'on');lastSignature='';await notifyDue(hooks?await hooks.getAll():[]);
     const exact=await LocalNotifications.checkExactNotificationSetting();if(exact.exact_alarm!=='granted')status('เปิดแล้ว · กดเวลาแจ้งเตือน หากต้องการให้ตรงเวลา');
    }
   }catch{status('เปิดแจ้งเตือนไม่สำเร็จ · ลองใหม่');}finally{button.disabled=false;renderAlerts();}
  };
  $('testPhoneAlerts').onclick=async()=>{
   try{await LocalNotifications.schedule({notifications:[{id:reminders.TEST_ID,title:'Contextly พร้อมทบทวน',body:'แตะเพื่อเปิดการ์ดคำศัพท์',channelId:'recall',schedule:{at:new Date(Date.now()+15000),allowWhileIdle:true},extra:{kind:'test',wordId:(hooks?await hooks.getAll():[])[0]?.id||''}}]});status('ตั้งทดสอบแล้ว · ปิดแอปรอ 15 วินาที');}catch{status('ตั้งทดสอบไม่สำเร็จ · ตรวจสิทธิ์แจ้งเตือน');}
  };
  renderAlerts();if(enabled())status('กำลังตรวจรายการแจ้งเตือน…');else status('แจ้งเตือนจากเครื่อง · ไม่ใช้เซิร์ฟเวอร์');
 }
 LocalNotifications.addListener('localNotificationActionPerformed',event=>{const id=event.notification?.extra?.wordId;if(typeof id==='string'&&id){pendingCard=id;openPending().catch(()=>{});}}).catch(()=>{});
 App.addListener('appStateChange',({isActive})=>{if(isActive){lastSignature='';if(hooks)hooks.getAll().then(notifyDue).catch(()=>{});checkUpdate();}}).catch(()=>{});
 window.ContextlyDevice={isNative:true,gemini,alerts:{notifyDue},speak:text=>Secure.speak({text}),exportBackup:json=>Secure.exportBackup({json}),async ready(callbacks){hooks=callbacks;try{await openPending();await notifyDue(await hooks.getAll());}catch{status('อ่านข้อมูลแจ้งเตือนไม่สำเร็จ · เปิดแอปใหม่อีกครั้ง');}checkUpdate();}};
 mountSettings();
}
