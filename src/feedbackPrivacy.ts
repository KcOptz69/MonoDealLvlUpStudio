import type {CardInstance,GameEvent} from './types';

// Local matches retain bots' real hands in memory. Never send that artwork to animation DOM.
export function animationCards(event:GameEvent):CardInstance[]{
 const cards=(event.cards||[event.card!]).filter(Boolean);
 if(event.type==='draw'&&event.actor!==0)return cards.map((_,i)=>({id:`concealed-${event.seq}-${i}`,key:'card_back'}));
 return cards.filter(c=>c.key!=='hidden');
}
