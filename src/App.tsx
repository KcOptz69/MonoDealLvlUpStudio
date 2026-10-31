import {setupView} from './setupPrivacy';
import timing from '../timing.json';
import {SpecialTriggerNotices} from './components/SpecialTriggerNotices';
import {getCardArt} from './cardArt';
import {BoardTarget,usesBoardTarget} from './components/BoardTarget';
import {TurnNotices} from './components/TurnNotices';
import './tabletop.css';
import {GameFeedback} from './GameFeedback';
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
import { MobilePlayerPanels } from './components/MobilePlayerPanels';
import { SidebarRail } from './components/SidebarRail';
import { useMobileLayout, MobileTableOverlays } from './MobileTable';
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
  const {mobile,portrait}=useMobileLayout();
  const PlayerArea=mobile?MobilePlayerPanels:PlayerZone;
  const [view, setView] = useState<ViewMode>('menu');
  const [game, setGame] = useState<any>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Online multiplayer state
  const [onlineSession, setOnlineSession] = useState<{ code: string; token: string } | null>(null);
  const [onlineView, setOnlineView] = useState<OnlineRoomView | null>(null);
  const [onlineLoading, setOnlineLoading] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onlineRevision=useRef(-1);

  const [playerName,setPlayerName]=useState(()=>{try{return localStorage.getItem('kaze_online_name')||'Player';}catch{return 'Player';}});
  const [playerToken,setPlayerToken]=useState(()=>{try{const n=Number(localStorage.getItem('kaze_player_token')||0);return Number.isInteger(n)&&n>=0&&n<13?n:0;}catch{return 0;}});
  const updateProfileName=(name:string)=>{setPlayerName(name);try{localStorage.setItem('kaze_online_name',name);}catch{}};
  const profileQueue=useRef<Promise<void>>(Promise.resolve());
  const changeProfileToken=(index:number)=>{setPlayerToken(index);try{localStorage.setItem('kaze_player_token',String(index));}catch{}};

  const [movingEvents,setMovingEvents]=useState<number[]>([]);
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
    preview?: boolean;
  } | null>(null);

  // Modals state
  const [showExit, setShowExit] = useState(false);
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
    setGameState(setupView(JSON.parse(JSON.stringify(s))));

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
    g.p(0).name=playerName.trim()||'Player';g.p(0).tokenIndex=playerToken;
    g.s.log=g.s.log.map((text:string)=>text.replace(/\bYou\b/g,g.p(0).name));
    setGame(g);
    setSelectedCard(null);
    setBoardPlay(null);
    lastAnnouncedTurnRef.current = '';
    setView('game');
    refreshGameState(g);
    saveLocalGame(g);
    showToast(`First player (random): ${g.p(g.s.turn).name}`);
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
    if (view !== 'game' || showExit || !game || onlineSession || gameState?.winner !== null) {
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
      actorIndex = g.s.pending ? (g.s.pending.responders||g.s.pending.payments?.map((e:any)=>e.target)||[g.s.pending.responder]).find((i:number)=>i>0)??0 : g.s.turn;
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
              preview: true,
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

          botTimerRef.current = setTimeout(() => {
            try {
              if (plan.response) {
                g.respond(actorIndex, true);
              } else {
                g.play(actorIndex, plan.id, plan.mode, plan.args);
              }
              setBoardPlay(prev => prev?.preview ? {...prev, preview:false} : prev);
              refreshGameState(g);
              saveLocalGame(g);
            } catch (err: any) {
              console.error(err);
            }
          }, timing.botRevealMs);
        } else {
          botTimerRef.current = setTimeout(() => {
            try {
              g.bot(actorIndex);
              setBoardPlay(prev => prev?.preview ? {...prev, preview:false} : prev);
              refreshGameState(g);
              saveLocalGame(g);
            } catch (err: any) {
              console.error(err);
            }
          }, timing.botRevealMs);
        }
      } catch (err: any) {
        console.error(err);
      }
    }, timing.botThinkMinMs+Math.floor(Math.random()*(timing.botThinkMaxMs-timing.botThinkMinMs+1)));

    return () => clearTimeout(botTimerRef.current);
  }, [view, showExit, game, gameState, onlineSession, refreshGameState, saveLocalGame]);

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

  // Keep this browser's editable profile synchronized without requiring blur/Ready.
  useEffect(()=>{
    if(!onlineSession||onlineView?.started)return;
    let cancelled=false;
    const timer=setTimeout(()=>{
      profileQueue.current=profileQueue.current.catch(()=>{}).then(async()=>{
        if(cancelled)return;
        try{
          const next=await roomRequest({...onlineSession,cmd:'profile',data:{name:playerName.trim()||'Player',tokenIndex:playerToken}});
          if(!cancelled)setOnlineView(prev=>!prev||next.revision>=prev.revision?next:prev);
        }catch(err:any){if(!cancelled)showToast(err.message);}
      });
    },120);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[playerName,playerToken,onlineSession,onlineView?.started]);

  const connectOnlineStream = (session: { code: string; token: string }) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    onlineRevision.current=-1;
    const params = new URLSearchParams(session);
    const es = new EventSource(`/api/events?${params}`);
    eventSourceRef.current = es;

    es.onopen=()=>{roomRequest({...session,cmd:'state'}).then(v=>{if(eventSourceRef.current===es)es.onmessage?.({data:JSON.stringify(v)} as MessageEvent);}).catch((err:any)=>showToast(err.message));};
    es.onmessage = (e) => {
      try {
        const v: OnlineRoomView = JSON.parse(e.data);
        if(v.revision<onlineRevision.current)return;onlineRevision.current=v.revision;
        setOnlineView(v);
        if (v.started && v.state) {
          setGameState(v.state);
          setView('game');
          if (!v.reveal) setBoardPlay(prev => prev?.preview ? {...prev, preview:false} : prev);
          if (v.reveal?.card) {
            setBoardPlay({
              preview: true,
              owner: v.reveal.actor,
              actor: v.state.players[v.reveal.actor]?.name || 'Player',
              card: v.reveal.card,
              mode: v.reveal.mode,
              color: v.reveal.color,
            });
          }
        } else {
          setGameState(null);setGame(null);setBoardPlay(null);setWizardCard(null);setEndTurnPendingLeft(null);setView('lobby');
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
      const res = await roomRequest({ cmd: 'create', name, tokenIndex:playerToken });
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
      const res = await roomRequest({ cmd: 'join', name, code, tokenIndex:playerToken });
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
      await profileQueue.current;
      await roomRequest({...onlineSession,cmd:'profile',data:{name:playerName.trim()||'Player',tokenIndex:playerToken}});
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

  useEffect(()=>{const closeInspections=()=>{setBankViewerData(null);setShowDiscardBrowser(false);setOpponentViewerIdx(null);};document.addEventListener('deal-close-artwork',closeInspections);return()=>document.removeEventListener('deal-close-artwork',closeInspections);},[]);

  const handleExitGame = async (save: boolean) => {
    try {
      if (onlineSession) {
        // Online matches keep their reserved seat so accidental exits can reconnect.
        if(save){localStorage.setItem('kaze_online_session', JSON.stringify(onlineSession));await handleLeaveRoom();}
        else{await roomRequest({...onlineSession,cmd:onlineView?.host?'stop':'forfeit'});setGameState(null);setGame(null);setView('lobby');}
      } else {
        if (save && game) localStorage.setItem('kaze_deal_save', JSON.stringify(game.s));
        else localStorage.removeItem('kaze_deal_save');
        clearTimeout(botTimerRef.current);
        setGame(null);
        setGameState(null);
        setBoardPlay(null);
        setView('menu');
      }
      setShowExit(false);
    } catch {
      showToast('Could not update your saved game. Please try again.');
    }
  };

  useEffect(() => {
    if (!showExit) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.exit-game-dialog');
    const buttons = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') || []);
    buttons.at(-1)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape'){e.preventDefault();setShowExit(false);}
      if(e.key === 'Tab' && buttons.length){
        const first=buttons[0],last=buttons[buttons.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return () => {document.removeEventListener('keydown',onKey);previous?.focus();};
  },[showExit]);

  useEffect(()=>{
    const p=game?.s.pending;if(onlineSession||view!=='game'||p?.kind!=='counter')return;
    if(!p.deadline){p.deadline=Date.now()+10000;refreshGameState(game);}
    const timer=setTimeout(()=>{if(game.s.pending!==p)return;for(const i of [...(p.responders||[p.responder])]){if(game.s.pending!==p)break;game.respond(i,false);}refreshGameState(game);saveLocalGame(game);},Math.max(0,p.deadline-Date.now()));return()=>clearTimeout(timer);
  },[game,gameState,onlineSession,view,refreshGameState,saveLocalGame]);

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

  const runChoice=(method:'jail'|'choose',args:any[])=>{if(onlineSession){remoteAction(method,args);return;}try{game[method](0,...args);refreshGameState(game);saveLocalGame(game);}catch(err:any){showToast(err.message);}};

  // Human actions (Local or Remote)
  const handleBankCard = (cardId: string) => {
    if (onlineSession) {
      remoteAction('play', [cardId, 'bank', {}]);
      setSelectedCard(null);
      return;
    }
    try {
      const c = game.p(0).hand.find((x: any) => x.id === cardId);
      game.play(0, cardId, 'bank');
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
      ['pass_go','its_my_birthday','luxury_tax','community_chest','chance'].includes(card.key) ||
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
        : gameState?.players[0].special.some(c=>c.key==='corporate_headquarters')?4:3
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
      return;
    }

    try {
      const c = game.p(0).hand.find((x: any) => x.id === cardId);
      game.play(0, cardId, 'play', args);
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

  const handleDoubleRentConfirm = (count: number) => {
    if (!doubleRentPending) return;
    const { cardId, args } = doubleRentPending;
    const hand = onlineSession ? gameState?.players[0]?.hand : game?.p(0)?.hand;
    const doubleCards=hand?.filter((c:any)=>c.key==='double_the_rent')||[];

    const nextArgs = {
      ...args,
      doubleAsked: true,
      doubleIds:doubleCards.slice(0,count).map((c:any)=>c.id),
    };
    setDoubleRentPending(null);
    executePlay(cardId, nextArgs);
  };

  const handleEndTurn = () => {
    if (onlineSession) {
      if(gameState?.phase==='setup'){remoteAction('end',[false]);return;}
      const limit=gameState?.players[0].special.some(c=>c.key==='corporate_headquarters')?4:3;
      const left=Math.max(0,limit-(gameState?.played||0));
      if(left>0)setEndTurnPendingLeft(left);else remoteAction('end',[false]);
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
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRespond = (useJustSayNo: boolean) => {
    if (onlineSession) {
      remoteAction('respond', [useJustSayNo]);
      return;
    }
    try {
      const c = useJustSayNo ? game.p(0).hand.find((x: any) => x.key === 'just_say_no') : null;
      game.respond(0, useJustSayNo);
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
      return;
    }
    try {
      game.pay(0, selectedIds);
      refreshGameState(game);
      saveLocalGame(game);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleOfferIOU = (cardId: string) => {
    if (onlineSession) {
      remoteAction('owe', [cardId]);
      return;
    }
    try {
      game.owe(0, cardId);
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

  const handleApplySettings = (newSound: boolean, newReduced: boolean, newMusic: boolean) => {
    setMusicOn(newMusic);
    setMusicEnabled(newMusic);
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
  useEffect(() => { setMusicScene(view==='game' ? (gameState?.winner!=null?'victory':defendingMusic?'defending':'game') : 'menu'); }, [view,defendingMusic,gameState?.winner]);

  return (
    <>
      <MobileTableOverlays enabled={mobile} portrait={portrait}/>


      {/* Toast popup */}
      {toastMessage && (
        <div id="notifications" aria-live="polite">
          <div className="toast">{toastMessage}</div>
        </div>
      )}

      {/* One main menu contains local controls and the online lobby. */}
      {(view === 'menu' || view === 'lobby') && (
        <MainMenu
          playerName={playerName} playerToken={playerToken} onNameChange={updateProfileName} onTokenChange={changeProfileToken} profileBusy={onlineLoading}
          onStartLocal={handleStartLocal}
          onResume={handleResume}
          hasResume={hasResume}
          onOpenRules={() => setShowRules(true)}
          onOpenAudit={() => setShowAudit(true)}
          onOpenSettings={() => setShowSettings(true)}
          inRoom={!!onlineSession}
          onlineContent={
<OnlineLobby
          playerName={playerName.trim()||'Player'}
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
          loading={onlineLoading}
        />
          }
        />
      )}

      {/* Active Game Table View */}
      {view === 'game' && gameState && (
        <div className="app">
          <TurnNotices state={gameState}/><SpecialTriggerNotices state={gameState}/><GameFeedback key={onlineSession?.code||'local'} state={gameState} onMoving={setMovingEvents}/>
          <TopBar
            state={gameState}
            isOnline={!!onlineSession}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMenu={() => setShowExit(true)}
          />

          <div className="game">
            <main className="table">

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
                state={{...gameState,events:gameState.events.filter(e=>!movingEvents.includes(e.seq)||!['payment','transfer','discard'].includes(e.type))}}
                boardPlay={boardPlay}
                onSelectCard={(c, owner = 0) => {
                  setSelectedCard(c);
                  setSelectedOwner(owner);
                }}
                onBrowseDiscard={() => setShowDiscardBrowser(true)}
              />

              {/* Player zone: your field, bank, hand & turn controls */}
              <PlayerArea
                state={gameState}
                selectedCard={selectedCard}
                chatOwnSeat={onlineView?.seat}
                chatMessages={onlineSession ? onlineView?.chat || [] : undefined}
                onSendChat={onlineSession ? async(text)=>{await roomRequest({...onlineSession,cmd:'chat',data:{text}});} : undefined}
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
            {!mobile && <SidebarRail
              selectedCard={selectedCard}
              selectedOwner={selectedOwner}
              chatOwnSeat={onlineView?.seat}
              state={gameState}
              chatMessages={onlineSession ? onlineView?.chat || [] : undefined}
              onSendChat={onlineSession ? async(text)=>{await roomRequest({...onlineSession,cmd:'chat',data:{text}});} : undefined}
            />}
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showAudit && <AuditModal onClose={() => setShowAudit(false)} />}
      {showSettings && (
        <SettingsModal
          musicEnabled={musicOn}
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
        <React.Fragment>{usesBoardTarget(wizardCard)?<BoardTarget card={wizardCard} state={gameState} onConfirm={args=>executePlay(wizardCard.id,args)} onCancel={()=>setWizardCard(null)}/>:<TargetingWizard
          card={wizardCard}
          state={gameState}
          onConfirm={(args) => executePlay(wizardCard.id, args)}
          onCancel={() => setWizardCard(null)}
        />}</React.Fragment>
      )}

      {/* Double Rent Prompt */}
      {doubleRentPending && (
        <DoubleRentModal maxDoubles={Math.max(0,Math.min((gameState?.players[0].hand.filter(c=>c.key==='double_the_rent').length||0),(gameState?.players[0].special.some(c=>c.key==='corporate_headquarters')?4:3)-(gameState?.played||0)-1))} onConfirm={handleDoubleRentConfirm} />
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
        (gameState.pending.responders?.includes(0) || (!gameState.pending.responders&&gameState.pending.responder === 0)) &&
        gameState.pending.kind === 'counter' && (
          <ReactionModal
            pending={{...gameState.pending,e:gameState.pending.payments?.find(e=>e.target===0)||gameState.batch?.effects?.find((e:any)=>gameState.pending?.responders?.includes(0)&&e.target===0)||gameState.pending.e}}
            state={gameState}
            onRespond={handleRespond}
          />
        )}

      {/* Payment Selection Modal */}
      {gameState?.pending &&
        (gameState.pending.payments?.some(e=>e.target===0)||gameState.pending.responder===0) &&
        gameState.pending.kind === 'payment' && (
          <PaymentModal
            key={`${gameState.turnSerial || 0}:${gameState.pending.e.actor}:${gameState.pending.e.target}:${gameState.pending.e.key}:${gameState.events.filter(e=>e.type==='charge').at(-1)?.seq || 0}`}
            pending={{...gameState.pending,e:gameState.pending.payments?.find(e=>e.target===0)||gameState.batch?.effects?.find((e:any)=>gameState.pending?.responders?.includes(0)&&e.target===0)||gameState.pending.e}}
            state={gameState}
            onPay={handlePay}
            onOfferIOU={handleOfferIOU}
            onSkipJail={()=>runChoice('jail',[false])}
          />
        )}

      {gameState?.pending?.responder===0&&['jail','chance','expansion'].includes(gameState.pending.kind)&&<div className="overlay"><section className="modal new-rule-choice" role="dialog" aria-modal="true" aria-label="Resolve card effect">
        {gameState.pending.kind==='jail'?<><img className="jail-choice-art" src="/ui/jail.png" alt="In Jail"/><h2>Pay bail or skip your turn</h2><p>Discard at least 10M from your bank and/or field to take this turn.</p><button className="gold" onClick={()=>runChoice('jail',[true])}>Pay 10M bail</button><button className="quiet" onClick={()=>runChoice('jail',[false])}>Skip this turn</button></>:gameState.pending.kind==='chance'?<><h2>Chance · keep one card</h2><div className="chance-options">{gameState.pending.cards?.map(c=><button key={c.id} onClick={()=>runChoice('choose',[c.id])}><img src={getCardArt(c)} alt={getCardDef(c).name}/></button>)}</div></>:<><h2>Expansion Property · choose an existing color</h2>{gameState.pending.colors?.map(color=><button className="quiet" key={color} onClick={()=>runChoice('choose',[color])}>{color}</button>)}</>}
      </section></div>}
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

      {showExit && <div className="overlay exit-game-overlay"><section className="modal exit-game-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-game-title"><h2 id="exit-game-title">Exit game?</h2><p>{onlineSession ? 'Save and exit keeps your seat. Just exit ends the match for everyone if you are host; otherwise you forfeit and return to the lobby.' : 'Save your progress to continue this game later, or exit without keeping this game.'}</p><div className="exit-game-options"><button className="gold" onClick={()=>handleExitGame(true)}>Save and exit</button><button className="quiet" onClick={()=>handleExitGame(false)}>Just exit</button><button className="quiet" onClick={()=>setShowExit(false)}>Cancel</button></div></section></div>}

      {/* Winner Celebration Modal */}
      {view==='game' && gameState && gameState.winner !== null && (
        <WinnerModal
          winner={gameState.winner}
          winnerName={gameState.players[gameState.winner]?.name || 'Player'}
          winnerToken={gameState.players[gameState.winner]?.tokenIndex??0}
          sets={gameState.players[gameState.winner]?.groups??[]}
          round={gameState.round}
          logCount={gameState.log.length}
          onMenu={async()=>{if(onlineSession){if(onlineView?.host){await roomRequest({...onlineSession,cmd:'stop'});setGameState(null);setGame(null);setView('lobby');}else await handleLeaveRoom();}else await handleExitGame(false);}}
        />
      )}
    </>
  );
};
