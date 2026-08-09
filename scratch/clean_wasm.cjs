const fs = require('fs');
const path = require('path');

const distAssetsDir = path.join(__dirname, '../dist/assets');

if (fs.existsSync(distAssetsDir)) {
  const files = fs.readdirSync(distAssetsDir);
  files.forEach(file => {
    if (file.endsWith('.wasm')) {
      const wasmPath = path.join(distAssetsDir, file);
      fs.unlinkSync(wasmPath);
      console.log(`Removed large WASM binary from dist/assets to meet Cloudflare Pages 25MB limit: ${file}`);
    }
  });
}
