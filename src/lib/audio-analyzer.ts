export class AudioAnalyzer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animId: number | null = null;
  private dataArray: Uint8Array | null = null;

  public initialize(stream: MediaStream): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  public drawVisualizer(canvas: HTMLCanvasElement, color: string = '#6366f1'): void {
    if (!this.analyser || !this.dataArray) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      this.animId = requestAnimationFrame(render);
      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray as any);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const barCount = this.dataArray.length;
      const barWidth = (width / barCount) * 0.7;
      let x = (width - (barCount * (barWidth + 4))) / 2;

      for (let i = 0; i < barCount; i++) {
        const barHeight = (this.dataArray[i] / 255) * (height * 0.8) + 4;

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, '#818cf8');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;

        // Draw rounded bars centered on Y
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 6);
        ctx.fill();

        x += barWidth + 4;
      }
    };

    render();
  }

  public getVolumeLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray as any);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return Math.min(100, Math.round((sum / (this.dataArray.length * 255)) * 100));
  }

  public stop(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.source) this.source.disconnect();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.animId = null;
  }
}
