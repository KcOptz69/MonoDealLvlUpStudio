import type {CardInstance,GameEvent} from './types';

// Every draw flies face down. Reveal the recipient's cards only after landing.
export function animationCards(event:GameEvent):CardInstance[]{
 const cards=(event.cards||[event.card!]).filter(Boolean);
 if(event.type==='draw'||(event.type==='donation'&&event.actor!==0&&event.target!==0))return cards.map((_,i)=>({id:`concealed-${event.seq}-${i}`,key:'card_back'}));
 return cards.filter(c=>c.key!=='hidden');
}

// Payers animate independently to the same recipient; one long payment never holds the others.
export function activeMotionEvents(queue:GameEvent[]):GameEvent[]{
 const first=queue[0];if(!first)return [];
 const active:GameEvent[]=[];for(const event of queue){if(event.type!==first.type||event.turnId!==first.turnId||(first.type==='payment'&&event.target!==first.target))break;active.push(event);}return active;
}
