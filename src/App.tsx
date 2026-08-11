import { useState, useEffect, useRef } from 'react';
import { MicPermissionCard } from './components/MicPermissionCard';
import { PhoneCallInterface } from './components/PhoneCallInterface';
import { IntakeSummaryModal } from './components/IntakeSummaryModal';
import { WebRTCVoiceClient } from './lib/webrtc';
import { AudioAnalyzer } from './lib/audio-analyzer';
import { ringtoneSynth } from './lib/ringtone';
import { ClientInfo, TranscriptMessage, IntakeSummary } from './types/intake';
import { Shield, Cpu } from 'lucide-react';

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

  // Check URL parameters for prefilled client intake from Hub redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('client_name') || params.get('name');
      const company = params.get('company_name') || params.get('company');
      const email = params.get('contact_email') || params.get('email');
      const source = params.get('source');

      if (source || name || company) {
        setClientInfo({
          name: name || 'Valued Client',
          company: company || 'Property Owner',
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

    // Unlock browser SpeechSynthesis audio engine on user gesture
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const unlockMsg = new SpeechSynthesisUtterance('');
        unlockMsg.volume = 0.01;
        window.speechSynthesis.speak(unlockMsg);
      } catch (e) {}
    }

    // Dial chime
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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const stream = await voiceClient.requestMicrophone();
      analyzer.initialize(stream);

      ringtoneSynth.stopRinging();
      ringtoneSynth.playCallAnswerChime();

      // Initial Contracting Intake Opening Greeting
      const clientNameGreeting = client.name && client.name !== 'Valued Client' ? ` ${client.name}` : '';
      const greetingText = `Hello${clientNameGreeting}! This is Dondlinger General Contracting. Tell us about your construction, concrete, or renovation project—what are you looking to build or repair?`;
      
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
      console.error('Failed to start contracting voice session:', err);
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
      sessionId: `gc-${Math.random().toString(36).substring(2, 9)}`,
      clientInfo,
      projectScope: fullText.length > 30 
        ? fullText 
        : `Client ${clientInfo.name} from ${clientInfo.company} submitted a general contracting intake request for site assessment and scoping.`,
      estimatedBudget: fullText.toLowerCase().includes('budget') ? 'Pending Preliminary Inspection' : 'Preliminary Estimate TBD',
      timeline: fullText.toLowerCase().includes('timeline') ? 'Client Preferred Target Schedule' : '30-60 Days',
      keyRequirements: [
        'Site inspection & structural feasibility assessment',
        'Structured project scope data collection (client, site, timeline)',
        'Dondlinger GC field estimator dispatch & preliminary scope verification',
        'No binding binding quotes until live physical site walk'
      ],
      actionItems: [
        'Schedule physical site walk-through with Dondlinger GC field inspector',
        'Log structured JSON lead into Dondlinger GC telemetry data lake',
        'Send automated client intake confirmation summary'
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
              background: connectionState === 'listening' || connectionState === 'speaking' ? '#10b981' : '#06b6d4',
              boxShadow: '0 0 10px #06b6d4'
            }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              DondlingerGC<span style={{ color: '#06b6d4' }}>.VoiceIntake</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#06b6d4" /> Kokoro ONNX Audio Stream
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="#10b981" /> Direct WebAudio Pipeline
          </span>
        </div>
      </header>

      <main>
        {!clientInfo || connectionState === 'idle' ? (
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
        )}

        {isModalOpen && summary && (
          <IntakeSummaryModal summary={summary} onClose={() => setIsModalOpen(false)} />
        )}
      </main>
    </div>
  );
}
