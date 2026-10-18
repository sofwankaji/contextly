const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('web/index.html','utf8'),start=html.indexOf('$("save").addEventListener("click",'),end=html.indexOf('\nfunction risk',start);
function setup(existing=[]){
 const nodes=Object.fromEntries(['sourceSentence','meaning','sentenceTranslation','hint','source','captureMessage','chosen','tokens','save'].map(id=>[id,{value:'',textContent:'',disabled:false,classList:{add(){}},addEventListener(event,fn){this.handler=fn;},querySelector(){return {focus(){}};},focus(){}}]));
 Object.assign(nodes.sourceSentence,{value:'She runs a business.'});nodes.meaning.value='ดำเนินธุรกิจ';nodes.sentenceTranslation.value='เธอทำธุรกิจ';
 let release,fail=false;const writes=[];
 const context={$:id=>nodes[id],captureSaving:false,wordTranslationPending:false,selected:'runs',selectedParts:[{start:4,length:4}],completion:'',candidate:'',window:{LiveTranslation:{isPending:()=>false},PremiumUI:{syncCapture(){}},SmartCompletion:{learnSentence(){}}},RecallPlan:{initial:()=>({scheduleVersion:1,reviewStep:0})},now:()=>1000,day:86400000,crypto:{randomUUID:()=> 'new-word'},getAll:async()=>existing,put:async item=>{writes.push(item);await new Promise(resolve=>release=resolve);if(fail)throw Error('storage failed');},updateSaveState(){nodes.save.disabled=context.captureSaving;},makeHint:()=> 'hint',tokenize(){},renderCompletion(){},saveDraft(){},renderLibrary(){},refreshReminders(){},JSON,Math,Date};
 vm.createContext(context);vm.runInContext(html.slice(start,end),context);
 return {context,nodes,writes,save:()=>nodes.save.handler(),release:()=>release(),fail:()=>fail=true};
}
(async()=>{
 const x=setup(),pending=x.save();await new Promise(resolve=>setImmediate(resolve));assert.equal(x.nodes.save.disabled,true);await x.save();assert.equal(x.writes.length,1,'double taps produce one write');assert.equal(x.writes[0].sentenceTranslation,'เธอทำธุรกิจ');x.release();await pending;assert.equal(x.context.selected,'');assert.equal(x.nodes.sourceSentence.value,'She runs a business.','sentence retained for another word');assert.equal(x.nodes.save.disabled,false);
 const y=setup(),pendingNew=y.save();await new Promise(resolve=>setImmediate(resolve));y.context.selected='business';y.context.selectedParts=[{start:11,length:8}];y.nodes.meaning.value='ธุรกิจ';y.release();await pendingNew;assert.equal(y.context.selected,'business','newer selection is not cleared');assert.equal(y.nodes.meaning.value,'ธุรกิจ');assert.equal(y.writes[0].word,'runs','captured selection saved consistently');
 const old={id:'kept',word:'runs',sentence:'She runs a business.',createdAt:10,dueAt:77777,history:[{rating:'Good'}],practiceHistory:[{mode:'writing'}],writingReady:true,hint:'legacy hint',source:'legacy source'},z=setup([old]),pendingOld=z.save();await new Promise(resolve=>setImmediate(resolve));z.release();await pendingOld;assert.equal(z.writes[0].id,'kept');assert.equal(z.writes[0].dueAt,77777);assert.equal(z.writes[0].history.length,1);assert.equal(z.writes[0].writingReady,true,'existing progression retained');assert.equal(z.writes[0].hint,'legacy hint');assert.equal(z.writes[0].source,'legacy source');assert(!Object.hasOwn(x.writes[0],'hint')&&!Object.hasOwn(x.writes[0],'source'),'removed fields are absent on new words');
 const e=setup(),pendingError=e.save();await new Promise(resolve=>setImmediate(resolve));e.fail();e.release();await pendingError;assert.equal(e.context.selected,'runs');assert.equal(e.nodes.save.disabled,false);assert.match(e.nodes.captureMessage.textContent,/storage failed/);
 const queued=setup();queued.context.wordTranslationPending=true;await queued.save();assert.equal(queued.writes.length,0,'does not save a partial translation');
 console.log('PASS: fast repeat capture, duplicate guard, saved sentence translation, newer selection retention, existing progression and failure recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});



