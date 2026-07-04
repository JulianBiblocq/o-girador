const fs = require('fs');
let code = fs.readFileSync('src/components/SablierEngine.tsx', 'utf8');
code = code.replace(/if \(if \(safeGetTone\(\)\) safeGetTone\(\)!\.Transport\.state = == 'started'\)/, `if (safeGetTone()?.Transport.state === 'started')`);
fs.writeFileSync('src/components/SablierEngine.tsx', code);
console.log('Fixed SablierEngine.tsx');
