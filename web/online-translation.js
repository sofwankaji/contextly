window.OnlineTranslation=(()=>{
 const key='contextly.translationEngine',inputs=['translationEngine','captureTranslationEngine'].map(id=>document.getElementById(id));let mode='mymemory';
 try{const saved=localStorage.getItem(key);mode=['google','gemini'].includes(saved)?saved:'mymemory';localStorage.setItem(key,mode);localStorage.removeItem('contextly.nllbInstalled.v1');localStorage.removeItem('contextly.nllbAutoPaused.v1');}catch{}
 for(const input of inputs){input.value=mode;input.addEventListener('change',event=>{
  if(!['google','mymemory','gemini'].includes(event.target.value))return;mode=event.target.value;try{localStorage.setItem(key,mode);}catch{}
  for(const other of inputs)other.value=mode;
  if(typeof cancelTranslation==='function')cancelTranslation();window.LiveTranslation?.refresh();
  if(typeof selected!=='undefined'&&selected&&document.getElementById('autoMeaning')?.checked&&typeof autoTranslate==='function')autoTranslate();
 });}
 if(typeof caches!=='undefined')Promise.allSettled(['contextly-nllb-model-v1','contextly-nllb-runtime-v1'].map(name=>caches.delete(name)));
 return {provider:()=>mode};
})();
