import React, { useEffect, useRef } from 'react';
import '../turn-plays.css';
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
  preview?: boolean;
}

interface SharedBoardProps {
  state: GameState;
  boardPlay: PlayedCardInfo | null;
  onSelectCard: (card: CardInstance, owner?: number) => void;
  onBrowseDiscard: () => void;
}

function BankedStamp() {
  return <span className="banked-card-stamp"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M1 5 8 1l7 4H1ZM2 7v6m4-6v6m4-6v6m4-6v6M1 15h14M1 13h14"/></svg>BANKED</span>;
}
function TurnPlayedCards({state,upcoming,onSelectCard}:{state:GameState;upcoming:PlayedCardInfo|null;onSelectCard:SharedBoardProps['onSelectCard']}) {
  const plays=(state.events||[]).filter(e=>e.turnId===(state.turnSerial||0)&&e.card&&!e.passive&&['bank','property','play'].includes(e.type));
  const preview=upcoming?.preview&&upcoming.card.key!=='just_say_no'&&!plays.some(e=>e.card?.id===upcoming.card.id)?upcoming:null;
  const strip=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(strip.current)strip.current.scrollLeft=strip.current.scrollWidth;},[plays.at(-1)?.seq,preview?.card.id]);
  if(state.pending?.kind==='chance')return <div className="chance-board-reveal"><strong>{state.players[state.pending.responder].name} · Chance</strong><div>{state.pending.cards?.map(c=><img key={c.id} src={getCardArt(c)} alt={getCardDef(c).name}/>)}</div></div>;
  if(!plays.length&&!preview)return <div className="turn-plays-empty"><strong>{state.players[state.turn]?.name === 'You' ? 'Your turn' : state.players[state.turn]?.name+"’s turn"}</strong><span>Cards played this turn appear here</span></div>;
  return <div className="turn-play-strip" ref={strip}>{plays.map((e)=>{
    const nope=(state.events||[]).filter(n=>n.type==='negate'&&n.targetPlaySeq===e.seq).at(-1);
    return <article className="turn-play-entry" key={e.seq}><button title={getCardDef(e.card!).name} onClick={()=>onSelectCard(e.card!,e.actor)}><img src={getCardArt(e.card!,e.color)} alt={getCardDef(e.card!).name}/>{e.type==='bank'&&<BankedStamp/>}{e.type==='play'&&(e.targetAll||Number.isInteger(e.target))&&<span className="card-target-badge" title={e.targetAll?'All opponents':state.players[e.target!]?.name}>→ {e.targetAll?'All opponents':state.players[e.target!]?.name}</span>}{nope&&<span className={'negated-card-stamp'+(!nope.blocked?' restored':'')}><b>{nope.blocked?'⊘ NOPED':'✓ RESTORED'}</b><small>by {state.players[nope.actor]?.name}</small></span>}</button></article>;
  })}{preview&&<article className="turn-play-entry upcoming"><button onClick={()=>onSelectCard(preview.card,preview.owner)}><img src={getCardArt(preview.card,preview.color)} alt={getCardDef(preview.card).name}/>{preview.mode==='bank'&&<BankedStamp/>}{preview.mode!=='bank'&&(()=>{const def=getCardDef(preview.card);const all=(def.type==='rent'&&!def.any)||['its_my_birthday','luxury_tax'].includes(preview.card.key);return (all||preview.target)&&<span className="card-target-badge" title={all?'All opponents':preview.target||''}>→ {all?'All opponents':preview.target}</span>;})()}</button></article>}</div>;
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
    .filter((e) => ['payment', 'discard', 'transfer','donation'].includes(e.type))
    .slice(-1)
    .reverse();

  return (
    <section className="shared-board" aria-label="Shared board">
      {/* Draw and discard piles */}
      <section className="pile-panel" aria-label="Draw and discard piles">
        <div className="board-pile draw-zone">
          <div className="pile-card-frame draw-card-back"><img src={STATIC_ART.card_back} alt="Card back" draggable={false}/></div>
          <strong className="draw-pile-count">Draw · {state.deck.length}</strong>
        </div>

        <button
          type="button"
          className="board-pile discard-zone"
          onClick={onBrowseDiscard}
          aria-label={`Browse discard pile, ${state.discard.length} cards`}
        >
          <div className="pile-card-frame discard-card-face">{lastDiscard?<img src={getCardArt(lastDiscard)} alt={`Top discard: ${getCardDef(lastDiscard).name}`} draggable={false}/>:<div className="empty-discard">EMPTY</div>}</div>
          <strong className="discard-pile-count">Discard · {state.discard.length}</strong>
        </button>
      </section>

      {/* Played card panel */}
      <section className="played-panel" aria-label="Played card">
        <h3>{state.phase === 'setup' ? 'Played card' : `Cards this turn · ${state.players[state.turn]?.name}`}</h3>
        <div className="board-play" id="boardPlay" aria-live="polite">
          {state.phase!=='setup'?<TurnPlayedCards state={state} upcoming={boardPlay} onSelectCard={onSelectCard}/>:<div className="table-play-empty">SIMULTANEOUS SETUP<span>Cards stay hidden until everyone is ready</span></div>}

        </div>
      </section>

      {/* Payment Activity */}
      <aside className="board-side" id="boardSide" aria-live="polite">
        <div className="payment-activity-heading"><h3>Payment activity</h3>{recentPaymentEvents[0]&&(()=>{const e=recentPaymentEvents[0];const actor=state.players[e.actor]?.name||'Player';const target=e.target==null?'discard':e.target===0?'you':state.players[e.target]?.name||'Player';const summary=`${actor} ${e.type==='discard'?'discarded':`→ ${target}`}${e.amount!==undefined?` · ${e.amount}M`:''}`;return <span title={summary}>{summary}</span>;})()}</div>
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
                  <b title={title}>{title}{e.amount !== undefined ? ` · ${e.amount}M` : ''}</b>
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
