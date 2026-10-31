import {animationCards,activeMotionEvents} from './feedbackPrivacy';
import React,{useCallback,useEffect,useLayoutEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{GameState,GameEvent,CardInstance}from'./types';
import{getCardArt}from'./cardArt';
import{playSound}from'./audio';
import './game-feedback.css';
interface Flight{key:string;card:CardInstance;from:{x:number;y:number};to:{x:number;y:number};delay:number}
function spot(player:number|null|undefined,bank=false){const element=player==null?document.querySelector('.discard-zone'):player===0?document.querySelector(bank?'.player-zone .bank-field':'.player-zone .property-area')||document.querySelector('.mobile-player-dock'):document.querySelector(`[data-player="${player}"]`);const r=element?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:{x:window.innerWidth/2,y:window.innerHeight/2};}
function MotionFlight({event,onDone}:{event:GameEvent;onDone:(seq:number)=>void}){
 const [flights]=useState<Flight[]>(()=>{
  const cards=animationCards(event);
  const source=event.type==='draw'?document.querySelector('.draw-zone'):event.actor===0&&['bank','property','play'].includes(event.type)?document.querySelector('.hand')||document.querySelector('.mobile-player-dock'):null;
  const sr=source?.getBoundingClientRect();const from=sr?{x:sr.x+sr.width/2,y:sr.y+sr.height/2}:spot(event.actor,event.type==='payment');
  const target=['bank','property','draw'].includes(event.type)?event.actor:event.target;
  const played=event.type==='play'?document.querySelector('.played-panel')?.getBoundingClientRect():null;
  const to=played?{x:played.x+played.width/2,y:played.y+played.height/2}:event.type==='discard'?spot(null):spot(target,event.type==='bank'||event.type==='payment');
  return cards.map((card,i)=>({key:`${event.seq}-${card.id}-${i}`,card,from,to,delay:i*220}));
 });
 useLayoutEffect(()=>{const timer=setTimeout(()=>onDone(event.seq),flights.length?1900+Math.max(0,flights.length-1)*220:0);return()=>clearTimeout(timer);},[event.seq,onDone]);
 return <>{flights.map(f=><img key={f.key} className="feedback-flight" src={getCardArt(f.card)} alt={f.card.key==='card_back'?'Drawing a face-down card':'Card moving'} style={{left:f.from.x,top:f.from.y,'--flight-x':`${f.to.x-f.from.x}px`,'--flight-y':`${f.to.y-f.from.y}px`,animationDelay:`${f.delay}ms`} as React.CSSProperties}/>)}</>;
}
export function GameFeedback({state,onMoving}:{state:GameState;onMoving:(seqs:number[])=>void}){
 const last=useRef<number|null>(null);const [queue,setQueue]=useState<GameEvent[]>([]);
 const finish=useCallback((seq:number)=>setQueue(q=>q.filter(e=>e.seq!==seq)),[]);
 useLayoutEffect(()=>{const seq=state.eventSeq||0;if(last.current===null||seq<last.current){last.current=seq;return;}const fresh=(state.events||[]).filter(e=>e.seq>last.current!);last.current=seq;for(const e of fresh){const sound=e.type==='negate'?'negate':e.type==='charge'?'charge':e.type==='payment'||e.type==='transfer'?'payment':e.type==='property'?'property':e.type==='bank'?'bank':e.type==='draw'?'draw':e.type==='play'?'play':null;if(sound)playSound(sound);}const motion=fresh.filter(e=>state.phase!=='setup'&&!e.setup&&['payment','transfer','bank','property','discard','draw','play'].includes(e.type)&&(e.cards?.length||e.card));if(motion.length)setQueue(q=>[...q,...motion]);},[state.eventSeq]);
 useEffect(()=>{onMoving(queue.map(e=>e.seq));},[queue]);
 const active=activeMotionEvents(queue);
 const concealed=Array.from(new Set(queue.flatMap(e=>(e.cards||[e.card!]).filter(Boolean).map(c=>c.id))));
 const board=document.querySelector('.table')?.getBoundingClientRect();
 return createPortal(<div className="feedback-layer" style={board?{clipPath:`inset(${Math.max(0,board.top)}px ${Math.max(0,window.innerWidth-board.right)}px ${Math.max(0,window.innerHeight-board.bottom)}px ${Math.max(0,board.left)}px)`}:{visibility:'hidden'}}><style>{concealed.filter(id=>/^[a-zA-Z0-9_-]+$/.test(id)).map(id=>`[data-card-id="${id}"]{visibility:hidden!important}`).join('\n')}</style>{active.map(e=><MotionFlight key={e.seq} event={e} onDone={finish}/>)}</div>,document.body);
}
