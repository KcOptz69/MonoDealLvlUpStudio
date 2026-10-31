const assert=require('node:assert/strict');
const {Rooms}=require('./rooms.js');
const {ParallelBotTimers}=require('./parallel-bots.cjs');
const saved={setTimeout,clearTimeout,random:Math.random};
let clock=0,next=0;const jobs=new Map();
global.setTimeout=(fn,delay)=>{const id=++next;jobs.set(id,{fn,time:clock+delay});return id;};
global.clearTimeout=id=>jobs.delete(id);Math.random=()=>0;
function tick(ms){const end=clock+ms;for(let guard=0;guard<500;guard++){const due=[...jobs].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];if(!due){clock=end;return;}clock=due[1].time;jobs.delete(due[0]);due[1].fn();}throw Error('Timer loop');}
const rooms=new Rooms({pace:100,reveal:0});
try{
 const a=rooms.create('Host',3),b=rooms.join(a.code,'Guest',6);
 for(const slot of [2,3,4])rooms.command(a.code,a.token,'bot',{slot});
 for(const player of [a,b])rooms.command(player.code,player.token,'ready',{ready:true});
 rooms.command(a.code,a.token,'start');
 const {r}=rooms.get(a.code,a.token),g=r.game;
 assert.notDeepEqual(r.gameSeats,[0,1,2,3,4]);
 assert.equal(new Set(r.gameSeats).size,5);
 for(let seat=0;seat<5;seat++){
  const view=rooms.view(r,seat);assert.equal(view.state.players[0].name,r.seats[seat].name);assert.equal(view.state.players[0].tokenIndex,r.seats[seat].tokenIndex);
 }
 const bots=g.s.players.map((p,i)=>r.seats[r.gameSeats[i]].bot?i:-1).filter(i=>i>=0);
 for(const i of bots)g.p(i).hand=[1,2,3].map(n=>({id:`bot${i}-${n}`,key:'money_1m'}));
 tick(50);
 rooms.command(a.code,a.token,'action',{method:'end',args:[false]});
 tick(50);
 assert(bots.every(i=>g.p(i).setupPlayed===1),'all three bots act on their own first timer; human update does not restart clocks');
 tick(100);assert(bots.every(i=>g.p(i).setupPlayed===2));
 tick(100);assert(bots.every(i=>g.p(i).setupPlayed===3));
 tick(100);assert(bots.every(i=>g.p(i).setupDone));assert.equal(g.s.phase,'setup','setup still waits for unfinished human');
 rooms.command(b.code,b.token,'action',{method:'end',args:[false]});assert.equal(g.s.phase,'play');
 const receiver=r.gameSeats.indexOf(0),human=r.gameSeats.indexOf(1);
 g.s.turn=receiver;g.s.pending={kind:'payment',responder:bots[0],e:{actor:receiver,target:bots[0],key:'rent',amount:1},payments:[...bots,human].map(target=>({actor:receiver,target,key:'rent',amount:1}))};
 for(const i of [...bots,human]){g.p(i).bank=[{id:'pay'+i,key:'money_1m'}];g.p(i).hand=[];}
 rooms.broadcast(r);rooms.schedule(r);tick(100);
 assert(bots.every(i=>g.p(i).bank.length===0),'all bots pay in the same time window');
 assert.equal(g.s.pending.kind,'payment');assert.deepEqual(g.s.pending.payments.map(e=>e.target),[human]);
 assert.equal(g.s.events.filter(e=>e.type==='payment'&&e.target===receiver).length,3);
 const hv=rooms.view(r,1);assert.equal(hv.state.pending.responder,0);assert.equal(hv.state.pending.e.actor,(receiver-human+5)%5);
 rooms.command(b.code,b.token,'action',{method:'pay',args:[['pay'+human]]});assert.equal(g.s.pending,null);
 // Randomized seats preserve relative target selection through the API and reconnect.
 const jail={id:'jail-test',key:'go_to_jail'};g.p(human).hand=[jail];g.s.turn=human;g.s.played=0;
 const localTarget=(receiver-human+5)%5;
 rooms.command(b.code,b.token,'action',{method:'play',args:[jail.id,'play',{target:localTarget}]});
 assert.equal(g.s.pending.e.target,receiver);assert.equal(rooms.view(r,0).state.pending.responder,0);
 rooms.command(a.code,a.token,'action',{method:'respond',args:[false]});assert(g.p(receiver).jailed);
 const reconnect=rooms.view(rooms.get(b.code,b.token).r,1);assert.equal(reconnect.state.players[0].name,'Guest');
 rooms.command(a.code,a.token,'stop');assert.equal(jobs.size,0,'stopping clears independent bot and response timers');
 // The frontend uses the same timer manager. Removing one payer leaves others' clocks intact.
 const manager=new ParallelBotTimers(),fired=[];
 manager.sync([1,2,3],'payment',()=>100,i=>fired.push(i));tick(50);manager.sync([2,3],'payment',()=>100,i=>fired.push(i));tick(50);assert.deepEqual(fired,[2,3]);manager.clear();
 console.log('PASS independent setup/payment clocks; human concurrency; randomized seats, target mapping and reconnect; stop cancels timers');
}finally{rooms.close();global.setTimeout=saved.setTimeout;global.clearTimeout=saved.clearTimeout;Math.random=saved.random;}
