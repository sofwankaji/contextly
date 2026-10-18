window.ContextSense=(()=>{
 const rules=[
  {words:['wild'],cues:['story','journey','ride','startup','career','turn','twist','deal','idea','unbelievable'],exclude:['animal','animals','dog','dogs','wolf','wolves','forest','plant','plants'],meaning:'เหลือเชื่อ',replacement:'extraordinary',example:'The story of the small company is wild.',translation:'เรื่องราวของบริษัทเล็ก ๆ แห่งนี้เหลือเชื่อมาก'},
  {words:['kill','kills','killed','killing'],cues:['deal','regulator','regulators','merger','agreement','proposal','project','bill','buyout','plan'],exclude:['man','woman','person','people','soldier','soldiers','animal','animals','victim','death'],meaning:'ขัดขวาง',replacements:{kill:'reject',kills:'rejects',killed:'rejected',killing:'rejecting'},example:'New regulations could kill the merger deal.',translation:'กฎระเบียบใหม่อาจขัดขวางข้อตกลงควบรวมกิจการ'},
  {words:['run','runs','ran','running'],cues:['business','company','shop','restaurant','organisation','organization'],meaning:'ดำเนินกิจการ',replacements:{run:'manage',runs:'manages',ran:'managed',running:'managing'},example:'She runs a small business from home.',translation:'เธอดำเนินกิจการเล็ก ๆ จากที่บ้าน'},
  {words:['run','runs','ran','running'],cues:['morning','marathon','exercise','kilometres','kilometers','jog','park'],meaning:'วิ่ง',example:'She runs in the park before breakfast.',translation:'เธอวิ่งในสวนก่อนกินอาหารเช้า'},
  {words:['bank','banks'],cues:['river','stream','shore','muddy','water'],meaning:'ตลิ่ง',example:'They rested on the bank beside the river.',translation:'พวกเขาพักบนตลิ่งข้างแม่น้ำ'},
  {words:['bank','banks'],cues:['money','account','loan','deposit','cash','savings'],meaning:'ธนาคาร',example:'The bank approved her small business loan.',translation:'ธนาคารอนุมัติเงินกู้สำหรับธุรกิจขนาดเล็กของเธอ'},
  {words:['support','supports','supported','supporting'],cues:['roof','beam','weight','shelf','structure','chair'],meaning:'รับน้ำหนัก',example:'The metal frame can support the heavy roof.',translation:'โครงโลหะสามารถรับน้ำหนักหลังคาที่หนักได้'},
  {words:['support','supports','supported','supporting'],cues:['theory','claim','evidence','argument','research','findings'],meaning:'สนับสนุน',example:'The new evidence supports her theory.',translation:'หลักฐานใหม่สนับสนุนทฤษฎีของเธอ'},
  {words:['give up','gives up','gave up','giving up'],cues:['smoking','drinking','habit','alcohol','cigarettes'],meaning:'เลิก',replacements:{'give up':'quit','gives up':'quits','gave up':'quit','giving up':'quitting'},example:'He gave up smoking to improve his health.',translation:'เขาเลิกสูบบุหรี่เพื่อให้สุขภาพดีขึ้น'},
  {words:['give up','gives up','gave up','giving up'],cues:['dream','dreams','goal','hope','trying','never','refused'],meaning:'ยอมแพ้',replacements:{'give up':'surrender','gives up':'surrenders','gave up':'surrendered','giving up':'surrendering'},example:'She refused to give up when the task became difficult.',translation:'เธอไม่ยอมแพ้เมื่องานเริ่มยากขึ้น'},
  {words:['break','breaks','broke','breaking'],cues:['rest','short','lunch','coffee','work','pause'],exclude:['arm','bone','bones','window','glass','leg','legs','heart'],meaning:'พัก',example:'He takes a short break after lunch.',translation:'เขาพักช่วงสั้น ๆ หลังอาหารกลางวัน'},
  {words:['charge','charges','charged','charging'],cues:['fee','price','cost','dollars','payment'],meaning:'คิดค่าบริการ',example:'The shop charges a small fee for delivery.',translation:'ร้านคิดค่าบริการส่งเล็กน้อย'}
 ];
 function find(word,sentence,offset,parts=[]){
  const key=String(word).toLowerCase().replace(/\s+/g,' ').trim(),start=Number.isInteger(offset)?offset:sentence.toLowerCase().indexOf(key.split(' ')[0]);if(start<0)return null;
  const left=sentence.slice(0,start).search(/[^.!?;\n]*$/),right=sentence.slice(start).search(/[.!?;\n]/),context=sentence.slice(left,right<0?sentence.length:start+right).toLowerCase();
  const has=cue=>new RegExp('\\b'+cue+'\\b','i').test(context);
  const candidates=rules.filter(rule=>rule.words.includes(key)&&!rule.exclude?.some(has)).map(rule=>({rule,score:rule.cues.filter(has).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(!candidates.length||(candidates[1]&&candidates[0].score===candidates[1].score))return null;const rule=candidates[0].rule,replacement=rule.replacements?.[key]||rule.replacement;
  let rewritten=sentence;
  if(replacement){const spans=parts.length?parts:[{start,length:word.length}];let cursor=0;rewritten='';for(let i=0;i<spans.length;i++){const part=spans[i];rewritten+=sentence.slice(cursor,part.start)+(i===0?replacement:'');cursor=part.start+part.length;}rewritten=(rewritten+sentence.slice(cursor)).replace(/ {2,}/g,' ').replace(/ +([,.!?;])/g,'$1');}
  return {meaning:rule.meaning,rewritten,replacement,example:{sentence:rule.example,translation:rule.translation,provider:'contextly'}};
 }
 function rewrite(sentence){let result=sentence;const terms=[...sentence.matchAll(/\b(?:give|gives|gave|giving)\s+up\b|[A-Za-z]+(?:['’-][A-Za-z]+)*/gi)];for(const match of terms.reverse()){const sense=find(match[0],sentence,match.index);if(sense?.replacement)result=result.slice(0,match.index)+sense.replacement+result.slice(match.index+match[0].length);}return result;}
 return {find,rewrite};
})();
