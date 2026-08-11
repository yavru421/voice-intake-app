import { useState, useEffect } from 'react';
import { MicPermissionCard } from './components/MicPermissionCard';
import { InnovativeCardDeck } from './components/InnovativeCardDeck';
import { IntakeSummaryModal } from './components/IntakeSummaryModal';
import { ClientInfo, IntakeSummary } from './types/intake';
import { Shield, Cpu, Zap } from 'lucide-react';

export function App() {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStarted, setIsStarted] = useState<boolean>(false);

  // Check URL parameters for prefilled client intake from Hub redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('client_name') || params.get('name');
      const company = params.get('company_name') || params.get('company');
      const email = params.get('contact_email') || params.get('email');

      if (name || company || email) {
        setClientInfo({
          name: name || 'Valued Client',
          company: company || 'Property Owner',
          email: email || '',
          phone: params.get('phone') || '',
          personaVoice: 'gideon'
        });
      }
    }
  }, []);

  const handleStartSession = (client: ClientInfo) => {
    setClientInfo(client);
    setIsStarted(true);
  };

  const handleCompleteIntake = (generatedSummary: IntakeSummary) => {
    setSummary(generatedSummary);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981'
            }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              DondlingerGC<span style={{ color: '#06b6d4' }}>.VoiceIntake</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={16} color="#10b981" /> Pre-Warmed WebAudio Engine
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#06b6d4" /> 3D Glassmorphism Deck
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="#10b981" /> Cloudflare Edge + IndexedDB
          </span>
        </div>
      </header>

      <main>
        {!isStarted ? (
          <MicPermissionCard onStartSession={handleStartSession} isLoading={false} />
        ) : (
          <InnovativeCardDeck
            clientInfo={clientInfo || { name: 'Valued Client', company: '', email: '', phone: '' }}
            onComplete={handleCompleteIntake}
          />
        )}

        {isModalOpen && summary && (
          <IntakeSummaryModal summary={summary} onClose={() => setIsModalOpen(false)} />
        )}
      </main>
    </div>
  );
}

