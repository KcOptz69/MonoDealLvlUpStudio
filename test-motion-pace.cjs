const assert=require('node:assert/strict'),timing=require('./timing.json'),{MotionClock}=require('./parallel-bots.cjs');
const state=(events,fastBots)=>({events,eventSeq:events.at(-1)?.seq||0,phase:'play',fastBots});
const event=(seq,type,count=1,target=0)=>({seq,type,turnId:4,actor:1,target,cards:Array.from({length:count},(_,i)=>({id:seq+'-'+i,key:'money_1m'}))});
for(const fast of [false,true]){
 const duration=fast?750:1900,stagger=fast?80:220;
 const clock=new MotionClock(timing);assert.equal(clock.observe(state([event(1,'payment')],fast),100),100+duration);
 assert.equal(clock.observe(state([event(1,'payment'),event(2,'payment')],fast),100),100+duration,'simultaneous payers do not extend the queue');
 const draws=new MotionClock(timing);assert.equal(draws.observe(state([event(1,'draw',2),event(2,'draw')],fast),100),100+duration+stagger);
 const playAndDraw=new MotionClock(timing);assert.equal(playAndDraw.observe(state([event(1,'play'),event(2,'draw',2),event(3,'draw')],fast),100),100+duration*2+stagger);
 const size=30,large=new MotionClock(timing);const end=large.observe(state([event(1,'transfer',size)],fast),100);assert.equal(end,100+(fast?1200:1900+(size-1)*220));
 assert.equal(clock.observe(state([event(1,'payment'),event(2,'payment')],fast),200),100+duration,'repeated snapshots do not replay animation delays');
}
const reset=new MotionClock(timing);reset.observe(state([event(10,'draw')],true),100);assert.equal(reset.observe({events:[{...event(1,'bank'),setup:true}],eventSeq:1,phase:'setup',fastBots:false},200),0);
console.log('PASS bot and presentation clocks agree; fast flights cap large batches; matching draws/transfers overlap without overtaking played cards');
