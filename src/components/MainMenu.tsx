import React, { useState } from 'react';
import { STATIC_ART } from '../cardArt';
import '../menu.css';
interface MainMenuProps {
  onStartLocal: (botCount:number)=>void;
  onResume:()=>void;
  hasResume:boolean;
  onOpenRules:()=>void;
  onOpenAudit:()=>void;
  onOpenSettings:()=>void;
  onlineContent:React.ReactNode;
  inRoom:boolean;
}
export const MainMenu:React.FC<MainMenuProps>=({onStartLocal,onResume,hasResume,onOpenRules,onOpenAudit,onOpenSettings,onlineContent,inRoom})=>{
 const [botCount,setBotCount]=useState(2);
 return <main className="home-menu">
  <header className="home-header"><img src={STATIC_ART.logo} alt="Monopoly Deal Lvl. Up — made by Kaze"/><button className="quiet home-gear" aria-label="Settings" onClick={onOpenSettings}>⚙</button></header>
  <div className="home-columns">
   <nav className="home-actions" aria-label="Main menu">
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
  <footer className="home-footer">made by Kaze · Defend three complete sets for one rotation.</footer>
 </main>;
};
