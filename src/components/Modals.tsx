import {Deadline,useServerNow} from './OnlineClock';
import {suggestPayment} from '../paymentSuggestion';
import {FieldView} from './FieldView';
import {PlayerToken} from './PlayerToken';
import '../victory.css';
import { isCardInverted } from '../cardOrientation';
import React, { useState, useEffect,useRef } from 'react';
import {createPortal} from 'react-dom';
import '../payment-layout.css';
import '../selection-prompts.css';
import '../rules.css';
import { CardInstance, GameState, PropertyGroup } from '../types';
import { getCardDef, COLORS, DECK } from '../engineBridge';
import { getCardArt, STATIC_ART } from '../cardArt';

// 1. Rules Modal
export const RulesModal: React.FC<{ onClose: () => void }> = ({onClose}) => {
  const [tab,setTab]=useState<'quick'|'payments'|'extra'>('quick');
  const dialog=useRef<HTMLElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;closeButton.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
  const tabs=[{id:'quick',name:'Quick Start'},{id:'payments',name:'Payments & Reactions'},{id:'extra',name:'Extra Rules'}] as const;
  const art=(key:string,alt:string)=> <img src={getCardArt(key)} alt={alt} loading="lazy" draggable={false}/>;
  const keyDown=(event:React.KeyboardEvent)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
    if(event.key==='Tab'){
      const buttons=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled])')||[]).filter(button=>button.tabIndex>=0&&button.getClientRects().length>0);
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  };
  return <div className="overlay rules-overlay" onKeyDown={keyDown}>
    <section ref={dialog} className="modal rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <header className="rules-header"><div><span className="rules-eyebrow">MONOPOLY DEAL LVL. UP</span><h2 id="rules-title">How to play</h2></div><button ref={closeButton} className="quiet rules-close" onClick={onClose} aria-label="Close rules">×</button></header>
      <nav className="rules-tabs" role="tablist" aria-label="Rules sections" onKeyDown={event=>{
        const index=tabs.findIndex(item=>item.id===tab);let next=index;
        if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
        event.preventDefault();setTab(tabs[next].id);dialog.current?.querySelector<HTMLButtonElement>('#rules-tab-'+tabs[next].id)?.focus();
      }}>{tabs.map(item=><button key={item.id} type="button" role="tab" id={'rules-tab-'+item.id} aria-controls={'rules-panel-'+item.id} aria-selected={tab===item.id} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)}>{item.name}</button>)}</nav>
      <div className="rules-body">
        <div id="rules-panel-quick" role="tabpanel" aria-labelledby="rules-tab-quick" hidden={tab!=='quick'}>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-hand-spread">{Array.from({length:7},(_,i)=><img key={i} src={STATIC_ART.card_back} alt={i===0?'Seven starting cards':''} draggable={false} style={{transform:`rotate(${(i-3)*4}deg) translateY(${Math.abs(i-3)*2}px)`}}/>)}</div><figcaption>7 CARDS · 3 ACTIONS</figcaption></figure><div className="rules-copy"><h3><span className="rules-step-number">1</span>Set up together</h3><p>Start with <strong>7 cards</strong>. Everyone gets <strong>3 actions</strong> to bank cards or place properties. Press <strong>Ready</strong> when finished.</p></div></article>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-card-examples"><span>{art('money_5m','5M money card')}<small>Bank</small></span><span>{art('mediterranean_avenue','Mediterranean Avenue property')}<small>Property</small></span><span>{art('pass_go','Pass Go action card')}<small>Action</small></span></div></figure><div className="rules-copy"><h3><span className="rules-step-number">2</span>Take your turn</h3><p>Draw <strong>2 cards</strong>, or <strong>5 if your hand starts empty</strong>. Use up to <strong>3 actions</strong> to:</p><ul><li>Bank money or action cards.</li><li>Place properties.</li><li>Play action cards.</li></ul><p>When ending your turn, you may draw <strong>1 card per unused action</strong>. Finish with <strong>7 cards or fewer</strong>. Special cards can change these limits.</p></div></article>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-complete-sets">{[{color:'Brown',keys:['mediterranean_avenue','baltic_avenue']},{color:'Dark Blue',keys:['park_place','boardwalk']},{color:'Utility',keys:['electric_company','water_works']}].map(set=><div key={set.color} className="rules-mini-set" style={{'--set-color':COLORS[set.color].hex} as React.CSSProperties} aria-label={'Complete '+set.color+' set'}><div>{set.keys.map(key=><img key={key} src={getCardArt(key)} alt={getCardDef(key).name} loading="lazy" draggable={false}/>)}</div><b aria-hidden="true">✓</b></div>)}</div><figcaption>3 COMPLETE SETS</figcaption></figure><div className="rules-copy"><h3><span className="rules-step-number">3</span>Build and defend</h3><p>Finish your turn with <strong>3 complete sets of different colors</strong>.</p><ul><li><strong>2–3 players:</strong> defend for one full rotation.</li><li><strong>4–5 players:</strong> defend through two opponents’ turns.</li></ul><p>Dropping below three complete sets cancels your defense.</p></div></article>
        </div>
        <div id="rules-panel-payments" role="tabpanel" aria-labelledby="rules-tab-payments" hidden={tab!=='payments'}>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-card-examples rules-payment-art"><span>{art('money_5m','Money in your bank')}</span><span>{art('park_place','Property in your field')}</span><span>{art('i_owe_you','I Owe You payment replacement card')}</span></div></figure><div className="rules-copy"><h3>Pay from your bank or field.</h3><p>Overpayments receive no change. If you cannot cover the bill, pay all eligible assets. <strong>I Owe You</strong> can replace a payment.</p></div></article>
          <article className="rules-step"><figure className="rules-illustration rules-no-art">{art('just_say_no','Just Say No reaction card')}<span className="rules-timer-badge">10s</span></figure><div className="rules-copy"><h3>Just Say No is free.</h3><p>Respond within <strong>10 seconds</strong> to block an action—or counter another No. Blocking an all-player action protects everyone.</p></div></article>
        </div>
        <div id="rules-panel-extra" role="tabpanel" aria-labelledby="rules-tab-extra" hidden={tab!=='extra'}>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-gift-art"><PlayerToken index={0}/><span aria-hidden="true">→</span><img src={STATIC_ART.card_back} alt="A private hand card gift" draggable={false}/><span aria-hidden="true">→</span><PlayerToken index={1}/></div></figure><div className="rules-copy"><h3>Free donations <span className="rules-player-badge">4–5 players</span></h3><p>While anyone is defending, give hand cards to any opponent—even outside your turn.</p></div></article>
          <article className="rules-step"><figure className="rules-illustration"><div className="rules-score-art">{art('money_10m','Bank card value')}<span className="rules-round-badge"><small>ROUND</small><b>10</b></span>{art('baltic_avenue','Field property value')}</div><figcaption>BANK + FIELD</figcaption></figure><div className="rules-copy"><h3>Optional round-10 limit</h3><p>After everyone finishes round 10, highest <strong>bank + field value</strong> wins. Hand cards do not count. Tied leaders share the win.</p></div></article>
        </div>
      </div>
    </section>
  </div>;
};

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
  fastBots?:boolean;
  canSetBotPace?:boolean;
  onApply: (sound: boolean, reduced: boolean, music: boolean, fast:boolean) => void;
  onClose: () => void;
}> = ({ musicEnabled, soundEnabled, reducedMotion, fastBots=false,canSetBotPace=true,onApply, onClose }) => {
  const [music, setMusic] = useState(musicEnabled);
  const [sound, setSound] = useState(soundEnabled);
  const [motion, setMotion] = useState(reducedMotion);
  const [fast,setFast]=useState(fastBots);

  return (
    <div className="overlay">
      <section className="modal small" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modalhead">
          <h2>Settings</h2>
          <button className="quiet" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="form">
          <label className="setting-row"><span>Fast bot pace<small>{fast?'1–2 seconds per action':'Relaxed · 3–5 seconds per action'}{!canSetBotPace?' · Host controls this':''}</small></span><span className="setting-switch"><span>{fast?'On':'Off'}</span><input type="checkbox" role="switch" checked={fast} disabled={!canSetBotPace} onChange={e=>setFast(e.target.checked)}/></span></label>
          <label className="setting-row"><span>Music</span><span className="setting-switch"><span>{music?'On':'Off'}</span><input type="checkbox" role="switch" checked={music} onChange={e=>setMusic(e.target.checked)}/></span></label>
          <label className="setting-row"><span>Sound effects</span><span className="setting-switch"><span>{sound?'On':'Off'}</span><input type="checkbox" role="switch" checked={sound} onChange={e=>setSound(e.target.checked)}/></span></label>
          <label className="setting-row"><span>Reduce motion</span><span className="setting-switch"><span>{motion?'On':'Off'}</span><input type="checkbox" role="switch" checked={motion} onChange={e=>setMotion(e.target.checked)}/></span></label>
          <small>
            Games save automatically on this browser when local storage is available. No account or
            internet connection is required.
          </small>
          <button className="gold" onClick={() => onApply(sound, motion, music,fast)}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
};

// 4. Winner celebration
export const WinnerModal: React.FC<{
 winner:number;winnerName:string;winnerToken:number;sets:PropertyGroup[];round:number;logCount:number;endReason?:string;shortDefense?:boolean;scoreResults?:{name:string;token:number;bank:number;field:number;total:number;winner:boolean}[];onMenu:()=>void|Promise<void>;
}> = ({winner,winnerName,winnerToken,sets,onMenu,endReason,shortDefense=false,scoreResults=[]}) => {
 const [leaving,setLeaving]=useState(false);
 const [error,setError]=useState('');
 const full=sets.filter(g=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0));
 const colors=[...new Map(full.map(g=>[g.color,g])).values()].slice(0,3);
 return <div className="overlay victory-overlay"><section className="modal victory-dialog" role="dialog" aria-modal="true" aria-labelledby="victory-title">
 <div className="victory-rays" aria-hidden="true"/>
 <img className="victory-logo" src={STATIC_ART.logo} alt="Monopoly Deal Lvl. Up — made by Kaze"/>
 <div className="victory-crown" aria-hidden="true">♛</div><h1 id="victory-title">{scoreResults.filter(r=>r.winner).length>1?'SHARED VICTORY!':'VICTORY!'}</h1>
 {endReason==='round-limit'?<><div className="score-winners">{scoreResults.filter(r=>r.winner).map((row,i)=><div className="victory-identity" key={i}><PlayerToken index={row.token}/><strong>{row.name}</strong></div>)}</div><p>Round 10 complete · Highest bank + field value wins</p><table className="victory-scores"><thead><tr><th>Player</th><th>Bank</th><th>Field</th><th>Total</th></tr></thead><tbody>{[...scoreResults].sort((a,b)=>b.total-a.total).map((row,i)=><tr key={i} className={row.winner?'score-winner':''}><td>{row.name}</td><td>{row.bank}M</td><td>{row.field}M</td><td>{row.total}M</td></tr>)}</tbody></table></>:<><div className="victory-identity"><PlayerToken index={winnerToken}/><div><small>WINNER</small><strong>{winnerName}</strong></div></div><p>{shortDefense?'Three complete sets. Defended through two opponents’ turns.':'Three complete sets. Defended for a full rotation.'}</p><div className="victory-sets">{colors.map(g=><div key={g.color} style={{'--set':COLORS[g.color]?.hex} as React.CSSProperties}>{g.color}<small>COMPLETE · DEFENDED</small></div>)}</div></>}
 <button className="gold victory-menu" disabled={leaving} onClick={async()=>{setLeaving(true);setError('');try{await onMenu();}catch{setError('Could not return. Please try again.');setLeaving(false);}}}>{leaving?'Returning…':'Back to Menu'}</button>
 {error&&<p role="alert">{error}</p>}
 </section></div>;
};

// 5. Double Rent Prompt Modal
export const DoubleRentModal:React.FC<{onConfirm:(count:number)=>void;maxDoubles?:number}>=({onConfirm,maxDoubles=1})=><div className="overlay"><section className="modal small compact-rent-dialog" role="dialog" aria-modal="true" aria-label="Double the Rent"><div className="rent-double"><img src={getCardArt('double_the_rent')} alt="Double the Rent"/><div><h2>Increase this rent?</h2><p>Each Double the Rent costs one additional action.</p>{Array.from({length:maxDoubles},(_,i)=>i+1).map(n=><button className="gold" key={n} onClick={()=>onConfirm(n)}>{2**n}× rent · {n+1} actions</button>)}<button className="quiet" onClick={()=>onConfirm(0)}>Normal rent · 1 action</button></div></div></section></div>;

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
  serverTime?:number;
  frozenAt?:number;
  onRespond: (useJustSayNo: boolean) => void;
}> = ({ pending, state, onRespond,serverTime,frozenAt }) => {
  const now=useServerNow(serverTime,frozenAt);
  const seconds=Math.max(0,Math.ceil(((pending.deadline||now+10000)-now)/1000));
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
  serverTime?:number;
  frozenAt?:number;
  onPay: (selectedIds: string[]) => void;
  onOfferIOU?: (cardId: string) => void;
  onSkipJail?:()=>void;
}> = ({ pending, state, onPay, onOfferIOU,onSkipJail,serverTime,frozenAt }) => {
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
    setSelectedIds(suggestPayment(items,amountOwed,e.key==='luxury_tax'));
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

  if (minimized) return createPortal(<button type="button" className="payment-restore-tab" onClick={()=>{document.dispatchEvent(new Event('deal-close-artwork'));setMinimized(false);}} aria-label={`Restore payment selection, ${selectedTotal}M selected of ${amountOwed}M owed`}><span>↗ Resume payment · {amountOwed}M</span><small>{selectedTotal}M selected</small><Deadline label="Pay" deadline={e.paymentDeadline} serverTime={serverTime} frozenAt={frozenAt}/></button>,document.body);

  return (
    <div className="overlay">
      <section className="modal payment-modal" role="dialog" aria-modal="true" aria-label="Choose payment">
        <div className="modalhead">
          <h2>Choose payment · {amountOwed}M <Deadline label="Pay" deadline={e.paymentDeadline} serverTime={serverTime} frozenAt={frozenAt}/></h2>
          <button type="button" className="quiet payment-minimize" onClick={()=>setMinimized(true)} aria-label="Minimize payment to inspect board">− Minimize</button>
        </div>

        <p>
          {e.key === 'compulsory_purchase'
            ? 'Properties only. You choose what to surrender.'
            : e.key==='jail_bail'?'Discard at least 10M to take your turn. No I Owe You.'
            : e.key === 'luxury_tax'
            ? 'Pay your bank first, then properties. Payment goes to discard.'
            : 'Choose bank cards or properties. No change is given.'}
        </p>

        <div id="selectionTotal">
          {selectedTotal}M selected / {amountOwed}M owed
        </div>

        {brokenColors.length > 0 && (
          <div className="warning">
            Payment allowed. This will break your {brokenColors.join(', ')} full set
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
                      aria-label={`${def.name} · ${x.value}M`}
                      aria-pressed={isChecked}
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
                      aria-label={`${def.name} · ${x.value}M`}
                      aria-pressed={isChecked}
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
          {!['luxury_tax','jail_bail'].includes(e.key) && onOfferIOU && iouCards.length > 0 && (
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
            {e.key==='jail_bail'&&<button className="quiet" onClick={onSkipJail}>Skip turn instead</button>}
            <button className="quiet" onClick={handleSuggest}>
              Suggest
            </button>
            <button
              className="gold"
              disabled={selectedTotal < (e.key==='jail_bail'?10:Math.min(amountOwed,totalAssets))}
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
  <div className="overlay bank-view-overlay">
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
export const OpponentFieldViewerModal:React.FC<{playerIndex:number;state:GameState;onClose:()=>void;onViewBank:(i:number)=>void}>=({playerIndex,state,onClose,onViewBank})=><FieldView state={state} index={playerIndex} onClose={onClose} onBank={onViewBank}/>;
