export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  company: string;
  buyerType?: string;
  personaVoice?: string;
}

export interface TranscriptMessage {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface IntakeSummary {
  sessionId: string;
  clientInfo: ClientInfo;
  projectScope: string;
  estimatedBudget: string;
  timeline: string;
  keyRequirements: string[];
  actionItems: string[];
  generatedAt: string;
}

export type ConnectionState = 'idle' | 'requesting_permission' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'ended';
