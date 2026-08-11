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
      const res = await fetch('https://speech-webmcp.dondlingergc.com/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText, persona: personaVoice })
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
      console.warn(`Pre-warm fetch failed for step ${stepId}:`, e);
    }
  }

  // Play cached step audio with zero latency (strictly high quality studio audio)
  async playStepAudio(stepId: number, fallbackText: string, onEnd?: () => void): Promise<void> {
    this.stopCurrent();

    let cachedBuffer = this.cache.get(stepId);
    if (!cachedBuffer) {
      // Direct fetch if not yet in cache
      await this.prewarmStep(stepId, fallbackText);
      cachedBuffer = this.cache.get(stepId);
    }

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
        console.warn('WebAudio playback failed:', err);
      }
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
