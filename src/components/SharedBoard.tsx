import React from 'react';
import { GameState, CardInstance } from '../types';
import { STATIC_ART, getCardArt } from '../cardArt';
import { getCardDef } from '../engineBridge';

interface PlayedCardInfo {
  owner: number;
  actor: string;
  card: CardInstance;
  mode: string;
  color?: string;
  target?: string | null;
  extra?: CardInstance | null;
}

interface SharedBoardProps {
  state: GameState;
  boardPlay: PlayedCardInfo | null;
  onSelectCard: (card: CardInstance, owner?: number) => void;
  onBrowseDiscard: () => void;
}

export const SharedBoard: React.FC<SharedBoardProps> = ({
  state,
  boardPlay,
  onSelectCard,
  onBrowseDiscard,
}) => {
  const lastDiscard = state.discard[state.discard.length - 1];

  // Count discarded and banked Just Say No cards
  const noDiscardCount = state.discard.filter((c) => c.key === 'just_say_no').length;
  const noBankCount = state.players.reduce(
    (n, p) => n + p.bank.filter((c) => c.key === 'just_say_no').length,
    0
  );

  // Latest payment/discard activities
  const recentPaymentEvents = (state.events || [])
    .filter((e) => ['payment', 'discard', 'transfer'].includes(e.type))
    .slice(-4)
    .reverse();

  return (
    <section className="shared-board" aria-label="Shared board">
      {/* Draw and discard piles */}
      <section className="pile-panel" aria-label="Draw and discard piles">
        <div className="board-pile draw-zone">
          <div className="deckpile card-back">
            <img src={STATIC_ART.card_back} alt="Card back" />
            <small>DRAW</small>
            <b>{state.deck.length}</b>
          </div>
          <span>Draw pile</span>
        </div>

        <button
          type="button"
          className="board-pile discard-zone"
          onClick={onBrowseDiscard}
          aria-label={`Browse discard pile, ${state.discard.length} cards`}
        >
          {lastDiscard ? (
            <img
              src={getCardArt(lastDiscard)}
              alt={`Top discard: ${getCardDef(lastDiscard).name}`}
            />
          ) : (
            <div className="empty-pile">EMPTY</div>
          )}
          <strong>Discard · {state.discard.length}</strong>
          <span>Click to browse</span>
        </button>
      </section>

      {/* Played card panel */}
      <section className="played-panel" aria-label="Played card">
        <h3>Played card</h3>
        <div className="board-play" id="boardPlay" aria-live="polite">
          {boardPlay ? (
            <div className="played-content">
              <div className="table-play-cards">
                <button
                  type="button"
                  className="played-card-main"
                  onClick={() => onSelectCard(boardPlay.card, boardPlay.owner)}
                  aria-label={`Preview last played card: ${getCardDef(boardPlay.card).name}`}
                >
                  <img
                    src={getCardArt(boardPlay.card, boardPlay.color)}
                    alt={getCardDef(boardPlay.card).name}
                  />
                </button>
                {boardPlay.extra && (
                  <button
                    type="button"
                    className="played-extra"
                    onClick={() => onSelectCard(boardPlay.extra!, boardPlay.owner)}
                    aria-label="Preview Double the Rent"
                  >
                    <img
                      src={getCardArt(boardPlay.extra)}
                      alt="Double the Rent"
                    />
                  </button>
                )}
              </div>
              <div className="table-play-info">
                <small>LAST PLAY</small>
                <strong>
                  {boardPlay.actor}{' '}
                  {boardPlay.mode === 'bank'
                    ? 'banked'
                    : boardPlay.mode === 'response'
                    ? 'responded with'
                    : 'played'}
                </strong>
                <b>{getCardDef(boardPlay.card).name}</b>
                <span>
                  {boardPlay.target
                    ? `Target: ${boardPlay.target}`
                    : boardPlay.mode === 'bank'
                    ? 'Into their bank'
                    : 'On the table'}
                </span>
              </div>
            </div>
          ) : (
            <div className="table-play-empty">
              PLAY AREA
              <span>Played cards appear here</span>
            </div>
          )}
        </div>
      </section>

      {/* Payment Activity */}
      <aside className="board-side" id="boardSide" aria-live="polite">
        <h3>Payment activity</h3>
        <div className="activity-list">
          {recentPaymentEvents.length > 0 ? (
            recentPaymentEvents.map((e, idx) => {
              const actorName = state.players[e.actor]?.name || `Player ${e.actor + 1}`;
              const targetName =
                e.target === null || e.target === undefined || e.type === 'discard'
                  ? 'Discard pile'
                  : state.players[e.target]?.name || `Player ${e.target + 1}`;
              const title =
                e.type === 'discard'
                  ? `${actorName} discarded`
                  : e.target === 0
                  ? `${actorName} paid you`
                  : `${actorName} paid ${targetName}`;

              return (
                <article key={e.seq || idx} className="activity-item">
                  <b>{title}</b>
                  <small>
                    {actorName} → {targetName}
                    {e.amount !== undefined ? ` · ${e.amount}M` : ''}
                  </small>
                  <div className="activity-cards">
                    {e.cards && e.cards.length > 0 ? (
                      e.cards.map((c) => (
                        <img
                          key={c.id || Math.random()}
                          src={getCardArt(c)}
                          alt={getCardDef(c).name}
                          title={`${getCardDef(c).name} · ${getCardDef(c).value}M`}
                        />
                      ))
                    ) : (
                      <small>No payable cards</small>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="muted">Payments and discards appear here automatically.</p>
          )}
        </div>
      </aside>

      {/* Just Say No Counter */}
      <small className="no-count">
        Just Say No: {noDiscardCount} discarded · {noBankCount} banked / 8
      </small>
    </section>
  );
};
