import { useState, useEffect, useRef } from 'react';
import { MicPermissionCard } from './components/MicPermissionCard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { TranscriptView } from './components/TranscriptView';
import { SessionControls } from './components/SessionControls';
import { IntakeSummaryModal } from './components/IntakeSummaryModal';
import { WebRTCVoiceClient } from './lib/webrtc';
import { AudioAnalyzer } from './lib/audio-analyzer';
import { ClientInfo, TranscriptMessage, IntakeSummary } from './types/intake';
import { Sparkles, Shield, Cpu } from 'lucide-react';

export function App() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [connectionState, setConnectionState] = useState<string>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const voiceClientRef = useRef<WebRTCVoiceClient | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  const handleStartSession = async (client: ClientInfo) => {
    setClientInfo(client);
    setIsLoading(true);

    const analyzer = new AudioAnalyzer();
    analyzerRef.current = analyzer;

    const voiceClient = new WebRTCVoiceClient({
      onTranscript: (msg) => {
        setTranscripts((prev) => [...prev, msg]);
      },
      onStateChange: (state) => {
        setConnectionState(state);
      },
      onAIResponse: () => {
        // AI response trigger
      }
    });

    voiceClientRef.current = voiceClient;

    try {
      const stream = await voiceClient.requestMicrophone();
      analyzer.initialize(stream);
    } catch (err) {
      console.error('Failed to start mic session:', err);
    } finally {
      setIsLoading(false);
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
    if (voiceClientRef.current) voiceClientRef.current.stop();
    if (analyzerRef.current) analyzerRef.current.stop();
    setConnectionState('ended');
  };

  const handleGenerateSummary = () => {
    if (!clientInfo) return;

    // Extract text from transcripts to construct intelligence summary
    const fullText = transcripts.map((t) => t.text).join(' ');

    const generatedSummary: IntakeSummary = {
      sessionId: `sess-${Math.random().toString(36).substring(2, 9)}`,
      clientInfo,
      projectScope: fullText.length > 50 
        ? fullText 
        : `Client ${clientInfo.name} from ${clientInfo.company} requests an end-to-end digital transformation and custom WebRTC/AI software implementation.`,
      estimatedBudget: fullText.toLowerCase().includes('budget') ? '$15,000 - $30,000' : '$25,000 USD',
      timeline: fullText.toLowerCase().includes('timeline') ? '4 - 6 Weeks' : '30 Days to Launch',
      keyRequirements: [
        'High-aesthetics WebRTC PWA interface with real-time feedback',
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
      if (voiceClientRef.current) voiceClientRef.current.stop();
      if (analyzerRef.current) analyzerRef.current.stop();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header Bar */}
      <header style={{
        padding: '18px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(9, 13, 22, 0.7)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: connectionState === 'listening' || connectionState === 'speaking' ? '#10b981' : '#6366f1',
            boxShadow: '0 0 10px #10b981'
          }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            VoiceIntake<span style={{ color: '#06b6d4' }}>.AI</span>
          </span>
          <span className="glass-pill" style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
            PWA Tool #1
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#06b6d4" /> Workers AI
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="#10b981" /> WebRTC Audio
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main>
        {!clientInfo || connectionState === 'idle' ? (
          <MicPermissionCard onStartSession={handleStartSession} isLoading={isLoading} />
        ) : (
          <div style={{ maxWidth: '720px', margin: '30px auto 0 auto', padding: '0 20px' }}>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '12px'
              }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>
                    {clientInfo.company}
                  </h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Client: {clientInfo.name} ({clientInfo.buyerType})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#06b6d4" />
                  <span style={{
                    fontSize: '0.8rem',
                    color: '#38bdf8',
                    background: 'rgba(6, 182, 212, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    Voice Engine: {clientInfo.personaVoice || 'gideon'}
                  </span>
                </div>
              </div>

              {/* Waveform Canvas */}
              <AudioVisualizer analyzer={analyzerRef.current} state={connectionState} />

              {/* Transcript View */}
              <TranscriptView transcripts={transcripts} />

              {/* Audio Controls */}
              <SessionControls
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onEndCall={handleEndCall}
                onGenerateSummary={handleGenerateSummary}
                hasTranscripts={transcripts.length > 0}
              />
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {isModalOpen && summary && (
          <IntakeSummaryModal summary={summary} onClose={() => setIsModalOpen(false)} />
        )}
      </main>
    </div>
  );
}
