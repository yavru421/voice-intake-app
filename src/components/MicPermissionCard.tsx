import React, { useState } from 'react';
import { Mic, Zap, Shield, Sparkles, User, Building2 } from 'lucide-react';
import { ClientInfo } from '../types/intake';

interface MicPermissionCardProps {
  onStartSession: (client: ClientInfo) => void;
  isLoading: boolean;
}

export const MicPermissionCard: React.FC<MicPermissionCardProps> = ({ onStartSession, isLoading }) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [personaVoice, setPersonaVoice] = useState('gideon');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSession({
      name: name || 'Valued Client',
      company: company || 'Client Organization',
      email: `${(name || 'client').toLowerCase().replace(/\s+/g, '.')}@${(company || 'company').toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '+1 (555) 000-0000',
      buyerType: 'client',
      personaVoice: personaVoice || 'gideon'
    });
  };

  return (
    <div style={{ maxWidth: '540px', margin: '50px auto 0 auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            boxShadow: '0 12px 30px rgba(99, 102, 241, 0.45)',
            marginBottom: '20px'
          }}>
            <Mic size={36} color="#ffffff" />
          </div>
          <h1 className="gradient-heading" style={{ fontSize: '2.2rem', marginBottom: '8px', fontWeight: 700 }}>
            DondlingerGC Intake
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Tell us about your project vision, features, budget, and target launch. Our AI Director will ask interactive questions to craft your complete engineering scope.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="client-name" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
              Your Name (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                id="client-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="persona-voice" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
              AI Engineering Director Persona Voice
            </label>
            <select
              id="persona-voice"
              value={personaVoice}
              onChange={(e) => setPersonaVoice(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            >
              <option value="gideon" style={{ background: '#090d16', color: '#fff' }}>🎙️ Gideon (Crisp Baritone Male - Core AI Director)</option>
              <option value="mercy" style={{ background: '#090d16', color: '#fff' }}>🎙️ Mercy (Articulate Midwest Female - Telemetry & Scoping)</option>
              <option value="malachi" style={{ background: '#090d16', color: '#fff' }}>🎙️ Malachi (Deep Executive Male - Operator Advisor)</option>
              <option value="santa_anna" style={{ background: '#090d16', color: '#fff' }}>🎙️ Santa Anna (Edge Cloud Female - Cloud Architecture)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={isLoading}
              className="pulse-active"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                border: 'none',
                cursor: isLoading ? 'wait' : 'pointer'
              }}
            >
              <Mic size={20} />
              {isLoading ? 'Connecting...' : 'Record Voice'}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isLoading ? 'wait' : 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              <Sparkles size={20} color="#06b6d4" />
              Type & Submit
            </button>
          </div>
        </form>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '28px',
          color: 'var(--text-dim)',
          fontSize: '0.8rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#06b6d4" /> Sub-200ms Latency
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#10b981" /> WebRTC Encrypted
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#a5b4fc" /> Workers AI
          </span>
        </div>
      </div>
    </div>
  );
};
