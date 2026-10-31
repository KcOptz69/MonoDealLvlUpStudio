// Each bot keeps its own clock while other players act or submit payments.
export class ParallelBotTimers {
  private context='';
  private timers=new Map<number,ReturnType<typeof setTimeout>>();
  sync(actors:number[],context:string,delay:()=>number,run:(actor:number)=>void){
    if(context!==this.context){this.clear();this.context=context;}
    const active=new Set(actors);
    for(const [actor,timer] of this.timers)if(!active.has(actor)){clearTimeout(timer);this.timers.delete(actor);}
    for(const actor of active)if(!this.timers.has(actor)){
      const timer=setTimeout(()=>{this.timers.delete(actor);run(actor);},delay());
      this.timers.set(actor,timer);
    }
  }
  clear(){for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();this.context='';}
}
export function parallelBotActors(game:any,isBot:(actor:number)=>boolean):number[]{
  if(game.s.winner!==null)return [];
  if(game.isSetup())return game.s.players.flatMap((p:any,i:number)=>!p.setupDone&&!p.forfeited&&isBot(i)?[i]:[]);
  const pending=game.s.pending;
  if(pending?.kind!=='payment')return [];
  return [...new Set<number>((pending.payments?.map((e:any)=>e.target)??[pending.responder]) as number[])].filter(i=>isBot(i)&&!game.p(i)?.forfeited);
}
export function parallelBotContext(game:any):string{
  if(game.isSetup())return 'setup';
  const pending=game.s.pending;
  return pending?.kind==='payment'?`payment:${game.s.turnSerial}:${pending.e?.actor}:${pending.e?.key}:${game.s.events?.filter((e:any)=>e.type==='charge').at(-1)?.seq??0}`:'none';
}

// The frontend and room server use the same presentation clock. Consecutive
// matching motions overlap; a different motion group starts after the prior one.
export class MotionClock {
  seq=0;
  until=0;
  private group='';
  constructor(private timing:Record<string,number>){}
  observe(state:any,now=Date.now()){
    if((state.eventSeq||0)<this.seq){this.seq=0;this.until=0;this.group='';}
    const fast=!!state.fastBots;
    const motion=fast?(this.timing.fastCardMotionMs??650):(this.timing.cardMotionMs??1800);
    const tail=this.timing.cardMotionTailMs??100,stagger=fast?(this.timing.fastCardStaggerMs??80):(this.timing.cardStaggerMs??220);
    for(const e of state.events||[]){
      if(e.seq<=this.seq||e.setup||state.phase==='setup'||!['play','draw','bank','property','payment','transfer','discard','donation'].includes(e.type))continue;
      const count=e.cards?.length||(e.card?1:0);if(!count)continue;
      const span=motion+Math.max(0,count-1)*stagger;
      const duration=(fast?Math.min(span,this.timing.fastCardBatchMaxMs??1100):span)+tail;
      const group=`${e.type}:${e.turnId??0}:${e.type==='payment'?e.target:''}`;
      if(group===this.group)this.until=Math.max(this.until,now+duration);
      else{this.until=Math.max(now,this.until)+duration;this.group=group;}
    }
    this.seq=state.eventSeq||0;
    return this.until;
  }
}
