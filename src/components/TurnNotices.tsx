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
 if(!queue.length)return null;
 const n=queue[0];
 const opponent=n.title==='OPPONENT’S TURN';
 if(n.failed||n.defending){
   const instruction=n.failed?'Rebuild three complete sets to defend again':
     !state.fullRotationDefense&&state.players.length>=4?'Hold three sets through two opponents’ turns':'Hold three sets until your next turn';
   return <div className="turn-notice" aria-live="polite">
     <div className={'illustrated-turn illustrated-defense'+(n.failed?' illustrated-defense-failed':'')} key={n.title+n.name}>
       <img src={n.failed?'/ui/defense-failed.webp':'/ui/defending-phase.webp'} alt={n.title}/>
       <PlayerToken index={n.token}/>
       <strong className="illustrated-turn-name" title={n.name}>{n.name}</strong>
       <p className="illustrated-defense-instruction">{instruction}</p>
     </div>
   </div>;
 }
 if(opponent||n.title==='YOUR TURN'){
   return <div className="turn-notice" aria-live="polite">
     <div className="illustrated-turn" key={n.title+n.name}>
       <img src={opponent?'/ui/opponent-turn.webp':'/ui/your-turn.webp'} alt={n.title}/>
       {opponent&&<><PlayerToken index={n.token}/><strong className="illustrated-turn-name" title={n.name}>{n.name}</strong></>}
     </div>
   </div>;
 }
 return <div className="turn-notice" aria-live="polite"><section key={n.title+n.name}><PlayerToken index={n.token}/><div><small>{n.name}</small><h2>{n.title}</h2><p>Everyone sets up together · 3 actions each</p></div></section></div>;
}
