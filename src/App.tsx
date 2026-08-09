import { useState, useEffect, useRef } from 'react';
import { MicPermissionCard } from './components/MicPermissionCard';
import { PhoneCallInterface } from './components/PhoneCallInterface';
import { IntakeSummaryModal } from './components/IntakeSummaryModal';
import { VoicePlayground } from './components/VoicePlayground';
import { WebRTCVoiceClient } from './lib/webrtc';
import { AudioAnalyzer } from './lib/audio-analyzer';
import { ringtoneSynth } from './lib/ringtone';
import { ClientInfo, TranscriptMessage, IntakeSummary } from './types/intake';
import { Shield, Cpu, Phone, Sparkles } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'phone' | 'playground'>('playground');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [connectionState, setConnectionState] = useState<string>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const voiceClientRef = useRef<WebRTCVoiceClient | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  // Check URL parameters for prefilled client intake from Hub redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('client_name') || params.get('name');
      const company = params.get('company_name') || params.get('company');
      const email = params.get('contact_email') || params.get('email');
      const source = params.get('source');

      if (source || name || company) {
        setActiveTab('phone');
        setClientInfo({
          name: name || 'Valued Partner',
          company: company || 'Enterprise Client',
          email: email || '',
          phone: params.get('phone') || '',
          personaVoice: 'gideon'
        });
      }
    }
  }, []);

  const handleStartSession = async (client: ClientInfo) => {
    setClientInfo(client);
    setIsLoading(true);
    setConnectionState('connecting');

    // Explicitly unlock browser SpeechSynthesis audio engine on user gesture
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const unlockMsg = new SpeechSynthesisUtterance('');
        unlockMsg.volume = 0.01;
        window.speechSynthesis.speak(unlockMsg);
      } catch (e) {}
    }

    // Start dialing ringtone sound
    ringtoneSynth.startRinging();

    const analyzer = new AudioAnalyzer();
    analyzerRef.current = analyzer;

    const voiceClient = new WebRTCVoiceClient({
      onTranscript: (msg) => {
        setTranscripts((prev) => [...prev, msg]);
      },
      onStateChange: (state) => {
        setConnectionState(state);
      },
      onAIResponse: () => {}
    });

    voiceClientRef.current = voiceClient;

    try {
      // Simulate realistic phone dialing delay before AI picks up line
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const stream = await voiceClient.requestMicrophone();
      analyzer.initialize(stream);

      // Stop ringtone and play pickup chime
      ringtoneSynth.stopRinging();
      ringtoneSynth.playCallAnswerChime();

      // Initial AI Opening Phone Greeting
      const clientNameGreeting = client.name && client.name !== 'Valued Client' ? ` ${client.name}` : '';
      const greetingText = `Welcome${clientNameGreeting}! This is DondlingerGC. We love helping people turn great ideas into real software. Tell me what you're dreaming up—what does your ideal app or tool do for you or your business?`;
      
      const greetingMsg: TranscriptMessage = {
        id: `ai-opening-${Date.now()}`,
        speaker: 'ai',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTranscripts([greetingMsg]);
      voiceClient.speakDirectly(greetingText, client.personaVoice || 'gideon');
    } catch (err) {
      ringtoneSynth.stopRinging();
      console.error('Failed to start phone call session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (text: string) => {
    if (voiceClientRef.current && clientInfo) {
      voiceClientRef.current.sendToWorkerAI(text, clientInfo.personaVoice || 'gideon');
    }
  };

  const handleToggleMute = () => {
    if (voiceClientRef.current) {
      const stream = voiceClientRef.current.getMediaStream();
      if (stream) {
        stream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
        setIsMuted(!isMuted);
      }
    }
  };

  const handleEndCall = () => {
    ringtoneSynth.stopRinging();
    if (voiceClientRef.current) voiceClientRef.current.stop();
    if (analyzerRef.current) analyzerRef.current.stop();
    setConnectionState('ended');
  };

  const handleGenerateSummary = () => {
    if (!clientInfo) return;

    const fullText = transcripts.map((t) => t.text).join(' ');

    const generatedSummary: IntakeSummary = {
      sessionId: `sess-${Math.random().toString(36).substring(2, 9)}`,
      clientInfo,
      projectScope: fullText.length > 30 
        ? fullText 
        : `Client ${clientInfo.name} from ${clientInfo.company} requests an end-to-end digital transformation and custom WebRTC/AI software implementation.`,
      estimatedBudget: fullText.toLowerCase().includes('budget') ? '$15,000 - $30,000' : '$25,000 USD',
      timeline: fullText.toLowerCase().includes('timeline') ? '4 - 6 Weeks' : '30 Days to Launch',
      keyRequirements: [
        'High-aesthetics WebRTC PWA phone interface with real-time feedback',
        'Cloudflare Workers AI edge backend integration (Llama-3 model)',
        'Cloudflare D1 identity & transcript storage schema',
        'Sub-200ms latency audio stream processing & PDF export capability'
      ],
      actionItems: [
        'Schedule technical architecture review call with core team',
        'Provision Cloudflare D1 production database & API tokens',
        'Review final scoping PDF with client for sign-off'
      ],
      generatedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };

    setSummary(generatedSummary);
    setIsModalOpen(true);
  };

  useEffect(() => {
    return () => {
      ringtoneSynth.stopRinging();
      if (voiceClientRef.current) voiceClientRef.current.stop();
      if (analyzerRef.current) analyzerRef.current.stop();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header Bar */}
      <header style={{
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: activeTab === 'playground' ? '#06b6d4' : connectionState === 'listening' || connectionState === 'speaking' ? '#10b981' : '#6366f1',
              boxShadow: '0 0 10px #06b6d4'
            }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              VoiceIntake<span style={{ color: '#06b6d4' }}>.AI</span>
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              onClick={() => setActiveTab('playground')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: activeTab === 'playground' ? 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={14} /> Voice Playground
            </button>

            <button
              onClick={() => setActiveTab('phone')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: activeTab === 'phone' ? 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Phone size={14} /> AI Phone Call Mode
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#06b6d4" /> Kokoro ONNX WASM Engine
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="#10b981" /> WebAudio Stream
          </span>
        </div>
      </header>

      {/* Main View Router */}
      <main>
        {activeTab === 'playground' ? (
          <VoicePlayground />
        ) : (
          !clientInfo || connectionState === 'idle' ? (
            <MicPermissionCard onStartSession={handleStartSession} isLoading={isLoading} />
          ) : (
            <PhoneCallInterface
              clientInfo={clientInfo}
              connectionState={connectionState}
              transcripts={transcripts}
              isMuted={isMuted}
              analyzer={analyzerRef.current}
              onToggleMute={handleToggleMute}
              onEndCall={handleEndCall}
              onGenerateSummary={handleGenerateSummary}
              onSendMessage={handleSendMessage}
            />
          )
        )}

        {/* Summary Modal */}
        {isModalOpen && summary && (
          <IntakeSummaryModal summary={summary} onClose={() => setIsModalOpen(false)} />
        )}
      </main>
    </div>
  );
}
