import type {CardInstance,PropertyGroup} from './types';
import {COLORS,getCardDef} from './engineBridge';
export const fullSet=(g:PropertyGroup)=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0);
export const completeSetCount=(p:import('./types').PlayerState)=>new Set(p.groups.filter(fullSet).map(g=>g.color)).size+(p.protectedEstate?1:0);
export const usesBoardTarget=(c:CardInstance)=>getCardDef(c).type==='rent'||['sly_deal','forced_deal','eviction_notice','forced_rezoning','deal_breaker','debt_collector','compulsory_purchase','tough_luck','go_to_jail'].includes(c.key);

export function defenseFragile(player:import('./types').PlayerState,group:PropertyGroup):boolean{
 const complete=player.groups.filter(fullSet);
 return !!player.defending&&fullSet(group)&&completeSetCount(player)===3&&complete.filter(g=>g.color===group.color).length===1;
}
