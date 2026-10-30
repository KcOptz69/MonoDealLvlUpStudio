import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, CardInstance, OnlineRoomView } from './types';
import { Game, DECK, getCardDef } from './engineBridge';
import { isSoundEnabled, setSoundEnabled, playSound } from './audio';
import { setMusicScene, setMusicEnabled, musicEnabled } from './music';
import { MainMenu } from './components/MainMenu';
import { OnlineLobby } from './components/OnlineLobby';
import { TopBar } from './components/TopBar';
import { OpponentField } from './components/OpponentField';
import { SharedBoard } from './components/SharedBoard';
import { PlayerZone } from './components/PlayerZone';
import { SidebarRail } from './components/SidebarRail';
import { TargetingWizard } from './components/TargetingWizard';
import { RearrangeModal } from './components/RearrangeModal';
import {
  RulesModal,
  AuditModal,
  SettingsModal,
  WinnerModal,
  DoubleRentModal,
  EndTurnModal,
  ReactionModal,
  PaymentModal,
  DiscardModal,
  DiscardBrowserModal,
  BankViewerModal,
  OpponentFieldViewerModal,
} from './components/Modals';

type ViewMode = 'menu' | 'lobby' | 'game';

export const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('lobby');
  const [game, setGame] = useState<any>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Online multiplayer state
  const [onlineSession, setOnlineSession] = useState<{ code: string; token: string } | null>(null);
  const [onlineView, setOnlineView] = useState<OnlineRoomView | null>(null);
  const [onlineLoading, setOnlineLoading] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Selected card & previews
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<number>(0);

  // Board play display
  const [boardPlay, setBoardPlay] = useState<{
    owner: number;
    actor: string;
    card: CardInstance;
    mode: string;
    color?: string;
    target?: string | null;
    extra?: CardInstance | null;
  } | null>(null);

  // Modals state
  const [showRules, setShowRules] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRearrange, setShowRearrange] = useState(false);
  const [showDiscardBrowser, setShowDiscardBrowser] = useState(false);
  const [bankViewerData, setBankViewerData] = useState<{ title: string; bank: CardInstance[] } | null>(null);
  const [opponentViewerIdx, setOpponentViewerIdx] = useState<number | null>(null);
  const [wizardCard, setWizardCard] = useState<CardInstance | null>(null);
  const [doubleRentPending, setDoubleRentPending] = useState<any | null>(null);
  const [endTurnPendingLeft, setEndTurnPendingLeft] = useState<number | null>(null);

  // Settings
  const [musicOn, setMusicOn] = useState(musicEnabled);
  const [sound, setSound] = useState(isSoundEnabled());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem('deal_reduced') === 'true';
    } catch {
      return false;
    }
  });

  // Toasts and notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [turnAnnouncement, setTurnAnnouncement] = useState<string | null>(null);
  const lastAnnouncedTurnRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Save game helper
  const saveLocalGame = useCallback((g: any) => {
    if (g && !onlineSession) {
      try {
        localStorage.setItem('kaze_deal_save', JSON.stringify(g.s));
      } catch {}
    }
  }, [onlineSession]);

  const hasResume = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('kaze_deal_save') || 'null');
      return s?.version === 1 && s.players?.length >= 2;
    } catch {
      return false;
    }
  })();

  const hasLastOnlineSession = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('kaze_online_session') || 'null');
      return !!s?.code && !!s?.token;
    } catch {
      return false;
    }
  })();

  // Synchronize state from Game instance
  const refreshGameState = useCallback((g: any) => {
    if (!g) return;
    const s = { ...g.s };
    // clone to force React update
    setGameState(JSON.parse(JSON.stringify(s)));

    // Turn announcement
    const turnKey = g.isSetup()
      ? 'setup'
      : `${s.round}:${s.turn}:${s.phase}`;
    if (s.winner === null && lastAnnouncedTurnRef.current !== turnKey) {
      lastAnnouncedTurnRef.current = turnKey;
      const text = g.isSetup()
        ? 'SETUP'
        : s.turn === 0
        ? 'YOUR TURN'
        : `${s.players[s.turn]?.name.toUpperCase()}’S TURN`;
      setTurnAnnouncement(text);
      setTimeout(() => setTurnAnnouncement(null), 1600);
    }
  }, []);

  // Start new local game
  const handleStartLocal = (botCount: number) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setOnlineSession(null);
    setOnlineView(null);

    const g = new Game(DECK, botCount + 1);
    setGame(g);
    setSelectedCard(null);
    setBoardPlay(null);
    lastAnnouncedTurnRef.current = '';
    setView('game');
    refreshGameState(g);
    saveLocalGame(g);
    showToast(`First player (random): ${g.p(g.s.turn).name}`);
    playSound('play');
  };

  // Resume local game
  const handleResume = () => {
    try {
      const s = JSON.parse(localStorage.getItem('kaze_deal_save') || 'null');
      if (!s) return;
      const g = Object.create(Game.prototype);
      g.defs = DECK;
      g.random = Math.random;
      g.s = s;
      if (!s.phase) s.phase = 'play';
      g.migrateSetup();

      setGame(g);
      setSelectedCard(null);
      setBoardPlay(null);
      lastAnnouncedTurnRef.current = '';
      setView('game');
      refreshGameState(g);
      showToast('Game resumed.');
    } catch {
      showToast('Saved game could not be loaded.');
    }
  };

  // Bot AI scheduler for local game
  const botTimerRef = useRef<any>(null);

  useEffect(() => {
    if (view !== 'game' || !game || onlineSession || gameState?.winner !== null) {
      clearTimeout(botTimerRef.current);
      return;
    }

    const g = game;
    let actorIndex = -1;

    if (g.isSetup()) {
      const bots = g.s.players
        .map((p: any, j: number) => (j > 0 && !p.setupDone ? j : null))
        .filter((j: any) => j !== null);
      if (bots.length > 0) {
        actorIndex = bots[0];
      }
    } else {
      actorIndex = g.s.pending ? g.s.pending.responder : g.s.turn;
    }

    // Only bot plays if actor is not human (0)
    if (actorIndex <= 0) return;

    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      try {
        const plan = g.bot(actorIndex, true);
        if (plan) {
          const card = g.p(actorIndex).hand.find((c: any) => c.id === plan.id);
          if (card) {
            setBoardPlay({
              owner: actorIndex,
              actor: g.p(actorIndex).name,
              card: { ...card },
              mode: plan.response ? 'response' : plan.mode,
              color: plan.args?.color,
              target: Number.isInteger(plan.args?.target)
                ? g.p(plan.args.target).name
                : null,
            });
          }
          playSound('play');

          botTimerRef.current = setTimeout(() => {
            try {
              if (plan.response) {
                g.respond(actorIndex, true);
                playSound('negate');
              } else {
                g.play(actorIndex, plan.id, plan.mode, plan.args);
                playSound(plan.mode === 'bank' ? 'bank' : 'play');
              }
              refreshGameState(g);
              saveLocalGame(g);
            } catch (err: any) {
              console.error(err);
            }
          }, 1800);
        } else {
          botTimerRef.current = setTimeout(() => {
            try {
              g.bot(actorIndex);
              refreshGameState(g);
              saveLocalGame(g);
            } catch (err: any) {
              console.error(err);
            }
          }, 1800);
        }
      } catch (err: any) {
        console.error(err);
      }
    }, 1200);

    return () => clearTimeout(botTimerRef.current);
  }, [view, game, gameState, onlineSession, refreshGameState, saveLocalGame]);

  // Online Room API calls
  const roomRequest = async (payload: any) => {
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Room request failed.');
    }
    return data;
  };

  const connectOnlineStream = (session: { code: string; token: string }) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const params = new URLSearchParams(session);
    const es = new EventSource(`/api/events?${params}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const v: OnlineRoomView = JSON.parse(e.data);
        setOnlineView(v);
        if (v.started && v.state) {
          setGameState(v.state);
          setView('game');
          if (v.reveal?.card) {
            setBoardPlay({
              owner: v.reveal.actor,
              actor: v.state.players[v.reveal.actor]?.name || 'Player',
              card: v.reveal.card,
              mode: v.reveal.mode,
              color: v.reveal.color,
            });
          }
        } else {
          setView('lobby');
        }
      } catch (err) {
        console.error(err);
      }
    };

    es.onerror = () => {
      showToast('Connection interrupted. Reconnecting…');
    };
  };

  const handleCreateRoom = async (name: string) => {
    setOnlineLoading(true);
    try {
      const res = await roomRequest({ cmd: 'create', name });
      const session = { code: res.code, token: res.token };
      setOnlineSession(session);
      try {
        localStorage.setItem('kaze_online_session', JSON.stringify(session));
      } catch {}
      connectOnlineStream(session);
      setView('lobby');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleJoinRoom = async (name: string, code: string) => {
    setOnlineLoading(true);
    try {
      const res = await roomRequest({ cmd: 'join', name, code });
      const session = { code: res.code, token: res.token };
      setOnlineSession(session);
      try {
        localStorage.setItem('kaze_online_session', JSON.stringify(session));
      } catch {}
      connectOnlineStream(session);
      setView('lobby');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleReconnectRoom = async () => {
    try {
      const last = JSON.parse(localStorage.getItem('kaze_online_session') || '{}');
      if (!last?.code || !last?.token) return;
      setOnlineLoading(true);
      await roomRequest({ ...last, cmd: 'state' });
      setOnlineSession(last);
      connectOnlineStream(last);
      setView('lobby');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleToggleReady = async (ready: boolean) => {
    if (!onlineSession) return;
    try {
      await roomRequest({ ...onlineSession, cmd: 'ready', data: { ready } });
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleAddBot = async (slot: number) => {
    if (!onlineSession) return;
    try {
      await roomRequest({ ...onlineSession, cmd: 'bot', data: { slot } });
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRemoveBot = async (slot: number) => {
    if (!onlineSession) return;
    try {
      await roomRequest({ ...onlineSession, cmd: 'bot', data: { slot } });
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleStartOnlineGame = async () => {
    if (!onlineSession) return;
    try {
      await roomRequest({ ...onlineSession, cmd: 'start' });
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    // Lobby leaves release the slot; in-game exits reserve the seat and token.
    if (onlineSession && !onlineView?.started) {
      try { await roomRequest({...onlineSession, cmd:'leave'}); localStorage.removeItem('kaze_online_session'); }
      catch(err:any) { showToast(err.message); return; }
    }
    eventSourceRef.current?.close(); eventSourceRef.current=null;
    setOnlineSession(null); setOnlineView(null); setGameState(null); setView('lobby');
  };

  // Remote action runner for online game
  const remoteAction = async (method: string, args: any[]) => {
    if (!onlineSession) return;
    try {
      await roomRequest({
        ...onlineSession,
        cmd: 'action',
        data: { method, args },
      });
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Human actions (Local or Remote)
  const handleBankCard = (cardId: string) => {
    if (onlineSession) {
      remoteAction('play', [cardId, 'bank', {}]);
      setSelectedCard(null);
      playSound('bank');
      return;
    }
    try {
      const c = game.p(0).hand.find((x: any) => x.id === cardId);
      game.play(0, cardId, 'bank');
      playSound('bank');
      if (c) {
        setBoardPlay({
          owner: 0,
          actor: game.p(0).name,
          card: { ...c },
          mode: 'bank',
        });
      }
      setSelectedCard(null);
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handlePlayCard = (cardId: string) => {
    const card = (onlineSession ? gameState?.players[0]?.hand : game?.p(0)?.hand)?.find(
      (c: any) => c.id === cardId
    );
    if (!card) return;
    const def = getCardDef(card);

    // If card needs no wizard (Pass Go, It's My Birthday, Specials, or single-color Property)
    const isSingleColorProp =
      ['property', 'wild'].includes(def.type) &&
      (card.locked || (def.colors && def.colors.length === 1));

    if (
      def.type === 'special' ||
      ['pass_go', 'its_my_birthday'].includes(card.key) ||
      isSingleColorProp
    ) {
      executePlay(cardId, {
        id: cardId,
        color: card.locked || def.colors?.[0],
      });
      return;
    }

    // Otherwise open targeting wizard
    setWizardCard(card);
  };

  const executePlay = (cardId: string, args: any) => {
    const hand = onlineSession ? gameState?.players[0]?.hand : game?.p(0)?.hand;
    const candidate = hand?.find((c: any) => c.id === cardId);
    const def = candidate ? getCardDef(candidate) : null;

    // Check Double the Rent possibility
    const hasDoubleCard = hand?.find((c: any) => c.key === 'double_the_rent');
    const usedActions = onlineSession
      ? gameState?.phase === 'setup'
        ? gameState.players[0].setupPlayed || 0
        : gameState?.played || 0
      : game?.used(0);
    const limit = onlineSession
      ? gameState?.phase === 'setup'
        ? 3
        : 3
      : game?.limit(0);

    if (
      def?.type === 'rent' &&
      hasDoubleCard &&
      usedActions + 2 <= limit &&
      !args.doubleAsked
    ) {
      setDoubleRentPending({ cardId, args });
      return;
    }

    if (onlineSession) {
      const a = { ...args };
      remoteAction('play', [cardId, 'play', a]);
      setSelectedCard(null);
      setWizardCard(null);
      playSound('play');
      return;
    }

    try {
      const c = game.p(0).hand.find((x: any) => x.id === cardId);
      game.play(0, cardId, 'play', args);
      playSound(def?.type === 'rent' ? 'charge' : 'play');
      if (c) {
        setBoardPlay({
          owner: 0,
          actor: game.p(0).name,
          card: { ...c },
          mode: 'play',
          color: args.color,
          target: Number.isInteger(args.target) ? game.p(args.target).name : null,
          extra: args.doubleId ? { id: 'dtr', key: 'double_the_rent' } : null,
        });
      }
      setSelectedCard(null);
      setWizardCard(null);
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleDoubleRentConfirm = (useDouble: boolean) => {
    if (!doubleRentPending) return;
    const { cardId, args } = doubleRentPending;
    const hand = onlineSession ? gameState?.players[0]?.hand : game?.p(0)?.hand;
    const doubleCard = hand?.find((c: any) => c.key === 'double_the_rent');

    const nextArgs = {
      ...args,
      doubleAsked: true,
      doubleId: useDouble && doubleCard ? doubleCard.id : undefined,
    };
    setDoubleRentPending(null);
    executePlay(cardId, nextArgs);
  };

  const handleEndTurn = () => {
    if (onlineSession) {
      remoteAction('end', [false]);
      return;
    }
    if (game.isSetup()) {
      try {
        game.end(0, false);
        refreshGameState(game);
        saveLocalGame(game);
      } catch (err: any) {
        showToast(err.message);
      }
      return;
    }

    const left = Math.max(0, game.limit(0) - game.s.played);
    if (left > 0) {
      setEndTurnPendingLeft(left);
    } else {
      try {
        game.end(0, false);
        setSelectedCard(null);
        refreshGameState(game);
        saveLocalGame(game);
      } catch (err: any) {
        showToast(err.message);
      }
    }
  };

  const handleConfirmEndTurnWithDraw = (draw: boolean) => {
    setEndTurnPendingLeft(null);
    if (onlineSession) {
      remoteAction('end', [draw]);
      return;
    }
    try {
      game.end(0, draw);
      setSelectedCard(null);
      refreshGameState(game);
      saveLocalGame(game);
      if (draw) playSound('draw');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRespond = (useJustSayNo: boolean) => {
    if (onlineSession) {
      remoteAction('respond', [useJustSayNo]);
      playSound(useJustSayNo ? 'negate' : 'play');
      return;
    }
    try {
      const c = useJustSayNo ? game.p(0).hand.find((x: any) => x.key === 'just_say_no') : null;
      game.respond(0, useJustSayNo);
      playSound(useJustSayNo ? 'negate' : 'play');
      if (c) {
        setBoardPlay({
          owner: 0,
          actor: game.p(0).name,
          card: { ...c },
          mode: 'response',
        });
      }
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handlePay = (selectedIds: string[]) => {
    if (onlineSession) {
      remoteAction('pay', [selectedIds]);
      playSound('payment');
      return;
    }
    try {
      game.pay(0, selectedIds);
      playSound('payment');
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleOfferIOU = (cardId: string) => {
    if (onlineSession) {
      remoteAction('owe', [cardId]);
      playSound('payment');
      return;
    }
    try {
      game.owe(0, cardId);
      playSound('payment');
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleDiscard = (selectedIds: string[]) => {
    if (onlineSession) {
      remoteAction('discard', [selectedIds]);
      return;
    }
    try {
      game.discard(0, selectedIds);
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleMoveProperty = (cardId: string, color: string, groupId?: string) => {
    if (onlineSession) {
      remoteAction('move', [cardId, color, groupId]);
      return;
    }
    try {
      game.move(0, cardId, color, groupId);
      showToast('Property moved.');
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleMoveBuilding = (fromGroupId: string, toGroupId: string, buildingType: 'house' | 'hotel') => {
    if (onlineSession) {
      remoteAction('moveBuilding', [fromGroupId, toGroupId, buildingType]);
      return;
    }
    try {
      game.moveBuilding(0, fromGroupId, toGroupId, buildingType);
      showToast('Building moved.');
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleApplySettings = (newSound: boolean, newReduced: boolean) => {
    setSound(newSound);
    setSoundEnabled(newSound);
    setReducedMotion(newReduced);
    try {
      localStorage.setItem('deal_reduced', newReduced ? 'true' : 'false');
    } catch {}
    document.documentElement.classList.toggle('reduce', newReduced);
    setShowSettings(false);
  };

  useEffect(() => {
    // Same browser/device retains its private seat token across reloads and exits.
    const invited=new URLSearchParams(window.location.search).get('room');
    try { const saved=JSON.parse(localStorage.getItem('kaze_online_session')||'null');
      if(saved?.token && (!invited || invited.toUpperCase()===saved.code)) handleReconnectRoom();
    } catch {}
    return () => { eventSourceRef.current?.close(); };
  }, []);
  const defendingMusic = view==='game' && gameState?.winner===null && gameState?.players.some(p=>p.defending);
  useEffect(() => { setMusicScene(view==='game' ? (defendingMusic?'defending':'game') : 'menu'); }, [view,defendingMusic]);

  return (
    <>
      <button className="quiet" style={{position:'fixed',right:12,bottom:12,zIndex:1500,background:'#133c3e'}} aria-pressed={musicOn} onClick={()=>{const enabled=!musicOn;setMusicOn(enabled);setMusicEnabled(enabled);}}>{musicOn?'♫ Music on':'♫ Music off'}</button>

      {/* Toast popup */}
      {toastMessage && (
        <div id="notifications" aria-live="polite">
          <div className="toast">{toastMessage}</div>
        </div>
      )}

      {/* Turn Announcement Banner */}
      {turnAnnouncement && (
        <div className="your-turn-notice" role="status">
          <div>
            <span>{turnAnnouncement}</span>
            <small>
              {turnAnnouncement === 'SETUP'
                ? 'Everyone sets up together · 3 actions each'
                : turnAnnouncement === 'YOUR TURN'
                ? 'Build your empire'
                : 'Opponent is playing'}
            </small>
          </div>
        </div>
      )}

      {/* Main Menu View */}
      {view === 'menu' && (
        <MainMenu
          onStartLocal={handleStartLocal}
          onOpenOnline={() => setView('lobby')}
          onResume={handleResume}
          hasResume={hasResume}
          onOpenRules={() => setShowRules(true)}
          onOpenAudit={() => setShowAudit(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Online Lobby View */}
      {view === 'lobby' && (
        <OnlineLobby
          roomView={onlineView}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onReconnectRoom={handleReconnectRoom}
          hasLastSession={hasLastOnlineSession}
          onToggleReady={handleToggleReady}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
          onStartGame={handleStartOnlineGame}
          onLeaveRoom={handleLeaveRoom}
          onBackToMenu={() => setView('menu')}
          loading={onlineLoading}
        />
      )}

      {/* Active Game Table View */}
      {view === 'game' && gameState && (
        <div className="app">
          <TopBar
            state={gameState}
            isOnline={!!onlineSession}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMenu={() => onlineSession ? handleLeaveRoom() : setView('lobby')}
          />

          <div className="game">
            <main className="table">
      {view==='game' && onlineView && <div role="status" style={{display:'flex',gap:16,flexWrap:'wrap',padding:'6px 12px',background:'#133c3e',color:'#fff'}}>{onlineView.seats.filter(Boolean).map((seat,i)=><span key={i}>{seat!.name}: {!seat!.connected?'Disconnected · seat reserved':seat!.status || 'Waiting'}</span>)}<button className="quiet" onClick={handleLeaveRoom}>Exit · keep seat</button></div>}
              {/* Opponents fields */}
              <OpponentField
                state={gameState}
                onSelectCard={(c, owner) => {
                  setSelectedCard(c);
                  setSelectedOwner(owner);
                }}
                onViewBank={(idx) => {
                  const p = gameState.players[idx];
                  if (p) {
                    setBankViewerData({
                      title: `${p.name}’s bank · ${p.bank.reduce(
                        (s, c) => s + getCardDef(c).value,
                        0
                      )}M`,
                      bank: p.bank,
                    });
                  }
                }}
                onViewPlayer={(idx) => setOpponentViewerIdx(idx)}
                selectedCardId={selectedCard?.id}
              />

              {/* Center shared board (draw, discard, played card, payment activity) */}
              <SharedBoard
                state={gameState}
                boardPlay={boardPlay}
                onSelectCard={(c, owner = 0) => {
                  setSelectedCard(c);
                  setSelectedOwner(owner);
                }}
                onBrowseDiscard={() => setShowDiscardBrowser(true)}
              />

              {/* Player zone: your field, bank, hand & turn controls */}
              <PlayerZone
                state={gameState}
                selectedCard={selectedCard}
                onSelectCard={(c) => {
                  setSelectedCard(c);
                  setSelectedOwner(0);
                }}
                onPlaySelected={handlePlayCard}
                onBankSelected={handleBankCard}
                onEndTurn={handleEndTurn}
                onViewBank={(idx) => {
                  const p = gameState.players[idx];
                  if (p) {
                    setBankViewerData({
                      title: `Your bank · ${p.bank.reduce(
                        (s, c) => s + getCardDef(c).value,
                        0
                      )}M`,
                      bank: p.bank,
                    });
                  }
                }}
                onRearrange={() => setShowRearrange(true)}
                onDropPropertyToGroup={(cardId, color, gid) =>
                  handleMoveProperty(cardId, color, gid)
                }
              />
            </main>

            {/* Right sidebar rail: card preview & event log */}
            <SidebarRail
              selectedCard={selectedCard}
              selectedOwner={selectedOwner}
              state={gameState}
            />
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showAudit && <AuditModal onClose={() => setShowAudit(false)} />}
      {showSettings && (
        <SettingsModal
          soundEnabled={sound}
          reducedMotion={reducedMotion}
          onApply={handleApplySettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showRearrange && gameState && (
        <RearrangeModal
          state={gameState}
          onMoveProperty={handleMoveProperty}
          onMoveBuilding={handleMoveBuilding}
          onClose={() => setShowRearrange(false)}
        />
      )}
      {showDiscardBrowser && gameState && (
        <DiscardBrowserModal
          discard={gameState.discard}
          onClose={() => setShowDiscardBrowser(false)}
        />
      )}
      {bankViewerData && (
        <BankViewerModal
          title={bankViewerData.title}
          bank={bankViewerData.bank}
          onClose={() => setBankViewerData(null)}
        />
      )}
      {opponentViewerIdx !== null && gameState && (
        <OpponentFieldViewerModal
          playerIndex={opponentViewerIdx}
          state={gameState}
          onClose={() => setOpponentViewerIdx(null)}
          onViewBank={(idx) => {
            const p = gameState.players[idx];
            if (p) {
              setBankViewerData({
                title: `${p.name}’s bank · ${p.bank.reduce(
                  (s, c) => s + getCardDef(c).value,
                  0
                )}M`,
                bank: p.bank,
              });
            }
          }}
        />
      )}

      {/* Interactive Action Wizard Modal */}
      {wizardCard && gameState && (
        <TargetingWizard
          card={wizardCard}
          state={gameState}
          onConfirm={(args) => executePlay(wizardCard.id, args)}
          onCancel={() => setWizardCard(null)}
        />
      )}

      {/* Double Rent Prompt */}
      {doubleRentPending && (
        <DoubleRentModal onConfirm={handleDoubleRentConfirm} />
      )}

      {/* End Turn with Unused Actions prompt */}
      {endTurnPendingLeft !== null && (
        <EndTurnModal
          actionsLeft={endTurnPendingLeft}
          onConfirm={handleConfirmEndTurnWithDraw}
          onCancel={() => setEndTurnPendingLeft(null)}
        />
      )}

      {/* Reaction (Just Say No) Modal */}
      {gameState?.pending &&
        gameState.pending.responder === 0 &&
        gameState.pending.kind === 'counter' && (
          <ReactionModal
            pending={gameState.pending}
            state={gameState}
            onRespond={handleRespond}
          />
        )}

      {/* Payment Selection Modal */}
      {gameState?.pending &&
        gameState.pending.responder === 0 &&
        gameState.pending.kind === 'payment' && (
          <PaymentModal
            pending={gameState.pending}
            state={gameState}
            onPay={handlePay}
            onOfferIOU={handleOfferIOU}
          />
        )}

      {/* Hand Limit Discard Modal */}
      {gameState?.pending &&
        gameState.pending.responder === 0 &&
        gameState.pending.kind === 'discard' && (
          <DiscardModal
            hand={gameState.players[0].hand}
            handLimit={
              gameState.players[0].special.some((c) => c.key === 'private_vault')
                ? 9
                : 7
            }
            onDiscard={handleDiscard}
          />
        )}

      {/* Winner Celebration Modal */}
      {gameState && gameState.winner !== null && (
        <WinnerModal
          winner={gameState.winner}
          winnerName={gameState.players[gameState.winner]?.name || 'Player'}
          round={gameState.round}
          logCount={gameState.log.length}
          onMenu={() => setView('menu')}
        />
      )}
    </>
  );
};
