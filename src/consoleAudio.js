// Sintetizador ligero de efectos sonoros retro con Web Audio API (sin archivos externos)

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone({ freqStart, freqEnd, duration = 0.06, type = 'triangle', gain = 0.055, delay = 0 }) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    }

    amp.gain.setValueAtTime(0.001, startTime);
    amp.gain.exponentialRampToValueAtTime(gain, startTime + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  } catch {
    // Ignorar silenciosamente si el navegador aún bloquea audio antes del primer gesto
  }
}

export const consoleSfx = {
  move(muted) {
    if (muted) return;
    playTone({ freqStart: 460, freqEnd: 620, duration: 0.05, type: 'triangle', gain: 0.16 });
  },
  select(muted) {
    if (muted) return;
    playTone({ freqStart: 523.25, freqEnd: 659.25, duration: 0.075, type: 'square', gain: 0.13, delay: 0 });
    playTone({ freqStart: 783.99, freqEnd: 1046.5, duration: 0.115, type: 'square', gain: 0.13, delay: 0.055 });
  },
  back(muted) {
    if (muted) return;
    playTone({ freqStart: 420, freqEnd: 260, duration: 0.085, type: 'triangle', gain: 0.16 });
  },
  switchFilter(muted) {
    if (muted) return;
    playTone({ freqStart: 660, freqEnd: 880, duration: 0.06, type: 'sine', gain: 0.16 });
  },
};
