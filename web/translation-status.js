window.TranslationStatus=(()=>{
 const names={gemini:'Gemini',google:'Google Translate',mymemory:'MyMemory',contextly:'Contextly',manual:'แก้ไขเอง'};
 const targets={meaning:'meaningTranslationProvider',sentenceTranslation:'sentenceTranslationProvider'};
 function normalize(value){return value&&Object.hasOwn(names,value.provider)?{provider:value.provider,cached:!!value.cached,fallback:!!value.fallback,preview:!!value.preview,contextAdjusted:!!value.contextAdjusted}:null;}
 function read(id){try{return normalize(JSON.parse(document.getElementById(id).dataset.translationMeta||'null'));}catch{return null;}}
 function sync(id){
  const input=document.getElementById(id),badge=document.getElementById(targets[id]),meta=read(id);
  badge.classList.toggle('hidden',!input.value.trim());
  badge.textContent=!input.value.trim()?'':!meta?'คำแปลเดิม · ไม่ระบุตัวแปล':names[meta.provider]+(meta.fallback?' · สำรอง':meta.preview?' · แปลเร็ว':'')+(meta.contextAdjusted?' · บริบท':'')+(meta.cached&&meta.provider!=='manual'?' · คำแปลเดิม':'');
  badge.dataset.provider=meta?.provider||'unknown';
 }
 function set(id,value){const meta=normalize(value),input=document.getElementById(id);if(meta)input.dataset.translationMeta=JSON.stringify(meta);else delete input.dataset.translationMeta;sync(id);}
 function clear(id){delete document.getElementById(id).dataset.translationMeta;sync(id);}
 function restore(id,value){const meta=normalize(value);set(id,meta?{...meta,cached:meta.provider!=='manual'}:null);}
 for(const id of Object.keys(targets))document.getElementById(id).addEventListener('input',()=>set(id,{provider:'manual'}));
 return {set,clear,read,restore,sync,name:provider=>names[provider]||'ตัวแปล'};
})();
