import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile, exec } from 'child_process';
import path from 'path';
import fs from 'fs';

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
              const payload = JSON.parse(body || '{}');
              const text = payload.text || 'Hello from DondlingerGC';
              const personaVoice = payload.voice || payload.personaVoice || 'gideon';
              const speed = payload.speed || 1.0;

              // Use local python synth.py with local kokoro-v0_19.onnx and .npy presets
              const synthScript = path.normalize('C:/dev/speech-mcp-server/synth.py');
              const cmd = `python "${synthScript}" "${text.replace(/"/g, '\\"')}" "${personaVoice}" ${speed}`;

              exec(cmd, { cwd: 'C:/dev/speech-mcp-server' }, (err, stdout, stderr) => {
                if (err) {
                  console.error('synth.py execution error:', err, stderr);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }

                // Extract WAV output path from stdout: SYNTH_WAV:<file>
                const match = stdout.match(/SYNTH_WAV:(.+)/);
                if (match && match[1]) {
                  const wavPath = match[1].trim();
                  if (fs.existsSync(wavPath)) {
                    const audioBuffer = fs.readFileSync(wavPath);
                    res.setHeader('Content-Type', 'audio/wav');
                    res.setHeader('Content-Length', audioBuffer.length);
                    res.end(audioBuffer);

                    // Clean up temp file
                    try { fs.unlinkSync(wavPath); } catch (e) {}
                    return;
                  }
                }

                // Fallback if audio file not created
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
