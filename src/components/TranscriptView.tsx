import React, { useEffect, useRef, useState } from 'react';
import { TranscriptMessage } from '../types/intake';
import { Bot, User, Send } from 'lucide-react';

interface TranscriptViewProps {
  transcripts: TranscriptMessage[];
  onSendMessage?: (text: string) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ transcripts, onSendMessage }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '480px',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {transcripts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px 0', fontSize: '0.9rem' }}>
            No conversation logged yet. Speak into your mic or type below to start...
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

      {/* Input Bar */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak or type your project requirement..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: inputText.trim() ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            color: '#fff',
            cursor: inputText.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
};
