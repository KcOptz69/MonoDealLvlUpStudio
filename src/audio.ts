let soundContext: AudioContext | null = null;
let soundEnabled = true;

try {
  soundEnabled = localStorage.getItem('deal_sound') !== 'off';
} catch {}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('deal_sound', enabled ? 'on' : 'off');
  } catch {}
  if (enabled) {
    unlockAudio();
  }
}

export function unlockAudio() {
  try {
    if (!soundContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        soundContext = new AudioCtx();
      }
    }
    if (soundContext && soundContext.state === 'suspended') {
      soundContext.resume();
    }
  } catch {}
}

export function playSound(kind: 'draw' | 'property' | 'bank' | 'play' | 'charge' | 'negate' | 'payment') {
  if (!soundEnabled) return;
  unlockAudio();
  if (!soundContext || soundContext.state !== 'running') return;

  try {
    const patterns: Record<string, number[]> = {
      draw: [420, 600],
      property: [220, 330],
      bank: [880, 1200, 1600],
      play: [300, 520, 740],
      charge: [700, 950, 1200, 950],
      negate: [620, 330, 160],
      payment: [900, 1250],
    };

    const notes = patterns[kind] || patterns.play;
    const t = soundContext.currentTime;

    for (let i = 0; i < notes.length; i++) {
      const osc = soundContext.createOscillator();
      const gain = soundContext.createGain();

      osc.type = kind === 'negate' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(notes[i], t + i * 0.065);

      gain.gain.setValueAtTime(0, t + i * 0.065);
      gain.gain.linearRampToValueAtTime(0.22, t + i * 0.065 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.065 + 0.14);

      osc.connect(gain);
      gain.connect(soundContext.destination);

      osc.start(t + i * 0.065);
      osc.stop(t + i * 0.065 + 0.16);
    }
  } catch {}
}

if(typeof document!=='undefined'){document.addEventListener('pointerdown',unlockAudio,{capture:true});document.addEventListener('keydown',unlockAudio,{capture:true});}
