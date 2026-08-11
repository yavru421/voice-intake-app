import React, { useState, useEffect, useRef } from 'react';
import { ClientInfo, IntakeSummary } from '../types/intake';
import { IntakeStepDraft, saveStepDraft, loadAllDrafts, clearAllDrafts } from '../lib/cache';
import { prewarmedAudio } from '../lib/prewarm-audio';
import { exportIntakePDF } from '../lib/pdf-exporter';
import { Mic, MicOff, Volume2, ArrowRight, ArrowLeft, CheckCircle2, Shield, Cpu, RefreshCw, Send, Download, Zap, Sparkles, Layers } from 'lucide-react';

interface InnovativeCardDeckProps {
  clientInfo: ClientInfo;
  onComplete: (summary: IntakeSummary) => void;
}

interface QuestionCard {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  ttsPrompt: string;
  placeholder: string;
  accentColor: string;
}

const CARDS: QuestionCard[] = [
  {
    id: 1,
    badge: "01 / Identity Verification",
    title: "Client & Contact Verification",
    subtitle: "Confirm your name, organization, and primary contact details for dispatch.",
    ttsPrompt: "Welcome to Dondlinger General Contracting! Let's verify your name, company, and contact details.",
    placeholder: "e.g. John Dondlinger, Snaptempo Systems, johndondlinger21@gmail.com",
    accentColor: "#06b6d4"
  },
  {
    id: 2,
    badge: "02 / Project Scoping",
    title: "Project Scope & Requirements",
    subtitle: "Describe what we are building, tearing down, or inspecting.",
    ttsPrompt: "Tell us about your project scope! Speak into your mic or type out the structural details.",
    placeholder: "e.g. 2,500 sq ft concrete pad pour, structural framing, and preliminary site feasibility walk...",
    accentColor: "#3b82f6"
  },
  {
    id: 3,
    badge: "03 / Site & Schedule",
    title: "Site Conditions & Target Timeline",
    subtitle: "Specify location, access constraints, and preferred start dates.",
    ttsPrompt: "Got it! Now, what are the site conditions, access details, and your target start schedule?",
    placeholder: "e.g. Milwaukee County site, open vehicle access, preferred site walk within 14 days...",
    accentColor: "#8b5cf6"
  },
  {
    id: 4,
    badge: "04 / Field Dispatch",
    title: "Final Review & Instant Dispatch",
    subtitle: "Verify your intake details before sending to field telemetry.",
    ttsPrompt: "Everything is set! Review your summary below and tap Dispatch to notify our field team.",
    placeholder: "Any special instructions or site access notes for the inspector...",
    accentColor: "#10b981"
  }
];

export const InnovativeCardDeck: React.FC<InnovativeCardDeckProps> = ({ clientInfo, onComplete }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [drafts, setDrafts] = useState<Record<number, IntakeStepDraft>>({});
  const [currentText, setCurrentText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Pre-warm next step's audio in the background on mount & step change
  useEffect(() => {
    CARDS.forEach((card) => {
      prewarmedAudio.prewarmStep(card.id, card.ttsPrompt, clientInfo.personaVoice || 'gideon');
    });

    loadAllDrafts().then((loaded) => {
      setDrafts(loaded);
      if (loaded[1]?.transcript) {
        setCurrentText(loaded[1].transcript);
      } else {
        const prefill = `${clientInfo.name || ''}${clientInfo.company ? ' (' + clientInfo.company + ')' : ''}${clientInfo.email ? ' - ' + clientInfo.email : ''}`;
        setCurrentText(prefill.trim());
      }
    });
  }, [clientInfo]);

  // Sync text when activeStep changes
  useEffect(() => {
    const existing = drafts[activeStep]?.transcript || '';
    if (existing) {
      setCurrentText(existing);
    } else if (activeStep === 1) {
      const prefill = `${clientInfo.name || ''}${clientInfo.company ? ' (' + clientInfo.company + ')' : ''}${clientInfo.email ? ' - ' + clientInfo.email : ''}`;
      setCurrentText(prefill.trim());
    } else {
      setCurrentText('');
    }

    // Pre-warm step active and next step
    const currentCard = CARDS[activeStep - 1];
    prewarmedAudio.prewarmStep(currentCard.id, currentCard.ttsPrompt);
    if (activeStep < 4) {
      const nextCard = CARDS[activeStep];
      prewarmedAudio.prewarmStep(nextCard.id, nextCard.ttsPrompt);
    }
  }, [activeStep, drafts, clientInfo]);

  // Ambient Canvas Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      phase += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const color = CARDS[activeStep - 1].accentColor;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;

      const barCount = 32;
      const barWidth = canvas.width / barCount;

      for (let i = 0; i < barCount; i++) {
        const factor = isRecording ? Math.sin(phase + i * 0.3) * 18 + 22 : isPlayingAudio ? Math.cos(phase + i * 0.4) * 14 + 16 : Math.sin(phase + i * 0.1) * 4 + 6;
        const x = i * barWidth;
        const y = (canvas.height - factor) / 2;
        ctx.fillRect(x + 2, y, barWidth - 4, factor);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeStep, isRecording, isPlayingAudio]);

  const handleTextChange = (val: string) => {
    setCurrentText(val);
    const updated: IntakeStepDraft = {
      stepId: activeStep,
      title: CARDS[activeStep - 1].title,
      transcript: val,
      notes: '',
      updatedAt: new Date().toISOString()
    };
    saveStepDraft(updated);
    setDrafts((prev) => ({ ...prev, [activeStep]: updated }));
  };

  // Play pre-warmed step audio with 0ms delay
  const handlePlayPrewarmedAudio = () => {
    if (isPlayingAudio) {
      prewarmedAudio.stopCurrent();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const card = CARDS[activeStep - 1];
    prewarmedAudio.playStepAudio(card.id, card.ttsPrompt, () => {
      setIsPlayingAudio(false);
    });
  };

  // Toggle STT Recording or MediaRecorder Fallback
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            const note = currentText ? `${currentText}\n[Voice Audio Note Attached]` : '[Voice Audio Note Attached]';
            handleTextChange(note);
            setIsRecording(false);
          };

          recognitionRef.current = mediaRecorder;
          mediaRecorder.start();
          setIsRecording(true);
        } catch (err) {
          alert('Microphone access denied. You can type directly into the text box!');
          setIsRecording(false);
        }
      } else {
        alert('Audio recording not supported in this browser environment. You can type directly into the text box!');
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let accumulated = currentText;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += trans + ' ';
          else interim += trans;
        }
        const updated = (accumulated + ' ' + final + interim).replace(/\s+/g, ' ').trim();
        handleTextChange(updated);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  };

  const handleNextStep = () => {
    prewarmedAudio.stopCurrent();
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsPlayingAudio(false);

    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    prewarmedAudio.stopCurrent();
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsPlayingAudio(false);

    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleDownloadPDF = () => {
    const step1 = drafts[1]?.transcript || clientInfo.name || 'Valued Client';
    const step2 = drafts[2]?.transcript || 'General contracting project intake';
    const step3 = drafts[3]?.transcript || 'Standard timeline';
    const step4 = drafts[4]?.transcript || 'No additional notes';

    const draftSummary: IntakeSummary = {
      sessionId: `gc-${Math.random().toString(36).substring(2, 9)}`,
      clientInfo: {
        ...clientInfo,
        name: clientInfo.name || 'Valued Client',
        company: clientInfo.company || 'Property Owner'
      },
      projectScope: step2,
      estimatedBudget: 'Preliminary Site Walk Required',
      timeline: step3,
      keyRequirements: [
        `Contact Info: ${step1}`,
        `Project Scope: ${step2}`,
        `Site & Schedule: ${step3}`,
        `Notes: ${step4}`
      ],
      actionItems: [
        'Dispatch field estimator for physical site walk',
        'Persist intake telemetry into mind.duckdb',
        'Send client intake confirmation summary'
      ],
      generatedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };

    exportIntakePDF(draftSummary);
  };

  const handleSubmitIntake = async () => {
    setIsSubmitting(true);
    const step1 = drafts[1]?.transcript || clientInfo.name || 'Valued Client';
    const step2 = drafts[2]?.transcript || 'General contracting project intake';
    const step3 = drafts[3]?.transcript || 'Standard timeline';
    const step4 = drafts[4]?.transcript || 'No additional notes';

    const generatedSummary: IntakeSummary = {
      sessionId: `gc-${Math.random().toString(36).substring(2, 9)}`,
      clientInfo: {
        ...clientInfo,
        name: clientInfo.name || 'Valued Client',
        company: clientInfo.company || 'Property Owner'
      },
      projectScope: step2,
      estimatedBudget: 'Preliminary Site Walk Required',
      timeline: step3,
      keyRequirements: [
        `Contact Info: ${step1}`,
        `Project Scope: ${step2}`,
        `Site & Schedule: ${step3}`,
        `Notes: ${step4}`
      ],
      actionItems: [
        'Dispatch field estimator for physical site walk',
        'Persist intake telemetry into mind.duckdb',
        'Send client intake confirmation summary'
      ],
      generatedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };

    await clearAllDrafts();
    setIsSubmitting(false);
    onComplete(generatedSummary);
  };

  const card = CARDS[activeStep - 1];
  const isPrewarmed = prewarmedAudio.isPrewarmed(card.id);

  return (
    <div style={{ maxWidth: '880px', margin: '24px auto', padding: '0 20px' }}>
      {/* 3D Floating Deck Container */}
      <div style={{ position: 'relative', perspective: '1200px' }}>
        
        {/* Top Floating Badge & Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '0 8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: `rgba(${card.accentColor}, 0.15)`,
              border: `1px solid ${card.accentColor}`,
              color: card.accentColor,
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Layers size={14} /> {card.badge}
            </div>

            {isPrewarmed && (
              <span style={{
                fontSize: '0.78rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '4px 10px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}>
                <Zap size={12} /> Audio Pre-Warmed (0ms Delay)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {CARDS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveStep(c.id)}
                style={{
                  width: c.id === activeStep ? '32px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  border: 'none',
                  background: c.id === activeStep ? card.accentColor : 'rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Ambient Canvas Waveform Bar */}
        <canvas
          ref={canvasRef}
          width={840}
          height={32}
          style={{
            width: '100%',
            height: '32px',
            marginBottom: '12px',
            borderRadius: '8px'
          }}
        />

        {/* Dynamic 3D Card Stack */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          padding: '36px',
          border: `1px solid ${card.accentColor}40`,
          boxShadow: `0 30px 60px -15px ${card.accentColor}25, 0 0 40px rgba(0, 0, 0, 0.5)`,
          transformStyle: 'preserve-3d',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                {card.title}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', margin: 0, lineHeight: 1.5 }}>
                {card.subtitle}
              </p>
            </div>

            <button
              onClick={handlePlayPrewarmedAudio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '14px',
                border: `1px solid ${isPlayingAudio ? '#10b981' : card.accentColor}`,
                background: isPlayingAudio ? 'rgba(16, 185, 129, 0.2)' : `rgba(6, 182, 212, 0.12)`,
                color: isPlayingAudio ? '#10b981' : card.accentColor,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <Volume2 size={18} className={isPlayingAudio ? 'animate-pulse' : ''} />
              {isPlayingAudio ? 'Stop Guidance' : 'Instant Voice Prompt'}
            </button>
          </div>

          {activeStep < 4 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Response (Voice or Type)
                </label>

                <button
                  onClick={handleToggleRecord}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: isRecording ? '1px solid #ef4444' : `1px solid ${card.accentColor}`,
                    background: isRecording ? 'rgba(239, 68, 68, 0.25)' : `rgba(6, 182, 212, 0.15)`,
                    color: isRecording ? '#ef4444' : card.accentColor,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  {isRecording ? 'Stop Recording' : 'Hold / Tap to Record'}
                </button>
              </div>

              <textarea
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={card.placeholder}
                rows={5}
                style={{
                  width: '100%',
                  padding: '18px',
                  borderRadius: '16px',
                  background: 'rgba(9, 13, 22, 0.95)',
                  border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                }}
              />
            </div>
          ) : (
            /* Step 4 Review & Final Dispatch */
            <div>
              <div style={{
                background: 'rgba(9, 13, 22, 0.8)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <CheckCircle2 size={22} /> Verified Intake Deck Payload
                </h4>

                {CARDS.slice(0, 3).map((s) => (
                  <div key={s.id} style={{ marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {s.title}
                    </div>
                    <div style={{ color: '#fff', fontSize: '1rem', marginTop: '4px' }}>
                      {drafts[s.id]?.transcript || <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic' }}>No response recorded</span>}
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                value={currentText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Special field notes or inspector instructions..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'rgba(9, 13, 22, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Footer Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
            <button
              onClick={handlePrevStep}
              disabled={activeStep === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: activeStep === 1 ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                cursor: activeStep === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              <ArrowLeft size={18} /> Previous Card
            </button>

            {activeStep < 4 ? (
              <button
                onClick={handleNextStep}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 32px',
                  borderRadius: '14px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${card.accentColor}, #3b82f6)`,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: `0 4px 18px ${card.accentColor}50`
                }}
              >
                Next Card <ArrowRight size={18} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 24px',
                    borderRadius: '14px',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                  }}
                >
                  <Download size={18} /> Download PDF Transcript
                </button>

                <button
                  onClick={handleSubmitIntake}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 36px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)'
                  }}
                >
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Intake Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
