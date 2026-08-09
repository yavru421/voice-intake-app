import React, { useState, useEffect } from 'react';
import { IntakeSummary } from '../types/intake';
import { exportIntakePDF, exportIntakeJSON } from '../lib/pdf-exporter';
import { FileText, Download, CheckCircle, Sparkles, X, Share2, ArrowRight, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface IntakeSummaryModalProps {
  summary: IntakeSummary;
  onClose: () => void;
}

export const IntakeSummaryModal: React.FC<IntakeSummaryModalProps> = ({ summary, onClose }) => {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [leadId, setLeadId] = useState<string | null>(null);

  const dispatchLeadPayload = async () => {
    setSubmitStatus('submitting');
    const endpoint = 'https://intake.dondlingergc.com/v1/lead';

    const payload = {
      client_name: summary.clientInfo.name || 'Valued Client',
      company_name: summary.clientInfo.company || 'Enterprise Partner',
      contact_email: summary.clientInfo.email || '',
      scope_summary: summary.projectScope,
      estimated_budget: summary.estimatedBudget,
      target_timeline: summary.timeline,
      transcript_raw: JSON.stringify(summary.keyRequirements),
      session_telemetry: {
        latency_ms: 120,
        audio_duration_sec: 45
      },
      source: 'voice_intake_app'
    };

    let retries = 3;
    while (retries > 0) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setLeadId(data.id || 'received');
          setSubmitStatus('success');
          return;
        }
      } catch (err) {
        console.warn(`Lead submission attempt failed (${retries} retries left):`, err);
      }
      retries--;
      if (retries > 0) await new Promise((r) => setTimeout(r, 1000));
    }
    setSubmitStatus('error');
  };

  useEffect(() => {
    dispatchLeadPayload();
  }, [summary]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '8px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <Sparkles size={24} color="#10b981" />
            </div>
            <div>
              <h2 className="gradient-heading" style={{ fontSize: '1.4rem' }}>
                AI Client Intake Summary
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Auto-generated via Cloudflare Workers AI edge pipeline
              </p>
            </div>
          </div>

          {/* Sync Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: submitStatus === 'success' ? 'rgba(16, 185, 129, 0.15)' : submitStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            border: `1px solid ${submitStatus === 'success' ? '#10b981' : submitStatus === 'error' ? '#ef4444' : '#06b6d4'}`,
            color: submitStatus === 'success' ? '#10b981' : submitStatus === 'error' ? '#f87171' : '#38bdf8'
          }}>
            {submitStatus === 'submitting' && <RefreshCw size={13} className="spin" />}
            {submitStatus === 'success' && <Check size={13} />}
            {submitStatus === 'error' && <AlertCircle size={13} />}
            {submitStatus === 'submitting' && 'Syncing Hub...'}
            {submitStatus === 'success' && `Hub Ingested ${leadId ? `(#${leadId.slice(0, 6)})` : ''}`}
            {submitStatus === 'error' && 'Sync Failed (Offline)'}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '16px',
          borderRadius: '16px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Client Name</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>{summary.clientInfo.name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Company</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>{summary.clientInfo.company}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Estimated Budget</div>
            <div style={{ color: '#38bdf8', fontWeight: 600 }}>{summary.estimatedBudget}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Target Timeline</div>
            <div style={{ color: '#a5b4fc', fontWeight: 600 }}>{summary.timeline}</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} color="#6366f1" /> Project Scope Overview
          </h4>
          <p style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            {summary.projectScope}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '8px' }}>
            Key Requirements
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summary.keyRequirements.map((req, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}>
                <CheckCircle size={14} color="#10b981" /> {req}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '8px' }}>
            Recommended Action Items
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {summary.actionItems.map((item, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.88rem'
              }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'inline-block'
                }} /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportIntakePDF(summary)}
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Download size={18} /> Export PDF Report
          </button>

          <a
            href="https://dondlingergc.com/?status=submitted"
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            Return to Hub <ArrowRight size={18} />
          </a>

          <button
            onClick={() => exportIntakeJSON(summary)}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Share2 size={18} /> Export JSON
          </button>
        </div>
      </div>
    </div>
  );
};
