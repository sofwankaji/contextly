window.ContextGrammar=(()=>{
 const modal=new Set("can could will would should may might must can't cannot couldn't won't wouldn't shouldn't mayn't mightn't mustn't".split(' '));
 const doForms=new Set("do does did don't doesn't didn't".split(' '));
 const pronouns={he:'third',she:'third',it:'third',i:'first',we:'plural',you:'plural',they:'plural',everyone:'third',everybody:'third',someone:'third',somebody:'third',nobody:'third'};
 const articles=new Set('a an the this that these those my your his her its our their some any each every two three many several both all'.split(' '));
 const prepositions=new Set('with without of in on at for from near beside'.split(' '));
 const predicative=new Set('happy sad tired hungry thirsty angry afraid worried excited confused ready busy late calm comfortable confident proud nervous sick'.split(' '));
 const tagsCache=new Map(),formsCache=new Map(),subjectCache=new Map();
 function tags(word){if(!tagsCache.has(word)){let list=[];try{list=window.nlp?.(word).terms().json()[0]?.terms?.[0]?.tags||[];}catch{}tagsCache.set(word,new Set(list));}return tagsCache.get(word);}
 function forms(word){if(!formsCache.has(word)){let value;try{value=window.nlp?.(word).verbs().conjugate()[0];}catch{}formsCache.set(word,value||null);}return formsCache.get(word);}
 function trimmed(left){left=left.slice();while(left.length&&(tags(left.at(-1)).has('Adverb')||['not','never'].includes(left.at(-1))))left.pop();return left;}
 function subject(left){
  left=trimmed(left);const last=left.at(-1);if(!last)return null;
  if(pronouns[last]){
   let compound=false;if(left.includes('and')&&left.length<=8){try{compound=window.nlp(left.join(' ')).terms().json().flatMap(row=>row.terms).every(row=>!row.tags.includes('Verb'));}catch{}}
   return {kind:compound?'plural':pronouns[last],label:compound?left.join(' '):last==='i'?'I':last[0].toUpperCase()+last.slice(1)};
  }
  const key=left.join(' ');if(subjectCache.has(key))return subjectCache.get(key);
  let value=null;
  // Only infer a simple noun subject before a predicate; objects are not subjects.
  if(left.length<=12&&!left.some(word=>modal.has(word)||doForms.has(word))){
   const preposition=left.findIndex(word=>prepositions.has(word)),head=preposition<0?left:left.slice(0,preposition);
   let rows=[];try{rows=window.nlp?.(head.join(' ')).terms().json().flatMap(row=>row.terms)||[];}catch{}
   const nouns=rows.filter(row=>row.tags.includes('Noun')&&!row.tags.includes('Pronoun')&&!row.tags.includes('Possessive'));
   const valid=rows.length===head.length&&head.length&&nouns.length&&rows.every((row,i)=>articles.has(head[i])||head[i]==='and'||row.tags.some(tag=>['Noun','Adjective','Determiner','Value','Possessive'].includes(tag)))&&!rows.some(row=>row.tags.includes('Verb')&&!row.tags.includes('Noun'));
   if(valid){const noun=nouns.at(-1),plural=head.includes('and')||noun.tags.includes('Plural');value={kind:plural?'plural':'third',label:head.join(' '),inferred:true};}
  }
  if(subjectCache.size>=300)subjectCache.clear();subjectCache.set(key,value);return value;
 }
 function context(left,right=[]){
  if(!window.nlp)return null;const clean=trimmed(left),last=clean.at(-1),previous=clean.at(-2);
  if(modal.has(last)||doForms.has(last))return {kind:'base',reason:last+' + กริยารูปเดิม'};
  if(last==='to'&&!['forward','accustomed','committed','dedicated','go','went','going','travel','walk'].includes(previous)&&!(previous==='used'&&clean.slice(-4,-2).some(word=>['am','is','are','was','were'].includes(word))))return {kind:'base',reason:'to + กริยารูปเดิม'};
  if(pronouns[last]&&(modal.has(previous)||doForms.has(previous)))return {kind:'base',reason:previous+' + กริยารูปเดิม'};
  const owner=subject(clean);if(!owner)return null;
  const timing=[...left,...right].join(' '),past=/\byesterday\b|\b(?:last (?:night|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:days?|weeks?|months?|years?|hours?|minutes?) ago)\b/.test(timing);
  return {...owner,kind:past?'past':owner.kind==='third'?'third':'subject',agreement:owner.kind,reason:past?'เวลาอดีต · กริยารูปอดีต':owner.kind==='third'?owner.label+' · กริยาเติม s/es':owner.label+' · กริยารูปเดิม'};
 }
 function target(word,rule){
  if(rule?.agreement&&["don't","doesn't"].includes(word))return rule.agreement==='third'?"doesn't":"don't";
  if(word.includes("'")||modal.has(word))return null;
  const list=tags(word),verb=forms(word);if(!verb||!rule||list.has('Gerund'))return null;
  if(verb.Infinitive==='be'){
   if(rule.kind==='base')return 'be';if(!rule.agreement)return null;
   const past=['was','were'].includes(word)||rule.kind==='past';
   return past?rule.agreement==='plural'?'were':'was':rule.agreement==='first'?'am':rule.agreement==='plural'?'are':'is';
  }
  if(rule.kind==='base')return verb.Infinitive;
  if(list.has('PastTense')||list.has('PastParticiple'))return null; // Preserve an existing past tense without guessing intent.
  if(verb.Infinitive===verb.PastTense)return null; // read, put, cut, etc. can already be past tense.
  if(rule.kind==='past')return verb.PastTense;
  if(!list.has('PresentTense'))return null;
  return rule.kind==='third'?verb.PresentTense:rule.kind==='subject'?verb.Infinitive:null;
 }
 function reason(word,rule){if(!rule)return '';if(tags(word).has('PastTense'))return 'กริยารูปอดีต';if(['am','is','are','was','were','has','have'].includes(word)&&rule.agreement)return rule.label+' · ใช้ '+word;return rule.reason;}
 function fits(word,rule){const expected=target(word,rule);return !expected||expected===word;}
 function suggest(text,caret){
  if(!window.nlp||!Number.isInteger(caret)||caret<0||caret>text.length)return [];
  const result=[],prefix=text.slice(0,caret),matches=[...prefix.toLowerCase().replace(/’/g,"'").matchAll(/[a-z]+(?:'[a-z]+)*/g)].slice(-120),contextTags=new Map(),scanStart=matches[0]?.index||0;let left=[],lastEnd=scanStart;
  try{for(const row of window.nlp(text.slice(scanStart,caret+1000)).terms().json({offset:true}))contextTags.set(scanStart+row.offset?.start,new Set(row.terms?.[0]?.tags||[]));}catch{}
  // Bound pasted text so grammar suggestions remain responsive on a phone.
  for(const match of matches){
   if(/[.!?;\n]/.test(prefix.slice(lastEnd,match.index)))left=[];
   const word=match[0],start=match.index,end=start+word.length;lastEnd=end;
   if(end===caret&&/[a-z]/i.test(text[caret]||'')){left.push(word);continue;}
   const right=[...text.slice(end,end+1000).split(/[.!?;\n]/)[0].toLowerCase().matchAll(/[a-z]+(?:'[a-z]+)*/g)].map(item=>item[0]);
   const rule=context(left,right),asNoun=rule?.inferred&&right.length&&contextTags.get(start)?.has('Noun')&&!contextTags.get(start)?.has('Verb');let replacement=asNoun?null:target(word,rule),explanation,editStart=start;
   if(rule?.agreement&&predicative.has(word)&&(!right.length||!tags(right[0]).has('Noun')||['today','tomorrow','yesterday'].includes(right[0]))){const copula=rule.kind==='past'?rule.agreement==='plural'?'were':'was':rule.agreement==='first'?'am':rule.agreement==='plural'?'are':'is',adverbs=left.length-trimmed(left).length;editStart=matches[matches.indexOf(match)-adverbs]?.index??start;replacement=copula+' '+text.slice(editStart,end).toLowerCase();explanation=rule.label+' · ใช้ '+copula+' + คำคุณศัพท์';}
   if(replacement&&replacement!==word&&/^[a-z]+(?:'[a-z]+)?(?:\s+[a-z]+){0,6}$/.test(replacement)){
    let display=replacement;const original=text.slice(editStart,end);if(original.length>1&&original===original.toUpperCase())display=display.toUpperCase();else if(/^[A-Z]/.test(original))display=display[0].toUpperCase()+display.slice(1);
    result.push({word:display,from:original,start:editStart,end,preview:text.slice(0,editStart)+display+text.slice(end),correction:true,reason:explanation||reason(replacement,rule)});
   }
   left.push(word);
  }
  return result.slice(0,2);
 }
 return {context,suggest,fits,reason};
})();
