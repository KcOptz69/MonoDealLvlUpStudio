import React, { useState } from 'react';
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
  const allowedColors = card.locked ? [card.locked] : def.colors || [];
  const [selectedColor, setSelectedColor] = useState<string>(allowedColors[0] || 'Brown');

  // Candidate opponents
  const opponents = state.players
    .map((p, idx) => ({ player: p, index: idx }))
    .filter(({ index }) => index !== 0);

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

  return (
    <div className="overlay">
      <section className="modal" role="dialog" aria-modal="true" aria-label={def.name}>
        <div className="modalhead">
          <h2>{def.name}</h2>
          <button className="quiet" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <div className="targeting-layout">
          <aside className="action-reference">
            <img src={getCardArt(card)} alt={def.name} />
            <b>{def.name} · {def.value}M</b>
            <p>{def.text}</p>
          </aside>

          <div className="form">
            {/* Color assignment for wildcards */}
            {def.type === 'wild' && !card.locked && (
              <fieldset className="target-field">
                <legend>Assign color</legend>
                <div className="target-options">
                  {allowedColors.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`target-option ${selectedColor === col ? 'picked' : ''}`}
                      onClick={() => setSelectedColor(col)}
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
                      onClick={() => setTargetOpponent(index)}
                    >
                      <span className="avatar">{player.name[0]}</span>
                      <strong>{player.name}</strong>
                      <small>{player.hand.length} cards · {player.groups.length} sets</small>
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
                      onClick={() => setSelectedGroup(g.id)}
                    >
                      <span
                        className="color-swatch"
                        style={{ background: COLORS[g.color]?.hex || '#efbf5e' }}
                      />
                      <span>{g.color} · {g.cards.length} cards</span>
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
                      onClick={() => setDealBreakerGroup(g.id)}
                    >
                      <span
                        className="color-swatch"
                        style={{ background: COLORS[g.color]?.hex || '#efbf5e' }}
                      />
                      <span>{g.color} ({g.cards.length} properties)</span>
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
                        onClick={() => setTargetProperty(c.id)}
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
