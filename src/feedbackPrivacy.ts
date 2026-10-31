import type {CardInstance,GameEvent} from './types';

// Every draw flies face down. Reveal the recipient's cards only after landing.
export function animationCards(event:GameEvent):CardInstance[]{
 const cards=(event.cards||[event.card!]).filter(Boolean);
 if(event.type==='draw')return cards.map((_,i)=>({id:`concealed-${event.seq}-${i}`,key:'card_back'}));
 return cards.filter(c=>c.key!=='hidden');
}
