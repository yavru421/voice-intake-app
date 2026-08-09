// WebAudio Ringtone & Call Sound Synthesizer (Zero External Assets Required)

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private ringOsc1: OscillatorNode | null = null;
  private ringOsc2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRinging: boolean = false;

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public startRinging(): void {
    this.initCtx();
    if (!this.audioCtx || this.isRinging) return;

    this.isRinging = true;
    const now = this.audioCtx.currentTime;

    // US Ringback Tone frequencies: 440Hz + 480Hz
    this.ringOsc1 = this.audioCtx.createOscillator();
    this.ringOsc2 = this.audioCtx.createOscillator();
    this.ringGain = this.audioCtx.createGain();

    this.ringOsc1.type = 'sine';
    this.ringOsc1.frequency.setValueAtTime(440, now);

    this.ringOsc2.type = 'sine';
    this.ringOsc2.frequency.setValueAtTime(480, now);

    this.ringGain.gain.setValueAtTime(0, now);

    this.ringOsc1.connect(this.ringGain);
    this.ringOsc2.connect(this.ringGain);
    this.ringGain.connect(this.audioCtx.destination);

    this.ringOsc1.start(now);
    this.ringOsc2.start(now);

    // Pulse envelope: 2s ON, 4s OFF
    const pulseRing = () => {
      if (!this.isRinging || !this.audioCtx || !this.ringGain) return;
      const t = this.audioCtx.currentTime;
      this.ringGain.gain.setValueAtTime(0.08, t);
      this.ringGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    };

    pulseRing();
    const ringInterval = setInterval(() => {
      if (!this.isRinging) {
        clearInterval(ringInterval);
        return;
      }
      pulseRing();
    }, 3500);
  }

  public stopRinging(): void {
    this.isRinging = false;
    if (this.ringOsc1) {
      try { this.ringOsc1.stop(); } catch (e) {}
      this.ringOsc1.disconnect();
      this.ringOsc1 = null;
    }
    if (this.ringOsc2) {
      try { this.ringOsc2.stop(); } catch (e) {}
      this.ringOsc2.disconnect();
      this.ringOsc2 = null;
    }
    if (this.ringGain) {
      this.ringGain.disconnect();
      this.ringGain = null;
    }
  }

  public playCallAnswerChime(): void {
    this.initCtx();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const ringtoneSynth = new SoundSynthesizer();
