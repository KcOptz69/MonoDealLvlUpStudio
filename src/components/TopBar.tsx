import React from 'react';
import {TurnClock} from './OnlineClock';
import type {OnlineRoomView} from '../types';
import { STATIC_ART } from '../cardArt';
import { GameState } from '../types';
import { useFullscreen } from '../fullscreen';

interface TopBarProps {
  state: GameState;
  room?:OnlineRoomView;
  onPause?:()=>void;
  isOnline: boolean;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,room,onPause,
  isOnline,
  onOpenRules,
  onOpenSettings,
  onOpenMenu,
}) => {
  const { isFullscreen, toggleFullscreen, supported } = useFullscreen();
  const isSetup = state.phase === 'setup';
  const myTurn = !isSetup && state.turn === 0;

  let turnText = '';
  if (state.winner !== null) {
    turnText = 'Match complete';
  } else if (isSetup) {
    const readyCount = state.players.filter((p) => p.setupDone).length;
    turnText = `SIMULTANEOUS SETUP · ${readyCount}/${state.players.length} ready`;
  } else if (myTurn) {
    turnText = 'YOUR TURN';
  } else {
    turnText = `${state.players[state.turn]?.name || 'Opponent'}’s turn`;
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="header-logo"
          src={STATIC_ART.logo}
          alt="Monopoly Deal Lvl. Up — made by Kaze"
        />
      </div>

      <span className="turnbanner">{turnText}</span>
      <span className="muted round-number" style={{ fontSize: '10px' }}>
        Round {state.round}{state.roundLimit===10?'/10':''}
      </span>

      {isOnline&&room&&<TurnClock room={room}/>}
      {isOnline&&room?.host&&state.winner===null&&<button className="quiet host-pause" onClick={onPause}>{room.paused?'Resume':'Pause'}</button>}
      {supported && (
        <button
          type="button"
          className={'quiet topbar-fullscreen' + (isFullscreen ? ' active' : '')}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen (hide address bar)'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      )}
      <button className="quiet" onClick={onOpenRules}>
        Rules
      </button>
      <button className="quiet" onClick={onOpenSettings} title="Settings">
        ⚙
      </button>
      <button className="quiet" onClick={onOpenMenu}>
        Exit
      </button>
    </header>
  );
};
