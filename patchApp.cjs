const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const injection = `
  useEffect(() => {
    if (viewMode !== 'landing' && viewMode !== 'home') {
      window.dispatchEvent(new Event('init-audio-engine'));
    }
  }, [viewMode]);

  return (`;

if (appCode.includes('return (') && !appCode.includes('init-audio-engine')) {
  appCode = appCode.replace('  return (', injection);
  fs.writeFileSync('src/App.tsx', appCode);
  console.log('Successfully patched App.tsx!');
} else {
  console.error('FAILED to patch App.tsx (or already patched)');
}
