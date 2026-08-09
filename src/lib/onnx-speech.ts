import { KokoroTTS } from 'kokoro-js';

export interface SynthesisResult {
  audioUrl: string | null;
  blob: Blob | null;
  latencyMs: number;
  engine: 'onnx_wasm' | 'kokoro_local_onnx' | 'webspeech';
  text: string;
  voice: string;
}

export class ClientWebAssemblyVoiceEngine {
  private tts: KokoroTTS | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;
    try {
      // Initialize KokoroTTS client-side with q8 quantized ONNX model (~80MB fast load)
      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX';
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: 'q8',
        device: 'wasm'
      });
      this.isReady = true;
      console.log('✨ Kokoro-82M ONNX WebAssembly Engine Loaded In-Browser!');
    } catch (err) {
      console.warn('Kokoro-JS in-browser initialization fallback:', err);
    } finally {
      this.isLoading = false;
    }
  }

  public getReadyState(): boolean {
    return this.isReady;
  }

  public getLoadingState(): boolean {
    return this.isLoading;
  }

  public async synthesizeAndPlay(text: string, voiceName: string = 'gideon', speed: number = 1.0): Promise<boolean> {
    const res = await this.synthesizeToAudio(text, voiceName, speed);
    if (res.audioUrl) {
      const player = new Audio(res.audioUrl);
      await player.play();
      return true;
    }
    return false;
  }

  public async synthesizeToAudio(
    text: string, 
    voiceName: string = 'gideon', 
    speed: number = 1.0,
    pitch: number = 1.0
  ): Promise<SynthesisResult> {
    const startTime = performance.now();

    // 1. Try In-Browser Kokoro WASM ONNX Engine if loaded
    if (this.tts && this.isReady) {
      try {
        const kokoroVoiceMap: Record<string, string> = {
          gideon: 'am_adam',
          malachi: 'am_michael',
          santa_anna: 'af_nicole',
          mercy: 'af_bella',
          adam: 'am_adam',
          nicole: 'af_nicole'
        };
        const targetVoice = kokoroVoiceMap[voiceName.toLowerCase()] || voiceName || 'am_adam';

        const audio = await this.tts.generate(text, {
          voice: targetVoice as any,
          speed: speed
        });

        if (audio) {
          const blob = audio.toBlob();
          const audioUrl = URL.createObjectURL(blob);
          const latencyMs = Math.round(performance.now() - startTime);

          return {
            audioUrl,
            blob,
            latencyMs,
            engine: 'onnx_wasm',
            text,
            voice: targetVoice
          };
        }
      } catch (err) {
        console.warn('Kokoro WASM generate error, falling back to Kokoro Local ONNX server endpoint:', err);
      }
    }

    // 2. Try Pristine Local Kokoro ONNX Server Endpoint (/api/speak with synth.py + kokoro-v0_19.onnx)
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName, personaVoice: voiceName, speed })
      }).catch(() => null);

      if (response && response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('audio')) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const latencyMs = Math.round(performance.now() - startTime);

          return {
            audioUrl,
            blob,
            latencyMs,
            engine: 'kokoro_local_onnx',
            text,
            voice: voiceName
          };
        }
      }
    } catch (e) {
      console.warn('Local Kokoro ONNX endpoint error:', e);
    }

    // 3. Fallback to WebSpeech Native Browser API if network/server is unavailable
    const latencyMs = Math.round(performance.now() - startTime);
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speed;
        utterance.pitch = pitch;

        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase())) 
          || voices.find(v => v.lang.startsWith('en')) 
          || voices[0];

        if (matchedVoice) utterance.voice = matchedVoice;

        utterance.onstart = () => {
          resolve({
            audioUrl: null,
            blob: null,
            latencyMs,
            engine: 'webspeech',
            text,
            voice: matchedVoice ? matchedVoice.name : 'WebSpeech Native'
          });
        };

        utterance.onerror = () => {
          resolve({
            audioUrl: null,
            blob: null,
            latencyMs,
            engine: 'webspeech',
            text,
            voice: 'WebSpeech Fallback'
          });
        };

        window.speechSynthesis.speak(utterance);
      } else {
        resolve({
          audioUrl: null,
          blob: null,
          latencyMs,
          engine: 'webspeech',
          text,
          voice: 'Unavailable'
        });
      }
    });
  }
}
