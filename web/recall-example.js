window.RecallExample=(()=>{
 const storageKey='contextly.recallExamples.v1',cache=new Map();let controller,timer;
 const key=word=>JSON.stringify([word.word,word.sentence,word.meaning,word.selectedParts||[]]);
 function valid(value,word){if(!value||typeof value.example!=='string'||!value.example.trim()||value.example.length>240||/[<>\u0e00-\u0e7f]/.test(value.example)||typeof value.exampleTranslation!=='string'||value.exampleTranslation.length>600||!['gemini','contextly'].includes(value.provider))return false;const tokens=s=>s.toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g)||[],available=tokens(value.example);if(tokens(word.sentence).join(' ').includes(available.join(' ')))return false;return tokens(word.word).every(term=>{const i=available.indexOf(term);if(i<0)return false;available.splice(i,1);return true;});}
 try{const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(stored))for(const entry of stored.slice(-200))if(Array.isArray(entry)&&typeof entry[0]==='string')cache.set(entry[0],entry[1]);}catch{}
 function remember(word,result){cache.set(key(word),result);if(cache.size>200)cache.delete(cache.keys().next().value);try{localStorage.setItem(storageKey,JSON.stringify([...cache]));}catch{}}
 function local(word,parts){const sense=window.ContextSense?.find(word.word,word.sentence,parts[0]?.start||0,parts),value=sense?.example;if(value){const result={example:value.sentence,exampleTranslation:value.translation,provider:'contextly'};if(valid(result,word))return result;}const data=window.WordExamples?.build(word);if(data?.source==='curated'){for(const sentence of data.examples){const result={example:sentence,exampleTranslation:'',provider:'contextly'};if(valid(result,word))return result;}}return null;}
 function reveal(host){host?.querySelector('.recall-example-th')?.classList.remove('hidden');}
 function mount(host,word,{isRevealed=()=>false,onContext=()=>{},retry}={}){
  controller?.abort();clearTimeout(timer);controller=new AbortController();const current=controller,sentence=String(word.sentence||''),parts=window.WordSelection?.validate(sentence,word.selectedParts||[])||[];
  const inputParts=parts.length?parts:window.WordSelection?.legacy(sentence,word.word,sentence.toLowerCase().indexOf(word.word.toLowerCase()))||[];
  if(!host)return;host.className='recall-fresh-example';retry?.classList.add('hidden');
  const active=()=>!current.signal.aborted&&host.isConnected;let contextShown=false;
  function show(result){if(!active())return;host.replaceChildren();const english=document.createElement('p');english.className='recall-example-en';let html=escapeHtml(result.example);try{html=window.WordExamples?.highlight(result.example,word,window.WordTools?.analyze(word.word,sentence,inputParts)?.base||word.word)||html;}catch{}english.innerHTML=html;host.append(english);if(result.exampleTranslation){const thai=document.createElement('p');thai.className='recall-example-th';thai.textContent=result.exampleTranslation;thai.classList.toggle('hidden',!isRevealed());host.append(thai);}const label=document.createElement('small');label.textContent=result.provider==='gemini'?'ตัวอย่างใหม่ · Gemini':result.provider==='saved'?'ประโยคที่บันทึก':'ตัวอย่างตามบริบท · คลังประโยค';host.append(label);if(result.example.trim()&&!contextShown){contextShown=true;onContext();}}
  const stored=cache.get(key(word));if(valid(stored,word)){show(stored);return;}
  let fallback;try{fallback=local(word,inputParts);}catch{}
  fallback||={example:sentence,exampleTranslation:String(word.sentenceTranslation||''),provider:'saved'};
  if(sentence.trim()||fallback.example)show(fallback);else host.textContent='ยังไม่มีประโยคที่บันทึก';
  if(retry)retry.onclick=()=>mount(host,word,{isRevealed,onContext,retry});
  timer=setTimeout(async()=>{try{if(!inputParts.length)throw Error('ตำแหน่งคำไม่ครบ');const result=await window.GeminiTranslation.example({word:word.word,sentence,offset:inputParts[0].start,parts:inputParts,meaning:String(word.meaning||'').slice(0,250)},current.signal);if(!valid(result,word))throw Error('ตัวอย่างไม่ถูกต้อง');if(!active())return;remember(word,result);show(result);}catch(error){if(!active())return;if(retry){retry.title=error.code==='NO_KEY'?'เชื่อม Gemini ในตั้งค่าเพื่อสร้างประโยคใหม่':error.code==='QUOTA'?'โควตาเต็ม · ลองอีกครั้งภายหลัง':'ลองสร้างประโยคใหม่';retry.classList.remove('hidden');}}},500);
 }
 return {mount,reveal,valid};
})();
