'use strict';
const assert=require('node:assert/strict');
const {Game}=require('./engine.cjs'),deck=require('./deck.json');
const {syncClock,pauseClock,randomPayment}=require('./online-clock.cjs');
const {Rooms}=require('./rooms.cjs');
const card=(key,id=key)=>({key,id});
function game(empty=false,vault=false){const g=new Game(deck,3,()=>.4);g.s.phase='play';g.s.turn=0;g.s.pending=null;g.s.queue=[];g.s.winner=null;g.p(0).hand=empty?[]:[card('money_1m')];g.p(0).special=vault?[card('private_vault')]:[];g.begin();return g;}
let g=game(),r={game:g};syncClock(r,1000);assert.equal(r.onlineClock.limit,60000);syncClock(r,11000);assert.equal(r.onlineClock.remaining,50000);
let old=g.s.turn,draws=g.s.events.filter(e=>e.type==='draw'&&e.actor===old).length;syncClock(r,61001);assert.notEqual(g.s.turn,old);assert.equal(g.s.events.filter(e=>e.type==='draw'&&e.actor===old).length,draws,'timeout never draws unused AP');
for(const vault of [false,true]){g=game(true,vault);r={game:g};syncClock(r,1000);assert.equal(r.onlineClock.limit,120000);assert.equal(g.p(0).hand.length,vault?7:5);}
g=game();r={game:g};syncClock(r,1000);syncClock(r,6000);g.s.pending={kind:'counter',responder:1,deadline:16000,e:{actor:0,target:1,key:'debt_collector',amount:5}};syncClock(r,6000);syncClock(r,15000);assert.equal(r.onlineClock.remaining,55000);g.s.pending=null;syncClock(r,15000);syncClock(r,20000);assert.equal(r.onlineClock.remaining,50000);
// Simultaneous bills keep their own original deadlines when another payer resolves.
g=game();r={game:g};g.p(0).bank=[];g.p(1).bank=[card('money_5m','b1')];g.p(2).bank=[card('money_5m','b2')];const e1={actor:0,target:1,key:'rent',amount:5},e2={actor:0,target:2,key:'rent',amount:5};g.s.pending={kind:'payment',responder:1,e:e1,payments:[e1,e2]};syncClock(r,1000);assert.equal(e1.paymentDeadline,16000);g.pay(1,['b1']);syncClock(r,6000);assert.equal(e2.paymentDeadline,16000);syncClock(r,16000);assert.equal(g.s.pending,null);assert.equal(g.p(0).bank.length,2);
// Random timeout payments use bank before field and respect properties-only actions.
g=game();g.p(1).bank=[card('money_5m','bank')];g.p(1).special=[card('free_parking','prop')];assert.deepEqual(randomPayment(g,1,{key:'rent',amount:5}),['bank']);assert.deepEqual(randomPayment(g,1,{key:'compulsory_purchase',amount:3}),['prop']);
// Host pause freezes active turn, reaction, payment and discard deadlines.
for(const kind of ['counter','payment','discard']){g=game();r={game:g};g.s.pending=kind==='discard'?{kind,responder:0}:{kind,responder:1,e:{actor:0,target:1,key:'rent',amount:5},deadline:11000};if(kind==='payment')g.p(1).bank=[card('money_5m')];syncClock(r,1000);const end=g.s.pending.deadline;pauseClock(r,true,2000);syncClock(r,60000);assert.ok(g.s.pending);pauseClock(r,false,62000);assert.equal(g.s.pending.deadline,end+60000);syncClock(r,62000);assert.ok(g.s.pending);}
g=game();r={game:g};syncClock(r,1000);syncClock(r,6000);pauseClock(r,true,6000);syncClock(r,66000);assert.equal(r.onlineClock.remaining,55000);pauseClock(r,false,66000);syncClock(r,71000);assert.equal(r.onlineClock.remaining,50000);
// Discard is a dedicated 30-second deadline; only excess cards are removed.
g=game();g.p(0).hand=Array.from({length:10},(_,i)=>card('money_1m','h'+i));g.end(0,false);r={game:g};syncClock(r,1000);assert.equal(g.s.pending.deadline,31000);old=g.s.turn;syncClock(r,31000);assert.equal(g.p(old).hand.length,7);assert.notEqual(g.s.turn,old);
// A turn timeout still gives the player a separate 30-second excess-card discard window.
g=game();g.p(0).hand=Array.from({length:10},(_,i)=>card('money_1m','timeout'+i));r={game:g};syncClock(r,1000);syncClock(r,61000);assert.equal(g.s.pending.kind,'discard');assert.equal(g.s.pending.deadline,91000);assert.equal(g.p(0).hand.length,10);syncClock(r,91000);assert.equal(g.p(0).hand.length,7);
// Free Parking allows a fourth bank at zero AP, only once per turn.
g=game();g.p(0).special=[card('free_parking')];g.p(0).hand=[card('money_5m','free'),card('money_1m','paid')];g.s.played=3;g.play(0,'free','bank');assert.equal(g.s.played,3);assert.throws(()=>g.play(0,'paid','bank'),/No card plays/);
// Tough Luck reports exact received cards; unconnected observers never receive hand identities.
g=game();g.p(1).hand=[card('money_5m','luck')];g.resolve({actor:0,target:1,key:'tough_luck',category:'money'});assert.equal(g.s.events.find(e=>e.type==='tough_luck_result').cards[0].id,'luck');
const rooms=new Rooms(),host=rooms.create('Host'),guest=rooms.join(host.code,'Guest'),watcher=rooms.join(host.code,'Watcher');r=rooms.get(host.code,host.token).r;r.game=g;r.gameSeats=[0,1,2];assert.equal(rooms.view(r,2).state.events.find(e=>e.type==='tough_luck_result').cards[0].key,'hidden');assert.equal(rooms.view(r,0).state.events.find(e=>e.type==='tough_luck_result').cards[0].key,'money_5m');
rooms.command(host.code,host.token,'pause',{paused:true});assert.throws(()=>rooms.command(host.code,guest.token,'pause',{paused:false}),/Only the host/);assert.throws(()=>rooms.command(host.code,guest.token,'action',{method:'end',args:[false]}),/paused/);rooms.command(host.code,host.token,'pause',{paused:false});assert.equal(rooms.view(r,0).paused,false);rooms.close();
console.log('Online turn/refill, paused phases, simultaneous payments, discard expiry, host authorization, Free Parking and Tough Luck privacy passed.');

(async()=>{const rooms=new Rooms(),host=rooms.create('Host'),guest=rooms.join(host.code,'Guest');const r=rooms.get(host.code,host.token).r;r.game=game();r.gameSeats=[0,1];rooms.broadcast(r);r.onlineClock.remaining=30;r.onlineClock.last=Date.now();const actor=r.game.s.turn;rooms.broadcast(r);await new Promise(resolve=>setTimeout(resolve,90));assert.notEqual(r.game.s.turn,actor,'live server callback expires turn without client request');rooms.close();console.log('Live authoritative timer callback passed.');})().catch(error=>{console.error(error);process.exitCode=1;});
