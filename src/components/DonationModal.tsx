import React from 'react';
import {CardInstance,GameState} from '../types';
import {getCardArt} from '../cardArt';
import {getCardDef} from '../engineBridge';
import {PlayerToken} from './PlayerToken';
export function DonationModal({card,state,onDonate,onClose}:{card:CardInstance;state:GameState;onDonate:(target:number)=>void;onClose:()=>void}){
 return <div className="overlay donation-overlay"><section className="modal small" role="dialog" aria-modal="true" aria-label="Donate a hand card"><div className="modalhead"><h2>Donate · FREE</h2><button className="quiet" onClick={onClose} aria-label="Close donation">×</button></div><div className="donation-choice"><img src={getCardArt(card)} alt={getCardDef(card).name}/><div><p>Give this card to an opponent’s hand.</p>{state.players.slice(1).map((p,j)=>!p.forfeited&&<button key={j} className="quiet donation-recipient" onClick={()=>onDonate(j+1)}><PlayerToken index={p.tokenIndex??j+1}/>{p.name}</button>)}</div></div></section></div>;
}
export function DonationHandPicker({state,onPick,onClose}:{state:GameState;onPick:(card:CardInstance)=>void;onClose:()=>void}){
 return <div className="overlay donation-overlay"><section className="modal" role="dialog" aria-modal="true" aria-label="Choose a hand card to donate"><div className="modalhead"><h2>Donate from your hand · FREE</h2><button className="quiet" onClick={onClose} aria-label="Close donation">×</button></div><div className="donation-hand-cards">{state.players[0].hand.map(card=><button key={card.id} onClick={()=>onPick(card)} aria-label={'Donate '+getCardDef(card).name}><img src={getCardArt(card)} alt={getCardDef(card).name}/></button>)}</div></section></div>;
}
