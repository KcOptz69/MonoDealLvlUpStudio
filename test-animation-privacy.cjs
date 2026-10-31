const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/feedbackPrivacy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);const{animationCards}=sandbox.exports;
const privateCards=[{id:'secret1',key:'deal_breaker'},{id:'secret2',key:'just_say_no'}];
for(const actor of [1,2,3,4]){const result=animationCards({type:'draw',actor,seq:10,cards:privateCards});assert.equal(result.length,2);assert(result.every(c=>c.key==='card_back'));assert(!JSON.stringify(result).includes('secret'));}
assert.equal(animationCards({type:'draw',actor:0,seq:11,cards:privateCards})[0].key,'card_back');
assert.equal(animationCards({type:'draw',actor:2,seq:12,cards:[{key:'hidden'},{key:'hidden'}]})[0].key,'card_back');
assert.equal(animationCards({type:'play',actor:2,seq:13,card:privateCards[0]})[0].key,'deal_breaker');
assert.equal(privateCards[0].key,'deal_breaker');console.log('PASS local and online opponent draws show only card backs; own draws remain concealed until landing; public plays retain artwork');
