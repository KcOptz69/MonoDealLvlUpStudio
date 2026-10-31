import {PlayerToken} from './PlayerToken';
import React,{useState} from 'react';
import {OnlineRoomView} from '../types';
interface OnlineLobbyProps {
 roomView:OnlineRoomView|null;
 playerName:string;
 onCreateRoom:(name:string)=>Promise<void>;
 onJoinRoom:(name:string,code:string)=>Promise<void>;
 onReconnectRoom:()=>Promise<void>;
 hasLastSession:boolean;
 onToggleReady:(ready:boolean)=>Promise<void>;
 onAddBot:(slot:number)=>Promise<void>;
 onRemoveBot:(slot:number)=>Promise<void>;
 onStartGame:()=>Promise<void>;
 onOptionsChange?:(options:{roundLimit?:number|null;fastBots?:boolean})=>Promise<void>;
 onLeaveRoom:()=>void;
 loading:boolean;
}
export const OnlineLobby:React.FC<OnlineLobbyProps>=({roomView,onCreateRoom,onJoinRoom,onReconnectRoom,hasLastSession,playerName,onToggleReady,onAddBot,onRemoveBot,onStartGame,onLeaveRoom,loading,onOptionsChange})=>{
 const name=playerName;
 const [code,setCode]=useState(()=>new URLSearchParams(window.location.search).get('room')?.toUpperCase()||'');
 const [copied,setCopied]=useState(false);
 const joined=!!roomView&&!roomView.started;
 const active=roomView?.seats.filter(Boolean)||[];
 const ready=roomView?.seats[roomView.seat]?.ready||false;
 const canStart=!roomView?.matchActive&&active.length>=2&&active.every(s=>s?.ready);
 const copy=async()=>{if(!roomView)return;const url=new URL(window.location.href);url.search='';url.hash='';url.searchParams.set('room',roomView.code);try{await navigator.clipboard.writeText(url.toString());setCopied(true);setTimeout(()=>setCopied(false),2500);}catch{window.prompt('Copy invite link',url.toString());}};
 return <>
  <div className="home-online-title"><h1>Online lobby</h1><span>{joined?active.length:0}/5 players</span></div>
  {!joined?<>
   <p className="home-intro">Play together on phones and PCs.</p>
   <div className="home-room-form">

    <button className="gold" disabled={loading||!name.trim()} onClick={()=>onCreateRoom(name)}>Create room</button>
    <label>Room code<input maxLength={6} placeholder="ABC123" value={code} autoComplete="off" onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
    <button className="gold" disabled={loading||!name.trim()||code.trim().length!==6} onClick={()=>onJoinRoom(name,code.trim())}>Join room</button>
   </div>
   <div className="home-slots" aria-label="Five player slots">{[1,2,3,4,5].map(n=><div className="home-slot empty" key={n}><span className="home-seat">{n}</span><span>Open slot</span></div>)}</div>
   {hasLastSession&&<button className="quiet home-reconnect" disabled={loading} onClick={onReconnectRoom}>Reconnect to last room</button>}
   <p className="home-hint">Create or join a room to add players and bots.</p>
  </>:<>
   <div className="home-room-header"><strong>ROOM {roomView!.code}</strong><button className="quiet" onClick={copy}>{copied?'✓ Link copied':'Copy invite link'}</button></div>
   <div className="home-slots">{roomView!.seats.map((seat,i)=><div className={'home-slot'+(!seat?' empty':'')} key={i}>
    <span className="home-seat">{seat?<PlayerToken index={seat.tokenIndex??i}/>:i+1}</span>
    <div className="home-player"><strong>{seat?seat.name+(seat.host?' · Host':'')+(i===roomView!.seat?' · You':''):'Open slot'}</strong>{seat&&<small>{seat.bot?(roomView?.options?.fastBots?'Bot · Fast':'Bot · Relaxed'):seat.connected?'Connected':'Reconnecting'}</small>}</div>
    {seat?<><span className={seat.ready?'home-ready':'home-not-ready'}>{seat.ready?'● Ready':'● Not ready'}</span>{roomView!.host&&seat.bot&&<button className="quiet" disabled={loading} onClick={()=>onRemoveBot(i)}>Remove</button>}</>:roomView!.host&&<button className="quiet" disabled={loading} onClick={()=>onAddBot(i)}>Add bot</button>}
   </div>)}</div>

   <label className="match-limit-option"><input type="checkbox" checked={roomView?.options?.roundLimit===10} disabled={!roomView?.host||loading||roomView?.matchActive} onChange={e=>onOptionsChange?.({roundLimit:e.target.checked?10:null})}/><span>Round 10 limit<small>Bank + field value · host sets the rule before starting.</small></span></label>
   <div className="home-room-buttons"><button className="gold" disabled={loading||roomView?.matchActive} onClick={()=>onToggleReady(!ready)}>{ready?'Unready':'Ready'}</button>{roomView!.host?<button className="gold" disabled={loading||!canStart} onClick={onStartGame}>Start game</button>:<span>Waiting for host</span>}<button className="quiet" disabled={loading} onClick={onLeaveRoom}>Leave lobby</button></div>
   <p className="home-hint">All players must be ready before the host can start.</p>
  </>}
 </>;
};
