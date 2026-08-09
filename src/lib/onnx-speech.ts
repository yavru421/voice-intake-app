import { KokoroTTS } from 'kokoro-js';

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

  public async synthesizeAndPlay(text: string, voiceName: string = 'am_adam'): Promise<boolean> {
    if (!this.tts || !this.isReady) {
      await this.initialize();
    }

    if (!this.tts) return false;

    try {
      // Synthesize directly in-browser using Kokoro neural ONNX model
      const audio = await this.tts.generate(text, {
        voice: voiceName === 'mercy' ? 'af_nicole' : 'am_adam',
        speed: 1.0
      });

      if (audio) {
        // Stream audio via WebAudio AudioBuffer / HTML5 Audio
        const blob = audio.toBlob();
        const url = URL.createObjectURL(blob);
        const player = new Audio(url);
        await player.play();
        return true;
      }
    } catch (err) {
      console.error('Kokoro-JS synthesis error:', err);
    }
    return false;
  }
}
