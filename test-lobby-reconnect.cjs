const assert=require('node:assert/strict');
const {Rooms}=require('./rooms.cjs');
const rooms=new Rooms({pace:100000});
try {
 const a=rooms.create('Host'),b=rooms.join(a.code,'Guest');
 assert.equal(rooms.command(a.code,a.token,'leave').left,true);
 let {r,seat}=rooms.get(b.code,b.token);
 assert.equal(rooms.view(r,seat).host,true,'host role transfers');
 assert.equal(r.seats[0],null,'left slot is free');
 assert.throws(()=>rooms.get(a.code,a.token));
 const c=rooms.join(b.code,'New player');
 rooms.command(b.code,b.token,'ready',{ready:true});rooms.command(c.code,c.token,'ready',{ready:true});
 rooms.command(b.code,b.token,'start');
 const old=JSON.stringify(rooms.view(r,seat).state.players[0].hand);
 assert.throws(()=>rooms.command(b.code,b.token,'leave'),/reserved/);
 assert.equal(JSON.stringify(rooms.view(rooms.get(b.code,b.token).r,seat).state.players[0].hand),old,'reconnect retains hand');
 const player=r.gameSeats.indexOf(seat);r.game.s.phase='play';r.game.s.pending={kind:'payment',responder:player};
 assert.equal(rooms.status(r,seat),'Paying');r.game.s.pending=null;r.game.s.turn=player;assert.equal(rooms.status(r,seat),'Playing');
 console.log('PASS lobby leave frees seat, transfers host; in-game seat/token/hand retained; Paying/Playing status');
}finally{rooms.close()}
