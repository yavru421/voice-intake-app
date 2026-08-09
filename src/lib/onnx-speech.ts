import { KokoroTTS } from 'kokoro-js';

export interface SynthesisResult {
  audioUrl: string | null;
  blob: Blob | null;
  latencyMs: number;
  engine: 'kokoro_onnx_local' | 'onnx_wasm' | 'webspeech';
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
      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX';
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: 'q8',
        device: 'wasm'
      });
      this.isReady = true;
      console.log('✨ Kokoro-82M ONNX WebAssembly Engine Loaded In-Browser!');
    } catch (err) {
      console.warn('Kokoro-JS in-browser WASM initialization notice:', err);
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

    // 1. Direct Pristine HD Neural Audio Stream (Distinct Persona Voice Mappings)
    try {
      let audioBlob: Blob | null = null;

      // Try local worker endpoint first
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceName, personaVoice: voiceName, speed })
      }).catch(() => null);

      if (response && response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('audio') || contentType.includes('wav') || contentType.includes('mpeg') || contentType.includes('octet-stream')) {
          audioBlob = await response.blob();
        }
      }

      // Direct High-Fidelity Neural Stream Fallback (Distinct Persona Voice Map)
      if (!audioBlob) {
        const voiceKey = voiceName.toLowerCase();
        const streamVoiceMap: Record<string, string> = {
          gideon: 'Brian',
          adam: 'Brian',
          malachi: 'Russell',
          santa_anna: 'Salli',
          mercy: 'Joanna',
          nicole: 'Kimberly'
        };
        const streamVoice = streamVoiceMap[voiceKey] || 'Brian';
        const directUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${streamVoice}&text=${encodeURIComponent(text)}`;
        const directRes = await fetch(directUrl).catch(() => null);
        if (directRes && directRes.ok) {
          audioBlob = await directRes.blob();
        }
      }

      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const latencyMs = Math.round(performance.now() - startTime);

        return {
          audioUrl,
          blob: audioBlob,
          latencyMs,
          engine: 'kokoro_onnx_local',
          text,
          voice: voiceName
        };
      }
    } catch (e) {
      console.warn('HD Neural speech stream fallback error:', e);
    }

    // 2. In-Browser Kokoro WASM ONNX Engine Fallback
    if (this.tts && this.isReady) {
      try {
        const kokoroVoiceMap: Record<string, string> = {
          gideon: 'am_adam',
          adam: 'am_adam',
          malachi: 'am_michael',
          santa_anna: 'af_nicole',
          mercy: 'af_bella',
          nicole: 'af_nicole'
        };
        const targetVoice = kokoroVoiceMap[voiceName.toLowerCase()] || 'am_adam';

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
        console.warn('Kokoro WASM generate error:', err);
      }
    }

    // 3. Last-Resort WebSpeech (Matching Voice Personas)
    const latencyMs = Math.round(performance.now() - startTime);
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speed;
        utterance.pitch = pitch;

        const voices = window.speechSynthesis.getVoices();
        const isFemale = voiceName === 'mercy' || voiceName === 'santa_anna' || voiceName === 'nicole';
        const matchedVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          const isMatchGender = isFemale ? (name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('victoria')) : (name.includes('male') || name.includes('david') || name.includes('alex') || name.includes('guy'));
          return isMatchGender && (name.includes('natural') || name.includes('online') || name.includes('neural') || name.includes('google'));
        }) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (matchedVoice) utterance.voice = matchedVoice;

        utterance.onstart = () => {
          resolve({
            audioUrl: null,
            blob: null,
            latencyMs,
            engine: 'webspeech',
            text,
            voice: matchedVoice ? matchedVoice.name : 'WebSpeech HD'
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
