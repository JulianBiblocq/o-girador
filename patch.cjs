const fs = require('fs');
let c = fs.readFileSync('src/stores/useSequencerStore.ts', 'utf8');

const props = [
  'TotalMeasures',
  'SongSections',
  'MeasureTimeSigs',
  'LoopStartMeasure',
  'LoopEndMeasure',
  'IsLoopRegionActive'
];

props.forEach(p => {
  const pLower = p.charAt(0).toLowerCase() + p.slice(1);
  
  // Patch Interface
  // e.g. setTotalMeasures: (val: number) => void;
  const regexType = new RegExp(`set${p}: \\\\(([^:]+): ([^)]+)\\\\) => void;`);
  c = c.replace(regexType, `set${p}: ($1: $2 | ((prev: $2) => $2)) => void;`);
  
  // Patch Implementation
  // e.g. setTotalMeasures: (val) => set({ totalMeasures: val }),
  const regexImpl = new RegExp(`set${p}: \\\\(([^)]+)\\\\) => set\\\\(\\\\{ ${pLower}: [^ }]+ \\\\}\\\\)`);
  c = c.replace(regexImpl, `set${p}: ($1) => set(state => ({ ${pLower}: typeof $1 === 'function' ? $1(state.${pLower}) : $1 }))`);
});

fs.writeFileSync('src/stores/useSequencerStore.ts', c);
