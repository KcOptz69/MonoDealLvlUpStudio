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
  if(!p){g.end(actor,false);if(g.s.pending?.kind==='estate')g.estate(actor,false);break;}
  else if(p.kind==='discard')g.discard(p.responder,g.p(p.responder).hand.slice(0,Math.max(0,g.p(p.responder).hand.length-g.handLimit(p.responder))).map(c=>c.id));
  else if(p.kind==='estate'){g.estate(p.responder,false);break;}
  else if(p.kind==='jail'){g.jail(p.responder,false);break;}
  else if(p.kind==='chance')g.choose(p.responder,p.cards[0].id);
  else if(p.kind==='expansion')g.choose(p.responder,p.colors[0]);
  else break;
 }
}
const RESERVE_MS = 5 * 60 * 1000;

function obligations(pending) {
 if (pending?.kind === 'discard') {
  return [{ owner: pending.responder, entry: pending, field: 'deadline', duration: 30000 }];
 }
 if (pending?.kind === 'payment') {
  return (pending.payments || [pending.e]).map(effect => ({
   owner: effect.target, entry: effect, field: 'paymentDeadline', duration: 15000
  }));
 }
 return [];
}

function syncClock(room, now = Date.now()) {
 const game = room.game;
 if (!game) {
  room.onlineClock = null;
  room.reserveGame = null;
  return;
 }
 if (room.reserveGame !== game) {
  room.reserveGame = game;
  room.onlineClock = null;
  room.reserve = game.s.players.map(() => RESERVE_MS);
 }
 const key = game.isSetup() || game.s.winner !== null ? null : game.s.turnSerial + ':' + game.s.turn;
 let clock = room.onlineClock;
 if (clock) {
  const elapsed = Math.max(0, now - clock.last);
  if (clock.running) {
   const overtime = Math.max(0, elapsed - clock.remaining);
   clock.remaining = Math.max(0, clock.remaining - elapsed);
   room.reserve[clock.owner] = Math.max(0, room.reserve[clock.owner] - overtime);
  }
  for (const {owner, entry, field} of clock.obligations) {
   if (clock.frozen) entry[field] += elapsed;
   else {
    const overtime = Math.max(0, now - Math.max(clock.last, entry[field]));
    room.reserve[owner] = Math.max(0, room.reserve[owner] - overtime);
   }
  }
  clock.last = now;
 }
 if (!clock || clock.key !== key || clock.owner !== game.s.turn) {
  const limit = game.s.turnRefill ? 120000 : 60000;
  clock = room.onlineClock = {
   key, remaining: limit, limit, last: now, running: false,
   owner: game.s.turn, frozen: false, obligations: [], suspendedPayments: new Map()
  };
 }
 if (game.s.turnRefill && clock.limit === 60000) {
  clock.remaining += 60000;
  clock.limit = 120000;
 }

 const pending = game.s.pending;
 const active = obligations(pending);
 const activePayments = active.filter(item => item.field === 'paymentDeadline').map(item => item.entry);
 for (const effect of [...(game.s.queue || []), game.s.iou?.payment].filter(Boolean)) {
  if (effect.paymentDeadline && !activePayments.includes(effect) && !clock.suspendedPayments.has(effect)) {
   clock.suspendedPayments.set(effect, now);
  }
 }
 for (const effect of activePayments) {
  if (!clock.suspendedPayments.has(effect)) continue;
  effect.paymentDeadline += now - clock.suspendedPayments.get(effect);
  clock.suspendedPayments.delete(effect);
 }
 for (const {entry, field, duration} of active) {
  if (entry[field] === undefined) entry[field] = now + duration;
 }
 if (pending?.kind === 'payment') pending.deadline = Math.min(...activePayments.map(effect => effect.paymentDeadline));

 clock.frozen = !!room.paused || game.s.players.some(player => player.defending && !player.forfeited);
 clock.obligations = active;
 clock.running = !!key && !clock.frozen && !game.s.cooperation &&
  !['counter', 'payment', 'discard'].includes(pending?.kind);

 if (!clock.frozen && game.s.winner === null) {
  for (const {owner, entry, field} of active) {
   if (entry[field] > now || room.reserve[owner] > 0) continue;
   const current = game.s.pending;
   if (current === pending && pending.kind === 'discard') {
    const hand = [...game.p(owner).hand];
    game.shuffle(hand);
    game.log(game.p(owner).name + ' ran out of discard time. Excess cards discarded automatically.');
    game.discard(owner, hand.slice(0, Math.max(0, hand.length - game.handLimit(owner))).map(card => card.id));
   } else if (current?.kind === 'payment' && (current.payments || [current.e]).includes(entry)) {
    game.log(game.p(owner).name + ' ran out of payment time. Paying automatically from the bank first.');
    if (entry.key === 'jail_bail' && game.assetValue(owner) < 10) game.jail(owner, false);
    else game.pay(owner, randomPayment(game, owner, entry));
   }
  }
  if (clock.running && clock.remaining === 0 && room.reserve[clock.owner] === 0) expireTurn(game);
 }
 if (game.s.pending !== pending || game.s.turn !== clock.owner || (key && game.s.winner !== null)) {
  return syncClock(room, now);
 }
 return clock;
}

function clockWake(room, now = Date.now()) {
 const clock = room.onlineClock;
 if (!clock || clock.frozen || room.game.s.winner !== null) return null;
 const waits = clock.obligations.map(({owner, entry, field}) =>
  entry[field] > clock.last ? entry[field] - now : room.reserve[owner] - (now - clock.last));
 if (clock.running) waits.push((clock.remaining || room.reserve[clock.owner]) - (now - clock.last));
 return waits.length ? Math.max(1, Math.min(...waits)) : null;
}

function reserveView(room, now) {
 const clock = room.onlineClock;
 if (!clock || !room.reserve) return [];
 return room.reserve.map((remaining, owner) => {
  if (clock.frozen) return { remaining, running: false };
  const deadlines = clock.obligations
   .filter(item => item.owner === owner)
   .map(item => item.entry[item.field]);
  if (clock.running && clock.owner === owner) deadlines.push(clock.last + clock.remaining);
  const starts = Math.min(...deadlines);
  const overtime = Math.max(0, now - Math.max(clock.last, starts));
  return { remaining: Math.max(0, remaining - overtime), running: starts <= now && remaining > overtime };
 });
}

function pauseClock(room, paused, now = Date.now()) {
 if (paused === !!room.paused) return;
 syncClock(room, now);
 if (paused) {
  room.paused = true;
  room.pausedAt = now;
 } else {
  const elapsed = Math.max(0, now - room.pausedAt);
  const pending = room.game?.s.pending;
  if (pending?.kind === 'counter' && pending.deadline) pending.deadline += elapsed;
  if (room.game?.s.cooperation) room.game.s.cooperation.deadline += elapsed;
  if (room.motionUntil) room.motionUntil += elapsed;
  room.paused = false;
  room.pausedAt = null;
 }
 syncClock(room, now);
}
module.exports = {syncClock, pauseClock, randomPayment, expireTurn, clockWake, reserveView};
