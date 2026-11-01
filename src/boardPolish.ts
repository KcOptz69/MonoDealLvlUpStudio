import {useEffect,useRef} from 'react';
import {COLORS,getCardDef} from './engineBridge';
import type {GameState,GameEvent} from './types';
export function completeGroupIds(state:GameState):Set<string>{
 return new Set(state.players.flatMap(p=>p.groups.filter(g=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0)).map(g=>g.id)));
}
export function useBoardPolish(state:GameState){
 const previous=useRef<{ids:Set<string>;seq:number}|null>(null);
 const pending=useRef(new Map<string,number>());
 const current=useRef(state);current.current=state;
 const timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const glow=(id:string)=>{
  if(!completeGroupIds(current.current).has(id)||!/^[a-zA-Z0-9_-]+$/.test(id))return;
  document.querySelectorAll<HTMLElement>(`.table .group[data-group-id="${id}"]`).forEach(el=>{
   el.classList.remove('set-completion-glow');void el.offsetWidth;el.classList.add('set-completion-glow');
   const timer=setTimeout(()=>{el.classList.remove('set-completion-glow');timers.current.delete(timer);},current.current.fastBots?650:1100);timers.current.add(timer);
  });
 };
 useEffect(()=>{
  const landed=(event:Event)=>{const motion=(event as CustomEvent<GameEvent>).detail;const seq=motion?.seq;
   if(motion?.type==='payment')for(const card of motion.cards||[]){
    if(!/^[a-zA-Z0-9_-]+$/.test(card.id))continue;
    document.querySelectorAll<HTMLElement>(`.table [data-card-id="${card.id}"]`).forEach(el=>{el.classList.add('payment-card-settle');const timer=setTimeout(()=>{el.classList.remove('payment-card-settle');timers.current.delete(timer);},400);timers.current.add(timer);});
   }
   if(motion?.type==='discard'||(motion?.type==='payment'&&motion.target==null)){
    const pile=document.querySelector<HTMLElement>('.discard-zone');if(pile){pile.classList.remove('discard-arrival-pulse');void pile.offsetWidth;pile.classList.add('discard-arrival-pulse');const timer=setTimeout(()=>{pile.classList.remove('discard-arrival-pulse');timers.current.delete(timer);},650);timers.current.add(timer);}
   }for(const [id,wait] of pending.current)if(wait===seq){pending.current.delete(id);glow(id);}};
  document.addEventListener('deal-motion-landed',landed);
  return()=>{document.removeEventListener('deal-motion-landed',landed);timers.current.forEach(clearTimeout);document.querySelectorAll('.set-completion-glow,.discard-arrival-pulse,.payment-card-settle').forEach(e=>e.classList.remove('set-completion-glow','discard-arrival-pulse','payment-card-settle'));};
 },[]);
 useEffect(()=>{
  const ids=completeGroupIds(state),old=previous.current;previous.current={ids,seq:state.eventSeq||0};
  if(!old||state.phase==='setup'||(state.eventSeq||0)<old.seq){pending.current.clear();return;}
  for(const id of pending.current.keys())if(!ids.has(id))pending.current.delete(id);
  const fresh=state.events.filter(e=>e.seq>old.seq&&!e.setup&&['property','payment','transfer'].includes(e.type));
  for(const id of ids){if(old.ids.has(id))continue;const group=state.players.flatMap(p=>p.groups).find(g=>g.id===id)!;
   const flight=[...fresh].reverse().find(e=>(e.cards||[e.card!]).filter(Boolean).some(c=>group.cards.some(x=>x.id===c.id)));
   if(flight)pending.current.set(id,flight.seq);else glow(id);
  }
 },[state]);
}
