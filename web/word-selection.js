window.WordSelection=(()=>{
 const tokens=sentence=>[...sentence.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)].map(m=>({start:m.index,length:m[0].length}));
 function validate(sentence,parts){
  if(!Array.isArray(parts)||parts.length>40)return [];
  const available=tokens(sentence);return available.filter(t=>parts.some(p=>p&&p.start===t.start&&p.length===t.length));
 }
 const label=(sentence,parts)=>validate(sentence,parts).map(p=>sentence.slice(p.start,p.start+p.length)).join(' ').toLowerCase();
 function toggle(sentence,parts,start){const next=validate(sentence,parts),token=tokens(sentence).find(p=>p.start===start);if(!token)return next;return next.some(p=>p.start===start)?next.filter(p=>p.start!==start):validate(sentence,[...next,token]);}
 function mask(sentence,parts){let result=sentence;for(const p of validate(sentence,parts).reverse())result=result.slice(0,p.start)+'_____'+result.slice(p.start+p.length);return result;}
 function legacy(sentence,word,offset){if(!Number.isInteger(offset)||offset<0||sentence.slice(offset,offset+word.length).toLowerCase()!==word.toLowerCase())return [];return tokens(sentence).filter(p=>p.start>=offset&&p.start<offset+word.length);}
 return {tokens,validate,label,toggle,mask,legacy};
})();
