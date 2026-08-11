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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const personas = ['gideon', 'mercy', 'malachi', 'santa_anna'];
    const randomPersona = personas[Math.floor(Math.random() * personas.length)];

    onStartSession({
      name: name || 'Valued Client',
      company: company || 'Property Owner / Business',
      email: `${(name || 'client').toLowerCase().replace(/\s+/g, '.')}@${(company || 'property').toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '+1 (555) 000-0000',
      buyerType: 'client',
      personaVoice: randomPersona
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
            Dondlinger GC Guided Intake
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Interactive 3D Card Deck intake powered by pre-warmed voice guidance & instant PDF transcript generation.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="client-name" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
              Your Name / Business (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                id="client-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Dondlinger / Apex Properties"
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

          <button
            type="submit"
            disabled={isLoading}
            className="pulse-active"
            style={{
              padding: '18px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
              border: 'none',
              cursor: isLoading ? 'wait' : 'pointer'
            }}
          >
            <Sparkles size={22} color="#ffffff" />
            {isLoading ? 'Initializing Engine...' : 'Launch 3D Card Deck Intake'}
          </button>
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
            <Zap size={14} color="#10b981" /> Pre-Warmed WebAudio
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#06b6d4" /> 3D Glass Deck
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#a5b4fc" /> Instant PDF Download
          </span>
        </div>
      </div>
    </div>
  );
};
