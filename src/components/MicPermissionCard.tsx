import React, { useState } from 'react';
import { Mic, Zap, Shield, Sparkles, Building2, User, Mail, Phone } from 'lucide-react';
import { ClientInfo } from '../types/intake';

interface MicPermissionCardProps {
  onStartSession: (client: ClientInfo) => void;
  isLoading: boolean;
}

export const MicPermissionCard: React.FC<MicPermissionCardProps> = ({ onStartSession, isLoading }) => {
  const [formData, setFormData] = useState<ClientInfo>({
    name: 'John Dondlinger',
    company: 'Apex Digital Agency',
    email: 'john@apexdigital.dev',
    phone: '+1 (555) 382-9102',
    buyerType: 'agency',
    personaVoice: 'gideon'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSession(formData);
  };

  const personaVoices = [
    { id: 'gideon', name: 'Gideon', desc: 'Core R&D / Conversational' },
    { id: 'malachi', name: 'Malachi', desc: 'Operator Advisor' },
    { id: 'santa_anna', name: 'Santa Anna', desc: 'Cloudflare Edge Router' },
    { id: 'mercy', name: 'Mercy', desc: 'Memory & Telemetry Lake' },
    { id: 'orion', name: 'Orion', desc: 'Deep Synth Voice' }
  ] as const;

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto 0 auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
            marginBottom: '16px'
          }}>
            <Mic size={32} color="#ffffff" />
          </div>
          <h1 className="gradient-heading" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            VoiceIntake AI
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Sub-200ms hands-free voice onboarding & client intake session
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
              Metropolis AI Persona Voice Engine
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {personaVoices.map((voice) => (
                <button
                  type="button"
                  key={voice.id}
                  onClick={() => setFormData({ ...formData, personaVoice: voice.id })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    textAlign: 'left',
                    border: formData.personaVoice === voice.id ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.personaVoice === voice.id ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255,255,255,0.03)',
                    color: formData.personaVoice === voice.id ? '#38bdf8' : 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{voice.name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{voice.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
              Target Buyer Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(['agency', 'contractor', 'freelancer', 'service_provider'] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({ ...formData, buyerType: type })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    border: formData.buyerType === type ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                    background: formData.buyerType === type ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: formData.buyerType === type ? '#a5b4fc' : 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="client-name" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="client-name"
                  name="fullName"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="client-company" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Company / Agency
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="client-company"
                  name="company"
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="client-email" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="client-email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="client-phone" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="client-phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="pulse-active"
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.2s ease'
            }}
          >
            <Mic size={20} />
            {isLoading ? 'Connecting to Edge Router...' : 'Enable Microphone & Start Session'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '24px',
          color: 'var(--text-dim)',
          fontSize: '0.8rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={14} color="#06b6d4" /> Sub-200ms Latency
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={14} color="#10b981" /> WebRTC Encrpyted
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} color="#a5b4fc" /> Cloudflare AI
          </span>
        </div>
      </div>
    </div>
  );
};
