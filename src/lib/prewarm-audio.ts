// Zero-Latency Pre-Warmed Audio Pipeline for Voice Intake PWA

class PreWarmedAudioEngine {
  private cache: Map<number, AudioBuffer> = new Map();
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Pre-warm a step's TTS audio in the background
  async prewarmStep(stepId: number, promptText: string, personaVoice: string = 'gideon'): Promise<void> {
    if (this.cache.has(stepId)) return; // Already cached!

    try {
      // 1. Try fetching from Cloudflare Edge TTS worker endpoint
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText, personaVoice })
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const ctx = this.getContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuf);
        this.cache.set(stepId, audioBuffer);
        console.log(`⚡ Pre-warmed audio for Step ${stepId} in WebAudio memory cache.`);
        return;
      }
    } catch (e) {
      console.warn(`Pre-warm fetch failed for step ${stepId}, using Web Speech Synthesis fallback`, e);
    }
  }

  // Play cached step audio with zero latency
  async playStepAudio(stepId: number, fallbackText: string, onEnd?: () => void): Promise<void> {
    this.stopCurrent();

    const cachedBuffer = this.cache.get(stepId);
    if (cachedBuffer) {
      try {
        const ctx = this.getContext();
        const source = ctx.createBufferSource();
        source.buffer = cachedBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          this.currentSource = null;
          if (onEnd) onEnd();
        };
        this.currentSource = source;
        source.start(0);
        return;
      } catch (err) {
        console.warn('WebAudio playback failed, dropping back to SpeechSynthesis', err);
      }
    }

    // Fallback: Browser SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      utterance.rate = 1.05;
      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    }
  }

  stopCurrent(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isPrewarmed(stepId: number): boolean {
    return this.cache.has(stepId);
  }
}

export const prewarmedAudio = new PreWarmedAudioEngine();
