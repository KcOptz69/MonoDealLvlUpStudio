import {useServerNow} from './OnlineClock';
import React,{useEffect,useMemo,useState} from 'react';
import type {CooperationWindow} from '../cooperation';
import type {GameState} from '../types';
import '../cooperation.css';
export function cooperationSeconds(deadline:number,now:number,offset=0){return Math.max(0,Math.ceil((deadline-now-offset)/1000));}
export function CooperationBar({window,state,serverTime,frozenAt,onSkip,onDonate}:{window:CooperationWindow;state:GameState;serverTime?:number;frozenAt?:number;onSkip?:(id:string)=>Promise<void>|void;onDonate?:()=>void}){
 const offset=useMemo(()=>serverTime===undefined?0:serverTime-Date.now(),[serverTime]);
 const [now,setNow]=useState(Date.now),[sending,setSending]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[window.id,offset]);
 useEffect(()=>{setError('');setSending(false);},[window.id]);
 const serverNow=useServerNow(serverTime,frozenAt);
 const seconds=cooperationSeconds(window.deadline,serverNow),voted=window.votes.includes(0),eligible=window.eligible.includes(0);
 return <div className="cooperation-bar" aria-label="Cooperation window">
  <div className="cooperation-clock"><strong>🤝 Cooperation</strong><time dateTime={'PT'+seconds+'S'} aria-label={`${seconds} seconds remaining`}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</time></div>
  <div className="cooperation-copy"><span>Donate cards before {state.players[window.actor]?.name} takes their turn.</span><small>Everyone skips, or the timer ends.</small></div>
  <div className="cooperation-actions">{onDonate&&<button type="button" className="quiet" disabled={!state.players[0].hand.length||seconds===0} onClick={onDonate}>Donate</button>}<button type="button" className="gold" disabled={!eligible||voted||sending||seconds===0||!onSkip} onClick={async()=>{setSending(true);setError('');try{await onSkip?.(window.id);}catch(e){setError(e instanceof Error?e.message:'Could not submit your vote.');}finally{setSending(false);}}}>{voted?'✓ Voted':sending?'Voting…':'Skip'} · {window.votes.length}/{window.eligible.length}</button></div>
  {error&&<span className="cooperation-error" role="alert">{error}</span>}
 </div>;
}
