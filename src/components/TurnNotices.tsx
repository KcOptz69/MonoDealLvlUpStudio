import timing from '../../timing.json';
import React,{useEffect,useRef,useState} from 'react';
import {GameState} from '../types';
import {PlayerToken} from './PlayerToken';
import '../turn-notices.css';
type Notice={title:string;name:string;token:number;defending?:boolean;failed?:boolean};
export function TurnNotices({state}:{state:GameState}){
 const previous=useRef<{turn:string;defenses:boolean[]}|null>(null);const[queue,setQueue]=useState<Notice[]>([]);
 useEffect(()=>{if(state.winner!==null){setQueue([]);return;}const key=state.phase==='setup'?'setup':`${state.turnSerial}:${state.turn}`;const old=previous.current;const incoming:Notice[]=[];state.players.forEach((p,i)=>{if(old&&old.defenses[i]&&!p.defending&&!p.forfeited)incoming.push({title:'DEFENSE FAILED',name:p.name,token:p.tokenIndex??i,failed:true});if(old&&!old.defenses[i]&&p.defending)incoming.push({title:'DEFENDING PHASE',name:p.name,token:p.tokenIndex??i,defending:true});});if(!old||old.turn!==key){const i=state.phase==='setup'?0:state.turn,p=state.players[i];incoming.push({title:state.phase==='setup'?'SETUP':i===0?'YOUR TURN':'OPPONENT’S TURN',name:p.name,token:p.tokenIndex??i});}previous.current={turn:key,defenses:state.players.map(p=>p.defending)};if(incoming.length)setQueue(q=>[...q,...incoming]);},[state]);
 useEffect(()=>{if(!queue.length)return;const t=setTimeout(()=>setQueue(q=>q.slice(1)),timing.noticeDurationMs);return()=>clearTimeout(t);},[queue[0]]);
 if(!queue.length)return null;const n=queue[0];return <div className={'turn-notice'+(n.failed?' defense-failed-notice':n.defending?' defense-notice':'')} aria-live="polite"><section key={n.title+n.name}><PlayerToken index={n.token}/><div><small>{n.name}</small><h2>{n.title}</h2><p>{n.failed?'Rebuild three complete sets to defend again':n.defending?'Three complete sets · Defend for one rotation':state.phase==='setup'?'Everyone sets up together · 3 actions each':'Build · Steal · Defend'}</p></div></section></div>;
}
