const DAY=86400000,MAX_PENDING=400,TEST_ID=7;
function hash(text){let value=2166136261;for(const char of text){value^=char.charCodeAt(0);value=Math.imul(value,16777619);}return 10000+(value>>>0)%2000000000;}
function plan(words,at=Date.now()){
 const entries=new Map();
 for(const word of words){
  if(!word||typeof word.id!=='string'||!word.id||typeof word.word!=='string')continue;
  const created=Number(word.createdAt),due=Number(word.dueAt),unreviewed=!word.history?.length;
  const dates=unreviewed&&Number.isFinite(created)?[created+3*DAY,created+7*DAY,due]:[due];
  for(const dueAt of new Set(dates)){if(!Number.isSafeInteger(dueAt)||dueAt<=at)continue;const key=word.id+'|'+dueAt;entries.set(key,{key,wordId:word.id,title:'ทบทวน '+word.word.slice(0,60),dueAt});}
 }
 const all=[...entries.values()].sort((a,b)=>a.dueAt-b.dueAt||a.key.localeCompare(b.key)),used=new Set([TEST_ID]);
 const notifications=all.slice(0,MAX_PENDING).map(entry=>{let id=hash(entry.key);while(used.has(id))id=id===2147483000?10000:id+1;used.add(id);return {id,title:entry.title,body:'ลองนึกความหมาย แล้วแตะเพื่อเปิดการ์ด',channelId:'recall',autoCancel:true,schedule:{at:new Date(entry.dueAt),allowWhileIdle:true},extra:{kind:'recall',wordId:entry.wordId,dueAt:entry.dueAt}};});
 return {notifications,remaining:Math.max(0,all.length-MAX_PENDING)};
}
function signature(notification){return JSON.stringify([notification.id,new Date(notification.schedule?.at).getTime(),notification.title,notification.extra?.wordId]);}
function changes(pending,desired){
 const wanted=new Map(desired.map(note=>[note.id,note])),existing=new Map(pending.filter(note=>note.extra?.kind==='recall').map(note=>[note.id,note]));
 return {cancel:[...existing.values()].filter(note=>!wanted.has(note.id)).map(({id})=>({id})),schedule:desired.filter(note=>signature(existing.get(note.id)||{})!==signature(note))};
}
module.exports={DAY,MAX_PENDING,TEST_ID,plan,changes};
