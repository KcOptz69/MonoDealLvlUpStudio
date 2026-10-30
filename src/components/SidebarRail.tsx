import React from 'react';
import { CardInstance, GameState } from '../types';
import { getCardDef } from '../engineBridge';
import { getCardArt } from '../cardArt';

interface SidebarRailProps {
  selectedCard: CardInstance | null;
  selectedOwner: number;
  state: GameState;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  selectedCard,
  selectedOwner,
  state,
}) => {
  const def = selectedCard ? getCardDef(selectedCard) : null;
  const ownerName = state.players[selectedOwner]?.name || 'Player';

  return (
    <aside className="rail">
      <section className={`preview ${selectedCard ? 'has-card' : ''}`} id="preview">
        {selectedCard && def ? (
          <>
            <img
              src={getCardArt(selectedCard)}
              alt={def.name}
              className={selectedCard.locked ? 'has-lock' : ''}
            />
            <h3>{def.name}</h3>
            <div className="badges">
              <span className="badge gold">{def.value}M</span>
              <span className="badge">{def.type}</span>
              {selectedCard.locked && (
                <span className="badge" style={{ background: '#1d4c4f' }}>
                  🔒 {selectedCard.locked}
                </span>
              )}
            </div>
            <p>{def.text || `${def.name} card.`}</p>
            {selectedOwner !== 0 && (
              <small className="muted">Owned by {ownerName}</small>
            )}
          </>
        ) : (
          <>
            <div className="eyebrow">Card preview</div>
            <p>Select a card to view its artwork and details.</p>
          </>
        )}
      </section>

      <section className="log">
        <h3>MATCH LOG</h3>
        {(state.log || []).slice(0, 20).map((t, idx) => (
          <p key={idx}>{t}</p>
        ))}
      </section>
    </aside>
  );
};
