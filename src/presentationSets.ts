import type {GameEvent,GameState} from './types';
export function deferredSetBoxes(state:GameState,previous:Set<string>,motion:GameEvent[]):Record<string,number[]>{
 const result:Record<string,number[]>={};
 if(state.phase==='setup')return result;
 for(const p of state.players)for(const g of p.groups){
  if(previous.has(g.id))continue;
  const seqs=motion.filter(e=>['property','payment','transfer'].includes(e.type)&&(e.cards||[e.card!]).filter(Boolean).some(c=>g.cards.some(x=>x.id===c.id))).map(e=>e.seq);
  if(seqs.length)result[g.id]=seqs;
 }
 return result;
}
export function releaseSetBoxes(boxes:Record<string,number[]>,seq:number):Record<string,number[]>{
 return Object.fromEntries(Object.entries(boxes).map(([id,wait])=>[id,wait.filter(n=>n!==seq)]).filter(([,wait])=>(wait as number[]).length));
}
