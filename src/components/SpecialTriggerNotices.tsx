import React,{useEffect,useRef,useState} from 'react';
import {GameState,GameEvent} from '../types';
import {getCardArt} from '../cardArt';
import {getCardDef} from '../engineBridge';
import {createPortal} from 'react-dom';
import {PlayerToken} from './PlayerToken';
export function SpecialTriggerNotices({state}:{state:GameState}){
 const [host,setHost]=useState<Element|null>(null);const[blocked,setBlocked]=useState(false);
 useEffect(()=>{const select=()=>{setBlocked(!!document.querySelector('.overlay,.mobile-player-overlay,.mobile-card-view,.field-art-overlay,.turn-notice'));setHost(document.querySelector('.shared-board'));};select();const observer=new MutationObserver(select);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',select);return()=>{observer.disconnect();window.removeEventListener('resize',select);};},[]);
 const seq=useRef<number|null>(null);const[queue,setQueue]=useState<GameEvent[]>([]);const[show,setShow]=useState(false);
 useEffect(()=>{if(seq.current===null||state.eventSeq<seq.current){seq.current=state.eventSeq;return;}const fresh=state.events.filter(e=>e.seq>seq.current!&&e.type==='special_trigger');seq.current=state.eventSeq;if(fresh.length)setQueue(q=>[...q,...fresh]);},[state.eventSeq]);
 useEffect(()=>{if(!queue.length||blocked){setShow(false);return;}setShow(false);const delay=setTimeout(()=>setShow(true),0);const end=setTimeout(()=>{setShow(false);setQueue(q=>q.slice(1));},1500);return()=>{clearTimeout(delay);clearTimeout(end);};},[queue[0]?.seq,blocked]);
 if(!show||!queue[0]?.card||state.winner!==null||!host)return null;const e=queue[0],p=state.players[e.actor];return createPortal(<aside className="special-trigger-notice" aria-live="polite"><img src={getCardArt(e.card!)} alt={getCardDef(e.card!).name}/><div><span><PlayerToken index={p.tokenIndex??e.actor}/>{p.name}</span><small>SPECIAL PROPERTY ACTIVATED</small><strong>{getCardDef(e.card!).name}</strong><p>{e.message}</p></div></aside>,host);
}
