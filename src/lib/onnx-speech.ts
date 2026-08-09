import { KokoroTTS } from 'kokoro-js';

export interface SynthesisResult {
  audioUrl: string | null;
  blob: Blob | null;
  latencyMs: number;
  engine: 'onnx_wasm' | 'webspeech' | 'server_hd';
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
      // Initialize KokoroTTS client-side in-browser WebAssembly engine
      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX';
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: 'fp32',
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

  public async synthesizeAndPlay(text: string, voiceName: string = 'am_adam', speed: number = 1.0): Promise<boolean> {
    const res = await this.synthesizeToAudio(text, voiceName, speed);
    if (res.audioUrl && res.engine === 'onnx_wasm') {
      const player = new Audio(res.audioUrl);
      await player.play();
      return true;
    }
    return false;
  }

  public async synthesizeToAudio(
    text: string, 
    voiceName: string = 'am_adam', 
    speed: number = 1.0,
    pitch: number = 1.0
  ): Promise<SynthesisResult> {
    const startTime = performance.now();

    if (!this.tts && !this.isLoading) {
      await this.initialize();
    }

    // Map persona voices to Kokoro model voice keys
    const kokoroVoiceMap: Record<string, string> = {
      gideon: 'am_adam',
      malachi: 'am_michael',
      santa_anna: 'af_nicole',
      mercy: 'af_bella',
      adam: 'am_adam',
      nicole: 'af_nicole'
    };

    const targetVoice = kokoroVoiceMap[voiceName.toLowerCase()] || voiceName || 'am_adam';

    if (this.tts && this.isReady) {
      try {
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
        console.warn('Kokoro ONNX in-browser synthesis error, falling back:', err);
      }
    }

    // WebSpeech Fallback synthesis
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
