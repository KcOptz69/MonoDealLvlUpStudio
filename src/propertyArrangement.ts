import type {GameState,PropertyGroup} from './types';
import {COLORS,getCardDef} from './engineBridge';
export function propertyDestinations(state:GameState,id:string):{groups:PropertyGroup[];newColors:string[]}{
 const player=state.players[0],source=player.groups.find(g=>g.cards.some(c=>c.id===id)),card=source?.cards.find(c=>c.id===id);
 if(!card||!source)return {groups:[],newColors:[]};
 const fixed=card.locked||(card.key==='expansion_property'?(card.expansionColor||source.color):undefined);
 const colors=fixed?[fixed]:getCardDef(card).colors||[];
 const groups=player.groups.filter(g=>g.id!==source.id&&colors.includes(g.color)&&g.cards.length<COLORS[g.color]?.size&&(card.key!=='expansion_property'||g.cards.some(c=>c.key!=='expansion_property')));
 const newColors=card.key==='expansion_property'?[]:colors.filter(color=>color!==source.color||source.cards.length>1);
 return {groups,newColors};
}
