const fs = require('fs');
const path = require('path');

// 1x1 base64 PNG data URL buffer
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync(path.join(__dirname, '../public/icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), pngBuffer);
console.log('Icons generated successfully.');
