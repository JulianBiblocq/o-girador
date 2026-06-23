const fs = require('fs');
let c = fs.readFileSync('src/stores/useSequencerStore.ts', 'utf8');

c = c.replace(/setTotalMeasures: \(.+?\) => void;/, "setTotalMeasures: (val: number | ((prev: number) => number)) => void;");
c = c.replace(/setTotalMeasures: \(total\) => set\(\{ totalMeasures: total \}\),/, "setTotalMeasures: (updater) => set(state => ({ totalMeasures: typeof updater === 'function' ? updater(state.totalMeasures) : updater })),");

c = c.replace(/setSongSections: \(.+?\) => void;/, "setSongSections: (val: SongSection[] | ((prev: SongSection[]) => SongSection[])) => void;");
c = c.replace(/setSongSections: \(sections\) => set\(\{ songSections: sections \}\),/, "setSongSections: (updater) => set(state => ({ songSections: typeof updater === 'function' ? (updater as any)(state.songSections) : updater })),");

c = c.replace(/setMeasureTimeSigs: \(.+?\) => void;/, "setMeasureTimeSigs: (val: TimeSignature[] | ((prev: TimeSignature[]) => TimeSignature[])) => void;");
c = c.replace(/setMeasureTimeSigs: \(sigs\) => set\(\{ measureTimeSigs: sigs \}\),/, "setMeasureTimeSigs: (updater) => set(state => ({ measureTimeSigs: typeof updater === 'function' ? (updater as any)(state.measureTimeSigs) : updater })),");

c = c.replace(/setLoopStartMeasure: \(.+?\) => void;/, "setLoopStartMeasure: (val: number | null | ((prev: number | null) => number | null)) => void;");
c = c.replace(/setLoopStartMeasure: \(val\) => set\(\{ loopStartMeasure: val \}\),/, "setLoopStartMeasure: (updater) => set(state => ({ loopStartMeasure: typeof updater === 'function' ? updater(state.loopStartMeasure) : updater })),");

c = c.replace(/setLoopEndMeasure: \(.+?\) => void;/, "setLoopEndMeasure: (val: number | null | ((prev: number | null) => number | null)) => void;");
c = c.replace(/setLoopEndMeasure: \(val\) => set\(\{ loopEndMeasure: val \}\),/, "setLoopEndMeasure: (updater) => set(state => ({ loopEndMeasure: typeof updater === 'function' ? updater(state.loopEndMeasure) : updater })),");

c = c.replace(/setIsLoopRegionActive: \(.+?\) => void;/, "setIsLoopRegionActive: (val: boolean | ((prev: boolean) => boolean)) => void;");
c = c.replace(/setIsLoopRegionActive: \(val\) => set\(\{ isLoopRegionActive: val \}\),/, "setIsLoopRegionActive: (updater) => set(state => ({ isLoopRegionActive: typeof updater === 'function' ? updater(state.isLoopRegionActive) : updater })),");

// Also add the missing setters that we need in useSequencerState:
if (!c.includes('setSongSections: (val: SongSection[]')) {
  c = c.replace(/setMeasureTimeSigs: \(val: TimeSignature\[\] \| \(\(prev: TimeSignature\[\]\) => TimeSignature\[\]\)\) => void;/, 
    "setMeasureTimeSigs: (val: TimeSignature[] | ((prev: TimeSignature[]) => TimeSignature[])) => void;\n  setSongSections: (val: SongSection[] | ((prev: SongSection[]) => SongSection[])) => void;");
}

if (!c.includes('setSongSections: (updater)')) {
  c = c.replace(/measureTimeSigs: Array\(8\)\.fill\('4\/4'\),/, 
    "measureTimeSigs: Array(8).fill('4/4'),\n  setSongSections: (updater) => set(state => ({ songSections: typeof updater === 'function' ? (updater as any)(state.songSections) : updater })),\n  setMeasureTimeSigs: (updater) => set(state => ({ measureTimeSigs: typeof updater === 'function' ? (updater as any)(state.measureTimeSigs) : updater })),");
}

if (!c.includes('setTotalMeasures: (updater)')) {
  c = c.replace(/setBpm: \(bpm\) => set\(\{ bpm \}\),/, 
    "setBpm: (bpm) => set({ bpm }),\n  setTotalMeasures: (updater) => set(state => ({ totalMeasures: typeof updater === 'function' ? updater(state.totalMeasures) : updater })),");
}

fs.writeFileSync('src/stores/useSequencerStore.ts', c);
