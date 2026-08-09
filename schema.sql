-- VoiceIntake D1 Database Schema

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intake_sessions (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    status TEXT CHECK (status IN ('active', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    buyer_type TEXT DEFAULT 'agency'
);

CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES intake_sessions(id),
    speaker TEXT CHECK (speaker IN ('user', 'ai')),
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intake_summaries (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE REFERENCES intake_sessions(id),
    project_scope TEXT,
    estimated_budget TEXT,
    timeline TEXT,
    key_requirements TEXT,
    action_items TEXT,
    raw_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
