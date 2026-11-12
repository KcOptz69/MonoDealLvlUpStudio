import React from 'react';
import './player-token.css';
export const TOKENS=['Top hat','Scottie dog','Race car','Battleship','Boot','Cat','Thimble','Wheelbarrow','Iron','Penguin','Rubber duck','T. rex','Money bag'].map(name=>({name}));
export function PlayerToken({index=0}:{index?:number}){
 const n=((index%TOKENS.length)+TOKENS.length)%TOKENS.length;
 return <span className="player-token" role="img" aria-label={TOKENS[n].name} title={TOKENS[n].name}><span className="silver-token-piece" aria-hidden="true" style={{backgroundImage:'url(/tokens/silver-token-atlas.webp)',backgroundPosition:`${n%4*100/3}% ${Math.floor(n/4)*100/3}%`}}/></span>;
}
