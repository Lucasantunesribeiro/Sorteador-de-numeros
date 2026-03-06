const SOUND_MAP = {
  click:   { freq: 800,  dur: 100, type: 'sine'     },
  success: { freq: 660,  dur: 300, type: 'sine'     },
  error:   { freq: 180,  dur: 450, type: 'sawtooth' },
  flip:    { freq: 440,  dur: 150, type: 'sine'     },
  match:   { freq: 880,  dur: 280, type: 'sine'     },
  win:     { freq: 523,  dur: 700, type: 'sine'     },
  tick:    { freq: 960,  dur: 80,  type: 'square'   },
  beep:    { freq: 900,  dur: 120, type: 'square'   },
  peg:     { freq: 620,  dur: 90,  type: 'sine'     }
};

class AudioManager {
  constructor() {
    this._ctx = null;
    this.enabled = true;
  }

  init() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  play(type) {
    if (!this.enabled || !this._ctx) return;
    const s = SOUND_MAP[type] || SOUND_MAP.click;
    try {
      const osc  = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.type = s.type;
      osc.frequency.setValueAtTime(s.freq, this._ctx.currentTime);
      gain.gain.setValueAtTime(0, this._ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this._ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + s.dur / 1000);
      osc.start(this._ctx.currentTime);
      osc.stop(this._ctx.currentTime + s.dur / 1000);
    } catch { /* ignore */ }
  }

  playWin() {
    // Ascending arpeggio for win
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => {
        if (!this.enabled || !this._ctx) return;
        try {
          const osc  = this._ctx.createOscillator();
          const gain = this._ctx.createGain();
          osc.connect(gain);
          gain.connect(this._ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this._ctx.currentTime);
          gain.gain.setValueAtTime(0, this._ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.1, this._ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.35);
          osc.start(this._ctx.currentTime);
          osc.stop(this._ctx.currentTime + 0.35);
        } catch { /* ignore */ }
      }, i * 120);
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const audio = new AudioManager();
