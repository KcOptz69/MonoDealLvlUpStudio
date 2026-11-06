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

{
 const {EventEmitter}=require('node:events');
 const rooms=new Rooms();
 const connect=(code,token)=>{
  const stream=new EventEmitter();
  stream.write=()=>true;
  stream.end=()=>stream.emit('close');
  rooms.subscribe(code,token,stream);
  return stream;
 };
 try {
  const host=rooms.create('Host'),guest=rooms.join(host.code,'Guest');
  const a=connect(host.code,host.token),b=connect(host.code,host.token);
  connect(host.code,guest.token);
  for(const player of [host,guest])rooms.command(host.code,player.token,'ready',{ready:true});
  rooms.command(host.code,host.token,'start');
  const {r,seat}=rooms.get(host.code,guest.token);
  a.end();
  assert(!rooms.view(r,seat).paused);
  b.end();
  assert(rooms.view(r,seat).hostDisconnected);
  assert(rooms.view(r,seat).paused);
  assert.throws(()=>rooms.command(host.code,guest.token,'action',{method:'end'}),/waiting for the host/i);
  const restored=connect(host.code,host.token);
  assert(!rooms.view(r,seat).paused);
  rooms.command(host.code,host.token,'pause',{paused:true});
  restored.end();
  connect(host.code,host.token);
  assert(rooms.view(r,seat).paused);
  assert(!rooms.view(r,seat).hostDisconnected);
 } finally {rooms.close();}
 console.log('PASS host disconnect pauses, reconnect resumes, and manual pause survives');
}

{
 const rooms=new Rooms();
 try {
  const host=rooms.create('Host'),guest=rooms.join(host.code,'Guest');
  const slot=rooms.get(host.code,guest.token).seat;
  assert.throws(()=>rooms.command(host.code,guest.token,'kick',{slot:0}),/Only the host/);
  assert.throws(()=>rooms.command(host.code,host.token,'kick',{slot:0}),/another player/);
  const {EventEmitter}=require('node:events');
  const stream=new EventEmitter();
  let kicked='';
  stream.write=()=>true;
  stream.end=(message)=>{kicked=message;stream.emit('close');};
  rooms.subscribe(host.code,guest.token,stream);
  const view=rooms.command(host.code,host.token,'kick',{slot});
  assert.equal(view.seats[slot],null);
  assert.match(kicked,/event: kicked/);
  assert.throws(()=>rooms.get(host.code,guest.token));
  const replacement=rooms.join(host.code,'Replacement');
  for(const player of [host,replacement])rooms.command(host.code,player.token,'ready',{ready:true});
  rooms.command(host.code,host.token,'start');
  assert.throws(()=>rooms.command(host.code,host.token,'kick',{slot}),/before the match/);
 } finally {rooms.close();}
 console.log('PASS host-only lobby kick revokes the seat and notifies the removed player');
}
