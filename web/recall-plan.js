(function(root){
 const DAY=86400000,STEPS=[3,7,14,30,60];
 const timestamp=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
 function initial(at){return {scheduleVersion:1,reviewStep:0,dueAt:at+3*DAY,intervalDays:3};}
 function step(word){
  if(word.scheduleVersion===1&&Number.isInteger(word.reviewStep)&&word.reviewStep>=0)return word.reviewStep;
  return (Array.isArray(word.history)?word.history:[]).filter(h=>['Good','Easy'].includes(h.rating)).length;
 }
 function next(word,rating,at){
  if(!['Again','Hard','Good','Easy'].includes(rating))throw Error('Invalid rating');
  let reviewStep=step(word),dueAt;
  if(rating==='Again'||rating==='Hard')dueAt=at+(rating==='Again'?1:2)*DAY;
  else{reviewStep++;dueAt=reviewStep<STEPS.length?Math.max(at+DAY,timestamp(word.createdAt,at)+STEPS[reviewStep]*DAY):at+30*DAY;}
  return {scheduleVersion:1,reviewStep,dueAt,intervalDays:(dueAt-at)/DAY};
 }
 function due(word,at){return timestamp(word.dueAt,0)<=at;}
 function label(word){const i=step(word);return word.scheduleVersion===1&&i<STEPS.length?'รอบ '+STEPS[i]+' วัน':'ทบทวนต่อเนื่อง';}
 function age(word,at){const created=Number(word.createdAt);if(!Number.isFinite(created)||created<=0)return -1;return Math.max(0,Math.floor((at+7*3600000)/DAY)-Math.floor((created+7*3600000)/DAY));}
 function inAgeGroup(word,group,at){const days=age(word,at);return group==='all'||group==='today'&&days===0||group==='three'&&days>=3&&days<=6||group==='seven'&&days>=7;}
 const api={DAY,STEPS,initial,next,due,label,age,inAgeGroup};root.RecallPlan=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
