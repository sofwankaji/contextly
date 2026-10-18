window.SmartCompletion=(()=>{
 const source=document.getElementById('sourceSentence'),ghost=document.getElementById('sentenceGhost'),menu=document.getElementById('completionSuggestions'),hint=document.getElementById('completionHint'),legacyButton=document.getElementById('acceptCompletion');
 let timer,serial=0,composing=false,options=[],active=0,snapshot='',caret=0,dismissed=null;
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function drawGhost(){
  const value=source.value,item=options[active];let tail='';if(item&&caret===value.length&&item.end===value.length&&item.word.startsWith(value.slice(item.start,caret)))tail=item.word.slice(caret-item.start);
  ghost.innerHTML=escape(value)+(tail?'<span class="completion">'+escape(tail)+'</span>':'');ghost.scrollTop=source.scrollTop;ghost.scrollLeft=source.scrollLeft;
 }
 function clear(){options=[];menu.replaceChildren();menu.classList.add('hidden');hint.textContent='';legacyButton.classList.add('hidden');drawGhost();}
 function drawOptions(){
  menu.innerHTML=options.map((item,i)=>{const left=snapshot.slice(Math.max(0,item.start-50),item.start),right=snapshot.slice(item.end,item.end+50),preview=(item.start>50?'… ':'')+left,label=item.correction?'แก้ '+item.from+' เป็น '+item.word:'เติม '+item.word;return '<button type="button" class="completion-option'+(i===active?' is-current':'')+'" data-completion-index="'+i+'" aria-label="'+escape(label)+'"><strong>'+(item.correction?'<del>'+escape(item.from)+'</del> <span aria-hidden="true">→</span> ':'')+escape(item.word)+'</strong><span>'+escape(preview)+'<mark>'+escape(item.word)+'</mark>'+escape(right)+(snapshot.length>item.end+50?' …':'')+'</span>'+(item.reason?'<small>'+escape(item.reason)+'</small>':'')+'</button>';}).join('');
  menu.classList.toggle('hidden',!options.length);legacyButton.classList.add('hidden');hint.textContent=options.length?'แนะนำ '+options.map(item=>item.word).join(', '):'';drawGhost();
  menu.querySelectorAll('[data-completion-index]').forEach(button=>{button.addEventListener('mousedown',event=>event.preventDefault());button.onclick=()=>accept(Number(button.dataset.completionIndex));});
 }
 function render(){
  if(composing||document.activeElement!==source||source.selectionStart!==source.selectionEnd||dismissed===source.value){clear();return;}
  snapshot=source.value;caret=source.selectionStart;options=ContextSuggest.suggest(snapshot,caret);active=0;drawOptions();
 }
 function refresh(immediate=false){clearTimeout(timer);const current=++serial;if(dismissed!==source.value)dismissed=null;clear();if(immediate)render();else timer=setTimeout(()=>{if(current===serial)render();},100);}
 function accept(index=active){
  const item=options[index];if(!item||source.value!==snapshot||source.selectionStart!==caret||source.selectionEnd!==caret){refresh();return;}
  source.focus();source.setRangeText(item.word,item.start,item.end,'end');clear();source.dispatchEvent(new Event('input',{bubbles:true}));
 }
 source.addEventListener('keydown',event=>{
  if(composing)return;
  if(event.key==='Escape'){dismissed=source.value;clearTimeout(timer);serial++;clear();}
  else if(options.length&&event.key==='Tab'&&!event.shiftKey){event.preventDefault();accept();}
  else if(options.length&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;drawOptions();}
 });
 source.addEventListener('click',()=>refresh());source.addEventListener('focus',()=>refresh());
 source.addEventListener('keyup',event=>{if(!['Tab','ArrowDown','ArrowUp','Escape','Enter'].includes(event.key))refresh();});
 source.addEventListener('blur',event=>{if(menu.contains(event.relatedTarget))return;clearTimeout(timer);serial++;clear();});
 source.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);serial++;clear();});source.addEventListener('compositionend',()=>{composing=false;refresh();});source.addEventListener('scroll',drawGhost);
 legacyButton.addEventListener('click',()=>accept());
 async function learnSavedSentences(){try{const records=await getAll();ContextSuggest.setPersonal(records.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(record=>record.sentence));refresh();}catch{}}
 ContextSuggest.setExamples(['She runs a small business.','I feel comfortable at home.','She feels confident today.','They are running in the park.','I want to improve my English.','Never give up on your dreams.','He sat on the bank of the river.']);
 Promise.allSettled([fetch('./vendor/common-english.txt').then(response=>{if(!response.ok)throw Error();return response.text();}),fetch('./suggest-examples.txt').then(response=>{if(!response.ok)throw Error();return response.text();})]).then(results=>{if(results[0].status==='fulfilled')ContextSuggest.setVocabulary(results[0].value.split(/\r?\n/));if(results[1].status==='fulfilled')ContextSuggest.setExamples(results[1].value.split(/\r?\n/));refresh();});
 return {refresh,accept,learnSavedSentences,learnSentence:sentence=>ContextSuggest.addPersonal(sentence)};
})();
