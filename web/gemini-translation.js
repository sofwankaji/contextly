window.GeminiTranslation=(()=>{
 let blockedUntil=0;
 const keyInput=document.getElementById('geminiKey'),free=document.getElementById('geminiFreeTier'),connect=document.getElementById('connectGemini'),disconnect=document.getElementById('disconnectGemini'),status=document.getElementById('geminiStatus'),form=document.getElementById('geminiKeyForm');
 async function request(path,options={}){if(window.ContextlyDevice?.gemini)return window.ContextlyDevice.gemini.request(path,options);const response=await fetch('/api/gemini/'+path,{credentials:'same-origin',...options});let data;try{data=await response.json();}catch{throw Error('เชื่อมต่อ Gemini ไม่สำเร็จ');}if(!response.ok){const error=Error(data.error||'Gemini ไม่พร้อม');error.code=data.code;error.retryAfter=data.retryAfter;throw error;}return data;}
 function ready(configured){form.classList.toggle('hidden',configured);disconnect.classList.toggle('hidden',!configured);status.textContent=configured?'เชื่อมต่อแล้ว · Gemini 3.1 Flash-Lite':'ยังไม่เชื่อมต่อ';}
 connect.onclick=async()=>{
  if(connect.disabled)return;if(!free.checked){status.textContent='ยืนยันว่าโปรเจกต์ไม่เปิด billing ก่อน';return;}const value=keyInput.value.trim();if(!value){keyInput.focus();return;}
  connect.disabled=true;status.textContent='กำลังเชื่อมต่อ…';
  try{await request('key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:value,freeTier:true})});if(keyInput.value.trim()===value)keyInput.value='';blockedUntil=0;ready(true);const input=document.getElementById('translationEngine');input.value='gemini';input.dispatchEvent(new Event('change'));}
  catch(error){status.textContent=error.message;}finally{connect.disabled=false;}
 };
 disconnect.onclick=async()=>{if(disconnect.disabled)return;disconnect.disabled=true;try{await request('key',{method:'DELETE'});ready(false);const input=document.getElementById('translationEngine');if(input.value==='gemini'){input.value='google';input.dispatchEvent(new Event('change'));}}catch(error){status.textContent=error.message;}finally{disconnect.disabled=false;}};
 async function suggest(word,sentence,offset,signal,parts){
  return translate('translate',{word,sentence,offset,parts},signal);
 }
 function delay(signal){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('Canceled','AbortError'));return;}const stop=()=>{clearTimeout(timer);reject(new DOMException('Canceled','AbortError'));},timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},1800);signal?.addEventListener('abort',stop,{once:true});});}
 async function translate(path,data,signal){
  if(signal?.aborted)throw new DOMException('Canceled','AbortError');if(Date.now()<blockedUntil){const error=Error('โควตา Gemini เต็ม');error.code='QUOTA';throw error;}
  const send=()=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal});
  try{try{return await send();}catch(error){if(error.code!=='RATE')throw error;await delay(signal);return await send();}}
  catch(error){if(error.code==='QUOTA')blockedUntil=Date.now()+Math.max(1,Math.min(3600,Number(error.retryAfter)||60))*1000;throw error;}
 }
 request('key').then(data=>{ready(data.configured);if(window.ContextlyDevice?.isNative&&data.configured&&!localStorage.getItem('contextly.nativeGeminiLinked')){localStorage.setItem('contextly.nativeGeminiLinked','yes');const input=document.getElementById('translationEngine');input.value='gemini';input.dispatchEvent(new Event('change'));}}).catch(error=>{status.textContent=error.message;});
 return {suggest,example:(data,signal)=>translate('example',data,signal)};
})();

