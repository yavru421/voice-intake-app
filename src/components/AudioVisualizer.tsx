import React, { useEffect, useRef } from 'react';
import { AudioAnalyzer } from '../lib/audio-analyzer';
import { Radio } from 'lucide-react';

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
        marginBottom: '16px',
        fontSize: '0.85rem',
        color: state === 'speaking' ? '#38bdf8' : state === 'listening' ? '#a5b4fc' : 'var(--text-muted)'
      }}>
        <Radio size={14} className={state === 'listening' || state === 'speaking' ? 'pulse-active' : ''} />
        <span>{getStatusText()}</span>
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
