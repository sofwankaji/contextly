window.LiveTranslation=(()=>{
 let timer=null,controller=null,serial=0,composing=false,pending=false;
 const source=document.getElementById('sourceSentence'),output=document.getElementById('sentenceTranslation'),status=document.getElementById('liveTranslationStatus');
 function queue(){
  clearTimeout(timer);controller?.abort();const id=++serial,sentence=source.value.trim();
  status.textContent='';pending=!!sentence&&!composing;updateSaveState();window.PremiumUI?.syncTranslation();if(!pending)return;
  timer=setTimeout(async()=>{
   timer=null;const current=new AbortController();controller=current;const timeout=setTimeout(()=>current.abort(),15000),oldValue=output.value;
   const engine=window.OnlineTranslation?.provider();status.textContent='กำลังแปลด้วย '+(window.TranslationStatus?.name(engine==='gemini'?'google':engine)||'ตัวแปล')+'…';window.PremiumUI?.syncTranslation();
   try{
    const result=ContextMeaning.translateSentenceResult?await ContextMeaning.translateSentenceResult(sentence,current.signal):{sentenceTranslation:await ContextMeaning.translateSentence(sentence,current.signal)};
    if(id!==serial||source.value.trim()!==sentence)return;
    if(output.value===oldValue){output.value=result.sentenceTranslation;window.TranslationStatus?.set('sentenceTranslation',result);saveDraft();}
    status.textContent='';
   }catch(e){if(id!==serial)return;status.textContent=e.name==='AbortError'?'แปลไม่สำเร็จ ลองพิมพ์อีกครั้ง':e.message;}
   finally{clearTimeout(timeout);if(id===serial){pending=false;updateSaveState();window.PremiumUI?.syncTranslation();}}
  },800);
 }
 source.addEventListener('input',queue);
 source.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);controller?.abort();serial++;pending=false;updateSaveState();});
 source.addEventListener('compositionend',()=>{composing=false;queue();});
 return {refresh:queue,isPending:()=>pending};
})();
