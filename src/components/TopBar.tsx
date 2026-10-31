import React from 'react';
import { STATIC_ART } from '../cardArt';
import { GameState } from '../types';

interface TopBarProps {
  state: GameState;
  isOnline: boolean;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  isOnline,
  onOpenRules,
  onOpenSettings,
  onOpenMenu,
}) => {
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
      <span className="muted" style={{ fontSize: '10px' }}>
        Round {state.round}{state.roundLimit===10?'/10':''}
      </span>

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
