import {ExpansionSelector} from './ExpansionSelector';
import {PlayerToken} from './PlayerToken';
import React, { useState } from 'react';
import '../wildcard.css';
import '../debt-target.css';
import '../selection-prompts.css';
import { CardInstance, GameState } from '../types';
import { getCardDef, COLORS } from '../engineBridge';
import { getCardArt } from '../cardArt';

interface TargetingWizardProps {
  card: CardInstance;
  state: GameState;
  onConfirm: (args: any) => void;
  onCancel: () => void;
}

export const TargetingWizard: React.FC<TargetingWizardProps> = ({
  card,
  state,
  onConfirm,
  onCancel,
}) => {
  const def = getCardDef(card);
  const me = state.players[0];

  // Candidates for color
  const expansionFixed=card.locked||(card.expansionOwner===0?card.expansionColor:undefined);
  const expansionColors=[...new Set(me.groups.filter(g=>g.cards.length<COLORS[g.color]?.size&&g.cards.some(c=>c.key!=='expansion_property')&&(!expansionFixed||g.color===expansionFixed)).map(g=>g.color))];
  const allowedColors = card.key==='expansion_property'?expansionColors:card.locked?[card.locked]:def.colors||[];
  const [selectedColor, setSelectedColor] = useState<string>(allowedColors[0] || 'Brown');

  // Candidate opponents
  const opponents = state.players
    .map((p, idx) => ({ player: p, index: idx }))
    .filter(({ index,player }) => index !== 0 && !player.forfeited);

  // Tough luck requires an opponent with >= 1 complete set
  const eligibleOpponents = opponents.filter(({ player, index }) => {
    if (card.key === 'tough_luck') {
      const fullCount = player.groups.filter((g) => {
        const col = COLORS[g.color];
        return col && g.cards.length === col.size;
      }).length;
      return fullCount >= 1;
    }
    return true;
  });

  const [targetOpponent, setTargetOpponent] = useState<number>(
    eligibleOpponents[0]?.index ?? 1
  );

  // Your matching property groups (for Rent, House, Hotel)
  const myEligibleGroups = me.groups.filter((g) => {
    if (def.type === 'rent') {
      return def.any || (def.colors || []).includes(g.color);
    }
    if (['house', 'hotel'].includes(card.key)) {
      const col = COLORS[g.color];
      const isFull = col && g.cards.length === col.size;
      if (!isFull || ['Railroad', 'Utility'].includes(g.color)) return false;
      if (card.key === 'house') return !g.house;
      if (card.key === 'hotel') return g.house && !g.hotel;
    }
    return true;
  });

  const [selectedGroup, setSelectedGroup] = useState<string>(
    myEligibleGroups[0]?.id || ''
  );

  // Opponent properties for Sly Deal, Forced Deal, Eviction Notice, Forced Rezoning
  const targetPlayer = state.players[targetOpponent];
  const targetAllProps = targetPlayer
    ? [...targetPlayer.special, ...targetPlayer.groups.flatMap((g) => g.cards)]
    : [];

  const eligibleOpponentProps = targetAllProps.filter((c) => {
    const d = getCardDef(c);
    const parentGroup = targetPlayer?.groups.find((g) =>
      g.cards.some((gc) => gc.id === c.id)
    );
    const isFull =
      parentGroup &&
      parentGroup.cards.length === (COLORS[parentGroup.color]?.size || 2);

    if (['sly_deal', 'forced_deal'].includes(card.key)) {
      return !isFull;
    }
    if (card.key === 'forced_rezoning') {
      return d.type === 'wild' && !c.locked;
    }
    return true;
  });

  const [targetProperty, setTargetProperty] = useState<string>(
    eligibleOpponentProps[0]?.id || ''
  );

  // Own properties for Forced Deal
  const myAllProps = me
    ? [...me.special, ...me.groups.flatMap((g) => g.cards)]
    : [];
  const [ownProperty, setOwnProperty] = useState<string>(myAllProps[0]?.id || '');

  // Opponent complete sets for Deal Breaker
  const opponentFullSets = (targetPlayer?.groups || []).filter((g) => {
    const col = COLORS[g.color];
    return col && g.cards.length === col.size;
  });
  const [dealBreakerGroup, setDealBreakerGroup] = useState<string>(
    opponentFullSets[0]?.id || ''
  );

  // Category for Tough Luck
  const [toughCategory, setToughCategory] = useState<'property' | 'action' | 'money'>('property');

  // Permanent color for Forced Rezoning
  const targetRezoningCard = eligibleOpponentProps.find((c) => c.id === targetProperty);
  const rezoningColors = targetRezoningCard ? getCardDef(targetRezoningCard).colors || [] : [];
  const [recolor, setRecolor] = useState<string>(rezoningColors[0] || 'Brown');

  // Submit helper
  const handleSubmit = () => {
    if(card.key==='expansion_property'&&!allowedColors.length)return;
    const args: any = { id: card.id };

    if (['property', 'wild'].includes(def.type)) {
      args.color = selectedColor;
    }

    if (def.type === 'rent') {
      args.group = selectedGroup;
      if (def.any) {
        args.target = targetOpponent;
      }
    }

    if (['house', 'hotel'].includes(card.key)) {
      args.group = selectedGroup;
    }

    if (card.key === 'deal_breaker') {
      args.target = targetOpponent;
      args.group = dealBreakerGroup;
    }

    if (['sly_deal', 'eviction_notice'].includes(card.key)) {
      args.target = targetOpponent;
      args.property = targetProperty;
    }

    if (card.key === 'forced_deal') {
      args.target = targetOpponent;
      args.property = targetProperty;
      args.own = ownProperty;
    }

    if (card.key === 'forced_rezoning') {
      args.target = targetOpponent;
      args.property = targetProperty;
      args.color = recolor;
    }

    if (['debt_collector', 'compulsory_purchase'].includes(card.key)) {
      args.target = targetOpponent;
    }

    if (card.key === 'tough_luck') {
      args.target = targetOpponent;
      args.category = toughCategory;
    }

    onConfirm(args);
  };

  if (card.key === 'debt_collector') return (
    <div className="overlay debt-target-overlay">
      <section className="debt-target-dialog" role="dialog" aria-modal="true" aria-labelledby="debt-target-title">
        <button className="debt-target-close quiet" onClick={onCancel} aria-label="Close">×</button>
        <div className="debt-target-body">
          <img className="debt-target-art" src={getCardArt(card)} alt={def.name}/>
          <div className="debt-target-choices">
            <h2 id="debt-target-title">Choose opponent</h2>
            <p>Collect 5M from one player.</p>
            <div className="debt-target-list">
              {eligibleOpponents.map(({player,index})=>{
                const bank=player.bank.reduce((sum,c)=>sum+getCardDef(c).value,0);
                const properties=[...player.special,...player.groups.flatMap(g=>[...g.cards,...(g.house?[g.house]:[]),...(g.hotel?[g.hotel]:[])])].reduce((sum,c)=>sum+getCardDef(c).value,0);
                const full=new Set(player.groups.filter(g=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0)).map(g=>g.color)).size;
                return <button key={index} type="button" className={'debt-target-choice'+(targetOpponent===index?' picked':'')} aria-pressed={targetOpponent===index} onClick={()=>setTargetOpponent(index)}>
                  <PlayerToken index={player.tokenIndex ?? index}/><span className="debt-target-summary"><strong>{player.name}</strong><small>Bank {bank}M · Properties {properties}M</small><small>{full}/3 complete sets{player.defending?' · DEFENDING':''}{bank+properties===0?' · No assets':''}</small></span><span className="debt-target-tick" aria-hidden="true">{targetOpponent===index?'✓':''}</span>
                </button>;
              })}
            </div>
          </div>
        </div>
        <footer><button className="quiet" onClick={onCancel}>Cancel</button><button className="gold" disabled={!eligibleOpponents.some(o=>o.index===targetOpponent)} onClick={handleSubmit}>Collect 5M</button></footer>
      </section>
    </div>
  );

  if(card.key==='expansion_property')return <ExpansionSelector state={state} card={card} onClose={onCancel} onSelect={g=>onConfirm({id:card.id,color:g.color,group:g.id})}/>;
  if (def.type === 'wild') return <div className="overlay wildcard-overlay"><section className="wildcard-dialog" role="dialog" aria-modal="true" aria-label="Choose property color"><header><button onClick={onCancel} aria-label="Close">×</button></header><div className="wildcard-body"><img className="wildcard-card" src={getCardArt(card)} alt={def.name}/><div className="wildcard-choice-panel"><h2>Choose property color</h2>{!allowedColors.length&&<p>You need an existing matching-color set with space for another card.</p>}<div className="wildcard-colors">{allowedColors.map(col=><button key={col} className={'wildcard-color'+(selectedColor===col?' picked':'')} aria-pressed={selectedColor===col} onClick={()=>setSelectedColor(col)}><span className="wildcard-swatch" style={{background:COLORS[col]?.hex}}/><span>{col}</span>{selectedColor===col&&<b>✓</b>}</button>)}</div></div></div><footer><button className="quiet" onClick={onCancel}>Cancel</button><button className="gold" disabled={!allowedColors.includes(selectedColor)} onClick={handleSubmit}>Play property</button></footer></section></div>;

  return (
    <div className="overlay">
      <section className="modal selection-dialog" role="dialog" aria-modal="true" aria-label={def.name}>
        <button className="quiet selection-close" onClick={onCancel} aria-label="Close">×</button>

        <div className="targeting-layout">
          <aside className="action-reference">
            <img src={getCardArt(card)} alt={def.name} />

          </aside>

          <div className="form selection-choices">
            <h2>{def.name}</h2>
            <p className="selection-instruction">{def.text}</p>
            {/* Target Opponent selection */}
            {([
              'deal_breaker',
              'sly_deal',
              'forced_deal',
              'eviction_notice',
              'forced_rezoning',
              'debt_collector',
              'compulsory_purchase',
              'tough_luck',
            ].includes(card.key) ||
              (def.type === 'rent' && def.any)) && (
              <fieldset className="target-field">
                <legend>Select opponent</legend>
                <div className="target-options">
                  {eligibleOpponents.map(({ player, index }) => (
                    <button
                      key={index}
                      type="button"
                      className={`target-option ${targetOpponent === index ? 'picked' : ''}`}
                      aria-pressed={targetOpponent === index}
                      onClick={() => {
                        setTargetOpponent(index);
                        const candidates=[...player.special,...player.groups.flatMap(g=>g.cards)].filter(c=>{
                          const parent=player.groups.find(g=>g.cards.some(x=>x.id===c.id));
                          if(['sly_deal','forced_deal'].includes(card.key))return !parent||parent.cards.length!==COLORS[parent.color]?.size;
                          return card.key!=='forced_rezoning'||(getCardDef(c).type==='wild'&&!c.locked);
                        });
                        setTargetProperty(candidates[0]?.id||'');
                        setRecolor(candidates[0]?getCardDef(candidates[0]).colors?.[0]||'Brown':'Brown');
                        setDealBreakerGroup(player.groups.find(g=>g.cards.length===COLORS[g.color]?.size)?.id||'');
                      }}
                    >
                      <PlayerToken index={player.tokenIndex ?? index}/>
                      <strong>{player.name}</strong>
                      <small>Bank {player.bank.reduce((sum,c)=>sum+getCardDef(c).value,0)}M · {new Set(player.groups.filter(g=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0)).map(g=>g.color)).size}/3 complete sets{player.defending?' · DEFENDING':''}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Rent group or House/Hotel group selection */}
            {(def.type === 'rent' || ['house', 'hotel'].includes(card.key)) && (
              <fieldset className="target-field">
                <legend>Your property set</legend>
                <div className="target-options">
                  {myEligibleGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`target-option ${selectedGroup === g.id ? 'picked' : ''}`}
                      aria-pressed={selectedGroup === g.id}
                      onClick={() => setSelectedGroup(g.id)}
                    >
                      <span
                        className="color-swatch"
                        style={{ background: COLORS[g.color]?.hex || '#efbf5e' }}
                      />
                      <span>{g.color} · {g.cards.length} cards</span><span className="selection-set-art">{g.cards.map(c=><img key={c.id} src={getCardArt(c)} alt={getCardDef(c).name}/>)}</span>
                    </button>
                  ))}
                </div>
                {myEligibleGroups.length === 0 && (
                  <p className="warning">No eligible property set on your field.</p>
                )}
              </fieldset>
            )}

            {/* Deal Breaker full set selection */}
            {card.key === 'deal_breaker' && (
              <fieldset className="target-field">
                <legend>Opponent complete set</legend>
                <div className="target-options">
                  {opponentFullSets.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`target-option ${dealBreakerGroup === g.id ? 'picked' : ''}`}
                      aria-pressed={dealBreakerGroup === g.id}
                      onClick={() => setDealBreakerGroup(g.id)}
                    >
                      <span
                        className="color-swatch"
                        style={{ background: COLORS[g.color]?.hex || '#efbf5e' }}
                      />
                      <span>{g.color} ({g.cards.length} properties)</span><span className="selection-set-art">{g.cards.map(c=><img key={c.id} src={getCardArt(c)} alt={getCardDef(c).name}/>)}</span>
                    </button>
                  ))}
                </div>
                {opponentFullSets.length === 0 && (
                  <p className="warning">Opponent has no complete sets.</p>
                )}
              </fieldset>
            )}

            {/* Opponent property selection for Sly Deal / Forced Deal / Eviction / Forced Rezoning */}
            {['sly_deal', 'forced_deal', 'eviction_notice', 'forced_rezoning'].includes(card.key) && (
              <fieldset className="target-field">
                <legend>Opponent property</legend>
                <div className="target-options">
                  {eligibleOpponentProps.map((c) => {
                    const cd = getCardDef(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`target-option ${targetProperty === c.id ? 'picked' : ''}`}
                      aria-pressed={targetProperty === c.id}
                        onClick={() => {setTargetProperty(c.id);setRecolor(getCardDef(c).colors?.[0]||'Brown');}}
                      >
                        <img className="target-card" src={getCardArt(c)} alt={cd.name} />
                        <span>{cd.name}</span>
                      </button>
                    );
                  })}
                </div>
                {eligibleOpponentProps.length === 0 && (
                  <p className="warning">Opponent has no eligible properties.</p>
                )}
              </fieldset>
            )}

            {/* Forced Deal: Your own property to trade */}
            {card.key === 'forced_deal' && (
              <fieldset className="target-field">
                <legend>Your property to give</legend>
                <div className="target-options">
                  {myAllProps.map((c) => {
                    const cd = getCardDef(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`target-option ${ownProperty === c.id ? 'picked' : ''}`}
                      aria-pressed={ownProperty === c.id}
                        onClick={() => setOwnProperty(c.id)}
                      >
                        <img className="target-card" src={getCardArt(c)} alt={cd.name} />
                        <span>{cd.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Forced Rezoning: Color to lock */}
            {card.key === 'forced_rezoning' && (
              <fieldset className="target-field">
                <legend>Permanent color</legend>
                <div className="target-options">
                  {rezoningColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`target-option ${recolor === col ? 'picked' : ''}`}
                      aria-pressed={recolor === col}
                      onClick={() => setRecolor(col)}
                    >
                      <span
                        className="color-swatch"
                        style={{ background: COLORS[col]?.hex || '#efbf5e' }}
                      />
                      <span>{col}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Tough Luck category picker */}
            {card.key === 'tough_luck' && (
              <fieldset className="target-field">
                <legend>Take all cards of this type from their hand</legend>
                <div className="target-options">
                  {(['property', 'action', 'money'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`target-option ${toughCategory === cat ? 'picked' : ''}`}
                      aria-pressed={toughCategory === cat}
                      onClick={() => setToughCategory(cat)}
                    >
                      <strong>{cat.toUpperCase()}</strong>
                      <small>
                        {cat === 'property'
                          ? 'Properties & Specials'
                          : cat === 'action'
                          ? 'Actions, Rent & Buildings'
                          : 'Money cards'}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </div>

        <div className="modalfooter">
          <button className="quiet" onClick={onCancel}>
            Cancel
          </button>
          <button className="gold" onClick={handleSubmit}>
            Confirm play
          </button>
        </div>
      </section>
    </div>
  );
};
