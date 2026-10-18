(function(root){
 const ratings=[['Good','จำได้'],['Hard','ยังไม่คล่อง'],['Again','จำไม่ได้']];
 function fluent(word){return typeof word.writingReady==='boolean'?word.writingReady:['Good','Easy'].includes(word.lastRating);}
 function apply(word,rating,at,entry,scheduled=false){
  if(!['Again','Hard','Good','Easy'].includes(rating))throw Error('Invalid rating');
  const ready=['Good','Easy'].includes(rating),status={writingReady:ready,fluentAt:ready?at:null,lastAssessment:rating,lastAssessmentAt:at};
  return scheduled?{...word,...root.RecallPlan.next(word,rating,at),...status,lastRating:rating,lapses:(word.lapses||0)+(rating==='Again'?1:0),history:[...(word.history||[]),entry]}:{...word,...status,practiceHistory:[...(word.practiceHistory||[]),entry]};
 }
 const api={ratings,fluent,apply};root.WordProgress=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
