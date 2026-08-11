import React, { useState, useEffect } from 'react';
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2, Sparkles, FileText, Voicemail } from 'lucide-react';
import { ClientInfo, TranscriptMessage } from '../types/intake';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptView } from './TranscriptView';
import { AudioAnalyzer } from '../lib/audio-analyzer';

interface PhoneCallInterfaceProps {
  clientInfo: ClientInfo;
  connectionState: string;
  transcripts: TranscriptMessage[];
  isMuted: boolean;
  analyzer: AudioAnalyzer | null;
  onToggleMute: () => void;
  onEndCall: () => void;
  onGenerateSummary: () => void;
  onSendMessage: (text: string) => void;
}

export const PhoneCallInterface: React.FC<PhoneCallInterfaceProps> = ({
  clientInfo,
  connectionState,
  transcripts,
  isMuted,
  analyzer,
  onToggleMute,
  onEndCall,
  onGenerateSummary,
  onSendMessage
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isRecordingVoicemail, setIsRecordingVoicemail] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const handleVoicemailToggle = async () => {
    if (isRecordingVoicemail) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingVoicemail(false);
    } else {
      if (navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          
          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voicemail.webm');
            formData.append('sessionId', clientInfo.name || 'client');
            
            try {
              const response = await fetch('/api/voicemail', {
                method: 'POST',
                body: formData
              });
              const resJson = await response.json();
              if (resJson.success) {
                alert('Voicemail securely sent to Dondlinger GC!');
              } else {
                alert('Failed to send voicemail.');
              }
            } catch (err) {
              console.error('Voicemail upload failed:', err);
              alert('Error uploading voicemail.');
            }
          };
          
          mediaRecorder.start();
          setIsRecordingVoicemail(true);
        } catch (err) {
          console.error("Mic access denied", err);
          alert("Microphone access is required to leave a voicemail.");
        }
      }
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (connectionState === 'listening' || connectionState === 'speaking' || connectionState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connectionState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnecting = connectionState === 'requesting_permission' || connectionState === 'connecting';

  return (
    <div style={{ maxWidth: '680px', margin: '20px auto 0 auto', padding: '0 16px' }}>
      {/* Phone Screen Card */}
      <div className="glass-panel" style={{
        padding: '32px 28px',
        borderRadius: '28px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 13, 22, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>
        
        {/* Top Status Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isConnecting ? '#f59e0b' : '#10b981',
              boxShadow: isConnecting ? '0 0 10px #f59e0b' : '0 0 10px #10b981'
            }} />
            <span style={{ fontSize: '0.85rem', color: isConnecting ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
              {isConnecting ? 'Ringing & Dialing AI...' : `Call Active • ${formatTime(callDuration)}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Sparkles size={14} color="#06b6d4" />
            <span>HD Voice ({(clientInfo.personaVoice || 'gideon').toUpperCase()} AI)</span>
          </div>
        </div>

        {/* Call Header Avatar Ring */}
        <div style={{ textAlign: 'center', margin: '20px 0 28px 0' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className={isConnecting ? 'pulse-active' : ''} style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 12px 35px rgba(99, 102, 241, 0.5)'
            }}>
              <PhoneCall size={44} color="#ffffff" />
            </div>
          </div>

          <h2 style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>
            {clientInfo.personaVoice === 'mercy' ? 'Mercy (AI Intake Director)' :
             clientInfo.personaVoice === 'malachi' ? 'Malachi (AI Executive Director)' :
             clientInfo.personaVoice === 'santa_anna' ? 'Santa Anna (Cloud Architect AI)' :
             'Gideon (AI Engineering Director)'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {clientInfo.company} • {clientInfo.name}
          </p>
        </div>

        {/* Visualizer Waveform */}
        <AudioVisualizer analyzer={analyzer} state={connectionState} />

        {/* Real-time Call Transcript Stream */}
        <TranscriptView transcripts={transcripts} onSendMessage={onSendMessage} />

        {/* In-Call Action Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: isMuted ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isMuted ? '#f87171' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Speaker Button */}
          <button
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Speaker Active"
          >
            <Volume2 size={22} color="#38bdf8" />
          </button>

          {/* Voicemail Button */}
          <button
            onClick={handleVoicemailToggle}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: isRecordingVoicemail ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: isRecordingVoicemail ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isRecordingVoicemail ? '#f87171' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={isRecordingVoicemail ? 'Stop Recording Voicemail' : 'Leave Voicemail'}
          >
            <Voicemail size={22} />
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(239, 68, 68, 0.5)',
              transition: 'transform 0.2s ease'
            }}
            title="End Phone Call"
          >
            <PhoneOff size={26} />
          </button>

          {/* Generate Summary & PDF Report */}
          {transcripts.length > 0 && (
            <button
              onClick={onGenerateSummary}
              style={{
                padding: '0 20px',
                height: '56px',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
              }}
            >
              <FileText size={18} /> Generate PDF Scope
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
