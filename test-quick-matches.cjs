const assert=require('node:assert/strict'),{Game,COLORS}=require('./engine.cjs'),{Rooms}=require('./rooms.cjs'),deck=require('./deck.json');
function fresh(n=4,options={}){const g=new Game(deck,n,()=>.41,options);for(const p of g.s.players){g.s.deck.push(...p.hand);p.hand=[];}g.s.phase='play';g.s.turn=0;g.s.startPlayer=0;g.s.roundCompleted=[];g.s.pending=null;g.s.played=0;return g;}
function take(g,key){const i=g.s.deck.findIndex(c=>c.key===key);assert(i>=0,key);return g.s.deck.splice(i,1)[0];}
function sets(g,i){for(const color of ['Brown','Dark Blue','Utility'])for(const d of deck.filter(d=>d.type==='property'&&d.colors[0]===color)){const c=take(g,d.key);g.place(i,c,color);}}
for(let n=2;n<=5;n++){
 const g=new Game(deck,n);assert(g.s.players.every(p=>p.hand.length===7));assert.equal(g.s.phase,'setup');assert(g.s.players.every(p=>g.limit(g.s.players.indexOf(p))===3));
 const match=fresh(n);sets(match,0);match.finishTurn(0);assert.equal(match.s.winner,null);match.finishTurn(1);if(n===2)assert.equal(match.s.winner,0);else{assert.equal(match.s.winner,null);match.finishTurn(2);assert.equal(match.s.winner,0);}
}
{
 const g=fresh(5);sets(g,0);g.finishTurn(0);g.finishTurn(1);assert.equal(g.p(0).defenseRemaining,1);const group=g.p(0).groups[0];g.p(0).hand.push(g.removeProp(0,group.cards[0].id));assert(!g.p(0).defending);assert.equal(g.p(0).defenseRemaining,null);g.finishTurn(2);assert.equal(g.s.winner,null);
}
{
 const g=fresh(4,{roundLimit:10});g.p(2).bank.push(take(g,'money_10m'));
 for(let r=1;r<=10;r++)for(let i=0;i<4;i++){assert.equal(g.s.round,r);g.finishTurn(i);if(r<10||i<3)assert.equal(g.s.winner,null);}
 assert.equal(g.s.round,10);assert.equal(g.s.winner,2);assert.equal(g.s.endReason,'round-limit');assert.equal(g.s.scoreResults.find(r=>r.player===2).total,10);
 const off=fresh(4);for(let r=0;r<11;r++)for(let i=0;i<4;i++)off.finishTurn(i);assert.equal(off.s.winner,null);assert.equal(off.s.round,12);
}
{
 const g=fresh(4,{roundLimit:10});const brown=deck.filter(d=>d.type==='property'&&d.colors[0]==='Brown');for(const d of brown)g.place(0,take(g,d.key),'Brown');const group=g.p(0).groups[0];group.house=take(g,'house');group.hotel=take(g,'hotel');g.p(0).special.push(take(g,'free_parking'));g.p(1).bank.push(take(g,'money_10m'),take(g,'money_2m'));g.p(2).hand.push(take(g,'money_5m'));g.p(3).forfeited=true;g.p(3).bank.push(take(g,'money_5m'));
 g.finishByScore();assert.deepEqual(g.s.winners,[0,1]);assert.equal(g.s.scoreResults[0].field,12);assert.equal(g.s.scoreResults.find(r=>r.player===2).total,0);assert(!g.s.scoreResults.some(r=>r.player===3));
}
{
 const g=fresh(4,{roundLimit:10});g.s.round=10;g.p(0).forfeited=true;g.s.startPlayer=0;g.s.turn=1;g.finishTurn(1);g.finishTurn(2);assert.equal(g.s.winner,null);g.finishTurn(3);assert.equal(g.s.endReason,'round-limit');
}
{
 const g=fresh(5);const c=take(g,'just_say_no');g.p(3).hand.push(c);assert.throws(()=>g.donate(3,c.id,1),/defense/);sets(g,0);g.finishTurn(0);const before=g.s.played;g.s.pending={kind:'counter',responder:1,e:{actor:0,target:1,key:'debt_collector'}};g.donate(3,c.id,1);assert(g.p(1).hand.some(x=>x.id===c.id));assert.equal(g.s.played,before);assert.equal(g.s.pending.kind,'counter');assert.throws(()=>g.donate(1,c.id,1),/another/);
 const small=fresh(3);small.p(0).defending=true;small.p(1).hand.push({id:'x',key:'money_1m'});assert.throws(()=>small.donate(1,'x',2),/4–5/);
}
{
 const rooms=new Rooms({pace:100000,reveal:0});try{
  const a=rooms.create('Host'),b=rooms.join(a.code,'B'),c=rooms.join(a.code,'C'),d=rooms.join(a.code,'D');for(const s of[a,b,c,d])rooms.command(s.code,s.token,'ready',{ready:true});
  assert.throws(()=>rooms.command(b.code,b.token,'options',{roundLimit:10}),/host/);rooms.command(a.code,a.token,'options',{roundLimit:10,fastBots:true});const {r}=rooms.get(a.code,a.token);assert(r.seats.filter(Boolean).every(s=>!s.ready));for(const s of[a,b,c,d])rooms.command(s.code,s.token,'ready',{ready:true});rooms.command(a.code,a.token,'start');
  const g=r.game;assert.equal(g.s.roundLimit,10);assert(g.s.fastBots);assert.throws(()=>rooms.command(a.code,a.token,'options',{roundLimit:null}),/before/);
  g.s.phase='play';const donor=r.gameSeats.indexOf(1),recipient=r.gameSeats.indexOf(2),host=r.gameSeats.indexOf(0);g.p(host).defending=true;
  const card=g.p(donor).hand[0];const target=(recipient-donor+4)%4;rooms.command(b.code,b.token,'action',{method:'donate',args:[card.id,target]});assert(g.p(recipient).hand.some(x=>x.id===card.id));
  for(let seat=0;seat<4;seat++){const v=rooms.view(r,seat),event=v.state.events.findLast(e=>e.type==='donation');assert(event);assert.equal(event.target,(recipient-r.gameSeats.indexOf(seat)+4)%4);assert.equal(event.cards[0].key,[1,2].includes(seat)?card.key:'hidden');}
  rooms.command(a.code,a.token,'options',{fastBots:false});assert(!g.s.fastBots);assert.equal(rooms.view(r,2).options.fastBots,false);
  for(const p of g.s.players)g.s.deck.push(...p.hand.splice(0));g.p(host).bank.push(take(g,'money_10m'));g.finishByScore();for(let seat=0;seat<4;seat++){const v=rooms.view(r,seat);assert.equal(v.state.winner,(host-r.gameSeats.indexOf(seat)+4)%4);assert(v.state.winners.every(i=>i>=0&&i<4));assert(v.state.scoreResults.every(row=>row.player>=0&&row.player<4));}
 }finally{rooms.close();}
}
{
 const g=fresh(4);const base=take(g,'mediterranean_avenue');g.place(0,base,'Brown');g.place(0,take(g,'kentucky_avenue'),'Red');const card=take(g,'expansion_property');card.expansionOwner=0;card.expansionColor='Brown';g.p(0).hand.push(card);
 const options=g.options(0).filter(o=>o.id===card.id);assert(options.length);assert(options.every(o=>o.args.color==='Brown'));for(const option of options)g.validate(0,card,option.mode,option.args);
}
console.log('PASS seven-card setup; 2-turn/full-rotation defense; defense break; optional round-10 boundary and forfeits; scoring, ties and hand exclusion; free out-of-turn donations and privacy; host-only options and reconnect projections');

for (const n of [4,5]) {
 for (const outcome of ['pay','decline','break set']) {
  const g=fresh(n);
  sets(g,0);
  const bankCard=take(g,'money_10m');
  g.p(0).bank.push(bankCard);
  g.finishTurn(0);
  g.p(0).jailed=true;
  g.finishTurn(1);
  assert.equal(g.s.pending,null);
  g.finishTurn(2);
  assert.equal(g.s.winner,null);
  assert.equal(g.s.pending.responder,0);
  assert.equal(g.s.pending.e.defenseBail,true);
  if(outcome==='decline')g.jail(0,false);
  else{
   g.jail(0,true);
   const ids=[bankCard.id];
   if(outcome==='break set')ids.push(g.p(0).groups[0].cards[0].id);
   g.pay(0,ids);
  }
  assert.equal(g.s.winner,outcome==='pay'?0:null);
  if(outcome!=='pay')assert.equal(g.s.turn,3);
 }
}
console.log('PASS jailed defense claims require bail and three surviving sets in four- and five-player games');

for (const players of [4,5]) {
 const g=fresh(players,{fullRotationDefense:true});
 sets(g,0);
 const card=take(g,'money_1m');
 g.p(1).hand.push(card);
 g.finishTurn(0);
 assert(g.p(0).defending);
 assert.throws(()=>g.donate(1,card.id,0),/Donations are disabled/);
 for(let i=1;i<players;i++){
  assert.equal(g.s.winner,null);
  g.finishTurn(i);
 }
 assert.equal(g.s.winner,0);
}
console.log('PASS optional Full Rotation Defense waits for every opponent and disables donations');
