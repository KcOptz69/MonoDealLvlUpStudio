const FIELDS='.player-zone .groups,.opponent-field,.fieldview-properties,.fieldview-cards';
const OWN_FIELDS='.player-zone .groups';
export function edgeScrollVelocity(x:number,left:number,right:number):number{
 const edge=Math.min(56,(right-left)/4);
 if(edge<=0)return 0;
 if(x<left+edge)return -720*Math.min(1,Math.max(0,(left+edge-x)/edge));
 if(x>right-edge)return 720*Math.min(1,Math.max(0,(x-right+edge)/edge));
 return 0;
}
export function installFieldScrolling(doc:Document=document){
 const win=doc.defaultView||window;
 let drag:{element:HTMLElement;x:number;y:number;startX:number;startY:number;pointer:number|null;active:boolean}|null=null;
 let frame=0,last=0;
 const element=(target:EventTarget|null)=>target&&typeof (target as Element).closest==='function'?target as Element:null;
 const stop=()=>{if(frame)win.cancelAnimationFrame(frame);if(drag?.pointer!==null)drag?.element.querySelectorAll('.move-target').forEach(e=>e.classList.remove('move-target'));frame=0;last=0;drag=null;};
 const clamp=(value:number,max:number)=>Math.max(0,Math.min(max,value));
 const run=(time:number)=>{
  frame=0;if(!drag||!drag.active||!drag.element.isConnected)return;
  const r=drag.element.getBoundingClientRect(),dt=last?Math.min(32,time-last):16;last=time;
  if(drag.y>=r.top-12&&drag.y<=r.bottom+12&&drag.x>=r.left-24&&drag.x<=r.right+24){
    const velocity=edgeScrollVelocity(drag.x,r.left,r.right);
    drag.element.scrollLeft=clamp(drag.element.scrollLeft+velocity*dt/1000,drag.element.scrollWidth-drag.element.clientWidth);
    if(velocity&&drag.pointer!==null){drag.element.querySelectorAll('.move-target').forEach(e=>e.classList.remove('move-target'));doc.elementFromPoint(drag.x,drag.y)?.closest('.group[data-group-id]')?.classList.add('move-target');}
  }
  frame=win.requestAnimationFrame(run);
 };
 const start=(target:EventTarget|null,x:number,y:number,pointer:number|null)=>{
  const card=element(target)?.closest<HTMLElement>('.groupcards .card[data-card-id][draggable="true"]');
  const field=card?.closest<HTMLElement>(OWN_FIELDS);
  if(!field||card?.closest('.specialgroup'))return;
  if(pointer!==null&&!card.closest('.mobile-player-overlay.transfer-enabled'))return;
  stop();drag={element:field,x,y,startX:x,startY:y,pointer,active:pointer===null};
  if(drag.active)frame=win.requestAnimationFrame(run);
 };
 const nativeStart=(e:DragEvent)=>start(e.target,e.clientX,e.clientY,null);
 const nativeMove=(e:DragEvent)=>{if(drag?.pointer!==null||!drag)return;drag.x=e.clientX;drag.y=e.clientY;if(element(e.target)?.closest(OWN_FIELDS))e.preventDefault();};
 const down=(e:PointerEvent)=>{if(e.isPrimary&&e.button===0)start(e.target,e.clientX,e.clientY,e.pointerId);};
 const move=(e:PointerEvent)=>{if(!drag||drag.pointer!==e.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;if(!drag.active&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){drag.active=true;frame=win.requestAnimationFrame(run);}};
 const wheel=(e:WheelEvent)=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||drag?.active||doc.documentElement.classList.contains('mobile-device'))return;
  const raw=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!raw)return;
  let field=element(e.target)?.closest<HTMLElement>(FIELDS);
  while(field){
    const max=field.scrollWidth-field.clientWidth,delta=raw*(e.deltaMode===1?16:e.deltaMode===2?field.clientWidth:1),before=field.scrollLeft;
    if(max>1){field.scrollLeft=clamp(before+delta,max);if(Math.abs(field.scrollLeft-before)>.1){e.preventDefault();return;}}
    field=field.parentElement?.closest<HTMLElement>(FIELDS)||null;
  }
 };
 doc.addEventListener('wheel',wheel,{passive:false});doc.addEventListener('dragstart',nativeStart,true);doc.addEventListener('dragover',nativeMove,true);
 doc.addEventListener('pointerdown',down,true);doc.addEventListener('pointermove',move,true);
 for(const event of ['dragend','drop','pointerup','pointercancel'])doc.addEventListener(event,stop,true);
 win.addEventListener('blur',stop);
 return()=>{stop();doc.removeEventListener('wheel',wheel);doc.removeEventListener('dragstart',nativeStart,true);doc.removeEventListener('dragover',nativeMove,true);doc.removeEventListener('pointerdown',down,true);doc.removeEventListener('pointermove',move,true);for(const event of ['dragend','drop','pointerup','pointercancel'])doc.removeEventListener(event,stop,true);win.removeEventListener('blur',stop);};
}
