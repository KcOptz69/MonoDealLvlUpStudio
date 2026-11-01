import React,{useState} from 'react';
import {createPortal} from 'react-dom';
import {CardInstance,GameState,PropertyGroup} from '../types';
import {COLORS,getCardDef} from '../engineBridge';
import {getCardArt} from '../cardArt';
import {FieldContents} from './FieldView';
import '../field-improvements.css';
export function ExpansionSelector({state,card,onSelect,onClose,transferring=false}:{state:GameState;card:CardInstance;onSelect:(g:PropertyGroup)=>void;onClose?:()=>void;transferring?:boolean}){
 const [selected,setSelected]=useState('');const [bank,setBank]=useState(false);
 const fixed=card.locked||(!transferring&&card.expansionOwner===0?card.expansionColor:undefined);
 const eligible=(g:PropertyGroup)=>{const cards=g.cards.filter(c=>c.id!==card.id);return (!fixed||g.color===fixed)&&cards.length<COLORS[g.color]?.size&&cards.some(c=>c.key!=='expansion_property');};
 const group=state.players[0].groups.find(g=>g.id===selected&&eligible(g));
 return <div className="overlay expansion-selector"><section className="fieldview-dialog" role="dialog" aria-modal="true" aria-label="Attach Expansion Property">
  {onClose&&<button className="quiet fieldview-close" onClick={onClose} aria-label="Cancel placement">×</button>}
  <div className="expansion-heading"><img src={getCardArt(card)} alt="Expansion Property"/><div><h2>Attach Expansion Property</h2><p>Choose a highlighted existing set in your field.</p></div></div>
  <FieldContents state={state} index={0} onBank={()=>setBank(true)} onGroup={g=>setSelected(g.id)} selectedGroup={selected} groupEligible={eligible}/>
  <footer className="expansion-footer">{!state.players[0].groups.some(eligible)&&<span>No eligible set with space.</span>}{onClose&&<button className="quiet" onClick={onClose}>Cancel</button>}<button className="gold" disabled={!group} onClick={()=>group&&onSelect(group)}>Attach{group?' to '+group.color:''}</button></footer>
 </section>{bank&&createPortal(<div className="overlay bank-view-overlay"><section className="modal" role="dialog" aria-modal="true" aria-label="Your bank"><div className="modalhead"><h2>Your bank</h2><button onClick={()=>setBank(false)} aria-label="Close bank">×</button></div><div className="row">{state.players[0].bank.map(c=><img key={c.id} className="expansion-bank-art" src={getCardArt(c)} alt={getCardDef(c).name}/>)}{!state.players[0].bank.length&&<p>Empty bank</p>}</div></section></div>,document.body)}</div>;
}
