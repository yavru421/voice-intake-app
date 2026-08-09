import { TranscriptMessage } from '../types/intake';
import { ClientWebAssemblyVoiceEngine } from './onnx-speech';

export interface WebRTCClientOptions {
  onTranscript: (msg: TranscriptMessage) => void;
  onStateChange: (state: string) => void;
  onAIResponse: (text: string) => void;
}

export class WebRTCVoiceClient {
  private mediaStream: MediaStream | null = null;
  private options: WebRTCClientOptions;
  private recognition: any = null;
  private isConnected: boolean = false;
  private synthesis: SpeechSynthesis | null = null;
  private wasmEngine: ClientWebAssemblyVoiceEngine;
  public hasSpeechRecognition: boolean = true;

  constructor(options: WebRTCClientOptions) {
    this.options = options;
    this.wasmEngine = new ClientWebAssemblyVoiceEngine();
    this.wasmEngine.initialize();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  public async requestMicrophone(): Promise<MediaStream> {
    try {
      this.options.onStateChange('requesting_permission');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });
      this.mediaStream = stream;
      this.options.onStateChange('connected');
      this.isConnected = true;
      this.initSpeechRecognition();
      return stream;
    } catch (err) {
      this.options.onStateChange('error');
      throw err;
    }
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser environment. Enabling text & WebAudio fallback mode.');
      this.hasSpeechRecognition = false;
      this.options.onStateChange('listening');
      return;
    }

    this.hasSpeechRecognition = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.options.onStateChange('listening');
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim().length > 0) {
        this.sendToWorkerAI(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isConnected) {
        try {
          this.recognition.start();
        } catch (e) {
          // ignore
        }
      }
    };

    this.recognition.start();
  }

  public speakDirectly(text: string, personaVoice: string = 'gideon'): void {
    this.speakText(text, personaVoice);
  }

  public async sendToWorkerAI(userPrompt: string, personaVoice: string = 'gideon', skipUserTranscript: boolean = false): Promise<void> {
    this.options.onStateChange('speaking');
    
    if (!skipUserTranscript) {
      const userMsg: TranscriptMessage = {
        id: `msg-${Date.now()}`,
        speaker: 'user',
        text: userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.options.onTranscript(userMsg);
    }

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, personaVoice })
      }).catch(() => null);

      let replyText = "";
      if (response && response.ok) {
        const data = await response.json();
        replyText = data.reply;
      } else {
        replyText = this.generateFallbackAIResponse(userPrompt);
      }

      const aiMsg: TranscriptMessage = {
        id: `ai-${Date.now()}`,
        speaker: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.options.onTranscript(aiMsg);
      this.options.onAIResponse(replyText);
      this.speakText(replyText, personaVoice);
    } catch (err) {
      console.error('AI chat route error:', err);
    } finally {
      this.options.onStateChange('listening');
    }
  }

  private async speakText(text: string, personaVoice: string = 'gideon'): Promise<void> {
    // 1. Try In-Browser Kokoro ONNX Neural Synthesis First
    try {
      const playedNeural = await this.wasmEngine.synthesizeAndPlay(text, personaVoice);
      if (playedNeural) return;
    } catch (e) {
      console.warn('In-browser Kokoro ONNX audio playback fallback:', e);
    }

    // 2. Fallback to Browser Natural HD WebSpeech Voice
    if (!this.synthesis) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }
    }

    if (this.synthesis) {
      try {
        this.synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = personaVoice === 'santa_anna' ? 1.1 : personaVoice === 'malachi' ? 0.85 : 1.0;
        utterance.volume = 1.0;
        
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          const isFemalePersona = personaVoice === 'mercy' || personaVoice === 'santa_anna';
          
          // Rank premium Natural / Neural voices first
          const matchedVoice = voices.find(v => {
            const name = v.name.toLowerCase();
            const isNatural = name.includes('natural') || name.includes('online') || name.includes('neural') || name.includes('premium') || name.includes('google');
            const matchesGender = isFemalePersona 
              ? (name.includes('female') || name.includes('jenny') || name.includes('aria') || name.includes('samantha') || name.includes('zira'))
              : (name.includes('male') || name.includes('guy') || name.includes('ryan') || name.includes('george') || name.includes('david'));
            return isNatural && matchesGender;
          }) || voices.find(v => {
            const name = v.name.toLowerCase();
            return isFemalePersona 
              ? (name.includes('female') || name.includes('jenny') || name.includes('aria') || name.includes('samantha'))
              : (name.includes('male') || name.includes('guy') || name.includes('ryan') || name.includes('david'));
          }) || voices.find(v => v.lang.startsWith('en')) || voices[0];

          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }

        this.synthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis execution warning:', e);
      }
    }
  }

  private generateFallbackAIResponse(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('start')) {
      return "Welcome! I'm your VoiceIntake AI assistant. To get started on your onboarding, could you state your full name, company, and primary project goal?";
    } else if (lower.includes('budget') || lower.includes('cost') || lower.includes('price')) {
      return "Got it. What estimated budget range or investment target have you set aside for this scope?";
    } else if (lower.includes('timeline') || lower.includes('deadline') || lower.includes('launch')) {
      return "Understood. What is your ideal launch target date or implementation timeline?";
    } else if (lower.includes('feature') || lower.includes('requirement') || lower.includes('need')) {
      return "Excellent details. Are there any critical integrations, compliance rules, or specific technical requirements we should note?";
    } else {
      return "Thank you! I've logged that. Is there anything else about your project goals or team preferences you'd like to share before I finalize your summary?";
    }
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public stop(): void {
    this.isConnected = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    if (this.synthesis) {
      try { this.synthesis.cancel(); } catch (e) {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.options.onStateChange('ended');
  }
}
