'use strict';
// Authoritative online deadlines. Clients display these clocks; only the server expires them.
function randomPayment(g,actor,e){
 const all=g.payable(actor,e),shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
 const ordered=[...shuffle(all.filter(x=>x.zone==='bank')),...shuffle(all.filter(x=>x.zone!=='bank'))];
 const ids=[];let sum=0;for(const x of ordered){if(sum>=e.amount)break;ids.push(x.id);sum+=x.value;}return ids;
}
function expireTurn(g){
 const actor=g.s.turn;g.log(g.p(actor).name+' ran out of time and passed without drawing.');
 // Finish outstanding non-reaction choices legally before passing. Reactions/payments suspend the clock.
 for(let guard=0;guard<20&&g.s.turn===actor&&g.s.winner===null;guard++){
  const p=g.s.pending;
  if(!p){g.end(actor,false);break;}
  else if(p.kind==='discard')g.discard(p.responder,g.p(p.responder).hand.slice(0,Math.max(0,g.p(p.responder).hand.length-g.handLimit(p.responder))).map(c=>c.id));
  else if(p.kind==='jail'){g.jail(p.responder,false);break;}
  else if(p.kind==='chance')g.choose(p.responder,p.cards[0].id);
  else if(p.kind==='expansion')g.choose(p.responder,p.colors[0]);
  else break;
 }
}
function syncClock(r,now=Date.now()){
 const g=r.game;if(!g){r.onlineClock=null;return;}
 const key=g.isSetup()||g.s.winner!==null?null:g.s.turnSerial+':'+g.s.turn;
 let c=r.onlineClock;
 if(!c||c.key!==key){c=r.onlineClock={key,remaining:g.s.turnRefill?120000:60000,limit:g.s.turnRefill?120000:60000,last:now,running:false,suspendedPayments:new Map()};}
 // Account for the phase that was active since the previous snapshot, before processing a new action.
 if(c.running&&!r.paused)c.remaining=Math.max(0,c.remaining-Math.max(0,now-c.last));
 c.last=now;
 // Jail bail can postpone the start-of-turn refill until after this turn key was first observed.
 if(g.s.turnRefill&&c.limit===60000){c.remaining+=60000;c.limit=120000;}
 let p=g.s.pending;
 const active=p?.kind==='payment'?(p.payments||[p.e]):[];
 for(const e of [...(g.s.queue||[]),g.s.iou?.payment].filter(Boolean))if(e.paymentDeadline&&!active.includes(e)&&!c.suspendedPayments.has(e))c.suspendedPayments.set(e,now);
 for(const [e,started] of c.suspendedPayments)if(active.includes(e)){e.paymentDeadline+=Math.max(0,now-started);c.suspendedPayments.delete(e);}

 if(p?.kind==='discard'){
  if(!p.deadline)p.deadline=now+30000;
  if(!r.paused&&p.deadline<=now){const hand=[...g.p(p.responder).hand];for(let i=hand.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[hand[i],hand[j]]=[hand[j],hand[i]];}g.log(g.p(p.responder).name+' discard timer expired. Excess cards discarded automatically.');g.discard(p.responder,hand.slice(0,Math.max(0,hand.length-g.handLimit(p.responder))).map(c=>c.id));}
 }
 if(p?.kind==='payment'){
  for(const e of p.payments||[p.e])if(!e.paymentDeadline)e.paymentDeadline=now+15000;
  p.deadline=Math.min(...(p.payments||[p.e]).map(e=>e.paymentDeadline));
  if(!r.paused){
   const due=(p.payments||[p.e]).filter(e=>e.paymentDeadline<=now);
   for(const e of due){
    const current=g.s.pending;if(current?.kind!=='payment'||!(current.payments||[current.e]).includes(e))continue;
    g.log(g.p(e.target).name+' payment timed out. Paying automatically from the bank first.');
    if(e.key==='jail_bail'&&g.assetValue(e.target)<10)g.jail(e.target,false);
    else g.pay(e.target,randomPayment(g,e.target,e));
   }
  }
 }
 if(key&&!r.paused&&!g.s.pending&&!g.s.cooperation&&c.remaining<=0)expireTurn(g);
 else if(key&&!r.paused&&c.remaining<=0&&g.s.pending&&!['counter','payment','discard'].includes(g.s.pending.kind)&&!g.s.cooperation)expireTurn(g);
 const nextKey=g.isSetup()||g.s.winner!==null?null:g.s.turnSerial+':'+g.s.turn;
 if(nextKey!==key)return syncClock(r,now);
 if(g.s.pending?.kind==='discard'&&!g.s.pending.deadline)g.s.pending.deadline=now+30000;
 c.running=!!key&&!r.paused&&!g.s.cooperation&&!['counter','payment','discard'].includes(g.s.pending?.kind);
 return c;
}
function pauseClock(r,paused,now=Date.now()){
 if(paused===!!r.paused)return;
 if(paused){r.paused=true;r.pausedAt=now;if(r.onlineClock)r.onlineClock.running=false;}
 else{
  const delta=Math.max(0,now-r.pausedAt);const p=r.game?.s.pending;
  if(p?.deadline)p.deadline+=delta;
  if(p?.kind==='payment')for(const e of p.payments||[p.e])if(e.paymentDeadline)e.paymentDeadline+=delta;
  if(r.game?.s.cooperation)r.game.s.cooperation.deadline+=delta;
  if(r.motionUntil)r.motionUntil+=delta;
  r.paused=false;r.pausedAt=null;if(r.onlineClock)r.onlineClock.last=now;syncClock(r,now);
 }
}
module.exports={syncClock,pauseClock,randomPayment,expireTurn};
