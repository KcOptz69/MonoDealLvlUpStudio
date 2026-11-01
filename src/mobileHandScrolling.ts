// Mobile horizontal browsing. Explicit property-drag mode keeps its own gestures.
const SWIPE_AREAS='.mobile-device .hand,.mobile-device .groups,.mobile-device .opponent-field,.mobile-device .fieldview-properties,.mobile-device .fieldview-cards,.mobile-device .turn-play-strip,.mobile-device .activity-cards,.mobile-device .payment-card-row,.mobile-device .chance-options,.mobile-device .donation-hand-cards,.mobile-device .bank-view-overlay .row';
export function installMobileHandScrolling(doc:Document=document){
 let gesture:{hand:HTMLElement;pointer:number;x:number;y:number;left:number;horizontal:boolean}|null=null;
 let suppressHand:HTMLElement|null=null,suppressUntil=0;
 const element=(t:EventTarget|null)=>t&&typeof (t as Element).closest==='function'?t as Element:null;
 const touch=(event:TouchEvent,id:number)=>Array.from(event.changedTouches).find(t=>t.identifier===id);
 const start=(event:TouchEvent)=>{
  gesture=null;suppressHand=null;suppressUntil=0;if(event.touches.length!==1)return;
  const origin=element(event.target);if(origin?.closest('.transfer-enabled .groupcards'))return;
  let hand=origin?.closest<HTMLElement>(SWIPE_AREAS);while(hand&&hand.scrollWidth<=hand.clientWidth+1)hand=hand.parentElement?.closest<HTMLElement>(SWIPE_AREAS);const t=event.changedTouches[0];
  if(!hand||!t||hand.scrollWidth<=hand.clientWidth+1)return;
  gesture={hand,pointer:t.identifier,x:t.clientX,y:t.clientY,left:hand.scrollLeft,horizontal:false};
 };
 const move=(event:TouchEvent)=>{
  const g=gesture;if(!g)return;const t=touch(event,g.pointer);if(!t)return;
  const dx=t.clientX-g.x,dy=t.clientY-g.y;
  if(!g.horizontal){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){gesture=null;return;}if(Math.abs(dx)<7)return;g.horizontal=true;doc.dispatchEvent(new Event('deal-hand-swipe'));doc.dispatchEvent(new Event('deal-horizontal-swipe'));}
  if(event.cancelable)event.preventDefault();
  g.hand.scrollLeft=Math.max(0,Math.min(g.hand.scrollWidth-g.hand.clientWidth,g.left-dx));
  suppressHand=g.hand;suppressUntil=Date.now()+650;
 };
 const end=(event:TouchEvent)=>{if(gesture&&touch(event,gesture.pointer)){if(gesture.horizontal){suppressHand=gesture.hand;suppressUntil=Date.now()+650;}gesture=null;}};
 const cancel=()=>{gesture=null;};
 const click=(event:MouseEvent)=>{if(suppressHand&&Date.now()<suppressUntil&&event.target instanceof Node&&suppressHand.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}};
 doc.addEventListener('touchstart',start,{capture:true,passive:true});doc.addEventListener('touchmove',move,{capture:true,passive:false});doc.addEventListener('touchend',end,true);doc.addEventListener('touchcancel',cancel,true);doc.addEventListener('click',click,true);
 return()=>{gesture=null;suppressHand=null;doc.removeEventListener('touchstart',start,true);doc.removeEventListener('touchmove',move,true);doc.removeEventListener('touchend',end,true);doc.removeEventListener('touchcancel',cancel,true);doc.removeEventListener('click',click,true);};
}
