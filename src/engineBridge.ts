import { Game, COLORS, BOT_NAMES, DealEngine } from './engine';
import deckData from '../deck.json';
import { CardDef } from './types';

export const DECK: CardDef[] = deckData as CardDef[];

export { Game, COLORS, BOT_NAMES, DealEngine };

export function getCardDef(keyOrCard: string | { key: string }): CardDef {
  const key = typeof keyOrCard === 'string' ? keyOrCard : keyOrCard?.key;
  const found = DECK.find(d => d.key === key);
  return found || {
    key: key || 'unknown',
    name: key ? key.replace(/_/g, ' ') : 'Unknown Card',
    copies: 1,
    value: 0,
    text: '',
    type: 'action'
  };
}
