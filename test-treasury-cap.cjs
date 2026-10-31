const assert=require('node:assert/strict'),{Game}=require('./engine.cjs'),{Rooms}=require('./rooms.cjs'),deck=require('./deck.json');
function bank(g,i,total){g.p(i).bank=[];let id=0;for(const value of [10,5,3,2,1])while(total>=value){g.p(i).bank.push({id:'test-cash-'+i+'-'+id++,key:`money_${value}m`});total-=value;}}
function balance(g,i){return g.p(i).bank.reduce((n,c)=>n+g.d(c).value,0);}
for(const amount of [0,17,19,20,21,30]){
 const g=new Game(deck,2);g.s.phase='play';g.s.turn=0;g.s.pending=null;g.p(0).special=[{id:'treasury',key:'emergency_treasury'}];bank(g,0,amount);
 const seq=g.s.eventSeq,minted=g.s.minted||0;g.startTurn(0);
 assert.equal(balance(g,0),amount+(amount<20?3:0));assert.equal((g.s.minted||0)-minted,amount<20?1:0);
 const triggers=g.s.events.filter(e=>e.seq>seq&&e.type==='special_trigger'&&e.key==='emergency_treasury');assert.equal(triggers.length,amount<20?1:0);
 if(amount===20){bank(g,0,19);g.startTurn(0);assert.equal(balance(g,0),22,'production resumes below 20M at next turn start');}
}
const rooms=new Rooms();try{
 const a=rooms.create('Host'),b=rooms.join(a.code,'Guest');for(const player of[a,b])rooms.command(player.code,player.token,'ready',{ready:true});rooms.command(a.code,a.token,'start');
 const{r}=rooms.get(a.code,a.token),g=r.game,i=r.gameSeats.indexOf(1);g.s.phase='play';g.s.pending=null;g.s.turn=i;g.p(i).special=[{id:'online-treasury',key:'emergency_treasury'}];bank(g,i,20);g.startTurn(i);
 const view=rooms.view(r,1);assert.equal(view.state.players[0].bank.reduce((n,c)=>n+g.d(c).value,0),20);
 assert(!view.state.events.some(e=>e.type==='special_trigger'&&e.key==='emergency_treasury'));
 console.log('PASS Treasury grants full 3M below 20M, stops at/above 20M without a trigger, resumes next eligible turn, and matches online views');
}finally{rooms.close();}
