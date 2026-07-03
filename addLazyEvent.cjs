const fs = require('fs');

let syncCode = fs.readFileSync('src/hooks/useAudioSync.ts', 'utf8');
const regex = /  \/\/ Initialize stable Audio Engine Nodes\s+useEffect\(\(\) => \{\s+const initAudio = async \(\) => \{/;

const syncReplacement = `  const [shouldInitialize, setShouldInitialize] = useState(false);

  useEffect(() => {
    const handleInit = () => setShouldInitialize(true);
    window.addEventListener('init-audio-engine', handleInit);
    return () => window.removeEventListener('init-audio-engine', handleInit);
  }, []);

  // Initialize stable Audio Engine Nodes
  useEffect(() => {
    if (!shouldInitialize) return;
    const initAudio = async () => {`;

if (regex.test(syncCode)) {
  syncCode = syncCode.replace(regex, syncReplacement);
  fs.writeFileSync('src/hooks/useAudioSync.ts', syncCode);
  console.log('Successfully patched useAudioSync.ts!');
} else {
  console.error('FAILED to find target in useAudioSync.ts');
}

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
const appRegex = /  useEffect\(\(\) => \{\s+if \(!activeRightPanel\) \{\s+setMobileTab\('roda'\);\s+\}\s+\}, \[activeRightPanel\]\);/;

const appReplacement = `  useEffect(() => {
    if (!activeRightPanel) {
      setMobileTab('roda');
    }
  }, [activeRightPanel]);

  useEffect(() => {
    if (viewMode !== 'landing' && viewMode !== 'home') {
      window.dispatchEvent(new Event('init-audio-engine'));
    }
  }, [viewMode]);`;

if (appRegex.test(appCode)) {
  appCode = appCode.replace(appRegex, appReplacement);
  fs.writeFileSync('src/App.tsx', appCode);
  console.log('Successfully patched App.tsx!');
} else {
  console.error('FAILED to find target in App.tsx');
}
