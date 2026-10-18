window.WordTools=(()=>{
 const cacheKey='contextly.pronunciation.v1';let cached=[];
 try{const value=JSON.parse(localStorage.getItem(cacheKey)||'[]');if(Array.isArray(value))cached=value.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&x[1]&&typeof x[1].ipa==='string').slice(-200);}catch{}
 const cache=new Map(cached),inflight=new Map(),ipaFiles=new Map();
 async function localIPA(word){
  const key=word.toLowerCase();if(!/^[a-z]+(?:['’-][a-z]+)*$/.test(key))return '';
  const letter=key[0];
  if(!ipaFiles.has(letter))ipaFiles.set(letter,(async()=>{
   const response=await fetch('./vendor/ipa/'+letter+'.txt');if(!response.ok)throw Error();
   return new Map((await response.text()).split(/\r?\n/).map(line=>line.split('\t')));
  })());
  try{return (await ipaFiles.get(letter)).get(key)||'';}catch{ipaFiles.delete(letter);return '';}
 }
 function analyze(word,sentence='',parts=[]){
  const result={pos:'',base:word.toLowerCase()};if(!window.nlp)return result;
  try{
   const full=nlp(sentence||word),terms=full.terms().json({offset:true});
   let index=terms.findIndex(row=>row.offset?.start===(parts[0]?.start??sentence.toLowerCase().indexOf(word.toLowerCase().split(/\s+/)[0])));
   if(index<0)return result;
   const tags=terms[index]?.terms?.[0]?.tags||[];
   const names=[['Pronoun','pronoun'],['Verb','verb'],['Adjective','adjective'],['Adverb','adverb'],['Noun','noun'],['Preposition','preposition'],['Conjunction','conjunction'],['Determiner','determiner']];
   result.pos=names.find(([tag])=>tags.includes(tag))?.[1]||'';
   if(result.pos==='verb'){
    const base=full.terms().slice(index,index+1).verbs().toInfinitive().text().trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g,'');
    if(base)result.base=[base,...word.toLowerCase().split(/\s+/).slice(1)].join(' ');
   }else if(result.pos==='noun'&&!word.includes(' ')){
    const base=full.terms().slice(index,index+1).nouns().toSingular().text().trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g,'');if(base)result.base=base;
   }
  }catch{}
  return result;
 }
 function safeAudio(value){try{const u=new URL(value, 'https://api.dictionaryapi.dev');return u.protocol==='https:'&&!u.username&&!u.password&&['upload.wikimedia.org','commons.wikimedia.org','ssl.gstatic.com'].includes(u.hostname)?u.href:'';}catch{return '';}}
 async function pronunciation(word){
  const key=word.trim().toLowerCase();if(!/^[a-z]+(?:['’-][a-z]+)*$/.test(key))return {ipa:'',audio:''};
  if(cache.has(key))return cache.get(key);if(inflight.has(key))return inflight.get(key);
  const operation=(async()=>{
   const response=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(key),{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('dictionary unavailable');const entries=await response.json();if(!Array.isArray(entries))throw Error('dictionary unavailable');
   const phonetics=entries.flatMap(e=>Array.isArray(e.phonetics)?e.phonetics:[]);
   const pair=phonetics.find(p=>safeAudio(p.audio)&&typeof p.text==='string'&&p.text.length<100)||phonetics.find(p=>typeof p.text==='string'&&p.text.length<100);
   const ipa=pair?.text||entries.find(e=>typeof e.phonetic==='string'&&e.phonetic.length<100)?.phonetic||'';
   const audio=safeAudio(pair?.audio)||phonetics.map(p=>safeAudio(p.audio)).find(Boolean)||'';const result={ipa,audio};
   cache.set(key,result);if(cache.size>200)cache.delete(cache.keys().next().value);try{localStorage.setItem(cacheKey,JSON.stringify([...cache]));}catch{}return result;
  })();inflight.set(key,operation);try{return await operation;}finally{inflight.delete(key);}
 }
 let playing,playbackSerial=0,sentenceUpdater=()=>{};
 const speakerIcon='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>';
 function speak(word,onError=()=>{}){
  if(!('speechSynthesis'in window))throw Error('เสียงไม่พร้อมบนเครื่องนี้');
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word);utterance.lang='en-US';utterance.rate=.85;
  utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))onError('เสียงจากเครื่องยังไม่พร้อม');};
  const voices=speechSynthesis.getVoices(),voice=voices.find(v=>v.lang==='en-US'&&v.localService)||voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en'));if(voice)utterance.voice=voice;speechSynthesis.speak(utterance);
 }
 async function listen(text,onError=()=>{}){
  const value=String(text||'').trim();if(!value)throw Error('ใส่ประโยคก่อน');const run=++playbackSerial;
  if(playing){playing.pause();playing=null;}if('speechSynthesis'in window)speechSynthesis.cancel();
  if(window.ContextlyDevice?.speak){await window.ContextlyDevice.speak(value);return;}
  const audio=safeAudio(cache.get(value.toLowerCase())?.audio);
  if(audio){const player=new Audio(audio);playing=player;try{await player.play();return;}catch{if(run!==playbackSerial)return;}}
  if(run===playbackSerial)speak(value,message=>{if(run===playbackSerial)onError(message);});
 }
 function mountSentenceReader(button,input,status){
  if(!button||!input)return;button.innerHTML=speakerIcon;button.setAttribute('aria-label','ฟังทั้งประโยค');button.title='ฟังทั้งประโยค';
  sentenceUpdater=()=>{button.disabled=!input.value.trim();};input.addEventListener('input',sentenceUpdater);sentenceUpdater();
  button.onclick=async()=>{if(status)status.textContent='';try{await listen(input.value,message=>{if(status)status.textContent=message;});}catch(error){if(status)status.textContent=error.message;}};
 }
 function mount(host,record){
  if(!host)return;const details=analyze(record.word,record.sentence,record.selectedParts||[]);host.replaceChildren();host.className='word-tools';
  const info=document.createElement('span');info.className='muted';info.textContent=[details.pos,details.base!==record.word.toLowerCase()?'รูปพื้นฐาน '+details.base:''].filter(Boolean).join(' · ');
  const button=document.createElement('button');button.type='button';button.className='secondary pronounce';button.innerHTML=speakerIcon;button.title='ฟังเสียง';button.setAttribute('aria-label','ฟังเสียง '+record.word);
  const phonetic=document.createElement('span');phonetic.className='muted';const status=document.createElement('span');status.className='muted';status.setAttribute('role','status');
  host.append(info,button,phonetic,status);
  const ready=cache.get(record.word.toLowerCase());if(ready)phonetic.textContent=ready.ipa;
  localIPA(record.word).then(ipa=>{if(host.isConnected&&!phonetic.textContent)phonetic.textContent=ipa;});
  let clickSerial=0;
  button.onclick=async()=>{
   const run=++clickSerial;status.textContent='';try{
    await listen(record.word,message=>{if(run===clickSerial&&host.isConnected)status.textContent=message;});
    if(record.word.includes(' '))return;
    pronunciation(record.word).then(data=>{if(run===clickSerial&&host.isConnected&&data?.ipa)phonetic.textContent=data.ipa;}).catch(()=>{});
   }catch(e){if(run===clickSerial&&host.isConnected)status.textContent=e.message;}
  };
 }
 return {analyze,mount,pronunciation,safeAudio,localIPA,listen,mountSentenceReader,syncSentenceReader:()=>sentenceUpdater()};
})();
