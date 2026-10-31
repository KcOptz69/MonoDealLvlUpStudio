import {PlayerToken} from './PlayerToken';
import React from 'react';
import { GameState, CardInstance, PropertyGroup, ChatMessage } from '../types';
import { getCardDef, COLORS } from '../engineBridge';
import { getCardArt } from '../cardArt';

interface PlayerZoneProps {
  state: GameState;
  chatMessages?: ChatMessage[];
  chatOwnSeat?: number;
  onSendChat?: (text:string)=>Promise<void>;
  selectedCard: CardInstance | null;
  onSelectCard: (card: CardInstance, owner: number) => void;
  onPlaySelected: (cardId: string) => void;
  onBankSelected: (cardId: string) => void;
  onEndTurn: () => void;
  onViewBank: (playerIndex: number) => void;
  onRearrange: () => void;
  onDropPropertyToGroup?: (cardId: string, groupColor: string, groupId?: string) => void;
}

export const PlayerZone: React.FC<PlayerZoneProps> = ({
  state,
  selectedCard,
  onSelectCard,
  onPlaySelected,
  onBankSelected,
  onEndTurn,
  onViewBank,
  onRearrange,
  onDropPropertyToGroup,
}) => {
  const isSetup = state.phase === 'setup';
  const player = state.players[0];
  const myTurn = state.winner === null && (isSetup ? !player?.setupDone : state.turn === 0);

  const calculateLimit = () => {
    if (isSetup) return 3;
    const hasHeadquarters = player?.special.some((c) => c.key === 'corporate_headquarters');
    return hasHeadquarters ? 4 : 3;
  };

  const calculateHandLimit = () => {
    const hasVault = player?.special.some((c) => c.key === 'private_vault');
    return hasVault ? 9 : 7;
  };

  const limit = calculateLimit();
  const used = isSetup ? player?.setupPlayed || 0 : state.played;
  const playsRemaining = Math.max(0, limit - used);

  const calculateSets = (groups: PropertyGroup[]) => {
    const fullColors = new Set<string>();
    for (const g of groups) {
      const colInfo = COLORS[g.color];
      if (colInfo && g.cards.length === colInfo.size && g.cards.some((c) => getCardDef(c).value > 0)) {
        fullColors.add(g.color);
      }
    }
    return fullColors.size;
  };

  const setsCount = calculateSets(player?.groups || []);
  const bankTotal = (player?.bank || []).reduce((sum, c) => sum + getCardDef(c).value, 0);

  const canAct = myTurn && !state.pending && state.winner === null && used < limit;

  // Selected card actions
  const selectedInHand = selectedCard && player?.hand.some((c) => c.id === selectedCard.id);
  const selectedDef = selectedInHand ? getCardDef(selectedCard) : null;

  return (
    <section className="player-zone" aria-label="Your hand, properties and bank">
      <div className="center">
        <div className="property-area">
          <div className="sectionhead">
            <span className="desktop-player-identity"><PlayerToken index={player?.tokenIndex??0}/><span title={player?.name}>{player?.name}</span></span>
            <strong>YOUR FIELD · {setsCount} / 3 SETS</strong>
            {player?.defending && <span className="defense">DEFENDING</span>}
          </div>

          <div className="field-body">
            <div className="groups">
              {player && (player.groups.length > 0 || player.special.length > 0) ? (
                <>
                  {player.groups.map((g) => {
                    const colInfo = COLORS[g.color] || { size: 2, hex: '#8b5438' };
                    const isFull =
                      g.cards.length === colInfo.size &&
                      g.cards.some((c) => getCardDef(c).value > 0);

                    return (
                      <section
                        key={g.id}
                        className={`group ${isFull ? 'complete' : ''}`}
                        style={{ '--c': colInfo.hex } as React.CSSProperties}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const cardId = e.dataTransfer.getData('text/plain');
                          if (cardId && onDropPropertyToGroup) {
                            onDropPropertyToGroup(cardId, g.color, g.id);
                          }
                        }}
                      >
                        <div className="grouphead">
                          <span>{g.color}</span>
                          <span>
                            {isFull ? 'FULL SET' : `${g.cards.length} / ${colInfo.size}`}
                          </span>
                        </div>
                        <div className="groupcards">
                          {g.cards.map((c) => {
                            const def = getCardDef(c);
                            const artUrl = getCardArt(c);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                data-card-id={c.id}
                                className={`card ${selectedCard?.id === c.id ? 'selected' : ''}`}
                                onClick={() => onSelectCard(c, 0)}
                                draggable={myTurn && !state.pending}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', c.id);
                                }}
                                title={`${def.name} — ${def.value}M`}
                              >
                                <img
                                  className={c.locked && c.locked !== g.color ? 'inverted' : ''}
                                  src={artUrl}
                                  alt={def.name}
                                  draggable={false}
                                />
                                {c.locked && <span className="lock">🔒 {c.locked}</span>}
                              </button>
                            );
                          })}
                        </div>
                        <div className="grouprent">
                          <b>
                            Rent {('rent' in colInfo ? colInfo.rent?.[Math.min(g.cards.length, colInfo.size) - 1] : 0) || 0}
                            M
                          </b>
                          <span>
                            {g.house && <span className="building">House </span>}
                            {g.hotel && <span className="building">Hotel</span>}
                          </span>
                        </div>
                      </section>
                    );
                  })}

                  {player.special.length > 0 && (
                    <section className="group specialgroup">
                      <div className="grouphead" style={{ '--c': '#a88037' } as React.CSSProperties}>
                        <span>SPECIAL PROPERTIES</span>
                      </div>
                      <div className="groupcards">
                        {player.special.map((c) => {
                          const def = getCardDef(c);
                          const artUrl = getCardArt(c);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              data-card-id={c.id}
                              className={`card ${selectedCard?.id === c.id ? 'selected' : ''}`}
                              onClick={() => onSelectCard(c, 0)}
                              title={`${def.name} — ${def.value}M`}
                            >
                              <img src={artUrl} alt={def.name} draggable={false} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="grouprent">Active while on field · 3M each</div>
                    </section>
                  )}
                </>
              ) : (
                <div className="placeholder">
                  <b>Your empire starts here.</b>
                  <br />
                  Choose a property in your hand and play it. Match colors to complete sets.
                </div>
              )}

              {myTurn && !state.pending && (
                <button
                  type="button"
                  className="new-set-drop"
                  onClick={onRearrange}
                  title="Rearrange properties"
                >
                  ＋ New set
                  <br />
                  <small>Drag here or rearrange</small>
                </button>
              )}
            </div>

            {/* Bank on the right of your field */}
            <button
              type="button"
              className="bank-field"
              onClick={() => onViewBank(0)}
              aria-label={`Your bank, ${bankTotal} million`}
            >
              <span>YOUR BANK</span>
              <b>{bankTotal}M</b>
              <div className="bank-cards">
                {(player?.bank || []).slice(-3).map((c) => (
                  <img
                    key={c.id}
                    src={getCardArt(c)}
                    alt={getCardDef(c).name}
                  />
                ))}
              </div>
              <small>{player?.bank.length || 0} cards · view</small>
            </button>
          </div>
        </div>
      </div>

      {/* Hand tray */}
      <section className="handtray">
        <div className="handwrap">
          <div className="handhead">
            <span>
              {isSetup ? 'SETUP · ' : ''}YOUR HAND ({player?.hand.length || 0})
            </span>
            <span>End-turn limit {calculateHandLimit()}</span>
          </div>

          <div className="hand">
            {player?.hand.map((c) => {
              const def = getCardDef(c);
              const artUrl = getCardArt(c);
              const isSelected = selectedCard?.id === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  data-card-id={c.id}
                  className={`card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectCard(c, 0)}
                  title={`${def.name} — ${def.value}M`}
                >
                  <img src={artUrl} alt={def.name} draggable={false} />
                  {c.locked && <span className="lock">🔒 {c.locked}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="turncontrols">
          <div className="hand-actions" id="handActions">
            {selectedInHand && selectedDef ? (
              <>
                <strong>{selectedDef.name}</strong>
                {selectedDef.type !== 'money' &&
                  (!isSetup || ['property', 'wild', 'special'].includes(selectedDef.type)) && (
                    <button
                      type="button"
                      className="gold"
                      disabled={!canAct}
                      onClick={() => onPlaySelected(selectedCard.id)}
                    >
                      Play card
                    </button>
                  )}
                {!['property', 'wild', 'special'].includes(selectedDef.type) && (
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => onBankSelected(selectedCard.id)}
                  >
                    Bank {selectedDef.value}M
                  </button>
                )}
              </>
            ) : (
              <span className="hand-action-hint">
                {isSetup ? 'Bank / place cards' : 'Select a card'}
              </span>
            )}
          </div>

          <div
            className={`pips ${myTurn ? '' : 'waiting'}`}
            role="img"
            aria-label={`${playsRemaining} of ${limit} actions remaining`}
          >
            {Array.from({ length: limit }, (_, i) => (
              <span
                key={i}
                className={`pip ${myTurn && i >= playsRemaining ? 'used' : ''}`}
              />
            ))}
          </div>

          <button
            type="button"
            className={`gold ${myTurn && playsRemaining === 0 ? 'end-ready' : ''}`}
            disabled={!myTurn || !!state.pending}
            onClick={onEndTurn}
          >
            {isSetup
              ? player?.setupDone
                ? 'Ready'
                : 'Ready · finish setup'
              : 'End Turn'}
          </button>
        </div>
      </section>
    </section>
  );
};
