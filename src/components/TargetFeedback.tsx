import React,{useCallback,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {GameState} from '../types';
import {targetingAnimations,TargetAnimation} from '../targetEvents';
import '../target-feedback.css';
interface Point{x:number;y:number}
interface Geometry{board:DOMRect;from:Point;targets:{point:Point;box:{x:number;y:number;width:number;height:number}}[]}
function visible(selectors:string){return Array.from(document.querySelectorAll<HTMLElement>(selectors)).find(e=>e.getBoundingClientRect().width>0&&!e.closest('.mobile-player-overlay'));}
function targetGeometry(notice:TargetAnimation):Geometry|null{
 const table=document.querySelector('.table'),board=table?.getBoundingClientRect();if(!board)return null;
 const clamp=(n:number,max:number)=>Math.max(5,Math.min(max-5,n));
 const token=(i:number)=>visible(i===0?'.desktop-player-identity .player-token,.mobile-player-identity .player-token':`[data-player="${i}"] .player-token`);
 const field=(i:number)=>visible(i===0?'.property-area,.mobile-player-identity':`[data-player="${i}"]`);
 const point=(i:number):Point=>{const r=(token(i)||field(i))?.getBoundingClientRect();return r?{x:clamp(r.x+r.width/2-board.x,board.width),y:clamp(r.y+r.height/2-board.y,board.height)}:{x:board.width/2,y:board.height/2};};
 return{board,from:point(notice.actor),targets:notice.targets.map(i=>{const p=point(i),r=field(i)?.getBoundingClientRect();const x=clamp((r?.x??board.x+p.x-20)-board.x,board.width),y=clamp((r?.y??board.y+p.y-20)-board.y,board.height);return{point:p,box:{x,y,width:Math.max(1,Math.min(r?.width??40,board.width-x-3)),height:Math.max(1,Math.min(r?.height??40,board.height-y-3))}};})};
}
function TargetBurst({notice,finish}:{notice:TargetAnimation;finish:(seq:number)=>void}){
 const[geometry,setGeometry]=useState<Geometry|null>(null);
 useLayoutEffect(()=>{const update=()=>setGeometry(targetGeometry(notice));update();window.addEventListener('resize',update);const timer=setTimeout(()=>finish(notice.seq),1200);return()=>{clearTimeout(timer);window.removeEventListener('resize',update);};},[notice.seq,finish]);
 if(!geometry)return null;
 const{board,from,targets}=geometry;
 const path=(a:Point,b:Point,curve=0)=>curve?`M ${a.x} ${a.y} Q ${(a.x+b.x)/2} ${(a.y+b.y)/2+curve} ${b.x} ${b.y}`:`M ${a.x} ${a.y} L ${b.x} ${b.y}`;
 return createPortal(<div className={'target-feedback-layer '+(notice.kind==='blocked'?'target-blocked':'')} style={{left:board.x,top:board.y,width:board.width,height:board.height}} aria-hidden="true"><svg width="100%" height="100%" key={notice.seq}>
  <circle className="target-origin-ring" cx={from.x} cy={from.y} r="21"/>
  {targets.map(({point,box},i)=>{const d=path(from,point,notice.kind==='swap'?-55:0);return <g key={i}>
   <path className="target-beam" d={d} pathLength="1"/>
   <circle className="target-spark" r="4"><animateMotion dur="0.7s" path={d} fill="freeze"/></circle>
   {notice.kind==='swap'&&<><path className="target-beam target-return" pathLength="1" d={path(point,from,55)}/><circle className="target-spark target-return-spark" r="4"><animateMotion dur="0.7s" path={path(point,from,55)} fill="freeze"/></circle></>}
   <rect className="target-field-ring" x={box.x+2} y={box.y+2} width={Math.max(1,box.width-4)} height={Math.max(1,box.height-4)} rx="10"/>
   {notice.kind==='blocked'&&Array.from({length:7},(_,j)=>{const a=j*Math.PI*2/7;return <rect className="target-shard" key={j} x={point.x-2} y={point.y-2} width="4" height="4" rx="1" style={{'--shard-x':`${Math.cos(a)*42}px`,'--shard-y':`${Math.sin(a)*42}px`} as React.CSSProperties}/>;})}
  </g>;})}
 </svg></div>,document.body);
}
export function TargetFeedback({state}:{state:GameState}){
 const last=useRef<number|null>(null);const[queue,setQueue]=useState<TargetAnimation[]>([]);
 const finish=useCallback((seq:number)=>setQueue(q=>q.filter(n=>n.seq!==seq)),[]);
 useLayoutEffect(()=>{const seq=state.eventSeq||0;if(last.current===null||seq<last.current){last.current=seq;setQueue([]);return;}const incoming=targetingAnimations(state,last.current);last.current=seq;if(incoming.length)setQueue(q=>[...q,...incoming]);},[state.eventSeq]);
 if(state.phase==='setup'||state.winner!==null||!queue.length)return null;
 return <TargetBurst key={queue[0].seq} notice={queue[0]} finish={finish}/>;
}
