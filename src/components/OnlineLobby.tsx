import React, { useState } from 'react';
import { STATIC_ART } from '../cardArt';
import { OnlineRoomView } from '../types';

interface OnlineLobbyProps {
  roomView: OnlineRoomView | null;
  onCreateRoom: (name: string) => Promise<void>;
  onJoinRoom: (name: string, code: string) => Promise<void>;
  onReconnectRoom: () => Promise<void>;
  hasLastSession: boolean;
  onToggleReady: (ready: boolean) => Promise<void>;
  onAddBot: (slot: number) => Promise<void>;
  onRemoveBot: (slot: number) => Promise<void>;
  onStartGame: () => Promise<void>;
  onLeaveRoom: () => void;
  onBackToMenu: () => void;
  loading: boolean;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  roomView,
  onCreateRoom,
  onJoinRoom,
  onReconnectRoom,
  hasLastSession,
  onToggleReady,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onLeaveRoom,
  onBackToMenu,
  loading,
}) => {
  const [copied, setCopied] = useState(false);
  const copyInvite = async () => { const url=new URL(window.location.href); url.search=''; url.hash=''; url.searchParams.set('room',roomView!.code); try { await navigator.clipboard.writeText(url.toString()); setCopied(true); setTimeout(()=>setCopied(false),2500); } catch { window.prompt('Copy invite link',url.toString()); } };
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem('kaze_online_name') || 'Player';
    } catch {
      return 'Player';
    }
  });
  const [code, setCode] = useState<string>(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '');

  const handleNameChange = (val: string) => {
    setName(val);
    try {
      localStorage.setItem('kaze_online_name', val);
    } catch {}
  };

  // If in an active room lobby
  if (roomView && !roomView.started) {
    const activeSeats = roomView.seats.filter(Boolean);
    const mySeat = roomView.seats[roomView.seat];
    const isReady = mySeat?.ready ?? false;
    const canStart = roomView.host && activeSeats.length >= 2 && activeSeats.every((s) => s?.ready);

    return (
      <main className="lobby">
        <img src={STATIC_ART.logo} alt="Monopoly Deal Lvl. Up" />
        <p className="eyebrow">ONLINE LOBBY · {activeSeats.length}/5 PLAYERS</p>
        <h1>
          Room <span className="room-code">{roomView.code}</span>
        </h1>
        <button className="gold" onClick={copyInvite}>{copied ? '✓ Invite link copied' : 'Copy invite link'}</button>

        <div className="lobby-slots">
          {roomView.seats.map((seat, i) => (
            <section key={i} className="lobby-slot">
              <span className="avatar">{i + 1}</span>
              {seat ? (
                <>
                  <div>
                    <strong>
                      {seat.name}
                      {i === roomView.seat ? ' · You' : ''}
                      {seat.host ? ' · Host' : ''}
                    </strong>
                    <small>
                      {seat.bot ? 'Bot · Relaxed' : seat.connected ? 'Connected' : 'Reconnecting'} ·{' '}
                      {seat.ready ? '✓ Ready' : 'Not ready'}
                    </small>
                  </div>
                  {roomView.host && seat.bot && (
                    <button
                      className="quiet"
                      disabled={loading}
                      onClick={() => onRemoveBot(i)}
                    >
                      Remove bot
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span>Open slot</span>
                  {roomView.host && (
                    <button
                      disabled={loading}
                      onClick={() => onAddBot(i)}
                    >
                      Add bot
                    </button>
                  )}
                </>
              )}
            </section>
          ))}
        </div>

        <div className="lobby-buttons">
          <button
            className="gold"
            disabled={loading}
            onClick={() => onToggleReady(!isReady)}
          >
            {isReady ? 'Unready' : 'Ready'}
          </button>

          {roomView.host ? (
            <button
              className="gold"
              disabled={loading || !canStart}
              onClick={onStartGame}
            >
              Start game
            </button>
          ) : (
            <span>Waiting for the host to start</span>
          )}

          <button className="quiet" onClick={onLeaveRoom}>
            Leave lobby
          </button>
        </div>

        <small>
          All humans, including the host, must click Ready. The host can add bots to empty slots.
        </small>
      </main>
    );
  }

  // Pre-lobby setup modal / screen
  return (
    <main className="lobby" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <section style={{ width: 'min(94vw, 480px)' }} className="modal small" role="dialog" aria-modal="true" aria-label="Online lobby">
        <div className="modalhead">
          <h2>Online lobby</h2>
          <button className="quiet" onClick={onBackToMenu} aria-label="Local game menu">
            Local game
          </button>
        </div>

        <div className="form">
          <p>
            Up to five players, phones and PCs together. Open the same server address on each device,
            then share the room code.
          </p>

          <label>
            Your name
            <input
              maxLength={24}
              placeholder="Player name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </label>

          <button
            className="gold"
            disabled={loading || !name.trim()}
            onClick={() => onCreateRoom(name)}
          >
            Create room
          </button>

          <label>
            Room code
            <input
              maxLength={6}
              placeholder="ABC123"
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>

          <button
            disabled={loading || !name.trim() || code.trim().length !== 6}
            onClick={() => onJoinRoom(name, code.trim())}
          >
            Join room
          </button>

          {hasLastSession && (
            <button className="quiet" disabled={loading} onClick={onReconnectRoom}>
              Reconnect to last room
            </button>
          )}

          <small>
            The standalone HTML supports local games. Online rooms require the included server. Rooms
            remain active while that server is running.
          </small>
        </div>
      </section>
    </main>
  );
};
