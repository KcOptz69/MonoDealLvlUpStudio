import {COLORS} from './engineBridge';
import type {PlayerState,PropertyGroup} from './types';
// Standard rent for this set: same table, buildings and owner's passive as a normal rent play.
// Double Rent and the target's rent discount are applied when the action is played.
export function displayedSetRent(group:PropertyGroup,owner:PlayerState):number{
 const info=COLORS[group.color];
 if(!info||!group.cards.length)return 0;
 return (info.rent[Math.min(group.cards.length,info.size)-1]||0)+(group.house?3:0)+(group.hotel?4:0)+(owner.special.some(c=>c.key==='luxury_district')?1:0);
}
