import React, { useState, useEffect, useRef } from 'react';
import { ClientWebAssemblyVoiceEngine, SynthesisResult } from '../lib/onnx-speech';
import { 
  Play, Pause, Download, Cpu, RefreshCw, Zap, Sliders, Volume2, Sparkles, 
  Clock, Layers, FileText
} from 'lucide-react';

interface CompiledVoiceClip {
  id: string;
  text: string;
  voice: string;
  personaName: string;
  engine: string;
  speed: number;
  pitch: number;
  latencyMs: number;
  timestamp: string;
  audioUrl: string | null;
  blob: Blob | null;
}

const PRESET_PROMPTS = [
  {
    title: 'AI Development Onboarding',
    persona: 'gideon',
    text: "Welcome to DondlingerGC! We specialize in turning ambitious ideas into production-ready software using high-speed edge AI, modern PWAs, and autonomous systems."
  },
  {
    title: 'Zero-Liability Architecture (ZLA)',
    persona: 'santa_anna',
    text: "Zero-Liability Architecture protocol active. All client data and cryptographic credentials are isolated at the edge with zero persistent telemetry leak."
  },
  {
    title: 'Operator Advisor Status',
    persona: 'malachi',
    text: "Metropolis Host PC telemetry is operating within hardware bounds. Primary RTX 4060 GPU and local DuckDB archives are synchronized and ready."
  },
  {
    title: 'Client Intake Confirmation',
    persona: 'mercy',
    text: "Thank you for sharing your project specifications! I have generated your technical roadmap and estimated budget scope. Let's review the details together."
  }
];

const PERSONA_OPTIONS = [
  { id: 'gideon', name: 'Gideon (Core AI Advisor)', description: 'Authoritative male neural voice (am_adam + bm_lewis)', kokoroKey: 'am_adam', icon: '🎙️' },
  { id: 'santa_anna', name: 'Santa Anna (Edge & Tech Lead)', description: 'Crisp, articulate female voice (af_sky + af_bella)', kokoroKey: 'af_nicole', icon: '⚡' },
  { id: 'malachi', name: 'Malachi (Operator Advisor)', description: 'Deep, resonant male voice (am_michael + bm_george)', kokoroKey: 'am_michael', icon: '🛡️' },
  { id: 'mercy', name: 'Mercy (Client Specialist)', description: 'Warm, clear female voice (af_nicole + af_sarah)', kokoroKey: 'af_bella', icon: '💫' }
];

export const VoicePlayground: React.FC = () => {
  const [inputText, setInputText] = useState<string>(PRESET_PROMPTS[0].text);
  const [selectedPersona, setSelectedPersona] = useState<string>('gideon');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);

  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileProgress, setCompileProgress] = useState<number>(0);
  const [compileStepText, setCompileStepText] = useState<string>('Ready');
  const [compileElapsedMs, setCompileElapsedMs] = useState<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentClip, setCurrentClip] = useState<CompiledVoiceClip | null>(null);
  const [history, setHistory] = useState<CompiledVoiceClip[]>([]);
  const [onnxReady, setOnnxReady] = useState<boolean>(false);

  const wasmEngineRef = useRef<ClientWebAssemblyVoiceEngine | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const wasm = new ClientWebAssemblyVoiceEngine();
    wasmEngineRef.current = wasm;
    wasm.initialize().then(() => {
      setOnnxReady(wasm.getReadyState());
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isPlaying ? '#06b6d4' : '#6366f1';

      for (let x = 0; x < width; x += 4) {
        const freq = isPlaying ? Math.sin((x + step) * 0.05) * 18 * Math.cos(step * 0.1) : Math.sin(x * 0.02) * 4;
        ctx.lineTo(x, mid + freq);
      }

      ctx.stroke();
      step += isPlaying ? 3 : 0.5;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    drawWaveform();
  }, [isPlaying]);

  const handleCompileSpeech = async (overrideText?: string, overridePersona?: string) => {
    const textToCompile = (overrideText || inputText).trim();
    if (!textToCompile) return;

    const personaToUse = overridePersona || selectedPersona;
    setIsCompiling(true);
    setIsPlaying(false);
    setCompileProgress(10);
    setCompileStepText('⚡ Initializing ONNX Tensor Pipeline...');
    setCompileElapsedMs(0);

    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setCompileElapsedMs(elapsed);
      if (elapsed < 300) {
        setCompileProgress(30);
        setCompileStepText(`🎙️ Evaluating ${personaToUse.toUpperCase()} Voice Vector...`);
      } else if (elapsed < 800) {
        setCompileProgress(70);
        setCompileStepText('🌊 Synthesizing Neural WebAudio Waveform...');
      } else if (elapsed < 1400) {
        setCompileProgress(90);
        setCompileStepText('✨ Rendering High-Fidelity Audio Buffer...');
      }
    }, 100);

    try {
      if (wasmEngineRef.current) {
        const result: SynthesisResult = await wasmEngineRef.current.synthesizeToAudio(
          textToCompile,
          personaToUse,
          speed,
          pitch
        );

        clearInterval(progressTimer);
        setCompileProgress(100);
        setCompileStepText('🎉 ONNX Voice Synthesis Complete!');

        let engineLabel = 'Kokoro ONNX Neural Engine';
        if (result.engine === 'kokoro_onnx_local') engineLabel = 'Kokoro-v0.19 ONNX (Local Vector Engine)';
        else if (result.engine === 'onnx_wasm') engineLabel = 'Kokoro ONNX WASM (In-Browser)';
        else engineLabel = 'WebSpeech Native';

        const newClip: CompiledVoiceClip = {
          id: `clip-${Date.now()}`,
          text: textToCompile,
          voice: result.voice,
          personaName: PERSONA_OPTIONS.find(p => p.id === personaToUse)?.name || personaToUse,
          engine: engineLabel,
          speed,
          pitch,
          latencyMs: result.latencyMs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          audioUrl: result.audioUrl,
          blob: result.blob
        };

        setCurrentClip(newClip);
        setHistory(prev => [newClip, ...prev]);

        if (result.audioUrl) {
          playAudioUrl(result.audioUrl);
        }
      }
    } catch (err) {
      clearInterval(progressTimer);
      console.error('Speech compilation error:', err);
    } finally {
      setTimeout(() => setIsCompiling(false), 500);
    }
  };

  const playAudioUrl = (url: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const player = new Audio(url);
    audioPlayerRef.current = player;

    player.onplay = () => setIsPlaying(true);
    player.onended = () => setIsPlaying(false);
    player.onpause = () => setIsPlaying(false);

    player.play().catch(e => console.warn('Audio play error:', e));
  };

  const handleTogglePlay = () => {
    if (!audioPlayerRef.current && currentClip?.audioUrl) {
      playAudioUrl(currentClip.audioUrl);
      return;
    }

    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
    }
  };

  const handleDownloadWav = (clip: CompiledVoiceClip) => {
    if (clip.audioUrl) {
      const a = document.createElement('a');
      a.href = clip.audioUrl;
      a.download = `kokoro-onnx-${clip.personaName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Banner */}
      <div className="glass-card" style={{ padding: '24px 32px', marginBottom: '28px', borderLeft: '4px solid #06b6d4' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sparkles color="#06b6d4" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Kokoro ONNX Neural Voice <span style={{ color: '#06b6d4' }}>Compiler Studio</span>
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Synthesize custom text responses using Kokoro-v0.19 ONNX neural vectors & custom persona models (Gideon, Santa Anna, Malachi, Mercy).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="glass-pill" style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> Kokoro ONNX Engine Active
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '28px' }}>
        {/* Main Compiler Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Presets */}
          <div className="glass-card" style={{ padding: '18px 24px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} /> Fast Preset Prompts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(p.text);
                    setSelectedPersona(p.persona);
                  }}
                  className="glass-card"
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', marginBottom: '4px' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.text}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Response Input Area */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#06b6d4" /> Text Response to Synthesize
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {inputText.length} characters
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste any text response here to compile and synthesize into live ONNX neural speech..."
              rows={5}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />

            {/* Generation Counter Meter / Progress Bar */}
            {isCompiling && (
              <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw className="spin" size={14} /> {compileStepText}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'monospace' }}>
                    {compileProgress}% • {(compileElapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>

                {/* Meter Bar Container */}
                <div style={{ height: '8px', width: '100%', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.8)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${compileProgress}%`,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #06b6d4 0%, #6366f1 50%, #10b981 100%)',
                    boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)',
                    transition: 'width 0.15s ease-out'
                  }} />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#f59e0b" /> Real-time ONNX Compilation & Synthesis
              </div>

              <button
                onClick={() => handleCompileSpeech()}
                disabled={isCompiling || !inputText.trim()}
                style={{
                  padding: '12px 26px',
                  borderRadius: '12px',
                  background: isCompiling ? 'rgba(99, 102, 241, 0.4)' : 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: isCompiling ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isCompiling ? (
                  <>
                    <RefreshCw className="spin" size={18} /> Compiling ({compileProgress}%)
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Compile ONNX Voice
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Audio Waveform & Player */}
          {currentClip && (
            <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleTogglePlay}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                      {currentClip.personaName} Kokoro Audio
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span><Clock size={12} /> {currentClip.latencyMs}ms Latency</span>
                      <span>•</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{currentClip.engine}</span>
                    </div>
                  </div>
                </div>

                {currentClip.audioUrl && (
                  <button
                    onClick={() => handleDownloadWav(currentClip)}
                    className="glass-pill"
                    style={{ padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}
                  >
                    <Download size={14} /> Download WAV
                  </button>
                )}
              </div>

              {/* Canvas Waveform */}
              <canvas
                ref={canvasRef}
                width={700}
                height={60}
                style={{
                  width: '100%',
                  height: '60px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              />
            </div>
          )}
        </div>

        {/* Sidebar Controls & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Persona Voice Selector */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', letterSpacing: '0.05em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={16} /> Persona Voice Vectors
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PERSONA_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: selectedPersona === p.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedPersona === p.id ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Synthesis Fine-Tuning Sliders */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', letterSpacing: '0.05em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} /> Synthesis Parameters
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Speed Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Speed Multiplier</span>
                  <span style={{ fontWeight: 700, color: '#06b6d4' }}>{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#06b6d4' }}
                />
              </div>

              {/* Pitch Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pitch Modifier</span>
                  <span style={{ fontWeight: 700, color: '#6366f1' }}>{pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#6366f1' }}
                />
              </div>
            </div>
          </div>

          {/* Compilation History */}
          {history.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#a5b4fc', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Session Compilation Log
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {history.map((clip) => (
                  <div
                    key={clip.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{clip.personaName}</div>
                      <div style={{ color: '#10b981', fontSize: '0.72rem' }}>{clip.engine} • {clip.latencyMs}ms</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {clip.audioUrl && (
                        <button
                          onClick={() => playAudioUrl(clip.audioUrl!)}
                          style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', padding: '4px' }}
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {clip.audioUrl && (
                        <button
                          onClick={() => handleDownloadWav(clip)}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
