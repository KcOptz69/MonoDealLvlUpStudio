const assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),vm=require('vm');
const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/targetEvents.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const {targetingAnimations}=sandbox.exports;
const state={phase:'play',winner:null,players:[{},{},{},{forfeited:true},{}],events:[
 {seq:1,type:'play',actor:2,target:1,card:{key:'debt_collector'}},
 {seq:2,type:'play',actor:2,targetAll:true,card:{key:'its_my_birthday'}},
 {seq:3,type:'play',actor:2,target:4,card:{key:'forced_deal'}},
 {seq:4,type:'negate',actor:4,targetPlaySeq:3,blocked:true},
 {seq:5,type:'play',actor:1,card:{key:'pass_go'}},
 {seq:6,type:'bank',actor:1,target:2,card:{key:'debt_collector'}},
 {seq:7,type:'play',actor:1,target:2,setup:true},
 {seq:8,type:'negate',actor:2,targetPlaySeq:3,blocked:false}
]};
const list=targetingAnimations(state,0);assert.equal(list.length,4);
assert.equal(list[0].kind,'single');assert.deepEqual(Array.from(list[0].targets),[1]);
assert.equal(list[1].kind,'all');assert.deepEqual(Array.from(list[1].targets),[0,1,4]);
assert.equal(list[2].kind,'swap');assert.deepEqual(Array.from(list[2].targets),[4]);
assert.equal(list[3].kind,'blocked');assert.equal(list[3].actor,2);assert.deepEqual(Array.from(list[3].targets),[4]);
assert.equal(targetingAnimations(state,4).length,0);assert.equal(targetingAnimations({...state,phase:'setup'},0).length,0);assert.equal(targetingAnimations({...state,winner:2},0).length,0);
const {Rooms}=require('./rooms.cjs');const rooms=new Rooms();
try{
 const a=rooms.create('Host'),b=rooms.join(a.code,'Guest');for(const s of [a,b])rooms.command(s.code,s.token,'ready',{ready:true});rooms.command(a.code,a.token,'start');const {r}=rooms.get(a.code,a.token),g=r.game,actor=r.gameSeats.indexOf(0),target=r.gameSeats.indexOf(1);
 g.s.phase='play';g.s.turn=actor;g.s.played=0;g.p(actor).hand=[{id:'debt-animation',key:'debt_collector'}];
 g.play(actor,'debt-animation','play',{target});
 for(let seat=0;seat<2;seat++){
  const view=rooms.view(r,seat),animation=targetingAnimations(view.state,0).at(-1);
  assert(animation);const own=r.gameSeats.indexOf(seat);assert.equal(animation.actor,(actor-own+2)%2);assert.equal(animation.targets[0],(target-own+2)%2);
 }
 console.log('PASS targeting types, all-opponent fanout, JSN shatter attribution, setup/reconnect suppression, online seat rotation');
}finally{rooms.close();}
