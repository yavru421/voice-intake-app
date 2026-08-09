import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
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

              // Execute local speech-mcp-server python engine (C:\Miniforge\python.exe) with Kokoro ONNX
              const pythonExe = fs.existsSync('C:\\Miniforge\\python.exe') ? 'C:\\Miniforge\\python.exe' : 'python';
              const synthScript = path.normalize('C:/dev/speech-mcp-server/synth.py');
              const cleanText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
              const cmd = `"${pythonExe}" "${synthScript}" "${cleanText}" "${personaVoice}" ${speed}`;

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
                  const rawPath = match[1].trim();
                  const wavPath = path.normalize(rawPath);

                  if (fs.existsSync(wavPath)) {
                    const audioBuffer = fs.readFileSync(wavPath);
                    res.setHeader('Content-Type', 'audio/wav');
                    res.setHeader('Content-Length', audioBuffer.length);
                    res.setHeader('Cache-Control', 'no-cache');
                    res.end(audioBuffer);

                    // Asynchronously clean up scratch WAV file
                    setTimeout(() => {
                      try { if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); } catch (e) {}
                    }, 1000);
                    return;
                  }
                }

                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to generate ONNX audio' }));
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
