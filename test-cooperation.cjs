const assert=require('node:assert/strict');const {Game}=require('./engine.cjs'),{Rooms}=require('./rooms.cjs'),deck=require('./deck.json');const {syncCooperation,voteCooperationSkip,strategicBotDonations,interventionOrder}=require('./cooperation.cjs');
function fixture(g=new Game(deck,5,()=>.41),defender=4){
 for(const p of g.s.players){g.s.deck.push(...p.hand,...p.bank,...p.special,...p.groups.flatMap(g=>g.cards));p.hand=[];p.bank=[];p.special=[];p.groups=[];p.defending=false;p.defenseRemaining=null;p.forfeited=false;}
 g.s.phase='play';g.s.turn=0;g.s.turnSerial=10;g.s.played=0;g.s.pending=null;g.s.winner=null;delete g.s.cooperation;delete g.s.cooperationTurn;delete g.s.botDonationTurn;
 for(const [color,keys]of [['Brown',['mediterranean_avenue','baltic_avenue']],['Dark Blue',['park_place','boardwalk']],['Utility',['electric_company','water_works']]])for(const key of keys)g.place(defender,take(g,key),color);
 g.p(defender).defending=true;g.p(defender).defenseRemaining=2;return g;
}
function take(g,key){const i=g.s.deck.findIndex(c=>c.key===key);assert(i>=0,key);return g.s.deck.splice(i,1)[0];}
{
 const g=fixture(),isBot=i=>[1,3,4].includes(i);g.s.turn=1;
 syncCooperation(g,isBot,[0,2],1000);const id=g.s.cooperation.id;assert.equal(g.s.cooperation.deadline,31000);
 syncCooperation(g,isBot,[0,2],5000);assert.equal(g.s.cooperation.deadline,31000,'snapshots never restart the window');
 voteCooperationSkip(g,0,id,6000);voteCooperationSkip(g,0,id,6001);assert.deepEqual(g.s.cooperation.votes,[0]);syncCooperation(g,isBot,[0,2],7000);assert(g.s.cooperation);
 assert.throws(()=>voteCooperationSkip(g,3,id,7000));voteCooperationSkip(g,2,id,7001);syncCooperation(g,isBot,[0,2],7001);assert(!g.s.cooperation);
 syncCooperation(g,isBot,[0,2],8000);assert(!g.s.cooperation,'unanimous skip only closes this turn once');
 g.s.turn=3;g.s.turnSerial++;syncCooperation(g,isBot,[0,2],9000);assert.equal(g.s.cooperation.deadline,39000);assert.throws(()=>voteCooperationSkip(g,0,id,10000),'stale vote cannot skip a new window');
 voteCooperationSkip(g,0,g.s.cooperation.id,10000);syncCooperation(g,isBot,[0],11000);assert(!g.s.cooperation,'disconnected non-voter cannot block unanimous skip');
 g.s.turn=1;g.s.turnSerial++;syncCooperation(g,isBot,[0,2],20000);syncCooperation(g,isBot,[0,2],49999);assert(g.s.cooperation);syncCooperation(g,isBot,[0,2],50000);assert(!g.s.cooperation,'exact server deadline releases the turn');
 g.s.turnSerial++;syncCooperation(g,isBot,[0],51000);assert(g.s.cooperation);g.p(4).defending=false;syncCooperation(g,isBot,[0],52000);assert(!g.s.cooperation,'broken defense cancels pause');
}
{
 const g=fixture(),donor=3,isBot=i=>i!==0;const gift=take(g,'deal_breaker');g.p(donor).hand=[gift];assert.deepEqual(interventionOrder(g,4),[0,1]);
 const used=g.s.played;assert.equal(strategicBotDonations(g,isBot,[0]),1);assert(g.p(0).hand.some(c=>c.id===gift.id));assert(!g.p(donor).hand.length);assert.equal(g.s.played,used,'donation is free and never forces a play');assert.equal(strategicBotDonations(g,isBot,[0]),0,'bot does not flood hand on repeated snapshots');
 const tooLate=fixture();tooLate.p(2).hand=[take(tooLate,'deal_breaker')];tooLate.s.turn=1;tooLate.p(4).defenseRemaining=1;assert.equal(strategicBotDonations(tooLate,isBot,[0]),0,'no human can act before victory');
 const canAct=fixture();canAct.p(1).hand=[take(canAct,'deal_breaker')];assert.equal(strategicBotDonations(canAct,isBot,[0]),0,'bot keeps its card when it can act in time');
 const noMatch=fixture();noMatch.p(3).hand=[take(noMatch,'rent_brown_light_blue')];assert.equal(strategicBotDonations(noMatch,isBot,[0]),0,'unusable matching-color rent is kept');
}
console.log('PASS live deadline invariance; duplicate/stale/bot votes; unanimous skip; disconnected voters; exact expiry; defense cancellation; legal timely bot aid; recipient freedom');
// Server integration uses a deterministic clock rather than waiting thirty real seconds.
const saved={setTimeout,clearTimeout,now:Date.now};let now=100000,next=0;const jobs=new Map();global.setTimeout=(fn,ms)=>{const id=++next;jobs.set(id,{fn,at:now+ms});return id;};global.clearTimeout=id=>jobs.delete(id);Date.now=()=>now;
const tick=ms=>{const end=now+ms;for(let guard=0;guard<1000;guard++){const due=[...jobs].filter(([,x])=>x.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due){now=end;return;}now=due[1].at;jobs.delete(due[0]);due[1].fn();}throw Error('timer loop');};
const rooms=new Rooms({pace:100,reveal:0});try{
 const host=rooms.create('Host'),guest=rooms.join(host.code,'Guest');for(const slot of [2,3,4])rooms.command(host.code,host.token,'bot',{slot});for(const p of [host,guest])rooms.command(p.code,p.token,'ready',{ready:true});rooms.command(host.code,host.token,'start');const {r}=rooms.get(host.code,host.token),g=r.game;
 clearTimeout(r.timer);r.parallel?.clear();r.streams.set('host',{seat:0,res:{write(){},end(){}}});r.streams.set('guest',{seat:1,res:{write(){},end(){}}});const bots=r.gameSeats.flatMap((seat,i)=>r.seats[seat].bot?[i]:[]);fixture(g,bots[2]);g.s.turn=bots[0];let calls=0;g.bot=()=>{calls++;return null;};rooms.broadcast(r);rooms.schedule(r);
 const id=g.s.cooperation.id,deadline=g.s.cooperation.deadline;const hv=rooms.view(r,0),gv=rooms.view(r,1);assert(hv.state.cooperation.eligible.includes(0));assert(gv.state.cooperation.eligible.includes(0));assert.equal(hv.state.cooperation.actor,(bots[0]-r.gameSeats.indexOf(0)+5)%5);assert.equal(hv.serverTime,now);
 rooms.command(host.code,host.token,'cooperation-skip',{id});assert.equal(g.s.cooperation.votes.length,1);tick(5000);assert.equal(calls,0);assert.equal(g.s.cooperation.deadline,deadline);const reconnect=rooms.view(r,1);assert.equal(reconnect.state.cooperation.deadline,deadline);assert.equal(reconnect.state.cooperation.votes.length,1);
 rooms.command(guest.code,guest.token,'cooperation-skip',{id});assert(!g.s.cooperation);tick(100);assert(calls>0,'unanimous skip resumes normal bot scheduling');clearTimeout(r.timer);r.timer=null;
 g.s.turnSerial++;rooms.broadcast(r);rooms.schedule(r);assert(g.s.cooperation);const before=calls;tick(29999);assert.equal(calls,before);tick(1);assert(!g.s.cooperation);tick(100);assert(calls>before,'server expiry resumes bots with no client action');
 clearTimeout(r.timer);r.timer=null;g.s.turnSerial++;rooms.broadcast(r);rooms.schedule(r);const stale=g.s.cooperation.id;now=g.s.cooperation.deadline;
 assert.throws(()=>rooms.command(host.code,host.token,'cooperation-skip',{id:stale}));assert(!g.s.cooperation);assert(r.timer,'an expiry/skip race must still resume scheduling');
 rooms.command(host.code,host.token,'stop');assert.equal(jobs.size,0,'stop clears cooperation/bot/response timers');
 console.log('PASS room seat rotation; server time; live shared votes and reconnect; no bot actions inside window; unanimous/timeout release; stop cleanup');
}finally{rooms.close();global.setTimeout=saved.setTimeout;global.clearTimeout=saved.clearTimeout;Date.now=saved.now;}
