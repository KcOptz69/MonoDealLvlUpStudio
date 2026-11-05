import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {GameState,GameEvent} from '../types';
import {getCardArt} from '../cardArt';
import {getCardDef} from '../engineBridge';
export function ToughLuckResult({state,hidden=false}:{state:GameState;hidden?:boolean}){
 const seen=useRef<number|null>(null),[results,setResults]=useState<GameEvent[]>([]);
 useEffect(()=>{
  const last=state.eventSeq||0;if(seen.current===null){seen.current=last;return;}
  const fresh=state.events.filter(e=>e.seq>seen.current!&&e.type==='tough_luck_result'&&e.actor===0);
  seen.current=last;if(fresh.length)setResults(prev=>[...prev,...fresh]);
 },[state]);
 const result=results[0];if(!result||hidden)return null;
 return createPortal(<div className="overlay tough-luck-overlay"><section className="modal tough-luck-result" role="dialog" aria-modal="true" aria-label="Tough Luck result"><div className="modalhead"><h2>Tough Luck · You received</h2><button className="quiet" aria-label="Close Tough Luck result" onClick={()=>setResults(prev=>prev.slice(1))}>×</button></div><p>{result.cards?.length?`${result.cards.length} ${result.category} card${result.cards.length===1?'':'s'} from ${state.players[result.target!]?.name}`:`No ${result.category} cards in ${state.players[result.target!]?.name}’s hand.`}</p><div className="tough-luck-cards">{result.cards?.map(c=><img key={c.id} src={getCardArt(c)} alt={getCardDef(c).name}/>)}</div></section></div>,document.body);
}
