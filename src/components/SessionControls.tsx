import React from 'react';
import { Mic, MicOff, PhoneOff, FileCheck2 } from 'lucide-react';

interface SessionControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onGenerateSummary: () => void;
  hasTranscripts: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isMuted,
  onToggleMute,
  onEndCall,
  onGenerateSummary,
  hasTranscripts
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      marginTop: '20px'
    }}>
      <button
        onClick={onToggleMute}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          border: isMuted ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
          color: isMuted ? '#ef4444' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>

      <button
        onClick={onEndCall}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)',
          transition: 'transform 0.2s ease'
        }}
        title="End Voice Intake Session"
      >
        <PhoneOff size={26} />
      </button>

      <button
        onClick={onGenerateSummary}
        disabled={!hasTranscripts}
        style={{
          padding: '0 20px',
          height: '52px',
          borderRadius: '26px',
          background: hasTranscripts ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)',
          border: hasTranscripts ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: hasTranscripts ? '#fff' : 'var(--text-dim)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: hasTranscripts ? '0 6px 20px rgba(16, 185, 129, 0.3)' : 'none',
          opacity: hasTranscripts ? 1 : 0.5,
          cursor: hasTranscripts ? 'pointer' : 'not-allowed'
        }}
      >
        <FileCheck2 size={20} /> Generate Summary
      </button>
    </div>
  );
};
