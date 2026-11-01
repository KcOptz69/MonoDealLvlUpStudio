import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './mobile.css';

interface Artwork {src:string;alt:string;inverted:boolean}
export function MobileTableOverlays({enabled,portrait}:{enabled:boolean;portrait:boolean}){
 const [artwork,setArtwork]=useState<Artwork|null>(null);
 useEffect(()=>{const closeArtwork=()=>setArtwork(null);document.addEventListener('deal-close-artwork',closeArtwork);return()=>document.removeEventListener('deal-close-artwork',closeArtwork);},[]);
 const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!enabled||portrait)setArtwork(null);},[enabled,portrait]);
 useEffect(()=>{
  if(!enabled||portrait)return;
  let timer:ReturnType<typeof setTimeout>|null=null, image:HTMLImageElement|null=null;
  let x=0,y=0,pointer=-1,held:Element|null=null,suppressUntil=0;
  const cancel=()=>{if(timer)clearTimeout(timer);timer=null;image=null;pointer=-1;};
  const findImage=(target:EventTarget|null)=>{
   if(!(target instanceof Element)||target.closest('.mobile-card-view,.mobile-rotate,.transfer-enabled .groupcards,.field-art'))return null;
   const img=target.closest('img') || target.closest('.card,button')?.querySelector('img');
   if(!(img instanceof HTMLImageElement))return null;
   // All approved cards use this artwork directory; omit the logo and hidden card back.
   const url=img.currentSrc||img.src;
   if(!url.includes('/artwork/')||/\/(logo|card_back)\./.test(url))return null;
   return img;
  };
  const down=(event:PointerEvent)=>{
   if(!event.isPrimary||event.button!==0)return;cancel();image=findImage(event.target);if(!image)return;
   x=event.clientX;y=event.clientY;pointer=event.pointerId;const target=image;
   timer=setTimeout(()=>{timer=null;if(!target.isConnected)return;held=target.closest('button,.card')||target;suppressUntil=Date.now()+1500;
    setArtwork({src:target.currentSrc||target.src,alt:target.alt||'Card artwork',inverted:target.classList.contains('inverted')});
   },450);
  };
  const move=(event:PointerEvent)=>{if(event.pointerId===pointer&&Math.hypot(event.clientX-x,event.clientY-y)>10)cancel();};
  const click=(event:MouseEvent)=>{
   if(held&&Date.now()<suppressUntil&&event.target instanceof Node&&held.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();held=null;return;}
   // Taps still select hand/payment/target choices; field artwork opens only on hold.
   if(event.target instanceof Element&&event.target.closest('.player-zone .groupcards .card,.turn-play-entry>button,.played-card-main,.played-extra,.activity-cards img')){event.preventDefault();event.stopImmediatePropagation();}
  };
  const context=(event:Event)=>{if(findImage(event.target))event.preventDefault();};
  const scroll=()=>cancel();
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,true);
  document.addEventListener('pointerup',cancel,true);document.addEventListener('pointercancel',cancel,true);
  document.addEventListener('click',click,true);document.addEventListener('contextmenu',context,true);
  document.addEventListener('dragstart',context,true);document.addEventListener('scroll',scroll,true);
  return()=>{cancel();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',cancel,true);document.removeEventListener('pointercancel',cancel,true);document.removeEventListener('click',click,true);document.removeEventListener('contextmenu',context,true);document.removeEventListener('dragstart',context,true);document.removeEventListener('scroll',scroll,true);};
 },[enabled,portrait]);
 useEffect(()=>{
  const root=document.getElementById('root');if(!root)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  root.inert=!!(portrait||artwork);
  if(artwork)close.current?.focus();
  const key=(e:KeyboardEvent)=>{if(!artwork)return;if(e.key==='Escape'){e.preventDefault();setArtwork(null);}if(e.key==='Tab'){e.preventDefault();close.current?.focus();}};
  document.addEventListener('keydown',key,true);
  return()=>{root.inert=false;document.removeEventListener('keydown',key,true);if(artwork&&previous?.isConnected)previous.focus();};
 },[artwork,portrait]);
 if(!enabled)return null;
 if(portrait)return createPortal(<div className="mobile-rotate" role="dialog" aria-modal="true" aria-label="Rotate your device"><div className="rotate-phone" aria-hidden="true">↻</div><h1>Rotate your device to play</h1><p>This game is played in landscape.</p><small>Your match stays connected.</small></div>,document.body);
 if(!artwork)return null;
 return createPortal(<div className="mobile-card-view" role="dialog" aria-modal="true" aria-label="Card artwork preview"><div className="mobile-artwork"><img src={artwork.src} alt={artwork.alt} className={artwork.inverted?'inverted':''} draggable={false}/><button ref={close} type="button" className="mobile-preview-close" aria-label="Close card preview" onClick={()=>setArtwork(null)}>×</button></div></div>,document.body);
}
