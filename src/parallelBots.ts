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
