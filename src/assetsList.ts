import { STATIC_ART } from './cardArt';

// All image assets to preload for smooth instant rendering
export const PRELOAD_ASSETS: string[] = Array.from(new Set([
  ...Object.values(STATIC_ART),
  '/tokens/silver-token-atlas.webp',
  '/ui/menu-emerald.webp',
  '/ui/jail.webp',
  '/ui/your-turn.webp',
  '/ui/opponent-turn.webp',
  '/ui/defending-phase.webp',
  '/ui/defense-failed.webp',
  '/ui/victory-plaque.webp',
  '/ui/cursors/arrow.webp',
  '/ui/cursors/cards.webp',
  '/ui/cursors/glove.webp',
  '/favicon.webp',
]));
