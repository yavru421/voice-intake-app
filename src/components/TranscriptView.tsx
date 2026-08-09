import React, { useEffect, useRef } from 'react';
import { TranscriptMessage } from '../types/intake';
import { Bot, User } from 'lucide-react';

interface TranscriptViewProps {
  transcripts: TranscriptMessage[];
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ transcripts }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: '320px',
      overflowY: 'auto',
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      {transcripts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px 0', fontSize: '0.9rem' }}>
          No conversation logged yet. Speak into your mic to start...
        </div>
      ) : (
        transcripts.map((msg) => {
          const isAI = msg.speaker === 'ai';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isAI ? 'row' : 'row-reverse',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isAI ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isAI ? <Bot size={16} color="#fff" /> : <User size={16} color="#e2e8f0" />}
              </div>

              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                background: isAI ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.07)',
                border: isAI ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.92rem',
                lineHeight: '1.4'
              }}>
                <div>{msg.text}</div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  marginTop: '4px',
                  textAlign: isAI ? 'left' : 'right'
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
};
