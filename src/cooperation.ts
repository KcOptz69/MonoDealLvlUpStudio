export const COOPERATION_MS=30000;
export interface CooperationWindow {id:string;actor:number;deadline:number;eligible:number[];votes:number[]}
const turnKey=(g:any)=>`${g.s.turnSerial||0}:${g.s.turn}`;
const activeDefense=(g:any)=>g.s.phase!=='setup'&&g.s.winner===null&&g.s.players.length>=4&&g.s.players.length<=5&&g.s.players.some((p:any)=>p.defending&&!p.forfeited);
// Opponents who can still complete a turn before this defender wins.
export function interventionOrder(g:any,defender:number):number[]{
 let left=g.p(defender).defenseRemaining??g.s.players.length-1;const order:number[]=[];
 for(let step=0;step<g.s.players.length&&left>0;step++){
  const i=(g.s.turn+step)%g.s.players.length;if(g.p(i).forfeited)continue;if(i===defender)break;
  order.push(i);left--;
 }
 return order;
}
function threatValue(g:any,receiver:number,defender:number,card:any,plan:any):number{
 const a=plan.args||{},key=card.key;if(plan.mode!=='play')return 0;
 if(a.target!==undefined&&a.target!==defender)return 0;
 const field=g.p(defender).groups;
 if(key==='deal_breaker'&&g.full(g.group(defender,a.group)))return 100;
 if(['eviction_notice','forced_rezoning'].includes(key)){
  const f=g.find(defender,a.property);return f?.group&&g.full(f.group)?90:0;
 }
 let bill=0;
 if(key==='compulsory_purchase')bill=5;
 else if(key==='debt_collector')bill=5;
 else if(key==='luxury_tax')bill=g.sets(defender)*5;
 else if(key==='its_my_birthday')bill=2;
 else if(g.d(card).type==='rent'){
  bill=(key==='empire_rent'?g.allProps(receiver).length:g.rent(receiver,g.group(receiver,a.group)))*2**g.doubleIds(a).length;
  if(g.has(receiver,'luxury_district'))bill++;
  if(g.has(defender,'rent_controlled_residence'))bill=Math.max(0,bill-2);
 }else return 0;
 const loose=g.allProps(defender).filter((c:any)=>{const f=g.find(defender,c.id);return !f?.group||!g.full(f.group);}).reduce((n:number,c:any)=>n+g.d(c).value,0);
 const bank=key==='compulsory_purchase'?0:g.p(defender).bank.reduce((n:number,c:any)=>n+g.d(c).value,0);
 return bill>bank+loose?50+bill:0;
}
export function strategicBotDonations(g:any,isBot:(i:number)=>boolean,humans:number[]):number{
 if(!activeDefense(g)||g.s.pending||!humans.length)return 0;
 const key=turnKey(g);if(g.s.botDonationTurn===key)return 0;g.s.botDonationTurn=key;
 let donated=0;
 for(let donor=0;donor<g.s.players.length;donor++){
  if(!isBot(donor)||g.p(donor).forfeited||g.p(donor).defending)continue;
  let best:{id:string;receiver:number;score:number}|null=null;
  for(let defender=0;defender<g.s.players.length;defender++){
   if(!g.p(defender).defending||g.p(defender).forfeited)continue;
   const order=interventionOrder(g,defender);if(order.includes(donor))continue;
   for(const receiver of order){
    if(!humans.includes(receiver)||isBot(receiver)||receiver===donor||g.p(receiver).jailed)continue;
    const shadow=Object.create(Object.getPrototypeOf(g));shadow.defs=g.defs;shadow.random=g.random;shadow.s=JSON.parse(JSON.stringify(g.s));
    shadow.s.turn=receiver;shadow.s.pending=null;shadow.p(receiver).hand=[];if(receiver!==g.s.turn)shadow.s.played=0;
    // Evaluate legal plays against the public board, never an opponent's hidden hand.
    for(const card of [...g.p(donor).hand]){
     if(!['action','rent'].includes(g.d(card).type))continue;
     shadow.p(receiver).hand.push({...card});
     const plans=shadow.options(receiver).filter((o:any)=>o.id===card.id);
     for(const plan of plans){const score=threatValue(shadow,receiver,defender,card,plan)-order.indexOf(receiver);if(score>0&&(!best||score>best.score))best={id:card.id,receiver,score};}
     shadow.p(receiver).hand=shadow.p(receiver).hand.filter((c:any)=>c.id!==card.id);
    }
   }
  }
  if(best){g.donate(donor,best.id,best.receiver);donated++;}
 }
 return donated;
}
export function syncCooperation(g:any,isBot:(i:number)=>boolean,humans:number[],now=Date.now()):boolean{
 const before=JSON.stringify(g.s.cooperation||null),seq=g.s.eventSeq;
 const eligible=[...new Set(humans)].filter(i=>Number.isInteger(i)&&g.p(i)&&!isBot(i)&&!g.p(i).forfeited).sort((a,b)=>a-b);
 if(!activeDefense(g)){delete g.s.cooperation;return before!=='null';}
 strategicBotDonations(g,isBot,eligible);
 const key=turnKey(g);let window=g.s.cooperation as CooperationWindow|undefined;
 if(window&&(window.id!==key||!isBot(g.s.turn)||g.p(g.s.turn).forfeited)){delete g.s.cooperation;window=undefined;}
 if(window){
  window.eligible=eligible;window.votes=window.votes.filter(i=>eligible.includes(i));
  if(now>=window.deadline||!eligible.length||eligible.every(i=>window!.votes.includes(i)))delete g.s.cooperation;
 }else if(!g.s.pending&&isBot(g.s.turn)&&!g.p(g.s.turn).forfeited&&g.s.cooperationTurn!==key){
  g.s.cooperationTurn=key;
  if(eligible.length)g.s.cooperation={id:key,actor:g.s.turn,deadline:now+COOPERATION_MS,eligible,votes:[]};
 }
 return before!==JSON.stringify(g.s.cooperation||null)||seq!==g.s.eventSeq;
}
export function voteCooperationSkip(g:any,actor:number,id:string,now=Date.now()):void{
 const window=g.s.cooperation as CooperationWindow|undefined;
 if(!window||window.id!==id||window.id!==turnKey(g)||now>=window.deadline)throw Error('This cooperation window has ended.');
 if(!window.eligible.includes(actor)||g.p(actor)?.forfeited)throw Error('Only connected human players can vote.');
 if(!window.votes.includes(actor))window.votes.push(actor);
}
