// Original procedural instrumental loops. No downloads or copyrighted recordings.
type Scene = 'menu' | 'game' | 'defending' | 'victory';
let scene: Scene = 'menu', enabled = true, ctx: AudioContext | null = null;
let master: GainNode | null = null, timer: ReturnType<typeof setInterval> | null = null;
let next = 0, step = 0;
const voices = new Set<OscillatorNode>();
try { enabled=localStorage.getItem('deal_music')!=='off'; } catch {}
export function musicEnabled(){return enabled;}
function tone(midi:number,time:number,duration:number,volume:number,type:OscillatorType='sine'){
 if(!ctx||!master)return;
 const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;
 osc.frequency.value=440*Math.pow(2,(midi-69)/12);
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.015);
 gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 osc.connect(gain);gain.connect(master);osc.start(time);osc.stop(time+duration+.03);
 voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
}
function silence(){for(const voice of voices){try{voice.stop();}catch{}}voices.clear();}
function tick(){
 if(!ctx||ctx.state!=='running'||!enabled||document.hidden)return;
 const beats=scene==='victory'?.24:scene==='defending' ? .25 : scene==='game' ? .32 : .39;
 const roots=scene==='victory'?[48,53,55,48]:scene==='defending'?[45,41,48,43]:scene==='game'?[48,45,41,43]:[48,52,45,43];
 const melody=scene==='victory'?[0,4,7,12,16,14,12,7]:scene==='defending'?[0,7,12,10,7,3,10,7]:scene==='game'?[0,4,7,12,7,4,9,7]:[7,12,16,14,12,7,9,4];
 if(next<ctx.currentTime)next=ctx.currentTime+.04;
 while(next<ctx.currentTime+.18){
  const root=roots[Math.floor(step/16)%4];
  if(step%4===0)tone(root-12,next,beats*3,.17,'triangle');
  if(step%2===0)tone(root+12+melody[(step/2)%8],next,beats*2,.075,'sine');
  if(step%8===0){tone(root+7,next,beats*7,.035);tone(root+ (scene==='defending'?3:4),next,beats*7,.035);}
  if(scene==='defending')tone(root+24+(step%2?7:0),next,beats*.55,.025,'triangle');
  if(scene==='victory'&&step%4===0){tone(root+19,next,beats*3,.07,'triangle');tone(root+24,next,beats*3,.05,'triangle');}
  step++;next+=beats;
 }
}
async function unlock(){
 if(!enabled)return;
 try { ctx ||= new AudioContext();if(!master){master=ctx.createGain();master.gain.value=.32;master.connect(ctx.destination);}
  await ctx.resume();next=ctx.currentTime+.04;if(!timer)timer=setInterval(tick,80);tick();
 }catch{}
}
export function setMusicScene(value:Scene){if(scene===value)return;scene=value;step=0;silence();if(ctx)next=ctx.currentTime+.04;}
export function setMusicEnabled(value:boolean){enabled=value;try{localStorage.setItem('deal_music',value?'on':'off');}catch{}if(value)void unlock();else silence();}
// Browsers permit audio after a gesture; re-unlock after returning to a tab.
if(typeof window!=='undefined'){
 window.addEventListener('pointerdown',()=>{if(ctx?.state!=='running')void unlock();});
 window.addEventListener('keydown',()=>{if(ctx?.state!=='running')void unlock();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){silence();void ctx?.suspend();}else{step=0;void unlock();}});
}
