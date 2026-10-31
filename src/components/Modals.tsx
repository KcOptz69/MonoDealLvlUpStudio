import React, { useState, useEffect } from 'react';
import {createPortal} from 'react-dom';
import '../payment-layout.css';
import '../selection-prompts.css';
import { CardInstance, GameState, PropertyGroup } from '../types';
import { getCardDef, COLORS, DECK } from '../engineBridge';
import { getCardArt, STATIC_ART, isCardInverted } from '../cardArt';

// 1. Rules Modal
export const RulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="overlay">
    <section className="modal" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="modalhead">
        <h2>How to play · Lvl. Up rules</h2>
        <button className="quiet" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="rules">
        <h3>Build, then defend</h3>
        <p>
          Finish your turn with three complete property sets of different colors. Every other player
          gets a turn. If you maintain at least three complete colors throughout that rotation, you
          win at the start of your next turn, before drawing. Dropping below three cancels your attempt.
          Special properties do not form winning sets.
        </p>

        <h3>Your turn</h3>
        <p>
          The starting player is chosen randomly for every new game. Start with five cards. Everyone
          starts together in a simultaneous setup phase with three actions each to bank money/actions or
          place properties, including specials. Setup grants no extra draw, does not permit action
          effects or unused-action draws, and always has three actions even with Corporate Headquarters.
          Each player acts independently and presses Ready when finished. After everyone is ready,
          normal play begins with the same randomly selected first player. Draw two at the start of
          each turn, or five if your hand is empty. Play up to three cards: bank money or actions,
          place properties, or use actions. Corporate Headquarters allows four plays. End your turn
          with seven cards at most, or nine with Private Vault. Rearranging properties is free on your
          turn. New properties join an existing matching set with space. When ending early, you may draw
          one card per unused action and end, continue playing, or pass without drawing.
        </p>

        <h3>Properties and rent</h3>
        <p>
          Brown / Dark Blue / Utility need two cards; Railroad needs four; other colors need three. Use
          a matching Rent card to charge rent shown by your selected set. Two-color Rent targets every
          opponent; Any Color Rent targets one. A House adds 3M rent and a Hotel adds a further 4M;
          these need a complete color set, excluding Railroads and Utilities. The Hotel needs a House
          first. Double the Rent costs a separate card play. Luxury District adds 1M after doubling;
          Rent-Controlled Residence reduces the final bill by 2M, minimum zero.
        </p>

        <h3>Payments and responses</h3>
        <p>
          The debtor chooses which bank cards, properties or buildings to surrender. No change is
          given. Pay all eligible assets if unable to cover the bill. Multicolor Wildcards have no
          payment value and cannot be surrendered. No cards are paid from the hand. Just Say No can
          block an action affecting you, and another Just Say No can counter that block. Responses do
          not use turn plays. For all-target actions, all responses resolve before payments; a
          successful block cancels the entire action for everyone. A banked action can only be money.
        </p>

        <h3>Custom actions</h3>
        <p>
          <b>Eviction Notice:</b> return an opponent property to their hand, including from a complete
          set.<br />
          <b>Forced Rezoning:</b> permanently lock an unlocked wildcard to an allowed color. The lock
          survives ownership and hand changes.<br />
          <b>Compulsory Purchase:</b> one opponent pays at least 5M in properties only, their choice.<br />
          <b>Luxury Tax:</b> every other player discards 5M per complete set they own, bank first, then
          properties. One successful Just Say No cancels the entire tax for everyone.<br />
          <b>Tough Luck:</b> target an opponent with at least one complete set, then take all cards of a
          named category (Property, Action, Money) from their hand.
        </p>

        <h3>Special properties · 3M each</h3>
        <p>
          One of each of seven specials in the deck. All count as properties for theft, exchange,
          returns and payments, but do not count as complete sets.<br />
          <b>Insurance Agency:</b> draw one card for each property taken or surrendered in payment to
          another player.<br />
          <b>Investment Office:</b> draw three instead of two; empty hands still draw five.<br />
          <b>Emergency Treasury:</b> at the start of your normal turn, an empty bank creates a new 5M
          money card directly in your bank.<br />
          <b>I Owe You (2 copies, 5M):</b> from your hand during a payment to a player, give this card to
          their bank instead of the entire bill.
        </p>
      </div>
    </section>
  </div>
);

// 2. Audit / Card Library Modal
export const AuditModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="overlay">
    <section className="modal" role="dialog" aria-modal="true" aria-label="Card library">
      <div className="modalhead">
        <h2>Card library · 71 designs / 130 cards</h2>
        <button className="quiet" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="muted">
        Values shown below come from the deck data used for payments and bank totals.
      </p>
      <div className="audit">
        {DECK.map((d) => (
          <article key={d.key}>
            <img src={getCardArt(d.key)} alt={d.name} loading="lazy" />
            <b>{d.name}</b>
            {d.value}M · {d.copies} {d.copies === 1 ? 'copy' : 'copies'}
            <p>{d.text}</p>
            {d.colors && <span>{d.colors.join(' / ')}</span>}
          </article>
        ))}
      </div>
    </section>
  </div>
);

// 3. Settings Modal
export const SettingsModal: React.FC<{
  musicEnabled: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
  onApply: (sound: boolean, reduced: boolean, music: boolean) => void;
  onClose: () => void;
}> = ({ musicEnabled, soundEnabled, reducedMotion, onApply, onClose }) => {
  const [music, setMusic] = useState(musicEnabled);
  const [sound, setSound] = useState(soundEnabled);
  const [motion, setMotion] = useState(reducedMotion);

  return (
    <div className="overlay">
      <section className="modal small" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modalhead">
          <h2>Settings</h2>
          <button className="quiet" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="form">
          <p>Bot pace: Relaxed · 3–5 seconds per play</p>
          <label className="setting-row"><span>Music</span><span className="setting-switch"><span>{music?'On':'Off'}</span><input type="checkbox" role="switch" checked={music} onChange={e=>setMusic(e.target.checked)}/></span></label>
          <label className="setting-row"><span>Sound effects</span><span className="setting-switch"><span>{sound?'On':'Off'}</span><input type="checkbox" role="switch" checked={sound} onChange={e=>setSound(e.target.checked)}/></span></label>
          <label className="setting-row"><span>Reduce motion</span><span className="setting-switch"><span>{motion?'On':'Off'}</span><input type="checkbox" role="switch" checked={motion} onChange={e=>setMotion(e.target.checked)}/></span></label>
          <small>
            Games save automatically on this browser when local storage is available. No account or
            internet connection is required.
          </small>
          <button className="gold" onClick={() => onApply(sound, motion, music)}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
};

// 4. Winner Modal
export const WinnerModal: React.FC<{
  winner: number;
  winnerName: string;
  round: number;
  logCount: number;
  onMenu: () => void;
}> = ({ winner, winnerName, round, logCount, onMenu }) => (
  <div className="overlay">
    <section className="modal small" role="dialog" aria-modal="true" aria-label="Empire secured">
      <div className="modalhead">
        <h2>Empire secured</h2>
      </div>
      <div className="rules">
        <h2 style={{ color: '#f3c66d' }}>
          {winner === 0 ? 'You win!' : `${winnerName} wins!`}
        </h2>
        <p>Three complete sets held through an entire rotation.</p>
        <p>Round {round} · {logCount} recent events</p>
        <button className="gold" onClick={onMenu}>
          Back to menu
        </button>
      </div>
    </section>
  </div>
);

// 5. Double Rent Prompt Modal
export const DoubleRentModal: React.FC<{
  onConfirm: (double: boolean) => void;
}> = ({ onConfirm }) => (
  <div className="overlay">
    <section className="modal small compact-rent-dialog" role="dialog" aria-modal="true" aria-label="Double the Rent">
      <div className="rent-double">
        <img src={getCardArt('double_the_rent')} alt="Double the Rent" />
        <div>
          <h2>Double the Rent?</h2><p>Use one extra action to double this rent?</p>
          <button className="gold" onClick={() => onConfirm(true)}>
            Double rent · 2 actions
          </button>
          <button className="quiet" onClick={() => onConfirm(false)}>
            Normal rent · 1 action
          </button>
        </div>
      </div>
    </section>
  </div>
);

// 6. End Turn Unused Actions Modal
export const EndTurnModal: React.FC<{
  actionsLeft: number;
  onConfirm: (draw: boolean) => void;
  onCancel: () => void;
}> = ({ actionsLeft, onConfirm, onCancel }) => (
  <div className="overlay">
    <section className="modal small" role="dialog" aria-modal="true" aria-label="End Turn">
      <div className="modalhead">
        <h2>You have {actionsLeft} action{actionsLeft === 1 ? '' : 's'} left</h2>
        <button className="quiet" onClick={onCancel} aria-label="Close">×</button>
      </div>
      <div className="rules">
        <p>
          Draw <b>{actionsLeft} card{actionsLeft === 1 ? '' : 's'}</b> instead—one for each unused
          action—then end your turn. Your hand limit still applies.
        </p>
        <div className="end-turn-options">
          <button className="gold" onClick={() => onConfirm(true)}>
            Draw {actionsLeft} &amp; end turn
          </button>
          <button className="quiet" onClick={onCancel}>
            Continue playing
          </button>
          <button className="quiet" onClick={() => onConfirm(false)}>
            Pass without drawing
          </button>
        </div>
      </div>
    </section>
  </div>
);

// 7. Reaction Modal (Just Say No response)
export const ReactionModal: React.FC<{
  pending: NonNullable<GameState['pending']>;
  state: GameState;
  onRespond: (useJustSayNo: boolean) => void;
}> = ({ pending, state, onRespond }) => {
  const [seconds,setSeconds]=useState(10);
  useEffect(()=>{const tick=()=>setSeconds(Math.max(0,Math.ceil(((pending.deadline||Date.now()+10000)-Date.now())/1000)));tick();const timer=setInterval(tick,200);return()=>clearInterval(timer);},[pending.deadline]);
  const e = pending.e;
  const actor = state.players[e.actor]?.name || 'Opponent';
  const target = state.players[e.target]?.name || 'You';
  const hasJustSayNo = (state.players[0]?.hand || []).some((c) => c.key === 'just_say_no');

  const cardKey = e.cardKey || (e.key === 'rent' ? 'rent_any_color' : e.key);
  const def = getCardDef(cardKey);

  return (
    <div className="overlay">
      <section className="modal reaction-modal" role="dialog" aria-modal="true" aria-label="Your response">
        <div className="reaction-layout">
          <img
            className="reaction-card"
            src={getCardArt(cardKey)}
            alt={def.name}
          />
          <div className="reaction-content">
            <h3>Your response · {seconds}s</h3><small>Automatically allowed when the timer ends.</small>
            {e.global && (
              <p className="warning">
                This action affects everyone. A successful Just Say No cancels it for all players.
              </p>
            )}
            <p>
              <b>{actor}</b> played <b>{def.name}</b>
              {e.amount !== undefined ? ` · ${e.amount}M` : ''} targeting <b>{target}</b>.
            </p>
            <div className="reaction-buttons">
              <button className="gold" onClick={() => onRespond(false)}>
                {pending.negated ? 'Keep it blocked' : 'Allow action'}
              </button>
              <button
                disabled={!hasJustSayNo}
                onClick={() => onRespond(true)}
              >
                Just Say No {hasJustSayNo ? '' : '(none in hand)'}
              </button>
            </div>
            <p>
              {pending.negated
                ? 'The action is currently blocked. Counter with Just Say No to restore it.'
                : 'Let the action resolve, or block it with Just Say No.'}
            </p>
            <p className="muted">{def.text}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

// 8. Payment Modal
export const PaymentModal: React.FC<{
  pending: NonNullable<GameState['pending']>;
  state: GameState;
  onPay: (selectedIds: string[]) => void;
  onOfferIOU?: (cardId: string) => void;
}> = ({ pending, state, onPay, onOfferIOU }) => {
  const e = pending.e;
  const player = state.players[0];

  // Collect all payable items
  const items: Array<{ id: string; card: CardInstance; zone: string; value: number; color?: string }> = [];
  if (e.key !== 'compulsory_purchase') {
    for (const c of player.bank) {
      items.push({ id: c.id, card: c, zone: 'bank', value: getCardDef(c).value });
    }
  }
  for (const g of player.groups) {
    for (const c of g.cards) {
      const v = getCardDef(c).value;
      if (v > 0) {
        items.push({ id: c.id, card: c, zone: 'property', value: v, color: g.color });
      }
    }
    if (e.key !== 'compulsory_purchase') {
      if (g.house) items.push({ id: g.house.id, card: g.house, zone: 'house', value: 3, color: g.color });
      if (g.hotel) items.push({ id: g.hotel.id, card: g.hotel, zone: 'hotel', value: 4, color: g.color });
    }
  }
  for (const c of player.special) {
    const v = getCardDef(c).value;
    if (v > 0) {
      items.push({ id: c.id, card: c, zone: 'property', value: v, color: 'Special properties' });
    }
  }

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedTotal = items
    .filter((x) => selectedIds.includes(x.id))
    .reduce((sum, x) => sum + x.value, 0);

  const amountOwed = e.amount || 0;
  const totalAssets = items.reduce((sum, x) => sum + x.value, 0);

  // Warning for breaking complete sets
  const brokenColors = player.groups
    .filter((g) => {
      const colInfo = COLORS[g.color];
      const isFull = colInfo && g.cards.length === colInfo.size;
      return isFull && g.cards.some((c) => selectedIds.includes(c.id));
    })
    .map((g) => g.color);

  const iouCards = (player.hand || []).filter((c) => c.key === 'i_owe_you');

  const handleSuggest = () => {
    // Greedy heuristic to reach amountOwed
    let sum = 0;
    const picks: string[] = [];
    const sorted = [...items].sort((a, b) => a.value - b.value);
    for (const item of sorted) {
      if (sum < amountOwed) {
        picks.push(item.id);
        sum += item.value;
      }
    }
    setSelectedIds(picks);
  };

  items.sort((a,b)=>a.value-b.value);
  const banks = items.filter((x) => x.zone === 'bank');
  const props = items.filter((x) => x.zone !== 'bank');

  // Group properties by color
  const propGroups: Record<string, typeof props> = {};
  for (const p of props) {
    const col = p.color || 'Other';
    if (!propGroups[col]) propGroups[col] = [];
    propGroups[col].push(p);
  }

  if (minimized) return createPortal(<button type="button" className="payment-restore-tab" onClick={()=>{document.dispatchEvent(new Event('deal-close-artwork'));setMinimized(false);}} aria-label={`Restore payment selection, ${selectedTotal}M selected of ${amountOwed}M owed`}><span>↗ Resume payment · {amountOwed}M</span><small>{selectedTotal}M selected</small></button>,document.body);

  return (
    <div className="overlay">
      <section className="modal payment-modal" role="dialog" aria-modal="true" aria-label="Choose payment">
        <div className="modalhead">
          <h2>Choose payment · {amountOwed}M</h2>
          <button type="button" className="quiet payment-minimize" onClick={()=>setMinimized(true)} aria-label="Minimize payment to inspect board">− Minimize</button>
        </div>

        <p>
          {e.key === 'compulsory_purchase'
            ? 'Properties only. You choose what to surrender.'
            : e.key === 'luxury_tax'
            ? 'Pay your bank first, then properties. Payment goes to discard.'
            : 'Choose bank cards or properties. No change is given.'}
        </p>

        <div id="selectionTotal">
          {selectedTotal}M selected / {amountOwed}M owed
        </div>

        {brokenColors.length > 0 && (
          <div className="warning">
            Warning: this payment breaks your {brokenColors.join(', ')} full set
            {brokenColors.length > 1 ? 's' : ''} and may end your defense.
          </div>
        )}

        <div className="payment-modal-groups">
          {banks.length > 0 && (
            <section className="payment-section payment-bank">
              <h3>Bank</h3>
              <div className="choices payment-card-row">
                {banks.map((x) => {
                  const def = getCardDef(x.card);
                  const isChecked = selectedIds.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      className={`choice ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleItem(x.id)}
                    >
                      <img src={getCardArt(x.card)} alt={def.name} />
                      <strong>{def.name}</strong>
                      <span>{x.value}M</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {Object.entries(propGroups).map(([col, groupItems]) => (
            <section key={col} className="payment-section payment-properties">
              <h3>{col}</h3>
              <div className="choices payment-card-row">
                {groupItems.map((x) => {
                  const def = getCardDef(x.card);
                  const isChecked = selectedIds.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      className={`choice ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleItem(x.id)}
                    >
                      <img src={getCardArt(x.card)} alt={def.name} />
                      <strong>{def.name}</strong>
                      <span>{x.value}M</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {items.length === 0 && <p>No payable assets.</p>}
        </div>

        <div className="payment-modal-footer">
          {e.key !== 'luxury_tax' && onOfferIOU && iouCards.length > 0 && (
            <button className="iou-pay" onClick={() => onOfferIOU(iouCards[0].id)}>
              <img src={getCardArt(iouCards[0])} alt="I Owe You" />
              <span>
                Give I Owe You instead
                <br />
                <small>Creditor may use Just Say No</small>
              </span>
            </button>
          )}

          <div className="dock-buttons">
            <button className="quiet" onClick={handleSuggest}>
              Suggest
            </button>
            <button
              className="gold"
              disabled={selectedTotal < Math.min(amountOwed, totalAssets)}
              onClick={() => onPay(selectedIds)}
            >
              Pay selected
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// 9. Discard Modal (Hand limit)
export const DiscardModal: React.FC<{
  hand: CardInstance[];
  handLimit: number;
  onDiscard: (cardIds: string[]) => void;
}> = ({ hand, handLimit, onDiscard }) => {
  const excess = Math.max(0, hand.length - handLimit);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="overlay">
      <section className="modal compact-discard-dialog" role="dialog" aria-modal="true" aria-label="Discard cards">
        <div className="modalhead">
          <h2>Discard {excess} card{excess === 1 ? '' : 's'}</h2>
        </div>
        <p>Choose cards to discard down to your end-of-turn limit of {handLimit}.</p>
        <div id="selectionTotal" className="badge gold">
          {selectedIds.length} / {excess} cards selected
        </div>

        <div className="discard-selection-layout"><img className="discard-selection-art" src={getCardArt(hand.find(c=>selectedIds.includes(c.id))||hand[0])} alt="Selected card artwork"/>
        <div className="choices">
          {hand.map((c) => {
            const def = getCardDef(c);
            const isChecked = selectedIds.includes(c.id);
            return (
              <label
                key={c.id}
                className={`choice ${isChecked ? 'checked' : ''}`}
                onClick={() => toggle(c.id)}
              >
                <img src={getCardArt(c)} alt={def.name} />
                <strong>{def.name}</strong>
                <span>{def.value}M · {def.type}</span>
              </label>
            );
          })}
        </div>

        </div><div className="modalfooter">
          <button
            className="gold"
            disabled={selectedIds.length !== excess}
            onClick={() => onDiscard(selectedIds)}
          >
            Discard selected
          </button>
        </div>
      </section>
    </div>
  );
};

// 10. Discard Browser Modal
export const DiscardBrowserModal: React.FC<{
  discard: CardInstance[];
  onClose: () => void;
}> = ({ discard, onClose }) => {
  const [search, setSearch] = useState('');
  const cards = [...discard].reverse();

  const filtered = cards.filter((c) => {
    const def = getCardDef(c);
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      def.name.toLowerCase().includes(q) ||
      def.type.toLowerCase().includes(q) ||
      (def.colors || []).some((col) => col.toLowerCase().includes(q))
    );
  });

  return (
    <div className="overlay">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Discard pile">
        <div className="modalhead">
          <h2>Discard pile · {discard.length} cards</h2>
          <button className="quiet" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="muted">
          Newest first. These are the cards currently in the discard pile.
        </p>

        <label className="discard-search">
          Find a card
          <input
            type="search"
            placeholder="Search card names or types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="discard-browser">
          {filtered.map((c, i) => {
            const def = getCardDef(c);
            return (
              <article key={c.id || i} className="discard-entry">
                <img src={getCardArt(c)} alt={def.name} />
                <strong>{def.name}</strong>
                <span>{def.value}M · {def.type}</span>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 && <p>No matching cards.</p>}
      </section>
    </div>
  );
};

// 11. Bank Viewer Modal
export const BankViewerModal: React.FC<{
  title: string;
  bank: CardInstance[];
  onClose: () => void;
}> = ({ title, bank, onClose }) => (
  <div className="overlay">
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modalhead">
        <h2>{title}</h2>
        <button className="quiet" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="muted">
        Banked action cards count as money only and cannot use their action effects.
      </p>
      <div className="row">
        {bank.length > 0 ? (
          bank.map((c) => {
            const def = getCardDef(c);
            return (
              <div key={c.id} style={{ width: '90px' }} className="card">
                <img src={getCardArt(c)} alt={def.name} />
              </div>
            );
          })
        ) : (
          <p>Empty bank</p>
        )}
      </div>
    </section>
  </div>
);

// 12. Opponent Field Viewer Modal
export const OpponentFieldViewerModal: React.FC<{
  playerIndex: number;
  state: GameState;
  onClose: () => void;
  onViewBank: (idx: number) => void;
}> = ({ playerIndex, state, onClose, onViewBank }) => {
  const p = state.players[playerIndex];
  if (!p) return null;

  const bankTotal = p.bank.reduce((sum, c) => sum + getCardDef(c).value, 0);

  return (
    <div className="overlay">
      <section className="modal" role="dialog" aria-modal="true" aria-label={`${p.name}’s field`}>
        <div className="modalhead">
          <h2>{p.name}’s field</h2>
          <button className="quiet" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="row" style={{ marginBottom: '12px' }}>
          <span className="badge gold">{bankTotal}M bank</span>
          <span className="badge">{p.hand.length} hidden hand cards</span>
          {p.defending && <span className="defense">DEFENDING</span>}
        </div>
        <div className="row">
          {p.groups.map((g) => (
            <div key={g.id} className="group" style={{ '--c': COLORS[g.color]?.hex } as React.CSSProperties}>
              <div className="grouphead">
                <span>{g.color}</span>
              </div>
              <div className="groupcards">
                {g.cards.map((c) => (
                  <div key={c.id} className="card" style={{ width: '60px' }}>
                    <img className={isCardInverted(c,g.color)?'inverted':''} src={getCardArt(c)} alt={getCardDef(c).name} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="quiet" style={{ marginTop: '15px' }} onClick={() => onViewBank(playerIndex)}>
          View bank
        </button>
      </section>
    </div>
  );
};
