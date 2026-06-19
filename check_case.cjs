const fs = require('fs');
const path = require('path');
const configPath = path.join('src', 'data', 'audioConfig.ts');
const mixdownDir = path.join('public', 'Mixdown');

const configContent = fs.readFileSync(configPath, 'utf8');
const filesInConfig = [];
const regex = /Mixdown\/([^\"'.]+.ogg)/g;
let match;
while ((match = regex.exec(configContent)) !== null) {
  filesInConfig.push(match[1]);
}

const filesOnDisk = fs.readdirSync(mixdownDir);
const onDiskLower = filesOnDisk.map(f => f.toLowerCase());
const missingFiles = [];
const caseMismatches = [];

filesInConfig.forEach(file => {
  if (!filesOnDisk.includes(file)) {
    const idx = onDiskLower.indexOf(file.toLowerCase());
    if (idx !== -1) {
      caseMismatches.push({ config: file, disk: filesOnDisk[idx] });
    } else {
      missingFiles.push(file);
    }
  }
});

console.log('Case mismatches:', caseMismatches);
console.log('Missing files:', missingFiles);
