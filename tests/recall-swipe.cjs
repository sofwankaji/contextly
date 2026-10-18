const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let at=1000,next=0,previous=0,enabled=true;
const events={},card={style:{},dataset:{},addEventListener:(name,fn)=>events[name]=fn,setPointerCapture(){}};
const context={window:{matchMedia:()=>({matches:false})},Date:{now:()=>at}};
vm.createContext(context);vm.runInContext(fs.readFileSync('web/recall-swipe.js','utf8'),context);
const api=context.window.RecallSwipe;
api.mount(card,{onNext:()=>next++,onPrevious:()=>previous++,canNext:()=>enabled,canPrevious:()=>enabled});
function fire(type,x,y,extra={}){const event={pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,preventDefault(){this.prevented=true;},...extra};events[type](event);return event;}
function gesture(x,y){fire('pointerdown',200,200);fire('pointermove',x,y);return fire('pointerup',x,y);}
assert(gesture(100,205).prevented);assert.equal(next,1);assert.equal(card.style.transform,'');assert(api.ignoreClick({detail:1}),'swiping cannot accidentally flip the new card');assert(!api.ignoreClick({detail:0}),'keyboard activation is not swallowed');
at+=1000;gesture(290,205);assert.equal(previous,1,'right swipe navigates back');
at+=1000;gesture(205,300);assert.equal(next+previous,2,'vertical scrolling does not change cards');assert(!api.ignoreClick({detail:1}));
gesture(170,205);assert.equal(next+previous,2,'short drags do not change cards');
at+=1000;fire('pointerdown',200,200);fire('pointermove',90,200);fire('pointercancel',90,200);fire('pointerup',90,200);assert.equal(next,1,'cancelled gestures cannot change cards');
enabled=false;gesture(90,200);assert.equal(next,1,'busy or one-card decks disable swiping');enabled=true;
const key=extra=>events.keydown({target:card,preventDefault(){},...extra});key({key:'ArrowRight'});key({key:'ArrowLeft'});assert.equal(next,2);assert.equal(previous,2);key({key:'ArrowRight',target:{}});key({key:'ArrowRight',ctrlKey:true});assert.equal(next,2,'other controls and modified shortcuts are untouched');
console.log('PASS: next/back swipes, preserved vertical scrolling, cancelled/short gestures, click suppression, keyboard navigation and disabled navigation.');
