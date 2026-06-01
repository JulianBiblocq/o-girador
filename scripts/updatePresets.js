import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const presetsDir = path.join(__dirname, '../public/presets');
const catalogFile = path.join(presetsDir, 'catalog.json');

try {
  // Read all files in public/presets
  const files = fs.readdirSync(presetsDir);
  
  // Filter only JSON files (excluding catalog.json itself)
  let jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'catalog.json');
  
  // Sort them: those starting with '_' (our default prefix) come first
  jsonFiles.sort((a, b) => {
    const aIsDefault = a.startsWith('_');
    const bIsDefault = b.startsWith('_');
    
    if (aIsDefault && !bIsDefault) return -1;
    if (!aIsDefault && bIsDefault) return 1;
    
    // Fallback to alphabetical sort
    return a.localeCompare(b);
  });

  // Write catalog.json
  fs.writeFileSync(catalogFile, JSON.stringify(jsonFiles, null, 2), 'utf-8');
  console.log(`[updatePresets] Catalog generated successfully with ${jsonFiles.length} presets.`);
} catch (error) {
  console.error('[updatePresets] Error generating catalog:', error);
}
