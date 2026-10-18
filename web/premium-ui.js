window.PremiumUI=(()=>{
 let filter='all';
 const read=document.getElementById('readSentence'),sentence=document.getElementById('sourceSentence'),status=document.getElementById('sentenceVoiceStatus');
 window.WordTools?.mountSentenceReader(read,sentence,status);
 document.querySelectorAll('[data-library-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.libraryFilter;document.querySelectorAll('[data-library-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderLibrary();});
 const translated=document.getElementById('sentenceTranslation'),preview=document.getElementById('sentenceTranslationPreview'),translationPanel=document.getElementById('translationDetails'),translationStatus=document.getElementById('liveTranslationStatus'),edit=document.getElementById('editTranslation'),clear=document.getElementById('clearSelection');
 let editingTranslation=false;
 function syncTranslation(){
  window.TranslationStatus?.sync('sentenceTranslation');window.TranslationStatus?.sync('meaning');
  preview.textContent=translated.value;
  translationPanel.classList.toggle('hidden',!translated.value.trim()&&!translationStatus.textContent.trim()&&!window.LiveTranslation?.isPending());
  preview.classList.toggle('hidden',editingTranslation);translated.classList.toggle('hidden',!editingTranslation);edit.setAttribute('aria-expanded',String(editingTranslation));edit.textContent=editingTranslation?'เสร็จ':'แก้ไข';
 }
 function resizeSentence(){sentence.style.height='auto';sentence.style.height=Math.max(96,Math.min(280,sentence.scrollHeight))+'px';}
 function syncCapture(){syncTranslation();clear.classList.toggle('hidden',!selected);resizeSentence();}
 sentence.addEventListener('input',resizeSentence);
 edit.onclick=()=>{editingTranslation=!editingTranslation;syncTranslation();if(editingTranslation)translated.focus({preventScroll:true});};
 translated.addEventListener('input',syncTranslation);
 clear.onclick=()=>{selectedParts=[];choose('');};
 document.addEventListener('keydown',event=>{if(event.isComposing||event.key!=='Enter'||document.getElementById('add').classList.contains('hidden'))return;if((event.ctrlKey||event.metaKey)&&selected&&!document.getElementById('save').disabled){event.preventDefault();document.getElementById('save').click();}});
 document.getElementById('meaning').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&!document.getElementById('save').disabled){event.preventDefault();document.getElementById('save').click();}});
 return {libraryFilter:()=>filter,syncTranslation,syncCapture};
})();
