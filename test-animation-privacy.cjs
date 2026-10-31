const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/feedbackPrivacy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);const{animationCards}=sandbox.exports;
const privateCards=[{id:'secret1',key:'deal_breaker'},{id:'secret2',key:'just_say_no'}];
for(const actor of [1,2,3,4]){const result=animationCards({type:'draw',actor,seq:10,cards:privateCards});assert.equal(result.length,2);assert(result.every(c=>c.key==='card_back'));assert(!JSON.stringify(result).includes('secret'));}
assert.equal(animationCards({type:'draw',actor:0,seq:11,cards:privateCards})[0].key,'card_back');
assert.equal(animationCards({type:'draw',actor:2,seq:12,cards:[{key:'hidden'},{key:'hidden'}]})[0].key,'card_back');
assert.equal(animationCards({type:'play',actor:2,seq:13,card:privateCards[0]})[0].key,'deal_breaker');
assert.equal(privateCards[0].key,'deal_breaker');console.log('PASS local and online opponent draws show only card backs; own draws remain concealed until landing; public plays retain artwork');
const events=[{seq:20,type:'payment',actor:1,target:0,turnId:4},{seq:21,type:'payment',actor:2,target:0,turnId:4},{seq:22,type:'payment',actor:3,target:2,turnId:4},{seq:23,type:'draw',actor:0,turnId:4}];
assert.deepEqual(Array.from(sandbox.exports.activeMotionEvents(events),e=>e.seq),[20,21]);
assert.deepEqual(Array.from(sandbox.exports.activeMotionEvents([events[3],...events]),e=>e.seq),[23]);
console.log('PASS payments to the same recipient animate together; other transfers and draws retain ordering');
