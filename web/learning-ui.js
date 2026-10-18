window.LearningUI=(()=>{
 function mountLibrary(details,word){
  const host=details.querySelector('.library-learning');if(!host)return;
  window.WordExamples?.mount(host,word);
  const ratings=document.createElement('div');ratings.className='memory-rating';ratings.setAttribute('role','group');ratings.setAttribute('aria-label','ประเมิน '+word.word);
  for(const [rating,label]of WordProgress.ratings){const button=document.createElement('button');button.type='button';button.className='memory-'+rating.toLowerCase();button.textContent=label;button.onclick=()=>assess(rating);ratings.append(button);}host.append(ratings);
  const status=document.createElement('p');status.className='muted';status.setAttribute('role','status');host.append(status);
  const writing=document.createElement('button');writing.type='button';writing.className='secondary';writing.textContent='แต่งประโยค';writing.hidden=!WordProgress.fluent(word);writing.onclick=()=>WritingUI.open(word.id);host.append(writing);
  let busy=false;
  async function assess(rating){
   if(busy)return;busy=true;for(const button of ratings.children)button.disabled=true;status.textContent='';
   try{const current=(await getAll()).find(item=>item.id===word.id);if(!current)throw Error('คำนี้ถูกลบแล้ว');const at=now(),entry={at,rating,mode:'library',direction:'en-th',selfRated:true,assisted:true};await put(WordProgress.apply(current,rating,at,entry,RecallPlan.due(current,at)));writing.hidden=rating!=='Good';status.textContent=rating==='Good'?'เพิ่มในหน้าแต่งประโยคแล้ว':WordProgress.ratings.find(item=>item[0]===rating)[1];const label=details.querySelector('.library-word-status');if(label){label.textContent=WordProgress.ratings.find(item=>item[0]===rating)[1];label.className='library-word-status memory-label-'+rating.toLowerCase();}refreshReminders();}
   catch(error){status.textContent='บันทึกไม่สำเร็จ: '+error.message;}finally{busy=false;for(const button of ratings.children)button.disabled=false;}
  }
 }
 return {mountLibrary};
})();
