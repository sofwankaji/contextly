window.RecallSwipe=(()=>{
 let suppressUntil=0;
 const ignoreClick=event=>Boolean(event?.detail&&Date.now()<suppressUntil);
 function mount(card,{onNext,onPrevious,canNext=()=>true,canPrevious=()=>true}){
  if(!card)return;let start=null;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function reset(){card.style.transform='';delete card.dataset.swipe;start=null;}
  card.addEventListener('pointerdown',event=>{
   if(event.isPrimary===false||event.button!==0||(!canNext()&&!canPrevious()))return;
   start={id:event.pointerId,x:event.clientX,y:event.clientY,at:Date.now(),dragged:false};
   try{card.setPointerCapture(event.pointerId);}catch{}
  });
  card.addEventListener('pointermove',event=>{
   if(!start||event.pointerId!==start.id)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(!start.dragged&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){reset();return;}
   if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5)start.dragged=true;
   if(!start.dragged)return;
   const allowed=dx<0?canNext():canPrevious();
   if(!reduced)card.style.transform='translateX('+Math.max(-72,Math.min(72,dx*(allowed?0.45:0.1)))+'px)';
   card.dataset.swipe=allowed?(dx<0?'next':'previous'):'';
  });
  card.addEventListener('pointerup',event=>{
   if(!start||event.pointerId!==start.id)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y,elapsed=Date.now()-start.at,dragged=start.dragged;
   if(dragged)suppressUntil=Date.now()+400;
   reset();
   if(!dragged||elapsed>1200||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.5)return;
   event.preventDefault();if(dx<0){if(canNext())onNext();}else if(canPrevious())onPrevious();
  });
  card.addEventListener('pointercancel',reset);
  card.addEventListener('lostpointercapture',reset);
  card.addEventListener('keydown',event=>{
   if(event.target!==card||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
   if(event.key==='ArrowRight'&&canNext()){event.preventDefault();onNext();}
   else if(event.key==='ArrowLeft'&&canPrevious()){event.preventDefault();onPrevious();}
  });
 }
 return {mount,ignoreClick};
})();
