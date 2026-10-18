/* Loaded after the app: shares its IndexedDB helpers and escaped rendering. */
let reviewActive=false,reviewTotal=0,reviewHelp={},cardFlipped=false,cardScheduled=true,writingWord=null;
let recallView='card',cardAssisted=false,ratingBusy=false,reviewAwaitingNext=false,reviewRunId=0,sessionResults=[],sessionWords=[],repeatIds=new Set();
let recallAgeFilter='all';try{const saved=sessionStorage.getItem('contextly.recallAgeFilter.v1');if(['all','today','three','seven'].includes(saved))recallAgeFilter=saved;}catch{}
const shortDate=value=>new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',timeZone:'Asia/Bangkok'}).format(new Date(value));
async function refreshReminders(){
 if(!db)return;
 try{
  const words=await getAll(),due=words.filter(w=>RecallPlan.due(w,now())).sort((a,b)=>risk(b)-risk(a)),count=due.length;
  $('openDueRecall').textContent=count?'เปิด '+due[0].word:'เปิดการ์ด';$('openDueRecall').onclick=()=>{if(due[0])openCardById(due[0].id);};
  $('dueBadge').textContent=count?String(count):'';$('dueBadge').classList.toggle('hidden',!count);
  if(window.AppAlerts)AppAlerts.notifyDue(words).catch(()=>{});$('dueNotice').classList.toggle('hidden',!count);$('dueNoticeText').textContent='ถึงเวลาทบทวน '+count+' คำ';
 }catch{$('dueNotice').classList.add('hidden');}
}
function recallContextHtml(word){
 const sentence=String(word.sentence||'');let parts=window.WordSelection?.validate(sentence,word.selectedParts||[])||[];
 if(!parts.length&&word.word){
  const literal=String(word.word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),match=new RegExp('(^|[^A-Za-z])('+literal+')(?=$|[^A-Za-z])','i').exec(sentence);
  if(match)parts=[{start:match.index+match[1].length,length:match[2].length}];
 }
 let html='',cursor=0;for(const part of parts){html+=escapeHtml(sentence.slice(cursor,part.start))+'<mark>'+escapeHtml(sentence.slice(part.start,part.start+part.length))+'</mark>';cursor=part.start+part.length;}return html+escapeHtml(sentence.slice(cursor));
}
function resetRecallSession(words){
 reviewRunId++;sessionResults=[];sessionWords=words.map(w=>w.id);repeatIds=new Set();queue=words;reviewed=0;reviewTotal=words.length;reviewActive=words.length>0;ratingBusy=false;reviewAwaitingNext=false;
}
function nextReviewLabel(word,rating){
 if(!cardScheduled)return '';const distance=Math.max(1,Math.round((RecallPlan.next(word,rating,now()).dueAt-now())/day));return distance===1?'พรุ่งนี้':'อีก '+distance+' วัน';
}
function renderRecallAgeFilters(words){
 const at=now();
  const labels={all:'ทั้งหมด',today:'วันนี้',three:'3–6 วันที่แล้ว',seven:'7 วันขึ้นไป'};document.querySelectorAll('[data-recall-age]').forEach(button=>{const group=button.dataset.recallAge;button.innerHTML='<span>'+labels[group]+'</span><small>'+words.filter(word=>RecallPlan.inAgeGroup(word,group,at)).length+'</small>';button.setAttribute('aria-pressed',String(group===recallAgeFilter));button.onclick=()=>{recallAgeFilter=group;try{sessionStorage.setItem('contextly.recallAgeFilter.v1',group);}catch{}startRecallSession();};});
}
async function startRecallSession(){
 try{
  const words=await getAll(),at=now(),scope=words.filter(word=>RecallPlan.inAgeGroup(word,recallAgeFilter,at)),due=scope.filter(w=>RecallPlan.due(w,at)).sort((a,b)=>risk(b)-risk(a)),upcoming=scope.filter(w=>!RecallPlan.due(w,at)).sort((a,b)=>a.dueAt-b.dueAt);
  renderRecallAgeFilters(words);
  resetRecallSession([...due,...upcoming]);
  if(reviewActive)renderReview();else{recallView='empty';$('progress').textContent='';$('review').innerHTML=words.length?'<div class="recall-empty"><h3>ยังไม่มีคำในช่วงนี้</h3><button id="showAllRecall">ดูทั้งหมด</button></div>':'<div class="recall-empty"><span aria-hidden="true">✦</span><h3>เริ่มจากคำแรก</h3><button id="addFirstWord">เพิ่มคำ</button></div>';if(words.length)$('showAllRecall').onclick=()=>{recallAgeFilter='all';startRecallSession();};else $('addFirstWord').onclick=()=>page('add');}
 }catch(e){$('review').textContent='อ่านข้อมูลไม่ได้: '+e.message;}
}
async function loadReview(){await startRecallSession();}
async function openCardById(id){
 if(!db)return;
 try{
  const words=await getAll(),word=words.find(w=>w.id===id);
  document.querySelectorAll('main>.panel').forEach(section=>section.classList.toggle('hidden',section.id!=='today'));
  document.querySelectorAll('[data-page]').forEach(button=>{button.classList.toggle('secondary',button.dataset.page!=='today');button.setAttribute('aria-current',button.dataset.page==='today'?'page':'false');});window.scrollTo?.({top:0,behavior:'auto'});
  if(!word){reviewRunId++;recallView='empty';reviewActive=false;$('progress').textContent='';$('review').textContent='ไม่พบการ์ดนี้ในเครื่องนี้';return;}
  recallAgeFilter='all';renderRecallAgeFilters(words);resetRecallSession([word,...words.filter(item=>item.id!==word.id).sort((a,b)=>risk(b)-risk(a))]);renderReview();
 }catch(e){$('review').textContent='เปิดการ์ดไม่ได้: '+e.message;}
}
function renderReview(){
 const word=queue[0];if(!word){renderRecallComplete();return;}
 recallView='card';cardFlipped=false;cardAssisted=false;ratingBusy=false;reviewAwaitingNext=false;cardScheduled=RecallPlan.due(word,now());writingWord=null;
 const retry=repeatIds.has(word.id)&&sessionResults.some(result=>result.id===word.id);
 $('progress').textContent=(reviewed+1)+' / '+reviewTotal+' · '+(retry?'ลองนึกอีกครั้ง':cardScheduled?'ถึงเวลาทบทวน':'ฝึกเพิ่มเติม');
 $('review').innerHTML='<progress class="recall-session-progress" value="'+reviewed+'" max="'+reviewTotal+'" aria-label="ความคืบหน้ารอบนี้"></progress><button id="flipRecall" class="flash-card recall-focus-card" aria-label="ดูคำแปล '+escapeHtml(word.word)+'" aria-expanded="false" aria-controls="flashAnswer" aria-describedby="recallSwipeHint"><small id="flipHint">นึกความหมาย</small><div class="word">'+escapeHtml(word.word)+'</div><div id="recallFreshExample" class="recall-fresh-example"><p class="recall-example-en">'+recallContextHtml(word)+'</p><small>ประโยคที่บันทึก</small></div><small id="recallSwipeHint" class="recall-gesture-hint">แตะดูคำแปล · ปัดเปลี่ยนคำ</small><div id="flashAnswer" class="hidden"><div class="flash-answer">'+escapeHtml(word.meaning)+'</div></div></button><div id="recallWordTools"></div><button id="retryRecallExample" type="button" class="secondary hidden">สร้างประโยคใหม่</button><div id="recallPromptActions" class="recall-prompt-actions"><button id="showContext" class="secondary" aria-expanded="false" aria-controls="recallContext">ดูบริบท</button><button id="revealRecall">ดูคำแปล</button></div><div class="recall-controls"><div id="cardRatings" class="rating recall-rating" role="group" aria-label="จำความหมายได้แค่ไหน">'+WordProgress.ratings.map(([value,label])=>'<button data-rating="'+value+'" class="rating-'+value.toLowerCase()+'"><span>'+label+'</span><small>'+escapeHtml(nextReviewLabel(word,value))+'</small></button>').join('')+'</div><div class="recall-primary-action"><button id="previousRecall" type="button" class="recall-previous" aria-label="คำก่อนหน้า"><span aria-hidden="true">←</span></button><button id="backToRecall" type="button" class="recall-next"><span>คำถัดไป</span><span aria-hidden="true">→</span></button></div></div><div id="recallExamples" class="hidden"></div><div id="recallContext" class="recall-context hidden"><p>'+recallContextHtml(word)+'</p><p id="recallContextTranslation" class="muted hidden">'+escapeHtml(word.sentenceTranslation||'')+'</p><small id="recallHintStatus" role="status"></small></div><div class="recall-footer"><button id="openWriting" class="secondary">แต่งประโยค</button><button id="contextAfterAnswer" class="secondary hidden" aria-expanded="false" aria-controls="recallContext">บริบท</button></div><p id="reviewMessage" role="status"></p>';
 if(window.WordTools)WordTools.mount($('recallWordTools'),word);
 window.RecallExample?.mount($('recallFreshExample'),word,{isRevealed:()=>cardFlipped,onContext:()=>{if(!cardFlipped)cardAssisted=true;},retry:$('retryRecallExample')});
 function toggleContext(){
  const show=$('recallContext').classList.contains('hidden');$('recallContext').classList.toggle('hidden',!show);$('showContext').setAttribute('aria-expanded',String(show));$('contextAfterAnswer').setAttribute('aria-expanded',String(show));
  if(show&&!cardFlipped){cardAssisted=true;$('recallHintStatus').textContent='รอบนี้ใช้บริบทช่วย';}
 }
 function reveal(){
  if(ratingBusy||cardFlipped)return;cardFlipped=true;window.RecallExample?.reveal($('recallFreshExample'));$('flashAnswer').classList.remove('hidden');$('cardRatings').classList.remove('hidden');$('recallPromptActions').classList.add('hidden');$('contextAfterAnswer').classList.remove('hidden');$('recallContextTranslation').classList.toggle('hidden',!word.sentenceTranslation);$('recallHintStatus').textContent=cardAssisted?'ใช้บริบทช่วยนึก':'';$('flipRecall').classList.add('is-revealed');$('flipRecall').setAttribute('aria-expanded','true');$('flipRecall').setAttribute('aria-label',word.word+' — '+word.meaning);$('flipHint').textContent='ความหมาย';$('recallExamples').classList.remove('hidden');window.WordExamples?.mount($('recallExamples'),word,{expanded:true});$('flipRecall').focus?.({preventScroll:true});
 }
 $('flipRecall').onclick=event=>{if(!window.RecallSwipe?.ignoreClick(event))reveal();};$('revealRecall').onclick=reveal;$('showContext').onclick=toggleContext;$('contextAfterAnswer').onclick=toggleContext;
 const advance=()=>{renderReview();$('progress').scrollIntoView?.({block:'start',behavior:'auto'});},canNext=()=>!ratingBusy&&(reviewAwaitingNext||queue.length>1),canPrevious=()=>!ratingBusy&&!reviewAwaitingNext&&queue.length>1;
 const next=()=>{if(!canNext())return;if(reviewAwaitingNext){reviewAwaitingNext=false;advance();return;}queue.push(queue.shift());advance();},previous=()=>{if(!canPrevious())return;queue.unshift(queue.pop());advance();};
 $('backToRecall').disabled=!canNext();$('backToRecall').onclick=next;$('previousRecall').disabled=!canPrevious();$('previousRecall').onclick=previous;$('recallSwipeHint').classList.toggle('hidden',queue.length<2);window.RecallSwipe?.mount($('flipRecall'),{onNext:next,onPrevious:previous,canNext,canPrevious});$('openWriting').disabled=!WordProgress.fluent(word);$('openWriting').onclick=()=>renderWriting(word);
 document.querySelectorAll('[data-rating]').forEach(button=>button.onclick=()=>rate(word,button.dataset.rating));
 $('flipRecall').focus?.({preventScroll:true});
}
async function rate(word,rating){
 if(ratingBusy||reviewAwaitingNext||!['Again','Hard','Good','Easy'].includes(rating)||queue[0]?.id!==word.id)return;
 ratingBusy=true;const run=reviewRunId,answerRevealed=cardFlipped,assisted=cardAssisted||answerRevealed,showLearning=!answerRevealed&&['Again','Hard'].includes(rating),scheduled=cardScheduled,retry=repeatIds.has(word.id)&&sessionResults.some(result=>result.id===word.id),buttons=[...document.querySelectorAll('#review button')],disabledBefore=new Map(buttons.map(button=>[button,button.disabled]));buttons.forEach(b=>b.disabled=true);
 try{
  const current=(await getAll()).find(w=>w.id===word.id);if(!current)throw Error('คำนี้ถูกลบแล้ว');
  if(run!==reviewRunId)return;
  const at=now(),entry={at,rating,mode:'card',direction:'en-th',selfRated:true,createdSentence:'',assisted,answerRevealed,hintUsed:cardAssisted,retry};let updated;
  if(scheduled){
   if(current.dueAt!==word.dueAt){$('reviewMessage').textContent='คำนี้ทบทวนแล้ว';return;}
   updated=WordProgress.apply(current,rating,at,entry,true);
  }else updated=WordProgress.apply(current,rating,at,entry,false);
  await put(updated);if(run!==reviewRunId)return;
  sessionResults.push({id:word.id,word:word.word,rating,assisted,retry});queue.shift();reviewed++;
  if(rating==='Again'&&!repeatIds.has(word.id)){repeatIds.add(word.id);queue.push(updated);reviewTotal++;}
  if(showLearning){reviewAwaitingNext=true;ratingBusy=false;$('flipRecall').onclick();$('backToRecall').disabled=false;$('openWriting').disabled=!WordProgress.fluent(updated);$('reviewMessage').textContent='บันทึกแล้ว · ทบทวนแล้วกดคำถัดไป';refreshReminders();return;}
  renderReview();refreshReminders();
 }catch(e){if(run===reviewRunId)$('reviewMessage').textContent='บันทึกไม่สำเร็จ: '+e.message;}
 finally{if(run===reviewRunId){ratingBusy=false;buttons.forEach(button=>button.disabled=reviewAwaitingNext&&button.dataset.rating?true:disabledBefore.get(button));if(reviewAwaitingNext){$('backToRecall').disabled=false;$('previousRecall').disabled=true;$('openWriting').disabled=true;}}}
}
function renderRecallComplete(){
 recallView='complete';reviewActive=false;const first=sessionResults.filter(result=>!result.retry),recalled=first.filter(result=>!result.assisted&&['Good','Easy'].includes(result.rating)).length,helped=first.filter(result=>result.assisted).length;
 $('progress').textContent='';$('review').innerHTML='<div class="recall-complete"><div class="recall-success" aria-hidden="true">✓<i></i><i></i><i></i></div><h3>ครบแล้ว</h3><p class="muted">'+first.length+' คำ · ทวนซ้ำ '+sessionResults.filter(result=>result.retry).length+' ครั้ง</p><div class="recall-summary"><div><strong>'+recalled+'</strong><span>นึกได้เอง</span></div><div><strong>'+helped+'</strong><span>ใช้บริบทช่วย</span></div></div><button id="repeatSession">ทวนอีกรอบ</button><button id="completeAdd" class="secondary">เพิ่มคำ</button></div>';
 $('repeatSession').onclick=async()=>{try{const all=await getAll();resetRecallSession(sessionWords.map(id=>all.find(w=>w.id===id)).filter(Boolean));if(queue.length)renderReview();else await startRecallSession();}catch(e){$('review').textContent='อ่านข้อมูลไม่ได้: '+e.message;}};$('completeAdd').onclick=()=>page('add');
}
function renderWriting(word){window.WritingUI?.open(word.id);}
document.addEventListener('DOMContentLoaded',()=>{const id=new URL(location.href).searchParams.get('card');if(id){const wait=setInterval(()=>{if(db){clearInterval(wait);openCardById(id);}},50);setTimeout(()=>clearInterval(wait),10000);}});
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='open-card'&&typeof event.data.id==='string')openCardById(event.data.id);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshReminders();});
window.addEventListener('focus',refreshReminders);
setInterval(()=>{if(!document.hidden)refreshReminders();},60000);

