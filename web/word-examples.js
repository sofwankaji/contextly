window.WordExamples=(()=>{
 const memo=new Map(),packs=[];
 function pack(base,cues,examples,collocations){packs.push({base,cues:cues.split('|'),examples,collocations});}
 pack('run','business|company|shop|restaurant|ธุรกิจ|บริหาร',['She runs a small business from home.','They run a family business together.','He runs a successful shop in his hometown.'],['run a business','run a company','run a shop']);
 pack('run','park|morning|marathon|exercise|วิ่ง',['She runs in the park every morning.','They ran five kilometres before breakfast.','He likes running along the river.'],['go for a run','run a marathon','run every morning']);
 pack('bank','river|stream|water|ฝั่ง|ตลิ่ง',['We sat on the bank of the river.','Trees grew along the river bank.','They walked down the muddy bank to the water.'],['river bank','on the bank of the river','along the bank']);
 pack('bank','money|account|loan|deposit|ธนาคาร',['She deposited some money in the bank.','He went to the bank to open an account.','The bank approved their loan application.'],['bank account','bank loan','deposit money in a bank']);
 pack('support','chair|weight|roof|beam|carry|รับน้ำหนัก|รองรับ',['This chair can support his weight.','The wooden beam supports the roof.','The shelf is strong enough to support the books.'],['support the weight','support a roof','provide structural support']);
 pack('support','friend|team|decision|family|help|สนับสนุน|ช่วย',['Her friends supported her decision.','We support each other during difficult times.','His family gave him the support he needed.'],['support a decision','support each other','give someone support']);
 pack('support','theory|evidence|finding|discover|claim|argument|research|study|ทฤษฎี|หลักฐาน',['The new findings support his theory.','They found evidence to support the claim.','Her research supports the proposed explanation.'],['support a theory','support a claim','evidence to support an argument']);
 pack('give up','smoking|drinking|habit|sugar|เลิก',['He gave up smoking last year.','She wants to give up this unhealthy habit.','They decided to give up drinking alcohol.'],['give up smoking','give up a habit','give something up']);
 pack('give up','dream|try|goal|hope|never|ยอมแพ้',['After several failed attempts, he gave up on the project.','Never give up on your dreams.','They did not give up when the task became difficult.'],['give up on a dream','refuse to give up','never give up']);
 pack('laconic','reply|answer|interrogation|detective|response|ห้วน|สั้น',['The witness gave a laconic reply during the interview.','Her laconic answers made the detectives ask more questions.','He offered a laconic response and said nothing more.'],['laconic reply','laconic response','laconic answer']);
 pack('retrieve','file|data|document|password|ข้อมูล|ไฟล์',['She retrieved the file from the archive.','The system can retrieve the data in a few seconds.','He retrieved the deleted document from his backup.'],['retrieve a file','retrieve data','retrieve a document']);
 pack('retrieve','kidney|liver|organ|tissue|cell|donor|อวัยวะ',['The medical team retrieved tissue samples for the study.','The researchers retrieved the stored samples from the laboratory.','The team carefully retrieved the donated organs.'],['retrieve tissue samples','retrieve donated organs','retrieve stored samples']);
 pack('confident','interview|english|decision|feel|มั่นใจ',['She feels confident about her decision.','He sounded confident during the interview.','They became more confident after practising together.'],['feel confident','confident about a decision','confident in your abilities']);
 pack('comfortable','feel|home|room|wear|สบาย',['I feel comfortable speaking English with my friends.','She feels comfortable in her new home.','He became more comfortable with the task after practising.'],['feel comfortable','comfortable with something','comfortable doing something']);
 pack('resilient','challenge|obstacle|failure|difficulty|เข้มแข็ง|ฟื้น',['She remained resilient despite the setbacks.','The team stayed resilient when the project became difficult.','He learned to be more resilient after facing several challenges.'],['remain resilient','a resilient person','resilient in the face of adversity']);
 pack('interrogation','detective|police|witness|question|สอบสวน',['The detectives continued the interrogation after the break.','During the interrogation, the witness answered only a few questions.','The police conducted a lengthy interrogation.'],['conduct an interrogation','police interrogation','during an interrogation']);
 pack('suspicion','detective|reply|police|raise|สงสัย',['Her unusual reply raised suspicions among the detectives.','His behaviour aroused suspicion during the interview.','The investigators tried to confirm their suspicions.'],['raise suspicions','arouse suspicion','confirm a suspicion']);
 pack('healthy','donor|diet|body|exercise|สุขภาพ',['The doctor examined the healthy donor.','A healthy donor volunteered for the study.','The team confirmed that the donor was healthy.'],['healthy donor','healthy individual','remain healthy']);
 pack('donor','organ|blood|kidney|healthy|บริจาค',['A healthy donor volunteered for the study.','The team spoke with the donor before the procedure.','The hospital contacted a potential donor.'],['healthy donor','potential donor','organ donor']);
 pack('improve','english|skill|practice|pronunciation|พัฒนา|ปรับปรุง',['She practises every day to improve her English.','They improved their communication skills through regular practice.','He wants to improve his pronunciation.'],['improve your English','improve pronunciation','improve a skill']);
 pack('study','english|exam|school|library|เรียน|ศึกษา',['She studies English at the library.','They studied together before the exam.','He wants to study abroad next year.'],['study English','study for an exam','study abroad']);
 pack('legitimate','law|legal|concern|request|reason|decision|ถูกต้อง|กฎหมาย',['She raised a legitimate concern about the decision.','The court considered the request legitimate.','They questioned whether the new law was legitimate.'],['legitimate concern','legitimate request','legitimate reason']);
 pack('ceasefire','ceasefire|หยุดยิง',['The two sides agreed to a temporary ceasefire.','The ceasefire allowed civilians to leave the area.','Both sides promised to respect the ceasefire.'],['agree to a ceasefire','temporary ceasefire','violate a ceasefire']);
 pack('pervasive','pervasive|แพร่หลาย',['A pervasive sense of anxiety affected the whole team.','The problem became pervasive throughout the organisation.','She noticed the pervasive influence of social media.'],['pervasive influence','pervasive problem','pervasive sense of something']);
 pack('knock','flat|down|back|impact|collision|กระแทก|ล้ม',['The impact knocked him flat on his back.','She was knocked flat and stayed on the ground.','The force of the collision knocked them down.'],['knock someone flat','knock someone down','be knocked flat']);
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function tokens(text){return [...String(text).matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)].map(match=>({word:match[0],lower:match[0].toLowerCase(),start:match.index,end:match.index+match[0].length}));}
 function forms(word){try{return window.nlp?.(word).verbs().conjugate()[0]||null;}catch{return null;}}
 function build(record){
  const key=JSON.stringify([record.word,record.sentence,record.meaning,record.selectedParts]),existing=memo.get(key);if(existing)return existing;
  const word=String(record.word||'').trim(),sentence=String(record.sentence||'').trim(),parts=window.WordSelection?.validate(sentence,record.selectedParts||[])||[],info=window.WordTools?.analyze(word,sentence,parts)||{pos:'',base:word.toLowerCase()},base=info.base||word.toLowerCase(),context=(sentence+' '+String(record.meaning||'')).toLowerCase();
  const selected=packs.filter(item=>item.base===base).map(item=>({item,score:item.cues.reduce((score,cue)=>score+(sentence.toLowerCase().includes(cue)?4:String(record.meaning||'').toLowerCase().includes(cue)?1:0),0)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score)[0]?.item;
  let examples=[],collocations=[],source='template';
  if(selected){examples=selected.examples.slice();collocations=selected.collocations.slice();source='curated';}
  else{
   const list=tokens(sentence),offset=parts[0]?.start??sentence.toLowerCase().indexOf(word.toLowerCase().split(/\s+/)[0]),index=list.findIndex(item=>item.start===offset),first=list[index];
   let tags=[];try{tags=window.nlp?.(sentence).terms().json({offset:true})||[];}catch{}
   const tagAt=item=>new Set(tags.find(row=>row.offset?.start===item?.start)?.terms?.[0]?.tags||[]);
   let verbIndex=info.pos==='verb'?index:info.pos==='adverb'||info.pos==='preposition'?list.slice(0,index).findLastIndex(item=>tagAt(item).has('Verb')):-1;
   if(verbIndex>=0){
    const verb=list[verbIndex],conjugated=forms(verb.lower);let tail=sentence.slice(verb.end).split(/[,;.!?\n]/)[0].trim();
    if(tail.length>220)tail=tail.slice(0,220).replace(/\s+\S*$/,'');
    if(conjugated?.Infinitive&&conjugated.PastTense&&tail.length<=220){
     const stem=conjugated.Infinitive,rest=tail?' '+tail:'',before=sentence.slice(0,verb.start).toLowerCase(),negative=/\bnot\b|\bnever\b|n't\b/.test(before),passiveContext=(tagAt(verb).has('Passive')||tagAt(verb).has('PastParticiple'))&&/(?:\b(?:am|is|are|was|were|been|being)|['’](?:m|re|s))\s*$/i.test(before);
     if(passiveContext){
      const prefix=sentence.slice(0,verb.start).trim(),subject=prefix.replace(/(?:\s+(?:(?:am|is|are|was|were|have|has|had|been|being)\s*)+|['’](?:m|re|s))$/i,'').trim()||'They',owner=window.ContextGrammar?.context(tokens(subject).map(item=>item.lower)),copula=owner?.agreement==='plural'?'were':'was',shortTail=tail.split(/\s+(?:and|but)\s+/i)[0],passive=verb.lower+(shortTail?' '+shortTail:'');
      examples=[subject+' '+copula+' '+passive+'.',subject+' could be '+passive+'.',subject+' might be '+passive+'.'];collocations.push('be '+passive);
     }else if(stem==='be')examples=['They are'+rest+'.','My friend was'+rest+'.','They might be'+rest+'.'];
     else examples=negative?["They don't "+stem+rest+'.',"My friend didn't "+stem+rest+'.','They might not '+stem+rest+'.']:['They '+stem+rest+'.','My friend '+conjugated.PastTense+rest+'.','They might '+stem+rest+'.'];
     const phrase=tokens(stem+rest).slice(0,6).map(item=>item.lower).join(' ');if(!passiveContext&&phrase.split(' ').length>1)collocations.push(phrase);
    }
   }
   if(!examples.length&&first&&(info.pos==='noun'||info.pos==='adjective'||word.includes(' '))){
    let phrase=word.toLowerCase();
    if(info.pos==='adjective'&&tagAt(list[index+1]).has('Noun'))phrase+=' '+list[index+1].lower;
    else if(info.pos==='noun'&&tagAt(list[index-1]).has('Adjective'))phrase=list[index-1].lower+' '+phrase;
    if(info.pos==='adjective'&&!tagAt(list[index+1]).has('Noun')){
     const noun=list.slice(0,index).findLast(item=>tagAt(item).has('Noun')&&!tagAt(item).has('Pronoun'));
     if(noun){const subject=tagAt(noun).has('ProperNoun')?noun.word:'The '+noun.lower,object=tagAt(noun).has('ProperNoun')?noun.word:'the '+noun.lower,copula=tagAt(noun).has('Plural')?'were':'was';examples=[subject+' seemed '+phrase+' in this situation.','They considered '+object+' '+phrase+'.',subject+' '+copula+' described as '+phrase+'.'];collocations.push(base+' '+noun.lower);}
     else examples=['She seemed '+phrase+' in this situation.','They remained '+phrase+' throughout the day.','He felt '+phrase+' after the meeting.'];
     if(['in','with','about','at','of','to'].includes(list[index+1]?.lower))collocations.push(base+' '+list[index+1].lower);
    }else{
     examples=['They discussed the '+phrase+' after the meeting.','We asked a question about the '+phrase+'.','The '+phrase+' needed more attention.'];
     if(phrase!==word.toLowerCase())collocations.push(phrase);
     const preceding=list[index-1]?.lower;if(['during','under','without','with','about','of','for','on'].includes(preceding))collocations.push(preceding+' '+base);
     const prevVerb=list.slice(Math.max(0,index-5),index).findLast(item=>tagAt(item).has('Verb'));if(prevVerb){const verb=forms(prevVerb.lower);if(verb?.Infinitive&&!['be','have'].includes(verb.Infinitive))collocations.push(verb.Infinitive+' '+word.toLowerCase());}
    }
   }
   if(!examples.length&&sentence){
    const predicate=list.find(item=>tagAt(item).has('Verb')&&!tagAt(item).has('Modal')),conjugated=predicate&&forms(predicate.lower),subject=predicate?sentence.slice(0,predicate.start).trim():'';
    if(conjugated?.Infinitive&&conjugated.PastTense&&subject&&tokens(subject).length<=8&&!/\b(if|when|because|although|that)\b/i.test(subject)){
     const rest=sentence.slice(predicate.end).replace(/[.!?]+$/,'').trim(),tail=rest?' '+rest:'',stem=conjugated.Infinitive;
     if(stem==='be'){const rule=window.ContextGrammar?.context(tokens(subject).map(item=>item.lower));examples=[subject+' '+(rule?.agreement==='plural'?'were':'was')+tail+'.',subject+' might be'+tail+'.',subject+' could be'+tail+'.'];}
     else examples=[subject+' '+conjugated.PastTense+tail+'.',subject+' might '+stem+tail+'.',subject+' could '+stem+tail+'.'];
    }
   }
   if(!examples.length&&sentence){examples=['The teacher used this example: “'+sentence+'”','We discussed the sentence “'+sentence+'” during the lesson.','She explained the meaning of “'+sentence+'” to her class.'];source='context';}
  }
  let pairSource=selected?'curated':'context';
  if(!collocations.length){pairSource='pattern';if(info.pos==='adjective')collocations=['be '+base,'seem '+base,'remain '+base];else if(info.pos==='verb'&&!['can','could','will','would','should','may','might','must'].includes(base)&&forms(base.split(' ')[0])?.Infinitive)collocations=['can '+base+' …','want to '+base+' …','try to '+base+' …'];else{const list=tokens(sentence),position=list.findIndex(item=>item.lower===word.toLowerCase().split(/\s+/)[0]);if(position>=0)collocations=[list.slice(Math.max(0,position-2),position+3).map(item=>item.word).join(' ')];}}
  const result={examples:[...new Set(examples)].slice(0,3),collocations:[...new Set(collocations)].filter(item=>item.length<=120).slice(0,3),source,pairSource,base};memo.set(key,result);if(memo.size>200)memo.delete(memo.keys().next().value);return result;
 }
 function highlight(sentence,record,base){
  const pieces=String(record.word||'').toLowerCase().split(/\s+/),verb=forms(base.split(' ')[0]),variants=new Set([pieces[0],base.split(' ')[0],verb?.Infinitive,verb?.PastTense,verb?.PresentTense,verb?.Gerund].filter(Boolean));let html='',cursor=0;
  for(const item of tokens(sentence)){if(!variants.has(item.lower)&&!pieces.slice(1).includes(item.lower))continue;html+=escape(sentence.slice(cursor,item.start))+'<mark>'+escape(sentence.slice(item.start,item.end))+'</mark>';cursor=item.end;}return html+escape(sentence.slice(cursor));
 }
 function mount(host,record,{expanded=false}={}){
  if(!host)return;const data=build(record);host.replaceChildren();host.className='word-examples';
  const details=document.createElement('details'),summary=document.createElement('summary');details.open=expanded;summary.textContent='ตัวอย่างและ Collocation';details.append(summary);
  const note=document.createElement('small');note.className='muted';note.textContent=data.source==='curated'?'ตัวอย่างตามความหมายในบริบท':data.source==='template'?'ประยุกต์จากบริบทเดิม':'ฝึกอ่านประโยคต้นฉบับ';details.append(note);
  const list=document.createElement('ol');for(const sentence of data.examples){const item=document.createElement('li'),text=document.createElement('span'),button=document.createElement('button');text.innerHTML=highlight(sentence,record,data.base);button.type='button';button.className='secondary example-listen';button.textContent='ฟัง';button.setAttribute('aria-label','ฟัง '+sentence);button.onclick=()=>window.WordTools?.listen(sentence).catch(()=>{});item.append(text,button);list.append(item);}details.append(list);
  if(data.collocations.length){const label=document.createElement('small');label.textContent=data.pairSource==='pattern'?'Collocation · รูปแบบใช้คำ':'Collocation';const pairs=document.createElement('div');pairs.className='collocation-chips';for(const phrase of data.collocations){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=phrase;button.setAttribute('aria-label','ฟัง '+phrase);button.onclick=()=>window.WordTools?.listen(phrase).catch(()=>{});pairs.append(button);}details.insertBefore(label,list);details.insertBefore(pairs,list);}
  host.append(details);
 }
 return {build,mount,highlight};
})();
