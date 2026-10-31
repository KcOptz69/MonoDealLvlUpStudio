import {PlayerToken,TOKENS} from './PlayerToken';
import React, { useState } from 'react';
import { STATIC_ART } from '../cardArt';
import '../menu.css';
interface MainMenuProps {
  playerName:string;
  playerToken:number;
  onNameChange:(name:string)=>void;
  onTokenChange:(index:number)=>void;
  profileBusy?:boolean;
  onStartLocal: (botCount:number)=>void;
  onResume:()=>void;
  hasResume:boolean;
  onOpenRules:()=>void;
  onOpenAudit:()=>void;
  onOpenSettings:()=>void;
  onlineContent:React.ReactNode;
  inRoom:boolean;
}
export const MainMenu:React.FC<MainMenuProps>=({playerName,playerToken,onNameChange,onTokenChange,profileBusy,onStartLocal,onResume,hasResume,onOpenRules,onOpenAudit,onOpenSettings,onlineContent,inRoom})=>{
 const [botCount,setBotCount]=useState(2);
 const [tokenPicker,setTokenPicker]=useState(false);
 return <main className="home-menu">
  <header className="home-header"><img src={STATIC_ART.logo} alt="Monopoly Deal Lvl. Up — made by Kaze"/><button className="quiet home-gear" aria-label="Settings" onClick={onOpenSettings}>⚙</button></header>
  <div className="home-columns">
   <nav className="home-actions" aria-label="Main menu">
    <div className="home-player-profile"><button type="button" className="profile-token-button" aria-label="Change your token" onClick={()=>setTokenPicker(true)} disabled={profileBusy}><PlayerToken index={playerToken}/></button><label>Your name<input aria-label="Your player name" maxLength={24} value={playerName} onChange={e=>onNameChange(e.target.value)} placeholder="Your name" autoComplete="nickname"/></label></div>
    <button className="gold" disabled={inRoom} onClick={()=>onStartLocal(botCount)}>Play locally <span>›</span></button>
    <div className="home-bots"><span>Local opponents</span><div>{[1,2,3,4].map(n=><button key={n} disabled={inRoom} className={botCount===n?'gold':'quiet'} aria-pressed={botCount===n} onClick={()=>setBotCount(n)}>{n}</button>)}</div></div>
    <button className="quiet" disabled={!hasResume||inRoom} onClick={onResume}>Continue local game <span>›</span></button>
    <button className="quiet" onClick={onOpenRules}>Rules <span>›</span></button>
    <button className="quiet" onClick={onOpenSettings}>Settings <span>›</span></button>
    <button className="quiet home-library" onClick={onOpenAudit}>Card library &amp; values</button>
    {inRoom&&<small>Leave the lobby before starting a local game.</small>}
   </nav>
   <section className="home-online" aria-label="Online lobby">{onlineContent}</section>
  </div>
  {tokenPicker&&<div className="overlay profile-token-overlay" onKeyDown={e=>{if(e.key==='Escape')setTokenPicker(false);}}><section className="modal profile-token-dialog" role="dialog" aria-modal="true" aria-label="Choose your token"><div className="modalhead"><h2>Choose your token</h2><button className="quiet" aria-label="Close token selection" onClick={()=>setTokenPicker(false)}>×</button></div><div className="profile-token-options">{TOKENS.map((t,i)=><button type="button" aria-label={t.name} aria-pressed={playerToken===i} className={playerToken===i?'picked':''} key={i} disabled={profileBusy} onClick={()=>{onTokenChange(i);setTokenPicker(false);}}><PlayerToken index={i}/></button>)}</div></section></div>}
  <footer className="home-footer">made by Kaze · Defend three complete sets for one rotation.</footer>
 </main>;
};
