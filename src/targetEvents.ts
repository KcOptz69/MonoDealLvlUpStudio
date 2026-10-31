import type {GameEvent,GameState} from './types';
export interface TargetAnimation {seq:number;actor:number;targets:number[];kind:'single'|'all'|'swap'|'blocked'}
export function targetingAnimations(state:GameState,after:number):TargetAnimation[]{
 if(state.phase==='setup'||state.winner!==null)return [];
 const events=state.events||[];
 return events.filter(e=>e.seq>after&&!e.setup).flatMap<TargetAnimation>((event:GameEvent)=>{
  if(event.type==='negate'&&event.blocked){
   const original=events.find(e=>e.seq===event.targetPlaySeq);
   return original?[{seq:event.seq,actor:original.actor,targets:[event.actor],kind:'blocked' as const}]:[];
  }
  if(event.type!=='play'||(!event.targetAll&&!Number.isInteger(event.target)))return [];
  const targets=event.targetAll?state.players.flatMap((p,i)=>i!==event.actor&&!p.forfeited?[i]:[]):[event.target!];
  return [{seq:event.seq,actor:event.actor,targets,kind:event.targetAll?'all' as const:event.card?.key==='forced_deal'?'swap' as const:'single' as const}];
 });
}
