import type {GameState} from './types';
// Projection only: the engine retains authoritative setup cards for simultaneous play.
export function setupView(state:GameState):GameState{
 if(state.phase!=='setup')return state;
 return {...state,players:state.players.map((p,i)=>i===0?p:{...p,hand:p.hand.map((_,j)=>({id:`hidden-${i}-${j}`,key:'hidden'})),bank:[],groups:[],special:[],setupHidden:true}),log:['Simultaneous setup · opponent cards are revealed when everyone is ready.'],events:state.events.map(e=>e.actor===0?e:{...e,card:e.card?{id:'setup-'+e.seq,key:'hidden'}:undefined,cards:e.cards?.map((_,i)=>({id:`setup-${e.seq}-${i}`,key:'hidden'})),key:undefined,color:undefined})};
}
