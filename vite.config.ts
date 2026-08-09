import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';
import path from 'path';

function speechAppPlugin(): Plugin {
  return {
    name: 'speech-app-proxy',
    configureServer(server) {
      server.middlewares.use('/api/speak', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { text, voice } = JSON.parse(body || '{}');
              const personaVoice = voice || 'gideon';
              const speechExe = path.normalize('C:/dev/speech-mcp-server/bin/SpeechApp.exe');

              execFile(speechExe, [text || 'Hello', personaVoice, '1.0'], (err, stdout, stderr) => {
                if (err) {
                  console.error('SpeechApp execution error:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, voice: personaVoice, output: stdout.trim() }));
              });
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), speechAppPlugin()],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  build: {
    chunkSizeWarningLimit: 2000
  },
  server: {
    port: 3000,
    host: true
  }
});
