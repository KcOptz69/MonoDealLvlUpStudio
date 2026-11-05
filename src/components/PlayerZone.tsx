import {ProtectedEstateField} from './ProtectedEstate';
import {completeSetCount} from '../boardSelection';
import {defenseFragile} from '../boardSelection';
import {SetRentBadge} from './SetRentBadge';
import { isCardInverted } from '../cardOrientation';
import {PlayerToken} from './PlayerToken';
import React,{useEffect,useState} from 'react';
import {propertyDestinations} from '../propertyArrangement';
import '../property-arrangement.css';
import { GameState, CardInstance, PropertyGroup, ChatMessage } from '../types';
import { getCardDef, COLORS } from '../engineBridge';
import { getCardArt } from '../cardArt';

interface PlayerZoneProps {
  state: GameState;
  allowDrag?:boolean;
  arrangeMode?:boolean;
  onArrangeModeChange?:(enabled:boolean)=>void;
  chatMessages?: ChatMessage[];
  chatOwnSeat?: number;
  onSendChat?: (text:string)=>Promise<void>;
  selectedCard: CardInstance | null;
  onSelectCard: (card: CardInstance, owner: number) => void;
  onPlaySelected: (cardId: string) => void;
  onBankSelected: (cardId: string) => void;
  onEndTurn: () => void;
  onDonateCard?:(card:CardInstance)=>void;
  onViewBank: (playerIndex: number) => void;
  onRearrange: () => void;
  onDropPropertyToGroup?: (cardId: string, groupColor: string, groupId?: string) => void;
}

export const PlayerZone: React.FC<PlayerZoneProps> = ({
  state,
  allowDrag=true,
  arrangeMode,onArrangeModeChange,
  selectedCard,
  onSelectCard,
  onPlaySelected,
  onBankSelected,
  onEndTurn,
  onDonateCard,
  onViewBank,
  onRearrange,
  onDropPropertyToGroup,
}) => {
  const isSetup = state.phase === 'setup';
  const player = state.players[0];
  const myTurn = state.winner === null && (isSetup ? !player?.setupDone : state.turn === 0);

  const [localArrange,setLocalArrange]=useState(false),[moveCard,setMoveCard]=useState(''),[showNewSet,setShowNewSet]=useState(false);
  const canArrange=myTurn&&!state.pending&&!!onDropPropertyToGroup;
  const arranging=canArrange&&(arrangeMode??localArrange);
  const setArrange=(enabled:boolean)=>{setLocalArrange(enabled);onArrangeModeChange?.(enabled);setMoveCard('');setShowNewSet(false);};
  useEffect(()=>{if(!canArrange){setLocalArrange(false);onArrangeModeChange?.(false);setMoveCard('');setShowNewSet(false);}},[canArrange]);
  useEffect(()=>{if(moveCard&&!player.groups.some(g=>g.cards.some(c=>c.id===moveCard))){setMoveCard('');setShowNewSet(false);}},[state,moveCard]);
  const destinations=propertyDestinations(state,moveCard);
  const moveTo=(color:string,gid?:string)=>{if(!arranging||!moveCard)return;onDropPropertyToGroup?.(moveCard,color,gid);setMoveCard('');setShowNewSet(false);};
  const chooseProperty=(id:string)=>{setMoveCard(id===moveCard?'':id);setShowNewSet(false);};
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

  const setsCount = completeSetCount(player);
  const bankTotal = (player?.bank || []).reduce((sum, c) => sum + getCardDef(c).value, 0);

  const freeBank=state.phase!=='setup'&&player.special.some(c=>c.key==='free_parking')&&!player.freeBankUsed;
  const freeSelected=selectedCard&&['community_chest','chance'].includes(selectedCard.key);
  const canAct = myTurn && !state.pending && state.winner === null && used < limit;

  // Selected card actions
  const selectedInHand = selectedCard && player?.hand.some((c) => c.id === selectedCard.id);
  const selectedDef = selectedInHand ? getCardDef(selectedCard) : null;

  return (
    <section className={'player-zone'+(arranging?' arranging-properties':'')} aria-label="Your hand, properties and bank">
      <div className="center">
        <div className="property-area" data-hand-drop="field">
          <div className="sectionhead">
            <span className="desktop-player-identity"><PlayerToken index={player?.tokenIndex??0}/><span title={player?.name}>{player?.name}</span></span>
            <strong>YOUR FIELD · {setsCount} / 3 SETS</strong>
            {player?.defending && <span className="defense">DEFENDING</span>}
            {canArrange&&<button type="button" className={arranging?'gold arrange-toggle':'quiet arrange-toggle'} aria-pressed={arranging} onClick={()=>setArrange(!arranging)}>{arranging?'Done':'Arrange'}</button>}
          </div>

          {arranging&&<div className="arrange-help" role="status">{moveCard?'Choose a glowing set, or New set.':'Select a property to move.'}{moveCard&&!destinations.groups.length&&!destinations.newColors.length&&<span>No legal destination for this property.</span>}{player.groups.some(g=>g.house||g.hotel)&&<button type="button" className="quiet arrange-buildings" onClick={onRearrange}>Buildings</button>}{showNewSet&&<div className="arrange-new-colors" role="group" aria-label="New set color">{destinations.newColors.map(color=><button type="button" className="quiet" key={color} onClick={()=>moveTo(color)}><span style={{background:COLORS[color]?.hex}}/>{color}</button>)}</div>}</div>}
          <div className="field-body">{player.jailed&&<img className="jail-field-icon" src="/ui/jail.png" alt="In Jail"/>}
            <div className="groups">
              {player && (player.groups.length > 0 || player.special.length > 0 || !!player.protectedEstate) ? (
                <>
                  {player.groups.map((g) => {
                    const colInfo = COLORS[g.color] || { size: 2, hex: '#8b5438' };
                    const isFull =
                      g.cards.length === colInfo.size &&
                      g.cards.some((c) => getCardDef(c).value > 0);

                    return (
                      <section
                        key={g.id}
                        data-group-id={g.id}
                        data-group-color={g.color}
                        className={`group ${isFull ? 'complete' : ''} ${defenseFragile(player,g)?'defense-fragile':''} ${arranging&&destinations.groups.some(x=>x.id===g.id)?'arrange-destination':''}`}
                        onClick={()=>{if(arranging&&destinations.groups.some(x=>x.id===g.id))moveTo(g.color,g.id);}}
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
                          <span>{g.color}</span>{arranging&&destinations.groups.some(x=>x.id===g.id)&&<button type="button" className="arrange-move-here" onClick={e=>{e.stopPropagation();moveTo(g.color,g.id);}}>Move here</button>}
                          <span className="set-summary">
                            <span>{isFull ? 'FULL SET' : `${g.cards.length} / ${colInfo.size}`}</span>
                            <SetRentBadge group={g} owner={player}/>{defenseFragile(player,g)&&<span className="defense-risk-mark" title="Losing a property from this set may cancel defense" aria-label="Defense at risk">!</span>}
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
                                className={`card ${(arranging?moveCard===c.id:selectedCard?.id===c.id) ? 'selected' : ''}`}
                                aria-pressed={arranging?moveCard===c.id:undefined}
                                onClick={e=>{e.stopPropagation();if(arranging){if(moveCard&&destinations.groups.some(x=>x.id===g.id))moveTo(g.color,g.id);else chooseProperty(c.id);}else onSelectCard(c,0);}}
                                draggable={allowDrag&&myTurn && !state.pending}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', c.id);
                                }}
                                title={`${def.name} — ${def.value}M`}
                              >
                                <img
                                  className={isCardInverted(c,g.color) ? 'inverted' : ''}
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

                          <span>
                            {g.house && <span className="building">House </span>}
                            {g.hotel && <span className="building">Hotel</span>}
                          </span>
                        </div>
                      </section>
                    );
                  })}

                  {player.protectedEstate&&<ProtectedEstateField card={player.protectedEstate} onPreview={c=>onSelectCard(c,0)}/>}
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
                              onClick={() => {if(!arranging)onSelectCard(c, 0);}}
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
                  disabled={arranging&&(!moveCard||!destinations.newColors.length)}
                  onClick={()=>{if(!arranging){setArrange(true);return;}if(destinations.newColors.length===1)moveTo(destinations.newColors[0]);else setShowNewSet(v=>!v);}}
                  title="Arrange properties"
                >
                  {arranging?'＋ New set':'Arrange properties'}
                  <br />
                  <small>{arranging?'Start a separate set':'Select a card, then a set'}</small>
                </button>
              )}
            </div>

            {/* Bank on the right of your field */}
            <button
              type="button"
              className="bank-field" data-hand-drop="bank"
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
                  draggable={allowDrag&&myTurn&&!state.pending}
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
                      disabled={!myTurn||!!state.pending||(!canAct&&!freeSelected)}
                      onClick={() => onPlaySelected(selectedCard.id)}
                    >
                      Play card
                    </button>
                  )}
                {!['property', 'wild', 'special'].includes(selectedDef.type) && (
                  <button
                    type="button"
                    disabled={!myTurn||!!state.pending||(!canAct&&!freeBank)}
                    onClick={() => onBankSelected(selectedCard.id)}
                  >
                    Bank {freeBank?'(FREE)':selectedDef.value+'M'}
                  </button>
                )}
                {onDonateCard&&state.players.length>=4&&state.players.length<=5&&state.winner===null&&state.phase!=='setup'&&state.players.some(p=>p.defending&&!p.forfeited)&&<button type="button" className="quiet donate-hand-button" onClick={()=>onDonateCard(selectedCard)}>Donate (FREE)</button>}
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
