type Drop=(id:string,zone:string,color?:string,gid?:string)=>void;
type CanDrop=(id:string,zone:string,color?:string,gid?:string)=>boolean;
export function installHandDragging(drop:Drop,doc:Document=document,canDrop:CanDrop=()=>true){
 let drag:{id:string;card:HTMLElement;x:number;y:number;pointer:number;active:boolean}|null=null,ghost:HTMLElement|null=null,targets:HTMLElement|null=null,suppress=0;
 let native:{id:string;card:HTMLElement;x:number;y:number;accepted:boolean}|null=null;
 const returns=new Set<HTMLElement>();
 const reduced=()=>doc.documentElement.classList.contains('reduce')||!!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const el=(t:EventTarget|null)=>t instanceof Element?t:null;
 const zone=(t:HTMLElement)=>[t.dataset.handDrop||'field',t.dataset.groupColor,t.dataset.groupId] as const;
 const valid=(id:string,t:HTMLElement|null)=>!!t&&canDrop(id,...zone(t));
 const target=(x:number,y:number)=>doc.elementFromPoint(x,y)?.closest<HTMLElement>('[data-hand-drop],.player-zone .group[data-group-color]')||null;
 const removeMarks=()=>doc.querySelectorAll('.hand-drop-hover,.hand-drop-valid,.hand-drop-invalid,.hand-card-lifted').forEach(e=>e.classList.remove('hand-drop-hover','hand-drop-valid','hand-drop-invalid','hand-card-lifted'));
 const clear=()=>{ghost?.remove();targets?.remove();ghost=targets=null;doc.documentElement.classList.remove('hand-dragging');removeMarks();drag=null;native=null;};
 const makeGhost=(card:HTMLElement,x:number,y:number)=>{const g=doc.createElement('div');g.className='hand-drag-ghost';const image=card.querySelector('img');if(image)g.append(image.cloneNode());g.style.left=x+'px';g.style.top=y+'px';doc.body.append(g);return g;};
 const returnCard=(card:HTMLElement,x:number,y:number,g?:HTMLElement|null)=>{const image=g||makeGhost(card,x,y),r=card.getBoundingClientRect();image.classList.add('hand-drag-return');returns.add(image);
  if(reduced()||!image.animate){image.remove();returns.delete(image);return;}
  const animation=image.animate([{left:x+'px',top:y+'px',opacity:1},{left:(r.left+r.width/2)+'px',top:(r.top+r.height/2)+'px',opacity:.15}],{duration:300,easing:'ease-out',fill:'forwards'});
  const done=()=>{image.remove();returns.delete(image);};animation.onfinish=done;animation.oncancel=done;
 };
 const mark=(id:string)=>{doc.querySelectorAll<HTMLElement>('[data-hand-drop],.player-zone .group[data-group-color]').forEach(t=>t.classList.add(valid(id,t)?'hand-drop-valid':'hand-drop-invalid'));};
 const hover=(id:string,x:number,y:number)=>{doc.querySelectorAll('.hand-drop-hover').forEach(e=>e.classList.remove('hand-drop-hover'));const t=target(x,y);if(valid(id,t))t!.classList.add('hand-drop-hover');return t;};
 const finish=(id:string,t:HTMLElement|null)=>{if(valid(id,t)){doc.dispatchEvent(new Event('deal-hand-dropped'));drop(id,...zone(t!));return true;}return false;};
 const start=(e:PointerEvent)=>{if(e.pointerType==='mouse'||!e.isPrimary||e.button!==0)return;const card=el(e.target)?.closest<HTMLElement>('.hand .card[draggable="true"]');if(!card)return;drag={id:card.dataset.cardId!,card,x:e.clientX,y:e.clientY,pointer:e.pointerId,active:false};card.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent)=>{if(!drag||drag.pointer!==e.pointerId)return;if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<12)return;
  if(!drag.active){drag.active=true;doc.documentElement.classList.add('hand-dragging');drag.card.classList.add('hand-card-lifted');ghost=makeGhost(drag.card,e.clientX,e.clientY);
   targets=doc.createElement('div');targets.className='hand-drop-targets';for(const [z,label] of [['play','Play in center'],['field','Place in field'],['bank','Bank card']]){const t=doc.createElement('div');t.dataset.handDrop=z;t.textContent=label;targets.append(t);}doc.body.append(targets);mark(drag.id);
  }e.preventDefault();if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';}hover(drag.id,e.clientX,e.clientY);};
 const up=(e:PointerEvent)=>{if(!drag||drag.pointer!==e.pointerId)return;const d=drag,t=target(e.clientX,e.clientY),accepted=valid(d.id,t);if(d.active){e.preventDefault();suppress=Date.now()+600;if(!accepted&&ghost){const image=ghost;ghost=null;returnCard(d.card,e.clientX,e.clientY,image);}}clear();if(d.active&&accepted)finish(d.id,t);};
 const nativeStart=(e:DragEvent)=>{const card=el(e.target)?.closest<HTMLElement>('.hand .card[draggable="true"]');if(!card)return;native={id:card.dataset.cardId!,card,x:e.clientX,y:e.clientY,accepted:false};e.dataTransfer?.setData('application/x-deal-hand',native.id);e.dataTransfer?.setData('text/plain',native.id);card.classList.add('hand-card-lifted');mark(native.id);};
 const over=(e:DragEvent)=>{if(!native||!e.dataTransfer?.types.includes('application/x-deal-hand'))return;native.x=e.clientX;native.y=e.clientY;const t=hover(native.id,e.clientX,e.clientY);if(target(e.clientX,e.clientY)){e.preventDefault();e.dataTransfer.dropEffect=valid(native.id,t)?'move':'none';}};
 const nativeDrop=(e:DragEvent)=>{const id=e.dataTransfer?.getData('application/x-deal-hand');if(!id)return;const t=target(e.clientX,e.clientY);if(t){e.preventDefault();e.stopImmediatePropagation();if(native)native.accepted=valid(id,t);removeMarks();finish(id,t);}};
 const nativeEnd=(e:DragEvent)=>{const d=native;clear();if(d&&!d.accepted&&d.card.isConnected)returnCard(d.card,e.clientX||d.x,e.clientY||d.y);};
 const click=(e:MouseEvent)=>{if(Date.now()<suppress){e.preventDefault();e.stopImmediatePropagation();}};
 doc.addEventListener('pointerdown',start,true);doc.addEventListener('pointermove',move,{capture:true,passive:false});doc.addEventListener('pointerup',up,true);doc.addEventListener('pointercancel',clear,true);doc.addEventListener('dragstart',nativeStart,true);doc.addEventListener('dragover',over,true);doc.addEventListener('drop',nativeDrop,true);doc.addEventListener('dragend',nativeEnd,true);doc.addEventListener('click',click,true);doc.defaultView?.addEventListener('blur',clear);
 return()=>{clear();returns.forEach(el=>el.remove());returns.clear();doc.removeEventListener('pointerdown',start,true);doc.removeEventListener('pointermove',move,true);doc.removeEventListener('pointerup',up,true);doc.removeEventListener('pointercancel',clear,true);doc.removeEventListener('dragstart',nativeStart,true);doc.removeEventListener('dragover',over,true);doc.removeEventListener('drop',nativeDrop,true);doc.removeEventListener('dragend',nativeEnd,true);doc.removeEventListener('click',click,true);doc.defaultView?.removeEventListener('blur',clear);};
}
