import React, { useState } from 'react';
import { STATIC_ART } from '../cardArt';

interface MainMenuProps {
  onStartLocal: (botCount: number) => void;
  onOpenOnline: () => void;
  onResume: () => void;
  hasResume: boolean;
  onOpenRules: () => void;
  onOpenAudit: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartLocal,
  onOpenOnline,
  onResume,
  hasResume,
  onOpenRules,
  onOpenAudit,
  onOpenSettings,
}) => {
  const [botCount, setBotCount] = useState<number>(2);

  return (
    <main className="menu">
      <div className="menuhero">
        <img src={STATIC_ART.logo} alt="Monopoly Deal Lvl. Up — made by Kaze" />
        <p className="eyebrow">Your empire. One rotation to defend it.</p>
      </div>

      <section className="menucopy">
        <div className="eyebrow">Local edition · 130 cards</div>
        <h1>
          Build it.<br />
          Steal it.<br />
          <span style={{ color: '#efc46f' }}>Hold it.</span>
        </h1>
        <p>
          Collect three different complete property sets, then defend them until your next turn.
          Play offline against bots using Kaze’s custom deck.
        </p>

        <div className="settingsbox form">
          <label>
            Opponents
            <select
              id="botCount"
              value={botCount}
              onChange={(e) => setBotCount(Number(e.target.value))}
            >
              <option value="1">1 bot · quick duel</option>
              <option value="2">2 bots · classic table</option>
              <option value="3">3 bots · busy table</option>
              <option value="4">4 bots · full table</option>
            </select>
          </label>
          <p>Bot pace: Relaxed</p>
        </div>

        <div className="menubuttons">
          <button className="gold start" onClick={() => onStartLocal(botCount)}>
            Start local game →
          </button>
          <button className="quiet" onClick={onOpenOnline}>
            Online lobby · 5 slots
          </button>
          <button className="quiet" onClick={onResume} disabled={!hasResume}>
            Continue game
          </button>
          <button className="quiet" onClick={onOpenRules}>
            How to play
          </button>
          <button className="quiet" onClick={onOpenAudit}>
            Card library &amp; values
          </button>
          <button className="quiet" onClick={onOpenSettings}>
            Settings
          </button>
        </div>

        <p style={{ fontSize: '11px', marginTop: '16px' }}>
          made by Kaze · Local + online edition v2.7<br />
          Local play runs offline. Online rooms use the included server.
        </p>
      </section>
    </main>
  );
};
