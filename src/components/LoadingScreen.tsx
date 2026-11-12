import React, { useEffect, useState, useRef } from 'react';
import { PRELOAD_ASSETS } from '../assetsList';
import { STATIC_ART } from '../cardArt';
import { unlockAudio } from '../audio';
import { setMusicScene } from '../music';
import '../loading-screen.css';

interface LoadingScreenProps {
  onPlay: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onPlay }) => {
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [currentAsset, setCurrentAsset] = useState<string>('Initializing assets...');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const totalAssets = PRELOAD_ASSETS.length;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (typeof window === 'undefined' || totalAssets === 0) {
      setIsComplete(true);
      return;
    }

    let loaded = 0;
    const updateProgress = (url: string) => {
      loaded++;
      setLoadedCount(loaded);
      const filename = url.split('/').pop()?.replace('.webp', '').replace(/[_-]/g, ' ') || 'card';
      setCurrentAsset(`Loaded ${filename}`);
      if (loaded >= totalAssets) {
        setIsComplete(true);
      }
    };

    // Preload all assets in parallel batches using standard Image object
    PRELOAD_ASSETS.forEach((src) => {
      const img = new Image();
      img.onload = () => updateProgress(src);
      img.onerror = () => {
        // Even if an asset fails, do not block the game progress
        updateProgress(src);
      };
      img.src = src;
    });

    // Fallback safety timer: ensure game becomes playable within 6 seconds even on slow networks
    const fallbackTimer = setTimeout(() => {
      setIsComplete(true);
    }, 6000);

    return () => clearTimeout(fallbackTimer);
  }, [totalAssets]);

  const handleStartGame = () => {
    // User gesture enables Web Audio and background music smoothly across browsers
    unlockAudio();
    setMusicScene('menu');
    onPlay();
  };

  const progressPct = totalAssets > 0 ? Math.min(100, Math.round((loadedCount / totalAssets) * 100)) : 100;

  return (
    <div className="game-loading-screen" role="dialog" aria-modal="true" aria-label="Game Loading Screen">
      <div className="game-loading-backdrop" aria-hidden="true" />
      <div className="game-loading-card">
        <div className="game-loading-logo-wrap">
          <img
            src={STATIC_ART.logo || '/artwork/logo.webp'}
            alt="Monopoly Deal Lvl. Up"
            className="game-loading-logo"
          />
        </div>

        <h1 className="game-loading-title">Monopoly Deal</h1>
        <p className="game-loading-subtitle">LEVEL UP EDITION</p>

        {!isComplete ? (
          <div className="game-loading-progress-container">
            <div
              className="game-loading-progress-bar-bg"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="game-loading-progress-fill"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              />
            </div>
            <div className="game-loading-status">
              <span>Preloading graphics & cards...</span>
              <strong>{progressPct}% ({loadedCount}/{totalAssets})</strong>
            </div>
            <div className="game-loading-status-detail">{currentAsset}</div>
          </div>
        ) : (
          <div className="game-loading-progress-container">
            <button
              type="button"
              className="game-loading-play-btn"
              onClick={handleStartGame}
              autoFocus
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              <span>Play Now</span>
            </button>
            <p className="game-loading-tip">
              All 100+ cards, tokens, and graphics loaded. Click Play to enter the game.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
