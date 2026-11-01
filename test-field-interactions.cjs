const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
const {suggestPayment}=load('src/paymentSuggestion.ts');const item=(id,value,zone='bank')=>({id,value,zone});
assert.deepEqual(suggestPayment([item('property',5,'property'),item('five',5),item('one',1),item('two',2),item('two2',2)],5),['five']);
assert.deepEqual(suggestPayment([item('ten',10),item('five',5),item('two',2),item('prop',5,'property')],7),['five','two']);
assert.deepEqual(suggestPayment([item('ten',10),item('prop',5,'property')],5),['prop'],'exact payment avoids overpay');
assert.deepEqual(suggestPayment([item('ten',10),item('prop',5,'property')],5,true),['ten'],'mandatory bank first tax');
assert.deepEqual(suggestPayment([item('two',2),item('prop',3,'property')],10),['two','prop']);
const {Game}=require('./engine.cjs'),deck=require('./deck.json');const g=new Game(deck,3);for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}g.s.phase='play';g.s.turn=0;g.s.pending=null;
function take(key){const ix=g.s.deck.findIndex(c=>c.key===key);assert(ix>=0,key);return g.s.deck.splice(ix,1)[0];}
g.place(0,take('kentucky_avenue'),'Red','');g.place(0,take('indiana_avenue'),'Red','');
const a=g.p(0).groups[0],b=g.p(0).groups[1],x=take('expansion_property');x.expansionOwner=1;g.place(0,x,'Red',a.id);g.nextEffect();assert.equal(g.s.pending.kind,'expansion');
g.choose(0,b.id);assert.equal(g.find(0,x.id).group.id,b.id,'same-color selection respects exact set ID');assert(!a.cards.some(c=>c.id===x.id));
// Invalid group choice must leave state untouched.
const y=take('expansion_property');y.expansionOwner=1;g.place(0,y,'Red',a.id);g.nextEffect();assert.equal(g.s.pending.kind,'expansion');const before=JSON.stringify(g.s);assert.throws(()=>g.choose(0,'bad-group'));assert.equal(JSON.stringify(g.s),before);
const {installHandDragging}=load('src/handDragging.ts');
class El {constructor(data={}){this.dataset=data;this.classList={add(){},remove(){}};}closest(selector){if(selector.includes('.hand .card'))return this.hand?this:null;return this.target?this:null;}setPointerCapture(){} }
global.Element=El;
const listeners={},drops=[],events=[];let hit=new El({handDrop:'play'});hit.target=true;
const doc={addEventListener(n,f){(listeners[n]??=[]).push(f);},removeEventListener(n,f){listeners[n]=listeners[n].filter(x=>x!==f);},dispatchEvent(e){events.push(e.type);},elementFromPoint(){return hit;},defaultView:{addEventListener(){},removeEventListener(){}},documentElement:{classList:{remove(){}}},querySelectorAll(){return []}};
const dispose=installHandDragging((...args)=>drops.push(args),doc);const card=new El({cardId:'hand1'});card.hand=true;const data=new Map();const dt={types:['application/x-deal-hand'],setData(k,v){data.set(k,v);},getData(k){return data.get(k)||'';}};
listeners.dragstart[0]({target:card,dataTransfer:dt});assert.equal(dt.getData('application/x-deal-hand'),'hand1');
let stopped=false;const event={clientX:2,clientY:3,dataTransfer:dt,preventDefault(){},stopImmediatePropagation(){stopped=true;}};
listeners.drop[0](event);assert.deepEqual(drops[0],['hand1','play',undefined,undefined]);assert(stopped);assert(events.includes('deal-hand-dropped'));
hit=new El({groupColor:'Red',groupId:'set2'});hit.target=true;listeners.drop[0](event);assert.deepEqual(drops[1],['hand1','field','Red','set2']);
dispose();assert(Object.values(listeners).every(x=>x.length===0));delete global.Element;
console.log('PASS payment bank/high-bill priority, no-overpay and tax rules; exact Expansion set transfer; invalid choice atomicity; hand drop routes and cleanup');
