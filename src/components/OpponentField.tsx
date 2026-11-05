import {ProtectedEstateField} from './ProtectedEstate';
import {completeSetCount} from '../boardSelection';
import {defenseFragile} from '../boardSelection';
import {SetRentBadge} from './SetRentBadge';
import '../opponent-cards.css';
import { isCardInverted } from '../cardOrientation';
import {PlayerToken} from './PlayerToken';
import React from 'react';
import { GameState, CardInstance, PropertyGroup } from '../types';
import { getCardDef, COLORS } from '../engineBridge';
import {STATIC_ART} from '../cardArt';
import { getCardArt } from '../cardArt';

interface OpponentFieldProps {
  state: GameState;
  onSelectCard: (card: CardInstance, owner: number) => void;
  onViewBank: (playerIndex: number) => void;
  onViewPlayer: (playerIndex: number) => void;
  selectedCardId?: string;
}

export const OpponentField: React.FC<OpponentFieldProps> = ({
  state,
  onSelectCard,
  onViewBank,
  onViewPlayer,
  selectedCardId,
}) => {
  const isSetup = state.phase === 'setup';

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

  const remainingDefense = (i: number) => {
    if(state.players[i].defenseRemaining!=null)return state.players[i].defenseRemaining;
    return (
      (i - state.turn + state.players.length) % state.players.length || state.players.length
    );
  };

  const getBankTotal = (bank: CardInstance[]) => {
    return bank.reduce((sum, c) => sum + getCardDef(c).value, 0);
  };

  return (
    <div className="opponents">
      {state.players.slice(1).map((p, idx) => {
        const playerIndex = idx + 1;
        if(isSetup)return <section className="opponent setup-concealed" key={playerIndex} data-player={playerIndex} aria-label={p.name+' setup field'}><div className="ophead"><PlayerToken index={p.tokenIndex??playerIndex}/><strong>{p.name}</strong></div><small>{p.setupDone?'Ready':'Setting up'} · {p.setupPlayed||0}/3 actions</small><div className="setup-cardbacks">{Array.from({length:p.setupPlayed||0},(_,i)=><img key={i} src={STATIC_ART.card_back} alt="Hidden setup card"/>)}</div><small>Revealed when everyone is ready</small></section>;

        const isActive = isSetup ? !p.setupDone : state.turn === playerIndex;
        const setsCount = completeSetCount(p);
        const bankTotal = getBankTotal(p.bank);

        return (
          <section
            key={playerIndex}
            data-player={playerIndex}
            className={`opponent ${isActive ? 'active' : ''} ${p.defending ? 'opponent-defending' : ''}`}
            aria-label={`${p.name}’s board`}
            tabIndex={0}
            onClick={e=>{if(!(e.target as Element).closest('button'))onViewPlayer(playerIndex);}}
            onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onViewPlayer(playerIndex);}}}
          >
            {p.jailed&&<img className="jail-field-icon" src="/ui/jail.png" alt="In Jail"/>}<div className="ophead">
              <button
                type="button"
                className="opponent-open"
                title="View this player’s full field"
                onClick={() => onViewPlayer(playerIndex)}
              >
                <PlayerToken index={p.tokenIndex ?? playerIndex}/>
                <strong>{p.name}</strong>
                <span className="opponent-desktop-state">
                  {p.forfeited?'In lobby':state.pending?.responders?.includes(playerIndex)||state.pending?.payments?.some(e=>e.target===playerIndex)||state.pending?.responder===playerIndex
                    ? state.pending.kind==='payment'?'Paying':state.pending.kind==='counter'?'Responding':state.pending.kind==='estate'?'Choosing purchase':'Choosing'
                    : isSetup ? p.setupDone?'✓ Ready':`${3-(p.setupPlayed||0)} setup actions`
                    : p.defending?`Defending · ${remainingDefense(playerIndex)} turns`
                    : state.turn===playerIndex?'● Playing':'Waiting'}
                </span>
              </button>
              <button
                type="button"
                className="quiet compactbtn"
                onClick={() => onViewBank(playerIndex)}
              >
                Bank {bankTotal}M
              </button>
            </div>

            <div className="opmeta">
              <span className="opponent-hand-count"><span className="card-stack-icon" aria-hidden="true"><img src={STATIC_ART.card_back} alt=""/></span>{p.hand.length} cards</span>
              <span>{setsCount} / 3 sets</span>
              <span className={'opponent-mobile-status'+(p.defending?' defending-status':'')+(state.pending?.responder===playerIndex?' needs-response':'')}>{p.forfeited?'In lobby':state.pending?.responders?.includes(playerIndex)||state.pending?.payments?.some(e=>e.target===playerIndex)||state.pending?.responder===playerIndex ? state.pending.kind==='payment'?'Paying':state.pending.kind==='counter'?'Responding':state.pending.kind==='estate'?'Choosing purchase':'Choosing' : isSetup ? p.setupDone?'Ready':`${3-(p.setupPlayed||0)} setup actions` : p.defending?`Defending · ${remainingDefense(playerIndex)} turns`:state.turn===playerIndex?'● Playing':'Waiting'}</span>
              {p.defending && (
                <span className="defense">
                  DEFENDING · {remainingDefense(playerIndex)} turns to victory
                </span>
              )}
            </div>

            <div className="opponent-field">
              {p.groups.length > 0 || p.special.length > 0 || !!p.protectedEstate ? (
                <>
                  {p.groups.map((g) => {
                    const colInfo = COLORS[g.color] || { size: 2, hex: '#8b5438' };
                    const isFull =
                      g.cards.length === colInfo.size &&
                      g.cards.some((c) => getCardDef(c).value > 0);

                    return (
                      <section
                        key={g.id}
                        data-group-id={g.id}
                        className={`group ${isFull ? 'complete' : ''} ${defenseFragile(p,g)?'defense-fragile':''}`}
                        style={{ '--c': colInfo.hex } as React.CSSProperties}
                      >
                        <div className="grouphead">
                          <span>{g.color}</span>
                          <span className="set-summary">
                            <span>{isFull ? 'FULL SET' : `${g.cards.length} / ${colInfo.size}`}</span>
                            <SetRentBadge group={g} owner={p}/>{defenseFragile(p,g)&&<span className="defense-risk-mark" title="Losing a property from this set may cancel defense" aria-label="Defense at risk">!</span>}
                          </span>
                        </div>
                        <div className="groupcards">
                          {g.cards.map((c) => {
                            const def = getCardDef(c);
                            const artUrl = getCardArt(c);
                            return (
                              <button
                                key={c.id}
                                data-card-id={c.id}
                                type="button"
                                className={`card ${selectedCardId === c.id ? 'selected' : ''}`}
                                onClick={e=>{e.stopPropagation();if(document.documentElement.classList.contains('mobile-device'))onViewPlayer(playerIndex);else onSelectCard(c,playerIndex);}}
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

                  {p.protectedEstate&&<ProtectedEstateField card={p.protectedEstate} onPreview={c=>onSelectCard(c,playerIndex)}/>}
                  {p.special.length > 0 && (
                    <section className="group specialgroup">
                      <div className="grouphead" style={{ '--c': '#a88037' } as React.CSSProperties}>
                        <span>SPECIALS</span>
                      </div>
                      <div className="groupcards">
                        {p.special.map((c) => {
                          const def = getCardDef(c);
                          const artUrl = getCardArt(c);
                          return (
                            <button
                              key={c.id}
                              data-card-id={c.id}
                              type="button"
                              className={`card ${selectedCardId === c.id ? 'selected' : ''}`}
                              onClick={e=>{e.stopPropagation();if(document.documentElement.classList.contains('mobile-device'))onViewPlayer(playerIndex);else onSelectCard(c,playerIndex);}}
                              title={`${def.name} — ${def.value}M`}
                            >
                              <img src={artUrl} alt={def.name} draggable={false} />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <small>No properties yet</small>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
