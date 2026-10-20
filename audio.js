// Web Audio API procedural sound engine for "A Jungle Full of Dinos"
// Pure synthetic audio - instant, zero latency, cheerful sounds

class JungleAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Cheerful pop & chime when a dino is discovered
  playDinoPop(pitchMultiplier = 1.0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Bubble pop
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(340 * pitchMultiplier, t);
    popOsc.frequency.exponentialRampToValueAtTime(920 * pitchMultiplier, t + 0.08);

    popGain.gain.setValueAtTime(0.3, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    popOsc.connect(popGain);
    popGain.connect(this.ctx.destination);

    popOsc.start(t);
    popOsc.stop(t + 0.12);

    // Warm wooden marimba chime
    const marimbaOsc = this.ctx.createOscillator();
    const marimbaGain = this.ctx.createGain();
    marimbaOsc.type = 'triangle';
    marimbaOsc.frequency.setValueAtTime(587.33 * pitchMultiplier, t + 0.04);

    marimbaGain.gain.setValueAtTime(0, t);
    marimbaGain.gain.setValueAtTime(0.24, t + 0.04);
    marimbaGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    marimbaOsc.connect(marimbaGain);
    marimbaGain.connect(this.ctx.destination);

    marimbaOsc.start(t + 0.04);
    marimbaOsc.stop(t + 0.4);
  }

  // Hint radar locator ping
  playHintSound() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t);
    osc.frequency.exponentialRampToValueAtTime(1318.51, t + 0.2);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Grand victory fanfare!
  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 392.00, start: 0.00, dur: 0.15 },
      { f: 523.25, start: 0.16, dur: 0.15 },
      { f: 659.25, start: 0.32, dur: 0.18 },
      { f: 783.99, start: 0.50, dur: 0.35 },
      { f: 659.25, start: 0.90, dur: 0.16 },
      { f: 783.99, start: 1.08, dur: 0.65 }
    ];

    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t + note.start);

      gain.gain.setValueAtTime(0, t + note.start);
      gain.gain.linearRampToValueAtTime(0.25, t + note.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.start + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + note.start);
      osc.stop(t + note.start + note.dur);
    });
  }
}

window.jungleAudio = new JungleAudio();
