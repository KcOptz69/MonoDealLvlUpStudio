import React,{useEffect,useRef,useState} from 'react';
import './sidebar-chat.css';
import { CardInstance, GameState, ChatMessage } from '../types';
import { getCardDef } from '../engineBridge';
import { getCardArt, STATIC_ART } from '../cardArt';

interface SidebarRailProps {
  selectedCard: CardInstance | null;
  selectedOwner: number;
  state: GameState;
  chatMessages?: ChatMessage[];
  chatOwnSeat?: number;
  onSendChat?: (text:string)=>Promise<void>;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  selectedCard,
  selectedOwner,
  state,
  chatMessages=[],
  chatOwnSeat,
  onSendChat,
}) => {
  const [tab,setTab]=useState<'log'|'chat'>('log');
  const [draft,setDraft]=useState('');const [sending,setSending]=useState(false);const [error,setError]=useState('');const [seen,setSeen]=useState(0);const list=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(tab==='chat'){setSeen(chatMessages.at(-1)?.id||0);if(list.current)list.current.scrollTop=list.current.scrollHeight;}},[tab,chatMessages]);
  useEffect(()=>{if(!onSendChat)setTab('log');},[onSendChat]);
  const unread=chatMessages.filter(m=>m.id>seen&&(m.senderSeat!==undefined&&chatOwnSeat!==undefined?m.senderSeat!==chatOwnSeat:m.name!==state.players[0]?.name)).length;
  const send=async(e:React.FormEvent)=>{e.preventDefault();if(!draft.trim()||!onSendChat||sending)return;setSending(true);setError('');try{await onSendChat(draft.trim());setDraft('');}catch(err){setError(err instanceof Error?err.message:'Message could not be sent.');}finally{setSending(false);}};
  const def = selectedCard ? getCardDef(selectedCard) : null;

  return (
    <aside className="rail">
      <section className={`preview ${selectedCard ? 'has-card' : ''}`} id="preview">
        {selectedCard && def ? (
          <>
            <img
              src={getCardArt(selectedCard)}
              alt={def.name}
              className={selectedCard.locked ? 'has-lock' : ''}
            />

          </>
        ) : (
          <img src={STATIC_ART.card_back} alt="Card back"/>
        )}
      </section>

      <section className="log sidebar-conversation">
        {onSendChat?<div className="sidebar-conversation-tabs" role="tablist" aria-label="Match log and chat"><button role="tab" aria-selected={tab==='log'} aria-controls="desktop-match-log" onClick={()=>setTab('log')}>Match Log</button><button role="tab" aria-selected={tab==='chat'} aria-controls="desktop-room-chat" onClick={()=>setTab('chat')}>Chat{tab!=='chat'&&unread>0&&<span className="chat-unread" aria-label={`${unread} unread messages`}>{unread>99?'99+':unread}</span>}</button></div>:<h3>MATCH LOG</h3>}
        {tab==='chat'&&onSendChat?<div id="desktop-room-chat" className="desktop-chat-content" role="tabpanel"><div className="chat-messages" ref={list} role="log" aria-label="Chat messages" aria-live="polite">{chatMessages.length?chatMessages.map(m=><article key={m.id}><strong>{m.name}</strong><p>{m.text}</p></article>):<p>No messages yet.</p>}</div><form className="chat-compose" onSubmit={send}><input aria-label="Chat message" placeholder="Type a message…" maxLength={240} value={draft} onChange={e=>setDraft(e.target.value)}/><button className="gold" disabled={sending||!draft.trim()} type="submit">{sending?'…':'Send'}</button></form>{error&&<small role="alert">{error}</small>}</div>:<div id="desktop-match-log" className="desktop-log-messages" role={onSendChat?'tabpanel':undefined}>{(state.log||[]).slice(0,20).map((t,idx)=><p key={idx}>{t}</p>)}</div>}
      </section>
    </aside>
  );
};
