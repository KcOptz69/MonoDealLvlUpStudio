export interface CardDef {
  key: string;
  name: string;
  copies: number;
  value: number;
  text: string;
  type: 'property' | 'wild' | 'special' | 'action' | 'rent' | 'money' | 'building';
  colors?: string[];
  any?: boolean;
}

export interface CardInstance {
  id: string;
  key: string;
  locked?: string;
  expansionColor?:string;
  expansionOwner?:number;
  generated?: boolean;
}

export interface PropertyGroup {
  id: string;
  color: string;
  cards: CardInstance[];
  house?: CardInstance;
  hotel?: CardInstance;
}

export interface PlayerState {
  reserveTimer?:{remaining:number;running:boolean;serverTime:number};
  protectedEstate?:CardInstance;
  estatePurchased?:boolean;
  defenseRemaining?:number|null;
  setupHidden?:boolean;
  jailed?:boolean;
  freeBankUsed?:boolean;
  forfeited?:boolean;
  tokenIndex?: number;
  name: string;
  hand: CardInstance[];
  bank: CardInstance[];
  groups: PropertyGroup[];
  special: CardInstance[];
  defending: boolean;
  setupPlayed?: number;
  setupDone?: boolean;
}

export interface GameEvent {
  targetAll?:boolean;
  setup?:boolean;
  turnId?: number;
  targetPlaySeq?: number;
  seq: number;
  category?:string;
  type: 'estate_purchase' | 'tough_luck_result' | 'donation' | 'draw' | 'bank' | 'property' | 'play' | 'charge' | 'transfer' | 'payment' | 'discard' | 'negate' | 'setup_turn' | 'reveal' | 'special_trigger';
  actor: number;
  target?: number | null;
  card?: CardInstance;
  cards?: CardInstance[];
  color?: string;
  key?: string;
  amount?: number;
  message?:string;
  owed?: number;
  destination?: string;
  replacement?: boolean;
  passive?: boolean;
  blocked?: boolean;
}

export interface PendingAction {
  responders?:number[];
  deadline?:number;
  payments?:PendingAction['e'][];
  kind: 'estate' | 'counter' | 'payment' | 'discard' | 'jail' | 'chance' | 'expansion';
  cards?:CardInstance[];
  colors?:string[];
  card?:CardInstance;
  responder: number;
  negated?: boolean;
  e: {
    actor: number;
    target: number;
    key: string;
    cardKey?: string;
    propertyOnly?: boolean;
    defenseBail?: boolean;
    amount?: number;
    property?: string;
    own?: string;
    group?: string;
    color?: string;
    category?: string;
    global?: boolean;
    paymentDeadline?:number;
    args?: any;
  };
}

export interface GameState {
  cooperation?:import('./cooperation').CooperationWindow;
  cooperationTurn?:string;
  botDonationTurn?:string;
  roundLimit?:number|null;
  fullRotationDefense?:boolean;
  fastBots?:boolean;
  roundCompleted?:number[];
  winners?:number[];
  endReason?:'round-limit'|'defense';
  scoreResults?:{player:number;bank:number;field:number;total:number}[];
  turnSerial?: number;
  version: number;
  players: PlayerState[];
  deck: CardInstance[];
  discard: CardInstance[];
  turn: number;
  startPlayer: number;
  played: number;
  pending: PendingAction | null;
  queue: any[];
  log: string[];
  winner: number | null;
  nextId: number;
  round: number;
  phase: 'setup' | 'play';
  setupTurnsLeft: number;
  events: GameEvent[];
  eventSeq: number;
  minted?: number;
  batch?: any;
  iou?: any;
}

export interface SeatInfo {
  tokenIndex?: number;
  name: string;
  bot: boolean;
  ready: boolean;
  connected?: boolean;
  host?: boolean;
  status?: string;
}

export interface ChatMessage {id:number;name:string;text:string;time:number;senderSeat?:number;}

export interface OnlineRoomView {
  decisionClocksPaused?:boolean;
  paused?:boolean;
  hostDisconnected?:boolean;
  pausedAt?:number;
  clock?:{remaining:number;limit:number;running:boolean};
  serverTime?:number;
  options?:{roundLimit:number|null;fastBots:boolean;fullRotationDefense?:boolean};
  matchActive?:boolean;
  chat?: ChatMessage[];
  code: string;
  host: boolean;
  seat: number;
  revision: number;
  seats: (SeatInfo | null)[];
  started: boolean;
  state?: GameState;
  offset?: number;
  reveal?: {
    target?:number;
    actor: number;
    card: CardInstance;
    mode: string;
    color?: string;
  } | null;
}
