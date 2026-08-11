import React, { useEffect, useRef } from 'react';
import { AudioAnalyzer } from '../lib/audio-analyzer';
import { Radio, Zap, CheckCircle2 } from 'lucide-react';

interface AudioVisualizerProps {
  analyzer: AudioAnalyzer | null;
  state: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyzer, state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyzer) return;
    const canvas = canvasRef.current;
    
    // Set display buffer resolution
    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 120;

    const color = state === 'speaking' ? '#06b6d4' : '#6366f1';
    analyzer.drawVisualizer(canvas, color);
  }, [analyzer, state]);

  const getStatusText = () => {
    switch (state) {
      case 'listening':
        return 'Listening... Speak naturally';
      case 'speaking':
        return 'AI Assistant Speaking...';
      case 'processing':
        return 'Querying D1 Response Cache & Workers AI...';
      case 'connected':
        return 'Ready for input';
      case 'error':
        return 'Connection error';
      default:
        return 'Connecting audio stream...';
    }
  };

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '6px 14px',
        borderRadius: '20px',
        marginBottom: '12px',
        fontSize: '0.85rem',
        color: state === 'speaking' ? '#38bdf8' : state === 'listening' ? '#a5b4fc' : state === 'processing' ? '#f59e0b' : 'var(--text-muted)'
      }}>
        <Radio size={14} className={state === 'listening' || state === 'speaking' || state === 'processing' ? 'pulse-active' : ''} />
        <span>{getStatusText()}</span>
      </div>

      {/* Progress & Processing Indicator Bar */}
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto 12px auto' }}>
        <div style={{
          height: '6px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: state === 'speaking' ? '100%' : state === 'processing' ? '70%' : state === 'listening' ? '30%' : '100%',
            background: state === 'speaking' ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : state === 'processing' ? 'linear-gradient(90deg, #f59e0b, #ec4899)' : 'linear-gradient(90deg, #6366f1, #10b981)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Zap size={10} color="#06b6d4" /> Local WebAudio Cache</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={10} color="#10b981" /> D1 Database Cache Active</span>
        </div>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
        height: '120px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

