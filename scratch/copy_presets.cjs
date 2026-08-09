const fs = require('fs');
const path = require('path');

const srcDir = 'C:/dev/speech-mcp-server/presets';
const destDir = 'C:/dev/voice-intake-pwa/public/voices';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const presets = ['gideon.npy', 'malachi.npy', 'santa_anna.npy', 'mercy.npy', 'orion.npy'];

presets.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> ${dest}`);
  } else {
    console.warn(`Source preset not found: ${src}`);
  }
});
