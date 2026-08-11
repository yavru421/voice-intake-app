import React, { useState, useEffect, useRef } from 'react';
import { ClientInfo, IntakeSummary } from '../types/intake';
import { IntakeStepDraft, saveStepDraft, loadAllDrafts, clearAllDrafts } from '../lib/cache';
import { exportIntakePDF } from '../lib/pdf-exporter';
import { Mic, MicOff, Volume2, ArrowRight, ArrowLeft, CheckCircle2, Shield, Cpu, RefreshCw, Send, Download } from 'lucide-react';

interface SlideWizardInterfaceProps {
  clientInfo: ClientInfo;
  onComplete: (summary: IntakeSummary) => void;
}

interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  ttsPrompt: string;
  placeholder: string;
  badge: string;
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Client & Contact Verification",
    subtitle: "Confirm your name, company, and primary contact details for dispatch.",
    ttsPrompt: "Welcome to Dondlinger General Contracting intake! Let's verify your name, company, and primary contact info so we can set up your project site record.",
    placeholder: "e.g. John Dondlinger, Dondlinger Contracting, johndondlinger21@gmail.com, (555) 019-2831",
    badge: "Step 1 of 4"
  },
  {
    id: 2,
    title: "Project Scope & Description",
    subtitle: "Describe what we are building, inspecting, or renovating.",
    ttsPrompt: "Tell us about the project scope! What are we building, tearing down, or inspecting? Speak clearly into your mic or type out the key requirements.",
    placeholder: "e.g. Need preliminary site evaluation for a 2,500 sq ft concrete pad pour and structural framing assessment...",
    badge: "Step 2 of 4"
  },
  {
    id: 3,
    title: "Site Conditions & Target Schedule",
    subtitle: "Location, access constraints, and preferred start dates.",
    ttsPrompt: "Got it! Now, what are the site conditions, access details, and your preferred target timeline?",
    placeholder: "e.g. Site located in Milwaukee County, open utility access, looking to begin physical site walk within 14 days...",
    badge: "Step 3 of 4"
  },
  {
    id: 4,
    title: "Final Review & Edge Dispatch",
    subtitle: "Verify your intake details before sending to field telemetry.",
    ttsPrompt: "Everything looks great! Review your details below and tap Dispatch to submit your intake directly into our field system.",
    placeholder: "Additional notes or special field inspector instructions...",
    badge: "Step 4 of 4"
  }
];

export const SlideWizardInterface: React.FC<SlideWizardInterfaceProps> = ({ clientInfo, onComplete }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [drafts, setDrafts] = useState<Record<number, IntakeStepDraft>>({});
  const [currentText, setCurrentText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const audioUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load existing drafts from IndexedDB on mount
  useEffect(() => {
    loadAllDrafts().then((loaded) => {
      setDrafts(loaded);
      if (loaded[1]?.transcript) {
        setCurrentText(loaded[1].transcript);
      } else {
        // Prefill contact info into Step 1 if available
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
  }, [activeStep, drafts, clientInfo]);

  // Save draft to cache on text change
  const handleTextChange = (val: string) => {
    setCurrentText(val);
    const updatedDraft: IntakeStepDraft = {
      stepId: activeStep,
      title: STEPS[activeStep - 1].title,
      transcript: val,
      notes: '',
      updatedAt: new Date().toISOString()
    };
    saveStepDraft(updatedDraft);
    setDrafts((prev) => ({ ...prev, [activeStep]: updatedDraft }));
  };

  // Play-on-demand TTS prompt
  const handlePlayTTS = () => {
    if (isPlayingTTS) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const currentStepConfig = STEPS[activeStep - 1];
    const utterance = new SpeechSynthesisUtterance(currentStepConfig.ttsPrompt);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    audioUtteranceRef.current = utterance;
    setIsPlayingTTS(true);
    window.speechSynthesis.speak(utterance);
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
      // MediaRecorder fallback for browsers without Web Speech API (Firefox / Safari)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const note = currentText ? `${currentText}\n[Voice Audio Note Attached]` : '[Voice Audio Note Attached]';
            handleTextChange(note);
            setIsRecording(false);
          };

          recognitionRef.current = mediaRecorder;
          mediaRecorder.start();
          setIsRecording(true);
        } catch (err) {
          console.error('MediaRecorder access failed:', err);
          alert('Microphone access denied. You can type your response directly into the text box!');
          setIsRecording(false);
        }
      } else {
        alert('Audio recording is not supported in this browser. You can type directly into the text box!');
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
          if (event.results[i].isFinal) {
            final += trans + ' ';
          } else {
            interim += trans;
          }
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
      console.error('Speech recognition failed to start:', e);
      setIsRecording(false);
    }
  };

  const handleNextStep = () => {
    if (isPlayingTTS && window.speechSynthesis) window.speechSynthesis.cancel();
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsPlayingTTS(false);

    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (isPlayingTTS && window.speechSynthesis) window.speechSynthesis.cancel();
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsPlayingTTS(false);

    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleDownloadDraftPDF = () => {
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

  const stepConfig = STEPS[activeStep - 1];

  return (
    <div style={{ maxWidth: '840px', margin: '32px auto', padding: '0 20px' }}>
      {/* Progress Bar & Header Header */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '6px'
            }}>
              {stepConfig.badge}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{stepConfig.title}</h2>
          </div>

          <button
            onClick={handlePlayTTS}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: isPlayingTTS ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
              background: isPlayingTTS ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: isPlayingTTS ? '#10b981' : '#f3f4f6',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Volume2 size={18} className={isPlayingTTS ? 'animate-pulse' : ''} />
            {isPlayingTTS ? 'Stop Audio' : 'Listen Guidance'}
          </button>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {STEPS.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: s.id === activeStep ? '#06b6d4' : s.id < activeStep ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Slide Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: 0, marginBottom: '24px', lineHeight: 1.6 }}>
          {stepConfig.subtitle}
        </p>

        {activeStep < 4 ? (
          <div>
            {/* Input Controls Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase' }}>
                Your Response (Voice or Type)
              </label>

              <button
                onClick={handleToggleRecord}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: isRecording ? '1px solid #ef4444' : '1px solid rgba(6, 182, 212, 0.4)',
                  background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                  color: isRecording ? '#ef4444' : '#06b6d4',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                {isRecording ? 'Stop Recording' : 'Hold / Tap to Record'}
              </button>
            </div>

            {/* Editable Text Area */}
            <textarea
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={stepConfig.placeholder}
              rows={5}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'rgba(9, 13, 22, 0.9)',
                border: isRecording ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '1rem',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>
        ) : (
          /* Step 4 Summary & Review */
          <div>
            <div style={{
              background: 'rgba(9, 13, 22, 0.7)',
              borderRadius: '14px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} /> Verified Intake Summary
              </h4>

              {STEPS.slice(0, 3).map((s) => (
                <div key={s.id} style={{ marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {s.title}
                  </div>
                  <div style={{ color: '#fff', fontSize: '0.95rem', marginTop: '4px' }}>
                    {drafts[s.id]?.transcript || <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontStyle: 'italic' }}>No response recorded</span>}
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={currentText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Any additional notes for the field team..."
              rows={3}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(9, 13, 22, 0.9)',
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

        {/* Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
          <button
            onClick={handlePrevStep}
            disabled={activeStep === 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: activeStep === 1 ? 'rgba(255, 255, 255, 0.2)' : '#fff',
              cursor: activeStep === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>

          {activeStep < 4 ? (
            <button
              onClick={handleNextStep}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.95rem',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
              }}
            >
              Next Step <ArrowRight size={18} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleDownloadDraftPDF}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontWeight: 600,
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
                  padding: '14px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
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
  );
};
