const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const htmlIds=new Set([...fs.readFileSync("web/index.html","utf8").matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));const elements=new Map(),storage=new Map(),calls=[];let quota=false;
const element=id=>{if(!htmlIds.has(id))return null;if(!elements.has(id))elements.set(id,{value:'',checked:false,disabled:false,textContent:'',classList:{toggle(){}},addEventListener(){},focus(){},dispatchEvent(){}});return elements.get(id);};
storage.set('contextly.autoTranslations.v2',JSON.stringify([[JSON.stringify(['google','runs','She runs before lunch.',4,[],'context-v1']),{meaning:'วิ่ง',sentenceTranslation:'เธอวิ่งก่อนมื้อกลางวัน'}]]));
const context={window:{OnlineTranslation:{provider:()=> 'gemini'}},document:{getElementById:element,createElement:()=>{let value='';return {set innerHTML(v){value=v;},get value(){return value;}};}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Map,Date,JSON,URL,TextEncoder,DOMException,Response,AbortController,Event,WordSelection:{validate:(_s,p)=>p,label:(s,p)=>p.map(x=>s.slice(x.start,x.start+x.length)).join(' ').toLowerCase()},fetch:async(url,options={})=>{
 if(options.signal?.aborted)throw new DOMException('Canceled','AbortError');calls.push({url:String(url),options});
 if(url==='/api/gemini/key')return Response.json({configured:options.method==='POST'});
 if(url==='/api/gemini/translate'){if(quota)return Response.json({code:'QUOTA',error:'โควตาเต็ม',retryAfter:60},{status:429});const input=JSON.parse(options.body);return Response.json({meaning:input.sentence.includes('business')?'ดำเนินธุรกิจ':'วิ่ง',sentenceTranslation:input.sentence.includes('business')?'เธอดำเนินธุรกิจ':'เธอวิ่งทุกเช้า',provider:'gemini'});}
 const q=new URL(url).searchParams.get('q');return Response.json({sentences:[{trans:q.includes('<b>')?'เธอ<b>วิ่ง</b>วันนี้':'เธอวิ่งวันนี้'}]});
}};vm.createContext(context);vm.runInContext(fs.readFileSync('web/gemini-translation.js','utf8'),context);vm.runInContext(fs.readFileSync('web/auto-meaning.js','utf8'),context);
(async()=>{
 const api=context.window.ContextMeaning,signal=new AbortController().signal;
 const preview=await api.translateSentenceResult('She runs a business.',signal);assert.equal(preview.provider,'google');assert.equal(preview.preview,true);assert(!calls.some(c=>c.url==='/api/gemini/translate'),'typing uses Google without consuming Gemini quota');
 const business=await api.suggest('runs','She runs a business.',4,signal),run=await api.suggest('runs','She runs every morning.',4,signal);assert.equal(business.meaning,'ดำเนินธุรกิจ');assert.equal(run.meaning,'วิ่ง');
 assert.equal(business.provider,'gemini');const count=calls.length;const cached=await api.suggest('runs','She runs a business.',4,signal);assert.equal(cached.provider,'gemini');assert.equal(cached.cached,true);assert.equal(calls.length,count,'context-specific Gemini cache reused');
 const legacy=await api.suggest('runs','She runs before lunch.',4,signal,[],'google');assert.equal(legacy.provider,'google','old Google cache never relabeled Gemini');assert.equal(legacy.cached,true);
 quota=true;const fallback=await api.suggest('runs','She runs today.',4,signal);assert.equal(fallback.meaning,'วิ่ง');assert.equal(fallback.provider,'google');assert.equal(fallback.fallback,true);assert.match(fallback.notice,/Google Translate สำรอง/);assert.equal(context.window.OnlineTranslation.provider(),'gemini','fallback keeps Gemini selected');
 const geminiCount=calls.filter(c=>c.url==='/api/gemini/translate').length;await api.suggest('runs','She runs tonight.',4,signal);assert.equal(calls.filter(c=>c.url==='/api/gemini/translate').length,geminiCount,'cooldown avoids repeated quota errors');
 const aborted=new AbortController();aborted.abort();await assert.rejects(api.suggest('runs','She runs tomorrow.',4,aborted.signal),{name:'AbortError'});
 element('geminiKey').value='test-key-not-a-real-secret';element('geminiFreeTier').checked=true;await element('connectGemini').onclick();assert.equal(element('geminiKey').value,'');assert(![...storage.values()].some(x=>x.includes('test-key-not-a-real-secret')),'key never enters browser storage');
 console.log('PASS: contextual routing/cache, Google realtime preview, quota fallback with Gemini still selected, cooldown, cancellation and key cleared without browser persistence.');
})().catch(error=>{console.error(error);process.exitCode=1});


