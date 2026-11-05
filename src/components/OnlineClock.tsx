import React,{useEffect,useMemo,useState} from 'react';
import type {OnlineRoomView} from '../types';
export function useServerNow(serverTime?:number,frozenAt?:number){
 const offset=useMemo(()=>serverTime===undefined?0:serverTime-Date.now(),[serverTime]);
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{setNow(Date.now());const id=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(id);},[offset]);
 return frozenAt??now+offset;
}
export function Deadline({deadline,serverTime,frozenAt,label}:{deadline?:number;serverTime?:number;frozenAt?:number;label:string}){
 const now=useServerNow(serverTime,frozenAt);if(!deadline)return null;
 const seconds=Math.max(0,Math.ceil((deadline-now)/1000));
 return <time className={'online-deadline'+(seconds<=5?' urgent':'')} aria-label={`${label}: ${seconds} seconds`}>{label} · {seconds}s{frozenAt?' · Paused':''}</time>;
}
export function TurnClock({room}:{room:OnlineRoomView}){
 const now=useServerNow(room.serverTime,room.paused?room.pausedAt:undefined),clock=room.clock;
 if(!clock||room.state?.phase==='setup'||room.state?.winner!==null)return null;
 const seconds=Math.max(0,Math.ceil((clock.remaining-(clock.running?Math.max(0,now-(room.serverTime??now)):0))/1000));
 return <time className={'online-turn-clock'+(seconds<=10?' urgent':'')} title={`${clock.limit/60000}-minute turn${!clock.running?' · clock paused':''}`} aria-label={`${seconds} seconds left in turn`}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}{!clock.running?' Ⅱ':''}</time>;
}
