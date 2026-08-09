# VoiceIntake AI - Real-Time Hands-Free Client Onboarding PWA

> **Tool #1 of the Metropolis WebRTC PWA Suite**  
> A zero-friction, hands-free client onboarding and intake PWA built for service providers, contractors, agencies, and high-ticket freelancers.

![VoiceIntake PWA](https://raw.githubusercontent.com/yavru421/voice-intake-app/main/public/favicon.svg)

---

## Features

- **Sub-200ms Full-Duplex Audio**: Low-latency voice conversation transport using WebRTC MediaStream & Cloudflare Workers AI edge routing.
- **Metropolis AI Persona Voice Engine**: Toggle between 5 custom persona voices:
  - **Gideon**: Core R&D / Conversational Persona
  - **Malachi**: Operator Advisor Persona
  - **Santa Anna**: Cloudflare Edge Router Persona
  - **Mercy**: Memory & Telemetry Lake Persona
  - **Orion**: Deep Synth Persona
- **WebAssembly ONNX Client Synthesis**: Client-side WebAssembly ONNX Runtime (`onnxruntime-web`) execution with hosted `.npy` voice vector distribution for $0 Cloudflare compute overhead.
- **Real-Time 60fps Audio Visualizer**: HTML5 Canvas frequency waveform visualizer powered by WebAudio API `AnalyserNode`.
- **Live Transcript Streaming**: Speech recognition transcript stream with AI vs User speech bubbles.
- **Instant Client Intake Summary & PDF Export**: Auto-generated structured project intake summary with one-click PDF report and JSON download.
- **Cloudflare D1 Database**: Identity and session storage database backing client profiles, session logs, and intake summaries.

---

## Architecture & Tech Stack

```text
┌──────────────────────────────────────────────────────────┐
│                   VoiceIntake PWA Shell                  │
│       Vite 5 + React 18 + Vanilla CSS Glassmorphism      │
└──────────────┬────────────────────────────┬──────────────┘
               │                            │
               ▼                            ▼
┌────────────────────────────┐┌────────────────────────────┐
│ Client WebAssembly ONNX    ││ Cloudflare Workers AI      │
│ (onnxruntime-web + .npy)   ││ (@cf/meta/llama-3-8b)      │
└────────────────────────────┘└─────────────┬──────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ Cloudflare D1 Database    │
                              │ (voice_intake_db)         │
                              └───────────────────────────┘
```

---

## Deployment & Local Setup

### Local Development
```bash
git clone https://github.com/yavru421/voice-intake-app.git
cd voice-intake-app
npm install
npm run dev
```

### Production Cloudflare Pages Deployment
```bash
npm run build
npx wrangler pages deploy dist --project-name=voice-intake-app
```

---

## Live Deployments
- **Cloudflare Pages Production PWA**: [https://voice-intake-pwa.pages.dev](https://voice-intake-pwa.pages.dev)
- **Cloudflare Worker API**: [https://voice-intake-worker.dondlingergeneralcontracting.workers.dev](https://voice-intake-worker.dondlingergeneralcontracting.workers.dev)
