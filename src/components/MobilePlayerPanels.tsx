import {installMobileHandScrolling} from '../mobileHandScrolling';
import {PlayerToken} from './PlayerToken';
import React,{useEffect,useRef,useState} from 'react';
import {PlayerZone} from './PlayerZone';
import {COLORS,getCardDef} from '../engineBridge';

type Props=React.ComponentProps<typeof PlayerZone>;
export const MobilePlayerPanels:React.FC<Props>=(props)=>{
 useEffect(()=>installMobileHandScrolling(),[]);
 const [panel,setPanel]=useState<'hand'|'field'|'chat'|null>(null);
 const [showHandField,setShowHandField]=useState(false);
 const [transfer,setTransfer]=useState(false);
 const [arrange,setArrange]=useState(false);
 useEffect(()=>{if(panel!=='field'){setTransfer(false);setArrange(false);}},[panel]);
 const drag=useRef<{id:string;x:number;y:number;active:boolean;pointer:number}|null>(null);
 const suppressClick=useRef(false);
 useEffect(()=>{if(panel!=='field'||!transfer)return;const old=document.body.style.overscrollBehavior;document.body.style.overscrollBehavior='none';return()=>{document.body.style.overscrollBehavior=old;drag.current=null;document.querySelectorAll('.move-target').forEach(el=>el.classList.remove('move-target'));};},[panel,transfer]);
 const close=useRef<HTMLButtonElement>(null);
 const [lastReadId,setLastReadId]=useState(0);
 const [draft,setDraft]=useState('');const [localMessages,setLocalMessages]=useState<import('../types').ChatMessage[]>([]);const [sending,setSending]=useState(false);const [chatError,setChatError]=useState('');const messages=props.chatMessages??localMessages;const messageList=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(panel==='chat'&&messageList.current)messageList.current.scrollTop=messageList.current.scrollHeight;},[messages,panel]);
 const send=async(e:React.FormEvent)=>{e.preventDefault();const text=draft.trim();if(!text||sending)return;setSending(true);setChatError('');try{if(props.onSendChat)await props.onSendChat(text);else setLocalMessages(prev=>[...prev,{id:Date.now(),name:props.state.players[0].name,text,time:Date.now()}].slice(-50));setDraft('');}catch(err){setChatError(err instanceof Error?err.message:'Message could not be sent.');}finally{setSending(false);}};
 const state=props.state,player=state.players[0],setup=state.phase==='setup';
 const unread=panel==='chat'?0:messages.filter(m=>m.id>lastReadId&&(m.senderSeat!==undefined&&props.chatOwnSeat!==undefined?m.senderSeat!==props.chatOwnSeat:m.name!==player.name)).length;
 useEffect(()=>{if(panel==='chat')setLastReadId(messages.at(-1)?.id||0);},[panel,messages]);
 const limit=setup?3:player.special.some(c=>c.key==='corporate_headquarters')?4:3;
 const used=setup?player.setupPlayed||0:state.played;
 const remaining=Math.max(0,limit-used);
 const myTurn=state.winner===null&&(setup?!player.setupDone:state.turn===0);
 const sets=new Set(player.groups.filter(g=>g.cards.length===COLORS[g.color]?.size&&g.cards.some(c=>getCardDef(c).value>0)).map(g=>g.color)).size;
 useEffect(()=>{if(state.pending)setPanel(null);},[state.pending]);
 useEffect(()=>{if(!props.onSendChat&&panel==='chat')setPanel(null);},[props.onSendChat,panel]);
 useEffect(()=>{if(panel)close.current?.focus();},[panel]);
 useEffect(()=>{const closeHand=()=>setPanel(null);document.addEventListener('deal-hand-dropped',closeHand);return()=>document.removeEventListener('deal-hand-dropped',closeHand);},[]);
 return <>
  <nav className="mobile-player-dock" aria-label="Your cards and turn controls">
   <div className="mobile-player-identity"><PlayerToken index={player.tokenIndex ?? 0}/><strong title={player.name}>{player.name}</strong></div>
   <button className="quiet" aria-haspopup="dialog" aria-expanded={panel==='hand'} onClick={()=>setPanel('hand')}>Hand · {player.hand.length}</button>
   <button className="quiet mobile-field-trigger" aria-haspopup="dialog" aria-expanded={panel==='field'} onClick={()=>setPanel('field')}>Your Field · {sets}/3</button>
   {props.onSendChat&&<button className="quiet mobile-chat-trigger" aria-haspopup="dialog" aria-expanded={panel==='chat'} onClick={()=>setPanel('chat')}>Chat{unread>0&&<span className="mobile-chat-unread" aria-label={`${unread} unread messages`}>{unread>99?'99+':unread}</span>}</button>}
   <div className={'pips'+(!myTurn?' waiting':'')} role="img" aria-label={`${remaining} of ${limit} actions remaining`}>{Array.from({length:limit},(_,i)=><span key={i} className={'pip'+(myTurn&&i>=remaining?' used':'')}/>)}</div>
   <button className={'gold'+(myTurn&&remaining===0?' end-ready':'')} disabled={!myTurn||!!state.pending} onClick={()=>{setPanel(null);props.onEndTurn();}}>{setup?(player.setupDone?'Ready':'Finish setup'):'End Turn'}</button>
  </nav>
  {panel&&<div className={'mobile-player-overlay panel-'+panel+(panel==='hand'&&showHandField?' hand-field-visible':'')+(panel==='field'&&transfer?' transfer-enabled':'')}>
   <section onClickCapture={e=>{if(suppressClick.current&&(e.target as Element).closest('.groupcards .card')){e.preventDefault();e.stopPropagation();}suppressClick.current=false;}} onPointerDownCapture={e=>{if(!transfer||panel!=='field'||!myTurn||state.pending)return;const card=(e.target as Element).closest<HTMLElement>('.groupcards .card[data-card-id]');if(!card||!player.groups.some(g=>g.cards.some(c=>c.id===card.dataset.cardId)))return;drag.current={id:card.dataset.cardId!,x:e.clientX,y:e.clientY,active:false,pointer:e.pointerId};card.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMoveCapture={e=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)d.active=true;if(!d.active)return;e.preventDefault();document.querySelectorAll('.move-target').forEach(el=>el.classList.remove('move-target'));const group=document.elementFromPoint(e.clientX,e.clientY)?.closest('.group[data-group-id]');group?.classList.add('move-target');}} onPointerCancelCapture={()=>{drag.current=null;document.querySelectorAll('.move-target').forEach(el=>el.classList.remove('move-target'));}} onPointerUpCapture={e=>{const d=drag.current;drag.current=null;document.querySelectorAll('.move-target').forEach(el=>el.classList.remove('move-target'));if(!d)return;suppressClick.current=true;e.preventDefault();if(!d.active)return;const group=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('.group[data-group-id]');if(group)props.onDropPropertyToGroup?.(d.id,group.dataset.groupColor!,group.dataset.groupId);else if(document.elementFromPoint(e.clientX,e.clientY)?.closest('.new-set-drop')){const source=player.groups.find(g=>g.cards.some(c=>c.id===d.id));if(source)props.onDropPropertyToGroup?.(d.id,source.color);}}} className="mobile-player-panel" role="dialog" aria-modal="true" aria-label={panel==='chat'?'Chat':panel==='hand'?'Your hand':'Your field and bank'} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setPanel(null);}}}>
    <header className="mobile-player-panel-head"><h2>{panel==='chat'?'Chat':panel==='hand'?`Your hand · ${player.hand.length}`:`Your field · ${sets}/3 sets`}</h2>{panel==='hand'&&<label className="hand-field-toggle"><input type="checkbox" role="switch" checked={showHandField} onChange={e=>setShowHandField(e.target.checked)} aria-label="Show your field above your hand"/><span className="hand-field-switch" aria-hidden="true"/><span>Show field</span></label>}{panel==='field'&&<label className="hand-field-toggle"><input type="checkbox" role="switch" checked={transfer} disabled={!myTurn||!!state.pending} onChange={e=>{setTransfer(e.target.checked);if(e.target.checked)setArrange(false);}} aria-label="Enable dragging properties"/><span className="hand-field-switch" aria-hidden="true"/><span>Move properties</span></label>}<button ref={close} type="button" aria-label="Close player panel" onClick={()=>setPanel(null)}>×</button></header>
    <div className="special-notice-slot"/>
    {panel==='field'&&transfer&&<p className="transfer-hint">Drag a property onto a compatible set. Turn off to hold and preview.</p>}
    {panel==='chat'?<><small className="chat-context">{props.onSendChat?'Messages to everyone in this room':'Local game · messages stay on this device'}</small><div className="chat-messages" ref={messageList} role="log" aria-label="Chat messages" aria-live="polite">{messages.length?messages.map(m=><article key={m.id}><strong>{m.name}</strong><p>{m.text}</p></article>):<p className="muted">No messages yet.</p>}</div><form className="chat-compose" onSubmit={send}><input aria-label="Chat message" placeholder="Type a message…" maxLength={240} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="gold" disabled={sending||!draft.trim()} type="submit">{sending?'Sending…':'Send'}</button></form>{chatError&&<small role="alert">{chatError}</small>}</>:<PlayerZone {...props} allowDrag={panel==='field'&&transfer} arrangeMode={panel==='field'&&arrange} onArrangeModeChange={enabled=>{setArrange(enabled);if(enabled)setTransfer(false);}} onDonateCard={props.onDonateCard?card=>{setPanel(null);props.onDonateCard?.(card);}:undefined} onPlaySelected={id=>{setPanel(null);props.onPlaySelected(id);}} onRearrange={()=>{setPanel(null);props.onRearrange();}} onEndTurn={()=>{setPanel(null);props.onEndTurn();}}/>}
   </section>
  </div>}
 </>;
};
