import timing from '../timing.json';
import {useBoardPolish} from './boardPolish';
import {deferredSetBoxes,releaseSetBoxes} from './presentationSets';
import './board-polish.css';
import React,{useCallback,useEffect,useLayoutEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{GameState,GameEvent,CardInstance}from'./types';
import{getCardArt}from'./cardArt';
import{playSound}from'./audio';
import './game-feedback.css';
// Every draw flies face down. Reveal the recipient's cards only after landing.
function animationCards(event:GameEvent):CardInstance[]{
 const cards=(event.cards||[event.card!]).filter(Boolean);
 if(event.type==='draw'||(event.type==='donation'&&event.actor!==0&&event.target!==0))return cards.map((_,i)=>({id:`concealed-${event.seq}-${i}`,key:'card_back'}));
 return cards.filter(c=>c.key!=='hidden');
}

// Payers animate independently to the same recipient; one long payment never holds the others.
function activeMotionEvents(queue:GameEvent[]):GameEvent[]{
 const first=queue[0];if(!first)return [];
 const active:GameEvent[]=[];for(const event of queue){if(event.type!==first.type||event.turnId!==first.turnId||(first.type==='payment'&&event.target!==first.target))break;active.push(event);}return active;
}

interface Flight{key:string;card:CardInstance;from:{x:number;y:number};to:{x:number;y:number};delay:number}
function spot(player:number|null|undefined,bank=false){const element=player==null?document.querySelector('.discard-zone'):player===0?document.querySelector(bank?'.player-zone .bank-field':'.player-zone .property-area')||document.querySelector('.mobile-player-dock'):document.querySelector(`[data-player="${player}"]`);const r=element?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:{x:window.innerWidth/2,y:window.innerHeight/2};}
function MotionFlight({event,onDone,fast}:{event:GameEvent;onDone:(seq:number)=>void;fast:boolean}){
 const speed=useRef(fast).current;
 const motionMs=speed?timing.fastCardMotionMs:timing.cardMotionMs;
 const tailMs=timing.cardMotionTailMs;
 const count=(event.cards||[event.card!]).filter(Boolean).length;
 const stagger=speed?Math.min(timing.fastCardStaggerMs,Math.max(0,timing.fastCardBatchMaxMs-motionMs)/Math.max(1,count-1)):timing.cardStaggerMs;
 const [flights]=useState<Flight[]>(()=>{
  const cards=animationCards(event);
  const source=event.type==='draw'?document.querySelector('.draw-zone'):event.actor===0&&['bank','property','play','donation'].includes(event.type)?document.querySelector('.hand')||document.querySelector('.mobile-player-dock'):null;
  const sr=source?.getBoundingClientRect();const from=sr?{x:sr.x+sr.width/2,y:sr.y+sr.height/2}:spot(event.actor,event.type==='payment');
  const target=['bank','property','draw'].includes(event.type)?event.actor:event.target;
  const played=event.type==='play'?document.querySelector('.played-panel')?.getBoundingClientRect():null;
  const hand=event.type==='donation'&&target===0?(document.querySelector('.hand')||document.querySelector('.mobile-player-dock'))?.getBoundingClientRect():null;
  const to=hand?{x:hand.x+hand.width/2,y:hand.y+hand.height/2}:played?{x:played.x+played.width/2,y:played.y+played.height/2}:event.type==='discard'?spot(null):spot(target,event.type==='bank'||event.type==='payment');
  return cards.map((card,i)=>({key:`${event.seq}-${card.id}-${i}`,card,from,to,delay:i*stagger}));
 });
 const done=useRef(onDone);done.current=onDone;
 useLayoutEffect(()=>{const timer=setTimeout(()=>done.current(event.seq),flights.length?motionMs+tailMs+Math.max(0,flights.length-1)*stagger:0);return()=>clearTimeout(timer);},[event.seq]);
 return <>{flights.map(f=><img key={f.key} className="feedback-flight" src={getCardArt(f.card)} alt={f.card.key==='card_back'?'Drawing a face-down card':'Card moving'} style={{left:f.from.x,top:f.from.y,'--flight-x':`${f.to.x-f.from.x}px`,'--flight-y':`${f.to.y-f.from.y}px`,animationDelay:`${f.delay}ms`,animationDuration:`${motionMs}ms`} as React.CSSProperties}/>)}</>;
}
export function GameFeedback({state,onMoving}:{state:GameState;onMoving:(seqs:number[])=>void}){
 useBoardPolish(state);
 const groupIds=useRef(new Set(state.players.flatMap(p=>p.groups.map(g=>g.id))));
 const [deferredSets,setDeferredSets]=useState<Record<string,number[]>>({});
 const [arrivals,setArrivals]=useState<GameEvent[]>([]);
 const arrivalTimers=useRef(new Set<ReturnType<typeof setTimeout>>());
 useEffect(()=>()=>arrivalTimers.current.forEach(clearTimeout),[]);
 const last=useRef<number|null>(null);const [queue,setQueue]=useState<GameEvent[]>([]);
 const finish=useCallback((seq:number)=>setQueue(q=>q.filter(e=>e.seq!==seq)),[]);
 const landed=(event:GameEvent)=>{
  setDeferredSets(boxes=>releaseSetBoxes(boxes,event.seq));
  document.dispatchEvent(new CustomEvent('deal-motion-landed',{detail:event}));
  if(event.type==='payment'&&event.target!=null&&event.cards?.length){setArrivals(list=>[...list,event]);const timer=setTimeout(()=>{setArrivals(list=>list.filter(e=>e.seq!==event.seq));arrivalTimers.current.delete(timer);},state.fastBots?650:1100);arrivalTimers.current.add(timer);}
  finish(event.seq);
 };
 useLayoutEffect(()=>{const seq=state.eventSeq||0;if(last.current===null||seq<last.current){last.current=seq;groupIds.current=new Set(state.players.flatMap(p=>p.groups.map(g=>g.id)));setDeferredSets({});return;}const fresh=(state.events||[]).filter(e=>e.seq>last.current!);last.current=seq;for(const e of fresh){const sound=e.type==='negate'?'negate':e.type==='charge'?'charge':e.type==='payment'||e.type==='transfer'||e.type==='donation'?'payment':e.type==='property'?'property':e.type==='bank'?'bank':e.type==='draw'?'draw':e.type==='play'?'play':null;if(sound)playSound(sound);}const motion=fresh.filter(e=>state.phase!=='setup'&&!e.setup&&['payment','transfer','bank','property','discard','draw','play','donation'].includes(e.type)&&(e.cards?.length||e.card));if(motion.length){setQueue(q=>[...q,...motion]);const deferred=deferredSetBoxes(state,groupIds.current,motion);if(Object.keys(deferred).length)setDeferredSets(boxes=>({...boxes,...deferred}));}groupIds.current=new Set(state.players.flatMap(p=>p.groups.map(g=>g.id)));},[state]);
 useEffect(()=>{onMoving(queue.map(e=>e.seq));},[queue]);
 const active=activeMotionEvents(queue);
 const concealed=Array.from(new Set(queue.flatMap(e=>(e.cards||[e.card!]).filter(Boolean).map(c=>c.id))));
 const board=document.querySelector('.table')?.getBoundingClientRect();
 return createPortal(<div className="feedback-layer" style={board?{clipPath:`inset(${Math.max(0,board.top)}px ${Math.max(0,window.innerWidth-board.right)}px ${Math.max(0,window.innerHeight-board.bottom)}px ${Math.max(0,board.left)}px)`}:{visibility:'hidden'}}><style>{concealed.filter(id=>/^[a-zA-Z0-9_-]+$/.test(id)).map(id=>`[data-card-id="${id}"]{visibility:hidden!important}`).join('\n')+Object.keys(deferredSets).filter(id=>/^[a-zA-Z0-9_-]+$/.test(id)).map(id=>`[data-group-id="${id}"]{display:none!important}`).join('\n')}</style>{active.map(e=><MotionFlight key={e.seq} event={e} onDone={()=>landed(e)} fast={!!state.fastBots}/>)}{Array.from(new Set(arrivals.map(e=>e.target!))).map(target=>{const payments=arrivals.filter(e=>e.target===target);const own=target===0;const element=own?document.querySelector('.shared-board'):document.querySelector(`[data-player="${target}"]`);const r=element?.getBoundingClientRect();if(!r)return null;return <div key={payments.map(e=>e.seq).join('-')} className="payment-arrival" style={{left:r.left+r.width/2,top:r.top+Math.min(r.height-24,own?r.height-28:48),animationDuration:state.fastBots?'650ms':'1100ms'}}><span>✓</span> {state.players[target]?.name} · +{payments.reduce((sum,e)=>sum+(e.amount||0),0)}M received</div>;})}</div>,document.body);
}
