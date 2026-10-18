window.ContextSuggest=(()=>{
 const frequency=new Map(),known=new Set(),buckets=new Map(),profiles=new Map(),lemmas=new Map(),seed=new Map(),personal=new Map(),sentences=new Set(),seedWords=new Set();
 const words=text=>[...String(text).toLowerCase().replace(/’/g,"'").matchAll(/[a-z]+(?:'[a-z]+)*/g)].map(match=>match[0]);
 const determiner=new Set('a an the this that these those my your his her our their its'.split(' '));
 const auxiliary=new Set("am is are was were been being i'm you're we're they're he's she's it's isn't aren't wasn't weren't".split(' '));
 const modal=new Set('can could will would should may might must'.split(' '));
 const linking=new Set('feel feels felt seem seems seemed become becomes became look looks looked taste tastes remain remains stayed stay'.split(' '));
 const shortWords=new Set('ad am an as at ax be by do go he hi if in is it me my no of oh on or ox so to up us we'.split(' '));
 const feelings=new Set('afraid angry anxious ashamed calm cold comfortable confident confused content disappointed dissatisfied excited exhausted flattered frustrated grateful guilty happy hopeful hot ill insecure lonely nervous overwhelmed proud relaxed relieved responsible sad safe satisfied secure sick sleepy sorry strong surprised tense thirsty tired uncomfortable upset warm weak well worried'.split(' '));
 const topics=[
  ['money account deposit loan credit bank budget price economy profit investment revenue financial','bank business financial profit revenue savings investment money economic'],
  ['river water beach sea ocean forest trees rain garden nature','bank beach beautiful natural environment water river'],
  ['learn learning english language vocabulary pronunciation exam class book study lesson','improve learn practice practise study understand pronunciation vocabulary knowledge fluent fluency confident'],
  ['office business company manager interview project team job employee client meeting','professional successful business career communication confident opportunity significant'],
  ['health doctor hospital exercise fitness stress mental medicine','health healthy reduce relieve improve mitigate physical exercise'],
  ['feel confidence worried anxious calm despite challenges obstacles failure','confident comfortable resilient calm happy strong']
 ].map(([cue,target])=>({cue:new Set(cue.split(' ')),target:new Set(target.split(' '))}));
 function profile(word){
  if(profiles.has(word))return profiles.get(word);let tags=[];
  try{tags=window.nlp?.(word).terms().json()[0]?.terms?.[0]?.tags||[];}catch{}
  const value=new Set(tags);profiles.set(word,value);return value;
 }
 function rebuild(){
  known.clear();buckets.clear();const all=new Set([...frequency.keys(),...seedWords]);for(const sentence of sentences)for(const word of words(sentence))all.add(word);
  for(const word of all){if(word.length===2&&!shortWords.has(word))continue;known.add(word);if(!/^[a-z]{2,}$/.test(word))continue;const prefix=word.slice(0,2);if(!buckets.has(prefix))buckets.set(prefix,[]);buckets.get(prefix).push(word);}
 }
 function lemma(word){
  if(lemmas.has(word))return lemmas.get(word);let base=word;try{base=window.nlp?.('They '+word).verbs().toInfinitive().text().trim().toLowerCase()||word;}catch{}if(!/^[a-z]+$/.test(base))base=word;lemmas.set(word,base);return base;
 }
 const canonical=word=>profile(word).has('Verb')?lemma(word):word;
 function count(table,key){table.set(key,(table.get(key)||0)+1);}
 function indexSentence(table,sentence){
  for(const chunk of sentence.split(/[.!?;\n]+/)){
   const normalized=chunk.toLowerCase().replace(/’/g,"'"),matches=[...normalized.matchAll(/[a-z]+(?:'[a-z]+)*/g)],tokens=matches.map(match=>match[0]);let tagged=[];try{tagged=window.nlp?.(normalized).terms().json({offset:true})||[];}catch{}
   const bases=tokens.map((word,i)=>tagged.find(row=>row.offset?.start===matches[i].index)?.terms?.[0]?.tags?.includes('Verb')?lemma(word):word);
   for(let i=0;i<tokens.length;i++){
    if(i)for(const key of new Set([tokens[i-1]+' '+tokens[i],bases[i-1]+' '+tokens[i],tokens[i-1]+' '+bases[i]]))count(table,key);
    if(i>1)for(const key of new Set([tokens[i-2]+' '+tokens[i-1]+' '+tokens[i],bases[i-2]+' '+bases[i-1]+' '+tokens[i],tokens[i-2]+' '+bases[i-1]+' '+bases[i]]))count(table,key);
   }
  }
 }
 function setVocabulary(list){frequency.clear();list.slice(0,12000).forEach((word,i)=>{word=word.trim().toLowerCase();if(/^[a-z]{2,}$/.test(word)&&!frequency.has(word))frequency.set(word,i);});rebuild();}
 function setExamples(list){seed.clear();seedWords.clear();for(const sentence of list.slice(0,500)){indexSentence(seed,sentence);for(const word of words(sentence))seedWords.add(word);}rebuild();}
 function setPersonal(list){personal.clear();sentences.clear();for(const sentence of list){if(typeof sentence!=='string'||sentence.length>1600||sentences.has(sentence))continue;sentences.add(sentence);indexSentence(personal,sentence);if(sentences.size>=400)break;}rebuild();}
 function addPersonal(sentence){if(typeof sentence!=='string'||sentence.length>1600||sentences.has(sentence))return;setPersonal([sentence,...sentences]);}
 const evidence=key=>(seed.get(key)||0)+2*(personal.get(key)||0);
 function position(text,caret){
  if(!Number.isInteger(caret)||caret<0||caret>text.length)return null;const before=text.slice(0,caret),after=text.slice(caret);
  if(/[.!?]\s*$/.test(before)||/[^A-Za-z\s]$/.test(before))return null;
  const match=before.match(/[A-Za-z]+$/),prefix=match?.[0]||'',suffix=after.match(/^[A-Za-z]+/)?.[0]||'';
  if(prefix.length<2&&prefix)return null;if(!prefix&&!/\s$/.test(before))return null;
  const start=caret-prefix.length,end=caret+suffix.length;
  const left=words(text.slice(0,start).split(/[.!?;\n]/).at(-1)),right=words(text.slice(end).split(/[.!?;\n]/)[0]);
  if(!prefix&&!left.length)return null;return {start,end,prefix,token:(prefix+suffix).toLowerCase(),left,right};
 }
 function expected(left,right){
  const last=left.at(-1),previous=left.at(-2);if(!last)return '';
  const rule=window.ContextGrammar?.context(left,right);if(rule)return rule.inferred?'':rule.kind;
  if(modal.has(last))return 'base';
  if(last==='to'&&(['forward','accustomed','committed','dedicated'].includes(previous)||(previous==='used'&&left.slice(-4,-2).some(word=>auxiliary.has(word)))))return 'gerund';
  if(last==='to'&&!['go','went','going','travel','walk'].includes(previous))return 'base';
  if(linking.has(last))return 'adjective';if(auxiliary.has(last))return 'auxiliary';
  if(['he','she','it'].includes(last))return ['do','does','did',...modal].includes(previous)?'base':'third';if(['i','we','they','you'].includes(last))return 'subject';
  if(determiner.has(last))return right[0]&&profile(right[0]).has('Noun')?'adjective':'nominal';
  if(profile(last).has('Adjective')&&left.slice(-3,-1).some(word=>determiner.has(word)))return 'noun';
  if(['in','on','at','for','with','from','of','about','by','into','after','before','without'].includes(last))return 'object';return '';
 }
 function grammar(word,kind){
  if(!kind||!window.nlp)return 0;const tags=profile(word),has=tag=>tags.has(tag);
  if(kind==='base')return has('Infinitive')?18:has('Gerund')||has('Verb')?-14:-8;
  if(kind==='third')return has('PastTense')?10:has('Verb')&&has('PresentTense')&&!has('Infinitive')&&!has('Gerund')?18:has('Verb')?-14:-8;
  if(kind==='subject')return has('Infinitive')?18:has('PastTense')?10:has('Verb')?-14:-8;
  if(kind==='past')return has('PastTense')?18:has('Verb')?-14:-8;
  if(kind==='gerund')return has('Gerund')||has('Noun')?16:-16;
  if(kind==='adjective')return has('Adjective')?18:has('Adverb')?0:-10;
  if(kind==='auxiliary')return has('Adjective')||has('Gerund')||has('PastParticiple')||has('PastTense')?16:has('Infinitive')?-18:-8;
  if(kind==='nominal')return has('Noun')?14:has('Adjective')?8:-8;
  if(kind==='noun')return has('Noun')?16:has('Adjective')?0:-10;
  return has('Noun')||has('Gerund')?12:has('Adjective')?0:-8;
 }
 function suggest(text,caret){
  const corrections=window.ContextGrammar?.suggest(text,caret)||[];if(corrections.length)return corrections;
  const place=position(text,caret);if(!place)return [];const {prefix,left,right,start,end,token}=place,kind=expected(left,right);
  const contextRule=window.ContextGrammar?.context(left,right),rule=contextRule?.inferred?null:contextRule;
  if(prefix&&known.has(token)&&grammar(token,kind)>=0)return [];
  const pool=new Set();if(prefix){for(const word of buckets.get(prefix.toLowerCase().slice(0,2))||[]){if(word.startsWith(prefix.toLowerCase())&&word.length>token.length)pool.add(word);if(pool.size>=65)break;}}
  const prev=left.at(-1),prev2=left.slice(-2).join(' '),next=right[0],next2=right.slice(0,2).join(' '),prevKeys=new Set([prev,prev&&canonical(prev)]),prev2Keys=new Set([prev2,left.slice(-2).map(canonical).join(' ')]),nextKeys=new Set([next,next&&canonical(next)]),next2Keys=new Set([next2,right.slice(0,2).map(canonical).join(' ')]);
  for(const table of [seed,personal])for(const key of table.keys()){
   const parts=key.split(' ');let word;
   if(parts.length===2&&prevKeys.has(parts[0]))word=parts[1];else if(parts.length===3&&prev2Keys.has(parts.slice(0,2).join(' ')))word=parts[2];
   if(!word&&next&&parts.length===2&&nextKeys.has(parts[1]))word=parts[0];
   if(word&&(!prefix||word.startsWith(prefix.toLowerCase()))&&word!==token)pool.add(word);
  }
  const cues=new Set([...left,...right,...left.map(canonical),...right.map(canonical)]),activeTopics=topics.filter(topic=>[...cues].some(word=>topic.cue.has(word)));
  const scores=[];for(const word of pool){
   if(prefix&&word.length<=token.length)continue;
   const pair=prev?Math.max(...[...prevKeys].map(key=>evidence(key+' '+word))):0,tri=left.length>=2?Math.max(...[...prev2Keys].map(key=>evidence(key+' '+word))):0,rightPair=next?Math.max(...[...nextKeys].map(key=>evidence(word+' '+key))):0,rightTri=right.length>=2?Math.max(...[...next2Keys].map(key=>evidence(word+' '+key))):0;
   const support=pair+tri+rightPair+rightTri,fit=grammar(word,kind);if(!prefix&&support===0)continue;if(['base','gerund','third','subject','past'].includes(kind)&&fit<0)continue;if(rule&&!window.ContextGrammar.fits(word,rule))continue;if(kind&&fit<0&&support===0)continue;if(prefix&&known.has(token)&&(fit<=0||support===0))continue;
   const rank=frequency.get(word),prior=rank===undefined?0:Math.max(0,12-Math.log2(rank+2));
   const feeling=['feel','feels','felt'].includes(prev)?feelings.has(word)?20:support?0:-14:0;
   const score=prior+fit+20*Math.log2(1+pair)+34*Math.log2(1+tri)+20*Math.log2(1+rightPair)+28*Math.log2(1+rightTri)+activeTopics.filter(topic=>topic.target.has(word)).length*5+feeling;
   if(!prefix&&score<25)continue;
   let display=word;if(prefix.length>1&&prefix===prefix.toUpperCase())display=word.toUpperCase();else if(prefix&&/^[A-Z]/.test(prefix))display=word[0].toUpperCase()+word.slice(1);
   scores.push({word:display,start,end,preview:text.slice(0,start)+display+text.slice(end),score,support,grammar:fit,reason:window.ContextGrammar?.reason(word,rule)||''});
  }
  const ranked=scores.sort((a,b)=>b.score-a.score||a.word.localeCompare(b.word));return ranked.filter(item=>ranked[0].score-item.score<=32&&!(ranked[0].support&&item.support===0&&ranked[0].score-item.score>=15)).slice(0,3);
 }
 return {setVocabulary,setExamples,setPersonal,addPersonal,suggest};
})();
