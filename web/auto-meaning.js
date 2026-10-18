window.ContextMeaning = (() => {
  const storageKey='contextly.autoTranslations.v2';
  let stored=[];
  try { const value=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(value))stored=value.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&typeof x[1]?.meaning==='string'&&typeof x[1]?.sentenceTranslation==='string').slice(-200); }catch{}
  const cache=new Map(stored),blockedUntil=new Map();
  const provider=()=>{if(window.OnlineTranslation)return window.OnlineTranslation.provider();try{return localStorage.getItem('contextly.translationEngine')==='google'?'google':'mymemory';}catch{return 'mymemory';}};
  function text(html){const field=document.createElement('textarea');field.innerHTML=html.replace(/<[^>]*>/g,'');return field.value.trim();}
  function remember(id,value){cache.set(id,value);if(cache.size>200)cache.delete(cache.keys().next().value);try{localStorage.setItem(storageKey,JSON.stringify([...cache]));}catch{}return value;}
  async function requestTranslation(sentence,signal,engine){
    if(signal?.aborted)throw new DOMException('Canceled','AbortError');
    if(Date.now()<(blockedUntil.get(engine)||0))throw Error(engine==='google'?'Google Translate จำกัดคำขอ ลองใหม่ภายหลัง':'โควตา MyMemory เต็ม ลองใหม่ภายหลัง');
    if(engine==='google'){
      if(sentence.length>2000)throw Error('กรุณาใช้ประโยคสั้นกว่า 2,000 ตัวอักษร');
      const url=new URL('https://translate.googleapis.com/translate_a/single');for(const [key,value]of Object.entries({client:'gtx',sl:'en',tl:'th',dt:'t',dj:'1',q:sentence}))url.searchParams.set(key,value);
      let response;try{response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});}catch(error){if(error.name==='AbortError')throw error;throw Error('Google Translate ไม่พร้อม เปิดเว็บแปลแทนได้');}
      if(response.status===429||response.status===403){blockedUntil.set(engine,Date.now()+60000);throw Error('Google Translate จำกัดคำขอ เปิดเว็บแปลแทนได้');}
      if(!response.ok)throw Error('Google Translate ไม่พร้อม เปิดเว็บแปลแทนได้');
      let body;try{body=await response.json();}catch{throw Error('Google Translate ไม่พร้อม เปิดเว็บแปลแทนได้');}
      if(!Array.isArray(body.sentences)||!body.sentences.length||!body.sentences.every(row=>typeof row.trans==='string'))throw Error('Google Translate ไม่พร้อม เปิดเว็บแปลแทนได้');
      const translated=body.sentences.map(row=>row.trans).join('');if(!translated||translated.length>10000)throw Error('คำแปลไม่ถูกต้อง ลองเปิดเว็บแปล');return translated;
    }
    if(new TextEncoder().encode(sentence).length>500)throw Error('MyMemory รองรับประโยคสั้นกว่า 500 ไบต์');
    const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',sentence);url.searchParams.set('langpair','en|th');
    const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'}),body=await response.json();
    if(response.status===429||body.quotaFinished||Number(body.responseStatus)===429){blockedUntil.set(engine,Date.now()+60000);throw Error('โควตา MyMemory เต็ม เปิดเว็บแปลแทนได้');}
    const translated=body.responseData?.translatedText;
    if(!response.ok||Number(body.responseStatus)!==200||typeof translated!=='string'||!translated||translated.length>10000||/MYMEMORY WARNING|DAILY LIMIT/i.test(translated))throw Error('MyMemory ไม่พร้อม เปิดเว็บแปลแทนได้');return translated;
  }
  async function suggest(word,sentence,offset,signal,selection=[],engineOverride){
    if(signal?.aborted)throw new DOMException('Canceled','AbortError');const engine=engineOverride||provider();
    const parts=selection.length?WordSelection.validate(sentence,selection):[];
    const id=JSON.stringify([engine,word,sentence,offset,parts,...(engine==='google'?['context-v1']:[])]);if(cache.has(id))return {...cache.get(id),provider:cache.get(id).provider||engine,cached:true};
    const giveUp=/^(give|gave|gives|giving)\s+up$/i.test(word.trim());
    if(engine==='mymemory'&&giveUp&&/^\s*(never|don['’]t|do not)\s+give\s+up[.!]?\s*$/i.test(sentence))return {meaning:'ยอมแพ้',sentenceTranslation:'อย่ายอมแพ้',provider:'contextly'};
    const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    if(parts.length&&WordSelection.label(sentence,parts)!==word.toLowerCase())throw Error('เลือกคำในประโยคอีกครั้ง');
    if(!parts.length&&(!Number.isInteger(offset)||offset<0||sentence.slice(offset,offset+word.length).toLowerCase()!==word.toLowerCase()))throw Error('เลือกคำในประโยคอีกครั้ง');
    if(engine==='gemini'){
      try{const result=await window.GeminiTranslation.suggest(word,sentence,offset,signal,parts);return remember(id,result);}
      catch(error){if(error.name==='AbortError'||signal?.aborted)throw error;const fallback=await suggest(word,sentence,offset,signal,selection,'google');return {...fallback,fallback:true,notice:(error.code==='QUOTA'?'โควตา Gemini เต็ม':error.code==='NO_KEY'?'เชื่อมต่อ Gemini ในตั้งค่าก่อน':'Gemini ไม่พร้อม')+' · ใช้ Google Translate สำรอง'};}
    }
    const contextual=engine==='google'?window.ContextSense?.find(word,sentence,offset,parts):null;
    const plain=engine==='google'?await translateSentenceResult(sentence,signal,'google'):null;
    if(contextual)return remember(id,{meaning:contextual.meaning,sentenceTranslation:plain.sentenceTranslation,provider:'google',meaningProvider:'contextly',contextAdjusted:true});
    const separated=parts.length>1&&sentence.slice(parts[0].start,parts.at(-1).start+parts.at(-1).length).toLowerCase().replace(/\s+/g,' ')!==word.toLowerCase();
    const spans=separated?parts:[{start:offset,length:parts.length?parts.at(-1).start+parts.at(-1).length-offset:word.length}];
    let cursor=0,marked='';for(const p of spans){marked+=escape(sentence.slice(cursor,p.start))+'<b>'+escape(sentence.slice(p.start,p.start+p.length))+'</b>';cursor=p.start+p.length;}marked+=escape(sentence.slice(cursor));
    const translated=await requestTranslation(marked,signal,engine);
    const markedWords=[...translated.matchAll(/<b(?:\s[^>]*)?>([\s\S]*?)<\/b>/gi)];
    if(markedWords.length!==spans.length&&!(engine==='mymemory'&&giveUp))throw Error('ยังแยกความหมายของคำนี้ไม่ได้ เปิดเว็บแปลเพื่อดูประโยคเต็มได้');
    const meaning=engine==='mymemory'&&giveUp&&(separated||markedWords.length!==1)?/\b(smoking|drinking|habit|sugar|alcohol|cigarettes)\b/i.test(sentence)?'เลิก':'ยอมแพ้ / เลิก':markedWords.map(m=>text(m[1])).join(' '),sentenceTranslation=plain?.sentenceTranslation||text(translated);
    if(!meaning||meaning.length>250||!sentenceTranslation)throw Error('ยังแยกความหมายของคำนี้ไม่ได้ เปิดเว็บแปลเพื่อดูประโยคเต็มได้');
    return remember(id,{meaning,sentenceTranslation,provider:engine,meaningProvider:engine==='mymemory'&&giveUp&&(separated||markedWords.length!==1)?'contextly':engine,contextAdjusted:!!plain?.contextAdjusted});
  }
  async function translateSentenceResult(sentence,signal,override){
    if(signal?.aborted)throw new DOMException('Canceled','AbortError');const chosen=override||provider(),engine=chosen==='gemini'?'google':chosen,id=JSON.stringify([engine,'sentence',sentence,...(engine==='google'?['context-v1']:[])]);
    if(cache.has(id))return {...cache.get(id),provider:cache.get(id).provider||engine,cached:true,preview:chosen==='gemini'};
    if(engine==='mymemory'&&/^\s*(never|don['’]t|do not)\s+give\s+up[.!]?\s*$/i.test(sentence))return {meaning:'',sentenceTranslation:'อย่ายอมแพ้',provider:'contextly'};
    const input=engine==='google'?(window.ContextSense?.rewrite(sentence)||sentence):sentence;
    const translated=text(await requestTranslation(input,signal,engine));const result=remember(id,{meaning:'',sentenceTranslation:translated,provider:engine,contextAdjusted:input!==sentence});return {...result,preview:chosen==='gemini'};
  }
  async function translateSentence(sentence,signal){return (await translateSentenceResult(sentence,signal)).sentenceTranslation;}
  return {suggest,translateSentence,translateSentenceResult};
})();
