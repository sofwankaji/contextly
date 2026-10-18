const models=['gemini-3.1-flash-lite','gemini-3.6-flash'];
const tokens=text=>String(text||'').toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g)||[];
function validateInput(input){
 if(!input||typeof input.word!=='string'||!input.word.trim()||input.word.length>80||typeof input.sentence!=='string'||!input.sentence.trim()||input.sentence.length>2000)throw Error('เลือกคำในประโยคอีกครั้ง');
 const parts=input.parts?.length?input.parts:[{start:input.offset,length:input.word.length}];
 if(!Array.isArray(parts)||!parts.length||parts.length>40)throw Error('ตำแหน่งคำไม่ครบ');
 let end=-1;const selected=parts.map(part=>{if(!Number.isInteger(part.start)||!Number.isInteger(part.length)||part.start<0||part.length<1||part.start<end||part.start+part.length>input.sentence.length)throw Error('ตำแหน่งคำไม่ถูกต้อง');end=part.start+part.length;return input.sentence.slice(part.start,end);}).join(' ');
 if(selected.toLowerCase()!==input.word.toLowerCase())throw Error('เลือกคำในประโยคอีกครั้ง');
 return {...input,parts,meaning:String(input.meaning||'').slice(0,250)};
}
function makeBody(kind,source){
 const input=validateInput(source),example=kind==='example';
 const properties=example?{example:{type:'string'},exampleTranslation:{type:'string'}}:{meaning:{type:'string'},sentenceTranslation:{type:'string'}};
 const instruction=example?'Write exactly ONE new natural English sentence (8-24 words) and its natural Thai translation. Use all selected words exactly, with grammar appropriate to their inflection. Keep the SAME sense and domain as the original English context. Use a different situation and subject. Do not copy, quote, or write a meta-sentence about the original. The original English context takes priority if the supplied Thai meaning is inaccurate.':'Translate the selected English vocabulary into concise natural Thai in its exact sentence context. Resolve idioms, metaphors and separated phrasal verbs. Return only the selected meaning and a natural Thai translation of the complete sentence. Do not list unrelated senses.';
 return {systemInstruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:JSON.stringify({sentence:input.sentence,selectedWord:input.word,selectedParts:input.parts,meaning:input.meaning})}]}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'object',properties,required:Object.keys(properties)},thinkingConfig:{thinkingLevel:'MINIMAL'},maxOutputTokens:2048}};
}
function readResponse(payload,kind,input,model){
 const value=JSON.parse(payload?.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('')||'null');
 if(!value||typeof value!=='object')throw Error('Gemini ยังตอบไม่ครบ ลองใหม่อีกครั้ง');
 if(kind==='example'){
  if(typeof value.example!=='string'||!value.example.trim()||value.example.length>240||/[<>\u0e00-\u0e7f]/.test(value.example)||typeof value.exampleTranslation!=='string'||value.exampleTranslation.length>600||!/[\u0e00-\u0e7f]/.test(value.exampleTranslation))throw Error('ตัวอย่างไม่ถูกต้อง');
  const available=tokens(value.example);if(tokens(input.sentence).join(' ').includes(available.join(' ')))throw Error('ตัวอย่างซ้ำประโยคเดิม');
  for(const word of tokens(input.word)){const i=available.indexOf(word);if(i<0)throw Error('ตัวอย่างไม่มีคำที่เลือก');available.splice(i,1);}
 }else if(typeof value.meaning!=='string'||!value.meaning.trim()||value.meaning.length>250||typeof value.sentenceTranslation!=='string'||!value.sentenceTranslation.trim()||value.sentenceTranslation.length>6000||/[<>]/.test(value.meaning+value.sentenceTranslation))throw Error('คำแปลไม่ถูกต้อง');
 return {...value,provider:'gemini',model};
}
module.exports={models,validateInput,makeBody,readResponse};
